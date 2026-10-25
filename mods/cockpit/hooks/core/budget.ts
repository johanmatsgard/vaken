// Budgets in dollars per session and per day that warn at 80% and refuse costly calls at 100% in Stop mode. Pure.
import { moneyEn as money } from './prices'
import { percentOf } from './words'
import { t as tNow, tr } from '../i18n/t'
import { fillIn } from './fillin'
import { fmt } from './fmt'

export type Which = 'session' | 'day'
export type Level = 'ok' | 'warn' | 'over'

export const WARN_AT = 0.8
export const WARNED_WHAT = 'Warned about the budget'
export const HELD_WHAT = 'Held a call over budget'
export const EXTENDED_WHAT = 'Extended the budget'

const COSTLY = /^(Agent|Task|Workflow)$/
export const isCostly = (tool: string): boolean => COSTLY.test(tool)

export type Spend = { usd: number; limit: number }
export type Facts = { mode: string; session?: Spend; day?: Spend; source: 'engine' | 'estimate' }
export type Reading = { which: Which; usd: number; limit: number; share: number; level: Level }

export const levelOf = (share: number): Level => (share >= 1 ? 'over' : share >= WARN_AT ? 'warn' : 'ok')
const RANK: Record<Level, number> = { ok: 0, warn: 1, over: 2 }
export const rose = (before: Level, now: Level): boolean => RANK[now] > RANK[before]

function read(which: Which, s: Spend | undefined): Reading | undefined {
  if (s === undefined || !(s.limit > 0)) return undefined
  const share = s.usd / s.limit
  return { which, usd: s.usd, limit: s.limit, share, level: levelOf(share) }
}

export function readings(f: Facts): Reading[] {
  if (f.mode === 'off') return []
  return [read('session', f.session), read('day', f.day)].filter((r): r is Reading => r !== undefined)
}

export const worst = (list: Reading[]): Reading | undefined => [...list].sort((a, b) => b.share - a.share)[0]

export function rises(before: Record<Which, Level>, list: Reading[]): Reading[] {
  const out: Reading[] = []
  for (const r of list) {
    if (rose(before[r.which], r.level)) out.push(r)
    before[r.which] = r.level
  }
  return out
}

// Rounds down below the limit: 99.5% reads "99%", since 100% means used up.
const percent = (r: Reading): number => (r.share < 1 ? Math.floor(r.share * 100) : percentOf(r.share))
const label = (w: Which): string => (w === 'session' ? 'session' : 'day')

export const toastText = (r: Reading, t: (s: string) => string = s => s): string => t('Cost: {pct}% of the {which} budget (about {usd} of {limit}, estimate).').replace('{pct}', String(percent(r))).replace('{which}', t(label(r.which))).replace('{usd}', fmt.money(r.usd)).replace('{limit}', fmt.money(r.limit)) + (r.which === 'day' ? ` ${t('Only sessions vaken saw today are counted.')}` : '')

// Only Stop, which the person chose, changes what Claude does. In every other mode the note is facts only: Claude keeps working as before.
export const noteText = (r: Reading, mode: string): string =>
  mode === 'stop'
    ? r.level === 'over'
      ? `Vaken saw the ${label(r.which)} cost budget used up: about ${money(r.usd)} of ${money(r.limit)} (an estimate). New costly calls such as agents are stopped now. Tell the person what you did so far and ask if you should go on. They can type /vaken-usage budget extend.`
      : `Vaken saw ${percent(r)}% of the ${label(r.which)} cost budget used: about ${money(r.usd)} of ${money(r.limit)} (an estimate). At 100% vaken stops costly calls such as agents.`
    : `For information only: vaken saw ${percent(r)}% of the ${label(r.which)} cost budget used, about ${money(r.usd)} of ${money(r.limit)} (an estimate). The person already sees this. Do not change your work or your answer because of it.`

export const stopReason = (tool: string, r: Reading): string =>
  `Vaken stopped this ${tool} call: the ${label(r.which)} cost budget is used up, about ${money(r.usd)} of ${money(r.limit)} (an estimate). Do not start other costly work. Tell the person and ask if you should go on. They can type /vaken-usage budget extend.`

export const ledgerWarned = (r: Reading): string => `${percent(r)}% of the ${label(r.which)} budget: about ${money(r.usd)} of ${money(r.limit)} (estimate).`
export const ledgerHeld = (tool: string, r: Reading): string => `Stopped a ${tool} call: the ${label(r.which)} budget of ${money(r.limit)} is used up (estimate).`

export function budgetLines(f: Facts, extra: { session: number; day: number }, daySessions?: number): string[] {
  if (f.mode === 'off') return [tr('Budget: off. Turn it on: Settings > Money and plan.')]
  const lines = [f.mode === 'stop' ? tr('Budget: stop. At 80% you are warned; at 100% costly calls such as agents are stopped.') : tr('Budget: warn. At 80% and at 100% you are warned.')]
  for (const [which, s] of [['session', f.session], ['day', f.day]] as const) {
    if (s === undefined) continue
    const r = read(which, s)
    const added = extra[which] > 0 ? ` ${fillIn(tr('({base} plus {extra} extended)'), { base: fmt.money(s.limit - extra[which]), extra: fmt.money(extra[which]) })}` : ''
    const over = which === 'day' && daySessions !== undefined ? `, ${tNow('words.session', { n: daySessions })}` : ''
    lines.push(fillIn(tr('{which}: about {usd} of {limit}{added}, {pct}{over} (estimate; source: {source}).'), { which: which === 'session' ? tr('Session') : tr('Day'), usd: fmt.money(s.usd), limit: fmt.money(s.limit), added, pct: r === undefined ? '' : fmt.percent(percent(r)), over, source: f.source === 'engine' ? tr("the engine's session total") : tr('tokens and list prices') }))
  }
  return lines
}

export type Ask = { kind: 'status' } | { kind: 'extend'; which?: Which } | { kind: 'bad'; why: string }
export function parseAsk(args: string): Ask {
  const w = args.trim().toLowerCase().split(/\s+/).filter(x => x !== '')
  if (w.length === 0 || w[0] === 'status') return { kind: 'status' }
  if (w[0] !== 'extend') return { kind: 'bad', why: tr('Use: /vaken-usage budget, or /vaken-usage budget extend [session|day]') }
  if (w.length === 1) return { kind: 'extend' }
  if (w.length === 2 && (w[1] === 'session' || w[1] === 'day')) return { kind: 'extend', which: w[1] }
  return { kind: 'bad', why: tr('Use: /vaken-usage budget extend [session|day]') }
}

export function toExtend(ask: { which?: Which }, list: Reading[]): Which[] {
  if (ask.which !== undefined) return [ask.which]
  return list.filter(r => r.level !== 'ok').map(r => r.which)
}

export const optionNumber = (raw: unknown, options: readonly number[], fallback: number): number => {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN
  return options.includes(n) ? n : fallback
}

export { ymd } from './time'
