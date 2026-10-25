// The good-moment score: hard stops that each block, points that add up, the thresholds, and the plain words.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { AUTO_AT, AUTO_GAP_MS, COMPACT_FROM_PCT, MIN_TOKENS, SUGGEST_AT, autoReady, score, suggests, workSaved } from '../hooks/core/compactscore'
import type { ScoreFacts } from '../hooks/core/compactscore'
import { becauseWords, reasonWords, skippedWords } from '../hooks/core/compactwords'
import { emptyState } from '../hooks/core/proof'
import type { ProofState } from '../hooks/core/proof'
import { tr, setLang } from '../hooks/core/lang'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

const finished = (): ProofState => ({ ...emptyState(), seq: 2, lastEditSeq: 1, edits: 1, receipts: [{ kind: 'tests', ok: true, seq: 2, at: NOW } as never] })

const calm = (over: Partial<ScoreFacts> = {}): ScoreFacts => ({ working: false, waits: false, helpers: 0, background: 0, guardHeld: false, tokens: 300_000, percent: 70, saved: false, quietMs: 2 * MIN, cacheLeftMs: 40 * MIN, payback: 3, ...over })

test('the thresholds are the named constants', () => {
  expect([SUGGEST_AT, AUTO_AT, COMPACT_FROM_PCT, AUTO_GAP_MS, MIN_TOKENS]).toEqual([50, 70, 60, 30 * MIN, 150_000])
})

test('a calm moment scores its points and has no hard stop', () => {
  const s = score(calm())
  expect(s.hardStops).toEqual([])
  expect(s.score).toBe(75)
  expect(s.reasons.map(r => r.id)).toEqual(['unchanged', 'context', 'cache', 'quiet', 'payback'])
})

test('each hard stop alone blocks, by name', () => {
  const stops = (over: Partial<ScoreFacts>): string[] => score(calm(over)).hardStops
  expect(stops({ working: true })).toEqual(['working'])
  expect(stops({ waits: true })).toEqual(['waiting'])
  expect(stops({ helpers: 1 })).toEqual(['running'])
  expect(stops({ background: 1 })).toEqual(['running'])
  expect(stops({ guardHeld: true })).toEqual(['guard'])
  expect(stops({ sinceCompactMs: 9 * MIN })).toEqual(['recent'])
  expect(stops({ sinceCompactMs: 10 * MIN })).toEqual([])
  expect(stops({ percent: 59 })).toEqual(['small'])
  expect(stops({ percent: 60 })).toEqual([])
  expect(stops({ percent: 60, tokens: 60_000 })).toEqual([])
  expect(stops({ percent: 40, from: 50 })).toEqual(['small'])
  expect(stops({ percent: undefined, tokens: MIN_TOKENS - 1 })).toEqual(['small'])
  expect(stops({ tokens: undefined, percent: undefined })).toEqual(['small'])
  expect(stops({ tokens: undefined })).toEqual([])
  expect(stops({ percent: undefined })).toEqual([])
  expect(stops({ working: true, helpers: 2, guardHeld: true })).toEqual(['working', 'running', 'guard'])
})

test('open work is a hard stop: a failed check, an edit after the last check, an open task list', () => {
  expect(score(calm({ proof: finished() })).hardStops).toEqual([])
  expect(score(calm({ proof: { ...finished(), lastEditSeq: 3 } })).hardStops).toEqual(['open'])
  expect(score(calm({ proof: { ...finished(), receipts: [{ kind: 'tests', ok: false, seq: 2, at: NOW } as never] } })).hardStops).toEqual(['open'])
  expect(score(calm({ proof: { ...finished(), todo: { done: 1, total: 3 } } })).hardStops).toEqual(['open'])
})

test('points: checks passed 30, task list done 10, work saved 15, context 10 / 20 / 30, cache 10, quiet 5, payback 10', () => {
  const pts = (over: Partial<ScoreFacts>): number => score(calm({ percent: 60, cacheLeftMs: 0, quietMs: 0, payback: undefined, proof: finished(), ...over })).score
  expect(pts({})).toBe(30 + 10)
  expect(pts({ proof: { ...finished(), todo: { done: 2, total: 2 } } })).toBe(30 + 10 + 10)
  expect(pts({ saved: true })).toBe(30 + 10 + 15)
  expect(pts({ percent: 65 })).toBe(30 + 20)
  expect(pts({ percent: 80 })).toBe(30 + 30)
  expect(pts({ cacheLeftMs: 60_000 })).toBe(30 + 10 + 10)
  expect(pts({ cacheLeftMs: 59_999 })).toBe(30 + 10)
  expect(pts({ quietMs: 2 * MIN })).toBe(30 + 10 + 5)
  expect(pts({ payback: 5 })).toBe(30 + 10 + 10)
  expect(pts({ payback: 5.1 })).toBe(30 + 10)
  // Edits with no check earn nothing for the work; the score never goes past 100.
  expect(pts({ proof: { ...emptyState(), edits: 2, seq: 2, lastEditSeq: 2 } })).toBe(10)
  expect(score(calm({ percent: 90, saved: true, proof: { ...finished(), todo: { done: 2, total: 2 } } })).score).toBe(100)
})

test('a cold cache is neither a hard stop nor a bonus', () => {
  const cold = score(calm({ cacheLeftMs: -10 * MIN }))
  expect(cold.hardStops).toEqual([])
  expect(cold.score).toBe(65)
  expect(cold.reasons.map(r => r.id)).not.toContain('cache')
})

test('Suggest shows from 50 points; Auto needs 70 points, no hard stop and the chat at 60 % of its window', () => {
  expect(suggests(score(calm({ percent: 60, cacheLeftMs: 0, quietMs: 0, payback: undefined, saved: true })))).toBe(true)
  expect(suggests(score(calm({ percent: 60, cacheLeftMs: 0, quietMs: 0, payback: undefined })))).toBe(false)
  expect(suggests(score(calm({ percent: 60, cacheLeftMs: 0, quietMs: 0, payback: undefined, proof: { ...emptyState(), edits: 1, seq: 1, lastEditSeq: 1 } })))).toBe(false)
  const ok = score(calm())
  expect(autoReady(ok, 70)).toBe(true)
  expect(autoReady(score(calm({ helpers: 1 })), 70)).toBe(false)
  expect(autoReady(ok, undefined)).toBe(false)
})

const at60 = (over: Partial<ScoreFacts> = {}): ScoreFacts => calm({ percent: 60, tokens: 60_000, saved: true, ...over })

test('Auto considers a compaction at 60 % of the window and not at 59 %', () => {
  const ready = (over: Partial<ScoreFacts>): boolean => autoReady(score(at60(over)), over.percent ?? 60, over.from)
  expect(ready({})).toBe(true)
  expect(ready({ percent: 59 })).toBe(false)
  expect(score(at60({ percent: 59 })).hardStops).toEqual(['small'])
  expect(suggests(score(at60()))).toBe(true)
  expect(suggests(score(at60({ percent: 59 })))).toBe(false)
  expect(ready({ percent: 55, from: 70 })).toBe(false)
  expect(ready({ percent: 70, from: 70 })).toBe(true)
  expect(COMPACT_FROM_PCT).toBe(60)
})

test('at 60 % every safeguard still blocks Auto', () => {
  const blocked = (over: Partial<ScoreFacts>): string[] => score(at60(over)).hardStops
  expect(blocked({ working: true })).toEqual(['working'])
  expect(blocked({ waits: true })).toEqual(['waiting'])
  expect(blocked({ helpers: 1 })).toEqual(['running'])
  expect(blocked({ background: 1 })).toEqual(['running'])
  expect(blocked({ guardHeld: true })).toEqual(['guard'])
  expect(blocked({ sinceCompactMs: 9 * MIN })).toEqual(['recent'])
  expect(blocked({ proof: { ...finished(), lastEditSeq: 3 } })).toEqual(['open'])
  expect(blocked({ proof: { ...finished(), receipts: [{ kind: 'tests', ok: false, seq: 2, at: NOW } as never] } })).toEqual(['open'])
  // The points still gate it: a cold cache and no payback on a small window leave Auto waiting.
  expect(autoReady(score(at60({ saved: false, cacheLeftMs: 0, payback: undefined })), 60)).toBe(false)
  // The cache stays a point, never a bypass: with 60 % alone the score is 70 at most without the payback (30 + 15 + 10 + 5 + 10).
  expect(score(at60({ payback: undefined })).score).toBe(70)
  expect(score(at60()).score).toBe(80)
})

test('work saved: git is clean after the last answer, or a checkpoint was made during it', () => {
  const p = { ...finished(), last: { at: NOW, seconds: 120, edits: 1, files: 1, ran: [], claims: [], unproven: [], diff: { files: 0, lines: 0 } } } as ProofState
  expect(workSaved(p)).toBe(true)
  expect(workSaved({ ...p, last: { ...p.last!, diff: { files: 2, lines: 10 } } })).toBe(false)
  expect(workSaved({ ...p, last: { ...p.last!, diff: { files: 2, lines: 10 } } }, NOW - MIN)).toBe(true)
  expect(workSaved({ ...p, last: { ...p.last!, diff: { files: 2, lines: 10 } } }, NOW - 10 * MIN)).toBe(false)
  expect(workSaved(undefined, NOW)).toBe(false)
})

test('the words: the because line, the skipped line', () => {
  const s = score(calm({ saved: true, proof: { ...finished(), todo: { done: 2, total: 2 } } }))
  expect(becauseWords(s.reasons)).toBe('Compacting now because: checks passed, context 70%, work saved, task finished, cache warm')
  expect(becauseWords(s.reasons, undefined, false)).toMatch(/^Good moment because: checks passed/)
  expect(reasonWords([])).toBe('')
  expect(skippedWords('a new answer started')).toBe('Skipped: a new answer started')
})

test('the words have Swedish lines with the same keys', () => {
  setLang('sv')
  try {
    expect(tr('Claude is working')).toBe('Claude arbetar')
    expect(tr('Compacting now because: {why}')).toBe('Komprimerar nu eftersom: {why}')
  } finally {
    setLang('en')
  }
})
