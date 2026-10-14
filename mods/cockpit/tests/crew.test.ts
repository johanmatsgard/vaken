// The Crew group: Collision warning, PR and CI clock, Computer load and their hooks.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { ALIVE_MS, CLAIM_KEEP, CLAIM_TTL_MS, COLLIDE_WHAT, CREW_SETTINGS, addClaim, claimsText, collideNote, collideToast, findRival, parseClaims, relativePath, resolveGitDir, sessionName, sharedKind } from '../hooks/core/crew'
import type { Claims, Other } from '../hooks/core/crew'
import { LAPTOP_ARGV, LAPTOP_SCHEMA, batteryLow, claudeProcs, isReadable, parseWinLaptop, winGaugeArgv,laptopText, laptopWords, memoryTight, parseBattery, parseFreeShare, parseLaptop, parsePressure, parseSwap, parseThermal, splitSysctl, sysctlArgv, tightWords } from '../hooks/core/crewlaptop'
import { PUSH_WINDOW_MS, healthOf, isGitPush, isNoPr, learnDurations, mainRedFrom, parseChecks, parseDurations, parsePrView, prText, prWords, sharedPr, tally, timeLeftMs, whyAsk, withSharedPr } from '../hooks/core/crewpr'
import { didToday } from '../hooks/core/ledger'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

test('the Crew settings: three rows in one group, with the defaults the brief asks for', () => {
  expect(CREW_SETTINGS.map(s => s.key)).toEqual(['crew.collide', 'crew.pr', 'laptop.mode'])
  expect(new Set(CREW_SETTINGS.map(s => s.group))).toEqual(new Set(['Crew']))
  expect(CREW_SETTINGS.map(s => s.default)).toEqual(['warn', 'on', 'on'])
  for (const s of CREW_SETTINGS) {
    expect(s.options.map(o => o.value)).toContain(s.default)
  }
})

test('git directories resolve to one form, in a checkout, a subfolder and a worktree', () => {
  expect(resolveGitDir('/work/app', '.git\n')).toBe('/work/app/.git')
  expect(resolveGitDir('/work/app/src', '../.git\n')).toBe('/work/app/.git')
  expect(resolveGitDir('/work/wt/a', '/work/app/.git\n')).toBe('/work/app/.git')
  expect(resolveGitDir('/work/app/', './.git')).toBe('/work/app/.git')
  expect(resolveGitDir('/work/app', '')).toBeUndefined()
})

test('paths are kept relative to the session folder', () => {
  expect(relativePath('/work/a', '/work/a/src/x.ts')).toBe('src/x.ts')
  expect(relativePath('/work/a/', '/work/a/x.ts')).toBe('x.ts')
  expect(relativePath('/work/a', '/work/ab/x.ts')).toBe('/work/ab/x.ts')
  expect(relativePath('/work/a', './x.ts')).toBe('x.ts')
})

test('shared files: lockfiles, migrations and config files; a plain source file is not shared', () => {
  expect(sharedKind('package-lock.json')).toBe('lockfile')
  expect(sharedKind('apps/web/pnpm-lock.yaml')).toBe('lockfile')
  expect(sharedKind('Cargo.lock')).toBe('lockfile')
  expect(sharedKind('db/migrations/0042_add_users.sql')).toBe('migration')
  expect(sharedKind('prisma/schema.prisma')).toBe('migration')
  expect(sharedKind('package.json')).toBe('config')
  expect(sharedKind('apps/web/tsconfig.build.json')).toBe('config')
  expect(sharedKind('vite.config.ts')).toBe('config')
  expect(sharedKind('.github/workflows/ci.yml')).toBe('config')
  expect(sharedKind('.env.local')).toBe('config')
  expect(sharedKind('src/migrationsHelper.ts')).toBeUndefined()
  expect(sharedKind('src/app.ts')).toBeUndefined()
})

test('a list keeps the newest edits, drops old ones, and starts again for another repository', () => {
  let c: Claims | undefined
  c = addClaim(c, '/r/.git', '/r', 'a.ts', NOW)
  c = addClaim(c, '/r/.git', '/r', 'b.ts', NOW + MIN)
  c = addClaim(c, '/r/.git', '/r', 'a.ts', NOW + 2 * MIN)
  expect(c.items.map(x => x.path)).toEqual(['b.ts', 'a.ts'])
  c = addClaim(c, '/r/.git', '/r', 'c.ts', NOW + CLAIM_TTL_MS + MIN)
  expect(c.items.map(x => x.path)).toEqual(['a.ts', 'c.ts'])
  c = addClaim(c, '/other/.git', '/other', 'z.ts', NOW + CLAIM_TTL_MS + MIN)
  expect(c.items.map(x => x.path)).toEqual(['z.ts'])
  let big: Claims | undefined
  for (let n = 0; n < CLAIM_KEEP + 20; n += 1) big = addClaim(big, '/r/.git', '/r', `f${n}.ts`, NOW)
  expect(big?.items).toHaveLength(CLAIM_KEEP)
  expect(big?.items.at(-1)?.path).toBe(`f${CLAIM_KEEP + 19}.ts`)
})

test('parseClaims refuses anything that is not a list', () => {
  expect(parseClaims(undefined)).toBeUndefined()
  expect(parseClaims({ repo: 1 })).toBeUndefined()
  expect(parseClaims({ repo: '/r', root: '/w', items: [{ path: 'a', at: 1 }, { path: 2 }, null] })).toEqual({ repo: '/r', root: '/w', items: [{ path: 'a', at: 1 }] })
})

const other = (name: string, repo: string, items: Array<[string, number]>, root = '/w/b'): Other => ({ sessionId: name, name, claims: { repo, root, items: items.map(([path, ago]) => ({ path, at: NOW - ago })) } })

test('a rival is another session of the same repository that edited the same file in the last 30 minutes', () => {
  const o = other('feat-b', '/r/.git', [['src/a.ts', 4 * MIN]])
  expect(findRival('src/a.ts', '/r/.git', '/w/a', [o], NOW)).toMatchObject({ name: 'feat-b', sameFile: true, sameFolder: false, ageMs: 4 * MIN })
  expect(findRival('src/other.ts', '/r/.git', '/w/a', [o], NOW)).toBeUndefined()
  expect(findRival('src/a.ts', '/elsewhere/.git', '/w/a', [o], NOW)).toBeUndefined()
  expect(findRival('src/a.ts', '/r/.git', '/w/a', [other('old', '/r/.git', [['src/a.ts', 31 * MIN]])], NOW)).toBeUndefined()
  expect(findRival('src/a.ts', '/r/.git', '/w/b', [o], NOW)?.sameFolder).toBe(true)
})

test('the freshest rival wins, and a same-file rival beats a neighbour', () => {
  const a = other('older', '/r/.git', [['src/a.ts', 20 * MIN]])
  const b = other('newer', '/r/.git', [['src/a.ts', 2 * MIN]])
  expect(findRival('src/a.ts', '/r/.git', '/w/a', [a, b], NOW)?.name).toBe('newer')
  const mig = other('mig', '/r/.git', [['db/migrations/0010_x.sql', MIN]])
  const same = other('same', '/r/.git', [['db/migrations/0011_y.sql', 9 * MIN]])
  expect(findRival('db/migrations/0011_y.sql', '/r/.git', '/w/a', [mig, same], NOW)).toMatchObject({ name: 'same', sameFile: true })
})

test('a new file in the same migrations folder is a warning, a new file in another folder is not', () => {
  const mig = other('mig', '/r/.git', [['db/migrations/0010_x.sql', MIN]])
  const r = findRival('db/migrations/0010_y.sql', '/r/.git', '/w/a', [mig], NOW)
  expect(r).toMatchObject({ sameFile: false, path: 'db/migrations/0010_x.sql' })
  expect(findRival('db/other/0010_y.sql', '/r/.git', '/w/a', [mig], NOW)).toBeUndefined()
  expect(findRival('src/a.ts', '/r/.git', '/w/a', [other('src', '/r/.git', [['src/b.ts', MIN]])], NOW)).toBeUndefined()
})

test('the note for Claude and the toast name the file, the other session and the time, in plain words', () => {
  const r = findRival('package-lock.json', '/r/.git', '/w/a', [other('feat-b', '/r/.git', [['package-lock.json', 4 * MIN]])], NOW)
  expect(r).toBeDefined()
  if (r === undefined) return
  const note = collideNote('package-lock.json', r)
  expect(note).toMatch(/package-lock\.json was edited by another session \(feat-b\) 4 minutes ago/)
  expect(note).toMatch(/This is a lockfile, which all worktrees share/)
  expect(note).toMatch(/tell the person/)
  expect(collideToast('package-lock.json', r)).toBe('package-lock.json was edited by another session (feat-b) 4 minutes ago (a lockfile).')
  expect(sessionName({ branch: 'feat-x' })).toBe('feat-x')
  expect(sessionName({ cwd: '/work/some-folder' })).toBe('some-folder')
  expect(sessionName(undefined)).toBe('another session')
})

test('/vaken-help run claims words: who edits what, and what to do when it is off', () => {
  const mine: Claims = { repo: '/r/.git', root: '/w/a', items: [{ path: 'src/a.ts', at: NOW - MIN }] }
  const text = claimsText('warn', mine, [other('feat-b', '/r/.git', [['src/b.ts', 7 * MIN], ['src/c.ts', 8 * MIN]])], NOW, true)
  expect(text).toMatch(/File overlap: warn/)
  expect(text).toMatch(/This session: 1 file\.\n {2}src\/a\.ts \(1 minute ago\)/)
  expect(text).toMatch(/feat-b: 2 files\./)
  expect(claimsText('off', undefined, [], NOW, false)).toMatch(/Turn it on: Settings > Agents\.[\s\S]*not in a git repository/)
  expect(claimsText('warn', mine, [], NOW, true)).toMatch(/No other live session/)
})

let at = NOW
const T = (min: number): string => new Date(at - min * MIN).toISOString()
const run = (name: string, from: number, to: number | null, conclusion = 'SUCCESS') => ({ __typename: 'CheckRun', name, status: to === null ? 'IN_PROGRESS' : 'COMPLETED', conclusion: to === null ? '' : conclusion, startedAt: T(from), completedAt: to === null ? '0001-01-01T00:00:00Z' : T(to) })
const makeView = () => ({
  number: 123,
  state: 'OPEN',
  isDraft: false,
  mergeable: 'MERGEABLE',
  url: 'https://example.test/pull/123',
  statusCheckRollup: [run('lint', 20, 18), run('unit', 20, 15), run('types', 20, 17), run('build', 20, 12), run('e2e', 2, null)],
})

test('checks: runs and status contexts become five states; an unset time is absent', () => {
  const rows = parseChecks([
    ...makeView().statusCheckRollup,
    { __typename: 'StatusContext', context: 'legacy/ci', state: 'FAILURE' },
    { __typename: 'StatusContext', context: 'other/ci', state: 'PENDING' },
    run('cancelled-one', 5, 4, 'CANCELLED'),
    run('timed', 5, 4, 'TIMED_OUT'),
    run('skipped-one', 5, 4, 'SKIPPED'),
    { garbage: true },
  ])
  expect(rows.map(r => `${r.name}:${r.state}`)).toEqual(['lint:passed', 'unit:passed', 'types:passed', 'build:passed', 'e2e:running', 'legacy/ci:failed', 'other/ci:running', 'cancelled-one:cancelled', 'timed:failed', 'skipped-one:skipped'])
  expect(rows[4]?.completedAt).toBeUndefined()
  expect(parseChecks('x')).toEqual([])
})

test('"PR 123 is open. 4 of 5 checks passed, 1 running (about 6 min). Mergeable."', () => {
  const v = parsePrView(makeView())
  expect(v).toBeDefined()
  if (v === undefined) return
  // The running check has no earlier time, so the longest check that passed (8 min) stands in for it; it has run for 2 min.
  expect(timeLeftMs(v.checks, {}, NOW)).toBe(6 * MIN)
  expect(prWords(v, {}, NOW)).toBe('PR 123 is open. 4 of 5 checks passed, 1 running (about 6 min). Mergeable.')
  expect(healthOf(tally(v.checks))).toBe('pending')
})

test('the time left comes from the last time the same check took, never a made-up number', () => {
  const v = parsePrView(makeView())
  if (v === undefined) throw new Error('fixture')
  expect(timeLeftMs(v.checks, { e2e: 10 * MIN }, NOW)).toBe(8 * MIN)
  const fresh = parsePrView({ ...makeView(), statusCheckRollup: [run('e2e', 2, null)] })
  if (fresh === undefined) throw new Error('fixture')
  expect(timeLeftMs(fresh.checks, {}, NOW)).toBeUndefined()
  expect(prWords(fresh, {}, NOW)).toBe('PR 123 is open. 0 of 1 checks passed, 1 running. Mergeable.')
  expect(timeLeftMs(v.checks, { e2e: MIN }, NOW)).toBe(MIN)
})

test('durations are learned from checks that passed, and only those', () => {
  const v = parsePrView({ ...makeView(), statusCheckRollup: [run('lint', 10, 7), run('bad', 10, 2, 'FAILURE'), run('e2e', 2, null)] })
  if (v === undefined) throw new Error('fixture')
  expect(learnDurations({}, v.checks)).toEqual({ lint: 3 * MIN })
  expect(learnDurations({ lint: 9 * MIN, keep: 5 }, v.checks)).toEqual({ keep: 5, lint: 3 * MIN })
  expect(parseDurations({ a: 5, b: 'x', c: -1 })).toEqual({ a: 5 })
})

test('PR words: failed, waiting, all passed, none yet, draft, conflict, merged, closed', () => {
  const words = (over: Record<string, unknown>) => {
    const v = parsePrView({ ...makeView(), ...over })
    if (v === undefined) throw new Error('fixture')
    return prWords(v, {}, NOW)
  }
  expect(words({ statusCheckRollup: [run('a', 9, 8), run('b', 9, 8, 'FAILURE')] })).toBe('PR 123 is open. 1 of 2 checks passed, 1 failed. Mergeable.')
  expect(words({ statusCheckRollup: [run('a', 9, 8), run('b', 9, 8)] })).toBe('PR 123 is open. All 2 checks passed. Mergeable.')
  expect(words({ statusCheckRollup: [] })).toBe('PR 123 is open. No checks have run yet. Mergeable.')
  expect(words({ statusCheckRollup: [{ name: 'q', status: 'QUEUED', conclusion: '' }, run('a', 9, 8)] })).toBe('PR 123 is open. 1 of 2 checks passed, 1 waiting (about 1 min). Mergeable.')
  expect(words({ isDraft: true, mergeable: 'CONFLICTING', statusCheckRollup: [] })).toBe('PR 123 is open (a draft). No checks have run yet. It has a conflict with the base branch: it needs a rebase.')
  expect(words({ mergeable: 'UNKNOWN', statusCheckRollup: [run('a', 9, 8)] })).toBe('PR 123 is open. The one check passed.')
  expect(words({ state: 'MERGED' })).toBe('PR 123 is merged.')
  expect(words({ state: 'CLOSED' })).toBe('PR 123 is closed.')
  expect(parsePrView({ no: 'number' })).toBeUndefined()
  // the commit at the tip rides along only when gh named it
  expect(parsePrView(makeView())?.head).toBeUndefined()
  expect(parsePrView({ ...makeView(), headRefOid: '0123456789abcdef0123456789abcdef01234567' })?.head).toBe('0123456789abcdef0123456789abcdef01234567')
})

test('no PR for the branch is an answer; main is red on a failed run only', () => {
  expect(isNoPr('no pull requests found for branch "feat-x"')).toBe(true)
  expect(isNoPr('HTTP 401: Bad credentials')).toBe(false)
  expect(mainRedFrom([{ conclusion: 'failure' }])).toBe(true)
  expect(mainRedFrom([{ conclusion: 'timed_out' }])).toBe(true)
  expect(mainRedFrom([{ conclusion: 'success' }])).toBe(false)
  expect(mainRedFrom([{ conclusion: '' }])).toBeUndefined()
  // A cancelled, neutral or waiting newest run is unknown, never green; the newest run of each workflow decides.
  expect(mainRedFrom([{ conclusion: 'cancelled' }])).toBeUndefined()
  expect(mainRedFrom([{ conclusion: 'action_required' }])).toBeUndefined()
  expect(mainRedFrom([{ workflowName: 'ci', conclusion: 'success' }, { workflowName: 'deploy', conclusion: 'failure' }])).toBe(true)
  expect(mainRedFrom([{ workflowName: 'ci', conclusion: 'success' }, { workflowName: 'ci', conclusion: 'failure' }, { workflowName: 'deploy', conclusion: 'success' }])).toBe(false)
  expect(mainRedFrom([])).toBeUndefined()
  expect(mainRedFrom('x')).toBeUndefined()
})

test('/vaken-ship pr words cover off, blocked, not asked, a PR with failures, no PR and a failed ask', () => {
  const v = parsePrView({ ...makeView(), statusCheckRollup: [run('lint', 9, 8, 'FAILURE'), run('unit', 9, 8)] })
  if (v === undefined) throw new Error('fixture')
  const facts = { at: NOW - 3 * MIN, branch: 'feat-x', view: v, mainRed: true }
  const t = prText('on', facts, {}, NOW, undefined)
  expect(t).toMatch(/^PR 123 is open\. 1 of 2 checks passed, 1 failed\. Mergeable\.\nFailed: lint\.\nhttps:\/\/example\.test\/pull\/123\nMain is red\.\nAsked 3 min ago\.$/)
  expect(prText('off', undefined, {}, NOW, undefined)).toMatch(/off\. Turn it on: Settings > Agents/)
  expect(prText('on', undefined, {}, NOW, 'The gh program was not found')).toBe('The gh program was not found')
  expect(prText('on', undefined, {}, NOW, undefined)).toMatch(/Not checked on GitHub yet/)
  expect(prText('on', { at: NOW, branch: 'feat-x', none: true, mainRed: false }, {}, NOW, undefined)).toMatch(/no pull request for feat-x\.\nMain is green\./)
  expect(prText('on', { at: NOW - 5 * MIN, view: v, error: 'HTTP 502' }, {}, NOW, undefined)).toMatch(/The last ask failed \(HTTP 502\)\. This is from 5 min ago\./)
  expect(prText('on', { at: NOW, error: 'HTTP 502' }, {}, NOW, undefined)).toMatch(/gh did not answer/)
})

test('memory pressure level', () => {
  expect(parsePressure('1\n')).toBe('normal')
  expect(parsePressure('2')).toBe('warn')
  expect(parsePressure('4\n')).toBe('critical')
  expect(parsePressure('3')).toBeUndefined()
  expect(parsePressure('sysctl: unknown oid')).toBeUndefined()
})

test('swap in M and G units, and text it must refuse', () => {
  expect(parseSwap('vm.swapusage: total = 2048.00M  used = 1024.50M  free = 1023.50M  (encrypted)')).toEqual({ totalMb: 2048, usedMb: 1024.5 })
  expect(parseSwap('vm.swapusage: total = 4.00G  used = 2.50G  free = 1.50G  (encrypted)')?.usedMb).toBe(2560)
  expect(parseSwap('garbage')).toBeUndefined()
})

test('battery: unplugged, on power, and a machine with none', () => {
  expect(parseBattery("Now drawing from 'Battery Power'\n -InternalBattery-0 (id=4653155)\t17%; discharging; 0:41 remaining present: true\n")).toEqual({ hasBattery: true, onAc: false, percent: 17, remaining: '0:41' })
  const full = parseBattery("Now drawing from 'AC Power'\n -InternalBattery-0 (id=4653155)\t100%; charged; 0:00 remaining present: true\n")
  expect(full).toEqual({ hasBattery: true, onAc: true, percent: 100, remaining: undefined })
  expect(parseBattery("Now drawing from 'AC Power'\n")).toEqual({ hasBattery: false, onAc: true })
  expect(parseBattery('hello')).toBeUndefined()
})

test('heat: cool, slowed and unreadable', () => {
  expect(parseThermal('Note: No thermal warning level has been recorded\nNote: No performance warning level has been recorded\n')).toEqual({ state: 'ok', speedLimit: undefined })
  expect(parseThermal('CPU_Scheduler_Limit = 100\nCPU_Available_CPUs = 8\nCPU_Speed_Limit = 70\n')).toEqual({ state: 'slowed', speedLimit: 70 })
  expect(parseThermal('CPU_Speed_Limit = 100\n')?.state).toBe('ok')
  expect(parseThermal('')).toBeUndefined()
})

const VM_TIGHT = `Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free:                                1000.\nPages active:                            500000.\nPages inactive:                            4000.\nPages speculative:                          500.\nPages wired down:                        200000.\nPages purgeable:                            100.\nPages occupied by compressor:            300000.\nPageouts:                                  4242.\n`
const VM_FREE = `Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free:                              300000.\nPages active:                            200000.\nPages inactive:                          200000.\nPages speculative:                        10000.\nPages wired down:                        100000.\nPages occupied by compressor:             50000.\n`

test('vm_stat: the free share is only a fallback estimate', () => {
  expect((parseFreeShare(VM_TIGHT) ?? 1) < 0.01).toBe(true)
  expect((parseFreeShare(VM_FREE) ?? 0) > 0.5).toBe(true)
  expect(parseFreeShare('not vm_stat')).toBeUndefined()
  expect(memoryTight({ at: NOW, freeShare: parseFreeShare(VM_TIGHT) })).toBe(true)
  expect(memoryTight({ at: NOW, freeShare: parseFreeShare(VM_FREE) })).toBe(false)
  expect(memoryTight({ at: NOW, pressure: 'normal', freeShare: 0.01 })).toBe(false)
  expect(memoryTight({ at: NOW, pressure: 'warn' })).toBe(false)
  expect(memoryTight({ at: NOW, pressure: 'critical' })).toBe(true)
  expect(memoryTight({ at: NOW })).toBe(false)
})

const PS = [
  '  PID   RSS COMMAND',
  '  101 1048576 /Users/someone/.local/bin/claude --resume',
  '  102 524288 claude',
  '  103 2097152 node /opt/homebrew/bin/claude --dangerously-x',
  '  104 99999 /Applications/Claude.app/Contents/MacOS/Claude',
  '  105 88888 /Applications/Claude.app/Contents/Frameworks/Claude Helper.app/Contents/MacOS/Claude Helper',
  '  106 77777 /Users/someone/.local/bin/claude mcp serve',
  '  107 66666 grep claude',
  '  108 55555 /Users/someone/Library/Application Support/Claude/claude-code/2.1.0/claude -p hello',
  '  109 44444 /Users/someone/.local/bin/claude-helper --x',
].join('\n')

test('Claude processes: the program named claude, counted with their memory; the app, helpers, mcp and lookalikes are left out', () => {
  expect(claudeProcs(PS)).toEqual({ count: 4, rssMb: Math.round((1048576 + 524288 + 2097152 + 55555) / 1024) })
  expect(claudeProcs('')).toEqual({ count: 0, rssMb: 0 })
})

test('plain words: tight memory names the sessions and their memory; a fine laptop says so; low battery asks to plug in', () => {
  const tight = parseLaptop(NOW, { pressure: '4\n', swap: 'vm.swapusage: total = 8.00G  used = 5.50G  free = 2.50G  (encrypted)', batt: "Now drawing from 'Battery Power'\n -InternalBattery-0\t17%; discharging; 0:41 remaining present: true\n", therm: 'CPU_Speed_Limit = 70\n', ps: PS })
  expect(tightWords(tight)).toBe('This Mac is short of memory. Your 4 Claude sessions use 3.6 GB of it.')
  expect(laptopWords(tight)).toEqual(['This Mac is short of memory. Your 4 Claude sessions use 3.6 GB of it.', 'Close a session or wait for one to finish. Nothing is closed for you.', 'Swap: 5.5 GB used of 8.0 GB.', 'Battery 17%, not plugged in, about 0:41 left. It is low: plug in.', 'The processor is slowed to 70% by heat.'])
  expect(batteryLow(tight)).toBe(true)
  const fine = parseLaptop(NOW, { pressure: '1', batt: "Now drawing from 'AC Power'\n -InternalBattery-0\t15%; charging; 2:10 remaining present: true\n", therm: 'Note: No thermal warning level has been recorded\n', ps: '  101 1048576 claude\n' })
  expect(laptopWords(fine)).toEqual(['Memory is fine: 1 Claude session uses 1.0 GB.', 'Battery 15%, plugged in.', 'Heat is fine.'])
  expect(batteryLow(fine)).toBe(false)
  expect(batteryLow({ at: NOW, battery: { hasBattery: true, onAc: false, percent: 20 } })).toBe(false)
  expect(laptopWords(parseLaptop(NOW, { ps: '' }))[0]).toBe('Memory could not be read.')
})

test('/vaken-help run laptop words: off, not read yet, unreadable, and a reading', () => {
  expect(laptopText('off', undefined, NOW)).toMatch(/off\. It runs short programs/)
  expect(laptopText('on', undefined, NOW)).toMatch(/Nothing read yet/)
  expect(laptopText('on', parseLaptop(NOW, {}), NOW)).toMatch(/none of the programs gave an answer/)
  expect(laptopText('on', parseLaptop(NOW - 90_000, { pressure: '1' }), NOW)).toMatch(/^Computer load: on\.\nMemory is fine[\s\S]*Read 1 min ago\. It reads every 3 minutes, and every minute while agents run\.$/)
})

test('the ledger counts the collision line under its title', () => {
  expect(COLLIDE_WHAT).toBe('Warned about a file another session is editing')
  expect(didToday([{ at: NOW, what: COLLIDE_WHAT, did: true }, { at: NOW, what: COLLIDE_WHAT, did: true }], NOW)).toEqual([{ what: COLLIDE_WHAT, n: 2 }])
  expect(ALIVE_MS).toBe(90_000)
})

// ---- the hooks, as the engine runs them

function memStore(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries(seed))
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

type Answer = { exitCode: number; stdout: string; stderr?: string }
type World = { mem: Map<string, unknown>; clock: ReturnType<typeof mock.clock>; calls: string[][]; toasts: string[]; now: number }

// So each test starts an hour later than the one before, and a limit of "once in 2 minutes" never holds over from another test.
let epoch = 0

function world(on: On, answer: (argv: readonly string[]) => Answer | undefined, seed: (now: number) => Record<string, unknown> = () => ({}), cwd = '/w/a'): World {
  epoch += 1
  const now = NOW + epoch * 60 * MIN
  at = now
  const clock = mock.clock(on, { now })
  const mem = memStore(on, seed(now))
  mock.session(on)
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: cwd }))
  on('session.root', () => ({ value: cwd }))
  const calls: string[][] = []
  on('process.run', (_$, e) => {
    calls.push([...e.argv])
    const a = answer(e.argv) ?? { exitCode: 127, stdout: '', stderr: 'not found' }
    return { value: { exitCode: a.exitCode, stdout: a.stdout, stderr: a.stderr ?? '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)
    return { value: undefined } as never
  })
  on('ui.invalidate', () => ({ value: undefined }))
  on('tool.call', { tool: /^(Edit|Write)$/ }, () => ({ result: 'ok', text: 'ok', ref: 1 }) as never)
  return { mem, clock, calls, toasts, now }
}

const isGitDir = (c: string[]): boolean => c[0] === 'git' && c[2] === '--git-common-dir'
const isGauge = (c: string[]): boolean => c[0] === 'vm_stat' || c[0] === 'top' || c[0] === 'pmset' || c[0] === 'sysctl' || (c[0] === 'ps' && c[1] === '-axo')
const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: '/w/b', branch: 'feat-b', model: 'm', state: 'working', startedAt: at - 30 * MIN, updatedAt: at - 5_000, lastEventAt: at - 5_000, stateSince: at - 30 * MIN, ...over })
const claimsOf = (repo: string, root: string, items: Array<[string, number]>) => ({ repo, root, items: items.map(([path, ago]) => ({ path, at: at - ago })) })
const text = async ($: EngineInterface, command: string): Promise<string> => ((await $.command.run(viaParent(command, '') as never)) as { text: string }).text
const whats = (mem: Map<string, unknown>): string[] => ((mem.get('cockpit:ledger:compact') as Array<{ what: string }> | undefined) ?? []).map(l => l.what)

const GIT = (argv: readonly string[]): Answer | undefined => (argv[0] === 'git' ? { exitCode: 0, stdout: '/r/.git\n' } : undefined)

test('an edit of a file another live session edited: Claude gets a note, one toast, one ledger line; the edit runs; the list is published', SLOW, async ($, on) => {
  const w = world(on, GIT, () => ({ 'cockpit:setting:claude.notes': 'all', 'cockpit:session:other': rec('other'), 'cockpit:claims:other': claimsOf('/r/.git', '/w/b', [['src/one.ts', 4 * MIN]]) }))
  const first = await $.tool.call({ tool: 'Edit', file_path: '/w/a/src/one.ts', old_string: 'a', new_string: 'b' } as never)
  expect(JSON.stringify(first)).toMatch(/src\/one\.ts was edited by another session \(feat-b\) 4 minutes ago/)
  expect(JSON.stringify(first)).not.toMatch(/"deny"/)
  expect(w.toasts).toEqual(['src/one.ts was edited by another session (feat-b) 4 minutes ago.'])
  expect(whats(w.mem)).toEqual([COLLIDE_WHAT])
  expect(w.mem.get('cockpit:claims:me')).toEqual({ repo: '/r/.git', root: '/w/a', items: [{ path: 'src/one.ts', at: w.now }] })
  const again = await $.tool.call({ tool: 'Edit', file_path: '/w/a/src/one.ts', old_string: 'b', new_string: 'c' } as never)
  expect(JSON.stringify(again)).not.toMatch(/another session/)
  expect(w.toasts).toHaveLength(1)
  expect(whats(w.mem)).toEqual([COLLIDE_WHAT])
  expect(w.calls.filter(isGitDir)).toEqual([['git', 'rev-parse', '--git-common-dir']])
})

test('no warning for a file nobody else touched, a session that is gone, another repository, or when the setting is off', async ($, on) => {
  const w = world(on, GIT, () => ({
    'cockpit:session:gone': rec('gone', { updatedAt: at - 5 * MIN }),
    'cockpit:claims:gone': claimsOf('/r/.git', '/w/b', [['src/two.ts', MIN]]),
    'cockpit:session:far': rec('far'),
    'cockpit:claims:far': claimsOf('/other/.git', '/w/b', [['src/three.ts', MIN]]),
    'cockpit:session:live': rec('live'),
    'cockpit:claims:live': claimsOf('/r/.git', '/w/b', [['src/four.ts', MIN]]),
  }))
  for (const f of ['two', 'three', 'five']) expect(JSON.stringify(await $.tool.call({ tool: 'Write', file_path: `/w/a/src/${f}.ts`, content: 'x' } as never))).not.toMatch(/another session/)
  expect(w.toasts).toEqual([])
  expect(whats(w.mem)).toEqual([])
  w.mem.set('cockpit:setting:crew.collide', 'off')
  expect(JSON.stringify(await $.tool.call({ tool: 'Write', file_path: '/w/a/src/four.ts', content: 'x' } as never))).not.toMatch(/another session/)
  expect(w.toasts).toEqual([])
  expect((w.mem.get('cockpit:claims:me') as Claims).items.map(x => x.path)).toEqual(['src/two.ts', 'src/three.ts', 'src/five.ts'])
})

test('a lockfile another session of the same folder changed is named a shared file', async ($, on) => {
  const w = world(on, GIT, () => ({ 'cockpit:setting:claude.notes': 'all', 'cockpit:session:other': rec('other', { cwd: '/w/a' }), 'cockpit:claims:other': claimsOf('/r/.git', '/w/a', [['package-lock.json', 2 * MIN]]) }))
  const r = await $.tool.call({ tool: 'Write', file_path: '/w/a/package-lock.json', content: '{}' } as never)
  expect(JSON.stringify(r)).toMatch(/This is a lockfile, which all worktrees share/)
  expect(JSON.stringify(r)).toMatch(/same folder as you/)
  expect(w.toasts[0]).toMatch(/\(a lockfile\)/)
})

test('/vaken-help run claims prints who is editing what', async ($, on) => {
  world(on, GIT, () => ({ 'cockpit:session:other': rec('other'), 'cockpit:claims:other': claimsOf('/r/.git', '/w/b', [['src/b1.ts', 3 * MIN], ['src/b2.ts', 5 * MIN]]) }))
  await $.tool.call({ tool: 'Write', file_path: '/w/a/src/mine.ts', content: 'x' } as never)
  const t = await text($, 'vaken-claims')
  expect(t).toMatch(/File overlap: warn/)
  expect(t).toMatch(/This session: \d+ files?\./)
  expect(t).toMatch(/src\/mine\.ts \(less than a minute ago\)/)
  expect(t).toMatch(/feat-b: 2 files\.\n {2}src\/b1\.ts \(3 minutes ago\)\n {2}src\/b2\.ts \(5 minutes ago\)/)
})

const GH = (view: (() => unknown) | undefined, main = '[{"conclusion":"failure"}]') => (argv: readonly string[]): Answer | undefined => {
  if (argv[0] === 'git') return { exitCode: 0, stdout: '/r/.git\n' }
  if (argv[0] === 'which') return { exitCode: 0, stdout: '/opt/homebrew/bin/gh\n' }
  if (argv[0] === 'gh' && argv[1] === 'pr') return view === undefined ? { exitCode: 1, stdout: '', stderr: 'no pull requests found for branch "feat-x"' } : { exitCode: 0, stdout: JSON.stringify(view()) }
  if (argv[0] === 'gh' && argv[1] === 'run') return { exitCode: 0, stdout: main }
  return undefined
}

test('/vaken-ship pr asks gh once, says the PR in plain words, says main is red, and does not ask again within 2 minutes', async ($, on) => {
  const w = world(on, GH(makeView), () => ({ 'cockpit:session:me': rec('me', { cwd: '/w/a', branch: 'feat-x' }) }))
  const t = await text($, 'vaken-pr')
  expect(t).toMatch(/^PR 123 is open\. 4 of 5 checks passed, 1 running \(about 6 min\)\. Mergeable\.\nhttps:\/\/example\.test\/pull\/123\nMain is red\.\nAsked 0 min ago\.$/)
  const gh = w.calls.filter(c => c[0] === 'gh')
  expect(gh[0]).toEqual(['gh', 'pr', 'view', '--json', 'number,state,isDraft,statusCheckRollup,mergeable,url,mergeStateStatus,reviewDecision,headRefOid'])
  expect(gh[1]).toEqual(['gh', 'run', 'list', '--branch', 'main', '--limit', '10', '--json', 'conclusion,workflowName'])
  expect(w.calls.filter(c => c[0] === 'which')).toEqual([['which', 'gh']])
  const band = JSON.stringify(w.mem.get('cockpit:band:me'))
  expect(band).toMatch(/Main is red/)
  expect(band).not.toMatch(/checks? failed/)
  expect(Object.keys(w.mem.get('cockpit:pr:durations') as object).sort()).toEqual(['build', 'lint', 'types', 'unit'])
  await text($, 'vaken-pr')
  expect(w.calls.filter(c => c[0] === 'gh')).toHaveLength(2)
})

test('3 minutes later gh is asked again: failed checks put a line in the band and a toast; green main clears its line', async ($, on) => {
  let view: () => unknown = makeView
  let main = '[{"conclusion":"failure"}]'
  const w = world(on, argv => GH(view, main)(argv), () => ({ 'cockpit:session:me': rec('me', { cwd: '/w/a', branch: 'feat-x' }) }))
  await text($, 'vaken-pr')
  view = () => ({ ...makeView(), statusCheckRollup: [run('lint', 20, 18, 'FAILURE'), run('unit', 20, 15, 'FAILURE'), run('e2e', 5, 1)] })
  main = '[{"conclusion":"success"}]'
  await w.clock.advance(6 * MIN)
  const t = await text($, 'vaken-pr')
  expect(t).toMatch(/^PR 123 is open\. 1 of 3 checks passed, 2 failed\. Mergeable\.\nFailed: lint, unit\.\n/)
  expect(t).toMatch(/Main is green\./)
  const band = JSON.stringify(w.mem.get('cockpit:band:me'))
  expect(band).toMatch(/PR 123: 2 checks failed/)
  expect(band).not.toMatch(/Main is red/)
  expect(w.toasts).toContain('Pull request 123: 2 checks failed. Press Fix in Needs you or on the Pull requests card.')
})

test('a branch with no PR is an answer, not a failure', async ($, on) => {
  const w = world(on, GH(undefined, '[]'), () => ({ 'cockpit:session:me': rec('me', { cwd: '/w/a', branch: 'feat-none' }) }))
  const t = await text($, 'vaken-pr')
  expect(t).toMatch(/There is no pull request for feat-none\./)
  expect(t).not.toMatch(/Main is/)
  expect(JSON.stringify(w.mem.get('cockpit:band:me') ?? [])).not.toMatch(/PR/)
})

test('the PR check is off when the setting says off, and runs no program', async ($, on) => {
  const w = world(on, GH(makeView), () => ({ 'cockpit:setting:crew.pr': 'off' }))
  expect(await text($, 'vaken-pr')).toMatch(/off\. Turn it on: Settings > Agents/)
  expect(w.calls.filter(c => c[0] === 'gh')).toHaveLength(0)
})

test('a git push is told from a command that only mentions it', () => {
  for (const c of ['git push', 'git push origin feat-x', 'git push -u origin HEAD', 'cd /w/a && git push', 'git add . ; git commit -m x; git push', 'git -C /w/a push', 'GIT_SSH=ssh git push', 'make && git push --force-with-lease']) expect(isGitPush(c), c).toBe(true)
  for (const c of ['git pull', 'git status', 'git push-all', 'echo git push', 'git log --grep=push', 'git commit -m "git push later"', 'gh pr create', 'ls', '']) expect(isGitPush(c), c).toBe(false)
})

test('whyAsk: at the start, for 30 minutes after a push, while checks run; otherwise never', () => {
  const pending = { at: NOW, view: parsePrView(makeView()) }
  const passed = { at: NOW, view: parsePrView({ ...makeView(), statusCheckRollup: [run('lint', 9, 8)] }) }
  const merged = { at: NOW, view: parsePrView({ ...makeView(), state: 'MERGED' }) }
  expect(whyAsk({ now: NOW, startDue: true })).toBe('start')
  expect(whyAsk({ now: NOW, startDue: false })).toBeUndefined()
  expect(whyAsk({ now: NOW, startDue: false, facts: passed })).toBeUndefined()
  expect(whyAsk({ now: NOW, startDue: false, facts: { at: NOW, none: true } })).toBeUndefined()
  expect(whyAsk({ now: NOW, startDue: false, facts: { at: NOW, error: 'HTTP 502' } })).toBeUndefined()
  expect(whyAsk({ now: NOW, startDue: false, facts: pending })).toBe('pending')
  expect(whyAsk({ now: NOW, startDue: false, facts: merged })).toBeUndefined()
  expect(whyAsk({ now: NOW, startDue: false, pushedAt: NOW - 29 * MIN, facts: passed })).toBe('push')
  expect(whyAsk({ now: NOW, startDue: false, pushedAt: NOW - PUSH_WINDOW_MS, facts: passed })).toBeUndefined()
  expect(whyAsk({ now: NOW, startDue: false, pushedAt: NOW + MIN, facts: passed })).toBeUndefined()
})

test("a shared answer older than this session's push is not used", () => {
  const facts = { at: NOW - 60_000, branch: 'feat-x', none: true }
  const raw = withSharedPr(undefined, '/r/.git', 'feat-x', facts, NOW - 60_000)
  expect(sharedPr(raw, '/r/.git', 'feat-x', NOW)?.none).toBe(true)
  expect(sharedPr(raw, '/r/.git', 'feat-x', NOW, NOW - 90_000)?.none).toBe(true)
  expect(sharedPr(raw, '/r/.git', 'feat-x', NOW, NOW - 30_000)).toBeUndefined()
})

const passedView = () => ({ ...makeView(), statusCheckRollup: [run('lint', 20, 18), run('unit', 20, 15)] })
const ghAsks = (w: World): number => w.calls.filter(c => c[0] === 'gh' && c[1] === 'pr').length
async function startSession($: EngineInterface, on: On, w: World): Promise<void> {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('tool.call', { tool: /^(Bash|PowerShell)$/ }, () => ({ result: 'ok', text: 'ok' }) as never)
  await $.session.start({ cwd: '/w/a', surface: 'desktop', isInteractive: true })
  await w.clock.settle()
}
const wait = async (w: World, min: number): Promise<void> => {
  for (let n = 0; n < min; n += 1) {
    await w.clock.advance(MIN)
    await w.clock.settle()
  }
}

test('the timer asks gh once at the start, and then not at all while nothing can have changed', SLOW, async ($, on) => {
  const w = world(on, GH(passedView), () => ({ 'cockpit:session:me': rec('me', { cwd: '/w/a', branch: 'feat-x' }) }))
  await startSession($, on, w)
  await wait(w, 1)
  expect(ghAsks(w)).toBe(1)
  await wait(w, 8)
  expect(ghAsks(w)).toBe(1)
  await $.tool.call({ tool: 'Bash', command: 'git status' } as never)
  await wait(w, 8)
  expect(ghAsks(w)).toBe(1)
})

test('a git push in the PowerShell tool starts the pull request timer too', SLOW, async ($, on) => {
  const w = world(on, GH(passedView), () => ({ 'cockpit:session:me': rec('me', { cwd: '/w/a', branch: 'feat-x' }) }))
  await startSession($, on, w)
  await wait(w, 1)
  expect(ghAsks(w)).toBe(1)
  await wait(w, 3)
  await $.tool.call({ tool: 'PowerShell', command: 'git push origin feat-x' } as never)
  const pushed = ghAsks(w)
  await wait(w, 1)
  expect(ghAsks(w)).toBe(pushed + 1)
})

test('after a git push the timer asks for 30 minutes, with a fresh answer rather than a shared one from before the push, and then stops', SLOW, async ($, on) => {
  const w = world(on, GH(passedView), () => ({ 'cockpit:session:me': rec('me', { cwd: '/w/a', branch: 'feat-x' }) }))
  await startSession($, on, w)
  await wait(w, 1)
  expect(ghAsks(w)).toBe(1)
  await wait(w, 3)
  await $.tool.call({ tool: 'Bash', command: 'git push origin feat-x' } as never)
  const pushed = ghAsks(w)
  await wait(w, 1)
  expect(ghAsks(w)).toBe(pushed + 1)
  await wait(w, 12)
  expect(ghAsks(w)).toBeGreaterThan(pushed + 5)
  await wait(w, 18)
  const settled = ghAsks(w)
  await wait(w, 8)
  expect(ghAsks(w)).toBe(settled)
})

test('while the last answer says checks still run the timer keeps asking every 2 minutes, and stops once they are done', SLOW, async ($, on) => {
  let view: () => unknown = makeView
  const w = world(on, argv => GH(view)(argv), () => ({ 'cockpit:session:me': rec('me', { cwd: '/w/a', branch: 'feat-x' }) }))
  await startSession($, on, w)
  await wait(w, 1)
  expect(ghAsks(w)).toBe(1)
  await wait(w, 20)
  expect(ghAsks(w)).toBeGreaterThanOrEqual(9)
  view = passedView
  await wait(w, 5)
  const done = ghAsks(w)
  await wait(w, 10)
  expect(ghAsks(w)).toBe(done)
})

test('a typed /vaken-ship pr always asks, also when nothing can have changed', SLOW, async ($, on) => {
  const w = world(on, GH(passedView), () => ({ 'cockpit:session:me': rec('me', { cwd: '/w/a', branch: 'feat-x' }) }))
  await startSession($, on, w)
  await wait(w, 1)
  await wait(w, 30)
  const before = ghAsks(w)
  expect(await text($, 'vaken-pr')).toMatch(/^PR 123 is open\. All 2 checks passed\./)
  expect(ghAsks(w)).toBe(before + 1)
})

test('one sysctl: the names asked for, and the printed lines split back into the five values', () => {
  expect(sysctlArgv(['pressure', 'swap', 'load'])).toEqual(['sysctl', 'kern.memorystatus_vm_pressure_level', 'vm.swapusage', 'vm.loadavg'])
  const got = splitSysctl('kern.memorystatus_vm_pressure_level: 2\nvm.swapusage: total = 2048.00M  used = 1024.50M  free = 1023.50M  (encrypted)\nvm.loadavg: { 4.06 4.77 6.37 }\nhw.memsize: 17179869184\nhw.logicalcpu: 10\n')
  const l = parseLaptop(NOW, { pressure: got.pressure, swap: got.swap, load: got.load, memsize: got.memsize, cores: got.cores })
  expect(l).toMatchObject({ pressure: 'warn', swap: { totalMb: 2048, usedMb: 1024.5 }, load: 4.06, memMb: 16384, cores: 10 })
  expect(splitSysctl('')).toEqual({})
})

const MAC = (pressure: string, batt = "Now drawing from 'AC Power'\n -InternalBattery-0\t80%; charging; 1:00 remaining present: true\n") => (argv: readonly string[]): Answer | undefined => {
  if (argv[0] === 'sysctl') {
    const lines: Record<string, string> = {
      'kern.memorystatus_vm_pressure_level': pressure,
      'vm.swapusage': 'total = 4096.00M  used = 1228.80M  free = 2867.20M  (encrypted)',
      'vm.loadavg': '{ 2.00 1.50 1.00 }',
      'hw.memsize': '17179869184',
      'hw.logicalcpu': '8',
    }
    return { exitCode: 0, stdout: argv.slice(1).map(n => `${n}: ${lines[n] ?? ''}`).join('\n') }
  }
  if (argv[0] === 'vm_stat') return { exitCode: 0, stdout: VM_FREE }
  if (argv[0] === 'pmset' && argv[2] === 'batt') return { exitCode: 0, stdout: batt }
  if (argv[0] === 'pmset') return { exitCode: 0, stdout: 'Note: No thermal warning level has been recorded\n' }
  if (argv[0] === 'ps') return { exitCode: 0, stdout: PS }
  if (argv[0] === 'top') return { exitCode: 0, stdout: 'Processes: 400 total\nCPU usage: 10.0% user, 5.0% sys, 85.0% idle \n' }
  return undefined
}

test('the computer reading is on by default; with it set off it runs no program', async ($, on) => {
  const w = world(on, MAC('1'), () => ({ 'cockpit:setting:laptop.mode': 'off' }))
  expect(await text($, 'vaken-laptop')).toMatch(/Computer load: off\. It runs short programs/)
  expect(w.calls.filter(isGauge)).toEqual([])
})

test('a session start removes the old laptop key once, and leaves the new reading alone', async ($, on) => {
  const w = world(on, MAC('1'), () => ({ 'cockpit:laptop:sample': { at: 1 }, 'cockpit:laptop:v2': { at: 2 } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'x' } }))
  await $.session.start({ cwd: '/w/a', surface: 'desktop', isInteractive: true })
  expect(w.mem.has('cockpit:laptop:sample')).toBe(false)
  expect(w.mem.get('cockpit:laptop:v2')).toEqual({ at: 2 })
})

test('On: it runs six programs a reading (one sysctl for five values, vm_stat for the free share, top for the processor), says it in plain words, and reads at most once a minute', async ($, on) => {
  const w = world(on, MAC('1'), () => ({ 'cockpit:setting:laptop.mode': 'on' }))
  const t = await text($, 'vaken-laptop')
  expect(t).toMatch(/^Computer load: on\.\nMemory is fine: 4 Claude sessions use 3\.6 GB\.\nSwap: 1\.2 GB used of 4\.0 GB\.\nBattery 80%, plugged in\.\nHeat is fine\./)
  expect(w.calls.filter(isGauge).map(c => c.join(' ')).sort()).toEqual(['pmset -g batt', 'pmset -g therm', 'ps -axo pid,rss,command', 'sysctl kern.memorystatus_vm_pressure_level vm.swapusage vm.loadavg hw.memsize hw.logicalcpu', 'top -l 1 -n 0', 'vm_stat'])
  await text($, 'vaken-laptop')
  expect(w.calls.filter(isGauge)).toHaveLength(6)
  expect(w.mem.get('cockpit:band:me')).toBeUndefined()
  await w.clock.advance(61_000)
  await text($, 'vaken-laptop')
  // The memory size and the cores never change: the second reading does not ask for them again, and still shows them.
  expect(w.calls.filter(isGauge)).toHaveLength(12)
  expect(w.calls.filter(isGauge).map(c => c.join(' ')).filter(c => c.startsWith('sysctl'))[1]).toBe('sysctl kern.memorystatus_vm_pressure_level vm.swapusage vm.loadavg')
  expect((w.mem.get('cockpit:laptop:v2') as { memMb?: number; cores?: number }).memMb).toBe(16384)
  expect((w.mem.get('cockpit:laptop:v2') as { memMb?: number; cores?: number }).cores).toBe(8)
  expect(w.mem.get('cockpit:laptop:v2')).toMatchObject({ schema: LAPTOP_SCHEMA, cpuBusy: 15 })
})

test('an unstamped reading from older code is read again at once; a stamped fresh one is left alone', async ($, on) => {
  const w = world(on, MAC('1'), now => ({ 'cockpit:setting:laptop.mode': 'on', 'cockpit:laptop:v2': { at: now - 10_000, pressure: 'normal', memMb: 16384, load: 2, cores: 8, procs: { count: 0, rssMb: 0 } } }))
  const t = await text($, 'vaken-laptop')
  expect(w.calls.filter(isGauge)).toHaveLength(6)
  expect(t).toMatch(/Memory is fine: 4 Claude sessions use 3\.6 GB\./)
  expect(w.mem.get('cockpit:laptop:v2')).toMatchObject({ schema: LAPTOP_SCHEMA })
  expect((w.mem.get('cockpit:laptop:v2') as { freeShare?: number }).freeShare).toBeDefined()
  expect(w.calls.filter(c => c[0] === 'sysctl')[0]?.join(' ')).toBe('sysctl kern.memorystatus_vm_pressure_level vm.swapusage vm.loadavg')
})

test('a stamped reading under a minute old is left alone: no program runs', async ($, on) => {
  const w = world(on, MAC('1'), now => ({ 'cockpit:setting:laptop.mode': 'on', 'cockpit:laptop:v2': { at: now - 10_000, schema: LAPTOP_SCHEMA, pressure: 'normal', freeShare: 0.4, procs: { count: 2, rssMb: 900 } } }))
  await text($, 'vaken-laptop')
  expect(w.calls.filter(isGauge)).toEqual([])
})

test('without a pressure level vm_stat is the fallback, the one program more', async ($, on) => {
  const w = world(on, (argv: readonly string[]): Answer | undefined => (argv[0] === 'sysctl' ? { exitCode: 1, stdout: '' } : MAC('1')(argv)), () => ({ 'cockpit:setting:laptop.mode': 'on' }))
  await text($, 'vaken-laptop')
  expect(w.calls.filter(isGauge).map(c => c[0]).sort()).toEqual(['pmset', 'pmset', 'ps', 'sysctl', 'top', 'vm_stat'])
})

async function gaugeRuns($: EngineInterface, on: On, helpers: boolean): Promise<number> {
  const w = world(on, MAC('1'), () => ({ 'cockpit:setting:laptop.mode': 'on' }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('agent.list', () => ({ value: helpers ? [{ id: 'a1', status: 'running' }] : [{ id: 'a0', status: 'completed' }] }) as never)
  await $.session.start({ cwd: '/w/a', surface: 'desktop', isInteractive: true })
  // Ten minutes with a tool step each minute (a busy session), so the quiet timers keep their pace.
  for (let m = 0; m < 10; m += 1) {
    await w.clock.advance(MIN)
    await $.tool.call({ tool: 'Edit', file_path: `/w/a/src/f${m}.ts`, old_string: 'a', new_string: 'b' } as never)
  }
  return w.calls.filter(isGauge).length / 6
}

test('the computer reading reads every 3 minutes with no helper running', { timeoutMs: 15_000 }, async ($, on) => {
  expect(await gaugeRuns($, on, false)).toBe(4)
})

test('the computer reading reads every minute while a helper agent runs', { timeoutMs: 15_000 }, async ($, on) => {
  expect(await gaugeRuns($, on, true)).toBeGreaterThanOrEqual(9)
})

test('On: tight memory posts a band warning and one toast; low battery unplugged does the same', async ($, on) => {
  const w = world(on, MAC('4\n', "Now drawing from 'Battery Power'\n -InternalBattery-0\t18%; discharging; 0:40 remaining present: true\n"), () => ({ 'cockpit:setting:laptop.mode': 'on' }))
  const t = await text($, 'vaken-laptop')
  expect(t).toMatch(/This Mac is short of memory\. Your 4 Claude sessions use 3\.6 GB of it\./)
  expect(t).toMatch(/It is low: plug in\./)
  const band = JSON.stringify(w.mem.get('cockpit:band:me'))
  expect(band).toMatch(/This Mac is short of memory\. Your 4 Claude sessions use 3\.6 GB of it/)
  expect(band).toMatch(/Battery 18%, not plugged in/)
  expect(w.toasts).toHaveLength(2)
  await w.clock.advance(61_000)
  await text($, 'vaken-laptop')
  expect(w.toasts).toHaveLength(2)
})

test('On, but on a machine where the programs do not exist: it says so and posts nothing', async ($, on) => {
  const w = world(on, () => undefined, () => ({ 'cockpit:setting:laptop.mode': 'on' }))
  expect(await text($, 'vaken-laptop')).toMatch(/none of the programs gave an answer/)
  expect(w.mem.get('cockpit:band:me')).toBeUndefined()
})

test('the Mac programs are pinned: the same argv and the same words as before', () => {
  expect(LAPTOP_ARGV.batt).toEqual(['pmset', '-g', 'batt'])
  expect(LAPTOP_ARGV.therm).toEqual(['pmset', '-g', 'therm'])
  expect(LAPTOP_ARGV.ps).toEqual(['ps', '-axo', 'pid,rss,command'])
  expect(LAPTOP_ARGV.vmstat).toEqual(['vm_stat'])
  expect(sysctlArgv(['pressure', 'swap', 'load', 'memsize', 'cores'])).toEqual(['sysctl', 'kern.memorystatus_vm_pressure_level', 'vm.swapusage', 'vm.loadavg', 'hw.memsize', 'hw.logicalcpu'])
  expect(laptopText('on', parseLaptop(NOW, {}), NOW)).toMatch(/It works on a Mac only\.$/)
})

const WIN_JSON = '{"battery":[{"EstimatedChargeRemaining":84,"BatteryStatus":2,"EstimatedRunTime":71582788}],"memTotalKb":33251192,"memFreeKb":16036752,"swapUsedMb":97,"swapTotalMb":7730,"cpu":50,"cores":32,"claudeCount":1,"claudeKb":551764}'
const withBattery = (b: string): string => WIN_JSON.replace(/"battery":\[.*?\],/, `"battery":${b},`)

test('Windows argv: one PowerShell program with a fixed script (no double quote, no backslash)', () => {
  const argv = winGaugeArgv()
  expect(argv.slice(0, 4)).toEqual(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command'])
  expect(argv).toHaveLength(5)
  expect(argv[4]).toMatch(/Win32_Battery/)
  expect(/["\\]/.test(argv[4] ?? '')).toBe(false)
})

test('Windows parse: the measured sample gives memory, swap, cores, load, battery on power and the sessions', () => {
  const l = parseWinLaptop(NOW, WIN_JSON)
  expect(l).toMatchObject({ win: true, memMb: 32472, cores: 32, load: 16, swap: { totalMb: 7730, usedMb: 97 }, procs: { count: 1, rssMb: 539 }, battery: { hasBattery: true, onAc: true, percent: 84 } })
  expect(Math.round((l.freeShare ?? 0) * 1000)).toBe(482)
  expect(l.battery?.remaining).toBeUndefined()
  expect(l.pressure).toBeUndefined()
  expect(l.thermal).toBeUndefined()
  expect(memoryTight(l)).toBe(false)
  expect(laptopWords(l)).toEqual(['Memory is fine: 1 Claude session uses 0.5 GB.', 'Swap: 0.1 GB used of 7.5 GB.', 'Battery 84%, plugged in.'])
  expect(laptopText('on', l, NOW)).toMatch(/^Computer load: on\.\nMemory is fine/)
})

test('Windows parse: a desktop has no battery and says so plainly', () => {
  const l = parseWinLaptop(NOW, withBattery('[]'))
  expect(l.battery).toEqual({ hasBattery: false, onAc: true })
  expect(laptopWords(l)).toContain('No battery: this machine runs on power.')
  expect(batteryLow(l)).toBe(false)
  expect(parseWinLaptop(NOW, withBattery('null')).battery?.hasBattery).toBe(false)
})

test('Windows parse: one battery as an object, discharging with a run time, low', () => {
  const l = parseWinLaptop(NOW, withBattery('{"EstimatedChargeRemaining":15,"BatteryStatus":1,"EstimatedRunTime":125}'))
  expect(l.battery).toEqual({ hasBattery: true, onAc: false, percent: 15, remaining: '2:05' })
  expect(batteryLow(l)).toBe(true)
  expect(laptopWords(l)).toContain('Battery 15%, not plugged in, about 2:05 left. It is low: plug in.')
})

test('Windows parse: the unknown run time is none, an array of batteries averages the charge, charging counts as plugged in', () => {
  const unknown = parseWinLaptop(NOW, withBattery('[{"EstimatedChargeRemaining":50,"BatteryStatus":1,"EstimatedRunTime":71582788}]'))
  expect(unknown.battery).toEqual({ hasBattery: true, onAc: false, percent: 50, remaining: undefined })
  expect(laptopWords(unknown)).toContain('Battery 50%, not plugged in.')
  const two = parseWinLaptop(NOW, withBattery('[{"EstimatedChargeRemaining":40,"BatteryStatus":1,"EstimatedRunTime":60},{"EstimatedChargeRemaining":80,"BatteryStatus":3,"EstimatedRunTime":71582788}]'))
  expect(two.battery).toEqual({ hasBattery: true, onAc: true, percent: 60, remaining: undefined })
  expect(parseWinLaptop(NOW, withBattery('[{"EstimatedChargeRemaining":30,"BatteryStatus":6,"EstimatedRunTime":71582788}]')).battery?.onAc).toBe(true)
})

test('Windows parse: tight memory, no sessions, and text that is not the JSON', () => {
  const tight = parseWinLaptop(NOW, WIN_JSON.replace('"memFreeKb":16036752', '"memFreeKb":1000000').replace('"claudeCount":1', '"claudeCount":0'))
  expect(memoryTight(tight)).toBe(true)
  expect(laptopWords(tight)[0]).toBe('This Mac is short of memory. No Claude session was found.')
  expect(laptopWords(tight)[1]).toBe('(An estimate from the share of memory that is free: Windows has no pressure level.)')
  expect(isReadable(parseWinLaptop(NOW, ''))).toBe(false)
  expect(isReadable(parseWinLaptop(NOW, 'not json'))).toBe(false)
  expect(isReadable(parseWinLaptop(NOW, '[1]'))).toBe(false)
  expect(laptopText('on', parseWinLaptop(NOW, ''), NOW)).toMatch(/the PowerShell program gave no answer/)
  expect(parseWinLaptop(NOW, 'noise {"cpu":10,"cores":4}\n')).toMatchObject({ cores: 4, load: 0.4 })
  expect(parseWinLaptop(NOW, `${WIN_JSON}\r\n`)).toEqual(parseWinLaptop(NOW, WIN_JSON))
  expect(splitSysctl('hw.logicalcpu: 10\r\nvm.loadavg: { 1.00 2.00 3.00 }\r\n')).toEqual({ cores: '10', load: '{ 1.00 2.00 3.00 }' })
  expect(claudeProcs('  101 1024 claude\r\n  102 2048 /bin/claude\r\n')).toEqual({ count: 2, rssMb: 3 })
})
