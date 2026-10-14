// The file work: the pure parts, and the functions with a fake file API and a fake `run`.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import {
  bindFs, bytesFromBase64, fileHashes, fileSizes, isMissing, isRemovableInside, isRemovablePath, listNames, makeDir, moveFile, removeEmptyDir, removeFile, removeFiles, removeTree, sha256Hex,
} from '../hooks/core/fileops'
import type { FsApi, Kind, Ops, Run } from '../hooks/core/fileops'
import type { Io } from '../hooks/core/io'
import { bindPlatform } from '../hooks/core/procs'
import { WIN_FS_NOT_A_LINK, WIN_FS_PROGRAM, WIN_FS_SCRIPT, winFsCall } from '../hooks/core/winfs'
import type { WinFsOp } from '../hooks/core/winfs'

const HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 1, 0x86, 0, 0, 3, 0x4c, 8, 6, 0, 0]
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function toBase64(b: number[]): string {
  let out = ''
  for (let k = 0; k < b.length; k += 3) {
    const n = ((b[k] ?? 0) << 16) | ((b[k + 1] ?? 0) << 8) | (b[k + 2] ?? 0)
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63]
  }
  return out
}

type Node = { kind: Kind; size: number }
function fakeFs(disk: Record<string, Node>, bytes: Record<string, string> = {}): FsApi {
  const enoent = (p: string): Error => new Error(`ENOENT: no such file or directory, ${p}`)
  return {
    stat: async p => {
      const n = disk[p]
      if (n === undefined) throw enoent(p)
      return n
    },
    list: async p => {
      const at = p.replace(/\/\.(?=\/|$)/g, '')
      if (disk[at]?.kind !== 'dir') throw enoent(p)
      return Object.entries(disk)
        .filter(([k]) => k.startsWith(`${at}/`) && !k.slice(at.length + 1).includes('/'))
        .map(([k, v]) => ({ name: k.slice(at.length + 1), kind: v.kind, size: v.size }))
    },
    readBytes: async p => {
      const b = bytes[p]
      if (b === undefined) throw enoent(p)
      return { base64: b }
    },
  }
}
const noRun: Run = async () => ({ exitCode: 127, stdout: '', stderr: 'not found', isStdoutTruncated: false, isStderrTruncated: false }) as never
const runWith = (calls: string[][], answer: (argv: readonly string[]) => { exitCode: number; stdout: string }): Run =>
  (async argv => {
    calls.push([...argv])
    const a = answer(argv)
    return { exitCode: a.exitCode, stdout: a.stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
  }) as never

test('a missing file is told from a failing call', () => {
  expect(isMissing(new Error('ENOENT: no such file'))).toBe(true)
  expect(isMissing(new TypeError("undefined is not an object (evaluating '$.fs.stat')"))).toBe(false)
})

test('sizes come from the file call, and a file that is not there is left out; no file call means the BSD program', async () => {
  const fs = fakeFs({ '/work/a.png': { kind: 'file', size: 120 } })
  const o: Ops = { run: noRun, fs }
  expect([...(await fileSizes(o, ['/work/a.png', '/work/none.png'])).entries()]).toEqual([['/work/a.png', 120]])
  const calls: string[][] = []
  const o2: Ops = { run: runWith(calls, () => ({ exitCode: 0, stdout: '77 /work/a.png\n' })) }
  expect([...(await fileSizes(o2, ['/work/a.png'])).entries()]).toEqual([['/work/a.png', 77]])
  expect(calls).toEqual([['stat', '-f', '%z %N', '--', '/work/a.png']])
  const broken: FsApi = { ...fs, stat: async () => Promise.reject(new Error('EACCES')) }
  const calls2: string[][] = []
  const o3: Ops = { run: runWith(calls2, () => ({ exitCode: 0, stdout: '5 /work/a.png' })), fs: broken }
  expect((await fileSizes(o3, ['/work/a.png'])).get('/work/a.png')).toBe(5)
})

const DISK: Record<string, Node> = {
  '/work/p': { kind: 'dir', size: 0 },
  '/work/p/.claude': { kind: 'dir', size: 0 },
  '/work/p/.claude/cockpit-eyes': { kind: 'dir', size: 0 },
  '/work/p/.claude/cockpit-eyes/20260101-140000': { kind: 'dir', size: 0 },
  '/work/p/.claude/cockpit-eyes/20260101-140000/home-390.png': { kind: 'file', size: 900 },
  '/work/p/.claude/cockpit-eyes/20260101-140000/notes.txt': { kind: 'file', size: 4 },
  '/work/p/.claude/cockpit-eyes/baseline': { kind: 'dir', size: 0 },
  '/work/p/.claude/cockpit-eyes/baseline/home.url': { kind: 'file', size: 20 },
  '/work/p/.claude/cockpit-eyes/baseline/link.png': { kind: 'other', size: 0 },
  '/work/p/src': { kind: 'dir', size: 0 },
  '/work/p/src/app.ts': { kind: 'file', size: 100 },
  '/work/p/src/huge.ts': { kind: 'file', size: 300 * 1024 },
  '/work/p/node_modules': { kind: 'dir', size: 0 },
  '/work/p/node_modules/x.js': { kind: 'file', size: 1 },
  '/work/p/dist': { kind: 'dir', size: 0 },
  '/work/p/dist/a.js': { kind: 'file', size: 2000 },
  '/work/p/dist/a.js.map': { kind: 'file', size: 9000 },
  '/work/p/dist/img': { kind: 'dir', size: 0 },
  '/work/p/dist/img/l.png': { kind: 'file', size: 500 },
}

test('with no file call the programs run with the same arguments as before', async () => {
  const calls: string[][] = []
  const o: Ops = { run: runWith(calls, () => ({ exitCode: 0, stdout: 'dist\n' })) }
  expect(await listNames(o, '/work/pics')).toEqual(['dist'])
  expect(await makeDir(o, '/work/new')).toBe(true)
  expect(calls).toEqual([['ls', '-1', '--', '/work/pics'], ['mkdir', '-p', '--', '/work/new']])
})

test('names in a folder come from the file call; a missing folder is undefined', async () => {
  const o: Ops = { run: noRun, fs: fakeFs(DISK) }
  expect((await listNames(o, '/work/p/src'))?.sort()).toEqual(['app.ts', 'huge.ts'])
  expect(await listNames(o, '/work/p/none')).toBe(undefined)
})

const WIN = async (): Promise<'win32'> => 'win32'
const POSIX = async (): Promise<'posix'> => 'posix'
const OWN = '/work/h/.claude/cockpit/eyes'

test('on the Mac every change to the disk runs the same program with the same arguments as before', async () => {
  const calls: string[][] = []
  const o: Ops = { run: runWith(calls, () => ({ exitCode: 0, stdout: '' })), plat: POSIX }
  expect(await makeDir(o, '/work/new')).toBe(true)
  expect(await moveFile(o, '/work/a.png', '/work/b.png')).toBe(true)
  expect(await removeTree(o, `${OWN}/profile-1-1`, OWN)).toBe(true)
  expect(await removeFile(o, `${OWN}/options/options-1.png`)).toBe(true)
  expect(await removeFile(o, `${OWN}/options/options-2.png`, `${OWN}/options`)).toBe(true)
  expect(await removeFiles(o, ['/work/h/.claude/cockpit/checkpoints/s/1.txt', '/work/h/.claude/cockpit/checkpoints/s/2.txt'])).toBe(true)
  expect(await removeEmptyDir(o, '/work/h/.claude/cockpit/checkpoints/s')).toBe(true)
  expect(calls).toEqual([
    ['mkdir', '-p', '--', '/work/new'],
    ['mv', '--', '/work/a.png', '/work/b.png'],
    ['rm', '-rf', '--', `${OWN}/profile-1-1`],
    ['rm', '-f', '--', `${OWN}/options/options-1.png`],
    ['rm', '-f', '--', `${OWN}/options/options-2.png`],
    ['rm', '-f', '--', '/work/h/.claude/cockpit/checkpoints/s/1.txt', '/work/h/.claude/cockpit/checkpoints/s/2.txt'],
    ['rmdir', '--', '/work/h/.claude/cockpit/checkpoints/s'],
  ])
})

test('a folder already there is seen by the file call: no mkdir', async () => {
  const calls: string[][] = []
  const o: Ops = { run: runWith(calls, () => ({ exitCode: 0, stdout: '' })), fs: fakeFs(DISK) }
  expect(await makeDir(o, '/work/p/src')).toBe(true)
  expect(calls).toEqual([])
  expect(await makeDir(o, '/work/p/new')).toBe(true)
  expect(calls).toEqual([['mkdir', '-p', '--', '/work/p/new']])
})

test('the remove guard: roots, home-deep paths, relative paths and .. parts are refused (POSIX)', () => {
  for (const p of ['', '/', '//', '/work', '/Users/me', '/home/me', 'relative/a/b', './a/b/c', '~/a/b/c', '/work/a/../b', '/work/a/b/..', '/work/./a/b', '/work/a\nb/c', '/work/a\\b/c']) expect(isRemovablePath(p), JSON.stringify(p)).toBe(false)
  for (const p of ['/work/a/b', '/work/h/.claude/cockpit/eyes/profile-1-1', '/work//h/x']) expect(isRemovablePath(p), p).toBe(true)
})

test('the remove guard on Windows: drive roots, shares, device paths, drive-relative paths, streams and trailing dots are refused', () => {
  for (const p of ['C:', 'C:\\', 'C:/', 'c:\\Users', 'C:\\Users\\me', 'C:/Users/me', 'C:Users\\me\\x', '\\Users\\me\\x', '\\\\server\\share\\a\\b', '//server/share/a/b', '\\\\?\\C:\\a\\b\\c', '\\\\.\\C:\\a\\b', 'C:\\a\\..\\b\\c', 'C:\\a\\b\\c.', 'C:\\a\\b\\c ', 'C:\\a\\b:s\\c', 'C:\\a\\b\\*', '/work/a/b'])
    expect(isRemovablePath(p, 'win32'), p).toBe(false)
  for (const p of ['C:\\Users\\me\\x', 'C:/Users/me/x', 'C:\\Users/me\\.claude\\cockpit\\eyes\\profile-1-1', 'd:\\work\\a\\b']) expect(isRemovablePath(p, 'win32'), p).toBe(true)
  expect(isRemovablePath('\\\\server\\share\\a\\b\\c')).toBe(false)
  expect(isRemovablePath('C:\\')).toBe(false)
})

test('a tree is removed only strictly inside its own folder: Windows ignores letter case and either slash', () => {
  expect(isRemovableInside(OWN, `${OWN}/profile-1-1`)).toBe(true)
  expect(isRemovableInside(OWN, OWN)).toBe(false)
  expect(isRemovableInside(OWN, `${OWN}/`)).toBe(false)
  expect(isRemovableInside(OWN, `${OWN}X/profile-1`)).toBe(false)
  expect(isRemovableInside(OWN, '/work/h')).toBe(false)
  expect(isRemovableInside(OWN, '/work/h/.claude/cockpit/other/p')).toBe(false)
  expect(isRemovableInside('/', '/work/a/b')).toBe(false)
  expect(isRemovableInside(OWN.toUpperCase(), `${OWN}/profile-1`)).toBe(false)
  const own = 'C:\\Users\\Me\\.claude\\cockpit\\eyes'
  expect(isRemovableInside(own, 'c:/users/me/.claude/cockpit/EYES/profile-1-1')).toBe(true)
  expect(isRemovableInside(own, 'C:\\Users\\Me\\.claude\\cockpit\\eyes')).toBe(false)
  expect(isRemovableInside(own, 'D:\\Users\\Me\\.claude\\cockpit\\eyes\\p')).toBe(false)
  expect(isRemovableInside('C:\\', 'C:\\Users\\Me\\x')).toBe(false)
  expect(isRemovableInside('C:\\Users\\Me', 'C:\\Users\\Me\\x')).toBe(false)
  expect(isRemovableInside('\\\\server\\share\\a\\b', '\\\\server\\share\\a\\b\\c')).toBe(false)
})

test('a remove the guard refuses runs no program at all', async () => {
  const calls: string[][] = []
  const o: Ops = { run: runWith(calls, () => ({ exitCode: 0, stdout: '' })) }
  expect(await removeTree(o, '/work/h', OWN)).toBe(false)
  expect(await removeTree(o, OWN, OWN)).toBe(false)
  expect(await removeTree(o, '/', OWN)).toBe(false)
  expect(await removeTree(o, `${OWN}/../../x`, OWN)).toBe(false)
  expect(await removeTree(o, `${OWN}/p`, '/')).toBe(false)
  expect(await removeFile(o, '/work/h')).toBe(false)
  expect(await removeFile(o, '/work/h/.claude/x/y.png', `${OWN}/options`)).toBe(false)
  expect(await removeFiles(o, ['/work/h/.claude/cockpit/checkpoints/s/1.txt', '/'])).toBe(false)
  expect(await removeEmptyDir(o, '/work')).toBe(false)
  expect(calls).toEqual([])
})

test('on Windows no POSIX program ever runs: a POSIX-shaped remove is refused, reads answer from the file calls or leave the file out', async () => {
  const calls: string[][] = []
  const run = runWith(calls, () => ({ exitCode: 0, stdout: '' }))
  const own = 'C:\\Users\\me\\.claude\\cockpit\\eyes'
  const o: Ops = { run, plat: WIN }
  expect(await removeTree(o, `${OWN}/profile-1`, OWN)).toBe(false)
  expect(await removeFile(o, `${OWN}/a.png`)).toBe(false)
  expect(await removeFiles(o, [`${OWN}/a.txt`])).toBe(false)
  expect(await removeEmptyDir(o, `${OWN}/s`)).toBe(false)
  expect(await listNames(o, '/work/p')).toBe(undefined)
  expect((await fileSizes(o, ['/work/a'])).size).toBe(0)
  expect((await fileHashes(o, ['/work/a'])).size).toBe(0)
  const o2: Ops = { run }
  expect(calls).toEqual([])
  // ...and a change with a drive-letter path goes to PowerShell, never to a POSIX program.
  expect(await removeTree(o2, `${own}\\profile-1`, own)).toBe(true)
  expect(await removeFiles(o2, ['C:\\Users\\me\\.claude\\cockpit\\checkpoints\\s\\1.txt'])).toBe(true)
  expect(await removeEmptyDir(o2, 'C:/Users/me/.claude/cockpit/checkpoints/s')).toBe(true)
  expect(await makeDir(o2, 'C:\\Users\\me\\x')).toBe(true)
  expect(await moveFile(o2, 'C:\\a\\b', 'C:\\a\\c')).toBe(true)
  expect(calls.length).toBe(5)
  for (const argv of calls) expect(argv.slice(0, 4)).toEqual([...WIN_FS_PROGRAM])
})

type Call = { argv: string[]; init: { cwd?: string; env?: Record<string, string>; stdin?: string; timeoutMs?: number } | undefined }
const runFull = (calls: Call[], exitCode = 0): Run =>
  (async (argv: readonly string[], init?: Call['init']) => {
    calls.push({ argv: [...argv], init })
    return { exitCode, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
  }) as never
const WOWN = 'C:\\Users\\me\\.claude\\cockpit\\eyes'
const ps = (op: WinFsOp): string[] => [...WIN_FS_PROGRAM, WIN_FS_SCRIPT[op]]
const vars = (...paths: string[]): Record<string, string> => Object.fromEntries([['COCKPIT_FS_N', String(paths.length)], ...paths.map((p, k) => [`COCKPIT_FS_${k}`, p])])

test('on Windows each change runs ONE fixed PowerShell script; the paths travel only in the variables', async () => {
  const calls: Call[] = []
  const o: Ops = { run: runFull(calls), plat: WIN }
  const cp = 'C:\\Users\\me\\.claude\\cockpit\\checkpoints\\s'
  expect(await makeDir(o, `${WOWN}\\profile-1`)).toBe(true)
  expect(await moveFile(o, 'C:\\t\\a.png', `${WOWN}\\b.png`)).toBe(true)
  expect(await removeTree(o, `${WOWN}\\profile-1`, WOWN)).toBe(true)
  expect(await removeFile(o, `${WOWN}\\options\\o-1.png`)).toBe(true)
  expect(await removeFile(o, `${WOWN}\\options\\o-2.png`, `${WOWN}\\options`)).toBe(true)
  expect(await removeFiles(o, [`${cp}\\1.txt`, `${cp}\\2.txt`])).toBe(true)
  expect(await removeEmptyDir(o, cp)).toBe(true)
  expect(calls.map(c => c.argv)).toEqual([ps('mkdir'), ps('move'), ps('rmtree'), ps('rmfiles'), ps('rmfiles'), ps('rmfiles'), ps('rmdir')])
  expect(calls.map(c => c.init?.env)).toEqual([
    vars(`${WOWN}\\profile-1`),
    vars('C:\\t\\a.png', `${WOWN}\\b.png`),
    vars(`${WOWN}\\profile-1`),
    vars(`${WOWN}\\options\\o-1.png`),
    vars(`${WOWN}\\options\\o-2.png`),
    vars(`${cp}\\1.txt`, `${cp}\\2.txt`),
    vars(cp),
  ])
  for (const c of calls) {
    expect(c.init?.cwd).toBe(undefined)
    expect(c.init?.stdin).toBe(undefined)
    expect((c.init?.timeoutMs ?? 0) >= 15_000).toBe(true)
  }
  // A failing script or a PowerShell that cannot start is a clean false.
  expect(await makeDir({ run: runFull([], 1), plat: WIN }, `${WOWN}\\x`)).toBe(false)
  const reject: Run = (async () => Promise.reject(new Error('ENOENT powershell.exe'))) as never
  expect(await removeTree({ run: reject, plat: WIN }, `${WOWN}\\p`, WOWN)).toBe(false)
})

test('a path full of quotes, backticks, $ signs, brackets and letters outside ASCII never reaches the script text', async () => {
  const calls: Call[] = []
  const o: Ops = { run: runFull(calls), plat: WIN }
  const odd = `${WOWN}\\odd 'q' \`b\` $HOME $(New-Item PWNED) [x] ;Remove-Item x; ÅÄÖ 日本`
  expect(await makeDir(o, odd)).toBe(true)
  expect(await moveFile(o, `${odd}\\a [1].png`, `${odd}\\b'$x.png`)).toBe(true)
  expect(await removeTree(o, odd, WOWN)).toBe(true)
  expect(calls.map(c => c.argv)).toEqual([ps('mkdir'), ps('move'), ps('rmtree')])
  for (const c of calls) for (const a of c.argv) expect(a.includes('PWNED') || a.includes('日本')).toBe(false)
  expect(calls[1]?.init?.env).toEqual(vars(`${odd}\\a [1].png`, `${odd}\\b'$x.png`))
  // A path that cannot travel in a variable (empty, a control character) runs nothing.
  expect(winFsCall('mkdir', [''])).toBe(undefined)
  expect(winFsCall('rmfiles', [`${WOWN}\\a\nb`])).toBe(undefined)
  expect(winFsCall('rmfiles', [])).toBe(undefined)
})

test('the Windows scripts are fixed: -LiteralPath only, -Recurse only in the tree remove, no double quote, no path', () => {
  for (const [op, s] of Object.entries(WIN_FS_SCRIPT)) {
    expect(s.includes('"'), op).toBe(false)
    expect(/\s-Path\b/.test(s), op).toBe(false)
    expect(s.includes('-Recurse'), op).toBe(op === 'rmtree')
    expect(s.startsWith("$ErrorActionPreference='Stop';"), op).toBe(true)
    expect(/[A-Za-z]:\\|\\\\/.test(s), op).toBe(false)
    for (const m of s.matchAll(/(Remove-Item|Move-Item|Copy-Item|Test-Path|Get-Item)\s+(-\w+)/g)) expect(m[2], `${op}: ${m[1]}`).toBe('-LiteralPath')
  }
  expect(WIN_FS_PROGRAM).toEqual(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command'])
})

test('the tree remove and the empty-folder remove refuse a junction or symlink as the folder named, before anything is removed', () => {
  expect(WIN_FS_NOT_A_LINK).toBe("$i=Get-Item -LiteralPath $env:COCKPIT_FS_0 -Force;if($i.Attributes -band [System.IO.FileAttributes]::ReparsePoint){exit 1};")
  for (const op of ['rmtree', 'rmdir'] as const) {
    const s = WIN_FS_SCRIPT[op]
    const at = s.indexOf(WIN_FS_NOT_A_LINK)
    expect(at > 0, op).toBe(true)
    expect(at < s.indexOf(op === 'rmtree' ? 'Remove-Item' : '::Delete('), op).toBe(true)
  }
  expect(WIN_FS_SCRIPT.rmtree).toBe(
    "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';if(-not(Test-Path -LiteralPath $env:COCKPIT_FS_0)){exit 0};" +
      `${WIN_FS_NOT_A_LINK}Remove-Item -LiteralPath $env:COCKPIT_FS_0 -Recurse -Force`,
  )
  expect(Object.entries(WIN_FS_SCRIPT).filter(([, s]) => s.includes('-Recurse')).map(([op]) => op)).toEqual(['rmtree'])
})

test('on Windows a remove the guard refuses runs NO program: roots, home, shares, device paths, relative, .. and outside its folder', async () => {
  const refused = ['C:\\', 'D:\\', 'C:', 'C:/', 'C:\\Users\\someone', 'C:\\Users\\someone\\', '\\\\server\\share', '\\\\server\\share\\a\\b\\c', '\\\\?\\C:\\', '\\\\?\\C:\\a\\b\\c',
    'a\\b\\c', 'a/b/c', '.\\a\\b\\c', `${WOWN}\\..\\..\\..\\x`, `${WOWN}\\p\\..\\..\\..`, 'C:\\Windows\\System32\\x\\..', '']
  for (const plat of [WIN, undefined]) {
    const calls: Call[] = []
    const o: Ops = plat === undefined ? { run: runFull(calls) } : { run: runFull(calls), plat }
    for (const p of refused) {
      expect(await removeTree(o, p, WOWN), `tree ${p}`).toBe(false)
      expect(await removeFile(o, p), `file ${p}`).toBe(false)
      expect(await removeFile(o, p, WOWN), `file in ${p}`).toBe(false)
      expect(await removeFiles(o, [`${WOWN}\\ok.txt`, p]), `files ${p}`).toBe(false)
      expect(await removeEmptyDir(o, p), `dir ${p}`).toBe(false)
    }
    expect(await removeTree(o, 'C:\\Users\\me\\Documents\\work', WOWN)).toBe(false)
    expect(await removeTree(o, WOWN, WOWN)).toBe(false)
    expect(await removeTree(o, `${WOWN}\\`, WOWN)).toBe(false)
    expect(await removeTree(o, `D:${WOWN.slice(2)}\\p`, WOWN)).toBe(false)
    expect(await removeTree(o, `${WOWN}X\\p`, WOWN)).toBe(false)
    expect(await removeTree(o, `${WOWN}\\p`, 'C:\\')).toBe(false)
    expect(await removeTree(o, `${WOWN}\\p`, 'C:\\Users\\someone')).toBe(false)
    expect(await removeFile(o, 'C:\\Users\\me\\.claude\\x\\y.png', `${WOWN}\\options`)).toBe(false)
    expect(calls, plat === undefined ? 'no system bound' : 'win32').toEqual([])
  }
})

test('on the Mac a change passes only a timeout to run: no variables, no PowerShell', async () => {
  const calls: Call[] = []
  const o: Ops = { run: runFull(calls), plat: POSIX }
  await makeDir(o, '/work/new')
  await removeTree(o, `${OWN}/profile-1-1`, OWN)
  await removeFiles(o, ['/work/h/.claude/cockpit/checkpoints/s/1.txt'], 7_000)
  expect(calls.map(c => c.init)).toEqual([{ timeoutMs: 5_000 }, { timeoutMs: 5_000 }, { timeoutMs: 7_000 }])
  expect(calls.map(c => c.argv[0])).toEqual(['mkdir', 'rm', 'rm'])
})

test('on Windows the file calls answer: sizes, names, pictures and folders, with a failing call left out', async () => {
  const calls: string[][] = []
  const run = runWith(calls, () => ({ exitCode: 0, stdout: '' }))
  const disk: Record<string, Node> = {
    'C:/work/p': { kind: 'dir', size: 0 },
    'C:/work/p/dist': { kind: 'dir', size: 0 },
    'C:/work/p/dist/a.js': { kind: 'file', size: 2000 },
    'C:/work/p/a.png': { kind: 'file', size: 120 },
  }
  const fs = fakeFs(disk, { 'C:/work/p/a.png': toBase64(HEADER) })
  const o: Ops = { run, fs, plat: WIN }
  expect([...(await fileSizes(o, ['C:/work/p/a.png', 'C:/work/p/none.png'])).entries()]).toEqual([['C:/work/p/a.png', 120]])
  expect(await listNames(o, 'C:/work/p')).toEqual(['dist', 'a.png'])
  // A call that fails for another reason: left out on Windows, never a program.
  const broken: FsApi = { ...fs, stat: async () => Promise.reject(new Error('EACCES')), list: async () => Promise.reject(new Error('EACCES')), readBytes: async () => Promise.reject(new Error('over 4 MiB')) }
  const ob: Ops = { run, fs: broken, plat: WIN }
  expect((await fileSizes(ob, ['C:/work/p/a.png'])).size).toBe(0)
  expect(await listNames(ob, 'C:/work/p')).toBe(undefined)
  expect((await fileHashes(ob, ['C:/work/p/a.png'])).size).toBe(0)
  expect(calls).toEqual([])
})

const ABC_SHA = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

test('SHA-256 is worked out in the plugin from the bytes; shasum only on the Mac for what the file call cannot read', async () => {
  expect(await sha256Hex(bytesFromBase64('YWJj'))).toBe(ABC_SHA)
  const calls: string[][] = []
  const run = runWith(calls, argv => ({ exitCode: 0, stdout: `${'0'.repeat(64)}  ${argv[4]}\n` }))
  const fs = fakeFs({}, { '/work/a.png': 'YWJj', 'C:/work/a.png': 'YWJj' })
  expect([...(await fileHashes({ run, fs }, ['/work/a.png', '/work/none.png'])).entries()]).toEqual([['/work/a.png', ABC_SHA]])
  expect(calls).toEqual([])
  expect((await fileHashes({ run, fs, plat: WIN }, ['C:/work/a.png'])).get('C:/work/a.png')).toBe(ABC_SHA)
  expect(calls).toEqual([])
  expect((await fileHashes({ run }, ['/work/b.png'])).get('/work/b.png')).toBe('0'.repeat(64))
  const broken: FsApi = { ...fs, readBytes: async () => Promise.reject(new Error('over 4 MiB')) }
  expect((await fileHashes({ run, fs: broken, plat: POSIX }, ['/work/c.png'])).get('/work/c.png')).toBe('0'.repeat(64))
  expect(calls).toEqual([['shasum', '-a', '256', '--', '/work/b.png'], ['shasum', '-a', '256', '--', '/work/c.png']])
})
