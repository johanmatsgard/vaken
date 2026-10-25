// The facts of the Other sessions card: the one fact a row shows, what a session got done, and the group a row sits in.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { emptyState, recordEdit, recordReceipts } from '../hooks/core/proof'
import { COST_FACT_USD, QUIET_DONE_MS, doneFacts, doneLine, groupOfRow, groupRows, isLongQuiet, rowFact } from '../hooks/core/sessionfacts'
import type { FactRow } from '../hooks/core/sessionfacts'
import { setLang } from '../hooks/core/lang'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000

const row = (over: Partial<FactRow> = {}): FactRow => ({ kind: 'working', reason: '', sinceMs: 2 * MIN, cwd: '/work/other', ...over })

test('one fact per row, in order: needs you, context from 80%, same folder, cost over $2, then what got done when quiet long', () => {
  const all = row({ kind: 'needs', reason: 'asks you a question', contextPercent: 92, costUsd: 4.1, cwd: '/work/app' })
  expect(rowFact(all, '/work/app')).toEqual({ what: 'needs', text: 'asks you a question' })
  expect(rowFact({ ...all, kind: 'working' }, '/work/app')).toEqual({ what: 'context', text: 'context 92%' })
  // From 80% full, the same rule as the status line
  expect(rowFact({ ...all, kind: 'working', contextPercent: 80 }, '/work/app')).toEqual({ what: 'context', text: 'context 80%' })
  expect(rowFact({ ...all, kind: 'working', contextPercent: 79.4 }, '/work/app')).toEqual({ what: 'folder', text: 'same folder as you' })
  expect(rowFact({ ...all, kind: 'working', contextPercent: 40 }, '/work/elsewhere')).toEqual({ what: 'cost', text: '$4.10' })
  expect(rowFact(row({ costUsd: COST_FACT_USD }), '/work/app')).toBeUndefined()
  expect(rowFact(row({ cwd: '/work/app/' }), '/work/app')?.what).toBe('folder')
  expect(rowFact(row({ cwd: '/work/app' }), undefined)).toBeUndefined()
})

test('what got done shows only for a session quiet long, and only when there is something', () => {
  const done = { files: 12, tests: 'passed' as const, pr: 'open' as const }
  expect(rowFact(row({ kind: 'idle', done }), '/work/app')).toEqual({ what: 'done', text: '12 files changed · tests passed · PR opened' })
  expect(rowFact(row({ kind: 'waiting', sinceMs: QUIET_DONE_MS, done }), '/work/app')?.what).toBe('done')
  expect(rowFact(row({ kind: 'waiting', sinceMs: QUIET_DONE_MS - 1, done }), '/work/app')).toBeUndefined()
  expect(rowFact(row({ kind: 'working', done }), '/work/app')).toBeUndefined()
  expect(rowFact(row({ kind: 'idle', done: { files: 0 } }), '/work/app')).toBeUndefined()
  expect(isLongQuiet({ kind: 'idle', sinceMs: 0 })).toBe(true)
})

test('the done line in words, one file and many, a failed run and a merged pull request', () => {
  expect(doneLine(undefined)).toBeUndefined()
  expect(doneLine({ files: 1 })).toBe('1 file changed')
  expect(doneLine({ files: 3, tests: 'failed' })).toBe('3 files changed · tests failed')
  expect(doneLine({ files: 0, pr: 'merged' })).toBe('PR merged')
  setLang('sv')
  try {
    expect(doneLine({ files: 2, tests: 'passed' })).toBe('2 filer ändrade · testerna gick igenom')
  } finally {
    setLang('en')
  }
})

test('the facts come from the proof counts and the kept pull request; nothing done gives none', () => {
  expect(doneFacts(emptyState(), undefined)).toBeUndefined()
  let s = recordEdit(emptyState(), '/w/a.ts')
  s = recordEdit(s, '/w/b.ts')
  s = recordEdit(s, '/w/a.ts')
  expect(doneFacts(s, undefined)).toEqual({ files: 2 })
  s = recordReceipts(s, [{ kind: 'tests', ok: true, exit: 0 }], NOW)
  expect(doneFacts(s, { view: { number: 7, state: 'OPEN' } })).toEqual({ files: 2, tests: 'passed', testsAt: NOW, pr: 'open' })
  // An edit after the test run makes the run stale: no test word then.
  expect(doneFacts(recordEdit(s, '/w/c.ts'), null)).toEqual({ files: 3 })
  expect(doneFacts(s, undefined, { files: 1, pr: 'merged' })?.pr).toBe('merged')
  expect(doneFacts(s, null, { files: 1, pr: 'merged' })?.pr).toBeUndefined()
  expect(doneFacts(recordReceipts(s, [{ kind: 'tests', ok: false, exit: 1 }], NOW + MIN), undefined)?.tests).toBe('failed')
})

test('a long list is grouped by the app sidebar group, else the repository: a worktree counts as its repository', () => {
  expect(groupOfRow('Vaken work', '/work/app')).toBe('Vaken work')
  expect(groupOfRow(undefined, '/srv/code/app')).toBe('app')
  expect(groupOfRow(undefined, '/srv/code/app/.claude/worktrees/agent-1')).toBe('app')
  expect(groupOfRow(undefined, '/srv/code/app/.worktrees/fix')).toBe('app')
  expect(groupOfRow(undefined, '')).toBe('No folder')
  const rows = [{ n: 1, g: 'a' }, { n: 2, g: 'b' }, { n: 3, g: 'a' }, { n: 4, g: 'c' }]
  expect(groupRows(rows, r => r.g)).toEqual([
    { head: 'a', rows: [rows[0], rows[2]] },
    { head: 'b', rows: [rows[1]] },
    { head: 'c', rows: [rows[3]] },
  ])
})

test('groups follow their best row: a group with a Your-turn row is above a group of only working rows, whatever was seen first', () => {
  const rows = [{ n: 1, g: 'a', yours: false }, { n: 2, g: 'b', yours: true }, { n: 3, g: 'a', yours: false }, { n: 4, g: 'c', yours: true }]
  expect(groupRows(rows, r => r.g, r => (r.yours ? 0 : 1)).map(g => g.head)).toEqual(['b', 'c', 'a'])
  expect(groupRows(rows, r => r.g).map(g => g.head)).toEqual(['a', 'b', 'c'])
})
