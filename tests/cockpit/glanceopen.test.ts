// The open forms of three cards at the Glance look: This session.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { APPEARS } from '../hooks/core/cardrules'
import { forgetProjectSet } from '../hooks/core/io'
import { emptyState } from '../hooks/core/proof'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const MIN = 60_000

const props = (cols: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: cols, placement: 'inline' as const, scroll: { bodyRows: 120, offset: 0, total: 120 }, view: {} })

type Ui = Awaited<ReturnType<Parameters<Parameters<typeof test>[1]>[0]['ui']['mount']>>

function engine(on: On, mem: Map<string, unknown>) {
  mock.clock(on, { now: NOW })
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
}

const task = (n: number, text: string, over: Record<string, unknown>) => ({ n, text, role: 'builder', model: 'auto', folder: true, state: 'waiting', tries: 0, check: 'none', ...over })
const LONG = 'Rewrite the whole settings screen so that it matches the new design and keeps every old switch'
const run = (long = false) => ({
  id: 'r1',
  name: 'Task run',
  status: 'running',
  createdAt: NOW - 20 * MIN,
  startedAt: NOW - 10 * MIN,
  choices: { atOnce: 3, check: '', reviewer: false, helperMin: 30, helperUsd: 2, runUsd: 10 },
  // The failed task is second, so the order of the file and the order drawn at Glance differ.
  tasks: [
    task(1, long ? LONG : 'Fix the header', { state: 'running', startedAt: NOW - 5 * MIN }),
    task(2, long ? `${LONG} and the docs` : 'Write the docs', { state: 'failed', startedAt: NOW - 9 * MIN, endedAt: NOW - 8 * MIN, path: '/w/x', branch: 'b' }),
    task(3, 'Add a test', { state: 'done', startedAt: NOW - 9 * MIN, endedAt: NOW - 6 * MIN }),
  ],
})

const world = (over: Record<string, unknown> = {}) => {
  const mem = new Map<string, unknown>(Object.entries({
    ...Object.fromEntries(Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show'])),
    'cockpit:firstrun': 'done',
    'cockpit:session:test-session': { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'waiting', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, contextPercent: 99, costUsd: 1.2 },
    ...over,
  }))
  return mem
}

async function mount($: Parameters<Parameters<typeof test>[1]>[0], on: On, mem: Map<string, unknown>, cols = 60): Promise<Ui> {
  forgetProjectSet()
  forgetStartCheck()
  delete checkShown.sig
  engine(on, mem)
  return $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: props(cols) })
}

// The keys of every drawn element, in the order they are drawn, without the invisible press covers.
const keysOf = async (ui: Ui): Promise<string[]> =>
  (await ui.findAll({})).map(e => (e as { key?: string }).key ?? '').filter(k => k !== '' && !/^(cover|press|fc|fcw)-/.test(k) && !/^(cover-end|press-end)-/.test(k))
const at = (keys: string[], key: string): number => {
  const n = keys.indexOf(key)
  expect(n, `${key} is drawn (${keys.slice(0, 60).join(' ')})`).toBeGreaterThanOrEqual(0)
  return n
}
const has = async (ui: Ui, text: string | RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
async function openCard(ui: Ui, id: string, marker: string) {
  if ((await ui.find({ key: marker })) === undefined) {
    await ui.press({ key: `press-glance-${id}-0` })
    await ui.redraw()
  }
  expect(await ui.find({ key: marker }), `${id} is open`).toBeDefined()
}

test('Agents with a task run at Glance: the task that failed first, "n. text" and its word, the controls after the rows, a press opens a task', SLOW, async ($, on) => {
  const ui = await mount($, on, world({ 'cockpit:orch:test-session': run() }))
  await openCard(ui, 'agents', 'ol-tasks')
  const keys = await keysOf(ui)
  // The run is a row of its own, then the tasks with a problem, then the others in their order, then the controls.
  expect(at(keys, 'ol-tasks')).toBeLessThan(at(keys, 'ol-task:2'))
  expect(at(keys, 'ol-task:2')).toBeLessThan(at(keys, 'ol-task:1'))
  expect(at(keys, 'ol-task:1')).toBeLessThan(at(keys, 'ol-task:3'))
  expect(at(keys, 'ol-task:3')).toBeLessThan(at(keys, 'run-pause'))
  expect(at(keys, 'run-pause')).toBeLessThan(at(keys, 'run-stop'))
  expect(keys.some(k => /^t-\d$/.test(k)), 'no Full-look task row at Glance').toBe(false)
  for (const text of ['1. Fix the header', '2. Write the docs', '3. Add a test']) expect(await has(ui, text), text).toBe(true)
  // Failed is in the red state colour at Glance too, the age beside it plain
  expect((await ui.find({ type: 'Text', text: 'Failed' }))?.props?.color).toBeDefined()
  expect(await has(ui, /^ · 8 min ago$/)).toBe(true)
  expect(await has(ui, /^Running · 5 min$/)).toBe(true)
  expect(await has(ui, /^Done · 6 min ago$/)).toBe(true)
  expect(await has(ui, 'Task run')).toBe(true)
  expect(await has(ui, '1 of 3 done')).toBe(true)
  // The header says "1 failed", so the line under the bar does not say it again
  expect(await has(ui, '1 running')).toBe(true)
  expect(await ui.find({ key: 'task-retry-2' })).toBeUndefined()
  await ui.press({ key: 'press-ol-task:2-0' })
  await ui.redraw()
  expect(await has(ui, 'Task: Write the docs')).toBe(true)
  expect(await ui.find({ key: 'task-retry-2' })).toBeDefined()
  expect(await ui.find({ key: 'task-keep-2' })).toBeDefined()
  expect(await ui.find({ key: 'task-stop-2' })).toBeUndefined()
  const open = await keysOf(ui)
  expect(at(open, 'w-task:2-open')).toBeGreaterThan(at(open, 'ol-task:2'))
  expect(at(open, 'w-task:2-open')).toBeLessThan(at(open, 'ol-task:1'))
  await ui.press({ key: 'press-ol-task:2-0' })
  await ui.redraw()
  expect(await ui.find({ key: 'task-retry-2' })).toBeUndefined()
  await ui.unmount()
})

for (const [look, name] of [['simple', 'Short'], ['explained', 'Full']] as const) {
  test(`Agents with a task run at the ${name} look keeps the old order: the summary line, the controls, then the tasks as the file has them`, async ($, on) => {
    const ui = await mount($, on, world({ 'cockpit:orch:test-session': run(), 'cockpit:setting:detail': look }))
    const keys = await keysOf(ui)
    expect(keys.some(k => k === 'glance-agents'), 'no Glance row').toBe(false)
    expect(keys.some(k => k.startsWith('ol-task:')), 'no Glance task row').toBe(false)
    expect(at(keys, 'run-pause')).toBeLessThan(at(keys, 't-1'))
    expect(at(keys, 't-1')).toBeLessThan(at(keys, 't-2'))
    expect(at(keys, 't-2')).toBeLessThan(at(keys, 't-3'))
    expect(await has(ui, 'Task run')).toBe(true)
    // The bar line says the one count, the line under it the rest (the run's name once)
    expect(await has(ui, '1 of 3 done')).toBe(true)
    // The header says "1 failed", so the line under the bar does not say it again
  expect(await has(ui, '1 running')).toBe(true)
    await ui.unmount()
  })
}

test('the open Run one task row at Glance: Goal is a row with the goal text under it and Start is the last control', async ($, on) => {
  const ui = await mount($, on, world({ 'cockpit:proof:test-session': { ...emptyState(), goal: { text: 'Add a dark mode toggle', setAt: NOW, how: 'typed' } } }))
  await openCard(ui, 'agents', 'ol-start-task')
  expect(await ui.find({ key: 'start-go' })).toBeUndefined()
  await ui.press({ key: 'press-ol-start-task-0' })
  await ui.redraw()
  const keys = await keysOf(ui)
  const own = keys.filter(k => k.startsWith('start-') && k !== 'start-task')
  expect(own[0]).toBe('start-goal')
  expect(own.at(-1)).toBe('start-go')
  expect(at(keys, 'ol-start-task')).toBeLessThan(at(keys, 'start-goal'))
  expect(own.some(k => k.startsWith('start-done-')), `the switches are between: ${own.join(' ')}`).toBe(true)
  const goal = (await ui.find({ key: 'start-goal' })) as { text?: string } | undefined
  expect(goal?.text).toContain('Goal')
  expect(goal?.text).toContain('Add a dark mode toggle')
  expect(await has(ui, 'Add a dark mode toggle')).toBe(true)
  expect(await has(ui, /^Goal$/)).toBe(true)
  await ui.unmount()
})

test('the open Run one task row with no goal says to add a task, and its one button leads there', async ($, on) => {
  const ui = await mount($, on, world())
  await openCard(ui, 'agents', 'ol-start-task')
  await ui.press({ key: 'press-ol-start-task-0' })
  await ui.redraw()
  expect(await has(ui, 'No goal yet. Add a task to start a run.')).toBe(true)
  const own = (await keysOf(ui)).filter(k => k.startsWith('start-') && k !== 'start-task')
  expect(own.at(-1)).toBe('start-go')
  await ui.unmount()
})

test('This session at Glance with advice to compact: the state row, then the advice and Compact now, then the facts; the context percent is not a sentence', async ($, on) => {
  const ui = await mount($, on, world())
  await openCard(ui, 'here', 'ol-here')
  const keys = await keysOf(ui)
  expect(at(keys, 'glance-here')).toBeLessThan(at(keys, 'ol-here'))
  expect(at(keys, 'compact-advice')).toBe(at(keys, 'ol-here') + 1)
  expect(at(keys, 'compact-now')).toBeGreaterThan(at(keys, 'compact-advice'))
  expect(at(keys, 'compact-now')).toBeLessThan(at(keys, 'here-cost'))
  expect(at(keys, 'here-cost')).toBeLessThan(at(keys, 'here-ctx'))
  expect(await has(ui, 'State')).toBe(true)
  expect(await has(ui, 'Your turn')).toBe(true)
  // The headline is the state and the cost (at 60 columns it may yield to the state alone); never the context
  expect(await has(ui, /^Your turn( · \$1\.20)?$/)).toBe(true)
  expect(await has(ui, /Context \d+% full/)).toBe(false)
  expect(await has(ui, /Context is \d+% full/)).toBe(false)
  expect(await has(ui, /^\d+% of context used/)).toBe(false)
  await ui.unmount()
})

test('This session at the Full look keeps its old order: the context bar and its percent before the advice', async ($, on) => {
  const ui = await mount($, on, world({ 'cockpit:setting:detail': 'explained' }))
  const keys = await keysOf(ui)
  expect(at(keys, 'ctx-bar')).toBeLessThan(at(keys, 'compact-advice'))
  // The percent sits beside the bar; the sentence is not said twice
  expect(await has(ui, /^99%$/)).toBe(true)
  await ui.unmount()
})

test('in Swedish the three open forms have Swedish labels and keep no English label', async ($, on) => {
  const mem = world({
    'cockpit:setting:look.language': 'sv',
    'cockpit:orch:test-session': run(),
    'cockpit:proof:test-session': { ...emptyState(), goal: { text: 'Add a dark mode toggle', setAt: NOW, how: 'typed' } },
  })
  const ui = await mount($, on, mem)
  await openCard(ui, 'here', 'ol-here')
  await openCard(ui, 'agents', 'ol-tasks')
  expect(await has(ui, 'Status')).toBe(true)
  expect(await has(ui, 'State')).toBe(false)
  expect(await has(ui, 'Cost')).toBe(false)
  expect(await has(ui, 'Kostnad')).toBe(true)
  expect((await ui.find({ key: 'compact-now' }) as { props?: { label?: string } } | undefined)?.props?.label?.trim()).toBe('Komprimera nu')
  expect((await ui.find({ key: 'run-pause' }) as { props?: { label?: string } } | undefined)?.props?.label?.trim()).toBe('Pausa')
  expect((await ui.find({ key: 'run-stop' }) as { props?: { label?: string } } | undefined)?.props?.label?.trim()).toBe('Stoppa alla')
  expect(await has(ui, 'Gick fel')).toBe(true)
  expect(await has(ui, 'Körs')).toBe(true)
  expect(await has(ui, 'Klar')).toBe(true)
  expect(await has(ui, 'Uppgiftskörning')).toBe(true)
  expect(await has(ui, 'Failed')).toBe(false)
  expect(await has(ui, 'Running')).toBe(false)
  expect(await has(ui, 'Task run')).toBe(false)
  await ui.unmount()
})

test('in Swedish the open Run one task row has Swedish labels', SLOW, async ($, on) => {
  const ui = await mount($, on, world({ 'cockpit:setting:look.language': 'sv', 'cockpit:proof:test-session': { ...emptyState(), goal: { text: 'Add a dark mode toggle', setAt: NOW, how: 'typed' } } }))
  await openCard(ui, 'agents', 'ol-start-task')
  await ui.press({ key: 'press-ol-start-task-0' })
  await ui.redraw()
  expect(await has(ui, 'Mål')).toBe(true)
  expect(await has(ui, 'Goal')).toBe(false)
  expect(await has(ui, 'Run one task')).toBe(false)
  expect(await has(ui, 'Kör en uppgift')).toBe(true)
  expect(((await ui.find({ key: 'start-go' })) as { props?: { label?: string } } | undefined)?.props?.label).toBeDefined()
  await ui.unmount()
})

for (const cols of [40, 160]) {
  test(`at ${cols} columns no task row hides its state word, and the three forms keep their order`, async ($, on) => {
    const ui = await mount($, on, world({ 'cockpit:orch:test-session': run(true) }), cols)
    await openCard(ui, 'here', 'ol-here')
    await openCard(ui, 'agents', 'ol-tasks')
    expect((await ui.find({ type: 'Text', text: 'Failed' }))?.props?.color, 'Failed').toBeDefined()
    expect(await has(ui, /^ · 8 min ago$/), 'Failed age').toBe(true)
    expect(await has(ui, /^Running · 5 min$/), 'Running').toBe(true)
    expect(await has(ui, /^Done · 6 min ago$/), 'Done').toBe(true)
    const keys = await keysOf(ui)
    expect(at(keys, 'ol-task:2')).toBeLessThan(at(keys, 'ol-task:1'))
    expect(at(keys, 'ol-task:3')).toBeLessThan(at(keys, 'run-pause'))
    expect(at(keys, 'compact-advice')).toBe(at(keys, 'ol-here') + 1)
    // The long task text is a Text with truncation, never dropped.
    expect(await has(ui, /^2\. Rewrite the whole/)).toBe(true)
    await ui.unmount()
  })
  test(`at ${cols} columns the open Run one task row keeps Goal as a row and Start last`, SLOW, async ($, on) => {
    const ui = await mount($, on, world({ 'cockpit:proof:test-session': { ...emptyState(), goal: { text: 'Add a dark mode toggle to the settings screen and keep every old switch', setAt: NOW, how: 'typed' } } }), cols)
    await openCard(ui, 'agents', 'ol-start-task')
    await ui.press({ key: 'press-ol-start-task-0' })
    await ui.redraw()
    const keys = await keysOf(ui)
    const own = keys.filter(k => k.startsWith('start-') && k !== 'start-task')
    expect(own[0]).toBe('start-goal')
    expect(own.at(-1)).toBe('start-go')
    expect(await has(ui, /^Goal$/)).toBe(true)
    await ui.unmount()
  })
}
