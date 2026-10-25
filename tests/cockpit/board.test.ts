import { expect } from 'claude-code/testing'
import { test } from './slow'
import { CARD_GROUP, GROUPS, groupIndexOf, isGroupOrder } from '../hooks/core/cardhome'
import { boardLists, cardHeights, heightOf, holdTop, isIdle, IDLE_REPACK_MS, listsLayout, listsRows, placeColumns, placeEven, placeEvenSteady, placeLists } from '../hooks/features/home/board'
import type { CardFacts, Columns } from '../hooks/features/home/board'
import { paneGrid } from '../hooks/features/home/grid'
import { ARRANGE_ROW_GAP, ROW_PT } from '../hooks/ui/tokens'

const heights = { limit: 5, here: 4, others: 12 }

test('the board uses the pane placement: three cards in three columns, two columns with the first two stacked, or one column; tiles as tall as their cards, a gap apart', () => {
  const ids = ['limit', 'here', 'others']
  const three = listsLayout(boardLists(ids, undefined, 3), heights, 92, 1)
  expect(ids.map(id => three.tiles.get(id)?.x)).toEqual([0, 31, 62])
  expect(ids.map(id => three.tiles.get(id)?.tall)).toEqual([5, 4, 12])
  const two = listsLayout(boardLists(ids, undefined, 2), heights, 91, 1)
  expect(two.tiles.get('limit')).toEqual({ x: 0, y: 0, w: 45, tall: 5, col: 0 })
  expect(two.tiles.get('here')).toEqual({ x: 0, y: 5 + ARRANGE_ROW_GAP, w: 45, tall: 4, col: 0 })
  expect(two.tiles.get('others')).toEqual({ x: 46, y: 0, w: 45, tall: 12, col: 1 })
  const one = listsLayout(boardLists(ids, undefined, 1), heights, 60, 1)
  expect(ids.map(id => one.tiles.get(id)?.y)).toEqual([0, 5 + ARRANGE_ROW_GAP, 9 + 2 * ARRANGE_ROW_GAP])
})

test('the board is as tall as its tallest column plus the tallest tile, and a card height is at least three rows', () => {
  expect(listsRows([['limit', 'here', 'others']], heights)).toBe(21 + 2 * ARRANGE_ROW_GAP)
  expect(listsRows([['limit'], ['here'], ['others']], heights)).toBe(21 + 2 * ARRANGE_ROW_GAP)
  expect(listsRows([['limit'], ['here']], heights)).toBe(9 + ARRANGE_ROW_GAP)
  const h = cardHeights({ isSimple: true, innerPt: 400, hasLimit: true, limitLines: 0, hereLines: 1, hereHasBar: false, others: 0, othersOpen: true, othersAll: false })
  expect(Math.min(h.limit, h.here, h.others)).toBeGreaterThanOrEqual(3)
  const busy = cardHeights({ isSimple: false, innerPt: 400, hasLimit: true, limitLines: 3, hereLines: 3, hereHasBar: true, others: 9, othersOpen: true, othersAll: false })
  expect(busy.others).toBeGreaterThan(busy.limit)
})


test('the fold: six cards in 6, 3, 2 and 1 columns', () => {
  expect(placeColumns(6, 6)).toEqual([[0], [1], [2], [3], [4], [5]])
  expect(placeColumns(6, 3)).toEqual([[0, 1], [2, 3], [4, 5]])
  expect(placeColumns(6, 2)).toEqual([[0, 1, 2], [3, 4, 5]])
  expect(placeColumns(6, 1)).toEqual([[0, 1, 2, 3, 4, 5]])
})

test('the fold: the first columns take one more when the count does not divide; a short list uses fewer columns; nothing is an empty column', () => {
  expect(placeColumns(7, 3).map(c => c.length)).toEqual([3, 2, 2])
  expect(placeColumns(17, 6).map(c => c.length)).toEqual([3, 3, 3, 3, 3, 2])
  expect(placeColumns(17, 4).map(c => c.length)).toEqual([5, 4, 4, 4])
  expect(placeColumns(2, 6)).toEqual([[0], [1]])
  expect(placeColumns(1, 3)).toEqual([[0]])
  expect(placeColumns(0, 3)).toEqual([[]])
  for (let n = 1; n <= 17; n += 1) {
    for (const ncol of [1, 2, 3, 4, 5, 6] as const) {
      const cols = placeColumns(n, ncol)
      expect(cols.flat()).toEqual(Array.from({ length: n }, (_, i) => i))
      for (const c of cols) expect(c.length).toBeGreaterThan(0)
    }
  }
})

test('every card is in a group, the default order follows the groups, and the groups hold what they were chosen to hold', () => {
  for (const id of Object.keys(CARD_GROUP)) expect(GROUPS).toContain(CARD_GROUP[id as keyof typeof CARD_GROUP])
  expect(Object.keys(CARD_GROUP)).toHaveLength(17)
  const by = (grp: string): string[] => Object.keys(CARD_GROUP).filter(id => CARD_GROUP[id as keyof typeof CARD_GROUP] === grp)
  expect(by('work')).toEqual(['limit', 'here', 'others', 'back', 'context', 'ship', 'prs', 'preview'])
  expect(by('helpers')).toEqual(['agents', 'setup', 'computer', 'skills', 'do'])
  expect(by('protection')).toEqual(['guard', 'safety', 'autopilot', 'proof'])
  expect(isGroupOrder(Object.keys(CARD_GROUP))).toBe(true)
  expect(isGroupOrder(['guard', 'limit'])).toBe(false)
  expect(groupIndexOf('autopilot')).toBe(2)
  expect(groupIndexOf('not-a-card')).toBe(0)
})

// A card keeps its column: placement never reads heights, so opening, closing or growing any card moves no card sideways.
test('opening or closing a card never moves another card to another column', () => {
  const all = Object.keys(CARD_GROUP)
  const xs = (ids: string[], hs: Record<string, number>, ncol: Columns): Map<string, number> => new Map([...listsLayout(boardLists(ids, undefined, ncol), hs, 221, 1).tiles].map(([id, r]) => [id, r.x]))
  for (const ncol of [2, 3, 4, 5, 6] as const) {
    for (const shown of [all, all.filter((_, n) => n % 2 === 0), all.slice(0, 9)]) {
      const calm = Object.fromEntries(shown.map(id => [id, 3]))
      const first = xs(shown, calm, ncol)
      for (const open of shown) {
        const grown = xs(shown, { ...calm, [open]: 40 }, ncol)
        const shut = xs(shown, { ...calm, [open]: 3 }, ncol)
        for (const id of shown) {
          expect(grown.get(id), `${id} with ${open} open at ${ncol} columns`).toBe(first.get(id))
          expect(shut.get(id)).toBe(first.get(id))
        }
      }
    }
  }
})

test('a card moves column only when the number of columns changes or the list gets longer or shorter before it', () => {
  const col = (n: number, ncol: Columns): number[] => {
    const m: number[] = []
    for (const [c, cell] of placeColumns(n, ncol).entries()) for (const i of cell) m[i] = c
    return m
  }
  for (const ncol of [1, 2, 3, 4, 5, 6] as const) expect(col(6, ncol)).toEqual(col(6, ncol))
  // The order of columns is by index: a lower index never sits in a later column than a higher one.
  for (let n = 1; n <= 17; n += 1) for (const ncol of [2, 3, 4, 5, 6] as const) expect(col(n, ncol)).toEqual([...col(n, ncol)].sort((x, y) => x - y))
})

test('the board tiles follow reading order: each tile as tall as its card (no stretch to the tallest column), the last column ends at the edge', () => {
  const four = { limit: 5, here: 4, others: 12, autopilot: 3 }
  const order = ['limit', 'here', 'others', 'autopilot']
  const board = listsLayout(boardLists(order, undefined, 3), four, 92, 1)
  const rects = order.map(id => board.tiles.get(id) ?? { x: -1, y: -1, w: 0, tall: 0 })
  expect(rects.map(r => r.x)).toEqual([0, 0, 31, 62])
  expect(rects[1].y).toBe(5 + ARRANGE_ROW_GAP)
  expect(rects.map(r => r.tall)).toEqual(order.map(id => four[id as keyof typeof four]))
  expect(rects[3].x + rects[3].w).toBe(92)
})

test('the board is tall enough for any one move of a tile into any column', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f']
  for (let seed = 1; seed <= 12; seed += 1) {
    const hs: Record<string, number> = Object.fromEntries(ids.map((id, n) => [id, ((seed * 7 + n * 5) % 11) + 3]))
    for (const ncol of [1, 2, 3, 4] as const) {
      const lists = boardLists(ids, undefined, ncol)
      const rows = listsRows(lists, hs)
      for (const id of ids) {
        for (let c = 0; c < lists.length; c += 1) {
          const moved = lists.map(l => l.filter(x => x !== id))
          moved[c].push(id)
          const board = listsLayout(moved, hs, 92, 1)
          expect(Math.max(...[...board.tiles.values()].map(r => r.y + r.tall))).toBeLessThanOrEqual(rows)
        }
      }
    }
  }
})

const calm = (innerPt: number, listShow: number): CardFacts => ({
  isSimple: true,
  innerPt,
  hasLimit: true,
  limitLines: 1,
  limitBars: 1,
  hereLines: 1,
  hereHasBar: true,
  lineRows: { proof: 1, guard: 1, agents: 1, computer: 2, skills: 1, prs: 1, ship: 1, back: 1, safety: 1, context: 1, preview: 1, setup: 1, do: 1 },
  others: 9,
  othersShown: Math.min(9, listShow),
  othersMore: 9 > listShow,
  othersOpen: true,
  othersAll: false,
})
const busy = (innerPt: number, listShow: number): CardFacts => ({
  ...calm(innerPt, listShow),
  isSimple: false,
  limitLines: 7,
  limitBars: 3,
  limitGaps: 3,
  hereLines: 6,
  hereGaps: 3,
  autopilotRows: 12,
  lineRows: { proof: 8, guard: 9, agents: 14, computer: 9, skills: 4, prs: 10, ship: 6, back: 3, safety: 8, context: 5, preview: 4, setup: 11, do: 3 },
  others: 14,
  othersShown: Math.min(14, listShow),
  othersMore: 14 > listShow,
})
const CARDS = ['limit', 'here', 'others', 'autopilot', 'proof', 'guard', 'agents', 'computer', 'skills', 'prs', 'ship', 'back', 'safety', 'context', 'preview', 'setup', 'do']

test('placing the real card heights at 500, 800, 1100, 1600 and 2400 pt wide and three heights: every column holds a card, in order, whatever the heights', () => {
  let placedColumns = 0
  for (const w of [500, 800, 1100, 1600, 2400]) {
    for (const bodyPt of [600, 1400, 2400]) {
      for (const facts of [calm, busy]) {
        for (let count = 1; count <= CARDS.length; count += 1) {
          const g = paneGrid(w, 'auto', count, Math.round(bodyPt / ROW_PT))
          const hs = cardHeights(facts(g.innerPt, g.listShow))
          const ids = Object.keys(CARD_GROUP).slice(0, count)
          const h = ids.map(id => heightOf(hs, id))
          expect(h.every(v => v >= 3)).toBe(true)
          const cols = placeColumns(ids.length, g.ncol)
          expect(cols).toHaveLength(g.ncol)
          expect(cols.flat()).toEqual(ids.map((_, n) => n))
          for (const group of cols) expect(group.length).toBeGreaterThan(0)
          if (g.ncol > 1) placedColumns += 1
        }
      }
    }
  }
  expect(placedColumns).toBeGreaterThan(100)
})

test('1100 pt, three columns, 17 cards: the list folds six, six and five', () => {
  const g = paneGrid(1100, 'auto', CARDS.length, 60)
  expect(g.ncol).toBe(3)
  expect(placeColumns(CARDS.length, 3).map(c => c.length)).toEqual([6, 6, 5])
})

test('holdTop: the Needs you card changes only at an idle moment', ($) => {
  const idleFirst = holdTop(undefined, 2, true)
  expect(idleFirst).toEqual({ show: 2, spacer: 0, memory: { rows: 2 } })
  expect(holdTop(idleFirst.memory, 3, false)).toEqual({ show: 2, spacer: 0, memory: { rows: 2 } })
  expect(holdTop(idleFirst.memory, 1, false)).toEqual({ show: 1, spacer: 1, memory: { rows: 2 } })
  expect(holdTop({ rows: 0 }, 2, false).show).toBe(0)
  expect(holdTop({ rows: 2 }, 0, false)).toEqual({ show: 0, spacer: 2, memory: { rows: 2 } })
  expect(holdTop(idleFirst.memory, 3, true).show).toBe(3)
  expect(isIdle(10000, 9000)).toBe(false)
  expect(isIdle(10000, 10000 - IDLE_REPACK_MS)).toBe(true)
  expect(isIdle(10000, undefined)).toBe(true)
})

test('even columns: each next card goes under the shortest column, so the columns end at about the same height', () => {
  const hs: Record<string, number> = { a: 10, b: 3, c: 3, d: 3, e: 3 }
  // a is tall: the short cards go beside it until the second column is taller
  expect(placeEven(['a', 'b', 'c', 'd', 'e'], hs, 2, 0)).toEqual([[0], [1, 2, 3, 4]])
  expect(placeEven(['a', 'b', 'c', 'd', 'e'], { ...hs, a: 8 }, 2, 0)).toEqual([[0, 4], [1, 2, 3]])
  expect(placeEven(['a', 'b'], hs, 3, 0)).toEqual([[0], [1]])
  // The same cards and width keep their columns when a card grows; a new card places them again
  const first = placeEvenSteady(['a', 'b', 'c', 'd'], hs, 2, undefined, 0, 0)
  const grown = placeEvenSteady(['a', 'b', 'c', 'd'], { ...hs, b: 30 }, 2, first.memory, 0, 0)
  expect(grown.groups).toEqual(first.groups)
  const more = placeEvenSteady(['a', 'b', 'c', 'd', 'e'], hs, 2, first.memory, 0, 0)
  expect(more.memory.key).not.toBe(first.memory.key)
  // While the person presses, a late card goes under the shortest column and the others stay
  const late = placeEvenSteady(['a', 'b', 'c', 'd', 'e'], hs, 2, first.memory, 1, 0)
  expect(first.groups).toEqual([[0], [1, 2, 3]])
  expect(late.groups).toEqual([[0], [1, 2, 3, 4]])
  expect(late.memory).toBe(first.memory)
})

test('arranged columns: a card in no list goes under the shortest column, not the first', () => {
  const hs: Record<string, number> = { limit: 20, here: 3, agents: 3, guard: 3 }
  expect(placeLists(['limit', 'agents', 'guard', 'here'], [['limit'], ['agents', 'guard']], 2, 0, hs, 0)).toEqual([[0], [1, 2, 3]])
})
