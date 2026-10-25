// The cache keeper's rule and its command.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { KEEPER_MAX_PINGS, KEPT_LOST_WHAT, KEPT_PAID_WHAT, cacheHeld, keeperVerdict, keptDetail, keptNet, keptNetDetail, keptToday, leadMs, nextPingInMs, pingHeld } from '../hooks/core/cachekeeper'
import { didLine, didToday, shortSummary } from '../hooks/core/ledger'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'
import { settingStoreKey } from '../hooks/core/settings'
import { CACHE_WARM_MS, ttlOrGuess } from '../hooks/core/compactmoment'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')
const ok = { mode: 'on', tokens: 150_000, pings: 0, busy: false, warmLeftMs: 5 * MIN }

test('the ping goes late in the cache life: 5 minutes before on a 1-hour cache, 90 seconds before on a 5-minute one', () => {
  expect(leadMs(60 * MIN)).toBe(5 * MIN)
  expect(leadMs(5 * MIN)).toBe(90_000)
  expect(nextPingInMs(NOW, 60 * MIN, NOW)).toBe(55 * MIN)
  expect(nextPingInMs(NOW, 60 * MIN, NOW + 56 * MIN)).toBe(0)
  expect(nextPingInMs(NOW, 5 * MIN, NOW + 4 * MIN)).toBe(0)
})

test('the verdict: ping only when on, idle, big enough, under the cap, and the cache is still warm', () => {
  expect(keeperVerdict(ok)).toEqual({ ping: true })
  expect(keeperVerdict({ ...ok, mode: 'off' })).toEqual({ ping: false, why: 'The keeper is off.' })
  expect(keeperVerdict({ ...ok, busy: true }).ping).toBe(false)
  expect(keeperVerdict({ ...ok, tokens: undefined }).ping).toBe(false)
  expect(keeperVerdict({ ...ok, tokens: 60_000, minTokens: 0 })).toEqual({ ping: true })
  expect(keeperVerdict({ ...ok, tokens: 60_000 })).toEqual({ ping: false, why: 'The session is short: a rewrite is cheap.' })
  expect(keeperVerdict({ ...ok, pings: KEEPER_MAX_PINGS })).toEqual({ ping: false, why: 'It already read the cache 3 times since your last answer.' })
  expect(keeperVerdict({ ...ok, warmLeftMs: 0 })).toEqual({ ping: false, why: 'The cache has already gone stale.' })
})

test('a ping held when the cache served most of its input, and lapsed when it paid for a rewrite', () => {
  expect(pingHeld({ cache_read_input_tokens: 148_000, cache_creation_input_tokens: 30, input_tokens: 10 })).toBe(true)
  expect(pingHeld({ cache_read_input_tokens: 0, cache_creation_input_tokens: 148_000, input_tokens: 10 })).toBe(false)
  expect(pingHeld(undefined)).toBe(false)
})

test('the words', () => {
  expect(keptDetail(148_300, 2)).toBe('Read 148k tokens from the cache (2 of 3).')
  expect(didLine({ what: 'Kept the cache warm', n: 1 })).toBe('Kept the session cheap once.')
  expect(didLine({ what: 'Kept the cache warm', n: 3 })).toBe('Kept the session cheap 3 times.')
})

test("the ledger counts today's actions by title, and the one line says them", () => {
  const e = (at: number, what: string, did = true) => ({ at, what, did })
  const list = [e(NOW, 'Kept the cache warm'), e(NOW - MIN, 'Kept the cache warm'), e(NOW - 30 * 60 * MIN, 'Kept the cache warm'), e(NOW, 'Cache keeper stopped', false), e(NOW, 'Caught a repeating step')]
  expect(didToday(list, NOW)).toEqual([{ what: 'Kept the cache warm', n: 2 }, { what: 'Caught a repeating step', n: 1 }])
  expect(shortSummary({ count: 0, freed: 0 }, [{ what: 'Kept the cache warm', n: 2 }])).toBe('Kept the session cheap 2 times')
  expect(shortSummary({ count: 1, freed: 305_000 }, [{ what: 'Kept the cache warm', n: 1 }])).toBe('Compacted the session once, about 305k tokens freed, kept the session cheap once')
  expect(shortSummary({ count: 0, freed: 0 })).toBe('Nothing today')
  // The money states: the saving is the first part, said as an estimate, and the keeper's row is left out by the card
  expect(shortSummary({ count: 1, freed: 305_000 }, [], s => s, 'saved about\u00a0$1.37 (estimate)')).toBe('Saved about\u00a0$1.37 (estimate), compacted the session once, about 305k tokens freed')
})

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  return mem
}

test('/vaken-help run keeper says it is off by default and why there is no ping', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const shown = (await $.command.run(viaParent('vaken-keeper', ''))) as { text: string }
  expect(shown.text).toMatch(/Keeper: off/)
  expect(shown.text).toMatch(/No turn yet/)
  expect(shown.text).toMatch(/No read now: The keeper is off/)
  expect(shown.text).toMatch(/\/vaken-help run keeper now/)
  expect(shown.text).toMatch(/Turn it on: Settings > Money and plan/)
})

test('/vaken-help run keeper now answers at once and the ping comes after', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('model.fork', () => ({ isAnswered: true, text: 'ok', usage: { input_tokens: 5, output_tokens: 2, cache_read_input_tokens: 148_000, cache_creation_input_tokens: 20 } }) as never)
  const r = (await $.command.run(viaParent('vaken-keeper', 'now'))) as { text: string }
  expect(r.text).toMatch(/in a moment/)
})

test('with the plan not known the keeper uses the same short cache time as Auto compaction, so a lapsed cache is never read as warm', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  mem.set(settingStoreKey('cache.keeper'), 'on')
  mem.set('cockpit:session:test-session', { sessionId: 'test-session', cwd: '/w', model: 'm', state: 'idle', startedAt: NOW - 60 * MIN, updatedAt: NOW - 4 * MIN, lastEventAt: NOW - 4 * MIN, stateSince: NOW - 4 * MIN, cache: { read: 150_000, write: 0, fresh: 0, at: NOW - 4 * MIN } })
  const shown = (await $.command.run(viaParent('vaken-keeper', ''))) as { text: string }
  expect(shown.text).toMatch(/Next read: due now/)
  expect(ttlOrGuess(undefined)).toBe(CACHE_WARM_MS)
})

// Opus 5.5 list prices: read $0.20, 5-minute write $5 a million tokens
const OPUS = { read: 0.2, write: 5 }
const cents = (usd: number | undefined): number => Math.round((usd ?? NaN) * 100) / 100

test('the money: a held next answer spared the rewrite, less what the reads cost', () => {
  const next = { read: 150_000, write: 500, fresh: 20 }
  expect(cacheHeld(next)).toBe(true)
  const n = keptNet(OPUS, [150_000, 150_000], next, true)
  expect(cents(n?.spared)).toBe(0.72)
  expect(cents(n?.cost)).toBe(0.06)
  expect(cents(n?.usd)).toBe(0.66)
  expect(keptNetDetail(n ?? { spared: 0, cost: 0 }, 2)).toBe('Your next message used the cache: about\u00a0$0.72 of rewriting spared, less about\u00a0$0.06 for 2 reads.')
})

test('the money: reads that the next answer did not use only cost, and no price means no figure', () => {
  const cold = { read: 0, write: 150_000, fresh: 20 }
  expect(cacheHeld(cold)).toBe(false)
  const n = keptNet(OPUS, [150_000], cold, false)
  expect(cents(n?.usd)).toBe(-0.03)
  expect(keptNetDetail(n ?? { spared: 0, cost: 0 }, 1)).toBe('Your next message did not use the cache, so 1 read cost about\u00a0$0.03 for nothing.')
  expect(keptNet(undefined, [150_000], cold, false)).toBeUndefined()
  expect(keptNet(OPUS, [], cold, true)).toBeUndefined()
})

test("today's keeper money sums saved and lost lines of today only", () => {
  const ledger = [
    { at: NOW, what: KEPT_PAID_WHAT, usd: 0.66 },
    { at: NOW - MIN, what: KEPT_LOST_WHAT, usd: -0.03 },
    { at: NOW - 2 * MIN, what: 'Kept the cache warm', did: true },
    { at: NOW - 30 * 60 * MIN, what: KEPT_PAID_WHAT, usd: 5 },
  ]
  expect(cents(keptToday(ledger, NOW))).toBe(0.63)
  expect(keptToday([], NOW)).toBeUndefined()
})
