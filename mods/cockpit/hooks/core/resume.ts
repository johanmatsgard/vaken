// Auto-resume: when the plan limit kills a turn, remind or send 'continue' at the reset. Stops after 3 a day, while halted, if the person wrote meanwhile, or past 8 hours.
import { tr } from './lang'
import type { AppUsage } from './appusage'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { hhmm } from './time'
import { fillIn } from './fillin'
import { FULL_PCT } from './overnight'

export const RESUME_SETTINGS: Setting[] = [
  {
    key: 'resume.mode',
    group: 'Plan',
    label: 'After a limit',
    note: 'When the plan limit stops a turn, wait for the reset.', // en-only: a setting note; /vaken-settings text stays English
    options: [
      { value: 'off', label: 'Off' },
      { value: 'remind', label: 'Remind' },
      { value: 'resume', label: 'Resume' },
    ],
    default: 'remind',
  },
]
export const RESUME_HELP: HelpEntry[] = [{ title: 'What happens when I hit my plan limit?', text: 'If the plan limit stops Claude in the middle of work, Remind tells you when the window resets. Resume also sends "continue" for you then. It stops after 3 resumes a day, and never if you wrote something meanwhile or the limit still reads full. /vaken-help run after-limit off cancels the wait; off all cancels every wait.' }]

export const RESUME_WHAT = 'Resumed after a limit'
export const REMIND_WHAT = 'Reminded about a limit reset'
export const CONTINUE_TEXT = 'The plan limit has reset. Continue where you stopped.' // en-only: sent to Claude as the person's own message
export const MAX_PER_DAY = 3
// The band line of a wait after a limit (features/resume.ts posts it; the band names the used-up limit in its place)
export const RESUME_BAND_ID = 'resume'
export const DEADLINE_MS = 8 * 3_600_000
// A little after the reset so the window is really open.
export const AFTER_RESET_MS = 45_000
export const FALLBACK_MS = 30 * 60_000

export type Wait = { failedAt: number; dueAt: number; mode: 'remind' | 'resume'; fromReset: boolean; replans?: number }
export const waitKey = (sessionId: string): string => `cockpit:resume:${sessionId}`
export const countKey = (day: string): string => `cockpit:resume:count:${day}`

export const parseWait = (raw: unknown): Wait | undefined => {
  const o = raw as Wait
  return typeof o === 'object' && o !== null && typeof o.dueAt === 'number' && typeof o.failedAt === 'number' && (o.mode === 'remind' || o.mode === 'resume') ? o : undefined
}
export function replanWait(w: Wait, usage: AppUsage | undefined, now: number): Wait {
  const reset = nextReset(usage, now)
  return { ...w, dueAt: reset === undefined ? now + FALLBACK_MS : reset + AFTER_RESET_MS, fromReset: reset !== undefined, replans: (w.replans ?? 0) + 1 }
}

// The window that is full decides: a full weekly window does not open at the 5-hour reset. With several full, the last of their resets; with none read as full, the 5-hour window first.
export function nextReset(usage: AppUsage | undefined, now: number): number | undefined {
  if (usage === undefined) return undefined
  const times = usage.windows.map(w => ({ label: w.label, full: w.percent >= FULL_PCT, at: w.resetsAt === undefined ? NaN : new Date(w.resetsAt).getTime() })).filter(t => !Number.isNaN(t.at) && t.at > now)
  const full = times.filter(t => t.full)
  if (full.length > 0) return Math.max(...full.map(t => t.at))
  const five = times.find(t => /5|five/i.test(t.label))
  return five?.at ?? (times.length === 0 ? undefined : Math.min(...times.map(t => t.at)))
}

// The person went on after the stop: a message typed since then, or the session at work since then. A few seconds of grace for the stop's own events.
export const WROTE_GRACE_MS = 5_000
export const wroteSince = (rec: { lastEventAt: number; state: string; promptAt?: number } | undefined, failedAt: number): boolean =>
  rec !== undefined && ((rec.promptAt ?? 0) > failedAt + WROTE_GRACE_MS || (rec.lastEventAt > failedAt + WROTE_GRACE_MS && rec.state === 'working'))

export function planWait(mode: string, usage: AppUsage | undefined, failedAt: number): Wait | undefined {
  if (mode !== 'remind' && mode !== 'resume') return undefined
  const reset = nextReset(usage, failedAt)
  return { failedAt, dueAt: (reset ?? failedAt + FALLBACK_MS) + (reset === undefined ? 0 : AFTER_RESET_MS), mode, fromReset: reset !== undefined }
}

// Sending 'continue' into a full window only fails again.
export const MAX_REPLANS = 3
export type Verdict = { act: false; why: string } | { act: true } | { act: 'again' }
export function dueVerdict(w: Wait, o: { now: number; halted: boolean; wroteSince: boolean; doneToday: number; stillFull?: boolean }): Verdict {
  if (o.now < w.dueAt) return { act: false, why: 'not yet' }
  if (o.now - w.failedAt > DEADLINE_MS) return { act: false, why: tr('The wait is over 8 hours old, so vaken dropped it.') }
  if (o.halted) return { act: false, why: tr('The session is halted.') }
  if (o.wroteSince) return { act: false, why: tr('You wrote something meanwhile, so vaken left it to you.') }
  if (o.stillFull === true) return (w.replans ?? 0) >= MAX_REPLANS ? { act: false, why: tr('The plan limit still reads full after the reset, so vaken left it to you.') } : { act: 'again' }
  if (w.mode === 'resume' && o.doneToday >= MAX_PER_DAY) return { act: false, why: fillIn(tr('It already resumed {n} times today.'), { n: MAX_PER_DAY }) }
  return { act: true }
}

export const waitingToast = (w: Wait): string => tr('The plan limit stopped this session. {what} at {time} {note}.').replace('{what}', w.mode === 'resume' ? tr('It continues') : tr('You get a reminder')).replace('{time}', hhmm(w.dueAt)).replace('{note}', w.fromReset ? tr('(when the window resets)') : tr('(the reset time is not known, so this is a guess)'))
export const remindToast = (): string => tr('The plan limit has reset. Type "continue" to go on.')

export function statusText(mode: string, w: Wait | undefined, now: number, doneToday: number): string {
  const head = fillIn(tr('After a limit: {mode}.'), { mode })
  if (w === undefined) return `${head} ${tr('Nothing is waiting.')}${mode === 'off' ? tr(' Turn it on: Settings > Money and plan.') : ''}`
  const due = now >= w.dueAt ? tr(' (due now)') : ''
  return `${head} ${fillIn(tr(w.mode === 'resume' ? 'Waiting since {since}. It sends "continue" at {at}{due}. Resumes today: {done} of {max}. Cancel: /vaken-help run after-limit off (this session) or off all (every session and the task runner).' : 'Waiting since {since}. It reminds you at {at}{due}. Resumes today: {done} of {max}. Cancel: /vaken-help run after-limit off (this session) or off all (every session and the task runner).'), { since: hhmm(w.failedAt), at: hhmm(w.dueAt), due, done: doneToday, max: MAX_PER_DAY })}`
}
