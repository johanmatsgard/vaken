// Narrow width words: at 36 columns (316.8 pt with 8.8 pt cells) the plan chip stands beside a done line, and at 288 pt the line is said
// whole or by its short words (the chip gives way before a sentence is cut); the words of the Agents and Pull requests rows show, in English and Swedish,
// by shorter words, or under the title of an open card (no new sizes).
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { DONE_SHORT, doneShort } from '../hooks/core/band'
import { setLang, tr } from '../hooks/core/lang'
import { EXPLAIN_TITLES } from '../hooks/core/explain'
import { shownTitle } from '../hooks/core/ledger'
import { agentsHead, agentsShort, prsHead, prsShortHead } from '../hooks/core/headline'
import { bandPlan } from '../hooks/features/home/band'
import type { View } from '../hooks/features/home/logic'
import { glanceBelow, glanceShown, glanceTrailPt } from '../hooks/ui/kit'
import { columnPt } from '../hooks/ui/tokens'

const NOW = Date.parse('2026-10-12T10:00:00Z')
const MIN = 60_000
const W288 = 288 / columnPt()
const W36 = 36
type Win = { label: string; percent: number }
const usageView = (id: string, text: string, wins: Win[]): View =>
  ({
    needs: [],
    working: [],
    waiting: [],
    idle: [],
    now: NOW,
    band: [{ id, level: 'info', text, at: NOW - MIN, ttlMs: 30 * MIN }],
    usage: { at: NOW - 40_000, windows: wins.map(w => ({ ...w, resetsAt: new Date(NOW + 100 * MIN).toISOString() })) },
  }) as unknown as View
const CHIPS: Win[][] = [
  [{ label: '5-hour limit', percent: 22 }, { label: 'Weekly · all models', percent: 38 }],
  [{ label: '5-hour limit', percent: 95 }, { label: 'Weekly · all models', percent: 99 }],
]
const planOf = (title: string, wins: Win[], columns: number) => bandPlan(usageView(`did:${title}`, shownTitle(title), wins), 'explained', columns, [], false, false, true)

// Every title vaken writes as a done line, and the few the explain list does not hold
const EXTRA = ['Compacted the session by itself', 'Compacted the session', 'Compacted a session', 'Asked about compacting at good moments', 'Started a night run', 'Ended a night run', 'Checked the pull request from a typed command', 'Made a fix request for a failing check', 'Merged a pull request from a typed command', 'Did not merge a pull request', 'Saved a rule you repeated in CLAUDE.md', 'Removed a saved rule from CLAUDE.md', 'Kept your tips after an update', 'Your mode follows the new modes after an update']
const PRESETS = ['Applied the Only alerts preset', 'Applied the Recommended preset', 'Applied the Everything useful preset', 'Applied the Ask before risky steps preset', 'Applied the Every check on preset']

test('the plan chip stands beside every done line at 36 columns, and at 288 pt every done line is said, in English and Swedish', () => {
  const lost: string[] = []
  for (const lang of ['en', 'sv']) {
    setLang(lang)
    try {
      for (const title of [...EXPLAIN_TITLES, ...EXTRA, ...PRESETS]) {
        for (const columns of [W288, W36]) {
          for (const [n, wins] of CHIPS.entries()) {
            const p = planOf(title, wins, columns)
            // At 288 pt the wider letters leave the chip too little room beside most lines: the chip gives way, the line is said
            if (p.mode !== 'line' || (columns === W36 && p.fit === 'none')) lost.push(`${lang} ${columns.toFixed(1)} chip ${n}: ${title} -> ${p.mode === 'line' ? p.text : p.mode}`)
          }
        }
      }
    } finally {
      setLang('en')
    }
  }
  expect(lost).toEqual([])
})

test('a done line says short words only when the whole title would push the chip off, and keeps its whole words when it fits or has no short form', () => {
  setLang('en')
  const wide = planOf('Compacted the session by itself', CHIPS[0] ?? [], 120)
  expect(wide.mode === 'line' && wide.text).toBe('✓ Compacted the session by itself')
  const narrow = planOf('Compacted the session by itself', CHIPS[0] ?? [], W36)
  expect(narrow.mode === 'line' && narrow.text).toBe('✓ Auto-compacted')
  expect(narrow.mode === 'line' && narrow.open).toBeUndefined()
  setLang('sv')
  try {
    const sv = planOf('Compacted the session by itself', CHIPS[0] ?? [], W36)
    expect(sv.mode === 'line' && sv.text).toBe('✓ Autokomprimerat')
    expect(sv.mode === 'line' && sv.fit).not.toBe('none')
  } finally {
    setLang('en')
  }
  // A title with no short form keeps its words and the chip gives way, as before
  const unknown = bandPlan(usageView('did:A made-up long title that nobody gave short words', 'A made-up long title that nobody gave short words', CHIPS[0] ?? []), 'explained', W288, [], false, false, true)
  expect(unknown.mode === 'line' && unknown.fit).toBe('none')
  expect(unknown.mode === 'line' && unknown.text).toBe('✓ A made-up long title that nobody gave short words')
})

test('every short form of a done line is shorter than its title and is a table row in both languages', () => {
  for (const [title, short] of DONE_SHORT) {
    expect(short.length, `${title} -> ${short}`).toBeLessThan(shownTitle(title).length)
    for (const lang of ['en', 'sv']) {
      setLang(lang)
      try {
        const said = doneShort(`did:${title}`, tr)
        expect(said.length, `${lang} ${title}`).toBe(1)
        expect((said[0] ?? '').length, `${lang} ${title}`).toBeGreaterThan(0)
        if (lang === 'sv') expect(said[0], title).not.toBe(short)
      } finally {
        setLang('en')
      }
    }
  }
  setLang('en')
  expect(doneShort('did:Applied the Only alerts preset', tr)).toEqual(['Preset: Only alerts', 'Preset applied'])
  expect(doneShort('guard', tr)).toEqual([])
})

// The Glance row's value: whole, else its short form, else the dot's word (kit glanceShown). 262 pt is the card row at 288, 258.4 at 36 columns;
// "new" is the card's new chip, "open" the Fold word on the open card's row.
const INNERS = [262, 258.4]
const shown = (title: string, value: string, short: string | undefined, fresh: boolean, open: boolean, inner: number): string =>
  glanceShown(title, { value, dot: 'neutral', isOpen: open, widthPt: inner, onPress: () => undefined, fresh, ...(short === undefined ? {} : { short }) }, open ? glanceTrailPt({ isFull: false }) : 0)
// What an open card's header says: the word on its row, else on the line under the title (glanceBelow)
const said = (title: string, value: string, short: string | undefined, fresh: boolean, open: boolean, inner: number): string =>
  shown(title, value, short, fresh, open, inner) ||
  glanceBelow(title, { value, dot: 'neutral', isOpen: open, widthPt: inner, onPress: () => undefined, fresh, ...(short === undefined ? {} : { short }) }, open ? glanceTrailPt({ isFull: false }) : 0)

test('Agents: the word for a failed run and for a run not started shows at 288 pt, closed, with the new chip, and open', () => {
  const lost: string[] = []
  for (const lang of ['en', 'sv']) {
    setLang(lang)
    try {
      const title = lang === 'sv' ? 'Agenter' : 'Agents'
      for (const facts of [{ running: 0, stuck: 0, total: 1, failed: 2 }, { running: 0, stuck: 0, total: 2, run: 'setup' as const }]) {
        for (const inner of INNERS) {
          for (const [fresh, open] of [[false, false], [true, false], [false, true]] as const) {
            if (said(title, agentsHead(facts, tr), agentsShort(facts, tr), fresh, open, inner) === '') lost.push(`${lang} ${inner} fresh=${fresh} open=${open}: ${agentsHead(facts, tr)}`)
          }
        }
      }
    } finally {
      setLang('en')
    }
  }
  expect(lost).toEqual([])
  setLang('sv')
  try {
    expect(agentsShort({ running: 0, stuck: 0, total: 2, run: 'setup' }, tr)).toBe('Ej startad')
    expect(agentsShort({ running: 0, stuck: 0, total: 1, failed: 1 }, tr)).toBe('Gick fel')
  } finally {
    setLang('en')
  }
})

test('Pull requests: "Not checked" shows at 288 pt, closed and with the new chip, in English and Swedish', () => {
  const lost: string[] = []
  const facts = { on: true, open: 0, unknown: 'look' as const }
  for (const lang of ['en', 'sv']) {
    setLang(lang)
    try {
      for (const inner of INNERS) {
        for (const fresh of [false, true]) if (shown('Pull requests', prsHead(facts, tr), prsShortHead(facts, tr), fresh, false, inner) === '') lost.push(`${lang} ${inner} fresh=${fresh}`)
      }
    } finally {
      setLang('en')
    }
  }
  expect(lost).toEqual([])
  setLang('sv')
  try {
    expect(prsHead(facts, tr)).toBe('Inte kontrollerad')
    expect(prsShortHead(facts, tr)).toBe('Okontrollerad')
    expect(shown('Pull requests', 'Inte kontrollerad', undefined, true, false, 258.4)).toBe('')
    expect(shown('Pull requests', 'Inte kontrollerad', 'Okontrollerad', true, false, 258.4)).toBe('Okontrollerad')
  } finally {
    setLang('en')
  }
  expect(prsShortHead({ on: true, open: 2 }, tr)).toBeUndefined()
})
