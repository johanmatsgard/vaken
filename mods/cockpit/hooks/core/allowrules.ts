// Fewer may-I stops: counts the yes the person gave to Claude Code's own "Allow?" question, per short rule form, and offers that rule once. vaken never writes a settings file.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import type { Io } from './io'
import { commandsOf, flagsOf } from './guardshell'
import { checkCommand, shellWriteTargets } from './guarddestroy'
import { hideSecrets, kindOf, labelOf, riskiestPiece, safeLabelOf } from './guardcmds'
import type { Vars } from '../i18n/types'
import { t, tr } from '../i18n/t'
import { bashEffects, hostOf, outwardOf } from './guardeffects'
import { maskSecrets, scanSecrets, secretFileKind } from './guardsecrets'
import { protectedHit } from './guardjudge'
import { absolute, isInside } from './guardpaths'
import { isEditTool, runsCommand } from './tools'

export type AllowRulesMode = 'off' | 'offer'
export const allowRulesModeOf = (v: unknown): AllowRulesMode => (v === 'off' ? 'off' : 'offer')

export const ALLOW_RULES_LABEL = 'Allow rules'
export const ALLOW_RULES_NOTE = 'Explains each Allow question in the band, and shows its rule after 3 yeses.'
export const ALLOW_RULES_OPT_OFFER = 'Offer'
export const ALLOW_RULES_SETTINGS: Setting[] = [
  {
    key: 'allow.rules',
    group: 'Risky steps',
    label: ALLOW_RULES_LABEL,
    note: ALLOW_RULES_NOTE,
    options: [
      { value: 'off', label: 'Off' },
      { value: 'offer', label: ALLOW_RULES_OPT_OFFER },
    ],
    default: 'offer',
  },
]
export const ALLOW_RULES_HELP_TITLE = 'What allow rules are'
export const ALLOW_RULES_HELP_TEXT = 'When you say yes to the same kind of step 3 times in a week where Claude Code asks first, vaken shows the rule that stops that question once, such as Bash(npm test:*). You add it yourself to .claude/settings.json under "permissions" > "allow"; vaken never changes that file and never offers a rule for a risky step. /vaken-guard rules lists the rules offered so far; while Claude Code asks, the band says what the step does and whether Undo has a copy, and when it stops a step itself, why; vaken never answers for you.'
export const ALLOW_RULES_HELP: HelpEntry[] = [{ title: ALLOW_RULES_HELP_TITLE, text: ALLOW_RULES_HELP_TEXT }]

export const RULE_OFFER = 'You allowed {what} {n} times. To stop this question, add this rule to your settings: {rule}'
export const RULE_FILE = 'File: .claude/settings.json in the project, "permissions" > "allow".'
export const RULE_NEXT = 'Press Copy the rule, then paste it into that file. Vaken never changes the file.'
export const RULE_TITLE = 'Allow rule: {what}'
export const RULE_HEAD = 'Fewer questions'
export const RULE_COPY = 'Copy the rule'
export const RULE_COPIED = 'Copied. Paste it into .claude/settings.json under "permissions" > "allow".'
export const RULE_NOT_COPIED = 'Could not copy. The rule is {rule}. Add it to .claude/settings.json under "permissions" > "allow".'
export const RULE_DISMISSED = 'Dismissed. Vaken does not offer this rule again for 30 days.'
export const WHAT_EDITS = 'edits in {dir}'
export const WHAT_FETCH = 'fetches from {host}'
// Keep stopped, beside Allow once on a stopped step in Needs you
export const KEEP_STOPPED = 'Keep stopped'
export const KEPT_SAID = 'Kept stopped. If Claude tries this exact step again in this session, it stays stopped.'
export const STEP_FACT = 'Step: {short}'
// The band's press after the third yes to a safe kind of step: it copies the rule (vaken never changes the settings file)
export const ALWAYS_KIND = 'Copy the rule to always allow this kind'
// The band's press after the engine itself stopped a step: honest, it only copies (a plugin cannot allow a stopped step later)
export const DENIED_COPY = 'Copy the allow rule'
export const ALLOW_RULES_STRINGS: string[] = [ALLOW_RULES_LABEL, ALLOW_RULES_NOTE, ALLOW_RULES_OPT_OFFER, ALLOW_RULES_HELP_TITLE, ALLOW_RULES_HELP_TEXT, RULE_OFFER, RULE_FILE, RULE_NEXT, RULE_TITLE, RULE_HEAD, RULE_COPY, RULE_COPIED, RULE_NOT_COPIED, RULE_DISMISSED, WHAT_EDITS, WHAT_FETCH, KEEP_STOPPED, KEPT_SAID, STEP_FACT, ALWAYS_KIND, DENIED_COPY]

export const RULE_NEED = 3
const DAY_MS = 86_400_000
export const RULE_WINDOW_MS = 7 * DAY_MS
export const RULE_QUIET_MS = 30 * DAY_MS
const RULES_KEPT = 60

// `rule` as Claude Code's settings write it; `what` is the short words a person reads.
export type RuleForm = { rule: string; what: string }
export type Env = { home: string; cwd: string; root: string }

const PROG = /^[A-Za-z][A-Za-z0-9._+-]{0,29}$/
const WORD = /^[A-Za-z0-9][A-Za-z0-9._:@+-]{0,39}$/
// Signs of more than one command, a redirect, a substitution or a variable: a prefix rule would not mean what was allowed.
const SHELL_SIGNS = /[;&|<>`$\n\\(){}]/
// Programs that can run anything, destroy, write over files or reach out: a rule for them is never offered. A prefix rule covers every flag that may
// follow, so a program whose own flags run, delete or overwrite (find -delete, sed -i, tar -x, awk system()) is on this list.
const NEVER = new Set(['sudo', 'su', 'doas', 'env', 'xargs', 'parallel', 'eval', 'exec', 'nohup', 'command', 'builtin', 'time', 'timeout', 'watch', 'nice', 'dd', 'mkfs', 'kill', 'killall', 'pkill', 'shutdown', 'reboot', 'rm', 'rmdir', 'unlink', 'shred', 'trash', 'truncate', 'chmod', 'chown', 'chgrp', 'mv', 'cp', 'ln', 'install', 'ditto', 'tar', 'bsdtar', 'cpio', 'pax', 'unzip', 'zip', 'gzip', 'gunzip', '7z', 'patch', 'find', 'fd', 'sed', 'gsed', 'awk', 'gawk', 'mawk', 'nawk', 'perl', 'ruby', 'node', 'python', 'python2', 'python3', 'php', 'lua', 'bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'pwsh', 'powershell', 'source', 'vi', 'vim', 'nvim', 'ex', 'ed', 'emacs', 'ssh', 'scp', 'sftp', 'rsync', 'curl', 'wget', 'nc', 'docker', 'podman', 'kubectl', 'osascript', 'open', 'start', 'tee', 'sponge', 'crontab', 'launchctl', 'defaults', 'security'])
// These take what follows as the thing to run, so a rule needs that word too.
const NEEDS_WORD = new Set(['npm', 'pnpm', 'yarn', 'bun', 'npx', 'bunx', 'pnpx', 'deno', 'go', 'cargo', 'make', 'uv', 'poetry', 'pip', 'pip3', 'brew', 'gh', 'dotnet', 'swift', 'mvn', 'gradle', 'git', 'terraform', 'tsx', 'ts-node'])
// Interpreters run a script whose next words choose what it does (`manage.py runserver`, then `manage.py flush`): only the exact command is offered.
const INTERPRETERS = new Set(['deno', 'tsx', 'ts-node', 'java', 'julia'])
const SCRIPT_FILE = /\.(?:py|pyw|js|mjs|cjs|ts|mts|cts|tsx|jsx|rb|php|pl|pm|sh|bash|zsh|lua|r|go|swift|java|jl|kts?|groovy)$/i
// The longest exact command offered as a rule.
const EXACT_MAX = 120
const PKG_RUNNERS = new Set(['npx', 'bunx', 'pnpx'])
const RUN_WORDS = new Set(['run', 'run-script', 'exec', 'x', 'dlx'])
// Git words that only read or record locally.
const GIT_SAFE = new Set(['status', 'diff', 'log', 'show', 'add', 'commit', 'fetch', 'blame', 'grep', 'ls-files', 'rev-parse', 'describe', 'shortlog'])
const RISKY_KINDS = new Set(['delete', 'migration', 'deploy', 'database', 'network', 'install'])
// A script or sub-command with one of these words may change things far beyond the step that was allowed.
const RISKY_WORDS = /(?:^|[-_:.])(?:deploy|publish|release|push|destroy|delete|drop|reset|clean|migrate|migration|rollback|apply|prune|remove|uninstall|rm|kill|seed|wipe|nuke|force|flush|truncate|purge|erase)(?:$|[-_:.])/i

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const hasSecret = (text: string): boolean => scanSecrets(text).length > 0 || maskSecrets(text) !== text || hideSecrets(text) !== text

function bashForm(command: string, env: Env): RuleForm | undefined {
  const text = command.trim()
  if (text === '' || text.length > 400 || SHELL_SIGNS.test(text) || hasSecret(text)) return undefined
  if (commandsOf(text).length !== 1) return undefined
  const words = text.split(/\s+/)
  const prog = words[0] ?? ''
  if (!PROG.test(prog) || NEVER.has(prog)) return undefined
  if (RISKY_KINDS.has(kindOf(text))) return undefined
  if (checkCommand(text, { home: env.home, cwd: env.cwd, project: env.root }).length > 0) return undefined
  if (shellWriteTargets(text, { home: env.home, cwd: env.cwd }).some(p => protectedHit(p, env.home) !== undefined || !isInside(p, env.root))) return undefined
  if (bashEffects(text).length > 0) return undefined
  const sub = words[1]
  const plainSub = sub !== undefined && !sub.startsWith('-') && WORD.test(sub) ? sub : undefined
  // A rule for the program alone would cover every flag it takes: a plain second word is needed.
  if (plainSub === undefined) return undefined
  let lead: string
  if (prog === 'git') {
    if (!GIT_SAFE.has(plainSub)) return undefined
    lead = `git ${plainSub}`
  } else if (NEEDS_WORD.has(prog)) {
    const script = words[2]
    // npx runs a package whose own next word picks what it does (npx prisma generate, npx prisma migrate reset), so that word is needed too.
    if (RUN_WORDS.has(plainSub) || PKG_RUNNERS.has(prog)) {
      if (script === undefined || script.startsWith('-') || !WORD.test(script)) return undefined
      lead = `${prog} ${plainSub} ${script}`
    } else lead = `${prog} ${plainSub}`
  } else lead = `${prog} ${plainSub}`
  // A script run by an interpreter: the rule is the exact command, never a prefix, or none.
  if (INTERPRETERS.has(prog) || lead.split(' ').some(w => SCRIPT_FILE.test(w))) return exactForm(words, env)
  // The rule covers every command that starts the same way, so the start alone is checked once more.
  if (lead.split(' ').slice(1).some(w => RISKY_WORDS.test(w)) || RISKY_KINDS.has(kindOf(lead)) || checkCommand(lead, { home: env.home, cwd: env.cwd, project: env.root }).length > 0) return undefined
  return { rule: `Bash(${lead}:*)`, what: `\`${lead}\`` }
}

// The exact command as a rule (no :*): plain words only, none of them risky, and the whole command passes the checks once more.
function exactForm(words: string[], env: Env): RuleForm | undefined {
  const text = words.join(' ')
  if (text.length > EXACT_MAX || words.some(w => !/^[A-Za-z0-9._:@+/=-]+$/.test(w) || RISKY_WORDS.test(w))) return undefined
  if (RISKY_KINDS.has(kindOf(text)) || checkCommand(text, { home: env.home, cwd: env.cwd, project: env.root }).length > 0) return undefined
  return { rule: `Bash(${text})`, what: `\`${text}\`` }
}

function editForm(path: string, env: Env): RuleForm | undefined {
  if (path === '' || env.root === '' || hasSecret(path)) return undefined
  const abs = absolute(path, env.home, env.cwd)
  if (!isInside(abs, env.root) || abs === env.root || protectedHit(abs, env.home) !== undefined || secretFileKind(abs) !== undefined) return undefined
  const rel = abs.slice(env.root.length).replace(/^[\\/]+/, '').replace(/\\/g, '/')
  const top = rel.split('/')[0] ?? ''
  // A file at the top of the project, or in a dot folder (.claude, .git, .github), gets no rule.
  if (!rel.includes('/') || top.startsWith('.') || !WORD.test(top)) return undefined
  return { rule: `Edit(/${top}/**)`, what: WHAT_EDITS.replace('{dir}', `${top}/`) }
}

function fetchForm(url: string): RuleForm | undefined {
  if (hasSecret(url) || outwardOf('WebFetch', { url }).some(o => o.write)) return undefined
  const host = hostOf(url)?.toLowerCase()
  if (host === undefined || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host)) return undefined
  return { rule: `WebFetch(domain:${host})`, what: WHAT_FETCH.replace('{host}', host) }
}

// Only Bash, the file edit tools and WebFetch get a rule; every other tool, and every risky step, gets none.
export function ruleFormOf(tool: string, args: Record<string, unknown>, env: Env): RuleForm | undefined {
  try {
    if (tool === 'Bash') return bashForm(str(args.command), env)
    if (isEditTool(tool)) return editForm(str(args.file_path) || str(args.notebook_path), env)
    if (tool === 'WebFetch') return fetchForm(str(args.url))
  } catch {
    // a check that breaks offers nothing
  }
  return undefined
}

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

// Only rule forms, their words and times are kept: never a command.
export const ALLOW_RULES_KEY = 'cockpit:allowrules'
export type RuleCount = { what: string; at: number[]; offered?: number }
export type RuleBook = Record<string, RuleCount>
export type Offer = { rule: string; what: string; n: number }

export function parseBook(v: unknown): RuleBook {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {}
  const out: RuleBook = {}
  for (const [rule, raw] of Object.entries(v as Record<string, unknown>)) {
    const r = raw as Partial<RuleCount> | null
    if (typeof r !== 'object' || r === null || typeof r.what !== 'string') continue
    const at = Array.isArray(r.at) ? r.at.filter((x): x is number => typeof x === 'number').slice(-RULE_NEED) : []
    out[rule] = { what: r.what, at, ...(typeof r.offered === 'number' ? { offered: r.offered } : {}) }
  }
  return out
}

const lastSeen = (r: RuleCount): number => Math.max(r.offered ?? 0, ...r.at)

// One more yes for a rule form: an offer when it is the third in 7 days and the rule was not offered in the last 30 days.
export function noteAllow(book: RuleBook, form: RuleForm, now: number): { book: RuleBook; offer?: Offer } {
  const old = book[form.rule]
  const quiet = old?.offered !== undefined && now - old.offered < RULE_QUIET_MS
  const at = [...(old?.at ?? []).filter(t => now - t < RULE_WINDOW_MS && t <= now), now].slice(-RULE_NEED)
  const due = !quiet && at.length >= RULE_NEED
  const next: RuleCount = due ? { what: form.what, at: [], offered: now } : { what: form.what, at, ...(old?.offered === undefined ? {} : { offered: old.offered }) }
  const all = Object.entries({ ...book, [form.rule]: next }).sort((a, b) => lastSeen(b[1]) - lastSeen(a[1])).slice(0, RULES_KEPT)
  return { book: Object.fromEntries(all), ...(due ? { offer: { rule: form.rule, what: form.what, n: at.length } } : {}) }
}

export async function countAllow(i: Io, form: RuleForm, now: number): Promise<Offer | undefined> {
  const r = noteAllow(parseBook(await i.get(ALLOW_RULES_KEY)), form, now)
  await i.set(ALLOW_RULES_KEY, r.book)
  return r.offer
}

export const offeredRules = (book: RuleBook): { rule: string; what: string; at: number }[] =>
  Object.entries(book)
    .flatMap(([rule, r]) => (r.offered === undefined ? [] : [{ rule, what: r.what, at: r.offered }]))
    .sort((a, b) => b.at - a.at)

export function rulesText(book: RuleBook, mode: AllowRulesMode): string {
  const list = offeredRules(book)
  const head = mode === 'off' ? tr('Allow rules are off. /vaken-settings allow.rules offer turns them on.') : tr('Allow rules: when you allow the same kind of step 3 times in a week, vaken shows the rule once.')
  if (list.length === 0) return `${head}\n\n${tr('No rule offered yet.')}`
  return [head, '', tr('Offered so far:'), ...list.map(r => `  ${r.rule}  (${whatShown(r.what, tr)})`), '', tr('Add one to .claude/settings.json in the project, under "permissions" > "allow". Vaken never changes that file.')].join('\n')
}

// The kept words are English; the two built ones are put in the reader's language here.
export function whatShown(what: string, t: (s: string) => string): string {
  const edits = /^edits in (.+)$/.exec(what)
  if (edits !== null) return t(WHAT_EDITS).replace('{dir}', edits[1] ?? '')
  const fetch = /^fetches from (.+)$/.exec(what)
  return fetch !== null ? t(WHAT_FETCH).replace('{host}', fetch[1] ?? '') : what
}
export const offerWords = (o: Offer, t: (s: string) => string): string => t(RULE_OFFER).replace('{what}', whatShown(o.what, t)).replace('{n}', String(o.n)).replace('{rule}', o.rule)

// The mode and this session's open offers live in memory: the tool hooks never read the store for them.
export const allowMem: { mode: AllowRulesMode; offers: Offer[] } = { mode: 'offer', offers: [] }
export const OFFERS_SHOWN = 3
export function addOffer(o: Offer): void {
  allowMem.offers = [...allowMem.offers.filter(x => x.rule !== o.rule), o].slice(-OFFERS_SHOWN)
}
// Dismiss only hides the row: the rule already waits 30 days from its offer.
export function dropOffer(rule: string): void {
  allowMem.offers = allowMem.offers.filter(x => x.rule !== rule)
}
export const offersSignature = (): string => allowMem.offers.map(o => o.rule).join(',')

// The asks Claude Code put to the person, by call id, until the call ends. Bounded, so a lost call cannot grow it.
const PENDING_MAX = 32
const pending = new Map<string, RuleForm>()
export function notePending(id: string, form: RuleForm): void {
  pending.delete(id)
  pending.set(id, form)
  while (pending.size > PENDING_MAX) {
    const first = pending.keys().next().value
    if (first === undefined) break
    pending.delete(first)
  }
}
export function takePending(id: string | undefined): RuleForm | undefined {
  if (id === undefined || pending.size === 0) return undefined
  const form = pending.get(id)
  pending.delete(id)
  return form
}
export const hasPending = (): boolean => pending.size > 0

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

// ---- Approve in the band: while Claude Code's own "Allow?" question waits, the band says in one plain line what the step does and whether
// Undo has a copy. The words come from the guard's own readings (kindOf, checkCommand, outwardOf, protectedHit) and undo's targets; no second explainer.
// vaken never answers the question: the engine draws that dialog alone and a plugin may answer it only inside the PermissionRequest hook, never from a
// later press. The line lives in this process's memory only (words built from names and counts, and a hash of the step), never in the store.
export const ASK_TTL_MS = 10 * 60_000
// The press after the third yes stays on the band this long when no question waits
export const OFFER_BAND_MS = 2 * 60_000
export type AskSaid = { name: string; vars?: Vars }
// `undo`: copy when Undo holds a copy of every file the step changes, none when it changes files with no copy, absent when it changes no file
// `then`: the step's words after `said` (a stopped step: why first, then what it was); `denied`: the engine stopped it, so the press is Copy the allow rule
export type AskView = { said: AskSaid; then?: AskSaid; undo?: 'copy' | 'none'; risky: boolean; rule?: string; denied?: true }
export type AskLine = AskView & { id?: string; tool: string; hash: string; at: number }
// A step Claude Code itself stopped (auto mode, a deny rule, don't ask mode), said in one plain line for a few minutes. In memory only: the step's kind
// and a hash of it, the words built from the guard's readings, and the allow rule form when the step is a safe kind; never the command or the engine's reason.
export type DeniedWhy = 'rule' | 'auto' | 'dontask' | 'other'
export const DENIED_BAND_MS = 3 * 60_000
const DENIED_NAMES: Record<DeniedWhy, string> = { rule: 'allow.denied_rule', auto: 'allow.denied_auto', dontask: 'allow.denied_dontask', other: 'allow.denied_other' }
export type DeniedLine = { why: DeniedWhy; said: AskSaid; tool: string; hash: string; at: number; rule?: string }
export const askMem: { line?: AskLine; offer?: { rule: string; what: string; n: number; at: number }; denied?: DeniedLine; ids: Map<string, { tool: string; hash: string }> } = { ids: new Map() }
export function noteDenied(line: DeniedLine): void {
  askMem.denied = line
}
// The press copied the rule: the line stays, its press goes
export function dropDenied(rule: string): void {
  const d = askMem.denied
  if (d === undefined || d.rule !== rule) return
  askMem.denied = { why: d.why, said: d.said, tool: d.tool, hash: d.hash, at: d.at }
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

// The line for a waiting question: the step's words, Undo's copy, and the rule form when the step is a safe kind (ruleFormOf rates it)
export function askLineOf(tool: string, args: Record<string, unknown>, env: Env, undo: { on: boolean; changed: readonly string[]; copied: boolean }, now: number): AskLine {
  const s = stepSaid(tool, args, env, undo.changed)
  const form = s.risky ? undefined : ruleFormOf(tool, args, env)
  const copy: AskLine['undo'] = !s.writes ? undefined : undo.on && undo.copied ? 'copy' : 'none'
  return { said: s.said, risky: s.risky, tool, hash: stepHash(tool, args), at: now, ...(copy === undefined ? {} : { undo: copy }), ...(form === undefined ? {} : { rule: form.rule }) }
}

// A short hash of the step, so the question and the call that ends it are matched without keeping the command
export function stepHash(tool: string, args: unknown): string {
  const sorted = (v: unknown): unknown => (Array.isArray(v) ? v.map(sorted) : v !== null && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted((v as Record<string, unknown>)[k])])) : v)
  const text = `${tool}|${JSON.stringify(sorted(args) ?? null)}`
  let h = 5381
  for (let n = 0; n < text.length; n += 1) h = ((h * 33) ^ text.charCodeAt(n)) >>> 0
  return h.toString(36)
}

// The ids of the steps Claude Code asks about (tool.check said ask), so the question shown is matched to its call. Bounded.
export function noteAskId(id: string, tool: string, hash: string): void {
  askMem.ids.delete(id)
  askMem.ids.set(id, { tool, hash })
  while (askMem.ids.size > PENDING_MAX) {
    const first = askMem.ids.keys().next().value
    if (first === undefined) break
    askMem.ids.delete(first)
  }
}
// The question is open: its call is the asked step with the same hash, else the newest asked step of that tool
export function openAsk(line: AskLine): void {
  let exact: string | undefined
  let newest: string | undefined
  for (const [k, v] of askMem.ids) {
    if (v.tool !== line.tool) continue
    newest = k
    if (v.hash === line.hash) exact = k
  }
  const id = exact ?? newest
  askMem.line = { ...line, ...(id === undefined ? {} : { id }) }
}
// vaken saw the question for this very call (its line is up and belongs to the id): only then does the call's end mean a yes the person gave. A step that ran with no question was approved some other way.
export const wasAsked = (id: string | undefined): boolean => id !== undefined && askMem.line?.id === id
// The call ended (allowed, refused or failed): its line goes. True when the band changes.
export function closeAsk(id: string | undefined, tool: string): boolean {
  if (id !== undefined) askMem.ids.delete(id)
  const line = askMem.line
  if (line === undefined || (line.id !== undefined ? line.id !== id : line.tool !== tool)) return false
  askMem.line = undefined
  return true
}
export function noteBandOffer(o: Offer, now: number): void {
  askMem.offer = { rule: o.rule, what: o.what, n: o.n, at: now }
}

// What the band shows now: the waiting question, else the press right after the third yes. The press shows only while that rule is still offered
// (Copy or Dismiss ends it) and allow.rules is Offer; Off shows no line at all.
export function askShown(now: number): AskView | undefined {
  if (allowMem.mode === 'off') return undefined
  const offered = (rule: string | undefined): string | undefined => (rule !== undefined && allowMem.offers.some(o => o.rule === rule) ? rule : undefined)
  const line = askMem.line
  if (line !== undefined && now - line.at < ASK_TTL_MS && now >= line.at) {
    const rule = line.risky ? undefined : offered(line.rule)
    return { said: line.said, risky: line.risky, ...(line.undo === undefined ? {} : { undo: line.undo }), ...(rule === undefined ? {} : { rule }) }
  }
  const o = askMem.offer
  const rule = o === undefined || now - o.at >= OFFER_BAND_MS || now < o.at ? undefined : offered(o.rule)
  // A step the engine stopped is newer news than the third yes of an earlier question
  const d = askMem.denied
  if (d !== undefined && now >= d.at && now - d.at < DENIED_BAND_MS && (o === undefined || rule === undefined || d.at >= o.at)) {
    return { said: { name: DENIED_NAMES[d.why] }, then: d.said, risky: false, denied: true, ...(d.rule === undefined ? {} : { rule: d.rule }) }
  }
  if (o === undefined || rule === undefined) return undefined
  return { said: { name: 'allow.allowed_n', vars: { what: o.what, n: o.n } }, risky: false, rule }
}

// The line in the language of this draw: the step's words, then Undo's. `step` alone is what a narrow band keeps.
export function askWords(v: AskView): { step: string; text: string } {
  const vars = v.said.name === 'allow.allowed_n' && v.said.vars !== undefined ? { ...v.said.vars, what: whatShown(String(v.said.vars.what), tr) } : v.said.vars
  const step = t(v.said.name, vars)
  // A stopped step: the narrow band keeps why it was stopped, the wide one adds what the step was
  if (v.then !== undefined) return { step, text: `${step} ${t(v.then.name, v.then.vars)}` }
  const undo = v.undo === undefined ? '' : t(v.undo === 'copy' ? 'allow.undo_copy' : 'allow.undo_none')
  return { step, text: undo === '' ? step : `${step} ${undo}` }
}
