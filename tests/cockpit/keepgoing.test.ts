// Keep going until green (core/keepgoing.ts): one press, then the Stop hook asks Claude to go on while the check fails, at most 3 rounds; and the wider done check.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { CHANGED_TITLE, KEEP_ROUNDS, KEEP_START, KEEP_STOP, KEEP_TITLE, KEEP_WORDS, atStop, changedSince, keepAfterReceipts, keepLines, keepReason, keepRowOf, startKeep } from '../hooks/core/keepgoing'
import { emptyState, readState, recordEdit, recordReceipts } from '../hooks/core/proof'
import type { ProofState } from '../hooks/core/proof'
import { lineCard } from '../hooks/features/home/linecards'
import type { CardCtx } from '../hooks/features/home/linecards'
import { keepGroups, newsFactsOf, newsGroups } from '../hooks/features/home/needs'
import type { InsideRow, NewsFacts } from '../hooks/features/home/needs'
import { KEEP_DISMISS_ROW, KEEP_STOP_ROW, keepStart } from '../hooks/features/home/rowact'
import { byEnglish } from '../hooks/i18n/table'
import { runRow } from '../hooks/features/home/actions'
import type { HomeEngine } from '../hooks/features/home/engine'
import type { Io } from '../hooks/core/io'
import { test } from './slow'

const NOW = Date.parse('2026-10-18T12:00:00Z')
const SV = byEnglish('sv')
const id = (s: string): string => s
const ON = { receiptsOn: true, stuck: false }

// One edit, then a failing test run, as the proof note holds it after a turn
const failing = (): ProofState => recordReceipts(recordEdit(emptyState(), '/w/src/a.ts'), [{ kind: 'tests', ok: false, exit: 1 }], NOW)

test('off by default: nothing is on until the press, and the Stop hook changes nothing', () => {
  const s = failing()
  expect(s.keep).toBeUndefined()
  expect(atStop(s, ON)).toEqual({ state: s })
})

test('while the check fails each turn end asks Claude to go on, at most 3 rounds, then it stops and says so', () => {
  let s = startKeep(failing(), 'tests', NOW)
  for (let n = 1; n <= KEEP_ROUNDS; n += 1) {
    const v = atStop(s, ON)
    expect(v.block).toBe(keepReason('tests', n))
    expect(v.state.keep?.rounds).toBe(n)
    s = v.state
  }
  const last = atStop(s, ON)
  expect(last.block).toBeUndefined()
  expect(last.ended).toBe('max')
  expect(last.state.keep?.end).toBe('max')
  // after the last round nothing asks again
  expect(atStop(last.state, ON).block).toBeUndefined()
})

test('the reason is one fixed English text: the check kind and the round, never a command or its output', () => {
  const r = keepReason('tests', 1)
  expect(r).toMatch(/^The tests still fail\./)
  expect(r).toMatch(/Round 1 of 3\.$/)
  expect(keepReason('build', 2)).toMatch(/^The build still fails\. .* only when it passes\. Round 2 of 3\.$/)
  expect(r).not.toMatch(/npm|exit|Exit code/)
})

test('it ends at once on a pass, when the stuck ladder offers its ways out, and when Check runs is Off', () => {
  const on = startKeep(failing(), 'tests', NOW)
  const passed = recordReceipts(on, [{ kind: 'tests', ok: true, exit: 0 }], NOW)
  const end = atStop(passed, ON)
  expect(end.ended).toBe('passed')
  expect(end.state.keep).toBeUndefined()
  expect(end.block).toBeUndefined()
  expect(atStop(on, { receiptsOn: true, stuck: true }).ended).toBe('stuck')
  expect(atStop(on, { receiptsOn: false, stuck: false }).ended).toBe('off')
  // a pass seen by the tool call ends it before the turn ends; a pass of another check does not
  expect(keepAfterReceipts(passed, [{ kind: 'tests', ok: true }]).passed).toBe('tests')
  expect(keepAfterReceipts(passed, [{ kind: 'lint', ok: true }]).passed).toBeUndefined()
  // a run whose result is not clear asks for nothing and keeps it on
  const unclear = recordReceipts(on, [{ kind: 'tests', ok: undefined, why: 'pipe' }], NOW)
  expect(atStop(unclear, ON)).toEqual({ state: unclear })
})

test('a stored note from a broken write loses its keep, never the rest', () => {
  const s = readState({ ...failing(), keep: { kind: 'nope', rounds: 1, at: NOW } })
  expect(s.keep).toBeUndefined()
  expect(s.receipts.length).toBe(1)
  expect(readState({ ...failing(), keep: { kind: 'build', rounds: 2, at: NOW } }).keep).toEqual({ kind: 'build', rounds: 2, at: NOW })
})

const ctx = (over: Partial<CardCtx> = {}): CardCtx => ({ now: NOW, ledger: [], halted: false, modes: {}, ...over })
const rowsOf = (c: CardCtx) => (lineCard('proof', c).groups ?? []).flatMap(g => g.rows)

test('Checks: one whole-row press under a failing check; it says what it does; Check runs Off hides it', () => {
  const rows = rowsOf(ctx({ proof: { ...failing(), turns: 1 } }))
  const keep = rows.find(r => r.key === 'keepgoing')
  expect(keep?.title).toBe(KEEP_TITLE.tests)
  expect(keep?.right).toBe(KEEP_START)
  expect(keep?.action).toEqual(keepStart('tests'))
  // Fix keeps its own row
  expect(rows.find(r => r.key === 'check-tests')?.right).toMatch(/Fix$/)
  expect(rowsOf(ctx({ proof: { ...failing(), turns: 1 }, modes: { 'proof.receipts': 'off' } })).some(r => r.key === 'keepgoing')).toBe(false)
  // a passing check offers nothing
  const ok = recordReceipts(recordEdit(emptyState(), '/w/a.ts'), [{ kind: 'tests', ok: true, exit: 0 }], NOW)
  expect(rowsOf(ctx({ proof: { ...ok, turns: 1 } })).some(r => r.key === 'keepgoing')).toBe(false)
})

test('Checks: while it runs the row is Stop keeping going with the rounds used', () => {
  const s = { ...startKeep(failing(), 'tests', NOW), turns: 1 }
  const keep = rowsOf(ctx({ proof: { ...s, keep: { kind: 'tests', rounds: 1, at: NOW } } })).find(r => r.key === 'keepgoing')
  expect(keep?.title).toBe(KEEP_STOP)
  expect(keep?.right).toBe('1 of 3 rounds used')
  expect(keep?.action).toEqual(KEEP_STOP_ROW)
})

test('the stuck ladder wins: no start press while its offer is up, but a running one can still be stopped', () => {
  expect(keepRowOf(failing(), ['tests'], { receiptsOn: true, stuck: true })).toBeUndefined()
  expect(keepRowOf(startKeep(failing(), 'tests', NOW), ['tests'], { receiptsOn: true, stuck: true })).toEqual({ press: 'stop', kind: 'tests', rounds: 0 })
  expect(keepRowOf(failing(), ['tests'], { receiptsOn: false, stuck: false })).toBeUndefined()
})

test('the wider done check: a file changed after a pass shows one calm row once the turn ended, never mid-turn', () => {
  let s = recordReceipts(recordEdit(emptyState(), '/w/a.ts'), [{ kind: 'tests', ok: true, exit: 0 }], NOW)
  s = recordEdit(s, '/w/src/form.ts')
  // mid-turn: the turn's edits are not counted yet
  expect(changedSince(s)).toBeUndefined()
  const ended: ProofState = { ...s, turnEdits: 0, turns: 1, last: { at: NOW, seconds: 30, edits: 2, files: 2, ran: [], claims: [], unproven: [], notChecked: [], doneSet: [] } }
  expect(changedSince(ended)).toBe('tests')
  const row = rowsOf(ctx({ proof: ended })).find(r => r.key === 'changed')
  expect(row?.title).toBe(CHANGED_TITLE.tests)
  expect(row?.right).toBe('form.ts')
  // calm: no press
  expect(row?.action).toBeUndefined()
  // a failed last run is not a pass that went stale
  expect(changedSince({ ...ended, receipts: [{ kind: 'tests', ok: false, at: NOW, seq: 1 }] })).toBeUndefined()
})

const facts = (over: Partial<NewsFacts> = {}): NewsFacts => ({ hidden: ['proof', 'ship'], halted: false, proofClaims: 0, agentTrouble: false, proofProblem: true, proofFail: 'tests', now: NOW, keepCan: true, ...over })

test('Needs you: Keep going sits beside Fix where a failing check shows, never while the stuck ladder offers', () => {
  const row = newsGroups(facts(), id).flatMap(g => g.rows as InsideRow[]).find(r => r.key === 'news-proof')
  expect(row?.inside?.label).toBe('Fix')
  expect(row?.inside?.more).toEqual([{ label: KEEP_TITLE.tests, action: keepStart('tests') }])
  const stuck = newsGroups(facts({ stuck: { kind: 'tests', shape: 's', fails: 2, at: NOW } }), id).flatMap(g => g.rows as InsideRow[]).find(r => r.key === 'news-proof')
  expect(stuck?.inside?.more).toBeUndefined()
  expect(newsGroups(facts({ keepCan: false }), id).flatMap(g => g.rows as InsideRow[]).find(r => r.key === 'news-proof')?.inside?.more).toBeUndefined()
})

test('Needs you: after the last round one calm row says so, with Fix and Dismiss', () => {
  expect(keepGroups(facts(), id)).toEqual([])
  const rows = keepGroups(facts({ keepMax: { kind: 'build', rounds: 3, at: NOW, end: 'max' } }), id).flatMap(g => g.rows as InsideRow[])
  expect(rows.length).toBe(1)
  expect(rows[0]?.title).toBe('Build still failing after 3 rounds')
  expect(rows[0]?.inside?.more).toEqual([{ label: 'Dismiss', action: KEEP_DISMISS_ROW }])
  // read from the proof note; Check runs Off hides it
  const proof: ProofState = { ...failing(), keep: { kind: 'tests', rounds: 3, at: NOW, end: 'max' } }
  expect(newsFactsOf({ hidden: [], halted: false, proof }, NOW).keepMax?.kind).toBe('tests')
  expect(newsFactsOf({ hidden: [], halted: false, proof, values: { 'proof.receipts': 'off' } }, NOW).keepMax).toBeUndefined()
  expect(newsFactsOf({ hidden: [], halted: false, proof: failing() }, NOW).keepCan).toBe(true)
  expect(newsFactsOf({ hidden: [], halted: false, proof: startKeep(failing(), 'tests', NOW) }, NOW).keepCan).toBeUndefined()
})

test('the text twin says the same facts', () => {
  expect(keepLines(failing())).toEqual([])
  expect(keepLines(startKeep(failing(), 'tests', NOW))).toEqual(['Keep going: on until the tests pass, 0 of 3 rounds used. Your next message ends it.'])
  expect(keepLines({ ...failing(), keep: { kind: 'build', rounds: 3, at: NOW, end: 'max' } })[0]).toMatch(/^Keep going: stopped after 3 rounds, the build still failing\./)
})

test('every word a person reads has Swedish', () => {
  for (const w of KEEP_WORDS) expect(SV[w] === undefined ? w : 'ok').toBe('ok')
})

// The pane's press, through the row action: it is the only way on, and it sends Claude nothing
function fakeEng(sid = 'press-sid'): { eng: HomeEngine; store: Map<string, unknown>; sent: string[]; toasts: string[] } {
  const store = new Map<string, unknown>()
  const sent: string[] = []
  const toasts: string[] = []
  const io = {
    now: async () => NOW,
    home: async () => '/home/me',
    sessionId: async () => sid,
    get: async (k: string) => store.get(k),
    set: async (k: string, v: unknown) => void store.set(k, v),
    del: async (k: string) => void store.delete(k),
    keys: async () => [...store.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ text: '' }),
    toast: (t: string) => void toasts.push(t),
    invalidate: () => undefined,
  } as unknown as Io
  const eng = { io: () => io, cwd: async () => '/w', submit: async (t: string) => void sent.push(t) } as unknown as HomeEngine
  return { eng, store, sent, toasts }
}

test('the presses: Start turns it on for this session, Stop turns it off, Dismiss takes the last-round row away; nothing is sent to Claude', async () => {
  const f = fakeEng()
  f.store.set('cockpit:proof:press-sid', failing())
  await runRow(f.eng, keepStart('tests'))
  expect(readState(f.store.get('cockpit:proof:press-sid')).keep).toEqual({ kind: 'tests', rounds: 0, at: NOW })
  expect(f.toasts.at(-1)).toMatch(/^Keep going is on, at most 3 rounds\./)
  await runRow(f.eng, KEEP_STOP_ROW)
  expect(readState(f.store.get('cockpit:proof:press-sid')).keep).toBeUndefined()
  expect(f.sent).toEqual([])
  // a session's note is held in memory once read, so the last round is seeded in a fresh session
  const g = fakeEng('press-sid-2')
  g.store.set('cockpit:proof:press-sid-2', { ...failing(), keep: { kind: 'tests', rounds: 3, at: NOW, end: 'max' } })
  await runRow(g.eng, KEEP_DISMISS_ROW)
  expect(readState(g.store.get('cockpit:proof:press-sid-2')).keep).toBeUndefined()
  expect(g.sent).toEqual([])
})

// ---- The hooks, through the engine ----

function engine(on: On, sid: string, bash: (command: string) => { isError?: true; text: string } = () => ({ text: 'ok' })): Map<string, unknown> {
  mock.clock(on, { now: NOW })
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
  mock.session(on)
  on('session.id', () => ({ value: sid }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('classic.Stop', () => ({}) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  on('tool.call', { tool: /^(Bash|PowerShell)$/ }, (_$, e) => {
    const r = bash(String((e as unknown as { command: string }).command))
    return { result: { stdout: r.text, stderr: '', code: r.isError === true ? 1 : 0 }, text: r.text, ...(r.isError === true ? { isError: true } : {}) } as never
  })
  return mem
}

const stop = (sid: string, over: Record<string, unknown> = {}) => ({ session_id: sid, transcript_path: '', cwd: '/w', hook_event_name: 'Stop', stop_hook_active: false, ...over }) as never
const noteOf = (mem: Map<string, unknown>, sid: string): ProofState => readState(mem.get(`cockpit:proof:${sid}`))

test('the Stop hook: blocks with the fixed reason while the pressed check fails, counts the round, and stops after 3', async ($, on) => {
  const mem = engine(on, 's-stop')
  mem.set('cockpit:proof:s-stop', startKeep(failing(), 'tests', NOW))
  for (let n = 1; n <= KEEP_ROUNDS; n += 1) {
    const r = (await $.classic.Stop(stop('s-stop'))) as { block?: string }
    expect(r.block).toBe(keepReason('tests', n))
  }
  const last = (await $.classic.Stop(stop('s-stop'))) as { block?: string }
  expect(last.block).toBeUndefined()
  expect(noteOf(mem, 's-stop').keep?.end).toBe('max')
  // nothing of a command or Claude's words is kept
  expect(JSON.stringify(noteOf(mem, 's-stop').keep)).toBe(JSON.stringify({ kind: 'tests', rounds: 3, at: NOW, end: 'max' }))
})

test('the Stop hook: off without the press, quiet for an agent, and Check runs Off ends it', async ($, on) => {
  const mem = engine(on, 's-off')
  mem.set('cockpit:proof:s-off', failing())
  expect(((await $.classic.Stop(stop('s-off'))) as { block?: string }).block).toBeUndefined()
  mem.set('cockpit:proof:s-off', startKeep(failing(), 'tests', NOW))
  expect(((await $.classic.Stop(stop('s-off', { agent_id: 'sub' }))) as { block?: string }).block).toBeUndefined()
  mem.set('cockpit:setting:proof.receipts', 'off')
  expect(((await $.classic.Stop(stop('s-off'))) as { block?: string }).block).toBeUndefined()
  expect(noteOf(mem, 's-off').keep).toBeUndefined()
})

test('the person\'s message ends it; a slash command does not', async ($, on) => {
  const mem = engine(on, 's-msg')
  mem.set('cockpit:proof:s-msg', startKeep(failing(), 'tests', NOW))
  await $.prompt.submit({ text: '/vaken' } as never)
  expect(noteOf(mem, 's-msg').keep).toBeDefined()
  await $.prompt.submit({ text: 'Leave the tests for now please' } as never)
  expect(noteOf(mem, 's-msg').keep).toBeUndefined()
  expect(((await $.classic.Stop(stop('s-msg'))) as { block?: string }).block).toBeUndefined()
})

test('a pass of the check ends it at once, before the turn ends', async ($, on) => {
  const mem = engine(on, 's-pass')
  mem.set('cockpit:proof:s-pass', startKeep(failing(), 'tests', NOW))
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(noteOf(mem, 's-pass').keep).toBeUndefined()
  expect(((await $.classic.Stop(stop('s-pass'))) as { block?: string }).block).toBeUndefined()
})

test('a new session start never carries it over', async ($, on) => {
  const mem = engine(on, 's-start')
  mem.set('cockpit:proof:s-start', startKeep(failing(), 'tests', NOW))
  await $.session.start({ cwd: '/w', surface: 'desktop', isInteractive: true } as never)
  expect(noteOf(mem, 's-start').keep).toBeUndefined()
})
