// The rows are tested alone with sample facts; the file reads with a fake Io (counting reads).
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { posix } from './fspath'
import type { On } from 'claude-code'

import { analyze, dietHeavy, dietParts } from '../hooks/core/diet'
import { CONTEXT_MEANS, contextCardText, contextLoud, contextShort, contextView, keepItems } from '../hooks/core/contextcard'
import type { ContextFacts, DietFacts } from '../hooks/core/contextcard'
import { briefMarkLines } from '../hooks/core/continuity'
import type { BriefFacts } from '../hooks/core/continuity'
import type { Io } from '../hooks/core/io'
import { VIEW_STRINGS } from '../hooks/core/lang'
import { emptyState } from '../hooks/core/proof'
import type { RestVerdict } from '../hooks/core/compactrest'
import { SETTINGS } from '../hooks/core/settings'
import { BRIEF_OPEN } from '../hooks/features/home/actions'
import { CONTEXT_FRESH_MS, contextFactsOf, forgetContext, loadContext } from '../hooks/features/home/context'
import { lineCard } from '../hooks/features/home/linecards'
import { LINE_CARD_IDS, cardLoudness } from '../hooks/features/home/logic'
import type { LoudFacts, View } from '../hooks/features/home/logic'
import type { Prefs } from '../hooks/features/home/prefs'
import { BRIEF_LOOK } from '../hooks/features/home/rowact'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const NOW = Date.parse('2026-10-10T10:00:00Z')
const id = (s: string): string => s

const diet = (over: Partial<DietFacts> = {}): DietFacts => ({ files: 2, size: '3.1k', heavy: false, repeats: 0, lines: ['~/.claude/CLAUDE.md: about 1k tokens, 40 lines', '/work/app/CLAUDE.md: about 2.1k tokens, 90 lines'], advice: [], ...over })
const facts = (over: Partial<ContextFacts> = {}): ContextFacts => ({ brief: { on: true, work: false, unverified: 0 }, keep: { files: 0 }, ...over })
const rest = (ready: boolean): RestVerdict => ({ at: NOW - 3 * MIN, ready, checks: [{ id: 'ended', label: 'The answer ended', ok: ready, value: ready ? 'yes' : 'Claude is working' }] })

test('the short line says only what is true now: heavy files, repeated lines, a good moment, otherwise lean', () => {
  expect(contextShort(facts(), id)).toBe('Context is lean')
  expect(contextShort(facts({ diet: diet() }), id)).toBe('Context is lean')
  expect(contextShort(facts({ diet: diet({ heavy: true, repeats: 3 }) }), id)).toBe('CLAUDE.md is heavy · 3 repeated lines')
  expect(contextShort(facts({ diet: diet({ repeats: 1 }) }), id)).toBe('1 repeated line')
  expect(contextShort(facts({ keep: { files: 4, rest: rest(true) } }), id)).toBe('Good moment to compact')
  expect(contextShort(facts({ keep: { files: 4, rest: rest(false) } }), id)).toBe('Context is lean')
})

test('loud (warn) only for heavy instruction files or a handoff with claims that have no check; calm otherwise', () => {
  expect(contextLoud(undefined)).toBe('none')
  expect(contextLoud(facts({ diet: diet({ repeats: 5 }) }))).toBe('none')
  expect(contextLoud(facts({ diet: diet({ heavy: true }) }))).toBe('heavy')
  const work = { on: true, work: true, unverified: 2 }
  expect(contextLoud(facts({ brief: work }))).toBe('unverified')
  expect(contextLoud(facts({ brief: { ...work, work: false } }))).toBe('none')
  expect(contextLoud(facts({ brief: { ...work, on: false } }))).toBe('none')
  const base: LoudFacts = { limits: [], here: true, others: 1, didToday: 1, proof: 'ok', agents: { any: true, stuck: false }, computer: { gaugeOn: true, full: false }, skillsUsed: true }
  expect((['none', 'heavy', 'unverified'] as const).map(c => cardLoudness({ ...base, context: c }, NOW).context)).toEqual(['calm', 'warn', 'warn'])
})

test('the diet engine\'s own threshold decides heavy: one big file or all of them together', () => {
  const big = (tokens: number): string => 'word '.repeat(Math.ceil((tokens * 4) / 5))
  expect(dietHeavy(analyze([{ path: '/a/CLAUDE.md', text: big(4_100) }]))).toBe(true)
  expect(dietHeavy(analyze([{ path: '/a/CLAUDE.md', text: big(3_000) }, { path: '/b/CLAUDE.md', text: big(3_000) }]))).toBe(false)
  expect(dietHeavy(analyze([{ path: '/a/CLAUDE.md', text: big(3_900) }, { path: '/b/CLAUDE.md', text: big(3_900) }, { path: '/c/CLAUDE.md', text: big(3_900) }]))).toBe(true)
  const r = analyze([{ path: '/h/.claude/CLAUDE.md', text: big(9_000) }])
  expect(dietParts(r, '/h').lines[0]).toMatch(/^~\/\.claude\/CLAUDE\.md: about 9k tokens, 1 lines \(big\)$/)
  expect(dietParts(r, '/h').advice.join(' ')).toMatch(/Together they are heavy/)
})

test('Instructions: the size with the heavy word and the lines in more than one file; no group when no file is there', () => {
  const v = contextView(facts({ diet: diet({ heavy: true, repeats: 2, first: 'always run the tests before you finish', advice: ['Trim it.'] }) }), id)
  expect(v.groups.map(g => g.head)).toEqual(['Instructions', 'Handoff'])
  expect(v.groups[0]?.rows.map(r => [r.key, r.title, r.right])).toEqual([['files', 'Instruction files', 'about 3.1k tokens · heavy'], ['repeats', 'Lines in more than one file', '2 lines']])
  expect(v.groups[0]?.rows[0]?.what).toMatchObject({ facts: diet().lines, setting: 'diet.mode' })
  expect(v.groups[0]?.rows[0]?.what.next).toMatch(/^Trim it\. \/vaken-help run diet has the details\.$/)
  expect(v.groups[0]?.rows[1]?.what.facts).toEqual(['First: "always run the tests before you finish"'])
  expect(contextView(facts({ diet: diet({ repeats: 1 }) }), id).groups[0]?.rows[1]?.right).toBe('1 line')
  const light = contextView(facts({ diet: diet() }), id)
  expect(light.groups[0]?.rows.map(r => r.key)).toEqual(['files'])
  expect(light.groups[0]?.rows[0]?.right).toBe('about 3.1k tokens')
  expect(light.groups[0]?.rows[0]?.what.next).toMatch(/^They look light\. Nothing to trim\./)
  expect(contextView(facts({ diet: diet({ files: 0 }) }), id).groups.map(g => g.head)).toEqual(['Handoff'])
})

test('Memory: the count of notes Claude keeps, only when the index was read', () => {
  expect(contextView(facts(), id).groups.map(g => g.head)).toEqual(['Handoff'])
  const rows = (n: number) => contextView(facts({ memory: { notes: n } }), id).groups.find(g => g.head === 'Notes')?.rows ?? []
  expect(rows(12).map(r => [r.title, r.right])).toEqual([['Notes Claude keeps', '12 notes']])
  expect(rows(1)[0]?.right).toBe('1 note')
  expect(rows(0)[0]?.right).toBe('none yet')
  expect(rows(3)[0]?.press).toBeUndefined()
})

test('Handoff: the brief row presses only when a brief can be made, and shows its marks after a press', () => {
  const brief = (b: Partial<ContextFacts['brief']>) => contextView(facts({ brief: { on: true, work: true, unverified: 0, ...b } }), id).groups.at(-1)?.rows[0]
  expect(brief({ on: false })).toMatchObject({ title: 'Note for the next session', right: 'off' })
  expect(brief({ on: false })?.press).toBeUndefined()
  expect(brief({ on: false })?.what.next).toMatch(/Settings > Prompts and memory/)
  expect(brief({ work: false })).toMatchObject({ right: 'nothing yet' })
  expect(brief({ work: false })?.press).toBeUndefined()
  expect(brief({})).toMatchObject({ right: 'Ready · See first', press: { do: 'brief' } })
  expect(brief({ unverified: 2 })).toMatchObject({ right: '2 not checked yet · See first', press: { do: 'brief' } })
  expect(brief({})?.what.facts).toBeUndefined()
  expect(brief({ preview: ['3 of 5 lines verified', 'Goal: unverified: key words of your first message, not checked'] })?.what.facts).toEqual(['3 of 5 lines verified', 'Goal: unverified: key words of your first message, not checked'])
  const via = lineCard('context', { now: NOW, ledger: [], halted: false, modes: {}, t: id, context: facts({ brief: { on: true, work: true, unverified: 0 } }) })
  expect(via.groups?.at(-1)?.rows[0]).toMatchObject({ key: 'brief', action: BRIEF_LOOK })
  expect(via.groups?.at(-1)?.rows[1]?.action).toBeUndefined()
  expect(`${BRIEF_OPEN}`).toBe('context:brief')
})

test('Handoff: what a compaction keeps, its size and the last look of the Watch or Auto rule', () => {
  expect(keepItems({ files: 0 })).toEqual(['The files changed', 'Decisions made and why', 'The next steps'])
  expect(keepItems({ goal: 'Fix login', branch: 'feat-x', files: 12 })).toEqual(['Goal: Fix login', 'Branch: feat-x', '12 files changed', 'Decisions made and why', 'The next steps'])
  expect(keepItems({ files: 1 })[0]).toBe('1 file changed')
  expect(keepItems({ session: 'Fix login', files: 0 })[0]).toBe('Session: Fix login')
  const off = contextView(facts({ keep: { goal: 'Fix login', files: 2 } }), id).groups.at(-1)?.rows[1]
  expect(off).toMatchObject({ key: 'keep', title: 'Kept when compacted', right: '2 files changed' })
  expect(off?.what.facts?.join(' ')).not.toMatch(/last look/)
  const one = contextView(facts({ keep: { files: 0, rest: rest(true) } }), id).groups.at(-1)?.rows[1]
  expect(one?.right).toBe('a good moment')
  expect(one?.what.facts).toContain('Compact when idle, last look: a good moment.')
  expect(one?.what.facts).toContain('✓ The answer ended: yes')
  const no = contextView(facts({ keep: { files: 0, rest: rest(false) } }), id).groups.at(-1)?.rows[1]
  expect(no?.right).toBe('not yet')
  expect(no?.what.facts).toContain('✗ The answer ended: Claude is working')
  expect(no?.press).toBeUndefined()
})

test('the lines, whats and short stay in step, and the empty card is the honest lean line', () => {
  const v = contextView(facts({ diet: diet({ repeats: 1 }), memory: { notes: 4 } }), id)
  expect(v.whats).toHaveLength(v.lines.length)
  expect(v.whats[0]?.means).toBe(CONTEXT_MEANS)
  expect(v.whats[0]?.facts).toEqual(['1 repeated line'])
  expect(v.lines[0]).toBe('1 repeated line')
  expect(v.lines).toContain('Notes Claude keeps: 4 notes')
  expect(contextView(undefined, id).short).toBe('Context is lean')
  expect(contextView(undefined, id).whats[0]?.facts).toBeUndefined()
})

test('the text twin has the line and each part ending with the command that says more', () => {
  const f = facts({ diet: diet({ heavy: true, repeats: 2 }), memory: { notes: 12 }, brief: { on: true, work: true, unverified: 1 }, keep: { files: 3, rest: rest(true) } })
  expect(contextCardText(f)).toEqual([
    'Memory and notes: CLAUDE.md is heavy · 2 repeated lines · Good moment to compact · /vaken-help run diet',
    'Instructions: 2 files, about 3.1k tokens · heavy, 2 lines in more than one file · /vaken-help run diet',
    'Memory: 12 notes · /vaken-memory',
    'Note for the next session: 1 not checked yet · /vaken-help run brief',
    'Kept when compacted: 3 files changed · a good moment · /vaken-compact',
  ])
  expect(contextCardText(undefined)).toEqual([])
  expect(contextCardText(facts())).toEqual(['Memory and notes: Context is lean · /vaken-help run diet', 'Note for the next session: nothing yet · /vaken-help run brief', 'Kept when compacted · /vaken-compact'])
})

const briefFacts = (over: Partial<BriefFacts> = {}): BriefFacts => ({ now: NOW, cwd: '/work/app', proof: { ...emptyState(), edits: 2, files: ['a', 'b'], goal: { text: 'Fix the login', setAt: NOW, how: 'first' } }, edited: [], gitBranch: 'feat-x', gitFiles: [], ...over })

test('the brief\'s marks: one line per claim with its mark, and how many are verified', () => {
  const m = briefMarkLines(briefFacts())
  expect(m.total).toBe(m.lines.length)
  expect(m.lines[0]).toBe('Goal: unverified: key words of your first message, not checked')
  expect(m.lines).toContain('Branch: verified: git')
  expect(m.verified).toBe(m.lines.filter(l => /: verified: /.test(l)).length)
  expect(m.verified).toBeLessThan(m.total)
  const blind = briefMarkLines(briefFacts({ gitBranch: undefined, gitFiles: undefined, recordBranch: 'feat-x' }))
  expect(blind.lines).toContain('Branch: unverified: git not read')
  expect(blind.lines).toContain('Files changed: unverified: git not read')
})

const prefsOf = (over: Partial<Prefs> = {}): Prefs => ({ values: {}, ...over }) as unknown as Prefs
const viewOf = (branch?: string, title?: string): View => ({ now: NOW, here: { rec: { ...(branch === undefined ? {} : { branch }), ...(title === undefined ? {} : { title }) } } }) as unknown as View

test('the facts from the pane: work to hand off, claims with no check, the keep-list and the rest rule', () => {
  expect(contextFactsOf(viewOf(), prefsOf()).brief).toEqual({ on: true, work: false, unverified: 0 })
  const proof = { ...emptyState(), edits: 3, files: ['a', 'b', 'c'], last: { unproven: ['x', 'y'] } } as unknown as Prefs['proof']
  const f = contextFactsOf(viewOf('feat-x', 'Fix login'), prefsOf({ proof, rest: rest(true), briefMarks: ['1 of 2 lines verified'], values: { 'brief.mode': 'on' } }))
  expect(f.brief).toEqual({ on: true, work: true, unverified: 2, preview: ['1 of 2 lines verified'] })
  expect(f.keep).toEqual({ session: 'Fix login', branch: 'feat-x', files: 3, rest: rest(true) })
  const goaled = contextFactsOf(viewOf('feat-x', 'Fix login'), prefsOf({ proof: { ...(proof as object), goal: { text: 'Ship the checkout', setAt: NOW, how: 'typed' } } as unknown as Prefs['proof'] }))
  expect(goaled.keep).toMatchObject({ goal: 'Ship the checkout', files: 3 })
  expect(goaled.keep.session).toBeUndefined()
  expect(contextFactsOf(viewOf(), prefsOf({ values: { 'brief.mode': 'off' }, proof })).brief).toMatchObject({ on: false, unverified: 2 })
  // Claims with no check count only when there is work.
  expect(contextFactsOf(viewOf(), prefsOf({ proof: { ...emptyState(), last: { unproven: ['x'] } } as unknown as Prefs['proof'] })).brief.unverified).toBe(0)
})

function fakeIo(files: Record<string, string>) {
  const reads: string[] = []
  const io = {
    home: async () => '/home/test',
    read: async (path: string) => {
      reads.push(path)
      const text = files[path]
      if (text === undefined) throw new Error('no such file')
      return text
    },
  } as unknown as Io
  return { io, reads }
}
const MEMORY = '# Memory\n- [How I work](feedback-a.md) — short answers\n- [The project](project-b.md) — where it stands\nnot a note\n'

test('the files are read once and kept for a few minutes; hidden reads nothing; a file that is not there is left out', async () => {
  forgetContext()
  const f = fakeIo({ '/work/app/CLAUDE.md': `# Rules\n${'Always run the tests before you say it is done.\n'.repeat(2)}`, '/home/test/.claude/CLAUDE.md': 'Always run the tests before you say it is done.\n', '/home/test/.claude/projects/-work-app/memory/MEMORY.md': MEMORY })
  expect(await loadContext(f.io, true, '/work/app', '/work/app', NOW)).toBeUndefined()
  expect(await loadContext(f.io, false, '', '', NOW)).toBeUndefined()
  expect(f.reads).toEqual([])
  const a = await loadContext(f.io, false, '/work/app', '/work/app', NOW)
  expect(a?.diet).toMatchObject({ files: 2, heavy: false, repeats: 1, first: 'always run the tests before you say it is done.' })
  expect(a?.memory).toEqual({ notes: 2 })
  const n = f.reads.length
  expect(n).toBeGreaterThan(0)
  expect(await loadContext(f.io, false, '/work/app', '/work/app', NOW + CONTEXT_FRESH_MS - 1)).toBe(a)
  expect(f.reads.length).toBe(n)
  await loadContext(f.io, false, '/work/app', '/work/app', NOW + CONTEXT_FRESH_MS)
  expect(f.reads.length).toBe(2 * n)
  const w = await loadContext(f.io, false, '/work/app/.claude/worktrees/wt', '/work/app', NOW)
  expect(w?.memory).toEqual({ notes: 2 })
  const none = await loadContext(fakeIo({}).io, false, '/work/other', '/work/other', NOW)
  expect(none).toEqual({ diet: { files: 0, size: '0', heavy: false, repeats: 0, lines: [], advice: [] } })
  forgetContext()
})

test('the card is a line card with its own Show or Hide, a setting note of 12 words or fewer, and every new word has a Swedish line', () => {
  expect(LINE_CARD_IDS).toContain('context')
  const s = SETTINGS.find(x => x.key === 'cards.context')
  expect(s).toMatchObject({ label: 'Memory and notes', default: 'auto' })
  expect(s?.note.split(/\s+/).length).toBeLessThanOrEqual(12)
  expect(SETTINGS.find(x => x.key === 'detail.context')).toMatchObject({ label: 'Memory and notes' })
  const words = englishOf('context')
  expect(words.filter(w => !VIEW_STRINGS.includes(w))).toEqual([])
  expect(words.filter(w => (SV[w] ?? '') === '')).toEqual([])
  for (const w of ['Notes', 'Preview', 'not yet', 'a good moment', 'Compact when idle, last look:']) expect(SV[w] ?? '').not.toBe('')
  const sv = contextView(facts({ diet: diet({ heavy: true, repeats: 2 }), memory: { notes: 3 }, brief: { on: true, work: true, unverified: 0 }, keep: { files: 0, rest: rest(true) } }), w => SV[w] ?? w)
  expect(sv.short).toBe('CLAUDE.md är tung · 2 upprepade rader · Bra stund att komprimera')
  expect(sv.groups.map(g => g.head)).toEqual(['Instruktioner', 'Anteckningar', 'Överlämning'])
  expect(sv.groups.flatMap(g => g.rows.map(r => r.right))).toEqual(['ungefär 3.1k tokens · tung', '2 rader', '3 anteckningar', 'Klar · Visa först', 'en bra stund'])
})

const HOUR = 60 * MIN
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }
const rec = (sid: string, now: number, over: Record<string, unknown> = {}) => ({ sessionId: sid, cwd: `/work/${sid}`, model: 'm', state: 'idle', startedAt: now - 5 * HOUR, updatedAt: now - 2000, lastEventAt: now - 2000, stateSince: now - 3 * MIN, ...over })

function harness(on: On, seed: Record<string, unknown>, files: Record<string, string>) {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', 'cockpit:setting:detail': 'explained', ...seed }))
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', (_$, e) => {
    const out = e.argv[0] === 'git' && e.argv[1] === 'rev-parse' ? 'feat-x\n' : ''
    return { value: { exitCode: 0, stdout: out, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  const writes: string[] = []
  on('fs.read', (_$, e) => {
    const text = files[posix(e.path)]
    if (text === undefined) throw new Error('no such file')
    return { value: text } as never
  })
  on('fs.write', (_$, e) => {
    writes.push(posix(e.path))
    return { value: undefined } as never
  })
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  return { mem, toasts, writes }
}
const big = (tokens: number): string => `${'word '.repeat(Math.ceil((tokens * 4) / 5))}\n`
const world = (now: number, over: Record<string, unknown> = {}) => ({
  'cockpit:firstrun': 'done',
  'cockpit:setting:detail.context': 'explained',
  'cockpit:session:test-session': rec('test-session', now, { cwd: '/work/app', title: 'Fix login', branch: 'feat-x' }),
  'cockpit:proof:test-session': { ...emptyState(), seq: 3, lastEditSeq: 2, edits: 2, files: ['a1', 'b2'], turns: 1 },
  ...over,
})
const FILES = { '/work/app/CLAUDE.md': big(9_000), '/home/test/.claude/projects/-work-app/memory/MEMORY.md': MEMORY }
const textOf = async (ui: { find: (q: unknown) => Promise<unknown> }, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })

test('the pane shows the card with the files read, the notes counted and the handoff; the brief row shows its marks and writes nothing', { timeoutMs: 15_000 }, async ($, on) => {
  forgetContext()
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = harness(on, world(NOW), FILES)
  const ui = await mountPane($)
  expect(await textOf(ui, /^Memory and notes$/)).toBe(true)
  expect(await textOf(ui, /^Instruction files$/)).toBe(true)
  expect(await textOf(ui, /^about 9k tokens · heavy$/)).toBe(true)
  expect(await textOf(ui, /^Notes Claude keeps$/)).toBe(true)
  expect(await textOf(ui, /^2 notes$/)).toBe(true)
  expect(await textOf(ui, /^Note for the next session$/)).toBe(true)
  expect(await textOf(ui, /^Ready · See first$/)).toBe(true)
  expect(await textOf(ui, /^Kept when compacted$/)).toBe(true)
  expect(await textOf(ui, /^2 files changed$/)).toBe(true)
  await ui.press({ key: 'press-ol-context:brief-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^\d+ of \d+ lines verified$/)).toBe(true)
  expect(await textOf(ui, /^Branch: verified: git$/)).toBe(true)
  expect(w.writes).toEqual([])
  expect(`${BRIEF_OPEN}`).toBe('context:brief')
  await ui.press({ key: 'press-ol-context:brief-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /lines verified$/)).toBe(false)
  await ui.unmount()
  forgetContext()
})

test('with Watch only the Kept when compacted row carries the rest rule\'s last look', { timeoutMs: 15_000 }, async ($, on) => {
  forgetContext()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const seed = world(NOW, { 'cockpit:setting:compact.mode': 'watch', 'cockpit:compact:rest:test-session': rest(true) })
  harness(on, seed, FILES)
  const ui = await mountPane($)
  expect(await textOf(ui, /^2 files changed · a good moment$/)).toBe(true)
  await ui.unmount()
  forgetContext()
})

test('no line twice: the rest rule\'s last look is on this card, and on the This session card only while this one is hidden', { timeoutMs: 15_000 }, async ($, on) => {
  forgetContext()
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const seed = world(NOW, { 'cockpit:setting:compact.mode': 'watch', 'cockpit:compact:rest:test-session': rest(true) })
  const w = harness(on, seed, FILES)
  const look = /^Compact when idle, last look: a good moment\.$/
  const ui = await mountPane($)
  await ui.press({ key: 'press-ol-here-0' })
  await clock.settle()
  await ui.redraw()
  expect(await ui.find({ key: 'w-here-open' })).toBeDefined()
  expect(await textOf(ui, look)).toBe(false)
  await ui.press({ key: 'press-ol-here-0' })
  await clock.settle()
  await ui.unmount()
  w.mem.set('cockpit:setting:cards.context', 'hide')
  const hidden = await mountPane($)
  await hidden.press({ key: 'press-ol-here-0' })
  await clock.settle()
  await hidden.redraw()
  expect(await hidden.find({ key: 'w-here-open' })).toBeDefined()
  expect(await textOf(hidden, look)).toBe(true)
  await hidden.press({ key: 'press-ol-here-0' })
  await clock.settle()
  await hidden.unmount()
  forgetContext()
})
