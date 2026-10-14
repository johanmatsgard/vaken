// One leader for the shared account-wide scans (session list, plan usage, computer reading, inbox count), so sessions whose timers line up do not all run them at once. Never touches a safety guard.
import type { Io } from './io'
import { QUIET_EVERY_MS, isQuietAt } from './quiet'
import { alivePids, isDead, listRecordsLight, readRecord } from './record'

export const LEADER_KEY = 'cockpit:leader'
// One store write a minute over all sessions.
export const LEADER_RENEW_MS = 60_000
// Three renewals, so one late beat never hands it over.
export const LEADER_LEASE_MS = 3 * LEADER_RENEW_MS
export const LEADER_CHECK_MS = 30_000

// `quiet`: the leader's timers had slowed to once a minute, so a busy session takes over. `v`: schema number; a higher one takes the lease so old code cannot keep writing the old shape.
export const LEADER_SCHEMA = 2
export type Lease = { sid: string; pid?: number; until: number; quiet: boolean; v?: number }

export function parseLease(raw: unknown): Lease | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Record<string, unknown>
  if (typeof r.sid !== 'string' || r.sid === '' || typeof r.until !== 'number' || !Number.isFinite(r.until)) return undefined
  return { sid: r.sid, until: r.until, quiet: r.quiet === true, ...(typeof r.pid === 'number' && Number.isInteger(r.pid) ? { pid: r.pid } : {}), ...(typeof r.v === 'number' && Number.isFinite(r.v) ? { v: r.v } : {}) }
}

export type Verdict = 'take' | 'renew' | 'lead' | 'follow'
export function leaseVerdict(lease: Lease | undefined, me: { sid: string; quiet: boolean; v?: number }, now: number, gone: boolean): Verdict {
  if (lease === undefined || gone || now >= lease.until) return 'take'
  if (lease.sid === me.sid) return now >= lease.until - LEADER_LEASE_MS + LEADER_RENEW_MS || lease.quiet !== me.quiet ? 'renew' : 'lead'
  if (lease.quiet && !me.quiet) return 'take'
  if ((me.v ?? 0) > (lease.v ?? 0)) return 'take'
  return 'follow'
}

// A quiet leader looks once a minute, so its period is at least that.
export function scanDue(at: number | undefined, periodMs: number, now: number, isLeader: boolean, leaderQuiet: boolean): boolean {
  if (at === undefined || now - at < 0) return true
  const period = leaderQuiet ? Math.max(periodMs, QUIET_EVERY_MS) : periodMs
  return isLeader || now - at >= 2 * period
}

let known: { at: number; lease: Lease | undefined; leads: boolean } | undefined
export const forgetLeader = (): void => {
  known = undefined
  looking = undefined
}

// A records copy can be two minutes old, so its times are not used; the lease's own end says when a silent holder stops counting.
async function holderGone(i: Io, lease: Lease): Promise<boolean> {
  const records = await listRecordsLight(i)
  const rec = records.find(r => r.sessionId === lease.sid)
  if (rec === undefined) return true
  return isDead(rec, await alivePids(i, records))
}

// Two scans in the same moment share one look.
let looking: Promise<boolean> | undefined

// A lease that cannot be read or written answers yes, so the scans still run. Never throws.
export async function leads(i: Io): Promise<boolean> {
  let now = 0
  try {
    now = await i.now()
    if (known !== undefined && now - known.at >= 0 && now - known.at < LEADER_CHECK_MS) return known.leads
  } catch {
    return true
  }
  looking ??= look(i, now).finally(() => {
    looking = undefined
  })
  return looking
}

async function look(i: Io, now: number): Promise<boolean> {
  try {
    const sid = await i.sessionId()
    const quiet = isQuietAt(now)
    let lease = parseLease(await i.get(LEADER_KEY))
    const gone = lease !== undefined && lease.sid !== sid && now < lease.until ? await holderGone(i, lease) : false
    const verdict = leaseVerdict(lease, { sid, quiet, v: LEADER_SCHEMA }, now, gone)
    if (verdict === 'take' || verdict === 'renew') {
      const pid = (await readRecord(i, sid))?.pid
      lease = { sid, until: now + LEADER_LEASE_MS, quiet, v: LEADER_SCHEMA, ...(pid === undefined ? {} : { pid }) }
      await i.set(LEADER_KEY, lease)
    }
    known = { at: now, lease, leads: lease?.sid === sid }
    return known.leads
  } catch {
    known = { at: now, lease: undefined, leads: true }
    return true
  }
}

export async function mayScan(i: Io, at: number | undefined, periodMs: number): Promise<boolean> {
  try {
    const now = await i.now()
    if (at === undefined || now - at < 0) return true
    const isLeader = await leads(i)
    return scanDue(at, periodMs, now, isLeader, !isLeader && known?.lease?.quiet === true)
  } catch {
    return true
  }
}

export async function releaseLease(i: Io): Promise<void> {
  try {
    const sid = await i.sessionId()
    if (parseLease(await i.get(LEADER_KEY))?.sid === sid) await i.del(LEADER_KEY)
  } catch {
  }
  known = undefined
}

export const leaderNow = (): { sid: string; quiet: boolean } | undefined => (known?.lease === undefined ? undefined : { sid: known.lease.sid, quiet: known.lease.quiet })
