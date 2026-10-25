// Honest Guard label: the Warn of Risky commands and Secrets says it still stops in auto mode while the person has not chosen it,
// and "Warn only" once they have. Words only: strongMode (core/guardhost.ts) acts as before.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { SETTING_KEY } from '../hooks/core/guard'
import { SECRETS_KEY } from '../hooks/core/guardworld'
import { STRONG_KEYS, WARN_CHOSEN, WARN_UNCHOSEN, strongMode } from '../hooks/core/guardhost'
import type { Io } from '../hooks/core/io'
import { findSetting } from '../hooks/core/settings'
import { setLang, tr } from '../hooks/core/lang'
import { optionsOf } from '../hooks/features/home/views/settingrow'
import type { Prefs } from '../hooks/features/home/prefs'
import { pickLines, pickWidthPt } from '../hooks/ui/kit'
import { BORDER_X_PT } from '../hooks/ui/tokens'

const prefs = (guardExplicit?: string[], project?: Record<string, string>): Prefs =>
  ({ ...(guardExplicit === undefined ? {} : { guardExplicit }), ...(project === undefined ? {} : { project: { set: project } }) }) as unknown as Prefs
const labels = (key: string, p: Prefs): string[] => optionsOf(findSetting(key) as NonNullable<ReturnType<typeof findSetting>>, p).map(o => o.label)

test('the unchosen Warn of Risky commands and Secrets says it stops in auto mode; a chosen one says Warn only; other rows keep Warn', () => {
  expect(STRONG_KEYS).toEqual([SETTING_KEY.destructive, SECRETS_KEY])
  for (const key of STRONG_KEYS) {
    expect(labels(key, prefs([])), key).toEqual(['Off', WARN_UNCHOSEN, 'Stop'])
    expect(labels(key, prefs(STRONG_KEYS.filter(k => k === key))), key).toEqual(['Off', WARN_CHOSEN, 'Stop'])
    // A project that sets the row has chosen it
    expect(labels(key, prefs([], { [key]: 'warn' })), key).toEqual(['Off', WARN_CHOSEN, 'Stop'])
    // Not read yet (a lean load): the old word, never a claim
    expect(labels(key, prefs(undefined)), key).toEqual(['Off', 'Warn', 'Stop'])
  }
  for (const key of [SETTING_KEY.scope, SETTING_KEY.packages, SETTING_KEY.tests]) expect(labels(key, prefs([])), key).toEqual(['Off', 'Warn', 'Stop'])
  expect(WARN_UNCHOSEN).toBe('Warn (stops in auto mode)')
})

test('the label fits a 288 pt pane in English and Swedish: the choices are one row or stacked whole, none wider than the card', () => {
  const inner = 288 - 2 * BORDER_X_PT
  for (const lang of ['en', 'sv']) {
    setLang(lang)
    try {
      for (const key of STRONG_KEYS) {
        for (const p of [prefs([]), prefs([key])]) {
          const options = optionsOf(findSetting(key) as NonNullable<ReturnType<typeof findSetting>>, p)
          for (const line of pickLines(options, inner)) expect(pickWidthPt(line.map(o => o.label)), `${lang} ${key}`).toBeLessThanOrEqual(inner)
          for (const o of options) expect(pickWidthPt([o.label]), `${lang} ${o.label}`).toBeLessThanOrEqual(inner)
        }
      }
      expect(tr(WARN_UNCHOSEN)).toBe(lang === 'sv' ? 'Varna (stopp i autoläge)' : 'Warn (stops in auto mode)')
      expect(tr(WARN_CHOSEN)).toBe(lang === 'sv' ? 'Bara varna' : 'Warn only')
    } finally {
      setLang('en')
    }
  }
})

test('behaviour is as before: an unchosen Warn turns into a stop only where Claude Code would not ask; a chosen Warn never does', async () => {
  const store = new Map<string, unknown>()
  const io = { get: async (k: string) => store.get(k) } as unknown as Io
  const view = (v: 'asks' | 'unasked' | 'unknown') => async () => v
  expect(await strongMode(io, 'guard.destructive', 'warn', view('unasked'))).toBe('hold')
  expect(await strongMode(io, 'guard.destructive', 'warn', view('asks'))).toBe('warn')
  expect(await strongMode(io, 'guard.destructive', 'warn', view('unknown'))).toBe('warn')
  store.set('cockpit:setting:guard.destructive', 'warn')
  expect(await strongMode(io, 'guard.destructive', 'warn', view('unasked'))).toBe('warn')
})
