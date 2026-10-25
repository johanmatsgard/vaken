// Cockpit health: the counts, the warning in the band, the helper other blocks call, and /cockpit-help run modhealth.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { readBand } from '../hooks/core/band'
import { HEALTH_HELP, HEALTH_KEY, HEALTH_MODE_KEY, HEALTH_SETTINGS, KEEP_DAYS, SLOW_MS, WARN_AT, areaWords, dayOf, healthText, noteFailure, noteSlow, parseCounts, slowestArea, timed, withFailure, withSlow } from '../hooks/core/health'
import type { Io } from '../hooks/core/io'
import { byEnglish } from '../hooks/i18n/table'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime()
const DAY = 86_400_000

// An Io over a map: the store and a clock, nothing else.
function memIo(now = NOW): { io: Io; mem: Map<string, unknown>; clock: { now: number } } {
  const mem = new Map<string, unknown>()
  const clock = { now }
  const no = (): never => {
    throw new Error('not in this test')
  }
  const io: Io = {
    now: async () => clock.now,
    home: async () => '/home/user',
    sessionId: async () => 'session-a',
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, v),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => no(),
    write: async () => no(),
    run: async () => no(),
    ask: async () => no(),
    complete: async () => no(),
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem, clock }
}

test('the Settings row sits in group Health and defaults to On', () => {
  expect(HEALTH_SETTINGS.map(s => s.key)).toEqual(['modhealth.mode'])
  expect(HEALTH_SETTINGS[0].group).toBe('Health')
  expect(HEALTH_SETTINGS[0].default).toBe('on')
  expect(HEALTH_MODE_KEY).toBe('cockpit:setting:modhealth.mode')
})

test('a failure is counted per area per day, with its kind', () => {
  const a = withFailure({}, NOW, 'guard', 'throw')
  const b = withFailure(a.counts, NOW, 'guard', 'timeout')
  const c = withFailure(b.counts, NOW, 'undo', 'throw')
  expect(c.failed).toBe(1)
  expect(b.failed).toBe(2)
  expect(c.counts[dayOf(NOW)].guard).toEqual({ failed: 2, slow: 0, slowMs: 0, maxMs: 0, kinds: { throw: 1, timeout: 1 } })
  expect(c.counts[dayOf(NOW)].undo.failed).toBe(1)
  expect(withFailure(c.counts, NOW + DAY, 'guard', 'throw').counts[dayOf(NOW + DAY)].guard.failed).toBe(1)
})

test('a step under the slow line changes nothing; a slow one is counted with its time', () => {
  expect(withSlow({}, NOW, 'guard', SLOW_MS - 1)).toEqual({})
  expect(withSlow({}, NOW, 'guard', Number.NaN)).toEqual({})
  const one = withSlow({}, NOW, 'guard', 2000)
  const two = withSlow(one, NOW, 'guard', 4000)
  expect(two[dayOf(NOW)].guard).toMatchObject({ slow: 2, slowMs: 6000, maxMs: 4000 })
})

test('only the newest days are kept, and a bad store value is read as empty', () => {
  let counts = {}
  for (let d = 0; d < KEEP_DAYS + 3; d += 1) counts = withFailure(counts, NOW + d * DAY, 'guard', 'throw').counts
  expect(Object.keys(counts).length).toBe(KEEP_DAYS)
  expect(Object.keys(counts)).not.toContain(dayOf(NOW))
  expect(parseCounts('nonsense')).toEqual({})
  expect(parseCounts({ 'not-a-day': { a: {} }, [dayOf(NOW)]: { 'x y': { failed: -5, slow: 'many', kinds: { 'a b': 2 } } } })).toEqual({ [dayOf(NOW)]: { 'x-y': { failed: 0, slow: 0, slowMs: 0, maxMs: 0, kinds: { 'a-b': 2 } } } })
})

test('noteFailure keeps counts in the store and warns in the band at the third failure', async () => {
  const { io, mem } = memIo()
  expect(await noteFailure(io, 'guard', 'throw')).toBe(1)
  expect(await noteFailure(io, 'guard', 'throw')).toBe(2)
  expect(await readBand(io)).toEqual([])
  expect(await noteFailure(io, 'guard', 'timeout')).toBe(WARN_AT)
  const band = await readBand(io)
  expect(band.length).toBe(1)
  expect(band[0]).toMatchObject({ level: 'warn', id: 'health:guard' })
  expect(band[0].text).toBe('The safety check failed 3 times today')
  expect(await noteFailure(io, 'guard', 'throw')).toBe(4)
  expect((await readBand(io)).length).toBe(1)
  expect(JSON.stringify(mem.get(HEALTH_KEY))).not.toMatch(/Error|message/)
})

test('notes made at the same moment are all kept', async () => {
  const { io } = memIo()
  await Promise.all([noteFailure(io, 'undo', 'throw'), noteFailure(io, 'undo', 'throw'), noteFailure(io, 'undo', 'throw'), noteSlow(io, 'undo', 3000), noteFailure(io, 'guard', 'throw')])
  const counts = parseCounts(await io.get(HEALTH_KEY))
  expect(counts[dayOf(NOW)].undo).toMatchObject({ failed: 3, slow: 1 })
  expect(counts[dayOf(NOW)].guard.failed).toBe(1)
})

test('Off counts nothing and never throws; a broken store does not break the caller', async () => {
  const { io, mem } = memIo()
  mem.set(HEALTH_MODE_KEY, 'off')
  expect(await noteFailure(io, 'guard', 'throw')).toBe(0)
  expect(await noteSlow(io, 'guard', 9000)).toBe(false)
  expect(mem.has(HEALTH_KEY)).toBe(false)
  mem.delete(HEALTH_MODE_KEY)
  const broken: Io = { ...io, get: async () => Promise.reject(new Error('store down')) }
  expect(await noteFailure(broken, 'guard', 'throw')).toBe(0)
  expect(await noteSlow(broken, 'guard', 9000)).toBe(false)
})

test('noteSlow counts only a slow step', async () => {
  const { io } = memIo()
  expect(await noteSlow(io, 'trust', 100)).toBe(false)
  expect(await noteSlow(io, 'trust', 1800)).toBe(true)
  expect(slowestArea(parseCounts(await io.get(HEALTH_KEY)), NOW)).toEqual({ area: 'trust', maxMs: 1800, slow: 1 })
})

test('timed notes a slow step, notes and rethrows a failure', async () => {
  const { io, clock } = memIo()
  expect(await timed(io, 'undo', async () => 7)).toBe(7)
  expect(await timed(io, 'undo', async () => ((clock.now += 5000), 8))).toBe(8)
  let thrown = ''
  try {
    await timed(io, 'undo', async () => Promise.reject(new Error('boom')))
  } catch (e) {
    thrown = (e as Error).message
  }
  expect(thrown).toBe('boom')
  expect(parseCounts(await io.get(HEALTH_KEY))[dayOf(clock.now)].undo).toMatchObject({ failed: 1, slow: 1, maxMs: 5000 })
})

test('the slowest area is the one with the slowest single step today', () => {
  let c = withSlow({}, NOW, 'guard', 2000)
  c = withSlow(c, NOW, 'undo', 9000)
  c = withSlow(c, NOW, 'trust', 3000)
  c = withSlow(c, NOW - DAY, 'guard', 60000)
  expect(slowestArea(c, NOW)?.area).toBe('undo')
  expect(slowestArea({}, NOW)).toBeUndefined()
})

test('the text says counts per area, the slowest, earlier days, load problems and what is not knowable', () => {
  let c = withFailure({}, NOW, 'guard', 'throw').counts
  for (let n = 0; n < 2; n += 1) c = withFailure(c, NOW, 'guard', 'throw').counts
  c = withSlow(c, NOW, 'undo', 2500)
  c = withFailure(c, NOW - DAY, 'trust', 'throw').counts
  const text = healthText('on', c, NOW, { problems: ['bad-plugin: managed only'] })
  expect(text).toMatch(/Vaken health: on/)
  expect(text).toMatch(/guard: failed 3 times \(throw 3\)\s+<- warning in the band/)
  expect(text).toMatch(/undo: 1 slow step, slowest 2\.5 s/)
  expect(text).toMatch(/Slowest: undo/)
  expect(text).toMatch(/Earlier days:\n\s+\d{4}-\d{2}-\d{2}: 1 failure/)
  expect(text).toMatch(/refused at load \(this session\):\n\s+bad-plugin: managed only/)
  expect(text).toMatch(/Not knowable from here/)
  expect(healthText('on', {}, NOW, { problems: [] })).toMatch(/no failure and no slow step/)
  expect(healthText('off', {}, NOW, { problems: [] })).toMatch(/Vaken health: off/)
  expect(areaWords('guard')).toBe('The safety check')
  expect(areaWords('zzz')).toBe('The "zzz" part')
})

// ---- the command, in the engine (needs registerTrust in register.tsx)

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

const text = async ($: EngineInterface, command: string, args = ''): Promise<string> => ((await $.command.run(viaParent(command, args))) as { text: string }).text

test('/vaken-help run modhealth shows the counts the store holds', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'session-a' }))
  expect(await text($, 'vaken-modhealth')).toMatch(/no failure and no slow step/)
  mem.set(HEALTH_KEY, withFailure(withFailure({}, NOW, 'undo', 'throw').counts, NOW, 'undo', 'timeout').counts)
  const shown = await text($, 'vaken-modhealth')
  expect(shown).toMatch(/undo: failed 2 times \(throw 1, timeout 1\)/)
  mem.set(HEALTH_MODE_KEY, 'off')
  expect(await text($, 'vaken-modhealth')).toMatch(/Vaken health: off/)
})

test('the help says vaken reads the public status.claude.com page, in at most 3 sentences, with a Swedish row', () => {
  const text = HEALTH_HELP[0].text
  expect(text).toContain('status.claude.com')
  expect(text.split(/(?<=[.!?])\s+(?=[A-Z/])/).length).toBeLessThanOrEqual(3)
  expect(byEnglish('sv')[text]).toContain('status.claude.com')
})
