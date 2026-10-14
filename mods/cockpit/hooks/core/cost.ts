// Live cost and burn. The session total is the engine's own; a turn only has token counts, so its dollars are an estimate from a price table.
import type { Setting } from './settings'
import type { HelpEntry } from './registry'
import { tokenWord } from './appcontext'
import { PRICES_DATE, estimateUsd, moneyEn as money, priceName } from './prices'
import type { Counts } from './prices'
import { partPct } from './words'
import { fmt } from './fmt'
import { tEn } from '../i18n/t'


type Sample = [number, number]

type TurnRec = { at: number; model?: string; sub: boolean; ms: number; input: number; output: number; read: number; write: number; usd?: number }

type Bucket = { turns: number; tokens: Counts; usd: Counts; unpriced: number }

export type CostState = {
  startedAt: number
  main: Bucket
  sub: Bucket
  recent: TurnRec[]
  top: TurnRec[]
  tools: { n: number; long: number }
  samples: Sample[]
  engineUsd?: number
  engineAt?: number
  extra: number
}

const RECENT_MAX = 30
const TOP_MAX = 5
const SAMPLES_MAX = 120
// About 5k tokens.
export const LONG_TOOL_CHARS = 20_000
const BURN_WINDOW_MS = 20 * 60_000
export const BURN_MIN_SPAN_MS = 3 * 60_000

const zero = (): Counts => ({ input: 0, output: 0, read: 0, write: 0 })
const bucket = (): Bucket => ({ turns: 0, tokens: zero(), usd: zero(), unpriced: 0 })

export const emptyState = (now: number): CostState => ({ startedAt: now, main: bucket(), sub: bucket(), recent: [], top: [], tools: { n: 0, long: 0 }, samples: [], extra: 0 })

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)

type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }

export function turnOf(usage: (Usage & { model?: string }) | undefined, at: number, ms: number, sub: boolean): TurnRec | undefined {
  if (usage === undefined) return undefined
  const c: Counts = { input: num(usage.input_tokens), output: num(usage.output_tokens), read: num(usage.cache_read_input_tokens), write: num(usage.cache_creation_input_tokens) }
  if (c.input + c.output + c.read + c.write === 0) return undefined
  const usd = estimateUsd(usage.model, c)
  return { at, ...(usage.model === undefined ? {} : { model: usage.model }), sub, ms: num(ms), ...c, ...(usd === undefined ? {} : { usd }) }
}

const size = (t: TurnRec): number => t.usd ?? (t.input + t.output + t.read + t.write) / 1e9

export function addTurn(s: CostState, t: TurnRec): CostState {
  const b = t.sub ? s.sub : s.main
  b.turns += 1
  for (const k of ['input', 'output', 'read', 'write'] as const) {
    b.tokens[k] += t[k]
    if (t.usd !== undefined) b.usd[k] += estimateUsd(t.model, { ...zero(), [k]: t[k] }) ?? 0
  }
  if (t.usd === undefined) b.unpriced += 1
  s.recent = [...s.recent, t].slice(-RECENT_MAX)
  s.top = [...s.top, t].sort((a, c) => size(c) - size(a)).slice(0, TOP_MAX)
  return s
}

export function addTool(s: CostState, chars: number): void {
  s.tools.n += 1
  if (chars >= LONG_TOOL_CHARS) s.tools.long += 1
}

// A reading that did not move is not kept again unless 30 seconds passed, so the burn still sees time.
export function addSample(s: CostState, at: number, usd: number): void {
  s.engineUsd = usd
  s.engineAt = at
  const last = s.samples.at(-1)
  if (last !== undefined && last[1] === usd && at - last[0] < 30_000) return
  s.samples = [...s.samples, [at, usd] as Sample].slice(-SAMPLES_MAX)
}

const sumUsd = (b: Bucket): number => b.usd.input + b.usd.output + b.usd.read + b.usd.write
export const estimateTotal = (s: CostState): number => sumUsd(s.main) + sumUsd(s.sub)
const turnCount = (s: CostState): number => s.main.turns + s.sub.turns

export function spendOf(s: CostState): { usd: number; source: 'engine' | 'estimate' } {
  return s.engineUsd === undefined ? { usd: estimateTotal(s), source: 'estimate' } : { usd: s.engineUsd, source: 'engine' }
}

export function burnPerHour(samples: Sample[], now: number): number | undefined {
  const w = samples.filter(([t]) => now - t <= BURN_WINDOW_MS)
  const first = w[0]
  const last = w.at(-1)
  if (first === undefined || last === undefined || last[0] - first[0] < BURN_MIN_SPAN_MS) return undefined
  return (Math.max(0, last[1] - first[1]) / (last[0] - first[0])) * 3_600_000
}

export function burnSpanMin(samples: Sample[], now: number): number {
  const w = samples.filter(([t]) => now - t <= BURN_WINDOW_MS)
  const first = w[0]
  const last = w.at(-1)
  return first === undefined || last === undefined ? 0 : Math.max(1, Math.round((last[0] - first[0]) / 60_000))
}

// Anything odd gives a fresh state, never a crash.
export function parseState(raw: unknown, now: number): CostState {
  if (typeof raw !== 'object' || raw === null) return emptyState(now)
  const r = raw as Partial<CostState>
  const b = (x: unknown): Bucket => {
    const o = (typeof x === 'object' && x !== null ? x : {}) as Partial<Bucket>
    const c = (y: unknown): Counts => {
      const p = (typeof y === 'object' && y !== null ? y : {}) as Partial<Counts>
      return { input: num(p.input), output: num(p.output), read: num(p.read), write: num(p.write) }
    }
    return { turns: num(o.turns), tokens: c(o.tokens), usd: c(o.usd), unpriced: num(o.unpriced) }
  }
  const turns = (x: unknown): TurnRec[] => (Array.isArray(x) ? x.filter((t): t is TurnRec => typeof t === 'object' && t !== null && typeof (t as TurnRec).at === 'number') : [])
  const samples = Array.isArray(r.samples) ? r.samples.filter((s): s is Sample => Array.isArray(s) && s.length === 2 && typeof s[0] === 'number' && typeof s[1] === 'number') : []
  return {
    startedAt: typeof r.startedAt === 'number' ? r.startedAt : now,
    main: b(r.main),
    sub: b(r.sub),
    recent: turns(r.recent).slice(-RECENT_MAX),
    top: turns(r.top).slice(0, TOP_MAX),
    tools: { n: num(r.tools?.n), long: num(r.tools?.long) },
    samples: samples.slice(-SAMPLES_MAX),
    ...(typeof r.engineUsd === 'number' ? { engineUsd: r.engineUsd } : {}),
    ...(typeof r.engineAt === 'number' ? { engineAt: r.engineAt } : {}),
    extra: num(r.extra),
  }
}


export const ago = (ms: number): string => fmt.ago(ms, 'hm')

const tokens = (t: TurnRec): string => `${tokenWord(t.input + t.read + t.write)} in (${tokenWord(t.read)} from the cache), ${tokenWord(t.output)} out`

type CostFacts = {
  state: CostState
  now: number
  model?: string
  day?: { usd: number; sessions: number }
  budget: string[]
}

export function costText(f: CostFacts): string {
  const s = f.state
  const lines: string[] = ['Cost (all dollar figures are estimates)']
  if (s.engineUsd !== undefined && s.engineAt !== undefined) lines.push(`This session: ${money(s.engineUsd)} so far. Source: the engine's own total, read ${ago(f.now - s.engineAt)}.`)
  else lines.push(`This session: the engine has not given a total yet.${estimateTotal(s) > 0 ? ` From tokens, about ${money(estimateTotal(s))}.` : ''}`)
  const burn = burnPerHour(s.samples, f.now)
  lines.push(burn === undefined ? 'Burn: not enough readings yet (it needs about 3 minutes of use).' : `Burn: about ${money(burn)} an hour over the last ${burnSpanMin(s.samples, f.now)} min of use (estimate).`)
  const last = s.recent.filter(t => !t.sub).at(-1)
  if (last === undefined) lines.push('Last answer: none counted yet.')
  else lines.push(`Last answer: ${last.usd === undefined ? 'no price known for this model' : `about ${money(last.usd)}`}, ${tokens(last)} (${ago(f.now - last.at)}).`)
  const n = s.main.turns
  const mainUsd = sumUsd(s.main)
  if (n > 0 && s.main.unpriced < n) lines.push(`Average answer: about ${money(mainUsd / (n - s.main.unpriced))} over ${n - s.main.unpriced} answers (estimate).`)
  if (s.sub.turns > 0) lines.push(`Agents: ${s.sub.turns} answers, about ${money(sumUsd(s.sub))} (estimate).`)
  if (f.day !== undefined) lines.push(`Today: ${money(f.day.usd)} over ${tEn('words.session', { n: f.day.sessions })} (the engine totals vaken saw; a session started earlier counts only from today).`)
  lines.push(...f.budget)
  const name = priceName(f.model)
  lines.push('', `Dollars from tokens use the list price of ${name === undefined ? 'the model (no price known for this one)' : name}, table of ${PRICES_DATE}. On a subscription you are not billed per token: the dollars show what the same use would cost at list price.`)
  return lines.join('\n')
}

export function whyText(s: CostState): string {
  const total = estimateTotal(s)
  const turns = turnCount(s)
  if (turns === 0) return 'Nothing counted yet. Ask again after the first reply.'
  const unpriced = s.main.unpriced + s.sub.unpriced
  const tok = (k: keyof Counts): number => s.main.tokens[k] + s.sub.tokens[k]
  const kindUsd = (k: keyof Counts): number => s.main.usd[k] + s.sub.usd[k]
  if (total <= 0) {
    return `Over ${turns} answers the session used ${tokenWord(tok('read'))} tokens read from the cache, ${tokenWord(tok('write'))} written to it, ${tokenWord(tok('input'))} other input and ${tokenWord(tok('output'))} output. No price is known for this model, so there is no dollar figure.`
  }
  const parts: string[] = []
  parts.push(`In ${turns} answers this session cost about ${money(total)} (estimate${unpriced > 0 ? `; ${tEn('words.unpriced_left_out', { n: unpriced })}` : ''}).`)
  const kinds: Array<[keyof Counts, string]> = [['read', 'reading the saved session from the cache'], ['write', 'writing the session to the cache'], ['input', 'new input'], ['output', 'what Claude wrote']]
  const [big, bigWord] = [...kinds].sort((a, b) => kindUsd(b[0]) - kindUsd(a[0]))[0] ?? kinds[0]!
  parts.push(`Most of it, ${partPct(kindUsd(big), total)}%, was ${bigWord}.`)
  parts.push(`Cache reads: ${tokenWord(tok('read'))} tokens, ${partPct(kindUsd('read'), total)}%. Cache writes: ${tokenWord(tok('write'))} tokens, ${partPct(kindUsd('write'), total)}%. Output: ${tokenWord(tok('output'))} tokens, ${partPct(kindUsd('output'), total)}%.`)
  const topUsd = s.top.reduce((n, t) => n + (t.usd ?? 0), 0)
  if (s.top.length > 1 && topUsd > 0) {
    const t0 = s.top[0]!
    parts.push(`The ${s.top.length} biggest answers made ${partPct(topUsd, total)}% of it. The biggest read ${tokenWord(t0.read)} tokens from the cache and wrote ${tokenWord(t0.write)}.`)
  }
  if (s.sub.turns > 0) parts.push(`Agents ran ${tEn('words.answer', { n: s.sub.turns })} and made ${partPct(sumUsd(s.sub), total)}% of the cost.`)
  if (s.tools.long > 0) parts.push(`${s.tools.long} of ${s.tools.n} tool results were long (over ${tokenWord(LONG_TOOL_CHARS)} characters); every later answer re-reads them.`)
  return parts.join(' ')
}


const dollars = (list: number[]): Setting['options'] => list.map(n => ({ value: String(n), label: `$${n}` }))
export const SESSION_BUDGETS = [5, 10, 25, 50, 100]
export const DAY_BUDGETS = [10, 25, 50, 100, 200]

export const COST_SETTINGS: Setting[] = [
  {
    key: 'cost.budget',
    group: 'Cost',
    label: 'Budget',
    note: 'Warn at 80%, or also stop costly calls at 100%.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'warn', label: 'Warn' },
      { value: 'stop', label: 'Stop' },
    ],
    default: 'warn',
  },
  { key: 'cost.session', group: 'Cost', label: 'Session budget', note: 'Dollars per session, as an estimate.', options: dollars(SESSION_BUDGETS), default: '25' },
  { key: 'cost.day', group: 'Cost', label: 'Day budget', note: 'Dollars per day over the sessions vaken saw, as an estimate.', options: dollars(DAY_BUDGETS), default: '50' },
  {
    key: 'cost.why',
    group: 'Cost',
    label: 'Why it cost',
    note: 'Lets vaken write the paragraph on what cost most.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]

export const COST_HELP: HelpEntry[] = [
  { title: 'What do the cost figures mean?', text: 'The session total is the engine\'s own. An answer\'s dollars are an estimate from its tokens and a list price. On a subscription they show what the same use would cost, not what you pay.' },
  { title: 'How do I keep spending down?', text: 'Set a budget per session and per day. At 80% vaken warns you. At 100% in Stop mode it stops costly calls such as agents until you type /vaken-usage budget extend.' },
]
