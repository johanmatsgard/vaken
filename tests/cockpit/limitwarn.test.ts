// The limit warning: a window that runs out before its reset, within the warning time, is named once.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { WARN_AHEAD_5H_MS, bandWords, clockWord, limitWarning } from '../hooks/core/limitwarn'
import { LIMITWARN_SETTINGS } from '../hooks/core/limitwarn'
import { findSetting } from '../hooks/core/settings'
import { bandWhatIs } from '../hooks/core/whatis'

const HOUR = 3_600_000
const NOW = new Date(2026, 9, 10, 14, 0).getTime()
const iso = (t: number): string => new Date(t).toISOString()

test('a 5-hour window that runs out in an hour, before its reset in two, is named', () => {
  const w = limitWarning([{ label: '5-hour limit', percent: 75, resetsAt: iso(NOW + 2 * HOUR) }], NOW)
  expect(w?.hitAt).toBe(NOW + HOUR)
  expect(w?.text).toBe('At this pace the 5-hour limit runs out at 15:00. It resets at 16:00.')
  expect(bandWords(w!, NOW)).toBe('5-hour limit runs out about 15:00')
})

test('no warning when the pace stays under the limit, when it is still far off, or when the reset comes first', () => {
  expect(limitWarning([{ label: '5-hour limit', percent: 30, resetsAt: iso(NOW + 2 * HOUR) }], NOW)).toBeUndefined()
  expect(limitWarning([{ label: '5-hour limit', percent: 25, resetsAt: iso(NOW + 4 * HOUR) }], NOW)).toBeUndefined()
  expect(WARN_AHEAD_5H_MS).toBe(90 * 60_000)
  expect(limitWarning([{ label: '5-hour limit', percent: 75 }], NOW)).toBeUndefined()
})

test('the window that runs out first is named; the recent pace wins over the pace so far', () => {
  const week = { label: 'Weekly (all models)', percent: 95, resetsAt: iso(NOW + 12 * HOUR) }
  const five = { label: '5-hour limit', percent: 75, resetsAt: iso(NOW + 2 * HOUR) }
  expect(limitWarning([week, five], NOW)?.label).toBe('5-hour limit')
  const hist = { '5-hour limit': [[NOW - 30 * 60_000, 60] as [number, number]] }
  expect(limitWarning([five], NOW, hist)?.hitAt).toBe(NOW + 50 * 60_000)
})

test('a time on another day names the day', () => {
  expect(clockWord(NOW + 24 * HOUR, NOW)).toMatch(/^[A-Z][a-z]+day 14:00$/)
  expect(clockWord(NOW + HOUR, NOW)).toBe('15:00')
})

test('the setting exists, is On by default, and the band line opens with its note', () => {
  expect(findSetting('limits.warn')?.default).toBe('on')
  expect(LIMITWARN_SETTINGS[0].label.split(' ').length).toBeLessThanOrEqual(3)
  expect(bandWhatIs({ id: 'limitwarn', text: '5-hour limit runs out about 15:00', at: NOW }, NOW).setting).toBe('limits.warn')
})

test('one whole-percent step in a short time never warns about the weekly window (the owner case)', () => {
  const week = { label: 'Weekly (all models)', percent: 68, resetsAt: iso(NOW + 21 * HOUR) }
  expect(limitWarning([week], NOW, { 'Weekly (all models)': [[NOW - 16 * 60_000, 67]] })).toBeUndefined()
  // Even a two-point change is not enough inside a short span.
  expect(limitWarning([week], NOW, { 'Weekly (all models)': [[NOW - 60 * 60_000, 66]] })).toBeUndefined()
})

test('a real fast weekly burn still warns, and the 5-hour window still warns on a genuine fast burn', () => {
  const week = { label: 'Weekly (all models)', percent: 70, resetsAt: iso(NOW + 21 * HOUR) }
  const w = limitWarning([week], NOW, { 'Weekly (all models)': [[NOW - 4 * HOUR, 60]] })
  expect(w?.hitAt).toBe(NOW + 12 * HOUR)
  const five = { label: '5-hour limit', percent: 60, resetsAt: iso(NOW + 3 * HOUR) }
  expect(limitWarning([five], NOW, { '5-hour limit': [[NOW - 40 * 60_000, 40]] })?.hitAt).toBe(NOW + 80 * 60_000)
  expect(limitWarning([{ ...five, percent: 41 }], NOW, { '5-hour limit': [[NOW - 16 * 60_000, 40]] })).toBeUndefined()
})
