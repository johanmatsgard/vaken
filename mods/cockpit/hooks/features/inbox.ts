// Approvals inbox and Steering. /cockpit inbox lists, across all sessions, what waits for the person: steps the guard held
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'

import { parseStoredUsage, APP_USAGE_KEY } from '../core/appusage'
import { parseStoredSessions, APP_SESSIONS_KEY } from '../core/appsessions'
import { clearBand, postBand, readBand } from '../core/band'
import { quietly } from '../core/quiet'
import { mayScan } from '../core/leader'
import { allowKey, allowLive, haltKey, haltMem, parseAllow, parseHalt } from '../core/guard'
import { HERE_FALLBACK, INBOX_BAND_ID, INBOX_SEEN_KEY, OFFER_MAX, QUEUE_OFFER_WHAT, QUEUE_TEXT_MAX, sendButtons, STEER_SEND_WHAT, STEER_STOP_WHAT, addQueued, buildInbox, cleanQueued, dropSent, heldCount, inboxBandWords, inboxText, markOffered, nextOffer, noSuchSession, notSentWords, offerToast, parseQueue, parseSteerAsk, queuedWords, sendQuestion, sentWords, steerKey, steerText, stopWords } from '../core/inbox'
import type { InboxItem, SessionInfo, SteerOther } from '../core/inbox'
import { readNote } from '../core/flush'
import type { Entry } from '../core/ledger'
import { withToastGate } from '../core/io'
import { saidYes } from '../core/confirm'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { alivePids, listRecords, listRecordsLight } from '../core/record'
import { readState, stateKey } from '../core/proof'
import { readSetting } from '../core/settings'
import { LEDGER_KEY, pushLog, readLog } from './compaction'
import { buildView } from './home/logic'
import type { Row } from './home/logic'
import { armOnce } from './everyonce'
import { subArgs } from '../core/menu'

// IO-BLOCK-START
function io($: EngineInterface): Io {
  return withToastGate({
    now: () => $.clock.now(),
    home: () => homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }),
    sessionId: () => $.session.id(),
    get: key => $.store.get(key),
    set: (key, value) => $.store.set(key, value),
    del: key => $.store.delete(key),
    keys: () => $.store.keys(),
    read: path => $.fs.read(path),
    write: (path, text) => $.fs.write(path, text),
    run: (argv, init) => $.process.run(argv, init),
    ask: (question, options) => $.ui.ask(question, options),
    complete: req => $.model.complete(req),
    toast: text => $.ui.toast(text),
    invalidate: () => $.ui.invalidate('ui.render'),
  })
}
// IO-BLOCK-END

const CHECK_MS = 20_000
const BAND_TTL_MS = 5 * 60_000
const OFFER_DELAY_MS = 2_500

let runningTurn: string | undefined

const ledger = async (i: Io, sid: string, what: string, detail: string, how: 'auto' | 'typed'): Promise<void> => pushLog(i, LEDGER_KEY, { at: await i.now(), session: sid, what, detail, how, did: true })

export async function liveRows(i: Io, light = false): Promise<{ now: number; sid: string; rows: Row[] }> {
  const now = await i.now()
  const sid = await i.sessionId()
  const records = light ? await listRecordsLight(i) : await listRecords(i)
  const alive = await alivePids(i, records)
  const view = buildView(records, now, sid, alive, parseStoredUsage(await i.get(APP_USAGE_KEY)), undefined, parseStoredSessions(await i.get(APP_SESSIONS_KEY)))
  const rows = [view.here, ...view.needs, ...view.working, ...view.waiting, ...view.idle].filter((r): r is Row => r !== undefined)
  return { now, sid, rows }
}

// Never throws for a missing key: a missing value means nothing waits there.
export async function collectInbox(i: Io, light = false): Promise<{ items: InboxItem[]; now: number }> {
  const { now, sid, rows } = await liveRows(i, light)
  return { items: await inboxFrom(i, { now, sid, rows, ledger: await readLog(i, LEDGER_KEY) }, true), now }
}

// The inbox from the rows and the ledger a caller already read (the pane's load reads both anyway): only the three keys of each session and the "first
export async function inboxFrom(i: Io, f: { now: number; sid: string; rows: Row[]; ledger: Entry[] }, remember: boolean): Promise<InboxItem[]> {
  const { now, sid, rows } = f
  const sessions: SessionInfo[] = rows.map(r => ({ sid: r.rec.sessionId, name: r.name, here: r.rec.sessionId === sid, ...(r.rec.promptAt === undefined ? {} : { promptAt: r.rec.promptAt }) }))
  if (!sessions.some(s => s.here)) sessions.push({ sid, name: HERE_FALLBACK, here: true })
  const asks = rows.flatMap(r => (r.kind === 'needs' && r.rec.ask !== undefined ? [{ sid: r.rec.sessionId, kind: r.rec.ask.kind, tool: r.rec.ask.tool, since: r.rec.ask.since }] : []))
  const debts: { sid: string; turns: number }[] = []
  const halts: { sid: string; at: number }[] = []
  const allowed: string[] = []
  for (const s of sessions) {
    const turns = readState(await readNote(i, stateKey(s.sid))).debt
    if (turns > 0) debts.push({ sid: s.sid, turns })
    const halt = parseHalt(await i.get(haltKey(s.sid)))
    if (halt !== undefined) halts.push({ sid: s.sid, at: halt.at })
    if (allowLive(parseAllow(await i.get(allowKey(s.sid))), now)) allowed.push(s.sid)
  }
  const raw = await i.get(INBOX_SEEN_KEY)
  const old: Record<string, number> = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((pair): pair is [string, number] => typeof pair[1] === 'number')) : {}
  const seen: Record<string, number> = {}
  for (const d of debts) {
    const at = old[`review:${d.sid}`] ?? (remember ? now : undefined)
    if (at !== undefined) seen[`review:${d.sid}`] = at
  }
  if (remember && JSON.stringify(seen) !== JSON.stringify(old)) await i.set(INBOX_SEEN_KEY, seen)
  return buildInbox({ now, sessions, ledger: f.ledger, allowed, asks, debts, halts, seen })
}

const PANE_INBOX_FRESH_MS = 15_000
let paneInbox: { at: number; sig: string; items: InboxItem[] } | undefined
export async function inboxForPane(i: Io, f: { now: number; sid: string; rows: Row[]; ledger: Entry[] }, extra: string): Promise<InboxItem[]> {
  const sig = `${f.sid}|${f.rows.map(r => `${r.rec.sessionId}:${r.rec.promptAt ?? 0}`).join(',')}|${f.ledger.length}:${f.ledger[0]?.at ?? 0}|${extra}`
  if (paneInbox !== undefined && paneInbox.sig === sig && f.now - paneInbox.at >= 0 && f.now - paneInbox.at < PANE_INBOX_FRESH_MS) return paneInbox.items
  const items = await inboxFrom(i, f, false)
  paneInbox = { at: f.now, sig, items }
  return items
}
export const forgetPaneInbox = (): void => {
  paneInbox = undefined
}

async function bandNow(i: Io, held: number): Promise<void> {
  const sid = await i.sessionId()
  if (held === 0) return clearBand(i, INBOX_BAND_ID, sid)
  const text = inboxBandWords(held)
  const mine = (await readBand(i, sid)).find(x => x.id === INBOX_BAND_ID)
  if (mine !== undefined && mine.text === text && (await i.now()) - mine.at < BAND_TTL_MS / 2) return
  await postBand(i, 'warn', INBOX_BAND_ID, text, BAND_TTL_MS, sid)
}

// The box takes it only when it is empty, so a draft the person is typing is never touched.
async function offerQueued(i: Io, suggest: Suggest): Promise<void> {
  if (runningTurn !== undefined) return
  const sid = await i.sessionId()
  const now = await i.now()
  const queue = parseQueue(await i.get(steerKey(sid)))
  const item = nextOffer(queue, now)
  if (item === undefined) return
  if (!(await suggest(item.text))) return
  await i.set(steerKey(sid), markOffered(queue, item.text, now))
  await ledger(i, sid, QUEUE_OFFER_WHAT, `A queued prompt shows in the prompt box (offer ${item.offers + 1} of ${OFFER_MAX}).`, 'auto')
  i.toast(tr(offerToast))
  i.invalidate()
}

const INBOX_SHARED_KEY = 'cockpit:inbox:held'
const SHARED_FRESH_MS = CHECK_MS / 2
async function heldNow(i: Io): Promise<number> {
  const now = await i.now()
  const raw = (await i.get(INBOX_SHARED_KEY)) as { at?: unknown; held?: unknown } | undefined
  if (typeof raw?.at === 'number' && typeof raw.held === 'number' && now - raw.at >= 0 && now - raw.at < SHARED_FRESH_MS) return raw.held
  // Older: the leader session looks again (core/leader.ts)
  if (typeof raw?.at === 'number' && typeof raw.held === 'number' && !(await mayScan(i, raw.at, CHECK_MS))) return raw.held
  const held = heldCount((await collectInbox(i, true)).items)
  await i.set(INBOX_SHARED_KEY, { at: now, held })
  return held
}

// Exported so that a test can run it by hand (a test clock does not drive a timer made at the start of the session).
export async function inboxCheck(i: Io, suggest: Suggest): Promise<void> {
  try {
    if ((await readSetting(i, 'inbox.mode')) === 'off') await clearBand(i, INBOX_BAND_ID)
    else await bandNow(i, await heldNow(i))
  } catch {
  }
  try {
    await offerQueued(i, suggest)
  } catch {
  }
}

type Suggest = (text: string) => Promise<boolean>

function inboxTick($: EngineInterface): Promise<void> {
  const i = io($)
  const suggest: Suggest = async text => {
    try {
      const shown = await $.prompt.suggest({ text })
      return shown.isShown
    } catch {
      return false
    }
  }
  return inboxCheck(i, suggest)
}

const stateWord = (r: Row): string => (r.kind === 'needs' ? 'needs you' : r.kind === 'working' ? 'working' : r.kind === 'waiting' ? 'finished, waits for you' : 'idle')

async function othersOf(i: Io): Promise<{ sid: string; name: string; row: Row }[]> {
  const { sid, rows } = await liveRows(i)
  return rows
    .filter(r => r.rec.sessionId !== sid)
    .map(r => ({ sid: r.rec.sessionId, name: r.name, row: r }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.sid < b.sid ? -1 : 1))
}

export function registerInbox(on: On): void {
  on('session.start', { cwd: /(?<inbox>)/ }, async ($, e, next) => {
    try {
      const timer = $.clock.every(CHECK_MS, quietly('inbox', () => $.clock.now(), () => inboxTick($)))
      armOnce('inbox', timer)
    } catch {
      // the commands and the band are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The running answer of the main thread, so that stop can cancel it.
  on('turn.start', { turnId: /(?<inbox>)/ }, async ($, e, next) => {
    if (fieldsOf(e).agentId === undefined) runningTurn = e.turnId
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<inbox>)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (e.agentId === undefined) {
        runningTurn = undefined
        const offerIo = io($)
        const offerSuggest: Suggest = async text => {
    try {
      const shown = await $.prompt.suggest({ text })
      return shown.isShown
    } catch {
      return false
    }
  }
        $.clock.after(OFFER_DELAY_MS, () => void offerQueued(offerIo, offerSuggest).catch(() => undefined))
      }
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<inbox>)/ }, async ($, e, next) => {
    try {
      if (!e.text.trimStart().startsWith('/')) {
        const i = io($)
        const sid = await i.sessionId()
        const queue = parseQueue(await i.get(steerKey(sid)))
        if (queue.length > 0) {
          const rest = dropSent(queue, e.text)
          if (rest.length !== queue.length) await i.set(steerKey(sid), rest)
        }
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'inbox')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const { items, now } = await collectInbox(i)
    return { text: inboxText(items, now, (await readSetting(i, 'inbox.mode')) !== 'off') }
  })

  on('command.run', { command: 'vaken-pause' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'steer')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const sid = await i.sessionId()
    const now = await i.now()
    const ask = parseSteerAsk(rest0)
    if (ask.kind === 'bad') return { text: ask.why }

    if (ask.kind === 'list') {
      const { rows } = await liveRows(i)
      const here = rows.find(r => r.rec.sessionId === sid)
      const others: SteerOther[] = []
      for (const [k, o] of (await othersOf(i)).entries()) others.push({ n: k + 1, name: o.name, state: stateWord(o.row), queued: parseQueue(await i.get(steerKey(o.sid))).length })
      return { text: steerText({ name: here?.name ?? 'this session', queue: parseQueue(await i.get(steerKey(sid))), halted: parseHalt(await i.get(haltKey(sid))) !== undefined, others, now }) }
    }

    if (ask.kind === 'clear') {
      await i.set(steerKey(sid), [])
      return { text: 'The queue of this session is empty.' }
    }

    if (ask.kind === 'stop') {
      // Cancelling the running answer is the same as pressing Escape.
      await i.set(haltKey(sid), { at: now })
      haltMem.held = true
      let stopped: boolean | undefined
      if (runningTurn !== undefined) {
        try {
          await $.turn.abort({ turnId: runningTurn })
          stopped = true
        } catch {
          stopped = false
        }
      }
      await ledger(i, sid, STEER_STOP_WHAT, stopped === true ? 'Paused all changes and cancelled the running answer.' : 'Paused all changes.', 'typed')
      i.toast(tr('Paused for safety. Resume with /vaken-pause off.'), true)
      i.invalidate()
      return { text: stopWords(stopped) }
    }

    const others = await othersOf(i)
    const target = ask.kind === 'send' || ask.target !== undefined ? others[(ask.target as number) - 1] : undefined
    if ((ask.kind === 'send' || ask.target !== undefined) && target === undefined) return { text: noSuchSession(ask.target as number) }

    if (ask.kind === 'queue') {
      const toSid = target?.sid ?? sid
      const r = addQueued(parseQueue(await i.get(steerKey(toSid))), ask.text, now, sid)
      if (!r.ok) return { text: r.why as string }
      await i.set(steerKey(toSid), r.queue)
      i.invalidate()
      if (toSid === sid) {
        const offerIo = io($)
        const offerSuggest: Suggest = async text => {
    try {
      const shown = await $.prompt.suggest({ text })
      return shown.isShown
    } catch {
      return false
    }
  }
        $.clock.after(OFFER_DELAY_MS, () => void offerQueued(offerIo, offerSuggest).catch(() => undefined))
      }
      return { text: queuedWords(target === undefined ? 'this session' : `"${target.name}"`, cleanQueued(ask.text)) }
    }

    const to = target as { sid: string; name: string }
    const text = cleanQueued(ask.text).slice(0, QUEUE_TEXT_MAX)
    let answer = ''
    const buttons = sendButtons()
    try {
      answer = await i.ask(sendQuestion(to.name), [buttons.yes, buttons.no])
    } catch {
      return { text: notSentWords('The question was dismissed.') }
    }
    if (!saidYes(answer, buttons)) return { text: notSentWords('You said no.') }
    try {
      const r = await $.session.send({ to: { sessionId: to.sid }, text })
      if (!r.isDelivered) return { text: notSentWords(r.reason) }
    } catch (err) {
      return { text: notSentWords(err instanceof Error ? err.message.slice(0, 160) : 'The send failed.') }
    }
    await ledger(i, sid, STEER_SEND_WHAT, `Sent a message to "${to.name}".`, 'typed')
    return { text: sentWords(to.name) }
  })
}
