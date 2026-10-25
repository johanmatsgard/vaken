// A stopped step leaves Needs you when the session moves on (a newer typed message there) or when the person presses Dismiss. Dismiss never lets a step through.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { EngineInterface, On } from 'claude-code'

import { HELD_WHAT as BUDGET_HELD_WHAT } from '../hooks/core/budget'
import { DISMISS_WHAT, allowKey } from '../hooks/core/guard'
import { heldKey } from '../hooks/core/allowonce'
import { flushNotes } from '../hooks/core/flush'
import { buildInbox, heldCount, heldNeedsCount } from '../hooks/core/inbox'
import type { InboxFacts, InboxItem } from '../hooks/core/inbox'
import { tr, setLang } from '../hooks/core/lang'
import { LEDGER_KEY } from '../hooks/features/compaction'
import { DISMISSED_SAID } from '../hooks/features/home/actions'
import { itemRow } from '../hooks/features/home/needs'
import { DISMISS_LABEL, dismissHold } from '../hooks/features/home/rowact'

const MIN = 60_000
const NOW = Date.parse('2026-10-12T09:00:00Z')
const id = (s: string): string => s
const held = (session: string, ago: number, what = 'Held a risky command') => ({ at: NOW - ago, session, what, detail: 'This deletes build.', how: 'auto', did: true })
const facts = (over: Partial<InboxFacts>): InboxFacts => ({
  now: NOW,
  sessions: [
    { sid: 'me', name: 'Docs', here: true },
    { sid: 'web', name: 'Web fixes', here: false },
  ],
  ledger: [],
  allowed: [],
  asks: [],
  debts: [],
  halts: [],
  seen: {},
  ...over,
})

test('a stopped step older than the last typed message of its session is no longer shown or counted', () => {
  const ledger = [held('me', 10 * MIN), held('web', 10 * MIN)] as never
  const before = buildInbox(facts({ ledger }))
  expect(before.filter(x => x.kind === 'hold')).toHaveLength(2)
  expect(heldNeedsCount(before)).toBe(2)
  const moved = buildInbox(facts({ ledger, sessions: [{ sid: 'me', name: 'Docs', here: true, promptAt: NOW - 5 * MIN }, { sid: 'web', name: 'Web fixes', here: false, promptAt: NOW - 2 * MIN }] }))
  expect(moved.filter(x => x.kind === 'hold')).toEqual([])
  expect(heldNeedsCount(moved)).toBe(0)
  expect(heldCount(moved)).toBe(0)
  // A message typed before the stop does not clear it
  const older = buildInbox(facts({ ledger, sessions: [{ sid: 'me', name: 'Docs', here: true, promptAt: NOW - 20 * MIN }] }))
  expect(older.filter(x => x.kind === 'hold').map(x => x.sid)).toEqual(['me'])
})

test('a message in one session leaves the stopped steps of another session listed, and a budget stop is not cleared by it', () => {
  const ledger = [held('me', 10 * MIN), held('web', 10 * MIN), held('web', 10 * MIN, BUDGET_HELD_WHAT)] as never
  const items = buildInbox(facts({ ledger, sessions: [{ sid: 'me', name: 'Docs', here: true }, { sid: 'web', name: 'Web fixes', here: false, promptAt: NOW - MIN }] }))
  expect(items.filter(x => x.kind === 'hold').map(x => x.sid)).toEqual(['me'])
  expect(items.filter(x => x.kind === 'budget').map(x => x.sid)).toEqual(['web'])
})

test('a Dismiss line clears the stopped steps of its session, here and elsewhere, and allows nothing', () => {
  const dismissed = (session: string, ago: number) => ({ at: NOW - ago, session, what: DISMISS_WHAT, detail: 'x', how: 'button', did: true })
  const ledger = [dismissed('web', MIN), dismissed('me', MIN), held('me', 10 * MIN), held('web', 10 * MIN)] as never
  const items = buildInbox(facts({ ledger }))
  expect(items.filter(x => x.kind === 'hold')).toEqual([])
  expect(heldNeedsCount(items)).toBe(0)
  // A step stopped after the Dismiss is listed again
  const later = buildInbox(facts({ ledger: [held('web', MIN / 2), dismissed('web', MIN), held('web', 10 * MIN)] as never }))
  expect(later.filter(x => x.kind === 'hold').map(x => x.sid)).toEqual(['web'])
  expect(later.every(x => !x.allowed)).toBe(true)
})

test('every stopped step offers Dismiss in its open detail: beside Allow once here, alone elsewhere and when old; in Swedish it says Avfärda', () => {
  const [here] = buildInbox(facts({ ledger: [held('me', 3 * MIN)] as never }))
  expect(itemRow(here as InboxItem, 0, NOW, id).inside).toEqual({ label: 'Allow once', action: { kind: 'allowOnce' }, more: [{ label: 'Keep stopped', action: { kind: 'keepStopped' } }, { label: DISMISS_LABEL, action: dismissHold('me') }] })
  const [there] = buildInbox(facts({ ledger: [held('web', 3 * MIN)] as never }))
  expect(itemRow(there as InboxItem, 0, NOW, id).inside).toEqual({ label: 'Dismiss', action: { kind: 'dismissHold', sid: 'web' } })
  const [old] = buildInbox(facts({ ledger: [held('me', 40 * MIN)] as never }))
  expect(itemRow(old as InboxItem, 0, NOW, id).inside).toEqual({ label: 'Dismiss', action: dismissHold('me') })
  setLang('sv')
  try {
    expect(tr('Dismiss')).toBe('Avfärda')
    expect(tr(DISMISSED_SAID)).not.toBe(DISMISSED_SAID)
    expect(tr(DISMISS_WHAT)).toBe('Avfärdade ett stoppat steg')
  } finally {
    setLang('en')
  }
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }

function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
}

function memStore(on: On, seed: Record<string, unknown>): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', ...seed }))
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
  return mem
}

const rec = (sid: string, now: number, over: Record<string, unknown> = {}) => ({ sessionId: sid, cwd: `/work/${sid}`, model: 'm', state: 'working', startedAt: now - 20 * MIN, updatedAt: now - 2000, lastEventAt: now - 2000, stateSince: now - 3 * MIN, ...over })
const world = (now: number) => ({
  'cockpit:firstrun': 'done',
  'cockpit:session:test-session': rec('test-session', now, { cwd: '/work/app', state: 'idle' }),
  'cockpit:session:s1': rec('s1', now),
  [LEDGER_KEY]: [
    { at: now - 2 * MIN, session: 's1', what: 'Held a risky command', detail: 'This deletes y.', how: 'auto', did: true },
    { at: now - 3 * MIN, session: 'test-session', what: 'Held a risky command', detail: 'This deletes x.', how: 'auto', did: true },
  ],
  [heldKey('test-session')]: { at: now - 3 * MIN, step: 'call-1', keys: ['destructive|rm -rf x'], words: 'This deletes x.' },
})
const toastsOf = (on: On): string[] => {
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  return toasts
}
const textOf = async (ui: { find: (q: unknown) => Promise<unknown> }, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
const mountPane = ($: EngineInterface) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
const ledgerOf = (mem: Map<string, unknown>) => (mem.get(LEDGER_KEY) ?? []) as { what: string; session?: string; how?: string }[]

test('Dismiss in the pane clears another session\'s stopped step and this one\'s, writes the ledger line, and allows nothing', { timeoutMs: 15_000 }, async ($, on) => {
  const now = Date.parse('2026-10-10T10:00:00Z')
  const clock = mock.clock(on, { now })
  const mem = memStore(on, world(now))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const ui = await mountPane($)
  expect(await textOf(ui, /^s1$/)).toBe(true)
  await ui.press({ key: 'press-ol-needs:hold-s1-1-0' })
  await clock.settle()
  await ui.redraw()
  await ui.press({ key: 'w-needs:hold-s1-1-set' })
  await clock.settle()
  expect(ledgerOf(mem)[0]).toMatchObject({ what: DISMISS_WHAT, session: 's1', how: 'button' })
  expect(mem.has(allowKey('s1'))).toBe(false)
  expect(toasts).toContain(DISMISSED_SAID)
  await ui.redraw()
  expect(await textOf(ui, /^s1: Stopped a risky command$/)).toBe(false)
  // This session's own rows carry no session name (the card is about this session)
  expect(await textOf(ui, /^Stopped a risky command$/)).toBe(true)
  await ui.press({ key: 'press-ol-needs:hold-test-session-0-0' })
  await clock.settle()
  await ui.redraw()
  await ui.press({ key: 'w-needs:hold-test-session-0-more0' })
  await clock.settle()
  expect(ledgerOf(mem)[0]).toMatchObject({ what: DISMISS_WHAT, session: 'test-session', how: 'button' })
  expect(mem.has(allowKey('test-session'))).toBe(false)
  await ui.redraw()
  expect(await textOf(ui, /^Stopped a risky command$/)).toBe(false)
  await ui.unmount()
})

test('a typed message marks the session\'s record with its time; a slash command does not', { timeoutMs: 15_000 }, async ($, on) => {
  const now = Date.parse('2026-10-10T10:00:00Z')
  mock.clock(on, { now })
  const mem = memStore(on, world(now))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  toastsOf(on)
  const recOf = () => mem.get('cockpit:session:test-session') as { promptAt?: number }
  await $.prompt.submit({ text: '/vaken-guard allow once' } as never).catch(() => undefined)
  await flushNotes()
  expect(recOf().promptAt).toBeUndefined()
  await $.prompt.submit({ text: 'try the cleanup again' } as never).catch(() => undefined)
  await flushNotes()
  expect(recOf().promptAt).toBe(now)
})
