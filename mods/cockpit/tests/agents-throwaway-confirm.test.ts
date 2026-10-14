// In the Agents view the first Throw away press only asks; the second press runs the removal.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SLOW, test } from './slow'

import { DEFAULT_CHOICES, ORCH_KEY, newTask } from '../hooks/core/orchestra'
import type { Run } from '../hooks/core/orchestra'

const NOW = Date.parse('2026-10-12T10:00:00Z')
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }

function engine(on: On): { mem: Map<string, unknown> } {
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
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => {
    return { value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return { mem }
}

test('U46 and U45: an ended run says what its button does; Throw away asks first, Keep leaves the work, the second press leaves the question', SLOW, async ($, on) => {
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
