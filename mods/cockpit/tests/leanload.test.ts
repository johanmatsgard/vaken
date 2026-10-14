// The speed shortcuts give the same answers as the long way: the settings read in one call.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { haltKey } from '../hooks/core/guard'
import { PROJECT_OF_KEY, PROJSET_KEY, SESSSET_KEY, forgetBundles, forgetProjectSet, withToastGate } from '../hooks/core/io'
import type { Io } from '../hooks/core/io'
import { readGlobalSettings } from '../hooks/core/projects'
import { readSettings, settingStoreKey } from '../hooks/core/settings'
import { conflictsOf, setupItems } from '../hooks/core/setupcard'
import type { SetupRead } from '../hooks/core/setupcard'
import { bandSignature, loadView } from '../hooks/features/home/load'
import { flags } from '../hooks/features/home/state'

const MIN = 60_000
const NOW = Date.parse('2026-10-13T12:00:00Z')
const SID = 'lean-1'
const ROOT = '/work/shop'

const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })

function memIo(seed: Record<string, unknown> = {}) {
  const mem = new Map<string, unknown>(Object.entries(seed))
  const count = { reads: 0 }
  const base: Io = {
    now: async () => NOW,
    home: async () => '/home/test',
    sessionId: async () => SID,
    get: async key => {
      count.reads += 1
      return mem.get(key)
    },
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => {
      count.reads += 1
      return [...mem.keys()]
    },
    read: async () => {
      throw new Error('no such file')
    },
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  forgetProjectSet()
  forgetBundles()
  return { io: withToastGate(base), mem, count }
}

test('the settings read in one call are the very values read one key at a time, with a project and a session layer', async () => {
  const { io } = memIo({ [settingStoreKey('look.theme')]: 'teal', [settingStoreKey('route.mode')]: 'bogus', [PROJECT_OF_KEY(SID)]: ROOT, [PROJSET_KEY(ROOT)]: { 'cap.max': 'n4', 'look.theme': 'rose' }, [SESSSET_KEY(SID)]: { 'route.mode': 'auto' } })
  const oneByOne: Io = { ...io, getMany: undefined, getGlobalMany: undefined }
  expect(io.getMany).toBeDefined()
  expect(await readSettings(io)).toEqual(await readSettings(oneByOne))
  expect(await readGlobalSettings(io)).toEqual(await readGlobalSettings(oneByOne))
  expect((await readSettings(io))['route.mode']).toBe('auto')
  expect((await readGlobalSettings(io))['look.theme']).toBe('teal')
  expect((await readSettings(io))['look.theme']).toBe('rose')
})

test('Settings, Help and the Agents view load fewer keys, and the band and the Needs you number are the same as from the whole load', async () => {
  const seed = {
    'cockpit:firstrun': 'done',
    [`cockpit:session:${SID}`]: rec(SID, { cwd: '/work/app', contextPercent: 62, fiveHourPercent: 62, fiveHourResetsAt: '2026-10-13T18:00:00Z' }),
    'cockpit:session:s1': rec('s1', { ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 4 * MIN } }),
    'cockpit:session:s2': rec('s2', { state: 'waiting', title: 'Task 2' }),
    [haltKey(SID)]: { at: NOW - MIN },
    [settingStoreKey('look.view')]: 'custom',
    [settingStoreKey('cards.safety')]: 'hide',
  }
  const before = flags.paneView
  try {
    for (const view of ['settings', 'help', 'runner'] as const) {
      flags.paneView = view
      const lean = memIo(seed)
      const part = await loadView(lean.io, true)
      const whole = memIo(seed)
      const full = await loadView(whole.io)
      expect(lean.count.reads, view).toBeLessThan(whole.count.reads)
      expect(JSON.stringify(part.view), view).toBe(JSON.stringify(full.view))
      expect(bandSignature(part.view, part.detail)).toBe(bandSignature(full.view, full.detail))
      expect(part.view.held, view).toBeGreaterThan(0)
      for (const k of ['values', 'globalValues', 'project', 'layouts', 'currentLayout', 'marks', 'openSections', 'settingsFocus', 'settingsScope', 'run', 'proof', 'sessionSet', 'rolesScope', 'templates', 'history', 'startCheck', 'open'] as const) {
        expect(JSON.stringify(part.prefs[k]), `${view} ${k}`).toBe(JSON.stringify(full.prefs[k]))
      }
      expect(part.prefs.hidden.includes('safety')).toBe(full.prefs.hidden.includes('safety'))
    }
    flags.paneView = 'cards'
    const pane = await loadView(memIo(seed).io, true)
    const whole = await loadView(memIo(seed).io)
    expect(JSON.stringify(pane.prefs)).toBe(JSON.stringify(whole.prefs))
    expect(JSON.stringify(pane.view)).toBe(JSON.stringify(whole.view))
  } finally {
    flags.paneView = before
  }
})

test('the Agent setup card works its items out again when a setting they follow changes, for the same reading', () => {
  const read: SetupRead = { home: '/home/test', root: '/work/app', scope: 'project', disk: {} }
  const values: Record<string, string> = { 'setup.scope': 'project', 'cap.mode': 'warn', 'cap.max': 'n3', 'runner.builder': 'sonnet' }
  const first = setupItems({ values, read })
  expect(first.find(i => i.key === 'claude')?.text).toMatch(/at most 3 agents/)
  values['cap.max'] = 'n6'
  expect(setupItems({ values, read }).find(i => i.key === 'claude')?.text).toMatch(/at most 6 agents/)
  const mine: SetupRead = { ...read, disk: { '/home/test/.claude/agents/builder.md': '---\nmodel: opus\n---\n' } }
  expect(conflictsOf({ values, read })).toEqual([])
  expect(conflictsOf({ values, read: mine }).map(c => c.kind)).toEqual(['model'])
  const got = setupItems({ values, read })
  got.length = 0
  expect(setupItems({ values, read }).length).toBeGreaterThan(0)
})
