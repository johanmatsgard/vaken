// Agent drill-in: pressing an agent row of this session reads its last steps at the press (tool kinds, file names, time, cost),
// shows them under the row's facts and forgets them when the row shuts. No word of the transcript is kept or drawn.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import { fileOf, kindOf, lastSteps, stepLabel, stepValue, withStepTime, withToolTime } from '../hooks/core/agentsteps'
import { setLang, t } from '../hooks/core/lang'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { stepsMem } from '../hooks/features/home/steps'
import { noteStepTime, noteToolTime, stepTimes } from '../hooks/features/agentboard'
import { checkShown } from '../hooks/features/orchestra'
import { BASE_SEEDS, HOME, MIN, NOW, SETUP_BASE, engine, propsAt, textsOf } from './statefixtures'
import type { Node, Pane, World } from './statefixtures'

const SECRET = 'the secret plan for the launch'
const use = (tool: string, input: Record<string, unknown> = {}, isError?: true) => ({ tool_use_id: `u-${tool}`, tool, input, ...(isError ? { isError } : {}) })
const MESSAGES = [
  { role: 'user', text: SECRET, toolUses: [] },
  { role: 'assistant', text: `I will read ${SECRET}`, toolUses: [use('Read', { file_path: '/work/app/src/login/form.ts' })] },
  { role: 'user', text: '', toolUses: [] },
  // One answer the engine split in two parts
  { role: 'assistant', text: '', toolUses: [use('Edit', { file_path: '/work/app/src/login/form.ts' })] },
  { role: 'assistant', text: '', toolUses: [use('Edit', { file_path: '/work/app/src/login/index.ts' }), use('Bash', { command: `echo ${SECRET}` }, true)] },
  { role: 'user', text: '', toolUses: [] },
  { role: 'assistant', text: `Done: ${SECRET}`, toolUses: [] },
]

test('a step is one answer: its kinds, its file names (never a folder or a command), failed when a tool failed', () => {
  expect(fileOf({ file_path: '/work/app/src/login/form.ts' })).toBe('form.ts')
  expect(fileOf({ notebook_path: 'C:\\work\\nb.ipynb' })).toBe('nb.ipynb')
  expect(fileOf({ command: 'rm -rf /' })).toBeUndefined()
  expect(kindOf('mcp__notes__search')).toBe('Used notes')
  expect(kindOf('Bash')).toBe('Ran a command')
  expect(kindOf('SomeNewTool')).toBe('SomeNewTool')
  const steps = lastSteps(MESSAGES, [], 5)
  expect(steps.map(stepLabel)).toEqual(['1. Read form.ts', '2. Edited · Ran a command form.ts, index.ts', '3. Answered'])
  expect(steps[1].failed).toBe(true)
  expect(stepValue(steps[1])).toBe('Failed')
  expect(JSON.stringify(steps)).not.toContain('secret')
  expect(JSON.stringify(steps)).not.toContain('echo')
  // Only the last N
  expect(lastSteps(MESSAGES, [], 2).map(s => s.n)).toEqual([2, 3])
})

test('times and costs pair from the end while the tool names match; a gap stops the pairing', () => {
  const times = withToolTime(withStepTime(withStepTime([], { tools: 'Read', ms: 1200, usd: 0.0042 }), { tools: 'Edit,Edit,Bash', ms: 3000, usd: 0.011 }), 900)
  const all = withStepTime(times, { tools: '', ms: 2000, usd: 0.003 })
  const steps = lastSteps(MESSAGES, all, 5)
  expect(steps.map(s => stepValue(s))).toEqual(['1 s · $0.0042', 'Failed · 4 s · $0.011', '2 s · $0.0030'])
  // The newest answer is missing from memory: nothing pairs, rather than a wrong time on a step
  const gap = lastSteps(MESSAGES, times, 5)
  expect(gap.every(s => s.ms === undefined)).toBe(true)
  // Memory keeps only names and numbers, per agent, and only the last few
  noteStepTime('ag-x', { tools: 'Read', ms: 10 })
  noteToolTime('ag-x', 5)
  expect(stepTimes.get('ag-x')).toEqual([{ tools: 'Read', ms: 15 }])
  for (let n = 0; n < 20; n++) noteStepTime('ag-x', { tools: 'Read', ms: n })
  expect((stepTimes.get('ag-x') ?? []).length).toBe(8)
  stepTimes.delete('ag-x')
})

test('Swedish kinds come from the text table', () => {
  setLang('sv')
  try {
    expect(lastSteps(MESSAGES, [], 5, t).map(stepLabel)).toEqual(['1. Läste form.ts', '2. Ändrade · Körde ett kommando form.ts, index.ts', '3. Svarade'])
  } finally {
    setLang('en')
  }
})

const ent = (id: string, session: string, over: Record<string, unknown>) => ({ id, session, type: 'Explore', model: 'claude-haiku-4', what: `Look up ${id}`, background: true, startedAt: NOW - 6 * MIN, state: 'running', ...over })

async function mountWith($: unknown, on: Parameters<Parameters<typeof test>[1]>[1], asked: string[], beneath?: () => void): Promise<{ ui: Pane; w: World }> {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:agentboard', [
    ent('m1', 'test-ses', { agentId: 'ag-1', state: 'done', startedAt: NOW - 20 * MIN, endedAt: NOW - 14 * MIN, usd: 0.12 }),
    ent('x1', 'othersess', { agentId: 'ag-2' }),
  ])
  engine(on, w)
  on('session.messages', (_$, e) => {
    const id = (e as { agentId?: string }).agentId ?? ''
    asked.push(id)
    return { value: id === 'ag-1' ? MESSAGES : { deny: `no agent ${id}` } } as never
  })
  beneath?.()
  forgetProjectSet()
  forgetContext()
  forgetStartCheck()
  delete checkShown.sig
  const ui = (await ($ as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(420) })) as Pane
  await ui.redraw()
  return { ui, w }
}

test('pressing this session\'s agent row reads and shows its last steps; a second press shuts it and forgets them; nothing is stored', async ($, on) => {
  const asked: string[] = []
  const { ui, w } = await mountWith($, on, asked)
  await ui.press({ key: 'press-a-m1-0' })
  await ui.redraw()
  const text = textsOf((await ui.drawn()) as Node).join('\n')
  expect(asked).toEqual(['ag-1'])
  // The row's word says Done, so the facts do not say it again; the steps follow
  expect(text).not.toContain('Result: done')
  expect(text).toContain('1. Read form.ts')
  expect(text).toContain('2. Edited · Ran a command form.ts, index.ts')
  expect(text).toContain('3. Answered')
  expect(text).not.toContain('secret')
  for (const v of w.mem.values()) expect(JSON.stringify(v)).not.toContain('secret')
  expect(JSON.stringify(stepsMem)).not.toContain('secret')
  await ui.press({ key: 'press-a-m1-0' })
  await ui.redraw()
  expect(stepsMem.key).toBeUndefined()
  expect(textsOf((await ui.drawn()) as Node).join('\n')).not.toContain('1. Read form.ts')
  await ui.unmount()
})

test('another session\'s agent says where its steps show, and reads nothing', async ($, on) => {
  const asked: string[] = []
  const { ui } = await mountWith($, on, asked)
  await ui.press({ key: 'press-a-x1-0' })
  await ui.redraw()
  expect(asked).toEqual([])
  expect(textsOf((await ui.drawn()) as Node).join('\n')).toContain('Its steps show only in the session that started it.')
  await ui.unmount()
})

test('the agent\'s own answers, seen by the turn.step hook, give each step its time and cost', async ($, on) => {
  const asked: string[] = []
  const ANSWERS = [['Read'], ['Edit', 'Edit', 'Bash'], []]
  const { ui } = await mountWith($, on, asked, () =>
    on('turn.step', async function* (_$, e) {
      const tools = ANSWERS[e.index] ?? []
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: tools.map(name => ({ name, input: {} })), stopReason: 'tool_use', usage: { input_tokens: 4000, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'claude-haiku-4-5' } } as never
    }),
  )
  for (let index = 0; index < ANSWERS.length; index++) {
    const s = $.turn.step({ turnId: 'turn-a', index, model: 'claude-haiku-4-5', messageCount: 1, agentId: 'ag-1' } as never)
    for await (const _ of s) void _
    await s.result
  }
  await ui.press({ key: 'press-a-m1-0' })
  await ui.redraw()
  const text = textsOf((await ui.drawn()) as Node).join('\n')
  expect(text).toContain('Steps: 3, oldest first')
  expect(text).toMatch(/1 s · \$0\.0\d+/)
  expect(text).toMatch(/Failed · 1 s · \$0\.0\d+/)
  await ui.unmount()
})
