// The task runner: the file and its choices, which task starts next, folder copies, checks one at a time, stop rules, steering.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import {
  DEFAULT_CHOICES, ORCH_KEY, TASKS_FILE, TEMPLATE, descriptionOf, endTask, isFinished, isRunRow, modelFor, newRun, nextToStart, overLimits, parseRun, reordersStart, parseTaskFile, parseTaskLine,
  retryTask, runSummary, skipBlocked, stateWordOf, taskFacts, taskPrompt, withTask, taskForSpawn, isAutoModeRefusal,
  afterCheck, endReview, nextReviews, reviewForSpawn, reviewPrompt, reviewCode, askPrompt,
  addTask, removeTask, editTask, editChoices, taskLine, templateOf, parseTemplates, TEMPLATES_KEY, PLAN_PROMPT, RUNNER_SETTINGS, editable, taskDetail, ranOn, templateFor,
  CHECK_HINT, STAGGER_MS, capRoom, staggerWait, tasksText, autoCeiling, kindOf, failedTasks, runCount, taskAge,
} from '../hooks/core/orchestra'
import { aboutMoney } from '../hooks/core/prices'
import { reportHead, reportOf } from '../hooks/core/overnight'
import type { Run } from '../hooks/core/orchestra'
import { beat, checkSettled, forgetRoles, isRoleKey, loadRun, parseSteer, rolesChanged, runnerOpsOf, steer, tasksCommand, tick } from '../hooks/features/orchestra'
import type { RunnerOps } from '../hooks/features/orchestra'
import type { Io } from '../hooks/core/io'
import { forgetBundles, withToastGate } from '../hooks/core/io'
import { setLang } from '../hooks/core/lang'
import { bandWhatIs } from '../hooks/core/whatis'
import { bindSafeFs } from '../hooks/core/safewrite'
import { bindPlatform } from '../hooks/core/procs'
import { memSafeFs } from './safefs'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000
const SID = 'sess-0001-xyz'
const ROOT = '/work/shop'

test('a task line: words, then choices in brackets', () => {
  expect(parseTaskLine('Fix the header', 1)).toEqual({ n: 1, text: 'Fix the header', role: 'builder', model: 'auto', folder: true })
  expect(parseTaskLine('Find the price code (researcher, cheap)', 2)).toEqual({ n: 2, text: 'Find the price code', role: 'researcher', model: 'cheap', folder: false })
  expect(parseTaskLine('Change it (fixer, strong, after 2, shared)', 3)).toEqual({ n: 3, text: 'Change it', role: 'fixer', model: 'strong', after: 2, folder: false })
  expect(modelFor('auto', 'researcher')).toBe('haiku')
  expect(modelFor('strong', 'researcher')).toBe('opus')
})

test('the file: list lines are tasks; ticked and example lines are not', () => {
  expect(parseTaskFile(TEMPLATE)).toEqual([])
  expect(parseTaskFile('# T\n- [ ] A\n- [x] B\n* C (researcher)\n1. D\nplain\n')).toEqual(['A', 'C (researcher)', 'D'])
})

test('next to start: in order, up to the room left, and a task waits for the one it comes after', () => {
  let run: Run = { ...newRun(['A', 'B (after 1)', 'C', 'D'], NOW), status: 'running', choices: { ...DEFAULT_CHOICES, atOnce: 2 } }
  expect(nextToStart(run).map(t => t.n)).toEqual([1, 3])
  run = withTask(withTask(run, 1, { state: 'running', agentId: 'a1' }), 3, { state: 'running', agentId: 'a3' })
  expect(nextToStart(run)).toEqual([])
  run = endTask(run, 'a1', 'done', NOW)
  expect(nextToStart(run).map(t => t.n)).toEqual([2])
  expect(nextToStart({ ...run, status: 'paused' })).toEqual([])
})

test('next to start with the smaller tasks first: by the length of the words, a tie keeps the file order, and "after" still waits', () => {
  const run: Run = { ...newRun(['A long task with many words in it', 'Mid size task', 'Tiny', 'Mid size two (after 3)', 'Tiny too'], NOW), status: 'running', choices: { ...DEFAULT_CHOICES, atOnce: 3 } }
  expect(nextToStart(run).map(t => t.n)).toEqual([1, 2, 3])
  expect(nextToStart(run, NOW, false).map(t => t.n)).toEqual([1, 2, 3])
  expect(nextToStart(run, NOW, true).map(t => t.n)).toEqual([3, 5, 2])
  expect(reordersStart(run)).toBe(true)
  const later = endTask(withTask(run, 3, { state: 'running', agentId: 'a3' }), 'a3', 'done', NOW)
  expect(nextToStart(later, NOW, true).map(t => t.n)).toEqual([5, 4, 2])
  // Already in order: nothing changes, and the run has nothing to say.
  const sorted: Run = { ...newRun(['A', 'BB', 'CCC'], NOW), status: 'running' }
  expect(nextToStart(sorted, NOW, true).map(t => t.n)).toEqual([1, 2, 3])
  expect(reordersStart(sorted)).toBe(false)
  expect(reordersStart({ ...newRun(['same', 'size', 'also'], NOW), status: 'running' })).toBe(false)
})

test('the summary says once that the smaller tasks went first, and a stored run keeps it', () => {
  const run: Run = { ...newRun(['A', 'B'], NOW), status: 'running' }
  expect(runSummary(run)).toBe('0 of 2 done, 2 waiting')
  expect(runSummary({ ...run, smallFirst: true })).toBe('0 of 2 done, 2 waiting · Smaller tasks first: the plan window is short')
  expect(parseRun(JSON.parse(JSON.stringify({ ...run, smallFirst: true })))?.smallFirst).toBe(true)
  expect(parseRun(JSON.parse(JSON.stringify(run)))?.smallFirst).toBeUndefined()
  setLang('sv')
  try {
    expect(runSummary({ ...run, smallFirst: true })).toBe('0 av 2 klara, 2 väntar · Mindre uppgifter först: planfönstret är kort')
  } finally {
    setLang('en')
  }
})

test('a task after a failed one is skipped; a run with a check waits for it', () => {
  let run: Run = { ...newRun(['A', 'B (after 1)'], NOW), status: 'running' }
  run = endTask(withTask(run, 1, { state: 'running', agentId: 'a1' }), 'a1', 'failed', NOW)
  expect(skipBlocked(run).tasks[1]).toMatchObject({ state: 'skipped', why: 'task 1 did not pass' })
  let checked: Run = { ...newRun(['A', 'B (after 1)'], NOW), status: 'running', choices: { ...DEFAULT_CHOICES, check: 'npm test' } }
  checked = endTask(withTask(checked, 1, { state: 'running', agentId: 'a1' }), 'a1', 'done', NOW)
  expect(checked.tasks[0].check).toBe('pending')
  expect(nextToStart(checked)).toEqual([])
  expect(nextToStart(withTask(checked, 1, { check: 'passed' })).map(t => t.n)).toEqual([2])
  expect(skipBlocked(withTask(checked, 1, { check: 'failed' })).tasks[1].state).toBe('skipped')
})

test('stop rules: too long or too costly', () => {
  let run: Run = { ...newRun(['A', 'B'], NOW), status: 'running' }
  run = withTask(withTask(run, 1, { state: 'running', startedAt: NOW - 31 * MIN }), 2, { state: 'running', startedAt: NOW, usd: 2.5 })
  expect(overLimits(run, NOW)).toEqual([{ n: 1, why: 'ran past 30 min' }, { n: 2, why: 'cost past $2.00' }])
})

test('words: states, the summary, the helper prompt and an open task', () => {
  let run: Run = { ...newRun(['Fix the header', 'Find prices (researcher)'], NOW), status: 'running' }
  expect(runSummary({ ...run, status: 'setup' })).toBe('2 tasks, not started')
  run = withTask(run, 1, { state: 'done', check: 'passed', usd: 0.25, path: '/w/.claude/worktrees/run-x-1', branch: 'vaken-run/x-1' })
  expect(stateWordOf(run.tasks[0])).toBe('Checked')
  expect(runSummary(run)).toBe('1 of 2 done, 1 waiting · about\u00a0$0.25 (estimate)')
  expect(descriptionOf(run.tasks[0])).toBe('Task 1: Fix the header')
  expect(taskPrompt(run.tasks[0])).toMatch(/Work only in this folder: \/w\/\.claude\/worktrees\/run-x-1\..*commit your changes/)
  expect(taskPrompt(run.tasks[1])).toMatch(/Do not change any file\./)
  expect(taskFacts(run.tasks[0])).toContain('Check: passed')
  const doneRun = withTask(run, 2, { state: 'done' })
  expect(isFinished(doneRun)).toBe(true)
  expect(runSummary(doneRun)).toBe('All 2 done · about\u00a0$0.25 (estimate)')
  expect(retryTask(doneRun, 2).tasks[1]).toMatchObject({ state: 'waiting', check: 'none' })
})

test('a stored run is read defensively; an old 1.5 run is dropped', () => {
  const run = newRun(['A (after 3)', 'B'], NOW)
  // "after 3" on task 1 points forward, so it is dropped.
  const { after: _after, ...first } = run.tasks[0]
  expect(first).toEqual(run.tasks[0])
  expect(parseRun(JSON.parse(JSON.stringify(run)))).toEqual(run)
  expect(parseRun({ startedAt: NOW, tasks: ['a'] })).toBeUndefined()
  expect(parseRun({ ...run, choices: { atOnce: 999 } })?.choices.atOnce).toBe(0)
  expect(parseRun({ ...run, choices: { atOnce: 8 } })?.choices.atOnce).toBe(8)
  expect(parseRun({ ...run, choices: { atOnce: 12 } })?.choices.atOnce).toBe(12)
})

test('the helper rows of a run show as tasks, not twice', () => {
  const run = withTask({ ...newRun(['A'], NOW), startedAt: NOW }, 1, { agentId: 'ag1' })
  const row = { id: 'x', agentId: 'ag1', session: 's', type: 't', what: 'other words', background: true, startedAt: NOW - MIN, state: 'running' as const, stale: false }
  expect(isRunRow(run, row)).toBe(true)
  expect(isRunRow(run, { ...row, agentId: 'no', what: 'Task 1: a', startedAt: NOW })).toBe(true)
  expect(isRunRow(run, { ...row, agentId: 'no' })).toBe(false)
  expect(bandWhatIs({ id: 'orch', text: 'x', at: NOW }, NOW).means).toMatch(/task run/)
})

// ---- the engine, through a fake RunnerOps

function world(files: Record<string, string> = {}, root = ROOT) {
  const mem = new Map<string, unknown>()
  const disk = new Map<string, string>(Object.entries(files))
  let clock = NOW
  const calls: string[] = []
  let nextId = 0
  const sh: { code: number; out: string }[] = []
  const io: Io = {
    now: async () => clock,
    home: async () => '',
    sessionId: async () => SID,
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async path => {
      const t = disk.get(path)
      if (t === undefined) throw new Error('no file')
      return t
    },
    write: async (path, text) => void disk.set(path, text),
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  const ops: RunnerOps = {
    spawn: async a => {
      nextId += 1
      calls.push(`spawn ${a.description} ${a.subagentType} ${a.model}${a.cwd === undefined ? '' : ` in ${a.cwd}`}`)
      return { agentId: `ag${nextId}` }
    },
    stop: async id => void calls.push(`stop ${id}`),
    send: async (id, text) => void calls.push(`send ${id} ${text}`),
    sh: async (argv, cwd) => {
      calls.push(`sh ${argv.join(' ')} @ ${cwd}`)
      return sh.shift() ?? { code: 0, out: 'ok' }
    },
    root: async () => root,
    statuses: async () => [],
    ask: async text => void calls.push(`ask ${text}`),
    roles: async () => true,
    offered: async () => false,
  }
  bindSafeFs(io, memSafeFs(() => disk.keys()))
  return { io, ops, mem, disk, calls, sh, setNow: (t: number) => void (clock = t) }
}
const FILE = `${ROOT}/${TASKS_FILE}`

test('a Windows root: the folder copy path is all backslashes in git worktree add, the helper folder and worktree remove', async () => {
  const WIN = 'C:\\work\\shop'
  const w = world({ [`${WIN}\\.claude\\cockpit-tasks.md`]: '- Fix the header\n' }, WIN)
  await tasksCommand(w.io, w.ops, 'start')
  const dir = `${WIN}\\.claude\\worktrees\\run-${NOW.toString(36)}-1`
  expect(w.calls).toContain(`sh git worktree add -b vaken-run/${NOW.toString(36)}-1 ${dir} HEAD @ ${WIN}`)
  expect(w.calls.find(c => c.startsWith('spawn'))?.endsWith(` in ${dir}`)).toBe(true)
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }])
  await tasksCommand(w.io, w.ops, 'keep 1')
  expect(w.calls).toContain(`sh git worktree remove ${dir} @ ${WIN}`)
})

test('start makes the folder copies and starts the helpers, at most N at once; the next starts when one ends', async () => {
  const w = world({ [FILE]: '- Fix the header\n- Find prices (researcher, cheap)\n- Write tests\n' })
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'at 3')
  const said = await tasksCommand(w.io, w.ops, 'start')
  expect(said).toMatch(/^Started: 3 tasks, at most 3 at a time\./)
  expect(w.calls.filter(c => c.startsWith('spawn'))).toEqual([
    `spawn Task 1: Fix the header cockpit:builder sonnet in ${ROOT}/.claude/worktrees/run-${NOW.toString(36)}-1`,
    'spawn Task 2: Find prices cockpit:researcher haiku',
    `spawn Task 3: Write tests cockpit:builder sonnet in ${ROOT}/.claude/worktrees/run-${NOW.toString(36)}-3`,
  ])
  expect(w.calls).toContain(`sh git worktree add -b vaken-run/${NOW.toString(36)}-1 ${ROOT}/.claude/worktrees/run-${NOW.toString(36)}-1 HEAD @ ${ROOT}`)
  const run = (await loadRun(w.io))!
  expect(run.tasks.map(t => t.state)).toEqual(['running', 'running', 'running'])
})

test('a run with room for one starts the next only when the first ends; it ends once and says so', async () => {
  const w = world({ [FILE]: '- A (researcher)\n- B (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'load')
  await steer(w.io, w.ops, { kind: 'atOnce', n: 1 })
  await tasksCommand(w.io, w.ops, 'start')
  expect((await loadRun(w.io))!.tasks.map(t => t.state)).toEqual(['running', 'waiting'])
  w.setNow(NOW + MIN)
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }])
  expect((await loadRun(w.io))!.tasks.map(t => t.state)).toEqual(['done', 'running'])
  await tick(w.io, w.ops, [{ id: 'ag2', status: 'completed' }])
  const run = (await loadRun(w.io))!
  expect(run.status).toBe('done')
  expect(run.told).toBe(true)
  expect(JSON.stringify([...w.mem.entries()])).toMatch(/Task run ended: All 2 done/)
})

test('the last line of a check is stored with secrets hidden', async () => {
  const w = world({ [FILE]: '- A\n' })
  await tasksCommand(w.io, w.ops, 'load')
  await steer(w.io, w.ops, { kind: 'check', command: 'npm test' })
  await tasksCommand(w.io, w.ops, 'start')
  w.sh.push({ code: 1, out: `failed with token ${'gh' + 'p_'}${'abcdefghijklmnopqrstuvwxyz0123456789'}` })
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }])
  await checkSettled()
  await tick(w.io, w.ops)
  const line = (await loadRun(w.io))!.tasks[0].checkLine ?? ''
  expect(line).toContain('failed with token')
  expect(line).not.toContain('ghp_')
})

test('each task is checked when it ends, one at a time, in its folder copy', async () => {
  const w = world({ [FILE]: '- A\n- B\n' })
  await tasksCommand(w.io, w.ops, 'load')
  await steer(w.io, w.ops, { kind: 'atOnce', n: 2 })
  await steer(w.io, w.ops, { kind: 'check', command: 'npm test' })
  await tasksCommand(w.io, w.ops, 'start')
  w.sh.push({ code: 1, out: 'FAIL cart.test.ts\n2 failed' })
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }, { id: 'ag2', status: 'completed' }])
  let run = (await loadRun(w.io))!
  expect(run.tasks.map(t => t.check)).toEqual(['running', 'pending'])
  await checkSettled()
  await beat(w.io, w.ops)
  run = (await loadRun(w.io))!
  expect(run.tasks.map(t => t.check)).toEqual(['failed', 'running'])
  expect(run.tasks[0].checkLine).toBe('2 failed')
  expect(stateWordOf(run.tasks[0])).toBe('Check failed')
  await checkSettled()
  await beat(w.io, w.ops)
  run = (await loadRun(w.io))!
  expect(run.tasks.map(t => t.check)).toEqual(['failed', 'passed'])
  expect(w.calls.filter(c => c.startsWith('sh sh -c npm test')).map(c => c.split(' @ ')[1])).toEqual([`${ROOT}/.claude/worktrees/run-${NOW.toString(36)}-1`, `${ROOT}/.claude/worktrees/run-${NOW.toString(36)}-2`])
  expect(run.status).toBe('done')
  expect(runSummary(run)).toBe('1 of 2 done, 1 failed')
})

test('a helper past a stop rule is stopped; a run past its budget pauses', async () => {
  const w = world({ [FILE]: '- A (researcher)\n- B (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'start')
  w.setNow(NOW + 31 * MIN)
  await tick(w.io, w.ops)
  let run = (await loadRun(w.io))!
  expect(w.calls).toContain('stop ag1')
  expect(run.tasks[0]).toMatchObject({ state: 'stopped', why: 'ran past 30 min' })
  const w2 = world({ [FILE]: '- A (researcher)\n- B (researcher)\n- C (researcher)\n' })
  await tasksCommand(w2.io, w2.ops, 'load')
  run = (await loadRun(w2.io))!
  w2.mem.set(ORCH_KEY(SID), { ...run, status: 'running', startedAt: NOW, tasks: run.tasks.map(t => (t.n === 3 ? t : { ...t, state: 'done', usd: 6 })) })
  run = (await tick(w2.io, w2.ops))!
  expect(run.status).toBe('paused')
  expect(w2.calls.filter(c => c.startsWith('spawn'))).toEqual([])
})

test('steering: pause, go on, stop one, say, retry, keep and throw away a folder copy', async () => {
  const w = world({ [FILE]: '- A\n- B (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'at 2')
  await tasksCommand(w.io, w.ops, 'start')
  expect(await tasksCommand(w.io, w.ops, 'pause')).toMatch(/^Paused\./)
  expect(await tasksCommand(w.io, w.ops, 'go')).toMatch(/^Going on\./)
  expect(await tasksCommand(w.io, w.ops, 'say 2 use the other file')).toMatch(/^Sent to task 2\./)
  expect(w.calls).toContain('send ag2 use the other file')
  expect(await tasksCommand(w.io, w.ops, 'stop 2')).toMatch(/^Stopped task 2\./)
  expect(await tasksCommand(w.io, w.ops, 'keep 1')).toMatch(/still runs/)
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }])
  expect(await tasksCommand(w.io, w.ops, 'keep 1')).toMatch(/^Kept task 1: its work is on branch vaken-run\//)
  expect(w.calls.some(c => c.startsWith('sh git worktree remove /work/shop/.claude/worktrees/'))).toBe(true)
  expect(await tasksCommand(w.io, w.ops, 'retry 2')).toMatch(/^Task 2 waits for its turn again\./)
  expect(w.calls.filter(c => c.startsWith('spawn')).length).toBe(3)
  w.sh.push({ code: 0, out: '' }, { code: 0, out: '' })
  const w2 = world({ [FILE]: '- A\n' })
  await tasksCommand(w2.io, w2.ops, 'start')
  await tick(w2.io, w2.ops, [{ id: 'ag1', status: 'failed' }])
  // Work that would be lost is counted first, and a yes is asked for; nothing is removed before it.
  w2.sh.push({ code: 0, out: '3' }, { code: 0, out: '' })
  expect(await tasksCommand(w2.io, w2.ops, 'throw 1')).toMatch(/^Not thrown away: task 1 holds 3 commits that the branch you are on does not have\..*\/vaken-tasks throw 1 yes/)
  expect(w2.calls.some(c => c.startsWith('sh git rev-list --count HEAD..vaken-run/'))).toBe(true)
  expect(w2.calls.some(c => c.startsWith('sh git worktree remove'))).toBe(false)
  w2.sh.push({ code: 0, out: '0' }, { code: 0, out: ' M a.ts\n?? b.ts\n' })
  expect(await tasksCommand(w2.io, w2.ops, 'throw 1')).toMatch(/holds 2 changed files that are not committed/)
  w2.sh.push({ code: 1, out: 'fatal' }, { code: 0, out: '' })
  expect(await tasksCommand(w2.io, w2.ops, 'throw 1')).toMatch(/commits that could not be counted/)
  expect(await tasksCommand(w2.io, w2.ops, 'throw 1 yes')).toMatch(/^Threw away task 1/)
  expect(w2.calls.some(c => c.startsWith('sh git worktree remove --force'))).toBe(true)
  expect(w2.calls.some(c => c.startsWith('sh git branch -D vaken-run/'))).toBe(true)
  const w3 = world({ [FILE]: '- A\n' })
  await tasksCommand(w3.io, w3.ops, 'start')
  await tick(w3.io, w3.ops, [{ id: 'ag1', status: 'failed' }])
  w3.sh.push({ code: 0, out: '0' }, { code: 0, out: '' })
  expect(await tasksCommand(w3.io, w3.ops, 'throw 1')).toMatch(/^Threw away task 1/)
})

test('Halt is on: the runner does not start, go on or throw away, and starts no helper', async () => {
  const w = world({ [FILE]: '- A\n- B (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'load')
  w.mem.set(`cockpit:halt:${SID}`, { at: NOW })
  expect(await tasksCommand(w.io, w.ops, 'start')).toMatch(/^This session is paused\. Nothing ran\. Resume with \/vaken-pause off first\./)
  expect(w.calls.filter(c => c.startsWith('spawn'))).toEqual([])
  w.mem.delete(`cockpit:halt:${SID}`)
  await tasksCommand(w.io, w.ops, 'start')
  w.mem.set(`cockpit:halt:${SID}`, { at: NOW })
  expect(await tasksCommand(w.io, w.ops, 'throw 1')).toMatch(/^This session is paused/)
  const w2 = world({ [FILE]: '- A\n- B\n' })
  await tasksCommand(w2.io, w2.ops, 'load')
  await tasksCommand(w2.io, w2.ops, 'at 1')
  w2.mem.set(`cockpit:halt:${SID}`, { at: NOW })
  const run = (await loadRun(w2.io))!
  w2.mem.set(ORCH_KEY(SID), { ...run, status: 'running', startedAt: NOW })
  const after = (await tick(w2.io, w2.ops))!
  expect(w2.calls.filter(c => c.startsWith('spawn'))).toEqual([])
  expect(after.tasks[0].why).toBe('waits: this session is paused')
})

test('a refused start is no failure: the task waits a minute and tries again', async () => {
  const w = world({ [FILE]: '- A (researcher)\n' })
  let refuse = true
  const ops: RunnerOps = { ...w.ops, spawn: async a => (refuse ? { deny: 'agent cap reached' } : w.ops.spawn(a)) }
  await tasksCommand(w.io, ops, 'start')
  let run = (await loadRun(w.io))!
  expect(run.tasks[0]).toMatchObject({ state: 'waiting', why: 'waits: agent cap reached', holdUntil: NOW + 60_000, tries: 0 })
  refuse = false
  await tick(w.io, ops)
  expect((await loadRun(w.io))!.tasks[0].state).toBe('waiting')
  w.setNow(NOW + 61_000)
  run = (await tick(w.io, ops))!
  expect(run.tasks[0]).toMatchObject({ state: 'running', tries: 1 })
  expect(run.tasks[0].why).toBeUndefined()
})

test('when auto mode refuses vaken start, Claude is asked once in a message, and its helper is bound to the task', async () => {
  const w = world({ [FILE]: '- Fix the header\n- Find prices (researcher)\n' })
  const ops: RunnerOps = { ...w.ops, spawn: async () => ({ deny: 'The server-side auto mode classifier gave no verdict for Agent' }) }
  await tasksCommand(w.io, ops, 'load')
  await tasksCommand(w.io, ops, 'at 2')
  await tasksCommand(w.io, ops, 'start')
  let run = (await loadRun(w.io))!
  expect(run.via).toBe('claude')
  const asks = w.calls.filter(c => c.startsWith('ask '))
  expect(asks).toHaveLength(1)
  expect(asks[0]).toMatch(new RegExp(`- description "Task 1", prompt "vaken-task ${NOW.toString(36)}-1"\\n- description "Task 2", prompt "vaken-task ${NOW.toString(36)}-2"\\n`))
  expect(run.tasks.map(t => [t.state, t.askedAt])).toEqual([['waiting', NOW], ['waiting', NOW]])
  expect(run.tasks[0].path).toBe(`${ROOT}/.claude/worktrees/run-${NOW.toString(36)}-1`)
  await tick(w.io, ops)
  expect(w.calls.filter(c => c.startsWith('ask '))).toHaveLength(1)
  expect(taskForSpawn(run, 'Task 2: Find prices')?.n).toBe(2)
  expect(taskForSpawn(run, 'Find prices', `vaken-task ${NOW.toString(36)}-2`)?.n).toBe(2)
  expect(taskForSpawn(run, 'Task 2', 'vaken-task otherrun-2')).toBeUndefined()
  expect(taskForSpawn(run, 'Search the code')).toBeUndefined()
  w.setNow(NOW + 3 * MIN)
  await tick(w.io, ops)
  expect(w.calls.filter(c => c.startsWith('ask '))).toHaveLength(2)
  run = withTask(run, 1, { state: 'running', agentId: 'x' })
  expect(taskForSpawn(run, 'Task 1: Fix the header')).toBeUndefined()
  expect(isAutoModeRefusal('agent cap reached')).toBe(false)
})

test('the command: words, mistakes, new, and no run', async () => {
  expect(parseSteer('')).toBeUndefined()
  expect(parseSteer('retry x')).toEqual({ bad: 'Name a task number: /vaken-tasks retry 2' })
  expect(parseSteer('stop')).toEqual({ kind: 'stopAll' })
  expect(parseSteer('stop 2')).toEqual({ kind: 'stop', n: 2 })
  const w = world()
  expect(await tasksCommand(w.io, w.ops, '')).toMatch(/No task list yet/)
  expect(await tasksCommand(w.io, w.ops, 'new')).toMatch(/^Wrote /)
  expect(w.disk.get(FILE)).toBe(TEMPLATE)
  // On Windows the file it writes says "this PC".
  const pc = world()
  bindPlatform(pc.io, async () => 'Windows_NT')
  expect(await tasksCommand(pc.io, pc.ops, 'new')).toMatch(/^Wrote /)
  expect(pc.disk.get(FILE)).toBe(templateFor('win32'))
  expect(pc.disk.get(FILE)).toContain('this PC has room for')
  expect(await tasksCommand(w.io, w.ops, 'pause')).toMatch(/No task run/)
  expect(await tasksCommand(w.io, w.ops, 'start')).toMatch(/has no open tasks/)
})

test('add, remove and change tasks; numbers and "after" follow a removal', () => {
  let run = newRun(['A', 'B (after 1)', 'C (after 2)'], NOW)
  run = addTask(run, 'D (researcher, after 3)')
  expect(run.tasks.map(t => [t.n, t.text, t.after])).toEqual([[1, 'A', undefined], [2, 'B', 1], [3, 'C', 2], [4, 'D', 3]])
  run = removeTask(run, 2)
  expect(run.tasks.map(t => [t.n, t.text, t.after])).toEqual([[1, 'A', undefined], [2, 'C', undefined], [3, 'D', 2]])
  run = editTask(run, 3, { role: 'builder', model: 'strong', after: 1 })
  expect(run.tasks[2]).toMatchObject({ role: 'builder', model: 'strong', after: 1, folder: true })
  expect(editTask(run, 3, { after: 3 }).tasks[2].after).toBe(1)
  expect(editTask(run, 3, { after: null }).tasks[2].after).toBeUndefined()
  expect(editTask(run, 3, { role: 'reviewer' }).tasks[2].folder).toBe(false)
  const started = withTask(run, 1, { state: 'running', agentId: 'a' })
  expect(editable(started.tasks[0])).toBe(false)
  expect(removeTask(started, 1)).toBe(started)
  expect(editTask(started, 1, { model: 'cheap' })).toBe(started)
  expect(editChoices(run, { atOnce: 999, helperMin: 15 }).choices).toMatchObject({ atOnce: 0, helperMin: 15 })
})

test('a template keeps the tasks as file lines and the choices; it reads back defensively', () => {
  const run = editChoices(newRun(['Fix it (strong)', 'Look (researcher)', 'Write (shared, after 1)'], NOW), { atOnce: 2 })
  expect(run.tasks.map(taskLine)).toEqual(['Fix it (strong)', 'Look (researcher)', 'Write (after 1, shared)'])
  const t = templateOf(run)
  expect(parseTemplates({ nightly: t, bad: { tasks: [] }, x: 3 })).toEqual({ nightly: t })
  expect(newRun(t.tasks, NOW).tasks.map(taskLine)).toEqual(t.tasks)
  expect(RUNNER_SETTINGS.map(r => r.key)).toEqual(['runner.researcher', 'runner.builder', 'runner.reviewer', 'runner.fixer'])
})

test('the command edits, sets limits, names, keeps templates and asks for a plan', async () => {
  const w = world()
  expect(await tasksCommand(w.io, w.ops, 'add Fix the header')).toMatch(/^Added task 1\./)
  expect(await tasksCommand(w.io, w.ops, 'add Find prices (researcher)')).toMatch(/^Added task 2\./)
  expect(await tasksCommand(w.io, w.ops, 'set 2 model strong')).toMatch(/^Changed task 2\./)
  expect(await tasksCommand(w.io, w.ops, 'set 2 after 1')).toMatch(/^Changed task 2\./)
  expect(await tasksCommand(w.io, w.ops, 'set 2 role wizard')).toMatch(/^Use: /)
  expect(await tasksCommand(w.io, w.ops, 'limit min 60')).toMatch(/after 60 min/)
  expect(await tasksCommand(w.io, w.ops, 'limit run $25')).toMatch(/past \$25\.00/)
  expect(await tasksCommand(w.io, w.ops, 'name Nightly cleanup')).toMatch(/"Nightly cleanup"/)
  expect(await tasksCommand(w.io, w.ops, 'template save Nightly')).toMatch(/^Saved the template "Nightly"\./)
  expect(Object.keys(w.mem.get(TEMPLATES_KEY) as object)).toEqual(['Nightly'])
  expect(await tasksCommand(w.io, w.ops, 'remove 1')).toMatch(/^Removed task 1\./)
  let run = (await loadRun(w.io))!
  expect(run.tasks.map(t => [t.n, t.text, t.model, t.after])).toEqual([[1, 'Find prices', 'strong', undefined]])
  expect(await tasksCommand(w.io, w.ops, 'template apply nightly')).toMatch(/^Loaded the template "Nightly": 2 tasks/)
  run = (await loadRun(w.io))!
  expect(run.name).toBe('Nightly')
  expect(run.choices.helperMin).toBe(60)
  expect(run.tasks.map(t => [t.text, t.model, t.after])).toEqual([['Fix the header', 'auto', undefined], ['Find prices', 'strong', 1]])
  expect(await tasksCommand(w.io, w.ops, 'plan')).toMatch(/^Asked Claude to write the plan/)
  expect(w.calls).toContain(`ask ${PLAN_PROMPT}`)
  expect(await tasksCommand(w.io, w.ops, 'template delete Nightly')).toMatch(/^Deleted/)
})

test('a finished task goes to its review (after its check passes); a review counts against "at once"; the run ends after it', () => {
  let run: Run = { ...newRun(['A', 'B', 'C'], NOW), status: 'running', choices: { ...DEFAULT_CHOICES, atOnce: 2, reviewer: true } }
  run = withTask(withTask(run, 1, { state: 'running', agentId: 'a1' }), 2, { state: 'running', agentId: 'a2' })
  run = endTask(run, 'a1', 'done', NOW)
  expect(run.tasks[0].review).toBe('pending')
  expect(stateWordOf(run.tasks[0])).toBe('Reviewing')
  expect(nextReviews(run).map(t => t.n)).toEqual([1])
  run = withTask(run, 1, { review: 'running', reviewAgent: 'r1' })
  expect(nextToStart(run)).toEqual([])
  run = endReview(run, 'r1', true, '1. Good: the header fits.\n2. Risk: the menu moved.\n3. Check: a phone width.\n4. extra')
  expect(run.tasks[0].reviewLines).toEqual(['Good: the header fits.', 'Risk: the menu moved.', 'Check: a phone width.'])
  expect(taskFacts(run.tasks[0])).toContain('Review: Good: the header fits.')
  expect(nextToStart(run).map(t => t.n)).toEqual([3])
  const checked: Run = { ...newRun(['A'], NOW), status: 'running', choices: { ...DEFAULT_CHOICES, check: 'npm test', reviewer: true } }
  const done = endTask(withTask(checked, 1, { state: 'running', agentId: 'a' }), 'a', 'done', NOW)
  expect(done.tasks[0].review).toBeUndefined()
  expect(afterCheck(done, 1, true, 'ok').tasks[0].review).toBe('pending')
  expect(afterCheck(done, 1, false, 'fail').tasks[0].review).toBeUndefined()
  expect(isFinished(afterCheck(done, 1, true, 'ok'))).toBe(false)
  expect(endReview(run, 'nobody', true, 'x')).toBe(run)
})

test('the review prompt shows the change from its start, and Claude-started reviews are found by their code', () => {
  const run = withTask({ ...newRun(['Fix it'], NOW), status: 'running' }, 1, { state: 'done', review: 'pending', path: '/w/c', branch: 'vaken-run/x-1', base: 'abc1234' })
  expect(reviewPrompt(run.tasks[0])).toMatch(/git -C \/w\/c diff abc1234\.\.HEAD/)
  expect(reviewPrompt({ ...run.tasks[0], path: undefined })).toMatch(/project folder/)
  expect(reviewForSpawn(run, reviewCode(run, run.tasks[0]))?.n).toBe(1)
  expect(reviewForSpawn(run, 'vaken-review other-1')).toBeUndefined()
  expect(askPrompt(run, [], [run.tasks[0]])).toMatch(new RegExp(`- description "Review 1", prompt "vaken-review ${NOW.toString(36)}-1"`))
})

test('the runner starts the reviewer itself, with the reviewer role, in the task folder copy', async () => {
  const w = world({ [FILE]: '- A\n' })
  await tasksCommand(w.io, w.ops, 'load')
  expect(await tasksCommand(w.io, w.ops, 'reviewer on')).toMatch(/^A reviewer reads/)
  await tasksCommand(w.io, w.ops, 'start')
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }])
  const run = (await loadRun(w.io))!
  expect(run.tasks[0]).toMatchObject({ review: 'running', reviewAgent: 'ag2' })
  expect(w.calls.filter(c => c.startsWith('spawn'))[1]).toBe(`spawn Review 1: A cockpit:reviewer haiku in ${ROOT}/.claude/worktrees/run-${NOW.toString(36)}-1`)
  expect(run.status).toBe('running')
  w.mem.set(ORCH_KEY(SID), endReview(run, 'ag2', true, 'Good.\nNo risk.\nNothing.'))
  expect((await tick(w.io, w.ops))!.status).toBe('done')
})

test('the runner starts no new helper while the computer is full, and as many as fit once there is room', async () => {
  const w = world({ [FILE]: '- A (researcher)\n- B (researcher)\n- C (researcher)\n' })
  const sample = { at: NOW, pressure: 'warn', freeShare: 0.5, memMb: 24 * 1024, load: 2, cores: 18 }
  w.mem.set('cockpit:setting:laptop.mode', 'on')
  w.mem.set('cockpit:laptop:v2', sample)
  await tasksCommand(w.io, w.ops, 'start')
  expect(w.calls.filter(c => c.startsWith('spawn'))).toEqual([])
  const held = (await loadRun(w.io))!
  expect(held.tasks.map(t => t.state)).toEqual(['waiting', 'waiting', 'waiting'])
  expect(held.tasks[0]?.why).toBe('waits: the computer is full, the Mac reports memory pressure')
  w.setNow(NOW + 1000)
  w.mem.set('cockpit:laptop:v2', { ...sample, at: NOW + 1000, pressure: 'normal', freeShare: 0.1 })
  await tick(w.io, w.ops)
  expect(w.calls.filter(c => c.startsWith('spawn'))).toEqual(['spawn Task 1: A cockpit:researcher haiku'])
  w.mem.set('cockpit:setting:laptop.mode', 'off')
  await tick(w.io, w.ops)
  expect(w.calls.filter(c => c.startsWith('spawn'))).toHaveLength(1)
  await tasksCommand(w.io, w.ops, 'at 3')
  await tick(w.io, w.ops)
  await tick(w.io, w.ops)
  expect(w.calls.filter(c => c.startsWith('spawn'))).toHaveLength(3)
})

const usageCard = (percent: number, left = 1) => ({ at: NOW, windows: [{ label: '5-hour limit', percent, resetsAt: new Date(NOW + left * 3_600_000).toISOString() }] })
const TASKS_LONG_FIRST = '- Fix the whole layout of the shop header and footer (researcher)\n- Rename one thing (researcher)\n- Check prices (researcher)\n'

test('the plan window is short (under 45 minutes at this pace): the smaller tasks start first, the order is kept otherwise, and the summary says so once', async () => {
  const w = world({ [FILE]: TASKS_LONG_FIRST })
  w.mem.set('cockpit:usage:app', usageCard(90))
  await tasksCommand(w.io, w.ops, 'load')
  await steer(w.io, w.ops, { kind: 'atOnce', n: 1 })
  await tasksCommand(w.io, w.ops, 'start')
  expect(w.calls.filter(c => c.startsWith('spawn'))).toEqual(['spawn Task 3: Check prices cockpit:researcher haiku'])
  let run = (await loadRun(w.io))!
  expect(run.smallFirst).toBe(true)
  expect(runSummary(run)).toMatch(/ · Smaller tasks first: the plan window is short$/)
  expect(runSummary(run).split('Smaller tasks first').length).toBe(2)
  w.setNow(NOW + MIN)
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }])
  w.setNow(NOW + 2 * MIN)
  await tick(w.io, w.ops, [{ id: 'ag2', status: 'completed' }])
  expect(w.calls.filter(c => c.startsWith('spawn')).map(c => c.slice(0, 13))).toEqual(['spawn Task 3:', 'spawn Task 2:', 'spawn Task 1:'])
  run = (await loadRun(w.io))!
  expect(runSummary(run).split('Smaller tasks first').length).toBe(2)
})

test('with time enough, an old reading or no reading, the tasks start in the order of the file and the summary says nothing about size', async () => {
  const cases: Array<[string, unknown]> = [['plenty of time', usageCard(50)], ['an old reading', { ...usageCard(90), at: NOW - 20 * MIN }], ['no reading', undefined]]
  for (const [name, card] of cases) {
    const w = world({ [FILE]: TASKS_LONG_FIRST })
    if (card !== undefined) w.mem.set('cockpit:usage:app', card)
    await tasksCommand(w.io, w.ops, 'load')
    await steer(w.io, w.ops, { kind: 'atOnce', n: 1 })
    await tasksCommand(w.io, w.ops, 'start')
    expect(w.calls.filter(c => c.startsWith('spawn')), name).toEqual(['spawn Task 1: Fix the whole layout of the shop header… cockpit:researcher haiku'])
    const run = (await loadRun(w.io))!
    expect(run.smallFirst, name).toBeUndefined()
    expect(runSummary(run), name).not.toMatch(/Smaller/)
  }
})

test('a short window changes nothing when the tasks are already in order of size', async () => {
  const w = world({ [FILE]: '- Aa (researcher)\n- Bbb (researcher)\n' })
  w.mem.set('cockpit:usage:app', usageCard(90))
  await tasksCommand(w.io, w.ops, 'load')
  await steer(w.io, w.ops, { kind: 'atOnce', n: 1 })
  await tasksCommand(w.io, w.ops, 'start')
  expect(w.calls.filter(c => c.startsWith('spawn'))).toEqual(['spawn Task 1: Aa cockpit:researcher haiku'])
  expect((await loadRun(w.io))!.smallFirst).toBeUndefined()
})

test('overnight: the limit stops a helper, its task waits, the run pauses until the reset, goes on, and leaves a report', async () => {
  const w = world({ [FILE]: '- A (researcher)\n- B (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'load')
  await steer(w.io, w.ops, { kind: 'atOnce', n: 1 })
  // A new run waits after a limit; this one is set to go on by itself
  expect((await loadRun(w.io))!.choices.afterLimit).toBe('wait')
  await steer(w.io, w.ops, { kind: 'afterLimit', go: true })
  await tasksCommand(w.io, w.ops, 'start')
  // The limit hits: the engine says so, and the helper ends with an error.
  const reset = NOW + 2 * 60 * MIN
  w.mem.set('cockpit:limit:hit', { at: NOW + MIN })
  w.mem.set('cockpit:usage:app', { at: NOW + MIN, windows: [{ label: '5-hour', percent: 100, resetsAt: new Date(reset).toISOString() }] })
  w.setNow(NOW + MIN)
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'failed' }])
  let run = (await loadRun(w.io))!
  expect(run.status).toBe('paused')
  expect(run.tasks.map(t => t.state)).toEqual(['waiting', 'waiting'])
  expect(run.resumeAt).toBeGreaterThan(reset)
  expect(JSON.stringify([...w.mem.entries()])).toMatch(/Paused a task run for the plan limit/)
  w.setNow(reset - MIN)
  await tick(w.io, w.ops)
  expect(w.calls.filter(c => c.startsWith('spawn'))).toHaveLength(1)
  w.setNow(reset + 2 * MIN)
  w.mem.set('cockpit:usage:app', { at: reset + MIN, windows: [{ label: '5-hour', percent: 3 }] })
  await tick(w.io, w.ops)
  run = (await loadRun(w.io))!
  expect(run.status).toBe('running')
  expect(run.resumeAt).toBeUndefined()
  expect(w.calls.filter(c => c.startsWith('spawn'))).toHaveLength(2)
  expect(JSON.stringify([...w.mem.entries()])).toMatch(/Went on with a task run after a limit reset/)
  await tick(w.io, w.ops, [{ id: 'ag2', status: 'completed' }])
  await tick(w.io, w.ops, [{ id: 'ag3', status: 'completed' }])
  expect((await loadRun(w.io))!.status).toBe('done')
  expect(w.mem.get('cockpit:orch:report')).toBe(run.id)
  expect(await tasksCommand(w.io, w.ops, 'report')).toMatch(/^Task run: Ended \d\d:\d\d\. 1 done, 1 not run\.|^Task run: Ended \d\d:\d\d\. All 2 done\./)
  expect(await tasksCommand(w.io, w.ops, 'history')).toMatch(/^Past runs, newest first:\nTask run: /)
})

test('after a limit, a run set to Wait stays paused for the person; Go on and the kill switch clear the wait', async () => {
  const w = world({ [FILE]: '- A (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'load')
  expect(await tasksCommand(w.io, w.ops, 'afterlimit wait')).toMatch(/^After a plan limit the run waits for you\./)
  // A run saved with its own Go on keeps it; one saved before the choice existed went on by itself
  const saved = (await loadRun(w.io))!
  expect(parseRun({ ...saved, choices: { ...saved.choices, afterLimit: 'go' } })!.choices.afterLimit).toBe('go')
  const { afterLimit: _a, ...older } = saved.choices
  expect(parseRun({ ...saved, choices: older })!.choices.afterLimit).toBe('go')
  await tasksCommand(w.io, w.ops, 'start')
  w.mem.set('cockpit:limit:hit', { at: NOW })
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'failed' }])
  const run = (await loadRun(w.io))!
  expect(run.status).toBe('paused')
  expect(run.resumeAt).toBeUndefined()
  expect(await tasksCommand(w.io, w.ops, 'afterlimit maybe')).toBe('Use: /vaken-tasks afterlimit go|wait')
  expect(await tasksCommand(w.io, w.ops, 'go')).toMatch(/^Going on\./)
})

test('a role model can be Fable; the row says the model the role really gets, and what a task ran on', () => {
  expect(RUNNER_SETTINGS[0].options.map(o => o.value)).toEqual(['haiku', 'sonnet', 'opus', 'fable'])
  const run = newRun(['Fix the header'], NOW, 'Run')
  expect(taskDetail(run.tasks[0], NOW, () => '')).toMatch(/^Builder · auto \(sonnet\)/)
  expect(taskDetail(run.tasks[0], NOW, () => '', { builder: 'opus' })).toMatch(/^Builder · auto \(opus\)/)
  const waiting = run.tasks[0]
  expect(waiting.folder).toBe(true)
  expect(taskDetail({ ...waiting, state: 'waiting' }, NOW, () => '')).toContain('will work in a copy of your files')
  expect(taskDetail({ ...waiting, state: 'running', startedAt: NOW }, NOW, () => '')).toContain('works in a copy of your files')
  expect(taskDetail({ ...waiting, state: 'done', startedAt: NOW - 1000, endedAt: NOW }, NOW, () => '')).toContain('worked in a copy of your files')
  const ran = withTask(run, 1, { state: 'done', ran: 'sonnet' })
  expect(taskFacts(ran.tasks[0])[1]).toBe('Role: Builder, model auto (ran on sonnet)')
  expect(ranOn('sonnet', 'claude-sonnet-5')).toBe('sonnet')
  expect(ranOn('opus')).toBe('opus')
})

test('Try again after a failure goes one model up from the one it ran on; a done task, a stopped one and one on Opus stay as they are', () => {
  const run = newRun(['A (researcher)', 'B (normal)', 'C (fixer)', 'D', 'E (cheap)'], NOW, 'Run')
  let r = withTask(run, 1, { state: 'failed', ran: 'haiku', why: 'error' })
  r = withTask(r, 2, { state: 'done', check: 'failed', ran: 'sonnet' })
  r = withTask(r, 3, { state: 'failed', ran: 'opus' })
  r = withTask(r, 4, { state: 'done', check: 'passed', ran: 'sonnet' })
  r = withTask(r, 5, { state: 'failed', ran: 'haiku', why: 'stopped' })
  for (const n of [1, 2, 3, 4, 5]) r = retryTask(r, n)
  expect(r.tasks.map(t => t.model)).toEqual(['normal', 'strong', 'auto', 'auto', 'cheap'])
  expect(r.tasks.map(t => t.upFrom)).toEqual(['haiku', 'sonnet', undefined, undefined, undefined])
  expect(taskDetail(r.tasks[0], NOW, () => '')).toMatch(/^Researcher · normal · up from haiku/)
  expect(taskFacts({ ...r.tasks[0], tries: 2 })[1]).toBe('Role: Researcher, model normal (ran on haiku), try 2, one model up from haiku after a failure')
  expect(parseRun(JSON.parse(JSON.stringify(r)))!.tasks[0]).toMatchObject({ ran: 'haiku', upFrom: 'haiku' })
})

test('a started task keeps the model it ran on, and retry 1 after a failure starts it one model up', async () => {
  const w = world({ [FILE]: '- Find prices (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'start')
  expect((await loadRun(w.io))!.tasks[0].ran).toBe('haiku')
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'failed' }])
  expect(await tasksCommand(w.io, w.ops, 'retry 1')).toMatch(/^Task 1 waits for its turn again\./)
  expect(w.calls.filter(c => c.startsWith('spawn'))).toEqual(['spawn Task 1: Find prices cockpit:researcher haiku', 'spawn Task 1: Find prices cockpit:researcher sonnet'])
})

test('the roles follow the model map: This session over All projects', async () => {
  const w = world({ [FILE]: '- Fix the header\n' })
  w.mem.set('cockpit:setting:runner.builder', 'opus')
  w.mem.set(`cockpit:sessset:${SID}`, { 'runner.builder': 'fable' })
  forgetBundles()
  // A builder on Fable may cost more than the helper limit, so the first start only shows the cost check; "start anyway" goes on.
  await tasksCommand(withToastGate(w.io), w.ops, 'start anyway')
  expect(w.calls.filter(c => c.startsWith('spawn'))[0]).toMatch(/cockpit:builder fable in /)
})

test('the roles are registered on the chosen models, and again when one changes', async () => {
  const mem = new Map<string, unknown>()
  const registered: string[] = []
  const io = { now: async () => NOW, sessionId: async () => SID, get: async (k: string) => mem.get(k), set: async (k: string, v: unknown) => void mem.set(k, v), del: async (k: string) => void mem.delete(k), keys: async () => [...mem.keys()], toast: () => undefined, invalidate: () => undefined } as unknown as Io
  const ops = runnerOpsOf({
    spawn: async () => ({ agentId: 'x' }),
    stop: async () => undefined,
    send: async () => undefined,
    run: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    root: async () => ROOT,
    cwd: async () => ROOT,
    list: async () => [],
    submit: async () => undefined,
    after: () => undefined,
    register: async (r, m) => void registered.push(`${r} ${m}`),
    io,
  })
  forgetRoles()
  expect(await ops.roles()).toBe(true)
  expect(await ops.roles()).toBe(true)
  expect(registered).toEqual(['researcher haiku', 'builder sonnet', 'reviewer haiku', 'fixer opus'])
  mem.set('cockpit:setting:runner.builder', 'opus')
  expect(await ops.roles()).toBe(true)
  expect(registered.slice(4)).toEqual(['researcher haiku', 'builder opus', 'reviewer haiku', 'fixer opus'])
})

const SPAWNS = (w: ReturnType<typeof world>): number => w.calls.filter(c => c.startsWith('spawn')).length
const THREE = '- A (researcher)\n- B (researcher)\n- C (researcher)\n'

test('the room under the agent cap: the limit less what runs everywhere, nothing when it is off, a bad limit or Auto has no limit of its own', () => {
  expect(capRoom('warn', 3, 0, 0)).toBe(3)
  expect(capRoom('hold', 3, 2, 1)).toBe(1)
  expect(capRoom('hold', 2, 1, 2)).toBe(0)
  expect(capRoom('hold', 2, 5, 0)).toBe(0)
  expect(capRoom('off', 2, 9, 9)).toBe(Infinity)
  expect(capRoom('warn', Number.NaN, 0, 0)).toBe(Infinity)
  expect(capRoom('hold', Infinity, 7, 0)).toBe(Infinity)
})

test('the stagger waits for the first tool call of the last helper, or the time', () => {
  const last = { id: 'ag1', at: NOW }
  expect(staggerWait(undefined, () => false, NOW)).toBe(false)
  expect(staggerWait(last, undefined, NOW)).toBe(false)
  expect(staggerWait(last, () => false, NOW + 1000)).toBe(true)
  expect(staggerWait(last, () => true, NOW + 1000)).toBe(false)
  expect(staggerWait(last, () => false, NOW + STAGGER_MS)).toBe(false)
})

test('the runner never starts more than the agent cap, and counts the helpers of other sessions', async () => {
  const w = world({ [FILE]: THREE })
  w.mem.set('cockpit:setting:cap.max', '2')
  w.mem.set('cockpit:setting:laptop.mode', 'on')
  w.mem.set('cockpit:laptop:v2', ROOMY)
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'start')
  expect(SPAWNS(w)).toBe(2)
  const run = (await loadRun(w.io))!
  expect(run.tasks[2]).toMatchObject({ state: 'waiting', why: 'waits: your limit is reached (2 at once in all sessions)' })
  const o = world({ [FILE]: THREE })
  o.mem.set('cockpit:setting:cap.max', '2')
  o.mem.set('cockpit:setting:laptop.mode', 'on')
  o.mem.set('cockpit:laptop:v2', ROOMY)
  o.mem.set('cockpit:agents:other-session', { n: 1, at: NOW })
  await tasksCommand(o.io, o.ops, 'load')
  await tasksCommand(o.io, o.ops, 'start')
  expect(SPAWNS(o)).toBe(1)
  o.mem.set('cockpit:agents:other-session', { n: 0, at: NOW })
  await tick(o.io, o.ops)
  expect(SPAWNS(o)).toBe(2)
})

test('with the agent cap off the run follows its own "at once"', async () => {
  const w = world({ [FILE]: THREE })
  w.mem.set('cockpit:setting:cap.max', '2')
  w.mem.set('cockpit:setting:cap.mode', 'off')
  w.mem.set('cockpit:setting:laptop.mode', 'on')
  w.mem.set('cockpit:laptop:v2', ROOMY)
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'start')
  expect(SPAWNS(w)).toBe(3)
})

test('helpers start one at a time: the next waits for the first tool call of the one before, or 20 seconds', async () => {
  const w = world({ [FILE]: THREE })
  const seen = new Set<string>()
  w.ops.seen = id => seen.has(id)
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'at 3')
  await tasksCommand(w.io, w.ops, 'start')
  expect(SPAWNS(w)).toBe(1)
  w.setNow(NOW + 10_000)
  await tick(w.io, w.ops)
  expect(SPAWNS(w)).toBe(1)
  seen.add('ag1')
  await tick(w.io, w.ops)
  expect(SPAWNS(w)).toBe(2)
  await tick(w.io, w.ops)
  expect(SPAWNS(w)).toBe(2)
  w.setNow(NOW + 10_000 + STAGGER_MS)
  await tick(w.io, w.ops)
  expect(SPAWNS(w)).toBe(3)
})

test('the text of the run shows the check hint', async () => {
  const run: Run = { ...newRun(['A'], NOW), status: 'setup' }
  const text = tasksText(run, undefined, NOW, () => '1 min')
  expect(text).toContain(`Check hint: ${CHECK_HINT}`)
  expect(text).toMatch(/never more than your own limit/)
  expect(CHECK_HINT).toBe('Run only the tests of files touched.')
})

test('the roles are registered by a forgetting re-register when the map changes', async () => {
  const registered: string[] = []
  const w = world()
  const ops = runnerOpsOf({
    spawn: async () => ({ agentId: 'x' }),
    stop: async () => undefined,
    send: async () => undefined,
    run: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    root: async () => ROOT,
    cwd: async () => ROOT,
    list: async () => [],
    submit: async () => undefined,
    after: () => undefined,
    register: async (r, m) => void registered.push(`${r} ${m}`),
    io: w.io,
  })
  forgetRoles()
  w.mem.set('cockpit:setting:agents.offer', 'on')
  await rolesChanged(ops)
  expect(registered).toEqual(['researcher haiku', 'builder sonnet', 'reviewer haiku', 'fixer opus'])
  w.mem.set('cockpit:setting:runner.reviewer', 'sonnet')
  await rolesChanged(ops)
  expect(registered.slice(4)).toEqual(['researcher haiku', 'builder sonnet', 'reviewer sonnet', 'fixer opus'])
  await rolesChanged(ops)
  expect(registered).toHaveLength(12)
  expect(isRoleKey('runner.fixer')).toBe(true)
  expect(isRoleKey('cap.max')).toBe(false)
  forgetRoles()
})

function offerWorld(registered: string[]): { ops: RunnerOps; w: ReturnType<typeof world> } {
  const w = world({ [FILE]: '- Fix the header\n' })
  const ops = runnerOpsOf({
    spawn: async () => ({ agentId: 'x' }),
    stop: async () => undefined,
    send: async () => undefined,
    run: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    root: async () => ROOT,
    cwd: async () => ROOT,
    list: async () => [],
    submit: async () => undefined,
    after: () => undefined,
    register: async (r, m) => void registered.push(`${r} ${m}`),
    io: w.io,
  })
  return { ops, w }
}

test('Offer agent types is off by default: a fresh session registers nothing, a model change before any run registers nothing', async () => {
  const registered: string[] = []
  const { ops, w } = offerWorld(registered)
  forgetRoles()
  expect(await ops.offered()).toBe(false)
  await rolesChanged(ops)
  w.mem.set('cockpit:setting:runner.builder', 'opus')
  await rolesChanged(ops)
  expect(registered).toEqual([])
  forgetRoles()
})

test('with Offer agent types off, Start registers the four types, once; a later model change updates them', async () => {
  const registered: string[] = []
  const { ops, w } = offerWorld(registered)
  forgetRoles()
  await rolesChanged(ops)
  expect(registered).toEqual([])
  await tasksCommand(w.io, ops, 'start')
  expect(registered).toEqual(['researcher haiku', 'builder sonnet', 'reviewer haiku', 'fixer opus'])
  await tasksCommand(w.io, ops, 'pause')
  await ops.roles()
  expect(registered).toHaveLength(4)
  w.mem.set('cockpit:setting:runner.builder', 'opus')
  await rolesChanged(ops)
  expect(registered.slice(4)).toEqual(['researcher haiku', 'builder opus', 'reviewer haiku', 'fixer opus'])
  forgetRoles()
})

test('with Offer agent types on, the types are registered at session start as before; the key is a role key', async () => {
  const registered: string[] = []
  const { ops, w } = offerWorld(registered)
  forgetRoles()
  w.mem.set('cockpit:setting:agents.offer', 'on')
  await rolesChanged(ops)
  expect(registered).toEqual(['researcher haiku', 'builder sonnet', 'reviewer haiku', 'fixer opus'])
  expect(isRoleKey('agents.offer')).toBe(true)
  forgetRoles()
})

const ledgerOf = (w: ReturnType<typeof world>): { what: string; detail?: string; did?: boolean }[] => (w.mem.get('cockpit:ledger:compact') as { what: string; detail?: string; did?: boolean }[] | undefined) ?? []

test('the Autopilot log gets one row each for a run started, finished and stopped: counts and the run name only, no band line', async () => {
  const w = world({ [FILE]: '- Fix the header\n- Fix the footer\n' })
  await tasksCommand(w.io, w.ops, 'start')
  expect(ledgerOf(w).map(r => r.what)).toEqual(['Task run started'])
  expect(ledgerOf(w)[0]).toMatchObject({ detail: 'Task run: 2 tasks', did: true })
  await tasksCommand(w.io, w.ops, 'stop')
  expect(ledgerOf(w).map(r => r.what)).toEqual(['Task run stopped by you', 'Task run started'])
  expect(ledgerOf(w)[0]?.detail).toBe('Task run: 2 tasks')
  // Quiet: no band line for any of them
  expect([...w.mem.keys()].filter(k => k.includes('band')).every(k => !JSON.stringify(w.mem.get(k)).includes('did:Task run'))).toBe(true)
})

test('a run that ends by itself writes the finished row once', async () => {
  const w = world({ [FILE]: '- Fix the header\n' })
  await tasksCommand(w.io, w.ops, 'start')
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }])
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }])
  const rows = ledgerOf(w).filter(r => r.what === 'Task run finished')
  expect(rows).toHaveLength(1)
  expect(rows[0]?.detail).toBe('Task run: 1 of 1 task done')
})

// ---- Auto "at once": as many as the Mac has room for, never above the agent cap, 3 without a fresh reading, one at a time

const EIGHT = Array.from({ length: 8 }, (_, k) => `- T${k + 1} (researcher)`).join('\n') + '\n'
// Room for 8 more by processor (16 idle cores, 2 per helper); memory would give about 21.
const ROOMY = { at: NOW, pressure: 'normal', freeShare: 0.5, memMb: 64 * 1024, load: 2, cores: 18 }

test('Auto at once: no number of its own (room 12 gives 12); a limit the person set is kept; with no room reading one at a time', () => {
  expect(autoCeiling(Infinity, true)).toBe(Infinity)
  expect(autoCeiling(Number.NaN, true)).toBe(Infinity)
  expect(autoCeiling(6, true)).toBe(6)
  expect(autoCeiling(12, true)).toBe(12)
  expect(autoCeiling(99, true)).toBe(99)
  expect(autoCeiling(Infinity, false)).toBe(1)
  expect(autoCeiling(6, false)).toBe(1)
  expect(autoCeiling(2, true, true)).toBe(Infinity)
  expect(autoCeiling(2, false, true)).toBe(1)
  const run: Run = { ...newRun(Array.from({ length: 12 }, (_, k) => `T${k + 1} (researcher)`), NOW), status: 'running' }
  expect(nextToStart(run).length).toBe(12)
})

test('Auto follows the room on the Mac, up to the agent cap', async () => {
  const w = world({ [FILE]: EIGHT })
  w.mem.set('cockpit:setting:cap.max', '6')
  w.mem.set('cockpit:setting:laptop.mode', 'on')
  w.mem.set('cockpit:laptop:v2', ROOMY)
  await tasksCommand(w.io, w.ops, 'load')
  expect((await loadRun(w.io))!.choices.atOnce).toBe(0)
  await tasksCommand(w.io, w.ops, 'start')
  expect(SPAWNS(w)).toBe(6)
  expect((await loadRun(w.io))!.atNow).toEqual({ n: 6, room: true })
  const t = world({ [FILE]: EIGHT })
  t.mem.set('cockpit:setting:cap.max', '6')
  t.mem.set('cockpit:setting:laptop.mode', 'on')
  t.mem.set('cockpit:laptop:v2', { ...ROOMY, freeShare: 3 / 64 })
  await tasksCommand(t.io, t.ops, 'load')
  await tasksCommand(t.io, t.ops, 'start')
  expect(SPAWNS(t)).toBe(2)
})

test('Auto never goes above the agent cap setting, even with room for more', async () => {
  const w = world({ [FILE]: EIGHT })
  w.mem.set('cockpit:setting:cap.max', '4')
  w.mem.set('cockpit:setting:laptop.mode', 'on')
  w.mem.set('cockpit:laptop:v2', ROOMY)
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'start')
  expect(SPAWNS(w)).toBe(4)
  const o = world({ [FILE]: EIGHT })
  o.mem.set('cockpit:setting:cap.max', '4')
  o.mem.set('cockpit:setting:cap.mode', 'off')
  o.mem.set('cockpit:setting:laptop.mode', 'on')
  o.mem.set('cockpit:laptop:v2', ROOMY)
  await tasksCommand(o.io, o.ops, 'load')
  await tasksCommand(o.io, o.ops, 'start')
  expect(SPAWNS(o)).toBe(8)
})

test('Auto with room for 12 starts 12; with no room reading it starts one, never a fixed 3 (gauge off, or an old reading)', async () => {
  const big = Array.from({ length: 12 }, (_, k) => `- T${k + 1} (researcher)`).join('\n') + '\n'
  const r = world({ [FILE]: big })
  r.mem.set('cockpit:setting:laptop.mode', 'on')
  r.mem.set('cockpit:laptop:v2', { ...ROOMY, cores: 30 })
  await tasksCommand(r.io, r.ops, 'load')
  await tasksCommand(r.io, r.ops, 'start')
  expect(SPAWNS(r)).toBe(12)
  const w = world({ [FILE]: EIGHT })
  w.mem.set('cockpit:setting:cap.max', '8')
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'start')
  expect(SPAWNS(w)).toBe(1)
  expect((await loadRun(w.io))!.atNow).toEqual({ n: 1, room: false })
  const o = world({ [FILE]: EIGHT })
  o.mem.set('cockpit:setting:cap.max', '8')
  o.mem.set('cockpit:setting:laptop.mode', 'on')
  o.mem.set('cockpit:laptop:v2', { ...ROOMY, at: NOW - 60 * 60_000 })
  await tasksCommand(o.io, o.ops, 'load')
  await tasksCommand(o.io, o.ops, 'start')
  expect(SPAWNS(o)).toBe(1)
})

test('Auto still starts one helper at a time, and a number the person chose is kept', async () => {
  const w = world({ [FILE]: EIGHT })
  const seen = new Set<string>()
  w.ops.seen = id => seen.has(id)
  w.mem.set('cockpit:setting:cap.max', '8')
  w.mem.set('cockpit:setting:laptop.mode', 'on')
  w.mem.set('cockpit:laptop:v2', ROOMY)
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'start')
  expect(SPAWNS(w)).toBe(1)
  w.setNow(NOW + 5000)
  w.mem.set('cockpit:laptop:v2', { ...ROOMY, at: NOW + 5000 })
  await tick(w.io, w.ops)
  expect(SPAWNS(w)).toBe(1)
  const f = world({ [FILE]: EIGHT })
  f.mem.set('cockpit:setting:cap.max', '8')
  f.mem.set('cockpit:setting:laptop.mode', 'on')
  f.mem.set('cockpit:laptop:v2', ROOMY)
  await tasksCommand(f.io, f.ops, 'load')
  await tasksCommand(f.io, f.ops, 'at 2')
  expect((await loadRun(f.io))!.choices.atOnce).toBe(2)
  await tasksCommand(f.io, f.ops, 'start')
  expect(SPAWNS(f)).toBe(2)
  await tasksCommand(f.io, f.ops, 'at auto')
  expect((await loadRun(f.io))!.choices.atOnce).toBe(0)
})

test('a long check runs outside the beat: the runner and its commands answer while it runs, and its result lands on the next beat', async () => {
  const w = world({ [FILE]: '- A (researcher)\n- B (researcher)\n' })
  let finish: (r: { code: number; out: string }) => void = () => undefined
  const ops: RunnerOps = { ...w.ops, sh: async (argv, cwd, ms) => (argv.join(' ').includes('npm test') ? new Promise(res => { finish = res }) : w.ops.sh(argv, cwd, ms)) }
  await tasksCommand(w.io, ops, 'load')
  await steer(w.io, ops, { kind: 'check', command: 'npm test' })
  await tasksCommand(w.io, ops, 'at 1')
  await tasksCommand(w.io, ops, 'start')
  await tick(w.io, ops, [{ id: 'ag1', status: 'completed' }])
  expect((await loadRun(w.io))!.tasks[0].check).toBe('running')
  expect(await tasksCommand(w.io, ops, 'pause')).toMatch(/^Paused\./)
  await tasksCommand(w.io, ops, 'go')
  expect((await loadRun(w.io))!.tasks[0].check).toBe('running')
  finish({ code: 0, out: 'ok' })
  await checkSettled()
  await tick(w.io, ops)
  const run = (await loadRun(w.io))!
  expect(run.tasks[0].check).toBe('passed')
  expect(run.tasks[1].state).toBe('running')
})

test('a check stored as running with no check behind it (the session ended) runs again', async () => {
  const w = world({ [FILE]: '- A (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'load')
  const run = (await loadRun(w.io))!
  w.mem.set(ORCH_KEY(SID), { ...run, status: 'running', startedAt: NOW, choices: { ...run.choices, check: 'npm test' }, tasks: [{ ...run.tasks[0], state: 'done', check: 'running' }] })
  await tick(w.io, w.ops)
  expect(w.calls.filter(c => c.startsWith('sh sh -c npm test'))).toHaveLength(1)
  await checkSettled()
  const after = (await tick(w.io, w.ops))!
  expect(after.tasks[0].check).toBe('passed')
  expect(after.status).toBe('done')
})

test('try again after Throw away makes a new folder copy and branch; after Keep it goes on from the kept branch', async () => {
  const w = world({ [FILE]: '- A\n- B\n' })
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'at 2')
  await tasksCommand(w.io, w.ops, 'start')
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'failed' }, { id: 'ag2', status: 'failed' }])
  expect(await tasksCommand(w.io, w.ops, 'throw 1 yes')).toMatch(/^Threw away task 1/)
  expect(await tasksCommand(w.io, w.ops, 'keep 2')).toMatch(/^Kept task 2/)
  w.calls.length = 0
  await tasksCommand(w.io, w.ops, 'retry 1')
  await tasksCommand(w.io, w.ops, 'retry 2')
  const id = NOW.toString(36)
  expect(w.calls).toContain(`sh git worktree add -b vaken-run/${id}-1 ${ROOT}/.claude/worktrees/run-${id}-1 HEAD @ ${ROOT}`)
  expect(w.calls).toContain(`sh git worktree add ${ROOT}/.claude/worktrees/run-${id}-2 vaken-run/${id}-2 @ ${ROOT}`)
  const run = (await loadRun(w.io))!
  expect(run.tasks.map(t => [t.state, t.path, t.kept])).toEqual([['running', `${ROOT}/.claude/worktrees/run-${id}-1`, undefined], ['running', `${ROOT}/.claude/worktrees/run-${id}-2`, undefined]])
})

test('Go on after a pause for cost allows one more limit and does not pause again at once', async () => {
  const w = world({ [FILE]: '- A (researcher)\n- B (researcher)\n- C (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'load')
  let run = (await loadRun(w.io))!
  w.mem.set(ORCH_KEY(SID), { ...run, status: 'running', startedAt: NOW, tasks: run.tasks.map(t => (t.n === 3 ? t : { ...t, state: 'done', usd: 6 })) })
  expect((await tick(w.io, w.ops))!.status).toBe('paused')
  expect(await tasksCommand(w.io, w.ops, 'go')).toMatch(/^Going on\. The run now pauses past \$22\.00\./)
  run = (await tick(w.io, w.ops))!
  expect(run.status).toBe('running')
  expect(run.choices.runUsd).toBe(22)
  expect(w.calls.filter(c => c.startsWith('spawn'))).toHaveLength(1)
})

test('Clear, Run again and a new run wait while folder copies are left; keep all and throw all yes settle them', async () => {
  const w = world({ [FILE]: '- A\n- B\n- C (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'at 3')
  await tasksCommand(w.io, w.ops, 'start')
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }, { id: 'ag2', status: 'completed' }, { id: 'ag3', status: 'completed' }])
  expect((await loadRun(w.io))!.status).toBe('done')
  const left = /^Some folder copies are still there: task 1, 2\. First keep all \(\/vaken-tasks keep all/
  expect(await tasksCommand(w.io, w.ops, 'clear')).toMatch(left)
  expect(await tasksCommand(w.io, w.ops, 'again')).toMatch(left)
  expect(await tasksCommand(w.io, w.ops, 'start')).toMatch(left)
  expect(await loadRun(w.io)).toBeDefined()
  expect(await tasksCommand(w.io, w.ops, 'throw all')).toMatch(/^Throw all deletes every folder copy and branch left \(task 1, 2\).*\/vaken-tasks throw all yes/)
  expect(await tasksCommand(w.io, w.ops, 'keep 1')).toMatch(/^Kept task 1/)
  expect(await tasksCommand(w.io, w.ops, 'clear')).toMatch(/^Some folder copies are still there: task 2\./)
  expect(await tasksCommand(w.io, w.ops, 'throw all yes')).toMatch(/^Threw away task 2/)
  expect(await tasksCommand(w.io, w.ops, 'keep all')).toMatch(/^No folder copy is left\./)
  expect(await tasksCommand(w.io, w.ops, 'clear')).toMatch(/^The run is cleared\./)
  expect(await loadRun(w.io)).toBeUndefined()
  expect(parseSteer('keep all')).toEqual({ kind: 'keepAll' })
  expect(parseSteer('throw all yes')).toEqual({ kind: 'throwAll', yes: true })
})

test('Stop all stops the reviewers too', async () => {
  const w = world({ [FILE]: '- A (researcher)\n- B (researcher)\n' })
  await tasksCommand(w.io, w.ops, 'load')
  await steer(w.io, w.ops, { kind: 'reviewer', isOn: true })
  await tasksCommand(w.io, w.ops, 'at 1')
  await tasksCommand(w.io, w.ops, 'start')
  w.setNow(NOW + MIN)
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }])
  let run = (await loadRun(w.io))!
  expect(run.tasks[0].review).toBe('running')
  const reviewer = run.tasks[0].reviewAgent!
  await tasksCommand(w.io, w.ops, 'stop')
  expect(w.calls).toContain(`stop ${reviewer}`)
  run = (await loadRun(w.io))!
  expect(run.status).toBe('stopped')
  expect(run.tasks[0].review).toBe('failed')
})

test('Claude is asked to start a helper at most 3 times; then the task waits for Go on, which asks again', async () => {
  const w = world({ [FILE]: '- A (researcher)\n' })
  const ops: RunnerOps = { ...w.ops, spawn: async () => ({ deny: 'The server-side auto mode classifier gave no verdict for Agent' }) }
  await tasksCommand(w.io, ops, 'start')
  const asks = (): number => w.calls.filter(c => c.startsWith('ask ')).length
  expect(asks()).toBe(1)
  for (let k = 1; k <= 6; k++) {
    w.setNow(NOW + k * 3 * MIN)
    await tick(w.io, ops)
  }
  expect(asks()).toBe(3)
  const run = (await loadRun(w.io))!
  expect(run.tasks[0].why).toBe('waits: Claude was asked 3 times and did not start it. Go on asks again.')
  expect(parseRun(JSON.parse(JSON.stringify(run)))?.tasks[0].asks).toBe(3)
  await tasksCommand(w.io, ops, 'go')
  expect(asks()).toBe(4)
  expect((await loadRun(w.io))!.tasks[0].why).toBeUndefined()
})

test('Agents: one count, done is the one word; a stopped task is Stopped on the idle ring and only a failure needs you', () => {
  setLang('en')
  const base = { ...newRun(['A', 'B', 'C'], NOW), status: 'done' as const }
  const run = withTask(withTask(withTask(base, 1, { state: 'done', startedAt: NOW - 9 * 60_000, endedAt: NOW - 6 * 60_000 }), 2, { state: 'failed', startedAt: NOW - 9 * 60_000, endedAt: NOW - 8 * 60_000 }), 3, { state: 'stopped', why: 'you stopped it' })
  expect(run.tasks.map(kindOf)).toEqual(['waiting', 'needs', 'idle'])
  expect(failedTasks(run)).toBe(1)
  expect(runCount(run)).toMatchObject({ all: 3, done: 1, failed: 1, stopped: 1 })
  expect(runSummary(run)).toBe('1 of 3 done, 1 failed, 1 stopped')
  expect(runSummary(run, false)).toBe('1 failed, 1 stopped')
  // The Agents card's header says "1 failed", so its line under the bar does not say it again
  expect(runSummary(run, false, false)).toBe('1 stopped')
  // The right column says when it ended; the detail line how long it took, whole parts only
  expect(taskAge(run.tasks[0], NOW)).toBe('6 min ago')
  expect(taskDetail(run.tasks[0], NOW, () => '3 min')).toContain('took 3 min')
  const narrow = taskDetail({ ...run.tasks[0], folder: true, usd: 0.47 }, NOW, () => '3 min', {}, undefined, 30)
  expect(narrow.length).toBeLessThanOrEqual(30)
  expect(narrow).not.toMatch(/·\s*$/)
  expect(narrow.split(' · ').every(p => !p.startsWith('/'))).toBe(true)
})

test('Agents: a small cost reads in the fmt form, never three decimals', () => {
  setLang('en')
  expect(aboutMoney(0.05)).toBe('about\u00a0$0.05')
  expect(aboutMoney(0.004)).toBe('under\u00a0$0.01')
  const rep = reportOf(withTask({ ...newRun(['A'], NOW), status: 'done' }, 1, { state: 'done', usd: 0.21 }), NOW)
  expect(reportHead(rep)).toBe('All 1 done · about\u00a0$0.21')
  // Beside the row's word Done the line says only the cost
  expect(reportHead(rep, undefined, false)).toBe('about\u00a0$0.21')
})

test('the answers of /vaken-tasks follow the language of the draw: Swedish says them in Swedish, English as before', async () => {
  const w = world({ [FILE]: '- Fix the header\n' })
  await tasksCommand(w.io, w.ops, 'load')
  setLang('sv')
  try {
    expect(await tasksCommand(w.io, w.ops, 'add Write tests')).toContain('Lade till uppgift 2.')
    expect(await tasksCommand(w.io, w.ops, 'reviewer maybe')).toBe('Använd: /vaken-tasks reviewer on|off')
    expect(await tasksCommand(w.io, w.ops, 'remove 7')).toContain('Det finns ingen uppgift 7.')
    expect(await tasksCommand(w.io, w.ops, 'at 2')).toContain('Högst 2 åt gången.')
    expect(await tasksCommand(w.io, w.ops, 'template save Plan')).toContain('Sparade mallen "Plan".')
    expect(await tasksCommand(w.io, w.ops, 'template apply Nope')).toContain('Ingen mall heter "Nope".')
  } finally {
    setLang('en')
  }
  expect(await tasksCommand(w.io, w.ops, 'add More')).toContain('Added task 3.')
  expect(await tasksCommand(w.io, w.ops, 'reviewer maybe')).toBe('Use: /vaken-tasks reviewer on|off')
})
