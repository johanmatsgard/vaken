// Typeahead rows: quick actions and task sets after "/" or a word, open pull requests after "#", changed files after "@"; a burst of key presses reads once.
import { expect } from 'claude-code/testing'

import { TYPE_KEEP_MS, TYPE_ROWS_MAX, TYPE_STRINGS, changedPaths, forgetTypeahead, kindOf, openPrsHere, rowsFor, typeaheadRows } from '../hooks/core/typeahead'
import type { Saved } from '../hooks/core/typeahead'
import { OWN_KEY } from '../hooks/core/actions'
import { TEMPLATES_KEY } from '../hooks/core/orchestra'
import { PR_SHARED_KEY } from '../hooks/core/crewpr'
import type { Io } from '../hooks/core/io'
import { byEnglish } from '../hooks/i18n/table'
import { test } from './slow'

const NOW = Date.parse('2026-10-18T12:00:00Z')
const SV = byEnglish('sv')
const say = (s: string): string => s

const saved: Saved = {
  own: [
    { name: 'review', prompt: 'Review the diff for bugs and risks, ranked.' },
    { name: 'fix ci', prompt: 'Read the failing check and fix it.' },
  ],
  templates: ['release', 'refactor week'],
  prs: [{ number: 128, branch: 'fix-login' }, { number: 121, branch: 'docs' }, { number: 87, branch: '' }],
}
const files = ['src/app.ts', 'src/login/form.tsx', 'README.md', 'docs/app-notes.md']

test('the kind follows the engine triggers: / for saved, # for a number, @ for a file, a word from three letters', () => {
  expect(kindOf('/')).toBe('slash')
  expect(kindOf('/rev')).toBe('slash')
  expect(kindOf('/usr/lo')).toBeUndefined()
  expect(kindOf('#')).toBe('pr')
  expect(kindOf('#12')).toBe('pr')
  expect(kindOf('#abc')).toBeUndefined()
  expect(kindOf('@')).toBe('file')
  expect(kindOf('@src/a')).toBe('file')
  expect(kindOf('@app.log#L1')).toBeUndefined()
  expect(kindOf('re')).toBeUndefined()
  expect(kindOf('rev')).toBe('word')
  expect(kindOf('räkna')).toBe('word')
  expect(kindOf('rev,')).toBeUndefined()
})

test('"/" offers quick actions, then task sets; a word offers only quick actions; taking one writes the request or the command', () => {
  const all = rowsFor('/', 'slash', saved, [], say)
  expect(all.map(r => r.label)).toEqual(['review', 'fix ci', 'release', 'refactor week'])
  expect(all[0]).toEqual({ text: 'Review the diff for bugs and risks, ranked.', label: 'review', description: 'Your quick action: Review the diff for bugs and risks, ranked.' })
  expect(all[2]).toEqual({ text: '/vaken-tasks template apply release', label: 'release', description: 'Loads your saved task set' })
  expect(rowsFor('/re', 'slash', saved, [], say).map(r => r.label)).toEqual(['review', 'release', 'refactor week'])
  expect(rowsFor('/fix-c', 'slash', saved, [], say).map(r => r.label)).toEqual(['fix ci'])
  expect(rowsFor('rev', 'word', saved, [], say).map(r => r.label)).toEqual(['review'])
  expect(rowsFor('rel', 'word', saved, [], say)).toEqual([])
})

test('"#" offers the open pull requests by number, with the branch; a number already whole gets no row', () => {
  expect(rowsFor('#', 'pr', saved, [], say).map(r => r.label)).toEqual(['#128 · fix-login', '#121 · docs', '#87'])
  expect(rowsFor('#12', 'pr', saved, [], say)).toEqual([
    { text: '#128', label: '#128 · fix-login', description: 'Open pull request' },
    { text: '#121', label: '#121 · docs', description: 'Open pull request' },
  ])
  expect(rowsFor('#128', 'pr', saved, [], say)).toEqual([])
})

test('"@" offers changed files, the ones that start with what was typed first, at most five', () => {
  expect(rowsFor('@app', 'file', saved, files, say).map(r => r.text)).toEqual(['@src/app.ts', '@docs/app-notes.md'])
  expect(rowsFor('@form', 'file', saved, files, say)).toEqual([{ text: '@src/login/form.tsx', label: 'src/login/form.tsx', description: 'Changed, not committed' }])
  expect(rowsFor('@README.md', 'file', saved, files, say)).toEqual([])
  const many = Array.from({ length: 9 }, (_, n) => `f${n}.ts`)
  expect(rowsFor('@', 'file', saved, many, say).length).toBe(TYPE_ROWS_MAX)
})

test('changed files come from git status: no deleted file, no folder, no path with a space; a rename gives its new name', () => {
  const out = [' M src/app.ts', 'A  src/new.ts', ' D gone.ts', '?? notes/', '?? "with space.md"', 'R  old.ts -> renamed.ts', '?? todo.md'].join('\n')
  expect(changedPaths(out)).toEqual(['src/app.ts', 'src/new.ts', 'renamed.ts', 'todo.md'])
})

test('open pull requests are this repository\'s, open, fresh and each once, newest number first', () => {
  const view = (number: number, state = 'OPEN') => ({ number, state, isDraft: false, mergeable: 'MERGEABLE', url: '', checks: [] })
  const raw = {
    '/w/app/.git\nfix-login': { at: NOW - 60_000, branch: 'fix-login', view: view(128) },
    '/w/app/.git\ndocs': { at: NOW - 60_000, branch: 'docs', view: view(121) },
    '/w/app/.git\nold': { at: NOW - 60_000, branch: 'old', view: view(99, 'MERGED') },
    '/w/app/.git\nstale': { at: NOW - 4 * 3_600_000, branch: 'stale', view: view(90) },
    '/w/other/.git\nx': { at: NOW - 60_000, branch: 'x', view: view(300) },
    broken: { at: 'no' },
  }
  expect(openPrsHere(raw, '/w/app/src', NOW)).toEqual([{ number: 128, branch: 'fix-login' }, { number: 121, branch: 'docs' }])
  expect(openPrsHere(undefined, '/w/app', NOW)).toEqual([])
})

test('every text beside a row has Swedish', () => {
  for (const w of TYPE_STRINGS) expect(SV[w] ?? '', w).not.toBe('')
})

// The prompt path is hot: every key press asks. A burst reads the store once and runs git once, then nothing until TYPE_KEEP_MS has passed.
test('a burst of key presses costs one read of each saved thing and one git status, then none until the keep time has passed', async () => {
  forgetTypeahead()
  const count = { get: 0, run: 0 }
  const store: Record<string, unknown> = {
    [OWN_KEY]: saved.own,
    [TEMPLATES_KEY]: { release: { tasks: ['a'], choices: {} } },
    [PR_SHARED_KEY]: {},
  }
  const io = {
    get: async (key: string) => {
      count.get += 1
      return store[key]
    },
    run: async () => {
      count.run += 1
      return { exitCode: 0, stdout: ' M src/app.ts\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
    },
  } as unknown as Io
  const sayOf = async () => say
  let rows = 0
  for (let n = 0; n < 40; n += 1) {
    const token = ['/', '/r', 'rev', '@', '@sr', '#', 'plain', 'x'][n % 8] as string
    rows += (await typeaheadRows(io, token, '/w/app', NOW + n * 200, sayOf)).length
  }
  expect(rows).toBeGreaterThan(0)
  expect(count.get).toBe(3)
  expect(count.run).toBe(1)
  // A word that cannot have rows reads nothing at all
  forgetTypeahead()
  await typeaheadRows(io, 'x', '/w/app', NOW, sayOf)
  await typeaheadRows(io, 'ab', '/w/app', NOW, sayOf)
  expect(count.get).toBe(3)
  // After the keep time, one more read
  await typeaheadRows(io, '/', '/w/app', NOW, sayOf)
  await typeaheadRows(io, '/', '/w/app', NOW + TYPE_KEEP_MS + 1, sayOf)
  expect(count.get).toBe(9)
  forgetTypeahead()
})
