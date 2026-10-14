// The quiet note to Claude when the chat first fills `compact.from` percent. Sent only when the remaining stops are ones Claude can fix.
import { CACHE_MARGIN_MS, COMPACT_FROM_PCT, score } from './compactscore'
import type { ScoreFacts, Stop } from './compactscore'

// English by rule: it goes to Claude, not to the person.
export const NUDGE_NOTE = 'Context is {pct}% full. Finish the current step, then end your turn so vaken can compact the session at a good moment. Do not start a new large step first.'
const FIXABLE: readonly Stop[] = ['working', 'open']

export const fromOf = (v: string | undefined): number => (v === '50' || v === '70' ? Number(v) : COMPACT_FROM_PCT)

export function nudge(f: { mode: string; sent: boolean; from?: number; facts: ScoreFacts }): { note?: string; sent: boolean } {
  const from = f.from ?? COMPACT_FROM_PCT
  const pct = f.facts.percent
  if (pct === undefined || pct < from) return { sent: false }
  if (f.sent) return { sent: true }
  if (f.mode === 'off') return { sent: false }
  const s = score({ ...f.facts, from })
  if (s.hardStops.some(x => !FIXABLE.includes(x))) return { sent: false }
  if (f.facts.cacheLeftMs !== undefined && f.facts.cacheLeftMs < CACHE_MARGIN_MS) return { sent: false }
  return { note: NUDGE_NOTE.replace('{pct}', String(Math.round(pct))), sent: true }
}
