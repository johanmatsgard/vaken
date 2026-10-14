// A card that appears for the first time: one toast "New: <title>", a "new" chip on its Glance row until it is pressed open once.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { GUARD_WHATS } from '../hooks/core/guard'
import { forgetProjectSet } from '../hooks/core/io'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const MIN = 60_000
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom']])
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

function engine(on: On, toasts: string[]) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text?: string }).text ?? '')
    return { value: undefined } as never
  })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}

const session = { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, contextPercent: 38 }
const guardLine = { at: NOW - 5 * MIN, what: GUARD_WHATS[0], detail: 'a test line', did: true, how: 'auto' }

function world(mem: Map<string, unknown>, extra: Record<string, unknown>) {
  mem.set('cockpit:session:test-session', session)
  mem.set('cockpit:ledger:compact', [guardLine])
  mem.set('cockpit:setting:laptop.mode', 'off')
  for (const [k, v] of Object.entries(extra)) mem.set(k, v)
}

const mount = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })

test('a card that shows for the first time is announced once, wears a new chip, and the chip goes when it is pressed open', SLOW, async ($, on) => {
  forgetProjectSet()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = memStore(on)
  const toasts: string[] = []
  engine(on, toasts)
  // A person with a history (the first run was left) who has never seen the Guard card.
  world(mem, { 'cockpit:firstrun': 'done', 'cockpit:pref:lists': { others: 'now', agents: 'now', from: 'all', seen: [] } })
  const first = await mount($)
  expect(toasts.filter(t => t.startsWith('New card: '))).toEqual(['New card: Risky steps'])
  expect((mem.get('cockpit:pref:lists') as { seen: string[] }).seen).toEqual(['new:guard'])
  expect(await first.find({ key: 'fresh-glance-guard' })).toBeDefined()
  expect(await first.find({ key: 'fresh-glance-limit' })).toBeUndefined()
  await first.press({ key: 'press-glance-guard-0' })
  await first.unmount()
  expect((mem.get('cockpit:pref:lists') as { seen: string[] }).seen).toEqual(['seen:guard'])
  const again = await mount($)
  expect(await again.find({ key: 'fresh-glance-guard' })).toBeUndefined()
  expect(toasts.filter(t => t.startsWith('New card: '))).toEqual(['New card: Risky steps'])
  await again.unmount()
})

test('the session start makes the history: an update knows the cards it had, a new person starts empty', SLOW, async ($, on) => {
  forgetProjectSet()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = memStore(on)
  const toasts: string[] = []
  engine(on, toasts)
  world(mem, { 'cockpit:firstrun': 'done' })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  const known = (mem.get('cockpit:pref:lists') as { seen: string[] }).seen
  expect(known).toContain('seen:guard')
  expect(known.every(k => k.startsWith('seen:'))).toBe(true)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  expect((mem.get('cockpit:pref:lists') as { seen: string[] }).seen).toEqual(known)
  const old = await mount($)
  expect(toasts.filter(t => t.startsWith('New card: '))).toEqual([])
  expect(await old.find({ key: 'fresh-glance-guard' })).toBeUndefined()
  await old.unmount()
})

test('a new person (the Welcome card not closed) starts an empty history and is told about the first card', SLOW, async ($, on) => {
  forgetProjectSet()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = memStore(on)
  const toasts: string[] = []
  engine(on, toasts)
  world(mem, {})
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  expect((mem.get('cockpit:pref:lists') as { seen: string[] }).seen).toEqual([])
  const created = await mount($)
  expect(toasts.filter(t => t.startsWith('New card: '))).toEqual(['New card: Risky steps'])
  await created.unmount()
})

test('a draw with no history says and writes nothing', SLOW, async ($, on) => {
  forgetProjectSet()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = memStore(on)
  const toasts: string[] = []
  engine(on, toasts)
  world(mem, {})
  const pane = await mount($)
  expect(toasts.filter(t => t.startsWith('New card: '))).toEqual([])
  expect(mem.get('cockpit:pref:lists')).toBeUndefined()
  await pane.unmount()
})
