// Local time of the machine, written once: the clock and the "YYYY-MM-DD" day key all blocks share. Never UTC.
import { pad2 } from './words'

// How long a calm "it happened" line stays on a card (a merged pull request, a picture taken), then it goes: calm is quiet.
export const RECENT_SHOW_MS = 24 * 3_600_000

export const hhmm = (at: number): string => {
  const d = new Date(at)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export const hhmmss = (at: number): string => {
  const d = new Date(at)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

// Coarse on purpose: a finer word would make the redraw gate see a change every minute.
export function ageWord(ms: number, t: (s: string) => string = s => s): string {
  const min = Math.floor(Math.max(0, ms) / 60_000)
  if (min < 1) return t('under 1 min')
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return h < 24 ? `${h} h` : `${Math.floor(h / 24)} d`
}

export function ymd(now: number): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
