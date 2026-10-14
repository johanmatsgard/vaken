// The agent board: pure functions over the stored list of helper agents (model, age, running or done).
import { tr } from './lang'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import { aboutMoney, money } from './prices'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'

export const BOARD_KEY = 'cockpit:agentboard'
export const BOARD_MAX = 40
export const KEEP_MS = 24 * 3_600_000
export const HOUR_MS = 3_600_000
// A background helper with no end seen counts as running for this long, then "probably done".
export const BACKGROUND_LIMIT_MS = 45 * 60_000
// Safety cap on the stored task words; the pane cuts by its real width.
const WHAT_MAX = 500
const MAX_LINES = 12
export const NONE_WORDS = 'No agents seen yet in the last 24 hours.'

type AgentState = 'running' | 'done' | 'failed' | 'unknown'
export type AgentEntry = {
  id: string
  agentId?: string
  session: string
  type: string
  model?: string
  what: string
  background: boolean
  startedAt: number
  endedAt?: number
  state: AgentState
  usd?: number // from the token counts the engine gives at each answer's end
  quietAt?: number
  warned?: boolean
}
// `state` is what is true now: a stored 'running' past the limit shows as 'unknown', and `stale` marks it.
export type BoardRow = AgentEntry & { stale: boolean }

const BOARD_SETTINGS: Setting[] = [
  {
    key: 'agents.board',
    group: 'Agents',
    label: 'Agent board',
    note: 'Show the agents that run, with model and time.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]
export const AGENTBOARD_SETTINGS = BOARD_SETTINGS
export const AGENTBOARD_HELP: HelpEntry[] = [
  { title: 'Where do I see my agents?', text: 'The board lists the agents in your sessions: which model, how long, and whether each one runs or is done. Vaken notes an end only when the engine reports it. If it saw no end, the row says "no end seen", and after 45 minutes "probably done".' },
]


const isState = (v: unknown): v is AgentState => v === 'running' || v === 'done' || v === 'failed' || v === 'unknown'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function parseBoard(raw: unknown): AgentEntry[] {
  if (!Array.isArray(raw)) return []
  const out: AgentEntry[] = []
  for (const r of raw) {
    const o = r as Partial<AgentEntry> | null
    if (typeof o !== 'object' || o === null) continue
    if (typeof o.id !== 'string' || typeof o.session !== 'string' || typeof o.type !== 'string' || typeof o.what !== 'string') continue
    if (!isNum(o.startedAt) || !isState(o.state) || typeof o.background !== 'boolean') continue
    const e: AgentEntry = { id: o.id, session: o.session, type: o.type, what: o.what, background: o.background, startedAt: o.startedAt, state: o.state }
    if (typeof o.agentId === 'string') e.agentId = o.agentId
    if (typeof o.model === 'string') e.model = o.model
    if (isNum(o.endedAt)) e.endedAt = o.endedAt
    if (isNum(o.usd) && o.usd >= 0) e.usd = o.usd
    if (isNum(o.quietAt)) e.quietAt = o.quietAt
    if (o.warned === true) e.warned = true
    out.push(e)
  }
  return out
}


export function cutWhat(text: string, max = WHAT_MAX): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

export type Start = { id: string; agentId?: string; session: string; type: string; model?: string; description: string; background: boolean }

const prune = (list: AgentEntry[], now: number): AgentEntry[] => list.filter(e => now - e.startedAt < KEEP_MS).slice(0, BOARD_MAX)

export function startAgent(list: AgentEntry[], s: Start, now: number): AgentEntry[] {
  const entry: AgentEntry = { id: s.id, session: s.session.slice(0, 8), type: s.type, what: cutWhat(s.description), background: s.background, startedAt: now, state: 'running' }
  if (s.agentId !== undefined) entry.agentId = s.agentId
  if (s.model !== undefined) entry.model = s.model
  return prune([entry, ...list.filter(e => e.id !== s.id)], now)
}

// Returns the same list when nothing matched, so the caller can tell.
export function endAgent(list: AgentEntry[], key: string, state: 'done' | 'failed', now: number): AgentEntry[] {
  let changed = false
  const next = list.map(e => {
    if ((e.id !== key && e.agentId !== key) || (e.state !== 'running' && e.state !== 'unknown')) return e
    changed = true
    return { ...e, state, endedAt: now }
  })
  return changed ? next : list
}

export function addAgentCost(list: AgentEntry[], key: string, usd: number | undefined, model?: string): AgentEntry[] {
  let changed = false
  const next = list.map(e => {
    if (e.id !== key && e.agentId !== key) return e
    changed = true
    return { ...e, ...(usd === undefined ? {} : { usd: (e.usd ?? 0) + usd }), ...(e.model === undefined && model !== undefined ? { model } : {}) }
  })
  return changed ? next : list
}

export const watchNeeded = (list: AgentEntry[], session: string, now: number): boolean =>
  list.some(e => e.session === session.slice(0, 8) && e.agentId !== undefined && e.state === 'running' && now - e.startedAt < BACKGROUND_LIMIT_MS)

export function markSessionUnknown(list: AgentEntry[], session: string): AgentEntry[] {
  const s = session.slice(0, 8)
  let changed = false
  const next = list.map(e => {
    if (e.session !== s || e.state !== 'running') return e
    changed = true
    return { ...e, state: 'unknown' as const }
  })
  return changed ? next : list
}

export type Status = { id: string; status: string }
export function syncStatus(list: AgentEntry[], infos: Status[], now: number): AgentEntry[] {
  const byId = new Map(infos.map(x => [x.id, x.status]))
  let changed = false
  const next = list.map(e => {
    if (e.agentId === undefined || (e.state !== 'running' && e.state !== 'unknown')) return e
    const st = byId.get(e.agentId)
    if (st === 'completed') {
      changed = true
      return { ...e, state: 'done' as const, endedAt: now }
    }
    if (st === 'failed' || st === 'killed') {
      changed = true
      return { ...e, state: 'failed' as const, endedAt: now }
    }
    return e
  })
  return changed ? next : list
}

// The engine's list has no activity time, so progress is the helper's own tool calls and turn ends.
const STUCK_MS = 10 * 60_000
export const STUCK_BAND_ID = 'agentstuck'
export const STUCK_BAND = 'An agent made no progress for 10 min'
const stuckWords = (minutes: number, t: Tr = tr): string => t('No progress for {n} min').replace('{n}', String(minutes))
const stuckMin = (r: AgentEntry, now: number): number | undefined => (r.state === 'running' && r.quietAt !== undefined ? Math.max(Math.round(STUCK_MS / 60_000), Math.floor((now - r.quietAt) / 60_000)) : undefined)

export function flagStuck(list: AgentEntry[], seen: ReadonlyMap<string, number>, session: string, now: number): { list: AgentEntry[]; fresh: number } {
  const mine = session.slice(0, 8)
  let fresh = 0
  let changed = false
  const next = list.map(e => {
    if (e.session !== mine || e.state !== 'running' || e.agentId === undefined || now - e.startedAt >= BACKGROUND_LIMIT_MS) return e
    const last = Math.max(e.startedAt, seen.get(e.agentId) ?? 0)
    if (now - last >= STUCK_MS) {
      if (e.quietAt === last && e.warned === true) return e
      changed = true
      if (e.warned !== true) fresh += 1
      return { ...e, quietAt: last, warned: true }
    }
    if (e.quietAt === undefined) return e
    changed = true
    const { quietAt: _gone, ...rest } = e
    return rest
  })
  return { list: changed ? next : list, fresh }
}


const effective = (e: AgentEntry, now: number): BoardRow => {
  const old = now - e.startedAt >= BACKGROUND_LIMIT_MS
  if (e.state === 'running' && old) return { ...e, state: 'unknown', stale: true }
  return { ...e, stale: e.state === 'unknown' && old }
}

export function boardRows(list: AgentEntry[], now: number): BoardRow[] {
  return list
    .filter(e => now - e.startedAt < KEEP_MS)
    .map(e => effective(e, now))
    .sort((a, b) => (a.state === 'running' ? 0 : 1) - (b.state === 'running' ? 0 : 1) || b.startedAt - a.startedAt)
}

// Foreground helpers are counted by the limit itself while their Agent call runs.
export const runningCount = (list: AgentEntry[], now: number): number => list.filter(e => e.state === 'running' && e.background && now - e.startedAt < BACKGROUND_LIMIT_MS).length


export function dur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${Math.max(1, s)} s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return m % 60 === 0 ? `${h} h` : `${h} h ${m % 60} min`
}

const markOf = (state: AgentState): string => (state === 'running' ? '●' : state === 'done' ? '✓' : state === 'failed' ? '▲' : '?')
const stateWord = (r: BoardRow, t: Tr = same): string => t(r.state === 'running' ? 'running' : r.state === 'done' ? 'done' : r.state === 'failed' ? 'failed' : r.stale ? 'probably done' : 'no end seen')
const TEXT_WHAT = 100
const cut = (t: string, n: number): string => (t.length > n ? `${t.slice(0, n - 1)}…` : t)
export function modelWord(model: string | undefined, t: Tr = same): string {
  if (model === undefined || model === '') return t('model unknown')
  const m = /opus|sonnet|haiku|fable/i.exec(model)
  return m === null ? cut(model, 18) : m[0].toLowerCase()
}
const ageWord = (r: BoardRow, now: number, t: Tr = same): string => {
  if (r.state === 'running') return stuckMin(r, now) === undefined ? dur(now - r.startedAt) : fillIn(t('{d}, no progress for {n} min'), { d: dur(now - r.startedAt), n: stuckMin(r, now) as number })
  if ((r.state === 'done' || r.state === 'failed') && r.endedAt !== undefined) return fillIn(t('took {d}'), { d: dur(r.endedAt - r.startedAt) })
  return fillIn(t('started {d} ago'), { d: dur(now - r.startedAt) })
}

export const rowLine = (r: BoardRow, now: number, t: Tr = same): string => `${markOf(r.state)} ${cut(r.type, 24)} (${modelWord(r.model, t)}): ${cut(r.what, TEXT_WHAT)}, ${stateWord(r, t)}, ${ageWord(r, now, t)}`

const runningOf = (rows: BoardRow[]): number => rows.filter(r => r.state === 'running').length
const finishedLastHour = (rows: BoardRow[], now: number): number => rows.filter(r => (r.state === 'done' || r.state === 'failed') && r.endedAt !== undefined && now - r.endedAt < HOUR_MS).length
const headerLine = (rows: BoardRow[], now: number): string => `Agents: ${runningOf(rows)} running, ${finishedLastHour(rows, now)} finished in the last hour.`

export function boardText(rows: BoardRow[], now: number): string {
  if (rows.length === 0) return NONE_WORDS
  const unknown = rows.some(r => r.state === 'unknown')
  const room = MAX_LINES - 1 - (unknown ? 1 : 0)
  const shown = rows.length <= room ? rows : rows.slice(0, room - 1)
  const lines = [headerLine(rows, now), ...shown.map(r => rowLine(r, now))]
  if (shown.length < rows.length) lines.push(`And ${rows.length - shown.length} more.`)
  if (unknown) lines.push('No end seen: vaken saw the agent start but not stop.')
  return lines.join('\n')
}

const CARD_TITLE = 'Agents'
const compactLine = (r: BoardRow, now: number, t: Tr = same): string => {
  const stuck = stuckMin(r, now)
  const age = r.state === 'running' ? (stuck === undefined ? dur(now - r.startedAt) : stuckWords(stuck, t)) : r.state === 'unknown' ? stateWord(r, t) : r.endedAt !== undefined ? dur(r.endedAt - r.startedAt) : stateWord(r, t)
  return `${markOf(r.state)} ${cut(r.type, 20)}, ${modelWord(r.model, t)}, ${age}`
}

export function boardCardLines(rows: BoardRow[], now: number, detail: string, t: Tr = same): { title: string; note: string; lines: string[] } {
  const explained = detail === 'explained'
  const max = explained ? 8 : 3
  if (rows.length === 0) return { title: CARD_TITLE, note: t('none seen'), lines: [t(explained ? NONE_WORDS : 'No agents seen yet.')] }
  const running = runningOf(rows)
  const unknown = rows.filter(r => r.state === 'unknown').length
  const note = `${running === 0 ? t('none running') : fillIn(t('{n} running'), { n: running })}${explained && unknown > 0 ? `, ${fillIn(t('{n} no end seen'), { n: unknown })}` : ''}`
  const make = (r: BoardRow): string => (explained ? rowLine(r, now, t) : compactLine(r, now, t))
  const shown = rows.length <= max ? rows : rows.slice(0, max - 1)
  const lines = shown.map(make)
  if (shown.length < rows.length) lines.push(fillIn(t('And {n} more.'), { n: rows.length - shown.length }))
  return { title: CARD_TITLE, note, lines }
}


type RowKind = 'working' | 'waiting' | 'idle' | 'needs'
export const rowKind = (r: BoardRow): RowKind => (r.state === 'running' ? 'working' : r.state === 'done' ? 'waiting' : r.state === 'failed' ? 'needs' : 'idle')
export const rowWord = (r: BoardRow): string => (r.state === 'running' ? 'Running' : r.state === 'done' ? 'Done' : r.state === 'failed' ? 'Failed' : 'Unknown')
export const rowAge = (r: BoardRow, now: number, t: Tr = tr): string =>
  r.state === 'running' ? (stuckMin(r, now) === undefined ? dur(now - r.startedAt) : stuckWords(stuckMin(r, now) as number, t)) : r.endedAt !== undefined && r.state !== 'unknown' ? dur(r.endedAt - r.startedAt) : fillIn(t('{age} ago'), { age: dur(now - r.startedAt) })
export const rowName = (r: BoardRow): string => (r.what === '' ? r.type : r.what)
// When the line is too long the part saying who started it goes first, so the app never ellipsizes a word.
export const rowDetail = (r: BoardRow, from: string, max?: number, cost?: string): string => {
  const head = `${modelWord(r.model)} · ${r.type}${cost === undefined ? '' : ` · ${cost}`}`
  const whole = `${head} · ${from}`
  return max === undefined || whole.length <= max ? whole : head
}

export function rowFacts(r: BoardRow, now: number, from: string, t: Tr = same): string[] {
  const stuck = stuckMin(r, now)
  const time =
    r.state === 'running'
      ? `${fillIn(t('running for {d} so far'), { d: dur(now - r.startedAt) })}${stuck === undefined ? '' : `, ${fillIn(t('no progress for {n} min'), { n: stuck })}`}`
      : r.endedAt !== undefined && r.state !== 'unknown'
        ? fillIn(t('took {d}'), { d: dur(r.endedAt - r.startedAt) })
        : fillIn(t('started {d} ago'), { d: dur(now - r.startedAt) })
  const result = t(r.state === 'running' ? 'not yet, it still runs' : r.state === 'done' ? 'done' : r.state === 'failed' ? 'failed or stopped' : r.stale ? 'probably done: no end seen in 45 minutes' : 'no end seen: vaken saw it start but not stop')
  return [
    fillIn(t('Asked: {what}'), { what: rowName(r) }),
    fillIn(t('Started by: {from}, as {type} on {model}'), { from, type: r.type, model: modelWord(r.model, t) }),
    fillIn(t('Time: {time}'), { time }),
    fillIn(t('Result: {result}'), { result }),
    fillIn(t('Cost: {cost}'), { cost: r.usd === undefined ? t('not known yet') : fillIn(t('about {cost} (estimate)'), { cost: money(r.usd) }) }),
  ]
}

export type AgentsSplit = { running: BoardRow[]; recent: BoardRow[]; older: BoardRow[] }
const endOf = (r: BoardRow): number => r.endedAt ?? r.startedAt
export function splitAgents(rows: BoardRow[], now: number, scope: 'all' | 'here' = 'all', session = ''): AgentsSplit {
  const mine = session.slice(0, 8)
  const kept = scope === 'here' ? rows.filter(r => r.session === mine) : rows
  const running = kept.filter(r => r.state === 'running').sort((a, b) => b.startedAt - a.startedAt)
  const rest = kept.filter(r => r.state !== 'running')
  const recent = rest.filter(r => now - endOf(r) < HOUR_MS).sort((a, b) => endOf(b) - endOf(a))
  const older = rest.filter(r => now - endOf(r) >= HOUR_MS).sort((a, b) => a.type.localeCompare(b.type) || endOf(b) - endOf(a))
  return { running, recent, older }
}
export const agentsHeadOf = (s: AgentsSplit, others = 0): { running: number; stuck: number; total: number; others?: number } => ({ running: s.running.length, stuck: s.running.filter(r => r.quietAt !== undefined).length, total: s.running.length + s.recent.length, ...(others > 0 ? { others } : {}) })

export function othersCount(rows: BoardRow[], now: number, session: string): number {
  const all = splitAgents(rows, now, 'all')
  const mine = session.slice(0, 8)
  return [...all.running, ...all.recent].filter(r => r.session !== mine).length
}

export const rowRight = (r: BoardRow, now: number, t: Tr = tr): string => (r.state === 'running' || r.usd === undefined || r.state === 'unknown' ? rowAge(r, now, t) : `${rowAge(r, now, t)} · ${aboutMoney(r.usd, t)}`)

export const rowCost = (r: BoardRow, t: Tr = tr): string | undefined => (r.state === 'running' || r.usd === undefined || r.state === 'unknown' ? undefined : aboutMoney(r.usd, t))

export function agentsText(rows: BoardRow[], now: number, fromOf: (r: BoardRow) => string, cmd: string): string[] {
  if (rows.length === 0) return []
  const s = splitAgents(rows, now)
  const lines = [`Agents: ${s.running.length} running, ${s.recent.length} finished in the last hour.`]
  for (const r of [...s.running, ...s.recent]) lines.push(`${rowLine(r, now)} · ${fromOf(r)}`)
  return lines.map(l => `${l} · ${cmd}`)
}
