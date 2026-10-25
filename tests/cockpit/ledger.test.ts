import { expect } from 'claude-code/testing'
import { test } from './slow'

import { didKind, didTitle, lowerFirst, savingWords, savings, shortSummary, startOfDay, summaryWords, timeWord, timesWord, todaySummary } from '../hooks/core/ledger'
import { EXPLAIN_TITLES } from '../hooks/core/explain'

const NOW = new Date(2026, 9, 10, 14, 30).getTime()
const MIN = 60_000

const e = (over: Record<string, unknown>) => ({ at: NOW - 5 * MIN, what: 'x', ...over }) as never

test('only entries that made the window smaller count as savings', () => {
  const list = [e({ before: 316_000, after: 11_000 }), e({ what: 'note' }), e({ before: 10_000, after: 12_000 }), e({ before: 100_000 })]
  expect(savings(list)).toHaveLength(1)
})

test("today's summary counts today's compacts and the tokens they freed, and leaves yesterday out", () => {
  const list = [e({ before: 316_000, after: 11_000 }), e({ at: NOW - 60 * MIN, before: 150_000, after: 14_000 }), e({ at: startOfDay(NOW) - 5 * MIN, before: 500_000, after: 10_000 })]
  expect(todaySummary(list, NOW)).toEqual({ count: 2, freed: 305_000 + 136_000 })
  expect(todaySummary([], NOW)).toEqual({ count: 0, freed: 0 })
})

test('the words: the summary, the one line, an entry and its time', () => {
  expect(summaryWords({ count: 0, freed: 0 })).toEqual({ head: 'The session was not compacted today.' })
  expect(summaryWords({ count: 1, freed: 305_000 })).toEqual({ head: 'Compacted the session once today.', sub: 'Freed about 305k tokens of the session.' })
  expect(summaryWords({ count: 3, freed: 1_200_000 }).head).toBe('Compacted the session 3 times today.')
  expect(shortSummary({ count: 0, freed: 0 })).toBe('Nothing today')
  expect(shortSummary({ count: 2, freed: 441_000 })).toBe('Compacted the session 2 times, about 441k tokens freed')
  // Two parts at most; a name keeps its capital inside the line
  expect(shortSummary({ count: 2, freed: 441_000 }, [{ what: 'Claude said done without proof', n: 3 }])).toBe('Compacted the session 2 times, about 441k tokens freed, Claude said done, but no check backs it 3 times')
  expect(shortSummary({ count: 2, freed: 441_000 }, [{ what: 'Caught a repeating step', n: 1 }, { what: 'Offered a skill for a repeated request', n: 1 }])).toBe('Compacted the session 2 times, about 441k tokens freed, caught a repeating step once, and 1 more')
  expect([lowerFirst('Claude said done'), lowerFirst('Caught a step')]).toEqual(['Claude said done', 'caught a step'])
  expect(savingWords(e({ before: 316_000, after: 11_000, how: 'button' }))).toEqual({ what: 'Compacted the session, 316k to 11k', how: 'from the card' })
  expect(timeWord(NOW)).toBe('14:30')
})

test('the Autopilot groups: what it did, what it warned about, what it stopped, each row keeps its whole shown title', () => {
  expect(didKind('Kept the cache warm')).toBe('did')
  // One name for one feature: the row says its setting's name
  expect([didTitle('Kept the cache warm'), didTitle('Kept the cache warm: it paid')]).toEqual(['Kept the session cheap', 'Kept the session cheap: it paid'])
  expect(didKind('Warned about a session in the same folder')).toBe('warned')
  expect(didKind('Found an instruction hidden in outside text')).toBe('warned')
  expect(didKind('Held a risky command')).toBe('stopped')
  expect(didKind('Blocked the same step again')).toBe('stopped')
  expect(didTitle('Warned about a session in the same folder')).toBe('Warned about a session in the same folder')
  expect(didTitle('Held a risky command')).toBe('Stopped a risky command')
  expect(timesWord(1)).toBe('once')
  expect(timesWord(4)).toBe('4 times')
  for (const t of EXPLAIN_TITLES) expect(didTitle(t).length).toBeGreaterThan(3)
})
