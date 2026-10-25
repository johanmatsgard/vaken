// Arrange cards, from the Settings jump row and the home footer: a press opens the Arrange board at every pane width.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { ARRANGING_TO_CUSTOM } from '../hooks/core/cardwords'
import { SETTINGS } from '../hooks/core/settings'
import { arrangeSeed } from '../hooks/features/home/arrangeseed'
import { CARD_IDS } from '../hooks/features/home/logic'
import { ALL_IDS, NEEDS_SLOT, STANDARD_IDS } from '../hooks/features/home/viewset'
import { clientKey } from '../hooks/ui/firstclick'
import { columnPt } from '../hooks/ui/tokens'
import { test } from './slow'

const NOW = new Date(2026, 9, 11, 9, 0).getTime()

type Node = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
type Pane = { drawn: () => Promise<unknown>; find: (q: unknown) => Promise<unknown>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }

const paneProps = (bodyColumns: number) => ({ title: 'Vaken', isFocused: false, bodyColumns, placement: 'inline' as const, scroll: { bodyRows: 60, offset: 0, total: 60 }, view: {} })
function engine(on: On, view: string | undefined): string[] {
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done'], ...(view === undefined ? [] : [['cockpit:setting:look.view', view] as [string, unknown]])])
  const toasts: string[] = []
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
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
  on('ui.toast', (_$, e) => {
    toasts.push(String((e as { text?: unknown }).text ?? ''))
    return { value: undefined } as never
  })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return toasts
}
const mountAt = ($: unknown, bodyColumns: number) => (): Promise<Pane> =>
  ($ as { ui: { mount: (o: unknown) => Promise<Pane> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps(bodyColumns) })
async function openSettings($: unknown, on: On, widthPt: number, view: string | undefined): Promise<{ mount: () => Promise<Pane>; toasts: string[] }> {
  const toasts = engine(on, view)
  const mount = mountAt($, Math.round(widthPt / columnPt()))
  const home = await mount()
  await home.press({ key: 'settings' })
  await home.unmount()
  return { mount, toasts }
}

const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => typeof c === 'object' && c !== null)
const keyOf = (n: Node): string => String(n.key ?? n.props?.key ?? '')
const walk = (n: Node): Node[] => [n, ...kids(n).flatMap(walk)]
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)

// No other Client lies over the row's: in a drawn tree with no layout engine the regions are read from what the boxes declare.
function rowWins(tree: Node, cardKey: string, jumpKey: string): void {
  const card = walk(tree).find(n => keyOf(n) === cardKey)
  expect(card, `${cardKey} is drawn`).toBeDefined()
  const order = walk(card as Node).filter(n => n.type === 'Client').map(keyOf)
  const mine = clientKey(jumpKey)
  const at = order.indexOf(mine)
  expect(at, `${mine} is laid in ${cardKey}`).toBeGreaterThanOrEqual(0)
  const leadBox = walk(card as Node).find(n => keyOf(n) === `${cardKey}-lead`)
  const inLead = new Set(leadBox === undefined ? [] : walk(leadBox).filter(n => n.type === 'Client').map(keyOf))
  for (const k of order.slice(0, at)) expect(k === clientKey(`hdr-${cardKey}`) || inLead.has(k), `${k} is laid before the jump: only the header's or the lead's press may be`).toBe(true)
  // The lead's Client declares no more rows than the lead holds, rounded out: it never reaches down past the row under it.
  if (leadBox !== undefined) {
    const anchor = kids(leadBox).find(c => keyOf(c) === `${clientKey(`hdr-${cardKey}`)}-box`)
    const rowsOfLead = kids(leadBox).filter(c => c.props?.position !== 'absolute').length
    expect(num(anchor?.props?.height), 'the lead press stays on the lead (title and about lines, rounded out)').toBeLessThanOrEqual(rowsOfLead + 2)
  }
  const client = walk(card as Node).find(n => n.type === 'Client' && keyOf(n) === mine)
  expect(num(client?.props?.height), 'the jump press is at least one row').toBeGreaterThanOrEqual(1)
}

// The board is drawn, and its cards (Needs you aside, a slot of its own) are `want`, in that order.
async function boardHas(pane: Pane, want: readonly string[]): Promise<string[]> {
  expect(await pane.find({ key: 'settings-done' }), 'Settings is left').toBeUndefined()
  expect(await pane.find({ key: 'arrange-bar' }), 'the Arranging header').toBeDefined()
  const board = walk((await pane.drawn()) as Node).find(n => n.type === 'Client' && keyOf(n) === 'arrange-board')
  expect(board, 'the Arrange board').toBeDefined()
  // The board shows the pane's own columns (even columns): every card once, each column in the view's order
  const lists = ((board?.props?.props as { lists?: string[][] } | undefined)?.lists ?? []).map(l => l.filter(id => id !== NEEDS_SLOT))
  expect([...lists.flat()].sort()).toEqual([...want].sort())
  for (const l of lists) expect(l.map(id => want.indexOf(id))).toEqual(l.map(id => want.indexOf(id)).sort((a, b) => a - b))
  return lists.flat()
}

for (const widthPt of [300, 400, 700]) {
  test(`Custom view at ${widthPt} pt: the Arrange cards row presses and the Arrange board is drawn, no toast; no Client covers the jump rows`, async ($, on) => {
    const { mount, toasts } = await openSettings($, on, widthPt, 'custom')
    const view = await mount()
    expect(await view.find({ key: 'jump-settings-look-and-cards' }), 'the row is drawn').toBeDefined()
    rowWins((await view.drawn()) as Node, 'settings-look-and-cards', 'jump-settings-look-and-cards')
    rowWins((await view.drawn()) as Node, 'settings-agents-and-tasks', 'jump-settings-agents-and-tasks')
    await view.press({ key: 'jump-settings-look-and-cards' })
    await view.unmount()
    const arranging = await mount()
    expect(await arranging.find({ key: 'settings-done' }), 'Settings is left').toBeUndefined()
    expect(await arranging.find({ key: 'arrange-board' }), 'the Arrange board').toBeDefined()
    expect(toasts).not.toContain(ARRANGING_TO_CUSTOM)
    await arranging.unmount()
  })

  for (const [name, view, ids] of [['Standard', undefined, STANDARD_IDS], ['All', 'all', ALL_IDS]] as const) {
    test(`${name} view at ${widthPt} pt: Arrange cards switches to Custom with the same cards in the same order and opens the board; no Client covers the jump rows`, async ($, on) => {
      const { mount, toasts } = await openSettings($, on, widthPt, view)
      const settings = await mount()
      expect(await settings.find({ key: 'jump-settings-look-and-cards' }), 'the row is drawn').toBeDefined()
      rowWins((await settings.drawn()) as Node, 'settings-look-and-cards', 'jump-settings-look-and-cards')
      rowWins((await settings.drawn()) as Node, 'settings-agents-and-tasks', 'jump-settings-agents-and-tasks')
      await settings.press({ key: 'jump-settings-look-and-cards' })
      await settings.unmount()
      const arranging = await mount()
      const onBoard = await boardHas(arranging, ids)
      expect(toasts.filter(t => t === ARRANGING_TO_CUSTOM).length, 'said once').toBe(1)
      // Back from Arrange: the home screen in Custom shows the same cards in the same order, and Settings now says Custom.
      await arranging.press({ key: 'arrange-done' })
      await arranging.unmount()
      const home = await mount()
      const drawn = walk((await home.drawn()) as Node).map(keyOf)
      const at = (id: string): number => drawn.findIndex(k => k === `card-${id}` || k === id || k.startsWith(`card-${id}-`))
      expect(await home.find({ key: 'arrange-board' }), 'Arrange is closed').toBeUndefined()
      const seen = ids.map(at)
      expect(ids.filter((_, n) => (seen[n] as number) < 0), 'every card of the view is drawn').toEqual([])
      // What was arranged is what is seen: the pane draws the board's columns, column by column
      const drawnOrder = onBoard.map(at)
      expect([...drawnOrder].sort((a, b) => a - b), 'in the same order as the board').toEqual(drawnOrder)
      expect(CARD_IDS.filter(id => !ids.includes(id) && drawn.includes(id)), 'no other card').toEqual([])
      await home.unmount()
    })
  }

  test(`Standard view at ${widthPt} pt: the footer's Arrange cards takes the same path`, async ($, on) => {
    const toasts = engine(on, undefined)
    const mount = mountAt($, Math.round(widthPt / columnPt()))
    const home = await mount()
    expect(await home.find({ key: 'arrange' }), 'the footer button shows in Standard').toBeDefined()
    await home.press({ key: 'arrange' })
    await home.unmount()
    const arranging = await mount()
    await boardHas(arranging, STANDARD_IDS)
    expect(toasts).toContain(ARRANGING_TO_CUSTOM)
    await arranging.unmount()
  })
}

test('the seed: the fixed cards on Show, every other on Hide, the view order first, Problems first off; every card has a Show row', () => {
  const keys = new Set(SETTINGS.map(s => s.key))
  for (const id of CARD_IDS) expect(keys.has(`cards.${id}`), `cards.${id} is a setting`).toBe(true)
  const seed = arrangeSeed(STANDARD_IDS)
  expect(seed.values['look.view']).toBe('custom')
  expect(seed.values['view.problems']).toBe('off')
  expect(CARD_IDS.filter(id => seed.values[`cards.${id}`] === 'show')).toEqual(CARD_IDS.filter(id => STANDARD_IDS.includes(id)))
  expect(CARD_IDS.filter(id => seed.values[`cards.${id}`] !== 'show' && seed.values[`cards.${id}`] !== 'hide')).toEqual([])
  expect(seed.order.slice(0, STANDARD_IDS.length)).toEqual([...STANDARD_IDS])
  expect([...seed.order].sort()).toEqual([...CARD_IDS].sort())
})
