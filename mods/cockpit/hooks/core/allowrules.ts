// Why a step stopped, and the rules in force: the band says why Claude Code stopped a step; the Memory card lists the allow and deny rules. vaken never writes a settings file.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { commandsOf, flagsOf } from './guardshell'
import { checkCommand } from './guarddestroy'
import { hideSecrets, kindOf, labelOf, riskiestPiece, safeLabelOf } from './guardcmds'
import type { Vars } from '../i18n/types'
import { t } from '../i18n/t'
import { hostOf, outwardOf } from './guardeffects'
import { maskSecrets, secretFileKind } from './guardsecrets'
import { protectedHit } from './guardjudge'
import { absolute, isInside } from './guardpaths'
import { isEditTool, runsCommand } from './tools'

export type AllowRulesMode = 'off' | 'offer'
// 'offer' is the stored word for On (kept so a saved choice still reads)
export const allowRulesModeOf = (v: unknown): AllowRulesMode => (v === 'off' ? 'off' : 'offer')
// The mode lives in memory: the band never reads the store for it
export const allowMem: { mode: AllowRulesMode } = { mode: 'offer' }

export const ALLOW_RULES_LABEL = 'Why a step stopped'
export const ALLOW_RULES_NOTE = 'Says in the band why Claude Code stopped a step.'
export const ALLOW_RULES_SETTINGS: Setting[] = [
  {
    key: 'allow.rules',
    group: 'Risky steps',
    label: ALLOW_RULES_LABEL,
    note: ALLOW_RULES_NOTE,
    options: [
      { value: 'off', label: 'Off' },
      { value: 'offer', label: 'On' },
    ],
    default: 'offer',
  },
]
export const ALLOW_RULES_HELP_TITLE = 'Why a step stopped'
export const ALLOW_RULES_HELP_TEXT = "When Claude Code itself stops a step (its auto mode, a deny rule, or don't ask mode), the band says why in one plain line for a few minutes. Vaken never answers Claude Code's Allow question and never changes your settings."
export const ALLOW_RULES_HELP: HelpEntry[] = [{ title: ALLOW_RULES_HELP_TITLE, text: ALLOW_RULES_HELP_TEXT }]

// Keep stopped, beside Allow once on a stopped step in Needs you
export const KEEP_STOPPED = 'Keep stopped'
export const KEPT_SAID = 'Kept stopped. If Claude tries this exact step again in this session, it stays stopped.'
export const STEP_FACT = 'Step: {short}'
export const ALLOW_RULES_STRINGS: string[] = [ALLOW_RULES_LABEL, ALLOW_RULES_NOTE, ALLOW_RULES_HELP_TITLE, ALLOW_RULES_HELP_TEXT, KEEP_STOPPED, KEPT_SAID, STEP_FACT]

export type Env = { home: string; cwd: string; root: string }

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
// The safe short form of a stopped step: the program and its main target, secrets masked, at most 60 characters.
export const SHORT_MAX = 60
const cut = (s: string): string => (s.length > SHORT_MAX ? `${s.slice(0, SHORT_MAX - 1)}…` : s)
const baseOf = (p: string): string => p.split(/[\\/]/).filter(x => x !== '').pop() ?? ''
export function shortStepOf(call: unknown): string | undefined {
  try {
    const o = call as Record<string, unknown> | undefined
    const tool = str(o?.tool)
    if (tool === '') return undefined
    let text: string
    if (runsCommand(tool)) {
      const command = str(o?.command)
      text = labelOf(riskiestPiece(command) ?? command)
    } else if (isEditTool(tool)) text = `${tool} ${baseOf(str(o?.file_path) || str(o?.notebook_path))}`
    else if (tool === 'WebFetch') text = `WebFetch ${hostOf(str(o?.url)) ?? ''}`
    else text = tool
    const safe = cut(maskSecrets(hideSecrets(text.replace(/\s+/g, ' ').trim())))
    return safe === '' ? undefined : safe
  } catch {
    return undefined
  }
}

// ---- Rules in force (the Memory and notes card): which allow and deny rules and which instruction files apply now, what changed mid-session,
// and a rule both allowed and denied. Names and counts only, in this process's memory; nothing is stored and no file text is kept.
export type RulesNow = {
  // Read from each settings source when the session starts and again after a settings change
  allow: string[]
  deny: string[]
  // The instruction files Claude Code loaded (the classic InstructionsLoaded event): the file's name and its tier
  files: { name: string; kind: string }[]
  // A settings file, or an instruction file whose size changed, after the session started: its name, newest first
  changed: { name: string; at: number }[]
  read: boolean
}
export const rulesMem: RulesNow = { allow: [], deny: [], files: [], changed: [], read: false }
export const RULES_NAMES_MAX = 40
const CHANGED_MAX = 6
// The settings sources a rule can come from, lowest first (the engine's SettingsSource less the command line's flag)
export const RULE_SOURCES = ['user', 'project', 'local', 'policy'] as const

const ruleList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(x => hideSecrets(x.trim()).slice(0, 160)) : [])
// Every source's `permissions.allow` and `permissions.deny`, each rule once
export function rulesFrom(sources: readonly unknown[]): { allow: string[]; deny: string[] } {
  const allow: string[] = []
  const deny: string[] = []
  for (const s of sources) {
    const p = (s as { permissions?: { allow?: unknown; deny?: unknown } } | undefined)?.permissions
    for (const r of ruleList(p?.allow)) if (!allow.includes(r)) allow.push(r)
    for (const r of ruleList(p?.deny)) if (!deny.includes(r)) deny.push(r)
  }
  return { allow: allow.slice(0, RULES_NAMES_MAX), deny: deny.slice(0, RULES_NAMES_MAX) }
}

// The same rule allowed and denied: the deny wins in Claude Code, so the allow does nothing
// (the old prefix form "npm test:*" and the new "npm test *" are the same rule)
const sameRule = (r: string): string => r.replace(/:\*\)$/, '*)').replace(/\s+/g, '').toLowerCase()
export const clashesOf = (allow: readonly string[], deny: readonly string[]): string[] => {
  const denied = new Set(deny.map(sameRule))
  return allow.filter(r => denied.has(sameRule(r)))
}

const nameOf = (path: string): string => path.split(/[\\/]/).filter(p => p !== '').slice(-2).join('/')
export function noteFile(mem: RulesNow, path: string, kind: string): void {
  const name = nameOf(path)
  if (name === '' || mem.files.some(f => f.name === name)) return
  mem.files = [...mem.files, { name, kind: kind.toLowerCase() }].slice(-RULES_NAMES_MAX)
}
export function noteChanged(mem: RulesNow, name: string, at: number): void {
  if (name === '') return
  mem.changed = [{ name, at }, ...mem.changed.filter(c => c.name !== name)].slice(0, CHANGED_MAX)
}
// A settings change names its file, else its source ("project settings")
export const changedName = (filePath: string | undefined, source: string): string => (filePath !== undefined && filePath !== '' ? nameOf(filePath) : source === 'skills' ? 'skills' : `${source.replace(/_settings$/, '')} settings`)

// An instruction file's size seen first in this session, by path: a later size that differs means it changed (the Memory and notes card reads the files every few minutes)
const firstSize = new Map<string, string>()
export function sizesChanged(files: readonly { path: string; chars: number; lines: number }[]): string[] {
  const out: string[] = []
  for (const f of files) {
    const sig = `${f.chars}:${f.lines}`
    const was = firstSize.get(f.path)
    if (was === undefined) firstSize.set(f.path, sig)
    else if (was !== sig) {
      // Said once per change
      firstSize.set(f.path, sig)
      out.push(nameOf(f.path))
    }
  }
  return out
}
export const forgetSizes = (): void => firstSize.clear()

// ---- Why a step stopped: when Claude Code itself stops a step, the band says why in one plain line. The words come from the guard's own readings
// (kindOf, checkCommand, outwardOf, protectedHit); no second explainer. vaken never answers Claude Code's "Allow?" question and never changes a decision.
// The line lives in this process's memory only (words built from names and counts, and a hash of the step), never in the store.
export type AskSaid = { name: string; vars?: Vars }
// `then`: the step's words after `said` (why first, then what it was)
export type AskView = { said: AskSaid; then?: AskSaid }
// A step Claude Code itself stopped (auto mode, a deny rule, don't ask mode), said in one plain line for a few minutes. In memory only: the step's kind
// and a hash of it and the words built from the guard's readings; never the command or the engine's reason.
export type DeniedWhy = 'rule' | 'auto' | 'dontask' | 'other'
export const DENIED_BAND_MS = 3 * 60_000
const DENIED_NAMES: Record<DeniedWhy, string> = { rule: 'allow.denied_rule', auto: 'allow.denied_auto', dontask: 'allow.denied_dontask', other: 'allow.denied_other' }
export type DeniedLine = { why: DeniedWhy; said: AskSaid; tool: string; hash: string; at: number }
export const askMem: { denied?: DeniedLine } = {}
export function noteDenied(line: DeniedLine): void {
  askMem.denied = line
}

// The kind words of the guard's command reader, which are not a program's own verb
const KIND_WORDS = new Set(['other', 'read', 'edit', 'build', 'test', 'run', 'git', 'install', 'network', 'database', 'destroy', 'migration', 'deploy'])
const safeWords = (s: string): string => cut(maskSecrets(hideSecrets(s.replace(/\s+/g, ' ').trim())))
// "git · commit" says "git commit"; "node · run" says "node"
const progOf = (command: string): string => {
  const [prog, verb] = safeLabelOf(command).split(' · ')
  return safeWords(verb === undefined || KIND_WORDS.has(verb) ? (prog ?? '') : `${prog} ${verb}`)
}
const relOf = (abs: string, root: string): string => {
  const rel = root !== '' && isInside(abs, root) ? abs.slice(root.length) : abs
  return rel.split(/[\\/]/).filter(p => p !== '').slice(-2).join('/')
}
// The one folder that holds every path, said from the project (`build/`); the project's own name when it is the root
export function folderOf(paths: readonly string[], root: string): string {
  const dirs = paths.map(p => p.replace(/[\\/]+$/, '').split(/[\\/]/).slice(0, -1))
  let common = dirs[0] ?? []
  for (const d of dirs.slice(1)) {
    let n = 0
    while (n < common.length && n < d.length && common[n] === d[n]) n += 1
    common = common.slice(0, n)
  }
  const abs = common.join('/') || '/'
  const rel = relOf(abs, root)
  return safeWords(`${rel === '' ? baseOf(root) || abs : rel}/`)
}

// The line for a step that reaches outside. The words are short and fixed (the band keeps one line at 288 pt); the guard's few fixed targets have their own row so Swedish says them in Swedish,
// any other target (a service or a host) is cut short and said as it is, and a step with no named target says its program.
const OUTSIDE_FIXED: Record<string, string> = { 'a git remote': 'allow.ask_out_push', 'a container registry': 'allow.ask_out_registry', 'a Kubernetes cluster': 'allow.ask_out_cluster', 'your infrastructure': 'allow.ask_out_infra', 'another machine': 'allow.ask_out_machine' } // en-only: the guard's own target names, matched here and never shown
const OUTSIDE_TO_MAX = 22
const OUTSIDE_LABEL_MAX = 14
const short = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s)
export function outsideSaid(to: string, label: string): AskSaid {
  const fixed = OUTSIDE_FIXED[to]
  if (fixed !== undefined) return { name: fixed }
  const named = safeWords(to)
  return named === '' ? { name: 'allow.ask_outside_with', vars: { label: short(safeWords(label), OUTSIDE_LABEL_MAX) } } : { name: 'allow.ask_outside', vars: { to: short(named, OUTSIDE_TO_MAX) } }
}

// A recursive delete takes a whole folder and everything in it: `rm -r`, and the PowerShell names of Remove-Item (ri, del, erase, rd, rmdir, rm) with -Recurse,
// in any case and as any prefix PowerShell takes (-r, -rec, -Recurse). The folder it names, said from the project ("shared/build/"), or none.
const PS_DELETE = new Set(['remove-item', 'ri', 'del', 'erase', 'rd', 'rmdir', 'rm'])
const PS_RECURSE = /^-r(?:e(?:c(?:u(?:r(?:s(?:e)?)?)?)?)?)?$/i
// -Path and -LiteralPath (and the prefixes PowerShell takes, never one letter) take the target as their value; -Include, -Exclude, -Filter, -Stream and -Credential take a value that is not the target
const PS_PATH = /^-(?:pa(?:t(?:h)?)?|li(?:t(?:e(?:r(?:a(?:l(?:p(?:a(?:t(?:h)?)?)?)?)?)?)?)?)?)$/i
const PS_OTHER_VALUE = /^-(?:in(?:c(?:l(?:u(?:d(?:e)?)?)?)?)?|ex(?:c(?:l(?:u(?:d(?:e)?)?)?)?)?|fi(?:l(?:t(?:e(?:r)?)?)?)?|st(?:r(?:e(?:a(?:m)?)?)?)?|cr(?:e(?:d(?:e(?:n(?:t(?:i(?:a(?:l)?)?)?)?)?)?)?)?)$/i
export function wholeFolderOf(command: string, env: Env): string | undefined {
  for (const c of commandsOf(command)) {
    const prog = (c.prog.split(/[\\/]/).pop() ?? c.prog).toLowerCase().replace(/\.exe$/, '')
    if (!PS_DELETE.has(prog)) continue
    const { short, long, positional } = flagsOf(c.args)
    let target = ''
    // `rm -Force x` is PowerShell's: its flag words are not letter groups (-Force is not -r)
    const psStyle = c.args.some(t => t.quoted !== true && (/^-[A-Z][a-z]{2,}$/.test(t.t) || /^-(?:force|recurse|path|literalpath|include|exclude|confirm|whatif|verbose)$/i.test(t.t)))
    let recursive = prog === 'rm' && !psStyle && (short.has('r') || short.has('R') || long.has('--recursive'))
    // PowerShell's named parameters, one token at a time: a flag word is not a letter group here (-Force is not -r)
    const args = c.args.filter(t => t.op !== true)
    for (let k = 0; k < args.length; k += 1) {
      const word = args[k]?.t ?? ''
      const quoted = args[k]?.quoted === true
      if (quoted || !word.startsWith('-')) continue
      if (PS_RECURSE.test(word)) recursive = true
      else if (PS_PATH.test(word) && target === '') target = args[k + 1]?.t ?? ''
    }
    if (target === '') target = positional.find(t => !PS_OTHER_VALUE_AT(args, t))?.t ?? ''
    target = target.replace(/[\\/*]+$/, '')
    if (!recursive || target === '') continue
    const abs = absolute(target, env.home, env.cwd)
    const rel = relOf(abs, env.root)
    return safeWords(`${rel === '' ? baseOf(abs) || abs : rel}/`)
  }
  return undefined
}
// A positional word that is the value of -Include, -Exclude and the like, so not the target
const PS_OTHER_VALUE_AT = (args: readonly { t: string; quoted?: boolean }[], word: { t: string }): boolean => {
  const at = args.findIndex(a => a === word || a.t === word.t)
  const before = at > 0 ? args[at - 1] : undefined
  return before !== undefined && before.quoted !== true && PS_OTHER_VALUE.test(before.t)
}

// What the step does, in the guard's terms: the words to say, whether the guard rates it risky, and whether it changes files.
// A whole folder deleted is always risky and says so, however few files undo counted in it.
// `changed`: the files undo found the step changes (a delete counts them).
export function stepSaid(tool: string, args: Record<string, unknown>, env: Env, changed: readonly string[]): { said: AskSaid; risky: boolean; writes: boolean } {
  const out = outwardOf(tool, args).find(o => o.write)
  if (runsCommand(tool)) {
    const command = str(args.command)
    const kind = kindOf(command)
    // Amber only for a real risk: what the guard's destroy check finds, a step that reaches outside, a migration or a deploy (a rule is never offered for any risky kind: ruleFormOf)
    const risky = kind === 'migration' || kind === 'deploy' || out !== undefined || checkCommand(command, { home: env.home, cwd: env.cwd, project: env.root }).length > 0
    const label = progOf(riskiestPiece(command) ?? command)
    if (out !== undefined) return { said: outsideSaid(out.to, label), risky: true, writes: true }
    const folder = kind === 'delete' ? wholeFolderOf(command, env) : undefined
    if (folder !== undefined) return { said: { name: 'allow.ask_delete_folder', vars: { dir: folder } }, risky: true, writes: true }
    if (kind === 'delete') return { said: changed.length > 0 ? { name: 'allow.ask_delete', vars: { n: changed.length, dir: folderOf(changed, env.root) } } : { name: 'allow.ask_delete_some' }, risky, writes: true }
    const said: AskSaid =
      kind === 'read' ? { name: 'allow.ask_read' }
      : kind === 'test' ? { name: 'allow.ask_test' }
      : kind === 'build' ? { name: 'allow.ask_build' }
      : kind === 'migration' ? { name: 'allow.ask_migration' }
      : kind === 'install' ? { name: 'allow.ask_install', vars: { label } }
      : kind === 'deploy' ? { name: 'allow.ask_deploy', vars: { label } }
      : kind === 'network' ? { name: 'allow.ask_network', vars: { label } }
      : kind === 'database' ? { name: 'allow.ask_database', vars: { label } }
      : kind === 'edit' && changed.length > 0 ? { name: 'allow.ask_changes', vars: { dir: folderOf(changed, env.root) } }
      : { name: 'allow.ask_runs', vars: { label } }
    return { said, risky, writes: changed.length > 0 || kind === 'edit' }
  }
  if (isEditTool(tool)) {
    const path = str(args.file_path) || str(args.notebook_path)
    const abs = path === '' ? '' : absolute(path, env.home, env.cwd)
    const risky = abs !== '' && (protectedHit(abs, env.home) !== undefined || secretFileKind(abs) !== undefined || (env.root !== '' && !isInside(abs, env.root)))
    return { said: { name: 'allow.ask_edit', vars: { file: safeWords(relOf(abs, env.root)) || tool } }, risky, writes: true }
  }
  if (out !== undefined) return { said: outsideSaid(out.to, tool), risky: true, writes: true }
  const host = tool === 'WebFetch' ? hostOf(str(args.url)) : undefined
  if (host !== undefined) return { said: { name: 'allow.ask_fetch', vars: { host: safeWords(host) } }, risky: false, writes: false }
  return { said: { name: 'allow.ask_tool', vars: { tool: safeWords(tool.startsWith('mcp__') ? tool.split('__').slice(1).join(' ') : tool) } }, risky: false, writes: false }
}

// A short hash of the step, so the question and the call that ends it are matched without keeping the command
export function stepHash(tool: string, args: unknown): string {
  const sorted = (v: unknown): unknown => (Array.isArray(v) ? v.map(sorted) : v !== null && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted((v as Record<string, unknown>)[k])])) : v)
  const text = `${tool}|${JSON.stringify(sorted(args) ?? null)}`
  let h = 5381
  for (let n = 0; n < text.length; n += 1) h = ((h * 33) ^ text.charCodeAt(n)) >>> 0
  return h.toString(36)
}

// What the band shows now: the line for a step Claude Code stopped, for a few minutes. Off shows no line at all.
export function askShown(now: number): AskView | undefined {
  if (allowMem.mode === 'off') return undefined
  const d = askMem.denied
  if (d === undefined || now < d.at || now - d.at >= DENIED_BAND_MS) return undefined
  return { said: { name: DENIED_NAMES[d.why] }, then: d.said }
}

// The line in the language of this draw: why the step stopped, then what it was. `step` alone is what a narrow band keeps.
export function askWords(v: AskView): { step: string; text: string } {
  const step = t(v.said.name, v.said.vars)
  return { step, text: v.then === undefined ? step : `${step} ${t(v.then.name, v.then.vars)}` }
}
