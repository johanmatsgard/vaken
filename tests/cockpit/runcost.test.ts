import { FIRST_CLICK_REPEAT_MS } from '../hooks/ui/firstclick'
// The estimate and the check are tested alone with sample facts.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import type { AppUsage } from '../hooks/core/appusage'
import type { Io } from '../hooks/core/io'
import { VIEW_STRINGS, setLang, tr } from '../hooks/core/lang'
import { editChoices, newRun, ORCH_KEY, parseTaskLine, TASK_WORDS_MAX, withTask } from '../hooks/core/orchestra'
import { emptyState } from '../hooks/core/proof'
import { checkRun, checkWords, estimateLine, estimateRun, reasonLines, roleModelsFrom, taskTextOf, typicalCounts, TYPICAL, WEEK_TIGHT_PERCENT } from '../hooks/core/runcost'
import type { Facts } from '../hooks/core/runcost'
import { checkShown, parseSteer, steer, tasksCommand } from '../hooks/features/orchestra'
import type { RunnerOps } from '../hooks/features/orchestra'
import { forgetStartCheck, forPane, goalRun, loadStartCheck, startPress, startTaskText } from '../hooks/features/home/starttask'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000
const SID = 'sess-0001-xyz'
const ROOT = '/work/shop'

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6
const facts = (over: Partial<Facts> = {}): Facts => ({ roleModels: {}, stats: {}, usage: undefined, hist: {}, now: NOW, ...over })
const usage = (windows: AppUsage['windows']): AppUsage => ({ at: NOW - MIN, windows })

test('the estimate is each waiting task at its role model, from the price table; a reader costs less than a builder', () => {
  const run = newRun(['Fix the header', 'Find prices (researcher)'], NOW)
  const est = estimateRun(run, {}, {})
  expect(est.tasks.map(t => [t.n, t.role, t.model])).toEqual([[1, 'builder', 'sonnet'], [2, 'researcher', 'haiku']])
  expect(est.tasks[0].usd).toBeGreaterThan(est.tasks[1].usd ?? 0)
  expect(near(est.usd, (est.tasks[0].usd ?? 0) + (est.tasks[1].usd ?? 0))).toBe(true)
  expect(est.unpriced).toBe(0)
  expect(est.maxTaskUsd).toBe(est.tasks[0].usd)
  expect(near(est.tasks[0].usd ?? 0, 0.18 + 0.18 + 0.12 + 0.225)).toBe(true)
})

test('a task that has started or ended is not in the estimate; a reviewer adds its pass to each task', () => {
  const run = withTask(newRun(['A', 'B'], NOW), 1, { state: 'running' })
  expect(estimateRun(run, {}, {}).tasks.map(t => t.n)).toEqual([2])
  const plain = estimateRun(newRun(['A'], NOW), {}, {}).usd
  const reviewed = estimateRun(editChoices(newRun(['A'], NOW), { reviewer: true }), {}, {}).usd
  expect(reviewed).toBeGreaterThan(plain)
})

test('a model with no price gives no figure, never zero, and the line says so', () => {
  const run = newRun(['A', 'B (researcher)'], NOW)
  const est = estimateRun(run, { builder: 'mystery-model' }, {})
  expect(est.tasks[0].usd).toBeUndefined()
  expect(est.unpriced).toBe(1)
  expect(est.usd).toBe(estimateRun(newRun(['B (researcher)'], NOW), {}, {}).usd)
  expect(estimateLine(checkRun(run, facts({ roleModels: { builder: 'mystery-model' } })))).toContain('1 without a price')
  expect(estimateLine(checkRun(newRun(['A'], NOW), facts({ roleModels: { builder: 'mystery-model' } })))).toBe('Estimate: no price known for 1 agent.')
})

test('past runs replace the guess for the output once there are three of that kind on that model, and the other counts follow in proportion', () => {
  const few = { normal: { sonnet: { n: 2, out: 2 * 24_000, ms: 0 } } }
  expect(typicalCounts('builder', 'sonnet', few).fromHistory).toBe(false)
  const stats = { normal: { sonnet: { n: 3, out: 3 * 24_000, ms: 0 } } }
  const t = typicalCounts('builder', 'sonnet', stats)
  expect(t.fromHistory).toBe(true)
  expect(t.counts.output).toBe(24_000)
  expect(near(t.counts.read, TYPICAL.builder.read * 2)).toBe(true)
  expect(typicalCounts('builder', 'opus', stats).fromHistory).toBe(false)
  const run = newRun(['A'], NOW)
  expect(near(estimateRun(run, {}, stats).usd, estimateRun(run, {}, {}).usd * 2)).toBe(true)
  expect(estimateLine(checkRun(run, facts({ stats })))).toContain('1 agent, from past runs')
})

test('the model map of the settings: the roles that name one', () => {
  expect(roleModelsFrom({ 'runner.builder': 'opus', detail: 'full' })).toEqual({ builder: 'opus' })
})

test('under its limits a run is not over; the weekly window as it stands is told in a line', () => {
  const run = newRun(['A', 'B'], NOW)
  const c = checkRun(run, facts({ usage: usage([{ label: 'Weekly · all models', percent: 40 }]) }))
  expect(c.over).toBe(false)
  expect(c.reasons).toEqual([])
  expect(reasonLines(c)).toEqual(['The weekly window is 40% used now.'])
  expect(estimateLine(c)).toMatch(/^Estimate: about \$\d\.\d\d at list price \(2 agents\)\. A guess, not what your plan charges\.$/)
})

test('above the run limit or the helper limit it is over, with the reason and the limit in the words', () => {
  const run = newRun(['A', 'B'], NOW)
  const tight = checkRun(editChoices(run, { runUsd: 0.5 }), facts())
  expect(tight.over).toBe(true)
  expect(tight.reasons.map(r => r.kind)).toEqual(['run'])
  expect(reasonLines(tight)).toEqual(['This may cost more than the run limit of $0.50.'])
  const helper = checkRun(editChoices(run, { helperUsd: 0.5 }), facts())
  expect(helper.reasons.map(r => r.kind)).toEqual(['helper'])
  expect(reasonLines(helper)).toEqual(['One agent may cost more than the agent cap of $0.50.'])
  expect(checkRun(editChoices(run, { runUsd: 0.5 }), facts()).sig).toBe(tight.sig)
  expect(checkRun(editChoices(run, { runUsd: 0.6 }), facts()).sig).not.toBe(tight.sig)
})

test('a weekly window nearly used up asks for a second look; a short 5-hour window is only told; both only when the run has something to spend', () => {
  const run = newRun(['A'], NOW)
  const full = usage([{ label: '5-hour', percent: 99 }, { label: 'Weekly · all models', percent: WEEK_TIGHT_PERCENT + 5 }])
  const c = checkRun(run, facts({ usage: full }))
  expect(c.over).toBe(true)
  expect(c.reasons.map(r => r.kind)).toEqual(['week'])
  expect(reasonLines(c)).toEqual(['The weekly window is 95% used.', 'The plan window has about 0 min left at this pace.'])
  const shortOnly = checkRun(run, facts({ usage: usage([{ label: '5-hour', percent: 99 }]) }))
  expect(shortOnly.over).toBe(false)
  expect(reasonLines(shortOnly)).toEqual(['The plan window has about 0 min left at this pace.'])
  const free = checkRun(newRun(['A'], NOW), facts({ usage: full, roleModels: { builder: 'mystery-model' } }))
  expect(free.over).toBe(false)
  const model = checkRun(run, facts({ usage: usage([{ label: 'Weekly · Fable', percent: 4 }, { label: 'Weekly · all models', percent: 80 }]) }))
  expect(model.plan.weekPercent).toBe(80)
  const old = checkRun(run, facts({ usage: { at: NOW - 3 * 60 * MIN, windows: [{ label: 'Weekly · all models', percent: 99 }] } }))
  expect(old.plan.weekPercent).toBeUndefined()
})

test('the words: the typed version tells how to go on by typing, the pane version by pressing', () => {
  const c = checkRun(editChoices(newRun(['A'], NOW), { runUsd: 0.1 }), facts())
  const typed = checkWords(c, true)
  expect(typed).toMatch(/^Estimate: about \$/)
  expect(typed).toContain('Type /vaken-tasks start anyway to go on.')
  expect(forPane(typed)).toContain('Press Start anyway to go on.')
  expect(forPane(typed)).not.toContain('Type /vaken-tasks')
})

test('the words of a task made from the goal: the goal, what done means, plan first; always within the task limit, with no bracket at the end', () => {
  expect(taskTextOf('Add a dark mode toggle', [], false)).toBe('Add a dark mode toggle.')
  expect(taskTextOf('Add a dark mode toggle.', ['tests', 'build'], true)).toBe('Add a dark mode toggle. Done when tests, build pass. Plan first, then work.')
  const long = taskTextOf('x'.repeat(300), ['tests', 'build', 'lint'], true)
  expect(long.length).toBeLessThanOrEqual(TASK_WORDS_MAX)
  expect(long.endsWith('Done when tests, build, lint pass. Plan first, then work.')).toBe(true)
  const t = parseTaskLine(taskTextOf('Fix the header (again)', ['tests'], true), 1)
  expect(t.text).toBe('Fix the header (again). Done when tests pass. Plan first, then work.')
  expect(t.role).toBe('builder')
})

function world() {
  const mem = new Map<string, unknown>([['cockpit:setting:detail', 'explained']])
  const calls: string[] = []
  let reads = 0
  const io: Io = {
    now: async () => NOW,
    home: async () => '',
    sessionId: async () => SID,
    get: async key => {
      reads += 1
      return mem.get(key)
    },
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => {
      throw new Error('no file')
    },
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  // Each message to Claude that starts helpers counts as one call.
  const ops: RunnerOps = {
    send: async () => undefined,
    sh: async () => ({ code: 0, out: 'ok' }),
    root: async () => ROOT,
    statuses: async () => [],
    ask: async text => void calls.push(`ask ${text.split('\n')[0]}`),
  }
  return { io, ops, mem, calls, reads: () => reads }
}

test('parse: "start anyway" is a start that skips the first-press check; "start" alone is not', () => {
  expect(parseSteer('start')).toEqual({ kind: 'start' })
  expect(parseSteer('start anyway')).toEqual({ kind: 'start', anyway: true })
  expect(parseSteer('start ANYWAY')).toEqual({ kind: 'start', anyway: true })
})

test('over its limits, the first start only shows the check and starts nothing; start anyway starts it', async () => {
  const w = world()
  w.mem.set(ORCH_KEY(SID), editChoices(newRun(['Fix the header', 'Write tests'], NOW), { runUsd: 0.5 }))
  const first = await tasksCommand(w.io, w.ops, 'start')
  expect(first).toMatch(/^Estimate: about \$/)
  expect(first).toContain('This may cost more than the run limit of $0.50.')
  expect(first).toContain('Type /vaken-tasks start anyway to go on.')
  expect((w.mem.get(ORCH_KEY(SID)) as { status: string }).status).toBe('setup')
  expect(w.calls).toEqual([])
  expect(checkShown.sig).toBeDefined()
  const text = await tasksCommand(w.io, w.ops, '')
  expect(text).toContain('Estimate: about $')
  expect(text).toContain('run limit of $0.50')
  const second = await tasksCommand(w.io, w.ops, 'start anyway')
  expect(second).toMatch(/^Started: 2 tasks, as many at a time as this Mac has room for\. Estimate: about \$/)
  expect(w.calls.length).toBe(1)
})

test('under its limits Start works as before and still shows the estimate line', async () => {
  const w = world()
  w.mem.set(ORCH_KEY(SID), newRun(['Find prices (researcher)'], NOW))
  const said = await steer(w.io, w.ops, { kind: 'start' })
  expect(said).toMatch(/^Started: 1 task, as many at a time as this Mac has room for\. Estimate: about \$0\.\d+ at list price \(1 agent\)\./)
})

test('the row reads nothing without a goal or a waiting run, keeps its readings for a while, and a run that has started has no check', async () => {
  forgetStartCheck()
  const w = world()
  const proof = emptyState()
  expect(await loadStartCheck(w.io, undefined, proof, {}, NOW)).toBeUndefined()
  expect(w.reads()).toBe(0)
  const running = { ...newRun(['A'], NOW), status: 'running' as const }
  expect(await loadStartCheck(w.io, running, { ...proof, goal: { text: 'g', setAt: NOW, how: 'typed' } }, {}, NOW)).toBeUndefined()
  expect(w.reads()).toBe(0)
  const withGoal = { ...proof, goal: { text: 'Add a dark mode toggle', setAt: NOW, how: 'typed' as const }, done: ['tests' as const] }
  const sc = await loadStartCheck(w.io, undefined, withGoal, {}, NOW)
  expect(sc?.forGoal).toBe(true)
  expect(sc?.check.est.tasks.length).toBe(1)
  const after = w.reads()
  expect(after).toBe(3)
  await loadStartCheck(w.io, undefined, withGoal, {}, NOW + 5_000)
  expect(w.reads()).toBe(after)
  await loadStartCheck(w.io, undefined, withGoal, {}, NOW + 31_000)
  expect(w.reads()).toBe(after + 3)
  const waiting = await loadStartCheck(w.io, newRun(['A', 'B'], NOW), proof, {}, NOW + 31_000)
  expect(waiting?.forGoal).toBe(false)
  expect(waiting?.check.est.tasks.length).toBe(2)
  forgetStartCheck()
})

test('the run the goal would make carries the done checks and plan first; "proof.done" off leaves the checks out', () => {
  const proof = { ...emptyState(), goal: { text: 'Add a dark mode toggle', setAt: NOW, how: 'typed' as const }, done: ['tests' as const, 'types' as const] }
  expect(goalRun(proof, {}, NOW)?.tasks[0].text).toBe('Add a dark mode toggle. Done when tests pass.')
  expect(goalRun(proof, { 'plan.first': 'ask' }, NOW)?.tasks[0].text).toBe('Add a dark mode toggle. Done when tests pass. Plan first, then work.')
  expect(goalRun(proof, { 'proof.done': 'off' }, NOW)?.tasks[0].text).toBe('Add a dark mode toggle.')
  expect(goalRun(emptyState(), {}, NOW)).toBeUndefined()
})

test('the button says Start anyway only after the first press showed this check', () => {
  const over = { check: checkRun(editChoices(newRun(['A'], NOW), { runUsd: 0.1 }), facts()), forGoal: false }
  const start = { label: 'Start run', args: 'start' }
  delete checkShown.sig
  expect(startPress(over, start)).toEqual(start)
  checkShown.sig = over.check.sig
  expect(startPress(over, start)).toEqual({ label: 'Start anyway', args: 'start anyway' })
  const bigger = { check: checkRun(editChoices(newRun(['A', 'B'], NOW), { runUsd: 0.1 }), facts()), forGoal: false }
  expect(startPress(bigger, start)).toEqual(start)
  const fine = { check: checkRun(newRun(['A'], NOW), facts()), forGoal: false }
  checkShown.sig = fine.check.sig
  expect(startPress(fine, start)).toEqual(start)
  delete checkShown.sig
})

test('the text of /vaken: a goal the person typed, what done means, and where to start it', () => {
  const proof = { ...emptyState(), goal: { text: 'Add a dark mode toggle', setAt: NOW, how: 'typed' as const }, done: ['tests' as const, 'lint' as const] }
  const check = checkRun(goalRun(proof, {}, NOW)!, facts())
  const lines = startTaskText({ proof, values: { 'plan.first': 'suggest' }, startCheck: { check, forGoal: true } } as never)
  expect(lines[0]).toBe('Run one task: Add a dark mode toggle, done when tests, lint pass. Start it in the Agents card in the pane.')
  // Calm is quiet: no goal, or one taken from the first message, says nothing
  expect(startTaskText({ proof: emptyState(), values: {} } as never)).toEqual([])
  expect(startTaskText({ proof: { ...proof, goal: { ...proof.goal, how: 'first' as const } }, values: {} } as never)).toEqual([])
  expect(startTaskText({ proof, values: {}, run: { ...newRun(['A'], NOW), status: 'running' } } as never)).toEqual([])
})

test('every new word has a Swedish line that is not the English one, and is among the strings the views translate', () => {
  const words = englishOf('runcost')
  expect(words.filter(w => !VIEW_STRINGS.includes(w))).toEqual([])
  expect(words.filter(w => (SV[w] ?? '') === '' || (SV[w] === w && w !== '1 agent'))).toEqual([])
  for (const w of words) expect([...w.matchAll(/\{\w+\}/g)].map(m => m[0]).sort()).toEqual([...(SV[w] ?? '').matchAll(/\{\w+\}/g)].map(m => m[0]).sort())
  setLang('sv')
  try {
    const c = checkRun(editChoices(newRun(['A'], NOW), { runUsd: 0.1 }), facts())
    expect(estimateLine(c, tr)).toMatch(/^Uppskattning: ungefär \d+,\d+\u00a0USD/)
    expect(reasonLines(c, tr)[0]).toContain('körningens gräns')
    expect(estimateLine(c)).toMatch(/^Estimate: about \d+,\d+\u00a0USD/)
    expect(reasonLines(c)[0]).toMatch(/^This may cost more than the run limit/)
  } finally {
    setLang('en')
  }
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }

function harness(on: On, seed: Record<string, unknown>) {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:detail': 'explained', ...seed }))
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('fs.write', () => ({ value: undefined }) as never)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  return { mem, toasts }
}
const world2 = (over: Record<string, unknown> = {}) => ({
  'cockpit:firstrun': 'done',
  'cockpit:setting:detail.agents': 'explained',
  'cockpit:setting:cards.agents': 'show',
  'cockpit:session:test-session': { sessionId: 'test-session', cwd: '/work/app', model: 'm', state: 'idle', startedAt: NOW - 60 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, title: 'Fix login', branch: 'feat-x' },
  ...over,
})
const textOf = async (ui: { find: (q: unknown) => Promise<unknown> }, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })

const openStartRow = async (ui: { press: (q: unknown) => Promise<unknown>; redraw: () => Promise<unknown> }, clock: { settle: () => Promise<unknown> }) => {
  await ui.press({ key: 'press-ol-start-task-0' })
  await clock.settle()
  await ui.redraw()
}

test('the Run one task row is one folded line by default: no goal, switches or Start button until a press opens it, and a second press folds it again', { timeoutMs: 15_000 }, async ($, on) => {
  forgetStartCheck()
  delete checkShown.sig
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  harness(on, world2())
  const ui = await mountPane($)
  expect(await textOf(ui, /^Run one task$/)).toBe(true)
  for (const t of ['Goal', 'Tests pass', 'Plan first']) expect(await textOf(ui, new RegExp(`^${t}$`))).toBe(false)
  expect(await ui.find({ key: 'start-go' })).toBeUndefined()
  await openStartRow(ui, clock)
  expect(await textOf(ui, /^Tests pass$/)).toBe(true)
  expect(await ui.find({ key: 'start-go' })).toBeDefined()
  await ui.press({ key: 'press-ol-start-task-0' })
  await clock.settle()
  await ui.redraw()
  expect(await ui.find({ key: 'start-go' })).toBeUndefined()
  await ui.unmount()
})

test('the Agents card shows the Run one task row: with no goal its one button leads to the add-a-task box, never a toast about /vaken-tasks goal, and starts nothing', { timeoutMs: 15_000 }, async ($, on) => {
  forgetStartCheck()
  delete checkShown.sig
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = harness(on, world2())
  const ui = await mountPane($)
  await openStartRow(ui, clock)
  expect(await textOf(ui, /^Run one task$/)).toBe(true)
  expect(await textOf(ui, /^No goal yet\. Add a task to start a run\.$/)).toBe(true)
  for (const t of ['Tests pass', 'The build works', 'Lint is clean', 'Plan first']) expect(await textOf(ui, new RegExp(`^${t}$`))).toBe(true)
  expect(((await ui.find({ key: 'start-go' })) as { props?: { label?: string } } | undefined)?.props?.label).toBe('Add a task')
  await ui.press({ key: 'start-go' })
  await clock.settle()
  await ui.redraw()
  expect(await ui.find({ key: 'rv-add' })).toBeDefined()
  expect(w.toasts.some(t => /vaken-tasks goal/.test(t))).toBe(false)
  expect(w.mem.get(ORCH_KEY('test-session'))).toBeUndefined()
  await ui.unmount()
})

test('with a goal the row shows it and the estimate; a switch flips the definition of done and plan first', { timeoutMs: 15_000 }, async ($, on) => {
  forgetStartCheck()
  delete checkShown.sig
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = harness(on, world2({ 'cockpit:proof:test-session': { ...emptyState(), goal: { text: 'Add a dark mode toggle', setAt: NOW, how: 'typed' } } }))
  const ui = await mountPane($)
  await openStartRow(ui, clock)
  expect(await textOf(ui, /^Add a dark mode toggle$/)).toBe(true)
  expect(((await ui.find({ key: 'start-go' })) as { props?: { label?: string } } | undefined)?.props?.label).toBe('Start run')
  expect(await textOf(ui, /^Estimate: about \$\d+\.\d+ at list price \(1 agent\)\./)).toBe(true)
  await ui.press({ key: 'start-done-tests-switch' })
  await clock.settle()
  expect((w.mem.get('cockpit:proof:test-session') as { done: string[] }).done).toEqual(['tests'])
  // Plan first offers Settings' three choices
  await ui.press({ key: 'start-plan-off' })
  await clock.settle()
  await ui.redraw()
  expect(w.mem.get('cockpit:setting:plan.first')).toBe('off')
  for (const t0 = Date.now(); Date.now() - t0 < FIRST_CLICK_REPEAT_MS + 50; );
  await ui.press({ key: 'start-plan-ask' })
  await clock.settle()
  expect(w.mem.get('cockpit:setting:plan.first')).toBe('ask')
  await ui.unmount()
  forgetStartCheck()
})

test('a run in setup shows its estimate; over its limit the first Start run press only says so and the button then says Start anyway', { timeoutMs: 15_000 }, async ($, on) => {
  forgetStartCheck()
  delete checkShown.sig
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = harness(on, world2({ [ORCH_KEY('test-session')]: editChoices(newRun(['Fix the header', 'Write tests'], NOW), { runUsd: 0.5 }) }))
  const ui = await mountPane($)
  expect(await textOf(ui, /^Estimate: about \$\d+\.\d+ at list price \(2 agents\)\./)).toBe(true)
  expect(await textOf(ui, /^This may cost more than the run limit of \$0\.50\.$/)).toBe(true)
  expect(await ui.find({ key: 'run-start' })).toBeDefined()
  await ui.press({ key: 'run-start' })
  await clock.settle()
  expect(w.toasts.some(t => /Press Start anyway to go on\./.test(t))).toBe(true)
  expect((w.mem.get(ORCH_KEY('test-session')) as { status: string }).status).toBe('setup')
  await ui.redraw()
  w.toasts.length = 0
  await ui.press({ key: 'run-start' })
  await clock.settle()
  expect(w.toasts.some(t => /Started: 2 tasks/.test(t))).toBe(true)
  expect((w.mem.get(ORCH_KEY('test-session')) as { status: string }).status).not.toBe('setup')
  await ui.unmount()
  delete checkShown.sig
  forgetStartCheck()
})
