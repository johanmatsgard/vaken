// Width sweep (no app): the home pane drawn at 700, 1100, 1600, 2400, 3400, 3440 and 5120 pt, in the board.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { looked as pressLooked, pressProblems } from './presssizes'
import type { On } from 'claude-code'

import { APPEARS } from '../hooks/core/cardrules'
import { BUNDLE_TTL_MS } from '../hooks/core/io'
import { AMBER, ARRANGE_LIFT_FILL, ARRANGE_LIFT_TEXT, BLUE, BOLD_CHAR_PT, BORDER_X_PT, CHEVRON_GAP, CHEVRON_SLOT, columnPt, COLUMNS_2_FROM_PT, COLUMNS_3_FROM_PT, DOT, GLANCE_DOT_GAP, GLANCE_VALUE_GAP, GREY, ICON_GAP, PRESS_WASH_GREY, RED, ROW_PT, SWITCH_KNOB_FILL, TEXT_CHAR_PT, columnsFor } from '../hooks/ui/tokens'
import { paneGrid } from '../hooks/features/home/grid'
import { CARD_IDS } from '../hooks/features/home/logic'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const MIN = 60_000
const WIDTHS_PT = [700, 1100, 1600, 2400, 3400, 3440, 5120]
const HEIGHT_PT = 1400
const CLOSE = 0.01

const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
function fill(mem: Map<string, unknown>) {
  mem.clear()
  mem.set('cockpit:setting:look.view', 'custom')
  mem.set('cockpit:firstrun', 'done')
  for (const id of Object.keys(APPEARS)) mem.set(`cockpit:setting:cards.${id}`, 'show')
  mem.set('cockpit:session:test-session', rec('test-session', { cwd: '/work/app', contextPercent: 38, costUsd: 1.2, fiveHourPercent: 62, fiveHourResetsAt: '2026-10-11T18:00:00Z' }))
  // A run of four tasks, so the Agents card has its rows and the Agents view has something to draw.
  const task = (n: number, text: string, state: string, over: Record<string, unknown> = {}) => ({ n, text, role: 'builder', model: 'auto', folder: false, state, tries: 0, check: 'none', ...over })
  mem.set('cockpit:orch:test-session', {
    id: 'r1',
    name: 'Tidy the app',
    status: 'running',
    createdAt: NOW - 30 * MIN,
    startedAt: NOW - 25 * MIN,
    choices: { atOnce: 3, check: 'npm test', reviewer: false, helperMin: 30, helperUsd: 2, runUsd: 10, afterLimit: 'go' },
    tasks: [
      task(1, 'Rename the header component', 'done', { check: 'passed', endedAt: NOW - 10 * MIN, usd: 0.21 }),
      task(2, 'Fix the date format on the invoice page', 'running', { startedAt: NOW - 5 * MIN, agentId: 'a3' }),
      task(3, 'Update the readme screenshots', 'waiting', { after: 2 }),
      task(4, 'Check the build on a clean folder', 'failed', { why: 'the build broke', tries: 1, check: 'failed' }),
    ],
  })
  for (let n = 1; n <= 8; n += 1) mem.set(`cockpit:session:s${n}`, rec(`s${n}`))
}
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
const propsAt = (wPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: wPt / columnPt(), placement: 'dock' as const, scroll: { bodyRows: Math.round(HEIGHT_PT / ROW_PT), offset: 0, total: 200 }, view: {} })

type Node = { type?: string; key?: string; text?: string; props?: Record<string, unknown>; children?: unknown[] }
type Pane = { drawn: () => Promise<Node>; redraw: (p?: unknown) => Promise<void>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const strings = (n: Node): string[] => (n.children ?? []).filter((c): c is string => typeof c === 'string')
// The widest thing inside a part, in points: a Box or Client with a width in cells, or a picture's width.
const widest = (n: Node): number => Math.max(0, ...walk(n).slice(1).map(x => (x.type === 'Svg' ? Number(x.props?.width ?? 0) : typeof x.props?.width === 'number' ? (x.props.width as number) * columnPt() : 0)))

const cutLabels = (root: Node): string[] =>
  walk(root)
    .filter(n => n.type === 'Button')
    .flatMap(n => [...(typeof n.props?.label === 'string' ? [n.props.label] : []), ...strings(n)])
    .filter(s => s.includes('…'))
const BOTH_MODES = new Set([GREY, BLUE, AMBER, RED, PRESS_WASH_GREY, SWITCH_KNOB_FILL, ARRANGE_LIFT_FILL, ARRANGE_LIFT_TEXT].map(c => c.toLowerCase()))
const COLOUR =/(?:fill|stroke|stop-color)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|[a-z]+)/gi
const lacksDark = (svg: Node): string | undefined => {
  const src = String(svg.props?.source ?? '')
  const named = [...src.matchAll(COLOUR)].map(m => m[1]).filter(c => !/^(none|currentcolor|inherit|transparent|url)$/i.test(c) && !BOTH_MODES.has(c.toLowerCase()))
  if (named.length === 0 || /prefers-color-scheme:\s*dark/.test(src)) return undefined
  return `${String(svg.props?.alt ?? 'picture')}: ${named.join(', ')}`
}

const flip = async (ui: Pane) => {
  for (const id of ['limit', 'here']) {
    await ui.press({ key: `press-glance-${id}-0` })
    await ui.redraw()
    await ui.press({ key: `btn-icon-${id}-gear` })
    await ui.redraw()
  }
}
const unflip = async (ui: Pane) => {
  for (const id of ['limit', 'here']) await ui.press({ key: `back-glance-${id}` })
}
const BOARD_OPEN = ['agents', 'others']
const openBoard = async (ui: Pane) => {
  for (const id of BOARD_OPEN) await ui.press({ key: `press-glance-${id}-0` })
  await ui.redraw()
}
const shutBoard = async (ui: Pane) => {
  for (const id of BOARD_OPEN) await ui.press({ key: `press-glance-${id}-0` })
}
let helpCommand: () => Promise<unknown> = async () => undefined
const done = (key: string) => (ui: Pane) => ui.press({ key })
const VIEWS: Record<string, { prep: (ui: Pane) => Promise<void>; leave: (ui: Pane) => Promise<void>; columns: boolean; has: string[] }> = {
  board: { prep: openBoard, leave: shutBoard, columns: true, has: ['settings', 'arrange'] },
  'two flipped cards': { prep: flip, leave: unflip, columns: true, has: ['face-limit', 'face-here'] },
  Settings: { prep: done('settings'), leave: done('settings-done'), columns: false, has: ['settings-done'] },
  Agents: {
    prep: async ui => {
      // A failed task opens the Agents card by itself: press its row only when it is shut.
      if ((await ui.find({ key: 'runner-open' })) === undefined) {
        await ui.press({ key: 'press-glance-agents-0' })
        await ui.redraw()
      }
      await ui.press({ key: 'runner-open' })
    },
    leave: done('runner-done'),
    columns: false,
    has: ['runner-done'],
  },
  Help: { prep: async () => void (await helpCommand()), leave: done('help-done'), columns: false, has: ['help-done'] },
  Guide: { prep: async ui => {
      await helpCommand()
      await ui.redraw()
      await ui.press({ key: 'press-help-guide-0' })
    }, leave: async ui => {
      await ui.press({ key: 'guide-done' })
      await ui.redraw()
      await ui.press({ key: 'help-done' })
    }, columns: false, has: ['guide-done', 'guide-turn'] },
  Arranging: { prep: done('arrange'), leave: done('arrange-done'), columns: false, has: ['arrange-done'] },
}

test('the home pane at 700 to 5120 pt: no cut label, the tokens\' columns, nothing wider than its column or past the edge, every picture dark-ready', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom']])
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  const mount = (w: number) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(w) }) as unknown as Promise<Pane>
  helpCommand = () => $.command.run(viaParent('vaken-help', ''))
  const seen: string[] = []
  const checked = { buttons: 0, pictures: 0 }
  const problems: string[] = []
  for (const [name, view] of Object.entries(VIEWS)) {
    fill(mem)
    const first = await mount(1100)
    await view.prep(first)
    await first.unmount()
    const ui = await mount(1100)
    for (const w of WIDTHS_PT) {
      await ui.redraw(propsAt(w))
      const root = await ui.drawn()
      const at = `${name} at ${w} pt`
      const keys = new Set(walk(root).map(x => x.key ?? (x.props?.key as string | undefined)))
      for (const k of view.has) if (!keys.has(k)) problems.push(`${at}: the view did not draw (no "${k}")`)
      checked.buttons += walk(root).filter(x => x.type === 'Button').length
      checked.pictures += walk(root).filter(x => x.type === 'Svg').length
      for (const c of cutLabels(root)) problems.push(`${at}: a cut label "${c}"`)
      for (const s of walk(root).filter(x => x.type === 'Svg')) {
        const bad = lacksDark(s)
        if (bad !== undefined) problems.push(`${at}: no dark colour in ${bad}`)
      }
      if (widest(root) > w + CLOSE) problems.push(`${at}: something ${widest(root)} pt wide`)
      if (view.columns) {
        const row = walk(root).find(x => (x.key ?? x.props?.key) === 'columns')
        const want = columnsFor(w)
        const columns = row === undefined ? [] : kids(row)
        if (columns.length !== (want === 1 ? 0 : want)) problems.push(`${at}: ${columns.length} columns, the rule says ${want}`)
        for (const c of columns) if (c.props?.width !== columns[0]?.props?.width) problems.push(`${at}: columns of unequal width (${columns.map(k => String(k.props?.width)).join(', ')})`)
        for (const c of columns) {
          const cells = c.props?.width as number
          if (widest(c) > cells * columnPt() + CLOSE) problems.push(`${at}: a card ${widest(c)} pt in a column of ${cells * columnPt()} pt`)
        }
      }
      pressProblems(root, at, problems)
      seen.push(at)
    }
    for (const w of [294, 3440]) {
      await ui.redraw(propsAt(w))
      pressProblems(await ui.drawn(), `${name} at ${w} pt`, problems)
    }
    await ui.unmount()
    const out = await mount(1100)
    await view.leave(out)
    await out.unmount()
  }
  expect(seen).toHaveLength(Object.keys(VIEWS).length * WIDTHS_PT.length)
  expect(pressLooked.words).toBeGreaterThan(50)
  expect(pressLooked.slots).toBeGreaterThan(5)
  expect(pressLooked.switches).toBeGreaterThan(5)
  expect(pressLooked.pairs).toBeGreaterThan(20)
  expect(pressLooked.closedCards).toBeGreaterThan(20)
  expect(pressLooked.touching).toBeGreaterThan(20)
  expect(pressLooked.cardEdges).toBeGreaterThan(20)
  expect(pressLooked.scopes).toBeGreaterThan(50)
  expect(pressLooked.gridBoxes).toBeGreaterThan(5000)
  // Every press Client's declared height (whole rows, its part's box rounded out) was read.
  expect(pressLooked.sized).toBeGreaterThan(200)
  expect(checked.buttons).toBeGreaterThan(500)
  expect(checked.pictures).toBeGreaterThan(200)
  expect([...new Set(problems)]).toEqual([])
})

// At 400, 700, 1100 and 2400 pt the views and the cards above the board are one board column wide.
test('400, 700, 1100 and 2400 pt: views capped at one column, no stub header note', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom']])
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  const mount = (w: number) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(w) }) as unknown as Promise<Pane>
  helpCommand = () => $.command.run(viaParent('vaken-help', ''))
  const problems: string[] = []
  const nameOf = (x: Node): unknown => x.key ?? x.props?.key
  // Help lays its topic cards in the pane's columns; its title and find line ('help-top') are one column wide
  for (const [name, key, wrap] of [['Help', 'help-done', 'help-top'], ['Settings', 'settings-done', 'settings-col-0'], ['Agents', 'runner-done', 'cap-runner']] as const) {
    fill(mem)
    const first = await mount(1100)
    if (name === 'Help') await helpCommand()
    else if (name === 'Settings') await first.press({ key: 'settings' })
    else {
      if ((await first.find({ key: 'runner-open' })) === undefined) {
        await first.press({ key: 'press-glance-agents-0' })
        await first.redraw()
      }
      await first.press({ key: 'runner-open' })
    }
    await first.unmount()
    const ui = await mount(1100)
    for (const w of [400, 700, 1100, 2400]) {
      await ui.redraw(propsAt(w))
      const root = await ui.drawn()
      const at = `${name} at ${w} pt`
      const capped = columnsFor(w) > 1
      const column = Math.floor((Math.floor(w / columnPt() + 0.01) - (columnsFor(w) - 1)) / columnsFor(w)) * columnPt()
      const box = walk(root).find(x => nameOf(x) === wrap && x.props?.width !== undefined)
      if (capped !== (box !== undefined)) problems.push(`${at}: ${capped ? 'no' : 'a'} cap box`)
      if (box !== undefined && Math.abs((box.props?.width as number) * columnPt() - column) > 1) problems.push(`${at}: the cap is ${(box.props?.width as number) * columnPt()} pt, one column is ${column} pt`)
    }
    await ui.unmount()
    const out = await mount(1100)
    await out.press({ key })
    await out.unmount()
  }
  fill(mem)
  mem.delete('cockpit:firstrun')
  await clock.advance(BUNDLE_TTL_MS + 1)
  const ui = await mount(1100)
  for (const w of [400, 700, 1100, 2400]) {
    await ui.redraw(propsAt(w))
    const root = await ui.drawn()
    const at = `board at ${w} pt`
    const top = walk(root).find(x => nameOf(x) === 'cap-top')
    if ((columnsFor(w) > 1) !== (top !== undefined)) problems.push(`${at}: the top cap box is ${top === undefined ? 'missing' : 'there on one column'}`)
    for (const t of walk(root).filter(x => x.type === 'Text')) for (const s of strings(t)) if (/^\S+ \S{0,6}…$/.test(s) && s.length < 12) problems.push(`${at}: a stub "${s}"`)
  }
  await ui.unmount()
  expect([...new Set(problems)]).toEqual([])
})

// The host does not wrap a Pick that has no width of its own.
const hostWidth = (n: Node): number => {
  const p = n.props ?? {}
  if (n.type === 'Button') return String(p.label ?? '').length * columnPt()
  if (n.type === 'Svg') return Number(p.width ?? 0)
  if (n.type === 'Text' || p.position === 'absolute') return 0
  const parts = kids(n).map(hostWidth)
  const gap = (typeof p.columnGap === 'number' ? p.columnGap : 0) * columnPt()
  const margins = ((typeof p.marginLeft === 'number' ? p.marginLeft : 0) + (typeof p.marginRight === 'number' ? p.marginRight : 0)) * columnPt()
  const inner = parts.length === 0 ? 0 : p.flexDirection === 'row' ? parts.reduce((a, b) => a + b, 0) + gap * (parts.length - 1) : Math.max(...parts)
  return inner + margins
}
test('Start here: every row of every setup step fits the card at 1, 2 and 3 columns, the narrowest and widest pane, and after resizes', { timeoutMs: 120_000 }, async ($, on) => {
  const mem = new Map<string, unknown>()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  fill(mem)
  mem.delete('cockpit:firstrun')
  const sizes = [294, 600, COLUMNS_2_FROM_PT, 900, COLUMNS_3_FROM_PT, 1200, 5120]
  // Wide to narrow to wide, without a new mount: each draw must lay the card out again at the new width.
  const trip = [5120, 294, COLUMNS_3_FROM_PT, COLUMNS_2_FROM_PT, 294, 5120, ...sizes]
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(5120) })) as unknown as Pane
  const problems: string[] = []
  const nameOf = (x: Node): string => String(x.key ?? x.props?.key ?? '')
  let rowsSeen = 0
  const look = async (w: number, step: number, wanted: string[]): Promise<void> => {
    await ui.redraw(propsAt(w))
    const root = await ui.drawn()
    const card = walk(root).find(x => nameOf(x) === 'start')
    if (card === undefined) {
      problems.push(`${w} pt, step ${step}: no Start here card`)
      return
    }
    const top = walk(root).find(x => nameOf(x) === 'cap-top')
    if ((columnsFor(w) > 1) !== (top !== undefined)) problems.push(`${w} pt: the top cap box is ${top === undefined ? 'missing' : 'there on one column'}`)
    const room = (top === undefined ? w : (top.props?.width as number) * columnPt()) - 2 * BORDER_X_PT
    for (const row of walk(card).slice(1).filter(x => x.props?.flexDirection === 'row')) {
      rowsSeen += 1
      const wide = hostWidth(row)
      if (wide > room + CLOSE) problems.push(`${w} pt, step ${step}: the row "${nameOf(row) || 'unnamed'}" is ${Math.round(wide)} pt in a card of ${Math.round(room)} pt`)
    }
    const keys = new Set(walk(card).map(nameOf))
    for (const k of wanted) if (!keys.has(k)) problems.push(`${w} pt, step ${step}: no "${k}"`)
  }
  for (const w of trip) await look(w, 1, ['start-mode-quiet', 'start-mode-balanced', 'start-mode-full', 'start-skip', 'start-next'])
  // The other steps (the switches of the habits question, the summary with the view choice), each at the narrowest, a middle and the widest pane
  const later: Record<number, string[]> = {
    2: ['start-risky-tell', 'start-risky-ask', 'start-risky-off', 'start-back', 'start-next', 'start-skip'],
    3: ['start-spend-off', 'start-spend-warn', 'start-spend-stop'],
    4: ['start-habits-switch', 'start-plain-switch'],
    5: ['start-long-auto', 'start-long-watch', 'start-long-off'],
    6: ['start-view-standard', 'start-view-all', 'start-view-custom', 'start-back', 'start-finish'],
  }
  for (let step = 2; step <= 6; step += 1) {
    await ui.press({ key: 'start-next' })
    for (const w of [294, COLUMNS_2_FROM_PT, 5120, 294]) await look(w, step, later[step] ?? [])
  }
  await ui.unmount()
  expect(rowsSeen).toBeGreaterThan(trip.length * 3)
  expect([...new Set(problems)]).toEqual([])
})

test('1 to 6 columns: every open card header is one row, its Fold on it, its note at the left', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  fill(mem)
  mem.set('cockpit:session:test-session', rec('test-session', { cwd: '/work/app', contextPercent: 38, fiveHourPercent: 1, fiveHourResetsAt: '2026-10-11T16:00:00Z', sevenDayPercent: 38, sevenDayResetsAt: '2026-10-12T09:00:00Z' }))
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(1100) })) as unknown as Pane
  const nameOf = (x: Node): string => String(x.key ?? x.props?.key ?? '')
  const under = (n: Node, key: string): Node | undefined => walk(n).find(x => nameOf(x) === key)
  let root = await ui.drawn()
  for (const id of CARD_IDS) if (under(root, `glance-${id}`) !== undefined && under(root, `detail-${id}`) === undefined) await ui.press({ key: `press-glance-${id}-0` })
  await ui.redraw()
  const problems: string[] = []
  let headers = 0
  for (const [want, w] of [[1, 600], [2, 800], [3, 1100], [4, 1500], [5, 1800], [6, 2200]] as const) {
    await ui.redraw(propsAt(w))
    root = await ui.drawn()
    const at = `${want} columns (${w} pt)`
    if (columnsFor(w) !== want) problems.push(`${at}: the rule says ${columnsFor(w)} columns`)
    const inner = paneGrid(w, undefined, CARD_IDS.length + 1).innerPt
    for (const id of CARD_IDS) {
      const card = under(root, id)
      const row = card === undefined ? undefined : under(card, `glance-${id}`)
      if (card === undefined || row === undefined) continue
      const fold = under(card, `detail-${id}`) ?? under(card, `fcw-detail-${id}`)
      if (fold === undefined) {
        problems.push(`${at}: ${id} is not open`)
        continue
      }
      headers += 1
      if (under(row, `detail-${id}`) === undefined && under(row, `fcw-detail-${id}`) === undefined) problems.push(`${at}: ${id}'s ${String(fold.props?.label ?? 'More').trim()} is under its header, not on it`)
      const title = walk(row).find(x => x.type === 'Text' && x.props?.bold === true)
      const value = walk(row).find(x => x.type === 'Text' && x.props?.wrap === 'truncate-end')
      const fresh = walk(row).some(x => x.type === 'Svg' && /new/i.test(String(x.props?.alt ?? '')))
      const label = String(fold.props?.label ?? walk(fold).flatMap(strings).join(''))
      if (title !== undefined && value !== undefined && !fresh) {
        const used = strings(title).join('').length * BOLD_CHAR_PT + GLANCE_VALUE_GAP + strings(value).join('').length * TEXT_CHAR_PT + GLANCE_DOT_GAP + DOT + CHEVRON_GAP + CHEVRON_SLOT + ICON_GAP + label.length * columnPt()
        if (used > inner + CLOSE) problems.push(`${at}: ${id}'s header "${strings(title).join('')} ${strings(value).join('')} ${label.trim()}" needs ${Math.round(used)} pt of ${inner}`)
      }
      for (const line of kids(card).filter(x => x !== row && x.props?.flexDirection === 'row' && x.props?.justifyContent === 'flex-end')) {
        for (const box of kids(line).filter(x => x.type === 'Box' && walk(x).some(t => t.type === 'Text' && t.props?.dimColor === true))) {
          if (box.props?.flexGrow !== 1) problems.push(`${at}: ${id}'s note "${walk(box).flatMap(strings).join('')}" sits at the right`)
        }
      }
    }
  }
  await ui.unmount()
  expect(headers).toBeGreaterThan(6 * 10)
  expect([...new Set(problems)]).toEqual([])
})
