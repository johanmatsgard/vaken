// Arrange tiles, band words and the text twin in a Swedish pane about 540 pt wide.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'
import { APPEARS } from '../hooks/core/cardrules'
import { RISK_LABELS, RISKY_BAND, bandWords } from '../hooks/core/happened'
import { setLang, tr } from '../hooks/core/lang'
import { emptyState } from '../hooks/core/proof'
import { SKILLS_COUNTS_KEY, SKILLS_LISTING_KEY } from '../hooks/core/skills'
import { COL_PT } from '../hooks/ui/tokens'
import { viaParent } from './viaparent'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const NOW = new Date(2026, 9, 10, 14, 0).getTime()
const MIN = 60_000
const PANE_PT = 540
const REGION_COLS = Math.floor(PANE_PT / COL_PT)
const BORDER_COLS = 1

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: PANE_PT / COL_PT, placement: 'dock' as const, scroll: { bodyRows: 60, offset: 0, total: 60 }, view: {} }

function engine(on: On) {
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
function memStore(on: On, seed: Record<string, unknown>): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', ...seed }))
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

const seed = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
// Every card shown, a plan limit, two other sessions and a goal (so the text twin has its estimate line).
const world = (over: Record<string, unknown> = {}) => ({
  'cockpit:firstrun': 'done',
  ...Object.fromEntries(Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show'])),
  'cockpit:session:test-session': seed('test-session', { cwd: '/work/app', contextPercent: 38, costUsd: 1.2, fiveHourPercent: 18, fiveHourResetsAt: '2026-10-10T18:00:00Z', sevenDayPercent: 71 }),
  'cockpit:session:s1': seed('s1'),
  'cockpit:session:s2': seed('s2', { state: 'waiting', stateSince: NOW - 12 * MIN }),
  'cockpit:proof:test-session': { ...emptyState(), goal: { text: 'Add a dark mode toggle', setAt: NOW, how: 'typed' } },
  ...over,
})

type Node = { type?: string; text?: string; props?: Record<string, unknown>; children?: unknown[] }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const textOf = (n: Node): string => [n.text ?? '', ...(n.children ?? []).map(c => (typeof c === 'string' || typeof c === 'number' ? String(c) : c !== null && typeof c === 'object' ? textOf(c as Node) : ''))].join('')

type Pane = { press: (q: unknown) => Promise<unknown>; unmount: () => Promise<void>; resize: (s: { columns: number; rows: number; in?: string }) => Promise<void>; drawn: (s?: { in?: string }) => Promise<Node> }

// Opens Arrange cards on a 540 pt pane, lays the board's region out at the pane's width, and returns the board's drawn tree.
async function board($: { ui: { mount: (t: unknown) => Promise<unknown> } }): Promise<Node> {
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps }) as Promise<Pane>
  const start = await mount()
  await start.press({ key: 'arrange' })
  await start.unmount()
  const ui = await mount()
  await ui.resize({ columns: REGION_COLS, rows: 200, in: 'arrange-board' })
  const tree = await ui.drawn({ in: 'arrange-board' })
  await ui.press({ key: 'arrange-done' })
  await ui.unmount()
  return tree
}

function problemsOf(tree: Node): { tiles: number; problems: string[] } {
  const tiles = walk(tree).filter(n => n.type === 'Box' && n.props?.position === 'absolute')
  const problems: string[] = []
  for (const tile of tiles) {
    const left = Number(tile.props?.left ?? 0)
    const width = Number(tile.props?.width ?? 0)
    const inner = width - 2 * BORDER_COLS - 2 * Number(tile.props?.paddingX ?? 0)
    const [head, figure] = kids(tile)
    const [title, zoneBox] = head === undefined ? [] : kids(head)
    const name = title === undefined ? '?' : textOf(title)
    if (left + width > REGION_COLS) problems.push(`${name}: ends at ${left + width}, the region is ${REGION_COLS} wide`)
    const zone = zoneBox === undefined ? '' : textOf(zoneBox)
    if (zone === '') problems.push(`${name}: no zone tag`)
    else if (zoneBox?.props?.flexShrink !== 0) problems.push(`${name}: the tag "${zone}" may shrink`)
    const gap = Number(head?.props?.columnGap ?? 0)
    if (zone.length + gap + 1 > inner) problems.push(`${name}: the tag "${zone}" does not fit beside a title in ${inner} columns`)
    if (title?.props?.wrap !== 'truncate-end') problems.push(`${name}: the title does not truncate`)
    const titleRoom = inner - zone.length - gap
    const titleDrawn = title?.props?.wrap === 'truncate-end' ? Math.min(name.length, titleRoom) : name.length
    if (titleDrawn + gap + zone.length > inner) problems.push(`${name}: the title line is ${titleDrawn + gap + zone.length} columns, the tile has ${inner}`)
    const fig = figure === undefined ? '' : textOf(figure)
    if (figure?.props?.wrap !== 'truncate-end' && fig.length > inner) problems.push(`${name}: the figure "${fig}" is ${fig.length} columns, the tile has ${inner}`)
  }
  return { tiles: tiles.length, problems }
}

test('Arrange cards in Swedish at 540 pt: no tile past the edge, no line wider than its tile, every tag whole', async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on, world({ 'cockpit:setting:look.language': 'sv' }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const tree = await board($ as never)
  const all = walk(tree).map(textOf).join(' ')
  expect(all).toMatch(/Gränser i din plan/)
  expect(all).toMatch(/Agenter/)
  const { tiles, problems } = problemsOf(tree)
  expect(tiles).toBeGreaterThanOrEqual(12)
  expect(problems).toEqual([])
})

test('Arrange cards in English with a very long figure: the figure truncates, the tile stays inside the region', async ($, on) => {
  mock.clock(on, { now: NOW })
  const long = ['an-extremely-long-skill-name-that-goes-on-and-on', 'another-very-long-skill-name-for-the-figure', 'a-third-long-skill-name']
  const counts = { '2026-10-09': Object.fromEntries(long.map(n => [n, 3])), '2026-10-10': Object.fromEntries(long.map(n => [n, 2])) }
  const listing = { at: NOW - MIN, total: 3, included: 3, tokens: 2100, names: long }
  memStore(on, world({ [SKILLS_COUNTS_KEY]: counts, [SKILLS_LISTING_KEY]: listing }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const tree = await board($ as never)
  const figures = walk(tree).filter(n => n.type === 'Text').map(textOf)
  expect(figures.some(f => f.includes('extremely long skill name') && f.length > REGION_COLS)).toBe(true)
  expect(problemsOf(tree).problems).toEqual([])
})

test('the band: a turn\'s risks say Swedish on a Swedish pane, English otherwise', () => {
  expect(RISK_LABELS.filter(l => SV[l] === undefined || SV[l] === l)).toEqual([])
  expect(SV[RISKY_BAND]).toBe('Riskabelt: {list}')
  setLang('sv')
  try {
    expect(bandWords('Risky: deleted files', tr)).toBe('Riskabelt: raderade filer')
    expect(bandWords('Risky: installed a package, pushed to a remote', tr)).toBe('Riskabelt: installerade ett paket, pushade till en fjärrserver')
    expect(bandWords('Main is red', tr)).toBe('Main är röd')
  } finally {
    setLang('en')
  }
  expect(bandWords('Risky: deleted files', tr)).toBe('Risky: deleted files')
  expect(bandWords('Main is red', tr)).toBe('Main is red')
})

test('the /vaken text twin stays English on a Swedish pane, the estimate line too', async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on, world({ 'cockpit:setting:look.language': 'sv' }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  // The pane draws in Swedish first, so the language is Swedish when the command runs.
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })) as unknown as Pane
  expect(textOf(await ui.drawn())).toMatch(/Gränser i din plan/)
  await ui.unmount()
  const text = ((await $.command.run(viaParent('vaken', ''))) as { text: string }).text
  expect(text).toMatch(/Run one task: Add a dark mode toggle/)
  expect(text).toMatch(/Estimate: /)
  const swedish = ['Uppskattning', 'hjälpare', 'gissning', 'Veckofönstret', 'använt', 'Arbetar', 'Vecka', 'återställs', 'Planens', 'Riskabelt']
  expect(swedish.filter(w => text.includes(w))).toEqual([])
})
