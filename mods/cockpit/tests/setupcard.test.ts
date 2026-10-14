// The Agent setup card: the files that follow from the person's choices, the comparison with what is on disk, the conflicts.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import type { Io } from '../hooks/core/io'
import { VIEW_STRINGS } from '../hooks/core/lang'
import { SETTINGS, defaults } from '../hooks/core/settings'
import {
  AGENT_NAME, BEGIN, END, MARK, SETUP_SETTINGS, blockOf, blockText, capChoiceFor, capNoteOf, conflictsOf, desired, lineDiff, nextText, parseAgentCap, parseScope, setupCardText, setupItems, setupLoud, setupShort, setupSummary, setupView, stateOf,
} from '../hooks/core/setupcard'
import type { Disk, SetupFacts, SetupRead } from '../hooks/core/setupcard'
import { setupRun } from '../hooks/features/setup'
import { readOne, readSetup, setSetupExists, writeItem } from '../hooks/features/setupfiles'
import { bindSafeFs } from '../hooks/core/safewrite'
import { memSafeFs } from './safefs'
import { lineCard } from '../hooks/features/home/linecards'
import { CARD_IDS, LINE_CARD_IDS, cardLoudness } from '../hooks/features/home/logic'
import type { LoudFacts } from '../hooks/features/home/logic'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const NOW = Date.parse('2026-10-10T12:00:00Z')
const HOME = '/home/test'
const ROOT = '/work/app'
const id = (s: string): string => s
const vals = (over: Record<string, string> = {}): Record<string, string> => ({ ...defaults(), ...over })

function world(files: Record<string, string> = {}, failRead: string[] = []) {
  const disk = new Map<string, string>(Object.entries(files))
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom'], ['cockpit:setting:detail', 'explained']])
  const writes: string[] = []
  setSetupExists(async p => disk.has(p) || failRead.includes(p))
  const io: Io = {
    now: async () => NOW,
    home: async () => HOME,
    sessionId: async () => 'me',
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, JSON.parse(JSON.stringify(value))),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async path => {
      if (failRead.includes(path)) throw new Error('permission denied')
      const t = disk.get(path)
      if (t === undefined) throw new Error('ENOENT: no such file')
      return t
    },
    write: async (path, text) => {
      writes.push(path)
      disk.set(path, text)
    },
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  const links = new Map<string, string | undefined>()
  bindSafeFs(io, memSafeFs(() => disk.keys(), links))
  return { disk, mem, io, writes, links }
}
const RES = `${HOME}/.claude/agents/vaken-researcher.md`
const PRES = `${ROOT}/.claude/agents/vaken-researcher.md`
const PMD = `${ROOT}/CLAUDE.md`
const on = (over: Record<string, string> = {}): Record<string, string> => vals({ 'setup.apply': 'on', ...over })

test('desired, This project: four agent files in the project agents folder and a marked block in the project CLAUDE.md; the starter names are not used', () => {
  const d = desired(vals(), HOME, ROOT, 'project')
  expect(d.map(x => x.path)).toEqual([PRES, `${ROOT}/.claude/agents/vaken-builder.md`, `${ROOT}/.claude/agents/vaken-code-reviewer.md`, `${ROOT}/.claude/agents/vaken-fixer.md`, PMD])
  expect(Object.values(AGENT_NAME)).not.toContain('vaken-lookup')
  expect(AGENT_NAME.reviewer).not.toBe('vaken-reviewer')
  const r = d[0]!
  expect(r.text).toMatch(/^---\nname: vaken-researcher\ndescription: .+\nmodel: haiku\ntools: Read, Grep, Glob, WebSearch, WebFetch\nmanaged-by: vaken\n---\n/)
  expect(r.text).toContain(MARK)
  expect(desired(vals({ 'runner.builder': 'opus' }), HOME, ROOT, 'project')[1]!.text).toMatch(/\nmodel: opus\n(?!tools)/)
})

test('desired, All projects: the agents folder in the home folder, no CLAUDE.md block (the global CLAUDE.md is never written); This session: nothing', () => {
  const all = desired(vals(), HOME, ROOT, 'all')
  expect(all.map(x => x.path)).toEqual(Object.values(AGENT_NAME).map(n => `${HOME}/.claude/agents/${n}.md`))
  expect(all.some(x => x.kind === 'block')).toBe(false)
  expect(desired(vals(), HOME, ROOT, 'session')).toEqual([])
  expect(desired(vals(), HOME, undefined, 'project')).toEqual([])
  expect(parseScope(undefined)).toBe('project')
  expect(parseScope('all')).toBe('all')
})

test('the CLAUDE.md block is under 10 lines and every line follows from a choice', () => {
  const full = blockText(vals({ 'cap.mode': 'hold', 'cap.max': '4', 'plan.first': 'ask', 'compact.mode': 'auto', 'route.mode': 'auto', 'runner.researcher': 'sonnet' }))
  const lines = full.split('\n')
  expect(lines.length).toBeLessThan(10)
  expect(lines[0]).toBe(BEGIN)
  expect(lines[lines.length - 1]).toBe(END)
  expect(full).toContain('Run at most 4 agents at once.')
  expect(full).toContain('Start agents one at a time.')
  expect(full).toContain('Run only the tests of the files you touched.')
  expect(full).toContain('write a short plan and wait for a yes')
  expect(full).toContain('keep the goal, the branch, the changed files and the next steps')
  expect(full).toContain('Send lookup agents to the sonnet model.')
  const lean = blockText(vals({ 'cap.mode': 'off', 'plan.first': 'off', 'compact.mode': 'off', 'route.mode': 'suggest' }))
  expect(lean).not.toMatch(/at most|plan|compacted|lookup/)
  expect(lean).toContain('Start agents one at a time.')
})

test('the state of an item: missing, matches, differs, yours, cannot read', () => {
  const [res, , , , md] = desired(vals(), HOME, ROOT, 'project') as [ReturnType<typeof desired>[number], ...ReturnType<typeof desired>]
  expect(stateOf(res, null)).toBe('missing')
  expect(stateOf(res, res.text)).toBe('matches')
  expect(stateOf(res, res.text.replace('model: haiku', 'model: opus'))).toBe('differs')
  // a file without the marker is the person's, even if it looks alike
  expect(stateOf(res, res.text.replace(`${MARK}\n`, ''))).toBe('yours')
  expect(stateOf(res, false)).toBe('unreadable')
  expect(stateOf(md!, null)).toBe('missing')
  expect(stateOf(md!, `${md!.text}\n`)).toBe('matches')
  expect(stateOf(md!, `My rules\n\n${md!.text}\n`)).toBe('matches')
  expect(stateOf(md!, `My rules\n\n${md!.text.replace('one at a time', 'two at a time')}\n`)).toBe('differs')
  expect(stateOf(md!, '# My own file\nBe kind.\n')).toBe('yours')
})

test('the line diff shows only what differs, and cuts a long one', () => {
  expect(lineDiff('a\nb\nc', 'a\nB\nc')).toEqual(['- b', '+ B'])
  expect(lineDiff('', 'x\ny')).toEqual(['+ x', '+ y'])
  expect(lineDiff('same', 'same')).toEqual([])
  const long = lineDiff('', Array.from({ length: 30 }, (_, n) => `l${n}`).join('\n'), 5)
  expect(long.length).toBe(6)
  expect(long[5]).toBe('... 25 more lines')
})

test('the next text of the block keeps the owner text: replaced in place, or added at the end', () => {
  const md = desired(vals(), HOME, ROOT, 'project')[4]!
  const old = `Before\n${md.text.replace('one at a time', 'two at a time')}\nAfter\n`
  const next = nextText(md, old)
  expect(next.startsWith('Before\n')).toBe(true)
  expect(next.endsWith('\nAfter\n')).toBe(true)
  expect(blockOf(next)?.body).toBe(md.text)
  expect(nextText(md, '# Mine\nBe kind.\n')).toBe(`# Mine\nBe kind.\n\n${md.text}\n`)
  expect(nextText(md, null)).toBe(`${md.text}\n`)
})

test('"at most N agents" is read from lines that speak of agents, in words or digits; the vaken block is not read', () => {
  expect(parseAgentCap('Run at most 2 agents at once.')).toBe(2)
  expect(parseAgentCap('- Run two or three agents at once. Never more than three unless I say so.')).toBe(3)
  expect(parseAgentCap('No more than 5 agents')).toBe(5)
  expect(parseAgentCap('Max 4 agents')).toBe(4)
  expect(parseAgentCap('Never more than three files per commit')).toBeUndefined()
  expect(parseAgentCap('Be kind')).toBeUndefined()
  expect(capChoiceFor(5)).toBe(4)
  expect(capChoiceFor(1)).toBe(2)
  expect(capChoiceFor(7)).toBe(6)
})

function facts(files: Record<string, string | null | false>, over: Record<string, string> = {}, scope: SetupRead['scope'] = 'project', open?: string): SetupFacts {
  const disk: Disk = { ...files }
  const values = vals({ 'setup.scope': scope, ...over })
  return { values, read: { home: HOME, root: ROOT, scope, disk }, ...(open === undefined ? {} : { open }) }
}

test('conflicts: the cap in the owner CLAUDE.md (not the vaken block), a kept number, and an agent file with another model', () => {
  const f = facts({ [PMD]: 'Never more than two agents at once.\n' }, { 'cap.max': '3' })
  const c = conflictsOf(f)
  expect(c).toEqual([{ kind: 'cap', n: 2, use: 2, now: 3, from: 'CLAUDE.md' }])
  expect(conflictsOf(facts({ [PMD]: 'at most 3 agents' }, { 'cap.max': 'n3' }))).toEqual([])
  expect(conflictsOf(facts({ [PMD]: blockText(vals({ 'cap.max': '6' })) }, { 'cap.max': '2' }))).toEqual([])
  expect(conflictsOf(facts({ [`${HOME}/.claude/CLAUDE.md`]: 'Use at most 4 agents' }, { 'cap.max': '3' })).length).toBe(1)
  expect(conflictsOf(facts({ [PMD]: 'at most 2 agents' }, { 'cap.max': 'n3', 'setup.keep': '2' }))).toEqual([])
  expect(conflictsOf(facts({ [PMD]: 'at most 2 agents' }, { 'cap.max': 'n3', 'cap.mode': 'off' }))).toEqual([])
  const auto = facts({ [PMD]: 'Never more than 3 helpers at once.\n' })
  expect(auto.values['cap.max']).toBe('auto')
  expect(conflictsOf(auto)).toEqual([])
  expect(capNoteOf(auto)).toEqual({ n: 3, from: 'CLAUDE.md' })
  expect(capNoteOf(facts({ [PMD]: 'at most 3 agents' }, { 'cap.max': 'n3' }))).toBeUndefined()
  const rows = setupView(auto, id).groups.flatMap(g => g.rows)
  expect(rows.find(r => r.key === 'cap-info')).toMatchObject({ title: 'Your instructions say at most 3 agents; vaken follows the computer' })
  expect(rows.find(r => r.key === 'cap-info')?.press).toBeUndefined()
  expect(setupShort(auto, id)).not.toMatch(/to decide/)
  expect(blockText(vals())).toMatch(/only as many agents as the computer has room for/)
  expect(blockText(vals({ 'cap.max': 'n4' }))).toMatch(/at most 4 agents/)
  const m = conflictsOf(facts({ [`${HOME}/.claude/agents/reviewer.md`]: '---\nname: reviewer\nmodel: opus\n---\nHi' }, { 'runner.reviewer': 'haiku' }))
  expect(m).toEqual([{ kind: 'model', role: 'reviewer', name: 'reviewer.md', path: `${HOME}/.claude/agents/reviewer.md`, file: 'opus', map: 'haiku' }])
  expect(conflictsOf(facts({ [`${HOME}/.claude/agents/reviewer.md`]: '---\nmodel: haiku\n---' }, { 'runner.reviewer': 'haiku' }))).toEqual([])
})

const synced = (): Record<string, string> => Object.fromEntries(desired(vals(), HOME, ROOT, 'project').map(d => [d.path, d.text]))

test('the short line: how many are in sync, a conflict, this session, no project, not read', () => {
  expect(setupShort(facts(synced()), id)).toBe('Agent setup: 5 of 5 in sync')
  expect(setupShort(facts({ ...synced(), [PRES]: null }), id)).toBe('Agent setup: 4 of 5 in sync')
  expect(setupShort(facts({ ...synced(), [PMD]: 'at most 2 agents' }, { 'cap.max': 'n3' }), id)).toBe('Agent setup: 1 to decide · 4 of 5 in sync')
  expect(setupShort(facts({}, {}, 'session'), id)).toBe('Agent setup: this session only, nothing is written')
  expect(setupShort({ values: vals() }, id)).toBe('Agent setup: not read yet')
  expect(setupShort({ values: vals(), read: { home: HOME, scope: 'project', disk: {} } }, id)).toBe('Agent setup: no project folder')
  expect(setupShort({ values: vals({ 'setup.scope': 'all' }), read: { home: HOME, root: ROOT, scope: 'project', disk: {} } }, id)).toBe('Agent setup: not read yet')
})

test('off by default: the rows only show what would be done, with no write press', () => {
  expect(defaults()['setup.apply']).toBe('off')
  const v = setupView(facts({ [PRES]: null, [PMD]: 'My own rules' }), id)
  const rows = v.groups.flatMap(g => g.rows)
  expect(rows.every(r => r.press === undefined || r.press.do === 'open')).toBe(true)
  expect(rows.find(r => r.key === 'vaken-researcher')?.right).toBe('missing')
  expect(rows.find(r => r.key === 'claude')?.right).toBe('yours')
  const open = setupView(facts({ [PRES]: null }, {}, 'project', 'setup:vaken-researcher'), id)
  const what = open.groups.flatMap(g => g.rows).find(r => r.key === 'vaken-researcher')?.what
  expect(what?.facts?.[0]).toBe(PRES)
  expect(what?.facts?.some(l => l.startsWith('+ name: vaken-researcher'))).toBe(true)
})

test('on: a missing item has one press (Create); a differing or own item opens first (Update…, Replace…, Add…), then a confirm row and a Keep mine row', () => {
  const f = facts({ ...synced(), [PRES]: null, [`${ROOT}/.claude/agents/vaken-builder.md`]: 'my builder', [PMD]: 'Be kind.\n', [`${ROOT}/.claude/agents/vaken-fixer.md`]: synced()[`${ROOT}/.claude/agents/vaken-fixer.md`]!.replace('opus', 'haiku') }, { 'setup.apply': 'on' })
  const rows = setupView(f, id).groups.flatMap(g => g.rows)
  const by = (k: string) => rows.find(r => r.key === k)!
  expect(by('vaken-researcher')).toMatchObject({ right: 'Create', press: { do: 'write', key: 'vaken-researcher' } })
  expect(by('vaken-builder')).toMatchObject({ right: 'Replace…', press: { do: 'open', key: 'vaken-builder' } })
  expect(by('vaken-fixer')).toMatchObject({ right: 'Update…', press: { do: 'open', key: 'vaken-fixer' } })
  expect(by('claude')).toMatchObject({ right: 'Add…', press: { do: 'open', key: 'claude' } })
  expect(rows.find(r => r.key === 'vaken-builder-yes')).toBeUndefined()
  const open = setupView({ ...f, open: 'setup:vaken-builder' }, id).groups.flatMap(g => g.rows)
  expect(open.find(r => r.key === 'vaken-builder-yes')).toMatchObject({ title: 'Yes, replace (a copy is saved)', press: { do: 'write', key: 'vaken-builder' } })
  expect(open.find(r => r.key === 'vaken-builder-keep')).toMatchObject({ title: 'Keep mine', press: { do: 'close' } })
  const what = open.find(r => r.key === 'vaken-builder')?.what
  expect(what?.facts?.[0]).toBe(`${ROOT}/.claude/agents/vaken-builder.md`)
  expect(what?.facts?.some(l => l.startsWith('- my builder'))).toBe(true)
  expect(what?.means).toMatch(/your own file/)
})

test('This session: the four roles with their models, no file row, nothing to write', () => {
  const v = setupView(facts({}, { 'setup.apply': 'on', 'runner.fixer': 'sonnet' }, 'session'), id)
  const rows = v.groups.flatMap(g => g.rows)
  expect(rows.map(r => r.title)).toEqual(['Researcher · haiku', 'Builder · sonnet', 'Reviewer · haiku', 'Fixer · sonnet'])
  expect(rows.every(r => r.press === undefined && r.right === 'this session')).toBe(true)
})

test('conflict rows: Use sets the cap, Keep remembers, a model conflict follows the owner file; the loudness says conflict, drift or none', () => {
  const f = facts({ ...synced(), [PMD]: 'at most 2 agents' }, { 'cap.max': 'n3' })
  const rows = setupView(f, id).groups.flatMap(g => g.rows)
  expect(rows.find(r => r.key === 'cap-use')).toMatchObject({ title: 'Your instructions say at most 2 agents', right: 'Use 2', press: { do: 'cap', n: 2 } })
  expect(rows.find(r => r.key === 'cap-keep')).toMatchObject({ right: 'Keep', press: { do: 'keepCap', n: 2 } })
  expect(setupLoud(f)).toBe('conflict')
  expect(setupLoud(facts({ ...synced(), [PRES]: synced()[PRES]!.replace('haiku', 'opus') }))).toBe('drift')
  expect(setupLoud(facts(synced()))).toBe('none')
  expect(setupLoud(undefined)).toBe('none')
  const base: LoudFacts = { limits: [], here: false, others: 0, didToday: 0, proof: 'none', agents: { any: false, stuck: false }, computer: { gaugeOn: false, full: false }, skillsUsed: false }
  expect([cardLoudness({ ...base, setup: 'conflict' }, NOW).setup, cardLoudness({ ...base, setup: 'drift' }, NOW).setup, cardLoudness(base, NOW).setup]).toEqual(['warn', 'normal', 'calm'])
})

test('the line card turns a press into the typed action, and the text twin names the command', () => {
  const card = lineCard('setup', { now: NOW, ledger: [], halted: false, modes: {}, t: id, setup: facts({ [PRES]: null }, { 'setup.apply': 'on' }) })
  const row = card.groups?.flatMap(g => g.rows).find(r => r.key === 'vaken-researcher')
  expect(row?.action).toEqual({ kind: 'setup', act: { do: 'write', key: 'vaken-researcher' } })
  expect(setupCardText(facts(synced()))).toEqual(['Agent setup: 5 of 5 in sync (off) · /vaken-help run setup'])
  expect(setupCardText(undefined)).toEqual([])
})

test('off by default writes nothing, whatever the item', async () => {
  const w = world()
  const r = await writeItem(w.io, vals(), HOME, ROOT, 'vaken-researcher', true, 'button')
  expect(r).toMatchObject({ ok: false, wrote: false, why: 'off' })
  expect(w.writes).toEqual([])
})

test('This session writes no file even with the switch on', async () => {
  const w = world()
  const r = await writeItem(w.io, on({ 'setup.scope': 'session' }), HOME, ROOT, 'vaken-researcher', true, 'button')
  expect(r).toMatchObject({ ok: false, why: 'session' })
  expect(w.writes).toEqual([])
})

test('a missing item is created with one press, in the folder of the place chosen, and a ledger line is written', async () => {
  const w = world()
  const project = await writeItem(w.io, on({ 'setup.scope': 'project' }), HOME, ROOT, 'vaken-researcher', false, 'button')
  expect(project).toMatchObject({ ok: true, wrote: true })
  expect(w.disk.get(PRES)).toContain('name: vaken-researcher')
  const all = await writeItem(w.io, on({ 'setup.scope': 'all' }), HOME, ROOT, 'vaken-builder', false, 'typed')
  expect(all.ok).toBe(true)
  expect(w.disk.has(`${HOME}/.claude/agents/vaken-builder.md`)).toBe(true)
  expect(w.disk.has(`${ROOT}/.claude/agents/vaken-builder.md`)).toBe(false)
  expect(w.writes.some(p => p.endsWith('settings.json') || p === `${HOME}/.claude/CLAUDE.md`)).toBe(false)
  const ledger = w.mem.get('cockpit:ledger:compact') as { what: string; detail: string; did: boolean }[]
  expect(ledger.map(e => e.what)).toEqual(['Updated agent setup', 'Updated agent setup'])
  expect(ledger.map(e => e.detail).sort()).toEqual(['vaken-builder', 'vaken-researcher'])
  expect(ledger.every(e => e.did)).toBe(true)
  expect((await writeItem(w.io, on(), HOME, ROOT, 'claude', false, 'button')).ok).toBe(true)
  expect(w.disk.get(PMD)).toBe(`${blockText(on())}\n`)
  // the block is never written for All projects
  expect((await writeItem(w.io, on({ 'setup.scope': 'all' }), HOME, ROOT, 'claude', false, 'button')).why).toBe('none')
})

test('a file of the owner is never replaced on the first press; the second saves a copy first, then writes', async () => {
  const w = world({ [PRES]: 'my own researcher', [PMD]: '# My rules\nBe kind.\n' })
  const first = await writeItem(w.io, on(), HOME, ROOT, 'vaken-researcher', false, 'button')
  expect(first).toMatchObject({ ok: false, wrote: false, why: 'confirm' })
  expect(w.disk.get(PRES)).toBe('my own researcher')
  expect(w.writes).toEqual([])
  const second = await writeItem(w.io, on(), HOME, ROOT, 'vaken-researcher', true, 'button')
  expect(second).toMatchObject({ ok: true, wrote: true, bak: `${PRES}.bak` })
  expect(w.disk.get(`${PRES}.bak`)).toBe('my own researcher')
  expect(w.disk.get(PRES)).toContain(MARK)
  expect(w.writes.indexOf(`${PRES}.bak`)).toBeLessThan(w.writes.indexOf(PRES))
  expect(JSON.stringify(w.mem.get('cockpit:undo:index:me'))).toContain(PRES)
  // a second replace never overwrites the first copy
  w.disk.set(PRES, 'again mine')
  const third = await writeItem(w.io, on(), HOME, ROOT, 'vaken-researcher', true, 'button')
  expect(third.bak).toBe(`${PRES}.bak1`)
  expect(w.disk.get(`${PRES}.bak`)).toBe('my own researcher')
  expect((await writeItem(w.io, on(), HOME, ROOT, 'claude', false, 'button')).why).toBe('confirm')
  expect(w.disk.get(PMD)).toBe('# My rules\nBe kind.\n')
  const added = await writeItem(w.io, on(), HOME, ROOT, 'claude', true, 'button')
  expect(added.bak).toBe(`${PMD}.bak`)
  expect(w.disk.get(PMD)?.startsWith('# My rules\nBe kind.\n\n<!-- cockpit:begin -->')).toBe(true)
  expect(w.disk.get(`${PMD}.bak`)).toBe('# My rules\nBe kind.\n')
})

test('a vaken file that differs also needs the second press; one that matches is left alone; one that cannot be read is never written', async () => {
  const w = world({ [PRES]: desired(on(), HOME, ROOT, 'project')[0]!.text.replace('model: haiku', 'model: opus'), [`${ROOT}/.claude/agents/vaken-fixer.md`]: 'x' }, [`${ROOT}/.claude/agents/vaken-fixer.md`])
  expect((await writeItem(w.io, on(), HOME, ROOT, 'vaken-researcher', false, 'button')).why).toBe('confirm')
  expect((await writeItem(w.io, on(), HOME, ROOT, 'vaken-researcher', true, 'button')).wrote).toBe(true)
  expect(w.disk.get(PRES)).toContain('model: haiku')
  const again = await writeItem(w.io, on(), HOME, ROOT, 'vaken-researcher', true, 'button')
  expect(again).toMatchObject({ ok: true, wrote: false })
  expect((await writeItem(w.io, on(), HOME, ROOT, 'vaken-fixer', true, 'button')).why).toBe('unreadable')
  expect(w.disk.get(`${ROOT}/.claude/agents/vaken-fixer.md`)).toBe('x')
})

test('a write never follows a link: a linked agents folder, a linked file or a link that leads nowhere stops it, and nothing is written', async () => {
  const w = world()
  w.links.set(`${ROOT}/.claude/agents`, '/elsewhere/agents')
  const r = await writeItem(w.io, on(), HOME, ROOT, 'vaken-researcher', true, 'button')
  expect(r).toMatchObject({ ok: false, wrote: false, why: 'link' })
  const w2 = world()
  w2.links.set(PMD, undefined)
  expect((await writeItem(w2.io, on(), HOME, ROOT, 'claude', true, 'button')).why).toBe('link')
  expect([...w.writes, ...w2.writes]).toEqual([])
  expect(await setupRun(w.io, ROOT, 'on')).toMatch(/is on/)
  expect(await setupRun(w.io, ROOT, 'make vaken-researcher yes')).toMatch(/^Nothing was written: vaken-researcher or a folder above it is a link/)
})

test('All projects follows a link in ~/.claude (dotfile tools make them), but not one that leads nowhere or into the project', async () => {
  const all = on({ 'setup.scope': 'all' })
  const linked = world({ '/dotfiles/agents/keep.md': 'x' })
  linked.links.set(`${HOME}/.claude/agents`, '/dotfiles/agents')
  expect(await writeItem(linked.io, all, HOME, ROOT, 'vaken-researcher', false, 'button')).toMatchObject({ ok: true, wrote: true })
  expect(linked.writes).toEqual([RES])
  for (const dangling of ['answers', 'rejects'] as const) {
    const nowhere = world()
    nowhere.links.set(`${HOME}/.claude/agents`, undefined)
    bindSafeFs(nowhere.io, memSafeFs(() => nowhere.disk.keys(), nowhere.links, dangling))
    expect((await writeItem(nowhere.io, all, HOME, ROOT, 'vaken-researcher', false, 'button')).why).toBe('link')
    expect(nowhere.writes).toEqual([])
  }
  const intoProject = world({ [`${ROOT}/.claude/agents/keep.md`]: 'x' })
  intoProject.links.set(`${HOME}/.claude/agents`, `${ROOT}/.claude/agents`)
  expect((await writeItem(intoProject.io, all, HOME, ROOT, 'vaken-researcher', false, 'button')).why).toBe('link')
  expect(intoProject.writes).toEqual([])
  const strict = world({ '/dotfiles/agents/keep.md': 'x' })
  strict.links.set(`${ROOT}/.claude/agents`, '/dotfiles/agents')
  expect((await writeItem(strict.io, on(), HOME, ROOT, 'vaken-researcher', false, 'button')).why).toBe('link')
  expect(strict.writes).toEqual([])
})

test('reading: a missing file is null, another failure is "cannot read", and the card reads only its paths', async () => {
  const w = world({ [PMD]: 'hi' }, [`${HOME}/.claude/CLAUDE.md`])
  expect(await readOne(w.io, PMD)).toBe('hi')
  expect(await readOne(w.io, PRES)).toBeNull()
  expect(await readOne(w.io, `${HOME}/.claude/CLAUDE.md`)).toBe(false)
  const r = await readSetup(w.io, vals(), HOME, ROOT)
  expect(r.scope).toBe('project')
  expect(Object.keys(r.disk).every(p => p.startsWith(HOME) || p.startsWith(ROOT))).toBe(true)
  expect(setupItems({ values: vals(), read: r }).length).toBe(5)
})

test('/vaken-help run setup: lists, switches on, picks the place, creates, and needs "yes yes" to replace', async () => {
  const w = world({ [PRES]: 'mine' })
  const list = await setupRun(w.io, ROOT, '')
  expect(list).toMatch(/Set up agents for me: off/)
  expect(list).toMatch(/vaken-researcher: yours/)
  expect(list).toMatch(/Nothing is written\. \/vaken-help run setup on turns it on/)
  expect(await setupRun(w.io, ROOT, 'make vaken-builder yes')).toMatch(/is off/)
  expect(w.writes).toEqual([])
  expect(await setupRun(w.io, ROOT, 'on')).toMatch(/is on/)
  expect(await setupRun(w.io, ROOT, 'make vaken-builder')).toMatch(/Type \/vaken-help run setup make/)
  expect(await setupRun(w.io, ROOT, 'make vaken-builder yes')).toBe('Wrote vaken-builder.')
  expect(await setupRun(w.io, ROOT, 'make vaken-researcher yes')).toMatch(/exists\. Nothing was written/)
  expect(w.disk.get(PRES)).toBe('mine')
  expect(await setupRun(w.io, ROOT, 'replace vaken-researcher yes')).toMatch(/second yes/)
  expect(await setupRun(w.io, ROOT, 'replace vaken-researcher yes yes')).toMatch(/Your copy is saved as .*\.bak/)
  expect(w.disk.get(`${PRES}.bak`)).toBe('mine')
  expect(await setupRun(w.io, ROOT, 'scope session')).toMatch(/No file is written/)
  expect(await setupRun(w.io, ROOT, 'make vaken-fixer yes')).toMatch(/This session writes no files/)
  expect(w.disk.has(`${ROOT}/.claude/agents/vaken-fixer.md`)).toBe(false)
  expect(await setupRun(w.io, ROOT, 'scope nowhere')).toMatch(/Say where/)
  expect(await setupRun(w.io, ROOT, 'scope all')).toMatch(/all projects/)
})

test('/vaken-help run setup cap use|keep settles a conflict with the owner CLAUDE.md', async () => {
  const w = world({ [PMD]: 'Never more than two agents.\n' })
  w.mem.set('cockpit:setting:cap.max', 'n3')
  expect(await setupRun(w.io, ROOT, '')).toMatch(/Conflict: your CLAUDE\.md says at most 2 agents/)
  expect(await setupRun(w.io, ROOT, 'cap use')).toMatch(/Type \/vaken-help run setup cap/)
  expect(await setupRun(w.io, ROOT, 'cap use yes')).toBe('Agent cap set to 2.')
  expect(w.mem.get('cockpit:setting:cap.max')).toBe('n2')
  const k = world({ [PMD]: 'at most 4 agents' })
  k.mem.set('cockpit:setting:cap.max', 'n3')
  expect(await setupRun(k.io, ROOT, 'cap keep yes')).toBe('Kept the vaken limit of 3.')
  expect(k.mem.get('cockpit:setting:setup.keep')).toBe('4')
  expect(await setupRun(k.io, ROOT, 'cap keep yes')).toBe('No conflict about the agent cap.')
})

test('the card is a line card with its own Show or Hide; the settings are hidden rows, off by default; every new word has a Swedish line', () => {
  expect(LINE_CARD_IDS).toContain('setup')
  expect(CARD_IDS[CARD_IDS.indexOf('agents') + 1]).toBe('setup')
  expect(CARD_IDS).toContain('setup')
  expect(SETTINGS.find(s => s.key === 'cards.setup')?.default).toBe('auto')
  expect(SETTINGS.find(s => s.key === 'detail.setup')).toBeDefined()
  expect(SETUP_SETTINGS.map(s => [s.key, s.default, s.hidden])).toEqual([['setup.apply', 'off', true], ['setup.scope', 'project', true], ['setup.keep', 'none', true]])
  for (const k of englishOf('setup')) {
    expect(VIEW_STRINGS).toContain(k)
    expect(SV[k]).toBe(byEnglish('sv', 'setup')[k])
  }
  expect(byEnglish('sv', 'setup')['Vaken can write agent files that follow your choices. It asks before it replaces a file. Where: All is every project (your home folder), Project is this project, Session is this session.']).toBeDefined()
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }

function harness(o: On, seed: Record<string, unknown>) {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', 'cockpit:setting:detail': 'explained', ...seed }))
  const files = new Map<string, string>()
  o('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  o('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  o('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  o('store.keys', () => ({ value: [...mem.keys()] }) as never)
  o('session.id', () => ({ value: 'test-session' }))
  o('session.model', () => ({ value: 'claude-opus-5' }))
  o('session.cwd', () => ({ value: ROOT }) as never)
  o('session.root', () => ({ value: ROOT }) as never)
  o('command.register', () => ({ value: { command: 'x' } }))
  o('ui.invalidate', () => ({ value: undefined }))
  o('ui.panes', () => ({ value: [] }) as never)
  o('ui.open', () => ({ value: { isPlaced: true } }) as never)
  o('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  o('tool.call', () => ({ result: { text: 'ok' } }) as never)
  o('fs.read', (_$, e) => {
    const t = files.get((e as { path: string }).path)
    if (t === undefined) throw new Error('ENOENT: no such file')
    return { value: t } as never
  })
  o('fs.write', (_$, e) => {
    files.set((e as { path: string }).path, (e as { text: string }).text)
    return { value: undefined } as never
  })
  o('fs.exists', (_$, e) => ({ value: files.has((e as { path: string }).path) }) as never)
  o('ui.toast', () => ({ value: undefined }) as never)
  return { mem, files }
}
const textOf = async (ui: { find: (q: unknown) => Promise<unknown> }, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined

test('the pane shows the card with the opt-in line and, off, the files as missing; nothing is written', { timeoutMs: 15_000 }, async ($, o) => {
  const clock = mock.clock(o, { now: NOW })
  mock.env(o, { HOME })
  const w = harness(o, {
    'cockpit:firstrun': 'done',
    'cockpit:setting:detail.setup': 'explained',
    'cockpit:setting:cards.setup': 'show',
    'cockpit:session:test-session': { sessionId: 'test-session', cwd: ROOT, model: 'm', state: 'idle', startedAt: NOW - 3_600_000, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 180_000, title: 'Fix login', branch: 'feat-x' },
  })
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await textOf(ui, /^Agent setup$/)).toBe(true)
  expect(await textOf(ui, /^Set up agents for me$/)).toBe(true)
  expect(await textOf(ui, /Vaken can write agent files that follow your choices/)).toBe(true)
  expect(await textOf(ui, /^4 agent files missing · instructions missing$/)).toBe(true)
  expect(await textOf(ui, /^vaken-researcher · haiku$/)).toBe(false)
  expect(await ui.find({ key: 'morel-setup-setup-details' })).toBeDefined()
  await ui.press({ key: 'morel-setup-setup-details' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^vaken-researcher · haiku$/)).toBe(true)
  expect(await textOf(ui, /missing/)).toBe(true)
  await ui.press({ key: 'morel-setup-setup-details' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^vaken-researcher · haiku$/)).toBe(false)
  expect(w.files.size).toBe(0)
  await ui.unmount()
})

test('off: one summary row, the conflicts stay visible, the file rows wait behind Details; on: every row shows', () => {
  const card = lineCard('setup', { now: NOW, ledger: [], halted: false, modes: {}, t: id, setup: facts({ [PRES]: null }) })
  const groups = card.groups ?? []
  expect(groups[0]).toMatchObject({ head: '', toggle: 'setup-details', rows: [{ key: 'summary', title: '4 agent files missing · instructions missing' }] })
  expect(groups.filter(g => g.behind === 'setup-details').map(g => g.head)).toEqual(['Agent files', 'Project instructions'])
  expect(groups.filter(g => g.toggle === 'setup-details')).toHaveLength(1)
  expect(groups.filter(g => g.behind === undefined).flatMap(g => g.rows)).toHaveLength(1)
  const onCard = lineCard('setup', { now: NOW, ledger: [], halted: false, modes: {}, t: id, setup: facts({ [PRES]: null }, { 'setup.apply': 'on' }) })
  expect((onCard.groups ?? []).every(g => g.behind === undefined && g.toggle === undefined)).toBe(true)
})

test('a conflict stays visible while the file rows are folded (the summary does not repeat it)', () => {
  const f = facts({ ...synced(), [PMD]: '# Rules\nNever more than two agents at once.\n' }, { 'cap.max': 'n3' })
  const groups = lineCard('setup', { now: NOW, ledger: [], halted: false, modes: {}, t: id, setup: f }).groups ?? []
  expect(groups[0]?.head).toBe('To decide')
  expect(groups.filter(g => g.behind === undefined).flatMap(g => g.rows).map(r => r.key)).toEqual(['cap-use', 'cap-keep', 'summary'])
  expect(groups.find(g => g.toggle !== undefined)?.rows[0]?.title).toBe('instructions not added')
})

test('the summary says what is wrong in few words, and everything is in sync when nothing is', () => {
  const items = setupItems(facts({ [PRES]: null }))
  expect(setupSummary(items, 0, id)).toBe('4 agent files missing · instructions missing')
  expect(setupSummary(items, 2, id)).toBe('4 agent files missing · instructions missing · 2 conflicts')
  expect(setupSummary(setupItems(facts(synced())), 0, id)).toBe('Everything is in sync')
})
