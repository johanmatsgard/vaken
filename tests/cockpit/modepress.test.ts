// a mode press (Welcome card or Settings) writes a whole mode, even when two presses come quickly.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { findPreset, presetSteps } from '../hooks/core/presets'
import { forgetProjectSet } from '../hooks/core/io'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-11T12:00:00Z')
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

const allMatch = (mem: Map<string, unknown>, name: string): boolean => presetSteps(findPreset(name)!).every(st => mem.get(`cockpit:setting:${st.key}`) === st.value)

test('two quick mode presses leave one whole mode, the last one, never a mix', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done']])
  const toasts: string[] = []
  engine(on, mem, toasts)
  const pane = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await pane.press({ key: 'settings' })
  await pane.unmount()
  const again = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await Promise.all([again.press({ key: 'mode-quiet' }), again.press({ key: 'mode-full' })])
  await again.press({ key: 'mode-full' })
  await again.unmount()
  expect(allMatch(mem, 'full')).toBe(true)
  expect(toasts.some(t => /^Only alerts: \d+ settings changed/.test(t))).toBe(true)
  // picking a mode never stores Warn for the two worst kinds, so their stop when Claude Code would not ask stays
  expect(mem.has('cockpit:setting:guard.destructive')).toBe(false)
  expect(mem.has('cockpit:setting:guard.secrets')).toBe(false)
})

test('Finish on the Start here card closes the card, writes the whole mode of step 1, says so in one line, and writes no ledger line', SLOW, async ($, on) => {
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
  await pane.unmount()
  expect(mem.get('cockpit:firstrun')).toBe('done')
  expect(allMatch(mem, 'quiet')).toBe(true)
  expect(toasts).toEqual(['Your setup is on. Change any answer in Settings.'])
  expect(mem.get('cockpit:ledger:compact')).toBeUndefined()
})

test('at This project the mode card reads and sets the project\'s own rows, says This project, and leaves All projects as it was', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  forgetProjectSet()
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done'], ['cockpit:projectof:test-session', '/work/shop']])
  const toasts: string[] = []
  engine(on, mem, toasts)
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const home = await mount()
  await home.press({ key: 'settings' })
  await home.unmount()
  const all = await mount()
  await all.press({ key: 'settings-scope-project' })
  await all.unmount()
  const here = await mount()
  expect(await here.find({ type: 'Text', text: /^This project \(shop\) only: a mode press/ })).toBeDefined()
  await here.press({ key: 'mode-full' })
  await here.unmount()
  const set = mem.get('cockpit:projset:/work/shop') as Record<string, string>
  for (const st of presetSteps(findPreset('full')!)) if (st.value !== undefined) expect(set[st.key], st.key).toBe(st.value)
  for (const st of presetSteps(findPreset('full')!)) expect(mem.has(`cockpit:setting:${st.key}`), st.key).toBe(false)
  const after = await mount()
  const chosen = ((await after.findAll({ type: 'Svg' })) as { props: { alt?: string } }[]).find(x => x.props.alt === 'Everything useful, selected')
  expect(chosen).toBeDefined()
  expect(await after.find({ type: 'Text', text: /^This project \(shop\) only: a mode press/ })).toBeDefined()
  await after.unmount()
  forgetProjectSet()
})
