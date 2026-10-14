// What the prompt cache did for a session, from the usage the engine reports at each answer's end. Counts and times only.
import { CACHE_WARM_MS } from './compactmoment'
import { percentOf } from './words'

type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }

// A turn may make several requests, so these are sums.
export type CacheFacts = {
  read: number
  write: number
  fresh: number
  hit?: number
  at: number
}

export type CompactFact = { at: number; trigger: string; before?: number; after?: number; outTokens?: number }

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)

export function cacheFromUsage(u: Usage | undefined, at: number): CacheFacts | undefined {
  if (u === undefined) return undefined
  const read = n(u.cache_read_input_tokens)
  const write = n(u.cache_creation_input_tokens)
  const fresh = n(u.input_tokens)
  const total = read + write + fresh
  if (total === 0) return undefined
  return { read, write, fresh, hit: percentOf(read / total), at }
}

export const warmLeftMs = (c: CacheFacts, now: number, ttlMs: number = CACHE_WARM_MS): number => Math.max(0, c.at + ttlMs - now)

export function cacheWords(c: CacheFacts, now: number, ttlMs?: number, withHit = false, t: (s: string) => string = s => s): string {
  const left = warmLeftMs(c, now, ttlMs)
  // Steps of five above ten minutes so the pane does not redraw every minute; never "warm 0 min".
  const min = Math.round(left / 60_000)
  const step = min > 10 ? Math.round(min / 5) * 5 : min
  const soon = left > 0 && min < 1
  const hit = !withHit || c.hit === undefined ? undefined : String(c.hit)
  const line =
    hit === undefined
      ? t(left === 0 ? 'Cache lapsed' : soon ? 'Cache warm under 1 min' : 'Cache warm {n} min')
      : t(left === 0 ? 'Cache {hit}% hit · lapsed' : soon ? 'Cache {hit}% hit · warm under 1 min' : 'Cache {hit}% hit · warm {n} min').replace('{hit}', hit)
  return line.replace('{n}', String(step))
}

export const withCompact = (list: CompactFact[] | undefined, c: CompactFact): CompactFact[] => [c, ...(list ?? [])].slice(0, 3)

export const lastAfterTokens = (list: CompactFact[] | undefined): number | undefined => list?.find(c => c.after !== undefined && c.after > 0)?.after
export const lastSummaryOut = (list: CompactFact[] | undefined): number | undefined => list?.find(c => c.outTokens !== undefined && c.outTokens > 0)?.outTokens
