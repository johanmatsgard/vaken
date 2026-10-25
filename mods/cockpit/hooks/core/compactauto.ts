// Auto compaction: when vaken compacts by itself. Two triggers, one list of things that stop both. Pure; never conversation text.
import { CACHE_MARGIN_MS } from './compactscore'
import { CACHE_TTL_CREDITS_MS } from './compactmoment'

export type Trigger = 'break' | 'size'

// Never compact a session under this many tokens (the setting `compact.min`, absolute tokens): a small one costs little to keep.
export const MIN_TOKENS_DEFAULT = 100_000
// Never more than this share of the session's window, so a high minimum on a small window cannot switch Auto off (200k on a 200k window reads as 100k).
export const MIN_WINDOW_SHARE = 0.5
export const minTokensOf = (v: string | undefined, window?: number): number => {
  const set = v === '50000' || v === '200000' ? Number(v) : MIN_TOKENS_DEFAULT
  return window !== undefined && window > 0 ? Math.min(set, Math.round(window * MIN_WINDOW_SHARE)) : set
}

// Break trigger on the 60-minute cache: compact this long before the cache runs out (the setting `compact.lead`, minutes), so the whole window is still read at the cheap price.
export const LEAD_DEFAULT_MIN = 15
export const leadMsOf = (v: string | undefined): number => (v === '10' || v === '20' ? Number(v) : LEAD_DEFAULT_MIN) * 60_000
// The 5-minute cache (usage credits, or the plan not known): compact at 3 of the 5 minutes idle, 0.6 of the cache time, which leaves 2 minutes for the summary to be read warm.
export const SHORT_BREAK_SHARE = 0.6
// The idle time at which the break trigger fires: the cache time minus the lead, or the share for a short cache. Never under the share for the short cache.
export const breakAtMs = (ttlMs: number, leadMs: number): number => {
  const short = Math.round(ttlMs * SHORT_BREAK_SHARE)
  return ttlMs > CACHE_TTL_CREDITS_MS ? Math.max(short, ttlMs - leadMs) : short
}

// Size trigger: the first look comes this long after the answer ended, so the session record has the new size and the person has had time to start typing.
export const SIZE_LOOK_MS = 30_000
// The second look, when the prompt box was not empty at the first (the person is typing).
export const SIZE_LOOK2_MS = 2 * 60_000
// The break trigger looks once more this long after a look that found it not ready (a timer that fired a little early, a check that failed for a moment).
export const BREAK_RETRY_MS = 30_000
// After Auto could not start a compaction in a session, it leaves that session alone for this long, then tries again.
export const GIVE_UP_RETRY_MS = 30 * 60_000
// Minutes of the wait left, rounded up (0 when it is over).
export const giveUpLeftMin = (at: number | undefined, now: number): number => (at === undefined ? 0 : Math.max(0, Math.ceil((GIVE_UP_RETRY_MS - (now - at)) / 60_000)))
// No compaction, of any kind, in this time before one of vaken's.
export const COMPACT_GAP_MS = 20 * 60_000
// Size trigger only: a compaction that needs more answers than this to pay back is skipped. The break trigger always pays (the cache is warm).
export const PAYBACK_MAX_TURNS = 5
// Which words say how the cache stands: under the margin counts as cold.
export { CACHE_MARGIN_MS }

// Size trigger: the fill level of the window (the setting `compact.from`, percent) at which Auto compacts right after an answer.
export const FROM_DEFAULT_PCT = 60
// Size trigger while background helpers (agents or commands) still run and the main answer has ended: Auto waits until the window is this full, never below `compact.from`. Long orchestration always has a helper open, and without this the engine compacts by itself at ENGINE_COMPACT_AT, late and without the keep note.
export const BUSY_FROM_PCT = 75
export const busyFromOf = (from: number): number => Math.max(BUSY_FROM_PCT, from)

// ttlKnown is false when the plan, and so the cache time, is not known: the break trigger then never fires. busy is true while background helpers still run.
export type TimeFacts = { percent?: number; from: number; payback?: number; quietMs: number; breakAtMs: number; cacheLeftMs?: number; ttlKnown?: boolean; busy?: boolean }

// The fill level the size trigger needs on these facts
export const fromNow = (f: Pick<TimeFacts, 'from' | 'busy'>): number => (f.busy === true ? busyFromOf(f.from) : f.from)
export const sizeHit = (f: TimeFacts): boolean => f.percent !== undefined && f.percent >= fromNow(f) && f.payback !== undefined && f.payback <= PAYBACK_MAX_TURNS
// The break trigger needs nothing open: background helpers do not widen it
export const breakHit = (f: TimeFacts): boolean => f.busy !== true && f.ttlKnown !== false && f.quietMs >= f.breakAtMs && f.cacheLeftMs !== undefined && f.cacheLeftMs >= CACHE_MARGIN_MS

// The trigger that holds now; the size trigger first, because it needs no cache.
export const triggerOf = (f: TimeFacts): Trigger | undefined => (sizeHit(f) ? 'size' : breakHit(f) ? 'break' : undefined)
