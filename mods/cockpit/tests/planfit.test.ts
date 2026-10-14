// Plan fit: minutes left in the 5-hour window at the current pace, the calm line for a new helper.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import type { AppUsage } from '../hooks/core/appusage'
import { FIT_FRESH_MS, HELPER_NOTE_MIN, RUNNER_SHORT_MIN, SMALL_FIRST_WORDS, helperFitNote, windowMinutesLeft, windowShort } from '../hooks/core/planfit'

const H = 3_600_000
const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

const usage = (percent: number, left = 1, age = 0, label = '5-hour limit'): AppUsage => ({ at: NOW - age, windows: [{ label, percent, resetsAt: new Date(NOW + left * H).toISOString() }] })

test('the limits are 20 minutes for a helper and 45 for the runner', () => {
  expect(HELPER_NOTE_MIN).toBe(20)
  expect(RUNNER_SHORT_MIN).toBe(45)
})

test('minutes left come from the pace so far: 4 of 5 hours gone at 95% runs out in about 13 minutes; 90% in about 27', () => {
  expect(windowMinutesLeft(usage(95), {}, NOW)).toBe(13)
  expect(windowMinutesLeft(usage(90), {}, NOW)).toBe(27)
})

test('the recent pace is used when readings exist', () => {
  // 4 h in at 60% (pace so far: out after 6.7 h, past the reset), but the last 30 minutes added 30 points: out in 40 minutes.
  const hist = { '5-hour limit': [[NOW - 30 * MIN, 30] as [number, number]] }
  expect(windowMinutesLeft(usage(60), {}, NOW)).toBeUndefined()
  expect(windowMinutesLeft(usage(60), hist, NOW)).toBe(40)
})

test('nothing is said when the window will last to its reset, when it is too early, or when there is no 5-hour window', () => {
  expect(windowMinutesLeft(usage(50), {}, NOW)).toBeUndefined()
  expect(windowMinutesLeft(usage(95, 4.9), {}, NOW)).toBeUndefined()
  expect(windowMinutesLeft(usage(95, 1, 0, 'Weekly · all models'), {}, NOW)).toBeUndefined()
  expect(windowMinutesLeft(undefined, {}, NOW)).toBeUndefined()
})

test('a reading older than 15 minutes is not believed; a full window says 0', () => {
  expect(windowMinutesLeft(usage(95, 1, FIT_FRESH_MS + 1), {}, NOW)).toBeUndefined()
  expect(windowMinutesLeft(usage(95, 1, FIT_FRESH_MS), {}, NOW)).toBe(13)
  expect(windowMinutesLeft(usage(100), {}, NOW)).toBe(0)
  expect(windowMinutesLeft(usage(99.5), {}, NOW)).toBe(0)
})

test('windowShort: within the limit, and not beyond it', () => {
  expect(windowShort(usage(95), {}, NOW, 20)).toBe(true)
  expect(windowShort(usage(90), {}, NOW, 20)).toBe(false)
  expect(windowShort(usage(90), {}, NOW, 45)).toBe(true)
  expect(windowShort(usage(50), {}, NOW, 45)).toBe(false)
  expect(windowShort(undefined, {}, NOW, 45)).toBe(false)
})

test('the words: one calm line for Claude, and the phrase of the run summary', () => {
  expect(helperFitNote(13)).toBe('The plan window is nearly used up: about 13 min left at this pace.')
  expect(helperFitNote(0)).toBe('The plan window is nearly used up: about 1 min left at this pace.')
  expect(SMALL_FIRST_WORDS).toBe('Smaller tasks first: the plan window is short')
})
