// Every Guard decision stays fast on a hostile 10,000-character input.
import { expect } from 'claude-code/testing'

import type { Io } from '../hooks/core/io'
import { orderKinds } from '../hooks/core/guardback'
import { hideSecrets, labelOf } from '../hooks/core/guardcmds'
import { checkSql } from '../hooks/core/guarddestroy'
import { namesInCode } from '../hooks/core/guardenv'
import { judgeTool } from '../hooks/core/guardjudge'
import type { Modes } from '../hooks/core/guardjudge'
import { judgeMigration } from '../hooks/core/guardmigrate'
import { maskSecrets, scanSecrets, secretsAfter, secretsBefore } from '../hooks/core/guardsecrets'
import { judgeWorld } from '../hooks/core/guardworld'
import { test } from './slow'

const LIMIT_MS = 50
const SIZE = 10_000
const P = { home: '/home/user', cwd: '/home/user/app', root: '/home/user/app' }
const MODES: Modes = { destructive: 'warn', scope: 'warn', packages: 'off', tests: 'warn' }
const fake = (...p: string[]): string => p.join('')

function memIo(): Io {
  const no = (): never => {
    throw new Error('not in this test')
  }
  return {
    now: async () => 0,
    home: async () => P.home,
    sessionId: async () => 'speed',
    get: async () => undefined,
    set: async () => undefined,
    del: async () => undefined,
    keys: async () => [],
    read: async () => no(),
    write: async () => no(),
    run: async () => no(),
    ask: async () => no(),
    complete: async () => no(),
    toast: () => undefined,
    invalidate: () => undefined,
  } as unknown as Io
}

const pump = (unit: string, end = '!', head = ''): string => head + unit.repeat(Math.ceil(SIZE / unit.length)).slice(0, SIZE) + end
const INPUTS: [string, string][] = [
  ['a credential of 10,000 letters and a digit', pump('a', '1!', fake('API_TO', 'KEN='))],
  ['a credential of mixed case', pump('aB', '1!', fake('API_TO', 'KEN='))],
  ['a long name with a secret word', pump(' KEY_', '"')],
  ['a dotted run before a web address', pump('a.', '!')],
  ['a run of -eyJ', pump('-eyJ', '')],
  ['a run of key.', pump('key.', '!')],
  ['a run of -key', pump('-key', '!')],
  ['a run of =', pump('=', '!')],
  ['a run of +', pump('+', '!')],
  ['a run of /', pump('/', 'x')],
  ['a run of \\', pump('\\', 'x')],
  ['a run of )', pump(')', '!')],
  ['a run of spaces', pump(' ', '!')],
  ['a run of tabs', pump('\t', '\n')],
  ['a run of <', pump('<', '')],
  ['a run of quotes', pump('"', '')],
  ['a run of (', pump('(', '')],
  ['a run of {', pump('{', '')],
  ['a run of $a.', pump('$a.', '!')],
  ['a path to delete', pump('a/', '', 'rm -rf ')],
  ['letters and digits', pump('a1', '!', 'x=')],
  ['a long SQL drop', pump('a ', ';', 'DROP TABLE ')],
  ['a private key header', pump('A ', '', '-----BEGIN ')],
  ['a web address of colons', pump('a:', '@', 'http://')],
]

async function bestMs(run: () => unknown): Promise<number> {
  await run()
  let best = Infinity
  for (let round = 0; round < 5 && best > LIMIT_MS; round++) {
    const t0 = performance.now()
    try {
      await run()
    } catch {
    }
    best = Math.min(best, performance.now() - t0)
  }
  return best
}

const DECISIONS: [string, (text: string) => unknown][] = [
  ['Bash', t => judgeTool(memIo(), P, 'Bash', { command: t }, MODES)],
  ['PowerShell', t => judgeTool(memIo(), P, 'PowerShell', { command: t }, MODES)],
  ['Write', t => judgeTool(memIo(), P, 'Write', { file_path: '/home/user/app/src/a.ts', content: t }, MODES)],
  ['Edit', t => judgeTool(memIo(), P, 'Edit', { file_path: '/home/user/app/src/a.ts', old_string: 'x', new_string: t }, MODES)],
  ['world Bash', t => judgeWorld('Bash', { command: t }, { world: 'warn', secrets: 'warn' })],
  ['world outside tool', t => judgeWorld('mcp__mail__send', { text: t }, { world: 'warn', secrets: 'warn' })],
  ['secrets before', t => secretsBefore('Bash', { command: t })],
  ['secrets after', t => secretsAfter('Read', t)],
  ['scan', t => scanSecrets(t)],
  ['mask', t => maskSecrets(t)],
  ['hide', t => hideSecrets(t)],
  ['label', t => labelOf(t)],
  ['orders in outside text', t => orderKinds(t)],
  ['env names in code', t => namesInCode(t)],
  ['SQL', t => checkSql(t)],
  ['migration', t => judgeMigration(memIo(), P, 'Write', { file_path: '/home/user/app/migrations/001_init.sql', content: t })],
]

test('each Guard decision on a hostile 10,000-character input finishes within 50 ms', async () => {
  const slow: string[] = []
  for (const [what, text] of INPUTS) {
    for (const [name, run] of DECISIONS) {
      const ms = await bestMs(() => run(text))
      if (ms > LIMIT_MS) slow.push(`${name} on ${what}: ${ms.toFixed(0)} ms`)
    }
  }
  expect(slow).toEqual([])
})
