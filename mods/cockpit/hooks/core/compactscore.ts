// The one "good moment" score. Hard stops block whatever the points; the card, Watch and Auto all read it so they cannot disagree.
import { doneMet, relevantKinds, statusOf } from './proof'
import type { ProofState } from './proof'

export const SUGGEST_AT = 50
export const AUTO_AT = 70
// The card's advice reads this when it is not told the setting `compact.from` (the same as Auto's own default, FROM_DEFAULT_PCT in compactauto.ts)
export const COMPACT_FROM_PCT = 60
export const AUTO_GAP_MS = 30 * 60_000
// Only when the window is unknown: below this many tokens the chat counts as too small.
export const MIN_TOKENS = 150_000
export const RECENT_COMPACT_MS = 10 * 60_000
// The engine exposes no draft signal, so the look waits this long after the turn ended.
export const QUIET_MS = 2 * 60_000
export const CACHE_MARGIN_MS = 60_000
export const PAYBACK_POINTS_TURNS = 5

// Compacting mid-task costs quality, so advice and Auto wait while the work is open, unless the window is nearly full.
export type WorkState = 'finished' | 'open' | 'unknown'
export function workState(p: ProofState | undefined): WorkState {
  if (p === undefined || p.edits === 0) return 'unknown'
  const kinds = relevantKinds(p)
  const statuses = kinds.map(k => statusOf(p, k))
  if (statuses.includes('failed') || statuses.includes('stale')) return 'open'
  if (p.done.length > 0) return doneMet(p, p.done) ? 'finished' : 'open'
  return statuses.length > 0 && statuses.every(s => s === 'ok') ? 'finished' : 'unknown'
}

export const todoOpen = (p: ProofState | undefined): boolean => p?.todo !== undefined && p.todo.total > 0 && p.todo.done < p.todo.total

export type Stop = 'working' | 'waiting' | 'running' | 'open' | 'guard' | 'recent' | 'small'
export const STOPS: readonly Stop[] = ['working', 'waiting', 'running', 'open', 'guard', 'recent', 'small']
export type Why = 'checks' | 'unchanged' | 'tasks' | 'saved' | 'context' | 'cache' | 'quiet' | 'payback'
export type Reason = { id: Why; points: number; value?: number }

export type ScoreFacts = {
  working: boolean
  waits: boolean
  helpers: number
  background: number
  guardHeld: boolean
  sinceCompactMs?: number
  tokens?: number
  percent?: number
  from?: number
  proof?: ProofState
  saved: boolean
  quietMs: number
  cacheLeftMs?: number
  payback?: number
}

export type Score = { score: number; hardStops: Stop[]; reasons: Reason[] }

export function score(f: ScoreFacts): Score {
  const p = f.proof
  const work = workState(p)
  const from = f.from ?? COMPACT_FROM_PCT
  const hardStops = STOPS.filter(s => {
    if (s === 'working') return f.working
    if (s === 'waiting') return f.waits
    if (s === 'running') return f.helpers > 0 || f.background > 0
    if (s === 'open') return work === 'open' || todoOpen(p)
    if (s === 'guard') return f.guardHeld
    if (s === 'recent') return f.sinceCompactMs !== undefined && f.sinceCompactMs < RECENT_COMPACT_MS
    return f.percent !== undefined ? f.percent < from : f.tokens === undefined || f.tokens < MIN_TOKENS
  })
  const reasons: Reason[] = []
  const add = (id: Why, points: number, value?: number): void => void reasons.push({ id, points, ...(value === undefined ? {} : { value }) })
  if (work === 'finished') add('checks', 30)
  else if (p === undefined || p.edits === 0) add('unchanged', 30)
  if (p?.todo !== undefined && p.todo.total > 0 && p.todo.done === p.todo.total) add('tasks', 10)
  if (f.saved) add('saved', 15)
  if (f.percent !== undefined && f.percent >= from) add('context', f.percent >= 80 ? 30 : f.percent >= 65 ? 20 : 10, Math.round(f.percent))
  // A cold cache is neither a hard stop nor a bonus, undecided.
  if (f.cacheLeftMs !== undefined && f.cacheLeftMs >= CACHE_MARGIN_MS) add('cache', 10)
  if (f.quietMs >= QUIET_MS) add('quiet', 5)
  if (f.payback !== undefined && f.payback <= PAYBACK_POINTS_TURNS) add('payback', 10)
  return { score: Math.min(100, reasons.reduce((n, r) => n + r.points, 0)), hardStops, reasons }
}

export const suggests = (s: Score): boolean => s.hardStops.length === 0 && s.score >= SUGGEST_AT
export const autoReady = (s: Score, percent: number | undefined, from = COMPACT_FROM_PCT): boolean => s.hardStops.length === 0 && s.score >= AUTO_AT && percent !== undefined && percent >= from

export function workSaved(p: ProofState | undefined, checkpointAt?: number): boolean {
  if (p?.last?.diff !== undefined && p.last.diff.files === 0) return true
  return checkpointAt !== undefined && p?.last !== undefined && checkpointAt >= p.last.at - p.last.seconds * 1000
}
