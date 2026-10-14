// The arrange board's layout as plain data: where each card sits for a given order, in whole text cells.
import { BAR_SLOT, CARD_INSET_Y_PT, GROUP_GAP, LIST_ROW_GAP, LIST_ROW_H, LIST_SHOW, ROW_PT, STACK_BELOW_PT, ARRANGE_MIN_ROWS, rows } from '../../ui/tokens'

export type Rect = { x: number; y: number; w: number; h: number }
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

export const isIdle = (now: number, lastPress: number | undefined): boolean => lastPress === undefined || now - lastPress >= IDLE_REPACK_MS

// The Needs you card above the columns never changes height while the person is pressing in the pane: what it shows is held at the rows it had at the
export type TopHold = { rows: number }
export function holdTop(prev: TopHold | undefined, total: number, idle: boolean): { show: number; spacer: number; memory: TopHold } {
  if (idle || prev === undefined) return { show: total, spacer: 0, memory: { rows: total } }
  const show = Math.min(total, prev.rows)
  return { show, spacer: prev.rows - show, memory: prev }
}

export function boardLayout(order: string[], heights: Record<string, number>, ncol: Columns, width: number, gap: number): Rect[] {
  const h = order.map(id => heightOf(heights, id))
  if (ncol === 1) {
    let y = 0
    return order.map((_, i) => {
      const rect = { x: 0, y, w: width, h: h[i] ?? ARRANGE_MIN_ROWS }
      y += rect.h
      return rect
    })
  }
  const groups = placeColumns(order.length, ncol)
  // As many equal columns as hold a card (the pane never draws an empty column).
  const colW = Math.floor((width - (groups.length - 1) * gap) / groups.length)
  const sums = groups.map(g => g.reduce((n, i) => n + h[i], 0))
  const total = Math.max(...sums)
  const rects: Rect[] = new Array(order.length)
  for (const [c, group] of groups.entries()) {
    let y = 0
    // Equal columns, the last one takes what rounding left
    const w = c === groups.length - 1 ? width - c * (colW + gap) : colW
    for (const [r, i] of group.entries()) {
      const rect = { x: c * (colW + gap), y, w, h: r === group.length - 1 ? h[i] + (total - sums[c]) : h[i] }
      rects[i] = rect
      y += rect.h
    }
  }
  return rects
}

// The tallest the board gets over every order, so its region is never too short while a card is dragged.
export function boardRows(ids: string[], heights: Record<string, number>, ncol: Columns, _width: number, _gap: number): number {
  if (ids.length === 0) return -Infinity
  const k = Math.max(1, Math.min(ncol, ids.length))
  const h = ids.map(id => heightOf(heights, id))
  const all = h.reduce((n, v) => n + v, 0)
  if (k === 1) return all
  const top = [...h].sort((a, b) => b - a).slice(0, Math.ceil(h.length / k)).reduce((n, v) => n + v, 0)
  return Math.max(Math.max(...h), Math.min(all, top))
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
