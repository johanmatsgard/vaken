import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { SECTIONS, SETTINGS, findSetting, orderedOptions, sectionOf, sectionSummary, switchOf } from '../hooks/core/settings'
import { BUNDLE_TTL_MS, SETTINGS_KEY } from '../hooks/core/io'
import { langOf } from '../hooks/features/home'
import { SLOW, test } from './slow'
import { clientKey as fcKey } from '../hooks/ui/firstclick'

const NOW = new Date(2026, 9, 10, 22, 0).getTime()
const MIN = 60_000

test('an on/off setting is a switch: off left, on right; Warn, Show and Careful count as on', () => {
  expect(findSetting('arrange')).toBeUndefined()
  expect(switchOf(findSetting('compact.card')!)).toEqual({ off: 'off', on: 'on' })
  expect(switchOf(findSetting('cards.limit')!)).toEqual({ off: 'hide', on: 'show' })
  expect(switchOf(findSetting('detail')!)).toBeUndefined()
  expect(switchOf(findSetting('look.language')!)).toBeUndefined()
  for (const s of SETTINGS) {
    const opts = orderedOptions(s)
    const off = opts.findIndex(o => o.value === 'off' || o.value === 'hide')
    if (off !== -1) expect(off).toBe(0)
    expect(opts.length).toBe(s.options.length)
  }
  expect(findSetting('rules.mode')!.options.map(o => o.value)).toEqual(['off', 'count', 'warn'])
})

test('the settings sections: every group sits in one, in a clear order, and a closed one says how many switches are on', () => {
  expect(SECTIONS.map(s => s.name)).toEqual(['Notices', 'Plan and cost', 'Agents and tasks', 'Safety', 'Prompts and memory', 'Look and cards', 'Health'])
  expect(sectionOf('Risky steps').name).toBe('Safety')
  expect(sectionOf('Page pictures').name).toBe('Agents and tasks')
  expect(sectionOf('A new block').name).toBe('Health')
  const health = SECTIONS.find(s => s.name === 'Health')!
  expect(sectionSummary(health, {})).toMatch(/^\d+ of \d+ settings on$/)
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
function engine(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom'], ['cockpit:setting:detail', 'explained']])
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
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return mem
}
const mountWith = ($: { ui: { mount: (o: unknown) => Promise<never> } }) => () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })

test('Settings opens with every section closed; a section row opens it, and several can be open; a switch row flips its setting from anywhere on the row', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:firstrun', 'done')
  const mount = mountWith($ as never) as () => Promise<{ find: (q: unknown) => Promise<unknown>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }>
  const home = await mount()
  await home.press({ key: 'settings' })
  await home.unmount()
  const look = await mount()
  for (const name of ['Cards and look', 'Money and plan', 'Safety', 'Health', 'Advanced']) expect(await look.find({ type: 'Text', text: new RegExp(`^${name}$`) })).toBeDefined()
  expect(await look.find({ key: 'cards.limit-switch' })).toBeUndefined()
  await look.press({ key: 'press-ol-section:Look and cards-0' })
  await look.unmount()
  const first = await mount()
  expect(await first.find({ key: 'cards.limit-switch' })).toBeDefined()
  for (const key of ['band.show-off', 'look.language-sv', 'arrange-on', 'detail.limit-simple']) expect(await first.find({ key })).toBeUndefined()
  expect(await first.find({ key: 'look.motion-reduced' })).toBeDefined()
  expect(await first.find({ key: 'guard.destructive-warn' })).toBeUndefined()
  await first.press({ key: 'press-ol-section:Safety-0' })
  await first.unmount()
  const safety = await mount()
  expect(await safety.find({ key: 'guard.destructive-warn' })).toBeDefined()
  expect(await safety.find({ key: 'cards.limit-switch' })).toBeDefined()
  expect(await safety.find({ key: 'row-guard.outbox' })).toBeUndefined()
  const before = mem.get('cockpit:setting:undo.mode')
  const pointer = (safety as unknown as { pointer: (e: unknown) => Promise<void> }).pointer
  await pointer({ type: 'down', x: 1, y: 0, button: 'left', in: fcKey('sw-undo.mode') })
  await pointer({ type: 'up', x: 1, y: 0, button: 'left', in: fcKey('sw-undo.mode') })
  expect(mem.get('cockpit:setting:undo.mode')).not.toBe(before)
  await safety.unmount()
})

test('Agents: one filter (all sessions or this session), kept; running and the last hour first, the rest behind Show N more', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:firstrun', 'done')
  const old = (id: string, session: string, ago: number) => ({ id, session, type: 'Explore', what: `Helper ${id}`, background: true, startedAt: NOW - ago - MIN, endedAt: NOW - ago, state: 'done' })
  mem.set('cockpit:agentboard', [old('a1', 'test-ses', 2 * MIN), old('a2', 'othersss', 3 * MIN), old('a3', 'othersss', 90 * MIN)])
  const mount = mountWith($ as never) as () => Promise<{ find: (q: unknown) => Promise<unknown>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }>
  const all = await mount()
  expect(await all.find({ type: 'Text', text: /^Helper a1$/ })).toBeDefined()
  expect(await all.find({ type: 'Text', text: /^Helper a2$/ })).toBeDefined()
  expect(await all.find({ type: 'Text', text: /^Helper a3$/ })).toBeUndefined()
  expect(await labelOf(all, 'morel-agents')).toBe('Show 1 more')
  expect(await all.find({ key: 'agents-scope-all' })).toBeUndefined()
  await all.press({ key: 'morel-agents' })
  await all.unmount()
  const older = await mount()
  expect(await older.find({ type: 'Text', text: /^Helper a3$/ })).toBeDefined()
  expect(await labelOf(older, 'morel-agents')).toBe('Show fewer')
  await older.press({ key: 'agents-from-here' })
  await older.unmount()
  expect(mem.get('cockpit:pref:lists')).toMatchObject({ from: 'here' })
  const here = await mount()
  expect(await here.find({ type: 'Text', text: /^Helper a1$/ })).toBeDefined()
  expect(await here.find({ type: 'Text', text: /^Helper a2$/ })).toBeUndefined()
  await here.unmount()
})

const helper = (id: string, ago: number) => ({ id, session: 'test-ses', type: 'Explore', what: `Helper ${id}`, background: true, startedAt: NOW - ago - MIN, endedAt: NOW - ago, state: 'done' })
type Pane = { find: (q: unknown) => Promise<unknown>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }
const labelOf = async (pane: Pane, key: string): Promise<string | undefined> => ((await pane.find({ key })) as { props?: { label?: string } } | undefined)?.props?.label?.trim()

test('B11: Show N more opens every row of the Agents card, and the row then says Show fewer; shut, the cap holds', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:agentboard', Array.from({ length: 8 }, (_, n) => helper(`h${n}`, (n + 1) * MIN)))
  const mount = mountWith($ as never) as () => Promise<Pane>
  const now = await mount()
  expect(await now.find({ type: 'Text', text: /^Helper h4$/ })).toBeDefined()
  expect(await now.find({ type: 'Text', text: /^Helper h5$/ })).toBeUndefined()
  expect(await labelOf(now, 'morel-agents')).toBe('Show 3 more')
  await now.press({ key: 'morel-agents' })
  await now.unmount()
  const all = await mount()
  expect(await all.find({ type: 'Text', text: /^Helper h7$/ })).toBeDefined()
  expect(await labelOf(all, 'morel-agents')).toBe('Show fewer')
  await all.unmount()
})

test('B10: Other sessions on Now with only quiet sessions says so; B15: the end-of-list row and the lines are Swedish when the language is Swedish', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:firstrun', 'done')
  const quiet = (id: string) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'idle', startedAt: NOW - 300 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 200 * MIN, stateSince: NOW - 200 * MIN })
  mem.set('cockpit:session:q1', quiet('q1'))
  mem.set('cockpit:session:q2', quiet('q2'))
  mem.set('cockpit:agentboard', Array.from({ length: 7 }, (_, n) => helper(`h${n}`, (n + 1) * MIN)))
  const mount = mountWith($ as never) as () => Promise<Pane>
  const en = await mount()
  expect(await en.find({ type: 'Text', text: 'No other session is active now.' })).toBeDefined()
  expect(await labelOf(en, 'morel-others')).toBe('Show 2 more')
  expect(await labelOf(en, 'morel-agents')).toBe('Show 2 more')
  await en.unmount()
  mem.set('cockpit:setting:look.language', 'sv')
  const sv = await mount()
  expect(await sv.find({ type: 'Text', text: 'Ingen annan session är aktiv nu.' })).toBeDefined()
  expect(await labelOf(sv, 'morel-others')).toBe('Visa 2 till')
  expect(await labelOf(sv, 'morel-agents')).toBe('Visa 2 till')
  expect(await sv.find({ type: 'Text', text: /^Inget att visa än\./ })).toBeDefined()
  await sv.unmount()
})

test('a card\'s own More or Less flips it between Short and Full and is kept per card; the pane\'s level clears it', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:firstrun', 'done')
  // This test is about More or Less itself: with nothing reported every card is calm and would shrink.
  mem.set('cockpit:setting:view.problems', 'off')
  const mount = mountWith($ as never) as () => Promise<Pane>
  const full = await mount()
  expect(await full.find({ key: 'detail-limit' })).toBeUndefined()
  expect(await labelOf(full, 'detail-autopilot')).toBe('Show less')
  await full.press({ key: 'detail-autopilot' })
  await full.unmount()
  expect(mem.get('cockpit:setting:detail.autopilot')).toBe('simple')
  const short = await mount()
  expect(await labelOf(short, 'detail-autopilot')).toBe('Show more')
  expect(await labelOf(short, 'detail-here')).toBe('Show less')
  await short.press({ key: 'detail-autopilot' })
  await short.unmount()
  expect(mem.get('cockpit:setting:detail.autopilot')).toBe('inherit')
  mem.set(SETTINGS_KEY, { ...(mem.get(SETTINGS_KEY) as object), detail: 'simple' })
  await clock.advance(BUNDLE_TTL_MS + 1)
  const pane = await mount()
  expect(await labelOf(pane, 'detail-here')).toBe('Show more')
  await pane.press({ key: 'detail-here' })
  await pane.unmount()
  expect(mem.get('cockpit:setting:detail.here')).toBe('explained')
  mem.set(SETTINGS_KEY, { ...(mem.get(SETTINGS_KEY) as object), 'look.language': 'sv' })
  await clock.advance(BUNDLE_TTL_MS + 1)
  const sv = await mount()
  expect(await labelOf(sv, 'detail-here')).toBe('Visa mindre')
  expect(await labelOf(sv, 'detail-autopilot')).toBe('Visa mer')
  await sv.unmount()
})

test('Arrange cards is a button on the home screen, not a setting; Done ends it', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:firstrun', 'done')
  const mount = mountWith($ as never) as () => Promise<Pane>
  const home = await mount()
  expect(await labelOf(home, 'arrange')).toBe('Arrange cards')
  await home.press({ key: 'arrange' })
  await home.unmount()
  expect(mem.get('cockpit:setting:arrange')).toBeUndefined()
  const board = await mount()
  expect(await board.find({ key: 'arrange-board' })).toBeDefined()
  expect(await board.find({ key: 'arrange' })).toBeUndefined()
  await board.press({ key: 'arrange-done' })
  await board.unmount()
  const back = await mount()
  expect(await back.find({ key: 'arrange-board' })).toBeUndefined()
  await back.unmount()
})

test('the language follows the Mac (LANG) unless the text command chose one', () => {
  expect(langOf('auto', 'sv_SE.UTF-8')).toBe('sv')
  expect(langOf(undefined, 'en_US.UTF-8')).toBe('en')
  expect(langOf('auto', '')).toBe('en')
  expect(langOf('en', 'sv_SE.UTF-8')).toBe('en')
  expect(langOf('sv', 'en_GB.UTF-8')).toBe('sv')
})
