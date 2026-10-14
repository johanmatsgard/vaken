import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { LONG_JOB_MS, QUIET_MS, STUCK_MS, batchText, beatWord, glanceLines, heartbeat, isQuiet, notices, recapWords } from '../hooks/core/attention'
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
  expect(recapWords({ gapMs: 25 * MIN, branch: 'feat-x', contextPercent: 62, cache: 'Cache lapsed' })).toBe('Back after 25 min. Branch feat-x. Context 62% full. Cache lapsed.')
  expect(recapWords({ gapMs: 90 * MIN, unreviewed: 2 })).toBe('Back after 1.5 h. 2 changes wait for your look.')
  expect(glanceLines({ needs: [], hereState: 'Idle, context 4% full', didCount: 0 })).toEqual(['Nothing needs you.', 'Plan limit not reported yet.', 'This session: Idle, context 4% full. Autopilot did nothing today.'])
  const g = glanceLines({ needs: [{ name: 'A', reason: 'asks' }, { name: 'B', reason: '' }], limitPercent: 86.2, limitReset: 'resets Wed 13:00', hereState: 'Working', didCount: 3 })
  expect(g[0]).toBe('2 need you: A (asks), B (waiting).')
  expect(g[1]).toBe('Plan: 86% used, resets Wed 13:00.')
  expect(g[2]).toBe('This session: Working. Autopilot did 3 things today.')
  expect(glanceLines({ needs: [], hereState: 'Idle', didCount: 1 })[2]).toBe('This session: Idle. Autopilot did 1 thing today.')
  expect(g[2].split(' ').length).toBeLessThanOrEqual(12)
  expect(recapWords({ gapMs: 0, branch: 'feat-x', contextPercent: 62 })).toBe('You were away under 5 min. Nothing needs you.')
  expect(recapWords({ gapMs: 4 * MIN + 59_000 })).toBe('You were away under 5 min. Nothing needs you.')
  expect(recapWords({ gapMs: 5 * MIN, branch: 'feat-x' })).toBe('Back after 5 min. Branch feat-x.')
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
