// The cost of the busiest hooks: every tool call, prompt and turn passes through all the blocks.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000
const STEP_MS = 2_000
// Each test drives every block through many clock steps: under a busy laptop that can pass 5 s, so the limit is wider.

type Counts = { get: number; set: number; keys: number; run: number; redraws: number; by: Record<string, number>; wrote: Record<string, number>; calls?: number }
const reads = (c: Counts): number => c.get + c.keys

const rec = (id: string, over: Record<string, unknown> = {}) => ({
  sessionId: id,
  cwd: `/work/${id}`,
  model: 'claude-opus-5',
  state: 'working',
  startedAt: NOW - 20 * MIN,
  updatedAt: NOW - 2000,
  lastEventAt: NOW - 2000,
  stateSince: NOW - 3 * MIN,
  ...over,
})

function world(others = 9): Record<string, unknown> {
  const out: Record<string, unknown> = { 'cockpit:session:test-session': rec('test-session', { cwd: '/work/app', contextPercent: 38, costUsd: 1.2 }), 'cockpit:firstrun': 'done' }
  for (let n = 1; n <= others; n += 1) out[`cockpit:session:s${n}`] = rec(`s${n}`, n === 1 ? { ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 4 * MIN } } : { state: n % 2 === 0 ? 'waiting' : 'idle' })
  const settings: Record<string, string> = { detail: 'simple', 'loop.breaker': 'warn', 'cards.computer': 'hide' }
  for (const [k, v] of Object.entries(settings)) out[`cockpit:setting:${k}`] = v
  return out
}

function engine(on: On, counts: Counts, others = 9) {
  const mem = new Map<string, unknown>(Object.entries(world(others)))
  const tally = (key: string) => {
    const k = key.startsWith('cockpit:setting:') ? 'cockpit:setting:*' : key.replace(/:(s\d+)$/, ':<id>')
    counts.by[k] = (counts.by[k] ?? 0) + 1
  }
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => {
    counts.redraws += 1
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.complete', (_$, e) => ({ text: (e as { answer?: string }).answer ?? '' }) as never)
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  on('fs.read', () => ({ value: 'export const a = 1\n' }) as never)
  on('mcp.call', () => {
    counts.calls = (counts.calls ?? 0) + 1
    return { value: { content: [{ type: 'text', text: 'not offered here' }], isError: true } } as never
  })
  on('process.run', () => {
    counts.run += 1
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('store.get', (_$, e) => {
    counts.get += 1
    tally(e.key)
    return { value: mem.get(e.key) } as never
  })
  on('store.set', (_$, e) => {
    counts.set += 1
    const k = e.key.startsWith('cockpit:setting:') ? 'cockpit:setting:*' : e.key.replace(/test-session/g, '<me>')
    counts.wrote[k] = (counts.wrote[k] ?? 0) + 1
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => {
    counts.keys += 1
    counts.by['<keys>'] = (counts.by['<keys>'] ?? 0) + 1
    return { value: [...mem.keys()] } as never
  })
  return mem
}

async function readsPer(clock: { advance: (ms: number) => Promise<void>; settle: () => Promise<void> }, counts: Counts, step: (n: number) => Promise<unknown>, n = 6): Promise<{ per: number; writes: number; runs: number; by: Record<string, number>; wrote: Record<string, number> }> {
  await clock.advance(STEP_MS)
  await step(-1)
  await clock.settle()
  let total = 0
  let runs = 0
  const by: Record<string, number> = {}
  const start = { set: counts.set, wrote: { ...counts.wrote } }
  for (let k = 0; k < n; k += 1) {
    await clock.advance(STEP_MS)
    const before = { ...counts, by: { ...counts.by } }
    await step(k)
    await clock.settle()
    total += reads(counts) - reads(before)
    runs += counts.run - before.run
    for (const [key, v] of Object.entries(counts.by)) if (v !== (before.by[key] ?? 0)) by[key] = (by[key] ?? 0) + v - (before.by[key] ?? 0)
  }
  const per = (v: number): number => Math.round((v / n) * 10) / 10
  const wrote = Object.fromEntries(Object.entries(counts.wrote).filter(([k, v]) => v !== (start.wrote[k] ?? 0)).map(([k, v]) => [k, per(v - (start.wrote[k] ?? 0))]))
  return { per: per(total), writes: per(counts.set - start.set), runs, by: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, per(v)])), wrote }
}

// The reads of quiet time, per window of `ms`, and how often the band was asked to redraw (nothing changed, so it must not be).
async function idlePer(clock: { advance: (ms: number) => Promise<void> }, counts: Counts & { redraws: number }, ms: number, n: number): Promise<{ per: number; writes: number; redraws: number; by: Record<string, number> }> {
  const before = { ...counts, by: { ...counts.by } }
  for (let k = 0; k < n; k += 1) await clock.advance(ms / n)
  const by: Record<string, number> = {}
  for (const [key, v] of Object.entries(counts.by)) if (v !== (before.by[key] ?? 0)) by[key] = Math.round(((v - (before.by[key] ?? 0)) / n) * 10) / 10
  return { per: Math.round(((reads(counts) - reads(before)) / n) * 10) / 10, writes: Math.round(((counts.set - before.set) / n) * 10) / 10, redraws: counts.redraws - before.redraws, by }
}

// Measured with this test (store reads, before the speed step -> after): Read 135 -> 5.7, Edit 141 -> 8, Bash 140 -> 8.
export const BUDGET = { tool: 9, prompt: 8, turnEnd: 7, pane: 32, closedCheck: 5, quiet10s: 50 }
// Measured with this test (before -> after the hot notes of core/flush.ts): Read 3.2 -> 0.3, Edit 4.7 -> 0.7, Bash 4.2 -> 0.3.
export const WRITE_BUDGET = { tool: 1, prompt: 3.5, turnEnd: 4, quiet10s: 2.25 }
// Measured: 4 before and after the leader (a follower makes only the first kind).
export const CALL_BUDGET = { quietMinute: 4 }

const start = async ($: Parameters<Parameters<typeof test>[1]>[0]) => {
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
}

test(`a tool step (Read, Edit, Bash) costs at most ${BUDGET.tool} store reads and ${WRITE_BUDGET.tool} write with a moving clock, and an ordinary one runs no process`, SLOW, async ($, on) => {
  const counts: Counts = { get: 0, set: 0, keys: 0, run: 0, redraws: 0, by: {}, wrote: {} }
  const clock = mock.clock(on, { now: NOW })
  engine(on, counts)
  await start($)
  const read = await readsPer(clock, counts, n => $.tool.call({ tool: 'Read', file_path: `/work/app/a${n}.ts` } as never))
  const edit = await readsPer(clock, counts, n => $.tool.call({ tool: 'Edit', file_path: `/work/app/b${n}.ts`, old_string: 'a', new_string: 'b' } as never))
  const bash = await readsPer(clock, counts, n => $.tool.call({ tool: 'Bash', command: `ls /work/app/dir${n}` } as never))
  expect(read.per).toBeLessThanOrEqual(BUDGET.tool)
  expect(edit.per).toBeLessThanOrEqual(BUDGET.tool)
  expect(bash.per).toBeLessThanOrEqual(BUDGET.tool)
  expect((read.writes + edit.writes + bash.writes) / 3).toBeLessThanOrEqual(WRITE_BUDGET.tool)
  for (const r of [read, edit, bash]) expect(r.writes).toBeLessThanOrEqual(WRITE_BUDGET.tool)
  expect(read.runs + edit.runs + bash.runs).toBe(0)
})

test(`a prompt costs at most ${BUDGET.prompt} store reads and ${WRITE_BUDGET.prompt} writes, and the end of a turn at most ${BUDGET.turnEnd} and ${WRITE_BUDGET.turnEnd}`, SLOW, async ($, on) => {
  const counts: Counts = { get: 0, set: 0, keys: 0, run: 0, redraws: 0, by: {}, wrote: {} }
  const clock = mock.clock(on, { now: NOW })
  engine(on, counts)
  await start($)
  const prompt = await readsPer(clock, counts, n => $.prompt.submit({ text: `look at file a${n}.ts and tell me what it does` } as never).catch(() => undefined))
  const turnEnd = await readsPer(clock, counts, n => $.turn.complete({ answer: 'Done.', durationMs: 30_000, isAborted: false, turnId: `t${n}`, reason: 'answer' } as never).catch(() => undefined))
  expect(prompt.per).toBeLessThanOrEqual(BUDGET.prompt)
  expect(turnEnd.per).toBeLessThanOrEqual(BUDGET.turnEnd)
  expect(prompt.writes).toBeLessThanOrEqual(WRITE_BUDGET.prompt)
  expect(turnEnd.writes).toBeLessThanOrEqual(WRITE_BUDGET.turnEnd)
})

const bandProps = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} }
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }

test(`drawing the pane costs at most ${BUDGET.pane} store reads`, SLOW, async ($, on) => {
  const counts: Counts = { get: 0, set: 0, keys: 0, run: 0, redraws: 0, by: {}, wrote: {} }
  const clock = mock.clock(on, { now: NOW })
  engine(on, counts)
  await start($)
  const pane = await readsPer(clock, counts, async () => {
    const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
    await ui.unmount()
  })
  expect(pane.per).toBeLessThanOrEqual(BUDGET.pane)
})

test(`with the pane closed the 10-second redraw check costs at most ${BUDGET.closedCheck} store reads and redraws nothing that did not change; a quiet minute stays bounded (${BUDGET.quiet10s} reads, ${WRITE_BUDGET.quiet10s} writes per 10 s, ${CALL_BUDGET.quietMinute} app calls)`, SLOW, async ($, on) => {
  const counts: Counts = { get: 0, set: 0, keys: 0, run: 0, redraws: 0, by: {}, wrote: {} }
  const clock = mock.clock(on, { now: NOW })
  engine(on, counts)
  await start($)
  // The band drew once, then a quiet minute: every timer of the session runs as it would, nothing changes.
  const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
  await clock.settle()
  const callsBefore = counts.calls ?? 0
  const minute = await idlePer(clock, counts, 60_000, 6)
  const calls = (counts.calls ?? 0) - callsBefore
  const check = await idlePer(clock, counts, 10_000, 1)
  await band.unmount()
  expect(check.per).toBeLessThanOrEqual(BUDGET.closedCheck)
  expect(check.redraws + minute.redraws).toBe(0)
  expect(minute.per).toBeLessThanOrEqual(BUDGET.quiet10s)
  expect(minute.writes).toBeLessThanOrEqual(WRITE_BUDGET.quiet10s)
  expect(calls).toBeLessThanOrEqual(CALL_BUDGET.quietMinute)
})

// FINDING (measured here): a tool step, a prompt and a turn end stay inside the budgets above.
export const SCALE_BUDGET = { pane: 60, quiet10s: 95 }
test(`with 36 sessions in the store the hot path stays inside the same budgets (tool ${BUDGET.tool}, prompt ${BUDGET.prompt}, turn end ${BUDGET.turnEnd}; pane and quiet minute held to the scale budget)`, SLOW, async ($, on) => {
  const counts: Counts = { get: 0, set: 0, keys: 0, run: 0, redraws: 0, by: {}, wrote: {} }
  const clock = mock.clock(on, { now: NOW })
  engine(on, counts, 35)
  await start($)
  const edit = await readsPer(clock, counts, n => $.tool.call({ tool: 'Edit', file_path: `/work/app/b${n}.ts`, old_string: 'a', new_string: 'b' } as never))
  const prompt = await readsPer(clock, counts, n => $.prompt.submit({ text: `look at file a${n}.ts and tell me what it does` } as never).catch(() => undefined))
  const turnEnd = await readsPer(clock, counts, n => $.turn.complete({ answer: 'Done.', durationMs: 30_000, isAborted: false, turnId: `t${n}`, reason: 'answer' } as never).catch(() => undefined))
  const pane = await readsPer(clock, counts, async () => {
    const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
    await ui.unmount()
  })
  const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
  await clock.settle()
  const minute = await idlePer(clock, counts, 60_000, 6)
  await band.unmount()
  const said = `36 sessions: edit ${edit.per}, prompt ${prompt.per}, turn end ${turnEnd.per}, pane ${pane.per} reads; writes edit ${edit.writes}, prompt ${prompt.writes}, turn end ${turnEnd.writes}; quiet 10 s ${minute.per} reads, ${minute.writes} writes`
  expect(edit.per, said).toBeLessThanOrEqual(BUDGET.tool)
  expect(edit.writes, said).toBeLessThanOrEqual(WRITE_BUDGET.tool)
  expect(prompt.per, said).toBeLessThanOrEqual(BUDGET.prompt)
  expect(prompt.writes, said).toBeLessThanOrEqual(WRITE_BUDGET.prompt)
  expect(turnEnd.per, said).toBeLessThanOrEqual(BUDGET.turnEnd)
  expect(turnEnd.writes, said).toBeLessThanOrEqual(WRITE_BUDGET.turnEnd)
  expect(pane.per, said).toBeLessThanOrEqual(SCALE_BUDGET.pane)
  expect(minute.per, said).toBeLessThanOrEqual(SCALE_BUDGET.quiet10s)
  expect(minute.writes, said).toBeLessThanOrEqual(WRITE_BUDGET.quiet10s)
})
