// The Agent setup card: works out the files that follow from the choices and compares them with disk, so vaken never silently conflicts with the person's own agent files.
import { capIsAuto, capMaxOf } from './agentcap'
import { under } from './platform'
import { familyIn, isFamily } from './models'
import { ROLES, ROLE_NAMES, roleSettingKey } from './orchestra'
import type { Role } from './orchestra'
import type { Setting, Values } from './settings'
import {
  SETUP_BLOCK_TITLE, SETUP_GROUP, SETUP_BLURB, SETUP_C_CAP, SETUP_C_INFO, SETUP_HEAD_INFO, SETUP_C_KEEP, SETUP_C_MODEL, SETUP_HEAD_BLOCK, SETUP_HEAD_CONFLICT, SETUP_HEAD_FILES, SETUP_HEAD_ROLES, SETUP_KEEP_MINE, SETUP_NOT_NOW, SETUP_NOTE,
  SETUP_R_ADD, SETUP_R_CREATE, SETUP_R_DIFFERS, SETUP_R_KEEP, SETUP_R_MISSING, SETUP_R_REPLACE, SETUP_R_SESSION, SETUP_R_SYNC, SETUP_R_UNREADABLE, SETUP_R_UPDATE, SETUP_R_USE, SETUP_R_USE_MODEL, SETUP_R_YOURS,
  SETUP_SUM_BLOCK_DIFFERS, SETUP_SUM_BLOCK_MISSING, SETUP_SUM_BLOCK_YOURS, SETUP_SUM_CONFLICT_1, SETUP_SUM_CONFLICTS, SETUP_SUM_DIFFERS, SETUP_SUM_DIFFERS_1, SETUP_SUM_MISSING, SETUP_SUM_MISSING_1, SETUP_SUM_SYNC, SETUP_SUM_YOURS,
  SETUP_SHORT, SETUP_SHORT_CONFLICT, SETUP_SHORT_NONE, SETUP_SHORT_NOROOT, SETUP_SHORT_SESSION, SETUP_TITLE, SETUP_YES_ADD, SETUP_YES_REPLACE, SETUP_YES_UPDATE,
} from './setupwords'
import type { WhatIs } from './whatis'

export const SETUP_SETTINGS: Setting[] = [
  { key: 'setup.apply', group: SETUP_GROUP, label: 'Set up agents', note: 'Write agent files that follow your choices.', options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }], default: 'off', hidden: true },
  { key: 'setup.scope', group: SETUP_GROUP, label: 'Setup place', note: 'All projects, this project or this session.', options: [{ value: 'all', label: 'All projects' }, { value: 'project', label: 'This project' }, { value: 'session', label: 'This session' }], default: 'project', hidden: true },
  { key: 'setup.keep', group: SETUP_GROUP, label: 'Files kept', note: 'The limit in your files you left alone.', options: ['none', ...Array.from({ length: 20 }, (_, n) => String(n + 1))].map(v => ({ value: v, label: v })), default: 'none', hidden: true },
]

export type Scope = 'all' | 'project' | 'session'
export const SCOPES: Scope[] = ['all', 'project', 'session']
export const parseScope = (v: unknown): Scope => (v === 'all' || v === 'session' ? v : 'project')

export const MARK = 'managed-by: vaken'
const LEGACY_MARK = 'managed-by: cockpit'
const LEGACY_NAME: Record<Role, string> = { researcher: 'cockpit-researcher', builder: 'cockpit-builder', reviewer: 'cockpit-code-reviewer', fixer: 'cockpit-fixer' }
export const BEGIN = '<!-- cockpit:begin -->'
export const END = '<!-- cockpit:end -->'

// The reviewer's file is not `cockpit-reviewer`: that name is the starter agent.
export const AGENT_NAME: Record<Role, string> = { researcher: 'vaken-researcher', builder: 'vaken-builder', reviewer: 'vaken-code-reviewer', fixer: 'vaken-fixer' }

export type Disk = Record<string, string | null | false>
export type SetupRead = { home: string; root?: string; scope: Scope; disk: Disk }
export type SetupFacts = { values: Values; read?: SetupRead; open?: string }

export type Desired = { key: string; name: string; kind: 'agent' | 'block'; path: string; text: string; role?: Role; legacy?: { name: string; path: string } }
export type SetupState = 'missing' | 'matches' | 'differs' | 'yours' | 'unreadable'
export type SetupItem = Desired & { state: SetupState; disk: string | null | false; diff: string[] }

export const modelOfRole = (values: Values, r: Role): string => {
  const v = values[roleSettingKey(r)]
  return isFamily(v) ? v : ROLES[r].model
}

export function agentText(r: Role, model: string): string {
  const role = ROLES[r]
  return [
    '---',
    `name: ${AGENT_NAME[r]}`,
    `description: ${role.about} Made by vaken from your model map.`,
    `model: ${model}`,
    ...(role.tools === undefined ? [] : [`tools: ${role.tools.join(', ')}`]),
    MARK,
    '---',
    '',
    `You are a ${role.label.toLowerCase()} agent. ${role.about}`,
    'Keep to your one task. Use short plain words in your report.',
    ...(role.writes ? [] : ['Do not change any file.']),
    '',
  ].join('\n')
}

export function blockText(values: Values): string {
  const capOn = (values['cap.mode'] ?? 'warn') !== 'off'
  const plan = values['plan.first']
  const lines = [
    BEGIN,
    'Set in vaken (Agent setup). Change it there.',
    ...(capOn ? [capIsAuto(values['cap.max']) ? '- Start only as many agents as the computer has room for.' : `- Run at most ${capMaxOf(values['cap.max'])} agents at once.`] : []),
    '- Start agents one at a time.',
    '- Run only the tests of the files you touched.',
    ...(plan === 'ask' ? ['- For a big task, write a short plan and wait for a yes.'] : plan === 'suggest' ? ['- For a big task, offer a short plan first.'] : []),
    ...(values['compact.mode'] !== undefined && values['compact.mode'] !== 'off' ? ['- When the session is compacted, keep the goal, the branch, the changed files and the next steps.'] : []),
    ...(values['route.mode'] === 'auto' ? [`- Send lookup agents to the ${modelOfRole(values, 'researcher')} model.`] : []),
    END,
  ]
  return lines.join('\n')
}

const dirOf = (base: string): string => under(base, '.claude/agents')

// ~/.claude/CLAUDE.md is the person's, never written.
export function desired(values: Values, home: string, root: string | undefined, scope: Scope): Desired[] {
  if (scope === 'session') return []
  const base = scope === 'all' ? home : root
  if (base === undefined || base === '') return []
  const agents = ROLE_NAMES.map((r): Desired => ({ key: AGENT_NAME[r], name: AGENT_NAME[r], kind: 'agent', path: under(dirOf(base), `${AGENT_NAME[r]}.md`), text: agentText(r, modelOfRole(values, r)), role: r, legacy: { name: LEGACY_NAME[r], path: under(dirOf(base), `${LEGACY_NAME[r]}.md`) } }))
  return scope === 'project' ? [...agents, { key: 'claude', name: 'CLAUDE.md', kind: 'block', path: under(base, 'CLAUDE.md'), text: blockText(values) }] : agents
}

export function watchedPaths(values: Values, home: string, root: string | undefined, scope: Scope): string[] {
  const own = [home, root].flatMap(b => (b === undefined || b === '' ? [] : ROLE_NAMES.map(r => under(dirOf(b), `${r}.md`))))
  const md = [home === '' ? undefined : under(home, '.claude/CLAUDE.md'), root === undefined || root === '' ? undefined : under(root, 'CLAUDE.md')].filter((p): p is string => p !== undefined)
  return [...new Set([...desired(values, home, root, scope).flatMap(d => [d.path, ...(d.legacy === undefined ? [] : [d.legacy.path])]), ...own, ...md])]
}

export function withLegacy(d: Desired, disk: Disk): Desired {
  const own = disk[d.path]
  const old = d.legacy === undefined ? undefined : disk[d.legacy.path]
  if (d.legacy === undefined || typeof old !== 'string' || (own !== null && own !== undefined)) return d
  return { ...d, path: d.legacy.path, name: d.legacy.name, text: d.text.replace(`name: ${d.name}`, `name: ${d.legacy.name}`) }
}

const norm = (s: string): string => s.replace(/\r\n/g, '\n').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\s+$/, '')

function frontmatter(text: string): string {
  if (!text.startsWith('---')) return ''
  const end = text.indexOf('\n---', 3)
  return end < 0 ? '' : text.slice(0, end)
}
export const isManagedAgent = (text: string): boolean => new RegExp(`^(?:${MARK}|${LEGACY_MARK})\\s*$`, 'm').test(frontmatter(text))
export function fileModel(text: string): string | undefined {
  const m = /^model:\s*(\S+)\s*$/m.exec(frontmatter(text))
  return m?.[1]
}

export function blockOf(text: string): { start: number; end: number; body: string } | undefined {
  const a = text.indexOf(BEGIN)
  if (a < 0) return undefined
  const b = text.indexOf(END, a + BEGIN.length)
  return b < 0 ? undefined : { start: a, end: b + END.length, body: text.slice(a, b + END.length) }
}
export const withoutBlock = (text: string): string => {
  const b = blockOf(text)
  return b === undefined ? text : `${text.slice(0, b.start)}${text.slice(b.end)}`
}

export function stateOf(d: Desired, disk: string | null | false): SetupState {
  if (disk === false) return 'unreadable'
  if (disk === null || disk.trim() === '') return 'missing'
  if (d.kind === 'agent') return !isManagedAgent(disk) ? 'yours' : norm(disk) === norm(d.text) ? 'matches' : 'differs'
  const b = blockOf(disk)
  return b === undefined ? 'yours' : norm(b.body) === norm(d.text) ? 'matches' : 'differs'
}

export function lineDiff(from: string, to: string, max = 10): string[] {
  const a = norm(from) === '' ? [] : norm(from).split('\n')
  const b = norm(to) === '' ? [] : norm(to).split('\n')
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
  const out: string[] = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      i += 1
      j += 1
    } else if (j < b.length && (i >= a.length || dp[i]![j + 1]! > dp[i + 1]![j]!)) {
      out.push(`+ ${b[j]}`)
      j += 1
    } else {
      out.push(`- ${a[i]}`)
      i += 1
    }
  }
  return out.length <= max ? out : [...out.slice(0, max), `... ${out.length - max} more lines`]
}

export function itemDiff(d: Desired, disk: string | null | false, state: SetupState): string[] {
  if (state === 'matches' || state === 'unreadable') return []
  if (disk === null || disk === false || state === 'missing') return lineDiff('', d.text)
  if (d.kind === 'agent') return lineDiff(disk, d.text)
  const b = blockOf(disk)
  return b === undefined ? lineDiff('', d.text) : lineDiff(b.body, d.text)
}

export function nextText(d: Desired, disk: string | null | false): string {
  if (d.kind === 'agent') return d.text
  if (disk === null || disk === false || disk.trim() === '') return `${d.text}\n`
  const b = blockOf(disk)
  return b === undefined ? `${disk.replace(/\s+$/, '')}\n\n${d.text}\n` : `${disk.slice(0, b.start)}${d.text}${disk.slice(b.end)}`
}

// One draw asks for the items several times, so the last answer is kept while the reading and settings are the same.
const FACT_KEYS = ['setup.scope', 'setup.keep', 'cap.mode', 'cap.max', 'plan.first', 'compact.mode', 'route.mode', ...ROLE_NAMES.map(roleSettingKey)]
const factsKey = (values: Values): string => JSON.stringify(FACT_KEYS.map(k => values[k]))
const keptOf = <T,>(memo: { read?: SetupRead; disk?: Disk; key?: string; out?: T }, f: SetupFacts, work: () => T): T => {
  const key = factsKey(f.values)
  if (memo.out !== undefined && memo.read === f.read && memo.disk === f.read?.disk && memo.key === key) return memo.out
  const out = work()
  memo.read = f.read
  memo.disk = f.read?.disk
  memo.key = key
  memo.out = out
  return out
}
const itemsMemo: { read?: SetupRead; disk?: Disk; key?: string; out?: SetupItem[] } = {}
const conflictsMemo: { read?: SetupRead; disk?: Disk; key?: string; out?: Conflict[] } = {}

export const setupItems = (f: SetupFacts): SetupItem[] => [...keptOf(itemsMemo, f, () => itemsOf(f))]
function itemsOf(f: SetupFacts): SetupItem[] {
  const scope = parseScope(f.values['setup.scope'])
  const r = f.read
  if (r === undefined || r.scope !== scope) return []
  return desired(f.values, r.home, r.root, scope).map((d0): SetupItem => {
    const d = withLegacy(d0, r.disk)
    const disk = r.disk[d.path] ?? null
    const state = stateOf(d, disk)
    return { ...d, state, disk, diff: itemDiff(d, disk, state) }
  })
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }
export function parseAgentCap(text: string): number | undefined {
  for (const line of text.split(/\r?\n/)) {
    if (!/\b(agents?|helpers?|subagents?)\b/i.test(line)) continue
    const m = /\b(?:at most|never more than|no more than|not more than|max(?:imum)?(?: of)?|up to)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.exec(line)
    if (m?.[1] === undefined) continue
    const after = line.slice(m.index + m[0].length).trim().toLowerCase().split(/\s+/).slice(0, 3).map(w => w.replace(/[^a-z-]/g, ''))
    const AGENTISH = /^(agents?|helpers?|subagents?|builders?|workers?)$/
    const SMALL = /^(|at|in|on|of|for|to|per|and|or|but|if|when|while|unless|until|the|a|running|parallel|concurrent|concurrently|simultaneously|active|live|total|each|every|one|ones|so|even|then|please|else)$/
    if (!after.some(w => AGENTISH.test(w)) && !SMALL.test(after[0] ?? '')) continue
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1].toLowerCase()]
    if (n !== undefined && n >= 1 && n <= 20) return n
  }
  return undefined
}

export const CAP_CHOICES = [2, 3, 4, 6, 8, 12]
export const capChoiceFor = (n: number): number => [...CAP_CHOICES].reverse().find(c => c <= n) ?? CAP_CHOICES[0]!

export function capNoteOf(f: SetupFacts): { n: number; from: string } | undefined {
  const r = f.read
  if (r === undefined || Number.isFinite(capMaxOf(f.values['cap.max'])) || (f.values['cap.mode'] ?? 'warn') === 'off') return undefined
  const get = (q: string): string => (typeof r.disk[q] === 'string' ? (r.disk[q] as string) : '')
  const g = under(r.home, '.claude/CLAUDE.md')
  const p = r.root === undefined ? undefined : under(r.root, 'CLAUDE.md')
  const inP = p === undefined ? undefined : parseAgentCap(withoutBlock(get(p)))
  const n = inP ?? parseAgentCap(withoutBlock(get(g)))
  return n === undefined ? undefined : { n, from: inP !== undefined ? 'CLAUDE.md' : 'global CLAUDE.md' }
}

export type Conflict =
  | { kind: 'cap'; n: number; use: number; now: number; from: string }
  | { kind: 'model'; role: Role; name: string; path: string; file: string; map: string }

export const conflictsOf = (f: SetupFacts): Conflict[] => [...keptOf(conflictsMemo, f, () => conflictsWork(f))]
function conflictsWork(f: SetupFacts): Conflict[] {
  const r = f.read
  if (r === undefined) return []
  const out: Conflict[] = []
  const get = (p: string): string => {
    const t = r.disk[p]
    return typeof t === 'string' ? t : ''
  }
  const g = under(r.home, '.claude/CLAUDE.md')
  const p = r.root === undefined ? undefined : under(r.root, 'CLAUDE.md')
  const now = capMaxOf(f.values['cap.max'])
  const n = (p === undefined ? undefined : parseAgentCap(withoutBlock(get(p)))) ?? parseAgentCap(withoutBlock(get(g)))
  if (n !== undefined && Number.isFinite(now) && (f.values['cap.mode'] ?? 'warn') !== 'off' && capChoiceFor(n) !== now && f.values['setup.keep'] !== String(n)) {
    out.push({ kind: 'cap', n, use: capChoiceFor(n), now, from: p !== undefined && parseAgentCap(withoutBlock(get(p))) !== undefined ? 'CLAUDE.md' : 'global CLAUDE.md' })
  }
  for (const b of [r.home, r.root]) {
    if (b === undefined || b === '') continue
    for (const role of ROLE_NAMES) {
      const path = under(dirOf(b), `${role}.md`)
      const fam = familyIn(fileModel(get(path)) ?? '')
      const map = modelOfRole(f.values, role)
      if (fam !== undefined && fam !== map) out.push({ kind: 'model', role, name: `${role}.md`, path, file: fam, map })
    }
  }
  return out
}

export type SetupDo = { do: 'open'; key: string } | { do: 'close' } | { do: 'write'; key: string } | { do: 'cap'; n: number } | { do: 'keepCap'; n: number } | { do: 'model'; role: Role; family: string }
export type SetupGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: SetupDo }
export type SetupView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; summary?: string; groups: { head: string; rows: SetupGroupRow[]; conflict?: boolean }[] }

const fill = (s: string, v: Record<string, string | number>): string => Object.entries(v).reduce((acc, [k, x]) => acc.split(`{${k}}`).join(String(x)), s)
export const setupApplyOn = (values: Values): boolean => values['setup.apply'] === 'on'

export const SETUP_MEANS = 'The agent files and the project instructions that follow from your choices (the model map, the agent cap, compacting, plan first, routing), compared with what is on disk. Until you turn on Set up agents for me, it only shows what it would do. It never writes your global CLAUDE.md or settings, and it never deletes a file.'
const SETUP_NEXT = '/vaken-help run setup says the same in the session, and /vaken-help run setup on, scope, make and replace do what the card does.'

const stateWord = (s: SetupState, t: (x: string) => string): string => t(s === 'matches' ? SETUP_R_SYNC : s === 'missing' ? SETUP_R_MISSING : s === 'differs' ? SETUP_R_DIFFERS : s === 'yours' ? SETUP_R_YOURS : SETUP_R_UNREADABLE)

export function setupLoud(f: SetupFacts | undefined): 'conflict' | 'drift' | 'none' {
  if (f === undefined) return 'none'
  if (conflictsOf(f).length > 0) return 'conflict'
  return setupItems(f).some(i => i.state === 'differs') ? 'drift' : 'none'
}

export function setupShort(f: SetupFacts, t: (s: string) => string): string {
  const scope = parseScope(f.values['setup.scope'])
  if (scope === 'session') return t(SETUP_SHORT_SESSION)
  if (f.read !== undefined && f.read.scope === scope && (scope === 'project' && (f.read.root === undefined || f.read.root === ''))) return t(SETUP_SHORT_NOROOT)
  if (f.read === undefined || f.read.scope !== scope) return t(SETUP_SHORT_NONE)
  const items = setupItems(f)
  const c = conflictsOf(f).length
  const v = { n: items.filter(i => i.state === 'matches').length, m: items.length, c }
  return fill(t(c > 0 ? SETUP_SHORT_CONFLICT : SETUP_SHORT), v)
}

export function setupSummary(items: SetupItem[], conflicts: number, t: (s: string) => string): string {
  const agents = items.filter(i => i.kind === 'agent')
  const block = items.find(i => i.kind === 'block')
  const n = (s: SetupState): number => agents.filter(i => i.state === s).length
  const part = (count: number, one: string, many: string): string[] => (count === 0 ? [] : [count === 1 ? t(one) : fill(t(many), { n: count })])
  const parts = [
    ...part(n('missing'), SETUP_SUM_MISSING_1, SETUP_SUM_MISSING),
    ...part(n('differs'), SETUP_SUM_DIFFERS_1, SETUP_SUM_DIFFERS),
    ...(n('yours') === 0 ? [] : [fill(t(SETUP_SUM_YOURS), { n: n('yours') })]),
    ...(block === undefined || block.state === 'matches' || block.state === 'unreadable' ? [] : [t(block.state === 'missing' ? SETUP_SUM_BLOCK_MISSING : block.state === 'differs' ? SETUP_SUM_BLOCK_DIFFERS : SETUP_SUM_BLOCK_YOURS)]),
    ...part(conflicts, SETUP_SUM_CONFLICT_1, SETUP_SUM_CONFLICTS),
  ]
  return parts.length === 0 ? t(SETUP_SUM_SYNC) : parts.join(' · ')
}

const itemWhat = (i: SetupItem, open: boolean, apply: boolean, t: (s: string) => string): WhatIs => ({
  means:
    i.state === 'yours'
      ? fill(t('{path} is your own file: it has no "{mark}" line{block}. {write}'), { path: i.path, mark: MARK, block: i.kind === 'block' ? t(' and no vaken block') : '', write: apply ? t('A write saves a copy first and asks twice.') : t('Nothing is written while Set up agents for me is off.') })
      : fill(t('{path} {state}'), { path: i.path, state: t(i.state === 'missing' ? 'is not there yet.' : i.state === 'matches' ? 'is as your choices say.' : i.state === 'differs' ? 'was made by vaken and no longer follows your choices.' : 'could not be read, so nothing is written over it.') }),
  ...(open && i.diff.length > 0 ? { facts: [`${i.path}`, ...i.diff] } : {}),
  next: t(SETUP_NEXT),
  setting: 'cards.setup',
})

export function setupView(f: SetupFacts | undefined, t: (s: string) => string): SetupView {
  const facts: SetupFacts = f ?? { values: {} }
  const apply = setupApplyOn(facts.values)
  const scope = parseScope(facts.values['setup.scope'])
  const short = setupShort(facts, t)
  const what: WhatIs = { means: SETUP_MEANS, next: SETUP_NEXT, setting: 'cards.setup' }
  const items = setupItems(facts)
  const groups: SetupView['groups'] = []
  const rowOf = (i: SetupItem): SetupGroupRow[] => {
    const key = i.key
    const isOpen = facts.open === `setup:${key}`
    const title = i.kind === 'block' ? t(SETUP_BLOCK_TITLE) : `${i.name} · ${i.text.match(/^model: (\S+)$/m)?.[1] ?? ''}`
    const base = { key, title, what: itemWhat(i, isOpen, apply, t) }
    if (i.state === 'matches' || i.state === 'unreadable') return [{ ...base, right: stateWord(i.state, t) }]
    if (!apply) return [{ ...base, right: stateWord(i.state, t), press: { do: 'open', key } }]
    if (i.state === 'missing') return [{ ...base, right: t(SETUP_R_CREATE), press: { do: 'write', key } }]
    const verb = i.state === 'yours' ? (i.kind === 'block' ? SETUP_R_ADD : SETUP_R_REPLACE) : SETUP_R_UPDATE
    if (!isOpen) return [{ ...base, right: t(verb), press: { do: 'open', key } }]
    const yes = i.state === 'differs' ? SETUP_YES_UPDATE : i.kind === 'block' ? SETUP_YES_ADD : SETUP_YES_REPLACE
    return [
      { ...base, right: stateWord(i.state, t), press: { do: 'open', key } },
      { key: `${key}-yes`, title: t(yes), what: { means: fill(t('Saves a copy of {path}, then writes it as shown above.'), { path: i.path }), setting: 'cards.setup' }, press: { do: 'write', key } },
      { key: `${key}-keep`, title: t(i.state === 'differs' ? SETUP_NOT_NOW : SETUP_KEEP_MINE), what: { means: 'Nothing is written.', setting: 'cards.setup' }, press: { do: 'close' } },
    ]
  }
  if (scope === 'session') {
    groups.push({
      head: t(SETUP_HEAD_ROLES),
      rows: ROLE_NAMES.map(r => ({ key: `role-${r}`, title: `${t(ROLES[r].label)} · ${modelOfRole(facts.values, r)}`, right: t(SETUP_R_SESSION), what: { means: fill(t('{about} The runs started from this session use this model. No file is written.'), { about: t(ROLES[r].about) }), setting: 'cards.setup' } })),
    })
  } else {
    const agents = items.filter(i => i.kind === 'agent')
    const block = items.filter(i => i.kind === 'block')
    if (agents.length > 0) groups.push({ head: t(SETUP_HEAD_FILES), rows: agents.flatMap(rowOf) })
    if (block.length > 0) groups.push({ head: t(SETUP_HEAD_BLOCK), rows: block.flatMap(rowOf) })
  }
  const capNote = capNoteOf(facts)
  if (capNote !== undefined) {
    groups.push({
      head: t(SETUP_HEAD_INFO),
      rows: [{ key: 'cap-info', title: fill(t(SETUP_C_INFO), { n: capNote.n }), what: { means: fill(t('Your {from} says at most {n} agents; vaken follows the computer. This is only for your information: nothing is changed. To set your own limit, use Settings > Agents > Most at once.'), { from: t(capNote.from), n: capNote.n }), setting: 'cap.max' } }],
    })
  }
  const conflicts = conflictsOf(facts)
  if (conflicts.length > 0) {
    groups.push({
      head: t(SETUP_HEAD_CONFLICT),
      conflict: true,
      rows: conflicts.flatMap((c): SetupGroupRow[] =>
        c.kind === 'cap'
          ? [
              // A limit below the lowest choice is never used as a higher number, so only Keep is offered.
              ...(c.use > c.n ? [] : [{ key: 'cap-use', title: fill(t(SETUP_C_CAP), { n: c.n }), right: fill(t(SETUP_R_USE), { n: c.use }), what: { means: `${fill(t('Your {from} says at most {n} agents; your vaken limit is {now}. Use sets the limit (Settings > Agents > Most at once).'), { from: t(c.from), n: c.n, now: c.now })}${c.use === c.n ? '' : ` ${fill(c.use > c.n ? t('Vaken offers no limit as low as {n}; the lowest is {use}.') : t('{n} is not one of the choices; the nearest below it is {use}.'), { n: c.n, use: c.use })}`}`, setting: 'cap.max' }, press: { do: 'cap', n: c.use } } as SetupGroupRow]),
              { key: 'cap-keep', title: fill(t(SETUP_C_KEEP), { n: c.now }), right: t(SETUP_R_KEEP), what: { means: c.use > c.n ? `${fill(t('Your {from} says at most {n} agents; your vaken limit is {now}. Use sets the limit (Settings > Agents > Most at once).'), { from: t(c.from), n: c.n, now: c.now })} ${fill(t('Vaken offers no limit as low as {n}; the lowest is {use}.'), { n: c.n, use: c.use })}` : t('Keeps the vaken limit and stops asking about this number.'), setting: 'cap.max' }, press: { do: 'keepCap', n: c.n } } as SetupGroupRow,
            ]
          : [{ key: `model-${c.role}`, title: fill(t(SETUP_C_MODEL), { name: c.name, a: c.file, b: c.map }), right: fill(t(SETUP_R_USE_MODEL), { a: c.file }), what: { means: fill(t('{path} names the model {file}; the model map says {map} for the {role}. Vaken never changes your file. Use sets the map to {file}.'), { path: c.path, file: c.file, map: c.map, role: t(c.role) }), setting: roleSettingKey(c.role) }, press: { do: 'model', role: c.role, family: c.file } }],
      ),
    })
  }
  const rows = groups.flatMap(g => g.rows)
  return {
    title: SETUP_TITLE,
    blurb: t(SETUP_BLURB),
    short,
    lines: [short, ...rows.map(r => (r.right === undefined ? r.title : `${r.title}: ${r.right}`))],
    whats: [what, ...rows.map(r => r.what)],
    shortWhat: what,
    ...(scope === 'session' || facts.read === undefined || facts.read.scope !== scope ? {} : { summary: setupSummary(items, 0, t) }),
    groups,
  }
}

export function setupCardText(f: SetupFacts | undefined): string[] {
  if (f === undefined) return []
  const id = (s: string): string => s
  return [`Agent setup: ${setupShort(f, id).replace(/^Agent setup: /, '')}${setupApplyOn(f.values) ? '' : ' (off)'} · /vaken-help run setup`]
}

export { SETUP_NOTE }
