import { expect } from 'claude-code/testing'
import { test } from './slow'

import { cacheFromUsage, cacheWords, lastAfterTokens, lastSummaryOut, warmLeftMs, withCompact } from '../hooks/core/cachefacts'

const MIN = 60_000
const HOUR = 60 * MIN
const NOW = Date.parse('2026-10-10T12:00:00Z')

test('a turn with usage gives the cache numbers and the hit share', () => {
  const c = cacheFromUsage({ input_tokens: 200, output_tokens: 900, cache_read_input_tokens: 90_000, cache_creation_input_tokens: 9_800 }, NOW)
  expect(c).toEqual({ read: 90_000, write: 9_800, fresh: 200, hit: 90, at: NOW })
})

test('no usage, or no input at all, keeps the last numbers', () => {
  expect(cacheFromUsage(undefined, NOW)).toBeUndefined()
  expect(cacheFromUsage({ input_tokens: 0, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, NOW)).toBeUndefined()
})

test('warm time left follows the lifetime, and the words step in fives', () => {
  const c = { read: 1, write: 1, fresh: 0, hit: 50, at: NOW }
  expect(warmLeftMs(c, NOW + 20 * MIN, HOUR)).toBe(40 * MIN)
  expect(warmLeftMs(c, NOW + 2 * HOUR, HOUR)).toBe(0)
  expect(cacheWords(c, NOW + 13 * MIN, HOUR)).toBe('Cache warm 45 min')
  expect(cacheWords(c, NOW + 13 * MIN, HOUR, true)).toBe('Cache 50% hit · warm 45 min')
  expect(cacheWords(c, NOW + 55 * MIN, HOUR)).toBe('Cache warm 5 min')
  expect(cacheWords(c, NOW + 90 * MIN, HOUR)).toBe('Cache lapsed')
  // Unknown lifetime: the short one, so a cache is never called warm by mistake.
  expect(cacheWords(c, NOW + 20 * MIN)).toBe('Cache lapsed')
})

test('the last three compactions are kept, newest first, and the window and summary sizes are the newest known', () => {
  let list = withCompact(undefined, { at: 1, trigger: 'manual', before: 300_000, after: 20_000, outTokens: 3_000 })
  list = withCompact(list, { at: 2, trigger: 'auto' })
  list = withCompact(list, { at: 3, trigger: 'auto', after: 18_000, outTokens: 2_000 })
  list = withCompact(list, { at: 4, trigger: 'manual' })
  expect(list.map(c => c.at)).toEqual([4, 3, 2])
  expect(lastAfterTokens(list)).toBe(18_000)
  expect(lastSummaryOut(list)).toBe(2_000)
  expect(lastAfterTokens(undefined)).toBeUndefined()
})
