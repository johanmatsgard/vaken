// Away recap and the Away mode.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import {
  AWAY_SETTINGS,
  AWAY_WHATS,
  DIGEST_WHAT,
  DURATION_HELP,
  LEDGER_FULL,
  NO_DIGEST,
  awayCall,
  buildDigest,
  costSince,
  digestText,
  modeLines,
  parseDigest,
  parseDuration,
  parseEvents,
  parseRun,
  parseSaved,
  restoreLines,
  watchEvents,
} from '../hooks/core/away'
import type { AwayEvent, DigestFacts } from '../hooks/core/away'
import { awayCheck } from '../hooks/features/away'
import type { Io } from '../hooks/core/io'
import { buildInbox } from '../hooks/core/inbox'
import { AWAY_DENY_WHAT, AWAY_OFF_WHAT, AWAY_ON_WHAT } from '../hooks/core/guardworld'
import type { Entry } from '../hooks/core/ledger'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const MIN = 60_000
const HOUR = 60 * MIN
const NOW = Date.parse('2026-10-10T12:00:00Z')

test('the Settings row: group Attention, On or Off, On by default', () => {
  expect(AWAY_SETTINGS.map(s => s.key)).toEqual(['away.digest'])
  expect(AWAY_SETTINGS[0]?.group).toBe('Attention')
  expect(AWAY_SETTINGS[0]?.options.map(o => o.value)).toEqual(['on', 'off'])
  expect(AWAY_SETTINGS[0]?.default).toBe('on')
})

test('the digest has one ledger title', () => {
  expect(AWAY_WHATS).toEqual(['Ended away mode with a digest'])
})

test('a time: 2h, 90m, 1h30m, 1.5 hours; nothing under 1 minute or over 24 hours', () => {
  expect(parseDuration('2h')).toBe(2 * HOUR)
  expect(parseDuration('90m')).toBe(90 * MIN)
  expect(parseDuration('1h30m')).toBe(90 * MIN)
  expect(parseDuration('1 h 30 min')).toBe(90 * MIN)
  expect(parseDuration('1.5 hours')).toBe(90 * MIN)
  expect(parseDuration('for 45 minutes')).toBe(45 * MIN)
  expect(parseDuration('1m')).toBe(MIN)
  expect(parseDuration('24h')).toBe(24 * HOUR)
  for (const bad of ['0m', '30s', '25h', '2', 'soon', '', '90m30m', '2d']) expect(parseDuration(bad), bad).toBeUndefined()
})

test('/vaken-away words: the time is cut off and the old switch gets a plain "on"; the rest is the old switch\'s', () => {
  expect(awayCall('on 2h')).toEqual({ ask: { kind: 'on' }, forMs: 2 * HOUR, passArgs: 'on' })
  expect(awayCall('ON for 90m')).toEqual({ ask: { kind: 'on' }, forMs: 90 * MIN, passArgs: 'on' })
  expect(awayCall('on')).toEqual({ ask: { kind: 'on' }, passArgs: 'on' })
  expect(awayCall('off')).toEqual({ ask: { kind: 'off' }, passArgs: 'off' })
  expect(awayCall('')).toEqual({ ask: { kind: 'status' }, passArgs: '' })
  expect(awayCall('on soon')).toMatchObject({ durationError: DURATION_HELP })
  expect(awayCall('dance')).toMatchObject({ ask: { kind: 'bad' }, passArgs: 'dance' })
  expect(awayCall('dance').durationError).toBeUndefined()
})

test('the records read back; anything odd gives nothing', () => {
  expect(parseRun({ at: 5, until: 9, costBase: { a: 1.5, b: 'x' } })).toEqual({ at: 5, until: 9, costBase: { a: 1.5 } })
  expect(parseRun({ at: 5 })).toEqual({ at: 5, costBase: {} })
  expect(parseRun('x')).toBeUndefined()
  expect(parseSaved({ policy: { old: null, set: 'careful' }, budget: { old: 'warn', set: 'stop', limit: 25 } })).toEqual({ policy: { old: null, set: 'careful' }, budget: { old: 'warn', set: 'stop', limit: 25 } })
  expect(parseSaved({ policy: { old: 3, set: 'careful' } })).toEqual({})
  expect(parseSaved(undefined)).toEqual({})
  expect(parseEvents([{ id: 'x', sid: 's', name: 'n', kind: 'needs', at: 1 }, { id: 'y' }]).length).toBe(1)
  expect(parseDigest({ at: 1, from: 0, to: 1, text: 't' })).toEqual({ at: 1, from: 0, to: 1, text: 't' })
  expect(parseDigest({ at: 1 })).toBeUndefined()
})

test('the mode lines name only what vaken really set, and the end time', () => {
  const run = { at: NOW, until: NOW + 2 * HOUR, costBase: {} }
  const all = modeLines(run, { policy: { old: null, set: 'careful' }, budget: { old: 'warn', set: 'stop', limit: 25 } }, NOW)
  expect(all[0]).toMatch(/^Away mode is on since \d\d:\d\d\. It ends at \d\d:\d\d \(in 2 h\), or when you type \/vaken-away off\.$/)
  expect(all.slice(1)).toEqual([
    'Vaken set the away policy to Careful (it was Off): risky steps are stopped by themselves.',
    'Vaken set the cost budget to Stop at $25.00 a session (it was Warn): costly calls stop at 100%.',
    'Both go back when away mode ends.',
  ])
  expect(modeLines({ at: NOW, costBase: {} }, {}, NOW)).toEqual([expect.stringMatching(/stays on until you type \/vaken-away off\.$/)])
  expect(modeLines(run, { policy: { old: 'off', set: 'careful' } }, NOW).slice(1).join(' ')).not.toMatch(/budget/)
  expect(restoreLines({ policy: { old: null, set: 'careful' }, budget: { old: 'warn', set: 'stop' } }, { policy: 'back', budget: 'kept' })).toEqual(['The away policy is back to Off.', 'The cost budget stays as you changed it.'])
  expect(restoreLines({}, {})).toEqual([])
})

const row = (sid: string, kind: string, since: number, name = sid) => ({ sid, name, kind, since })

test('sessions that finished or needed you since the mode began are noticed once', () => {
  let ev = watchEvents([row('a', 'waiting', NOW + MIN), row('b', 'needs', NOW + 2 * MIN), row('c', 'working', NOW + MIN), row('d', 'waiting', NOW - MIN), row('e', 'idle', NOW + MIN)], NOW, [])
  expect(ev.map(x => x.id)).toEqual([`finished:a:${NOW + MIN}`, `needs:b:${NOW + 2 * MIN}`])
  expect(watchEvents([row('a', 'waiting', NOW + MIN)], NOW, ev)).toEqual(ev)
  ev = watchEvents([row('a', 'waiting', NOW + 9 * MIN)], NOW, ev)
  expect(ev.length).toBe(3)
})

test('cost while away: each session\'s rise since the start; a session that began later counts all of it', () => {
  expect(Math.round(costSince({ a: 1, b: 2 }, { a: 2.5, b: 2, c: 0.5 }) * 1000) / 1000).toBe(2)
  expect(costSince({ a: 5 }, { a: 4 })).toBe(0)
  expect(costSince({}, {})).toBe(0)
})

const ev = (kind: AwayEvent['kind'], sid: string, at: number): AwayEvent => ({ id: `${kind}:${sid}:${at}`, sid, name: sid, kind, at })
const done = (what: string, at: number, session = 'a'): Entry => ({ at, session, what, did: true, how: 'auto' })
const base = (over: Partial<DigestFacts> = {}): DigestFacts => ({ from: NOW, to: NOW + 130 * MIN, ledger: [], events: [], waiting: [], ended: true, ...over })

test('the digest in one line: sessions that finished, that needed you, risky steps refused, the cost', () => {
  const d = buildDigest(
    base({
      events: [ev('finished', 'a', NOW + MIN), ev('finished', 'b', NOW + 2 * MIN), ev('finished', 'c', NOW + 3 * MIN), ev('finished', 'c', NOW + 4 * MIN), ev('needs', 'd', NOW + 5 * MIN)],
      ledger: [done(AWAY_DENY_WHAT, NOW + 10 * MIN), done('Held a risky command', NOW + 20 * MIN), done(AWAY_ON_WHAT, NOW), done(AWAY_OFF_WHAT, NOW + 130 * MIN)],
      spent: 4.2,
    }),
  )
  expect(d.headline).toBe('While you were away (2 h 10 min): 3 sessions finished, 1 session needed you, 2 risky steps were stopped, about $4.20 spent (estimate).')
  expect(d.text.split('\n')[0]).toBe(d.headline)
  expect(d.text).toMatch(/\nNothing waits for you\.$/)
})

test('one of each reads in the singular; a budget stop is named apart; nothing at all is said so', () => {
  expect(buildDigest(base({ events: [ev('finished', 'a', NOW + MIN)], ledger: [done(AWAY_DENY_WHAT, NOW + MIN), done('Held a call over budget', NOW + MIN)] })).headline).toBe(
    'While you were away (2 h 10 min): 1 session finished, 1 risky step was stopped, 1 costly call was stopped by the budget.',
  )
  expect(buildDigest(base()).headline).toBe('Nothing happened while you were away.')
  expect(buildDigest(base()).text).toBe('Nothing happened while you were away.')
  const waits = buildInbox({ now: NOW + 130 * MIN, sessions: [{ sid: 's0', name: 'Job 0', here: false }], ledger: [], allowed: [], asks: [{ sid: 's0', kind: 'question' as const, tool: 'AskUserQuestion', since: NOW }], debts: [], halts: [], seen: {} })
  expect(buildDigest(base({ waiting: waits })).text).toMatch(/^Nothing happened while you were away\.\n\nWaiting for you:/)
  expect(buildDigest(base({ ledger: [done('Kept the cache warm', NOW + MIN)] })).headline).toBe('Little happened while you were away.')
  expect(buildDigest(base({ spent: 0 })).headline).not.toMatch(/spent/)
})

test('what waits is listed with the session and the way out; more than eight are counted; the rest of vaken\'s work is named', () => {
  const sessions = Array.from({ length: 10 }, (_, k) => ({ sid: `s${k}`, name: `Job ${k}`, here: false }))
  const waiting = buildInbox({ now: NOW + 130 * MIN, sessions, ledger: [], allowed: [], asks: sessions.map((s, k) => ({ sid: s.sid, kind: 'question' as const, tool: 'AskUserQuestion', since: NOW + k * MIN })), debts: [], halts: [], seen: {} })
  const d = buildDigest(base({ waiting, ledger: [done('Kept the cache warm', NOW + MIN), done('Kept the cache warm', NOW + 2 * MIN), done('Caught a repeating step', NOW + 3 * MIN)] }))
  expect(d.text).toMatch(/\nWaiting for you:\n- Job 0: Asks you a question\. Waiting 2 h\. Open that session and answer it\.\n/)
  expect(d.text).toMatch(/- and 2 more\. \/vaken inbox lists them all\./)
  expect(d.text).toMatch(/\n\nVaken also did this: Kept the cache warm 2 times\. Caught a repeating step once\.$/)
})

test('lines before the switch, after the end, or not marked as actions of vaken do not count; "so far" says so', () => {
  const d = buildDigest(base({ ended: false, ledger: [done(AWAY_DENY_WHAT, NOW - MIN), done(AWAY_DENY_WHAT, NOW + 131 * MIN), { at: NOW + MIN, what: AWAY_DENY_WHAT, session: 'a' }, done(DIGEST_WHAT, NOW + MIN)] }))
  expect(d.headline).toBe('Nothing happened yet while you are away.')
})

test('a full ledger that starts after the switch may have lost lines, and the digest says so', () => {
  const full = Array.from({ length: LEDGER_FULL }, (_, k) => done('Kept the cache warm', NOW + (LEDGER_FULL - k) * MIN))
  expect(buildDigest(base({ ledger: full })).text).toMatch(/keeps only the last 60 entries/)
  expect(buildDigest(base({ ledger: full.slice(0, 5) })).text).not.toMatch(/keeps only/)
  expect(buildDigest(base({ ledger: [...full, done('Old', NOW - MIN)] })).text).not.toMatch(/keeps only/)
})

test('a saved digest shows one time only: the text holds it, nothing is added', () => {
  expect(digestText({ at: NOW, from: NOW - HOUR, to: NOW, text: 'While you were away (1 h): 1 session finished.' }, NOW + 5 * MIN)).toBe('While you were away (1 h): 1 session finished.')
  expect(NO_DIGEST).toMatch(/\/vaken-away off/)
})

// ---- the hooks, as the engine runs them

let epoch = 0

function world(on: On, seed: (now: number) => Record<string, unknown> = () => ({})) {
  epoch += 1
  const now = NOW + epoch * 24 * HOUR
  const clock = mock.clock(on, { now })
  const mem = new Map<string, unknown>(Object.entries(seed(now)))
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
  mock.session(on)
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: '/w/a' }))
  on('session.root', () => ({ value: '/w/a' }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)
    return { value: undefined } as never
  })
  on('ui.invalidate', () => ({ value: undefined }))
  on('prompt.suggest', () => ({ isShown: false }) as never)
  return { clock, mem, toasts, now }
}


function ioOf(w: { clock: { now: () => number }; mem: Map<string, unknown>; toasts: string[] }): Io {
  return {
    now: async () => w.clock.now(),
    home: async () => '',
    sessionId: async () => 'me',
    get: async key => w.mem.get(key),
    set: async (key, value) => void w.mem.set(key, value),
    del: async key => void w.mem.delete(key),
    keys: async () => [...w.mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: text => void w.toasts.push(text),
    invalidate: () => undefined,
  }
}

// A session record kept fresh by `touch`, because a record that is not updated for 90 seconds reads as idle.
const rec = (id: string, at: number, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/w/${id}`, title: id, model: 'm', state: 'working', startedAt: at - 30 * MIN, updatedAt: at - 5_000, lastEventAt: at - 5_000, stateSince: at - 30 * MIN, ...over })
const text = async ($: EngineInterface, args = '', command = 'vaken-away'): Promise<string> => ((await $.command.run({ ...viaParent(command, args), origin: { kind: 'composer' } } as never)) as { text: string }).text
const whats = (mem: Map<string, unknown>): string[] => ((mem.get('cockpit:ledger:compact') as Array<{ what: string }> | undefined) ?? []).map(l => l.what)
const setting = (mem: Map<string, unknown>, key: string): unknown => mem.get(`cockpit:setting:${key}`)

const cost = (usd: number) => ({ startedAt: 0, engineUsd: usd, engineAt: 0 })

test('/vaken-away digest says there is none before the first away mode', async ($, on) => {
  world(on)
  expect(await text($, '', 'vaken-digest')).toBe(NO_DIGEST)
})

test('/vaken-away digest while away mode is on gives the digest only: the away lines are not added (the folded word has its own handler)', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now) }))
  expect(await text($, 'on 2h')).toMatch(/Away mode is on since/)
  expect(w.mem.get('cockpit:away')).toBeDefined()
  const d = await text($, '', 'vaken-digest')
  expect(d).toMatch(/^Nothing happened yet while you are away\./)
  expect(d).not.toMatch(/Away mode is on since/)
})

test('/vaken-away on 2h: the switch is on, the policy is Careful and the budget is Stop, the answer names only what was set, and off puts it all back with the digest', async ($, on) => {
  const w = world(on, now => ({
    'cockpit:session:me': rec('me', now),
    'cockpit:session:a': rec('a', now, { title: 'Fix login' }),
    'cockpit:session:b': rec('b', now, { title: 'Billing' }),
    'cockpit:cost:s:me': cost(1.5),
    'cockpit:cost:s:a': cost(2),
  }))
  const start = w.clock.now()
  const t = await text($, 'on 2h')
  expect(t).toMatch(/^Away is ON\./)
  expect(t).toMatch(/Away mode is on since \d\d:\d\d\. It ends at \d\d:\d\d \(in 2 h\)/)
  expect(t).toMatch(/set the away policy to Careful \(it was Off\)/)
  expect(t).toMatch(/set the cost budget to Stop at \$25\.00 a session \(it was Off\)/)
  expect(t).toMatch(/^While away: Careful\./m)
  expect(t).not.toMatch(/^While away: Off/m)
  expect(setting(w.mem, 'away.policy')).toBe('careful')
  expect(setting(w.mem, 'cost.budget')).toBe('stop')
  expect(w.mem.get('cockpit:away:saved')).toEqual({ policy: { old: null, set: 'careful' }, budget: { old: null, set: 'stop', limit: 25 } })
  expect(w.mem.get('cockpit:away')).toEqual({ at: start })
  await w.clock.advance(30 * MIN)
  const now = w.clock.now()
  w.mem.set('cockpit:session:me', rec('me', now))
  w.mem.set('cockpit:session:a', rec('a', now, { title: 'Fix login', state: 'waiting', stateSince: now - MIN }))
  w.mem.set('cockpit:session:b', rec('b', now, { title: 'Billing', ask: { kind: 'question', tool: 'AskUserQuestion', since: now - 2 * MIN } }))
  w.mem.set('cockpit:ledger:compact', [{ at: now - MIN, session: 'a', what: 'Held a risky command', detail: 'This would delete files.', did: true, how: 'auto' }, { at: now - 5 * MIN, session: 'a', what: AWAY_DENY_WHAT, did: true, how: 'auto' }])
  w.mem.set('cockpit:cost:s:me', cost(1.5))
  w.mem.set('cockpit:cost:s:a', cost(5.7))
  await awayCheck(ioOf(w))
  const off = await text($, 'off')
  expect(off).toMatch(/^Away is off\./)
  expect(off).toMatch(/^While away: Off\./m)
  expect(off).not.toMatch(/^While away: Careful/m)
  expect(off).toMatch(/While you were away \(30 min\): 1 session finished, 1 session needed you, 2 risky steps were stopped, about \$3\.70 spent \(estimate\)\./)
  expect(off).toMatch(/Waiting for you:\n- Billing: Asks you a question\. Waiting \d+ min\. Open that session and answer it\.\n- Fix login: Stopped a risky command\./)
  expect(off).toMatch(/The away policy is back to Off\.\nThe cost budget is back to Off\.$/)
  expect(setting(w.mem, 'away.policy')).toBeUndefined()
  expect(setting(w.mem, 'cost.budget')).toBeUndefined()
  expect(w.mem.has('cockpit:away')).toBe(false)
  expect(w.mem.has('cockpit:away:run')).toBe(false)
  expect(w.mem.has('cockpit:away:saved')).toBe(false)
  expect(whats(w.mem)).toContain('Ended away mode with a digest')
  const kept = w.mem.get('cockpit:digest:last') as { text: string }
  expect(kept.text).toMatch(/^While you were away \(30 min\)/)
  const again = await text($, '', 'vaken-digest')
  expect(again).toMatch(/^While you were away \(30 min\)/)
  expect(again).not.toMatch(/made .* ago/)
  expect(JSON.stringify([...w.mem.entries()])).not.toMatch(/delete files\.[\s\S]*password/)
})

test('/vaken-away digest while away shows what happened so far', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now) }))
  await text($, 'on')
  await w.clock.advance(10 * MIN)
  w.mem.set('cockpit:ledger:compact', [{ at: w.clock.now() - MIN, session: 'me', what: AWAY_DENY_WHAT, did: true, how: 'auto' }])
  const t = await text($, '', 'vaken-digest')
  expect(t).toMatch(/^So far while you are away \(10 min\): 1 risky step was stopped\./)
  expect(t).toMatch(/Away mode is still on\./)
})

test('the time runs out: the switch goes off by itself, the settings go back, the digest is kept and a toast says so', SLOW, async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now), 'cockpit:setting:cost.budget': 'warn' }))
  w.mem.set('cockpit:setting:cost.budget', 'warn')
  const t = await text($, 'on 10m')
  expect(t).toMatch(/cost budget to Stop at \$25\.00 a session \(it was Warn\)/)
  expect(setting(w.mem, 'cost.budget')).toBe('stop')
  await w.clock.advance(9 * MIN)
  expect(w.mem.has('cockpit:away')).toBe(true)
  await w.clock.advance(2 * MIN)
  expect(w.mem.has('cockpit:away')).toBe(false)
  expect(setting(w.mem, 'cost.budget')).toBe('warn')
  expect(setting(w.mem, 'away.policy')).toBeUndefined()
  expect(whats(w.mem)).toEqual(expect.arrayContaining(['Turned off away mode', 'Ended away mode with a digest']))
  expect(w.toasts.some(x => /the time ran out/.test(x))).toBe(true)
  expect((w.mem.get('cockpit:digest:last') as { text: string }).text).toBe('Nothing happened while you were away.')
  expect(await text($, '')).toMatch(/^Away is off\./)
})

test('a value the person changed while away stays; a policy that was Careful already is not touched or reported', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now) }))
  w.mem.set('cockpit:setting:away.policy', 'careful')
  const t = await text($, 'on')
  expect(t).not.toMatch(/set the away policy/)
  expect(t).toMatch(/set the cost budget to Stop/)
  await text($, 'cost.budget warn', 'vaken-settings')
  const off = await text($, 'off')
  expect(off).toMatch(/The cost budget stays as you changed it\./)
  expect(off).not.toMatch(/away policy is back/)
  expect(setting(w.mem, 'away.policy')).toBe('careful')
  expect(setting(w.mem, 'cost.budget')).toBe('warn')
})

test('with the digest Off, away mode still puts the settings back and says no digest', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now) }))
  w.mem.set('cockpit:setting:away.digest', 'off')
  await text($, 'on')
  const off = await text($, 'off')
  expect(off).not.toMatch(/While you were away/)
  expect(off).toMatch(/The away policy is back to Off\./)
  expect(w.mem.has('cockpit:digest:last')).toBe(false)
  expect(whats(w.mem)).not.toContain('Ended away mode with a digest')
})

test('a time that is not a time is refused with the right way, and the switch stays off; a second on only changes the end time', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now) }))
  expect(await text($, 'on soon')).toBe(DURATION_HELP)
  expect(await text($, 'on 30s')).toBe(DURATION_HELP)
  expect(w.mem.has('cockpit:away')).toBe(false)
  expect(setting(w.mem, 'away.policy')).toBeUndefined()
  await text($, 'on 1h')
  const again = await text($, 'on 3h')
  expect(again).toMatch(/The end time is changed\./)
  expect(again).toMatch(/\(in 3 h\)/)
  expect((w.mem.get('cockpit:away:saved') as { policy: { old: null } }).policy.old).toBeNull()
  expect(await text($, '')).toMatch(/Away is ON[\s\S]*Away mode is on since/)
  await text($, 'off')
  expect(setting(w.mem, 'away.policy')).toBeUndefined()
})

test('the switch turned on or off without the wrapper is noticed within 20 seconds: the mode begins, then the digest is made', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now) }))
  w.mem.set('cockpit:away', { at: w.clock.now() })
  await awayCheck(ioOf(w))
  expect(setting(w.mem, 'away.policy')).toBe('careful')
  expect(w.mem.has('cockpit:away:run')).toBe(true)
  await w.clock.advance(5 * MIN)
  w.mem.delete('cockpit:away')
  await awayCheck(ioOf(w))
  expect(w.mem.has('cockpit:away:run')).toBe(false)
  expect(setting(w.mem, 'away.policy')).toBeUndefined()
  expect((w.mem.get('cockpit:digest:last') as { text: string }).text).toBe('Nothing happened while you were away.')
  expect(w.toasts.some(x => /Away mode ended/.test(x))).toBe(true)
})
