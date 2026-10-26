// Ideas Q10 (same-file warning), Q11 (helper done signals) and Q12 (helper caps): the pure rules and the hooks' parts through an Io.
import { expect } from 'claude-code/testing'

import { AGENTCAP_SETTINGS, CAP_DEPTH_BAND, CAP_SPEND_BAND, DEPTH_MAX, depthOf, depthVerdict, isRunnerSpawn, spendMaxOf, spendVerdict } from '../hooks/core/agentcap'
import { BOARD_KEY, IDLE_NUDGE_MS, doneNotice, idleRows, newlyEnded, parseBoard, withIdle } from '../hooks/core/agentboard'
import type { AgentEntry } from '../hooks/core/agentboard'
import { newRun } from '../hooks/core/orchestra'
import { OVERLAP_MS, addClaim, claimsKey, isHelperOverlap, overlapsOf, parseClaims } from '../hooks/core/crew'
import type { Other } from '../hooks/core/crew'
import { tellBus, tellText } from '../hooks/core/tellme'
import type { TellItem } from '../hooks/core/tellme'
import { agentNudgeText } from '../hooks/core/talk'
import { settingStoreKey } from '../hooks/core/settings'
import type { Io } from '../hooks/core/io'
import { capsVerdict, spentSince } from '../hooks/features/agentcap'
import { idleMem, noteEnd, noteIdle, noteStart, watchBeat } from '../hooks/features/agentboard'
import { loadOverlaps, rememberClaims } from '../hooks/features/crew'
import { test } from './slow'

const NOW = 50_000_000
const MIN = 60_000

function memIo(seed: Record<string, unknown> = {}, now = NOW) {
  const mem = new Map<string, unknown>(Object.entries(seed))
  let clock = now
  const toasts: string[] = []
  const io: Io = {
    now: async () => clock,
    home: async () => '',
    sessionId: async () => 'sess-0001-xyz',
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: text => void toasts.push(text),
    invalidate: () => undefined,
  }
  return { io, mem, toasts, setNow: (t: number) => void (clock = t) }
}

// ---- Q10: same-file warning

const REPO = '/r/.git'
const other = (id: string, name: string, items: { path: string; at: number; agent?: string }[], repo = REPO): Other => ({ sessionId: id, name, claims: { repo, root: '/r', items } })

test('two items for one file stay apart when two helpers edit it; the main loop keeps one item per file', () => {
  let c = addClaim(undefined, REPO, '/r', 'src/a.ts', NOW)
  c = addClaim(c, REPO, '/r', 'src/a.ts', NOW + 1, 'ag-1')
  c = addClaim(c, REPO, '/r', 'src/a.ts', NOW + 2, 'ag-2')
  c = addClaim(c, REPO, '/r', 'src/a.ts', NOW + 3)
  expect(c.items).toEqual([{ path: 'src/a.ts', at: NOW + 1, agent: 'ag-1' }, { path: 'src/a.ts', at: NOW + 2, agent: 'ag-2' }, { path: 'src/a.ts', at: NOW + 3 }])
  expect(parseClaims(JSON.parse(JSON.stringify(c)))).toEqual(c)
  expect(parseClaims({ repo: REPO, root: '/r', items: [{ path: 'x', at: 1, agent: 7 }] })?.items).toEqual([{ path: 'x', at: 1 }])
})

test('a file this session and another live session both changed in the last 10 minutes is one overlap naming the file and both sides', () => {
  const mine = { repo: REPO, root: '/r', items: [{ path: 'src/a.ts', at: NOW - 2 * MIN }, { path: 'src/b.ts', at: NOW - MIN }] }
  const out = overlapsOf(mine, [other('s2', 'fix-login', [{ path: 'src/a.ts', at: NOW - MIN }, { path: 'src/c.ts', at: NOW }])], NOW)
  expect(out).toEqual([{ path: 'src/a.ts', at: NOW - MIN, a: {}, b: { session: { id: 's2', name: 'fix-login' } } }])
  expect(isHelperOverlap(out[0])).toBe(false)
})

test('no overlap for an old edit, another repository or no claims of this session', () => {
  const mine = { repo: REPO, root: '/r', items: [{ path: 'src/a.ts', at: NOW - OVERLAP_MS - 1 }] }
  expect(overlapsOf(mine, [other('s2', 'x', [{ path: 'src/a.ts', at: NOW }])], NOW)).toEqual([])
  const fresh = { repo: REPO, root: '/r', items: [{ path: 'src/a.ts', at: NOW }] }
  expect(overlapsOf(fresh, [other('s2', 'x', [{ path: 'src/a.ts', at: NOW }], '/other/.git')], NOW)).toEqual([])
  expect(overlapsOf(undefined, [other('s2', 'x', [{ path: 'src/a.ts', at: NOW }])], NOW)).toEqual([])
})

test('a separate copy of the repository (another worktree folder) gives no same-file warning, only the same folder does', () => {
  const mine = { repo: REPO, root: '/r', items: [{ path: 'src/a.ts', at: NOW }] }
  const copy: Other = { sessionId: 's3', name: 'copy', claims: { repo: REPO, root: '/r-worktree', items: [{ path: 'src/a.ts', at: NOW }] } }
  expect(overlapsOf(mine, [copy], NOW)).toEqual([])
  expect(overlapsOf(mine, [copy, other('s2', 'same', [{ path: 'src/a.ts', at: NOW }])], NOW).map(o => o.b.session?.id)).toEqual(['s2'])
})

test('two helpers of this session that changed one file are one overlap with both agents; the main loop and one helper are not', () => {
  const mine = { repo: REPO, root: '/r', items: [{ path: 'src/a.ts', at: NOW - MIN, agent: 'ag-1' }, { path: 'src/a.ts', at: NOW, agent: 'ag-2' }, { path: 'src/b.ts', at: NOW, agent: 'ag-1' }, { path: 'src/b.ts', at: NOW }] }
  const out = overlapsOf(mine, [], NOW)
  expect(out).toEqual([{ path: 'src/a.ts', at: NOW, a: { agent: 'ag-1' }, b: { agent: 'ag-2' } }])
  expect(isHelperOverlap(out[0])).toBe(true)
})

test('the pane reads the overlaps from the stored claims of live sessions, with the pane names; paths and times only', async () => {
  rememberClaims('sess-0001-xyz', undefined)
  const w = memIo({
    [claimsKey('sess-0002-abc')]: { repo: REPO, root: '/r', items: [{ path: 'src/a.ts', at: NOW }] },
    [claimsKey('sess-0003-old')]: { repo: REPO, root: '/r', items: [{ path: 'src/a.ts', at: NOW }] },
  })
  const recs = [
    { sessionId: 'sess-0001-xyz', updatedAt: NOW },
    { sessionId: 'sess-0002-abc', updatedAt: NOW - 10_000, cwd: '/r', branch: 'fix-login' },
    { sessionId: 'sess-0003-old', updatedAt: NOW - 10 * MIN, cwd: '/r' },
  ] as never
  expect(await loadOverlaps(w.io, recs, 'sess-0001-xyz', NOW, () => undefined)).toEqual([])
  rememberClaims('sess-0001-xyz', { repo: REPO, root: '/r', items: [{ path: 'src/a.ts', at: NOW - MIN }] })
  const out = await loadOverlaps(w.io, recs, 'sess-0001-xyz', NOW, id => (id === 'sess-0002-abc' ? 'Fix the login' : undefined))
  expect(out.map(o => [o.path, o.b.session?.name])).toEqual([['src/a.ts', 'Fix the login']])
  rememberClaims('sess-0001-xyz', { repo: REPO, root: '/r', items: [{ path: 'src/a.ts', at: NOW - OVERLAP_MS }] })
  expect(await loadOverlaps(w.io, recs, 'sess-0001-xyz', NOW, () => undefined)).toEqual([])
  rememberClaims('sess-0001-xyz', undefined)
})

// ---- Q11: helper done signals

const entry = (over: Partial<AgentEntry> = {}): AgentEntry => ({ id: 'tu1', agentId: 'bg-1', session: 'sess-000', type: 'Explore', what: 'Fix the login', background: true, startedAt: NOW, state: 'running', ...over })

test('the done notice names the task, its time and its cost when known; a stopped one says stopped', () => {
  expect(doneNotice({ ...entry(), state: 'done', endedAt: NOW + 4 * MIN, usd: 0.21 })).toBe('Agent done: Fix the login, took 4 min, about\u00a0$0.21.')
  expect(doneNotice({ ...entry(), state: 'failed', endedAt: NOW + 30_000 })).toBe('Agent stopped: Fix the login, took 30 s.')
  expect(doneNotice({ ...entry({ what: '' }), state: 'done' })).toBe('Agent done: Explore.')
})

test('only rows of this session that went from running to an end are newly ended', () => {
  const before = [entry(), entry({ id: 'tu2', session: 'other-00' }), entry({ id: 'tu3', state: 'done' })]
  const after = [entry({ state: 'done', endedAt: NOW + 1 }), entry({ id: 'tu2', session: 'other-00', state: 'done' }), entry({ id: 'tu3', state: 'done' })]
  expect(newlyEnded(before, after, 'sess-0001-xyz').map(e => e.id)).toEqual(['tu1'])
})

test('a helper that ends gives one done notice through Tell me, from the event or from the list; the second end says nothing', async () => {
  const said: TellItem[] = []
  const old = tellBus.push
  tellBus.push = item => void said.push(item)
  try {
    const w = memIo()
    await noteStart(w.io, { tool_use_id: 'tu1', subagentType: 'Explore', description: 'Fix the login', background: true }, { agentId: 'bg-1', model: 'haiku' })
    await noteStart(w.io, { tool_use_id: 'tu2', subagentType: 'Explore', description: 'Read the docs', background: true }, { agentId: 'bg-2', model: 'haiku' })
    w.setNow(NOW + 2 * MIN)
    await noteEnd(w.io, 'bg-1', 'done')
    await noteEnd(w.io, 'bg-1', 'done')
    expect(said).toEqual([{ kind: 'done', text: 'Agent done: Fix the login, took 2 min.' }])
    await watchBeat(w.io, [{ id: 'bg-2', status: 'completed' }])
    expect(said.map(s => s.text)).toEqual(['Agent done: Fix the login, took 2 min.', 'Agent done: Read the docs, took 2 min.'])
    expect(parseBoard(w.mem.get(BOARD_KEY)).every(e => e.state === 'done')).toBe(true)
  } finally {
    tellBus.push = old
  }
})

test('a done notice with its own words says them; without, the answer-done line', () => {
  expect(tellText([{ kind: 'done', text: 'Agent done: Fix the login' }], (n: string) => n)).toBe('Agent done: Fix the login.')
  expect(tellText([{ kind: 'done' }], (n: string) => n)).toBe('tell.answer_done')
})

test('a teammate that waits for a message shows after 5 minutes, at most 8 are kept, and any progress forgets it', async () => {
  let idle = withIdle({}, 'tm-1', 'scout', NOW)
  expect(idleRows(idle, NOW + IDLE_NUDGE_MS - 1)).toEqual([])
  expect(idleRows(idle, NOW + IDLE_NUDGE_MS + MIN)).toEqual([{ id: 'tm-1', name: 'scout', min: 6 }])
  for (let n = 0; n < 10; n += 1) idle = withIdle(idle, `t${n}`, `n${n}`, NOW + n)
  expect(Object.keys(idle)).toHaveLength(8)
  expect(withIdle(idle, 't9', undefined, NOW)['t9']).toBeUndefined()

  const w = memIo()
  await noteIdle(w.io, 'tm-1', 'scout')
  expect(Object.keys(idleMem.idle)).toEqual(['tm-1'])
  await noteIdle(w.io, 'tm-1', undefined)
  expect(idleMem.idle).toEqual({})
  expect([...w.mem.keys()]).toEqual([])
})

test('the nudge asks Claude in plain words, with the name and minutes only', () => {
  expect(agentNudgeText('scout', 6)).toBe('The agent scout has waited 6 min for a message. Send it its next step, or end it if its work is done.')
})

// ---- Q12: helper caps

test('depth walks the parents in the agent list; a loop or an unknown parent stops the walk', () => {
  expect(depthOf(undefined, new Map())).toBe(1)
  expect(depthOf('a', new Map([['a', undefined]]))).toBe(2)
  expect(depthOf('b', new Map([['b', 'a'], ['a', undefined]]))).toBe(3)
  expect(depthOf('x', new Map())).toBe(2)
  expect(depthOf('a', new Map([['a', 'b'], ['b', 'a']]))).toBe(3)
})

test('too deep: Stop refuses with why and how to lift it, Warn tells, Off and the allowed depth do nothing', () => {
  expect(depthVerdict('hold', DEPTH_MAX)).toEqual({ act: false })
  expect(depthVerdict('off', 9)).toEqual({ act: false })
  const hold = depthVerdict('hold', 3)
  expect(hold.act && hold.hold).toBe(true)
  expect(hold.act && hold.reason).toMatch(/3 levels deep.*only 2 levels deep.*Agent cap to Warn in Settings > Agents/)
  const warn = depthVerdict('warn', 3)
  expect(warn.act && !warn.hold).toBe(true)
})

test('spend per request: under the limit, off or unknown does nothing; at the limit Stop refuses and names the figure and the command', () => {
  expect(spendMaxOf('n10')).toBe(10)
  expect(spendMaxOf('off')).toBe(Infinity)
  expect(spendVerdict('hold', 9.99, 10)).toEqual({ act: false })
  expect(spendVerdict('hold', undefined, 10)).toEqual({ act: false })
  expect(spendVerdict('hold', 50, Infinity)).toEqual({ act: false })
  const hold = spendVerdict('hold', 10.5, 10)
  expect(hold.act && hold.reason).toMatch(/cost \$10\.50, and the limit is \$10\.00 a request.*\/vaken-settings cap\.spend/)
  expect(spentSince(2, 5)).toBe(3)
  expect(spentSince(undefined, 5)).toBe(0)
  expect(spentSince(2, undefined)).toBeUndefined()
})

test('the spend figure has no Settings row of its own: Agent cap governs it', () => {
  const spend = AGENTCAP_SETTINGS.find(s => s.key === 'cap.spend')
  expect(spend?.hidden).toBe(true)
  expect(spend?.default).toBe('n10')
})

test('the spend band line says the next message lifts it, and points to no setting', () => {
  expect(CAP_SPEND_BAND).toBe('Agent stopped: this request reached its spend limit. Your next message lifts it.')
})

test('a spawn the task runner raised is told apart: a plugin\'s own call, or the helper Claude starts for a waiting task; the model\'s own Agent call is not', () => {
  const direct = newRun(['Fix the login', 'Write tests'], NOW)
  const run = { ...direct, status: 'running' as const }
  const spawn = (description: string, prompt: string) => ({ description, prompt })
  // a plugin raised it: the engine is the origin of the model's and the person's spawns
  expect(isRunnerSpawn('vaken', undefined, spawn('Task 1', 'Fix the login'))).toBe(true)
  expect(isRunnerSpawn('engine', undefined, spawn('Look around', 'Read the code'))).toBe(false)
  // Claude's Agent call for a waiting task of the run: only its exact code binds, never a name like "Task n"
  expect(isRunnerSpawn('engine', run, spawn('Task 1', `vaken-task ${run.id}-1`))).toBe(true)
  expect(isRunnerSpawn('engine', run, spawn('Task 2', 'whatever'))).toBe(false)
  // another call, or a run that has ended, is the model's own
  expect(isRunnerSpawn('engine', run, spawn('Look around', 'Read the code'))).toBe(false)
  expect(isRunnerSpawn('engine', { ...run, status: 'done' as const }, spawn('Task 1', `vaken-task ${run.id}-1`))).toBe(false)
})

test('the caps read the one Agent cap setting: Stop denies with a band line, Warn gives a translated line, Off nothing', async () => {
  const w = memIo({ [settingStoreKey('cap.mode')]: 'hold' })
  const deep = await capsVerdict(w.io, { depth: 3, spent: 0 })
  expect(deep.band).toBe(CAP_DEPTH_BAND)
  expect(deep.deny).toMatch(/too deep|levels deep/)
  const spent = await capsVerdict(w.io, { depth: 1, spent: 12 })
  expect(spent.band).toBe(CAP_SPEND_BAND)
  expect(await capsVerdict(w.io, { depth: 1, spent: 1 })).toEqual({})
  w.mem.set(settingStoreKey('cap.mode'), 'warn')
  expect(await capsVerdict(w.io, { depth: 3, spent: 0 })).toEqual({ warn: 'Agents go 3 levels deep; the cap is 2.' })
  w.mem.set(settingStoreKey('cap.spend'), 'n2')
  expect(await capsVerdict(w.io, { depth: 1, spent: 3 })).toEqual({ warn: 'This request has cost $3.00; the agent spend limit is $2.00.' })
  w.mem.set(settingStoreKey('cap.mode'), 'off')
  expect(await capsVerdict(w.io, { depth: 9, spent: 99 })).toEqual({})
})
