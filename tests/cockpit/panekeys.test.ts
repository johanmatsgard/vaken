// The pane's keys: a view's Back and Help's Open settings carry one key each, no key is drawn twice; the main page (the footer, the view switch),
// the band and the cards carry none (a keyed plain Button draws "h: Help", and the footer keeps plain words); Help explains them in English and Swedish.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'

import { KEYS_TITLE, PANE_KEYS } from '../hooks/core/panekeys'
import { setLang, tr } from '../hooks/core/lang'
import { HELP_BY_TOPIC } from '../hooks/features/home/views/help'
import { helpText } from '../hooks/features/home/commands'
import { columnPt, ROW_PT } from '../hooks/ui/tokens'

const NOW = Date.parse('2026-10-12T12:00:00Z')
const MIN = 60_000

const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
function engine(on: On, mem: Map<string, unknown>) {
  on('store.get', (_$, e) => ({ value: mem.has(e.key) ? JSON.parse(JSON.stringify(mem.get(e.key))) : undefined }) as never)
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
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}
function fill(mem: Map<string, unknown>) {
  mem.set('cockpit:setting:look.view', 'custom')
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:detail', 'explained')
  mem.set('cockpit:session:test-session', rec('test-session', { cwd: '/work/app', contextPercent: 38 }))
  for (let n = 1; n <= 3; n += 1) mem.set(`cockpit:session:s${n}`, rec(`s${n}`))
}
const propsAt = (wPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: wPt / columnPt(), placement: 'dock' as const, scroll: { bodyRows: Math.round(1400 / ROW_PT), offset: 0, total: 200 }, view: {} })

type Node = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
type Pane = { drawn: () => Promise<Node>; redraw: (p?: unknown) => Promise<void>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const keyOf = (n: Node): string | undefined => n.key ?? (n.props?.key as string | undefined)
// Every drawn Button with a key, as key to hotkey
const hotkeys = (root: Node): Map<string, string> => new Map(walk(root).filter(x => x.type === 'Button' && typeof x.props?.hotkey === 'string').map(x => [keyOf(x) ?? '', x.props?.hotkey as string]))
const noTwice = (keys: Map<string, string>): void => {
  const used = [...keys.values()]
  expect(used.length, `a key is on two Buttons: ${used.join(' ')}`).toBe(new Set(used).size)
}

test('the main page carries no key: the footer and the view switch say their plain words, and no card has one', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  fill(mem)
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(900) })) as unknown as Pane
  const root = await ui.drawn()
  expect(walk(root).some(x => keyOf(x) === 'settings')).toBe(true)
  expect(hotkeys(root).size).toBe(0)
  await ui.unmount()
})

test('a view (Settings, Help) has b on its own Back, Help has s on Open Settings, and no key twice', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  fill(mem)
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(900) })) as unknown as Pane
  for (const open of ['settings', 'help']) {
    await ui.press({ key: open })
    await ui.redraw(propsAt(900))
    const keys = hotkeys(await ui.drawn())
    // Help also has s on its "Open Settings" link; Settings has b only
    expect([...keys.values()].sort(), open).toEqual(open === 'help' ? [PANE_KEYS.back, PANE_KEYS.settings].sort() : [PANE_KEYS.back])
    if (open === 'help') expect(keys.get('help-settings')).toBe(PANE_KEYS.settings)
    noTwice(keys)
    const back = [...keys.entries()].find(([, k]) => k === PANE_KEYS.back)?.[0] ?? ''
    await ui.press({ key: back })
    await ui.redraw(propsAt(900))
    // Back on the main page: no key there
    expect(hotkeys(await ui.drawn()).size, `back from ${open}`).toBe(0)
  }
  await ui.unmount()
})

test('the band carries no key: a bare digit in an empty chat box would press it', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  fill(mem)
  // A line cut by a narrow band, so the band draws its Details Button
  mem.set('cockpit:band:test-session', [{ id: 'nudge', level: 'warn', text: 'New topic: a fresh session costs less than going on in this long one, so start a new one when you can', at: NOW - 60_000, ttlMs: 600_000 }])
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  const band = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 50, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} } })) as unknown as Pane
  const root = await band.drawn()
  expect(walk(root).some(x => x.type === 'Button')).toBe(true)
  expect(hotkeys(root).size).toBe(0)
  await band.unmount()
})

test('Help has "Keys in the pane", found by "keys" and "shortcut", in English and Swedish', () => {
  const entry = HELP_BY_TOPIC.flatMap(g => g.entries).find(e => e.title === KEYS_TITLE)
  expect(entry).toBeDefined()
  const text = entry?.text ?? ''
  for (const k of Object.values(PANE_KEYS)) expect(text).toContain(`${k} `)
  // It promises no key the main page no longer has
  for (const gone of ['h Help', 'a Arrange', 'w Open', '1 Standard', '2 All', '3 Custom', 's Settings']) expect(text).not.toContain(gone)
  expect(text.toLowerCase()).toContain('shortcut')
  expect(helpText('keys')).toContain(KEYS_TITLE)
  expect(helpText('shortcut')).toContain(KEYS_TITLE)
  setLang('sv')
  try {
    expect(tr(KEYS_TITLE)).toBe('Tangenter i panelen')
    // The same letters, the Swedish words
    expect(tr(text)).toContain('b Tillbaka')
    expect(tr(text)).toContain('s Öppna inställningar')
    expect(tr(text)).not.toContain('1 Vanlig')
  } finally {
    setLang('en')
  }
})
