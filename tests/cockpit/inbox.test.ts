// Attention: the Approvals inbox and Steering.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { EngineInterface, On } from 'claude-code'

import {
  HOLD_LIVE_MS,
  INBOX_HELP,
  INBOX_SETTINGS,
  INBOX_WHATS,
  LIMITS_NOTE,
  OFFER_MAX,
  QUEUE_MAX,
  QUEUE_OFFER_WHAT,
  REOFFER_MS,
  STEER_STOP_WHAT,
  addQueued,
  buildInbox,
  cleanQueued,
  dropSent,
  heldCount,
  inboxBandWords,
  inboxText,
  itemLines,
  markOffered,
  nextOffer,
  parseQueue,
  parseSteerAsk,
  steerText,
  waitWord,
} from '../hooks/core/inbox'
import type { InboxFacts } from '../hooks/core/inbox'
import { inboxCheck } from '../hooks/features/inbox'
import type { Io } from '../hooks/core/io'
import { emptyState } from '../hooks/core/proof'
import { ALLOW_USED_WHAT } from '../hooks/core/guard'
import { EXTENDED_WHAT, HELD_WHAT as BUDGET_HELD } from '../hooks/core/budget'
import type { Entry } from '../hooks/core/ledger'
import { viaParent } from './viaparent'
import { LEADER_LEASE_MS, LEADER_SCHEMA } from '../hooks/core/leader'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

test('the Settings row: group Attention, On or Off, On by default', () => {
  expect(INBOX_SETTINGS.map(s => s.key)).toEqual(['inbox.mode'])
  expect(INBOX_SETTINGS[0]?.group).toBe('Attention')
  expect(INBOX_SETTINGS[0]?.options.map(o => o.value)).toEqual(['on', 'off'])
  expect(INBOX_SETTINGS[0]?.default).toBe('on')
})

test('the help says plainly what the inbox cannot do', () => {
  expect(INBOX_HELP[0]?.text).toMatch(/cannot press OK/)
  expect(LIMITS_NOTE).toMatch(/cannot press OK or answer a permission box/)
  expect(LIMITS_NOTE).toMatch(/cannot send a push/)
})

test('waiting time in plain words', () => {
  expect(waitWord(20_000)).toBe('under 1 min')
  expect(waitWord(12 * MIN)).toBe('12 min')
  expect(waitWord(60 * MIN)).toBe('1 h')
  expect(waitWord(130 * MIN)).toBe('2 h 10 min')
  expect(waitWord(49 * 60 * MIN)).toBe('2 d')
})

const S = [
  { sid: 'me', name: 'Docs', here: true },
  { sid: 'a', name: 'Fix login', here: false },
  { sid: 'b', name: 'Billing', here: false },
]
const facts = (over: Partial<InboxFacts> = {}): InboxFacts => ({ now: NOW, sessions: S, ledger: [], allowed: [], asks: [], debts: [], halts: [], seen: {}, ...over })
const held = (session: string, what: string, ago: number, detail = 'This would delete files.'): Entry => ({ at: NOW - ago, session, what, detail, how: 'auto', did: true })

test('a question and a permission ask are listed with the session, the time and what to do', () => {
  const items = buildInbox(facts({ asks: [{ sid: 'b', kind: 'permission', tool: 'Bash', since: NOW - 3 * MIN }, { sid: 'a', kind: 'question', tool: 'AskUserQuestion', since: NOW - 12 * MIN }] }))
  expect(items.map(x => [x.kind, x.name])).toEqual([['question', 'Fix login'], ['permission', 'Billing']])
  expect(itemLines(items[0]!, NOW)).toEqual(['Fix login: Asks you a question.', '   Waiting 12 min. Open that session and answer it.'])
  expect(itemLines(items[1]!, NOW)).toEqual(['Billing: Waits to run Bash. It may need your OK.', '   Waiting 3 min. Open that session and answer its question.'])
})

test('stopped steps: the ledger line, counted by session and kind; the way out is allow once; this session is named', () => {
  const ledger = [held('a', 'Held a risky command', 5 * MIN), held('a', 'Held a risky command', 20 * MIN), held('me', 'Held an action outside your computer', 2 * MIN, 'This would send a message in Slack.')]
  const items = buildInbox(facts({ ledger }))
  expect(items.map(x => [x.kind, x.name, x.count])).toEqual([['hold', 'Fix login', 2], ['hold', 'Docs', 1]])
  const fix = items.find(x => x.sid === 'a')!
  expect(fix.what).toBe('Held a risky command (2 times). This would delete files.')
  expect(fix.since).toBe(NOW - 20 * MIN)
  // A stopped step says when it was stopped last (the clock of the 30 minutes of the yes) and that it never runs by itself.
  expect(itemLines(fix, NOW)[1]).toBe('   Stopped 5 min ago. It will not run unless you allow it. Open that session; its pane has Allow once.')
  // This session's step keeps the typed way (the pane offers the button only when it can show the step).
  expect(itemLines(items.find(x => x.sid === 'me')!, NOW)).toEqual(['Docs (this session): Stopped an action outside your computer. This would send a message in Slack.', '   Stopped 2 min ago. It will not run unless you allow it. Type /vaken-guard allow once in that session, or leave it stopped.'])
})

test('a hold goes away when the step was let through later, when it is old, or when its session is gone', () => {
  const ledger = [{ at: NOW - MIN, session: 'a', what: ALLOW_USED_WHAT, did: true } as Entry, held('a', 'Held a risky command', 5 * MIN), held('b', 'Held a risky command', HOLD_LIVE_MS + MIN), held('gone', 'Held a risky command', MIN)]
  expect(buildInbox(facts({ ledger }))).toEqual([])
  expect(buildInbox(facts({ ledger: [{ ...held('a', 'Held a risky command', MIN), did: false }] }))).toEqual([])
})

test('an allow once that is set says so, and does not tell the person to type it again', () => {
  const items = buildInbox(facts({ ledger: [held('a', 'Held a risky command', MIN)], allowed: ['a'] }))
  expect(items[0]?.allowed).toBe(true)
  expect(items[0]?.todo).toBe('You already allowed one step there. It goes through at the next stopped step.')
})

test('a budget stop is cleared by Extended the budget; a held extra agent clears itself soon', () => {
  const open = buildInbox(facts({ ledger: [held('a', BUDGET_HELD, 4 * MIN, 'The session budget is used up.')] }))
  expect(open.map(x => x.kind)).toEqual(['budget'])
  expect(open[0]?.todo).toBe('Type /vaken-usage budget extend in that session, or leave it stopped.')
  expect(buildInbox(facts({ ledger: [{ at: NOW - MIN, session: 'a', what: EXTENDED_WHAT, did: true }, held('a', BUDGET_HELD, 4 * MIN)] }))).toEqual([])
  expect(buildInbox(facts({ ledger: [{ at: NOW - MIN, session: 'a', what: ALLOW_USED_WHAT, did: true }, held('a', BUDGET_HELD, 4 * MIN)] })).length).toBe(1)
  expect(buildInbox(facts({ ledger: [held('a', 'Held an extra agent', 5 * MIN, 'Three agents run.')] }))[0]?.todo).toMatch(/raise the limit in Settings > Agents/)
  expect(buildInbox(facts({ ledger: [held('a', 'Held an extra agent', 20 * MIN)] }))).toEqual([])
})

test('a halt and finished changes: the halt names its way out; the changes say "at least" because only the first sight is known', () => {
  const items = buildInbox(facts({ halts: [{ sid: 'b', at: NOW - 7 * MIN }], debts: [{ sid: 'a', turns: 2 }, { sid: 'b', turns: 0 }], seen: { 'review:a': NOW - 30 * MIN } }))
  expect(items.map(x => x.kind)).toEqual(['halt', 'review'])
  expect(itemLines(items[0]!, NOW)).toEqual(['Billing: Paused for safety. Commands, edits, tools, agents and web fetches are stopped.', '   Waiting 7 min. Open that session and press Resume.'])
  expect(itemLines(items[1]!, NOW)).toEqual(['Fix login: 2 finished answers changed files and wait for your look.', '   Waiting at least 30 min. Look at the changes, then type /vaken-ship reviewed in that session.'])
  expect(itemLines(buildInbox(facts({ debts: [{ sid: 'a', turns: 1 }] }))[0]!, NOW)[1]).toMatch(/^ {3}Look at the changes/)
})

test('the order: questions, permissions, holds, budget, halts, then finished changes; the oldest first', () => {
  const items = buildInbox(
    facts({
      asks: [{ sid: 'b', kind: 'question', tool: 'AskUserQuestion', since: NOW - MIN }, { sid: 'a', kind: 'question', tool: 'AskUserQuestion', since: NOW - 9 * MIN }],
      ledger: [held('a', BUDGET_HELD, MIN), held('b', 'Held a risky command', MIN)],
      halts: [{ sid: 'me', at: NOW - MIN }],
      debts: [{ sid: 'a', turns: 1 }],
    }),
  )
  expect(items.map(x => `${x.kind}:${x.name}`)).toEqual(['question:Fix login', 'question:Billing', 'hold:Billing', 'budget:Fix login', 'halt:Docs', 'review:Fix login'])
})

test('the band counts stopped steps and budget stops only, one per row as the card shows them, and says it in under 60 letters', () => {
  const items = buildInbox(facts({ asks: [{ sid: 'a', kind: 'question', tool: 'AskUserQuestion', since: NOW }], ledger: [held('a', 'Held a risky command', MIN), held('a', 'Held a risky command', 2 * MIN), held('b', BUDGET_HELD, MIN)] }))
  expect(items.filter(x => x.kind === 'hold' || x.kind === 'budget')).toHaveLength(2)
  expect(heldCount(items)).toBe(2)
  expect(heldCount(items.filter(x => x.kind === 'question'))).toBe(0)
  expect(inboxBandWords(1)).toBe('1 stopped step waits for you. Open Needs you.')
  expect(inboxBandWords(12)).toBe('12 stopped steps wait for you. Open Needs you.')
  expect(inboxBandWords(12).length).toBeLessThanOrEqual(60)
})

test('/vaken inbox text: a numbered list, then what vaken cannot do; calm says only that nothing waits', () => {
  const items = buildInbox(facts({ asks: [{ sid: 'a', kind: 'question', tool: 'AskUserQuestion', since: NOW - 2 * MIN }] }))
  expect(inboxText(items, NOW, true)).toBe(['Waiting for you: 1 thing.', '', '1. Fix login: Asks you a question.', '', '   Waiting 2 min. Open that session and answer it.', '', LIMITS_NOTE].join('\n'))
  expect(inboxText([], NOW, true)).toBe('Nothing waits for you.')
  expect(inboxText([], NOW, false)).toMatch(/^The inbox is off\. Turn it on: Settings > Notices\.\n\nNothing waits for you\./)
})

test('the queue: one clean sentence, no duplicates, a limit, and a spent sentence makes room', () => {
  expect(cleanQueued('  run the\n  tests   please ')).toBe('run the tests please')
  expect(cleanQueued('x'.repeat(900)).length).toBe(500)
  const a = addQueued([], 'run the tests', NOW, 'me')
  expect(a).toEqual({ queue: [{ text: 'run the tests', at: NOW, by: 'me', offers: 0 }], ok: true })
  expect(addQueued(a.queue, 'run  the tests', NOW, 'me')).toMatchObject({ ok: false, why: 'That sentence is already in the queue.' })
  expect(addQueued([], '   ', NOW, 'me')).toMatchObject({ ok: false })
  let q = a.queue
  for (let k = 1; k < QUEUE_MAX; k += 1) q = addQueued(q, `step ${k}`, NOW, 'me').queue
  expect(q.length).toBe(QUEUE_MAX)
  expect(addQueued(q, 'one more', NOW, 'me')).toMatchObject({ ok: false })
  const spent = q.map((x, k) => (k === 0 ? { ...x, offers: OFFER_MAX } : x))
  expect(addQueued(spent, 'one more', NOW, 'me').ok).toBe(true)
  expect(parseQueue('nope')).toEqual([])
  expect(parseQueue([{ text: 'a', at: 1, by: 'x', offers: 0 }, { text: 5 }])).toEqual([{ text: 'a', at: 1, by: 'x', offers: 0 }])
})

test('the offer: the first sentence not offered too often or too lately; sending it takes it out', () => {
  let q = addQueued(addQueued([], 'first', NOW, 'me').queue, 'second', NOW, 'me').queue
  expect(nextOffer(q, NOW)?.text).toBe('first')
  q = markOffered(q, 'first', NOW)
  expect(nextOffer(q, NOW + MIN)?.text).toBe('second')
  q = markOffered(q, 'second', NOW + MIN)
  expect(nextOffer(q, NOW + 2 * MIN)).toBeUndefined()
  expect(nextOffer(q, NOW + REOFFER_MS)?.text).toBe('first')
  for (let k = 0; k < OFFER_MAX; k += 1) q = markOffered(q, 'first', NOW + REOFFER_MS)
  expect(nextOffer(q, NOW + 99 * MIN)?.text).toBe('second')
  expect(dropSent(q, '  second ')).toEqual(q.filter(x => x.text !== 'second'))
  expect(dropSent(q, 'something else')).toEqual(q)
})

test('/vaken-pause steer words', () => {
  expect(parseSteerAsk('')).toEqual({ kind: 'list' })
  expect(parseSteerAsk('list')).toEqual({ kind: 'list' })
  expect(parseSteerAsk('stop')).toEqual({ kind: 'stop' })
  expect(parseSteerAsk('clear')).toEqual({ kind: 'clear' })
  expect(parseSteerAsk('queue run the tests')).toEqual({ kind: 'queue', text: 'run the tests' })
  expect(parseSteerAsk('queue @2 run the tests')).toEqual({ kind: 'queue', target: 2, text: 'run the tests' })
  expect(parseSteerAsk('queue 2 run the tests')).toEqual({ kind: 'queue', text: '2 run the tests' })
  expect(parseSteerAsk('send @3 stop after this file')).toEqual({ kind: 'send', target: 3, text: 'stop after this file' })
  expect(parseSteerAsk('send stop after this file')).toMatchObject({ kind: 'bad' })
  expect(parseSteerAsk('queue')).toMatchObject({ kind: 'bad' })
  expect(parseSteerAsk('stop now')).toMatchObject({ kind: 'bad' })
  expect(parseSteerAsk('dance')).toMatchObject({ kind: 'bad' })
})

test('/vaken-pause steer text lists this session, the others by number, and the limits', () => {
  const t = steerText({ name: 'Docs', queue: [{ text: 'run the tests', at: NOW - 5 * MIN, by: 'me', offers: 1 }], halted: false, others: [{ n: 1, name: 'Billing', state: 'working', queued: 0 }, { n: 2, name: 'Fix login', state: 'needs you', queued: 2 }], now: NOW })
  expect(t).toMatch(/^This session \(Docs\): 1 prompt queued\.\n {2}1\. "run the tests" \(queued 5 min ago, offered 1 time\)\n\nOther sessions:\n {2}@1 Billing: working\n {2}@2 Fix login: needs you, 2 queued\n/)
  expect(t).toMatch(/Nothing is sent by itself/)
  expect(t).toMatch(/It stops steps that change things, not thinking/)
  expect(steerText({ name: 'Docs', queue: [], halted: true, others: [], now: NOW })).toMatch(/no prompt queued\. It is paused\.\n\nNo other session is open\./)
})

test('the ledger titles are plain', () => {
  expect(INBOX_WHATS).toEqual(['Offered a queued prompt', 'Stopped this session', 'Sent a message to another session'])
  expect(QUEUE_OFFER_WHAT).toBe(INBOX_WHATS[0])
  expect(STEER_STOP_WHAT).toBe(INBOX_WHATS[1])
})

// ---- the hooks, as the engine runs them

function world(on: On, seed: (now: number) => Record<string, unknown> = () => ({}), here = 'me') {
  const clock = mock.clock(on, { now: NOW })
  const mem = new Map<string, unknown>(Object.entries(seed(NOW)))
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
  on('session.id', () => ({ value: here }))
  on('session.cwd', () => ({ value: '/w/a' }))
  on('session.root', () => ({ value: '/w/a' }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)
    return { value: undefined } as never
  })
  on('ui.invalidate', () => ({ value: undefined }))
  const state = { boxText: '', suggested: [] as string[], sent: [] as Array<{ to: unknown; text: string }>, aborted: [] as string[], answer: 'Send', delivered: true }
  on('prompt.suggest', (_$, e) => {
    if (state.boxText !== '') return { isShown: false } as never
    state.suggested.push(e.text)
    return { isShown: true } as never
  })
  on('session.send', (_$, e) => {
    state.sent.push({ to: e.to, text: e.text })
    return (state.delivered ? { isDelivered: true } : { isDelivered: false, reason: 'nobody by that name' }) as never
  })
  on('turn.abort', (_$, e) => {
    state.aborted.push((e as unknown as { turnId: string }).turnId)
    return { value: undefined } as never
  })
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', { tool: 'AskUserQuestion' }, (_$, e) => {
    const q = (e as unknown as { questions: Array<{ question: string }> }).questions
    return { result: { questions: q, answers: Object.fromEntries(q.map(x => [x.question, state.answer])) }, text: '' } as never
  })
  return { clock, mem, toasts, state }
}


function ioOf(w: { clock: { now: () => number }; mem: Map<string, unknown>; toasts: string[] }, sid = 'me'): Io {
  return {
    now: async () => w.clock.now(),
    home: async () => '',
    sessionId: async () => sid,
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

const boxOf = (w: { state: { boxText: string; suggested: string[] } }) => async (text: string): Promise<boolean> => {
  if (w.state.boxText !== '') return false
  w.state.suggested.push(text)
  return true
}
const check = (w: ReturnType<typeof world>): Promise<void> => inboxCheck(ioOf(w), boxOf(w))

const rec = (id: string, at: number, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/w/${id}`, model: 'm', state: 'working', startedAt: at - 30 * MIN, updatedAt: at - 5_000, lastEventAt: at - 5_000, stateSince: at - 30 * MIN, ...over })
const text = async ($: EngineInterface, command: string, args = ''): Promise<string> => ((await $.command.run({ ...viaParent(command, args), origin: { kind: 'composer' } } as never)) as { text: string }).text
const whats = (mem: Map<string, unknown>): string[] => ((mem.get('cockpit:ledger:compact') as Array<{ what: string }> | undefined) ?? []).map(l => l.what)

test('/vaken inbox lists a question, a hold and finished changes of the sessions that are open, and nothing from a session that closed', async ($, on) => {
  const w = world(on, now => ({
    'cockpit:session:me': rec('me', now, { title: 'Docs' }),
    'cockpit:session:a': rec('a', now, { title: 'Fix login', state: 'waiting', ask: { kind: 'question', tool: 'AskUserQuestion', since: now - 12 * MIN } }),
    'cockpit:ledger:compact': [held('a', 'Held a risky command', 4 * MIN), held('closed', 'Held a risky command', 4 * MIN)],
    'cockpit:proof:me': { ...emptyState(), debt: 2 },
  }))
  const t = await text($, 'vaken-inbox')
  expect(t).toMatch(/^Waiting for you: 3 things\.\n\n1\. Fix login: Asks you a question\.\n\n {3}Waiting 12 min\. Open that session and answer it\.\n\n2\. Fix login: Stopped a risky command\. This would delete files\.\n\n {3}Stopped 4 min ago\. It will not run unless you allow it\. Open that session; its pane has Allow once\./)
  expect(t).toMatch(/3\. Docs \(this session\): 2 finished answers changed files and wait for your look\./)
  expect(t).not.toMatch(/closed/)
  expect(t).toMatch(/cannot press OK/)
  expect((w.mem.get('cockpit:inbox:seen') as Record<string, number>)['review:me']).toBe(w.clock.now())
})

test('stopped steps put a count in the band of every session; it goes when nothing is held; Off posts nothing', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now), 'cockpit:ledger:compact': [held('me', 'Held a risky command', 4 * MIN)] }))
  await check(w)
  const band = () => ((w.mem.get('cockpit:band:me') ?? []) as Array<{ id: string; level: string; text: string }>).filter(b => b.id === 'inbox')
  expect(band().map(b => [b.level, b.text])).toEqual([['warn', '1 stopped step waits for you. Open Needs you.']])
  // One count serves every session for half a check period, so the next look comes after it.
  await w.clock.advance(11_000)
  w.mem.set('cockpit:ledger:compact', [{ at: w.clock.now(), session: 'me', what: 'Let a stopped step through', did: true }, held('me', 'Held a risky command', 4 * MIN)])
  await check(w)
  expect(band()).toEqual([])
  w.mem.set('cockpit:ledger:compact', [held('me', 'Held a risky command', MIN)])
  w.mem.set('cockpit:setting:inbox.mode', 'off')
  await check(w)
  expect(band()).toEqual([])
  expect(await text($, 'vaken-inbox')).toMatch(/^The inbox is off/)
})

test('a typed message clears its stopped step from the band at once, though the leader counted it seconds before', async ($, on) => {
  const w = world(on, now => ({
    'cockpit:session:a': rec('a', now, { title: 'Docs' }),
    'cockpit:session:b': rec('b', now, { title: 'Fix login' }),
    'cockpit:leader': { sid: 'a', until: now + LEADER_LEASE_MS, quiet: false, v: LEADER_SCHEMA },
    // A stamp of its own, so no records copy kept from an earlier test is read.
    'cockpit:records:stamp': `${now}:b`,
    'cockpit:ledger:compact': [held('b', 'Held a risky command', 4 * MIN)],
  }), 'b')
  const inboxLine = (sid: string) => ((w.mem.get(`cockpit:band:${sid}`) ?? []) as Array<{ id: string; text: string }>).filter(b => b.id === 'inbox').map(b => b.text)
  await inboxCheck(ioOf(w, 'a'), boxOf(w))
  expect(inboxLine('a')).toEqual(['1 stopped step waits for you. Open Needs you.'])
  // B's own timer (one check period, 20 s) shows the line, as it does in a real session.
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'x' } }))
  await $.session.start({ cwd: '/w/b', surface: 'desktop', isInteractive: true } as never)
  await w.clock.advance(20_000)
  await inboxCheck(ioOf(w, 'a'), boxOf(w))
  expect(inboxLine('b')).toEqual(['1 stopped step waits for you. Open Needs you.'])
  await w.clock.advance(3_000)
  await $.prompt.submit({ text: 'leave that, do the docs' } as never).catch(() => undefined)
  await w.clock.settle()
  expect(inboxLine('b')).toEqual([])
  // The shared count is seconds old, but the records moved since, so B counts again rather than trust it.
  await w.clock.advance(3_000)
  await inboxCheck(ioOf(w, 'b'), boxOf(w))
  expect(inboxLine('b')).toEqual([])
  await inboxCheck(ioOf(w, 'a'), boxOf(w))
  expect(inboxLine('a')).toEqual([])
})

test('/vaken-pause steer queue: the sentence is stored for this session; at a quiet moment it is proposed in the prompt box; a typed copy takes it out', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now, { title: 'Docs', state: 'waiting' }) }))
  expect(await text($, 'vaken-steer', 'queue run the tests  now')).toMatch(/^Queued for this session: "run the tests now"\./)
  expect((w.mem.get('cockpit:steer:queue:me') as Array<{ text: string }>).map(x => x.text)).toEqual(['run the tests now'])
  await w.clock.advance(3_000)
  await check(w)
  expect(w.state.suggested).toEqual(['run the tests now'])
  expect(w.toasts.at(-1)).toMatch(/queued prompt is ready/)
  expect(whats(w.mem)).toContain('Offered a queued prompt')
  await w.clock.advance(60_000)
  await check(w)
  expect(w.state.suggested.length).toBe(1)
  await $.prompt.submit({ text: 'run the tests now' } as never).catch(() => undefined)
  await w.clock.settle()
  expect((w.mem.get('cockpit:steer:queue:me') as unknown[]).length).toBe(0)
  expect(JSON.stringify([w.mem.get('cockpit:ledger:compact'), w.mem.get('cockpit:band:me'), w.mem.get('cockpit:inbox:seen')])).not.toMatch(/run the tests now/)
})

test('a draft in the prompt box is never touched: the offer waits until the box is empty', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now, { state: 'waiting' }) }))
  w.state.boxText = 'I am typing'
  await text($, 'vaken-steer', 'queue check the logs')
  await check(w)
  expect(w.state.suggested).toEqual([])
  w.state.boxText = ''
  await check(w)
  expect(w.state.suggested).toEqual(['check the logs'])
})

test('/vaken-pause steer queue @2 puts the sentence in the queue of the other session, by the numbers /vaken-pause steer shows', async ($, on) => {
  const w = world(on, now => ({
    'cockpit:session:me': rec('me', now, { title: 'Docs' }),
    'cockpit:session:a': rec('a', now, { title: 'Billing' }),
    'cockpit:session:b': rec('b', now, { title: 'Fix login', state: 'waiting' }),
  }))
  const list = await text($, 'vaken-steer')
  expect(list).toMatch(/@1 Billing: working\n {2}@2 Fix login: finished, waits for you/)
  expect(await text($, 'vaken-steer', 'queue @2 write the summary')).toMatch(/^Queued for "Fix login": "write the summary"/)
  expect((w.mem.get('cockpit:steer:queue:b') as Array<{ text: string; by: string }>).map(x => [x.text, x.by])).toEqual([['write the summary', 'me']])
  expect(w.mem.get('cockpit:steer:queue:me')).toBeUndefined()
  expect(await text($, 'vaken-steer', 'queue @9 hello')).toBe('There is no session @9. /vaken-pause steer shows the numbers.')
  expect(await text($, 'vaken-steer')).toMatch(/@2 Fix login: finished, waits for you, 1 queued/)
  expect(w.state.sent).toEqual([])
})

test('/vaken-pause steer send asks first, sends only after Send, and says what the engine answered', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now), 'cockpit:session:a': rec('a', now, { title: 'Billing' }) }))
  w.state.answer = 'Cancel'
  expect(await text($, 'vaken-steer', 'send @1 stop after this file')).toBe('Not sent. You said no.')
  expect(w.state.sent).toEqual([])
  w.state.answer = 'Send'
  expect(await text($, 'vaken-steer', 'send @1 stop after this file')).toBe('Sent to "Billing". It reads it as a message from this session.')
  expect(w.state.sent).toEqual([{ to: 'a', text: 'stop after this file' }])
  expect(whats(w.mem)).toContain('Sent a message to another session')
  w.state.delivered = false
  expect(await text($, 'vaken-steer', 'send @1 again')).toBe('Not sent. nobody by that name')
})

test('/vaken-pause steer stop sets the guard halt flag of this session only, and says it stops changes, not thinking', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now), 'cockpit:session:a': rec('a', now) }))
  const t = await text($, 'vaken-steer', 'stop')
  expect(t).toMatch(/^Paused for safety\. Commands, edits, tools, agents and web fetches are stopped in this session until \/vaken-pause off\. This stops doing, not thinking/)
  expect(w.mem.get('cockpit:halt:me')).toEqual({ at: w.clock.now() })
  expect(w.mem.get('cockpit:halt:a')).toBeUndefined()
  expect(whats(w.mem)).toContain('Stopped this session')
  expect(await text($, 'vaken-steer')).toMatch(/It is paused\./)
})

test('/vaken-pause steer stop also cancels the turn that runs now, and only that one', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now) }))
  await $.turn.start({ text: 'go', turnId: 't1' } as never)
  expect(await text($, 'vaken-steer', 'stop')).toMatch(/The running answer was also cancelled\.$/)
  expect(w.state.aborted).toEqual(['t1'])
  expect(w.mem.get('cockpit:ledger:compact')).toEqual([expect.objectContaining({ what: 'Stopped this session', detail: 'Paused all changes and cancelled the running answer.' })])
  await $.turn.complete({ answer: 'ok', durationMs: 1000, isAborted: true, turnId: 't1', reason: 'aborted' } as never)
  await text($, 'vaken-pause', 'off')
  expect(await text($, 'vaken-steer', 'stop')).not.toMatch(/turn/)
  expect(w.state.aborted).toEqual(['t1'])
})

test('/vaken-pause steer clear empties the queue of this session', async ($, on) => {
  const w = world(on, now => ({ 'cockpit:session:me': rec('me', now, { state: 'working' }), 'cockpit:steer:queue:me': [{ text: 'later', at: now, by: 'me', offers: 0 }] }))
  expect(await text($, 'vaken-steer', 'clear')).toBe('The queue of this session is empty.')
  expect(w.mem.get('cockpit:steer:queue:me')).toEqual([])
})
