// The starter agents: the two files and the command that lists and writes them, over a folder in memory.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { EngineInterface } from 'claude-code'

import { STARTERS, STARTERS_HELP, STARTERS_SETTINGS, agentPath, planStarters, startersPreview } from '../hooks/core/starters'
import type { Io } from '../hooks/core/io'
import { startersRun } from '../hooks/features/starters'
import { viaParent } from './viaparent'
import { bindSafeFs } from '../hooks/core/safewrite'
import { memSafeFs } from './safefs'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const HOME = '/home/test'

function world(files: Record<string, string> = {}, failWrite = false) {
  const disk = new Map<string, string>(Object.entries(files))
  const mem = new Map<string, unknown>()
  const io: Io = {
    now: async () => NOW,
    home: async () => HOME,
    sessionId: async () => 'me',
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async path => {
      const t = disk.get(path)
      if (t === undefined) throw new Error('no such file')
      return t
    },
    write: async (path, text) => {
      if (failWrite) throw new Error('read-only folder')
      disk.set(path, text)
    },
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  const exists = async (path: string): Promise<boolean> => disk.has(path)
  bindSafeFs(io, memSafeFs(() => [`${HOME}/.keep`, ...disk.keys()]))
  return { disk, mem, io, exists }
}
const LOOKUP = agentPath(HOME, 'vaken-lookup')
const REVIEWER = agentPath(HOME, 'vaken-reviewer')

test('the two files have the frontmatter Claude Code reads: name, description, model alias, tools', () => {
  expect(STARTERS.map(s => s.name)).toEqual(['vaken-lookup', 'vaken-reviewer'])
  for (const s of STARTERS) {
    const m = /^---\nname: (.+)\ndescription: (.+)\nmodel: (.+)\ntools: (.+)\n---\n/.exec(s.text)
    expect(m).not.toBeNull()
    expect(m?.[1]).toBe(s.name)
    expect(m?.[3]).toBe(s.model)
    expect(['haiku', 'sonnet', 'opus']).toContain(s.model)
  }
  const [lookup, reviewer] = STARTERS
  expect(lookup.model).toBe('haiku')
  expect(reviewer.model).toBe('sonnet')
  expect(/\ntools: (.+)\n/.exec(lookup.text)?.[1]).toBe('Read, Grep, Glob')
  expect(/\ntools: (.+)\n/.exec(reviewer.text)?.[1]).toBe('Read, Grep, Glob, Bash')
  expect(lookup.text).toMatch(/10 lines or fewer/)
  expect(reviewer.text).toMatch(/Never run a command that writes/)
})

test('which starters to write: the ones whose file is not there', () => {
  expect(planStarters(new Set()).write.length).toBe(2)
  expect(planStarters(new Set(['vaken-lookup']))).toMatchObject({ write: [{ name: 'vaken-reviewer' }], skip: [{ name: 'vaken-lookup' }] })
})

test('without "make yes" it only shows what it would write, and writes nothing', async () => {
  const w = world()
  const t = await startersRun(w.io, w.exists, '')
  expect(t).toMatch(/Two starter agents for \/home\/test\/\.claude\/agents/)
  expect(t).toMatch(/vaken-lookup \(model haiku\)/)
  expect(t).toMatch(/vaken-reviewer \(model sonnet\)/)
  expect(t).toMatch(/\/vaken-tasks agents make yes/)
  expect(w.disk.size).toBe(0)
  expect(await startersRun(w.io, w.exists, 'make')).toBe(t)
  expect(await startersRun(w.io, w.exists, 'make no')).toBe(t)
  expect(w.disk.size).toBe(0)
})

test('"make yes" writes both files and one ledger line', async () => {
  const w = world()
  const t = await startersRun(w.io, w.exists, 'make yes')
  expect(t).toMatch(/^Wrote vaken-lookup, vaken-reviewer in \/home\/test\/\.claude\/agents\./)
  expect(w.disk.get(LOOKUP)).toBe(STARTERS[0].text)
  expect(w.disk.get(REVIEWER)).toBe(STARTERS[1].text)
  expect(w.mem.get('cockpit:ledger:compact')).toEqual([{ at: NOW, session: 'me', what: 'Wrote starter agents', detail: 'vaken-lookup, vaken-reviewer', how: 'typed', did: true }])
  const again = await startersRun(w.io, w.exists, 'MAKE YES')
  expect(again).toMatch(/^Wrote nothing\./)
  expect(again).toMatch(/Skipped vaken-lookup, vaken-reviewer: the file already exists/)
  expect((w.mem.get('cockpit:ledger:compact') as unknown[]).length).toBe(1)
})

test('an existing file is never overwritten, and the other one is still written', async () => {
  const w = world({ [LOOKUP]: 'my own helper' })
  const preview = await startersRun(w.io, w.exists, '')
  expect(preview).toMatch(/vaken-lookup \(model haiku\)[^\n]*Already there\./)
  const t = await startersRun(w.io, w.exists, 'make yes')
  expect(w.disk.get(LOOKUP)).toBe('my own helper')
  expect(w.disk.get(REVIEWER)).toBe(STARTERS[1].text)
  expect(t).toMatch(/Wrote vaken-reviewer/)
  expect(t).toMatch(/Skipped vaken-lookup: the file already exists/)
})

test('a check that fails counts as "there": nothing is written over a file it could not see', async () => {
  const w = world()
  const t = await startersRun(w.io, async () => {
    throw new Error('no access')
  }, 'make yes')
  expect(w.disk.size).toBe(0)
  expect(t).toMatch(/^Wrote nothing\./)
})

test('a failed write is told, and no ledger line is written for it', async () => {
  const w = world({}, true)
  const t = await startersRun(w.io, w.exists, 'make yes')
  expect(t).toMatch(/Could not write vaken-lookup: read-only folder/)
  expect(w.mem.get('cockpit:ledger:compact')).toBeUndefined()
})

test('no home folder: it says so and writes nothing', async () => {
  const w = world()
  const t = await startersRun({ ...w.io, home: async () => '' }, w.exists, 'make yes')
  expect(t).toMatch(/cannot find your home folder/)
  expect(w.disk.size).toBe(0)
})

test('there is no setting row, and one help entry', () => {
  expect(STARTERS_SETTINGS).toEqual([])
  expect(STARTERS_HELP.length).toBe(1)
  expect(startersPreview(HOME, new Set(['vaken-lookup', 'vaken-reviewer']))).toMatch(/Both files are already there/)
})

test('/vaken-tasks agents without "make yes" writes nothing', async ($, on) => {
  mock.env(on, { HOME: HOME })
  mock.session(on)
  on('fs.exists', () => ({ value: false }) as never)
  on('session.id', () => ({ value: 'test-session' }))
  const t = ((await $.command.run(viaParent('vaken-agents', '') as never)) as { text: string }).text
  expect(t).toMatch(/Two starter agents/)
})
