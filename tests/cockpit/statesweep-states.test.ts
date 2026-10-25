// State sweep: the states tests/statesweep.test.ts does not draw yet, built the same way.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { looked as pressLooked, pressProblems } from './presssizes'
import type { On } from 'claude-code'
import { posix } from './fspath'

import { APPEARS } from '../hooks/core/cardrules'
import { desired } from '../hooks/core/setupcard'
import { defaults } from '../hooks/core/settings'
import { openDayOf } from '../hooks/core/openends'
import { CALM_KEY } from '../hooks/core/calm'
import { DIGEST_KEY } from '../hooks/core/away'
import { PR_SHARED_KEY, parsePrView } from '../hooks/core/crewpr'
import { HISTORY_KEY, REPORT_KEY } from '../hooks/core/overnight'
import { TEMPLATES_KEY } from '../hooks/core/orchestra'
import { WOULD_WHAT } from '../hooks/core/compactrest'
import { BUNDLE_TTL_MS } from '../hooks/core/io'
import { setSetupExists } from '../hooks/features/setupfiles'
import { BORDER_X_PT, columnPt, LIST_ROW_H, LIST_ROW_PAD_PT, ROW_PT, TEXT_CHAR_PT, VSTEP_PT, columnsFor } from '../hooks/ui/tokens'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

let NOW = Date.parse('2026-10-11T12:00:00Z') // moves on between states (below), so the pane's kept readings are old when the next state mounts
const MIN = 60_000
const HOUR = 60 * MIN
const WIDTHS_PT = [400, 760, 1130, 2400]
const PRESS_ONLY_WIDTHS_PT = [294, 3440]
const HEIGHT_PT = 1400
const CLOSE = 0.01
// A state may draw more rows than the busy store, never more than the surface's budget.
const BOARD_ELEMENTS = 865
const VIEW_ELEMENTS = 440
// Ceilings of this file, measured and rounded up to the next 25.
const GLANCE_SHUT_ELEMENTS = 575
const GLANCE_OPEN_ELEMENTS = 1000
const TWELVE_TASKS_VIEW_ELEMENTS = 525
const ceilingOf = (view: string, state: string): number =>
  view === 'glance shut' ? GLANCE_SHUT_ELEMENTS : view === 'glance open' ? GLANCE_OPEN_ELEMENTS : view === 'view' ? (state.startsWith('twelve tasks') ? TWELVE_TASKS_VIEW_ELEMENTS : VIEW_ELEMENTS) : BOARD_ELEMENTS
const cutSeen = new Set<string>()
const looked = { chips: 0, rows: 0, picks: 0, texts: 0, rowsOfControls: 0 }
const HOME = '/home/test'
const ROOT = '/work/app'
const FENCE = '```'
const DUMP = false

type Mem = Map<string, unknown>
type Files = Map<string, string>
type Run = { exitCode: number; stdout: string }
type World = { mem: Mem; files: Files; listening: Record<number, string>; procs: Array<(argv: string[]) => Run | undefined> }

const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
const held = (session: string, what: string, ago: number, detail: string) => ({ at: NOW - ago, session, what, detail, how: 'auto', did: true })

function engine(on: On, w: World) {
  const { mem } = w
  const sent: string[] = []
  on('store.get', (_$, e) => ({ value: mem.has(e.key) ? JSON.parse(JSON.stringify(mem.get(e.key))) : undefined }) as never)
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
  on('session.cwd', () => ({ value: ROOT }) as never)
  on('session.root', () => ({ value: ROOT }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  on('fs.read', (_$, e) => {
    const t = w.files.get(posix((e as { path: string }).path))
    if (t === undefined) throw new Error('ENOENT: no such file')
    return { value: t } as never
  })
  on('fs.write', (_$, e) => {
    w.files.set(posix((e as { path: string }).path), (e as { text: string }).text)
    return { value: undefined } as never
  })
  on('fs.exists', (_$, e) => ({ value: w.files.has(posix((e as { path: string }).path)) }) as never)
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('prompt.submit', (_$, e) => {
    sent.push((e as { text: string }).text)
    return e as never
  })
  on('process.run', (_$, e) => {
    const argv = [...(e as unknown as { argv: string[] }).argv]
    const line = argv.join(' ')
    let r: Run | undefined
    for (const p of w.procs) r = r ?? p(argv)
    if (r === undefined && argv[0] === 'sh' && line.includes('$PPID')) r = { exitCode: 0, stdout: '4242\n' }
    if (r === undefined && argv[0] === 'git' && argv[1] === 'rev-parse' && argv[2] === '--abbrev-ref') r = { exitCode: 0, stdout: 'feat-x\n' }
    if (r === undefined && argv[0] === 'git' && argv[2] === '--git-common-dir') r = { exitCode: 0, stdout: '.git\n' }
    if (r === undefined && argv[0] === 'lsof' && line.includes('-d cwd')) r = { exitCode: 0, stdout: `p99\nfcwd\nn${ROOT}\n` }
    if (r === undefined && argv[0] === 'lsof') {
      const ports = Object.keys(w.listening)
      r = { exitCode: ports.length === 0 ? 1 : 0, stdout: ports.length === 0 ? '' : `COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME\n${ports.map(p => `node 99 me 20u IPv4 0x1 0t0 TCP localhost:${p} (LISTEN)`).join('\n')}\n` }
    }
    if (r === undefined && argv[0] === 'curl') r = { exitCode: 0, stdout: `${w.listening[Number(/localhost:(\d+)/.exec(line)?.[1])] ?? ''}\n200 0.02` }
    const out = r ?? { exitCode: 1, stdout: '' }
    return { value: { exitCode: out.exitCode, stdout: out.stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  return { sent }
}

type Node = { type?: string; key?: string; text?: string; props?: Record<string, unknown>; children?: unknown[] }
type Pane = { drawn: () => Promise<Node>; redraw: (p?: unknown) => Promise<void>; press: (q: unknown) => Promise<void>; find: (q: unknown) => Promise<unknown>; unmount: () => Promise<void> }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const strings = (n: Node): string[] => (n.children ?? []).filter((c): c is string => typeof c === 'string')
const nameOf = (x: Node): string => String(x.key ?? x.props?.key ?? '')
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
const propsAt = (wPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: wPt / columnPt(), placement: 'dock' as const, scroll: { bodyRows: Math.round(HEIGHT_PT / ROW_PT), offset: 0, total: 200 }, view: {} })
const textsOf = (root: Node): string[] => walk(root).flatMap(strings)
// The widest thing inside a part, in points: a Box or Client with a width in cells, or a picture's width.
const widest = (n: Node): number => Math.max(0, ...walk(n).slice(1).map(x => (x.type === 'Svg' ? num(x.props?.width) : num(x.props?.width) * columnPt())))
const pathTo = (t: Node, target: Node, path: Node[] = []): Node[] | undefined => {
  if (t === target) return path
  for (const c of kids(t)) {
    const r = pathTo(c, target, [...path, t])
    if (r) return r
  }
  return undefined
}

// The widest a part can be, in points, from its own props (as tests/settingslayout.test.ts): a picture's width.
function widthOf(n: Node): number {
  const p = n.props ?? {}
  if (n.type === 'Svg') return num(p.width)
  if (n.type === 'Button') return (String(p.label ?? '').length + 2) * columnPt()
  if (n.type === 'Text') return 0
  if (n.type === 'Box' && typeof p.width === 'number' && String((n as { key?: unknown }).key ?? p.key ?? '').startsWith('fcw-')) return p.width * columnPt()
  const parts = kids(n).filter(k => k.props?.position !== 'absolute').map(widthOf)
  const gap = num(p.columnGap) * columnPt()
  const inner = parts.length === 0 ? 0 : p.flexDirection === 'row' && p.flexWrap !== 'wrap' ? parts.reduce((a, b) => a + b, 0) + gap * (parts.length - 1) : Math.max(...parts)
  return Math.max(inner + (num(p.marginLeft) + num(p.marginRight)) * columnPt(), num(p.minWidth) * columnPt())
}

const KNOWN_LINES = Object.keys(SV).filter(k => k.length > 12)
const cutMemo = new Map<string, string | undefined>()
const cutInsideWord = (shown: string): string | undefined => {
  if (!shown.endsWith('…')) return undefined
  if (!cutMemo.has(shown)) cutMemo.set(shown, cutInsideWordOf(shown))
  return cutMemo.get(shown)
}
const cutInsideWordOf = (shown: string): string | undefined => {
  if (!shown.endsWith('…')) return undefined
  const head = shown.slice(0, -1)
  if (head.length < 8 || head.endsWith(' ')) return undefined
  return KNOWN_LINES.find(k => k.length > head.length && k.startsWith(head) && /[\p{L}\p{N}]/u.test(k[head.length] ?? ' '))
}

const BASE_SEEDS = (mem: Mem): void => {
  mem.clear()
  mem.set('cockpit:setting:look.view', 'custom')
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:detail', 'explained')
  for (const id of Object.keys(APPEARS)) mem.set(`cockpit:setting:cards.${id}`, 'show')
  mem.set('cockpit:session:test-session', rec('test-session', { cwd: ROOT, branch: 'feat-x', state: 'idle', title: 'Fix the login page', contextPercent: 41, costUsd: 0.8 }))
  mem.set('cockpit:projectof:test-session', ROOT)
}
const task = (n: number, text: string, state: string, over: Record<string, unknown> = {}) => ({ n, text, role: 'builder', model: 'auto', folder: false, state, tries: 0, check: 'none', ...over })
const choices = { atOnce: 3, check: 'npm test', reviewer: false, helperMin: 30, helperUsd: 2, runUsd: 10, afterLimit: 'go' }
const run = (status: string, tasks: unknown[], over: Record<string, unknown> = {}) => ({ id: 'r1', name: 'Tidy the app', status, createdAt: NOW - 50 * MIN, startedAt: NOW - 40 * MIN, choices, tasks, ...over })
const prRun = (name: string, conclusion: string | null) => ({ name, status: conclusion === null ? 'IN_PROGRESS' : 'COMPLETED', conclusion: conclusion ?? '', startedAt: '2026-10-11T11:40:00Z', completedAt: conclusion === null ? '0001-01-01T00:00:00Z' : '2026-10-11T11:50:00Z' })
const prView = (number: number, checks: ReturnType<typeof prRun>[], over: Record<string, unknown> = {}) => parsePrView({ number, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: `https://example.test/pull/${number}`, statusCheckRollup: checks, ...over })
const LONG = 'Rename the header component and every place that imports it, then update the screenshots in the readme and the notes for the next person to read'
type State = {
  name: string
  has: RegExp[]
  seed: (mem: Mem, w: World) => void
  before?: ($: EngineInterface) => Promise<void>
  open?: (ui: Pane) => Promise<void> // press a person would make to reach the state's view (a second pass is drawn there, after the board)
  leave?: (ui: Pane) => Promise<void>
  start?: (ui: Pane, clock: { settle: () => Promise<void> }) => Promise<void>
  band?: boolean
  viewHas?: RegExp[]
  rows?: RegExp
  inner?: RegExp
}
type EngineInterface = Parameters<Parameters<typeof test>[2]>[0]

const openRunner = async (ui: Pane) => {
  if ((await ui.find({ key: 'runner-open' })) === undefined) {
    await ui.press({ key: 'press-glance-agents-0' })
    await ui.redraw()
  }
  await ui.press({ key: 'runner-open' })
}
const leaveRunner = async (ui: Pane) => ui.press({ key: 'runner-done' })
const manyTasks = Array.from({ length: 12 }, (_, i) => task(i + 1, i % 3 === 0 ? LONG : `Task number ${i + 1} on the settings page`, i < 4 ? 'done' : i < 7 ? 'running' : i === 7 ? 'failed' : 'waiting', i < 4 ? { check: 'passed', usd: 0.2 } : i === 7 ? { why: 'the build broke on the first page', tries: 1, check: 'failed' } : {}))

const warned = (what: string, ago: number, detail: string, session = 'test-session') => ({ at: NOW - ago, session, what, detail, how: 'auto', did: true })
type Line = { n: number; text: string; state: string; check: string; why?: string; usd?: number }
const outcome = (name: string, status: 'done' | 'stopped', tasks: Line[], usd: number) => {
  const done = tasks.filter(t => t.state === 'done' && t.check !== 'failed').length
  const failed = tasks.filter(t => t.state === 'failed' || t.check === 'failed').length
  return { id: 'r1', name, startedAt: NOW - 40 * MIN, endedAt: NOW - 5 * MIN, status, done, failed, other: tasks.length - done - failed, usd, tasks: tasks.map(t => ({ n: t.n, text: t.text, state: t.state, check: t.check, ...(t.why === undefined ? {} : { why: t.why }), ...(t.usd === undefined ? {} : { usd: t.usd }) })) }
}
// A run that ended: the run is kept in the store as the pane would hold it, the report is on show.
const endedRun = (mem: Mem, runStatus: 'done' | 'stopped', tasks: Line[], usd: number): void => {
  mem.set('cockpit:orch:test-session', run(runStatus, tasks))
  mem.set(HISTORY_KEY, [outcome('Tidy the app', runStatus, tasks, usd)])
  mem.set(REPORT_KEY, 'r1')
}
const REPORT_PRESSES = /^press-rv-(t|past)-/

const STATES: State[] = [
  {
    name: 'model-fit undo row (Lowered the effort, Back to high)',
    has: [/Lowered the effort/, /Back to high/],
    rows: /^press-o-t1/,
    seed: mem => {
      mem.set('cockpit:pref:lists', { others: 'all' })
      mem.set('cockpit:setting:hints.model', 'on')
      mem.set('cockpit:session:t1', rec('t1', { state: 'waiting', title: 'A search through the docs of the whole app that has a rather long title', fit: { looks: NOW - 10 * MIN, many: true, effort: 'high' } }))
    },
    start: async (ui, clock) => {
      await ui.press({ key: 'press-o-t1-0' })
      await clock.settle()
      await ui.redraw()
      await ui.press({ key: 'press-ol-fit:t1-0' })
      await clock.settle()
    },
  },
  {
    name: 'compaction ask-once (Vaken can compact the session)',
    has: [/Vaken can compact the session at good moments\. Let it\?/],
    rows: /^press-ol-here/,
    seed: mem => {
      mem.set('cockpit:setting:compact.mode', 'watch')
      mem.set('cockpit:ledger:compact', [3, 5, 8].map(m => ({ at: NOW - m * MIN, session: 'test-session', what: WOULD_WHAT, detail: 'The chat is 62% full and the work is at a rest', how: 'auto', did: false })))
    },
  },
  {
    name: 'dev server listening but silent (Preview)',
    has: [/Port 5173/, /no answer/],
    rows: /^press-ol-preview:/,
    seed: (_mem, w) => {
      w.listening = { 5173: '' }
      w.procs.push(argv => (argv[0] === 'curl' ? { exitCode: 28, stdout: '' } : undefined))
    },
  },
  {
    name: 'dev server up but the page shows an error (Preview)',
    has: [/Port 5173/, /error · 200/],
    rows: /^press-ol-preview:/,
    seed: (_mem, w) => {
      w.listening = { 5173: '<html><body>Internal Server Error</body></html>' }
    },
  },
  {
    name: 'dev server down (Preview)',
    has: [/No dev server/],
    rows: /^press-ol-preview:/,
    seed: () => {},
  },
  {
    name: 'Guard warnings grouped, several of one kind (Safety)',
    has: [/Safety/, /14 warnings today/],
    rows: /^press-ol-safety:/,
    seed: mem => {
      mem.set('cockpit:ledger:compact', [
        ...[1, 3, 4, 6, 9, 11, 14].map(m => warned('Warned about a risky command', m * MIN, 'This would delete files in a folder outside the work folder, including the whole archive of last year')),
        ...[2, 5, 7, 13].map(m => warned('Warned about a package install', m * MIN, 'A package that is very young and has a name like a well known one')),
        ...[8, 12].map(m => warned('Warned about an edit outside the fence', m * MIN, 'An edit of a file in another project')),
        warned('Warned about a weakened test', 10 * MIN, 'A test that was skipped'),
        held('test-session', 'Held a risky command', 15 * MIN, 'This would delete files.'),
      ])
    },
  },
  {
    name: 'run report: all tasks done',
    inner: REPORT_PRESSES,
    has: [/Agents/],
    // The bar line says "3 of 3 done"; the line under it no longer repeats "All 3 done"
    viewHas: [/3 of 3 done/],
    seed: mem => endedRun(mem, 'done', [{ ...task(1, 'Rename the header component', 'done', { check: 'passed', usd: 0.21 }) }, task(2, LONG, 'done', { check: 'passed', usd: 0.4 }), task(3, 'Update the readme', 'done', { check: 'passed', usd: 0.12, after: 2 })] as Line[], 0.73),
    open: openRunner,
    leave: leaveRunner,
  },
  {
    name: 'run report: every task failed',
    inner: REPORT_PRESSES,
    has: [/Agents/],
    viewHas: [/3 failed/],
    seed: mem => endedRun(mem, 'done', [task(1, 'Rename the header component', 'failed', { why: 'no folder copy: the folder is not a git folder', tries: 2, check: 'failed' }), task(2, LONG, 'failed', { why: 'the build broke on the second page and the rest of the long reason goes on', tries: 2, check: 'failed' }), task(3, 'Update the readme', 'failed', { why: 'the agent did not start: the plan limit is used', tries: 1, check: 'none' })] as Line[], 0.9),
    open: openRunner,
    leave: leaveRunner,
  },
  {
    name: 'run report: stopped by a dollar stop',
    inner: REPORT_PRESSES,
    has: [/Agents/],
    viewHas: [/1\u00a0stopped, 1\u00a0not\u00a0run/],
    seed: mem => endedRun(mem, 'stopped', [task(1, 'Rename the header component', 'done', { check: 'passed', usd: 4.1 }), task(2, LONG, 'stopped', { why: 'cost past $2.00', usd: 2.3, check: 'none' }), task(3, 'Update the readme', 'skipped', { why: 'task 2 did not pass', after: 2 })] as Line[], 6.4),
    open: openRunner,
    leave: leaveRunner,
  },
  {
    name: 'run report: stopped by the person',
    inner: REPORT_PRESSES,
    has: [/Agents/],
    viewHas: [/1\u00a0stopped, 1\u00a0not\u00a0run/],
    seed: mem => endedRun(mem, 'stopped', [task(1, 'Rename the header component', 'done', { check: 'passed', usd: 0.21 }), task(2, LONG, 'stopped', { why: 'you stopped the run', check: 'none' }), task(3, 'Update the readme', 'waiting', { after: 2 })] as Line[], 0.21),
    open: openRunner,
    leave: leaveRunner,
  },
]

function check(root: Node, w: number, at: string, problems: string[], view: string, state: string): void {
  const nodes = walk(root)
  looked.texts += nodes.filter(x => x.type === 'Text').length
  if (widest(root) > w + CLOSE) problems.push(`${at}: something ${widest(root)} pt wide`)
  const columnsRow = nodes.find(x => nameOf(x) === 'columns')
  const columnList = columnsRow === undefined ? [] : kids(columnsRow)
  for (const c of columnList) if (widest(c) > num(c.props?.width) * columnPt() + CLOSE) problems.push(`${at}: a card ${widest(c)} pt in a column of ${num(c.props?.width) * columnPt()} pt`)
  // The pane's own width for a word: the column when the board is in columns, else the pane.
  const cap = nodes.find(x => nameOf(x).startsWith('cap-') && num(x.props?.width) > 0)
  const roomPt = columnList.length > 0 ? num(columnList[0]?.props?.width) * columnPt() - 2 * BORDER_X_PT : cap !== undefined ? num(cap.props?.width) * columnPt() - 2 * BORDER_X_PT : w - 2 * BORDER_X_PT
  for (const b of nodes.filter(x => x.type === 'Button')) {
    for (const s of [...(typeof b.props?.label === 'string' ? [b.props.label] : []), ...strings(b)]) if (s.includes('…')) problems.push(`${at}: a cut label "${s}"`)
  }
  for (const t of nodes.filter(x => x.type === 'Text')) for (const s of strings(t)) if (/^\S+ \S{0,6}…$/.test(s) && s.length < 12) problems.push(`${at}: a stub "${s}"`)
  for (const t of nodes.filter(x => x.type === 'Text')) for (const s of strings(t)) {
    const whole = cutInsideWord(s.trim())
    if (whole !== undefined) problems.push(`${at}: the line "${whole}" is cut inside a word: "${s.trim()}"`)
  }
  // A word that cannot wrap and is wider than its card: the app would cut it with no ellipsis (a Text without a truncate rule).
  for (const t of nodes.filter(x => x.type === 'Text')) {
    const rule = String(t.props?.wrap ?? '')
    if (rule.startsWith('truncate') || (pathTo(root, t) ?? []).some(a => /^w-|-open$/.test(nameOf(a)))) continue
    for (const s of strings(t)) for (const word of s.split(/\s+/)) if (word.length * TEXT_CHAR_PT > roomPt) problems.push(`${at}: the word "${word.slice(0, 30)}…" (${word.length} letters) is wider than its card (${Math.round(roomPt)} pt) and has no cut rule`)
  }
  for (const row of nodes.filter(x => x.props?.flexDirection === 'row' && x.props?.flexWrap !== 'wrap' && nameOf(x) !== 'columns')) {
    const wide = widthOf(row)
    looked.rowsOfControls += 1
    if (wide > roomPt + 2 * BORDER_X_PT + CLOSE) problems.push(`${at}: a row of controls "${nameOf(row) || 'unnamed'}" is ${Math.round(wide)} pt wide in a card of ${Math.round(roomPt + 2 * BORDER_X_PT)} pt`)
  }
  for (const line of nodes.filter(x => nameOf(x).endsWith('-pick-line'))) {
    looked.picks += 1
    if (walk(line).filter(x => x.type === 'Button').length < 2) problems.push(`${at}: ${nameOf(line)} has a lone option`)
    if (widest(line) > w + CLOSE) problems.push(`${at}: ${nameOf(line)} is ${widest(line)} pt wide`)
  }
  for (const pk of nodes.filter(x => nameOf(x).startsWith('pk-'))) {
    const lines = kids(pk)
    if (lines.length > 1) for (const line of lines) if (walk(line).filter(x => x.type === 'Button').length < 2) problems.push(`${at}: ${nameOf(pk)} has a lone option on a line`)
  }
  for (const chip of nodes.filter(x => /^(chip|count|fresh)-/.test(nameOf(x)))) {
    looked.chips += 1
    const up = pathTo(root, chip) ?? []
    if (!up.some(a => /^(card|glance|settings)-|^cap-|^columns$/.test(nameOf(a)))) problems.push(`${at}: the chip "${nameOf(chip)}" sits in no card`)
    const wide = widest(chip)
    if (wide > w + CLOSE) problems.push(`${at}: the chip "${nameOf(chip)}" is ${wide} pt wide`)
  }
  // The list grid: a list row is 26 pt high (a row of two lines 52), never a part of a row between.
  for (const r of nodes.filter(x => /^ol-|^ls-|^row-/.test(nameOf(x)) && num(x.props?.minHeight) > 0)) {
    const h = num(r.props?.minHeight) * ROW_PT - (num(r.props?.paddingTop) + num(r.props?.paddingBottom)) * VSTEP_PT
    // A row is n text lines and the padding (19 n + 7: 26, 45, 64 pt) or n list rows (26, 52 pt, a row with a second line).
    const steps = h / LIST_ROW_H
    const lines = (h - LIST_ROW_PAD_PT) / ROW_PT
    looked.rows += 1
    if (Math.abs(steps - Math.round(steps)) > 0.05 && Math.abs(lines - Math.round(lines)) > 0.05) problems.push(`${at}: the row "${nameOf(r)}" is ${Math.round(h * 10) / 10} pt high, off the 26 pt grid`)
  }
  pressProblems(root, at, problems)
  const ceiling = ceilingOf(view, state)
  if (nodes.length > ceiling) problems.push(`${at}: ${nodes.length} elements, the ceiling is ${ceiling}`)
}

async function sweep(ui: Pane, state: State, view: string, problems: string[], seen: string[], out: string[]): Promise<void> {
  const draw = async (what: string) => {
    for (const width of WIDTHS_PT) {
      await ui.redraw(propsAt(width))
      const root = await ui.drawn()
      const at = `${state.name}, ${view}${what} at ${width} pt`
      const texts = textsOf(root)
      if (what === '') for (const re of view === 'board' ? state.has : view === 'view' ? (state.viewHas ?? []) : []) if (!texts.some(t => re.test(t))) problems.push(`${at}: the state is not on screen (no text ${re})`)
      if (DUMP && what !== '' && width === 1130 && state.name.startsWith('a waiting')) out.push(`[AFTER${what}] ${[...new Set(texts)].join(' | ')}`)
      if (DUMP && what === '') out.push(`${at}: ${walk(root).length} elements; ${texts.length} texts`)
      check(root, width, at, problems, view, state.name)
      if (DUMP) for (const t of texts) if (t.endsWith('…')) cutSeen.add(`${width}|${t}`)
      seen.push(at)
    }
    for (const width of PRESS_ONLY_WIDTHS_PT) {
      await ui.redraw(propsAt(width))
      pressProblems(await ui.drawn(), `${state.name}, ${view}${what} at ${width} pt`, problems)
    }
  }
  await draw('')
  if (DUMP) {
    const root = await ui.drawn()
    out.push(`[${state.name} / ${view}] ${[...new Set(textsOf(root))].slice(0, 400).join(' | ')}`)
    out.push(`KEYS ${[...new Set(walk(root).map(nameOf).filter(k => /(chip|count|fresh|pk-|pick)/.test(k)))].slice(0, 80).join(' ')}`)
  }
  const want = view === 'board' ? state.rows : state.inner
  if (want !== undefined) {
    const pressed = new Set<string>()
    let last = ''
    for (let round = 0; round < 3; round += 1) {
      await ui.redraw(propsAt(1130))
      const keys = [...new Set(walk(await ui.drawn()).map(nameOf).filter(k => want.test(k) && !pressed.has(k)))]
      for (const key of keys) {
        await ui.redraw(propsAt(1130))
        if ((await ui.find({ key })) === undefined) continue
        pressed.add(key)
        last = key
        await ui.press({ key })
        await ui.redraw()
        await draw(` after "${key}"`)
      }
      if (keys.length === 0) break
    }
    if (last !== '') {
      await ui.redraw(propsAt(1130))
      if ((await ui.find({ key: last })) !== undefined) await ui.press({ key: last })
    }
  }
}

test('the states statesweep.test.ts does not draw, at 400 to 2400 pt: the layout rules hold and the state is on screen', { timeoutMs: 600_000 }, async ($, on) => {
  const w: World = { mem: new Map<string, unknown>([['cockpit:setting:look.view', 'custom']]), files: new Map(), listening: {}, procs: [] }
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  engine(on, w)
  on('mcp.call', (_$, e) => ({ value: { content: [{ type: 'text', text: e.tool === 'get_session' ? JSON.stringify({ model: 'claude-opus-5', effort: 'high' }) : 'ok' }], isError: false } }) as never)
  setSetupExists(async p => w.files.has(p))
  const mount = (width: number) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(width) }) as unknown as Promise<Pane>
  const problems: string[] = []
  const seen: string[] = []
  const out: string[] = []
  for (const state of STATES) {
    await clock.advance(BUNDLE_TTL_MS + 10 * MIN)
    NOW = clock.now()
    w.files = new Map()
    w.listening = {}
    w.procs = []
    BASE_SEEDS(w.mem)
    state.seed(w.mem, w)
    await state.before?.($)
    const first = await mount(1130)
    await state.start?.(first, clock)
    await clock.settle()
    await first.unmount()
    const board = await mount(1130)
    await sweep(board, state, 'board', problems, seen, out)
    await board.unmount()
    await clock.advance(BUNDLE_TTL_MS + 1)
    w.mem.set('cockpit:setting:detail', 'glance')
    const shut = await mount(1130)
    await sweep(shut, state, 'glance shut', problems, seen, out)
    await shut.unmount()
    const open = await mount(1130)
    await open.redraw(propsAt(1130))
    for (const key of [...new Set(walk(await open.drawn()).map(nameOf).filter(k => /^press-glance-/.test(k)))]) {
      if ((await open.find({ key })) !== undefined) await open.press({ key })
      await open.redraw()
    }
    await sweep(open, state, 'glance open', problems, seen, out)
    for (const key of [...new Set(walk(await open.drawn()).map(nameOf).filter(k => /^press-glance-/.test(k)))]) if ((await open.find({ key })) !== undefined) await open.press({ key })
    await open.unmount()
    await clock.advance(BUNDLE_TTL_MS + 1)
    w.mem.set('cockpit:setting:detail', 'explained')
    if (state.open !== undefined) {
      const prep = await mount(1130)
      await state.open(prep)
      await prep.unmount()
      const view = await mount(1130)
      await sweep(view, state, 'view', problems, seen, out)
      await view.unmount()
    }
    if (state.leave !== undefined) {
      const back = await mount(1130)
      await state.leave(back)
      await back.unmount()
    }
  }
  if (DUMP) console.log(out.join('\n'))
  expect(seen.length).toBeGreaterThan(STATES.length * WIDTHS_PT.length)
  expect(looked.rows).toBeGreaterThan(200)
  expect(looked.texts).toBeGreaterThan(1000)
  expect(pressLooked.words).toBeGreaterThan(20)
  expect(pressLooked.pairs).toBeGreaterThan(5)
  expect([...new Set(problems)]).toEqual([])
})

