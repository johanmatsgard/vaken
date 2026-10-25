// Auto compaction made safe: the brief is saved before the command is sent, a new answer after the save cancels it.
import { expect, mock } from 'claude-code/testing'
import { posix } from './fspath'
import type { On } from 'claude-code'

import { ASK_WHAT, AUTO_NOTE_WHAT, askNow, briefName, briefPath, lastNote, noteText, noteWords } from '../hooks/core/autosafe'
import { WOULD_WHAT } from '../hooks/core/compactrest'
import { SIZE_LOOK_MS } from '../hooks/core/compactauto'
import { setLang } from '../hooks/core/lang'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const MIN = 60_000
const DAY = 24 * 60 * MIN

const would = (at: number) => ({ at, session: 'a', what: WOULD_WHAT, did: true })

test('the note says what was kept and names the brief, in plain words, Swedish too', () => {
  expect(noteText('brief-ab12cd34.md')).toBe('Compacted the session. Kept: goal, branch, files, decisions, next steps. Brief saved: brief-ab12cd34.md.')
  setLang('sv')
  try {
    expect(noteWords(noteText('brief-ab12cd34.md'), s => (s.startsWith('Compacted') ? 'Kortade chatten. Överlämning sparad: {name}.' : s))).toBe('Kortade chatten. Överlämning sparad: brief-ab12cd34.md.')
  } finally {
    setLang('en')
  }
})

test('the brief goes in vaken folder under HOME, one file per session, never in the project', () => {
  expect(briefName('ab12cd34-9999')).toBe('brief-ab12cd34.md')
  expect(briefPath('/home/test/', 'ab12cd34-9999')).toBe('/home/test/.claude/cockpit/briefs/brief-ab12cd34.md')
})

test('the card shows the last note of this session for a day', () => {
  const e = { at: NOW - 60 * MIN, session: 'me', what: AUTO_NOTE_WHAT, detail: noteText('b.md') }
  expect(lastNote([e], 'me', NOW)).toBe(e)
  expect(lastNote([e], 'other', NOW)).toBeUndefined()
  expect(lastNote([{ ...e, at: NOW - DAY - 1 }], 'me', NOW)).toBeUndefined()
})

test('the ask appears after 3 would-have notes in Watch, only in Watch, and Not now hides it for 14 days', () => {
  const three = [would(NOW - 3 * MIN), would(NOW - 2 * MIN), would(NOW - MIN)]
  expect(askNow(three.slice(0, 2), 'watch', NOW)).toBe(false)
  expect(askNow(three, 'watch', NOW)).toBe(true)
  expect(askNow(three, 'auto', NOW)).toBe(false)
  expect(askNow(three, 'suggest', NOW)).toBe(false)
  const later = { at: NOW - 13 * DAY, what: ASK_WHAT, detail: 'not now' }
  expect(askNow([...three.map(e => ({ ...e, at: e.at - 14 * DAY })), would(NOW - 12 * DAY), would(NOW - 11 * DAY), would(NOW - 10 * DAY), later], 'watch', NOW)).toBe(false)
  expect(askNow([would(NOW - MIN), would(NOW - 2 * MIN), would(NOW - 3 * MIN), { ...later, at: NOW - 15 * DAY }], 'watch', NOW)).toBe(true)
  expect(askNow([...three, { at: NOW, what: ASK_WHAT, detail: 'yes' }], 'watch', NOW + MIN)).toBe(false)
})

function memStore(on: On, start: Record<string, unknown> = {}): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:detail': 'explained', ...start }))
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
  return mem
}

const session = (): Record<string, unknown> => ({
  sessionId: 'test-session',
  cwd: '/work/app',
  model: 'claude-opus-5',
  state: 'idle',
  startedAt: NOW - 90 * MIN,
  updatedAt: NOW,
  lastEventAt: NOW,
  stateSince: NOW - 10 * MIN,
  title: 'fix login',
  branch: 'feat-x',
  contextPercent: 85,
  ctx: { tokens: 200_000, window: 235_000, compactAt: 95 },
  cache: { read: 100, write: 0, fresh: 0, at: NOW + 5 * MIN },
})

type Seen = { events: string[]; writes: { path: string; text: string }[]; compacts: string[]; toasts: string[] }
type Dollar = Parameters<Parameters<typeof test>[1]>[0]

async function drive($: Dollar, on: On, mode: string, midSave?: ($: Dollar) => Promise<void>): Promise<{ mem: Map<string, unknown>; seen: Seen }> {
  const seen: Seen = { events: [], writes: [], compacts: [], toasts: [] }
  const clock = mock.clock(on, { now: NOW })
  const mem = memStore(on, { 'cockpit:session:test-session': session(), 'cockpit:firstrun': 'done', 'cockpit:setting:compact.mode': mode })
  mock.env(on, { HOME: '/home/test' })
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('prompt.read', () => ({ value: { text: '', cursor: 0 } }) as never)
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.complete', (_$, e) => ({ text: (e as { answer?: string }).answer ?? '' }) as never)
  on('turn.start', (_$, e) => ({ turnId: (e as { turnId?: string }).turnId ?? '' }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'feat-x\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', (_$, e) => {
    seen.toasts.push((e as { text?: string }).text ?? '')
    return { value: undefined } as never
  })
  on('fs.write', async (_$, e) => {
    const w = e as unknown as { path: string; text: string }
    seen.writes.push({ path: posix(w.path), text: w.text })
    seen.events.push(`write:${posix(w.path)}`)
    if (posix(w.path).includes('/briefs/') && midSave !== undefined) await midSave($)
    return { value: undefined } as never
  })
  on('session.compact', (_$, e) => {
    seen.events.push('compact')
    seen.compacts.push((e as { instructions?: string }).instructions ?? '')
    return { messages: [{ role: 'user', text: 'summary', toolUses: [] }], tokensBefore: 200_000, tokensAfter: 20_000 } as never
  })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await $.turn.complete({ answer: 'Done.', durationMs: 30_000, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  await clock.advance(SIZE_LOOK_MS + 10_000)
  await clock.settle()
  return { mem, seen }
}

const ledgerOf = (mem: Map<string, unknown>): { what: string; detail?: string }[] => (mem.get('cockpit:ledger:compact') as { what: string; detail?: string }[] | undefined) ?? []

test('Auto saves the brief in vaken folder first, then sends the command naming it, then posts one note', SLOW, async ($, on) => {
  const { mem, seen } = await drive($, on, 'auto')
  const briefAt = seen.events.findIndex(e => e.startsWith('write:/home/test/.claude/cockpit/briefs/'))
  const compactAt = seen.events.indexOf('compact')
  expect(briefAt).toBeGreaterThanOrEqual(0)
  expect(compactAt).toBeGreaterThan(briefAt)
  expect(seen.writes.filter(w => w.path.startsWith('/work/app')).length).toBe(0)
  expect(seen.compacts[0]).toContain('~/.claude/cockpit/briefs/brief-testsess.md')
  const note = noteText('brief-testsess.md')
  expect(ledgerOf(mem).filter(e => e.what === AUTO_NOTE_WHAT).map(e => e.detail)).toEqual([note])
  expect(seen.toasts).toContain(note)
})

test('a new answer that starts while the brief is being saved cancels the compacting', SLOW, async ($, on) => {
  const { mem, seen } = await drive($, on, 'auto', async d => {
    await d.turn.start({ turnId: 't2' } as never)
  })
  expect(seen.events.some(e => e.startsWith('write:/home/test/.claude/cockpit/briefs/'))).toBe(true)
  expect(seen.events).not.toContain('compact')
  expect(ledgerOf(mem).some(e => e.what === 'auto-compact skipped' && e.detail === 'Skipped: a new answer started')).toBe(true)
  expect(ledgerOf(mem).some(e => e.what === AUTO_NOTE_WHAT)).toBe(false)
})

test('Watch and Suggest save and send nothing; Watch only notes the moment', SLOW, async ($, on) => {
  const watch = await drive($, on, 'watch')
  expect(watch.seen.writes.filter(w => w.path.includes('/briefs/')).length).toBe(0)
  expect(watch.seen.events).not.toContain('compact')
  expect(ledgerOf(watch.mem).some(e => e.what === WOULD_WHAT)).toBe(true)
})

test('Suggest writes nothing', SLOW, async ($, on) => {
  const suggest = await drive($, on, 'suggest')
  expect(suggest.seen.writes.map(w => w.path)).toEqual([])
  expect(suggest.seen.events).toEqual([])
  expect(ledgerOf(suggest.mem)).toEqual([])
})

test('the ask-once row shows after 3 would-have notes in Watch; Yes sets Auto, and the row is gone', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = memStore(on, {
    'cockpit:session:test-session': { ...session(), state: 'idle' },
    'cockpit:firstrun': 'done',
    'cockpit:setting:compact.mode': 'watch',
    'cockpit:ledger:compact': [would(NOW - 3 * MIN), would(NOW - 2 * MIN), would(NOW - MIN)],
  })
  mock.env(on, { HOME: '/home/test' })
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await clock.settle()
  const props = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
  const pane = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props })
  expect(await pane.find({ type: 'Text', text: /Vaken can compact the session at good moments/ })).toBeDefined()
  await pane.press({ key: 'ask-shorten-yes' })
  await clock.settle()
  expect(mem.get('cockpit:setting:compact.mode')).toBe('auto')
  expect(ledgerOf(mem).some(e => e.what === ASK_WHAT && e.detail === 'yes')).toBe(true)
  await pane.unmount()
})
