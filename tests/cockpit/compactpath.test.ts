// One way to compact: the button, "Compact anyway", `/vaken-compact now` and Auto all run runCompaction.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Io } from '../hooks/core/io'
import { BRIEF_LINE } from '../hooks/core/compactwords'
import { KEEP_WORDS_MAX, cardText } from '../hooks/core/compactmoment'
import { defaults } from '../hooks/core/settings'
import { tEn } from '../hooks/i18n/t'
import { claimCompacting, compacting, keepList, releaseCompacting, runCompaction, setAutoSaver } from '../hooks/features/compaction'
import type { CompactOps } from '../hooks/features/compaction'
import { compactAnyway, compactCheckLines, compactNotNow, compactNow } from '../hooks/features/home/actions'
import type { HomeEngine } from '../hooks/features/home/engine'
import { compactAsk } from '../hooks/features/home/state'
import { test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-13T12:00:00Z')
const MIN = 60_000
// Each case runs two hours after the one before, so the 20-minute gap one case sets never stands in the next.
let slot = 0
const nextNow = (): number => NOW + ++slot * 120 * MIN

const SHOWN = '~/.claude/cockpit/briefs/brief-x.md'
// What every vaken compaction asks of Claude's summary, then the handoff note's place
const summaryLine = tEn('cardcompact.keep_summary')
const briefLine = `${summaryLine}\n${BRIEF_LINE.replace('{where}', SHOWN)}`

const goodRecord = (sid: string, now: number, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  sessionId: sid,
  cwd: '/work/app',
  model: 'claude-opus-5',
  state: 'idle',
  startedAt: now - 90 * MIN,
  updatedAt: now,
  lastEventAt: now,
  stateSince: now - 10 * MIN,
  title: 'fix login',
  branch: 'feat-x',
  contextPercent: 85,
  ctx: { tokens: 200_000, window: 235_000, compactAt: 95 },
  cache: { read: 100, write: 0, fresh: 0, at: now + 5 * MIN },
  ...over,
})

type World = { io: Io; mem: Map<string, unknown>; toasts: string[]; sent: string[]; saved: number; eng: HomeEngine; ops: CompactOps; sid: string }

// A store in memory with one session, a saver that counts its saves (ok unless `saveFails`).
function world(record: (sid: string, now: number) => Record<string, unknown> = goodRecord, o: { saveFails?: boolean; card?: 'on' | 'off'; commandFails?: boolean } = {}): World {
  const now = nextNow()
  const sid = `sid-${slot}`
  const mem = new Map<string, unknown>([[`cockpit:session:${sid}`, record(sid, now)]])
  if (o.card !== undefined) mem.set('cockpit:setting:compact.card', o.card)
  const toasts: string[] = []
  const sent: string[] = []
  const io: Io = {
    now: async () => now,
    home: async () => '/home/test',
    sessionId: async () => sid,
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, v),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: text => void toasts.push(text),
    invalidate: () => undefined,
  }
  const w: World = { io, mem, toasts, sent, saved: 0, sid, eng: undefined as unknown as HomeEngine, ops: undefined as unknown as CompactOps }
  setAutoSaver(async () => {
    w.saved += 1
    return o.saveFails === true ? { ok: false } : { ok: true, name: 'brief-x.md', shown: SHOWN, checkpoint: true }
  })
  const command = async (args: string): Promise<unknown> => {
    if (o.commandFails === true) throw new Error('no command here')
    sent.push(args)
    return { text: 'Compacted' }
  }
  w.eng = { io: () => io, cwd: async () => '/work/app', command: async (a: { args?: string }) => command(a.args ?? ''), agentsRunning: async () => 0, probe: async () => undefined } as unknown as HomeEngine
  w.ops = { io, cwd: async () => '/work/app', probe: async () => undefined, agents: async () => 0, command }
  return w
}

const ledger = (w: World): { what: string; detail?: string }[] => (w.mem.get('cockpit:ledger:compact') as { what: string; detail?: string }[] | undefined) ?? []

test('the default mode is Watch only', () => {
  expect(defaults()['compact.mode']).toBe('watch')
})

test('a press with every check passing compacts at once, the handoff note saved first', async () => {
  const w = world()
  await compactNow(w.eng)
  expect(compactAsk.lines).toBeUndefined()
  expect(w.saved).toBe(1)
  expect(w.sent.length).toBe(1)
  expect(w.sent[0]).toBe(`${await keepList(w.io, w.sid)}\n${briefLine}`)
  expect(ledger(w).some(e => e.what === 'compact now (button)')).toBe(true)
  expect(compacting.pending).toBe(false)
})

test('a press with a failing check asks instead: why, one line each; nothing is saved or sent', async () => {
  const w = world((sid, now) => goodRecord(sid, now, { state: 'working' }))
  await compactNow(w.eng)
  expect(compactAsk.lines).toContain('Claude is still answering')
  expect(w.saved).toBe(0)
  expect(w.sent).toEqual([])
  compactNotNow(w.eng)
  expect(compactAsk.lines).toBeUndefined()
  expect(w.sent).toEqual([])
})

test('Compact anyway compacts past the failing checks, the handoff note saved first', async () => {
  const w = world((sid, now) => goodRecord(sid, now, { state: 'working' }))
  await compactNow(w.eng)
  expect(compactAsk.lines?.length ?? 0).toBeGreaterThan(0)
  await compactAnyway(w.eng)
  expect(compactAsk.lines).toBeUndefined()
  expect(w.saved).toBe(1)
  expect(w.sent.length).toBe(1)
  expect(w.sent[0].endsWith(briefLine)).toBe(true)
})

test('a press while a compaction runs does nothing', async () => {
  const w = world()
  const owner = claimCompacting('auto')
  try {
    await compactNow(w.eng)
    await compactAnyway(w.eng)
    expect(compactAsk.lines).toBeUndefined()
    expect(w.saved).toBe(0)
    expect(w.sent).toEqual([])
  } finally {
    if (owner !== undefined) releaseCompacting(owner)
  }
  expect(compacting.pending).toBe(false)
})

test('the button and Auto at once: only one runs, and only its owner lets the flag go', async () => {
  const w = world()
  const auto = runCompaction({ how: 'auto', sessionId: w.sid, ops: w.ops })
  const press = runCompaction({ how: 'button', sessionId: w.sid, ops: w.ops })
  expect(await press).toBe('busy')
  expect(await auto).toBe('sent')
  expect(w.sent.length).toBe(1)
  expect(w.saved).toBe(1)
  expect(compacting.pending).toBe(false)
  // A stale holder cannot clear a flag another holds.
  const a = claimCompacting('button')
  releaseCompacting(-1)
  expect(compacting.pending).toBe(true)
  if (a !== undefined) releaseCompacting(a)
  expect(compacting.pending).toBe(false)
})

test('a press sets the 20-minute gap, so Auto does not compact soon after it', async () => {
  const w = world()
  expect(await compactCheckLines(w.eng, tEn)).toEqual([])
  await compactAnyway(w.eng)
  expect(w.sent.length).toBe(1)
  expect(await compactCheckLines(w.eng, tEn)).toContain('Compacted 0 min ago')
})

test('with What Claude keeps off, the button sends a plain /compact with the brief line only', async () => {
  const w = world(goodRecord, { card: 'off' })
  await compactAnyway(w.eng)
  expect(w.sent).toEqual([briefLine])
})

test('with What Claude keeps off, Auto sends the brief line only', async () => {
  const w = world(goodRecord, { card: 'off' })
  const direct: string[] = []
  const r = await runCompaction({ how: 'auto', sessionId: w.sid, ops: { ...w.ops, direct: async instructions => (direct.push(instructions), { tokensBefore: 200_000, tokensAfter: 20_000 }) } })
  expect(r).toBe('sent')
  expect(direct).toEqual([briefLine])
  expect(w.sent).toEqual([])
})

test('Auto falls back to /compact when the direct call is refused, and gives up when both fail', async () => {
  const w = world()
  const refused = async (): Promise<never> => {
    throw new Error('not available in this host')
  }
  expect(await runCompaction({ how: 'auto', sessionId: w.sid, ops: { ...w.ops, direct: refused } })).toBe('sent')
  expect(w.sent.length).toBe(1)
  expect(ledger(w).some(e => e.what === 'auto-compact sent as /compact')).toBe(true)
  const w2 = world(goodRecord, { commandFails: true })
  expect(await runCompaction({ how: 'auto', sessionId: w2.sid, ops: { ...w2.ops, direct: refused } })).toBe('failed')
  expect(ledger(w2).find(e => e.what === 'auto-compact could not run')?.detail).toBe('not available in this host | no command here')
  expect(compacting.pending).toBe(false)
})

test('the button saves a brief first; a brief it cannot save stops it with a toast', async () => {
  const w = world(goodRecord, { saveFails: true })
  expect(await runCompaction({ how: 'button', sessionId: w.sid, ops: w.ops })).toBe('no-brief')
  expect(w.sent).toEqual([])
  expect(w.toasts).toContain('Not compacted: could not save the handoff note. Type /compact yourself.')
})

test('every keep-list line is cut to a short line', () => {
  const long = 'x'.repeat(500)
  expect(cardText({ title: long, branch: long }).length).toBeLessThan(2 * KEEP_WORDS_MAX + 100)
})

test('/vaken-compact now compacts anyway, and its reply names the checks that fail', async ($, on) => {
  const now = nextNow()
  const clock = mock.clock(on, { now })
  const mem = new Map<string, unknown>([['cockpit:session:test-session', goodRecord('test-session', now, { contextPercent: 20 })]])
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
  mock.env(on, { HOME: '/home/test' })
  stubEngine(on)
  const ran: string[] = []
  on('command.run', { command: 'compact' }, (_$, e) => {
    ran.push(e.args)
    return { text: 'Compacted' }
  })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  const reply = (await $.command.run({ ...viaParent('vaken-compact', 'now'), origin: { kind: 'composer' } } as never)) as { text: string }
  expect(reply.text).toMatch(/^Compacting the session in a moment/)
  expect(reply.text).toContain('Not a good moment by the checks; compacting anyway because you asked:')
  expect(reply.text).toContain('  Not time yet: the session is not full and no break is near its end')
  await clock.advance(2000)
  await clock.settle()
  expect(ran.length).toBe(1)
  expect(ran[0]).toContain('A handoff note of this session is saved as')
})

function stubEngine(on: On): void {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('fs.write', () => ({ value: undefined }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'feat-x\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
}
