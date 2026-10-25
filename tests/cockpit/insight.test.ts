import { expect } from 'claude-code/testing'
import { test } from './slow'

import { addOutcome, addWait, areaOf, auditFile, auditText, emptyWaits, fitText, outcomesText, tidyKeys, tidyText, parseAudit, parseNumstat, parseWaits, storyText, toAudit, waitsText, withAudit } from '../hooks/core/insight'

const NOW = new Date(2026, 9, 10, 14, 0).getTime()
const HOUR = 3_600_000

test('audit: rows keep title, detail and how; the list is capped; the export has every line', () => {
  let rows = withAudit([], toAudit({ at: NOW, session: 'abcdefghijkl', what: 'Held a risky command', detail: 'Force-push', how: 'auto', did: true }))
  expect(rows[0].session).toBe('abcdefgh')
  for (let n = 0; n < 600; n += 1) rows = withAudit(rows, { at: NOW - n, what: `x${n}` })
  expect(rows).toHaveLength(500)
  expect(parseAudit('x')).toEqual([])
  expect(auditText([], 5)).toMatch(/empty/)
  const text = auditText(rows, 3)
  expect(text.split('\n').filter(l => l.startsWith('  '))).toHaveLength(3)
  expect(auditFile(rows.slice(0, 2))).toMatch(/^# Vaken audit/)
})

test('waits: short and day-long waits are not counted; the text says where the time went', () => {
  let w = emptyWaits(0)
  w = addWait(w, 'question', 2_000)
  w = addWait(w, 'question', 3 * 60_000)
  w = addWait(w, 'permission', 60_000)
  w = addWait(w, 'after', 30 * 60_000)
  w = addWait(w, 'after', 30 * HOUR)
  // a night away is a break, not a wait: 14 h after Claude finished is not counted
  w = addWait(w, 'after', 14 * HOUR)
  w = addWait(w, 'question', 3 * HOUR)
  expect(w.question.n).toBe(1)
  expect(w.after.n).toBe(1)
  expect(w.longest).toBe(30 * 60_000)
  const text = waitsText(w)
  expect(text).toMatch(/waited for you 3 times, 34 min in all/)
  expect(text).toMatch(/questions: 1 time, 3 min/)
  expect(waitsText(emptyWaits(0))).toMatch(/has not waited/)
  expect(parseWaits({ day: 0 }, NOW).question.n).toBe(0)
})

test('the planner says fits, fits but risky, or does not fit with the reset time', () => {
  const reset = (hours: number): string => new Date(NOW + hours * HOUR).toISOString()
  const usage = { at: NOW, windows: [{ label: '5-hour', percent: 30, resetsAt: reset(3) }, { label: 'Weekly', percent: 90, resetsAt: reset(40) }] }
  const text = fitText(usage, 20, NOW)
  expect(text).toMatch(/5-hour: 30% used, 70% left\. A 20% job fits\./)
  expect(text).toMatch(/Weekly: 90% used, 10% left\. A 20% job does not fit\. It resets at/)
  expect(fitText(undefined, 20, NOW)).toBe('The plan limits are not known yet. Type /vaken-usage to read them now, then /vaken-usage fit again.')
  expect(fitText(usage, 0, NOW)).toMatch(/from 1 to 100/)
  // an almost full window is not called full
  expect(fitText({ at: NOW, windows: [{ label: '5-hour', percent: 99.6, resetsAt: reset(3) }] }, 1, NOW)).toMatch(/5-hour: 99% used, 1% left\. A 1% job does not fit\./)
})

test('the story groups what you would see first and starts with why', () => {
  const stats = parseNumstat('12\t3\tsrc/Card.tsx\n40\t0\tsrc/logic/rule.ts\n5\t5\ttests/rule.test.ts\n1\t1\tpackage.json\n-\t-\tlogo.png')
  expect(stats).toHaveLength(5)
  expect(areaOf('src/Card.tsx')).toBe('screen')
  expect(areaOf('tests/rule.test.ts')).toBe('tests')
  expect(areaOf('package.json')).toBe('config')
  expect(areaOf('docs/NOTES.md')).toBe('docs')
  const story = storyText('Make the card calmer', stats)
  expect(story.split('\n')[0]).toBe('Why: Make the card calmer')
  expect(story.indexOf('What you would see on screen')).toBeLessThan(story.indexOf('How it works inside'))
  expect(storyText(undefined, stats)).toMatch(/no goal was set/)
  expect(storyText('x', [])).toMatch(/No uncommitted change/)
})

test('outcomes: the average cost, today and in all', () => {
  let list = addOutcome([], { at: NOW - 2 * HOUR, kind: 'done', usd: 1.2, session: 'a' })
  list = addOutcome(list, { at: NOW - 30 * HOUR, kind: 'merged', usd: 3, session: 'a' })
  const text = outcomesText(list, NOW)
  expect(text).toMatch(/Today: 1 outcome, about \$1\.20 each/)
  expect(text).toMatch(/All kept: 2, about \$2\.10 each/)
  expect(outcomesText([], NOW)).toMatch(/No finished work/)
})

test('tidy finds the per-session notes of sessions that have gone, and nothing else', () => {
  const a = '11111111-2222-3333-4444-555555555555'
  const b = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  const keys = [`cockpit:proof:${a}`, `cockpit:proof:${b}`, `cockpit:guard:commands:${a}`, 'cockpit:ledger:compact', 'cockpit:audit', 'cockpit:setting:detail', `cockpit:session:${a}`, `cockpit:setting:x:${a}`]
  expect(tidyKeys(keys, [b])).toEqual([`cockpit:proof:${a}`, `cockpit:guard:commands:${a}`, `cockpit:session:${a}`])
  expect(tidyKeys(keys, [a, b])).toEqual([])
  expect(tidyText([], false)).toMatch(/Nothing to tidy/)
  expect(tidyText([`cockpit:proof:${a}`], false)).toBe('1 leftover note from 1 closed session. Safe to remove. Say /vaken-help run tidy yes to remove them.')
  const many = [`cockpit:proof:${a}`, `cockpit:proof2:${a}`, `cockpit:cost:s:${a}`, `cockpit:proof:${b}`]
  expect(tidyText(many, false)).toBe('4 leftover notes from 2 closed sessions. Safe to remove. Say /vaken-help run tidy yes to remove them.')
  expect(tidyText(many, false)).not.toMatch(/proof|cost|vaken:/)
  expect(tidyText(many, true)).toBe('Removed 4 leftover notes from 2 closed sessions.')
})
