// The cockpit's own cost on the Computer card: counted in memory, a rate between two gauge readings, one dim line.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { withToastGate } from '../hooks/core/io'
import type { Io } from '../hooks/core/io'
import { SELF_LINE, figure, markSelfStart, noteCall, noteGauge, noteRun, noteWrite, selfCost, selfCostLine, selfCounts } from '../hooks/core/selfcost'
import { setLang, tr } from '../hooks/core/lang'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const NOW = new Date(2026, 9, 10, 22, 0).getTime()
const MIN = 60_000

test('the rate: counted from one gauge reading to the next, at least a minute apart, per minute', () => {
  markSelfStart(NOW)
  expect(selfCost()).toBeUndefined()
  for (let k = 0; k < 12; k += 1) noteWrite()
  for (let k = 0; k < 3; k += 1) noteRun()
  noteCall()
  noteGauge(NOW + 30_000, NOW + 10_000)
  noteGauge(NOW + 40_000, NOW + 10_000)
  expect(selfCost()).toBeUndefined()
  noteGauge(NOW + 3 * MIN, NOW + 3 * MIN)
  expect(selfCost()).toEqual({ writes: 4, runs: 1, calls: 1 / 3 })
  noteWrite()
  noteGauge(NOW + 3 * MIN + 20_000, NOW + 3 * MIN + 20_000)
  expect(selfCost()?.writes).toBe(4)
})

test('the line: plain words, one decimal under ten, and a Swedish line', () => {
  expect(figure(0.4)).toBe('0.4')
  expect(figure(1 / 3)).toBe('0.3')
  expect(figure(2)).toBe('2')
  expect(figure(12.6)).toBe('13')
  const c = { writes: 6, runs: 2, calls: 1 / 3 }
  expect(selfCostLine(c, s => s)).toBe('Vaken in this session, per minute: store writes 6 · programs 2 · app calls 0.3')
  expect(selfCostLine(c, s => SV[s] ?? s)).toBe('Vaken i den här sessionen, per minut: skrivningar 6 · program 2 · appanrop 0.3')
  expect(SV[SELF_LINE]).toBe(byEnglish('sv', 'selfcost')[SELF_LINE])
  expect(selfCostLine(undefined, s => s)).toBeUndefined()
})

test('every store write, delete and program through an Io is counted, in memory only', async () => {
  const store = new Map<string, unknown>()
  const base = {
    now: async () => NOW,
    get: async (k: string) => store.get(k),
    set: async (k: string, v: unknown) => void store.set(k, v),
    del: async (k: string) => void store.delete(k),
    run: async () => ({ exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
  } as unknown as Io
  const io = withToastGate(base)
  const before = selfCounts()
  await io.set('a', 1)
  await io.del('a')
  await io.run(['true'])
  const after = selfCounts()
  expect(after.writes - before.writes).toBe(2)
  expect(after.runs - before.runs).toBe(1)
  expect([...store.keys()]).toEqual([])
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
const calm = { at: NOW, schema: 3, pressure: 'normal', freeShare: 0.5, memMb: 24 * 1024, load: 4, cores: 18, battery: { hasBattery: true, onAc: true, percent: 80 }, thermal: { state: 'ok' }, procs: { count: 3, rssMb: 4198 } }

function engine(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom'], ['cockpit:firstrun', 'done'], ['cockpit:setting:laptop.mode', 'on'], ['cockpit:setting:detail', 'explained']])
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
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('agent.list', () => ({ value: [] }) as never)
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  return mem
}

test('the Computer card shows the line once the gauge saw two readings a minute or more apart; no timer and no key of its own', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:laptop:v2', calm)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await clock.advance(30_000)
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const first = await mount()
  expect(await first.find({ type: 'Text', text: /^Vaken in this session/ })).toBeUndefined()
  await first.unmount()
  mem.set('cockpit:laptop:v2', { ...calm, at: NOW + 2 * MIN })
  await clock.advance(2 * MIN)
  const second = await mount()
  expect(await second.find({ type: 'Text', text: /^Vaken in this session, per minute: store writes [\d.]+ · programs [\d.]+ · app calls [\d.]+$/ })).toBeDefined()
  await second.unmount()
  expect([...mem.keys()].some(k => k.includes('selfcost') || k.includes('cost:self'))).toBe(false)
})

test('J2: the line says 1,3 in Swedish and 1.3 in English', () => {
  const c = { writes: 44, runs: 0, calls: 1.3 }
  try {
    setLang('sv')
    expect(selfCostLine(c, tr)).toContain('skrivningar 44 · program 0 · appanrop 1,3')
    setLang('en')
    expect(selfCostLine(c, tr)).toContain('store writes 44 · programs 0 · app calls 1.3')
  } finally {
    setLang('en')
  }
})
