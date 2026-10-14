// The shared made-up states of the state sweeps: the world (store, files, processes) and its engine, the tree helpers.
import { test } from './slow'
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
import { bandKey } from '../hooks/core/band'
import { COL_PT, ROW_PT } from '../hooks/ui/tokens'

export let NOW = Date.parse('2026-10-11T12:00:00Z') // moves on between states (below), so the pane's kept readings are old when the next state mounts
export const MIN = 60_000
export const HOUR = 60 * MIN

export const HEIGHT_PT = 1400

export const HOME = '/home/test'
export const ROOT = '/work/app'
export const FENCE = '```'

export type Mem = Map<string, unknown>
export type Files = Map<string, string>
export type Run = { exitCode: number; stdout: string }
export type World = { mem: Mem; files: Files; listening: Record<number, string>; procs: Array<(argv: string[]) => Run | undefined> }

export const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
export const held = (session: string, what: string, ago: number, detail: string) => ({ at: NOW - ago, session, what, detail, how: 'auto', did: true })

export function engine(on: On, w: World) {
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

export type Node = { type?: string; key?: string; text?: string; props?: Record<string, unknown>; children?: unknown[] }
export type Pane = { drawn: (scope?: { in: string }) => Promise<Node>; pointer: (e: unknown) => Promise<void>; redraw: (p?: unknown) => Promise<void>; press: (q: unknown) => Promise<void>; find: (q: unknown) => Promise<unknown>; unmount: () => Promise<void> }
export const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
export const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
export const strings = (n: Node): string[] => (n.children ?? []).filter((c): c is string => typeof c === 'string')
export const nameOf = (x: Node): string => String(x.key ?? x.props?.key ?? '')
export const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
export const propsAt = (wPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: wPt / COL_PT, placement: 'dock' as const, scroll: { bodyRows: Math.round(HEIGHT_PT / ROW_PT), offset: 0, total: 200 }, view: {} })
export const textsOf = (root: Node): string[] => walk(root).flatMap(strings)
// The widest thing inside a part, in points: a Box or Client with a width in cells, or a picture's width.
export const widest = (n: Node): number => Math.max(0, ...walk(n).slice(1).map(x => (x.type === 'Svg' ? num(x.props?.width) : num(x.props?.width) * COL_PT)))
export const pathTo = (t: Node, target: Node, path: Node[] = []): Node[] | undefined => {
  if (t === target) return path
  for (const c of kids(t)) {
    const r = pathTo(c, target, [...path, t])
    if (r) return r
  }
  return undefined
}

export const BASE_SEEDS = (mem: Mem): void => {
  mem.clear()
  mem.set('cockpit:setting:look.view', 'custom')
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:detail', 'explained')
  for (const id of Object.keys(APPEARS)) mem.set(`cockpit:setting:cards.${id}`, 'show')
  mem.set('cockpit:session:test-session', rec('test-session', { cwd: ROOT, branch: 'feat-x', state: 'idle', title: 'Fix the login page', contextPercent: 41, costUsd: 0.8 }))
  mem.set('cockpit:projectof:test-session', ROOT)
}
export const task = (n: number, text: string, state: string, over: Record<string, unknown> = {}) => ({ n, text, role: 'builder', model: 'auto', folder: false, state, tries: 0, check: 'none', ...over })
export const choices = { atOnce: 3, check: 'npm test', reviewer: false, helperMin: 30, helperUsd: 2, runUsd: 10, afterLimit: 'go' }
export const run = (status: string, tasks: unknown[], over: Record<string, unknown> = {}) => ({ id: 'r1', name: 'Tidy the app', status, createdAt: NOW - 50 * MIN, startedAt: NOW - 40 * MIN, choices, tasks, ...over })
export const prRun = (name: string, conclusion: string | null) => ({ name, status: conclusion === null ? 'IN_PROGRESS' : 'COMPLETED', conclusion: conclusion ?? '', startedAt: '2026-10-11T11:40:00Z', completedAt: conclusion === null ? '0001-01-01T00:00:00Z' : '2026-10-11T11:50:00Z' })
export const prView = (number: number, checks: ReturnType<typeof prRun>[], over: Record<string, unknown> = {}) => parsePrView({ number, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: `https://example.test/pull/${number}`, statusCheckRollup: checks, ...over })
export const LONG = 'Rename the header component and every place that imports it, then update the screenshots in the readme and the notes for the next person to read'
export const proofState = () => ({
  seq: 9,
  lastEditSeq: 8,
  edits: 4,
  files: ['a1b2c3', 'd4e5f6'],
  receipts: [{ kind: 'tests', ok: false, exit: 1, at: NOW - 6 * MIN, seq: 6 }, { kind: 'lint', ok: true, exit: 0, at: NOW - 30 * MIN, seq: 2 }],
  turnStartSeq: 3,
  turnEdits: 2,
  turnFiles: ['a1b2c3'],
  turns: 3,
  last: {
    at: NOW - 5 * MIN,
    seconds: 140,
    edits: 4,
    files: 2,
    ran: [{ kind: 'tests', status: 'failed', exit: 1, at: NOW - 6 * MIN }, { kind: 'lint', status: 'stale', at: NOW - 30 * MIN }],
    diff: { files: 2, lines: 48 },
    claims: ['tests', 'done'],
    unproven: [{ kind: 'tests', why: 'failed' }, { kind: 'build', why: 'missing' }, { kind: 'done', why: 'notdone' }],
    notChecked: ['build', 'types'],
    editedFile: 'LoginForm.tsx',
    doneSet: ['tests', 'build'],
    doneMet: false,
  },
  done: ['tests', 'build'],
  doneSeen: false,
  debt: 2,
  lastEditFile: 'LoginForm.tsx',
  note: ['tests'],
  goal: { text: 'Make the login page keep the typed address when the password is wrong, and show the error under the right box', setAt: NOW - 50 * MIN, how: 'typed' },
  messages: 3,
  todo: { done: 2, total: 5 },
})
export const SHELL = (...blocks: string[]): string => `Do these in order:\n${blocks.map(b => `${FENCE}bash\n${b}\n${FENCE}`).join('\n')}`
export const SETUP_BASE: Record<string, string> = { [`${ROOT}/CLAUDE.md`]: 'Never more than two agents at once.\n', [`${ROOT}/.claude/agents/vaken-builder.md`]: 'my own builder, written by hand\n' }

export type State = {
  name: string
  has: RegExp[]
  seed: (mem: Mem, w: World) => void
  before?: ($: EngineInterface) => Promise<void>
  open?: (ui: Pane) => Promise<void> // press a person would make to reach the state's view (a second pass is drawn there, after the board)
  leave?: (ui: Pane) => Promise<void>
  start?: (ui: Pane) => Promise<void>
  band?: boolean
  viewHas?: RegExp[]
  rows?: RegExp
  inner?: RegExp
}
export type EngineInterface = Parameters<Parameters<typeof test>[2]>[0]

export const openRunner = async (ui: Pane) => {
  if ((await ui.find({ key: 'runner-open' })) === undefined) {
    await ui.press({ key: 'press-glance-agents-0' })
    await ui.redraw()
  }
  await ui.press({ key: 'runner-open' })
}
export const leaveRunner = async (ui: Pane) => ui.press({ key: 'runner-done' })
export const manyTasks = Array.from({ length: 12 }, (_, i) => task(i + 1, i % 3 === 0 ? LONG : `Task number ${i + 1} on the settings page`, i < 4 ? 'done' : i < 7 ? 'running' : i === 7 ? 'failed' : 'waiting', i < 4 ? { check: 'passed', usd: 0.2 } : i === 7 ? { why: 'the build broke on the first page', tries: 1, check: 'failed' } : {}))

export const STATES: State[] = [
  {
    name: 'held steps (Needs you, Guard, Safety)',
    rows: /^press-ol-(needs|safety|guard):/,
    has: [/Stopped a risky command/, /Needs you/],
    seed: mem => {
      mem.set('cockpit:ledger:compact', [
        held('test-session', 'Held a risky command', 4 * MIN, 'This would delete files in a folder outside the work folder, including the whole archive of last year'),
        held('test-session', 'Held a package install', 9 * MIN, 'An install of a package that is not in the lock file'),
        held('test-session', 'Held an edit outside the fence', 12 * MIN, 'An edit of a file in another project'),
        held('s1', 'Held a risky command', 3 * MIN, 'This would delete files.'),
        held('s2', 'Held an extra agent', 2 * MIN, 'Three agents run.'),
      ])
      mem.set('cockpit:guard:held:test-session', { at: NOW - 4 * MIN, step: 'call-1', keys: ['destructive'], words: 'rm -rf ../archive' })
      mem.set('cockpit:session:s1', rec('s1', { cwd: '/work/site', title: 'Web fixes', state: 'working' }))
      mem.set('cockpit:session:s2', rec('s2', { cwd: '/work/docs', title: 'Write the user guide for the new settings page', state: 'working' }))
      mem.set('cockpit:halt:s1', { at: NOW - 2 * MIN })
    },
  },
  {
    name: 'halted session with named checkpoints (Safety)',
    rows: /^press-ol-safety:/,
    has: [/Resume/],
    seed: mem => {
      mem.set('cockpit:halt:test-session', { at: NOW - 3 * MIN })
      mem.set('cockpit:undo:named:test-session', [
        { name: 'before the big rename of every component in the app folder', at: NOW - 2 * HOUR, items: [{ path: `${ROOT}/src/App.tsx`, snap: 1 }, { path: `${ROOT}/src/Header.tsx`, snap: 2 }] },
        { name: 'first draft', at: NOW - 5 * HOUR, items: [{ path: `${ROOT}/src/App.tsx`, snap: 3 }] },
      ])
    },
  },
  {
    name: 'goal and checks (Proof)',
    rows: /^press-ol-(proof|ship|context):/,
    has: [/Checks/, /Make the/],
    seed: mem => {
      mem.set('cockpit:proof:test-session', proofState())
    },
  },
  {
    name: 'agent setup conflict and drift',
    has: [/Your instructions say at most 2 agents/],
    rows: /^(press-ol-setup:|morel-setup)/,
    has: [/Agent setup/],
    seed: (mem, w) => {
      w.files = new Map(Object.entries(SETUP_BASE))
      mem.set('cockpit:setting:cap.max', 'n3')
      mem.set('cockpit:setting:setup.apply', 'on')
    },
  },
  {
    name: 'agent setup drift (a written file that differs)',
    has: [/Agent setup/, /Update…/],
    rows: /^(press-ol-setup:|morel-setup)/,
    seed: (mem, w) => {
      // Every file the cockpit would write, as it would write it, and one of them edited by hand: a drift with no conflict.
      const files = Object.fromEntries(desired({ ...defaults(), 'setup.apply': 'on' }, HOME, ROOT, 'project').map(d => [d.path, d.text]))
      const researcher = `${ROOT}/.claude/agents/vaken-researcher.md`
      files[researcher] = (files[researcher] ?? '').replace('haiku', 'opus')
      w.files = new Map(Object.entries(files))
      mem.set('cockpit:setting:setup.apply', 'on')
    },
  },
  {
    name: 'open ends and the away digest (Where was I)',
    rows: /^press-ol-back:/,
    has: [/Where was I/, /app: tests and the build failed/],
    seed: mem => {
      mem.set('cockpit:session:test-session', rec('test-session', { cwd: ROOT, branch: 'feat-x', state: 'idle', lastEventAt: NOW - 2 * HOUR, stateSince: NOW - 2 * HOUR }))
      mem.set(CALM_KEY, {
        open: {
          day: openDayOf(NOW),
          ends: [
            { project: 'app', failed: ['tests', 'build'], held: 2, tasks: 0, midTurn: 1 },
            { project: 'site', failed: [], held: 0, tasks: 2, midTurn: 0 },
            { project: 'a-project-with-a-rather-long-folder-name', failed: ['lint'], held: 1, tasks: 3, midTurn: 0 },
          ],
          more: 4,
          dismissed: false,
        },
      })
      mem.set(DIGEST_KEY, { at: NOW - HOUR, from: NOW - 3 * HOUR, to: NOW - HOUR, text: 'While you were away (2 h): 2 sessions finished, 1 risky step was stopped.\n\nWaiting for you:\n- web fixes: asks a question about the long name of a setting\n\nVaken also did this: Compacted a long chat.' })
    },
  },
  {
    name: 'run paused for the plan limit',
    inner: /^press-rv-(t|past)-/,
    has: [/Agents/],
    seed: mem => {
      mem.set('cockpit:orch:test-session', run('paused', [task(1, 'Rename the header component', 'done', { check: 'passed' }), task(2, LONG, 'waiting'), task(3, 'Update the readme', 'waiting', { after: 2 })], { resumeAt: NOW + 90 * MIN }))
    },
    open: openRunner,
    leave: leaveRunner,
  },
  {
    name: 'run finished with a failed task (report, Agents view)',
    inner: /^press-rv-(t|past)-/,
    has: [/Agents/],
    seed: mem => {
      const tasks = [task(1, 'Rename the header component', 'done', { check: 'passed', usd: 0.21 }), task(2, LONG, 'failed', { why: 'the build broke on the second page and the rest of the long reason goes on', tries: 2, check: 'failed' }), task(3, 'Update the readme', 'stopped')]
      mem.set('cockpit:orch:test-session', run('done', tasks))
      mem.set(HISTORY_KEY, [{ id: 'r1', name: 'Tidy the app', startedAt: NOW - 40 * MIN, endedAt: NOW - 5 * MIN, status: 'done', done: 1, failed: 1, other: 1, usd: 0.21, tasks: tasks.map(t => ({ n: t.n, text: t.text, state: t.state, check: t.check, ...(t.why === undefined ? {} : { why: t.why }) })) }])
      mem.set(REPORT_KEY, 'r1')
    },
    open: openRunner,
    leave: leaveRunner,
  },
  {
    name: 'run being set up (with check lines)',
    inner: /^press-rv-(t|past)-/,
    has: [/Agents/],
    seed: mem => {
      mem.set('cockpit:orch:test-session', run('setup', [task(1, LONG, 'waiting'), task(2, 'Check the build on a clean folder', 'waiting', { after: 1, folder: true })], { startedAt: undefined }))
    },
    open: openRunner,
    leave: leaveRunner,
  },
  {
    name: 'twelve tasks, long names, saved templates and past runs',
    viewHas: [/weekly tidy of the whole app/, /Past runs/, /A run with a name that is long/],
    inner: /^press-rv-(t|past)-/,
    has: [/Agents/],
    seed: mem => {
      mem.set('cockpit:orch:test-session', run('running', manyTasks))
      mem.set(TEMPLATES_KEY, { 'weekly tidy of the whole app': { tasks: ['Rename a thing', 'Fix a date (after 1)'], choices }, 'release notes': { tasks: ['Write the notes'], choices }, 'a template whose name is rather long to see how it is cut': { tasks: ['One'], choices } })
      const past = (id: string, name: string, failed: number, ago: number) => ({ id, name, startedAt: NOW - ago - 30 * MIN, endedAt: NOW - ago, status: id === 'p3' ? 'stopped' : 'done', done: 3, failed, other: 0, usd: 1.4, tasks: [{ n: 1, text: LONG, state: 'done', check: 'passed' }, { n: 2, text: 'Fix the date', state: failed > 0 ? 'failed' : 'done', check: failed > 0 ? 'failed' : 'passed', ...(failed > 0 ? { why: 'the build broke' } : {}) }] })
      mem.set(HISTORY_KEY, [past('p1', 'Tidy the app', 0, 3 * HOUR), past('p2', 'A run with a name that is long enough to be cut somewhere', 1, 30 * HOUR), past('p3', 'Docs', 2, 80 * HOUR)])
    },
    open: openRunner,
    leave: leaveRunner,
  },
  {
    name: 'posted band lines (one risk and what vaken did)',
    has: [/risky step was stopped/],
    band: true,
    rows: /^press-ol-band:/,
    seed: mem => {
      mem.set(bandKey('test-session'), [
        { id: 'guard', level: 'warn', text: 'A risky step was stopped: it would have deleted a folder outside the work folder and everything in it', at: NOW - MIN, ttlMs: 10 * MIN },
        { id: 'did:compact', level: 'info', text: 'Shortened the chat for you, saved about 40k', at: NOW - 2 * MIN, ttlMs: 10 * MIN },
        { id: 'limit', level: 'urgent', text: 'The 5-hour limit is 94% used', at: NOW - 3 * MIN, ttlMs: 20 * MIN },
      ])
    },
  },
  {
    name: 'dev server answers (Preview)',
    rows: /^press-ol-preview:/,
    has: [/Port 5173/],
    seed: (_mem, w) => {
      w.listening = { 5173: '<html>ok</html>' }
    },
  },
  {
    name: 'pull requests (failing, running, many repositories)',
    rows: /^press-ol-(prs|ship):/,
    has: [/Pull requests/, /#12/],
    seed: mem => {
      const f = (at: number, branch: string, v: ReturnType<typeof prView>) => ({ at, branch, view: v })
      mem.set(PR_SHARED_KEY, {
        '/work/app/.git\nfeat-x': f(NOW - 2 * MIN, 'feat-x', prView(12, [prRun('unit', 'FAILURE'), prRun('lint', 'SUCCESS')])),
        '/work/app/.git\nfix-y': f(NOW - 5 * MIN, 'fix-y', prView(9, [prRun('unit', 'SUCCESS')], { isDraft: true })),
        '/work/site/.git\nthe-branch-of-a-long-running-piece-of-work-with-a-long-name': f(NOW - MIN, 'the-branch-of-a-long-running-piece-of-work-with-a-long-name', prView(3, [prRun('e2e', null)], { mergeable: 'CONFLICTING' })),
      })
      mem.set('cockpit:session:s1', rec('s1', { cwd: '/work/app/.claude/worktrees/b', branch: 'fix-y', title: 'web fixes' }))
    },
  },
  {
    name: 'a waiting session with a reply box, a stuck nudge, a heavy chat',
    rows: /^(press-o-|press-n-|press-ol-here|morel-others|press-ol-fit)/,
    has: [/Your turn/, /asks you a question/, /Context is 93% full/],
    seed: mem => {
      mem.set('cockpit:session:test-session', rec('test-session', { cwd: ROOT, branch: 'feat-x', state: 'working', title: 'Fix the login page', contextPercent: 93, costUsd: 4.2, fiveHourPercent: 91, fiveHourResetsAt: '2026-10-11T13:00:00Z' }))
      mem.set('cockpit:session:s1', rec('s1', { state: 'waiting', stateSince: NOW - 12 * MIN, title: 'A session whose title is long enough that it has to be cut', ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 12 * MIN } }))
      mem.set('cockpit:session:s2', rec('s2', { state: 'waiting', stateSince: NOW - 40 * MIN, title: 'Docs' }))
      mem.set('cockpit:session:s3', rec('s3', { state: 'working', lastEventAt: NOW - 25 * MIN, stateSince: NOW - 40 * MIN, title: 'Quiet one' }))
      mem.set('cockpit:setting:hints.model', 'on')
      mem.set('cockpit:session:s4', rec('s4', { state: 'idle', stateSince: NOW - 5 * MIN, title: 'Reading a lot', fit: { looks: NOW - 30 * MIN, many: true, effort: 'high' } }))
      mem.set('cockpit:session:s5', rec('s5', { state: 'idle', stateSince: NOW - 6 * MIN, title: 'Checks keep failing', fit: { fails: 3, effort: 'low' } }))
    },
  },
  {
    name: 'the computer under pressure, battery low (Computer)',
    has: [/Computer/, /Memory|memory/],
    rows: /^press-ol-computer/,
    seed: mem => {
      mem.set('cockpit:laptop:v2', { at: NOW - 20_000, schema: 3, cpuBusy: 0.95, pressure: 'critical', freeShare: 0.03, swap: { totalMb: 8192, usedMb: 7900 }, battery: { hasBattery: true, onAc: false, percent: 9, remaining: '0:25' }, thermal: { state: 'slowed', speedLimit: 60 }, procs: { count: 7, rssMb: 5400 }, memMb: 16384, load: 12, cores: 8 })
    },
  },
  {
    name: 'a computer reading that is too old (Computer)',
    has: [/Computer/],
    rows: /^press-ol-computer/,
    seed: mem => {
      mem.set('cockpit:laptop:v2', { at: NOW - 40 * MIN, schema: 1, cpuBusy: 0.2 })
    },
  },
  {
    name: 'skills used this week, a long list and unused ones (Skills)',
    has: [/Skills/, /40 skills, 38 fit the list/],
    rows: /^(press-ol-skills|morel-skills)/,
    seed: mem => {
      const names = Array.from({ length: 40 }, (_, n) => (n % 7 === 0 ? `a-skill-with-a-rather-long-name-for-the-frontend-team-number-${n}` : `skill-${n}`))
      mem.set('cockpit:skills:listing', { at: NOW - HOUR, total: 40, included: 38, tokens: 9900, names })
      const day = new Date(NOW).toISOString().slice(0, 10)
      mem.set('cockpit:skills:counts', { [day]: Object.fromEntries(names.slice(0, 14).map((n, i) => [n, 14 - i])) })
    },
  },
  {
    name: 'focus on (the Focus row and the line above the chat box)',
    has: [/Notices paused/],
    band: true,
    rows: /^press-ol-here/,
    seed: () => {},
    start: ui => ui.press({ key: 'focus-start' }),
    leave: ui => ui.press({ key: 'focus-end' }),
  },
  {
    name: 'a vague last prompt (What it misses)',
    has: [/Your last prompt may be too short/],
    rows: /^press-ol-(here|better)/,
    seed: mem => {
      mem.set('cockpit:setting:prompt.check', 'tip')
    },
    before: async $ => {
      await $.prompt.submit({ text: 'make it better' } as never)
    },
  },
  {
    name: 'shell blocks from the last answer (Run commands)',
    rows: /^press-ol-do:/,
    has: [/Run commands/, /sudo rm/],
    seed: () => {},
    before: async $ => {
      await $.turn.complete({ answer: SHELL('npm test', 'sudo rm -rf /tmp/build-cache-of-the-whole-monorepo-and-everything-below-it', `cd ${ROOT}/packages/a-very-long-package-name && npm install some-long-package-name another-long-package-name --save-exact --legacy-peer-deps`), durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' } as never)
    },
  },
]

export const setNow = (n: number): void => {
  NOW = n
}
export const getNow = (): number => NOW
