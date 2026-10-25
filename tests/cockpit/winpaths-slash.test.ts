// Every path test that assumed a leading "/".
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { below, fileName, isAbsolute, parentDir, samePath, strictlyInside, under, walkUp } from '../hooks/core/platform'
import { samePlace } from '../hooks/core/neighbors'
import { copyPath, gitChanged, isCopyFile } from '../hooks/core/undo'
import { agentFilePaths } from '../hooks/core/route'
import { agentPath } from '../hooks/core/starters'
import { desired } from '../hooks/core/setupcard'
import { briefPath } from '../hooks/core/autosafe'
import { relativePath } from '../hooks/core/crew'
import { relativeTo } from '../hooks/core/continuity'
import { sameArea } from '../hooks/core/proof2'
import { isPath } from '../hooks/core/crew3'
import { repoRoot } from '../hooks/core/prcard'
import { eyesDir, isOwnProfile, profilePath } from '../hooks/core/eyes'
import { folderOf as runFolder } from '../hooks/core/orchestra'
import type { Io } from '../hooks/core/io'

const WIN = ['C:\\work\\app', 'C:/work/app', 'c:\\work/app']

test('isAbsolute: "/x", "C:\\x", "C:/x" and a share are full paths; a name, "C:x" and "" are not', () => {
  for (const p of ['/work/app', 'C:\\work', 'C:/work', 'c:/work', '\\\\srv\\share']) expect(isAbsolute(p), p).toBe(true)
  for (const p of ['work/app', 'C:work', '', '.\\x']) expect(isAbsolute(p), p).toBe(false)
})

test('under: Mac join as before; empty base gives "/rel"; Windows keeps the base style', () => {
  expect(under('/home/me', '.claude/agents')).toBe('/home/me/.claude/agents')
  expect(under('/home/me/', 'CLAUDE.md')).toBe('/home/me/CLAUDE.md')
  expect(under('/', 'CLAUDE.md')).toBe('/CLAUDE.md')
  expect(under('', '.claude/x')).toBe('/.claude/x')
  expect(under('C:\\work\\app', '.claude/agents', 'a.md')).toBe('C:\\work\\app\\.claude\\agents\\a.md')
  expect(under('C:\\work\\', 'CLAUDE.md')).toBe('C:\\work\\CLAUDE.md')
  expect(under('C:/work/app', 'CLAUDE.md')).toBe('C:\\work\\app\\CLAUDE.md')
})

test('samePath, parentDir, fileName, below, strictlyInside: Mac as the old string tests, Windows either slash and any letter case', () => {
  expect(samePath('/w/a/', '/w/a')).toBe(true)
  expect(samePath('/w/a', '/w/b')).toBe(false)
  expect(samePath('C:/work/app', 'C:\\work\\app')).toBe(true)
  expect(samePath('c:\\Work\\App\\', 'C:/work/app')).toBe(true)
  expect(samePath('C:\\work\\app', 'C:\\work\\app2')).toBe(false)
  expect(parentDir('/a/b/c')).toBe('/a/b')
  expect(parentDir('/a')).toBe('')
  expect(parentDir('abc')).toBe('')
  expect(parentDir('C:\\work\\app')).toBe('C:\\work')
  expect(parentDir('C:/work/app')).toBe('C:/work')
  expect(parentDir('C:\\work')).toBe('C:\\')
  expect(fileName('/a/b/c.png')).toBe('c.png')
  expect(fileName('/a/b/')).toBe('')
  expect(fileName('C:\\a\\b\\c.png')).toBe('c.png')
  expect(fileName('C:/a/b/c.png')).toBe('c.png')
  expect(below('/w/app', '/w/app/src/a.ts')).toBe('src/a.ts')
  expect(below('/w/app', '/w/app')).toBe('/w/app')
  expect(below('/w/app', '/w/apple/a.ts')).toBe('/w/apple/a.ts')
  expect(below('C:\\work\\app', 'C:\\work\\app\\src\\a.ts')).toBe('src\\a.ts')
  expect(below('C:\\work\\app', 'c:/work/app/src/a.ts')).toBe('src\\a.ts')
  expect(below('C:\\work\\app', 'C:\\work\\apple\\a.ts')).toBe('C:\\work\\apple\\a.ts')
  expect(strictlyInside('/w', '/w/a')).toBe(true)
  expect(strictlyInside('/w', '/w')).toBe(false)
  expect(strictlyInside('C:\\w', 'C:/w/a')).toBe(true)
  expect(strictlyInside('C:\\w', 'C:\\w')).toBe(false)
})

test('walkUp (row 7): Mac walk is the old one; Windows walks real parents and stops at the drive root', () => {
  expect(walkUp('/w/app/src', '/w/app')).toEqual(['/w/app/src', '/w/app'])
  expect(walkUp('/w/app/src', '')).toEqual(['/w/app/src', '/w/app', '/w'])
  expect(walkUp('/', '/')).toEqual([])
  expect(walkUp('', '')).toEqual([])
  expect(walkUp('C:\\work\\app\\src', 'C:\\work\\app')).toEqual(['C:\\work\\app\\src', 'C:\\work\\app'])
  expect(walkUp('C:/work/app/src', 'c:\\work\\app')).toEqual(['C:/work/app/src', 'C:/work/app'])
  expect(walkUp('C:\\work\\app', '')).toEqual(['C:\\work\\app', 'C:\\work'])
  expect(walkUp('C:\\work\\app\\src', 'D:\\other')).toEqual(['C:\\work\\app\\src', 'C:\\work\\app', 'C:\\work'])
})

test('samePlace (row 4): a Windows top folder from git matches the session folder in either style', () => {
  expect(samePlace({ cwd: '/w/a/' }, { cwd: '/w/a' })).toBe(true)
  expect(samePlace({ cwd: '/w/a/x', top: '/w/a' }, { cwd: '/w/a/y', top: '/w/a/' })).toBe(true)
  expect(samePlace({ cwd: '/w/a/x', top: '/w/a' }, { cwd: '/w/b/y', top: '/w/b' })).toBe(false)
  expect(samePlace({ cwd: 'C:\\work\\app\\x', top: 'C:/work/app' }, { cwd: 'C:\\work\\app\\y', top: 'C:/work/app' })).toBe(true)
  expect(samePlace({ cwd: 'C:\\work\\app', top: undefined }, { cwd: 'c:/work/app' })).toBe(true)
  expect(samePlace({ cwd: 'C:\\work\\app\\x', top: 'C:/work/app' }, { cwd: 'C:\\work\\other\\y', top: 'C:/work/other' })).toBe(false)
})

const runOf = (top: string, names: string): Io['run'] =>
  (async (argv: string[]) => ({ exitCode: argv.includes('rev-parse') ? (top === '' ? 128 : 0) : 0, stdout: argv.includes('rev-parse') ? top : names, stderr: '', isStdoutTruncated: false, isStderrTruncated: false })) as never

test('gitChanged (row 5): Mac root as before; a Windows top folder is accepted; a relative answer is refused', async () => {
  const io = (top: string, names: string): Io => ({ run: runOf(top, names) }) as never
  expect((await gitChanged(io('/w/app\n', 'a.ts\0src/b.ts\0'), '/w/app')).map(t => t.path)).toEqual(['/w/app/a.ts', '/w/app/src/b.ts'])
  expect((await gitChanged(io('C:/work/app\n', 'a.ts\0src/b.ts\0'), 'C:\\work\\app')).map(t => t.path)).toEqual(['C:\\work\\app\\a.ts', 'C:\\work\\app\\src\\b.ts'])
  expect((await gitChanged(io('C:\\work\\app\r\n', 'a.ts\0'), 'C:\\work\\app')).map(t => t.path)).toEqual(['C:\\work\\app\\a.ts'])
  expect(await gitChanged(io('work/app\n', 'a.ts\0'), 'work/app')).toEqual([])
  expect(await gitChanged(io('C:/work/app\n', '../out.ts\0'), 'C:\\work\\app')).toEqual([])
})

test('copyPath and isCopyFile (row 6): Mac exactly as before; Windows accepts only a copy file inside vaken checkpoint folder', () => {
  const H = '/home/me'
  expect(copyPath(H, 'session-a', 3)).toBe('/home/me/.claude/cockpit/checkpoints/session-a/3.txt')
  expect(isCopyFile(H, copyPath(H, 'session-a', 3))).toBe(true)
  for (const p of ['/home/me/.claude/cockpit/checkpoints/session-a/0.txt', '/home/me/.claude/cockpit/checkpoints/a/b/1.txt', '/home/me/.claude/cockpit/checkpoints/../x/1.txt', '/home/me/.claude/cockpit//checkpoints/s/1.txt', '/home/me/other/s/1.txt', '/home/me/.claude/cockpit/checkpoints/s/1.md', '/etc/passwd'])
    expect(isCopyFile(H, p), p).toBe(false)
  expect(isCopyFile('', '/x/.claude/cockpit/checkpoints/s/1.txt')).toBe(false)
  expect(isCopyFile('relative', 'relative/.claude/cockpit/checkpoints/s/1.txt')).toBe(false)

  const W = 'C:\\Users\\me'
  expect(copyPath(W, 'session-a', 3)).toBe('C:\\Users\\me\\.claude\\cockpit\\checkpoints\\session-a\\3.txt')
  expect(isCopyFile(W, copyPath(W, 'session-a', 3))).toBe(true)
  expect(isCopyFile('C:/Users/me', copyPath('C:/Users/me', 's', 12))).toBe(true)
  expect(isCopyFile(W, 'c:/users/me/.claude/cockpit/checkpoints/s/1.txt')).toBe(true)
  for (const p of [
    'C:\\Users\\me\\.claude\\cockpit\\checkpoints\\s\\0.txt',
    'C:\\Users\\me\\.claude\\cockpit\\checkpoints\\s\\1.md',
    'C:\\Users\\me\\.claude\\cockpit\\checkpoints\\a\\b\\1.txt',
    'C:\\Users\\me\\.claude\\cockpit\\checkpoints\\1.txt',
    'C:\\Users\\me\\.claude\\cockpit\\checkpoints\\..\\x\\1.txt',
    'C:\\Users\\me\\.claude\\cockpit\\checkpoints\\.\\s\\1.txt',
    'C:\\Users\\me\\.claude\\cockpit\\\\checkpoints\\s\\1.txt',
    'C:\\Users\\me\\.claude\\cockpit\\checkpoints\\s\\1.txt\\',
    'C:\\Users\\me\\.claude\\cockpit\\checkpoints\\s:x\\1.txt',
    'C:\\Users\\me\\Documents\\s\\1.txt',
    'C:\\Users\\other\\.claude\\cockpit\\checkpoints\\s\\1.txt',
    'D:\\Users\\me\\.claude\\cockpit\\checkpoints\\s\\1.txt',
    'C:\\Windows\\system32\\drivers\\etc\\hosts',
  ])
    expect(isCopyFile(W, p), p).toBe(false)
  expect(isCopyFile('C:work', 'C:work\\.claude\\cockpit\\checkpoints\\s\\1.txt')).toBe(false)
})

test('agent and settings file paths (row 8): Mac as before; Windows joins in the home style', () => {
  expect(agentFilePaths('helper', '/home/me/', ['/w/app/'])).toEqual(['/home/me/.claude/agents/helper.md', '/w/app/.claude/agents/helper.md'])
  expect(agentFilePaths('helper', '', ['/w/app'])).toEqual(['/w/app/.claude/agents/helper.md'])
  expect(agentFilePaths('helper', 'C:\\Users\\me', ['C:\\work\\app\\'])).toEqual(['C:\\Users\\me\\.claude\\agents\\helper.md', 'C:\\work\\app\\.claude\\agents\\helper.md'])
  expect(agentPath('/home/me', 'a')).toBe('/home/me/.claude/agents/a.md')
  expect(agentPath('C:\\Users\\me', 'a')).toBe('C:\\Users\\me\\.claude\\agents\\a.md')
  expect(briefPath('/home/me/', 'abc')).toMatch(/^\/home\/me\/\.claude\/cockpit\/briefs\//)
  expect(briefPath('C:\\Users\\me', 'abc')).toMatch(/^C:\\Users\\me\\\.claude\\cockpit\\briefs\\/)
  const posix = desired({}, '/home/me', '/w/app/', 'project').map(d => d.path)
  expect(posix.at(-1)).toBe('/w/app/CLAUDE.md')
  expect(posix.every(p => p.startsWith('/w/app/'))).toBe(true)
  const win = desired({}, 'C:\\Users\\me', 'C:\\work\\app\\', 'project').map(d => d.path)
  expect(win.at(-1)).toBe('C:\\work\\app\\CLAUDE.md')
  expect(win.slice(0, -1).every(p => p.startsWith('C:\\work\\app\\.claude\\agents\\'))).toBe(true)
  expect(runFolder('/w/app/', { id: 'r1' } as never, { n: 2 } as never).path).toBe('/w/app/.claude/worktrees/run-r1-2')
  expect(runFolder('C:\\work\\app\\', { id: 'r1' } as never, { n: 2 } as never).path).toBe('C:\\work\\app\\.claude\\worktrees\\run-r1-2')
  expect(eyesDir('/w/app')).toBe('/w/app/.claude/cockpit-eyes')
})

test('isOwnProfile and profilePath (row 8): the delete guard keeps its meaning on the Mac and on Windows', () => {
  const H = '/home/me'
  expect(profilePath(H, 5, 1)).toBe('/home/me/.claude/cockpit/eyes/profile-5-1')
  expect(isOwnProfile(H, profilePath(H, 5, 1))).toBe(true)
  for (const p of ['/home/me/.claude/cockpit/eyes/other', '/home/me/.claude/cockpit/eyes/profile-1/../x', '/home/me', '/etc/profile-1', '/home/me/.claude/cockpit/eyes/profile-1 x'])
    expect(isOwnProfile(H, p), p).toBe(false)
  expect(isOwnProfile('', '/x/.claude/cockpit/eyes/profile-1')).toBe(false)
  const W = 'C:\\Users\\me'
  expect(isOwnProfile(W, profilePath(W, 5, 1))).toBe(true)
  expect(isOwnProfile(W, 'c:/users/me/.claude/cockpit/eyes/profile-5-1')).toBe(true)
  for (const p of ['C:\\Users\\me\\.claude\\cockpit\\eyes\\other', 'C:\\Users\\me\\.claude\\cockpit\\eyes\\profile-1\\..\\x', 'C:\\Users\\me', 'C:\\Users\\you\\.claude\\cockpit\\eyes\\profile-1', 'C:\\Users\\me\\.claude\\cockpit\\eyes\\profile-1 x'])
    expect(isOwnProfile(W, p), p).toBe(false)
})

test('relative names (row 9): Mac as before; Windows paths become relative in either slash', () => {
  expect(relativePath('/w/app/', '/w/app/src/a.ts')).toBe('src/a.ts')
  expect(relativePath('/w/app', './src/a.ts')).toBe('src/a.ts')
  expect(relativePath('/w/app', '/w/apple/a.ts')).toBe('/w/apple/a.ts')
  for (const root of WIN) expect(relativePath(root, 'C:\\work\\app\\src\\a.ts'), root).toBe('src\\a.ts')
  expect(relativePath('C:\\work\\app', 'C:/work/app/a.ts')).toBe('a.ts')
  expect(relativeTo('/w/app', '/w/app/src/a.ts')).toBe('src/a.ts')
  expect(relativeTo('', '/w/app/a.ts')).toBe('/w/app/a.ts')
  expect(relativeTo('/w/app', '/w/apple/a.ts')).toBe('/w/apple/a.ts')
  for (const root of WIN) expect(relativeTo(root, 'C:\\work\\app\\src\\a.ts'), root).toBe('src\\a.ts')
  expect(relativeTo('C:\\work\\app', 'D:\\work\\app\\a.ts')).toBe('D:\\work\\app\\a.ts')
})

test('sameArea, isPath, repoRoot (row 9): Mac as before; Windows folders compare by parts', () => {
  expect(sameArea('/w/a', '/w/a/src')).toBe(true)
  expect(sameArea('/w/a/src', '/w/a')).toBe(true)
  expect(sameArea('/w/a/x', '/w/a/y')).toBe(true)
  expect(sameArea('/w/a/x', '/w/b/y')).toBe(false)
  expect(sameArea('C:\\w\\a', 'C:\\w\\a\\src')).toBe(true)
  expect(sameArea('C:\\w\\a\\src', 'C:/w/a')).toBe(true)
  expect(sameArea('C:\\w\\a\\x', 'C:\\w\\b\\y')).toBe(false)
  expect(isPath('/w/a/x', '/w/a')).toBe(true)
  expect(isPath('/w/a', '/w/a')).toBe(true)
  expect(isPath('/w/ab', '/w/a')).toBe(false)
  expect(isPath('/w/a/x', '/w/a/')).toBe(true)
  expect(isPath('C:\\work\\app\\x', 'C:\\work\\app')).toBe(true)
  expect(isPath('C:\\work\\app', 'C:/work/app')).toBe(true)
  expect(isPath('c:\\work\\app\\x', 'C:/work/app/')).toBe(true)
  expect(isPath('C:\\work\\apple', 'C:\\work\\app')).toBe(false)
  expect(isPath('C:\\work\\app', '')).toBe(false)
  expect(repoRoot('/w/app/.git')).toBe('/w/app')
  expect(repoRoot('/w/app/.git/')).toBe('/w/app')
  expect(repoRoot('C:\\work\\app\\.git')).toBe('C:\\work\\app')
  expect(repoRoot('C:/work/app/.git')).toBe('C:/work/app')
})
