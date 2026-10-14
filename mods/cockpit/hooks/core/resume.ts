// Auto-resume: when the plan limit kills a turn, remind or send 'continue' at the reset. Stops after 3 a day, while halted, if the person wrote meanwhile, or past 8 hours.
import { tr } from './lang'
import type { AppUsage } from './appusage'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { hhmm } from './time'

export const RESUME_SETTINGS: Setting[] = [
  {
    key: 'resume.mode',
    group: 'Plan',
    label: 'After a limit',
    note: 'When the plan limit stops a turn, wait for the reset.',
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
export const CONTINUE_TEXT = 'The plan limit has reset. Continue where you stopped.'
export const MAX_PER_DAY = 3
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

export function nextReset(usage: AppUsage | undefined, now: number): number | undefined {
  if (usage === undefined) return undefined
  const times = usage.windows.map(w => ({ label: w.label, at: w.resetsAt === undefined ? NaN : new Date(w.resetsAt).getTime() })).filter(t => !Number.isNaN(t.at) && t.at > now)
  const five = times.find(t => /5|five/i.test(t.label))
  return five?.at ?? (times.length === 0 ? undefined : Math.min(...times.map(t => t.at)))
}

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
  if (o.now - w.failedAt > DEADLINE_MS) return { act: false, why: 'The wait is over 8 hours old, so vaken dropped it.' }
  if (o.halted) return { act: false, why: 'The session is halted.' }
  if (o.wroteSince) return { act: false, why: 'You wrote something meanwhile, so vaken left it to you.' }
  if (o.stillFull === true) return (w.replans ?? 0) >= MAX_REPLANS ? { act: false, why: 'The plan limit still reads full after the reset, so vaken left it to you.' } : { act: 'again' }
  if (w.mode === 'resume' && o.doneToday >= MAX_PER_DAY) return { act: false, why: `It already resumed ${MAX_PER_DAY} times today.` }
  return { act: true }
}

export const waitingToast = (w: Wait): string => tr('The plan limit stopped this session. {what} at {time} {note}.').replace('{what}', w.mode === 'resume' ? tr('It continues') : tr('You get a reminder')).replace('{time}', hhmm(w.dueAt)).replace('{note}', w.fromReset ? tr('(when the window resets)') : tr('(the reset time is not known, so this is a guess)'))
export const remindToast = (): string => tr('The plan limit has reset. Type "continue" to go on.')

export function statusText(mode: string, w: Wait | undefined, now: number, doneToday: number): string {
  const head = `After a limit: ${mode}.`
  if (w === undefined) return `${head} Nothing is waiting.${mode === 'off' ? ' Turn it on: Settings > Money and plan.' : ''}`
  return `${head} Waiting since ${hhmm(w.failedAt)}. ${w.mode === 'resume' ? 'It sends "continue"' : 'It reminds you'} at ${hhmm(w.dueAt)}${now >= w.dueAt ? ' (due now)' : ''}. Resumes today: ${doneToday} of ${MAX_PER_DAY}. Cancel: /vaken-help run after-limit off (this session) or off all (every session and the task runner).`
}
