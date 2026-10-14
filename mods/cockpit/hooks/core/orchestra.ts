// The task runner: pure rules and words. Starts helper agents itself, in a git worktree when a task writes code, checks each task at its end and stops helpers that run too long or cost too much. Only the person starts a run.
import { under } from './platform'
import { modelWord } from './agentboard'
import type { BoardRow } from './agentboard'
import { tr } from './lang'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import { SMALL_FIRST_WORDS } from './planfit'
import { MODEL_OPTIONS, familyIn, stepUp } from './models'
import type { Family } from './models'
import { aboutMoney, money } from './prices'
import type { Setting } from './settings'
import { tEn } from '../i18n/t'

export const TASKS_FILE = '.claude/cockpit-tasks.md'
export const ORCH_KEY = (sessionId: string): string => `cockpit:orch:${sessionId}`
export const TASKS_MAX = 20
export const TASK_WORDS_MAX = 120
// AT_ONCE_SANE only keeps a typed number sane; it is not a limit vaken imposes.
export const AT_ONCE_SANE = 64
// 0 is Auto: as many as the Mac has room for, under the person's own limit if there is one.
export const AT_ONCE_AUTO = 0
// With no fresh room reading Auto starts one helper at a time, never a guessed number.
export function autoCeiling(max: number, hasRoom: boolean, limitOff = false): number {
  const limit = limitOff || !Number.isFinite(max) || max < 1 ? Infinity : Math.floor(max)
  return hasRoom ? limit : Math.min(limit, 1)
}
export const withAtOnce = (run: Run, auto: number): Run => (run.choices.atOnce === AT_ONCE_AUTO ? { ...run, choices: { ...run.choices, atOnce: auto } } : run)
// A laptop stays responsive when agents start one at a time.
export const STAGGER_MS = 20_000
// Laptop rule: a check does not run the whole suite for every task.
export const CHECK_HINT = 'Run only the tests of files touched.'

// `own` is a floor for when the board did not see the run's helpers.
export function capRoom(mode: string, max: number, running: number, own: number): number {
  if (mode === 'off') return Infinity
  if (!Number.isFinite(max) || max < 1) return Infinity
  return Math.max(0, Math.floor(max) - Math.max(running, own))
}
export const capWhy = (max: number): string => `waits: your limit is reached (${Number.isFinite(max) && max >= 1 ? Math.floor(max) : 1} at once in all sessions)`

// Undefined: the engine cannot tell, so helpers start together.
export function staggerWait(last: { id: string; at: number } | undefined, seen: ((id: string) => boolean) | undefined, now: number): boolean {
  if (last === undefined || seen === undefined) return false
  return now - last.at < STAGGER_MS && !seen(last.id)
}


export type Role = 'researcher' | 'builder' | 'reviewer' | 'fixer'
export const ROLE_NAMES: Role[] = ['researcher', 'builder', 'reviewer', 'fixer']
// undefined: everything the session may use.
export const ROLES: Record<Role, { label: string; about: string; writes: boolean; model: string; tools?: string[] }> = {
  researcher: { label: 'Researcher', about: 'Reads and reports. It changes no file.', writes: false, model: 'haiku', tools: ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch'] },
  builder: { label: 'Builder', about: 'Writes the code for one task.', writes: true, model: 'sonnet' },
  reviewer: { label: 'Reviewer', about: 'Reads a change and says if it is good.', writes: false, model: 'haiku', tools: ['Read', 'Grep', 'Glob', 'Bash'] },
  fixer: { label: 'Fixer', about: 'Fixes what failed, with the strongest model.', writes: true, model: 'opus' },
}
// `about` stays as is because it is written into the role's agent file, and a changed word would show the file as different in Agent setup.
export const ROLE_SHOWN: Partial<Record<Role, string>> = { researcher: 'Reads and reports. Changes no file.' }
export const roleShown = (r: Role): string => ROLE_SHOWN[r] ?? ROLES[r].about
export const roleSettingKey = (r: Role): string => `runner.${r}`
export const RUNNER_SETTINGS: Setting[] = (['researcher', 'builder', 'reviewer', 'fixer'] as Role[]).map(r => ({
  key: roleSettingKey(r),
  group: 'Task runner',
  label: `${ROLES[r].label} model`,
  note: ROLES[r].about,
  options: MODEL_OPTIONS,
  default: ROLES[r].model,
}))

export const roleType = (r: Role): string => `cockpit:${r}`

export type ModelPick = 'auto' | 'cheap' | 'normal' | 'strong'
export const MODEL_PICKS: ModelPick[] = ['auto', 'cheap', 'normal', 'strong']
const PICKED: Record<Exclude<ModelPick, 'auto'>, string> = { cheap: 'haiku', normal: 'sonnet', strong: 'opus' }
export const modelFor = (pick: ModelPick, role: Role, roleModels: Partial<Record<Role, string>> = {}): string => (pick === 'auto' ? (roleModels[role] ?? ROLES[role].model) : PICKED[pick])
// Fable has no pick: only a person chooses it.
const PICK_OF: Partial<Record<Family, ModelPick>> = { haiku: 'cheap', sonnet: 'normal', opus: 'strong' }


type TaskState = 'waiting' | 'running' | 'done' | 'failed' | 'stopped' | 'skipped'
type CheckState = 'none' | 'pending' | 'running' | 'passed' | 'failed'
export type Task = {
  n: number
  text: string
  role: Role
  model: ModelPick
  after?: number
  folder: boolean
  state: TaskState
  tries: number
  agentId?: string
  startedAt?: number
  endedAt?: number
  usd?: number
  path?: string
  branch?: string
  check: CheckState
  checkLine?: string
  kept?: 'kept' | 'thrown'
  why?: string
  holdUntil?: number // a start was refused (the agent cap)
  askedAt?: number // not asked again for ASK_WAIT_MS
  base?: string // for the review's diff
  review?: ReviewState
  reviewAgent?: string
  reviewAskedAt?: number
  reviewSeenAt?: number // its words should follow at once
  reviewLines?: string[]
  ran?: string
  upFrom?: string
}
type ReviewState = 'pending' | 'running' | 'done' | 'failed'
type Choices = { atOnce: number; check: string; reviewer: boolean; helperMin: number; helperUsd: number; runUsd: number; afterLimit: 'go' | 'wait' }
export const DEFAULT_CHOICES: Choices = { atOnce: AT_ONCE_AUTO, check: '', reviewer: false, helperMin: 30, helperUsd: 2, runUsd: 10, afterLimit: 'go' }
type RunStatus = 'setup' | 'running' | 'paused' | 'done' | 'stopped'
// `via` 'claude': the app's auto mode refuses a helper the person's own message did not ask for, so Claude is asked in a message and the agent.spawn hook gives each helper its details. `replans` counts waits planned again because a window still read full.
export type Run = { id: string; name: string; status: RunStatus; createdAt: number; startedAt?: number; tasks: Task[]; choices: Choices; told?: boolean; via?: 'direct' | 'claude'; resumeAt?: number; replans?: number; smallFirst?: true; atNow?: { n: number; room: boolean }; costPause?: number }

const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export function parseTaskLine(line: string, n: number): Omit<Task, 'state' | 'tries' | 'check'> {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(line)
  const words = (m === null ? line : m[1]).replace(/\s+/g, ' ').trim()
  const tags = m === null ? [] : m[2].split(',').map(t => t.trim().toLowerCase())
  const role = (ROLE_NAMES.find(r => tags.includes(r)) ?? 'builder') as Role
  const model = (MODEL_PICKS.find(p => tags.includes(p)) ?? 'auto') as ModelPick
  const after = tags.map(t => /^after\s+(\d+)$/.exec(t)).find(x => x !== null)
  const shared = tags.includes('shared') || tags.includes('no folder')
  const before = after == null ? undefined : Number(after[1])
  return { n, text: cut(words === '' ? line.trim() : words, TASK_WORDS_MAX), role, model, ...(before === undefined || before >= n || before < 1 ? {} : { after: before }), folder: ROLES[role].writes && !shared }
}

// A ticked line ('- [x]') is done already.
export function parseTaskFile(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const m = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[( |x|X)\]\s+)?(.+?)\s*$/.exec(raw)
    if (m === null || m[1] === 'x' || m[1] === 'X') continue
    if (/^Write the (first|second) task here\b/.test(m[2])) continue
    out.push(m[2])
    if (out.length >= TASKS_MAX) break
  }
  return out
}

export const TEMPLATE = `# Tasks for the helper agents

One task per line. Vaken runs them with helper agents, as many at a time as this Mac has room for by default (or the limit you set under Settings > Agents, or "at N").
After a task you may add choices in brackets: a role (researcher, builder, reviewer, fixer),
a model (cheap, normal, strong, auto), "after 2" to wait for task 2, "shared" for no folder copy.
Start the run with /vaken-tasks start, or from the Agents card. Ticked lines ([x]) are skipped.

- [ ] Write the first task here
- [ ] Write the second task here (researcher, cheap)
`

export const newTask = (spec: Omit<Task, 'state' | 'tries' | 'check'>): Task => ({ ...spec, state: 'waiting', tries: 0, check: 'none' })

export function newRun(lines: string[], now: number, name = 'Task run', choices: Choices = DEFAULT_CHOICES): Run {
  return { id: now.toString(36), name, status: 'setup', createdAt: now, tasks: lines.slice(0, TASKS_MAX).map((l, k) => newTask(parseTaskLine(l, k + 1))), choices: { ...choices } }
}

export function rerunOf(run: Run, now: number): Run {
  const tasks = run.tasks.map(t => newTask({ n: t.n, text: t.text, role: t.role, model: t.model, ...(t.after === undefined ? {} : { after: t.after }), folder: t.folder }))
  return { id: now.toString(36), name: run.name, status: 'setup', createdAt: now, tasks, choices: { ...run.choices } }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const oneOf = <T extends string>(v: unknown, all: readonly T[], d: T): T => (typeof v === 'string' && (all as readonly string[]).includes(v) ? (v as T) : d)
const STATES: TaskState[] = ['waiting', 'running', 'done', 'failed', 'stopped', 'skipped']
const CHECKS: CheckState[] = ['none', 'pending', 'running', 'passed', 'failed']
const STATUSES: RunStatus[] = ['setup', 'running', 'paused', 'done', 'stopped']

function parseTask(raw: unknown, k: number): Task | undefined {
  const o = raw as Partial<Task> | null
  if (typeof o !== 'object' || o === null || typeof o.text !== 'string') return undefined
  const role = oneOf(o.role, ROLE_NAMES, 'builder')
  const t: Task = { n: k + 1, text: cut(o.text, TASK_WORDS_MAX), role, model: oneOf(o.model, MODEL_PICKS, 'auto'), folder: o.folder === true && ROLES[role].writes, state: oneOf(o.state, STATES, 'waiting'), tries: isNum(o.tries) ? o.tries : 0, check: oneOf(o.check, CHECKS, 'none') }
  if (isNum(o.after) && o.after >= 1 && o.after < k + 1) t.after = o.after
  for (const key of ['startedAt', 'endedAt', 'usd', 'holdUntil', 'askedAt', 'reviewAskedAt', 'reviewSeenAt'] as const) if (isNum(o[key])) t[key] = o[key]
  for (const key of ['agentId', 'path', 'branch', 'checkLine', 'why', 'base', 'reviewAgent', 'ran', 'upFrom'] as const) if (typeof o[key] === 'string') t[key] = o[key]
  if (o.review === 'pending' || o.review === 'running' || o.review === 'done' || o.review === 'failed') t.review = o.review
  if (Array.isArray(o.reviewLines)) t.reviewLines = o.reviewLines.filter((l): l is string => typeof l === 'string').slice(0, REVIEW_LINES).map(l => cut(l, REVIEW_LINE_MAX))
  if (o.kept === 'kept' || o.kept === 'thrown') t.kept = o.kept
  return t
}

function parseChoices(raw: unknown): Choices {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Choices>
  const num = (v: unknown, d: number, lo: number, hi: number): number => (isNum(v) && v >= lo && v <= hi ? v : d)
  return {
    atOnce: num(o.atOnce, DEFAULT_CHOICES.atOnce, 0, AT_ONCE_SANE),
    check: typeof o.check === 'string' ? o.check.slice(0, 200) : '',
    reviewer: o.reviewer === true,
    helperMin: num(o.helperMin, DEFAULT_CHOICES.helperMin, 1, 600),
    helperUsd: num(o.helperUsd, DEFAULT_CHOICES.helperUsd, 0.01, 1000),
    runUsd: num(o.runUsd, DEFAULT_CHOICES.runUsd, 0.01, 10_000),
    afterLimit: o.afterLimit === 'wait' ? 'wait' : 'go',
  }
}

// A run from the first version is not read; it starts again from the file.
export function parseRun(raw: unknown): Run | undefined {
  const o = raw as Partial<Run> | null
  if (typeof o !== 'object' || o === null || !Array.isArray(o.tasks) || typeof o.id !== 'string' || !isNum(o.createdAt)) return undefined
  const tasks = o.tasks.slice(0, TASKS_MAX).map(parseTask).filter((t): t is Task => t !== undefined).map((t, k) => ({ ...t, n: k + 1 }))
  if (tasks.length === 0) return undefined
  return { id: o.id, name: typeof o.name === 'string' && o.name !== '' ? cut(o.name, 40) : 'Task run', status: oneOf(o.status, STATUSES, 'setup'), createdAt: o.createdAt, ...(isNum(o.startedAt) ? { startedAt: o.startedAt } : {}), tasks, choices: parseChoices(o.choices), ...(o.told === true ? { told: true } : {}), ...(o.via === 'claude' || o.via === 'direct' ? { via: o.via } : {}), ...(isNum(o.resumeAt) ? { resumeAt: o.resumeAt } : {}), ...(isNum(o.replans) ? { replans: o.replans } : {}), ...(o.smallFirst === true ? { smallFirst: true as const } : {}), ...(isNum(o.costPause) ? { costPause: o.costPause } : {}), ...(typeof o.atNow === 'object' && o.atNow !== null && isNum(o.atNow.n) ? { atNow: { n: o.atNow.n, room: o.atNow.room === true } } : {}) }
}


const ended = (t: Task): boolean => t.state === 'done' || t.state === 'failed' || t.state === 'stopped' || t.state === 'skipped'
const checkBusy = (t: Task): boolean => t.check === 'pending' || t.check === 'running'
const reviewBusy = (t: Task): boolean => t.review === 'pending' || t.review === 'running'
export const running = (run: Run): Task[] => run.tasks.filter(t => t.state === 'running')
export const busy = (run: Run): number => running(run).length + run.tasks.filter(t => t.review === 'running').length

function gate(run: Run, t: Task): 'go' | 'wait' | 'never' {
  if (t.after === undefined) return 'go'
  const before = run.tasks[t.after - 1]
  if (before === undefined) return 'go'
  if (before.state === 'done' && !checkBusy(before)) return before.check === 'failed' ? 'never' : 'go'
  return ended(before) && before.state !== 'done' ? 'never' : 'wait'
}

export function skipBlocked(run: Run): Run {
  let changed = false
  const tasks = run.tasks.map(t => {
    if (t.state !== 'waiting' || gate(run, t) !== 'never') return t
    changed = true
    return { ...t, state: 'skipped' as const, why: `task ${t.after} did not pass` }
  })
  return changed ? { ...run, tasks } : run
}

const readyTasks = (run: Run, now: number): Task[] =>
  run.tasks.filter(t => t.state === 'waiting' && gate(run, t) === 'go' && (t.holdUntil === undefined || t.holdUntil <= now) && (t.askedAt === undefined || now - t.askedAt >= ASK_WAIT_MS))
// The tasks carry no estimate, so word length stands in.
const taskSize = (t: Task): number => t.text.length
// Sorted by size, then position, so it is stable.
const smallestFirst = (list: Task[]): Task[] => list.map((t, k) => ({ t, k })).sort((a, b) => taskSize(a.t) - taskSize(b.t) || a.k - b.k).map(x => x.t)
export const reordersStart = (run: Run, now = 0): boolean => {
  const ready = readyTasks(run, now)
  return smallestFirst(ready).some((t, k) => t !== ready[k])
}

export function nextToStart(run: Run, now = 0, smallFirst = false): Task[] {
  if (run.status !== 'running') return []
  const room = (run.choices.atOnce === AT_ONCE_AUTO ? Infinity : run.choices.atOnce) - busy(run)
  if (room <= 0) return []
  const asked = run.tasks.filter(t => t.state === 'waiting' && t.askedAt !== undefined && now - t.askedAt < ASK_WAIT_MS).length
  const ready = readyTasks(run, now)
  return (smallFirst ? smallestFirst(ready) : ready).slice(0, Math.max(0, room - asked))
}
const ASK_WAIT_MS = 2 * 60_000

export const isAutoModeRefusal = (deny: string): boolean => /classifier|auto mode/i.test(deny)

// Each helper gets a short exact code as its prompt; the agent.spawn hook finds the task by it.
const taskCode = (run: Run, t: Task): string => `vaken-task ${run.id}-${t.n}`
export function askPrompt(run: Run, tasks: Task[], reviews: Task[] = []): string {
  const n = tasks.length + reviews.length
  return [
    `Please start ${n === 1 ? 'this agent' : `these ${n} agents`} for my task run now: one Agent call each, in the background, with exactly these values.`,
    ...tasks.map(t => `- description "Task ${t.n}", prompt "${taskCode(run, t)}"`),
    ...reviews.map(t => `- description "Review ${t.n}", prompt "${reviewCode(run, t)}"`),
    'Vaken fills in each agent\'s full task, folder, role and model. Then wait: each agent reports back to you when it is done.',
  ].join('\n')
}

export function taskForSpawn(run: Run, description: string, prompt = ''): Task | undefined {
  if (run.status !== 'running' && run.status !== 'paused') return undefined
  const code = /(?:vaken|cockpit)-task\s+([a-z0-9]+)-(\d+)/i.exec(prompt) // legacy: a run started before the rename
  const n = code !== null && code[1] === run.id ? Number(code[2]) : code === null ? taskNumber(description) : undefined
  const t = n === undefined ? undefined : run.tasks.find(x => x.n === n)
  return t !== undefined && t.state === 'waiting' ? t : undefined
}
export const HOLD_MS = 60_000

// `live` is the running sum of a helper's steps; the final `usd` wins once there is one.
export type LiveCost = (agentId: string) => number | undefined
const usdOf = (t: Task, live?: LiveCost): number | undefined => t.usd ?? (live === undefined || t.agentId === undefined ? undefined : live(t.agentId))
const runUsd = (run: Run, live?: LiveCost): number => run.tasks.reduce((s, t) => s + (usdOf(t, live) ?? 0), 0)

export function overLimits(run: Run, now: number, live?: LiveCost): { n: number; why: string }[] {
  return running(run).flatMap(t => {
    if (t.startedAt !== undefined && now - t.startedAt > run.choices.helperMin * 60_000) return [{ n: t.n, why: `ran past ${run.choices.helperMin} min` }]
    const usd = usdOf(t, live)
    if (usd !== undefined && usd > run.choices.helperUsd) return [{ n: t.n, why: `cost past ${money(run.choices.helperUsd)}` }]
    return []
  })
}
export const runOverBudget = (run: Run, live?: LiveCost): boolean => runUsd(run, live) > run.choices.runUsd

export const isFinished = (run: Run): boolean => run.tasks.every(t => ended(t) && !checkBusy(t) && !reviewBusy(t))

export function withTask(run: Run, n: number, patch: Partial<Task>): Run {
  return { ...run, tasks: run.tasks.map(t => (t.n === n ? { ...t, ...patch } : t)) }
}
export const taskOfAgent = (run: Run, agentId: string): Task | undefined => run.tasks.find(t => t.agentId === agentId)

export function endTask(run: Run, agentId: string, state: 'done' | 'failed', now: number, why?: string): Run {
  const t = taskOfAgent(run, agentId)
  if (t === undefined || t.state !== 'running') return run
  const check = state === 'done' && run.choices.check.trim() !== '' ? 'pending' : 'none'
  return withTask(run, t.n, { state, endedAt: now, ...(why === undefined ? {} : { why }), check, ...(state === 'done' && check === 'none' && run.choices.reviewer ? { review: 'pending' as const } : {}) })
}

export function addTaskCost(run: Run, agentId: string, usd: number | undefined): Run {
  const t = taskOfAgent(run, agentId)
  return t === undefined || usd === undefined ? run : withTask(run, t.n, { usd: (t.usd ?? 0) + usd })
}

// After a failure it goes one model up (stepUp in core/models.ts); a stopped task tries again on the same model.
export function retryTask(run: Run, n: number): Run {
  const t = run.tasks.find(x => x.n === n)
  if (t === undefined || !ended(t)) return run
  const { agentId: _a, startedAt: _s, endedAt: _e, why: _w, checkLine: _c, review: _r, reviewAgent: _ra, reviewLines: _rl, reviewAskedAt: _rq, ...rest } = t
  const up = stepUpOf(t)
  const again: Task = { ...rest, state: 'waiting', check: 'none', ...(up === undefined ? {} : { model: up.pick, upFrom: up.from }) }
  const next = { ...run, tasks: run.tasks.map(x => (x.n === n ? again : x)) }
  return run.status === 'done' || run.status === 'stopped' ? { ...next, status: 'running', told: false } : next
}

export function stepUpOf(t: Task): { pick: ModelPick; from: string } | undefined {
  // A killed helper did not fail at its work.
  if (t.ran === undefined || !((t.state === 'failed' && t.why !== 'stopped') || t.check === 'failed')) return undefined
  const up = stepUp(t.ran)
  const pick = up === undefined ? undefined : PICK_OF[up]
  return pick === undefined ? undefined : { pick, from: familyIn(t.ran) ?? t.ran }
}

export const ranOn = (asked: string, answered?: string): string => familyIn(answered ?? '') ?? familyIn(asked) ?? asked


export const descriptionOf = (t: Task): string => `Task ${t.n}: ${cut(t.text, 40)}`

export function taskPrompt(t: Task): string {
  const where =
    !ROLES[t.role].writes ? 'Do not change any file.'
    : t.path !== undefined ? `Work only in this folder: ${t.path}. It is your own copy of the project, on branch ${t.branch ?? 'of its own'}. When you are done, commit your changes there with a short message.`
    : 'Work in the project folder. Other agents may work at the same time: change only what this task needs.'
  return [`You are the agent for task ${t.n} of a task list.`, `The task: ${t.text}`, where, 'End with a short report of at most 8 lines: what you did, what you checked, and what is left.'].join('\n')
}

// The description a role is registered with
export const roleDescription = (r: Role): string => `Task runner ${ROLES[r].label.toLowerCase()}: ${ROLES[r].about} Started by vaken's task runner.`
export const ROLE_PROMPT = (r: Role): string =>
  [`You are a ${ROLES[r].label.toLowerCase()} agent. ${ROLES[r].about}`, 'Keep to your one task. Use short plain words in your report.'].join(' ')

export const folderOf = (root: string, run: Run, t: Task): { path: string; branch: string } => ({ path: under(root, '.claude/worktrees', `run-${run.id}-${t.n}`), branch: `vaken-run/${run.id}-${t.n}` })


export const stateWordOf = (t: Task): string =>
  t.state === 'waiting' ? 'Waiting'
  : t.state === 'running' ? 'Running'
  : t.state === 'done' ? (reviewBusy(t) ? 'Reviewing' : t.check === 'passed' ? 'Checked' : t.check === 'failed' ? 'Check failed' : t.check === 'pending' || t.check === 'running' ? 'Checking' : 'Done')
  : t.state === 'failed' ? 'Failed'
  : t.state === 'stopped' ? 'Stopped'
  : 'Skipped'
// The chat answer keeps `stateWordOf` (English).
export const stateWordTr = (t: Task): string => tr(stateWordOf(t))
export const runNameOf = (run: { name: string }): string => (run.name === 'Task run' ? tr('Task run') : run.name)
export const kindOf = (t: Task): 'working' | 'waiting' | 'idle' | 'needs' =>
  t.state === 'running' || t.check === 'running' || t.review === 'running' ? 'working' : t.state === 'done' && t.check !== 'failed' ? 'waiting' : t.state === 'failed' || t.state === 'stopped' || t.check === 'failed' ? 'needs' : 'idle'

export const failedTasks = (run: Run | undefined): number => (run === undefined ? 0 : run.tasks.filter(t => kindOf(t) === 'needs').length)

// A failed task has finished but is not done; the summary under the bar says which is which.
export function runProgress(run: Run): { done: number; all: number; pct: number; busy: boolean } {
  const all = run.tasks.length
  const done = run.tasks.filter(ended).length
  return { done, all, pct: all === 0 ? 0 : Math.round((done / all) * 100), busy: run.status === 'running' && busy(run) > 0 }
}

// A skipped task is named, never counted as done.
export function runSummary(run: Run): string {
  const count = (f: (t: Task) => boolean): number => run.tasks.filter(f).length
  const ok = count(t => t.state === 'done' && t.check !== 'failed' && !checkBusy(t) && !reviewBusy(t))
  const bad = count(t => t.state === 'failed' || t.state === 'stopped' || t.check === 'failed')
  const skipped = count(t => t.state === 'skipped')
  const checking = count(t => t.state === 'done' && t.check !== 'failed' && (checkBusy(t) || reviewBusy(t)))
  const usd = runUsd(run)
  const cost = `${usd > 0 ? ` · ${aboutMoney(usd, tr)}` : ''}${run.smallFirst === true ? ` · ${tr(SMALL_FIRST_WORDS)}` : ''}`
  const total = String(run.tasks.length)
  if (run.status === 'setup') return (run.tasks.length === 1 ? tr('{n} task, not started') : tr('{n} tasks, not started')).replace('{n}', total)
  if (isFinished(run)) {
    const skipWord = skipped > 0 ? `, ${tr('{n} skipped').replace('{n}', String(skipped))}` : ''
    if (bad === 0 && skipped === 0) return `${tr('All {n} done').replace('{n}', total)}${cost}`
    const head = bad === 0 ? tr('{ok} done').replace('{ok}', String(ok)) : tr('{ok} of {n} done, {bad} need you').replace('{ok}', String(ok)).replace('{n}', total).replace('{bad}', String(bad))
    return `${head}${skipWord}${cost}`
  }
  const running = count(t => t.state === 'running')
  const waiting = count(t => t.state === 'waiting')
  const parts = [tr('{ok} of {n} done').replace('{ok}', String(ok)).replace('{n}', total), ...(running > 0 ? [tr('{n} running').replace('{n}', String(running))] : []), ...(checking > 0 ? [tr('{n} checking').replace('{n}', String(checking))] : []), ...(bad > 0 ? [tr('{n} need you').replace('{n}', String(bad))] : []), ...(skipped > 0 ? [tr('{n} skipped').replace('{n}', String(skipped))] : []), ...(waiting > 0 ? [tr('{n} waiting').replace('{n}', String(waiting))] : [])]
  const lead = run.status === 'paused' && run.costPause !== undefined && run.resumeAt === undefined ? `${tr('Paused: it cost more than {usd}.').replace('{usd}', money(run.costPause))} ` : run.status === 'paused' ? (run.resumeAt === undefined ? `${tr('Paused:')} ` : `${tr('Waits for the plan limit:')} `) : run.status === 'stopped' ? `${tr('Stopped:')} ` : ''
  return `${lead}${parts.join(', ')}${cost}`
}

export const FOLDER_WAITING = 'will work in a copy of your files'
export const FOLDER_RUNNING = 'works in a copy of your files'
export const FOLDER_DONE = 'worked in a copy of your files'
const folderWord = (t: Pick<Task, 'state'>): string => (t.state === 'waiting' ? FOLDER_WAITING : t.state === 'running' ? FOLDER_RUNNING : FOLDER_DONE)
export const MODEL_ORDER_NOTE = 'From cheaper to stronger: Haiku, Sonnet, Opus, Fable.'

// `roleModels` lets 'auto' name the model the role really gets. Without `T` the English comes back (the text twin).
export function taskDetail(t: Task, now: number, dur: (ms: number) => string, roleModels: Partial<Record<Role, string>> = {}, T: Tr = same): string {
  const time = t.startedAt === undefined ? '' : ` · ${t.state === 'running' ? dur(now - t.startedAt) : t.endedAt !== undefined ? dur(t.endedAt - t.startedAt) : ''}`
  const up = t.upFrom === undefined ? '' : ` · ${fillIn(T('up from {model}'), { model: t.upFrom })}`
  const model = t.model === 'auto' ? fillIn(T('auto ({model})'), { model: modelWord(modelFor('auto', t.role, roleModels)) }) : t.model
  return `${T(ROLES[t.role].label)} · ${model}${up}${t.after === undefined ? '' : ` · ${fillIn(T('after {n}'), { n: t.after })}`}${t.folder ? ` · ${T(folderWord(t))}` : ''}${time}${t.usd === undefined ? '' : ` · ${aboutMoney(t.usd, T)}`}`
}

export function taskFacts(t: Task, T: Tr = same): string[] {
  const kept = t.kept === 'kept' ? `, ${T('kept')}` : t.kept === 'thrown' ? `, ${T('thrown away')}` : ''
  const check = t.check === 'passed' ? 'Check: passed' : t.check === 'failed' ? 'Check: failed' : 'Check: not run yet'
  return [
    fillIn(T('Task: {text}'), { text: t.text }),
    `${fillIn(T('Role: {role}, model {model}'), { role: T(ROLES[t.role].label), model: t.model })}${t.ran === undefined ? '' : ` (${fillIn(T('ran on {model}'), { model: t.ran })})`}${t.tries > 1 ? `, ${fillIn(T('try {n}'), { n: t.tries })}` : ''}${t.upFrom === undefined ? '' : `, ${fillIn(T('one model up from {model} after a failure'), { model: t.upFrom })}`}`,
    ...(t.path === undefined ? [] : [`${fillIn(T('Folder copy: {path} (branch {branch})'), { path: t.path, branch: t.branch ?? '?' })}${kept}`]),
    ...(t.check === 'none' ? [] : [`${T(check)}${t.checkLine === undefined ? '' : ` (${t.checkLine})`}`]),
    ...(t.review === undefined ? [] : t.review === 'pending' || t.review === 'running' ? [T('Review: on its way')] : (t.reviewLines ?? []).map((l, k) => (k === 0 ? fillIn(T('Review: {text}'), { text: T(l) }) : `  ${T(l)}`))),
    ...(t.why === undefined ? [] : [fillIn(T('Why: {text}'), { text: T(t.why) })]),
    ...(t.usd === undefined ? [] : [fillIn(T('Cost: about {usd} (estimate)'), { usd: money(t.usd) })]),
  ]
}

const taskNumber = (what: string): number | undefined => {
  const m = /^\s*task\s*#?(\d+)\b/i.exec(what)
  return m === null ? undefined : Number(m[1])
}
export const isRunRow = (run: Run, r: BoardRow): boolean => run.tasks.some(t => t.agentId !== undefined && (t.agentId === r.agentId || t.agentId === r.id)) || (run.startedAt !== undefined && r.startedAt >= run.startedAt && taskNumber(r.what) !== undefined)

export const STEER_LINES = [
  '/vaken-tasks add <task>: adds a task to the run.',
  '/vaken-tasks set N role|model|after|folder|text <value>: changes a task that has not started.',
  '/vaken-tasks remove N: removes a task that has not started.',
  '/vaken-tasks start [anyway]: starts the run (anyway skips the cost warning).',
  '/vaken-tasks pause: no new agent starts; the running ones finish.',
  '/vaken-tasks go: goes on after a pause.',
  '/vaken-tasks stop: stops every agent of the run.',
  '/vaken-tasks stop N: stops one agent.',
  '/vaken-tasks retry N: runs a failed or stopped task again.',
  '/vaken-tasks again: runs the same tasks again as a new run, when the run has ended.',
  '/vaken-tasks keep N: keeps the work of task N on its branch and removes its folder copy.',
  '/vaken-tasks throw N: deletes the work and the branch of task N. It cannot be undone.',
  '/vaken-tasks say N <words>: sends words to a running agent.',
  '/vaken-tasks at auto|N: sets how many agents run at the same time.',
  '/vaken-tasks check <command>: sets the command that runs after each task.',
  '/vaken-tasks limit min|helper|run <number>: sets when an agent or the run is stopped.',
  '/vaken-tasks reviewer on|off: a reviewer reads each finished task.',
  '/vaken-tasks afterlimit go|wait: after a plan limit, go on by itself or wait for you.',
  '/vaken-tasks name <words>: names the run.',
  '/vaken-tasks template save|apply|delete <name>: keeps, loads or deletes a set of tasks.',
  '/vaken-tasks new | load | plan: writes an example task file, reads it, or asks Claude to write the plan.',
  '/vaken-tasks report | history: the last finished run, or all.',
  '/vaken-tasks clear: forgets a finished run.',
]

export function tasksText(run: Run | undefined, fileTasks: string[] | undefined, now: number, dur: (ms: number) => string, estimate: string[] = []): string {
  if (run === undefined) {
    if (fileTasks === undefined) return `No task list yet. /vaken-tasks new writes ${TASKS_FILE} with an example. Write one task per line, then /vaken-tasks start.`
    if (fileTasks.length === 0) return `${TASKS_FILE} has no open tasks. Write one task per line ("- Fix the header"), then /vaken-tasks start.`
    return [`${TASKS_FILE} has ${tEn('words.task', { n: fileTasks.length })}:`, ...fileTasks.map((t, k) => `  ${k + 1}. ${t}`), '/vaken-tasks start runs them with agents.'].join('\n')
  }
  const c = run.choices
  return [
    `${run.name}: ${runSummary(run)}.`,
    ...run.tasks.map(t => `  ${t.n}. ${stateWordOf(t)}: ${t.text} (${taskDetail(t, now, dur)})${t.why === undefined ? '' : `. ${t.why}`}`),
    `Choices: ${c.atOnce === AT_ONCE_AUTO ? 'auto' : c.atOnce} at once (never more than your own limit, if you set one); check ${c.check === '' ? 'none' : `"${c.check}"`}; stop an agent after ${c.helperMin} min or ${money(c.helperUsd)}; stop the run after ${money(c.runUsd)}.`,
    `Check hint: ${CHECK_HINT} (vaken does not know which files a task changed, so the check is run exactly as you wrote it.)`,
    ...estimate,
    '',
    'Steer (N is a task number):',
    ...STEER_LINES.map(l => `  ${l}`),
  ].join('\n')
}


export const editable = (t: Task): boolean => t.state === 'waiting' && t.agentId === undefined && t.askedAt === undefined

export function addTask(run: Run, line: string): Run {
  if (run.tasks.length >= TASKS_MAX || line.trim() === '') return run
  return { ...run, tasks: [...run.tasks, newTask(parseTaskLine(line, run.tasks.length + 1))], ...(run.status === 'done' ? { status: 'running' as const, told: false } : {}) }
}

// Numbers after the removed task move up and 'after' choices follow.
export function removeTask(run: Run, n: number): Run {
  const t = run.tasks.find(x => x.n === n)
  if (t === undefined || !editable(t)) return run
  const tasks = run.tasks
    .filter(x => x.n !== n)
    .map(x => {
      const { after, ...rest } = x
      const next = { ...rest, n: x.n > n ? x.n - 1 : x.n }
      return after === undefined || after === n ? next : { ...next, after: after > n ? after - 1 : after }
    })
  return { ...run, tasks }
}

export type TaskEdit = { role?: Role; model?: ModelPick; after?: number | null; folder?: boolean; text?: string }
export function editTask(run: Run, n: number, e: TaskEdit): Run {
  const t = run.tasks.find(x => x.n === n)
  if (t === undefined || !editable(t)) return run
  const role = e.role ?? t.role
  const { after: _old, ...rest } = t
  const asked = e.after === null ? undefined : (e.after ?? t.after)
  const after = asked !== undefined && (asked < 1 || asked >= n) ? t.after : asked
  const next: Task = {
    ...rest,
    role,
    model: e.model ?? t.model,
    folder: ROLES[role].writes && (e.folder ?? (e.role !== undefined && ROLES[e.role].writes && !ROLES[t.role].writes ? true : t.folder)),
    text: e.text === undefined || e.text.trim() === '' ? t.text : cut(e.text.trim(), TASK_WORDS_MAX),
    ...(after === undefined || after < 1 || after >= n ? {} : { after }),
  }
  return { ...run, tasks: run.tasks.map(x => (x.n === n ? next : x)) }
}

export function editChoices(run: Run, c: Partial<Choices>): Run {
  return { ...run, choices: parseChoices({ ...run.choices, ...c }) }
}

export const TEMPLATES_KEY = 'cockpit:runner:templates'
const TEMPLATES_MAX = 20
type Template = { tasks: string[]; choices: Choices }
export const taskLine = (t: Task): string => {
  const tags = [t.role === 'builder' ? '' : t.role, t.model === 'auto' ? '' : t.model, t.after === undefined ? '' : `after ${t.after}`, ROLES[t.role].writes && !t.folder ? 'shared' : ''].filter(x => x !== '')
  return tags.length === 0 ? t.text : `${t.text} (${tags.join(', ')})`
}
export function parseTemplates(raw: unknown): Record<string, Template> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Record<string, Template> = {}
  for (const [name, v] of Object.entries(raw).slice(0, TEMPLATES_MAX)) {
    const o = v as Partial<Template> | null
    if (typeof o !== 'object' || o === null || !Array.isArray(o.tasks)) continue
    const tasks = o.tasks.filter((x): x is string => typeof x === 'string').slice(0, TASKS_MAX)
    if (tasks.length > 0) out[cut(name, 40)] = { tasks, choices: parseChoices(o.choices) }
  }
  return out
}
export const templateOf = (run: Run): Template => ({ tasks: run.tasks.map(taskLine), choices: run.choices })

export const PLAN_PROMPT = [
  `Please write the plan we agreed on as a task list in ${TASKS_FILE}: one task per line, each line starting with "- [ ] ".`,
  'Each task must be something one agent can do alone. After a task you may add choices in brackets: a role (researcher, builder, reviewer, fixer), a model (cheap, normal, strong), "after N" when it needs task N first, "shared" when it needs no folder copy of its own.',
  'Write only the file, then say how many tasks it has. Do not start any agent.',
].join('\n')


const REVIEW_LINES = 3
const REVIEW_LINE_MAX = 160

export function afterCheck(run: Run, n: number, passed: boolean, line: string): Run {
  return withTask(run, n, { check: passed ? 'passed' : 'failed', checkLine: line, ...(passed && run.choices.reviewer ? { review: 'pending' as const } : {}) })
}

export function nextReviews(run: Run, now = 0): Task[] {
  if (run.status !== 'running') return []
  const room = (run.choices.atOnce === AT_ONCE_AUTO ? Infinity : run.choices.atOnce) - busy(run)
  const asked = run.tasks.filter(t => t.review === 'pending' && t.reviewAskedAt !== undefined && now - t.reviewAskedAt < ASK_WAIT_MS).length
  return run.tasks.filter(t => t.review === 'pending' && (t.reviewAskedAt === undefined || now - t.reviewAskedAt >= ASK_WAIT_MS)).slice(0, Math.max(0, room - asked))
}

export const reviewCode = (run: Run, t: Task): string => `vaken-review ${run.id}-${t.n}`
export const reviewDescription = (t: Task): string => `Review ${t.n}: ${cut(t.text, 40)}`

export function reviewPrompt(t: Task): string {
  const where =
    t.path !== undefined && t.base !== undefined ? `The work is in the folder ${t.path}, on branch ${t.branch ?? 'of its own'}. See it with: git -C ${t.path} log --oneline ${t.base}..HEAD and git -C ${t.path} diff ${t.base}..HEAD (and git -C ${t.path} diff for what is not committed).`
    : t.path !== undefined ? `The work is in the folder ${t.path}. See it with: git -C ${t.path} diff HEAD and git -C ${t.path} log -3.`
    : 'The work is in the project folder. See it with: git diff and git log -3.'
  return [
    `You review the work of task ${t.n} of a task list. The task was: ${t.text}`,
    where,
    'Do not change any file. Answer in exactly 3 short lines:',
    '1. Good or not good, in a few words.',
    '2. The main risk.',
    '3. What the person should check by hand.',
  ].join('\n')
}

export function reviewForSpawn(run: Run, prompt: string): Task | undefined {
  const code = /vaken-review\s+([a-z0-9]+)-(\d+)/i.exec(prompt)
  if (code === null || code[1] !== run.id) return undefined
  const t = run.tasks.find(x => x.n === Number(code[2]))
  return t !== undefined && t.review === 'pending' ? t : undefined
}
export const taskOfReview = (run: Run, agentId: string): Task | undefined => run.tasks.find(t => t.reviewAgent === agentId)

export function endReview(run: Run, agentId: string, ok: boolean, answer: string): Run {
  const t = taskOfReview(run, agentId)
  if (t === undefined || t.review !== 'running') return run
  const lines = answer
    .split(/\r?\n/)
    .map(l => l.replace(/^\s*(?:\d+[.)]|[-*])\s*/, '').trim())
    .filter(l => l !== '')
    .slice(0, REVIEW_LINES)
    .map(l => cut(l, REVIEW_LINE_MAX))
  return withTask(run, t.n, ok && lines.length > 0 ? { review: 'done', reviewLines: lines } : { review: 'failed', reviewLines: [ok ? 'The reviewer gave no words.' : 'The reviewer did not finish.'] })
}


// The pane reads these words to ask again with the count.
export const THROW_HOLD = 'Not thrown away:'
// `commits`: commits the current branch lacks (undefined: could not be counted). `dirty`: changed, uncommitted files.
export function throwHoldText(n: number, commits: number | undefined, dirty: number): string {
  const lost = [
    commits === undefined ? 'commits that could not be counted' : commits > 0 ? `${tEn('words.commit', { n: commits })} that the branch you are on does not have` : '',
    dirty > 0 ? `${tEn('words.changed_files_uncommitted', { n: dirty })}` : '',
  ].filter(x => x !== '')
  return `${THROW_HOLD} task ${n} holds ${lost.join(' and ')}. Throwing away loses ${lost.length === 1 && commits !== undefined && commits > 0 ? 'it' : 'them'} for good. Type /vaken-tasks throw ${n} yes to do it anyway, or keep the work with /vaken-tasks keep ${n}.`
}
