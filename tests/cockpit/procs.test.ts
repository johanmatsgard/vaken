// The process helpers: the argv on each system, the parsers, the Windows program names, and the runners with a fake `run`.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import {
  alivePidsArgv, bindPlatform, hasProgram, hasProgramArgv, isProcessNamed, parseAlivePids, platformOfIo, platformOnce, procPlatformOf, processName, processNameArgv, processNameOf, resolveProgram, stopPid,
  stopPidArgv,
} from '../hooks/core/procs'
import type { Io } from '../hooks/core/io'

type Run = Io['run']
const res = (exitCode: number, stdout = '') => ({ exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false })
function fakeRun(answer: (argv: readonly string[]) => ReturnType<typeof res> | 'throw') {
  const calls: string[][] = []
  const run = (async (argv: readonly string[]) => {
    calls.push([...argv])
    const a = answer(argv)
    if (a === 'throw') throw new Error('cannot start')
    return a
  }) as unknown as Run
  return { run, calls }
}

test('the system: only Windows_NT is Windows; read once', async () => {
  expect(procPlatformOf('Windows_NT')).toBe('win32')
  expect(procPlatformOf(undefined)).toBe('posix')
  expect(procPlatformOf('Darwin')).toBe('posix')
  let reads = 0
  const get = platformOnce(async () => {
    reads += 1
    return 'Windows_NT'
  })
  expect(await get()).toBe('win32')
  expect(await get()).toBe('win32')
  expect(reads).toBe(1)
  expect(await platformOnce(async () => Promise.reject(new Error('no')))()).toBe('posix')
  const io = {}
  expect(await platformOfIo(io)).toBe('posix')
  bindPlatform(io, async () => 'Windows_NT')
  expect(await platformOfIo(io)).toBe('win32')
})

test('Mac argv are exactly the old calls', () => {
  expect(hasProgramArgv('gh', 'posix')).toEqual(['which', 'gh'])
  expect(stopPidArgv(4321, 'posix')).toEqual(['kill', '4321'])
  expect(stopPidArgv(4321, 'posix', true)).toEqual(['kill', '-9', '4321'])
  expect(processNameArgv(4321, 'posix')).toEqual(['ps', '-p', '4321', '-o', 'comm='])
  expect(alivePidsArgv([12, 34], 'posix')).toEqual(['ps', '-p', '12,34', '-o', 'pid='])
  expect(resolveProgram('npm', 'posix')).toBe('npm')
  expect(resolveProgram('gh', 'posix')).toBe('gh')
})

test('Windows argv: where, taskkill without /F unless asked, tasklist', () => {
  expect(hasProgramArgv('gh', 'win32')).toEqual(['where', 'gh'])
  expect(stopPidArgv(4321, 'win32')).toEqual(['taskkill', '/PID', '4321'])
  expect(stopPidArgv(4321, 'win32')).not.toContain('/F')
  expect(stopPidArgv(4321, 'win32', true)).toEqual(['taskkill', '/PID', '4321', '/F'])
  expect(processNameArgv(4321, 'win32')).toEqual(['tasklist', '/FI', 'PID eq 4321', '/FO', 'CSV', '/NH'])
  expect(alivePidsArgv([12, 34], 'win32')).toEqual(['tasklist', '/FO', 'CSV', '/NH'])
})

test('Windows program names: .cmd shims, .exe for the rest, given names kept', () => {
  expect(resolveProgram('npm', 'win32')).toBe('npm.cmd')
  expect(resolveProgram('npx', 'win32')).toBe('npx.cmd')
  expect(resolveProgram('pnpm', 'win32')).toBe('pnpm.cmd')
  expect(resolveProgram('yarn', 'win32')).toBe('yarn.cmd')
  expect(resolveProgram('gh', 'win32')).toBe('gh.exe')
  expect(resolveProgram('git', 'win32')).toBe('git.exe')
  expect(resolveProgram('npm.cmd', 'win32')).toBe('npm.cmd')
  expect(resolveProgram('gh.exe', 'win32')).toBe('gh.exe')
  expect(resolveProgram('C:\\Tools\\gh', 'win32')).toBe('C:\\Tools\\gh')
  expect(resolveProgram('', 'win32')).toBe('')
})

test('parsers: program name and alive numbers on each system', () => {
  expect(processNameOf('caffeinate\n', 'posix')).toBe('caffeinate')
  expect(processNameOf('/usr/bin/caffeinate\n', 'posix')).toBe('caffeinate')
  expect(processNameOf('', 'posix')).toBeUndefined()
  expect(processNameOf('"caffeinate.exe","4321","Console","1","1,234 K"\r\n', 'win32')).toBe('caffeinate')
  expect(processNameOf('INFO: No tasks are running which match the specified criteria.\r\n', 'win32')).toBeUndefined()
  expect([...parseAlivePids('  12\n34\n\n1\nx\n', 'posix')]).toEqual([12, 34])
  expect([...parseAlivePids('"System","4","Services","0","1 K"\r\n"node.exe","1234","Console","1","50,000 K"\r\n', 'win32')]).toEqual([4, 1234])
})

test('runners: hasProgram, stopPid, processName, isProcessNamed', async () => {
  const yes = fakeRun(() => res(0, '/usr/bin/gh\n'))
  expect(await hasProgram(yes.run, 'posix', 'gh')).toBe(true)
  expect(yes.calls).toEqual([['which', 'gh']])
  expect(await hasProgram(fakeRun(() => res(1)).run, 'win32', 'gh')).toBe(false)
  expect(await hasProgram(fakeRun(() => 'throw').run, 'posix', 'gh')).toBe(false)

  const stop = fakeRun(() => res(0))
  expect(await stopPid(stop.run, 'win32', 4321)).toBe(true)
  expect(await stopPid(stop.run, 'win32', 4321, { force: true })).toBe(true)
  expect(await stopPid(stop.run, 'posix', 1)).toBe(false)
  expect(stop.calls).toEqual([
    ['taskkill', '/PID', '4321'],
    ['taskkill', '/PID', '4321', '/F'],
  ])

  const ps = fakeRun(() => res(0, '/usr/bin/caffeinate\n'))
  expect(await processName(ps.run, 'posix', 4321)).toBe('caffeinate')
  expect(await isProcessNamed(ps.run, 'posix', 4321, 'caffeinate')).toBe(true)
  expect(await isProcessNamed(ps.run, 'posix', 4321, 'node')).toBe(false)
  expect(await isProcessNamed(fakeRun(() => res(1)).run, 'posix', 4321, 'caffeinate')).toBe(false)
  const tl = fakeRun(() => res(0, '"Node.exe","4321","Console","1","50,000 K"\r\n'))
  expect(await isProcessNamed(tl.run, 'win32', 4321, 'node')).toBe(true)
  expect(await isProcessNamed(tl.run, 'win32', 4321, 'node.exe')).toBe(true)
})
