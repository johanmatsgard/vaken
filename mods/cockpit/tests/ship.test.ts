import { expect } from 'claude-code/testing'
import { test } from './slow'

import { emptyState, recordEdit, recordReceipts } from '../hooks/core/proof'
import { ship, shipText } from '../hooks/core/ship'

const NOW = new Date(2026, 9, 10, 14, 0).getTime()
const conf = { score: 85, items: [] }

test('nothing to ship when no file changed', () => {
  const s = ship({ proof: emptyState(), confidence: { items: [] }, ledger: [], now: NOW, doneOn: true })
  expect(s.ready).toBe(false)
  expect(s.blockers[0]).toMatch(/nothing to ship/)
})

test('ready when the checks passed after the last edit and nothing is unproven', () => {
  let p = recordEdit(emptyState(), '/a.ts')
  p = recordReceipts(p, [{ kind: 'tests', ok: true }], NOW)
  const s = ship({ proof: p, confidence: conf, ledger: [], now: NOW, doneOn: true })
  expect(s.ready).toBe(true)
  expect(shipText(s)).toMatch(/^Ship it: the evidence looks good\./)
  expect(shipText(s)).toMatch(/Shipping is your press/)
})

test('blocked by a stale check, an unmet done list or an unproven claim; stopped steps and debt are things to look at', () => {
  let p = recordEdit(emptyState(), '/a.ts')
  p = recordReceipts(p, [{ kind: 'tests', ok: true }], NOW)
  p = recordEdit(p, '/b.ts')
  p = { ...p, done: ['tests', 'lint'], debt: 2 }
  const s = ship({ proof: p, confidence: { items: [] }, ledger: [{ at: NOW - 60_000, what: 'Held a risky command', did: true }, { at: NOW - 3 * 86_400_000, what: 'Held a risky command', did: true }], now: NOW, doneOn: true })
  expect(s.ready).toBe(false)
  expect(s.blockers.join('\n')).toMatch(/tests not run since the last edit/)
  expect(s.blockers.join('\n')).toMatch(/definition of done is not met/)
  expect(s.look.join('\n')).toMatch(/stopped 1 step today/)
  expect(s.look.join('\n')).toMatch(/2 finished answers changed files/)
})
