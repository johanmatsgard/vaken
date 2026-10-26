// Question relay: when a tool server asks the person something in one session, every other session's band names that session in one
// plain line with an Open session press. The session's record keeps only a hash and the time of each open question; vaken never answers it.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import { RELAY_KEEP_MS, liveQuestions, relayOf, relayOpenArgs, relayWords, withQuestion, withoutQuestion } from '../hooks/core/relay'
import type { RelayView } from '../hooks/core/relay'
import { goodRecord } from '../hooks/core/record'
import { FOCUS_BAND_ID } from '../hooks/core/focus'
import { setLang, t } from '../hooks/core/lang'
import { relayMem } from '../hooks/features/relay'
import { HomeBand, bandPlan } from '../hooks/features/home/band'
import type { View } from '../hooks/features/home/logic'
import { WARNING } from '../hooks/ui/kit'
import type { El } from '../hooks/ui/kit'
import { BASE_SEEDS, HOME, MIN, NOW, SETUP_BASE, engine, rec, textsOf } from './statefixtures'
import type { Node, World } from './statefixtures'

const QUESTION = 'Which account should I charge for the order?'

test('one entry per question, newest first: a hash and a time; the answer clears that one, else the oldest; old ones are let go', () => {
  const two = withQuestion(withQuestion([], 'h1', NOW - 2000), 'h2', NOW - 1000)
  expect(two.map(q => q.h)).toEqual(['h2', 'h1'])
  for (const q of two) expect(Object.keys(q).sort()).toEqual(['at', 'h'])
  expect(withoutQuestion(two, 'h2').map(q => q.h)).toEqual(['h1'])
  expect(withoutQuestion(two, undefined).map(q => q.h)).toEqual(['h2'])
  expect(liveQuestions(two, NOW + RELAY_KEEP_MS)).toEqual([])
  expect(withQuestion([{ h: 'old', at: NOW - RELAY_KEEP_MS - 1 }], 'new', NOW).map(q => q.h)).toEqual(['new'])
  // A broken stored value is dropped from the record, never drawn
  expect(goodRecord({ sessionId: 's', cwd: '/w', updatedAt: NOW, questions: [{ h: 1 }] })?.questions).toBeUndefined()
})

test('the band names the newest question of another live session, never this session\'s own', () => {
  const askers = [
    { sid: 'here-session', name: 'Here', questions: [{ h: 'a', at: NOW - 100 }] },
    { sid: 'web-1111', name: 'Web fixes', questions: [{ h: 'b', at: NOW - 5000 }], link: 'claude://session/local_web-1111', appId: 'local_web-1111' },
    { sid: 'docs-2222', name: 'Docs', questions: [{ h: 'c', at: NOW - 9000 }] },
  ]
  const r = relayOf(askers, 'here-session', NOW)
  expect(r?.name).toBe('Web fixes')
  expect(relayOpenArgs(r as RelayView)).toEqual({ session_id: 'local_web-1111', target: 'focus' })
  expect(relayOf(askers, 'here-session', NOW + RELAY_KEEP_MS)).toBeUndefined()
  expect(relayWords(r as RelayView).text).toBe('A tool in Web fixes asks you a question')
  setLang('sv')
  try {
    expect(relayWords(r as RelayView, t).text).toBe('Ett verktyg i Web fixes ställer en fråga till dig')
    expect(relayWords(r as RelayView, t).short).toBe('Fråga i Web fixes')
  } finally {
    setLang('en')
  }
})

type N = { type: string; props: Record<string, unknown> }
const mk = (type: string) => (p: Record<string, unknown>): N => ({ type, props: p ?? {} })
const el = { Box: mk('Box'), Text: mk('Text'), Button: mk('Button'), Svg: mk('Svg'), host: { Client: mk('Client'), Link: mk('Link') }, drag: true } as unknown as El
const flat = (n: unknown, out: N[] = []): N[] => {
  if (Array.isArray(n)) for (const c of n) flat(c, out)
  else if (n !== null && typeof n === 'object' && 'type' in n) {
    out.push(n as N)
    flat((n as N).props.children, out)
  }
  return out
}
const RELAY: RelayView = { sid: 'web-1111', name: 'Web fixes', at: NOW - 1000 }
const view = (over: Partial<View> = {}): View => ({ needs: [], working: [], waiting: [], idle: [], now: NOW, relay: RELAY, ...over })

test('one amber line with the Needs you mark and Open session, counted in Needs you; a narrow band says the short form; a warning keeps its place', () => {
  const plan = bandPlan(view(), 'explained', 100, [], false, false, true)
  expect(plan.mode === 'line' && plan.text).toBe('◆ A tool in Web fixes asks you a question')
  expect(plan.mode === 'line' && plan.info).toBe(false)
  expect(plan.mode === 'line' && plan.needs).toBe(1)
  // A session Needs you already counts is not counted twice
  const counted = bandPlan(view({ needs: [{ rec: { sessionId: 'web-1111' } }] as unknown as View['needs'] }), 'explained', 100, [], false, false, true)
  expect(counted.mode === 'line' && counted.needs).toBe(1)
  expect(plan.mode === 'line' && plan.open?.label).toBe('Open session')
  const narrow = bandPlan(view(), 'explained', 40, [], false, false, true)
  expect(narrow.mode === 'line' && narrow.text).toBe('◆ Question in Web fixes')
  const warn = bandPlan(view({ band: [{ id: 'agentstuck', level: 'warn', text: 'An agent made no progress for 10 min', at: NOW - 1000, ttlMs: 600_000 }] }), 'explained', 100, [], false, false, true)
  // A warning keeps the line place from the relay; the question still counts in Needs you, so the chip leads and See all opens the rest
  expect(warn.mode === 'line' && warn.needs).toBe(1)
  expect(warn.mode === 'line' && warn.open?.label).toBe('See all')
  // A real wait on the person: amber, beside the Needs you chip that counts it
  const drawn = flat(HomeBand(el, view(), 'explained', () => undefined, undefined, undefined, 100, undefined, undefined, () => undefined))
  const line = drawn.find(n => n.type === 'Text' && JSON.stringify(n.props.children).includes('Web fixes'))
  expect(line?.props.dimColor).toBe(false)
  expect(line?.props.color).toBe(WARNING)
  expect(drawn.some(n => n.type === 'Button' && String(n.props.label).includes('1 needs you'))).toBe(true)
})

test('while Quiet is on, the relay line never hides End quiet: it is the one button, and it ends Quiet', () => {
  const quiet = { id: FOCUS_BAND_ID, level: 'info' as const, text: 'Quiet until 14:00', at: NOW - 1000, ttlMs: 3_600_000 }
  const plan = bandPlan(view({ band: [quiet] }), 'explained', 100, [], true, false, true)
  expect(plan.mode === 'line' && plan.text).toBe('◆ A tool in Web fixes asks you a question')
  expect(plan.mode === 'line' && plan.open).toEqual({ label: 'End quiet', kind: 'focus' })
  // Not Quiet (or no way to end it): the relay's own press
  expect(bandPlan(view(), 'explained', 100, [], true, false, true).mode === 'line' && (bandPlan(view(), 'explained', 100, [], true, false, true) as { open?: { kind: string } }).open?.kind).toBe('session')
  const cannot = bandPlan(view({ band: [quiet] }), 'explained', 100, [], false, false, true)
  expect(cannot.mode === 'line' && cannot.open?.kind).toBe('session')
  const ended: string[] = []
  const drawn = flat(HomeBand(el, view({ band: [quiet] }), 'explained', () => undefined, () => void ended.push('quiet'), undefined, 100, undefined, undefined, () => ended.push('session')))
  const button = drawn.find(n => n.type === 'Button' && String(n.props.label).includes('End quiet'))
  expect(button).toBeDefined()
  ;(button?.props.onPress as () => void)()
  expect(ended).toEqual(['quiet'])
})

test('the press opens that session: the app\'s link on the desktop, else the app\'s window tool; never an answer', () => {
  const opened: string[] = []
  const press = (r: RelayView) => void opened.push(r.sid)
  const button = flat(HomeBand(el, view(), 'explained', () => undefined, undefined, undefined, 100, undefined, undefined, press)).find(n => n.type === 'Button' && String(n.props.label).includes('Open session'))
  expect(button).toBeDefined()
  ;(button?.props.onPress as () => void)()
  expect(opened).toEqual(['web-1111'])
  const linked = flat(HomeBand(el, view({ relay: { ...RELAY, link: 'claude://session/local_web-1111' } }), 'explained', () => undefined, undefined, undefined, 100, undefined, undefined, press))
  expect(linked.find(n => n.type === 'Link')?.props.href).toBe('claude://session/local_web-1111')
  // Too narrow for Open session: the Needs you chip, which counts only this question, opens that session in its place
  opened.length = 0
  const narrow = flat(HomeBand(el, view(), 'explained', () => undefined, undefined, () => void opened.push('needs'), 40, undefined, undefined, press))
  expect(narrow.some(n => n.type === 'Button' && String(n.props.label).includes('Open session'))).toBe(false)
  ;(narrow.find(n => n.type === 'Button' && String(n.props.label).includes('1 needs you'))?.props.onPress as () => void)()
  expect(opened).toEqual(['web-1111'])
  // With no open action no press is drawn
  const none = flat(HomeBand(el, view(), 'explained', () => undefined, undefined, undefined, 100))
  expect(none.some(n => n.type === 'Button' && String(n.props.label).includes('Open session'))).toBe(false)
})

test('through the engine: this session notes its own question as a hash, answers nothing, the answer clears it; another session\'s question shows in this band', { timeoutMs: 60_000 }, async ($, on) => {
  relayMem.clear()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  engine(on, w)
  on('settings.read', () => ({ value: {} }) as never)
  on('classic.Elicitation', () => ({}) as never)
  on('classic.ElicitationResult', () => ({}) as never)
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} }
  const said = async (): Promise<string> => {
    const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: BAND })
    const text = textsOf((await band.drawn()) as Node).join(' ')
    await band.unmount()
    return text
  }
  const base = { session_id: 'test-session', transcript_path: '', cwd: '/work/app' }
  const own = (): { h: string; at: number }[] => (w.mem.get('cockpit:session:test-session') as { questions?: { h: string; at: number }[] }).questions ?? []
  const r = (await $.classic.Elicitation({ ...base, hook_event_name: 'Elicitation', mcp_server_name: 'billing', message: QUESTION, elicitation_id: 'e1' } as never)) as Record<string, unknown>
  expect(r.action).toBeUndefined()
  expect(r.content).toBeUndefined()
  expect(own().length).toBe(1)
  for (const v of w.mem.values()) {
    expect(JSON.stringify(v)).not.toContain('account')
    expect(JSON.stringify(v)).not.toContain('billing')
  }
  // This session's own question shows in the app's dialog, not in its band
  expect(await said()).not.toContain('asks you a question')
  await $.classic.ElicitationResult({ ...base, hook_event_name: 'ElicitationResult', mcp_server_name: 'billing', elicitation_id: 'e1', action: 'decline' } as never)
  expect(own()).toEqual([])
  // Another live session's open question: one plain line naming it
  w.mem.set('cockpit:session:web-1111', rec('web-1111', { cwd: '/work/site', state: 'working', title: 'Web fixes', questions: [{ h: 'x', at: NOW - 2 * MIN }] }))
  expect(await said()).toContain('A tool in Web fixes asks you a question')
})
