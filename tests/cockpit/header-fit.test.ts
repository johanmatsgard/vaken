// One rule for every card header (in a 3-column pane about 1100 pt wide: "This s", "room f...").
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { choiceStacks, glanceControlsFit, glanceMoreUp, glanceNote, glancePickFit, glanceTrailPt, headerFit, sectionPt } from '../hooks/ui/kit'
import type { CardOpts } from '../hooks/ui/kit'
import { NEW_CHIP } from '../hooks/core/cardrules'
import { limitHead } from '../hooks/core/headline'
import { glanceFits } from '../hooks/features/home/headline'
import { BOLD_CHAR_PT, CHEVRON_GAP, CHEVRON_SLOT, DOT, GLANCE_DOT_GAP, GLANCE_VALUE_GAP, NOTE_MIN_LETTERS, TEXT_CHAR_PT } from '../hooks/ui/tokens'
import { LIST_SCOPES } from '../hooks/features/home/prefs'

const SETUP_PICK = [{ label: 'All projects', short: 'All' }, { label: 'This project', short: 'Project' }, { label: 'This session', short: 'Session' }]
const setup = (innerPt: number, note = 'Agent files and instructions') => headerFit(innerPt, { title: 'Agent setup', fold: false, note, pick: SETUP_PICK, restPt: 71.5 })

test('Agent setup: the long labels while they fit, the short ones next, the Pick on its own line in a narrow column', () => {
  expect(setup(900, '')).toMatchObject({ pickShort: false, pickOwnLine: false })
  expect(setup(500, '')).toMatchObject({ pickShort: true, pickOwnLine: false })
  expect(setup(340, '')).toMatchObject({ pickShort: false, pickOwnLine: true })
})

test('the note is whole while it fits and dropped when nothing else can yield, never cut with an ellipsis', () => {
  const wide = setup(900)
  expect(wide.note).toBe('Agent files and instructions')
  expect(setup(340).note).toBe('')
  expect(setup(100, 'Agent files and instructions').note).toBe('')
})

test('P6: a note that would keep fewer than NOTE_MIN_LETTERS letters is dropped, never a stub like "1 yo…"', () => {
  const others = (innerPt: number) => headerFit(innerPt, { title: 'Other sessions', fold: true, note: '1 your turn · 5 working', noteShort: '1 your turn', pick: [{ label: 'Now' }, { label: 'All' }], restPt: 71.5 })
  for (let w = 150; w <= 700; w += 10) {
    const note = others(w).note
    expect(note === '' || note === '1 your turn' || note === '1 your turn · 5 working' || note.length >= NOTE_MIN_LETTERS).toBe(true)
  }
})

test('Agents: the headline words yield first, "2 running" stays when "room for 1 more" does not fit', () => {
  const agents = (innerPt: number) => headerFit(innerPt, { title: 'Agents', fold: true, note: '2 running · room for 1 more', noteShort: '2 running', pick: [{ label: 'Now' }, { label: 'All' }], restPt: 71.5 })
  expect(agents(700).note).toBe('2 running · room for 1 more')
  expect(agents(360).note).toBe('2 running')
  expect(agents(360).pickOwnLine).toBe(false)
  expect(agents(700).pickShort).toBe(false)
})

test('a header with no Pick only drops the note', () => {
  const r = headerFit(300, { title: 'This session', fold: false, note: 'Vaken · my-website-app (1) and some more words', restPt: 71.5 })
  expect(r.pickOwnLine).toBe(false)
  expect(r.note).toBe('')
})

// A note that does not fit is never cut: it is whole, its short form, or dropped.
test('a header note is whole, short or dropped at every width, never cut', () => {
  const whole = 'Pause, undo, and which risky steps were stopped'
  const seen = new Set<string>()
  for (let w = 100; w <= 700; w += 5) {
    const note = headerFit(w, { title: 'Safety', fold: false, note: whole, noteShort: 'Pause and undo', restPt: 71.5 }).note
    expect([whole, 'Pause and undo', ''], `${w} pt`).toContain(note)
    seen.add(note)
  }
  expect(seen.size, 'every form shows at some width').toBe(3)
})

// The open Glance card's controls row: the Pick is never clipped on its first segment.
test('Glance: the Pick yields to short labels, then its own line, at every card width', () => {
  const o = { pick: { key: 'p', options: SETUP_PICK.map(x => ({ ...x, value: x.label })), value: 'All projects', onPick: () => {} }, more: { isFull: true, onPress: () => {} }, flip: { onPress: () => {} } }
  expect(glancePickFit(900, o)).toEqual({ short: false, ownLine: false })
  const mid = glancePickFit(330, o)
  expect(mid.short || mid.ownLine).toBe(true)
  expect(glancePickFit(150, o)).toEqual({ short: true, ownLine: true })
  expect(glanceNote(900, 'Agent files', undefined, o)).toBe('Agent files')
})

// At every width from 260 to 700 pt each drawn line of controls fits, so no control label is cut (the row clips on the left).
test('Glance: no control label is cut, for each card, at 260 to 700 pt', () => {
  const base = { more: { isFull: true, onPress: () => {} }, flip: { onPress: () => {} } }
  const pick = (options: { value: string; label: string; short?: string }[]) => ({ key: 'p', options, value: options[0]?.value ?? '', onPick: () => {} })
  const cards: Record<string, CardOpts> = {
    computer: base,
    limit: base,
    here: base,
    agents: { ...base, pick: pick([...LIST_SCOPES]) },
    others: { ...base, pick: pick([...LIST_SCOPES]) },
    setup: { ...base, pick: pick(SETUP_PICK.map(x => ({ ...x, value: x.label }))) },
    'new card': { ...base, chip: { word: NEW_CHIP, on: true } },
    widest: { ...base, pick: pick(SETUP_PICK.map(x => ({ ...x, value: x.label }))), chip: { word: NEW_CHIP, on: true }, jump: { label: 'Manage agents ›', onPress: () => {} }, actions: [{ kind: 'plus', label: 'Add', onPress: () => {} }] },
  }
  for (const [name, o] of Object.entries(cards)) {
    for (let w = 260; w <= 700; w += 10) {
      const f = glanceControlsFit(w, o)
      for (const line of f.lines) expect(line, `${name} at ${w} pt`).toBeLessThanOrEqual(w)
    }
  }
  expect(glanceControlsFit(260, cards.widest as CardOpts).split).toBe(true)
  expect(glanceControlsFit(700, cards.computer as CardOpts)).toMatchObject({ split: false, pickOwnLine: false })
})

test('Glance: the note is gone as soon as the Pick takes short labels or its own line (Agent setup, 200 to 900 pt)', () => {
  const o = { pick: { key: 'p', options: SETUP_PICK.map(x => ({ ...x, value: x.label })), value: 'All projects', onPick: () => {} }, more: { isFull: true, onPress: () => {} }, flip: { onPress: () => {} } }
  for (let w = 200; w <= 900; w += 10) {
    const fit = glancePickFit(w, o)
    if (fit.short || fit.ownLine) expect(glanceNote(w, 'Agent files and instructions', undefined, o), `at ${w} pt`).toBe('')
  }
  expect(glanceNote(900, 'Agent files and instructions', undefined, o)).toBe('Agent files and instructions')
})

// An open card's More or Less sits on the Glance row when title, value, dot, chevron and the button fit.
test('Glance: an open card\'s More or Less is always on the header line; the value yields to it, never the button', () => {
  const o: CardOpts = { more: { isFull: true, onPress: () => {} } }
  const g = (widthPt: number, value = '3 sessions') => ({ value, dot: 'neutral' as const, isOpen: true, widthPt, onPress: () => {} })
  expect(glanceMoreUp('Computer', g(500), o)).toBe(true)
  expect(glanceMoreUp('Computer', g(150), o)).toBe(true)
  expect(glanceMoreUp('Computer', g(300, 'x'.repeat(60)), o)).toBe(true)
  expect(glanceMoreUp('Computer', { ...g(500), isOpen: false }, o)).toBe(false)
  expect(glanceMoreUp('Computer', g(500), {})).toBe(false)
  expect(glanceMoreUp('Computer', { ...g(500), back: 'Back' }, o)).toBe(false)
  expect(glanceTrailPt({ isFull: true })).toBeGreaterThan(0)
  expect(glanceTrailPt({ isFull: false })).toBeGreaterThan(glanceTrailPt({ isFull: true }))
  expect(glanceTrailPt(undefined)).toBe(0)
})

test('Glance: the Plan limits headline takes the longest form that fits beside the Fold of an open card', () => {
  const blocks = [{ short: 'Week', percent: 38, reset: 'resets Mon 11:00' }]
  const open = (widthPt: number) => limitHead(blocks, s => s, glanceFits('Plan limits', widthPt - glanceTrailPt({ isFull: true })))
  expect(open(1000)).toBe('Week: 38% used · resets Mon 11:00')
  expect(open(380)).toBe('38% used · resets Mon 11:00')
  expect(open(250)).toBe('38% used')
  for (const w of [380, 330, 300, 250]) {
    const v = open(w)
    expect(v.length * TEXT_CHAR_PT + 'Plan limits'.length * BOLD_CHAR_PT + GLANCE_VALUE_GAP + GLANCE_DOT_GAP + DOT + CHEVRON_GAP + CHEVRON_SLOT + glanceTrailPt({ isFull: true }), `${w}: ${v}`).toBeLessThanOrEqual(w)
  }
})

test('a section label is as wide as its letters, wide letters included', () => {
  expect(sectionPt('Memory')).toBeGreaterThanOrEqual(45)
  expect(sectionPt('Memory')).toBeGreaterThan(sectionPt('iiiiii'))
  expect(sectionPt('Minne')).toBeGreaterThan(5 * 6.3)
})

// A settings row whose label would wrap beside its chip and choices puts the choices under it.
test('a settings row stacks its choices when the label does not fit beside them', () => {
  expect(choiceStacks(600, 'Detail of this card', ['Short', 'All'], 'All')).toBe(false)
  expect(choiceStacks(260, 'Detail of this card', ['Default', 'Short', 'All'], 'All')).toBe(true)
})
