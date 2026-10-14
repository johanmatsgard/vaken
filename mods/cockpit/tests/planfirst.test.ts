// The plan-first nudge: what counts as a big task and the check that runs on a new message over a store in memory.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { EngineInterface, On } from 'claude-code'

import { PLANFIRST_SETTINGS, PLAN_BAND_SUGGEST, PLAN_GAP_MS, PLAN_NOTE, advancePlan, bigTask, judgePlan, planLine, readPlan } from '../hooks/core/planfirst'
import { emptyState } from '../hooks/core/proof'
import type { Io } from '../hooks/core/io'
import { forgetNote } from '../hooks/core/flush'
import { planCheck } from '../hooks/features/planfirst'
import { viaParent } from './viaparent'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

const BIG_VERBS = 'Please build a new settings page and migrate the old values to it'
const LONG = `${Array.from({ length: 40 }, (_, n) => `word${n}`).join(' ')}`
const facts = (over: Record<string, unknown> = {}) => ({ mode: 'suggest', text: BIG_VERBS, edits: 0, now: NOW, state: {}, ...over })

test('a big task: 40 words or more, or two big verbs', () => {
  expect(bigTask(LONG).big).toBe(true)
  expect(bigTask(LONG.split(' ').slice(0, 39).join(' ')).big).toBe(false)
  expect(bigTask(BIG_VERBS).big).toBe(true)
  expect(bigTask('Rewrite the parser and add support for tabs').big).toBe(true)
  expect(bigTask('Redesign the header').big).toBe(false)
  expect(bigTask('Refactoring, refactor and refactors').big).toBe(false)
  expect(bigTask('Fix the typo in the readme').big).toBe(false)
})

test('a message that asks for a plan first is not a big task', () => {
  expect(bigTask(`Build and implement the new importer. Write a plan first.`).big).toBe(false)
  expect(bigTask(`First propose how to build and implement the importer`).big).toBe(false)
  expect(bigTask(`${LONG} planning`).big).toBe(false)
})

test('fewer than 3 edits: suggest or ask; 3 edits or more: nothing', () => {
  expect(judgePlan(facts()).act).toBe('suggest')
  expect(judgePlan(facts({ mode: 'ask' })).act).toBe('ask')
  expect(judgePlan(facts({ edits: 2 })).act).toBe('suggest')
  expect(judgePlan(facts({ edits: 3 }))).toMatchObject({ act: 'none', record: true })
  expect(judgePlan(facts({ edits: 3 })).why).toMatch(/already made 3 edits/)
})

test('off and a command are not judged at all', () => {
  expect(judgePlan(facts({ mode: 'off' }))).toMatchObject({ act: 'none', record: false })
  expect(judgePlan(facts({ text: `/loop ${BIG_VERBS}` }))).toMatchObject({ act: 'none', record: false })
  expect(judgePlan(facts({ origin: { kind: 'peer' } }))).toMatchObject({ act: 'none', record: false })
})

test('at most one nudge in 30 minutes', () => {
  const s = advancePlan({}, judgePlan(facts()), NOW)
  expect(s.at).toBe(NOW)
  expect(judgePlan(facts({ state: s, now: NOW + PLAN_GAP_MS - MIN })).act).toBe('none')
  expect(judgePlan(facts({ state: s, now: NOW + PLAN_GAP_MS })).act).toBe('suggest')
  expect(advancePlan({}, judgePlan(facts({ text: 'Fix the typo' })), NOW).at).toBeUndefined()
})

test('the words', () => {
  expect(PLAN_NOTE).toBe('Vaken note: this is a big task. Write a short plan (5 lines at most) and wait for a yes before you change files.')
  expect(PLAN_BAND_SUGGEST).toBe('Big task. A plan first is cheaper than a redo.')
  expect(planLine('off', {})).toMatch(/off\. Turn it on: Settings > Prompts and memory/)
  expect(planLine('ask', {})).toBe('Plan first: ask. No message checked yet.')
  const line = planLine('suggest', advancePlan({}, judgePlan(facts()), NOW))
  expect(line).toMatch(/^Plan first: suggest\. The message names 2 big steps\./)
  expect(line.includes('\n')).toBe(false)
  expect(readPlan('x')).toEqual({})
})

test('the setting row: Off, Suggest, Ask; Suggest by default (Recommended); in the Autopilot group', () => {
  expect(PLANFIRST_SETTINGS[0]).toMatchObject({ key: 'plan.first', group: 'Autopilot', default: 'suggest' })
  expect(PLANFIRST_SETTINGS[0].options.map(o => o.value)).toEqual(['off', 'suggest', 'ask'])
})

function world(mode: string | undefined, edits = 0) {
  forgetNote('cockpit:planfirst:me') // the hot note of an earlier test must not carry over
  const mem = new Map<string, unknown>()
  if (mode !== undefined) mem.set('cockpit:setting:plan.first', mode)
  if (edits > 0) mem.set('cockpit:proof:me', { ...emptyState(), edits })
  const clock = { now: NOW }
  const io: Io = {
    now: async () => clock.now,
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
  return { mem, clock, io }
}
const band = (mem: Map<string, unknown>) => ((mem.get('cockpit:band:me') ?? []) as Array<{ id: string; level: string; text: string }>).filter(b => b.id === 'planfirst')
const whats = (mem: Map<string, unknown>): string[] => ((mem.get('cockpit:ledger:compact') as Array<{ what: string }> | undefined) ?? []).map(l => l.what)

test('Suggest: a band line and a ledger line, and Claude gets nothing', async () => {
  const w = world('suggest')
  expect(await planCheck(w.io, { text: BIG_VERBS })).toBeUndefined()
  expect(band(w.mem).map(b => [b.level, b.text])).toEqual([['warn', 'Big task. A plan first is cheaper than a redo.']])
  expect(whats(w.mem)).toEqual(['Suggested a plan first'])
  expect(JSON.stringify([...w.mem.entries()])).not.toMatch(/settings page|migrate/i)
})

test('Ask: Claude gets the note, and the band says so quietly', async () => {
  const w = world('ask')
  expect(await planCheck(w.io, { text: BIG_VERBS })).toBe(PLAN_NOTE)
  expect(band(w.mem).map(b => [b.level, b.text])).toEqual([['info', 'Asked Claude to plan first.']])
  expect(whats(w.mem)).toEqual(['Asked Claude for a plan first'])
})

test('Off: nothing happens, nothing is stored', async () => {
  for (const mode of ['off']) {
    const w = world(mode)
    expect(await planCheck(w.io, { text: BIG_VERBS })).toBeUndefined()
    expect([...w.mem.keys()].filter(k => k !== 'cockpit:setting:plan.first')).toEqual([])
  }
})

test('after 3 edits Ask gives no note; a small task gives none either', async () => {
  const late = world('ask', 3)
  expect(await planCheck(late.io, { text: BIG_VERBS })).toBeUndefined()
  expect(band(late.mem)).toEqual([])
  const small = world('ask')
  expect(await planCheck(small.io, { text: 'Fix the typo in the readme' })).toBeUndefined()
})

function memStore(on: On): void {
  const mem = new Map<string, unknown>()
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
}

test('/vaken-explain planfirst answers in one line', async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const t = ((await $.command.run(viaParent('vaken-planfirst', '') as never)) as { text: string }).text
  expect(t.includes('\n')).toBe(false)
})
