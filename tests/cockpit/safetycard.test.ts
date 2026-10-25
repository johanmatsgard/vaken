// The Safety card: Pause all, Undo last answer, the named checkpoints and the guard's counts in one place.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { HALT_WHAT, RESUME_WHAT, haltKey } from '../hooks/core/guard'
import { VIEW_STRINGS } from '../hooks/core/lang'
import { SAFETY_CHECKPOINTS, safetyCardText, safetyLoud, safetyShort, safetyView } from '../hooks/core/safetycard'
import type { SafetyFacts } from '../hooks/core/safetycard'
import { SAFETY_CP_FAILED, SAFETY_HALT_SAID, SAFETY_RESUME_SAID, UNDO_VS_APP } from '../hooks/core/safetywords'
import { SETTINGS } from '../hooks/core/settings'
import { indexKey, markKey, namedKey, pendingKey } from '../hooks/core/undo'
import { LEDGER_KEY } from '../hooks/features/compaction'
import { CHECKPOINT_OPEN, UNDO_OPEN } from '../hooks/features/home/actions'
import { lineCard } from '../hooks/features/home/linecards'
import { LINE_CARD_IDS, cardLoudness } from '../hooks/features/home/logic'
import type { LoudFacts } from '../hooks/features/home/logic'
import { HALT_ALL, RESUME_ALL, UNDO_LAST, undoNamed } from '../hooks/features/home/rowact'
import { needsGroups, rowItems } from '../hooks/features/home/needs'
import type { InboxItem } from '../hooks/core/inbox'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const HOUR = 60 * MIN
const NOW = Date.parse('2026-10-10T10:00:00Z')
const id = (s: string): string => s
const WHAT = { means: 'x' }

const facts = (over: Partial<SafetyFacts> = {}): SafetyFacts => ({ now: NOW, halted: false, held: 0, warned: 0, heldWhat: WHAT, warnedWhat: WHAT, undoFiles: 0, checkpoints: [], ...over })
const cp = (name: string, ago: number, files = 2) => ({ name, at: NOW - ago, files })

test('the short line: All clear, Halted, or how many steps were held today', () => {
  expect(safetyShort(facts(), id)).toBe('All clear')
  expect(safetyShort(facts({ held: 1 }), id)).toBe('1 step stopped today')
  expect(safetyShort(facts({ held: 3 }), id)).toBe('3 steps stopped today')
  expect(safetyShort(facts({ halted: true, held: 3 }), id)).toBe('Paused for safety')
  expect(safetyShort(facts({ warned: 4 }), id)).toBe('All clear')
})

test('loud when halted (urgent) or a step was held lately (warn), calm otherwise', () => {
  expect([safetyLoud({ halted: false, heldRecently: false }), safetyLoud({ halted: false, heldRecently: true }), safetyLoud({ halted: true, heldRecently: true })]).toEqual(['none', 'held', 'halted'])
  const base: LoudFacts = { limits: [], here: true, others: 1, didToday: 1, proof: 'ok', agents: { any: true, stuck: false }, computer: { gaugeOn: true, full: false }, skillsUsed: true }
  expect(['none', 'held', 'halted'].map(s => cardLoudness({ ...base, safety: s as 'none' }, NOW).safety)).toEqual(['calm', 'warn', 'urgent'])
  // The Guard card is only its rules now, so it never leads.
  expect(cardLoudness({ ...base, safety: 'halted' }, NOW).guard).toBe('calm')
})

test('Stop: Pause all presses to halt; while halted the row says Halted and Resume', () => {
  // Calm is quiet: no "Stopped: none" or "Warned: none" rows
  const calm = safetyView(facts(), id)
  expect(calm.groups.map(g => g.head)).toEqual(['Stop'])
  expect(calm.groups[0]?.rows).toMatchObject([{ key: 'halt', title: 'Pause this session', right: 'Pause', press: { do: 'halt' } }])
  const halted = safetyView(facts({ halted: true }), id)
  expect(halted.groups[0]?.rows).toMatchObject([{ key: 'halt', title: 'Paused for safety', right: 'Resume', press: { do: 'resume' } }])
  const via = lineCard('safety', { now: NOW, ledger: [], halted: true, modes: {}, t: id })
  expect(via.groups?.[0]?.rows[0]).toMatchObject({ title: 'Paused for safety', right: 'Resume', action: RESUME_ALL })
  expect(lineCard('safety', { now: NOW, ledger: [], halted: false, modes: {}, t: id }).groups?.[0]?.rows[0]?.action).toEqual(HALT_ALL)
})

test('Undo: the files since your last message, then the checkpoints with their age, past the newest three behind Show N more; each presses to a preview', () => {
  const v = safetyView(facts({ undoFiles: 3, checkpoints: [cp('before-refactor', 2 * HOUR), cp('tidy', 25 * MIN), cp('first', 3 * 24 * HOUR), cp('fourth', 5 * 24 * HOUR)] }), id)
  expect(v.groups.map(g => g.head)).toEqual(['Stop', 'Undo'])
  const rows = v.groups[1]?.rows ?? []
  // One more than fits is shown, not folded behind "Show 1 more"
  expect(rows).toHaveLength(2 + SAFETY_CHECKPOINTS)
  expect(v.groups[1]?.fold).toBeUndefined()
  expect(rows.map(r => [r.title, r.right])).toEqual([
    ['Preview undo (3 files)', undefined],
    ['before-refactor', '2 h ago · Preview'],
    ['tidy', '25 min ago · Preview'],
    ['first', '3 d ago · Preview'],
    ['fourth', '5 d ago · Preview'],
  ])
  // Never dropped: more checkpoints wait behind the fold
  const many = safetyView(facts({ checkpoints: ['a', 'b', 'c', 'd', 'e', 'f'].map((n, k) => cp(n, (k + 1) * HOUR)).concat([cp('now', 10_000)]) }), id).groups[1]
  expect(many?.rows).toHaveLength(7)
  expect(many?.fold).toEqual({ id: 'checkpoints', shown: SAFETY_CHECKPOINTS, more: 7 - SAFETY_CHECKPOINTS })
  expect(many?.rows.at(-1)?.right).toBe('just now · Preview')
  expect(rows.map(r => r.press)).toEqual([{ do: 'undoLast' }, { do: 'undoNamed', name: 'before-refactor' }, { do: 'undoNamed', name: 'tidy' }, { do: 'undoNamed', name: 'first' }, { do: 'undoNamed', name: 'fourth' }])
  expect(rows[1]?.what.next).toMatch(/\/vaken-undo name before-refactor yes in the session\. Nothing changes before that\.$/)
  expect(safetyView(facts({ undoFiles: 1 }), id).groups[1]?.rows[0]?.title).toBe('Preview undo (1 file)')
  expect(safetyView(facts(), id).groups.map(g => g.head)).not.toContain('Undo')
  expect([UNDO_LAST, undoNamed('tidy')]).toEqual([{ kind: 'undoLast' }, { kind: 'undoNamed', name: 'tidy' }])
})

test('the preview opens only under the row it was made for, and says each thing once', () => {
  const some = ['Preview of going back.', '1 file would change:', '  src/a.ts: 2 lines removed, 1 line added', 'Nothing was changed yet. Before a restore vaken keeps a copy. To go ahead: /vaken-undo last yes']
  const f = facts({ undoFiles: 2, checkpoints: [cp('tidy', HOUR)], preview: some, previewOf: 'tidy' })
  const rows = safetyView(f, id).groups[1]?.rows ?? []
  // The one line on who undoes what: the app's checkpoints its file edits, vaken's Undo shell and git steps too
  expect(rows[0]?.what.facts).toEqual([UNDO_VS_APP])
  expect(rows[1]?.what.facts).toEqual(['1 file would change:', '  src/a.ts: 2 lines removed, 1 line added'])
  const last = safetyView({ ...f, previewOf: 'last' }, id).groups[1]?.rows[0]
  expect(last?.title).toBe('Preview undo (2 files)')
  expect(last?.what.facts).toEqual(['1 file would change:', '  src/a.ts: 2 lines removed, 1 line added', UNDO_VS_APP, 'Type this in the chat box:', '/vaken-undo last yes'])
  expect(last?.what.next).toBe('Nothing changes before you type it.')
  // Nothing can be put back: the title says so, and no copy line or "Nothing changes" repeats it
  const none = ['Preview of undoing the edits since your last message.', 'Nothing would change.', '  src/f1.ts: cannot be restored, its copy file cannot be read.', 'Nothing was changed.']
  const empty = safetyView({ ...f, preview: none, previewOf: 'last' }, id).groups[1]?.rows[0]
  expect(empty?.title).toBe('Undo: nothing can be put back')
  expect(empty?.what.facts).toEqual(['  src/f1.ts: cannot be restored, its copy file cannot be read.', UNDO_VS_APP])
  expect(empty?.what.next).toBeUndefined()
})

test('Risky steps today: stopped and warned counts, each opening its words, from today\'s ledger only', () => {
  const e = (what: string, at = NOW - 60_000) => ({ at, what, did: true })
  const v = lineCard('safety', { now: NOW, ledger: [e('Held a risky command'), e('Held a risky command'), e('Warned about a package install'), e('Held a risky command', NOW - 3 * 24 * HOUR)], halted: false, modes: {}, t: id })
  const rows = v.groups?.find(g => g.head === 'Risky steps today')?.rows ?? []
  // Said the way the Short look says it
  expect(rows.map(r => [r.key, r.title, r.right])).toEqual([['stopped', '2 steps stopped today', undefined], ['warned', '1 warning today', undefined]])
  expect(rows[0]?.what.facts?.[0]).toMatch(/^Stopped a risky command: 2 times\./)
  expect(rows.map(r => r.action)).toEqual([undefined, undefined])
  expect(v.short).toBe('2 steps stopped today')
  expect(lineCard('safety', { now: NOW, ledger: [], halted: false, modes: {}, t: id }).groups?.map(g => g.head)).toEqual(['Stop'])
  // An extra agent or a call over budget stops a step, but it is not a risky step
  expect(lineCard('safety', { now: NOW, ledger: [e('Held an extra agent'), e('Held a call over budget')], halted: false, modes: {}, t: id }).short).toBe('All clear')
  // A line from another session names it
  const named = lineCard('safety', { now: NOW, ledger: [{ ...e('Held a risky command'), session: 's1', detail: 'rm -rf x' }, { ...e('Held a risky command', NOW - 2 * 60_000), session: 'me', detail: 'rm y' }], halted: false, modes: {}, t: id, safety: { undoFiles: 0, checkpoints: [], sid: 'me', names: { s1: 'Web fixes' } } })
  expect(named.groups?.find(g => g.head === 'Risky steps today')?.rows[0]?.what.last).toEqual(['1 min ago: Web fixes: rm -rf x', '2 min ago: rm y'])
  expect(v.whats).toHaveLength(v.lines.length)
})

test('the text twin has the line, the undo, each checkpoint and the counts, each ending with the command that does or says more', () => {
  const f = facts({ held: 2, warned: 1, undoFiles: 3, checkpoints: [cp('tidy', 25 * MIN)] })
  expect(safetyCardText(f)).toEqual([
    'Safety: 2 steps stopped today · /vaken-pause status',
    'Preview undo (3 files) · /vaken-undo last',
    'Checkpoint tidy: 25 min ago · /vaken-undo name tidy',
    'Risky steps today: 2 steps stopped, 1 step warned · /vaken-guard',
  ])
  expect(safetyCardText(undefined)).toEqual([])
  expect(safetyCardText(facts())).toEqual(['Safety: All clear · /vaken-pause status', 'Risky steps today: none stopped, none warned · /vaken-guard'])
})

test('Needs you no longer lists this session\'s own halt; another session\'s stays', () => {
  const item = (over: Partial<InboxItem>): InboxItem => ({ id: 'x', kind: 'halt', sid: 'me', name: 'app', here: true, what: 'Halted. Every step that changes things is stopped.', since: NOW - MIN, approx: false, todo: 'Type /vaken-pause off.', count: 1, allowed: false, ...over })
  expect(rowItems([item({}), item({ sid: 'other', name: 'web', here: false })]).map(x => x.name)).toEqual(['web'])
  expect(needsGroups([item({})], NOW, id)).toEqual([])
})

test('the card is a line card with its own Show or Hide, and every new word it shows has a Swedish line', () => {
  expect(LINE_CARD_IDS).toContain('safety')
  expect(SETTINGS.find(s => s.key === 'cards.safety')).toMatchObject({ label: 'Safety', default: 'show' })
  const words = englishOf('safety')
  expect(words.filter(w => !VIEW_STRINGS.includes(w))).toEqual([])
  expect(words.filter(w => (SV[w] ?? '') === '')).toEqual([])
  for (const w of ['Safety', 'Stop', 'Undo', 'Resume', 'Paused for safety', 'Stopped', 'Preview undo (1 file)', 'Preview undo ({n} files)', 'Type this in the chat box:', '{n} steps stopped today']) expect(SV[w] ?? '').not.toBe('')
  const sv = safetyView(facts({ undoFiles: 2, checkpoints: [cp('tidy', HOUR)], held: 2 }), w => SV[w] ?? w)
  expect(sv.short).toBe('2 steg stoppades i dag')
  expect(sv.groups.map(g => g.head)).toEqual(['Stoppa', 'Ångra', 'Riskabla steg i dag'])
  expect(sv.groups[0]?.rows[0]).toMatchObject({ title: 'Pausa den här sessionen', right: 'Pausa' })
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }
const rec = (sid: string, now: number, over: Record<string, unknown> = {}) => ({ sessionId: sid, cwd: `/work/${sid}`, model: 'm', state: 'idle', startedAt: now - 5 * HOUR, updatedAt: now - 2000, lastEventAt: now - 2000, stateSince: now - 3 * MIN, ...over })

function harness(on: On, seed: Record<string, unknown>) {
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
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  return { mem, toasts }
}
// The card shows its rows at Full even when calm (its own Full choice), so the rows can be pressed in either state.
const world = (now: number, over: Record<string, unknown> = {}) => ({
  'cockpit:firstrun': 'done',
  'cockpit:setting:look.view': 'custom',
  'cockpit:setting:detail.safety': 'explained',
  'cockpit:session:test-session': rec('test-session', now, { cwd: '/work/app' }),
  [markKey('test-session')]: now - 10 * MIN,
  [indexKey('test-session')]: { next: 3, snaps: [1, 2].map(n => ({ id: n, path: `/work/app/f${n}.ts`, at: now - 5 * MIN, tool: 'Edit', kind: 'saved', hash: 'h', bytes: 1, lines: 1 })) },
  [namedKey('test-session')]: [{ name: 'before-refactor', at: now - 2 * HOUR, items: [{ path: '/work/app/f1.ts', snap: 1 }] }],
  ...over,
})
const textOf = async (ui: { find: (q: unknown) => Promise<unknown> }, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })

test('the pane shows the card; Pause all halts this session with a ledger line and a toast, and Resume lifts it', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = harness(on, world(NOW))
  const ui = await mountPane($)
  expect(await textOf(ui, /^Safety$/)).toBe(true)
  expect(await textOf(ui, /^Pause this session$/)).toBe(true)
  expect(await textOf(ui, /^Preview undo \(2 files\)$/)).toBe(true)
  expect(await textOf(ui, /^before-refactor$/)).toBe(true)
  expect(await textOf(ui, /^2 h ago · Preview$/)).toBe(true)
  await ui.press({ key: 'press-ol-safety:halt-0' })
  await clock.settle()
  expect(w.mem.get(haltKey('test-session'))).toEqual({ at: NOW })
  expect((w.mem.get(LEDGER_KEY) as { what: string; how?: string }[])[0]).toMatchObject({ what: HALT_WHAT, how: 'button' })
  expect(w.toasts).toContain(SAFETY_HALT_SAID)
  await ui.redraw()
  expect(await textOf(ui, /^Paused for safety$/)).toBe(true)
  expect(await textOf(ui, /^Resume$/)).toBe(true)
  // Needs you does not list the halt again: it is this card's row, so the Needs you card is its calm row ("None").
  expect(await textOf(ui, /^None$/)).toBe(true)
  await ui.press({ key: 'press-ol-safety:halt-0' })
  await clock.settle()
  expect(w.mem.has(haltKey('test-session'))).toBe(false)
  expect((w.mem.get(LEDGER_KEY) as { what: string; how?: string }[])[0]).toMatchObject({ what: RESUME_WHAT, how: 'button' })
  expect(w.toasts).toContain(SAFETY_RESUME_SAID)
  await ui.unmount()
})

test('a checkpoint\'s row shows the preview of going back, notes it for the typed yes, and restores nothing; a second press folds it', { timeoutMs: 15_000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = harness(on, world(NOW))
  const ui = await mountPane($)
  await ui.press({ key: 'press-ol-safety:cp-before-refactor-0' })
  await clock.settle()
  await ui.redraw()
  expect(w.mem.get(pendingKey('test-session'))).toMatchObject({ kind: 'named', name: 'before-refactor', at: NOW })
  // The preview's own title is not repeated under the row that says it
  expect(await textOf(ui, /^Preview of going back to checkpoint/)).toBe(false)
  // Here no file can be put back: the file says why, and no line asks to type the go-back command
  expect(await textOf(ui, /cannot be restored/)).toBe(true)
  expect(await textOf(ui, /^What you can do: To go back to it/)).toBe(false)
  expect(w.mem.get(LEDGER_KEY)).toBeUndefined()
  expect(`${CHECKPOINT_OPEN}before-refactor`).toBe('safety:cp-before-refactor')
  await ui.press({ key: 'press-ol-safety:cp-before-refactor-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /cannot be restored/)).toBe(false)
  await ui.press({ key: 'press-ol-safety:undo-last-0' })
  await clock.settle()
  await ui.redraw()
  expect(UNDO_OPEN).toBe('safety:undo-last')
  expect(await textOf(ui, /^Type this in the chat box:$|^What it means: Before a step changes a file/)).toBe(true)
  expect(await textOf(ui, /^Preview of going back to checkpoint/)).toBe(false)
  expect(w.toasts).not.toContain(SAFETY_CP_FAILED)
  await ui.unmount()
})
