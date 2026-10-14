// Quiet timers: after five minutes with no tool step, prompt, turn or press, the repeating timers do their work once a minute.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { QUIET_AFTER_MS, QUIET_EVERY_MS, isQuietAt, noteActive, tickDue } from '../hooks/core/quiet'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000

test('the rule: busy runs every beat; quiet runs once a minute; activity brings the pace back at once', () => {
  noteActive(NOW)
  const runs = (from: number, to: number, every: number): number => {
    let n = 0
    for (let t = from; t <= to; t += every) if (tickDue('beat', t)) n += 1
    return n
  }
  expect(runs(NOW + 10_000, NOW + QUIET_AFTER_MS - 10_000, 10_000)).toBe(29)
  expect(isQuietAt(NOW + QUIET_AFTER_MS)).toBe(true)
  expect(runs(NOW + QUIET_AFTER_MS + 10_000, NOW + QUIET_AFTER_MS + 5 * QUIET_EVERY_MS, 10_000)).toBe(5)
  const t = NOW + QUIET_AFTER_MS + 5 * QUIET_EVERY_MS + 1_000
  noteActive(t)
  expect(isQuietAt(t + 10_000)).toBe(false)
  expect(tickDue('beat', t + 9_000)).toBe(true)
  expect(tickDue('beat', t + 19_000)).toBe(true)
})

function engine(on: On) {
  const mem = new Map<string, unknown>()
  const counts = { reads: 0 }
  on('store.get', (_$, e) => {
    counts.reads += 1
    return { value: mem.get(e.key) } as never
  })
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => {
    counts.reads += 1
    return { value: [...mem.keys()] } as never
  })
  on('session.id', () => ({ value: 'quiet-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.panes', () => ({ value: [] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  return counts
}

test('a quiet session reads the store far less often, and one tool step brings the timers back', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const counts = engine(on)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  const minute = async (): Promise<number> => {
    const before = counts.reads
    for (let k = 0; k < 6; k += 1) await clock.advance(10_000)
    return counts.reads - before
  }
  await clock.advance(30_000)
  const busy = await minute()
  for (let k = 0; k < 5; k += 1) await minute()
  const quiet = await minute()
  // Measured: 94 reads in a busy minute, 44 in a quiet one (the timers that serve a person who is away keep their pace).
  expect(quiet).toBeLessThan(busy * 0.6)
  await $.tool.call({ tool: 'Read', file_path: '/work/app/a.ts' } as never)
  const back = await minute()
  expect(back).toBeGreaterThan(quiet)
  expect(back).toBeGreaterThanOrEqual(busy * 0.7)
})
