// The Agent setup tile's figure does not repeat its own title.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'
import { APPEARS } from '../hooks/core/cardrules'
import { emptyState } from '../hooks/core/proof'
import { SKILLS_COUNTS_KEY, SKILLS_LISTING_KEY } from '../hooks/core/skills'
import { columnPt } from '../hooks/ui/tokens'

const NOW = new Date(2026, 9, 10, 14, 0).getTime()
const MIN = 60_000
const PANE_PT = 540
const REGION_COLS = Math.floor(PANE_PT / columnPt())

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: PANE_PT / columnPt(), placement: 'dock' as const, scroll: { bodyRows: 60, offset: 0, total: 60 }, view: {} }

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


function tilesOf(tree: Node): { title: string; figure: string }[] {
  return walk(tree)
    .filter(n => n.type === 'Box' && n.props?.position === 'absolute')
    .map(tile => {
      // The tile holds one box with the title row and the figure (both lines sit in the tile's first rows)
      const [inner] = kids(tile)
      const [head, figure] = inner === undefined ? [] : kids(inner)
      const [title] = head === undefined ? [] : kids(head)
      return { title: title === undefined ? '' : textOf(title), figure: figure === undefined ? '' : textOf(figure) }
    })
}

for (const lang of ['en', 'sv'] as const) {
  test(`no Arrange tile's figure starts with its own title (${lang})`, async ($, on) => {
    mock.clock(on, { now: NOW })
    memStore(on, world(lang === 'sv' ? { 'cockpit:setting:look.language': 'sv' } : {}))
    mock.env(on, { HOME: '/home/test' })
    engine(on)
    const tiles = tilesOf(await board($ as never))
    expect(tiles.length).toBeGreaterThanOrEqual(12)
    const setup = tiles.find(t => t.title === (lang === 'sv' ? 'Agentuppsättning' : 'Agent setup'))
    expect(setup).toBeDefined()
    expect(setup?.figure ?? '').not.toBe('')
    const echoes = tiles.filter(t => t.figure.toLowerCase().startsWith(`${t.title.toLowerCase()}:`) || t.figure.toLowerCase() === t.title.toLowerCase())
    expect(echoes).toEqual([])
  })
}
