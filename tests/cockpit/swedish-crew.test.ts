// The text twins of the Crew commands (worktrees, merge order, ports, awake, laptop, claims, agent board) say it in Swedish when the language is Swedish.
import { expect } from 'claude-code/testing'
import { test } from './slow'
import { setLang } from '../hooks/core/lang'
import { digestText, mergeText, refusedText, worktreesText } from '../hooks/core/crew3git'
import type { Placed, WtScan } from '../hooks/core/crew3git'
import { awakeText, orphansText, portsText } from '../hooks/core/crew3proc'
import type { PortHolder } from '../hooks/core/crew3proc'
import { laptopText } from '../hooks/core/crewlaptop'
import type { Laptop } from '../hooks/core/crewlaptop'
import { claimsText, collideToast, findRival } from '../hooks/core/crew'
import type { Claims, Other } from '../hooks/core/crew'
import { boardText } from '../hooks/core/agentboard'
import type { BoardRow } from '../hooks/core/agentboard'

const MIN = 60_000
const NOW = 1_800_000_000_000

async function inSwedish<T>(run: () => T): Promise<T> {
  setLang('sv')
  try {
    return run()
  } finally {
    setLang('en')
  }
}

const wt = (path: string, branch: string): WtScan['rows'][number]['wt'] => ({ path, branch, detached: false, bare: false, locked: false, prunable: false })
const SCAN: WtScan = {
  at: NOW,
  base: 'origin/main',
  baseKnown: true,
  cut: false,
  rows: [
    { wt: wt('/w/main', 'main'), isMain: true, dirty: 0, merged: true, atBase: true, live: false },
    { wt: wt('/w/done', 'feat-done'), isMain: false, dirty: 0, lastCommitAt: NOW - 3 * 60 * MIN, merged: true, atBase: false, live: false },
    { wt: wt('/w/wip', 'feat-wip'), isMain: false, dirty: 2, merged: false, atBase: false, live: false },
  ],
}

test('the worktree list says it in Swedish, and in English when the language is English', async () => {
  const sv = await inSwedish(() => worktreesText('on', SCAN, undefined, NOW, true))
  expect(sv).toMatch(/3 arbetsträd, 1 säkra att ta bort\./)
  expect(sv).toMatch(/huvudmappen; den blir kvar/)
  expect(sv).toMatch(/senaste commit för 3 timmar sedan/)
  expect(sv).toMatch(/2 ändringar är inte committade/)
  expect(sv).toMatch(/Ta bort den med: git worktree remove \/w\/done/)
  expect(sv).not.toMatch(/safe to remove|not committed/)
  const en = worktreesText('off', SCAN, undefined, NOW)
  expect(en).toMatch(/^3 worktrees, 1 safe to remove\./)
  expect(en).toMatch(/Worktree cleanup is off\./)
  expect(await inSwedish(() => worktreesText('off', undefined, 'git did not answer in time.', NOW))).toMatch(/^git svarade inte i tid\.\nStädning av arbetsträd är av\./)
})

const PR = (n: number, title: string, files: string[], mergeable = 'MERGEABLE'): Placed['pr'] => ({ number: n, title, head: `b${n}`, base: 'main', mergeable, files })

test('the merge order and the branch digest are said in Swedish', async () => {
  const placed: Placed[] = [
    { pr: PR(7, 'Add login', ['a.ts', 'b.ts']), place: 1, overlaps: [{ number: 9, files: ['a.ts'] }], rebaseAfter: [] },
    { pr: PR(9, 'Fix menu', ['a.ts'], 'CONFLICTING'), place: 2, overlaps: [{ number: 7, files: ['a.ts'] }], rebaseAfter: [{ number: 7, files: ['a.ts'] }] },
  ]
  const sv = await inSwedish(() => mergeText(placed, NOW - 2 * MIN, NOW, undefined))
  expect(sv).toMatch(/^Ordning för ihopslagning av 2 öppna pull requests \(frågade för 2 min sedan/)
  expect(sv).toMatch(/behöver en rebase efter #7 \(båda ändrar a\.ts\)/)
  expect(sv).toMatch(/Inget slås ihop åt dig\./)
  expect(mergeText(placed, NOW - 2 * MIN, NOW, undefined)).toMatch(/^Merge order for 2 open pull requests \(asked 2 min ago/)
  expect(await inSwedish(() => mergeText([], NOW, NOW, 'no open pull requests.'))).toBe('Ordning för ihopslagning: inga öppna pull requests.')
  const digest = await inSwedish(() => digestText('origin/main', ['abc fix'], [{ path: 'src/a.ts', add: 3, del: 1, binary: false }], 'feat-x'))
  expect(digest).toMatch(/^Grensammanfattning: 1 commit och 1 fil ändrade mot main \(feat-x\), \+3 -1 rader\. Mest riskabla först\./)
  expect(digest).toMatch(/Kod ändrades i 1 fil och ingen testfil ändrades\./)
  expect(await inSwedish(() => refusedText('feat-x', { allowed: false, repeat: false, count: 3, next: {}, freeAt: NOW + 90 * MIN }, NOW))).toMatch(/Fix-CI har byggt 3 prompter för feat-x .* om 1 timme\./)
})

test('ports and leftover programs are said in Swedish', async () => {
  const h: PortHolder[] = [
    { port: 3000, pid: 11, command: 'node', cwd: '/w/a', folder: { cwd: '/w/a', name: 'feat-a', at: NOW }, kind: 'other' },
    { port: 5173, pid: 12, command: 'vite', kind: 'none' },
  ]
  const sv = await inSwedish(() => portsText('on', h, true))
  expect(sv).toMatch(/^Delade portar: på\./)
  expect(sv).toMatch(/Port 3000: ett Node-program startades i mappen för sessionen 'feat-a'\. Port 3000 är den vanliga porten för en webbutvecklingsserver\./)
  expect(await inSwedish(() => portsText('on', [], false))).toMatch(/programmet lsof svarade inte/)
  expect(portsText('on', h, true)).toMatch(/Port 3000: a Node program started in the folder of session 'feat-a'/)
  expect(await inSwedish(() => orphansText([], { ps: true, lsof: true }))).toMatch(/^Kvarglömda program: inga hittades\./)
})

test('keep awake and computer load are said in Swedish', async () => {
  const off = await inSwedish(() => awakeText('off', true, 0, undefined, undefined, NOW))
  expect(off).toMatch(/^Håll Macen vaken: av\.\nAv: vaken rör inte datorns vilolägen\./)
  const on = await inSwedish(() => awakeText('on', true, 2, 4321, NOW - 3 * MIN, NOW, undefined, { away: 'phone' }))
  expect(on).toMatch(/Sessioner som arbetar nu: 2\.\nDatorn hålls vaken \(startades för 3 min sedan\)\./)
  expect(on).toMatch(/Borta: Bara telefon\./)
  const l: Laptop = { at: NOW - 30_000, pressure: 'normal', freeShare: 0.5, battery: { hasBattery: true, onAc: true, percent: 80 }, procs: { count: 2, rssMb: 2048 } }
  const sv = await inSwedish(() => laptopText('on', l, NOW))
  expect(sv).toMatch(/^Datorbelastning: på\.\nMinnet är bra: 2 Claude-sessioner använder 2,0 GB\./)
  expect(sv).toMatch(/Batteri 80 %, inkopplat\./)
  expect(sv).toMatch(/Lästes för 30 sekunder sedan\./)
  expect(laptopText('on', l, NOW)).toMatch(/^Computer load: on\.\nMemory is fine: 2 Claude sessions use 2\.0 GB\./)
})

const other = (name: string, items: [string, number][]): Other => ({ sessionId: name, name, claims: { repo: '/r/.git', root: '/w/a', items: items.map(([path, ago]) => ({ path, at: NOW - ago })) } })

test('the file overlap list and its toast are said in Swedish', async () => {
  const mine: Claims = { repo: '/r/.git', root: '/w/a', items: [{ path: 'src/a.ts', at: NOW - MIN }] }
  const sv = await inSwedish(() => claimsText('warn', mine, [other('feat-b', [['src/b.ts', 7 * MIN]])], NOW, true))
  expect(sv).toMatch(/^Filkrock: varnar\./)
  expect(sv).toMatch(/Den här sessionen: 1 fil\.\n {2}src\/a\.ts \(för 1 minut sedan\)/)
  expect(sv).toMatch(/feat-b: 1 fil\./)
  const r = findRival('package-lock.json', '/r/.git', '/w/a', [other('feat-b', [['package-lock.json', 4 * MIN]])], NOW)
  expect(r).toBeDefined()
  if (r === undefined) return
  expect(await inSwedish(() => collideToast('package-lock.json', r))).toBe('package-lock.json ändrades av en annan session (feat-b) för 4 minuter sedan (en låsfil).')
  expect(collideToast('package-lock.json', r)).toBe('package-lock.json was edited by another session (feat-b) 4 minutes ago (a lockfile).')
})

test('the agent board text is said in Swedish', async () => {
  const row: BoardRow = { id: 'a1', session: 's1', type: 'Explore', model: 'haiku', what: 'Search part 1', background: true, startedAt: NOW - 12 * MIN, state: 'running', stale: false }
  const done: BoardRow = { id: 'a2', session: 's1', type: 'Plan', model: 'opus', what: 'Plan it', background: true, startedAt: NOW - 30 * MIN, endedAt: NOW - 20 * MIN, state: 'done', stale: false }
  const sv = await inSwedish(() => boardText([row, done], NOW))
  expect(sv).toMatch(/^Agenter: 1 körs, 1 klara den senaste timmen\./)
  expect(sv).toMatch(/Explore \(haiku\): Search part 1, körs, 12 min/)
  expect(sv).toMatch(/Plan \(opus\): Plan it, klar, tog 10 min/)
  expect(boardText([row], NOW)).toBe('Agents: 1 running, 0 finished in the last hour.\n● Explore (haiku): Search part 1, running, 12 min')
  expect(await inSwedish(() => boardText([], NOW))).toBe('Inga agenter sedda de senaste 24 timmarna.')
})
