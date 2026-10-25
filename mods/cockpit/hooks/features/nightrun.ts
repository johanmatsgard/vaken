// The night run's side effects for the task runner (core/night.ts): strict checks on and back, the keep-awake claim and the power reading.
import type { Io } from '../core/io'
import { platformOfIo } from '../core/procs'
import { DROP_MS } from '../core/record'
import type { SessionRecord } from '../core/record'
import { AWAY_KEY, AWAY_POLICY_KEY } from '../core/guardworld'
import { settingStoreKey, writeSetting } from '../core/settings'
import { NIGHT_KEY, NIGHT_WHAT_ENDED, NIGHT_WHAT_STARTED, POWER_ARGV, POWER_EVERY_MS, WIN_POWER_ARGV, nightCap, nightMem, parseNightOn, powerOf, strictBackPlan, winPowerOf, strictOnPlan } from '../core/night'
import type { Power } from '../core/night'
import type { Run } from '../core/orchestra'
import { LEDGER_KEY, pushLog } from './compaction'

// One power call a minute at most: pmset on the Mac, one PowerShell battery read on Windows.
let power: { at: number; is: Power } | undefined
export const forgetPower = (): void => {
  power = undefined
}
export async function powerNow(i: Io, now: number): Promise<Power> {
  const onWin = (await platformOfIo(i)) === 'win32'
  if (power !== undefined && now >= power.at && now - power.at < POWER_EVERY_MS) return power.is
  let is: Power = 'unknown'
  try {
    const r = await i.run(onWin ? WIN_POWER_ARGV() : [...POWER_ARGV], { timeoutMs: onWin ? 8_000 : 3_000 })
    is = onWin ? winPowerOf(r.stdout) : powerOf(r.stdout)
  } catch {
    // no answer never stops a run
  }
  power = { at: now, is }
  return is
}

// Turns on away mode and its Careful policy, keeping what it changed.
export async function nightStart(i: Io, run: Run, now: number): Promise<Run> {
  const plan = strictOnPlan(await i.get(AWAY_KEY), await i.get(settingStoreKey(AWAY_POLICY_KEY)), now)
  if (plan.setPolicy) await writeSetting(i, AWAY_POLICY_KEY, 'careful')
  if (plan.setAway) await i.set(AWAY_KEY, { at: now })
  const sid = await i.sessionId()
  await awakeClaim(i, now)
  await pushLog(i, LEDGER_KEY, { at: now, session: sid, what: NIGHT_WHAT_STARTED, how: 'typed', did: true })
  i.invalidate()
  return { ...run, night: { at: now, usd: nightCap(run.choices), strict: plan.strict } }
}

// Undefined: the claim goes, so the keep-awake guard lets the Mac sleep.
export async function awakeClaim(i: Io, at: number | undefined): Promise<void> {
  const sid = await i.sessionId()
  if (at !== undefined) await i.set(NIGHT_KEY, { sid, at })
  else if (parseNightOn(await i.get(NIGHT_KEY))?.sid === sid) await i.del(NIGHT_KEY)
}

// A keep-awake claim older than this is ignored, so a lost claim cannot keep the Mac awake for days (a night run is one night).
export const NIGHT_CLAIM_MAX_MS = 12 * 60 * 60_000

// True while the night run's keep-awake claim holds: it is younger than NIGHT_CLAIM_MAX_MS and its session is live (its record beat within DROP_MS).
// A session that ended without clearing the claim, or crashed, lets the Mac sleep.
export function nightClaimLive(raw: unknown, records: readonly Pick<SessionRecord, 'sessionId' | 'updatedAt'>[], now: number): boolean {
  const claim = parseNightOn(raw)
  if (claim === undefined || now - claim.at < 0 || now - claim.at > NIGHT_CLAIM_MAX_MS) return false
  return records.some(r => r.sessionId === claim.sid && now - r.updatedAt >= 0 && now - r.updatedAt <= DROP_MS)
}

// True when no message from the person came since the night run began.
export const wasAway = (run: Run): boolean => run.night !== undefined && (nightMem.lastPrompt === undefined || nightMem.lastPrompt < run.night.at)

export async function nightEnd(i: Io, run: Run): Promise<Run> {
  if (run.night === undefined) return run
  const back = strictBackPlan(run.night.strict, await i.get(AWAY_KEY), await i.get(settingStoreKey(AWAY_POLICY_KEY)))
  if (back.delAway) await i.del(AWAY_KEY)
  if (back.policy !== undefined) {
    if (back.policy.to === null) await i.del(settingStoreKey(AWAY_POLICY_KEY))
    else await writeSetting(i, AWAY_POLICY_KEY, back.policy.to)
  }
  const sid = await i.sessionId()
  await awakeClaim(i, undefined)
  await pushLog(i, LEDGER_KEY, { at: await i.now(), session: sid, what: NIGHT_WHAT_ENDED, how: 'auto', did: true })
  const { night: _n, ...rest } = run
  i.invalidate()
  return rest
}
