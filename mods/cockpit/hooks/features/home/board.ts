// The arrange board's layout as plain data: where each card sits for a given order, in whole text cells.
import { NEEDS_SLOT } from './viewset'
import { ARRANGE_ROW_GAP, BAR_SLOT, CARD_INSET_Y_PT, GROUP_GAP, LIST_ROW_GAP, LIST_ROW_H, LIST_SHOW, ROW_PT, STACK_BELOW_PT, ARRANGE_MIN_ROWS, rows } from '../../ui/tokens'

export type Rect = { x: number; y: number; w: number; tall: number }
export type Columns = 1 | 2 | 3 | 4 | 5 | 6

export function columnSizes(n: number, ncol: Columns): number[] {
  const k = Math.max(1, Math.min(ncol, n))
  return Array.from({ length: k }, (_, c) => Math.floor(n / k) + (c < n % k ? 1 : 0))
}

export const heightOf = (heights: Record<string, number>, id: string): number => heights[id] ?? ARRANGE_MIN_ROWS

// The ordered list folds column-major: column 1 is filled from the top, then column 2, and so on
export function placeColumns(count: number, ncol: Columns): number[][] {
  let at = 0
  return columnSizes(count, ncol).map(size => {
    const col = Array.from({ length: size }, (_, n) => at + n)
    at += size
    return col
  })
}

// How long the pane must have had no press before it may let the Needs you card change height (token
export const IDLE_REPACK_MS = 4000

// A card that appears while the person presses in the pane waits at the end of the last column, so a press never lands on a moved card.
// The hold ends this long after the last press, or when the pane closes.
export const STEADY_MS = 30_000
export type Steady = { ids: readonly string[] }
export const isSteady = (now: number, lastPress: number | undefined): boolean => lastPress !== undefined && now - lastPress < STEADY_MS
export function steadyOrder<T extends string>(prev: Steady | undefined, order: readonly T[], holding: boolean): { order: T[]; late: number; memory: Steady } {
  if (!holding || prev === undefined) return { order: [...order], late: 0, memory: { ids: [...order] } }
  const late = order.filter(id => !prev.ids.includes(id))
  return { order: [...order.filter(id => prev.ids.includes(id)), ...late], late: late.length, memory: prev }
}
// As placeColumns for the cards that were there, with the late ones added under the last column
export function placeSteady(count: number, late: number, ncol: Columns): number[][] {
  if (late <= 0) return placeColumns(count, ncol)
  const groups = placeColumns(count - late, ncol)
  const last = groups[groups.length - 1] ?? []
  for (let n = count - late; n < count; n += 1) last.push(n)
  return groups.length === 0 ? [last] : groups
}

// EVEN COLUMNS: each next card in the order goes under the shortest column so far
// (the leftmost of equal ones), so the columns end at about the same height. Heights are the cards' estimated rows (cardHeights), `rowGap` the gap between two.
const shortestOf = (tall: readonly number[]): number => tall.reduce((best, t, c) => (t < (tall[best] ?? Infinity) ? c : best), 0)
export function placeEven(ids: readonly string[], heights: Record<string, number>, ncol: Columns, rowGap: number = ARRANGE_ROW_GAP): number[][] {
  const k = Math.max(1, Math.min(ncol, ids.length))
  const cols: number[][] = Array.from({ length: k }, (): number[] => [])
  const tall = cols.map(() => 0)
  for (const [n, id] of ids.entries()) {
    const c = shortestOf(tall)
    tall[c] = (tall[c] ?? 0) + (cols[c]?.length === 0 ? 0 : rowGap) + heightOf(heights, id)
    cols[c]?.push(n)
  }
  return cols
}
// STEADY: a card keeps its column while the cards and the column count stay the same, so a card that opens, closes or grows never moves another one.
// The columns are placed again only when a card appears or goes, or the width changes. While the person presses (steady, `late` > 0) the cards
// that were there keep their columns and a late one goes under the shortest column.
export type EvenMemory = { key: string; cols: string[][] }
const evenKey = (ids: readonly string[], ncol: number): string => `${ncol}|${[...ids].sort().join(',')}`
export function placeEvenSteady(ids: readonly string[], heights: Record<string, number>, ncol: Columns, prev: EvenMemory | undefined, late = 0, rowGap: number = ARRANGE_ROW_GAP): { groups: number[][]; memory: EvenMemory } {
  const key = evenKey(ids, ncol)
  const keep = prev !== undefined && (prev.key === key || (late > 0 && prev.cols.length === Math.min(ncol, ids.length)))
  if (!keep) {
    const groups = placeEven(ids, heights, ncol, rowGap)
    return { groups, memory: { key, cols: groups.map(g => g.map(n => ids[n] ?? '')) } }
  }
  const where = new Map<string, number>()
  for (const [c, l] of prev.cols.entries()) for (const id of l) where.set(id, c)
  const groups: number[][] = prev.cols.map((): number[] => [])
  const tall = groups.map(() => 0)
  const put = (n: number, c: number): void => {
    tall[c] = (tall[c] ?? 0) + ((groups[c]?.length ?? 0) === 0 ? 0 : rowGap) + heightOf(heights, ids[n] ?? '')
    groups[c]?.push(n)
  }
  for (const [n, id] of ids.entries()) if (where.has(id)) put(n, where.get(id) ?? 0)
  for (const [n, id] of ids.entries()) if (!where.has(id)) put(n, shortestOf(tall))
  // The memory stays as it was while the person presses; the next redraw with the same cards places nothing again
  return { groups, memory: prev }
}

// Each column keeps its own list (Arrange with column placement). A slot goes to the column whose list holds it, in the slots' order; a slot in no list
// (the Needs you slot) heads the first column. Late cards (steady) go under the last column drawn. Empty columns are dropped, and more lists than columns fold together.
export function placeLists(slots: readonly string[], lists: readonly (readonly string[])[], ncol: Columns, late = 0, heights?: Record<string, number>, rowGap: number = ARRANGE_ROW_GAP): number[][] {
  const where = new Map<string, number>()
  for (const [c, l] of lists.entries()) for (const id of l) where.set(id, c)
  const cols: number[][] = Array.from({ length: Math.max(1, lists.length) }, (): number[] => [])
  const lateOnes: number[] = []
  const loose: number[] = []
  for (const [n, id] of slots.entries()) {
    if (n >= slots.length - late) lateOnes.push(n)
    else if (where.has(id) || id === NEEDS_SLOT || heights === undefined) cols[where.get(id) ?? 0].push(n)
    else loose.push(n)
  }
  const kept = cols.filter(c => c.length > 0)
  const folded = kept.length <= ncol ? kept : Array.from({ length: ncol }, (_, k) => kept.filter((_c, c) => Math.floor((c * ncol) / kept.length) === k).flat())
  if (folded.length === 0 && loose.length === 0) return lateOnes.length === 0 ? [] : [lateOnes]
  if (heights === undefined) {
    folded[folded.length - 1].push(...lateOnes)
    return folded
  }
  // With heights: a card in no list (a new card) and a late one go under the shortest column, as the even placement does
  if (folded.length === 0) folded.push([])
  const tall = folded.map(g => g.reduce((t, n, i) => t + (i === 0 ? 0 : rowGap) + heightOf(heights, slots[n] ?? ''), 0))
  for (const n of [...loose, ...lateOnes]) {
    const c = shortestOf(tall)
    tall[c] = (tall[c] ?? 0) + ((folded[c]?.length ?? 0) === 0 ? 0 : rowGap) + heightOf(heights, slots[n] ?? '')
    folded[c]?.push(n)
  }
  return folded.map(g => [...g].sort((a, b) => a - b))
}

// The board's columns while arranging: every column of the width, an empty one too (it is a drop place). With no lists the order is cut by count, as drawn.
// `placed`: the pane's own columns for these slots (the even placement), so the board shows what the pane draws
export function boardLists(slots: readonly string[], lists: readonly (readonly string[])[] | undefined, ncol: Columns, placed?: readonly (readonly number[])[]): string[][] {
  if (lists === undefined && placed !== undefined) return Array.from({ length: ncol }, (_, c) => (placed[c] ?? []).map(n => slots[n] ?? ''))
  if (lists === undefined) return placeColumns(slots.length, ncol).map(g => g.map(n => slots[n]))
  const where = new Map<string, number>()
  for (const [c, l] of lists.entries()) for (const id of l) where.set(id, lists.length > ncol ? Math.floor((c * ncol) / lists.length) : c)
  const out = Array.from({ length: ncol }, (): string[] => [])
  for (const id of slots) out[where.get(id) ?? 0].push(id)
  return out
}

// Where each tile sits for given column lists, and the drop place of each empty column: equal columns, the tiles of a column `rowGap` apart (the pane's
// gap between cards), each tile as high as its card, so the board is the pane's layout
export type ListsBoard = { tiles: Map<string, Rect & { col: number }>; empty: (Rect & { col: number })[]; colX: number[]; colW: number }
const columnRows = (l: readonly string[], heights: Record<string, number>, rowGap: number): number => l.reduce((t, id) => t + heightOf(heights, id), 0) + Math.max(0, l.length - 1) * rowGap
export function listsLayout(lists: readonly (readonly string[])[], heights: Record<string, number>, width: number, gap: number, rowGap: number = ARRANGE_ROW_GAP): ListsBoard {
  const n = Math.max(1, lists.length)
  const colW = Math.floor((width - (n - 1) * gap) / n)
  const colX = Array.from({ length: n }, (_, c) => c * (colW + gap))
  const total = Math.max(ARRANGE_MIN_ROWS, ...lists.map(l => columnRows(l, heights, rowGap)))
  const tiles = new Map<string, Rect & { col: number }>()
  const empty: (Rect & { col: number })[] = []
  for (const [c, l] of lists.entries()) {
    // Every column is as wide as the others, the last one too: the spare cells stay free at the right, as on the main page
    const w = colW
    if (l.length === 0) empty.push({ x: colX[c], y: 0, w, tall: total, col: c })
    let y = 0
    for (const id of l) {
      const h = heightOf(heights, id)
      tiles.set(id, { x: colX[c], y, w, tall: h, col: c })
      y += h + rowGap
    }
  }
  return { tiles, empty, colX, colW }
}

// The board's height: its tallest column now plus the tallest tile and its gap, so a drag that moves one tile into any column still fits
export function listsRows(lists: readonly (readonly string[])[], heights: Record<string, number>, rowGap: number = ARRANGE_ROW_GAP): number {
  const all = lists.flat()
  if (all.length === 0) return -Infinity
  const h = all.map(id => heightOf(heights, id))
  const most = Math.max(...lists.map(l => columnRows(l, heights, rowGap)))
  return lists.length <= 1 ? most : Math.max(ARRANGE_MIN_ROWS, Math.min(columnRows(all, heights, rowGap), most + rowGap + Math.max(...h)))
}

// Where a dragged tile goes: the column nearest its centre (cx), under every other tile there whose centre is above the pointer (cy); Needs you stays first
export function dropAt(lists: readonly (readonly string[])[], id: string, cx: number, cy: number, board: ListsBoard): string[][] {
  let col = 0
  let best = Infinity
  for (const [c, x] of board.colX.entries()) {
    const d = Math.abs(cx - (x + board.colW / 2))
    if (d < best) {
      best = d
      col = c
    }
  }
  const others = (lists[col] ?? []).filter(o => o !== id)
  let at = others.filter(o => {
    const r = board.tiles.get(o)
    return r !== undefined && r.y + r.tall / 2 < cy
  }).length
  if (others[0] === NEEDS_SLOT && at === 0) at = 1
  const out = lists.map(l => l.filter(o => o !== id))
  out[col] = [...others.slice(0, at), id, ...others.slice(at)]
  return out
}

export const isIdle = (now: number, lastPress: number | undefined): boolean => lastPress === undefined || now - lastPress >= IDLE_REPACK_MS

// The Needs you card above the columns never changes height while the person is pressing in the pane: what it shows is held at the rows it had at the
export type TopHold = { rows: number }
export function holdTop(prev: TopHold | undefined, total: number, idle: boolean): { show: number; spacer: number; memory: TopHold } {
  if (idle || prev === undefined) return { show: total, spacer: 0, memory: { rows: total } }
  const show = Math.min(total, prev.rows)
  return { show, spacer: prev.rows - show, memory: prev }
}

export type CardFacts = {
  isSimple: boolean
  innerPt: number
  limitLines: number
  hasLimit: boolean
  limitBars?: number
  hereLines: number
  hereHasBar: boolean
  limitGaps?: number
  hereGaps?: number
  autopilotRows?: number
  lineRows?: Record<string, number>
  others: number
  othersShown?: number
  othersMore?: boolean
  othersOpen: boolean
  othersAll: boolean
}

export function cardHeights(f: CardFacts): Record<string, number> {
  const rows = (pt: number): number => Math.max(ARRANGE_MIN_ROWS, Math.ceil(pt / ROW_PT))
  const head = CARD_INSET_Y_PT + ROW_PT
  const limit = head + (f.hasLimit ? f.limitLines * ROW_PT + (f.limitBars ?? 1) * BAR_SLOT + (f.limitGaps ?? 0) * GROUP_GAP : ROW_PT)
  const here = head + f.hereLines * ROW_PT + (f.hereHasBar ? BAR_SLOT : 0) + (f.hereGaps ?? 0) * GROUP_GAP
  const rowPt = (f.isSimple && f.innerPt >= STACK_BELOW_PT ? LIST_ROW_H : 2 * LIST_ROW_H) + LIST_ROW_GAP
  const shown = f.othersShown ?? (f.othersAll ? f.others : Math.min(LIST_SHOW, f.others))
  const more = (f.othersMore ?? f.others > LIST_SHOW) ? LIST_ROW_H : 0
  const others = head + (f.others === 0 ? ROW_PT : f.othersOpen ? (shown === 0 ? ROW_PT : shown * rowPt) + more : 0)
  const autopilot = head + (f.autopilotRows ?? 1) * ROW_PT
  const lineCards = Object.fromEntries(Object.entries(f.lineRows ?? {}).map(([id, n]) => [id, rows(head + n * ROW_PT)]))
  return { limit: rows(limit), here: rows(here), others: rows(others), autopilot: rows(autopilot), ...lineCards }
}
