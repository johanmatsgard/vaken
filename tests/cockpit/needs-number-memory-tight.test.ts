// One number for Needs you (band, card, text twin), memory is tight only when it is, a "no" is asked again after five minutes.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SLOW, test } from './slow'

import { NEGATIVE_RETRY_MS, cachedAnswer, keptValue } from '../hooks/core/negcache'
import type { Kept, Slot } from '../hooks/core/negcache'
import { laptopWords, memoryTight, tightWords } from '../hooks/core/crewlaptop'
import type { Laptop } from '../hooks/core/crewlaptop'
import { LEDGER_KEY } from '../hooks/features/compaction'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-12T10:00:00Z')
const MIN = 60_000
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }
const bandProps = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} }

const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })

function engine(on: On): { mem: Map<string, unknown>; reads: { n: number }; redraws: { n: number } } {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom'], ['cockpit:setting:look.needs', 'waits']])
  const reads = { n: 0 }
  const redraws = { n: 0 }
  on('store.get', (_$, e) => {
    reads.n += 1
    return { value: mem.get(e.key) } as never
  })
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => {
    reads.n += 1
    return { value: [...mem.keys()] } as never
  })
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => {
    redraws.n += 1
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('mcp.call', () => ({ value: { content: [{ type: 'text', text: 'not offered here' }], isError: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  return { mem, reads, redraws }
}

const held = (ago: number) => ({ at: NOW - ago, session: 'test-session', what: 'Held a risky command', detail: 'This would delete files in a folder outside the work folder', how: 'auto', did: true })

test('the band chip, the Needs you card and the text twin read one number, also after the last held step went (the band no longer keeps the old number)', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const { mem, redraws } = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:session:test-session', rec('test-session', { cwd: '/work/app' }))
  mem.set('cockpit:session:other', rec('other', { state: 'idle' }))
  mem.set('cockpit:session:busy', rec('busy'))
  const chipOf = async (): Promise<string | undefined> => {
    const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
    const chip = (await ui.find({ key: 'band-needs' })) as { props?: { label?: string } } | undefined
    await ui.unmount()
    return chip?.props?.label
  }
  const cardOf = async (): Promise<boolean> => {
    const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
    const found = (await ui.find({ key: 'needs' })) !== undefined
    await ui.unmount()
    return found
  }
  const textOf = async (): Promise<string> => ((await $.command.run(viaParent('vaken', '') as never)) as { text: string }).text.split('\n')[0] ?? ''
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)

  mem.set(LEDGER_KEY, [held(4 * MIN)])
  expect(await chipOf()).toMatch(/1 needs you/)
  expect(await cardOf()).toBe(true)
  expect(await textOf()).toMatch(/^(- )?◆ Needs you: /)

  await clock.settle()
  mem.set(LEDGER_KEY, [])
  const drawn = redraws.n
  for (let k = 0; k < 8; k += 1) await clock.advance(10_000)
  await clock.settle()
  expect(redraws.n).toBeGreaterThan(drawn)
  expect(await chipOf()).toBeUndefined()
  expect(await cardOf()).toBe(false)
  expect(await textOf()).not.toMatch(/Needs you/)

  mem.set('cockpit:session:busy', rec('busy', { ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 4 * MIN } }))
  expect(await chipOf()).toMatch(/1 needs you/)
  expect(await cardOf()).toBe(true)
  expect(await textOf()).toMatch(/^(- )?◆ Needs you: /)
})

const laptop = (over: Partial<Laptop>): Laptop => ({ at: NOW, ...over })

test('memory is tight at critical, at warn twice in a row, or with under a tenth free; one warn alone is not', () => {
  expect(memoryTight(laptop({ pressure: 'critical' }))).toBe(true)
  expect(memoryTight(laptop({ pressure: 'warn' }))).toBe(false)
  expect(memoryTight(laptop({ pressure: 'warn', freeShare: 0.4 }), laptop({ pressure: 'normal' }))).toBe(false)
  expect(memoryTight(laptop({ pressure: 'warn', freeShare: 0.4 }), laptop({ pressure: 'warn' }))).toBe(true)
  expect(memoryTight(laptop({ pressure: 'warn', freeShare: 0.4 }), laptop({ pressure: 'critical' }))).toBe(true)
  expect(memoryTight(laptop({ pressure: 'warn', freeShare: 0.05 }))).toBe(true)
  expect(memoryTight(laptop({ pressure: 'normal', freeShare: 0.01 }))).toBe(false)
  expect(memoryTight(laptop({ freeShare: 0.05 }))).toBe(true)
  expect(memoryTight(laptop({ freeShare: 0.5 }))).toBe(false)
})

test('the words say the Mac is short of memory, and what the Claude sessions use of it', () => {
  const l = laptop({ pressure: 'critical', procs: { count: 3, rssMb: 4096 } })
  expect(tightWords(l, s => s)).toBe('This Mac is short of memory. Your 3 Claude sessions use 4.0 GB of it.')
  expect(tightWords(laptop({ procs: { count: 1, rssMb: 1024 } }), s => s)).toBe('This Mac is short of memory. Your 1 Claude session uses 1.0 GB of it.')
  expect(tightWords(laptop({ procs: { count: 0, rssMb: 0 } }), s => s)).toBe('This Mac is short of memory. No Claude session was found.')
  expect(tightWords(laptop({}), s => s)).toBe('This Mac is short of memory. The Claude sessions could not be counted.')
  expect(laptopWords(l)[0]).toBe('This Mac is short of memory. Your 3 Claude sessions use 4.0 GB of it.')
})

test('a success is kept for good, a "no" is asked again after five minutes, a throw is a "no"', async () => {
  const slot: Slot<string | undefined> = {}
  let asked = 0
  let answer: string | undefined
  const make = async (): Promise<string | undefined> => {
    asked += 1
    return answer
  }
  const ok = (v: string | undefined): boolean => v !== undefined
  expect(await cachedAnswer(slot, make, ok, 1000)).toBeUndefined()
  await Promise.resolve()
  expect(await cachedAnswer(slot, make, ok, 1000 + NEGATIVE_RETRY_MS - 1)).toBeUndefined()
  expect(asked).toBe(1)
  answer = '/repo/.git'
  expect(await cachedAnswer(slot, make, ok, 1000 + NEGATIVE_RETRY_MS)).toBe('/repo/.git')
  expect(asked).toBe(2)
  await Promise.resolve()
  answer = undefined
  expect(await cachedAnswer(slot, make, ok, 1000 + 10 * NEGATIVE_RETRY_MS)).toBe('/repo/.git')
  expect(asked).toBe(2)
  const bad: Slot<boolean> = {}
  let tries = 0
  const boom = async (): Promise<boolean> => {
    tries += 1
    throw new Error('no gh')
  }
  await cachedAnswer(bad, boom, v => v, 0).catch(() => undefined)
  await cachedAnswer(bad, boom, v => v, NEGATIVE_RETRY_MS - 1).catch(() => undefined)
  expect(tries).toBe(1)
  await cachedAnswer(bad, boom, v => v, NEGATIVE_RETRY_MS).catch(() => undefined)
  expect(tries).toBe(2)
})

test('a folder with a worktree root keeps it; a folder with none is asked again after five minutes', () => {
  const m = new Map<string, Kept<string>>()
  expect(keptValue(m, '/a', 0).hit).toBe(false)
  m.set('/a', { value: '/a', at: 0 })
  m.set('/b', { value: undefined, at: 0 })
  expect(keptValue(m, '/a', 99 * NEGATIVE_RETRY_MS)).toEqual({ hit: true, value: '/a' })
  expect(keptValue(m, '/b', NEGATIVE_RETRY_MS - 1)).toEqual({ hit: true, value: undefined })
  expect(keptValue(m, '/b', NEGATIVE_RETRY_MS).hit).toBe(false)
})

test('a second session.start does not double the timers (about as many store reads in the same stretch)', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const { mem, reads } = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:session:test-session', rec('test-session', { cwd: '/work/app' }))
  const stretch = async (): Promise<number> => {
    await clock.settle()
    const from = reads.n
    for (let k = 0; k < 12; k += 1) await clock.advance(15_000)
    await clock.settle()
    return reads.n - from
  }
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  const one = await stretch()
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  const two = await stretch()
  expect(one).toBeGreaterThan(0)
  expect(two).toBeLessThanOrEqual(Math.ceil(one * 1.3))
})
