// The band shows Details at the Short look when its line is cut; the task list folds after 6.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SLOW, test } from './slow'

import { DEFAULT_CHOICES, ORCH_KEY, newTask } from '../hooks/core/orchestra'
import type { Run } from '../hooks/core/orchestra'
import { HISTORY_KEY, REPORT_KEY, reportOf } from '../hooks/core/overnight'
import { HomeBand, bandChipShown, bandPlan, chipFit, chipPt } from '../hooks/features/home/band'
import type { View } from '../hooks/features/home/logic'
import type { El } from '../hooks/ui/kit'
import { WARNING } from '../hooks/ui/kit'
import { setLang } from '../hooks/core/lang'
import { DANGER } from '../hooks/ui/tokens'
import { builtIn } from '../hooks/core/actions'
import { BAND_FIT_SLACK_PT, BAND_GAP, BAND_LINE_MIN_PT, BAND_PAD_X, columnPt } from '../hooks/ui/tokens'

const NOW = Date.parse('2026-10-12T10:00:00Z')
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }

function engine(on: On): { mem: Map<string, unknown> } {
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
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => {
    return { value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return { mem }
}


const mount = ($: Parameters<Parameters<typeof test>[2]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
const taskN = (n: number, state: 'waiting' | 'done' | 'failed' = 'waiting') => ({ ...newTask({ n, text: `Task number ${n}`, role: 'builder', model: 'auto', folder: false }), state })

type N = { type: string; props: Record<string, unknown> }
const mk = (type: string) => (p: Record<string, unknown>): N => ({ type, props: p ?? {} })
const el = { Box: mk('Box'), Text: mk('Text'), Button: mk('Button'), Svg: mk('Svg'), host: { Client: mk('Client') }, drag: true } as unknown as El
function walk(n: unknown, out: N[] = []): N[] {
  if (Array.isArray(n)) for (const c of n) walk(c, out)
  else if (n !== null && typeof n === 'object' && 'type' in n) {
    out.push(n as N)
    walk((n as N).props.children, out)
  }
  return out
}
const MIN = 60_000
const lim = (percent: number) => ({ percent, resetsAt: new Date(NOW + 200 * MIN).toISOString() })
const viewOf = (band: { id: string; level: 'urgent' | 'warn' | 'fail' | 'info'; text: string }[], percent = 14): View => ({ needs: [], working: [], waiting: [], idle: [], now: NOW, limit: lim(percent), band: band.map((b, i) => ({ ...b, at: NOW - (i + 1) * MIN, ttlMs: 30 * MIN })) }) as unknown as View
const said = (n: N | undefined): string => [n?.props.children].flat().join('')
const textOf = (t: N[]): N | undefined => t.find(n => n.type === 'Text' && n.props.wrap === 'truncate-end')
const RISK = { id: 'guard', level: 'warn' as const, text: 'A risky step was stopped: it would have deleted a folder outside the work folder' }
const LONG = 'New topic: a fresh session costs less than going on in this long one, so start a new one when you can'

test('Details shows when the line is cut at this width, and not when the line fits', () => {
  const v = viewOf([{ id: 'x', level: 'warn', text: LONG }])
  const narrow = bandPlan(v, 'short', 60, [], false, false, true)
  expect(narrow.mode === 'line' ? narrow.open?.kind : undefined).toBe('details')
  const wide = bandPlan(v, 'short', 400, [], false, false, true)
  expect(wide.mode === 'line' ? wide.open : 'x').toBeUndefined()
  expect(bandPlan(v, 'short', undefined, [], false, false, true)).toMatchObject({ mode: 'line', fit: 'full' })
})

test('an info line is drawn dim with no mark; amber stays for a risk', () => {
  const info = walk(HomeBand(el, viewOf([{ id: 'costhint', level: 'info', text: 'Opus on a small task: Sonnet costs less' }]), 'glance', () => undefined, undefined, () => undefined, 900 / columnPt()))
  const it = textOf(info)
  expect(said(it)).toBe('Opus on a small task: Sonnet costs less')
  expect(it?.props.dimColor).toBe(true)
  expect(it?.props.color).toBeUndefined()
  const did = textOf(walk(HomeBand(el, viewOf([{ id: 'did:x', level: 'info', text: 'Compacted the chat' }]), 'glance', () => undefined, undefined, () => undefined, 900 / columnPt())))
  expect(said(did)).toBe('✓ Compacted the chat')
  expect(did?.props.dimColor).toBe(true)
  const risk = textOf(walk(HomeBand(el, viewOf([RISK]), 'glance', () => undefined, undefined, () => undefined, 900 / columnPt())))
  expect(said(risk)).toMatch(/^▲ A risky/)
  expect(risk?.props.color).toBe(WARNING)
})

test('a narrow band (288 pt) keeps the words beside a mark, never cuts a button, and the chip gives way: the fuller limit, then its reset, then whole (never a figure without its label)', () => {
  const narrow = 288 / columnPt()
  for (const [band, end, fresh] of [[[RISK], false, false], [[{ id: 'focus', level: 'info' as const, text: 'Quiet · 32 min left' }], true, false], [[{ id: 'fresh', level: 'info' as const, text: 'New topic? A fresh session costs less.' }], false, true]] as const) {
    const t = walk(HomeBand(el, viewOf([...band], 86), 'explained', () => undefined, end ? () => undefined : undefined, () => undefined, narrow, undefined, fresh ? () => undefined : undefined))
    const line = t.find(n => n.type === 'Box' && n.props.overflow === 'hidden')
    expect(line?.props.minWidth, band[0].id).toBeGreaterThan(0)
    expect(Number(line?.props.minWidth) * columnPt()).toBeLessThanOrEqual(BAND_LINE_MIN_PT + 14 + 1)
  }
  // Next buttons: only whole ones; a width that cannot hold one draws no Next word at all
  const acts = { actions: ['tests', 'diff', 'commit'].map(id => builtIn(id as never)), press: () => undefined }
  const p = bandPlan(viewOf([]), 'glance', narrow, acts.actions.map(a => a.label), false, false, true)
  expect(p.mode).toBe('next')
  expect(p.mode === 'next' ? p.shown : 0).toBeLessThan(3)
  expect(bandPlan(viewOf([]), 'glance', 60 / columnPt(), acts.actions.map(a => a.label), false, false, true).mode).not.toBe('next')
  // The buttons fit first: at 288 pt two Next buttons and no chip beat one button and the chip (widths measured: a no-break blank is BLANK_PT, the button has its own padding)
  const both = { ...viewOf([]), week: { percent: 38, resetsAt: new Date(NOW + 3 * 24 * 60 * MIN).toISOString() } } as unknown as View
  expect(bandPlan(both, 'glance', 288 / columnPt(), acts.actions.map(a => a.label), false, false, true)).toMatchObject({ mode: 'next', shown: 2, fit: 'none' })
  expect(bandPlan(both, 'glance', 900 / columnPt(), acts.actions.map(a => a.label), false, false, true)).toMatchObject({ mode: 'next', shown: 3, fit: 'both' })
  // A wider band never shows fewer buttons
  const shownAt = (pt: number): number => {
    const q = bandPlan(both, 'glance', pt / columnPt(), acts.actions.map(a => a.label), false, false, true)
    return q.mode === 'next' ? q.shown : 0
  }
  for (let pt = 200; pt < 900; pt += 4) expect(shownAt(pt + 4), `${pt + 4} pt`).toBeGreaterThanOrEqual(shownAt(pt))
  // The chip gives way in order
  const chip = { parts: [{ id: 'session', label: '5 h', pct: 86, reset: 'resets 13:30' }, { id: 'week', label: 'Week', pct: 38, reset: '' }], bar: true }
  const room = 600
  const at = (room + 2 * BAND_PAD_X + BAND_FIT_SLACK_PT) / columnPt()
  expect(chipFit(chip, 0, 900 / columnPt())).toBe('both')
  expect(chipPt(chip, 'both')).toBeGreaterThan(chipPt(chip, 'full'))
  expect(chipFit(chip, room - BAND_GAP - chipPt(chip, 'full'), at)).toBe('full')
  expect(chipPt(chip, 'full')).toBeGreaterThan(chipPt(chip, 'plain'))
  expect(chipFit(chip, room - BAND_GAP - chipPt(chip, 'plain'), at)).toBe('plain')
  // Without room for the label too, the whole chip goes: a figure never stands alone
  expect(chipFit(chip, room - BAND_GAP - chipPt(chip, 'plain') + 1, at)).toBe('none')
  expect(chipFit(chip, room - BAND_GAP, at)).toBe('none')
})

test('the plan chip shows the 5-hour and the week limit, each with its figure in its level colour; the reset only while hot; a narrow band keeps the fuller one', () => {
  const v = { ...viewOf([], 86), week: { percent: 38, resetsAt: new Date(NOW + 3 * 24 * 60 * MIN).toISOString() } } as unknown as View
  const wide = walk(HomeBand(el, v, 'glance', () => undefined, undefined, () => undefined, 900 / columnPt()))
  const texts = wide.filter(n => n.type === 'Text').map(n => [said(n), n.props.color, n.props.dimColor])
  expect(texts[0]).toEqual(['5 h', undefined, true])
  expect(String(texts[1][0])).toMatch(/^86% · /)
  expect(texts[1][1]).toBe(WARNING)
  expect(texts.slice(2)).toEqual([['Week', undefined, true], ['38%', undefined, true]])
  expect(wide.filter(n => n.type === 'Svg')).toHaveLength(2)
  const red = walk(HomeBand(el, viewOf([], 93), 'glance', () => undefined, undefined, () => undefined, 900 / columnPt())).filter(n => n.type === 'Text')
  expect(red.at(-1)?.props.color).toBe(DANGER)
  const narrow = walk(HomeBand(el, v, 'glance', () => undefined, undefined, () => undefined, 200 / columnPt()))
  expect(narrow.filter(n => n.type === 'Svg')).toHaveLength(1)
  expect(narrow.filter(n => n.type === 'Text').some(n => said(n).startsWith('86%'))).toBe(true)
})

test('with the Needs you chip on the band, its other button says See all with no number', () => {
  const v = { ...viewOf([RISK]), held: 1 } as unknown as View
  const p = bandPlan(v, 'glance', 900 / columnPt(), [], false, false, true)
  expect(p.mode === 'line' ? p.open?.label : undefined).toBe('See all')
})

test('the status line can ask whether the band draws its plan chip', () => {
  expect(bandChipShown(viewOf([], 86), 'glance', 900 / columnPt(), [], true)).toBe(true)
  expect(bandChipShown(viewOf([RISK], 86), 'glance', 200 / columnPt(), [], true)).toBe(false)
  expect(bandChipShown({ ...viewOf([]), limit: undefined } as unknown as View, 'glance', 900 / columnPt(), [], true)).toBe(false)
})

const bandProps = (bodyColumns: number) => ({ hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} })

test('at the Short look the band shows Details only when its line is cut by the pane width', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const { mem } = engine(on)
  mem.set('cockpit:firstrun', 'done')
  // Not the fresh-start id: that line offers its own press in place of Details
  mem.set('cockpit:band:test-session', [{ id: 'nudge', level: 'warn', text: 'New topic: a fresh session costs less than going on in this long one, so start a new one when you can', at: NOW - 60_000, ttlMs: 600_000 }])
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  const narrow = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps(50) })
  expect(((await narrow.find({ key: 'band-details' })) as { props?: { label?: string } } | undefined)?.props?.label).toMatch(/^\s*Details\s*$/)
  await narrow.unmount()
  const wide = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps(400) })
  expect(await wide.find({ key: 'band-details' })).toBeUndefined()
  await wide.unmount()
})

test('a run of 12 tasks shows 6, "Show 6 more" unfolds them, Add a task stays on the page', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const { mem } = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:detail', 'explained')
  const tasks = Array.from({ length: 12 }, (_, i) => taskN(i + 1))
  const run: Run = { id: 'r1', name: 'Task run', status: 'done', createdAt: NOW - 60_000, tasks: tasks.map(t => ({ ...t, state: 'done' as const, endedAt: NOW - 1000 })), choices: DEFAULT_CHOICES }
  mem.set(ORCH_KEY('test-session'), run)
  let ui = await mount($)
  await ui.press({ key: 'runner-open' })
  await ui.unmount()
  ui = await mount($)
  expect(await ui.find({ key: 'rv-t-6' })).toBeDefined()
  expect(await ui.find({ key: 'rv-t-7' })).toBeUndefined()
  expect(await ui.find({ key: 'rv-add' })).toBeDefined()
  expect(await ui.find({ type: 'Button', label: /Show 6 more/ })).toBeDefined()
  await ui.press({ key: 'morel-rv-tasks' })
  await ui.unmount()
  ui = await mount($)
  expect(await ui.find({ key: 'rv-t-12' })).toBeDefined()
  expect(await ui.find({ type: 'Button', label: /Show fewer/ })).toBeDefined()
  await ui.unmount()
  mem.set(ORCH_KEY('test-session'), { ...run, tasks: run.tasks.slice(0, 6) })
  ui = await mount($)
  expect(await ui.find({ key: 'morel-rv-tasks' })).toBeUndefined()
  await ui.unmount()
})

test('the failed task row of the Run report has Try again, the same press as the runner (retry N); a done task has none', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const toasts: string[] = []
  on('ui.toast', (_$, e) => { toasts.push(String((e as { text?: string }).text)); return { value: undefined } as never })
  const { mem } = engine(on)
  mem.set('cockpit:firstrun', 'done')
  const failed = { ...taskN(2, 'failed'), endedAt: NOW - 1000 }
  const run: Run = { id: 'r1', name: 'Task run', status: 'done', createdAt: NOW - 3_600_000, startedAt: NOW - 3_000_000, tasks: [{ ...taskN(1, 'done'), endedAt: NOW - 2000 }, failed], choices: DEFAULT_CHOICES }
  mem.set(ORCH_KEY('test-session'), run)
  mem.set(REPORT_KEY, 'r1')
  mem.set(HISTORY_KEY, [reportOf(run, NOW)])
  let ui = await mount($)
  expect(await ui.find({ key: 'rep-retry-1' })).toBeUndefined()
  expect(await ui.find({ type: 'Button', label: /Try again/ })).toBeDefined()
  await ui.press({ key: 'rep-retry-2' })
  await clock.settle()
  await ui.unmount()
  expect(toasts).toContain('Task 2 waits for its turn again.')
})

const W288 = 288 / columnPt()
const usageView = (band: { id: string; level: 'urgent' | 'warn' | 'fail' | 'info'; text: string }[], five: number, week: number, ageMs = 40_000): View =>
  ({ ...viewOf(band), limit: undefined, usage: { at: NOW - ageMs, windows: [{ label: '5-hour limit', percent: five, resetsAt: new Date(NOW + 100 * MIN).toISOString() }, { label: 'Weekly · all models', percent: week, resetsAt: new Date(NOW + 3 * 24 * 60 * MIN).toISOString() }] } }) as unknown as View

test('band: the recap after a break says its first whole sentence at 288 pt, never a cut one', () => {
  const recap = { id: 'recap', level: 'info' as const, text: 'Back after 42 min. Branch feature-with-a-long-name. Cache lapsed. 2 changes wait for your look.' }
  const p = bandPlan(viewOf([recap]), 'explained', W288, [], false, false, true)
  expect(p.mode === 'line' && p.text).toBe('Back after 42 min')
  expect(p.mode === 'line' && p.open?.kind).toBe('details')
})

test('band: a calm done line at the Full look has no Details, so the plan chip keeps its room', () => {
  const done = { id: 'did:Compacted the session', level: 'info' as const, text: 'Compacted the session' }
  expect((bandPlan(usageView([done], 22, 38), 'explained', W288, [], false, false, true) as { open?: unknown }).open).toBeUndefined()
  // At 320 pt the chip now stands beside the whole line (with Details it needed about 370 pt)
  const p = bandPlan(usageView([done], 22, 38), 'explained', 320 / columnPt(), [], false, false, true)
  expect(p.mode === 'line' && p.open).toBeUndefined()
  expect(p.mode === 'line' && p.fit).not.toBe('none')
  // Another info line keeps its Details
  const tip = bandPlan(usageView([{ id: 'costhint', level: 'info', text: 'Sonnet costs less' }], 22, 38), 'explained', W288, [], false, false, true)
  expect(tip.mode === 'line' && tip.open?.kind).toBe('details')
})

test('band: amber only for a real wait; the estimate and the wait for a reset are plain info, a failure is red with its mark', () => {
  const draw = (v: View): N | undefined => textOf(walk(HomeBand(el, v, 'explained', () => undefined, undefined, () => undefined, 900 / columnPt())))
  const est = draw(usageView([{ id: 'limitwarn', level: 'info', text: '5 h runs out about 14:32 (estimate)' }], 86, 64))
  expect(said(est)).toBe('5 h runs out about 14:32 (estimate)')
  expect(est?.props.color).toBeUndefined()
  expect(est?.props.dimColor).toBe(true)
  const fail = draw(viewOf([{ id: 'health', level: 'fail', text: 'Vaken self-test failed' }]))
  expect(said(fail)).toBe('✗ Vaken self-test failed')
  expect(fail?.props.color).toBe(DANGER)
})

test('band: while a used-up limit is waited out the line names it and its reset, at 288 and 440 pt', () => {
  const wait = { id: 'resume', level: 'info' as const, text: 'Waiting for the limit to reset' }
  const v = usageView([wait], 100, 97)
  const reset = new Date(NOW + 100 * MIN)
  const clock = `${String(reset.getHours()).padStart(2, '0')}:${String(reset.getMinutes()).padStart(2, '0')}`
  for (const w of [288, 440]) {
    const p = bandPlan(v, 'explained', w / columnPt(), [], false, false, true)
    expect(p.mode === 'line' && p.text).toBe(`5 h used up · resets ${clock}`)
    expect(p.mode === 'line' && p.info).toBe(true)
  }
  // Swedish at 288 pt: the line stays whole with its reset; its Details goes first
  setLang('sv')
  try {
    const sv = bandPlan(v, 'explained', W288, [], false, false, true)
    expect(sv.mode === 'line' && sv.text).toBe(`5 h förbrukad · återställs kl. ${clock}`)
    expect(sv.mode === 'line' && sv.open).toBeUndefined()
  } finally {
    setLang('en')
  }
  // No used-up limit known: the stored words stay
  expect((bandPlan(usageView([wait], 60, 40), 'explained', 440 / columnPt(), [], false, false, true) as { text?: string }).text).toBe('Waiting for the limit to reset')
})

test('band: a plan reading older than 10 minutes keeps the chip, dim with its coarse age and no colour', () => {
  const v = usageView([], 92, 40, 20 * MIN)
  const p = bandPlan(v, 'explained', 440 / columnPt(), [], false, false, true)
  expect(p.mode).toBe('line')
  const texts = walk(HomeBand(el, v, 'explained', () => undefined, undefined, () => undefined, 440 / columnPt())).filter(n => n.type === 'Text').map(n => ({ s: said(n), color: n.props.color, dim: n.props.dimColor }))
  const figure = texts.find(x => x.s.startsWith('92%'))
  expect(figure?.s).toBe('92%')
  expect(texts.find(x => x.s.startsWith('40%'))?.s).toBe('40% · 20 min ago')
  expect(figure?.color).toBeUndefined()
  expect(figure?.dim).toBe(true)
  // Fresh, the same figure is red
  const fresh = walk(HomeBand(el, usageView([], 92, 40), 'explained', () => undefined, undefined, () => undefined, 440 / columnPt())).filter(n => n.type === 'Text').find(n => said(n).startsWith('92%'))
  expect(fresh?.props.color).toBe(DANGER)
})
