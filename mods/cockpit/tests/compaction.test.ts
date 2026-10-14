// The compaction hook's logging, and the keep-list rule.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { cardText, openLines, withKeepList } from '../hooks/core/compactmoment'
import { heldKey, heldOpen } from '../hooks/core/allowonce'
import { failedKey } from '../hooks/core/errors'
import { allowKey } from '../hooks/core/guard'
import type { Io } from '../hooks/core/io'
import { keepList } from '../hooks/features/compaction'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')

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

function engine(on: On) {
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.compact', () => ({ messages: [{ role: 'user', text: 'summary', toolUses: [] }], tokensBefore: 300_000, tokensAfter: 20_000 }) as never)
}

const keep = cardText({ title: 'Fix login', branch: 'feat-x' })

test('the keep-list goes after the person\'s own words, once, and alone when there are none', () => {
  expect(keep).toBe('Keep the goal "Fix login" on branch feat-x, the files changed, decisions made and why, and the next steps.')
  expect(withKeepList('Keep the tests.', keep)).toBe(`Keep the tests.\n${keep}`)
  expect(withKeepList(undefined, keep)).toBe(keep)
  expect(withKeepList('', keep)).toBe(keep)
  expect(withKeepList(keep, keep)).toBe(keep)
  expect(withKeepList(`mine\n${keep}`, keep)).toBe(`mine\n${keep}`)
})

test('a compaction that passes the hook goes on with the instructions it was given', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mem.set('cockpit:setting:compact.card', 'off')
  engine(on)
  await $.session.compact({ instructions: 'mine' })
  expect(mem.has('cockpit:probe:log')).toBe(false)
})

const FAKE_KEY = ['sk', 'ant', 'api03', 'a'.repeat(28)].join('-')

function memIo(): { io: Io; mem: Map<string, unknown> } {
  const mem = new Map<string, unknown>()
  const io: Io = {
    now: async () => NOW,
    home: async () => '',
    sessionId: async () => 'sid-1',
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, v),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem }
}

test('the keep-list is the same as before when nothing is open', async () => {
  const w = memIo()
  expect(await keepList(w.io, 'sid-1')).toBe(cardText({}))
})

test('the last failing step and a step the guard holds now are one short line each after the goal', async () => {
  const w = memIo()
  w.mem.set(failedKey('sid-1'), { at: NOW - 4 * 60_000, what: 'npm test', exit: 1, kind: 'test-failed' })
  w.mem.set(heldKey('sid-1'), { at: NOW - 60_000, step: 'tu1', keys: ['destructive|rm'], words: 'rm -rf build would delete a folder' })
  const lines = (await keepList(w.io, 'sid-1')).split('\n')
  expect(lines).toHaveLength(3)
  expect(lines[0]).toBe(cardText({}))
  expect(lines[1]).toBe('Keep the last failing step and what was tried: npm test (exit 1, a test did not pass, 4 min ago).')
  expect(lines[2]).toBe("Keep the step the safety check stopped, still waiting for the person's yes: rm -rf build would delete a folder.")
})

test('an old failure, an old hold, and a hold the person has answered are left out', async () => {
  const w = memIo()
  w.mem.set(failedKey('sid-1'), { at: NOW - 40 * 60_000, what: 'npm test' })
  w.mem.set(heldKey('sid-1'), { at: NOW - 40 * 60_000, keys: [], words: 'old' })
  expect(await keepList(w.io, 'sid-1')).toBe(cardText({}))
  w.mem.set(heldKey('sid-1'), { at: NOW - 60_000, keys: ['a'], words: 'x' })
  w.mem.set(allowKey('sid-1'), { at: NOW - 30_000 })
  expect(await keepList(w.io, 'sid-1')).toBe(cardText({}))
  expect(heldOpen({ at: NOW - 60_000, keys: [] }, { at: NOW - 90_000 }, NOW)).toBeDefined()
  expect(heldOpen(undefined, undefined, NOW)).toBeUndefined()
})

test('no secret reaches the keep-list, and the words are cut', () => {
  const lines = openLines({ failed: 'Keep it: x (just now).', held: `curl -H "Authorization: Bearer ${FAKE_KEY}" ${'y'.repeat(300)}` })
  expect(lines).toHaveLength(2)
  expect(lines[1]).not.toMatch(/ant-api03/)
  expect(lines[1].length).toBeLessThan(200)
  expect(openLines({})).toEqual([])
  expect(openLines({ failed: '', held: '' })).toEqual([])
})
