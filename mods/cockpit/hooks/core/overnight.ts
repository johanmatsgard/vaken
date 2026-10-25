// Overnight: waits out a plan limit, resumes after the reset, and leaves a report of the run. Counts, names, states, times and costs only.
import type { AppUsage } from './appusage'
import { aboutMoney, money } from './prices'
import type { Run, Task } from './orchestra'
import { hideSecrets } from './guardcmds'
import { hhmm } from './time'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import { fmt } from './fmt'
import { langNow, t as tCount, tr as trNow } from '../i18n/t'

// A StopFailure with `rate_limit`, written by any session.
export const LIMIT_HIT_KEY = 'cockpit:limit:hit'
export const LIMIT_SIGNAL_MS = 10 * 60_000
// Only a usage card read in the last 10 minutes is believed.
export const FULL_PCT = 99
export const USAGE_FRESH_MS = 10 * 60_000
// At the reset a window may still read full for a minute or two.
export const MAX_REPLANS = 3

type LimitHit = { at: number }
export const parseLimitHit = (raw: unknown): LimitHit | undefined => {
  const o = raw as LimitHit
  return typeof o === 'object' && o !== null && typeof o.at === 'number' ? o : undefined
}

export function atLimit(usage: AppUsage | undefined, now: number): boolean {
  if (usage === undefined || now - usage.at > USAGE_FRESH_MS) return false
  return usage.windows.some(w => w.percent >= FULL_PCT)
}

export const limitStopped = (hit: LimitHit | undefined, usage: AppUsage | undefined, now: number): boolean => (hit !== undefined && now - hit.at < LIMIT_SIGNAL_MS) || atLimit(usage, now)


export const LIMIT_PAUSE_WHAT = 'Paused a task run for the plan limit'
export const LIMIT_GO_WHAT = 'Went on with a task run after a limit reset'

// No try is counted: the work never ran to its end. `since`: tasks that ended from then on count as stopped by the limit.
export function pauseForLimit(run: Run, since: number, resumeAt: number): Run {
  const tasks = run.tasks.map((t): Task => {
    if (t.state !== 'failed' || (t.endedAt ?? 0) < since) return t
    const { agentId: _a, endedAt: _e, startedAt: _s, askedAt: _k, holdUntil: _h, ...rest } = t
    return { ...rest, state: 'waiting', why: 'waits: the plan limit stopped it' }
  })
  return { ...run, tasks, status: 'paused', resumeAt, replans: 0 }
}

type GoOn = { act: 'wait' } | { act: 'go' } | { act: 'again'; at: number } | { act: 'give-up' }
export function goOnVerdict(run: Run, now: number, usage: AppUsage | undefined, nextAt: number): GoOn {
  if (run.status !== 'paused' || run.resumeAt === undefined || now < run.resumeAt) return { act: 'wait' }
  if (!atLimit(usage, now)) return { act: 'go' }
  return (run.replans ?? 0) >= MAX_REPLANS ? { act: 'give-up' } : { act: 'again', at: nextAt }
}

export const pausedBandWords = (run: Run): string => `Task run waits for the plan limit: it goes on at ${hhmm(run.resumeAt ?? 0)}`
export const goneOnWords = 'Task run goes on: the plan limit has reset'
export const gaveUpWords = 'Task run stays paused: the plan limit did not reset. Go on by hand.'


export const HISTORY_KEY = 'cockpit:orch:history'
export const REPORT_KEY = 'cockpit:orch:report'
const HISTORY_MAX = 10

export type TaskLine = { n: number; text: string; state: Task['state']; check: Task['check']; usd?: number; why?: string; kept?: Task['kept'] }
export type RunReport = { id: string; name: string; startedAt?: number; endedAt: number; status: 'done' | 'stopped'; done: number; failed: number; other: number; usd: number; tasks: TaskLine[]; night?: { away: boolean } }

const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export function reportOf(run: Run, now: number): RunReport {
  const usd = run.tasks.reduce((s, t) => s + (t.usd ?? 0), 0)
  const done = run.tasks.filter(t => t.state === 'done' && t.check !== 'failed' && t.check !== 'pending' && t.check !== 'running' && t.review !== 'pending' && t.review !== 'running').length
  const failed = run.tasks.filter(t => t.state === 'failed' || t.check === 'failed').length
  return {
    id: run.id,
    name: hideSecrets(run.name),
    ...(run.startedAt === undefined ? {} : { startedAt: run.startedAt }),
    endedAt: now,
    status: run.status === 'stopped' ? 'stopped' : 'done',
    done,
    failed,
    other: run.tasks.length - done - failed,
    usd,
    tasks: run.tasks.map(t => ({ n: t.n, text: cut(hideSecrets(t.text), 80), state: t.state, check: t.check, ...(t.usd === undefined ? {} : { usd: t.usd }), ...(t.why === undefined ? {} : { why: cut(hideSecrets(t.why), 80) }), ...(t.kept === undefined ? {} : { kept: t.kept }) })),
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
export function parseReports(raw: unknown): RunReport[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is RunReport => typeof r === 'object' && r !== null && typeof (r as RunReport).id === 'string' && isNum((r as RunReport).endedAt) && Array.isArray((r as RunReport).tasks))
    .slice(0, HISTORY_MAX)
}
// Its lines hold task text and a check's last line.
export const REPORT_DAYS = 14
export const freshReports = (list: RunReport[], now: number): RunReport[] => list.filter(r => now - r.endedAt < REPORT_DAYS * 86_400_000)
export const pushReport = (list: RunReport[], r: RunReport): RunReport[] => [r, ...list.filter(x => x.id !== r.id)].slice(0, HISTORY_MAX)

// `T` is the text table's own lookup for the counted parts ("1 done", Swedish "1 klar", "3 klara"); without it the English comes back. `lead` false leaves out an "All 3 done" the row's word Done already says.
// A stopped task is counted as stopped, the rest that never ended as not run. On the pane each part keeps its spaces whole, so a line never breaks inside "1 done".
const whole = (s: string): string => s.replace(/ /g, '\u00a0')
export function reportHead(r: RunReport, t: Tr = same, lead = true): string {
  const plain = t === same
  const counted = (name: string, one: string, other: string, n: number): string => (plain ? (n === 1 ? one : fillIn(other, { n })) : tCount(name, { n }))
  const keep = plain ? (s: string): string => s : whole
  const all = r.failed === 0 && r.other === 0
  const done = counted('truth.run_n_done', '1 done', '{n} done', r.done)
  const cost = r.usd > 0 ? aboutMoney(r.usd, t) : ''
  if (all && !lead) return keep(cost === '' ? done : cost)
  const stopped = Math.min(r.other, r.tasks.filter(x => x.state === 'stopped').length)
  const parts = [
    all ? fillIn(t('All {n} done'), { n: r.done }) : done,
    ...(r.failed > 0 ? [fillIn(t('{n} failed'), { n: r.failed })] : []),
    ...(stopped > 0 ? [counted('truth.run_n_stopped', '1 stopped', '{n} stopped', stopped)] : []),
    ...(r.other > stopped ? [counted('truth.run_n_not_run', '1 not run', '{n} not run', r.other - stopped)] : []),
  ].map(keep)
  return `${parts.join(', ')}${cost === '' ? '' : ` · ${keep(cost)}`}`
}
// When it ended, with no word: a past run's row says Done or Stopped on its left already ("13:55", "9 Oct, 13:55").
export function reportAt(r: RunReport, now: number, t: Tr = same): string {
  const d = new Date(r.endedAt)
  const today = new Date(now).toDateString() === d.toDateString()
  return `${today ? '' : `${d.getDate()} ${t(fmt.month(d.getMonth()))}, `}${hhmm(r.endedAt)}`
}
export function reportWhen(r: RunReport, now: number, t: Tr = same): string {
  return `${t(r.status === 'stopped' ? 'Stopped' : 'Ended')} ${reportAt(r, now, t)}`
}
const STATE_WORD: Record<TaskLine['state'], string> = { waiting: 'not run', running: 'still running', done: 'done', failed: 'failed', stopped: 'stopped', skipped: 'skipped' }
// `map` passes the index as a second argument, and only a function is a translator.
export const taskLineWord = (l: TaskLine, tr: Tr = same): string => (typeof tr === 'function' ? tr : same)(l.state === 'done' && l.check === 'failed' ? 'check failed' : l.state === 'done' && l.check === 'passed' ? 'checked' : STATE_WORD[l.state])
export function taskLineFacts(l: TaskLine, t: Tr = same): string[] {
  return [
    fillIn(t('Task: {text}'), { text: l.text }),
    fillIn(t('Result: {word}.'), { word: `${taskLineWord(l, t)}${l.why === undefined ? '' : ` (${t(l.why)})`}` }),
    ...(l.usd === undefined ? [] : [fillIn(t('Cost: about {usd}.'), { usd: money(l.usd) })]),
    ...(l.kept === 'kept' ? [t('Its branch is kept for your review.')] : l.kept === 'thrown' ? [t('Its folder copy was thrown away.')] : []),
  ]
}

// The text table's own lookup for the words of a run; English keeps its plain words
const sayNow = (): Tr => (langNow() === 'en' ? same : trNow)

export function reportText(r: RunReport | undefined, now: number): string {
  if (r === undefined) return trNow('No task run has ended yet.')
  const say = sayNow()
  return [`${r.name}: ${reportWhen(r, now, say)}. ${reportHead(r, say)}.`, ...r.tasks.map(t => `${t.n}. ${t.text}: ${taskLineWord(t, say)}${t.usd === undefined ? '' : ` (${aboutMoney(t.usd, say)})`}`)].join('\n')
}
export function historyText(list: RunReport[], now: number): string {
  if (list.length === 0) return trNow('No past runs yet.')
  const say = sayNow()
  return [trNow('Past runs, newest first:'), ...list.map(r => `${r.name}: ${reportWhen(r, now, say)}. ${reportHead(r, say)}.`)].join('\n')
}
