import { expect } from 'claude-code/testing'
import { test } from './slow'

import { emptyState, recordEdit, recordReceipts } from '../hooks/core/proof'
import { lineCard } from '../hooks/features/home/linecards'
import type { CardCtx } from '../hooks/features/home/linecards'

const sectionLabel = async (ui: { find: (q: unknown) => Promise<unknown>; findAll: (q: unknown) => Promise<unknown[]> }, re: RegExp): Promise<unknown> =>
  (await ui.find({ type: 'Text', text: re })) ?? ((await ui.findAll({ type: 'Svg' })) as { props: { alt?: string } }[]).find(x => re.test(x.props.alt ?? ''))

const NOW = new Date(2026, 9, 10, 14, 0).getTime()
const ctx = (over: Partial<CardCtx> = {}): CardCtx => ({ now: NOW, ledger: [], halted: false, modes: {}, ...over })

test('the Proof card says nothing yet, then the checks and what waits', () => {
  expect(lineCard('proof', ctx()).short).toBe('Nothing yet')
  let s = emptyState()
  s = recordEdit(s, '/a.ts')
  s = recordReceipts(s, [{ kind: 'tests', ok: true }], NOW)
  s = { ...s, turns: 1, debt: 2, goal: { text: 'Fix the login', setAt: NOW, how: 'typed' } }
  const v = lineCard('proof', ctx({ proof: s }))
  expect(v.lines).toContain('Goal: Fix the login')
  expect(v.lines).toContain('Tests passed')
  expect(v.lines.join('\n')).toMatch(/2 finished answers changed files/)
  expect(v.short).toMatch(/2 to review/)
})

test('the Guard card keeps how strict each rule is; the counts and the halt are the Safety card\'s', () => {
  const e = (what: string, at = NOW - 60_000) => ({ at, what, did: true })
  const v = lineCard('guard', ctx({ halted: true, ledger: [e('Held a risky command'), e('Warned about a package install')] }))
  expect(v.short).toBe('All warn')
  expect(v.groups?.map(g => g.head)).toEqual(['Rules'])
  expect(v.lines).toEqual(['Rules: warn.'])
  expect(v.whats.length).toBe(v.lines.length)
  expect(v.whats.at(-1)?.setting).toBe('guard.destructive')
  expect(lineCard('guard', ctx({ modes: { 'guard.destructive': 'hold' } })).lines.at(-1)).toMatch(/commands stop, edits warn/)
  expect(lineCard('guard', ctx({ modes: { 'guard.destructive': 'hold' } })).short).toBe('Mixed')
})

test('the Safety card counts what was stopped and warned today, and shows a halt', () => {
  const e = (what: string, at = NOW - 60_000) => ({ at, what, did: true })
  const v = lineCard('safety', ctx({ ledger: [e('Held a risky command'), e('Warned about a package install'), e('Warned about a weakened test'), e('Held a risky command', NOW - 3 * 24 * 3_600_000), e('Kept the cache warm')] }))
  expect(v.short).toBe('1 step stopped today')
  const today = v.groups?.find(g => g.head === 'Risky steps today')
  expect(today?.rows).toMatchObject([{ key: 'stopped', right: '1 step' }, { key: 'warned', right: '2 steps' }])
  expect(v.whats.length).toBe(v.lines.length)
  expect(lineCard('safety', ctx()).short).toBe('All clear')
  expect(lineCard('safety', ctx({ halted: true })).short).toBe('Paused for safety')
})

import { mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { setLang } from '../hooks/core/lang'

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }

function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}

test('the pane draws the Proof and Guard cards from the stored state', { timeoutMs: 15_000 }, async ($, on) => {
  let s = recordEdit(emptyState(), '/a.ts')
  s = recordReceipts(s, [{ kind: 'tests', ok: true }], NOW)
  s = { ...s, turns: 1, debt: 1, goal: { text: 'Fix the login', setAt: NOW, how: 'typed' } }
  mock.clock(on, { now: NOW })
  mock.store(on, {
    'cockpit:setting:look.view': 'custom',
    'cockpit:setting:detail': 'explained',
    'cockpit:proof:test-session': s,
    'cockpit:halt:test-session': { at: NOW },
    // The Guard card is calm (only its rules are left), so it shows its Short look unless it is set to Full.
    'cockpit:setting:detail.guard': 'explained',
    'cockpit:ledger:compact': [{ at: NOW - 60_000, what: 'Held a risky command', did: true }],
    'cockpit:session:test-session': { sessionId: 'test-session', cwd: '/work/app', model: 'm', state: 'idle', startedAt: NOW - 1000, updatedAt: NOW, lastEventAt: NOW, stateSince: NOW },
  })
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'vaken', surface, component: 'Pane', requestId: 'cockpit-home', props: { ...paneProps, bodyColumns: 120 } })
    expect(await ui.find({ type: 'Text', text: /^Checks$/ })).toBeDefined()
    expect(await sectionLabel(ui, /^Goal$/)).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /^Fix the login$/ })).toBeDefined()
    expect(await sectionLabel(ui, /^Checks after the last change$/)).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /^Tests$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^passed$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Risky steps$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Safety$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Paused for safety$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^1 step$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^How strict$/ })).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: { ...paneProps, bodyColumns: 120 } })
  await ui.press({ key: 'press-ol-guard:rules-0' })
  await ui.unmount()
  const open = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: { ...paneProps, bodyColumns: 120 } })
  expect(await open.find({ type: 'Text', text: /^Commands: warn\.$/ })).toBeDefined()
  await open.unmount()
  setLang('en')
})
