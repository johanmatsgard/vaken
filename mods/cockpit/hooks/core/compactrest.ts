// Compact at rest: the checks of Auto's rule written out one by one. Pure; never conversation text.
import { CACHE_MARGIN_MS, COMPACT_GAP_MS, FROM_DEFAULT_PCT, MIN_TOKENS_DEFAULT, BUSY_FROM_PCT, breakHit, fromNow, sizeHit, triggerOf } from './compactauto'
import type { Trigger } from './compactauto'
import { detailWords } from './compactwords'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import { tEn } from '../i18n/t'

// A background command counts as running until its end is seen (a task notification, or the person stopping it). If an end is never seen, it still stops counting after this long, so a lost signal cannot block Auto for good.
export const BACKGROUND_MAX_MS = 6 * 60 * 60_000
// A prompt of this origin is a background command's end reaching the session (the engine's own kind for a background task's notification)
export const endsBackground = (origin: { kind?: unknown } | undefined): boolean => origin?.kind === 'task-notification'
export const REST_GAP_MS = COMPACT_GAP_MS
export { CACHE_MARGIN_MS }
export const REST_KEY = (sessionId: string): string => `cockpit:compact:rest:${sessionId}`
export const WOULD_WHAT = 'Would have compacted now'

export type RestFacts = {
  turnEnded: boolean
  waitsForYou: boolean
  agentsRunning: number
  backgroundRecent: number
  // Of agentsRunning, those started in the foreground: the main loop waits on them, so Auto never compacts over one
  foregroundAgents?: number
  guardHeld?: boolean
  tokens?: number
  percent?: number
  from?: number
  minTokens?: number
  payback?: number
  quietMs: number
  breakAtMs: number
  cacheLeftMs?: number
  sinceCompactMs?: number
  // False when the plan, and so the cache time, is not known: the break trigger then never fires.
  ttlKnown?: boolean
}

type RestCheck = { id: string; label: string; ok: boolean; value: string }

const k = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))
const mins = (ms: number): string => `${Math.max(0, Math.round(ms / 60_000))} min`

// Background helpers (agents or commands) still run: Auto then compacts only at BUSY_FROM_PCT, never during a break
export const helpersOpen = (f: Pick<RestFacts, 'agentsRunning' | 'backgroundRecent'>): boolean => f.agentsRunning + f.backgroundRecent > 0

const timeFacts = (f: RestFacts) => ({ busy: helpersOpen(f),  ...(f.percent === undefined ? {} : { percent: f.percent }), from: f.from ?? FROM_DEFAULT_PCT, ...(f.payback === undefined ? {} : { payback: f.payback }), quietMs: f.quietMs, breakAtMs: f.breakAtMs, ...(f.cacheLeftMs === undefined ? {} : { cacheLeftMs: f.cacheLeftMs }), ...(f.ttlKnown === undefined ? {} : { ttlKnown: f.ttlKnown }) })

// Which trigger holds on these facts (the size one first), if any
export const restTrigger = (f: RestFacts): Trigger | undefined => triggerOf(timeFacts(f))

// What the ledger says next to a would-have-compacted note
export const restDetail = (f: RestFacts): string => {
  const kind = restTrigger(f)
  return kind === undefined ? '' : detailWords(kind, f.percent)
}

function timeValue(f: RestFacts): string {
  const t = timeFacts(f)
  const pct = f.percent === undefined ? '?' : String(Math.round(f.percent))
  const from = fromNow(t)
  if (sizeHit(t)) return `${pct}% of the window, at least ${from}%`
  if (breakHit(t)) return 'a break, the cache is still warm'
  if (f.percent !== undefined && f.percent >= from) return `${pct}% of the window, but compacting would not pay back soon`
  if (t.busy) return `${pct}% of the window (needs ${from}% while agents run)`
  return `${pct}% of the window (needs ${t.from}%), or a break after ${mins(f.breakAtMs)}`
}

// Nothing open, or only background helpers (Auto may compact, later), or an agent in the foreground (never)
function helpersCheck(f: RestFacts): RestCheck {
  const fg = f.foregroundAgents ?? 0
  if (fg > 0) return { id: 'helpers', label: 'Nothing still runs', ok: false, value: 'an agent runs in the foreground' }
  if (!helpersOpen(f)) return { id: 'helpers', label: 'Nothing still runs', ok: true, value: 'no agent, no background command' }
  return { id: 'helpers', label: 'Only background agents or commands still run', ok: true, value: `${tEn('words.agent', { n: f.agentsRunning })}, ${tEn('words.background_command', { n: f.backgroundRecent })}` }
}

export function restChecks(f: RestFacts): RestCheck[] {
  const min = f.minTokens ?? MIN_TOKENS_DEFAULT
  const gapOk = f.sinceCompactMs === undefined || f.sinceCompactMs >= COMPACT_GAP_MS
  return [
    { id: 'ended', label: 'The answer ended', ok: f.turnEnded && !f.waitsForYou, value: !f.turnEnded ? 'Claude is working' : f.waitsForYou ? 'a question or a permission waits for you' : 'yes' },
    helpersCheck(f),
    { id: 'guard', label: 'No risky step was stopped', ok: f.guardHeld !== true, value: f.guardHeld === true ? 'a step waits for your yes' : 'yes' },
    { id: 'size', label: 'The session is big enough', ok: f.tokens !== undefined && f.tokens >= min, value: f.tokens === undefined ? 'size not known' : `${k(f.tokens)} tokens (needs ${k(min)})` },
    { id: 'gap', label: 'Not compacted in the last 20 minutes', ok: gapOk, value: f.sinceCompactMs === undefined ? 'none seen' : `the last one ${mins(f.sinceCompactMs)} ago` },
    { id: 'time', label: 'It is time: the session is full, or a break is near its end', ok: restTrigger(f) !== undefined, value: timeValue(f) },
  ]
}

export const restReady = (checks: RestCheck[]): boolean => checks.every(c => c.ok)

type Say = (name: string, vars?: Record<string, string | number>) => string
export function notGoodLines(checks: RestCheck[], f: RestFacts, say: Say): string[] {
  const failed = new Set(checks.filter(c => !c.ok).map(c => c.id))
  const m = (ms: number | undefined): number => Math.max(0, Math.round((ms ?? 0) / 60_000))
  const line: Record<string, () => string> = {
    ended: () => say(f.turnEnded ? 'cardcompact.not_waits' : 'cardcompact.not_answering'),
    helpers: () => say('cardcompact.not_foreground'),
    guard: () => say('cardcompact.not_guard'),
    size: () => say('cardcompact.not_small'),
    gap: () => say('cardcompact.not_recent', { n: m(f.sinceCompactMs) }),
    time: () => (helpersOpen(f) ? say('cardcompact.not_time_busy', { n: fromNow({ from: f.from ?? FROM_DEFAULT_PCT, busy: true }) }) : say('cardcompact.not_time')),
  }
  return checks.filter(c => failed.has(c.id)).map(c => line[c.id]?.() ?? c.label)
}

export const restLines = (checks: RestCheck[], t: Tr = same): string[] => checks.map(c => `${c.ok ? '✓' : '✗'} ${restWords(c.label, t)}: ${restWords(c.value, t)}`)

const SHAPES: [RegExp, string][] = [
  [/^(\d+) agents?, (\d+) background commands?$/, ''],
  [/^(\S+) tokens \(needs (\S+)\)$/, '{a} tokens (needs {b})'],
  [/^the last one (\d+ min) ago$/, 'the last one {m} ago'],
  [/^(\d+) of (\d+)$/, '{a} of {b}'],
  [/^(\d+ min) left$/, '{m} left'],
  [/^(\S+)% of the window, at least (\d+)%$/, '{a}% of the window, at least {b}%'],
  [/^(\S+)% of the window, but compacting would not pay back soon$/, '{a}% of the window, but compacting would not pay back soon'],
  [/^(\S+)% of the window \(needs (\d+)%\), or a break after (\d+ min)$/, '{a}% of the window (needs {b}%), or a break after {m}'],
  [/^(\S+)% of the window \(needs (\d+)% while agents run\)$/, '{a}% of the window (needs {b}% while agents run)'],
]
export function restWords(s: string, t: Tr): string {
  if (t === same) return s
  const whole = t(s)
  if (whole !== s) return whole
  const task = /^(.*), task list (\d+) of (\d+) done$/.exec(s)
  if (task !== null) return `${restWords(task[1], t)}, ${fillIn(t('task list {a} of {b} done'), { a: task[2], b: task[3] })}`
  const helpers = SHAPES[0][0].exec(s)
  if (helpers !== null) {
    const h = Number(helpers[1])
    const b = Number(helpers[2])
    return `${fillIn(t(h === 1 ? '1 agent' : '{n} agents'), { n: h })}, ${fillIn(t(b === 1 ? '1 background command' : '{n} background commands'), { n: b })}`
  }
  const fills: Record<string, string[]> = { 1: ['a', 'b'], 2: ['m'], 3: ['a', 'b'], 4: ['m'], 5: ['a', 'b'], 6: ['a'], 7: ['a', 'b', 'm'], 8: ['a', 'b'] }
  for (const [i, [re, tpl]] of SHAPES.entries()) {
    const m = re.exec(s)
    if (m === null || tpl === '') continue
    return fillIn(t(tpl), Object.fromEntries((fills[i] ?? []).map((name, j) => [name, m[j + 1]])))
  }
  return s
}

export type RestVerdict = { at: number; ready: boolean; checks: RestCheck[] }
export function parseVerdict(raw: unknown): RestVerdict | undefined {
  const o = raw as Partial<RestVerdict> | null
  if (typeof o !== 'object' || o === null || typeof o.at !== 'number' || typeof o.ready !== 'boolean' || !Array.isArray(o.checks)) return undefined
  const checks = o.checks.filter((c): c is RestCheck => typeof c === 'object' && c !== null && typeof c.id === 'string' && typeof c.label === 'string' && typeof c.ok === 'boolean' && typeof c.value === 'string')
  return { at: o.at, ready: o.ready, checks }
}

export function restSection(mode: string | undefined, verdict: RestVerdict | undefined, would: { at: number; detail?: string }[], now: number, t: Tr = same): string[] {
  if (mode !== 'watch' && mode !== 'auto') return ['', t('Compact when idle is off. Settings > Money and plan > Compact by itself: Watch only notes the moments it would compact, Auto compacts at them.')]
  const head = mode === 'watch' ? t('Compact when idle, watch only: it notes each moment it would compact the session, and does nothing.') : fillIn(t('Compact when idle, Auto: it compacts the session when every check below is true, when the session is full or a break is near the end of the cache time. With agents running in the background, Auto waits until {pct}%, and not during a break.'), { pct: BUSY_FROM_PCT })
  const look = verdict === undefined ? [t('No look yet. It looks right after each answer ends, and again when a break is near the end of the cache time.')] : [fillIn(t('Last look {age} ago: {state}.'), { age: mins(now - verdict.at), state: t(verdict.ready ? 'a good moment' : 'not yet') }), ...restLines(verdict.checks, t).map(l => `  ${l}`)]
  const seen = would.slice(0, 5).map(w => `  ${fillIn(t('{age} ago'), { age: mins(now - w.at) })}${w.detail === undefined ? '' : `: ${w.detail}`}`)
  return ['', head, ...look, ...(mode === 'watch' ? (seen.length === 0 ? [t('It has not found a good moment yet.')] : [fillIn(t('The last moments it would have compacted the session ({n} kept):'), { n: would.length }), ...seen]) : [])]
}
