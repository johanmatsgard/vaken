import { expect } from 'claude-code/testing'
import { test } from './slow'
import { CARD_GROUP, GROUPS, groupIndexOf, isGroupOrder } from '../hooks/core/cardhome'
import { boardLayout, boardRows, cardHeights, heightOf, holdTop, isIdle, IDLE_REPACK_MS, placeColumns } from '../hooks/features/home/board'
import type { CardFacts, Columns } from '../hooks/features/home/board'
import { paneGrid } from '../hooks/features/home/grid'
import { ROW_PT } from '../hooks/ui/tokens'

const heights = { limit: 5, here: 4, others: 12 }

test('the board uses the pane placement: three cards in three columns, two columns with the first two stacked, or one column', () => {
  const three = boardLayout(['limit', 'here', 'others'], heights, 3, 92, 1)
  expect(three.map(r => r.x)).toEqual([0, 31, 62])
  expect(new Set(three.map(r => r.tall))).toEqual(new Set([12]))
  const two = boardLayout(['limit', 'here', 'others'], heights, 2, 91, 1)
  expect(two[0]).toEqual({ x: 0, y: 0, w: 45, tall: 5 })
  expect(two[1]).toEqual({ x: 0, y: 5, w: 45, tall: 7 })
  expect(two[2]).toEqual({ x: 46, y: 0, w: 45, tall: 12 })
  const one = boardLayout(['limit', 'here', 'others'], heights, 1, 60, 1)
  expect(one.map(r => r.y)).toEqual([0, 5, 9])
})

test('the board is as tall as the tallest order, and a card height is at least three rows', () => {
  expect(boardRows(['limit', 'here', 'others'], heights, 1, 60, 1)).toBe(21)
  expect(boardRows(['limit', 'here', 'others'], heights, 3, 92, 1)).toBe(12)
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
  const xs = (ids: string[], hs: Record<string, number>, ncol: Columns): Map<string, number> => new Map(boardLayout(ids, hs, ncol, 221, 1).map((r, i) => [ids[i], r.x]))
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

test('the board rects follow reading order: rect i is card i, every column ends at the tallest, the last column ends at the edge', () => {
  const four = { limit: 5, here: 4, others: 12, autopilot: 3 }
  const order = ['limit', 'here', 'others', 'autopilot']
  const rects = boardLayout(order, four, 3, 92, 1)
  expect(rects.map(r => r.x)).toEqual([0, 0, 31, 62])
  expect(rects[1].y).toBe(5)
  const bottoms = new Set([rects[1].y + rects[1].tall, rects[2].y + rects[2].tall, rects[3].y + rects[3].tall])
  expect(bottoms.size).toBe(1)
  expect(rects[3].x + rects[3].w).toBe(92)
})

test('the board is tall enough for every order, found without trying every order', () => {
  const orders = (ids: string[]): string[][] => {
    const out: string[][] = []
    const permute = (rest: string[], done: string[]): void => {
      if (rest.length === 0) out.push(done)
      for (const [i, id] of rest.entries()) permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...done, id])
    }
    permute(ids, [])
    return out
  }
  const tallestOrder = (ids: string[], hs: Record<string, number>, ncol: Columns): number => Math.max(...orders(ids).map(o => Math.max(...boardLayout(o, hs, ncol, 92, 1).map(r => r.y + r.tall))))
  const ids = ['a', 'b', 'c', 'd', 'e', 'f']
  for (let seed = 1; seed <= 12; seed += 1) {
    const hs: Record<string, number> = Object.fromEntries(ids.map((id, n) => [id, ((seed * 7 + n * 5) % 11) + 3]))
    const most = Math.max(...Object.values(hs))
    for (let n = 1; n <= ids.length; n += 1) {
      for (const ncol of [1, 2, 3, 4] as const) {
        const real = tallestOrder(ids.slice(0, n), hs, ncol)
        const rows = boardRows(ids.slice(0, n), hs, ncol, 92, 1)
        expect(rows).toBeGreaterThanOrEqual(real)
        expect(rows).toBeLessThanOrEqual(real + most + 1)
      }
    }
  }
  expect(boardRows(['a', 'zz'], { a: 9 }, 1, 92, 1)).toBe(12)
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
