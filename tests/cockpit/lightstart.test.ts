// The start: a fresh store reads as Recommended (the modes sorted by cost: every free helper on, nothing extra sent to Claude).
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { modeNow } from '../hooks/core/presets'
import { defaults, readSettings } from '../hooks/core/settings'
import type { Io } from '../hooks/core/io'
import { tellsCompact } from '../hooks/core/tellclaude'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-12T12:00:00Z')
const SID = 'light-session'

const memIo = (seed: Record<string, unknown> = {}): Io => {
  const mem = new Map<string, unknown>(Object.entries(seed))
  return {
    now: async () => NOW,
    home: async () => '/home/user',
    sessionId: async () => SID,
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    ask: async () => undefined,
    complete: async () => ({ text: '' }),
    toast: () => undefined,
    invalidate: () => undefined,
  } as unknown as Io
}

test('a fresh store reads as Recommended: every free helper is on, and nothing that sends Claude extra text', async () => {
  const values = await readSettings(memIo())
  expect(values).toEqual(defaults())
  expect(modeNow(values)).toBe('balanced')
  for (const k of ['value.weekly', 'today.brief', 'neighbors.warn', 'heartbeat.mode', 'recap.mode', 'happened.mode', 'proof.claims', 'proof.done', 'proof.drift', 'proof.anomaly', 'coach.mode', 'decisions.mode', 'diet.mode', 'preview.auto', 'resume.mode', 'fresh.nudge', 'plan.first', 'prompt.check']) expect(values[k], k).not.toBe('off')
  // The budget is Off until the person picks one (the start's Spending question or Settings): the cost is always on the card
  expect(values['cost.budget']).toBe('off')
  expect([values['prompt.check'], values['plan.first'], values['resume.mode'], values['route.mode'], values['assume.check']]).toEqual(['tip', 'suggest', 'remind', 'suggest', 'off'])
  expect([values['look.view'], values['compact.mode'], values['compact.card'], values['guard.destructive'], values['guard.secrets'], values['claude.notes'], values['undo.mode']]).toEqual(['standard', 'watch', 'on', 'warn', 'warn', 'safety', 'on'])
})

test('a store with values of its own keeps them: only the defaults moved', async () => {
  const seed = { 'cockpit:setting:value.weekly': 'on', 'cockpit:setting:proof.claims': 'warn', 'cockpit:setting:cost.budget': 'warn', 'cockpit:setting:plan.first': 'suggest', 'cockpit:setting:compact.mode': 'suggest' }
  const values = await readSettings(memIo(seed))
  expect([values['value.weekly'], values['proof.claims'], values['cost.budget'], values['plan.first'], values['compact.mode']]).toEqual(['on', 'warn', 'warn', 'suggest', 'suggest'])
  expect(await tellsCompact(memIo(seed))).toBe(true)
  expect(await tellsCompact(memIo({ 'cockpit:setting:compact.mode': 'auto' }))).toBe(true)
  // Watch only is the default, so a fresh store sends Claude nothing; Auto tells Claude when the window fills (once, at the crossing)
  expect(await tellsCompact(memIo())).toBe(false)
  expect(await tellsCompact(memIo({ 'cockpit:setting:compact.mode': 'watch' }))).toBe(false)
  expect(await tellsCompact(memIo({ 'cockpit:setting:compact.mode': 'watch', 'cockpit:setting:claude.notes': 'all' }))).toBe(false)
  expect(await tellsCompact(memIo({ 'cockpit:setting:claude.notes': 'all' }))).toBe(false)
  expect(await tellsCompact(memIo({ 'cockpit:setting:compact.mode': 'off' }))).toBe(false)
})

// ---- through the engine

const rec = (over: Record<string, unknown> = {}) => ({ sessionId: SID, cwd: '/home/user/app', model: 'm', state: 'working', title: 'x', startedAt: NOW - 60 * 60_000, updatedAt: NOW - 1000, lastEventAt: NOW - 1000, stateSince: NOW - 60_000, contextPercent: 42, ctx: { tokens: 84_000 }, cache: { at: NOW - 10_000 }, ...over })

function engine(on: On, seed: Record<string, unknown>, host: { decision: string; mode?: string } = { decision: 'ask', mode: 'default' }): Map<string, unknown> {
  mock.clock(on, { now: NOW })
  const mem = new Map<string, unknown>(Object.entries(seed))
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
  mock.env(on, { HOME: '/home/user' })
  on('session.id', () => ({ value: SID }))
  on('session.cwd', () => ({ value: '/home/user/app' }))
  on('session.root', () => ({ value: '/home/user/app' }))
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('tool.call', { tool: /^(?:Bash|Read)$/ }, () => ({ result: { stdout: '', stderr: '', code: 0 }, text: 'done' }) as never)
  on('tool.check', () => ({ decision: host.decision }) as never)
  on('settings.read', () => ({ value: host.mode === undefined ? {} : { permissions: { defaultMode: host.mode } } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  return mem
}

const READ = { tool: 'Read', file_path: '/home/user/app/a.ts' } as const
const noted = (r: unknown): boolean => /Context is \d+% full/.test(JSON.stringify(r))

test('past the Compact from line (60%) of a big session, a store on Auto sends Claude one note; Watch only (the default) and Off send none', SLOW, async ($, on) => {
  const mem = engine(on, { [`cockpit:session:${SID}`]: rec({ contextPercent: 62, ctx: { tokens: 620_000 } }) })
  mem.set('cockpit:setting:compact.mode', 'watch')
  expect(noted(await $.tool.call(READ))).toBe(false)
  mem.set('cockpit:setting:compact.mode', 'off')
  expect(noted(await $.tool.call(READ))).toBe(false)
  expect(mem.get(`cockpit:compact:nudge:${SID}`)).not.toBe(true)
  mem.delete('cockpit:setting:compact.mode')
  expect(noted(await $.tool.call(READ))).toBe(false)
  mem.set('cockpit:setting:compact.mode', 'auto')
  expect(noted(await $.tool.call(READ))).toBe(true)
  expect(noted(await $.tool.call(READ))).toBe(false)
})

const PUSH = { tool: 'Bash', command: 'git push --force origin main' } as const
const denied = (r: unknown): boolean => /"deny":/.test(JSON.stringify(r)) || /"isError":true/.test(JSON.stringify(r))

test('a fresh store in bypass permissions: a risky command stops, and still stops after picking a mode', SLOW, async ($, on) => {
  const mem = engine(on, {}, { decision: 'allow', mode: 'bypassPermissions' })
  expect(denied(await $.tool.call(PUSH))).toBe(true)
  for (const name of ['balanced', 'full', 'everything', 'quiet']) {
    await $.command.run({ ...viaParent('vaken-settings', `preset ${name} yes`), origin: { kind: 'composer' } } as never)
    expect(mem.has('cockpit:setting:guard.destructive'), name).toBe(false)
    expect(denied(await $.tool.call(PUSH)), name).toBe(true)
  }
  await $.command.run({ command: 'vaken-settings', args: 'guard.destructive warn', origin: { kind: 'composer' } } as never)
  expect(mem.get('cockpit:setting:guard.destructive')).toBe('warn')
  expect(denied(await $.tool.call(PUSH))).toBe(false)
})
