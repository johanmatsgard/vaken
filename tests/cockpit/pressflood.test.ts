// The host showed "flooded the page with messages" over every press region after a resize of a wide pane.
import { expect } from 'claude-code/testing'
import Press from '../hooks/press'
import { test } from './slow'

type Ev = { type: string; x: number; y: number; button?: string }
type Counts = { onPointer: number; setState: number; post: number; posted: unknown[] }
type Fake = { s: Record<string, unknown>; counts: Counts; fire: (e: Ev) => void; draw: (look: 'row' | 'button' | 'lit') => unknown }

function fake(): Fake {
  let listener: ((e: Ev) => void) | undefined
  const counts: Counts = { onPointer: 0, setState: 0, post: 0, posted: [] }
  const s: Record<string, unknown> = {
    elements: { Box: (p: unknown) => ({ type: 'Box', props: p }) },
    state: undefined,
    columns: 20,
    rows: 2,
    setState: (n: unknown) => {
      counts.setState++
      s.state = n
    },
    onPointer: (fn: (e: Ev) => void) => {
      counts.onPointer++
      listener = fn
      return () => undefined
    },
    post: (d: unknown) => {
      counts.post++
      counts.posted.push(d)
    },
  }
  const render = Press as unknown as (p: unknown, s: unknown) => unknown
  return { s, counts, fire: e => listener?.(e), draw: look => render({ look }, s) }
}

const washed = (tree: unknown): boolean => JSON.stringify(tree).includes('backgroundColor')

test('dozens of press Clients redrawn and swept by the pointer stay quiet; a draw sends nothing', async () => {
  const all = Array.from({ length: 60 }, (_, i) => ({ look: (i % 3 === 0 ? 'row' : i % 3 === 1 ? 'button' : 'lit') as 'row' | 'button' | 'lit', f: fake() }))
  // A resize redraws every instance many times: the listener is set once, nothing else is sent.
  for (let r = 0; r < 30; r++) for (const a of all) a.f.draw(a.look)
  for (const a of all) {
    expect(a.f.counts.onPointer).toBe(1)
    expect(a.f.counts.setState).toBe(0)
    expect(a.f.counts.post).toBe(0)
  }
  for (let k = 0; k < 20; k++) {
    for (const a of all) {
      a.f.fire({ type: 'enter', x: 1, y: 0 })
      a.f.draw(a.look)
      a.f.fire({ type: 'enter', x: 2, y: 0 })
      a.f.fire({ type: 'leave', x: 2, y: 0 })
      a.f.fire({ type: 'leave', x: 2, y: 0 })
      a.f.draw(a.look)
    }
  }
  for (const a of all) {
    expect(a.f.counts.onPointer).toBe(1)
    // a Client paints nothing, so it never sends a setState, whatever its look and however often the pointer crosses it.
    expect(a.f.counts.setState).toBe(0)
    expect(a.f.counts.post).toBe(0)
  }
})

test('a press still posts once on a down and an up inside; cancelled, repeated and right-button events do not', async () => {
  const a = fake()
  a.draw('button')
  a.fire({ type: 'down', x: 3, y: 0, button: 'left' })
  a.fire({ type: 'up', x: 3, y: 0 })
  expect(a.counts.posted).toEqual([{ press: true }])
  expect(a.counts.setState).toBe(0)
  a.fire({ type: 'up', x: 3, y: 0 })
  expect(a.counts.post).toBe(1)
  a.fire({ type: 'down', x: 3, y: 0, button: 'left' })
  a.fire({ type: 'up', x: 99, y: 0 })
  expect(a.counts.post).toBe(1)
  a.fire({ type: 'down', x: 3, y: 0, button: 'right' })
  a.fire({ type: 'up', x: 3, y: 0 })
  expect(a.counts.post).toBe(1)
})

function fakeWith(columns: number, rows: number): Fake & { drawP: (p: Record<string, unknown>) => unknown } {
  const f = fake()
  f.s.columns = columns
  f.s.rows = rows
  const render = Press as unknown as (p: unknown, s: unknown) => unknown
  return { ...f, drawP: p => render({ look: 'row', ...p }, f.s) }
}

test('probe on, the pane resized: a burst of 100 enters and leaves over each of 40 regions, redrawn with new rows between, posts nothing', async () => {
  const all = Array.from({ length: 40 }, () => fakeWith(30, 1))
  for (const a of all) a.drawP({ log: true, r: 2 })
  for (let k = 0; k < 50; k++) {
    for (const a of all) {
      a.fire({ type: 'enter', x: k % 30, y: 0 })
      a.drawP({ log: true, r: 2 + (k % 3), scope: `hv-${k % 2}` })
      a.fire({ type: 'move', x: k % 30, y: 0 })
      a.fire({ type: 'leave', x: k % 30, y: 0 })
    }
  }
  for (const a of all) {
    expect(a.counts.onPointer, 'one listener, whatever the props').toBe(1)
    expect(a.counts.post).toBe(0)
    expect(a.counts.setState).toBe(0)
  }
  const a = all[0]!
  a.fire({ type: 'down', x: 4, y: 0, button: 'left' })
  expect(a.counts.post, 'a down sends nothing; it rides in the up').toBe(0)
  a.fire({ type: 'up', x: 4, y: 0, button: 'left' })
  expect(a.counts.post).toBe(1)
  const sent = a.counts.posted[0] as { press?: boolean; log?: { type: string; columns: number; rows: number }[] }
  expect(sent.press).toBe(true)
  expect(sent.log?.slice(-2).map(e => [e.type, e.columns, e.rows])).toEqual([
    ['down', 30, 1],
    ['up', 30, 1],
  ])
  for (const b of all) b.fire({ type: 'up', x: 1, y: 0 })
  expect(all.reduce((t, b) => t + b.counts.post, 0)).toBe(2)
})

test('probe on, a press held while the pointer leaves and comes back many times still carries its down', async () => {
  const a = fakeWith(20, 2)
  a.drawP({ log: true, r: 2 })
  a.fire({ type: 'down', x: 3, y: 1, button: 'left' })
  for (let k = 0; k < 20; k++) {
    a.fire({ type: 'leave', x: 25, y: 1 })
    a.fire({ type: 'enter', x: 3, y: 1 })
  }
  a.fire({ type: 'up', x: 3, y: 1, button: 'left' })
  expect(a.counts.post).toBe(1)
  const sent = a.counts.posted[0] as { press?: boolean; log?: { type: string }[] }
  expect(sent.press).toBe(true)
  expect(sent.log?.[0]?.type).toBe('down')
  expect(sent.log?.at(-1)?.type).toBe('up')
})

test('a prop change adds no second listener, and the press reads the newest rows', async () => {
  const a = fakeWith(20, 1)
  a.drawP({ r: 1 })
  a.drawP({ r: 3 })
  a.drawP({ r: 3, log: true })
  a.drawP({ r: 3 })
  expect(a.counts.onPointer).toBe(1)
  a.fire({ type: 'down', x: 2, y: 0, button: 'left' })
  a.fire({ type: 'up', x: 2, y: 3, button: 'left' })
  expect(a.counts.posted).toEqual([{ press: true }])
  a.fire({ type: 'up', x: 2, y: 0 })
  a.fire({ type: 'enter', x: 2, y: 0 })
  a.fire({ type: 'leave', x: 2, y: 0 })
  expect(a.counts.post).toBe(1)
})

test('no press Client paints, at rest, under the pointer or held, in any look; it only joins its part\'s hover group', async () => {
  for (const look of ['row', 'button', 'lit'] as const) {
    const f = fake()
    const render = Press as unknown as (p: unknown, s: unknown) => unknown
    const at = (): unknown => render({ look, scope: 'hv-x' }, f.s)
    expect(washed(at())).toBe(false)
    f.fire({ type: 'enter', x: 1, y: 0 })
    expect(washed(at())).toBe(false)
    f.fire({ type: 'down', x: 1, y: 0, button: 'left' })
    expect(washed(at())).toBe(false)
    expect(JSON.stringify(at())).not.toContain('borderStyle')
    expect(JSON.stringify(at()), 'it joins the part\'s hover group').toContain('"scope":"hv-x"')
    f.fire({ type: 'leave', x: 1, y: 0 })
    expect(f.counts.setState).toBe(0)
  }
})
