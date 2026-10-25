// Where was I, Ship, Pull requests and Preview: what waits is counted and loud, long lists fold, the verdict reads as plain rows, a merged pull request and the last picture are calm lines that go after a day.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { backLoud, backShort, backView } from '../hooks/core/backcard'
import type { BackFacts } from '../hooks/core/backcard'
import { backHead } from '../hooks/core/headline'
import { errorSnippet } from '../hooks/core/eyesdev'
import { parsePrView } from '../hooks/core/crewpr'
import { plainVerdict, prsFacts } from '../hooks/core/prcard'
import { previewView } from '../hooks/core/previewcard'
import { shipShort } from '../hooks/core/shipcard'
import { RECENT_SHOW_MS } from '../hooks/core/time'
import { cardLoudness } from '../hooks/features/home/logic'
import type { LoudFacts } from '../hooks/features/home/logic'

const MIN = 60_000
const HOUR = 60 * MIN
const NOW = Date.parse('2026-10-10T10:00:00Z')
const id = (s: string): string => s
const facts = (over: Partial<BackFacts> = {}): BackFacts => ({ now: NOW, open: [], more: 0, ...over })

test('after a break the short line counts what waits; a failed step is loud, yesterday\'s open ends are the normal dot', () => {
  const failed = facts({ gapMs: 2 * HOUR, welcome: { end: 'failed', edits: 0 } })
  expect(backShort(failed, id)).toBe('Back after 2 h · 1 waiting')
  expect(backLoud(failed)).toBe('waits')
  expect(backHead(0, id, 1)).toBe('1 waiting')
  const done = facts({ gapMs: 2 * HOUR, welcome: { end: 'done', edits: 3 } })
  expect(backLoud(done)).toBe('news')
  const open = facts({ open: [{ project: 'app', failed: ['tests'], held: 0, tasks: 0, midTurn: 0 }] })
  expect(backLoud(open)).toBe('open')
  const base = { limits: [], here: false, others: 0, didToday: 0, proof: 'none', agents: { any: false, stuck: false }, computer: { gaugeOn: false, full: false }, skillsUsed: false } as LoudFacts
  expect(cardLoudness({ ...base, back: 'waits' }, NOW).back).toBe('warn')
  expect(cardLoudness({ ...base, back: 'open' }, NOW).back).toBe('normal')
})

test('no goal is no row; the goal and open ends wrap whole; a long group folds behind Show N more', () => {
  const v = backView(facts({ gapMs: 2 * HOUR, welcome: { end: 'failed', edits: 0, promises: ['a', 'b', 'c', 'd'] } }), id)
  expect(v.groups.flatMap(g => g.rows).some(r => r.key === 'was')).toBe(false)
  expect(v.groups[0]?.fold).toEqual({ id: 'since', shown: 4, more: 1 })
  const goal = 'Make the login page keep the typed address when the password is wrong, and show the reason under the field'
  const g = backView(facts({ goal }), id)
  expect(g.groups[0]?.rows[0]).toMatchObject({ title: goal, wrap: true })
})

test('the verdict as plain rows: no headings, no bullets, nothing the rows below already say', () => {
  const lines = ['Ship it: not yet.', 'What blocks it:', '  - tests failed. Run it again after the last edit.', '  - Your definition of done is not met.', 'The evidence:', '  - tests: failed', '  - Confidence 25 of 100 (made only of evidence)']
  // No "Ship it" line, no "tests: failed" repeat, no score; a pull request's row keeps the head
  expect(plainVerdict(lines, ['Tests'])).toEqual(['Your definition of done is not met.'])
  expect(plainVerdict(lines, ['Tests'], true)).toEqual(['Ship it: not yet.', 'Your definition of done is not met.'])
  expect(shipShort('ready', 0, id, true)).toBe('Ready here · PR not checked')
  expect(shipShort('ready', 0, id)).toBe('Ready')
})

test('a merged pull request is a calm line for a day; the error page names its error in whole words; the last picture is a row that goes after a day', () => {
  const merged = parsePrView({ number: 12, state: 'MERGED', isDraft: false, mergeable: 'UNKNOWN', url: 'https://example.test/pull/12', statusCheckRollup: [] })
  const at = (ms: number) => prsFacts({ '/work/app/.git\nfeat-x': { at: NOW - ms, branch: 'feat-x', view: merged } }, { id: 'me', branch: 'feat-x' }, [{ id: 'me', name: 'This session', cwd: '/work/app', branch: 'feat-x' }], NOW, true)
  expect(at(2 * HOUR).merged?.map(m => m.number)).toEqual([12])
  expect(at(RECENT_SHOW_MS + MIN).merged).toBeUndefined()
  expect(errorSnippet('<html><h1>Internal Server Error</h1>TypeError: Cannot read properties of undefined</html>')).toBe('TypeError: Cannot read properties of undefined')
  expect(errorSnippet('<pre>Internal Server Error</pre>')).toBe('Internal Server Error')
  expect(errorSnippet(`RangeError: ${'word '.repeat(30)}`).endsWith('…')).toBe(true)
  const pic = (ms: number) => previewView({ edits: 0, changed: false, auto: false, picture: { width: 390, path: '/p/shot.png', at: NOW - ms }, now: NOW }, id).groups.flatMap(g => g.rows).find(r => r.key === 'picture')
  expect(pic(MIN)).toMatchObject({ title: 'Picture · Phone size · 1 min ago', press: { do: 'see', path: '/p/shot.png', width: 390 } })
  expect(pic(RECENT_SHOW_MS + MIN)).toBeUndefined()
})
