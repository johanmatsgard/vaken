// The cache keeper: one tiny question over the session's chat keeps the prompt cache warm. Pure functions.
import { CACHE_TTL_CREDITS_MS, MIN_TOKENS } from './compactmoment'
import { aboutMoney } from './prices'
import { startOfDay } from './ledger'
import type { Entry } from './ledger'
import { fillIn } from './fillin'
import { tr } from './lang'

// Capped because each ping spends plan usage whether or not the person returns.
export const KEEPER_MAX_PINGS = 3
const KEEPER_MIN_TOKENS = MIN_TOKENS
export const KEEPER_PROMPT = 'Reply with the single word ok.' // en-only: a prompt sent to Claude
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
  if (f.mode !== 'on') return { ping: false, why: tr('The keeper is off.') }
  if (f.busy) return { ping: false, why: tr('The session is busy: the cache is in use.') }
  if (f.tokens === undefined) return { ping: false, why: tr('The window size is not known yet.') }
  if (f.tokens < (f.minTokens ?? KEEPER_MIN_TOKENS)) return { ping: false, why: tr('The session is short: a rewrite is cheap.') }
  if (f.pings >= KEEPER_MAX_PINGS) return { ping: false, why: fillIn(tr('It already read the cache {n} times since your last answer.'), { n: KEEPER_MAX_PINGS }) }
  if (f.warmLeftMs <= 0) return { ping: false, why: tr('The cache has already gone stale.') }
  return { ping: true }
}

type Usage = { input_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }

export function pingHeld(u: Usage | undefined): boolean {
  const read = u?.cache_read_input_tokens ?? 0
  const total = read + (u?.cache_creation_input_tokens ?? 0) + (u?.input_tokens ?? 0)
  return total > 0 && read / total >= HELD_SHARE
}

const k = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))

// A stored ledger detail, English by rule (the ledger line is matched on its title)
export const keptDetail = (read: number, n: number): string => `Read ${k(read)} tokens from the cache (${n} of ${KEEPER_MAX_PINGS}).`

// What the keeper's reads came to, written once the next answer shows whether the cache held. A note, not an action: the money shows on the Kept row.
export const KEPT_PAID_WHAT = 'Kept the cache warm: it paid'
export const KEPT_LOST_WHAT = 'Keeper did not pay this time'

type Facts3 = { read: number; write: number; fresh: number }
export const cacheHeld = (c: Facts3): boolean => c.read + c.write + c.fresh > 0 && c.read / (c.read + c.write + c.fresh) >= HELD_SHARE

// List prices in dollars a million tokens (core/prices.ts). The reads cost their tokens at the read price; a held next answer spared writing what it read.
type CachePrice = { read: number; write: number }
export function keptNet(price: CachePrice | undefined, reads: number[], nextFacts: Facts3, held: boolean): { usd: number; spared: number; cost: number } | undefined {
  if (price === undefined || reads.length === 0) return undefined
  const cost = (reads.reduce((n, r) => n + r, 0) * price.read) / 1e6
  const spared = held ? (nextFacts.read * (price.write - price.read)) / 1e6 : 0
  return { usd: spared - cost, spared, cost }
}

const readsWord = (n: number): string => (n === 1 ? '1 read' : `${n} reads`) // en-only: part of a stored ledger detail
export const keptNetDetail = (n: { spared: number; cost: number }, reads: number): string =>
  n.spared > 0 ? `Your next message used the cache: ${aboutMoney(n.spared)} of rewriting spared, less ${aboutMoney(n.cost)} for ${readsWord(reads)}.` : `Your next message did not use the cache, so ${readsWord(reads)} cost ${aboutMoney(n.cost)} for nothing.`

// Today's money from the keeper, saved less spent; undefined until an answer settled it.
export function keptToday(ledger: Entry[], now: number): number | undefined {
  const lines = ledger.filter(e => e.at >= startOfDay(now) && e.usd !== undefined && (e.what === KEPT_PAID_WHAT || e.what === KEPT_LOST_WHAT))
  return lines.length === 0 ? undefined : lines.reduce((n, e) => n + (e.usd ?? 0), 0)
}

// Stored ledger titles: the keeper stopped because the cache had gone stale, or it could not read the cache
export const KEEPER_STOP_WHAT = 'Keeper stopped'
export const KEEPER_UNREAD_WHAT = 'Keeper could not read the cache'
// Why the keeper stands stopped today: its last word today was a stop or a read it could not make. A read that worked after it clears it, so a read error that recovered says nothing.
export function keeperStopped(ledger: Entry[], now: number): 'stale' | 'unread' | undefined {
  const kinds = [KEPT_WHAT, KEEPER_STOP_WHAT, KEEPER_UNREAD_WHAT]
  const last = ledger.filter(e => e.at >= startOfDay(now) && kinds.includes(e.what)).reduce<Entry | undefined>((a, e) => (a === undefined || e.at > a.at ? e : a), undefined)
  return last?.what === KEEPER_STOP_WHAT ? 'stale' : last?.what === KEEPER_UNREAD_WHAT ? 'unread' : undefined
}
// The plain reason under the keeper's row when it stands stopped
export const KEEPER_STOP_WHY: Record<'stale' | 'unread', string> = { stale: 'The cache had gone stale during the break.', unread: 'It could not read the cache.' }
