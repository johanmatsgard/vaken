// Cost, why it cost, the limit consequence and budgets.
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { APP_SESSIONS_KEY, parseStoredSessions } from '../core/appsessions'
import { APP_USAGE_KEY, parseStoredUsage } from '../core/appusage'
import { COST_SETTINGS, DAY_BUDGETS, SESSION_BUDGETS, addSample, addTool, addTurn, costText, estimateTotal, parseState, spendOf, turnOf, whyText } from '../core/cost'
import type { CostState } from '../core/cost'
import { EXTENDED_WHAT, HELD_WHAT, WARNED_WHAT, budgetLines, isCostly, ledgerHeld, ledgerWarned, noteText, optionNumber, parseAsk, readings, rises, stopReason, toExtend, toastText, worst } from '../core/budget'
import type { Facts, Level, Which } from '../core/budget'
import { limitsText, runningNow } from '../core/costlimits'
import { withToastGate } from '../core/io'
import { homeFrom, lastName } from '../core/platform'
import type { Io } from '../core/io'
import { HISTORY_KEY, parseHistory } from '../core/pace'
import { PRICES_DATE, money } from '../core/prices'
import { alivePids, listRecords } from '../core/record'
import { readSetting, settingStoreKey } from '../core/settings'
import { tellsClaude } from '../core/tellclaude'
import { LEDGER_KEY, pushLog } from './compaction'
import { ymd } from '../core/time'
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

const STATE_PREFIX = 'cockpit:cost:s:'
const DAY_PREFIX = 'cockpit:cost:day:'
const DAY_EXTRA_PREFIX = 'cockpit:cost:dayextra:'
const KEEP_MS = 3 * 24 * 3_600_000

const DEFAULT = (key: string): string => COST_SETTINGS.find(s => s.key === key)?.default ?? ''

type Conf = { mode: string; session: number; day: number; why: boolean }
async function conf(i: Io): Promise<Conf> {
  return {
    mode: await readSetting(i, 'cost.budget'),
    session: optionNumber(await i.get(settingStoreKey('cost.session')), SESSION_BUDGETS, Number(DEFAULT('cost.session'))),
    day: optionNumber(await i.get(settingStoreKey('cost.day')), DAY_BUDGETS, Number(DEFAULT('cost.day'))),
    why: (await readSetting(i, 'cost.why')) === 'on',
  }
}

let live: CostState | undefined
let liveId = ''
const told: Record<Which, Level> = { session: 'ok', day: 'ok' }
let notes: string[] = []
const heldLogged = new Set<string>()

async function ensure(i: Io): Promise<CostState> {
  const id = await i.sessionId()
  if (live === undefined || liveId !== id) {
    live = parseState(await i.get(STATE_PREFIX + id), await i.now())
    liveId = id
    told.session = 'ok'
    told.day = 'ok'
    notes = []
    heldLogged.clear()
  }
  return live
}

const save = async (i: Io, s: CostState): Promise<void> => i.set(STATE_PREFIX + liveId, s)

type DayRec = { base: number; usd: number }
const isDayRec = (v: unknown): v is DayRec => typeof v === 'object' && v !== null && typeof (v as DayRec).base === 'number' && typeof (v as DayRec).usd === 'number'

async function noteDay(i: Io, s: CostState, startedBeforeToday: () => Promise<boolean>): Promise<void> {
  const now = await i.now()
  const key = `${DAY_PREFIX}${ymd(now)}:${liveId}`
  const old = await i.get(key)
  const spend = spendOf(s).usd
  const base = isDayRec(old) ? old.base : (await startedBeforeToday()) ? spend : 0
  await i.set(key, { base, usd: Math.max(0, spend - base) } satisfies DayRec)
}

const OTHERS_EVERY_MS = 60_000
let othersToday: { prefix: string; at: number; usd: number; sessions: number } | undefined
async function daySum(i: Io): Promise<{ usd: number; sessions: number }> {
  const now = await i.now()
  const prefix = `${DAY_PREFIX}${ymd(now)}:`
  const own = prefix + liveId
  if (othersToday === undefined || othersToday.prefix !== prefix || now - othersToday.at < 0 || now - othersToday.at >= OTHERS_EVERY_MS) {
    let usd = 0
    let sessions = 0
    for (const k of (await i.keys()).filter(x => x.startsWith(prefix) && x !== own)) {
      const v = await i.get(k)
      if (isDayRec(v)) {
        usd += v.usd
        sessions += 1
      }
    }
    othersToday = { prefix, at: now, usd, sessions }
  }
  const mine = await i.get(own)
  return isDayRec(mine) ? { usd: othersToday.usd + mine.usd, sessions: othersToday.sessions + 1 } : { usd: othersToday.usd, sessions: othersToday.sessions }
}

const dayExtra = async (i: Io): Promise<number> => {
  const v = await i.get(DAY_EXTRA_PREFIX + ymd(await i.now()))
  return typeof v === 'number' && v > 0 ? v : 0
}

async function factsNow(i: Io, s: CostState, c: Conf): Promise<{ facts: Facts; day: { usd: number; sessions: number }; extra: { session: number; day: number } }> {
  const spend = spendOf(s)
  const day = await daySum(i)
  const extra = { session: s.extra, day: await dayExtra(i) }
  return { facts: { mode: c.mode, source: spend.source, session: { usd: spend.usd, limit: c.session + extra.session }, day: { usd: day.usd, limit: c.day + extra.day } }, day, extra }
}

// Never throws.
async function evaluate(i: Io): Promise<void> {
  try {
    const c = await conf(i)
    if (c.mode === 'off') return
    const s = await ensure(i)
    const { facts } = await factsNow(i, s, c)
    for (const r of rises(told, readings(facts))) {
      // Warn tells the person only, unless the person chose All checks (core/tellclaude.ts).
      if (c.mode === 'stop' || (await tellsClaude(i))) notes.push(noteText(r, c.mode))
      i.toast(toastText(r, tr))
      await pushLog(i, LEDGER_KEY, { at: await i.now(), session: liveId, what: WARNED_WHAT, detail: ledgerWarned(r), how: 'auto', did: true })
      i.invalidate()
    }
  } catch {
  }
}

// Whether this session began before today's midnight: the engine says when it began.
async function beganBeforeToday($: EngineInterface, now: number): Promise<boolean> {
  try {
    const u = await $.session.usage()
    return u.startedAt < new Date(ymd(now).replace(/-/g, '/')).getTime()
  } catch {
    return false
  }
}

const folder = (cwd: string): string => lastName(cwd)

export function registerCost(on: On): void {
  on('session.start', { cwd: /(?<cost>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      live = undefined
      await ensure(i)
      const now = await i.now()
      for (const k of await i.keys()) {
        if (k.startsWith(STATE_PREFIX)) {
          const st = parseState(await i.get(k), now)
          const lastAt = Math.max(st.engineAt ?? 0, st.recent.at(-1)?.at ?? 0, st.startedAt)
          if (now - lastAt > KEEP_MS && k !== STATE_PREFIX + liveId) await i.del(k)
        } else if (k.startsWith(DAY_PREFIX) || k.startsWith(DAY_EXTRA_PREFIX)) {
          const day = /(\d{4}-\d{2}-\d{2})/.exec(k)?.[1]
          if (day !== undefined && now - new Date(day.replace(/-/g, '/')).getTime() > KEEP_MS) await i.del(k)
        }
      }
    } catch {
      // the cost is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The engine's own total, and what this session has spent today.
  on('session.measure', { changed: /(?<cost>)/ }, async ($, e, next) => {
    try {
      if (e.cost !== undefined) {
        const i = io($)
        const s = await ensure(i)
        const now = await i.now()
        addSample(s, now, e.cost.usd)
        await noteDay(i, s, () => beganBeforeToday($, now))
        await save(i, s)
        await evaluate(i)
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Each turn's tokens and model, from the engine.
  on('turn.complete', { turnId: /(?<cost>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      const s = await ensure(i)
      const t = turnOf(e.usage, await i.now(), e.durationMs, e.agentId !== undefined)
      if (t !== undefined) {
        addTurn(s, t)
        const now = await i.now()
        await noteDay(i, s, () => beganBeforeToday($, now))
        await save(i, s)
        await evaluate(i)
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<cost>)/ }, async ($, e, next) => {
    const i = io($)
    try {
      if (isCostly(e.tool)) {
        const c = await conf(i)
        if (c.mode === 'stop') {
          const s = await ensure(i)
          const { facts } = await factsNow(i, s, c)
          const over = worst(readings(facts).filter(r => r.level === 'over'))
          if (over !== undefined) {
            const key = `${e.tool}:${over.which}`
            if (!heldLogged.has(key)) {
              heldLogged.add(key)
              await pushLog(i, LEDGER_KEY, { at: await i.now(), session: liveId, what: HELD_WHAT, detail: ledgerHeld(e.tool, over), how: 'auto', did: true })
              i.toast(tr('Stopped a {tool} call: the {which} cost budget is used up. Type /vaken-usage budget extend to go on.').replace('{tool}', e.tool).replace('{which}', tr(over.which)))
              i.invalidate()
            }
            return { deny: stopReason(e.tool, over) }
          }
        }
      }
    } catch {
    }
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      if (result.deny === undefined && live !== undefined) {
        addTool(live, (result.text ?? '').length)
        if (notes.length > 0) {
          const out = { ...result, context: [...(result.context ?? []), ...notes] }
          notes = []
          return out
        }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-usage' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'cost')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const s = await ensure(i)
    const c = await conf(i)
    const { facts, day, extra } = await factsNow(i, s, c)
    const model = s.recent.filter(t => !t.sub).at(-1)?.model
    return { text: costText({ state: s, now: await i.now(), ...(model === undefined ? {} : { model }), day, budget: budgetLines(facts, extra, day.sessions) }) }
  })

  on('command.run', { command: 'vaken-usage' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'why')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const c = await conf(i)
    if (!c.why) return { text: 'The "why it cost" paragraph is off. Turn it on: Settings > Money and plan.' } // en-only: plain answer of a slash command (text twin)
    const s = await ensure(i)
    const source = s.engineUsd === undefined ? '' : ` The engine's own total for the session is ${money(s.engineUsd)}.`
    return { text: `${whyText(s)}${estimateTotal(s) > 0 ? `${source}\nSource: the token counts the engine reported for each answer, priced with the list prices of ${PRICES_DATE}. Estimate.` : ''}` }
  })

  on('command.run', { command: 'vaken-usage' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'limits')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const now = await i.now()
    const usage = parseStoredUsage(await i.get(APP_USAGE_KEY))
    const records = await listRecords(i)
    const alive = await alivePids(i, records)
    const live2 = records.filter(r => alive === undefined || r.pid === undefined || alive.has(r.pid))
    const running = runningNow(live2, parseStoredSessions(await i.get(APP_SESSIONS_KEY)), now)
    const spenders = live2
      .filter(r => r.state === 'working' && r.costUsd !== undefined)
      .sort((a, b) => (b.costUsd ?? 0) - (a.costUsd ?? 0))
      .map((r): [string, number] => [r.title ?? folder(r.cwd), r.costUsd ?? 0])
    return { text: limitsText({ usage, history: parseHistory(await i.get(HISTORY_KEY)), running, spenders, now }) }
  })

  on('command.run', { command: 'vaken-usage' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'budget')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const ask = parseAsk(rest0)
    if (ask.kind === 'bad') return { text: ask.why }
    const c = await conf(i)
    const s = await ensure(i)
    const now = await factsNow(i, s, c)
    if (ask.kind === 'status') return { text: [...budgetLines(now.facts, now.extra, now.day.sessions), '', 'At 100% in Stop mode, /vaken-usage budget extend lifts the block. It adds one more budget to the one that is at 80% or more.'].join('\n') } // en-only: plain answer of a slash command (text twin)
    if (c.mode === 'off') return { text: 'The budget is off, so there is nothing to extend. Turn it on: Settings > Money and plan.' } // en-only: plain answer of a slash command (text twin)
    const which = toExtend(ask, readings(now.facts))
    if (which.length === 0) return { text: 'Nothing to extend: no budget is at 80% yet. To raise one anyway: /vaken-usage budget extend session, or /vaken-usage budget extend day.' } // en-only: plain answer of a slash command (text twin)
    const added: string[] = []
    for (const w of which) {
      if (w === 'session') {
        s.extra += c.session
        await save(i, s)
        added.push(`session budget +${money(c.session)}, now ${money(c.session + s.extra)}`)
      } else {
        const extra = now.extra.day + c.day
        await i.set(DAY_EXTRA_PREFIX + ymd(await i.now()), extra)
        added.push(`day budget +${money(c.day)}, now ${money(c.day + extra)}`)
      }
    }
    const after = await factsNow(i, s, c)
    rises(told, readings(after.facts))
    notes = []
    heldLogged.clear()
    await pushLog(i, LEDGER_KEY, { at: await i.now(), session: liveId, what: EXTENDED_WHAT, detail: `${added.join('; ')} (estimates).`, how: 'typed', did: true })
    i.invalidate()
    const still = worst(readings(after.facts).filter(r => r.level === 'over'))
    return { text: `Extended: ${added.join('; ')}. ${still === undefined ? 'Costly calls are allowed again.' : `The ${still.which} budget is still used up. Extend again to go on.`}` }
  })
}
