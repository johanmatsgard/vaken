// This session's share of the 5-hour window: an estimate from the cost each session spent since the window began.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { windowShare } from '../hooks/core/windowshare'

const H = 3_600_000
const NOW = Date.parse('2026-10-17T12:00:00Z')
// The window began 2 hours ago and resets in 3 hours
const RESET = NOW + 3 * H

test("the share is this session's part of the spend in the window, as points of the limit used", () => {
  const costs = [
    { id: 'here', startedAt: NOW - H, updatedAt: NOW, costUsd: 3 },
    { id: 'other', startedAt: NOW - H, updatedAt: NOW, costUsd: 1 },
  ]
  // 20% used; this session spent 3 of the 4 dollars: about 15 points
  expect(windowShare({ resetsAt: RESET, now: NOW, percent: 20, costs, hereId: 'here', agents: [] })).toEqual({ here: 15, agents: 0 })
  // Its agents in the window count inside it, never more than the session spent
  const agents = [{ session: 'here', startedAt: NOW - 30 * 60_000, endedAt: NOW - 10 * 60_000, usd: 1 }, { session: 'other', startedAt: NOW - H, usd: 9 }]
  expect(windowShare({ resetsAt: RESET, now: NOW, percent: 20, costs, hereId: 'here', agents })).toEqual({ here: 15, agents: 5 })
})

test('spend before the window does not count: the readings say from where, else it is spread evenly', () => {
  // Started 4 hours ago with $8 spent, evenly: half falls in the window
  const costs = [{ id: 'here', startedAt: NOW - 4 * H, updatedAt: NOW, costUsd: 8 }, { id: 'other', startedAt: NOW - H, updatedAt: NOW, costUsd: 4 }]
  expect(windowShare({ resetsAt: RESET, now: NOW, percent: 40, costs, hereId: 'here', agents: [] })?.here).toBe(20)
  // A reading at $7 before the window: only $1 is in it
  const samples: Array<[number, number]> = [[NOW - 3 * H, 7], [NOW - H, 7.5]]
  expect(windowShare({ resetsAt: RESET, now: NOW, percent: 40, costs, hereId: 'here', hereSamples: samples, agents: [] })?.here).toBe(8)
  // A session last seen before the window spent nothing in it
  const gone = [...costs, { id: 'old', startedAt: NOW - 9 * H, updatedAt: NOW - 6 * H, costUsd: 50 }]
  expect(windowShare({ resetsAt: RESET, now: NOW, percent: 40, costs: gone, hereId: 'here', agents: [] })?.here).toBe(20)
})

test('no spend, no session, nothing used or a past window gives no share', () => {
  const costs = [{ id: 'here', startedAt: NOW - H, updatedAt: NOW, costUsd: 0 }]
  expect(windowShare({ resetsAt: RESET, now: NOW, percent: 20, costs, hereId: 'here', agents: [] })).toBeUndefined()
  expect(windowShare({ resetsAt: RESET, now: NOW, percent: 20, costs: [], hereId: 'here', agents: [] })).toBeUndefined()
  expect(windowShare({ resetsAt: RESET, now: NOW, percent: 0, costs: [{ ...costs[0], costUsd: 2 }], hereId: 'here', agents: [] })).toBeUndefined()
  expect(windowShare({ resetsAt: NOW - H, now: NOW, percent: 20, costs: [{ ...costs[0], costUsd: 2 }], hereId: 'here', agents: [] })).toBeUndefined()
})
