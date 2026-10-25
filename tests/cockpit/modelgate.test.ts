// The one door for model calls: one Autopilot line per call, and the call goes on even when the line cannot be written.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { MODEL_SIMPLER_WHAT, askFork, askModel } from '../hooks/core/modelGate'
import { LEDGER_KEY } from '../hooks/features/compaction'
import { simpler } from '../hooks/features/simple'
import { byEnglish } from '../hooks/i18n/table'
import type { Io } from '../hooks/core/io'

const NOW = Date.parse('2026-10-21T12:00:00Z')
const memIo = (calls: string[] = []): { io: Io; mem: Map<string, unknown> } => {
  const mem = new Map<string, unknown>()
  const io = {
    now: async () => NOW,
    sessionId: async () => 'me',
    get: async (k: string) => mem.get(k),
    set: async (k: string, v: unknown) => void mem.set(k, JSON.parse(JSON.stringify(v))),
    del: async (k: string) => void mem.delete(k),
    keys: async () => [...mem.keys()],
    toast: () => undefined,
    invalidate: () => undefined,
    complete: async (r: { prompt: string }) => {
      calls.push(r.prompt)
      return { isAnswered: true, text: 'Plain.', reason: 'x', usage: {} }
    },
    fork: async (r: { prompt: string }) => {
      calls.push(`fork:${r.prompt}`)
      return { isAnswered: true, reason: 'x', usage: {} }
    },
  } as unknown as Io
  return { io, mem }
}
const ledger = (mem: Map<string, unknown>): { what: string; session?: string }[] => (mem.get(LEDGER_KEY) as { what: string }[] | undefined) ?? []

test('a call through the gate writes one ledger line and then makes the call', async () => {
  const calls: string[] = []
  const { io, mem } = memIo(calls)
  const r = await askModel(io, { what: MODEL_SIMPLER_WHAT }, { prompt: 'p' } as never)
  expect(r.isAnswered).toBe(true)
  expect(calls).toEqual(['p'])
  expect(ledger(mem).map(e => e.what)).toEqual([MODEL_SIMPLER_WHAT])
  expect(ledger(mem)[0].session).toBe('me')
})

test('Say simpler writes one Autopilot line, in Swedish too', async () => {
  const { io, mem } = memIo()
  expect(await simpler(io, 'A long answer')).toEqual(['Plain.'])
  expect(ledger(mem).map(e => e.what)).toEqual(['Asked a model: Say simpler'])
  expect(byEnglish('sv')['Asked a model: Say simpler'] ?? '').not.toBe('')
  // no answer to retell: no model, no line
  const none = memIo()
  await simpler(none.io, undefined)
  expect(ledger(none.mem)).toEqual([])
})

test('a fork goes through the gate; log false writes no line; a broken ledger does not stop the call', async () => {
  const a = memIo()
  await askFork(a.io, { what: 'x', log: false }, { prompt: 'k' } as never)
  expect(ledger(a.mem)).toEqual([])
  await askFork(a.io, { what: 'Asked a model: Keep the cache warm' }, { prompt: 'k' } as never)
  expect(ledger(a.mem)).toHaveLength(1)
  const calls: string[] = []
  const b = memIo(calls)
  b.io.set = async () => {
    throw new Error('disk')
  }
  expect((await askModel(b.io, { what: MODEL_SIMPLER_WHAT }, { prompt: 'q' } as never)).isAnswered).toBe(true)
  expect(calls).toEqual(['q'])
})
