// The modes sorted by cost: the one-time step that keeps a picked mode by its name, the way back from Custom.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { COMPACT_UPGRADE_DONE, COST_UPGRADE_DONE, OLD_COST_DEFAULTS, OLD_MODES, costStep, installedBefore, oldModeOf, upgradeCompactAuto, upgradeCostModes } from '../hooks/core/costupgrade'
import { upgradeNotifyMode } from '../hooks/core/nextupgrade'
import { MODE_CLASSES, findPreset, modeNow } from '../hooks/core/presets'
import { SETTINGS, defaults, readSettings, settingStoreKey } from '../hooks/core/settings'
import { NEEDS_CALM_OPEN, START_OPEN_CARDS, glanceOpenKey, openCardsOf, withOpenCards } from '../hooks/core/headline'
import type { Io } from '../hooks/core/io'
import { actsOf } from '../hooks/features/home/acts'
import { BACK_WORDS, backAskLines, backOffered } from '../hooks/features/home/backmode'
import type { HomeEngine } from '../hooks/features/home/engine'
import { forgetOpenSeed, seedOpenCards } from '../hooks/features/home/load'
import { PREF_LISTS, parseLists } from '../hooks/features/home/prefs'
import { flags } from '../hooks/features/home/state'
import { TABLE } from '../hooks/i18n/table'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-13T12:00:00Z')
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }

const memIo = (seed: Record<string, unknown> = {}, onInvalidate: () => void = () => undefined): { io: Io; mem: Map<string, unknown> } => {
  const mem = new Map<string, unknown>(Object.entries(seed))
  const io = {
    now: async () => NOW,
    home: async () => '/home/user',
    sessionId: async () => 's1',
    get: async (key: string) => mem.get(key),
    set: async (key: string, value: unknown) => void mem.set(key, value),
    del: async (key: string) => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    ask: async () => undefined,
    complete: async () => ({ text: '' }),
    toast: () => undefined,
    invalidate: onInvalidate,
  } as unknown as Io
  return { io, mem }
}
const stored = (values: Record<string, string>): Record<string, unknown> => Object.fromEntries(Object.entries(values).map(([k, v]) => [settingStoreKey(k), v]))

test('Compact by itself: a new store reads Watch only; a store from before that never chose keeps Auto, once; a choice stays', async () => {
  expect(defaults()['compact.mode']).toBe('watch')
  const fresh = memIo()
  expect(await installedBefore(fresh.io)).toBe(false)
  expect(await upgradeCompactAuto(fresh.io, false)).toBe(false)
  expect((await readSettings(fresh.io))['compact.mode']).toBe('watch')
  expect(fresh.mem.get(COMPACT_UPGRADE_DONE)).toBe('done')
  // A store from before: a mark of an earlier session start, or any saved row
  const old = memIo({ [COST_UPGRADE_DONE]: 'done' })
  expect(await installedBefore(old.io)).toBe(true)
  expect(await installedBefore(memIo(stored({ 'lean.mode': 'off' })).io)).toBe(true)
  expect(await upgradeCompactAuto(old.io, true)).toBe(true)
  expect((await readSettings(old.io))['compact.mode']).toBe('auto')
  // Once: a later Watch only the person picks is not put back
  old.mem.set(settingStoreKey('compact.mode'), 'watch')
  expect(await upgradeCompactAuto(old.io, true)).toBe(false)
  expect((await readSettings(old.io))['compact.mode']).toBe('watch')
  // A stored choice from before stays
  const chose = memIo({ [COST_UPGRADE_DONE]: 'done', ...stored({ 'compact.mode': 'off' }) })
  expect(await upgradeCompactAuto(chose.io, true)).toBe(false)
  expect((await readSettings(chose.io))['compact.mode']).toBe('off')
})

test('every row a mode writes is a real row, in one class; no (4) row is in any class', () => {
  const all = [...MODE_CLASSES.alerts, ...MODE_CLASSES.helpers, ...MODE_CLASSES.sends]
  for (const k of all) expect(SETTINGS.some(s => s.key === k), k).toBe(true)
  for (const k of ['cache.keeper', 'route.mode', 'resume.mode', 'awake.mode', 'setup.apply']) {
    for (const m of ['quiet', 'balanced', 'full']) expect(['auto', 'on', 'resume'].includes(findPreset(m)!.values[k] ?? ''), `${m}: ${k}`).toBe(false)
  }
  // The budget was a helper in the old table; it is in no mode now (the setup and Settings set it).
  expect(Object.keys(OLD_COST_DEFAULTS).sort()).toEqual([...MODE_CLASSES.helpers, 'cost.budget'].sort())
  for (const k of Object.keys(OLD_COST_DEFAULTS).filter(x => x !== 'cost.budget')) expect(defaults()[k], k).toBe(findPreset('balanced')!.values[k])
})

test('the one-time step: Only alerts stays Only alerts, the old tips modes move to their new selves by id, a light-start store reads as Recommended', async () => {
  expect(costStep(defaults(), new Set())).toEqual({ kind: 'none' })
  expect(costStep({ ...defaults(), 'cost.budget': 'off' }, new Set(['cost.budget']))).toEqual({ kind: 'none' })
  // a pick of Only alerts, stored before the decision log joined it: the log gets its old Off, so the store still reads as Only alerts
  const quiet = memIo(stored(OLD_MODES.quiet))
  expect(oldModeOf(await readSettings(quiet.io), new Set(Object.keys(OLD_MODES.quiet)))).toBe('quiet')
  expect((await upgradeCostModes(quiet.io)).sort()).toEqual(['allow.rules', 'decisions.mode', 'lean.mode', 'next.mode', 'teach.mode'])
  await upgradeNotifyMode(quiet.io)
  expect(modeNow(await readSettings(quiet.io))).toBe('quiet')
  expect(quiet.mem.get(COST_UPGRADE_DONE)).toBe('done')
  expect(await upgradeCostModes(quiet.io)).toEqual([])
  for (const [old, now] of [['balanced', 'balanced'], ['full', 'full']] as const) {
    const s = memIo(stored(OLD_MODES[old]))
    expect(modeNow(await readSettings(s.io)), old).toBe('custom')
    expect((await upgradeCostModes(s.io)).length, old).toBeGreaterThan(0)
    expect(modeNow(await readSettings(s.io)), old).toBe(now)
  }
  const custom = memIo(stored({ ...OLD_MODES.balanced, 'guard.world': 'hold' }))
  expect(await upgradeCostModes(custom.io)).toEqual([])
  expect(custom.mem.get(settingStoreKey('decisions.mode'))).toBeUndefined()
})

test('the way back from Custom: the lines say what Recommended would change, in the pane words, and every word has a Swedish line', () => {
  expect(backOffered(defaults())).toBe(false)
  const mine = { ...defaults(), 'prompt.check': 'off', 'assume.check': 'on' }
  expect(backOffered(mine)).toBe(true)
  expect(backAskLines(mine, s => s)).toEqual(['Prompt review: Off -> Tip', 'Assumption review: On -> Off'])
  for (const name of Object.values(BACK_WORDS)) {
    expect(typeof TABLE[name]?.en, name).toBe('string')
    expect(typeof TABLE[name]?.sv, name).toBe('string')
  }
})

test('the way back asks first: Ask opens the list, Keep closes it, Yes applies Recommended', async () => {
  let wake: () => void = () => undefined
  const { io, mem } = memIo({ ...stored({ 'prompt.check': 'off' }), 'cockpit:firstrun': 'done' }, () => wake())
  const eng = { io: () => io } as unknown as HomeEngine
  const act = actsOf(eng)
  act.askBack!('ask')
  expect(flags.backAsk).toBe(true)
  act.askBack!('keep')
  expect(flags.backAsk).toBe(false)
  expect(mem.get(settingStoreKey('prompt.check'))).toBe('off')
  act.askBack!('ask')
  const done = new Promise<void>(r => {
    wake = r
  })
  act.askBack!('yes')
  await done
  expect(flags.backAsk).toBe(false)
  expect(mem.get(settingStoreKey('prompt.check'))).toBe('tip')
  expect(modeNow(await readSettings(io))).toBe('balanced')
})

test('the cards that start open: the helpers add and read back the open set, and a kept list opens them once per session', () => {
  expect([...START_OPEN_CARDS]).toEqual(['needs', 'here', 'limit'])
  const sections = withOpenCards(['section:Safety', glanceOpenKey('here')], START_OPEN_CARDS)
  expect(sections).toEqual(['section:Safety', 'glance:here', 'glance:limit'])
  expect(openCardsOf(sections, true)).toEqual(['needs', 'here', 'limit'])
  expect(openCardsOf(['glance:agents'], false)).toEqual(['agents'])
  expect(parseLists({ open: ['here', 3] }).open).toEqual(['here'])
  expect(parseLists({}).open).toBeUndefined()
  flags.openSections = []
  flags.openWhat = undefined
  forgetOpenSeed()
  seedOpenCards(parseLists({}))
  expect(flags.openSections).toEqual([])
  forgetOpenSeed()
  seedOpenCards(parseLists({ open: ['needs', 'limit'] }))
  expect(flags.openSections).toEqual(['glance:limit'])
  expect(flags.openWhat).toBe(NEEDS_CALM_OPEN)
  flags.openSections = []
  seedOpenCards(parseLists({ open: ['needs', 'limit'] }))
  expect(flags.openSections).toEqual([])
  flags.openWhat = undefined
})

function engine(on: On, mem: Map<string, unknown>) {
  on('store.get', (_$, e) => ({ value: mem.has(e.key) ? JSON.parse(JSON.stringify(mem.get(e.key))) : undefined }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}

test('the Start choice on a fresh store opens Needs you, This session and Plan limits, and keeps them for later sessions', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  flags.openSections = []
  flags.openWhat = undefined
  const mem = new Map<string, unknown>()
  engine(on, mem)
  const pane = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  // The setup: an answer, the five steps, then Finish on the summary
  await pane.press({ key: 'start-mode-balanced' })
  for (let n = 0; n < 5; n += 1) {
    await pane.press({ key: 'start-next' })
    await pane.redraw()
  }
  await pane.press({ key: 'start-finish' })
  await pane.unmount()
  expect(mem.get('cockpit:firstrun')).toBe('done')
  expect(parseLists(mem.get(PREF_LISTS)).open).toEqual(['needs', 'here', 'limit'])
})

test('Skip, use recommended on the Start here card is a Start choice too', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = new Map<string, unknown>()
  engine(on, mem)
  const pane = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await pane.press({ key: 'start-skip' })
  await pane.unmount()
  expect(parseLists(mem.get(PREF_LISTS)).open).toEqual(['needs', 'here', 'limit'])
})

test('a store that finished its start before keeps its shut start: no open set is written', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const before = new Map<string, unknown>([['cockpit:firstrun', 'done']])
  engine(on, before)
  const again = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await again.unmount()
  expect(parseLists(before.get(PREF_LISTS)).open).toBeUndefined()
})
