// The assumption review's rule and its hooks as the engine runs them.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { ASSUME_NOTE, ASSUME_SETTINGS, assumptionsText, bandText, findAssumed, parseStored, wantsNote } from '../hooks/core/assumptions'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000
const words = (n: number): string => Array.from({ length: n }, (_, k) => `word${k}`).join(' ')

test('a note is wanted from 25 words, not from 24', () => {
  expect(wantsNote(words(24))).toBe(false)
  expect(wantsNote(words(25))).toBe(true)
  expect(wantsNote('')).toBe(false)
  expect(ASSUME_NOTE).toBe("Vaken note: before you change files, list your assumptions in at most 4 short lines starting with 'Assumed:'.")
})

test('lines that start with "Assumed:" are counted; the first 4 are kept, each cut to 80 characters', () => {
  const answer = ['I looked at the code.', 'Assumed: the test database is local', '- Assumed: tabs, not spaces', '  Assumed: no change to the API', 'I assumed this too.', 'Assumed:', `Assumed: ${'x'.repeat(200)}`, 'Assumed: a sixth one'].join('\n')
  const f = findAssumed(answer)
  expect(f.count).toBe(6)
  expect(f.lines).toHaveLength(4)
  expect(f.lines[0]).toBe('Assumed: the test database is local')
  expect(f.lines[1]).toBe('Assumed: tabs, not spaces')
  expect(f.lines[2]).toBe('Assumed: no change to the API')
  expect(f.lines[3]).toBe('Assumed:')
  const long = findAssumed(`Assumed: ${'x'.repeat(200)}`)
  expect(long.lines[0].length).toBe(80)
})

test('no such line, no count; the word must start the line', () => {
  expect(findAssumed('')).toEqual({ count: 0, lines: [] })
  expect(findAssumed('We assumed nothing.\nThe Assumed: word is in the middle.')).toEqual({ count: 0, lines: [] })
})

test('the setting: group Prompts, Off and On, default Off', () => {
  const s = ASSUME_SETTINGS[0]
  expect(s.key).toBe('assume.check')
  expect(s.group).toBe('Prompts')
  expect(s.options.map(o => o.value)).toEqual(['off', 'on'])
  expect(s.default).toBe('off')
})

test('the words: the band line counts, the command lists or says none', () => {
  expect(bandText(3)).toBe('Claude assumed 3 things. /vaken-explain assumptions')
  expect(bandText(1)).toBe('Claude assumed 1 thing. /vaken-explain assumptions')
  expect(bandText(12).length).toBeLessThanOrEqual(60)
  expect(parseStored({ at: 1, count: 2, lines: ['Assumed: a'] })).toBeDefined()
  expect(parseStored({ at: 1, count: 2, lines: [3] })).toBeUndefined()
  expect(parseStored(undefined)).toBeUndefined()
  expect(assumptionsText(undefined, true, NOW)).toBe('No assumptions listed yet in this session.')
  expect(assumptionsText(undefined, false, NOW)).toMatch(/off\. Turn it on: Settings > Prompts and memory/)
  expect(assumptionsText({ at: NOW - 3 * MIN, count: 6, lines: ['Assumed: a', 'Assumed: b'] }, true, NOW)).toBe('Claude listed 6 assumptions 3 min ago:\nAssumed: a\nAssumed: b\n(4 more not kept.)')
  expect(assumptionsText({ at: NOW, count: 1, lines: ['Assumed: a'] }, true, NOW)).toBe('Claude listed 1 assumption just now:\nAssumed: a')
})

function memStore(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
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
  return mem
}

function world(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
  mock.clock(on, { now: NOW })
  const mem = memStore(on, seed)
  mock.session(on)
  mock.env(on, { HOME: '/home/test' })
  on('session.id', () => ({ value: 'me' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  on('turn.complete', (_$, e) => ({ text: e.answer }) as never)
  return mem
}

const submit = async ($: EngineInterface, text: string): Promise<{ text: string; context?: readonly string[] }> =>
  ((await $.prompt.submit({ text } as never).catch(() => ({ text }))) ?? { text }) as { text: string; context?: readonly string[] }
const endTurn = ($: EngineInterface, answer: string, over: Record<string, unknown> = {}) => $.turn.complete({ answer, durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer', ...over } as never)
const list = async ($: EngineInterface): Promise<string> => ((await $.command.run(viaParent('vaken-assumptions', '') as never)) as { text: string }).text
const band = (mem: Map<string, unknown>): Array<{ text: string; level: string; ttlMs: number }> => (mem.get('cockpit:band:me') ?? []) as Array<{ text: string; level: string; ttlMs: number }>

test('Off: no note, no count, no band line', SLOW, async ($, on) => {
  const mem = world(on)
  expect((await submit($, words(40))).context ?? []).toEqual([])
  await endTurn($, 'Assumed: a thing')
  expect(band(mem).filter(b => b.text.startsWith('Claude assumed'))).toEqual([])
  expect(await list($)).toMatch(/off\. Turn it on/)
})

test('On: a long prompt carries the note, a short one and a slash command do not', SLOW, async ($, on) => {
  world(on, { 'cockpit:setting:assume.check': 'on' })
  const long = await submit($, words(30))
  expect(long.text).toBe(words(30))
  expect(long.context).toEqual([ASSUME_NOTE])
  expect((await submit($, words(10))).context ?? []).toEqual([])
  expect((await submit($, `/vaken-settings ${words(30)}`)).context ?? []).toEqual([])
})

test('On: after the turn the lines are counted, kept short, and one band line is posted with a 10 minute life', SLOW, async ($, on) => {
  const mem = world(on, { 'cockpit:setting:assume.check': 'on' })
  await endTurn($, 'Done.\nAssumed: the API stays as it is\nAssumed: Node 20\nAssumed: no new package\nAssumed: tests run offline\nAssumed: a fifth')
  const lines = band(mem).filter(b => b.text.startsWith('Claude assumed'))
  expect(lines).toHaveLength(1)
  expect(lines[0]).toMatchObject({ text: 'Claude assumed 5 things. /vaken-explain assumptions', level: 'info', ttlMs: 10 * MIN })
  const shown = await list($)
  expect(shown).toMatch(/Claude listed 5 assumptions just now/)
  expect(shown).toMatch(/Assumed: Node 20/)
  expect(shown).not.toMatch(/a fifth/)
  expect(shown).toMatch(/\(1 more not kept\.\)/)
  expect(JSON.stringify(mem.get('cockpit:assume:last:me'))).not.toMatch(/Done\./)
})

test('On: an answer with no such line, a subagent turn and an aborted turn change nothing', SLOW, async ($, on) => {
  const mem = world(on, { 'cockpit:setting:assume.check': 'on' })
  await endTurn($, 'All done, nothing assumed.')
  await endTurn($, 'Assumed: from a helper', { agentId: 'agent-1' })
  await endTurn($, 'Assumed: but stopped', { reason: 'aborted', isAborted: true })
  expect(band(mem)).toEqual([])
  expect(await list($)).toBe('No assumptions listed yet in this session.')
})
