import { expect } from 'claude-code/testing'
import { test } from './slow'

import { LAYOUT_KEYS, cleanName, nextName, parseLayouts, sameLayout, snapshot } from '../hooks/features/home/layouts'
import { defaults, parseAsk, settingsText } from '../hooks/core/settings'
import { CARD_IDS } from '../hooks/features/home/logic'

const orders = () => ({ 1: ['limit', 'here', 'others', 'autopilot'], 2: ['here', 'limit', 'others', 'autopilot'], 3: ['others', 'here', 'limit', 'autopilot'] }) as never

test('a layout remembers the look only: detail levels, which cards show, and the orders; never arranging mode or session marks', () => {
  expect(LAYOUT_KEYS).toContain('detail')
  expect(LAYOUT_KEYS).toContain('detail.limit')
  expect(LAYOUT_KEYS).toContain('cards.others')
  expect(LAYOUT_KEYS).not.toContain('arrange')
  const l = snapshot({ ...defaults(), arrange: 'on', detail: 'simple' }, orders())
  expect(l.values.detail).toBe('simple')
  expect(Object.keys(l.values)).not.toContain('arrange')
  expect(sameLayout(l, snapshot({ ...defaults(), detail: 'simple' }, orders()))).toBe(true)
  expect(sameLayout(l, snapshot({ ...defaults(), detail: 'explained' }, orders()))).toBe(false)
})

test('saved layouts are checked on the way in: bad names, values and orders are fixed or dropped', () => {
  const raw = JSON.stringify({
    Wide: { v: { detail: 'minimal', 'cards.limit': 'loud' }, o: { 1: 'limit,here,others,autopilot,proof,guard,agents', 2: 'nope', 3: 'others,here,limit,autopilot,proof,guard,agents' } },
    '  spaced  name ': { v: {}, o: {} },
    '': { v: {}, o: {} },
  })
  const layouts = parseLayouts(raw)
  expect(Object.keys(layouts)).toEqual(['Wide'])
  expect(layouts.Wide.values.detail).toBe('simple')
  expect(layouts.Wide.values['cards.limit']).toBe('show')
  expect(layouts.Wide.orders[2]).toEqual([...CARD_IDS])
  expect(layouts.Wide.orders[3]).toEqual(['others', 'here', 'limit', 'autopilot', 'proof', 'guard', 'agents', ...CARD_IDS.filter(id => !['others', 'here', 'limit', 'autopilot', 'proof', 'guard', 'agents'].includes(id))])
  expect(parseLayouts('not json')).toEqual({})
  expect(parseLayouts('[1]')).toEqual({})
})

test('names are tidied and the next free name is "Layout N"', () => {
  expect(cleanName('  my   wide  view ')).toBe('my wide view')
  expect(cleanName('x'.repeat(40))).toHaveLength(24)
  expect(nextName({})).toBe('Layout 1')
  expect(nextName({ 'Layout 1': snapshot(defaults(), orders()), 'Layout 3': snapshot(defaults(), orders()) })).toBe('Layout 2')
})

test('the text command asks for layouts, and the list names them', () => {
  expect(parseAsk('layout save my view')).toEqual({ kind: 'layout', action: 'save', name: 'my view' })
  expect(parseAsk('layout save')).toEqual({ kind: 'layout', action: 'save', name: '' })
  expect(parseAsk('layout apply Wide')).toEqual({ kind: 'layout', action: 'apply', name: 'Wide' })
  expect(parseAsk('layout apply')).toMatchObject({ kind: 'bad' })
  expect(parseAsk('layout rename x')).toMatchObject({ kind: 'bad' })
  expect(settingsText(defaults(), false, ['Wide', 'Calm'])).toMatch(/Layouts: Wide, Calm/)
  expect(settingsText(defaults(), false)).toMatch(/Layouts: none saved/)
})
