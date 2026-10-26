// The agent board: pure functions over the stored list of helper agents (model, age, running or done).
import { langNow, tr } from './lang'
import { fmt } from './fmt'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import { aboutEstimate, aboutMoney, money } from './prices'
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
  const updated = list.map(e => {
    if ((e.id !== key && e.agentId !== key) || (e.state !== 'running' && e.state !== 'unknown')) return e
    changed = true
    return { ...e, state, endedAt: now }
  })
  return changed ? updated : list
}

export function addAgentCost(list: AgentEntry[], key: string, usd: number | undefined, model?: string): AgentEntry[] {
  let changed = false
  const updated = list.map(e => {
    if (e.id !== key && e.agentId !== key) return e
    changed = true
    return { ...e, ...(usd === undefined ? {} : { usd: (e.usd ?? 0) + usd }), ...(e.model === undefined && model !== undefined ? { model } : {}) }
  })
  return changed ? updated : list
}

export const watchNeeded = (list: AgentEntry[], session: string, now: number): boolean =>
  list.some(e => e.session === session.slice(0, 8) && e.agentId !== undefined && e.state === 'running' && now - e.startedAt < BACKGROUND_LIMIT_MS)

export function markSessionUnknown(list: AgentEntry[], session: string): AgentEntry[] {
  const s = session.slice(0, 8)
  let changed = false
  const updated = list.map(e => {
    if (e.session !== s || e.state !== 'running') return e
    changed = true
    return { ...e, state: 'unknown' as const }
  })
  return changed ? updated : list
}

export type Status = { id: string; status: string }
export function syncStatus(list: AgentEntry[], infos: Status[], now: number): AgentEntry[] {
  const byId = new Map(infos.map(x => [x.id, x.status]))
  let changed = false
  const updated = list.map(e => {
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
  return changed ? updated : list
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
  const updated = list.map(e => {
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
  return { list: changed ? updated : list, fresh }
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

// Foreground helpers are counted by the limit itself while their Agent call runs. With the engine's list of this session's agents (`live`), a row of this session the list no longer holds, or holds as ended, is over, even when no end was seen.
export function runningCount(list: AgentEntry[], now: number, live?: { session: string; statuses: Status[] }): number {
  const mine = live?.session.slice(0, 8)
  const liveIds = new Set((live?.statuses ?? []).filter(s => s.status !== 'completed' && s.status !== 'failed' && s.status !== 'killed').map(s => s.id))
  return list.filter(e => e.state === 'running' && e.background && now - e.startedAt < BACKGROUND_LIMIT_MS && (live === undefined || e.session !== mine || e.agentId === undefined || liveIds.has(e.agentId))).length
}


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
const headerLine = (rows: BoardRow[], now: number): string => fillIn(tr('Agents: {running} running, {n} finished in the last hour.'), { running: runningOf(rows), n: finishedLastHour(rows, now) })

export function boardText(rows: BoardRow[], now: number): string {
  if (rows.length === 0) return tr(NONE_WORDS)
  const unknown = rows.some(r => r.state === 'unknown')
  const room = MAX_LINES - 1 - (unknown ? 1 : 0)
  const shown = rows.length <= room ? rows : rows.slice(0, room - 1)
  const lines = [headerLine(rows, now), ...shown.map(r => rowLine(r, now, tr))]
  if (shown.length < rows.length) lines.push(fillIn(tr('And {n} more.'), { n: rows.length - shown.length }))
  if (unknown) lines.push(tr('No end seen: vaken saw the agent start but not stop.'))
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
// The right column: a running helper's time so far; an ended one says when it ended, coarse and whole ("17 min ago", "6 h ago"; its length goes in the detail line); else when it started.
export const rowAge = (r: BoardRow, now: number, t: Tr = tr): string =>
  r.state === 'running' ? (stuckMin(r, now) === undefined ? dur(now - r.startedAt) : stuckWords(stuckMin(r, now) as number, t)) : fmt.ago(now - (r.endedAt !== undefined && r.state !== 'unknown' ? r.endedAt : r.startedAt), 'days', t === same ? 'en' : langNow())
export const rowName = (r: BoardRow): string => (r.what === '' ? r.type : r.what)
// Whole parts or none: when the line is too long, whole parts go, the least needed first (who started it, then the model, the type, the time), so a part never breaks in two
// and the cost stays at 288 pt. `from` is set only for a helper of another session; this session's rows carry no tag.
export const rowDetail = (r: BoardRow, from: string | undefined, max?: number, cost?: string, t: Tr = tr): string => {
  const took = (r.state === 'done' || r.state === 'failed') && r.endedAt !== undefined ? fillIn(t('took {d}'), { d: dur(r.endedAt - r.startedAt) }) : undefined
  return wholeParts([[modelWord(r.model), 5], [r.type, 4], ...(took === undefined ? [] : [[took, 3] as const]), ...(cost === undefined ? [] : [[cost, 1] as const]), ...(from === undefined ? [] : [[from, 6] as const])], max, false)
}
// Parts in their order, each with its rank to go (higher goes first); joined with " · " into at most `max` characters, the first part kept unless `keepFirst` is false (then the last part left stays).
export function wholeParts(parts: readonly (readonly [string, number])[], max?: number, keepFirst = true): string {
  let kept = parts.map((p, n) => ({ text: p[0], rank: p[1], n }))
  const line = (): string => kept.map(p => p.text).join(' · ')
  while (max !== undefined && kept.length > 1 && line().length > max) {
    const go = (keepFirst ? kept.slice(1) : kept).reduce((a, b) => (b.rank >= a.rank ? b : a))
    kept = kept.filter(p => p !== go)
  }
  return line()
}

// `said`: what the row itself already says (its words, its time, its second line), given when the facts open under that row; then they hold only the rest:
// never the name, the time or the state word again, the model, kind and cost only when the second line does not carry them.
// A failed end is told by several signals that do not say whether it failed or was stopped, so its result is "ended".
export function rowFacts(r: BoardRow, now: number, from: string, t: Tr = same, said?: string): string[] {
  const stuck = stuckMin(r, now)
  const time =
    r.state === 'running'
      ? `${fillIn(t('running for {d} so far'), { d: dur(now - r.startedAt) })}${stuck === undefined ? '' : `, ${fillIn(t('no progress for {n} min'), { n: stuck })}`}`
      : r.endedAt !== undefined && r.state !== 'unknown'
        ? fillIn(t('took {d}'), { d: dur(r.endedAt - r.startedAt) })
        : fillIn(t('started {d} ago'), { d: dur(now - r.startedAt) })
  const result = t(r.state === 'running' ? 'not yet, it still runs' : r.state === 'done' ? 'done' : r.state === 'failed' ? 'ended' : r.stale ? 'unknown, probably done: no end in 45 minutes' : 'unknown: vaken saw it start but not stop')
  const cost = r.usd === undefined ? t('not known yet') : fillIn(t('about {cost} (estimate)'), { cost: money(r.usd) })
  if (said === undefined) {
    return [
      fillIn(t('Asked: {what}'), { what: rowName(r) }),
      fillIn(t('Started by: {from}, as {type} on {model}'), { from, type: r.type, model: modelWord(r.model, t) }),
      fillIn(t('Time: {time}'), { time }),
      fillIn(t('Result: {result}'), { result }),
      fillIn(t('Cost: {cost}'), { cost }),
    ]
  }
  // The second line is whole parts joined by " · " (rowDetail): a fact is said when it is one of them
  const parts = said.split(' · ')
  const has = (s: string): boolean => s !== '' && parts.includes(s)
  const kindSaid = has(modelWord(r.model)) && has(r.type)
  // Running, the time column says how long; ended, the second line says what it took; with no end seen the start stays (the column alone does not say it is the start)
  const timeSaid = r.state === 'running' ? stuck === undefined : r.state === 'unknown' ? false : has(fillIn(t('took {d}'), { d: dur((r.endedAt ?? now) - r.startedAt) }))
  const costSaid = r.usd !== undefined && has(aboutEstimate(r.usd, t))
  return [
    ...(kindSaid && has(from) ? [] : [kindSaid ? fillIn(t('Started by: {from}'), { from }) : fillIn(t('Started by: {from}, as {type} on {model}'), { from, type: r.type, model: modelWord(r.model, t) })]),
    ...(timeSaid ? [] : [fillIn(t('Time: {time}'), { time: r.state === 'running' ? fillIn(t('running for {d} so far'), { d: dur(now - r.startedAt) }) : time })]),
    // The state word says Running and Done; an end it cannot name and a row with no end seen say more
    ...(r.state === 'running' || r.state === 'done' ? [] : [fillIn(t('Result: {result}'), { result })]),
    ...(costSaid ? [] : [fillIn(t('Cost: {cost}'), { cost })]),
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
// `now` gives one helper with no progress its minutes ("No progress for 11 min").
export function agentsHeadOf(s: AgentsSplit, others = 0, now?: number): { running: number; stuck: number; total: number; others?: number; stuckMin?: number } {
  const quiet = s.running.filter(r => r.quietAt !== undefined)
  const min = now === undefined || quiet.length !== 1 ? undefined : stuckMin(quiet[0], now)
  return { running: s.running.length, stuck: quiet.length, total: s.running.length + s.recent.length, ...(others > 0 ? { others } : {}), ...(min === undefined ? {} : { stuckMin: min }) }
}

export function othersCount(rows: BoardRow[], now: number, session: string): number {
  const all = splitAgents(rows, now, 'all')
  const mine = session.slice(0, 8)
  return [...all.running, ...all.recent].filter(r => r.session !== mine).length
}

export const rowRight = (r: BoardRow, now: number, t: Tr = tr): string => (r.state === 'running' || r.usd === undefined || r.state === 'unknown' ? rowAge(r, now, t) : `${rowAge(r, now, t)} · ${aboutMoney(r.usd, t)}`)

// The row's money says it is an estimate ("about $0.12 (estimate)")
export const rowCost = (r: BoardRow, t: Tr = tr): string | undefined => (r.state === 'running' || r.usd === undefined || r.state === 'unknown' ? undefined : aboutEstimate(r.usd, t))

export function agentsText(rows: BoardRow[], now: number, fromOf: (r: BoardRow) => string, cmd: string): string[] {
  if (rows.length === 0) return []
  const s = splitAgents(rows, now)
  const lines = [fillIn(tr('Agents: {running} running, {n} finished in the last hour.'), { running: s.running.length, n: s.recent.length })]
  for (const r of [...s.running, ...s.recent]) lines.push(`${rowLine(r, now, tr)} · ${fromOf(r)}`)
  return lines.map(l => `${l} · ${cmd}`)
}

// Helper done signals: a teammate that waits for a message (TeammateIdle) gets one calm nudge row once it has waited this long. Names and times only.
export const IDLE_NUDGE_MS = 5 * 60_000
const IDLE_KEEP_MS = 2 * HOUR_MS
const IDLE_MAX = 8
// Kept in this session's memory only (features/agentboard.ts idleMem): nothing is stored
export type Idle = Record<string, { name: string; at: number }>
export type IdleRow = { id: string; name: string; min: number }

// `name` undefined forgets the entry. A new entry past IDLE_MAX pushes out the oldest; one older than IDLE_KEEP_MS is forgotten.
export function withIdle(idle: Idle, id: string, name: string | undefined, now: number): Idle {
  const out: Idle = {}
  for (const [k, v] of Object.entries(idle)) if (k !== id && now - v.at < IDLE_KEEP_MS) out[k] = v
  if (name === undefined) return out
  out[id] = { name: cutWhat(name, 60), at: now }
  const ids = Object.keys(out).sort((a, b) => out[a].at - out[b].at)
  while (ids.length > IDLE_MAX) delete out[ids.shift() as string]
  return out
}

export const idleRows = (idle: Idle, now: number): IdleRow[] =>
  Object.entries(idle)
    .filter(([, v]) => now - v.at >= IDLE_NUDGE_MS && now - v.at < IDLE_KEEP_MS)
    .sort((a, b) => a[1].at - b[1].at)
    .map(([id, v]) => ({ id, name: v.name, min: Math.floor((now - v.at) / 60_000) }))

// Rows of this session that ended between two readings of the list: each gets one done notice
export function newlyEnded(before: readonly AgentEntry[], after: readonly AgentEntry[], session: string): AgentEntry[] {
  const mine = session.slice(0, 8)
  const was = new Map(before.map(e => [e.id, e.state]))
  return after.filter(e => e.session === mine && (e.state === 'done' || e.state === 'failed') && (was.get(e.id) === 'running' || was.get(e.id) === 'unknown'))
}

// The done notice: the agent's task words, its time and its cost when known ("Agent done: Fix the login, took 4 min, about $0.21.")
export function doneNotice(e: AgentEntry, t: Tr = tr): string {
  const took = e.endedAt === undefined ? undefined : dur(e.endedAt - e.startedAt)
  const name = cutWhat(e.what === '' ? e.type : e.what, 60)
  const head = fillIn(t(e.state === 'failed' ? 'Agent stopped: {name}' : 'Agent done: {name}'), { name })
  const parts = [...(took === undefined ? [] : [fillIn(t('took {d}'), { d: took })]), ...(e.usd === undefined ? [] : [aboutMoney(e.usd, t)])]
  return parts.length === 0 ? `${head}.` : `${head}, ${parts.join(', ')}.`
}
