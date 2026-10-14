// Act from the pane: Needs you shows all that waits.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { VIEW_STRINGS } from '../hooks/core/lang'
import type { InboxItem } from '../hooks/core/inbox'
import { emptyState, stateKey } from '../hooks/core/proof'
import { allowKey, ALLOW_SET_WHAT } from '../hooks/core/guard'
import { heldKey } from '../hooks/core/allowonce'
import { indexKey, markKey } from '../hooks/core/undo'
import { LEDGER_KEY } from '../hooks/features/compaction'
import { ALLOWED_SAID, ALLOW_NONE } from '../hooks/features/home/actions'
import { lineCard } from '../hooks/features/home/linecards'
import type { CardCtx } from '../hooks/features/home/linecards'
import { ELSEWHERE_NEXT, NEEDS_WORDS, needsGroups } from '../hooks/features/home/needs'
import { ALLOW_ONCE, ROW_ACT_WORDS, UNDO_LAST, UNDO_SAID, checkClaims, fixCheck, promptOf } from '../hooks/features/home/rowact'

const MIN = 60_000
const id = (s: string): string => s

test('a row action is a small typed value: each prompt and command is made from it, never taken from the row', () => {
  const fix = fixCheck('tests')
  expect(fix).toEqual({ kind: 'prompt', prompt: { ask: 'fix', check: 'tests' } })
  if (fix.kind !== 'prompt') throw new Error('not a prompt')
  expect(promptOf(fix.prompt)).toEqual({ text: 'The tests failed after the last change. Run the tests again, find why, fix it, and show me the result.', said: 'The fix prompt is in the prompt box. Press Enter to send it.' })
  const types = fixCheck('types')
  if (types.kind !== 'prompt') throw new Error('not a prompt')
  expect(promptOf(types.prompt).text).toMatch(/^The type check failed after the last change\. Run the type check again/)
  expect(promptOf(types.prompt).said).toBe('The fix prompt is in the prompt box. Press Enter to send it.')
  const claims = checkClaims(2)
  if (claims.kind !== 'prompt') throw new Error('not a prompt')
  expect(promptOf(claims.prompt)).toEqual({ text: 'Your last answer says 2 things are done with no check behind them. Run the checks that prove them, and show me the results.', said: 'Asked Claude to check its claims' })
  const one = checkClaims(1)
  if (one.kind !== 'prompt') throw new Error('not a prompt')
  expect(promptOf(one.prompt).text).toMatch(/^Your last answer says one thing is done with no check behind it\./)
  expect(UNDO_LAST).toEqual({ kind: 'undoLast' })
  expect(ALLOW_ONCE).toEqual({ kind: 'allowOnce' })
})

test('every word of the rows and the toasts is a view string with a Swedish line', () => {
  const words = [...NEEDS_WORDS, ...ROW_ACT_WORDS, ALLOWED_SAID, ALLOW_NONE, 'Fix', 'Check', 'Preview undo (1 file)', 'Preview undo ({n} files)', 'Type this in the chat box:', 'Nothing changes before you type it.']
  expect(words.filter(w => !VIEW_STRINGS.includes(w))).toEqual([])
  expect(words.filter(w => (SV[w] ?? '') === '')).toEqual([])
})

const NOW0 = Date.parse('2026-10-10T09:00:00Z')
const item = (over: Partial<InboxItem>): InboxItem => ({ id: 'x', kind: 'hold', sid: 'me', name: 'app', here: true, what: 'Held a risky command (2 times). This deletes x.', since: NOW0 - 3 * MIN, approx: false, todo: 'Type /vaken-guard allow once in that session, or leave it stopped.', count: 2, allowed: false, ...over })

test('Needs you groups the inbox by kind in its order; only this session\'s stopped step presses, another session\'s says to allow it there', () => {
  const items = [
    item({ kind: 'question', sid: 'q' }),
    item({}),
    item({ sid: 'other', name: 'web', here: false, since: NOW0 - 2 * MIN }),
    item({ kind: 'halt', sid: 'other', name: 'web', here: false, what: 'Halted. Every step that changes things is stopped.', todo: 'Type /vaken-pause off in that session when you are ready.' }),
    item({ kind: 'halt', sid: 'me', name: 'app', here: true, what: 'Halted. Every step that changes things is stopped.', todo: 'Type /vaken-pause off in that session when you are ready.' }),
    item({ kind: 'review', sid: 'me', what: '2 finished answers changed files and wait for your look.', since: undefined, approx: true, todo: 'Look at the changes, then type /vaken-ship reviewed in that session.' }),
  ]
  const groups = needsGroups(items, NOW0, id)
  expect(groups.map(g => g.head)).toEqual(['Stopped steps', 'Paused for safety', 'Changes to look at'])
  expect(groups[1]?.rows).toHaveLength(1)
  const [mine, theirs] = groups[0]?.rows ?? []
  expect(mine).toMatchObject({ title: 'app: Stopped a risky command', right: '3 min ago', inside: { label: 'Allow once', action: { kind: 'allowOnce' } } })
  expect(mine?.action).toBeUndefined()
  expect(mine?.what.means).toContain('This deletes x.')
  expect(theirs?.title).toBe('web: Stopped a risky command')
  expect(theirs?.action).toBeUndefined()
  expect(theirs?.right).toBe('2 min ago')
  expect(theirs?.what.next?.startsWith(ELSEWHERE_NEXT)).toBe(true)
  expect(groups[1]?.rows[0]).toMatchObject({ title: 'web: Halted', what: { next: 'Type /vaken-pause off in that session when you are ready.' } })
  expect(groups[2]?.rows[0]?.right).toBeUndefined()
  const allowed = needsGroups([item({ allowed: true })], NOW0, id)
  expect(allowed.map(g => g.head)).toEqual(['Stopped steps'])
  expect(allowed[0]?.rows[0]).toMatchObject({ right: 'allowed' })
  expect(allowed[0]?.rows[0]?.action).toBeUndefined()
})

test('Proof: a failed check presses as Fix and claims with no check as Check; Guard: only how strict the rules are', () => {
  const proof = { ...emptyState(), seq: 3, lastEditSeq: 1, turns: 1, receipts: [{ kind: 'tests' as const, ok: false, at: NOW0 - MIN, seq: 2 }, { kind: 'lint' as const, ok: true, at: NOW0 - MIN, seq: 3 }], last: { at: NOW0, seconds: 1, edits: 1, files: 1, ran: [], claims: ['tests' as const], unproven: [{ kind: 'tests' as const, why: 'failed' as const }], notChecked: [], doneSet: [] } }
  const ctx: CardCtx = { now: NOW0, ledger: [], proof, halted: false, modes: {} }
  const rows = (lineCard('proof', ctx).groups ?? []).flatMap(g => g.rows)
  expect(rows.find(r => r.key === 'check-tests')).toMatchObject({ right: 'failed · Fix', action: fixCheck('tests') })
  expect(rows.find(r => r.key === 'check-lint')?.action).toBeUndefined()
  expect(rows.find(r => r.key === 'unproven')).toMatchObject({ right: '1 claim · Check', action: checkClaims(1) })
  const guard = lineCard('guard', ctx).groups ?? []
  expect(guard.map(g => g.head)).toEqual(['Rules'])
  expect(guard.flatMap(g => g.rows.map(r => r.action))).toEqual([undefined])
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
  [stateKey('test-session')]: { ...emptyState(), seq: 2, lastEditSeq: 1, turns: 1, receipts: [{ kind: 'tests', ok: false, at: now - MIN, seq: 2 }], last: { at: now - MIN, seconds: 1, edits: 1, files: 1, ran: [], claims: ['tests'], unproven: [{ kind: 'tests', why: 'failed' }], notChecked: [], doneSet: [] } },
  [markKey('test-session')]: now - 10 * MIN,
  [indexKey('test-session')]: { next: 3, snaps: [1, 2].map(n => ({ id: n, path: `/work/app/f${n}.ts`, at: now - 5 * MIN, tool: 'Edit', kind: 'saved', hash: 'h', bytes: 1, lines: 1 })) },
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
async function openCards(ui: { press: (q: { key: string }) => Promise<unknown>; redraw: () => Promise<unknown> }, ids: string[]) {
  for (const id of ids) await ui.press({ key: `press-glance-${id}-0` })
  await ui.redraw()
}
const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })

test('Needs you shows the stopped steps of every session, grouped (the undo row is the Safety card\'s); this session\'s step is allowed once by a press, bound to it', { timeoutMs: 15_000 }, async ($, on) => {
  const now = Date.parse('2026-10-10T10:00:00Z')
  const clock = mock.clock(on, { now })
  const mem = memStore(on, world(now))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const ui = await mountPane($)
  await openCards(ui, ['safety'])
  expect(await textOf(ui, /^Needs you$/)).toBe(true)
  expect(await textOf(ui, /^Stopped steps$/)).toBe(false)
  expect(await textOf(ui, /^If an edit went wrong$/)).toBe(false)
  expect(await textOf(ui, /^Preview undo \(2 files\)$/)).toBe(true)
  expect(await textOf(ui, /^Undo last answer$/)).toBe(false)
  expect(await textOf(ui, /^app: Stopped a risky command$/)).toBe(true)
  expect(await textOf(ui, /^s1: Stopped a risky command$/)).toBe(true)
  await ui.press({ key: 'press-ol-needs:hold-s1-1-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^What you can do: Open that session; its pane has Allow once\.$/)).toBe(true)
  expect(mem.has(allowKey('s1'))).toBe(false)
  await ui.press({ key: 'press-ol-needs:hold-test-session-0-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /This deletes x\./)).toBe(true)
  expect(mem.has(allowKey('test-session'))).toBe(false)
  await ui.press({ key: 'w-needs:hold-test-session-0-set' })
  await clock.settle()
  expect(mem.get(allowKey('test-session'))).toEqual({ at: now, keys: ['destructive|rm -rf x'] })
  expect((mem.get(LEDGER_KEY) as { what: string; how?: string }[])[0]).toMatchObject({ what: ALLOW_SET_WHAT, how: 'button' })
  expect(toasts).toContain(ALLOWED_SAID)
  await ui.redraw()
  expect(await textOf(ui, /^allowed$/)).toBe(true)
  await ui.unmount()
})

test('with the held note gone (older than 30 minutes) the press allows nothing and says so', { timeoutMs: 15_000 }, async ($, on) => {
  const now = Date.parse('2026-10-10T11:00:00Z')
  const clock = mock.clock(on, { now })
  const seed: Record<string, unknown> = world(now)
  delete seed[heldKey('test-session')]
  const mem = memStore(on, seed)
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const ui = await mountPane($)
  await ui.press({ key: 'press-ol-needs:hold-test-session-0-0' })
  await clock.settle()
  await ui.redraw()
  await ui.press({ key: 'w-needs:hold-test-session-0-set' })
  await clock.settle()
  expect(mem.has(allowKey('test-session'))).toBe(false)
  expect(toasts).toContain(ALLOW_NONE)
  await ui.unmount()
})

test('Fix puts a short prompt in the prompt box (nothing sent, a second press adds nothing) and Check sends one to Claude in this session; Undo last answer shows the preview of /vaken-undo last under it; each says so in a toast', { timeoutMs: 15_000 }, async ($, on) => {
  const now = Date.parse('2026-10-10T12:00:00Z')
  const clock = mock.clock(on, { now })
  const mem = memStore(on, world(now))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const sent: string[] = []
  on('prompt.submit', (_$, e) => {
    sent.push((e as { text: string }).text)
    return e as never
  })
  const filled: string[] = []
  const box = { text: '' }
  on('prompt.fill', (_$, e) => {
    filled.push((e as { text: string }).text)
    box.text += (e as { text: string }).text
    return { isFilled: true } as never
  })
  on('prompt.read', () => ({ value: { text: box.text, cursor: box.text.length } }) as never)
  // The engine skips a plugin's own hooks for a command it runs itself, so the row must not go through $.command.run.
  const ran: string[] = []
  on('command.run', { command: 'vaken-undo' }, (_$, e) => {
    ran.push(e.args)
    return { text: '' }
  })
  const ui = await mountPane($)
  await openCards(ui, ['proof', 'safety'])
  expect(await textOf(ui, /^failed · Fix$/)).toBe(true)
  expect(await textOf(ui, /^1 claim · Check$/)).toBe(true)
  await ui.press({ key: 'press-ol-proof:check-tests-0' })
  await clock.settle()
  await ui.press({ key: 'press-ol-proof:check-tests-0' })
  await clock.settle()
  expect(sent).toEqual([])
  expect(filled).toEqual([promptOf({ ask: 'fix', check: 'tests' }).text])
  expect(toasts).toContain('The fix prompt is in the prompt box. Press Enter to send it.')
  await ui.press({ key: 'press-ol-proof:unproven-0' })
  await clock.settle()
  expect(sent).toEqual([promptOf({ ask: 'claims', n: 1 }).text])
  expect(toasts).toContain('Asked Claude to check its claims')
  await ui.press({ key: 'press-ol-safety:undo-last-0' })
  await clock.settle()
  await ui.redraw()
  expect(ran).toEqual([])
  expect(await textOf(ui, /^Type this in the chat box:$/)).toBe(true)
  expect(await textOf(ui, /^\/vaken-undo last yes$/)).toBe(true)
  expect(toasts).toContain(UNDO_SAID)
  expect(mem.get('cockpit:undo:pending:test-session')).toMatchObject({ kind: 'last', at: now })
  expect(await textOf(ui, /^Preview of undoing the edits since your last message\.$/)).toBe(true)
  expect(await textOf(ui, /^What you can do: Nothing changes before you type it\.$/)).toBe(true)
  await ui.press({ key: 'press-ol-safety:undo-last-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Preview of undoing/)).toBe(false)
  await ui.press({ key: 'press-ol-proof:look-0' })
  await clock.settle()
  expect(sent.length).toBe(1)
  expect(filled.length).toBe(1)
  await ui.unmount()
})

test('a prompt the engine refuses says what to type instead', { timeoutMs: 15_000 }, async ($, on) => {
  const now = Date.parse('2026-10-10T13:00:00Z')
  const clock = mock.clock(on, { now })
  memStore(on, world(now))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  on('prompt.submit', () => {
    throw new Error('refused')
  })
  const ui = await mountPane($)
  await openCards(ui, ['proof'])
  await ui.press({ key: 'press-ol-proof:unproven-0' })
  await clock.settle()
  expect(toasts).toContain('Could not ask Claude from here. Type it in the session.')
  await ui.unmount()
})

import { buildInbox } from '../hooks/core/inbox'
import { STOPPED_OLD, canAllowHere, endSentence, itemRow } from '../hooks/features/home/needs'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const holdFacts = (ageMin: number, detail: string | undefined, now: number) => ({
  now,
  sessions: [{ sid: 'me', name: 'app', here: true }],
  ledger: [{ at: now - ageMin * MIN, session: 'me', what: 'Held a risky command', ...(detail === undefined ? {} : { detail }), how: 'auto', did: true }],
  allowed: [],
  asks: [],
  debts: [],
  halts: [],
  seen: {},
})

test('a stopped step of 40 minutes is still listed, but no longer offers the yes: it says to try again in Claude, then allow', () => {
  const [fresh] = buildInbox(holdFacts(10, 'This deletes build.', NOW0))
  const [old] = buildInbox(holdFacts(40, 'This deletes build.', NOW0))
  expect(fresh?.stale).toBeUndefined()
  expect(canAllowHere(fresh as InboxItem)).toBe(true)
  expect(old?.stale).toBe(true)
  expect(canAllowHere(old as InboxItem)).toBe(false)
  const row = itemRow(old as InboxItem, 0, NOW0, id)
  expect(row.title).toBe(`app: ${STOPPED_OLD}`)
  expect(row.title).toBe('app: Stopped (try again in Claude, then allow)')
  expect(row.inside).toEqual({ label: 'Dismiss', action: { kind: 'dismissHold', sid: 'me' } })
  expect(row.action).toBeUndefined()
  expect(row.right).toBe('40 min ago')
  expect(old?.todo).toBe('Try the step again in Claude. When it is stopped again, allow it then.')
})

test('a stopped step with the step it tried shows it in the open row and holds Allow once inside; with no step kept there is no yes to press', () => {
  const [withStep] = buildInbox(holdFacts(3, 'This deletes build.', NOW0))
  const row = itemRow(withStep as InboxItem, 0, NOW0, id)
  expect(row.what.means).toBe('Claude tried a risky step. Vaken stopped it before it ran. Nothing changed, and the session waits for you. This deletes build.')
  expect(row.inside).toEqual({ label: 'Allow once', action: ALLOW_ONCE, more: [{ label: 'Dismiss', action: { kind: 'dismissHold', sid: 'me' } }] })
  expect(row.action).toBeUndefined()
  const [bare] = buildInbox(holdFacts(3, undefined, NOW0))
  expect(canAllowHere(bare as InboxItem)).toBe(false)
  expect(itemRow(bare as InboxItem, 0, NOW0, id).inside).toEqual({ label: 'Dismiss', action: { kind: 'dismissHold', sid: 'me' } })
})

test('the step a stopped row shows ends with a full stop when the guard wrote none', () => {
  const [noStop] = buildInbox(holdFacts(3, 'This deletes build', NOW0))
  expect(itemRow(noStop as InboxItem, 0, NOW0, id).what.means).toBe('Claude tried a risky step. Vaken stopped it before it ran. Nothing changed, and the session waits for you. This deletes build.')
  expect(endSentence('Is it safe?')).toBe('Is it safe?')
  expect(endSentence('It said "stop."')).toBe('It said "stop."')
  expect(endSentence('Stop!')).toBe('Stop!')
  expect(endSentence('')).toBe('')
})
