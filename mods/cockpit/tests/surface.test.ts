// The surface rule: the engine fills in EVERY element on EVERY surface, so a drawing decides by `e.surface`.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { canDrag, elementsFor, hasInput, hasSvg } from '../hooks/ui/kit'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-09T12:00:00Z')
const MIN = 60_000
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 60, offset: 0, total: 60 }, view: {} }
const bandProps = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} }

const seed = (id: string, over: Record<string, unknown>) => ({
  sessionId: id,
  cwd: `/work/${id}`,
  model: 'claude-opus-5',
  state: 'working',
  startedAt: NOW - 20 * MIN,
  updatedAt: NOW - 2000,
  lastEventAt: NOW - 2000,
  stateSince: NOW - 3 * MIN,
  ...over,
})
const world = () => ({
  'cockpit:firstrun': 'done',
  'cockpit:setting:look.view': 'custom',
  'cockpit:setting:detail': 'explained',
  'cockpit:session:test-session': seed('test-session', { cwd: '/work/app', contextPercent: 38, costUsd: 1.2, fiveHourPercent: 62, fiveHourResetsAt: '2026-10-09T18:00:00Z' }),
  'cockpit:session:s1': seed('s1', { ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 4 * MIN } }),
  'cockpit:session:s2': seed('s2', { state: 'waiting', stateSince: NOW - 12 * MIN }),
})

function engine(on: On) {
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
  // The real engine completes every table: an element the surface lacks is still a constructor (it draws an empty box there).
  on('ui.resolve', async (_$, e, next) => {
    const table = (await next(e)) as unknown as Record<string, (props: Record<string, unknown>) => unknown>
    const filled = { ...table }
    for (const name of ['Svg', 'Input', 'Select', 'Client']) filled[name] ??= () => table.Box({})
    return filled as never
  })
}

type Node = { type?: string; props?: Record<string, unknown>; children?: unknown[] }
function dump(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    if (node.trim() !== '') out.push(node)
    return out
  }
  if (node === null || typeof node !== 'object') return out
  const n = node as Node
  if (n.type === 'Button') out.push(`[${String(n.props?.label ?? '')}]`)
  for (const c of n.children ?? []) dump(c, out)
  return out
}

test('the surface helpers: Svg not in a terminal, Input not on mobile, dragging on the desktop only', () => {
  expect(['terminal', 'desktop', 'vscode', 'mobile'].map(s => hasSvg(s as never))).toEqual([false, true, true, true])
  expect(['terminal', 'desktop', 'vscode', 'mobile'].map(s => hasInput(s as never))).toEqual([true, true, true, false])
  expect(['terminal', 'desktop', 'vscode', 'mobile'].map(s => canDrag(s as never))).toEqual([false, true, false, false])
  const all = { Box: 1, Text: 2, Button: 3, Svg: 4, Input: 5, Client: 6 } as never
  const term = elementsFor(all, 'terminal')
  expect([term.Svg, term.Input !== undefined, term.Client]).toEqual([undefined, true, undefined])
  const desk = elementsFor(all, 'desktop')
  expect([desk.Svg !== undefined, desk.Input !== undefined, desk.Client !== undefined]).toEqual([true, true, true])
  const mob = elementsFor(all, 'mobile')
  expect([mob.Svg !== undefined, mob.Input, mob.Client]).toEqual([true, undefined, undefined])
})

test('the pane in a terminal has no pictures, the words stand in, and no Arrange cards; the desktop is unchanged', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, world())
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const terminal = await $.ui.mount({ plugin: 'vaken', surface: 'terminal', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  console.log(`TERMINAL PANE\n${dump(await terminal.drawn()).join('\n')}`)
  expect(await terminal.find({ type: 'Svg' })).toBeUndefined()
  expect(await terminal.find({ type: 'Client' })).toBeUndefined()
  expect(await terminal.find({ key: 'arrange' })).toBeUndefined()
  expect(await terminal.find({ key: 'settings' })).toBeDefined()
  expect(await terminal.find({ type: 'Text', text: /^5-hour limit$/ })).toBeDefined()
  expect(await terminal.find({ type: 'Text', text: /^62% used$/ })).toBeDefined()
  expect(await terminal.find({ type: 'Text', text: /asks you a question/ })).toBeDefined()
  expect(await terminal.find({ type: 'Button', text: /^[›⌄]$/ })).toBeDefined()
  expect(await terminal.find({ type: 'Text', text: /^5-hour limit 62% used$/ })).toBeDefined()
  expect(await terminal.find({ type: 'Text', text: /^◆$/ })).toBeUndefined()
  expect((await terminal.findAll({ type: 'Text', text: /^Needs you$/ })).length).toBeGreaterThanOrEqual(2)
  // No empty box where a button should be: a chevron or a press cover drawn by an Svg-less surface is a glyph or nothing.
  expect((await terminal.findAll({ type: 'Button' })).filter(b => (b.text ?? '').trim() === '')).toHaveLength(0)
  await terminal.unmount()

  const desktop = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await desktop.find({ type: 'Svg' })).toBeDefined()
  expect(await desktop.find({ key: 'arrange' })).toBeDefined()
  expect(await desktop.find({ type: 'Button', text: /^[›⌄]$/ })).toBeUndefined()
  await desktop.unmount()
  for (const surface of ['vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'vaken', surface, component: 'Pane', requestId: 'cockpit-home', props: paneProps })
    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    expect(await ui.find({ key: 'arrange' })).toBeUndefined()
    await ui.unmount()
  }
})

test('the band chip is words in a terminal and a picture on the desktop', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, world())
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  const terminal = await $.ui.mount({ plugin: 'vaken', surface: 'terminal', component: 'AbovePrompt', props: bandProps })
  expect(await terminal.find({ type: 'Svg' })).toBeUndefined()
  expect(await terminal.find({ type: 'Text', text: /62%/ })).toBeDefined()
  console.log(`TERMINAL BAND\n${dump(await terminal.drawn()).join('\n')}`)
  await terminal.unmount()
  const desktop = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
  expect(await desktop.find({ type: 'Svg' })).toBeDefined()
  await desktop.unmount()
})
