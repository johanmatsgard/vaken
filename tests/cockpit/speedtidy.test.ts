// Three speed tidy-ups, each proved by a count: the Settings rows are built once and reused.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { SECTIONS, SETTINGS, readSettings, sectionRows, sectionRowsBuilds } from '../hooks/core/settings'
import { forgetBundles, withToastGate } from '../hooks/core/io'
import type { Io } from '../hooks/core/io'
import { lineViewBuilds, linesModel } from '../hooks/features/home/cards/lines'
import { cardLouds } from '../hooks/features/home/loud'
import { LINE_CARD_IDS } from '../hooks/features/home/logic'
import type { View } from '../hooks/features/home/logic'
import type { Prefs } from '../hooks/features/home/prefs'

test('the Settings rows of a section are built once, however many draws ask for them', () => {
  const start = sectionRowsBuilds()
  for (let draw = 0; draw < 5; draw++) for (const sec of SECTIONS) expect(sectionRows(sec, true).length).toBeGreaterThanOrEqual(0)
  expect(sectionRowsBuilds() - start).toBeLessThanOrEqual(SECTIONS.length)
  const again = sectionRowsBuilds()
  const first = sectionRows(SECTIONS[0], true)
  expect(sectionRows(SECTIONS[0], true)).toBe(first)
  expect(sectionRowsBuilds()).toBe(again)
  const seen = SECTIONS.flatMap(sec => sectionRows(sec, true).flatMap(g => g.rows.map(s => s.key)))
  expect(new Set(seen).size).toBe(seen.length)
})

const prefs = { values: {}, globalValues: {}, cardDetail: {}, ledger: [], halted: false, hidden: [], openSections: [], sid: 's', history: [], inbox: [], lists: { others: 'now', agents: 'now', from: 'all' } } as unknown as Prefs
const view = { needs: [], working: [], waiting: [], idle: [], now: 1_000_000 } as unknown as View

test('a line card nothing reads is not built', () => {
  const start = lineViewBuilds()
  const m = linesModel(view, prefs)
  expect(lineViewBuilds() - start).toBe(0)
  void m.views.skills.title
  void m.views.skills.title
  expect(lineViewBuilds() - start).toBe(1)
  const louds = lineViewBuilds()
  cardLouds(view, prefs, m)
  expect(lineViewBuilds() - louds).toBeLessThan(LINE_CARD_IDS.length - 1)
})

test('with no settings bundle yet, all settings are read once, not one read per setting each step', async () => {
  forgetBundles()
  let n = 0
  const mem = new Map<string, unknown>([['cockpit:setting:detail', 'simple']])
  const base = {
    now: async () => 1_000_000,
    sessionId: async () => 'me',
    get: async (k: string) => {
      n += 1
      return mem.get(k)
    },
    set: async (k: string, v: unknown) => void mem.set(k, v),
    del: async (k: string) => void mem.delete(k),
    keys: async () => {
      n += 1
      return [...mem.keys()]
    },
    toast: () => undefined,
  } as unknown as Io
  const io = withToastGate(base)
  const all = await readSettings(io)
  expect(all.detail).toBe('simple')
  const first = n
  expect(first).toBeLessThan(SETTINGS.length / 4)
  await readSettings(io)
  expect(n - first).toBeLessThanOrEqual(first)
})
