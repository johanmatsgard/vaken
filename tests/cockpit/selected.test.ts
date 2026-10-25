// Selected text: three presses on This session that act on what the person has selected in the chat. The selection is read only at a press and kept nowhere.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import { SEL_QUOTE_MAX, SEL_TASK_MAX, SELECTED_STRINGS, copyTextOf, explainRequest, taskLineOf } from '../hooks/core/selected'
import { byEnglish } from '../hooks/i18n/table'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { BASE_SEEDS, HOME, NOW, SETUP_BASE, engine, propsAt, textsOf } from './statefixtures'
import type { Pane, World } from './statefixtures'

const SV = byEnglish('sv')

test('the request quotes the selection line by line under one sentence; a long one is cut; nothing selected gives nothing', () => {
  const r = explainRequest('first line\nsecond line\r\n\r\nlast')
  expect(r).toContain('Please explain this')
  expect(r?.split('\n').filter(l => l.startsWith('>'))).toEqual(['> first line', '> second line', '>', '> last'])
  expect(explainRequest(undefined)).toBeUndefined()
  expect(explainRequest('  \n ')).toBeUndefined()
  const long = explainRequest('x'.repeat(SEL_QUOTE_MAX + 500)) ?? ''
  expect(long).toContain('the selection was cut here')
  expect(long.length).toBeLessThan(SEL_QUOTE_MAX + 300)
})

test('the task line is one line without secrets, cut to the task length; a closing bracket is not read as the task\'s own choices', () => {
  expect(taskLineOf('Fix the header\n  and the footer')).toBe('Fix the header and the footer')
  expect(taskLineOf('')).toBeUndefined()
  expect(taskLineOf(undefined)).toBeUndefined()
  expect((taskLineOf('word '.repeat(300)) ?? '').length).toBeLessThanOrEqual(SEL_TASK_MAX)
  expect(taskLineOf('Rename it (see the notes)')).toBe('Rename it (see the notes).')
  expect(taskLineOf(`Use key ${'sk-' + 'ant-' + 'api03-abcdefghijklmnopqrstuvwxyz0123456789'} to log in`)).not.toContain('abcdefghijklmnop')
  expect(copyTextOf('  a b ')).toBe('  a b ')
  expect(copyTextOf('   ')).toBeUndefined()
})

test('every word of the three presses has a Swedish row', () => {
  for (const w of SELECTED_STRINGS) expect(SV[w] ?? '', w).not.toBe('')
})

// Through the engine: the card shows the line only with an answer in the chat; each press reads the selection when it is pressed.
test('the This session card: Selected text opens to three presses; each reads the selection at that press and keeps none of it', { timeoutMs: 60_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  const { sent } = engine(on, w)
  const copied: string[] = []
  const reads = { n: 0 }
  let selection: string | undefined
  on('ui.selection', () => {
    reads.n += 1
    return { value: selection === undefined ? undefined : { text: selection } } as never
  })
  on('ui.copy', (_$, e) => {
    copied.push((e as { text: string }).text)
    return { value: { isCopied: true } } as never
  })
  const mount = async (): Promise<Pane> => {
    forgetProjectSet()
    forgetContext()
    return (await ($ as unknown as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(420) })) as Pane
  }
  // No answer in the chat yet: no line.
  const first = await mount()
  await first.redraw()
  expect(textsOf(await first.drawn())).not.toContain('Selected text')
  await first.unmount()
  await $.turn.complete({ answer: 'The header is in src/Header.tsx.', durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  const ui = await mount()
  await ui.redraw()
  expect(textsOf(await ui.drawn())).toContain('Selected text')
  // Closed: no press rows, and the selection was not read to draw it.
  expect(await ui.find({ key: 'sel-explain' })).toBeUndefined()
  expect(reads.n).toBe(0)
  await ui.press({ key: 'press-ol-here:sel-0' })
  await ui.redraw()
  expect(await ui.find({ key: 'sel-explain' })).toBeDefined()
  expect(await ui.find({ key: 'sel-task' })).toBeDefined()
  expect(await ui.find({ key: 'sel-copy' })).toBeDefined()
  expect(reads.n).toBe(0)
  // Nothing selected: a press says so and does nothing.
  await ui.press({ key: 'sel-explain' })
  await ui.press({ key: 'sel-task' })
  await ui.press({ key: 'sel-copy' })
  expect(sent).toEqual([])
  expect(copied).toEqual([])
  expect(w.mem.has('cockpit:orchestra')).toBe(false)
  expect(reads.n).toBe(3)
  // Explain this: one request with the selection quoted.
  selection = 'const SECRET_MARKER = 42\nreturn SECRET_MARKER'
  await ui.press({ key: 'sel-explain' })
  expect(sent.length).toBe(1)
  expect(sent[0]).toContain('> const SECRET_MARKER = 42')
  expect(sent[0]).toContain('> return SECRET_MARKER')
  // Copy: the text as selected.
  await ui.press({ key: 'sel-copy' })
  expect(copied).toEqual([selection])
  // Make it a task: the one line is the task; Claude is not asked and nothing starts.
  await ui.press({ key: 'sel-task' })
  const run = [...w.mem.entries()].map(([, v]) => v).find(v => v !== null && typeof v === 'object' && Array.isArray((v as { tasks?: unknown }).tasks)) as { tasks: { text: string }[]; status: string } | undefined
  expect(run?.tasks.map(t => t.text)).toEqual(['const SECRET_MARKER = 42 return SECRET_MARKER'])
  expect(run?.status).toBe('setup')
  expect(sent.length).toBe(1)
  // Only the task holds the text: no other key of the store has it.
  const holders = [...w.mem.entries()].filter(([, v]) => JSON.stringify(v ?? '').includes('SECRET_MARKER')).map(([k]) => k)
  expect(holders.length).toBe(1)
  await ui.unmount()
})
