// Vaken's own cost line. The engine reports no per-plugin CPU or memory, so it counts store writes, programs started and tool calls.
import { langNow } from '../i18n/t'
import { fmt } from './fmt'

type Counts = { writes: number; runs: number; calls: number }
const counts: Counts = { writes: 0, runs: 0, calls: 0 }

export const noteWrite = (): void => {
  counts.writes += 1
}
export const noteRun = (): void => {
  counts.runs += 1
}
export const noteCall = (): void => {
  counts.calls += 1
}
export const selfCounts = (): Counts => ({ ...counts })

// A rate needs at least a minute between two readings.
export const SELF_MIN_SPAN_MS = 60_000

export type SelfCost = { writes: number; runs: number; calls: number }
let since: { at: number; c: Counts; seen: number | undefined } | undefined
let rate: SelfCost | undefined

export function markSelfStart(now: number): void {
  since = { at: now, c: selfCounts(), seen: undefined }
  rate = undefined
}

export function noteGauge(now: number, readingAt: number): void {
  if (since === undefined) {
    since = { at: now, c: selfCounts(), seen: readingAt }
    return
  }
  if (since.seen === readingAt) return
  since.seen = readingAt
  const span = now - since.at
  if (span < SELF_MIN_SPAN_MS) return
  const c = selfCounts()
  const per = (n: number): number => (n * 60_000) / span
  rate = { writes: per(c.writes - since.c.writes), runs: per(c.runs - since.c.runs), calls: per(c.calls - since.c.calls) }
  since = { at: now, c, seen: readingAt }
}

export const selfCost = (): SelfCost | undefined => rate

export const figure = (n: number): string => fmt.figure(n, langNow())

export const SELF_LINE = 'Vaken in this session, per minute: store writes {w} · programs {r} · app calls {c}'

export function selfCostLine(c: SelfCost | undefined, t: (s: string) => string): string | undefined {
  if (c === undefined) return undefined
  return t(SELF_LINE).replace('{w}', figure(c.writes)).replace('{r}', figure(c.runs)).replace('{c}', figure(c.calls))
}

export const selfCostSignature = (): string => (rate === undefined ? '' : `${figure(rate.writes)}/${figure(rate.runs)}/${figure(rate.calls)}`)
