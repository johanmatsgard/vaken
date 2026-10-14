// The programs started in a quiet stretch with the pane open, counted through the engine's process.run.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { forgetProjectSet } from '../hooks/core/io'
import { forgetPreview } from '../hooks/features/home/preview'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000
const WINDOW_MIN = 3
export const QUIET_PROGRAMS_PER_MINUTE = 8
const SLOW = { timeoutMs: 60_000 }

export function sourceOf(argv: readonly string[]): string {
  const [a, b] = argv
  const line = argv.join(' ')
  if (a === 'sysctl' || a === 'vm_stat' || a === 'pmset' || (a === 'ps' && /rss/.test(line))) return 'computer reading'
  if (a === 'lsof' && /-iTCP:[\d,]+/.test(line)) return 'Preview card (dev server)'
  if (a === 'curl') return 'Preview card (dev server)'
  if (a === 'lsof') return 'ports (crew3)'
  if (a === 'ps' || a === 'caffeinate') return 'keep awake / processes'
  if (a === 'gh' || (a === 'which' && b === 'gh')) return 'pull request clock'
  if (a === 'git') return 'git'
  return `other (${a})`
}

function engine(on: On, runs: string[], seed: Record<string, unknown>) {
  const mem = new Map<string, unknown>(Object.entries(seed))
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('fs.write', () => ({ value: undefined }) as never)
  on('fs.exists', () => ({ value: false }) as never)
  on('agent.list', () => ({ value: [{ id: 'a1', status: 'running' }, { id: 'a2', status: 'running' }] }) as never)
  on('mcp.call', () => ({ value: { content: [{ type: 'text', text: 'not offered here' }], isError: true } }) as never)
  on('process.run', (_$, e) => {
    const argv = (e as { argv: string[] }).argv
    runs.push(argv.join(' '))
    const line = argv.join(' ')
    const done = (exitCode: number, stdout: string) => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never
    if (argv[0] === 'lsof' && /5173/.test(line)) return done(0, 'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nnode    42424 me   23u  IPv6 0x1      0t0  TCP *:5173 (LISTEN)\n')
    if (argv[0] === 'lsof') return done(1, '')
    if (argv[0] === 'curl') return done(0, '<html><body>Hello</body></html>\n200 0.02')
    if (argv[0] === 'git' && argv[1] === 'rev-parse') return done(0, 'feat-x\n')
    if (argv[0] === 'sysctl') return done(0, argv.slice(1).map(n => `${n}: ${n.includes('pressure') ? '1' : n.includes('swap') ? 'total = 2048.00M  used = 1024.50M  free = 1023.50M' : n.includes('load') ? '{ 1.00 1.00 1.00 }' : '8'}`).join('\n'))
    if (argv[0] === 'which') return done(0, '/usr/bin/x\n')
    return done(1, '')
  })
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
}

const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })

test(`a quiet minute with the pane open and two helpers running starts at most ${QUIET_PROGRAMS_PER_MINUTE} programs (by source in the table)`, SLOW, async ($, on) => {
  forgetPreview()
  forgetProjectSet()
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const runs: string[] = []
  engine(on, runs, {
    'cockpit:firstrun': 'done',
    'cockpit:setting:laptop.mode': 'on',
    'cockpit:setting:awake.mode': 'on',
    'cockpit:setting:cards.preview': 'show',
    'cockpit:setting:cards.setup': 'show',
    'cockpit:session:test-session': rec('test-session', { cwd: '/work/app', branch: 'feat-x', title: 'Fix login' }),
    'cockpit:session:s1': rec('s1', { state: 'idle' }),
  })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: { title: 'Vaken', isFocused: false, bodyColumns: 140, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} } })) as unknown as { redraw: () => Promise<void>; unmount: () => Promise<void> }
  await clock.settle()
  for (let n = 0; n < 12; n += 1) {
    await clock.advance(10_000)
    await ui.redraw()
  }
  const before = runs.length
  for (let n = 0; n < WINDOW_MIN * 6; n += 1) {
    await clock.advance(10_000)
    await ui.redraw()
  }
  await clock.settle()
  const counted = runs.slice(before)
  await ui.unmount()
  const by: Record<string, number> = {}
  for (const r of counted) by[sourceOf(r.split(' '))] = (by[sourceOf(r.split(' '))] ?? 0) + 1
  for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log(`quiet: | ${k} | ${Math.round((v / WINDOW_MIN) * 10) / 10} per minute`)
  console.log(`quiet: | total | ${Math.round((counted.length / WINDOW_MIN) * 10) / 10} per minute`)
  expect(counted.length / WINDOW_MIN, `programs per quiet minute, by source: ${JSON.stringify(by)}`).toBeLessThanOrEqual(QUIET_PROGRAMS_PER_MINUTE)
})
