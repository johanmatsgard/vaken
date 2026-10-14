// Counts a turn's tool calls by kind and says them in one plain sentence, with risk labels.
import { sayStored, trFill } from '../i18n/t'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { isEditTool, isShellTool } from './tools'
import { lastName } from './platform'

export const HAPPENED_SETTINGS: Setting[] = [
  {
    key: 'happened.mode',
    group: 'Explain simply',
    label: 'What happened',
    note: 'Tells you in plain words what the last answer did.',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
]
export const HAPPENED_HELP: HelpEntry[] = [{ title: 'What "what happened" is', text: 'After each answer, /vaken-explain happened says in plain words what Claude read, changed and ran. Anything risky, such as a new package or a push, is marked.' }]

export type Turn = { reads: number; edits: number; commands: number; agents: number; outside: number; files: string[]; kinds: Record<string, number>; risks: string[] }
export const emptyTurn = (): Turn => ({ reads: 0, edits: 0, commands: 0, agents: 0, outside: 0, files: [], kinds: {}, risks: [] })

const FILES_KEPT = 8

// The first match wins for the kind; risks are all that match.
const KINDS: [string, RegExp][] = [
  ['test', /\b(test|jest|vitest|pytest|mocha|rspec|go test|cargo test)\b/],
  ['build', /\b(build|compile|tsc|webpack|vite build|cargo build|make)\b/],
  ['lint', /\b(lint|eslint|prettier|ruff|flake8|clippy)\b/],
  ['git', /^\s*git\b/],
  ['install', /\b(npm|pnpm|yarn|bun)\s+(i|install|add)\b|\bpip3?\s+install\b|\bbrew\s+install\b|\bcargo\s+add\b/],
]
const RISKS: [string, RegExp][] = [
  ['installed a package', /\b(npm|pnpm|yarn|bun)\s+(i|install|add)\b|\bpip3?\s+install\b|\bbrew\s+install\b|\bcargo\s+add\b|\bgem\s+install\b/],
  ['pushed to a remote', /\bgit\s+push\b/],
  ['deleted files', /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s)|\bgit\s+(clean\s+-[a-z]*f|reset\s+--hard|checkout\s+--\s)|\bfind\b.*-delete/],
  ['ran a script from the web', /\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b/],
  ['used sudo', /\bsudo\b/],
  ['ran a migration', /\bmigrat(e|ion)\b|\bdb:(push|reset|migrate)\b|\bprisma\s+(migrate|db\s+push)\b/],
  ['changed permissions', /\bchmod\b|\bchown\b/],
]

export const RISK_LABELS: string[] = RISKS.map(([label]) => label)

export function commandKind(command: string): string {
  return KINDS.find(([, re]) => re.test(command))?.[0] ?? 'other'
}
export const commandRisks = (command: string): string[] => RISKS.filter(([, re]) => re.test(command)).map(([label]) => label)

const READ_TOOLS = new Set(['Read', 'Glob', 'Grep', 'LS', 'WebFetch', 'WebSearch', 'NotebookRead'])

export function countCall(t: Turn, tool: string, args: Record<string, unknown>): Turn {
  const next: Turn = { ...t, files: [...t.files], kinds: { ...t.kinds }, risks: [...t.risks] }
  if (READ_TOOLS.has(tool)) next.reads += 1
  else if (isEditTool(tool)) {
    next.edits += 1
    const p = typeof args.file_path === 'string' ? args.file_path : typeof args.notebook_path === 'string' ? args.notebook_path : undefined
    if (p !== undefined && !next.files.includes(p) && next.files.length < FILES_KEPT) next.files.push(p)
  } else if (isShellTool(tool)) {
    next.commands += 1
    const cmd = typeof args.command === 'string' ? args.command : ''
    const kind = commandKind(cmd)
    next.kinds[kind] = (next.kinds[kind] ?? 0) + 1
    for (const r of commandRisks(cmd)) if (!next.risks.includes(r)) next.risks.push(r)
  } else if (tool === 'Agent' || tool === 'Task') next.agents += 1
  else if (tool.startsWith('mcp__')) next.outside += 1
  return next
}

const n = (count: number, one: string, many = `${one}s`): string => `${count} ${count === 1 ? one : many}`
const base = (p: string): string => lastName(p)

export function happenedWords(t: Turn | undefined): string {
  if (t === undefined) return 'No answer finished yet in this session.'
  const parts: string[] = []
  if (t.reads > 0) parts.push(`looked at ${n(t.reads, 'file or page', 'files or pages')}`)
  if (t.edits > 0) parts.push(`changed ${n(t.edits, 'file')}${t.files.length === 0 ? '' : ` (${t.files.map(base).join(', ')})`}`)
  if (t.commands > 0) parts.push(`ran ${n(t.commands, 'command')} (${Object.entries(t.kinds).map(([k, c]) => n(c, k)).join(', ')})`)
  if (t.agents > 0) parts.push(`started ${n(t.agents, 'agent')}`)
  if (t.outside > 0) parts.push(`used ${n(t.outside, 'outside tool')}`)
  const head = parts.length === 0 ? 'Only answered; it did not touch anything.' : `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}${parts.length > 1 ? `, ${parts.slice(1).join(', ')}` : ''}.`
  return t.risks.length === 0 ? head : `${head} Risky: ${t.risks.join(', ')}.`
}

export const riskNote = (t: Turn): string | undefined => (t.risks.length === 0 ? undefined : `Risky this answer: ${t.risks.join(', ')}.`)

// The band posts risk lines as English; this builds them from labels so each label can be translated on its own.
export const RISKY_BAND = 'Risky: {list}'
// A line built from facts is stored in English; when `t` has no line, try the table's fill-in rows by shape so old stored lines are still translated.
export function bandWords(line: string | { text: string; key?: unknown; vars?: unknown }, t: (s: string) => string): string {
  const keyed = typeof line === 'string' ? undefined : sayStored(line)
  if (keyed !== undefined) return keyed
  const text = typeof line === 'string' ? line : line.text
  const head = RISKY_BAND.replace('{list}', '')
  if (!text.startsWith(head)) {
    const said = t(text)
    return said !== text ? said : trFill(text)
  }
  return t(RISKY_BAND).replace('{list}', text.slice(head.length).split(', ').map(t).join(', '))
}
