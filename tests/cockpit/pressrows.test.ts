// So the press module draws a box of the part's whole rows (`r`), the card's pass tells every Client its rows.
import { expect } from 'claude-code/testing'
import Press from '../hooks/press'
import { drawnRows } from '../hooks/ui/firstclick'
import { clientRows, reachCard } from '../hooks/ui/reach'
import { LIST_ROW_GAP, LIST_ROW_H, ROW_PT } from '../hooks/ui/tokens'
import { test } from './slow'

type Ev = { type: string; x: number; y: number; button?: string }
type T = { type?: string; key?: string; props?: Record<string, unknown>; children?: T[] }

function fake(rows: number) {
  let listener: ((e: Ev) => void) | undefined
  const posted: unknown[] = []
  const s = {
    elements: { Box: (p: unknown) => ({ type: 'Box', props: p }) },
    state: undefined,
    columns: 40,
    rows,
    setState: () => undefined,
    onPointer: (fn: (e: Ev) => void) => {
      listener = fn
      return () => undefined
    },
    post: (d: unknown) => {
      posted.push(d)
    },
  }
  const render = Press as unknown as (p: unknown, s: unknown) => { props: Record<string, unknown> }
  return { posted, fire: (e: Ev) => listener?.(e), draw: (p: Record<string, unknown>) => render({ look: 'lit', ...p }, s) }
}

const pressRow = (key: string, heightRows: number): T => ({
  type: 'Box',
  key,
  props: { minHeight: heightRows, flexDirection: 'row' },
  children: [
    { type: 'Text', props: {} },
    { type: 'Box', key: `fc-${key}-box`, props: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, children: [{ type: 'Client', key: `fc-${key}`, props: { width: '100%', height: '100%', props: { look: 'lit' } } }] },
  ],
})
const all = (n: T): T[] => [n, ...(n.children ?? []).flatMap(all)]

test('the press module draws the part\'s whole rows, and the region\'s 100% only where no count is named', () => {
  expect(drawnRows(2)).toBe(2)
  expect(drawnRows(3)).toBe(3)
  expect(drawnRows(undefined)).toBe('100%')
  expect(drawnRows(0)).toBe('100%')
  expect(drawnRows(1.5)).toBe('100%')
  const f = fake(1)
  expect(f.draw({ r: 2 }).props.height).toBe(2)
  expect(f.draw({}).props.height).toBe('100%')
  expect(f.draw({ r: 2 }).props.width).toBe('100%')
})

test('a row of N rows in a card gets one region of N rows (the anchor, the Client and the drawn box), and the next row is laid after it', () => {
  // On the half-row grid a two-line row alone is whole rows (2 * 19 = 38 pt, exactly 2).
  const twoLine = 2 * LIST_ROW_H + LIST_ROW_GAP
  const card: T = { type: 'Box', props: { flexDirection: 'column' }, children: [pressRow('a', twoLine / ROW_PT), pressRow('b', LIST_ROW_H / ROW_PT)] }
  const out = reachCard(card, 0) as T
  const clients = all(out).filter(n => n.type === 'Client')
  expect(clients.map(c => c.key)).toEqual(['fc-a', 'fc-b'])
  expect(clientRows((out.children as T[])[0])).toBe(3)
  for (const c of clients) {
    const h = c.props?.height
    expect(typeof h === 'number' && Number.isInteger(h) && h >= 1).toBe(true)
    expect((c.props?.props as { r?: unknown }).r, 'the module draws what the Client names').toBe(h)
  }
  // The anchors name the same rows and no bottom; row b's anchor comes later in the tree.
  const anchors = all(out).filter(n => n.key?.endsWith('-box') === true)
  expect(anchors.map(a => [a.key, a.props?.height, a.props?.bottom])).toEqual([
    ['fc-a-box', 3, undefined],
    ['fc-b-box', 1, undefined],
  ])
})

test('a press is the whole part: a down on one row and an up on another row of the same part count once; past the part it is cancelled', () => {
  const f = fake(1)
  f.draw({ r: 2 })
  f.fire({ type: 'down', x: 5, y: 0, button: 'left' })
  f.fire({ type: 'up', x: 5, y: 2 })
  expect(f.posted).toEqual([{ press: true }])
  f.fire({ type: 'down', x: 5, y: 1, button: 'left' })
  f.fire({ type: 'up', x: 5, y: 0 })
  expect(f.posted).toEqual([{ press: true }, { press: true }])
  f.fire({ type: 'down', x: 5, y: 0, button: 'left' })
  f.fire({ type: 'up', x: 5, y: 4 })
  expect(f.posted.length).toBe(2)
  const g = fake(2)
  g.draw({ r: 2 })
  g.fire({ type: 'down', x: 1, y: 1, button: 'left' })
  g.fire({ type: 'up', x: 1, y: 1 })
  expect(g.posted).toEqual([{ press: true }])
})
