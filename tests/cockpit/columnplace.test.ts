// Arrange with column placement: each column keeps its own list, a card dropped in a column stays there, fewer columns fold the lists together.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'
import { APPEARS } from '../hooks/core/cardrules'
import { boardLists, dropAt, listsLayout, placeLists } from '../hooks/features/home/board'
import { foldLists, parseLists, readOrderSet } from '../hooks/features/home/layouts'
import { CARD_IDS } from '../hooks/features/home/logic'
import { COLUMNS_3_FROM_PT, columnPt } from '../hooks/ui/tokens'

const NOW = new Date(2026, 9, 10, 14, 0).getTime()

test('a stored order with "|" is column lists; one without is not; a card in no list goes under the last column', () => {
  expect(parseLists('limit,here')).toBeUndefined()
  expect(parseLists(undefined)).toBeUndefined()
  const lists = parseLists('here,limit|agents||guard,bogus,here') ?? []
  expect(lists).toHaveLength(4)
  expect(lists[0]).toEqual(['here', 'limit'])
  expect(lists[1]).toEqual(['agents'])
  expect(lists[2]).toEqual([])
  expect(lists[3].slice(0, 1)).toEqual(['guard'])
  expect(lists.flat().sort()).toEqual([...CARD_IDS].sort())
})

test('more lists than columns fold together in order; no card is lost', () => {
  expect(foldLists([['a'], ['b'], ['c'], ['d']], 2)).toEqual([['a', 'b'], ['c', 'd']])
  expect(foldLists([['a'], ['b'], ['c']], 2)).toEqual([['a', 'b'], ['c']])
  expect(foldLists([['a'], ['b'], ['c']], 1)).toEqual([['a', 'b', 'c']])
  expect(foldLists([['a'], ['b']], 3)).toEqual([['a'], ['b']])
})

test('a width with no order of its own starts from the nearest wider one with columns, folded; a width with its own order keeps it', async () => {
  const mem = new Map<string, unknown>([
    ['cockpit:pref:gorder:4', 'here|limit|agents|guard'],
    ['cockpit:pref:gorder:3', 'others,here,limit'],
  ])
  const i = { get: async (k: string) => mem.get(k) } as never
  const { orders, lists } = await readOrderSet(i)
  expect(lists[4]?.slice(0, 3)).toEqual([['here'], ['limit'], ['agents']])
  expect(lists[3]).toBeUndefined()
  expect(orders[3].slice(0, 3)).toEqual(['others', 'here', 'limit'])
  expect(lists[2]?.[0]).toEqual(['here', 'limit'])
  expect(lists[2]?.[1]?.slice(0, 2)).toEqual(['agents', 'guard'])
  expect(orders[2]).toEqual(lists[2]?.flat())
  expect(lists[1]?.[0]?.slice(0, 4)).toEqual(['here', 'limit', 'agents', 'guard'])
  expect(lists[5]).toBeUndefined()
})

test('a card stays in its column when a card before it in another column hides; an empty column is not drawn; late cards go under the last', () => {
  const lists = [['limit', 'here'], ['agents', 'setup'], ['guard']]
  expect(placeLists(['needs', 'limit', 'here', 'agents', 'setup', 'guard'], lists, 3)).toEqual([[0, 1, 2], [3, 4], [5]])
  // Plan limits and This session hide: Agents does not move to the first column (by count it would)
  expect(placeLists(['agents', 'setup', 'guard'], lists, 3)).toEqual([[0, 1], [2]])
  expect(placeLists(['limit', 'agents', 'setup', 'guard'], lists, 3)).toEqual([[0], [1, 2], [3]])
  // Fewer columns: the lists fold together in order
  expect(placeLists(['limit', 'here', 'agents', 'setup', 'guard'], lists, 2)).toEqual([[0, 1, 2, 3], [4]])
  expect(placeLists(['limit', 'agents', 'guard', 'safety'], lists, 3, 1)).toEqual([[0], [1], [2, 3]])
})

test('the board keeps every column of the width, an empty one as a drop place, and a drop goes to the column under the pointer', () => {
  const heights = { limit: 4, here: 4, agents: 4 }
  const lists = boardLists(['needs', 'limit', 'here', 'agents'], [['limit', 'here'], ['agents'], []], 3)
  expect(lists).toEqual([['needs', 'limit', 'here'], ['agents'], []])
  const board = listsLayout(lists, heights, 92, 1)
  expect(board.empty.map(r => r.col)).toEqual([2])
  // Here dragged over the empty third column stays there
  const moved = dropAt(lists, 'here', board.colX[2] + 2, 1, board)
  expect(moved).toEqual([['needs', 'limit'], ['agents'], ['here']])
  // Dropped at the top of the first column it goes under Needs you, which stays first
  expect(dropAt(moved, 'agents', 2, 0, listsLayout(moved, heights, 92, 1))).toEqual([['needs', 'agents', 'limit'], [], ['here']])
  // With no lists yet the board shows the order cut by count, as the pane draws it
  expect(boardLists(['limit', 'here', 'agents'], undefined, 2)).toEqual([['limit', 'here'], ['agents']])
})

function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
}

type Node = { type?: string; text?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const textOf = (n: Node): string => [n.text ?? '', ...(n.children ?? []).map(c => (typeof c === 'string' ? c : c !== null && typeof c === 'object' ? textOf(c as Node) : ''))].join('')
// Three columns wide (the bucket the stored order is for)
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: Math.ceil(COLUMNS_3_FROM_PT / columnPt()) + 10, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }

test('the pane draws each stored column; the board shows an empty column as "Drop a card here", and a drop there is kept', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = new Map<string, unknown>([
    ['cockpit:firstrun', 'done'],
    ['cockpit:setting:look.view', 'custom'],
    ['cockpit:setting:look.needs', 'hidden'],
    ...Object.keys(APPEARS).map((id): [string, unknown] => [`cockpit:setting:cards.${id}`, 'show']),
    ['cockpit:pref:gorder:3', 'limit,here,others,back,context,ship,prs,preview,agents,setup,computer,skills,do,guard,safety,autopilot,proof||'],
  ])
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
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const home = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  // Every card in the first list: one column drawn, never an empty one
  expect(kids(((await home.find({ key: 'columns' })) as Node | undefined) ?? {})).toHaveLength(1)
  await home.press({ key: 'arrange' })
  await home.unmount()
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const client = (await ui.find({ key: 'arrange-board' })) as { props: { props: { lists: string[][] } } } | undefined
  const lists = client?.props.props.lists ?? []
  expect(lists.map(l => l.length)).toEqual([17, 0, 0])
  await ui.resize({ columns: 90, rows: 200, in: 'arrange-board' })
  const drops = kids((await ui.drawn({ in: 'arrange-board' })) as Node).filter(n => textOf(n) === 'Drop a card here')
  expect(drops).toHaveLength(2)
  await ui.post({ lists: [lists[0].filter(id => id !== 'agents'), ['agents'], []].map(l => l.join(',')).join('|'), bucket: 3 }, { in: 'arrange-board' })
  expect(String(mem.get('cockpit:pref:gorder:3')).split('|')[1]).toBe('agents')
  await ui.press({ key: 'arrange-done' })
  await ui.unmount()
  const after = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const row = (await after.find({ key: 'columns' })) as Node | undefined
  expect(kids(row ?? {})).toHaveLength(2)
  await after.unmount()
})
