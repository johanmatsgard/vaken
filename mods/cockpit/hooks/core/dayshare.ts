// The daily share of the week: what is left of the weekly window spread over the days until reset. Pure.
import { langNow, tr } from './lang'
import type { UsageWindow } from './appusage'
import type { Sample } from './pace'
import { hhmm, ymd } from './time'
import { fmt } from './fmt'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

export const DAYSHARE_SAID_KEY = 'cockpit:usage:dayshare'
export const DAYSHARE_ID = 'dayshare'
export const DAYSHARE_BAND_MS = 30 * 60_000

export type DayShare = {
  left: number
  days: number // Fractions of a day, at least 1: a reset Thursday 11:00 is 3.5 days, not 3.
  perDay: number
  today?: number
  since?: number
  share?: number
  usedUp: boolean
  resetAt?: number
}

const startOfDay = (now: number): number => {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const weekWindow = (windows: UsageWindow[]): UsageWindow | undefined => windows.find(w => /^weekly · all models$/i.test(w.label)) ?? windows.find(w => /^weekly$/i.test(w.label))

export function dayShare(w: { percent: number; resetsAt?: string }, now: number, samples: Sample[] = []): DayShare | undefined {
  const reset = w.resetsAt === undefined ? NaN : new Date(w.resetsAt).getTime()
  if (Number.isNaN(reset) || reset <= now || reset - now > WEEK_MS) return undefined
  const day0 = startOfDay(now)
  // Counted between local midnights, since a clock change makes a day 23 or 25 hours.
  const resetDay0 = startOfDay(reset)
  const nextDay0 = startOfDay(resetDay0 + 36 * 3_600_000)
  const days = Math.max(1, Math.round((resetDay0 - day0) / DAY_MS) + (reset - resetDay0) / (nextDay0 - resetDay0))
  const left = Math.max(0, Math.min(100, 100 - w.percent))
  const start = reset - WEEK_MS
  const mine = samples.filter(([t]) => t >= start && t <= now).sort((a, b) => a[0] - b[0])
  let base: number | undefined
  let since: number | undefined
  if (start >= day0) base = 0
  else {
    const before = mine.filter(([t]) => t <= day0).at(-1)
    const first = mine.find(([t]) => t > day0)
    if (before !== undefined) base = before[1]
    else if (first !== undefined) [since, base] = first
  }
  const today = base === undefined ? undefined : Math.max(0, w.percent - base)
  const share = base === undefined ? undefined : Math.max(0, 100 - base) / days
  return { left, days, perDay: left / days, ...(today === undefined ? {} : { today }), ...(since === undefined ? {} : { since }), ...(share === undefined ? {} : { share }), usedUp: today !== undefined && share !== undefined && today > 0 && today >= share, resetAt: reset }
}

const pct = (n: number): string => fmt.figureDown(n, langNow())

// Says "until it resets" and no count of days, so it cannot contradict the reset time beside it.
export function dayShareWords(d: DayShare, t: (s: string) => string = s => s): string {
  if (d.left <= 0 && d.resetAt !== undefined) {
    const when = new Date(d.resetAt)
    return t('Your weekly limit is used up. It resets {when}.').replace('{when}', `${t(fmt.day(when.getDay()))} ${t('{time}').replace('{time}', hhmm(d.resetAt))}`)
  }
  const head =
    d.days <= 1
      ? t('{left}% of your weekly limit is left, and it resets within a day.').replace('{left}', pct(d.left))
      : t('{left}% of your weekly limit is left. To make it last until it resets, use about {per}% a day.').replace('{left}', pct(d.left)).replace('{per}', pct(d.perDay))
  if (d.today === undefined) return head
  // Today is a difference of two whole percents, so it can be a point off.
  const today = d.since === undefined ? t('Today: about {n}% used.').replace('{n}', pct(d.today)) : t('Today since {time}: about {n}% used.').replace('{time}', hhmm(d.since)).replace('{n}', pct(d.today))
  return `${head} ${today}${d.usedUp ? ` ${t("Today's share is used up.")}` : ''}`
}

export const dayShareBand = (): string => "Today's share of the week is used up"
// The Mac notice for today's share: short, the figure said as used like the band
export const dayShareToast = (d: DayShare): string => tr("Today's share of the week is used up: {today} used today.").replace('{today}', fmt.usedIn(d.today ?? 0))

export const dayShareDue = (d: DayShare | undefined, said: unknown, now: number): boolean => d !== undefined && d.usedUp && said !== ymd(now)
