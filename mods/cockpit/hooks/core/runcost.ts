// The cost check before a task run and the words of the Run one task row. Joins existing data, no new engine. Every dollar figure is an estimate at list price. Dollars cannot become a share of a plan window, so a window is only reported as it stands.
import { windowMinutesLeft, RUNNER_SHORT_MIN } from './planfit'
import type { AppUsage } from './appusage'
import { weekWindow } from './dayshare'
import { ROLE_NAMES, TASK_WORDS_MAX, modelFor, roleSettingKey } from './orchestra'
import type { Role, Run } from './orchestra'
import { MIN_RUNS, familyOf } from './route'
import type { JobType, Stats } from './route'
import type { History } from './pace'
import { estimateUsd, money } from './prices'
import type { Counts } from './prices'
import {
  RC_ESTIMATE, RC_HISTORY, RC_NO_ESTIMATE, RC_OVER_HELPER, RC_OVER_RUN, RC_OVER_WEEK, RC_OVER_WINDOW, RC_PRESS_AGAIN, RC_TYPE_AGAIN, RC_UNPRICED, RC_WEEK, RC_WHAT_MANY, RC_WHAT_ONE,
} from './runcostwords'

// A first guess on the high side, so the check errs towards asking, until MIN_RUNS finished helpers have been kept; then their average output replaces the output.
export const TYPICAL: Record<Role, Counts> = {
  researcher: { input: 30_000, output: 3_000, read: 120_000, write: 15_000 },
  builder: { input: 60_000, output: 12_000, read: 400_000, write: 60_000 },
  reviewer: { input: 20_000, output: 1_500, read: 100_000, write: 15_000 },
  fixer: { input: 60_000, output: 12_000, read: 400_000, write: 60_000 },
}
const JOB_OF: Record<Role, JobType> = { researcher: 'lookup', builder: 'normal', reviewer: 'deep', fixer: 'normal' }

// A short 5-hour window only informs: the runner already puts smaller tasks first then.
export const WEEK_TIGHT_PERCENT = 90
const WEEK_FRESH_MS = 60 * 60_000

export type Facts = { roleModels: Partial<Record<Role, string>>; stats: Stats; usage: AppUsage | undefined; hist: History; now: number }

export function typicalCounts(role: Role, model: string, stats: Stats): { counts: Counts; fromHistory: boolean } {
  const base = TYPICAL[role]
  const cell = stats[JOB_OF[role]]?.[familyOf(model)]
  if (cell === undefined || cell.n < MIN_RUNS || !(cell.out > 0)) return { counts: base, fromHistory: false }
  const k = cell.out / cell.n / base.output
  return { counts: { input: base.input * k, output: base.output * k, read: base.read * k, write: base.write * k }, fromHistory: true }
}

export type TaskEstimate = { n: number; role: Role; model: string; usd?: number; fromHistory: boolean }
export type RunEstimate = { tasks: TaskEstimate[]; usd: number; unpriced: number; maxTaskUsd: number; fromHistory: number }

const sumUsd = (parts: (number | undefined)[]): number | undefined => (parts.some(p => p === undefined) ? undefined : parts.reduce<number>((s, p) => s + (p ?? 0), 0))

// A model with no price gives no figure (never zero); the task is counted in `unpriced`.
export function estimateRun(run: Run, roleModels: Partial<Record<Role, string>>, stats: Stats): RunEstimate {
  const tasks: TaskEstimate[] = run.tasks
    .filter(t => t.state === 'waiting')
    .map(t => {
      const model = modelFor(t.model, t.role, roleModels)
      const own = typicalCounts(t.role, model, stats)
      const reviewModel = modelFor('auto', 'reviewer', roleModels)
      const review = run.choices.reviewer ? typicalCounts('reviewer', reviewModel, stats) : undefined
      const usd = sumUsd([estimateUsd(model, own.counts), ...(review === undefined ? [] : [estimateUsd(reviewModel, review.counts)])])
      return { n: t.n, role: t.role, model, ...(usd === undefined ? {} : { usd }), fromHistory: own.fromHistory }
    })
  const priced = tasks.filter(t => t.usd !== undefined)
  return { tasks, usd: priced.reduce((s, t) => s + (t.usd ?? 0), 0), unpriced: tasks.length - priced.length, maxTaskUsd: Math.max(0, ...priced.map(t => t.usd ?? 0)), fromHistory: tasks.filter(t => t.fromHistory).length }
}

export type PlanFacts = { weekPercent?: number; fiveHourMinutes?: number }

export function planFacts(usage: AppUsage | undefined, hist: History, now: number): PlanFacts {
  if (usage === undefined) return {}
  // A weekly window of one model is not the week.
  const week = weekWindow(usage.windows)
  const fresh = now >= usage.at && now - usage.at <= WEEK_FRESH_MS
  const minutes = windowMinutesLeft(usage, hist, now)
  return { ...(week !== undefined && fresh ? { weekPercent: Math.round(week.percent) } : {}), ...(minutes === undefined ? {} : { fiveHourMinutes: minutes }) }
}

export type Reason = { kind: 'run' | 'helper' | 'week'; value: number }
export type RunCheck = { est: RunEstimate; plan: PlanFacts; limits: { run: number; helper: number }; reasons: Reason[]; over: boolean; sig: string }

// `over`: the first Start press only shows this and the second starts. `sig` leaves out the run's id, because the goal makes a new one at every look.
export function checkRun(run: Run, f: Facts): RunCheck {
  const est = estimateRun(run, f.roleModels, f.stats)
  const plan = planFacts(f.usage, f.hist, f.now)
  const reasons: Reason[] = []
  if (est.usd > run.choices.runUsd) reasons.push({ kind: 'run', value: run.choices.runUsd })
  if (est.maxTaskUsd > run.choices.helperUsd) reasons.push({ kind: 'helper', value: run.choices.helperUsd })
  if (est.usd > 0 && plan.weekPercent !== undefined && plan.weekPercent >= WEEK_TIGHT_PERCENT) reasons.push({ kind: 'week', value: plan.weekPercent })
  const sig = `${est.tasks.map(t => `${t.n}:${Math.round((t.usd ?? -1) * 100)}`).join(',')}|${run.choices.runUsd}|${run.choices.helperUsd}|${reasons.map(r => r.kind).join(',')}`
  return { est, plan, limits: { run: run.choices.runUsd, helper: run.choices.helperUsd }, reasons, over: reasons.length > 0, sig }
}


const fill = (s: string, vars: Record<string, string | number>): string => Object.entries(vars).reduce((out, [k, v]) => out.replace(`{${k}}`, String(v)), s)
const dollars = (usd: number): string => money(usd)

// The text answers pass no `t` and stay English.
const same = (s: string): string => s

export function estimateLine(c: RunCheck, t: (s: string) => string = same): string {
  const n = c.est.tasks.length
  const count = fill(t(n === 1 ? RC_WHAT_ONE : RC_WHAT_MANY), { n })
  if (n === 0 || c.est.unpriced === n) return fill(t(RC_NO_ESTIMATE), { what: count })
  const extras = [...(c.est.unpriced > 0 ? [fill(t(RC_UNPRICED), { n: c.est.unpriced })] : []), ...(c.est.fromHistory > 0 ? [t(RC_HISTORY)] : [])]
  return fill(t(RC_ESTIMATE), { usd: dollars(c.est.usd), what: [count, ...extras].join(', ') })
}

const reasonLine = (r: Reason, t: (s: string) => string): string =>
  r.kind === 'run' ? fill(t(RC_OVER_RUN), { usd: dollars(r.value) })
  : r.kind === 'helper' ? fill(t(RC_OVER_HELPER), { usd: dollars(r.value) })
  : fill(t(RC_OVER_WEEK), { n: r.value })

export function reasonLines(c: RunCheck, t: (s: string) => string = same): string[] {
  const why = c.over ? c.reasons.map(r => reasonLine(r, t)) : c.plan.weekPercent === undefined ? [] : [fill(t(RC_WEEK), { n: c.plan.weekPercent })]
  const short = c.est.usd > 0 && c.plan.fiveHourMinutes !== undefined && c.plan.fiveHourMinutes <= RUNNER_SHORT_MIN
  return short ? [...why, fill(t(RC_OVER_WINDOW), { n: c.plan.fiveHourMinutes ?? 0 })] : why
}

export const checkWords = (c: RunCheck, typed = false, t: (s: string) => string = same): string => [estimateLine(c, t), ...reasonLines(c, t), t(typed ? RC_TYPE_AGAIN : RC_PRESS_AGAIN)].join(' ')


export const roleModelsFrom = (values: Record<string, string>): Partial<Record<Role, string>> =>
  Object.fromEntries(ROLE_NAMES.filter(r => values[roleSettingKey(r)] !== undefined).map(r => [r, values[roleSettingKey(r)]]))


export const DONE_KINDS = ['tests', 'build', 'lint'] as const
export type DoneKind = (typeof DONE_KINDS)[number]

// A bracket at the end of a task line is read as its choices (core/orchestra.ts).
export function taskTextOf(goal: string, kinds: readonly string[], planFirst: boolean): string {
  const done = kinds.length === 0 ? '' : ` Done when ${kinds.join(', ')} pass.`
  const plan = planFirst ? ' Plan first, then work.' : ''
  const room = TASK_WORDS_MAX - 1 - done.length - plan.length
  const g = goal.replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '')
  const cut = g.length > room ? `${g.slice(0, Math.max(1, room - 1)).trimEnd()}…` : g
  return `${cut}.${done}${plan}`
}
