// The right model and effort per session: the rules alone, then the pane.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { VIEW_STRINGS } from '../hooks/core/lang'
import { checkRegistry, SETTINGS } from '../hooks/core/settings'
import { FAILS_IN_ROW, FIT_GAP_MS, LOOK_MIN_MS, LOOK_MIN_STEPS, endFit, failsInRow, fitFacts, fitKey, isLookCommand, isLookStretch, modelIdIn, nextStretch, paceFit, parseFit, parseSessionSetting, stepKind, suggestFit, weekTight } from '../hooks/core/modelfit'
import type { FitInput, Stretch } from '../hooks/core/modelfit'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const DAY = 24 * 60 * MIN
const NOW = Date.parse('2026-10-10T12:00:00Z')
const iso = (ms: number): string => new Date(ms).toISOString()

test('a tool step is a look-up, work, or neither; an unknown tool is work', () => {
  expect(stepKind('Read')).toBe('look')
  expect(stepKind('Grep')).toBe('look')
  expect(stepKind('WebFetch')).toBe('look')
  expect(stepKind('Edit')).toBe('work')
  expect(stepKind('Write')).toBe('work')
  expect(stepKind('TodoWrite')).toBe('neutral')
  expect(stepKind('AskUserQuestion')).toBe('neutral')
  expect(stepKind('Agent')).toBe('work')
  expect(stepKind('mcp__x__send')).toBe('work')
  expect(stepKind('Bash', 'ls -la src')).toBe('look')
  expect(stepKind('Bash', 'npm test')).toBe('work')
  expect(stepKind('Bash')).toBe('work')
  expect(stepKind('PowerShell', 'Get-ChildItem src')).toBe('look')
  expect(stepKind('PowerShell', 'npm test')).toBe('work')
  expect(stepKind('PowerShell')).toBe('work')
})

test('a shell command only looks when every piece shows something and nothing is written', () => {
  expect(isLookCommand('git log --oneline -5 && git status')).toBe(true)
  expect(isLookCommand('grep -rn foo src | head -20')).toBe(true)
  expect(isLookCommand('cat a.ts 2>/dev/null')).toBe(true)
  expect(isLookCommand('LANG=C ls')).toBe(true)
  expect(isLookCommand('git commit -m x')).toBe(false)
  expect(isLookCommand('git push')).toBe(false)
  expect(isLookCommand('echo hi > notes.txt')).toBe(false)
  expect(isLookCommand('find . -name "*.tmp" -delete')).toBe(false)
  expect(isLookCommand('find . -exec rm {} ;')).toBe(false)
  expect(isLookCommand('rm -rf build')).toBe(false)
  expect(isLookCommand('sed -i s/a/b/ x')).toBe(false)
  expect(isLookCommand('  ')).toBe(false)
})

test('the stretch of look-ups counts steps from its start; work ends it, a neutral step leaves it', () => {
  let s: Stretch = { n: 0 }
  s = nextStretch(s, 'look', NOW)
  s = nextStretch(s, 'look', NOW + MIN)
  expect(s).toEqual({ since: NOW, n: 2 })
  expect(nextStretch(s, 'neutral', NOW + 2 * MIN)).toEqual(s)
  expect(nextStretch(s, 'work', NOW + 2 * MIN)).toEqual({ n: 0 })
})

test('the record carries coarse facts: the start, "many" from 8 steps, failures, effort; so it changes only a few times a stretch', () => {
  expect(fitFacts({ n: 0 }, 0, undefined)).toEqual({})
  expect(fitFacts({ since: NOW, n: 3 }, 0, 'high')).toEqual({ looks: NOW, effort: 'high' })
  const a = fitFacts({ since: NOW, n: LOOK_MIN_STEPS }, 0, 'high')
  const b = fitFacts({ since: NOW, n: LOOK_MIN_STEPS + 5 }, 0, 'high')
  expect(a).toEqual({ looks: NOW, many: true, effort: 'high' })
  expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  expect(fitFacts({ n: 0 }, 2, undefined)).toEqual({ fails: 2 })
})

test('a stored fit is read defensively', () => {
  expect(parseFit(undefined)).toEqual({})
  expect(parseFit({ looks: 'x', many: 1, fails: 9, effort: 'huge' })).toEqual({ fails: 3 })
  expect(parseFit({ looks: NOW, many: true, effort: 'low' })).toEqual({ looks: NOW, many: true, effort: 'low' })
})

test('failures in a row count from the newest check: a pass ends the count, an unclear one is skipped', () => {
  expect(failsInRow([])).toBe(0)
  expect(failsInRow([{ ok: false }, { ok: false }])).toBe(2)
  expect(failsInRow([{ ok: false }, { ok: true }, { ok: false }])).toBe(1)
  expect(failsInRow([{ ok: false }, { ok: undefined }, { ok: false }])).toBe(2)
  expect(failsInRow([{ ok: false }, { ok: false }, { ok: false }, { ok: false }, { ok: false }])).toBe(3)
})

test('a look-up stretch needs 8 steps and 5 minutes', () => {
  expect(isLookStretch({ looks: NOW - LOOK_MIN_MS, many: true }, NOW)).toBe(true)
  expect(isLookStretch({ looks: NOW - LOOK_MIN_MS + 1, many: true }, NOW)).toBe(false)
  expect(isLookStretch({ looks: NOW - 60 * MIN }, NOW)).toBe(false)
  expect(isLookStretch({}, NOW)).toBe(false)
})

test('the week is tight at 80% for the time gone, with a day or more left', () => {
  expect(weekTight({ percent: 85, resetsAt: iso(NOW + 3 * DAY) }, NOW)).toBe(true)
  expect(weekTight({ percent: 40, resetsAt: iso(NOW + 5 * DAY) }, NOW)).toBe(true)
  expect(weekTight({ percent: 30, resetsAt: iso(NOW + 2 * DAY) }, NOW)).toBe(false)
  expect(weekTight({ percent: 95, resetsAt: iso(NOW + 12 * 60 * MIN) }, NOW)).toBe(false)
  expect(weekTight({ percent: 95 }, NOW)).toBe(false)
  expect(weekTight(undefined, NOW)).toBe(false)
})

const looks = { looks: NOW - 10 * MIN, many: true } as const
const base: FitInput = { on: true, running: false, model: 'claude-opus-5', fit: { ...looks, effort: 'high' }, lookup: 'haiku', now: NOW }
const tight = { percent: 85, resetsAt: iso(NOW + 3 * DAY) }

test('look-ups only: lower the effort to low', () => {
  expect(suggestFit(base)).toEqual({ why: 'looks', change: { effort: 'low' } })
})

test('no hint when the setting is off, for a helper agent, while the turn runs, or with no stretch', () => {
  expect(suggestFit({ ...base, on: false })).toBeUndefined()
  expect(suggestFit({ ...base, isHelper: true })).toBeUndefined()
  expect(suggestFit({ ...base, running: true })).toBeUndefined()
  expect(suggestFit({ ...base, fit: { effort: 'high' } })).toBeUndefined()
})

test('an effort already low, or not known (a model with no effort), gives no lower-effort hint', () => {
  expect(suggestFit({ ...base, fit: { ...looks, effort: 'low' } })).toBeUndefined()
  expect(suggestFit({ ...base, fit: looks })).toBeUndefined()
})

test('a tight week and light work: the model map\'s model for light work, the Researcher\'s', () => {
  expect(suggestFit({ ...base, week: tight })).toEqual({ why: 'week', change: { model: 'haiku' } })
  expect(suggestFit({ ...base, week: tight, lookup: 'sonnet' })).toEqual({ why: 'week', change: { model: 'sonnet' } })
})

test('a tight week on a model already as cheap as the map\'s, or an unknown model: the effort hint instead', () => {
  expect(suggestFit({ ...base, week: tight, model: 'claude-haiku-4-5' })).toEqual({ why: 'looks', change: { effort: 'low' } })
  expect(suggestFit({ ...base, week: tight, model: 'unknown' })).toEqual({ why: 'looks', change: { effort: 'low' } })
})

test('checks failed twice in a row: back up, the effort to high first, else one model step up from the map', () => {
  expect(suggestFit({ ...base, fit: { fails: FAILS_IN_ROW, effort: 'low' } })).toEqual({ why: 'fails', change: { effort: 'high' } })
  expect(suggestFit({ ...base, model: 'claude-sonnet-4-5', fit: { fails: 2, effort: 'high' } })).toEqual({ why: 'fails', change: { model: 'opus' } })
  expect(suggestFit({ ...base, model: 'claude-haiku-4-5', fit: { fails: 3 } })).toEqual({ why: 'fails', change: { model: 'sonnet' } })
  expect(suggestFit({ ...base, fit: { fails: 2, effort: 'high' } })).toBeUndefined()
  expect(suggestFit({ ...base, fit: { fails: 1, effort: 'low' } })).toBeUndefined()
})

test('failures come before look-ups', () => {
  expect(suggestFit({ ...base, week: tight, fit: { ...looks, fails: 2, effort: 'medium' } })).toEqual({ why: 'fails', change: { effort: 'high' } })
})

test('one hint per session per 30 minutes: the same one keeps showing, the next waits after one ended', () => {
  const s = suggestFit(base)!
  const first = paceFit(undefined, s, NOW)
  expect(first).toEqual({ show: true, pace: { key: fitKey(s) } })
  expect(paceFit(first.pace, s, NOW + MIN)).toEqual(first)
  const gone = paceFit(first.pace, undefined, NOW + 2 * MIN)
  expect(gone).toEqual({ show: false, pace: { endedAt: NOW + 2 * MIN } })
  expect(paceFit(gone.pace, s, NOW + 10 * MIN).show).toBe(false)
  expect(paceFit(gone.pace, s, NOW + 2 * MIN + FIT_GAP_MS).show).toBe(true)
})

test('another hint while one shows ends the first and waits; a pressed or dismissed one waits too; a failure keeps it quiet', () => {
  const lower = suggestFit(base)!
  const cheaper = suggestFit({ ...base, week: tight })!
  const shown = paceFit(undefined, lower, NOW).pace
  expect(paceFit(shown, cheaper, NOW + MIN)).toEqual({ show: false, pace: { endedAt: NOW + MIN } })
  const pressed = endFit(shown, NOW)
  expect(paceFit(pressed, lower, NOW + 29 * MIN).show).toBe(false)
  expect(paceFit(pressed, lower, NOW + 30 * MIN).show).toBe(true)
  expect(paceFit({ quiet: true }, lower, NOW + DAY).show).toBe(false)
  expect(endFit({ quiet: true }, NOW)).toEqual({ endedAt: NOW, quiet: true })
})

test('get_session\'s model and effort are read from its JSON, nothing else is guessed', () => {
  expect(parseSessionSetting('{"model":"claude-opus-5","effort":"high","title":"x"}')).toEqual({ model: 'claude-opus-5', effort: 'high' })
  expect(parseSessionSetting('{"session":{"model":"claude-sonnet-4-5","effort":"max"}}')).toEqual({ model: 'claude-sonnet-4-5', effort: 'max' })
  expect(parseSessionSetting('{"model":"","effort":"turbo"}')).toEqual({})
  expect(parseSessionSetting('not json')).toEqual({})
})

test('a refused model name: the id of that family in the app\'s answer', () => {
  expect(modelIdIn('Unknown model "haiku". Pick one of: claude-opus-5, claude-sonnet-4-5, claude-haiku-4-5', 'haiku')).toBe('claude-haiku-4-5')
  expect(modelIdIn('Pick one of: claude-opus-5', 'haiku')).toBeUndefined()
  expect(modelIdIn('haiku is not valid', 'haiku')).toBeUndefined()
})

test('the setting is in Plan and cost (Routing), On by default (a free tip: Recommended has it, Only alerts keeps it off), and every word has a Swedish line', () => {
  const s = SETTINGS.find(x => x.key === 'hints.model')
  expect(s?.group).toBe('Model choice')
  expect(s?.default).toBe('on')
  expect(checkRegistry()).toEqual([])
  const words = englishOf('fit')
  expect(words.filter(w => !VIEW_STRINGS.includes(w))).toEqual([])
  expect(words.filter(w => (SV[w] ?? '') === '')).toEqual([])
})

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

const rec = (sid: string, now: number, over: Record<string, unknown> = {}) => ({ sessionId: sid, cwd: `/work/${sid}`, model: 'claude-opus-5', state: 'waiting', startedAt: now - 60 * MIN, updatedAt: now - 2000, lastEventAt: now - 2000, stateSince: now - 3 * MIN, ...over })

const world = (now: number, over: Record<string, unknown> = {}) => ({
  'cockpit:firstrun': 'done',
  'cockpit:pref:lists': { others: 'all' },
  'cockpit:setting:hints.model': 'on',
  'cockpit:session:test-session': rec('test-session', now, { cwd: '/work/app', state: 'working' }),
  'cockpit:session:t1': rec('t1', now, { title: 'Docs search', fit: { looks: now - 10 * MIN, many: true, effort: 'high' } }),
  ...over,
})

type Call = { tool: string; args: Record<string, unknown> }
function appOf(on: On, answer: (c: Call) => { text: string; isError?: boolean } = () => ({ text: 'ok' })): Call[] {
  const calls: Call[] = []
  on('mcp.call', (_$, e) => {
    const c = { tool: e.tool, args: (e.args ?? {}) as Record<string, unknown> }
    calls.push(c)
    if (c.tool === 'get_session') return { value: { content: [{ type: 'text', text: JSON.stringify({ model: 'claude-opus-5', effort: 'high' }) }], isError: false } } as never
    if (c.tool === 'get_usage' || c.tool === 'list_sessions') return { value: { content: [{ type: 'text', text: 'no' }], isError: true } } as never
    const a = answer(c)
    return { value: { content: [{ type: 'text', text: a.text }], isError: a.isError === true } } as never
  })
  return calls
}
const toastsOf = (on: On): string[] => {
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  return toasts
}
type Ui = { find: (q: unknown) => Promise<unknown>; press: (a: { key: string }) => Promise<void>; redraw: () => Promise<void>; unmount: () => Promise<void> }
const textOf = async (ui: Ui, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps }) as Promise<Ui>
const sets = (calls: Call[]) => calls.filter(c => c.tool.startsWith('set_session_'))

test('an open row of a session that only reads files offers Lower the effort; the press asks the app, logs it, and leaves an undo row that puts it back', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = memStore(on, world(NOW))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const calls = appOf(on)
  const ui = await mountPane($)
  expect(await textOf(ui, /^Only reads files now$/)).toBe(false)
  await ui.press({ key: 'press-o-t1-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Only reads files now$/)).toBe(true)
  expect(await textOf(ui, /^Lower the effort \(saves usage\)$/)).toBe(true)
  expect(sets(calls)).toEqual([])
  await ui.press({ key: 'press-ol-fit:t1-0' })
  await clock.settle()
  const asked = calls.filter(c => c.tool === 'get_session' || c.tool.startsWith('set_session_'))
  expect(asked.map(c => c.tool)).toEqual(['get_session', 'set_session_effort'])
  expect(asked[0]?.args).toEqual({ session_id: 't1' })
  expect(asked[1]?.args).toEqual({ session_id: 't1', effort: 'low' })
  expect(toasts.some(t => /^Asked the app to lower the effort of .+\. It may ask you to confirm\.$/.test(t))).toBe(true)
  const ledger = mem.get('cockpit:ledger:compact') as { what: string }[]
  expect(ledger.some(x => /^Lowered the effort of /.test(x.what))).toBe(true)
  await ui.redraw()
  expect(await textOf(ui, /^Only reads files now$/)).toBe(false)
  expect(await textOf(ui, /^Lowered the effort$/)).toBe(true)
  expect(await textOf(ui, /^Back to high$/)).toBe(true)
  await ui.press({ key: 'press-ol-fitundo:t1-0' })
  await clock.settle()
  expect(sets(calls).map(c => c.args)).toEqual([{ session_id: 't1', effort: 'low' }, { session_id: 't1', effort: 'high' }])
  expect(toasts.some(t => /^Asked the app to put .+ back to high\. It may ask you to confirm\.$/.test(t))).toBe(true)
  await ui.redraw()
  expect(await textOf(ui, /^Back to high$/)).toBe(false)
  await ui.unmount()
})

test('the undo row goes after 30 minutes', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = memStore(on, world(NOW))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  appOf(on)
  const ui = await mountPane($)
  await ui.press({ key: 'press-o-t1-0' })
  await clock.settle()
  await ui.redraw()
  await ui.press({ key: 'press-ol-fit:t1-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Back to high$/)).toBe(true)
  const alive = (now: number) => mem.set('cockpit:session:t1', rec('t1', now, { title: 'Docs search', fit: { looks: NOW - 10 * MIN, many: true, effort: 'low' } }))
  await clock.advance(29 * MIN)
  alive(NOW + 29 * MIN)
  await ui.redraw()
  expect(await textOf(ui, /^Back to high$/)).toBe(true)
  await clock.advance(2 * MIN)
  alive(NOW + 31 * MIN)
  await ui.redraw()
  expect(await textOf(ui, /^Docs search$/)).toBe(true)
  expect(await textOf(ui, /^Back to high$/)).toBe(false)
  await ui.unmount()
})

test('a change the app refuses says to use the model menu there, and that session\'s hint stays quiet', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world(NOW))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  appOf(on, () => ({ text: 'refused', isError: true }))
  const ui = await mountPane($)
  await ui.press({ key: 'press-o-t1-0' })
  await clock.settle()
  await ui.redraw()
  await ui.press({ key: 'press-ol-fit:t1-0' })
  await clock.settle()
  expect(toasts).toContain('Could not change it from here. Use the model menu in that session.')
  await ui.redraw()
  expect(await textOf(ui, /^Only reads files now$/)).toBe(false)
  expect(await textOf(ui, /^Back to/)).toBe(false)
  await clock.advance(40 * MIN)
  await ui.redraw()
  expect(await textOf(ui, /^Only reads files now$/)).toBe(false)
  await ui.unmount()
})

test('a tight week moves light work to the map\'s model; a model name the app refuses is retried with the id it offers', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world(NOW, { 'cockpit:session:test-session': rec('test-session', NOW, { cwd: '/work/app', state: 'working', sevenDayPercent: 85, sevenDayResetsAt: iso(NOW + 3 * DAY) }) }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const calls = appOf(on, c => (c.args.model === 'haiku' ? { text: 'Unknown model. Pick one of: claude-opus-5, claude-haiku-4-5', isError: true } : { text: 'ok' }))
  const ui = await mountPane($)
  await ui.press({ key: 'press-o-t1-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Light work, tight week$/)).toBe(true)
  expect(await textOf(ui, /^Use Haiku$/)).toBe(true)
  await ui.press({ key: 'press-ol-fit:t1-0' })
  await clock.settle()
  expect(sets(calls).map(c => c.args)).toEqual([{ session_id: 't1', model: 'haiku' }, { session_id: 't1', model: 'claude-haiku-4-5' }])
  expect(toasts.some(t => /^Asked the app to move .+ to Haiku\. It may ask you to confirm\.$/.test(t))).toBe(true)
  await ui.redraw()
  expect(await textOf(ui, /^Moved to Haiku$/)).toBe(true)
  expect(await textOf(ui, /^Back to Opus$/)).toBe(true)
  await ui.unmount()
})

test('a session whose turn runs gets no hint, and the setting Off shows none', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world(NOW, { 'cockpit:session:t1': rec('t1', NOW, { title: 'Docs search', state: 'working', fit: { looks: NOW - 10 * MIN, many: true, effort: 'high' } }), 'cockpit:session:t2': rec('t2', NOW, { title: 'Other look', fit: { looks: NOW - 10 * MIN, many: true, effort: 'high' } }), 'cockpit:setting:hints.model': 'off' }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  appOf(on)
  const ui = await mountPane($)
  await ui.press({ key: 'press-o-t1-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Only reads files now$/)).toBe(false)
  await ui.press({ key: 'press-o-t2-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Only reads files now$/)).toBe(false)
  await ui.unmount()
})

test('This session only gets advice: a plain line and Not now, never a call to the app; Not now hides it for 30 minutes', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const here = (now: number) => rec('test-session', now, { cwd: '/work/app', state: 'waiting', stateSince: NOW - 3 * MIN, fit: { looks: NOW - 10 * MIN, many: true, effort: 'high' } })
  const mem = memStore(on, world(NOW, { 'cockpit:session:test-session': here(NOW) }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const calls = appOf(on)
  const ui = await mountPane($)
  expect(await textOf(ui, /^This session only reads files\. You can lower the effort in the model menu\.$/)).toBe(true)
  expect(await ui.find({ key: 'fit-notnow' })).toBeDefined()
  await ui.press({ key: 'fit-notnow' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^This session only reads files/)).toBe(false)
  await clock.advance(20 * MIN)
  mem.set('cockpit:session:test-session', here(NOW + 20 * MIN))
  await ui.redraw()
  expect(await textOf(ui, /^This session only reads files/)).toBe(false)
  await clock.advance(11 * MIN)
  mem.set('cockpit:session:test-session', here(NOW + 31 * MIN))
  await ui.redraw()
  expect(await textOf(ui, /^This session only reads files/)).toBe(true)
  expect(calls.filter(c => c.tool !== 'get_usage' && c.tool !== 'list_sessions')).toEqual([])
  await ui.unmount()
})

test('this session\'s tool steps reach its record: a stretch of look-ups, then work ends it (what the other sessions read)', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = memStore(on, { 'cockpit:firstrun': 'done' })
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  appOf(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await clock.settle()
  const fitNow = () => (mem.get('cockpit:session:test-session') as { fit?: unknown } | undefined)?.fit
  for (let n = 0; n < LOOK_MIN_STEPS; n += 1) {
    await clock.advance(MIN)
    await $.tool.call({ tool: n % 2 === 0 ? 'Read' : 'Bash', ...(n % 2 === 0 ? { file_path: `/work/app/a${n}.ts` } : { command: 'git log --oneline -3' }) } as never)
    await clock.settle()
  }
  await clock.advance(10_000)
  await clock.settle()
  expect(fitNow()).toEqual({ looks: NOW + MIN, many: true })
  await clock.advance(MIN)
  await $.tool.call({ tool: 'Edit', file_path: '/work/app/a.ts', old_string: 'a', new_string: 'b' } as never)
  await clock.settle()
  await clock.advance(10_000)
  await clock.settle()
  expect(fitNow()).toEqual({})
})
