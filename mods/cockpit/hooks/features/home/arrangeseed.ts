// Arrange cards in a fixed view (Standard, All), and the first Custom: both start from a copy of the view shown.
import type { Io } from '../../core/io'
import { settingStoreKey } from '../../core/settings'
import type { Values } from '../../core/settings'
import { hasSavedOrder } from './layouts'
import { CARD_IDS } from './logic'
import type { CardId } from './logic'

export type ArrangeSeed = { values: Record<string, string>; order: CardId[] }

export function arrangeSeed(fixed: readonly CardId[]): ArrangeSeed {
  const values: Record<string, string> = { 'look.view': 'custom', 'view.problems': 'off' }
  for (const id of CARD_IDS) values[`cards.${id}`] = fixed.includes(id) ? 'show' : 'hide'
  return { values, order: [...fixed, ...CARD_IDS.filter(id => !fixed.includes(id))] }
}

// A Custom set exists once a card's Show or an order of the person's own is stored (Arrange, Settings, a saved layout): it is never seeded over.
export async function hasCustomSet(i: Io, project?: Values): Promise<boolean> {
  if (await hasSavedOrder(i)) return true
  for (const id of CARD_IDS) if (typeof (await i.get(settingStoreKey(`cards.${id}`))) === 'string') return true
  return project !== undefined && Object.keys(project).some(k => k.startsWith('cards.'))
}
