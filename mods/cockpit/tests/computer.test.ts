import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { CORES_PER_HELPER, MB_PER_HELPER, ROOM_FRESH_MS, claudeLine, computerText, memoryHead, olderCockpitNote, powerLine, processorFact, processorHead, roomCap, roomLine, roomOf, roomReasons, sharesLine } from '../hooks/core/computer'
import type { AgentLoad } from '../hooks/core/computer'
import { LAPTOP_SCHEMA, claudeProcs, parseCpuBusy, parseCores, parseFreeShare, parseLaptop, parseLoad, parseMemMb } from '../hooks/core/crewlaptop'
import { setLang, tr } from '../hooks/core/lang'
import type { Laptop } from '../hooks/core/crewlaptop'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = new Date(2026, 9, 10, 22, 0).getTime()
const GB = 1024
const calm: Laptop = { at: NOW, pressure: 'normal', freeShare: 0.5, memMb: 24 * GB, load: 4, cpuBusy: 22, cores: 18, battery: { hasBattery: true, onAc: true, percent: 80 }, thermal: { state: 'ok' }, procs: { count: 3, rssMb: 4198 } }
const load = (running: number, over: Partial<AgentLoad> = {}): AgentLoad => ({ running, max: 3, capOn: true, ...over })

test('the three new readings: total memory, the load, the cores; text they cannot read gives nothing', () => {
  expect(parseMemMb('25769803776\n')).toBe(24576)
  expect(parseMemMb('lots')).toBeUndefined()
  expect(parseLoad('{ 4.06 4.77 6.37 }\n')).toBe(4.06)
  expect(parseLoad('4.06 4.77 6.37')).toBe(4.06)
  expect(parseLoad('{ high }')).toBeUndefined()
  expect(parseCores('18\n')).toBe(18)
  expect(parseCores('0')).toBeUndefined()
  const l = parseLaptop(NOW, { memsize: '25769803776', load: '{ 4.06 4.77 6.37 }', cores: '18' })
  expect([l.memMb, l.load, l.cores]).toEqual([24576, 4.06, 18])
})

test('the room is the smallest of the agent cap, memory and the processor', () => {
  expect(roomOf(calm, load(1), NOW)).toMatchObject({ n: 2, by: 'limit', parts: { memory: 8, processor: 7, limit: 2 } })
  expect(roomOf({ ...calm, freeShare: 0.1 }, load(0), NOW)).toMatchObject({ n: 1, by: 'memory' })
  expect(roomOf({ ...calm, load: 15, cpuBusy: undefined }, load(0), NOW)).toMatchObject({ n: 1, by: 'processor' })
  expect(roomOf({ ...calm, cpuBusy: 83 }, load(0), NOW)).toMatchObject({ n: 1, by: 'processor' })
  expect(roomOf(calm, load(0, { capOn: false }), NOW)).toMatchObject({ n: 7, by: 'processor' })
  expect(MB_PER_HELPER).toBe(1536)
  expect(CORES_PER_HELPER).toBe(2)
})

test('the room is 0 when memory pressure is up, heat slows the processor, or the battery is low and unplugged', () => {
  expect(roomOf({ ...calm, pressure: 'warn' }, load(0), NOW)).toMatchObject({ n: 0, by: 'pressure' })
  expect(roomOf({ ...calm, pressure: 'critical' }, load(0), NOW)).toMatchObject({ n: 0, by: 'pressure' })
  expect(roomOf({ ...calm, thermal: { state: 'slowed', speedLimit: 70 } }, load(0), NOW)).toMatchObject({ n: 0, by: 'heat' })
  expect(roomOf({ ...calm, battery: { hasBattery: true, onAc: false, percent: 12 } }, load(0), NOW)).toMatchObject({ n: 0, by: 'battery' })
  expect(roomOf({ ...calm, battery: { hasBattery: true, onAc: true, percent: 12 } }, load(0), NOW)?.n).toBe(3)
})

test('no reading, an old reading, or nothing to count from holds nothing back', () => {
  expect(roomOf(undefined, load(0), NOW)).toBeUndefined()
  expect(roomOf({ ...calm, at: NOW - ROOM_FRESH_MS - 1 }, load(0), NOW)).toBeUndefined()
  expect(roomOf({ at: NOW }, load(0, { capOn: false }), NOW)).toBeUndefined()
  expect(roomCap(undefined)).toBe(Infinity)
  expect(roomCap(roomOf(calm, load(1), NOW))).toBe(2)
})

test('the words: the room line, its reasons, the shares, the Claude and power lines, the text twin', () => {
  expect(roomLine(roomOf(calm, load(1), NOW)!)).toBe('Room for about 2 more agents')
  expect(roomLine(roomOf(calm, load(2), NOW)!)).toBe('Room for about 1 more agent')
  expect(roomLine(roomOf({ ...calm, pressure: 'warn' }, load(0), NOW)!)).toBe('Full: the Mac reports memory pressure')
  expect(roomLine(roomOf({ ...calm, freeShare: 0.01 }, load(0), NOW)!)).toBe('Full: memory is tight')
  expect(roomLine(roomOf(calm, load(3), NOW)!)).toBe('Full: the agent cap is reached')
  const why = roomReasons(roomOf(calm, load(1), NOW)!, calm, load(1))
  expect(why).toEqual([
    'Memory: 12.0 GB free of 24.0 GB. At about 1.5 GB per agent: room for 8.',
    'Processor: 14.0 of 18 cores idle. At about 2 per agent: room for 7.',
    'Agent cap: 1 of 3 running: room for 2.',
    'The smallest of these counts. The sizes per agent are guesses.',
  ])
  expect(roomReasons(roomOf({ ...calm, pressure: 'warn' }, load(0), NOW)!, { ...calm, pressure: 'warn' }, load(0))[0]).toBe('macOS itself reports memory pressure (warn), even if the share used looks fine, so no new agent should start.')
  expect(sharesLine(calm)).toBe('Memory 50% · processor 22%')
  expect(memoryHead(calm)).toBe('Memory 50% used · 12.0 GB free')
  expect(processorHead(calm)).toBe('Processor 22% busy · 18 cores')
  expect(claudeLine(calm, 2)).toBe('Claude: 3 sessions use 4.1 GB · 2 agents running')
  expect(powerLine(calm)).toBe('Battery 80%, plugged in · heat is fine')
  expect(powerLine({ at: NOW })).toBeUndefined()
  expect(computerText('on', roomOf(calm, load(1), NOW), calm)).toBe('Computer: room for about 2 more agents (memory 50%, processor 22%).')
  expect(computerText('off', undefined, undefined)).toMatch(/computer reading is off/)
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
function engine(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom'], ['cockpit:setting:detail', 'explained']])
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
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return mem
}

test('the Computer card offers Turn on while the gauge is off, then shows the room, the bars and the lines', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:cards.computer', 'show')
  mem.set('cockpit:setting:laptop.mode', 'off')
  mem.set('cockpit:setting:cap.max', 'n3')
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: { ...paneProps, bodyColumns: 120 } })
  const off = await mount()
  expect(await off.find({ type: 'Text', text: /^Computer$/ })).toBeDefined()
  expect(await off.find({ type: 'Text', text: /^The computer reading is off$/ })).toBeDefined()
  await off.press({ key: 'computer-on' })
  await off.unmount()
  expect(mem.get('cockpit:setting:laptop.mode')).toBe('on')
  mem.set('cockpit:laptop:v2', calm)
  const on1 = await mount()
  expect(await on1.find({ type: 'Text', text: /^Room for about 3 more agents$/ })).toBeDefined()
  for (const text of ['Memory', '50% used', '12.0 GB free', 'Processor', '22% busy', '18 cores']) expect(await on1.find({ type: 'Text', text }), text).toBeDefined()
  expect(await on1.find({ type: 'Text', text: /^Claude: 3 sessions use 4\.1 GB$/ })).toBeDefined()
  expect(await on1.find({ type: 'Text', text: /^Battery 80%, plugged in · heat is fine$/ })).toBeDefined()
  await on1.press({ key: 'press-ol-computer:room-0' })
  await on1.unmount()
  const open = await mount()
  expect(await open.find({ type: 'Text', text: /^Agent cap: 0 of 3 running: room for 3\.$/ })).toBeDefined()
  await open.unmount()
  await $.command.run({ ...viaParent('vaken-settings', 'detail.computer simple'), origin: { kind: 'composer' } } as never)
  const compact = await mount()
  expect(await compact.find({ type: 'Text', text: /^Memory 50% · processor 22%$/ })).toBeDefined()
  expect(await compact.find({ type: 'Text', text: /^Memory 50% used/ })).toBeUndefined()
  await compact.unmount()
})

test('while helpers run, the room is said once, on the Computer card (its home); the Agents note carries no room and the Computer card keeps its room line (kit item 98)', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:cap.max', 'n3')
  mem.set('cockpit:setting:look.columns', '1')
  mem.set('cockpit:setting:laptop.mode', 'on')
  mem.set('cockpit:laptop:v2', calm)
  mem.set('cockpit:agentboard', [{ id: 'tu1', agentId: 'ag1', session: 'test-ses', type: 'Explore', model: 'claude-haiku-4-5', what: 'Search the code', background: true, startedAt: NOW - 60_000, state: 'running' }])
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: { ...paneProps, bodyColumns: 120 } })
  const ui = await mount()
  expect(await ui.find({ type: 'Text', text: '1 running' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /room for \d more/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^Room for about \d more agents?$/ })).toBeDefined()
  await ui.press({ key: 'press-ol-computer:room-0' })
  await ui.unmount()
  const open = await mount()
  expect(await open.find({ type: 'Text', text: /^Agent cap: 1 of 3 running: room for 2\.$/ })).toBeDefined()
  await open.unmount()
})

const PS_MAC27 = [
  '  PID   RSS COMMAND',
  '  349 19952 /usr/libexec/logd',
  '  590 590384 /Applications/Claude.app/Contents/MacOS/Claude',
  '  1011 1248512 /Applications/Claude.app/Contents/Frameworks/Claude Helper (Renderer).app/Contents/MacOS/Claude Helper (Renderer) --type=renderer --lang=sv',
  '11566 703584 /Users/someone/Library/Application Support/Claude/claude-code/2.1.295/9d6405864fdc/claude.app/Contents/MacOS/claude --output-format stream-json --verbose --input-format stream-json',
  '72068 24768 /Users/someone/.local/bin/claude --chrome-native-host',
  '78346 584896 /Users/someone/Library/Application Support/Claude/claude-code/2.1.295/9d6405864fdc/claude.app/Contents/MacOS/claude --output-format stream-json --verbose --input-format stream-json',
].join('\n')
const VM_STAT_MAC27 = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                     8541.
Pages active:                                 361358.
Pages inactive:                               359867.
Pages speculative:                               556.
Pages throttled:                                   0.
Pages wired down:                             245225.
Pages purgeable:                                  20.
Pages occupied by compressor:                 534862.
`

test('macOS 27 sample: the program inside claude.app counts, the app, its helpers and the browser bridge do not', () => {
  expect(claudeProcs(PS_MAC27)).toEqual({ count: 2, rssMb: Math.round((703584 + 584896) / 1024) })
})

test('macOS 27 sample: vm_stat gives a free share, kept next to a readable pressure level', () => {
  const share = parseFreeShare(VM_STAT_MAC27)
  expect(share).toBeGreaterThan(0.2)
  expect(share).toBeLessThan(0.4)
  const l = parseLaptop(NOW, { pressure: '2', vmstat: VM_STAT_MAC27, ps: PS_MAC27, memsize: '25769803776' })
  expect([l.pressure, l.freeShare, l.procs?.count, l.memMb]).toEqual(['warn', share, 2, 24576])
})

test('the Claude line: a zero reading is "not counted", a small one is in MB, Swedish uses a comma', () => {
  expect(claudeLine({ at: NOW, procs: { count: 1, rssMb: 0 } })).toBe('Claude: sessions not counted')
  expect(claudeLine({ at: NOW, procs: { count: 0, rssMb: 0 } })).toBe('Claude: sessions not counted')
  expect(claudeLine({ at: NOW, procs: { count: 1, rssMb: 24 } })).toBe('Claude: 1 session uses 24 MB')
  expect(claudeLine({ at: NOW, procs: { count: 2, rssMb: 1258 } })).toBe('Claude: 2 sessions use 1.2 GB')
  setLang('sv')
  try {
    expect(claudeLine({ at: NOW, procs: { count: 2, rssMb: 1258 } }, undefined, tr)).toMatch(/1,2 GB/)
  } finally {
    setLang('en')
  }
})

test('on Auto the agent cap gives no count: the reasons say the computer decides', () => {
  const r = roomOf({ ...calm, at: NOW }, { running: 2, max: Infinity, capOn: true }, NOW)!
  expect(r.parts.limit).toBeUndefined()
  expect(r.by).not.toBe('limit')
  expect(roomReasons(r, { ...calm, at: NOW }, { running: 2, max: Infinity, capOn: true })).toContain('Agent cap: Auto, so the computer decides.')
  expect(roomOf({ ...calm, at: NOW }, { running: 2, max: 3, capOn: true }, NOW)!.parts.limit).toBe(1)
})

const CLAUDE_PATH = '/Users/someone/Library/Application Support/Claude/claude-code/2.1.295/9d6405864fdc/claude.app/Contents/MacOS/claude'
const DISCLAIMER = '/Applications/Claude.app/Contents/Helpers/disclaimer'
test('T1: the disclaimer wrapper line is not a session: 11 programs and 11 wrappers count 11', () => {
  const rows: string[] = ['  PID   RSS COMMAND']
  for (let n = 0; n < 11; n++) {
    rows.push(`${1000 + n} 600 ${DISCLAIMER} --pgroup -- ${CLAUDE_PATH} --output-format stream-json`)
    rows.push(`${2000 + n} 102400 ${CLAUDE_PATH} --output-format stream-json`)
  }
  expect(claudeProcs(rows.join('\n'))).toEqual({ count: 11, rssMb: 1100 })
  expect(claudeProcs(`1 600 ${DISCLAIMER} --pgroup -- ${CLAUDE_PATH}`)).toEqual({ count: 0, rssMb: 0 })
  expect(claudeProcs(`2 2048 ${CLAUDE_PATH} --note disclaimer`)).toEqual({ count: 1, rssMb: 2 })
})

const VM_STAT_THIS_MAC = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                   113999.
Pages active:                                 470756.
Pages inactive:                               463661.
Pages speculative:                              5669.
Pages throttled:                                   0.
Pages wired down:                             254296.
Pages purgeable:                                8844.
File-backed pages:                            222318.
Anonymous pages:                              717768.
Pages stored in compressor:                   372160.
Pages occupied by compressor:                 205779.
`
test('T4: memory used is app + wired + compressed over all pages, the way Activity Monitor counts it', () => {
  const share = parseFreeShare(VM_STAT_THIS_MAC)!
  const used = (717768 - 8844 + 254296 + 205779) / (113999 + 470756 + 463661 + 5669 + 254296 + 205779)
  expect(Math.abs(share - (1 - used))).toBeLessThan(1e-9)
  expect(Math.round((1 - share) * 100)).toBe(77)
  const old = VM_STAT_THIS_MAC.replace(/Anonymous pages:.*\n/, '')
  expect(Math.abs(parseFreeShare(old)! - (113999 + 463661 + 5669 + 8844) / (113999 + 470756 + 463661 + 5669 + 254296 + 205779))).toBeLessThan(1e-9)
})

test('T5: the processor is the busy share `top` gave; a Mac reading with only the load says "Load 6.0 of 18 cores", never busy', () => {
  expect(Math.round(parseCpuBusy('Processes: 800 total\nCPU usage: 2.6% user, 5.36% sys, 92.57% idle \nSharedLibs: 1M')! * 100)).toBe(796)
  expect(parseCpuBusy('CPU usage: 8,7% user, 0,0% sys, 91,3% idle')).toBe(8.7)
  expect(parseCpuBusy('nothing here')).toBeUndefined()
  const withTop: Laptop = { ...calm, load: 6, cpuBusy: 9 }
  expect(processorHead(withTop)).toBe('Processor 9% busy · 18 cores')
  expect(processorFact(withTop)).toEqual({ label: 'Processor', value: '9% busy', note: ['18 cores'] })
  expect(roomOf({ ...withTop, freeShare: 0.9 }, load(0, { capOn: false }), NOW)!.parts.processor).toBe(8)
  const loadOnly: Laptop = { ...calm, load: 6.02, cpuBusy: undefined }
  expect(processorHead(loadOnly)).toBe('Load 6.0 of 18 cores')
  expect(processorFact(loadOnly)).toEqual({ label: 'Load', value: '6.0 of 18 cores', note: [] })
  expect(sharesLine(loadOnly)).toBe('Memory 50% · load 6.0 of 18')
  const win: Laptop = { ...calm, win: true, cpuBusy: undefined, load: 9 }
  expect(processorFact(win)).toEqual({ label: 'Processor', value: '50% busy', note: ['18 cores'] })
})

test('T3: with memory not read the room is the smaller known part, at most 2, and the line says so', () => {
  const blind: Laptop = { ...calm, freeShare: undefined }
  const r = roomOf(blind, load(0, { max: 6 }), NOW)!
  expect(r.parts.memory).toBeUndefined()
  expect(r.parts.processor).toBe(7)
  expect(r.n).toBe(2)
  expect(r.memoryUnknown).toBe(true)
  expect(roomCap(r)).toBe(2)
  expect(roomLine(r)).toBe('Room for about 2 more agents, memory not read')
  expect(roomReasons(r, blind, load(0, { max: 6 }))[0]).toMatch(/holds at 2 at most/)
  expect(roomOf(blind, load(2, { max: 3 }), NOW)!.n).toBe(1)
  expect(roomOf(calm, load(0, { max: 6 }), NOW)!.memoryUnknown).toBeUndefined()
  expect(roomOf(calm, load(0, { max: 6 }), NOW)!.n).toBe(6)
})

test('T2: a reading with no stamp, or an older one, is not current; the card says another session runs an older vaken', () => {
  const old: Laptop = { ...calm, freeShare: undefined, procs: { count: 0, rssMb: 0 } }
  expect(olderCockpitNote(old)).toBe('Another session runs an older version of vaken, so some figures are not read. Restart it to read them all.')
  expect(olderCockpitNote({ ...old, schema: LAPTOP_SCHEMA })).toBeUndefined()
  expect(olderCockpitNote({ ...calm })).toBeUndefined()
  setLang('sv')
  expect(olderCockpitNote(old, tr)).toMatch(/äldre version av vaken/)
  setLang('en')
})
