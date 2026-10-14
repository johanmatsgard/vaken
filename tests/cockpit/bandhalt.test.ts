// The band after a restart: the pause in memory starts off in a new process, but the store may still hold this session's pause.
import { expect } from 'claude-code/testing'
import { test } from './slow'
import { haltMem } from '../hooks/core/guard'
import type { Io } from '../hooks/core/io'
import { bandSignatureForCheck } from '../hooks/features/home/load'

const NOW = Date.parse('2026-10-13T12:00:00Z')

function fakeIo(mem: Map<string, unknown>, gets: string[]): Io {
  return {
    now: async () => NOW,
    home: async () => '/home/test',
    sessionId: async () => 'me',
    get: async k => {
      gets.push(k)
      return mem.get(k)
    },
    set: async (k, v) => void mem.set(k, v),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: (async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false })) as Io['run'],
    ask: async () => '',
    complete: (async () => ({})) as unknown as Io['complete'],
    toast: () => undefined,
    invalidate: () => undefined,
  }
}

test('a pause kept in the store from before a restart is seen by the band: its first read looks once, later reads do not read the pause again', async () => {
  haltMem.held = false
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done'], ['cockpit:halt:me', { at: NOW - 60_000 }]])
  const gets: string[] = []
  await bandSignatureForCheck(() => fakeIo(mem, gets))
  expect(haltMem.held).toBe(true)
  expect(gets.filter(k => k === 'cockpit:halt:me').length).toBeGreaterThanOrEqual(1)
  mem.delete('cockpit:halt:me')
  haltMem.held = false
  gets.length = 0
  await bandSignatureForCheck(() => fakeIo(mem, gets))
  expect(haltMem.held).toBe(false)
  expect(gets.filter(k => k === 'cockpit:halt:me')).toEqual([])
})
