// Next step buttons and quick actions: fixed requests sent to Claude by one press. Pure, plus the memory the band reads (no store read per beat).
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { commandKind } from './happened'
import { isEditTool, isShellTool } from './tools'
import { hideSecrets } from './guardcmds'
import { scanSecrets } from './guardsecrets'

export type ActionId = 'tests' | 'commit' | 'diff' | 'continue' | 'fix'
export type Action = { id: string; label: string; prompt: string; hint?: string }

export const LABEL_TESTS = 'Run tests'
export const LABEL_COMMIT = 'Commit'
export const LABEL_DIFF = 'What changed'
export const LABEL_CONTINUE = 'Continue'
export const LABEL_FIX = 'Fix it'

// The prompts never change, so a press sends no words of the person's and nothing vaken read.
export const BUILT_IN: ReadonlyArray<Action & { id: ActionId }> = [
  // en-only: a prompt sent to Claude
  { id: 'tests', label: LABEL_TESTS, prompt: "Run the project's tests and tell me the result in short lines.", hint: 'Run the tests and tell me the result' },
  // en-only: a prompt sent to Claude
  { id: 'commit', label: LABEL_COMMIT, prompt: 'Commit the changes with a short clear message. Do not push.', hint: 'Commit the changes, do not push' },
  // en-only: a prompt sent to Claude
  { id: 'diff', label: LABEL_DIFF, prompt: 'Show me what changed in short lines: each file and what it does now.', hint: 'Show me what changed' },
  // en-only: a prompt sent to Claude
  { id: 'continue', label: LABEL_CONTINUE, prompt: 'Continue with the next step.', hint: 'Continue with the next step' },
  // en-only: a prompt sent to Claude
  { id: 'fix', label: LABEL_FIX, prompt: 'The last step failed. Find why and fix it, then tell me in short lines.', hint: 'Find why the last step failed and fix it' },
]
export const builtIn = (id: ActionId): Action => BUILT_IN.find(a => a.id === id) as Action

export const NEXT_MAX = 3
export const NEXT_TTL_MS = 10 * 60_000

// `edits` since the last commit; `untested` edits since tests last ran; `checked` a test, build or lint passed after the last edit; `failed` the last tool call failed.
export type NextFacts = { edits: number; untested: number; checked: boolean; failed: boolean }
export const noFacts = (): NextFacts => ({ edits: 0, untested: 0, checked: false, failed: false })

export type ToolKind = 'edit' | 'test' | 'check' | 'commit' | 'other'
export function toolKind(tool: string, command: unknown): ToolKind {
  if (isEditTool(tool)) return 'edit'
  if (!isShellTool(tool) || typeof command !== 'string') return 'other'
  if (/\bgit\s+commit\b/.test(command)) return 'commit'
  const k = commandKind(command)
  return k === 'test' ? 'test' : k === 'build' || k === 'lint' ? 'check' : 'other'
}

export function noteTool(f: NextFacts, kind: ToolKind, ok: boolean): NextFacts {
  if (!ok) return kind === 'test' ? { ...f, untested: 0, checked: false, failed: true } : { ...f, failed: true }
  if (kind === 'edit') return { edits: f.edits + 1, untested: f.untested + 1, checked: false, failed: false }
  if (kind === 'test') return { ...f, untested: 0, checked: true, failed: false }
  if (kind === 'check') return { ...f, checked: true, failed: false }
  if (kind === 'commit') return noFacts()
  return { ...f, failed: false }
}

// No model call: the likely next steps from what the turns did.
export function pickNext(f: NextFacts): ActionId[] {
  const out: ActionId[] = []
  if (f.failed) out.push('fix')
  if (f.untested > 0) out.push('tests', 'diff')
  else if (f.edits > 0 && f.checked) out.push('commit', 'diff')
  // A plain question and answer did no work, so it gets no button.
  if (out.length < 2 && (f.edits > 0 || f.failed)) out.push('continue')
  return out.slice(0, NEXT_MAX)
}

// An answer that asks the person something waits for their words, not a button.
export function endsWithQuestion(answer: string): boolean {
  const lines = answer.split('\n').map(l => l.trim()).filter(l => l !== '')
  const last = (lines[lines.length - 1] ?? '').replace(/[\s*_`)"'\]»”]+$/u, '')
  return last.endsWith('?')
}

// How the last answer of the main loop ended, for the Where was I card.
export type LastEnd = 'done' | 'failed' | 'asked' | 'stopped'
export function lastEndOf(reason: string, answer: string, failed: boolean): LastEnd | undefined {
  if (reason === 'aborted') return 'stopped'
  if (reason === 'error') return 'failed'
  if (reason !== 'answer') return undefined
  return endsWithQuestion(answer) ? 'asked' : failed ? 'failed' : 'done'
}

export type NextMode = 'off' | 'buttons' | 'hint'
export const nextModeOf = (v: unknown): NextMode => (v === 'off' ? 'off' : v === 'hint' ? 'hint' : 'buttons')

// The dim hint in the prompt box: the first pick's request in short form, Tab to take. Only with Buttons and hint.
export function hintOf(mode: NextMode, picks: readonly ActionId[]): string | undefined {
  if (mode !== 'hint' || picks[0] === undefined) return undefined
  return builtIn(picks[0]).hint
}

// The engine's own hint wins: when it proposed one after the last turn, vaken's stays out.
export const hintMem: { engineAt?: number; turnAt?: number; own?: string } = {}
export const engineHintNow = (): boolean => hintMem.engineAt !== undefined && hintMem.turnAt !== undefined && hintMem.engineAt >= hintMem.turnAt

// `busy` from the start of a model turn until the main loop's answer ends; `end` and `endedAt` from then until the next turn starts.
export const nextMem: { facts: NextFacts; picks: ActionId[]; at?: number; busy: boolean; mode: NextMode; end?: LastEnd; endedAt?: number } = { facts: noFacts(), picks: [], busy: false, mode: 'buttons' }

export function forgetNext(): void {
  nextMem.facts = noFacts()
  nextMem.picks = []
  nextMem.at = undefined
  nextMem.busy = false
  nextMem.mode = 'buttons'
  nextMem.end = undefined
  nextMem.endedAt = undefined
  hintMem.engineAt = undefined
  hintMem.turnAt = undefined
  hintMem.own = undefined
}

export function setPicks(ids: ActionId[], now: number): void {
  nextMem.picks = ids
  nextMem.at = ids.length === 0 ? undefined : now
}

export function clearPicks(): void {
  nextMem.picks = []
  nextMem.at = undefined
}

// The picks still offered: none while Claude works, after ten minutes, or with the setting Off.
export function livePicks(now: number): Action[] {
  if (nextMem.mode === 'off' || nextMem.busy || nextMem.at === undefined || now < nextMem.at || now - nextMem.at >= NEXT_TTL_MS) return []
  return nextMem.picks.map(builtIn)
}

export const nextSignature = (now: number): string => livePicks(now).map(a => a.id).join(',')

// The person's own quick actions, kept in the store.
export const OWN_KEY = 'cockpit:actions:own'
export const OWN_MAX = 12
export const OWN_NAME_MAX = 24
export const OWN_PROMPT_MAX = 400
export type OwnAction = { name: string; prompt: string }

const NAME_OK = /^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u
const RESERVED = ['add', 'remove', 'list']
const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

const isOwn = (v: unknown): v is OwnAction => {
  const o = v as OwnAction
  return typeof o === 'object' && o !== null && typeof o.name === 'string' && typeof o.prompt === 'string' && o.name.length <= OWN_NAME_MAX && o.prompt.length <= OWN_PROMPT_MAX && NAME_OK.test(o.name)
}
export const parseOwn = (raw: unknown): OwnAction[] => (Array.isArray(raw) ? raw.filter(isOwn).slice(0, OWN_MAX) : [])

const builtInNamed = (word: string): Action | undefined => BUILT_IN.find(a => same(a.id, word) || same(a.label, word))

// The secret scan of the hand-over notes: a line it would change holds something that looks like a secret.
export const looksSecret = (text: string): boolean => hideSecrets(text) !== text || scanSecrets(text).length > 0

export type AddWhy = 'form' | 'name' | 'name_long' | 'prompt_long' | 'full' | 'taken' | 'secret'
export function addOwn(list: OwnAction[], rawName: string, rawPrompt: string): { ok: true; list: OwnAction[]; name: string } | { ok: false; why: AddWhy } {
  const name = rawName.trim().replace(/\s+/g, ' ')
  const prompt = rawPrompt.trim()
  if (name === '' || prompt === '') return { ok: false, why: 'form' }
  if (name.length > OWN_NAME_MAX) return { ok: false, why: 'name_long' }
  if (prompt.length > OWN_PROMPT_MAX) return { ok: false, why: 'prompt_long' }
  if (!NAME_OK.test(name) || RESERVED.includes((name.split(' ')[0] ?? '').toLowerCase())) return { ok: false, why: 'name' }
  if (looksSecret(`${name}\n${prompt}`)) return { ok: false, why: 'secret' }
  if (builtInNamed(name) !== undefined || list.some(o => same(o.name, name))) return { ok: false, why: 'taken' }
  if (list.length >= OWN_MAX) return { ok: false, why: 'full' }
  return { ok: true, list: [...list, { name, prompt }], name }
}

export function removeOwn(list: OwnAction[], name: string): OwnAction[] | undefined {
  const kept = list.filter(o => !same(o.name, name))
  return kept.length === list.length ? undefined : kept
}

export const ownAction = (o: OwnAction): Action => ({ id: `own:${o.name}`, label: o.name, prompt: o.prompt })

export function findAction(word: string, own: OwnAction[]): Action | undefined {
  const w = word.trim().replace(/\s+/g, ' ')
  if (w === '') return undefined
  const mine = own.find(o => same(o.name, w))
  return mine !== undefined ? ownAction(mine) : builtInNamed(w)
}

export type QuickAsk = { kind: 'list' } | { kind: 'run'; word: string } | { kind: 'add'; name: string; prompt: string } | { kind: 'remove'; name: string }
export function parseQuick(args: string): QuickAsk {
  const s = args.trim()
  if (s === '' || s.toLowerCase() === 'list') return { kind: 'list' }
  const add = /^add(?:\s+([\s\S]*))?$/i.exec(s)
  if (add !== null) {
    const rest = add[1] ?? ''
    const at = rest.indexOf('=')
    return at < 0 ? { kind: 'add', name: '', prompt: '' } : { kind: 'add', name: rest.slice(0, at), prompt: rest.slice(at + 1) }
  }
  const remove = /^remove(?:\s+([\s\S]*))?$/i.exec(s)
  if (remove !== null) return { kind: 'remove', name: (remove[1] ?? '').trim() }
  return { kind: 'run', word: s }
}

// What the person reads; translated where it is said.
export const NEXT_WORD = 'Next:'
export const QUICK_HEAD = 'Quick actions. Type `/vaken quick` and a name to send one to Claude.'
export const QUICK_NOW = 'Next steps now: {list}'
export const QUICK_BUILT_IN = 'Built in: {list}'
export const QUICK_YOURS = 'Yours: {list}'
export const QUICK_NONE = 'Yours: none yet.'
export const QUICK_HOW = 'Add your own: `/vaken quick add <name> = <request>`. Remove one: `/vaken quick remove <name>`.'
export const QUICK_ASKED = 'Asked Claude: {name}.'
export const QUICK_BUSY = 'Claude is working. Try again when it ends.'
export const QUICK_NO_SUCH = 'No quick action named {name}. Type /vaken quick for the list.'
export const QUICK_ADDED = 'Added {name}. Type /vaken quick {name} to send it.'
export const QUICK_REMOVED = 'Removed {name}.'
export const QUICK_NOT_YOURS = 'There is no action of yours named {name}.'
export const QUICK_FORM = 'Type it as: `/vaken quick add <name> = <request>`.'
export const QUICK_NAME = 'A name uses letters, digits, spaces and dashes, and does not start with add, remove or list.'
export const QUICK_NAME_LONG = 'A name is at most 24 characters.'
export const QUICK_PROMPT_LONG = 'A request is at most 400 characters.'
export const QUICK_FULL = 'You have 12 already. Remove one first.'
export const QUICK_TAKEN = 'That name is taken. Pick another one.'
export const QUICK_SECRET = 'That looks like a secret, so vaken does not keep it.'

export const NEXT_LABEL = 'Next step buttons'
export const NEXT_NOTE = 'After an answer, the band offers two or three likely next steps to press.'
export const NEXT_OPT_BUTTONS = 'Buttons'
export const NEXT_OPT_HINT = 'Buttons and hint'

export const NEXT_SETTINGS: Setting[] = [
  {
    key: 'next.mode',
    group: 'Explain simply',
    label: NEXT_LABEL,
    note: NEXT_NOTE,
    options: [
      { value: 'off', label: 'Off' },
      { value: 'buttons', label: NEXT_OPT_BUTTONS },
      { value: 'hint', label: NEXT_OPT_HINT },
    ],
    default: 'buttons',
  },
]

export const NEXT_HELP_TITLE = 'What the next step buttons are'
export const NEXT_HELP_TEXT = 'After Claude ends an answer, the line above the chat box shows Next: with two or three likely steps, such as Run tests or Commit. One press sends a fixed request to Claude; with Buttons and hint, the chat box also shows the first step as a dim hint, and Tab takes it. /vaken quick lists them and your own quick actions, and /vaken quick add <name> = <request> adds one.'
export const NEXT_HELP: HelpEntry[] = [{ title: NEXT_HELP_TITLE, text: NEXT_HELP_TEXT }]

export const NEXT_STRINGS: string[] = [
  LABEL_TESTS, LABEL_COMMIT, LABEL_DIFF, LABEL_FIX, NEXT_WORD, QUICK_HEAD, QUICK_NOW, QUICK_BUILT_IN, QUICK_YOURS, QUICK_NONE, QUICK_HOW, QUICK_ASKED, QUICK_BUSY, QUICK_NO_SUCH, QUICK_ADDED, QUICK_REMOVED,
  QUICK_NOT_YOURS, QUICK_FORM, QUICK_NAME, QUICK_NAME_LONG, QUICK_PROMPT_LONG, QUICK_FULL, QUICK_TAKEN, QUICK_SECRET, NEXT_LABEL, NEXT_NOTE, NEXT_OPT_BUTTONS, NEXT_OPT_HINT, NEXT_HELP_TITLE, NEXT_HELP_TEXT,
]

export type Say = (english: string) => string
const fill = (s: string, v: Record<string, string>): string => Object.entries(v).reduce((acc, [k, x]) => acc.split(`{${k}}`).join(x), s)

const WHY_TEXT: Record<AddWhy, string> = { form: QUICK_FORM, name: QUICK_NAME, name_long: QUICK_NAME_LONG, prompt_long: QUICK_PROMPT_LONG, full: QUICK_FULL, taken: QUICK_TAKEN, secret: QUICK_SECRET }
export const addWhyText = (why: AddWhy, t: Say): string => t(WHY_TEXT[why])

export function quickListText(own: OwnAction[], picks: Action[], t: Say): string {
  // Markdown list lines, so the chat never runs them together
  return [
    t(QUICK_HEAD),
    '',
    ...[
      ...(picks.length === 0 ? [] : [fill(t(QUICK_NOW), { list: picks.map(a => `${t(a.label)} (${a.id})`).join(', ') })]),
      fill(t(QUICK_BUILT_IN), { list: BUILT_IN.map(a => `${a.id} (${t(a.label)})`).join(', ') }),
      own.length === 0 ? t(QUICK_NONE) : fill(t(QUICK_YOURS), { list: own.map(o => o.name).join(', ') }),
      t(QUICK_HOW),
    ].map(l => `- ${l}`),
  ].join('\n')
}

export const quickSaid = (english: string, t: Say, name = ''): string => fill(t(english), { name })
