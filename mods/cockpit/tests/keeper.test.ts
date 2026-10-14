// The store keeper, the safe shared writes and the removal of undo copy files.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import type { Io } from '../hooks/core/io'
import { DAY_KEY, DAY_MS, END_FAMILIES, ENDED_KEY, KEPT_FAMILIES, endKeys, familyOf, fullToast, isLegacy, localDay, planSweep, stampOf, withEnded } from '../hooks/core/keeper'
import type { SweepFacts } from '../hooks/core/keeper'
import { serialUpdate } from '../hooks/core/serial'
import { memSafeFs, mockSafeFs } from './safefs'
import { posix } from './fspath'
import { copyPath, indexKey, isCopyFile, markKey, namedKey, pendingKey, removeCopies, shrinkIndex } from '../hooks/core/undo'
import type { Index } from '../hooks/core/undo'
import { allowKey, haltKey, pkgKey, scopeKey } from '../hooks/core/guard'
import { heldKey } from '../hooks/core/allowonce'
import { envNotedKey, fenceKey } from '../hooks/core/guardback'
import { commandsKey } from '../hooks/core/guardcmds'
import { outboxKey } from '../hooks/core/guardworld'
import { steerKey } from '../hooks/core/inbox'
import { stampKey } from '../hooks/core/neighbors'
import { claimsKey } from '../hooks/core/crew'
import { bandKey } from '../hooks/core/band'
import { diffKey } from '../hooks/core/compactdiff'
import { REST_KEY } from '../hooks/core/compactrest'
import { storeKey as assumeKey } from '../hooks/core/assumptions'
import { failedKey, lastKey as errorKey } from '../hooks/core/errors'
import { freshKey } from '../hooks/core/freshstart'
import { planKey } from '../hooks/core/planfirst'
import { lastKey as promptKey } from '../hooks/core/promptcheck'
import { rulesKey } from '../hooks/core/rules'
import { waitKey, countKey } from '../hooks/core/resume'
import { stateKey } from '../hooks/core/proof'
import { state2Key } from '../hooks/core/proof2'
import { ORCH_KEY } from '../hooks/core/orchestra'
import { PROJECT_OF_KEY } from '../hooks/core/io'
import { sweep } from '../hooks/features/keeper'
import { SLOW, test } from './slow'

const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime()
const S1 = '11111111-2222-4333-8444-555555555555'
const S2 = '66666666-7777-4888-9999-aaaaaaaaaaaa'
const ME = 'eeeeeeee-ffff-4000-8000-000000000000'

test('every per-session key a block writes belongs to a family the keeper knows', () => {
  const end = [allowKey, haltKey, pkgKey, scopeKey, heldKey, envNotedKey, fenceKey, commandsKey, outboxKey, steerKey, stampKey, claimsKey, bandKey, diffKey, REST_KEY, assumeKey, errorKey, freshKey, planKey, promptKey, rulesKey, waitKey, PROJECT_OF_KEY, pendingKey, markKey, failedKey]
  for (const k of end) expect(familyOf(k(S1)), k(S1)).toEqual({ family: k(S1).slice(0, -S1.length), sid: S1 })
  for (const k of end) expect(END_FAMILIES).toContain(k(S1).slice(0, -S1.length))
  for (const k of [stateKey, state2Key, indexKey, namedKey, ORCH_KEY]) expect(KEPT_FAMILIES[k(S1).slice(0, -S1.length)], k(S1)).toBeGreaterThan(0)
  for (const k of ['cockpit:pr:state:', 'cockpit:outcomes:last:', 'cockpit:happened:', 'cockpit:agents:']) expect(familyOf(k + S1)?.sid).toBe(S1)
  // A day count is not a session note, and settings never are.
  expect(familyOf(countKey('2026-10-10'))).toBeUndefined()
  expect(familyOf(`cockpit:setting:${S1}`)).toBeUndefined()
})

test('at the end, only the notes of that session go, and only END families', () => {
  const keys = [allowKey(S1), commandsKey(S1), commandsKey(S2), stateKey(S1), indexKey(S1), 'cockpit:ledger:compact', `cockpit:session:${S1}`]
  expect(endKeys(keys, S1).sort()).toEqual([allowKey(S1), commandsKey(S1)].sort())
})

test('the first vaken\'s keys are old; the present keys that look like them are not', () => {
  for (const k of [`cockpit:spend:${S1}`, `cockpit:shots:${S1}`, 'cockpit:room:items', `cockpit:ctx:track:${S1}`, `cockpit:plain:totals:${S1}`, 'cockpit:laptop', 'cockpit:laptop:level', `cockpit:held:abc`, 'cockpit:gate:cost', 'cockpit:pr:default', `cockpit:scope:${S1}`]) expect(isLegacy(k), k).toBe(true)
  for (const k of ['cockpit:plain', 'cockpit:laptop:v2', `cockpit:claims:${S1}`, `cockpit:guard:held:${S1}`, `cockpit:guard:scope:${S1}`, 'cockpit:pr:main', 'cockpit:pr:durations', `cockpit:pr:state:${S1}`, 'cockpit:route:stats', 'cockpit:trust:changes', 'cockpit:diet:told', 'cockpit:health', 'cockpit:health:counts', 'cockpit:awake:pid']) expect(isLegacy(k), k).toBe(false)
})

test('a day stamp is read from a date part or a resume day in ms', () => {
  expect(stampOf('cockpit:cost:day:2026-10-01:abc')).toBe(new Date(2026, 9, 1).getTime())
  expect(stampOf('cockpit:judge:2026-09-20')).toBe(new Date(2026, 8, 20).getTime())
  expect(stampOf(`cockpit:resume:count:${new Date(2026, 9, 1).getTime()}`)).toBe(new Date(2026, 9, 1).getTime())
  expect(stampOf('cockpit:ledger:compact')).toBeUndefined()
  expect(localDay(NOW)).toBe('2026-10-10')
})

const facts = (over: Partial<SweepFacts> = {}): SweepFacts => ({ now: NOW, live: new Set([ME]), ended: {}, eyesAt: new Map(), records: new Map(), ...over })

test('the sweep: notes of ended sessions go, live ones stay, kept ones wait their days', () => {
  const keys = [commandsKey(S1), commandsKey(ME), stateKey(S1), indexKey(S1), indexKey(S2), `cockpit:setting:detail`, 'cockpit:audit', 'cockpit:ledger:compact', `cockpit:spend:${S1}`]
  const p = planSweep(keys, facts({ ended: { [S1]: NOW - 2 * DAY_MS } }))
  expect(p.remove.sort()).toEqual([commandsKey(S1), stateKey(S1), `cockpit:spend:${S1}`].sort())
  expect(p.ended[S2]).toBe(NOW)
  expect(planSweep(keys, facts({ ended: { [S1]: NOW - 8 * DAY_MS } })).remove).toContain(indexKey(S1))
})

test('the sweep in a full store does not wait: every note of a session that is not live goes', () => {
  const keys = [stateKey(S1), indexKey(S2), indexKey(ME)]
  expect(planSweep(keys, facts({ full: true })).remove.sort()).toEqual([stateKey(S1), indexKey(S2)].sort())
})

test('the sweep: old day stamps, old picture hashes and gone session records', () => {
  const old = `cockpit:cost:day:${localDay(NOW - 20 * DAY_MS)}:${S1}`
  const fresh = `cockpit:cost:day:${localDay(NOW - 2 * DAY_MS)}:${S1}`
  const eyesOld = 'cockpit:eyes:last:/w|home|390'
  const eyesNew = 'cockpit:eyes:last:/w|home|1280'
  const keys = [old, fresh, countKey(String(NOW - 30 * DAY_MS)), eyesOld, eyesNew, `cockpit:session:${S1}`, `cockpit:session:${S2}`]
  const p = planSweep(keys, facts({ live: new Set([ME, S2]), eyesAt: new Map([[eyesOld, NOW - 8 * DAY_MS], [eyesNew, NOW - DAY_MS]]), records: new Map([[S1, NOW - 8 * DAY_MS], [S2, NOW]]) }))
  expect(p.remove.sort()).toEqual([old, countKey(String(NOW - 30 * DAY_MS)), eyesOld, `cockpit:session:${S1}`].sort())
})

test('the end list stays bounded and drops ends older than the longest keep', () => {
  let e = withEnded({}, S1, NOW - 30 * DAY_MS)
  e = withEnded(e, S2, NOW)
  expect(Object.keys(e)).toEqual([S2])
  for (let n = 0; n < 400; n += 1) e = withEnded(e, `s${n}`, NOW + n)
  expect(Object.keys(e).length).toBe(300)
})

function fakeIo(mem: Map<string, unknown>, opts: { now?: number; me?: string; runs?: string[][]; files?: Map<string, string> } = {}): Io {
  const no = (): never => {
    throw new Error('not in this test')
  }
  return {
    now: async () => opts.now ?? NOW,
    home: async () => '/home/user',
    sessionId: async () => opts.me ?? ME,
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, v),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => no(),
    write: async (p, t) => void opts.files?.set(p, t),
    run: async argv => {
      opts.runs?.push([...argv])
      if (argv[0] === 'rm') for (const p of argv.slice(3)) opts.files?.delete(p)
      return { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
    },
    ask: async () => no(),
    complete: async () => no(),
    toast: () => undefined,
    invalidate: () => undefined,
  }
}

const idxOf = (ids: number[]): Index => ({ next: Math.max(0, ...ids) + 1, snaps: ids.map(id => ({ id, path: `/w/f${id}.ts`, at: NOW, tool: 'Edit', kind: 'saved' as const, hash: 'h', bytes: 10, lines: 1 })) })

test('a sweep removes an old undo list with its copy files, by exact path, and the empty folder', async () => {
  const mem = new Map<string, unknown>([
    [indexKey(S1), idxOf([1, 2])],
    [ENDED_KEY, { [S1]: NOW - 8 * DAY_MS }],
    [commandsKey(S2), []],
    [`cockpit:session:${ME}`, { sessionId: ME, updatedAt: NOW }],
  ])
  const runs: string[][] = []
  const n = await sweep(fakeIo(mem, { runs }), false)
  expect(n).toBe(2)
  expect(mem.has(indexKey(S1))).toBe(false)
  expect(mem.has(commandsKey(S2))).toBe(false)
  expect(runs[0]).toEqual(['rm', '-f', '--', copyPath('/home/user', S1, 1), copyPath('/home/user', S1, 2)])
  expect(runs[1]).toEqual(['rmdir', '--', `/home/user/.claude/cockpit/checkpoints/${S1}`])
  expect(mem.has(`cockpit:session:${ME}`)).toBe(true)
})

test('only a copy file inside the checkpoints folder may be removed', () => {
  const H = '/home/user'
  expect(isCopyFile(H, copyPath(H, 'session-a', 3))).toBe(true)
  for (const p of [
    `${H}/.claude/cockpit/checkpoints/session-a/../../../x.txt`,
    `${H}/.claude/cockpit/checkpoints/session-a/3.txt.bak`,
    `${H}/.claude/cockpit/checkpoints/3.txt`,
    `${H}/.claude/cockpit/checkpoints/a/b/3.txt`,
    `${H}/.claude/cockpit/checkpoints/session-a/0.txt`,
    `${H}/.claude/cockpit/checkpoints/session-a/x.txt`,
    `${H}/.claude/cockpit/checkpoints//3.txt`,
    `${H}/app/3.txt`,
    '/etc/passwd',
  ])
    expect(isCopyFile(H, p), p).toBe(false)
  expect(isCopyFile('', '/.claude/cockpit/checkpoints/a/1.txt')).toBe(false)
  expect(isCopyFile('relative', 'relative/.claude/cockpit/checkpoints/a/1.txt')).toBe(false)
  expect(isCopyFile(H, copyPath(H, '../../etc', 1))).toBe(true)
  expect(copyPath(H, '../../etc', 1)).toBe(`${H}/.claude/cockpit/checkpoints/______etc/1.txt`)
})

test('removing copies runs rm on the exact files only; with no home nothing runs', async () => {
  const runs: string[][] = []
  const files = new Map([[copyPath('/home/user', S1, 4), 'x']])
  await removeCopies(fakeIo(new Map(), { runs, files }), '/home/user', S1, [4])
  expect(runs).toEqual([['rm', '-f', '--', copyPath('/home/user', S1, 4)]])
  expect(files.size).toBe(0)
  const none: string[][] = []
  await removeCopies(fakeIo(new Map(), { runs: none }), '', S1, [4])
  expect(none).toEqual([])
})

test('after the end the undo list keeps its newest copies and those a named checkpoint uses', () => {
  const idx = idxOf(Array.from({ length: 30 }, (_, k) => k + 1))
  const cut = shrinkIndex(idx, [{ name: 'before', at: NOW, items: [{ path: '/w/f2.ts', snap: 2 }] }])
  expect(cut.idx.snaps.map(s => s.id)).toEqual([2, ...Array.from({ length: 20 }, (_, k) => k + 11)])
  expect(cut.gone).toEqual([1, ...Array.from({ length: 8 }, (_, k) => k + 3)])
})

test('two writers in one process at the same moment both land', async () => {
  const mem = new Map<string, unknown>()
  const io = fakeIo(mem)
  await Promise.all([1, 2, 3, 4, 5].map(n => serialUpdate(io, 'k', old => [...(Array.isArray(old) ? old : []), n])))
  expect((mem.get('k') as number[]).sort()).toEqual([1, 2, 3, 4, 5])
})

test('a line another session wrote over is added again on the read after the write', async () => {
  const mem = new Map<string, unknown>([['k', ['a']]])
  const base = fakeIo(mem)
  let first = true
  const io: Io = {
    ...base,
    set: async (k, v) => {
      mem.set(k, v)
      if (first) {
        first = false
        mem.set(k, ['other', 'a'])
      }
    },
  }
  await serialUpdate(io, 'k', old => ['mine', ...(old as string[])], stored => (stored as string[]).includes('mine'))
  expect(mem.get('k')).toEqual(['mine', 'other', 'a'])
})

function engine(on: On, opts: { failSets?: number; rmFails?: boolean } = {}): { mem: Map<string, unknown>; toasts: string[]; fails: { left: number } } {
  mock.clock(on, { now: NOW })
  const mem = new Map<string, unknown>()
  const fails = { left: opts.failSets ?? 0 }
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    if (fails.left > 0) {
      fails.left -= 1
      return Promise.reject(new Error('store over 4 MiB')) as never
    }
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  mock.session(on)
  mock.env(on, { HOME: '/home/user' })
  on('session.id', () => ({ value: ME }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/w' }))
  on('session.root', () => ({ value: '/w' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('process.run', () => ({ value: { exitCode: opts.rmFails === true ? 1 : 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)
    return { value: undefined } as never
  })
  return { mem, toasts, fails }
}

test('a session that ends takes its END notes with it and notes its end; other sessions keep theirs', SLOW, async ($: EngineInterface, on: On) => {
  const w = engine(on)
  for (const k of [commandsKey(S1), allowKey(S1), stateKey(S1), commandsKey(S2)]) w.mem.set(k, [])
  await $.session.end({ reason: 'other', sessionId: S1 } as never)
  expect(w.mem.has(commandsKey(S1))).toBe(false)
  expect(w.mem.has(allowKey(S1))).toBe(false)
  expect(w.mem.has(stateKey(S1))).toBe(true)
  expect(w.mem.has(commandsKey(S2))).toBe(true)
  expect((w.mem.get(ENDED_KEY) as Record<string, number>)[S1]).toBe(NOW)
})

test('the first start of the day marks the day; a later start that day does not sweep again', async ($: EngineInterface, on: On) => {
  const w = engine(on)
  await $.session.start({ cwd: '/w', source: 'startup' } as never)
  expect(w.mem.get(DAY_KEY)).toBe(localDay(NOW))
})

test('a write that fails because the store is full sweeps, writes again, and says so once', async ($: EngineInterface, on: On) => {
  const w = engine(on)
  w.mem.set(`cockpit:spend:${S1}`, { big: 'x' })
  w.mem.set(commandsKey(S2), [])
  w.fails.left = 1
  await $.session.end({ reason: 'other', sessionId: S2 } as never)
  expect(w.mem.has(`cockpit:spend:${S1}`)).toBe(false)
  expect(w.mem.has(ENDED_KEY)).toBe(true)
  expect(w.toasts.filter(t => t === fullToast(1) || /saved data was full/.test(t)).length).toBe(1)
})

test('the sweep never removes the settings and prefs bundles or the records stamp, even when the store is full', () => {
  const keys = ['cockpit:settings:v1', 'cockpit:prefs:v1', 'cockpit:records:stamp', 'cockpit:setting:arrange', 'cockpit:pref:lists']
  const facts: SweepFacts = { now: Date.parse('2026-10-10T12:00:00Z'), live: new Set(), ended: {}, eyesAt: new Map(), records: new Map(), full: true }
  expect(planSweep(keys, facts).remove).toEqual([])
})

test('when rm fails at session end, the old undo copies are emptied by the safe fallback', SLOW, async ($: EngineInterface, on: On) => {
  const w = engine(on, { rmFails: true })
  const snaps = Array.from({ length: 25 }, (_, k) => ({ id: k + 1, path: '/w/a.ts', at: NOW, tool: 'Edit', kind: 'saved', hash: 'h', bytes: 1, lines: 1 }))
  w.mem.set(indexKey(S1), { next: 26, snaps })
  const home = '/home/user'
  // Files in memory; rm fails; the engine's stat and list answer from them.
  const files = new Map<string, string>(snaps.map(s => [copyPath(home, S1, s.id), 'old text']))
  on('fs.write', (_$, e) => {
    files.set(posix(e.path), e.text)
    return { value: undefined } as never
  })
  const safe = memSafeFs(() => files.keys())
  mockSafeFs(on, safe)
  await $.session.end({ reason: 'other', sessionId: S1 } as never)
  for (let id = 1; id <= 5; id += 1) expect(files.get(copyPath(home, S1, id))).toBe('')
  expect(files.get(copyPath(home, S1, 6))).toBe('old text')
})
