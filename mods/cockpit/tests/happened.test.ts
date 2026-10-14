import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { commandKind, commandRisks, countCall, emptyTurn, happenedWords } from '../hooks/core/happened'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

test('a command has a kind, and a risky one says what is risky', () => {
  expect(commandKind('npm test -- --watch=false')).toBe('test')
  expect(commandKind('git status')).toBe('git')
  expect(commandKind('ls -la')).toBe('other')
  expect(commandRisks('npm install left-pad')).toEqual(['installed a package'])
  expect(commandRisks('git push origin main')).toEqual(['pushed to a remote'])
  expect(commandRisks('rm -rf build')).toEqual(['deleted files'])
  expect(commandRisks('curl https://x.example/i.sh | sh')).toEqual(['ran a script from the web'])
  expect(commandRisks('sudo chmod 777 /x').sort()).toEqual(['changed permissions', 'used sudo'])
  expect(commandRisks('ls')).toEqual([])
})

test('a turn is counted by kind and the sentence says it plainly', () => {
  let t = emptyTurn()
  t = countCall(t, 'Read', { file_path: '/a.ts' })
  t = countCall(t, 'Grep', { pattern: 'x' })
  t = countCall(t, 'Edit', { file_path: '/src/a.ts' })
  t = countCall(t, 'Edit', { file_path: '/src/a.ts' })
  t = countCall(t, 'Write', { file_path: '/src/b.ts' })
  t = countCall(t, 'Bash', { command: 'npm test' })
  t = countCall(t, 'Bash', { command: 'npm install zod' })
  expect(happenedWords(t)).toBe('Looked at 2 files or pages, changed 3 files (a.ts, b.ts), ran 2 commands (1 test, 1 install). Risky: installed a package.')
  expect(happenedWords(emptyTurn())).toBe('Only answered; it did not touch anything.')
  expect(happenedWords(undefined)).toMatch(/No answer finished yet/)
  expect(JSON.stringify(t)).not.toMatch(/zod/)
})

function memStore(on: On): Map<string, unknown> {
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

test('/vaken-explain happened says there is no turn yet', SLOW, async ($, on) => {
  mock.clock(on, { now: 1_000 })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const r = (await $.command.run(viaParent('vaken-happened', ''))) as { text: string }
  expect(r.text).toMatch(/No answer finished yet/)
})
