// The Guard: four checks on risky steps (Off, Warn or Hold each) and the halt switch. These are speed bumps, not a lock: the checks read command text, and a hook that fails lets a step through in Warn. Only names, paths, counts and times are kept.
import { tr } from './lang'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { HOST_RULE_WORDS } from './guardhost'
import { absolute, isInside } from './guardpaths'
import { isEditTool, runsCommand } from './tools'

export type Block = 'destructive' | 'scope' | 'packages' | 'tests'
export const BLOCKS: readonly Block[] = ['destructive', 'scope', 'packages', 'tests']
export type Mode = 'off' | 'warn' | 'hold'

export const SETTING_KEY: Record<Block, string> = { destructive: 'guard.destructive', scope: 'guard.scope', packages: 'guard.packages', tests: 'guard.tests' }

const MODES = [
  { value: 'off', label: 'Off' },
  { value: 'warn', label: 'Warn' },
  { value: 'hold', label: 'Stop' },
]

// A refused step may be a mistake of the check, so the default is Warn.
export const GUARD_SETTINGS: Setting[] = [
  { key: SETTING_KEY.destructive, group: 'Risky steps', label: 'Risky commands', note: 'Deleting, force-pushing, wiping. Stops if Claude Code would not ask first, else warns.', options: MODES, default: 'warn' },
  { key: SETTING_KEY.scope, group: 'Risky steps', label: 'Only your folders', note: 'Edits outside your folders, and edits to protected files.', options: MODES, default: 'warn' },
  { key: SETTING_KEY.packages, group: 'Risky steps', label: 'New packages', note: 'Odd new packages: very young, look-alike names, deprecated.', options: MODES, default: 'warn' },
  { key: SETTING_KEY.tests, group: 'Risky steps', label: 'Test changes', note: 'Edits that skip tests or remove checks from them.', options: MODES, default: 'warn' },
]

export const GUARD_HELP: HelpEntry[] = [
  {
    title: 'Why did it stop me?',
    text: 'The safety check watches risky steps: deletes and force-pushes, edits outside your folders, odd new packages, and weakened tests. In Warn it tells Claude after the step, and in Stop it stops the step until you allow it. Left on its own setting, a risky command stops only when Claude Code would not ask you first (if vaken cannot tell, it warns).',
  },
  {
    title: 'Pause all and allow once',
    text: '/vaken-pause pauses shell commands, file edits, tools from other apps, agents, web fetches and skills in this session, until you run /vaken-pause off. /vaken-guard allow once lets the next stopped step through.',
  },
]

const RULE: Record<Block, string> = { destructive: 'risky command hold', scope: 'edit fence', packages: 'package check', tests: 'test change alert' }
const WHAT_DOES: Record<Block, string> = {
  destructive: 'Deletes, force-pushes, wipes, SQL that drops or empties data, cloud and database deletes, and package publishes', // en-only: text twin (the plain answer of /vaken-guard)
  scope: 'Edits outside the folders you set, and edits to protected files',
  packages: 'New packages that look odd (very young, look-alike names, deprecated)',
  tests: 'Edits to test files that skip tests or remove checks',
}

export const HELD_WHAT: Record<Block, string> = { destructive: 'Held a risky command', scope: 'Held an edit outside the fence', packages: 'Held a package install', tests: 'Held a weakened test' }
export const WARNED_WHAT: Record<Block, string> = { destructive: 'Warned about a risky command', scope: 'Warned about an edit outside the fence', packages: 'Warned about a package install', tests: 'Warned about a weakened test' }
export const HALT_WHAT = 'Paused all changes'
export const RESUME_WHAT = 'Resumed after a pause'
export const HALT_DENY_WHAT = 'Refused a step while paused'
export const ALLOW_SET_WHAT = 'Allowed the next stopped step'
export const ALLOW_USED_WHAT = 'Let a stopped step through'
// The person's no to a stopped step: it clears the step from Needs you and never lets it run.
export const DISMISS_WHAT = 'Dismissed a stopped step'
export const GUARD_WHATS: readonly string[] = [...BLOCKS.map(b => HELD_WHAT[b]), ...BLOCKS.map(b => WARNED_WHAT[b]), HALT_WHAT, RESUME_WHAT, HALT_DENY_WHAT, ALLOW_SET_WHAT, ALLOW_USED_WHAT, DISMISS_WHAT]


export const haltKey = (sid: string): string => `cockpit:halt:${sid}`
export const haltMem: { on: boolean } = { on: false }
export const allowKey = (sid: string): string => `cockpit:guard:allow:${sid}`
export const scopeKey = (sid: string): string => `cockpit:guard:scope:${sid}`
export const pkgKey = (sid: string): string => `cockpit:guard:pkg:${sid}`
// `approved` packages are not checked again; `warned` ones are warned about each time. An older store holds a plain list, which is the approved list.
type PkgSeen = { approved: string[]; warned: string[] }
const PKG_KEEP = 200
export function parsePkg(v: unknown): PkgSeen {
  if (Array.isArray(v)) return { approved: strings(v).slice(-PKG_KEEP), warned: [] }
  const o = (typeof v === 'object' && v !== null ? v : {}) as { approved?: unknown; warned?: unknown }
  return { approved: strings(o.approved).slice(-PKG_KEEP), warned: strings(o.warned).slice(-PKG_KEEP) }
}
const addNames = (old: string[], names: string[]): string[] => [...old.filter(n => !names.includes(n)), ...names].slice(-PKG_KEEP)
export function withPkg(old: PkgSeen, approved: string[], warned: string[]): PkgSeen {
  return { approved: addNames(old.approved, approved), warned: addNames(old.warned.filter(n => !approved.includes(n)), warned.filter(n => !approved.includes(n))) }
}
// An unused allow once fades, so an old yes does not wait for some later step.
export const ALLOW_TTL_MS = 30 * 60_000


export const canChange = (tool: string): boolean => runsCommand(tool) || isEditTool(tool) || tool.startsWith('mcp__')

// Halt also stops tools that start helpers, fetch from the web, run a skill or send to another session, since they can change things or let something out.
export const HALT_EXTRA_TOOLS: ReadonlySet<string> = new Set(['Task', 'Agent', 'WebFetch', 'Skill', 'SendMessage', 'CronCreate'])
export const haltStops = (tool: string): boolean => canChange(tool) || HALT_EXTRA_TOOLS.has(tool)

export const HALT_SCOPE = 'shell commands, file edits, tools from other apps, agents, web fetches and skills'

// The task runner and the merge step act without a Claude tool call, so they read the halt themselves.
export const HALT_ON_SAID = 'Pause is on. Nothing ran. Resume with /vaken-pause off first.'


// `soft`: a finding that only warns even in Hold, such as a registry that did not answer in time.
export type Found = { block: Block; key: string; words: string; soft?: true }

const joinWords = (list: Found[]): string => list.map(f => f.words).join(' ')
const rulesOf = (list: Found[]): string => [...new Set(list.map(f => RULE[f.block]))].join(' and ')

export const holdReason = (list: Found[]): string => `Vaken's ${rulesOf(list)} stopped this step. ${joinWords(list)} Do not look for another way around it. Ask the person; they can allow it with /vaken-guard allow once. After the person allows it, send the exact same step again.`

export const warnNote = (list: Found[]): string => `Vaken's ${rulesOf(list)} saw a risk in the step that just ran. ${joinWords(list)} Tell the person about it in your next message, in plain words.`

export const allowedNote = (list: Found[]): string => `Vaken's ${rulesOf(list)} would have stopped this step, but the person allowed it once. ${joinWords(list)}`

export const haltReason = 'Vaken paused this session. No shell command, file edit, tool from another app, agent, web fetch or skill may run until the person resumes it. Do not try another way. Tell the person and wait. They resume it with /vaken-pause off.'

export const guardBrokeReason = 'The vaken safety check could not check this step, so it did not run it. Ask the person; they can turn the safety check off in Settings > Safety.'

const HAPPENED: Record<Block, string> = { destructive: 'a risky command', scope: 'an edit outside your folders', packages: 'a package that looks odd', tests: 'a weakened test' }
const rulesSaid = (list: Found[]): string => [...new Set(list.map(f => tr(HAPPENED[f.block])))].join(` ${tr('and')} `)
export const heldToast = (list: Found[]): string => tr('Stopped {what}. Press Allow once in Needs you to let it through.').replace('{what}', rulesSaid(list))
export const warnToast = (list: Found[]): string => tr('Claude was told about {what}.').replace('{what}', rulesSaid(list))

export const detailOf = (list: Found[]): string => joinWords(list).slice(0, 220)


export type Allow = { at: number }
const atOf = (v: unknown): Allow | undefined => (typeof v === 'object' && v !== null && typeof (v as { at?: unknown }).at === 'number' ? { at: (v as { at: number }).at } : undefined)
export const parseAllow = (v: unknown): Allow | undefined => (typeof (v as { usedBy?: unknown } | undefined)?.usedBy === 'string' ? undefined : atOf(v))
export const allowLive = (a: Allow | undefined, now: number): boolean => a !== undefined && now - a.at < ALLOW_TTL_MS && now >= a.at

export type Halt = { at: number }
export const parseHalt = atOf
export const haltIsOn = async (get: (key: string) => Promise<unknown>, sid: string): Promise<boolean> => parseHalt(await get(haltKey(sid))) !== undefined


export const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
export const inScope = (absPath: string, scope: readonly string[]): boolean => scope.length === 0 || scope.some(s => isInside(absPath, s))

export function scopeFrom(words: string[], home: string, cwd: string): string[] {
  const abs = [...new Set(words.map(w => absolute(w.replace(/^["']|["']$/g, ''), home, cwd)))]
  return abs.filter(p => !abs.some(o => o !== p && isInside(p, o)))
}


type GuardAsk = { kind: 'status' } | { kind: 'allow' } | { kind: 'scope-show' } | { kind: 'scope-off' } | { kind: 'scope-set'; words: string[] } | { kind: 'bad'; why: string }

export function parseGuardAsk(args: string): GuardAsk {
  const words = args.trim().split(/\s+/).filter(w => w !== '')
  const first = words[0]?.toLowerCase()
  if (first === undefined) return { kind: 'status' }
  if (first === 'allow') return words.length === 2 && words[1].toLowerCase() === 'once' ? { kind: 'allow' } : { kind: 'bad', why: 'Use: /vaken-guard allow once' }
  if (first === 'scope') {
    if (words.length === 1) return { kind: 'scope-show' }
    if (words.length === 2 && words[1].toLowerCase() === 'off') return { kind: 'scope-off' }
    return { kind: 'scope-set', words: words.slice(1) }
  }
  return { kind: 'bad', why: 'Use: /vaken-guard, /vaken-guard allow once, /vaken-guard scope <folders...> or /vaken-guard scope off' }
}

export const MODE_WORDS: Record<Mode, string> = { off: 'off', warn: 'warn (the step runs and Claude is told)', hold: 'stop (the step is stopped until you allow it)' }

export type OtherRule = 'world' | 'secrets' | 'migrations'
export const OTHER_RULES: readonly OtherRule[] = ['world', 'secrets', 'migrations']
export const OTHER_SETTING_KEY: Record<OtherRule, string> = { world: 'guard.world', secrets: 'guard.secrets', migrations: 'guard.migrations' }
const OTHER_RULE: Record<OtherRule, string> = { world: 'outside-actions check', secrets: 'secret tripwire', migrations: 'migration hold' }
const OTHER_DOES: Record<OtherRule, string> = {
  world: 'Messages, posts, payments, pull requests and cloud changes', // en-only: text twin (the plain answer of /vaken-guard)
  secrets: 'Secret files read, keys printed, and secrets sent off this computer', // en-only: text twin (the plain answer of /vaken-guard)
  migrations: 'Database migrations that change the structure', // en-only: text twin (the plain answer of /vaken-guard)
}

type StatusFacts = { modes: Record<Block, Mode>; others?: Record<OtherRule, Mode>; halted: boolean; allowPending: boolean; scope: string[]; last: string[] }

export function statusText(f: StatusFacts): string {
  const lines: string[] = []
  lines.push(f.halted ? `PAUSED: ${HALT_SCOPE} are stopped in this session. Resume with /vaken-pause off.` : `Not paused. /vaken-pause pauses ${HALT_SCOPE}.`)
  lines.push('')
  const line = (rule: string, mode: Mode, does: string): string => `${rule.charAt(0).toUpperCase()}${rule.slice(1)}: ${MODE_WORDS[mode]}. ${does}.`
  for (const b of BLOCKS) lines.push(line(RULE[b], f.modes[b], WHAT_DOES[b]))
  const others = f.others
  if (others !== undefined) for (const r of OTHER_RULES) lines.push(line(OTHER_RULE[r], others[r], OTHER_DOES[r]))
  lines.push('')
  lines.push(f.scope.length > 0 ? `Your folders: ${f.scope.join(', ')}. /vaken-guard scope off clears them.` : 'Your folders: none set, so only protected files count. /vaken-guard scope <folders...> sets them.')
  lines.push(f.allowPending ? 'Allow once: ready. The next stopped step will go through.' : 'Allow once: not set. After a step is stopped, /vaken-guard allow once lets the next one through.')
  if (f.last.length > 0) lines.push('', 'Last:', ...f.last)
  lines.push('', HOST_RULE_WORDS)
  lines.push('', 'Change a check: Settings > Safety. These checks read the text of a step. They are reminders and speed bumps, not a lock.')
  return lines.join('\n')
}
