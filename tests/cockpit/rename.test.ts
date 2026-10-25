// The product is called vaken.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { FOLDED, FRONT_DOOR, HIDDEN } from '../hooks/core/menu'
import { PANE_TITLE } from '../hooks/features/home/prefs'
import { helpText } from '../hooks/features/home/commands'
import { TABLE } from '../hooks/i18n/table'
import { test } from './slow'

const OLD = /cockpit/i

const FILE_NAME_ROWS = new Set(['explain.the_cockpit_wrote_a_file_claude', 'common.do_the_steps_in_this_order', 'find.old_name', 'cmdd.too_many_exports_are_in_the_claude', 'cmdd.too_many_exports_are_in_the_claude_2'])

const clean = (text: string): string => text.replace(/(~\/)?\.claude\/cockpit(-[a-z]+\*?(-\d+)?(\.md|\/))?/g, '').replace(/cockpit-[a-z]+(-\d+)?\.md/g, '')
const bad = (text: string): boolean => OLD.test(clean(text))

test('no English or Swedish row names the old product', () => {
  const found = Object.entries(TABLE)
    .filter(([name, row]) => (!FILE_NAME_ROWS.has(name) && (OLD.test(row.en) || OLD.test(row.sv ?? ''))) || (FILE_NAME_ROWS.has(name) && (bad(row.en) || bad(row.sv ?? ''))))
    .map(([name]) => name)
  expect(found).toEqual([])
})

test('the 15 commands, their folded words and the hidden names use the new name', () => {
  expect(FRONT_DOOR.every(c => c === 'vaken' || c.startsWith('vaken-'))).toBe(true)
  expect([...FRONT_DOOR, ...Object.keys(FOLDED), ...Object.values(FOLDED).flat(), ...HIDDEN].filter(c => OLD.test(c))).toEqual([])
})

test('the pane title and the help page use the new name', () => {
  expect(PANE_TITLE).toBe('Vaken')
  expect(bad(helpText('all') + helpText(''))).toBe(false)
})

test('a registered command has a name, a description and a hint without the old name', async ($, on) => {
  const seen: string[] = []
  mock.clock(on, { now: Date.parse('2026-10-10T12:00:00Z') })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done']])
  const o = on as On
  o('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  o('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  o('store.delete', () => ({ value: undefined }) as never)
  o('store.keys', () => ({ value: [...mem.keys()] }) as never)
  mock.session(on)
  o('session.id', () => ({ value: 'me' }))
  o('session.root', () => ({ value: '/w/me' }) as never)
  o('session.cwd', () => ({ value: '/w/me' }) as never)
  o('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  o('ui.toast', () => ({ value: undefined }) as never)
  o('ui.invalidate', () => ({ value: undefined }))
  o('ui.panes', () => ({ value: [] }) as never)
  o('session.start', (_$, e) => ({ cwd: e.cwd }))
  o('command.register', (_$, e) => {
    seen.push(`${e.name} ${e.description ?? ''} ${(e as { argumentHint?: string }).argumentHint ?? ''}`)
    return { value: { command: e.name } }
  })
  o('tool.register', (_$, e) => {
    seen.push(`${e.name} ${e.description ?? ''}`)
    return { value: { tool: e.name } } as never
  })
  await $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
  expect(seen.length).toBeGreaterThanOrEqual(15)
  expect(seen.filter(s => bad(s))).toEqual([])
})

