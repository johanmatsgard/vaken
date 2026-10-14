import { expect } from 'claude-code/testing'
import { test } from './slow'

import { addSamples, paceOf, parseHistory, windowLength } from '../hooks/core/pace'

const H = 3_600_000
const NOW = Date.parse('2026-10-10T04:00:00Z')

test('a window length comes from its label', () => {
  expect(windowLength('5-hour limit')).toBe(5 * H)
  expect(windowLength('Weekly · all models')).toBe(7 * 24 * H)
  expect(windowLength('Weekly · Fable')).toBe(7 * 24 * H)
  expect(windowLength('Extra')).toBeUndefined()
})

test('the pace so far in the window gives the figure at the reset and when it runs out', () => {
  const half = paceOf({ label: '5-hour limit', percent: 40, resetsAt: new Date(NOW + 2.5 * H).toISOString() }, NOW)
  expect(Math.round(half?.projected ?? 0)).toBe(80)
  expect(half?.hitAt).toBeUndefined()
  const fast = paceOf({ label: '5-hour limit', percent: 60, resetsAt: new Date(NOW + 2.5 * H).toISOString() }, NOW)
  expect(Math.round(fast?.projected ?? 0)).toBe(120)
  expect(Math.round(((fast?.hitAt ?? 0) - NOW) / 60_000)).toBe(100)
})

test('too early, too little used, an unknown window or a past reset say nothing', () => {
  expect(paceOf({ label: '5-hour limit', percent: 4, resetsAt: new Date(NOW + 4.9 * H).toISOString() }, NOW)).toBeUndefined()
  expect(paceOf({ label: '5-hour limit', percent: 2, resetsAt: new Date(NOW + 2 * H).toISOString() }, NOW)).toBeUndefined()
  expect(paceOf({ label: 'Extra', percent: 50, resetsAt: new Date(NOW + 2 * H).toISOString() }, NOW)).toBeUndefined()
  expect(paceOf({ label: '5-hour limit', percent: 50, resetsAt: new Date(NOW - H).toISOString() }, NOW)).toBeUndefined()
  expect(paceOf({ label: '5-hour limit', percent: 50 }, NOW)).toBeUndefined()
})

test('the recent pace comes from the readings of the last hour and a half', () => {
  const samples: [number, number][] = [
    [NOW - 60 * 60_000, 20],
    [NOW - 30 * 60_000, 30],
  ]
  const p = paceOf({ label: '5-hour limit', percent: 40, resetsAt: new Date(NOW + 3 * H).toISOString() }, NOW, samples)
  expect(Math.round(p?.recentPerHour ?? 0)).toBe(20)
  expect(p?.recentHitAt).toBeUndefined()
  const quick = paceOf({ label: '5-hour limit', percent: 70, resetsAt: new Date(NOW + 4 * H).toISOString() }, NOW, [[NOW - 60 * 60_000, 40]])
  expect(Math.round(quick?.recentPerHour ?? 0)).toBe(30)
  expect(Math.round(((quick?.recentHitAt ?? 0) - NOW) / 60_000)).toBe(60)
})

test('readings are kept when the percent moves or half an hour passes, and a drop starts over', () => {
  const w = (percent: number) => [{ label: '5-hour limit', percent }]
  let h = addSamples({}, w(10), NOW)
  expect(h['5-hour limit']).toEqual([[NOW, 10]])
  h = addSamples(h, w(10), NOW + 5 * 60_000)
  expect(h['5-hour limit'].length).toBe(1)
  h = addSamples(h, w(12), NOW + 10 * 60_000)
  expect(h['5-hour limit'].length).toBe(2)
  h = addSamples(h, w(12), NOW + 45 * 60_000)
  expect(h['5-hour limit'].length).toBe(3)
  h = addSamples(h, w(1), NOW + 60 * 60_000)
  expect(h['5-hour limit']).toEqual([[NOW + 60 * 60_000, 1]])
})

test('a kept history that is broken gives only what is sound', () => {
  expect(parseHistory({ a: [[1, 2], ['x', 3], [4]], b: 'no' })).toEqual({ a: [[1, 2]] })
  expect(parseHistory(undefined)).toEqual({})
})

test('the recent pace needs enough change and a long enough span for the kind of window', () => {
  const week = (percent: number) => ({ label: 'Weekly (all models)', percent, resetsAt: new Date(NOW + 21 * H).toISOString() })
  // 1 point in 16 minutes: no recent pace at all.
  expect(paceOf(week(68), NOW, [[NOW - 16 * 60_000, 67]])?.recentPerHour).toBeUndefined()
  // 2 points in 2 hours: span below 3 hours.
  expect(paceOf(week(68), NOW, [[NOW - 2 * H, 66]])?.recentPerHour).toBeUndefined()
  // 3 points in 5 hours, found within the 24 hour look-back: (3 - 1) / 5 = 0.4 % an hour.
  expect(Math.round((paceOf(week(68), NOW, [[NOW - 5 * H, 65]])?.recentPerHour ?? 0) * 10)).toBe(4)
  // The 5-hour window: 1 point is not enough, 2 points in 20 minutes counts as (2 - 1) / 20 min = 3 % an hour.
  const five = (percent: number) => ({ label: '5-hour limit', percent, resetsAt: new Date(NOW + 3 * H).toISOString() })
  expect(paceOf(five(41), NOW, [[NOW - 20 * 60_000, 40]])?.recentPerHour).toBeUndefined()
  expect(Math.round(paceOf(five(42), NOW, [[NOW - 20 * 60_000, 40]])?.recentPerHour ?? 0)).toBe(3)
})
