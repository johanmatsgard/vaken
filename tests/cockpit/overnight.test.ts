import { expect } from 'claude-code/testing'

import { FULL_PCT, LIMIT_SIGNAL_MS, MAX_REPLANS, USAGE_FRESH_MS, atLimit, goOnVerdict, historyText, limitStopped, parseLimitHit, parseReports, pauseForLimit, pushReport, reportHead, reportOf, reportText, reportWhen, taskLineFacts, taskLineWord } from '../hooks/core/overnight'
import { REPORT_DAYS, freshReports } from '../hooks/core/overnight'
import { DEFAULT_CHOICES, newTask, runSummary } from '../hooks/core/orchestra'
import type { Run, Task } from '../hooks/core/orchestra'

const NOW = new Date(2026, 9, 11, 6, 12).getTime()
const MIN = 60_000
const usage = (percent: number, at = NOW) => ({ at, windows: [{ label: '5-hour', percent }] })
const task = (n: number, over: Partial<Task> = {}): Task => ({ ...newTask({ n, text: `Task ${n}`, role: 'builder', model: 'auto', folder: false }), ...over })
const run = (tasks: Task[], over: Partial<Run> = {}): Run => ({ id: 'r1', name: 'Nightly', status: 'running', createdAt: NOW - 60 * MIN, startedAt: NOW - 50 * MIN, tasks, choices: DEFAULT_CHOICES, ...over })

test('the limit: a fresh full window, or the engine said so a little while ago', () => {
  expect(atLimit(usage(FULL_PCT), NOW)).toBe(true)
  expect(atLimit(usage(80), NOW)).toBe(false)
  expect(atLimit(usage(100, NOW - USAGE_FRESH_MS - 1), NOW)).toBe(false)
  expect(atLimit(undefined, NOW)).toBe(false)
  expect(limitStopped({ at: NOW - MIN }, usage(50), NOW)).toBe(true)
  expect(limitStopped({ at: NOW - LIMIT_SIGNAL_MS - 1 }, usage(50), NOW)).toBe(false)
  expect(limitStopped(undefined, usage(100), NOW)).toBe(true)
  expect(parseLimitHit({ at: 5 })).toEqual({ at: 5 })
  expect(parseLimitHit('x')).toBeUndefined()
})

test('a limit pause: the stopped tasks wait again with no try counted, the run waits until the reset', () => {
  const r = run([task(1, { state: 'done', endedAt: NOW - 30 * MIN }), task(2, { state: 'failed', endedAt: NOW - MIN, agentId: 'a2', startedAt: NOW - 20 * MIN, tries: 1 }), task(3)])
  const p = pauseForLimit(r, NOW - 5 * MIN, NOW + 90 * MIN)
  expect(p.status).toBe('paused')
  expect(p.resumeAt).toBe(NOW + 90 * MIN)
  expect(p.tasks.map(t => t.state)).toEqual(['done', 'waiting', 'waiting'])
  expect(p.tasks[1]).toMatchObject({ tries: 1, why: 'waits: the plan limit stopped it' })
  expect(p.tasks[1]?.agentId).toBeUndefined()
  expect(runSummary(p)).toMatch(/^Waits for the plan limit: 1 of 3 done, 2 waiting$/)
})

test('at the reset: go on; wait again while still full; after a few waits leave it to the person', () => {
  const p = run([task(1)], { status: 'paused', resumeAt: NOW })
  expect(goOnVerdict(p, NOW - 1, usage(10), NOW + 60 * MIN)).toEqual({ act: 'wait' })
  expect(goOnVerdict(p, NOW, usage(10), NOW + 60 * MIN)).toEqual({ act: 'go' })
  expect(goOnVerdict(p, NOW, usage(100), NOW + 60 * MIN)).toEqual({ act: 'again', at: NOW + 60 * MIN })
  expect(goOnVerdict({ ...p, replans: MAX_REPLANS }, NOW, usage(100), NOW + 60 * MIN)).toEqual({ act: 'give-up' })
  expect(goOnVerdict({ ...p, resumeAt: undefined }, NOW, usage(10), NOW)).toEqual({ act: 'wait' })
})

test('the report: done, failed, cost, each task; the list of past runs keeps 10, newest first, one line per run', () => {
  const r = run([task(1, { state: 'done', check: 'passed', usd: 0.4 }), task(2, { state: 'failed', usd: 0.8, why: 'tests failed' }), task(3, { state: 'done', check: 'failed', usd: 0.1 })], { status: 'done' })
  const rep = reportOf(r, NOW)
  expect(rep).toMatchObject({ id: 'r1', done: 1, failed: 2, other: 0, status: 'done' })
  expect(reportHead(rep)).toBe('1 done, 2 failed · about $1.30')
  expect(reportWhen(rep, NOW)).toBe('Ended 06:12')
  expect(reportWhen(rep, NOW + 24 * 60 * MIN)).toBe('Ended 11 Oct, 06:12')
  expect(rep.tasks.map(taskLineWord)).toEqual(['checked', 'failed', 'check failed'])
  expect(taskLineFacts(rep.tasks[1]!)).toEqual(['Task: Task 2', 'Result: failed (tests failed).', 'Cost: about $0.80.'])
  expect(reportHead(reportOf(run([task(1, { state: 'done' })], { status: 'done' }), NOW))).toBe('All 1 done')
  let list = pushReport([], rep)
  list = pushReport(list, { ...rep, endedAt: NOW + MIN })
  expect(list).toHaveLength(1)
  for (let k = 0; k < 12; k++) list = pushReport(list, { ...rep, id: `x${k}` })
  expect(list).toHaveLength(10)
  expect(list[0]?.id).toBe('x11')
  expect(parseReports([rep, { id: 1 }, 'x'])).toHaveLength(1)
  expect(reportText(rep, NOW)).toMatch(/^Nightly: Ended 06:12\. 1 done, 2 failed · about \$1\.30\.\n1\. Task 1: checked \(about \$0\.40\)/)
  expect(reportText(undefined, NOW)).toBe('No task run has ended yet.')
  expect(historyText([rep], NOW)).toBe('Past runs, newest first:\nNightly: Ended 06:12. 1 done, 2 failed · about $1.30.')
})

import { mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SLOW, test } from './slow'

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
function engine(on: On): Map<string, unknown> {
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
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return mem
}

test('the report card: on top after a run ends, a row per task that opens, Done hides it; the Agents view lists past runs', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:cards.agents', 'show')
  mem.set('cockpit:setting:detail', 'explained')
  const rep = reportOf(run([task(1, { state: 'done', check: 'passed', usd: 0.4 }), task(2, { state: 'failed', usd: 0.8, why: 'tests failed' })], { status: 'done' }), NOW)
  mem.set('cockpit:orch:history', [rep])
  mem.set('cockpit:orch:report', rep.id)
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const ui = await mount()
  expect(await ui.find({ type: 'Text', text: /^Task run report$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Nightly: 1 done, 1 failed · about \$1\.20$/ })).toBeDefined()
  await ui.press({ key: 'press-rep-2-0' })
  await ui.unmount()
  const open = await mount()
  expect(await open.find({ type: 'Text', text: /^Result: failed \(tests failed\)\.$/ })).toBeDefined()
  await open.press({ key: 'report-done' })
  await open.unmount()
  expect(mem.get('cockpit:orch:report')).toBeUndefined()
  const gone = await mount()
  expect(await gone.find({ type: 'Text', text: /^Task run report$/ })).toBeUndefined()
  await gone.press({ key: 'runner-open' })
  await gone.unmount()
  const agents = await mount()
  expect(await agents.find({ type: 'Text', text: /^Past runs$/ })).toBeDefined()
  expect(await agents.find({ type: 'Text', text: /^Nightly$/ })).toBeDefined()
  await agents.unmount()
})

test('past runs expire after REPORT_DAYS days (L3-12)', () => {
  const rep = reportOf(run([task(1, { state: 'done' })], { status: 'done' }), NOW)
  const old = { ...rep, id: 'old', endedAt: NOW - (REPORT_DAYS * 24 * 60 + 1) * MIN }
  const fresh = { ...rep, id: 'new', endedAt: NOW - (REPORT_DAYS * 24 * 60 - 5) * MIN }
  expect(freshReports([fresh, old], NOW).map(r => r.id)).toEqual(['new'])
  expect(REPORT_DAYS).toBe(14)
})
