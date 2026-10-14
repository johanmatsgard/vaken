import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { AGENTCAP_HELP, AGENTCAP_SETTINGS, COUNT_TTL_MS, capIsAuto, capMaxOf, capVerdict, parseCount, roomVerdict, totalRunning } from '../hooks/core/agentcap'
import { roomOf } from '../hooks/core/computer'
import type { Io } from '../hooks/core/io'
import { validValue, writeSetting } from '../hooks/core/settings'
import type { Room } from '../hooks/core/computer'
import type { Laptop } from '../hooks/core/crewlaptop'
import { SLOW, test } from './slow'

const NOW = 1_000_000

test('agents running are summed over all sessions, and an old count is left out', () => {
  const counts = [{ n: 2, at: NOW - 1000 }, { n: 1, at: NOW - 2000 }, { n: 5, at: NOW - COUNT_TTL_MS - 1 }, undefined]
  expect(totalRunning(counts, NOW)).toBe(3)
  expect(parseCount('x')).toBeUndefined()
  expect(parseCount({ n: 1, at: 2 })).toEqual({ n: 1, at: 2 })
})

test('under the limit nothing happens; at the limit Warn tells and Hold refuses', () => {
  expect(capVerdict('warn', 2, 3)).toEqual({ act: false })
  expect(capVerdict('off', 9, 3)).toEqual({ act: false })
  const warn = capVerdict('warn', 3, 3)
  expect(warn.act && !warn.hold).toBe(true)
  const hold = capVerdict('hold', 3, 3)
  expect(hold.act && hold.hold).toBe(true)
  expect(hold.act && hold.reason).toMatch(/Settings > Agents/)
})

const LAPTOP: Laptop = { at: NOW, pressure: 'normal', freeShare: 0.6, memMb: 32768, load: 2, cores: 10 }
const roomFor = (over: Partial<Laptop>, running = 0): Room | undefined => roomOf({ ...LAPTOP, ...over }, { running, max: 3, capOn: true }, NOW + 1000)

test('the room holds or warns for memory pressure, heat or a low battery; nothing else, and nothing without a fresh reading', () => {
  const full: Array<[Partial<Laptop>, string]> = [
    [{ pressure: 'critical' }, 'the Mac reports memory pressure'],
    [{ pressure: 'warn' }, 'the Mac reports memory pressure'],
    [{ thermal: { state: 'slowed', speedLimit: 60 } }, 'the processor is hot'],
    [{ battery: { hasBattery: true, onAc: false, percent: 10 } }, 'the battery is low'],
  ]
  for (const [over, why] of full) {
    const hold = roomVerdict('hold', roomFor(over))
    expect(hold.act && hold.hold).toBe(true)
    expect(hold.act && hold.reason).toBe(`Vaken holds this agent: the computer is full (${why}). Wait a while, or ask the person to turn the computer reading off in Settings > Agents.`)
    const warn = roomVerdict('warn', roomFor(over))
    expect(warn.act && !warn.hold).toBe(true)
    expect(warn.act && warn.reason).toBe(`The computer is full (${why}).`)
  }
  expect(roomVerdict('off', roomFor({ pressure: 'critical' }))).toEqual({ act: false })
  expect(roomVerdict('hold', roomFor({}))).toEqual({ act: false })
  expect(roomVerdict('hold', undefined)).toEqual({ act: false })
  expect(roomVerdict('hold', roomFor({ freeShare: 0.01 }))).toEqual({ act: false })
  expect(roomVerdict('hold', roomFor({ load: 10 }))).toEqual({ act: false })
  expect(roomVerdict('hold', roomOf({ ...LAPTOP, pressure: 'critical', at: NOW - 10 * 60_000 }, { running: 0, max: 3, capOn: true }, NOW))).toEqual({ act: false })
})

test('the help entry says the gauge counts, in three sentences', () => {
  expect(AGENTCAP_HELP[0].text).toMatch(/computer reading/)
  expect(AGENTCAP_HELP[0].text.split(/\.\s/).length).toBeLessThanOrEqual(3)
})

test('the agent cap is Auto by default: no number, the computer decides; a number is an optional pick', () => {
  const max = AGENTCAP_SETTINGS.find(s => s.key === 'cap.max')!
  expect(max.default).toBe('auto')
  expect(max.options[0]).toEqual({ value: 'auto', label: 'Auto' })
  expect(max.options.map(o => o.label)).toEqual(['Auto', '2', '3', '4', '6', '8', '12'])
  expect(capMaxOf(max.default)).toBe(Infinity)
  expect(capIsAuto(undefined)).toBe(true)
  expect(capMaxOf('n6')).toBe(6)
  expect(capMaxOf('n12')).toBe(12)
  // Auto never refuses by a count; a manual pick does.
  expect(capVerdict('hold', 40, capMaxOf('auto'))).toEqual({ act: false })
  expect(capVerdict('hold', 2, capMaxOf('n2')).act).toBe(true)
})

test('a stored 3 (the old default, never told apart from a pick) migrates to Auto; other old numbers stay manual; a typed 3 is a manual 3', async () => {
  const max = AGENTCAP_SETTINGS.find(s => s.key === 'cap.max')!
  expect(validValue(max, '3')).toBe('auto')
  expect(validValue(max, '2')).toBe('n2')
  expect(validValue(max, '8')).toBe('n8')
  expect(validValue(max, 'n3')).toBe('n3')
  expect(validValue(max, undefined)).toBe('auto')
  expect(validValue(max, 'junk')).toBe('auto')
  const mem = new Map<string, unknown>()
  const io = { get: async (k: string) => mem.get(k), set: async (k: string, v: unknown) => void mem.set(k, v) } as unknown as Io
  expect(await writeSetting(io, 'cap.max', '3')).toBe(true)
  expect(mem.get('cockpit:setting:cap.max')).toBe('n3')
  expect(await writeSetting(io, 'cap.max', 'auto')).toBe(true)
  expect(mem.get('cockpit:setting:cap.max')).toBe('auto')
  expect(await writeSetting(io, 'cap.max', '5')).toBe(false)
})

function memStore(on: On): Map<string, unknown> {
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
  return mem
}

let clockAt = NOW
function agentEngine(on: On, settings: Record<string, string>, laptop: Laptop | undefined): Map<string, unknown> {
  mock.clock(on, { now: clockAt })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'cap-session' }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('tool.call', { tool: 'Agent' }, () => ({ result: { status: 'async_launched' }, text: 'started' }) as never)
  for (const [k, v] of Object.entries(settings)) mem.set(`cockpit:setting:${k}`, v)
  if (laptop !== undefined) mem.set('cockpit:laptop:v2', laptop)
  return mem
}
const denied = (r: unknown): boolean => /"deny":/.test(JSON.stringify(r))

test('Hold: a full computer holds the new helper with the cap words and the reason; a ledger line and a band line', SLOW, async ($, on) => {
  const mem = agentEngine(on, { 'cap.mode': 'hold', 'laptop.mode': 'on' }, { ...LAPTOP, pressure: 'critical' })
  const a = await $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y' } as never)
  expect(denied(a)).toBe(true)
  expect(JSON.stringify(a)).toMatch(/Vaken holds this agent: the computer is full \(the Mac reports memory pressure\)/)
  expect((mem.get('cockpit:ledger:compact') as Array<{ what: string }>).map(l => l.what)).toEqual(['Held an extra agent'])
  expect(JSON.stringify(mem.get('cockpit:band:cap-session'))).toMatch(/Agent stopped: the computer is full/)
})

test('the gauge off, an old reading, or a calm computer: the helper starts as before', SLOW, async ($, on) => {
  const off = agentEngine(on, { 'cap.mode': 'hold', 'laptop.mode': 'off' }, { ...LAPTOP, pressure: 'critical' })
  expect(denied(await $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y' } as never))).toBe(false)
  expect(off.get('cockpit:ledger:compact')).toBeUndefined()
  off.set('cockpit:setting:laptop.mode', 'on')
  off.set('cockpit:laptop:v2', { ...LAPTOP, pressure: 'critical', at: NOW - 10 * 60_000 })
  expect(denied(await $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y' } as never))).toBe(false)
  off.set('cockpit:laptop:v2', LAPTOP)
  expect(denied(await $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y' } as never))).toBe(false)
})

test('Warn: a full computer warns once, in the ledger, and the helper still starts', SLOW, async ($, on) => {
  const mem = agentEngine(on, { 'laptop.mode': 'on' }, { ...LAPTOP, thermal: { state: 'slowed', speedLimit: 50 } })
  expect(denied(await $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y' } as never))).toBe(false)
  const ledger = mem.get('cockpit:ledger:compact') as Array<{ what: string; detail: string }>
  expect(ledger.map(l => l.what)).toEqual(['Warned about too many agents'])
  expect(ledger[0].detail).toBe('The computer is full (the processor is hot).')
})

test('Off: the cap is off, so the room does not hold either', SLOW, async ($, on) => {
  agentEngine(on, { 'cap.mode': 'off', 'laptop.mode': 'on' }, { ...LAPTOP, pressure: 'critical' })
  expect(denied(await $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y' } as never))).toBe(false)
})

const H = 3_600_000
const card = (percent: number, over: { left?: number; age?: number } = {}) => ({ at: clockAt - (over.age ?? 0), windows: [{ label: '5-hour limit', percent, resetsAt: new Date(clockAt + (over.left ?? 1) * H).toISOString() }] })
const NOTE = /The plan window is nearly used up: about 13 min left at this pace\./
const start = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y' } as never)

test('a helper that starts when the 5-hour window will run out within 20 minutes gets one calm line in its note, and is not held', SLOW, async ($, on) => {
  clockAt = NOW + 24 * H
  const mem = agentEngine(on, { 'claude.notes': 'all' }, undefined)
  mem.set('cockpit:usage:app', card(95))
  const a = await start($)
  expect(denied(a)).toBe(false)
  expect(JSON.stringify(a)).toMatch(NOTE)
  expect(JSON.stringify(a)).toMatch(/async_launched/)
  expect(JSON.stringify(await start($))).not.toMatch(/plan window/)
})

test('no line when the window lasts, when the reading is old or missing, or when the limit warning is off', SLOW, async ($, on) => {
  clockAt = NOW + 48 * H
  const mem = agentEngine(on, { 'cap.mode': 'hold', 'claude.notes': 'all' }, undefined)
  expect(JSON.stringify(await start($))).not.toMatch(/plan window/)
  mem.set('cockpit:usage:app', card(50))
  expect(JSON.stringify(await start($))).not.toMatch(/plan window/)
  mem.set('cockpit:usage:app', card(95, { age: 20 * 60_000 }))
  expect(JSON.stringify(await start($))).not.toMatch(/plan window/)
  mem.set('cockpit:usage:app', card(90))
  expect(JSON.stringify(await start($))).not.toMatch(/plan window/)
  mem.set('cockpit:usage:app', card(95))
  mem.set('cockpit:setting:limits.warn', 'off')
  expect(JSON.stringify(await start($))).not.toMatch(/plan window/)
  mem.set('cockpit:setting:limits.warn', 'on')
  expect(JSON.stringify(await start($))).toMatch(NOTE)
})

test('a helper that is held by the agent cap gets no plan line (it does not start)', SLOW, async ($, on) => {
  clockAt = NOW + 72 * H
  const mem = agentEngine(on, { 'cap.mode': 'hold', 'cap.max': '2' }, undefined)
  mem.set('cockpit:usage:app', card(95))
  mem.set('cockpit:agents:other', { n: 2, at: clockAt })
  const a = await start($)
  expect(denied(a)).toBe(true)
  expect(JSON.stringify(a)).not.toMatch(/plan window/)
})
