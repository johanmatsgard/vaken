// Wide and tall screens (W): the columns (1 to 6), the Columns choice, the rows a list shows, the card orders of the new widths.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { BORDER_X_PT, cardGapX, CARD_PAD_X_PT, LIST_TALL_ROWS, CARD_MIN_INNER_PT, COLUMN_MIN_PT, COLUMNS_2_FROM_PT, COLUMNS_3_FROM_PT, COLUMNS_4_FROM_PT, COLUMNS_5_FROM_PT, COLUMNS_6_FROM_PT, COL_PT_MAC, COL_PT_WIN, columnPt, LIST_SHOW, LIST_SHOW_MAX, MAX_COLUMNS, ONE_COLUMN_MAX_PT, PRESS_WASH_OUT, ROW_PT, STACK_BELOW_PT, cols, columnsFor, setColumnSystem, settingsSpanGap, switchHitW } from '../hooks/ui/tokens'
import { COLUMN_CHOICES, columnCells, columnsUsed, listShowFor, paneGrid } from '../hooks/features/home/grid'
import { boardLists, listsLayout, placeColumns } from '../hooks/features/home/board'
import { BUCKETS, isBucket, parseLayouts, readOrders, sameLayout, snapshot } from '../hooks/features/home/layouts'
import { CARD_IDS } from '../hooks/features/home/logic'
import { defaults, findSetting } from '../hooks/core/settings'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000
const WIDTHS_PT = [300, 500, 800, 1200, 1600, 2400, 3400]
const HEIGHTS_PT = [600, 1400, 2400]
const CLOSE = 0.01
const TWO_SCREENS_PT = 2 * LIST_TALL_ROWS * ROW_PT // a pane two laptop screens tall: a list shows twice LIST_SHOW rows

test('the columns: one more for each COLUMN_MIN_PT of pane body, up to six; a column always holds a card whose rows do not stack', () => {
  const m = COLUMN_MIN_PT
  expect([COLUMNS_2_FROM_PT, COLUMNS_3_FROM_PT, COLUMNS_4_FROM_PT, COLUMNS_5_FROM_PT, COLUMNS_6_FROM_PT]).toEqual([2 * m, 3 * m, 4 * m, 5 * m, 6 * m])
  expect(MAX_COLUMNS).toBe(6)
  const at = (pt: number) => columnsFor(pt)
  expect([at(300), at(2 * m - 1), at(2 * m), at(3 * m - 1), at(3 * m), at(4 * m - 1), at(4 * m), at(5 * m - 1), at(5 * m), at(6 * m - 1), at(6 * m), at(3400), at(10_000)]).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6])
  for (let n = 2; n <= MAX_COLUMNS; n += 1) {
    const g = paneGrid(n * COLUMN_MIN_PT, 'auto', 10)
    expect(g.ncol).toBe(n)
    expect(g.innerPt).toBeGreaterThanOrEqual(STACK_BELOW_PT)
  }
})

test('Columns: Auto uses what fits, a number is the most, and a number larger than fits uses what fits', () => {
  expect(findSetting('look.columns')?.default).toBe('auto')
  expect(findSetting('look.columns')?.options.map(o => o.value)).toEqual([...COLUMN_CHOICES])
  expect(columnsUsed(2400, 'auto')).toBe(6)
  expect(columnsUsed(2400, undefined)).toBe(6)
  expect(columnsUsed(2400, 'nonsense')).toBe(6)
  expect(columnsUsed(2400, '3')).toBe(3)
  expect(columnsUsed(2400, '1')).toBe(1)
  expect(columnsUsed(800, '6')).toBe(2)
  expect(columnsUsed(500, '4')).toBe(1)
  expect(columnsUsed(1600, '7')).toBe(4)
})

test('the rows a list shows: five on a laptop pane in Auto, more on a tall pane, more in wider cards, never more than the most', () => {
  const rowsOf = (pt: number) => Math.round(pt / ROW_PT)
  expect(listShowFor(2, 2, rowsOf(600))).toBe(LIST_SHOW)
  expect(listShowFor(1, 1, undefined)).toBe(LIST_SHOW)
  expect(listShowFor(2, 2, rowsOf(TWO_SCREENS_PT))).toBe(2 * LIST_SHOW)
  expect(listShowFor(2, 2, rowsOf(2400))).toBe(3 * LIST_SHOW)
  expect(listShowFor(6, 3, rowsOf(600))).toBe(2 * LIST_SHOW)
  expect(listShowFor(6, 1, rowsOf(2400))).toBe(LIST_SHOW_MAX)
  expect(paneGrid(2400, '3', 10, rowsOf(600)).listShow).toBe(2 * LIST_SHOW)
  expect(paneGrid(2400, 'auto', 10, rowsOf(600)).listShow).toBe(LIST_SHOW)
})

// The grid rule: columns are WHOLE cells (floored), one whole column apart.
const wholeCols = (w: number, n: number): number => Math.floor((Math.floor(w / columnPt() + 0.01) - (n - 1)) / n)
const oneCol = (w: number): number => Math.min(w, Math.floor(ONE_COLUMN_MAX_PT / columnPt()) * columnPt())
test('the placement grid at every width, height and choice: same left edge as the title, equal columns of whole cells, one-column gaps, the last column ends within a few cells of the title row', () => {
  for (const w of WIDTHS_PT)
    for (const hgt of HEIGHTS_PT)
      for (const choice of COLUMN_CHOICES)
        for (const cards of [1, 3, 10]) {
          const g = paneGrid(w, choice, cards, Math.round(hgt / ROW_PT))
          const rights = g.lefts.map(l => l + g.colPt)
          expect(g.lefts[0]).toBe(0)
          expect(g.lefts).toHaveLength(g.ncol)
          for (let n = 1; n < g.ncol; n += 1) expect(Math.abs(g.lefts[n] - rights[n - 1] - cardGapX())).toBeLessThan(CLOSE)
          if (g.ncol === g.bucket && g.ncol > 1) {
            expect(Number.isInteger(g.colCells)).toBe(true)
            expect(rights[rights.length - 1]).toBeLessThanOrEqual(w + CLOSE)
            expect(w - rights[rights.length - 1]).toBeLessThan((g.ncol + 1) * columnPt())
          } else if (g.ncol === g.bucket) expect(Math.abs(rights[rights.length - 1] - oneCol(w))).toBeLessThan(CLOSE)
          else {
            expect(Math.abs(g.colPt - g.cap.colPt)).toBeLessThan(CLOSE)
            expect(rights[rights.length - 1]).toBeLessThanOrEqual(w + CLOSE)
          }
          // One column on a wide pane keeps a reading width (ONE_COLUMN_MAX_PT) at the left
          expect(g.cap.capped).toBe(g.bucket > 1 || oneCol(w) < w)
          expect(Math.abs(g.cap.colPt - (g.bucket === 1 ? oneCol(w) : wholeCols(w, g.bucket) * columnPt()))).toBeLessThan(CLOSE)
          expect(g.innerPt).toBeGreaterThanOrEqual(CARD_MIN_INNER_PT)
          if (w >= CARD_MIN_INNER_PT + 2 * BORDER_X_PT) expect(g.innerPt + 2 * BORDER_X_PT).toBeLessThanOrEqual(g.colPt + CLOSE)
          // More than one column only when each is at least a phone-sized card.
          if (g.ncol > 1) expect(g.colPt + cardGapX() + columnPt()).toBeGreaterThanOrEqual(COLUMN_MIN_PT - CLOSE)
          expect(g.ncol).toBeLessThanOrEqual(Math.min(cards, columnsUsed(w, choice)))
          if (g.ncol === g.bucket && g.ncol > 1) expect(g.colCells).toBe(wholeCols(w, g.ncol))
        }
})

const rec = (id: string, over: Record<string, unknown> = {}) => ({
  sessionId: id,
  cwd: `/work/${id}`,
  model: 'claude-opus-5',
  state: 'working',
  startedAt: NOW - 20 * MIN,
  updatedAt: NOW - 2000,
  lastEventAt: NOW - 2000,
  stateSince: NOW - 3 * MIN,
  ...over,
})
function world(extra: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    'cockpit:firstrun': 'done',
    'cockpit:setting:look.view': 'custom',
    'cockpit:setting:detail': 'explained',
    'cockpit:session:test-session': rec('test-session', { cwd: '/work/app', contextPercent: 38, costUsd: 1.2, fiveHourPercent: 62, fiveHourResetsAt: '2026-10-10T18:00:00Z' }),
    ...extra,
  }
  for (let n = 1; n <= 12; n += 1) out[`cockpit:session:s${n}`] = rec(`s${n}`)
  return out
}
function engine(on: On) {
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
}
const propsAt = (wPt: number, hPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: wPt / columnPt(), placement: 'dock' as const, scroll: { bodyRows: Math.round(hPt / ROW_PT), offset: 0, total: 200 }, view: {} })

type Node = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const OFFSETS = ['margin', 'marginLeft', 'marginRight', 'marginX', 'padding', 'paddingLeft', 'paddingRight', 'paddingX', 'left', 'right', 'alignSelf']
// The widest thing inside a part, in points: a Box or Client with a width in cells, or a picture's width.
const widest = (n: Node): number =>
  Math.max(
    0,
    ...walk(n)
      .slice(1)
      .map(x => (x.type === 'Svg' ? Number(x.props?.width ?? 0) : typeof x.props?.width === 'number' ? (x.props.width as number) * columnPt() : 0)),
  )

async function checkGeometry($: { ui: { mount: (o: unknown) => Promise<never> } }, choice: string): Promise<{ one: number; many: number }> {
  const seen = { one: 0, many: 0 }
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(800, 600) })) as {
    drawn: () => Promise<Node>
    redraw: (p: unknown) => Promise<void>
    unmount: () => Promise<void>
  }
  for (const w of WIDTHS_PT)
    for (const hgt of HEIGHTS_PT) {
      await ui.redraw(propsAt(w, hgt))
      const root = await ui.drawn()
      // The pane's tree is as wide as the body and sits at its left edge: no offset, no centring.
      expect(root.props?.width).toBe('100%')
      expect(root.props?.alignItems).toBe('stretch')
      for (const k of [...OFFSETS, 'height', 'flexGrow', 'justifyContent']) expect(root.props?.[k]).toBeUndefined()
      const row = walk(root).find(x => (x.key ?? x.props?.key) === 'columns')
      const innerPt = Math.max(CARD_MIN_INNER_PT, Math.round(w - 2 * BORDER_X_PT))
      const columnsChoice = choice
      if (row === undefined) {
        expect(columnsUsed(innerPt + 2 * BORDER_X_PT, columnsChoice)).toBe(1)
        // A card sets its own side padding (CARD_PAD_X_PT) so the host's default never applies; nothing else shifts it
        for (const card of kids(root)) {
          for (const k of [...OFFSETS.filter(o => o !== 'paddingLeft' && o !== 'paddingRight'), 'width']) expect(card.props?.[k]).toBeUndefined()
          for (const k of ['paddingLeft', 'paddingRight']) expect([undefined, cols(CARD_PAD_X_PT)]).toContain(card.props?.[k])
        }
        for (const card of kids(root)) expect(widest(card)).toBeLessThanOrEqual(innerPt + 2 * BORDER_X_PT + CLOSE)
        seen.one += 1
        continue
      }
      seen.many += 1
      expect(row.props?.width).toBe('100%')
      expect(row.props?.columnGap).toBe(cols(cardGapX()))
      for (const k of [...OFFSETS, 'height', 'flexGrow']) expect(row.props?.[k]).toBeUndefined()
      const columns = kids(row)
      const g = paneGrid(innerPt + 2 * BORDER_X_PT, columnsChoice, 10, Math.round(hgt / ROW_PT))
      expect(columns.length).toBeGreaterThan(1)
      expect(columns.length).toBeLessThanOrEqual(g.bucket)
      const cells = columns.map(c => c.props?.width as number)
      expect(new Set(cells).size).toBe(1)
      expect(Number.isInteger(cells[0])).toBe(true)
      expect(cells.length * cells[0] + (cells.length - 1) * cols(cardGapX())).toBeLessThanOrEqual(w / columnPt() + 0.05)
      for (const c of columns) {
        expect([c.props?.flexGrow, c.props?.flexShrink, c.props?.overflow]).toEqual([0, 0, 'hidden'])
        for (const k of OFFSETS) expect(c.props?.[k]).toBeUndefined()
        expect(widest(c)).toBeLessThanOrEqual(cells[0] * columnPt() + CLOSE)
        expect(cells[0] * columnPt() - 2 * BORDER_X_PT).toBeGreaterThanOrEqual(CARD_MIN_INNER_PT)
      }
      // A full-width bar's picture is never narrower than its bar, so it reaches the card's right end on any screen.
      for (const svg of walk(root).filter(x => x.type === 'Svg' && String(x.props?.source ?? '').includes('preserveAspectRatio="none"'))) {
        const src = String(svg.props?.source)
        const outer = Number(/width="([\d.]+)"/.exec(src)?.[1])
        const view = Number(/viewBox="0 0 ([\d.]+)/.exec(src)?.[1])
        expect(outer).toBeGreaterThanOrEqual(view)
      }
    }
  await ui.unmount()
  return seen
}

test('the drawn pane at 300 to 3400 pt wide and 600 to 2400 pt tall, Auto: the drawn widths are the grid, edges line up', { timeoutMs: 30_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, world())
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  // 300 and 500 pt draw one column; 800 to 3400 pt draw two to six, at each of the three heights.
  expect(await checkGeometry($ as never, 'auto')).toEqual({ one: 6, many: 15 })
})

test('the drawn pane with Columns 2 on every screen: two wide columns, the same edges', { timeoutMs: 30_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, world({ 'cockpit:setting:look.columns': '2' }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  expect(await checkGeometry($ as never, '2')).toEqual({ one: 6, many: 15 })
})

test('Columns 1 on a very wide pane keeps a reading width at the left, and its bars reach their end', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, world({ 'cockpit:setting:look.columns': '1' }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(3400, 1400) })
  const col = await ui.find({ key: 'column-one' })
  expect(col, 'the one column is a box of its own width').toBeDefined()
  expect(Number(col?.props.width)).toBeLessThanOrEqual(cols(ONE_COLUMN_MAX_PT))
  const bars = (await ui.findAll({ type: 'Svg' })).filter(x => String(x.props.source).includes('preserveAspectRatio="none"'))
  expect(bars.length).toBeGreaterThan(0)
  await ui.unmount()
})

test('a tall pane shows more sessions before "N more sessions"; a laptop pane keeps five; fewer columns on a wide screen show more', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = new Map<string, unknown>(Object.entries(world()))
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
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(800, 600) })
  const more = async () => ((await ui.find({ text: /^\d+ more sessions?$/ })) as { text?: string } | undefined)?.text
  expect(await more()).toBe('7 more sessions')
  await ui.redraw(propsAt(800, TWO_SCREENS_PT))
  expect(await more()).toBe('2 more sessions')
  await ui.redraw(propsAt(800, 2400))
  expect(await more()).toBeUndefined()
  await ui.redraw(propsAt(2400, 600))
  expect(await more()).toBe('7 more sessions')
  await ui.unmount()
  const cmd = (await $.command.run({ ...viaParent('vaken-settings', 'look.columns 3'), origin: { kind: 'composer' } } as never)) as { text?: string } | undefined
  expect(cmd?.text ?? '').toMatch(/look\.columns: 3/)
  const three = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(2400, 600) })
  expect(((await three.find({ text: /^\d+ more sessions?$/ })) as { text?: string } | undefined)?.text).toBe('2 more sessions')
  const row = (await three.find({ key: 'columns' })) as { children: unknown[] } | undefined
  expect(row?.children.filter(c => c !== null && typeof c === 'object')).toHaveLength(3)
  await three.unmount()
})

const io = (mem: Map<string, unknown>) =>
  ({
    get: async (k: string) => mem.get(k),
    set: async (k: string, v: unknown) => void mem.set(k, v),
    del: async (k: string) => void mem.delete(k),
  }) as never

test('a width with no order of its own starts from the nearest smaller one; 1 to 3 start from the default; orders saved before the fixed groups are not read', async () => {
  const mem = new Map<string, unknown>()
  mem.set('cockpit:pref:order', 'others,limit,here')
  mem.set('cockpit:pref:order:2', 'others,limit,here')
  mem.set('cockpit:pref:gorder:1', 'here,others,limit')
  mem.set('cockpit:pref:gorder:3', 'limit,others,here')
  const o = await readOrders(io(mem))
  expect(BUCKETS).toEqual([1, 2, 3, 4, 5, 6])
  expect(o[1].slice(0, 3)).toEqual(['here', 'others', 'limit'])
  // 2 has none of its own: an order saved before the fixed groups is not read, so it is the default (group by group).
  expect(o[2]).toEqual([...CARD_IDS])
  expect(o[3].slice(0, 3)).toEqual(['limit', 'others', 'here'])
  for (const b of [4, 5, 6] as const) expect(o[b]).toEqual(o[3])
  mem.set('cockpit:pref:gorder:5', 'autopilot,limit')
  const p = await readOrders(io(mem))
  expect(p[4]).toEqual(o[3])
  expect(p[5].slice(0, 2)).toEqual(['autopilot', 'limit'])
  expect(p[6]).toEqual(p[5])
  for (const b of BUCKETS) expect([...p[b]].sort()).toEqual([...CARD_IDS].sort())
  expect([0, 1, 6, 7, '3'].map(isBucket)).toEqual([false, true, true, false, false])
})

test('saved layouts keep all six widths; an older layout of three widths still loads, its wider widths from its widest', () => {
  const order = (first: string) => [first, ...CARD_IDS.filter(id => id !== first)]
  const orders = Object.fromEntries(BUCKETS.map(b => [b, order(CARD_IDS[b] ?? 'limit')])) as never
  const l = snapshot(defaults(), orders)
  for (const b of BUCKETS) expect(l.orders[b][0]).toBe(CARD_IDS[b] ?? 'limit')
  const old = parseLayouts(JSON.stringify({ Old: { v: { detail: 'simple' }, o: { 1: 'here', 2: 'others', 3: 'autopilot,limit' } } }))
  expect(old.Old.orders[3].slice(0, 2)).toEqual(['autopilot', 'limit'])
  for (const b of [4, 5, 6] as const) expect(old.Old.orders[b]).toEqual(old.Old.orders[3])
  const fresh = parseLayouts(JSON.stringify({ New: { v: {}, o: { 1: 'here', 2: 'here', 3: 'here', 4: 'agents', 5: 'skills', 6: 'prs' } } }))
  expect([4, 5, 6].map(b => fresh.New.orders[b as 4][0])).toEqual(['agents', 'skills', 'prs'])
  expect(sameLayout(old.Old, snapshot(old.Old.values, old.Old.orders))).toBe(true)
})

test('the arrange board at five columns: five equal columns, filled in turn, the last ending within a few cells of the board edge', () => {
  const ids = ['limit', 'here', 'others', 'autopilot', 'proof', 'guard', 'agents', 'computer', 'skills', 'prs']
  const heights = Object.fromEntries(ids.map((id, n) => [id, 3 + (n % 4)]))
  // Not group by group (an arranged order): one sequence cut into five columns of two.
  expect(placeColumns(ids.length, 5).map(g => g[0])).toEqual([0, 2, 4, 6, 8])
  const rects = [...listsLayout(boardLists(ids, undefined, 5), heights, 221, 1).tiles.values()]
  const xs = [...new Set(rects.map(r => r.x))]
  expect(xs).toHaveLength(5)
  expect(xs[0]).toBe(0)
  const last = rects.reduce((a, r) => (r.x > a.x ? r : a))
  // Every column is as wide as the others; the spare cells (fewer than one per column) stay free at the right
  expect(last.x + last.w).toBeLessThanOrEqual(221)
  expect(221 - (last.x + last.w)).toBeLessThan(5)
  const widths = new Set(rects.map(r => r.w))
  expect(widths.size).toBe(1)
  // Each tile is as tall as its card: no tile stretches to the tallest column's foot
  expect(rects.map(r => r.tall)).toEqual(ids.map(id => heights[id]))
})

test('arranging at five columns: the board gets five columns and a drop is kept for that width only', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = new Map<string, unknown>(Object.entries(world()))
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
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const props = propsAt(1800, 1400)
  const start = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props })
  await start.press({ key: 'arrange' })
  await start.unmount()
  const board = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props })
  const client = (await board.find({ key: 'arrange-board' })) as { props: { props: { lists: string[][]; bucket: number } } } | undefined
  expect(client?.props.props.lists).toHaveLength(5)
  expect(client?.props.props.bucket).toBe(5)
  const lists = (client?.props.props.lists ?? []).map(l => l.filter(id => id !== 'needs').reverse())
  const text = lists.map(l => l.join(',')).join('|')
  await board.post({ lists: text, bucket: 5 }, { in: 'arrange-board' })
  // Each column keeps its own list; the cards not shown stay under the last column
  const kept = String(mem.get('cockpit:pref:gorder:5')).split('|')
  expect(kept).toHaveLength(5)
  for (const [n, l] of lists.entries()) expect(kept[n].startsWith(l.join(','))).toBe(true)
  expect(kept.slice(0, 4)).toEqual(lists.slice(0, 4).map(l => l.join(',')))
  expect(mem.get('cockpit:pref:gorder:3')).toBeUndefined()
  await board.press({ key: 'arrange-done' })
  await board.unmount()
})

// The same app (3.6556.2) draws a narrower text cell on Windows: 43 whole cells measured 509 px at 1.5 scale there, 8.8 pt a cell on a Mac
const onSystem = <T>(sys: 'posix' | 'win32', run: () => T): T => {
  setColumnSystem(sys)
  try {
    return run()
  } finally {
    setColumnSystem('posix')
  }
}
const near = (got: number, want: number, within = 1e-9): void => expect(Math.abs(got - want), `${got} is ${want}`).toBeLessThanOrEqual(within)

test('the text column per system: 8.8 pt on a Mac and anything not Windows, 7.9 pt on Windows; everything made of columns follows', () => {
  expect([COL_PT_MAC, COL_PT_WIN]).toEqual([8.8, 7.9])
  expect(columnPt()).toBe(8.8)
  const mac = { col: columnPt(), gap: cardGapX(), span: settingsSpanGap(), hit: switchHitW(), cells: cols(88) }
  expect(mac).toMatchObject({ col: 8.8, gap: 8.8, cells: 10 })
  near(mac.span, 17.6)
  const win = onSystem('win32', () => ({ col: columnPt(), gap: cardGapX(), span: settingsSpanGap(), hit: switchHitW(), cells: cols(79), gapCells: cols(cardGapX()), spanCells: cols(settingsSpanGap()) }))
  expect(win).toMatchObject({ col: 7.9, gap: 7.9, cells: 10, gapCells: 1, spanCells: 2 })
  near(win.span, 15.8)
  near(mac.hit - win.hit, PRESS_WASH_OUT * (8.8 - 7.9))
  near(onSystem('win32', () => 43 * columnPt()), 509 / 1.5, 0.5)
  // Only Windows changes it; any other value is the Mac's
  expect(onSystem('linux' as never, () => columnPt())).toBe(8.8)
  expect(columnPt()).toBe(8.8)
})

test('the grid on Windows is laid in 7.9 pt cells: the same body of 120 cells is 3 columns of 39 on a Mac and 2 of 59 on Windows, and fills the pane', () => {
  const at = (sys: 'posix' | 'win32') =>
    onSystem(sys, () => {
      const bodyPt = 120 * columnPt()
      const g = paneGrid(bodyPt, 'auto', 10, 30)
      return { bodyPt, ncol: g.ncol, colCells: g.colCells, colPt: g.colPt, gapPt: g.gapPt, gapCells: g.gapCells, twoCells: columnCells(bodyPt, 2) }
    })
  const mac = at('posix')
  expect(mac).toMatchObject({ ncol: 3, colCells: 39, gapPt: 8.8, gapCells: 1, twoCells: 59 })
  near(mac.bodyPt, 1056, 1e-6)
  near(mac.colPt, 39 * 8.8, 1e-6)
  const win = at('win32')
  expect(win).toMatchObject({ ncol: 2, colCells: 59, gapPt: 7.9, gapCells: 1, twoCells: 59 })
  near(win.bodyPt, 948, 1e-6)
  near(win.colPt, 59 * 7.9, 1e-6)
  // Columns and gaps in whole cells end within the pane's own cells on both systems
  for (const g of [mac, win]) expect(g.ncol * g.colCells + (g.ncol - 1) * g.gapCells).toBeLessThanOrEqual(120)
})

// The plugin reads the system once at session start (the OS variable) and lays the pane in that system's cells
async function columnsAt120(sys: Record<string, string>, $: { session: { start: (e: never) => Promise<unknown> }; ui: { mount: (o: unknown) => Promise<never> } }, on: On): Promise<unknown[]> {
  mock.clock(on, { now: NOW })
  mock.store(on, world())
  mock.env(on, { HOME: '/home/test', ...sys })
  engine(on)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: { ...propsAt(0, 1400), bodyColumns: 120 } })) as { drawn: () => Promise<Node>; unmount: () => Promise<void> }
  const row = walk(await ui.drawn()).find(x => (x.key ?? x.props?.key) === 'columns')
  await ui.unmount()
  return kids(row ?? {}).map(c => c.props?.width)
}

test('a session on Windows (OS is Windows_NT) draws a 120-cell pane in 7.9 pt cells: 2 columns of 59', async ($, on) => {
  expect(await columnsAt120({ OS: 'Windows_NT' }, $ as never, on)).toEqual([59, 59])
})

test('a Mac session draws the same 120-cell pane in 8.8 pt cells: 3 columns of 39', async ($, on) => {
  expect(await columnsAt120({}, $ as never, on)).toEqual([39, 39, 39])
})
