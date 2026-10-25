import { expect } from 'claude-code/testing'
import { test } from './slow'

import { forecastOf, forecastWords, weekLong } from '../hooks/core/limitforecast'
import { leftPct, limitsText, usedPct } from '../hooks/core/costlimits'
import { setLang, tr } from '../hooks/core/lang'
import { hhmm } from '../hooks/core/time'
import { fmt } from '../hooks/core/fmt'

const H = 3_600_000
const NOW = Date.parse('2026-10-10T12:00:00Z')
const five = (percent: number, resetIn: number) => ({ label: '5-hour limit', percent, resetsAt: new Date(NOW + resetIn).toISOString() })
const week = (percent: number, resetIn: number) => ({ label: 'Weekly · all models', percent, resetsAt: new Date(NOW + resetIn).toISOString() })

test('a fast pace runs out before the reset and says the time', () => {
  // 60% after 2.5 h of 5: 100% after about 4 h 10 min, so 1 h 40 min from now
  const f = forecastOf(five(60, 2.5 * H), NOW)
  expect(f).toEqual({ outAt: NOW + 100 * 60_000 })
  expect(forecastWords(f!, NOW, false)).toBe(`At this pace: runs out at ${hhmm(NOW + 100 * 60_000)}.`)
})

test('a slow pace lasts until the reset', () => {
  const f = forecastOf(five(40, 2.5 * H), NOW)
  expect(f).toEqual({ lasts: true })
  expect(forecastWords(f!, NOW, false)).toBe('At this pace: lasts until the reset.')
})

test('too little data gives no line: too early, too little used, no reset, a used-up limit', () => {
  expect(forecastOf(five(50, 4.9 * H), NOW)).toBeUndefined()
  expect(forecastOf(five(1, 2 * H), NOW)).toBeUndefined()
  expect(forecastOf({ label: '5-hour limit', percent: 60 }, NOW)).toBeUndefined()
  expect(forecastOf(five(100, 2 * H), NOW)).toBeUndefined()
  expect(forecastOf({ label: 'Extra', percent: 60, resetsAt: new Date(NOW + H).toISOString() }, NOW)).toBeUndefined()
})

test('the recent pace from the kept readings wins over the pace so far, the same rule as the warning', () => {
  // 20% to 40% in the last hour: 20% an hour minus nothing, 60 points left: 3 h, past a reset in 2 h
  const f = forecastOf(five(40, 2 * H), NOW, [[NOW - H, 20]])
  expect(f).toEqual({ lasts: true })
  // 40% to 80% in an hour: 20 points left at 40 an hour is 30 min, before the reset
  expect(forecastOf(five(80, 2 * H), NOW, [[NOW - H, 40]])).toEqual({ outAt: NOW + 30 * 60_000 })
})

test('a weekly limit says the day with the time', () => {
  // 50% after 2 of 7 days runs out at day 4
  const f = forecastOf(week(50, 5 * 24 * H), NOW)
  expect(f).toEqual({ outAt: NOW + 2 * 24 * H })
  expect(weekLong('Weekly · all models')).toBe(true)
  expect(weekLong('5-hour limit')).toBe(false)
  const at = NOW + 2 * 24 * H
  expect(forecastWords(f!, NOW, true)).toBe(`At this pace: runs out ${fmt.day(new Date(at).getDay())} at ${hhmm(at)}.`)
})

test('Swedish says it in Swedish, with its own time word', () => {
  setLang('sv')
  try {
    const at = NOW + 2 * 24 * H
    const said = forecastWords({ outAt: at }, NOW, true, tr)
    expect(said).toBe(`I den här takten: tar slut ${fmt.day(new Date(at).getDay(), 'sv')} kl. ${hhmm(at)}.`)
    expect(forecastWords({ lasts: true }, NOW, false, tr)).toBe('I den här takten: räcker till återställningen.')
  } finally {
    setLang('en')
  }
})

test('the /vaken-usage text has the line under each window it can tell', () => {
  const text = limitsText({ usage: { at: NOW, windows: [five(60, 2.5 * H), week(50, 5 * 24 * H), { label: 'Weekly · Fable', percent: 1, resetsAt: new Date(NOW + 5 * 24 * H).toISOString() }] }, history: {}, running: { count: 0, source: 'vaken' }, spenders: [], now: NOW })
  const lines = text.split('\n')
  const at = (label: string) => lines.findIndex(l => l.startsWith(`${label}:`))
  expect(lines[at('5-hour limit') + 1]).toBe(`  At this pace: runs out at ${hhmm(NOW + 100 * 60_000)}.`)
  expect(lines[at('Weekly · all models') + 1]).toMatch(/^ {2}At this pace: runs out \w+ at \d\d:\d\d\.$/)
  expect(lines[at('Weekly · Fable') + 1]).not.toMatch(/At this pace/)
})

test('the chat text never rounds an almost full window to full: 99.6% reads 99% used, 1% left', () => {
  expect([usedPct(99.6), leftPct(99.6), usedPct(100), leftPct(100), usedPct(0.4), leftPct(0.4), usedPct(42.4)]).toEqual([99, 1, 100, 0, 0, 100, 42])
  const text = limitsText({ usage: { at: NOW, windows: [five(99.6, 2 * H)] }, history: {}, running: { count: 0, source: 'vaken' }, spenders: [], now: NOW })
  expect(text).toContain('5-hour limit: 99% used, 1% left.')
  expect(text).not.toContain('100% used')
})
