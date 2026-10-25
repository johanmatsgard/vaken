// Learn from outcomes: kinds and counts of vaken's own offers, per project. They rank the next step buttons, quiet an offer put off 3 times
// in a row for a week, and give one line in /vaken-today value. The hint in the prompt box (Q15) is the top button of the same ranking.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'
import { SLOW, test } from './slow'

import { QUIET_AFTER, QUIET_MS, RANK_MIN, emptyBook, noteOffer, offersKey, offersLine, parseBook, quietNow, rankPicks, useRate } from '../hooks/core/offerlearn'
import type { OfferBook } from '../hooks/core/offerlearn'
import { pressWorked } from '../hooks/features/nextsteps'
import { weekStamp } from '../hooks/core/value'
import { SUBMIT_AFTER_MS } from '../hooks/core/phonenote'
import { tIn } from '../hooks/i18n/t'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const DAY = 24 * 3_600_000
const WEEK = weekStamp(NOW)
const ROOT = '/w/me'

const many = (b: OfferBook, kind: Parameters<typeof noteOffer>[1], ev: Parameters<typeof noteOffer>[2], n: number, at = NOW): OfferBook => Array.from({ length: n }).reduce<OfferBook>(acc => noteOffer(acc, kind, ev, at, WEEK), b)

test('counts per kind and per week; the third put-off in a row quiets the offer for a week, a press ends the streak', () => {
  let b = many(emptyBook(), 'fit', 'dismissed', QUIET_AFTER - 1)
  expect(quietNow(b, 'fit', NOW)).toBe(false)
  b = noteOffer(b, 'fit', 'pressed', NOW, WEEK)
  b = many(b, 'fit', 'dismissed', QUIET_AFTER - 1)
  expect(quietNow(b, 'fit', NOW)).toBe(false)
  b = noteOffer(b, 'fit', 'dismissed', NOW, WEEK)
  expect(quietNow(b, 'fit', NOW)).toBe(true)
  expect(quietNow(b, 'fit', NOW + QUIET_MS - 1)).toBe(true)
  expect(quietNow(b, 'fit', NOW + QUIET_MS)).toBe(false)
  expect(quietNow(b, 'teach', NOW)).toBe(false)
  expect(b.kinds.fit).toMatchObject({ dismissed: 5, pressed: 1, streak: 0 })
  // A new week starts the week's counts again, the all-time counts stay
  const next = noteOffer(b, 'tests', 'pressed', NOW + 8 * DAY, weekStamp(NOW + 8 * DAY))
  expect(next.wk.fit).toBeUndefined()
  expect(next.kinds.fit?.dismissed).toBe(5)
})

test('the store holds counts only, and a bad value reads as empty', () => {
  const b = many(emptyBook(), 'tests', 'shown', 3)
  const back = parseBook(JSON.parse(JSON.stringify(b)))
  expect(back).toEqual(b)
  expect(parseBook('x')).toEqual(emptyBook())
  expect(parseBook({ kinds: { tests: { shown: -4, pressed: 'a' }, nope: { shown: 1 } } }).kinds).toEqual({ tests: { shown: 0, pressed: 0, worked: 0, ignored: 0, dismissed: 0, streak: 0 } })
  expect(offersKey(ROOT)).not.toContain(ROOT)
})

test('buttons keep the order of the facts until there is history; then the one this person uses leads, and Fix it stays first', () => {
  const early = many(emptyBook(), 'diff', 'pressed', 2)
  expect(rankPicks(['tests', 'diff'], early)).toEqual(['tests', 'diff'])
  let b = many(emptyBook(), 'tests', 'shown', RANK_MIN)
  b = many(b, 'diff', 'shown', RANK_MIN)
  b = many(b, 'diff', 'pressed', 6)
  b = many(b, 'tests', 'ignored', RANK_MIN)
  expect(useRate(b.kinds.diff)).toBeGreaterThan(useRate(b.kinds.tests))
  expect(rankPicks(['tests', 'diff'], b)).toEqual(['diff', 'tests'])
  expect(rankPicks(['fix', 'tests', 'diff'], b)).toEqual(['fix', 'diff', 'tests'])
})

test('a press worked when its answer did what it was for', () => {
  const saw = (passed: boolean, failed = false, commit = false) => ({ passed, failed, commit })
  expect(pressWorked('fix', saw(true), 'answer', false)).toBe(true)
  expect(pressWorked('fix', saw(false), 'answer', false)).toBe(false)
  expect(pressWorked('stuck', saw(true), 'answer', true)).toBe(false)
  expect(pressWorked('commit', saw(false, false, true), 'answer', false)).toBe(true)
  expect(pressWorked('diff', saw(false), 'answer', false)).toBe(true)
  expect(pressWorked('continue', saw(false), 'error', false)).toBe(false)
  expect(pressWorked('fit', saw(true), 'answer', false)).toBeUndefined()
})

test('the weekly line: presses, what worked, what was left, the one used most; nothing this week says nothing; Swedish too', () => {
  expect(offersLine(emptyBook(), WEEK)).toBeUndefined()
  let b = many(emptyBook(), 'tests', 'pressed', 3)
  b = many(b, 'tests', 'worked', 2)
  b = many(b, 'diff', 'ignored', 4)
  b = many(b, 'fit', 'dismissed', 1)
  expect(offersLine(b, WEEK)).toBe("Your presses on vaken's offers this week: 3, 2 of them worked; 5 left or put off. Used most: Run tests.")
  expect(offersLine(b, weekStamp(NOW + 8 * DAY))).toBeUndefined()
  expect(tIn('sv', 'band.offers_this_week', { pressed: 1, worked: 1, left: 0 })).toContain('vakens förslag')
})

function world(on: On) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:plain.mode': 'off', 'cockpit:firstrun': 'done', 'cockpit:awake:asked': 1, 'cockpit:phone:asked': 1, 'cockpit:setting:next.mode': 'hint', 'cockpit:setting:modhealth.mode': 'off' }))
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
  mock.session(on)
  on('session.id', () => ({ value: 'me' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.root', () => ({ value: ROOT }) as never)
  on('session.cwd', () => ({ value: ROOT }) as never)
  on('session.surfaces', () => ({ value: ['desktop'] }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('prompt.submit', (_$, e) => ({ text: e.text }) as never)
  on('tool.call', () => ({ result: {}, text: 'ok' }) as never)
  const shown: string[] = []
  on('prompt.suggest', (_$, e) => {
    shown.push(e.text)
    return { isShown: true }
  })
  return { clock, shown, mem }
}

const turn = async ($: EngineInterface, id: string, tool: { tool: string; [k: string]: unknown }): Promise<void> => {
  await $.turn.start({ text: 'go', turnId: id } as never)
  await $.tool.call(tool as never)
  await $.turn.complete({ answer: 'Done.', durationMs: 1000, isAborted: false, turnId: id, reason: 'answer' } as never)
}

test('taking the hint counts a press on the first button, the next answer tells it worked, and the counts reach the store with no words', SLOW, async ($, on) => {
  const w = world(on)
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
  await turn($, 't1', { tool: 'Edit', file_path: `${ROOT}/a.ts` })
  await w.clock.advance(SUBMIT_AFTER_MS)
  expect(w.shown).toEqual(['Run the tests and tell me the result'])
  await $.prompt.submit({ text: 'Run the tests and tell me the result', origin: { kind: 'composer' } } as never)
  await turn($, 't2', { tool: 'Bash', command: 'npm test' })
  // Written at most every 10 minutes from the turn hooks
  await w.clock.advance(11 * 60_000)
  await turn($, 't3', { tool: 'Edit', file_path: `${ROOT}/b.ts` })
  await $.prompt.submit({ text: 'something else', origin: { kind: 'composer' } } as never)
  await w.clock.advance(11 * 60_000)
  await turn($, 't4', { tool: 'Read', file_path: `${ROOT}/b.ts` })
  const stored = parseBook(w.mem.get(offersKey(ROOT)))
  expect(stored.kinds.tests).toMatchObject({ pressed: 1, worked: 1 })
  expect((stored.kinds.tests?.shown ?? 0) >= 2).toBe(true)
  expect((stored.kinds.tests?.ignored ?? 0) >= 1).toBe(true)
  const raw = JSON.stringify(w.mem.get(offersKey(ROOT)))
  expect(raw).not.toContain('something else')
  expect(raw).not.toContain('a.ts')
  expect(raw).not.toContain(ROOT)
  const said = (await $.command.run({ command: 'vaken-today', args: 'value' } as never)) as { text: string }
  expect(said.text).toContain("Your presses on vaken's offers this week: 1, 1 of them worked")
})
