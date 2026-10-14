// First-user fixes for the limits: the figures say "used", every limit says its reset, the week's share is a pace.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'
import { APPEARS } from '../hooks/core/cardrules'
import { forgetProjectSet } from '../hooks/core/io'
import { contextHead, hereHead, limitForms, limitHead, othersHead } from '../hooks/core/headline'
import { dayShare, dayShareWords } from '../hooks/core/dayshare'
import { DROP_MS } from '../hooks/core/record'
import { glanceFits } from '../hooks/features/home/headline'
import { ASK_KEEP_MS, buildView, classify, foldWords, limitSegments, othersWord } from '../hooks/features/home/logic'
import type { LimitBlock } from '../hooks/features/home/logic'
import type { SessionRecord } from '../hooks/core/record'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const MIN = 60_000
const DAY = 86_400_000

test('F1 and R3: the Plan limits headline says which limit, used and the reset, longest form first', () => {
  expect(limitHead([{ short: '5-hour limit', percent: 45, reset: 'resets 15:00' }])).toBe('5-hour: 45% used · resets 15:00')
  expect(limitHead([{ short: 'Week', percent: 30, reset: 'resets Thu 09:00' }])).toBe('Week: 30% used · resets Thu 09:00')
  expect(limitHead([{ short: 'Spend', percent: 5 }])).toBe('Spend: 5% used')
  expect(limitHead([])).toBe('Not known yet')
  expect(limitForms([{ short: '5-hour limit', percent: 45, reset: 'resets 15:00' }])).toEqual(['5-hour: 45% used · resets 15:00', '45% used · resets 15:00', '5-hour: 45% used', '45% used'])
  expect(limitHead([{ short: '5-hour limit', percent: 45, reset: 'resets 15:00' }], s => s, s => s.length <= 25)).toBe('45% used · resets 15:00')
  expect(limitHead([{ short: '5-hour limit', percent: 45, reset: 'resets 15:00' }], s => s, s => s.length <= 20)).toBe('5-hour: 45% used')
  expect(limitHead([{ short: '5-hour limit', percent: 45, reset: 'resets 15:00' }], s => s, s => s.length <= 10)).toBe('45% used')
  expect(limitHead([{ short: '5-hour limit', percent: 45, reset: 'resets 15:00' }], s => s, () => false)).toBe('45% used')
})

test('F1: the headline fits its Glance row at 400 pt and at the narrowest pane (294 pt)', () => {
  const at400 = glanceFits('Plan limits', 400 - 2 * 13 - 16)
  const at294 = glanceFits('Plan limits', 294 - 2 * 13 - 16)
  const forms = [{ short: '5-hour limit', percent: 45, reset: 'resets 15:00' }]
  expect(limitHead(forms, s => s, at400)).toBe('5-hour: 45% used · resets 15:00')
  expect(at400(limitHead(forms, s => s, at400))).toBe(true)
  expect(at294(limitHead(forms, s => s, at294))).toBe(true)
  expect(limitHead([{ short: 'Week', percent: 30, reset: 'resets Thu 09:00' }], s => s, at400)).toBe('Week: 30% used · resets Thu 09:00')
  expect(limitHead(forms, s => s, at294)).toBe('5-hour: 45% used')
  expect(limitHead(forms, s => s, glanceFits('Plan limits', 700))).toBe('5-hour: 45% used · resets 15:00')
  expect(glanceFits('Plan limits', undefined)('x'.repeat(200))).toBe(true)
})

test('F1 and F7: This session says the context is full to a share; the calm context word is All small', () => {
  expect(hereHead({ state: 'Working', contextPercent: 60 })).toBe('Context 60% full')
  expect(contextHead({ loud: 'none', goodMoment: false })).toBe('All small')
})

const block = (kind: string, short: string, percent: number, reset: string, withDay: boolean): LimitBlock => ({ kind, short, label: short, percent, reset, withDay })

test('F1 and F14: every limit says used and its whole reset; the week keeps its day and time', () => {
  const week = block('week', 'Week', 72, 'resets Thu 09:00', true)
  const five = block('session', '5-hour limit', 40, 'resets 15:00', false)
  const fable = block('m', 'Fable', 4, '', true)
  expect(limitSegments([week, five, fable])).toEqual(['Week 72% used, resets Thu 09:00', '5-hour limit 40% used, resets 15:00', 'Fable 4% used'])
  expect(foldWords([block('week', 'Week', 25, 'resets Thu 09:00', true), fable])).toBe('Under half used: Week 25% used, resets Thu 09:00 · Fable 4% used')
})

test('F14: the share of the week reads as a pace', () => {
  const thu = new Date(NOW + 3 * DAY)
  thu.setHours(9, 0, 0, 0)
  const d = dayShare({ percent: 62, resetsAt: thu.toISOString() }, NOW, [[NOW - DAY / 2, 50]])
  expect(dayShareWords(d!)).toMatch(/^38% of your weekly limit is left\. To make it last until it resets, use about \d+(\.\d)?% a day\. Today( since \d\d:\d\d)?: about 12% used\.$/)
  const last = dayShare({ percent: 90, resetsAt: new Date(NOW + 2 * 3_600_000).toISOString() }, NOW)
  expect(dayShareWords(last!)).toBe('10% of your weekly limit is left, and it resets within a day.')
})

const rec = (id: string, over: Partial<SessionRecord> = {}): SessionRecord =>
  ({ sessionId: id, cwd: `/work/${id}`, model: 'm', state: 'waiting', startedAt: NOW - 60 * MIN, updatedAt: NOW - 1000, lastEventAt: NOW - 1000, stateSince: NOW - 5 * MIN, ...over }) as SessionRecord

test('F3: an old question from a live process still needs you; a dead or unknown process is gone', () => {
  const old = rec('a', { pid: 4242, updatedAt: NOW - DROP_MS - 5 * MIN, ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - DROP_MS - 5 * MIN } } as Partial<SessionRecord>)
  expect(classify(old, NOW, new Set([4242]))).toBe('needs')
  expect(classify(old, NOW, new Set([1]))).toBe('gone')
  expect(classify(old, NOW, undefined)).toBe('gone')
  expect(classify({ ...old, pid: undefined }, NOW, new Set([4242]))).toBe('gone')
  const ghost = rec('g', { pid: 4242, updatedAt: NOW - 3 * DAY, ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 3 * DAY } } as Partial<SessionRecord>)
  expect(classify(ghost, NOW, new Set([4242]))).toBe('gone')
  expect(classify({ ...ghost, ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - ASK_KEEP_MS + MIN } } as SessionRecord, NOW, new Set([4242]))).toBe('needs')
  expect(classify(rec('b', { pid: 4242, updatedAt: NOW - DROP_MS - MIN }), NOW, new Set([4242]))).toBe('gone')
  expect(classify(rec('c', { pid: 7, ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 1000 } } as Partial<SessionRecord>), NOW, new Set([1]))).toBe('gone')
})

test('F3: with only a session in Needs you, Other sessions says where it is', () => {
  const asking = rec('a', { ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - MIN } } as Partial<SessionRecord>)
  const view = buildView([asking, rec('me', { state: 'working' })], NOW, 'me', undefined)
  expect(view.needs.length).toBe(1)
  expect(othersWord(view)).toBe('1 waiting for you')
  expect(othersWord(buildView([], NOW, 'me', undefined))).toBe('No other session is active now.')
  expect(othersHead({ waiting: 0, working: 0, total: 0, needs: 1 })).toBe('1 waiting for you')
  expect(othersHead({ waiting: 1, working: 0, total: 1, needs: 1 })).toBe('1 your turn')
})

function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}
const seed = (id: string, over: Record<string, unknown>) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
const world = (): Record<string, unknown> => ({
  ...Object.fromEntries(Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show'])),
  'cockpit:setting:look.view': 'custom',
  'cockpit:setting:look.columns': '1',
  'cockpit:session:test-session': seed('test-session', { cwd: '/work/app', contextPercent: 38, fiveHourPercent: 62, fiveHourResetsAt: '2026-10-11T18:00:00Z' }),
})

for (const [cols, want] of [
  [51, /^5-hour: 62% used( · resets \d\d:\d\d)?$/],
  [37, /^(5-hour: )?62% used( · resets \d\d:\d\d)?$/],
  [90, /^5-hour: 62% used · resets \d\d:\d\d$/],
] as const) {
  test(`the closed Plan limits card at ${cols} columns`, async ($, on) => {
    forgetProjectSet()
    mock.clock(on, { now: NOW })
    mock.store(on, world())
    mock.env(on, { HOME: '/home/test' })
    engine(on)
    const props = { title: 'Vaken', isFocused: false, bodyColumns: cols, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
    const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props })
    expect(await ui.find({ key: 'glance-limit' })).toBeDefined()
    const shown = ((await ui.findAll({ type: 'Text', text: /62% used/ })) as { props: unknown; children?: unknown[] }[]).map(x => String(x.children?.[0] ?? ''))
    expect(shown.some(s => want.test(s)), shown.join(' | ')).toBe(true)
    await ui.unmount()
  })
}
