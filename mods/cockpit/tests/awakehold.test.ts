// Awake guard, the hold per system: the start argv on the Mac and on Windows, the 8 hour cap on a Windows hold.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { AWAKE_ABS_MAX_MS, AWAKE_STRINGS, LID_NOTE, awakeCardLines, awakeNow, setAwakeShown, whyLine } from '../hooks/core/awakeplan'
import { HOLD_MAX_S, WIN_ES_FLAGS, awakeStartArgv, holdProgram, holdSeconds, stopOwnHold, winHoldScript, winStartScript } from '../hooks/core/awakehold'
import { AWAKE_WIN_STRINGS, WIN_KEEPING, WIN_LID_NOTE } from '../hooks/core/awakewords'
import { AWAKE_HOLD_S, AWAKE_START_ARGV, awakeDetail, awakeText } from '../hooks/core/crew3proc'
import { checkCommand } from '../hooks/core/guarddestroy'
import { judgeTool } from '../hooks/core/guardjudge'
import type { Modes } from '../hooks/core/guardjudge'
import { checkWindows } from '../hooks/core/guardwin'
import type { Io } from '../hooks/core/io'
import type { ProcPlatform } from '../hooks/core/procs'
import { byEnglish } from '../hooks/i18n/table'

const MIN = 60_000
const NOW = Date.parse('2026-10-11T12:00:00Z')

type Answer = { exitCode: number; stdout: string }
function fakeRun(answer: (argv: readonly string[]) => Answer): { run: Io['run']; calls: string[][] } {
  const calls: string[][] = []
  const run = (async (argv: readonly string[]) => {
    calls.push([...argv])
    const a = answer(argv)
    return { exitCode: a.exitCode, stdout: a.stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
  }) as Io['run']
  return { run, calls }
}
const tasklistRow = (image: string, pid: number): string => `"${image}","${pid}","Console","1","12,345 K"\r\n`
const NO_TASK = 'INFO: No tasks are running which match the specified criteria.\r\n'

test('the Mac start is exactly the argv it always was', () => {
  expect(awakeStartArgv('posix')).toBe(AWAKE_START_ARGV)
  expect(awakeStartArgv('posix', 5 * 3600)).toBe(AWAKE_START_ARGV)
  expect([...awakeStartArgv('posix')]).toEqual(['sh', '-c', `nohup caffeinate -di -t ${AWAKE_HOLD_S} >/dev/null 2>&1 </dev/null & echo $!`])
  expect(holdProgram('posix')).toBe('caffeinate')
})

test('the Windows start: a PowerShell starter that starts a hidden PowerShell child, prints its id and ends', () => {
  const argv = awakeStartArgv('win32')
  expect(argv.slice(0, 4)).toEqual(['powershell', '-NoProfile', '-NonInteractive', '-Command'])
  expect(argv).toHaveLength(5)
  const script = argv[4]
  expect(script).toBe(winStartScript(AWAKE_HOLD_S))
  expect(script.startsWith('$p = Start-Process -FilePath powershell -WindowStyle Hidden -PassThru -ArgumentList ')).toBe(true)
  expect(script.endsWith('; Write-Output $p.Id')).toBe(true)
  expect(WIN_ES_FLAGS).toBe(0x80000000 + 0x1 + 0x2)
  expect(winHoldScript(AWAKE_HOLD_S)).toContain(`SetThreadExecutionState([uint32]${WIN_ES_FLAGS})`)
  expect(winHoldScript(AWAKE_HOLD_S).endsWith(`Start-Sleep -Seconds ${AWAKE_HOLD_S}`)).toBe(true)
  for (const s of [script, winHoldScript(AWAKE_HOLD_S)]) {
    expect(s).not.toMatch(/["\\]/)
    expect(s).not.toMatch(/-EncodedCommand|Invoke-Expression|\biex\b|ExecutionPolicy/i)
  }
  expect(script).toContain(winHoldScript(AWAKE_HOLD_S).replace(/'/g, "''"))
  expect(holdProgram('win32')).toBe('powershell')
})

test('a Windows hold never lasts past the 8 hour cap', () => {
  expect(HOLD_MAX_S).toBe(AWAKE_ABS_MAX_MS / 1000)
  expect(HOLD_MAX_S).toBe(8 * 3600)
  expect(holdSeconds(600)).toBe(600)
  expect(holdSeconds(8 * 3600)).toBe(8 * 3600)
  expect(holdSeconds(8 * 3600 + 1)).toBe(8 * 3600)
  expect(holdSeconds(1e12)).toBe(8 * 3600)
  expect(holdSeconds(Number.POSITIVE_INFINITY)).toBe(AWAKE_HOLD_S)
  expect(holdSeconds(Number.NaN)).toBe(AWAKE_HOLD_S)
  expect(holdSeconds(0)).toBe(AWAKE_HOLD_S)
  expect(holdSeconds(-5)).toBe(AWAKE_HOLD_S)
  expect(holdSeconds(90.7)).toBe(90)
  expect(winHoldScript(99 * 3600)).toContain(`Start-Sleep -Seconds ${8 * 3600}`)
  expect(awakeStartArgv('win32', 99 * 3600)[4]).toContain(`Start-Sleep -Seconds ${8 * 3600}`)
  expect(awakeStartArgv('win32')[4]).toContain(`Start-Sleep -Seconds ${AWAKE_HOLD_S}`)
})

test("vaken's own guard does not flag the fixed Windows script", async () => {
  const W = { home: 'C:\\Users\\me', cwd: 'C:\\work\\app' }
  const argv = awakeStartArgv('win32')
  // As one line, the way it would look if it were typed: the starter, and the child it starts.
  const line = `${argv.slice(0, 4).join(' ')} "${argv[4]}"`
  const child = `powershell -NoProfile -NonInteractive -Command "${winHoldScript(AWAKE_HOLD_S)}"`
  for (const cmd of [line, child, argv[4], winHoldScript(AWAKE_HOLD_S)]) {
    expect(checkCommand(cmd, W), cmd).toEqual([])
    expect(checkWindows(cmd, W), cmd).toEqual([])
  }
  const io = { run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }) } as unknown as Io
  const modes: Modes = { destructive: 'hold', scope: 'hold', packages: 'hold', tests: 'hold' }
  for (const cmd of [line, child]) expect((await judgeTool(io, { ...W, root: W.cwd }, 'Bash', { command: cmd }, modes)).found, cmd).toEqual([])
})

const at = NOW - 3 * MIN

test('Mac: the stop asks ps, then sends a plain kill to that id only; never -9', async () => {
  const f = fakeRun(argv => (argv[0] === 'ps' ? { exitCode: 0, stdout: '/usr/bin/caffeinate\n' } : { exitCode: 0, stdout: '' }))
  expect(await stopOwnHold(f.run, 'posix', 4321, at, NOW)).toBe(true)
  expect(f.calls).toEqual([
    ['ps', '-p', '4321', '-o', 'comm='],
    ['kill', '4321'],
  ])
})

test('Windows: the stop asks tasklist, sends a plain taskkill, and forces only that id when it still runs PowerShell', async () => {
  let alive = true
  const f = fakeRun(argv => {
    if (argv[0] === 'tasklist') return { exitCode: 0, stdout: alive ? tasklistRow('powershell.exe', 4321) : NO_TASK }
    if (argv[0] === 'taskkill' && argv.includes('/F')) alive = false
    return { exitCode: argv.includes('/F') ? 0 : 1, stdout: '' }
  })
  expect(await stopOwnHold(f.run, 'win32', 4321, at, NOW)).toBe(true)
  expect(f.calls).toEqual([
    ['tasklist', '/FI', 'PID eq 4321', '/FO', 'CSV', '/NH'],
    ['taskkill', '/PID', '4321'],
    ['tasklist', '/FI', 'PID eq 4321', '/FO', 'CSV', '/NH'],
    ['taskkill', '/PID', '4321', '/F'],
  ])
})

test('Windows: a plain taskkill that worked is not followed by a forced one', async () => {
  let alive = true
  const f = fakeRun(argv => {
    if (argv[0] === 'tasklist') return { exitCode: 0, stdout: alive ? tasklistRow('PowerShell.EXE', 4321) : NO_TASK }
    alive = false
    return { exitCode: 0, stdout: '' }
  })
  expect(await stopOwnHold(f.run, 'win32', 4321, at, NOW)).toBe(true)
  expect(f.calls.filter(c => c[0] === 'taskkill')).toEqual([['taskkill', '/PID', '4321']])
})

test('a recorded id whose program is not the hold program is never stopped, on either system', async () => {
  const cases: Array<[ProcPlatform, string]> = [
    ['win32', tasklistRow('node.exe', 4321)],
    ['win32', tasklistRow('pwsh.exe', 4321)],
    ['win32', tasklistRow('caffeinate.exe', 4321)],
    ['win32', NO_TASK],
    ['posix', 'node\n'],
    ['posix', 'powershell\n'],
    ['posix', ''],
  ]
  for (const [sys, out] of cases) {
    const f = fakeRun(argv => (argv[0] === 'tasklist' || argv[0] === 'ps' ? { exitCode: 0, stdout: out } : { exitCode: 0, stdout: '' }))
    expect(await stopOwnHold(f.run, sys, 4321, at, NOW), `${sys} ${out}`).toBe(false)
    expect(f.calls.some(c => c[0] === 'taskkill' || c[0] === 'kill'), `${sys} ${out}`).toBe(false)
  }
})

test('an old, missing or odd record is never stopped and nothing is asked', async () => {
  for (const sys of ['win32', 'posix'] as const) {
    for (const [pid, when] of [[4321, NOW - 30 * MIN], [4321, undefined], [1, at], ['4321', at], [4321.5, at], [undefined, at]] as Array<[unknown, unknown]>) {
      const f = fakeRun(argv => (argv[0] === 'tasklist' ? { exitCode: 0, stdout: tasklistRow('powershell.exe', 4321) } : argv[0] === 'ps' ? { exitCode: 0, stdout: 'caffeinate\n' } : { exitCode: 0, stdout: '' }))
      expect(await stopOwnHold(f.run, sys, pid, when, NOW), `${sys} ${String(pid)} ${String(when)}`).toBe(false)
      expect(f.calls.some(c => c[0] === 'taskkill' || c[0] === 'kill')).toBe(false)
    }
  }
})

test('a runner that throws stops nothing', async () => {
  const run = (async () => {
    throw new Error('no such program')
  }) as unknown as Io['run']
  expect(await stopOwnHold(run, 'win32', 4321, at, NOW)).toBe(false)
  expect(await stopOwnHold(run, 'posix', 4321, at, NOW)).toBe(false)
})

test('the words: "the PC" on Windows, the Mac words unchanged', () => {
  const state = awakeNow('on', 'phone', { working: 1, waiting: { count: 0 }, background: 0 }, undefined, NOW)
  expect(whyLine(state)).toBe('Keeping the Mac awake: a session is working')
  expect(whyLine(state, undefined, 'posix')).toBe('Keeping the Mac awake: a session is working')
  expect(whyLine(state, undefined, 'win32')).toBe('Keeping the PC awake: a session is working')
  setAwakeShown(state)
  expect(awakeCardLines(s => s)).toEqual(['Keeping the Mac awake: a session is working', LID_NOTE])
  setAwakeShown(state, 'win32')
  expect(awakeCardLines(s => s)).toEqual(['Keeping the PC awake: a session is working', WIN_LID_NOTE])
  setAwakeShown(state)
  expect(awakeCardLines(s => s)[0]).toBe('Keeping the PC awake: a session is working')
  setAwakeShown(state, 'posix')
  expect(awakeCardLines(s => s)).toEqual(['Keeping the Mac awake: a session is working', LID_NOTE])
  setAwakeShown(undefined)

  expect(awakeDetail(2)).toBe('Held the Mac awake for 10 minutes, because 2 sessions work. It is renewed while they work.')
  expect(awakeDetail(0, 'a phone is connected', 'win32')).toBe('Held the PC awake for 10 minutes: a phone is connected. It is renewed while that lasts.')
  expect(awakeDetail(1, undefined, 'win32')).toBe('Held the PC awake for 10 minutes, because 1 session works. It is renewed while they work.')

  const mac = awakeText('on', false, 2, 4321, NOW - 3 * MIN, NOW)
  expect(awakeText('on', false, 2, 4321, NOW - 3 * MIN, NOW, undefined, undefined, 'posix')).toBe(mac)
  expect(mac).toMatch(/^Keep Mac awake: on\./)
  expect(mac).toMatch(/caffeinate program was not found/)
  const win = awakeText('on', false, 2, 4321, NOW - 3 * MIN, NOW, undefined, undefined, 'win32')
  expect(win).toMatch(/^Keep PC awake: on\./)
  expect(win).toMatch(/PowerShell was not found/)
  expect(win).toMatch(/The PC is held awake \(started 3 min ago\)\./)
  expect(win).toContain(WIN_LID_NOTE)
  expect(win).not.toMatch(/Mac|caffeinate|macOS/)
  expect(awakeText('off', true, 0, undefined, undefined, NOW, undefined, undefined, 'win32')).not.toMatch(/Mac|caffeinate|macOS/)
})

test('every Windows word has Swedish, and the awake list carries them', () => {
  const AWAKE = byEnglish('sv', 'awake')
  for (const s of AWAKE_WIN_STRINGS) {
    expect(AWAKE[s], s).toBeTruthy()
    expect(AWAKE_STRINGS, s).toContain(s)
  }
  expect(AWAKE[WIN_KEEPING]).toBe('Håller datorn vaken')
  const sv = (s: string): string => AWAKE[s] ?? s
  setAwakeShown(awakeNow('on', 'phone', { working: 1, waiting: { count: 0 }, background: 0 }, undefined, NOW), 'win32')
  expect(awakeCardLines(sv)).toEqual(['Håller datorn vaken: en session arbetar', AWAKE[WIN_LID_NOTE]])
  setAwakeShown(undefined, 'posix')
})
