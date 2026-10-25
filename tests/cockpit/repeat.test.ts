// Repeat to skill (core/repeat.ts): the same routine after a person prompt, 3 times in 14 days in a project, becomes one calm offer in the Skills card
// (or Needs you with Skills hidden). Only the hashed shape of step kinds is kept; Draft the skill sends one fixed request; Not now quiets it for 14 days.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import {
  REPEAT_AFTER, REPEAT_ASKED, REPEAT_DRAFT, REPEAT_QUIETED, REPEAT_QUIET_MS, REPEAT_WINDOW_MS, REPEAT_WORDS, STEPS_MAX, addStep, countShape, draftPrompt, editStep, newRoutine, parseRepeat, plainShape, quietShape, repeatKey, repeatMem, shapeHash, shellStep, skillSlug, slashHash,
} from '../hooks/core/repeat'
import type { Routine, StepCode } from '../hooks/core/repeat'
import { endRoutine, routineFor } from '../hooks/features/repeat'
import { runRepeat } from '../hooks/features/home/actions'
import type { HomeEngine } from '../hooks/features/home/engine'
import { newsFactsOf, newsGroups, repeatGroups } from '../hooks/features/home/needs'
import type { InsideRow } from '../hooks/features/home/needs'
import { REPEAT_NO, REPEAT_YES } from '../hooks/features/home/rowact'
import { lineCard } from '../hooks/features/home/linecards'
import { nextMem } from '../hooks/core/actions'
import { OFFER_KINDS, offersKey, parseBook, forgetLearn, learnMem } from '../hooks/core/offerlearn'
import type { Io } from '../hooks/core/io'
import { byEnglish } from '../hooks/i18n/table'
import { test } from './slow'

const NOW = Date.parse('2026-10-18T12:00:00Z')
const DAY = 86_400_000
const SV = byEnglish('sv')
const sv = (s: string): string => SV[s] ?? s

const run = (calls: [string, Record<string, unknown>, boolean?][], slash?: string): Routine => calls.reduce((r, [tool, f, err]) => addStep(r, tool, f, err === true), newRoutine(slash))
const TEST_FIX_COMMIT: [string, Record<string, unknown>, boolean?][] = [
  ['Read', { file_path: '/w/app/src/a.ts' }],
  ['Bash', { command: 'npm test' }, true],
  ['Edit', { file_path: '/w/app/src/a.ts' }],
  ['Edit', { file_path: '/w/app/src/b.ts' }],
  ['Bash', { command: 'npm test' }],
  ['Bash', { command: 'git status' }],
  ['Bash', { command: 'git add -A && git commit -m "secret words"' }],
]

test('the steps: kinds of tools, checks and files only; looks are left out, a repeat counts once, an edit after a failed check is a fix', () => {
  expect(editStep('/w/app/src/a.ts')).toBe('edit-code')
  expect(editStep('/w/app/src/a.test.ts')).toBe('edit-tests')
  expect(editStep('README.md')).toBe('edit-docs')
  expect(editStep('package.json')).toBe('edit-config')
  expect(editStep('app.css')).toBe('edit-styles')
  expect(editStep('photo.png')).toBe('edit-files')
  expect(shellStep('npm test')).toBe('test')
  expect(shellStep('cd /w/app && npm run build')).toBe('build')
  expect(shellStep('npx eslint .')).toBe('lint')
  expect(shellStep('git push origin main')).toBe('push')
  expect(shellStep('gh pr create --fill')).toBe('pr')
  expect(shellStep('ls -la')).toBeUndefined()
  expect(shellStep('git diff HEAD')).toBeUndefined()
  expect(shellStep('./deploy.sh')).toBe('run')
  const r = run(TEST_FIX_COMMIT)
  expect(r.steps).toEqual(['test', 'fix', 'test', 'commit'])
  expect(r.failed).toBe(false)
  // an agent's own tools and vaken's own tool are no steps of the person's routine
  expect(run([['mcp__vaken__vaken_status', {}]]).steps).toEqual([])
  expect(run([['Agent', {}], ['Skill', {}], ['mcp__docs__search', {}]]).steps).toEqual(['agents', 'skill', 'mcp'])
})

test('the shape: 3 to 8 steps, hashed with no words of the session; a slash command counts by the hash of its name', () => {
  const r = run(TEST_FIX_COMMIT)
  const h = shapeHash(r)
  expect(h).toBeDefined()
  expect(h).not.toMatch(/test|commit|secret/)
  expect(shapeHash(run(TEST_FIX_COMMIT))).toBe(h)
  expect(shapeHash(run([['Bash', { command: 'npm test' }], ['Edit', { file_path: 'a.ts' }]]))).toBeUndefined()
  const long: Routine = { steps: Array.from({ length: STEPS_MAX + 1 }, (_, n) => (n % 2 === 0 ? 'test' : 'edit-code') as StepCode), failed: false }
  expect(shapeHash(long)).toBeUndefined()
  const s = slashHash('/release now please')
  expect(s).toBeDefined()
  expect(slashHash('/Release')).toBe(s)
  expect(slashHash('plain words')).toBeUndefined()
  expect(shapeHash(run(TEST_FIX_COMMIT, s))).not.toBe(h)
  expect(run(TEST_FIX_COMMIT, s).steps[0]).toBe('slash')
})

test('the third time within 14 days offers once and starts the count again; an old time does not count; a quiet shape is not offered', () => {
  let st = parseRepeat(undefined)
  for (const n of [0, 1]) {
    const c = countShape(st, 'h1', NOW + n * DAY)
    expect(c.offer).toBe(false)
    st = c.state
  }
  const third = countShape(st, 'h1', NOW + 2 * DAY)
  expect(third.offer).toBe(true)
  expect(third.state.seen.h1).toBeUndefined()
  // two old times and one new: no offer
  const old = countShape({ seen: { h2: [NOW - REPEAT_WINDOW_MS - 2 * DAY, NOW - REPEAT_WINDOW_MS - DAY] }, quiet: {} }, 'h2', NOW)
  expect(old.offer).toBe(false)
  expect(old.state.seen.h2).toEqual([NOW])
  // quiet: no offer until it ends
  const q = quietShape({ seen: { h3: [NOW - 2 * DAY, NOW - DAY] }, quiet: {} }, 'h3', NOW + REPEAT_QUIET_MS)
  expect(q.seen.h3).toBeUndefined()
  let qs = q
  for (let n = 0; n < REPEAT_AFTER; n += 1) qs = countShape(qs, 'h3', NOW + n).state
  expect(countShape(q, 'h3', NOW).offer).toBe(false)
  expect(Object.keys(qs.quiet)).toEqual(['h3'])
  expect(parseRepeat({ seen: { a: [1, 'x', 2] }, quiet: { a: 'no', b: 5 } })).toEqual({ seen: { a: [1, 2] }, quiet: { b: 5 } })
})

test('the words: a short plain shape in English and Swedish, a folder name from the steps, one fixed request with no session words', () => {
  const steps: StepCode[] = ['test', 'fix', 'commit']
  expect(plainShape(steps)).toBe('run tests, fix, commit')
  expect(plainShape(steps, sv)).toBe('kör tester, rätta, spara en commit')
  expect(skillSlug(steps)).toBe('test-fix-commit')
  expect(skillSlug(['edit-code', 'edit-files', 'test'])).toBe('edit-test')
  const p = draftPrompt(steps)
  expect(p).toMatch(/\.claude\/skills\/test-fix-commit\/SKILL\.md/)
  expect(p).toMatch(/run tests, fix, commit/)
  expect(p).toMatch(/Show me the file when it is written so I can review it\.$/)
  for (const w of REPEAT_WORDS) expect(SV[w] === undefined ? w : 'ok').toBe('ok')
  expect(OFFER_KINDS).toContain('repeat')
})

function fakeIo(seed: Record<string, unknown> = {}): { io: Io; store: Map<string, unknown>; toasts: string[] } {
  const store = new Map<string, unknown>(Object.entries(seed))
  const toasts: string[] = []
  const io = {
    now: async () => NOW,
    home: async () => '/home/me',
    sessionId: async () => 'sid-1',
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
  return { io, store, toasts }
}

test('the end of an answer: the third same routine sets the offer; an interrupted answer, Skill coach off or a waiting offer count nothing', async () => {
  repeatMem.offer = undefined
  const f = fakeIo()
  const h = shapeHash(run(TEST_FIX_COMMIT)) as string
  for (const at of [NOW - 2 * DAY, NOW - DAY]) f.store.set(repeatKey('/w/app'), { seen: { [h]: [...(parseRepeat(f.store.get(repeatKey('/w/app'))).seen[h] ?? []), at] }, quiet: {} })
  repeatMem.cur = run(TEST_FIX_COMMIT)
  expect(await endRoutine(f.io, '/w/app', false)).toBeUndefined()
  expect(repeatMem.cur).toBeUndefined()
  repeatMem.cur = run(TEST_FIX_COMMIT)
  const offer = await endRoutine(f.io, '/w/app', true)
  expect(offer?.steps).toEqual(['test', 'fix', 'test', 'commit'])
  expect(repeatMem.offer?.hash).toBe(h)
  // only hashes and times are stored
  expect(JSON.stringify([...f.store.values()])).not.toMatch(/test|commit|secret|app/)
  // another offer waits: nothing is counted
  repeatMem.cur = run(TEST_FIX_COMMIT)
  await endRoutine(f.io, '/w/app', true)
  expect(parseRepeat(f.store.get(repeatKey('/w/app'))).seen[h]).toBeUndefined()
  repeatMem.offer = undefined
  const off = fakeIo({ 'cockpit:setting:coach.mode': 'off' })
  repeatMem.cur = run(TEST_FIX_COMMIT)
  await endRoutine(off.io, '/w/app', true)
  expect(off.store.has(repeatKey('/w/app'))).toBe(false)
})

const OFFER = { hash: 'abc', steps: ['test', 'fix', 'commit'] as StepCode[], root: '/w/app' }

test('the offer leads the Skills card as one sentence row with two presses, and sits in Needs you only while Skills is hidden', () => {
  repeatMem.offer = OFFER
  const v = lineCard('skills', { now: NOW, ledger: [], halted: false, modes: {} })
  const first = v.groups?.[0]?.rows[0] as InsideRow | undefined
  expect(first?.title).toBe('You did this 3 times: run tests, fix, commit')
  expect(first?.right).toBeUndefined()
  expect(first?.what.means).toMatch(/^Save it as a skill\? Draft the skill asks Claude to write \.claude\/skills\/test-fix-commit\/SKILL\.md/)
  expect(first?.inside).toEqual({ label: REPEAT_DRAFT, action: REPEAT_YES, more: [{ label: 'Not now', action: REPEAT_NO }] })
  const svRow = repeatGroups(OFFER, sv)[0]?.rows[0]
  expect(svRow?.title).toBe('Du har gjort det här 3 gånger: kör tester, rätta, spara en commit')
  const shown = newsFactsOf({ hidden: [], halted: false }, NOW)
  expect(shown.repeat).toBeUndefined()
  expect(newsGroups(shown, s => s).some(g => g.rows.some(r => r.key === 'repeat'))).toBe(false)
  const hidden = newsFactsOf({ hidden: ['skills'], halted: false }, NOW)
  expect(newsGroups(hidden, s => s).some(g => g.rows.some(r => r.key === 'repeat'))).toBe(true)
  repeatMem.offer = undefined
  expect(lineCard('skills', { now: NOW, ledger: [], halted: false, modes: {} }).groups).toBeUndefined()
})

function fakeEng(): { eng: HomeEngine; sent: string[]; toasts: string[]; store: Map<string, unknown> } {
  const f = fakeIo()
  const sent: string[] = []
  const eng = { io: () => f.io, cwd: async () => '/w/app', submit: async (t: string) => void sent.push(t) } as unknown as HomeEngine
  return { eng, sent, toasts: f.toasts, store: f.store }
}

test('the presses: Draft the skill sends one fixed request only while Claude is idle; Not now quiets the shape for 14 days; vaken writes no file', async () => {
  forgetLearn()
  learnMem.root = '/w/app'
  const f = fakeEng()
  repeatMem.offer = OFFER
  nextMem.busy = true
  await runRepeat(f.eng, true)
  expect(f.sent).toEqual([])
  expect(repeatMem.offer).toBeDefined()
  nextMem.busy = false
  await runRepeat(f.eng, true)
  expect(f.sent).toEqual([draftPrompt(OFFER.steps)])
  expect(f.toasts.at(-1)).toBe(REPEAT_ASKED)
  expect(repeatMem.offer).toBeUndefined()
  expect(parseRepeat(f.store.get(repeatKey('/w/app'))).quiet.abc).toBeGreaterThan(NOW + REPEAT_QUIET_MS)
  expect(parseBook(f.store.get(offersKey('/w/app'))).kinds.repeat?.pressed).toBe(1)
  // no offer, no press
  await runRepeat(f.eng, true)
  expect(f.sent.length).toBe(1)
  const g = fakeEng()
  repeatMem.offer = OFFER
  await runRepeat(g.eng, false)
  expect(g.sent).toEqual([])
  expect(g.toasts.at(-1)).toBe(REPEAT_QUIETED)
  expect(parseRepeat(g.store.get(repeatKey('/w/app'))).quiet.abc).toBe(NOW + REPEAT_QUIET_MS)
  expect(parseBook(g.store.get(offersKey('/w/app'))).kinds.repeat?.dismissed).toBe(1)
  forgetLearn()
})

function memStore(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
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
  return mem
}

function world(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
  mock.clock(on, { now: NOW })
  const mem = memStore(on, seed)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.root', () => ({ value: '/w/app' }) as never)
  on('session.cwd', () => ({ value: '/w/app' }) as never)
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  on('turn.complete', (_$, e) => ({ text: (e as { answer?: string }).answer ?? '' }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  let failing = true
  on('tool.call', { tool: 'Bash' }, (_$, e) => {
    const c = String((e as unknown as { command?: unknown }).command)
    const fail = c === 'npm test' && failing
    if (c === 'npm test') failing = !failing
    return (fail ? { result: { stdout: '', stderr: 'boom', code: 1 }, text: 'Exit code 1\nboom', isError: true } : { result: { stdout: 'ok', stderr: '', code: 0 }, text: 'ok' }) as never
  })
  on('tool.call', { tool: 'Edit' }, () => ({ result: { text: 'ok' }, text: 'ok' }) as never)
  return mem
}

type Drive = { prompt: { submit: (e: unknown) => Promise<unknown> }; tool: { call: (e: unknown) => Promise<unknown> }; turn: { complete: (e: unknown) => Promise<unknown> } }
async function routine($: Drive, n: number): Promise<void> {
  await $.prompt.submit({ text: 'please run the tests and fix them, then commit with the words pineapple', origin: { kind: 'composer' } })
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: `t${n}a` })
  await $.tool.call({ tool: 'Edit', file_path: '/w/app/src/pineapple.ts', old_string: 'a', new_string: 'b', tool_use_id: `t${n}b` })
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: `t${n}c` })
  await $.tool.call({ tool: 'Bash', command: 'git commit -m pineapple', tool_use_id: `t${n}d` })
  await $.turn.complete({ answer: 'Done.', durationMs: 1000, isAborted: false, turnId: `turn${n}`, reason: 'answer' })
}

const seenOf = (mem: Map<string, unknown>): Record<string, number[]> => parseRepeat(mem.get(repeatKey('/w/app'))).seen

test('in the engine: two same routines are counted per project, the third offers and starts again; no words of the prompt, command or file are stored', async ($, on) => {
  const mem = world(on)
  await routine($ as unknown as Drive, 1)
  await routine($ as unknown as Drive, 2)
  const seen = seenOf(mem)
  expect(Object.values(seen).map(t => t.length)).toEqual([2])
  await routine($ as unknown as Drive, 3)
  // the offer took the count: it starts again
  expect(Object.values(seenOf(mem)).map(t => t.length)).toEqual([])
  expect(JSON.stringify(mem.get(repeatKey('/w/app')))).not.toMatch(/pineapple|npm|git|test|commit|app/)
})

test('only the person\'s own prompt starts a routine; in the engine, Skill coach off counts nothing', async ($, on) => {
  expect(routineFor('run the tests', { kind: 'composer' })?.steps).toEqual([])
  expect(routineFor('run the tests', { kind: 'bridge' })).toBeDefined()
  expect(routineFor('/release', { kind: 'composer' })?.steps).toEqual(['slash'])
  for (const o of [{ kind: 'plugin', name: 'vaken' }, { kind: 'peer' }, { kind: 'scheduled-trigger' }, undefined]) expect(routineFor('run the tests', o)).toBeUndefined()
  expect(routineFor('  ', { kind: 'composer' })).toBeUndefined()
  const mem = world(on, { 'cockpit:setting:coach.mode': 'off' })
  for (const n of [1, 2, 3]) await routine($ as unknown as Drive, n)
  expect(mem.has(repeatKey('/w/app'))).toBe(false)
})
