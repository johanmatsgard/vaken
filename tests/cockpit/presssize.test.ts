// Press sizes: the tokens are the sizes chosen for presses.
import { expect } from 'claude-code/testing'
import { test } from './slow'
import { pressProblems } from './presssizes'
import type { PNode } from './presssizes'
import { wordBox } from '../hooks/ui/kit'
import { COL_PT, GEAR_SLOT, HIT_ICON_W, HIT_MIN_H, LIST_ROW_H, PRESS_ROW_H, ROW_PT, SWITCH_HIT_W, SWITCH_SLOT, PRESS_WASH_OUT, WORD_FOOT_W } from '../hooks/ui/tokens'

// A word wrapper as Pressable draws it: a keyed Box, a Button, and an absolute box with the Client.
const word = (key: string, minW: number, minH: number, extra: Record<string, unknown> = {}, label = 'Less', rowsH = Math.ceil(minH / 19)): PNode => ({
  type: 'Box',
  key: `fcw-${key}`,
  props: { minWidth: minW / COL_PT, minHeight: minH / 19, ...extra },
  children: [{ type: 'Button', props: { label } }, { type: 'Box', key: `fc-${key}-box`, props: { position: 'absolute', height: rowsH }, children: [{ type: 'Client', key: `fc-${key}`, props: { height: rowsH, props: { look: 'button', h: HIT_MIN_H, r: rowsH } } }] }],
})
const row = (gapPt: number, ...children: PNode[]): PNode => ({ type: 'Box', props: { flexDirection: 'row', columnGap: gapPt / COL_PT }, children })
const read = (root: PNode): string[] => {
  const out: string[] = []
  pressProblems(root, 'test', out)
  return out
}

test('the chosen sizes (the grid rule): a word one press row high and WORD_FOOT_W wide, an icon and the gear 44, a switch its 41.9 pt footprint, a row one text row', () => {
  expect(PRESS_ROW_H).toBe(ROW_PT)
  expect(HIT_MIN_H).toBe(ROW_PT)
  expect(HIT_MIN_H).toBe(LIST_ROW_H)
  expect(HIT_ICON_W).toBe(44)
  expect(GEAR_SLOT).toBe(44)
  expect(Math.abs(SWITCH_HIT_W - (SWITCH_SLOT + PRESS_WASH_OUT * COL_PT))).toBeLessThan(0.001)
  expect(WORD_FOOT_W).toBe(44)
})

test('a word press is its footprint: at least WORD_FOOT_W wide, never grown with a negative margin', () => {
  const alone = wordBox('Now')
  expect(alone.minW).toBe(WORD_FOOT_W)
  expect(alone.grow).toBe(0)
  expect(wordBox('Now', 4.25).grow).toBe(0)
  expect(wordBox('Open the settings of this card').minW).toBeGreaterThan(WORD_FOOT_W)
})

test('the reader accepts a word of the floor size and flags one that is too low, too narrow or drawn bigger than its room', () => {
  expect(read(row(8.5, word('a', 44, 19)))).toEqual([])
  expect(read(row(8.5, word('a', 44, 9.5))).join('|')).toContain('high')
  expect(read(row(8.5, word('a', 30, 19))).join('|')).toContain('wide')
  expect(read(row(8.5, word('a', 44, 19, { marginBottom: -0.5 }))).join('|')).toContain('past its room')
})

test('the reader flags two small presses that overlap, and passes two that touch', () => {
  const a = word('a', 44, 19, { marginRight: -10 / COL_PT })
  const b = word('b', 44, 19, { marginLeft: -10 / COL_PT })
  expect(read(row(8.5, a, b)).join('|')).toContain('overlap')
  expect(read(row(8.5, word('c', 44, 19), word('d', 44, 19)))).toEqual([])
})

test('the reader flags a Client whose declared rows are not its box rounded out (R10)', () => {
  // 28.5 pt is 1.5 rows: the Client must name 2, a whole row more than 1 and never the box's own fraction.
  expect(read(row(8.5, word('a', 44, 28.5, {}, 'Less', 2)))).toEqual([])
  expect(read(row(8.5, word('a', 44, 28.5, {}, 'Less', 1))).join('|')).toContain('rounded out is 2')
})

test('the grid rule: a gap, margin, padding or height off the half-row grid is flagged', () => {
  expect(read({ type: 'Box', props: { flexDirection: 'column', rowGap: 1 } })).toEqual([])
  expect(read({ type: 'Box', props: { flexDirection: 'column', rowGap: 0.63 } }).join('|')).toContain('off the half-row grid')
  expect(read({ type: 'Box', props: { minHeight: 26 / 19 } }).join('|')).toContain('off the half-row grid')
})

test('the reader flags a press whose module is not told to draw its rows (the app sizes the region by what the module draws)', () => {
  const w = word('a', 44, 28.5, {}, 'Less', 2)
  const anchor = (w.children as PNode[])[1] as PNode
  const client = (anchor.children as PNode[])[0] as PNode
  client.props = { ...client.props, props: { look: 'button', h: HIT_MIN_H } }
  expect(read(row(8.5, w)).join('|')).toContain('draws undefined rows')
})
