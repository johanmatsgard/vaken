// The daily share of the week: what is left of the week over the days to its reset, and what today used since local midnight.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { dayShare, dayShareDue, dayShareWords, weekWindow } from '../hooks/core/dayshare'
import type { Sample } from '../hooks/core/pace'
import { ymd } from '../hooks/core/time'

const HOUR = 3_600_000
const DAY = 24 * HOUR
// A Monday at local midnight, so the tests read the same in every time zone.
const DAY0 = new Date(2026, 9, 12, 0, 0, 0, 0).getTime()
const NOW = DAY0 + 15 * HOUR
// The week resets on Thursday at 09:00: Monday to Wednesday and 9 hours of Thursday are left, 3.375 days.
const RESET = new Date(DAY0 + 3 * DAY + 9 * HOUR).toISOString()
const week = (percent: number, resetsAt = RESET) => ({ label: 'Weekly · all models', percent, resetsAt })

test("the worked example: 38% left for about 3.4 days is about 11% a day, and today is counted from the reading before midnight", () => {
  const samples: Sample[] = [
    [DAY0 - 30 * HOUR, 30],
    [DAY0 - HOUR, 47],
    [DAY0 + 10 * HOUR, 55],
  ]
  const d = dayShare(week(62), NOW, samples)
  expect(d).toMatchObject({ left: 38, today: 15, usedUp: false })
  expect(Math.round((d?.days ?? 0) * 1000) / 1000).toBe(3.375)
  expect(d?.since).toBeUndefined()
  expect(dayShareWords(d!)).toBe('38% of your weekly limit is left. To make it last until it resets, use about 11% a day. Today: about 15% used.')
})

test("today's share is fixed at the start of the day; used past it, the line says so once a day", () => {
  const d = dayShare(week(66), NOW, [[DAY0 - HOUR, 47]])
  expect(Math.round((d?.share ?? 0) * 10) / 10).toBe(15.7)
  expect(d?.usedUp).toBe(true)
  expect(dayShareWords(d!)).toMatch(/Today: about 19% used\. Today's share is used up\.$/)
  expect(dayShareDue(d, undefined, NOW)).toBe(true)
  expect(dayShareDue(d, ymd(NOW - DAY), NOW)).toBe(true)
  expect(dayShareDue(d, ymd(NOW), NOW)).toBe(false)
  expect(dayShareDue(dayShare(week(60), NOW, [[DAY0 - HOUR, 47]]), undefined, NOW)).toBe(false)
})

test('a week that began today counts all of it as today; with no reading before midnight, today counts from the first one and says since when', () => {
  const fresh = dayShare(week(9, new Date(NOW + 6.9 * DAY).toISOString()), NOW)
  expect(fresh?.today).toBe(9)
  expect(fresh?.since).toBeUndefined()
  const late = dayShare(week(62), NOW, [[DAY0 + 9 * HOUR, 55]])
  expect(late).toMatchObject({ today: 7, since: DAY0 + 9 * HOUR })
  expect(dayShareWords(late!)).toMatch(/Today since 09:00: about 7% used\.$/)
})

test('without any reading the line has no today; the last day, a past reset and a far reset read right', () => {
  const none = dayShare(week(62), NOW)
  expect(none?.today).toBeUndefined()
  expect(none?.usedUp).toBe(false)
  expect(dayShareWords(none!)).toBe('38% of your weekly limit is left. To make it last until it resets, use about 11% a day.')
  const last = dayShare(week(90, new Date(DAY0 + 20 * HOUR).toISOString()), NOW)
  expect(last?.days).toBe(1)
  expect(dayShareWords(last!)).toBe('10% of your weekly limit is left, and it resets within a day.')
  // A small share keeps one decimal, so it never reads as 0.
  expect(dayShareWords(dayShare(week(92), NOW)!)).toBe('8% of your weekly limit is left. To make it last until it resets, use about 2.4% a day.')
  expect(dayShare(week(50, new Date(NOW - HOUR).toISOString()), NOW)).toBeUndefined()
  expect(dayShare(week(50, new Date(NOW + 8 * DAY).toISOString()), NOW)).toBeUndefined()
  expect(dayShare({ percent: 50 }, NOW)).toBeUndefined()
})

test('the share is about the weekly window of all models, never one model', () => {
  expect(weekWindow([{ label: '5-hour limit', percent: 10 }, { label: 'Weekly · Fable', percent: 80 }, { label: 'Weekly · all models', percent: 40 }])?.label).toBe('Weekly · all models')
  expect(weekWindow([{ label: 'Weekly · Fable', percent: 80 }])).toBeUndefined()
})

test('the fixed words translate through the given function', () => {
  const t = (s: string): string => s.replace('of your weekly limit is left', 'LEFT')
  expect(dayShareWords(dayShare(week(62), NOW)!, t)).toBe('38% LEFT. To make it last until it resets, use about 11% a day.')
})

test('the share does not jump when the reset moves two hours (T16): 11:00 against 13:00 on the same Thursday', () => {
  const at = (h: number) => dayShare(week(80, new Date(DAY0 + 3 * DAY + h * HOUR).toISOString()), NOW)!
  const a = at(11)
  const b = at(13)
  expect(Math.round((b.days - a.days) * 100) / 100).toBe(0.08)
  expect(Math.abs(a.perDay - b.perDay) / a.perDay).toBeLessThan(0.05)
  expect(dayShareWords(a)).toContain('until it resets')
})
