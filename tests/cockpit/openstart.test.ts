// Open at start: the pane opens in every watched session when on, once, and the try is kept for the live check.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'

import { OPEN_START_SETTING, openSeenOf, wantsOpenAtStart } from '../hooks/core/openstart'
import { SETTINGS } from '../hooks/core/settings'

test('open at start is a View setting, on by default, desktop only', () => {
  const s = SETTINGS.find(x => x.key === OPEN_START_SETTING)
  expect(s?.group).toBe('View')
  expect(s?.default).toBe('on')
  expect(s?.desktopOnly).toBe(true)
  expect(s?.options.map(o => o.value)).toEqual(['off', 'on'])
})

test('the pane opens only when on, in a watched session, and not already shown', () => {
  expect(wantsOpenAtStart('on', true, false)).toBe(true)
  expect(wantsOpenAtStart('off', true, false)).toBe(false)
  expect(wantsOpenAtStart('on', false, false)).toBe(false)
  expect(wantsOpenAtStart('on', true, true)).toBe(false)
})

test('the kept try says if the pane was drawn and why not', () => {
  expect(openSeenOf(5, { isPlaced: true })).toEqual({ at: 5, placed: true })
  expect(openSeenOf(5, { isPlaced: false, reason: 'narrow' })).toEqual({ at: 5, placed: false, reason: 'narrow' })
  expect(openSeenOf(5, { isPlaced: false })).toEqual({ at: 5, placed: false, reason: 'unknown' })
})

const settle = async (): Promise<void> => {
  for (let n = 0; n < 400; n += 1) await Promise.resolve()
}

// The desktop app starts the session as the SDK: nothing opens at start, the pane opens when the app joins.
function world(on: On, value: string) {
  mock.clock(on, { now: Date.parse('2026-10-10T12:00:00Z') })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:firstrun': 'done', [`cockpit:setting:${OPEN_START_SETTING}`]: value }))
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
  on('session.id', () => ({ value: 'me' }))
  on('session.root', () => ({ value: '/w/me' }) as never)
  on('session.cwd', () => ({ value: '/w/me' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  const opened: string[] = []
  on('ui.open', (_$, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } } as never
  })
  on('fs.stat', () => ({ value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.attach', (_$, e) => ({ clientId: e.clientId }))
  return { opened }
}

test('in the desktop app the pane opens when the app joins, not at start', async ($, on) => {
  const w = world(on, 'on')
  await $.session.start({ cwd: '/w/me', surface: null, isInteractive: false } as never)
  await settle()
  expect(w.opened).toEqual([])
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  await settle()
  expect(w.opened).toEqual(['cockpit-home'])
})

test('with the setting off the desktop join opens nothing', async ($, on) => {
  const w = world(on, 'off')
  await $.session.start({ cwd: '/w/me', surface: null, isInteractive: false } as never)
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  await settle()
  expect(w.opened).toEqual([])
})
