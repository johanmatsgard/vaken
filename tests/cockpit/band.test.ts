import { expect } from 'claude-code/testing'
import { test } from './slow'

import { BAND_KEEP, arbitrate, bandFirst, bandShort, bandWords, liveItems, markOf, marked, parseItems, shortText, topLine, withItem } from '../hooks/core/band'
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

test('the words: marks by level, and a count of the rest; a posted urgent line (a stall) is a warning, ◆ is only Needs you', () => {
  expect(bandWords([item('May be stuck', 'urgent'), item('Budget at 80%', 'warn'), item('x', 'warn', { at: NOW - MIN })], NOW)).toBe('▲ May be stuck · ▲ Budget at 80% +1 more')
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
  expect(markOf(item('coach', 'info', 'a'))).toBe('')
})

test('an info line has no mark, so the separator is never doubled; a done line keeps its tick', () => {
  expect(marked('', 'Quiet · 32 min left')).toBe('Quiet · 32 min left')
  expect(marked('▲', 'Stuck?')).toBe('▲ Stuck?')
  expect(bandWords([item('coach', 'info', { text: 'Sonnet costs less' })], NOW)).toBe('Sonnet costs less')
  expect(bandWords([item('did:a', 'info', { text: 'Compacted' }), item('coach', 'info', { text: 'Today 3 answers', at: NOW - MIN })], NOW)).toBe('✓ Compacted · Today 3 answers')
})

test('a line the one-row band would cut has a short form: the words of its kind, else the clause before its colon; a line with neither has none', () => {
  const id = (s: string): string => s
  expect(bandShort('guard', 'A risky step was stopped: it would have deleted a folder outside the work folder', id)).toBe('Risky step stopped')
  expect(bandShort('agentcap', 'Agent stopped: the computer is full', id)).toBe('Agent stopped')
  expect(bandShort('orch', 'Task run ended: 3 done, 1 failed', id)).toBe('Task run ended')
  expect(bandShort('x', 'Risky: migration ran', id)).toBeUndefined()
  expect(bandShort('heartbeat', 'May be stuck', id)).toBeUndefined()
})

test('a failure has the failure mark, is kept like a warning and ranks with one; a stored failure line reads back', () => {
  expect(markOf(item('health', 'fail'))).toBe('✗')
  expect(bandWords([item('Vaken self-test failed', 'fail')], NOW)).toBe('✗ Vaken self-test failed')
  expect(arbitrate([item('i', 'info'), item('f', 'fail')], NOW).shown.map(x => x.id)).toEqual(['f'])
  expect(parseItems([item('f', 'fail')])).toHaveLength(1)
})

test('a line with no short words of its own says its first whole sentence; a colon only inside the first sentence', () => {
  expect(bandShort('recap', 'Back after 42 min. Branch feat-x.', s => s)).toBe('Back after 42 min')
  expect(bandShort('recap', 'Back after 42 min. Goal: fix the band. Branch feat-x.', s => s)).toBe('Back after 42 min')
  expect(bandShort('agent', 'Agent stopped: the computer is full', s => s)).toBe('Agent stopped')
  expect(bandShort('tip', 'One sentence only', s => s)).toBeUndefined()
  expect(bandFirst('A step has run 12 min. Esc in the chat stops it.')).toBe('A step has run 12 min')
  // An abbreviation never ends a sentence
  expect(bandFirst('5 h förbrukad · återställs kl. 15:40')).toBeUndefined()
})
