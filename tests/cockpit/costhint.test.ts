// The cost hint before a big job: samples from the session's own readings, the estimate for a run and for a big message, at most once in 10 minutes, and nothing without 5 past turns.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { HINT_KEY, HINT_KEEP, HINT_TEXT, addSample, bigPercent, hintDue, hintLine, isBigJob, parseSamples, runPercent, sampleOf } from '../hooks/core/costhint'
import type { HintSample } from '../hooks/core/costhint'
import type { Io } from '../hooks/core/io'
import { leanMem } from '../hooks/core/lean'
import { costMem, forgetHint, runHint } from '../hooks/features/costhint'
import { byEnglish } from '../hooks/i18n/table'
import { test } from './slow'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const MIN = 60_000
const SV = byEnglish('sv')
const RESET = '2026-10-16T15:00:00Z'
const long = (start: string): string => `${start} ${Array.from({ length: 125 }, (_, n) => `word${n}`).join(' ')}`
const five = (pct: number, big = false): HintSample[] => Array.from({ length: 5 }, () => ({ usd: 1, pct, big }))

test('a sample is one turn inside one window with a real cost; a reset or no cost gives none', () => {
  expect(sampleOf({ usd: 1, pct: 10, resetsAt: RESET }, { usd: 3, pct: 14, resetsAt: RESET }, true)).toEqual({ usd: 2, pct: 4, big: true })
  expect(sampleOf({ usd: 1, pct: 10, resetsAt: RESET }, { usd: 3, pct: 2, resetsAt: 'later' }, false)).toBeUndefined()
  expect(sampleOf({ usd: 1, pct: 10, resetsAt: RESET }, { usd: 1, pct: 12, resetsAt: RESET }, false)).toBeUndefined()
  expect(sampleOf(undefined, { usd: 3, pct: 14, resetsAt: RESET }, false)).toBeUndefined()
  let list: HintSample[] = []
  for (let n = 0; n < HINT_KEEP + 5; n += 1) list = addSample(list, { usd: 1, pct: n, big: false })
  expect(list.length).toBe(HINT_KEEP)
  expect(parseSamples([{ usd: 1, pct: 2, big: false }, { usd: -1, pct: 2, big: false }, 'x', null])).toEqual([{ usd: 1, pct: 2, big: false }])
})

test('a big job is a long message that starts work; a long question or a short order is not', () => {
  expect(isBigJob(long('Build'))).toBe(true)
  expect(isBigJob(long('Please refactor'))).toBe(true)
  expect(isBigJob(long('Why does'))).toBe(false)
  expect(isBigJob('Build the login page')).toBe(false)
})

test('the estimates need 5 past turns: a run from points per dollar, a big message from the past big jobs', () => {
  expect(runPercent(five(2).slice(0, 4), 3)).toBeUndefined()
  expect(runPercent(five(2), 3)).toBe(6)
  expect(runPercent(five(2), 0)).toBeUndefined()
  expect(bigPercent(five(4, false))).toBeUndefined()
  expect(bigPercent([...five(4, true), { usd: 1, pct: 100, big: false }])).toBe(4)
})

test('the line: whole points, at most 100, nothing under one point; Swedish too', () => {
  expect(hintLine(6.4)).toBe('This may use about 6% of your 5-hour window.')
  expect(hintLine(250)).toBe('This may use about 100% of your 5-hour window.')
  expect(hintLine(0.4)).toBeUndefined()
  expect(hintLine(undefined)).toBeUndefined()
  expect(SV[HINT_TEXT] ?? '').not.toBe('')
  expect(HINT_TEXT).not.toContain('—')
  expect(hintDue(undefined, NOW)).toBe(true)
  expect(hintDue(NOW - 9 * MIN, NOW)).toBe(false)
  expect(hintDue(NOW - 10 * MIN, NOW)).toBe(true)
})

const ioOf = (mem: Map<string, unknown>, clock: { now: number }): Io => ({
  now: async () => clock.now,
  home: async () => '',
  sessionId: async () => 'me',
  get: async key => mem.get(key),
  set: async (key, value) => void mem.set(key, value),
  del: async key => void mem.delete(key),
  keys: async () => [...mem.keys()],
  read: async () => '',
  write: async () => undefined,
  run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
  ask: async () => '',
  complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
  toast: () => undefined,
  invalidate: () => undefined,
})

test('a task run: the line from the history, once in 10 minutes, and none with the Lean session row Off or too little history', async () => {
  forgetHint()
  leanMem.mode = 'logs'
  const clock = { now: NOW }
  const mem = new Map<string, unknown>()
  const io = ioOf(mem, clock)
  const same = (s: string): string => s
  expect(await runHint(io, 3, same)).toBeUndefined()
  mem.set(HINT_KEY, five(2))
  expect(await runHint(io, 3, same)).toBe('This may use about 6% of your 5-hour window.')
  expect(costMem.shownAt).toBe(NOW)
  clock.now += 5 * MIN
  expect(await runHint(io, 3, same)).toBeUndefined()
  clock.now += 5 * MIN
  leanMem.mode = 'off'
  expect(await runHint(io, 3, same)).toBeUndefined()
  leanMem.mode = 'logs'
  expect(await runHint(io, 3, same)).toBe('This may use about 6% of your 5-hour window.')
  forgetHint()
})

function world(on: On) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:firstrun': 'done', 'cockpit:awake:asked': 1, 'cockpit:phone:asked': 1 }))
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
  mock.session(on)
  on('session.id', () => ({ value: 'me' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.root', () => ({ value: '/w' }) as never)
  on('session.cwd', () => ({ value: '/w' }) as never)
  on('session.surfaces', () => ({ value: ['desktop'] }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('mcp.call', () => ({ value: { content: [], isError: true } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  return { clock, mem }
}

const measure = async ($: EngineInterface, usd: number, pct: number): Promise<void> => {
  await $.session.measure({ changed: ['cost'], cost: { usd }, context: { percent: 10 }, rateLimits: [{ kind: 'five_hour', percentUsed: pct, resetsAt: RESET }] } as never)
}

test('the session learns from its own turns; after 5 big jobs a big message gets one calm line on the band, a short one none', { timeoutMs: 30_000 }, async ($, on) => {
  const w = world(on)
  await $.session.start({ cwd: '/w', surface: 'desktop', isInteractive: true } as never)
  let usd = 1
  let pct = 10
  await measure($, usd, pct)
  for (let n = 0; n < 6; n += 1) {
    await $.prompt.submit({ text: long('Build'), origin: { kind: 'composer' } } as never)
    await $.turn.start({ text: 'go', turnId: `t${n}` } as never)
    usd += 2
    pct += 3
    await measure($, usd, pct)
    await w.clock.advance(MIN)
  }
  const kept = parseSamples(w.mem.get(HINT_KEY))
  expect(kept.length).toBeGreaterThanOrEqual(5)
  expect(kept.every(s => s.big && s.usd === 2 && s.pct === 3)).toBe(true)
  // Only numbers are kept, never a word of the message.
  expect(JSON.stringify(w.mem.get(HINT_KEY))).not.toContain('word')
  expect(((w.mem.get('cockpit:band:me') ?? []) as { id: string }[]).some(x => x.id === 'costhint')).toBe(false)
  await $.prompt.submit({ text: 'Build the login page', origin: { kind: 'composer' } } as never)
  expect(((w.mem.get('cockpit:band:me') ?? []) as { id: string }[]).some(x => x.id === 'costhint')).toBe(false)
  await $.prompt.submit({ text: long('Build'), origin: { kind: 'composer' } } as never)
  const band = (w.mem.get('cockpit:band:me') ?? []) as { id: string; text: string; level: string }[]
  expect(band.filter(x => x.id === 'costhint')).toEqual([expect.objectContaining({ text: 'This may use about 3% of your 5-hour window.', level: 'info' })])
})
