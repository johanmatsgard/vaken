// A text button's words line up with the row text, an open card never repeats its headline.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'
import { APPEARS } from '../hooks/core/cardrules'
import { plainSkillName } from '../hooks/core/skills'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'

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


const world = (over: Record<string, unknown> = {}) =>
  new Map<string, unknown>(Object.entries({
    'cockpit:setting:look.view': 'custom',
    ...Object.fromEntries(Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show'])),
    'cockpit:firstrun': 'done',
    'cockpit:session:test-session': { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'waiting', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, costUsd: 1.2 },
    ...over,
  }))

async function mount($: Parameters<Parameters<typeof test>[1]>[0], on: On, mem: Map<string, unknown>, cols = 60): Promise<Ui> {
  forgetProjectSet()
  forgetStartCheck()
  delete checkShown.sig
  engine(on, mem)
  return $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: props(cols) })
}
const count = async (ui: Ui, text: string | RegExp): Promise<number> => (await ui.findAll({ type: 'Text', text })).length
const has = async (ui: Ui, text: string | RegExp): Promise<boolean> => (await count(ui, text)) > 0
const margin = async (ui: Ui, key: string): Promise<number | undefined> => Math.min(0, ...(await ui.findAll({ key })).map(e => (e as { props?: { marginLeft?: number } }).props?.marginLeft ?? 0))
async function openCard(ui: Ui, id: string, marker: string) {
  if ((await ui.find({ key: marker })) === undefined) {
    await ui.press({ key: `press-glance-${id}-0` })
    await ui.redraw()
  }
  expect(await ui.find({ key: marker }), `${id} is open`).toBeDefined()
}
const board = [{ id: 'tu1', agentId: 'ag1', session: 'test-session', type: 'Explore', model: 'claude-haiku-4-5', what: 'Search the code', background: true, startedAt: NOW - 60_000, state: 'running' }, { id: 'tu2', agentId: 'ag2', session: 'test-session', type: 'Explore', model: 'claude-haiku-4-5', what: 'Read the docs', background: true, startedAt: NOW - 60_000, state: 'running' }]

test('1: a lone link is a row whose letters start at the row text; a body Pick is framed and its frame starts on the text edge (item 135: no move left)', async ($, on) => {
  const ui = await mount($, on, world({ 'cockpit:agentboard': board }))
  await openCard(ui, 'here', 'ol-here')
  expect(await ui.find({ key: 'linkrow-focus-start' })).toBeDefined()
  await openCard(ui, 'agents', 'ol-start-task')
  expect(await ui.find({ key: 'linkrow-runner-open' })).toBeDefined()
  expect(await margin(ui, 'agents-from')).toBe(0)
  await ui.unmount()
})

test('2: an open card does not repeat its headline value', async ($, on) => {
  const ui = await mount($, on, world({ 'cockpit:agentboard': board }))
  await openCard(ui, 'agents', 'ol-start-task')
  expect(await count(ui, '2 running'), 'the headline says it once').toBe(1)
  await openCard(ui, 'here', 'ol-here')
  // The session has no context figure, so the headline is the state word.
  expect(await count(ui, 'Your turn')).toBe(2)
  await ui.unmount()
})

test('3: Less folds the card (Agents, This session)', async ($, on) => {
  const ui = await mount($, on, world({ 'cockpit:agentboard': board, 'cockpit:setting:detail': 'glance' }))
  for (const [id, marker] of [['agents', 'ol-start-task'], ['here', 'ol-here']] as const) {
    await openCard(ui, id, marker)
    const less = (await ui.find({ key: `detail-${id}` })) as { props?: { label?: string } } | undefined
    expect(less?.props?.label?.trim(), `${id} says Fold (T14: the verb its chevron says)`).toBe('Fold')
    await ui.press({ key: `detail-${id}` })
    await ui.redraw()
    expect(await ui.find({ key: marker }), `${id} is folded`).toBeUndefined()
  }
  await ui.unmount()
})

test('5: the card guide is a grid of one tile per card, each with its Example label, and a last row that is one whole press', async ($, on) => {
  const mem = world()
  for (const id of Object.keys(APPEARS)) mem.delete(`cockpit:setting:cards.${id}`)
  const ui = await mount($, on, mem)
  await ui.press({ key: 'morel-more-cards' })
  await ui.redraw()
  expect(await ui.find({ key: 'guide-card' })).toBeDefined()
  const keys = (await ui.findAll({})).map(e => (e as { key?: string }).key ?? '')
  expect(new Set(keys.map(k => /guide-ex-(.+)-0$/.exec(k)?.[1]).filter(id => id !== undefined)).size, 'example rows on every card').toBe(17)
  expect(keys.some(k => /^guide-ex-label-/.test(k)), 'no Example title inside the card (item 139)').toBe(false)
  expect(keys.some(k => /^guide-br-/.test(k)), 'no hairlines in the guide (item 139)').toBe(false)
  expect(await ui.find({ key: 'guide-turn' })).toBeDefined()
  await ui.unmount()
})

test('2b: Other sessions open does not say its count twice', async ($, on) => {
  const quiet = { sessionId: 's2', cwd: '/work/b', model: 'claude-opus-5', state: 'idle', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN }
  const ui = await mount($, on, world({ 'cockpit:session:s2': quiet }))
  await openCard(ui, 'others', 'others-scope')
  expect(await count(ui, /^1 idle$/)).toBe(1)
  await ui.unmount()
})

test('4: a skill shows a plain name, the part after the colon with dashes as spaces', () => {
  expect(plainSkillName('anthropic-skills:computer-use')).toBe('computer use')
  expect(plainSkillName('grilling')).toBe('grilling')
  expect(plainSkillName('a:b:code-review')).toBe('code review')
  expect(plainSkillName('plugin:')).toBe('plugin:')
})
