// When is a good moment to compact? Advice only. A cost model in units of the base input price: cache read 0.1, cache write w (1.25 or 2), output about 5.

// Assumed until a compaction shows real numbers: the window after one (measured 10k) and the summary size (measured 712).
import { BRIEF_LINE, becauseWords } from './compactwords'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import { hideSecrets } from './guardcmds'
import { MIN_TOKENS, score, suggests, workState } from './compactscore'
import type { Score, WorkState } from './compactscore'
import type { ProofState } from './proof'
import { tEn } from '../i18n/t'

export { MIN_TOKENS, workState }
export type { WorkState }

export const DEFAULT_AFTER_TOKENS = 15_000
export const DEFAULT_SUMMARY_OUT = 5_000
// The engine compacts at 97 percent, not 95.
export const ENGINE_COMPACT_AT = 97
const NEAR_COMPACT = 10
const AWAY_MS = 10 * 60_000
export const CACHE_TTL_SUBSCRIPTION_MS = 60 * 60_000
export const CACHE_TTL_CREDITS_MS = 5 * 60_000
// Short time when unknown, so a lapsed cache is never called warm.
export const CACHE_WARM_MS = CACHE_TTL_CREDITS_MS
// The one cache time used for an unknown plan, by Auto compaction and the cache keeper alike.
export const ttlOrGuess = (known: number | undefined): number => known ?? CACHE_WARM_MS

// `plain`: the first line without its "Compact now.", for where the Compact now button stands right under it (This session)
export type Moment = { level: 'none' | 'good' | 'soon' | 'now'; lines: string[]; why?: string; plain?: string }

export type Extra = { from?: number; proof?: ProofState; waits?: boolean; helpers?: number; background?: number; guardHeld?: boolean; saved?: boolean; sinceCompactMs?: number; cacheLeftMs?: number }
export type Facts = { extra?: Extra; percent?: number; tokens?: number; compactAt?: number; atBreak: boolean; quietMs: number; ttlMs?: number; afterTokens?: number; summaryOut?: number }

export function scoreOf(f: Facts & { working?: boolean }): Score {
  const x = f.extra ?? {}
  const left = x.cacheLeftMs ?? (f.ttlMs ?? CACHE_WARM_MS) - f.quietMs
  const payback = f.tokens === undefined ? undefined : paybackTurns({ tokens: f.tokens, after: f.afterTokens ?? DEFAULT_AFTER_TOKENS, out: f.summaryOut ?? DEFAULT_SUMMARY_OUT, warm: left > 0, ttlMs: f.ttlMs })
  return score({ working: f.working ?? !f.atBreak, waits: x.waits ?? false, helpers: x.helpers ?? 0, background: x.background ?? 0, guardHeld: x.guardHeld ?? false, ...(x.sinceCompactMs === undefined ? {} : { sinceCompactMs: x.sinceCompactMs }), ...(f.tokens === undefined ? {} : { tokens: f.tokens }), ...(f.percent === undefined ? {} : { percent: f.percent }), ...(x.from === undefined ? {} : { from: x.from }), ...(x.proof === undefined ? {} : { proof: x.proof }), saved: x.saved ?? false, quietMs: f.quietMs, cacheLeftMs: left, ...(payback === undefined ? {} : { payback }) })
}

const k = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))

const writeCost = (ttlMs: number | undefined): number => ((ttlMs ?? CACHE_WARM_MS) > CACHE_TTL_CREDITS_MS ? 2 : 1.25)

export function paybackTurns(p: { tokens: number; after: number; out: number; warm: boolean; ttlMs?: number }): number | undefined {
  const { tokens: n, after: a, out: o } = p
  if (n <= a * 1.1) return undefined
  const w = writeCost(p.ttlMs)
  const perTurn = 0.1 * (n - a)
  if (p.warm) return (0.1 * n + (5 + w) * o) / perTurn
  const first = (w - 1) * n - 5 * o - w * a
  return first >= 0 ? 0 : -first / perTurn
}

export const paysBeforeGap = (tokens: number, after: number, out: number, ttlMs?: number): boolean => writeCost(ttlMs) * tokens > 0.1 * tokens + 5 * out + writeCost(ttlMs) * after

const turnsWord = (n: number, t: Tr = same): string => (n <= 0 ? t('at once') : fillIn(t(Math.ceil(n) === 1 ? 'after about {n} more answer' : 'after about {n} more answers'), { n: Math.ceil(n) }))

export function compactMoment(f: Facts, t: Tr = same): Moment {
  const { percent, atBreak } = f
  if (percent === undefined) return { level: 'none', lines: [] }
  const compactAt = f.compactAt ?? ENGINE_COMPACT_AT
  if (percent >= compactAt) return { level: 'now', lines: [t('Claude compacts the session by itself now. Compact now.'), t('It keeps your goal, the files changed and the next steps.')], plain: t('Claude compacts the session by itself now.') }
  if (percent >= compactAt - NEAR_COMPACT) {
    return atBreak
      ? { level: 'soon', lines: [t('Claude compacts the session by itself soon. Compact now.'), t('A quiet moment is better than mid-task.')], plain: t('Claude compacts the session by itself soon.') }
      : { level: 'soon', lines: [t('Claude compacts the session by itself soon.'), t('Compact it at the next quiet moment.')] }
  }
  if (!atBreak) return { level: 'none', lines: [] }
  const s = scoreOf(f)
  if (!suggests(s)) return { level: 'none', lines: [] }
  const m = goodMoment(f, t)
  return { ...m, why: `${m.why ?? ''} ${becauseWords(s.reasons, t, false)}.`.trim() }
}

function goodMoment(f: Facts, t: Tr): Moment {
  const { tokens, quietMs } = f
  const cacheLeft = f.extra?.cacheLeftMs ?? (f.ttlMs ?? CACHE_WARM_MS) - quietMs
  const warm = cacheLeft > 0
  const title = t('This session is long. Compacting it saves usage.')
  if (tokens === undefined) {
    return { level: 'good', lines: [t('This session is getting long. Compacting it saves usage.'), t('Claude re-reads the whole session every answer.')], why: t(warm ? 'Estimate: the cache is warm, so compacting reads the whole window cheaply.' : 'Estimate: the cache has lapsed, so compacting makes every answer after the next one lighter.') }
  }
  const after = f.afterTokens ?? DEFAULT_AFTER_TOKENS
  const out = f.summaryOut ?? DEFAULT_SUMMARY_OUT
  const size = fillIn(t('about {n} tokens'), { n: k(tokens) })
  if (warm && quietMs >= AWAY_MS && paysBeforeGap(tokens, after, out, f.ttlMs)) {
    const left = Math.max(1, Math.round(cacheLeft / 60_000))
    return { level: 'good', lines: [t('You are away. Compact now, while it is cheap.'), fillIn(t('The cache runs out in about {m} min. Then re-reading {n} tokens costs full price.'), { m: left, n: k(tokens) })], why: fillIn(t('Estimate: compacting now reads {size} cheaply. Waiting means rewriting all of it at full price when you return.'), { size }) }
  }
  const turns = paybackTurns({ tokens, after, out, warm, ttlMs: f.ttlMs })
  const pays = turns === undefined ? '' : `${fillIn(t('pays back {when}.'), { when: turnsWord(turns, t) })} `
  return warm
    ? { level: 'good', lines: [title, fillIn(t(f.afterTokens === undefined ? 'Claude re-reads {n} tokens every answer. A summary usually cuts that to about {a}.' : 'Claude re-reads {n} tokens every answer. A summary cuts that to about {a}.'), { n: k(tokens), a: k(after) })], why: fillIn(t('Estimate: {pays}The cache is warm, so compacting reads {size} cheaply.'), { pays, size }) }
    : { level: 'good', lines: [title, fillIn(t(f.afterTokens === undefined ? 'The next answer re-reads {n} tokens at full price. A summary: usually about {a}.' : 'The next answer re-reads {n} tokens at full price. A summary: about {a}.'), { n: k(tokens), a: k(after) })], why: fillIn(t('Estimate: {pays}The cache has lapsed, so compacting writes a short summary instead of {size}.'), { pays, size }) }
}

export const KEEP_WORDS_MAX = 120
export const keepWords = (t: string): string => hideSecrets(t.replace(/\s+/g, ' ').trim()).slice(0, KEEP_WORDS_MAX)

export function cardText(p: { title?: string; branch?: string }): string {
  const goal = p.title === undefined || p.title === '' ? 'the current goal' : `the goal "${keepWords(p.title)}"`
  const where = p.branch === undefined || p.branch === '' ? '' : ` on branch ${keepWords(p.branch)}`
  return `Keep ${goal}${where}, the files changed, decisions made and why, and the next steps.`
}

export const compactLine = (p: { title?: string; branch?: string }): string => `/compact ${cardText(p)}`

export const withKeepList = (instructions: string | undefined, keep: string): string => (instructions === undefined || instructions === '' ? keep : instructions.includes(keep) ? instructions : `${instructions}\n${keep}`)

// Sent to Claude, so English (the row's Swedish is for reading only): with helpers still running, the summary must name each one
export const HELPERS_LINE = (): string => tEn('cardcompact.keep_helpers')
// Every compaction vaken starts: the keep-list (when on), what Claude's summary must hold (always), the helpers still running (when any), the handoff note's place
export const compactInstructions = (keep: string | undefined, briefWhere: string, helpers = false): string => [...(keep === undefined ? [] : [keep]), tEn('cardcompact.keep_summary'), ...(helpers ? [HELPERS_LINE()] : []), BRIEF_LINE.replace('{where}', briefWhere)].join('\n')

export function openLines(open: { failed?: string; held?: string }): string[] {
  return [
    ...(open.failed === undefined || open.failed === '' ? [] : [open.failed]),
    ...(open.held === undefined || open.held === '' ? [] : [`Keep the step the safety check stopped, still waiting for the person's yes: ${keepWords(open.held)}.`]),
  ]
}
