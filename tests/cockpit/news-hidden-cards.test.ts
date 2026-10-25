// News from a card the view leaves out: in the Standard view the Pull requests, Ship and Checks cards are not shown. A pause is a row only while the Safety card is out of sight.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { EXPLAIN, EXPLAIN_HELP } from '../hooks/core/explain'
import { HALT_DENY_WHAT, HALT_WHAT, RESUME_WHAT } from '../hooks/core/guard'
import { STEER_STOP_WHAT } from '../hooks/core/inbox'
import { GUIDE } from '../hooks/core/cardguide'
import { PR_SHARED_KEY, parsePrView } from '../hooks/core/crewpr'
import type { Io } from '../hooks/core/io'
import { prsAndMine } from '../hooks/features/home/load'
import { prsFacts } from '../hooks/core/prcard'
import type { PrRow } from '../hooks/core/prcard'
import { SS_T_CHECK_NEXT_FIX } from '../hooks/core/shipstepwords'
import { jumpShown } from '../hooks/core/settingsmap'
import { CARD_IDS } from '../hooks/features/home/logic'
import type { CardId } from '../hooks/features/home/logic'
import { fixedIds } from '../hooks/features/home/viewset'
import type { ViewMode } from '../hooks/features/home/viewset'
import { HALT_NEWS_NEXT, NEEDS_WORDS, newsCount, PR_NEWS_NEXT, PR_NEWS_OPEN, PR_NEWS_TITLE, hereNews, newsGroups } from '../hooks/features/home/needs'
import type { InsideRow, NewsFacts } from '../hooks/features/home/needs'
import { needsGroupsOf, needsTotal } from '../hooks/features/home/cards/top'
import { RESUME_ALL, checkClaims, fixCheck } from '../hooks/features/home/rowact'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const NOW = Date.parse('2026-10-12T10:00:00Z')
const id = (s: string): string => s
const hiddenOf = (mode: ViewMode): CardId[] => CARD_IDS.filter(c => !(fixedIds(mode) ?? []).includes(c))
const news = (mode: ViewMode, over: Partial<NewsFacts> = {}): NewsFacts => ({ hidden: hiddenOf(mode), halted: false, proofClaims: 0, agentTrouble: false, proofProblem: false, now: NOW, ...over })
const rowsOf = (f: NewsFacts): InsideRow[] => [...hereNews(f, id), ...newsGroups(f, id)].flatMap(g => g.rows as InsideRow[])

const run = (name: string, conclusion: string) => ({ name, status: 'COMPLETED', conclusion, startedAt: '2026-10-12T09:40:00Z', completedAt: '2026-10-12T09:50:00Z' })
const myPr = (): PrRow => {
  const v = parsePrView({ number: 12, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: 'https://example.test/pull/12', statusCheckRollup: [run('unit', 'FAILURE')] })
  const f = prsFacts({ '/work/app/.git\nfeat-x': { at: NOW - 2 * MIN, branch: 'feat-x', view: v } }, { id: 'me', branch: 'feat-x' }, [{ id: 'me', name: 'Docs', cwd: '/work/app', branch: 'feat-x' }], NOW, true)
  const row = f.rows.find(r => r.mine)
  if (row === undefined) throw new Error('no row of this session')
  return row
}

test('paused: no pause row while the Safety card shows its Resume; with the card folded at the Glance look one row, no session name, Resume inside, the explain words with the button first', () => {
  expect(fixedIds('standard')).toContain('safety')
  expect(rowsOf(news('standard', { halted: true }))).toEqual([])
  expect(newsCount(news('standard', { halted: true }))).toBe(0)
  const rows = rowsOf(news('standard', { halted: true, safetyFolded: true }))
  expect(rows.map(r => r.key)).toEqual(['news-halt'])
  const [row] = rows
  expect(row?.title).toBe('Paused for safety')
  expect(row?.inside).toEqual({ label: 'Resume', action: RESUME_ALL })
  expect(row?.what.next).toBe(HALT_NEWS_NEXT)
  expect(row?.what.means).toBe(EXPLAIN[HALT_WHAT]?.means ?? '')
  expect(row?.right).toBeUndefined()
  expect(newsCount(news('standard', { halted: true, safetyFolded: true }))).toBe(1)
})

test('All and paused: no second pause row beside the Safety card\'s Resume; a hidden Safety card brings it back', () => {
  expect(rowsOf(news('all', { halted: true }))).toEqual([])
  expect(rowsOf({ ...news('custom', { halted: true }), hidden: ['safety'] }).map(r => r.key)).toEqual(['news-halt'])
})

test('a failing pull request of this session is a row only when the Pull requests and Ship cards are both left out', () => {
  const pr = myPr()
  const rows = rowsOf(news('standard', { myPr: pr }))
  expect(rows.map(r => r.key)).toEqual(['news-pr'])
  const [row] = rows
  expect(row?.title).toBe(PR_NEWS_TITLE.replace('{n}', '12'))
  expect(row?.right).toBe('failing')
  // The row stays, has no Fix press, and opens the pull request: its detail holds the pull request's own web address
  expect(row?.inside).toBeUndefined()
  expect(row?.action).toBeUndefined()
  expect(row?.what.next).toBe(PR_NEWS_NEXT)
  expect(row?.what.link).toEqual({ label: PR_NEWS_OPEN, href: 'https://example.test/pull/12' })
  expect(row?.what.next).not.toMatch(/Press Fix/)
  expect(row?.what.facts?.some(x => x.includes('unit'))).toBe(true)
  expect(rowsOf({ ...news('custom', { myPr: pr }), hidden: ['prs'] })).toEqual([])
  expect(rowsOf(news('all', { myPr: pr }))).toEqual([])
})

test('a failed check presses Fix inside; claims only press Check; both only while Checks and Ship are left out', () => {
  const fail = rowsOf(news('standard', { proofProblem: true, proofFail: 'tests', proofClaims: 2 }))
  expect(fail.map(r => r.key)).toEqual(['news-proof'])
  expect(fail[0]?.inside).toEqual({ label: 'Fix', action: fixCheck('tests') })
  // The row names what failed and the press its detail names
  expect(fail[0]?.title).toBe('Tests failed, and 2 claims have no check')
  expect(fail[0]?.what.next).toBe('Press Fix to put a fix request in the prompt box, then press Enter to send it. /vaken-ship proof shows what ran.')
  expect(rowsOf(news('standard', { proofProblem: true, proofFail: 'tests', proofClaims: 0 }))[0]?.title).toBe('Tests failed')
  const claims = rowsOf(news('standard', { proofProblem: true, proofClaims: 3 }))
  expect(claims[0]?.inside).toEqual({ label: 'Check', action: checkClaims(3) })
  expect(claims[0]?.title).toBe('3 claims have no check')
  expect(claims[0]?.what.next).toBe('Press Check to ask Claude to run the checks that prove them, and show the results.')
  expect(rowsOf({ ...news('custom', { proofProblem: true, proofFail: 'tests', proofClaims: 0 }), hidden: ['proof'] })).toEqual([])
})

test('no word names a card the view leaves out unless it says (View: All) or when it shows, or names Needs you too', () => {
  const left = hiddenOf('standard').map(c => GUIDE[c].title)
  const all = rowsOf(news('standard', { halted: true, myPr: myPr(), proofProblem: true, proofFail: 'build', proofClaims: 1, agentTrouble: true }))
  const words = [
    ...all.flatMap(r => [r.title, r.right ?? '', r.what.means, ...(r.what.facts ?? []), r.what.why ?? '', r.what.next ?? '']),
    ...[HALT_WHAT, RESUME_WHAT, HALT_DENY_WHAT, STEER_STOP_WHAT].map(w => EXPLAIN[w]?.next ?? ''),
    ...EXPLAIN_HELP.map(h => h.text),
    SS_T_CHECK_NEXT_FIX,
    'Pull request {n}: {m} check failed. Open it in the pane.',
  ]
  const bad = words.filter(w => left.some(t => w.includes(`${t} card`)) && !w.includes('(View: All)') && !w.includes('in Needs you or') && !w.includes(', when it shows'))
  expect(bad).toEqual([])
})

test('the Safety section jumps to the Safety card only where it shows', () => {
  expect(jumpShown('safety', 'standard', hiddenOf('standard'))).toBe(true)
  expect(jumpShown('safety', 'all', hiddenOf('all'))).toBe(true)
  expect(jumpShown('safety', 'custom', ['safety'])).toBe(true)
  expect(jumpShown('helpers', 'standard', hiddenOf('standard'))).toBe(true)
})

test('every new line has Swedish', () => {
  expect(NEEDS_WORDS.filter(w => (SV[w] ?? '') === '')).toEqual([])
})

test('in the card, this session\'s pause comes first and joins the other sessions\' pauses under one heading', () => {
  const other = { id: 'h', kind: 'halt', sid: 'web', name: 'Web fixes', here: false, what: 'Paused for safety. Commands, edits, tools, agents and web fetches are stopped.', todo: 'Open that session and press Resume.', since: NOW - 5 * MIN, approx: false, count: 1, allowed: false }
  const prefs = { inbox: [other], hidden: hiddenOf('standard'), halted: true, agents: [], proof: undefined, run: undefined, values: { detail: 'glance' }, openSections: [] }
  const groups = needsGroupsOf({ view: { now: NOW, here: { name: 'Docs' } }, prefs } as never)
  expect(groups.map(g => [g.head, g.rows.map(r => r.key)])).toEqual([['Paused for safety', ['news-halt', 'halt-web-0']]])
  expect(needsTotal({ view: { now: NOW, needs: [], here: { name: 'Docs' } }, prefs } as never)).toBe(2)
})

test('the count: pause, pull request and check rows count, the agent row does not; a pull request or check row does not count while its card shows', () => {
  const every = { halted: true, safetyFolded: true, myPr: myPr(), proofProblem: true, proofFail: 'tests' as const, proofClaims: 0, agentTrouble: true }
  expect(newsCount(news('standard', every))).toBe(3)
  expect(rowsOf(news('standard', every))).toHaveLength(3)
  const custom = { ...news('custom', every), hidden: [...hiddenOf('standard'), 'agents'] }
  expect(rowsOf(custom).map(r => r.key)).toContain('news-agents')
  expect(newsCount(custom)).toBe(3)
  expect(newsCount(news('all', every))).toBe(1)
})

const sharedPr = (): Record<string, unknown> => ({ '/work/app/.git\nfeat-x': { at: NOW - 2 * MIN, branch: 'feat-x', view: parsePrView({ number: 12, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: 'https://example.test/pull/12', statusCheckRollup: [run('unit', 'FAILURE')] }) } })
const fakeStore = () => {
  const reads: string[] = []
  const i = { get: async (k: string) => { reads.push(k); return k === PR_SHARED_KEY ? sharedPr() : undefined } } as unknown as Io
  return { i, reads }
}
const ME = { id: 'me', cwd: '/work/app', branch: 'feat-x' }

test('the load reads this session\'s failing pull request only with Pull requests and Ship both left out and the PR check on; the card\'s facts stay unset', async () => {
  const on = { 'crew.pr': 'on' }
  const std = fakeStore()
  const a = await prsAndMine(std.i, hiddenOf('standard'), on, ME, [], NOW)
  expect(a.myPr?.number).toBe(12)
  expect(a.prs).toBeUndefined()
  expect(std.reads.filter(k => k === PR_SHARED_KEY)).toHaveLength(1)
  const one = fakeStore()
  expect(await prsAndMine(one.i, ['prs'], on, ME, [], NOW)).toEqual({})
  expect(one.reads).toEqual([])
  const off = fakeStore()
  expect(await prsAndMine(off.i, hiddenOf('standard'), { 'crew.pr': 'off' }, ME, [], NOW)).toEqual({})
  expect(off.reads).toEqual([])
  const all = fakeStore()
  const b = await prsAndMine(all.i, hiddenOf('all'), on, ME, [], NOW)
  expect(b.myPr).toBeUndefined()
  expect(b.prs?.rows.some(r => r.mine)).toBe(true)
})
