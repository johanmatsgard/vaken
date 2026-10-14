// Hot notes: kept in memory, read from memory at once, saved at most every few seconds, never twice the same.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { OWN_SAVE_EVERY_MS, SAVE_EVERY_MS, flushNotes, forgetNote, holdNote, readNote, useLater, waitingNotes } from '../hooks/core/flush'
import type { Io } from '../hooks/core/io'

const NOW = Date.parse('2026-10-10T12:00:00Z')

function fake() {
  const mem = new Map<string, unknown>()
  const writes: string[] = []
  let now = NOW
  const timers: { at: number; run: () => void }[] = []
  const i = {
    now: async () => now,
    get: async (key: string) => mem.get(key),
    set: async (key: string, value: unknown) => {
      writes.push(key)
      mem.set(key, value)
    },
  } as unknown as Io
  // Moves the clock and runs each timer that came due, as the engine's would.
  const advance = async (ms: number): Promise<void> => {
    now += ms
    for (const t of timers.filter(x => x.at <= now)) {
      timers.splice(timers.indexOf(t), 1)
      t.run()
    }
    for (let k = 0; k < 100; k += 1) await Promise.resolve()
  }
  useLater((ms, run) => timers.push({ at: now + ms, run }))
  return { i, mem, writes, advance }
}

test('a hot note is read from memory at once, saved at most every few seconds, and not saved again when it did not change', async () => {
  const w = fake()
  await holdNote(w.i, 'k', { n: 1 }, 'soon')
  expect(w.writes).toEqual(['k'])
  await holdNote(w.i, 'k', { n: 2 }, 'soon')
  await holdNote(w.i, 'k', { n: 3 }, 'soon')
  expect(await readNote(w.i, 'k')).toEqual({ n: 3 })
  expect(w.mem.get('k')).toEqual({ n: 1 })
  expect(w.writes).toHaveLength(1)
  await w.advance(SAVE_EVERY_MS)
  expect(w.mem.get('k')).toEqual({ n: 3 })
  expect(w.writes).toHaveLength(2)
  await w.advance(SAVE_EVERY_MS)
  await holdNote(w.i, 'k', { n: 3 }, 'soon')
  await w.advance(SAVE_EVERY_MS)
  expect(w.writes).toHaveLength(2)
  const got = (await readNote(w.i, 'k')) as { n: number }
  got.n = 99
  expect(await readNote(w.i, 'k')).toEqual({ n: 3 })
  w.mem.set('other', 7)
  expect(await readNote(w.i, 'other')).toBe(7)
  useLater(undefined)
})

test('an own note waits up to half a minute; a ride waits for the next save; now saves at once; a flush saves everything; a forgotten note is never saved', async () => {
  const w = fake()
  await holdNote(w.i, 'own', 1, 'own')
  await holdNote(w.i, 'ride', 1, 'ride')
  // A note never saved goes at once, whatever its pace (a ride has no pace of its own: it waits for a flush).
  expect(w.writes).toEqual(['own'])
  await holdNote(w.i, 'own', 2, 'own')
  await w.advance(SAVE_EVERY_MS)
  expect(w.writes).toEqual(['own'])
  await w.advance(OWN_SAVE_EVERY_MS)
  expect(w.writes).toEqual(['own', 'own'])
  await holdNote(w.i, 'own', 3, 'now')
  expect(w.writes).toEqual(['own', 'own', 'own'])
  await holdNote(w.i, 'gone', 1, 'now')
  await holdNote(w.i, 'gone', 2, 'soon')
  forgetNote('gone')
  expect(waitingNotes()).toEqual(['ride'])
  await flushNotes()
  expect(w.writes).toEqual(['own', 'own', 'own', 'gone', 'ride'])
  expect(w.mem.get('ride')).toBe(1)
  await w.advance(OWN_SAVE_EVERY_MS)
  expect(w.mem.get('gone')).toBe(1)
  useLater(undefined)
})

test('without a timer (before the session start) every note is saved at once, as before', async () => {
  const w = fake()
  useLater(undefined)
  await holdNote(w.i, 'k', 1, 'own')
  await holdNote(w.i, 'k', 2, 'soon')
  await holdNote(w.i, 'k', 3, 'ride')
  await holdNote(w.i, 'k', 3, 'ride')
  expect(w.writes).toEqual(['k', 'k', 'k'])
})

function engine(on: On, onTool: (tool: string) => void = () => undefined) {
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
  on('session.id', () => ({ value: 'flush-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.panes', () => ({ value: [] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('session.surfaces', () => ({ value: ['desktop'] }) as never)
  on('turn.complete', (_$, e) => ({ text: (e as { answer?: string }).answer ?? '' }) as never)
  on('tool.call', (_$, e) => {
    onTool(String(e.tool))
    return { result: { text: 'ok' } } as never
  })
  on('fs.read', () => ({ value: 'export const a = 1\n' }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  return mem
}
const RECORD = 'cockpit:session:flush-session'
const PROOF = 'cockpit:proof:flush-session'
type Rec = { state?: string; ask?: unknown; updatedAt?: number }

test('through the plugin: a question shows in the store at once, an edit waits, and the end of a turn saves the record and the proof counts', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  let asked: Rec | undefined
  const mem = engine(on, tool => {
    if (tool === 'AskUserQuestion') asked = mem.get(RECORD) as Rec
  })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await clock.advance(SAVE_EVERY_MS)
  await $.tool.call({ tool: 'AskUserQuestion', questions: [] } as never)
  expect(asked?.ask).toBeDefined()
  expect((mem.get(RECORD) as Rec).ask).toBeUndefined()
  await clock.advance(1_000)
  await $.tool.call({ tool: 'Edit', file_path: '/work/app/a.ts', old_string: 'a', new_string: 'b' } as never)
  await clock.advance(1_000)
  await $.tool.call({ tool: 'Edit', file_path: '/work/app/b.ts', old_string: 'a', new_string: 'b' } as never)
  const before = (mem.get(PROOF) as { edits?: number } | undefined)?.edits ?? 0
  expect(before).toBeLessThan(2)
  await $.turn.complete({ answer: 'Done.', durationMs: 30_000, isAborted: false, turnId: 't1', reason: 'answer' } as never).catch(() => undefined)
  expect((mem.get(RECORD) as Rec).state).toBe('waiting')
  expect((mem.get(PROOF) as { edits?: number }).edits).toBe(2)
})

test('through the plugin: steps that only say "still working" do not write the record; the heartbeat does, inside the stale limit', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = engine(on)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await $.tool.call({ tool: 'Read', file_path: '/work/app/a.ts' } as never)
  await clock.advance(SAVE_EVERY_MS)
  const first = (mem.get(RECORD) as Rec).updatedAt ?? 0
  for (let n = 0; n < 5; n += 1) {
    await clock.advance(2_000)
    await $.tool.call({ tool: 'Read', file_path: `/work/app/r${n}.ts` } as never)
  }
  await clock.settle()
  expect((mem.get(RECORD) as Rec).updatedAt).toBe(first)
  await clock.advance(30_000)
  expect((mem.get(RECORD) as Rec).updatedAt ?? 0).toBeGreaterThan(first)
})
