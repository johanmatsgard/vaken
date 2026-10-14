// The value meter's rule and its reading.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { viaParent } from './viaparent'
import type { EngineInterface, On } from 'claude-code'

import { readBand } from '../hooks/core/band'
import { AUDIT_KEY } from '../hooks/core/insight'
import type { AuditRow } from '../hooks/core/insight'
import type { Io } from '../hooks/core/io'
import type { Entry } from '../hooks/core/ledger'
import { SETTINGS } from '../hooks/core/settings'
import { BLOCK_TITLES, COMPACTED_WHAT, DAY_MS, VALUE_SETTINGS, actionsBetween, bucketOf, daysOf, freedBetween, groupDone, quietBlocks, valueLines, weekStamp, weeklyLine } from '../hooks/core/value'
import type { Done } from '../hooks/core/value'
import { WEEK_KEY, valueText, weeklyCheck } from '../hooks/features/value'
import { LEDGER_KEY } from '../hooks/features/compaction'

const HOUR = 60 * 60_000
const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime()

const audit = (what: string, ago: number): AuditRow => ({ at: NOW - ago, what, how: 'auto' })
const done = (what: string, ago = HOUR): Done => ({ at: NOW - ago, what })
const compact = (ago: number, before: number, after: number): Entry => ({ at: NOW - ago, what: 'compacted (auto)', before, after, how: 'auto' })

// A store in memory with the same shape as the engine's, for the reading functions.
function memIo(seed: Record<string, unknown> = {}, now = NOW) {
  const mem = new Map<string, unknown>([['cockpit:setting:value.weekly', 'on'], ...Object.entries(seed)])
  let clock = now
  const io: Io = {
    now: async () => clock,
    home: async () => '',
    sessionId: async () => 'me',
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem, setNow: (t: number) => void (clock = t) }
}

test('the Settings row: group Care, Off or On, On by default (Recommended)', () => {
  expect(VALUE_SETTINGS.map(s => s.key)).toEqual(['value.weekly'])
  expect(VALUE_SETTINGS[0]?.group).toBe('Care')
  expect(VALUE_SETTINGS[0]?.options.map(o => o.value)).toEqual(['off', 'on'])
  expect(VALUE_SETTINGS[0]?.default).toBe('on')
})

test('a title goes to the first group whose keyword it holds, else Other', () => {
  expect(bucketOf('Kept the cache warm')).toBe('Saved usage')
  expect(bucketOf('compacted (auto)')).toBe('Saved usage')
  expect(bucketOf('Sent a lookup agent to a cheaper model')).toBe('Saved usage')
  expect(bucketOf('Held a risky command')).toBe('Kept you safe')
  expect(bucketOf('Caught a repeating step')).toBe('Kept you safe')
  expect(bucketOf('Found an instruction hidden in outside text')).toBe('Kept you informed')
  expect(bucketOf('Ended away mode with a digest')).toBe('Kept you informed')
  expect(bucketOf('Noticed a plugin update')).toBe('Kept you informed')
  expect(bucketOf('Kept the Mac awake')).toBe('Other')
})

test('groups come in a fixed order with their two most frequent titles', () => {
  const rows = [done('Kept the cache warm'), done('Kept the cache warm'), done('Kept the cache warm'), done(COMPACTED_WHAT), done(COMPACTED_WHAT), done('Sent a lookup agent to a cheaper model'), done('Held a risky command'), done('Kept the Mac awake')]
  const groups = groupDone(rows)
  expect(groups.map(g => g.name)).toEqual(['Saved usage', 'Kept you safe', 'Other'])
  expect(groups[0]).toEqual({ name: 'Saved usage', n: 6, top: [{ what: 'Kept the cache warm', n: 3 }, { what: COMPACTED_WHAT, n: 2 }] })
  expect(groupDone([])).toEqual([])
})

test('the rows are the audit rows and the compactions inside the window; a compaction that freed nothing is not counted', () => {
  const rows = actionsBetween(
    [audit('Held a risky command', HOUR), audit('Held a risky command', 8 * DAY_MS)],
    [compact(2 * HOUR, 300_000, 10_000), compact(3 * HOUR, 10_000, 10_000), { at: NOW - HOUR, what: 'auto-compact starts' }],
    NOW - 7 * DAY_MS,
    NOW + 1,
  )
  expect(rows.map(r => r.what).sort()).toEqual([COMPACTED_WHAT, 'Held a risky command'])
  expect(freedBetween([compact(2 * HOUR, 300_000, 10_000), compact(DAY_MS * 9, 100_000, 5_000)], NOW - 7 * DAY_MS, NOW + 1)).toEqual({ count: 1, freed: 290_000 })
})

test('the days: "day" is 1, everything else is 7', () => {
  expect(daysOf('day')).toBe(1)
  expect(daysOf(' Day ')).toBe(1)
  expect(daysOf('week')).toBe(7)
  expect(daysOf('')).toBe(7)
  expect(daysOf('nonsense')).toBe(7)
})

test('the text: a headline, the groups, the tokens as an estimate, the quiet blocks, and the honest note, in at most 14 lines', () => {
  const rows = [done('Kept the cache warm'), done('Kept the cache warm'), done(COMPACTED_WHAT), done('Held a risky command'), done('Ended away mode with a digest'), done('Kept the Mac awake')]
  const lines = valueLines({ days: 7, rows, freed: { count: 1, freed: 290_000 }, quiet: ['Loop breaker', 'Edit fence'], cut: false })
  expect(lines[0]).toBe('Vaken did 6 things for you in 7 days.')
  expect(lines).toContain('Saved usage: 3 (Kept the cache warm 2, Compacted a session 1)')
  expect(lines).toContain('Kept you safe: 1 (Held a risky command 1)')
  expect(lines).toContain('Kept you informed: 1 (Ended away mode with a digest 1)')
  expect(lines).toContain('Other: 1 (Kept the Mac awake 1)')
  expect(lines).toContain('Tokens freed by compacting the session 1 time: about 290k (estimate).')
  expect(lines.join('\n')).toMatch(/Did nothing \(fine if you had no need\): Loop breaker, Edit fence\./)
  expect(lines.join('\n')).toMatch(/not a measure of money saved/)
  expect(lines.length).toBeLessThanOrEqual(14)
})

test('one thing, an empty week, one day, a long quiet list and a full audit all read plainly', () => {
  expect(valueLines({ days: 7, rows: [done('Held a risky command')], freed: { count: 0, freed: 0 }, quiet: [], cut: false })[0]).toBe('Vaken did 1 thing for you in 7 days.')
  const empty = valueLines({ days: 1, rows: [], freed: { count: 0, freed: 0 }, quiet: [], cut: false })
  expect(empty[0]).toBe('Vaken wrote nothing down in 1 day.')
  expect(empty.join('\n')).toMatch(/\/vaken-today value shows 7 days/)
  const many = valueLines({ days: 7, rows: [done('Held a risky command')], freed: { count: 0, freed: 0 }, quiet: Array.from({ length: 12 }, (_, n) => `Block ${n}`), cut: true })
  expect(many.join('\n')).toMatch(/Block 7 and 4 more\./)
  expect(many.join('\n')).toMatch(/audit is full \(500 actions\)/)
  expect(many.length).toBeLessThanOrEqual(14)
})

test('the title map covers at least 10 Settings rows, every row is a real Settings row, and every title is a plain non-empty string', () => {
  const keys = Object.keys(BLOCK_TITLES)
  expect(keys.length).toBeGreaterThanOrEqual(10)
  for (const key of keys) {
    expect(SETTINGS.some(s => s.key === key)).toBe(true)
    expect(BLOCK_TITLES[key]?.length).toBeGreaterThan(0)
    for (const t of BLOCK_TITLES[key] ?? []) expect(t.trim()).not.toBe('')
  }
})

test('a block that is Off is not listed, a block that fired is not listed, a quiet block is', () => {
  const values = Object.fromEntries(SETTINGS.map(s => [s.key, s.default]))
  const quiet = quietBlocks([], SETTINGS, values)
  expect(quiet).toContain('Loop breaker')
  expect(quiet).not.toContain('Keep session cheap')
  expect(quietBlocks([done('Caught a repeating step')], SETTINGS, values)).not.toContain('Loop breaker')
  expect(quietBlocks([], SETTINGS, { ...values, 'loop.breaker': 'off' })).not.toContain('Loop breaker')
  expect(quietBlocks([], SETTINGS, { ...values, 'cache.keeper': 'on' })).toContain('Keep session cheap')
  expect(quietBlocks([done('Kept the cache warm')], SETTINGS, { ...values, 'cache.keeper': 'on' })).not.toContain('Keep session cheap')
})

test('the week starts on Monday', () => {
  expect(weekStamp(new Date(2026, 9, 10, 12).getTime())).toBe('2026-10-05')
  expect(weekStamp(new Date(2026, 9, 11, 23, 59).getTime())).toBe('2026-10-05')
  expect(weekStamp(new Date(2026, 9, 12, 0, 1).getTime())).toBe('2026-10-12')
  expect(weekStamp(new Date(2026, 9, 5, 8).getTime())).toBe('2026-10-05')
  expect(weekStamp(new Date(2027, 0, 1, 12).getTime())).toBe('2026-12-28')
})

test('the weekly line is short enough for the band', () => {
  expect(weeklyLine(12)).toBe('This week: 12 things done for you. /vaken-today value')
  expect(weeklyLine(1)).toBe('This week: 1 thing done for you. /vaken-today value')
  expect(weeklyLine(500).length).toBeLessThanOrEqual(60)
})

test('/vaken-today value reads the audit and the ledger and counts only the window', async () => {
  const w = memIo({
    [AUDIT_KEY]: [audit('Kept the cache warm', HOUR), audit('Kept the cache warm', 2 * HOUR), audit('Held a risky command', 3 * HOUR), audit('Held a risky command', 3 * DAY_MS), audit('Held a risky command', 9 * DAY_MS)],
    [LEDGER_KEY]: [compact(4 * HOUR, 200_000, 8_000)],
  })
  const week = await valueText(w.io, '')
  expect(week).toMatch(/^Vaken did 5 things for you in 7 days\./)
  expect(week).toMatch(/Saved usage: 3 \(Kept the cache warm 2, Compacted a session 1\)/)
  expect(week).toMatch(/Kept you safe: 2 \(Held a risky command 2\)/)
  expect(week).toMatch(/Tokens freed by compacting the session 1 time: about 192k \(estimate\)\./)
  expect(week).toMatch(/Did nothing \(fine if you had no need\): .*Loop breaker/)
  const day = await valueText(w.io, 'day')
  expect(day).toMatch(/^Vaken did 4 things for you in 1 day\./)
  expect(day).not.toMatch(/Held a risky command 2/)
  expect(await valueText(memIo().io, '')).toMatch(/^Vaken wrote nothing down in 7 days\./)
  expect(week.split('\n').length).toBeLessThanOrEqual(14)
})

test('the weekly line: once a week, only from 5 actions, never when Off, and it writes only a stamp and a band line', async () => {
  const rows = Array.from({ length: 6 }, (_, n) => audit('Kept the cache warm', (n + 1) * HOUR))
  const w = memIo({ [AUDIT_KEY]: rows })
  expect(await weeklyCheck(w.io)).toBe(true)
  const band = await readBand(w.io)
  expect(band.map(b => [b.id, b.level, b.text, b.ttlMs])).toEqual([['value', 'info', 'This week: 6 things done for you. /vaken-today value', 10 * 60_000]])
  expect(w.mem.get(WEEK_KEY)).toBe('2026-10-05')
  expect(await weeklyCheck(w.io)).toBe(false)
  w.setNow(new Date(2026, 9, 12, 9).getTime())
  w.mem.set(AUDIT_KEY, rows.map(r => ({ ...r, at: r.at + DAY_MS })))
  expect(await weeklyCheck(w.io)).toBe(true)
  expect(w.mem.get(WEEK_KEY)).toBe('2026-10-12')

  const few = memIo({ [AUDIT_KEY]: rows.slice(0, 4) })
  expect(await weeklyCheck(few.io)).toBe(false)
  expect(await readBand(few.io)).toEqual([])
  expect(few.mem.get(WEEK_KEY)).toBe('2026-10-05')

  const off = memIo({ [AUDIT_KEY]: rows, 'cockpit:setting:value.weekly': 'off' })
  expect(await weeklyCheck(off.io)).toBe(false)
  expect(await readBand(off.io)).toEqual([])
  expect(off.mem.has(WEEK_KEY)).toBe(false)
})

test('a broken store never makes the weekly check throw', async () => {
  const w = memIo()
  const bad: Io = { ...w.io, get: async () => { throw new Error('store down') } }
  expect(await weeklyCheck(bad)).toBe(false)
})

// ---- the command and the hook through the engine (they exist once register.tsx calls registerValue)

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

const run = async ($: EngineInterface, args = ''): Promise<string> => ((await $.command.run(viaParent('vaken-value', args) as never)) as { text: string }).text

test('/vaken-today value answers through the engine ', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  mem.set(AUDIT_KEY, [audit('Kept the cache warm', HOUR)])
  const text = await run($)
  expect(text).toMatch(/^Vaken did 1 thing for you in 7 days\./)
  expect(text).toMatch(/not a measure of money saved/)
})
