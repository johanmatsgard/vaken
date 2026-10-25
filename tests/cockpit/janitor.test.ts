// The worktree janitor: merged copies get Remove this copy on the Pull requests card, idle ones one listing row; every check is made again at the press.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import type { Io } from '../hooks/core/io'
import { COPY_IDLE_MS, copiesOf, parseWorktrees, wtSeen } from '../hooks/core/crew3git'
import type { Copy, WtRow, WtScan } from '../hooks/core/crew3git'
import { parsePrView } from '../hooks/core/crewpr'
import type { PrFacts } from '../hooks/core/crewpr'
import { COPY_DIRTY, COPY_DIRTY_ONE, COPY_IGNORED, COPY_IGNORED_ONE, COPY_LIVE, COPY_NO_REMOVE, COPY_OWN, COPY_REMOVED, COPY_REMOVED_KEPT, COPY_UNPUSHED_ONE, REMOVE_COPY, forgetCopy, prsLoud, prsShort, removeCopy, splitStatus } from '../hooks/core/prcard'
import type { PrsFacts } from '../hooks/core/prcard'
import { lineCard } from '../hooks/features/home/linecards'
import { removeCopyRow } from '../hooks/features/home/rowact'
import { byEnglish } from '../hooks/i18n/table'
import { textsOf } from './statefixtures'
import type { Node } from './statefixtures'

const SV = byEnglish('sv')
const MIN = 60_000
const DAY = 86_400_000
const NOW = Date.parse('2026-10-18T10:00:00Z')
const id = (s: string): string => s
const REPO = '/work/app/.git'
const BASE_SHA = 'b'.repeat(40)

type Wt = WtRow['wt']
const wt = (path: string, branch: string | undefined, over: Partial<Wt> = {}): Wt => ({ path, ...(branch === undefined ? {} : { branch }), head: `${path.length}`.padEnd(40, 'a'), detached: branch === undefined, bare: false, locked: false, prunable: false, ...over })
const row = (w: Wt, over: Partial<WtRow> = {}): WtRow => ({ wt: w, isMain: false, dirty: 0, lastCommitAt: NOW - 2 * DAY, merged: false, atBase: false, live: false, ...over })
const scanOf = (rows: WtRow[]): WtScan => ({ at: NOW, base: 'origin/main', baseKnown: true, rows, cut: false })
const prFacts = (branch: string, state: string, number: number, head?: string): PrFacts => ({ at: NOW - 5 * MIN, branch, view: parsePrView({ number, state, isDraft: false, mergeable: 'UNKNOWN', url: '', statusCheckRollup: [], ...(head === undefined ? {} : { headRefOid: head }) }) })

const SCAN = scanOf([
  row(wt('/work/app', 'main'), { isMain: true, merged: true }),
  row(wt('/work/app/.claude/worktrees/done', 'feat-done'), { merged: true }),
  row(wt('/work/app/.claude/worktrees/squashed', 'feat-squash')),
  row(wt('/work/app/.claude/worktrees/fresh', 'feat-new'), { merged: true, atBase: true, lastCommitAt: NOW - 3 * DAY }),
  row(wt('/work/app/.claude/worktrees/old', 'feat-old'), { lastCommitAt: NOW - 3 * DAY }),
  row(wt('/work/app/.claude/worktrees/dirty', 'feat-dirty'), { dirty: 2, lastCommitAt: NOW - 3 * DAY }),
  row(wt('/work/app/.claude/worktrees/open', 'feat-open'), { lastCommitAt: NOW - 3 * DAY }),
  row(wt('/work/app/.claude/worktrees/young', 'feat-young'), { lastCommitAt: NOW - COPY_IDLE_MS + MIN }),
  row(wt('/work/app/.claude/worktrees/busy', 'feat-busy'), { merged: true, live: true }),
  row(wt('/work/app/.claude/worktrees/mine', 'feat-mine'), { merged: true }),
  row(wt('/work/app/.claude/worktrees/locked', 'feat-locked', { locked: true }), { merged: true }),
  row(wt('/work/app/.claude/worktrees/loose', undefined), { merged: false }),
])
const SHARED = {
  [`${REPO}\nfeat-squash`]: prFacts('feat-squash', 'MERGED', 21, 'c'.repeat(40)),
  [`${REPO}\nfeat-open`]: prFacts('feat-open', 'OPEN', 22),
  '/work/other/.git\nfeat-old': prFacts('feat-old', 'MERGED', 23),
}
const MY_CWD = '/work/app/.claude/worktrees/mine'

test('merged copies: in the base with a commit of its own, or a pull request seen merged; never main, a live, locked or own folder, or a copy with nothing of its own', () => {
  const c = copiesOf(SCAN, REPO, SHARED, MY_CWD, NOW)
  expect(c.merged.map(x => x.name)).toEqual(['done', 'squashed'])
  expect(c.merged[0]).toMatchObject({ branch: 'feat-done', inBase: true })
  expect(c.merged[1]).toMatchObject({ branch: 'feat-squash', inBase: false, pr: 21, prHead: 'c'.repeat(40) })
  // Another repository's merged pull request with the same branch name does not count
  expect(c.merged.some(x => x.branch === 'feat-old')).toBe(false)
})

test('idle copies: clean, no open pull request vaken knows of, and no commit for a day', () => {
  const c = copiesOf(SCAN, REPO, SHARED, MY_CWD, NOW)
  expect(c.idle.map(x => x.name)).toEqual(['fresh', 'old'])
  expect(copiesOf(undefined, REPO, SHARED, MY_CWD, NOW)).toEqual({ merged: [], idle: [] })
  // With no shared answer, git alone still finds the copy merged into the base
  expect(copiesOf(SCAN, undefined, undefined, MY_CWD, NOW).merged.map(x => x.name)).toEqual(['done'])
})

const facts = (copies: PrsFacts['copies']): PrsFacts => ({ on: true, rows: [], look: false, ...(copies === undefined ? {} : { copies }) })

test('the Pull requests card: a Worktrees group, one row per merged copy that presses Remove this copy, one listing row for the idle ones', () => {
  const c = copiesOf(SCAN, REPO, SHARED, MY_CWD, NOW)
  const v = lineCard('prs', { now: NOW, ledger: [], halted: false, modes: {}, prs: facts(c), t: id })
  const group = (v.groups ?? []).find(g => g.head === 'Worktrees')
  expect(group?.rows.map(r => r.title)).toEqual(['done is merged', 'squashed is merged', '2 copies idle over a day'])
  expect(group?.rows[0]?.right).toBe(REMOVE_COPY)
  expect(group?.rows[0]?.action).toEqual(removeCopyRow(c.merged[0] as Copy))
  // The idle row only opens: no press acts on it
  expect(group?.rows[2]?.action).toBeUndefined()
  expect(group?.rows[2]?.what.facts?.[0]).toBe('fresh on feat-new, last commit 3 d ago')
  // A merged copy brings the card out, calm; the short line names it
  expect(prsLoud(facts(c))).toBe('open')
  expect(prsLoud(facts({ merged: [], idle: c.idle }))).toBe('none')
  expect(prsShort(facts(c), id, NOW)).toBe('done is merged')
  // One idle copy is said in the singular
  const one = lineCard('prs', { now: NOW, ledger: [], halted: false, modes: {}, prs: facts({ merged: [], idle: c.idle.slice(0, 1) }), t: id })
  expect((one.groups ?? []).find(g => g.head === 'Worktrees')?.rows[0]?.title).toBe('1 copy idle over a day')
})

test('every new word has its Swedish', () => {
  for (const s of ['Worktrees', '{name} is merged', REMOVE_COPY, '1 copy idle over a day', '{n} copies idle over a day', '{name} on {branch}, last commit {ago}', COPY_OWN, COPY_LIVE, COPY_DIRTY, COPY_IGNORED, COPY_IGNORED_ONE, COPY_UNPUSHED_ONE, COPY_NO_REMOVE, COPY_REMOVED, COPY_REMOVED_KEPT]) expect(SV[s]).toBeDefined()
  expect(SV[REMOVE_COPY]).toBe('Ta bort arbetsträdet')
})

const LIST = (extra = ''): string => `worktree /work/app\nHEAD ${BASE_SHA}\nbranch refs/heads/main\n\nworktree /work/app/.claude/worktrees/done\nHEAD ${'d'.repeat(40)}\nbranch refs/heads/feat-done\n${extra}\nworktree /work/app/.claude/worktrees/squashed\nHEAD ${'c'.repeat(40)}\nbranch refs/heads/feat-squash\n`
type Answer = { exitCode: number; stdout: string } | undefined
function fakeIo(answer: (argv: string[]) => Answer, records: Record<string, unknown> = {}) {
  const ran: string[][] = []
  const mem = new Map<string, unknown>(Object.entries(records))
  const i = {
    now: async () => NOW,
    keys: async () => [...mem.keys()],
    get: async (k: string) => mem.get(k),
    run: async (argv: string[]) => {
      ran.push([...argv])
      const a = answer(argv) ?? { exitCode: 1, stdout: '' }
      return { exitCode: a.exitCode, stdout: a.stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
    },
  } as unknown as Io
  return { i, ran }
}
const git = (over: { status?: string; unpushed?: string; remove?: number; del?: number; list?: string } = {}) => (argv: string[]): Answer => {
  if (argv[1] === 'worktree' && argv[2] === 'list') return { exitCode: 0, stdout: over.list ?? LIST() }
  if (argv[1] === '-C' && argv[3] === 'status') return { exitCode: 0, stdout: over.status ?? '' }
  if (argv[1] === 'rev-list') return { exitCode: 0, stdout: over.unpushed ?? '0\n' }
  if (argv[1] === 'worktree' && argv[2] === 'remove') return { exitCode: over.remove ?? 0, stdout: '' }
  if (argv[1] === 'branch') return { exitCode: over.del ?? 0, stdout: '' }
  return undefined
}
const DONE: Copy = { path: '/work/app/.claude/worktrees/done', name: 'done', branch: 'feat-done', inBase: true }
const SQUASHED: Copy = { path: '/work/app/.claude/worktrees/squashed', name: 'squashed', branch: 'feat-squash', inBase: false, pr: 21, prHead: 'c'.repeat(40) }

test('Remove this copy: a clean, merged copy goes with git worktree remove, then its branch with a plain delete', async () => {
  const f = fakeIo(git())
  expect(await removeCopy(f.i, DONE, '/work/app', 'origin/main')).toEqual({ text: COPY_REMOVED, vars: { name: 'done', branch: 'feat-done' }, removed: true })
  expect(f.ran.slice(-3)).toEqual([['git', 'rev-list', '--count', 'feat-done', '--not', 'origin/main', '--remotes'], ['git', 'worktree', 'remove', DONE.path], ['git', 'branch', '-d', 'feat-done']])
  // Never forced
  expect(f.ran.flat().some(a => a === '--force' || a === '-f')).toBe(false)
})

test('Remove this copy: a squash-merged copy whose last commit is the merged pull request skips the pushed check and needs the forced branch delete', async () => {
  const f = fakeIo(git({ unpushed: '3\n' }))
  expect((await removeCopy(f.i, SQUASHED, '/work/app', 'origin/main')).removed).toBe(true)
  expect(f.ran.some(a => a[1] === 'rev-list')).toBe(false)
  expect(f.ran.at(-1)).toEqual(['git', 'branch', '-D', 'feat-squash'])
  // A later commit than the merged one is checked, and refused when it is pushed nowhere
  const later = fakeIo(git({ unpushed: '1\n' }))
  expect(await removeCopy(later.i, { ...SQUASHED, prHead: 'e'.repeat(40) }, '/work/app', 'origin/main')).toEqual({ text: COPY_UNPUSHED_ONE, vars: { n: 1, base: 'main' }, removed: false })
  expect(later.ran.some(a => a[2] === 'remove')).toBe(false)
})

test('Remove this copy refuses, and says why: its own folder, a live session there, uncommitted changes, or git saying no', async () => {
  const own = fakeIo(git())
  expect((await removeCopy(own.i, DONE, `${DONE.path}/src`, 'origin/main')).text).toBe(COPY_OWN)
  expect(own.ran).toEqual([])
  const rec = { sessionId: 's2', cwd: DONE.path, updatedAt: NOW - MIN }
  const live = fakeIo(git(), { 'cockpit:session:s2': rec })
  expect((await removeCopy(live.i, DONE, '/work/app', 'origin/main')).text).toBe(COPY_LIVE)
  const dirty = fakeIo(git({ status: ' M a.ts\n?? b.ts\n' }))
  expect(await removeCopy(dirty.i, DONE, '/work/app', 'origin/main')).toEqual({ text: COPY_DIRTY, vars: { n: 2 }, removed: false })
  expect(dirty.ran.some(a => a[2] === 'remove')).toBe(false)
  const no = fakeIo(git({ remove: 128 }))
  expect((await removeCopy(no.i, DONE, '/work/app', 'origin/main')).text).toBe(COPY_NO_REMOVE)
  expect(no.ran.some(a => a[1] === 'branch')).toBe(false)
  const kept = fakeIo(git({ del: 1 }))
  expect(await removeCopy(kept.i, DONE, '/work/app', 'origin/main')).toEqual({ text: COPY_REMOVED_KEPT, vars: { name: 'done' }, removed: true })
  // Gone already, or changed since the look (another branch, locked)
  const gone = fakeIo(git({ list: 'worktree /work/app\nHEAD x\nbranch refs/heads/main\n' }))
  expect((await removeCopy(gone.i, DONE, '/work/app', 'origin/main')).gone).toBe(true)
  const locked = fakeIo(git({ list: LIST('locked\n') }))
  expect((await removeCopy(locked.i, DONE, '/work/app', 'origin/main')).removed).toBe(false)
  expect(parseWorktrees(LIST('locked\n'))[1]?.locked).toBe(true)
})

test('Remove this copy: an open session that has been idle for a long time still keeps its copy, however old its record', async () => {
  const idle = { sessionId: 's3', cwd: `${DONE.path}/packages/web`, updatedAt: NOW - 3 * 60 * MIN }
  const f = fakeIo(git(), { 'cockpit:session:s3': idle })
  expect(await removeCopy(f.i, DONE, '/work/app', 'origin/main')).toEqual({ text: COPY_LIVE, removed: false })
  expect(f.ran.some(a => a[1] === 'worktree' && a[2] === 'remove')).toBe(false)
  // A record of another folder (even one named alike) does not keep it
  const other = fakeIo(git(), { 'cockpit:session:s4': { sessionId: 's4', cwd: `${DONE.path}-two`, updatedAt: NOW - 3 * 60 * MIN } })
  expect((await removeCopy(other.i, DONE, '/work/app', 'origin/main')).removed).toBe(true)
})

test('Remove this copy: ignored files that git would delete refuse it, naming the count and one file; only well-known build folders may go', async () => {
  const one = fakeIo(git({ status: '!! .env\n!! node_modules/\n' }))
  expect(await removeCopy(one.i, DONE, '/work/app', 'origin/main')).toEqual({ text: COPY_IGNORED_ONE, vars: { n: 1, name: '.env' }, removed: false })
  expect(one.ran.some(a => a[1] === 'worktree' && a[2] === 'remove')).toBe(false)
  // The status is asked with the ignored files
  expect(one.ran.some(a => a[3] === 'status' && a.includes('--ignored'))).toBe(true)
  const many = fakeIo(git({ status: '!! data/local.sqlite\n!! dist/\n!! .env.local\n' }))
  expect(await removeCopy(many.i, DONE, '/work/app', 'origin/main')).toEqual({ text: COPY_IGNORED, vars: { n: 2, name: 'data/local.sqlite' }, removed: false })
  // Changes are said first
  expect((await removeCopy(fakeIo(git({ status: ' M a.ts\n!! .env\n' })).i, DONE, '/work/app', 'origin/main')).text).toBe(COPY_DIRTY_ONE)
  // Only build folders (at any depth): the copy goes
  const builds = fakeIo(git({ status: '!! node_modules/\n!! dist/\n!! build/\n!! .next/\n!! target/\n!! coverage/\n!! .turbo/\n!! .cache/\n!! packages/web/node_modules/\n' }))
  expect((await removeCopy(builds.i, DONE, '/work/app', 'origin/main')).removed).toBe(true)
  expect(splitStatus('?? a\n!! x/\n!! node_modules/\n\n')).toEqual({ changed: 1, ignored: ['x'] })
})

test('Remove this copy: paths are compared by their real folders, so /tmp and /private/tmp are one', async () => {
  const link = (argv: string[]): Answer => {
    const p = argv[1] ?? ''
    if (argv[0] === 'realpath') return { exitCode: 0, stdout: `${p.replace(/^\/tmp\//, '/private/tmp/')}\n` }
    return git({ list: 'worktree /private/tmp/app\nHEAD x\nbranch refs/heads/main\n\nworktree /private/tmp/app/wt\nHEAD d\nbranch refs/heads/feat-done\n' })(argv)
  }
  const copy: Copy = { path: '/private/tmp/app/wt', name: 'wt', branch: 'feat-done', inBase: true }
  // This session was opened by the symlink name
  const own = fakeIo(link)
  expect((await removeCopy(own.i, copy, '/tmp/app/wt/src', 'origin/main')).text).toBe(COPY_OWN)
  expect(own.ran.some(a => a[1] === 'worktree' && a[2] === 'remove')).toBe(false)
  // Another session's record names it by the symlink
  const live = fakeIo(link, { 'cockpit:session:s5': { sessionId: 's5', cwd: '/tmp/app/wt', updatedAt: NOW - 2 * 60 * MIN } })
  expect((await removeCopy(live.i, copy, '/work/app', 'origin/main')).text).toBe(COPY_LIVE)
  expect(live.ran.some(a => a[1] === 'worktree' && a[2] === 'remove')).toBe(false)
})

test('a removed copy leaves the last scan at once', () => {
  wtSeen.scan = SCAN
  forgetCopy('/work/app/.claude/worktrees/done')
  expect(wtSeen.scan?.rows.some(r => r.wt.path === '/work/app/.claude/worktrees/done')).toBe(false)
  wtSeen.scan = undefined
})

// Through the engine: the scan of /vaken-ship worktrees feeds the Pull requests card; its press removes the copy with git, never by itself
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }
const session = (sid: string, cwd: string) => ({ sessionId: sid, cwd, model: 'm', state: 'idle', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, branch: 'main' })
const DONE_PATH = '/work/app/.claude/worktrees/done'
const gitWorld = (argv: string[]): { exitCode: number; stdout: string } => {
  const line = argv.join(' ')
  if (line === 'git worktree list --porcelain') return { exitCode: 0, stdout: `worktree /work/app\nHEAD ${BASE_SHA}\nbranch refs/heads/main\n\nworktree ${DONE_PATH}\nHEAD ${'d'.repeat(40)}\nbranch refs/heads/feat-done\n` }
  if (line === 'git symbolic-ref --short refs/remotes/origin/HEAD') return { exitCode: 0, stdout: 'origin/main\n' }
  if (line === 'git branch --merged origin/main') return { exitCode: 0, stdout: '  feat-done\n* main\n' }
  if (line === 'git rev-parse origin/main') return { exitCode: 0, stdout: `${BASE_SHA}\n` }
  if (line === 'git rev-parse --git-common-dir') return { exitCode: 0, stdout: '.git\n' }
  if (argv[1] === '-C' && argv[3] === 'log') return { exitCode: 0, stdout: `${Math.floor((NOW - 2 * DAY) / 1000)}\n` }
  if (argv[1] === 'rev-list') return { exitCode: 0, stdout: '0\n' }
  return { exitCode: 0, stdout: '' }
}

test('through the engine: the card offers Remove this copy for a merged copy, and only the press runs git worktree remove and the branch delete', { timeoutMs: 30_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom'], ['cockpit:setting:detail', 'explained'], ['cockpit:firstrun', 'done'], ['cockpit:setting:cards.prs', 'show'], ['cockpit:setting:detail.prs', 'explained'],['cockpit:session:test-session', session('test-session', '/work/app')]])
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
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  const ran: string[][] = []
  on('process.run', (_$, e) => {
    const argv = [...(e as { argv: string[] }).argv]
    ran.push(argv)
    const a = argv[0] === 'git' ? gitWorld(argv) : { exitCode: 0, stdout: '' }
    return { value: { exitCode: a.exitCode, stdout: a.stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  const said = ((await $.command.run({ command: 'vaken-ship', args: 'worktrees' } as never)) as { text: string }).text
  expect(said).toContain('1 safe to remove')
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const has = async (text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
  // No heading inside the card: the copies are a group told apart by space
  const texts = textsOf((await ui.drawn()) as Node)
  expect(texts).not.toContain('Worktrees')
  expect(await has(/^done is merged$/)).toBe(true)
  expect(await has(/^Remove this copy$/)).toBe(true)
  // Drawing and scanning removed nothing
  expect(ran.some(a => a[1] === 'worktree' && a[2] === 'remove')).toBe(false)
  await ui.press({ key: `press-ol-prs:copy-${DONE_PATH}-0` })
  await clock.settle()
  expect(ran.filter(a => (a[1] === 'worktree' && a[2] === 'remove') || (a[1] === 'branch' && a[2] !== '--merged'))).toEqual([['git', 'worktree', 'remove', DONE_PATH], ['git', 'branch', '-d', 'feat-done']])
  expect(toasts).toContain('Removed the copy done and its branch feat-done.')
  await ui.redraw()
  expect(await has(/^done is merged$/)).toBe(false)
  await ui.unmount()
})
