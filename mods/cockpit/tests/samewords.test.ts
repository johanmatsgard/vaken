// Every place says the same thing: the Glance command and the pane, a mode picked for one project and the Guard's default stop.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

import { glanceLines } from '../hooks/core/attention'
import { EXPLAIN } from '../hooks/core/explain'
import { haltKey } from '../hooks/core/guard'
import { isExplicit } from '../hooks/core/guardhost'
import { GUARD_UPGRADE_DONE, GUARD_UPGRADE_WHAT, upgradeGuardWorst } from '../hooks/core/guardupgrade'
import { othersHead } from '../hooks/core/headline'
import { PROJECT_OF_KEY, PROJSET_KEY, SESSSET_KEY, USE_DEFAULT, forgetBundles, forgetProjectSet, withToastGate } from '../hooks/core/io'
import type { Io } from '../hooks/core/io'
import { applySteps, readGlobalSettings, readProjectSet, writeProjectSetting } from '../hooks/core/projects'
import { PRESETS, presetSteps, presetWhat } from '../hooks/core/presets'
import { readSettings, settingStoreKey, writeSetting } from '../hooks/core/settings'
import { COUNTS_LINE } from '../hooks/core/settingsmap'
import type { SessionRecord } from '../hooks/core/record'
import { glanceDotOf } from '../hooks/features/home/headline'
import type { GlanceFacts } from '../hooks/features/home/headline'
import { limitAgo, othersWord } from '../hooks/features/home/logic'
import type { View } from '../hooks/features/home/logic'
import { loadView } from '../hooks/features/home/load'
import { setLang, tLine, tr, trFill, sayStored } from '../hooks/i18n/t'

const MIN = 60_000
const DAY = 24 * 60 * MIN
const SID = 'same-1'
const ROOT = '/work/shop'

function memIo(seed: Record<string, unknown> = {}) {
  const mem = new Map<string, unknown>(Object.entries(seed))
  const base: Io = {
    now: async () => 0,
    home: async () => '',
    sessionId: async () => SID,
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  forgetProjectSet()
  forgetBundles()
  return { io: withToastGate(base), mem }
}

const NOW = Date.parse('2026-10-13T12:00:00Z')
function store(on: On, seed: Record<string, unknown>): Map<string, unknown> {
  mock.clock(on, { now: NOW })
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
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  mock.env(on, { HOME: '/home/user' })
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  return mem
}
const record = (over: Partial<SessionRecord>): SessionRecord => ({ sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'idle', startedAt: NOW - 60 * MIN, updatedAt: NOW - 7 * MIN, lastEventAt: NOW - 7 * MIN, stateSince: NOW - 7 * MIN, ...over }) as SessionRecord

test('/vaken-today glance says the limit, its reset and its age, the paused session and the one Needs you number, as /vaken does', SLOW, async ($, on) => {
  store(on, {
    'cockpit:session:test-session': record({ contextPercent: 30, sevenDayPercent: 40, sevenDayResetsAt: new Date(NOW + 2 * DAY).toISOString() }),
    [haltKey('test-session')]: { at: NOW - MIN },
  })
  const glance = ((await $.command.run(viaParent('vaken-glance', ''))) as { text: string }).text.split('\n')
  const home = ((await $.command.run({ command: 'vaken', args: '' } as never)) as { text: string }).text
  const twin = /Weekly limit: 40% used, (resets \w{3} \d\d:\d\d), read 7 min ago\./.exec(home)
  expect(twin).not.toBeNull()
  expect(glance[1]).toBe(`Weekly limit: 40% used, ${twin![1]}, read 7 min ago.`)
  expect(home).toMatch(/Needs you: 1/)
  expect(glance[0]).toBe('1 needs you.')
  expect(glance[2]).toMatch(/^This session: Needs you: paused, it waits for you to resume it/)
})

test('the Glance lines count the held rows too and name the sessions that ask', () => {
  expect(glanceLines({ needs: [], needsTotal: 2, hereState: 'Idle', didCount: 0 })[0]).toBe('2 need you.')
  expect(glanceLines({ needs: [{ name: 'A', reason: 'asks' }], needsTotal: 3, hereState: 'Idle', didCount: 0 })[0]).toBe('3 need you: A (asks), +2 more.')
  expect(glanceLines({ needs: [], limitPercent: 50, limitLabel: '5-hour limit', limitReset: 'resets 14:00', limitAgo: '25 min ago', hereState: 'Idle', didCount: 0 })[1]).toBe('5-hour limit: 50% used, resets 14:00, read 25 min ago.')
})

test('a mode at This project keeps "use the default" for the two worst kinds, never a Warn that reads as the person\'s choice', async () => {
  const { io, mem } = memIo()
  await io.set(PROJECT_OF_KEY(SID), ROOT)
  await writeSetting(io, 'guard.destructive', 'off')
  await writeSetting(io, 'guard.secrets', 'hold')
  const quiet = PRESETS.find(p => p.name === 'quiet')!
  await applySteps(io, presetSteps(quiet), ROOT)
  const raw = mem.get(PROJSET_KEY(ROOT)) as Record<string, string>
  expect([raw['guard.destructive'], raw['guard.secrets']]).toEqual([USE_DEFAULT, USE_DEFAULT])
  // The project reads the default, and the Guard does not take it for a choice, so its stop where Claude Code would not ask is back.
  expect([(await readSettings(io))['guard.destructive'], (await readSettings(io))['guard.secrets']]).toEqual(['warn', 'warn'])
  expect([await isExplicit(io, 'guard.destructive'), await isExplicit(io, 'guard.secrets')]).toEqual([false, false])
  expect((await readProjectSet(io, ROOT))['guard.destructive']).toBe('warn')
  expect([mem.get(settingStoreKey('guard.destructive')), mem.get(settingStoreKey('guard.secrets'))]).toEqual(['off', 'hold'])
  await writeProjectSetting(io, ROOT, 'compact.mode', 'watch')
  expect((mem.get(PROJSET_KEY(ROOT)) as Record<string, string>)['guard.destructive']).toBe(USE_DEFAULT)
  await writeProjectSetting(io, ROOT, 'guard.destructive', 'warn')
  expect(await isExplicit(io, 'guard.destructive')).toBe(true)
})

test('a mode at This project with nothing saved for All projects leaves the project following it; All projects behaves as before', async () => {
  const fresh = memIo()
  await fresh.io.set(PROJECT_OF_KEY(SID), ROOT)
  const quiet = PRESETS.find(p => p.name === 'quiet')!
  await applySteps(fresh.io, presetSteps(quiet), ROOT)
  const raw = (fresh.mem.get(PROJSET_KEY(ROOT)) ?? {}) as Record<string, string>
  expect([raw['guard.destructive'], raw['guard.secrets']]).toEqual([undefined, undefined])
  expect(await isExplicit(fresh.io, 'guard.destructive')).toBe(false)
  const all = memIo()
  await writeSetting(all.io, 'guard.destructive', 'off')
  await applySteps(all.io, presetSteps(quiet))
  expect(all.mem.has(settingStoreKey('guard.destructive'))).toBe(false)
  expect(await isExplicit(all.io, 'guard.destructive')).toBe(false)
})

test('in bypass permissions, a risky command stops in a project where Only alerts was picked, though All projects says Off', SLOW, async ($, on) => {
  const mem = store(on, { 'cockpit:setting:guard.destructive': 'off', [PROJECT_OF_KEY('test-session')]: '/work/app', 'cockpit:upgrade:guardworst': 'done' })
  on('session.cwd', () => ({ value: '/work/app' }))
  on('session.root', () => ({ value: '/work/app' }))
  on('tool.check', () => ({ decision: 'allow' }) as never)
  on('settings.read', () => ({ value: { permissions: { defaultMode: 'bypassPermissions' } } }) as never)
  on('tool.call', { tool: /^Bash$/ }, () => ({ result: { stdout: '', stderr: '', code: 0 }, text: 'done' }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  const said = (await $.command.run({ ...viaParent('vaken-settings', 'preset quiet yes here'), origin: { kind: 'composer' } } as never)) as { text: string }
  expect(said.text).toMatch(/^Applied Only alerts for this project/)
  expect((mem.get(PROJSET_KEY('/work/app')) as Record<string, string>)['guard.destructive']).toBe(USE_DEFAULT)
  const r = await $.tool.call({ tool: 'Bash', command: 'git push --force origin main' } as never)
  expect(/"deny":/.test(JSON.stringify(r)) || /"isError":true/.test(JSON.stringify(r))).toBe(true)
})

test('the one-time Guard step neither reads a project\'s Warn as All projects nor deletes a person\'s own Stop', async () => {
  const { io, mem } = memIo({ [settingStoreKey('guard.destructive')]: 'hold' })
  await io.set(PROJECT_OF_KEY(SID), ROOT)
  await writeProjectSetting(io, ROOT, 'guard.destructive', 'warn')
  expect(await upgradeGuardWorst(io)).toEqual([])
  expect(mem.get(settingStoreKey('guard.destructive'))).toBe('hold')
  expect(mem.get(GUARD_UPGRADE_DONE)).toBe('done')
  const old = memIo({ [settingStoreKey('guard.secrets')]: 'warn' })
  await old.io.set(PROJECT_OF_KEY(SID), ROOT)
  await writeProjectSetting(old.io, ROOT, 'guard.secrets', 'hold')
  expect(await upgradeGuardWorst(old.io)).toEqual(['guard.secrets'])
  expect(old.mem.has(settingStoreKey('guard.secrets'))).toBe(false)
})

test('the mode card\'s All projects values never hold this session\'s own choices, also when the project has none', async () => {
  const { io } = memIo()
  await io.set(PROJECT_OF_KEY(SID), ROOT)
  await io.set(SESSSET_KEY(SID), { 'route.mode': 'auto' })
  const { prefs, view } = await loadView(io)
  void view
  expect(prefs.values['route.mode']).toBe('auto')
  expect(prefs.globalValues['route.mode']).toBe((await readGlobalSettings(io))['route.mode'])
  expect(prefs.globalValues['route.mode']).not.toBe('auto')
})

test('an old plan figure says its age past 10 minutes too, as the card says "Last reported 25 min ago"', () => {
  expect(limitAgo([{ sinceMs: 25 * MIN }])).toBe('25 min ago')
  expect(limitAgo([{ sinceMs: 4 * MIN }])).toBe('')
})

test('the one-time Guard step\'s Autopilot line has its explanation', () => {
  const x = EXPLAIN[GUARD_UPGRADE_WHAT]
  expect(x).toBeDefined()
  expect(x.means).toMatch(/Risky commands or Secrets/)
})

test('in Swedish a mode title is said in Swedish on the band and in the Autopilot line; 1 idle and the settings count read naturally', () => {
  try {
    setLang('sv')
    const band = tLine('band.preset_name', { preset: 'Everything useful' })
    expect(sayStored({ text: band, key: 'band.preset_name', vars: { preset: 'Everything useful' } })).toBe('Läge: Allt användbart')
    expect(trFill(presetWhat('Everything useful'))).toBe('Tog i bruk läget Allt användbart')
    expect(othersHead({ waiting: 0, working: 0, total: 1 }, tr)).toBe('1 inaktiv')
    expect(othersHead({ waiting: 0, working: 0, total: 3 }, tr)).toBe('3 inaktiva')
    expect(othersWord({ needs: [], working: [], waiting: [], idle: [{}] } as unknown as View, tr)).toBe('1 inaktiv')
    expect(tr(COUNTS_LINE)).toMatch(/\{off\} avstängda\./)
  } finally {
    setLang('en')
  }
  expect(othersHead({ waiting: 0, working: 0, total: 1 })).toBe('1 idle')
})

test('This session\'s dot says its own state: an idle session has the calm dot, as its State row says Idle', () => {
  const facts = (kind: string) => ({ view: { here: { kind, rec: {} }, needs: [] }, others: { others: [] }, hereWaits: false }) as unknown as GlanceFacts
  expect(glanceDotOf('here', facts('idle'), 'normal')).toBe('neutral')
  expect(glanceDotOf('here', facts('working'), 'normal')).toBe('accent')
  expect(glanceDotOf('here', facts('needs'), 'normal')).toBe('amber')
  expect(glanceDotOf('here', facts('idle'), 'warn')).toBe('amber')
})
