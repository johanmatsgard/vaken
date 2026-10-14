// Awake guard, the reasons: the plan table, the cap, the phones, the words and the ask-once line.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import {
  AWAKE_ABS_MAX_MS,
  AWAKE_AWAY_MAX_MS,
  AWAKE_STRINGS,
  AWAKE_WAIT_MAX_MS,
  ASK_LINE,
  LID_NOTE,
  REASONS,
  askDue,
  awakeCardLines,
  awakeNow,
  awakeReason,
  awayOf,
  chainAfterStart,
  chainCapped,
  latestPhone,
  parseAwakeArgs,
  parseChain,
  parsePhones,
  phonesJoined,
  phonesLeft,
  setAwakeShown,
  touchDue,
  waitingFrom,
  wantOf,
  whyLine,
} from '../hooks/core/awakeplan'
import type { AwakeFacts } from '../hooks/core/awakeplan'
import { byEnglish, englishOf } from '../hooks/i18n/table'

const MIN = 60_000
const HOUR = 60 * MIN
const NOW = Date.parse('2026-10-11T12:00:00Z')

const facts = (over: Partial<AwakeFacts> = {}): AwakeFacts => ({ working: 0, waiting: { count: 0 }, background: 0, ...over })

test('the plan table: working, phone, waiting, background, none', () => {
  const rows: Array<[string, string, Partial<AwakeFacts>, string | undefined]> = [
    ['phone', 'working', { working: 2 }, 'working'],
    ['off', 'working', { working: 1 }, 'working'],
    ['off', 'phone', { phoneAt: NOW - MIN }, undefined],
    ['phone', 'phone', { phoneAt: NOW - MIN }, 'phone'],
    ['waiting', 'phone', { phoneAt: NOW - MIN }, 'phone'],
    ['phone', 'waiting ignored', { waiting: { count: 1, latestSince: NOW - 10 * MIN } }, undefined],
    ['waiting', 'waiting', { waiting: { count: 1, latestSince: NOW - 10 * MIN } }, 'waiting'],
    ['off', 'waiting off', { waiting: { count: 1, latestSince: NOW - 10 * MIN } }, undefined],
    ['phone', 'background', { background: 1 }, 'background'],
    ['off', 'background off', { background: 1 }, undefined],
    ['phone', 'none', {}, undefined],
  ]
  for (const [away, label, f, want] of rows) expect(awakeReason(awayOf(away), facts(f), NOW)?.reason, `${away}: ${label}`).toBe(want)
})

test('a reason ranks: working before phone before waiting before background; every reason has words', () => {
  const all = facts({ working: 1, phoneAt: NOW - MIN, waiting: { count: 1, latestSince: NOW - MIN }, background: 1 })
  expect(awakeReason('waiting', all, NOW)?.reason).toBe('working')
  expect(awakeReason('waiting', { ...all, working: 0 }, NOW)?.reason).toBe('phone')
  expect(awakeReason('waiting', { ...all, working: 0, phoneAt: undefined }, NOW)?.reason).toBe('waiting')
  expect(awakeReason('waiting', { ...all, working: 0, phoneAt: undefined, waiting: { count: 0 } }, NOW)?.reason).toBe('background')
  const ranks = Object.values(REASONS).map(r => r.rank)
  expect(new Set(ranks).size).toBe(ranks.length)
})

test('the limits: a phone holds up to 4 hours, a waiting question up to 2 hours, then nothing', () => {
  expect(awakeReason('phone', facts({ phoneAt: NOW - AWAKE_AWAY_MAX_MS + MIN }), NOW)?.reason).toBe('phone')
  expect(awakeReason('phone', facts({ phoneAt: NOW - AWAKE_AWAY_MAX_MS }), NOW)).toBeUndefined()
  expect(awakeReason('phone', facts({ phoneAt: NOW + MIN }), NOW)).toBeUndefined()
  expect(awakeReason('waiting', facts({ waiting: { count: 1, latestSince: NOW - AWAKE_WAIT_MAX_MS + MIN } }), NOW)?.until).toBe(NOW + MIN)
  expect(awakeReason('waiting', facts({ waiting: { count: 1, latestSince: NOW - AWAKE_WAIT_MAX_MS } }), NOW)).toBeUndefined()
  expect(AWAKE_WAIT_MAX_MS).toBe(2 * HOUR)
  expect(AWAKE_ABS_MAX_MS).toBe(8 * HOUR)
})

test('waiting sessions: a question that waits, from a live record, not older than 2 hours', () => {
  const r = (since: number, updatedAt = NOW - 5_000, kind: 'question' | 'permission' = 'question') => ({ updatedAt, ask: { kind, tool: 't', since } })
  expect(waitingFrom([r(NOW - 10 * MIN), r(NOW - 5 * MIN, NOW - 5_000, 'permission'), r(NOW - 3 * HOUR), r(NOW - MIN, NOW - 10 * MIN), { updatedAt: NOW } as never], NOW)).toEqual({ count: 2, latestSince: NOW - 5 * MIN })
  expect(waitingFrom([], NOW)).toEqual({ count: 0 })
})

test('the cap and the battery: a chain past 8 hours is capped, a gap makes a new chain, a low battery holds nothing', () => {
  const f = facts({ phoneAt: NOW - MIN })
  expect(wantOf(awakeNow('on', 'phone', f, undefined, NOW))).toBe(1)
  expect(wantOf(awakeNow('off', 'phone', f, undefined, NOW))).toBe(0)
  const old = { since: NOW - AWAKE_ABS_MAX_MS - MIN, last: NOW - 3 * MIN }
  expect(awakeNow('on', 'phone', f, old, NOW).capped).toBe(true)
  expect(wantOf(awakeNow('on', 'phone', f, old, NOW))).toBe(0)
  expect(awakeNow('on', 'phone', f, { since: NOW - 7 * HOUR, last: NOW - 3 * MIN }, NOW).capped).toBe(false)
  expect(awakeNow('on', 'phone', f, { since: NOW - 20 * HOUR, last: NOW - 3 * HOUR }, NOW).capped).toBe(false)
  const capped = chainCapped(old, NOW)
  expect(awakeNow('on', 'phone', f, capped, NOW + MIN).capped).toBe(true)
  expect(touchDue(capped, NOW + 7 * MIN)).toBe(false)
  expect(touchDue(capped, NOW + 8 * MIN)).toBe(true)
  expect(chainAfterStart({ since: NOW - HOUR, last: NOW - 8 * MIN }, NOW)).toEqual({ since: NOW - HOUR, last: NOW })
  expect(chainAfterStart({ since: NOW - 5 * HOUR, last: NOW - 2 * HOUR }, NOW)).toEqual({ since: NOW, last: NOW })
  const low = { at: NOW - MIN, battery: { hasBattery: true, onAc: false, percent: 19 } }
  expect(awakeNow('on', 'phone', { ...f, laptop: low }, undefined, NOW).lowBattery).toBe(true)
  expect(wantOf(awakeNow('on', 'phone', { ...f, laptop: low }, undefined, NOW))).toBe(0)
  expect(awakeNow('on', 'phone', { ...f, laptop: { ...low, battery: { ...low.battery, percent: 20 } } }, undefined, NOW).lowBattery).toBe(false)
  expect(awakeNow('on', 'phone', { ...f, laptop: { ...low, battery: { ...low.battery, onAc: true } } }, undefined, NOW).lowBattery).toBe(false)
  // An old reading never blocks a hold.
  expect(awakeNow('on', 'phone', { ...f, laptop: { ...low, at: NOW - HOUR } }, undefined, NOW).lowBattery).toBe(false)
  expect(parseChain({ since: 1, last: 2, capped: true })).toEqual({ since: 1, last: 2, capped: true })
  expect(parseChain('x')).toBeUndefined()
})

test('phones: joined and left are kept per session and client; the latest counts; old ones are dropped', () => {
  const a = phonesJoined(undefined, 's1', 'mobile:one', NOW - 10 * MIN)
  const b = phonesJoined(a, 's2', 'mobile:one', NOW)
  expect(latestPhone(b)).toBe(NOW)
  expect(latestPhone(phonesLeft(b, 's2', 'mobile:one'))).toBe(NOW - 10 * MIN)
  expect(latestPhone(phonesLeft(phonesLeft(b, 's2', 'mobile:one'), 's1', 'mobile:one'))).toBeUndefined()
  expect(Object.keys(phonesJoined(b, 's3', 'x', NOW + AWAKE_AWAY_MAX_MS))).toEqual(['s3:x'])
  expect(parsePhones('junk')).toEqual({})
  expect(latestPhone(undefined)).toBeUndefined()
})

test('the words say why, until when, and what stops the hold; the lid note is plain', () => {
  const t = (n: Date) => `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
  const phone = awakeNow('on', 'phone', facts({ phoneAt: NOW }), undefined, NOW)
  expect(whyLine(phone)).toBe(`Keeping the Mac awake: a phone is connected, until ${t(new Date(NOW + AWAKE_AWAY_MAX_MS))}`)
  const wait = awakeNow('on', 'waiting', facts({ waiting: { count: 1, latestSince: NOW - 30 * MIN } }), undefined, NOW)
  expect(whyLine(wait)).toBe(`Keeping the Mac awake: waiting for your answer, until ${t(new Date(NOW + 90 * MIN))}`)
  expect(whyLine(awakeNow('on', 'phone', facts({ working: 1 }), undefined, NOW))).toBe('Keeping the Mac awake: a session is working')
  expect(whyLine(awakeNow('on', 'phone', facts({ phoneAt: NOW, laptop: { at: NOW, battery: { hasBattery: true, onAc: false, percent: 5 } } }), undefined, NOW))).toBe('Not holding: battery low')
  expect(whyLine(awakeNow('on', 'phone', facts(), undefined, NOW))).toBeUndefined()
  expect(LID_NOTE).toBe('Closing the lid still sleeps the Mac (unless it is on power with a display).')
  setAwakeShown(phone)
  expect(awakeCardLines(s => s)).toHaveLength(2)
  expect(awakeCardLines(s => s)[1]).toBe(LID_NOTE)
  setAwakeShown(awakeNow('on', 'phone', facts(), undefined, NOW))
  expect(awakeCardLines(s => s)).toEqual([])
  setAwakeShown(undefined)
})

test('ask once: due only while the guard is off and nobody was asked; the typed words parse forgivingly', () => {
  expect(askDue('off', undefined)).toBe(true)
  expect(askDue('off', NOW)).toBe(false)
  expect(askDue('on', undefined)).toBe(false)
  expect(ASK_LINE).toBe('Keep the Mac awake while you are away? Reply /vaken-help run awake on')
  expect(parseAwakeArgs(' ON ')).toBe('on')
  expect(parseAwakeArgs('off')).toBe('off')
  expect(parseAwakeArgs('')).toBe('status')
  expect(parseAwakeArgs('maybe')).toBe('status')
})

test('every word of the guard has a Swedish line, and nothing else is in the table', () => {
  for (const s of AWAKE_STRINGS) expect(byEnglish('sv', 'awake')[s], s).toBeTruthy()
  for (const k of englishOf('awake')) expect(AWAKE_STRINGS, k).toContain(k)
})
