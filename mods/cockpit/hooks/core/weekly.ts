// The weekly "did for you" line: one band line and one Autopilot row on time saved and risky steps stopped.
import { BLOCK_WHAT, LOOP_WHAT, THRASH_WHAT } from './loopbreaker'
import { HALT_DENY_WHAT, HELD_WHAT as GUARD_HELD_WHAT } from './guard'
import { HELD_WHAT as MIGRATION_HELD_WHAT } from './guardback'
import { AWAY_DENY_WHAT } from './guardworld'
import { savings } from './ledger'
import type { Entry } from './ledger'
import { tEn } from '../i18n/t'

// Kept low on purpose: a guess that is too high would make the line a boast.
export const LOOP_MINUTES = 5
export const SHORTEN_MINUTES = 3
export const RISKY_STOP_MINUTES = 10
export const WEEKLY_MIN_MINUTES = 5
export const WEEKLY_ROW_MS = 7 * 24 * 3_600_000

export const LOOP_WHATS: readonly string[] = [LOOP_WHAT, BLOCK_WHAT, THRASH_WHAT]
export const RISKY_STOP_WHATS: readonly string[] = [...Object.values(GUARD_HELD_WHAT), HALT_DENY_WHAT, MIGRATION_HELD_WHAT, AWAY_DENY_WHAT]

export type Weekly = { minutes: number; loops: number; shortens: number; stops: number; planPct?: number }

const sum = (counts: Record<string, number>, whats: readonly string[]): number => whats.reduce((n, w) => n + (counts[w] ?? 0), 0)

// A full ledger may have lost some compactions, so the count is lower, never higher.
export function weeklyValue(counts: Record<string, number>, ledger: Entry[], from: number, to: number): Weekly {
  const loops = sum(counts, LOOP_WHATS)
  const stops = sum(counts, RISKY_STOP_WHATS)
  const shortens = savings(ledger).filter(e => e.at >= from && e.at < to && (e.how === 'auto' || e.how === 'button')).length
  return { minutes: loops * LOOP_MINUTES + shortens * SHORTEN_MINUTES + stops * RISKY_STOP_MINUTES, loops, shortens, stops }
}

export const roundMinutes = (m: number): number => (m >= 10 ? Math.round(m / 5) * 5 : Math.round(m))
export function aboutMinutes(m: number): string {
  const r = roundMinutes(m)
  if (r < 60) return `about ${r} min`
  const h = Math.floor(r / 60)
  const rest = r % 60
  return `about ${h} h${rest === 0 ? '' : ` ${rest} min`}`
}

const risky = (n: number): string => tEn('words.risky_step', { n })
const worth = (w: Weekly): boolean => w.minutes >= WEEKLY_MIN_MINUTES || w.stops > 0
const joinAnd = (parts: string[]): string => (parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`)

export function weeklyLine(w: Weekly): string | undefined {
  if (!worth(w)) return undefined
  const parts = [...(w.minutes > 0 ? [`saved you ${aboutMinutes(w.minutes)}`] : []), ...(w.stops > 0 ? [`stopped ${risky(w.stops)}`] : []), ...(w.planPct !== undefined && w.planPct > 0 ? [`saved ${Math.round(w.planPct)}% of your plan`] : [])]
  return `This week vaken ${joinAnd(parts)}.`
}

export function weeklyBand(w: Weekly): string | undefined {
  if (!worth(w)) return undefined
  const parts = [...(w.minutes > 0 ? [`${aboutMinutes(w.minutes)} saved`] : []), ...(w.stops > 0 ? [`${risky(w.stops)} stopped`] : [])]
  return `This week: ${parts.join(', ')}`
}

export function weeklyFacts(w: Weekly, t: (s: string) => string = s => s): string[] {
  const fill = (s: string, n: number, m: number): string => t(s).replace('{n}', String(n)).replace('{m}', String(m))
  return [
    ...(w.loops > 0 ? [fill(w.loops === 1 ? 'Caught a repeating step once: about {m} min.' : 'Caught a repeating step {n} times: about {m} min.', w.loops, w.loops * LOOP_MINUTES)] : []),
    ...(w.shortens > 0 ? [fill(w.shortens === 1 ? 'Compacted the session once: about {m} min.' : 'Compacted the session {n} times: about {m} min.', w.shortens, w.shortens * SHORTEN_MINUTES)] : []),
    ...(w.stops > 0 ? [fill(w.stops === 1 ? 'Stopped a risky step once: about {m} min.' : 'Stopped {n} risky steps: about {m} min.', w.stops, w.stops * RISKY_STOP_MINUTES)] : []),
    t('Minutes are estimates: 5 for a caught repeating step, 3 for a compaction, 10 for a stopped risky step. Usage saved is not counted.'),
  ]
}

export type WeeklyNote = Weekly & { week: string; at: number }
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
export function parseWeekly(raw: unknown): WeeklyNote | undefined {
  const o = raw as WeeklyNote
  if (typeof o !== 'object' || o === null || typeof o.week !== 'string' || !isNum(o.at) || !isNum(o.minutes) || !isNum(o.loops) || !isNum(o.shortens) || !isNum(o.stops)) return undefined
  return { week: o.week.slice(0, 10), at: o.at, minutes: o.minutes, loops: o.loops, shortens: o.shortens, stops: o.stops }
}
export const weeklyShown = (n: WeeklyNote | undefined, now: number): WeeklyNote | undefined => (n !== undefined && now >= n.at && now - n.at < WEEKLY_ROW_MS && worth(n) ? n : undefined)
