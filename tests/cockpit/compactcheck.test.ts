// Compact check: the keep-list learns the goal, the files edited and the checks failing now; after a compaction each item is looked for
// in the summary, the summary is never kept, and Put it back sends Claude one short note.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import type { Io } from '../hooks/core/io'
import { KEEP_FILES_MAX, KEEP_SHOW_MS, checkSummary, editedNames, keepListItems, keepMem, keptIn, learnedLines, liveCheck, lostNames, putBackNote } from '../hooks/core/compactcheck'
import { diffKey, diffWords } from '../hooks/core/compactdiff'
import type { Diff } from '../hooks/core/compactdiff'
import { emptyState, recordReceipts, stateKey } from '../hooks/core/proof'
import { indexKey } from '../hooks/core/undo'
import { keepList, keepPlan, runCompaction, setAutoSaver } from '../hooks/features/compaction'
import type { CompactOps } from '../hooks/features/compaction'
import { runPutBack } from '../hooks/features/home/actions'
import type { HomeEngine } from '../hooks/features/home/engine'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { BASE_SEEDS, HOME, NOW as FX_NOW, SETUP_BASE, engine, propsAt, textsOf } from './statefixtures'
import type { Pane, World } from './statefixtures'

const NOW = Date.parse('2026-10-17T12:00:00Z')
const MIN = 60_000

function memIo(sid: string): { io: Io; mem: Map<string, unknown>; toasts: string[] } {
  const mem = new Map<string, unknown>()
  const toasts: string[] = []
  const io: Io = {
    now: async () => NOW,
    home: async () => '/home/test',
    sessionId: async () => sid,
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, v),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: text => void toasts.push(text),
    invalidate: () => undefined,
  }
  return { io, mem, toasts }
}

// A session with a title, a goal of its own words, two edited files and failing tests
function seeded(sid: string): ReturnType<typeof memIo> {
  const w = memIo(sid)
  w.mem.set(`cockpit:session:${sid}`, { sessionId: sid, cwd: '/work/app', model: 'claude-opus-5', state: 'idle', startedAt: NOW - 60 * MIN, updatedAt: NOW, lastEventAt: NOW, stateSince: NOW, title: 'fix login', branch: 'feat-x' })
  const proof = { ...recordReceipts(emptyState(), [{ kind: 'tests', ok: false }], NOW - 5 * MIN), goal: { text: 'password reset email', setAt: NOW - 50 * MIN, how: 'typed' as const } }
  w.mem.set(stateKey(sid), proof)
  w.mem.set(indexKey(sid), { next: 3, snaps: [{ id: 1, path: '/work/app/src/old.ts', at: NOW - 40 * MIN }, { id: 2, path: '/work/app/src/reset.ts', at: NOW - 10 * MIN }] })
  return w
}

test('the keep-list items: the goal, each edited file once (newest first, capped), each failing check', () => {
  const paths = ['/a/x.ts', '/b/x.ts', ...Array.from({ length: 9 }, (_, n) => `/a/f${n}.ts`)]
  expect(editedNames(paths)).toHaveLength(KEEP_FILES_MAX)
  expect(editedNames(paths)[0]).toBe('x.ts')
  const items = keepListItems({ goal: 'password reset email', edited: ['/a/reset.ts'], failing: ['tests', 'types'] })
  expect(items).toEqual([{ kind: 'goal', name: 'password reset email' }, { kind: 'file', name: 'reset.ts' }, { kind: 'check', name: 'tests' }, { kind: 'check', name: 'types' }])
  expect(learnedLines(items, false)).toEqual(['Keep the goal in its own words: password reset email.', 'Name each file edited in this session: reset.ts.', 'Say which checks fail now: tests, the type check.'])
  // The goal already in the first line (the session title) is not said twice
  expect(learnedLines(items, true)[0]).toBe('Name each file edited in this session: reset.ts.')
  expect(learnedLines([], false)).toEqual([])
})

test('an item is kept when the summary names it: a file by name, a check by its word, a goal by half its longer words', () => {
  expect(keptIn({ kind: 'file', name: 'Reset.ts' }, 'edited reset.ts and app.ts')).toBe(true)
  expect(keptIn({ kind: 'file', name: 'login.ts' }, 'edited reset.ts')).toBe(false)
  expect(keptIn({ kind: 'check', name: 'types' }, 'the type check still fails')).toBe(true)
  expect(keptIn({ kind: 'check', name: 'tests' }, 'nothing about it')).toBe(false)
  expect(keptIn({ kind: 'goal', name: 'password reset email' }, 'working on the password email')).toBe(true)
  expect(keptIn({ kind: 'goal', name: 'password reset email' }, 'working on the login')).toBe(false)
  const c = checkSummary('s1', [{ kind: 'file', name: 'a.ts' }, { kind: 'check', name: 'lint' }], 'A.ts was changed', NOW)
  expect(c).toEqual({ sid: 's1', at: NOW, total: 2, missing: [{ kind: 'check', name: 'lint' }] })
})

test('the line shows for this session only, for a while, and names three items then and N more (a check lowercase mid-sentence)', () => {
  const c = { sid: 's1', at: NOW, total: 5, missing: [{ kind: 'goal', name: 'g' }, { kind: 'file', name: 'a.ts' }, { kind: 'check', name: 'tests' }, { kind: 'file', name: 'b.ts' }] } as const
  const k = { ...c, missing: [...c.missing] }
  expect(liveCheck(k, 's1', NOW + MIN)).toBe(k)
  expect(liveCheck(k, 's2', NOW + MIN)).toBeUndefined()
  expect(liveCheck(k, 's1', NOW + KEEP_SHOW_MS)).toBeUndefined()
  expect(liveCheck({ ...k, missing: [] }, 's1', NOW)).toBeUndefined()
  expect(lostNames(k.missing, s => s, kind => kind.toUpperCase())).toBe('the goal, a.ts, tests and 1 more')
  expect(putBackNote(k.missing)).toBe('The last compaction left these out of its summary. Keep them in mind, no need to answer at length: the goal: g; the files edited: a.ts, b.ts; the checks failing now: tests.')
})

test('the keep-list sent to the summary carries the learned lines; with nothing learned it is as before', async () => {
  const w = seeded('sid-learn')
  const plan = await keepPlan(w.io, 'sid-learn', ['/work/app/src/new.ts'])
  const lines = plan.text.split('\n')
  expect(lines[1]).toBe('Keep the goal in its own words: password reset email.')
  expect(lines[2]).toBe('Name each file edited in this session: new.ts, reset.ts, old.ts.')
  expect(lines[3]).toBe('Say which checks fail now: tests.')
  expect(plan.items).toHaveLength(5)
  expect(await keepList(w.io, 'sid-learn')).toBe(plan.text.replace('new.ts, ', ''))
})

test('our own compaction checks the summary: the counts are stored, never the summary text; Put it back sends one note', async () => {
  const sid = 'sid-check'
  const w = seeded(sid)
  w.mem.set('cockpit:setting:compact.card', 'on')
  setAutoSaver(async () => ({ ok: true, name: 'b.md', shown: '~/b.md', checkpoint: false }))
  const SUMMARY = 'SECRET-SUMMARY-WORDS: we changed reset.ts for the password reset email.'
  const ops: CompactOps = { io: w.io, cwd: async () => '/work/app', probe: async () => undefined, agents: async () => 0, command: async () => undefined, direct: async () => ({ tokensBefore: 200_000, tokensAfter: 10_000, summary: SUMMARY }) }
  expect(await runCompaction({ how: 'button', sessionId: sid, ops })).toBe('sent')
  setAutoSaver(undefined)
  const last = keepMem.last
  expect(last?.total).toBe(4)
  expect(last?.missing).toEqual([{ kind: 'file', name: 'old.ts' }, { kind: 'check', name: 'tests' }])
  const diff = w.mem.get(diffKey(sid)) as Diff
  expect(diff.keep).toEqual({ total: 4, lost: 2 })
  expect(diffWords(diff)).toMatch(/It left out 2 of 4 items of the keep-list/)
  expect(JSON.stringify([...w.mem.values()]).includes('SECRET-SUMMARY-WORDS')).toBe(false)
  const sent: string[] = []
  const eng = { io: () => w.io, submit: async (t: string) => void sent.push(t) } as unknown as HomeEngine
  await runPutBack(eng)
  expect(sent).toEqual(['The last compaction left these out of its summary. Keep them in mind, no need to answer at length: the files edited: old.ts; the checks failing now: tests.'])
  expect(keepMem.last).toBeUndefined()
  // A second press does nothing
  await runPutBack(eng)
  expect(sent).toHaveLength(1)
})

test('with the keep-list off nothing is checked, and a summary that keeps all clears the line', async () => {
  const sid = 'sid-off'
  const w = seeded(sid)
  w.mem.set('cockpit:setting:compact.card', 'off')
  setAutoSaver(async () => ({ ok: true, name: 'b.md', shown: '~/b.md', checkpoint: false }))
  const ops: CompactOps = { io: w.io, cwd: async () => '/work/app', probe: async () => undefined, agents: async () => 0, command: async () => undefined, direct: async () => ({ summary: 'nothing' }) }
  await runCompaction({ how: 'button', sessionId: sid, ops })
  expect(keepMem.last).toBeUndefined()
  expect((w.mem.get(diffKey(sid)) as Diff).keep).toBeUndefined()
  w.mem.set('cockpit:setting:compact.card', 'on')
  const all: CompactOps = { ...ops, direct: async () => ({ summary: 'password reset email; reset.ts, old.ts; tests fail' }) }
  await runCompaction({ how: 'button', sessionId: sid, ops: all })
  setAutoSaver(undefined)
  expect(keepMem.last?.missing).toEqual([])
  expect((w.mem.get(diffKey(sid)) as Diff).keep).toEqual({ total: 4, lost: 0 })
})

// Through the engine: a compaction passes vaken's own hook, the This session card says what the summary left out, and its press sends the note
test('a real compaction: This session says what the summary left out in one line; a press sends Claude one note', { timeoutMs: 60_000 }, async ($, on) => {
  mock.clock(on, { now: FX_NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:setting:compact.card', 'on')
  w.mem.set(stateKey('test-session'), { ...recordReceipts(emptyState(), [{ kind: 'tests', ok: false }], FX_NOW - 5 * MIN), goal: { text: 'login page error message', setAt: FX_NOW - 50 * MIN, how: 'typed' } })
  const { sent } = engine(on, w)
  const SUMMARY = 'SECRET-SUMMARY-WORDS: the login page error message is done.'
  on('session.compact', () => ({ messages: [{ role: 'user', text: SUMMARY, toolUses: [] }], tokensBefore: 200_000, tokensAfter: 9_000 }) as never)
  await $.session.compact({ trigger: 'manual', messages: [{ role: 'assistant', text: 'ok', toolUses: [{ tool_use_id: 'u1', tool: 'Edit', input: { file_path: '/work/app/src/LoginForm.tsx' } }] }] } as never)
  expect((w.mem.get(diffKey('test-session')) as Diff).keep).toEqual({ total: 3, lost: 2 })
  expect(JSON.stringify([...w.mem.values()]).includes('SECRET-SUMMARY-WORDS')).toBe(false)
  forgetProjectSet()
  forgetContext()
  const ui = (await ($ as unknown as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(420) })) as Pane
  await ui.redraw()
  expect(textsOf(await ui.drawn())).toContain('The compaction left out LoginForm.tsx, tests')
  await ui.press({ key: 'press-keep-check-0' })
  await ui.redraw()
  expect(sent).toEqual(['The last compaction left these out of its summary. Keep them in mind, no need to answer at length: the files edited: LoginForm.tsx; the checks failing now: tests.'])
  expect(textsOf(await ui.drawn())).not.toContain('The compaction left out LoginForm.tsx, tests')
  await ui.unmount()
})
