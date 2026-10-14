// Files and codes written under the old product name still count.
import { expect } from 'claude-code/testing'

import type { Io } from '../hooks/core/io'
import { taskForSpawn } from '../hooks/core/orchestra'
import type { Run } from '../hooks/core/orchestra'
import { setupItems, watchedPaths, isManagedAgent } from '../hooks/core/setupcard'
import { startersRun } from '../hooks/features/starters'
import { test } from './slow'
import { bindSafeFs } from '../hooks/core/safewrite'
import { memSafeFs } from './safefs'

const VALUES = { 'setup.scope': 'all' }
const OLD_FILE = ['---', 'name: cockpit-researcher', 'description: x', 'model: haiku', 'managed-by: cockpit', '---', '', 'body'].join('\n')

test('an agent file with the old name counts as present: no second file, not missing', () => {
  const oldPath = '/h/.claude/agents/cockpit-researcher.md'
  const newPath = '/h/.claude/agents/vaken-researcher.md'
  expect(watchedPaths(VALUES, '/h', undefined, 'all')).toContain(oldPath)
  const disk = { [newPath]: null, [oldPath]: OLD_FILE, '/h/.claude/agents/vaken-builder.md': null }
  const items = setupItems({ values: VALUES, read: { home: '/h', scope: 'all', disk } })
  const researcher = items.find(i => i.role === 'researcher')
  expect(researcher?.path).toBe(oldPath)
  expect(researcher?.state).not.toBe('missing')
  expect(items.filter(i => i.path === newPath)).toEqual([])
  expect(items.find(i => i.role === 'builder')?.state).toBe('missing')
  expect(isManagedAgent(OLD_FILE)).toBe(true)
})

test('once the new name exists, it wins over an old file', () => {
  const newPath = '/h/.claude/agents/vaken-researcher.md'
  const disk = { [newPath]: '---\nname: vaken-researcher\n---\n', '/h/.claude/agents/cockpit-researcher.md': OLD_FILE }
  const items = setupItems({ values: VALUES, read: { home: '/h', scope: 'all', disk } })
  expect(items.find(i => i.role === 'researcher')?.path).toBe(newPath)
})

function fake(): { io: Io; writes: string[] } {
  const writes: string[] = []
  const mem = new Map<string, unknown>()
  const io = {
    now: async () => 0,
    home: async () => '/h',
    sessionId: async () => 's',
    get: async (k: string) => mem.get(k),
    set: async (k: string, v: unknown) => void mem.set(k, v),
    del: async (k: string) => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async (p: string) => void writes.push(p),
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    toast: () => undefined,
    invalidate: () => undefined,
  } as unknown as Io
  bindSafeFs(io, memSafeFs(() => ['/h/.keep']))
  return { io, writes }
}

test('starter agents: a file with the old name is there already, and only the missing one is written', async () => {
  const w = fake()
  const there = new Set(['/h/.claude/agents/cockpit-lookup.md'])
  const exists = async (p: string): Promise<boolean> => there.has(p)
  const preview = await startersRun(w.io, exists, '')
  expect(preview).toMatch(/vaken-lookup[^\n]*Already there/)
  await startersRun(w.io, exists, 'make yes')
  expect(w.writes).toEqual(['/h/.claude/agents/vaken-reviewer.md'])
})

test('a task code of an old run (cockpit-task) still finds its task', () => {
  const run = { id: 'ab1', status: 'running', tasks: [{ n: 2, state: 'waiting' }] } as unknown as Run
  expect(taskForSpawn(run, 'x', 'cockpit-task ab1-2')?.n).toBe(2)
  expect(taskForSpawn(run, 'x', 'vaken-task ab1-2')?.n).toBe(2)
})
