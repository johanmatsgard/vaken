// The working habits note: its rule and its hook as the engine runs it.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { HABIT_KEYS, TASKS_AGAIN_MS, TASKS_SETTINGS, habitsNote, wantsTaskNote } from '../hooks/core/tasklist'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const words = (n: number): string => Array.from({ length: n }, (_, k) => `word${k}`).join(' ')

test('a note is wanted from 25 words, and again only after an hour', () => {
  expect(wantsTaskNote(words(24), undefined, NOW)).toBe(false)
  expect(wantsTaskNote(words(25), undefined, NOW)).toBe(true)
  expect(wantsTaskNote(words(25), NOW - TASKS_AGAIN_MS + 1, NOW)).toBe(false)
  expect(wantsTaskNote(words(25), NOW - TASKS_AGAIN_MS, NOW)).toBe(true)
})

test('four settings: group Prompts, Off and On, default On', () => {
  expect(TASKS_SETTINGS.map(t => t.key)).toEqual(['tasks.visible', 'habit.summary', 'habit.ask', 'habit.chapters'])
  for (const t of TASKS_SETTINGS) {
    expect(t.group).toBe('Prompts')
    expect(t.options.map(o => o.value)).toEqual(['off', 'on'])
    expect(t.default).toBe('on')
  }
})

test('one note holds only the habits that are on, in order; none on, no note', () => {
  expect(habitsNote([])).toBeUndefined()
  const all = habitsNote(HABIT_KEYS) as string
  expect(all.startsWith('Vaken note: For work with 3 or more steps')).toBe(true)
  expect(all).toMatch(/done, not done/)
  expect(all).toMatch(/clickable options/)
  expect(all).toMatch(/chapter/)
  const one = habitsNote(['habit.ask']) as string
  expect(one).toMatch(/clickable options/)
  expect(one).not.toMatch(/task list|chapter|done, not done/)
  expect(all.split(/\s+/).length).toBeLessThan(100)
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
const has = (r: { context?: readonly string[] }): boolean => (r.context ?? []).includes(habitsNote(HABIT_KEYS) as string)

test('default On: a long prompt carries the note once, a short one and a slash command never', SLOW, async ($, on) => {
  world(on)
  expect(has(await submit($, words(10)))).toBe(false)
  expect(has(await submit($, `/vaken-settings ${words(30)}`))).toBe(false)
  const first = await submit($, words(30))
  expect(first.text).toBe(words(30))
  expect(has(first)).toBe(true)
  expect(has(await submit($, words(30)))).toBe(false)
})

test('every habit Off: no note; one Off: the note leaves it out', SLOW, async ($, on) => {
  world(on, Object.fromEntries(HABIT_KEYS.map(k => [`cockpit:setting:${k}`, 'off'])))
  expect((await submit($, words(30))).context ?? []).toEqual([])
})

test('one habit Off: the note leaves that habit out', SLOW, async ($, on) => {
  world(on, { 'cockpit:setting:habit.chapters': 'off' })
  expect((await submit($, words(30))).context).toEqual([habitsNote(['tasks.visible', 'habit.summary', 'habit.ask'])])
})
