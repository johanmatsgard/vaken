// Compact at rest: the good-moment score written out check by check. Pure; never conversation text.
import { AUTO_AT, AUTO_GAP_MS, CACHE_MARGIN_MS, COMPACT_FROM_PCT, QUIET_MS, RECENT_COMPACT_MS, score, todoOpen, workState } from './compactscore'
import type { Score, ScoreFacts } from './compactscore'
import { reasonWords } from './compactwords'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import type { ProofState } from './proof'
import { tEn } from '../i18n/t'

// The engine exposes no signal for a half-typed prompt, so a longer quiet stands in for it.
export const REST_QUIET_MS = QUIET_MS
export const BACKGROUND_OPEN_MS = 10 * 60_000
export const REST_GAP_MS = RECENT_COMPACT_MS
export { CACHE_MARGIN_MS }
export const REST_KEY = (sessionId: string): string => `cockpit:compact:rest:${sessionId}`
export const WOULD_WHAT = 'Would have compacted now'

export type RestFacts = {
  turnEnded: boolean
  endedWithQuestion: boolean
  waitsForYou: boolean
  agentsRunning: number
  backgroundRecent: number
  guardHeld?: boolean
  saved?: boolean
  proof?: ProofState
  tokens?: number
  percent?: number
  from?: number
  payback?: number
  quietMs: number
  cacheLeftMs?: number
  sinceCompactMs?: number
  sinceAutoMs?: number
}

type RestCheck = { id: string; label: string; ok: boolean; value: string }

const k = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))
const mins = (ms: number): string => `${Math.max(0, Math.round(ms / 60_000))} min`

export const restScore = (f: RestFacts): Score => score(restScoreFacts(f))
export const restScoreFacts = (f: RestFacts): ScoreFacts => ({
    working: !f.turnEnded,
    waits: f.waitsForYou || f.endedWithQuestion,
    helpers: f.agentsRunning,
    background: f.backgroundRecent,
    guardHeld: f.guardHeld ?? false,
    ...(f.sinceCompactMs === undefined ? {} : { sinceCompactMs: f.sinceCompactMs }),
    ...(f.tokens === undefined ? {} : { tokens: f.tokens }),
    ...(f.percent === undefined ? {} : { percent: f.percent }),
    ...(f.from === undefined ? {} : { from: f.from }),
    ...(f.proof === undefined ? {} : { proof: f.proof }),
    saved: f.saved ?? false,
    quietMs: f.quietMs,
    ...(f.cacheLeftMs === undefined ? {} : { cacheLeftMs: f.cacheLeftMs }),
    ...(f.payback === undefined ? {} : { payback: f.payback }),
  })

function workValue(p: ProofState | undefined): string {
  const todo = todoOpen(p) ? `, task list ${p?.todo?.done} of ${p?.todo?.total} done` : ''
  if (p === undefined || p.edits === 0) return `no file changed${todo}`
  const w = workState(p)
  if (w === 'finished') return `checks passed after the last edit${todo}`
  return `${w === 'open' ? 'a check failed or did not run after the last edit' : 'files changed and no check ran'}${todo}`
}

export function restChecks(f: RestFacts): RestCheck[] {
  const s = restScore(f)
  const stopped = (id: string): boolean => (s.hardStops as string[]).includes(id)
  const cacheOk = f.cacheLeftMs !== undefined && f.cacheLeftMs >= CACHE_MARGIN_MS
  const autoGapOk = f.sinceAutoMs === undefined || f.sinceAutoMs >= AUTO_GAP_MS
  return [
    { id: 'ended', label: 'The answer ended', ok: !stopped('working') && !f.waitsForYou, value: !f.turnEnded ? 'Claude is working' : f.waitsForYou ? 'a question or a permission waits for you' : 'yes' },
    { id: 'question', label: 'Claude did not end with a question', ok: !f.endedWithQuestion, value: f.endedWithQuestion ? 'the last answer asks you something' : 'yes' },
    { id: 'helpers', label: 'Nothing still runs', ok: !stopped('running'), value: f.agentsRunning + f.backgroundRecent === 0 ? 'no agent, no background command' : `${tEn('words.agent', { n: f.agentsRunning })}, ${tEn('words.background_command', { n: f.backgroundRecent })}` },
    { id: 'work', label: 'No work is open', ok: !stopped('open'), value: workValue(f.proof) },
    { id: 'guard', label: 'No risky step was stopped', ok: !stopped('guard'), value: f.guardHeld === true ? 'a step waits for your yes' : 'yes' },
    { id: 'size', label: 'The session is big enough', ok: !stopped('small'), value: f.tokens === undefined && f.percent === undefined ? 'size not known' : `${f.tokens === undefined ? '?' : k(f.tokens)} tokens, ${f.percent === undefined ? '?' : Math.round(f.percent)}% of the window (needs ${f.from ?? COMPACT_FROM_PCT}%)` },
    { id: 'gap', label: 'Not compacted in the last 10 minutes', ok: !stopped('recent'), value: f.sinceCompactMs === undefined ? 'none seen' : `the last one ${mins(f.sinceCompactMs)} ago` },
    { id: 'score', label: 'The moment scores high enough', ok: s.score >= AUTO_AT, value: `${s.score} of ${AUTO_AT}` },
    { id: 'context', label: `The session fills ${f.from ?? COMPACT_FROM_PCT}% of its window`, ok: f.percent !== undefined && f.percent >= (f.from ?? COMPACT_FROM_PCT), value: f.percent === undefined ? 'not known' : `${Math.round(f.percent)}%` },
    { id: 'quiet', label: 'Idle for 2 minutes', ok: f.quietMs >= REST_QUIET_MS, value: mins(f.quietMs) },
    // Auto waits when the cache has under a minute left. Whether a cold cache should count is undecided, so the old behaviour stays here only.
    { id: 'cache', label: 'The cache is still warm', ok: cacheOk, value: f.cacheLeftMs === undefined ? 'not known' : f.cacheLeftMs <= 0 ? 'gone cold: wait for the next break' : `${mins(f.cacheLeftMs)} left` },
    { id: 'autogap', label: 'No automatic compaction in the last 30 minutes', ok: autoGapOk, value: f.sinceAutoMs === undefined ? 'none seen' : `the last one ${mins(f.sinceAutoMs)} ago` },
  ]
}

export const restReady = (checks: RestCheck[]): boolean => checks.every(c => c.ok)

type Say = (name: string, vars?: Record<string, string | number>) => string
export function notGoodLines(checks: RestCheck[], f: RestFacts, say: Say): string[] {
  const failed = new Set(checks.filter(c => !c.ok).map(c => c.id))
  const m = (ms: number | undefined): number => Math.max(0, Math.round((ms ?? 0) / 60_000))
  const line: Record<string, () => string> = {
    ended: () => say(f.turnEnded ? 'cardcompact.not_waits' : 'cardcompact.not_answering'),
    question: () => say('cardcompact.not_question'),
    helpers: () => say('cardcompact.not_helpers'),
    work: () => say('cardcompact.not_work'),
    guard: () => say('cardcompact.not_guard'),
    size: () => say('cardcompact.not_small'),
    gap: () => say('cardcompact.not_recent', { n: m(f.sinceCompactMs) }),
    score: () => say('cardcompact.not_score', { n: restScore(f).score, of: AUTO_AT }),
    context: () => say('cardcompact.not_context', { pct: f.from ?? COMPACT_FROM_PCT }),
    quiet: () => say('cardcompact.not_quiet'),
    cache: () => say('cardcompact.not_cache'),
    autogap: () => say('cardcompact.not_autogap', { n: m(f.sinceAutoMs) }),
  }
  return checks.filter(c => failed.has(c.id) && !(c.id === 'context' && failed.has('size'))).map(c => line[c.id]?.() ?? c.label)
}

export const restLines = (checks: RestCheck[], t: Tr = same): string[] => checks.map(c => `${c.ok ? '✓' : '✗'} ${restWords(c.label, t)}: ${restWords(c.value, t)}`)

const SHAPES: [RegExp, string][] = [
  [/^The session fills (\d+)% of its window$/, 'The session fills {n}% of its window'],
  [/^(\d+) agents?, (\d+) background commands?$/, ''],
  [/^(\S+) tokens, (\S+)% of the window \(needs (\d+)%\)$/, '{a} tokens, {b}% of the window (needs {c}%)'],
  [/^the last one (\d+ min) ago$/, 'the last one {m} ago'],
  [/^(\d+) of (\d+)$/, '{a} of {b}'],
  [/^(\d+ min) left$/, '{m} left'],
]
export function restWords(s: string, t: Tr): string {
  if (t === same) return s
  const whole = t(s)
  if (whole !== s) return whole
  const task = /^(.*), task list (\d+) of (\d+) done$/.exec(s)
  if (task !== null) return `${restWords(task[1], t)}, ${fillIn(t('task list {a} of {b} done'), { a: task[2], b: task[3] })}`
  const helpers = SHAPES[1][0].exec(s)
  if (helpers !== null) {
    const h = Number(helpers[1])
    const b = Number(helpers[2])
    return `${fillIn(t(h === 1 ? '1 agent' : '{n} agents'), { n: h })}, ${fillIn(t(b === 1 ? '1 background command' : '{n} background commands'), { n: b })}`
  }
  const fills: Record<string, string[]> = { 0: ['n'], 2: ['a', 'b', 'c'], 3: ['m'], 4: ['a', 'b'], 5: ['m'] }
  for (const [i, [re, tpl]] of SHAPES.entries()) {
    const m = re.exec(s)
    if (m === null || tpl === '') continue
    return fillIn(t(tpl), Object.fromEntries((fills[i] ?? []).map((k, j) => [k, m[j + 1]])))
  }
  return s
}

export const restDetail = (f: RestFacts): string => reasonWords(restScore(f).reasons)

export type RestVerdict = { at: number; ready: boolean; checks: RestCheck[] }
export function parseVerdict(raw: unknown): RestVerdict | undefined {
  const o = raw as Partial<RestVerdict> | null
  if (typeof o !== 'object' || o === null || typeof o.at !== 'number' || typeof o.ready !== 'boolean' || !Array.isArray(o.checks)) return undefined
  const checks = o.checks.filter((c): c is RestCheck => typeof c === 'object' && c !== null && typeof c.id === 'string' && typeof c.label === 'string' && typeof c.ok === 'boolean' && typeof c.value === 'string')
  return { at: o.at, ready: o.ready, checks }
}

export const endsWithQuestion = (answer: string): boolean => /\?\s*[)\]"'*_`]*\s*$/.test(answer.slice(-200))

export function restSection(mode: string | undefined, verdict: RestVerdict | undefined, would: { at: number; detail?: string }[], now: number): string[] {
  if (mode !== 'watch' && mode !== 'auto') return ['', 'Compact when idle is off. Settings > Money and plan > Compact by itself: Watch only notes the moments it would compact, Auto compacts at them.']
  const head = mode === 'watch' ? 'Compact when idle, watch only: it notes each moment it would compact the session, and does nothing.' : 'Compact when idle, Auto: it compacts the session when every check below is true.'
  const look = verdict === undefined ? ['No look yet. It looks 2 minutes after each answer ends, then every 2 minutes while it stays quiet.'] : [`Last look ${mins(now - verdict.at)} ago: ${verdict.ready ? 'a good moment' : 'not yet'}.`, ...restLines(verdict.checks).map(l => `  ${l}`)]
  const seen = would.slice(0, 5).map(w => `  ${mins(now - w.at)} ago${w.detail === undefined ? '' : `: ${w.detail}`}`)
  return ['', head, ...look, ...(mode === 'watch' ? (seen.length === 0 ? ['It has not found a good moment yet.'] : [`The last moments it would have compacted the session (${would.length} kept):`, ...seen]) : [])]
}
