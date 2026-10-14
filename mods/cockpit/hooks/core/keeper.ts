// Keeps the one shared store small: a write past 4 MiB fails and every write rewrites the whole file. Sweeps per-session notes at session end, daily, and at once when a write fails.

import { tr } from './lang'
import { ymd } from './time'

export const DAY_KEY = 'cockpit:keeper:day'
// Lets a note kept after the end know its age.
export const ENDED_KEY = 'cockpit:keeper:ended'
const ENDED_MAX = 300
export const DAY_MS = 86_400_000
// A crash leaves a record behind, so a stale one counts as gone.
export const GONE_MS = 7 * DAY_MS
const DAY_STAMP_DAYS = 14
const EYES_DAYS = 7

export const END_FAMILIES: readonly string[] = [
  'cockpit:assume:last:',
  'cockpit:band:',
  'cockpit:compactdiff:',
  'cockpit:compact:rest:',
  'cockpit:claims:',
  'cockpit:error:',
  'cockpit:fresh:',
  'cockpit:halt:',
  'cockpit:guard:allow:',
  'cockpit:guard:held:',
  'cockpit:guard:scope:',
  'cockpit:guard:pkg:',
  'cockpit:guard:envnoted:',
  'cockpit:guard:fence:',
  'cockpit:guard:commands:',
  'cockpit:outbox:',
  'cockpit:steer:queue:',
  'cockpit:neighbors:at:',
  'cockpit:planfirst:',
  'cockpit:promptcheck:last:',
  'cockpit:resume:',
  'cockpit:rules:',
  'cockpit:pr:state:',
  'cockpit:outcomes:last:',
  'cockpit:happened:',
  'cockpit:agents:',
  'cockpit:projectof:',
  'cockpit:undo:pending:',
  'cockpit:undo:mark:',
  'cockpit:failed:',
  'cockpit:watch:',
]

// Still useful after the session ended: kept this many days, then swept.
export const KEPT_FAMILIES: Readonly<Record<string, number>> = {
  'cockpit:proof:': 1,
  'cockpit:proof2:': 1,
  'cockpit:undo:index:': 7,
  'cockpit:undo:named:': 7,
  'cockpit:orch:': 7,
  'cockpit:sessset:': 7,
  // A weekend long.
  'cockpit:openends:': 3,
}

// Written by the first version of vaken; nothing reads them now.
const LEGACY_PREFIXES: readonly string[] = [
  'cockpit:spend:',
  'cockpit:spendhide:',
  'cockpit:shots:',
  'cockpit:ctx:',
  'cockpit:ctxmap:',
  'cockpit:collide:',
  'cockpit:plain:',
  'cockpit:diet:results:',
  'cockpit:diet:reads:',
  'cockpit:diet:fail:',
  'cockpit:diet:saved:',
  'cockpit:fleet:',
  'cockpit:ev:',
  'cockpit:safety:',
  'cockpit:gate:',
  'cockpit:claim:',
  'cockpit:held:',
  'cockpit:home:',
  'cockpit:homehide:',
  'cockpit:room:',
  'cockpit:flag:',
  'cockpit:backend:',
  'cockpit:bridge:',
  'cockpit:lock:',
  'cockpit:design:',
  'cockpit:devserver:',
  'cockpit:frontend:',
  'cockpit:viewports:',
  'cockpit:pr:current',
  'cockpit:pr:default',
  'cockpit:pr:history',
  'cockpit:pr:list',
  'cockpit:pr:watch',
  'cockpit:route:auto',
  'cockpit:route:keywords',
  'cockpit:route:log',
  'cockpit:route:presets',
  'cockpit:trust:counts',
  'cockpit:trust:declared',
  'cockpit:awake:lastwork',
  'cockpit:awake:mode',
  'cockpit:laptop:level',
  'cockpit:health:tiles',
  'cockpit:decided:',
  'cockpit:scope:',
  'cockpit:model-spend:',
]
const LEGACY_KEYS: readonly string[] = ['cockpit:laptop', 'cockpit:policy']

const SID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const SESSION_PREFIX = 'cockpit:session:'
const EYES_PREFIX = 'cockpit:eyes:last:'
const PROTECTED = ['cockpit:setting:', 'cockpit:settings:', 'cockpit:pref:', 'cockpit:prefs:', 'cockpit:records:', 'cockpit:projset:', 'cockpit:layouts', 'cockpit:ledger:', 'cockpit:audit', 'cockpit:counts', 'cockpit:keeper:']

export function familyOf(key: string): { family: string; sid: string } | undefined {
  const cut = key.lastIndexOf(':') + 1
  const sid = key.slice(cut)
  if (!SID.test(sid)) return undefined
  const family = key.slice(0, cut)
  return END_FAMILIES.includes(family) || KEPT_FAMILIES[family] !== undefined ? { family, sid } : undefined
}

export const endKeys = (keys: readonly string[], sid: string): string[] => keys.filter(k => END_FAMILIES.some(f => k === f + sid))

export const isLegacy = (key: string): boolean => LEGACY_KEYS.includes(key) || LEGACY_PREFIXES.some(p => key.startsWith(p))

export function stampOf(key: string): number | undefined {
  const iso = /:(\d{4})-(\d{2})-(\d{2})(?::|$)/.exec(key)
  if (iso !== null) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime()
  const ms = /^cockpit:resume:count:(\d{12,14})$/.exec(key)
  return ms === null ? undefined : Number(ms[1])
}

type Ended = Record<string, number>
export function parseEnded(raw: unknown): Ended {
  const out: Ended = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [sid, at] of Object.entries(raw as Record<string, unknown>)) if (typeof at === 'number' && Number.isFinite(at)) out[sid.slice(0, 64)] = at
  return out
}
export function withEnded(old: Ended, sid: string, now: number): Ended {
  const keep = Math.max(...Object.values(KEPT_FAMILIES)) * DAY_MS
  const all = Object.entries({ ...old, [sid]: now }).filter(([, at]) => now - at <= keep)
  return Object.fromEntries(all.sort((a, b) => b[1] - a[1]).slice(0, ENDED_MAX))
}

export type SweepFacts = {
  now: number
  live: ReadonlySet<string>
  ended: Ended
  eyesAt: ReadonlyMap<string, number | undefined>
  records: ReadonlyMap<string, number>
  // Full: the store is full, so a kept note goes at once.
  full?: boolean
}

type Sweep = { remove: string[]; ended: Ended }

// A session gone without an end gets 'now' as its end.
export function planSweep(keys: readonly string[], f: SweepFacts): Sweep {
  const remove: string[] = []
  const ended: Ended = { ...f.ended }
  for (const key of keys) {
    if (PROTECTED.some(p => key.startsWith(p))) continue
    if (isLegacy(key)) {
      remove.push(key)
      continue
    }
    if (key.startsWith(SESSION_PREFIX)) {
      const sid = key.slice(SESSION_PREFIX.length)
      const at = f.records.get(sid)
      if (!f.live.has(sid) && at !== undefined && f.now - at > GONE_MS) remove.push(key)
      continue
    }
    if (key.startsWith(EYES_PREFIX)) {
      const at = f.eyesAt.get(key)
      if (at === undefined || f.now - at > EYES_DAYS * DAY_MS) remove.push(key)
      continue
    }
    const stamp = stampOf(key)
    if (stamp !== undefined) {
      if (f.now - stamp > DAY_STAMP_DAYS * DAY_MS) remove.push(key)
      continue
    }
    const fam = familyOf(key)
    if (fam === undefined || f.live.has(fam.sid)) continue
    const days = KEPT_FAMILIES[fam.family]
    if (days === undefined || f.full === true) {
      remove.push(key)
      continue
    }
    const end = ended[fam.sid]
    if (end === undefined) ended[fam.sid] = f.now
    else if (f.now - end > days * DAY_MS) remove.push(key)
  }
  return { remove, ended }
}

export const localDay = ymd

export const fullToast = (n: number): string => tr("Vaken's saved data was full. It removed {n} old {notes} to make room.").replace('{n}', String(n)).replace('{notes}', n === 1 ? tr('note') : tr('notes'))
