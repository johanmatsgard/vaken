// Repeat to skill: the same routine after a person prompt, seen 3 times in a project within 14 days, becomes one calm offer to save it as a skill.
// Only the shape is kept: the kinds of steps in order (tests, an edit of code, a commit), hashed. Never a prompt, a command, a file name or any words of the session. Pure.
import { hashOf } from './proof'
import { commandKind } from './happened'
import { isEditTool, isShellTool } from './tools'

const DAY = 86_400_000
export const REPEAT_AFTER = 3
export const REPEAT_WINDOW_MS = 14 * DAY
// "Not now" quiets that shape for 14 days; a drafted skill is not offered again for 90.
export const REPEAT_QUIET_MS = 14 * DAY
export const REPEAT_DRAFTED_MS = 90 * DAY
// A routine has at least 3 steps; more than 8 is a one-off job, not a routine.
export const STEPS_MIN = 3
export const STEPS_MAX = 8
// Raw steps kept while a turn runs, before they are judged
const RAW_MAX = 64
const SHAPES_MAX = 100

export type StepCode = 'edit-code' | 'edit-tests' | 'edit-docs' | 'edit-config' | 'edit-styles' | 'edit-files' | 'fix' | 'test' | 'build' | 'lint' | 'commit' | 'push' | 'pr' | 'install' | 'run' | 'agents' | 'skill' | 'mcp' | 'slash'

export const STEP_WORDS: Record<StepCode, string> = {
  'edit-code': 'edit code',
  'edit-tests': 'edit tests',
  'edit-docs': 'edit docs',
  'edit-config': 'edit settings files',
  'edit-styles': 'edit styles',
  'edit-files': 'edit files',
  fix: 'fix',
  test: 'run tests',
  build: 'run the build',
  lint: 'run lint',
  commit: 'commit',
  push: 'push',
  pr: 'open a pull request',
  install: 'install packages',
  run: 'run a command',
  agents: 'start agents',
  skill: 'use a skill',
  mcp: 'use a connected tool',
  slash: 'a slash command',
}
// One word per step for the skill's folder name
const SLUG: Record<StepCode, string> = { 'edit-code': 'edit', 'edit-tests': 'tests', 'edit-docs': 'docs', 'edit-config': 'config', 'edit-styles': 'styles', 'edit-files': 'edit', fix: 'fix', test: 'test', build: 'build', lint: 'lint', commit: 'commit', push: 'push', pr: 'pr', install: 'install', run: 'run', agents: 'agents', skill: 'skill', mcp: 'tool', slash: 'command' }

const TEST_PATH = /(?:^|[\\/])(?:tests?|__tests__|specs?)[\\/]|\.(?:test|spec)\.[a-z0-9]+$|(?:^|[\\/])test_[^\\/]*$|_test\.[a-z0-9]+$/i
const DOCS = /\.(?:md|mdx|markdown|txt|rst|adoc)$/i
const CONFIG = /\.(?:json|jsonc|ya?ml|toml|ini|cfg|conf|xml|plist|properties)$/i
const STYLES = /\.(?:css|scss|sass|less|styl)$/i
const CODE = /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|kts|swift|rb|php|c|h|cc|cpp|hpp|cs|m|mm|scala|dart|lua|sh|bash|zsh|ps1|sql|vue|svelte|ex|exs|erl|hs|clj|r|jl|zig|nim)$/i

// The kind of file an edit touched, from its path only (the path itself is never kept).
export function editStep(path: unknown): StepCode {
  if (typeof path !== 'string' || path === '') return 'edit-files'
  if (TEST_PATH.test(path)) return 'edit-tests'
  if (DOCS.test(path)) return 'edit-docs'
  if (STYLES.test(path)) return 'edit-styles'
  if (CONFIG.test(path)) return 'edit-config'
  return CODE.test(path) ? 'edit-code' : 'edit-files'
}

// Commands that only look (ls, cat, git status) are how Claude reads, not part of a routine.
const LOOKS = /^(?:ls|cat|head|tail|less|more|grep|rg|ag|find|fd|pwd|echo|printf|wc|which|type|tree|file|stat|du|df|sort|uniq|cut|awk|sed|jq|diff|cd|true|date|env|whoami)$/
const GIT_LOOKS = /^git\s+(?:status|diff|log|show|branch|remote|rev-parse|fetch|stash\s+list|ls-files|blame|config\s+--get)\b/

// The first command of a line after any leading `cd <dir> &&`
const firstCommand = (command: string): string => command.replace(/^\s*(?:cd\s+\S+\s*&&\s*)+/, '').trim()

export function shellStep(command: unknown): StepCode | undefined {
  if (typeof command !== 'string' || command.trim() === '') return undefined
  const c = firstCommand(command)
  if (/\bgit\s+commit\b/.test(c)) return 'commit'
  if (/\bgit\s+push\b/.test(c)) return 'push'
  if (/\bgh\s+pr\s+create\b/.test(c)) return 'pr'
  const kind = commandKind(c)
  if (kind === 'test' || kind === 'build' || kind === 'lint' || kind === 'install') return kind
  if (kind === 'git') return GIT_LOOKS.test(c) || /^git\s+add\b/.test(c) ? undefined : 'run'
  const word = c.split(/\s+/)[0] ?? ''
  return LOOKS.test(word) ? undefined : 'run'
}

const isCheck = (s: StepCode | undefined): boolean => s === 'test' || s === 'build' || s === 'lint'

// The routine of one turn, in memory only.
export type Routine = { steps: StepCode[]; slash?: string; failed: boolean }
export const newRoutine = (slash?: string): Routine => ({ steps: slash === undefined ? [] : ['slash'], ...(slash === undefined ? {} : { slash }), failed: false })

// The step of one tool call, from the tool's name and its arguments' kind only. An edit after a failed check is a fix.
export function stepOf(tool: string, fields: Record<string, unknown>, failedBefore: boolean): StepCode | undefined {
  if (isEditTool(tool)) return failedBefore ? 'fix' : editStep(fields.file_path ?? fields.notebook_path)
  if (isShellTool(tool)) return shellStep(fields.command)
  if (tool === 'Agent' || tool === 'Task') return 'agents'
  if (tool === 'Skill') return 'skill'
  if (tool.startsWith('mcp__') && !tool.startsWith('mcp__vaken__')) return 'mcp'
  return undefined
}

// One step onto the routine: the same step twice in a row counts once.
export function addStep(r: Routine, tool: string, fields: Record<string, unknown>, isError: boolean): Routine {
  const step = stepOf(tool, fields, r.failed)
  const failed = isCheck(step) ? isError : r.failed
  if (step === undefined || r.steps.length >= RAW_MAX) return failed === r.failed ? r : { ...r, failed }
  const steps = r.steps[r.steps.length - 1] === step ? r.steps : [...r.steps, step]
  return { ...r, steps, failed }
}

// The shape's hash, or undefined when the turn did too little or too much to be a routine. A slash command's name counts only as its hash.
export function shapeHash(r: Routine): string | undefined {
  if (r.steps.length < STEPS_MIN || r.steps.length > STEPS_MAX) return undefined
  return hashOf(`${r.slash ?? ''}|${r.steps.join(',')}`)
}

export const slashHash = (text: string): string | undefined => {
  const m = /^\/([^\s/][^\s]*)/.exec(text.trim())
  return m === null ? undefined : hashOf(m[1]!.toLowerCase())
}

// ---- the counts, per project: hashes and times only

export type RepeatState = { seen: Record<string, number[]>; quiet: Record<string, number> }
export const repeatKey = (root: string): string => `cockpit:repeat:${hashOf(root)}`
const nums = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)) : [])
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export function parseRepeat(raw: unknown): RepeatState {
  const o = isRec(raw) ? raw : {}
  const seen: Record<string, number[]> = {}
  const quiet: Record<string, number> = {}
  if (isRec(o.seen)) for (const [k, v] of Object.entries(o.seen)) seen[k] = nums(v).slice(-REPEAT_AFTER)
  if (isRec(o.quiet)) for (const [k, v] of Object.entries(o.quiet)) if (typeof v === 'number' && Number.isFinite(v)) quiet[k] = v
  return { seen, quiet }
}

// One more time for this shape. The third time within 14 days offers it, unless it is quiet; the count then starts again.
export function countShape(state: RepeatState, hash: string, now: number): { state: RepeatState; offer: boolean } {
  const seen = { ...state.seen }
  const quiet = Object.fromEntries(Object.entries(state.quiet).filter(([, until]) => until > now))
  const times = [...(seen[hash] ?? []).filter(at => now - at <= REPEAT_WINDOW_MS && at <= now), now].slice(-REPEAT_AFTER)
  const offer = times.length >= REPEAT_AFTER && quiet[hash] === undefined
  if (offer) delete seen[hash]
  else seen[hash] = times
  const keys = Object.keys(seen)
  if (keys.length > SHAPES_MAX) for (const k of keys.sort((a, b) => (seen[a]!.at(-1) ?? 0) - (seen[b]!.at(-1) ?? 0)).slice(0, keys.length - SHAPES_MAX)) delete seen[k]
  return { state: { seen, quiet }, offer }
}

export const quietShape = (state: RepeatState, hash: string, until: number): RepeatState => ({ seen: Object.fromEntries(Object.entries(state.seen).filter(([k]) => k !== hash)), quiet: { ...state.quiet, [hash]: until } })

// ---- the offer, kept in memory only for this session

export type RepeatOffer = { hash: string; steps: StepCode[]; root: string }
export const repeatMem: { cur?: Routine; offer?: RepeatOffer } = {}

export const plainShape = (steps: readonly StepCode[], t: (s: string) => string = s => s): string => steps.map(s => t(STEP_WORDS[s])).join(', ')

// The skill's folder name from the steps: "test-fix-commit"
export function skillSlug(steps: readonly StepCode[]): string {
  const words: string[] = []
  for (const s of steps) if (!words.includes(SLUG[s])) words.push(SLUG[s])
  return words.slice(0, 4).join('-') || 'routine'
}

// The one fixed request: Claude writes the skill from what it did in this session; vaken writes nothing and reads no transcript.
export const draftPrompt = (steps: readonly StepCode[]): string =>
  `I have done this routine 3 times in this project: ${plainShape(steps)}. Write it as a Claude Code skill for this project in .claude/skills/${skillSlug(steps)}/SKILL.md (if that folder is taken, pick another short name). Base it on what you did for it in this session: a name, a one-line description of when to use it, and the steps in order. Leave out secrets and anything personal. Show me the file when it is written so I can review it.` // en-only: a prompt sent to Claude as the person

export const REPEAT_HEAD = 'Repeated routine'
export const REPEAT_TITLE = 'You did this 3 times: {shape}'
export const REPEAT_ASK = 'Save it as a skill?'
export const REPEAT_LINE = 'Draft the skill asks Claude to write .claude/skills/{name}/SKILL.md in this project from what it did in this session. Vaken writes nothing itself; you read the file before you keep it.'
export const REPEAT_DRAFT = 'Draft the skill'
export const REPEAT_ASKED = 'Asked Claude to draft the skill. Read the file before you keep it.'
export const REPEAT_QUIETED = 'Not now. Vaken will not offer this routine again for 14 days.'

export const REPEAT_WORDS: string[] = [...Object.values(STEP_WORDS), REPEAT_HEAD, REPEAT_TITLE, REPEAT_ASK, REPEAT_LINE, REPEAT_DRAFT, REPEAT_ASKED, REPEAT_QUIETED]
