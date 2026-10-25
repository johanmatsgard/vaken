// In the Agents view the first Throw away press only asks and says what it loses; the second press runs the removal. Clear past runs asks too.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SLOW, test } from './slow'

import { DEFAULT_CHOICES, ORCH_KEY, newTask } from '../hooks/core/orchestra'
import type { Run } from '../hooks/core/orchestra'

const NOW = Date.parse('2026-10-12T10:00:00Z')
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }

type Git = { commits: string; status: string; code?: number }
function engine(on: On, git?: Git): { mem: Map<string, unknown> } {
  const mem = new Map<string, unknown>()
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
  if (git !== undefined) on('session.cwd', () => ({ value: '/w/p' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', (_$, e) => {
    const argv = e.argv.join(' ')
    const stdout = git === undefined ? '4242\n' : argv.includes('rev-list') ? git.commits : argv.includes('status') ? git.status : ''
    return { value: { exitCode: git?.code ?? 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return { mem }
}

test('an ended run says what its button does; Throw away asks first, Keep leaves the work, the second press leaves the question', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const { mem } = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:detail', 'explained')
  const task = { ...newTask({ n: 1, text: 'Fix the login', role: 'builder', model: 'auto', folder: true }), state: 'done' as const, path: '/w/wt1', branch: 'task-1', endedAt: NOW - 60_000 }
  const run: Run = { id: 'r1', name: 'Task run', status: 'done', createdAt: NOW - 3_600_000, startedAt: NOW - 3_000_000, tasks: [task], choices: DEFAULT_CHOICES }
  mem.set(ORCH_KEY('test-session'), run)
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const text = async (ui: Awaited<ReturnType<typeof mount>>, t: RegExp) => (await ui.find({ type: 'Text', text: t })) !== undefined
  let ui = await mount()
  await ui.press({ key: 'runner-open' })
  await ui.unmount()
  ui = await mount()
  expect(await text(ui, /^Starts the same tasks again\. This run stays in Past runs\.$/)).toBe(true)
  await ui.press({ key: 'press-rv-t-1-0' })
  await ui.unmount()
  ui = await mount()
  await ui.press({ key: 'rv-throw-1' })
  await ui.unmount()
  ui = await mount()
  expect(await text(ui, /Throw away the work of task 1\? Its folder copy and its branch are deleted\./)).toBe(true)
  expect(JSON.stringify(mem.get(ORCH_KEY('test-session')))).not.toContain('"kept"')
  await ui.press({ key: 'rv-throw-no-1' })
  await ui.unmount()
  ui = await mount()
  expect(await text(ui, /Throw away the work of task 1/)).toBe(false)
  expect(JSON.stringify(mem.get(ORCH_KEY('test-session')))).not.toContain('"kept"')
  await ui.press({ key: 'rv-throw-1' })
  await ui.unmount()
  ui = await mount()
  await ui.press({ key: 'rv-throw-1' })
  await clock.settle()
  await ui.unmount()
  ui = await mount()
  expect(await text(ui, /Throw away the work of task 1/)).toBe(false)
  await ui.unmount()
})

// The Throw away ask says what it loses, counted by git when the ask opens.
for (const c of [
  { name: 'commits and files', git: { commits: '3\n', status: ' M a.ts\n?? b.ts\n' }, line: /^This throws away 3 commits and 2 changed files\.$/ },
  { name: 'files only', git: { commits: '0\n', status: ' M a.ts\n' }, line: /^This throws away 1 changed file\.$/ },
  { name: 'nothing', git: { commits: '0\n', status: '' }, line: /^Nothing to lose\.$/ },
  { name: 'no answer', git: { commits: '', status: '', code: 128 }, line: /^Git could not count its commits and changed files\.$/ },
]) {
  test(`the Throw away ask counts what it loses (${c.name})`, SLOW, async ($, on) => {
    const clock = mock.clock(on, { now: NOW })
    mock.env(on, { HOME: '/home/test' })
    const { mem } = engine(on, c.git)
    mem.set('cockpit:firstrun', 'done')
    mem.set('cockpit:setting:detail', 'explained')
    const task = { ...newTask({ n: 1, text: 'Fix the login', role: 'builder', model: 'auto', folder: true }), state: 'done' as const, path: '/w/wt1', branch: 'task-1', endedAt: NOW - 60_000 }
    mem.set(ORCH_KEY('test-session'), { id: 'r1', name: 'Task run', status: 'done', createdAt: NOW - 3_600_000, startedAt: NOW - 3_000_000, tasks: [task], choices: DEFAULT_CHOICES } satisfies Run)
    const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
    let ui = await mount()
    await ui.press({ key: 'runner-open' })
    await ui.unmount()
    ui = await mount()
    await ui.press({ key: 'press-rv-t-1-0' })
    await ui.unmount()
    ui = await mount()
    await ui.press({ key: 'rv-throw-1' })
    await clock.settle()
    await ui.unmount()
    ui = await mount()
    expect((await ui.find({ type: 'Text', text: c.line })) !== undefined).toBe(true)
    expect(JSON.stringify(mem.get(ORCH_KEY('test-session')))).not.toContain('"kept"')
    await ui.unmount()
  })
}

// Clear past runs asks once, then clears only the finished runs; the run on the page stays.
test('Clear past runs asks first, Keep changes nothing, Clear empties the list and keeps the run', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const { mem } = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:detail', 'explained')
  const run: Run = { id: 'r2', name: 'Task run', status: 'paused', createdAt: NOW - 3_600_000, startedAt: NOW - 3_000_000, tasks: [newTask({ n: 1, text: 'Fix the login', role: 'builder', model: 'auto', folder: false })], choices: DEFAULT_CHOICES }
  mem.set(ORCH_KEY('test-session'), run)
  const past = (id: string, k: number) => ({ id, name: `Old run ${k}`, endedAt: NOW - k * 3_600_000, status: 'done', done: 1, failed: 0, other: 0, usd: 0.5, tasks: [{ n: 1, text: 'A task', state: 'done', check: 'none' }] })
  mem.set('cockpit:orch:history', [1, 2, 3, 4, 5].map(k => past(`p${k}`, k)))
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const text = async (ui: Awaited<ReturnType<typeof mount>>, t: RegExp) => (await ui.find({ type: 'Text', text: t })) !== undefined
  let ui = await mount()
  await ui.press({ key: 'runner-open' })
  await ui.unmount()
  ui = await mount()
  expect(await text(ui, /Old run 1/)).toBe(true)
  await ui.press({ key: 'rv-past-clear' })
  await ui.unmount()
  ui = await mount()
  expect(await text(ui, /^Clear the list of past runs\? The run on this page stays\. Cannot be undone\.$/)).toBe(true)
  await ui.press({ key: 'rv-past-clear-keep' })
  await ui.unmount()
  ui = await mount()
  expect(await text(ui, /^Clear the list of past runs/)).toBe(false)
  expect((mem.get('cockpit:orch:history') as unknown[]).length).toBe(5)
  await ui.press({ key: 'rv-past-clear' })
  await ui.unmount()
  ui = await mount()
  await ui.press({ key: 'rv-past-clear-yes' })
  await clock.settle()
  await ui.unmount()
  ui = await mount()
  expect(mem.has('cockpit:orch:history')).toBe(false)
  expect(JSON.stringify(mem.get(ORCH_KEY('test-session')))).toContain('"paused"')
  expect(await text(ui, /Old run 1/)).toBe(false)
  expect(await text(ui, /^A run that ends shows here/)).toBe(true)
  await ui.unmount()
})
