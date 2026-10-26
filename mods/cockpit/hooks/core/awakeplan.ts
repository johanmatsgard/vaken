// Awake guard reasons: the one place that says which reasons keep the machine awake, for how long. Pure.
import { batteryLow } from './crewlaptop'
import type { Laptop } from './crewlaptop'
import { ROOM_FRESH_MS } from './computer'
import { AWAKE_CAP_WHAT } from './crew3'
import type { SessionRecord } from './record'
import { AWAKE_WIN_STRINGS, WIN_KEEPING, WIN_LID_NOTE } from './awakewords'
import type { AwakeSystem } from './awakewords'
import { STALE_MS } from './record'

export const AWAKE_WAIT_MAX_MS = 2 * 3_600_000
export const AWAKE_AWAY_MAX_MS = 4 * 3_600_000
// No chain of holds lasts longer than this.
export const AWAKE_ABS_MAX_MS = 8 * 3_600_000
const AWAKE_RENEW_MS = 8 * 60_000

export const AWAKE_PHONE_KEY = 'cockpit:awake:phone'
export const AWAKE_SINCE_KEY = 'cockpit:awake:since'
export const AWAKE_ASKED_KEY = 'cockpit:awake:asked'

export { AWAKE_CAP_WHAT }
export const AWAKE_CAP_DETAIL = 'The Mac was kept awake for 8 hours, which is the most vaken allows. It lets the Mac sleep now.'

export type AwakeAway = 'off' | 'waiting' | 'phone'
export const awayOf = (value: string): AwakeAway => (value === 'off' || value === 'waiting' ? value : 'phone')

export type Reason = 'working' | 'night' | 'phone' | 'waiting' | 'background'
export const REASONS: Record<Reason, { rank: number; on: readonly AwakeAway[]; why: string; whyUntil: string }> = {
  working: { rank: 0, on: ['off', 'waiting', 'phone'], why: 'a session is working', whyUntil: 'a session is working' },
  phone: { rank: 1, on: ['waiting', 'phone'], why: 'a phone is connected', whyUntil: 'a phone is connected, until {time}' },
  waiting: { rank: 2, on: ['waiting'], why: 'waiting for your answer', whyUntil: 'waiting for your answer, until {time}' },
  background: { rank: 3, on: ['waiting', 'phone'], why: 'an agent is running in the background', whyUntil: 'an agent is running in the background' },
  night: { rank: 4, on: ['off', 'waiting', 'phone'], why: 'a night run is going', whyUntil: 'a night run is going' },
}

// A phone that never says it left expires after AWAKE_AWAY_MAX_MS.
export type Phones = Record<string, number>
export function parsePhones(raw: unknown): Phones {
  if (typeof raw === 'number') return { old: raw }
  if (typeof raw !== 'object' || raw === null) return {}
  const out: Phones = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  return out
}
const phoneId = (sid: string, clientId: string): string => `${sid}:${clientId}`
export function phonesJoined(raw: unknown, sid: string, clientId: string, now: number): Phones {
  const out: Phones = {}
  for (const [k, v] of Object.entries(parsePhones(raw))) if (now - v < AWAKE_AWAY_MAX_MS) out[k] = v
  out[phoneId(sid, clientId)] = now
  return out
}
export function phonesLeft(raw: unknown, sid: string, clientId: string): Phones {
  const out = parsePhones(raw)
  delete out[phoneId(sid, clientId)]
  return out
}
export const latestPhone = (raw: unknown): number | undefined => {
  const t = Object.values(parsePhones(raw))
  return t.length === 0 ? undefined : Math.max(...t)
}

export type AwakeFacts = {
  working: number
  phoneAt?: number
  waiting: { count: number; latestSince?: number }
  background: number
  night?: boolean
  laptop?: Laptop
}

export function waitingFrom(records: Pick<SessionRecord, 'ask' | 'updatedAt'>[], now: number): AwakeFacts['waiting'] {
  let count = 0
  let latestSince: number | undefined
  for (const r of records) {
    if (r.ask === undefined || now - r.updatedAt > STALE_MS || now - r.ask.since > AWAKE_WAIT_MAX_MS) continue
    count++
    if (latestSince === undefined || r.ask.since > latestSince) latestSince = r.ask.since
  }
  return latestSince === undefined ? { count } : { count, latestSince }
}

export type Held = { reason: Reason; until?: number }
export type AwakeNow = { held?: Held; lowBattery: boolean; capped: boolean }

export const lowBatteryNow = (l: Laptop | undefined, now: number): boolean => l !== undefined && typeof l.at === 'number' && now - l.at <= ROOM_FRESH_MS && batteryLow(l)

export function awakeReason(away: AwakeAway, f: AwakeFacts, now: number): Held | undefined {
  const holds = (r: Reason): boolean => REASONS[r].on.includes(away)
  if (f.working > 0 && holds('working')) return { reason: 'working' }
  if (f.night === true && holds('night')) return { reason: 'night' }
  if (f.phoneAt !== undefined && now - f.phoneAt >= 0 && now - f.phoneAt < AWAKE_AWAY_MAX_MS && holds('phone')) return { reason: 'phone', until: f.phoneAt + AWAKE_AWAY_MAX_MS }
  if (f.waiting.count > 0 && f.waiting.latestSince !== undefined && f.waiting.latestSince + AWAKE_WAIT_MAX_MS > now && holds('waiting')) return { reason: 'waiting', until: f.waiting.latestSince + AWAKE_WAIT_MAX_MS }
  if (f.background > 0 && holds('background')) return { reason: 'background' }
  return undefined
}

// A gap longer than one hold starts a new chain, so the cap never counts time the guard was not there.
export type Chain = { since: number; last: number; capped?: boolean }
export const AWAKE_CHAIN_GAP_MS = 11 * 60_000
export function parseChain(raw: unknown): Chain | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const o = raw as Record<string, unknown>
  if (typeof o.since !== 'number' || typeof o.last !== 'number') return undefined
  return { since: o.since, last: o.last, ...(o.capped === true ? { capped: true } : {}) }
}
const continuous = (c: Chain | undefined, now: number): c is Chain => c !== undefined && now - c.last >= 0 && now - c.last <= AWAKE_CHAIN_GAP_MS && now - c.since >= 0

export function awakeNow(mode: string, away: AwakeAway, f: AwakeFacts, chain: Chain | undefined, now: number): AwakeNow {
  if (mode !== 'on') return { lowBattery: false, capped: false }
  const held = awakeReason(away, f, now)
  const lowBattery = held !== undefined && lowBatteryNow(f.laptop, now)
  const capped = held !== undefined && continuous(chain, now) && (chain.capped === true || now - chain.since >= AWAKE_ABS_MAX_MS)
  return { ...(held === undefined ? {} : { held }), lowBattery, capped }
}

export const chainAfterStart = (chain: Chain | undefined, now: number): Chain => ({ since: continuous(chain, now) ? chain.since : now, last: now })
export const chainCapped = (chain: Chain, now: number): Chain => ({ since: chain.since, last: now, capped: true })
export const touchDue = (chain: Chain | undefined, now: number): boolean => chain !== undefined && chain.capped === true && now - chain.last >= AWAKE_RENEW_MS

// Kept in memory so a draw does no store read.
let shown: AwakeNow | undefined
let shownSys: AwakeSystem = 'posix'
export const setAwakeShown = (a: AwakeNow | undefined, sys?: AwakeSystem): void => {
  shown = a
  if (sys !== undefined) shownSys = sys
}
export const awakeShown = (): AwakeNow | undefined => shown

export const wantOf = (a: AwakeNow): number => (a.held !== undefined && !a.lowBattery && !a.capped ? 1 : 0)

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n))
export const clockWord = (t: number): string => {
  const d = new Date(t)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function whyLine(a: AwakeNow, t: (s: string) => string = s => s, sys: AwakeSystem = 'posix'): string | undefined {
  if (a.held === undefined) return undefined
  if (a.lowBattery) return t('Not holding: battery low')
  if (a.capped) return t('Not holding: the 8 hour limit is reached')
  const row = REASONS[a.held.reason]
  const text = a.held.until === undefined ? t(row.why) : t(row.whyUntil).replace('{time}', clockWord(a.held.until))
  return `${t(sys === 'win32' ? WIN_KEEPING : 'Keeping the Mac awake')}: ${text}`
}

export const LID_NOTE = 'Closing the lid still sleeps the Mac (unless it is on power with a display).'

export function awakeCardLines(t: (s: string) => string): string[] {
  const why = shown === undefined ? undefined : whyLine(shown, t, shownSys)
  return why === undefined ? [] : [why, t(shownSys === 'win32' ? WIN_LID_NOTE : LID_NOTE)]
}

export const ASK_LINE = 'Keep the Mac awake while you are away? Reply /vaken-help run awake on'
export const askDue = (mode: string, asked: unknown): boolean => mode !== 'on' && asked === undefined

export type AwakeAsk = 'on' | 'off' | 'status'
export const parseAwakeArgs = (args: string): AwakeAsk => {
  const a = args.trim().toLowerCase()
  return a === 'on' ? 'on' : a === 'off' ? 'off' : 'status'
}

export const AWAKE_STRINGS: string[] = [
  'a session is working',
  'a phone is connected',
  'a phone is connected, until {time}',
  'waiting for your answer',
  'waiting for your answer, until {time}',
  'an agent is running in the background',
  'a night run is going',
  'Not holding: battery low',
  'Not holding: the 8 hour limit is reached',
  'Keeping the Mac awake',
  LID_NOTE,
  ASK_LINE,
  'Awake when away',
  'Waiting 2h',
  'Phone only',
  AWAKE_CAP_WHAT,
  AWAKE_CAP_DETAIL,
  ...AWAKE_WIN_STRINGS,
]

