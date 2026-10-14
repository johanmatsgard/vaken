// The zones: every card has exactly one zone, the default order follows the zones, and the zone words are in Swedish.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { groupIndexOf } from '../hooks/core/cardhome'
import { CARD_IDS, ZONES, ZONE_OF, ZONE_WORD, parseOrder } from '../hooks/features/home/logic'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

test('every card has a zone, and no zone names a card that does not exist', () => {
  for (const id of CARD_IDS) expect(ZONES, `card ${id} has no zone`).toContain(ZONE_OF[id])
  expect(Object.keys(ZONE_OF).sort()).toEqual([...CARD_IDS].sort())
})

test('the default order follows the placement groups (core/cardhome.ts CARD_GROUP)', () => {
  const at = CARD_IDS.map(id => groupIndexOf(id))
  expect(at).toEqual([...at].sort((a, b) => a - b))
  expect(parseOrder(undefined)).toEqual(CARD_IDS)
})

test('a saved order is kept as it is, and a card it does not name is added after it', () => {
  const saved = parseOrder('do,limit')
  expect(saved.slice(0, 2)).toEqual(['do', 'limit'])
  expect([...saved].sort()).toEqual([...CARD_IDS].sort())
})

test('every zone word has a Swedish word', () => {
  for (const z of ZONES) expect(SV[ZONE_WORD[z]], `no Swedish for ${ZONE_WORD[z]}`).toBeDefined()
})
