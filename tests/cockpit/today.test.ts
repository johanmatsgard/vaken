// The daily recap's rule and its reading.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { EngineInterface, On } from 'claude-code'

import { readBand } from '../hooks/core/band'
import { AUDIT_KEY } from '../hooks/core/insight'
import type { AuditRow } from '../hooks/core/insight'
import type { Io } from '../hooks/core/io'
import { TODAY_SETTINGS, bandBrief, todayLines, yesterdayOf } from '../hooks/core/today'
import { DAY_KEY, dailyCheck, todayFacts, todayText } from '../hooks/features/today'
import { LEDGER_KEY } from '../hooks/features/compaction'
import { viaParent } from './viaparent'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const NOW = new Date(2026, 9, 10, 9, 0, 0).getTime()
const MIDNIGHT = new Date(2026, 9, 10, 0, 0, 0).getTime()

const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/w/${id}`, title: id, model: 'm', state: 'working', startedAt: NOW - HOUR, updatedAt: NOW - 5_000, lastEventAt: NOW - 5_000, stateSince: NOW - HOUR, ...over })
const asks = { ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - MIN } }
const audit = (what: string, at: number): AuditRow => ({ at, what, how: 'auto' })

function memIo(seed: Record<string, unknown> = {}, now = NOW) {
  const mem = new Map<string, unknown>([['cockpit:setting:today.brief', 'on'], ...Object.entries(seed)])
  const io: Io = {
    now: async () => now,
    home: async () => '',
    sessionId: async () => 'me',
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 2, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem }
}

test('the Settings row: group Care, Off or On, On by default (Recommended)', () => {
  expect(TODAY_SETTINGS.map(s => s.key)).toEqual(['today.brief'])
  expect(TODAY_SETTINGS[0]?.group).toBe('Care')
  expect(TODAY_SETTINGS[0]?.options.map(o => o.value)).toEqual(['off', 'on'])
  expect(TODAY_SETTINGS[0]?.default).toBe('on')
})

test('yesterday is the local calendar day before today', () => {
  const y = yesterdayOf(NOW)
  expect(y.day).toBe('2026-10-09')
  expect(y.to).toBe(MIDNIGHT)
  expect(y.from).toBe(new Date(2026, 9, 9, 0, 0, 0).getTime())
  expect(yesterdayOf(new Date(2026, 9, 1, 3).getTime()).day).toBe('2026-09-30')
})

test('the band line: the parts that are there, left out when zero or unknown, nothing when all are empty', () => {
  expect(bandBrief({ waiting: 2, yesterdayUsd: 4.2, didYesterday: 6 })).toBe('Today: 2 sessions wait, $4 yesterday, vaken did 6 things.')
  expect(bandBrief({ waiting: 1, yesterdayUsd: 12.6, didYesterday: 1 })).toBe('Today: 1 session waits, $13 yesterday, vaken did 1 thing.')
  expect(bandBrief({ waiting: 0, yesterdayUsd: 4.2, didYesterday: 0 })).toBe('Today: $4 yesterday.')
  expect(bandBrief({ waiting: 2, didYesterday: 0 })).toBe('Today: 2 sessions wait.')
  expect(bandBrief({ waiting: 0, didYesterday: 3 })).toBe('Today: vaken did 3 things.')
  expect(bandBrief({ waiting: 0, yesterdayUsd: 0.4, didYesterday: 0 })).toBe('Today: under $1 yesterday.')
  expect(bandBrief({ waiting: 0, yesterdayUsd: 0, didYesterday: 0 })).toBeUndefined()
  expect(bandBrief({ waiting: 0, didYesterday: 0 })).toBeUndefined()
})

test('the band line never passes 60 characters while a shorter wording exists', () => {
  for (const f of [{ waiting: 2, yesterdayUsd: 4, didYesterday: 6 }, { waiting: 12, yesterdayUsd: 123, didYesterday: 45 }, { waiting: 3, yesterdayUsd: 9.5, didYesterday: 100 }]) {
    expect(bandBrief(f)?.length).toBeLessThanOrEqual(60)
  }
})

test('/vaken-today text: 5 short lines that always answer', () => {
  const full = todayLines({ waiting: 2, yesterdayUsd: 4.123, didYesterday: 6 }, true)
  expect(full).toEqual(['Today:', '2 other sessions wait for you.', 'Yesterday cost about $4.12, as vaken counted it.', 'Vaken did 6 things yesterday. /vaken-today value shows what.', 'The line above the chat box shows this on your first prompt of a day.'])
  const empty = todayLines({ waiting: 0, didYesterday: 0 }, false)
  expect(empty).toEqual(['Today:', 'No other session waits for you.', 'Yesterday cost: not counted.', 'Vaken wrote nothing down yesterday.', 'The brief above the chat box is off. Turn it on: Settings > Prompts and memory.'])
  expect(todayLines({ waiting: 1, didYesterday: 1 }, true)[1]).toBe('1 other session waits for you.')
})

test('the facts: other sessions that need you (not this one), yesterday cost summed, yesterday actions', async () => {
  const yesterday = yesterdayOf(NOW)
  const w = memIo({
    'cockpit:session:me': rec('me', asks),
    'cockpit:session:a': rec('a', asks),
    'cockpit:session:b': rec('b', asks),
    'cockpit:session:c': rec('c'),
    [`cockpit:cost:day:${yesterday.day}:a`]: { usd: 1.5 },
    [`cockpit:cost:day:${yesterday.day}:b`]: { usd: 2.75 },
    'cockpit:cost:day:2026-10-10:a': { usd: 99 },
    'cockpit:cost:day:2026-10-08:a': { usd: 98 },
    [AUDIT_KEY]: [audit('Held a risky command', NOW - HOUR), audit('Held a risky command', yesterday.to - HOUR), audit('Kept the cache warm', yesterday.from + HOUR), audit('Kept the cache warm', yesterday.from - HOUR)],
    [LEDGER_KEY]: [{ at: yesterday.from + 2 * HOUR, what: 'compacted (auto)', before: 200_000, after: 9_000 }],
  })
  const f = await todayFacts(w.io)
  expect(f.waiting).toBe(2)
  expect(Math.round((f.yesterdayUsd ?? 0) * 100)).toBe(425)
  expect(f.didYesterday).toBe(3)
})

test('the facts: nothing known gives zero and no cost', async () => {
  expect(await todayFacts(memIo().io)).toEqual({ waiting: 0, didYesterday: 0 })
})

test('/vaken-today reads the store and always answers', async () => {
  const yesterday = yesterdayOf(NOW)
  const w = memIo({ 'cockpit:session:a': rec('a', asks), [`cockpit:cost:day:${yesterday.day}:a`]: { usd: 4 } })
  const text = await todayText(w.io)
  expect(text.split('\n').length).toBe(5)
  expect(text).toMatch(/1 other session waits for you\./)
  expect(text).toMatch(/Yesterday cost about \$4\.00/)
  expect(await todayText(memIo().io)).toMatch(/No other session waits for you\./)
})

test('the brief: first prompt of a day only, one band line, no toast, a stamp', async () => {
  const yesterday = yesterdayOf(NOW)
  const toasts: string[] = []
  const w = memIo({ 'cockpit:session:a': rec('a', asks), 'cockpit:session:b': rec('b', asks), [`cockpit:cost:day:${yesterday.day}:a`]: { usd: 4.2 }, [AUDIT_KEY]: Array.from({ length: 6 }, (_, n) => audit('Kept the cache warm', yesterday.from + (n + 1) * HOUR)) })
  const io: Io = { ...w.io, toast: t => void toasts.push(t) }
  expect(await dailyCheck(io)).toBe(true)
  const band = await readBand(io)
  expect(band.map(b => [b.id, b.level, b.text, b.ttlMs])).toEqual([['today', 'info', 'Today: 2 sessions wait, $4 yesterday, vaken did 6 things.', 10 * MIN]])
  expect(w.mem.get(DAY_KEY)).toBe('2026-10-10')
  expect(toasts).toEqual([])
  expect(await dailyCheck(io)).toBe(false)
  expect(await readBand(io)).toHaveLength(1)
})

test('the brief: nothing to say posts nothing but still takes the day, and Off does not even take the day', async () => {
  const empty = memIo()
  expect(await dailyCheck(empty.io)).toBe(false)
  expect(await readBand(empty.io)).toEqual([])
  expect(empty.mem.get(DAY_KEY)).toBe('2026-10-10')

  const off = memIo({ 'cockpit:session:a': rec('a', asks), 'cockpit:setting:today.brief': 'off' })
  expect(await dailyCheck(off.io)).toBe(false)
  expect(await readBand(off.io)).toEqual([])
  expect(off.mem.has(DAY_KEY)).toBe(false)
  expect(await todayText(off.io)).toMatch(/1 other session waits for you\./)
})

test('a new day gives a new brief', async () => {
  const w = memIo({ 'cockpit:session:a': rec('a', asks), [DAY_KEY]: '2026-10-09' })
  expect(await dailyCheck(w.io)).toBe(true)
  expect(w.mem.get(DAY_KEY)).toBe('2026-10-10')
})

test('a broken store never makes the brief throw', async () => {
  const w = memIo()
  const bad: Io = { ...w.io, keys: async () => { throw new Error('store down') } }
  expect(await dailyCheck(bad)).toBe(false)
})

// ---- the command through the engine (it exists once register.tsx calls registerToday)

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

const run = async ($: EngineInterface): Promise<string> => ((await $.command.run(viaParent('vaken-today', '') as never)) as { text: string }).text

test('/vaken-today answers through the engine ', async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('process.run', () => ({ value: { exitCode: 2, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  const text = await run($)
  expect(text.split('\n').length).toBe(5)
  expect(text).toMatch(/No other session waits for you\./)
})
