// PR and CI clock: one sentence about the branch's pull request from `gh`. The time left is a guess from earlier runs, never made up.
import { shorten } from './crew'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import { tEn } from '../i18n/t'

export const PR_EVERY_MS = 120_000
export const PR_IDLE_EVERY_MS = 600_000
export const MAIN_EVERY_MS = 300_000
export const GH_TIMEOUT_MS = 10_000

// Extra fields for the Pull requests card; `headRefOid` makes the typed merge merge only the checked commit.
export const PR_VIEW_ARGV = ['gh', 'pr', 'view', '--json', 'number,state,isDraft,statusCheckRollup,mergeable,url,mergeStateStatus,reviewDecision,headRefOid']
export const MAIN_ARGV = ['gh', 'run', 'list', '--branch', 'main', '--limit', '10', '--json', 'conclusion,workflowName']

const obj = (v: unknown): Record<string, unknown> | undefined => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined)

export function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// GitHub sends 0001-01-01 for an unset time.
function parseTime(v: unknown): number | undefined {
  if (typeof v !== 'string') return undefined
  const t = Date.parse(v)
  return Number.isFinite(t) && t >= Date.parse('2000-01-01T00:00:00Z') ? t : undefined
}

type CheckState = 'passed' | 'failed' | 'running' | 'queued' | 'skipped' | 'cancelled'
type CheckRow = { name: string; state: CheckState; startedAt?: number; completedAt?: number }

const FAIL = new Set(['FAILURE', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'STALE'])

export function parseChecks(raw: unknown): CheckRow[] {
  if (!Array.isArray(raw)) return []
  const out: CheckRow[] = []
  for (const item of raw) {
    const o = obj(item)
    if (o === undefined) continue
    const startedAt = parseTime(o.startedAt)
    const completedAt = parseTime(o.completedAt)
    const context = str(o.context)
    if (context !== undefined && o.status === undefined) {
      const s = String(o.state ?? '').toUpperCase()
      out.push({ name: shorten(context, 500), state: s === 'SUCCESS' ? 'passed' : s === 'FAILURE' || s === 'ERROR' ? 'failed' : s === 'EXPECTED' ? 'queued' : 'running', startedAt })
      continue
    }
    const name = str(o.name) ?? str(o.workflowName)
    if (name === undefined) continue
    const status = String(o.status ?? '').toUpperCase()
    const conclusion = String(o.conclusion ?? '').toUpperCase()
    let state: CheckState
    if (status === 'IN_PROGRESS') state = 'running'
    else if (status !== 'COMPLETED') state = 'queued'
    else if (conclusion === 'SUCCESS' || conclusion === 'NEUTRAL') state = 'passed'
    else if (conclusion === 'CANCELLED') state = 'cancelled'
    else if (FAIL.has(conclusion)) state = 'failed'
    else state = 'skipped'
    out.push({ name: shorten(name, 500), state, startedAt, completedAt })
  }
  return out
}

type PrView = { number: number; state: string; isDraft: boolean; mergeable: string; url: string; checks: CheckRow[]; mergeState?: string; review?: string; head?: string }

export function parsePrView(raw: unknown): PrView | undefined {
  const o = obj(raw)
  if (o === undefined || typeof o.number !== 'number') return undefined
  const mergeState = str(o.mergeStateStatus)?.toUpperCase()
  const review = str(o.reviewDecision)?.toUpperCase()
  const head = str(o.headRefOid)
  return { number: o.number, state: String(o.state ?? 'UNKNOWN').toUpperCase(), isDraft: o.isDraft === true, mergeable: String(o.mergeable ?? 'UNKNOWN').toUpperCase(), url: String(o.url ?? ''), checks: parseChecks(o.statusCheckRollup), ...(mergeState === undefined ? {} : { mergeState }), ...(review === undefined ? {} : { review }), ...(head === undefined ? {} : { head }) }
}

// `gh pr view` exits 1 when the branch has no pull request; that is an answer, not a failure.
export const isNoPr = (stderr: string): boolean => /no pull requests? found/i.test(stderr)


type Durations = Record<string, number>
export const DURATIONS_KEY = 'cockpit:pr:durations'
const KEEP_NAMES = 40

export function parseDurations(raw: unknown): Durations {
  const o = obj(raw)
  const out: Durations = {}
  for (const [k, v] of Object.entries(o ?? {})) if (typeof v === 'number' && v > 0) out[k] = v
  return out
}

const took = (c: CheckRow): number | undefined => {
  if (c.state !== 'passed' || c.startedAt === undefined || c.completedAt === undefined) return undefined
  const ms = c.completedAt - c.startedAt
  return ms > 0 && ms < 6 * 3_600_000 ? ms : undefined
}

export function learnDurations(old: Durations, checks: CheckRow[]): Durations {
  const next: Durations = { ...old }
  for (const c of checks) {
    const ms = took(c)
    if (ms === undefined) continue
    delete next[c.name]
    next[c.name] = ms
  }
  const names = Object.keys(next)
  for (const n of names.slice(0, Math.max(0, names.length - KEEP_NAMES))) delete next[n]
  return next
}

export function timeLeftMs(checks: CheckRow[], durations: Durations, now: number): number | undefined {
  const longestPassed = Math.max(0, ...checks.map(c => took(c) ?? 0))
  let left: number | undefined
  for (const c of checks) {
    if (c.state !== 'running' && c.state !== 'queued') continue
    const expected = durations[c.name] ?? (longestPassed > 0 ? longestPassed : undefined)
    if (expected === undefined) continue
    const spent = c.state === 'running' && c.startedAt !== undefined ? Math.max(0, now - c.startedAt) : 0
    left = Math.max(left ?? 0, Math.max(60_000, expected - spent))
  }
  return left
}

const minutesWords = (ms: number, tr: Tr = same): string => fillIn(tr('about {n} min'), { n: Math.max(1, Math.round(ms / 60_000)) })


// Every check counts, so "All 4 checks passed" never hides a fifth that is not green.
type Tally = { passed: number; failed: number; running: number; queued: number; skipped: number; cancelled: number; total: number }
export function tally(checks: CheckRow[]): Tally {
  const n = (s: CheckState) => checks.filter(c => c.state === s).length
  const passed = n('passed')
  const failed = n('failed')
  const running = n('running')
  const queued = n('queued')
  const skipped = n('skipped')
  const cancelled = n('cancelled')
  return { passed, failed, running, queued, skipped, cancelled, total: passed + failed + running + queued + skipped + cancelled }
}

export type Health = 'failing' | 'pending' | 'passing' | 'none'
export const healthOf = (t: Tally): Health => (t.total === 0 ? 'none' : t.failed > 0 ? 'failing' : t.running + t.queued > 0 ? 'pending' : 'passing')

const checksWords = (t: Tally, leftMs: number | undefined, tr: Tr): string => {
  if (t.total === 0) return tr('No checks have run yet.')
  if (t.passed === t.total) return t.total === 1 ? tr('The one check passed.') : fillIn(tr('All {n} checks passed.'), { n: t.total })
  if (t.failed + t.running + t.queued + t.cancelled === 0) return t.passed === 0 ? `${fillIn(tr('{n} skipped'), { n: t.skipped })}.` : `${fillIn(tr('{a} passed'), { a: t.passed })}, ${fillIn(tr('{n} skipped'), { n: t.skipped })}.`
  const parts = [fillIn(tr('{a} of {b} checks passed'), { a: t.passed, b: t.total })]
  if (t.failed > 0) parts.push(fillIn(tr('{n} failed'), { n: t.failed }))
  if (t.running > 0) parts.push(`${fillIn(tr('{n} running'), { n: t.running })}${leftMs === undefined ? '' : ` (${minutesWords(leftMs, tr)})`}`)
  if (t.queued > 0) parts.push(`${fillIn(tr('{n} waiting'), { n: t.queued })}${t.running === 0 && leftMs !== undefined ? ` (${minutesWords(leftMs, tr)})` : ''}`)
  if (t.cancelled > 0) parts.push(fillIn(tr('{n} cancelled'), { n: t.cancelled }))
  if (t.skipped > 0) parts.push(fillIn(tr('{n} skipped'), { n: t.skipped }))
  return `${parts.join(', ')}.`
}

const mergeWords = (v: PrView, tr: Tr): string => (v.mergeable === 'MERGEABLE' ? tr('Mergeable.') : v.mergeable === 'CONFLICTING' ? tr('It has a conflict with the base branch: it needs a rebase.') : '')

export function prWords(v: PrView, durations: Durations, now: number, tr: Tr = same): string {
  if (v.state === 'MERGED') return fillIn(tr('PR {n} is merged.'), { n: v.number })
  if (v.state === 'CLOSED') return fillIn(tr('PR {n} is closed.'), { n: v.number })
  const t = tally(v.checks)
  return [fillIn(tr(v.isDraft ? 'PR {n} is open (a draft).' : 'PR {n} is open.'), { n: v.number }), checksWords(t, timeLeftMs(v.checks, durations, now), tr), mergeWords(v, tr)].filter(x => x !== '').join(' ')
}

const failedNames = (v: PrView): string[] => v.checks.filter(c => c.state === 'failed').map(c => c.name)

// Green only when every workflow's newest run succeeded; anything unfinished leaves it unknown.
export function mainRedFrom(raw: unknown): boolean | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const newest = new Map<string, string>()
  for (const row of raw) {
    const name = str(obj(row)?.workflowName) ?? ''
    if (!newest.has(name)) newest.set(name, (str(obj(row)?.conclusion) ?? '').toLowerCase())
  }
  const all = [...newest.values()]
  if (all.some(c => c === 'failure' || c === 'timed_out' || c === 'startup_failure')) return true
  return all.every(c => c === 'success') ? false : undefined
}

export type PrFacts = { at: number; branch?: string; view?: PrView; none?: boolean; error?: string; mainRed?: boolean; mainAt?: number }


export const PUSH_WINDOW_MS = 30 * 60_000
export const isGitPush = (command: string): boolean => /(^|[;&|(\n]\s*)(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*git(?:\s+-[cC]\s+\S+|\s+--[a-z-]+(?:=\S+)?)*\s+push(?:\s|$)/.test(command)
type AskNeed = { now: number; pushedAt?: number; startDue: boolean; facts?: PrFacts }
export function whyAsk(n: AskNeed): 'start' | 'push' | 'pending' | undefined {
  if (n.startDue) return 'start'
  if (n.pushedAt !== undefined && n.now - n.pushedAt >= 0 && n.now - n.pushedAt < PUSH_WINDOW_MS) return 'push'
  const v = n.facts?.view
  const t = v === undefined ? undefined : tally(v.checks)
  return v !== undefined && t !== undefined && v.state === 'OPEN' && t.running + t.queued > 0 ? 'pending' : undefined
}

// One gh answer serves every session on the same repo and branch, so five sessions make one call.
export const PR_SHARED_KEY = 'cockpit:pr:shared'
const PR_SHARED_MAX = 20
const sharedId = (repo: string, branch: string | undefined): string => `${repo}\n${branch ?? ''}`
const isFacts = (v: unknown): v is PrFacts => typeof v === 'object' && v !== null && typeof (v as PrFacts).at === 'number'
const prPeriod = (f: PrFacts): number => ((f.view === undefined || f.view.state !== 'OPEN') && f.error === undefined ? PR_IDLE_EVERY_MS : PR_EVERY_MS)
export function sharedPr(raw: unknown, repo: string, branch: string | undefined, now: number, since = 0): PrFacts | undefined {
  const f = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>)[sharedId(repo, branch)] : undefined
  return isFacts(f) && now - f.at >= 0 && now - f.at < prPeriod(f) && f.at >= since ? f : undefined
}
export const PR_STALE_ASK_MS = 5 * 60_000
export function staleRunning(raw: unknown, repo: string, ownBranch: string | undefined, now: number, max = 2): string[] {
  const all = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? Object.entries(raw as Record<string, unknown>) : []
  return all
    .flatMap(([id, f]): { branch: string; at: number }[] => {
      const cutAt = id.indexOf('\n')
      if (!isFacts(f) || cutAt < 0 || id.slice(0, cutAt) !== repo) return []
      const branch = id.slice(cutAt + 1)
      const v = f.view
      const t = v === undefined ? undefined : tally(v.checks)
      const running = v !== undefined && t !== undefined && v.state === 'OPEN' && t.running + t.queued > 0
      return branch !== '' && branch !== ownBranch && running && now - f.at > PR_STALE_ASK_MS && now - f.at < PR_IDLE_EVERY_MS ? [{ branch, at: f.at }] : []
    })
    .sort((a, b) => a.at - b.at)
    .slice(0, max)
    .map(x => x.branch)
}
// After `--` a branch named like a flag is only a name.
export const prViewArgvFor = (branch: string): string[] => [...PR_VIEW_ARGV, '--', branch]

export function withSharedPr(raw: unknown, repo: string, branch: string | undefined, f: PrFacts, now: number): Record<string, PrFacts> {
  const old = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const keep = Object.entries(old).filter((e): e is [string, PrFacts] => isFacts(e[1]) && now - e[1].at >= 0 && now - e[1].at < PR_IDLE_EVERY_MS)
  const { at, view, none, error } = f
  const next = [[sharedId(repo, branch), { at, branch, ...(view === undefined ? {} : { view }), ...(none === undefined ? {} : { none }), ...(error === undefined ? {} : { error }) }] as [string, PrFacts], ...keep.filter(e => e[0] !== sharedId(repo, branch))]
  return Object.fromEntries(next.sort((a, b) => b[1].at - a[1].at).slice(0, PR_SHARED_MAX))
}

export function prText(mode: string, f: PrFacts | undefined, durations: Durations, now: number, canAsk: string | undefined): string {
  const out: string[] = []
  const ago = (t: number) => `${Math.max(0, Math.floor((now - t) / 60_000))} min ago`
  if (mode === 'off') out.push('PR and checks: off. Turn it on: Settings > Agents.')
  if (canAsk !== undefined) out.push(canAsk)
  else if (f === undefined) out.push('Not checked on GitHub yet. gh is asked about every 2 minutes.')
  else {
    if (f.view !== undefined) {
      out.push(prWords(f.view, durations, now))
      const bad = failedNames(f.view)
      if (bad.length > 0) out.push(`Failed: ${bad.slice(0, 5).join(', ')}${bad.length > 5 ? ` and ${bad.length - 5} more` : ''}.`)
      if (f.view.url !== '') out.push(f.view.url)
    } else if (f.none === true) out.push(`There is no pull request for ${f.branch ?? 'this branch'}.`)
    else out.push('gh did not answer, so there is nothing to show yet.')
    if (f.error !== undefined && f.view !== undefined) out.push(`The last ask failed (${f.error}). This is from ${ago(f.at)}.`)
    else if (f.error !== undefined) out.push(`The last ask failed: ${f.error}.`)
    if (f.mainRed === true) out.push('Main is red.')
    else if (f.mainRed === false) out.push('Main is green.')
    out.push(`Asked ${ago(f.at)}.`)
  }
  return out.join('\n')
}

export const bandChecks = (v: PrView): string => `PR ${v.number}: ${tEn('words.check', { n: tally(v.checks).failed })} failed`
export const MAIN_RED_TEXT = 'Main is red'
