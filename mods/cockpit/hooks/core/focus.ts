// Focus 50 minutes: holds ordinary toasts and band lines, lets through only what needs you. Shared by every session through one small key.
import { tr } from './lang'
import type { BandItem } from './band'
import { tEn } from '../i18n/t'

export const FOCUS_KEY = 'cockpit:focus'
export const FOCUS_MS = 50 * 60_000
export const FOCUS_BAND_ID = 'focus'
// The band and pane read the copy in memory, so a draw costs no read.
export const FOCUS_POLL_MS = 30_000

export type Focus = { from: number; until: number }

export function parseFocus(raw: unknown): Focus | undefined {
  const o = raw as Focus
  if (typeof o !== 'object' || o === null || typeof o.from !== 'number' || typeof o.until !== 'number' || !(o.until > o.from)) return undefined
  return { from: o.from, until: o.until }
}
export const isFocused = (f: Focus | undefined, now: number): f is Focus => f !== undefined && now >= f.from && now < f.until
export const minutesLeft = (f: Focus, now: number): number => Math.max(1, Math.ceil((f.until - now) / 60_000))
export const focusWords = (f: Focus, now: number): string => `Notices paused · ${minutesLeft(f, now)} min left`

export const focusMem: { focus?: Focus } = {}

export function focusBand(items: BandItem[], f: Focus | undefined, now: number): BandItem[] {
  if (!isFocused(f, now)) return items
  return [...items.filter(x => x.level === 'urgent'), { id: FOCUS_BAND_ID, level: 'info', text: focusWords(f, now), at: f.from, ttlMs: f.until - f.from }]
}

export const passesFocus = (text: string): boolean => /\bneeds you\b|\bbehöver dig\b/i.test(text)

export function focusSummary(s: { finished: number; warnings: number }): string {
  const parts = [...(s.finished > 0 ? [`${tEn('words.session', { n: s.finished })} finished`] : []), ...(s.warnings > 0 ? [`${tEn('words.warning', { n: s.warnings })}`] : [])]
  return parts.length === 0 ? tr('Focus ended. Nothing happened while you focused.') : `${tr('While you focused:')} ${parts.join(', ')}.`
}
