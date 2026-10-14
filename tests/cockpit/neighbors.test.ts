// Same-folder awareness.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import type { BandItem } from '../hooks/core/band'
import type { Io } from '../hooks/core/io'
import { NEIGHBORS_BAND_TEXT, NEIGHBORS_EVERY_MS, NEIGHBORS_HELP, NEIGHBORS_SETTINGS, NEIGHBORS_TTL_MS, NEIGHBORS_WHAT, ledgerDetail, neighborsOf, neighborsText, samePlace, stampKey, verdict } from '../hooks/core/neighbors'
import type { Candidate } from '../hooks/core/neighbors'
import { findNeighbors, neighborsCheck } from '../hooks/features/neighbors'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

test('the Settings row: group Crew, Off or On, On by default (Recommended)', () => {
  expect(NEIGHBORS_SETTINGS.map(s => s.key)).toEqual(['neighbors.warn'])
  expect(NEIGHBORS_SETTINGS[0]?.group).toBe('Crew')
  expect(NEIGHBORS_SETTINGS[0]?.options.map(o => o.value)).toEqual(['off', 'on'])
  expect(NEIGHBORS_SETTINGS[0]?.default).toBe('on')
})

test('the help says how it differs from file overlap', () => {
  const all = NEIGHBORS_HELP.map(h => h.text).join(' ')
  expect(all).toMatch(/File overlap warns about one file/)
  expect(all).toMatch(/whole folder/)
  expect(all).toMatch(/Claude is not told/)
})

test('the same folder, or the same git worktree root, is one place; two worktrees of one repository are two', () => {
  expect(samePlace({ cwd: '/w/a' }, { cwd: '/w/a' })).toBe(true)
  expect(samePlace({ cwd: '/w/a/' }, { cwd: '/w/a' })).toBe(true)
  expect(samePlace({ cwd: '/w/a' }, { cwd: '/w/b' })).toBe(false)
  expect(samePlace({ cwd: '/w/a', top: '/w/a' }, { cwd: '/w/a/src', top: '/w/a' })).toBe(true)
  expect(samePlace({ cwd: '/w/a', top: '/w/a' }, { cwd: '/w/a/.wt/x', top: '/w/a/.wt/x' })).toBe(false)
  expect(samePlace({ cwd: '/w/a', top: '/w/a' }, { cwd: '/w/a/src' })).toBe(false)
  expect(samePlace({ cwd: '' }, { cwd: '' })).toBe(false)
})

const cand = (id: string, over: Partial<Candidate> = {}): Candidate => ({ sessionId: id, name: id, kind: 'working', place: { cwd: '/w/a', top: '/w/a' }, ...over })

test('the neighbours are the other live sessions in this place, in order; this session, a closed one and one elsewhere are left out', () => {
  const here = { cwd: '/w/a', top: '/w/a' }
  const list = [cand('me'), cand('a', { kind: 'waiting' }), cand('b', { kind: 'gone' }), cand('c', { place: { cwd: '/w/c', top: '/w/c' } }), cand('d', { kind: 'needs', place: { cwd: '/w/a/src', top: '/w/a' } }), cand('e', { kind: 'idle' })]
  expect(neighborsOf('me', here, list)).toEqual([
    { name: 'a', state: 'waiting' },
    { name: 'd', state: 'needs' },
    { name: 'e', state: 'idle' },
  ])
  expect(neighborsOf('me', here, [])).toEqual([])
})

test('the verdict: off clears; nobody clears; a neighbour posts once, then waits 10 minutes', () => {
  expect(verdict('off', 2, undefined, NOW)).toBe('off')
  expect(verdict('on', 0, NOW - MIN, NOW)).toBe('clear')
  expect(verdict('on', 1, undefined, NOW)).toBe('post')
  expect(verdict('on', 1, NOW - MIN, NOW)).toBe('quiet')
  expect(verdict('on', 1, NOW - NEIGHBORS_EVERY_MS + 1, NOW)).toBe('quiet')
  expect(verdict('on', 1, NOW - NEIGHBORS_EVERY_MS, NOW)).toBe('post')
  expect(verdict('on', 1, NOW + MIN, NOW)).toBe('post')
})

test('/vaken neighbors lists the neighbours by name and state, or says there are none', () => {
  const some = neighborsText('on', [{ name: 'Fix login', state: 'working' }, { name: 'Docs', state: 'waiting' }, { name: 'Billing', state: 'needs' }, { name: 'Old', state: 'idle' }], true)
  expect(some).toMatch(/^Same-folder awareness: on\./)
  expect(some).toMatch(/File overlap \(\/vaken-help run claims\) warns about one file; this warns about the folder\./)
  expect(some).toMatch(/4 other sessions work in this folder:\n {2}Fix login: is working\n {2}Docs: finished its turn and waits for you\n {2}Billing: waits for an answer or an OK\n {2}Old: is idle$/)
  expect(neighborsText('on', [{ name: 'Fix login', state: 'working' }], true)).toMatch(/Another session works in this folder:\n {2}Fix login: is working$/)
  expect(neighborsText('on', [], true)).toMatch(/No other live session works in this folder\.$/)
  expect(neighborsText('off', [], true)).toMatch(/Same-folder awareness: off\.[\s\S]*Turn it on: Settings > Agents\./)
  expect(neighborsText('on', [], false)).toMatch(/does not know the folder/)
  expect(NEIGHBORS_BAND_TEXT).toBe('Another session is in this folder.')
  expect(ledgerDetail(1)).toBe('1 other session works in this folder. Claude was not told.')
  expect(ledgerDetail(3)).toBe('3 other sessions work in this folder. Claude was not told.')
})

type Rec = Record<string, unknown>
const rec = (id: string, cwd: string, over: Rec = {}): Rec => ({ sessionId: id, cwd, model: 'm', state: 'working', title: id, startedAt: NOW - 30 * MIN, updatedAt: NOW - 5_000, lastEventAt: NOW - 5_000, stateSince: NOW - 30 * MIN, ...over })

let n = 0
function world(roots: Record<string, string | undefined>, seed: Record<string, unknown> = {}) {
  n += 1
  const t = { now: NOW }
  const mem = new Map<string, unknown>([['cockpit:setting:neighbors.warn', 'on'], ...Object.entries(seed)])
  const asked: string[] = []
  const i: Io = {
    now: async () => t.now,
    home: async () => '/home/user',
    sessionId: async () => 'me',
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: (async (argv: readonly string[], init?: { cwd?: string }) => {
      if (argv[0] === 'git') {
        asked.push(init?.cwd ?? '')
        const top = roots[init?.cwd ?? '']
        return top === undefined ? { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository', isStdoutTruncated: false, isStderrTruncated: false } : { exitCode: 0, stdout: `${top}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
      }
      return { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
    }) as Io['run'],
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  const band = (): BandItem[] => ((mem.get('cockpit:band:me') ?? []) as BandItem[]).filter(b => b.id === 'neighbors')
  const whats = (): string[] => ((mem.get('cockpit:ledger:compact') as Array<{ what: string }> | undefined) ?? []).map(l => l.what)
  return { t, mem, i, band, whats, asked, dir: (name: string) => `/t${n}/${name}` }
}

test('a live session in the same folder: one warn line "Another session is in this folder." with a 10 minute life, a ledger line, and a time in the store', async () => {
  const w = world({})
  const a = w.dir('a')
  w.mem.set('cockpit:session:me', rec('me', a))
  w.mem.set('cockpit:session:x', rec('x', a, { title: 'Fix login' }))
  expect(await neighborsCheck(w.i, a)).toBe('post')
  expect(w.band()).toEqual([{ id: 'neighbors', level: 'warn', text: 'Another session is in this folder.', at: NOW, ttlMs: NEIGHBORS_TTL_MS }])
  expect(w.whats()).toContain(NEIGHBORS_WHAT)
  expect(w.mem.get(stampKey('me'))).toBe(NOW)
  // The ledger line holds a count, never a session name or title.
  expect(JSON.stringify(w.mem.get('cockpit:ledger:compact'))).not.toMatch(/Fix login/)
})

test('it warns once per 10 minutes: a second look at once and a look after 9 minutes add nothing; after 10 minutes the line is posted again', async () => {
  const w = world({})
  const a = w.dir('a')
  w.mem.set('cockpit:session:x', rec('x', a))
  expect(await neighborsCheck(w.i, a)).toBe('post')
  expect(await neighborsCheck(w.i, a)).toBe('quiet')
  w.t.now = NOW + 9 * MIN
  w.mem.set('cockpit:session:x', rec('x', a, { updatedAt: w.t.now - 5_000, lastEventAt: w.t.now - 5_000 }))
  expect(await neighborsCheck(w.i, a)).toBe('quiet')
  expect(w.whats().filter(x => x === NEIGHBORS_WHAT)).toHaveLength(1)
  w.t.now = NOW + 10 * MIN
  w.mem.set('cockpit:session:x', rec('x', a, { updatedAt: w.t.now - 5_000, lastEventAt: w.t.now - 5_000 }))
  expect(await neighborsCheck(w.i, a)).toBe('post')
  expect(w.band()[0]?.at).toBe(NOW + 10 * MIN)
  expect(w.whats().filter(x => x === NEIGHBORS_WHAT)).toHaveLength(2)
})

test('when the neighbour leaves, the line is cleared and the time is forgotten, so the next neighbour is told at once', async () => {
  const w = world({})
  const a = w.dir('a')
  w.mem.set('cockpit:session:x', rec('x', a))
  await neighborsCheck(w.i, a)
  expect(w.band()).toHaveLength(1)
  w.mem.delete('cockpit:session:x')
  expect(await neighborsCheck(w.i, a)).toBe('clear')
  expect(w.band()).toEqual([])
  expect(w.mem.has(stampKey('me'))).toBe(false)
  w.mem.set('cockpit:session:y', rec('y', a))
  expect(await neighborsCheck(w.i, a)).toBe('post')
  expect(w.band()).toHaveLength(1)
})

test('a session that closed (not refreshed for over 10 minutes) is not a neighbour', async () => {
  const w = world({})
  const a = w.dir('a')
  w.mem.set('cockpit:session:x', rec('x', a, { updatedAt: NOW - 11 * MIN, lastEventAt: NOW - 11 * MIN }))
  expect(await neighborsCheck(w.i, a)).toBe('clear')
  expect(w.band()).toEqual([])
  w.mem.set('cockpit:session:x', rec('x', a, { state: 'waiting', updatedAt: NOW - 3 * MIN, lastEventAt: NOW - 3 * MIN }))
  expect(await neighborsCheck(w.i, a)).toBe('post')
})

test('the same git worktree counts (a subfolder too); another worktree of the same repository does not', async () => {
  const w0 = world({})
  const main = w0.dir('main')
  const roots: Record<string, string | undefined> = { [main]: main, [`${main}/src`]: main, [`${main}/.wt/x`]: `${main}/.wt/x` }
  const w = world(roots)
  w.mem.set('cockpit:session:x', rec('x', `${main}/src`))
  expect(await neighborsCheck(w.i, main)).toBe('post')
  expect((await findNeighbors(w.i, main)).map(x => x.name)).toEqual(['X'])
  const o = world({ [main]: main, [`${main}/.wt/x`]: `${main}/.wt/x` })
  o.mem.set('cockpit:session:x', rec('x', `${main}/.wt/x`))
  expect(await neighborsCheck(o.i, main)).toBe('clear')
  expect(o.band()).toEqual([])
})

test('git is asked once per folder, and a folder git does not know still matches by its path', async () => {
  const w = world({})
  const a = w.dir('a')
  w.mem.set('cockpit:session:x', rec('x', a))
  w.mem.set('cockpit:session:y', rec('y', w.dir('b')))
  await findNeighbors(w.i, a)
  await findNeighbors(w.i, a)
  expect(w.asked.sort()).toEqual([a, w.dir('b')].sort())
  expect((await findNeighbors(w.i, a)).map(x => x.name)).toEqual(['X'])
})

test('Off posts nothing and takes an old line away', async () => {
  const w = world({})
  const a = w.dir('a')
  w.mem.set('cockpit:session:x', rec('x', a))
  await neighborsCheck(w.i, a)
  expect(w.band()).toHaveLength(1)
  w.mem.set('cockpit:setting:neighbors.warn', 'off')
  expect(await neighborsCheck(w.i, a)).toBe('off')
  expect(w.band()).toEqual([])
})

test('the check never throws, also when the store fails', async () => {
  const w = world({})
  const broken: Io = { ...w.i, keys: async () => { throw new Error('no store') } }
  expect(await neighborsCheck(broken, w.dir('a'))).toBe('quiet')
})

// ---- the hooks, as the engine runs them

function engine(on: On, cwd: string, seed: Record<string, unknown>) {
  mock.clock(on, { now: NOW })
  const mem = new Map<string, unknown>(Object.entries(seed))
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
  mock.session(on)
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: cwd }))
  on('session.root', () => ({ value: cwd }))
  on('process.run', () => ({ value: { exitCode: 128, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  return mem
}

test('/vaken neighbors lists the neighbour by name and state; a message adds nothing to what Claude reads', SLOW, async ($, on) => {
  const cwd = '/t/hook/a'
  engine(on, cwd, { 'cockpit:session:me': rec('me', cwd), 'cockpit:session:x': rec('x', cwd, { title: 'Fix login' }), 'cockpit:session:z': rec('z', '/t/hook/z', { title: 'Elsewhere' }) })
  const t = ((await $.command.run(viaParent('vaken-neighbors', '') as never)) as { text: string }).text
  expect(t).toMatch(/Another session works in this folder:\n {2}Fix login: is working/)
  expect(t).not.toMatch(/Elsewhere/)
  const sent = (await $.prompt.submit({ text: 'hello' } as never).catch(() => undefined)) as { context?: string[] } | undefined
  expect(sent?.context ?? []).toEqual([])
})
