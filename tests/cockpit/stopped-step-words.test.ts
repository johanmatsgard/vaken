// The stopped step and the typed commands: a stopped step never runs by itself.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { EXPLAIN } from '../hooks/core/explain'
import { ALLOW_SET_WHAT, ALLOW_USED_WHAT, HALT_DENY_WHAT, HALT_WHAT, HELD_WHAT } from '../hooks/core/guard'
import { HELD_WHAT as WORLD_HELD_WHAT } from '../hooks/core/guardworld'
import { HELD_WHAT as MIGRATION_HELD_WHAT } from '../hooks/core/guardback'
import { HERE_FALLBACK, STEER_STOP_WHAT, buildInbox } from '../hooks/core/inbox'
import type { InboxFacts, InboxItem } from '../hooks/core/inbox'
import { setLang, tr } from '../hooks/core/lang'
import { SS_T_CHECK_NEXT_FIX } from '../hooks/core/shipstepwords'
import { DO_NEXT } from '../hooks/core/dowords'
import { ALLOWED_SAID } from '../hooks/features/home/actions'
import { HOLD_NEXT, HOLD_WHY, HOLD_WHY_NOW, HERE_FACT, STOPPED_OLD, itemRow, needsGroups } from '../hooks/features/home/needs'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const NOW = Date.parse('2026-10-12T09:00:00Z')
const id = (s: string): string => s
const facts = (over: Partial<InboxFacts>): InboxFacts => ({
  now: NOW,
  sessions: [
    { sid: 'me', name: 'Docs', here: true },
    { sid: 'web', name: 'Web fixes', here: false },
  ],
  ledger: [],
  allowed: [],
  asks: [],
  debts: [],
  halts: [],
  seen: {},
  ...over,
})
const held = (session: string, ago: number, detail = 'This deletes build.') => ({ at: NOW - ago, session, what: 'Held a risky command', detail, how: 'auto', did: true })
const rowOf = (it: InboxItem) => itemRow(it, 0, NOW, id)

test('this session\'s open stopped step says it will not run unless allowed, and names Allow once', () => {
  const [it] = buildInbox(facts({ ledger: [held('me', 4 * MIN)] as never }))
  const row = rowOf(it as InboxItem)
  // This session's row carries no session name
  expect(row.title).toBe('Stopped a risky command')
  expect(row.right).toBe('4 min ago')
  expect(row.what.why).toBe('Stopped 4 min ago. It will not run unless you allow it.')
  expect(row.what.next).toBe('Press Allow once, then tell Claude to try again. Allow once lets this one step run if Claude tries it again within 30 minutes.')
  expect(row.what.facts).toEqual(['Session: Docs (this one).'])
  expect(row.what.means).toBe('Claude tried a risky step. Vaken stopped it before it ran. Nothing changed, and the session waits for you. This deletes build.')
  expect(row.inside?.label).toBe('Allow once')
  const all = [row.title, row.right ?? '', row.what.means, ...(row.what.facts ?? []), row.what.why ?? '', row.what.next ?? '']
  expect(all.filter(l => /\bheld\b|This session/i.test(l))).toEqual([])
})

test('another session\'s stopped step and pause say to open that session, where the button is', () => {
  const items = buildInbox(facts({ ledger: [held('web', 2 * MIN)] as never, halts: [{ sid: 'web', at: NOW - 7 * MIN }] }))
  const groups = needsGroups(items, NOW, id)
  const [hold] = groups[0]?.rows ?? []
  expect(hold?.title).toBe('Stopped a risky command')
  expect(hold?.session).toEqual({ name: 'Web fixes' })
  expect(hold?.what.why).toBe('Stopped 2 min ago. It will not run unless you allow it.')
  expect(hold?.what.next).toBe('Open that session; its pane has Allow once.')
  expect(hold?.inside).toEqual({ label: 'Dismiss', action: { kind: 'dismissHold', sid: 'web' } })
  const [halt] = groups[1]?.rows ?? []
  expect(halt?.what.next).toBe('Open that session and press Resume.')
})

test('a stale stopped step keeps its own title and its age; its detail says Allow once has timed out, and the detail says try again in Claude, then allow', () => {
  const [it] = buildInbox(facts({ ledger: [held('me', 40 * MIN)] as never }))
  const row = rowOf(it as InboxItem)
  expect(row.title).toBe('Stopped a risky command')
  expect(row.right).toBe('40 min ago')
  expect(row.what.why).toBe(`Stopped 40 min ago. ${STOPPED_OLD}.`)
  expect(row.what.next).toBe('Try the step again in Claude. When it is stopped again, allow it then.')
  expect(row.inside).toEqual({ label: 'Dismiss', action: { kind: 'dismissHold', sid: 'me' } })
})

test('no explanation of a kind that has a button starts with "type /", and each names its button', () => {
  const withButton: [string, string][] = [
    ...Object.values(HELD_WHAT).map((w): [string, string] => [w, 'Allow once']),
    ...Object.values(WORLD_HELD_WHAT).map((w): [string, string] => [w, 'Allow once']),
    [MIGRATION_HELD_WHAT, 'Allow once'],
    [ALLOW_USED_WHAT, 'Allow once'],
    [HALT_WHAT, 'Resume'],
    [HALT_DENY_WHAT, 'Resume'],
    [STEER_STOP_WHAT, 'Resume'],
  ]
  for (const [what, button] of withButton) {
    const x = EXPLAIN[what]
    expect(x, what).toBeDefined()
    if (button === 'Allow once' && what !== ALLOW_USED_WHAT) expect(/30 min/.test(x?.next ?? '') && /\/vaken-guard allow once (there|in that session)/.test(x?.next ?? ''), what).toBe(true)
    expect(/^type \//i.test(x?.next ?? ''), what).toBe(false)
    expect(x?.next.includes(button), what).toBe(true)
  }
  expect(EXPLAIN[ALLOW_SET_WHAT]?.next.startsWith('Tell Claude to try the step again.')).toBe(true)
  expect(/^type \//i.test(HOLD_NEXT)).toBe(false)
})

test('the press, the failed-check words and the run-commands line name the button; every new line has Swedish', () => {
  expect(ALLOWED_SAID).toBe('Allowed once. Tell Claude to try the step again.')
  expect(SS_T_CHECK_NEXT_FIX).toBe('A check failed. Open the pull request in Needs you, or type /vaken-ship fix yes.')
  expect(DO_NEXT.startsWith('Press a row')).toBe(true)
  const lines = [ALLOWED_SAID, SS_T_CHECK_NEXT_FIX, DO_NEXT, HOLD_NEXT, HOLD_WHY, HOLD_WHY_NOW, HERE_FACT, 'Open that session; its pane has Allow once.', 'Open that session and press Resume.', 'Pull request {n}: {m} check failed. Open it in the pane.', 'Pull request {n}: {m} checks failed. Open it in the pane.']
  expect(lines.filter(l => (SV[l] ?? '') === '')).toEqual([])
  for (const x of Object.values(EXPLAIN)) for (const l of [x.means, x.why, x.next]) expect(l.includes(' at rest'), l).toBe(false)
})

test('a group of stops counts from the last one, the same clock as the 30 minutes; under a minute it says just now', () => {
  const [it] = buildInbox(facts({ ledger: [held('me', 20 * MIN), held('me', 5 * MIN)] as never }))
  const row = rowOf(it as InboxItem)
  expect(row.what.why).toBe('Stopped 5 min ago. It will not run unless you allow it.')
  expect(row.right).toBe('5 min ago')
  const [now] = buildInbox(facts({ ledger: [held('me', 20_000)] as never }))
  const fresh = rowOf(now as InboxItem)
  expect(fresh.what.why).toBe('Stopped just now. It will not run unless you allow it.')
  expect(fresh.right).toBe('just now')
})

test('this session with no record yet: its row has no session name, in the pane\'s language, and no session line', () => {
  const [it] = buildInbox(facts({ sessions: [{ sid: 'me', name: HERE_FALLBACK, here: true }], ledger: [held('me', 4 * MIN)] as never }))
  const row = rowOf(it as InboxItem)
  expect(row.title).toBe('Stopped a risky command')
  expect(row.what.facts).toEqual([])
  setLang('sv')
  try {
    expect(itemRow(it as InboxItem, 0, NOW, tr).title).toBe('Stoppade ett riskabelt kommando')
  } finally {
    setLang('en')
  }
})

test('on a Swedish pane the stored English step is never mixed into a Swedish sentence: it stands as a quote on its own line', () => {
  const [it] = buildInbox(facts({ ledger: [held('me', 4 * MIN, 'This would delete the archive of a made-up project')] as never }))
  setLang('sv')
  try {
    const what = itemRow(it as InboxItem, 0, NOW, tr).what
    expect(what.means).not.toMatch(/archive/)
    expect(what.facts?.[0]).toBe('“This would delete the archive of a made-up project.”')
  } finally {
    setLang('en')
  }
  expect(rowOf(it as InboxItem).what.means).toMatch(/This would delete the archive of a made-up project\.$/)
})
