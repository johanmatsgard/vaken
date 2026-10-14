// Watch a session: "Tell me when done" ends in one toast and one band line when the session's turn ends or its tests pass.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import type { Io } from '../hooks/core/io'
import { WATCH_MAX, forgetWatches, parseWatches, readWatches, setWatch, stepWatches, watchKey, watchStep, withWatch } from '../hooks/core/watch'
import type { WatchRow } from '../hooks/core/watch'
import { END_FAMILIES } from '../hooks/core/keeper'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000

const r = (over: Partial<WatchRow> = {}): WatchRow => ({ id: 's2', name: 'Fix login bug', kind: 'working', ...over })

test('a watched session that was working and now waits is told once, with what it got done', () => {
  const w = withWatch({}, 's2', true, 'Fix login bug', NOW, true)
  const still = watchStep(w, [r()], NOW + MIN)
  expect(still.fired).toEqual([])
  expect(still.next.s2.sawWorking).toBe(true)
  const done = watchStep(still.next, [r({ kind: 'waiting', done: { files: 3, tests: 'passed', testsAt: NOW + 2 * MIN } })], NOW + 3 * MIN)
  expect(done.fired).toEqual([{ id: 's2', text: '"Fix login bug" finished: 3 files changed · tests passed.' }])
  expect(done.next).toEqual({})
})

test('a watch set while the session waits fires only after it worked again; needs you is not the end of the turn', () => {
  const w = withWatch({}, 's2', true, 'Fix login bug', NOW, false)
  expect(watchStep(w, [r({ kind: 'waiting' })], NOW + MIN).fired).toEqual([])
  const worked = watchStep(w, [r({ kind: 'working' })], NOW + MIN).next
  expect(watchStep(worked, [r({ kind: 'needs' })], NOW + 2 * MIN).fired).toEqual([])
  expect(watchStep(worked, [r({ kind: 'idle' })], NOW + 2 * MIN).fired).toEqual([{ id: 's2', text: '"Fix login bug" finished.' }])
})

test('tests that pass after the watch began end it, older passes do not; a session that is gone ended', () => {
  const w = withWatch({}, 's2', true, 'Fix login bug', NOW, false)
  expect(watchStep(w, [r({ kind: 'waiting', done: { files: 1, tests: 'passed', testsAt: NOW - MIN } })], NOW + MIN).fired).toEqual([])
  expect(watchStep(w, [r({ kind: 'working', done: { files: 1, tests: 'passed', testsAt: NOW + MIN } })], NOW + MIN).fired).toEqual([{ id: 's2', text: '"Fix login bug": tests passed.' }])
  expect(watchStep(w, [], NOW + MIN).fired).toEqual([{ id: 's2', text: '"Fix login bug" ended.' }])
})

test('watches are bounded, a second press takes one away, and a stored value of the wrong shape reads as none', () => {
  let w = {}
  for (let n = 0; n < WATCH_MAX + 3; n += 1) w = withWatch(w, `s${n}`, true, `S${n}`, NOW + n, true)
  expect(Object.keys(w)).toHaveLength(WATCH_MAX)
  expect(Object.keys(w)).not.toContain('s0')
  expect(Object.keys(withWatch(w, 's5', false, 'S5', NOW, true))).not.toContain('s5')
  expect(parseWatches('nope')).toEqual({})
  expect(parseWatches({ a: { name: 'A', at: 1 }, b: { at: 2 } })).toEqual({ a: { name: 'A', at: 1, sawWorking: false } })
})

test('the watches live in memory and in one key of this session, an END family; the router forgets a watch that ended', async () => {
  forgetWatches()
  const mem = new Map<string, unknown>()
  let clock = NOW
  const io = {
    now: async () => clock,
    sessionId: async () => 'me',
    get: async (k: string) => mem.get(k),
    set: async (k: string, v: unknown) => void mem.set(k, v),
    del: async (k: string) => void mem.delete(k),
  } as unknown as Io
  await setWatch(io, 's2', true, 'Fix login bug', true)
  expect(Object.keys(mem.get(watchKey('me')) as object)).toEqual(['s2'])
  expect(Object.keys(await readWatches(io))).toEqual(['s2'])
  forgetWatches()
  expect(Object.keys(await readWatches(io))).toEqual(['s2'])
  clock += MIN
  expect(await stepWatches(io, [r({ kind: 'working' })], clock)).toEqual([])
  expect(await stepWatches(io, [r({ kind: 'waiting' })], clock)).toEqual([{ id: 's2', text: '"Fix login bug" finished.' }])
  expect(mem.has(watchKey('me'))).toBe(false)
  expect(END_FAMILIES).toContain('cockpit:watch:')
  forgetWatches()
})
