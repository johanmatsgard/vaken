import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { KNOWN, classify, errorWords, exitOf, failedKey, failedLine, failedWhat, parseFailed } from '../hooks/core/errors'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

test('common errors are known by their kind', () => {
  const cases: [string, string][] = [
    ['Error: ENOENT: no such file or directory, open x', 'missing-file'],
    ['bash: foo: command not found', 'command-missing'],
    ["foo : The term 'foo' is not recognized as the name of a cmdlet, function, script file, or operable program.", 'command-missing'],
    ['CategoryInfo : ObjectNotFound: (foo:String) [], CommandNotFoundException', 'command-missing'],
    ["Error: Cannot find module 'zod'", 'module-missing'],
    ['SyntaxError: Unexpected token }', 'syntax'],
    ['listen EADDRINUSE: address already in use :::3000', 'port-busy'],
    ['curl: (6) Could not resolve host: x', 'network'],
    ['HTTP 401 Unauthorized', 'auth'],
    ['HTTP 429 Too Many Requests', 'rate-limit'],
    ['CONFLICT (content): Merge conflict in a.ts', 'git-conflict'],
    ['! [rejected] main -> main (non-fast-forward)', 'git-push'],
    ['Tests: 2 failed, 10 passed', 'test-failed'],
    ['FATAL ERROR: JavaScript heap out of memory', 'out-of-memory'],
  ]
  for (const [text, kind] of cases) expect(classify(text)?.kind).toBe(kind)
  expect(classify('all fine')).toBeUndefined()
})

test('every entry says what it means and what to try, in plain short sentences', () => {
  for (const k of KNOWN) {
    expect(k.says.endsWith('.')).toBe(true)
    expect(k.tryThis.endsWith('.')).toBe(true)
    expect(k.says.split(' ').length).toBeLessThan(25)
  }
  expect(new Set(KNOWN.map(k => k.kind)).size).toBe(KNOWN.length)
})

test('the words name the tool, the time, the meaning and the first thing to try', () => {
  const text = errorWords({ at: 1000, tool: 'Bash', kind: 'port-busy' }, 1000 + 5 * 60_000)
  expect(text).toMatch(/^Bash failed 5 min ago\./)
  expect(text).toMatch(/What it means: Another program/)
  expect(text).toMatch(/First thing to try:/)
  expect(errorWords(undefined, 0)).toMatch(/No failed step/)
  expect(errorWords({ at: 0, tool: 'Bash', kind: 'zzz' }, 0)).toMatch(/does not know/)
})

function memStore(on: On): void {
  const mem = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
}

test('/vaken-explain error answers when nothing failed', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const r = (await $.command.run(viaParent('vaken-error', '') as never)) as { text: string }
  expect(r.text).toMatch(/No failed step/)
})

// An invented value, built in pieces so that no key-looking text sits in the file.
const FAKE_KEY = ['sk', 'ant', 'api03', 'a'.repeat(28)].join('-')

test('the failing step is a short label: secrets and values after = are hidden, the text is cut to 120 characters', () => {
  expect(failedWhat('Bash', { command: 'npm test' })).toBe('npm test')
  expect(failedWhat('PowerShell', { command: 'npm test' })).toBe('npm test')
  expect(failedWhat('PowerShell', { command: 'API_KEY=abc123 npm run build' })).toBe('API_KEY=… npm run build')
  expect(failedWhat('Edit', { path: '/a/b.ts' })).toBe('Edit b.ts')
  expect(failedWhat('Bash', { command: 'API_KEY=abc123 npm run build' })).toBe('API_KEY=… npm run build')
  expect(failedWhat('Bash', { command: 'DB_URL=postgres://u:pw@h/db FOO="a b" node x.js' })).toBe('DB_URL=… FOO=… node x.js')
  expect(failedWhat('Bash', { command: `curl -H "Authorization: Bearer ${FAKE_KEY}" https://x.example` })).not.toMatch(/ant-api03/)
  expect(failedWhat('Bash', { command: 'echo one\necho two' })).toBe('echo one')
  expect(failedWhat('Bash', { command: `git commit -m "${'secret plan '.repeat(20)}"` })).not.toMatch(/secret plan/)
  expect(failedWhat('Edit', { path: '/w/app/src/a.ts' })).toBe('Edit a.ts')
  expect(failedWhat('mcp__srv__query', {})).toBe('mcp__srv__query')
  expect(failedWhat('Bash', { command: `run-${'x'.repeat(300)}` }).length).toBeLessThanOrEqual(120)
  expect(exitOf('Exit code 2\nboom')).toBe(2)
  expect(exitOf('all fine')).toBeUndefined()
})

test('the keep-list line names the step, the exit code, what it means and how long ago; an old one is dropped', () => {
  const f = { at: 0, what: 'npm test', exit: 1, kind: 'test-failed' }
  expect(failedLine(f, 4 * 60_000)).toBe('Keep the last failing step and what was tried: npm test (exit 1, a test did not pass, 4 min ago).')
  expect(failedLine({ at: 0, what: 'make' }, 0)).toBe('Keep the last failing step and what was tried: make (just now).')
  expect(failedLine(f, 31 * 60_000)).toBeUndefined()
  expect(failedLine(undefined, 0)).toBeUndefined()
  expect(parseFailed({ at: 1, what: 'x', exit: 'no' })).toEqual({ at: 1, what: 'x' })
  expect(parseFailed('x')).toBeUndefined()
})

function fullStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>()
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

test('a failing shell step is noted with its exit code and kind, never its text; the same command working later removes it', SLOW, async ($, on) => {
  mock.clock(on, { now: 5_000 })
  const mem = fullStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'err-session' }))
  let broken = true
  on('tool.call', { tool: /^(Bash|PowerShell)$/ }, () => (broken ? ({ result: {}, text: 'Exit code 1\nFAIL src/a.test.ts\n2 failed, TOKEN=hunter2hunter2', isError: true } as never) : ({ result: {}, text: 'ok' } as never)))
  await $.tool.call({ tool: 'Bash', command: 'TOKEN=hunter2hunter2 npm test' } as never)
  const kept = mem.get(failedKey('err-session'))
  expect(kept).toEqual({ at: 5_000, what: 'TOKEN=… npm test', exit: 1, kind: 'test-failed' })
  expect(JSON.stringify(mem.get(failedKey('err-session')))).not.toMatch(/hunter2|FAIL src/)
  broken = false
  await $.tool.call({ tool: 'Bash', command: 'ls' } as never)
  expect(mem.get(failedKey('err-session'))).toBeDefined()
  await $.tool.call({ tool: 'Bash', command: 'TOKEN=other npm test' } as never)
  expect(mem.get(failedKey('err-session'))).toBeUndefined()
})

test('a failing PowerShell step is noted like a Bash one, and the same command working later removes it', async ($, on) => {
  mock.clock(on, { now: 5_000 })
  const mem = fullStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'err-ps' }))
  let broken = true
  on('tool.call', { tool: /^(Bash|PowerShell)$/ }, () => (broken ? ({ result: {}, text: "Exit code 1\nfoo : The term 'foo' is not recognized as the name of a cmdlet", isError: true } as never) : ({ result: {}, text: 'ok' } as never)))
  await $.tool.call({ tool: 'PowerShell', command: 'TOKEN=hunter2hunter2 npm test' } as never)
  expect(mem.get(failedKey('err-ps'))).toEqual({ at: 5_000, what: 'TOKEN=… npm test', exit: 1, kind: 'command-missing' })
  broken = false
  await $.tool.call({ tool: 'PowerShell', command: 'TOKEN=other npm test' } as never)
  expect(mem.get(failedKey('err-ps'))).toBeUndefined()
})

test('an unknown error is noted too (the step and its exit code); the translator switched off notes nothing', async ($, on) => {
  mock.clock(on, { now: 5_000 })
  const mem = fullStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'err-session-2' }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: {}, text: 'Exit code 7\nsomething odd', isError: true }) as never)
  await $.tool.call({ tool: 'Bash', command: 'make all' } as never)
  expect(mem.get(failedKey('err-session-2'))).toEqual({ at: 5_000, what: 'make all', exit: 7 })
  expect(mem.get('cockpit:error:err-session-2')).toBeUndefined()
  mem.delete(failedKey('err-session-2'))
  mem.set('cockpit:setting:errors.mode', 'off')
  await $.tool.call({ tool: 'Bash', command: 'make all' } as never)
  expect(mem.get(failedKey('err-session-2'))).toBeUndefined()
})
