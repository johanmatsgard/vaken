// Open ends each morning: the pure builder, the note a session keeps at its end and the morning's look.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

const sectionLabel = async (ui: { find: (q: unknown) => Promise<unknown>; findAll: (q: unknown) => Promise<unknown[]> }, re: RegExp): Promise<unknown> =>
  (await ui.find({ type: 'Text', text: re })) ?? ((await ui.findAll({ type: 'Svg' })) as { props: { alt?: string } }[]).find(x => re.test(x.props.alt ?? ''))

import { readBand } from '../hooks/core/band'
import { CALM_KEY, parseCalm } from '../hooks/core/calm'
import { KEPT_FAMILIES, familyOf } from '../hooks/core/keeper'
import type { Io } from '../hooks/core/io'
import { OPEN_ENDS_DAYS, openBand, openDayOf, openDayStart, openEnds, openEndsKey, openLine, openShown, parseOpenDay, parseOpenNote } from '../hooks/core/openends'
import type { OpenNote } from '../hooks/core/openends'
import { emptyState, recordEdit, recordReceipts, stateKey } from '../hooks/core/proof'
import { answeredOpenEnds, dismissOpenEnds, morningCheck, noteOpenEnds, resumedOpenEnds } from '../hooks/features/calm'
import { flushNotes } from '../hooks/core/flush'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const NOW = new Date(2026, 9, 10, 8, 0).getTime()
const YESTERDAY = new Date(2026, 9, 9, 18, 0).getTime()

const note = (over: Partial<OpenNote>): OpenNote => ({ at: YESTERDAY, project: 'app', checks: {}, held: 0, tasks: 0, midTurn: false, ...over })

test('the day turns at 05:00: a session at 02:00 still belongs to the day before', () => {
  expect(openDayOf(NOW)).toBe('2026-10-10')
  expect(openDayOf(new Date(2026, 9, 10, 2, 0).getTime())).toBe('2026-10-09')
  expect(openDayStart(NOW)).toBe(new Date(2026, 9, 10, 5, 0).getTime())
  expect(openDayStart(new Date(2026, 9, 10, 2, 0).getTime())).toBe(new Date(2026, 9, 9, 5, 0).getTime())
})

test('one line per project: the newest check result wins, stopped steps, tasks and mid-answer ends add up; nothing open, nothing shown', () => {
  const notes = [
    note({ checks: { tests: 'failed', build: 'ok' }, held: 1, tasks: 2 }),
    note({ at: YESTERDAY - HOUR, checks: { tests: 'ok', lint: 'failed' }, midTurn: true }),
    note({ at: YESTERDAY + HOUR, project: 'web', checks: { tests: 'ok' } }),
    note({ at: YESTERDAY - 2 * HOUR, project: 'docs', midTurn: true }),
    note({ at: NOW - (OPEN_ENDS_DAYS + 1) * DAY, project: 'old', held: 1 }),
    note({ at: NOW - HOUR, project: 'today', held: 1 }),
  ]
  const ends = openEnds(notes, openDayStart(NOW))
  expect(ends.map(e => openLine(e))).toEqual(['app: tests and lint failed, 1 risky step stopped, 2 tasks not done, ended mid‑answer', 'docs: ended mid‑answer'])
  expect(openBand(ends[0])).toBe('Left open in app: tests and lint failed, 1 risky step stopped, 2 tasks not done, ended mid‑answer')
  expect(openLine({ project: 'x', failed: ['build', 'types'], held: 2, tasks: 1, midTurn: 2 })).toBe('x: the build and the type check failed, 2 risky steps stopped, 1 task not done, 2 sessions ended mid‑answer')
  expect(openEnds([], openDayStart(NOW))).toEqual([])
})

test('the notes and the morning record are read back strictly; a dismissed or older morning shows nothing', () => {
  expect(parseOpenNote({ at: 1, project: 'app', checks: { tests: 'failed', nope: 'ok' }, held: 'x', midTurn: true })).toEqual({ at: 1, project: 'app', checks: { tests: 'failed' }, held: 0, tasks: 0, midTurn: true })
  expect(parseOpenNote({ at: 1, project: '' })).toBeUndefined()
  const day = { day: '2026-10-10', ends: [{ project: 'app', failed: ['tests', 'junk'], held: 1, tasks: 0, midTurn: 0 }], dismissed: false }
  expect(parseOpenDay(day)?.ends[0]?.failed).toEqual(['tests'])
  expect(openShown(parseOpenDay(day), NOW)).toHaveLength(1)
  expect(openShown(parseOpenDay({ ...day, dismissed: true }), NOW)).toEqual([])
  expect(openShown(parseOpenDay({ ...day, day: '2026-10-09' }), NOW)).toEqual([])
})

test('the keeper keeps a session\'s open-ends note a few days after its end', () => {
  expect(KEPT_FAMILIES['cockpit:openends:']).toBe(3)
  expect(familyOf(openEndsKey('0b6c2d5e-1111-4222-8333-944455556666'))).toEqual({ family: 'cockpit:openends:', sid: '0b6c2d5e-1111-4222-8333-944455556666' })
})

function memIo(seed: Record<string, unknown>, now: number) {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:detail': 'explained', ...seed }))
  let clock = now
  const io: Io = {
    now: async () => clock,
    home: async () => '',
    sessionId: async () => 'me',
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem, setNow: (t: number) => void (clock = t) }
}

test('a session end keeps a note of what it left open; the next morning makes the lines once, posts one band line each, and Got it puts them away', async () => {
  let proof = recordEdit(emptyState(), '/a.ts')
  proof = recordReceipts(proof, [{ kind: 'tests', ok: false }], YESTERDAY)
  const w = memIo({ [stateKey('s1')]: proof, 'cockpit:guard:held:s1': { at: YESTERDAY, keys: ['k1'] }, 'cockpit:orch:s1': { id: 'r1', name: 'Run', status: 'paused', createdAt: YESTERDAY, choices: {}, tasks: [{ text: 'A', role: 'builder', state: 'done' }, { text: 'B', role: 'builder', state: 'waiting' }] } }, YESTERDAY)
  expect(await noteOpenEnds(w.io, 's1', '/work/app', true)).toMatchObject({ project: 'app', checks: { tests: 'failed' }, held: 1, tasks: 1, midTurn: true })
  expect(await noteOpenEnds(w.io, 's2', '/work/web', false)).toBeUndefined()
  expect(await noteOpenEnds(w.io, 's1', undefined, true)).toBeUndefined()
  expect(w.mem.has(openEndsKey('s2'))).toBe(false)
  w.setNow(NOW)
  await morningCheck(w.io)
  const calm = parseCalm(w.mem.get(CALM_KEY))
  expect(calm.open?.day).toBe('2026-10-10')
  expect(calm.open?.ends.map(e => openLine(e))).toEqual(['app: tests failed, 1 risky step stopped, 1 task not done, ended mid‑answer'])
  const band = await readBand(w.io)
  expect(band.map(b => [b.id, b.level])).toEqual([['openends:0', 'info']])
  expect(band[0]?.text).toMatch(/^Left open in app: tests failed, 1 risky step stopped/)
  w.mem.delete('cockpit:band:me')
  await morningCheck(w.io)
  expect(await readBand(w.io)).toEqual([])
  await dismissOpenEnds(w.io)
  expect(parseCalm(w.mem.get(CALM_KEY)).open?.dismissed).toBe(true)
  // Got it deletes the old notes too, so the same note never comes back on a later day
  expect(w.mem.has(openEndsKey('s1'))).toBe(false)
})

test('a new session\'s first answer in the same project clears an older mid-answer end there; other projects keep theirs', async () => {
  // A day after the other tests' morning (the morning check runs once a day)
  const at = YESTERDAY + DAY
  const w = memIo({ [openEndsKey('a1')]: note({ at, midTurn: true }), [openEndsKey('a2')]: note({ at, midTurn: true, held: 1 }), [openEndsKey('b1')]: note({ at, project: 'web', midTurn: true }) }, NOW + DAY)
  await morningCheck(w.io)
  expect(parseCalm(w.mem.get(CALM_KEY)).open?.ends.map(e => [e.project, e.midTurn])).toEqual([['app', 2], ['web', 1]])
  await resumedOpenEnds(w.io, 'me', '/work/app')
  expect(w.mem.has(openEndsKey('a1'))).toBe(false)
  expect(w.mem.get(openEndsKey('a2'))).toMatchObject({ midTurn: false, held: 1 })
  expect(w.mem.get(openEndsKey('b1'))).toMatchObject({ midTurn: true })
  expect(parseCalm(w.mem.get(CALM_KEY)).open?.ends.map(e => [e.project, e.midTurn])).toEqual([['app', 0], ['web', 1]])
})

test('a session that crashes mid-answer still leaves its note: it is kept while the session runs, and removed when nothing is open any more', async () => {
  let proof = recordEdit(emptyState(), '/a.ts')
  proof = recordReceipts(proof, [{ kind: 'tests', ok: false }], YESTERDAY)
  const w = memIo({ [stateKey('c1')]: proof }, YESTERDAY)
  expect(await noteOpenEnds(w.io, 'c1', '/work/app', true, false)).toMatchObject({ checks: { tests: 'failed' }, midTurn: true })
  await flushNotes()
  expect(w.mem.get(openEndsKey('c1'))).toMatchObject({ project: 'app', midTurn: true })
  const kept = parseOpenNote(w.mem.get(openEndsKey('c1')))
  expect(openEnds(kept === undefined ? [] : [kept], openDayStart(NOW)).map(e => openLine(e))).toEqual(['app: tests failed, ended mid‑answer'])
  await answeredOpenEnds(w.io, 'c1')
  await flushNotes()
  expect(w.mem.get(openEndsKey('c1'))).toMatchObject({ checks: { tests: 'failed' }, midTurn: false })
  w.mem.set(stateKey('c1'), emptyState())
  expect(await noteOpenEnds(w.io, 'c1', '/work/app', true, false)).toMatchObject({ midTurn: true })
  await answeredOpenEnds(w.io, 'c1')
  expect(w.mem.has(openEndsKey('c1'))).toBe(false)
  expect(await noteOpenEnds(w.io, 'c1', '/work/app', false, false)).toBeUndefined()
  expect(w.mem.has(openEndsKey('c1'))).toBe(false)
})

// The This session row, through the engine.
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
function engine(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:detail', 'explained']])
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
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }) as never)
  mem.set('cockpit:firstrun', 'done')
  return mem
}

test('a session that ends mid-answer leaves a note; the next morning This session shows it on every surface until Got it (the Where was I card hidden, which shows them otherwise)', { timeoutMs: 15_000 }, async ($, on) => {
  const late = new Date(2026, 9, 10, 4, 30).getTime()
  const clock = mock.clock(on, { now: late })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:setting:cards.back', 'hide')
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await $.turn.start({ text: 'go', turnId: 't1' } as never)
  await $.session.end({ sessionId: 'test-session', reason: 'exit' } as never)
  expect(parseOpenNote(mem.get(openEndsKey('test-session')))).toMatchObject({ project: 'app', midTurn: true })
  await clock.advance(35 * 60_000)
  // Another project's note stays on Where was I: it is not this session's state
  mem.set(openEndsKey('other'), note({ project: 'web', midTurn: true }))
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'vaken', surface, component: 'Pane', requestId: 'cockpit-home', props: paneProps })
    // No heading inside the card: the row says it was an earlier session (not this one's state), what was left and when on the dim line under it
    expect(await sectionLabel(ui, /^Left open$/)).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'Earlier session' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^ended mid‑answer · \d+ min ago$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'web' })).toBeUndefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await ui.press({ key: 'openends-gotit' })
  await ui.unmount()
  await clock.settle()
  const after = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await sectionLabel(after, /^Left open yesterday$/)).toBeUndefined()
  await after.unmount()
})
