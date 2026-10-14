// The one "allow once" of the guard and the npm answers the package check keeps.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import type { Io } from '../hooks/core/io'
import { allowCovers, allowFor, grantAllow, heldKey, noteHeld, parseAllowOnce, takeAllow, withHeld } from '../hooks/core/allowonce'
import { ALLOW_TTL_MS, allowKey, parseAllow, parsePkg, withPkg } from '../hooks/core/guard'
import { judgeTool } from '../hooks/core/guardjudge'
import type { Modes } from '../hooks/core/guardjudge'
import { NPM_CACHE_KEY, NPM_CACHE_MAX, NPM_LOOKUP_MS, NPM_MISS_MS, cachedNpm, parseNpmCache, withNpmAnswers } from '../hooks/core/guardpkg'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const SID = 'session-a'

function fake(opts: { npm?: (name: string) => Promise<{ exitCode: number; stdout: string }> } = {}): { io: Io; mem: Map<string, unknown>; clock: { now: number }; asked: string[] } {
  const mem = new Map<string, unknown>()
  const clock = { now: NOW }
  const asked: string[] = []
  const no = (): never => {
    throw new Error('not in this test')
  }
  const io: Io = {
    now: async () => clock.now,
    home: async () => '/home/user',
    sessionId: async () => SID,
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, JSON.parse(JSON.stringify(v))),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => no(),
    write: async () => no(),
    run: async argv => {
      if (argv[0] !== 'npm') return no()
      asked.push(argv[2] ?? '')
      const r = await (opts.npm ?? (async () => ({ exitCode: 0, stdout: '{"time.created":"2015-01-01T00:00:00.000Z","license":"MIT"}' })))(argv[2] ?? '')
      return { ...r, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
    },
    ask: async () => no(),
    complete: async () => no(),
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem, clock, asked }
}

test('a bound yes covers only the findings it was given; an unbound one covers the next stopped step', () => {
  const yes = { at: NOW, keys: ['destructive|a'] }
  expect(allowCovers(yes, 'call-1', ['destructive|a'], NOW)).toBe(true)
  expect(allowCovers(yes, 'call-1', ['destructive|b'], NOW)).toBe(false)
  expect(allowCovers(yes, 'call-1', ['destructive|a', 'world|x'], NOW)).toBe(false)
  expect(allowCovers({ at: NOW }, 'call-1', ['anything'], NOW)).toBe(true)
  expect(allowCovers({ ...yes, usedBy: 'call-1' }, 'call-1', ['destructive|a'], NOW)).toBe(true)
  expect(allowCovers({ ...yes, usedBy: 'call-1' }, 'call-2', ['destructive|a'], NOW)).toBe(false)
  expect(allowCovers(yes, 'call-1', ['destructive|a'], NOW + ALLOW_TTL_MS)).toBe(false)
})

test('two guard blocks holding the same call add up; another call starts a new note', () => {
  const a = withHeld(undefined, 'call-1', ['destructive|a'], 'This deletes files.', NOW)
  const b = withHeld(a, 'call-1', ['world|x'], 'This posts a message.', NOW)
  expect(b.keys).toEqual(['destructive|a', 'world|x'])
  expect(b.words).toBe('This deletes files. This posts a message.')
  expect(withHeld(b, 'call-2', ['scope|p'], 'Outside.', NOW).keys).toEqual(['scope|p'])
  expect(allowFor(b, NOW)).toEqual({ at: NOW, keys: ['destructive|a', 'world|x'] })
  expect(allowFor(b, NOW + ALLOW_TTL_MS)).toEqual({ at: NOW + ALLOW_TTL_MS })
  expect(allowFor(undefined, NOW)).toEqual({ at: NOW })
})

test('a used yes reads as no allow for the status and the inbox; an old {at} record still reads', () => {
  expect(parseAllow({ at: NOW, keys: ['a'], usedBy: 'call-1' })).toBeUndefined()
  expect(parseAllow({ at: NOW })).toEqual({ at: NOW })
  expect(parseAllowOnce({ at: NOW })).toEqual({ at: NOW })
})

test('a yes for step A does not let step B through, and A goes through once', async () => {
  const w = fake()
  await noteHeld(w.io, SID, 'call-a', ['destructive|rm a'], 'This deletes a.')
  await noteHeld(w.io, SID, 'call-b', ['destructive|rm b'], 'This deletes b.')
  expect(await grantAllow(w.io, SID)).toEqual({ set: true, bound: true, words: 'This deletes b.' })
  expect(await takeAllow(w.io, SID, 'call-a2', ['destructive|rm a'])).toBe(false)
  expect(await takeAllow(w.io, SID, 'call-b2', ['destructive|rm b'])).toBe(true)
  expect(await takeAllow(w.io, SID, 'call-b2', ['destructive|rm b'])).toBe(true)
  expect(await takeAllow(w.io, SID, 'call-b3', ['destructive|rm b'])).toBe(false)
  expect(w.mem.get(heldKey(SID))).toMatchObject({ step: 'call-b', keys: ['destructive|rm b'] })
})

test('the pane\'s yes (only bound) is for the step held last; with no step held in the last 30 minutes it sets nothing', async () => {
  const w = fake()
  expect(await grantAllow(w.io, SID, true)).toEqual({ set: false, bound: false })
  expect(w.mem.has(allowKey(SID))).toBe(false)
  await noteHeld(w.io, SID, 'call-a', ['destructive|rm a'], 'This deletes a.')
  w.clock.now += ALLOW_TTL_MS
  expect(await grantAllow(w.io, SID, true)).toEqual({ set: false, bound: false })
  expect(w.mem.has(allowKey(SID))).toBe(false)
  await noteHeld(w.io, SID, 'call-b', ['destructive|rm b'], 'This deletes b.')
  expect(await grantAllow(w.io, SID, true)).toEqual({ set: true, bound: true, words: 'This deletes b.' })
  expect(await takeAllow(w.io, SID, 'call-c', ['destructive|rm c'])).toBe(false)
  expect(await takeAllow(w.io, SID, 'call-b2', ['destructive|rm b'])).toBe(true)
})

test('two steps at the same moment cannot both use the one yes', async () => {
  const w = fake()
  await grantAllow(w.io, SID)
  const both = await Promise.all([takeAllow(w.io, SID, 'call-1', ['x|1']), takeAllow(w.io, SID, 'call-2', ['x|2'])])
  expect(both).toEqual([true, false])
})

test('a call with no id uses the yes up at once; an old yes fades and is removed', async () => {
  const w = fake()
  await grantAllow(w.io, SID)
  expect(await takeAllow(w.io, SID, undefined, ['x|1'])).toBe(true)
  expect(w.mem.has(allowKey(SID))).toBe(false)
  w.mem.set(allowKey(SID), { at: NOW - ALLOW_TTL_MS - 1 })
  expect(await takeAllow(w.io, SID, 'call-1', ['x|1'])).toBe(false)
  expect(w.mem.has(allowKey(SID))).toBe(false)
})

test('approved and warned packages are kept apart; an older plain list reads as approved', () => {
  expect(parsePkg(['a', 'b'])).toEqual({ approved: ['a', 'b'], warned: [] })
  const p = withPkg({ approved: ['a'], warned: [] }, ['b'], ['odd'])
  expect(p).toEqual({ approved: ['a', 'b'], warned: ['odd'] })
  expect(withPkg(p, ['odd'], [])).toEqual({ approved: ['a', 'b', 'odd'], warned: [] })
})

const modes: Modes = { destructive: 'off', scope: 'off', packages: 'warn', tests: 'off' }
const env = { home: '/home/user', cwd: '/home/user/app', root: '/home/user/app' }

test('an npm answer is kept a day for every session, so a retry does not ask again', async () => {
  const w = fake()
  await judgeTool(w.io, env, 'Bash', { command: 'npm install left-pad' }, modes)
  await judgeTool(w.io, env, 'Bash', { command: 'npm install left-pad' }, modes)
  expect(w.asked).toEqual(['left-pad'])
  expect(Object.keys(parseNpmCache(w.mem.get(NPM_CACHE_KEY)))).toEqual(['left-pad'])
  w.clock.now += 25 * 3_600_000
  await judgeTool(w.io, env, 'Bash', { command: 'npm install left-pad' }, modes)
  expect(w.asked).toEqual(['left-pad', 'left-pad'])
})

test('up to four names are asked side by side, not one after another', async () => {
  let running = 0
  let most = 0
  const w = fake({
    npm: async () => {
      running += 1
      most = Math.max(most, running)
      await Promise.resolve()
      await Promise.resolve()
      running -= 1
      return { exitCode: 0, stdout: '{"time.created":"2015-01-01T00:00:00.000Z"}' }
    },
  })
  await judgeTool(w.io, env, 'Bash', { command: 'npm install aa-one bb-two cc-three dd-four ee-five' }, modes)
  expect(w.asked.length).toBe(4)
  expect(most).toBe(4)
})

test('a name npm did not answer for in time is a soft warning, never a hold, and is not remembered as checked', async () => {
  const w = fake({
    npm: async () => {
      w.clock.now += NPM_LOOKUP_MS
      throw new Error('timed out')
    },
  })
  const j = await judgeTool(w.io, env, 'Bash', { command: 'npm install slow-pkg' }, { ...modes, packages: 'hold' })
  expect(j.found).toEqual([expect.objectContaining({ block: 'packages', soft: true })])
  expect(j.found[0]?.words).toMatch(/could not check slow-pkg in time/)
  expect(j.learn).toEqual([])
  const c = parseNpmCache(w.mem.get(NPM_CACHE_KEY))
  expect(cachedNpm(c, 'slow-pkg', w.clock.now)?.info).toBeNull()
  expect(cachedNpm(c, 'slow-pkg', w.clock.now + NPM_MISS_MS)).toBeUndefined()
})

test('an odd package is told as warned, not learned', async () => {
  const w = fake()
  const j = await judgeTool(w.io, env, 'Bash', { command: 'npm install axois' }, modes)
  expect(j.learn).toEqual([])
  expect(j.warned).toEqual(['axois'])
  expect(j.found[0]?.soft).toBeUndefined()
})

test('the npm cache stays bounded', () => {
  let c = parseNpmCache(undefined)
  for (let n = 0; n < NPM_CACHE_MAX + 20; n += 1) c = withNpmAnswers(c, { [`p${n}`]: { license: 'MIT' } }, NOW + n)
  expect(Object.keys(c).length).toBe(NPM_CACHE_MAX)
  expect(c[`p${NPM_CACHE_MAX + 19}`]).toBeDefined()
  expect(c.p0).toBeUndefined()
})
