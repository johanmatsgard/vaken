import { expect } from 'claude-code/testing'
import { test } from './slow'

import { setLang } from '../hooks/core/lang'
import { RECIPES, layoutLabel } from '../hooks/features/home/layouts'

test('the four built-in layout names show in the language of the draw, only when the stored name is exactly one of them', () => {
  setLang('sv')
  expect(['Focus', 'Money', 'Everything', 'Quiet'].map(layoutLabel)).toEqual(['Fokus', 'Pengar', 'Varje kort', 'Lugn'])
  // names a person typed, or near misses, are never translated
  for (const n of ['focus', 'My Focus', 'Focus 2', 'Quiet ', 'Calm view', '', 'Fokus']) expect(layoutLabel(n)).toBe(n)
  setLang('en')
  expect(['Focus', 'Money', 'Everything', 'Quiet'].map(layoutLabel)).toEqual(['Focus', 'Money', 'Every card', 'Calm'])
})

test('no layout is seeded any more, and the stored names stay English whatever the language', () => {
  setLang('sv')
  expect(Object.keys(RECIPES)).toEqual([])
  setLang('en')
})
