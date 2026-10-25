// The forecast line of a plan limit: when it runs out at this pace, or that it lasts until the reset. Only paceOf and runOutOf (core/pace.ts) on the stored readings; too little data gives no line. Pure.
import type { UsageWindow } from './appusage'
import { fmt } from './fmt'
import { paceOf, runOutOf, windowLength } from './pace'
import type { Pace, Sample } from './pace'
import { hhmm } from './time'

export type Forecast = { outAt: number } | { lasts: true }

// A used-up limit has nothing left to forecast; its percent line says so.
export function forecastOfPace(p: Pace | undefined, percent: number): Forecast | undefined {
  if (p === undefined || percent >= 100) return undefined
  const out = runOutOf(p)
  return out === undefined ? { lasts: true } : { outAt: out }
}

export const forecastOf = (w: UsageWindow, now: number, samples: Sample[] = []): Forecast | undefined => forecastOfPace(paceOf(w, now, samples), w.percent)

const DAY_MS = 24 * 3_600_000
export const weekLong = (label: string): boolean => (windowLength(label) ?? 0) > DAY_MS

type T = (s: string) => string
const same: T = s => s

// The time as the card says a reset: a weekday when the window is a week or the time is on another day, then "at 16:10".
export function forecastWords(f: Forecast, now: number, withDay: boolean, t: T = same): string {
  if ('lasts' in f) return t('At this pace: lasts until the reset.')
  const d = new Date(f.outAt)
  const day = withDay || new Date(now).toDateString() !== d.toDateString()
  const when = [...(day ? [t(fmt.day(d.getDay()))] : []), t('at {time}').replace('{time}', hhmm(f.outAt))].join(' ')
  return t('At this pace: runs out {when}.').replace('{when}', when)
}
