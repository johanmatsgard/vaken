// True counts and one number for Needs you: the band chip against the card, a window past its reset.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { cacheWords } from '../hooks/core/cachefacts'
import { addCount, countsSince, FREED_TITLE, SHORTENED_TITLE } from '../hooks/core/counts'
import { awakeDetail, heldWord } from '../hooks/core/crew3proc'
import { parsePrView, prWords, tally } from '../hooks/core/crewpr'
import { agentsHead } from '../hooks/core/headline'
import { BLOCKS, HELD_WHAT, WARNED_WHAT } from '../hooks/core/guard'
import { didToday, todaySummary } from '../hooks/core/ledger'
import type { Entry } from '../hooks/core/ledger'
import { DEFAULT_CHOICES, failedTasks, newRun, runProgress, runSummary, withTask } from '../hooks/core/orchestra'
import type { Run } from '../hooks/core/orchestra'
import type { SessionRecord } from '../hooks/core/record'
import { setLang } from '../hooks/core/lang'
import { AWAKE_WHAT } from '../hooks/core/crew3'
import type { InboxItem } from '../hooks/core/inbox'
import { buildInbox, heldNeedsCount, isCountedItem, isRowItem } from '../hooks/core/inbox'
import { needsChip } from '../hooks/core/cardrules'
import { LIMIT_HOT_PCT, LIMIT_URGENT_PCT, bandLead, bandWord, buildView, cardLoudness, homeText, limitBlocks, limitLoud, needsCount } from '../hooks/features/home/logic'
import type { LoudFacts } from '../hooks/features/home/logic'
import { safetyFacts } from '../hooks/features/home/linecards'
import { needsGroupsOf, needsNote, needsRows, needsTotal } from '../hooks/features/home/cards/top'

const MIN = 60_000
const HOUR = 60 * MIN
const NOW = Date.parse('2026-10-12T12:00:00Z')
const iso = (ms: number): string => new Date(ms).toISOString()

const rec = (id: string, over: Partial<SessionRecord> = {}): SessionRecord => ({
  sessionId: id,
  cwd: `/work/${id}`,
  model: 'claude-opus-5',
  state: 'working',
  startedAt: NOW - 20 * MIN,
  updatedAt: NOW - 2000,
  lastEventAt: NOW - 2000,
  stateSince: NOW - 3 * MIN,
  ...over,
})

test('records of one window rank by the highest percent, not by whichever heartbeat touched last; the chip equals the card', () => {
  const reset = iso(NOW + 3 * 24 * HOUR)
  const records = [75, 78, 80, 77, 76].map((p, n) => rec(`s${n}`, { sevenDayPercent: p, sevenDayResetsAt: reset, updatedAt: NOW - (n === 4 ? 200 : 40_000 + n) }))
  const view = buildView(records, NOW, 'me', undefined)
  expect(view.week?.percent).toBe(80)
  const usage = { at: NOW - 30_000, windows: [{ label: 'Weekly · all models', percent: 80, resetsAt: reset }] }
  const withApp = buildView(records, NOW, 'me', undefined, usage, {})
  expect(bandLead(withApp)?.percent).toBe(limitBlocks(withApp)[0]?.percent)
  expect(bandLead(withApp)).toEqual(limitBlocks(withApp)[0])
  expect(bandWord(withApp, 'simple')).toMatch(/^Week 80%, resets /)
  const old = rec('old', { sevenDayPercent: 95, sevenDayResetsAt: iso(NOW - 4 * 24 * HOUR) })
  expect(buildView([...records, old], NOW, 'me', undefined).week?.percent).toBe(80)
})

test('a window past its reset is dropped, never drawn and never loud', () => {
  const gone = [rec('a', { fiveHourPercent: 91, fiveHourResetsAt: iso(NOW - 90 * MIN) })]
  const view = buildView(gone, NOW, 'me', undefined)
  expect(limitBlocks(view)).toEqual([])
  expect(bandLead(view)).toBeUndefined()
  expect(limitLoud(limitBlocks(view), NOW)).toBe('calm')
  expect(homeText(view)).toContain('Plan limits: not reported yet.')
  const live = buildView([rec('a', { fiveHourPercent: 91, fiveHourResetsAt: iso(NOW + 30 * MIN) })], NOW, 'me', undefined)
  expect(limitLoud(limitBlocks(live), NOW)).toBe('urgent')
  const usage = { at: NOW - 60_000, windows: [{ label: '5-hour limit', percent: 91, resetsAt: iso(NOW - 10_000) }] }
  expect(limitBlocks(buildView([rec('a', { fiveHourPercent: 4, fiveHourResetsAt: iso(NOW + 4 * HOUR) })], NOW, 'me', undefined, usage, {})).map(b => b.percent)).toEqual([4])
})

const item = (over: Partial<InboxItem>): InboxItem => ({ id: 'x', kind: 'hold', sid: 'other', name: 'app', here: false, what: 'Held a risky command.', since: NOW - 3 * MIN, approx: false, todo: 'Allow it in that session.', count: 1, allowed: false, ...over })

test('one asking session and one held step make 2 in the card, the chip and the list; a finished session is not counted', () => {
  const q = { kind: 'question' as const, tool: 'AskUserQuestion', since: NOW - 4 * MIN }
  const base = buildView([rec('here'), rec('asks', { ask: q }), rec('done', { state: 'idle', lastEventAt: NOW - 5 * MIN, stateSince: NOW - 5 * MIN })], NOW, 'here', undefined)
  expect(base.needs).toHaveLength(1)
  const inbox = [item({}), item({ kind: 'question', id: 'q' })]
  const held = inbox.filter(isRowItem).length
  const view = { ...base, held }
  const ctx = { view, prefs: { inbox, hidden: [], halted: false } } as unknown as Parameters<typeof needsTotal>[0]
  expect(needsTotal(ctx)).toBe(2)
  const looks = [item({ kind: 'review', id: 'r1' }), item({ kind: 'review', id: 'r2' })]
  expect(needsTotal({ view: { ...base, held: 0 }, prefs: { inbox: looks, hidden: [], halted: false } } as unknown as Parameters<typeof needsTotal>[0])).toBe(1)
  expect(needsTotal({ view: { ...buildView([rec('here')], NOW, 'here', undefined), held: 0 }, prefs: { inbox: looks, hidden: [], halted: false } } as unknown as Parameters<typeof needsTotal>[0])).toBe(0)
  const lookCtx = { view: { ...base, held: 0 }, prefs: { inbox: looks, hidden: [], halted: false } } as unknown as Parameters<typeof needsGroupsOf>[0]
  // Finished answers that wait for a look are no row of Needs you (a calm line on This session)
  expect(needsRows(lookCtx, needsGroupsOf(lookCtx))).toBe(1)
  expect(needsCount(view)).toBe(2)
  expect(needsNote(needsTotal(ctx))).toBe('2')
  expect(needsNote(0)).toBe('')
  expect(needsChip(needsCount(view), s => s)).toBe('2 need you')
  expect(needsChip(1, s => s)).toBe('1 needs you')
  expect(view.waiting.length + view.idle.length).toBeGreaterThan(0)
  expect(needsCount({ ...base, held: 0 })).toBe(1)
  expect(homeText(view)).toContain('Needs you: 2')
  expect(isRowItem(item({ kind: 'halt', here: true }))).toBe(false)
  expect(isRowItem(item({ kind: 'halt', here: false }))).toBe(true)
  expect(isRowItem(item({ kind: 'review' }))).toBe(false)
  expect(isCountedItem(item({ kind: 'review' }))).toBe(false)
  expect(isCountedItem(item({}))).toBe(true)
  // A stopped step whose Allow once has timed out is a calm row: listed, not counted
  expect(isRowItem(item({ stale: true }))).toBe(true)
  expect(isCountedItem(item({ stale: true }))).toBe(false)
})

test('one stopped step is never counted twice; the card, the band and the loader read the Needs you number from the same functions', () => {
  const entry = (at: number): Entry => ({ at, session: 'a', what: 'Held a risky command', detail: 'rm -rf build', how: 'auto', did: true })
  const inbox = buildInbox({
    now: NOW,
    sessions: [{ sid: 'me', name: 'Docs', here: true }, { sid: 'a', name: 'Fix login', here: false }, { sid: 'b', name: 'Billing', here: false }],
    ledger: [entry(NOW - MIN), entry(NOW - 2 * MIN), entry(NOW - 3 * MIN)],
    allowed: [],
    asks: [{ sid: 'a', kind: 'permission', tool: 'Bash', since: NOW - 4 * MIN }],
    debts: [{ sid: 'a', turns: 2 }],
    halts: [{ sid: 'b', at: NOW - 5 * MIN }],
    seen: {},
  })
  expect(inbox.filter(x => x.kind === 'hold').map(x => x.count)).toEqual([3])
  expect(heldNeedsCount(inbox)).toBe(2)
  const base = buildView([rec('me'), rec('a', { ask: { kind: 'permission' as const, tool: 'Bash', since: NOW - 4 * MIN } })], NOW, 'me', undefined)
  expect(base.needs).toHaveLength(1)
  const view = { ...base, held: heldNeedsCount(inbox) }
  expect(needsCount(view)).toBe(3)
  expect(needsTotal({ view: base, prefs: { inbox, hidden: [], halted: false } } as unknown as Parameters<typeof needsTotal>[0])).toBe(3)
  expect(needsTotal({ view, prefs: { inbox, hidden: [], halted: false } } as unknown as Parameters<typeof needsTotal>[0])).toBe(needsCount(view))
})

const facts = (over: Partial<LoudFacts> = {}): LoudFacts => ({ limits: [], here: true, others: 0, didToday: 0, proof: 'none', agents: { any: false, stuck: false }, computer: { gaugeOn: false, full: false }, skillsUsed: false, ...over })

test('This session is loud from the context share, as Plan limits is', () => {
  expect(cardLoudness(facts({ herePct: 40 }), NOW).here).toBe('normal')
  expect(cardLoudness(facts({ herePct: LIMIT_HOT_PCT - 1 }), NOW).here).toBe('normal')
  expect(cardLoudness(facts({ herePct: 86 }), NOW).here).toBe('warn')
  expect(cardLoudness(facts({ herePct: LIMIT_URGENT_PCT }), NOW).here).toBe('urgent')
  expect(cardLoudness(facts({ here: false }), NOW).here).toBe('calm')
})

const base4 = (): Run => ({ ...newRun(['A', 'B', 'C', 'D'], NOW), status: 'running', choices: { ...DEFAULT_CHOICES, atOnce: 2 } })
const states = (run: Run, s: Run['tasks'][number]['state'][]): Run => s.reduce((r, state, i) => withTask(r, i + 1, { state }), run)

test('a failed task turns the Agents headline to "1 failed" and the card amber; none while all is well', () => {
  setLang('en')
  const run = states(base4(), ['done', 'failed', 'running', 'waiting'])
  expect(failedTasks(run)).toBe(1)
  expect(failedTasks(undefined)).toBe(0)
  expect(agentsHead({ running: 1, stuck: 0, total: 4, failed: 1 })).toBe('1 failed')
  expect(agentsHead({ running: 1, stuck: 0, total: 4 })).toBe('1 running')
  expect(cardLoudness(facts({ agents: { any: true, stuck: false, failed: 1 } }), NOW).agents).toBe('warn')
  expect(cardLoudness(facts({ agents: { any: true, stuck: false, failed: 0 } }), NOW).agents).toBe('normal')
})

test('the bar and the summary read one count, done; pending checks are not done; a skipped task is named', () => {
  setLang('en')
  const run = states(base4(), ['done', 'failed', 'running', 'waiting'])
  expect(runProgress(run)).toMatchObject({ done: 1, all: 4 })
  expect(runSummary(run)).toBe('1 of 4 done, 1 running, 1 failed, 1 waiting')
  const checking = withTask(states(base4(), ['done', 'waiting', 'waiting', 'waiting']), 1, { check: 'running' })
  expect(runSummary(checking)).toBe('0 of 4 done, 1 checking, 3 waiting')
  // A finished run with a skipped task: "3 of 4 done, 1 skipped", never "All 4 done".
  const finished = { ...states(base4(), ['done', 'done', 'done', 'skipped']), status: 'done' as const }
  expect(runSummary(finished)).toBe('3 of 4 done, 1 skipped')
  expect(runSummary({ ...states(base4(), ['done', 'done', 'done', 'done']), status: 'done' })).toBe('All 4 done')
  expect(runSummary({ ...states(base4(), ['done', 'done', 'failed', 'skipped']), status: 'done' })).toBe('2 of 4 done, 1 failed, 1 skipped')
})

const entry = (what: string, at: number, over: Partial<Entry> = {}): Entry => ({ at, what, did: true, ...over })

test('a busy day shows its true numbers from the counts store, though the ledger holds 50 awake lines and 7 warnings', () => {
  const warned = WARNED_WHAT[BLOCKS[0]!]
  const held = HELD_WHAT[BLOCKS[0]!]
  const ledger: Entry[] = [...Array.from({ length: 50 }, (_, n) => entry(AWAKE_WHAT, NOW - n * MIN)), ...Array.from({ length: 7 }, (_, n) => entry(warned, NOW - (60 + n) * MIN))]
  let raw: unknown = {}
  for (let n = 0; n < 43; n += 1) raw = addCount(raw, NOW, warned)
  for (let n = 0; n < 2; n += 1) raw = addCount(raw, NOW, held)
  for (let n = 0; n < 3; n += 1) raw = addCount(raw, NOW, SHORTENED_TITLE)
  raw = addCount(raw, NOW, FREED_TITLE, 90_000)
  const counts = countsSince(raw, NOW)
  expect(counts[FREED_TITLE]).toBe(90_000)
  const facts = safetyFacts({ now: NOW, ledger, counts, halted: false, modes: {} })
  expect(facts.warned).toBe(43)
  expect(facts.held).toBe(2)
  expect(safetyFacts({ now: NOW, ledger, halted: false, modes: {} }).warned).toBe(7)
  // The tokens freed and the compactions come from the store too; the sums never show as lines of their own.
  expect(todaySummary([], NOW, counts)).toEqual({ count: 3, freed: 90_000 })
  const did = didToday(ledger, NOW, counts)
  expect(did.map(d => d.what)).not.toContain(SHORTENED_TITLE)
  expect(did.find(d => d.what === warned)?.n).toBe(43)
  expect(did.find(d => d.what === held)?.n).toBe(2)
  const noisy = countsSince(addCount(addCount({}, NOW, 'auto-compact skipped'), NOW, 'compacted (manual)'), NOW)
  expect(didToday([], NOW, noisy)).toEqual([])
})

test('the Guard says "1 stopped, 1 warned today" and points to Allow once in Needs you', () => {
  setLang('en')
  const ledger: Entry[] = [entry(HELD_WHAT[BLOCKS[0]!], NOW - MIN), entry(WARNED_WHAT[BLOCKS[0]!], NOW - 2 * MIN)]
  const f = safetyFacts({ now: NOW, ledger, halted: false, modes: {} })
  expect(f.held).toBe(1)
  expect(f.warned).toBe(1)
  expect(f.heldWhat.why).toBe('1 stopped, 1 warned today.')
  expect(f.heldWhat.next).toBe('To let a stopped step through, use Allow once in Needs you.')
  expect(safetyFacts({ now: NOW, ledger: [entry(WARNED_WHAT[BLOCKS[0]!], NOW - MIN)], halted: false, modes: {} }).warnedWhat.why).toBe('1 warned today.')
})

test('the awake line says the length held, once per spell', () => {
  expect(heldWord(10 * MIN)).toBe('10 min')
  expect(heldWord(130 * MIN)).toBe('2 h 10 min')
  expect(heldWord(3 * HOUR)).toBe('3 h')
  expect(awakeDetail(2)).toBe('Held the Mac awake for 10 minutes, because 2 sessions work. It is renewed while they work.')
  expect(awakeDetail(2, undefined, 'posix', 140 * MIN)).toBe('Held the Mac awake for 2 h 20 min, because 2 sessions work. It is renewed while they work.')
})

test('cancelled and skipped checks are named, never hidden behind "All N checks passed"', () => {
  const view = (conclusions: string[]) => parsePrView({ number: 7, state: 'OPEN', mergeable: 'MERGEABLE', statusCheckRollup: conclusions.map((c, n) => ({ name: `c${n}`, status: 'COMPLETED', conclusion: c })) })!
  const four = view(['SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS'])
  expect(prWords(four, {}, NOW)).toContain('All 4 checks passed.')
  const cancelled = view(['SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'CANCELLED'])
  expect(tally(cancelled.checks)).toMatchObject({ passed: 4, cancelled: 1, total: 5 })
  expect(prWords(cancelled, {}, NOW)).toContain('4 of 5 checks passed, 1 cancelled.')
  const skipped = view(['SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'SKIPPED'])
  expect(prWords(skipped, {}, NOW)).toContain('4 passed, 1 skipped.')
  expect(prWords(view(['SKIPPED']), {}, NOW)).toContain('1 skipped.')
  expect(prWords(view(['SUCCESS', 'FAILURE', 'CANCELLED', 'SKIPPED']), {}, NOW)).toContain('1 of 4 checks passed, 1 failed, 1 cancelled, 1 skipped.')
})

test('the cache clock never says "warm 0 min" and steps to the nearest five', () => {
  setLang('en')
  const c = { read: 1, write: 1, fresh: 0, hit: 50, at: NOW }
  expect(cacheWords(c, NOW + HOUR - 20_000, HOUR)).toBe('Cache warm under 1 min')
  expect(cacheWords(c, NOW + HOUR - 20_000, HOUR, true)).toBe('Cache 50% hit · warm under 1 min')
  expect(cacheWords(c, NOW + HOUR - 14 * MIN, HOUR)).toBe('Cache warm 15 min')
  expect(cacheWords(c, NOW + HOUR - 12 * MIN, HOUR)).toBe('Cache warm 10 min')
  expect(cacheWords(c, NOW + HOUR - 10 * MIN, HOUR)).toBe('Cache warm 10 min')
  expect(cacheWords(c, NOW + HOUR, HOUR)).toBe('Cache lapsed')
})
