// The Other sessions card: the order (your turn first), the count words, one fact per row, the done line, groups in a long list.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { forgetWatches, watchKey } from '../hooks/core/watch'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 80, placement: 'inline' as const, scroll: { bodyRows: 60, offset: 0, total: 60 }, view: {} }

function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
}

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:detail', 'explained']])
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
  return mem
}

const seed = (id: string, over: Record<string, unknown> = {}) => ({
  sessionId: id,
  cwd: `/work/${id}`,
  model: 'claude-opus-5',
  state: 'working',
  startedAt: NOW - 60 * MIN,
  updatedAt: NOW - 2000,
  lastEventAt: NOW - 2000,
  stateSince: NOW - 3 * MIN,
  ...over,
})

const world = (): Record<string, unknown> => ({
  'cockpit:firstrun': 'done',
  'cockpit:session:test-session': seed('test-session', { cwd: '/work/app' }),
  'cockpit:session:t1': seed('t1', { state: 'waiting', stateSince: NOW - 2 * MIN }),
  'cockpit:session:t2': seed('t2', { state: 'waiting', stateSince: NOW - 20 * MIN }),
  'cockpit:session:w1': seed('w1', { contextPercent: 92 }),
  'cockpit:session:w2': seed('w2', { cwd: '/work/app', title: 'Tidy footer' }),
  'cockpit:session:w3': seed('w3', { costUsd: 4.1 }),
  'cockpit:session:q1': seed('q1', { state: 'idle', stateSince: NOW - 10 * MIN, lastEventAt: NOW - 10 * MIN, done: { files: 12, tests: 'passed', pr: 'open' } }),
})

const setup = (on: On, extra: Record<string, unknown> = {}) => {
  forgetWatches()
  const clock = mock.clock(on, { now: NOW })
  const mem = memStore(on)
  for (const [k, v] of Object.entries({ ...world(), ...extra })) mem.set(k, v)
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  return { clock, mem }
}

const texts = async (ui: { findAll: (q: unknown) => Promise<unknown[]> }, re: RegExp): Promise<string[]> => ((await ui.findAll({ type: 'Text', text: re })) as { text?: string }[]).map(t => t.text ?? '')

test('your turn rows come first, the longest waiting first, then working; the count says what you can act on', SLOW, async ($, on) => {
  setup(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await ui.find({ type: 'Text', text: '2 your turn · 3 working' })).toBeDefined()
  const names = await texts(ui, /^(t1|t2|w1|Tidy footer|w3|q1)$/)
  expect(names.slice(0, 2)).toEqual(['t2', 't1'])
  expect(names.slice(2).sort()).toEqual(['Tidy footer', 'w1', 'w3'])
  await ui.unmount()
})

// Ages say "ago" (fmt.ago) and each value keeps its spaces whole (no-break spaces, cards/others.tsx), so the words are matched with \s
test('each row shows its one fact: context over 80%, same folder as you, cost over $2; a quiet session says what it got done', SLOW, async ($, on) => {
  setup(on, { 'cockpit:pref:lists': { others: 'all' } })
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await ui.find({ type: 'Text', text: /^context\s92%,\s/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^same\sfolder\sas\syou,\s/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\$4\.10,\s/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^12\sfiles\schanged\s·\stests\spassed\s·\sPR\sopened,\s10\smin\sago$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^2\smin\sago$/ })).toBeDefined()
  await ui.unmount()
})

test('a quiet session with nothing done keeps its usual line', SLOW, async ($, on) => {
  setup(on, { 'cockpit:session:q1': seed('q1', { state: 'idle', stateSince: NOW - 10 * MIN, lastEventAt: NOW - 10 * MIN }), 'cockpit:pref:lists': { others: 'all' } })
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await ui.find({ type: 'Text', text: /files changed/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^10\smin\sago$/ })).toBeDefined()
  await ui.unmount()
})

test('more than five rows from two places are grouped by repository: the group names its project once, a row says its state and age, Your turn first', SLOW, async ($, on) => {
  const at = (repo: string, n: number) => `/code/${repo}/.claude/worktrees/agent-${n}`
  setup(on, {
    'cockpit:pref:lists': { others: 'all' },
    'cockpit:session:t1': seed('t1', { state: 'waiting', stateSince: NOW - 2 * MIN, cwd: at('shop', 1) }),
    'cockpit:session:t2': seed('t2', { state: 'waiting', stateSince: NOW - 20 * MIN, cwd: at('blog', 2) }),
    'cockpit:session:w1': seed('w1', { cwd: at('shop', 3) }),
    'cockpit:session:w2': seed('w2', { cwd: at('blog', 4) }),
    'cockpit:session:w3': seed('w3', { cwd: at('shop', 5) }),
    'cockpit:session:q1': seed('q1', { state: 'idle', stateSince: NOW - 10 * MIN, lastEventAt: NOW - 10 * MIN, cwd: at('blog', 6) }),
  })
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  // Both groups hold a Your-turn row: blog's waited longest, so blog is first; each project is named once, as a plain row
  expect(await texts(ui, /^(blog|shop)$/)).toEqual(['blog', 'shop'])
  expect(await texts(ui, /^(blog|shop) · /)).toEqual([])
  await ui.unmount()
})

test('an open row offers Tell me when done; the press keeps a watch, the row says watching, and a second press stops it', { timeoutMs: 15_000 }, async ($, on) => {
  const { clock, mem } = setup(on)
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const closed = await mount()
  expect(await closed.find({ type: 'Text', text: 'watching' })).toBeUndefined()
  await closed.press({ key: 'press-o-w1-0' })
  await closed.unmount()
  const open = await mount()
  expect(((await open.find({ key: 'watch-w1' })) as { props?: { label?: string } } | undefined)?.props?.label).toBe('Tell me when done')
  await open.press({ key: 'watch-w1' })
  await clock.settle()
  await open.unmount()
  expect(Object.keys(mem.get(watchKey('test-session')) as object)).toEqual(['w1'])
  const watched = await mount()
  expect(await watched.find({ type: 'Text', text: 'watching' })).toBeDefined()
  expect(((await watched.find({ key: 'watch-w1' })) as { props?: { label?: string } } | undefined)?.props?.label).toBe('Stop watching')
  await watched.press({ key: 'watch-w1' })
  await clock.settle()
  await watched.unmount()
  expect(mem.has(watchKey('test-session'))).toBe(false)
  forgetWatches()
})

test('a watched session that ends its turn gives one toast and one band line, then the watch is gone', { timeoutMs: 15_000 }, async ($, on) => {
  const { clock, mem } = setup(on)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)
    return { value: undefined } as never
  })
  on('session.surfaces', () => ({ value: [] }) as never)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  mem.set(watchKey('test-session'), { w1: { name: 'w1', at: NOW, sawWorking: true } })
  forgetWatches()
  const fresh = () => clock.now()
  mem.set('cockpit:session:w1', seed('w1', { state: 'waiting', stateSince: fresh(), updatedAt: fresh(), done: { files: 2 } }))
  await clock.advance(21_000)
  await clock.settle()
  expect(toasts.filter(t => t.includes('"w1" finished'))).toEqual(['"w1" finished: 2 files changed.'])
  expect(mem.has(watchKey('test-session'))).toBe(false)
  expect(JSON.stringify(mem.get('cockpit:band:test-session'))).toContain('\\"w1\\" finished')
  await clock.advance(21_000)
  await clock.settle()
  expect(toasts.filter(t => t.includes('"w1" finished'))).toHaveLength(1)
  forgetWatches()
})

test('Tell me when done is offered only on a working session: a session that waits for you has no turn to wait for', SLOW, async ($, on) => {
  setup(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const offered = async (id: string): Promise<boolean> => (await ui.find({ key: `watch-${id}` })) !== undefined
  for (const [id, working] of [['t1', false], ['w1', true]] as const) {
    await ui.press({ key: `press-o-${id}-0` })
    await ui.redraw()
    expect(await offered(id), `${id} (${working ? 'working' : 'not working'})`).toBe(working)
    await ui.press({ key: `press-o-${id}-0` })
    await ui.redraw()
  }
  await ui.unmount()
})

test('an open Your-turn row says what it means once: no Why now that repeats "finished, waits for you"', SLOW, async ($, on) => {
  setup(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await ui.press({ key: 'press-o-t1-0' })
  await ui.redraw()
  expect(await ui.find({ type: 'Text', text: /waits for your next message/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /finished, waits for you/ })).toBeUndefined()
  await ui.unmount()
})
