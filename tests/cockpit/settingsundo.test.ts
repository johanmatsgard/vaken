// Undo for a mode press and the start questions' Finish (Settings > Mode's top press), and the "Changed by you" list under the modes.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { SETTINGS, findSetting } from '../hooks/core/settings'
import { changedRows } from '../hooks/core/changed'
import { PROJSET_KEY } from '../hooks/core/io'
import type { Io } from '../hooks/core/io'
import { SETTINGS_UNDO_KEY, SETTINGS_UNDO_MS, keepUndo, parseUndo, runUndo, undoFresh } from '../hooks/core/settingsundo'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'
import { rhythmProblems } from './rhythm'
import type { RNode } from './rhythm'

const NOW = Date.parse('2026-10-15T12:00:00Z')
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }

function engine(on: On, mem: Map<string, unknown>, toasts: string[]) {
  on('store.get', (_$, e) => ({ value: mem.has(e.key) ? JSON.parse(JSON.stringify(mem.get(e.key))) : undefined }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text?: string }).text ?? '')
    return { value: undefined } as never
  })
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}

const settingKeys = (mem: Map<string, unknown>): Record<string, unknown> => Object.fromEntries([...mem.entries()].filter(([k]) => k.startsWith('cockpit:setting:')).sort(([a], [b]) => a.localeCompare(b)))

// A store in memory, as the Io the core functions take
function fakeIo(mem: Map<string, unknown>, now = NOW): Io {
  return {
    get: async (k: string) => (mem.has(k) ? JSON.parse(JSON.stringify(mem.get(k))) : undefined),
    set: async (k: string, v: unknown) => void mem.set(k, JSON.parse(JSON.stringify(v))),
    del: async (k: string) => void mem.delete(k),
    now: async () => now,
  } as unknown as Io
}

test('the snapshot reads back only when whole, and shows for 10 minutes', () => {
  expect(parseUndo(undefined)).toBeUndefined()
  expect(parseUndo({ at: 'x', what: 'full', values: {} })).toBeUndefined()
  expect(parseUndo({ at: 1, what: 'full', root: 3, values: {} })).toBeUndefined()
  const u = parseUndo({ at: NOW, what: 'full', values: { 'plain.mode': null } })
  expect(u?.what).toBe('full')
  expect(undoFresh(u, NOW + 1000)).toBe(true)
  expect(undoFresh(u, NOW + SETTINGS_UNDO_MS)).toBe(false)
  expect(undoFresh(u, NOW - 1000)).toBe(false)
})

test('Undo at All projects puts back each stored value and removes the rows that had none', async () => {
  const mem = new Map<string, unknown>([['cockpit:setting:plain.mode', 'off']])
  const i = fakeIo(mem)
  await keepUndo(i, 'full', ['plain.mode', 'happened.mode', 'no.such.key'], undefined)
  expect(parseUndo(mem.get(SETTINGS_UNDO_KEY))?.values).toEqual({ 'plain.mode': 'off', 'happened.mode': null })
  mem.set('cockpit:setting:plain.mode', 'on')
  mem.set('cockpit:setting:happened.mode', 'on')
  const done = await runUndo(i)
  expect(done?.n).toBe(2)
  expect(mem.get('cockpit:setting:plain.mode')).toBe('off')
  expect(mem.has('cockpit:setting:happened.mode')).toBe(false)
  expect(mem.has(SETTINGS_UNDO_KEY)).toBe(false)
  expect(await runUndo(i)).toBeUndefined()
})

test('Undo at This project puts back only the project\'s own rows and leaves its other rows and All projects alone', async () => {
  const root = '/work/app'
  const mem = new Map<string, unknown>([[PROJSET_KEY(root), { 'plain.mode': 'off', 'look.view': 'all' }], ['cockpit:setting:plain.mode', 'on']])
  const i = fakeIo(mem)
  await keepUndo(i, 'quiet', ['plain.mode', 'happened.mode'], root)
  mem.set(PROJSET_KEY(root), { 'plain.mode': 'on', 'happened.mode': 'on', 'look.view': 'custom' })
  const done = await runUndo(i)
  expect(done?.n).toBe(2)
  expect(mem.get(PROJSET_KEY(root))).toEqual({ 'plain.mode': 'off', 'look.view': 'custom' })
  expect(mem.get('cockpit:setting:plain.mode')).toBe('on')
})

test('Changed by you lists the shown rows that differ from the mode in use, in Settings\' order', () => {
  const plain = findSetting('plain.mode')!
  const other = plain.options.find(o => o.value !== plain.default)!.value
  expect(changedRows(SETTINGS, {}, true)).toEqual([])
  const rows = changedRows(SETTINGS, { 'plain.mode': other }, true)
  expect(rows.map(r => r.key)).toContain('plain.mode')
  expect(rows.every(r => r.hidden !== true)).toBe(true)
})

test('a mode press in Settings can be undone from the mode card, exactly, and the toast says where', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done'], ['cockpit:setting:plain.mode', 'off']])
  const toasts: string[] = []
  engine(on, mem, toasts)
  const before = settingKeys(mem)
  const pane = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await pane.press({ key: 'settings' })
  await pane.redraw()
  await pane.press({ key: 'mode-full' })
  await pane.redraw()
  expect(toasts.some(t => /^Everything useful: \d+ settings changed\. Undo is at the top of Settings\.$/.test(t))).toBe(true)
  expect(settingKeys(mem)).not.toEqual(before)
  // The Undo row and the Changed by you rows keep the body rhythm
  expect(rhythmProblems((await pane.drawn()) as RNode, 'Settings with Undo')).toEqual([])
  await pane.press({ key: 'mode-undo' })
  await pane.redraw()
  await pane.unmount()
  expect(settingKeys(mem)).toEqual(before)
  expect(mem.has(SETTINGS_UNDO_KEY)).toBe(false)
  expect(toasts.some(t => /^\d+ settings are back as they were\.$/.test(t))).toBe(true)
})

test('a typed /vaken-settings preset <name> yes keeps the same Undo as a mode press', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done'], ['cockpit:setting:guard.scope', 'off']])
  engine(on, mem, [])
  const before = settingKeys(mem)
  const out = (await $.command.run({ ...viaParent('vaken-settings', 'preset careful yes'), origin: { kind: 'composer' } } as never)) as { text: string }
  expect(out.text).toMatch(/^Applied /)
  expect(parseUndo(mem.get(SETTINGS_UNDO_KEY))?.what).toBe('careful')
  expect(settingKeys(mem)).not.toEqual(before)
  expect(await runUndo(fakeIo(mem))).toBeDefined()
  expect(settingKeys(mem)).toEqual(before)
})

test('the start questions\' Finish can be undone: every row it wrote goes back to unset', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = new Map<string, unknown>()
  const toasts: string[] = []
  engine(on, mem, toasts)
  const pane = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await pane.press({ key: 'start-mode-quiet' })
  for (let n = 0; n < 5; n += 1) {
    await pane.redraw()
    await pane.press({ key: 'start-next' })
  }
  await pane.redraw()
  await pane.press({ key: 'start-finish' })
  await pane.redraw()
  expect(Object.keys(settingKeys(mem)).length).toBeGreaterThan(0)
  expect(parseUndo(mem.get(SETTINGS_UNDO_KEY))?.what).toBe('setup')
  await pane.press({ key: 'settings' })
  await pane.redraw()
  await pane.press({ key: 'mode-undo' })
  await pane.redraw()
  await pane.unmount()
  expect(settingKeys(mem)).toEqual({})
})

test('a Changed by you row puts that one setting back to what the mode sets', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const plain = findSetting('plain.mode')!
  const other = plain.options.find(o => o.value !== plain.default)!.value
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done'], ['cockpit:setting:plain.mode', other]])
  const toasts: string[] = []
  engine(on, mem, toasts)
  const pane = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await pane.press({ key: 'settings' })
  await pane.redraw()
  await pane.press({ key: 'press-mode-changed-plain.mode-0' })
  await pane.redraw()
  await pane.unmount()
  expect(mem.has('cockpit:setting:plain.mode')).toBe(false)
  expect(toasts.some(t => t.endsWith(' is back to On.') || t.endsWith(' is back to Off.'))).toBe(true)
})
