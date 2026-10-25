// Finding things: search in Help and Settings, Most used, Try these, copy rows, the mode card's line on what Claude gets, the old name, cards that do not jump.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { CLAUDE_GETS_PARTS, MOST_USED_KEYS, TRY_THESE, claudeGets, commandsIn, findHelp, findRows, showsOldName } from '../hooks/core/findit'
import { HIDDEN } from '../hooks/core/menu'
import { HABIT_KEYS } from '../hooks/core/tasklist'
import { MODES, findPreset } from '../hooks/core/presets'
import { SETTINGS, defaults, findSetting } from '../hooks/core/settings'
import { setLang, t, tr } from '../hooks/core/lang'
import { HELP_BY_TOPIC, REMOVE_HELP } from '../hooks/features/home/views/help'
import { HELP_TOPIC_SHOW } from '../hooks/ui/tokens'
import { STEADY_MS, isSteady, placeColumns, placeSteady, steadyOrder } from '../hooks/features/home/board'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const defaultOf = (k: string): string | undefined => findSetting(k)?.default

test('Help search: titles that hold the words come first, then texts; every word must be there', () => {
  const entries = [
    { title: 'Why it costs usage', text: 'The cache makes it cheaper.' },
    { title: 'What is the cache?', text: 'A saved copy.' },
    { title: 'Other', text: 'Nothing here.' },
  ]
  expect(findHelp(entries, 'cache').map(e => e.title)).toEqual(['What is the cache?', 'Why it costs usage'])
  expect(findHelp(entries, 'SAVED copy').map(e => e.title)).toEqual(['What is the cache?'])
  expect(findHelp(entries, '  ')).toHaveLength(3)
  expect(findHelp(entries, 'zzz')).toEqual([])
})

test('Settings search: a row matches by its label or its note', () => {
  const rows = [{ label: 'Compact', note: 'When the session is full.' }, { label: 'Notices', note: 'Needs you.' }]
  expect(findRows(rows, 'full').map(r => r.label)).toEqual(['Compact'])
  expect(findRows(rows, 'notices needs').map(r => r.label)).toEqual(['Notices'])
  expect(findRows(rows, '')).toEqual([])
})

test('Most used: four real rows that show in Settings (Notices is its own section right under them)', () => {
  expect(MOST_USED_KEYS).toHaveLength(4)
  for (const k of MOST_USED_KEYS) expect(SETTINGS.find(s => s.key === k && s.hidden !== true), k).toBeDefined()
})

test('Try these: every hidden tool with its exact command and a plain line in both languages', () => {
  expect(TRY_THESE.map(x => x.name)).toEqual(HIDDEN)
  for (const x of TRY_THESE) {
    expect(x.command).toBe(`/vaken-help run ${x.name}`)
    expect(x.about.length, x.name).toBeGreaterThan(0)
  }
  setLang('sv')
  try {
    for (const x of TRY_THESE) expect(tr(x.about), x.name).not.toBe(x.about)
  } finally {
    setLang('en')
  }
})

test('the commands a help text names: exact, each once, a word after only when the command takes it', () => {
  expect(commandsIn('Type /vaken-help run diet. /vaken-help run diet has the details.')).toEqual(['/vaken-help run diet'])
  expect(commandsIn('Resume with /vaken-pause off first. /vaken-undo puts files back.')).toEqual(['/vaken-pause off', '/vaken-undo'])
  expect(commandsIn('/vaken-memory decide and /vaken-today, then /vaken-usage cost')).toEqual(['/vaken-memory decide', '/vaken-today', '/vaken-usage cost'])
  expect(commandsIn('no command here, and /notvaken neither')).toEqual([])
  expect(commandsIn('/vaken-help run nothing-real')).toEqual(['/vaken-help'])
})

test('the old name: a path under .claude/cockpit is spotted, the product name is not', () => {
  expect(showsOldName(REMOVE_HELP.text)).toBe(true)
  expect(showsOldName('Vaken wrote a file (.claude/cockpit-packet.md).')).toBe(true)
  expect(showsOldName('The cockpit card.')).toBe(false) // names-ok: the old product word alone is not a path
})

test('the mode card line: safety notes always, plain words and the habits note by default, and the extra notes in Everything useful', () => {
  const base = defaults()
  expect(claudeGets(base, defaultOf)).toEqual(['safety', 'plain', 'habits'])
  expect(claudeGets({ ...base, ...findPreset('full')?.values }, defaultOf)).toEqual(['safety', 'plain', 'habits', 'prompt', 'assume', 'plan', 'notes'])
  expect(claudeGets({ ...base, 'plain.mode': 'off', ...Object.fromEntries(HABIT_KEYS.map(k => [k, 'off'])) }, defaultOf)).toEqual(['safety'])
  for (const p of Object.values(CLAUDE_GETS_PARTS)) expect(t(p), p).not.toBe(p)
  for (const m of MODES) expect(claudeGets({ ...base, ...findPreset(m)?.values }, defaultOf)).toContain('safety')
})

test('cards do not jump: a card that appears while the person presses goes to the end of the last column, until the hold ends', () => {
  const first = steadyOrder(undefined, ['a', 'b', 'c', 'd'], true)
  expect(first.order).toEqual(['a', 'b', 'c', 'd'])
  const held = steadyOrder(first.memory, ['a', 'new', 'b', 'c', 'd'], true)
  expect(held.order).toEqual(['a', 'b', 'c', 'd', 'new'])
  expect(held.late).toBe(1)
  // The cards that were there keep their columns; the late one is under the last column
  expect(placeSteady(5, 1, 2)).toEqual([...placeColumns(4, 2).slice(0, 1), [...(placeColumns(4, 2)[1] ?? []), 4]])
  expect(placeSteady(5, 0, 2)).toEqual(placeColumns(5, 2))
  const free = steadyOrder(held.memory, ['a', 'new', 'b', 'c', 'd'], false)
  expect(free.order).toEqual(['a', 'new', 'b', 'c', 'd'])
  expect(free.late).toBe(0)
  expect(isSteady(NOW, undefined)).toBe(false)
  expect(isSteady(NOW, NOW - 1000)).toBe(true)
  expect(isSteady(NOW, NOW - STEADY_MS)).toBe(false)
})

// ---- the pane

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
function engine(on: On, copied: string[], toasts: string[]): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done']])
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
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.copy', (_$, e) => {
    copied.push(e.text)
    return { value: { isCopied: true } } as never
  })
  on('ui.toast', (_$, e) => {
    toasts.push(String((e as { text?: unknown }).text ?? ''))
    return { value: undefined } as never
  })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return mem
}
type Pane = { find: (q: unknown) => Promise<unknown>; findAll: (q: unknown) => Promise<unknown[]>; press: (q: unknown) => Promise<void>; input: (a: { key: string; text: string; kind: 'change' | 'submit' }) => Promise<void>; unmount: () => Promise<void> }
type Mount = () => Promise<Pane>
async function step(mount: Mount, act: (p: Pane) => Promise<void>): Promise<void> {
  const pane = await mount()
  await act(pane)
  await pane.unmount()
}
async function look<T>(mount: Mount, read: (p: Pane) => Promise<T>): Promise<T> {
  const pane = await mount()
  const out = await read(pane)
  await pane.unmount()
  return out
}
const has = (p: Pane, q: unknown): Promise<boolean> => p.find(q).then(x => x !== undefined)

test('Settings: Most used on top, the mode card says what Claude gets and has the three modes one press each, and the search draws only the matches', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, [], [])
  const mount: Mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps }) as unknown as Promise<Pane>
  await step(mount, p => p.press({ key: 'settings' }))
  const full = await look(mount, async p => ({
    most: await has(p, { key: 'settings-most-used' }),
    rows: await Promise.all(MOST_USED_KEYS.map(k => has(p, { key: `row-${k}` }))),
    gets: await has(p, { type: 'Text', text: /^Claude gets: safety notes, plain words, the habits note\.$/ }),
    modes: await Promise.all(MODES.map(m => has(p, { key: `mode-${m}` }))),
    notices: await has(p, { key: 'settings-notices' }),
    n: (await p.findAll({})).length,
  }))
  expect(full.most).toBe(true)
  expect(full.rows).toEqual(MOST_USED_KEYS.map(() => true))
  expect(full.gets).toBe(true)
  expect(full.modes).toEqual([true, true, true])
  expect(full.notices).toBe(true)
  // Each mode is one press: Everything useful turns the extra notes on
  await step(mount, p => p.press({ key: 'mode-full' }))
  await clock.settle()
  expect(await look(mount, p => has(p, { type: 'Text', text: /^Claude gets: safety notes, plain words, the habits note, prompt review, assumption review, plan first, notes from every check\.$/ }))).toBe(true)
  await step(mount, p => p.input({ key: 'settings-find-box', text: 'compact', kind: 'submit' }))
  const found = await look(mount, async p => ({
    card: await has(p, { key: 'settings-found-plan-and-cost' }),
    row: await has(p, { key: 'row-compact.mode' }),
    notices: await has(p, { key: 'settings-notices' }),
    footer: await has(p, { key: 'settings-footer' }),
    n: (await p.findAll({})).length,
  }))
  expect(found).toMatchObject({ card: true, row: true, notices: false, footer: false })
  expect(found.n).toBeLessThan(full.n)
  await step(mount, p => p.input({ key: 'settings-find-box', text: 'zzqq', kind: 'submit' }))
  expect(await look(mount, p => has(p, { type: 'Text', text: 'No setting holds "zzqq".' }))).toBe(true)
  // Done clears the words: Settings opens whole again
  await step(mount, p => p.press({ key: 'settings-done' }))
  await step(mount, p => p.press({ key: 'settings' }))
  expect(await look(mount, p => has(p, { key: 'settings-notices' }))).toBe(true)
})

test('Help: the search filters as you type, Try these copies a command, a topic copies the commands it names, and the old name is explained once', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const copied: string[] = []
  const toasts: string[] = []
  engine(on, copied, toasts)
  const mount: Mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps }) as unknown as Promise<Pane>
  await step(mount, p => p.press({ key: 'help' }))
  // Typing waits for a pause, then the page shows only the matches
  await step(mount, async p => {
    await p.input({ key: 'help-find', text: 'cache', kind: 'change' })
    await clock.advance(1000)
    await clock.settle()
  })
  const cache = await look(mount, async p => ({ hit: await has(p, { type: 'Text', text: 'What is the cache?' }), miss: await has(p, { type: 'Text', text: 'Why it costs usage' }), guide: await has(p, { key: 'help-guide' }) }))
  expect(cache).toEqual({ hit: true, miss: false, guide: false })
  await step(mount, p => p.input({ key: 'help-find', text: 'qqzz', kind: 'submit' }))
  expect(await look(mount, p => has(p, { type: 'Text', text: 'No help topic holds "qqzz".' }))).toBe(true)
  await step(mount, p => p.input({ key: 'help-find', text: '', kind: 'submit' }))
  // Try these: a card of its own, its first rows shown; a whole-row press copies the exact command and says so
  expect(await look(mount, p => has(p, { key: 'help-try-focus' }))).toBe(true)
  await step(mount, p => p.press({ key: 'press-help-try-focus-0' }))
  await clock.settle()
  expect(copied).toEqual(['/vaken-help run focus'])
  expect(toasts).toContain('Copied')
  // An open topic that names a command has it as a copy row
  const entries = HELP_BY_TOPIC.flatMap(g => g.entries)
  const named = entries.findIndex(e => commandsIn(e.text).length > 0 && !showsOldName(e.text))
  expect(named).toBeGreaterThanOrEqual(0)
  // Each topic is a card that shows its first questions; "Show N more" opens the rest
  const group = HELP_BY_TOPIC.find(g => g.entries.includes(entries[named] as (typeof entries)[number]))
  if ((group?.entries.indexOf(entries[named] as (typeof entries)[number]) ?? 0) >= HELP_TOPIC_SHOW) await step(mount, p => p.press({ key: `morel-help-more-${group?.topic}` }))
  await step(mount, p => p.press({ key: `press-help-help:${named}-0` }))
  await step(mount, p => p.press({ key: `press-help-help:${named}-copy-0-0` }))
  await clock.settle()
  expect(copied[1]).toBe(commandsIn(entries[named]?.text ?? '')[0])
  // Removing vaken shows ~/.claude/cockpit: the first time it says why the old name stays, and the commands it names are copy rows
  const at = HELP_BY_TOPIC.flatMap(g => g.entries).findIndex(e => e.title === REMOVE_HELP.title)
  expect(at).toBeGreaterThanOrEqual(0)
  const oldLine = { type: 'Text', text: "The folder .claude/cockpit/ keeps vaken's older name, so your data stays." }
  await step(mount, p => p.press({ key: `press-help-help:${at}-0` }))
  await clock.settle()
  expect(await look(mount, p => has(p, oldLine))).toBe(true)
  await step(mount, p => p.press({ key: 'help-done' }))
  await step(mount, p => p.press({ key: 'help' }))
  await step(mount, p => p.press({ key: `press-help-help:${at}-0` }))
  await clock.settle()
  expect(await look(mount, p => has(p, oldLine))).toBe(false)
})
