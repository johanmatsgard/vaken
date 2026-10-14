import { expect } from 'claude-code/testing'
import { test } from './slow'

import { fmt } from '../hooks/core/fmt'
import type { AgoName } from '../hooks/core/fmt'
import { ageWord } from '../hooks/features/home/logic'

const MIN = 60_000
const H = 60 * MIN

test('middle keeps the start and the end of a long path or file name, and leaves a short one alone', () => {
  expect(fmt.middle('notes.ts', 40)).toBe('notes.ts')
  const cut = fmt.middle('a-very-long-component-file-name-for-the-settings-page.test.tsx', 21)
  expect(Array.from(cut).length).toBe(21)
  expect(cut.startsWith('a-very-lo')).toBe(true)
  expect(cut.endsWith('.test.tsx')).toBe(true)
  expect(cut).toContain('…')
})

test('percent is a whole number with a sign', () => {
  const table: [number, string][] = [[0, '0%'], [62.4, '62%'], [61.5, '62%'], [99.6, '99%'], [100, '100%']]
  for (const [n, want] of table) expect(fmt.percent(n)).toBe(want)
})

test('money keeps more digits for a small sum', () => {
  const table: [number, string][] = [[4.2, '$4.20'], [0.35, '$0.35'], [0.1, '$0.10'], [0.035, '$0.035'], [0.004, '$0.0040']]
  for (const [n, want] of table) expect(fmt.money(n)).toBe(want)
})

test('moneyPlain is always two decimals', () => {
  const table: [number, string][] = [[0, '$0.00'], [0.84, '$0.84'], [12.5, '$12.50']]
  for (const [n, want] of table) expect(fmt.moneyPlain(n)).toBe(want)
})

test('moneyAbout says an estimate', () => {
  const table: [number, string][] = [[0.004, 'under $0.01'], [0.84, 'about $0.84'], [1, 'about $1.0'], [12.54, 'about $12.5']]
  for (const [n, want] of table) expect(fmt.moneyAbout(n)).toBe(want)
})

test('tokens are short', () => {
  const table: [number, string][] = [[0, '0'], [950, '950'], [1000, '1k'], [1500, '2k'], [93_234, '93k'], [1_000_000, '1M'], [1_500_000, '1.5M']]
  for (const [n, want] of table) expect(fmt.tokens(n)).toBe(want)
})

test('tokensFine keeps a decimal between 1k and 10k', () => {
  const table: [number, string][] = [[999, '999'], [1000, '1k'], [1500, '1.5k'], [9999, '10k'], [12_000, '12k']]
  for (const [n, want] of table) expect(fmt.tokensFine(n)).toBe(want)
})

test('tokensOf says used of window', () => {
  expect(fmt.tokensOf(68_000, 1_000_000)).toBe('68k of 1M')
})

test('ago: one counting for every style name (T14): floor, just now under a minute, N min, N h, N d', () => {
  const table: [AgoName, number, string][] = [
    ['plain', 0, 'just now'],
    ['plain', 59_999, 'just now'],
    ['plain', 60_000, '1 min ago'],
    ['plain', 5 * MIN, '5 min ago'],
    ['plain', 59 * MIN, '59 min ago'],
    // 90 minutes is one hour and a half: "1 h", never the later-looking "2 h"; the other styles now say the same.
    ['plain', 90 * MIN, '1 h ago'],
    ['hm', 90 * MIN, '1 h ago'],
    ['recent', 90 * MIN, '1 h ago'],
    ['hours', 119 * MIN, '1 h ago'],
    ['days', 23 * H, '23 h ago'],
    ['days', 24 * H, '1 d ago'],
    ['days', 50 * H, '2 d ago'],
    ['recent', 47 * H, '1 d ago'],
    ['steady', 48 * H, '2 d ago'],
    ['list', 0, 'just now'],
    ['list', 3 * H, '3 h ago'],
  ]
  for (const [style, ms, want] of table) expect(fmt.ago(ms, style)).toBe(want)
  expect(ageWord(90 * MIN)).toBe('1 h')
  expect(ageWord(47 * H)).toBe('1 d')
})

test('tokens choose the unit after rounding and a percent under 100 never reads 100 (T17)', () => {
  expect(fmt.tokens(999_600)).toBe('1M')
  expect(fmt.tokens(999_400)).toBe('999k')
  expect(fmt.tokens(1_000_000)).toBe('1M')
  expect(fmt.percent(99.6)).toBe('99%')
  expect(fmt.percent(99.4)).toBe('99%')
  expect(fmt.percent(100)).toBe('100%')
  expect(fmt.percent(100.4)).toBe('100%')
})

test('duration says seconds, minutes, then tenths of an hour', () => {
  const table: [number, string][] = [[20_000, '20 s'], [40_000, '1 min'], [5 * MIN, '5 min'], [90 * MIN, '1.5 h'], [120 * MIN, '2 h']]
  for (const [ms, want] of table) expect(fmt.duration(ms)).toBe(want)
})

test('span is coarse and never in seconds', () => {
  const table: [number, string][] = [[-5, 'under 1 min'], [20_000, 'under 1 min'], [5 * MIN, '5 min'], [120 * MIN, '2 h']]
  for (const [ms, want] of table) expect(fmt.span(ms)).toBe(want)
})

test('today counts what happened today', () => {
  expect(fmt.today(3)).toBe('3 today')
})

// A one-decimal number takes the Swedish comma, never a dot.
test('decimal and figure: one decimal, a comma in Swedish', () => {
  expect(fmt.decimal(1.34)).toBe('1.3')
  expect(fmt.decimal(1.34, 'sv')).toBe('1,3')
  expect(fmt.figure(1.3333)).toBe('1.3')
  expect(fmt.figure(1.3333, 'sv')).toBe('1,3')
  expect(fmt.figure(2, 'sv')).toBe('2')
  expect(fmt.figure(44.4, 'sv')).toBe('44')
  expect(fmt.tokensFine(1500, 'sv')).toBe('1,5k')
  expect(fmt.tokens(1_500_000, 'sv')).toBe('1,5M')
  expect(fmt.moneyAbout(12.5, 'sv')).toBe('ungefär 12,5 USD')
})

test('a language code gives its decimal mark and its words', () => {
  expect(fmt.decimal(1.34, 'sv')).toBe('1,3')
  expect(fmt.decimal(1.34, 'en')).toBe('1.3')
  expect(fmt.gb(3700, 'sv')).toBe('3,6 GB')
  expect(fmt.tokensOf(68_000, 1_500_000, 'sv')).toBe('68k av 1,5M')
  expect(fmt.moneyAbout(0.5, 'sv')).toBe('ungefär 0,50 USD')
  expect(fmt.moneyAbout(0.001, 'sv')).toBe('under 0,01 USD')
  expect(fmt.ago(30_000, 'days', 'sv')).toBe('nyss')
  expect(fmt.ago(5 * MIN, 'days', 'sv')).toBe('för 5 min sedan')
  expect(fmt.ago(180 * MIN, 'days', 'sv')).toBe('för 3 h sedan')
  expect(fmt.span(20_000, 'sv')).toBe('under 1 min')
  expect(fmt.duration(90 * MIN, 'sv')).toBe('1,5 h')
  expect(fmt.today(3, 'sv')).toBe('3 i dag')
  expect([fmt.day(0), fmt.day(1, 'sv'), fmt.month(4), fmt.month(4, 'sv')]).toEqual(['Sun', 'mån', 'May', 'maj'])
  expect([fmt.decimal(1.34, 'xx'), fmt.ago(5 * MIN, 'days', 'xx')]).toEqual(['1.3', '5 min ago'])
})

test('money follows the language', () => {
  expect(fmt.moneyPlain(1.8, 'en')).toBe('$1.80')
  expect(fmt.moneyPlain(1.8, 'sv')).toBe('1,80 USD')
  expect(fmt.money(0.42, 'sv')).toBe('0,42 USD')
  expect(fmt.money(0.035, 'sv')).toBe('0,035 USD')
  expect(fmt.money(0.004, 'sv')).toBe('0,0040 USD')
  expect(fmt.money(4.2, 'en')).toBe('$4.20')
})
