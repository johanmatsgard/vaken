// The cost hint before a big job: about how much of the 5-hour window a task run or a big message may use, from vaken's own history of past turns. No model call; only numbers are kept.

export const HINT_KEY = 'cockpit:costhint'
export const HINT_BAND_ID = 'costhint'
export const HINT_TTL_MS = 10 * 60_000
export const HINT_GAP_MS = 10 * 60_000
export const HINT_MIN_SAMPLES = 5
export const HINT_KEEP = 40
export const BIG_WORDS = 120
// Below this a turn's cost says nothing about the window.
const MIN_TURN_USD = 0.01
export const HINT_TEXT = 'This may use about {n}% of your 5-hour window.'

// One past turn: its cost at list price, the 5-hour window points it used, and whether its message was a big job.
export type HintSample = { usd: number; pct: number; big: boolean }
export type Reading = { usd: number; pct: number; resetsAt: string }

const isSample = (v: unknown): v is HintSample => {
  const o = v as HintSample
  return typeof o === 'object' && o !== null && Number.isFinite(o.usd) && o.usd > 0 && Number.isFinite(o.pct) && o.pct >= 0 && typeof o.big === 'boolean'
}
export const parseSamples = (raw: unknown): HintSample[] => (Array.isArray(raw) ? raw.filter(isSample).slice(-HINT_KEEP) : [])

// A sample only inside one window: a reset between the two readings would make the points meaningless.
export function sampleOf(before: Reading | undefined, after: Reading | undefined, big: boolean): HintSample | undefined {
  if (before === undefined || after === undefined || before.resetsAt !== after.resetsAt) return undefined
  const usd = after.usd - before.usd
  const pct = after.pct - before.pct
  if (!(usd >= MIN_TURN_USD) || pct < 0) return undefined
  return { usd, pct, big }
}

export const addSample = (list: HintSample[], s: HintSample): HintSample[] => [...list, s].slice(-HINT_KEEP)

const words = (text: string): number => text.split(/\s+/).filter(w => w !== '').length
const BIG_START = /^\s*(?:please\s+)?(?:build|implement|refactor|rewrite|migrate|create|add|make|write|port|redesign|design|set\s+up|convert|replace|update\s+all|fix\s+all|move|split|bygg|skapa|skriv|lägg\s+till|gör)\b/i
// A long message that starts a big piece of work, not a long question.
export const isBigJob = (text: string): boolean => words(text) > BIG_WORDS && BIG_START.test(text)

// Points per dollar from every kept turn, for a run whose cost the runner estimates.
export function runPercent(samples: readonly HintSample[], usd: number): number | undefined {
  if (samples.length < HINT_MIN_SAMPLES || !(usd > 0)) return undefined
  const spent = samples.reduce((s, x) => s + x.usd, 0)
  const used = samples.reduce((s, x) => s + x.pct, 0)
  return spent > 0 ? (used / spent) * usd : undefined
}

// The average of the past big jobs, for a big message.
export function bigPercent(samples: readonly HintSample[]): number | undefined {
  const big = samples.filter(s => s.big)
  if (big.length < HINT_MIN_SAMPLES) return undefined
  return big.reduce((s, x) => s + x.pct, 0) / big.length
}

// Under one point is not worth a line.
export function hintLine(pct: number | undefined, t: (s: string) => string = s => s): string | undefined {
  if (pct === undefined || !(pct >= 1)) return undefined
  return t(HINT_TEXT).replace('{n}', String(Math.min(100, Math.round(pct))))
}

export const hintDue = (lastAt: number | undefined, now: number): boolean => lastAt === undefined || now - lastAt >= HINT_GAP_MS
