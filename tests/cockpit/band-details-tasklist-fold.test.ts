// The band shows Details at the Short look when its line is cut; the task list folds after 6.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SLOW, test } from './slow'

import { DEFAULT_CHOICES, ORCH_KEY, newTask } from '../hooks/core/orchestra'
import type { Run } from '../hooks/core/orchestra'
import { HISTORY_KEY, REPORT_KEY, reportOf } from '../hooks/core/overnight'
import { bandLineCut } from '../hooks/features/home/band'

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


const mount = ($: Parameters<Parameters<typeof test>[2]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
const taskN = (n: number, state: 'waiting' | 'done' | 'failed' = 'waiting') => ({ ...newTask({ n, text: `Task number ${n}`, role: 'builder', model: 'auto', folder: false }), state })

test('U80: a cut line is told by the pane width and the chip; a short line or an unknown width is not cut', () => {
  const long = 'New topic: a fresh session costs less than going on in this long one, so start a new one when you can'
  expect(bandLineCut(long, 60, '')).toBe(true)
  expect(bandLineCut(long, 400, '')).toBe(false)
  expect(bandLineCut(long, undefined, '')).toBe(false)
  expect(bandLineCut('Short line', 60, 'Week 40%')).toBe(false)
  const mid = 'A line of about forty letters, no more'
  expect(bandLineCut(mid, 45, '')).toBe(false)
  expect(bandLineCut(mid, 45, 'Week 94% · resets in 3 days')).toBe(true)
})

const bandProps = (bodyColumns: number) => ({ hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} })

test('U80: at the Short look the band shows Details only when its line is cut by the pane width', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const { mem } = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:band:test-session', [{ id: 'fresh', level: 'warn', text: 'New topic: a fresh session costs less than going on in this long one, so start a new one when you can', at: NOW - 60_000, ttlMs: 600_000 }])
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  const narrow = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps(50) })
  expect(((await narrow.find({ key: 'band-details' })) as { props?: { label?: string } } | undefined)?.props?.label).toMatch(/^\s*Details\s*$/)
  await narrow.unmount()
  const wide = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps(400) })
  expect(await wide.find({ key: 'band-details' })).toBeUndefined()
  await wide.unmount()
})

test('U97: a run of 12 tasks shows 6, "Show 6 more" unfolds them, Add a task stays on the page', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const { mem } = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:detail', 'explained')
  const tasks = Array.from({ length: 12 }, (_, i) => taskN(i + 1))
  const run: Run = { id: 'r1', name: 'Task run', status: 'done', createdAt: NOW - 60_000, tasks: tasks.map(t => ({ ...t, state: 'done' as const, endedAt: NOW - 1000 })), choices: DEFAULT_CHOICES }
  mem.set(ORCH_KEY('test-session'), run)
  let ui = await mount($)
  await ui.press({ key: 'runner-open' })
  await ui.unmount()
  ui = await mount($)
  expect(await ui.find({ key: 'rv-t-6' })).toBeDefined()
  expect(await ui.find({ key: 'rv-t-7' })).toBeUndefined()
  expect(await ui.find({ key: 'rv-add' })).toBeDefined()
  expect(await ui.find({ type: 'Button', label: /Show 6 more/ })).toBeDefined()
  await ui.press({ key: 'morel-rv-tasks' })
  await ui.unmount()
  ui = await mount($)
  expect(await ui.find({ key: 'rv-t-12' })).toBeDefined()
  expect(await ui.find({ type: 'Button', label: /Show fewer/ })).toBeDefined()
  await ui.unmount()
  mem.set(ORCH_KEY('test-session'), { ...run, tasks: run.tasks.slice(0, 6) })
  ui = await mount($)
  expect(await ui.find({ key: 'morel-rv-tasks' })).toBeUndefined()
  await ui.unmount()
})

test('U99: the failed task row of the Run report has Try again, the same press as the runner (retry N); a done task has none', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const toasts: string[] = []
  on('ui.toast', (_$, e) => { toasts.push(String((e as { text?: string }).text)); return { value: undefined } as never })
  const { mem } = engine(on)
  mem.set('cockpit:firstrun', 'done')
  const failed = { ...taskN(2, 'failed'), endedAt: NOW - 1000 }
  const run: Run = { id: 'r1', name: 'Task run', status: 'done', createdAt: NOW - 3_600_000, startedAt: NOW - 3_000_000, tasks: [{ ...taskN(1, 'done'), endedAt: NOW - 2000 }, failed], choices: DEFAULT_CHOICES }
  mem.set(ORCH_KEY('test-session'), run)
  mem.set(REPORT_KEY, 'r1')
  mem.set(HISTORY_KEY, [reportOf(run, NOW)])
  let ui = await mount($)
  expect(await ui.find({ key: 'rep-retry-1' })).toBeUndefined()
  expect(await ui.find({ type: 'Button', label: /Try again/ })).toBeDefined()
  await ui.press({ key: 'rep-retry-2' })
  await clock.settle()
  await ui.unmount()
  expect(toasts).toContain('Task 2 waits for its turn again.')
})
