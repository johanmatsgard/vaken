// Away recap and the Away mode.
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { buildDigest, costSince, awayCall, modeLines, parseDigest, parseEvents, parseRun, parseSaved, restoreLines, watchEvents, digestText } from '../core/away'
import type { Digest, Restore, Run, Saved } from '../core/away'
import { AWAY_EVENTS_KEY, AWAY_RUN_KEY, AWAY_SAVED_KEY, BUDGET_SET, COST_STATE_PREFIX, DIGEST_KEY, DIGEST_WHAT, NO_DIGEST, POLICY_SET, seenToast, timerEndDetail, timerToast } from '../core/away'
import { SESSION_BUDGETS, parseState, spendOf } from '../core/cost'
import { optionNumber } from '../core/budget'
import { clearBand } from '../core/band'
import { AWAY_KEY, AWAY_OFF_WHAT, AWAY_POLICY_KEY, awayText, parseAway } from '../core/guardworld'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { listRecords } from '../core/record'
import { findSetting, readSetting, settingStoreKey, writeSetting } from '../core/settings'
import { LEDGER_KEY, pushLog, readLog } from './compaction'
import { collectInbox, liveRows } from './inbox'
import { armOnce } from './everyonce'
import { isFolded, subArgs } from '../core/menu'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'

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
const BUDGET_KEY = 'cost.budget'
const SESSION_BUDGET_KEY = 'cost.session'

// Every session also checks, so the mode ends even if this session is gone.
let endTimer: { cancel: () => void } | undefined

const ledger = async (i: Io, sid: string, what: string, detail: string, how: 'auto' | 'typed'): Promise<void> => pushLog(i, LEDGER_KEY, { at: await i.now(), session: sid, what, detail, how, did: true })

// What each session has cost, in dollars: the engine's own total when it gave one
async function costNow(i: Io, now: number): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const k of (await i.keys()).filter(x => x.startsWith(COST_STATE_PREFIX))) out[k.slice(COST_STATE_PREFIX.length)] = spendOf(parseState(await i.get(k), now)).usd
  return out
}

async function collectEvents(i: Io, run: Run) {
  const { rows } = await liveRows(i)
  const known = parseEvents(await i.get(AWAY_EVENTS_KEY))
  const events = watchEvents(
    rows.map(r => ({ sid: r.rec.sessionId, name: r.name, kind: r.kind, since: r.kind === 'needs' && r.rec.ask !== undefined ? r.rec.ask.since : r.rec.stateSince })),
    run.at,
    known,
  )
  if (events.length !== known.length) await i.set(AWAY_EVENTS_KEY, events)
  return events
}

async function digestNow(i: Io, run: Run, ended: boolean, to: number): Promise<Digest> {
  const events = await collectEvents(i, run)
  const spent = costSince(run.costBase, await costNow(i, to))
  const { items } = await collectInbox(i)
  return buildDigest({ from: run.at, to, ledger: await readLog(i, LEDGER_KEY), events, spent, waiting: items, ended })
}

export async function freshWhileAway(i: Io, text: string): Promise<string> {
  const fresh = awayText({ away: parseAway(await i.get(AWAY_KEY)) !== undefined, policy: (await i.get(settingStoreKey(AWAY_POLICY_KEY))) === 'careful' ? 'careful' : 'off', refused: [] }).split('\n')[1] ?? ''
  return text
    .split('\n')
    .map(l => (l.startsWith('While away: ') ? fresh : l)) // en-only: the start of the switch's own line, matched, not shown
    .join('\n')
}

// Sets only what is not already as wanted, and keeps the old values so the end can put them back.
async function startRun(i: Io, awayAt: number, forMs: number | undefined): Promise<{ run: Run; saved: Saved } | undefined> {
  if (parseRun(await i.get(AWAY_RUN_KEY)) !== undefined) return undefined
  const now = await i.now()
  const costBase = await costNow(i, now)
  const run: Run = { at: awayAt, ...(forMs === undefined ? {} : { until: now + forMs }), costBase }
  // The run is written first: it is the claim, so two sessions cannot both begin the mode.
  await i.set(AWAY_RUN_KEY, run)
  await i.set(AWAY_EVENTS_KEY, [])
  const saved: Saved = {}
  const rawPolicy = await i.get(settingStoreKey(AWAY_POLICY_KEY))
  if (rawPolicy !== POLICY_SET && findSetting(AWAY_POLICY_KEY) !== undefined && (await writeSetting(i, AWAY_POLICY_KEY, POLICY_SET))) saved.policy = { old: typeof rawPolicy === 'string' ? rawPolicy : null, set: POLICY_SET }
  const budget = findSetting(BUDGET_KEY)
  if (budget !== undefined) {
    const raw = await i.get(settingStoreKey(BUDGET_KEY))
    const cur = raw === 'off' || raw === 'warn' || raw === 'stop' ? raw : budget.default
    if (cur !== BUDGET_SET && (await writeSetting(i, BUDGET_KEY, BUDGET_SET))) {
      saved.budget = { old: typeof raw === 'string' ? raw : null, set: BUDGET_SET, limit: optionNumber(await i.get(settingStoreKey(SESSION_BUDGET_KEY)), SESSION_BUDGETS, Number(findSetting(SESSION_BUDGET_KEY)?.default ?? 25)) }
    }
  }
  await i.set(AWAY_SAVED_KEY, saved)
  i.invalidate()
  return { run, saved }
}

async function putBack(i: Io, key: string, entry: { old: string | null; set: string }): Promise<'back' | 'kept'> {
  if ((await i.get(settingStoreKey(key))) !== entry.set) return 'kept'
  if (entry.old === null) await i.del(settingStoreKey(key))
  else await writeSetting(i, key, entry.old)
  return 'back'
}

async function finishRun(i: Io, how: 'auto' | 'typed'): Promise<{ lines: string[]; digest?: Digest } | undefined> {
  const run = parseRun(await i.get(AWAY_RUN_KEY))
  if (run === undefined) return undefined
  await i.del(AWAY_RUN_KEY)
  const saved = parseSaved(await i.get(AWAY_SAVED_KEY))
  await i.del(AWAY_SAVED_KEY)
  const restore: Restore = {}
  if (saved.policy !== undefined) restore.policy = await putBack(i, AWAY_POLICY_KEY, saved.policy)
  if (saved.budget !== undefined) restore.budget = await putBack(i, BUDGET_KEY, saved.budget)
  const now = await i.now()
  let digest: Digest | undefined
  if ((await readSetting(i, 'away.digest')) !== 'off') {
    digest = await digestNow(i, run, true, now)
    await i.set(DIGEST_KEY, { at: now, from: run.at, to: now, text: digest.text })
    await ledger(i, await i.sessionId(), DIGEST_WHAT, digest.headline.slice(0, 220), how)
  }
  await i.del(AWAY_EVENTS_KEY)
  for (const rec of await listRecords(i)) await clearBand(i, 'away', rec.sessionId)
  i.invalidate()
  return { lines: restoreLines(saved, restore), ...(digest === undefined ? {} : { digest }) }
}

async function endByTimer(i: Io): Promise<void> {
  if (parseAway(await i.get(AWAY_KEY)) !== undefined) {
    await i.del(AWAY_KEY)
    await ledger(i, await i.sessionId(), AWAY_OFF_WHAT, timerEndDetail, 'auto')
  }
  if ((await finishRun(i, 'auto')) !== undefined) i.toast(tr(timerToast))
}

function arm($: EngineInterface, ms: number): void {
  endTimer?.cancel()
  endTimer = $.clock.after(Math.max(0, ms), () => void awayCheck(io($)).catch(() => undefined))
}

// Exported so that a test can run one check by hand (a test clock does not drive a timer made at the start of the session).
export async function awayCheck(i: Io): Promise<void> {
  try {
    const now = await i.now()
    const away = parseAway(await i.get(AWAY_KEY))
    const run = parseRun(await i.get(AWAY_RUN_KEY))
    if (away !== undefined && run === undefined) {
      await startRun(i, away.at, undefined)
    } else if (away === undefined && run !== undefined) {
      if ((await finishRun(i, 'auto')) !== undefined) i.toast(tr(seenToast))
    } else if (away !== undefined && run !== undefined) {
      if (run.until !== undefined && now >= run.until) await endByTimer(i)
      else await collectEvents(i, run)
    }
  } catch {
  }
}

export function registerAway(on: On): void {
  on('session.start', { cwd: /(?<away>)/ }, async ($, e, next) => {
    try {
      armOnce('away', $.clock.every(CHECK_MS, () => void awayCheck(io($))))
      const run = parseRun(await io($).get(AWAY_RUN_KEY))
      const nowMs = await $.clock.now()
      if (run?.until !== undefined) arm($, run.until - nowMs)
    } catch {
      // the digest and the timer are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // It never answers alone: the switch's own answer is the base of what it returns.
  on('command.run', { command: 'vaken-away' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    const call = awayCall(e.args)
    if (call.durationError !== undefined) return { text: call.durationError }
    const i = io($)

    if (call.ask.kind === 'on') {
      const r = await next({ ...e, args: call.passArgs })
      try {
        const away = parseAway(await i.get(AWAY_KEY))
        if (away !== undefined) {
          const now = await i.now()
          const started = await startRun(i, away.at, call.forMs)
          let run = started?.run ?? parseRun(await i.get(AWAY_RUN_KEY))
          const saved = started?.saved ?? parseSaved(await i.get(AWAY_SAVED_KEY))
          const lines: string[] = []
          if (started === undefined && run !== undefined && call.forMs !== undefined) {
            run = { ...run, until: now + call.forMs }
            await i.set(AWAY_RUN_KEY, run)
            lines.push('The end time is changed.') // en-only: plain answer of a slash command (text twin)
          }
          if (run !== undefined) {
            if (run.until !== undefined) arm($, run.until - now)
            else endTimer?.cancel()
            lines.push(...modeLines(run, saved, now))
            return { ...r, text: [await freshWhileAway(i, r.text ?? ''), '', ...lines].join('\n') }
          }
        }
      } catch {
      }
      return r
    }

    if (call.ask.kind === 'off') {
      // Away mode tightens the guard while the person is gone, so only the person may end it.
      if (!byPerson(e.origin)) return { text: BY_PERSON_ONLY }
      const r = await next(e)
      try {
        if (parseAway(await i.get(AWAY_KEY)) === undefined) {
          endTimer?.cancel()
          const done = await finishRun(i, 'typed')
          if (done !== undefined) return { ...r, text: [await freshWhileAway(i, r.text ?? ''), '', ...(done.digest === undefined ? [] : [done.digest.text, '']), ...done.lines].join('\n').trimEnd() }
        }
      } catch {
      }
      return r
    }

    const r = await next(e)
    try {
      const run = parseRun(await i.get(AWAY_RUN_KEY))
      if (run !== undefined && parseAway(await i.get(AWAY_KEY)) !== undefined) return { ...r, text: [r.text ?? '', '', ...modeLines(run, parseSaved(await i.get(AWAY_SAVED_KEY)), await i.now())].join('\n') }
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-away' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'digest')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const now = await i.now()
    const run = parseRun(await i.get(AWAY_RUN_KEY))
    if (run !== undefined) return { text: `${(await digestNow(i, run, false, now)).text}\n\nAway mode is still on. /vaken-away off ends it and keeps the digest.` }
    const saved = parseDigest(await i.get(DIGEST_KEY))
    return { text: saved === undefined ? NO_DIGEST : digestText(saved, now) }
  })
}
