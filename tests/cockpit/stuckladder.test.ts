// The stuck ladder (core/loopbreaker.ts): the same check failing 3 times in a row with the same error offers a way out, counted from the named failure event.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { LADDER_FAILS, STUCK_FRESH, STUCK_NEXT_FRESH, STUCK_QUEUED, STUCK_STRONG, STUCK_TTL_MS, STUCK_WORDS, checkShape, errKey, firstSight, freshStuckLine, ladderClear, ladderFail, ladderPass, liveStuck, newLadder, stronger, strongPrompt, stuckMem } from '../hooks/core/loopbreaker'
import { finishMem } from '../hooks/core/continuity'
import { HELP } from '../hooks/features/home/views/help'
import { SETTINGS } from '../hooks/core/settings'
import { newsFactsOf, stuckGroups } from '../hooks/features/home/needs'
import type { InsideRow, NewsFacts } from '../hooks/features/home/needs'
import { STUCK_FRESH_ROW, STUCK_STRONG_ROW } from '../hooks/features/home/rowact'
import { runStuck } from '../hooks/features/home/actions'
import type { HomeEngine } from '../hooks/features/home/engine'
import type { Io } from '../hooks/core/io'
import { nextMem } from '../hooks/core/actions'
import { byEnglish } from '../hooks/i18n/table'
import { test } from './slow'

const NOW = Date.parse('2026-10-17T12:00:00Z')
const SV = byEnglish('sv')
const id = (s: string): string => s

test('a check is known by its shape: paths, quoted text and numbers left out; a command that is no check has none', () => {
  const a = checkShape('npm test -- src/a.test.ts')
  expect(a?.kind).toBe('tests')
  expect(checkShape('npm test -- src/b.test.ts')?.shape).toBe(a?.shape)
  expect(checkShape('npm test -- -t "first name"')?.shape).toBe(checkShape('npm test -- -t "other name"')?.shape)
  expect(checkShape('npm run build')?.kind).toBe('build')
  expect(checkShape('npm run build')?.shape).not.toBe(a?.shape)
  expect(checkShape('ls -la')).toBeUndefined()
  // the shape is a short hash, never the command's text
  expect(a?.shape).not.toMatch(/npm|test|src/)
})

const E = errKey('Exit code 1\nboom')
const F = errKey('Exit code 1\nsomething else')

test('the third failure in a row with the same error offers once; a pass starts again and takes the offer back', () => {
  const l = newLadder()
  expect(ladderFail(l, 'npm test', NOW, E)).toBeUndefined()
  expect(ladderFail(l, 'npm test', NOW + 1, E)).toBeUndefined()
  const offer = ladderFail(l, 'npm test', NOW + 2, E)
  expect(LADDER_FAILS).toBe(3)
  expect(offer).toEqual({ kind: 'tests', shape: checkShape('npm test')?.shape, fails: LADDER_FAILS, at: NOW + 2 })
  expect(ladderFail(l, 'npm test', NOW + 3, E)).toBeUndefined()
  const mem = { offer }
  expect(ladderPass(l, 'npm run build', mem)).toBe(false)
  expect(ladderPass(l, 'npm test', mem)).toBe(true)
  expect(mem.offer).toBeUndefined()
  expect(ladderFail(l, 'npm test', NOW + 4, E)).toBeUndefined()
  expect(ladderFail(l, 'ls', NOW, E)).toBeUndefined()
})

test('another error starts the count again: three failures with three different errors never offer', () => {
  const l = newLadder()
  expect(ladderFail(l, 'npm test', NOW, E)).toBeUndefined()
  expect(ladderFail(l, 'npm test', NOW + 1, F)).toBeUndefined()
  expect(ladderFail(l, 'npm test', NOW + 2, errKey('a third error'))).toBeUndefined()
  // the new error counts from one: two more of it offer
  expect(ladderFail(l, 'npm test', NOW + 3, errKey('a third error'))).toBeUndefined()
  expect(ladderFail(l, 'npm test', NOW + 4, errKey('a third error'))?.fails).toBe(3)
  // a changing line number is the same error
  expect(errKey('src/a.ts(12,3): error TS2304')).toBe(errKey('src/a.ts(90,7): error TS2304'))
  // the error is kept as a short hash, never its text
  expect(JSON.stringify([...l.fails.values()])).not.toMatch(/third|TS2304/)
})

test('the person\'s next message also takes back an offer that was not pressed', () => {
  const own: { offer?: typeof stuckMem.offer } = { offer: { kind: 'tests', shape: 's', fails: 3, at: NOW } }
  ladderClear(newLadder(), own)
  expect(own.offer).toBeUndefined()
  // With no memory given, the shared one is the one cleared
  stuckMem.offer = { kind: 'lint', shape: 's', fails: 3, at: NOW }
  ladderClear(newLadder())
  expect(stuckMem.offer).toBeUndefined()
})

test('the counts start again at the person\'s next message and after a quiet half hour', () => {
  const l = newLadder()
  ladderFail(l, 'npm test', NOW, E)
  ladderFail(l, 'npm test', NOW + 1, E)
  ladderClear(l)
  expect(ladderFail(l, 'npm test', NOW + 2, E)).toBeUndefined()
  expect(ladderFail(l, 'npm test', NOW + 3, E)).toBeUndefined()
  expect(ladderFail(l, 'npm test', NOW + 4, E)?.fails).toBe(3)
  const q = newLadder()
  ladderFail(q, 'npm run lint', NOW, E)
  ladderFail(q, 'npm run lint', NOW + 1, E)
  // the third failure comes after the half hour: it counts as the first
  expect(ladderFail(q, 'npm run lint', NOW + 1 + STUCK_TTL_MS, E)).toBeUndefined()
  expect(ladderFail(q, 'npm run lint', NOW + 2 + STUCK_TTL_MS, E)).toBeUndefined()
  expect(ladderFail(q, 'npm run lint', NOW + 3 + STUCK_TTL_MS, E)?.fails).toBe(3)
})

test('the stronger try needs a model above the session\'s; Opus, Fable and an unknown model have none', () => {
  expect(stronger('claude-haiku-5')).toBe('sonnet')
  expect(stronger('claude-sonnet-5-5')).toBe('opus')
  expect(stronger('claude-opus-5')).toBeUndefined()
  expect(stronger('claude-fable-1')).toBeUndefined()
  expect(stronger('something-new')).toBeUndefined()
  expect(stronger(undefined)).toBeUndefined()
  expect(stronger('')).toBeUndefined()
})

test('one failure seen twice (the failure event and the tool call) counts once; the tracker stays small', () => {
  const l = newLadder()
  expect(firstSight(l, 'u1')).toBe(true)
  expect(firstSight(l, 'u1')).toBe(false)
  expect(firstSight(l, undefined)).toBe(true)
  for (let n = 0; n < 100; n += 1) firstSight(l, `x${n}`)
  expect(l.ids.length).toBe(40)
  for (let n = 0; n < 100; n += 1) ladderFail(l, `npm test -- --grep case${String.fromCharCode(97 + (n % 26))}${String.fromCharCode(97 + Math.floor(n / 26))}`, NOW, E)
  expect(l.fails.size).toBe(20)
})

test('an old offer leaves by itself', () => {
  const o = { kind: 'build' as const, shape: 's', fails: 3, at: NOW }
  expect(liveStuck(o, NOW + 60_000)).toEqual(o)
  expect(liveStuck(o, NOW + STUCK_TTL_MS)).toBeUndefined()
  expect(liveStuck(undefined, NOW)).toBeUndefined()
})

test('Needs you: one row, two presses that say what they do, in English and Swedish; with no stronger model only the fresh start', () => {
  const f: NewsFacts = { hidden: [], halted: false, proofClaims: 0, agentTrouble: false, proofProblem: false, now: NOW, stuck: { kind: 'tests', shape: 's', fails: 3, at: NOW, up: 'opus' } }
  const rows = stuckGroups(f, id).flatMap(g => g.rows as InsideRow[])
  expect(rows.length).toBe(1)
  expect(rows[0]?.title).toBe('Tests failed 3 times in a row')
  expect(rows[0]?.inside).toEqual({ label: STUCK_STRONG, action: STUCK_STRONG_ROW, more: [{ label: STUCK_FRESH, action: STUCK_FRESH_ROW }] })
  expect(rows[0]?.what.next).toMatch(/keeps its own model/)
  expect(rows[0]?.what.next).toMatch(/a stronger model/)
  expect(rows[0]?.what.next).not.toMatch(/strongest/)
  const top = stuckGroups({ ...f, stuck: { kind: 'tests', shape: 's', fails: 3, at: NOW } }, id).flatMap(g => g.rows as InsideRow[])
  expect(top[0]?.inside).toEqual({ label: STUCK_FRESH, action: STUCK_FRESH_ROW })
  expect(top[0]?.what.next).toBe(STUCK_NEXT_FRESH)
  expect(stuckGroups({ ...f, stuck: undefined }, id)).toEqual([])
  for (const w of STUCK_WORDS) expect(SV[w] === undefined ? w : 'ok').toBe('ok')
  stuckMem.offer = { kind: 'lint', shape: 's', fails: 3, at: NOW }
  expect(newsFactsOf({ hidden: [], halted: false }, NOW).stuck?.kind).toBe('lint')
  expect(newsFactsOf({ hidden: [], halted: false }, NOW + STUCK_TTL_MS).stuck).toBeUndefined()
  stuckMem.offer = undefined
})

test('the stronger try is honest: one agent on the model above the session\'s, the session model unchanged; the fresh line names only the check', () => {
  expect(strongPrompt('tests', 'opus')).toMatch(/^The tests failed 3 times in a row\./)
  expect(strongPrompt('build', 'opus')).toMatch(/one agent with model "opus"/)
  expect(strongPrompt('build', 'sonnet')).toMatch(/one agent with model "sonnet"/)
  expect(strongPrompt('build', 'opus')).toMatch(/Keep this session's model/)
  expect(STUCK_NEXT_FRESH).not.toMatch(/strongest/)
  expect(freshStuckLine('Read b.md first.', 'types')).toBe('Read b.md first. Then run the type check, read only the error, fix it, and show me the result.')
})

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

function world(on: On, failing = true, model = 'claude-sonnet-5-5'): { mem: Map<string, unknown>; toasts: string[] } {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: model }) as never)
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(String((e as unknown as { text?: unknown }).text))
    return { value: undefined } as never
  })
  on('ui.invalidate', () => ({ value: undefined }))
  on('classic.PostToolUseFailure', () => ({}) as never)
  if (failing) on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'boom', code: 1 }, text: 'Exit code 1\nboom', isError: true }) as never)
  return { mem, toasts }
}

const failed = (command: string, tool_use_id: string, over: Record<string, unknown> = {}) => ({ session_id: 'test-session', transcript_path: '', cwd: '/w', hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_input: { command }, tool_use_id, error: 'Exit code 1', ...over }) as never

// The plugin runs in the engine with its own copy of the modules, so these hook tests read the toast, never stuckMem. A toast is shown after the
// toast gate's own store reads, so each check waits a moment first. The same toast shows once an hour, so each test offers at most once.
const later = (globalThis as unknown as { setTimeout: (f: () => void, ms: number) => unknown }).setTimeout
const settle = (): Promise<void> => new Promise(r => later(r, 50))
const offers = async (toasts: string[]): Promise<number> => {
  await settle()
  return toasts.filter(t => /3 times in a row\. (?:Two ways out wait|A way out waits) in Needs you/.test(t)).length
}

test('the named failure event counts a failing check; the third failure in a row with the same error offers once, with one toast', async ($, on) => {
  const w = world(on)
  await $.classic.PostToolUseFailure(failed('npm test -- --grep alpha', 'a1'))
  await $.classic.PostToolUseFailure(failed('npm test -- --grep alpha', 'a2'))
  expect(await offers(w.toasts)).toBe(0)
  await $.classic.PostToolUseFailure(failed('npm test -- --grep alpha', 'a3'))
  expect(await offers(w.toasts)).toBe(1)
  expect(w.toasts.some(t => t.startsWith('Tests failed 3 times in a row. Two ways out wait in Needs you'))).toBe(true)
  // nothing of the command is kept
  expect(JSON.stringify([...w.mem.values()])).not.toMatch(/alpha/)
})

test('three failures of one check with three different errors offer nothing', async ($, on) => {
  const w = world(on)
  await $.classic.PostToolUseFailure(failed('npm test -- --grep omega', 'o1', { error: 'Exit code 1\nfirst problem' }))
  await $.classic.PostToolUseFailure(failed('npm test -- --grep omega', 'o2', { error: 'Exit code 1\nsecond problem' }))
  await $.classic.PostToolUseFailure(failed('npm test -- --grep omega', 'o3', { error: 'Exit code 1\nthird problem' }))
  expect(await offers(w.toasts)).toBe(0)
})

test('with the session on the top model the offer says one way out, with no stronger try', async ($, on) => {
  const w = world(on, true, 'claude-opus-5')
  for (const n of [1, 2, 3]) await $.classic.PostToolUseFailure(failed('npm run lint -- --max-warnings 0', `l${n}`))
  expect(await offers(w.toasts)).toBe(1)
  expect(w.toasts.some(t => t.startsWith('Lint failed 3 times in a row. A way out waits in Needs you'))).toBe(true)
  expect(w.toasts.some(t => /Two ways out/.test(t))).toBe(false)
})

test('the person\'s next message starts the counts again', async ($, on) => {
  const w = world(on)
  await $.classic.PostToolUseFailure(failed('npx tsc --noEmit', 't1'))
  await $.classic.PostToolUseFailure(failed('npx tsc --noEmit', 't2'))
  await $.prompt.submit({ text: 'try something else', origin: { kind: 'composer' } } as never)
  await $.classic.PostToolUseFailure(failed('npx tsc --noEmit', 't3'))
  expect(await offers(w.toasts)).toBe(0)
  await $.classic.PostToolUseFailure(failed('npx tsc --noEmit', 't4'))
  await $.classic.PostToolUseFailure(failed('npx tsc --noEmit', 't5'))
  expect(await offers(w.toasts)).toBe(1)
})

test('the tool call and the failure event of one step count it once; an agent, an interrupt or Off counts nothing', async ($, on) => {
  const w = world(on)
  await $.classic.PostToolUseFailure(failed('npm test -- --grep beta', 'b1'))
  await $.tool.call({ tool: 'Bash', command: 'npm test -- --grep beta', tool_use_id: 'b1' } as never)
  expect(await offers(w.toasts)).toBe(0)
  await $.classic.PostToolUseFailure(failed('npm test -- --grep gamma', 'g1', { agent_id: 'sub' }))
  await $.classic.PostToolUseFailure(failed('npm test -- --grep gamma', 'g2', { agent_id: 'sub' }))
  await $.classic.PostToolUseFailure(failed('npm test -- --grep zeta', 'z1', { is_interrupt: true }))
  await $.classic.PostToolUseFailure(failed('npm test -- --grep zeta', 'z2', { is_interrupt: true }))
  expect(await offers(w.toasts)).toBe(0)
  w.mem.set('cockpit:setting:loop.breaker', 'off')
  await $.classic.PostToolUseFailure(failed('npm test -- --grep delta', 'd1'))
  await $.classic.PostToolUseFailure(failed('npm test -- --grep delta', 'd2'))
  expect(await offers(w.toasts)).toBe(0)
})

test('without the failure event the tool call still counts; a pass of that check in between starts the count again', async ($, on) => {
  const w = world(on, false)
  let ok = false
  on('tool.call', { tool: 'Bash' }, () => (ok ? { result: { stdout: 'ok', stderr: '', code: 0 }, text: 'ok' } : { result: { stdout: '', stderr: 'boom', code: 1 }, text: 'Exit code 1\nboom', isError: true }) as never)
  const run = async (n: number, pass = false): Promise<void> => {
    ok = pass
    await $.tool.call({ tool: 'Bash', command: 'npm run build -- --mode eps', tool_use_id: `e${n}` } as never)
  }
  await run(1)
  await run(2)
  await run(3, true)
  await run(4)
  await run(5)
  expect(await offers(w.toasts)).toBe(0)
  await run(6)
  expect(await offers(w.toasts)).toBe(1)
  expect(w.toasts.some(t => t.startsWith('Build failed 3 times in a row'))).toBe(true)
})

function fakeEng(): { eng: HomeEngine; sent: string[]; copied: string[]; toasts: string[]; files: Map<string, string> } {
  const sent: string[] = []
  const copied: string[] = []
  const toasts: string[] = []
  const files = new Map<string, string>()
  const store = new Map<string, unknown>()
  const io = {
    now: async () => NOW,
    home: async () => '/home/me',
    sessionId: async () => 'sid-1',
    get: async (k: string) => store.get(k),
    set: async (k: string, v: unknown) => void store.set(k, v),
    del: async (k: string) => void store.delete(k),
    keys: async () => [...store.keys()],
    read: async (p: string) => files.get(p) ?? '',
    write: async (p: string, t: string) => void files.set(p, t),
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ text: '' }),
    toast: (t: string) => void toasts.push(t),
    invalidate: () => undefined,
  } as unknown as Io
  const eng = { io: () => io, cwd: async () => '/w/app', submit: async (t: string) => void sent.push(t), copy: async (t: string) => (copied.push(t), true) } as unknown as HomeEngine
  return { eng, sent, copied, toasts, files }
}

test('the presses: the stronger try is a message when Claude is idle and waits for its next step while it works; the fresh start writes the brief and copies one line', async () => {
  const f = fakeEng()
  finishMem.note = undefined
  stuckMem.offer = { kind: 'tests', shape: 's', fails: 3, at: NOW, up: 'opus' }
  // while Claude works the request is queued, as Finish safely queues its own: nothing is sent now
  nextMem.busy = true
  await runStuck(f.eng, 'strong')
  expect(f.sent).toEqual([])
  expect(finishMem.note).toBe(strongPrompt('tests', 'opus'))
  expect(stuckMem.offer).toBeUndefined()
  expect(f.toasts.at(-1)).toBe(STUCK_QUEUED)
  finishMem.note = undefined
  // a request already waiting keeps its place; the offer stays
  stuckMem.offer = { kind: 'tests', shape: 's', fails: 3, at: NOW, up: 'opus' }
  finishMem.note = 'finish'
  await runStuck(f.eng, 'strong')
  expect(finishMem.note).toBe('finish')
  expect(stuckMem.offer).toBeDefined()
  finishMem.note = undefined
  // idle: one message
  nextMem.busy = false
  await runStuck(f.eng, 'strong')
  expect(f.sent).toEqual([strongPrompt('tests', 'opus')])
  expect(stuckMem.offer).toBeUndefined()
  // no offer, no press
  await runStuck(f.eng, 'strong')
  expect(f.sent.length).toBe(1)
  // an offer with no stronger model sends nothing, however it is pressed
  stuckMem.offer = { kind: 'tests', shape: 's', fails: 3, at: NOW }
  await runStuck(f.eng, 'strong')
  expect(f.sent.length).toBe(1)
  expect(finishMem.note).toBeUndefined()
  stuckMem.offer = { kind: 'build', shape: 's', fails: 3, at: NOW }
  await runStuck(f.eng, 'fresh')
  expect(f.files.size).toBe(1)
  expect(f.copied.length).toBe(1)
  expect(f.copied[0]).toMatch(/^Read .+ first\. It is the brief of my last session\. Then run the build/)
  expect(stuckMem.offer).toBeUndefined()
  expect(f.sent.length).toBe(1)
})

test('the loop breaker words: the setting note says Off also hides the stuck offer in 16 words or fewer, and the help holds in 3 sentences', () => {
  const s = SETTINGS.find(x => x.key === 'loop.breaker')
  expect(s?.note).toMatch(/Off also hides Stuck on a check/)
  expect(s?.note.split(/\s+/).length).toBeLessThanOrEqual(16)
  expect(SV[s?.note ?? ''] ?? '').toMatch(/^Varnar eller stoppar/)
  const h = HELP.find(x => x.title === 'What the loop breaker does')
  expect(h?.text).toMatch(/Off turns all of this off/)
  expect(h?.text).toMatch(/3 times with the same error/)
  expect(h?.text.split(/(?<=\.)\s/).length).toBeLessThanOrEqual(3)
  expect(SV[h?.text ?? ''] ?? '').not.toBe('')
})
