// Undo and named checkpoints.
import { expect, mock } from 'claude-code/testing'
import { posix } from './fspath'
import type { EngineInterface, On } from 'claude-code'

import type { Io } from '../hooks/core/io'
import {
  LIST_MAX,
  MAX_COPIES,
  MAX_GIT_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  NAMED_WHAT,
  RESTORED_WHAT,
  UNDO_SETTINGS,
  bashPlan,
  bashTargets,
  buildPlan,
  copyPath,
  excludedPath,
  fileToolTargets,
  gitChanged,
  hashText,
  indexKey,
  lastChanged,
  lineChange,
  listText,
  loadIndex,
  makeCheckpoint,
  markKey,
  namedKey,
  newestOf,
  parseCheckpointAsk,
  parseNamed,
  parseUndoAsk,
  previewText,
  restore,
  restoredText,
  rmCommand,
  saveBefore,
  shellPlan,
  sinceWants,
  totalBytes,
  undoOffer,
  utf8Bytes,
  wantsSig,
} from '../hooks/core/undo'
import type { Probe, Snap } from '../hooks/core/undo'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'
import { memSafeFs, openGuard } from './safefs'
import { bindSafeFs } from '../hooks/core/safewrite'

const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime()
const ENV = { home: '/home/user', cwd: '/home/user/app' }
const SID = 'session-a'
const A = '/home/user/app/src/a.ts'
const B = '/home/user/app/src/b.ts'

function world(): { io: Io; probe: Probe; files: Map<string, string>; dirs: Set<string>; mem: Map<string, unknown>; clock: { now: number }; writes: string[] } {
  const files = new Map<string, string>()
  const dirs = new Set<string>()
  const mem = new Map<string, unknown>()
  const writes: string[] = []
  const clock = { now: NOW }
  const no = (): never => {
    throw new Error('not in this test')
  }
  const io: Io = {
    now: async () => clock.now,
    home: async () => '/home/user',
    sessionId: async () => SID,
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
    run: async () => no(),
    ask: async () => no(),
    complete: async () => no(),
    toast: () => undefined,
    invalidate: () => undefined,
  }
  const probe: Probe = async p => (dirs.has(p) ? { kind: 'dir', size: 0 } : files.has(p) ? { kind: 'file', size: utf8Bytes(files.get(p) ?? '') } : undefined)
  bindSafeFs(io, memSafeFs(() => files.keys()))
  return { io, probe, files, dirs, mem, clock, writes }
}

const lines = (n: number, tag = 'line'): string => Array.from({ length: n }, (_, k) => `${tag} ${k}`).join('\n') + '\n'

test('the Settings row sits in group Guard and defaults to On', () => {
  expect(UNDO_SETTINGS.map(s => s.key)).toEqual(['undo.mode'])
  expect(UNDO_SETTINGS[0].group).toBe('Risky steps')
  expect(UNDO_SETTINGS[0].default).toBe('on')
  expect(UNDO_SETTINGS[0].options.map(o => o.value)).toEqual(['off', 'on'])
})

test('the limits are the set numbers', () => {
  expect([MAX_COPIES, MAX_TOTAL_BYTES, MAX_FILE_BYTES, LIST_MAX]).toEqual([200, 20 * 1024 * 1024, 1024 * 1024, 10])
})

test('never anything under .git or node_modules, never a secret-looking name', () => {
  for (const p of ['/w/.git/config', '/w/node_modules/x/index.js', '/w/.env', '/w/.env.local', '/w/server.pem', '/home/u/.ssh/id_rsa', '/home/u/.ssh/id_rsa.pub', '/w/deploy.key', '/w/.npmrc', '/home/user/.claude/cockpit/checkpoints/s/1.txt']) expect(excludedPath(p)).toBe(true)
  for (const p of ['/w/src/a.ts', '/w/environment.md', '/w/gitignore.txt', '/w/src/pem.ts', '/w/key.ts']) expect(excludedPath(p)).toBe(false)
})

test('a file tool names its file; relative paths use the working folder', () => {
  expect(fileToolTargets('Write', { file_path: '/w/a.ts', content: 'x' }, ENV)).toEqual([{ path: '/w/a.ts', create: true }])
  expect(fileToolTargets('Edit', { file_path: 'src/a.ts' }, ENV)).toEqual([{ path: '/home/user/app/src/a.ts', create: false }])
  expect(fileToolTargets('NotebookEdit', { notebook_path: '~/n.ipynb' }, ENV)).toEqual([{ path: '/home/user/n.ipynb', create: true }])
  expect(fileToolTargets('Write', {}, ENV)).toEqual([])
})

test('a shell command is read for the files it writes, empties, renames or removes', () => {
  const t = (c: string): Array<[string, boolean]> => bashTargets(c, ENV).map(x => [x.path.replace('/home/user/app/', ''), x.create])
  expect(t('echo hi > out.txt')).toEqual([['out.txt', true]])
  expect(t('echo hi >> log.txt && ls')).toEqual([['log.txt', true]])
  expect(t('cat a | tee b.txt c.txt')).toEqual([['b.txt', true], ['c.txt', true]])
  expect(t("sed -i 's/a/b/' x.ts y.ts")).toEqual([['x.ts', false], ['y.ts', false]])
  expect(t("sed -i '' 's/a/b/' x.ts")).toEqual([['x.ts', false]])
  expect(t("sed -i.bak -e 's/a/b/' x.ts")).toEqual([['x.ts', false]])
  expect(t("perl -pi -e 's/a/b/' x.ts")).toEqual([['x.ts', false]])
  expect(t("sed 's/a/b/' x.ts")).toEqual([])
  expect(t('mv old.ts new.ts')).toEqual([['old.ts', false], ['new.ts', true]])
  expect(t('cp a.ts b.ts')).toEqual([['b.ts', true]])
  expect(t('rm -f a.ts b.ts')).toEqual([['a.ts', false], ['b.ts', false]])
  expect(t('truncate -s 0 big.log')).toEqual([['big.log', false]])
  expect(t('dd if=a of=out.bin')).toEqual([['out.bin', true]])
  expect(t('ls -la && git status && npm test')).toEqual([])
  expect(t('echo hi > /dev/null')).toEqual([])
  expect(t('rm -rf dist/*')).toEqual([])
  expect(t('echo hi > $OUT')).toEqual([])
  expect(t('bash -c "echo hi > inner.txt"')).toEqual([['inner.txt', true]])
})

test('on the Mac the Bash tool is read exactly as bashPlan reads it, Windows-looking lines included', () => {
  const cmds = [
    'echo hi > out.txt', 'echo hi >> log.txt && ls', 'cat a | tee b.txt c.txt', "sed -i 's/a/b/' x.ts y.ts", "perl -pi -e 's/a/b/' x.ts", 'mv old.ts new.ts', 'cp a.ts b.ts',
    'rm -f a.ts b.ts', 'rm -rf build', 'truncate -s 0 big.log', 'dd if=a of=out.bin', 'rm -rf dist/*', 'echo hi > $OUT', 'bash -c "echo hi > inner.txt"', 'git checkout -- a.ts',
    'git stash', 'git -C /w/x reset --hard', 'ls', '',
    'cmd /c del a.txt', 'Remove-Item a.txt', 'rm -Recurse -Force build', 'powershell -Command "Remove-Item a.txt"', 'copy a.txt C:\\x\\b.txt', 'echo x > C:\\out.txt',
  ]
  for (const c of cmds) {
    expect(shellPlan(c, ENV, 'posix'), c).toEqual(bashPlan(c, ENV))
    expect(shellPlan(c, ENV, undefined), c).toEqual(bashPlan(c, ENV))
  }
  expect(shellPlan('rm a.ts', ENV, 'posix')).toEqual({ targets: [{ path: '/home/user/app/a.ts', create: false }] })
})

test('lines that differ are counted: removed and added', () => {
  expect(lineChange('a\nb\nc\n', 'a\nb\nc\n')).toEqual({ added: 0, removed: 0 })
  expect(lineChange('a\nb\nc\n', 'a\nB\nc\n')).toEqual({ added: 1, removed: 1 })
  expect(lineChange('a\nb\nc\n', '')).toEqual({ added: 0, removed: 3 })
  expect(lineChange('', 'a\nb\n')).toEqual({ added: 2, removed: 0 })
  expect(lineChange('a\nb\nc\nd\n', 'a\nx\ny\nd\n')).toEqual({ added: 2, removed: 2 })
  expect(lineChange('a\nb\nc\nd\ne\n', 'c\nd\ne\na\nb\n')).toEqual({ added: 2, removed: 2 })
  expect(lineChange(lines(3000, 'old'), lines(3000, 'new'))).toEqual({ added: 3000, removed: 3000 })
})

test('the words the person types', () => {
  expect(parseUndoAsk('')).toEqual({ kind: 'list' })
  expect(parseUndoAsk('3')).toEqual({ kind: 'file', n: 3, yes: false })
  expect(parseUndoAsk('3 yes')).toEqual({ kind: 'file', n: 3, yes: true })
  expect(parseUndoAsk('3 YES')).toEqual({ kind: 'file', n: 3, yes: true })
  expect(parseUndoAsk('0')).toMatchObject({ kind: 'bad' })
  expect(parseUndoAsk('11')).toMatchObject({ kind: 'bad' })
  expect(parseUndoAsk('3 maybe')).toMatchObject({ kind: 'bad' })
  expect(parseUndoAsk('name before')).toEqual({ kind: 'named', name: 'before', yes: false })
  expect(parseUndoAsk('name before yes')).toEqual({ kind: 'named', name: 'before', yes: true })
  expect(parseUndoAsk('name')).toMatchObject({ kind: 'bad' })
  expect(parseUndoAsk('everything')).toMatchObject({ kind: 'bad' })
  expect(parseCheckpointAsk('')).toEqual({ kind: 'list' })
  expect(parseCheckpointAsk('before refactor')).toEqual({ kind: 'make', name: 'before-refactor' })
  expect(parseCheckpointAsk('yes')).toMatchObject({ kind: 'bad' })
  expect(parseCheckpointAsk('!!!')).toMatchObject({ kind: 'bad' })
})

test('a copy of the file as it is goes to the checkpoints folder; the store holds no text', async () => {
  const w = world()
  w.files.set(A, 'const a = 1\n')
  const r = await saveBefore(w.io, w.probe, SID, [{ path: A, create: false }], 'Edit')
  expect(r).toMatchObject({ saved: 1, created: 0 })
  expect(w.files.get(copyPath('/home/user', SID, 1))).toBe('const a = 1\n')
  expect(copyPath('/home/user', SID, 1)).toBe('/home/user/.claude/cockpit/checkpoints/session-a/1.txt')
  const idx = await loadIndex(w.io, SID)
  expect(idx.snaps).toEqual([{ id: 1, path: A, at: NOW, tool: 'Edit', kind: 'saved', hash: hashText('const a = 1\n'), bytes: 12, lines: 1 }])
  expect(JSON.stringify(w.mem.get(indexKey(SID)))).not.toMatch(/const a/)
})

test('a file that has not changed since its last copy is not copied again; a changed one is', async () => {
  const w = world()
  w.files.set(A, 'one\n')
  await saveBefore(w.io, w.probe, SID, [{ path: A, create: false }], 'Edit')
  const again = await saveBefore(w.io, w.probe, SID, [{ path: A, create: false }], 'Edit')
  expect(again).toMatchObject({ saved: 0, same: 1 })
  w.files.set(A, 'two\n')
  await saveBefore(w.io, w.probe, SID, [{ path: A, create: false }], 'Edit')
  expect((await loadIndex(w.io, SID)).snaps.map(s => s.id)).toEqual([1, 2])
})

test('a file the step will create is noted as created, once; a file that is not there and not made is left out', async () => {
  const w = world()
  const r = await saveBefore(w.io, w.probe, SID, [{ path: A, create: true }, { path: B, create: false }], 'Write')
  expect(r).toMatchObject({ saved: 0, created: 1 })
  await saveBefore(w.io, w.probe, SID, [{ path: A, create: true }], 'Write')
  const idx = await loadIndex(w.io, SID)
  expect(idx.snaps.map(s => [s.path, s.kind])).toEqual([[A, 'created']])
  expect(w.writes).toEqual([])
})

test('files over 1 MB, binary files, folders and secret names are skipped', async () => {
  const w = world()
  w.files.set('/home/user/app/big.txt', 'x'.repeat(MAX_FILE_BYTES + 1))
  w.files.set('/home/user/app/img.bin', 'PNG\u0000\u0001')
  w.files.set('/home/user/app/.env', 'KEY=1')
  w.files.set('/home/user/app/ok.txt', 'fine')
  w.dirs.add('/home/user/app/dist')
  const targets = ['big.txt', 'img.bin', '.env', 'ok.txt', 'dist'].map(n => ({ path: `/home/user/app/${n}`, create: false }))
  const r = await saveBefore(w.io, w.probe, SID, targets, 'Bash')
  expect(r).toEqual({ saved: 1, created: 0, same: 0, skipped: { big: 1, binary: 1, excluded: 1, secret: 0, dir: 1, unreadable: 0 } })
  expect((await loadIndex(w.io, SID)).snaps.map(s => s.path)).toEqual(['/home/user/app/ok.txt'])
  expect(w.writes.length).toBe(1)
})

test('a file whose size the probe does not know but whose text is over 1 MB is skipped too', async () => {
  const w = world()
  w.files.set(A, 'é'.repeat(MAX_FILE_BYTES / 2 + 10))
  const lying: Probe = async () => ({ kind: 'file', size: 10 })
  expect(await saveBefore(w.io, lying, SID, [{ path: A, create: false }], 'Edit')).toMatchObject({ saved: 0, skipped: { big: 1 } })
})

test('at most 200 copies: the oldest drop first and their copy files are emptied', async () => {
  const w = world()
  for (let n = 0; n < MAX_COPIES + 5; n += 1) {
    w.files.set(`/home/user/app/f${n}.txt`, `file ${n}\n`)
    await saveBefore(w.io, w.probe, SID, [{ path: `/home/user/app/f${n}.txt`, create: false }], 'Write')
  }
  const idx = await loadIndex(w.io, SID)
  expect(idx.snaps.length).toBe(MAX_COPIES)
  expect(idx.snaps[0].path).toBe('/home/user/app/f5.txt')
  expect(idx.snaps[idx.snaps.length - 1].path).toBe(`/home/user/app/f${MAX_COPIES + 4}.txt`)
  expect(w.files.get(copyPath('/home/user', SID, 1))).toBe('')
  expect(w.files.get(copyPath('/home/user', SID, 6))).toBe('file 5\n')
})

test('at most 20 MB: the oldest drop first', async () => {
  const w = world()
  const body = 'x'.repeat(900_000)
  for (let n = 0; n < 25; n += 1) {
    w.files.set(`/home/user/app/g${n}.txt`, body + n)
    await saveBefore(w.io, w.probe, SID, [{ path: `/home/user/app/g${n}.txt`, create: false }], 'Write')
  }
  const idx = await loadIndex(w.io, SID)
  expect(totalBytes(idx)).toBeLessThanOrEqual(MAX_TOTAL_BYTES)
  expect(idx.snaps.length).toBe(23)
  expect(idx.snaps[0].path).toBe('/home/user/app/g2.txt')
})

test('two saves at the same moment take different copy numbers', async () => {
  const w = world()
  for (const n of ['p', 'q', 'r', 's']) w.files.set(`/home/user/app/${n}.txt`, `text ${n}`)
  await Promise.all(['p', 'q', 'r', 's'].map(n => saveBefore(w.io, w.probe, SID, [{ path: `/home/user/app/${n}.txt`, create: false }], 'Edit')))
  const idx = await loadIndex(w.io, SID)
  expect(idx.snaps.map(s => s.id).sort()).toEqual([1, 2, 3, 4])
  for (const s of idx.snaps) expect(w.files.get(copyPath('/home/user', SID, s.id))).toBe(`text ${s.path.slice(-5, -4)}`)
})

test('a read that fails is skipped, not thrown', async () => {
  const w = world()
  w.files.set(A, 'x')
  const broken: Io = { ...w.io, read: async () => Promise.reject(new Error('EACCES')) }
  expect(await saveBefore(broken, w.probe, SID, [{ path: A, create: false }], 'Edit')).toMatchObject({ saved: 0, skipped: { unreadable: 1 } })
  const down: Io = { ...w.io, get: async () => Promise.reject(new Error('store down')) }
  expect(await saveBefore(down, w.probe, SID, [{ path: A, create: false }], 'Edit')).toMatchObject({ saved: 0 })
})

test('the list shows each changed file once, newest first, at most ten', async () => {
  const w = world()
  for (let n = 0; n < 12; n += 1) {
    w.files.set(`/home/user/app/h${n}.txt`, `v1 ${n}\n`)
    await saveBefore(w.io, w.probe, SID, [{ path: `/home/user/app/h${n}.txt`, create: false }], 'Edit')
  }
  w.files.set('/home/user/app/h3.txt', 'v2\n')
  await saveBefore(w.io, w.probe, SID, [{ path: '/home/user/app/h3.txt', create: false }], 'Edit')
  const idx = await loadIndex(w.io, SID)
  const items = lastChanged(idx)
  expect(items.length).toBe(LIST_MAX)
  expect(items[0].snap.path).toBe('/home/user/app/h3.txt')
  expect(items[0].snap.lines).toBe(1)
  expect(items.map(i => i.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  expect(new Set(items.map(i => i.snap.path)).size).toBe(10)
  const shown = listText(idx, [], NOW, '/home/user/app', 'on')
  expect(shown).toMatch(/Last changed files \(13 copies kept/)
  expect(shown).toMatch(/1\. h3\.txt  12:00  would go back to how it was before an Edit \(1 line\)/)
  expect(shown).toMatch(/Nothing changes until you add yes/)
  expect(shown).toMatch(/Restoring never deletes a file/)
})

test('the list says plainly when there is nothing, and when undo is off', () => {
  expect(listText({ next: 1, snaps: [] }, [], NOW, '/w', 'on')).toMatch(/nothing to undo/)
  expect(listText({ next: 1, snaps: [] }, [], NOW, '/w', 'off')).toMatch(/Undo is off, so no new copies are kept/)
})

test('the preview says which files and how many lines; nothing is changed; yes writes the stored text and checks it', async () => {
  const w = world()
  w.files.set(A, lines(10))
  await saveBefore(w.io, w.probe, SID, [{ path: A, create: false }], 'Edit')
  w.files.set(A, lines(10).replace('line 4', 'LINE FOUR').replace('line 5', 'LINE FIVE') + 'extra\n')
  const idx = await loadIndex(w.io, SID)
  const plan = await buildPlan(w.io, '/home/user', SID, idx, [{ path: A, snap: 1 }])
  expect(plan[0]).toMatchObject({ kind: 'restore', added: 2, removed: 3 })
  const before = w.files.get(A)
  const preview = previewText('Undo preview for src/a.ts.', plan, NOW, '/home/user/app', '/vaken-undo 1 yes')
  expect(preview).toMatch(/1 file would change:/)
  expect(preview).toMatch(/src\/a\.ts: 3 lines removed, 2 lines added \(back to how it was before an Edit at 12:00\)/)
  expect(preview).toMatch(/Nothing was changed yet\./)
  expect(preview).toMatch(/To go ahead: \/vaken-undo 1 yes/)
  expect(w.files.get(A)).toBe(before)

  const r = await restore(w.io, w.probe, SID, plan, openGuard('/home/user/app'))
  expect(r).toEqual({ done: 1, failed: [], checked: 1, refused: [], linked: [] })
  expect(w.files.get(A)).toBe(lines(10))
  expect(restoredText(r, '/home/user/app')).toMatch(/Restored 1 file; 1 read back and matches the copy\./)
})

test('a restore keeps the files as they were just before, so it can be undone', async () => {
  const w = world()
  w.files.set(A, 'original\n')
  await saveBefore(w.io, w.probe, SID, [{ path: A, create: false }], 'Edit')
  w.files.set(A, 'edited\n')
  const idx = await loadIndex(w.io, SID)
  await restore(w.io, w.probe, SID, await buildPlan(w.io, '/home/user', SID, idx, [{ path: A, snap: 1 }]), openGuard('/home/user/app'))
  expect(w.files.get(A)).toBe('original\n')
  const after = await loadIndex(w.io, SID)
  expect(newestOf(after, A)).toMatchObject({ tool: 'undo', kind: 'saved' })
  expect(w.files.get(copyPath('/home/user', SID, newestOf(after, A)?.id ?? 0))).toBe('edited\n')
  await restore(w.io, w.probe, SID, await buildPlan(w.io, '/home/user', SID, after, [{ path: A, snap: newestOf(after, A)?.id ?? 0 }]), openGuard('/home/user/app'))
  expect(w.files.get(A)).toBe('edited\n')
})

test('a file already the same needs nothing; a file that is gone comes back; a lost or changed copy is not used', async () => {
  const w = world()
  w.files.set(A, 'same\n')
  w.files.set(B, 'bee\n')
  await saveBefore(w.io, w.probe, SID, [{ path: A, create: false }, { path: B, create: false }], 'Bash')
  w.files.delete(B)
  const idx = await loadIndex(w.io, SID)
  const plan = await buildPlan(w.io, '/home/user', SID, idx, [{ path: A, snap: 1 }, { path: B, snap: 2 }, { path: '/w/x', snap: 99 }, { path: '/w/y', snap: -1 }])
  expect(plan.map(p => p.kind)).toEqual(['same', 'restore', 'lost', 'lost'])
  expect(previewText('t', plan, NOW, '/home/user/app', 'go')).toMatch(/src\/b\.ts: the file is gone now and would come back/)
  expect(previewText('t', plan, NOW, '/home/user/app', 'go')).toMatch(/\/w\/x: cannot be restored, its copy was dropped/)
  expect(previewText('t', plan, NOW, '/home/user/app', 'go')).toMatch(/\/w\/y: cannot be restored, no copy could be kept/)
  w.files.set(copyPath('/home/user', SID, 2), 'tampered\n')
  const again = await buildPlan(w.io, '/home/user', SID, idx, [{ path: B, snap: 2 }])
  expect(again[0]).toMatchObject({ kind: 'lost', why: 'its copy file does not match what was kept' })
})

test('a file vaken saw being created is never deleted: the exact rm command is offered', async () => {
  const w = world()
  const odd = "/home/user/app/it's here.txt"
  await saveBefore(w.io, w.probe, SID, [{ path: odd, create: true }], 'Write')
  w.files.set(odd, 'new file\n')
  const idx = await loadIndex(w.io, SID)
  const plan = await buildPlan(w.io, '/home/user', SID, idx, [{ path: odd, snap: 1 }])
  expect(plan[0]).toMatchObject({ kind: 'created', exists: true })
  const preview = previewText('t', plan, NOW, '/home/user/app', 'go')
  expect(preview).toContain(`To remove it yourself: ${rmCommand(odd)}`)
  expect(rmCommand(odd)).toBe("rm '/home/user/app/it'\\''s here.txt'")
  expect(preview).toMatch(/Nothing would change\./)
  const r = await restore(w.io, w.probe, SID, plan, openGuard('/home/user/app'))
  expect(r.done).toBe(0)
  expect(w.files.get(odd)).toBe('new file\n')
  expect(restoredText(r, '/home/user/app')).toMatch(/^Nothing was restored\./)
})

test('a checkpoint names every file touched so far as it is now; going back restores them; unchanged files are referred to, not copied twice', async () => {
  const w = world()
  w.files.set(A, 'a1\n')
  w.files.set(B, 'b1\n')
  await saveBefore(w.io, w.probe, SID, [{ path: A, create: false }, { path: B, create: false }], 'Edit')
  w.files.set(A, 'a2\n')
  const made = await makeCheckpoint(w.io, w.probe, SID, 'good')
  expect(made).toMatchObject({ ok: true, held: 2, notHeld: 0, absent: 0 })
  const idx = await loadIndex(w.io, SID)
  const named = parseNamed(w.mem.get(namedKey(SID)))
  expect(named[0].name).toBe('good')
  // B did not change since its copy, so the checkpoint refers to that copy (snap 2); A got a new copy.
  expect(named[0].items.find(x => x.path === B)?.snap).toBe(2)
  expect(idx.snaps.length).toBe(3)
  expect(w.files.get(copyPath('/home/user', SID, named[0].items.find(x => x.path === A)?.snap ?? 0))).toBe('a2\n')

  w.files.set(A, 'a3\n')
  w.files.set(B, 'b3\n')
  const plan = await buildPlan(w.io, '/home/user', SID, idx, named[0].items)
  expect(plan.map(p => p.kind)).toEqual(['restore', 'restore'])
  const r = await restore(w.io, w.probe, SID, plan, openGuard('/home/user/app'))
  expect(r).toMatchObject({ done: 2, failed: [] })
  expect(w.files.get(A)).toBe('a2\n')
  expect(w.files.get(B)).toBe('b1\n')
})

test('a checkpoint over nothing says so; a file not there now is noted, not made up; a name given again replaces the old one', async () => {
  const w = world()
  expect(await makeCheckpoint(w.io, w.probe, SID, 'empty')).toMatchObject({ ok: false })
  w.files.set(A, 'a\n')
  await saveBefore(w.io, w.probe, SID, [{ path: A, create: false }, { path: B, create: true }], 'Bash')
  w.files.set(B, 'made later\n')
  w.files.delete(A)
  const made = await makeCheckpoint(w.io, w.probe, SID, 'one')
  expect(made).toMatchObject({ ok: true, held: 1, absent: 1 })
  const first = parseNamed(w.mem.get(namedKey(SID)))[0]
  expect(first.items).toContainEqual({ path: A, snap: 0 })
  const plan = await buildPlan(w.io, '/home/user', SID, await loadIndex(w.io, SID), first.items)
  expect(plan.find(p => p.path === A)).toMatchObject({ kind: 'absent', createdSeen: false })
  await makeCheckpoint(w.io, w.probe, SID, 'ONE')
  expect(parseNamed(w.mem.get(namedKey(SID))).map(n => n.name)).toEqual(['ONE'])
})

test('a checkpoint\'s file that was created by a step and exists now gets the rm command, never a delete', async () => {
  const w = world()
  await saveBefore(w.io, w.probe, SID, [{ path: B, create: true }], 'Write')
  w.files.set(B, 'new\n')
  w.files.set(A, 'a\n')
  await saveBefore(w.io, w.probe, SID, [{ path: A, create: false }], 'Edit')
  const plan = await buildPlan(w.io, '/home/user', SID, await loadIndex(w.io, SID), [{ path: B, snap: 0 }])
  expect(plan[0]).toMatchObject({ kind: 'absent', createdSeen: true, exists: true })
  expect(previewText('t', plan, NOW, '/home/user/app', 'go')).toContain(rmCommand(B))
  await restore(w.io, w.probe, SID, plan, openGuard('/home/user/app'))
  expect(w.files.get(B)).toBe('new\n')
})

// ---- the commands, in the engine (needs registerUndo in register.tsx)

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  return mem
}

const FILES = new Map<string, string>()
const WRITES: string[] = []
let DISK_BROKEN = false
// Typed by the person in this session unless `origin` names another source.
const text = async ($: EngineInterface, command: string, args = '', origin: unknown = { kind: 'composer' }): Promise<string> =>
  ((await $.command.run({ ...viaParent(command, args), origin } as never)) as { text: string }).text
const whats = (mem: Map<string, unknown>): string[] => ((mem.get('cockpit:ledger:compact') ?? []) as Array<{ what: string }>).map(l => l.what)

// The hooks are the plugin's own, so register.tsx must call registerUndo.
let CLOCK: ReturnType<typeof mock.clock>
function setup(on: On): Map<string, unknown> {
  CLOCK = mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  mock.env(on, { HOME: '/home/user' })
  FILES.clear()
  WRITES.length = 0
  DISK_BROKEN = false
  on('session.id', () => ({ value: SID }))
  on('session.cwd', () => ({ value: '/home/user/app' }))
  on('session.root', () => ({ value: '/home/user/app' }))
  on('fs.stat', (_$, e) => {
    if (DISK_BROKEN) throw new Error('disk problem')
    const p = posix(e.path)
    const t = FILES.get(p)
    const real = e.resolve ? { realPath: p } : {}
    if (t === undefined && [...FILES.keys()].some(f => f.startsWith(`${p}/`))) return { value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false, ...real } } as never
    if (t === undefined) throw new Error('ENOENT')
    return { value: { kind: 'file', size: utf8Bytes(t), mtimeMs: 0, isLink: false, ...real } } as never
  })
  on('fs.list', (_$, e) => {
    const dir = posix(e.path ?? '.').replace(/\/$/, '')
    const names = new Set([...FILES.keys()].filter(f => f.startsWith(`${dir}/`)).map(f => f.slice(dir.length + 1).split('/')[0]))
    return { value: [...names].map(name => ({ name, kind: 'other', size: 0, mtimeMs: 0, isLink: false })) } as never
  })
  on('fs.read', (_$, e) => {
    if (DISK_BROKEN) throw new Error('disk problem')
    const t = FILES.get(posix(e.path))
    if (t === undefined) throw new Error('ENOENT')
    return { value: t } as never
  })
  on('fs.write', (_$, e) => {
    WRITES.push(posix(e.path))
    FILES.set(posix(e.path), e.text)
    return { value: undefined } as never
  })
  // The mock tools change the files the way the real ones would.
  on('tool.call', { tool: 'Write' }, (_$, e) => {
    FILES.set((e as unknown as { file_path: string }).file_path, (e as unknown as { content: string }).content)
    return { result: { ok: true }, text: 'written' } as never
  })
  on('tool.call', { tool: 'Edit' }, (_$, e) => {
    const a = e as unknown as { file_path: string; old_string: string; new_string: string }
    FILES.set(a.file_path, (FILES.get(a.file_path) ?? '').replace(a.old_string, a.new_string))
    return { result: { ok: true }, text: 'edited' } as never
  })
  on('tool.call', { tool: 'Bash' }, (_$, e) => {
    const m = /^echo (\S+) > (\S+)$/.exec((e as unknown as { command: string }).command)
    if (m !== null) FILES.set(m[2].startsWith('/') ? m[2] : `/home/user/app/${m[2]}`, `${m[1]}\n`)
    return { result: { stdout: '', stderr: '', code: 0 }, text: 'ok' } as never
  })
  return mem
}

test('a Write saves a copy first; /vaken-undo lists it; the preview changes nothing; yes restores; the ledger has one line', SLOW, async ($, on) => {
  const mem = setup(on)
  FILES.set(A, 'original\nsecond\n')
  await $.tool.call({ tool: 'Write', file_path: A, content: 'rewritten\n' })
  expect(FILES.get(A)).toBe('rewritten\n')
  expect(FILES.get(copyPath('/home/user', SID, 1))).toBe('original\nsecond\n')

  const list = await text($, 'vaken-undo')
  expect(list).toMatch(/1\. src\/a\.ts  12:00  would go back to how it was before a Write \(2 lines\)/)

  const preview = await text($, 'vaken-undo', '1')
  expect(preview).toMatch(/1 line removed, 2 lines added/)
  expect(preview).toMatch(/To go ahead: \/vaken-undo 1 yes/)
  expect(FILES.get(A)).toBe('rewritten\n')
  expect(WRITES.filter(p => p === A)).toEqual([])

  const done = await text($, 'vaken-undo', '1 yes')
  expect(done).toMatch(/Restored 1 file; 1 read back and matches the copy/)
  expect(FILES.get(A)).toBe('original\nsecond\n')
  expect(whats(mem)).toEqual([RESTORED_WHAT])
  expect(((mem.get('cockpit:ledger:compact') ?? []) as Array<{ did?: boolean; session?: string }>)[0]).toMatchObject({ did: true, session: SID })
})

test('a yes from another session, a channel, a schedule or a plugin restores nothing; the list and the preview stay open to all', SLOW, async ($, on) => {
  setup(on)
  FILES.set(A, 'original\n')
  await $.tool.call({ tool: 'Write', file_path: A, content: 'rewritten\n' })
  for (const origin of [{ kind: 'peer' }, { kind: 'channel', server: 'chat' }, { kind: 'scheduled-trigger' }, { kind: 'plugin', name: 'other' }]) {
    expect(await text($, 'vaken-undo', '', origin)).toMatch(/1\. src\/a\.ts/)
    expect(await text($, 'vaken-undo', '1', origin)).toMatch(/To go ahead: \/vaken-undo 1 yes/)
    expect(await text($, 'vaken-undo', '1 yes', origin)).toBe('This step needs you to type it in this session.')
    expect(FILES.get(A)).toBe('rewritten\n')
  }
  expect(await text($, 'vaken-undo', '1 yes')).toMatch(/Restored 1 file/)
  expect(FILES.get(A)).toBe('original\n')
})

test('yes alone, or yes for a list that has moved on, restores nothing', async ($, on) => {
  setup(on)
  FILES.set(A, 'a-old\n')
  FILES.set(B, 'b-old\n')
  await $.tool.call({ tool: 'Edit', file_path: A, old_string: 'a-old', new_string: 'a-new' })
  expect(await text($, 'vaken-undo', '1 yes')).toMatch(/Run the preview first: \/vaken-undo 1\./)
  expect(FILES.get(A)).toBe('a-new\n')
  await text($, 'vaken-undo', '1')
  await $.tool.call({ tool: 'Edit', file_path: B, old_string: 'b-old', new_string: 'b-new' })
  expect(await text($, 'vaken-undo', '1 yes')).toMatch(/Run the preview first/)
  expect(FILES.get(A)).toBe('a-new\n')
  expect(FILES.get(B)).toBe('b-new\n')
  expect(await text($, 'vaken-undo', '9')).toMatch(/There is no number 9/)
})

test('a Bash command that writes is read for its files; a read-only one saves nothing', async ($, on) => {
  const mem = setup(on)
  FILES.set('/home/user/app/out.txt', 'old out\n')
  await $.tool.call({ tool: 'Bash', command: 'ls -la' })
  expect(mem.has(indexKey(SID))).toBe(false)
  await $.tool.call({ tool: 'Bash', command: 'echo new > out.txt' })
  expect(FILES.get('/home/user/app/out.txt')).toBe('new\n')
  expect(FILES.get(copyPath('/home/user', SID, 1))).toBe('old out\n')
  await $.tool.call({ tool: 'Bash', command: 'echo fresh > made.txt' })
  expect(await text($, 'vaken-undo')).toMatch(/made\.txt .*was made by a shell command; there was no earlier version/)
  const preview = await text($, 'vaken-undo', '1')
  expect(preview).toContain("To remove it yourself: rm '/home/user/app/made.txt'")
  expect(await text($, 'vaken-undo', '1 yes')).toMatch(/^Nothing was restored|Nothing would change/)
  expect(FILES.get('/home/user/app/made.txt')).toBe('fresh\n')
})

test('the PowerShell tool: Remove-Item keeps a copy first, the file goes, and /vaken-undo puts it back', async ($, on) => {
  const mem = setup(on)
  // The mock PowerShell tool removes the file the way Remove-Item would.
  on('tool.call', { tool: 'PowerShell' }, (_$, e) => {
    const m = /^Remove-Item -LiteralPath '([^']+)' -Force$/.exec((e as unknown as { command: string }).command)
    if (m !== null) FILES.delete(`/home/user/app/${m[1]}`)
    return { result: { stdout: '', stderr: '', code: 0 }, text: 'ok' } as never
  })
  FILES.set(A, 'keep me\nplease\n')
  await $.tool.call({ tool: 'PowerShell', command: 'Get-ChildItem' })
  expect(mem.has(indexKey(SID))).toBe(false)
  await $.tool.call({ tool: 'PowerShell', command: "Remove-Item -LiteralPath 'src/a.ts' -Force" })
  expect(FILES.has(A)).toBe(false)
  expect(FILES.get(copyPath('/home/user', SID, 1))).toBe('keep me\nplease\n')
  expect(((mem.get(indexKey(SID)) as { snaps: Array<{ path: string }> }).snaps).map(s => posix(s.path))).toEqual([A])
  expect(await text($, 'vaken-undo')).toMatch(/1\. src\/a\.ts  12:00  would go back to how it was before a shell command \(2 lines\)/)
  expect(await text($, 'vaken-undo', '1')).toMatch(/src\/a\.ts: the file is gone now and would come back/)
  expect(await text($, 'vaken-undo', '1 yes')).toMatch(/Restored 1 file; 1 read back and matches the copy/)
  expect(FILES.get(A)).toBe('keep me\nplease\n')
})

test('a secret-looking file is never copied, and the step still runs', async ($, on) => {
  const mem = setup(on)
  FILES.set('/home/user/app/.env', 'TOKEN=abc\n')
  await $.tool.call({ tool: 'Write', file_path: '/home/user/app/.env', content: 'TOKEN=def\n' })
  expect(FILES.get('/home/user/app/.env')).toBe('TOKEN=def\n')
  expect(mem.has(indexKey(SID))).toBe(false)
  expect(WRITES).toEqual([])
})

test('Off keeps no copy; the list still opens', async ($, on) => {
  const mem = setup(on)
  mem.set('cockpit:setting:undo.mode', 'off')
  FILES.set(A, 'old\n')
  await $.tool.call({ tool: 'Write', file_path: A, content: 'new\n' })
  expect(mem.has(indexKey(SID))).toBe(false)
  expect(FILES.get(A)).toBe('new\n')
  expect(await text($, 'vaken-undo')).toMatch(/Undo is off/)
})

test('/vaken-undo checkpoint names the state; /vaken-undo name previews and restores it', async ($, on) => {
  const mem = setup(on)
  expect(await text($, 'vaken-checkpoint', 'start')).toMatch(/No file has been changed/)
  FILES.set(A, 'v1\n')
  await $.tool.call({ tool: 'Write', file_path: A, content: 'v2\n' })
  expect(await text($, 'vaken-checkpoint', 'good state')).toMatch(/Checkpoint "good-state" saved: 1 file held/)
  expect(whats(mem)).toEqual([NAMED_WHAT])
  await $.tool.call({ tool: 'Write', file_path: A, content: 'v3 bad\n' })
  expect(await text($, 'vaken-checkpoint')).toMatch(/good-state/)
  expect(await text($, 'vaken-undo')).toMatch(/Saved points: good-state/)
  const preview = await text($, 'vaken-undo', 'name good-state')
  expect(preview).toMatch(/Preview of going back to checkpoint "good-state"/)
  expect(preview).toMatch(/src\/a\.ts: 1 line removed, 1 line added/)
  expect(FILES.get(A)).toBe('v3 bad\n')
  expect(await text($, 'vaken-undo', 'name nothing')).toMatch(/No checkpoint named "nothing"/)
  expect(await text($, 'vaken-undo', 'name good-state yes')).toMatch(/Restored 1 file/)
  expect(FILES.get(A)).toBe('v2\n')
  expect(whats(mem)).toEqual([RESTORED_WHAT, NAMED_WHAT])
})

test('the step runs even when the copy cannot be made', async ($, on) => {
  setup(on)
  DISK_BROKEN = true
  await $.tool.call({ tool: 'Write', file_path: A, content: 'still written\n' })
  expect(FILES.get(A)).toBe('still written\n')
})

test('git commands that put files back are read for the files they name', () => {
  const t = (c: string): string[] => bashTargets(c, ENV).map(x => x.path.replace('/home/user/app/', ''))
  expect(t('git checkout -- a.ts b.ts')).toEqual(['a.ts', 'b.ts'])
  expect(t('git checkout main -- src/a.ts')).toEqual(['src/a.ts'])
  expect(t('git restore src/a.ts')).toEqual(['src/a.ts'])
  expect(t('git restore -s HEAD~1 a.ts')).toEqual(['a.ts'])
  expect(t('git restore --source=HEAD~1 -- a.ts')).toEqual(['a.ts'])
  expect(t('git restore --staged a.ts')).toEqual([])
  expect(t('git restore --staged --worktree a.ts')).toEqual(['a.ts'])
  expect(t('git -C sub checkout -- a.ts')).toEqual(['sub/a.ts'])
  expect(t('git stash push -- x.ts')).toEqual(['x.ts'])
  for (const c of ['git status', 'git checkout main', 'git checkout -b feature', 'git stash list', 'git reset --soft HEAD~1', 'git commit -m x', 'git checkout .']) expect(t(c)).toEqual([])
  expect(bashTargets('git checkout -- a.ts', ENV)[0].create).toBe(false)
})

test('git that changes every tracked file at once names the folder to ask git in', () => {
  const dir = (c: string): string | undefined => bashPlan(c, ENV).gitDir
  for (const c of ['git stash', 'git stash -u', 'git stash push -m wip', 'git stash save wip', 'git reset --hard', 'git reset --hard HEAD~2', 'git checkout .', 'git checkout -- .', 'git restore .', 'git restore --source=main src/']) expect(dir(c), c).toBe('/home/user/app')
  expect(dir('git -C /w/x reset --hard')).toBe('/w/x')
  for (const c of ['git status', 'git stash list', 'git stash pop', 'git stash drop', 'git reset --soft HEAD~1', 'git reset HEAD a.ts', 'git checkout main', 'git restore --staged .', 'git checkout -- a.ts', 'ls']) expect(dir(c), c).toBeUndefined()
})

type RunAnswer = { exitCode: number; stdout: string }
function runOf(top: string, diff: RunAnswer | ((argv: string[]) => RunAnswer), calls: string[][] = []): Io['run'] {
  return (async (argv: string[]) => {
    calls.push(argv)
    const r: RunAnswer = argv.includes('rev-parse') ? { exitCode: top === '' ? 128 : 0, stdout: top } : typeof diff === 'function' ? diff(argv) : diff
    return { ...r, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
  }) as never
}

test('gitChanged lists the tracked files that differ from the last commit, under the repository root, at most 50', async () => {
  const w = world()
  const names = Array.from({ length: 60 }, (_, n) => `src/f${n}.ts`)
  const calls: string[][] = []
  w.io.run = runOf('/home/user/app\n', { exitCode: 0, stdout: `${names.join('\0')}\0` }, calls)
  const got = await gitChanged(w.io, '/home/user/app')
  expect(got).toHaveLength(MAX_GIT_FILES)
  expect(got[0]).toEqual({ path: '/home/user/app/src/f0.ts', create: false })
  expect(calls[1]).toEqual(['git', '-C', '/home/user/app', 'diff', 'HEAD', '--name-only', '-z'])
  w.io.run = runOf('/home/user/app\n', { exitCode: 0, stdout: 'a.ts\0../outside.ts\0b.ts\0' })
  expect((await gitChanged(w.io, '/home/user/app')).map(t => t.path)).toEqual(['/home/user/app/a.ts', '/home/user/app/b.ts'])
})

test('gitChanged falls back to the plain diff when there is no HEAD, and gives nothing outside a repository or when git fails', async () => {
  const w = world()
  const calls: string[][] = []
  w.io.run = runOf('/r\n', argv => (argv.includes('HEAD') ? { exitCode: 128, stdout: '' } : { exitCode: 0, stdout: 'a.ts\0' }), calls)
  expect((await gitChanged(w.io, '/r')).map(t => t.path)).toEqual(['/r/a.ts'])
  expect(calls).toHaveLength(3)
  w.io.run = runOf('', { exitCode: 0, stdout: 'a.ts\0' })
  expect(await gitChanged(w.io, '/r')).toEqual([])
  w.io.run = runOf('/r\n', { exitCode: 1, stdout: '' })
  expect(await gitChanged(w.io, '/r')).toEqual([])
  w.io.run = (async () => {
    throw new Error('no git')
  }) as never
  expect(await gitChanged(w.io, '/r')).toEqual([])
})

const snapsOf = (mem: Map<string, unknown>): Array<{ id: number; path: string }> => ((mem.get(indexKey(SID)) as { snaps?: Array<{ id: number; path: string }> } | undefined)?.snaps ?? []).slice()

test('git checkout -- <file> keeps a copy first; git stash and git reset --hard keep a copy of every changed file; the step still runs', async ($, on) => {
  const mem = setup(on)
  const asked: string[][] = []
  on('process.run', (_$, e) => {
    if (e.argv.includes('--show-toplevel') || e.argv.includes('--name-only')) asked.push(e.argv)
    const out = e.argv.includes('rev-parse') ? '/home/user/app\n' : 'src/a.ts\0src/b.ts\0'
    return { value: { exitCode: 0, stdout: out, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  FILES.set(A, 'a-work\n')
  FILES.set(B, 'b-work\n')
  await $.tool.call({ tool: 'Bash', command: 'git checkout -- src/a.ts' })
  expect(asked).toHaveLength(0)
  expect(snapsOf(mem).map(s => s.path)).toEqual([A])
  await $.tool.call({ tool: 'Bash', command: 'git stash' })
  expect(asked.length).toBeGreaterThan(0)
  const b = snapsOf(mem).find(s => s.path === B)
  expect(b).toBeDefined()
  expect(FILES.get(copyPath('/home/user', SID, b?.id ?? 0))).toBe('b-work\n')
  FILES.set(B, 'b-changed-again\n')
  await $.tool.call({ tool: 'Bash', command: 'git reset --hard' })
  expect(snapsOf(mem).filter(s => s.path === B)).toHaveLength(2)
})

test('with undo Off, git stash keeps no copy and does not ask git', async ($, on) => {
  const mem = setup(on)
  mem.set('cockpit:setting:undo.mode', 'off')
  let ran = 0
  on('process.run', (_$, e) => {
    if (e.argv.includes('--show-toplevel') || e.argv.includes('--name-only')) ran += 1
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  FILES.set(A, 'x\n')
  await $.tool.call({ tool: 'Bash', command: 'git stash' })
  expect(ran).toBe(0)
  expect(mem.has(indexKey(SID))).toBe(false)
})

test('"last" is a word of its own: last, last yes', () => {
  expect(parseUndoAsk('last')).toEqual({ kind: 'last', yes: false })
  expect(parseUndoAsk('LAST yes')).toEqual({ kind: 'last', yes: true })
  expect(parseUndoAsk('last maybe')).toMatchObject({ kind: 'bad' })
  expect(parseUndoAsk('last 2')).toMatchObject({ kind: 'bad' })
})

const snap = (id: number, path: string, at: number, tool = 'Edit', kind: 'saved' | 'created' = 'saved'): Snap => ({ id, path, at, tool, kind, hash: `h${id}`, bytes: 1, lines: 1 })

test('the last edits are the oldest copy of each file kept since the message; restore points and checkpoints do not count', () => {
  const idx = { next: 9, snaps: [snap(1, A, NOW - 5000), snap(2, A, NOW + 1000), snap(3, B, NOW + 2000), snap(4, A, NOW + 3000), snap(5, B, NOW + 4000, 'undo'), snap(6, '/c.ts', NOW + 5000, 'checkpoint'), snap(7, '/d.ts', NOW + 6000, 'Bash', 'created')] }
  expect(sinceWants(idx, NOW)).toEqual([{ path: A, snap: 2 }, { path: B, snap: 3 }, { path: '/d.ts', snap: 7 }])
  expect(sinceWants(idx, NOW + 10_000)).toEqual([])
  expect(sinceWants(idx, 0)[0]).toEqual({ path: A, snap: 1 })
  expect(wantsSig(sinceWants(idx, NOW))).toBe(`2:${A}|3:${B}|7:/d.ts`)
})

test('a message marks the moment; /vaken-undo last previews the edits after it, and yes puts those files back', async ($, on) => {
  const mem = setup(on)
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  FILES.set(A, 'a0\n')
  FILES.set(B, 'b0\n')
  await $.tool.call({ tool: 'Write', file_path: A, content: 'a-before-message\n' })
  await CLOCK.advance(1000)
  await $.prompt.submit({ text: 'now fix the other file' } as never)
  expect(mem.get(`cockpit:undo:mark:${SID}`)).toBe(NOW + 1000)
  await $.tool.call({ tool: 'Edit', file_path: B, old_string: 'b0', new_string: 'b1' })
  await $.tool.call({ tool: 'Edit', file_path: B, old_string: 'b1', new_string: 'b2' })
  await $.tool.call({ tool: 'Edit', file_path: A, old_string: 'a-before-message', new_string: 'a-after-message' })
  const preview = await text($, 'vaken-undo', 'last')
  expect(preview).toMatch(/^Preview of undoing the edits since your last message/)
  expect(preview).toMatch(/2 files would change/)
  expect(preview).toMatch(/src\/a\.ts/)
  expect(preview).toMatch(/src\/b\.ts/)
  expect(preview).toMatch(/To go ahead: \/vaken-undo last yes/)
  expect(FILES.get(B)).toBe('b2\n')
  const done = await text($, 'vaken-undo', 'last yes')
  expect(done).toMatch(/Restored 2 files/)
  expect(FILES.get(B)).toBe('b0\n')
  expect(FILES.get(A)).toBe('a-before-message\n')
  expect(whats(mem)).toEqual([RESTORED_WHAT])
  expect(((mem.get('cockpit:ledger:compact') ?? []) as Array<{ detail?: string }>)[0].detail).toBe('edits since your last message: 2 files')
})

test('nothing changed since the message: "last" says so and restores nothing', async ($, on) => {
  const mem = setup(on)
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  FILES.set(A, 'a0\n')
  await $.tool.call({ tool: 'Write', file_path: A, content: 'a1\n' })
  await CLOCK.advance(1000)
  await $.prompt.submit({ text: 'thanks' } as never)
  expect(await text($, 'vaken-undo', 'last')).toMatch(/Nothing has been changed since your last message/)
  expect(await text($, 'vaken-undo', 'last yes')).toMatch(/Nothing has been changed since your last message/)
  expect(FILES.get(A)).toBe('a1\n')
  expect(whats(mem)).toEqual([])
})

test('a change vaken could not keep a copy of since the message: "last" says so and does not say nothing changed', async ($, on) => {
  setup(on)
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  FILES.set(A, 'a0\n')
  FILES.set('/home/user/app/.env', 'X=1\n')
  await $.tool.call({ tool: 'Write', file_path: A, content: 'a1\n' })
  await CLOCK.advance(1000)
  await $.prompt.submit({ text: 'thanks' } as never)
  await CLOCK.advance(1000)
  await $.tool.call({ tool: 'Write', file_path: '/home/user/app/.env', content: 'X=2\n' })
  for (const ask of ['last', 'last yes']) {
    const said = await text($, 'vaken-undo', ask)
    expect(said).not.toMatch(/Nothing has been changed/)
    expect(said).toMatch(/1 file or folder was changed that vaken could not keep a copy of/)
  }
  expect(FILES.get(A)).toBe('a1\n')
})

test('a slash command is not a message: the mark stays; "last yes" needs the same preview first', async ($, on) => {
  const mem = setup(on)
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  FILES.set(A, 'a0\n')
  FILES.set(B, 'x\n')
  await $.prompt.submit({ text: 'first message' } as never)
  await $.prompt.submit({ text: '/vaken-undo' } as never)
  expect(mem.get(`cockpit:undo:mark:${SID}`)).toBe(NOW)
  await $.tool.call({ tool: 'Edit', file_path: A, old_string: 'a0', new_string: 'a1' })
  expect(await text($, 'vaken-undo', 'last yes')).toMatch(/Run the preview first: \/vaken-undo last\./)
  expect(FILES.get(A)).toBe('a1\n')
  await text($, 'vaken-undo', 'last')
  await $.tool.call({ tool: 'Edit', file_path: B, old_string: 'x', new_string: 'y' })
  expect(await text($, 'vaken-undo', 'last yes')).toMatch(/Run the preview first/)
  expect(FILES.get(A)).toBe('a1\n')
})

test('the offer is there only when copies were kept since the last message, and it names the real command', async () => {
  const w = world()
  expect(await undoOffer(w.io)).toEqual({ toast: '', note: '' })
  w.mem.set(markKey(SID), NOW)
  w.mem.set(indexKey(SID), { next: 2, snaps: [snap(1, A, NOW - 1000)] })
  expect(await undoOffer(w.io)).toEqual({ toast: '', note: '' })
  w.mem.set(indexKey(SID), { next: 3, snaps: [snap(1, A, NOW - 1000), snap(2, A, NOW + 1000)] })
  const offer = await undoOffer(w.io)
  expect(offer.toast).toMatch(/\/vaken-undo last/)
  expect(offer.note).toMatch(/\/vaken-undo last/)
  w.io.get = async () => {
    throw new Error('store down')
  }
  expect(await undoOffer(w.io)).toEqual({ toast: '', note: '' })
})
