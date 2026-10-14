// Proof and its hooks as the engine runs them.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { PROOF_HELP, PROOF_SETTINGS, affectsTests, afterTurn, buildEvidence, checksIn, doneLines, doneMet, emptyState, exitCodeOf, goalFrom, isPersonMessage, judge, packLines, parseKinds, parseShortstat, readState, recordEdit, recordReceipts, statusOf } from '../hooks/core/proof'
import type { ProofState } from '../hooks/core/proof'
import { keyTitle } from '../hooks/core/titles'
import { claimNote, findClaims, gapsOf } from '../hooks/core/proofclaims'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')

const withEdit = (s: ProofState, path = 'a.ts'): ProofState => recordEdit(s, path)
const withCheck = (s: ProofState, kind: 'tests' | 'build' | 'lint' | 'types', ok: boolean | undefined): ProofState => recordReceipts(s, [{ kind, ok }], NOW)

test('which commands are checks, and which only look like one', () => {
  expect(checksIn('npm test').map(h => h.kind)).toEqual(['tests'])
  expect(checksIn('cd app && npm run build').map(h => h.kind)).toEqual(['build'])
  expect(checksIn('TSC=/x/tsc scripts/typecheck.sh mods/vaken').map(h => h.kind)).toEqual(['types'])
  expect(checksIn('claude plugin test mods/vaken').map(h => h.kind)).toEqual(['tests'])
  expect(checksIn('npx eslint . && pytest -q').map(h => h.kind)).toEqual(['lint', 'tests'])
  expect(checksIn('scripts/check-cockpit.sh').map(h => h.kind)).toEqual(['tests'])
  expect(checksIn('bash ./run-tests.sh && sh test.sh').map(h => h.kind)).toEqual(['tests'])
  expect(checksIn('scripts/unit-tests.sh')).toEqual([{ kind: 'tests', hidden: false }])
  expect(checksIn('scripts/check-cockpit.sh 2>&1 | tail -3')).toEqual([{ kind: 'tests', hidden: true }])
  expect(checksIn('cat scripts/check-cockpit.sh')).toEqual([])
  expect(checksIn('scripts/release.sh')).toEqual([])
  expect(checksIn('git commit -m "npm test passes"')).toEqual([])
  expect(checksIn('echo npm test')).toEqual([])
  expect(checksIn('cat tsconfig.json')).toEqual([])
  expect(checksIn('ls -la')).toEqual([])
})

test('a pipe, || or ; can hide how a check ended; && cannot', () => {
  expect(checksIn('npm test | tail -5')).toEqual([{ kind: 'tests', hidden: true }])
  expect(checksIn('npm test || true')).toEqual([{ kind: 'tests', hidden: true }])
  expect(checksIn('npm test; echo done')).toEqual([{ kind: 'tests', hidden: true }])
  expect(checksIn('npm run lint && npm test')).toEqual([{ kind: 'lint', hidden: false }, { kind: 'tests', hidden: false }])
  expect(checksIn('npm run lint; npm test')).toEqual([{ kind: 'lint', hidden: true }, { kind: 'tests', hidden: false }])
})

test('the verdict of a result: passed, failed with a code, or not clear', () => {
  expect(judge(checksIn('npm test'), false, undefined)).toEqual([{ kind: 'tests', ok: true, exit: 0 }])
  expect(judge(checksIn('npm test'), true, 2)).toEqual([{ kind: 'tests', ok: false, exit: 2 }])
  expect(judge(checksIn('npm test'), true, undefined)).toEqual([{ kind: 'tests', ok: false }])
  expect(judge(checksIn('npm test | tail'), false, undefined)).toEqual([{ kind: 'tests', ok: undefined }])
  expect(judge(checksIn('npm run lint && npm test'), true, 1)).toEqual([{ kind: 'lint', ok: undefined }, { kind: 'tests', ok: undefined }])
  expect(exitCodeOf('Exit code 127\nnpm: not found')).toBe(127)
  expect(exitCodeOf('all good')).toBeUndefined()
})

test('a receipt goes stale when a file is edited after it', () => {
  let s = withCheck(emptyState(), 'tests', true)
  expect(statusOf(s, 'tests')).toBe('ok')
  expect(statusOf(s, 'lint')).toBe('notrun')
  s = withEdit(s)
  expect(statusOf(s, 'tests')).toBe('stale')
  s = withCheck(s, 'tests', false)
  expect(statusOf(s, 'tests')).toBe('failed')
  s = withCheck(s, 'tests', undefined)
  expect(statusOf(s, 'tests')).toBe('unknown')
  s = withCheck(s, 'tests', true)
  expect(statusOf(s, 'tests')).toBe('ok')
})

test('an edit that cannot change a result leaves the runs fresh; code, config, tests and lockfiles do not', () => {
  for (const p of ['README.md', 'docs/HANDOFF.md', 'notes.txt', 'guide.rst', 'a/b/shot.PNG', 'logo.svg', '.gitignore', 'LICENSE', 'docs/design/x.json', 'docs/site/config.js']) expect(affectsTests(p)).toBe(false)
  for (const p of ['src/app.ts', 'package.json', 'package-lock.json', 'tsconfig.json', 'Makefile', 'tests/app.test.ts', 'docs/example.test.ts', 'src/a.spec.js', 'scripts/test.sh', 'test_app.py', 'Edit']) expect(affectsTests(p)).toBe(true)
  expect(affectsTests('/Users/me/docs/app/src/a.ts')).toBe(true)
  expect(affectsTests('/Users/me/docs/app/notes.md')).toBe(false)
  let s = withCheck(emptyState(), 'tests', true)
  s = recordEdit(s, '/w/app/docs/guide.md', '/w/app')
  expect(statusOf(s, 'tests')).toBe('ok')
  expect(s.edits).toBe(1)
  s = recordEdit(s, '/w/app/README.md', '/w/app')
  expect(statusOf(s, 'tests')).toBe('ok')
  s = recordEdit(s, '/w/app/docs/example.test.ts', '/w/app')
  expect(statusOf(s, 'tests')).toBe('stale')
  expect(s.lastEditFile).toBe('example.test.ts')
  expect(statusOf(recordEdit(withCheck(emptyState(), 'tests', true), '/w/app/docs/x.js'), 'tests')).toBe('stale')
  expect(statusOf(recordEdit(withCheck(emptyState(), 'tests', true), '/w/app/docs/x.js', '/w/app'), 'tests')).toBe('ok')
})

test('a stale run says which file was edited after it', () => {
  let s = withCheck(emptyState(), 'tests', true)
  s = recordEdit(s, '/w/app/src/parser.ts', '/w/app')
  s = recordEdit(s, '/w/app/docs/notes.md', '/w/app')
  const ev = buildEvidence(s, { at: NOW, durationMs: 1000, claims: [], unproven: [], doneOn: false })
  expect(ev.ran).toEqual([{ kind: 'tests', status: 'stale', at: NOW }])
  const lines = packLines(ev, s)
  expect(lines.some(l => l.startsWith('  ? tests edited after the last test run: parser.ts, '))).toBe(true)
})

test('the state keeps no folder path: a file is counted by a hash, once', () => {
  let s = withEdit(emptyState(), '/work/app/secret-name.ts')
  s = withEdit(s, '/work/app/secret-name.ts')
  s = withEdit(s, '/work/app/other.ts')
  expect(s.files.length).toBe(2)
  expect(s.edits).toBe(3)
  // only the short name of the last file is kept, never a folder
  expect(JSON.stringify(s)).not.toMatch(/work|app\/|secret-name/)
  expect(s.lastEditFile).toBe('other.ts')
})

test('claims in an answer: plain phrases found, plans and denials left out, code ignored', () => {
  expect(findClaims('I fixed the bug. All tests pass and the build succeeds.').sort()).toEqual(['build', 'fixed', 'tests'])
  expect(findClaims('Lint is clean and the type check passes.').sort()).toEqual(['lint', 'types'])
  expect(findClaims('The work is done.')).toEqual(['done'])
  expect(findClaims('I verified that it works.')).toEqual(['generic'])
  expect(findClaims('Next I will make the tests pass.')).toEqual([])
  expect(findClaims('The tests do not pass yet; I cannot say the build works.')).toEqual([])
  expect(findClaims('Run this: `tests pass` and\n```\nall tests pass\n```')).toEqual([])
  expect(findClaims('There are two options for the layout.')).toEqual([])
})

test('a claim is backed only by a passing receipt of its kind after the last edit', () => {
  const claims = findClaims('All tests pass.')
  let s = withEdit(emptyState())
  expect(gapsOf(claims, s, { doneOn: true })).toEqual([{ kind: 'tests', why: 'missing' }])
  s = withCheck(s, 'tests', false)
  expect(gapsOf(claims, s, { doneOn: true })).toEqual([{ kind: 'tests', why: 'failed' }])
  s = withCheck(s, 'tests', undefined)
  expect(gapsOf(claims, s, { doneOn: true })).toEqual([{ kind: 'tests', why: 'unknown' }])
  s = withCheck(s, 'tests', true)
  expect(gapsOf(claims, s, { doneOn: true })).toEqual([])
  s = withEdit(s)
  expect(gapsOf(claims, s, { doneOn: true })).toEqual([{ kind: 'tests', why: 'stale' }])
})

test('"fixed" and "done" need some passing check and no failing one; a turn with no work makes no such claim', () => {
  const claims = findClaims('I fixed the bug and the task is done.')
  const idle = emptyState()
  expect(gapsOf(claims, idle, { doneOn: true })).toEqual([])
  let s = withEdit(emptyState())
  expect(gapsOf(claims, s, { doneOn: true }).map(g => g.kind)).toEqual(['fixed', 'done'])
  s = withCheck(s, 'build', true)
  expect(gapsOf(claims, s, { doneOn: true })).toEqual([])
  s = withCheck(s, 'lint', false)
  expect(gapsOf(claims, s, { doneOn: true }).map(g => g.why)).toEqual(['failed', 'failed'])
})

test('a definition of done is met only when each check passed after the last edit; "done" then needs it', () => {
  let s: ProofState = { ...withEdit(emptyState()), done: ['tests', 'build'] }
  expect(doneMet(s, s.done)).toBe(false)
  s = withCheck(s, 'tests', true)
  expect(doneMet(s, s.done)).toBe(false)
  expect(gapsOf(['done'], s, { doneOn: true })).toEqual([{ kind: 'done', why: 'notdone' }])
  expect(gapsOf(['done'], s, { doneOn: false })).toEqual([])
  s = withCheck(s, 'build', true)
  expect(doneMet(s, s.done)).toBe(true)
  expect(gapsOf(['done'], s, { doneOn: true })).toEqual([])
  s = withEdit(s)
  expect(doneMet(s, s.done)).toBe(false)
  expect(doneMet(emptyState(), [])).toBe(false)
  expect(doneLines(s, s.done, true).join('\n')).toMatch(/\[ \] tests: not run since the last edit/)
  expect(doneLines(emptyState(), [], true)[0]).toMatch(/not set/)
})

test('the kinds the person may type', () => {
  expect(parseKinds('tests build lint')).toEqual({ kinds: ['tests', 'build', 'lint'], bad: [] })
  expect(parseKinds('Test, typecheck test')).toEqual({ kinds: ['tests', 'types'], bad: [] })
  expect(parseKinds('tests deploy')).toEqual({ kinds: ['tests'], bad: ['deploy'] })
})

test('the evidence pack of a turn: counts, checks, what was not checked, claims, and the review count', () => {
  let s = emptyState()
  s = withEdit(s, 'a.ts')
  s = withEdit(s, 'b.ts')
  s = withCheck(s, 'tests', true)
  s = withCheck(s, 'lint', false)
  const claims = findClaims('All tests pass and lint is clean.')
  const unproven = gapsOf(claims, s, { doneOn: true })
  expect(unproven).toEqual([{ kind: 'lint', why: 'failed' }])
  const ev = buildEvidence({ ...s, done: ['tests', 'build'] }, { at: NOW, durationMs: 90_000, diff: { files: 2, lines: 14 }, claims, unproven, doneOn: true })
  expect(ev.files).toBe(2)
  expect(ev.edits).toBe(2)
  expect(ev.notChecked).toEqual(['build'])
  expect(ev.doneMet).toBe(false)
  const after = afterTurn(s, ev, true)
  expect(after.debt).toBe(1)
  expect(after.note).toEqual(['lint'])
  expect(after.turnEdits).toBe(0)
  const text = packLines(ev, after).join('\n')
  expect(text).toMatch(/Files changed in this answer: 2 \(2 edits\)\. Git diff, all changes not committed yet: 14 lines in 2 files/)
  expect(text).toMatch(/\+ tests passed/)
  expect(text).toMatch(/x lint failed/)
  expect(text).toMatch(/Not checked after the last edit: build/)
  expect(text).toMatch(/Said lint is clean: the last run failed/)
  expect(text).toMatch(/Waiting for your look: 1 finished answer/)
  const quiet = afterTurn(emptyState(), buildEvidence(emptyState(), { at: NOW, durationMs: 1000, claims: [], unproven: [], doneOn: true }), true)
  expect(quiet.debt).toBe(0)
  expect(packLines(undefined, emptyState())[0]).toMatch(/no finished answer yet/)
})

test('the git summary is read as counts', () => {
  expect(parseShortstat(' 3 files changed, 40 insertions(+), 2 deletions(-)\n')).toEqual({ files: 3, lines: 42 })
  expect(parseShortstat(' 1 file changed, 5 insertions(+)\n')).toEqual({ files: 1, lines: 5 })
  expect(parseShortstat('')).toBeUndefined()
})

test('the goal: the key words of a real message, never its sentence; not a command, not a greeting', () => {
  expect(goalFrom('Fix the login bug on the checkout page. It breaks on Safari.')).toBe('Fix login bug')
  expect(goalFrom('add a dark mode switch to settings')).toBe(keyTitle('add a dark mode switch to settings'))
  expect(goalFrom(`Please deploy with the token ${'s' + 'k-'}abcdefghijklmnop1234 to the staging server now`)).not.toMatch(/sk-|abcdef/)
  expect(goalFrom('Fix the login bug on the checkout page. It breaks on Safari.')!.length).toBeLessThan(40)
  expect(goalFrom('/vaken')).toBeUndefined()
  expect(goalFrom('hi there')).toBeUndefined()
  expect(goalFrom(`${'word '.repeat(80)}end`)?.length).toBeLessThanOrEqual(160)
})

test('who wrote a message', () => {
  expect(isPersonMessage('Do this', { kind: 'composer' })).toBe(true)
  expect(isPersonMessage('Do this', undefined)).toBe(true)
  expect(isPersonMessage('/vaken', { kind: 'composer' })).toBe(false)
  expect(isPersonMessage('Do this', { kind: 'scheduled-trigger' })).toBe(false)
  expect(isPersonMessage('Do this', { kind: 'auto-continuation' })).toBe(false)
})

test('a stored value of the wrong shape gives an empty state', () => {
  expect(readState('x')).toEqual(emptyState())
  expect(readState({ seq: 'no' })).toEqual(emptyState())
})

test('the settings and help words', () => {
  expect(PROOF_SETTINGS.map(s => `${s.key}=${s.default}`)).toEqual(['proof.receipts=on', 'proof.claims=warn', 'proof.done=on'])
  for (const s of PROOF_SETTINGS) {
    expect(s.group).toBe('Checks')
    expect(s.options.some(o => o.value === s.default)).toBe(true)
  }
  expect(PROOF_SETTINGS.find(s => s.key === 'proof.claims')?.options.map(o => o.value)).toEqual(['off', 'warn'])
  expect(PROOF_HELP.map(h => h.text).join(' ')).toMatch(/key words of your first message/)
  expect(claimNote(['tests', 'tests'])).toMatch(/these claims had no passing check behind them: tests\./i)
})

// ---- The hooks, through the engine ----

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:proof.claims', 'warn'], ['cockpit:setting:proof.done', 'on']])
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

// The engine below the plugin: a clock, a store, a session id, and git answering with a small diff.
function engine(on: On, bash: (command: string) => { isError?: true; text: string } = () => ({ text: 'ok' })): Map<string, unknown> {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: ' 1 file changed, 3 insertions(+), 1 deletion(-)\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('tool.call', { tool: /^(Bash|PowerShell)$/ }, (_$, e) => {
    const r = bash(String((e as unknown as { command: string }).command))
    return { result: { stdout: r.text, stderr: '', code: r.isError === true ? 1 : 0 }, text: r.text, ...(r.isError === true ? { isError: true } : {}) } as never
  })
  on('tool.call', { tool: 'Edit' }, () => ({ result: { ok: true }, text: 'edited' }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  return mem
}

const stateOf = (mem: Map<string, unknown>): ProofState => readState(mem.get('cockpit:proof:test-session'))

const endTurn = ($: { turn: { complete: (i: never) => Promise<{ text: string }> } }, answer: string, turnId = 't1'): Promise<{ text: string }> => $.turn.complete({ answer, durationMs: 30_000, isAborted: false, turnId, reason: 'answer' } as never)

test('a passing test run leaves a receipt with a kind, a code and a time, and no text', SLOW, async ($, on) => {
  const mem = engine(on, () => ({ text: 'PASS secret-looking output 14 tests' }))
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  const s = stateOf(mem)
  expect(s.receipts).toEqual([{ kind: 'tests', ok: true, exit: 0, at: NOW, seq: 1 }])
  expect(JSON.stringify(s)).not.toMatch(/secret-looking|npm/)
})

test('a PowerShell test run leaves a receipt like a Bash one', async ($, on) => {
  const mem = engine(on, () => ({ text: 'PASS 14 tests' }))
  await $.tool.call({ tool: 'PowerShell', command: 'npm test' })
  expect(stateOf(mem).receipts).toEqual([{ kind: 'tests', ok: true, exit: 0, at: NOW, seq: 1 }])
})

test('a failing run leaves a failed receipt with the exit code; a look at a file leaves nothing', async ($, on) => {
  const mem = engine(on, c => (c.startsWith('npm') ? { isError: true, text: 'Exit code 3\nboom' } : { text: 'ok' }))
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(stateOf(mem).receipts).toEqual([])
  await $.tool.call({ tool: 'Bash', command: 'npm run lint' })
  expect(stateOf(mem).receipts).toEqual([{ kind: 'lint', ok: false, exit: 3, at: NOW, seq: 1 }])
})

test('Receipts off: nothing is recorded', async ($, on) => {
  const mem = engine(on)
  mem.set('cockpit:setting:proof.receipts', 'off')
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'a', new_string: 'b' })
  expect(mem.get('cockpit:proof:test-session')).toBeUndefined()
})

test('an unproven claim: a ledger line, a line under the answer, and a note for Claude on the next message', async ($, on) => {
  const mem = engine(on)
  mem.set('cockpit:setting:claude.notes', 'all')
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'a', new_string: 'b' })
  const out = await endTurn($ as never, 'I fixed it. All tests pass.')
  expect(out.text).toMatch(/^Vaken: Said tests pass: no check ran\. Said it is fixed: no check ran\./)
  const ledger = mem.get('cockpit:ledger:compact') as Array<{ what: string; did?: boolean; detail?: string }>
  expect(ledger.map(l => `${l.what}|${l.did}`)).toEqual(['Claude said done without proof|true'])
  const s = stateOf(mem)
  expect(s.debt).toBe(1)
  expect([...s.note].sort()).toEqual(['fixed', 'tests'])
  expect(s.last?.diff).toEqual({ files: 1, lines: 4 })
  expect(JSON.stringify(s)).not.toMatch(/fixed it|All tests/)
  const sent = (await $.prompt.submit({ text: 'Thanks, now what is left?' } as never)) as { context?: string[] }
  expect(sent.context?.join(' ')).toMatch(/no passing check behind them/)
  expect(stateOf(mem).note).toEqual([])
  expect(stateOf(mem).debt).toBe(0)
})

test('a claim backed by a passing run is left alone', async ($, on) => {
  const mem = engine(on)
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  const out = await endTurn($ as never, 'All tests pass.')
  expect(out.text).toBe('All tests pass.')
  expect(mem.get('cockpit:ledger:compact')).toBeUndefined()
  expect(stateOf(mem).last?.unproven).toEqual([])
  expect(stateOf(mem).last?.notChecked).toEqual([])
})

test('Claims off: the pack is built, nothing is flagged', async ($, on) => {
  const mem = engine(on)
  mem.set('cockpit:setting:proof.claims', 'off')
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'a', new_string: 'b' })
  const out = await endTurn($ as never, 'All tests pass.')
  expect(out.text).toBe('All tests pass.')
  expect(mem.get('cockpit:ledger:compact')).toBeUndefined()
  expect(stateOf(mem).last?.claims).toEqual([])
  expect(stateOf(mem).last?.edits).toBe(1)
})

test('/vaken-ship proof shows the pack of the last answer in plain words', async ($, on) => {
  engine(on)
  expect(((await $.command.run(viaParent('vaken-proof', '') as never)) as { text: string }).text).toMatch(/no finished answer yet/)
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await endTurn($ as never, 'Done with the edit.')
  const shown = ((await $.command.run(viaParent('vaken-proof', '') as never)) as { text: string }).text
  expect(shown).toMatch(/Files changed in this answer: 1 \(1 edit\)\. Git diff, all changes not committed yet: 4 lines in 1 file/)
  expect(shown).toMatch(/\+ tests passed/)
  expect(shown).toMatch(/Waiting for your look: 1 finished answer/)
})

test('/vaken-ship done sets the list; done is met only after the last edit has a passing run of each', async ($, on) => {
  const mem = engine(on)
  expect(((await $.command.run(viaParent('vaken-done', '') as never)) as { text: string }).text).toMatch(/not set/)
  expect(((await $.command.run(viaParent('vaken-done', 'tests deploy') as never)) as { text: string }).text).toMatch(/Not a check: deploy/)
  const set = ((await $.command.run(viaParent('vaken-done', 'tests build') as never)) as { text: string }).text
  expect(set).toMatch(/Definition of done set: tests, the build/)
  expect(stateOf(mem).done).toEqual(['tests', 'build'])
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  const out = await endTurn($ as never, 'The task is done.')
  expect(out.text).toMatch(/the definition of done is not met/)
  await $.tool.call({ tool: 'Bash', command: 'npm run build' })
  expect(((await $.command.run(viaParent('vaken-done', '') as never)) as { text: string }).text).toMatch(/Met: every check passed after the last edit/)
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'b', new_string: 'c' })
  expect(((await $.command.run(viaParent('vaken-done', '') as never)) as { text: string }).text).toMatch(/Not met yet/)
  expect(((await $.command.run(viaParent('vaken-done', 'off') as never)) as { text: string }).text).toMatch(/cleared/)
  expect(stateOf(mem).done).toEqual([])
})

test('review debt counts turns that changed files and is cleared by a message or /vaken-ship reviewed', async ($, on) => {
  const mem = engine(on)
  for (const id of ['t1', 't2']) {
    await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'a', new_string: 'b' })
    await endTurn($ as never, 'Changed it.', id)
  }
  await endTurn($ as never, 'Just talking.', 't3')
  expect(stateOf(mem).debt).toBe(2)
  const shown = ((await $.command.run(viaParent('vaken-reviewed', '') as never)) as { text: string }).text
  expect(shown).toMatch(/Cleared\. 2 finished answers marked as looked at/)
  expect(stateOf(mem).debt).toBe(0)
  expect(((await $.command.run(viaParent('vaken-reviewed', '') as never)) as { text: string }).text).toMatch(/Waiting for your look: nothing/)
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'a', new_string: 'b' })
  await endTurn($ as never, 'Changed it again.', 't4')
  expect(stateOf(mem).debt).toBe(1)
  await $.prompt.submit({ text: '/vaken' } as never)
  expect(stateOf(mem).debt).toBe(1)
  await $.prompt.submit({ text: 'Looks fine to me' } as never)
  expect(stateOf(mem).debt).toBe(0)
})

test('the goal is the first message, can be set and cleared by hand, and is the one text kept', async ($, on) => {
  const mem = engine(on)
  expect(((await $.command.run(viaParent('vaken-goal', '') as never)) as { text: string }).text).toMatch(/Goal: not set/)
  await $.prompt.submit({ text: '/vaken' } as never)
  await $.prompt.submit({ text: 'Add a dark mode switch to the settings page. Keep it small.' } as never)
  expect(stateOf(mem).goal).toEqual({ text: keyTitle('Add a dark mode switch to the settings page. Keep it small.'), setAt: NOW, how: 'first' })
  expect(stateOf(mem).goal?.text).not.toMatch(/Keep it small|settings page\./)
  await $.prompt.submit({ text: 'Something else entirely now please' } as never)
  expect(stateOf(mem).goal?.text).toBe(keyTitle('Add a dark mode switch to the settings page.'))
  const set = ((await $.command.run(viaParent('vaken-goal', 'Ship the new onboarding flow') as never)) as { text: string }).text
  expect(set).toMatch(/Goal set: Ship the new onboarding flow/)
  expect(set).toMatch(/one text vaken keeps/)
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  const shown = ((await $.command.run(viaParent('vaken-goal', '') as never)) as { text: string }).text
  expect(shown).toMatch(/Goal: Ship the new onboarding flow/)
  expect(shown).toMatch(/1 file changed \(1 edit\)/)
  expect(shown).toMatch(/Checks passing now: tests/)
  await $.command.run(viaParent('vaken-goal', 'clear') as never)
  expect(stateOf(mem).goal).toBeUndefined()
  await $.prompt.submit({ text: 'A fresh request with many words' } as never)
  expect(stateOf(mem).goal).toBeUndefined()
})

test('a goal typed with /vaken-tasks goal keeps its words but hides a secret before it is stored', async ($, on) => {
  const mem = engine(on)
  await $.command.run(viaParent('vaken-goal', `Use key ${'s' + 'k-'}abcdefghijklmnop1234 to call the api`) as never)
  expect(stateOf(mem).goal?.how).toBe('typed')
  expect(stateOf(mem).goal?.text).toMatch(/^Use key \*\*\* to call the api$/)
})

test('the task list is counted, never read', async ($, on) => {
  const mem = engine(on)
  on('tool.call', { tool: 'TodoWrite' }, () => ({ result: {}, text: 'ok' }) as never)
  await $.tool.call({ tool: 'TodoWrite', todos: [{ content: 'private step one', status: 'completed' }, { content: 'private step two', status: 'pending' }] } as never)
  expect(stateOf(mem).todo).toEqual({ done: 1, total: 2 })
  expect(JSON.stringify(stateOf(mem))).not.toMatch(/private step/)
})

test('the goal never comes from a block the app added to the message', () => {
  expect(goalFrom('<system-reminder>\nYou are operating in a git worktree. Be careful.\n</system-reminder>\nFix the login page so it keeps the session. Then test it.')).toBe(keyTitle('Fix the login page so it keeps the session.'))
  expect(goalFrom('<system-reminder>You are operating in a git worktree.</system-reminder>')).toBeUndefined()
})

test('on a fresh install the unproven claim shows to the person and the next message carries no note for Claude', async ($, on) => {
  const mem = engine(on)
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: 'a', new_string: 'b' })
  const out = await endTurn($ as never, 'I fixed it. All tests pass.')
  expect(out.text).toMatch(/^Vaken: Said tests pass/)
  const sent = (await $.prompt.submit({ text: 'Thanks, now what is left?' } as never)) as { context?: string[] }
  expect(sent.context).toBeUndefined()
  expect(stateOf(mem).note).toEqual([])
})
