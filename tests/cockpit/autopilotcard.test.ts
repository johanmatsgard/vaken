// The Autopilot card's model: actions are counted, warnings are rows that say Warned, the keeper's money is an estimate, a stopped keeper says so.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { autopilotModel } from '../hooks/features/home/cards/autopilot'
import { HEADLINES, glanceWordOf } from '../hooks/features/home/headline'
import { faceRows } from '../hooks/core/cardsettings'
import { CAP_HOLD_WHAT, CAP_WHAT } from '../hooks/core/agentcap'
import { KEEPER_STOP_WHAT, KEEPER_UNREAD_WHAT, KEPT_PAID_WHAT, KEPT_WHAT, keeperStopped } from '../hooks/core/cachekeeper'
import { LEAN_WHAT, RUN_FINISHED_WHAT, RUN_STARTED_WHAT, RUN_STOPPED_WHAT } from '../hooks/core/ledger'
import type { Entry } from '../hooks/core/ledger'

// An action of vaken's own (the loop breaker's Caught is a warning)
const FIX_WHAT = 'Made a fix request for a failing check'
const NOW = new Date(2026, 9, 10, 14, 30).getTime()
const MIN = 60_000
const did = (what: string, ago: number): Entry => ({ at: NOW - ago, what, did: true, how: 'auto' })
const note = (what: string, ago: number, extra: Partial<Entry> = {}): Entry => ({ at: NOW - ago, what, how: 'auto', ...extra })
const model = (ledger: Entry[]) => autopilotModel({ now: NOW } as never, { ledger, cardDetail: { autopilot: 'explained' } } as never)
const rowOf = (m: ReturnType<typeof model>, key: string) => m.groups.flatMap(g => g.rows).find(r => r.key === key)

test('a warning is a row that says Warned, and only actions count in "N today"; a held extra agent counts as an action', () => {
  const m = model([did(FIX_WHAT, 10 * MIN), did(CAP_WHAT, 20 * MIN), did(CAP_WHAT, 30 * MIN), did(CAP_HOLD_WHAT, 40 * MIN)])
  expect(rowOf(m, `did:${CAP_WHAT}`)?.right).toBe('Warned 2 times')
  expect(rowOf(m, `did:${FIX_WHAT}`)?.right).toBe('once')
  expect(rowOf(m, `did:${CAP_HOLD_WHAT}`)?.title).toBe('Stopped an extra agent')
  expect(HEADLINES.autopilot({ auto: m } as never)).toBe('2 today')
  // Actions first, then the warnings
  expect(m.shown.map(x => x.what)).toEqual([FIX_WHAT, CAP_HOLD_WHAT, CAP_WHAT])
})

test('the keeper row has its setting name, says its saving as an estimate, and the Short line leads with the saving', () => {
  const m = model([did(KEPT_WHAT, 40 * MIN), did(KEPT_WHAT, 35 * MIN), note(KEPT_PAID_WHAT, 5 * MIN, { usd: 1.37 })])
  const row = rowOf(m, `did:${KEPT_WHAT}`)
  expect(row?.title).toBe('Kept the session cheap')
  expect(row?.right).toBe('2 times · saved about\u00a0$1.37 (estimate)')
  expect(m.money).toBe('saved about\u00a0$1.37 (estimate)')
  expect(faceRows('autopilot', true)[0]?.key).toBe('cache.keeper')
})

test('a stopped keeper says Stopped with a plain reason; a read error that recovered says nothing', () => {
  expect(keeperStopped([note(KEEPER_UNREAD_WHAT, 20 * MIN), did(KEPT_WHAT, 10 * MIN)], NOW)).toBeUndefined()
  expect(keeperStopped([did(KEPT_WHAT, 20 * MIN), note(KEEPER_UNREAD_WHAT, 10 * MIN)], NOW)).toBe('unread')
  const m = model([did(KEPT_WHAT, 25 * MIN), note(KEEPER_UNREAD_WHAT, 20 * MIN), note(KEEPER_STOP_WHAT, 10 * MIN)])
  const row = rowOf(m, `did:${KEPT_WHAT}`)
  expect(row?.right).toBe('Stopped')
  expect(row?.note).toEqual(['The cache had gone stale during the break.'])
})

test('the Glance dot always has a word: None when nothing was done, the count otherwise', () => {
  const facts = (ledger: Entry[]) => ({ auto: model(ledger), view: { now: NOW }, prefs: {} }) as never
  expect(glanceWordOf('autopilot', facts([]), 'calm').short).toBe('None')
  expect(glanceWordOf('autopilot', facts([did(FIX_WHAT, MIN)]), 'normal').short).toBe('1 today')
})

test('lean cuts are one row for the day: the count, and the saved tokens always as an estimate', () => {
  const m = model([{ at: NOW - 5 * MIN, what: LEAN_WHAT, did: true, how: 'auto', cuts: 12, saved: 8200 }])
  const row = rowOf(m, `did:${LEAN_WHAT}`)
  expect(row?.title).toBe('Shortened long output')
  expect(row?.right).toBe('12 times · about 8k tokens saved (estimate)')
  expect(m.shown).toHaveLength(1)
  // Yesterday's row is not today's
  expect(rowOf(model([{ at: NOW - 30 * 60 * MIN, what: LEAN_WHAT, did: true, how: 'auto', cuts: 12, saved: 8200 }]), `did:${LEAN_WHAT}`)).toBeUndefined()
})

test('lean cuts keep their day sums in the counts store when the 60 lines no longer hold the row', () => {
  const counts = { [LEAN_WHAT]: 40, '(count) lean tokens saved': 21_000 }
  const m = autopilotModel({ now: NOW, counts } as never, { ledger: [], cardDetail: { autopilot: 'explained' } } as never)
  expect(rowOf(m, `did:${LEAN_WHAT}`)?.right).toBe('40 times · about 21k tokens saved (estimate)')
})

test('task runs show a row each for started, finished and stopped, and any other did:true line shows by itself (a model call, for one)', () => {
  const m = model([did(RUN_STARTED_WHAT, 50 * MIN), did(RUN_FINISHED_WHAT, 20 * MIN), did(RUN_STOPPED_WHAT, 10 * MIN), did('Asked a model to say it simpler', 5 * MIN)])
  expect(rowOf(m, `did:${RUN_STARTED_WHAT}`)?.right).toBe('once')
  expect(rowOf(m, `did:${RUN_FINISHED_WHAT}`)?.title).toBe('Task run finished')
  expect(rowOf(m, `did:${RUN_STOPPED_WHAT}`)?.title).toBe('Task run stopped by you')
  expect(rowOf(m, 'did:Asked a model to say it simpler')?.right).toBe('once')
  expect(m.acts).toHaveLength(4)
  expect(HEADLINES.autopilot({ auto: m } as never)).toBe('4 today')
})
