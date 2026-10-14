import { expect } from 'claude-code/testing'
import { test } from './slow'

import { BAND_KEEP, arbitrate, bandWords, liveItems, markOf, parseItems, shortText, topLine, withItem } from '../hooks/core/band'
import type { BandItem } from '../hooks/core/band'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000
const item = (id: string, level: BandItem['level'], over: Partial<BandItem> = {}): BandItem => ({ id, level, text: id, at: NOW, ttlMs: 10 * MIN, ...over })

test('an item expires after its time', () => {
  const list = [item('a', 'warn'), item('b', 'warn', { at: NOW - 11 * MIN })]
  expect(liveItems(list, NOW).map(x => x.id)).toEqual(['a'])
})

test('urgent beats warn beats info, and info shows only when nothing else does', () => {
  const list = [item('i', 'info'), item('w', 'warn'), item('u', 'urgent'), item('w2', 'warn', { at: NOW - MIN })]
  expect(arbitrate(list, NOW).shown.map(x => x.id)).toEqual(['u', 'w'])
  expect(arbitrate(list, NOW).more).toBe(2)
  expect(arbitrate([item('i', 'info')], NOW).shown.map(x => x.id)).toEqual(['i'])
})

test('the words: marks by level, and a count of the rest', () => {
  expect(bandWords([item('Paused for safety', 'urgent'), item('Budget at 80%', 'warn'), item('x', 'warn', { at: NOW - MIN })], NOW)).toBe('◆ Paused for safety · ▲ Budget at 80% +1 more')
  expect(bandWords([], NOW)).toBe('')
})

test('an item with the same id replaces the old one, and the list stays short', () => {
  let list: BandItem[] = []
  list = withItem(list, item('a', 'warn', { text: 'one' }), NOW)
  list = withItem(list, item('a', 'warn', { text: 'two' }), NOW)
  expect(list).toHaveLength(1)
  expect(list[0].text).toBe('two')
  for (let n = 0; n < 20; n += 1) list = withItem(list, item(`x${n}`, 'info'), NOW)
  expect(list).toHaveLength(BAND_KEEP)
})

test('a broken store value gives no items', () => {
  expect(parseItems('nope')).toEqual([])
  expect(parseItems([{ id: 1 }, item('a', 'info')])).toHaveLength(1)
})

test('a normal line is kept whole: the band cuts it by width, the stored cap is only a safety', () => {
  const line = 'Claude has edited the same long file name again and again in this answer, check it'
  expect(shortText(line)).toBe(line)
})

test('a long line is cut at a word with an ellipsis, never in the middle of one', () => {
  expect(shortText('Short')).toBe('Short')
  const cut = shortText('Claude has edited the same long file name again and again in this answer', 40)
  expect(cut.length).toBeLessThanOrEqual(40)
  expect(cut.endsWith('…')).toBe(true)
  expect(cut).toMatch(/ again…$|file…$|name…$|same…$|long…$/)
})

test('the band row shows one line: people waiting first, then a risk, then what vaken did, and counts the rest', () => {
  const now = 1_000_000
  const item = (id: string, level: 'urgent' | 'warn' | 'info', text: string, at = now) => ({ id, level, text, at, ttlMs: 60_000 })
  expect(topLine(0, [], now)).toBeUndefined()
  expect(topLine(2, [item('x', 'warn', 'Risky: migration ran')], now)).toEqual({ mark: '◆', text: '2 sessions need you', level: 'urgent', more: 1 })
  expect(topLine(1, [], now)?.text).toBe('1 session needs you')
  expect(topLine(0, [item('did:Compacted', 'info', 'Compacted 316k to 11k'), item('w', 'warn', 'Stuck?')], now)).toMatchObject({ mark: '▲', text: 'Stuck?', more: 1 })
  expect(topLine(0, [item('did:Kept the cache warm', 'info', 'Kept the cache warm')], now)).toMatchObject({ mark: '✓', text: 'Kept the cache warm' })
  expect(markOf(item('did:a', 'info', 'a'))).toBe('✓')
  expect(markOf(item('coach', 'info', 'a'))).toBe('·')
})
