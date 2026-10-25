// The figures and their words, tested alone with sample facts.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { toastText } from '../hooks/core/budget'
import type { Reading } from '../hooks/core/budget'
import { burnSpanMin } from '../hooks/core/cost'
import { doShort, doView } from '../hooks/core/docard'
import type { DoBlock } from '../hooks/core/phonedo'
import { bandWords, clockWord } from '../hooks/core/limitwarn'
import { mainRedFrom } from '../hooks/core/crewpr'
import { OPEN_ENDS_DAYS, openDayStart, openEnds } from '../hooks/core/openends'
import type { OpenNote } from '../hooks/core/openends'
import { newRun, overLimits, runOverBudget, withTask } from '../hooks/core/orchestra'
import type { Run } from '../hooks/core/orchestra'
import { buildEvidence, emptyState, recordReceipts } from '../hooks/core/proof'
import { PRS_STALE_MS, prRight } from '../hooks/core/prcard'
import type { PrRow } from '../hooks/core/prcard'
import { parsePrView } from '../hooks/core/crewpr'
import { parseAgentCap } from '../hooks/core/setupcard'
import { stoppedToday } from '../hooks/core/ship'
import { safetyCardText } from '../hooks/core/safetycard'
import { HELP, helpFill } from '../hooks/features/home/views/help'
import { backView } from '../hooks/core/backcard'
import { contextFactsOf } from '../hooks/features/home/context'
import { helpText } from '../hooks/features/home/commands'

const MIN = 60_000
const HOUR = 3_600_000
const NOW = new Date(2026, 9, 11, 9, 0).getTime()
const id = (s: string): string => s

test('Ship counts stopped steps the way Safety does: counts store and ledger, any title that says it stopped, never the halt', () => {
  const counts = { 'Held a risky command': 4, 'Held a package install': 2, 'Warned about a risky command': 9, 'Paused all changes': 1 }
  expect(stoppedToday([], NOW, counts)).toBe(6)
  expect(stoppedToday([{ at: NOW - MIN, what: 'Held a risky command', did: true }], NOW, counts)).toBe(6)
  expect(stoppedToday([{ at: NOW - MIN, what: 'Held a risky command', did: true }], NOW)).toBe(1)
  expect(stoppedToday([], NOW)).toBe(0)
  // An extra agent and a call over budget are stops, but not risky steps
  expect(stoppedToday([], NOW, { ...counts, 'Held an extra agent': 3, 'Held a call over budget': 1, 'Refused a step while paused': 2 })).toBe(6)
})

test('Help names the real "Compact from" setting and both cache lifetimes', () => {
  const entry = HELP.find(h => h.title === 'When the card suggests it')
  expect(entry?.text).not.toMatch(/100k/)
  expect(helpFill(entry?.text ?? '', undefined)).toMatch(/fills 60% of its window/)
  expect(helpFill(entry?.text ?? '', { 'compact.from': '70' })).toMatch(/fills 70% of its window/)
  expect(helpText('cache', { 'compact.from': '50' })).toMatch(/5 minutes when you pay with usage credits/)
  expect(helpText('all', { 'compact.from': '50' })).toMatch(/fills 50% of its window/)
  expect(helpText('all')).toMatch(/fills 60% of its window/)
})

test('a helper that is still running is stopped past its dollar limit from its running cost; the final cost wins once there is one', () => {
  let run: Run = { ...newRun(['A', 'B'], NOW), status: 'running' }
  run = withTask(withTask(run, 1, { state: 'running', startedAt: NOW, agentId: 'a1' }), 2, { state: 'running', startedAt: NOW, agentId: 'a2' })
  const live = (agent: string): number | undefined => (agent === 'a1' ? 2.5 : undefined)
  expect(overLimits(run, NOW)).toEqual([])
  expect(overLimits(run, NOW, live)).toEqual([{ n: 1, why: 'cost past $2.00' }])
  expect(overLimits(withTask(run, 1, { usd: 0.5 }), NOW, live)).toEqual([])
  expect(runOverBudget(run)).toBe(false)
  expect(runOverBudget(run, a => (a === 'a1' ? 6 : a === 'a2' ? 5 : undefined))).toBe(true)
})

test('stopped steps and tasks not done are those of the project\'s latest day, so a task finished on Saturday does not count on Sunday', () => {
  const FRI = new Date(2026, 9, 9, 18, 0).getTime()
  const SAT = new Date(2026, 9, 10, 18, 0).getTime()
  const dayStart = openDayStart(new Date(2026, 9, 11, 8, 0).getTime())
  const note = (at: number, over: Partial<OpenNote>): OpenNote => ({ at, project: 'app', checks: {}, held: 0, tasks: 0, midTurn: false, ...over })
  expect(OPEN_ENDS_DAYS).toBeGreaterThanOrEqual(2)
  expect(openEnds([note(FRI, { tasks: 2 }), note(SAT, { tasks: 0 })], dayStart)).toEqual([])
  expect(openEnds([note(FRI, { tasks: 2 }), note(SAT - HOUR, { tasks: 1 }), note(SAT, { tasks: 1, held: 1 })], dayStart)).toEqual([{ project: 'app', failed: [], held: 1, tasks: 2, midTurn: 0, at: SAT }])
})

test('the away digest row says how long ago the away time ended', () => {
  const v = backView({ now: NOW, open: [], more: 0, away: { to: new Date(2026, 9, 11, 6, 12).getTime(), text: '2 risky steps were stopped\n  - a line' } }, id)
  const row = v.groups.find(g => g.head === 'While you were away')?.rows[0]
  expect(row?.right).toBe('2 h ago')
})

test('the Kept when compacted list names the real goal, and the sidebar title only as the session', () => {
  const view = { here: { rec: { title: 'Fix login', branch: 'feat-x' } }, now: NOW } as unknown as Parameters<typeof contextFactsOf>[0]
  const withGoal = { proof: { ...emptyState(), edits: 1, goal: { text: 'Ship checkout', setAt: NOW, how: 'typed' } }, values: {}, agents: [], sid: 's', checkpoints: [] } as unknown as Parameters<typeof contextFactsOf>[1]
  expect(contextFactsOf(view, withGoal).keep).toMatchObject({ goal: 'Ship checkout' })
  expect(contextFactsOf(view, withGoal).keep.session).toBeUndefined()
})

test('the band names the window that runs out: 5-hour, the week of all models, a week of one model, extra usage', () => {
  const w = (label: string) => ({ label, hitAt: NOW + 2 * HOUR, resetsAt: NOW + 5 * HOUR, text: '' })
  const at = clockWord(NOW + 2 * HOUR, NOW)
  expect(bandWords(w('5-hour limit'), NOW)).toBe(`5 h runs out about ${at} (estimate)`)
  expect(bandWords(w('Weekly · all models'), NOW)).toBe(`Week runs out about ${at} (estimate)`)
  expect(bandWords(w('Weekly (all models)'), NOW)).toBe(`Week runs out about ${at} (estimate)`)
  expect(bandWords(w('Weekly · Fable'), NOW)).toBe(`Week · Fable runs out about ${at} (estimate)`)
  expect(bandWords(w('Extra usage'), NOW)).toBe(`Extra usage runs out about ${at} (estimate)`)
})

test('a limit on agents is read only where the number counts agents', () => {
  expect(parseAgentCap('Run at most 2 agents at once.')).toBe(2)
  expect(parseAgentCap('Use up to 4 background agents.')).toBe(4)
  expect(parseAgentCap('Agents may read up to 3 files each.')).toBeUndefined()
  expect(parseAgentCap('Do not start agents for up to 3 reads.')).toBeUndefined()
})

test('the Do card says blocks, says when the answer held more than it numbers, says "Failed" for a non-zero exit and keeps the cut marker', () => {
  const blk = (n: number): DoBlock => ({ n, script: `cmd ${n}`, first: `cmd ${n}`, verdict: 'safe', why: [], outside: false })
  const blocks = [blk(1), blk(2)]
  expect(doShort({ blocks, mode: 'ask' }, id)).toBe('2 blocks of commands in the last answer')
  expect(doShort({ blocks, dropped: 3, mode: 'ask' }, id)).toBe('2 blocks of commands in the last answer (first 2 of 5)')
  const open = (exit: number, cut?: boolean) => doView({ blocks, mode: 'ask', open: 'do:b1', shown: { n: 1, exit, lines: ['last line'], ...(cut === true ? { cut } : {}) } }, id).groups[0]?.rows[0]?.what
  expect(open(0)?.means).toBe('Finished with exit 0')
  expect(open(1)?.means).toBe('Failed with exit 1')
  expect(open(1, true)?.facts).toEqual(['(earlier lines cut)', 'last line'])
  expect(open(1)?.facts).toEqual(['last line'])
})

test('a pull request row says no CI word and no reading age (the app\'s PR panel shows the checks); running or failing is just open', () => {
  const view = parsePrView({ number: 12, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: 'u', statusCheckRollup: [] })!
  const row = (checks: PrRow['checks'], ago: number): PrRow => ({ key: 'k', repo: 'r', repoName: 'r', branch: 'b', number: 12, at: NOW - ago, view, checks, merge: 'ready', mine: false })
  expect(prRight(row('running', 20 * MIN), id, NOW)).toBe('open')
  expect(prRight(row('running', PRS_STALE_MS - MIN), id, NOW)).toBe('open')
  expect(prRight(row('failing', 2 * HOUR), id, NOW)).toBe('open')
  expect(prRight(row('passing', 2 * HOUR), id, NOW)).toBe('ready')
})

test('main is green only when the newest run of every workflow succeeded', () => {
  expect(mainRedFrom([{ workflowName: 'ci', conclusion: 'success' }, { workflowName: 'deploy', conclusion: 'cancelled' }])).toBeUndefined()
  expect(mainRedFrom([{ workflowName: 'ci', conclusion: 'cancelled' }, { workflowName: 'ci', conclusion: 'success' }])).toBeUndefined()
  expect(mainRedFrom([{ workflowName: 'ci', conclusion: 'success' }, { workflowName: 'deploy', conclusion: 'success' }])).toBe(false)
})

test('the day budget toast and the lines say the day is the sessions vaken saw', () => {
  const day: Reading = { which: 'day', usd: 40, limit: 50, share: 0.8, level: 'warn' }
  expect(toastText(day)).toMatch(/Only sessions vaken saw today are counted\.$/)
  expect(toastText({ ...day, which: 'session' })).not.toMatch(/Only sessions/)
})

test('the burn line names the real span of the readings', () => {
  const s: [number, number][] = [[NOW - 8 * MIN, 1], [NOW - 4 * MIN, 1.5], [NOW, 2]]
  expect(burnSpanMin(s, NOW)).toBe(8)
  expect(burnSpanMin([], NOW)).toBe(0)
})

test('the proof pack lists the newest run of each kind in the turn once', () => {
  let s = emptyState()
  s = recordReceipts(s, [{ kind: 'tests', ok: false, exit: 1 }], NOW - 3 * MIN)
  s = recordReceipts(s, [{ kind: 'tests', ok: true, exit: 0 }, { kind: 'lint', ok: true, exit: 0 }], NOW - MIN)
  const ev = buildEvidence({ ...s, turnStartSeq: 0 }, { at: NOW, durationMs: 1000, claims: [], unproven: [], doneOn: false })
  expect(ev.ran.map(r => r.kind).sort()).toEqual(['lint', 'tests'])
  expect(ev.ran.find(r => r.kind === 'tests')?.status).toBe('ok')
})

test('below the limit the budget percent rounds down, so 99.5% is not "100%"', () => {
  expect(toastText({ which: 'session', usd: 24.9, limit: 25, share: 0.996, level: 'warn' })).toMatch(/^Cost: 99% of the session/)
  expect(toastText({ which: 'session', usd: 25, limit: 25, share: 1, level: 'over' })).toMatch(/^Cost: 100% of the session/)
})

test('a checkpoint age is counted like every other age: rounded down, hours from 60 minutes', () => {
  const f = { now: NOW, halted: false, held: 0, warned: 0, undoFiles: 0, heldWhat: { means: 'x' }, warnedWhat: { means: 'x' }, checkpoints: [{ name: 'tidy', at: NOW - 90 * MIN, files: 2 }] }
  expect(safetyCardText(f)).toContain('Checkpoint tidy: 1 h ago · /vaken-undo name tidy')
  expect(safetyCardText({ ...f, checkpoints: [{ name: 'tidy', at: NOW - 3 * 24 * HOUR, files: 2 }] })).toContain('Checkpoint tidy: 3 d ago · /vaken-undo name tidy')
})
