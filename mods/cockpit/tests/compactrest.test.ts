// Compact at rest: every check must be true, each check says its value, and the words of /cockpit-compact.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { ENGINE_COMPACT_AT, compactMoment } from '../hooks/core/compactmoment'
import { AUTO_GAP_MS } from '../hooks/core/compactscore'
import { CACHE_MARGIN_MS, REST_GAP_MS, REST_QUIET_MS, WOULD_WHAT, endsWithQuestion, parseVerdict, restChecks, restDetail, restLines, restReady, restSection } from '../hooks/core/compactrest'
import type { RestFacts } from '../hooks/core/compactrest'
import { emptyState } from '../hooks/core/proof'
import type { ProofState } from '../hooks/core/proof'
import { EXPLAIN } from '../hooks/core/explain'
import { settingIn } from '../hooks/core/whatis'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

const finished = (): ProofState => ({ ...emptyState(), seq: 2, lastEditSeq: 1, edits: 1, receipts: [{ kind: 'tests', ok: true, seq: 2, at: NOW } as never] })

const rest = (over: Partial<RestFacts> = {}): RestFacts => ({
  turnEnded: true,
  endedWithQuestion: false,
  waitsForYou: false,
  agentsRunning: 0,
  backgroundRecent: 0,
  proof: emptyState(),
  tokens: 200_000,
  percent: 70,
  payback: 3,
  quietMs: REST_QUIET_MS,
  cacheLeftMs: 40 * MIN,
  sinceCompactMs: undefined,
  ...over,
})

const failing = (f: RestFacts): string[] => restChecks(f).filter(c => !c.ok).map(c => c.id)

test('at rest every check is true', () => {
  expect(failing(rest())).toEqual([])
  expect(restReady(restChecks(rest()))).toBe(true)
})

test('each condition alone stops it', () => {
  expect(failing(rest({ turnEnded: false }))).toEqual(['ended'])
  expect(failing(rest({ waitsForYou: true }))).toEqual(['ended'])
  expect(failing(rest({ endedWithQuestion: true }))).toEqual(['question'])
  expect(failing(rest({ agentsRunning: 1 }))).toEqual(['helpers'])
  expect(failing(rest({ backgroundRecent: 2 }))).toEqual(['helpers'])
  expect(failing(rest({ tokens: 120_000 }))).toEqual([])
  expect(failing(rest({ tokens: undefined, percent: undefined }))).toEqual(['size', 'score', 'context'])
  expect(failing(rest({ percent: 29 }))).toEqual(['size', 'score', 'context'])
  expect(failing(rest({ percent: 30 }))).toEqual(['score'])
  expect(failing(rest({ percent: 40, from: 50 }))).toEqual(['size', 'score', 'context'])
  expect(failing(rest({ percent: 55 }))).toEqual(['score'])
  expect(failing(rest({ guardHeld: true }))).toEqual(['guard'])
  // The payback and the cache are points, not stops: losing one leaves 65 of 70.
  expect(failing(rest({ payback: 12 }))).toEqual(['score'])
  expect(failing(rest({ payback: undefined }))).toEqual(['score'])
  expect(failing(rest({ quietMs: REST_QUIET_MS - 1 }))).toEqual(['quiet'])
  expect(failing(rest({ cacheLeftMs: 0, saved: true }))).toEqual(['cache'])
  expect(failing(rest({ cacheLeftMs: CACHE_MARGIN_MS - 1, saved: true }))).toEqual(['cache'])
  expect(failing(rest({ cacheLeftMs: undefined, saved: true }))).toEqual(['cache'])
  expect(failing(rest({ cacheLeftMs: 0 }))).toEqual(['score', 'cache'])
  expect(failing(rest({ sinceAutoMs: AUTO_GAP_MS - 1 }))).toEqual(['autogap'])
  expect(failing(rest({ sinceAutoMs: AUTO_GAP_MS }))).toEqual([])
  expect(failing(rest({ sinceCompactMs: REST_GAP_MS - 1 }))).toEqual(['gap'])
  expect(failing(rest({ sinceCompactMs: REST_GAP_MS }))).toEqual([])
})

test('the work: edits with no check are open, finished work passes, an open task list waits', () => {
  // Edits with no check are not a stop but earn no points for the work: the score stays under 70.
  expect(failing(rest({ proof: { ...emptyState(), edits: 2, seq: 2, lastEditSeq: 2 } }))).toEqual(['score'])
  expect(failing(rest({ proof: { ...finished(), lastEditSeq: 3 } }))).toEqual(['work', 'score'])
  expect(failing(rest({ proof: finished() }))).toEqual([])
  expect(failing(rest({ proof: { ...finished(), todo: { done: 2, total: 3 } } }))).toEqual(['work'])
  expect(failing(rest({ proof: { ...emptyState(), todo: { done: 3, total: 3 } } }))).toEqual([])
  const work = restChecks(rest({ proof: { ...emptyState(), edits: 2, seq: 2, lastEditSeq: 2, todo: { done: 1, total: 2 } } })).find(c => c.id === 'work')
  expect(work?.value).toBe('files changed and no check ran, task list 1 of 2 done')
})

test('each check says its value in words', () => {
  expect(restLines(restChecks(rest({ agentsRunning: 1, cacheLeftMs: 0, sinceCompactMs: 4 * MIN })))).toEqual([
    '✓ The answer ended: yes',
    '✓ Claude did not end with a question: yes',
    '✗ Nothing still runs: 1 agent, 0 background commands',
    '✓ No work is open: no file changed',
    '✓ No risky step was stopped: yes',
    '✓ The session is big enough: 200k tokens, 70% of the window (needs 30%)',
    '✗ Not compacted in the last 10 minutes: the last one 4 min ago',
    '✗ The moment scores high enough: 65 of 70',
    '✓ The session fills 30% of its window: 70%',
    '✓ Idle for 2 minutes: 2 min',
    '✗ The cache is still warm: gone cold: wait for the next break',
    '✓ No automatic compaction in the last 30 minutes: none seen',
  ])
  expect(restDetail(rest())).toBe('no file changed, context 70%, cache warm, pays back soon, idle for 2 minutes')
})

test('a question at the end of an answer is seen, also inside a closing mark', () => {
  expect(endsWithQuestion('Done. Shall I push?')).toBe(true)
  expect(endsWithQuestion('Shall I push? ')).toBe(true)
  expect(endsWithQuestion('Is this right?**')).toBe(true)
  expect(endsWithQuestion('Is it? Yes, it is.')).toBe(false)
  expect(endsWithQuestion('')).toBe(false)
})

test('the stored verdict is read defensively', () => {
  const v = { at: NOW, ready: false, checks: restChecks(rest({ agentsRunning: 1 })) }
  expect(parseVerdict(JSON.parse(JSON.stringify(v)))).toEqual(v)
  expect(parseVerdict({ at: NOW, ready: true, checks: [{ id: 1 }] })?.checks).toEqual([])
  expect(parseVerdict('x')).toBeUndefined()
})

test('/vaken-compact: off, watch only with its moments, auto', () => {
  expect(restSection('suggest', undefined, [], NOW).join('\n')).toMatch(/Compact when idle is off/)
  const v = { at: NOW - 3 * MIN, ready: true, checks: restChecks(rest()) }
  const watch = restSection('watch', v, [{ at: NOW - 3 * MIN, detail: '200k tokens' }], NOW)
  expect(watch).toContain('Last look 3 min ago: a good moment.')
  expect(watch).toContain('  3 min ago: 200k tokens')
  expect(restSection('watch', undefined, [], NOW)).toContain('It has not found a good moment yet.')
  expect(restSection('auto', v, [], NOW).join('\n')).toMatch(/Auto: it compacts the session when every check below is true/)
})

test('the watch-only line is explained and names a real setting', () => {
  expect(settingIn(EXPLAIN[WOULD_WHAT].next)).toBe('compact.mode')
})

test('the engine compacts at 97 % when the session does not say (not 95)', () => {
  expect(ENGINE_COMPACT_AT).toBe(97)
  expect(compactMoment({ percent: 96, tokens: 400_000, atBreak: true, quietMs: 0 }).level).toBe('soon')
  expect(compactMoment({ percent: 97, tokens: 400_000, atBreak: true, quietMs: 0 }).level).toBe('now')
})
