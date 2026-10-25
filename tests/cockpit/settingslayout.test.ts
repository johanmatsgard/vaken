// An open Settings section is drawn in one column's width, and no row's parts are wider than that card.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { ADVANCED_SECTION, SECTIONS } from '../hooks/core/settings'
import { clientKey as fcKey } from '../hooks/ui/firstclick'
import { columnSizes } from '../hooks/features/home/board'
import { BORDER_X_PT, columnPt, LIST_ROW_H, ROW_PT, VSTEP_PT } from '../hooks/ui/tokens'
const roomPt = (x: { props?: Record<string, unknown> } | undefined): number => num(x?.props?.minHeight) * ROW_PT - (num(x?.props?.paddingTop) + num(x?.props?.paddingBottom)) * VSTEP_PT
import { choiceStacks, pickLines, wrappedLines } from '../hooks/ui/kit'
import { tr } from '../hooks/core/lang'

const ALL = [...SECTIONS, ADVANCED_SECTION].map(s => s.name)
const NOW = Date.parse('2026-10-11T12:00:00Z')
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
const propsAt = (wPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: wPt / columnPt(), placement: 'dock' as const, scroll: { bodyRows: Math.round(1400 / ROW_PT), offset: 0, total: 200 }, view: {} })
type Node = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
type Pane = { pointer: (q: unknown) => Promise<void>; drawn: () => Promise<Node>; redraw: (p?: unknown) => Promise<void>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const nameOf = (x: Node): string | undefined => x.key ?? (x.props?.key as string | undefined)
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)

// The widest a part can be, in points, from its own props: a picture's width, a Button's label in cells.
function widthOf(n: Node): number {
  const p = n.props ?? {}
  if (n.type === 'Svg') return num(p.width)
  if (n.type === 'Button') return (String(p.label ?? '').length + 2) * columnPt()
  if (n.type === 'Text') return 0
  if (n.type === 'Box' && typeof p.width === 'number' && String((n as { key?: unknown }).key ?? p.key ?? '').startsWith('fcw-')) return p.width * columnPt()
  const parts = kids(n).filter(k => k.props?.position !== 'absolute').map(widthOf)
  const gap = num(p.columnGap) * columnPt()
  const inner = parts.length === 0 ? 0 : p.flexDirection === 'row' && p.flexWrap !== 'wrap' ? parts.reduce((a, b) => a + b, 0) + gap * (parts.length - 1) : Math.max(...parts)
  return Math.max(inner + (num(p.marginLeft) + num(p.marginRight)) * columnPt(), num(p.minWidth) * columnPt())
}
const pathTo = (t: Node, target: Node, path: Node[] = []): Node[] | undefined => {
  if (t === target) return path
  for (const c of kids(t)) {
    const r = pathTo(c, target, [...path, t])
    if (r) return r
  }
  return undefined
}

async function settingsAt(w: number, $: Parameters<Parameters<typeof test>[2]>[0], on: On, open: string[], extra: Record<string, unknown> = {}) {
  const mem = new Map<string, unknown>()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:look.columns', '3')
  for (const [k, v] of Object.entries(extra)) mem.set(k, v)
  mem.set('cockpit:session:test-session', { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'working', startedAt: NOW - 1000000, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3000 })
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(w) })) as unknown as Pane
  await ui.press({ key: 'settings' })
  await ui.redraw()
  for (const name of open) {
    const key = fcKey(`ol-section:${name}`)
    await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: key })
    await ui.pointer({ type: 'up', x: 1, y: 0, button: 'left', in: key })
    await ui.redraw()
  }
  return ui
}

const cardKey = (sec: string) => `settings-${sec.toLowerCase().replace(/ /g, '-')}`
const columnBoxes = (root: Node) => walk(root).filter(x => /^settings-col-\d+$/.test(nameOf(x) ?? ''))

// Each open section spans as many columns as its rows need (one for each 6 rows, at most the grid's). The cells: the mode card, Most used, then the sections.
const CELLS = ['mode', 'most-used', ...ALL]
const cardsInOrder = (root: Node): string[] => walk(root).map(nameOf).filter((k): k is string => k !== undefined && CELLS.map(cardKey).includes(k))
for (const w of [1130, 2400]) {
  test(`at ${w} pt and 3 columns every open section spans the columns its rows need and its rows fit`, { timeoutMs: 120_000 }, async ($, on) => {
    const ui = await settingsAt(w, $, on, ALL)
    const root = await ui.drawn()
    const nodes = walk(root)
    expect(nodes.filter(x => /^settings-columns/.test(nameOf(x) ?? '')).length, 'one grid').toBe(1)
    expect(cardsInOrder(root), 'every cell once, in the list order').toEqual(CELLS.map(cardKey))
    const spans = nodes.filter(x => (nameOf(x) ?? '').startsWith('span-'))
    expect(spans.length, 'some open section runs its rows in columns').toBeGreaterThan(0)
    let checked = 0
    for (const span of spans) {
      const columns = kids(span)
      expect(columns.length, `${nameOf(span)} has 2 or 3 columns`).toBeGreaterThanOrEqual(2)
      for (const column of columns) {
        const innerPt = num(column.props?.width) * columnPt()
        for (const row of walk(column).filter(x => (nameOf(x) ?? '').startsWith('row-'))) {
          const rest = kids(row).filter(k => k.props?.position !== 'absolute').slice(1).map(widthOf)
          for (const [i, p] of rest.entries()) expect(p, `${nameOf(row)} part ${i + 1} is ${Math.round(p)} pt in a column ${Math.round(innerPt)} pt wide`).toBeLessThanOrEqual(innerPt)
          checked += 1
        }
        for (const pk of walk(column).filter(x => (nameOf(x) ?? '').startsWith('pk-'))) {
          const sizes = kids(pk).map(line => walk(line).filter(x => x.type === 'Button').length)
          expect(Math.min(...sizes) > 1 || Math.max(...sizes) === 1, `${nameOf(pk)} has a lone option on a line (${sizes.join('+')})`).toBe(true)
        }
      }
    }
    expect(checked, 'setting rows were checked').toBeGreaterThan(10)
    await ui.unmount()
  })
}

test('choices cut into even lines, never one alone; a note keeps room beside its choices', () => {
  const six = ['Auto', '2', '3', '4', '6', '8', '12'].map(label => ({ label }))
  for (const widthPt of [60, 100, 150, 200, 345, 600]) {
    const lines = pickLines(six, widthPt)
    expect(lines.flat().map(o => o.label), `${widthPt} pt keeps every option, in order`).toEqual(six.map(o => o.label))
    if (lines.length > 1) {
      const sizes = lines.map(l => l.length)
      expect(Math.max(...sizes) - Math.min(...sizes), `${widthPt} pt: lines ${sizes.join('+')} are even`).toBeLessThanOrEqual(1)
      expect(Math.min(...sizes), `${widthPt} pt: a lone option`).toBeGreaterThan(1)
    }
  }
  const note = 'Auto lets the computer decide; pick a number to set your own limit and more words after it.'
  expect(choiceStacks(900, 'Detail', ['Off', 'Warn', 'Stop'], 'Warn', note)).toBe(false)
  expect(choiceStacks(345, 'Detail', ['Off', 'Warn', 'Stop'], 'Warn', note)).toBe(true)
})

test('wrappedLines counts the lines a words row takes', () => {
  const text = 'Which agents run, how many at once and what shows when they stop, with a longer second line.'
  expect(wrappedLines('Short', 345)).toBe(1)
  expect(wrappedLines(text, 345)).toBeGreaterThan(1)
  expect(wrappedLines(text, 1000)).toBe(1)
})

test('a press on a section header toggles the section once, and a wrapped about line covers all its lines', { timeoutMs: 120_000 }, async ($, on) => {
  const ui = await settingsAt(1130, $, on, [])
  const sizeOf = async () => walk(await ui.drawn()).length
  const shut = await sizeOf()
  const header = fcKey('hdr-settings-notices')
  expect(walk(await ui.drawn()).some(x => nameOf(x) === header), 'the header has its press').toBe(true)
  await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: header })
  await ui.pointer({ type: 'up', x: 1, y: 0, button: 'left', in: header })
  await ui.redraw()
  const open = await sizeOf()
  expect(open, 'one press on the header opens it').toBeGreaterThan(shut)
  await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: fcKey('ol-section:Notices') })
  await ui.pointer({ type: 'up', x: 1, y: 0, button: 'left', in: fcKey('ol-section:Notices') })
  await ui.redraw()
  expect(await sizeOf(), `a second press shuts it again (one toggle each); shut ${shut}, open ${open}`).toBe(shut)
  const root = await ui.drawn()
  const box = walk(root).find(x => nameOf(x) === `${header}-box`)
  expect(box, 'the header press has its box').toBeDefined()
  const holder = walk(root).find(x => kids(x).includes(box as Node))
  expect(nameOf(holder as Node), 'the shut section presses as a whole').toBe('settings-notices')
  for (const j of walk(holder as Node).filter(x => /^jump-/.test(nameOf(x) ?? ''))) expect(walk(root).some(x => nameOf(x) === fcKey(nameOf(j) ?? '')), `${nameOf(j)} keeps its own press`).toBe(true)
  // A wrapped about line: its row is as tall as its lines (26 pt a line).
  let wrapped = 0
  for (const sec of ALL) {
    const about = SECTIONS.find(s => s.name === sec)?.about
    if (about === undefined) continue
    const row = walk(root).find(x => nameOf(x) === `ol-section:${sec}`)
    expect(row, `${sec} row`).toBeDefined()
    const colPt = num(columnBoxes(root)[0]?.props?.width) * columnPt()
    const lines = wrappedLines(tr(about), Math.floor(colPt - 2 * BORDER_X_PT))
    expect(roomPt(row), `${sec}: ${lines} lines`).toBeGreaterThanOrEqual(lines * ROW_PT + LIST_ROW_H - ROW_PT - 1)
    if (lines > 1) wrapped += 1
  }
  expect(wrapped, 'some about line wraps at 3 columns (else this test checks nothing)').toBeGreaterThan(0)
  await ui.unmount()
})

test('a one-line about is a list row high, a two-line one is one text row taller, and the press covers both lines', { timeoutMs: 120_000 }, async ($, on) => {
  const ui = await settingsAt(1130, $, on, [])
  const root = await ui.drawn()
  const heightOf = (sec: string): number => roomPt(walk(root).find(x => nameOf(x) === `ol-section:${sec}`))
  const colPt = num(columnBoxes(root)[0]?.props?.width) * columnPt()
  const cardsAbout = SECTIONS.find(s => s.name === 'Look and cards')?.about ?? ''
  expect(wrappedLines(tr(cardsAbout), Math.floor(colPt - 2 * BORDER_X_PT)), 'the Cards and look line fits one line').toBe(1)
  const counts = new Map<string, number>()
  for (const sec of SECTIONS) {
    const about = sec.about
    const lines = wrappedLines(tr(about), Math.floor(colPt - 2 * BORDER_X_PT))
    counts.set(sec.name, lines)
    expect(Math.abs((heightOf(sec.name)) - (lines * ROW_PT + LIST_ROW_H - ROW_PT)) < 0.6, `${sec.name}: ${lines} lines`).toBe(true)
  }
  expect(Math.abs((heightOf('Look and cards')) - (heightOf('Notices'))) < 0.6, 'one line = the same height as Notices').toBe(true)
  expect(Math.abs((heightOf('Notices')) - (LIST_ROW_H)) < 0.6).toBe(true)
  const two = [...counts].find(([, n]) => n === 2)?.[0]
  expect(two, 'some about line takes two lines at 3 columns').toBeDefined()
  expect(Math.abs((heightOf(two as string) - heightOf('Notices')) - (ROW_PT)) < 0.6, 'a second line adds one text row').toBe(true)
  const row = walk(root).find(x => nameOf(x) === `ol-section:${two}`) as Node
  expect(walk(row).some(x => nameOf(x) === fcKey(`ol-section:${two}`) || nameOf(x) === `${fcKey(`ol-section:${two}`)}-box`), 'the press is inside the two-line row').toBe(true)
  await ui.unmount()
})

// All shut: with every section shut the cells (the mode card first, then the sections) fill 3 columns column by column.
const sizes = columnSizes(CELLS.length, 3)
const closedColumn = new Map(CELLS.map((name, i) => [name, sizes.flatMap((size, n) => Array.from({ length: size }, () => n))[i] ?? 0]))
test('with all sections shut the mode card and the sections fill the columns, column by column, in order', { timeoutMs: 120_000 }, async ($, on) => {
  const ui = await settingsAt(1130, $, on, [])
  const root = await ui.drawn()
  expect(cardsInOrder(root)).toEqual(CELLS.map(cardKey))
  for (const name of CELLS) {
    const card = walk(root).find(x => nameOf(x) === cardKey(name)) as Node
    const col = (pathTo(root, card) ?? []).map(nameOf).reverse().find(k => /^settings-col-\d+$/.test(k ?? ''))
    expect(Number((col ?? '').split('-').pop()), `${name} is in column ${col}, its place is ${closedColumn.get(name)}`).toBe(closedColumn.get(name))
  }
  await ui.unmount()
})
for (const open of ['Notices', 'Safety', 'Look and cards']) {
  test(`with ${open} open the cells keep the list's order and an open section is as wide as its rows need`, { timeoutMs: 120_000 }, async ($, on) => {
    const ui = await settingsAt(1130, $, on, [open])
    const root = await ui.drawn()
    expect(cardsInOrder(root), 'every cell once, in the list order').toEqual(CELLS.map(cardKey))
    const colPt = num(walk(root).find(x => /^settings-col-\d+$/.test(nameOf(x) ?? ''))?.props?.width) * columnPt()
    const box = walk(root).find(x => nameOf(x) === `band-open-${CELLS.indexOf(open)}`)
    if (open === 'Look and cards') {
      expect(box, 'a section with many rows is its own band cell').toBeDefined()
      expect(num(box?.props?.width) * columnPt(), 'two columns or more').toBeGreaterThan(colPt * 1.5)
    }
    await ui.unmount()
  })
}

// Measured in the tree at 294, 700, 1640 and 3440 pt (1, 2, 4 and 6 columns, the Columns choice on Auto).
const AUTO = { 'cockpit:setting:look.columns': 'auto', 'cockpit:setting:look.view': 'all' }
for (const w of [294, 700, 1640, 3440]) {
  test(`at ${w} pt a section's link is a row under its about line, the mode card is the first cell, and the footer actions sit at the left under the grid`, { timeoutMs: 120_000 }, async ($, on) => {
    const ui = await settingsAt(w, $, on, [], AUTO)
    const root = await ui.drawn()
    const nodes = walk(root)
    for (const sec of ['agents-and-tasks', 'safety', 'look-and-cards']) {
      const jump = nodes.find(x => nameOf(x) === `jump-settings-${sec}`)
      expect(jump, `${sec} has its link`).toBeDefined()
      // The link is a row of its own in the card's body, right under the about line, at the left: never in the header, at every width.
      const card = nodes.find(x => nameOf(x) === `settings-${sec}`) as Node
      const head = kids(card).find(k => k.props?.position !== 'absolute') as Node
      expect(walk(head).includes(jump as Node), `${sec}: the link is not in the header`).toBe(false)
      const up = pathTo(root, jump as Node) ?? []
      const row = up.find(x => nameOf(x) === `linkrow-jump-settings-${sec}`)
      expect(row, `${sec}: the link is a row of the body`).toBeDefined()
      const words = walk(row as Node).find(x => x.type === 'Text')
      expect(words?.props?.dimColor, `${sec}: the link's words are not dim`).not.toBe(true)
      const inFlow = kids(row as Node).filter(k => k.props?.position !== 'absolute')
      expect(walk(inFlow[inFlow.length - 1] as Node).some(x => x.type === 'Svg'), `${sec}: the chevron ends the row`).toBe(true)
      const lead = kids(card).find(k => nameOf(k) === `settings-${sec}-lead`) as Node
      expect(lead, `${sec}: the title and the about line are the card's lead`).toBeDefined()
      const leadFlow = kids(lead).filter(k => k.props?.position !== 'absolute')
      // The about line sits in its own box (-lead-line, half a row under the title) that ends the lead
      const lastOfLead = leadFlow[leadFlow.length - 1] as Node
      expect(nameOf(lastOfLead), `${sec}: the lead ends with the about line's box`).toBe(`settings-${sec}-lead-line`)
      const lineFlow = kids(lastOfLead).filter(k => k.props?.position !== 'absolute')
      expect(nameOf(lineFlow[lineFlow.length - 1] as Node)?.startsWith('ol-section:'), `${sec}: the about line ends the lead`).toBe(true)
      const flow = kids(card).filter(k => k.props?.position !== 'absolute')
      const body = flow[flow.indexOf(lead) + 1] as Node
      const firstOf = (n: Node): Node => kids(n).find(k => k.props?.position !== 'absolute') as Node
      expect(nameOf(body), `${sec}: the card's body`).toBe(`settings-${sec}-body`)
      let first = firstOf(body)
      while (first !== undefined && nameOf(first) !== `linkrow-jump-settings-${sec}` && first.props?.flexDirection === 'column') first = firstOf(first)
      expect(nameOf(first), `${sec}: the link is the body's first row`).toBe(`linkrow-jump-settings-${sec}`)
      expect(num(body.props?.marginTop), `${sec}: half a row between the about line and the link`).toBe(1)
    }
    expect(nodes.some(x => (nameOf(x) ?? '').startsWith('cap-')), 'no capped single column cell').toBe(false)
    const mode = nodes.find(x => nameOf(x) === 'settings-mode') as Node
    const modeParent = (pathTo(root, mode) ?? []).map(nameOf)
    if (w > 700) expect(modeParent.some(k => /^settings-col-0$/.test(k ?? '')), 'the mode card is the first cell of the first column').toBe(true)
    const footer = nodes.find(x => nameOf(x) === 'settings-footer') as Node | undefined
    if (footer === undefined) {
      // In columns the three foot cards go under the shortest column of the last run (even columns), each one in a settings column
      expect(w, 'one column keeps the footer row').toBeGreaterThanOrEqual(680)
      for (const k of ['settings-setup-card', 'settings-reset-card', 'settings-erase-card']) {
        const card = nodes.find(x => nameOf(x) === k) as Node
        expect(card, k).toBeDefined()
        expect((pathTo(root, card) ?? []).map(nameOf).some(n => /^settings-col-/.test(n ?? '')), `${k} is in a column`).toBe(true)
      }
    } else {
      expect(footer.props?.alignItems, 'footer actions left aligned, or full width when stacked').toBe(footer.props?.flexDirection === 'column' ? 'stretch' : 'flex-start')
      if (w < 680) expect(footer.props?.flexDirection, 'one column: the actions are stacked').toBe('column')
      if (footer.props?.flexDirection === 'row') for (const cell of kids(footer)) expect(num(cell.props?.width), `${nameOf(cell)} is one column wide`).toBeGreaterThan(0)
      expect(kids(footer).map(nameOf), 'run setup again, reset, then erase').toEqual(['foot-setup', 'foot-reset', 'foot-erase'])
      const last = kids(root)[kids(root).length - 1] as Node
      expect(nameOf(last), 'the footer is last').toBe('settings-footer')
    }
    await ui.unmount()
  })
  test(`at ${w} pt the three Needs you choices are on one line or a radio list, never squeezed`, { timeoutMs: 120_000 }, async ($, on) => {
    const ui = await settingsAt(w, $, on, ['Look and cards'], AUTO)
    const root = await ui.drawn()
    const pick = walk(root).find(x => nameOf(x) === 'look.needs' || nameOf(x) === 'radio-look.needs') as Node
    expect(pick, 'the choice').toBeDefined()
    const labels = walk(pick).filter(x => x.type === 'Button').map(x => String(x.props?.label ?? '').trim())
    expect(labels.length).toBe(3)
    expect(Math.max(...labels.map(l => l.length)), 'short labels, so no choice is alone on a line').toBeLessThanOrEqual(14)
    await ui.unmount()
  })
}

for (const [view, drawn] of [['standard', false], ['all', false], ['custom', true]] as const) {
  test(`in the ${view} view "Problems first" and the per-card Show, Hide and Auto rows are ${drawn ? 'drawn' : 'not drawn, and one line says why'}`, { timeoutMs: 120_000 }, async ($, on) => {
    const ui = await settingsAt(1130, $, on, ['Look and cards'], { 'cockpit:setting:look.view': view })
    const nodes = walk(await ui.drawn())
    const keys = nodes.map(nameOf).filter((k): k is string => k !== undefined)
    expect(keys.some(k => k.includes('view.problems')), 'Problems first').toBe(drawn)
    expect(keys.some(k => k.includes('cards.limit')), 'the Plan limits Show row').toBe(drawn)
    expect(JSON.stringify(nodes.map(x => x.children)).includes('Your view decides which cards show. Pick Custom to choose.'), 'the one line').toBe(!drawn)
    await ui.unmount()
  })
}

test('at 400 pt the way back from Custom is a row link with its chevron at the end', { timeoutMs: 120_000 }, async ($, on) => {
  const ui = await settingsAt(400, $, on, [], { 'cockpit:setting:guard.world': 'hold' })
  const nodes = walk(await ui.drawn())
  const row = nodes.find(x => nameOf(x) === 'linkrow-mode-back') as Node
  expect(row, 'the way back is a row link').toBeDefined()
  const words = walk(row).find(x => x.type === 'Text' || (x.type === 'Button' && String(x.props?.label ?? '').trim() !== ''))
  expect(words?.type === 'Button' ? String(words.props?.label) : (words?.children ?? []).join(''), 'its words').toBe('Back to Recommended')
  expect(words?.props?.dimColor, 'not dim').not.toBe(true)
  const inFlow = kids(row).filter(k => k.props?.position !== 'absolute')
  expect(walk(inFlow[inFlow.length - 1] as Node).some(x => x.type === 'Svg'), 'the chevron ends the row').toBe(true)
  await ui.unmount()
})
