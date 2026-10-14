// The one text table: every text on a home card comes from the table, so a Swedish pane has no English left on its cards.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'
import { APPEARS } from '../hooks/core/cardrules'
import { emptyState } from '../hooks/core/proof'
import { setLang, tr } from '../hooks/core/lang'
import { trFill } from '../hooks/i18n/t'
import { parsePrView } from '../hooks/core/crewpr'
import { prsFacts } from '../hooks/core/prcard'
import type { PrFacts } from '../hooks/core/crewpr'
import type { PrSession } from '../hooks/core/prcard'
import { whatIsLines } from '../hooks/core/whatis'
import { restLines } from '../hooks/core/compactrest'
import { dietWords } from '../hooks/core/diet'
import { ship, shipText } from '../hooks/core/ship'
import type { WhatIs } from '../hooks/core/whatis'
import { lineCard } from '../hooks/features/home/linecards'
import type { CardCtx, LineCardView } from '../hooks/features/home/linecards'
import { LINE_CARD_IDS } from '../hooks/features/home/logic'
import { FOLDED, HIDDEN } from '../hooks/core/menu'

const NOW = new Date(2026, 9, 10, 14, 0).getTime()
const MIN = 60_000
const PANE_PT = 540
const COL_PT = 6

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: PANE_PT / COL_PT, placement: 'dock' as const, scroll: { bodyRows: 600, offset: 0, total: 600 }, view: {} }

function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}
function memStore(on: On, seed: Record<string, unknown>): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', ...seed }))
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  return mem
}

const seed = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })

const world = (lang: string, detail: string): Record<string, unknown> => ({
  'cockpit:firstrun': 'done',
  'cockpit:setting:look.language': lang,
  'cockpit:setting:detail': detail,
  'cockpit:setting:laptop.mode': 'on',
  'cockpit:setting:crew.pr': 'on',
  'cockpit:setting:compact.mode': 'watch',
  ...Object.fromEntries(Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show'])),
  'cockpit:session:test-session': seed('test-session', {
    cwd: '/work/app',
    branch: 'feat-x',
    contextPercent: 92,
    ctx: { tokens: 920_000, window: 1_000_000, compactAt: 97, top: [{ name: 'Messages', percent: 60 }, { name: 'Tools', percent: 12 }] },
    cache: { read: 900_000, write: 1000, fresh: 500, hit: 90, at: NOW - 5 * MIN },
    costUsd: 3.4,
    fiveHourPercent: 62,
    fiveHourResetsAt: '2026-10-10T18:00:00Z',
    sevenDayPercent: 71,
    sevenDayResetsAt: '2026-10-14T12:00:00Z',
    done: { files: 3, tests: 'failed', testsAt: NOW - 10 * MIN },
  }),
  'cockpit:session:s1': seed('s1', { ask: { kind: 'permission', tool: 'PowerShell', since: NOW - 4 * MIN }, state: 'working' }),
  'cockpit:session:s2': seed('s2', { state: 'waiting', stateSince: NOW - 12 * MIN }),
  'cockpit:session:s3': seed('s3', { ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 6 * MIN } }),
  'cockpit:session:s4': seed('s4', { state: 'idle', lastEventAt: NOW - 90 * MIN, stateSince: NOW - 90 * MIN }),
  'cockpit:proof:test-session': {
    ...emptyState(),
    goal: { text: 'Add a dark mode toggle', setAt: NOW, how: 'typed' },
    edits: 3,
    files: ['a1', 'b2', 'c3'],
    seq: 6,
    lastEditSeq: 3,
    turns: 2,
    debt: 2,
    done: ['tests', 'lint'],
    receipts: [{ kind: 'tests', ok: false, exit: 1, at: NOW - 9 * MIN, seq: 5 }],
    last: { at: NOW - 8 * MIN, seconds: 90, edits: 3, files: 3, ran: [{ kind: 'tests', status: 'failed', exit: 1, at: NOW - 9 * MIN }], claims: ['tests'], unproven: [{ kind: 'tests', why: 'failed' }], notChecked: ['lint', 'build'], doneSet: ['tests', 'lint'], doneMet: false },
  },
  'cockpit:agentboard': [
    { id: 'a1', session: 'test-ses', type: 'Explore', model: 'claude-haiku-5', what: 'Find the theme files', background: true, startedAt: NOW - 12 * MIN, state: 'running' },
    { id: 'a2', session: 'test-ses', type: 'Plan', model: 'claude-sonnet-5', what: 'Plan the toggle', background: false, startedAt: NOW - 30 * MIN, endedAt: NOW - 25 * MIN, state: 'done' },
    { id: 'a3', session: 'test-ses', type: 'Review', model: 'claude-opus-5', what: 'Review the change', background: false, startedAt: NOW - 50 * MIN, endedAt: NOW - 49 * MIN, state: 'failed' },
    { id: 'a4', session: 'test-ses', type: 'Explore', what: 'Look at the build', background: true, startedAt: NOW - 120 * MIN, state: 'running' },
  ],
  'cockpit:laptop:v2': { at: NOW - MIN, pressure: 'normal', freeShare: 0.12, memMb: 24 * 1024, load: 12, cpuBusy: 67, cores: 18, battery: { hasBattery: true, onAc: false, percent: 41 }, thermal: { state: 'slowed', speedLimit: 80 }, procs: { count: 3, rssMb: 4198 } },
  'cockpit:ledger:compact': [
    { at: NOW - 30 * MIN, session: 'test-session', what: 'Held a risky command', did: true, how: 'auto' },
    { at: NOW - 20 * MIN, session: 'test-session', what: 'Compacted the session', detail: 'about 40k tokens', did: true, how: 'auto' },
  ],
  'cockpit:skills:counts': { '2026-10-09': { review: 3, deploy: 1 }, '2026-10-10': { review: 2 } },
  ...(detail === 'x' ? {} : {}),
})

type Node = { type?: string; text?: string; props?: Record<string, unknown>; children?: unknown[] }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const textOf = (n: Node): string => [n.text ?? '', ...(n.children ?? []).map(c => (typeof c === 'string' || typeof c === 'number' ? String(c) : c !== null && typeof c === 'object' ? textOf(c as Node) : ''))].join('')
const keysOf = (tree: Node): string[] => [...new Set(walk(tree).map(n => n.props?.key).filter((k): k is string => typeof k === 'string'))]
const linesOf = (tree: Node): string[] =>
  walk(tree)
    .filter(n => n.type === 'Text' || n.type === 'Button')
    .map(n => (n.type === 'Button' ? String(n.props?.label ?? '') : textOf(n)))
    .map(s => s.trim())
    .filter(s => s !== '')

type Pane = { press: (q: unknown) => Promise<unknown>; unmount: () => Promise<void>; drawn: (s?: { in?: string }) => Promise<Node> }

// Common English words that must not show on a Swedish card.
const ENGLISH = ['the', 'and', 'of', 'used', 'running', 'nothing', 'today', 'waiting', 'files', 'file', 'check', 'checks', 'is', 'not', 'yet', 'turn', 'press', 'ask', 'with', 'for', 'your', 'you', 'this', 'that', 'when', 'what', 'or', 'it', 'has', 'have', 'was', 'were', 'no', 'off', 'to', 'from', 'been', 'will', 'can', 'does', 'did', 'read', 'ran', 'finished', 'waits', 'asks', 'question', 'worked', 'working', 'quiet', 'free', 'memory', 'battery', 'plugged', 'cores', 'busy', 'helper', 'helpers', 'agents', 'failed', 'passed', 'changed', 'next', 'ago', 'about', 'more', 'less', 'goal', 'branch', 'none', 'seen', 'time', 'times', 'step', 'steps', 'because', 'so', 'if', 'but', 'then', 'there', 'are', 'only', 'every', 'all', 'one', 'two', 'its', 'one']
// Things that are never translated: commands, file and model names, a session's own name, the goal the person typed.
const KEEP = [new RegExp(`/vaken(?:-[a-z-]+)?(?: run)?(?: (?:${[...Object.values(FOLDED).flat(), ...HIDDEN].join('|')})(?![a-z-]))?`, 'g'), /\bCLAUDE\.md\b/g, /\bMEMORY\.md\b/g, /\bclaude-[a-z0-9-]+\b/g, /\b(Opus|Sonnet|Haiku|Fable)( [0-9.]+)?\b/g, /\/work\/[a-zA-Z0-9/_.-]*/g, /Add a dark mode toggle/g, /Find the theme files|Plan the toggle|Review the change|Look at the build/g, /\bPowerShell\b/g, /\bfeat-x\b/g, /\bExplore\b|\bPlan\b|\bReview\b/g, /\bAskUserQuestion\b/g, /\bMessages\b|\bTools\b/g, /\bGitHub\b|\bgit\b|\bgh\b|\bCI\b/g]

export const englishIn = (text: string): string[] => {
  const cleaned = KEEP.reduce((s, re) => s.replace(re, ' '), text)
  const found = new Set<string>()
  for (const w of cleaned.toLowerCase().split(/[^a-zåäö0-9'-]+/)) if (ENGLISH.includes(w)) found.add(w)
  return [...found]
}

type Ui = Pane & { redraw: () => Promise<unknown> }
const PRESSES = /^press-(?!ol-needs:)(glance-[a-z]+|ol-.+|a-.+|o-.+)-0$/
async function seen($: { ui: { mount: (t: unknown) => Promise<unknown> } }): Promise<string[]> {
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })) as unknown as Ui
  const all = new Set<string>()
  const take = (t: Node) => linesOf(t).forEach(l => all.add(l))
  const press = async (key: string) => {
    await ui.press({ key })
    await ui.redraw()
  }
  take(await ui.drawn())
  const first = keysOf(await ui.drawn()).filter(k => PRESSES.test(k))
  for (const k of first) {
    await press(k)
    const tree = await ui.drawn()
    take(tree)
    for (const k2 of keysOf(tree).filter(x => PRESSES.test(x) && !first.includes(x))) {
      await press(k2)
      take(await ui.drawn())
      await press(k2)
    }
    await press(k)
  }
  await ui.unmount()
  return [...all]
}

const DETAILS = ['glance', 'simple', 'explained']

for (const detail of DETAILS) {
  test(`Swedish cards at the ${detail} look: no English left on a card`, { timeoutMs: 180_000 }, async ($, on) => {
    mock.clock(on, { now: NOW })
    memStore(on, world('sv', detail))
    mock.env(on, { HOME: '/home/test' })
    engine(on)
    const lines = await seen($ as never)
    const leaks = lines.map(l => ({ l, w: englishIn(l) })).filter(x => x.w.length > 0)
    expect(leaks.map(x => `${x.w.join(',')}: ${x.l}`)).toEqual([])
    expect(lines.join('\n')).toMatch(/Gränser i din plan|Den här sessionen/)
  })
}

// ---- the line cards built from facts that a pane test cannot reach easily: every row, its figure and the body it opens, in Swedish

const MINS = (n: number): number => NOW - n * MIN
const run = (name: string, conclusion: string | null) => ({ name, status: conclusion === null ? 'IN_PROGRESS' : 'COMPLETED', conclusion: conclusion ?? '', startedAt: '2026-10-10T09:40:00Z', completedAt: conclusion === null ? '' : '2026-10-10T09:50:00Z' })
const prView = (number: number, checks: ReturnType<typeof run>[], over: Record<string, unknown> = {}) =>
  parsePrView({ number, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: `https://example.test/pull/${number}`, statusCheckRollup: checks, ...over })

function allFacts(): CardCtx {
  const sessions: PrSession[] = [
    { id: 'me', name: 'This session', cwd: '/work/app', branch: 'feat-x' },
    { id: 's1', name: 'web fixes', cwd: '/work/app/.claude/worktrees/b', branch: 'fix-y' },
  ]
  const shared: Record<string, PrFacts> = {
    '/work/app/.git\nfeat-x': { at: MINS(2), branch: 'feat-x', view: prView(12, [run('unit', 'FAILURE'), run('lint', 'SUCCESS'), run('e2e', null)], { mergeStateStatus: 'BEHIND', reviewDecision: 'REVIEW_REQUIRED' }) },
    '/work/app/.git\nfix-y': { at: MINS(5), branch: 'fix-y', view: prView(9, [run('unit', 'SUCCESS')]) },
  }
  const proof = {
    ...emptyState(),
    goal: { text: 'Add a dark mode toggle', setAt: NOW, how: 'typed' as const },
    edits: 3,
    files: ['a1', 'b2'],
    seq: 6,
    lastEditSeq: 3,
    turns: 2,
    debt: 2,
    done: ['tests', 'lint'] as ('tests' | 'lint')[],
    receipts: [{ kind: 'tests' as const, ok: false, exit: 1, at: MINS(9), seq: 5 }],
    last: { at: MINS(8), seconds: 90, edits: 3, files: 3, ran: [{ kind: 'tests' as const, status: 'failed' as const, exit: 1, at: MINS(9) }], claims: ['tests' as const], unproven: [{ kind: 'tests' as const, why: 'failed' as const }], notChecked: ['lint' as const], doneSet: ['tests' as const, 'lint' as const], doneMet: false },
  }
  const rest = { at: MINS(2), ready: false, checks: [{ id: 'ended', label: 'The answer ended', ok: true, value: 'yes' }, { id: 'helpers', label: 'Nothing still runs', ok: false, value: '2 agents, 1 background command' }, { id: 'size', label: 'The session is big enough', ok: true, value: '120k tokens, 41% of the window (needs 30%)' }, { id: 'gap', label: 'Not compacted in the last 10 minutes', ok: true, value: 'the last one 25 min ago' }, { id: 'score', label: 'The moment scores high enough', ok: false, value: '38 of 70' }, { id: 'context', label: 'The session fills 30% of its window', ok: true, value: '41%' }, { id: 'cache', label: 'The cache is still warm', ok: false, value: 'gone cold: wait for the next break' }, { id: 'work', label: 'No work is open', ok: false, value: 'files changed and no check ran, task list 2 of 5 done' }] }
  return {
    now: NOW,
    ledger: [
      { at: MINS(30), session: 'test-session', what: 'Held a risky command', did: true, how: 'auto' },
      { at: MINS(20), session: 'test-session', what: 'Warned about a risky command', did: true, how: 'auto' },
    ] as never,
    proof,
    halted: false,
    modes: { 'laptop.mode': 'on', 'cap.mode': 'warn', 'cap.max': '3' },
    agents: [
      { id: 'a1', session: 'test-ses', type: 'Explore', model: 'claude-haiku-5', what: 'Find the theme files', background: true, startedAt: MINS(12), state: 'running', stale: false, quietAt: MINS(11) },
      { id: 'a2', session: 'test-ses', type: 'Plan', model: 'claude-sonnet-5', what: 'Plan the toggle', background: false, startedAt: MINS(30), endedAt: MINS(25), state: 'done', stale: false },
      { id: 'a3', session: 'test-ses', type: 'Review', what: 'Review the change', background: false, startedAt: MINS(50), endedAt: MINS(49), state: 'failed', stale: false },
      { id: 'a4', session: 'test-ses', type: 'Explore', what: 'Look at the build', background: true, startedAt: MINS(120), state: 'unknown', stale: true },
    ] as never,
    computer: { laptop: { at: NOW - MIN, pressure: 'normal', freeShare: 0.12, memMb: 24 * 1024, load: 12, cpuBusy: 67, cores: 18, battery: { hasBattery: true, onAc: false, percent: 41 }, thermal: { state: 'slowed', speedLimit: 80 }, procs: { count: 3, rssMb: 4198 } } as never, load: { running: 2, max: 3, capOn: true } },
    skills: { counts: { '2026-10-09': { review: 3, deploy: 1 }, '2026-10-10': { review: 2 } }, listing: { at: NOW - MIN, total: 6, included: 6, tokens: 2100, names: ['review', 'deploy', 'plan', 'ship', 'tidy', 'notes'] } } as never,
    prs: prsFacts(shared, { id: 'me', branch: 'feat-x' }, sessions, NOW, true),
    back: {
      now: NOW,
      gapMs: 3 * 3_600_000,
      goal: 'Add a dark mode toggle',
      branch: 'feat-x',
      contextPercent: 92,
      open: [{ project: 'app', failed: ['tests', 'build'], held: 2, tasks: 1, midTurn: 1 }, { project: 'site', failed: [], held: 1, tasks: 0, midTurn: 0 }] as never,
      more: 2,
    },
    safety: { undoFiles: 3, checkpoints: [{ name: 'before-theme', at: MINS(40), files: 4 }], preview: ['theme.css: would be put back', 'app.tsx: would be put back'], previewOf: 'undo' },
    homes: { ship: true, prs: true },
    context: {
      diet: { files: 2, size: '5.1k', heavy: true, repeats: 2, first: 'Always use short names', lines: ['~/.claude/CLAUDE.md: about 3.2k tokens, 120 lines (big)', 'CLAUDE.md: about 1.9k tokens, 80 lines'], advice: ['Together they are heavy: Claude re-reads about 5.1k tokens on every answer. Trim what you do not need in most sessions.', '2 lines appear in more than one file. Keep each rule in one place. First: "Always use short names"', '3 very long lines. Short lines are easier to keep right.'] },
      memory: { notes: 4 },
      brief: { on: true, work: true, unverified: 1 },
      keep: { goal: 'Add a dark mode toggle', branch: 'feat-x', files: 3, rest },
    },
    preview: { dev: { port: 5173, who: 'node', status: 200, words: ['Port 5173 answers (200).'], line: 'Port 5173 answers (200).' }, edits: 2, changed: true, auto: true },
    setup: { values: { 'compact.mode': 'auto', 'plan.first': 'ask', 'cap.mode': 'warn', 'cap.max': '3', 'setup.apply': 'off', 'setup.scope': 'project', 'setup.keep': 'none' }, read: { home: '/home/test', root: '/work/app', scope: 'project', disk: {} } as never },
    doc: { blocks: [{ n: 1, script: 'npm test', first: 'npm test', verdict: 'safe', why: [], outside: false }, { n: 2, script: 'rm -rf build', first: 'rm -rf build', verdict: 'risky', why: [], outside: false }], mode: 'ask' },
  } as CardCtx
}

const bodyOf = (w: WhatIs): string[] => whatIsLines(w, trFill)
function viewLines(v: LineCardView): string[] {
  return [
    v.title,
    v.blurb,
    v.short,
    ...v.lines,
    ...v.whats.flatMap(bodyOf),
    ...bodyOf(v.shortWhat),
    ...(v.groups ?? []).flatMap(g => [g.head, ...g.rows.flatMap(r => [r.title, r.right ?? '', ...bodyOf(r.what)])]),
    ...(v.pointer === undefined ? [] : [v.pointer.word]),
  ]
    .map(s => tr(s).trim())
    .filter(s => s !== '')
}

test('every line card built from realistic facts says nothing in English on a Swedish pane', () => {
  setLang('sv')
  try {
    const ctx: CardCtx = { ...allFacts(), t: tr }
    const lines = LINE_CARD_IDS.flatMap(id => lineCard(id, ctx).groups === undefined ? viewLines(lineCard(id, ctx)) : viewLines(lineCard(id, ctx)))
    const leaks = [...new Set(lines)].map(l => ({ l, w: englishIn(l) })).filter(x => x.w.length > 0)
    expect(leaks.map(x => `${x.w.join(',')}: ${x.l}`)).toEqual([])
    expect(lines.length).toBeGreaterThan(150)
  } finally {
    setLang('en')
  }
})

test('the ship verdict that the Pull requests card shows under a row is Swedish on a Swedish pane and English in the text twin', () => {
  const c = allFacts()
  const f = { proof: c.proof as never, confidence: { score: 10 } as never, ledger: c.ledger, now: NOW, doneOn: true }
  const en = shipText(ship(f))
  expect(en).toMatch(/Ship it: not yet\./)
  expect(en).toMatch(/- tests failed\. Run it again after the last edit\./)
  setLang('sv')
  try {
    const sv = shipText(ship(f, tr), tr)
    expect(sv).toMatch(/Leverera: inte än\./)
    expect(englishIn(sv)).toEqual([])
    expect(shipText(ship(f))).toBe(en)
  } finally {
    setLang('en')
  }
})

test('the stored checks of the rest rule, the diet lines and the helper agents are Swedish on the cards and unchanged in English', () => {
  const checks = [{ id: 'helpers', label: 'Nothing still runs', ok: false, value: '1 agent, 3 background commands' }, { id: 'work', label: 'No work is open', ok: false, value: 'files changed and no check ran, task list 2 of 5 done' }, { id: 'cache', label: 'The cache is still warm', ok: true, value: '4 min left' }]
  expect(restLines(checks)).toEqual(['✗ Nothing still runs: 1 agent, 3 background commands', '✗ No work is open: files changed and no check ran, task list 2 of 5 done', '✓ The cache is still warm: 4 min left'])
  setLang('sv')
  try {
    expect(restLines(checks, tr)).toEqual(['✗ Inget körs fortfarande: 1 agent, 3 bakgrundskommandon', '✗ Inget arbete är öppet: filer ändrade och ingen kontroll kördes, uppgiftslistan 2 av 5 klar', '✓ Cachen är fortfarande varm: 4 min kvar'])
    expect(dietWords('CLAUDE.md: about 3.2k tokens, 120 lines (big)', tr)).toBe('CLAUDE.md: ungefär 3.2k tokens, 120 rader (stor)')
    expect(dietWords('3 very long lines. Short lines are easier to keep right.', tr)).toBe('3 mycket långa rader. Korta rader är lättare att underhålla.')
  } finally {
    setLang('en')
  }
  expect(dietWords('CLAUDE.md: about 3.2k tokens, 120 lines (big)', s => s)).toBe('CLAUDE.md: about 3.2k tokens, 120 lines (big)')
})

test('the same cards in English are the English as before', () => {
  setLang('en')
  const ctx: CardCtx = { ...allFacts(), t: s => s }
  const lines = LINE_CARD_IDS.flatMap(id => viewLines(lineCard(id, ctx))).join('\n')
  for (const want of [/Where you left off and what waits/, /3 sessions use 4\.1 GB/, /Memory 88% · processor 67%/, /PR 12 is open\./, /Together they are heavy/, /Compact when idle, last look/, /2 agents, 1 background command/])
    expect(lines).toMatch(want)
  expect(lines).not.toMatch(/Gränser i din plan|väntar på|hjälpare|kontroller/)
})

test('the same draw in English still has its English', async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on, world('en', 'explained'))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const lines = (await seen($ as never)).join('\n')
  for (const want of [/Plan limits/, /This session/, /Other sessions/, /waits to run PowerShell, may need OK/, /Cache lapsed/, /What it means:/, /Where was I|Ship/, /Agents/])
    expect(lines).toMatch(want)
  expect(lines).not.toMatch(/Gränser i din plan|Den här sessionen|Andra sessioner|väntar på|hjälpare/)
})
