// The Agents card with the filter This session while other sessions have helpers: an "in other sessions" line with Show all.
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

const entry = (id: string, session: string, over: Record<string, unknown>) => ({ id, session, type: 'Explore', model: 'claude-haiku-4', what: `Helper ${id}`, background: true, startedAt: NOW - 30 * MIN, state: 'running', ...over })
const board = [
  entry('a1', 'othersess', {}),
  entry('a2', 'othersess', { state: 'done', startedAt: NOW - 20 * MIN, endedAt: NOW - 18 * MIN, usd: 0.59 }),
]
const mine = entry('m1', 'test-ses', { state: 'done', startedAt: NOW - 25 * MIN, endedAt: NOW - 23 * MIN, usd: 0.41 })

test('filter This session with helpers only in other sessions: the line "2 in other sessions", Show all switches the filter, the headline is not None', async ($, on) => {
  const mem = world({ 'cockpit:agentboard': board, 'cockpit:pref:lists': { others: 'now', agents: 'now', from: 'here' }, 'cockpit:setting:detail': 'explained' })
  const ui = await mount($, on, mem)
  expect(await has(ui, 'No agent in this session yet')).toBe(true)
  expect(await has(ui, '2 in other sessions')).toBe(true)
  expect(await has(ui, 'None here')).toBe(true)
  // The calm Needs you card says None; the Agents headline must not, so None shows once
  expect((await ui.findAll({ type: 'Text', text: /^None$/ })).length).toBe(1)
  expect(await ui.find({ key: 'agents-others-all' })).toBeDefined()
  await ui.press({ key: 'agents-others-all' })
  await ui.redraw()
  expect(await ui.find({ key: 'agents-others-all' })).toBeUndefined()
  expect(await has(ui, 'Helper a1')).toBe(true)
  await ui.unmount()
})

for (const [look, more] of [['simple', false], ['explained', true]] as const) {
  test(`${more ? 'Show more' : 'Show less'}: ${more ? 'the cost is in the second line, the right column is the time' : 'the right column is the time only, no cost'}`, async ($, on) => {
    const ui = await mount($, on, world({ 'cockpit:agentboard': [...board, mine], 'cockpit:setting:detail': look }))
    expect(await has(ui, /min · \$0/), 'no cost beside a time').toBe(false)
    // An ended helper's right column says when it ended; how long it took is in the second line
    expect(await has(ui, /^18 min ago$/)).toBe(true)
    expect(await has(ui, /\$0\.59/), 'cost shown').toBe(more)
    if (more) expect(await has(ui, /took 2 min · about\u00a0\$0\.59 \(estimate\)/)).toBe(true)
    await ui.unmount()
  })
}
