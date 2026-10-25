// "Why not now?" says what Auto really waits for, from the same checks it runs.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { whyNotNow } from '../hooks/features/home/compactwhy'
import { noteGiveUp } from '../hooks/features/compaction'
import { setLang, tr } from '../hooks/core/lang'

const MIN = 60_000
const HOUR = 60 * MIN
const NOW = Date.parse('2026-10-10T12:00:00Z')
type Over = { kind?: string; percent?: number; tokens?: number; sinceMs?: number; cacheAt?: number; compacts?: { at: number }[] }
const row = (o: Over = {}) => ({ kind: o.kind ?? 'waiting', reason: '', sinceMs: o.sinceMs ?? MIN, name: 'x', rec: { contextPercent: o.percent ?? 34, ctx: { tokens: o.tokens ?? 80_000 }, cache: { at: o.cacheAt ?? NOW - MIN }, compacts: o.compacts } }) as never
const prefs = (over: { agents?: unknown[]; inbox?: unknown[]; values?: Record<string, string> } = {}) => ({ sid: 'abcdefgh-1', agents: [], inbox: [], values: {}, ...over }) as never

test('the rule with the numbers now: size, break and the minimum', () => {
  expect(whyNotNow(row(), HOUR, NOW, prefs())).toBe('Auto compacts at 60% (now 34%), or during a break: after 45 min away while the cache is warm. With agents running, Auto waits until 75%. Not under 100k tokens (now 80k).')
  expect(whyNotNow(row(), HOUR, NOW, prefs({ values: { 'compact.from': '70', 'compact.lead': '20', 'compact.min': '200000' } }))).toBe('Auto compacts at 70% (now 34%), or during a break: after 40 min away while the cache is warm. With agents running, Auto waits until 75%. Not under 200k tokens (now 80k).')
})

test('a lapsed cache has no break trigger', () => {
  expect(whyNotNow(row({ cacheAt: NOW - 2 * HOUR }), HOUR, NOW, prefs())).toBe('Auto compacts at 60% (now 34%). The cache has lapsed, so not during a break. With agents running, Auto waits until 75%. Not under 100k tokens (now 80k).')
})

test('an unknown plan has no break trigger, and the line says so', () => {
  expect(whyNotNow(row(), undefined, NOW, prefs())).toBe('Auto compacts at 60% (now 34%). Your plan is not known yet, so not during a break. With agents running, Auto waits until 75%. Not under 100k tokens (now 80k).')
})

test('after Auto gave up in this session the card says when it tries again; another session is not told', () => {
  noteGiveUp('giveupab-1', NOW - 10 * MIN)
  expect(whyNotNow(row(), HOUR, NOW, { ...(prefs() as object), sid: 'giveupab-1' } as never)).toBe('Waiting: Auto could not compact this session. It tries again in 20 min.')
  expect(whyNotNow(row(), HOUR, NOW, prefs())).toMatch(/^Auto compacts at 60%/)
  expect(whyNotNow(row(), HOUR, NOW + 25 * MIN, { ...(prefs() as object), sid: 'giveupab-1' } as never)).toMatch(/^Auto compacts at 60%/)
})

test('what holds Auto back comes first, in the order Auto checks', () => {
  expect(whyNotNow(row({ kind: 'working' }), HOUR, NOW, prefs())).toBe('Waiting: Claude is still answering.')
  expect(whyNotNow(row({ kind: 'needs' }), HOUR, NOW, prefs())).toBe('Waiting: a question or a permission waits for you.')
  expect(whyNotNow(row(), HOUR, NOW, prefs({ agents: [{ state: 'running', session: 'abcdefgh', background: false }] }))).toBe('Waiting: an agent is running in the foreground.')
  expect(whyNotNow(row(), HOUR, NOW, prefs({ inbox: [{ here: true, kind: 'hold', allowed: false }] }))).toBe('Waiting: a risky step was stopped and waits for your yes.')
  expect(whyNotNow(row({ compacts: [{ at: NOW - 4 * MIN }] }), HOUR, NOW, prefs())).toBe('Waiting: the session was compacted 4 min ago. Auto leaves 20 min between two.')
})

test('a good moment, by size or by a break; by size it names the real compact points, never the fill as one', () => {
  expect(whyNotNow(row({ percent: 70, tokens: 400_000 }), HOUR, NOW, prefs())).toBe('Now is a good moment: Auto compacts at 60% (now 70%).')
  const appAt = { ...(row({ percent: 93, tokens: 400_000 }) as { rec: { ctx: object } }) } as { rec: { ctx: object } }
  appAt.rec = { ...appAt.rec, ctx: { ...appAt.rec.ctx, compactAt: 92 } }
  expect(whyNotNow(appAt as never, HOUR, NOW, prefs())).toBe('Now is a good moment: Auto compacts at 60%, Claude Code at 92% (now 93%).')
  setLang('sv')
  try {
    expect(whyNotNow(appAt as never, HOUR, NOW, prefs(), tr)).toBe('Nu är en bra stund: Auto komprimerar vid 60\u00a0%, Claude Code vid 92\u00a0% (nu 93\u00a0%).')
  } finally {
    setLang('en')
  }
  expect(whyNotNow(row({ percent: 20, tokens: 300_000, sinceMs: 46 * MIN }), HOUR, NOW, prefs())).toBe('Now is a good moment: Auto compacts during this break.')
  expect(whyNotNow(undefined, HOUR, NOW, prefs())).toBeUndefined()
})

test('the same lines in Swedish', () => {
  setLang('sv')
  try {
    expect(whyNotNow(row({ kind: 'working' }), HOUR, NOW, prefs(), tr)).toBe('Väntar: Claude svarar fortfarande.')
    expect(whyNotNow(row(), undefined, NOW, prefs(), tr)).toBe('Auto komprimerar vid 60\u00a0% (nu 34\u00a0%). Din plan är inte känd än, så inte under en paus. När agenter körs väntar Auto till 75\u00a0%. Aldrig under 100k tokens (nu 80k).')
    expect(whyNotNow(row(), HOUR, NOW, prefs(), tr)).toBe('Auto komprimerar vid 60\u00a0% (nu 34\u00a0%), eller under en paus: efter 45 min borta medan cachen är varm. När agenter körs väntar Auto till 75\u00a0%. Aldrig under 100k tokens (nu 80k).')
  } finally {
    setLang('en')
  }
})

test('with agents running in the background, the rule says Auto waits until 75%, and says when it is time', () => {
  const bg = prefs({ agents: [{ state: 'running', session: 'abcdefgh', background: true }] })
  expect(whyNotNow(row({ percent: 70, tokens: 400_000 }), HOUR, NOW, bg)).toBe('With agents running, Auto waits until 75% (now 70%), and not during a break. Not under 100k tokens (now 400k).')
  expect(whyNotNow(row({ percent: 76, tokens: 400_000 }), HOUR, NOW, bg)).toBe('Now is a good moment: Auto compacts at 75% (now 76%).')
  // An agent of another session does not count
  expect(whyNotNow(row({ percent: 70, tokens: 400_000 }), HOUR, NOW, prefs({ agents: [{ state: 'running', session: 'zzzzzzzz', background: true }] }))).toBe('Now is a good moment: Auto compacts at 60% (now 70%).')
  setLang('sv')
  try {
    expect(whyNotNow(row({ percent: 70, tokens: 400_000 }), HOUR, NOW, bg, tr)).toBe('När agenter körs väntar Auto till 75\u00a0% (nu 70\u00a0%), och inte under en paus. Aldrig under 100k tokens (nu 400k).')
  } finally {
    setLang('en')
  }
})
