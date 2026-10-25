// Compact at rest: every check must be true, each check says its value, and the words of /vaken-compact.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { ENGINE_COMPACT_AT, compactMoment } from '../hooks/core/compactmoment'
import { BUSY_FROM_PCT, COMPACT_GAP_MS, SHORT_BREAK_SHARE, busyFromOf } from '../hooks/core/compactauto'
import { CACHE_MARGIN_MS, REST_GAP_MS, WOULD_WHAT, notGoodLines, parseVerdict, restChecks, restDetail, restLines, restReady, restSection, restTrigger } from '../hooks/core/compactrest'
import type { RestFacts } from '../hooks/core/compactrest'
import { EXPLAIN } from '../hooks/core/explain'
import { settingIn } from '../hooks/core/whatis'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

// The size trigger holds: 70 % of the window, 300k tokens, a payback in 2 answers, right after the answer.
const rest = (over: Partial<RestFacts> = {}): RestFacts => ({
  turnEnded: true,
  waitsForYou: false,
  agentsRunning: 0,
  backgroundRecent: 0,
  tokens: 300_000,
  percent: 70,
  from: 60,
  minTokens: 100_000,
  payback: 2,
  quietMs: 5_000,
  breakAtMs: 45 * MIN,
  cacheLeftMs: 55 * MIN,
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
  // An agent in the foreground stops it; background helpers only raise the fill level (70 of 75 here)
  expect(failing(rest({ agentsRunning: 1, foregroundAgents: 1 }))).toEqual(['helpers', 'time'])
  expect(failing(rest({ agentsRunning: 1 }))).toEqual(['time'])
  expect(failing(rest({ backgroundRecent: 2 }))).toEqual(['time'])
  expect(failing(rest({ guardHeld: true }))).toEqual(['guard'])
  // Under compact.min tokens, or a size not known: never
  expect(failing(rest({ tokens: 99_999 }))).toEqual(['size'])
  expect(failing(rest({ tokens: 100_000 }))).toEqual([])
  expect(failing(rest({ tokens: 150_000, minTokens: 200_000 }))).toEqual(['size'])
  expect(failing(rest({ tokens: undefined }))).toEqual(['size'])
  // A compaction of any kind in the last 20 minutes
  expect(failing(rest({ sinceCompactMs: REST_GAP_MS - 1 }))).toEqual(['gap'])
  expect(failing(rest({ sinceCompactMs: REST_GAP_MS }))).toEqual([])
  expect(COMPACT_GAP_MS).toBe(20 * MIN)
})

test('a question at the end of the answer does not stop it: there is no such check', () => {
  expect(restChecks(rest()).map(c => c.id)).toEqual(['ended', 'helpers', 'guard', 'size', 'gap', 'time'])
})

test('the size trigger: the fill level of the window, and a payback within 5 answers', () => {
  expect(restTrigger(rest())).toBe('size')
  expect(failing(rest({ percent: 59 }))).toEqual(['time'])
  expect(failing(rest({ percent: 60 }))).toEqual([])
  expect(failing(rest({ percent: 55, from: 50 }))).toEqual([])
  expect(failing(rest({ percent: 55, from: 70 }))).toEqual(['time'])
  expect(failing(rest({ percent: undefined }))).toEqual(['time'])
  expect(failing(rest({ payback: 5 }))).toEqual([])
  expect(failing(rest({ payback: 5.1 }))).toEqual(['time'])
  expect(failing(rest({ payback: undefined }))).toEqual(['time'])
  // It needs no idle time and no warm cache
  expect(failing(rest({ quietMs: 0, cacheLeftMs: 0 }))).toEqual([])
})

test('the break trigger: idle until the cache time less the lead, with the cache still warm', () => {
  const brk = (over: Partial<RestFacts> = {}): RestFacts => rest({ percent: 20, quietMs: 45 * MIN, cacheLeftMs: 15 * MIN, ...over })
  expect(restTrigger(brk())).toBe('break')
  expect(failing(brk())).toEqual([])
  expect(failing(brk({ quietMs: 45 * MIN - 1 }))).toEqual(['time'])
  // A cold or unknown cache: the break trigger exists to use the warm cache
  expect(failing(brk({ cacheLeftMs: 0 }))).toEqual(['time'])
  expect(failing(brk({ cacheLeftMs: CACHE_MARGIN_MS - 1 }))).toEqual(['time'])
  expect(failing(brk({ cacheLeftMs: undefined }))).toEqual(['time'])
  // A plan that is not known has no cache time: the break trigger never fires, however long the break
  expect(failing(brk({ ttlKnown: false }))).toEqual(['time'])
  expect(failing(brk({ ttlKnown: false, quietMs: 3 * MIN, breakAtMs: 3 * MIN }))).toEqual(['time'])
  expect(failing(brk({ ttlKnown: true }))).toEqual([])
  // It always pays: no payback needed
  expect(failing(brk({ payback: undefined }))).toEqual([])
  // The 5-minute cache: 3 of 5 minutes idle
  expect(SHORT_BREAK_SHARE).toBe(0.6)
  expect(failing(brk({ breakAtMs: 3 * MIN, quietMs: 3 * MIN, cacheLeftMs: 2 * MIN }))).toEqual([])
})

test('with only background helpers open and the answer ended, Auto compacts from 75%, never under compact.from, and never during a break', () => {
  expect(BUSY_FROM_PCT).toBe(75)
  const busy = (over: Partial<RestFacts> = {}): RestFacts => rest({ agentsRunning: 2, backgroundRecent: 1, ...over })
  expect(failing(busy({ percent: 75 }))).toEqual([])
  expect(restTrigger(busy({ percent: 75 }))).toBe('size')
  expect(failing(busy({ percent: 74 }))).toEqual(['time'])
  expect(failing(busy({ percent: 70 }))).toEqual(['time'])
  expect(failing(rest({ backgroundRecent: 1, percent: 80 }))).toEqual([])
  // Still never: mid-turn, a foreground agent, a question waiting, a risky step, a recent compaction, a small session
  expect(failing(busy({ percent: 80, turnEnded: false }))).toEqual(['ended'])
  expect(failing(busy({ percent: 80, waitsForYou: true }))).toEqual(['ended'])
  expect(failing(busy({ percent: 80, foregroundAgents: 1 }))).toEqual(['helpers'])
  expect(failing(busy({ percent: 80, guardHeld: true }))).toEqual(['guard'])
  expect(failing(busy({ percent: 80, sinceCompactMs: REST_GAP_MS - 1 }))).toEqual(['gap'])
  expect(failing(busy({ percent: 80, tokens: 99_999 }))).toEqual(['size'])
  // The break trigger is not widened: with helpers open it never fires
  expect(failing(busy({ percent: 20, quietMs: 45 * MIN, cacheLeftMs: 15 * MIN }))).toEqual(['time'])
  // The old rule with nothing open is unchanged
  expect(failing(rest({ percent: 60 }))).toEqual([])
  expect(failing(rest({ percent: 59 }))).toEqual(['time'])
  expect(busyFromOf(60)).toBe(75)
  expect(busyFromOf(80)).toBe(80)
  expect(restLines(restChecks(busy({ percent: 70 })))[1]).toBe('✓ Only background agents or commands still run: 2 agents, 1 background command')
  expect(restLines(restChecks(busy({ percent: 70 }))).pop()).toBe('✗ It is time: the session is full, or a break is near its end: 70% of the window (needs 75% while agents run)')
  expect(restLines(restChecks(busy({ percent: 80 }))).pop()).toBe('✓ It is time: the session is full, or a break is near its end: 80% of the window, at least 75%')
  expect(restLines(restChecks(busy({ percent: 80, foregroundAgents: 1 })))[1]).toBe('✗ Nothing still runs: an agent runs in the foreground')
  const say = (n: string, v?: Record<string, string | number>): string => `${n}${v?.n === undefined ? '' : `:${v.n}`}`
  expect(notGoodLines(restChecks(busy({ percent: 70 })), busy({ percent: 70 }), say)).toEqual(['cardcompact.not_time_busy:75'])
  expect(notGoodLines(restChecks(busy({ percent: 80, foregroundAgents: 1 })), busy({ percent: 80, foregroundAgents: 1 }), say)).toEqual(['cardcompact.not_foreground'])
})

test('each check says its value in words', () => {
  expect(restLines(restChecks(rest({ agentsRunning: 1, foregroundAgents: 1, sinceCompactMs: 4 * MIN })))).toEqual([
    '✓ The answer ended: yes',
    '✗ Nothing still runs: an agent runs in the foreground',
    '✓ No risky step was stopped: yes',
    '✓ The session is big enough: 300k tokens (needs 100k)',
    '✗ Not compacted in the last 20 minutes: the last one 4 min ago',
    '✗ It is time: the session is full, or a break is near its end: 70% of the window (needs 75% while agents run)',
  ])
  expect(restLines(restChecks(rest({ percent: 20, payback: 2 }))).pop()).toBe('✗ It is time: the session is full, or a break is near its end: 20% of the window (needs 60%), or a break after 45 min')
  expect(restLines(restChecks(rest({ payback: 9 }))).pop()).toBe('✗ It is time: the session is full, or a break is near its end: 70% of the window, but compacting would not pay back soon')
  expect(restDetail(rest())).toBe('at 70% of the window')
  expect(restDetail(rest({ percent: 20, quietMs: 45 * MIN, cacheLeftMs: 15 * MIN }))).toBe('during a break')
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
