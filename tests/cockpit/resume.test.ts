import { expect } from 'claude-code/testing'
import { test } from './slow'

import { AFTER_RESET_MS, DEADLINE_MS, FALLBACK_MS, MAX_PER_DAY, MAX_REPLANS, dueVerdict, nextReset, wroteSince, parseWait, planWait, replanWait, statusText } from '../hooks/core/resume'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const HOUR = 3_600_000
const usage = (five?: string, week?: string) => ({ at: NOW, windows: [...(five === undefined ? [] : [{ label: '5-hour', percent: 100, resetsAt: five }]), ...(week === undefined ? [] : [{ label: 'Weekly', percent: 50, resetsAt: week }])] })

test('the next reset is the 5-hour window first, else the earliest ahead', () => {
  const in2 = new Date(NOW + 2 * HOUR).toISOString()
  const in30 = new Date(NOW + 30 * HOUR).toISOString()
  expect(nextReset(usage(in2, in30), NOW)).toBe(NOW + 2 * HOUR)
  expect(nextReset(usage(undefined, in30), NOW)).toBe(NOW + 30 * HOUR)
  expect(nextReset(usage(new Date(NOW - HOUR).toISOString()), NOW)).toBeUndefined()
  expect(nextReset(undefined, NOW)).toBeUndefined()
})

test('a wait is planned only in Remind or Resume, a little after the reset, or by a guess', () => {
  const in2 = new Date(NOW + 2 * HOUR).toISOString()
  expect(planWait('off', usage(in2), NOW)).toBeUndefined()
  expect(planWait('resume', usage(in2), NOW)).toEqual({ failedAt: NOW, dueAt: NOW + 2 * HOUR + AFTER_RESET_MS, mode: 'resume', fromReset: true })
  expect(planWait('remind', undefined, NOW)).toEqual({ failedAt: NOW, dueAt: NOW + FALLBACK_MS, mode: 'remind', fromReset: false })
  expect(parseWait({ dueAt: 1, failedAt: 0, mode: 'resume' })?.mode).toBe('resume')
  expect(parseWait('x')).toBeUndefined()
})

test('the stop conditions: not yet, too old, halted, you wrote, three a day', () => {
  const w = { failedAt: NOW, dueAt: NOW + HOUR, mode: 'resume' as const, fromReset: true }
  const ok = { now: NOW + HOUR + 1, halted: false, wroteSince: false, doneToday: 0 }
  expect(dueVerdict(w, ok)).toEqual({ act: true })
  expect(dueVerdict(w, { ...ok, now: NOW + 10 })).toEqual({ act: false, why: 'not yet' })
  expect(dueVerdict(w, { ...ok, now: NOW + DEADLINE_MS + 1 }).act).toBe(false)
  expect(dueVerdict(w, { ...ok, halted: true }).act).toBe(false)
  expect(dueVerdict(w, { ...ok, wroteSince: true }).act).toBe(false)
  expect(dueVerdict(w, { ...ok, doneToday: MAX_PER_DAY }).act).toBe(false)
  expect(dueVerdict({ ...w, mode: 'remind' }, { ...ok, doneToday: MAX_PER_DAY })).toEqual({ act: true })
})

test('the status says what waits', () => {
  expect(statusText('off', undefined, NOW, 0)).toMatch(/Nothing is waiting\. Turn it on/)
  expect(statusText('resume', { failedAt: NOW, dueAt: NOW + HOUR, mode: 'resume', fromReset: true }, NOW, 1)).toMatch(/sends "continue" at .* Resumes today: 1 of 3/)
})

test('at the reset a window that still reads full plans the wait again, a few times, then leaves it to you', () => {
  const w = { failedAt: NOW, dueAt: NOW + HOUR, mode: 'resume' as const, fromReset: true }
  const due = { now: NOW + HOUR + 1, halted: false, wroteSince: false, doneToday: 0 }
  expect(dueVerdict(w, { ...due, stillFull: true })).toEqual({ act: 'again' })
  expect(dueVerdict({ ...w, replans: MAX_REPLANS }, { ...due, stillFull: true })).toEqual({ act: false, why: 'The plan limit still reads full after the reset, so vaken left it to you.' })
  expect(dueVerdict(w, { ...due, stillFull: false })).toEqual({ act: true })
  expect(dueVerdict(w, { ...due, wroteSince: true, stillFull: true }).act).toBe(false)
  const in3 = new Date(NOW + 3 * HOUR).toISOString()
  expect(replanWait(w, usage(in3), NOW + HOUR)).toEqual({ ...w, dueAt: NOW + 3 * HOUR + AFTER_RESET_MS, fromReset: true, replans: 1 })
  expect(replanWait({ ...w, replans: 1 }, undefined, NOW + HOUR)).toEqual({ ...w, dueAt: NOW + HOUR + FALLBACK_MS, fromReset: false, replans: 2 })
})

test('a full weekly window waits for its own reset, not the 5-hour one', () => {
  const in2 = new Date(NOW + 2 * HOUR).toISOString()
  const in30 = new Date(NOW + 30 * HOUR).toISOString()
  const weekFull = { at: NOW, windows: [{ label: '5-hour', percent: 40, resetsAt: in2 }, { label: 'Weekly', percent: 100, resetsAt: in30 }] }
  expect(nextReset(weekFull, NOW)).toBe(NOW + 30 * HOUR)
  const bothFull = { at: NOW, windows: [{ label: '5-hour', percent: 100, resetsAt: in2 }, { label: 'Weekly', percent: 100, resetsAt: in30 }] }
  expect(nextReset(bothFull, NOW)).toBe(NOW + 30 * HOUR)
  expect(planWait('resume', weekFull, NOW)?.dueAt).toBe(NOW + 30 * HOUR + AFTER_RESET_MS)
})

test('a message typed after the stop counts as going on, even when the answer to it has ended', () => {
  expect(wroteSince({ lastEventAt: NOW + HOUR, state: 'idle', promptAt: NOW + 10 * 60_000 }, NOW)).toBe(true)
  expect(wroteSince({ lastEventAt: NOW + HOUR, state: 'working' }, NOW)).toBe(true)
  expect(wroteSince({ lastEventAt: NOW + HOUR, state: 'idle', promptAt: NOW - HOUR }, NOW)).toBe(false)
  expect(wroteSince({ lastEventAt: NOW + 1_000, state: 'idle', promptAt: NOW + 1_000 }, NOW)).toBe(false)
  expect(wroteSince(undefined, NOW)).toBe(false)
})
