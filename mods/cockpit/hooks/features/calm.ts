// Calm: Focus 50 minutes and the open ends of yesterday.
import type { EngineInterface, On } from 'claude-code'

import { DIGEST_KEY, parseDigest } from '../core/away'
import { postBand, clearBand } from '../core/band'
import { CALM_KEY, parseCalm } from '../core/calm'
import type { Calm } from '../core/calm'
import { readNote } from '../core/flush'
import { FOCUS_KEY, FOCUS_MS, FOCUS_POLL_MS, focusMem, focusSummary, isFocused, minutesLeft, parseFocus } from '../core/focus'
import type { Focus } from '../core/focus'
import { allowKey } from '../core/guard'
import { heldKey, parseAllowOnce, parseHeld } from '../core/allowonce'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { didKind } from '../core/ledger'
import { OPEN_ENDS_BAND_MS, OPEN_ENDS_PREFIX, OPEN_ENDS_SHOW, noteMatters, openBand, openDayOf, openDayStart, openEnds, openEndsKey, openShown, parseOpenNote } from '../core/openends'
import type { OpenEnd, OpenNote } from '../core/openends'
import { ORCH_KEY, parseRun } from '../core/orchestra'
import { projectName } from '../core/projects'
import { relevantKinds, readState, stateKey, statusOf } from '../core/proof'
import { quietly } from '../core/quiet'
import { alivePids, listRecords } from '../core/record'
import { serialUpdate } from '../core/serial'
import { weeklyShown } from '../core/weekly'
import type { WeeklyNote } from '../core/weekly'
import { LEDGER_KEY, readLog } from './compaction'
import { classify } from './home/logic'
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

const calmMem: { checkedDay?: string; root?: string; inTurn: boolean } = { inTurn: false }

export async function readFocus(i: Io): Promise<Focus | undefined> {
  const f = parseFocus(await i.get(FOCUS_KEY))
  focusMem.focus = f
  return f
}

export async function startFocus(i: Io): Promise<Focus> {
  const now = await i.now()
  const f: Focus = { from: now, until: now + FOCUS_MS }
  await i.set(FOCUS_KEY, f)
  focusMem.focus = f
  i.invalidate()
  return f
}

async function summaryOf(i: Io, f: Focus, now: number): Promise<string> {
  const records = await listRecords(i)
  const alive = await alivePids(i, records)
  const finished = records.filter(r => r.stateSince >= f.from && classify(r, now, alive) === 'waiting').length
  const warnings = (await readLog(i, LEDGER_KEY)).filter(x => x.did === true && x.at >= f.from && x.at <= now && didKind(x.what) !== 'did').length
  return focusSummary({ finished, warnings })
}

export async function endFocus(i: Io, isPress = false): Promise<string | undefined> {
  const f = parseFocus(await i.get(FOCUS_KEY))
  focusMem.focus = undefined
  if (f === undefined) return undefined
  await i.del(FOCUS_KEY)
  const now = await i.now()
  const text = await summaryOf(i, f, Math.min(now, Math.max(f.from, f.until)))
  if (isPress || now >= f.until) i.toast(text, true)
  i.invalidate()
  return text
}

export async function focusPoll(i: Io): Promise<void> {
  try {
    const before = focusMem.focus
    const f = await readFocus(i)
    if (f !== undefined && (await i.now()) >= f.until) await endFocus(i)
    else if ((before === undefined) !== (f === undefined)) i.invalidate()
  } catch {
  }
}

export async function focusCommand(i: Io, args: string): Promise<string> {
  const ask = args.trim().toLowerCase()
  if (ask === 'off' || ask === 'end' || ask === 'stop') return (await endFocus(i)) ?? 'Focus is not on.' // en-only: plain answer of a slash command (text twin)
  const now = await i.now()
  const f = await readFocus(i)
  if (isFocused(f, now)) return `Focus: ${minutesLeft(f, now)} min left. Only what needs you gets through. /vaken-help run focus off ends it.`
  await startFocus(i)
  return 'Focus is on for 50 minutes in every session: toasts and the band\'s other lines wait, only what needs you gets through. /vaken-help run focus off ends it.' // en-only: plain answer of a slash command (text twin)
}

export async function noteOpenEnds(i: Io, sid: string, root: string | undefined, midTurn: boolean): Promise<OpenNote | undefined> {
  if (root === undefined || root === '') return undefined
  const proof = readState(await readNote(i, stateKey(sid)))
  const checks: OpenNote['checks'] = {}
  for (const k of relevantKinds(proof)) {
    const st = statusOf(proof, k)
    if (st === 'ok' || st === 'failed') checks[k] = st
  }
  const held = parseHeld(await i.get(heldKey(sid)))
  const allow = parseAllowOnce(await i.get(allowKey(sid)))
  const run = parseRun(await i.get(ORCH_KEY(sid)))
  const note: OpenNote = {
    at: await i.now(),
    project: projectName(root),
    checks,
    held: held !== undefined && held.keys.length > 0 && !(allow !== undefined && allow.at >= held.at) ? 1 : 0,
    tasks: run === undefined ? 0 : run.tasks.filter(t => t.state !== 'done').length,
    midTurn,
  }
  if (!noteMatters(note)) return undefined
  await i.set(openEndsKey(sid), note)
  return note
}

// Never throws.
export async function morningCheck(i: Io): Promise<void> {
  try {
    const now = await i.now()
    const day = openDayOf(now)
    if (calmMem.checkedDay === day) return
    calmMem.checkedDay = day
    if (parseCalm(await i.get(CALM_KEY)).open?.day === day) return
    const notes: OpenNote[] = []
    for (const k of (await i.keys()).filter(x => x.startsWith(OPEN_ENDS_PREFIX))) {
      const n = parseOpenNote(await i.get(k))
      if (n !== undefined) notes.push(n)
    }
    const ends = openEnds(notes, openDayStart(now))
    await serialUpdate(i, CALM_KEY, old => ({ ...parseCalm(old), open: { day, ends, dismissed: false } }))
    for (const [n, end] of ends.slice(0, OPEN_ENDS_SHOW).entries()) await postBand(i, 'info', `openends:${n}`, openBand(end), OPEN_ENDS_BAND_MS)
  } catch {
  }
}

export async function dismissOpenEnds(i: Io): Promise<void> {
  await serialUpdate(i, CALM_KEY, old => {
    const c = parseCalm(old)
    return c.open === undefined ? c : { ...c, open: { ...c.open, dismissed: true } }
  })
  for (let n = 0; n < OPEN_ENDS_SHOW; n += 1) await clearBand(i, `openends:${n}`)
  i.invalidate()
}

export type CalmView = { weekly?: WeeklyNote; open: OpenEnd[]; more: number; focus?: Focus; away?: { to: number; text: string } }
export async function loadCalm(i: Io, now: number): Promise<CalmView> {
  await morningCheck(i)
  const c: Calm = parseCalm(await i.get(CALM_KEY))
  const weekly = weeklyShown(c.weekly, now)
  const open = openShown(c.open, now)
  const focus = focusMem.focus
  const digest = parseDigest(await i.get(DIGEST_KEY))
  return { ...(weekly === undefined ? {} : { weekly }), open: open.slice(0, OPEN_ENDS_SHOW), more: Math.max(0, open.length - OPEN_ENDS_SHOW), ...(isFocused(focus, now) ? { focus } : {}), ...(digest === undefined ? {} : { away: { to: digest.to, text: digest.text } }) }
}
export const calmSignature = (c: CalmView | undefined, now: number): string =>
  c === undefined ? '' : `${c.weekly?.at ?? 0}|${c.open.map(x => `${x.project}${x.failed.join('/')}${x.held}${x.tasks}${x.midTurn}`).join(',')}${c.more}|${c.focus === undefined ? '' : minutesLeft(c.focus, now)}|${c.away?.to ?? 0}`

export function registerCalm(on: On): void {
  on('session.start', { cwd: /(?<calm>)/ }, async ($, e, next) => {
    try {
      calmMem.checkedDay = undefined
      calmMem.inTurn = false
      try {
        const root = await $.session.root()
        calmMem.root = root || e.cwd
      } catch {
        calmMem.root = e.cwd
      }
      await readFocus(io($))
      armOnce('calm', $.clock.every(FOCUS_POLL_MS, quietly('calm:focus', () => $.clock.now(), () => focusPoll(io($)))))
    } catch {
      // Focus and the open ends are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<calm>)/ }, async ($, e, next) => {
    await morningCheck(io($))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', { turnId: /(?<calm>)/ }, async ($, e, next) => {
    calmMem.inTurn = true
    return next(e)
  }).catch(($, e, next) => next(e))
  on('turn.complete', { turnId: /(?<calm>)/ }, async ($, e, next) => {
    if (e.agentId === undefined) calmMem.inTurn = false
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { sessionId: /(?<calm>)/ }, async ($, e, next) => {
    try {
      await noteOpenEnds(io($), e.sessionId, calmMem.root, calmMem.inTurn)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'focus')
    if (rest0 === undefined) return next(e)
    return { text: await focusCommand(io($), rest0) }
  })
}
