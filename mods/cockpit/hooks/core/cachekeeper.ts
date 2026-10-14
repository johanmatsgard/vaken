// The cache keeper: one tiny question over the session's chat keeps the prompt cache warm. Pure functions.
import { CACHE_TTL_CREDITS_MS, MIN_TOKENS } from './compactmoment'

// Capped because each ping spends plan usage whether or not the person returns.
export const KEEPER_MAX_PINGS = 3
const KEEPER_MIN_TOKENS = MIN_TOKENS
export const KEEPER_PROMPT = 'Reply with the single word ok.'
export const KEPT_WHAT = 'Kept the cache warm'
// Less than this share read from the cache means it had lapsed and the ping paid for a rewrite.
const HELD_SHARE = 0.5
const LEAD_LONG_MS = 5 * 60_000
const LEAD_SHORT_MS = 90_000

export const TEST_TTL_MS = 100_000
export const TEST_LAST_MS = 10 * 60_000

export const leadMs = (ttlMs: number): number => (ttlMs > CACHE_TTL_CREDITS_MS ? LEAD_LONG_MS : LEAD_SHORT_MS)

export const nextPingInMs = (cacheAt: number, ttlMs: number, now: number): number => Math.max(0, cacheAt + ttlMs - leadMs(ttlMs) - now)

type Facts = { mode: string; tokens?: number; pings: number; busy: boolean; warmLeftMs: number; minTokens?: number }

export function keeperVerdict(f: Facts): { ping: true } | { ping: false; why: string } {
  if (f.mode !== 'on') return { ping: false, why: 'The keeper is off.' }
  if (f.busy) return { ping: false, why: 'The session is busy: the cache is in use.' }
  if (f.tokens === undefined) return { ping: false, why: 'The window size is not known yet.' }
  if (f.tokens < (f.minTokens ?? KEEPER_MIN_TOKENS)) return { ping: false, why: 'The session is short: a rewrite is cheap.' }
  if (f.pings >= KEEPER_MAX_PINGS) return { ping: false, why: `It already read the cache ${KEEPER_MAX_PINGS} times since your last answer.` }
  if (f.warmLeftMs <= 0) return { ping: false, why: 'The cache has already gone stale.' }
  return { ping: true }
}

type Usage = { input_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }

export function pingHeld(u: Usage | undefined): boolean {
  const read = u?.cache_read_input_tokens ?? 0
  const total = read + (u?.cache_creation_input_tokens ?? 0) + (u?.input_tokens ?? 0)
  return total > 0 && read / total >= HELD_SHARE
}

const k = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))

export const keptDetail = (read: number, n: number): string => `Read ${k(read)} tokens from the cache (${n} of ${KEEPER_MAX_PINGS}).`
