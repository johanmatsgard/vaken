// The shared record: one line per session so a pane in any session can show all. Counts, names, states, times and a short title only; never prompt text, transcript or tool output.
import type { ContextFacts } from './appcontext'
import type { CacheFacts, CompactFact } from './cachefacts'
import type { DoneFacts } from './sessionfacts'
import type { FitFacts } from './modelfit'
import { forgetNote, holdNote } from './flush'
import type { Io } from './io'
import { alivePidsArgv, parseAlivePids, platformOfIo } from './procs'

type State = 'working' | 'waiting' | 'idle'
// `permission` counts as 'needs you' only after PERMISSION_WAIT_MS.
type Ask = { kind: 'question' | 'permission'; tool: string; since: number }
export type SessionRecord = {
  sessionId: string
  cwd: string
  branch?: string
  // Older records hold the first four words.
  title?: string
  model: string
  state: State
  ask?: Ask
  contextPercent?: number
  ctx?: ContextFacts
  cache?: CacheFacts
  compacts?: CompactFact[]
  costUsd?: number
  done?: DoneFacts
  // Coarse, so it changes seldom.
  fit?: FitFacts
  fiveHourPercent?: number
  fiveHourResetsAt?: string
  sevenDayPercent?: number
  sevenDayResetsAt?: string
  spendPercent?: number
  spendResetsAt?: string
  // A record whose process is gone is dead, whatever it last said.
  pid?: number
  startedAt: number
  // A heartbeat counts; keeps a quiet session from reading stale.
  updatedAt: number
  // Only this makes a session 'working'.
  lastEventAt: number
  stateSince: number
  // The last message the person typed to Claude (not a slash command): a stopped step older than it is no longer waiting.
  promptAt?: number
}

const PREFIX = 'cockpit:session:'
export const STALE_MS = 90_000
export const LIVE_MS = 120_000
export const DROP_MS = 600_000

// Only this session writes its record, so the kept copy is the record and the many readers need no read.
const mine = new Map<string, SessionRecord>()
const copyOf = (rec: SessionRecord): SessionRecord => JSON.parse(JSON.stringify(rec)) as SessionRecord

// What the band shows and the session's name go to the store at once; other changes within SAVE_EVERY_MS and at the end of a main turn. The heartbeat saves time-only changes.
const TIME_FIELDS = new Set(['updatedAt', 'lastEventAt'])
const NAME_FIELDS = ['title', 'branch', 'cwd', 'model'] as const
const onlyTimes = (a: SessionRecord, b: SessionRecord): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) if (!TIME_FIELDS.has(k) && JSON.stringify((a as Record<string, unknown>)[k]) !== JSON.stringify((b as Record<string, unknown>)[k])) return false
  return true
}

export async function putRecord(io: Io, patch: Partial<SessionRecord> & { sessionId: string }, isEvent: boolean, isBeat = false): Promise<SessionRecord> {
  const key = PREFIX + patch.sessionId
  const kept = mine.get(patch.sessionId)
  const old = kept !== undefined ? kept : ((await io.get(key)) as SessionRecord | undefined)
  const now = await io.now()
  const base = { cwd: '', model: 'unknown', state: 'idle' as State, startedAt: now, lastEventAt: now, stateSince: now, ...old }
  const stateSince = patch.state !== undefined && patch.state !== base.state ? now : base.stateSince
  const next: SessionRecord = { ...base, ...patch, stateSince, lastEventAt: isEvent ? now : base.lastEventAt, updatedAt: now }
  mine.set(patch.sessionId, copyOf(next))
  const moved = old === undefined || BAND_FIELDS.some(f => JSON.stringify(old[f]) !== JSON.stringify(next[f]))
  const renamed = old !== undefined && NAME_FIELDS.some(f => old[f] !== next[f])
  await holdNote(io, key, next, kept === undefined || moved || renamed ? 'now' : isBeat || !onlyTimes(kept, next) ? 'soon' : 'ride')
  await noteRecord(io, next, moved, now)
  return next
}

// The band's redraw check reads one stamp and reads every record again only when it moved or after RECORDS_LIGHT_MS. A copy that old can only make a live session look older, never past DROP_MS, and the process check runs fresh.
const RECORDS_STAMP_KEY = 'cockpit:records:stamp'
const BAND_FIELDS = ['ask', 'pid', 'fiveHourPercent', 'fiveHourResetsAt', 'sevenDayPercent', 'sevenDayResetsAt'] as const
const RECORDS_LIGHT_MS = 120_000
let light: { stamp: unknown; at: number; records: SessionRecord[] } | undefined

async function noteRecord(io: Io, rec: SessionRecord, moved: boolean, now: number): Promise<void> {
  if (moved) {
    const stamp = `${now}:${rec.sessionId}`
    await io.set(RECORDS_STAMP_KEY, stamp)
    if (light !== undefined) light.stamp = stamp
  }
  if (light !== undefined) light.records = [rec, ...light.records.filter(r => r.sessionId !== rec.sessionId)].sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function listRecordsLight(io: Io): Promise<SessionRecord[]> {
  const now = await io.now()
  const stamp = await io.get(RECORDS_STAMP_KEY)
  if (light !== undefined && light.stamp === stamp && now - light.at >= 0 && now - light.at < RECORDS_LIGHT_MS) return light.records
  const records = await listRecords(io)
  light = { stamp, at: now, records }
  return records
}

export async function readRecord(io: Io, sessionId: string): Promise<SessionRecord | undefined> {
  const kept = mine.get(sessionId)
  if (kept !== undefined) return copyOf(kept)
  const v = await io.get(PREFIX + sessionId)
  return typeof v === 'object' && v !== null ? (v as SessionRecord) : undefined
}

// The store may hold it a few seconds older.
export async function listRecords(io: Io): Promise<SessionRecord[]> {
  const out: SessionRecord[] = []
  for (const key of (await io.keys()).filter(k => k.startsWith(PREFIX))) {
    const kept = mine.get(key.slice(PREFIX.length))
    if (kept !== undefined) {
      out.push(copyOf(kept))
      continue
    }
    const value = await io.get(key)
    if (typeof value === 'object' && value !== null) out.push(value as SessionRecord)
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function dropRecord(io: Io, sessionId: string): Promise<void> {
  mine.delete(sessionId)
  forgetNote(PREFIX + sessionId)
  await io.del(PREFIX + sessionId)
  const stamp = `${await io.now()}:-${sessionId}`
  await io.set(RECORDS_STAMP_KEY, stamp)
  if (light !== undefined) light = { ...light, stamp, records: light.records.filter(r => r.sessionId !== sessionId) }
}

// `alive` undefined means the check did not run: nobody is called dead.
export const isDead = (rec: Pick<SessionRecord, 'pid'>, alive: Set<number> | undefined): boolean => alive !== undefined && rec.pid !== undefined && !alive.has(rec.pid)

const CHECK_EVERY_MS = 15_000
let cache: { at: number; key: string; alive: Set<number> | undefined } | undefined

// Any failure answers undefined, so a broken check never kills a row.
export async function alivePids(io: Io, records: Pick<SessionRecord, 'pid'>[]): Promise<Set<number> | undefined> {
  const pids = [...new Set(records.map(r => r.pid).filter((p): p is number => p !== undefined && Number.isInteger(p) && p > 1))].sort((a, b) => a - b)
  if (pids.length === 0) return undefined
  const key = pids.join(',')
  const now = await io.now()
  if (cache !== undefined && cache.key === key && now - cache.at < CHECK_EVERY_MS) return cache.alive
  let alive: Set<number> | undefined
  try {
    const plat = await platformOfIo(io)
    const r = await io.run(alivePidsArgv(pids, plat), { timeoutMs: 3000 })
    // ps exits 1 when none of the pids exist: that is an answer.
    if (r.exitCode === 0 || r.exitCode === 1) alive = parseAlivePids(r.stdout, plat)
  } catch {
    alive = undefined
  }
  cache = { at: now, key, alive }
  return alive
}

export const label = (text: string, max = 60): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text)
