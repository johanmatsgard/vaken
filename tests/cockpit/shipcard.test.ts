// The Ship card: "Ready to ship?" in one place, from what the commands already read.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { VIEW_STRINGS } from '../hooks/core/lang'
import { SETTINGS } from '../hooks/core/settings'
import { PR_SHARED_KEY, parsePrView } from '../hooks/core/crewpr'
import type { PrFacts } from '../hooks/core/crewpr'
import { prsFacts } from '../hooks/core/prcard'
import type { PrSession } from '../hooks/core/prcard'
import { emptyState } from '../hooks/core/proof'
import type { ProofState } from '../hooks/core/proof'
import { ship } from '../hooks/core/ship'
import { SHIP_PR_CI_NEXT, shipBlocks, shipCardText, shipLoud, shipVerdict } from '../hooks/core/shipcard'
import type { ShipFacts } from '../hooks/core/shipcard'
import { lineCard } from '../hooks/features/home/linecards'
import { CARD_IDS, LINE_CARD_IDS, homeText } from '../hooks/features/home/logic'
import type { View } from '../hooks/features/home/logic'
import { checkClaims, fixCheck, prShip } from '../hooks/features/home/rowact'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const NOW = Date.parse('2026-10-10T10:00:00Z')
const id = (s: string): string => s

const proofWith = (receipts: [ProofState['receipts'][number]['kind'], boolean | undefined, number][], over: Partial<ProofState> = {}): ProofState => ({
  ...emptyState(),
  edits: 3,
  seq: 10,
  lastEditSeq: 5,
  turns: 1,
  receipts: receipts.map(([kind, ok, seq]) => ({ kind, ok, at: NOW - MIN, seq })),
  ...over,
})
const facts = (over: Partial<ShipFacts> = {}): ShipFacts => ({ ledger: [], now: NOW, ...over })
const titles = (f: ShipFacts) => shipBlocks(f, id).map(b => [b.title, b.right])

const run = (name: string, conclusion: string | null) => ({ name, status: conclusion === null ? 'IN_PROGRESS' : 'COMPLETED', conclusion: conclusion ?? '', startedAt: '2026-10-10T09:40:00Z', completedAt: conclusion === null ? '0001-01-01T00:00:00Z' : '2026-10-10T09:50:00Z' })
const view = (number: number, checks: ReturnType<typeof run>[]) => parsePrView({ number, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: `https://example.test/pull/${number}`, statusCheckRollup: checks })
const sessions: PrSession[] = [
  { id: 'me', name: 'This session', cwd: '/work/app', branch: 'feat-x' },
  { id: 's1', name: 'web fixes', cwd: '/work/app/.claude/worktrees/b', branch: 'fix-y' },
]
const prsOf = (shared: Record<string, PrFacts>) => prsFacts(shared, { id: 'me', branch: 'feat-x' }, sessions, NOW, true)
const pr = (branch: string, n: number, checks: ReturnType<typeof run>[]): PrFacts => ({ at: NOW - MIN, branch, view: view(n, checks) })

test('nothing changed and no pull request: nothing to ship, calm; a changed session with every check passed is ready, calm', () => {
  expect(shipVerdict(facts())).toBe('none')
  expect(shipVerdict(facts({ proof: emptyState() }))).toBe('none')
  const v = lineCard('ship', { now: NOW, ledger: [], halted: false, modes: {}, t: id })
  expect([v.title, v.blurb, v.short]).toEqual(['Ship', 'Ready to ship?', 'Nothing to ship yet'])
  expect(v.groups?.[0]?.rows).toMatchObject([{ key: 'verdict', title: 'Nothing to ship yet' }])
  expect(v.groups?.[0]?.rows[0]?.action).toBeUndefined()
  expect(v.groups).toHaveLength(1)
  const ok = facts({ proof: proofWith([['tests', true, 8]]) })
  expect(shipVerdict(ok)).toBe('ready')
  // With the PR check off vaken cannot know the pull request, so it is ready here; with it on and nothing to ask, Ready
  expect(lineCard('ship', { now: NOW, ledger: [], halted: false, modes: {}, proof: ok.proof, t: id }).short).toBe('Ready here')
  expect(lineCard('ship', { now: NOW, ledger: [], halted: false, modes: {}, proof: ok.proof, prs: { on: true, rows: [], look: false }, t: id }).short).toBe('Ready')
  expect([shipLoud(facts()), shipLoud(ok)]).toEqual(['none', 'ready'])
})

test('a failed check, a stale check, claims with no check, stopped steps and unseen changes each block it; the verdict counts them all and the card shows 4, the fifth behind Show 1 more', () => {
  const bad = facts({
    proof: proofWith(
      [
        ['tests', false, 8],
        ['lint', true, 3],
      ],
      { debt: 2, last: { at: NOW, seconds: 1, edits: 1, files: 1, ran: [], claims: [], unproven: [{ kind: 'done', why: 'missing' }], notChecked: [], doneSet: [] } },
    ),
    ledger: [{ at: NOW - MIN, what: 'Held a risky command', did: true }],
  })
  expect(titles(bad)).toEqual([
    ['Tests', 'failed · Fix'],
    ['Lint', 'not run since the last edit · See'],
    ['Claims with no check behind them', '1 claim · Check'],
    ['1 step stopped today', 'Verdict'],
    ['Changes to look at', 'Verdict'],
  ])
  const v = lineCard('ship', { now: NOW, ledger: bad.ledger, halted: false, modes: {}, proof: bad.proof, t: id })
  expect(v.short).toBe('5 things block it')
  expect(shipVerdict(bad)).toBe('blocked')
  expect(shipLoud(bad)).toBe('blocked')
  expect(v.groups?.map(g => g.head)).toEqual(['', 'What blocks it'])
  const verdict = v.groups?.[0]?.rows[0]
  expect(verdict).toMatchObject({ key: 'verdict', title: '5 things block it', right: 'See', action: prShip('ship:verdict') })
  const rows = v.groups?.[1]?.rows ?? []
  expect(rows).toHaveLength(5)
  expect(v.groups?.[1]?.fold).toEqual({ id: 'blocks', shown: 4, more: 1 })
  expect(rows.slice(0, 4).map(r => r.action)).toEqual([fixCheck('tests'), prShip('ship:check-lint'), checkClaims(1), prShip('ship:held')])
  // Opened, the verdict does not repeat the rows below it
  expect(verdict?.what.facts ?? []).not.toContain('Changes to look at: Verdict')
  expect(ship({ proof: bad.proof as ProofState, confidence: { items: [] }, ledger: bad.ledger, now: NOW, doneOn: true }).ready).toBe(false)
  expect(titles(facts({ proof: proofWith([['tests', true, 8]], { debt: 1 }), ledger: [{ at: NOW - 30 * 3_600_000, what: 'Held a risky command', did: true }] }))).toEqual([['Changes to look at', 'Verdict']])
  expect(titles(facts({ proof: { ...emptyState(), debt: 1 }, ledger: [{ at: NOW - MIN, what: 'Refused a step', did: true }] }))).toEqual([])
})

test('only this session\'s own pull request blocks it: a failing check blocks with no Fix press (the app\'s PR panel offers Auto-fix); running, conflicts, behind, draft and needs-review also block; another session\'s does not', () => {
  const prs = prsOf({
    '/work/app/.git\nfeat-x': pr('feat-x', 12, [run('unit', 'FAILURE')]),
    '/work/app/.git\nfix-y': pr('fix-y', 9, [run('unit', 'FAILURE')]),
    '/work/site/.git\nmain-x': pr('main-x', 3, [run('e2e', null)]),
  })
  const f = facts({ prs })
  expect(titles(f)).toEqual([['#12 feat-x', 'failing']])
  const v = lineCard('ship', { now: NOW, ledger: [], halted: false, modes: {}, prs, t: id })
  expect(v.short).toBe('1 thing blocks it')
  expect((v.groups?.[1]?.rows ?? []).map(r => r.action)).toEqual([undefined])
  expect(shipBlocks(f, id)[0]?.what.next).toBe(SHIP_PR_CI_NEXT)
  const passing = facts({ prs: prsOf({ '/work/app/.git\nfeat-x': pr('feat-x', 12, [run('unit', 'SUCCESS')]) }) })
  expect(titles(passing)).toEqual([])
  expect(shipVerdict(passing)).toBe('ready')
  const one = (over: Record<string, unknown>, checks = [run('unit', 'SUCCESS')]) => facts({ prs: prsOf({ '/work/app/.git\nfeat-x': { at: NOW - MIN, branch: 'feat-x', view: parsePrView({ number: 12, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: 'https://example.test/pull/12', statusCheckRollup: checks, ...over }) } }) })
  expect(titles(one({}, [run('unit', null)]))).toEqual([['#12 feat-x', 'running']])
  expect(titles(one({ mergeable: 'CONFLICTING' }))).toEqual([['#12 feat-x', 'conflicts']])
  expect(titles(one({ mergeStateStatus: 'BEHIND' }))).toEqual([['#12 feat-x', 'behind']])
  expect(titles(one({ isDraft: true }))).toEqual([['#12 feat-x', 'draft']])
  expect(titles(one({ reviewDecision: 'REVIEW_REQUIRED' }))).toEqual([['#12 feat-x', 'needs review']])
  expect(shipVerdict(one({ mergeable: 'CONFLICTING' }))).toBe('blocked')
})

test('stopped steps are counted the way the Safety card counts them: from the counts store as well as the ledger, and any title that says it stopped', () => {
  const p = proofWith([['tests', true, 8]])
  const counts = { 'Held a risky command': 4, 'Held a package install': 2, 'Warned about a risky command': 9, 'Paused all changes': 1 }
  expect(titles(facts({ proof: p, ledger: [], counts }))).toEqual([['6 steps stopped today', 'Verdict']])
  expect(titles(facts({ proof: p, ledger: [{ at: NOW - MIN, what: 'Held a risky command', did: true }], counts }))).toEqual([['6 steps stopped today', 'Verdict']])
})

test('opened, the stopped-steps and unseen-changes rows say the verdict as plain facts: no headings, no indented lines, no row repeated', () => {
  const shown = ['Not ready yet:', '  - Changes not looked at: 1 answer', '  - 1 step stopped today', 'Blocking:', '  - Nothing was pushed', '  - nothing was pushed']
  const f = facts({ proof: proofWith([['tests', true, 8]], { debt: 1 }), ledger: [{ at: NOW - MIN, what: 'Held a risky command', did: true }], shown })
  const rows = shipBlocks(f, id)
  expect(rows.map(r => r.key)).toEqual(['held', 'look'])
  for (const r of rows) expect(r.what.facts).toEqual(['Nothing was pushed'])
})

test('the text twin names the verdict and each blocker with the command that says more', () => {
  const bad = facts({ proof: proofWith([['tests', false, 8]]) })
  expect(shipCardText(bad)).toEqual(['Ship: 1 thing blocks it · /vaken-ship', 'Tests: failed · Fix · /vaken-ship proof'])
  expect(shipCardText(facts())).toEqual(['Ship: Nothing to ship yet · /vaken-ship'])
  expect(shipCardText(undefined)).toEqual([])
  const text = homeText({ needs: [], working: [], waiting: [], idle: [], now: NOW } as unknown as View, CARD_IDS, { ship: shipCardText(bad) })
  expect(text.split('\n')).toContain('Tests: failed · Fix · /vaken-ship proof')
})

test('the card is a line card with its own Show or Hide, and every word it shows has a Swedish line', () => {
  expect(LINE_CARD_IDS).toContain('ship')
  expect(SETTINGS.find(s => s.key === 'cards.ship')).toMatchObject({ label: 'Ship', default: 'auto' })
  const words = englishOf('ship')
  expect(words.filter(w => !VIEW_STRINGS.includes(w))).toEqual([])
  expect(words.filter(w => (SV[w] ?? '') === '')).toEqual([])
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }
const rec = (sid: string, now: number, over: Record<string, unknown> = {}) => ({ sessionId: sid, cwd: `/work/${sid}`, model: 'm', state: 'idle', startedAt: now - 20 * MIN, updatedAt: now - 2000, lastEventAt: now - 2000, stateSince: now - 3 * MIN, ...over })

function harness(on: On, seed: Record<string, unknown>) {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', 'cockpit:setting:detail': 'explained', ...seed }))
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  const ran: string[][] = []
  on('process.run', (_$, e) => {
    ran.push([...(e as { argv: string[] }).argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  const sent: string[] = []
  on('prompt.submit', (_$, e) => {
    sent.push((e as { text: string }).text)
    return e as never
  })
  const filled: string[] = []
  on('prompt.fill', (_$, e) => {
    filled.push((e as { text: string }).text)
    return { isFilled: true } as never
  })
  return { mem, ran, toasts, sent, filled }
}
const ALL_SHOWN: Record<string, string> = Object.fromEntries([['cockpit:setting:look.view', 'custom'], ...Object.entries(Object.fromEntries(CARD_IDS.map(id => [`cockpit:setting:cards.${id}`, 'show'])))])
const world = (now: number, proof?: ProofState) => ({
  ...ALL_SHOWN,
  'cockpit:firstrun': 'done',
  'cockpit:session:test-session': rec('test-session', now, { cwd: '/work/app', branch: 'feat-x' }),
  ...(proof === undefined ? {} : { 'cockpit:proof:test-session': proof }),
})
const textOf = async (ui: { find: (q: unknown) => Promise<unknown> }, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })

test('the pane shows the Ship card; Fix on a failed check puts a fix prompt in the prompt box, See shows the verdict of /vaken-ship under the row; a draw runs no gh', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  // With the Checks card hidden, the Ship card keeps the check rows and their Fix press
  const w = harness(on, { ...world(NOW, proofWith([['tests', false, 8], ['lint', true, 3]])), 'cockpit:setting:cards.proof': 'hide' })
  const ui = await mountPane($)
  expect(await textOf(ui, /^Ship$/)).toBe(true)
  expect(await textOf(ui, /^2 things block it$/)).toBe(true)
  expect(await textOf(ui, /^failed · Fix$/)).toBe(true)
  expect(w.ran.filter(a => a[0] === 'gh')).toEqual([])
  await ui.press({ key: 'press-ol-ship:check-tests-0' })
  await clock.settle()
  expect(w.filled).toEqual(['The tests failed after the last change. Run the tests again, find why, fix it, and show me the result.'])
  expect(w.sent).toEqual([])
  await ui.press({ key: 'press-ol-ship:check-lint-0' })
  await clock.settle()
  await ui.redraw()
  // Opened, the verdict says only what the rows do not: no "Ship it" line (the title says it), no score, no command lines
  expect(await textOf(ui, /^Vaken does not merge or push\. Shipping is your press\.$/)).toBe(true)
  expect(await textOf(ui, /^Ship it:/)).toBe(false)
  expect(await textOf(ui, /^Confidence/)).toBe(false)
  expect(w.sent).toEqual([])
  expect(w.filled).toHaveLength(1)
  await ui.press({ key: 'press-ol-ship:check-lint-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Vaken does not merge or push/)).toBe(false)
  expect(w.ran.filter(a => a[0] === 'gh')).toEqual([])
  await ui.unmount()
})

test('one fact, one place: with the Checks card shown, the Ship card says the checks in one line that points there; Fix stays on the Checks card', { timeoutMs: 15_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  harness(on, world(NOW, proofWith([['tests', false, 8], ['lint', true, 3]])))
  const ui = await mountPane($)
  expect(await textOf(ui, /^1 thing blocks it$/)).toBe(true)
  expect(await ui.find({ key: 'press-ol-ship:check-tests-0' })).toBeUndefined()
  expect(await ui.find({ key: 'press-ol-ship:checks-0' })).toBeDefined()
  expect(await textOf(ui, /^1 failed$/)).toBe(true)
  expect(await ui.find({ key: 'press-ol-proof:check-tests-0' })).toBeDefined()
  await ui.unmount()
})

test('the pane with nothing changed: the calm card says there is nothing to ship yet', { timeoutMs: 15_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  harness(on, { ...world(NOW), [PR_SHARED_KEY]: {} })
  const ui = await mountPane($)
  expect(await textOf(ui, /^Ship$/)).toBe(true)
  expect(await textOf(ui, /^Nothing to ship yet$/)).toBe(true)
  await ui.unmount()
})
