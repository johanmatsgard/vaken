// Clear yes: the masked short form of a stopped step; Keep stopped; the Why a step stopped setting.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import type { Io } from '../hooks/core/io'
import { ALLOW_RULES_SETTINGS, ALLOW_RULES_STRINGS, SHORT_MAX, allowRulesModeOf, shortStepOf } from '../hooks/core/allowrules'
import { closeStop, grantAllow, isKeptStopped, keepOpenStop, noteHeld, openShort, stopMem } from '../hooks/core/allowonce'
import { PRESETS } from '../hooks/core/presets'
import { quietRowToWrite } from '../hooks/core/nextupgrade'
import { findSetting, settingPath } from '../hooks/core/settings'
import { itemRow } from '../hooks/features/home/needs'
import type { InboxItem } from '../hooks/core/inbox'
import { byEnglish } from '../hooks/i18n/table'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const SID = 'session-a'
const SV = byEnglish('sv')
const token = (): string => `ghp_${'a'.repeat(36)}`

function fake(): { io: Io; mem: Map<string, unknown>; clock: { now: number } } {
  const mem = new Map<string, unknown>()
  const clock = { now: NOW }
  const no = (): never => {
    throw new Error('not in this test')
  }
  const io: Io = {
    now: async () => clock.now,
    home: async () => '/home/user',
    sessionId: async () => SID,
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, JSON.parse(JSON.stringify(v))),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => no(),
    write: async () => no(),
    run: async () => no(),
    ask: async () => no(),
    complete: async () => no(),
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem, clock }
}

test('a stopped step has a masked short form of at most 60 characters', () => {
  expect(shortStepOf({ tool: 'Bash', command: 'cd /w/app && git reset --hard HEAD~3' })).toBe('git reset --hard HEAD~3')
  expect(shortStepOf({ tool: 'Bash', command: 'rm -rf build/' })).toBe('rm -rf build/')
  const secret = shortStepOf({ tool: 'Bash', command: `curl -H "Authorization: Bearer ${token()}" -X DELETE https://api.example.com/v1/items` }) ?? ''
  expect(secret.includes(token())).toBe(false)
  expect(secret.includes('ghp_')).toBe(false)
  expect(secret.length).toBeLessThanOrEqual(SHORT_MAX)
  const long = shortStepOf({ tool: 'Bash', command: `rm -rf ${'very-long-folder-name/'.repeat(10)}` }) ?? ''
  expect(long.length).toBe(SHORT_MAX)
  expect(shortStepOf({ tool: 'Write', file_path: '/home/user/project/.env' })).toBe('Write .env')
  expect(shortStepOf({ tool: 'WebFetch', url: `https://example.com/x?token=${token()}` })).toBe('WebFetch example.com')
  expect(shortStepOf(undefined)).toBeUndefined()
})

test('the short form lives only while the stop is open, and Keep stopped keeps that exact step stopped', async () => {
  const w = fake()
  stopMem.kept.clear()
  const call = { tool: 'Bash', command: 'git reset --hard HEAD~3', tool_use_id: 'call-1' }
  await noteHeld(w.io, SID, { id: 'call-1', call }, ['destructive|reset'], 'This throws away work.')
  expect(openShort(SID, NOW)).toBe('git reset --hard HEAD~3')
  expect(openShort('session-b', NOW)).toBeUndefined()
  expect(JSON.stringify([...w.mem.values()]).includes('git reset')).toBe(false)
  // Allow once ends the stop, and the short form goes with it
  await grantAllow(w.io, SID)
  expect(openShort(SID, NOW)).toBeUndefined()
  // Dismiss ends it too
  await noteHeld(w.io, SID, { id: 'call-2', call }, ['destructive|reset'], 'This throws away work.')
  closeStop(SID)
  expect(openShort(SID, NOW)).toBeUndefined()
  // Keep stopped: the same step, retried with a new id, stays stopped; another step does not
  await noteHeld(w.io, SID, { id: 'call-3', call }, ['destructive|reset'], 'This throws away work.')
  expect(keepOpenStop(SID)).toBe(true)
  expect(openShort(SID, NOW)).toBeUndefined()
  expect(await isKeptStopped(SID, { id: 'call-4', call: { ...call, tool_use_id: 'call-4' } })).toBe(true)
  expect(await isKeptStopped(SID, { id: 'call-5', call: { tool: 'Bash', command: 'git reset --hard HEAD~1' } })).toBe(false)
  expect(await isKeptStopped('session-b', { id: 'call-6', call })).toBe(false)
  expect(keepOpenStop(SID)).toBe(false)
  stopMem.kept.clear()
})

test('a stopped step here offers Allow once, Keep stopped and Dismiss, and shows its short form', async () => {
  const w = fake()
  const it: InboxItem = { id: 'hold:x', kind: 'hold', sid: SID, name: 'app', here: true, what: 'Held a risky command. This throws away work.', since: NOW, lastAt: NOW, approx: false, todo: '', count: 1, allowed: false }
  await noteHeld(w.io, SID, { id: 'call-1', call: { tool: 'Bash', command: 'git reset --hard' } }, ['destructive|reset'], 'This throws away work.')
  const row = itemRow(it, 0, NOW, x => x) as { inside?: { label: string; more?: { label: string; action: unknown }[] }; what?: { facts?: string[] } }
  expect(row.inside?.label).toBe('Allow once')
  expect(row.inside?.more?.map(m => m.label)).toEqual(['Keep stopped', 'Dismiss'])
  expect(row.inside?.more?.[0]?.action).toEqual({ kind: 'keepStopped' })
  expect(row.what?.facts?.[0]).toBe('Step: git reset --hard')
  closeStop(SID)
})

test('the setting (Why a step stopped): Off or On, stored as offer; On in Recommended and Everything useful, Off in Only alerts, kept off the Settings pane', () => {
  const s = findSetting('allow.rules')
  expect(s?.default).toBe('offer')
  expect(s?.options.map(o => o.value)).toEqual(['off', 'offer'])
  expect(settingPath(ALLOW_RULES_SETTINGS[0])).toBe('/vaken-settings all')
  expect(PRESETS.find(p => p.name === 'quiet')?.values['allow.rules']).toBe('off')
  expect(PRESETS.find(p => p.name === 'balanced')?.values['allow.rules']).toBe('offer')
  expect(PRESETS.find(p => p.name === 'full')?.values['allow.rules']).toBe('offer')
  expect(allowRulesModeOf('off')).toBe('off')
  expect(allowRulesModeOf(undefined)).toBe('offer')
  const quiet = PRESETS.find(p => p.name === 'quiet')?.values ?? {}
  expect(quietRowToWrite('allow.rules', quiet, new Set(Object.keys(quiet).filter(k => k !== 'allow.rules')))).toBe('off')
})

test('every word has a Swedish row', () => {
  for (const s of ALLOW_RULES_STRINGS) expect([s, SV[s] !== undefined]).toEqual([s, true])
})
