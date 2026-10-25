// Live cost and burn. The session total is the engine's own; a turn only has token counts, so its dollars are an estimate from a price table.
import type { Setting } from './settings'
import type { HelpEntry } from './registry'
import { tokenWord } from './appcontext'
import { PRICES_DATE, estimateUsd, money, priceName } from './prices'
import type { Counts } from './prices'
import { partPct } from './words'
import { fmt } from './fmt'
import { BIG_LINES, NEVER_CUT } from './lean'
import { langNow, t as tNow, tr } from '../i18n/t'
import { fillIn } from './fillin'


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
  // Where it went: the characters each kind of tool result brought into the main session (sizes only, never text)
  sizes: Sizes
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

export type Sizes = { read: number; shell: number; other: number; bigReads: number }
const noSizes = (): Sizes => ({ read: 0, shell: 0, other: 0, bigReads: 0 })

export const emptyState = (now: number): CostState => ({ startedAt: now, main: bucket(), sub: bucket(), recent: [], top: [], tools: { n: 0, long: 0 }, sizes: noSizes(), samples: [], extra: 0 })

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

// `kind`: the tool's kind for Where it went (sizeKindOf); an agent's own steps and the agent tool's answer are left out of it (agents count by their turns)
// `bigRead`: the read is one that Lean would cut (leanCutsRead); only that counts as a big read, so the fix offered is one that would help
export function addTool(s: CostState, chars: number, kind?: SizeKind, bigRead = false): void {
  s.tools.n += 1
  if (chars >= LONG_TOOL_CHARS) s.tools.long += 1
  if (kind === undefined) return
  s.sizes[kind] += chars
  if (kind === 'read' && bigRead) s.sizes.bigReads += 1
}

// A file read that Lean's All long output would cut: more lines than its limit, and not a read of an exact part (core/lean.ts NEVER_CUT). Reads only the line count.
export const leanCutsRead = (tool: string, input: Record<string, unknown>, text: string): boolean => READ_TOOLS.has(tool) && !NEVER_CUT.read(tool, input) && text.split('\n').length > BIG_LINES

export type SizeKind = 'read' | 'shell' | 'other'
const READ_TOOLS: ReadonlySet<string> = new Set(['Read', 'NotebookRead'])
const AGENT_TOOLS: ReadonlySet<string> = new Set(['Agent', 'Task'])
export const sizeKindOf = (tool: string, shell: boolean): SizeKind | undefined => (READ_TOOLS.has(tool) ? 'read' : shell ? 'shell' : AGENT_TOOLS.has(tool) ? undefined : 'other')

// ---- Where it went (Plan limits): this session's spend by cause, an estimate from sizes and token counts only ----
export type WhereCause = 'reads' | 'output' | 'agents' | 'turns'
export type WhereWent = { top: WhereCause; pct: number; clear: boolean; parts: Record<WhereCause, number>; bigReads: number }
// A guess to tune: under this, too little is known to say where it went.
export const WHERE_MIN_TURNS = 3
export const WHERE_MIN_TOKENS = 20_000
// One cause is clearly the biggest: at least this share, and this many times the next one.
export const WHERE_CLEAR_PCT = 40
export const WHERE_CLEAR_TIMES = 2
// About 4 characters a token.
const CHARS_PER_TOKEN = 4
// The list price of each token kind against plain input, the same for every model: a cache write 1.25, an answer 5, a cache read 0.1.
const WEIGHT: Counts = { input: 1, write: 1.25, output: 5, read: 0.1 }
const weightOf = (b: Bucket): number => b.tokens.input * WEIGHT.input + b.tokens.write * WEIGHT.write + b.tokens.output * WEIGHT.output + b.tokens.read * WEIGHT.read

export function whereOf(s: CostState): WhereWent | undefined {
  const brought = s.main.tokens.input + s.main.tokens.write
  if (s.main.turns < WHERE_MIN_TURNS || brought + s.sub.tokens.input + s.sub.tokens.write < WHERE_MIN_TOKENS) return undefined
  const main = weightOf(s.main)
  const sub = weightOf(s.sub)
  const total = main + sub
  if (total <= 0) return undefined
  // What the tool results brought into the main session, as a part of all it brought; never more than all of it
  const reads = s.sizes.read / CHARS_PER_TOKEN
  const output = (s.sizes.shell + s.sizes.other) / CHARS_PER_TOKEN
  const scale = brought <= 0 ? 0 : Math.min(1, brought / Math.max(1, reads + output))
  const fr = brought <= 0 ? 0 : (reads * scale) / brought
  const fo = brought <= 0 ? 0 : (output * scale) / brought
  const pct = (w: number): number => (w / total) * 100
  const parts: Record<WhereCause, number> = { reads: pct(main * fr), output: pct(main * fo), agents: pct(sub), turns: pct(main * Math.max(0, 1 - fr - fo)) }
  const ranked = (Object.keys(parts) as WhereCause[]).sort((a, b) => parts[b] - parts[a])
  const top = ranked[0] ?? 'turns'
  const second = parts[ranked[1] ?? 'turns']
  const clear = parts[top] >= WHERE_CLEAR_PCT && parts[top] >= WHERE_CLEAR_TIMES * second
  return { top, pct: parts[top], clear, parts, bigReads: s.sizes.bigReads }
}

// The one fix that fits the biggest cause, only when it clearly is the biggest: long output is cut (Lean: All long output), or once it already is, compacted
export type WhereFix = 'lean' | 'compact' | 'agents'
export function whereFixOf(w: WhereWent, leanAll: boolean): WhereFix | undefined {
  if (!w.clear) return undefined
  if (w.top === 'agents') return 'agents'
  if (w.top === 'turns') return 'compact'
  // Reads lead but none is one Lean would cut (ranged, or short lines): Lean would change nothing, so the fix is a compact
  if (leanAll || (w.top === 'reads' && w.bigReads <= 0)) return 'compact'
  return 'lean'
}
export const WHERE_LABEL = 'Where it went (estimate)'
export const WHERE_CAUSE: Record<WhereCause, string> = { reads: 'file reads', output: 'tool output', agents: 'agents', turns: 'plain turns' }
export const WHERE_MEANS = "Where this session's spend went, an estimate from sizes and token counts only: file reads {reads}, tool output {output}, agents {agents}, plain turns {turns}."
export const WHERE_BIG_READS = 'Big file reads: {n}.'
export const WHERE_FIX: Record<WhereFix, string> = { lean: 'Turn on Lean: All long output', compact: 'Compact now', agents: 'Ask Claude to use fewer agents' }
export const WHERE_NEXT: Record<WhereFix, string> = {
  lean: 'Turn on Lean: All long output sets Lean session to All long output, so huge reads and tool answers are cut to their first and last lines from now on. Change it back in Settings.',
  compact: 'Compact now shortens this session after the usual checks, so each later answer re-reads less.',
  agents: 'Ask Claude to use fewer agents sends one request: at most one agent at a time for the rest of this task.',
}
export const WHERE_LEAN_SAID = 'Lean session is now All long output.'
export const WHERE_LEAN_FAILED = 'Could not change Lean session. Change it in Settings.'
export const WHERE_AGENTS_SAID = 'Asked Claude to use fewer agents.'
export const WHERE_WORDS: string[] = [WHERE_LABEL, ...Object.values(WHERE_CAUSE), WHERE_MEANS, WHERE_BIG_READS, ...Object.values(WHERE_FIX), ...Object.values(WHERE_NEXT), WHERE_LEAN_SAID, WHERE_LEAN_FAILED, WHERE_AGENTS_SAID]
// Sent to Claude as the person's own message, so English by rule.
export const FEWER_AGENTS_PROMPT = 'For the rest of this task, use at most one agent at a time, and only for work that needs one. Do the rest yourself in this session.' // en-only: a prompt sent to Claude as the person

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
    sizes: { read: num(r.sizes?.read), shell: num(r.sizes?.shell), other: num(r.sizes?.other), bigReads: num(r.sizes?.bigReads) },
    samples: samples.slice(-SAMPLES_MAX),
    ...(typeof r.engineUsd === 'number' ? { engineUsd: r.engineUsd } : {}),
    ...(typeof r.engineAt === 'number' ? { engineAt: r.engineAt } : {}),
    extra: num(r.extra),
  }
}


export const ago = (ms: number): string => fmt.ago(ms, 'hm', langNow())

const tokens = (t: TurnRec): string => fillIn(tr('{in} in ({read} from the cache), {out} out'), { in: tokenWord(t.input + t.read + t.write), read: tokenWord(t.read), out: tokenWord(t.output) })

type CostFacts = {
  state: CostState
  now: number
  model?: string
  day?: { usd: number; sessions: number }
  budget: string[]
}

export function costText(f: CostFacts): string {
  const s = f.state
  const lines: string[] = [tr('Cost (all dollar figures are estimates)')]
  if (s.engineUsd !== undefined && s.engineAt !== undefined) lines.push(fillIn(tr("This session: {usd} so far. Source: the engine's own total, read {ago}."), { usd: money(s.engineUsd), ago: ago(f.now - s.engineAt) }))
  else lines.push(`${tr('This session: the engine has not given a total yet.')}${estimateTotal(s) > 0 ? ` ${fillIn(tr('From tokens, about {usd}.'), { usd: money(estimateTotal(s)) })}` : ''}`)
  const burn = burnPerHour(s.samples, f.now)
  lines.push(burn === undefined ? tr('Burn: not enough readings yet (it needs about 3 minutes of use).') : fillIn(tr('Burn: about {usd} an hour over the last {min} min of use (estimate).'), { usd: money(burn), min: burnSpanMin(s.samples, f.now) }))
  const last = s.recent.filter(t => !t.sub).at(-1)
  if (last === undefined) lines.push(tr('Last answer: none counted yet.'))
  else lines.push(fillIn(tr('Last answer: {price}, {tokens} ({ago}).'), { price: last.usd === undefined ? tr('no price known for this model') : tNow('fmt.about_usd', { usd: money(last.usd) }), tokens: tokens(last), ago: ago(f.now - last.at) }))
  const n = s.main.turns
  const mainUsd = sumUsd(s.main)
  if (n > 0 && s.main.unpriced < n) lines.push(fillIn(tr('Average answer: about {usd} over {n} answers (estimate).'), { usd: money(mainUsd / (n - s.main.unpriced)), n: n - s.main.unpriced }))
  if (s.sub.turns > 0) lines.push(fillIn(tr('Agents: {n} answers, about {usd} (estimate).'), { n: s.sub.turns, usd: money(sumUsd(s.sub)) }))
  if (f.day !== undefined) lines.push(fillIn(tr('Today: {usd} over {sessions} (the engine totals vaken saw; a session started earlier counts only from today).'), { usd: money(f.day.usd), sessions: tNow('words.session', { n: f.day.sessions }) }))
  lines.push(...f.budget)
  const name = priceName(f.model)
  lines.push('', fillIn(tr('Dollars from tokens use the list price of {name}, table of {date}. On a subscription you are not billed per token: the dollars show what the same use would cost at list price.'), { name: name === undefined ? tr('the model (no price known for this one)') : name, date: PRICES_DATE }))
  return lines.join('\n')
}

export function whyText(s: CostState): string {
  const total = estimateTotal(s)
  const turns = turnCount(s)
  if (turns === 0) return tr('Nothing counted yet. Ask again after the first reply.')
  const unpriced = s.main.unpriced + s.sub.unpriced
  const tok = (k: keyof Counts): number => s.main.tokens[k] + s.sub.tokens[k]
  const kindUsd = (k: keyof Counts): number => s.main.usd[k] + s.sub.usd[k]
  if (total <= 0) {
    return fillIn(tr('Over {turns} answers the session used {read} tokens read from the cache, {write} written to it, {input} other input and {output} output. No price is known for this model, so there is no dollar figure.'), { turns, read: tokenWord(tok('read')), write: tokenWord(tok('write')), input: tokenWord(tok('input')), output: tokenWord(tok('output')) })
  }
  const parts: string[] = []
  parts.push(fillIn(tr('In {turns} answers this session cost about {usd} (estimate{unpriced}).'), { turns, usd: money(total), unpriced: unpriced > 0 ? `; ${tNow('words.unpriced_left_out', { n: unpriced })}` : '' }))
  const kinds: Array<[keyof Counts, string]> = [['read', tr('reading the saved session from the cache')], ['write', tr('writing the session to the cache')], ['input', tr('new input')], ['output', tr('what Claude wrote')]]
  const [big, bigWord] = [...kinds].sort((a, b) => kindUsd(b[0]) - kindUsd(a[0]))[0] ?? kinds[0]!
  const share = (k: keyof Counts): string => fmt.percent(partPct(kindUsd(k), total))
  parts.push(fillIn(tr('Most of it, {pct}, was {what}.'), { pct: share(big), what: bigWord }))
  parts.push(fillIn(tr('Cache reads: {read} tokens, {rp}. Cache writes: {write} tokens, {wp}. Output: {out} tokens, {op}.'), { read: tokenWord(tok('read')), rp: share('read'), write: tokenWord(tok('write')), wp: share('write'), out: tokenWord(tok('output')), op: share('output') }))
  const topUsd = s.top.reduce((n, t) => n + (t.usd ?? 0), 0)
  if (s.top.length > 1 && topUsd > 0) {
    const t0 = s.top[0]!
    parts.push(fillIn(tr('The {n} biggest answers made {pct} of it. The biggest read {read} tokens from the cache and wrote {write}.'), { n: s.top.length, pct: fmt.percent(partPct(topUsd, total)), read: tokenWord(t0.read), write: tokenWord(t0.write) }))
  }
  if (s.sub.turns > 0) parts.push(fillIn(tr('Agents ran {answers} and made {pct} of the cost.'), { answers: tNow('words.answer', { n: s.sub.turns }), pct: fmt.percent(partPct(sumUsd(s.sub), total)) }))
  if (s.tools.long > 0) parts.push(fillIn(tr('{long} of {n} tool results were long (over {chars} characters); every later answer re-reads them.'), { long: s.tools.long, n: s.tools.n, chars: tokenWord(LONG_TOOL_CHARS) }))
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
    default: 'off',
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
  { title: 'How do I keep spending down?', text: 'The budget is off until you turn it on in Settings, Money and plan, with an amount per session and per day. At 80% vaken warns you. At 100% in Stop mode it stops costly calls such as agents until you type /vaken-usage budget extend.' },
]
