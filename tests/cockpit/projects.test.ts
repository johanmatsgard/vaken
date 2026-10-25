// Settings per project: a project's own choice wins for every reader, All projects stays as it was.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { PROJECT_OF_KEY, PROJSET_KEY, SESSSET_KEY, forgetProjectSet, withToastGate } from '../hooks/core/io'
import type { Io } from '../hooks/core/io'
import { clearProjectSetting, clearSessionSetting, parseProjectSet, parseSessionSet, projectName, projectOf, projectText, readGlobalSettings, readProjectSet, readSessionSet, sessionText, writeProjectSetting, writeSessionSetting } from '../hooks/core/projects'
import { FAMILIES, familyIn, lookupModel, rankOf, sessionKeyOk, stepUp } from '../hooks/core/models'
import { readSettings, settingStoreKey, writeSetting } from '../hooks/core/settings'

const SID = 'sess-1'
const ROOT = '/work/shop'

function memIo() {
  const mem = new Map<string, unknown>()
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
  return { io: withToastGate(base), mem }
}

test('the name of a project is its last folder', () => {
  expect(projectName('/work/shop')).toBe('shop')
  expect(projectName('/work/shop/')).toBe('shop')
  expect(projectName('/')).toBe('/')
})

test('a project choice wins for every reader of the setting; All projects stays as it was', async () => {
  const w = memIo()
  await writeSetting(w.io, 'guard.destructive', 'warn')
  expect(await projectOf(w.io)).toBeUndefined()
  await w.io.set(PROJECT_OF_KEY(SID), ROOT)
  expect(await projectOf(w.io)).toBe(ROOT)
  expect(await writeProjectSetting(w.io, ROOT, 'guard.destructive', 'hold')).toBe(true)
  expect(await w.io.get(settingStoreKey('guard.destructive'))).toBe('hold')
  expect((await readSettings(w.io))['guard.destructive']).toBe('hold')
  expect((await readGlobalSettings(w.io))['guard.destructive']).toBe('warn')
  expect(w.mem.get(settingStoreKey('guard.destructive'))).toBe('warn')
  const other = memIo()
  for (const [k, v] of w.mem) other.mem.set(k, v)
  other.mem.delete(PROJECT_OF_KEY(SID))
  forgetProjectSet()
  expect((await readSettings(other.io))['guard.destructive']).toBe('warn')
})

test('only real rows and options are kept; clearing follows All projects again', async () => {
  const w = memIo()
  await w.io.set(PROJECT_OF_KEY(SID), ROOT)
  expect(await writeProjectSetting(w.io, ROOT, 'no.such', 'on')).toBe(false)
  expect(await writeProjectSetting(w.io, ROOT, 'compact.mode', 'sometimes')).toBe(false)
  await writeProjectSetting(w.io, ROOT, 'compact.mode', 'auto')
  await writeProjectSetting(w.io, ROOT, 'guard.destructive', 'hold')
  expect(await readProjectSet(w.io, ROOT)).toEqual({ 'compact.mode': 'auto', 'guard.destructive': 'hold' })
  expect(parseProjectSet({ 'compact.mode': 'never', 'guard.destructive': 'hold', x: 'y' })).toEqual({ 'guard.destructive': 'hold' })
  await clearProjectSetting(w.io, ROOT, 'compact.mode')
  expect((await readSettings(w.io))['compact.mode']).toBe('watch')
  await clearProjectSetting(w.io, ROOT)
  expect(w.mem.get(PROJSET_KEY(ROOT))).toBeUndefined()
  expect((await readSettings(w.io))['guard.destructive']).toBe('warn')
})

test('the text twin lists the project choices and how to change them', () => {
  expect(projectText(undefined, {})).toEqual([])
  expect(projectText(ROOT, {})[1]).toBe('This project (shop): follows All projects.')
  const lines = projectText(ROOT, { 'guard.destructive': 'hold' })
  expect(lines[1]).toBe('This project (shop): 1 of its own:')
  expect(lines[2]).toBe('  guard.destructive: Stop')
})

test('This session wins over This project and All projects, for the model keys only; Follow the project clears it', async () => {
  const { io, mem } = memIo()
  await io.set(PROJECT_OF_KEY(SID), ROOT)
  await writeSetting(io, 'runner.builder', 'opus')
  expect(await writeProjectSetting(io, ROOT, 'runner.builder', 'haiku')).toBe(true)
  expect((await readSettings(io))['runner.builder']).toBe('haiku')
  expect(await writeSessionSetting(io, SID, 'runner.builder', 'fable')).toBe(true)
  expect((await readSettings(io))['runner.builder']).toBe('fable')
  expect(mem.get(SESSSET_KEY(SID))).toEqual({ 'runner.builder': 'fable' })
  expect(await writeSessionSetting(io, SID, 'detail', 'simple')).toBe(false)
  expect(await writeSessionSetting(io, SID, 'runner.builder', 'gpt')).toBe(false)
  expect(await writeSessionSetting(io, SID, 'route.mode', 'auto')).toBe(true)
  expect(await readSessionSet(io, SID)).toEqual({ 'runner.builder': 'fable', 'route.mode': 'auto' })
  expect(parseProjectSet({ detail: 'minimal', 'detail.limit': 'minimal' })).toEqual({ detail: 'simple', 'detail.limit': 'simple' })
  expect(parseSessionSet({ 'runner.builder': 'opus', detail: 'simple', 'runner.fixer': 'gpt' })).toEqual({ 'runner.builder': 'opus' })
  await clearSessionSetting(io, SID, 'runner.builder')
  expect((await readSettings(io))['runner.builder']).toBe('haiku')
  await clearSessionSetting(io, SID)
  expect(mem.has(SESSSET_KEY(SID))).toBe(false)
  expect((await readSettings(io))['route.mode']).not.toBe('auto')
  expect(sessionText({})[1]).toBe('This session: follows the project.')
  expect(sessionText({ 'runner.builder': 'opus' })[2]).toBe('  runner.builder: Opus')
})

test('the model map: families in order, one step up, the lookup model and the keys a session may keep', () => {
  expect(FAMILIES).toEqual(['haiku', 'sonnet', 'opus', 'fable'])
  expect(familyIn('claude-sonnet-5')).toBe('sonnet')
  expect(familyIn('claude-mythos-5-1')).toBe('fable')
  expect(familyIn('gpt-x')).toBeUndefined()
  expect([rankOf('haiku'), rankOf('claude-opus-5-5'), rankOf('fable'), rankOf('who')]).toEqual([1, 3, 4, 3])
  expect([stepUp('haiku'), stepUp('claude-sonnet-5'), stepUp('opus'), stepUp('fable'), stepUp('who')]).toEqual(['sonnet', 'opus', undefined, undefined, undefined])
  expect(lookupModel(undefined, undefined)).toBe('haiku')
  expect(lookupModel(undefined, 'sonnet')).toBe('sonnet')
  expect(lookupModel('opus', 'sonnet')).toBe('opus')
  expect(sessionKeyOk('runner.fixer')).toBe(true)
  expect(sessionKeyOk('detail')).toBe(false)
})
