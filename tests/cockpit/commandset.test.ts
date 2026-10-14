// The command set: the cockpit registers exactly 15 slash commands.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { FOLDED, FRONT_DOOR, HIDDEN } from '../hooks/core/menu'
import { test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const KEPT = ['vaken', 'vaken-help', 'vaken-settings', 'vaken-usage', 'vaken-compact', 'vaken-ship', 'vaken-guard', 'vaken-pause', 'vaken-undo', 'vaken-away', 'vaken-today', 'vaken-resume', 'vaken-explain', 'vaken-tasks', 'vaken-memory']

function world(on: On): { registered: string[] } {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done']])
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
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const registered: string[] = []
  on('command.register', (_$, e) => {
    registered.push(e.name)
    return { value: { command: e.name } }
  })
  return { registered }
}

test('vaken registers exactly 15 commands, the ones in FRONT_DOOR, and no other name', async ($, on) => {
  const w = world(on)
  await $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
  expect([...new Set(w.registered)].sort()).toEqual([...KEPT].sort())
  expect(FRONT_DOOR.slice().sort()).toEqual([...KEPT].sort())
  expect(new Set(w.registered).size).toBe(15)
})

test('a line that names a folded word or a hidden name reaches the function of that word', async ($, on) => {
  world(on)
  await $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
  const said = async (command: string, args = ''): Promise<string> => ((await $.command.run({ command, args } as never)) as { text: string }).text
  expect(await said('vaken-usage', 'why')).toBe('Nothing counted yet. Ask again after the first reply.')
  const diet = await said('vaken-help', 'run diet')
  expect(diet).not.toMatch(/^Commands\n/)
  expect(diet.length).toBeGreaterThan(0)
  for (const [parent, words] of Object.entries(FOLDED)) {
    expect(KEPT).toContain(parent)
    for (const word of words) expect(viaParent(`vaken-${word}`).command).toBe(parent)
  }
  for (const name of HIDDEN) expect(viaParent(`vaken-${name}`)).toEqual({ command: 'vaken-help', args: `run ${name}` })
})

export const _typeCheck = (_$: EngineInterface): void => undefined
