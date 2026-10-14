// One leader for the shared scans.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { LEADER_CHECK_MS, LEADER_LEASE_MS, LEADER_SCHEMA, LEADER_RENEW_MS, leaseVerdict, parseLease, scanDue } from '../hooks/core/leader'
import type { Lease } from '../hooks/core/leader'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000

test('the lease: free or gone is taken, the holder renews each minute, a busy session takes it from a quiet one, else it follows', () => {
  const lease: Lease = { sid: 'a', pid: 7, until: NOW + LEADER_LEASE_MS, quiet: false }
  expect(leaseVerdict(undefined, { sid: 'b', quiet: false }, NOW, false)).toBe('take')
  expect(leaseVerdict(lease, { sid: 'b', quiet: false }, NOW, true)).toBe('take')
  expect(leaseVerdict(lease, { sid: 'b', quiet: false }, NOW + LEADER_LEASE_MS, false)).toBe('take')
  expect(leaseVerdict(lease, { sid: 'b', quiet: true }, NOW + MIN, false)).toBe('follow')
  expect(leaseVerdict(lease, { sid: 'a', quiet: false }, NOW + 10_000, false)).toBe('lead')
  expect(leaseVerdict(lease, { sid: 'a', quiet: false }, NOW + LEADER_RENEW_MS, false)).toBe('renew')
  expect(leaseVerdict(lease, { sid: 'a', quiet: true }, NOW + 10_000, false)).toBe('renew')
  expect(leaseVerdict({ ...lease, quiet: true }, { sid: 'b', quiet: false }, NOW + 10_000, false)).toBe('take')
  expect(leaseVerdict({ ...lease, quiet: true }, { sid: 'b', quiet: true }, NOW + 10_000, false)).toBe('follow')
  expect(leaseVerdict(lease, { sid: 'b', quiet: false, v: LEADER_SCHEMA }, NOW + 10_000, false)).toBe('take')
  expect(leaseVerdict({ ...lease, v: LEADER_SCHEMA }, { sid: 'b', quiet: false, v: LEADER_SCHEMA }, NOW + 10_000, false)).toBe('follow')
  expect(leaseVerdict({ ...lease, v: LEADER_SCHEMA }, { sid: 'b', quiet: false }, NOW + 10_000, false)).toBe('follow')
  expect(parseLease({ sid: 'a', until: NOW, quiet: false, v: 2 })).toEqual({ sid: 'a', until: NOW, quiet: false, v: 2 })
  expect(parseLease({ sid: 'a', until: 5 })).toEqual({ sid: 'a', until: 5, quiet: false })
  expect(parseLease({ sid: '', until: 5 })).toBe(undefined)
  expect(parseLease('a')).toBe(undefined)
})

test('a stale answer: the leader refreshes it; another session only when it is twice the period old (a quiet leader: twice a minute at least)', () => {
  expect(scanDue(undefined, MIN, NOW, false, false)).toBe(true)
  expect(scanDue(NOW - MIN, MIN, NOW, true, false)).toBe(true)
  expect(scanDue(NOW - MIN, MIN, NOW, false, false)).toBe(false)
  expect(scanDue(NOW - 2 * MIN, MIN, NOW, false, false)).toBe(true)
  expect(scanDue(NOW - 50_000, 20_000, NOW, false, false)).toBe(true)
  expect(scanDue(NOW - 50_000, 20_000, NOW, false, true)).toBe(false)
})

type Scan = { tickMs: number; freshMs: number; periodMs: number; durMs: number }
function simulate(scans: Record<string, Scan>, phases: number[], withLeader: boolean): Record<string, number> {
  const sids = phases.map((_, n) => `s${n}`)
  const at = new Map<string, number>()
  const landing: { name: string; start: number; land: number }[] = []
  let lease: Lease | undefined
  const known = new Map<string, { at: number; leads: boolean }>()
  const runs: Record<string, number> = Object.fromEntries(Object.keys(scans).map(n => [n, 0]))
  for (let t = 0; t <= 10 * MIN; t += 1_000) {
    for (const w of landing.filter(x => x.land <= t)) at.set(w.name, Math.max(at.get(w.name) ?? w.start, w.start))
    for (let k = landing.length - 1; k >= 0; k -= 1) if ((landing[k]?.land ?? 0) <= t) landing.splice(k, 1)
    const seen = lease
    let wrote: Lease | undefined
    phases.forEach((phase, n) => {
      const sid = sids[n] ?? ''
      for (const [name, scan] of Object.entries(scans)) {
        if (t < phase || (t - phase) % scan.tickMs !== 0) continue
        const last = at.get(name)
        if (last !== undefined && t - last < scan.freshMs) continue
        if (withLeader && last !== undefined) {
          let k = known.get(sid)
          if (k === undefined || t - k.at >= LEADER_CHECK_MS) {
            const v = leaseVerdict(seen, { sid, quiet: false }, t, false)
            if (v === 'take' || v === 'renew') wrote = { sid, until: t + LEADER_LEASE_MS, quiet: false }
            k = { at: t, leads: v !== 'follow' }
            known.set(sid, k)
          }
          if (!scanDue(last, scan.periodMs, t, k.leads, false)) continue
        }
        runs[name] = (runs[name] ?? 0) + 1
        landing.push({ name, start: t, land: t + scan.durMs })
      }
    })
    if (wrote !== undefined) lease = wrote
  }
  return runs
}

const SCANS: Record<string, Scan> = {
  usage: { tickMs: 30_000, freshMs: MIN, periodMs: MIN, durMs: 1_000 },
  sessions: { tickMs: 30_000, freshMs: MIN, periodMs: MIN, durMs: 1_000 },
  inbox: { tickMs: 20_000, freshMs: 10_000, periodMs: 20_000, durMs: 1_000 },
  laptop: { tickMs: 30_000, freshMs: 3 * MIN, periodMs: 2 * MIN, durMs: 2_000 },
}

test('three sessions for ten minutes: each shared scan ran up to three times over; with a leader about once', () => {
  const together = simulate(SCANS, [0, 0, 0], false)
  const togetherLed = simulate(SCANS, [0, 0, 0], true)
  const apart = simulate(SCANS, [0, 10_000, 20_000], false)
  const apartLed = simulate(SCANS, [0, 10_000, 20_000], true)
  expect({ together, togetherLed, apart, apartLed }).toEqual({
    together: { usage: 33, sessions: 33, inbox: 93, laptop: 12 },
    togetherLed: { usage: 13, sessions: 13, inbox: 37, laptop: 6 },
    apart: { usage: 11, sessions: 11, inbox: 91, laptop: 4 },
    apartLed: { usage: 10, sessions: 10, inbox: 31, laptop: 4 },
  })
})

type Counts = { usage: number; context: number; sessions: number; laptop: number; inboxLooks: number; ps: number; leaseWrites: number; runs: number; calls: number; writes: number }
const zero = (): Counts => ({ usage: 0, context: 0, sessions: 0, laptop: 0, inboxLooks: 0, ps: 0, leaseWrites: 0, runs: 0, calls: 0, writes: 0 })
const USAGE_TEXT = JSON.stringify({ plan: { status: 'ok', windows: [{ label: '5-hour', percentUsed: 10 }] } })
const LAPTOP_PROGRAMS = new Set(['vm_stat', 'pmset', 'sysctl'])

const rec = (id: string, pid: number, now: number) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'idle', startedAt: now - 20 * MIN, updatedAt: now, lastEventAt: now, stateSince: now, pid })

function engine(on: On, mem: Map<string, unknown>, alive: Set<number>): Counts {
  const c = zero()
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    c.writes += 1
    if (e.key === 'cockpit:inbox:held') c.inboxLooks += 1
    if (e.key === 'cockpit:leader') c.leaseWrites += 1
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('session.id', () => ({ value: 'me' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.panes', () => ({ value: [] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/work/me' }) as never)
  on('session.root', () => ({ value: '/work/me' }) as never)
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  on('agent.list', () => ({ value: [] }) as never)
  on('process.run', (_$, e) => {
    c.runs += 1
    const argv = [...e.argv]
    let stdout = ''
    if (argv[0] === 'sh') stdout = '4242\n'
    if (argv[0] === 'ps' && argv[1] === '-p') {
      c.ps += 1
      stdout = (argv[2] ?? '').split(',').filter(p => alive.has(Number(p))).join('\n')
    }
    if (LAPTOP_PROGRAMS.has(argv[0] ?? '') || (argv[0] === 'ps' && argv[1] === '-axo')) c.laptop += 1
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('mcp.call', (_$, e) => {
    c.calls += 1
    const args = (e.args ?? {}) as Record<string, unknown>
    if (e.tool === 'list_sessions') c.sessions += 1
    else if (e.tool === 'get_usage' && args.session_id !== undefined) c.context += 1
    else if (e.tool === 'get_usage') c.usage += 1
    return { value: { content: [{ type: 'text', text: e.tool === 'list_sessions' ? '[]' : USAGE_TEXT }] } } as never
  })
  return c
}

function playLeader(mem: Map<string, unknown>, now: number, quietFrom = Number.POSITIVE_INFINITY): void {
  if (now >= quietFrom) return
  const t = now - NOW
  if (t % MIN === 0) {
    mem.set('cockpit:leader', { sid: 'lead', pid: 777, until: now + LEADER_LEASE_MS, quiet: false, v: LEADER_SCHEMA })
    mem.set('cockpit:session:lead', rec('lead', 777, now))
    mem.set('cockpit:usage:app', { at: now, windows: [{ label: '5-hour', percent: 10 }] })
    mem.set('cockpit:sessions:app', { at: now, sessions: [] })
  }
  if (t % 20_000 === 0) mem.set('cockpit:inbox:held', { at: now, held: 0 })
  if (t % (3 * MIN) === 0) mem.set('cockpit:laptop:v2', { at: now, schema: 3 })
}

const world = (): Map<string, unknown> => new Map<string, unknown>([['cockpit:setting:laptop.mode', 'on'], ['cockpit:firstrun', 'done']])

async function tenMinutes($: Parameters<Parameters<typeof test>[1]>[0], clock: { advance: (ms: number) => Promise<void> }, mem: Map<string, unknown>, c: Counts, leader: ((now: number) => void) | undefined): Promise<Counts> {
  leader?.(NOW)
  await $.session.start({ cwd: '/work/me', surface: 'desktop', isInteractive: true } as never)
  await clock.advance(0)
  const start = { ...c }
  for (let k = 1; k <= 60; k += 1) {
    leader?.(NOW + k * 10_000)
    await clock.advance(10_000)
  }
  return Object.fromEntries(Object.entries(c).map(([key, v]) => [key, v - (start[key as keyof Counts] ?? 0)])) as Counts
}

test('a follower runs none of the shared scans for ten minutes: no plan usage, no session list, no laptop programs, no inbox look', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = world()
  const c = engine(on, mem, new Set([777, 4242]))
  const d = await tenMinutes($, clock, mem, c, now => playLeader(mem, now))
  expect({ usage: d.usage, sessions: d.sessions, laptop: d.laptop, inboxLooks: d.inboxLooks, leaseWrites: d.leaseWrites }).toEqual({ usage: 0, sessions: 0, laptop: 0, inboxLooks: 0, leaseWrites: 0 })
  expect(d.context).toBeGreaterThan(0)
  expect((mem.get('cockpit:leader') as Lease).sid).toBe('lead')
})

test('alone, a session leads: it runs every shared scan as before, and renews its lease about once a minute', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = world()
  const c = engine(on, mem, new Set([4242]))
  const d = await tenMinutes($, clock, mem, c, undefined)
  expect(d.usage).toBeGreaterThanOrEqual(9)
  expect(d.sessions).toBeGreaterThanOrEqual(9)
  expect(d.laptop).toBeGreaterThanOrEqual(3 * 4)
  expect(d.inboxLooks).toBeGreaterThanOrEqual(15)
  expect(d.leaseWrites).toBeGreaterThanOrEqual(8)
  expect(d.leaseWrites).toBeLessThanOrEqual(11)
  expect((mem.get('cockpit:leader') as Lease).sid).toBe('me')
})

test('a leader whose process is gone is taken over within half a minute', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = world()
  const c = engine(on, mem, new Set([4242]))
  const d = await tenMinutes($, clock, mem, c, now => {
    if (now === NOW) playLeader(mem, now)
  })
  expect((mem.get('cockpit:leader') as Lease).sid).toBe('me')
  expect(d.usage).toBeGreaterThanOrEqual(8)
})

test('a stuck leader (alive, lease kept, answers old): another session refreshes each answer once it is twice its period old', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = world()
  const c = engine(on, mem, new Set([777, 4242]))
  const d = await tenMinutes($, clock, mem, c, now => {
    if ((now - NOW) % MIN === 0) {
      mem.set('cockpit:leader', { sid: 'lead', pid: 777, until: now + LEADER_LEASE_MS, quiet: false, v: LEADER_SCHEMA })
      mem.set('cockpit:session:lead', rec('lead', 777, now))
    }
    if (now === NOW) playLeader(mem, now)
  })
  expect((mem.get('cockpit:leader') as Lease).sid).toBe('lead')
  expect(d.usage).toBeGreaterThanOrEqual(3)
  expect(d.usage).toBeLessThanOrEqual(6)
  expect(d.sessions).toBeGreaterThanOrEqual(3)
})
