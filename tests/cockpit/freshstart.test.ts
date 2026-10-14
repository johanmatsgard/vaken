// The fresh-start nudge: the topic test and its words, and the check that runs on a new message over a store in memory.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { EngineInterface, On } from 'claude-code'

import { FRESH_GAP_MS, FRESH_SETTINGS, FRESH_TEXT, advanceFresh, continues, freshLine, judgeFresh, readFresh, wordHashes } from '../hooks/core/freshstart'
import type { FreshState } from '../hooks/core/freshstart'
import type { Io } from '../hooks/core/io'
import { forgetNote } from '../hooks/core/flush'
import { freshCheck } from '../hooks/features/freshstart'
import { viaParent } from './viaparent'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

const WORK = 'Fix the login form validation so the email field rejects addresses without a domain'
const OTHER = 'Write a quarterly budget spreadsheet comparing hosting invoices against forecast revenue'

const stateAfter = (...texts: string[]): FreshState => ({ prompts: texts.map(wordHashes) })
const facts = (over: Record<string, unknown> = {}) => ({ mode: 'on', text: OTHER, tokens: 120_000, now: NOW, state: stateAfter(WORK, 'Add a unit test for the login form validation'), ...over })

test('the significant words: lower case, 4 letters or more, no stop words, no numbers, each once, at most 40', () => {
  expect(wordHashes('The Login FORM, the form, and 2026 with a cat')).toEqual(wordHashes('login form'))
  expect(wordHashes('please make this what')).toEqual([])
  expect(wordHashes(Array.from({ length: 60 }, (_, n) => `word${n}x`).join(' ')).length).toBe(40)
  expect(wordHashes('login').join('')).not.toMatch(/login/)
})

test('a new topic in a big chat fires, with the plain reason', () => {
  const v = judgeFresh(facts())
  expect(v.fire).toBe(true)
  expect(v.why).toMatch(/^New topic: \d+% of the key words match/)
  expect(FRESH_TEXT.length).toBeLessThanOrEqual(60)
})

test('the same topic does not fire', () => {
  const v = judgeFresh(facts({ text: 'Fix the login form validation so the password field rejects short passwords' }))
  expect(v.fire).toBe(false)
  expect(v.why).toMatch(/^Same topic: \d+% of the key words match/)
})

test('a small chat does not fire: under 80k tokens a fresh start would save little', () => {
  expect(judgeFresh(facts({ tokens: 79_999 })).fire).toBe(false)
  expect(judgeFresh(facts({ tokens: 79_999 })).why).toMatch(/under 80k/)
  expect(judgeFresh(facts({ tokens: 80_000 })).fire).toBe(true)
  expect(judgeFresh(facts({ tokens: undefined })).why).toMatch(/not known yet/)
})

test('a short message (under 6 key words) is not judged; the words of a longer one need earlier messages to compare with', () => {
  expect(judgeFresh(facts({ text: 'Quarterly budget spreadsheet please' })).why).toMatch(/too short/)
  expect(judgeFresh(facts({ state: stateAfter('Fix login') })).why).toMatch(/not enough earlier messages/)
  expect(judgeFresh(facts({ state: { prompts: [] } })).fire).toBe(false)
})

test('a command and a message that continues the work never fire', () => {
  expect(judgeFresh(facts({ text: `/compact ${OTHER}` }))).toMatchObject({ fire: false, record: false })
  for (const start of ['Also', 'and then', 'Continue with', 'next']) {
    expect(continues(`${start} ${OTHER}`)).toBe(true)
    expect(judgeFresh(facts({ text: `${start} ${OTHER}` })).fire).toBe(false)
  }
  expect(continues('Nextcloud backup budget spreadsheet')).toBe(false)
  expect(judgeFresh(facts({ origin: { kind: 'scheduled-trigger' } })).record).toBe(false)
})

test('off judges nothing and records nothing', () => {
  expect(judgeFresh(facts({ mode: 'off' }))).toMatchObject({ fire: false, record: false })
})

test('it fires at most once in 2 hours', () => {
  const fired = advanceFresh(facts().state, judgeFresh(facts()), NOW)
  expect(fired.nudgeAt).toBe(NOW)
  const again = judgeFresh(facts({ state: fired, now: NOW + FRESH_GAP_MS - MIN, text: 'Draft an onboarding checklist for new contractors joining the support rotation' }))
  expect(again.fire).toBe(false)
  expect(again.why).toMatch(/less than 2 hours ago/)
  expect(judgeFresh(facts({ state: fired, now: NOW + FRESH_GAP_MS, text: 'Draft an onboarding checklist for new contractors joining the support rotation' })).fire).toBe(true)
})

test('the state keeps the last 5 messages as hashes, and never a word of the text', () => {
  let s: FreshState = { prompts: [] }
  for (let n = 0; n < 8; n += 1) s = advanceFresh(s, judgeFresh(facts({ state: s, tokens: 1000, text: `unique${n}word another${n}term third${n}part fourth${n}item fifth${n}bit sixth${n}one` })), NOW)
  expect(s.prompts.length).toBe(5)
  expect(JSON.stringify(s)).not.toMatch(/unique|another|third/)
  expect(readFresh({ prompts: 'x', last: 3 })).toEqual({ prompts: [] })
  expect(readFresh(undefined)).toEqual({ prompts: [] })
})

test('the line for /vaken-explain fresh is one line', () => {
  expect(freshLine('off', { prompts: [] })).toMatch(/off\. Turn it on: Settings > Prompts and memory/)
  expect(freshLine('on', { prompts: [] })).toBe('Fresh-start nudge: on. No message checked yet.')
  const line = freshLine('on', advanceFresh({ prompts: [] }, judgeFresh(facts()), NOW))
  expect(line).toMatch(/^Fresh-start nudge: on\. New topic/)
  expect(line.includes('\n')).toBe(false)
})

test('the setting row: On by default (Recommended), in the Autopilot group, and it says what it saves', () => {
  expect(FRESH_SETTINGS[0]).toMatchObject({ key: 'fresh.nudge', group: 'Autopilot', default: 'on' })
  expect(FRESH_SETTINGS[0].note).toMatch(/cost less in a new session/)
})

function world(settings: Record<string, string> = { 'cockpit:setting:fresh.nudge': 'on' }, tokens = 120_000) {
  forgetNote('cockpit:fresh:me') // the hot note of an earlier test must not carry over
  const mem = new Map<string, unknown>(Object.entries(settings))
  mem.set('cockpit:session:me', { sessionId: 'me', cwd: '/w', model: 'm', state: 'idle', startedAt: NOW, updatedAt: NOW, lastEventAt: NOW, stateSince: NOW, ctx: { tokens } })
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
const band = (mem: Map<string, unknown>) => ((mem.get('cockpit:band:me') ?? []) as Array<{ id: string; level: string; text: string; ttlMs: number }>).filter(b => b.id === 'fresh')

test('on a new topic in a big chat: one warn line for 10 minutes, one ledger line, and not a word of the message stored', async () => {
  const w = world()
  await freshCheck(w.io, { text: WORK })
  await freshCheck(w.io, { text: 'Add a unit test for the login form validation' })
  expect(band(w.mem)).toEqual([])
  await freshCheck(w.io, { text: OTHER })
  expect(band(w.mem).map(b => [b.level, b.text, b.ttlMs])).toEqual([['warn', 'New topic? A fresh session costs less.', 10 * MIN]])
  const ledger = w.mem.get('cockpit:ledger:compact') as Array<{ what: string; did?: boolean }>
  expect(ledger.map(l => [l.what, l.did])).toEqual([['Suggested a fresh session', true]])
  expect(JSON.stringify([...w.mem.entries()])).not.toMatch(/quarterly|spreadsheet|login form/i)
  w.clock.now += 30 * MIN
  await freshCheck(w.io, { text: 'Draft an onboarding checklist for new contractors joining the support rotation' })
  expect((w.mem.get('cockpit:ledger:compact') as unknown[]).length).toBe(1)
})

test('Off: nothing is stored and nothing is shown', async () => {
  const w = world({ 'cockpit:setting:fresh.nudge': 'off' })
  await freshCheck(w.io, { text: WORK })
  await freshCheck(w.io, { text: OTHER })
  expect(w.mem.has('cockpit:fresh:me')).toBe(false)
  expect(band(w.mem)).toEqual([])
})

test('a slash command is not stored and does not change the last decision', async () => {
  const w = world()
  await freshCheck(w.io, { text: WORK })
  const before = JSON.stringify(w.mem.get('cockpit:fresh:me'))
  await freshCheck(w.io, { text: '/vaken-explain fresh' })
  expect(JSON.stringify(w.mem.get('cockpit:fresh:me'))).toBe(before)
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

test('/vaken-explain fresh answers in one line', async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const t = ((await $.command.run(viaParent('vaken-fresh', '') as never)) as { text: string }).text
  expect(t.includes('\n')).toBe(false)
})
