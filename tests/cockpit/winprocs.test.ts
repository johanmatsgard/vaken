// Windows: the orphan finder and the port listing.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { cwdPids, cwdsFromCommands, mergeCwds, parseWinCwds, parseWinProcs, plainCommand, readWinCwds, readWinProcs, winCwdScript, winCwds, winCwdsArgv, winProcsArgv } from '../hooks/core/winprocs'
import { NETSTAT_ARGV, TASKLIST_ARGV, parseNetstat, parseTasklistNames, readWinListeners } from '../hooks/core/winnet'
import { candidates, findOrphans, isCaffeinate, isDevProgram, orphansText, parseCwds, parseListeners, parsePid, parsePs, portsText } from '../hooks/core/crew3proc'
import { WIN_SHOWN } from '../hooks/core/syswords'
import { byEnglish } from '../hooks/i18n/table'

const NOW = 1_791_040_000_000

const JSON_ARRAY = `[{"ProcessId":4,"ParentProcessId":0,"Name":"System","CreationDate":"\\/Date(1791036415385)\\/","CommandLine":null},{"ProcessId":7001,"ParentProcessId":900,"Name":"node.exe","CreationDate":"\\/Date(1791000000000)\\/","CommandLine":"\\"C:\\\\Program Files\\\\nodejs\\\\node.exe\\" \\"C:\\\\work\\\\app\\\\node_modules\\\\vite\\\\bin\\\\vite.js\\" --port 5174 --token abc123"},{"ProcessId":7002,"ParentProcessId":900,"Name":"node.exe","CreationDate":"\\/Date(1791039990000)\\/","CommandLine":"node C:\\\\work\\\\app\\\\young.js"},{"ProcessId":7003,"ParentProcessId":900,"Name":"node.exe","CreationDate":"\\/Date(1791000000000)\\/","CommandLine":"node server.js"},{"ProcessId":7004,"ParentProcessId":1,"Name":"node.exe","CreationDate":"\\/Date(1791000000000)\\/","CommandLine":"\\"C:\\\\Program Files\\\\nodejs\\\\node.exe\\" C:\\\\Users\\\\me\\\\AppData\\\\npm\\\\node_modules\\\\@anthropic-ai\\\\claude-code\\\\cli.js"}]`

test('windows processes: JSON of Win32_Process becomes the Mac record; null command, one object, empty, bad JSON, CRLF and a BOM', () => {
  const p = parseWinProcs(JSON_ARRAY, NOW)
  expect(p.map(x => x.pid)).toEqual([4, 7001, 7002, 7003, 7004])
  expect(p[0]).toEqual({ pid: 4, ppid: 0, ageS: Math.floor((NOW - 1791036415385) / 1000), command: 'System' })
  expect(p[1]).toEqual({ pid: 7001, ppid: 900, ageS: 40000, command: 'node "C:\\work\\app\\node_modules\\vite\\bin\\vite.js" --port 5174 --token abc123' })
  const one = '{"ProcessId":9,"ParentProcessId":1,"Name":"python.exe","CreationDate":"\\/Date(1791000000000)\\/","CommandLine":"python.exe -m http.server 8000"}'
  expect(parseWinProcs(`\uFEFF${one}\r\n`, NOW)).toEqual([{ pid: 9, ppid: 1, ageS: 40000, command: 'python -m http.server 8000' }])
  expect(parseWinProcs('', NOW)).toEqual([])
  expect(parseWinProcs('\r\n', NOW)).toEqual([])
  expect(parseWinProcs('not json', NOW)).toEqual([])
  expect(parseWinProcs('[{"Name":"x"}]', NOW)).toEqual([])
  expect(parseWinProcs('{"ProcessId":5,"Name":"node.exe","CreationDate":"2026-10-11T08:00:00.000Z","CommandLine":null}', NOW)[0]?.command).toBe('node')
})

test('plainCommand writes the first word like the Mac: no quotes, folder or .exe', () => {
  expect(plainCommand('"C:\\Program Files\\nodejs\\node.exe" x.js', 'node.exe')).toBe('node x.js')
  expect(plainCommand('C:\\tools\\esbuild.exe --watch', 'esbuild.exe')).toBe('esbuild --watch')
  expect(plainCommand('', 'tsc.exe')).toBe('tsc')
  expect(plainCommand('"C:\\a b\\node.exe"', 'node.exe')).toBe('node')
})

test('windows argv: PowerShell by argv, filtered to the dev programs, or to given process numbers', () => {
  const a = winProcsArgv()
  expect(a.slice(0, 4)).toEqual(['powershell', '-NoProfile', '-NonInteractive', '-Command'])
  expect(a[4]).toContain('Get-CimInstance Win32_Process')
  expect(a[4]).toContain('node|nodejs')
  expect(a[4]).toContain('ConvertTo-Json -Compress')
  expect(winProcsArgv([12, 34, -1, 1.5])[4]).toContain('@(12,34) -contains $_.ProcessId')
  expect(winProcsArgv([])[4]).toContain('$false')
})

test('the folder of a program is read from its command line, the longest folder wins, slashes and case do not matter, a longer name is not a match', () => {
  const procs = parseWinProcs(JSON_ARRAY, NOW)
  const m = cwdsFromCommands(procs, ['c:/work/app', 'C:\\work', 'C:/work/app/node_modules/vite', 'C:\\work\\ap'])
  expect(m.get(7001)).toBe('C:/work/app/node_modules/vite')
  expect(m.get(7002)).toBe('c:/work/app')
  expect(m.has(7003)).toBe(false)
  expect(m.has(4)).toBe(false)
  expect(cwdsFromCommands([{ pid: 1, command: 'node C:\\work\\app2\\x.js' }], ['C:\\work\\app']).size).toBe(0)
  expect(cwdsFromCommands([{ pid: 1, command: 'node xC:\\work\\app\\x.js' }], ['C:\\work\\app']).size).toBe(0)
  expect(cwdsFromCommands([{ pid: 1, command: 'node "C:\\work\\app"' }], ['C:\\work\\app\\']).get(1)).toBe('C:\\work\\app\\')
})

test('windows orphans: a program naming the folder of an ended session is a leftover; Claude, a young program and a program with no folder are not', () => {
  const procs = parseWinProcs(JSON_ARRAY, NOW)
  expect(isDevProgram(procs[4]?.command ?? '')).toBe(false)
  const folders = [{ cwd: 'C:\\work\\app', name: 'feat-app', seen: NOW }]
  const ctx = { folders, live: new Map<string, string[]>(), worktrees: [], selfPids: new Set<number>() }
  const cands = candidates(procs, ctx)
  expect(cands.map(c => c.pid)).toEqual([7001, 7003])
  const cwds = cwdsFromCommands(cands, ['C:\\work\\app'])
  const found = findOrphans(cands, cwds, ctx)
  expect(found.map(o => o.pid)).toEqual([7001])
  const t = orphansText(found, { ps: true, lsof: true }, 'win32')
  expect(t).toMatch(/1\. node, PID 7001, running 11 hours\. Folder work\\app \(session 'feat-app' has ended\)\./)
  expect(t).toContain('To stop it, run: taskkill /PID 7001')
  expect(t).toContain('--token ***')
  expect(t).not.toContain('abc123')
  expect(t).not.toContain('kill 7001\n')
  expect(t).toContain('The folder is read from the program, or from its command when Windows does not tell it.')
  expect(orphansText([], { ps: true, lsof: false }, 'win32')).toContain("No program's folder could be read, and none names a session folder in its command.")
  expect(orphansText([], { ps: true, lsof: true }, 'win32')).toContain('that run in the folder of a session that has ended')
})

test('the Mac words and the Mac stop command are exactly as before', () => {
  const o = { pid: 5, ppid: 1, ageS: 7200, command: 'node /a/b.js', cwd: '/a', why: 'ended' as const, name: 'x' }
  const t = orphansText([o], { ps: true, lsof: true })
  expect(t).toContain('   To stop it, run: kill 5')
  expect(t.endsWith('Look at each line before you run it: a program you started by hand in that folder looks the same. Vaken never stops a program.')).toBe(true)
  expect(orphansText([], { ps: false, lsof: false })).toBe('Leftover programs: the ps program did not answer, so nothing could be checked.')
  expect(orphansText([], { ps: true, lsof: false })).toContain('The lsof program did not answer')
  expect(portsText('on', undefined, false)).toContain('the lsof program did not answer')
  expect(portsText('on', undefined, false, false, 'win32')).toContain('the netstat program did not answer')
  expect(orphansText([], { ps: false, lsof: false }, 'win32')).toBe('Leftover programs: the process list did not answer, so nothing could be checked.')
})

test('every new Windows line has a Swedish twin', () => {
  const win = Object.values(WIN_SHOWN)
  for (const k of ['The ports could not be read: the lsof program did not answer.', 'Leftover programs: the ps program did not answer, so nothing could be checked.']) {
    const w = WIN_SHOWN[k] ?? ''
    expect(win.includes(w)).toBe(true)
    expect((byEnglish('sv', 'sys')[w] ?? '') !== '' && byEnglish('sv', 'sys')[w] !== w).toBe(true)
  }
})

const NETSTAT = [
  '',
  'Active Connections',
  '',
  '  Proto  Local Address          Foreign Address        State           PID',
  '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       2228',
  '  TCP    0.0.0.0:5173           0.0.0.0:0              LISTENING       7001',
  '  TCP    127.0.0.1:50000        127.0.0.1:5173         ESTABLISHED     8888',
  '  TCP    [::]:135               [::]:0                 LISTENING       2228',
  '  TCP    [::1]:5173             [::]:0                 LYSSNAR         7001',
  '  TCP    [::1]:3000             [::]:0                 LISTENING       7002',
  '  UDP    0.0.0.0:123            *:*                                    1234',
  '  TCP    0.0.0.0:99999          0.0.0.0:0              LISTENING       5',
].join('\r\n')

test('netstat: listening sockets of IPv4 and IPv6 once each, by the empty peer (not the translated State word); other lines and bad ports are skipped; CRLF', () => {
  expect(parseNetstat(NETSTAT)).toEqual([{ pid: 2228, port: 135 }, { pid: 7002, port: 3000 }, { pid: 7001, port: 5173 }])
  expect(parseNetstat('')).toEqual([])
  expect(parseNetstat('Active Connections\r\n\r\n')).toEqual([])
})

const TASKS = '"System Idle Process","0","Services","0","8 K"\r\n"node.exe","7001","Console","2","77 212 K"\r\n"Mina program.exe","7002","Console","2","1 000 K"\r\nINFO: odd line\r\n'

test('tasklist: process number to program without .exe; an INFO line is skipped', () => {
  const m = parseTasklistNames(TASKS)
  expect(m.get(7001)).toBe('node')
  expect(m.get(7002)).toBe('Mina program')
  expect(m.size).toBe(3)
  expect(parseTasklistNames('INFO: No tasks are running which match the specified criteria.\r\n').size).toBe(0)
})

type Fake = (argv: readonly string[]) => { exitCode: number; stdout: string } | 'throw'
const fakeRun = (answer: Fake, calls: string[][] = []) =>
  (async (argv: readonly string[]) => {
    calls.push([...argv])
    const a = answer(argv)
    if (a === 'throw') throw new Error('missing')
    return { exitCode: a.exitCode, stdout: a.stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
  }) as never

test('port listing runner: netstat then tasklist; no names when tasklist fails; undefined when netstat fails or is missing; empty is an answer', async () => {
  const calls: string[][] = []
  const run = fakeRun(a => (a[0] === 'netstat' ? { exitCode: 0, stdout: NETSTAT } : { exitCode: 0, stdout: TASKS }), calls)
  expect(await readWinListeners(run)).toEqual([
    { command: '', pid: 2228, port: 135 },
    { command: 'Mina program', pid: 7002, port: 3000 },
    { command: 'node', pid: 7001, port: 5173 },
  ])
  expect(calls).toEqual([[...NETSTAT_ARGV], [...TASKLIST_ARGV]])
  const noNames = fakeRun(a => (a[0] === 'netstat' ? { exitCode: 0, stdout: NETSTAT } : 'throw'))
  expect((await readWinListeners(noNames))?.map(l => l.command)).toEqual(['', '', ''])
  expect(await readWinListeners(fakeRun(() => 'throw'))).toBeUndefined()
  expect(await readWinListeners(fakeRun(() => ({ exitCode: 1, stdout: '' })))).toBeUndefined()
  expect(await readWinListeners(fakeRun(() => ({ exitCode: 0, stdout: 'Active Connections\r\n' })))).toEqual([])
})

test('process runner: parses the answer; a failed or missing PowerShell is undefined', async () => {
  const calls: string[][] = []
  const got = await readWinProcs(fakeRun(() => ({ exitCode: 0, stdout: JSON_ARRAY }), calls), NOW)
  expect(got?.length).toBe(5)
  expect(calls[0]).toEqual(winProcsArgv())
  expect(await readWinProcs(fakeRun(() => ({ exitCode: 0, stdout: '' })), NOW)).toEqual([])
  expect(await readWinProcs(fakeRun(() => ({ exitCode: 1, stdout: '' })), NOW)).toBeUndefined()
  expect(await readWinProcs(fakeRun(() => 'throw'), NOW)).toBeUndefined()
})

test('real folder: only whole process numbers above the system go into the script, each once; the rest is fixed text with no double quote or backslash', () => {
  expect(cwdPids([7001, 7001, 0, 4, -3, 1.5, Number.NaN, 2 ** 40, 7002])).toEqual([7001, 7002])
  const s = winCwdScript([7001, 1.5, 7002])
  expect(s).toContain('foreach ($i in @(7001,7002))')
  expect(s).not.toContain('"')
  expect(s).not.toContain('\\')
  expect(s).toContain('Is64BitProcess')
  expect(s).toContain('OpenProcess(0x410')
  expect(s).toContain('+ 0x20')
  expect(s).toContain('+ 0x38')
  expect(winCwdScript([]).replace('@()', '@(X)')).toBe(winCwdScript([1.5]).replace('@()', '@(X)'))
  const argv = winCwdsArgv([7001])
  expect(argv.slice(0, 4)).toEqual(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command'])
  expect(argv).toHaveLength(5)
})

test('real folder: the JSON answer becomes process number to folder; a trailing backslash goes, a drive root keeps it; bad rows, arrays and bad JSON are nothing', () => {
  const m = parseWinCwds('\uFEFF{"7001":"C:\\\\work\\\\app\\\\","7002":"D:\\\\","7003":"\\\\\\\\server\\\\share\\\\x","7004":"relative\\\\x","7005":5,"abc":"C:\\\\x","4":"C:\\\\Windows","1.5":"C:\\\\y"}\r\n')
  expect([...m]).toEqual([[7001, 'C:\\work\\app'], [7002, 'D:\\'], [7003, '\\\\server\\share\\x']])
  expect(parseWinCwds('{}').size).toBe(0)
  expect(parseWinCwds('').size).toBe(0)
  expect(parseWinCwds('not json').size).toBe(0)
  expect(parseWinCwds('["C:\\\\x"]').size).toBe(0)
  expect(parseWinCwds('null').size).toBe(0)
})

test('real folder first, the command-line guess only where the read failed', async () => {
  expect([...mergeCwds(new Map([[1, 'C:\\real']]), new Map([[1, 'C:\\guess'], [2, 'C:\\guess2']]))]).toEqual([[1, 'C:\\real'], [2, 'C:\\guess2']])
  const procs = [{ pid: 7001, command: 'node server.js' }, { pid: 7002, command: 'node C:\\work\\app\\x.js' }]
  const calls: string[][] = []
  const got = await winCwds(fakeRun(() => ({ exitCode: 0, stdout: '{"7001":"C:\\\\work\\\\other\\\\"}' }), calls), procs, ['C:\\work\\app'])
  expect([...got]).toEqual([[7001, 'C:\\work\\other'], [7002, 'C:\\work\\app']])
  expect(calls).toEqual([winCwdsArgv([7001, 7002])])
  const fallback = await winCwds(fakeRun(() => 'throw'), procs, ['C:\\work\\app'])
  expect([...fallback]).toEqual([[7002, 'C:\\work\\app']])
  expect((await readWinCwds(fakeRun(() => ({ exitCode: 1, stdout: '{"7001":"C:\\\\x"}' })), [7001])).size).toBe(0)
  const none: string[][] = []
  expect((await readWinCwds(fakeRun(() => ({ exitCode: 0, stdout: '{}' }), none), [0, 4, 1.5])).size).toBe(0)
  expect(none).toEqual([])
  const empty: string[][] = []
  expect((await winCwds(fakeRun(() => ({ exitCode: 0, stdout: '{}' }), empty), [], ['C:\\work'])).size).toBe(0)
  expect(empty).toEqual([])
})

test('crew3proc parsers read \\r\\n output the same as \\n (the Mac text is unchanged)', () => {
  const lsof = 'COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME\nnode 11 me 20u IPv4 0x1 0t0 TCP *:3000 (LISTEN)\n'
  expect(parseListeners(lsof.replace(/\n/g, '\r\n'))).toEqual(parseListeners(lsof))
  expect(parseListeners(lsof)).toHaveLength(1)
  expect(parseCwds('p11\nfcwd\nn/work/a\n'.replace(/\n/g, '\r\n'))).toEqual(new Map([[11, '/work/a']]))
  const ps = '  PID  PPID     ELAPSED COMMAND\n  101     1  05:00 node x.js\n'
  expect(parsePs(ps.replace(/\n/g, '\r\n'))).toEqual(parsePs(ps))
  expect(parsePs(ps)).toHaveLength(1)
  expect(parsePid('1234\r\n')).toBe(1234)
  expect(isCaffeinate('/usr/bin/caffeinate\r\n')).toBe(true)
})
