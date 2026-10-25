// Problems first and the right limit first the order rule, each card's loudness, the limit that leads.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { SessionRecord } from '../hooks/core/record'
import { CARD_IDS, bandWord, buildView, cardLoudness, foldWords, homeText, leadFirst, limitBlocks, limitLoud, limitRow, limitSegments, problemsFirst, problemsFirstInGroups } from '../hooks/features/home/logic'
import type { CardId, LimitBlock, LoudFacts } from '../hooks/features/home/logic'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-09T12:00:00Z')
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const iso = (ms: number): string => new Date(ms).toISOString()

const rec = (id: string, over: Partial<SessionRecord> = {}): SessionRecord => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
const block = (kind: string, short: string, percent: number, resetsAt?: string, withDay = false): LimitBlock => ({ kind, short, label: short, percent, reset: resetsAt === undefined ? '' : withDay ? 'resets Thu 09:00' : 'resets 15:00', withDay, ...(resetsAt === undefined ? {} : { resetsAt }) })

const OWN: CardId[] = ['limit', 'here', 'others', 'autopilot', 'proof', 'guard', 'agents', 'computer', 'skills']

test('inside the placement groups a loud card moves up and a calm one down, but never into another group (so never to another column)', () => {
  const own = CARD_IDS
  const out = problemsFirstInGroups(own, { guard: 'urgent', proof: 'calm', agents: 'warn', limit: 'calm' })
  expect(out.slice(0, 8)).toEqual(['here', 'others', 'back', 'context', 'ship', 'prs', 'preview', 'limit'])
  expect(out.slice(8, 13)).toEqual(['agents', 'setup', 'computer', 'skills', 'do'])
  expect(out.slice(13)).toEqual(['guard', 'safety', 'autopilot', 'proof'])
  expect(problemsFirstInGroups(own, {})).toEqual(own)
})

test('a loud card moves up (urgent, then warn), a calm one drops to the end, and the set order holds within each', () => {
  expect(problemsFirst(OWN, { guard: 'urgent', limit: 'warn', proof: 'warn', autopilot: 'calm', skills: 'calm' })).toEqual(['guard', 'limit', 'proof', 'here', 'others', 'agents', 'computer', 'autopilot', 'skills'])
  // Nothing loud and nothing calm: the person's own order, unchanged.
  expect(problemsFirst(OWN, {})).toEqual(OWN)
  // The order is a function of the loudness alone: the same loudness gives the same order every time.
  const loud = { agents: 'warn', here: 'calm' } as const
  expect(problemsFirst(OWN, loud)).toEqual(problemsFirst(OWN, { ...loud }))
  expect(problemsFirst(['b', 'a'], { a: 'urgent' })).toEqual(['a', 'b'])
})

const facts = (over: Partial<LoudFacts> = {}): LoudFacts => ({ limits: [], here: true, others: 1, didToday: 1, proof: 'ok', agents: { any: true, stuck: false }, computer: { gaugeOn: true, full: false }, skillsUsed: true, prs: 'open', ...over })

test('each card says how loud it is from what the pane has', () => {
  const quiet = cardLoudness(facts({ here: false, others: 0, didToday: 0, proof: 'none', agents: { any: false, stuck: false }, computer: { gaugeOn: false, full: false }, skillsUsed: false, prs: 'none' }), NOW)
  expect(Object.values(quiet).every(l => l === 'calm')).toBe(true)
  const busy = cardLoudness(facts({ limits: [block('session', 'Session', 40)] }), NOW)
  // The Ship, Where was I, Safety and Context health cards are calm unless something blocks, is left open, is halted or is heavy.
  expect(Object.entries(busy).every(([id, l]) => (['ship', 'back', 'safety', 'context', 'preview', 'setup', 'do', 'guard'].includes(id) ? l === 'calm' : l === 'normal'))).toBe(true)
  const bad = cardLoudness(facts({ proof: 'problem', safety: 'halted', agents: { any: true, stuck: true }, computer: { gaugeOn: true, full: true }, prs: 'failing', ship: 'blocked', back: 'open' }), NOW)
  expect([bad.proof, bad.safety, bad.guard, bad.agents, bad.computer, bad.prs, bad.ship, bad.back]).toEqual(['warn', 'urgent', 'calm', 'warn', 'warn', 'warn', 'warn', 'normal'])
  // Where was I: yesterday's open ends are normal; only a real wait since you left warns
  expect(cardLoudness(facts({ back: 'waits' }), NOW).back).toBe('warn')
  expect(cardLoudness(facts({ safety: 'held' }), NOW).safety).toBe('warn')
})

test('a plan window near its end is loud: red from 90%, the warning colour from 80% or when it runs out soon at this pace', () => {
  expect(limitLoud([], NOW)).toBe('calm')
  expect(limitLoud([block('session', 'Session', 40)], NOW)).toBe('normal')
  expect(limitLoud([block('session', 'Session', 40), block('week', 'Week', 82)], NOW)).toBe('warn')
  expect(limitLoud([block('week', 'Week', 95)], NOW)).toBe('urgent')
  expect(limitLoud([block('session', 'Session', 75, iso(NOW + 1.5 * HOUR))], NOW)).toBe('warn')
  expect(limitLoud([block('session', 'Session', 75, iso(NOW + 0.5 * HOUR))], NOW)).toBe('normal')
})

test('the limit that leads: the week at 95% before the 5-hour window at 40% (the band showed the 5-hour one)', () => {
  const view = buildView([rec('a', { fiveHourPercent: 40, fiveHourResetsAt: iso(NOW + HOUR), sevenDayPercent: 95, sevenDayResetsAt: iso(NOW + 2 * DAY) })], NOW, 'x', undefined)
  expect(limitBlocks(view).map(b => b.short)).toEqual(['Week', '5-hour limit'])
  expect(bandWord(view, 'simple')).toMatch(/^Week 95%, resets (Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d\d:\d\d · 5-hour limit 40%$/)
})

test('what runs out first leads: two that run out soon lead by the soonest; the rest by how full they are for the time gone', () => {
  const soon = leadFirst([block('week', 'Week', 95, iso(NOW + 2 * DAY), true), block('session', 'Session', 85, iso(NOW + HOUR))], NOW)
  expect(soon.map(b => b.short)).toEqual(['Session', 'Week'])
  const calm = leadFirst([block('session', 'Session', 40, iso(NOW + HOUR)), block('week', 'Week', 72, iso(NOW + 3 * DAY), true)], NOW)
  expect(calm.map(b => b.short)).toEqual(['Week', 'Session'])
  // A tie keeps the app's order; a used-up window leads.
  expect(leadFirst([block('a', 'A', 30), block('b', 'B', 30)], NOW).map(b => b.short)).toEqual(['A', 'B'])
  expect(leadFirst([block('a', 'A', 30), block('b', 'B', 100)], NOW).map(b => b.short)).toEqual(['B', 'A'])
})

test('the limit row is whole segments, one per limit, so none is cut', () => {
  expect(limitSegments([block('week', 'Week', 72, iso(NOW + 3 * DAY), true), block('session', 'Session', 40, iso(NOW + HOUR)), block('f', 'Fable', 4)])).toEqual(['Week 72% used, resets Thu 09:00', 'Session 40% used, resets 15:00', 'Fable 4% used'])
})

test('Short is one row for every limit, the leader first, each limit with what is used and its whole reset (a weekly reset says its day and time); Full folds the ones under half', () => {
  expect(limitRow([block('week', 'Week', 72, iso(NOW + 3 * DAY), true), block('session', 'Session', 40, iso(NOW + HOUR))])).toBe('Week 72% used, resets Thu 09:00 · Session 40% used, resets 15:00')
  expect(limitRow([block('session', 'Session', 40, iso(NOW + HOUR)), block('week', 'Week', 30, iso(NOW + 3 * DAY), true)])).toBe('Session 40% used, resets 15:00 · Week 30% used, resets Thu 09:00')
  expect(foldWords([block('week', 'Week', 25), block('m', 'Fable', 4)])).toBe('Under half used: Week 25% used · Fable 4% used')
})

test('the text twin follows the order of the cards', () => {
  const view = buildView([rec('here'), rec('b', { state: 'waiting' }), rec('a', { fiveHourPercent: 40 })], NOW, 'here', undefined)
  const text = homeText(view, ['others', 'limit', 'here'])
  expect(text.indexOf('Other sessions')).toBeLessThan(text.indexOf('5-hour limit'))
  expect(text.indexOf('5-hour limit')).toBeLessThan(text.indexOf('This session'))
  const plain = homeText(view)
  expect(plain.indexOf('5-hour limit')).toBeLessThan(plain.indexOf('Other sessions'))
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
}
function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom']])
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
const TITLES = /^(Plan limits|This session|Other sessions|Autopilot|Checks|Risky steps|Agents|Computer|Skills|Safety)$/
const ALL_SHOWN: Record<string, string> = Object.fromEntries([['cockpit:setting:look.view', 'custom'], ...CARD_IDS.map(id => [`cockpit:setting:cards.${id}`, 'show']), ['cockpit:setting:detail', 'explained']])
const world = (): Record<string, unknown> => ({
  ...ALL_SHOWN,
  'cockpit:setting:laptop.mode': 'off',
  'cockpit:firstrun': 'done',
  'cockpit:session:test-session': rec('test-session', { cwd: '/work/app', fiveHourPercent: 40, fiveHourResetsAt: '2026-10-09T15:00:00Z' }),
  'cockpit:session:s2': rec('s2', { state: 'waiting' }),
  'cockpit:halt:test-session': { at: NOW - MIN },
})
const titles = async (ui: { findAll: (q: object) => Promise<unknown[]> }): Promise<string[]> => ((await ui.findAll({ type: 'Text', text: TITLES })) as { text?: string }[]).map(t => t.text ?? '')

test('the pane puts a halted Safety card first in its group (Protection) and the calm cards last, shrunk to Short with a More that keeps Full', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  for (const [k, v] of Object.entries(world())) mem.set(k, v)
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await titles(ui)).toEqual(['Plan limits', 'This session', 'Other sessions', 'Agents', 'Computer', 'Skills', 'Safety', 'Risky steps', 'Autopilot', 'Checks'])
  expect(((await ui.find({ key: 'detail-proof' })) as { props?: { label?: string } } | undefined)?.props?.label?.trim()).toBe('Show more')
  await ui.press({ key: 'detail-proof' })
  for (let n = 0; n < 400; n += 1) await Promise.resolve()
  expect(mem.get('cockpit:setting:detail.proof')).toBe('explained')
  await ui.unmount()
})

test('with Problems first Off, or while arranging, the set order shows unchanged', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  for (const [k, v] of Object.entries(world())) mem.set(k, v)
  mem.set('cockpit:setting:view.problems', 'off')
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await titles(ui)).toEqual(['Plan limits', 'This session', 'Other sessions', 'Agents', 'Computer', 'Skills', 'Risky steps', 'Safety', 'Autopilot', 'Checks'])
  await ui.unmount()
})

test('while arranging, the board gets the set order, not the problems-first one', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  for (const [k, v] of Object.entries(world())) mem.set(k, v)
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await ui.press({ key: 'arrange' })
  await ui.unmount()
  const arranging = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const board = (await arranging.find({ key: 'arrange-board' })) as { props?: { props?: { lists?: string[][] } } } | undefined
  // Needs you is the first tile (fixed); the person's own order follows, a problem moves nothing.
  expect(board?.props?.props?.lists?.flat().slice(0, 2)).toEqual(['needs', 'limit'])
  await arranging.press({ key: 'arrange-done' })
  await arranging.unmount()
})

const fresh = (): Record<string, unknown> => ({
  'cockpit:setting:laptop.mode': 'off',
  'cockpit:firstrun': 'done',
  'cockpit:session:test-session': rec('test-session', { cwd: '/work/app', fiveHourPercent: 40, fiveHourResetsAt: '2026-10-09T15:00:00Z' }),
  'cockpit:session:s2': rec('s2', { state: 'waiting' }),
})

test('a new person sees five cards; the card guide (from Help) opens Settings; a card chosen Show appears, one chosen Hide never does', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  for (const [k, v] of Object.entries(fresh())) mem.set(k, v)
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect((await titles(ui)).sort()).toEqual(['Autopilot', 'Other sessions', 'Plan limits', 'Safety', 'This session'])
  expect(await ui.find({ key: 'morel-more-cards' }), 'no card guide link in the footer').toBeUndefined()
  await ui.press({ key: 'help' })
  await ui.redraw()
  await ui.press({ key: 'press-help-guide-0' })
  await ui.unmount()
  const guide = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await guide.find({ key: 'guide-done' })).toBeDefined()
  const words = nodes((await guide.drawn()) as Drawn).flatMap(n => [n.props?.children, ...(n.children ?? [])]).filter((x): x is string => typeof x === 'string')
  expect(words).toContain('Shows when a pull request or a check waits.')
  expect(words).toContain('Warns you before you reach a plan limit.')
  expect(words).not.toContain('Always shown.')
  await guide.press({ key: 'press-guide-turn-0' })
  await guide.unmount()
  const settings = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await settings.find({ key: 'settings-done' })).toBeDefined()
  await settings.press({ key: 'settings-done' })
  await settings.unmount()
  const back = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await back.find({ key: 'guide-done' })).toBeDefined()
  await back.press({ key: 'guide-done' })
  await back.redraw()
  await back.press({ key: 'help-done' })
  await back.unmount()
  mem.set('cockpit:setting:cards.skills', 'show')
  mem.set('cockpit:setting:cards.safety', 'hide')
  const again = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect((await titles(again)).sort()).toEqual(['Autopilot', 'Other sessions', 'Plan limits', 'Skills', 'This session'])
  await again.unmount()
})

type Drawn = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
const nodes = (n: Drawn, out: Drawn[] = []): Drawn[] => {
  out.push(n)
  for (const c of n.children ?? []) if (c !== null && typeof c === 'object') nodes(c as Drawn, out)
  return out
}
const keyOf = (n: Drawn): string | undefined => n.key ?? (n.props?.key as string | undefined)

test('the footer is the presses only, right-aligned in one wrapping row at every width, with no card guide link; the Working sentence is not in it', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  for (const [k, v] of Object.entries(fresh())) mem.set(k, v)
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  for (const bodyColumns of [140, 60]) {
    const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: { ...paneProps, bodyColumns } })
    const footer = nodes((await ui.drawn()) as Drawn).find(n => keyOf(n) === 'footer')
    expect(footer?.props?.flexDirection).toBe('row')
    expect(footer?.props?.justifyContent).toBe('flex-end')
    const inside = nodes(footer as Drawn).map(keyOf)
    expect(inside).not.toContain('morel-more-cards')
    expect(inside.filter(k => k === 'arrange' || k === 'popout' || k === 'settings')).toEqual(['arrange', 'popout', 'settings'])
    expect(await ui.find({ type: 'Text', text: /Working means Claude did something/ })).toBeUndefined()
    await ui.unmount()
  }
})
