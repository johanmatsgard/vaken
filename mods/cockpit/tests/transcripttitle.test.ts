import { expect } from 'claude-code/testing'
import { test } from './slow'

import type { AppSessions } from '../hooks/core/appsessions'
import { HEAD_BYTES, LOOKUPS_PER_REFRESH, TAIL_BYTES, forgetTitles, lastTitleIn, slugOf, transcriptPath, transcriptTitle, windowCall, withTranscriptTitles } from '../hooks/core/transcripttitle'
import type { TitleSource } from '../hooks/core/transcripttitle'
import { buildView } from '../hooks/features/home/logic'
import { posix } from './fspath'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const HOME = '/work/user'
const SID = 'af0c267d-1111-2222-3333-444455556666'
const CWD = '/work/pc-testing'
const PATH = `${HOME}/.claude/projects/-work-pc-testing/${SID}.jsonl`
const MIB = 1024 * 1024
const WHOLE = 320 * 1024

const titleLine = (t: string, sid = SID): string => `${JSON.stringify({ type: 'custom-title', customTitle: t, sessionId: sid })}\n`
const picture = (bytes: number): string => `${JSON.stringify({ type: 'user', message: { content: [{ type: 'image', data: 'A'.repeat(bytes) }] } })}\n`
const filler = (bytes: number): string => {
  let out = ''
  while (out.length < bytes) out += picture(Math.min(200_000, Math.max(20, bytes - out.length - 100)))
  return out
}

const transcript = (size: number, pre: string, post: string): string => pre + filler(size - pre.length - post.length) + post

type Fake = { src: TitleSource; stats: () => number; reads: () => number; runs: () => number; bytesOut: () => number; touch: () => void }
function fake(files: Record<string, string>, over: Partial<TitleSource> = {}): Fake {
  let stats = 0
  let reads = 0
  let runs = 0
  let bytesOut = 0
  let mtime = 1000
  const src: TitleSource = {
    home: async () => HOME,
    stat: async p => {
      stats += 1
      const f = files[posix(p)]
      return f === undefined ? undefined : { size: f.length, mtimeMs: mtime }
    },
    list: async dir => [...new Set(Object.keys(files).filter(k => k.startsWith(`${posix(dir)}/`)).map(k => k.slice(posix(dir).length + 1).split('/')[0]))],
    read: async p => {
      reads += 1
      const f = files[posix(p)]
      if (f === undefined) throw new Error('ENOENT')
      if (f.length > 4 * MIB) throw new Error('refused: over 4 MiB')
      bytesOut += f.length
      return f
    },
    run: async argv => {
      runs += 1
      const [where, flag, n, path] = argv
      const f = files[posix(path)]
      if (!['head', 'tail'].includes(where) || flag !== '-c' || f === undefined) return { exitCode: 1, stdout: '', stderr: 'bad' }
      const out = where === 'tail' ? f.slice(Math.max(0, f.length - Number(n))) : f.slice(0, Number(n))
      bytesOut += out.length
      return { exitCode: 0, stdout: out, stderr: '' }
    },
    win: async () => false,
    ...over,
  }
  return { src, stats: () => stats, reads: () => reads, runs: () => runs, bytesOut: () => bytesOut, touch: () => void (mtime += 1) }
}

test('the transcript path is the folder slug under the projects folder, for the Mac and for Windows', () => {
  expect(slugOf('/work/pc-testing')).toBe('-work-pc-testing')
  expect(transcriptPath(HOME, CWD, SID)).toBe(PATH)
  expect(transcriptPath('C:\\Users\\user', 'C:\\work\\pc testing', 'abc')).toBe('C:\\Users\\user\\.claude\\projects\\C--work-pc-testing\\abc.jsonl')
})

test('the last title line of a piece wins; a cut line, another session, an empty title and a huge line are skipped', () => {
  const text = `{"type":"custom-title","customTitle":"cut off\n${titleLine('First')}${titleLine('Other', 'someone-else')}${titleLine('PC testing')}${titleLine('   ')}`
  expect(lastTitleIn(text, SID)).toBe('PC testing')
  expect(lastTitleIn(titleLine('Only')))
    .toBe('Only')
  expect(lastTitleIn(`${titleLine('x'.repeat(200))}`, SID)?.length).toBe(60)
  expect(lastTitleIn('no title here\n{"type":"user"}\n')).toBeUndefined()
})

test('an 18 MB transcript with the title lines only near the END gives the title, from a bounded tail window, never the whole file', async () => {
  const text = transcript(18 * MIB, '', `${titleLine('Renamed')}${titleLine('PC testing')}`)
  const f = fake({ [PATH]: text })
  forgetTitles()
  expect(await transcriptTitle(f.src, SID, CWD)).toBe('PC testing')
  expect(f.reads()).toBe(0)
  expect(f.runs()).toBe(1)
  expect(f.bytesOut()).toBeLessThanOrEqual(TAIL_BYTES)
})

test('the same with the title lines only near the START: the tail has none, the head window finds it', async () => {
  const text = transcript(18 * MIB, `${titleLine('Old')}${titleLine('PC testing')}`, picture(100))
  const f = fake({ [PATH]: text })
  forgetTitles()
  expect(await transcriptTitle(f.src, SID, CWD)).toBe('PC testing')
  expect(f.reads()).toBe(0)
  expect(f.runs()).toBe(2)
  expect(f.bytesOut()).toBeLessThanOrEqual(TAIL_BYTES + HEAD_BYTES)
})

test('a title at both ends: the newest (the tail) wins; no title anywhere gives nothing', async () => {
  const both = fake({ [PATH]: transcript(6 * MIB, titleLine('Start name'), titleLine('Newest name')) })
  forgetTitles()
  expect(await transcriptTitle(both.src, SID, CWD)).toBe('Newest name')
  const none = fake({ [PATH]: transcript(6 * MIB, '', picture(50)) })
  forgetTitles()
  expect(await transcriptTitle(none.src, SID, CWD)).toBeUndefined()
})

test('a small transcript is read by the file call, with no program', async () => {
  const f = fake({ [PATH]: `${picture(1000)}${titleLine('Small one')}` })
  forgetTitles()
  expect(await transcriptTitle(f.src, SID, CWD)).toBe('Small one')
  expect(f.runs()).toBe(0)
  expect(f.reads()).toBe(1)
})

test('a growing live transcript runs the program once within 10 minutes, and again after; a miss is kept the same way', async () => {
  let clock = 0
  const files = { [PATH]: transcript(5 * MIB, '', titleLine('PC testing')) }
  const f = fake(files, { now: async () => clock })
  forgetTitles()
  expect(await transcriptTitle(f.src, SID, CWD)).toBe('PC testing')
  for (let k = 1; k <= 8; k += 1) {
    clock += 60_000
    files[PATH] += picture(500)
    f.touch()
    expect(await transcriptTitle(f.src, SID, CWD)).toBe('PC testing')
  }
  expect(f.runs()).toBe(1)
  clock += 3 * 60_000
  files[PATH] += picture(500)
  f.touch()
  expect(await transcriptTitle(f.src, SID, CWD)).toBe('PC testing')
  expect(f.runs()).toBe(2)
  clock += 60 * 60_000
  expect(await transcriptTitle(f.src, SID, CWD)).toBe('PC testing')
  expect(f.runs()).toBe(2)
  const g = fake({ [PATH]: transcript(5 * MIB, '', picture(50)) }, { now: async () => clock })
  forgetTitles()
  expect(await transcriptTitle(g.src, SID, CWD)).toBeUndefined()
  const missRuns = g.runs()
  clock += 5 * 60_000
  g.touch()
  expect(await transcriptTitle(g.src, SID, CWD)).toBeUndefined()
  expect(g.runs()).toBe(missRuns)
  clock += 6 * 60_000
  g.touch()
  expect(await transcriptTitle(g.src, SID, CWD)).toBeUndefined()
  expect(g.runs()).toBeGreaterThan(missRuns)
})

test('no folder known, or a folder name the engine spelled another way: the projects folders are looked through', async () => {
  const f = fake({ [`${HOME}/.claude/projects/other-slug/${SID}.jsonl`]: titleLine('Found by listing') })
  forgetTitles()
  expect(await transcriptTitle(f.src, SID, '')).toBe('Found by listing')
  forgetTitles()
  expect(await transcriptTitle(f.src, SID, CWD)).toBe('Found by listing')
  forgetTitles()
  expect(await transcriptTitle(fake({}).src, SID, CWD)).toBeUndefined()
})

test('a failing program, a missing file or a refused read gives nothing and never throws', async () => {
  forgetTitles()
  const big = transcript(5 * MIB, '', titleLine('X'))
  const bad = fake({ [PATH]: big }, { run: async () => { throw new Error('no such program') } })
  expect(await transcriptTitle(bad.src, SID, CWD)).toBeUndefined()
  const gone = fake({}, { home: async () => { throw new Error('no home') } })
  expect(await transcriptTitle(gone.src, SID, CWD)).toBeUndefined()
})

test('a window is one fixed program with the path as data: an argument on the Mac, a variable on Windows (the script never holds it)', () => {
  expect(windowCall(false, 'tail', 100, '/work/a b/x.jsonl')).toEqual({ argv: ['tail', '-c', '100', '/work/a b/x.jsonl'] })
  const w = windowCall(true, 'head', 100, "C:\\Users\\o'brien\\$x.jsonl")!
  expect(w.argv[0]).toBe('powershell.exe')
  expect(w.argv.join(' ')).not.toContain('brien')
  expect(w.env).toEqual({ COCKPIT_TT_0: "C:\\Users\\o'brien\\$x.jsonl", COCKPIT_TT_N: '100', COCKPIT_TT_M: 'head' })
  expect(windowCall(false, 'tail', 1, 'a\nb')).toBeUndefined()
})

test('a session the app gave no title for is named from its transcript, in the same list, and the row shows it; the app\'s own titles stay', async () => {
  const f = fake({ [PATH]: transcript(18 * MIB, '', titleLine('PC testing')) })
  forgetTitles()
  const list: AppSessions = {
    at: NOW,
    sessions: [
      { id: `local_${SID}`, title: '', cwd: CWD, isRunning: false },
      { id: 'local_other', title: 'Release notes', cwd: '/work/other', isRunning: false },
    ],
  }
  const rec = (id: string, cwd: string) => ({ sessionId: id, cwd, model: 'm', state: 'idle' as const, startedAt: NOW - 1000, updatedAt: NOW - 1000, lastEventAt: NOW - 1000, stateSince: NOW - 1000 })
  const named = await withTranscriptTitles(list, [rec(SID, CWD), rec('other', '/work/other')], f.src)
  expect(named.sessions.find(s => s.id === `local_${SID}`)?.title).toBe('PC testing')
  expect(named.sessions.find(s => s.id === 'local_other')?.title).toBe('Release notes')
  expect(f.runs()).toBe(1)
  const view = buildView([rec(SID, CWD), rec('other', '/work/other')], NOW, 'x', undefined, undefined, undefined, named)
  expect(view.idle.map(r => r.name).sort()).toEqual(['PC testing', 'Release notes'])
  // the list did not hold the session at all: it is added under its engine id
  const added = await withTranscriptTitles({ at: NOW, sessions: [] }, [rec(SID, '')], f.src)
  expect(added.sessions).toEqual([{ id: SID, title: 'PC testing', cwd: '', isRunning: false }])
  expect(buildView([rec(SID, '')], NOW, 'x', undefined, undefined, undefined, added).idle[0].name).toBe('PC testing')
  // nothing found: the same list comes back, and the row falls back to its folder, then the word Session (never an id)
  const none = fake({})
  forgetTitles()
  expect(await withTranscriptTitles(list, [rec(SID, CWD)], none.src)).toBe(list)
  expect(buildView([rec(SID, '')], NOW, 'x').idle[0].name).toBe('Session')
})

test('at most a few program runs happen in one refresh; sessions answered from the kept titles are not counted', async () => {
  const files: Record<string, string> = {}
  const mine = Array.from({ length: LOOKUPS_PER_REFRESH + 8 }, (_, k) => ({ sessionId: `s${k}`, cwd: `/work/p${k}` }))
  for (const m of mine) files[`${HOME}/.claude/projects/${m.cwd.replace(/[^A-Za-z0-9]/g, '-')}/${m.sessionId}.jsonl`] = transcript(WHOLE + 1000, '', titleLine(`Name ${m.sessionId}`, m.sessionId))
  const f = fake(files)
  forgetTitles()
  const out = await withTranscriptTitles({ at: NOW, sessions: [] }, mine, f.src)
  expect(out.sessions.length).toBe(LOOKUPS_PER_REFRESH)
})
