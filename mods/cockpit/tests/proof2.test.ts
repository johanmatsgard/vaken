// Proof, more rules: the rules and the hooks and commands as the engine runs them.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { emptyState, goalFrom, recordEdit as proofEdit, recordReceipts } from '../hooks/core/proof'
import type { ProofState } from '../hooks/core/proof'
import { BASELINE_EDITS, DRIFT_EDITS, PROOF2_HELP, PROOF2_SETTINGS, afterTurn2, confidence, confidenceLines, driftOf, emptyState2, goalWords, intentText, kindOfCommand, linesOf, namesGoal, newAnomalies, readState2, recordCall, recordEdit, sameArea, withFlags, writesFiles } from '../hooks/core/proof2'
import type { Proof2State } from '../hooks/core/proof2'
import { heatOf, isCodePath, isTestPath, queueLines, riskOf, scoreChange, shortName } from '../hooks/core/proof2risk'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')

test('a path is config, CI, migration, security, test or code', () => {
  expect(riskOf('/w/.github/workflows/ci.yml')).toEqual(['ci', 'config'])
  expect(riskOf('/w/db/migrations/001_init.sql')).toEqual(['migration'])
  expect(riskOf('/w/src/auth/login.ts')).toEqual(['security'])
  expect(riskOf('/w/package.json')).toEqual(['config'])
  expect(riskOf('/w/src/author.ts')).toEqual([])
  expect(riskOf('/w/src/tokens.ts')).toEqual([])
  expect(riskOf('/w/src/view.tsx')).toEqual([])
  expect(isTestPath('/w/tests/a.ts')).toBe(true)
  expect(isTestPath('/w/src/a.test.ts')).toBe(true)
  expect(isTestPath('/w/src/a.ts')).toBe(false)
  expect(isCodePath('/w/src/a.ts')).toBe(true)
  expect(isCodePath('/w/docs/a.md')).toBe(false)
  expect(shortName('/w/hooks/core/proof2.ts')).toBe('core/proof2.ts')
})

test('the key words of a goal: four letters or more, no common words, at most eight', () => {
  expect(goalWords('Add a dark mode switch to the settings page.')).toEqual(['dark', 'mode', 'switch', 'settings', 'page'])
  expect(goalWords(undefined)).toEqual([])
  expect(goalWords('Please make sure it works.')).toEqual(['works'])
  expect(goalWords('alpha bravo charlie delta echoes foxtrot golfers hotels indigo').length).toBe(8)
})

test('a path names a goal word in a folder or a file name, also in another form of the word', () => {
  const words = goalWords('Add a dark mode switch to the settings page.')
  expect(namesGoal('/w/app/settings', words)).toEqual(['settings'])
  expect(namesGoal('/w/app/setting-panel/theme.ts', words)).toEqual(['settings'])
  expect(namesGoal('/w/infra/deploy', words)).toEqual([])
})

test('which folders belong together: the same, nested, or side by side', () => {
  expect(sameArea('/w/a/b', '/w/a/b')).toBe(true)
  expect(sameArea('/w/a', '/w/a/b/c')).toBe(true)
  expect(sameArea('/w/a/b', '/w/a/c')).toBe(true)
  expect(sameArea('/w/a/b', '/w/x/y')).toBe(false)
})

const edit = (s: Proof2State, path: string, lines = 4): Proof2State => recordEdit(s, path, lines)
const editMany = (s: Proof2State, path: string, n: number): Proof2State => Array.from({ length: n }).reduce<Proof2State>(x => edit(x, path), s)

test('drift: edits in new folders, far from the first ones and from the goal, add up to a warning', () => {
  const goal = 'Add a dark mode switch to the settings page.'
  let s = editMany(emptyState2(), '/w/app/ui/theme.ts', BASELINE_EDITS)
  expect(driftOf(s, goal)).toEqual({ hasGoal: true, edits: 0, folders: [], over: false })
  s = editMany(s, '/w/app/ui/more.ts', 2)
  expect(driftOf(s, goal).edits).toBe(0)
  s = editMany(s, '/w/infra/deploy/run.ts', DRIFT_EDITS - 1)
  expect(driftOf(s, goal)).toEqual({ hasGoal: true, edits: DRIFT_EDITS - 1, folders: ['infra/deploy'], over: false })
  s = edit(s, '/w/infra/deploy/run.ts')
  expect(driftOf(s, goal).over).toBe(true)
  expect(JSON.stringify(s.wander)).toBe('{"/w/infra/deploy":5}')
})

test('drift still works on a goal that is only key words (goalFrom)', () => {
  const goal = goalFrom('Add a dark mode switch to the settings page. Keep it small.')
  expect(goal).toBeDefined()
  expect(goalWords(goal).length).toBeGreaterThan(0)
  expect(namesGoal('src/dark/mode.ts', goalWords(goal)).length).toBeGreaterThan(0)
  expect(namesGoal('infra/deploy/x.ts', goalWords(goal)).length).toBe(0)
})

test('drift: a folder the goal names, a test folder and no goal are not drift', () => {
  const goal = 'Add a dark mode switch to the settings page.'
  let s = editMany(emptyState2(), '/w/app/ui/theme.ts', BASELINE_EDITS)
  s = editMany(s, '/w/other/settings/panel.ts', 7)
  s = editMany(s, '/w/other/tests/panel.test.ts', 7)
  expect(driftOf(s, goal).edits).toBe(0)
  expect(driftOf(s, goal).over).toBe(false)
  const wandered = editMany(editMany(emptyState2(), '/w/app/ui/a.ts', BASELINE_EDITS), '/w/infra/deploy/run.ts', 9)
  expect(driftOf(wandered, undefined)).toEqual({ hasGoal: false, edits: 0, folders: [], over: false })
  expect(driftOf(wandered, 'Do it please').hasGoal).toBe(false)
})

test('the kind of a command is its program, or program and subcommand for the usual runners; never its arguments', () => {
  expect(kindOfCommand('npm run build -- --secret=1')).toBe('npm run')
  expect(kindOfCommand('cd app && git commit -m "x"')).toBe('git commit')
  expect(kindOfCommand('FOO=1 python3 /x/script.py arg')).toBe('python3')
  expect(kindOfCommand('cd /x')).toBeUndefined()
  expect(kindOfCommand('')).toBeUndefined()
  expect(writesFiles('sed -i s/a/b/ x.ts')).toBe(true)
  expect(writesFiles('git commit -m x')).toBe(true)
  expect(writesFiles('echo hi > out.txt')).toBe(true)
  expect(writesFiles('npm test')).toBe(false)
  expect(writesFiles('grep -rn foo src | head')).toBe(false)
})

test('lines changed are counted from the input of an edit, not read', () => {
  expect(linesOf('Edit', { old_string: 'a\nb', new_string: 'c' })).toBe(3)
  expect(linesOf('Write', { content: 'a\nb\nc' })).toBe(3)
  expect(linesOf('MultiEdit', { edits: [{ old_string: 'a', new_string: 'b\nc' }, { old_string: 'd', new_string: 'e' }] })).toBe(5)
  expect(linesOf('Edit', {})).toBe(1)
})

test('anomaly: the same file edited again and again in one turn', () => {
  let s = editMany(emptyState2(), '/w/a/b.ts', 5)
  expect(newAnomalies(s)).toEqual([])
  s = edit(s, '/w/a/b.ts')
  const found = newAnomalies(s)
  expect(found.length).toBe(1)
  expect(found[0].band).toBe('a/b.ts edited 6 times')
  expect(found[0].detail).toBe('a/b.ts edited 6 times in one turn')
  s = withFlags(s, found)
  expect(newAnomalies(edit(s, '/w/a/b.ts'))).toEqual([])
  const next = afterTurn2(s, emptyState(), NOW)
  expect(next.files['/w/a/b.ts'].turnN).toBe(0)
  expect(newAnomalies(editMany(next, '/w/a/b.ts', 6)).length).toBe(1)
})

test('anomaly: many calls that change no file and add a lot of text; a file change or a message ends the stretch', () => {
  let s = emptyState2()
  for (let n = 0; n < 15; n += 1) s = recordCall(s, { chars: 1000, progress: false })
  expect(newAnomalies(s)).toEqual([])
  let big = emptyState2()
  for (let n = 0; n < 14; n += 1) big = recordCall(big, { chars: 4000, progress: false })
  expect(newAnomalies(big)).toEqual([])
  big = recordCall(big, { chars: 4000, progress: false })
  const found = newAnomalies(big)
  expect(found.map(f => f.band)).toEqual(['Stuck? 15 calls, no file changed'])
  expect(newAnomalies(withFlags(big, found))).toEqual([])
  expect(recordEdit(big, '/w/a.ts', 1).idleCalls).toBe(0)
  expect(recordCall(big, { chars: 10, progress: true }).idleCalls).toBe(0)
})

test('anomaly: one kind of command fails again and again with different commands (the same command is the loop breaker\'s work)', () => {
  const fail = (s: Proof2State, cmd: string): Proof2State => recordCall(s, { chars: 10, progress: false, bash: { kind: kindOfCommand(cmd) ?? '', cmd, failed: true } })
  let same = emptyState2()
  for (let n = 0; n < 4; n += 1) same = fail(same, 'npm run a')
  expect(newAnomalies(same)).toEqual([])
  let s = emptyState2()
  for (const c of ['npm run a', 'npm run b', 'npm run c']) s = fail(s, c)
  const found = newAnomalies(s)
  expect(found.map(f => f.band)).toEqual(['npm run failed 3 times'])
  expect(JSON.stringify(s)).not.toMatch(/npm run a/)
  const ok = recordCall(s, { chars: 10, progress: false, bash: { kind: 'npm run', cmd: 'npm run d', failed: false } })
  expect(newAnomalies(ok)).toEqual([])
  let g = emptyState2()
  for (const c of ['grep a x', 'grep b x', 'grep c x']) g = fail(g, c)
  expect(newAnomalies(g)).toEqual([])
})

test('a finished answer becomes one change with its size, risk, test and check state', () => {
  let s = edit(edit(emptyState2(), '/w/src/auth/login.ts', 30), '/w/src/auth/user.ts', 30)
  s = afterTurn2(s, emptyState(), NOW)
  expect(s.turn).toBe(1)
  expect(s.changes).toEqual([{ turn: 0, at: NOW, files: 2, lines: 60, code: 2, tests: false, risk: ['security'], receipt: 'missing', names: ['auth/login.ts', 'auth/user.ts'] }])
  expect(afterTurn2(s, emptyState(), NOW).changes.length).toBe(1)
})

test('risk: kind of file, size, no test, and the state of the checks each add points with a reason', () => {
  const calm = scoreChange({ lines: 10, code: 1, tests: true, risk: [], receipt: 'ok' })
  expect(calm).toEqual({ score: 0, level: 'low', reasons: [] })
  const bad = scoreChange({ lines: 300, code: 2, tests: false, risk: ['security'], receipt: 'failed' })
  expect(bad.level).toBe('high')
  expect(bad.score).toBe(3 + 2 + 2 + 3)
  expect(bad.reasons).toEqual(['it touches security-related files', 'it is big (300 lines changed)', 'no test file was touched', 'a check failed'])
  expect(scoreChange({ lines: 10, code: 0, tests: false, risk: ['config'], receipt: 'unclear' }).level).toBe('medium')
})

test('the review queue: riskiest first, the newest marked as waiting, nothing invented', () => {
  expect(queueLines([], 0)[0]).toMatch(/empty/)
  const mk = (turn: number, risk: 'security' | 'config', receipt: 'ok' | 'missing') => ({ turn, at: NOW, files: 1, lines: 10, code: 1, tests: true, risk: risk === 'security' ? ['security' as const] : [], receipt, names: [`f${turn}.ts`] })
  const lines = queueLines([mk(0, 'security', 'missing'), mk(1, 'config', 'ok'), mk(2, 'security', 'ok')], 1)
  expect(lines[1]).toMatch(/^1\. MEDIUM: 1 file, 10 lines \(f0\.ts\)/)
  expect(lines[2]).toMatch(/Why: it touches security-related files; no passing check after the last edit\./)
  expect(lines[3]).toMatch(/^2\. MEDIUM: .*\(f2\.ts\).*new since your last message/)
  expect(lines[5]).toMatch(/^3\. LOW: .*\(f1\.ts\)/)
  expect(lines[6]).toBe('   Why: nothing stands out.')
})

test('reviewer heat: edits, size and risk rank the files; a code file with no test file in the same turn is flagged', () => {
  let s = emptyState2()
  s = editMany(s, '/w/src/hot.ts', 4)
  s = edit(s, '/w/src/auth/login.ts', 60)
  s = edit(s, '/w/src/covered.ts')
  s = edit(s, '/w/tests/covered.test.ts')
  s = afterTurn2(s, emptyState(), NOW)
  s = edit(s, '/w/docs/notes.md')
  const hot = heatOf(s.files, s.testTurns)
  expect(hot.map(h => shortName(h.path))).toEqual(['auth/login.ts', 'src/hot.ts', 'docs/notes.md', 'src/covered.ts'])
  expect(hot[0].path).toBe('/w/src/auth/login.ts')
  expect(hot.find(h => h.path === '/w/src/hot.ts')?.untested).toBe(false)
  expect(hot.some(h => h.path.endsWith('.test.ts'))).toBe(false)
})

test('reviewer heat: in one turn, a test file covers every code file edited in that turn, and only that turn', () => {
  let s = edit(emptyState2(), '/w/src/a.ts')
  s = afterTurn2(s, emptyState(), NOW)
  s = edit(edit(s, '/w/src/b.ts'), '/w/tests/b.test.ts')
  const byName = Object.fromEntries(heatOf(s.files, s.testTurns).map(h => [shortName(h.path), h.untested]))
  expect(byName).toEqual({ 'src/a.ts': true, 'src/b.ts': false })
})

const proofWith = (steps: ((p: ProofState) => ProofState)[]): ProofState => steps.reduce((p, f) => f(p), emptyState())
const edited = (p: ProofState): ProofState => proofEdit(p, 'a.ts')
const passed = (kind: 'tests' | 'build' | 'lint' | 'types', ok = true) => (p: ProofState): ProofState => recordReceipts(p, [{ kind, ok }], NOW)

test('confidence: no number without a changed file and a check that ran', () => {
  const none = confidence(emptyState(), emptyState2(), { doneOn: true, goal: undefined })
  expect(none.score).toBeUndefined()
  expect(confidenceLines(none).join('\n')).toMatch(/not enough evidence yet/)
  const noCheck = confidence(proofWith([edited]), edit(emptyState2(), '/w/a.ts'), { doneOn: true, goal: undefined })
  expect(noCheck.score).toBeUndefined()
  expect(noCheck.missing).toMatch(/No check/)
})

test('confidence: every point has an item behind it, and a missing proof earns nothing', () => {
  const s2 = edit(emptyState2(), '/w/src/a.ts', 20)
  const p = proofWith([edited, passed('tests')])
  const c = confidence(p, s2, { doneOn: true, goal: undefined })
  expect(c.score).toBe(55)
  expect(c.items.map(i => `${i.label}=${i.points}/${i.max}`)).toEqual(['Checks passed after the last edit=40/40', 'Definition of done met=0/20', 'No unproven claims=0/15', 'Small diff=15/15', 'No drift=0/10'])
  const text = confidenceLines(c).join('\n')
  expect(text).toMatch(/Confidence: 55 out of 100/)
  expect(text).toMatch(/40 of 40 {2}Checks passed after the last edit: passed: tests/)
  expect(text).toMatch(/0 of 20 {2}Definition of done met: not set/)
  // everything in order: done met, no unproven claim, small diff, goal with no drift
  const full = confidence({ ...p, done: ['tests'], last: { at: NOW, seconds: 1, edits: 1, files: 1, ran: [], claims: [], unproven: [], notChecked: [], doneSet: ['tests'], doneMet: true } }, s2, { doneOn: true, goal: 'Fix the login page layout.' })
  expect(full.score).toBe(100)
  // a file edited after the check makes it stale: no check points
  const stale = confidence(proofWith([edited, passed('tests'), edited]), s2, { doneOn: true, goal: undefined })
  expect(stale.items[0].points).toBe(0)
  expect(stale.items[0].why).toMatch(/not yet: tests \(not run since the last edit\)/)
  // half of the relevant checks passed: half the points
  const half = confidence(proofWith([edited, passed('tests'), passed('lint', false)]), s2, { doneOn: true, goal: undefined })
  expect(half.items[0].points).toBe(20)
})

test('confidence: a big diff and drift take points', () => {
  const big = editMany(emptyState2(), '/w/src/a.ts', 100).lines
  expect(big).toBe(400)
  const p = proofWith([edited, passed('tests')])
  const s2 = editMany(emptyState2(), '/w/src/a.ts', 100)
  expect(confidence(p, s2, { doneOn: true, goal: undefined }).items[3].points).toBe(5)
  const drifted = editMany(editMany(emptyState2(), '/w/app/ui/a.ts', BASELINE_EDITS), '/w/infra/deploy/run.ts', DRIFT_EDITS)
  expect(confidence(p, drifted, { doneOn: true, goal: 'Add a dark mode switch.' }).items[4]).toMatchObject({ points: 0 })
})

test('intent: asked, delivered, extra and missing in one paragraph', () => {
  expect(intentText(emptyState(), emptyState2(), { doneOn: true, goal: undefined })).toMatch(/no goal is set/)
  const goal = 'Add a dark mode switch to the settings page.'
  let s2 = editMany(emptyState2(), '/w/app/settings/theme.ts', BASELINE_EDITS)
  s2 = editMany(s2, '/w/infra/deploy/run.ts', 2)
  const p: ProofState = { ...proofWith([edited, passed('tests')]), done: ['tests', 'build'] }
  const text = intentText(p, s2, { doneOn: true, goal })
  expect(text).not.toMatch(/\n/)
  expect(text).toMatch(/^Asked: dark, mode, switch, settings, page\./)
  expect(text).toMatch(/Delivered: 2 files changed \(5 edits\); changed paths name settings; checks that passed: tests\./)
  expect(text).toMatch(/Extra: 2 edits in folders the goal does not name: infra\/deploy\./)
  expect(text).toMatch(/Missing: the build \(not run\) from your definition of done\./)
  const calm = intentText({ ...p, done: ['tests'] }, editMany(emptyState2(), '/w/app/settings/theme.ts', 2), { doneOn: true, goal })
  expect(calm).toMatch(/Extra: nothing found/)
  expect(calm).toMatch(/Missing: nothing; every check in your definition of done passed/)
  const noDone = intentText({ ...p, done: [] }, s2, { doneOn: true, goal })
  expect(noDone).toMatch(/Missing: no definition of done is set/)
})

test('a stored value of the wrong shape gives an empty state', () => {
  expect(readState2('x')).toEqual(emptyState2())
  expect(readState2({ turn: 'no' })).toEqual(emptyState2())
})

test('the state keeps folder and file names, counts and hashes, and no command or text', () => {
  let s = edit(emptyState2(), '/w/src/a.ts', 3)
  s = recordCall(s, { chars: 50, progress: false, bash: { kind: 'npm test', cmd: 'npm test --secret-token=abc', failed: true } })
  expect(JSON.stringify(s)).not.toMatch(/secret-token|abc/)
})

test('the settings and help words', () => {
  expect(PROOF2_SETTINGS.map(s => `${s.key}=${s.default}`)).toEqual(['proof.drift=warn', 'proof.anomaly=warn', 'proof.confidence=on'])
  for (const s of PROOF2_SETTINGS) {
    expect(s.group).toBe('Checks')
    expect(s.options.some(o => o.value === s.default)).toBe(true)
  }
  expect(PROOF2_HELP.length).toBe(2)
})

// ---- The hooks, through the engine ----

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:proof.drift', 'warn'], ['cockpit:setting:proof.anomaly', 'warn']])
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

// The engine below the plugin: a clock, a store, a session id, tool answers.
function engine(on: On, o: { bash?: (command: string) => { isError?: true; text: string }; read?: string } = {}): Map<string, unknown> {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('command.register', () => ({ value: { command: 'x' } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('tool.call', { tool: /^(Bash|PowerShell)$/ }, (_$, e) => {
    const r = (o.bash ?? (() => ({ text: 'ok' })))(String((e as unknown as { command: string }).command))
    return { result: { stdout: r.text, stderr: '', code: r.isError === true ? 1 : 0 }, text: r.text, ...(r.isError === true ? { isError: true } : {}) } as never
  })
  on('tool.call', { tool: 'Edit' }, () => ({ result: { ok: true }, text: 'edited' }) as never)
  on('tool.call', { tool: 'Read' }, () => ({ result: { ok: true }, text: o.read ?? 'x' }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  return mem
}

type Tool = { tool: { call: (i: never) => Promise<{ context?: string[]; text?: string }> } }
const editAt = ($: Tool, path: string): Promise<{ context?: string[] }> => $.tool.call({ tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b' } as never)
const endTurn = ($: { turn: { complete: (i: never) => Promise<{ text: string }> } }, turnId = 't1'): Promise<{ text: string }> => $.turn.complete({ answer: 'Changed it.', durationMs: 30_000, isAborted: false, turnId, reason: 'answer' } as never)
const run = async ($: unknown, command: string, args = ''): Promise<string> => ((await ($ as { command: { run: (i: never) => Promise<{ text: string }> } }).command.run(viaParent(command, args) as never)) as { text: string }).text

const state2Of = (mem: Map<string, unknown>): Proof2State => readState2(mem.get('cockpit:proof2:test-session'))
const ledgerOf = (mem: Map<string, unknown>): { what: string; did?: boolean; detail?: string }[] => (mem.get('cockpit:ledger:compact') ?? []) as { what: string; did?: boolean; detail?: string }[]
const bandOf = (mem: Map<string, unknown>): { id: string; level: string; text: string }[] => (mem.get('cockpit:band:test-session') ?? []) as { id: string; level: string; text: string }[]

test('drift is flagged once, with a ledger line, a band item and a note to Claude', SLOW, async ($, on) => {
  const mem = engine(on)
  mem.set('cockpit:setting:claude.notes', 'all')
  await $.prompt.submit({ text: 'Add a dark mode switch to the settings page. Keep it small.' } as never)
  for (let n = 0; n < BASELINE_EDITS; n += 1) await editAt($ as never, '/w/app/ui/theme.ts')
  for (let n = 0; n < DRIFT_EDITS - 1; n += 1) expect((await editAt($ as never, `/w/infra/deploy/run${n}.ts`)).context).toBeUndefined()
  const fifth = await editAt($ as never, '/w/infra/deploy/run9.ts')
  expect(fifth.context?.join(' ')).toMatch(/last 5 edits went to folders that do not match the goal \(infra\/deploy\)/)
  expect(ledgerOf(mem).filter(l => l.what === 'Noticed work far from the goal').map(l => `${l.did}|${l.detail}`)).toEqual(['true|5 edits in 1 new folder: infra/deploy'])
  expect(bandOf(mem).find(b => b.id === 'proof2:drift')).toMatchObject({ level: 'warn', text: 'Drift: 5 edits far from the goal' })
  expect((await editAt($ as never, '/w/infra/deploy/run5.ts')).context).toBeUndefined()
  expect(ledgerOf(mem).filter(l => l.what === 'Noticed work far from the goal').length).toBe(1)
  // the goal words are the only text near the state: never the goal sentence itself
  expect(JSON.stringify(state2Of(mem))).not.toMatch(/dark mode/)
})

test('drift off: edits are counted and nothing is said', SLOW, async ($, on) => {
  const mem = engine(on)
  mem.set('cockpit:setting:proof.drift', 'off')
  await $.prompt.submit({ text: 'Add a dark mode switch to the settings page.' } as never)
  for (let n = 0; n < BASELINE_EDITS; n += 1) await editAt($ as never, '/w/app/ui/theme.ts')
  for (let n = 0; n < 8; n += 1) expect((await editAt($ as never, `/w/infra/deploy/run${n}.ts`)).context).toBeUndefined()
  expect(ledgerOf(mem)).toEqual([])
})

test('the same file edited six times in one turn: a note, a band item and a ledger line, once; a new answer counts again', async ($, on) => {
  const mem = engine(on)
  mem.set('cockpit:setting:claude.notes', 'all')
  for (let n = 0; n < 5; n += 1) expect((await editAt($ as never, '/w/src/a.ts')).context).toBeUndefined()
  const sixth = await editAt($ as never, '/w/src/a.ts')
  expect(sixth.context?.join(' ')).toMatch(/edited src\/a\.ts 6 times in this answer/)
  expect(ledgerOf(mem).map(l => `${l.what}|${l.did}`)).toEqual(['Spotted odd behaviour|true'])
  expect(bandOf(mem).find(b => b.id === 'proof2:anomaly')?.text).toBe('src/a.ts edited 6 times')
  expect((await editAt($ as never, '/w/src/a.ts')).context).toBeUndefined()
  await endTurn($ as never)
  expect(state2Of(mem).changes.length).toBe(1)
  for (let n = 0; n < 5; n += 1) await editAt($ as never, '/w/src/a.ts')
  expect((await editAt($ as never, '/w/src/a.ts')).context?.join(' ')).toMatch(/6 times/)
})

test('anomaly off: nothing is flagged', async ($, on) => {
  const mem = engine(on)
  mem.set('cockpit:setting:proof.anomaly', 'off')
  for (let n = 0; n < 8; n += 1) expect((await editAt($ as never, '/w/src/a.ts')).context).toBeUndefined()
  expect(ledgerOf(mem)).toEqual([])
})

test('fifteen calls that change no file and add a lot of text raise one band item and no order to Claude; an edit ends the stretch', async ($, on) => {
  const mem = engine(on, { read: 'x'.repeat(3000) })
  for (let n = 0; n < 15; n += 1) expect(((await $.tool.call({ tool: 'Read', file_path: '/w/a.ts' } as never)) as { context?: string[] }).context).toBeUndefined()
  expect(bandOf(mem).find(b => b.id === 'proof2:anomaly')?.text).toBe('Stuck? 15 calls, no file changed')
  expect(ledgerOf(mem).length).toBe(1)
  expect(((await $.tool.call({ tool: 'Read', file_path: '/w/a.ts' } as never)) as { context?: string[] }).context).toBeUndefined()
  await editAt($ as never, '/w/src/a.ts')
  expect(state2Of(mem).idleCalls).toBe(0)
})

test('a helper agent reads a lot on purpose: no count, no note, no band item; its edits still count', async ($, on) => {
  const mem = engine(on, { read: 'x'.repeat(3000) })
  for (let n = 0; n < 20; n += 1) expect(((await $.tool.call({ tool: 'Read', file_path: '/w/a.ts', agentId: 'helper-1' } as never)) as { context?: string[] }).context).toBeUndefined()
  expect(state2Of(mem).idleCalls).toBe(0)
  expect(bandOf(mem).find(b => b.id === 'proof2:anomaly')).toBeUndefined()
  for (let n = 0; n < 8; n += 1) expect(((await $.tool.call({ tool: 'Edit', file_path: '/w/src/a.ts', old_string: 'a', new_string: 'b', agentId: 'helper-1' } as never)) as { context?: string[] }).context).toBeUndefined()
  expect(ledgerOf(mem)).toEqual([])
  expect(Object.keys(state2Of(mem).files).length).toBe(1)
})

test('one kind of command failing with different commands raises a note; the same command does not', async ($, on) => {
  const mem = engine(on, { bash: () => ({ isError: true, text: 'Exit code 1\nboom' }) })
  mem.set('cockpit:setting:claude.notes', 'all')
  for (const c of ['npm run a', 'npm run b']) expect(((await $.tool.call({ tool: 'Bash', command: c } as never)) as { context?: string[] }).context).toBeUndefined()
  const third = (await $.tool.call({ tool: 'Bash', command: 'npm run c' } as never)) as { context?: string[] }
  expect(third.context?.join(' ')).toMatch(/npm run commands have failed 3 times, each with a different command/)
  expect(ledgerOf(mem)[0].detail).toBe('npm run failed 3 times with 3 different commands')
  expect(JSON.stringify(state2Of(mem))).not.toMatch(/npm run a/)
  await $.prompt.submit({ text: 'Try another way please' } as never)
  expect(state2Of(mem).fails).toEqual({})
})

test('the same kind of command failing in the PowerShell tool raises the note too', async ($, on) => {
  const mem = engine(on, { bash: () => ({ isError: true, text: 'Exit code 1\nboom' }) })
  mem.set('cockpit:setting:claude.notes', 'all')
  for (const c of ['npm run a', 'npm run b']) expect(((await $.tool.call({ tool: 'PowerShell', command: c } as never)) as { context?: string[] }).context).toBeUndefined()
  const third = (await $.tool.call({ tool: 'PowerShell', command: 'npm run c' } as never)) as { context?: string[] }
  expect(third.context?.join(' ')).toMatch(/npm run commands have failed 3 times, each with a different command/)
})

test('/vaken-ship queue and /vaken-ship heat show the finished changes and the hot files', async ($, on) => {
  engine(on)
  expect(await run($, 'vaken-queue')).toMatch(/empty/)
  expect(await run($, 'vaken-heat')).toMatch(/no changed file yet/)
  await editAt($ as never, '/w/src/auth/login.ts')
  await endTurn($ as never)
  await editAt($ as never, '/w/src/view.ts')
  await editAt($ as never, '/w/tests/view.test.ts')
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
  await endTurn($ as never, 't2')
  const queue = await run($, 'vaken-queue')
  expect(queue).toMatch(/2 finished changes, riskiest first/)
  expect(queue).toMatch(/1\. HIGH: 1 file, 2 lines \(auth\/login\.ts\)/)
  expect(queue).toMatch(/Why: it touches security-related files; no test file was touched; no passing check after the last edit\./)
  expect(queue).toMatch(/2\. LOW: 2 files/)
  const heat = await run($, 'vaken-heat')
  expect(heat).toMatch(/1\. auth\/login\.ts: 1 edit, 2 lines, touches security-related files\. No test file was touched in the same turn\./)
  expect(heat).toMatch(/1 changed code file had no test file touched in the same turn\./)
})

test('/vaken-help run confidence gives a number with its list, or says there is not enough evidence; off says so', async ($, on) => {
  const mem = engine(on)
  expect(await run($, 'vaken-confidence')).toMatch(/not enough evidence yet/)
  await editAt($ as never, '/w/src/a.ts')
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
  const text = await run($, 'vaken-confidence')
  expect(text).toMatch(/Confidence: 55 out of 100/)
  expect(text).toMatch(/15 of 15 {2}Small diff/)
  mem.set('cockpit:setting:proof.confidence', 'off')
  expect(await run($, 'vaken-confidence')).toMatch(/is off/)
})

test('/vaken-help run intent compares the goal with the work in one paragraph', async ($, on) => {
  engine(on)
  expect(await run($, 'vaken-intent')).toMatch(/no goal is set/)
  await $.command.run(viaParent('vaken-goal', 'Add a dark mode switch to the settings page.') as never)
  await editAt($ as never, '/w/app/settings/theme.ts')
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
  const text = await run($, 'vaken-intent')
  expect(text).toMatch(/^Asked: dark, mode, switch, settings, page\. Delivered: 1 file changed \(1 edit\); changed paths name settings; checks that passed: tests\./)
  expect(text).toMatch(/Extra: nothing found/)
  expect(text).toMatch(/Missing: no definition of done is set/)
})

test('on a fresh install drift and anomaly speak to the person (ledger, band) and send Claude nothing', async ($, on) => {
  const mem = engine(on, { bash: () => ({ isError: true, text: 'Exit code 1\nboom' }) })
  await $.prompt.submit({ text: 'Add a dark mode switch to the settings page. Keep it small.' } as never)
  for (let n = 0; n < BASELINE_EDITS; n += 1) await editAt($ as never, '/w/app/ui/theme.ts')
  for (let n = 0; n < DRIFT_EDITS; n += 1) expect((await editAt($ as never, `/w/infra/deploy/run${n}.ts`)).context).toBeUndefined()
  expect(ledgerOf(mem).some(l => l.what === 'Noticed work far from the goal')).toBe(true)
  expect(bandOf(mem).some(b => b.id === 'proof2:drift')).toBe(true)
  for (const c of ['npm run a', 'npm run b', 'npm run c']) expect(((await $.tool.call({ tool: 'Bash', command: c } as never)) as { context?: string[] }).context).toBeUndefined()
})
