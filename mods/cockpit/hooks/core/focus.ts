// Focus 50 minutes: holds ordinary toasts and band lines, lets through only what needs you. Shared by every session through one small key.
import { tr } from './lang'
import type { BandItem } from './band'
import { t } from '../i18n/t'

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
export const focusWords = (f: Focus, now: number): string => `Quiet · ${minutesLeft(f, now)} min left`

export const focusMem: { focus?: Focus } = {}

export function focusBand(items: BandItem[], f: Focus | undefined, now: number): BandItem[] {
  if (!isFocused(f, now)) return items
  return [...items.filter(x => x.level === 'urgent'), { id: FOCUS_BAND_ID, level: 'info', text: focusWords(f, now), at: f.from, ttlMs: f.until - f.from }]
}

export const passesFocus = (text: string): boolean => /\bneeds you\b|\bbehöver dig\b/i.test(text)

// Nothing happened: the end on its timer says nothing (calm is quiet); a press still gets this line.
export const focusEmpty = (s: { finished: number; warnings: number }): boolean => s.finished <= 0 && s.warnings <= 0
export function focusSummary(s: { finished: number; warnings: number }): string {
  const parts = [...(s.finished > 0 ? [t('toast.n_sessions_finished', { n: s.finished })] : []), ...(s.warnings > 0 ? [t('words.warning', { n: s.warnings })] : [])]
  return parts.length === 0 ? tr('Quiet ended. Nothing happened while it was quiet.') : `${tr('While it was quiet:')} ${parts.join(', ')}.`
}
