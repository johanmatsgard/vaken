// The agent board and its hooks: the list rules, the 45-minute limit, the words, the card, and the hooks that fill it.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import {
  AGENTBOARD_HELP,
  AGENTBOARD_SETTINGS,
  BACKGROUND_LIMIT_MS,
  BOARD_KEY,
  BOARD_MAX,
  KEEP_MS,
  NONE_WORDS,
  boardCardLines,
  boardRows,
  boardText,
  cutWhat,
  dur,
  endAgent,
  markSessionUnknown,
  modelWord,
  parseBoard,
  rowLine,
  runningCount,
  startAgent,
  syncStatus,
  addAgentCost,
  watchNeeded,
  rowAge,
  rowDetail,
  rowFacts,
  rowKind,
  rowName,
  rowWord,
  STUCK_BAND,
  flagStuck,
} from '../hooks/core/agentboard'
import type { AgentEntry, Start } from '../hooks/core/agentboard'
import { boardTextFrom, loadBoard, noteCall, noteCost, noteEnd, noteProgress, noteSessionEnd, noteStart, watchBeat } from '../hooks/features/agentboard'
import { agentsHeadOf, agentsText, othersCount, rowCost, rowRight, splitAgents } from '../hooks/core/agentboard'
import { agentsHead } from '../hooks/core/headline'
import { agentsModel } from '../hooks/features/home/cards/agents'
import { setLang, tr } from '../hooks/core/lang'
import { detailChars } from '../hooks/ui/kit'
import { DOT, DOT_TEXT_GAP, STACK_BELOW_PT, TEXT_CHAR_PT } from '../hooks/ui/tokens'
import { othersDetail } from '../hooks/features/home/cards/others'
import type { Io } from '../hooks/core/io'
import { settingStoreKey } from '../hooks/core/settings'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000

const start = (n: number, over: Partial<Start> = {}): Start => ({ id: `tu${n}`, agentId: `ag${n}`, session: 'abcdef123456', type: 'Explore', model: 'claude-haiku-4-5', description: `Search part ${n}`, background: true, ...over })

test('a started helper goes first, with its whole words (a 500 character safety cap) and no prompt', () => {
  const long = 'Look through every file of the settings code and write down all the places that read them'
  const list = startAgent([], start(1, { description: long }), NOW)
  expect(list).toHaveLength(1)
  expect(list[0].what).toBe(long)
  expect(startAgent([], start(1, { description: 'x'.repeat(900) }), NOW)[0].what.length).toBe(500)
  expect(list[0]).toEqual({ id: 'tu1', agentId: 'ag1', session: 'abcdef12', type: 'Explore', model: 'claude-haiku-4-5', what: list[0].what, background: true, startedAt: NOW, state: 'running' })
  expect(cutWhat('  two\n words  ')).toBe('two words')
  const two = startAgent(list, start(2), NOW + MIN)
  expect(two.map(e => e.id)).toEqual(['tu2', 'tu1'])
  expect(startAgent(two, start(1, { description: 'Again' }), NOW + 2 * MIN).map(e => e.what)).toEqual(['Again', 'Search part 2'])
})

test('the list keeps 40 entries and drops those older than 24 hours when it is written', () => {
  let list: AgentEntry[] = []
  for (let n = 0; n < 45; n += 1) list = startAgent(list, start(n), NOW + n * MIN)
  expect(list).toHaveLength(BOARD_MAX)
  expect(list[0].id).toBe('tu44')
  const old = startAgent(list, start(99), NOW + KEEP_MS + 50 * MIN)
  expect(old.map(e => e.id)).toEqual(['tu99'])
})

test('an end seen changes a running line once, by the call id or the helper id', () => {
  const list = startAgent(startAgent([], start(1), NOW), start(2), NOW)
  const a = endAgent(list, 'ag1', 'done', NOW + 5 * MIN)
  expect(a.find(e => e.id === 'tu1')).toMatchObject({ state: 'done', endedAt: NOW + 5 * MIN })
  expect(a.find(e => e.id === 'tu2')?.state).toBe('running')
  const b = endAgent(a, 'tu1', 'failed', NOW + 9 * MIN)
  expect(b).toBe(a)
  expect(endAgent(list, 'nobody', 'done', NOW)).toBe(list)
})

test('when a session closes its running helpers show no end seen; other sessions are left alone', () => {
  const list = startAgent(startAgent([], start(1), NOW), start(2, { session: 'zzzzzzzz9' }), NOW)
  const marked = markSessionUnknown(list, 'abcdef123456')
  expect(marked.find(e => e.id === 'tu1')).toMatchObject({ state: 'unknown' })
  expect(marked.find(e => e.id === 'tu1')?.endedAt).toBeUndefined()
  expect(marked.find(e => e.id === 'tu2')?.state).toBe('running')
  expect(markSessionUnknown(marked, 'abcdef123456')).toBe(marked)
})

test('the status of the engine list is an end seen: completed is done, failed and killed are failed', () => {
  let list: AgentEntry[] = []
  for (const n of [1, 2, 3, 4]) list = startAgent(list, start(n), NOW)
  const s = syncStatus(list, [{ id: 'ag1', status: 'completed' }, { id: 'ag2', status: 'killed' }, { id: 'ag3', status: 'failed' }, { id: 'ag4', status: 'running' }], NOW + MIN)
  expect(s.map(e => e.state)).toEqual(['running', 'failed', 'failed', 'done'])
  expect(syncStatus(list, [{ id: 'ag4', status: 'running' }], NOW)).toBe(list)
})

test('a background helper counts as running for 45 minutes from its start, and no longer', () => {
  const list = startAgent(startAgent(startAgent([], start(1), NOW), start(2, { background: false }), NOW), start(3), NOW + 30 * MIN)
  expect(runningCount(list, NOW + MIN)).toBe(2)
  expect(runningCount(list, NOW + BACKGROUND_LIMIT_MS - 1)).toBe(2)
  expect(runningCount(list, NOW + BACKGROUND_LIMIT_MS)).toBe(1)
  expect(runningCount(list, NOW + 30 * MIN + BACKGROUND_LIMIT_MS)).toBe(0)
  expect(runningCount(endAgent(list, 'tu1', 'done', NOW + 2 * MIN), NOW + 3 * MIN)).toBe(1)
  expect(runningCount([], NOW)).toBe(0)
})

test('rows: running first, then the newest; past 45 minutes a running line is "probably done", never running', () => {
  let list: AgentEntry[] = []
  list = startAgent(list, start(1), NOW)
  list = startAgent(list, start(2), NOW + 10 * MIN)
  list = startAgent(list, start(3), NOW + 20 * MIN)
  list = endAgent(list, 'tu3', 'done', NOW + 25 * MIN)
  const rows = boardRows(list, NOW + 30 * MIN)
  expect(rows.map(r => r.id)).toEqual(['tu2', 'tu1', 'tu3'])
  expect(rows.map(r => r.state)).toEqual(['running', 'running', 'done'])
  const later = boardRows(list, NOW + 50 * MIN)
  expect(later.find(r => r.id === 'tu1')).toMatchObject({ state: 'unknown', stale: true })
  expect(later.find(r => r.id === 'tu2')).toMatchObject({ state: 'running', stale: false })
  expect(boardRows(list, NOW + KEEP_MS + 21 * MIN).map(r => r.id)).toEqual([])
})

test('the words of a row: mark, type, model, task, state word, age', () => {
  let list = startAgent([], start(1), NOW)
  list = startAgent(list, start(2, { model: undefined }), NOW)
  list = startAgent(list, start(3, { model: 'claude-opus-4-1' }), NOW)
  list = endAgent(list, 'tu3', 'done', NOW + 3 * MIN)
  const rows = boardRows(list, NOW + 12 * MIN)
  const line = (id: string): string => rowLine(rows.find(r => r.id === id)!, NOW + 12 * MIN)
  expect(line('tu1')).toBe('● Explore (haiku): Search part 1, running, 12 min')
  expect(line('tu2')).toBe('● Explore (model unknown): Search part 2, running, 12 min')
  expect(line('tu3')).toBe('✓ Explore (opus): Search part 3, done, took 3 min')
  const closed = boardRows(markSessionUnknown(startAgent([], start(4), NOW), 'abcdef123456'), NOW + 12 * MIN)
  expect(rowLine(closed[0], NOW + 12 * MIN)).toBe('? Explore (haiku): Search part 4, no end seen, started 12 min ago')
  const stale = boardRows(startAgent([], start(5), NOW), NOW + 50 * MIN)
  expect(rowLine(stale[0], NOW + 50 * MIN)).toBe('? Explore (haiku): Search part 5, probably done, started 50 min ago')
  const failed = boardRows(endAgent(startAgent([], start(6), NOW), 'tu6', 'failed', NOW + 40_000), NOW + MIN)
  expect(rowLine(failed[0], NOW + MIN)).toBe('▲ Explore (haiku): Search part 6, failed, took 40 s')
  expect(dur(3 * 3_600_000 + 5 * MIN)).toBe('3 h 5 min')
  expect(dur(2 * 3_600_000)).toBe('2 h')
  expect(modelWord('Opus')).toBe('opus')
  expect(modelWord('mystery-model-with-a-very-long-name')).toHaveLength(18)
})

test('the board text: a header, one line a row, at most 12 lines, and an honest note', () => {
  expect(boardText([], NOW)).toBe(NONE_WORDS)
  let list: AgentEntry[] = []
  for (let n = 0; n < 5; n += 1) list = startAgent(list, start(n), NOW + n * MIN)
  list = endAgent(list, 'tu0', 'done', NOW + 6 * MIN)
  const text = boardText(boardRows(list, NOW + 10 * MIN), NOW + 10 * MIN)
  const lines = text.split('\n')
  expect(lines[0]).toBe('Agents: 4 running, 1 finished in the last hour.')
  expect(lines).toHaveLength(6)
  expect(lines[1]).toMatch(/^● /)
  expect(lines[5]).toMatch(/^✓ /)

  let many: AgentEntry[] = []
  for (let n = 0; n < 30; n += 1) many = startAgent(many, start(n), NOW + n * MIN)
  many = markSessionUnknown(many, 'abcdef123456').map(e => (e.id === 'tu29' ? { ...e, state: 'running' as const } : e))
  const big = boardText(boardRows(many, NOW + 35 * MIN), NOW + 35 * MIN).split('\n')
  expect(big.length).toBeLessThanOrEqual(12)
  expect(big[big.length - 1]).toMatch(/^No end seen/)
  expect(big.some(l => /^And \d+ more\.$/.test(l))).toBe(true)
})

test('the card lines: a title, a note, 3 lines at most when compact and 8 when explained', () => {
  const none = boardCardLines([], NOW, 'simple')
  expect(none).toEqual({ title: 'Agents', note: 'none seen', lines: ['No agents seen yet.'] })
  expect(boardCardLines([], NOW, 'explained').lines).toEqual([NONE_WORDS])
  let list: AgentEntry[] = []
  for (let n = 0; n < 12; n += 1) list = startAgent(list, start(n), NOW + n * MIN)
  list = endAgent(list, 'tu0', 'done', NOW + 20 * MIN)
  const rows = boardRows(list, NOW + 30 * MIN)
  const compact = boardCardLines(rows, NOW + 30 * MIN, 'simple')
  expect(compact.title).toBe('Agents')
  expect(compact.note).toBe('11 running')
  expect(compact.lines).toHaveLength(3)
  expect(compact.lines[0]).toBe('● Explore, haiku, 19 min')
  expect(compact.lines[2]).toBe('And 10 more.')
  const full = boardCardLines(rows, NOW + 30 * MIN, 'explained')
  expect(full.lines).toHaveLength(8)
  expect(full.lines[0]).toBe('● Explore (haiku): Search part 11, running, 19 min')
  expect(full.lines[7]).toBe('And 5 more.')
  const few = boardCardLines(boardRows(endAgent(startAgent([], start(1), NOW), 'tu1', 'done', NOW + 3 * MIN), NOW + 4 * MIN), NOW + 4 * MIN, 'simple')
  expect(few.note).toBe('none running')
  expect(few.lines).toEqual(['✓ Explore, haiku, 3 min'])
  const unk = boardCardLines(boardRows(markSessionUnknown(startAgent([], start(1), NOW), 'abcdef123456'), NOW + 4 * MIN), NOW + 4 * MIN, 'explained')
  expect(unk.note).toBe('none running, 1 no end seen')
})

test('stored rows are read defensively and hold no prompt or result', () => {
  expect(parseBoard(undefined)).toEqual([])
  expect(parseBoard('x')).toEqual([])
  const ok = { id: 'a', session: 's', type: 't', what: 'w', background: true, startedAt: 1, state: 'running', prompt: 'secret', result: 'secret' }
  expect(parseBoard([ok, { id: 'b' }, null, 7, { ...ok, state: 'weird' }, { ...ok, id: 'c', model: 'm', agentId: 'g', endedAt: 5 }])).toEqual([
    { id: 'a', session: 's', type: 't', what: 'w', background: true, startedAt: 1, state: 'running' },
    { id: 'c', session: 's', type: 't', what: 'w', background: true, startedAt: 1, state: 'running', model: 'm', agentId: 'g', endedAt: 5 },
  ])
})

test('the Settings row and the help entry', () => {
  expect(AGENTBOARD_SETTINGS.map(s => s.key)).toEqual(['agents.board'])
  const row = AGENTBOARD_SETTINGS[0]
  expect(row.group).toBe('Agents')
  expect(row.options.map(o => o.value)).toEqual(['off', 'on'])
  expect(row.default).toBe('on')
  expect(AGENTBOARD_HELP).toHaveLength(1)
  expect(AGENTBOARD_HELP[0].text).toMatch(/no end seen/)
  expect(AGENTBOARD_HELP[0].text).toMatch(/45 minutes/)
})

// ---- what the hooks do, through an Io.

function memIo(seed: Record<string, unknown> = {}, now = NOW) {
  const mem = new Map<string, unknown>(Object.entries(seed))
  let clock = now
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
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem, setNow: (t: number) => void (clock = t) }
}

const board = (mem: Map<string, unknown>): AgentEntry[] => parseBoard(mem.get(BOARD_KEY))
const spawn = (n: number, over: Record<string, unknown> = {}) => ({ tool_use_id: `tu${n}`, subagentType: 'Explore', description: `Search part ${n}`, background: true, ...over })

test('a started helper is written with the model it really got; its prompt and result are never stored', async () => {
  const w = memIo()
  await noteStart(w.io, { ...spawn(1), prompt: 'SECRET PROMPT', model: 'haiku' } as never, { agentId: 'bg-1', model: 'claude-haiku-4-5' })
  expect(board(w.mem)).toEqual([{ id: 'tu1', agentId: 'bg-1', session: 'sess-000', type: 'Explore', model: 'claude-haiku-4-5', what: 'Search part 1', background: true, startedAt: NOW, state: 'running' }])
  expect(JSON.stringify(w.mem.get(BOARD_KEY))).not.toMatch(/SECRET/)
  await noteStart(w.io, { ...spawn(2), model: 'opus' }, { agentId: 'bg-2' })
  expect(board(w.mem)[0].model).toBe('opus')
})

test('a refused spawn, a teammate and a workflow helper are not written; Off writes nothing', async () => {
  const w = memIo()
  await noteStart(w.io, spawn(1), { deny: 'no' })
  await noteStart(w.io, spawn(2, { isTeammate: true }), { agentId: 'tm' })
  await noteStart(w.io, spawn(3, { workflow: { runId: 'wf_1', agentIndex: 1 } }), { agentId: 'wf' })
  expect(board(w.mem)).toEqual([])
  w.mem.set(settingStoreKey('agents.board'), 'off')
  await noteStart(w.io, spawn(4), { agentId: 'x' })
  expect(board(w.mem)).toEqual([])
  expect(await boardTextFrom(w.io)).toMatch(/is off/)
})

test('the helper own turn.complete ends it: answer is done, an interrupt or an error is failed; an unknown id changes nothing', async () => {
  const w = memIo()
  await noteStart(w.io, spawn(1), { agentId: 'bg-1', model: 'haiku' })
  await noteStart(w.io, spawn(2), { agentId: 'bg-2', model: 'haiku' })
  w.setNow(NOW + 5 * MIN)
  await noteEnd(w.io, 'bg-1', 'done')
  await noteEnd(w.io, 'bg-2', 'failed')
  await noteEnd(w.io, 'nobody', 'done')
  expect(board(w.mem).map(e => [e.id, e.state, e.endedAt])).toEqual([['tu2', 'failed', NOW + 5 * MIN], ['tu1', 'done', NOW + 5 * MIN]])
})

test('a helper that ends before its line is written is closed when the line comes', async () => {
  const w = memIo()
  await noteEnd(w.io, 'fast-1', 'done')
  w.setNow(NOW + 1000)
  await noteStart(w.io, spawn(1), { agentId: 'fast-1', model: 'haiku' })
  expect(board(w.mem)[0]).toMatchObject({ state: 'done', endedAt: NOW })
})

test('a helper in front ends when its Agent call returns completed; an error is failed; a background launch changes nothing', async () => {
  const w = memIo()
  await noteStart(w.io, spawn(1, { background: false }), { agentId: 'fg-1', model: 'sonnet' })
  await noteStart(w.io, spawn(2), { agentId: 'bg-2', model: 'sonnet' })
  await noteStart(w.io, spawn(3, { background: false }), { agentId: 'fg-3', model: 'sonnet' })
  await noteCall(w.io, 'tu2', { result: { status: 'async_launched', agentId: 'bg-2' } })
  expect(board(w.mem).find(e => e.id === 'tu2')?.state).toBe('running')
  w.setNow(NOW + 2 * MIN)
  await noteCall(w.io, 'tu1', { result: { status: 'completed', content: [{ type: 'text', text: 'LONG RESULT' }] } })
  await noteCall(w.io, 'tu3', { isError: true, result: undefined })
  const rows = board(w.mem)
  expect(rows.find(e => e.id === 'tu1')).toMatchObject({ state: 'done', endedAt: NOW + 2 * MIN })
  expect(rows.find(e => e.id === 'tu3')).toMatchObject({ state: 'failed' })
  expect(JSON.stringify(w.mem.get(BOARD_KEY))).not.toMatch(/LONG RESULT/)
  await noteCall(w.io, 'tu2', { deny: 'no' })
  expect(board(w.mem).find(e => e.id === 'tu2')?.state).toBe('running')
})

test('a closing session marks its running helpers; helpers of other sessions stay', async () => {
  const w = memIo()
  await noteStart(w.io, spawn(1), { agentId: 'bg-1', model: 'haiku' })
  w.mem.set(BOARD_KEY, [...board(w.mem), { id: 'o1', session: 'other-ss', type: 'Plan', what: 'x', background: true, startedAt: NOW, state: 'running' }])
  await noteSessionEnd(w.io, 'sess-0001-xyz')
  expect(board(w.mem).map(e => [e.id, e.state])).toEqual([['tu1', 'unknown'], ['o1', 'running']])
})

test('the board is loaded with the engine statuses, and /vaken-tasks agents-board says it in words', async () => {
  const w = memIo()
  expect(await boardTextFrom(w.io)).toBe(NONE_WORDS)
  await noteStart(w.io, spawn(1), { agentId: 'bg-1', model: 'claude-haiku-4-5' })
  w.setNow(NOW + 12 * MIN)
  expect(await boardTextFrom(w.io, [{ id: 'bg-1', status: 'running' }])).toBe('Agents: 1 running, 0 finished in the last hour.\n● Explore (haiku): Search part 1, running, 12 min')
  // The engine list says it ended: the board notes the end and keeps it.
  const text = await boardTextFrom(w.io, [{ id: 'bg-1', status: 'completed' }])
  expect(text).toBe('Agents: 0 running, 1 finished in the last hour.\n✓ Explore (haiku): Search part 1, done, took 12 min')
  expect(board(w.mem)[0].state).toBe('done')
  expect((await loadBoard(w.io))[0].state).toBe('done')
})

test('a broken store makes a hook function throw, so the hooks wrap them; nothing here hides it', async () => {
  const w = memIo()
  const bad: Io = { ...w.io, get: async () => { throw new Error('store down') } }
  await expect(noteStart(bad, spawn(1), { agentId: 'a' })).rejects.toThrow()
})

test('a turn cost adds up on its line, and fills a model the start did not know', () => {
  const list = startAgent([], start(1, { model: undefined }), NOW)
  const once = addAgentCost(list, 'ag1', 0.02, 'claude-haiku-4-5')
  const twice = addAgentCost(once, 'tu1', 0.01, 'claude-opus-4-5')
  expect(Math.round((twice[0].usd ?? 0) * 1e6)).toBe(30_000)
  expect(twice[0].model).toBe('claude-haiku-4-5')
  expect(addAgentCost(list, 'nobody', 1)).toBe(list)
  expect(Math.round((parseBoard(JSON.parse(JSON.stringify(twice)))[0].usd ?? 0) * 1e6)).toBe(30_000)
  expect(parseBoard([{ ...twice[0], usd: -1 }])[0].usd).toBeUndefined()
})

test('the watch runs only while a helper of this session with an engine id runs, and not past 45 minutes', () => {
  const list = startAgent([], start(1), NOW)
  expect(watchNeeded(list, 'abcdef12-rest', NOW)).toBe(true)
  expect(watchNeeded(list, 'other-session', NOW)).toBe(false)
  expect(watchNeeded(list, 'abcdef12', NOW + BACKGROUND_LIMIT_MS)).toBe(false)
  expect(watchNeeded(endAgent(list, 'ag1', 'done', NOW), 'abcdef12', NOW)).toBe(false)
  expect(watchNeeded(startAgent([], start(2, { agentId: undefined }), NOW), 'abcdef12', NOW)).toBe(false)
})

test('the second line has room for fewer characters in a narrow card, a word and a wordless needs row counted', () => {
  expect(detailChars(500, false, 'Working')).toBeGreaterThan(detailChars(400, false, 'Working'))
  expect(detailChars(STACK_BELOW_PT - 1, false, 'Working')).toBe(Math.floor((STACK_BELOW_PT - 1 - DOT - DOT_TEXT_GAP) / TEXT_CHAR_PT) - ('Working'.length + 3))
  expect(detailChars(STACK_BELOW_PT - 1, true, 'Failed')).toBe(Math.floor((STACK_BELOW_PT - 1 - DOT - DOT_TEXT_GAP) / TEXT_CHAR_PT))
  expect(detailChars(500, true, 'Failed')).toBe(Math.floor((500 - DOT - DOT_TEXT_GAP) / TEXT_CHAR_PT))
})

test('a row: dot, word, task, time and second line, like an Other sessions row', () => {
  const list = startAgent(startAgent([], start(1), NOW - 10 * MIN), start(2, { description: '' }), NOW - 3 * MIN)
  const done = endAgent(list, 'ag1', 'done', NOW - 4 * MIN)
  const rows = boardRows(done, NOW)
  expect(rows.map(r => [rowKind(r), rowWord(r), rowName(r), rowAge(r, NOW)])).toEqual([
    ['working', 'Running', 'Explore', '3 min'],
    ['waiting', 'Done', 'Search part 1', '6 min'],
  ])
  expect(rowDetail(rows[1], 'Fix the login page')).toBe('haiku · Explore · Fix the login page')
  // A narrow column: the session part goes first, so the model and role are never cut in the middle of a word.
  expect(rowDetail(rows[1], 'Fix the login page', 36)).toBe('haiku · Explore · Fix the login page')
  expect(rowDetail(rows[1], 'Fix the login page', 20)).toBe('haiku · Explore')
  const failed = boardRows(endAgent(list, 'ag2', 'failed', NOW), NOW).find(r => r.state === 'failed')!
  expect([rowKind(failed), rowWord(failed)]).toEqual(['needs', 'Failed'])
  const lost = boardRows(markSessionUnknown(list, 'abcdef12'), NOW)[0]
  expect([rowKind(lost), rowWord(lost), rowAge(lost, NOW)]).toEqual(['idle', 'Unknown', '3 min ago'])
})

test('an open row says what it was asked, who started it, the time, the result and the cost', () => {
  const list = addAgentCost(endAgent(startAgent([], start(1), NOW - 10 * MIN), 'ag1', 'done', NOW - 4 * MIN), 'ag1', 0.042)
  expect(rowFacts(boardRows(list, NOW)[0], NOW, 'This session')).toEqual([
    'Asked: Search part 1',
    'Started by: This session, as Explore on haiku',
    'Time: took 6 min',
    'Result: done',
    'Cost: about $0.042 (estimate)',
  ])
  const running = boardRows(startAgent([], start(2), NOW - 2 * MIN), NOW)[0]
  expect(rowFacts(running, NOW, 'x').slice(2)).toEqual(['Time: running for 2 min so far', 'Result: not yet, it still runs', 'Cost: not known yet'])
})

test('a cost is noted on its line, or waits for a line that is not written yet', async () => {
  const w = memIo()
  await noteStart(w.io, spawn(1), { agentId: 'bg-1', model: 'claude-haiku-4-5' })
  await noteCost(w.io, 'bg-1', 0.01)
  expect(Math.round((board(w.mem)[0].usd ?? 0) * 1e6)).toBe(10_000)
  await noteCost(w.io, 'fast-2', 0.02, 'claude-sonnet-4-5')
  await noteStart(w.io, spawn(2), { agentId: 'fast-2' })
  expect(board(w.mem)[0]).toMatchObject({ id: 'tu2', model: 'claude-sonnet-4-5' })
  expect(Math.round((board(w.mem)[0].usd ?? 0) * 1e6)).toBe(20_000)
})

test('a beat of the watch closes an ended helper from the engine list, and stops when none runs', async () => {
  const w = memIo()
  await noteStart(w.io, spawn(1), { agentId: 'bg-1', model: 'haiku' })
  expect(await watchBeat(w.io, undefined)).toBe(true)
  expect(await watchBeat(w.io, [{ id: 'bg-1', status: 'running' }])).toBe(true)
  w.setNow(NOW + MIN)
  expect(await watchBeat(w.io, [{ id: 'bg-1', status: 'completed' }])).toBe(false)
  expect(board(w.mem)[0]).toMatchObject({ state: 'done', endedAt: NOW + MIN })
  expect(await watchBeat(w.io, [])).toBe(false)
})

test('a running helper with no progress for 10 minutes is flagged once; one that moved is not; a helper that moves again is cleared', () => {
  const list = startAgent(startAgent([], start(1), NOW), start(2), NOW)
  const seen = new Map<string, number>([['ag2', NOW + 9 * MIN]])
  const a = flagStuck(list, seen, 'abcdef123456', NOW + 10 * MIN)
  expect(a.fresh).toBe(1)
  expect(a.list.find(e => e.id === 'tu1')).toMatchObject({ quietAt: NOW, warned: true })
  expect(a.list.find(e => e.id === 'tu2')?.quietAt).toBeUndefined()
  const b = flagStuck(a.list, seen, 'abcdef123456', NOW + 11 * MIN)
  expect(b.list).toBe(a.list)
  expect(b.fresh).toBe(0)
  // it moves: the mark goes, "warned" stays so the band is not posted again
  seen.set('ag1', NOW + 12 * MIN)
  const c = flagStuck(b.list, seen, 'abcdef123456', NOW + 12 * MIN)
  expect(c.list.find(e => e.id === 'tu1')?.quietAt).toBeUndefined()
  expect(c.list.find(e => e.id === 'tu1')?.warned).toBe(true)
  seen.set('ag2', NOW + 22 * MIN)
  const d = flagStuck(c.list, seen, 'abcdef123456', NOW + 23 * MIN)
  expect(d.fresh).toBe(0)
  expect(d.list.find(e => e.id === 'tu1')?.quietAt).toBe(NOW + 12 * MIN)
})

test("only this session's running helpers with an engine id are flagged, and never past the 45-minute limit", () => {
  const list = startAgent(startAgent(startAgent([], start(1, { session: 'zzzzzzzz9' }), NOW), start(2, { agentId: undefined }), NOW), start(3), NOW)
  const done = endAgent(list, 'ag3', 'done', NOW + MIN)
  expect(flagStuck(done, new Map(), 'abcdef123456', NOW + 20 * MIN).fresh).toBe(0)
  expect(flagStuck(list, new Map(), 'abcdef123456', NOW + 46 * MIN).fresh).toBe(0)
  expect(flagStuck(list, new Map(), 'abcdef123456', NOW + 5 * MIN).list).toBe(list)
})

test('a flagged row says how long on its right-hand text, in Swedish too; the text twin and the card say it', () => {
  const list = startAgent([], start(1), NOW)
  const flagged = flagStuck(list, new Map(), 'abcdef123456', NOW + 14 * MIN).list
  const row = boardRows(flagged, NOW + 14 * MIN)[0]
  expect(row.state).toBe('running')
  expect(rowAge(row, NOW + 14 * MIN)).toBe('No progress for 14 min')
  expect(rowAge(boardRows(list, NOW + 14 * MIN)[0], NOW + 14 * MIN)).toBe('14 min')
  expect(rowAge(row, NOW + 30 * MIN)).toBe('No progress for 30 min')
  expect(rowFacts(row, NOW + 14 * MIN, 'This session')[2]).toMatch(/no progress for 14 min/)
  expect(boardText([row], NOW + 14 * MIN)).toMatch(/running, 14 min, no progress for 14 min/)
  expect(boardCardLines([row], NOW + 14 * MIN, 'compact').lines[0]).toMatch(/No progress for 14 min/)
  setLang('sv')
  try {
    expect(rowAge(row, NOW + 14 * MIN)).toBe('Inga framsteg på 14 min')
    expect(tr(STUCK_BAND)).toBe('En agent gjorde inga framsteg på 10 min')
  } finally {
    setLang('en')
  }
})

test('the stored marks survive a read of the list', () => {
  const list = flagStuck(startAgent([], start(1), NOW), new Map(), 'abcdef123456', NOW + 11 * MIN).list
  expect(parseBoard(JSON.parse(JSON.stringify(list)))[0]).toMatchObject({ quietAt: NOW, warned: true })
})

test('a beat of the watch flags a quiet helper, posts one band line and writes the row; progress seen in memory keeps it clean', async () => {
  const w = memIo()
  await noteStart(w.io, spawn(1), { agentId: 'bg-1', model: 'haiku' })
  await noteStart(w.io, spawn(2), { agentId: 'bg-2', model: 'haiku' })
  w.setNow(NOW + 5 * MIN)
  expect(await watchBeat(w.io, [{ id: 'bg-1', status: 'running' }, { id: 'bg-2', status: 'running' }])).toBe(true)
  expect(board(w.mem).some(e => e.quietAt !== undefined)).toBe(false)
  expect(w.mem.get('cockpit:band:sess-0001-xyz')).toBeUndefined()
  noteProgress('bg-2', NOW + 9 * MIN)
  w.setNow(NOW + 11 * MIN)
  expect(await watchBeat(w.io, [{ id: 'bg-1', status: 'running' }, { id: 'bg-2', status: 'running' }])).toBe(true)
  expect(board(w.mem).find(e => e.agentId === 'bg-1')).toMatchObject({ quietAt: NOW, warned: true })
  expect(board(w.mem).find(e => e.agentId === 'bg-2')?.quietAt).toBeUndefined()
  const band = w.mem.get('cockpit:band:sess-0001-xyz') as Array<{ text: string; level: string }>
  expect(band).toHaveLength(1)
  expect(band[0]).toMatchObject({ level: 'warn', text: 'An agent made no progress for 10 min' })
  w.setNow(NOW + 12 * MIN)
  noteProgress('bg-2', NOW + 12 * MIN)
  await watchBeat(w.io, [{ id: 'bg-1', status: 'running' }, { id: 'bg-2', status: 'running' }])
  expect((w.mem.get('cockpit:band:sess-0001-xyz') as unknown[]).length).toBe(1)
  const off = memIo()
  await noteStart(off.io, spawn(1), { agentId: 'bg-9' })
  off.mem.set(settingStoreKey('agents.board'), 'off')
  off.setNow(NOW + 20 * MIN)
  await watchBeat(off.io, [{ id: 'bg-9', status: 'running' }])
  expect(off.mem.get('cockpit:band:sess-0001-xyz')).toBeUndefined()
})

test('Other sessions: the group name leaves the second line first when the column is narrow', () => {
  const row = { kind: 'waiting', reason: 'finished, waits for you', sinceMs: 4 * MIN, group: 'Test', rec: { cwd: '/work/app' } } as never
  // The word beside the name says "Your turn", so the dim line leaves out "finished, waits for you".
  expect(othersDetail(row, undefined, false, 80)).toBe('Test · 4 min')
  expect(othersDetail(row, undefined, false, 8)).toBe('4 min')
  // A grouped list has no group title, so the row's line names its group too, and drops it first when narrow.
  expect(othersDetail(row, undefined, true, 20)).toBe('Test · 4 min')
  expect(othersDetail(row, undefined, true, 8)).toBe('4 min')
})

const HOUR = 60 * MIN
const helpers = (): ReturnType<typeof boardRows> => {
  let list: AgentEntry[] = []
  for (let n = 0; n < 30; n += 1) {
    list = startAgent(list, start(n, { session: 'oldsess01', type: n % 2 === 0 ? 'Explore' : 'general-purpose' }), NOW - 5 * HOUR + n * MIN)
    list = endAgent(list, `tu${n}`, 'done', NOW - 5 * HOUR + n * MIN + 2 * MIN)
  }
  list = startAgent(list, start(100, { description: 'Check the long description of the Agents card in full width without a cut at sixty characters' }), NOW - 20 * MIN)
  list = endAgent(list, 'tu100', 'done', NOW - 18 * MIN)
  list = startAgent(list, start(101), NOW - 15 * MIN)
  list = endAgent(list, 'tu101', 'failed', NOW - 14 * MIN)
  list = startAgent(list, start(102), NOW - 4 * MIN)
  list = startAgent(list, start(103, { session: 'othersess' }), NOW - 2 * MIN)
  return boardRows(list, NOW)
}

test('splitAgents: running first across sessions, then the last hour, the rest older and grouped by type', () => {
  const s = splitAgents(helpers(), NOW)
  expect(s.running.map(r => r.id)).toEqual(['tu103', 'tu102'])
  expect(s.recent.map(r => r.id)).toEqual(['tu101', 'tu100'])
  expect(s.older).toHaveLength(30)
  const types = s.older.map(r => r.type)
  expect(types).toEqual([...types].sort((a, b) => a.localeCompare(b)))
  expect(splitAgents(helpers(), NOW, 'here', 'abcdef123456').running.map(r => r.id)).toEqual(['tu102'])
  expect(splitAgents(helpers(), NOW, 'here', 'nosuchsession').running).toEqual([])
})

test('the headline comes from the same rows as the body', () => {
  const s = splitAgents(helpers(), NOW)
  expect(agentsHead(agentsHeadOf(s))).toBe('2 running')
  const quiet = splitAgents(helpers().filter(r => r.state !== 'running'), NOW)
  expect(agentsHead(agentsHeadOf(quiet))).toBe('All done')
  expect(agentsHead(agentsHeadOf(splitAgents(helpers(), NOW, 'here', 'nosuchsession')))).toBe('None')
  expect(agentsHead(agentsHeadOf(splitAgents(helpers().filter(r => r.session === 'oldsess0'), NOW)))).toBe('None')
})

const prefsOf = (over: Record<string, unknown> = {}) =>
  ({ agents: helpers(), sid: 'abcdef123456', lists: { others: 'now', agents: 'now', from: 'all' }, agentsAll: false, cardDetail: { agents: 'explained' }, run: undefined, agentFrom: {}, ...over }) as never

test('the card model: running and the last hour show, the older 30 hide behind "Show 30 more" (one word for every list); Show fewer once open', () => {
  const m = agentsModel({ now: NOW } as never, prefsOf(), 5)
  expect(m.list.shown.map(r => r.id)).toEqual(['tu103', 'tu102', 'tu101', 'tu100'])
  expect(m.list.label).toBe('Show 30 more')
  expect(m.list.hidden).toBe(30)
  expect(m.head).toEqual({ running: 2, stuck: 0, total: 4 })
  const open = agentsModel({ now: NOW } as never, prefsOf({ agentsAll: true }), 5)
  expect(open.list.shown).toHaveLength(34)
  expect(open.visible).toBe(4)
  expect(open.list.label).toBe('Show fewer')
  const here = agentsModel({ now: NOW } as never, prefsOf({ lists: { others: 'now', agents: 'now', from: 'here' } }), 5)
  expect(here.list.shown.map(r => r.id)).toEqual(['tu102', 'tu101', 'tu100'])
  expect(here.head.running).toBe(1)
})

test('a row keeps its whole words, and a finished one says what it cost', () => {
  const rows = helpers()
  const long = rows.find(r => r.id === 'tu100')!
  expect(rowName(long).endsWith('sixty characters')).toBe(true)
  expect(rowRight({ ...long, usd: 0.65 }, NOW)).toBe('2 min · about $0.65')
  expect(rowRight(rows.find(r => r.id === 'tu102')!, NOW)).toBe('4 min')
  expect(rowDetail(long, 'This session')).toBe('haiku · Explore · This session')
})

test('/vaken text: the Agents line, a line per running and recent helper, each with the explain command, ', () => {
  const lines = agentsText(helpers(), NOW, r => (r.session.startsWith('others') ? 'Billing work' : 'This session'), '/vaken-explain agents')
  expect(lines[0]).toBe('Agents: 2 running, 2 finished in the last hour. · /vaken-explain agents')
  expect(lines).toHaveLength(5)
  expect(lines[1]).toContain('● Explore (haiku): Search part 103, running, 2 min · Billing work')
  expect(lines.every(l => l.endsWith(' · /vaken-explain agents'))).toBe(true)
  expect(agentsText([], NOW, () => '', 'x')).toEqual([])
})


test('other sessions: the count for the This session filter, None here in the headline, the cost in the second line', () => {
  expect(othersCount(helpers(), NOW, 'abcdef123456')).toBe(1)
  expect(agentsHead(agentsHeadOf(splitAgents(helpers(), NOW, 'here', 'nosuchsession'), 4))).toBe('None here')
  expect(agentsHead(agentsHeadOf(splitAgents(helpers(), NOW, 'here', 'nosuchsession'), 0))).toBe('None')
  const long = helpers().find(r => r.id === 'tu100')!
  expect(rowDetail(long, 'This session', undefined, '$0.65')).toBe('haiku · Explore · $0.65 · This session')
  expect(rowCost({ ...long, usd: 0.65 })).toBe('about $0.65')
  expect(rowCost(helpers().find(r => r.id === 'tu102')!)).toBeUndefined()
})

test('the card model: a big screen shows the newest five finished helpers, the rest behind "Show N more"', () => {
  const finished = Array.from({ length: 30 }, (_, n) => ({ ...helpers().find(r => r.id === 'tu100')!, id: `big${n}`, state: 'done' as const, startedAt: NOW - (n + 2) * MIN, endedAt: NOW - (n + 1) * MIN }))
  const m = agentsModel({ now: NOW } as never, prefsOf({ agents: finished }), 25)
  expect(m.list.shown).toHaveLength(5)
  expect(m.list.label).toBe('Show 25 more')
})
