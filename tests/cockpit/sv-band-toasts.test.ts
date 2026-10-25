// The one text table: the band, the toasts, Needs you, the Autopilot titles, the "What is this?" explanations and the guard's words.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { EXPLAIN } from '../hooks/core/explain'
import { GUARD_SETTINGS, GUARD_WHATS, allowedNote, haltReason, heldToast, holdReason, warnNote, warnToast } from '../hooks/core/guard'
import { holdReason as worldHold, heldToast as worldToast } from '../hooks/core/guardworld'
import { warnToast as migrationWarn } from '../hooks/core/guardback'
import { WIN_EN, winText } from '../hooks/core/guardwinwords'
import { bandWords } from '../hooks/core/happened'
import { buildInbox } from '../hooks/core/inbox'
import { setLang, t, tEn, tr, trFill } from '../hooks/core/lang'
import { shownTitle } from '../hooks/core/ledger'
import { TOPICS, whatIsLines } from '../hooks/core/whatis'
import { areaWords } from '../hooks/core/health'
import { weeklyBand, weeklyLine } from '../hooks/core/weekly'
import { weeklyLine as weeklyCount } from '../hooks/core/value'
import { recapWords, notices } from '../hooks/core/attention'
import { needsGroups } from '../hooks/features/home/needs'

// English words that must not be left in a Swedish line (names, commands and numbers are not in this list).
const ENGLISH = /\b(the|and|failed|times|today|Warned|Stopped|Risky|updated|waits?|sessions?|needs|steps?|finished|Held|Allowed|Claude was told|nothing was blocked)\b/
const NOW = 1_700_000_000_000

const BAND_LINES = [
  `${areaWords('guard')} failed 3 times today`,
  `${areaWords('trust')} failed 4 times today`,
  'Plugin updated: acme 1.2.0',
  '3 plugins updated',
  'Preset: Calm',
  weeklyBand({ loops: 1, shortens: 2, stops: 3 }) ?? '',
  weeklyLine({ loops: 1, shortens: 2, stops: 3 }) ?? '',
  weeklyCount(7),
  recapWords({ gapMs: 25 * 60_000, branch: 'feat-x', unreviewed: 2 }),
  'Drift: 5 edits far from the goal',
  'Pull request 12: 2 checks failed. Open it in the pane.',
  '1 stopped step waits for you. Open Needs you.',
  '3 sessions need you',
  'Claude assumed 3 things. /vaken-explain assumptions',
]

test('the band says lines built from facts in Swedish and leaves English alone', () => {
  const english = BAND_LINES.map(l => bandWords(l, tr))
  expect(english).toEqual(BAND_LINES)
  setLang('sv')
  const sv = BAND_LINES.map(l => bandWords(l, tr))
  setLang('en')
  for (const [i, line] of sv.entries()) {
    expect(line, BAND_LINES[i]).not.toBe(BAND_LINES[i])
    expect(ENGLISH.test(line.replace(/\/vaken-[a-z-]+/g, ' ')), `${BAND_LINES[i]} -> ${line}`).toBe(false)
  }
  setLang('sv')
  expect(bandWords('Plugin updated: acme 1.2.0', tr)).toBe('Tillägg uppdaterat: acme 1.2.0')
  expect(bandWords('Preset: Night shift', tr)).toBe('Läge: Night shift')
  expect(bandWords('Preset: Everything useful', tr)).toBe('Läge: Allt användbart')
  expect(bandWords(`${areaWords('guard')} failed 3 times today`, tr)).toBe('Säkerhetskontrollen misslyckades 3 gånger i dag')
  setLang('en')
})

test('a toast text built from facts is said where it is shown', () => {
  const r = notices({}, [{ id: 's1', name: 'api', kind: 'needs', reason: 'a question', since: NOW }], {}, 'all', NOW)
  const text = r.notices[0].text
  setLang('sv')
  const sv = trFill(text)
  expect(sv).toBe('"api" behöver dig: a question.')
  expect(trFill('"api" finished.')).toBe('"api" blev klar.')
  setLang('en')
  expect(trFill(text)).toBe(text)
})

test('the names of a guard rule are said in the toast and stay English in the note to Claude', () => {
  const found = [{ block: 'destructive', words: 'Deletes the files.' }] as never
  const en = heldToast(found)
  expect(en).toContain('Stopped a risky command. Press Allow once in Needs you')
  setLang('sv')
  const sv = heldToast(found)
  const note = holdReason(found)
  const world = worldHold([{ rule: 'world', key: 'k', words: 'Sends a message.' }])
  setLang('en')
  expect(sv).toContain('Stoppade ett riskabelt kommando')
  expect(ENGLISH.test(sv)).toBe(false)
  expect(note).toContain("Vaken's risky command hold stopped this step.")
  expect(world).toContain("Vaken's outside-actions check stopped this step.")
  expect(haltReason).toMatch(/^Vaken paused this session/)
  expect(warnNote(found)).toMatch(/^Vaken's risky command hold saw a risk/)
  expect(allowedNote(found)).toMatch(/would have stopped this step/)
})

test('the other guard toasts are Swedish in Swedish', () => {
  setLang('sv')
  const lines = [warnToast([{ block: 'scope', words: 'x' }] as never), worldToast([{ rule: 'secrets', key: 'k', words: 'x' }]), migrationWarn()]
  setLang('en')
  for (const l of lines) expect(ENGLISH.test(l), l).toBe(false)
})

test('every title the guard writes has a Swedish line, stored or shown', () => {
  setLang('sv')
  const missing = GUARD_WHATS.filter(w => tr(shownTitle(w)) === shownTitle(w))
  setLang('en')
  expect(missing).toEqual([])
})

test('the Settings notes of the guard rows are in the table', () => {
  setLang('sv')
  const missing = GUARD_SETTINGS.filter(s => tr(s.note) === s.note)
  setLang('en')
  expect(missing.map(s => s.key)).toEqual([])
})

test('Needs you says its rows and its opened lines in Swedish', () => {
  const sessions = [
    { sid: 'a', name: 'api', here: false },
    { sid: 'b', name: 'web', here: true },
  ]
  const ledger = [
    { at: NOW - 60_000, session: 'a', what: 'Held a risky command', detail: 'Deletes the files.', did: true },
    { at: NOW - 90_000, session: 'a', what: 'Held a call over budget', did: true },
  ]
  const items = buildInbox({
    now: NOW,
    sessions,
    ledger: ledger as never,
    allowed: [],
    asks: [{ sid: 'a', kind: 'question', tool: 'x', since: NOW - 120_000 }],
    debts: [{ sid: 'a', turns: 2 }],
    halts: [{ sid: 'a', at: NOW - 300_000 }],
    seen: {},
  })
  setLang('sv')
  const groups = needsGroups(items, NOW, tr)
  const lines = groups.flatMap(g => [tr(g.head), ...g.rows.flatMap(r => [r.title, ...whatIsLines(r.what, trFill)])])
  setLang('en')
  expect(lines.length).toBeGreaterThan(8)
  for (const l of lines) expect(ENGLISH.test(l.replace(/Deletes the files\./, '')), l).toBe(false)
  const en = needsGroups(items, NOW, x => x).flatMap(g => g.rows.flatMap(r => whatIsLines(r.what)))
  expect(en.some(l => l.startsWith('What it means: Claude tried a risky step. Vaken stopped it before it ran.'))).toBe(true)
  expect(en.some(l => l === 'What you can do: Open that session; its pane has Allow once.')).toBe(true)
})

test('"What is this?" of every line vaken writes down has a Swedish text', () => {
  setLang('sv')
  const missing: string[] = []
  for (const [title, x] of Object.entries(EXPLAIN)) for (const f of [x.means, x.why, x.next]) if (trFill(f) === f) missing.push(`${title}: ${f}`)
  for (const [topic, x] of Object.entries(TOPICS)) if (trFill(x.means) === x.means) missing.push(`${topic}: ${x.means}`)
  const lines = whatIsLines({ means: EXPLAIN['Paused all changes'].means, why: 'Shown 4 min ago', next: EXPLAIN['Paused all changes'].next, last: ['4 min ago: Paused all changes.'] }, trFill)
  setLang('en')
  expect(missing).toEqual([])
  expect(lines[0].startsWith('Vad det betyder: ')).toBe(true)
  expect(lines.some(l => l.startsWith('Varför nu: Visades för 4 min sedan'))).toBe(true)
  expect(lines.some(l => l.startsWith('  för 4 min sedan:'))).toBe(true)
  expect(whatIsLines({ means: 'm', why: 'w', next: 'n', last: ['4 min ago'] })).toEqual(['What it means: m', 'Why now: w', 'What you can do: n', 'The last times:', '  4 min ago'])
})

test('the Windows guard words are in the table: English is what the guard says, Swedish is read from the rows', () => {
  for (const [id, w] of Object.entries(WIN_EN)) {
    const sv = winText('sv', id) ?? { what: '', risk: '', riskRoot: undefined }
    expect(sv.what, id).not.toBe(w.what)
    expect(sv.what.startsWith('winwords.'), id).toBe(false)
    expect(sv.risk.startsWith('winwords.'), id).toBe(false)
    expect(tEn(`winwords.${id.replace(/[^a-z0-9]+/g, '_')}_what`), id).toBe(w.what)
    expect(sv.riskRoot === undefined, id).toBe(w.riskRoot === undefined)
  }
  expect(winText('sv', 'win-delete')?.what).toBe('Raderar för gott')
  setLang('sv')
  expect(t('winwords.win_format_risk')).toBe('Allt på den raderas.')
  setLang('en')
  expect(t('winwords.win_format_risk')).toBe('Everything on it is erased.')
})
