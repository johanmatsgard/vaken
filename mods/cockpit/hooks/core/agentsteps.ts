// An agent's last steps for its opened row in the Agents card: read from the session at the press, shown, then forgotten.
// A step is one answer of the agent's model: the kinds of tools it used, the file names they touched, its time and its cost.
// Never a word of the transcript: only tool kinds, file names, times and costs. The times and costs come from this session's memory (features/agentboard.ts).
import { dur } from './agentboard'
import { same } from './fillin'
import type { Tr } from './fillin'
import { tEn } from './lang'
import { money } from './prices'

// A text of the table by its name (`t` of the draw, `tEn` for English)
type Say = (name: string, vars?: Record<string, string | number>) => string

// One answer's time and cost, as this session saw it: the tool names it asked for (joined by ","), how long the answer and its tools took, what it cost (estimate)
export type StepTime = { tools: string; ms: number; usd?: number }
export type AgentStep = { n: number; kinds: string[]; files: string[]; failed: boolean; tools: string; ms?: number; usd?: number }
// What the opened row draws: reading, the steps, or why there are none
export type StepsState = { kind: 'reading' } | { kind: 'steps'; steps: AgentStep[] } | { kind: 'elsewhere' } | { kind: 'unreadable' }

type UseLike = { tool: string; input?: unknown; isError?: true }
type MessageLike = { role: string; toolUses?: readonly UseLike[] }

// The most steps kept in memory per agent; the row shows fewer (AGENT_STEPS_SHOW)
export const STEP_TIMES_KEEP = 8
const FILES_SHOWN = 2
const KINDS_SHOWN = 2

// The file a tool touched, by its name only (never its folder): the fields the engine's file tools take
export function fileOf(input: unknown): string | undefined {
  if (input === null || typeof input !== 'object') return undefined
  const o = input as Record<string, unknown>
  const p = [o.file_path, o.notebook_path, o.path].find((v): v is string => typeof v === 'string' && v.trim() !== '')
  if (p === undefined) return undefined
  const name = p.replace(/[\\/]+$/, '').split(/[\\/]/).pop()
  return name === undefined || name === '' ? undefined : name
}

// A tool's kind in plain words; a server's tool says its server ("Used notes"); an unknown tool keeps its own name
export function kindOf(tool: string, say: Say = tEn): string {
  const mcp = /^mcp__([^_]+(?:_[^_]+)*?)__/.exec(tool)
  if (mcp !== null) return say('cardwhat.step_used_name', { name: mcp[1] })
  if (tool === 'Read') return say('cardwhat.step_read')
  if (tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') return say('cardwhat.step_edited')
  if (tool === 'Write') return say('cardwhat.step_wrote')
  if (tool === 'Bash' || tool === 'PowerShell') return say('cardwhat.step_ran_a_command')
  if (tool === 'Grep' || tool === 'Glob') return say('cardwhat.step_searched')
  if (tool === 'WebFetch') return say('cardwhat.step_read_a_web_page')
  if (tool === 'WebSearch') return say('cardwhat.step_searched_the_web')
  if (tool === 'Agent' || tool === 'Task') return say('cardwhat.step_started_an_agent')
  return tool
}

// The agent's model answers in order: messages of the assistant with no user message between them are one answer (the engine may split one answer in parts)
function answersOf(messages: readonly MessageLike[]): UseLike[][] {
  const out: UseLike[][] = []
  let open: UseLike[] | undefined
  for (const m of messages) {
    if (m.role !== 'assistant') {
      open = undefined
      continue
    }
    if (open === undefined) {
      open = []
      out.push(open)
    }
    open.push(...(m.toolUses ?? []))
  }
  return out
}

const stepOf = (uses: readonly UseLike[], n: number, say: Say): AgentStep => {
  const kinds: string[] = []
  const files: string[] = []
  for (const u of uses) {
    const k = kindOf(u.tool, say)
    if (!kinds.includes(k)) kinds.push(k)
    const f = fileOf(u.input)
    if (f !== undefined && !files.includes(f)) files.push(f)
  }
  return { n, kinds: kinds.length === 0 ? [say('cardwhat.step_answered')] : kinds, files, failed: uses.some(u => u.isError === true), tools: uses.map(u => u.tool).join(',') }
}

// The last `show` steps, oldest first, each paired from the end with its time and cost while the tool names match (a gap in memory stops the pairing)
export function lastSteps(messages: readonly MessageLike[], times: readonly StepTime[], show: number, say: Say = tEn): AgentStep[] {
  const answers = answersOf(messages)
  const steps = answers.map((uses, i) => stepOf(uses, i + 1, say))
  let j = times.length - 1
  for (let i = steps.length - 1; i >= 0 && j >= 0; i--, j--) {
    if (times[j].tools !== steps[i].tools) break
    steps[i] = { ...steps[i], ms: times[j].ms, ...(times[j].usd === undefined ? {} : { usd: times[j].usd }) }
  }
  return steps.slice(-show)
}

// "3. Edit form.ts, index.ts": the kinds, each whole, then the file names; more than fit say "+N"
export function stepLabel(s: AgentStep): string {
  const kinds = s.kinds.length > KINDS_SHOWN ? [...s.kinds.slice(0, KINDS_SHOWN), `+${s.kinds.length - KINDS_SHOWN}`] : s.kinds
  const files = s.files.length > FILES_SHOWN ? [...s.files.slice(0, FILES_SHOWN), `+${s.files.length - FILES_SHOWN}`] : s.files
  return `${s.n}. ${kinds.join(' · ')}${files.length === 0 ? '' : ` ${files.join(', ')}`}`
}

// "Failed · 4 s · $0.0042": the word first when a tool failed, then the time and the exact estimate; empty when neither is known
export function stepValue(s: AgentStep, t: Tr = same): string {
  return [...(s.failed ? [t('Failed')] : []), ...(s.ms === undefined ? [] : [dur(s.ms)]), ...(s.usd === undefined ? [] : [money(s.usd)])].join(' · ')
}

// Memory of one agent's step times: the newest last, at most STEP_TIMES_KEEP
export function withStepTime(list: readonly StepTime[], step: StepTime): StepTime[] {
  return [...list, step].slice(-STEP_TIMES_KEEP)
}

// A tool's own time joins the answer that asked for it (the newest one)
export function withToolTime(list: readonly StepTime[], ms: number): StepTime[] {
  if (list.length === 0) return [...list]
  const last = list[list.length - 1]
  return [...list.slice(0, -1), { ...last, ms: last.ms + Math.max(0, ms) }]
}
