// Shows what was left open yesterday, one line per project, in the first session of the day. The sources are gone by morning, so a tiny note is kept at each session end.
import { PROOF_KINDS, kindWord } from './proof'
import type { ProofKind } from './proof'
import { ymd } from './time'

export const OPEN_ENDS_PREFIX = 'cockpit:openends:'
export const openEndsKey = (sid: string): string => `${OPEN_ENDS_PREFIX}${sid}`
// A session in the small hours still belongs to the day before.
export const DAY_TURNS_AT_H = 5
export const OPEN_ENDS_DAYS = 3
export const OPEN_ENDS_SHOW = 3
export const OPEN_ENDS_BAND_MS = 12 * 3_600_000
const DAY_MS = 24 * 3_600_000

export type OpenNote = { at: number; project: string; checks: Partial<Record<ProofKind, 'ok' | 'failed'>>; held: number; tasks: number; midTurn: boolean }
export type OpenEnd = { project: string; failed: ProofKind[]; held: number; tasks: number; midTurn: number }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
export function parseOpenNote(raw: unknown): OpenNote | undefined {
  const o = raw as OpenNote
  if (typeof o !== 'object' || o === null || !isNum(o.at) || typeof o.project !== 'string' || o.project === '') return undefined
  const checks: OpenNote['checks'] = {}
  if (typeof o.checks === 'object' && o.checks !== null) for (const k of PROOF_KINDS) if (o.checks[k] === 'ok' || o.checks[k] === 'failed') checks[k] = o.checks[k]
  return { at: o.at, project: o.project.slice(0, 60), checks, held: isNum(o.held) ? Math.floor(o.held) : 0, tasks: isNum(o.tasks) ? Math.floor(o.tasks) : 0, midTurn: o.midTurn === true }
}
export const noteMatters = (n: OpenNote): boolean => Object.keys(n.checks).length > 0 || n.held > 0 || n.tasks > 0 || n.midTurn

// The open day runs from 05:00 to 04:59.
export const openDayOf = (now: number): string => ymd(now - DAY_TURNS_AT_H * 3_600_000)
export function openDayStart(now: number): number {
  const d = new Date(now - DAY_TURNS_AT_H * 3_600_000)
  d.setHours(DAY_TURNS_AT_H, 0, 0, 0)
  return d.getTime()
}

// A later pass clears an earlier failure.
export function openEnds(notes: OpenNote[], dayStart: number): OpenEnd[] {
  const mine = notes.filter(n => n.at < dayStart && dayStart - n.at <= OPEN_ENDS_DAYS * DAY_MS).sort((a, b) => b.at - a.at)
  const out: OpenEnd[] = []
  for (const project of [...new Set(mine.map(n => n.project))]) {
    const of = mine.filter(n => n.project === project)
    const failed = PROOF_KINDS.filter(k => of.find(n => n.checks[k] !== undefined)?.checks[k] === 'failed')
    // A task left open on Friday and finished on Saturday no longer counts on Monday.
    const lastDay = openDayOf((of[0] as OpenNote).at)
    const latest = of.filter(n => openDayOf(n.at) === lastDay)
    const end = { project, failed, held: latest.reduce((s, n) => s + n.held, 0), tasks: latest.reduce((s, n) => s + n.tasks, 0), midTurn: latest.filter(n => n.midTurn).length }
    if (end.failed.length > 0 || end.held > 0 || end.tasks > 0 || end.midTurn > 0) out.push(end)
  }
  return out
}

export function openWords(e: OpenEnd, t: (s: string) => string = s => s): string {
  const fill = (s: string, n: number): string => t(s).replace('{n}', String(n))
  const kinds = e.failed.map(k => t(kindWord(k)))
  const kindList = kinds.length <= 1 ? (kinds[0] ?? '') : `${kinds.slice(0, -1).join(', ')} ${t('and')} ${kinds[kinds.length - 1]}`
  return [
    ...(kinds.length === 0 ? [] : [t('{kinds} failed').replace('{kinds}', kindList)]),
    ...(e.held === 0 ? [] : [fill(e.held === 1 ? '1 risky step stopped' : '{n} risky steps stopped', e.held)]),
    ...(e.tasks === 0 ? [] : [fill(e.tasks === 1 ? '1 task not done' : '{n} tasks not done', e.tasks)]),
    ...(e.midTurn === 0 ? [] : [fill(e.midTurn === 1 ? 'ended mid-answer' : '{n} sessions ended mid-answer', e.midTurn)]),
  ].join(', ')
}
export const openLine = (e: OpenEnd, t: (s: string) => string = s => s): string => `${e.project}: ${openWords(e, t)}`
export const openBand = (e: OpenEnd): string => `Left open in ${e.project}: ${openWords(e)}`

export type OpenDay = { day: string; ends: OpenEnd[]; dismissed: boolean }
export function parseOpenDay(raw: unknown): OpenDay | undefined {
  const o = raw as OpenDay
  if (typeof o !== 'object' || o === null || typeof o.day !== 'string' || !Array.isArray(o.ends)) return undefined
  const ends: OpenEnd[] = []
  for (const x of o.ends.slice(0, OPEN_ENDS_SHOW * 4)) {
    const e = x as OpenEnd
    if (typeof e !== 'object' || e === null || typeof e.project !== 'string') continue
    ends.push({ project: e.project.slice(0, 60), failed: Array.isArray(e.failed) ? PROOF_KINDS.filter(k => e.failed.includes(k)) : [], held: isNum(e.held) ? e.held : 0, tasks: isNum(e.tasks) ? e.tasks : 0, midTurn: isNum(e.midTurn) ? e.midTurn : 0 })
  }
  return { day: o.day.slice(0, 10), ends, dismissed: o.dismissed === true }
}
export const openShown = (d: OpenDay | undefined, now: number): OpenEnd[] => (d === undefined || d.dismissed || d.day !== openDayOf(now) ? [] : d.ends)
