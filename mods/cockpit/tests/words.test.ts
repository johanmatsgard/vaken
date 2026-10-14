import { expect } from 'claude-code/testing'
import { test } from './slow'

import { tEn, tIn } from '../hooks/i18n/t'
import { hhmm, hhmmss, ymd } from '../hooks/core/time'
import { EDIT_TOOLS, isEditTool } from '../hooks/core/tools'
import { pad2, partPct, percentOf, timesWord } from '../hooks/core/words'

test('a count takes its noun from a row: one is singular, anything else is plural', () => {
  expect(tEn('words.file', { n: 1 })).toBe('1 file')
  expect(tEn('words.file', { n: 0 })).toBe('0 files')
  expect(tEn('words.copy', { n: 3 })).toBe('3 copies')
  expect(tEn('words.word', { n: 1 })).toBe('1 word')
  expect(tEn('words.word', { n: 2 })).toBe('2 words')
  expect(tIn('sv', 'words.file', { n: 1 })).toBe('1 fil')
  expect(tIn('sv', 'words.file', { n: 2 })).toBe('2 filer')
})

test('times says once for one and "N times" for the rest', () => {
  expect(timesWord(1)).toBe('once')
  expect(timesWord(0)).toBe('0 times')
  expect(timesWord(4)).toBe('4 times')
})

test('numbers pad to two digits', () => {
  expect(pad2(0)).toBe('00')
  expect(pad2(7)).toBe('07')
  expect(pad2(12)).toBe('12')
  expect(pad2(123)).toBe('123')
})

test('a share is a whole percent, and no whole gives zero', () => {
  expect(percentOf(0.4)).toBe(40)
  expect(percentOf(0.666)).toBe(67)
  expect(percentOf(1)).toBe(100)
  expect(partPct(1, 3)).toBe(33)
  expect(partPct(5, 0)).toBe(0)
  expect(partPct(5, -1)).toBe(0)
})

test('the clock and the day are the local time with two digits', () => {
  const at = new Date(2026, 9, 3, 7, 5, 9).getTime()
  expect(hhmm(at)).toBe('07:05')
  expect(hhmmss(at)).toBe('07:05:09')
  expect(ymd(at)).toBe('2026-10-03')
  const night = new Date(2026, 0, 1, 23, 59, 59).getTime()
  expect(hhmm(night)).toBe('23:59')
  expect(ymd(night)).toBe('2026-01-01')
  expect(ymd(night + 2000)).toBe('2026-01-02')
})

test('the edit tools are the four that change a file', () => {
  expect([...EDIT_TOOLS].sort()).toEqual(['Edit', 'MultiEdit', 'NotebookEdit', 'Write'])
  for (const t of ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']) expect(isEditTool(t)).toBe(true)
  for (const t of ['Bash', 'Read', 'Grep', 'mcp__srv__write', '']) expect(isEditTool(t)).toBe(false)
})
