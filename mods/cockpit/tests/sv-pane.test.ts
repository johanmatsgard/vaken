// A Swedish pane says the words the cards build from facts in Swedish.
import { expect } from 'claude-code/testing'
import { test } from './slow'
import { contextFacts } from '../hooks/core/appcontext'
import { cacheWords } from '../hooks/core/cachefacts'
import { guardHead, limitHead } from '../hooks/core/headline'
import { setLang, tr } from '../hooks/core/lang'
import { emptyState } from '../hooks/core/proof'
import type { ProofState } from '../hooks/core/proof'
import { shipBlocks } from '../hooks/core/shipcard'
import { lineCard } from '../hooks/features/home/linecards'
import { hereLines, limitLines, limitRow, resetSaid, stateWord } from '../hooks/features/home/logic'
import type { LimitBlock, Row } from '../hooks/features/home/logic'
import { lookWords, UNPROVEN_WHAT } from '../hooks/core/proof'
import type { Evidence } from '../hooks/core/proof'
import { HELD_WHAT, WARNED_WHAT } from '../hooks/core/guard'
import { FENCE_WHAT } from '../hooks/core/guardback'
import { shortSummary, shownTitle } from '../hooks/core/ledger'
import { offLine, roomLine } from '../hooks/core/computer'
import type { Room } from '../hooks/core/computer'
import type { BoardRow } from '../hooks/core/agentboard'
import type { InboxItem } from '../hooks/core/inbox'
import { needsGroups } from '../hooks/features/home/needs'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const HOUR = 60 * MIN
const NOW = Date.parse('2026-10-11T12:00:00Z')
const id = (s: string): string => s

function inSwedish<T>(run: () => T): T {
  setLang('sv')
  try {
    return run()
  } finally {
    setLang('en')
  }
}

const cache = { read: 900, write: 50, fresh: 50, hit: 90, at: NOW - 5 * MIN }
const row = { kind: 'working', reason: '', sinceMs: 0, name: 'x', rec: { sessionId: 's', cwd: '/work/a', model: 'm', state: 'working', startedAt: 0, updatedAt: 0, lastEventAt: 0, stateSince: 0, contextPercent: 11, ctx: { tokens: 110_000, window: 1_000_000 }, cache } } as unknown as Row
const week: LimitBlock = { kind: 'week', short: 'Week', label: 'Weekly limit', percent: 69, reset: 'resets Thu 14:00', withDay: true }
const session: LimitBlock = { kind: 'session', short: 'Session', label: '5-hour limit', percent: 20, reset: 'resets 17:30', withDay: false }
const notRun: ProofState = { ...emptyState(), edits: 3, seq: 10, lastEditSeq: 5, turns: 1 }

test('the headlines: plan limits and guard', () => {
  expect(inSwedish(() => limitHead([{ ...week, reset: resetSaid(week.reset, tr) }, session], tr))).toBe('Vecka: 69% använt · återställs tors 14:00')
  expect(inSwedish(() => guardHead(['warn', 'warn', 'warn', 'warn'], tr, 'worst'))).toBe('Varnar, stoppar det värsta')
  expect(inSwedish(() => guardHead(['hold', 'hold', 'hold', 'hold'], tr))).toBe('Alla stoppar')
  expect(limitHead([{ ...week, reset: resetSaid(week.reset, tr) }, session], tr)).toBe('Week: 69% used · resets Thu 14:00')
  expect(guardHead(['warn', 'warn', 'warn', 'warn'], tr, 'worst')).toBe('Warns, stops the worst')
})

test('This session: the state, the context tokens and the cache', () => {
  expect(inSwedish(() => cacheWords(cache, NOW, HOUR, false, tr))).toBe('Cache varm 55 min')
  expect(inSwedish(() => cacheWords(cache, NOW + HOUR, HOUR, false, tr))).toBe('Cache kall')
  expect(inSwedish(() => contextFacts({ tokens: 110_000, window: 1_000_000 }, 11, tr).used)).toBe('110k av 1M tokens')
  const sv = inSwedish(() => hereLines(row, 'explained', HOUR, NOW, false, true, undefined, tr))
  expect([sv.head, sv.used, sv.cache, sv.context]).toEqual(['Arbetar', '110k av 1M tokens', 'Cache varm 55 min · hålls billigt', 'Kontexten är 11 % full'])
  const en = hereLines(row, 'explained', HOUR, NOW, false, true, undefined, tr)
  expect([en.head, en.used, en.cache, en.cacheHit, en.context]).toEqual(['Working', '110k of 1M tokens', 'Cache warm 55 min · kept cheap', 'Cache 90% hit · warm 55 min · kept cheap', 'Context is 11% full'])
  expect(hereLines(row, 'explained', HOUR, NOW, false, true).cache).toBe('Cache warm 55 min · kept cheap')
})

test('Other sessions: a row state word', () => {
  expect(inSwedish(() => ['working', 'waiting', 'idle', 'needs'].map(k => tr(stateWord(k as Row['kind']))))).toEqual(['Arbetar', 'Din tur', 'Inaktiv', 'Behöver dig'])
  expect(['working', 'waiting'].map(k => tr(stateWord(k as Row['kind'])))).toEqual(['Working', 'Your turn'])
})

test('Plan limits: the rows, the reset and where the figures come from', () => {
  const sv = inSwedish(() => limitLines([week, session], 'explained', undefined, tr))
  expect(sv.groups[0]).toEqual(['Veckogräns: 69% använt', 'Återställs tors kl. 14:00'])
  expect(sv.source).toBe('Varifrån det kommer: Claude Code')
  expect(inSwedish(() => limitLines([session], 'simple', undefined, tr).note)).toBe('Session · återställs 17:30')
  expect(inSwedish(() => limitRow([week, session], tr))).toBe('Vecka 69% använt, återställs tors 14:00 · Session 20% använt, återställs 17:30')
  const en = limitLines([week, session], 'explained', undefined, tr)
  expect(en.groups).toEqual([['Weekly limit: 69% used', 'It resets Thu at 14:00'], ['5-hour limit: 20% used', 'It resets at 17:30']])
  expect(en.source).toBe('Where it comes from: Claude Code')
  expect(limitLines([session], 'explained').groups).toEqual([['5-hour limit: 20% used', 'It resets at 17:30']])
  expect(limitRow([week, session])).toBe('Week 69% used, resets Thu 14:00 · Session 20% used, resets 17:30')
})

test('Ship and Proof: the check row', () => {
  const rows = (t: (s: string) => string) => shipBlocks({ proof: notRun, ledger: [], now: NOW }, t).map(b => [b.title, b.right])
  expect(inSwedish(() => rows(tr))).toEqual([['Tester', 'inte körd · Se']])
  expect(rows(id)).toEqual([['Tests', 'not run · See']])
  const proof = inSwedish(() => lineCard('proof', { now: NOW, ledger: [], halted: false, modes: {}, proof: notRun, t: tr }))
  expect(proof.groups?.find(g => g.head === 'Checks after the last change')?.rows.map(r => [r.title, r.right])).toEqual([['Tester', 'inte körd']])
})

test('Guard: How strict', () => {
  const sv = inSwedish(() => lineCard('guard', { now: NOW, ledger: [], halted: false, modes: {}, t: tr }))
  expect([sv.short, sv.groups?.[0]?.rows[0]?.title, sv.groups?.[0]?.rows[0]?.right]).toEqual(['Alla varnar', 'Hur strikt', 'alla varnar'])
  const en = lineCard('guard', { now: NOW, ledger: [], halted: false, modes: {}, t: id })
  expect([en.short, en.groups?.[0]?.rows[0]?.title, en.groups?.[0]?.rows[0]?.right]).toEqual(['All warn', 'How strict', 'all warn'])
})

test('no other line of the dictionary overrides the pane words', () => {
  expect(Object.entries(byEnglish('sv', 'pane')).filter(([en, sv]) => SV[en] !== sv)).toEqual([])
})

const waiting: ProofState = { ...notRun, debt: 2, last: { unproven: [{}] } as unknown as Evidence }

test('Proof: the Waiting for you rows', () => {
  const rows = (t: (s: string) => string, p: ProofState) => lineCard('proof', { now: NOW, ledger: [], halted: false, modes: {}, proof: p, t }).groups?.find(g => g.head === 'Waiting for you')?.rows.map(r => [r.title, r.right])
  expect(inSwedish(() => rows(tr, waiting))).toEqual([['Påståenden utan kontroll bakom', '1 påstående · Kontrollera'], ['Ändringar att titta på', '2 svar']])
  expect(inSwedish(() => rows(tr, { ...notRun, debt: 0 }))).toEqual([['Inget väntar på att du tittar', undefined]])
  expect(rows(id, waiting)).toEqual([['Claims with no check behind them', '1 claim · Check'], ['Changes to look at', '2 answers']])
  expect(rows(id, { ...notRun, debt: 0 })).toEqual([['Nothing waits for your look', undefined]])
  expect(inSwedish(() => [lookWords(1, tr), lookWords(2, tr)])).toEqual(['1 avslutat svar ändrade filer och väntar på att du tittar.', '2 avslutade svar ändrade filer och väntar på att du tittar.'])
  expect([lookWords(1), lookWords(2)]).toEqual(['1 finished answer changed files and waits for your look.', '2 finished answers changed files and wait for your look.'])
  expect(lineCard('proof', { now: NOW, ledger: [], halted: false, modes: {}, proof: waiting }).lines.at(-1)).toBe('2 finished answers changed files and wait for your look.')
  expect(inSwedish(() => lineCard('proof', { now: NOW, ledger: [], halted: false, modes: {}, t: tr }).short)).toBe('Inget än')
})

test('Needs you: a look row says its count in Swedish', () => {
  const look: InboxItem = { id: 'review:me', kind: 'review', sid: 'me', name: 'app', here: true, what: '2 finished answers changed files and wait for your look.', approx: true, todo: '', count: 2, allowed: false }
  const held: InboxItem = { ...look, id: 'hold', kind: 'hold', what: `${HELD_WHAT.destructive}. rm -rf x`, count: 1 }
  const titles = (t: (s: string) => string) => needsGroups([held, look], NOW, t).flatMap(g => g.rows.map(r => r.title))
  expect(inSwedish(() => titles(tr))).toEqual(['app: Stoppade ett riskabelt kommando', 'app: 2 avslutade svar ändrade filer och väntar på att du tittar'])
  expect(titles(id)).toEqual(['app: Stopped a risky command', 'app: 2 finished answers changed files and wait for your look'])
})

test('the band: what vaken did, warned about or stopped, and the plan chip', () => {
  const lines = [UNPROVEN_WHAT, WARNED_WHAT.destructive, FENCE_WHAT].map(shownTitle)
  expect(lines).toEqual(['Claude said done, but no check backs it', 'Warned about a risky command', 'Found an instruction hidden in outside text'])
  expect(inSwedish(() => lines.map(tr))).toEqual(['Claude sa klart, men ingen kontroll styrker det', 'Varnade för ett riskabelt kommando', 'Hittade en instruktion gömd i text utifrån'])
  expect([...Object.values(WARNED_WHAT), ...Object.values(HELD_WHAT)].map(shownTitle).filter(x => SV[x] === undefined)).toEqual([])
  expect(lines.map(tr)).toEqual(lines)
  expect(inSwedish(() => [tr('Week'), resetSaid('resets Thu 14:00', tr)])).toEqual(['Vecka', 'återställs tors 14:00'])
})

test('Arrange: the tile titles and lines', () => {
  expect(inSwedish(() => ['Plan limits', 'This session', 'Agents', 'Other sessions', 'Risky steps', 'Safety', 'Checks', 'Autopilot'].map(tr))).toEqual(['Gränser i din plan', 'Den här sessionen', 'Agenter', 'Andra sessioner', 'Riskabla steg', 'Säkerhet', 'Kontroller', 'Autopilot'])
  const today = { count: 1, freed: 400_000 }
  expect(inSwedish(() => shortSummary(today, [], tr))).toBe('komprimerade sessionen en gång, ungefär 400k frigjorda')
  expect(inSwedish(() => shortSummary({ count: 0, freed: 0 }, [], tr))).toBe('Inget i dag')
  expect(shortSummary(today)).toBe('compacted the session once, about 400k freed')
  expect(shortSummary({ count: 2, freed: 400_000 }, [{ what: 'Kept the cache warm', n: 3 }])).toBe('compacted the session 2 times, about 400k freed, kept the cache warm 3 times')
  expect(inSwedish(() => shortSummary({ count: 2, freed: 400_000 }, [{ what: 'Kept the cache warm', n: 3 }], tr))).toBe('komprimerade sessionen 2 gånger, ungefär 400k frigjorda, höll cachen varm 3 gånger')
  const agent = (state: BoardRow['state']): BoardRow => ({ id: state, session: 's', type: 'Explore', what: 'x', background: false, startedAt: NOW - MIN, state, stale: false })
  const agents = (t: (s: string) => string, rows: BoardRow[]) => lineCard('agents', { now: NOW, ledger: [], halted: false, modes: {}, agents: rows, t }).short
  expect(inSwedish(() => [agents(tr, []), agents(tr, [agent('done')]), agents(tr, [agent('running'), agent('running'), agent('unknown')])])).toEqual(['Inga sedda', 'Ingen kör', '2 körs, 1 utan sett slut'])
  expect([agents(id, []), agents(id, [agent('done')]), agents(id, [agent('running'), agent('running'), agent('unknown')])]).toEqual(['None seen', 'None running', '2 running, 1 no end seen'])
  const room = (n: number): Room => ({ n, by: 'memory' }) as Room
  expect(inSwedish(() => [roomLine(room(1), tr), roomLine(room(3), tr), roomLine(room(0), tr), offLine('off', tr)])).toEqual(['Plats för ungefär 1 agent till', 'Plats för ungefär 3 agenter till', 'Fullt: minnet är trångt', 'Datorbelastningn är av'])
  expect([roomLine(room(1)), roomLine(room(3)), roomLine(room(0)), offLine('on')]).toEqual(['Room for about 1 more agent', 'Room for about 3 more agents', 'Full: memory is tight', 'Reading the computer…'])
})
