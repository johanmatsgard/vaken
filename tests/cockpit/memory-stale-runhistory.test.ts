// A stale earlier reading does not make memory "tight", run history hides secrets, an old whole-sentence goal is rebuilt on read.
import { expect } from 'claude-code/testing'

import { LAPTOP_EVERY_MS, laptopWords, memoryTight } from '../hooks/core/crewlaptop'
import { DEFAULT_CHOICES, newTask } from '../hooks/core/orchestra'
import type { Run } from '../hooks/core/orchestra'
import { reportOf } from '../hooks/core/overnight'
import { goalFrom, readState, emptyState } from '../hooks/core/proof'
import { test } from './slow'

const NOW = Date.UTC(2026, 9, 12, 12, 0, 0)

test('a warn counts as tight after a warn only when the earlier reading is recent; the text twin gets the same answer when it is given the earlier reading', () => {
  const warn = { at: NOW, pressure: 'warn' as const, freeShare: 0.5 }
  const recent = { ...warn, at: NOW - LAPTOP_EVERY_MS }
  const old = { ...warn, at: NOW - 3 * LAPTOP_EVERY_MS }
  expect(memoryTight(warn, recent)).toBe(true)
  expect(memoryTight(warn, old)).toBe(false)
  expect(memoryTight(warn)).toBe(false)
  expect(laptopWords(warn, recent)[0]).toMatch(/short of memory/)
  expect(laptopWords(warn)[0]).toMatch(/Memory is fine/)
})

test('the run history keeps no secret from the typed task text, the name or the reason', () => {
  const key = `ghp_${'a1'.repeat(20)}`
  const t = { ...newTask({ n: 1, text: `deploy with token=${key} now`, role: 'builder', model: 'auto', folder: false }), why: `failed, used ${key}` }
  const run: Run = { id: 'r1', name: `Run ${key}`, status: 'done', createdAt: NOW, tasks: [t], choices: DEFAULT_CHOICES }
  expect(JSON.stringify(reportOf(run, NOW))).not.toContain(key)
})

test('a goal stored from a first message as a whole sentence is rebuilt to key words on read; a typed goal is kept', () => {
  const sentence = 'Fix the login bug on the checkout page. It breaks on Safari.'
  const s = readState({ ...emptyState(), goal: { text: sentence, setAt: 1, how: 'first' } })
  expect(s.goal?.text).toBe(goalFrom(sentence))
  expect(s.goal?.text).not.toBe(sentence)
  expect(readState({ ...emptyState(), goal: { text: sentence, setAt: 1, how: 'typed' } }).goal?.text).toBe(sentence)
})
