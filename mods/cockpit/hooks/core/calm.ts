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
  'Quiet for 50 min ›',
  'Quiet · {n} min left',
  'End quiet',
  'Left open yesterday',
  'Got it',
  'and {n} more projects',
  '{kinds} failed',
  '1 task not done',
  '{n} tasks not done',
  'ended mid‑answer',
  '{n} sessions ended mid‑answer',
  'and',
  'tests',
  'the build',
  'lint',
  'the type check',
  'This week',
  '{n} risky steps stopped',
  '1 risky step stopped',
  '1 compaction',
  '{n} compactions',
  '1 loop caught',
  '{n} loops caught',
  'Caught a repeating step once.',
  'Caught a repeating step {n} times.',
  'Compacted the session once.',
  'Compacted the session {n} times.',
  'Stopped a risky step once.',
  'Stopped {n} risky steps.',
  'Counted from what vaken wrote down. Time and usage saved are not guessed.',
  'room for {n} more',
  'full',
]

