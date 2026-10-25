// Auto compaction, redesigned: the break trigger (idle until the cache is about to expire), the size trigger (the window reaches compact.from at the end of an answer),
// and the things that stop both. The pure parts first, then the whole path on a fake clock.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SLOW, test } from './slow'

import { BREAK_RETRY_MS, COMPACT_GAP_MS, FROM_DEFAULT_PCT, GIVE_UP_RETRY_MS, LEAD_DEFAULT_MIN, MIN_TOKENS_DEFAULT, PAYBACK_MAX_TURNS, SHORT_BREAK_SHARE, SIZE_LOOK2_MS, SIZE_LOOK_MS, breakAtMs, giveUpLeftMin, leadMsOf, minTokensOf } from '../hooks/core/compactauto'
import { COST_UPGRADE_DONE, upgradeCostModes } from '../hooks/core/costupgrade'
import { OLD_MODES } from '../hooks/core/costupgrade'
import { compactInstructions } from '../hooks/core/compactmoment'
import { findPreset, modeNow } from '../hooks/core/presets'
import { SETTINGS, defaults, readSettings, settingStoreKey } from '../hooks/core/settings'
import type { Io } from '../hooks/core/io'
import { BACKGROUND_MAX_MS, endsBackground } from '../hooks/core/compactrest'
import { heldKey } from '../hooks/core/allowonce'
import { backgroundEnded, restSlotOf, runCompaction, setAutoSaver } from '../hooks/features/compaction'
import type { CompactOps } from '../hooks/features/compaction'
import { tEn } from '../hooks/i18n/t'
import { didToday } from '../hooks/core/ledger'
import type { Entry } from '../hooks/core/ledger'
import { COUNTS_KEY } from '../hooks/core/counts'

const MIN = 60_000
const NOW = Date.parse('2026-10-14T12:00:00Z')

test('the constants: 15 min lead on the hour cache, 3 of 5 minutes on the short one, 100k tokens, 20 minutes between compactions, 60 percent, payback within 5 answers', () => {
  expect([LEAD_DEFAULT_MIN, SHORT_BREAK_SHARE, MIN_TOKENS_DEFAULT, COMPACT_GAP_MS, FROM_DEFAULT_PCT, PAYBACK_MAX_TURNS, SIZE_LOOK_MS, SIZE_LOOK2_MS, BREAK_RETRY_MS, GIVE_UP_RETRY_MS]).toEqual([15, 0.6, 100_000, 20 * MIN, 60, 5, 30_000, 2 * MIN, 30_000, 30 * MIN])
  expect(breakAtMs(60 * MIN, 15 * MIN)).toBe(45 * MIN)
  expect(breakAtMs(60 * MIN, 10 * MIN)).toBe(50 * MIN)
  expect(breakAtMs(60 * MIN, 20 * MIN)).toBe(40 * MIN)
  expect(breakAtMs(5 * MIN, 15 * MIN)).toBe(3 * MIN)
  expect(breakAtMs(5 * MIN, 10 * MIN)).toBe(3 * MIN)
  expect([leadMsOf(undefined), leadMsOf('10'), leadMsOf('15'), leadMsOf('20'), leadMsOf('x')]).toEqual([15 * MIN, 10 * MIN, 15 * MIN, 20 * MIN, 15 * MIN])
  expect([minTokensOf(undefined), minTokensOf('50000'), minTokensOf('100000'), minTokensOf('200000'), minTokensOf('7')]).toEqual([100_000, 50_000, 100_000, 200_000, 100_000])
  // never more than half the window: 200k on a 200k window reads 100k, so Auto can still act there
  expect([minTokensOf('200000', 200_000), minTokensOf('100000', 200_000), minTokensOf('50000', 200_000), minTokensOf('200000', 1_000_000), minTokensOf('200000', 0)]).toEqual([100_000, 100_000, 50_000, 200_000, 200_000])
})

test('the settings: compact.from 50/60/70 (60), compact.min 50k/100k/200k (100k), compact.lead 10/15/20 (15), compact.mode defaults to Watch only', () => {
  const row = (k: string) => SETTINGS.find(s => s.key === k)!
  expect([row('compact.from').default, row('compact.from').options.map(o => o.value)]).toEqual(['60', ['50', '60', '70']])
  expect([row('compact.min').default, row('compact.min').options.map(o => o.value)]).toEqual(['100000', ['50000', '100000', '200000']])
  expect([row('compact.lead').default, row('compact.lead').options.map(o => o.value)]).toEqual(['15', ['10', '15', '20']])
  expect(row('compact.mode').default).toBe('watch')
  expect(modeNow(defaults())).toBe('balanced')
  // no preset sets it: an explicit choice always stays
  for (const m of ['quiet', 'balanced', 'full']) expect(findPreset(m)!.values['compact.mode']).toBeUndefined()
})

test('every vaken compaction asks for the summary to keep the goal, what is done and next, open files and branches, decisions and a waiting question', () => {
  const line = tEn('cardcompact.keep_summary')
  for (const word of ['the goal', 'what is done', 'what is next', 'open files and branches', 'decisions made', 'any question waiting for the person']) expect(line).toContain(word)
  const withCard = compactInstructions('Keep the goal "x".', '~/b.md').split('\n')
  expect(withCard).toEqual(['Keep the goal "x".', line, 'A handoff note of this session is saved as ~/b.md.'])
  // With What Claude keeps off the summary line is still sent
  expect(compactInstructions(undefined, '~/b.md').split('\n')).toEqual([line, 'A handoff note of this session is saved as ~/b.md.'])
})

const memIo = (seed: Record<string, unknown>): { io: Io; mem: Map<string, unknown> } => {
  const mem = new Map<string, unknown>(Object.entries(seed))
  const io = {
    now: async () => NOW,
    home: async () => '/home/user',
    sessionId: async () => 's1',
    get: async (key: string) => mem.get(key),
    set: async (key: string, value: unknown) => void mem.set(key, value),
    del: async (key: string) => void mem.delete(key),
    keys: async () => [...mem.keys()],
  } as unknown as Io
  return { io, mem }
}

test('a stored Compact by itself is the person\'s own pick and is never migrated; a store that never saved it reads Watch only', async () => {
  const fresh = memIo({})
  expect((await readSettings(fresh.io))['compact.mode']).toBe('watch')
  for (const v of ['watch', 'suggest', 'off', 'auto']) {
    const mine = memIo({ [settingStoreKey('compact.mode')]: v })
    await upgradeCostModes(mine.io)
    expect(mine.mem.get(settingStoreKey('compact.mode'))).toBe(v)
  }
  // a Watch that came with the rows of the old Recommended stays Watch, and the one-time step that moves the old modes does not touch it
  const old = Object.fromEntries(Object.entries(OLD_MODES.balanced).map(([k, v]) => [settingStoreKey(k), v]))
  const seeded = memIo(old)
  await upgradeCostModes(seeded.io)
  expect(seeded.mem.get(settingStoreKey('compact.mode'))).toBe('watch')
  // an old Only alerts that never saved the row is not given a Watch: it follows the default
  const quiet = memIo(Object.fromEntries(Object.entries(OLD_MODES.quiet).map(([k, v]) => [settingStoreKey(k), v])))
  await upgradeCostModes(quiet.io)
  expect(quiet.mem.has(settingStoreKey('compact.mode'))).toBe(false)
})

test('the give-up wait: 30 minutes, rounded up, then over', () => {
  expect([giveUpLeftMin(undefined, NOW), giveUpLeftMin(NOW, NOW), giveUpLeftMin(NOW - 29 * MIN - 1_000, NOW), giveUpLeftMin(NOW - 30 * MIN, NOW), giveUpLeftMin(NOW - 31 * MIN, NOW)]).toEqual([0, 30, 1, 0, 0])
})

test('the rest slot is one per session', () => {
  const a = restSlotOf('session-a')
  const b = restSlotOf('session-b')
  a.turnId = 't-a'
  a.endedAt = 5
  a.background.push(1)
  expect(b.turnId).toBeUndefined()
  expect(b.endedAt).toBe(0)
  expect(b.background).toEqual([])
  expect(restSlotOf('session-a')).toBe(a)
  expect(restSlotOf('session-b')).toBe(b)
})

// ---- the whole path, on a fake clock ----

type World = { mem: Map<string, unknown>; compacts: string[]; toasts: string[]; clock: ReturnType<typeof mock.clock>; as: (id: string) => void; sid: string; box: { text: string }; live: { agents: boolean; failing: boolean } }
type Dollar = Parameters<Parameters<typeof test>[1]>[0]
type Opts = {
  sid?: string
  percent?: number
  tokens?: number
  settings?: Record<string, string>
  plan?: 'subscription' | 'credits' | 'unknown'
  agents?: boolean
  compactedAgoMin?: number
  cacheLeftMin?: number
  noCache?: boolean
  held?: boolean
  box?: string
  failing?: boolean
}

// The session records are kept per process, so every case gets a session of its own
let sessions = 0

async function world($: Dollar, on: On, o: Opts = {}): Promise<World> {
  sessions += 1
  const sid = o.sid ?? `auto-session-${sessions}`
  const clock = mock.clock(on, { now: NOW })
  const record = {
    sessionId: sid,
    cwd: '/work/app',
    model: 'claude-opus-5',
    state: 'idle',
    startedAt: NOW - 90 * MIN,
    updatedAt: NOW,
    lastEventAt: NOW,
    stateSince: NOW - 10 * MIN,
    title: 'fix login',
    branch: 'feat-x',
    contextPercent: o.percent ?? 20,
    ctx: { tokens: o.tokens ?? 640_000, window: 1_000_000, compactAt: 95 },
    ...(o.noCache === true ? {} : { cache: { read: 100, write: 0, fresh: 0, at: NOW - (o.plan === 'credits' || o.plan === undefined || o.plan === 'unknown' ? 5 : 60) * MIN + (o.cacheLeftMin ?? (o.plan === 'subscription' ? 60 : 5)) * MIN } }),
    ...(o.compactedAgoMin === undefined ? {} : { compacts: [{ at: NOW - o.compactedAgoMin * MIN, trigger: 'auto', before: 500_000, after: 20_000, outTokens: 1000 }] }),
  }
  const usage = o.plan === 'subscription' ? { at: NOW, windows: [{ label: '5-hour', percent: 10 }], extra: { enabled: false } } : o.plan === 'credits' ? { at: NOW, windows: [{ label: '5-hour', percent: 10 }], extra: { enabled: true } } : undefined
  const mem = new Map<string, unknown>(Object.entries({
    [`cockpit:session:${sid}`]: record,
    'cockpit:firstrun': 'done',
    'cockpit:setting:compact.mode': 'auto',
    ...(usage === undefined ? {} : { 'cockpit:usage:app': usage }),
    ...(o.held === true ? { [heldKey(sid)]: { at: NOW - 1000, step: 'tu1', keys: ['destructive|rm'], words: 'rm -rf build would delete a folder' } } : {}),
    ...Object.fromEntries(Object.entries(o.settings ?? {}).map(([k, v]) => [`cockpit:setting:${k}`, v])),
  }))
  const compacts: string[] = []
  const toasts: string[] = []
  const box = { text: o.box ?? '' }
  const live = { agents: o.agents === true, failing: o.failing === true }
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
  let current = sid
  on('session.id', () => ({ value: current }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('agent.list', () => ({ value: live.agents ? [{ id: 'a1', status: 'running' }] : [] }) as never)
  on('prompt.read', () => ({ value: { text: box.text, cursor: box.text.length } }) as never)
  on('command.run', () => {
    if (live.failing) throw new Error('refused')
    return { text: 'ok' } as never
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.complete', (_$, e) => ({ text: (e as { answer?: string }).answer ?? '' }) as never)
  on('turn.start', (_$, e) => ({ turnId: (e as { turnId?: string }).turnId ?? '' }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'feat-x\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text?: string }).text ?? '')
    return { value: undefined } as never
  })
  on('fs.write', () => ({ value: undefined }) as never)
  on('tool.call', () => ({ result: 'ok' }) as never)
  on('session.compact', (_$, e) => {
    if (live.failing) throw new Error('refused')
    compacts.push((e as { instructions?: string }).instructions ?? '')
    return { messages: [{ role: 'user', text: 'summary', toolUses: [] }], tokensBefore: 640_000, tokensAfter: 18_000 } as never
  })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  return { mem, compacts, toasts, clock, as: id => void (current = id), sid, box, live }
}

const endTurn = ($: Dollar, answer = 'Done.', turnId = 't1') => $.turn.complete({ answer, durationMs: 30_000, isAborted: false, turnId, reason: 'answer' } as never)
const ledger = (w: World): { what: string; detail?: string }[] => (w.mem.get('cockpit:ledger:compact') as { what: string; detail?: string }[] | undefined) ?? []

test('break trigger, 60-minute cache: nothing before 45 minutes idle, a compaction at 45, and the ledger says it was during a break', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription' })
  await endTurn($)
  await w.clock.advance(44 * MIN + 59_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
  await w.clock.advance(2_000)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
  const done = ledger(w).find(l => l.what === 'compacted (plugin)')
  expect(done?.detail).toMatch(/^during a break, 640k to 18k tokens/)
  expect(w.toasts).toContain('Compacting during a break, while the cache is still warm')
  // the summary instructions carry the keep lines
  expect(w.compacts[0]).toContain(tEn('cardcompact.keep_summary'))
  expect(w.compacts[0]).toContain('on branch feat-x, the files changed, decisions made and why, and the next steps.')
})

test('break trigger: the lead setting moves it (10 min: at 50, 20 min: at 40)', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', settings: { 'compact.lead': '20' } })
  await endTurn($)
  await w.clock.advance(39 * MIN)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
  await w.clock.advance(2 * MIN)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
})

for (const plan of ['credits'] as const) {
  test(`break trigger, 5-minute cache (${plan}): at 3 minutes idle`, SLOW, async ($, on) => {
    const w = await world($, on, { plan })
    await endTurn($)
    await w.clock.advance(2 * MIN + 50_000)
    await w.clock.settle()
    expect(w.compacts).toEqual([])
    await w.clock.advance(20_000)
    await w.clock.settle()
    expect(w.compacts.length).toBe(1)
  })
}

test('a new turn cancels the break trigger', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription' })
  await endTurn($)
  await w.clock.advance(30 * MIN)
  await $.turn.start({ turnId: 't2' } as never)
  await w.clock.advance(30 * MIN)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

const NOT_BREAK: [string, Opts][] = [
  ['under compact.min', { tokens: 99_000 }],
  ['under a raised compact.min', { tokens: 150_000, settings: { 'compact.min': '200000' } }],
  ['an agent runs', { agents: true }],
  // The engine compacted by itself 30 minutes into the break: 15 minutes before the break trigger would fire
  ['a compaction 15 min before the break', { compactedAgoMin: -30 }],
  ['the cache is cold', { cacheLeftMin: 0 }],
  ['the cache is not known', { noCache: true }],
  // the plan, and so the cache time, is not known: the break trigger never fires, not even on the short time
  ['the plan is not known', { plan: 'unknown' }],
]
for (const [name, o] of NOT_BREAK) {
  test(`the break trigger never fires: ${name}`, SLOW, async ($, on) => {
    const w = await world($, on, { plan: 'subscription', ...o })
    await endTurn($)
    await w.clock.advance(46 * MIN)
    await w.clock.settle()
    expect(w.compacts).toEqual([])
  })
}

test('a compaction 25 minutes before the break does not hold it back', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', compactedAgoMin: -20 })
  await endTurn($)
  await w.clock.advance(46 * MIN)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
})

test('size trigger: at the end of an answer above compact.from, right after it, even when the answer ends with a question', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 62, tokens: 620_000 })
  await endTurn($, 'Shall I go on with the migration?')
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
  expect(ledger(w).find(l => l.what === 'compacted (plugin)')?.detail).toMatch(/^at 62% of the window, /)
  expect(w.toasts).toContain('Compacting because the session reached 62% of its window')
})

test('size trigger: not under compact.from (59 of 60)', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 59, tokens: 590_000 })
  await endTurn($)
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

test('size trigger: the setting moves the line (50)', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 55, tokens: 550_000, settings: { 'compact.from': '50' } })
  await endTurn($)
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
})

const NOT_SIZE: [string, Opts][] = [
  ['an agent runs', { agents: true }],
  ['a compaction 5 min ago', { compactedAgoMin: 5 }],
  ['under compact.min', { tokens: 80_000 }],
  ['a risky step waits for a yes', { held: true }],
]
for (const [name, o] of NOT_SIZE) {
  test(`the size trigger never fires: ${name}`, SLOW, async ($, on) => {
    const w = await world($, on, { plan: 'subscription', percent: 70, tokens: 700_000, ...o })
    await endTurn($)
    await w.clock.advance(SIZE_LOOK_MS + 2_000)
    await w.clock.settle()
    expect(w.compacts).toEqual([])
  })
}

test('size trigger: mid-task Claude is told once to finish the step; the next turn end with nothing running compacts', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 70, tokens: 700_000, agents: true })
  const first = JSON.stringify(await $.tool.call({ tool: 'Read', file_path: '/work/app/a.ts' } as never))
  expect(first).toContain('Context is 70% full. Finish the current step, then end your turn so vaken can compact the session')
  const again = JSON.stringify(await $.tool.call({ tool: 'Read', file_path: '/work/app/b.ts' } as never))
  expect(again).not.toContain('Context is')
  // the turn ends with an agent still running: no compaction
  await endTurn($, 'Working on it.', 't1')
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

test('size trigger: with nothing running at the next turn end it compacts', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 70, tokens: 700_000 })
  await $.tool.call({ tool: 'Read', file_path: '/work/app/a.ts' } as never)
  await endTurn($, 'Done. Anything else?', 't1')
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
})

test('size trigger: a compaction that would not pay back within 5 answers is skipped', SLOW, async ($, on) => {
  // 100k tokens at 70 %: the summary costs more than 5 answers save (the default guesses: 15k after, 5k out)
  const w = await world($, on, { plan: 'subscription', percent: 70, tokens: 100_000 })
  await endTurn($)
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

test('Watch only notes the moment of either trigger and compacts nothing', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', settings: { 'compact.mode': 'watch' } })
  await endTurn($)
  await w.clock.advance(46 * MIN)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
  expect(ledger(w).some(l => l.what === 'Would have compacted now' && l.detail === 'during a break')).toBe(true)
  // a note, not something vaken did: it is not counted as done for you, nor shown as an action band
  expect(ledger(w).filter(l => l.what === 'Would have compacted now').every(l => (l as { did?: boolean }).did !== true)).toBe(true)
  expect(didToday(ledger(w) as Entry[], NOW + 46 * MIN, w.mem.get(COUNTS_KEY) as Record<string, number>).map(d => d.what)).not.toContain('Would have compacted now')
})

test('two sessions keep their own turns: a new turn in the other session does not cancel the break trigger of this one', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', sid: 'session-one' })
  await endTurn($)
  await w.clock.advance(20 * MIN)
  w.as('session-two')
  await $.turn.start({ turnId: 'other-1' } as never)
  w.as('session-one')
  await w.clock.advance(26 * MIN)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
})

// ---- the fixes after review ----

const BIG = { plan: 'subscription', percent: 70, tokens: 700_000 } as const

test('size trigger: the first look is 30 seconds after the answer, not sooner', SLOW, async ($, on) => {
  const w = await world($, on, BIG)
  await endTurn($)
  await w.clock.advance(SIZE_LOOK_MS - 1_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
  await w.clock.advance(2_000)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
})

test('size trigger: a prompt box with text holds it; the second look (2 minutes) compacts once the box is empty', SLOW, async ($, on) => {
  const w = await world($, on, { ...BIG, box: 'fix the' })
  await endTurn($)
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
  w.box.text = ''
  await w.clock.advance(SIZE_LOOK2_MS - SIZE_LOOK_MS)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
})

test('size trigger: a box still not empty at the second look means no compaction, and no third look', SLOW, async ($, on) => {
  const w = await world($, on, { ...BIG, box: 'still typing' })
  await endTurn($)
  await w.clock.advance(SIZE_LOOK2_MS + 2_000)
  await w.clock.settle()
  w.box.text = ''
  await w.clock.advance(10 * MIN)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

test('size trigger: a new turn before the look cancels it', SLOW, async ($, on) => {
  const w = await world($, on, BIG)
  await endTurn($)
  await w.clock.advance(10_000)
  await $.turn.start({ turnId: 't2' } as never)
  await w.clock.advance(5 * MIN)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

const verdictOf = (w: World): unknown => w.mem.get(`cockpit:compact:rest:${w.sid}`)

test('a helper agent starting a turn does not cancel the main session look', SLOW, async ($, on) => {
  const w = await world($, on, BIG)
  await endTurn($)
  await $.turn.start({ turnId: 'h1', agentId: 'agent-1' } as never)
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  // the look happened (the collector marks any turn start as working, so it found the session not ready)
  expect(verdictOf(w)).toBeDefined()
})

test('the person\'s own new turn cancels the looks: none is taken', SLOW, async ($, on) => {
  const w = await world($, on, BIG)
  await endTurn($)
  await $.turn.start({ turnId: 't2' } as never)
  await w.clock.advance(SIZE_LOOK2_MS + 2_000)
  await w.clock.settle()
  expect(verdictOf(w)).toBeUndefined()
})

test('the break trigger looks once more 30 seconds later when the first look found a check failing', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', agents: true })
  await endTurn($)
  await w.clock.advance(45 * MIN + 5_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
  w.live.agents = false
  await w.clock.advance(BREAK_RETRY_MS)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
})

test('the break trigger retry is bounded: still not ready at the retry, nothing later', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', agents: true })
  await endTurn($)
  await w.clock.advance(45 * MIN + BREAK_RETRY_MS + 5_000)
  await w.clock.settle()
  w.live.agents = false
  await w.clock.advance(5 * MIN)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

test('a look in another session does nothing', SLOW, async ($, on) => {
  const w = await world($, on, { ...BIG, sid: 'session-gone' })
  await endTurn($)
  w.as('another-session')
  await w.clock.advance(SIZE_LOOK_MS + 5_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

test('the ending of the session clears its looks', SLOW, async ($, on) => {
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }) as never)
  const w = await world($, on, { ...BIG, sid: 'session-ended' })
  const key = 'cockpit:session:session-ended'
  await endTurn($, 'Done.', 't9')
  const idle = w.mem.get(key)
  await $.session.end({ sessionId: 'session-ended', reason: 'exit' } as never)
  // the record is put back, so only the cancelled looks keep it from compacting
  w.mem.set(key, idle)
  await w.clock.advance(SIZE_LOOK2_MS + 5_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

test('a background command blocks Auto for as long as it runs, however long, and until its end is seen', SLOW, async ($, on) => {
  const w = await world($, on, BIG)
  await $.tool.call({ tool: 'Bash', command: 'npm run dev', run_in_background: true } as never)
  await endTurn($)
  await w.clock.advance(SIZE_LOOK2_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
  // 40 minutes later, the next answer ends: the command is older than 10 minutes and still counts
  await w.clock.advance(40 * MIN)
  await endTurn($, 'Done.', 't2')
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

test('a background command ends when its task notification arrives; a lost end stops counting after 6 hours', () => {
  const slot = restSlotOf('bg-unit')
  slot.background.push(1, 2)
  backgroundEnded('bg-unit')
  expect(slot.background).toEqual([2])
  backgroundEnded('bg-unit')
  backgroundEnded('bg-unit')
  expect(slot.background).toEqual([])
  expect([endsBackground({ kind: 'task-notification' }), endsBackground({ kind: 'composer' }), endsBackground(undefined)]).toEqual([true, false, false])
  expect(BACKGROUND_MAX_MS).toBe(6 * 60 * MIN)
})

test('Auto gives up per session when it cannot start a compaction, and tries again after 30 minutes', SLOW, async ($, on) => {
  const w = await world($, on, { ...BIG, failing: true })
  const failures = (): number => ledger(w).filter(l => l.what === 'auto-compact could not run').length
  await endTurn($)
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(failures()).toBe(1)
  await endTurn($, 'Done.', 't2')
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(failures()).toBe(1)
  w.live.failing = false
  await w.clock.advance(31 * MIN)
  await endTurn($, 'Done.', 't3')
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
})

test('the compaction is not sent when a new turn started before the call (the check stands right before it)', async () => {
  const mem = new Map<string, unknown>([['cockpit:session:race-1', { sessionId: 'race-1', cwd: '/w', model: 'm', state: 'idle', startedAt: NOW, updatedAt: NOW, lastEventAt: NOW, stateSince: NOW, title: 't' }]])
  const io = {
    now: async () => NOW,
    home: async () => '/home/user',
    sessionId: async () => 'race-1',
    get: async (key: string) => mem.get(key),
    set: async (key: string, value: unknown) => void mem.set(key, value),
    del: async (key: string) => void mem.delete(key),
    keys: async () => [...mem.keys()],
    invalidate: () => undefined,
    toast: () => undefined,
  } as unknown as Io
  const calls: string[] = []
  const ops = { io, cwd: async () => '/w', probe: async () => undefined, agents: async () => 0, command: async () => void calls.push('command'), direct: async () => (calls.push('direct'), {}) } as unknown as CompactOps
  setAutoSaver(async () => ({ ok: true, name: 'b.md', shown: '~/b.md', checkpoint: false }))
  try {
    expect(await runCompaction({ how: 'auto', sessionId: 'race-1', ops, same: () => false })).toBe('skipped')
    expect(calls).toEqual([])
    expect(await runCompaction({ how: 'auto', sessionId: 'race-1', ops, same: () => true })).toBe('sent')
    expect(calls).toEqual(['direct'])
  } finally {
    setAutoSaver(undefined)
  }
})

test('the compaction note to Claude is part of Auto: it is sent with claude.notes on Safety', SLOW, async ($, on) => {
  const w = await world($, on, { ...BIG, settings: { 'claude.notes': 'safety' } })
  const sent = JSON.stringify(await $.tool.call({ tool: 'Read', file_path: '/work/app/a.ts' } as never))
  expect(sent).toContain('Context is 70% full')
  expect(w.compacts).toEqual([])
})

test('the compaction note to Claude is not sent in Watch only', SLOW, async ($, on) => {
  await world($, on, { ...BIG, settings: { 'claude.notes': 'all', 'compact.mode': 'watch' } })
  const sent = JSON.stringify(await $.tool.call({ tool: 'Read', file_path: '/work/app/a.ts' } as never))
  expect(sent).not.toContain('Context is')
})

// ---- helpers still running: background ones raise the line to 75%, a foreground one or a turn mid-way stops it ----

const HELPERS_LINE_EN = 'List every agent or background command still running: what it does, its id if you know it, and what you will do with its result.'

test('the helpers line is sent only when helpers are open', () => {
  expect(tEn('cardcompact.keep_helpers')).toBe(HELPERS_LINE_EN)
  expect(compactInstructions(undefined, '~/b.md', true).split('\n')).toEqual([tEn('cardcompact.keep_summary'), HELPERS_LINE_EN, 'A handoff note of this session is saved as ~/b.md.'])
  expect(compactInstructions(undefined, '~/b.md')).not.toContain(HELPERS_LINE_EN)
})

test('size trigger with only a background agent open and the answer ended: compacts at 75%, and the summary must list the helpers', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 75, tokens: 750_000, agents: true })
  await endTurn($)
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
  expect(w.compacts[0]).toContain(HELPERS_LINE_EN)
})

test('size trigger with only a background command open: compacts at 80%, with the helpers line', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 80, tokens: 800_000 })
  await $.tool.call({ tool: 'Bash', command: 'npm run dev', run_in_background: true } as never)
  await endTurn($)
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
  expect(w.compacts[0]).toContain(HELPERS_LINE_EN)
})

test('size trigger with background helpers at 70%: no compaction, and the stored look says it waits for 75%', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 70, tokens: 700_000, agents: true })
  await endTurn($)
  await w.clock.advance(SIZE_LOOK2_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
  expect(JSON.stringify(w.mem.get(`cockpit:compact:rest:${w.sid}`))).toContain('needs 75% while agents run')
})

test('size trigger at 80%: an agent in the foreground stops it', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 80, tokens: 800_000, agents: true })
  w.mem.set('cockpit:agentboard', [{ id: 'a1', session: w.sid.slice(0, 8), type: 'general-purpose', what: 'build', background: false, startedAt: NOW - MIN, state: 'running' }])
  await endTurn($)
  await w.clock.advance(SIZE_LOOK2_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

test('size trigger at 80% with background helpers: never while the main loop is mid-turn', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 80, tokens: 800_000, agents: true })
  await endTurn($)
  // The main loop starts its next turn before the look: it is mid-turn
  await w.clock.advance(10_000)
  await $.turn.start({ turnId: 't2' } as never)
  await w.clock.advance(SIZE_LOOK2_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts).toEqual([])
})

test('size trigger with nothing open: the 60% rule is unchanged, and no helpers line', SLOW, async ($, on) => {
  const w = await world($, on, { plan: 'subscription', percent: 60, tokens: 600_000 })
  await endTurn($)
  await w.clock.advance(SIZE_LOOK_MS + 2_000)
  await w.clock.settle()
  expect(w.compacts.length).toBe(1)
  expect(w.compacts[0]).not.toContain(HELPERS_LINE_EN)
})
