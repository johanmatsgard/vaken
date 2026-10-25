// Notices default to This session too: the one-time step moves a mode press's saved Needs you, and keeps a choice.
import { expect } from 'claude-code/testing'

import { PRESETS, modeNow } from '../hooks/core/presets'
import { notifyModeToWrite } from '../hooks/core/nextupgrade'
import { defaults } from '../hooks/core/settings'
import { test } from './slow'

const modeValues = (name: string): Record<string, string> => ({ ...defaults(), ...(PRESETS.find(p => p.name === name)?.values ?? {}) })

test('the default is This session too and every mode sets it', () => {
  expect(defaults()['notify.mode']).toBe('self')
  for (const m of ['quiet', 'balanced', 'full']) expect(modeValues(m)['notify.mode']).toBe('self')
})

test('a store on a mode with the old saved Needs you moves to This session too once and reads as its mode', () => {
  for (const m of ['quiet', 'balanced', 'full'] as const) {
    const old = { ...modeValues(m), 'notify.mode': 'needs' }
    expect(modeNow(old)).toBe('custom')
    expect(notifyModeToWrite(old)).toBe('self')
    expect(modeNow({ ...old, 'notify.mode': 'self' })).toBe(m)
  }
})

test('a store that chose Needs you and done, Off, or Needs you next to other changes keeps it', () => {
  const base = modeValues('balanced')
  expect(notifyModeToWrite({ ...base, 'notify.mode': 'all' })).toBeUndefined()
  expect(notifyModeToWrite({ ...base, 'notify.mode': 'off' })).toBeUndefined()
  expect(notifyModeToWrite({ ...base, 'notify.mode': 'needs', 'guard.tests': 'off' })).toBeUndefined()
  expect(notifyModeToWrite(base)).toBeUndefined()
})
