// Daily counts of what each block wrote down: kept 14 days, titles and numbers only.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { COUNTS_DAYS, addCount, countsSince, dayOf, parseCounts } from '../hooks/core/counts'

const DAY = 24 * 3_600_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

test('a line adds one to its title today', () => {
  let c = addCount(undefined, NOW, 'Warned about a secret')
  c = addCount(c, NOW + 60_000, 'Warned about a secret')
  c = addCount(c, NOW, 'Kept the cache warm')
  expect(c[dayOf(NOW)]).toEqual({ 'Warned about a secret': 2, 'Kept the cache warm': 1 })
})

test('only the last 14 days are kept, and a sum reads from a day on', () => {
  let c: unknown = undefined
  for (let d = 0; d < 20; d += 1) c = addCount(c, NOW + d * DAY, 'Caught a repeating step')
  expect(Object.keys(parseCounts(c)).length).toBe(COUNTS_DAYS)
  expect(countsSince(c, NOW + 13 * DAY)).toEqual({ 'Caught a repeating step': 7 })
})

test('a stored value of the wrong shape gives an empty start', () => {
  expect(parseCounts('junk')).toEqual({})
  expect(parseCounts({ notaday: { a: 1 }, '2026-10-10': { a: -1, b: 'x', c: 2 } })).toEqual({ '2026-10-10': { c: 2 } })
})

test('the day is the local day: half past midnight local time is today, not the day before', () => {
  const justAfterMidnight = new Date(2026, 9, 10, 0, 30).getTime()
  expect(dayOf(justAfterMidnight)).toBe('2026-10-10')
  expect(countsSince(addCount(undefined, justAfterMidnight, 'A line'), new Date(2026, 9, 10, 0, 5).getTime())).toEqual({ 'A line': 1 })
})
