// core/chrome.ts: which browser, how it is run, its processes, and the Windows forms of the profile check and the file addresses.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { bindChrome, chromeCandidates, findChrome, psArgvOf, runChrome, sleepArgvOf } from '../hooks/core/chrome'
import { CHROME, SHOT_MARK, isOwnProfile, pidsOfProfile, profilePath, shotArgs, wrapArgv, wrapLimitMs, parseHashes, parseSizes } from '../hooks/core/eyes'
import { parseListeners, parseLsof } from '../hooks/core/eyesdev'
import { bindPlatform } from '../hooks/core/procs'
import type { Io } from '../hooks/core/io'

type Run = Io['run']
const res = (exitCode: number, stdout = '', stderr = '') => ({ exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false })

function fake(win: boolean, existing: string[], answer: (argv: readonly string[]) => ReturnType<typeof res> | 'throw' = () => res(0)) {
  const calls: string[][] = []
  const writes: Array<[string, string]> = []
  const io = {
    run: (async (argv: readonly string[]) => {
      calls.push([...argv])
      const a = answer(argv)
      if (a === 'throw') throw new Error('timeout')
      return a
    }) as unknown as Run,
    write: async (path: string, text: string) => {
      writes.push([path, text])
    },
  }
  bindPlatform(io, async () => (win ? 'Windows_NT' : undefined))
  bindChrome(io, {
    exists: async p => existing.includes(p),
    env: async () => ({ programFiles: 'C:\\Program Files', programFilesX86: 'C:\\Program Files (x86)', localAppData: 'C:\\Users\\me\\AppData\\Local' }),
  })
  return { io, calls, writes }
}

const WIN_ENV = { programFiles: 'C:\\Program Files', programFilesX86: 'C:\\Program Files (x86)', localAppData: 'C:\\Users\\me\\AppData\\Local' }
const CH = 'Google\\Chrome\\Application\\chrome.exe'
const ED = 'Microsoft\\Edge\\Application\\msedge.exe'

test('candidates: the Mac keeps its one path; Windows is Chrome in three places, then Edge', () => {
  expect(chromeCandidates('posix')).toEqual(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'])
  expect(chromeCandidates('win32', WIN_ENV)).toEqual([
    `C:\\Program Files\\${CH}`, `C:\\Program Files (x86)\\${CH}`, `C:\\Users\\me\\AppData\\Local\\${CH}`, `C:\\Program Files (x86)\\${ED}`, `C:\\Program Files\\${ED}`,
  ])
  expect(chromeCandidates('win32', {})).toEqual([])
})

test('find: Mac asks test -x; Windows takes Chrome, else Edge, else nothing', async () => {
  const mac = fake(false, [])
  expect(await findChrome(mac.io)).toBe(CHROME)
  expect(mac.calls).toEqual([['test', '-x', CHROME]])
  const none = fake(false, [], () => res(1))
  expect(await findChrome(none.io)).toBeUndefined()
  const edge = fake(true, [`C:\\Program Files (x86)\\${ED}`])
  expect(await findChrome(edge.io)).toBe(`C:\\Program Files (x86)\\${ED}`)
  const both = fake(true, [`C:\\Program Files (x86)\\${ED}`, `C:\\Users\\me\\AppData\\Local\\${CH}`])
  expect(await findChrome(both.io)).toBe(`C:\\Users\\me\\AppData\\Local\\${CH}`)
  expect(await findChrome(fake(true, []).io)).toBeUndefined()
  expect(edge.calls).toEqual([])
})

test('run on the Mac: the very same sh wrapper argv as before', async () => {
  const m = fake(false, [])
  const args = shotArgs('/h/p', '/h/p/shot.png', 390, 'http://localhost:5173/')
  expect(await runChrome(m.io, '/h/p', 'run.out', SHOT_MARK, 80, args)).toBe(true)
  expect(m.calls).toEqual([wrapArgv('/h/p/run.out', SHOT_MARK, 80, args)])
  expect(m.calls[0]?.[0]).toBe('sh')
  expect(m.calls[0]?.[7]).toBe(CHROME)
  expect(m.writes).toEqual([])
  expect(wrapLimitMs(80)).toBe(28_000)
})

test('run on Windows: the browser directly, its output written next to the profile, no sh', async () => {
  const exe = `C:\\Program Files\\${CH}`
  const m = fake(true, [exe], argv => (argv[0] === exe ? res(0, '<html></html>', 'noise') : res(1)))
  const args = shotArgs('C:/h/p', 'C:/h/p/shot.png', 768, 'http://localhost:5173/')
  expect(await runChrome(m.io, 'C:/h/p', 'dump.out', 'x', 80, args)).toBe(true)
  expect(m.calls).toEqual([[exe, ...args]])
  expect(m.writes).toEqual([['C:/h/p/dump.out', '<html></html>'], ['C:/h/p/dump.out.err', 'noise']])
  const gone = fake(true, [])
  expect(await runChrome(gone.io, 'C:/h/p', 'run.out', 'x', 80, args)).toBe(false)
  expect(gone.calls).toEqual([])
  const slow = fake(true, [exe], () => 'throw')
  expect(await runChrome(slow.io, 'C:/h/p', 'run.out', 'x', 80, args)).toBe(false)
})

test('processes: ps on the Mac, a constant PowerShell line on Windows; ids of a Windows profile', () => {
  expect(psArgvOf('posix')).toEqual(['ps', '-axo', 'pid,command'])
  expect(sleepArgvOf('posix')).toEqual(['sleep', '1'])
  const w = psArgvOf('win32')
  expect(w[0]).toBe('powershell')
  expect(w.join(' ')).toMatch(/Win32_Process/)
  expect(w.join(' ')).not.toMatch(/taskkill|Stop-Process/)
  expect(sleepArgvOf('win32')[0]).toBe('powershell')
  const p = 'C:\\Users\\me/.claude/cockpit/eyes/profile-7-1'
  const list = [`4000 "C:\\x\\chrome.exe" --headless=new "--user-data-dir=${p}" --foo`, `4001 chrome.exe --user-data-dir=${p}\r`, `4002 chrome.exe --user-data-dir=${p}0 x`, '4003 chrome.exe --other'].join('\n')
  expect(pidsOfProfile(list, p, true)).toEqual([4000, 4001])
  expect(pidsOfProfile(`126340 "C:\\c\\chrome.exe" --type=gpu-process --user-data-dir="${p}" --no-pre-read-main-dll`, p, true)).toEqual([126340])
  expect(pidsOfProfile(`126341 chrome.exe --user-data-dir="${p}0" x`, p, true)).toEqual([])
  expect(pidsOfProfile(`126340 chrome.exe --user-data-dir="${p}"`, p)).toEqual([])
  expect(pidsOfProfile(list, p)).toEqual([4001])
  expect(pidsOfProfile(`4000 chrome --user-data-dir=${p}"`, p)).toEqual([])
})

test('own profile on Windows: same rule, inside our own folder, no escape', () => {
  const home = 'C:\\Users\\me'
  const p = profilePath(home, 7, 1)
  expect(isOwnProfile(home, p)).toBe(true)
  expect(isOwnProfile(home, p.replace(/\//g, '\\'))).toBe(true)
  expect(isOwnProfile(home, p.toUpperCase().replace('PROFILE', 'profile'))).toBe(true)
  expect(isOwnProfile(home, home)).toBe(false)
  expect(isOwnProfile(home, `${p}/../../..`)).toBe(false)
  expect(isOwnProfile(home, 'C:\\Users\\other/.claude/cockpit/eyes/profile-1')).toBe(false)
  expect(isOwnProfile(home, `${p} x`)).toBe(false)
  expect(isOwnProfile('', p)).toBe(false)
  expect(p.length).toBeLessThan(90)
  expect(isOwnProfile('/home/user', profilePath('/home/user', 7, 1))).toBe(true)
  expect(isOwnProfile('/home/user', 'C:\\Users\\me/.claude/cockpit/eyes/profile-1')).toBe(false)
})

test('Windows line ends (CRLF) parse like the Mac ones', () => {
  const hash = 'a'.repeat(64)
  expect([...parseHashes(`${hash}  C:/x/a.png\r\n`)]).toEqual([['C:/x/a.png', hash]])
  expect([...parseSizes('120 C:/x/a.png\r\n')]).toEqual([['C:/x/a.png', 120]])
  expect(parseListeners(0, 'COMMAND PID USER\r\nnode 42 me IPv4 0 0t0 TCP *:5173 (LISTEN)\r\n').get(5173)).toEqual({ command: 'node', pid: 42 })
  expect(parseLsof(0, 'COMMAND PID USER\r\nnode 42 me\r\n')).toEqual({ command: 'node', pid: 42 })
  expect([...parseHashes(`${hash}  /h/a.png\n`)]).toEqual([['/h/a.png', hash]])
})
