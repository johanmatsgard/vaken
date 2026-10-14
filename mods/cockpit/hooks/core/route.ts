// Routing: sends a lookup helper to a cheaper model at spawn, in Auto. A mod cannot switch the main thread's model, so it is only watched for a switch that would throw away a warm cache. The store holds counts and averages, never a prompt.
import { tr } from './lang'
import { langNow } from '../i18n/t'
import { under } from './platform'
import { tokenWord } from './appcontext'
import { rankOf } from './models'
import { FIT_HELP, FIT_SETTINGS } from './modelfit'
import type { Family } from './models'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { fmt } from './fmt'

export const ROUTE_SETTINGS: Setting[] = [
  {
    key: 'route.mode',
    group: 'Model choice',
    label: 'Agent models',
    note: 'Off, tell you, or send lookup agents to the Researcher’s model.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'suggest', label: 'Suggest' },
      { value: 'auto', label: 'Auto' },
    ],
    // A free tip, so On on a fresh store.
    default: 'suggest',
  },
  ...FIT_SETTINGS,
]

export const ROUTE_HELP: HelpEntry[] = [
  { title: 'How do I save usage with cheaper models?', text: 'An agent that only searches or reads does not need the biggest model. Auto sends such an agent to a cheaper one. Suggest only tells you. Plan and review agents are never changed, nor an agent that an agent file of yours defines (it keeps the model its file chose), nor a model Claude chose.' },
  { title: 'Why does it warn when I switch model?', text: 'When you switch model in a long session, the saved copy of the session is thrown away and written again. Vaken tells you what that costs before it happens.' },
  ...FIT_HELP,
]

type RouteMode = 'off' | 'suggest' | 'auto'
export type JobType = 'lookup' | 'deep' | 'normal'

export const routeMode = (raw: unknown): RouteMode => (raw === 'suggest' || raw === 'auto' ? raw : 'off')
export const cheapModel = (raw: unknown): 'haiku' | 'sonnet' => (raw === 'sonnet' ? 'sonnet' : 'haiku')

// A long description names the job in its first words.
const DESC_WORDS = 5
// Check and investigate do not count: they often need judgement.
const LOOKUP = /^(search(es|ing)?|explor(e|es|ing|ation)|read(s|ing)?|list(s|ing)?|summar(y|ies|ize|izes|izing|ise|ises|ising)|find(s|ing)?|locat(e|es|ing)|look(s|ing)?|grep(s|ping)?|scan(s|ning)?)$/
const DEEP = /^(review(s|ing)?|plan(s|ning)?|design(s|ing)?|architect(ure|ures|ural)?)$/
// 'Find the bug and fix it' is not a lookup.
const WRITE_WORDS = 12
const WRITE = /^(fix(es|ing)?|writ(e|es|ing)|implement(s|ing)?|edit(s|ing)?|chang(e|es|ing)|refactor(s|ing)?|build(s|ing)?|add(s|ing)?|creat(e|es|ing)|updat(e|es|ing)|migrat(e|es|ing)|delet(e|es|ing)|remov(e|es|ing))$/

const tokens = (text: string): string[] => text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w !== '')

// Deep wins over lookup. Anything unknown is normal and never changed.
export function jobType(subagentType: string, description: string): JobType {
  const desc = tokens(description)
  const words = [...tokens(subagentType), ...desc.slice(0, DESC_WORDS)]
  if (words.some(w => DEEP.test(w))) return 'deep'
  const readOnly = tokens(subagentType).includes('explore')
  if (!readOnly && desc.slice(0, WRITE_WORDS).some(w => WRITE.test(w))) return 'normal'
  if (words.some(w => LOOKUP.test(w))) return 'lookup'
  return 'normal'
}

export function familyOf(model: string): string {
  const m = model.toLowerCase()
  for (const f of ['haiku', 'sonnet', 'opus', 'fable']) if (m.includes(f)) return f
  return 'other'
}

// An unknown model counts as Opus, so a helper is only sent down to a model we named.
const rank = rankOf

export type SpawnFacts = {
  mode: RouteMode
  cheap: Family
  job: JobType
  // Claude's own choice is never overridden.
  model?: string
  parentModel: string
  // A helper defined elsewhere decides its own model, and an explicit model beats the file, so it is never rewritten.
  userDefined?: boolean
  ownModel?: string
  // Forks, teammates and workflow agents are not ours to change.
  fork: boolean
  isTeammate: boolean
  isWorkflow: boolean
}

type Route = { action: 'none' } | { action: 'rewrite'; model: string } | { action: 'suggest'; model: string }

// Routing only sends down.
export function decideRoute(f: SpawnFacts): Route {
  if (f.mode === 'off' || f.job !== 'lookup') return { action: 'none' }
  if (f.fork || f.isTeammate || f.isWorkflow) return { action: 'none' }
  if (f.model !== undefined && f.model.trim() !== '') return { action: 'none' }
  if (f.userDefined === true) return { action: 'none' }
  if (rank(f.parentModel) <= rank(f.cheap)) return { action: 'none' }
  if (f.ownModel !== undefined && rank(f.ownModel) <= rank(f.cheap)) return { action: 'none' }
  return { action: f.mode === 'auto' ? 'rewrite' : 'suggest', model: f.cheap }
}


// `agent.offer` says where a type was defined; `agent.spawn` says only who provides it.
export const BUILT_IN = 'built-in'
export const definedElsewhere = (offerSource: string | undefined, providerPlugin: string | undefined): boolean =>
  (offerSource !== undefined && offerSource !== BUILT_IN) || (providerPlugin !== undefined && providerPlugin !== 'engine')

export function agentFilePaths(type: string, home: string, folders: string[]): string[] {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(type)) return []
  const dirs = [home === '' ? undefined : under(home, '.claude/agents'), ...folders.filter(f => f !== '').map(f => under(f, '.claude/agents'))]
  return [...new Set(dirs.filter((d): d is string => d !== undefined).map(d => under(d, `${type}.md`)))]
}

// 'inherit' follows the parent.
export function fileModel(text: string): string | undefined {
  const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (head === null) return undefined
  const line = /^model:\s*["']?([^"'\r\n#]+?)["']?\s*(?:#.*)?$/m.exec(head[1])
  const v = line?.[1].trim()
  return v === undefined || v === '' || v.toLowerCase() === 'inherit' ? undefined : v
}

export const SUGGEST_GAP_MS = 10 * 60_000
export const suggestDue = (last: number | undefined, now: number): boolean => last === undefined || now - last >= SUGGEST_GAP_MS

export const ROUTED_WHAT = 'Sent a lookup agent to a cheaper model'
export const SUGGEST_WHAT = 'A lookup agent could run on a cheaper model'
export const WARNED_WHAT = 'Warned before a model switch'
export const routedDetail = (model: string): string => `It runs on ${model} instead.`
export const suggestDetail = (model: string): string => `Set Agent models to Auto and it runs on ${model}.`


// Below it, writing the cache again is cheap.
const SWITCH_MIN_TOKENS = 100_000

type SwitchFacts = { cacheWarm: boolean; contextTokens: number; from: string; to: string }

// A cost alert, not a tip: it does not follow Agent models, so Only alerts and a fresh store keep it.
export const shouldWarnSwitch = (f: SwitchFacts): boolean => f.cacheWarm && f.contextTokens >= SWITCH_MIN_TOKENS && f.from !== f.to

export const switchWarning = (contextTokens: number, usd: number): string => tr('A model switch writes the saved session again ({tokens} tokens) and costs {usd}.').replace('{tokens}', tokenWord(contextTokens)).replace('{usd}', fmt.moneyAbout(usd, langNow()))
// A stored fact, so English.
export const switchDetail = (from: string, to: string, usd: number): string => `${familyOf(from)} to ${familyOf(to)}, ${fmt.moneyAbout(usd)}.`

// Once even when the event comes twice.
const SWITCH_GAP_MS = 60_000
export const switchKey = (from: string, to: string, contextTokens: number): string => `${from}>${to}:${contextTokens}`
export const switchDue = (last: { key: string; at: number } | undefined, key: string, now: number): boolean => last === undefined || last.key !== key || now - last.at >= SWITCH_GAP_MS


export const STATS_KEY = 'cockpit:route:stats'
export const MIN_RUNS = 3
const MAX_MODELS = 8

type Cell = { n: number; out: number; ms: number }
export type Stats = Record<string, Record<string, Cell>>

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)

export function normalizeStats(raw: unknown): Stats {
  const out: Stats = {}
  if (typeof raw !== 'object' || raw === null) return out
  for (const [job, models] of Object.entries(raw as Record<string, unknown>)) {
    if (job !== 'lookup' && job !== 'deep' && job !== 'normal') continue
    if (typeof models !== 'object' || models === null) continue
    const cells: Record<string, Cell> = {}
    for (const [model, c] of Object.entries(models as Record<string, unknown>).slice(0, MAX_MODELS)) {
      if (typeof c !== 'object' || c === null) continue
      const cell = c as Record<string, unknown>
      const n = Math.floor(num(cell.n))
      if (n > 0) cells[model] = { n, out: num(cell.out), ms: num(cell.ms) }
    }
    out[job] = cells
  }
  return out
}

export function addRun(stats: Stats, job: JobType, model: string, outputTokens: number, ms: number): Stats {
  const family = familyOf(model)
  const old = stats[job]?.[family] ?? { n: 0, out: 0, ms: 0 }
  return { ...stats, [job]: { ...(stats[job] ?? {}), [family]: { n: old.n + 1, out: old.out + num(outputTokens), ms: old.ms + num(ms) } } }
}

const seconds = (ms: number): string => (ms >= 90_000 ? `${Math.round(ms / 60_000)} min` : `${Math.max(1, Math.round(ms / 1000))} s`)
const jobWord: Record<JobType, string> = { lookup: 'lookup', deep: 'deep', normal: 'normal' }

export const quoteWords = (job: JobType, model: string, c: Cell): string => `A ${jobWord[job]} agent on ${model} took about ${seconds(c.ms / c.n)} and ${tokenWord(c.out / c.n)} tokens on average over ${c.n} runs.`

export function quotes(stats: Stats): string[] {
  const out: string[] = []
  for (const job of ['lookup', 'normal', 'deep'] as const) {
    for (const [model, c] of Object.entries(stats[job] ?? {})) if (c.n >= MIN_RUNS) out.push(quoteWords(job, model, c))
  }
  return out
}

export const NO_DATA = `Not enough data for a quote yet. It needs ${MIN_RUNS} finished agents of one kind on one model.`


const modeWords: Record<RouteMode, string> = {
  off: 'off. Agents run as Claude chose them.',
  suggest: 'suggest. A lookup agent that could run cheaper is flagged, nothing is changed.',
  auto: 'auto. A lookup agent with no model of its own runs on the cheaper model.',
}

export function routeText(mode: RouteMode, cheap: string, last: string[], stats: Stats, mine: boolean = false): string {
  const q = quotes(stats)
  return [
    `Agent models: ${modeWords[mode]}`,
    `Lookup model: ${cheap}${mine ? ' (this session only)' : ''}, the Researcher’s model in Settings > Agents. A lookup agent is one that searches, finds, explores, reads, lists or summarizes. Routing only sends an agent down, never above the main model or the model its own agent file names: plan, review and design agents are never changed, and neither is a model Claude chose or an agent your own agent files define. A built-in agent’s own model is not visible to vaken, so for those only the main model sets the limit.`,
    ...(mode === 'off' ? ['Turn it on: Settings > Agents.'] : []),
    '',
    ...(q.length === 0 ? [NO_DATA] : ['From past runs:', ...q]),
    ...(last.length === 0 ? [] : ['', 'Last:', ...last]),
  ].join('\n')
}
