// The plugin trust card: what a plugin can do in plain words, the version-change notice, and /cockpit-help run trust.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { readBand } from '../hooks/core/band'
import type { Io } from '../hooks/core/io'
import { CHANGES_KEY, SEEN_DAYS, SEEN_KEY, UPDATE_WHAT, VERSIONS_KEY, addChange, canDo, changeDetail, changeToast, hooksWhat, parseChanges, parseSeen, parseVersions, plainName, rowLine, trustCard, updateLines, versionChange, withSeen, withVersion } from '../hooks/core/trust'
import type { Change } from '../hooks/core/trust'
import { noteRegistered, noteVersion, tellChanges } from '../hooks/features/trust'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime()
const DAY = 86_400_000

function memIo(): { io: Io; mem: Map<string, unknown>; toasts: string[] } {
  const mem = new Map<string, unknown>()
  const toasts: string[] = []
  const no = (): never => {
    throw new Error('not in this test')
  }
  const io: Io = {
    now: async () => NOW,
    home: async () => '/home/user',
    sessionId: async () => 'session-a',
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, v),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => no(),
    write: async () => no(),
    run: async () => no(),
    ask: async () => no(),
    complete: async () => no(),
    toast: t => void toasts.push(t),
    invalidate: () => undefined,
  }
  return { io, mem, toasts }
}

const scan = { name: 'notes', tier: 'user', events: ['tool.call', 'prompt.submit', 'ui.render'], calls: ['fs.write', 'process.run', 'store.get'] }

test('a name with a marketplace is the same plugin', () => {
  expect(plainName('notes@market')).toBe('notes')
  expect(plainName('notes')).toBe('notes')
})

test('a version change is a plugin seen before with another version; a first sighting or a missing version is not', () => {
  const old = { notes: '1.0.0' }
  expect(versionChange(old, 'notes', '1.1.0', NOW)).toEqual({ name: 'notes', from: '1.0.0', to: '1.1.0', at: NOW, told: false })
  expect(versionChange(old, 'notes@market', '1.1.0', NOW)?.name).toBe('notes')
  expect(versionChange(old, 'notes', '1.0.0', NOW)).toBeUndefined()
  expect(versionChange(old, 'other', '2.0.0', NOW)).toBeUndefined()
  expect(versionChange(old, 'notes', undefined, NOW)).toBeUndefined()
  expect(versionChange(old, 'notes', '', NOW)).toBeUndefined()
  expect(withVersion(old, 'other@x', '2.0.0')).toEqual({ notes: '1.0.0', other: '2.0.0' })
})

test('stored lists are read safely and stay small', () => {
  expect(parseVersions('nonsense')).toEqual({})
  expect(parseVersions({ 'a b': '1', c: 5 })).toEqual({ 'a?b': '1' })
  let list: Change[] = []
  for (let n = 0; n < 50; n += 1) list = addChange(list, { name: `p${n}`, from: '1', to: '2', at: NOW + n, told: false })
  expect(list.length).toBe(40)
  expect(list[0].name).toBe('p49')
  expect(parseChanges([{ name: 'x', from: '1', to: '2', at: NOW, told: true }, 'bad', { at: 'no' }])).toEqual([{ name: 'x', from: '1', to: '2', at: NOW, told: true }])
  const seen = withSeen({}, { ...scan }, NOW)
  expect(Object.keys(parseSeen(seen, NOW + 2 * DAY))).toEqual(['notes'])
  expect(parseSeen(seen, NOW + (SEEN_DAYS + 1) * DAY)).toEqual({})
})

test('what a plugin can do is said in plain words from the scan', () => {
  expect(canDo(['fs.write', 'process.run', 'store.get'])).toEqual(['write files', 'run programs'])
  expect(canDo(['http.fetch', 'model.complete', 'env.set'])).toEqual(['reach the network or other tools', 'spend model usage', 'change environment variables'])
  expect(canDo(['store.get'])).toEqual([])
  expect(hooksWhat(['tool.call', 'prompt.submit', 'ui.render', 'command.run'])).toEqual(["see or change Claude's tool steps", 'see or change your messages', 'handle slash commands', 'draw on screen'])
  expect(hooksWhat([])).toEqual([])
})

test('a row says what the scan shows, or that there is no scan', () => {
  const seen = { tier: 'user', events: scan.events, calls: scan.calls, at: NOW - 5 * 60_000 }
  const line = rowLine({ name: 'notes', version: '1.0.0', seen, commands: 2, agentsStarted: 1 }, NOW)
  expect(line).toMatch(/^notes 1\.0\.0: its scan says it can write files and run programs/)
  expect(line).toMatch(/its hooks see or change Claude's tool steps/)
  expect(line).toMatch(/scanned 5 min ago/)
  expect(line).toMatch(/2 slash commands/)
  expect(line).toMatch(/started 1 agent in this session/)
  expect(rowLine({ name: 'old', commands: 0, agentsStarted: 0 }, NOW)).toMatch(/not scanned by vaken.*not known/)
  expect(rowLine({ name: 'vaken', version: '0.8.12', commands: 3, agentsStarted: 0, own: true }, NOW)).toMatch(/vaken 0\.8\.12 \(this suite\): the engine does not scan the plugin that reads the scan/)
  expect(rowLine({ name: 'quiet', seen: { tier: 'user', events: ['session.start'], calls: ['store.get'], at: NOW }, commands: 0, agentsStarted: 0 }, NOW)).toMatch(/no calls that change things/)
})

test('one line per plugin: first version to last, the count, the span; newest first; at most 10', () => {
  const day = 86_400_000
  const steps: Change[] = [
    { name: 'vaken', from: '0.8.21', to: '0.9.0', at: NOW, told: true },
    { name: 'vaken', from: '0.8.20', to: '0.8.21', at: NOW - day, told: true },
    { name: 'vaken', from: '0.8.19', to: '0.8.20', at: NOW - 3 * day, told: true },
    { name: 'notes', from: '1.0.0', to: '1.1.0', at: NOW - 2 * day, told: true },
  ]
  expect(updateLines(steps)).toEqual(['vaken: 0.8.19 to 0.9.0, 3 changes in 3 days', 'notes: 1.0.0 to 1.1.0, 1 change'])
  expect(updateLines([{ name: 'a', from: '1', to: '2', at: NOW, told: true }, { name: 'a', from: '0', to: '1', at: NOW - 30 * 60_000, told: true }])).toEqual(['a: 0 to 2, 2 changes in 30 min'])
  expect(updateLines([{ name: 'a', from: '1', to: '2', at: NOW, told: true }, { name: 'a', from: '0', to: '1', at: NOW - 5 * 3_600_000, told: true }])).toEqual(['a: 0 to 2, 2 changes in 5 hours'])
  const many = Array.from({ length: 13 }, (_, n) => ({ name: `p${n}`, from: '1', to: '2', at: NOW - n, told: true }))
  const lines = updateLines(many)
  expect(lines).toHaveLength(11)
  expect(lines[0]).toMatch(/^p0:/)
  expect(lines[10]).toBe('and 3 more')
  const card = trustCard([], [], steps, NOW)
  expect(card).not.toMatch(/0\.8\.20 to 0\.8\.21/)
})

test('the card lists changes, plugins, tool servers and what is not knowable', () => {
  const changes: Change[] = [{ name: 'notes', from: '1.0.0', to: '1.1.0', at: NOW - 3_600_000, told: true }]
  const card = trustCard([{ name: 'vaken', commands: 1, agentsStarted: 0, own: true }, { name: 'notes', version: '1.1.0', seen: { tier: 'user', events: scan.events, calls: scan.calls, at: NOW }, commands: 0, agentsStarted: 0 }], [{ name: 'files', tools: 4 }], changes, NOW)
  expect(card).toMatch(/Updated plugins, newest first:\n\s+notes: 1\.0\.0 to 1\.1\.0, 1 change\n/)
  expect(card).toMatch(/Tool servers \(MCP\) in this session:\n\s+files: 4 tools/)
  expect(card).toMatch(/Not knowable from here:/)
  expect(card).toMatch(/Plugins that loaded before vaken/)
  expect(trustCard([], [], [], NOW)).toMatch(/No plugin seen yet/)
  expect(changeDetail(changes[0])).toBe('notes went from version 1.0.0 to 1.1.0.')
  expect(changeToast(changes)).toMatch(/Plugin updated: notes 1\.0\.0 to 1\.1\.0/)
  expect(changeToast([changes[0], changes[0]])).toBe('2 plugins were updated. See /vaken-help run trust.')
})

test('the first sighting stores the version and the scan; a new version is a change, told once with one ledger line, a toast and a band line', async () => {
  const { io, mem, toasts } = memIo()
  await noteRegistered(io, { ...scan, version: '1.0.0' })
  expect(mem.get(VERSIONS_KEY)).toEqual({ notes: '1.0.0' })
  expect(parseSeen(mem.get(SEEN_KEY), NOW).notes.events).toEqual(scan.events)
  expect(mem.has(CHANGES_KEY)).toBe(false)
  await tellChanges(io, 'session-a')
  expect(toasts).toEqual([])

  await noteRegistered(io, { ...scan, version: '1.0.0' })
  expect(mem.has(CHANGES_KEY)).toBe(false)

  await noteRegistered(io, { ...scan, version: '1.1.0' })
  expect(mem.get(VERSIONS_KEY)).toEqual({ notes: '1.1.0' })
  expect(parseChanges(mem.get(CHANGES_KEY))).toEqual([{ name: 'notes', from: '1.0.0', to: '1.1.0', at: NOW, told: false }])

  await tellChanges(io, 'session-a')
  const ledger = (mem.get('cockpit:ledger:compact') ?? []) as Array<{ what: string; did?: boolean; session?: string; detail?: string }>
  const mine = ledger.filter(l => l.what === UPDATE_WHAT)
  expect(mine).toEqual([{ at: NOW, session: 'session-a', what: UPDATE_WHAT, detail: 'notes went from version 1.0.0 to 1.1.0.', how: 'auto', did: true }])
  expect(toasts).toEqual(['Plugin updated: notes 1.0.0 to 1.1.0. See /vaken-help run trust.'])
  const band = await readBand(io)
  expect(band.some(b => b.id === 'trust:update' && b.level === 'info' && /notes 1\.1\.0/.test(b.text))).toBe(true)
  expect(parseChanges(mem.get(CHANGES_KEY))[0].told).toBe(true)

  await tellChanges(io, 'session-a')
  expect(toasts.length).toBe(1)
  expect(((mem.get('cockpit:ledger:compact') ?? []) as Array<{ what: string }>).filter(l => l.what === UPDATE_WHAT).length).toBe(1)
})

test('nothing stored holds an argument, a path or a text: names, versions and event names only', async () => {
  const { io, mem } = memIo()
  await noteVersion(io, 'notes@market', '1.0.0')
  await noteRegistered(io, { ...scan, version: '2.0.0' })
  const dump = JSON.stringify([...mem.entries()])
  expect(dump).not.toMatch(/\/home|\/Users|password|token/i)
})

// ---- the command, in the engine (needs registerTrust in register.tsx)

function memStore(on: On): Map<string, unknown> {
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
  return mem
}

const text = async ($: EngineInterface, command: string, args = ''): Promise<string> => ((await $.command.run(viaParent(command, args))) as { text: string }).text

test('/vaken-help run trust prints the card from what was seen, and tells an untold update once', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'session-a' }))
  mem.set(SEEN_KEY, withSeen({}, scan, NOW))
  mem.set(VERSIONS_KEY, { notes: '1.1.0' })
  mem.set(CHANGES_KEY, [{ name: 'notes', from: '1.0.0', to: '1.1.0', at: NOW, told: false }])
  const card = await text($, 'vaken-trust')
  expect(card).toMatch(/Plugin trust card/)
  expect(card).toMatch(/notes 1\.1\.0: its scan says it can write files and run programs/)
  expect(card).toMatch(/\(this suite\)/)
  expect(card).toMatch(/Not knowable from here/)
  expect(card).toMatch(/notes: 1\.0\.0 to 1\.1\.0, 1 change/)
  const ledger = (mem.get('cockpit:ledger:compact') ?? []) as Array<{ what: string }>
  expect(ledger.map(l => l.what)).toEqual([UPDATE_WHAT])
  await text($, 'vaken-trust')
  expect(((mem.get('cockpit:ledger:compact') ?? []) as Array<{ what: string }>).length).toBe(1)
})
