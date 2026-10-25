// The quiet note to Claude when the chat first fills `compact.from` percent. Sent when vaken would compact the session but cannot yet: Claude is mid-task.
import { COMPACT_GAP_MS, FROM_DEFAULT_PCT, MIN_TOKENS_DEFAULT } from './compactauto'

// English by rule: it goes to Claude, not to the person.
export const NUDGE_NOTE = 'Context is {pct}% full. Finish the current step, then end your turn so vaken can compact the session at a good moment. Do not start a new large step first.'

// A stored 30 (an option that no longer exists) maps to the nearest option, 50; anything else not an option reads the default.
export const fromOf = (v: string | undefined): number => (v === '30' ? 50 : v === '50' || v === '60' || v === '70' ? Number(v) : FROM_DEFAULT_PCT)

export type NudgeFacts = { percent?: number; tokens?: number; sinceCompactMs?: number }
// Once per crossing; not for a session under `compact.min` tokens, nor right after a compaction.
export function nudge(f: { mode: string; sent: boolean; from?: number; minTokens?: number; facts: NudgeFacts }): { note?: string; sent: boolean } {
  const from = f.from ?? FROM_DEFAULT_PCT
  const pct = f.facts.percent
  if (pct === undefined || pct < from) return { sent: false }
  if (f.sent) return { sent: true }
  if (f.mode === 'off') return { sent: false }
  if (f.facts.tokens === undefined || f.facts.tokens < (f.minTokens ?? MIN_TOKENS_DEFAULT)) return { sent: false }
  if (f.facts.sinceCompactMs !== undefined && f.facts.sinceCompactMs < COMPACT_GAP_MS) return { sent: false }
  return { note: NUDGE_NOTE.replace('{pct}', String(Math.round(pct))), sent: true }
}
