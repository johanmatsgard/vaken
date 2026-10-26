// The task runner: pure rules and words. Starts helper agents itself, in a git worktree when a task writes code, checks each task at its end and stops helpers that run too long or cost too much. Only the person starts a run.
import { under } from './platform'
import { dur, modelWord, wholeParts } from './agentboard'
import type { BoardRow } from './agentboard'
import { t as tx, tr } from './lang'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import { SMALL_FIRST_WORDS } from './planfit'
import { MODEL_OPTIONS, familyIn, stepUp } from './models'
import type { Family } from './models'
import { aboutEstimate, aboutMoney, money } from './prices'
import type { Setting } from './settings'
import { langNow, trFill } from '../i18n/t'
import { fmt } from './fmt'
import { hhmm } from './time'
import { sysWord } from './syswords'
import type { WordSystem } from './syswords'
import { parseNight } from './night'
import type { Night } from './night'

export const TASKS_FILE = '.claude/cockpit-tasks.md'
export const ORCH_KEY = (sessionId: string): string => `cockpit:orch:${sessionId}`
export const TASKS_MAX = 20
// A task's words are a sentence: kept whole and wrapped on its row; this only keeps the store sane
export const TASK_WORDS_MAX = 500
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
// `about` is written into the role's agent file too (agents/*.md): change both together.
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

// The four roles are plain agent files of the plugin (agents/*.md), installed under the plugin's name.
export const roleType = (r: Role): string => `vaken:${r}` // en-only: the name of a Claude Code agent type

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
  asks?: number // how often Claude was asked to start it; ASK_MAX at most
  base?: string // for the review's diff
  review?: ReviewState
  reviewAgent?: string
  reviewAskedAt?: number
  reviewAsks?: number
  reviewSeenAt?: number // its words should follow at once
  reviewLines?: string[]
  ran?: string
  upFrom?: string
}
type ReviewState = 'pending' | 'running' | 'done' | 'failed'
// `nightUsd` 0: a night run pauses at `runUsd`.
type Choices = { atOnce: number; check: string; reviewer: boolean; helperMin: number; helperUsd: number; runUsd: number; afterLimit: 'go' | 'wait'; nightUsd: number }
export const DEFAULT_CHOICES: Choices = { atOnce: AT_ONCE_AUTO, check: '', reviewer: false, helperMin: 30, helperUsd: 2, runUsd: 10, afterLimit: 'wait', nightUsd: 0 }
type RunStatus = 'setup' | 'running' | 'paused' | 'done' | 'stopped'
// Helpers are started by Claude: vaken asks in a message that carries each helper's brief, type, model and folder. `replans` counts waits planned again because a window still read full.
export type Run = { id: string; name: string; status: RunStatus; createdAt: number; startedAt?: number; tasks: Task[]; choices: Choices; told?: boolean; resumeAt?: number; replans?: number; smallFirst?: true; atNow?: { n: number; room: boolean }; costPause?: number; night?: Night }

const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export function parseTaskLine(line: string, n: number): Omit<Task, 'state' | 'tries' | 'check'> {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(line)
  const words = (m === null ? line : m[1]).replace(/\s+/g, ' ').trim()
  const tags = m === null ? [] : m[2].split(',').map(t => t.trim().toLowerCase())
  const role = (ROLE_NAMES.find(r => tags.includes(r)) ?? 'builder') as Role
  const model = (MODEL_PICKS.find(p => tags.includes(p)) ?? 'auto') as ModelPick
  const after = tags.map(t => /^after\s+(\d+)$/.exec(t)).find(x => x !== null)
  const shared = tags.includes('shared') || tags.includes('no folder') // en-only: a choice word of the task file, matched in English
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

// en-only: the task file the person edits and vaken reads: its choice words are matched in English
export const TEMPLATE = `# Tasks for the helper agents

One task per line. Vaken runs them with helper agents, as many at a time as this Mac has room for by default (or the limit you set under Settings > Agents, or "at N").
After a task you may add choices in brackets: a role (researcher, builder, reviewer, fixer),
a model (cheap, normal, strong, auto), "after 2" to wait for task 2, "shared" for no folder copy.
Start the run with /vaken-tasks start, or from the Agents card. Ticked lines ([x]) are skipped.

- [ ] Write the first task here
- [ ] Write the second task here (researcher, cheap)
`

// The task file vaken writes: on Windows its room line says "this PC" (core/syswords.ts).
const ROOM_WORDS = 'as many at a time as this Mac has room for' // en-only: a key of core/syswords.ts, swapped for its PC twin
export const templateFor = (sys: WordSystem): string => TEMPLATE.replace(ROOM_WORDS, sysWord(ROOM_WORDS, sys))

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
  for (const key of ['startedAt', 'endedAt', 'usd', 'holdUntil', 'askedAt', 'reviewAskedAt', 'reviewSeenAt', 'asks', 'reviewAsks'] as const) if (isNum(o[key])) t[key] = o[key]
  for (const key of ['agentId', 'path', 'branch', 'checkLine', 'why', 'base', 'reviewAgent', 'ran', 'upFrom'] as const) if (typeof o[key] === 'string') t[key] = o[key]
  // A reason kept by an older version may hold a program's own text: it is read into plain words
  if (t.why !== undefined) t.why = plainProgram(t.why)
  if (t.checkLine !== undefined) t.checkLine = plainProgram(t.checkLine, 'check')
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
    // A saved run keeps its own choice (a new one starts at Wait); one saved before the choice existed went on by itself then
    afterLimit: o.afterLimit === 'wait' ? 'wait' : 'go',
    nightUsd: num(o.nightUsd, 0, 0, 10_000),
  }
}

// A run from the first version is not read; it starts again from the file.
export function parseRun(raw: unknown): Run | undefined {
  const o = raw as Partial<Run> | null
  if (typeof o !== 'object' || o === null || !Array.isArray(o.tasks) || typeof o.id !== 'string' || !isNum(o.createdAt)) return undefined
  const tasks = o.tasks.slice(0, TASKS_MAX).map(parseTask).filter((t): t is Task => t !== undefined).map((t, k) => ({ ...t, n: k + 1 }))
  if (tasks.length === 0) return undefined
  return { id: o.id, name: typeof o.name === 'string' && o.name !== '' ? cut(o.name, 40) : 'Task run', status: oneOf(o.status, STATUSES, 'setup'), createdAt: o.createdAt, ...(isNum(o.startedAt) ? { startedAt: o.startedAt } : {}), tasks, choices: parseChoices(o.choices), ...(o.told === true ? { told: true } : {}), ...(isNum(o.resumeAt) ? { resumeAt: o.resumeAt } : {}), ...(isNum(o.replans) ? { replans: o.replans } : {}), ...(o.smallFirst === true ? { smallFirst: true as const } : {}), ...(isNum(o.costPause) ? { costPause: o.costPause } : {}), ...(parseNight(o.night) === undefined ? {} : { night: parseNight(o.night) as Night }), ...(typeof o.atNow === 'object' && o.atNow !== null && isNum(o.atNow.n) ? { atNow: { n: o.atNow.n, room: o.atNow.room === true } } : {}) }
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
  run.tasks.filter(t => t.state === 'waiting' && gate(run, t) === 'go' && (t.holdUntil === undefined || t.holdUntil <= now) && (t.askedAt === undefined || now - t.askedAt >= ASK_WAIT_MS) && (t.asks ?? 0) < ASK_MAX)
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
export const ASK_WAIT_MS = 2 * 60_000
// Claude is asked this many times to start a helper; then the task waits for Go on.
export const ASK_MAX = 3
const ASKED_OUT_START = 'waits: Claude was asked' // en-only: the start of a reason stored on the task, matched in code
export const ASKED_OUT = (n: number): string => `${ASKED_OUT_START} ${n} times and did not start it. Go on asks again.` // en-only: stored on the task; the pane says it by its row
// Go on asks again from the start.
export function askAfresh(run: Run): Run {
  const tasks = run.tasks.map(t => {
    if (t.asks === undefined && t.reviewAsks === undefined) return t
    const { asks: _a, reviewAsks: _r, askedAt: _q, reviewAskedAt: _rq, why, ...rest } = t
    return why === undefined || why.startsWith(ASKED_OUT_START) ? rest : { ...rest, why }
  })
  return { ...run, tasks }
}

// Claude starts each helper: vaken asks in a message that carries all the helper needs. Each brief starts with a short exact code; the agent.spawn watch finds the task by it.
const taskCode = (run: Run, t: Task): string => `vaken-task ${run.id}-${t.n}`
export const taskBrief = (run: Run, t: Task): string => `${taskCode(run, t)}\n${taskPrompt(t)}`
export const reviewBrief = (run: Run, t: Task): string => `${reviewCode(run, t)}\n${reviewPrompt(t)}`
const BRIEF_LINE = '---'
const oneAsk = (k: number, description: string, type: string, model: string, folder: string | undefined, brief: string): string[] => [
  '',
  `Agent ${k}`, // en-only: a prompt for Claude, sent in English
  `- description: ${description}`, // en-only: a prompt for Claude, sent in English
  `- subagent_type: ${type}`, // en-only: a prompt for Claude, sent in English
  `- model: ${model}`, // en-only: a prompt for Claude, sent in English
  ...(folder === undefined ? [] : [`- cwd (the folder it works in): ${folder}`]), // en-only: a prompt for Claude, sent in English
  '- prompt: the lines between the two --- lines, exactly as written', // en-only: a prompt for Claude, sent in English
  BRIEF_LINE,
  brief,
  BRIEF_LINE,
]
// `roleModels`: the person's model for each role (Settings > Task runner).
export function askPrompt(run: Run, tasks: Task[], reviews: Task[] = [], roleModels: Partial<Record<Role, string>> = {}): string {
  const n = tasks.length + reviews.length
  return [
    `Please start ${n === 1 ? 'this agent' : `these ${n} agents`} for my task run now: one Agent call each, in the background, with exactly these values.`, // en-only: a prompt for Claude, sent in English
    ...tasks.flatMap((t, k) => oneAsk(k + 1, `Task ${t.n}`, roleType(t.role), modelFor(t.model, t.role, roleModels), t.path, taskBrief(run, t))),
    ...reviews.flatMap((t, k) => oneAsk(tasks.length + k + 1, `Review ${t.n}`, roleType('reviewer'), modelFor('auto', 'reviewer', roleModels), t.path, reviewBrief(run, t))),
    '',
    'Then wait: each agent reports back to you when it is done.', // en-only: a prompt for Claude, sent in English
  ].join('\n')
}

// Claude stops a helper: vaken asks in a message with each helper's id. `why` is said in the message, in plain words.
export type StopAsk = { n: number; agentId: string; review?: boolean }
export function stopPrompt(stops: StopAsk[], why: string): string {
  return [
    `Please stop ${stops.length === 1 ? 'this agent' : `these ${stops.length} agents`} of my task run now (${why}): stop each background agent by its id.`, // en-only: a prompt for Claude, sent in English
    ...stops.map(s => `- ${s.review === true ? 'Review' : 'Task'} ${s.n}: agent id ${s.agentId}`), // en-only: a prompt for Claude, sent in English
  ].join('\n')
}

export function taskForSpawn(run: Run, description: string, prompt = ''): Task | undefined {
  if (run.status !== 'running' && run.status !== 'paused') return undefined
  const code = /(?:vaken|cockpit)-task\s+([a-z0-9]+)-(\d+)/i.exec(prompt) // legacy: a run started before the rename
  // Only the code binds: an agent you start yourself, even one named "Task 2", never joins the run
  const n = code !== null && code[1] === run.id ? Number(code[2]) : undefined
  const t = n === undefined ? undefined : run.tasks.find(x => x.n === n)
  return t !== undefined && t.state === 'waiting' ? t : undefined
}
export const HOLD_MS = 60_000

// A program's own error text (a spawn error, a stack, a hook's time-out) never reaches the person: each kind is said in plain words, which the pane translates.
export const PROG_NO_START = 'the agent did not start: its program was not found'
export const PROG_SLOW_START = 'the agent did not start in time'
export const PROG_NOT_STARTED = 'the agent did not start'
export const PROG_HOOK_SLOW = 'waits: a hook took too long to answer'
export const CHECK_NO_START = 'the check could not start: its program was not found'
export const CHECK_SLOW = 'the check did not finish in time'
export const CHECK_NO_RUN = 'the check could not run'
// `thrown`: the text came from a thrown error, so whatever it says is never shown as is
export const plainThrown = (text: string, kind: 'why' | 'check'): string => {
  const p = plainProgram(text, kind)
  return p !== text ? p : kind === 'check' ? CHECK_NO_RUN : PROG_NOT_STARTED
}
const RAW_NOT_FOUND = /ENOENT|posix_spawn|failed to start|command not found|not recognized as|executable file not found/i
const RAW_SLOW = /ETIMEDOUT|timed out|time-?out/i
const RAW_STACK = /\bat \S+ \(|node:internal|\bError: |\b[A-Z][A-Z_]{3,}\b: /
export function plainProgram(text: string, kind: 'why' | 'check' = 'why'): string {
  if (kind === 'check') return RAW_NOT_FOUND.test(text) ? CHECK_NO_START : RAW_SLOW.test(text) && RAW_STACK.test(text) ? CHECK_SLOW : text
  if (/hook timed out|hook.{0,40}time-?out/i.test(text)) return PROG_HOOK_SLOW
  const start = /did not start/i.test(text)
  if (RAW_NOT_FOUND.test(text)) return PROG_NO_START
  if (RAW_SLOW.test(text) && (start || RAW_STACK.test(text))) return PROG_SLOW_START
  if (RAW_STACK.test(text)) return PROG_NOT_STARTED
  return text
}

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
export const runCost = (run: Run, live?: LiveCost): number => runUsd(run, live)
export const runOverBudget = (run: Run, live?: LiveCost): boolean => runUsd(run, live) > run.choices.runUsd
// Go on past the run's cost limit allows one more limit's worth, or it pauses again at once.
export function goOnBudget(run: Run, live?: LiveCost): number | undefined {
  if (!runOverBudget(run, live)) return undefined
  return Math.ceil((runUsd(run, live) + run.choices.runUsd) * 100) / 100
}
// Folder copies that were neither kept nor thrown away.
export const openFolders = (run: Run): Task[] => run.tasks.filter(t => t.path !== undefined && t.kept === undefined)

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
  const { agentId: _a, startedAt: _s, endedAt: _e, why: _w, checkLine: _c, review: _r, reviewAgent: _ra, reviewLines: _rl, reviewAskedAt: _rq, asks: _q, reviewAsks: _rq2, ...kept } = t
  // A kept or thrown folder copy is gone: the task gets a new one, on its kept branch or a fresh one.
  const { path: _p, kept: _k, ...noFolder } = kept
  const { branch: _b, base: _ba, ...noBranch } = noFolder
  const rest = t.kept === 'thrown' ? noBranch : t.kept === 'kept' ? noFolder : kept
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
    !ROLES[t.role].writes ? 'Do not change any file.' // en-only: a prompt for an agent, sent in English
    : t.path !== undefined ? `Work only in this folder: ${t.path}. It is your own copy of the project, on branch ${t.branch ?? 'of its own'}. When you are done, commit your changes there with a short message.`
    : 'Work in the project folder. Other agents may work at the same time: change only what this task needs.' // en-only: a prompt for an agent, sent in English
  return [`You are the agent for task ${t.n} of a task list.`, `The task: ${t.text}`, where, 'End with a short report of at most 8 lines: what you did, what you checked, and what is left.'].join('\n') // en-only: a prompt for an agent, sent in English
}

export const folderOf = (root: string, run: Run, t: Task): { path: string; branch: string } => ({ path: under(root, '.claude/worktrees', `run-${run.id}-${t.n}`), branch: `vaken-run/${run.id}-${t.n}` })


export const stateWordOf = (t: Task): string =>
  t.state === 'waiting' ? 'Waiting'
  : t.state === 'running' ? 'Running'
  : t.state === 'done' ? (reviewBusy(t) ? 'Reviewing' : t.check === 'passed' ? 'Checked' : t.check === 'failed' ? 'Check failed' : t.check === 'pending' || t.check === 'running' ? 'Checking' : 'Done')
  : t.state === 'failed' ? 'Failed'
  : t.state === 'stopped' ? 'Stopped'
  : 'Skipped'
// The chat answer keeps `stateWordOf` (English). A stopped task is "Stoppad" in Swedish, as its count says ("1 stoppad"), by its own row (a stopped step stays "Stoppat")
export const stateWordTr = (t: Task): string => (t.state === 'stopped' ? tx('toast.task_stopped') : tr(stateWordOf(t)))
export const runNameOf = (run: { name: string }): string => (run.name === 'Task run' ? tr('Task run') : run.name)
export const kindOf = (t: Task): 'working' | 'waiting' | 'idle' | 'needs' =>
  t.state === 'running' || t.check === 'running' || t.review === 'running' ? 'working' : t.state === 'done' && t.check !== 'failed' ? 'waiting' : isFailed(t) ? 'needs' : 'idle'

// Only a failure waits on the person: a task they (or a limit) stopped is Stopped, on the plain idle ring.
const isFailed = (t: Task): boolean => t.state === 'failed' || t.check === 'failed'
const isDone = (t: Task): boolean => t.state === 'done' && t.check !== 'failed' && !checkBusy(t) && !reviewBusy(t)
// The one count the bar, the summary and the card's header all read.
export type RunCount = { all: number; done: number; failed: number; stopped: number; skipped: number; running: number; checking: number; waiting: number }
export function runCount(run: Run): RunCount {
  const count = (f: (t: Task) => boolean): number => run.tasks.filter(f).length
  return {
    all: run.tasks.length,
    done: count(isDone),
    failed: count(isFailed),
    stopped: count(t => t.state === 'stopped'),
    skipped: count(t => t.state === 'skipped'),
    running: count(t => t.state === 'running'),
    checking: count(t => t.state === 'done' && t.check !== 'failed' && (checkBusy(t) || reviewBusy(t))),
    waiting: count(t => t.state === 'waiting'),
  }
}

export const failedTasks = (run: Run | undefined): number => (run === undefined ? 0 : runCount(run).failed)

// The fill is the done tasks out of all, the same count the summary says.
export function runProgress(run: Run): { done: number; all: number; pct: number; busy: boolean } {
  const { all, done } = runCount(run)
  return { done, all, pct: all === 0 ? 0 : Math.round((done / all) * 100), busy: run.status === 'running' && busy(run) > 0 }
}

// A skipped task is named, never counted as done. `withDone` false leaves out "1 of 3 done" where the bar line above already says it;
// `withFailed` false leaves out "1 failed" where the card's header already says it. The money says it is an estimate.
export function runSummary(run: Run, withDone = true, withFailed = true): string {
  const c = runCount(run)
  const usd = runUsd(run)
  const costs = [...(usd > 0 ? [aboutEstimate(usd, tr)] : []), ...(run.smallFirst === true ? [tr(SMALL_FIRST_WORDS)] : [])]
  const total = String(c.all)
  if (run.status === 'setup') return (c.all === 1 ? tr('{n} task, not started') : tr('{n} tasks, not started')).replace('{n}', total)
  const n = (words: string, k: number): string[] => (k > 0 ? [tr(words).replace('{n}', String(k))] : [])
  const finished = isFinished(run)
  const head = finished && c.done === c.all ? [tr('All {n} done').replace('{n}', total)] : [tr('{ok} of {n} done').replace('{ok}', String(c.done)).replace('{n}', total)]
  const parts = [...(withDone ? head : []), ...n('{n} running', c.running), ...n('{n} checking', c.checking), ...(withFailed ? n('{n} failed', c.failed) : []), ...(c.stopped > 0 ? [tx('truth.run_n_stopped', { n: c.stopped })] : []), ...n('{n} skipped', c.skipped), ...n('{n} waiting', c.waiting)]
  const lead = finished ? '' : run.status === 'paused' && run.night?.wait === 'power' ? `${tr('Night run waits for mains power:')} ` : run.status === 'running' && run.night !== undefined ? `${tr('Night run:')} ` : run.status === 'paused' && run.costPause !== undefined && run.resumeAt === undefined ? `${tr('Paused: it cost more than {usd}.').replace('{usd}', money(run.costPause))} ` : run.status === 'paused' ? (run.resumeAt === undefined ? `${tr('Paused:')} ` : `${tr('Waits for the plan limit, goes on at {time}:').replace('{time}', hhmm(run.resumeAt))} `) : run.status === 'stopped' ? `${tr('Stopped:')} ` : ''
  const said = parts.length > 0 ? parts.join(', ') : costs.length > 0 ? '' : head[0]
  return `${lead}${[said, ...costs].filter(x => x !== '').join(' · ')}`
}

export const FOLDER_WAITING = 'will work in a copy of your files'
export const FOLDER_RUNNING = 'works in a copy of your files'
export const FOLDER_DONE = 'worked in a copy of your files'
const folderWord = (t: Pick<Task, 'state'>): string => (t.state === 'waiting' ? FOLDER_WAITING : t.state === 'running' ? FOLDER_RUNNING : FOLDER_DONE)
export const MODEL_ORDER_NOTE = 'From cheaper to stronger: Haiku, Sonnet, Opus, Fable.'

// `roleModels` lets 'auto' name the model the role really gets. Without `T` the English comes back (the text twin). The time stands in the row's right column
// (taskAge); an ended task says how long it took here. `max`: whole parts go, the least needed first (wholeParts), never a part cut in two.
export function taskDetail(t: Task, _now: number, dur: (ms: number) => string, roleModels: Partial<Record<Role, string>> = {}, T: Tr = same, max?: number): string {
  const took = t.state !== 'running' && t.startedAt !== undefined && t.endedAt !== undefined ? fillIn(T('took {d}'), { d: dur(t.endedAt - t.startedAt) }) : undefined
  const model = t.model === 'auto' ? fillIn(T('auto ({model})'), { model: modelWord(modelFor('auto', t.role, roleModels)) }) : t.model
  // The model goes first when the line is too long, so the cost and the time stay at 288 pt
  const parts: (readonly [string, number])[] = [
    [T(ROLES[t.role].label), 0],
    [model, 7],
    ...(t.upFrom === undefined ? [] : [[fillIn(T('up from {model}'), { model: t.upFrom }), 4] as const]),
    ...(t.after === undefined ? [] : [[fillIn(T('after {n}'), { n: t.after }), 5] as const]),
    // Before it ends, where it works is worth keeping; after, the time and cost come first
    ...(t.folder ? [[T(folderWord(t)), t.state === 'waiting' || t.state === 'running' ? 0 : 6] as const] : []),
    ...(took === undefined ? [] : [[took, 3] as const]),
    ...(t.usd === undefined ? [] : [[aboutMoney(t.usd, T), 2] as const]),
  ]
  return wholeParts(parts, max)
}
// The right column of a task row: a running task's time so far, an ended one's coarse age ("17 min ago", "6 h ago"), whole on one line
export const taskAge = (t: Task, now: number, T: Tr = same): string | undefined =>
  t.startedAt === undefined ? undefined : t.state === 'running' ? dur(now - t.startedAt) : t.endedAt === undefined ? undefined : fmt.ago(now - t.endedAt, 'days', T === same ? 'en' : langNow())

export function taskFacts(t: Task, T: Tr = same): string[] {
  const kept = t.kept === 'kept' ? `, ${T('kept')}` : t.kept === 'thrown' ? `, ${T('thrown away')}` : ''
  const check = t.check === 'passed' ? 'Check: passed' : t.check === 'failed' ? 'Check: failed' : 'Check: not run yet'
  return [
    fillIn(T('Task: {text}'), { text: t.text }),
    `${fillIn(T('Role: {role}, model {model}'), { role: T(ROLES[t.role].label), model: t.model })}${t.ran === undefined ? '' : ` (${fillIn(T('ran on {model}'), { model: t.ran })})`}${t.tries > 1 ? `, ${fillIn(T('try {n}'), { n: t.tries })}` : ''}${t.upFrom === undefined ? '' : `, ${fillIn(T('one model up from {model} after a failure'), { model: t.upFrom })}`}`,
    ...(t.path === undefined ? [] : [`${fillIn(T('Folder copy: {path} (branch {branch})'), { path: t.path, branch: t.branch ?? '?' })}${kept}`]),
    ...(t.check === 'none' ? [] : [`${T(check)}${t.checkLine === undefined ? '' : ` (${T(t.checkLine)})`}`]),
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
  '/vaken-tasks keep all | throw all yes: keeps or deletes every folder copy left. Clear and Run again wait for it.',
  '/vaken-tasks say N <words>: sends words to a running agent.',
  '/vaken-tasks at auto|N: sets how many agents run at the same time.',
  '/vaken-tasks check <command>: sets the command that runs after each task.',
  '/vaken-tasks limit min|helper|run|night <number>: sets when an agent or the run is stopped (night 0: a night run uses the run limit).',
  '/vaken-tasks night: starts the run as a night run (setting night.mode): only on mains power, inside the plan limit and the night cost limit, with strict safety.',
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
    if (fileTasks === undefined) return fillIn(tr('No task list yet. /vaken-tasks new writes {file} with an example. Write one task per line, then /vaken-tasks start.'), { file: TASKS_FILE })
    if (fileTasks.length === 0) return fillIn(tr('{file} has no open tasks. Write one task per line ("- Fix the header"), then /vaken-tasks start.'), { file: TASKS_FILE })
    return [fillIn(tr('{file} has {what}:'), { file: TASKS_FILE, what: tx('words.task', { n: fileTasks.length }) }), ...fileTasks.map((t, k) => `  ${k + 1}. ${t}`), tr('/vaken-tasks start runs them with agents.')].join('\n')
  }
  const c = run.choices
  return [
    `${runNameOf(run)}: ${runSummary(run)}.`,
    // A reason is stored in English and said here
    ...run.tasks.map(t => `  ${t.n}. ${stateWordTr(t)}: ${t.text} (${taskDetail(t, now, dur, {}, tr)})${t.why === undefined ? '' : `. ${trFill(t.why)}`}`),
    fillIn(tr('Choices: {atOnce} at once (never more than your own limit, if you set one); check {check}; stop an agent after {min} min or {helperUsd}; stop the run after {runUsd}; a night run pauses past {nightUsd}.'), { atOnce: c.atOnce === AT_ONCE_AUTO ? tr('auto') : c.atOnce, check: c.check === '' ? tr('none') : `"${c.check}"`, min: c.helperMin, helperUsd: money(c.helperUsd), runUsd: money(c.runUsd), nightUsd: money(c.nightUsd > 0 ? c.nightUsd : c.runUsd) }),
    fillIn(tr('Check hint: {hint} (vaken does not know which files a task changed, so the check is run exactly as you wrote it.)'), { hint: tr(CHECK_HINT) }),
    ...estimate,
    '',
    tr('Steer (N is a task number):'),
    ...STEER_LINES.map(l => `  ${tr(l)}`),
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
  'Each task must be something one agent can do alone. After a task you may add choices in brackets: a role (researcher, builder, reviewer, fixer), a model (cheap, normal, strong), "after N" when it needs task N first, "shared" when it needs no folder copy of its own.', // en-only: a prompt for an agent, sent in English
  'Write only the file, then say how many tasks it has. Do not start any agent.', // en-only: a prompt for an agent, sent in English
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
  return run.tasks.filter(t => t.review === 'pending' && (t.reviewAsks ?? 0) < ASK_MAX && (t.reviewAskedAt === undefined || now - t.reviewAskedAt >= ASK_WAIT_MS)).slice(0, Math.max(0, room - asked))
}

export const reviewCode = (run: Run, t: Task): string => `vaken-review ${run.id}-${t.n}`
export const reviewDescription = (t: Task): string => `Review ${t.n}: ${cut(t.text, 40)}`

export function reviewPrompt(t: Task): string {
  const where =
    t.path !== undefined && t.base !== undefined ? `The work is in the folder ${t.path}, on branch ${t.branch ?? 'of its own'}. See it with: git -C ${t.path} log --oneline ${t.base}..HEAD and git -C ${t.path} diff ${t.base}..HEAD (and git -C ${t.path} diff for what is not committed).`
    : t.path !== undefined ? `The work is in the folder ${t.path}. See it with: git -C ${t.path} diff HEAD and git -C ${t.path} log -3.`
    : 'The work is in the project folder. See it with: git diff and git log -3.' // en-only: a prompt for an agent, sent in English
  return [
    `You review the work of task ${t.n} of a task list. The task was: ${t.text}`,
    where,
    'Do not change any file. Answer in exactly 3 short lines:', // en-only: a prompt for an agent, sent in English
    '1. Good or not good, in a few words.', // en-only: a prompt for an agent, sent in English
    '2. The main risk.', // en-only: a prompt for an agent, sent in English
    '3. What the person should check by hand.', // en-only: a prompt for an agent, sent in English
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
    commits === undefined ? tr('commits that could not be counted') : commits > 0 ? fillIn(tr('{what} that the branch you are on does not have'), { what: tx('words.commit', { n: commits }) }) : '',
    dirty > 0 ? tx('words.changed_files_uncommitted', { n: dirty }) : '',
  ].filter(x => x !== '')
  const loses = lost.length === 1 && commits !== undefined && commits > 0 ? tr('Throwing away loses it for good.') : tr('Throwing away loses them for good.')
  return `${tr(THROW_HOLD)} ${fillIn(tr('task {n} holds {lost}. {loses} Type /vaken-tasks throw {n} yes to do it anyway, or keep the work with /vaken-tasks keep {n}.'), { n, lost: lost.join(` ${tr('and')} `), loses })}`
}
