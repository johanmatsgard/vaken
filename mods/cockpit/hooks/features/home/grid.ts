// The pane's placement grid as plain numbers (W, wide and tall screens): how many columns the cards use, how wide each column and each card is
import { BORDER_X_PT, CARD_GAP_X, COL_PT, CARD_MIN_INNER_PT, LIST_SHOW, LIST_SHOW_MAX, LIST_TALL_ROWS, MAX_COLUMNS, cols, columnsFor } from '../../ui/tokens'
import type { Columns } from './board'

export const COLUMN_CHOICES = ['auto', '1', '2', '3', '4', '5', '6'] as const

// The columns the person allows on a pane body this wide: Auto is every column that fits (tokens.ts, columnsFor)
export function columnsUsed(bodyPt: number, choice: string | undefined): Columns {
  const fit = columnsFor(bodyPt)
  const n = Number(choice)
  return (Number.isInteger(n) && n >= 1 && n <= MAX_COLUMNS ? Math.min(fit, n) : fit) as Columns
}

// The rows a list shows before "Show N more" (the named rule of tokens.ts, LIST_SHOW to LIST_SHOW_MAX): LIST_SHOW for each column of room a card has
export function listShowFor(fit: number, used: number, bodyRows: number | undefined): number {
  const spare = Math.max(1, Math.floor(fit / Math.max(1, used)))
  const tall = Math.max(1, Math.floor((bodyRows ?? 0) / LIST_TALL_ROWS))
  return Math.min(LIST_SHOW_MAX, LIST_SHOW * (spare + tall - 1))
}

// A pane that fits fewer than this many columns is too narrow for both on one row
export const FOOTER_ONE_ROW_FROM_COLUMNS = 2
export const footerWraps = (fit: number): boolean => fit < FOOTER_ONE_ROW_FROM_COLUMNS

// At 2400 pt that is 395 pt (six columns), not 2400 pt
export type ColumnCap = { colPt: number; innerPt: number; cells: number; capped: boolean }
// THE COLUMNS ARE WHOLE CELLS (the grid rule): a column is a whole number of text columns, floored
const GAP_CELLS = cols(CARD_GAP_X)
export const columnCells = (bodyPt: number, n: number): number => Math.max(1, Math.floor((Math.floor(bodyPt / COL_PT + 0.01) - (n - 1) * GAP_CELLS) / n))
export function columnCap(bodyPt: number, choice: string | undefined): ColumnCap {
  const n = columnsUsed(bodyPt, choice)
  const colPt = n === 1 ? bodyPt : columnCells(bodyPt, n) * COL_PT
  return { colPt, innerPt: Math.max(CARD_MIN_INNER_PT, n === 1 ? bodyPt - 2 * BORDER_X_PT : Math.floor(colPt - 2 * BORDER_X_PT)), cells: n === 1 ? cols(colPt) : columnCells(bodyPt, n), capped: n > 1 }
}

export type PaneGrid = {
  bodyPt: number
  fit: Columns
  bucket: Columns
  ncol: Columns // the columns drawn: never more than there are cards
  gapPt: number
  colPt: number
  innerPt: number // a card's inner width in a column (less the round border's 13 pt each side), in points: its rows
  lefts: number[]
  colCells: number
  gapCells: number
  listShow: number
  cap: ColumnCap
}

export function paneGrid(bodyPt: number, choice: string | undefined, cards: number, bodyRows?: number): PaneGrid {
  const fit = columnsFor(bodyPt)
  const bucket = columnsUsed(bodyPt, choice)
  // Fewer cards never need more columns than cards.
  const ncol = Math.min(bucket, Math.max(1, cards)) as Columns
  const cap = columnCap(bodyPt, choice)
  // Fewer cards than columns: each keeps the width of a column of the full grid, left to right
  const cells = ncol < bucket ? cap.cells : ncol === 1 ? cols(bodyPt) : columnCells(bodyPt, ncol)
  const colPt = ncol < bucket ? cap.colPt : ncol === 1 ? bodyPt : cells * COL_PT
  // One column is the pane's own inner width, a column of several is rounded down to a whole point
  const innerPt = Math.max(CARD_MIN_INNER_PT, ncol === 1 && bucket === 1 ? bodyPt - 2 * BORDER_X_PT : Math.floor(colPt - 2 * BORDER_X_PT))
  const lefts = Array.from({ length: ncol }, (_, n) => n * (colPt + CARD_GAP_X))
  return { bodyPt, fit, bucket, ncol, gapPt: CARD_GAP_X, colPt, innerPt, lefts, colCells: cells, gapCells: GAP_CELLS, listShow: listShowFor(fit, bucket, bodyRows), cap }
}
