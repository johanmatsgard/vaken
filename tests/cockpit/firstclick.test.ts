// The first-click press: a see-through Client over a Button or a row runs the part's own action on a pointer down and up.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { APPEARS } from '../hooks/core/cardrules'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { FIRST_CLICK_REPEAT_MS, hoverScope, registerPress, runPress, clientKey as fcKey } from '../hooks/ui/firstclick'
import { HIT_MIN_H } from '../hooks/ui/tokens'
import { test } from './slow'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const MIN = 60_000

const props = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 120, offset: 0, total: 120 }, view: {} }

function engine(on: On, mem: Map<string, unknown>) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('fs.write', () => ({ value: undefined }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return clock
}

const task = (n: number, text: string, over: Record<string, unknown>) => ({ n, text, role: 'builder', model: 'auto', folder: true, state: 'waiting', tries: 0, check: 'none', ...over })
const world = () =>
  new Map<string, unknown>(Object.entries({
    ...Object.fromEntries(Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show'])),
    'cockpit:firstrun': 'done',
    'cockpit:session:test-session': { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'waiting', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, contextPercent: 99, costUsd: 1.2 },
    'cockpit:orch:test-session': {
      id: 'r1',
      name: 'Task run',
      status: 'running',
      createdAt: NOW - 20 * MIN,
      startedAt: NOW - 10 * MIN,
      choices: { atOnce: 3, check: '', reviewer: false, helperMin: 30, helperUsd: 2, runUsd: 10 },
      tasks: [task(1, 'Fix the header', { state: 'running', startedAt: NOW - 5 * MIN }), task(2, 'Write the docs', { state: 'failed', startedAt: NOW - 9 * MIN, endedAt: NOW - 8 * MIN, path: '/w/x', branch: 'b' })],
    },
  }))

test('the repeat guard: a second press on the same part inside the window is ignored, a later one runs, a part nobody registered does nothing', async () => {
  let n = 0
  registerPress('fc-unit', () => void (n += 1))
  expect(runPress('fc-unit', 1000)).toBe('ran')
  expect(runPress('fc-unit', 1000 + FIRST_CLICK_REPEAT_MS - 1)).toBe('repeat')
  expect(runPress('fc-unit', 1000 + FIRST_CLICK_REPEAT_MS)).toBe('ran')
  expect(n).toBe(2)
  expect(runPress('fc-nobody', 5)).toBe('none')
})

test('a pointer down and up on a part\'s Client runs its action once, a fast double once, a press ending outside never; Enter on the Button still works', async ($, on) => {
  const mem = world()
  const clock = engine(on, mem)
  forgetProjectSet()
  forgetStartCheck()
  delete checkShown.sig
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props })
  const at = (type: 'down' | 'up', key: string, x = 1, y = 0) => ui.pointer({ type, x, y, button: 'left', in: key })
  const press = async (key: string) => {
    await at('down', key)
    await at('up', key)
    await ui.redraw()
  }
  if ((await ui.find({ key: 'ol-tasks' })) === undefined) {
    await ui.press({ key: 'press-glance-agents-0' })
    await ui.redraw()
  }
  expect(await ui.find({ key: 'ol-task:2' }), 'the task row is drawn').toBeDefined()
  expect(await ui.find({ key: fcKey('ol-task:2') }), 'its first-click Client is laid').toBeDefined()
  expect(await ui.find({ key: 'press-ol-task:2-0' }), 'its Button is still there for the keyboard').toBeDefined()
  expect(await ui.find({ key: 'task-retry-2' })).toBeUndefined()
  await press(fcKey('ol-task:2'))
  expect(await ui.find({ key: 'task-retry-2' }), 'one press opens the task').toBeDefined()
  await press(fcKey('ol-task:2'))
  expect(await ui.find({ key: 'task-retry-2' }), 'a fast second press is ignored').toBeDefined()
  await clock.advance(FIRST_CLICK_REPEAT_MS + 100)
  await press(fcKey('ol-task:2'))
  expect(await ui.find({ key: 'task-retry-2' }), 'a later press shuts it').toBeUndefined()
  await clock.advance(FIRST_CLICK_REPEAT_MS + 100)
  await at('down', fcKey('ol-task:2'))
  await ui.pointer({ type: 'up', x: -3, y: 0, button: 'left', in: fcKey('ol-task:2') })
  await ui.redraw()
  expect(await ui.find({ key: 'task-retry-2' }), 'an up outside does nothing').toBeUndefined()
  await ui.press({ key: 'press-ol-task:2-0' })
  await ui.redraw()
  expect(await ui.find({ key: 'task-retry-2' }), 'the Button still opens it').toBeDefined()
  await ui.press({ key: 'press-ol-task:2-0' })
  await ui.redraw()
  expect(await ui.find({ key: fcKey('settings') })).toBeDefined()
  await press(fcKey('settings'))
  expect(await ui.find({ key: 'settings-done' }), 'Settings is open').toBeDefined()
  expect(await ui.find({ key: fcKey('settings-done') }), 'Back has its Client').toBeDefined()
  await clock.advance(FIRST_CLICK_REPEAT_MS + 100)
  await press(fcKey('settings-done'))
  expect(await ui.find({ key: 'settings-done' }), 'Back returned').toBeUndefined()
  await ui.unmount()
})

test('a terminal draws no first-click Client: the Button alone presses', async ($, on) => {
  const mem = world()
  engine(on, mem)
  forgetProjectSet()
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'terminal', component: 'Pane', requestId: 'cockpit-home', props })
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  expect(await ui.find({ key: 'settings' })).toBeDefined()
  await ui.unmount()
})

// : every More, Less or Fold of a Glance row is a framed word: its box draws the rounded frame (a named picture) under its word.
test('every More, Less or Fold in a Glance row is a rounded framed word (items 135, 136); one with its own press knows the height of its box', async ($, on) => {
  const mem = world()
  engine(on, mem)
  forgetProjectSet()
  forgetStartCheck()
  delete checkShown.sig
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: { ...props, bodyColumns: 120 } })
  if ((await ui.find({ key: 'ol-tasks' })) === undefined) {
    await ui.press({ key: 'press-glance-agents-0' })
    await ui.redraw()
  }
  type N = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
  const walkN = (n: unknown): N[] => (n !== null && typeof n === 'object' ? [n as N, ...((n as N).children ?? []).flatMap(walkN)] : [])
  const words = walkN(await ui.drawn()).filter(n => String(n.key ?? n.props?.key ?? '').startsWith('fcw-detail-'))
  expect(words.length, 'a More, Less or Fold is drawn').toBeGreaterThan(0)
  for (const w of words) {
    const pic = walkN(w).find(n => n.type === 'Svg')
    expect(String(pic?.props?.source), `${String(w.key ?? w.props?.key)} wears the rounded frame`).toContain('rx=')
    expect(String(pic?.props?.alt ?? ''), 'the frame is named (an unnamed picture is not drawn)').not.toBe('')
  }
  const clients = ((await ui.findAll({ type: 'Client' })) as { key?: string; props: { props?: { look?: string; h?: number } } }[]).filter(c => String(c.key ?? '').startsWith(fcKey('detail-')))
  for (const c of clients) {
    expect(c.props.props?.h, `${c.key} knows the height of its box`).toBe(HIT_MIN_H)
    expect(['lit', 'button']).toContain(c.props.props?.look)
  }
  await ui.unmount()
})

test('R9: a hover group name is short, kept to the Client key\'s letters, and the same for the same part', () => {
  expect(hoverScope('ol-section:Notices')).toBe('hv-ol-section_3a_Notices')
  expect(hoverScope('x'.repeat(200)).length).toBeLessThanOrEqual(64)
})

test('P-6: clientKey keeps letters, digits and "-", writes every other character as its code, and never merges two keys', () => {
  expect(fcKey('ol-section:Notices')).toBe('fc-ol-section_3a_Notices')
  expect(fcKey('sw-undo.mode')).toBe('fc-sw-undo_2e_mode')
  expect(fcKey('ol-section:Plan and cost')).toBe('fc-ol-section_3a_Plan_20_and_20_cost')
  const keys = ['a:b', 'a_3a_b', 'a.b', 'a b', 'a-b', 'a_b']
  expect(new Set(keys.map(fcKey)).size).toBe(keys.length)
  for (const k of keys) expect(fcKey(k)).toMatch(/^fc-[A-Za-z0-9_-]+$/)
})
