// Where was I in the Standard view: only after a break with rows under Since you left; All, Custom, the stored order and Arrange are unchanged.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { RECAP_AFTER_MS } from '../hooks/core/attention'
import { welcomeDue } from '../hooks/core/backcard'
import type { BackFacts } from '../hooks/core/backcard'
import { ALL_IDS, STANDARD_BACK_IDS, STANDARD_IDS, fixedIds } from '../hooks/features/home/viewset'
import { arrangeSeed } from '../hooks/features/home/arrangeseed'
import { forgetHello, forgetPhones } from '../hooks/features/phone'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const ROOT = '/w/me'
const MIN = 60_000
const facts = (gapMs: number | undefined, welcome?: BackFacts['welcome']): BackFacts => ({ now: NOW, ...(gapMs === undefined ? {} : { gapMs }), open: [], more: 0, ...(welcome === undefined ? {} : { welcome }) })

test('the rule: a break and at least one row under Since you left', () => {
  const failedEnd = { end: 'failed' as const, edits: 1 }
  expect(welcomeDue(facts(RECAP_AFTER_MS, failedEnd))).toBe(true)
  expect(welcomeDue(facts(RECAP_AFTER_MS - 1, failedEnd))).toBe(false)
  expect(welcomeDue(facts(undefined, failedEnd))).toBe(false)
  expect(welcomeDue(facts(RECAP_AFTER_MS, { end: 'done', edits: 0 }))).toBe(false)
  // Recap Off leaves the welcome facts out
  expect(welcomeDue(facts(RECAP_AFTER_MS))).toBe(false)
})

test('the card joins Standard right under This session; All, Custom and the plain Standard list stay as they were', () => {
  expect(fixedIds('standard')).toBe(STANDARD_IDS)
  expect(fixedIds('standard', false)).toBe(STANDARD_IDS)
  expect(fixedIds('standard', true)).toBe(STANDARD_BACK_IDS)
  expect(STANDARD_BACK_IDS).toEqual(['here', 'back', ...STANDARD_IDS.slice(1)])
  expect(fixedIds('all', true)).toBe(ALL_IDS)
  expect(fixedIds('custom', true)).toBeUndefined()
  expect(arrangeSeed(STANDARD_IDS).order.includes('back')).toBe(true)
  expect(arrangeSeed(STANDARD_IDS).values['cards.back']).toBe('hide')
})

function world(on: On, panes: unknown[] = [], now = NOW) {
  const clock = mock.clock(on, { now })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:plain.mode': 'off', 'cockpit:firstrun': 'done', 'cockpit:awake:asked': 1, 'cockpit:phone:asked': 1 }))
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
  on('session.id', () => ({ value: 'me' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.root', () => ({ value: ROOT }) as never)
  on('session.cwd', () => ({ value: ROOT }) as never)
  on('session.surfaces', () => ({ value: ['desktop'] }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(String((e as { text?: unknown }).text ?? ''))
    return { value: undefined } as never
  })
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: panes }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', (_$, e) => ((e as { command?: string }).command === 'npm test' ? ({ result: {}, text: `Exit code 1\nFAIL src/a.test.ts\n1 failed\n`, isError: true } as never) : ({ result: {}, text: 'ok' } as never)))
  const reached: string[] = []
  on('prompt.submit', (_$, e) => {
    reached.push(e.text)
    return { text: e.text, context: e.context } as never
  })
  return { clock, mem, reached, toasts }
}

const start = async ($: EngineInterface): Promise<void> => {
  forgetHello()
  forgetPhones()
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
}
const turn = async ($: EngineInterface, answer: string, steps: Array<{ tool: string; command?: string; file_path?: string }> = [], reason = 'answer'): Promise<void> => {
  await $.turn.start({ text: 'go', turnId: 't1' } as never)
  for (const s of steps) await $.tool.call(s as never)
  await $.turn.complete({ answer, durationMs: 1000, isAborted: reason === 'aborted', turnId: 't1', reason } as never)
}
const failed = [{ tool: 'Edit', file_path: `${ROOT}/a.ts` }, { tool: 'Bash', command: 'npm test' }]

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }
const titled = /^Where was I$/

test('in the Standard view the card comes after a break with a failed step, and leaves while there is no break', SLOW, async ($, on) => {
  const w = world(on)
  await start($)
  await turn($, 'The tests fail.', failed)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await ui.find({ type: 'Text', text: titled })).toBeUndefined()
  await w.clock.advance(RECAP_AFTER_MS + MIN)
  await ui.redraw()
  expect(await ui.find({ type: 'Text', text: titled })).not.toBeUndefined()
  await turn($, 'Done.')
  await ui.redraw()
  expect(await ui.find({ type: 'Text', text: titled })).toBeUndefined()
  await ui.unmount()
})

test('in the Standard view a break with nothing under Since you left leaves the card out', SLOW, async ($, on) => {
  const w = world(on)
  await start($)
  await turn($, 'Done.')
  await w.clock.advance(RECAP_AFTER_MS + MIN)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await ui.find({ type: 'Text', text: titled })).toBeUndefined()
  await ui.unmount()
})

test('with Recap Off the Standard view never shows the card', SLOW, async ($, on) => {
  const w = world(on)
  w.mem.set('cockpit:setting:recap.mode', 'off')
  await start($)
  await turn($, 'The tests fail.', failed)
  await w.clock.advance(RECAP_AFTER_MS + MIN)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await ui.find({ type: 'Text', text: titled })).toBeUndefined()
  await ui.unmount()
})
