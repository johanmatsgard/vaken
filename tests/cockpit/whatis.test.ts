// "What is this?" and "Quiet it?": every setting it names exists, every "Settings > group > label" in the catalogue resolves.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { EXPLAIN } from '../hooks/core/explain'
import { findSetting } from '../hooks/core/settings'
import { BAND_SETTINGS, QUIET_AGAIN_MS, QUIET_MIN, SESSIONS_SETTING, TOPICS, TOPIC_NAMES, actedTitle, bandWhatIs, didWhatIs, groupOf, quietAsk, quietWords, settingIn, topicOf, whatIsLines } from '../hooks/core/whatis'
import { WARNED_WHAT } from '../hooks/core/guardworld'
import { HELD_WHAT } from '../hooks/core/guard'
import { UNPROVEN_WHAT } from '../hooks/core/proof'
import { DRIFT_WHAT } from '../hooks/core/proof2'

const NOW = Date.UTC(2026, 9, 10, 12)
const MIN = 60_000

test('every topic and band entry names a setting that exists', () => {
  for (const t of TOPIC_NAMES) {
    const key = TOPICS[t].setting
    if (key !== undefined && key !== SESSIONS_SETTING) expect(findSetting(key)?.key).toBe(key)
  }
  for (const key of BAND_SETTINGS) expect(findSetting(key)?.key).toBe(key)
  expect(groupOf(SESSIONS_SETTING)).toBe('Sessions')
  expect(groupOf('guard.world')).toBe('Risky steps')
})

test('every "Settings > group > label" in the catalogue is a real Settings row', () => {
  const bad: string[] = []
  for (const [title, e] of Object.entries(EXPLAIN)) {
    for (const text of [e.means, e.why, e.next]) {
      const named = text.match(/Settings > [^>]+ > /g) ?? []
      if (named.length > 0 && settingIn(text) === undefined) bad.push(`${title}: ${text}`)
    }
  }
  expect(bad).toEqual([])
})

test('a topic is found by its name, in any case', () => {
  expect(topicOf(' Guard ')).toBe('guard')
  expect(topicOf('nothing')).toBeUndefined()
})

test('a did line opens with its meaning, the last times and its setting', () => {
  const w = didWhatIs(WARNED_WHAT.world, [{ at: NOW - 4 * MIN }, { at: NOW - 60 * MIN }], NOW)
  expect(w?.setting).toBe('guard.world')
  expect(w?.last).toEqual(['4 min ago', '1 h ago'])
  expect(whatIsLines(w!)[0]).toMatch(/^What it means: /)
  expect(whatIsLines(w!).slice(-3)).toEqual(['The last times:', '  4 min ago', '  1 h ago'])
  expect(didWhatIs(WARNED_WHAT.world, [{ at: NOW - MIN, detail: 'a post' }], NOW)?.last).toEqual(['1 min ago: a post'])
  expect(didWhatIs('No such line', [], NOW)).toBeUndefined()
})

test('a band item opens with the note of the setting behind it', () => {
  const w = bandWhatIs({ id: 'fresh', text: 'New topic', at: NOW - 2 * MIN }, NOW)
  expect(w.setting).toBe('fresh.nudge')
  // The opened line does not repeat the line's own words
  expect(w.why).toBe('Shown 2 min ago')
  expect(bandWhatIs({ id: 'unknown-thing', text: 'x', at: NOW }, NOW).setting).toBeUndefined()
  expect(bandWhatIs({ id: `did:${HELD_WHAT.destructive}`, text: 'x', at: NOW }, NOW).setting).toBe('guard.destructive')
})

test('quiet asks about a frequent warning that stops nothing', () => {
  const today = { [WARNED_WHAT.world]: 22, [HELD_WHAT.destructive]: 30 }
  const q = quietAsk(today, { 'guard.world': 'warn' }, {}, NOW)
  expect(q).toEqual({ what: WARNED_WHAT.world, n: 22, setting: 'guard.world', label: 'Outside actions' })
  expect(quietWords(q!)).toBe('Warned about a step outside your computer: 22 times today, nothing was stopped. Turn this warning off for all projects?')
})

test('quiet asks about claims and goal drift too: "Nothing was stopped." starts a sentence, so case does not matter', () => {
  const claims = quietAsk({ [UNPROVEN_WHAT]: 14 }, {}, {}, NOW)
  expect(claims?.setting).toBe('proof.claims')
  expect(findSetting(claims?.setting ?? '')?.options.some(o => o.value === 'off')).toBe(true)
  expect(quietAsk({ [DRIFT_WHAT]: 12 }, {}, {}, NOW)?.setting).toBe('proof.drift')
  expect(quietAsk({ [UNPROVEN_WHAT]: 14 }, { 'proof.claims': 'off' }, {}, NOW)).toBeUndefined()
})

test('quiet stays silent below the threshold, when acted on, when off, or asked this week', () => {
  const w = WARNED_WHAT.world
  expect(quietAsk({ [w]: QUIET_MIN - 1 }, {}, {}, NOW)).toBeUndefined()
  expect(quietAsk({ [w]: 22, [actedTitle(w)]: 1 }, {}, {}, NOW)).toBeUndefined()
  expect(quietAsk({ [w]: 22 }, { 'guard.world': 'off' }, {}, NOW)).toBeUndefined()
  expect(quietAsk({ [w]: 22 }, {}, { [w]: NOW - MIN }, NOW)).toBeUndefined()
  expect(quietAsk({ [w]: 22 }, {}, { [w]: NOW - QUIET_AGAIN_MS }, NOW)?.n).toBe(22)
})

test("the Other sessions card says what Working means (it moved out of the pane footer)", () => {
  expect(TOPICS.others.means).toContain("Working means Claude did something in the last 2 minutes.")
})
