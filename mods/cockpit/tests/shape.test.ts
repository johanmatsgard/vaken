// The answer shape's rule and its hooks as the engine runs them.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { PLAIN_SECTION_ID, PLAIN_TEXT } from '../hooks/core/plain'
import { SHAPE_SECTION_ID, SHAPE_SETTINGS, SHAPE_TEXT, changedLine, parseAsk, shapeLines, shapeOf } from '../hooks/core/shape'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')

test('the two texts are the agreed ones; Default adds nothing', () => {
  expect(SHAPE_TEXT.short).toBe('Vaken rule: lead with the result in one sentence. Then at most 8 lines. No preamble, no recap of the question.')
  expect(SHAPE_TEXT.report).toBe('Vaken rule: answer in three short parts: Done, Evidence (what you ran or read), Next (one step).')
  expect(SHAPE_TEXT.default).toBe('')
})

test('the section id is its own and does not clash with Plain mode; the texts do not repeat each other', () => {
  expect(SHAPE_SECTION_ID).toBe('cockpit:shape')
  expect(SHAPE_SECTION_ID).not.toBe(PLAIN_SECTION_ID)
  expect(PLAIN_TEXT).not.toContain(SHAPE_TEXT.short)
  expect(PLAIN_TEXT).not.toContain(SHAPE_TEXT.report)
})

test('the setting: group Prompts, Default Short Report, default Default; an unknown value reads as Default', () => {
  const s = SHAPE_SETTINGS[0]
  expect(s.key).toBe('answer.shape')
  expect(s.group).toBe('Prompts')
  expect(s.options.map(o => o.value)).toEqual(['default', 'short', 'report'])
  expect(s.default).toBe('default')
  expect(shapeOf('short')).toBe('short')
  expect(shapeOf('long')).toBe('default')
  expect(shapeOf(undefined)).toBe('default')
})

test('the argument: empty shows, a name sets (any case), anything else is an error', () => {
  expect(parseAsk('')).toEqual({ kind: 'show' })
  expect(parseAsk('  ')).toEqual({ kind: 'show' })
  expect(parseAsk('Short')).toEqual({ kind: 'set', shape: 'short' })
  expect(parseAsk('report')).toEqual({ kind: 'set', shape: 'report' })
  expect(parseAsk('default')).toEqual({ kind: 'set', shape: 'default' })
  expect(parseAsk('verbose')).toMatchObject({ kind: 'bad' })
})

test('the words show the shape and its text, and how to change it', () => {
  expect(shapeLines('default')).toMatch(/Answer shape: Default\. Claude is told nothing extra\./)
  expect(shapeLines('short')).toContain(SHAPE_TEXT.short)
  expect(shapeLines('report')).toMatch(/Answer shape: Report\. Claude is told:\n/)
  expect(shapeLines('report')).toMatch(/\/vaken-settings shape short, report or default/)
  expect(changedLine('short')).toMatch(/from the next message/)
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
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'base', scope: 'shared' }] }) as never)
  return mem
}

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] } as never
const run = async ($: EngineInterface, args: string): Promise<string> => ((await $.command.run({ ...viaParent('vaken-shape', args), origin: { kind: 'composer' } } as never)) as { text: string }).text
const ids = async ($: EngineInterface): Promise<string[]> => ((await $.prompt.compose(FACTS)) as unknown as { sections: Array<{ id: string }> }).sections.map(s => s.id)
test('Default adds no section; Short and Report add exactly one, with their own text', SLOW, async ($, on) => {
  const mem = world(on)
  expect(await ids($)).toEqual(['intro'])
  mem.set('cockpit:setting:answer.shape', 'short')
  expect(await ids($)).toEqual(['intro', SHAPE_SECTION_ID])
  expect(JSON.stringify(await $.prompt.compose(FACTS))).toContain('lead with the result in one sentence')
  mem.set('cockpit:setting:answer.shape', 'report')
  expect(await ids($)).toEqual(['intro', SHAPE_SECTION_ID])
  expect(JSON.stringify(await $.prompt.compose(FACTS))).toContain('Done, Evidence')
})

test('Plain mode and a shape are both added, each once', async ($, on) => {
  world(on, { 'cockpit:setting:answer.shape': 'short', 'cockpit:setting:plain.mode': 'on' })
  const got = await ids($)
  expect(got.filter(id => id === SHAPE_SECTION_ID)).toHaveLength(1)
  expect(got.filter(id => id === PLAIN_SECTION_ID)).toHaveLength(1)
  expect(got[0]).toBe('intro')
})

test('/vaken-settings shape shows the shape, changes it, keeps it, and says what it did', async ($, on) => {
  const mem = world(on)
  expect(await run($, '')).toMatch(/Answer shape: Default\. Claude is told nothing extra/)
  const changed = await run($, 'short')
  expect(changed).toMatch(/Answer shape: Short\./)
  expect(changed).toContain(SHAPE_TEXT.short)
  expect(mem.get('cockpit:setting:answer.shape')).toBe('short')
  expect(await run($, '')).toContain(SHAPE_TEXT.short)
  expect(await run($, 'short')).toBe('Answer shape is already Short.')
  expect(await run($, 'nonsense')).toMatch(/is not a shape/)
  expect(mem.get('cockpit:setting:answer.shape')).toBe('short')
  expect((mem.get('cockpit:ledger:compact') as Array<{ what: string }>).map(l => l.what)).toEqual(['Changed the answer shape'])
  expect(await run($, 'default')).toMatch(/Answer shape: Default\./)
  expect(await ids($)).toEqual(['intro'])
})
