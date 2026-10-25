import { expect } from 'claude-code/testing'
import { test } from './slow'

import { cardText, compactLine, compactMoment, paybackTurns, paysBeforeGap, scoreOf } from '../hooks/core/compactmoment'
import { emptyState } from '../hooks/core/proof'
import type { ProofState } from '../hooks/core/proof'
import { workState } from '../hooks/core/compactmoment'

const HOUR = 60 * 60_000
const MIN = 60_000
const tenth = (n: number | undefined): number => Math.round((n ?? 0) * 10) / 10

test('nothing is said while the window is small', () => {
  expect(compactMoment({ percent: 20, compactAt: 97, atBreak: true, quietMs: 0 }).level).toBe('none')
  expect(compactMoment({ atBreak: true, quietMs: 0 }).level).toBe('none')
  expect(compactMoment({ percent: 4, tokens: 40_000, compactAt: 97, atBreak: true, quietMs: 0 }).level).toBe('none')
})

test('the break-even counts tokens: a warm compact pays back sooner the bigger the window', () => {
  const warm = (tokens: number) => tenth(paybackTurns({ tokens, after: 15_000, out: 5_000, warm: true, ttlMs: HOUR }))
  expect(warm(100_000)).toBe(5.3)
  expect(warm(200_000)).toBe(3)
  expect(warm(400_000)).toBe(1.9)
  // A window no bigger than what is left after it never pays back.
  expect(paybackTurns({ tokens: 15_000, after: 15_000, out: 5_000, warm: true })).toBeUndefined()
})

test('a lapsed cache: the next answer rewrites everything anyway, so a big window pays back at once', () => {
  expect(paybackTurns({ tokens: 200_000, after: 15_000, out: 5_000, warm: false, ttlMs: HOUR })).toBe(0)
  expect(paybackTurns({ tokens: 100_000, after: 15_000, out: 5_000, warm: false, ttlMs: HOUR })).toBe(0)
  expect(paybackTurns({ tokens: 50_000, after: 15_000, out: 5_000, warm: false, ttlMs: HOUR })!).toBeGreaterThan(0)
  expect(paybackTurns({ tokens: 100_000, after: 15_000, out: 5_000, warm: false, ttlMs: 5 * MIN })!).toBeGreaterThan(0)
})

test('before a gap: compacting while warm beats rewriting when you return, from about 29k tokens', () => {
  expect(paysBeforeGap(100_000, 15_000, 5_000, HOUR)).toBe(true)
  expect(paysBeforeGap(25_000, 15_000, 5_000, HOUR)).toBe(false)
})

test('advice appears from 60% of the window when the score is high enough, and says how many turns it pays back', () => {
  const m = compactMoment({ percent: 65, tokens: 150_000, compactAt: 97, atBreak: true, quietMs: MIN, ttlMs: HOUR })
  expect(m.level).toBe('good')
  expect(m.lines[0]).toBe('This session is long. Compacting it saves usage.')
  expect(m.lines[1]).toBe('Claude re-reads 150k tokens every answer. A summary usually cuts that to about 15k.')
  expect(m.why).toMatch(/pays back after about 4 more answers/)
  expect(m.why).toMatch(/Good moment because: checks? passed|Good moment because: no file changed/)
  // Under 60% of the window nothing is said, even when the model would pay back.
  expect(compactMoment({ percent: 59, tokens: 150_000, compactAt: 97, atBreak: true, quietMs: MIN, ttlMs: HOUR }).level).toBe('none')
  expect(compactMoment({ percent: 65, tokens: 150_000, compactAt: 97, atBreak: true, quietMs: MIN, ttlMs: HOUR, extra: { from: 70 } }).level).toBe('none')
  // At 60% on a 200k window the summary costs more than it saves (about 9 turns): the advice still shows.
  expect(compactMoment({ percent: 60, tokens: 60_000, compactAt: 97, atBreak: true, quietMs: MIN, ttlMs: HOUR, extra: { saved: true } }).level).toBe('good')
})

test('the measured summary changes the score: a long summary does not pay back, so it earns no payback points', () => {
  const base = { percent: 65, tokens: 160_000, compactAt: 97, atBreak: true, quietMs: MIN, ttlMs: HOUR }
  expect(scoreOf({ ...base, summaryOut: 1_000 }).reasons.map(r => r.id)).toContain('payback')
  expect(scoreOf({ ...base, summaryOut: 60_000 }).reasons.map(r => r.id)).not.toContain('payback')
  expect(compactMoment({ ...base, summaryOut: 1_000 }).level).toBe('good')
})

test('away with a warm cache: compact now, before the cache lapses', () => {
  const m = compactMoment({ percent: 65, tokens: 150_000, compactAt: 97, atBreak: true, quietMs: 30 * MIN, ttlMs: HOUR })
  expect(m.level).toBe('good')
  expect(m.lines[0]).toBe('You are away. Compact now, while it is cheap.')
  expect(m.lines[1]).toMatch(/The cache runs out in about 30 min/)
})

test('a lapsed cache is worded as a rewrite', () => {
  const m = compactMoment({ percent: 65, tokens: 200_000, compactAt: 97, atBreak: true, quietMs: 90 * MIN, ttlMs: HOUR })
  expect(m.lines[1]).toMatch(/at full price/)
  expect(m.why).toMatch(/lapsed/)
  expect(m.why).toMatch(/at once/)
})

test('the cache word follows the cache lifetime: an hour on a subscription, five minutes on credits', () => {
  expect(compactMoment({ percent: 70, compactAt: 97, atBreak: true, quietMs: 20 * MIN, ttlMs: HOUR }).why).toMatch(/warm/)
  expect(compactMoment({ percent: 70, compactAt: 97, atBreak: true, quietMs: 20 * MIN }).why).toMatch(/lapsed/)
  expect(compactMoment({ percent: 70, compactAt: 97, atBreak: true, quietMs: 90 * MIN, ttlMs: HOUR }).why).toMatch(/lapsed/)
})

test('in the middle of work a fuller window waits for the break, unless auto-compact is close', () => {
  expect(compactMoment({ percent: 65, compactAt: 97, atBreak: false, quietMs: 0 }).level).toBe('none')
  expect(compactMoment({ percent: 90, compactAt: 97, atBreak: false, quietMs: 0 }).lines[0]).toBe('Claude compacts the session by itself soon.')
  expect(compactMoment({ percent: 90, compactAt: 97, atBreak: true, quietMs: 0 }).lines[0]).toBe('Claude compacts the session by itself soon. Compact now.')
  expect(compactMoment({ percent: 98, compactAt: 97, atBreak: false, quietMs: 0 }).level).toBe('now')
})

test('the line to paste names the goal and branch, never conversation text', () => {
  expect(compactLine({ title: 'Fix login', branch: 'b1' })).toBe('/compact Keep the goal "Fix login" on branch b1, the files changed, decisions made and why, and the next steps.')
  expect(compactLine({})).toBe('/compact Keep the current goal, the files changed, decisions made and why, and the next steps.')
  expect(cardText({})).toBe('Keep the current goal, the files changed, decisions made and why, and the next steps.')
})


const withProof = (over: Partial<ProofState>): ProofState => ({ ...emptyState(), ...over })

test('the work is finished when every check passed after the last edit, open when one failed or an edit came after it', () => {
  expect(workState(undefined)).toBe('unknown')
  expect(workState(withProof({ edits: 0 }))).toBe('unknown')
  expect(workState(withProof({ edits: 3, lastEditSeq: 5, receipts: [{ kind: 'tests', ok: true, at: 1, seq: 7 }] }))).toBe('finished')
  expect(workState(withProof({ edits: 3, lastEditSeq: 8, receipts: [{ kind: 'tests', ok: true, at: 1, seq: 7 }] }))).toBe('open')
  expect(workState(withProof({ edits: 3, lastEditSeq: 5, receipts: [{ kind: 'tests', ok: false, exit: 1, at: 1, seq: 7 }] }))).toBe('open')
  expect(workState(withProof({ edits: 3, lastEditSeq: 5, receipts: [] }))).toBe('unknown')
  expect(workState(withProof({ edits: 3, lastEditSeq: 5, done: ['tests', 'build'], receipts: [{ kind: 'tests', ok: true, at: 1, seq: 7 }] }))).toBe('open')
})

test('open work waits for a better moment, finished work says so, and a nearly full window compacts anyway', () => {
  const base = { percent: 80, tokens: 200_000, compactAt: 97, atBreak: true, quietMs: MIN, ttlMs: HOUR }
  const open = withProof({ edits: 3, lastEditSeq: 8, receipts: [{ kind: 'tests', ok: true, at: 1, seq: 7 }] })
  const done = withProof({ edits: 3, lastEditSeq: 5, receipts: [{ kind: 'tests', ok: true, at: 1, seq: 7 }] })
  expect(compactMoment({ ...base, extra: { proof: open } }).level).toBe('none')
  expect(compactMoment({ ...base, extra: { proof: withProof({ edits: 3, lastEditSeq: 5, todo: { done: 1, total: 4 } }) } }).level).toBe('none')
  const finished = compactMoment({ ...base, extra: { proof: done } })
  expect(finished.level).toBe('good')
  expect(finished.why).toMatch(/Good moment because: checks passed/)
  expect(compactMoment({ ...base, percent: 90, extra: { proof: open } }).level).toBe('soon')
})

test('anything running, waiting, held or just compacted stops the advice, and the same facts give the same score', () => {
  const base = { percent: 80, tokens: 200_000, compactAt: 97, atBreak: true, quietMs: MIN, ttlMs: HOUR }
  expect(compactMoment(base).level).toBe('good')
  expect(compactMoment({ ...base, extra: { helpers: 1 } }).level).toBe('none')
  expect(compactMoment({ ...base, extra: { waits: true } }).level).toBe('none')
  expect(compactMoment({ ...base, extra: { guardHeld: true } }).level).toBe('none')
  expect(compactMoment({ ...base, extra: { sinceCompactMs: 5 * MIN } }).level).toBe('none')
  expect(scoreOf(base).hardStops).toEqual([])
  expect(scoreOf({ ...base, atBreak: false }).hardStops).toEqual(['working'])
})

test('payback at 60 % of the window: a 200k window earns no payback points with the default guesses, a 1M window does', () => {
  const warm = (tokens: number, ttlMs: number): number => paybackTurns({ tokens, after: 15_000, out: 5_000, warm: true, ttlMs }) ?? Infinity
  expect(Math.round(warm(60_000, HOUR) * 10) / 10).toBe(9.1)
  expect(Math.round(warm(60_000, 5 * MIN) * 10) / 10).toBe(8.3)
  expect(Math.round(warm(300_000, HOUR) * 10) / 10).toBe(2.3)
  const f = { percent: 60, compactAt: 97, atBreak: true, quietMs: MIN, ttlMs: HOUR, extra: { saved: true } }
  expect(scoreOf({ ...f, tokens: 60_000 }).reasons.map(r => r.id)).not.toContain('payback')
  expect(scoreOf({ ...f, tokens: 300_000 }).reasons.map(r => r.id)).toContain('payback')
})
