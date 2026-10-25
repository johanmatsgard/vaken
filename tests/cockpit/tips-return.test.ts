// The tips that turned Off come back once for a person who had picked a tips mode.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'

import { PRESETS, findPreset, modeNow } from '../hooks/core/presets'
import { defaults, readSettings, settingStoreKey } from '../hooks/core/settings'
import type { Io } from '../hooks/core/io'
import { OLD_TIP_DEFAULTS, TIPS_KEPT_WHAT, TIPS_UPGRADE_DONE, tipsToWrite, upgradeTipDefaults } from '../hooks/core/tipsupgrade'
import { COST_UPGRADE_DONE, OLD_MODES, upgradeCostModes } from '../hooks/core/costupgrade'
import { upgradeNotifyMode } from '../hooks/core/nextupgrade'
import { routeMode } from '../hooks/core/route'
import { setLang, tr } from '../hooks/core/lang'
import { tIn, trFill } from '../hooks/i18n/t'
import { batchText, notices } from '../hooks/core/attention'
import { BY_PERSON_ONLY } from '../hooks/core/origin'
import { settingsCommand } from '../hooks/features/home/commands'
import type { HomeEngine } from '../hooks/features/home/engine'
import { shownTitle } from '../hooks/core/ledger'
import { stateWordOf } from '../hooks/core/orchestra'
import type { Task } from '../hooks/core/orchestra'
import { HEADLINES, glanceDotOf } from '../hooks/features/home/headline'
import type { GlanceFacts } from '../hooks/features/home/headline'
import { hereWaitsOf } from '../hooks/features/home/cards/here'
import type { Prefs } from '../hooks/features/home/prefs'
import { homeText } from '../hooks/features/home/logic'
import type { View } from '../hooks/features/home/logic'
import { REMOVE_HELP } from '../hooks/features/home/views/help'

const NOW = Date.parse('2026-10-13T12:00:00Z')

// The engine's store, in memory, for a test that runs the plugin's own steps.
function memStore(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries(seed))
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
  return mem
}
// The rest of the engine a session start reaches, answered plainly.
function engine(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
  const mem = memStore(on, seed)
  on('session.id', () => ({ value: 's1' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('mcp.call', () => ({ value: { content: [{ type: 'text', text: 'not offered here' }], isError: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  return mem
}
const keptLines = (mem: Map<string, unknown>): number => ((mem.get('cockpit:ledger:compact') as Array<{ what: string }> | undefined) ?? []).filter(l => l.what === TIPS_KEPT_WHAT).length

const memIo = (seed: Record<string, unknown> = {}): { io: Io; mem: Map<string, unknown> } => {
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
    invalidate: () => undefined,
  } as unknown as Io
  return { io, mem }
}

// A store as a mode left it on 1.112: every value of the mode as it was then, but not the rows 1.112 never wrote for it.
const storeOf = (mode: 'quiet' | 'balanced' | 'full', without: string[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(OLD_MODES[mode]).filter(([k]) => !without.includes(k)).map(([k, v]) => [settingStoreKey(k), v]))

function inSwedish<T>(run: () => T): T {
  setLang('sv')
  try {
    return run()
  } finally {
    setLang('en')
  }
}

test('a 1.112 Alerts and tips store gets the model hints back once, then reads as Recommended (the same mode by its id)', async () => {
  // 1.112 Balanced wrote route.mode itself, never hints.model.
  const { io, mem } = memIo(storeOf('balanced', ['hints.model']))
  expect(modeNow(await readSettings(io))).toBe('custom')
  expect(await upgradeTipDefaults(io)).toEqual({ 'hints.model': 'on' })
  expect(mem.get(settingStoreKey('hints.model'))).toBe('on')
  expect(mem.get(TIPS_UPGRADE_DONE)).toBe('done')
  expect((await upgradeCostModes(io)).length).toBeGreaterThan(0)
  expect(modeNow(await readSettings(io))).toBe('balanced')
  expect(await upgradeCostModes(io)).toEqual([])
})

test('a 1.112 Alerts, tips and checks store gets both tips back, and the step runs only once', async () => {
  const { io, mem } = memIo(storeOf('full', ['hints.model', 'route.mode']))
  expect(await upgradeTipDefaults(io)).toEqual({ 'hints.model': 'on', 'route.mode': 'suggest' })
  await upgradeCostModes(io)
  expect(modeNow(await readSettings(io))).toBe('full')
  mem.delete(settingStoreKey('hints.model'))
  expect(await upgradeTipDefaults(io)).toEqual({})
  expect(mem.has(settingStoreKey('hints.model'))).toBe(false)
})

test('a fresh store gets nothing and reads as Recommended; an Only alerts store stays Only alerts', async () => {
  const fresh = memIo()
  expect(await upgradeTipDefaults(fresh.io)).toEqual({})
  expect(await upgradeCostModes(fresh.io)).toEqual([])
  expect(modeNow(await readSettings(fresh.io))).toBe('balanced')
  expect([...fresh.mem.keys()].sort()).toEqual([COST_UPGRADE_DONE, TIPS_UPGRADE_DONE].sort())
  const quiet = memIo(storeOf('quiet', ['hints.model', 'route.mode']))
  expect(await upgradeTipDefaults(quiet.io)).toEqual({})
  // The rows whose default turned On (the decision log, the two tips, the next step buttons) get the Off they had, so the store still reads as Only alerts.
  expect((await upgradeCostModes(quiet.io)).sort()).toEqual(['allow.rules', 'decisions.mode', 'hints.model', 'lean.mode', 'next.mode', 'route.mode', 'teach.mode'])
  await upgradeNotifyMode(quiet.io)
  const v = await readSettings(quiet.io)
  expect(modeNow(v)).toBe('quiet')
  expect([v['hints.model'], v['route.mode']]).toEqual(['off', 'off'])
})

test('a 1.112 store that went from tips to Only alerts (Agent models Suggest still saved) reads as Only alerts again', async () => {
  const { io, mem } = memIo({ ...storeOf('quiet', ['hints.model', 'route.mode']), [settingStoreKey('route.mode')]: 'suggest' })
  expect(modeNow(await readSettings(io))).toBe('custom')
  expect(await upgradeTipDefaults(io)).toEqual({ 'route.mode': 'off' })
  expect(mem.get(settingStoreKey('route.mode'))).toBe('off')
  await upgradeCostModes(io)
  await upgradeNotifyMode(io)
  expect(modeNow(await readSettings(io))).toBe('quiet')
})

test('a Custom store with the two rows unsaved keeps the tips it had: the old values are written', async () => {
  const { io } = memIo({ [settingStoreKey('guard.world')]: 'hold' })
  expect(await upgradeTipDefaults(io)).toEqual({ 'hints.model': 'on', 'route.mode': 'suggest' })
  const v = await readSettings(io)
  expect([v['hints.model'], v['route.mode'], v['guard.world']]).toEqual(['on', 'suggest', 'hold'])
  expect(tipsToWrite({ ...defaults(), 'guard.world': 'hold', 'hints.model': 'off' }, new Set(['hints.model']), true)).toEqual({ 'route.mode': 'suggest' })
  expect(tipsToWrite(defaults(), new Set(), false)).toEqual({})
  expect(Object.keys(OLD_TIP_DEFAULTS)).toEqual(['hints.model', 'route.mode'])
})

test('the upgrade writes one ledger line when it changed a row, and none when it did not', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on, { [settingStoreKey('guard.world')]: 'hold' })
  const start = { cwd: '/work/app', surface: 'desktop', isInteractive: true } as never
  await $.session.start(start)
  expect(keptLines(mem)).toBe(1)
  expect(mem.get(settingStoreKey('hints.model'))).toBe('on')
  expect(inSwedish(() => tr(TIPS_KEPT_WHAT))).toBe('Behöll dina tips efter en uppdatering')
  await $.session.start(start)
  expect(keptLines(mem)).toBe(1)
})

test('a fresh store writes no ledger line at the first start', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  expect(keptLines(mem)).toBe(0)
  expect(mem.get(TIPS_UPGRADE_DONE)).toBe('done')
})

test('Only alerts has no agent model tip; Recommended and Everything useful suggest; a fresh store reads as Recommended', () => {
  expect(findPreset('quiet')!.values['route.mode']).toBe('off')
  expect(findPreset('balanced')!.values['route.mode']).toBe('suggest')
  expect(findPreset('full')!.values['route.mode']).toBe('suggest')
  expect(defaults()['route.mode']).toBe('suggest')
  expect(routeMode(undefined)).toBe('off')
  expect(modeNow(defaults())).toBe('balanced')
  expect([findPreset('quiet')!.values['compact.mode'], findPreset('balanced')!.values['compact.mode'], findPreset('full')!.values['compact.mode']]).toEqual([undefined, undefined, undefined])
  expect(defaults()['compact.mode']).toBe('watch')
  expect(findPreset('quiet')!.about).toMatch(/context is nearly full, a model switch would cost a lot/)
  for (const p of PRESETS) expect(p.values['route.mode'] === undefined || ['off', 'suggest', 'auto'].includes(p.values['route.mode'])).toBe(true)
})

test('This session waits for you: the card, its headline and its dot all say Needs you', () => {
  const hold = { kind: 'hold', here: true, allowed: false }
  expect(hereWaitsOf({ halted: true, inbox: [] } as unknown as Prefs)).toBe('pane.here_waits_halt')
  expect(hereWaitsOf({ halted: false, inbox: [hold] } as unknown as Prefs)).toBe('pane.here_waits_hold')
  expect(hereWaitsOf({ halted: false, inbox: [{ ...hold, here: false }] } as unknown as Prefs)).toBeUndefined()
  const facts = (waits: boolean) => ({ view: { here: { kind: 'working', rec: { contextPercent: 40 } }, needs: [] }, others: { others: [] }, hereWaits: waits }) as unknown as GlanceFacts
  expect(HEADLINES.here(facts(true))).toBe('Needs you')
  expect(glanceDotOf('here', facts(true), 'calm')).toBe('amber')
  // Not waiting: the state word (and the cost when there is one), never the context
  expect(HEADLINES.here(facts(false))).toBe('Working')
  expect(glanceDotOf('here', facts(false), 'calm')).toBe('neutral')
})

test('session names in a toast stay as typed in every language', () => {
  const row = (id: string, name: string) => ({ id, name, kind: 'needs' as const, reason: 'asks a question', since: NOW })
  const list = notices({}, [row('s1', 'Fix'), row('s2', 'Docs')], {}, 'needs', NOW).notices
  const en = batchText(list)
  expect(en).toBe('Waiting for you: Fix, Docs.')
  expect(inSwedish(() => trFill(en))).toBe('Väntar på dig: Fix, Docs.')
})

test('a typed command refused for another origin answers in English, also in Swedish', async () => {
  const { io } = memIo()
  const eng = { io: () => io } as unknown as HomeEngine
  setLang('sv')
  try {
    expect(await settingsCommand(eng, 'hints.model on', false)).toBe(BY_PERSON_ONLY)
  } finally {
    setLang('en')
  }
})

test('old fix-request ledger lines show the new words, in every language', () => {
  for (const old of ['Asked Claude to fix a failing check', 'Asked Claude to fix the failing check']) {
    expect(shownTitle(old)).toBe('Made a fix request for a failing check')
    expect(inSwedish(() => tr(shownTitle(old)))).toBe('Gjorde en begäran om att laga en misslyckad kontroll')
  }
})

test('a running task says Running, as agents do', () => {
  const task = { n: 1, text: 'x', state: 'running' } as unknown as Task
  expect(stateWordOf(task)).toBe('Running')
  expect(inSwedish(() => tr(stateWordOf(task)))).toBe('Körs')
})

test('the Swedish used word agrees in both limit forms', () => {
  expect(tIn('sv', 'glance.name_pct_used', { name: 'Vecka', pct: '69%' })).toBe('Vecka 69% använt')
  expect(tIn('sv', 'glance.name_colon_pct_used', { name: 'Vecka', pct: '69%' })).toBe('Vecka: 69% använt')
})

test('the first-run line names the short preset names, and the removal help names the numbered export copies', () => {
  const first = homeText({ firstRun: true, needs: [], working: [], waiting: [], idle: [], now: NOW } as unknown as View).split('\n')[0]
  expect(first).toMatch(/asks 5 short questions at the first start/)
  expect(first).toMatch(/"Run setup again" in the Start questions card in Settings asks them again/)
  expect(first.split(/[.?] /).length).toBeLessThanOrEqual(4)
  expect(first).not.toMatch(/—|three modes/)
  for (const name of ['quiet', 'balanced', 'recommended', 'full']) expect(findPreset(name)).toBeDefined()
  expect(REMOVE_HELP.text).toMatch(/\.claude\/cockpit-decisions\*\.md and \.claude\/cockpit-audit\*\.md/)
  expect(inSwedish(() => tr(REMOVE_HELP.text))).toMatch(/cockpit-audit\*\.md \(med sina numrerade kopior/)
})
