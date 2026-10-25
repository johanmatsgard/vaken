// Plugin trust card: what each plugin can do and did, from what the engine scans of every hooks module loaded after vaken.
import { langNow, t, tr } from './lang'
import { fillIn } from './fillin'
import type { HelpEntry } from './registry'
import { fmt } from './fmt'

export const VERSIONS_KEY = 'cockpit:trust:versions'
export const SEEN_KEY = 'cockpit:trust:seen'
export const CHANGES_KEY = 'cockpit:trust:changes'
export const UPDATE_WHAT = 'Noticed a plugin update'
export const SEEN_DAYS = 30
const MAX_PLUGINS = 60
const MAX_CHANGES = 40
const SHOW_PLUGINS = 10

export const TRUST_HELP: HelpEntry[] = [
  {
    title: 'What your plugins can do',
    text: '/vaken-help run trust lists your plugins in plain words: what each one can do, from the engine\'s own scan of it. It also tells you when a plugin\'s version changed since the last session.',
  },
]

type Versions = Record<string, string>
export type Change = { name: string; from: string; to: string; at: number; told: boolean }
export type Seen = { tier: string; events: string[]; calls: string[]; at: number }
type SeenMap = Record<string, Seen>

// "name@marketplace" and "name" are the same plugin.
export const plainName = (n: string): string => n.split('@')[0] ?? n
const cleanName = (n: string): string => plainName(n).replace(/[^A-Za-z0-9._:-]/g, '?').slice(0, 40)
const cleanVersion = (v: string): string => v.replace(/[^A-Za-z0-9._+-]/g, '?').slice(0, 24)
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')
const words = (v: unknown, max: number, each: number): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map(x => x.slice(0, each)).slice(0, max) : [])

export function parseVersions(raw: unknown): Versions {
  if (typeof raw !== 'object' || raw === null) return {}
  const out: Versions = {}
  for (const [name, v] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_PLUGINS)) if (typeof v === 'string') out[cleanName(name)] = cleanVersion(v)
  return out
}

export function versionChange(old: Versions, name: string, version: string | undefined, now: number): Change | undefined {
  if (version === undefined || version === '') return undefined
  const n = cleanName(name)
  const before = old[n]
  const to = cleanVersion(version)
  return before === undefined || before === to ? undefined : { name: n, from: before, to, at: now, told: false }
}

export const withVersion = (old: Versions, name: string, version: string): Versions => ({ ...old, [cleanName(name)]: cleanVersion(version) })

export function parseChanges(raw: unknown): Change[] {
  if (!Array.isArray(raw)) return []
  const out: Change[] = []
  for (const c of raw as Record<string, unknown>[]) {
    if (typeof c !== 'object' || c === null || typeof c.at !== 'number') continue
    out.push({ name: cleanName(str(c.name, 40)), from: cleanVersion(str(c.from, 24)), to: cleanVersion(str(c.to, 24)), at: c.at, told: c.told === true })
  }
  return out.slice(0, MAX_CHANGES)
}

export const addChange = (list: Change[], c: Change): Change[] => [c, ...list].slice(0, MAX_CHANGES)

export const changeDetail = (c: Change): string => `${c.name} went from version ${c.from} to ${c.to}.`
export const changeToast = (list: Change[]): string => (list.length === 1 ? tr('Plugin updated: {name} {from} to {to}. See /vaken-help run trust.').replace('{name}', list[0].name).replace('{from}', list[0].from).replace('{to}', list[0].to) : tr('{n} plugins were updated. See /vaken-help run trust.').replace('{n}', String(list.length)))

export function parseSeen(raw: unknown, now: number): SeenMap {
  if (typeof raw !== 'object' || raw === null) return {}
  const out: SeenMap = {}
  for (const [name, v] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_PLUGINS)) {
    if (typeof v !== 'object' || v === null) continue
    const r = v as Record<string, unknown>
    const at = typeof r.at === 'number' ? r.at : 0
    if (now - at > SEEN_DAYS * 86_400_000) continue
    out[cleanName(name)] = { tier: str(r.tier, 12), events: words(r.events, 60, 40), calls: words(r.calls, 80, 40), at }
  }
  return out
}

export type Registered = { name: string; tier: string; events: readonly string[]; calls: readonly string[] }
export const withSeen = (old: SeenMap, r: Registered, now: number): SeenMap => ({
  ...old,
  [cleanName(r.name)]: { tier: r.tier.slice(0, 12), events: r.events.map(x => x.slice(0, 40)).slice(0, 60), calls: r.calls.map(x => x.slice(0, 40)).slice(0, 80), at: now },
})

const CALL_WORDS: [RegExp, string][] = [
  [/^fs\.write$/, 'write files'],
  [/^(process\.run|process\.spawn)$/, 'run programs'],
  [/^(http\.fetch|mcp\.call|mcp\.connect)$/, 'reach the network or other tools'],
  [/^(model\.complete|model\.classify|model\.fork)$/, 'spend model usage'],
  [/^env\.set$/, 'change environment variables'],
  [/^(tool\.call|command\.run|agent\.spawn)$/, 'start tools, commands or agents by itself'],
  [/^(session\.send|session\.append)$/, 'put messages in the session'],
]

const EVENT_WORDS: [RegExp, string][] = [
  [/^tool\.(call|result)/, 'see or change Claude\'s tool steps'],
  [/^(prompt\.|session\.send)/, 'see or change your messages'],
  [/^command\.run$/, 'handle slash commands'],
  [/^(fs\.|process\.|http\.)/, 'see file, program or network calls'],
  [/^(model\.)/, 'see model calls'],
  [/^ui\./, 'draw on screen'],
  [/^(plugin\.register|engine\.create)$/, 'judge other plugins or change the engine'],
  [/^(session\.|compact)/, 'watch the session'],
]

const uniq = (list: string[]): string[] => [...new Set(list)]
export const canDo = (calls: readonly string[]): string[] => uniq(CALL_WORDS.filter(([re]) => calls.some(c => re.test(c))).map(([, w]) => tr(w)))
export const hooksWhat = (events: readonly string[]): string[] => uniq(EVENT_WORDS.filter(([re]) => events.some(e => re.test(e))).map(([, w]) => tr(w)))

export type Row = { name: string; version?: string; seen?: Seen; commands: number; agentsStarted: number; own?: boolean }
export type Servers = { name: string; tools: number }[]

const ago = (ms: number): string => fmt.ago(ms, 'recent', langNow())
const list = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${tr('and')} ${xs[xs.length - 1]}`)

export function rowLine(r: Row, now: number): string {
  const head = `${r.name}${r.version === undefined ? '' : ` ${r.version}`}${r.own === true ? ` (${tr('this suite')})` : ''}`
  const bits: string[] = []
  if (r.seen === undefined && r.own === true) bits.push(tr('the engine does not scan the plugin that reads the scan, so see its source for what it can do'))
  else if (r.seen === undefined) bits.push(tr('not scanned by vaken (it loaded before vaken, or this session has not loaded it yet), so what its hooks can do is not known'))
  else {
    const can = canDo(r.seen.calls)
    const hooks = hooksWhat(r.seen.events)
    bits.push(can.length === 0 ? tr('its scan shows no calls that change things') : fillIn(tr('its scan says it can {list}'), { list: list(can) }))
    bits.push(hooks.length === 0 ? fillIn(tr('hooks {events}'), { events: t('words.event', { n: r.seen.events.length }) }) : fillIn(tr('its hooks {list} ({events})'), { list: list(hooks), events: t('words.event', { n: r.seen.events.length }) }))
    bits.push(fillIn(tr('scanned {ago}'), { ago: ago(now - r.seen.at) }))
  }
  if (r.commands > 0) bits.push(t('words.slash_command', { n: r.commands }))
  if (r.agentsStarted > 0) bits.push(fillIn(tr('started {agents} in this session'), { agents: t('words.agent', { n: r.agentsStarted }) }))
  return `${head}: ${bits.join('; ')}.`
}

export function updateLines(changes: Change[]): string[] {
  const groups = new Map<string, Change[]>()
  for (const c of changes) groups.set(c.name, [...(groups.get(c.name) ?? []), c])
  const lines: string[] = []
  for (const [name, list] of [...groups.entries()].sort((a, b) => (b[1][0]?.at ?? 0) - (a[1][0]?.at ?? 0)).slice(0, SHOW_PLUGINS)) {
    const newest = list[0] as Change
    const oldest = list[list.length - 1] as Change
    const span = newest.at - oldest.at
    const over = span < 3_600_000 ? t('fmt.n_min', { n: Math.round(span / 60_000) }) : span < 48 * 3_600_000 ? t('words.hour', { n: Math.round(span / 3_600_000) }) : t('words.day', { n: Math.round(span / 86_400_000) })
    lines.push(`${fillIn(tr('{name}: {from} to {to}, {changes}'), { name, from: oldest.from, to: newest.to, changes: t('words.change', { n: list.length }) })}${list.length > 1 && span >= 60_000 ? ` ${fillIn(tr('in {span}'), { span: over })}` : ''}`)
  }
  const more = groups.size - SHOW_PLUGINS
  if (more > 0) lines.push(fillIn(tr('and {n} more'), { n: more }))
  return lines
}

export function trustCard(rows: Row[], servers: Servers, changes: Change[], now: number): string {
  const out: string[] = []
  out.push(tr('Plugin trust card. What each plugin can do, as far as vaken can see. Counts and names only.'))
  out.push('')
  const recent = changes.filter(c => now - c.at < SEEN_DAYS * 86_400_000)
  if (recent.length > 0) out.push(tr('Updated plugins, newest first:'), ...updateLines(recent).map(l => `  ${l}`), '')
  if (rows.length === 0) out.push(tr('No plugin seen yet.'))
  else out.push(...rows.map(r => `  ${rowLine(r, now)}`))
  if (servers.length > 0) {
    out.push('', tr('Tool servers (MCP) in this session:'))
    for (const s of servers.slice(0, 8)) out.push(`  ${s.name}: ${t('words.tool', { n: s.tools })}`)
    if (servers.length > 8) out.push(`  ${fillIn(tr('and {n} more'), { n: servers.length - 8 })}`)
  }
  out.push(
    '',
    tr('Not knowable from here:'),
    `  ${tr('Plugins that loaded before vaken (they show no scan).')}`,
    `  ${tr('What a plugin really does inside its hooks, and which files, commands or addresses it touched.')}`,
    `  ${tr('Whether its tools are safe. "Can do" is what its code asks the engine for, not what it did.')}`,
  )
  return out.join('\n')
}
