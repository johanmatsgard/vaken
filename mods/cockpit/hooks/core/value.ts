// The value meter: what vaken did in the last week, read from the audit and the Autopilot ledger.
import { ANOMALY_WHAT, DRIFT_WHAT } from './proof2'
import { AWAKE_WHAT, PORT_WHAT } from './crew3'
import { BLOCK_WHAT, LOOP_WHAT, THRASH_WHAT } from './loopbreaker'
import { CAP_DEPTH_WHAT, CAP_HOLD_WHAT, CAP_SPEND_WHAT, CAP_WHAT } from './agentcap'
import { COACH_WHAT } from './coach'
import { COLLIDE_WHAT } from './crew'
import { DIET_WHAT } from './diet'
import { DIGEST_WHAT } from './away'
import { ENV_WHAT, FENCE_WHAT, HELD_WHAT as MIGRATION_HELD_WHAT, WARNED_WHAT as MIGRATION_WARNED_WHAT } from './guardback'
import { HELD_WHAT as GUARD_HELD_WHAT, WARNED_WHAT as GUARD_WARNED_WHAT } from './guard'
import { HELD_WHAT as BUDGET_HELD_WHAT, WARNED_WHAT as BUDGET_WARNED_WHAT } from './budget'
import { KEPT_WHAT } from './cachekeeper'
import { REMIND_WHAT, RESUME_WHAT as LIMIT_RESUME_WHAT } from './resume'
import { RULE_WHAT } from './rules'
import { BROKEN_WHAT, CHECKED_WHAT } from './stability'
import { UNPROVEN_WHAT } from './proof'
import { savings } from './ledger'
import type { Entry } from './ledger'
import type { AuditRow } from './insight'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { t as tNow, tLine, tr } from '../i18n/t'
import { fillIn } from './fillin'
import { pad2 } from './words'

export const VALUE_SETTINGS: Setting[] = [
  {
    key: 'value.weekly',
    group: 'Care',
    label: 'Weekly value line',
    note: 'Once a week, one line above the chat box on what vaken did.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]
export const VALUE_HELP: HelpEntry[] = [
  { title: 'This week in numbers: what vaken did', text: '/vaken-today value counts what vaken did for you in the last 7 days, in groups, and lists the blocks that did nothing. It counts what vaken wrote down. It does not measure money saved.' },
]

export type Done = { at: number; what: string }
// A compaction has no title in the audit, only in the ledger, so it gets this one.
export const COMPACTED_WHAT = 'Compacted a session'
export const DAY_MS = 24 * 3_600_000

// A compaction is never in the audit (no "did" mark), so nothing counts twice.
export function actionsBetween(audit: AuditRow[], ledger: Entry[], from: number, to: number): Done[] {
  const rows: Done[] = audit.filter(r => r.at >= from && r.at < to).map(r => ({ at: r.at, what: r.what }))
  for (const e of savings(ledger)) if (e.at >= from && e.at < to) rows.push({ at: e.at, what: COMPACTED_WHAT })
  return rows
}

// An estimate: the window size is what the app reported at that moment.
export function freedBetween(ledger: Entry[], from: number, to: number): { count: number; freed: number } {
  const list = savings(ledger).filter(e => e.at >= from && e.at < to)
  return { count: list.length, freed: list.reduce((n, e) => n + ((e.before ?? 0) - (e.after ?? 0)), 0) }
}

type BucketName = 'Saved usage' | 'Kept you safe' | 'Kept you informed' | 'Other'
const BUCKETS: { name: Exclude<BucketName, 'Other'>; words: string[] }[] = [
  // en-only: the words matched against stored English ledger titles
  { name: 'Saved usage', words: ['compacted', 'shortened', 'compact', 'cache', 'kept warm', 'routed', 'trimmed', 'cheaper'] },
  { name: 'Kept you safe', words: ['held', 'stopped', 'refused', 'caught', 'blocked', 'loop', 'circles', 'undo', 'restored', 'fence', 'halt', 'risky'] },
  { name: 'Kept you informed', words: ['digest', 'notice', 'recap', 'update', 'told', 'warned', 'flagged', 'found', 'offered', 'reminded'] },
]
const BUCKET_ORDER: BucketName[] = ['Saved usage', 'Kept you safe', 'Kept you informed', 'Other']

export function bucketOf(what: string): BucketName {
  const low = what.toLowerCase()
  return BUCKETS.find(b => b.words.some(w => low.includes(w)))?.name ?? 'Other'
}

type Group = { name: BucketName; n: number; top: { what: string; n: number }[] }

export function groupDone(rows: Done[]): Group[] {
  const out: Group[] = []
  for (const name of BUCKET_ORDER) {
    const mine = rows.filter(r => bucketOf(r.what) === name)
    if (mine.length === 0) continue
    const counts = new Map<string, number>()
    for (const r of mine) counts.set(r.what, (counts.get(r.what) ?? 0) + 1)
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([what, n]) => ({ what, n }))
    out.push({ name, n: mine.length, top })
  }
  return out
}

export const BLOCK_TITLES: Record<string, string[]> = {
  'cache.keeper': [KEPT_WHAT],
  'loop.breaker': [LOOP_WHAT, BLOCK_WHAT, THRASH_WHAT],
  'cap.mode': [CAP_WHAT, CAP_HOLD_WHAT, CAP_DEPTH_WHAT, CAP_SPEND_WHAT],
  'crew.collide': [COLLIDE_WHAT],
  'crew.ports': [PORT_WHAT],
  'awake.mode': [AWAKE_WHAT],
  'rules.mode': [RULE_WHAT],
  'diet.mode': [DIET_WHAT],
  'coach.mode': [COACH_WHAT],
  'away.digest': [DIGEST_WHAT],
  'resume.mode': [LIMIT_RESUME_WHAT, REMIND_WHAT],
  'proof.claims': [UNPROVEN_WHAT],
  'proof.drift': [DRIFT_WHAT],
  'proof.anomaly': [ANOMALY_WHAT],
  'stability.check': [CHECKED_WHAT, BROKEN_WHAT],
  'cost.budget': [BUDGET_WARNED_WHAT, BUDGET_HELD_WHAT],
  'guard.destructive': [GUARD_HELD_WHAT.destructive, GUARD_WARNED_WHAT.destructive],
  'guard.scope': [GUARD_HELD_WHAT.scope, GUARD_WARNED_WHAT.scope],
  'guard.packages': [GUARD_HELD_WHAT.packages, GUARD_WARNED_WHAT.packages],
  'guard.tests': [GUARD_HELD_WHAT.tests, GUARD_WARNED_WHAT.tests],
  'guard.migrations': [MIGRATION_HELD_WHAT, MIGRATION_WARNED_WHAT],
  'guard.env': [ENV_WHAT],
  'guard.fence': [FENCE_WHAT],
}

export function quietBlocks(rows: Done[], settings: Setting[], values: Record<string, string>): string[] {
  const fired = new Set(rows.map(r => r.what))
  const out: string[] = []
  for (const s of settings) {
    const titles = BLOCK_TITLES[s.key]
    if (titles === undefined) continue
    if ((values[s.key] ?? s.default) === 'off') continue
    if (titles.some(t => fired.has(t))) continue
    out.push(s.label)
  }
  return out
}

const k = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))
const QUIET_SHOWN = 8
// A full audit may have lost the start of the window.
const AUDIT_FULL = 500

type ValueFacts = {
  days: 1 | 7
  rows: Done[]
  freed: { count: number; freed: number }
  quiet: string[]
  cut: boolean
}

export const cutIn = (audit: AuditRow[], from: number): boolean => audit.length >= AUDIT_FULL && Math.min(...audit.map(r => r.at)) >= from

export function valueLines(f: ValueFacts): string[] {
  const span = f.days === 1 ? tr('1 day') : tr('7 days')
  const n = f.rows.length
  const lines: string[] = [n === 0 ? fillIn(tr('Vaken wrote nothing down in {span}.'), { span }) : fillIn(tr('Vaken did {things} for you in {span}.'), { things: tNow('words.thing', { n }), span })]
  for (const g of groupDone(f.rows)) lines.push(`${tr(g.name)}: ${g.n} (${g.top.map(t => `${tr(t.what)} ${t.n}`).join(', ')})`)
  if (f.freed.count > 0) lines.push(fillIn(tr('Tokens freed by compacting the session {times}: about {k} (estimate).'), { times: tNow('words.time', { n: f.freed.count }), k: k(f.freed.freed) }))
  if (f.quiet.length > 0) {
    const shown = f.quiet.slice(0, QUIET_SHOWN)
    const more = f.quiet.length - shown.length
    lines.push(fillIn(tr('Never fired in {span}. Did nothing (fine if you had no need): {list}{more}.'), { span, list: shown.map(x => tr(x)).join(', '), more: more > 0 ? ` ${fillIn(tr('and {n} more'), { n: more })}` : '' }))
  }
  lines.push(tr('This counts what vaken wrote down. It is not a measure of money saved.'))
  if (f.cut) lines.push(tr('The audit is full (500 actions), so the oldest ones in this time may be missing.'))
  lines.push(f.days === 1 ? tr('Keep what helps. Switch off the rest in Settings. /vaken-today value shows 7 days.') : tr('Keep what helps. Switch off the rest in Settings. /vaken-today value day shows 1 day.'))
  return lines.slice(0, 14)
}

export const daysOf = (args: string): 1 | 7 => (args.trim().toLowerCase() === 'day' ? 1 : 7)

export function weekStamp(now: number): string {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
export const WEEKLY_MIN = 5
export const WEEKLY_BAND_MS = 10 * 60_000
export const weeklyLine = (n: number): string => tLine('band.this_week_the_cockpit_did_n', { n })
