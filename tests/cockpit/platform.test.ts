// The pure path helpers, run for POSIX and Windows paths on any computer.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { detectStyle, homeDir, homeFrom, isInside, joinPath, lastName, lastPart, lines, parts, projectFolderName } from '../hooks/core/platform'
import { projectName } from '../hooks/core/projects'
import { groupOfRow } from '../hooks/core/sessionfacts'
import { compare } from '../hooks/core/compactdiff'
import { emptyTurn, happenedWords } from '../hooks/core/happened'
import { folderOf, shortName } from '../hooks/core/proof2risk'
import { failedWhat } from '../hooks/core/errors'
import { excludedPath } from '../hooks/core/undo'
import { resolveGitDir, sharedKind } from '../hooks/core/crew'
import { baseName, shortFolder, usableFolder } from '../hooks/core/crew3'
import { lastName as memLastName, mainProject, memorySpots, projectFolderName as memFolderName } from '../hooks/core/memory'
import { folderTag, nameOf } from '../hooks/features/home/logic'

test('detectStyle: drive letter or backslash means win32', () => {
  const cases: [string, string][] = [
    ['/work/proj', 'posix'],
    ['relative/dir', 'posix'],
    ['C:\\Users\\me\\proj', 'win32'],
    ['C:/Users/me/proj', 'win32'],
    ['\\\\server\\share', 'win32'],
    ['sub\\dir', 'win32'],
  ]
  for (const [p, s] of cases) expect(detectStyle(p)).toBe(s)
})

test('homeDir: HOME, else USERPROFILE, else HOMEDRIVE+HOMEPATH', () => {
  expect(homeDir({ HOME: '/work/me' })).toBe('/work/me')
  expect(homeDir({ HOME: '/work/me', USERPROFILE: 'C:\\Users\\me' })).toBe('/work/me')
  expect(homeDir({ USERPROFILE: 'C:\\Users\\me' })).toBe('C:\\Users\\me')
  expect(homeDir({ HOME: '', USERPROFILE: 'C:\\Users\\me' })).toBe('C:\\Users\\me')
  expect(homeDir({ HOMEDRIVE: 'C:', HOMEPATH: '\\Users\\me' })).toBe('C:\\Users\\me')
  expect(homeDir({ HOMEDRIVE: 'C:' })).toBe(undefined)
  expect(homeDir({})).toBe(undefined)
})

test('parts', () => {
  const cases: [string, string[]][] = [
    ['/work/proj', ['work', 'proj']],
    ['/work/proj/', ['work', 'proj']],
    ['/', []],
    ['C:\\Users\\me\\proj', ['C:', 'Users', 'me', 'proj']],
    ['C:/Users/me/proj', ['C:', 'Users', 'me', 'proj']],
    ['C:\\Users/me\\proj\\', ['C:', 'Users', 'me', 'proj']],
    ['\\\\server\\share\\dir', ['\\\\server', 'share', 'dir']],
    ['C:\\', ['C:']],
    ['/work/a/../b/./c', ['work', 'b', 'c']],
  ]
  for (const [p, want] of cases) expect(parts(p)).toEqual(want)
  expect(parts('a\\b', 'posix')).toEqual(['a\\b'])
})

test('lastName', () => {
  const cases: [string, string][] = [
    ['/work/proj', 'proj'],
    ['/work/proj///', 'proj'],
    ['C:\\Users\\me\\proj', 'proj'],
    ['C:\\Users\\me\\proj\\', 'proj'],
    ['C:/Users/me/proj/', 'proj'],
    ['\\\\server\\share', 'share'],
    ['/', '/'],
    ['proj', 'proj'],
  ]
  for (const [p, want] of cases) expect(lastName(p)).toBe(want)
})

test('isInside', () => {
  const cases: [string, string, boolean][] = [
    ['/work/proj', '/work/proj/src/a.ts', true],
    ['/work/proj', '/work/proj', true],
    ['/work/proj/', '/work/proj', true],
    ['/work/proj', '/work/project', false],
    ['/work/proj', '/work', false],
    ['/work/proj', '/work/proj/../other', false],
    ['/work/proj', '/Work/proj/a', false],
    ['C:\\Users\\me\\proj', 'C:\\Users\\me\\proj\\src\\a.ts', true],
    ['C:\\Users\\me\\proj', 'C:/Users/me/proj/src', true],
    ['C:\\Users\\me\\proj', 'c:\\users\\ME\\Proj\\x', true],
    ['C:\\Users\\me\\proj', 'C:\\Users\\me\\project', false],
    ['C:\\Users\\me\\proj', 'D:\\Users\\me\\proj', false],
    ['C:\\Users\\me\\proj\\', 'C:\\Users\\me\\proj', true],
    ['C:\\Users\\me\\proj', 'C:\\Users\\me\\proj\\..\\other', false],
    ['\\\\server\\share', '\\\\server\\share\\dir', true],
    ['\\\\server\\share', '\\\\other\\share\\dir', false],
    ['\\\\SERVER\\share', '//server/share/dir', true],
  ]
  for (const [a, b, want] of cases) expect(isInside(a, b)).toBe(want)
  expect(isInside('/work/proj', '/work/PROJ/a', 'posix')).toBe(false)
  expect(isInside('/work/proj', '/work/PROJ/a', 'win32')).toBe(true)
})

test('projectFolderName', () => {
  expect(projectFolderName('/work/my.app')).toBe('-work-my-app')
  expect(projectFolderName('/work/a b_c')).toBe('-work-a-b-c')
  expect(projectFolderName('/work/proj')).toBe('-work-proj')
  expect(projectFolderName('C:\\Users\\me\\proj')).toBe('C--Users-me-proj')
  expect(projectFolderName('C:/Users/me/proj')).toBe('C--Users-me-proj')
  expect(projectFolderName('C:\\Users\\me\\my.app')).toBe('C--Users-me-my.app')
  expect(projectFolderName('/work/my.app', 'win32')).toBe('-work-my.app')
})

test('lines', () => {
  expect(lines('a\nb\nc')).toEqual(['a', 'b', 'c'])
  expect(lines('a\r\nb\r\nc')).toEqual(['a', 'b', 'c'])
  expect(lines('a\r\n\r\nb\n')).toEqual(['a', '', 'b', ''])
  expect(lines('')).toEqual([''])
})

test('joinPath', () => {
  expect(joinPath('posix', '/work', 'proj', 'a.ts')).toBe('/work/proj/a.ts')
  expect(joinPath('posix', '/work/', '/proj/', 'a.ts')).toBe('/work/proj/a.ts')
  expect(joinPath('posix', '/', 'work')).toBe('/work')
  expect(joinPath('posix', 'a', '', 'b')).toBe('a/b')
  expect(joinPath('posix')).toBe('')
  expect(joinPath('win32', 'C:\\Users\\me', '.claude', 'x.json')).toBe('C:\\Users\\me\\.claude\\x.json')
  expect(joinPath('win32', 'C:/Users/me/', '/proj/', 'a')).toBe('C:\\Users\\me\\proj\\a')
  expect(joinPath('win32', 'C:\\', 'Users')).toBe('C:\\Users')
  expect(joinPath('win32', '\\\\server\\share', 'dir')).toBe('\\\\server\\share\\dir')
  expect(joinPath('win32', 'C:', 'Users')).toBe('C:\\Users')
  expect(joinPath('win32', 'C:\\Users')).toBe('C:\\Users')
})

const POSIX = ['/work/proj', '/work/proj/', '/work/proj///', '/work//proj', '/', '', 'proj', 'a/b', '/work/my.app/src/ui/Button.tsx', '/work/proj/.claude/worktrees/wt-1', '/work/proj/.claude/worktrees/wt-1/src', '/work/proj/.worktrees/x', 'src/locales/sv/common.json', 'locales/en.json', '/work/proj/node_modules/x/index.js', '/work/proj/.git/config', '/work/proj/.env.local', '/work/proj/migrations/001.sql', '/work/a b/c-d_e', '/work/a-very-long-folder-name-here']

test('step 3: home folder from env closures', async () => {
  const env = (vals: Record<string, string | undefined>) => {
    const asked: string[] = []
    const get = (name: string) => async () => {
      asked.push(name)
      return vals[name]
    }
    return { asked, e: { HOME: get('HOME'), USERPROFILE: get('USERPROFILE'), HOMEDRIVE: get('HOMEDRIVE'), HOMEPATH: get('HOMEPATH') } }
  }
  const mac = env({ HOME: '/work/me', USERPROFILE: 'C:\\Users\\me' })
  expect(await homeFrom(mac.e)).toBe('/work/me')
  expect(mac.asked).toEqual(['HOME'])
  expect(await homeFrom(env({}).e)).toBe('')
  expect(await homeFrom(env({ HOME: '' }).e)).toBe('')
  expect(await homeFrom(env({ USERPROFILE: 'C:\\Users\\me' }).e)).toBe('C:\\Users\\me')
  expect(await homeFrom(env({ HOMEDRIVE: 'C:', HOMEPATH: '\\Users\\me' }).e)).toBe('C:\\Users\\me')
})

test('step 3: last names and parts keep the old POSIX answers', () => {
  const oldTail = (p: string): string => p.replace(/\/+$/, '').split('/').pop() ?? p
  const oldName = (p: string): string => p.replace(/\/+$/, '').split('/').pop() || p
  const oldBase = (p: string): string => p.split('/').filter(Boolean).pop() ?? p
  const oldFolder = (p: string): string => p.split('/').filter(x => x !== '').at(-1) ?? p
  const oldShort = (p: string): string => {
    const ps = p.split('/').filter(x => x !== '')
    return ps.length === 0 ? '/' : ps.slice(-2).join('/')
  }
  const oldFolderOf = (p: string): string => {
    const at = p.lastIndexOf('/')
    return at <= 0 ? '/' : p.slice(0, at)
  }
  const oldGroup = (cwd: string): string => {
    const ps = cwd.split('/').filter(Boolean)
    const at = ps.findIndex(p => p === 'worktrees' || p === '.worktrees')
    const base = at > 0 ? ps.slice(0, ps[at] === 'worktrees' && ps[at - 1] === '.claude' ? at - 1 : at) : ps
    return base.filter(p => !p.startsWith('.')).pop() ?? 'No folder'
  }
  const oldExcluded = (path: string): boolean => {
    const ps = path.split('/')
    if (ps.some(p => p === '.git' || p === 'node_modules')) return true
    if (path.includes('/.claude/cockpit/checkpoints/')) return true
    return /^\.env/i.test(ps[ps.length - 1] ?? '')
  }
  const oldTag = (cwd: string): string => {
    let name = cwd.split('/').filter(Boolean).pop() ?? ''
    while (name.length > 14 && name.includes('-')) name = name.slice(name.indexOf('-') + 1)
    return name.length > 14 ? name.slice(-14) : name
  }
  const oldUsable = (cwd: string, home: string): boolean => cwd.split('/').filter(x => x !== '').length >= 3 && cwd.replace(/\/+$/, '') !== home.replace(/\/+$/, '')
  const oldMain = (cwd: string): string | undefined => /^(.+?)\/\.claude\/worktrees\/[^/]+(?:\/.*)?$/.exec(cwd)?.[1]
  const oldFailed = (p: string): string => {
    const name = p.split('/').pop() ?? ''
    return name === '' ? 'Edit' : `Edit ${name}`
  }
  for (const p of POSIX) {
    expect(lastPart(p)).toBe(oldTail(p))
    expect(baseName(p)).toBe(oldTail(p))
    expect(projectName(p)).toBe(oldName(p))
    expect(memLastName(p)).toBe(oldName(p))
    expect(lastName(p)).toBe(oldBase(p))
    expect(lastName(p)).toBe(oldFolder(p))
    expect(shortFolder(p)).toBe(oldShort(p))
    expect(shortName(p)).toBe(oldShort(p))
    expect(folderOf(p)).toBe(oldFolderOf(p))
    expect(groupOfRow(undefined, p)).toBe(oldGroup(p))
    expect(folderTag(p)).toBe(oldTag(p))
    expect(nameOf({ cwd: p, sessionId: 'abcdef123456' })).toBe(p.split('/').filter(Boolean).pop() ?? 'Session')
    expect(excludedPath(p)).toBe(oldExcluded(p))
    expect(mainProject(p)).toBe(oldMain(p))
    expect(memFolderName(p)).toBe(p.replace(/[^A-Za-z0-9]/g, '-'))
    expect(failedWhat('Edit', { path: p })).toBe(oldFailed(p))
    for (const home of ['/work', '/work/proj', '/work/proj/', '']) expect(usableFolder(p, home)).toBe(oldUsable(p, home))
  }
})

test('step 3: whole modules keep the old POSIX answers', () => {
  expect(memorySpots('/work/me', '/work/me/app/.claude/worktrees/w1').map(s => `${s.dir}|${s.label}`)).toEqual([
    '/work/me/.claude/projects/-work-me-app--claude-worktrees-w1/memory|w1',
    '/work/me/.claude/projects/-work-me-app/memory|app',
  ])
  expect(memorySpots('', '/work/app').map(s => s.dir)).toEqual(['/.claude/projects/-work-app/memory'])
  expect(memorySpots('/work/me', '/work/my_app').map(s => s.dir)).toEqual(['/work/me/.claude/projects/-work-my-app/memory', '/work/me/.claude/projects/-work-my_app/memory'])
  expect(resolveGitDir('/work/repo/', '.git\n')).toBe('/work/repo/.git')
  expect(resolveGitDir('/work/repo/.claude/worktrees/w', '/work/repo/.git')).toBe('/work/repo/.git')
  expect(resolveGitDir('/work/repo/sub', '../.git')).toBe('/work/repo/.git')
  expect(sharedKind('db/migrations/001.sql')).toBe('migration')
  expect(sharedKind('/work/repo/package-lock.json')).toBe('lockfile')
  expect(compare(['/work/a/one.ts', '/work/a/two.ts'], 'kept one.ts only', undefined, 1).dropped).toEqual(['two.ts'])
  expect(happenedWords({ ...emptyTurn(), edits: 2, files: ['/work/a/one.ts', 'b/two.ts'] })).toContain('(one.ts, two.ts)')
})

test('step 3: the same callers on Windows paths', () => {
  const cwd = 'C:\\Users\\me\\proj'
  expect(projectName(cwd)).toBe('proj')
  expect(projectName('C:\\Users\\me\\proj\\')).toBe('proj')
  expect(baseName(cwd)).toBe('proj')
  expect(shortFolder(cwd)).toBe('me\\proj')
  expect(shortName('C:\\Users\\me\\proj\\src\\a.ts')).toBe('src\\a.ts')
  expect(folderOf('C:\\Users\\me\\proj\\a.ts')).toBe('C:\\Users\\me\\proj')
  expect(groupOfRow(undefined, 'C:\\work\\repo\\.claude\\worktrees\\w1')).toBe('repo')
  expect(folderTag(cwd)).toBe('proj')
  expect(nameOf({ cwd, sessionId: 'abcdef123456' })).toBe('proj')
  expect(failedWhat('Edit', { path: 'C:\\Users\\me\\proj\\a.ts' })).toBe('Edit a.ts')
  expect(excludedPath('C:\\Users\\me\\proj\\node_modules\\x.js')).toBe(true)
  expect(excludedPath('C:\\Users\\me\\proj\\.env')).toBe(true)
  expect(excludedPath('C:\\Users\\me\\.claude\\cockpit\\checkpoints\\s\\1.txt')).toBe(true)
  expect(excludedPath('C:\\Users\\me\\proj\\a.ts')).toBe(false)
  expect(usableFolder(cwd, 'C:\\Users\\me')).toBe(true)
  expect(usableFolder('C:\\Users\\me', 'C:\\Users\\me\\')).toBe(false)
  expect(usableFolder('C:\\work', 'C:\\Users\\me')).toBe(false)
  expect(mainProject('C:\\work\\app\\.claude\\worktrees\\w1\\src')).toBe('C:\\work\\app')
  expect(memorySpots('C:\\Users\\me', 'C:\\work\\app').map(s => `${s.dir}|${s.label}`)).toEqual(['C:\\Users\\me\\.claude\\projects\\C--work-app\\memory|app'])
  expect(resolveGitDir('C:\\work\\repo', '.git')).toBe('C:\\work\\repo\\.git')
  expect(resolveGitDir('C:\\work\\repo\\.claude\\worktrees\\w', 'C:/work/repo/.git')).toBe('C:\\work\\repo\\.git')
  expect(resolveGitDir('C:\\work\\repo\\sub', '../.git')).toBe('C:\\work\\repo\\.git')
  expect(sharedKind('db\\migrations\\001.sql')).toBe('migration')
  expect(compare(['C:\\work\\one.ts'], 'kept one.ts', undefined, 1).dropped).toEqual([])
})
