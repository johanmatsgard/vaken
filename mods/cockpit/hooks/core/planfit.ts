// How many minutes are left in the 5-hour window at the current pace, so a new helper is mentioned calmly and the runner starts smaller tasks first when time is short. An estimate.
import type { AppUsage } from './appusage'
import { paceOf, runOutOf } from './pace'
import type { History } from './pace'

// The pane that refreshes it may have been closed for a long while.
export const FIT_FRESH_MS = 15 * 60_000
export const HELPER_NOTE_MIN = 20
export const RUNNER_SHORT_MIN = 45

// A window that already reads full says 0.
export function windowMinutesLeft(usage: AppUsage | undefined, hist: History, now: number): number | undefined {
  if (usage === undefined || now - usage.at > FIT_FRESH_MS || now < usage.at) return undefined
  const w = usage.windows.find(x => /5-hour/i.test(x.label))
  if (w === undefined) return undefined
  if (w.percent >= 99) return 0
  const pace = paceOf(w, now, hist[w.label])
  const hitAt = runOutOf(pace)
  return hitAt === undefined || hitAt <= now ? undefined : Math.round((hitAt - now) / 60_000)
}

export const windowShort = (usage: AppUsage | undefined, hist: History, now: number, limit: number): boolean => {
  const left = windowMinutesLeft(usage, hist, now)
  return left !== undefined && left <= limit
}

export const helperFitNote = (minutes: number): string => `The plan window is nearly used up: about ${Math.max(1, minutes)} min left at this pace.`

export const SMALL_FIRST_WORDS = 'Smaller tasks first: the plan window is short'
