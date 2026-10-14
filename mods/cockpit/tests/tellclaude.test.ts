// What reaches Claude: on a fresh install only the safety notes.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import type { Io } from '../hooks/core/io'
import { PRESETS, modeNow } from '../hooks/core/presets'
import { defaults, findSetting, settingStoreKey } from '../hooks/core/settings'
import { GATED_NOTES, SAFETY_NOTES, TELL_KEY, tellsClaude } from '../hooks/core/tellclaude'

const io = (store: Record<string, unknown>): Io => ({ get: async (k: string) => store[k] }) as unknown as Io

test('the default sends Claude only safety notes, and the gate opens only on All checks', async () => {
  expect(defaults()[TELL_KEY]).toBe('safety')
  expect(await tellsClaude(io({}))).toBe(false)
  expect(await tellsClaude(io({ [settingStoreKey(TELL_KEY)]: 'all' }))).toBe(true)
})

test('every note source is a real setting and none is both safety and gated', () => {
  for (const k of [...SAFETY_NOTES, ...GATED_NOTES]) expect(findSetting(k), k).toBeDefined()
  for (const k of GATED_NOTES) expect(SAFETY_NOTES, k).not.toContain(k)
})

test('Only alerts and Recommended keep Claude to safety notes; Everything useful and Every check on send All checks; the defaults are Recommended', () => {
  for (const name of ['quiet', 'balanced']) expect(PRESETS.find(p => p.name === name)!.values[TELL_KEY], name).toBe('safety')
  for (const name of ['full', 'everything']) expect(PRESETS.find(p => p.name === name)!.values[TELL_KEY], name).toBe('all')
  expect(modeNow(defaults())).toBe('balanced')
})
