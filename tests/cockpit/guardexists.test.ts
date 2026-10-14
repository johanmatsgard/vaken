// "Empties the existing file".
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { bindFs } from '../hooks/core/fileops'
import type { FsApi } from '../hooks/core/fileops'
import type { Io } from '../hooks/core/io'
import { judgeTool } from '../hooks/core/guardjudge'
import type { Env, Modes } from '../hooks/core/guardjudge'
import { guardWords } from '../hooks/core/phonedo'
import { bindPlatform } from '../hooks/core/procs'

const W: Env = { home: 'C:\\Users\\user', cwd: 'C:\\Users\\user\\app', root: 'C:\\Users\\user\\app' }
const P: Env = { home: '/home/user', cwd: '/home/user/app', root: '/home/user/app' }
const MODES: Modes = { destructive: 'warn', scope: 'off', packages: 'off', tests: 'off' }

type Calls = { runs: { argv: readonly string[]; init: unknown }[]; stats: string[] }
type Stat = (path: string) => Promise<{ kind: 'file' | 'dir' | 'other'; size: number }>

// `exit`: what `test -s` answers on the Mac (a number, or 'reject' for a program that cannot start).
function fake(o: { exit?: number | 'reject'; stat?: Stat; win?: boolean }): { io: Io; calls: Calls } {
  const calls: Calls = { runs: [], stats: [] }
  const no = (): never => {
    throw new Error('not in this test')
  }
  const mem = new Map<string, unknown>()
  let io: Io = {
    now: async () => 0,
    home: async () => '',
    sessionId: async () => 'session-a',
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, v),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => no(),
    write: async () => no(),
    run: async (argv, init) => {
      calls.runs.push({ argv, init })
      if (o.exit === undefined || o.exit === 'reject') throw new Error('Executable not found in $PATH: "test"')
      return { exitCode: o.exit, stdout: '', stderr: '' }
    },
    ask: async () => no(),
    complete: async () => no(),
    toast: () => undefined,
    invalidate: () => undefined,
  }
  const stat = o.stat
  if (stat !== undefined) {
    const fs: FsApi = {
      stat: async p => {
        calls.stats.push(p)
        return stat(p)
      },
      list: async () => no(),
      readBytes: async () => no(),
    }
    io = bindFs(io, fs)
  }
  if (o.win === true) io = bindPlatform(io, async () => 'Windows_NT')
  return { io, calls }
}

const sized = (size: number): Stat => async () => ({ kind: 'file', size })
const missing: Stat = async p => {
  throw new Error(`ENOENT: no such file or directory, stat '${p}'`)
}
const denied: Stat = async () => {
  throw new Error('EACCES: permission denied')
}
const truncates = async (io: Io, env: Env, tool: string, command: string): Promise<boolean> =>
  (await judgeTool(io, env, tool, { command }, MODES)).found.some(f => f.key.includes('truncate|'))

const PS_OUT = "echo hi > 'C:\\Users\\user\\other\\file.txt'"
const BASH_OUT = 'echo hi > C:/Users/user/other/file.txt'

test('Windows: a non-empty file outside the project is found by the file call, with no program (PowerShell and Bash tools)', async () => {
  for (const [tool, cmd] of [['PowerShell', PS_OUT], ['Bash', BASH_OUT]] as const) {
    for (const win of [true, false]) {
      const f = fake({ stat: sized(12), win })
      expect(await truncates(f.io, W, tool, cmd)).toBe(true)
      expect(f.calls.runs).toEqual([])
      expect(f.calls.stats.length).toBe(1)
    }
  }
  const f = fake({ stat: sized(12), win: true })
  const j = await judgeTool(f.io, W, 'PowerShell', { command: PS_OUT }, MODES)
  expect(j.found[0].words).toContain('Empties the existing file')
  expect(j.found[0].words).toContain('It is outside this project and its current content is lost.')
})

test('Windows: a missing file, an empty file (as test -s), a failed call or no file call at all give no finding, and run no program', async () => {
  for (const stat of [missing, sized(0), denied, undefined]) {
    const f = fake({ stat, win: true })
    expect(await truncates(f.io, W, 'PowerShell', PS_OUT)).toBe(false)
    expect(await truncates(f.io, W, 'Bash', BASH_OUT)).toBe(false)
    expect(f.calls.runs).toEqual([])
  }
})

test('Windows: a file inside the project is never asked about', async () => {
  const f = fake({ stat: sized(12), win: true })
  expect(await truncates(f.io, W, 'PowerShell', 'echo hi > C:\\Users\\user\\app\\out.txt')).toBe(false)
  expect(await truncates(f.io, W, 'PowerShell', 'echo hi > out.txt')).toBe(false)
  expect(f.calls.stats).toEqual([])
})

test('Windows bound with a POSIX-looking path (Git Bash): still the file call, never `test`', async () => {
  const f = fake({ stat: sized(5), win: true })
  expect(await truncates(f.io, P, 'Bash', 'echo hi > /home/user/other/file.txt')).toBe(true)
  expect(f.calls.runs).toEqual([])
})

test('the Mac keeps `test -s` byte for byte: same argv, same time limit, and the file call is not used', async () => {
  const yes = fake({ exit: 0, stat: sized(0) })
  expect(await truncates(yes.io, P, 'Bash', 'echo hi > ~/notes.txt')).toBe(true)
  expect(yes.calls.runs).toEqual([{ argv: ['test', '-s', '/home/user/notes.txt'], init: { timeoutMs: 5000 } }])
  expect(yes.calls.stats).toEqual([])
  const no = fake({ exit: 1, stat: sized(9) })
  expect(await truncates(no.io, P, 'Bash', 'echo hi > ~/notes.txt')).toBe(false)
  const broke = fake({ exit: 'reject' })
  expect(await truncates(broke.io, P, 'Bash', 'echo hi > ~/notes.txt')).toBe(false)
  const inside = fake({ exit: 0 })
  expect(await truncates(inside.io, P, 'Bash', 'echo hi > /home/user/app/out.txt')).toBe(false)
  expect(inside.calls.runs).toEqual([])
})

test('/vaken-help run do judges a PowerShell block with the same check', async () => {
  const f = fake({ stat: sized(3), win: true })
  expect((await guardWords(f.io, W, PS_OUT, 'win32')).join(' ')).toContain('Empties the existing file')
  const g = fake({ stat: missing, win: true })
  expect((await guardWords(g.io, W, PS_OUT, 'win32')).join(' ')).not.toContain('Empties the existing file')
})
