// Act from the pane: answer another session that asks a question (never an OK box), reply to one whose turn it is.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { VIEW_STRINGS } from '../hooks/core/lang'
import { emptyState, stateKey } from '../hooks/core/proof'
import { SKILLS_COUNTS_KEY, SKILLS_LISTING_KEY, commandEntries, findCommands, isOwnCommand } from '../hooks/core/skills'
import { NUDGE_EVERY_MS, answerText, askWhat, betterPrompt, canAnswer, canNudge, factsOf, mayBeStuck, noteVerdict, talkMem } from '../hooks/core/talk'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')
const id = (s: string): string => s

test('may be stuck is the heartbeat\'s rule for any session: working, no real event for 20 minutes, nothing asked, record still fresh', () => {
  const rec = { state: 'working', lastEventAt: NOW - 25 * MIN, updatedAt: NOW - 5000 } as const
  expect(mayBeStuck(rec, NOW)).toBe(true)
  expect(mayBeStuck({ ...rec, lastEventAt: NOW - 15 * MIN }, NOW)).toBe(false)
  expect(mayBeStuck({ ...rec, state: 'waiting' }, NOW)).toBe(false)
  expect(mayBeStuck({ ...rec, ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - MIN } }, NOW)).toBe(false)
  expect(mayBeStuck({ ...rec, updatedAt: NOW - 5 * MIN }, NOW)).toBe(false)
})

test('one nudge per session per 10 minutes, counted in memory', () => {
  talkMem.nudged.clear()
  expect(canNudge('a', NOW)).toBe(true)
  talkMem.nudged.set('a', NOW)
  expect(canNudge('a', NOW + MIN)).toBe(false)
  expect(canNudge('b', NOW + MIN)).toBe(true)
  expect(canNudge('a', NOW + NUDGE_EVERY_MS)).toBe(true)
  talkMem.nudged.clear()
})

test('only a question gets an answer box; an OK box says to answer it in that session; the question\'s words are not kept', () => {
  expect(canAnswer({ ask: { kind: 'question', tool: 'AskUserQuestion', since: 0 } })).toBe(true)
  expect(canAnswer({ ask: { kind: 'permission', tool: 'Bash', since: 0 } })).toBe(false)
  expect(canAnswer({})).toBe(false)
  const q = askWhat('m', { ask: { kind: 'question', tool: 'AskUserQuestion', since: 0 } }, '5 min', id, 's1')
  expect(q.facts).toEqual(['Claude asked you a question.', 'It is in your session list under s1. Open that session to read it.'])
  expect(q.why).toBe('It has waited 5 min.')
  expect(q.next).toBeUndefined()
  const p = askWhat('m', { ask: { kind: 'permission', tool: 'Bash', since: 0 } }, '3 min', id)
  expect(p.facts).toEqual(['It waits to run Bash and may need your OK.'])
  expect(askWhat('m', { ask: { kind: 'permission', tool: 'Bash', since: 0 } }, '3 min', id, 's2').facts?.[1]).toBe('It is in your session list under s2. Open that session to read it.')
  expect(p.next).toBe('Answer it in that session. Vaken never says yes for you.')
  expect(answerText('  yes,\n the second  ')).toBe('yes, the second')
  expect(answerText('   ')).toBeUndefined()
  expect(answerText('x'.repeat(900))?.length).toBe(500)
})

test('the better prompt keeps the person\'s words and adds what is missing from what vaken knows, else asks Claude to name it', () => {
  expect(betterPrompt('fix it', { failing: [] })).toBe(
    ['fix it.', 'Start by naming the file or the part you will change.', 'Before you start, say in one line what done looks like.', 'If anything is still unclear, ask me one short question first.'].join('\n'),
  )
  expect(betterPrompt('make it better!', { failing: ['tests', 'types'], file: 'login.ts', goal: 'Users can sign in' })).toBe(
    ['make it better!', 'It is about the tests and the type check, which failed after the last change.', 'The last file changed is login.ts.', 'The goal: Users can sign in.', 'If anything is still unclear, ask me one short question first.'].join('\n'),
  )
  const proof = { ...emptyState(), seq: 2, lastEditSeq: 1, receipts: [{ kind: 'tests' as const, ok: false, at: NOW, seq: 2 }], lastEditFile: 'a.ts', goal: { text: 'Ship   it', setAt: NOW, how: 'typed' as const } }
  expect(factsOf(proof)).toEqual({ failing: ['tests'], file: 'a.ts', goal: 'Ship it' })
  expect(factsOf(undefined)).toEqual({ failing: [] })
})

test('the prompt review keeps only the last prompt, only while it is vague, in memory', () => {
  noteVerdict('s', NOW, ' fix it ', { vague: true, why: 'command' })
  expect(talkMem.vague).toEqual({ at: NOW, sid: 's', text: 'fix it', why: 'command' })
  noteVerdict('s', NOW + 1, 'add a dark mode toggle to settings.tsx', { vague: false, why: 'clear' })
  expect(talkMem.vague).toBeUndefined()
})

test('this plugin\'s own commands are kept in the search and marked, by the engine\'s plugin field or, without it, by the name', () => {
  const list = commandEntries(
    [
      { name: 'vaken-usage', description: 'Read the usage card', source: 'plugin', plugin: 'vaken' },
      { name: 'vaken', description: 'Show what needs you', source: 'plugin' },
      { name: 'grilling', description: 'Grill a plan', source: 'plugin', plugin: 'other' },
      { name: 'cockpitish', description: 'not ours', source: 'plugin' },
    ],
    'vaken',
  )
  expect(list.map(c => [c.name, c.own === true])).toEqual([['vaken-usage', true], ['vaken', true], ['grilling', false], ['cockpitish', false]])
  expect(findCommands(list, 'usage', {}, NOW)[0]).toMatchObject({ name: 'vaken-usage', own: true })
  expect(isOwnCommand({ name: 'vaken-x', source: 'plugin', plugin: 'other' }, 'vaken')).toBe(false)
  expect(isOwnCommand({ name: 'vaken-x', source: 'plugin' }, undefined)).toBe(false)
})

test('every word is a view string with a Swedish line', () => {
  const words = englishOf('talk')
  expect(words.filter(w => !VIEW_STRINGS.includes(w))).toEqual([])
  expect(words.filter(w => (SV[w] ?? '') === '')).toEqual([])
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }

function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
}

function memStore(on: On, seed: Record<string, unknown>): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', 'cockpit:setting:detail': 'explained', 'cockpit:setting:heartbeat.mode': 'on', ...seed }))
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  return mem
}

const rec = (sid: string, now: number, over: Record<string, unknown> = {}) => ({ sessionId: sid, cwd: `/work/${sid}`, model: 'm', state: 'working', startedAt: now - 60 * MIN, updatedAt: now - 2000, lastEventAt: now - 2000, stateSince: now - 3 * MIN, ...over })

const world = (now: number, over: Record<string, unknown> = {}) => ({
  'cockpit:firstrun': 'done',
  'cockpit:pref:lists': { others: 'all' },
  'cockpit:session:test-session': rec('test-session', now, { cwd: '/work/app', state: 'idle' }),
  'cockpit:session:q1': rec('q1', now, { state: 'waiting', ask: { kind: 'question', tool: 'AskUserQuestion', since: now - 6 * MIN } }),
  'cockpit:session:p1': rec('p1', now, { ask: { kind: 'permission', tool: 'Bash', since: now - 3 * MIN } }),
  'cockpit:session:t1': rec('t1', now, { state: 'waiting', stateSince: now - 2 * MIN }),
  'cockpit:session:s1': rec('s1', now, { lastEventAt: now - 25 * MIN }),
  ...over,
})

const toastsOf = (on: On): string[] => {
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  return toasts
}
type Sent = { to: string; text: string }
const sendsOf = (on: On, answer: (e: Sent) => { isDelivered: boolean; reason?: string } = () => ({ isDelivered: true })): Sent[] => {
  const sent: Sent[] = []
  on('session.send', (_$, e) => {
    const s = { to: JSON.stringify((e as { to: unknown }).to), text: (e as { text: string }).text }
    sent.push(s)
    return answer(s) as never
  })
  return sent
}
const submitsOf = (on: On): string[] => {
  const sent: string[] = []
  on('prompt.submit', (_$, e) => {
    sent.push((e as { text: string }).text)
    return e as never
  })
  return sent
}
type Ui = { find: (q: unknown) => Promise<unknown>; press: (a: { key: string }) => Promise<void>; input: (a: { key: string; text: string; kind: 'change' | 'submit' }) => Promise<void>; redraw: () => Promise<void>; unmount: () => Promise<void> }
const textOf = async (ui: Ui, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0], surface: 'desktop' | 'mobile' = 'desktop') => $.ui.mount({ plugin: 'vaken', surface, component: 'Pane', requestId: 'cockpit-home', props: paneProps }) as Promise<Ui>

test('a question in another session opens with what is known and an answer box; Send sends a message there and says so', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world(NOW))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const sent = sendsOf(on)
  const ui = await mountPane($)
  expect(await ui.find({ key: 'answer-q1' })).toBeUndefined()
  await ui.press({ key: 'press-n-q1-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Claude asked you a question\.$/)).toBe(true)
  expect(await textOf(ui, /AskUserQuestion/)).toBe(false)
  expect(await textOf(ui, /^It is in your session list under q1\. Open that session to read it\.$/)).toBe(true)
  expect(await textOf(ui, /^Your answer is sent to q1 as a message from you\./)).toBe(true)
  expect(((await ui.find({ key: 'w-needs:q1-set' })) as { props?: { label?: string } } | undefined)?.props?.label).toBe('Change notices')
  expect(await ui.find({ key: 'answer-q1' })).toBeDefined()
  expect(((await ui.find({ key: 'answer-q1' })) as { props?: { placeholder?: string } } | undefined)?.props?.placeholder).toBe('Answer q1')
  await ui.input({ key: 'answer-q1', text: '   ', kind: 'submit' })
  await clock.settle()
  expect(sent).toEqual([])
  await ui.input({ key: 'answer-q1', text: 'the second one', kind: 'change' })
  await ui.redraw()
  expect(((await ui.find({ key: 'answer-q1' })) as { props?: { value?: string } } | undefined)?.props?.value).toBe('the second one')
  await ui.input({ key: 'answer-q1', text: 'the second one', kind: 'submit' })
  await clock.settle()
  expect(sent.map(s => s.text)).toEqual(['the second one'])
  expect(sent[0]?.to).toContain('q1')
  expect(toasts.some(t => /^Sent to .+\.$/.test(t))).toBe(true)
  await ui.redraw()
  expect(((await ui.find({ key: 'answer-q1' })) as { props?: { value?: string } } | undefined)?.props?.value).toBe('')
  await ui.unmount()
})

test('an OK box in another session has no answer box: it says to answer it there, and nothing is sent', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world(NOW))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const sent = sendsOf(on)
  const ui = await mountPane($)
  await ui.press({ key: 'press-n-p1-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^It waits to run Bash and may need your OK\.$/)).toBe(true)
  expect(await textOf(ui, /^What you can do: Answer it in that session\. Vaken never says yes for you\.$/)).toBe(true)
  expect(await ui.find({ key: 'answer-p1' })).toBeUndefined()
  expect(sent).toEqual([])
  await ui.unmount()
})

test('a refused send says why; on the phone (no Input) the open row has no box', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world(NOW))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  sendsOf(on, () => ({ isDelivered: false, reason: 'the recipient is gone' }))
  const ui = await mountPane($)
  await ui.press({ key: 'press-n-q1-0' })
  await clock.settle()
  await ui.redraw()
  await ui.input({ key: 'answer-q1', text: 'yes', kind: 'submit' })
  await clock.settle()
  expect(toasts).toContain('Not sent: the recipient is gone')
  await ui.unmount()
  const phone = await mountPane($, 'mobile')
  expect(await textOf(phone, /^Claude asked you a question\./)).toBe(true)
  expect(await phone.find({ key: 'answer-q1' })).toBeUndefined()
  await phone.unmount()
})

test('a your-turn row of Other sessions opens with a reply box that sends a message', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world(NOW))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const sent = sendsOf(on)
  const ui = await mountPane($)
  expect(await ui.find({ key: 'answer-t1' })).toBeUndefined()
  await ui.press({ key: 'press-o-t1-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Your reply is sent to t1 as a message from you and starts its next answer\.$/)).toBe(true)
  await ui.input({ key: 'answer-t1', text: 'now the footer', kind: 'submit' })
  await clock.settle()
  expect(sent.map(s => s.text)).toEqual(['now the footer'])
  await ui.unmount()
})

test('a session that may be stuck shows Nudge; one press sends continue once, a second press within 10 minutes sends nothing', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world(NOW))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const sent = sendsOf(on)
  const submitted = submitsOf(on)
  const ui = await mountPane($)
  expect(await textOf(ui, /^May be stuck: no sign for 25 min$/)).toBe(true)
  expect(await textOf(ui, /^Nudge · sends continue$/)).toBe(true)
  // Never by itself: nothing went before the press.
  expect(sent).toEqual([])
  await ui.press({ key: 'press-ol-nudge:s1-0' })
  await clock.settle()
  expect(sent.map(s => s.text)).toEqual(['continue'])
  expect(sent[0]?.to).toContain('s1')
  expect(submitted).toEqual([])
  expect(toasts).toContain('Nudged: sent continue.')
  await ui.redraw()
  expect(await textOf(ui, /^nudged$/)).toBe(true)
  await ui.press({ key: 'press-ol-nudge:s1-0' })
  await clock.settle()
  expect(sent.length).toBe(1)
  expect(toasts).toContain('Nudged less than 10 minutes ago. Give it a moment.')
  await ui.unmount()
})

test('this session, when it may be stuck, is nudged with continue as the person\'s prompt; the setting off shows no nudge', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world(NOW, { 'cockpit:session:test-session': rec('test-session', NOW, { cwd: '/work/app', lastEventAt: NOW - 22 * MIN }), 'cockpit:session:s1': rec('s1', NOW) }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const sent = sendsOf(on)
  const submitted = submitsOf(on)
  const ui = await mountPane($)
  expect(await textOf(ui, /^May be stuck: no sign for 22 min$/)).toBe(true)
  await ui.press({ key: 'press-ol-nudge:test-session-0' })
  await clock.settle()
  expect(submitted).toEqual(['continue'])
  expect(sent).toEqual([])
  expect(toasts).toContain('Nudged: continue goes in when the answer ends. If it is stuck, press Stop in the app first.')
  await ui.unmount()
})

test('the quiet alert off shows no nudge', { timeoutMs: 15_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on, world(NOW, { 'cockpit:setting:heartbeat.mode': 'off' }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const ui = await mountPane($)
  expect(await textOf(ui, /^May be stuck/)).toBe(false)
  await ui.unmount()
})

test('after a vague prompt This session offers the better one: shown in full first, sent as the person\'s prompt on a press, then gone', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const proof = { ...emptyState(), seq: 2, lastEditSeq: 1, edits: 1, turns: 1, receipts: [{ kind: 'tests', ok: false, at: NOW - MIN, seq: 2 }], lastEditFile: 'login.ts' }
  memStore(on, world(NOW, { 'cockpit:setting:prompt.check': 'tip', [stateKey('test-session')]: proof }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const submitted = submitsOf(on)
  await $.prompt.submit({ text: 'fix it' } as never).catch(() => undefined)
  submitted.length = 0
  const ui = await mountPane($)
  expect(await textOf(ui, /^Your last prompt may be too short$/)).toBe(true)
  expect(await textOf(ui, /^See a better one$/)).toBe(true)
  await ui.press({ key: 'press-ol-better-0' })
  await clock.settle()
  await ui.redraw()
  const better = betterPrompt('fix it', { failing: ['tests'], file: 'login.ts' })
  expect(await textOf(ui, /^The better prompt, in full:$/)).toBe(true)
  for (const line of better.split('\n')) expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
  expect(submitted).toEqual([])
  await ui.press({ key: 'w-better-set' })
  await clock.settle()
  expect(submitted).toEqual([better])
  expect(toasts).toContain('Sent the better prompt.')
  await ui.redraw()
  expect(await textOf(ui, /^Your last prompt may be too short$/)).toBe(false)
  await ui.unmount()
})

test('Not now forgets the vague prompt and sends nothing', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world(NOW, { 'cockpit:setting:prompt.check': 'ask' }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const submitted = submitsOf(on)
  await $.prompt.submit({ text: 'make it nicer' } as never).catch(() => undefined)
  submitted.length = 0
  const ui = await mountPane($)
  await ui.press({ key: 'press-ol-better-0' })
  await clock.settle()
  await ui.redraw()
  await ui.press({ key: 'better-drop' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Your last prompt may be too short$/)).toBe(false)
  expect(submitted).toEqual([])
  await ui.unmount()
})

test('a match of this plugin\'s own command says Type it, and its press says to type it, with no run', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  // Only this session, and the Skills card's counts and list, so the card shows at Full with its search box.
  memStore(on, { 'cockpit:firstrun': 'done', 'cockpit:session:test-session': rec('test-session', NOW, { cwd: '/work/app', state: 'idle' }), [SKILLS_COUNTS_KEY]: { '2026-10-10': { grilling: 2 } }, [SKILLS_LISTING_KEY]: { at: NOW - MIN, total: 2, included: 2, tokens: 900, names: ['grilling'] } })
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  on('command.list', () => ({ value: [{ name: 'vaken-usage', description: 'Read the usage card', source: 'plugin', plugin: 'vaken' }, { name: 'usage-report', description: 'Another usage', source: 'plugin', plugin: 'other' }] }) as never)
  const ran: string[] = []
  on('command.run', (_$, e) => {
    ran.push(e.command)
    return { text: '' }
  })
  const ui = await mountPane($)
  await ui.input({ key: 'skills-find-box', text: 'usage', kind: 'submit' })
  await clock.advance(1000)
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^\/vaken-usage$/)).toBe(true)
  expect(await textOf(ui, /^Type it$/)).toBe(true)
  await ui.press({ key: 'press-ol-skills:find-vaken-usage-0' })
  await clock.settle()
  expect(ran).toEqual([])
  expect(toasts).toContain('Type /vaken-usage in the session. Vaken cannot run its own commands from its pane.')
  await ui.press({ key: 'press-ol-skills:find-usage-report-0' })
  await clock.settle()
  expect(ran).toEqual(['usage-report'])
  await ui.unmount()
})
