// Effort fits the ask: the local rule, the run of similar asks, no model, and the one press on This session.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { ASK_RUN_START, askFits, askKindLocal, keepsRun, nextAskRun } from '../hooks/core/modelfit'
import { askBackNow, askEffort, askHint, askLowNow, askMem, fitMem, forgetAsks, noteAsk } from '../hooks/features/home/modelfit'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

test('the local rule names a look-up, a small edit, a debug or a plan, and says nothing when unsure', () => {
  expect(askKindLocal('look at file a1.ts and tell me what it does')).toBe('lookup')
  expect(askKindLocal('Where is the band drawn?')).toBe('lookup')
  expect(askKindLocal('vad gör den här filen?')).toBe('lookup')
  expect(askKindLocal('rename fooBar to fooBaz in a.ts')).toBe('edit')
  expect(askKindLocal('fix the typo in the README')).toBe('edit')
  expect(askKindLocal('the tests fail after the merge, why?')).toBe('debug')
  expect(askKindLocal('it crashes when I press save')).toBe('debug')
  expect(askKindLocal('plan the new settings page')).toBe('plan')
  expect(askKindLocal('refactor the store layer')).toBe('plan')
  expect(askKindLocal('ok go ahead')).toBeUndefined()
  expect(askKindLocal('/vaken')).toBeUndefined()
  expect(askKindLocal('')).toBeUndefined()
  // A long ask is never called simple by the rule
  expect(askKindLocal(`show ${'the thing and the other thing '.repeat(12)}`)).toBeUndefined()
  // Words inside other words do not count
  expect(askKindLocal('show the prefix list')).toBe('lookup')
})

test('simple asks make one run; any bigger ask ends it and starts another', () => {
  let r = nextAskRun(ASK_RUN_START, 'lookup')
  expect(r).toEqual({ simple: true, n: 1, shown: false })
  r = nextAskRun({ ...r, shown: true }, 'edit')
  expect(r).toEqual({ simple: true, n: 2, shown: true })
  r = nextAskRun(r, 'debug')
  expect(r).toEqual({ simple: false, n: 1, shown: false })
  expect(nextAskRun(r, 'lookup')).toEqual({ simple: true, n: 1, shown: false })
})

test('the line shows for a simple run at high effort only, once per run', () => {
  const run = { simple: true, n: 1, shown: false }
  expect(askFits({ on: true, run, effort: 'high', low: false })).toBe(true)
  expect(askFits({ on: true, run, effort: 'xhigh', low: false })).toBe(true)
  expect(askFits({ on: true, run, effort: 'medium', low: false })).toBe(false)
  expect(askFits({ on: true, run, effort: undefined, low: false })).toBe(false)
  expect(askFits({ on: false, run, effort: 'high', low: false })).toBe(false)
  expect(askFits({ on: true, run, effort: 'high', low: true })).toBe(false)
  expect(askFits({ on: true, run: { ...run, shown: true }, effort: 'high', low: false })).toBe(false)
  expect(askFits({ on: true, run: { ...run, simple: false }, effort: 'high', low: false })).toBe(false)
})

const fresh = (effort: 'high' | 'medium' = 'high') => {
  forgetAsks()
  fitMem.effort = effort
  askMem.on = true
}
test('a sure ask is counted; an unsure one is only counted as unsure, with no model and no words kept', () => {
  fresh()
  noteAsk('where is the band drawn?')
  expect(askHint(true)).toEqual({ kind: 'fits' })
  noteAsk('ok and the other one')
  expect(askMem.counts).toEqual({ lookup: 1, edit: 0, debug: 0, plan: 0, unsure: 1 })
  expect(askHint(true)).toEqual({ kind: 'fits' })
  expect(JSON.stringify(askMem)).not.toContain('band')
  expect(JSON.stringify(askMem)).not.toContain('other one')
})

test('at medium effort an unsure ask costs nothing and no line shows', () => {
  fresh('medium')
  noteAsk('ok and the other one')
  noteAsk('where is it?')
  expect(askHint(true)).toBeUndefined()
  expect(askMem.counts.unsure).toBe(1)
})

test('a very short ask or a plain yes, no or ok keeps the run as it was', async () => {
  for (const t of ['ok', 'yes', 'no', 'ok.', 'Yes please', 'go ahead', 'do it', 'ja', 'nej tack', 'and the rest', 'x'.repeat(19)]) expect(keepsRun(t), t).toBe(true)
  for (const t of ['ok and the other one', 'yes, and then rename the whole module', 'x'.repeat(20)]) expect(keepsRun(t), t).toBe(false)
  fresh()
  const io = { toast: () => undefined, now: async () => NOW, sessionId: async () => 'me', get: async () => undefined, set: async () => undefined, invalidate: () => undefined } as never
  noteAsk('where is it?')
  await askLowNow(io)
  expect(askEffort('high')).toBe('low')
  const run = { ...askMem.run }
  const unsure = askMem.counts.unsure
  for (const t of ['ok', 'yes please', 'and the rest', 'go ahead']) noteAsk(t)
  // the low effort stays, the run and the counts are as they were
  expect(askEffort('high')).toBe('low')
  expect(askMem.run).toEqual(run)
  expect(askMem.counts.unsure).toBe(unsure)
  // a longer unsure ask puts the person's own effort back
  noteAsk('and what about the other module over there')
  expect(askEffort('high')).toBeUndefined()
  expect(askMem.counts.unsure).toBe(unsure + 1)
})

test('the setting off: no line', () => {
  fresh()
  askMem.on = false
  noteAsk('ok and the other one')
  noteAsk('where is it?')
  expect(askHint(false)).toBeUndefined()
})

test('the press lowers only the main loop\'s steps; a bigger ask puts the person\'s effort back by itself, never lower', async () => {
  fresh()
  const toasts: string[] = []
  const io = { toast: (t: string) => toasts.push(t), now: async () => NOW, sessionId: async () => 'me', get: async () => undefined, set: async () => undefined, invalidate: () => undefined } as never
  noteAsk('where is it?')
  expect(askEffort('high')).toBeUndefined()
  await askLowNow(io)
  expect(toasts).toEqual(['Low effort for these quick asks. A bigger ask goes back to high.'])
  expect(askHint(true)).toEqual({ kind: 'low', old: 'high' })
  expect(askEffort('high')).toBe('low')
  expect(askEffort('low')).toBeUndefined()
  expect(askEffort(undefined)).toBeUndefined()
  noteAsk('rename a to b in x.ts')
  expect(askEffort('high')).toBe('low')
  noteAsk('the build fails, why?')
  expect(askEffort('high')).toBeUndefined()
  expect(askHint(true)).toBeUndefined()
})

test('while lowered, an unsure ask puts the person\'s own effort back at once', async () => {
  fresh()
  const io = { toast: () => undefined, now: async () => NOW, sessionId: async () => 'me', get: async () => undefined, set: async () => undefined, invalidate: () => undefined } as never
  noteAsk('where is it?')
  await askLowNow(io)
  expect(askEffort('high')).toBe('low')
  noteAsk('and that other one too, the same way')
  expect(askEffort('high')).toBeUndefined()
})

test('Back puts the effort back and the line does not come again in the same run', async () => {
  fresh()
  const io = { toast: () => undefined, now: async () => NOW, sessionId: async () => 'me', get: async () => undefined, set: async () => undefined, invalidate: () => undefined } as never
  noteAsk('where is it?')
  await askLowNow(io)
  await askBackNow(io)
  expect(askEffort('high')).toBeUndefined()
  noteAsk('and where is the other?')
  expect(askHint(true)).toBeUndefined()
  noteAsk('plan the next part')
  noteAsk('where is the band?')
  expect(askHint(true)).toEqual({ kind: 'fits' })
})

test('every new text has Swedish', () => {
  for (const en of ['Low effort fits this', 'Use low effort for quick asks', 'Low effort for quick asks', 'Low effort for these quick asks. A bigger ask goes back to {old}.']) expect(SV[en] ?? '').not.toBe('')
})

// ---- The pane

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }
function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('mcp.call', () => ({ value: { content: [{ type: 'text', text: 'no' }], isError: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
}
function memStore(on: On, seed: Record<string, unknown>): Map<string, unknown> {
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
  return mem
}
const rec = { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'working', startedAt: NOW - 60 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN }
type Ui = { find: (q: unknown) => Promise<unknown>; press: (a: { key: string }) => Promise<void>; redraw: () => Promise<void>; unmount: () => Promise<void> }
const textOf = async (ui: Ui, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps }) as Promise<Ui>
// The engine beneath: the effort each main-loop step is sent with, and how often the model was asked to classify.
function drive($: Parameters<Parameters<typeof test>[1]>[0], on: On) {
  const efforts: unknown[] = []
  const classified = { n: 0 }
  on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
  on('model.classify', () => {
    classified.n += 1
    return { value: 'lookup' } as never
  })
  on('turn.step', async function* (_$, e) {
    efforts.push(e.effort)
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [] } as never
  })
  const step = async (index: number) => {
    const s = $.turn.step({ turnId: 'turn-1', index, model: 'claude-opus-5', effort: 'high', messageCount: 1 } as never)
    for await (const _ of s) void _
    await s.result
  }
  return { efforts, classified, step }
}

test('This session shows "Low effort fits this" with one press; the press lowers it here, logs it, and leaves Back to high', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = memStore(on, { 'cockpit:firstrun': 'done', 'cockpit:setting:hints.model': 'on', 'cockpit:session:test-session': rec })
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  const { efforts, classified, step } = drive($, on)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await clock.settle()
  await step(0)
  await $.prompt.submit({ text: 'where is the band drawn?' } as never).catch(() => undefined)
  await clock.settle()
  const ui = await mountPane($)
  expect(await textOf(ui, /^Low effort fits this$/)).toBe(true)
  expect(await textOf(ui, /^Use low effort for quick asks$/)).toBe(true)
  // Never by itself: the step still goes at the person's effort
  await step(1)
  expect(efforts).toEqual(['high', 'high'])
  await ui.press({ key: 'press-fit-ask-0' })
  await clock.settle()
  expect(toasts).toContain('Low effort for these quick asks. A bigger ask goes back to high.')
  const ledger = mem.get('cockpit:ledger:compact') as { what: string }[]
  expect(ledger.some(x => x.what === 'Low effort for quick asks')).toBe(true)
  expect(JSON.stringify(ledger)).not.toContain('band')
  await step(2)
  expect(efforts[2]).toBe('low')
  await ui.redraw()
  expect(await textOf(ui, /^Low effort fits this$/)).toBe(false)
  expect(await textOf(ui, /^Low effort for quick asks$/)).toBe(true)
  expect(await textOf(ui, /^Back to high$/)).toBe(true)
  // A sure bigger ask puts it back by itself, with no model call
  await $.prompt.submit({ text: 'the build fails, why?' } as never).catch(() => undefined)
  await clock.settle()
  await step(3)
  expect(efforts[3]).toBe('high')
  expect(classified.n).toBe(0)
  await ui.redraw()
  expect(await textOf(ui, /^Back to high$/)).toBe(false)
  await ui.unmount()
})

test('Back to high on This session puts the effort back, and an unsure ask never asks a model', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, { 'cockpit:firstrun': 'done', 'cockpit:setting:hints.model': 'on', 'cockpit:session:test-session': rec })
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const { efforts, classified, step } = drive($, on)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await clock.settle()
  await step(0)
  const ui = await mountPane($)
  await $.prompt.submit({ text: 'where is the band drawn?' } as never).catch(() => undefined)
  await $.prompt.submit({ text: 'ok and the other one' } as never).catch(() => undefined)
  await clock.settle()
  expect(classified.n).toBe(0)
  await ui.redraw()
  expect(await textOf(ui, /^Low effort fits this$/)).toBe(true)
  await ui.press({ key: 'press-fit-ask-0' })
  await clock.settle()
  await ui.redraw()
  await ui.press({ key: 'press-fit-ask-back-0' })
  await clock.settle()
  await step(1)
  expect(efforts).toEqual(['high', 'high'])
  await ui.redraw()
  expect(await textOf(ui, /^Back to high$/)).toBe(false)
  expect(await textOf(ui, /^Low effort fits this$/)).toBe(false)
  await ui.unmount()
})

test('with the hint setting off the pane shows no effort line', { timeoutMs: 15_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on, { 'cockpit:firstrun': 'done', 'cockpit:setting:hints.model': 'off', 'cockpit:session:test-session': rec })
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const { classified, step } = drive($, on)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await step(0)
  const ui = await mountPane($)
  await $.prompt.submit({ text: 'where is the band drawn?' } as never).catch(() => undefined)
  await $.prompt.submit({ text: 'ok and the other one' } as never).catch(() => undefined)
  await ui.redraw()
  expect(await textOf(ui, /^Low effort fits this$/)).toBe(false)
  expect(classified.n).toBe(0)
  await ui.unmount()
})
