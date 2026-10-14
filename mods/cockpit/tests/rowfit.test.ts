// The Home pane at about 300 pt: every row fits.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { BASE_SEEDS, HOME, MIN, ROOT, engine, getNow, kids, nameOf, propsAt, rec, strings, walk } from './statefixtures'
import type { Node, Pane, World } from './statefixtures'

import { setLang, t } from '../hooks/core/lang'
import { FactRow, GlanceRow, LinkButton, SessionRow, glanceTrailPt, glanceValueFits, noteFit, wrappedLines } from '../hooks/ui/kit'
import type { El } from '../hooks/ui/kit'
import { paneGrid } from '../hooks/features/home/grid'
import { CARD_IDS } from '../hooks/features/home/logic'
import { BOLD_CHAR_PT, CHEVRON_GAP, CHEVRON_SLOT, COL_PT, DOT, GLANCE_DOT_GAP, GLANCE_VALUE_GAP, ICON_GAP, LIST_ROW_H, NOTE_MAX_LINES, TEXT_CHAR_PT, rows } from '../hooks/ui/tokens'

type Raw = Record<string, unknown>
const make = (name: string) => Object.assign((p: Raw) => ({ ...p, type: name }), { displayName: name })
const el = (): El => ({ Box: make('Box'), Text: make('Text'), Button: make('Button'), Svg: make('Svg'), Client: make('Client') }) as unknown as El
function all(n: unknown, out: Raw[] = []): Raw[] {
  if (Array.isArray(n)) for (const c of n) all(c, out)
  else if (n !== null && typeof n === 'object') {
    out.push(n as Raw)
    all((n as Raw).children, out)
  }
  return out
}
const texts = (tree: unknown): string[] => all(tree).filter(n => n.type === 'Text').flatMap(n => (Array.isArray(n.children) ? n.children : [n.children]).filter((c): c is string => typeof c === 'string'))
const WIDTHS_PT = [260, 300, 400, 700]
const innerAt = (w: number): number => paneGrid(w, undefined, CARD_IDS.length + 1).innerPt
const FOLD = glanceTrailPt({ isFull: true })

test('a Glance value that does not fit whole beside the title, the dot, the chevron and Fold is dropped; the dot keeps the state', () => {
  setLang('en')
  const g = (value: string, widthPt: number) => ({ value, dot: 'neutral' as const, isOpen: true, widthPt, onPress: () => {} })
  // At the 300 pt pane: the two stubs.
  const inner = innerAt(300)
  for (const [title, value] of [['Memory and notes', 'All small'], ['Other sessions', '1 your turn']]) {
    expect(glanceValueFits(title, g(value, inner), FOLD), `${title} at 300 pt`).toBe(false)
    const row = GlanceRow(el(), 'k', title, g(value, inner), undefined, undefined, false, FOLD)
    expect(texts(row)).not.toContain(value)
    expect(all(row).some(n => n.type === 'Svg' && n.alt === t('access.dot_calm'))).toBe(true)
  }
  for (const w of [400, 700]) expect(texts(GlanceRow(el(), 'k', 'Memory and notes', g('All small', innerAt(w)), undefined, undefined, false, FOLD))).toContain('All small')
  for (const w of WIDTHS_PT) {
    const room = innerAt(w) - 'Memory and notes'.length * BOLD_CHAR_PT - GLANCE_VALUE_GAP - GLANCE_DOT_GAP - DOT - CHEVRON_GAP - CHEVRON_SLOT - FOLD
    expect(glanceValueFits('Memory and notes', g('All small', innerAt(w)), FOLD), `${w} pt`).toBe('All small'.length * TEXT_CHAR_PT <= room)
  }
})

test('a row link has its chevron at the row end, a mark named by the row (live, an unnamed picture was not drawn), never "›" right after the words', () => {
  setLang('en')
  for (const label of ['Run several tasks ›', 'Pause notices for 50 min ›', 'This session ›', 'Change in Settings']) {
    const row = LinkButton(el(), 'l', label, () => {}, { row: true }) as unknown as Raw
    const parts = (row.children as unknown[]).filter((c): c is Raw => c !== null && typeof c === 'object')
    const button = all([row]).find(p => p.type === 'Button')
    expect(String(button?.label), label).toBe(label.replace(/\s*›$/, ''))
    expect(row.justifyContent).toBe('space-between')
    const flow = parts.filter(p => p.position !== 'absolute' && !all([p]).some(n => n.type === 'Button'))
    const chevron = all(flow).find(n => n.type === 'Svg')
    expect(chevron, label).toBeDefined()
    expect(chevron?.alt).toBe(`Open ${label.replace(/\s*›$/, '')}`)
  }
})

test('a note line wraps to at most two lines; a longer one is cut at a word with "…"', () => {
  setLang('en')
  const daily = '56% of your weekly limit is left. To make it last until it resets, use about 11% a day.'
  for (const w of WIDTHS_PT) {
    const f = noteFit(daily, innerAt(w))
    expect(f.lines, `${w} pt`).toBeLessThanOrEqual(NOTE_MAX_LINES)
    expect(f.text === daily || (f.text.endsWith('…') && daily.startsWith(f.text.slice(0, -1).trimEnd())), `${w} pt: ${f.text}`).toBe(true)
  }
  expect(noteFit(daily, innerAt(300))).toEqual({ text: daily, lines: 2 })
  expect(noteFit('Short note', innerAt(300))).toEqual({ text: 'Short note', lines: 1 })
  const long = Array.from({ length: 30 }, () => 'word').join(' ')
  expect(noteFit(long, innerAt(300)).text.endsWith('word…')).toBe(true)
  const note = all(FactRow(el(), 'n', daily, '', { dim: true, widthPt: innerAt(300) })).find(n => n.type === 'Text')
  expect(note?.wrap).toBe('wrap')
  const fact = all(FactRow(el(), 'f', 'Settings choice for a long task name', 'Running · 8 min')).find(n => n.type === 'Text')
  expect(fact?.wrap).toBe('truncate-end')
})

// The cut is found in one pass (it measured every shorter cut again, quadratic in the words, on every draw of a row).
test('a note cut in one pass is the cut the word-by-word search found, and a note of 20 000 words is cut without measuring it again per word', () => {
  setLang('en')
  const linesIn = (text: string, w: number): number => wrappedLines(text, w + CHEVRON_SLOT + CHEVRON_GAP)
  const slow = (text: string, w: number): { text: string; lines: number } => {
    const lines = linesIn(text, w)
    if (lines <= NOTE_MAX_LINES) return { text, lines }
    const words = text.split(' ')
    for (let n = words.length - 1; n >= 1; n -= 1) {
      const shown = `${words.slice(0, n).join(' ').replace(/[\s.,;:·-]+$/, '')}…`
      if (linesIn(shown, w) <= NOTE_MAX_LINES) return { text: shown, lines: NOTE_MAX_LINES }
    }
    return { text: words[0] ?? '', lines: NOTE_MAX_LINES }
  }
  const pool = ['a', 'to', 'the', 'limit,', 'weekly', 'Mmmm', 'resets.', 'Wednesday', 'i', 'supercalifragilistic', 'x;', 'same', 'folder', 'WWWWWWWW']
  let seed = 7
  const next = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648)
  for (let k = 0; k < 300; k += 1) {
    const words = Array.from({ length: 1 + (next() % 40) }, () => pool[next() % pool.length])
    const text = words.join(' ')
    const w = 40 + (next() % 400)
    expect(noteFit(text, w), `${w} pt: ${text}`).toEqual(slow(text, w))
  }
  const huge = Array.from({ length: 20_000 }, (_, i) => pool[i % pool.length]).join(' ')
  const f = noteFit(huge, innerAt(300))
  expect(f.lines).toBe(NOTE_MAX_LINES)
  expect(linesIn(f.text, innerAt(300))).toBeLessThanOrEqual(NOTE_MAX_LINES)
})

test('a session row\'s second line wraps to two lines and the row, its wash and its cover are three list rows high', () => {
  setLang('en')
  const inner = innerAt(260)
  const row = SessionRow(el(), 'o', { kind: 'waiting', word: 'Your turn', name: 'Fix the login page', innerPt: inner, detail: 'same folder as you, 3 min', onPress: () => {} }) as unknown as Raw
  const line = all(row).find(n => n.type === 'Text' && n.dimColor === true && texts(n).some(s => s.includes('same folder as you')))
  expect(line?.wrap).toBe('wrap')
  expect(texts(line)).toContain('Your turn · same folder as you, 3 min')
  expect(row.minHeight).toBe(rows(3 * LIST_ROW_H))
  const wide = SessionRow(el(), 'o', { kind: 'waiting', word: 'Your turn', name: 'Fix the login page', innerPt: innerAt(700), detail: 'same folder as you, 3 min', onPress: () => {} }) as unknown as Raw
  expect(wide.minHeight).toBe(rows(2 * LIST_ROW_H))
})

// ---- the pane, at 260 to 700 pt, English and Swedish, every Glance card open

const textOf = (n: Node): string[] => walk(n).flatMap(strings)
function glanceProblems(root: Node, w: number, at: string): { problems: string[]; rows: number; links: number } {
  const problems: string[] = []
  const inner = innerAt(w)
  let n = 0
  for (const row of walk(root).filter(x => /^glance-/.test(nameOf(x)) && x.props?.flexDirection === 'row')) {
    const ts = walk(row).filter(x => x.type === 'Text')
    const title = ts.find(x => x.props?.bold === true)
    const value = ts.find(x => x.props?.bold !== true && x.props?.wrap === 'truncate-end')
    if (title === undefined || walk(row).some(x => /^fresh-/.test(nameOf(x)))) continue
    n += 1
    if (value === undefined) continue
    const more = walk(row).find(x => x.type === 'Button' && /^detail-/.test(nameOf(x)))
    const trail = more === undefined ? 0 : ICON_GAP + String(more.props?.label ?? '').length * COL_PT
    const room = inner - textOf(title).join('').length * BOLD_CHAR_PT - GLANCE_VALUE_GAP - GLANCE_DOT_GAP - DOT - CHEVRON_GAP - CHEVRON_SLOT - trail
    const said = textOf(value).join('')
    if (said.length * TEXT_CHAR_PT > room + 0.01) problems.push(`${at}: "${textOf(title).join('')}" draws "${said}", which does not fit whole`)
  }
  let links = 0
  for (const link of walk(root).filter(x => /^linkrow-/.test(nameOf(x)))) {
    links += 1
    const button = kids(link).find(x => x.type === 'Button')
    const label = String(button?.props?.label ?? '')
    if (/›\s*$/.test(label)) problems.push(`${at}: the row link "${label}" has its chevron right after the words`)
    const flow = kids(link).filter(x => x.type !== 'Button' && x.props?.position !== 'absolute')
    if (!flow.some(x => walk(x).some(y => y.type === 'Svg'))) problems.push(`${at}: the row link "${label}" has no chevron at its end`)
  }
  return { problems, rows: n, links }
}

test('the home pane at 260 to 700 pt, English and Swedish: every Glance value is whole or dropped, every row link ends in its chevron', { timeoutMs: 300_000 }, async ($, on) => {
  const w: World = { mem: new Map<string, unknown>(), files: new Map(), listening: {}, procs: [] }
  const clock = mock.clock(on, { now: getNow() })
  mock.env(on, { HOME })
  engine(on, w)
  const mount = (width: number) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(width) }) as unknown as Promise<Pane>
  const problems: string[] = []
  let checked = 0
  let links = 0
  for (const lang of ['en', 'sv']) {
    BASE_SEEDS(w.mem)
    w.mem.set('cockpit:setting:detail', 'glance')
    w.mem.set('cockpit:setting:look.language', lang)
    w.mem.set('cockpit:session:s1', rec('s1', { cwd: ROOT, state: 'waiting', title: 'Fix the date format on the invoice page', stateSince: getNow() - 3 * MIN }))
    w.mem.set('cockpit:session:s2', rec('s2', { title: 'Update the readme' }))
    for (const width of WIDTHS_PT) {
      await clock.advance(10 * MIN)
      const ui = await mount(width)
      await ui.redraw(propsAt(width))
      for (const key of [...new Set(walk(await ui.drawn()).map(nameOf).filter(k => /^press-glance-/.test(k)))]) {
        if ((await ui.find({ key })) !== undefined) await ui.press({ key })
        await ui.redraw()
      }
      const found = glanceProblems(await ui.drawn(), width, `${lang} ${width} pt`)
      problems.push(...found.problems)
      checked += found.rows
      links += found.links
      for (const key of [...new Set(walk(await ui.drawn()).map(nameOf).filter(k => /^press-glance-/.test(k)))]) if ((await ui.find({ key })) !== undefined) await ui.press({ key })
      await ui.unmount()
    }
  }
  setLang('en')
  expect(problems).toEqual([])
  expect(checked, 'Glance rows checked').toBeGreaterThan(WIDTHS_PT.length * 2 * 4)
  expect(links, 'row links checked').toBeGreaterThan(0)
})

// ---- the pane at the Full look, All view, every card open: a card header note is whole, its short form, or not drawn; never cut with "…"
// (live at about 880 pt, two columns: "Instructions…", "Agent files and…", "Pause, undo, and which risky…", "Commands, edits…").

test('the home pane at 300 to 880 pt, English and Swedish, Full look: no card header note ends in "…"', { timeoutMs: 300_000 }, async ($, on) => {
  const w: World = { mem: new Map<string, unknown>(), files: new Map(), listening: {}, procs: [] }
  const clock = mock.clock(on, { now: getNow() })
  mock.env(on, { HOME })
  engine(on, w)
  const mount = (width: number) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(width) }) as unknown as Promise<Pane>
  const problems: string[] = []
  let notes = 0
  for (const lang of ['en', 'sv']) {
    BASE_SEEDS(w.mem)
    w.mem.set('cockpit:setting:look.view', 'all')
    w.mem.set('cockpit:setting:detail', 'explained')
    w.mem.set('cockpit:setting:look.language', lang)
    w.mem.set('cockpit:session:s1', rec('s1', { cwd: ROOT, state: 'waiting', title: 'Fix the date format on the invoice page', stateSince: getNow() - 3 * MIN }))
    w.mem.set('cockpit:session:s2', rec('s2', { title: 'Update the readme' }))
    for (const width of [300, 400, 700, 880]) {
      await clock.advance(10 * MIN)
      const ui = await mount(width)
      await ui.redraw(propsAt(width))
      for (const head of walk(await ui.drawn()).filter(x => /-head$/.test(nameOf(x)) && x.props?.flexDirection === 'row')) {
        for (const note of walk(head).filter(x => x.type === 'Text' && x.props?.dimColor === true && x.props?.wrap === 'truncate-end')) {
          const said = textOf(note).join('')
          if (said === '') continue
          notes += 1
          if (said.endsWith('…')) problems.push(`${lang} ${width} pt: a header note is cut: "${said}"`)
        }
      }
      await ui.unmount()
    }
  }
  setLang('en')
  expect(problems).toEqual([])
  expect(notes, 'header notes checked').toBeGreaterThan(0)
})
