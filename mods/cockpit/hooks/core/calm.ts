// Calm: one small shared record so a draw costs one read for the weekly note and the open ends.
import { parseOpenDay } from './openends'
import type { OpenDay } from './openends'
import { parseWeekly } from './weekly'
import type { WeeklyNote } from './weekly'

export const CALM_KEY = 'cockpit:calm'
export type Calm = { weekly?: WeeklyNote; open?: OpenDay }

export function parseCalm(raw: unknown): Calm {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const weekly = parseWeekly(o.weekly)
  const open = parseOpenDay(o.open)
  return { ...(weekly === undefined ? {} : { weekly }), ...(open === undefined ? {} : { open }) }
}

export const CALM_VIEW_STRINGS: string[] = [
  'Pause notices for 50 min ›',
  'Notices paused · {n} min left',
  'End pause',
  'Left open yesterday',
  'Got it',
  'and {n} more projects',
  '{kinds} failed',
  '1 task not done',
  '{n} tasks not done',
  'ended mid-answer',
  '{n} sessions ended mid-answer',
  'and',
  'tests',
  'the build',
  'lint',
  'the type check',
  'This week',
  'Saved you about {m} min (estimate)',
  '{n} risky steps stopped',
  '1 risky step stopped',
  'estimate',
  'Caught a repeating step once: about {m} min.',
  'Caught a repeating step {n} times: about {m} min.',
  'Compacted the session once: about {m} min.',
  'Compacted the session {n} times: about {m} min.',
  'Stopped a risky step once: about {m} min.',
  'Stopped {n} risky steps: about {m} min.',
  'Minutes are estimates: 5 for a caught repeating step, 3 for a compaction, 10 for a stopped risky step. Usage saved is not counted.',
  'room for {n} more',
  'full',
]

