// Welcome back with taps and Fix it on a failure: the Where was I card's rows after a break, their presses, the phone menu and the failure toast.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { builtIn, lastEndOf, nextMem, noFacts } from '../hooks/core/actions'
import { RECAP_AFTER_MS } from '../hooks/core/attention'
import { BACK_AWAY_MS, backView } from '../hooks/core/backcard'
import type { BackFacts } from '../hooks/core/backcard'
import { noteShellStep, shellFail } from '../hooks/core/errors'
import { MENU_MAX_LINES, menuLines, menuText } from '../hooks/core/phonenote'
import { AGAIN_PROMPT, FAIL_EXPLAIN, FAIL_FIX, FAIL_HEAD, FAIL_STRINGS, FAIL_TOAST_MS, WELCOME_HEAD, WELCOME_STRINGS, askPrompt, brokeOff, failToastDue, failToastText, runNeeds, welcomeActions, welcomeRows } from '../hooks/core/welcome'
import type { WelcomeFacts } from '../hooks/core/welcome'
import { backFactsOf } from '../hooks/features/home/back'
import { lineCard } from '../hooks/features/home/linecards'
import type { View } from '../hooks/features/home/logic'
import type { Prefs } from '../hooks/features/home/prefs'
import { forgetHello, forgetPhones } from '../hooks/features/phone'
import { byEnglish } from '../hooks/i18n/table'
import { SLOW, test } from './slow'

const SV = byEnglish('sv')
const NOW = Date.parse('2026-10-16T12:00:00Z')
const ROOT = '/w/me'
const id = (s: string): string => s
const MIN = 60_000

test('the rows: waits first, then how the last answer ended, each with one press that says what it does', () => {
  expect(welcomeRows(undefined, id)).toEqual([])
  expect(welcomeRows({ edits: 0 }, id)).toEqual([])
  expect(welcomeRows({ end: 'done', edits: 0 }, id)).toEqual([])
  const all = welcomeRows({ end: 'failed', edits: 2, kind: 'test-failed', holdKey: 'needs:hold-me-0', run: { name: 'docs', why: 'paused' } }, id)
  expect(all.map(r => [r.key, r.title, r.right])).toEqual([
    ['w-hold', 'A stopped step waits for your yes', 'Show me'],
    ['w-run', 'Task run docs is paused', 'Show me'],
    ['w-failed', 'The last step failed: A test did not pass', 'Fix it'],
  ])
  expect(all.map(r => r.press)).toEqual([{ do: 'hold', key: 'needs:hold-me-0' }, { do: 'run' }, { do: 'ask', id: 'fix' }])
  expect(welcomeRows({ end: 'done', edits: 3 }, id).map(r => [r.title, r.right, r.press])).toEqual([['Claude finished: 3 changes', 'Show me', { do: 'ask', id: 'diff' }]])
  expect(welcomeRows({ end: 'done', edits: 1 }, id)[0]?.title).toBe('Claude finished: 1 change')
  expect(welcomeRows({ end: 'stopped', edits: 0 }, id).map(r => [r.title, r.right, r.press])).toEqual([['Claude stopped before the end', 'Continue', { do: 'ask', id: 'continue' }]])
  expect(welcomeRows({ end: 'asked', edits: 4 }, id).map(r => [r.title, r.right, r.press])).toEqual([['Claude asked you a question', 'Show me', { do: 'ask', id: 'again' }]])
  expect(welcomeRows({ end: 'failed', edits: 0 }, id)[0]?.title).toBe('The last step failed')
  expect(welcomeRows({ end: 'done', edits: 1 }, s => SV[s] ?? s)[0]).toMatchObject({ title: 'Claude blev klar: 1 ändring', right: 'Visa mig' })
})

test('a press sends the fixed requests of the next step buttons, and the question one is fixed too', () => {
  expect(askPrompt('fix')).toBe(builtIn('fix').prompt)
  expect(askPrompt('diff')).toBe(builtIn('diff').prompt)
  expect(askPrompt('continue')).toBe(builtIn('continue').prompt)
  expect(askPrompt('again')).toBe(AGAIN_PROMPT)
})

test('how the last answer ended', () => {
  expect(lastEndOf('answer', 'Done.', false)).toBe('done')
  expect(lastEndOf('answer', 'Done.', true)).toBe('failed')
  expect(lastEndOf('answer', 'Which one?', true)).toBe('asked')
  expect(lastEndOf('aborted', '', false)).toBe('stopped')
  expect(lastEndOf('error', '', false)).toBe('failed')
  expect(lastEndOf('refusal', '', false)).toBeUndefined()
})

test('a task run needs you when it paused for you, stopped, or ended with failed tasks, and only while it is recent', () => {
  const run = (status: string, tasks: { state: string; endedAt?: number }[] = [], over: object = {}) => ({ name: 'docs', status, createdAt: NOW - 2 * 3_600_000, tasks, ...over })
  expect(runNeeds(undefined, NOW, BACK_AWAY_MS)).toBeUndefined()
  expect(runNeeds(run('paused'), NOW, BACK_AWAY_MS)).toEqual({ name: 'docs', why: 'paused' })
  expect(runNeeds(run('paused', [], { resumeAt: NOW + MIN }), NOW, BACK_AWAY_MS)).toBeUndefined()
  expect(runNeeds(run('stopped'), NOW, BACK_AWAY_MS)).toEqual({ name: 'docs', why: 'stopped' })
  expect(runNeeds(run('done', [{ state: 'done' }]), NOW, BACK_AWAY_MS)).toBeUndefined()
  expect(runNeeds(run('done', [{ state: 'failed', endedAt: NOW - MIN }]), NOW, BACK_AWAY_MS)).toEqual({ name: 'docs', why: 'failed' })
  expect(runNeeds(run('running'), NOW, BACK_AWAY_MS)).toBeUndefined()
  expect(runNeeds(run('stopped', [], { createdAt: NOW - BACK_AWAY_MS - MIN }), NOW, BACK_AWAY_MS)).toBeUndefined()
})

const facts = (gapMs: number, welcome: WelcomeFacts): BackFacts => ({ now: NOW, gapMs, open: [], more: 0, welcome })

test('the card shows the group only after a break, first, and each row is one whole-row press', () => {
  const w: WelcomeFacts = { end: 'failed', edits: 1, holdKey: 'needs:hold-me-0' }
  expect(backView(facts(RECAP_AFTER_MS - 1, w), id).groups.some(g => g.head === WELCOME_HEAD)).toBe(false)
  const v = lineCard('back', { now: NOW, ledger: [], halted: false, modes: {}, t: id, back: facts(RECAP_AFTER_MS, w) })
  expect(v.groups?.[0]?.head).toBe('Since you left')
  expect(v.groups?.[0]?.rows.map(r => [r.title, r.right, r.action])).toEqual([
    ['A stopped step waits for your yes', 'Show me', { kind: 'openHold', key: 'needs:hold-me-0' }],
    ['The last step failed', 'Fix it', { kind: 'ask', id: 'fix' }],
  ])
  expect(v.groups?.[1]).toBeUndefined() // no goal: no "No goal set" row
})

test('the facts come from memory and what the pane read; Recap Off leaves them out', () => {
  const view = { now: NOW, here: { rec: { state: 'idle', lastEventAt: NOW - 20 * MIN } } } as unknown as View
  const hold = { id: 'x', kind: 'hold', sid: 'me', name: 'app', here: true, what: 'Held a risky command.', since: NOW - 30 * MIN, approx: false, todo: '', count: 1, allowed: false }
  const prefs = { inbox: [hold], values: { 'recap.mode': 'on' }, run: { name: 'docs', status: 'stopped', createdAt: NOW - MIN, tasks: [] } } as unknown as Prefs
  nextMem.facts = { ...noFacts(), edits: 2, failed: true }
  nextMem.end = 'failed'
  nextMem.busy = false
  noteShellStep(false, true, 'module-missing')
  expect(backFactsOf(view, prefs).welcome).toEqual({ end: 'failed', edits: 2, kind: 'module-missing', holdKey: 'needs:hold-me-0', run: { name: 'docs', why: 'stopped' } })
  nextMem.busy = true
  expect(backFactsOf(view, prefs).welcome?.end).toBeUndefined()
  expect(backFactsOf(view, { ...prefs, values: { 'recap.mode': 'off' } } as Prefs).welcome).toBeUndefined()
  nextMem.busy = false
  nextMem.end = undefined
  nextMem.facts = noFacts()
  noteShellStep(true, false, undefined)
  expect(shellFail.failed).toBe(false)
})

test('on the phone after a break the presses that send a request lead the menu, within 7 lines', () => {
  expect(brokeOff(undefined, NOW, false)).toBe(false)
  expect(brokeOff(NOW - RECAP_AFTER_MS, NOW, false)).toBe(true)
  expect(brokeOff(NOW - RECAP_AFTER_MS, NOW, true)).toBe(false)
  expect(brokeOff(NOW - RECAP_AFTER_MS + 1, NOW, false)).toBe(false)
  const back = welcomeActions({ end: 'failed', edits: 1, holdKey: 'needs:hold-me-0', run: { name: 'docs', why: 'paused' } })
  expect(back.map(a => a.id)).toEqual(['fix'])
  const own = Array.from({ length: 8 }, (_, n) => ({ id: `own:a${n}`, label: `a${n}`, prompt: 'p' }))
  const lines = menuLines([...welcomeActions({ end: 'asked', edits: 0 }), builtIn('diff'), builtIn('diff'), ...own])
  expect(lines.slice(0, 2).map(l => l.label)).toEqual(['Show the question', 'What changed'])
  expect(lines[0]?.pick).toEqual({ kind: 'prompt', text: AGAIN_PROMPT })
  expect(menuText(s => s, lines).split('\n')).toHaveLength(MENU_MAX_LINES)
})

test('the failure toast: the translator words, never the error text, at most once in 2 minutes', () => {
  expect(failToastText('test-failed', true)).toBe(`${FAIL_HEAD} A test did not pass. ${FAIL_FIX}`)
  expect(failToastText(undefined, false)).toBe(`${FAIL_HEAD} ${FAIL_EXPLAIN}`)
  expect(failToastDue(undefined, NOW)).toBe(true)
  expect(failToastDue(NOW - FAIL_TOAST_MS + 1, NOW)).toBe(false)
  expect(failToastDue(NOW - FAIL_TOAST_MS, NOW)).toBe(true)
})

test('every new text has Swedish', () => {
  for (const w of [...WELCOME_STRINGS, ...FAIL_STRINGS]) expect(SV[w] ?? '').not.toBe('')
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
  // The error text holds a secret-looking token, built at run time: it must never reach a toast.
  const secret = `ghp_${'a'.repeat(36)}`
  on('tool.call', (_$, e) => ((e as { command?: string }).command === 'npm test' ? ({ result: {}, text: `Exit code 1\nFAIL src/a.test.ts\n1 failed\ntoken ${secret}`, isError: true } as never) : ({ result: {}, text: 'ok' } as never)))
  const reached: string[] = []
  on('prompt.submit', (_$, e) => {
    reached.push(e.text)
    return { text: e.text, context: e.context } as never
  })
  return { clock, mem, reached, toasts, secret }
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
const fixToasts = (toasts: string[]): string[] => toasts.filter(t => t.startsWith(FAIL_HEAD))

test('a failed shell step at the end of an answer gives one calm toast, at most once in 2 minutes, never with the error text', SLOW, async ($, on) => {
  const w = world(on)
  await start($)
  await turn($, 'The tests fail.', failed)
  expect(fixToasts(w.toasts)).toEqual([`${FAIL_HEAD} A test did not pass. ${FAIL_FIX}`])
  expect(w.toasts.join('\n')).not.toContain(w.secret)
  await w.clock.advance(MIN)
  await turn($, 'Still failing.', failed)
  expect(fixToasts(w.toasts)).toHaveLength(1)
  await w.clock.advance(FAIL_TOAST_MS)
  // A step that works after the failure: nothing to fix, so no toast.
  await turn($, 'Fixed it.', [...failed, { tool: 'Bash', command: 'ls' }])
  expect(fixToasts(w.toasts)).toHaveLength(1)
  // The kept error never holds the text either.
  expect(JSON.stringify([...w.mem.values()])).not.toContain(w.secret)
})

const setting = async ($: EngineInterface, args: string): Promise<void> => {
  await $.command.run({ command: 'vaken-settings', args, origin: { kind: 'composer' } } as never)
}

test('no failure toast with the translator Off', SLOW, async ($, on) => {
  const w = world(on)
  await start($)
  await setting($, 'errors.mode off')
  await turn($, 'The tests fail.', failed)
  expect(fixToasts(w.toasts)).toEqual([])
  await setting($, 'errors.mode on')
  await turn($, 'The tests fail.', failed)
  expect(fixToasts(w.toasts)).toHaveLength(1)
})

test('no failure toast in the hours without notices', SLOW, async ($, on) => {
  const late = new Date(2026, 9, 16, 23, 0).getTime()
  const w = world(on, [], late)
  await start($)
  await setting($, 'notify.quiet 22-07')
  await turn($, 'The tests fail.', failed)
  expect(fixToasts(w.toasts)).toEqual([])
  await setting($, 'notify.quiet off')
  await turn($, 'The tests fail.', failed)
  expect(fixToasts(w.toasts)).toHaveLength(1)
})

test('no failure toast while Fix it shows in an open pane; with the buttons Off it points to the explain command', SLOW, async ($, on) => {
  const w = world(on, [{ id: 'cockpit-home', isShown: true }])
  await start($)
  await turn($, 'The tests fail.', failed)
  expect(fixToasts(w.toasts)).toEqual([])
  await setting($, 'next.mode off')
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
  await turn($, 'The tests fail.', failed)
  expect(fixToasts(w.toasts)).toEqual([`${FAIL_HEAD} A test did not pass. ${FAIL_EXPLAIN}`])
})

test('on the phone, after a break, the menu leads with Fix it and a digit sends the fix request', SLOW, async ($, on) => {
  const w = world(on)
  await start($)
  await turn($, 'The tests fail.', failed)
  await w.clock.advance(RECAP_AFTER_MS)
  const menu = (await $.prompt.submit({ text: '/vaken', origin: { kind: 'bridge' } } as never)) as { drop?: string }
  const lines = (menu.drop ?? '').split('\n')
  expect(lines[1]).toBe('1. Fix it')
  expect(lines.length).toBeLessThanOrEqual(MENU_MAX_LINES)
  const sent = (await $.prompt.submit({ text: '1', origin: { kind: 'bridge' } } as never)) as { text?: string }
  expect(sent.text).toBe(builtIn('fix').prompt)
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }

test('in the pane after a break, Where was I lists the failed step with Fix it, and the whole row sends the fix request', SLOW, async ($, on) => {
  const w = world(on)
  // The card shows in the views that hold it, as the person's own view does.
  w.mem.set('cockpit:setting:look.view', 'custom')
  await start($)
  await turn($, 'The tests fail.', failed)
  await w.clock.advance(RECAP_AFTER_MS + MIN)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  if ((await ui.find({ key: 'press-ol-back:w-failed-0' })) === undefined) await ui.press({ key: 'press-glance-back-0' })
  await ui.redraw()
  expect(await ui.find({ type: 'Text', text: /^Fix it$/ })).not.toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^The last step failed: A test did not pass$/ })).not.toBeUndefined()
  await ui.press({ key: 'press-ol-back:w-failed-0' })
  await w.clock.settle()
  expect(w.reached).toContain(builtIn('fix').prompt)
  await ui.unmount()
})
