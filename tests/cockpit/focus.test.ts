// Focus 50 minutes: the pure rules, the toast gate that holds ordinary toasts, and the whole flow through the engine.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import type { BandItem } from '../hooks/core/band'
import { FOCUS_BAND_ID, FOCUS_KEY, FOCUS_MS, focusBand, focusEmpty, focusSummary, focusWords, isFocused, minutesLeft, parseFocus, passesFocus } from '../hooks/core/focus'
import { withToastGate } from '../hooks/core/io'
import type { Io } from '../hooks/core/io'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000

const item = (id: string, level: BandItem['level'], at = NOW - MIN): BandItem => ({ id, level, text: id, at, ttlMs: 10 * MIN })

test('Focus runs for 50 minutes; the minutes left are whole and coarse; a broken key is no Focus', () => {
  const f = { from: NOW, until: NOW + FOCUS_MS }
  expect(parseFocus(f)).toEqual(f)
  expect(parseFocus({ from: NOW, until: NOW })).toBeUndefined()
  expect(parseFocus('on')).toBeUndefined()
  expect(isFocused(f, NOW + 10 * MIN)).toBe(true)
  expect(isFocused(f, NOW + FOCUS_MS)).toBe(false)
  expect(minutesLeft(f, NOW + 18 * MIN)).toBe(32)
  expect(minutesLeft(f, NOW + FOCUS_MS - 1000)).toBe(1)
  expect(focusWords(f, NOW + 18 * MIN)).toBe('Quiet · 32 min left')
})

test('the band during Focus keeps only urgent lines and adds the Focus line; after it, every line that has not expired shows again', () => {
  const f = { from: NOW - 5 * MIN, until: NOW - 5 * MIN + FOCUS_MS }
  const items = [item('budget', 'warn'), item('did:Kept the cache warm', 'info'), item('halt', 'urgent')]
  const during = focusBand(items, f, NOW)
  expect(during.map(x => x.id)).toEqual(['halt', FOCUS_BAND_ID])
  expect(during[1]).toMatchObject({ level: 'info', text: 'Quiet · 45 min left' })
  expect(focusBand(items, f, f.until)).toEqual(items)
  expect(focusBand(items, undefined, NOW)).toEqual(items)
})

test('only a toast that says a session needs you passes Focus; the end says what happened, or that nothing did', () => {
  expect(passesFocus('"Build" needs you: asks you a question.')).toBe(true)
  expect(passesFocus('"Build" finished.')).toBe(false)
  expect(focusSummary({ finished: 2, warnings: 1 })).toBe('While it was quiet: 2 sessions finished, 1 warning.')
  expect(focusSummary({ finished: 1, warnings: 0 })).toBe('While it was quiet: 1 session finished.')
  expect(focusSummary({ finished: 0, warnings: 0 })).toBe('Quiet ended. Nothing happened while it was quiet.')
  // Ended on its timer with nothing happened: no toast; a press still gets the line
  expect(focusEmpty({ finished: 0, warnings: 0 })).toBe(true)
  expect(focusEmpty({ finished: 1, warnings: 0 })).toBe(false)
})

const settle = async (): Promise<void> => {
  for (let n = 0; n < 20; n += 1) await Promise.resolve()
}

test('through the toast gate, Focus holds an ordinary toast; a needs-you toast and an urgent one still show', async () => {
  const store = new Map<string, unknown>([[FOCUS_KEY, { from: NOW - MIN, until: NOW + FOCUS_MS }]])
  const shown: string[] = []
  const io = withToastGate({ now: async () => NOW, get: async (k: string) => store.get(k), set: async (k: string, v: unknown) => void store.set(k, v), toast: (text: string) => void shown.push(text) } as unknown as Io)
  io.toast('Kept the cache warm.')
  await settle()
  io.toast('"Build" needs you: asks you a question.')
  await settle()
  io.toast('Halted.', true)
  await settle()
  expect(shown).toEqual(['"Build" needs you: asks you a question.', 'Halted.'])
  store.delete(FOCUS_KEY)
  io.toast('Kept the cache warm.')
  await settle()
  expect(shown.at(-1)).toBe('Kept the cache warm.')
})

// The engine, as the other pane tests build it.
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
const bandProps = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} }
function engine(on: On, toasts: string[]): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:detail', 'explained']])
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
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:session:other', { sessionId: 'other', cwd: '/work/web', model: 'claude-opus-5', state: 'waiting', startedAt: NOW - 30 * MIN, updatedAt: NOW + 10 * MIN, lastEventAt: NOW + 5 * MIN, stateSince: NOW + 5 * MIN })
  return mem
}

test('Focus from /vaken-focus (the This session card has no Quiet row): the band shows the minutes left and ends it early; the end toast says what happened', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const toasts: string[] = []
  const mem = engine(on, toasts)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await $.command.run(viaParent('vaken-settings', 'detail.here explained'))
  const pane = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await pane.find({ key: 'focus-start' })).toBeUndefined()
  await pane.unmount()
  await $.command.run(viaParent('vaken-focus', ''))
  await clock.settle()
  expect(parseFocus(mem.get(FOCUS_KEY))).toEqual({ from: NOW, until: NOW + FOCUS_MS })
  await clock.advance(10 * MIN)
  const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
  expect(await band.find({ type: 'Text', text: /Quiet · 40 min left/ })).toBeDefined()
  mem.set('cockpit:ledger:compact', [{ at: NOW + 2 * MIN, what: 'Warned about a risky command', did: true, how: 'auto' }])
  await band.press({ key: 'band-focus-end' })
  await band.unmount()
  await clock.settle()
  expect(mem.has(FOCUS_KEY)).toBe(false)
  expect(toasts.at(-1)).toBe('While it was quiet: 1 session finished, 1 warning.')
  expect(((await $.command.run(viaParent('vaken-focus', ''))) as { text: string }).text).toMatch(/^Quiet is on for 50 minutes/)
  expect(((await $.command.run(viaParent('vaken-focus', ''))) as { text: string }).text).toMatch(/^Quiet: 50 min left/)
  expect(((await $.command.run(viaParent('vaken-focus', 'off'))) as { text: string }).text).toMatch(/^(While it was quiet|Quiet ended)/)
  expect(((await $.command.run(viaParent('vaken-focus', 'off'))) as { text: string }).text).toBe('Quiet is not on.')
})

test('Focus ends by itself when its time is up, in whichever session looks first, with one summary toast', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const toasts: string[] = []
  const mem = engine(on, toasts)
  mem.set(FOCUS_KEY, { from: NOW - FOCUS_MS + 10 * MIN, until: NOW + 10 * MIN })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
  expect(await band.find({ type: 'Text', text: /Quiet · 10 min left/ })).toBeDefined()
  await band.unmount()
  await clock.advance(11 * MIN)
  await clock.settle()
  expect(mem.has(FOCUS_KEY)).toBe(false)
  expect(toasts.filter(t => /it was quiet/.test(t))).toHaveLength(1)
})
