// The card formula one priority list, Needs you always first.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'

import { placeColumns } from '../hooks/features/home/board'
import { paneGrid } from '../hooks/features/home/grid'
import { ALL_IDS, STANDARD_IDS, fixedIds, needsShown, viewModeOf } from '../hooks/features/home/viewset'
import { CARD_IDS } from '../hooks/features/home/logic'
import { defaults, findSetting } from '../hooks/core/settings'
import { COL_PT, ROW_PT } from '../hooks/ui/tokens'

const NOW = Date.parse('2026-10-12T12:00:00Z')
const MIN = 60_000
const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })

function engine(on: On, mem: Map<string, unknown>) {
  on('store.get', (_$, e) => ({ value: mem.has(e.key) ? JSON.parse(JSON.stringify(mem.get(e.key))) : undefined }) as never)
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
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}
const fresh = (extra: Record<string, unknown> = {}): Map<string, unknown> =>
  new Map<string, unknown>(
    Object.entries({
      'cockpit:firstrun': 'done',
      'cockpit:session:test-session': rec('test-session', { cwd: '/work/app', contextPercent: 38 }),
      'cockpit:session:s1': rec('s1'),
      ...extra,
    }),
  )
const propsAt = (wPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: wPt / COL_PT, placement: 'dock' as const, scroll: { bodyRows: Math.round(1400 / ROW_PT), offset: 0, total: 200 }, view: {} })

type Node = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
type Pane = { drawn: () => Promise<Node>; redraw: (p?: unknown) => Promise<void>; press: (q: unknown) => Promise<void>; find: (q: unknown) => Promise<unknown>; unmount: () => Promise<void> }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const keyOf = (n: Node): string | undefined => n.key ?? (n.props?.key as string | undefined)

const CARD_KEY = /^(needs|glance-(?!needs$)[a-z]+)$/
const cardsIn = (n: Node): string[] => walk(n).flatMap(x => (CARD_KEY.test(keyOf(x) ?? '') ? [(keyOf(x) as string).replace('glance-', '')] : []))
const columnsOf = (root: Node): string[][] => {
  const cols = walk(root).filter(x => /^col-\d+$/.test(keyOf(x) ?? ''))
  return cols.length === 0 ? [cardsIn(root)] : cols.map(cardsIn)
}

function setup(on: On, mem: Map<string, unknown>): void {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
}
const mount = ($: Parameters<Parameters<typeof test>[1]>[0], wPt: number) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(wPt) }) as unknown as Promise<Pane>
async function draw($: Parameters<Parameters<typeof test>[1]>[0], on: On, mem: Map<string, unknown>, wPt: number) {
  setup(on, mem)
  return mount($, wPt)
}

test('the views as data: Standard is Needs you and six cards, All is the seven and ten more, Custom is the person own list', () => {
  expect(STANDARD_IDS).toEqual(['here', 'context', 'agents', 'computer', 'limit', 'others'])
  expect(ALL_IDS.slice(0, 6)).toEqual([...STANDARD_IDS])
  expect(ALL_IDS.slice(6)).toEqual(['ship', 'prs', 'back', 'preview', 'setup', 'skills', 'do', 'guard', 'safety', 'autopilot', 'proof'])
  expect([...ALL_IDS].sort()).toEqual([...CARD_IDS].sort())
  expect(fixedIds('standard')).toBe(STANDARD_IDS)
  expect(fixedIds('all')).toBe(ALL_IDS)
  expect(fixedIds('custom')).toBeUndefined()
  expect(viewModeOf({})).toBe('standard')
  expect(viewModeOf({ 'look.view': 'all' })).toBe('all')
  expect(viewModeOf({ 'look.view': 'custom' })).toBe('custom')
  expect(viewModeOf({ 'look.view': 'nonsense' })).toBe('standard')
})

test('the settings: View starts on Standard, the Needs you card on Always; Hidden never shows it, Only when something waits shows it when something does', () => {
  expect(findSetting('look.view')?.default).toBe('standard')
  expect(findSetting('look.view')?.options.map(o => o.value)).toEqual(['standard', 'all', 'custom'])
  expect(findSetting('look.needs')?.default).toBe('always')
  expect(findSetting('look.needs')?.options.map(o => o.value)).toEqual(['always', 'waits', 'hidden'])
  expect(defaults()['look.view']).toBe('standard')
  expect(needsShown({ 'look.needs': 'always' }, 0)).toBe(true)
  expect(needsShown({}, 0)).toBe(true)
  expect(needsShown({ 'look.needs': 'waits' }, 0)).toBe(false)
  expect(needsShown({ 'look.needs': 'waits' }, 2)).toBe(true)
  expect(needsShown({ 'look.needs': 'hidden' }, 5)).toBe(false)
})

test('Standard on a fresh store: Needs you, This session, Context health, Agents, Computer, Plan limits, Other sessions, in that order, and nothing else', async ($, on) => {
  const ui = await draw($, on, fresh(), 400)
  expect(cardsIn(await ui.drawn())).toEqual(['needs', 'here', 'context', 'agents', 'computer', 'limit', 'others'])
  expect(await ui.find({ type: 'Text', text: 'Nothing' })).toBeDefined()
  expect(await ui.find({ key: 'glance-needs' })).toBeDefined()
  await ui.unmount()
})

test('All: the seven, then ship, pull requests, where was I, preview, agent setup, skills, do, guard, safety, autopilot, proof', async ($, on) => {
  const ui = await draw($, on, fresh({ 'cockpit:setting:look.view': 'all' }), 400)
  expect(cardsIn(await ui.drawn())).toEqual(['needs', 'here', 'context', 'agents', 'computer', 'limit', 'others', 'ship', 'prs', 'back', 'preview', 'setup', 'skills', 'do', 'guard', 'safety', 'autopilot', 'proof'])
  await ui.unmount()
})

test('a fixed view ignores Hide and Auto: nothing pops in or out', async ($, on) => {
  const mem = fresh({ 'cockpit:setting:cards.limit': 'hide', 'cockpit:setting:cards.proof': 'show' })
  const ui = await draw($, on, mem, 400)
  expect(cardsIn(await ui.drawn())).toEqual(['needs', 'here', 'context', 'agents', 'computer', 'limit', 'others'])
  await ui.unmount()
})

test('Needs you: Hidden removes it; Only when something waits keeps it out while nothing waits', async ($, on) => {
  const mem = fresh({ 'cockpit:setting:look.needs': 'hidden' })
  setup(on, mem)
  const hidden = await mount($, 400)
  expect(cardsIn(await hidden.drawn())).toEqual(['here', 'context', 'agents', 'computer', 'limit', 'others'])
  await hidden.unmount()
  mem.set('cockpit:setting:look.needs', 'waits')
  const waits = await mount($, 400)
  expect(cardsIn(await waits.drawn())).toEqual(['here', 'context', 'agents', 'computer', 'limit', 'others'])
  await waits.unmount()
  mem.set('cockpit:session:busy', rec('busy', { ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 4 * MIN } }))
  const asks = await mount($, 400)
  expect(cardsIn(await asks.drawn())[0]).toBe('needs')
  expect(await asks.find({ type: 'Text', text: 'Nothing needs you.' })).toBeUndefined()
  await asks.unmount()
})

test('the fold on the page: the columns hold the seven slots in order, folded column-major', async ($, on) => {
  const seen = new Set<number>()
  setup(on, fresh())
  for (const wPt of [400, 1000, 1500, 2000, 2800, 3400]) {
    const ncol = paneGrid(wPt, 'auto', 7).ncol
    const ui = await mount($, wPt)
    const cols = columnsOf(await ui.drawn())
    expect(cols.map(c => c.length), `${wPt} pt, ${ncol} columns`).toEqual(placeColumns(7, ncol).map(c => c.length))
    expect(cols.flat()).toEqual(['needs', 'here', 'context', 'agents', 'computer', 'limit', 'others'])
    seen.add(ncol)
    await ui.unmount()
  }
  expect(seen.has(1)).toBe(true)
  expect(seen.size).toBeGreaterThanOrEqual(4)
})

test('opening or folding a card never moves a card to another column', async ($, on) => {
  setup(on, fresh())
  for (const wPt of [1000, 1500, 2000, 3400]) {
    const ui = await mount($, wPt)
    const before = columnsOf(await ui.drawn())
    const columnOf = (cols: string[][], id: string): number => cols.findIndex(c => c.includes(id))
    for (const id of ['here', 'context', 'agents', 'computer', 'limit', 'others']) {
      await ui.press({ key: `press-glance-${id}-0` })
      await ui.redraw()
      const open = columnsOf(await ui.drawn())
      for (const other of ['needs', 'here', 'context', 'agents', 'computer', 'limit', 'others']) expect(columnOf(open, other), `${other} with ${id} open at ${wPt} pt`).toBe(columnOf(before, other))
      await ui.press({ key: `press-glance-${id}-0` })
      await ui.redraw()
    }
    await ui.unmount()
  }
})

test('Custom keeps an order the person arranged before the views existed (no look.view saved, a saved order): their cards, their order', async ($, on) => {
  const mem = fresh({ 'cockpit:pref:gorder:1': 'proof,limit,here,' + CARD_IDS.filter(id => !['proof', 'limit', 'here'].includes(id)).join(','), 'cockpit:setting:cards.guard': 'show' })
  setup(on, mem)
  const ui = await mount($, 400)
  const order = cardsIn(await ui.drawn())
  // Needs you first, then the person's own order (a card that is calm stays where they put it).
  expect(order[0]).toBe('needs')
  expect(order.indexOf('proof')).toBeLessThan(order.indexOf('limit'))
  expect(order.indexOf('limit')).toBeLessThan(order.indexOf('here'))
  await ui.unmount()
  // A person who chose a view keeps that, whatever order is saved.
  mem.set('cockpit:setting:look.view', 'standard')
  const std = await mount($, 400)
  expect(cardsIn(await std.drawn())).toEqual(['needs', 'here', 'context', 'agents', 'computer', 'limit', 'others'])
  await std.unmount()
})

test('Custom: the card guide has a switch and a made-up Example for each of the 17 cards, and a switch writes Show or Hide', async ($, on) => {
  const mem = fresh({ 'cockpit:setting:look.view': 'custom' })
  const ui = await draw($, on, mem, 600)
  await ui.press({ key: 'morel-more-cards' })
  await ui.redraw()
  const root = await ui.drawn()
  expect(new Set(walk(root).map(x => /guide-ex-(.+)-0$/.exec(keyOf(x) ?? '')?.[1]).filter(id => id !== undefined)).size).toBe(17)
  expect(walk(root).some(x => /^guide-ex-label-/.test(keyOf(x) ?? ''))).toBe(false)
  expect(walk(root).filter(x => /^row-guide-/.test(keyOf(x) ?? '')).length).toBe(17)
  await ui.press({ key: 'guide-limit-switch' })
  expect(mem.get('cockpit:setting:cards.limit')).toBe('hide')
  await ui.unmount()
})

test('Start here offers the three views once; a press chooses it and the view changes', async ($, on) => {
  const mem = fresh({ 'cockpit:firstrun': undefined })
  mem.delete('cockpit:firstrun')
  const ui = await draw($, on, mem, 600)
  for (const v of ['standard', 'all', 'custom']) expect(await ui.find({ key: `start-view-${v}` }), v).toBeDefined()
  await ui.press({ key: 'start-view-all' })
  expect(mem.get('cockpit:setting:look.view')).toBe('all')
  await ui.unmount()
})
