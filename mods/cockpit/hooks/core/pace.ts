// Projected usage: where a limit will stand at its reset and when it runs out. Both paces are estimates and are called that.
import type { UsageWindow } from './appusage'

const HOUR = 3_600_000
export function windowLength(label: string): number | undefined {
  if (/5-hour/i.test(label)) return 5 * HOUR
  if (/^weekly/i.test(label)) return 7 * 24 * HOUR
  return undefined
}

// Too early or too little used says nothing useful.
const MIN_ELAPSED = 0.1
const MIN_PERCENT = 3

export type Pace = {
  projected: number // may pass 100
  hitAt?: number
  recentPerHour?: number
  recentHitAt?: number
}

export type Sample = [number, number]
export type History = Record<string, Sample[]>
// The app reports whole percents, so one step over a short time (1 point in 16 minutes reads as 3.8% an hour) says nothing real. The weekly window needs at least 3 hours or a single step would warn about a run-out that is not coming.
const RECENT_5H = { lookbackMs: 90 * 60_000, minSpanMs: 15 * 60_000, minChange: 2 }
const RECENT_WEEK = { lookbackMs: 24 * HOUR, minSpanMs: 3 * HOUR, minChange: 2 }
// A reading of 68 may be 67.5 to 68.5, so below this many points count the change minus one.
const NOISE_BELOW_PTS = 5
export const recentRule = (label: string) => (/^weekly/i.test(label) ? RECENT_WEEK : RECENT_5H)

export function paceOf(w: UsageWindow, now: number, samples: Sample[] = []): Pace | undefined {
  const len = windowLength(w.label)
  const reset = w.resetsAt === undefined ? NaN : new Date(w.resetsAt).getTime()
  if (len === undefined || Number.isNaN(reset)) return undefined
  const remaining = reset - now
  if (remaining <= 0 || remaining > len) return undefined
  const elapsed = len - remaining
  const pace: Partial<Pace> = {}
  if (elapsed / len >= MIN_ELAPSED && w.percent >= MIN_PERCENT) {
    pace.projected = (w.percent * len) / elapsed
    const hit = reset - len + (100 / w.percent) * elapsed
    if (w.percent < 100 && hit < reset) pace.hitAt = hit
  }
  const rule = recentRule(w.label)
  const recent = samples.filter(([t]) => now - t <= rule.lookbackMs && t <= now).sort((a, b) => a[0] - b[0])
  const first = recent[0]
  if (first !== undefined) {
    const span = now - first[0]
    const change = w.percent - first[1]
    if (span >= rule.minSpanMs && change >= rule.minChange) {
      const perHour = ((change < NOISE_BELOW_PTS ? change - 1 : change) / span) * HOUR
      pace.recentPerHour = perHour
      const toHit = ((100 - w.percent) / perHour) * HOUR
      if (now + toHit < reset) pace.recentHitAt = now + toHit
      if (pace.projected === undefined) pace.projected = w.percent + perHour * (remaining / HOUR)
    }
  }
  return pace.projected === undefined ? undefined : (pace as Pace)
}

export const runOutOf = (p: Pace | undefined): number | undefined => (p === undefined ? undefined : p.recentPerHour !== undefined ? p.recentHitAt : p.hitAt)

// Only the pace so far, never the kept readings, so every reader picks the same window. A used-up window runs out now.
export function pressureOf(label: string, percent: number, resetsAt: string | undefined, now: number): { score: number; outAt?: number } {
  if (percent >= 100) return { score: Infinity, outAt: now }
  const pace = paceOf({ label, percent, ...(resetsAt === undefined ? {} : { resetsAt }) }, now)
  return { score: Math.max(percent, pace?.projected ?? percent), ...(pace?.hitAt === undefined ? {} : { outAt: pace.hitAt }) }
}

const KEEP_MS = 8 * 24 * HOUR
const KEEP_EVERY_MS = 30 * 60_000
const KEEP_MAX = 600
export function addSamples(hist: History, windows: UsageWindow[], now: number): History {
  const out: History = {}
  for (const w of windows) {
    const old = (hist[w.label] ?? []).filter(([t]) => now - t <= KEEP_MS)
    const last = old.at(-1)
    const moved = last === undefined || last[1] !== w.percent || now - last[0] >= KEEP_EVERY_MS
    const reset = last !== undefined && w.percent < last[1]
    const kept = reset ? [] : old
    out[w.label] = (moved ? [...kept, [now, w.percent] as Sample] : kept).slice(-KEEP_MAX)
  }
  return out
}

export function parseHistory(raw: unknown): History {
  const out: History = {}
  if (typeof raw !== 'object' || raw === null) return out
  for (const [label, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue
    out[label] = list.filter((s): s is Sample => Array.isArray(s) && s.length === 2 && typeof s[0] === 'number' && typeof s[1] === 'number')
  }
  return out
}

export const HISTORY_KEY = 'cockpit:usage:hist'
