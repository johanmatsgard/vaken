// At most one hint per session: lower effort for look-ups, a cheaper model in a tight week, or back up after repeated failed checks. Another session's row asks the app to change it; this session only gets advice because the app refuses self-changes.
import { MODEL_OPTIONS, familyIn, rankOf, stepUp } from './models'
import type { Family } from './models'
import { pressureOf } from './pace'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { isEditTool, isShellTool } from './tools'
import { englishOf } from '../i18n/table'

const MIN = 60_000
const DAY = 24 * 60 * MIN


export const FIT_KEY = 'hints.model'
export const FIT_SETTINGS: Setting[] = [
  {
    key: FIT_KEY,
    group: 'Model choice',
    label: 'Model and effort',
    note: 'Hints to lower or raise a session’s model or effort.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    // A free tip, so On on a fresh store.
    default: 'on',
  },
]
export const FIT_HELP: HelpEntry[] = [
  {
    title: 'Model and effort hints',
    text: 'Light work needs less effort (how hard Claude thinks) or a cheaper model, and failed checks may need a stronger one. Another session can be changed from its row; the app may ask you first. This session only gets a hint: change it in the model menu.',
  },
]
export const fitOn = (raw: unknown): boolean => raw === 'on'


export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
export type Effort = (typeof EFFORTS)[number]
export const isEffort = (v: unknown): v is Effort => typeof v === 'string' && (EFFORTS as readonly string[]).includes(v)
const effortRank = (e: Effort): number => EFFORTS.indexOf(e)


export type StepKind = 'look' | 'work' | 'neutral'
const LOOK_TOOLS: ReadonlySet<string> = new Set(['Read', 'Grep', 'Glob', 'LS', 'NotebookRead', 'WebFetch', 'WebSearch'])
const NEUTRAL_TOOLS: ReadonlySet<string> = new Set(['TodoWrite', 'TodoRead', 'TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet', 'ToolSearch', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode'])
// `find` with -delete or -exec and any redirect into a file are work.
const LOOK_COMMANDS: ReadonlySet<string> = new Set(['ls', 'cat', 'head', 'tail', 'grep', 'rg', 'find', 'wc', 'pwd', 'echo', 'which', 'file', 'stat', 'tree', 'du', 'df', 'less', 'jq'])
// Windows (cmd and PowerShell), read-only commands only. Compared in lower case, without folder or `.exe`.
const WIN_LOOK_COMMANDS: ReadonlySet<string> = new Set([
  'dir', 'type', 'findstr', 'where', 'tasklist', 'hostname', 'whoami', 'ver', 'get-childitem', 'gci', 'get-content', 'gc', 'select-string', 'sls', 'get-location', 'gl', 'get-item', 'gi', 'get-itemproperty', 'test-path',
  'get-process', 'get-command', 'gcm', 'get-date', 'write-output', 'write-host', 'select-object', 'sort-object', 'measure-object', 'format-table', 'format-list', 'out-string', 'get-filehash',
])
const winNameOf = (word: string): string => word.replace(/^.*\\/, '').replace(/\.exe$/i, '').toLowerCase()
const GIT_LOOKS: ReadonlySet<string> = new Set(['log', 'status', 'diff', 'show', 'blame', 'grep', 'ls-files', 'rev-parse', 'shortlog', 'describe'])

const firstWords = (part: string): string[] =>
  part
    .trim()
    .split(/\s+/)
    .filter(w => w !== '' && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(w))

export function isLookCommand(command: string): boolean {
  const flat = command.replace(/\d?>&\d|2>\/dev\/null/g, ' ')
  if (/>/.test(flat) || flat.trim() === '') return false
  return flat.split(/&&|\|\||;|\||\n/).every(part => {
    const words = firstWords(part)
    if (words.length === 0) return true
    const name = (words[0] ?? '').replace(/^.*\//, '')
    if (name === 'git') return GIT_LOOKS.has(words.find((w, n) => n > 0 && !w.startsWith('-')) ?? '')
    if (name === 'find') return !words.some(w => w === '-delete' || w.startsWith('-exec') || w === '-ok')
    return LOOK_COMMANDS.has(name) || WIN_LOOK_COMMANDS.has(winNameOf(name))
  })
}

// An unknown tool counts as work: a look-up stretch is only claimed when sure.
export function stepKind(tool: string, command?: string): StepKind {
  if (LOOK_TOOLS.has(tool)) return 'look'
  if (NEUTRAL_TOOLS.has(tool)) return 'neutral'
  if (isShellTool(tool)) return typeof command === 'string' && isLookCommand(command) ? 'look' : 'work'
  if (isEditTool(tool)) return 'work'
  return 'work'
}

// Work ends a stretch; a neutral step leaves it.
export type Stretch = { since?: number; n: number }
export function nextStretch(s: Stretch, kind: StepKind, now: number): Stretch {
  if (kind === 'neutral') return s
  if (kind === 'work') return { n: 0 }
  return { since: s.since ?? now, n: s.n + 1 }
}

export const LOOK_MIN_STEPS = 8
export const LOOK_MIN_MS = 5 * MIN
export const FAILS_IN_ROW = 2
const FAILS_MAX = 3

// A passing check ends the count; one with no clear result is skipped.
export function failsInRow(receipts: readonly { ok: boolean | undefined }[]): number {
  let n = 0
  for (let k = receipts.length - 1; k >= 0 && n < FAILS_MAX; k -= 1) {
    const ok = receipts[k]?.ok
    if (ok === true) break
    if (ok === false) n += 1
  }
  return n
}

// Coarse, so it changes only a few times a stretch (each change is a store write).
export type FitFacts = { looks?: number; many?: boolean; fails?: number; effort?: Effort }
export function fitFacts(s: Stretch, fails: number, effort: Effort | undefined): FitFacts {
  return { ...(s.since === undefined ? {} : { looks: s.since }), ...(s.n >= LOOK_MIN_STEPS ? { many: true } : {}), ...(fails > 0 ? { fails } : {}), ...(effort === undefined ? {} : { effort }) }
}
export function parseFit(raw: unknown): FitFacts {
  if (typeof raw !== 'object' || raw === null) return {}
  const o = raw as Record<string, unknown>
  return { ...(typeof o.looks === 'number' ? { looks: o.looks } : {}), ...(o.many === true ? { many: true } : {}), ...(typeof o.fails === 'number' && o.fails > 0 ? { fails: Math.min(FAILS_MAX, Math.floor(o.fails)) } : {}), ...(isEffort(o.effort) ? { effort: o.effort } : {}) }
}

export const isLookStretch = (f: FitFacts, now: number): boolean => f.looks !== undefined && f.many === true && now - f.looks >= LOOK_MIN_MS

// Same rule as pressureOf in core/pace.ts.
export const WEEK_TIGHT_PCT = 80
export type Week = { percent: number; resetsAt?: string }
export function weekTight(w: Week | undefined, now: number): boolean {
  if (w === undefined || w.resetsAt === undefined) return false
  const reset = new Date(w.resetsAt).getTime()
  if (Number.isNaN(reset) || reset - now < DAY) return false
  return pressureOf('Weekly · all models', w.percent, w.resetsAt, now).score >= WEEK_TIGHT_PCT
}


export type FitChange = { effort: Effort } | { model: Family }
export type Suggestion = { why: 'looks' | 'week' | 'fails'; change: FitChange }
export type FitInput = {
  on: boolean
  isHelper?: boolean
  running: boolean
  model: string
  fit?: FitFacts
  week?: Week
  lookup: Family
  now: number
}

// Failures matter most, so back up first.
export function suggestFit(x: FitInput): Suggestion | undefined {
  if (!x.on || x.isHelper === true || x.running) return undefined
  const fit = x.fit ?? {}
  const effort = fit.effort
  if ((fit.fails ?? 0) >= FAILS_IN_ROW) {
    if (effort !== undefined && effortRank(effort) < effortRank('high')) return { why: 'fails', change: { effort: 'high' } }
    const up = stepUp(x.model)
    return up === undefined ? undefined : { why: 'fails', change: { model: up } }
  }
  if (!isLookStretch(fit, x.now)) return undefined
  if (weekTight(x.week, x.now) && familyIn(x.model) !== undefined && rankOf(x.model) > rankOf(x.lookup)) return { why: 'week', change: { model: x.lookup } }
  if (effort !== undefined && effort !== 'low') return { why: 'looks', change: { effort: 'low' } }
  return undefined
}

export const fitKey = (s: Suggestion): string => `${s.why}:${'effort' in s.change ? s.change.effort : s.change.model}`


export const FIT_GAP_MS = 30 * MIN
// `quiet`: a change from here failed, no more hints.
export type FitPace = { key?: string; endedAt?: number; quiet?: boolean }

// Same input gives the same answer, so the draw and the redraw agree.
export function paceFit(p: FitPace | undefined, s: Suggestion | undefined, now: number): { show: boolean; pace: FitPace } {
  const pace = p ?? {}
  if (pace.quiet === true) return { show: false, pace }
  if (s === undefined) return { show: false, pace: pace.key === undefined ? pace : { endedAt: now } }
  const key = fitKey(s)
  if (pace.key === key) return { show: true, pace }
  if (pace.key !== undefined) return { show: false, pace: { endedAt: now } }
  if (pace.endedAt !== undefined && now - pace.endedAt < FIT_GAP_MS) return { show: false, pace }
  return { show: true, pace: { key } }
}
export const endFit = (p: FitPace | undefined, now: number): FitPace => ({ endedAt: now, ...(p?.quiet === true ? { quiet: true } : {}) })

export const FIT_UNDO_MS = 30 * MIN


const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

// Anything but JSON gives nothing, never a guess.
export function parseSessionSetting(text: string): { model?: string; effort?: Effort } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return {}
  }
  const o = isObj(data) && isObj(data.session) ? data.session : data
  if (!isObj(o)) return {}
  return { ...(typeof o.model === 'string' && o.model.trim() !== '' && o.model.length <= 80 ? { model: o.model.trim() } : {}), ...(isEffort(o.effort) ? { effort: o.effort } : {}) }
}

// A wrong id gets the model list back, so the first matching id is used.
export function modelIdIn(text: string, family: Family): string | undefined {
  for (const word of text.match(/[A-Za-z0-9][\w.\-[\]]*/g) ?? []) if (word.toLowerCase() !== family && familyIn(word) === family && /\d|-/.test(word)) return word
  return undefined
}


export const modelLabel = (model: string): string => MODEL_OPTIONS.find(o => o.value === familyIn(model))?.label ?? model
const isLower = (c: FitChange): boolean => 'effort' in c && c.effort === 'low'

export const FIT_LOOKS = 'Only reads files now'
export const FIT_WEEK = 'Light work, tight week'
export const FIT_FAILS = 'Checks failed twice in a row'
export const FIT_LOWER = 'Lower the effort (saves usage)'
export const FIT_RAISE = 'Raise the effort'
export const FIT_USE = 'Use {model}'
export const whyWord = (s: Suggestion): string => (s.why === 'looks' ? FIT_LOOKS : s.why === 'week' ? FIT_WEEK : FIT_FAILS)
export const pressWord = (s: Suggestion, t: (x: string) => string): string => ('model' in s.change ? t(FIT_USE).replace('{model}', modelLabel(s.change.model)) : t(isLower(s.change) ? FIT_LOWER : FIT_RAISE))

export const FIT_ASKED_LOWER = 'Asked the app to lower the effort of {name}. It may ask you to confirm.'
export const FIT_ASKED_RAISE = 'Asked the app to raise the effort of {name}. It may ask you to confirm.'
export const FIT_ASKED_MODEL = 'Asked the app to move {name} to {model}. It may ask you to confirm.'
export const FIT_ASKED_BACK = 'Asked the app to put {name} back to {old}. It may ask you to confirm.'
export const FIT_FAILED = 'Could not change it from here. Use the model menu in that session.'
export const FIT_UNDO_LOWER = 'Lowered the effort'
export const FIT_UNDO_RAISE = 'Raised the effort'
export const FIT_UNDO_MODEL = 'Moved to {model}'
export const FIT_BACK = 'Back to {old}'
export function askedWord(s: Suggestion, name: string, t: (x: string) => string): string {
  if ('model' in s.change) return t(FIT_ASKED_MODEL).replace('{name}', name).replace('{model}', modelLabel(s.change.model))
  return t(isLower(s.change) ? FIT_ASKED_LOWER : FIT_ASKED_RAISE).replace('{name}', name)
}
export const ledgerWord = (s: Suggestion, name: string): string => ('model' in s.change ? `Moved ${name} to ${modelLabel(s.change.model)}` : `${isLower(s.change) ? 'Lowered' : 'Raised'} the effort of ${name}`)
export const undoWord = (s: Suggestion, t: (x: string) => string): string => ('model' in s.change ? t(FIT_UNDO_MODEL).replace('{model}', modelLabel(s.change.model)) : t(isLower(s.change) ? FIT_UNDO_LOWER : FIT_UNDO_RAISE))
export const oldWord = (old: string): string => (isEffort(old) ? old : modelLabel(old))

export const FIT_HERE_LOWER = 'This session only reads files. You can lower the effort in the model menu.'
export const FIT_HERE_WEEK = 'The week is tight and this session only reads files. You can pick {model} in the model menu.'
export const FIT_HERE_RAISE = 'Checks failed twice in a row. You can raise the effort in the model menu.'
export const FIT_HERE_MODEL = 'Checks failed twice in a row. You can pick {model} in the model menu.'
export const FIT_NOT_NOW = 'Not now'
export function hereWord(s: Suggestion, t: (x: string) => string): string {
  if (s.why === 'week' && 'model' in s.change) return t(FIT_HERE_WEEK).replace('{model}', modelLabel(s.change.model))
  if ('model' in s.change) return t(FIT_HERE_MODEL).replace('{model}', modelLabel(s.change.model))
  return t(isLower(s.change) ? FIT_HERE_LOWER : FIT_HERE_RAISE)
}

export const FIT_VIEW_STRINGS: string[] = englishOf('fit')
