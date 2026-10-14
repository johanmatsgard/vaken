// One card style for every card: the inset of a card comes from ONE place, ROUNDED in ui/kit.tsx, and the sweeps.
import { expect } from 'claude-code/testing'
import { test } from './slow'
import { cardStyleProblems } from './presssizes'
import type { PNode } from './presssizes'
import { ROUNDED } from '../hooks/ui/kit'
import { BORDER_Y_PT, CARD_INSET_Y_PT, CARD_PAD_Y_PT, CLOSED_CARD_H, PRESS_FRAME_H, ROW_PT, VSTEP_PT, vstep } from '../hooks/ui/tokens'

const read = (root: PNode): string[] => {
  const out: string[] = []
  cardStyleProblems(root, 'test', out)
  return out
}

test('every card is half a row inside its outline, open or closed; a closed card is 38 pt, a framed press a row and a half', () => {
  expect(BORDER_Y_PT).toBe(0.5)
  expect(CARD_PAD_Y_PT).toBe(VSTEP_PT - BORDER_Y_PT)
  expect(CARD_INSET_Y_PT).toBe(VSTEP_PT)
  expect(CLOSED_CARD_H).toBe(2 * VSTEP_PT + ROW_PT)
  expect(PRESS_FRAME_H).toBe(ROW_PT + VSTEP_PT)
  expect(ROUNDED.borderStyle).toBe('round')
  expect(ROUNDED.paddingTop).toBe(vstep(CARD_PAD_Y_PT))
  expect(ROUNDED.paddingBottom).toBe(vstep(CARD_PAD_Y_PT))
})

test('the reader passes a card in the shared style and flags a bordered box built outside it', () => {
  const card = (extra: Record<string, unknown>): PNode => ({ type: 'Box', key: 'c', props: { ...ROUNDED, ...extra }, children: [] })
  expect(read(card({}))).toEqual([])
  expect(read({ type: 'Box', key: 'bare', props: { borderStyle: 'round' }, children: [] }).join('|')).toContain('outside the shared card style')
  expect(read(card({ paddingTop: 0 })).join('|')).toContain('outside the shared card style')
  expect(read(card({ paddingX: 1 })).join('|')).toContain('paddingX')
  expect(read(card({ borderStyle: 'single' })).join('|')).toContain('border single')
})
