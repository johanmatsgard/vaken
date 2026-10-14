// The Where was I card: where you were, what was left open and what happened while you were away.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { DIGEST_KEY } from '../hooks/core/away'
import { BACK_AWAY_MS, awayShown, backCardText, backLoud, backShort, backView } from '../hooks/core/backcard'
import type { BackFacts } from '../hooks/core/backcard'
import { CALM_KEY } from '../hooks/core/calm'
import { VIEW_STRINGS } from '../hooks/core/lang'
import { openDayOf } from '../hooks/core/openends'
import type { OpenEnd } from '../hooks/core/openends'
import { SETTINGS } from '../hooks/core/settings'
import { backFactsOf } from '../hooks/features/home/back'
import { lineCard } from '../hooks/features/home/linecards'
import { CARD_IDS, LINE_CARD_IDS, homeText } from '../hooks/features/home/logic'
import type { View } from '../hooks/features/home/logic'
import type { Prefs } from '../hooks/features/home/prefs'
import { GOT_IT } from '../hooks/features/home/rowact'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const HOUR = 60 * MIN
const NOW = Date.parse('2026-10-10T10:00:00Z')
const id = (s: string): string => s

const app: OpenEnd = { project: 'app', failed: ['tests'], held: 1, tasks: 0, midTurn: 0 }
const site: OpenEnd = { project: 'site', failed: [], held: 0, tasks: 2, midTurn: 0 }
const facts = (over: Partial<BackFacts> = {}): BackFacts => ({ now: NOW, open: [], more: 0, ...over })
const DIGEST = 'While you were away (2 h): 2 sessions finished, 1 risky step was stopped.\n\nWaiting for you:\n- web fixes: asks a question\n\nVaken also did this: Compacted a long chat.'

test('nothing open and no break: one calm line, "Nothing waits", and no group', () => {
  expect(backShort(facts(), id)).toBe('Nothing waits')
  const v = lineCard('back', { now: NOW, ledger: [], halted: false, modes: {}, t: id })
  expect([v.title, v.blurb, v.short]).toEqual(['Where was I', 'What waits for you', 'Nothing waits'])
  expect(v.groups).toHaveLength(1)
  expect(v.groups?.[0]?.rows).toMatchObject([{ key: 'none', title: 'Nothing waits' }])
  expect(v.groups?.[0]?.rows[0]?.action).toBeUndefined()
  expect([backLoud(undefined), backLoud(facts())]).toEqual(['none', 'none'])
})

test('a break of 15 minutes or more says "Back after"; a shorter one and a session at work say nothing of it', () => {
  expect(backShort(facts({ gapMs: 2 * HOUR }), id)).toBe('Back after 2 h · nothing waits')
  expect(backShort(facts({ gapMs: 25 * MIN }), id)).toBe('Back after 25 min · nothing waits')
  expect(backShort(facts({ gapMs: 14 * MIN }), id)).toBe('Nothing waits')
  const view = { now: NOW, here: { rec: { state: 'working', lastEventAt: NOW - 3 * HOUR } } } as unknown as View
  expect(backFactsOf(view, { open: [] } as unknown as Prefs).gapMs).toBeUndefined()
  const idle = { now: NOW, here: { rec: { state: 'idle', lastEventAt: NOW - 3 * HOUR, branch: 'feat-x' } } } as unknown as View
  expect(backFactsOf(idle, { open: [], proof: { goal: { text: 'Fix the login', setAt: 1, how: 'first' } } } as unknown as Prefs)).toMatchObject({ gapMs: 3 * HOUR, branch: 'feat-x', goal: 'Fix the login', open: [], more: 0 })
})

test('open ends: the card is loud, lists one whole row per project, then the one press that clears them', () => {
  const f = facts({ gapMs: 2 * HOUR, goal: 'Fix the login', branch: 'feat-x', open: [app, site], more: 1 })
  expect(backShort(f, id)).toBe('Back after 2 h · 3 projects have open ends')
  expect(backLoud(f)).toBe('open')
  const v = lineCard('back', { now: NOW, ledger: [], halted: false, modes: {}, back: f, t: id })
  expect(v.groups?.map(g => g.head)).toEqual(['Where you were', 'Left open'])
  expect(v.groups?.[0]?.rows).toMatchObject([{ key: 'was', title: 'Fix the login', right: '2 h ago' }])
  expect(v.groups?.[0]?.rows[0]?.what.facts?.[0]).toBe('Back after 2 h. Goal: Fix the login Branch feat-x.')
  const rows = v.groups?.[1]?.rows ?? []
  expect(rows.map(r => r.title)).toEqual(['app: tests failed, 1 risky step stopped', 'site: 2 tasks not done', 'and 1 more projects', 'Clear the open ends in all sessions'])
  expect(rows[3]).toMatchObject({ key: 'gotit', right: 'Clear', action: GOT_IT })
  expect(rows.map(r => r.action)).toEqual([undefined, undefined, undefined, GOT_IT])
  expect(rows[0]?.what.facts).toEqual(['tests failed', '1 risky step stopped'])
  expect(v.lines[0]).toBe('Back after 2 h · 3 projects have open ends')
  expect(v.whats).toHaveLength(v.lines.length)
  expect(backShort(facts({ open: [app] }), id)).toBe('1 project has open ends')
})

test('the away digest: shown for 12 hours after the away time, with its first line as the row and the rest as facts; "Nothing happened" is not shown', () => {
  const away = { to: NOW - 2 * HOUR, text: DIGEST }
  expect(awayShown(away, NOW)).toBe(away)
  expect(awayShown({ to: NOW - BACK_AWAY_MS - MIN, text: DIGEST }, NOW)).toBeUndefined()
  expect(awayShown({ to: NOW - MIN, text: 'Nothing happened while you were away.' }, NOW)).toBeUndefined()
  const f = facts({ away })
  expect(backShort(f, id)).toBe('a digest from while you were away')
  expect(backLoud(f)).toBe('none')
  const v = backView(f, id)
  expect(v.groups.map(g => g.head)).toEqual(['While you were away'])
  expect(v.groups[0]?.rows).toMatchObject([{ key: 'away', title: 'While you were away (2 h): 2 sessions finished, 1 risky step was stopped.' }])
  expect(v.groups[0]?.rows[0]?.what.facts).toEqual(['Waiting for you:', '- web fixes: asks a question', 'Vaken also did this: Compacted a long chat.'])
})

test('the text twin names the line, the goal, each project and the digest, each ending with the command that says more', () => {
  const f = facts({ gapMs: 2 * HOUR, goal: 'Fix the login', open: [app], more: 2, away: { to: NOW - HOUR, text: DIGEST } })
  expect(backCardText(f)).toEqual([
    'Where was I: Back after 2 h · 3 projects have open ends · a digest from while you were away · /vaken-today recap',
    'Goal: Fix the login · /vaken-today recap',
    'app: tests failed, 1 risky step stopped · /vaken-today',
    'and 2 more projects · /vaken-today',
    'While you were away (2 h): 2 sessions finished, 1 risky step was stopped. · /vaken-away digest',
  ])
  expect(backCardText(undefined)).toEqual([])
  const text = homeText({ needs: [], working: [], waiting: [], idle: [], now: NOW } as unknown as View, CARD_IDS, { back: backCardText(f) })
  expect(text.split('\n')).toContain('app: tests failed, 1 risky step stopped · /vaken-today')
})

test('the card is a line card with its own Show or Hide, and every word it shows has a Swedish line', () => {
  expect(LINE_CARD_IDS).toContain('back')
  expect(SETTINGS.find(s => s.key === 'cards.back')).toMatchObject({ label: 'Where was I', default: 'auto' })
  const words = englishOf('back')
  expect(words.filter(w => !VIEW_STRINGS.includes(w))).toEqual([])
  expect(words.filter(w => (SV[w] ?? '') === '')).toEqual([])
  for (const w of ['Clear', 'and {n} more projects', 'Goal', '{kinds} failed']) expect(SV[w] ?? '').not.toBe('')
  const sv = backView(facts({ gapMs: 2 * HOUR, open: [app, site], more: 1 }), w => SV[w] ?? w)
  expect(sv.short).toBe('Tillbaka efter 2 h · 3 projekt har öppna trådar')
  expect(sv.groups.map(g => g.head)).toEqual(['Där du var', 'Lämnat öppet'])
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }
const rec = (sid: string, now: number, over: Record<string, unknown> = {}) => ({ sessionId: sid, cwd: `/work/${sid}`, model: 'm', state: 'idle', startedAt: now - 5 * HOUR, updatedAt: now - 2000, lastEventAt: now - 2000, stateSince: now - 3 * MIN, ...over })

function harness(on: On, seed: Record<string, unknown>) {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', ...seed }))
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
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  return { mem }
}
const world = (now: number, over: Record<string, unknown> = {}) => ({
  'cockpit:firstrun': 'done',
  'cockpit:session:test-session': rec('test-session', now, { cwd: '/work/app', branch: 'feat-x', lastEventAt: now - 2 * HOUR }),
  ...over,
})
const textOf = async (ui: { find: (q: unknown) => Promise<unknown> }, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })

test('the pane shows the card with the open ends and the digest; Got it clears the open ends for every session and the card calms', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = harness(
    on,
    world(NOW, {
      [CALM_KEY]: { open: { day: openDayOf(NOW), ends: [app, site], dismissed: false } },
      [DIGEST_KEY]: { at: NOW - HOUR, from: NOW - 3 * HOUR, to: NOW - HOUR, text: DIGEST },
    }),
  )
  const ui = await mountPane($)
  expect(await textOf(ui, /^Where was I$/)).toBe(true)
  await ui.press({ key: 'press-glance-back-0' })
  await ui.redraw()
  expect(await textOf(ui, /^2 h ago$/)).toBe(true)
  expect(await textOf(ui, /^app: tests failed, 1 risky step stopped$/)).toBe(true)
  expect(await textOf(ui, /^While you were away \(2 h\): 2 sessions finished/)).toBe(true)
  // Got it: the morning's record is dismissed, so the open ends go from the card.
  await ui.press({ key: 'press-ol-back:gotit-0' })
  await clock.settle()
  await ui.redraw()
  expect((w.mem.get(CALM_KEY) as { open: { dismissed: boolean } }).open.dismissed).toBe(true)
  expect(await textOf(ui, /^app: tests failed, 1 risky step stopped$/)).toBe(false)
  await ui.unmount()
})
