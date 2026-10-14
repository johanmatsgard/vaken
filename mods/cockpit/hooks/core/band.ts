// The band arbiter: decides what shows in the band above the prompt. Pure functions plus two store helpers.
import type { Io } from './io'
import type { Vars } from '../i18n/types'
import { KEYED_VALUE_MAX, keyedOf, keyedOk, tEn } from '../i18n/t'

type BandLevel = 'urgent' | 'warn' | 'info'
// `key` and `vars` let the pane say a line in its language; an item without them is said from its English `text`.
export type BandItem = { id: string; level: BandLevel; text: string; at: number; ttlMs: number; key?: string; vars?: Vars }

export const bandKey = (sessionId: string): string => `cockpit:band:${sessionId}`
const BAND_TTL_MS: Record<BandLevel, number> = { urgent: 30 * 60_000, warn: 10 * 60_000, info: 2 * 60_000 }
export const BAND_KEEP = 8
const BAND_SHOW = 2
const RANK: Record<BandLevel, number> = { urgent: 0, warn: 1, info: 2 }
const MARK: Record<BandLevel, string> = { urgent: '◆', warn: '▲', info: '·' }
export const markOf = (x: BandItem): string => (x.level === 'info' && x.id.startsWith('did:') ? '✓' : MARK[x.level])

// The pane cuts the line by real width, so stored text is cut only by this large cap.
export const BAND_MAX_CHARS = KEYED_VALUE_MAX
export const BAND_SHORT_CHARS = 60
export function shortText(text: string, max = BAND_MAX_CHARS): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const at = cut.lastIndexOf(' ')
  return `${(at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s.,;:·-]+$/, '')}…`
}

type BandTop = { mark: string; text: string; level: BandLevel; more: number; key?: string; vars?: Vars }
export function topLine(needs: number, items: BandItem[], now: number): BandTop | undefined {
  const { shown, more } = arbitrate(items, now, BAND_KEEP)
  const lines = [...(needs > 0 ? [{ mark: '◆', text: `${tEn('words.session_needs', { n: needs })} you`, level: 'urgent' as BandLevel }] : []), ...shown.map(x => ({ mark: markOf(x), text: x.text, level: x.level, ...(x.key === undefined ? {} : { key: x.key }), ...(x.vars === undefined ? {} : { vars: x.vars }) }))]
  if (lines.length === 0) return undefined
  return { ...lines[0], more: lines.length - 1 + more }
}

const isItem = (v: unknown): v is BandItem => {
  const o = v as BandItem
  return typeof o === 'object' && o !== null && typeof o.id === 'string' && (o.level === 'urgent' || o.level === 'warn' || o.level === 'info') && typeof o.text === 'string' && typeof o.at === 'number' && typeof o.ttlMs === 'number'
}
const withoutBadKey = (x: BandItem): BandItem => {
  if ((x.key === undefined && x.vars === undefined) || keyedOk(x.key, x.vars)) return x
  const { id, level, text, at, ttlMs } = x
  return { id, level, text, at, ttlMs }
}
export const parseItems = (raw: unknown): BandItem[] => (Array.isArray(raw) ? raw.filter(isItem).map(withoutBadKey) : [])

export const liveItems = (items: BandItem[], now: number): BandItem[] => items.filter(x => now - x.at < x.ttlMs)

export function withItem(items: BandItem[], item: BandItem, now: number): BandItem[] {
  return [item, ...liveItems(items, now).filter(x => x.id !== item.id)].slice(0, BAND_KEEP)
}

export function arbitrate(items: BandItem[], now: number, max = BAND_SHOW): { shown: BandItem[]; more: number } {
  const live = liveItems(items, now).sort((a, b) => RANK[a.level] - RANK[b.level] || b.at - a.at)
  const strong = live.filter(x => x.level !== 'info')
  const pool = strong.length > 0 ? strong : live
  const shown = pool.slice(0, max)
  return { shown, more: live.length - shown.length }
}

export function bandWords(items: BandItem[], now: number, max = BAND_SHOW): string {
  const { shown, more } = arbitrate(items, now, max)
  if (shown.length === 0) return ''
  return `${shown.map(x => `${markOf(x)} ${x.text}`).join(' · ')}${more > 0 ? ` +${more} more` : ''}`
}

// `post` never throws: a missed band line must not break the block that posted it.
export async function readBand(i: Io, sessionId?: string): Promise<BandItem[]> {
  try {
    return parseItems(await i.get(bandKey(sessionId ?? (await i.sessionId()))))
  } catch {
    return []
  }
}
export async function postBand(i: Io, level: BandLevel, id: string, text: string, ttlMs?: number, sessionId?: string): Promise<void> {
  try {
    const sid = sessionId ?? (await i.sessionId())
    const now = await i.now()
    const short = shortText(text)
    // Cut lines drop their row and facts, or the row would say more than the line.
    const keyed = short === text ? keyedOf(text) : undefined
    const made = keyed !== undefined && keyedOk(keyed.key, keyed.vars) ? keyed : undefined
    await i.set(bandKey(sid), withItem(parseItems(await i.get(bandKey(sid))), { id, level, text: short, at: now, ttlMs: ttlMs ?? BAND_TTL_MS[level], ...(made ?? {}) }, now))
    i.invalidate()
  } catch {
    // a missed band line only leaves the band as it was
  }
}
export async function clearBand(i: Io, id: string, sessionId?: string): Promise<void> {
  try {
    const sid = sessionId ?? (await i.sessionId())
    const old = parseItems(await i.get(bandKey(sid)))
    if (old.some(x => x.id === id)) await i.set(bandKey(sid), old.filter(x => x.id !== id))
  } catch {
    // nothing to clear
  }
}
