// Audit fixes, words and states: the text twin says this session's own wait as the pane does.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import type { SessionRecord } from '../hooks/core/record'
import type { View } from '../hooks/features/home/logic'
import { ageWord, bandWord, buildView, hereWord, homeText, limitAgo, recordBlocks, resetSaid, resetWord } from '../hooks/features/home/logic'
import { ageWord as coreAge } from '../hooks/core/time'
import { glanceLines } from '../hooks/core/attention'
import { dayShare, dayShareWords } from '../hooks/core/dayshare'
import { limitForms } from '../hooks/core/headline'
import { buildInbox, itemShort } from '../hooks/core/inbox'
import type { InboxFacts } from '../hooks/core/inbox'
import { ASK_TITLE } from '../hooks/core/compactwords'
import { HOLD_MEANS } from '../hooks/features/home/needs'
import { setLang, t, tr } from '../hooks/core/lang'
import { byEnglish } from '../hooks/i18n/table'

const MIN = 60_000
const H = 60 * MIN
const DAY = 24 * H
const noon = new Date(2026, 9, 13, 12, 0, 0, 0).getTime()

const rec = (id: string, over: Partial<SessionRecord> = {}): SessionRecord => ({
  sessionId: id,
  cwd: `/work/${id}`,
  model: 'claude-opus-5',
  state: 'working',
  startedAt: noon - 20 * MIN,
  updatedAt: noon - 2000,
  lastEventAt: noon - 2000,
  stateSince: noon - 3 * MIN,
  ...over,
})

test('the text twin says Needs you when this session waits for its stopped step or its pause, as the pane does', () => {
  const view = buildView([rec('me')], noon, 'me', undefined)
  expect(homeText(view)).toMatch(/This session: Working/)
  expect(homeText({ ...view, hereWaits: 'hold' })).toMatch(/This session: Needs you: a stopped step waits for your yes/)
  expect(homeText({ ...view, hereWaits: 'halt' })).toMatch(/This session: Needs you: paused, it waits for you to resume it/)
  expect(hereWord(view.here, 'simple', 'hold')).toMatch(/^Needs you/)
})

test('no session yet: one period, in the text twin and the glance lines', () => {
  const text = homeText({ needs: [], working: [], waiting: [], idle: [], now: noon } as unknown as View)
  expect(text).toMatch(/This session: Nothing to show yet\. This appears after the first answer\. ·/)
  expect(text).not.toMatch(/answer\.\./)
  expect(glanceLines({ needs: [], hereState: hereWord(undefined), didCount: 0 })[2]).toBe('This session: Nothing to show yet. This appears after the first answer. Autopilot did nothing today.')
})

test('a reset on another day names the day, one a week or more away says how far, one today only the time', () => {
  const at = (ms: number): string => new Date(ms).toISOString()
  expect(resetWord(at(noon + H), false, noon)).toBe('resets 13:00')
  expect(resetWord(at(noon + 2 * DAY + H), false, noon)).toMatch(/^resets (Sun|Mon|Tue|Wed|Thu|Fri|Sat) 13:00$/)
  expect(resetWord(at(noon + 20 * DAY), false, noon)).toBe('resets in 20 d')
  expect(resetWord(at(noon + 20 * DAY))).toMatch(/^resets \d\d:\d\d$/)
  const view = { ...buildView([rec('me', { spendPercent: 40, spendResetsAt: at(noon + 20 * DAY + H) })], noon, 'me', undefined) }
  const spend = recordBlocks(view).find(b => b.kind === 'spend')
  expect(spend?.reset).toBe('resets in 20 d')
  expect(resetSaid('resets in 20 d')).toBe('resets in 20 d')
  expect(resetSaid('resets in 20 d', s => s, true)).toBe('It resets in 20 d')
  setLang('sv')
  try {
    expect(resetSaid('resets in 20 d', tr)).toBe('återställs om 20 d')
  } finally {
    setLang('en')
  }
})

test('the week used up says so and when it resets, never "use about 0% a day"', () => {
  const resetsAt = new Date(noon + 2 * DAY + 2 * H).toISOString()
  const d = dayShare({ percent: 100, resetsAt }, noon)
  expect(d).toBeDefined()
  const words = dayShareWords(d!)
  expect(words).toMatch(/^Your weekly limit is used up\. It resets (Sun|Mon|Tue|Wed|Thu|Fri|Sat) 14:00\.$/)
  expect(words).not.toMatch(/0% a day/)
})

test('the band keeps a model name as it is and lowers only the generic names', () => {
  const view = buildView([], noon, 'me', undefined, { at: noon - MIN, windows: [{ label: '5-hour limit', percent: 80, resetsAt: new Date(noon + H).toISOString() }, { label: 'Weekly · all models', percent: 30, resetsAt: new Date(noon + 3 * DAY).toISOString() }, { label: 'Weekly · Fable', percent: 20, resetsAt: new Date(noon + 3 * DAY).toISOString() }] })
  const band = bandWord(view)
  expect(band).toMatch(/· week 30% used/)
  expect(band).toMatch(/· Fable 20% used/)
})

test('an old plan figure says its age on the Glance row and in the text twin from 5 minutes on, as the card does', () => {
  expect(limitAgo([{ sinceMs: 2 * MIN }])).toBe('')
  expect(limitAgo([{ sinceMs: 7 * MIN }])).toBe('7 min ago')
  expect(limitAgo([{ sinceMs: 11 * MIN }])).toBe('11 min ago')
  expect(limitAgo([{ sinceMs: 25 * MIN }])).toBe('25 min ago')
  const forms = limitForms([{ short: 'Week', percent: 40, reset: 'resets Thu 14:00' }], s => s, '7 min ago')
  expect(forms[0]).toBe('Week: 40% used · resets Thu 14:00 · 7 min ago')
  expect(forms.at(-1)).toBe('40% used')
  expect(limitForms([{ short: 'Week', percent: 40 }])).toEqual(['Week: 40% used', '40% used'])
  const view = buildView([rec('me', { updatedAt: noon - 7 * MIN, lastEventAt: noon - 7 * MIN, sevenDayPercent: 40, sevenDayResetsAt: new Date(noon + 2 * DAY).toISOString() })], noon, 'me', undefined)
  expect(homeText(view)).toMatch(/Weekly limit: 40% used, resets \w{3} 12:00, read 7 min ago\./)
})

test('one age word: the inbox says "2 h" where the row says "2 h", never "2 h 10 min"', () => {
  expect(ageWord(130 * MIN)).toBe('2 h')
  expect(coreAge(130 * MIN)).toBe('2 h')
  const facts: InboxFacts = { now: noon, sessions: [{ sid: 'me', name: 'Docs', here: true }], ledger: [{ at: noon - 130 * MIN, session: 'me', what: 'Held a risky command', detail: 'This deletes build.', how: 'auto', did: true }] as never, allowed: [], asks: [], debts: [], halts: [], seen: {} }
  const [it] = buildInbox(facts)
  expect(itemShort(it!, noon)).toMatch(/Waiting 2 h\./)
  expect(itemShort(it!, noon)).not.toMatch(/2 h 10 min/)
})

test('the glossary words: stopped, agents, Not read yet, Vaken at the start', () => {
  expect(HOLD_MEANS.join(' ')).not.toMatch(/blocked/)
  expect(t('cardcompact.not_helpers')).toBe('An agent or a background command is still running')
  expect(t('settings.preset_thrifty_about')).toMatch(/gives agents cheaper models/)
  expect(t('settings.quiet_plus_suggestions_band_lines')).toMatch(/^Only alerts, plus every free feature:/)
  expect(t('settings.balanced_plus_the_checks_and_the')).toMatch(/^Recommended, plus features that send/)
  expect(t('access.dot_unknown')).toBe('Not read yet')
  expect(ASK_TITLE.startsWith('Vaken ')).toBe(true)
  const en = Object.keys(byEnglish('sv'))
  expect(en.filter(s => /\bhelpers?\b/i.test(s))).toEqual([])
  expect(en.filter(s => /(^|[.?!] )vaken\b/.test(s))).toEqual([])
})
