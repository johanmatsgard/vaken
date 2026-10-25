// The task run's one progress bar: fill = tasks finished out of all, it pulses only while the run runs with a helper at work.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { DEFAULT_CHOICES, newRun, runProgress, withTask } from '../hooks/core/orchestra'
import type { Run } from '../hooks/core/orchestra'
import { RunBar } from '../hooks/features/home/cards/agents'
import type { El } from '../hooks/ui/kit'
import { setLang } from '../hooks/core/lang'

type Node = Record<string, unknown>
const make = (name: string) => Object.assign((p: Record<string, unknown>) => p, { displayName: name })
const fake = (): El => ({ Box: make('Box'), Text: make('Text'), Button: make('Button'), Svg: make('Svg') }) as unknown as El
function walk(n: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(n)) {
    for (const c of n) walk(c, out)
  } else if (n !== null && typeof n === 'object') {
    out.push(n as Node)
    walk((n as Node).children, out)
  }
  return out
}
const NOW = Date.parse('2026-10-11T12:00:00Z')
const strings = (n: unknown, out: string[] = []): string[] => {
  if (typeof n === 'string') out.push(n)
  else if (Array.isArray(n)) for (const c of n) strings(c, out)
  else if (n !== null && typeof n === 'object') strings((n as Node).children, out)
  return out
}
const texts = (run: Run | undefined): string => strings(RunBar(fake(), run, 300)).join('|')
const sources = (run: Run | undefined): string => walk(RunBar(fake(), run, 300)).filter(n => typeof n.source === 'string').map(n => String(n.source)).join('')
const base = (): Run => ({ ...newRun(['A', 'B', 'C', 'D'], NOW), status: 'running', choices: { ...DEFAULT_CHOICES, atOnce: 2 } })
const withStates = (run: Run, states: Run['tasks'][number]['state'][]): Run => states.reduce((r, state, i) => withTask(r, i + 1, { state }), run)

test('no bar without a run, and none while the run is being set up', () => {
  setLang('en')
  expect(RunBar(fake(), undefined, 300)).toBeNull()
  expect(RunBar(fake(), { ...base(), status: 'setup' }, 300)).toBeNull()
})

test('the fill is the done tasks out of all, the one count the summary says; failed and stopped are not done', () => {
  setLang('en')
  const run = withStates(base(), ['done', 'failed', 'stopped', 'waiting'])
  expect(runProgress(run)).toMatchObject({ done: 1, all: 4, pct: 25 })
  expect(texts(run)).toContain('Task run')
  expect(texts(run)).toContain('1 of 4 done')
  // In the Agents view the Tasks header names the run: the bar line is the figure alone
  expect(strings(RunBar(fake(), run, 300, 'rv', false)).join('|')).not.toContain('Task run')
})

test('it pulses only while the run runs and a helper works', () => {
  setLang('en')
  const working = withStates(base(), ['done', 'running', 'waiting', 'waiting'])
  expect(runProgress(working).busy).toBe(true)
  expect(sources(working)).toContain('busy-band')
  expect(sources({ ...working, status: 'paused' })).not.toContain('busy-band')
  expect(runProgress({ ...working, status: 'paused' }).busy).toBe(false)
  const idle = withStates(base(), ['done', 'waiting', 'waiting', 'waiting'])
  expect(runProgress(idle).busy).toBe(false)
  expect(sources(idle)).not.toContain('busy-band')
  const finished = withStates({ ...base(), status: 'done' }, ['done', 'done', 'done', 'done'])
  expect(runProgress(finished)).toMatchObject({ pct: 100, busy: false })
  expect(sources(finished)).not.toContain('busy-band')
})

test('Swedish figure', () => {
  setLang('sv')
  expect(texts(withStates(base(), ['done', 'waiting', 'waiting', 'waiting']))).toContain('1 av 4 klara')
  setLang('en')
})
