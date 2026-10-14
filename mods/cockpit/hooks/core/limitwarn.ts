// Warns once, early, that at this pace a plan window runs out before it resets. An estimate, and called one.
import type { UsageWindow } from './appusage'
import { paceOf, runOutOf } from './pace'
import type { History } from './pace'
import type { Setting } from './settings'
import { pad2 } from './words'
import { fmt } from './fmt'

export const LIMITWARN_ID = 'limitwarn'
// Earlier than this the pace is still a guess.
export const WARN_AHEAD_5H_MS = 90 * 60_000
const WARN_AHEAD_WEEK_MS = 24 * 3_600_000
// Same time as the warning, so the plan card's order agrees with the band line.
export const warnAheadMs = (label: string): number => (/5-hour/i.test(label) ? WARN_AHEAD_5H_MS : WARN_AHEAD_WEEK_MS)

export const LIMITWARN_SETTINGS: Setting[] = [
  {
    key: 'limits.warn',
    group: 'Plan',
    label: 'Limit warning',
    note: "Says early when a plan window or today's share runs out.",
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]

export function clockWord(at: number, now: number): string {
  const d = new Date(at)
  const sameDay = new Date(now).toDateString() === d.toDateString()
  return `${sameDay ? '' : `${fmt.dayLong(d.getDay())} `}${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

const nameOf = (label: string): string => (/5-hour/i.test(label) ? 'the 5-hour limit' : `the ${label.charAt(0).toLowerCase()}${label.slice(1)} limit`)

type LimitWarning = { label: string; hitAt: number; resetsAt: number; text: string }

export function limitWarning(windows: UsageWindow[], now: number, hist: History = {}): LimitWarning | undefined {
  let best: LimitWarning | undefined
  for (const w of windows) {
    const pace = paceOf(w, now, hist[w.label])
    const hitAt = runOutOf(pace)
    const resetsAt = w.resetsAt === undefined ? NaN : new Date(w.resetsAt).getTime()
    if (hitAt === undefined || Number.isNaN(resetsAt) || hitAt >= resetsAt || hitAt <= now) continue
    if (hitAt - now > warnAheadMs(w.label)) continue
    if (best !== undefined && best.hitAt <= hitAt) continue
    best = { label: w.label, hitAt, resetsAt, text: `At this pace ${nameOf(w.label)} runs out at ${clockWord(hitAt, now)}. It resets at ${clockWord(resetsAt, now)}.` }
  }
  return best
}

export function bandWords(w: LimitWarning, now: number): string {
  const when = clockWord(w.hitAt, now)
  if (/5-hour/i.test(w.label)) return `5-hour limit runs out about ${when}`
  if (/^extra/i.test(w.label)) return `Extra usage runs out about ${when}`
  const model = /^weekly\s*[·(-]\s*\(?([^)]+?)\)?$/i.exec(w.label.trim())?.[1]?.trim()
  return model === undefined || /^all models$/i.test(model) ? `Weekly limit runs out about ${when}` : `Weekly limit (${model}) runs out about ${when}`
}
