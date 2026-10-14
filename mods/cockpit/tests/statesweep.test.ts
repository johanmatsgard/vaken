// State sweep: the states that the width sweep's busy store never reaches, each built from a made-up fixture and drawn at 400, 760.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { BASE_SEEDS, HOME, MIN, ROOT, STATES, engine, kids, nameOf, num, pathTo, propsAt, setNow, strings, textsOf, walk, widest, getNow } from './statefixtures'
import type { Mem, Node, Pane, State, World } from './statefixtures'
import { looked as pressLooked, pressProblems } from './presssizes'

import { BUNDLE_TTL_MS } from '../hooks/core/io'
import { setSetupExists } from '../hooks/features/setupfiles'
import { BORDER_X_PT, COL_PT, LIST_ROW_H, LIST_ROW_PAD_PT, ROW_PT, TEXT_CHAR_PT, VSTEP_PT, columnsFor } from '../hooks/ui/tokens'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const WIDTHS_PT = [400, 760, 1130, 2400, 3440, 5120]
const PRESS_ONLY_WIDTHS_PT = [294]
const CLOSE = 0.01
// A state may draw more rows than the busy store, never more than the surface's budget.
const BOARD_ELEMENTS = 865
const VIEW_ELEMENTS = 440
// Ceilings of this file, measured and rounded up to the next 25.
const GLANCE_SHUT_ELEMENTS = 575
const GLANCE_OPEN_ELEMENTS = 1000
const TWELVE_TASKS_VIEW_ELEMENTS = 525
const ceilingOf = (view: string, state: string): number =>
  view === 'glance shut' ? GLANCE_SHUT_ELEMENTS : view === 'glance open' ? GLANCE_OPEN_ELEMENTS : view === 'view' ? (state.startsWith('twelve tasks') ? TWELVE_TASKS_VIEW_ELEMENTS : VIEW_ELEMENTS) : BOARD_ELEMENTS
const cutSeen = new Set<string>()
const looked = { chips: 0, rows: 0, picks: 0, texts: 0, rowsOfControls: 0 }
const DUMP = false



// The widest a part can be, in points, from its own props (as tests/settingslayout.test.ts): a picture's width.
function widthOf(n: Node): number {
  const p = n.props ?? {}
  if (n.type === 'Svg') return num(p.width)
  if (n.type === 'Button') return (String(p.label ?? '').length + 2) * COL_PT
  if (n.type === 'Text') return 0
  if (n.type === 'Box' && typeof p.width === 'number' && String((n as { key?: unknown }).key ?? p.key ?? '').startsWith('fcw-')) return p.width * COL_PT
  const parts = kids(n).filter(k => k.props?.position !== 'absolute').map(widthOf)
  const gap = num(p.columnGap) * COL_PT
  const inner = parts.length === 0 ? 0 : p.flexDirection === 'row' && p.flexWrap !== 'wrap' ? parts.reduce((a, b) => a + b, 0) + gap * (parts.length - 1) : Math.max(...parts)
  return Math.max(inner + (num(p.marginLeft) + num(p.marginRight)) * COL_PT, num(p.minWidth) * COL_PT)
}

const KNOWN_LINES = Object.keys(SV).filter(k => k.length > 12)
const cutMemo = new Map<string, string | undefined>()
const cutInsideWord = (shown: string): string | undefined => {
  if (!shown.endsWith('…')) return undefined
  if (!cutMemo.has(shown)) cutMemo.set(shown, cutInsideWordOf(shown))
  return cutMemo.get(shown)
}
const cutInsideWordOf = (shown: string): string | undefined => {
  if (!shown.endsWith('…')) return undefined
  const head = shown.slice(0, -1)
  if (head.length < 8 || head.endsWith(' ')) return undefined
  return KNOWN_LINES.find(k => k.length > head.length && k.startsWith(head) && /[\p{L}\p{N}]/u.test(k[head.length] ?? ' '))
}


function check(root: Node, w: number, at: string, problems: string[], view: string, state: string): void {
  const nodes = walk(root)
  looked.texts += nodes.filter(x => x.type === 'Text').length
  if (widest(root) > w + CLOSE) problems.push(`${at}: something ${widest(root)} pt wide`)
  const columnsRow = nodes.find(x => nameOf(x) === 'columns')
  const columnList = columnsRow === undefined ? [] : kids(columnsRow)
  for (const c of columnList) if (c.props?.width !== columnList[0]?.props?.width) problems.push(`${at}: columns of unequal width (${columnList.map(k => String(k.props?.width)).join(', ')})`)
  for (const c of columnList) if (widest(c) > num(c.props?.width) * COL_PT + CLOSE) problems.push(`${at}: a card ${widest(c)} pt in a column of ${num(c.props?.width) * COL_PT} pt`)
  // The pane's own width for a word: the column when the board is in columns, else the pane.
  const cap = nodes.find(x => nameOf(x).startsWith('cap-') && num(x.props?.width) > 0)
  const roomPt = columnList.length > 0 ? num(columnList[0]?.props?.width) * COL_PT - 2 * BORDER_X_PT : cap !== undefined ? num(cap.props?.width) * COL_PT - 2 * BORDER_X_PT : w - 2 * BORDER_X_PT
  for (const b of nodes.filter(x => x.type === 'Button')) {
    for (const s of [...(typeof b.props?.label === 'string' ? [b.props.label] : []), ...strings(b)]) if (s.includes('…')) problems.push(`${at}: a cut label "${s}"`)
  }
  for (const t of nodes.filter(x => x.type === 'Text')) for (const s of strings(t)) if (/^\S+ \S{0,6}…$/.test(s) && s.length < 12) problems.push(`${at}: a stub "${s}"`)
  for (const t of nodes.filter(x => x.type === 'Text')) for (const s of strings(t)) {
    const whole = cutInsideWord(s.trim())
    if (whole !== undefined) problems.push(`${at}: the line "${whole}" is cut inside a word: "${s.trim()}"`)
  }
  // A word that cannot wrap and is wider than its card: the app would cut it with no ellipsis (a Text without a truncate rule).
  for (const t of nodes.filter(x => x.type === 'Text')) {
    const rule = String(t.props?.wrap ?? '')
    if (rule.startsWith('truncate') || (pathTo(root, t) ?? []).some(a => /^w-|-open$/.test(nameOf(a)))) continue
    for (const s of strings(t)) for (const word of s.split(/\s+/)) if (word.length * TEXT_CHAR_PT > roomPt) problems.push(`${at}: the word "${word.slice(0, 30)}…" (${word.length} letters) is wider than its card (${Math.round(roomPt)} pt) and has no cut rule`)
  }
  for (const row of nodes.filter(x => x.props?.flexDirection === 'row' && x.props?.flexWrap !== 'wrap' && nameOf(x) !== 'columns')) {
    const wide = widthOf(row)
    looked.rowsOfControls += 1
    if (wide > roomPt + 2 * BORDER_X_PT + CLOSE) problems.push(`${at}: a row of controls "${nameOf(row) || 'unnamed'}" is ${Math.round(wide)} pt wide in a card of ${Math.round(roomPt + 2 * BORDER_X_PT)} pt`)
  }
  for (const line of nodes.filter(x => nameOf(x).endsWith('-pick-line'))) {
    looked.picks += 1
    if (walk(line).filter(x => x.type === 'Button').length < 2) problems.push(`${at}: ${nameOf(line)} has a lone option`)
    if (widest(line) > w + CLOSE) problems.push(`${at}: ${nameOf(line)} is ${widest(line)} pt wide`)
  }
  for (const pk of nodes.filter(x => nameOf(x).startsWith('pk-'))) {
    const lines = kids(pk)
    if (lines.length > 1) for (const line of lines) if (walk(line).filter(x => x.type === 'Button').length < 2) problems.push(`${at}: ${nameOf(pk)} has a lone option on a line`)
  }
  for (const chip of nodes.filter(x => /^(chip|count|fresh)-/.test(nameOf(x)))) {
    looked.chips += 1
    const up = pathTo(root, chip) ?? []
    if (!up.some(a => /^(card|glance|settings)-|^cap-|^columns$/.test(nameOf(a)))) problems.push(`${at}: the chip "${nameOf(chip)}" sits in no card`)
    const wide = widest(chip)
    if (wide > w + CLOSE) problems.push(`${at}: the chip "${nameOf(chip)}" is ${wide} pt wide`)
  }
  // The list grid: a list row is 26 pt high (a row of two lines 52), never a part of a row between.
  for (const r of nodes.filter(x => /^ol-|^ls-|^row-/.test(nameOf(x)) && num(x.props?.minHeight) > 0)) {
    const h = num(r.props?.minHeight) * ROW_PT - (num(r.props?.paddingTop) + num(r.props?.paddingBottom)) * VSTEP_PT
    // A row is n text lines and the padding (19 n + 7: 26, 45, 64 pt) or n list rows (26, 52 pt, a row with a second line).
    const steps = h / LIST_ROW_H
    const lines = (h - LIST_ROW_PAD_PT) / ROW_PT
    looked.rows += 1
    if (Math.abs(steps - Math.round(steps)) > 0.05 && Math.abs(lines - Math.round(lines)) > 0.05) problems.push(`${at}: the row "${nameOf(r)}" is ${Math.round(h * 10) / 10} pt high, off the 26 pt grid`)
  }
  pressProblems(root, at, problems)
  const ceiling = ceilingOf(view, state)
  if (nodes.length > ceiling) problems.push(`${at}: ${nodes.length} elements, the ceiling is ${ceiling}`)
}

const bandProps = (wPt: number) => ({ hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: wPt / COL_PT, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} })
async function bandSweep(mountBand: (w: number) => Promise<Pane>, state: State, problems: string[], seen: string[]): Promise<void> {
  const ui = await mountBand(1130)
  for (const width of WIDTHS_PT) {
    await ui.redraw(bandProps(width))
    const root = await ui.drawn()
    const at = `${state.name}, the line above the chat box at ${width} pt`
    const nodes = walk(root)
    if (!textsOf(root).some(t => /94% used|risky step was stopped|Notices paused/.test(t))) problems.push(`${at}: the posted line is not on screen`)
    if (widest(root) > width + CLOSE) problems.push(`${at}: something ${widest(root)} pt wide`)
    for (const b of nodes.filter(x => x.type === 'Button')) for (const t of [...(typeof b.props?.label === 'string' ? [b.props.label] : []), ...strings(b)]) if (t.includes('…')) problems.push(`${at}: a cut label "${t}"`)
    seen.push(at)
  }
  const press = (await ui.find({ key: 'band-details' })) !== undefined ? 'band-details' : (await ui.find({ key: 'band-focus-end' })) !== undefined ? undefined : undefined
  if (press !== undefined) await ui.press({ key: press })
  await ui.unmount()
}

async function sweep(ui: Pane, state: State, view: string, problems: string[], seen: string[], out: string[]): Promise<void> {
  const draw = async (what: string) => {
    for (const width of WIDTHS_PT) {
      await ui.redraw(propsAt(width))
      const root = await ui.drawn()
      const at = `${state.name}, ${view}${what} at ${width} pt`
      const texts = textsOf(root)
      if (what === '') for (const re of view === 'board' ? state.has : view === 'view' ? (state.viewHas ?? []) : []) if (!texts.some(t => re.test(t))) problems.push(`${at}: the state is not on screen (no text ${re})`)
      if (DUMP && what !== '' && width === 1130 && state.name.startsWith('a waiting')) out.push(`[AFTER${what}] ${[...new Set(texts)].join(' | ')}`)
      if (DUMP && what === '') out.push(`${at}: ${walk(root).length} elements; ${texts.length} texts`)
      check(root, width, at, problems, view, state.name)
      if (DUMP) for (const t of texts) if (t.endsWith('…')) cutSeen.add(`${width}|${t}`)
      seen.push(at)
    }
    for (const width of PRESS_ONLY_WIDTHS_PT) {
      await ui.redraw(propsAt(width))
      pressProblems(await ui.drawn(), `${state.name}, ${view}${what} at ${width} pt`, problems)
    }
  }
  await draw('')
  if (DUMP) {
    const root = await ui.drawn()
    out.push(`[${state.name} / ${view}] ${[...new Set(textsOf(root))].slice(0, 400).join(' | ')}`)
    out.push(`KEYS ${[...new Set(walk(root).map(nameOf).filter(k => /(chip|count|fresh|pk-|pick)/.test(k)))].slice(0, 80).join(' ')}`)
  }
  const want = view === 'board' ? state.rows : state.inner
  if (want !== undefined) {
    const pressed = new Set<string>()
    let last = ''
    for (let round = 0; round < 3; round += 1) {
      await ui.redraw(propsAt(1130))
      const keys = [...new Set(walk(await ui.drawn()).map(nameOf).filter(k => want.test(k) && !pressed.has(k)))]
      for (const key of keys) {
        await ui.redraw(propsAt(1130))
        if ((await ui.find({ key })) === undefined) continue
        pressed.add(key)
        last = key
        await ui.press({ key })
        await ui.redraw()
        await draw(` after "${key}"`)
      }
      if (keys.length === 0) break
    }
    if (last !== '') {
      await ui.redraw(propsAt(1130))
      if ((await ui.find({ key: last })) !== undefined) await ui.press({ key: last })
    }
  }
}

test('each state the busy store does not reach, at 400 to 5120 pt: the layout rules hold and the state is on screen', { timeoutMs: 600_000 }, async ($, on) => {
  const w: World = { mem: new Map<string, unknown>([['cockpit:setting:look.view', 'custom']]), files: new Map(), listening: {}, procs: [] }
  const clock = mock.clock(on, { now: getNow() })
  mock.env(on, { HOME })
  engine(on, w)
  setSetupExists(async p => w.files.has(p))
  const mount = (width: number) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(width) }) as unknown as Promise<Pane>
  const mountBand = (width: number) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps(width) }) as unknown as Promise<Pane>
  const problems: string[] = []
  const seen: string[] = []
  const out: string[] = []
  for (const state of STATES) {
    await clock.advance(BUNDLE_TTL_MS + 10 * MIN)
    setNow(clock.now())
    w.files = new Map()
    w.listening = {}
    BASE_SEEDS(w.mem)
    state.seed(w.mem, w)
    await state.before?.($)
    const first = await mount(1130)
    await state.start?.(first)
    await clock.settle()
    await first.unmount()
    if (state.band === true) await bandSweep(mountBand, state, problems, seen)
    const board = await mount(1130)
    await sweep(board, state, 'board', problems, seen, out)
    await board.unmount()
    await clock.advance(BUNDLE_TTL_MS + 1)
    w.mem.set('cockpit:setting:detail', 'glance')
    const shut = await mount(1130)
    await sweep(shut, state, 'glance shut', problems, seen, out)
    await shut.unmount()
    const open = await mount(1130)
    await open.redraw(propsAt(1130))
    for (const key of [...new Set(walk(await open.drawn()).map(nameOf).filter(k => /^press-glance-/.test(k)))]) {
      if ((await open.find({ key })) !== undefined) await open.press({ key })
      await open.redraw()
    }
    await sweep(open, state, 'glance open', problems, seen, out)
    for (const key of [...new Set(walk(await open.drawn()).map(nameOf).filter(k => /^press-glance-/.test(k)))]) if ((await open.find({ key })) !== undefined) await open.press({ key })
    await open.unmount()
    await clock.advance(BUNDLE_TTL_MS + 1)
    w.mem.set('cockpit:setting:detail', 'explained')
    if (state.band === true) {
      const list = await mount(1130)
      if ((await list.find({ key: 'band-list-done' })) !== undefined) await list.press({ key: 'band-list-done' })
      await list.unmount()
    }
    if (state.open !== undefined) {
      const prep = await mount(1130)
      await state.open(prep)
      await prep.unmount()
      const view = await mount(1130)
      await sweep(view, state, 'view', problems, seen, out)
      await view.unmount()
    }
    if (state.leave !== undefined) {
      const back = await mount(1130)
      await state.leave(back)
      await back.unmount()
    }
  }
  if (DUMP) console.log(out.join('\n'))
  if (DUMP) console.log(`CUT ${[...cutSeen].sort().join('\nCUT ')}`)
  if (DUMP) console.log(`LOOKED ${JSON.stringify(looked)}`)
  expect(seen.length).toBeGreaterThan(STATES.length * WIDTHS_PT.length)
  expect(looked.rows).toBeGreaterThan(1000)
  expect(looked.texts).toBeGreaterThan(5000)
  expect(pressLooked.words).toBeGreaterThan(20)
  expect(pressLooked.pairs).toBeGreaterThan(5)
  expect([...new Set(problems)]).toEqual([])
})
