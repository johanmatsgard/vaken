// The weekly "did for you" line: the estimate from the counts and the ledger, its words, the note it keeps.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { readBand } from '../hooks/core/band'
import { CALM_KEY, parseCalm } from '../hooks/core/calm'
import { COUNTS_KEY, addCount } from '../hooks/core/counts'
import type { Io } from '../hooks/core/io'
import type { Entry } from '../hooks/core/ledger'
import { LOOP_MINUTES, RISKY_STOP_MINUTES, SHORTEN_MINUTES, WEEKLY_ROW_MS, aboutMinutes, parseWeekly, weeklyBand, weeklyFacts, weeklyLine, weeklyShown, weeklyValue } from '../hooks/core/weekly'
import { WEEK_KEY, valueText, weeklyCheck } from '../hooks/features/value'
import { LEDGER_KEY } from '../hooks/features/compaction'
import { weeklyGroup } from '../hooks/features/home/cards/calm'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const NOW = new Date(2026, 9, 12, 9, 0).getTime()

const counts = (rows: [string, number][]): unknown => rows.reduce<unknown>((raw, [what, n]) => {
  let r = raw
  for (let k = 0; k < n; k += 1) r = addCount(r, NOW - 2 * DAY, what)
  return r
}, {})
const compact = (ago: number, how: Entry['how']): Entry => ({ at: NOW - ago, what: 'compacted (auto)', before: 200_000, after: 20_000, how })

test('the estimate: plain minutes per kind, only the compactions vaken started, nothing outside the window', () => {
  const c = { 'Caught a repeating step': 2, 'Blocked the same step again': 1, 'Held a risky command': 2, 'Refused a risky step while away': 1, 'Kept the cache warm': 9 }
  const ledger = [compact(HOUR, 'auto'), compact(2 * HOUR, 'button'), compact(3 * HOUR, 'typed'), compact(9 * DAY, 'auto')]
  const w = weeklyValue(c, ledger, NOW - 7 * DAY, NOW + 1)
  expect(w).toEqual({ loops: 3, shortens: 2, stops: 3, minutes: 3 * LOOP_MINUTES + 2 * SHORTEN_MINUTES + 3 * RISKY_STOP_MINUTES })
  // The constants are small on purpose (a guess too high would boast).
  expect([LOOP_MINUTES, SHORTEN_MINUTES, RISKY_STOP_MINUTES]).toEqual([5, 3, 10])
  expect(weeklyValue({}, [], NOW - 7 * DAY, NOW)).toEqual({ loops: 0, shortens: 0, stops: 0, minutes: 0 })
})

test('the words say "about", round to 5 minutes, and leave out what is zero; too little says nothing', () => {
  expect(aboutMinutes(7)).toBe('about 7 min')
  expect(aboutMinutes(42)).toBe('about 40 min')
  expect(aboutMinutes(77)).toBe('about 1 h 15 min')
  expect(aboutMinutes(120)).toBe('about 2 h')
  const w = { loops: 3, shortens: 2, stops: 3, minutes: 51 }
  expect(weeklyLine(w)).toBe('This week vaken saved you about 50 min and stopped 3 risky steps.')
  expect(weeklyLine({ ...w, planPct: 12 })).toBe('This week vaken saved you about 50 min, stopped 3 risky steps and saved 12% of your plan.')
  expect(weeklyLine({ loops: 2, shortens: 0, stops: 0, minutes: 10 })).toBe('This week vaken saved you about 10 min.')
  expect(weeklyBand(w)).toBe('This week: about 50 min saved, 3 risky steps stopped')
  expect((weeklyBand(w) ?? '').length).toBeLessThanOrEqual(60)
  expect(weeklyLine({ loops: 0, shortens: 1, stops: 0, minutes: 3 })).toBeUndefined()
  expect(weeklyBand({ loops: 0, shortens: 0, stops: 1, minutes: 10 })).toBe('This week: about 10 min saved, 1 risky step stopped')
  expect(weeklyFacts(w)).toEqual([
    'Caught a repeating step 3 times: about 15 min.',
    'Compacted the session 2 times: about 6 min.',
    'Stopped 3 risky steps: about 30 min.',
    'Minutes are estimates: 5 for a caught repeating step, 3 for a compaction, 10 for a stopped risky step. Usage saved is not counted.',
  ])
})

test('the note is read back strictly and shows for a week', () => {
  const note = { week: '2026-10-12', at: NOW, loops: 1, shortens: 0, stops: 1, minutes: 15 }
  expect(parseWeekly(note)).toEqual(note)
  expect(parseWeekly({ ...note, minutes: 'lots' })).toBeUndefined()
  expect(parseWeekly(null)).toBeUndefined()
  expect(weeklyShown(note, NOW + HOUR)).toEqual(note)
  expect(weeklyShown(note, NOW + WEEKLY_ROW_MS)).toBeUndefined()
  expect(weeklyShown({ ...note, stops: 0, minutes: 3 }, NOW)).toBeUndefined()
})

function memIo(seed: Record<string, unknown> = {}) {
  const mem = new Map<string, unknown>(Object.entries(seed))
  const io: Io = {
    now: async () => NOW,
    home: async () => '',
    sessionId: async () => 'me',
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem }
}

test('the weekly check posts the minutes line once a week and keeps the note for the Autopilot row; /vaken-today value says it on top', async () => {
  // The weekly line is off on a fresh store by default, so the test turns it on.
  const w = memIo({ 'cockpit:setting:value.weekly': 'on', [COUNTS_KEY]: counts([['Caught a repeating step', 2], ['Held a risky command', 1]]), [LEDGER_KEY]: [compact(HOUR, 'auto')] })
  expect(await weeklyCheck(w.io)).toBe(true)
  const band = await readBand(w.io)
  expect(band.map(b => [b.id, b.text])).toEqual([['value', 'This week: about 25 min saved, 1 risky step stopped']])
  expect(w.mem.get(WEEK_KEY)).toBe('2026-10-12')
  expect(parseCalm(w.mem.get(CALM_KEY)).weekly).toEqual({ week: '2026-10-12', at: NOW, loops: 2, shortens: 1, stops: 1, minutes: 23 })
  expect(await weeklyCheck(w.io)).toBe(false)
  expect((await valueText(w.io, '')).split('\n')[0]).toBe('This week vaken saved you about 25 min and stopped 1 risky step. (estimate)')
  const quiet = memIo()
  expect(await weeklyCheck(quiet.io)).toBe(false)
  expect(quiet.mem.has(CALM_KEY)).toBe(false)
})

test('the Autopilot card\'s "This week" row: the minutes on the left, the stops on the right, the kinds when it opens', () => {
  const g = weeklyGroup({ week: '2026-10-12', at: NOW, loops: 2, shortens: 1, stops: 1, minutes: 23 })
  expect(g.map(x => x.head)).toEqual(['This week'])
  expect(g[0]?.rows.map(r => [r.title, r.right])).toEqual([['Saved you about 25 min (estimate)', '1 risky step stopped']])
  expect(g[0]?.rows[0]?.what.facts?.[0]).toBe('Caught a repeating step 2 times: about 10 min.')
  expect(weeklyGroup(undefined)).toEqual([])
})
