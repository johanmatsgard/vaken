// Resize sweep: the home pane drawn at 294, 400, 700, 1100, 1600, 2400, 3440 and 5120 pt and back down, round after round.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import { BUNDLE_TTL_MS } from '../hooks/core/io'
import { setSetupExists } from '../hooks/features/setupfiles'
import Press from '../hooks/press'
import { columnPt, columnsFor } from '../hooks/ui/tokens'
import { BASE_SEEDS, STATES, engine, getNow, kids, MIN, nameOf, propsAt, setNow, walk } from './statefixtures'
import type { Node, Pane, World } from './statefixtures'
import { viaParent } from './viaparent'

const SIZES_PT = [294, 400, 700, 1100, 1600, 2400, 3440, 5120]
const UP_AND_DOWN = [...SIZES_PT, ...[...SIZES_PT].reverse().slice(1)]
const SHORT_PT = [294, 700, 1600, 3440, 5120, 3440, 1600, 700, 294]
// Rounds: 20 rounds of every state took 33 s, so the busy board and the views keep the full 20-round and 4-round trips.
const ROUNDS_BUSY = 20
const ROUNDS_STATE = 1
const ROUNDS_VIEW = 4

type Ev = { type: string; x: number; y: number; button?: string }
type Props = { look: 'row' | 'button' | 'lit'; h?: number }
type Fake = {
  s: Record<string, unknown>
  onPointer: number
  setState: number
  post: number
  expectedState: number
  over: boolean
  look: 'row' | 'button' | 'lit'
  fire: (e: Ev) => void
  draw: (p: Props) => void
  presses: number
}
function fake(look: 'row' | 'button' | 'lit'): Fake {
  let listener: ((e: Ev) => void) | undefined
  const f: Fake = {
    s: {},
    onPointer: 0,
    setState: 0,
    post: 0,
    expectedState: 0,
    over: false,
    look,
    presses: 0,
    fire: e => listener?.(e),
    draw: p => {
      f.look = p.look
      ;(Press as unknown as (p: Props, s: unknown) => unknown)(p, f.s)
    },
  }
  Object.assign(f.s, {
    elements: { Box: (p: unknown) => ({ type: 'Box', props: p }) },
    state: undefined,
    columns: 20,
    rows: 2,
    setState: (n: unknown) => {
      f.setState++
      f.s.state = n
    },
    onPointer: (fn: (e: Ev) => void) => {
      f.onPointer++
      listener = fn
      return () => undefined
    },
    post: () => {
      f.post++
    },
  })
  return f
}

const clientsOf = (root: Node): Node[] => walk(root).filter(x => x.type === 'Client')
const pressProps = (c: Node): Props => {
  const p = (c.props?.props ?? {}) as Partial<Props>
  return { look: p.look === 'row' ? 'row' : p.look === 'lit' ? 'lit' : 'button', ...(typeof p.h === 'number' ? { h: p.h } : {}) }
}
const isPress = (c: Node): boolean => String(c.props?.module ?? '').endsWith('press.tsx')
const FLOOD = /flooded|too many messages/i

// The facts printed at the end: how many press Clients a full pane holds at 3440 pt (a fact for the plan).
const facts: string[] = []
const presses3440 = new Map<string, number>()

type Sweeper = {
  pane: () => Promise<Pane>
  name: string
  problems: string[]
  seen: { sizes: number; clients: number; events: number; cards: number }
}

async function resizeRounds(ui: Pane, name: string, rounds: number, sizes: number[], board: boolean, problems: string[], seen: Sweeper['seen']): Promise<void> {
  const instances = new Map<string, Fake>()
  const where = new Map<string, Map<string, number>>()
  const whereByCount = new Map<number, Map<string, number>>()
  const bad = (m: string) => problems.push(`${name}: ${m}`)
  for (let round = 0; round < rounds; round += 1) {
    for (const w of sizes) {
      let root: Node
      try {
        await ui.redraw(propsAt(w))
        root = await ui.drawn()
      } catch (e) {
        bad(`at ${w} pt (round ${round}) the pane did not draw: ${String(e).slice(0, 120)}`)
        return
      }
      seen.sizes += 1
      if (FLOOD.test(JSON.stringify(root))) bad(`at ${w} pt a "flooded" text is in the tree`)
      const clients = clientsOf(root)
      if (new Set(clients.map(nameOf)).size !== clients.length) bad(`at ${w} pt two Clients share a key`)
      if (w === 3440 && round === 0) presses3440.set(name, clients.filter(isPress).length)
      // The real Clients: each one's drawn tree is read (a Client the engine unmounted rejects), and the pointer sweeps in, over and out.
      const keys = new Set(clients.map(nameOf))
      for (const k of [...instances.keys()]) if (!keys.has(k)) instances.delete(k)
      for (const c of clients) {
        const key = nameOf(c)
        seen.clients += 1
        try {
          await ui.pointer({ type: 'enter', x: 1, y: 0, in: key })
          await ui.pointer({ type: 'move', x: 2, y: 0, in: key })
          await ui.pointer({ type: 'leave', x: 2, y: 0, in: key })
          seen.events += 3
          if (FLOOD.test(JSON.stringify(await ui.drawn({ in: key })))) bad(`at ${w} pt the Client ${key} drew a "flooded" text`)
        } catch (e) {
          bad(`at ${w} pt (round ${round}) the Client ${key} was unmounted or faulted: ${String(e).slice(0, 120)}`)
        }
        if (!isPress(c)) continue
        const p = pressProps(c)
        let f = instances.get(key)
        if (f === undefined) {
          f = fake(p.look)
          instances.set(key, f)
        }
        const before = f.setState
        f.s.columns = Math.max(1, Math.round(w / columnPt() / 4))
        f.draw(p)
        f.draw(p)
        if (f.setState !== before) bad(`at ${w} pt the press ${key} sent a setState on a draw`)
        for (const type of ['enter', 'enter', 'leave', 'leave'] as const) {
          const was = f.setState
          const changes = f.over !== (type === 'enter')
          f.over = type === 'enter'
          f.fire({ type, x: 1, y: 0 })
          if (changes && f.look !== 'row') f.expectedState += 1
          f.draw(p)
          if (f.setState - was > 1) bad(`at ${w} pt the press ${key} sent ${f.setState - was} setStates for one ${type}`)
        }
        f.fire({ type: 'down', x: 1, y: 0, button: 'left' })
        f.fire({ type: 'up', x: 1, y: 0, button: 'left' })
        f.presses += 1
        f.fire({ type: 'up', x: 1, y: 0, button: 'left' })
      }
      if (board) {
        const row = walk(root).find(x => nameOf(x) === 'columns')
        const cols = row === undefined ? [] : kids(row)
        const now = new Map<string, number>()
        cols.forEach((col, i) => {
          for (const card of kids(col)) now.set(nameOf(card), i)
        })
        const count = columnsFor(w)
        for (const [map, id] of [[where.get(String(w)), `${w} pt`], [whereByCount.get(count), `${count} columns`]] as const) {
          if (map === undefined) continue
          for (const [card, col] of now) if (map.has(card)) seen.cards += 1
          for (const [card, col] of now) if (map.has(card) && map.get(card) !== col) bad(`at ${id} the card ${card} moved from column ${map.get(card)} to column ${col}`)
        }
        if (!where.has(String(w))) where.set(String(w), now)
        if (!whereByCount.has(count)) whereByCount.set(count, now)
      }
    }
  }
  for (const [key, f] of instances) {
    if (f.onPointer !== 1) bad(`the press ${key} set its pointer listener ${f.onPointer} times`)
    if (f.setState > f.expectedState) bad(`the press ${key} sent ${f.setState} setStates for ${f.expectedState} real hover changes`)
    if (f.look === 'row' && f.setState !== 0) bad(`the row press ${key} sent ${f.setState} setStates`)
    if (f.post !== f.presses) bad(`the press ${key} posted ${f.post} times for ${f.presses} presses`)
  }
}

test('resize 294 to 5120 pt and back, the pointer swept between: no flood, no unmount, no second listener, no card changes column', { timeoutMs: 120_000 }, async ($, on) => {
  const w: World = { mem: new Map(), files: new Map(), listening: {}, procs: [] }
  const clock = mock.clock(on, { now: getNow() })
  mock.env(on, { HOME: '/home/test' })
  engine(on, w)
  setSetupExists(async p => w.files.has(p))
  const mount = (width: number) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(width) }) as unknown as Promise<Pane>
  const help = () => $.command.run(viaParent('vaken-help', ''))
  const problems: string[] = []
  const seen = { sizes: 0, clients: 0, events: 0, cards: 0 }
  const fresh = async () => {
    await clock.advance(BUNDLE_TTL_MS + 10 * MIN)
    setNow(clock.now())
    w.files = new Map()
    w.listening = {}
    BASE_SEEDS(w.mem)
  }

  // The busy board, 20 rounds; and Settings, Arrange and Help.
  await fresh()
  const busy = await mount(1100)
  await resizeRounds(busy, 'the board', ROUNDS_BUSY, UP_AND_DOWN, true, problems, seen)
  await busy.unmount()
  await fresh()
  w.mem.set('cockpit:setting:look.view', 'standard')
  const standard = await mount(1100)
  await resizeRounds(standard, 'the Standard view', ROUNDS_VIEW, UP_AND_DOWN, true, problems, seen)
  await standard.unmount()
  await fresh()
  const views: Array<[string, (ui: Pane) => Promise<void>, (ui: Pane) => Promise<void>]> = [
    ['Settings', ui => ui.press({ key: 'settings' }), ui => ui.press({ key: 'settings-done' })],
    ['Arrange', ui => ui.press({ key: 'arrange' }), ui => ui.press({ key: 'arrange-done' })],
    ['Help', async () => void (await help()), ui => ui.press({ key: 'help-done' })],
  ]
  for (const [name, enter, leave] of views) {
    const first = await mount(1100)
    await enter(first)
    await first.unmount()
    const ui = await mount(1100)
    await resizeRounds(ui, name, ROUNDS_VIEW, UP_AND_DOWN, false, problems, seen)
    await ui.unmount()
    const out = await mount(1100)
    await leave(out)
    await out.unmount()
  }

  for (const state of STATES) {
    await fresh()
    state.seed(w.mem, w)
    await state.before?.($)
    const first = await mount(1130)
    await state.start?.(first)
    await clock.settle()
    await first.unmount()
    const board = await mount(1130)
    await resizeRounds(board, state.name, ROUNDS_STATE, SHORT_PT, true, problems, seen)
    await board.unmount()
    if (state.open !== undefined) {
      const prep = await mount(1130)
      await state.open(prep)
      await prep.unmount()
      const view = await mount(1130)
      await resizeRounds(view, `${state.name} (its view)`, ROUNDS_STATE, SHORT_PT, false, problems, seen)
      await view.unmount()
    }
    if (state.leave !== undefined) {
      const back = await mount(1130)
      await state.leave(back)
      await back.unmount()
    }
  }

  const counts = [...presses3440.entries()]
  const most = counts.reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0] as [string, number])
  facts.push(`press Clients at 3440 pt: the busy board ${presses3440.get('the board')}, the most in any view or state ${most[1]} (${most[0]}), the fewest ${Math.min(...counts.map(c => c[1]))}`)
  console.log(`resizesweep: ${seen.sizes} sizes drawn, ${seen.clients} Client sweeps, ${seen.events} pointer events, ${seen.cards} card-column comparisons; ${facts.join('; ')}`)
  expect(seen.sizes).toBeGreaterThan(UP_AND_DOWN.length * (ROUNDS_BUSY + 3 * ROUNDS_VIEW))
  expect(seen.clients).toBeGreaterThan(3000)
  expect(seen.cards).toBeGreaterThan(500)
  // The first few only: a flood of failures would be a flood of text.
  expect([...new Set(problems)].slice(0, 12)).toEqual([])
})
