// Arrange cards in a fixed view (Standard, All).
import { CARD_IDS } from './logic'
import type { CardId } from './logic'

export type ArrangeSeed = { values: Record<string, string>; order: CardId[] }

export function arrangeSeed(fixed: readonly CardId[]): ArrangeSeed {
  const values: Record<string, string> = { 'look.view': 'custom', 'view.problems': 'off' }
  for (const id of CARD_IDS) values[`cards.${id}`] = fixed.includes(id) ? 'show' : 'hide'
  return { values, order: [...fixed, ...CARD_IDS.filter(id => !fixed.includes(id))] }
}
