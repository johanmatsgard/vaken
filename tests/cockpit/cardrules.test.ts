// The first-run cards: five cards always, every other card appears only when its rule says it has something to show.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { GUIDE, GUIDE_ALWAYS, GUIDE_VIEW_STRINGS, guideLines } from '../hooks/core/cardguide'
import { APPEARS, CARDS_VIEW_STRINGS, FIRST_CARDS, HIDDEN_FIRST, arrivals, autoHidden, cardsDefault, cardsOptions, isNewCard, newToast, openedCard, startHistory } from '../hooks/core/cardrules'
import type { AppearFacts } from '../hooks/core/cardrules'
import { VIEW_STRINGS } from '../hooks/core/lang'
import { SETTINGS, defaults } from '../hooks/core/settings'
import { CARD_IDS } from '../hooks/features/home/logic'
import { ALL_IDS, STANDARD_IDS } from '../hooks/features/home/viewset'
import { byEnglish, englishOf } from '../hooks/i18n/table'
import { LANGS, langInfo } from '../hooks/i18n/langs'
const SV = byEnglish('sv')

const none: AppearFacts = { proof: 'none', guardToday: 0, agents: false, computer: { gaugeOn: false, full: false }, skillsUsed: false, prs: 'none', ship: 'none', back: false, context: 'none', preview: false, setup: 'none', commands: 0 }
const withData: Record<string, Partial<AppearFacts>> = {
  proof: { proof: 'ok' },
  guard: { guardToday: 2 },
  agents: { agents: true },
  computer: { computer: { gaugeOn: true, full: false } },
  skills: { skillsUsed: true },
  prs: { prs: 'open' },
  ship: { ship: 'ready' },
  back: { back: true },
  context: { context: 'heavy' },
  preview: { preview: true },
  setup: { setup: 'drift' },
  do: { commands: 2 },
}

test('the first run shows five cards; every other card has a rule', () => {
  expect([...FIRST_CARDS]).toEqual(['limit', 'here', 'others', 'autopilot', 'safety'])
  for (const id of CARD_IDS) expect((FIRST_CARDS as readonly string[]).includes(id) !== (APPEARS[id] !== undefined), id).toBe(true)
})

test('each rule: the card shows with data and hides without', () => {
  for (const id of Object.keys(APPEARS)) {
    expect(APPEARS[id]!(none), `${id} without data`).toBe(false)
    expect(APPEARS[id]!({ ...none, ...withData[id] }), `${id} with data`).toBe(true)
  }
  expect(Object.keys(withData).sort()).toEqual(Object.keys(APPEARS).sort())
})

test('on a fresh install only the cards with nothing are left out, in one pass', () => {
  const fresh = defaults()
  // Preview starts hidden by its setting (HIDDEN_FIRST), so the rule leaves it alone
  expect(autoHidden(CARD_IDS, fresh, none)).toEqual(CARD_IDS.filter(id => APPEARS[id] !== undefined && id !== 'preview'))
  const some = autoHidden(CARD_IDS, fresh, { ...none, ...withData.prs, ...withData.agents })
  expect(some).not.toContain('prs')
  expect(some).not.toContain('agents')
  expect(some).toContain('ship')
})

test('Show always shows a card, a card chosen Hide is left to the settings, and the first-run cards are never left out', () => {
  const chosen = { ...defaults(), 'cards.ship': 'show', 'cards.proof': 'hide' }
  const left = autoHidden(CARD_IDS, chosen, none)
  expect(left).not.toContain('ship')
  // A card chosen Hide is hidden by the settings, so the rule leaves it alone.
  expect(left).not.toContain('proof')
  for (const id of FIRST_CARDS) expect(left).not.toContain(id)
})

test('the settings rows follow the table: Auto is the default of a card with a rule, Show of the five', () => {
  for (const id of CARD_IDS) {
    const row = SETTINGS.find(s => s.key === `cards.${id}`)!
    expect(row.default, id).toBe(cardsDefault(id))
    expect(row.options.map(o => o.value), id).toEqual(cardsOptions(id).map(o => o.value))
    expect(row.default, id).toBe(APPEARS[id] === undefined ? 'show' : (HIDDEN_FIRST as readonly string[]).includes(id) ? 'hide' : 'auto')
  }
})

test('Preview starts hidden on a new install (the app shows the page itself); a stored Show or Auto keeps it, and it is never announced as new', () => {
  expect(HIDDEN_FIRST).toEqual(['preview'])
  expect(cardsDefault('preview')).toBe('hide')
  expect(cardsOptions('preview').map(o => o.value)).toEqual(['auto', 'show', 'hide'])
  const facts = { ...none, preview: true }
  expect(autoHidden(CARD_IDS, { ...defaults(), 'cards.preview': 'auto' }, facts)).not.toContain('preview')
  expect(autoHidden(CARD_IDS, { ...defaults(), 'cards.preview': 'auto' }, none)).toContain('preview')
  expect(autoHidden(CARD_IDS, { ...defaults(), 'cards.preview': 'show' }, none)).not.toContain('preview')
})

test('every word of the cards area has a Swedish line', () => {
  const live = englishOf('cards')
  expect(live).not.toContain('Welcome')
  for (const w of live) {
    expect(VIEW_STRINGS, w).toContain(w)
    for (const lang of LANGS.filter(l => l !== 'en' && langInfo(l).status === 'full')) expect(byEnglish(lang)[w] ?? '', `${lang}: ${w}`).not.toBe('')
  }
  expect([...CARDS_VIEW_STRINGS].sort()).toEqual([...live, 'Start here'].sort())
  for (const lang of LANGS.filter(l => l !== 'en' && langInfo(l).status === 'full')) expect(byEnglish(lang)['Start here'] ?? '', lang).not.toBe('')
})

test('with no history a load says and writes nothing; the session start makes the history once', () => {
  expect(arrivals(['prs'], undefined)).toEqual({ next: undefined, announce: [] })
  expect(startHistory(['prs', 'ship'], false)).toEqual([])
  expect(startHistory(['prs', 'ship'], true)).toEqual(['seen:prs', 'seen:ship'])
  expect(arrivals(['prs'], startHistory(['prs', 'ship'], true))).toEqual({ next: undefined, announce: [] })
  expect(arrivals(['prs'], startHistory(['prs', 'ship'], false))).toEqual({ next: ['new:prs'], announce: ['prs'] })
})

test('a card is announced once: the first time it has something to show', () => {
  const first = arrivals(['prs'], [])
  expect(first).toEqual({ next: ['new:prs'], announce: ['prs'] })
  expect(arrivals(['prs'], first.next)).toEqual({ next: undefined, announce: [] })
  expect(arrivals(['prs'], ['seen:prs'])).toEqual({ next: undefined, announce: [] })
  expect(arrivals(['prs', 'ship'], ['new:prs'])).toEqual({ next: ['new:prs', 'new:ship'], announce: ['ship'] })
})

test('the new chip stays until the card is pressed open once', () => {
  const seen = ['new:prs', 'new:ship']
  expect(isNewCard(seen, 'prs')).toBe(true)
  expect(isNewCard(undefined, 'prs')).toBe(false)
  expect(isNewCard(seen, 'agents')).toBe(false)
  const opened = openedCard(seen, 'prs')
  expect(opened).toEqual(['new:ship', 'seen:prs'])
  expect(isNewCard(opened, 'prs')).toBe(false)
  expect(isNewCard(opened, 'ship')).toBe(true)
  expect(openedCard(seen, 'agents')).toBeUndefined()
  expect(openedCard(opened, 'prs')).toBeUndefined()
  expect(openedCard(undefined, 'prs')).toBeUndefined()
})

test('the toast names the card, a few cards in one toast, in the person\'s language', () => {
  const same = (x: string): string => x
  expect(newToast(['Skills'], same)).toBe('New card: Skills')
  expect(newToast(['Skills', 'Checks'], same)).toBe('New cards: Skills, Checks')
  expect(newToast(['A', 'B', 'C', 'D', 'E'], same)).toBe('New cards: A, B, C and 2 more')
  expect(newToast(['Skills'], x => SV[x] ?? x)).toBe('Nytt kort: Skills')
})

test('the card guide has a line for every card, in the All view\'s order (Standard first), and its titles are the Settings > Cards and look labels', () => {
  const lines = guideLines(ALL_IDS)
  expect(lines.map(l => l.id)).toEqual([...ALL_IDS])
  expect(lines.map(l => l.id).sort()).toEqual([...CARD_IDS].sort())
  expect(Object.keys(GUIDE).sort()).toEqual([...CARD_IDS].sort())
  expect(ALL_IDS.slice(0, STANDARD_IDS.length)).toEqual([...STANDARD_IDS])
  for (const l of lines) {
    expect(l.title, l.id).toBe(SETTINGS.find(s => s.key === `cards.${l.id}`)!.label)
    expect(l.promise.length, l.id).toBeGreaterThan(10)
    expect(l.promise.endsWith('.'), l.id).toBe(true)
  }
})

test('each "shows when" line matches its rule kind: a first-run card is always shown, every card with a rule says when', () => {
  for (const l of guideLines(ALL_IDS)) {
    if (APPEARS[l.id] === undefined) {
      expect(l.shows, l.id).toBe(GUIDE_ALWAYS)
      expect(GUIDE[l.id as keyof typeof GUIDE].shows, `${l.id} has a rule line but no rule`).toBeUndefined()
    } else {
      expect(l.shows, l.id).toMatch(/^Shows (when|after) /)
      expect(l.shows, l.id).not.toBe(GUIDE_ALWAYS)
    }
  }
  expect(guideLines(ALL_IDS).filter(l => l.shows === GUIDE_ALWAYS).map(l => l.id).sort()).toEqual([...FIRST_CARDS].sort())
})

test('every word of the card guide has a Swedish line', () => {
  // A guide word may share its row with another place (Risky steps' "How strict the safety rules are." is also its Settings description, a common row)
  for (const w of GUIDE_VIEW_STRINGS) expect(SV[w] ?? '', w).not.toBe('')
  for (const w of englishOf('guide')) {
    expect(VIEW_STRINGS, w).toContain(w)
    expect(GUIDE_VIEW_STRINGS, w).toContain(w)
  }
})
