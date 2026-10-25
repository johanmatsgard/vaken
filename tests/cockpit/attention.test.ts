import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { LONG_JOB_MS, QUIET_MS, STUCK_MS, batchText, beatWord, glanceLines, heartbeat, isQuiet, noticePlan, notices, recapWords } from '../hooks/core/attention'
import { noticeRows } from '../hooks/features/attention'
import { buildView } from '../hooks/features/home/logic'
import type { NoticeRow } from '../hooks/core/attention'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

test('the heartbeat: a working session that is silent gets quiet, then stuck; others are fine', () => {
  expect(heartbeat('working', QUIET_MS - 1)).toBe('ok')
  expect(heartbeat('working', QUIET_MS)).toBe('quiet')
  expect(heartbeat('working', STUCK_MS)).toBe('stuck')
  expect(heartbeat('waiting', 60 * MIN)).toBe('ok')
  expect(beatWord('quiet', 4 * MIN)).toMatch(/Idle for 4 min/)
  expect(beatWord('stuck', 9 * MIN)).toMatch(/may be stuck/)
})

test('quiet hours wrap over midnight', () => {
  expect(isQuiet('22-07', 23)).toBe(true)
  expect(isQuiet('22-07', 3)).toBe(true)
  expect(isQuiet('22-07', 12)).toBe(false)
  expect(isQuiet('20-08', 8)).toBe(false)
  expect(isQuiet('off', 3)).toBe(false)
})

const row = (over: Partial<NoticeRow> = {}): NoticeRow => ({ id: 's1', name: 'Fix login', kind: 'needs', reason: 'asks a question', since: NOW, ...over })

test('a session that needs you is told once per episode', () => {
  const a = notices({}, [row()], {}, 'needs', NOW)
  expect(a.notices.map(n => n.text)).toEqual(['"Fix login" needs you: asks a question.'])
  const told = { s1: a.notices[0].marker }
  expect(notices(a.next, [row()], told, 'needs', NOW + MIN).notices).toEqual([])
  expect(notices(a.next, [row({ since: NOW + 5 * MIN })], told, 'needs', NOW + 6 * MIN).notices).toHaveLength(1)
  expect(notices({}, [row()], {}, 'off', NOW).notices).toEqual([])
})

test('a long job that finished is told only in the Needs and done mode', () => {
  const prev = { s1: { kind: 'working', since: NOW - LONG_JOB_MS - MIN } }
  const done = row({ kind: 'waiting', reason: '', since: NOW })
  expect(notices(prev, [done], {}, 'needs', NOW).notices).toEqual([])
  expect(notices(prev, [done], {}, 'all', NOW).notices.map(n => n.text)).toEqual(['"Fix login" finished.'])
  expect(notices({ s1: { kind: 'working', since: NOW - MIN } }, [done], {}, 'all', NOW).notices).toEqual([])
})

test('many notices become one toast', () => {
  const list = notices({}, [row(), row({ id: 's2', name: 'Docs' })], {}, 'needs', NOW).notices
  expect(batchText(list)).toBe('Waiting for you: Fix login, Docs.')
  expect(batchText(list.slice(0, 1))).toMatch(/needs you/)
})

test('the recap and the glance say it short', () => {
  // No context figure: This session and the status line own it
  expect(recapWords({ gapMs: 25 * MIN, branch: 'feat-x', cache: 'Cache lapsed' })).toBe('Back after 25 min. Branch feat-x. Cache lapsed.')
  expect(recapWords({ gapMs: 90 * MIN, unreviewed: 2 })).toBe('Back after 2 h. 2 changes wait for your look.')
  expect(glanceLines({ needs: [], hereState: 'Idle, context 4% full', didCount: 0 })).toEqual(['Nothing needs you.', 'Plan limit not reported yet.', 'This session: Idle, context 4% full. Autopilot did nothing today.'])
  const g = glanceLines({ needs: [{ name: 'A', reason: 'asks' }, { name: 'B', reason: '' }], limitPercent: 86.2, limitReset: 'resets Wed 13:00', hereState: 'Working', didCount: 3 })
  expect(g[0]).toBe('2 need you: A (asks), B (waiting).')
  expect(g[1]).toBe('Plan: 86% used, resets Wed 13:00.')
  expect(g[2]).toBe('This session: Working. Autopilot did 3 things today.')
  expect(glanceLines({ needs: [], hereState: 'Idle', didCount: 1 })[2]).toBe('This session: Idle. Autopilot did 1 thing today.')
  expect(g[2].split(' ').length).toBeLessThanOrEqual(12)
  expect(recapWords({ gapMs: 0, branch: 'feat-x', needs: 0 })).toBe('You were away under 5 min. Nothing needs you.')
  expect(recapWords({ gapMs: 4 * MIN + 59_000, needs: 0 })).toBe('You were away under 5 min. Nothing needs you.')
  expect(recapWords({ gapMs: 5 * MIN, branch: 'feat-x' })).toBe('Back after 5 min. Branch feat-x.')
})

test('a session that needs you is an urgent toast, so the hourly gate never eats the second question; a finished job alone is not', () => {
  const asks = notices({}, [row()], {}, 'all', NOW)
  expect(noticePlan({}, asks, false)).toMatchObject({ urgent: true, tell: asks.notices })
  const prev = { s1: { kind: 'working', since: NOW - LONG_JOB_MS - MIN } }
  const done = notices(prev, [row({ kind: 'waiting', reason: '', since: NOW })], {}, 'all', NOW)
  expect(noticePlan(prev, done, false).urgent).toBe(false)
})

test('quiet hours hold a notice back instead of using it up: it is told when they end', () => {
  const asks = notices({}, [row()], {}, 'needs', NOW)
  const held = noticePlan({}, asks, true)
  expect(held.tell).toEqual([])
  const after = notices(held.next, [row()], {}, 'needs', NOW + 60 * MIN)
  expect(noticePlan(held.next, after, false).tell.map(n => n.text)).toEqual(['"Fix login" needs you: asks a question.'])

  const prev = { s1: { kind: 'working', since: NOW - LONG_JOB_MS - MIN } }
  const finished = row({ kind: 'waiting', reason: '', since: NOW })
  const night = noticePlan(prev, notices(prev, [finished], {}, 'all', NOW), true)
  expect(night.tell).toEqual([])
  const morning = notices(night.next, [finished], {}, 'all', NOW + 60 * MIN)
  expect(noticePlan(night.next, morning, false).tell.map(n => n.text)).toEqual(['"Fix login" finished.'])
})

test('a long job silent for over 2 minutes still gives its finished notice', () => {
  const rec = (state: string, at: number) => ({ sessionId: 's1', cwd: '/w/a', title: 'Fix login', model: 'm', state, startedAt: NOW - 60 * MIN, updatedAt: at, lastEventAt: at - 5 * MIN, stateSince: NOW - 10 * MIN }) as never
  const silent = buildView([rec('working', NOW)], NOW, 'me', undefined)
  expect(silent.idle).toHaveLength(1)
  const seen = notices({}, noticeRows(silent), {}, 'all', NOW)
  const back = { ...rec('waiting', NOW + MIN), lastEventAt: NOW + MIN, stateSince: NOW + MIN } as never
  const done = notices(seen.next, noticeRows(buildView([back], NOW + MIN, 'me', undefined)), {}, 'all', NOW + MIN)
  expect(done.notices.map(n => n.text)).toEqual(['"Fix login" finished.'])
})

test('the recap names the goal and says Nothing needs you only when it counted none', () => {
  expect(recapWords({ gapMs: MIN })).toBe('You were away under 5 min.')
  expect(recapWords({ gapMs: MIN, needs: 2 })).toBe('You were away under 5 min. Needs you: 2.')
  expect(recapWords({ gapMs: 20 * MIN, goal: 'fix login', needs: 1 })).toBe('Back after 20 min. Goal: fix login Needs you: 1.')
})

test('the glance names every session that needs you and counts the rest by what they are', () => {
  const needs = ['A', 'B', 'C', 'D', 'E'].map(name => ({ name, reason: 'asks' }))
  expect(glanceLines({ needs, needsTotal: 7, hereState: 'Idle', didCount: 0 })[0]).toBe('7 need you: A (asks), B (asks), C (asks), D, E, 2 more in Needs you.')
  expect(glanceLines({ needs: [], needsTotal: 2, hereState: 'Idle', didCount: 0 })[0]).toBe('2 need you.')
})

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  return mem
}

test('/vaken-today glance answers in three lines with nothing running', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const r = (await $.command.run(viaParent('vaken-glance', ''))) as { text: string }
  expect(r.text.split('\n')).toHaveLength(3)
  expect(r.text).toMatch(/Nothing needs you/)
})
