import { expect } from 'claude-code/testing'
import { test } from './slow'

import { SETTINGS, checkRegistry, defaults, parseAsk, readSetting, readSettings, resetSettings, rowsFor, settingsText, validValue, writeSetting } from '../hooks/core/settings'
import { BUNDLE_TTL_MS, SETTINGS_KEY, ensureBundles, forgetBundles, withToastGate } from '../hooks/core/io'
import type { Io } from '../hooks/core/io'

test('every registry row meets the contract', () => {
  expect(checkRegistry()).toEqual([])
})

test('the contract catches a broken row', () => {
  const row = SETTINGS[0]
  expect(checkRegistry([row, row])).toContain(`${row.key}: key is used twice`)
  expect(checkRegistry([{ ...row, default: 'nope' }])).toContain(`${row.key}: the default is not an option`)
  expect(checkRegistry([{ ...row, label: 'one two three four five' }])).toContain(`${row.key}: label has more than 4 words`)
  expect(checkRegistry([{ ...row, options: [row.options[0]] }])).toContain(`${row.key}: needs at least 2 options`)
})

test('Detail has three options, Glance, Short and Full; a stored Minimal reads as Short', () => {
  expect(SETTINGS[0].options.map(o => o.value)).toEqual(['glance', 'simple', 'explained'])
  expect(SETTINGS[0].options.map(o => o.label)).toEqual(['Glance', 'Short', 'Explained'])
  expect(validValue(SETTINGS[0], 'minimal')).toBe('simple')
  const card = SETTINGS.find(x => x.key === 'detail.limit')!
  expect(card.options.map(o => o.value)).toEqual(['inherit', 'simple', 'explained'])
  expect(validValue(card, 'minimal')).toBe('simple')
})

test('a kept value counts only when it is an option', () => {
  expect(validValue(SETTINGS[0], 'simple')).toBe('simple')
  expect(validValue(SETTINGS[0], 'loud')).toBe('glance')
  expect(validValue(SETTINGS[0], 7)).toBe('glance')
})

test('the Settings view leaves out the hidden rows; the text twin\'s full list keeps them; automatic dials are gone', () => {
  const keys = (withHidden: boolean) => rowsFor(true, withHidden).flatMap(g => g.rows.map(r => r.key))
  for (const key of ['look.language', 'detail.limit', 'detail.computer']) {
    expect(keys(false)).not.toContain(key)
    expect(keys(true)).toContain(key)
  }
  // Motion has a row: a host that ignores the Mac's Reduce Motion still lets a person hold the dot and the bar still.
  expect(keys(false)).toContain('look.motion')
  for (const key of ['arrange', 'band.show', 'notify.cap', 'waits.mode', 'outcomes.mode']) expect(keys(true)).not.toContain(key)
  expect(keys(false)).toContain('detail')
})

test('the text twin lists every visible row with its value and options', () => {
  const text = settingsText(defaults(), false, [], true)
  expect(text).toMatch(/detail: Glance \(glance \/ simple \/ explained\)/)
  expect(text).toMatch(/detail.limit: Default/)
  expect(text).toMatch(/cards.limit: Show/)
})

test('the short text twin counts the rows of each group and lists only the ones you changed', () => {
  const quiet = settingsText(defaults(), false)
  expect(quiet).toMatch(/settings, all at the default/)
  expect(quiet).not.toMatch(/cards.limit: Show/)
  expect(quiet).toMatch(/\/vaken-settings all/)
  expect(settingsText({ ...defaults(), detail: 'simple' }, false)).toMatch(/1 changed[\s\S]*detail: Short/)
  expect(settingsText({ ...defaults(), 'look.language': 'sv' }, false)).toMatch(/look.language: Svenska/)
  expect(settingsText(defaults(), false)).not.toMatch(/Detail per card/)
  expect(parseAsk('all')).toEqual({ kind: 'list', all: true })
})

test('the text command is parsed into list, reset, set or a reason', () => {
  expect(parseAsk('')).toEqual({ kind: 'list' })
  expect(parseAsk(' Reset ')).toEqual({ kind: 'reset' })
  expect(parseAsk('detail Explained')).toEqual({ kind: 'set', key: 'detail', value: 'explained' })
  expect(parseAsk('detail')).toMatchObject({ kind: 'bad' })
  expect(parseAsk('nope x')).toMatchObject({ kind: 'bad' })
  expect(parseAsk('detail loud')).toMatchObject({ kind: 'bad' })
})

function storeIo(seed: Record<string, unknown> = {}): { io: Io; mem: Map<string, unknown>; reads: () => number; clock: { now: number } } {
  const mem = new Map<string, unknown>(Object.entries(seed))
  const clock = { now: 1_000_000 }
  let n = 0
  const base = {
    now: async () => clock.now,
    sessionId: async () => 'me',
    get: async (k: string) => {
      n += 1
      return mem.get(k)
    },
    set: async (k: string, v: unknown) => void mem.set(k, v),
    del: async (k: string) => void mem.delete(k),
    keys: async () => {
      n += 1
      return [...mem.keys()]
    },
    toast: () => undefined,
  } as unknown as Io
  return { io: withToastGate(base), mem, reads: () => n, clock }
}

test('before the bundle exists each setting is read on its own, as before; the session start makes the bundle from the kept values', async () => {
  forgetBundles()
  const w = storeIo({ 'cockpit:setting:detail': 'simple', 'cockpit:setting:loop.breaker': 'stop' })
  expect(await readSetting(w.io, 'detail')).toBe('simple')
  await ensureBundles(w.io)
  expect(w.mem.get(SETTINGS_KEY)).toEqual({ detail: 'simple', 'loop.breaker': 'stop' })
  expect(w.mem.get('cockpit:setting:detail')).toBe('simple')
})

test('with the bundle, every setting of a step costs one read at most, and a change here is seen at once, kept in the bundle and in its small key', async () => {
  forgetBundles()
  const w = storeIo({ [SETTINGS_KEY]: { detail: 'simple' } })
  const before = w.reads()
  const all = await readSettings(w.io)
  expect(all.detail).toBe('simple')
  expect(all['loop.breaker']).toBe(validValue(SETTINGS.find(x => x.key === 'loop.breaker')!, undefined))
  expect(w.reads() - before).toBeLessThanOrEqual(3)
  const second = w.reads()
  await readSettings(w.io)
  expect(w.reads() - second).toBeLessThanOrEqual(1)
  expect(await writeSetting(w.io, 'detail', 'explained')).toBe(true)
  expect(await readSetting(w.io, 'detail')).toBe('explained')
  expect(w.mem.get(SETTINGS_KEY)).toEqual({ detail: 'explained' })
  expect(w.mem.get('cockpit:setting:detail')).toBe('explained')
  await resetSettings(w.io)
  expect(w.mem.get(SETTINGS_KEY)).toEqual({})
  expect(w.mem.has('cockpit:setting:detail')).toBe(false)
  expect(await readSetting(w.io, 'detail')).toBe(validValue(SETTINGS.find(x => x.key === 'detail')!, undefined))
})

test('Reset clears every choice: All projects, each project\'s own rows and each session\'s own rows; other keys stay', async () => {
  forgetBundles()
  const w = storeIo({ 'cockpit:setting:detail': 'simple', 'cockpit:projset:/p': { 'guard.scope': 'off' }, 'cockpit:sessset:s1': { 'detail': 'glance' }, 'cockpit:firstrun': 'done' })
  await resetSettings(w.io)
  expect(w.mem.has('cockpit:setting:detail')).toBe(false)
  expect(w.mem.has('cockpit:projset:/p')).toBe(false)
  expect(w.mem.has('cockpit:sessset:s1')).toBe(false)
  expect(w.mem.get('cockpit:firstrun')).toBe('done')
})

test('a change made in another session shows here once the kept bundle is BUNDLE_TTL_MS old', async () => {
  forgetBundles()
  const w = storeIo({ [SETTINGS_KEY]: { detail: 'explained' } })
  expect(await readSetting(w.io, 'detail')).toBe('explained')
  w.mem.set(SETTINGS_KEY, { detail: 'simple' })
  w.clock.now += BUNDLE_TTL_MS - 1
  expect(await w.io.now()).toBe(w.clock.now)
  expect(await readSetting(w.io, 'detail')).toBe('explained')
  w.clock.now += 1
  await w.io.now()
  expect(await readSetting(w.io, 'detail')).toBe('simple')
})
