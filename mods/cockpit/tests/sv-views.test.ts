// The one text table: Settings, Help, the card guide, Arrange and a flipped card, drawn in Swedish, show no English words.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'
import { APPEARS } from '../hooks/core/cardrules'
import { setLang } from '../hooks/core/lang'
import { SETTINGS, defaults, settingsText } from '../hooks/core/settings'
import { MODE_ABOUT, MODE_WORDS, SECTION_TABLE, modeLabel } from '../hooks/core/settingsmap'
import { TABLE } from '../hooks/i18n/table'
import { emptyState } from '../hooks/core/proof'
import { viaParent } from './viaparent'

const NOW = new Date(2026, 9, 11, 9, 0).getTime()
const MIN = 60_000
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 72, placement: 'dock' as const, scroll: { bodyRows: 200, offset: 0, total: 200 }, view: {} }

type Node = { type?: string; text?: string; props?: Record<string, unknown>; children?: unknown[] }
const textOf = (n: Node): string => [n.text ?? '', ...(n.children ?? []).map(c => (typeof c === 'string' || typeof c === 'number' ? String(c) : c !== null && typeof c === 'object' ? textOf(c as Node) : ''))].join(' ')
const textsOf = (n: Node, out: string[] = []): string[] => {
  if (n.type === 'Text' || n.type === 'Button') out.push(textOf(n).replace(/\s+/g, ' ').trim())
  for (const c of n.children ?? []) if (c !== null && typeof c === 'object') textsOf(c as Node, out)
  return out
}
type Pane = { find: (q: unknown) => Promise<unknown>; press: (q: unknown) => Promise<void>; redraw: () => Promise<void>; unmount: () => Promise<void>; drawn: (s?: { in?: string }) => Promise<Node> }

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
const seed = (id: string, over: Record<string, unknown>) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
const world = (lang: string): Map<string, unknown> =>
  new Map<string, unknown>(Object.entries({
    'cockpit:setting:look.view': 'custom',
    'cockpit:firstrun': 'done',
    'cockpit:setting:look.language': lang,
    ...Object.fromEntries(Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show'])),
    'cockpit:session:test-session': seed('test-session', { cwd: '/work/app', contextPercent: 38, costUsd: 1.2, fiveHourPercent: 62, fiveHourResetsAt: '2026-10-11T18:00:00Z' }),
    'cockpit:proof:test-session': { ...emptyState() },
  }))
async function mount($: { ui: { mount: (o: unknown) => Promise<never> } }, on: On, mem: Map<string, unknown>): Promise<Pane> {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  return $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps }) as unknown as Promise<Pane>
}

const ENGLISH = /\b(the|and|when|your|you|with|for|to|Show|Done|Back|setting|settings|Off|On|cards|card)\b/
const english = (all: string[]): string[] => all.filter(s => ENGLISH.test(s))

test('Settings drawn in Swedish, every section open, holds no English words', async ($, on) => {
  const ui = await mount($ as never, on, world('sv'))
  await ui.press({ key: 'settings' })
  await ui.redraw()
  for (const sec of [...SECTION_TABLE.map(s => s.name), 'Advanced']) {
    await ui.press({ key: `press-ol-section:${sec}-0` }).catch(() => undefined)
    await ui.redraw()
  }
  const all = textsOf(await ui.drawn())
  await ui.unmount()
  expect(all.length).toBeGreaterThan(40)
  expect(english(all)).toEqual([])
})

test('Help and the card guide drawn in Swedish hold no English words', async ($, on) => {
  const ui = await mount($ as never, on, world('sv'))
  await $.command.run(viaParent('vaken-help', ''))
  await ui.redraw()
  const help = textsOf(await ui.drawn())
  await ui.press({ key: 'press-help-guide-0' })
  await ui.redraw()
  const guide = textsOf(await ui.drawn())
  await ui.press({ key: 'guide-done' })
  await ui.unmount()
  expect(help.length).toBeGreaterThan(10)
  expect(guide.length).toBeGreaterThan(10)
  expect(english(help)).toEqual([])
  expect(english(guide)).toEqual([])
})

test('Arrange and a flipped card drawn in Swedish hold no English words', async ($, on) => {
  const ui = await mount($ as never, on, world('sv'))
  await ui.press({ key: 'press-glance-limit-0' })
  await ui.redraw()
  await ui.press({ key: 'btn-icon-limit-gear' })
  await ui.redraw()
  const flipped = textsOf(await ui.drawn())
  await ui.press({ key: 'back-glance-limit' })
  await ui.press({ key: 'arrange' })
  await ui.redraw()
  const arrange = textsOf(await ui.drawn())
  const board = textsOf(await ui.drawn({ in: 'arrange-board' }))
  await ui.press({ key: 'arrange-done' })
  await ui.unmount()
  expect(flipped.length).toBeGreaterThan(3)
  expect(english(flipped)).toEqual([])
  expect(english(arrange)).toEqual([])
  expect(english(board)).toEqual([])
})

test('the mode names and notes are names of table rows (one copy), and the text twin stays English on a Swedish draw', () => {
  for (const name of [...Object.values(MODE_ABOUT), ...Object.values(MODE_WORDS)]) expect(TABLE[name], name).toBeDefined()
  expect(['quiet', 'balanced', 'full', 'custom'].map(m => modeLabel(m, 'en'))).toEqual(['Only alerts', 'Recommended', 'Everything useful', 'Custom'])
  expect(['quiet', 'balanced', 'full', 'custom'].map(m => modeLabel(m, 'sv'))).toEqual(['Bara larm', 'Rekommenderat', 'Allt användbart', 'Egen'])
  const english = new Set(Object.values(TABLE).map(r => (typeof r.en === 'string' ? r.en : r.en.other)))
  expect(SETTINGS.filter(s => s.hidden !== true && s.note !== '' && !english.has(s.note)).map(s => s.key)).toEqual([])
  const inEnglish = settingsText(defaults(), true, [], true)
  setLang('sv')
  try {
    expect(settingsText(defaults(), true, [], true)).toBe(inEnglish)
  } finally {
    setLang('en')
  }
})

// A picture's alt is read aloud, so a Swedish pane must not say an English alt.
const altsOf = (n: Node, out: string[] = []): string[] => {
  if (n.type === 'Svg' && typeof n.props?.alt === 'string') out.push(n.props.alt)
  for (const c of n.children ?? []) if (c !== null && typeof c === 'object') altsOf(c as Node, out)
  return out
}
const ENGLISH_ALT = /\b(open|opens|shut|fold|has news|nothing needs you|expand|collapse|shows more|shows fewer|show more|show fewer|rule|back|on|off|selected|settings|pinned|calm|active|needs you|neutral|accent|amber)\b/i
test('every picture of a Swedish pane has a Swedish alt (home, Settings with every section open, a flipped card)', async ($, on) => {
  const ui = await mount($ as never, on, world('sv'))
  const home = altsOf(await ui.drawn())
  await ui.press({ key: 'press-glance-limit-0' })
  await ui.redraw()
  const open = altsOf(await ui.drawn())
  await ui.press({ key: 'btn-icon-limit-gear' })
  await ui.redraw()
  const flipped = altsOf(await ui.drawn())
  await ui.press({ key: 'back-glance-limit' })
  await ui.press({ key: 'settings' })
  await ui.redraw()
  for (const sec of [...SECTION_TABLE.map(s => s.name), 'Advanced']) {
    await ui.press({ key: `press-ol-section:${sec}-0` }).catch(() => undefined)
    await ui.redraw()
  }
  const settings = altsOf(await ui.drawn())
  await ui.unmount()
  const all = [...home, ...open, ...flipped, ...settings].filter(a => a !== '')
  expect(all.length).toBeGreaterThan(10)
  expect(all.filter(a => ENGLISH_ALT.test(a))).toEqual([])
  expect(all.some(a => a.startsWith('Öppna ') || a.startsWith('Stäng '))).toBe(true)
  expect(all, 'the Glance dot says its state in Swedish').toContain('OK')
  expect(all.some(a => a.endsWith(': På') || a.endsWith(': Av'))).toBe(true)
})
