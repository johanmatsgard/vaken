// The weekly "did for you" line: one band line and one Autopilot row with the week's counts (compactions, caught loops, stopped risky steps).
import { BLOCK_WHAT, LOOP_WHAT, THRASH_WHAT } from './loopbreaker'
import { HALT_DENY_WHAT, HELD_WHAT as GUARD_HELD_WHAT } from './guard'
import { HELD_WHAT as MIGRATION_HELD_WHAT } from './guardback'
import { AWAY_DENY_WHAT } from './guardworld'
import { savings } from './ledger'
import type { Entry } from './ledger'

// Plain counts from vaken's own log, never minutes: a guess at time saved would be made up.
// Less than this many compactions and caught loops, with no stopped step, says nothing.
export const WEEKLY_MIN_COUNT = 2
export const WEEKLY_ROW_MS = 7 * 24 * 3_600_000

export const LOOP_WHATS: readonly string[] = [LOOP_WHAT, BLOCK_WHAT, THRASH_WHAT]
export const RISKY_STOP_WHATS: readonly string[] = [...Object.values(GUARD_HELD_WHAT), HALT_DENY_WHAT, MIGRATION_HELD_WHAT, AWAY_DENY_WHAT]

export type Weekly = { loops: number; shortens: number; stops: number; planPct?: number }

const sum = (counts: Record<string, number>, whats: readonly string[]): number => whats.reduce((n, w) => n + (counts[w] ?? 0), 0)

// A full ledger may have lost some compactions, so the count is lower, never higher.
export function weeklyValue(counts: Record<string, number>, ledger: Entry[], from: number, to: number): Weekly {
  const loops = sum(counts, LOOP_WHATS)
  const stops = sum(counts, RISKY_STOP_WHATS)
  const shortens = savings(ledger).filter(e => e.at >= from && e.at < to && (e.how === 'auto' || e.how === 'button')).length
  return { loops, shortens, stops }
}

const worth = (w: Weekly): boolean => w.stops > 0 || w.loops + w.shortens >= WEEKLY_MIN_COUNT
const joinAnd = (parts: string[]): string => (parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`)
const one = (n: number, once: string, many: string): string => (n === 1 ? once : many.replace('{n}', String(n)))

export function weeklyLine(w: Weekly): string | undefined {
  if (!worth(w)) return undefined
  const parts = [
    ...(w.shortens > 0 ? [one(w.shortens, 'compacted the session once', 'compacted the session {n} times')] : []),
    ...(w.loops > 0 ? [one(w.loops, 'caught a repeating step once', 'caught a repeating step {n} times')] : []),
    ...(w.stops > 0 ? [one(w.stops, 'stopped 1 risky step', 'stopped {n} risky steps')] : []),
    ...(w.planPct !== undefined && w.planPct > 0 ? [`saved ${Math.round(w.planPct)}% of your plan`] : []),
  ]
  return `This week vaken ${joinAnd(parts)}.`
}

// The band's short parts, also the Autopilot row's title
export const compactsPart = (n: number): string => one(n, '1 compaction', '{n} compactions')
export const loopsPart = (n: number): string => one(n, '1 loop caught', '{n} loops caught')
export const stopsPart = (n: number): string => one(n, '1 step stopped', '{n} steps stopped')

export function weeklyBand(w: Weekly): string | undefined {
  if (!worth(w)) return undefined
  const parts = [...(w.shortens > 0 ? [compactsPart(w.shortens)] : []), ...(w.loops > 0 ? [loopsPart(w.loops)] : []), ...(w.stops > 0 ? [stopsPart(w.stops)] : [])]
  return `This week: ${parts.join(', ')}`
}

export function weeklyFacts(w: Weekly, t: (s: string) => string = s => s): string[] {
  const fill = (once: string, many: string, n: number): string => (n === 1 ? t(once) : t(many).replace('{n}', String(n)))
  return [
    ...(w.shortens > 0 ? [fill('Compacted the session once.', 'Compacted the session {n} times.', w.shortens)] : []),
    ...(w.loops > 0 ? [fill('Caught a repeating step once.', 'Caught a repeating step {n} times.', w.loops)] : []),
    ...(w.stops > 0 ? [fill('Stopped a risky step once.', 'Stopped {n} risky steps.', w.stops)] : []),
    t('Counted from what vaken wrote down. Time and usage saved are not guessed.'),
  ]
}

export type WeeklyNote = Weekly & { week: string; at: number }
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
export function parseWeekly(raw: unknown): WeeklyNote | undefined {
  const o = raw as WeeklyNote
  if (typeof o !== 'object' || o === null || typeof o.week !== 'string' || !isNum(o.at) || !isNum(o.loops) || !isNum(o.shortens) || !isNum(o.stops)) return undefined
  return { week: o.week.slice(0, 10), at: o.at, loops: o.loops, shortens: o.shortens, stops: o.stops }
}
export const weeklyShown = (n: WeeklyNote | undefined, now: number): WeeklyNote | undefined => (n !== undefined && now >= n.at && now - n.at < WEEKLY_ROW_MS && worth(n) ? n : undefined)
