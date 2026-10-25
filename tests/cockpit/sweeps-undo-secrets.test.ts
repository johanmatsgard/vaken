// Old briefs and orphan undo folders are swept, undo copies skip more secrets by name and by content and are private.
import { expect } from 'claude-code/testing'

import { BRIEF_KEEP_DAYS, briefSweepArgv, isBriefFile } from '../hooks/core/autosafe'
import { eraseAll, erasePreview, parseDu, sizeWord } from '../hooks/core/erase'
import type { Io } from '../hooks/core/io'
import { bindPlatform } from '../hooks/core/procs'
import { buildPlan, copyPath, excludedPath, indexKey, loadIndex, restore, restoredText, saveBefore, secretInside, utf8Bytes } from '../hooks/core/undo'
import type { Probe } from '../hooks/core/undo'
import { sweepFolders } from '../hooks/features/keeper'
import { test } from './slow'
import { openGuard } from './safefs'

const NOW = Date.UTC(2026, 9, 12, 12, 0, 0)
const HOME = '/home/user'
const OK = { exitCode: 0, isStdoutTruncated: false, isStderrTruncated: false }

type Run = (argv: string[]) => { exitCode: number; stdout: string; stderr: string }
function world(run: Run = () => ({ exitCode: 0, stdout: '', stderr: '' }), sid = 'session-x'): { io: Io; probe: Probe; files: Map<string, string>; mem: Map<string, unknown>; runs: string[][]; writes: string[] } {
  const files = new Map<string, string>()
  const mem = new Map<string, unknown>()
  const runs: string[][] = []
  const writes: string[] = []
  const no = (): never => {
    throw new Error('not in this test')
  }
  const io: Io = {
    now: async () => NOW,
    home: async () => HOME,
    sessionId: async () => sid,
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, v),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async p => {
      const t = files.get(p)
      if (t === undefined) throw new Error('ENOENT')
      return t
    },
    write: async (p, t) => {
      writes.push(p)
      files.set(p, t)
    },
    run: async argv => {
      runs.push([...argv])
      return { ...OK, ...run([...argv]) }
    },
    ask: async () => no(),
    complete: async () => no(),
    toast: () => undefined,
    invalidate: () => undefined,
  }
  const probe: Probe = async p => (files.has(p) ? { kind: 'file', size: utf8Bytes(files.get(p) ?? '') } : undefined)
  return { io, probe, files, mem, runs, writes }
}

test('the brief sweep lists only briefs older than the named age, and only exact brief files may be removed', () => {
  expect(BRIEF_KEEP_DAYS).toBe(14)
  expect(briefSweepArgv(HOME)).toEqual(['find', `${HOME}/.claude/cockpit/briefs`, '-maxdepth', '1', '-type', 'f', '-name', 'brief-*.md', '-mtime', '+14'])
  expect(isBriefFile(HOME, `${HOME}/.claude/cockpit/briefs/brief-ab12cd34.md`)).toBe(true)
  for (const p of [`${HOME}/.claude/cockpit/briefs/notes.md`, `${HOME}/.claude/cockpit/briefs/../x/brief-ab12cd34.md`, `${HOME}/.claude/cockpit/briefs/sub/brief-ab12cd34.md`, `${HOME}/project/brief-ab12cd34.md`, `${HOME}/.claude/cockpit/briefs//brief-ab12cd34.md`]) expect(isBriefFile(HOME, p), p).toBe(false)
})

test('the daily sweep removes old briefs and the files and folder of an undo list the store lost, and spares a known list', async () => {
  const briefs = `${HOME}/.claude/cockpit/briefs`
  const root = `${HOME}/.claude/cockpit/checkpoints`
  const w = world(argv => {
    if (argv[0] !== 'find') return { exitCode: 0, stdout: '', stderr: '' }
    if (argv[1] === briefs) return { exitCode: 0, stdout: `${briefs}/brief-aaaaaaaa.md\n${briefs}/other.txt\n${briefs}/brief-bbbbbbbb.md\n`, stderr: '' }
    if (argv[1] === root) return { exitCode: 0, stdout: `${root}/lost-session\n${root}/known-session\n${root}/bad name\n`, stderr: '' }
    if (argv[1] === `${root}/lost-session`) return { exitCode: 0, stdout: `${root}/lost-session/1.txt\n${root}/lost-session/2.txt\n${root}/lost-session/notes.txt\n`, stderr: '' }
    return { exitCode: 0, stdout: '', stderr: '' }
  })
  const n = await sweepFolders(w.io, [indexKey('known-session'), 'cockpit:other'])
  expect(n).toBe(4)
  const rms = w.runs.filter(r => r[0] === 'rm')
  expect(rms).toEqual([
    ['rm', '-f', '--', `${briefs}/brief-aaaaaaaa.md`, `${briefs}/brief-bbbbbbbb.md`],
    ['rm', '-f', '--', copyPath(HOME, 'lost-session', 1), copyPath(HOME, 'lost-session', 2)],
  ])
  expect(w.runs.filter(r => r[0] === 'rmdir')).toEqual([['rmdir', '--', `${root}/lost-session`]])
  // The orphan search uses the undo list's own keep age (7 days), never a younger folder.
  expect(w.runs.find(r => r[1] === root)).toEqual(['find', root, '-mindepth', '1', '-maxdepth', '1', '-type', 'd', '-mtime', '+7'])
})

test('the folder sweep never throws and does nothing without a home or when find fails', async () => {
  const w = world(() => ({ exitCode: 1, stdout: '', stderr: 'no such folder' }))
  expect(await sweepFolders(w.io, [])).toBe(0)
  expect(w.runs.some(r => r[0] === 'rm')).toBe(false)
  const noHome = world()
  expect(await sweepFolders({ ...noHome.io, home: async () => '' }, [])).toBe(0)
  expect(noHome.runs).toEqual([])
})

test('more secret-looking names are never copied', () => {
  for (const p of ['/w/cert.p8', '/w/.pypirc', '/w/credentials', '/home/u/.aws/credentials', '/w/secrets.yaml', '/w/service-account-prod.json', '/w/store.jks', '/w/.netrc', '/w/.git-credentials', '/w/id_dsa', '/w/key.ppk', '/w/vault.kdbx', '/w/.htpasswd']) expect(excludedPath(p), p).toBe(true)
  for (const p of ['/w/src/monkey.ts', '/w/secretary.md', '/w/src/credit.ts', '/w/tokenizer.ts']) expect(excludedPath(p), p).toBe(false)
})

const KEY_HEAD = (kind: string): string => `-----BEGIN ${kind}PRIVATE ${'KEY'}-----`

test('the whole file is scanned for private key headers and common token prefixes', () => {
  expect(secretInside(`a\n${KEY_HEAD('RSA ')}\nxx`)).toBe(true)
  expect(secretInside(KEY_HEAD(''))).toBe(true)
  expect(secretInside(`const k = "AKIA${'A1'.repeat(8)}"`)).toBe(true)
  expect(secretInside(`token=ghp_${'a1'.repeat(20)}`)).toBe(true)
  expect(secretInside(`SLACK=xoxb-${'1'.repeat(12)}-abc`)).toBe(true)
  expect(secretInside(`ANTHROPIC=sk-ant-${'x'.repeat(30)}`)).toBe(true)
  expect(secretInside('const answer = 42\n// no secrets here\n')).toBe(false)
  expect(secretInside('-----BEGIN CERTIFICATE-----\nabc')).toBe(false)
  expect(secretInside(`${'x'.repeat(500_000)}\n${KEY_HEAD('')}`)).toBe(true)
})

test('a file with a secret inside is not copied, and says so in the report', async () => {
  const w = world()
  const f = '/w/src/config.ts'
  w.files.set(f, `export const key = "ghp_${'b2'.repeat(20)}"\n`)
  w.files.set('/w/src/ok.ts', 'fine\n')
  const r = await saveBefore(w.io, w.probe, 'session-x', [{ path: f, create: false }, { path: '/w/src/ok.ts', create: false }], 'Edit')
  expect(r.skipped.secret).toBe(1)
  expect(r.saved).toBe(1)
  expect((await loadIndex(w.io, 'session-x')).snaps.map(s => s.path)).toEqual(['/w/src/ok.ts'])
  expect(w.writes.every(p => p.startsWith(`${HOME}/.claude/cockpit/checkpoints/`))).toBe(true)
  expect(w.writes.length).toBe(1)
})

test('the copy folder is made 0700 and each copy file 0600', async () => {
  const sid = 'session-private'
  const w = world(() => ({ exitCode: 0, stdout: '', stderr: '' }), sid)
  w.files.set('/w/a.ts', 'one\n')
  w.files.set('/w/b.ts', 'two\n')
  await saveBefore(w.io, w.probe, sid, [{ path: '/w/a.ts', create: false }, { path: '/w/b.ts', create: false }], 'Edit')
  const dir = `${HOME}/.claude/cockpit/checkpoints/${sid}`
  expect(w.runs).toEqual([
    ['mkdir', '-m', '700', '-p', '--', dir],
    ['chmod', '700', '--', `${HOME}/.claude/cockpit/checkpoints`, dir],
    ['chmod', '600', '--', copyPath(HOME, sid, 1), copyPath(HOME, sid, 2)],
  ])
  w.files.set('/w/a.ts', 'three\n')
  await saveBefore(w.io, w.probe, sid, [{ path: '/w/a.ts', create: false }], 'Edit')
  expect(w.runs.slice(3)).toEqual([['chmod', '600', '--', copyPath(HOME, sid, 3)]])
})

test('a failing chmod never stops the copy', async () => {
  const sid = 'session-nochmod'
  const w = world(() => {
    throw new Error('no such program')
  }, sid)
  w.files.set('/w/a.ts', 'one\n')
  const r = await saveBefore(w.io, w.probe, sid, [{ path: '/w/a.ts', create: false }], 'Edit')
  expect(r.saved).toBe(1)
})

// ---- a restore refuses a file it cannot keep a copy of

test('a restore refuses the file whose present state could not be kept, goes on with the others, and says which and why', async () => {
  const sid = 'session-restore'
  const w = world(() => ({ exitCode: 0, stdout: '', stderr: '' }), sid)
  const A = '/w/a.ts'
  const B = '/w/b.ts'
  w.files.set(A, 'a original\n')
  w.files.set(B, 'b original\n')
  await saveBefore(w.io, w.probe, sid, [{ path: A, create: false }, { path: B, create: false }], 'Edit')
  // A is now edited to something that cannot be kept (a secret inside); B is edited normally.
  const secretText = `export const t = "ghp_${'c3'.repeat(20)}"\n`
  w.files.set(A, secretText)
  w.files.set(B, 'b edited\n')
  const idx = await loadIndex(w.io, sid)
  const plan = await buildPlan(w.io, HOME, sid, idx, [{ path: A, snap: 1 }, { path: B, snap: 2 }])
  const r = await restore(w.io, w.probe, sid, plan, openGuard('/w'))
  expect(r.refused).toEqual([A])
  expect(r.done).toBe(1)
  expect(w.files.get(A), 'the refused file is left as it is').toBe(secretText)
  expect(w.files.get(B)).toBe('b original\n')
  const said = restoredText(r, '/w')
  expect(said).toMatch(/Not restored: a\.ts\. Vaken could not keep a copy of it as it is now/)
  expect(said).toMatch(/Restored 1 file/)
})

test('a restore whose copy of the present state cannot be written refuses every file that needed it', async () => {
  const sid = 'session-restore2'
  const w = world(() => ({ exitCode: 0, stdout: '', stderr: '' }), sid)
  w.files.set('/w/a.ts', 'one\n')
  await saveBefore(w.io, w.probe, sid, [{ path: '/w/a.ts', create: false }], 'Edit')
  w.files.set('/w/a.ts', 'two\n')
  const plan = await buildPlan(w.io, HOME, sid, await loadIndex(w.io, sid), [{ path: '/w/a.ts', snap: 1 }])
  // The store refuses the new list, so the safety copy is not recorded.
  const broken: Io = { ...w.io, set: async () => Promise.reject(new Error('store full')) }
  const r = await restore(broken, w.probe, sid, plan, openGuard('/w'))
  expect(r).toMatchObject({ done: 0, refused: ['/w/a.ts'] })
  expect(w.files.get('/w/a.ts')).toBe('two\n')
  expect(restoredText(r, '/w')).toMatch(/Nothing was restored\./)
})

test('a file that is gone now needs no safety copy and still comes back', async () => {
  const sid = 'session-restore3'
  const w = world(() => ({ exitCode: 0, stdout: '', stderr: '' }), sid)
  w.files.set('/w/a.ts', 'one\n')
  await saveBefore(w.io, w.probe, sid, [{ path: '/w/a.ts', create: false }], 'Edit')
  w.files.delete('/w/a.ts')
  const plan = await buildPlan(w.io, HOME, sid, await loadIndex(w.io, sid), [{ path: '/w/a.ts', snap: 1 }])
  const r = await restore(w.io, w.probe, sid, plan, openGuard('/w'))
  expect(r).toMatchObject({ done: 1, refused: [] })
  expect(w.files.get('/w/a.ts')).toBe('one\n')
})

test('the preview counts the store keys and lists the folders with their size, and deletes nothing', async () => {
  const dir = `${HOME}/.claude/cockpit`
  const w = world(argv => {
    if (argv[0] === 'ls') return { exitCode: 0, stdout: 'briefs\ncheckpoints\n', stderr: '' }
    if (argv[0] === 'du') return { exitCode: 0, stdout: `12\t${dir}/briefs\n2048\t${dir}/checkpoints\n`, stderr: '' }
    return { exitCode: 0, stdout: '', stderr: '' }
  })
  w.mem.set('cockpit:setting:a', 'x')
  w.mem.set('cockpit:ledger:1', [])
  w.mem.set('other:key', 1)
  const p = await erasePreview(w.io)
  expect(p).toEqual({ keys: 2, folders: [{ name: 'briefs', kb: 12 }, { name: 'checkpoints', kb: 2048 }], kb: 2060 })
  expect(w.mem.size).toBe(3)
  expect(w.runs.some(r => r[0] === 'rm')).toBe(false)
  expect(sizeWord(12)).toBe('12 KB')
  expect(sizeWord(2060)).toBe('2.0 MB')
  expect([...parseDu('5\t/a b/c\n7 /x\nnope')]).toEqual([['/a b/c', 5], ['/x', 7]])
})

test('deleting removes the plugin keys and the folders under its own folder, nothing else', async () => {
  const dir = `${HOME}/.claude/cockpit`
  const w = world(argv => (argv[0] === 'ls' ? { exitCode: 0, stdout: `briefs\ncheckpoints\n..\nbad/name\n`, stderr: '' } : { exitCode: 0, stdout: '', stderr: '' }))
  w.mem.set('cockpit:setting:a', 'x')
  w.mem.set('cockpit:undo:index:s', {})
  w.mem.set('other:key', 1)
  const r = await eraseAll(w.io)
  expect(r).toEqual({ keys: 2, folders: 2, left: 0 })
  expect([...w.mem.keys()]).toEqual(['other:key'])
  expect(w.runs.filter(x => x[0] === 'rm')).toEqual([
    ['rm', '-rf', '--', `${dir}/briefs`],
    ['rm', '-rf', '--', `${dir}/checkpoints`],
  ])
})

test('a folder that will not go is counted as left, and the keys still go', async () => {
  const w = world(argv => (argv[0] === 'ls' ? { exitCode: 0, stdout: 'briefs\n', stderr: '' } : argv[0] === 'rm' ? { exitCode: 1, stdout: '', stderr: 'busy' } : { exitCode: 0, stdout: '', stderr: '' }))
  w.mem.set('cockpit:setting:a', 'x')
  expect(await eraseAll(w.io)).toEqual({ keys: 1, folders: 0, left: 1 })
  expect(w.mem.size).toBe(0)
})

test('delete everything does not claim success when the folder list cannot be read (Windows Io with no file call)', async () => {
  const mem = new Map<string, unknown>([['cockpit:setting:a', 'x'], ['cockpit:halt:s1', { on: true }]])
  const io: Io = { ...world().io, home: async () => 'C:\\Users\\x', keys: async () => [...mem.keys()], del: async k => void mem.delete(k) }
  const r = await eraseAll(bindPlatform(io, async () => 'Windows_NT'))
  expect(r).toMatchObject({ keys: 1, folders: 0, unread: true })
  expect(mem.has('cockpit:halt:s1'), 'a Halt that is on stays on').toBe(true)
  expect((await erasePreview(io)).keys, 'a Halt is not counted').toBe(0)
})

test('a safety copy that the size limit trims away is not held, so that file is refused; a file that appeared since the preview is refused', async () => {
  const sid = 'session-restore4'
  const w = world(() => ({ exitCode: 0, stdout: '', stderr: '' }), sid)
  const paths = Array.from({ length: 21 }, (_, n) => `/w/f${n}.ts`)
  for (const p of paths) w.files.set(p, 'small\n')
  await saveBefore(w.io, w.probe, sid, paths.map(path => ({ path, create: false })), 'Edit')
  const big = `${'y'.repeat(1_040_000)}\n`
  for (const p of paths) w.files.set(p, big)
  const idx = await loadIndex(w.io, sid)
  const plan = await buildPlan(w.io, HOME, sid, idx, paths.map((path, n) => ({ path, snap: n + 1 })))
  const r = await restore(w.io, w.probe, sid, plan, openGuard('/w'))
  expect(r.refused).toEqual(['/w/f0.ts'])
  expect(r.done).toBe(20)
  expect(w.files.get('/w/f0.ts')).toBe(big)
  const sid2 = 'session-restore5'
  const v = world(() => ({ exitCode: 0, stdout: '', stderr: '' }), sid2)
  v.files.set('/w/a.ts', 'one\n')
  await saveBefore(v.io, v.probe, sid2, [{ path: '/w/a.ts', create: false }], 'Edit')
  v.files.delete('/w/a.ts')
  const plan2 = await buildPlan(v.io, HOME, sid2, await loadIndex(v.io, sid2), [{ path: '/w/a.ts', snap: 1 }])
  v.files.set('/w/a.ts', `const t = "ghp_${'c3'.repeat(20)}"\n`)
  const r2 = await restore(v.io, v.probe, sid2, plan2, openGuard('/w'))
  expect(r2).toMatchObject({ done: 0, refused: ['/w/a.ts'] })
})
