// Rows tested alone with sample facts.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { PR_STALE_ASK_MS, prViewArgvFor, staleRunning } from '../hooks/core/crewpr'
import { inProject, lsofCwdArgv, parseCwds } from '../hooks/core/eyesdev'
import { STEER_LINES, newRun, rerunOf, runSummary, tasksText, withTask } from '../hooks/core/orchestra'
import type { Run } from '../hooks/core/orchestra'
import { parseSteer } from '../hooks/features/orchestra'
import { shipCardText } from '../hooks/core/shipcard'

const NOW = 1_800_000_000_000

test('U45: a run runs again from its own tasks: every task waits, the roles and the order are kept, the folder copies are not', () => {
  let run: Run = newRun(['Fix the header (builder, strong)', 'Check the header (reviewer, after 1)'], NOW)
  run = withTask(run, 1, { state: 'done', path: '/w/wt1', branch: 'task-1', usd: 0.4, check: 'passed' })
  run = { ...run, status: 'done' }
  const again = rerunOf(run, NOW + 1000)
  expect(again.status).toBe('setup')
  expect(again.id).not.toBe(run.id)
  expect(again.tasks.map(t => [t.text, t.role, t.model, t.after, t.state, t.path])).toEqual([
    ['Fix the header', 'builder', 'strong', undefined, 'waiting', undefined],
    ['Check the header', 'reviewer', 'auto', 1, 'waiting', undefined],
  ])
  expect(parseSteer('again')).toEqual({ kind: 'again' })
})

test('U96: a run that paused for its cost says so with the limit; the person\'s own pause keeps the old word', () => {
  const run: Run = { ...newRun(['One', 'Two'], NOW), status: 'paused', costPause: 25 }
  expect(runSummary(run)).toMatch(/^Paused: it cost more than \$25\./)
  expect(runSummary({ ...run, costPause: undefined })).toMatch(/^Paused: /)
  expect(runSummary({ ...run, costPause: undefined })).not.toMatch(/cost more/)
})

test('U57: the Steer lines give a sentence to every verb the command knows', () => {
  const text = tasksText(newRun(['One'], NOW), undefined, NOW, () => '1 min')
  for (const verb of ['add', 'set N', 'remove N', 'start', 'pause', 'go', 'stop', 'retry N', 'again', 'keep N', 'throw N', 'say N', 'at auto', 'check', 'limit', 'reviewer', 'afterlimit', 'name', 'template', 'clear']) expect(text).toContain(`/vaken-tasks ${verb}`)
  expect(STEER_LINES.every(l => l.includes(': '))).toBe(true)
  expect(text).toContain('deletes the work and the branch')
})

test('T25: a dev server is the project\'s only when it runs from the project\'s folder or one inside it', () => {
  expect(lsofCwdArgv([11, 22])).toEqual(['lsof', '-nP', '-a', '-p', '11,22', '-d', 'cwd', '-Fpn'])
  const got = parseCwds(0, 'p11\nfcwd\nn/work/app/web\np22\nfcwd\nn/work/other\n')
  expect([...got]).toEqual([[11, '/work/app/web'], [22, '/work/other']])
  expect(inProject('/work/app/web', '/work/app')).toBe(true)
  expect(inProject('/work/app', '/work/app/')).toBe(true)
  expect(inProject('/work/application', '/work/app')).toBe(false)
  expect(inProject('/private/var/x/app', '/var/x/app')).toBe(true)
  expect(inProject('/work/other', '/work/app')).toBe(false)
})

test('T35: only a row that says running and was read more than 5 minutes ago is asked about again, another branch of this repository, oldest first', () => {
  const view = (running: boolean) => ({ number: 1, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: 'u', merge: 'CLEAN', review: '', checks: [{ name: 'ci', state: running ? 'IN_PROGRESS' : 'SUCCESS', conclusion: running ? '' : 'SUCCESS' }] })
  const raw = {
    'r\nown': { at: NOW - 20 * 60_000, view: view(true) },
    'r\nold': { at: NOW - 30 * 60_000, view: view(true) },
    'r\nnew': { at: NOW - 10 * 60_000, view: view(true) },
    'r\nfresh': { at: NOW - 60_000, view: view(true) },
    'r\ndone': { at: NOW - 30 * 60_000, view: view(false) },
    'other\nx': { at: NOW - 30 * 60_000, view: view(true) },
  }
  const got = staleRunning(raw, 'r', 'own', NOW, 5)
  expect(got.filter(b => b !== 'own')).toEqual(got)
  expect(got).not.toContain('fresh')
  expect(got).not.toContain('done')
  expect(got).not.toContain('x')
  expect(PR_STALE_ASK_MS).toBe(5 * 60_000)
  expect(prViewArgvFor('feat-x').slice(0, 3)).toEqual(['gh', 'pr', 'view'])
  expect(prViewArgvFor('--web').slice(-2)).toEqual(['--', '--web'])
})

test('U56: the Ship line of the text twin has no stray full stop', () => {
  expect(shipCardText({ ledger: [], now: NOW })[0]).toBe('Ship: Nothing to ship yet · /vaken-ship')
})
