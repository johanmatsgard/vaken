// The This session card at the narrow pane (288 pt) and wide, in English and Swedish: six faults found earlier stay fixed.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { setLang, tr } from '../hooks/core/lang'
import { reasonWords } from '../hooks/features/home/logic'
import { pointsLine } from '../hooks/features/home/cards/here'
import { fmt } from '../hooks/core/fmt'
import { SETTINGS } from '../hooks/core/settings'
import { BASE_SEEDS, HOME, MIN, HOUR, NOW, ROOT, SETUP_BASE, engine, kids, nameOf, propsAt, rec, walk, strings } from './statefixtures'
import type { Node, Pane, World } from './statefixtures'

const NARROW = 288
const WIDE = 900
const hot = () =>
  rec('test-session', { cwd: ROOT, branch: 'feat-x', title: 'Fix the login page', state: 'idle', startedAt: NOW - 2 * HOUR, stateSince: NOW - 12 * MIN, lastEventAt: NOW - 12 * MIN, contextPercent: 82, costUsd: 9.3, ctx: { tokens: 164000, window: 200000, compactAt: 92 }, cache: { read: 120000, write: 6000, fresh: 2000, hit: 94, at: NOW - 12 * MIN } })

async function mount($: unknown, on: Parameters<typeof engine>[0], detail: 'glance' | 'explained', o: { sv?: boolean; open?: boolean; wPt?: number } = {}): Promise<Pane> {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:setting:detail', detail)
  if (o.sv === true) w.mem.set('cockpit:setting:look.language', 'sv')
  w.mem.set('cockpit:session:test-session', hot())
  engine(on, w)
  forgetProjectSet()
  forgetContext()
  forgetStartCheck()
  delete checkShown.sig
  const ui = (await ($ as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(o.wPt ?? NARROW) })) as Pane
  await ui.redraw()
  if (o.open === true) {
    await ui.press({ key: 'press-glance-here-0' })
    await ui.redraw()
  }
  return ui
}
const find = (n: Node, pred: (x: Node) => boolean): Node | undefined => (pred(n) ? n : kids(n).map(c => find(c, pred)).find(x => x !== undefined))
const card = async (ui: Pane): Promise<Node> => {
  const root = await ui.drawn()
  const c = find(root, n => nameOf(n) === 'here' && n.props?.borderStyle === 'round')
  expect(c, 'the This session card is drawn').toBeDefined()
  return c as Node
}
const textsIn = (n: Node): string[] => walk(n).filter(x => x.type === 'Text').map(x => strings(x).join(''))
const byKey = (n: Node, key: string): Node | undefined => find(n, x => nameOf(x) === key)
const done = async (ui: Pane) => {
  await ui.unmount()
  setLang('en')
}

for (const sv of [false, true]) {
  const lang = sv ? 'Swedish' : 'English'
  test(`1. Explained at 288 pt (${lang}): the percent sits beside the bar, one dim line under it names who compacts where, never two texts run together`, async ($, on) => {
    const ui = await mount($, on, 'explained', { sv })
    const c = await card(ui)
    const bar = byKey(c, 'ctx-bar')
    expect(bar, 'the bar is drawn').toBeDefined()
    expect(textsIn(bar as Node)).toEqual([sv ? '82\u00a0%' : '82%'])
    // One whole dim text names who compacts where; at 82% the context is past vaken's own 60%, so the line names only Claude Code's point (the bar keeps both marks)
    // The forms by width are pointsLine's own test below
    const lineOf = async (want: string) => walk(await card(ui)).find(x => x.type === 'Text' && strings(x).join('') === want)
    const appOnly = sv ? 'Claude Code komprimerar vid 92\u00a0%' : 'Claude Code compacts at 92%'
    expect(await lineOf(appOnly), 'the line at 288 pt').toBeDefined()
    expect(textsIn(await card(ui)).some(t => /Vaken (compacts|komprimerar)|vaken 60/.test(t))).toBe(false)
    await ui.redraw(propsAt(WIDE))
    const line = await lineOf(appOnly)
    expect(line, 'the dim line is drawn').toBeDefined()
    expect(line?.props?.dimColor).toBe(true)
    // The old row of two texts side by side is gone
    expect(textsIn(c).some(t => /^\d+k .* tokens$/.test(t))).toBe(false)
    await done(ui)
  })

  test(`2. Glance opened at 288 pt (${lang}): the Cost label is whole, the value is the amount, the plan note dim under it; a fact row never lets its value squeeze its label`, async ($, on) => {
    const ui = await mount($, on, 'glance', { sv, open: true })
    const c = await card(ui)
    const block = byKey(c, 'here-cost')
    expect(block, 'the Cost row is drawn').toBeDefined()
    expect(textsIn(block as Node)).toEqual(sv ? ['Kostnad', '9,30\u00a0USD', 'Om du betalar per användning (din plan kan skilja sig)'] : ['Cost', '$9.30', 'If paid per use (your plan may differ)'])
    const row = byKey(c, 'here-cost-row') as Node
    const [label, value] = kids(row).filter(k => k.type === 'Box')
    expect(label?.props?.flexShrink).toBe(0)
    expect(value?.props?.flexShrink).toBe(1)
    await done(ui)
  })

  test(`3. Glance closed (${lang}): the headline is the state and the cost, the amber dot says Context nearly full, and the state stays on the row at 288 pt when the whole headline does not fit`, async ($, on) => {
    const ui = await mount($, on, 'glance', { sv })
    const word = sv ? 'Kontext nästan full' : 'Context nearly full'
    const whole = sv ? 'Vilar · 9,30\u00a0USD' : 'Idle · $9.30'
    for (const wPt of [NARROW, WIDE]) {
      await ui.redraw(propsAt(wPt))
      const c = await card(ui)
      const alts = walk(c).filter(x => x.type === 'Svg').map(x => String(x.props?.alt ?? ''))
      expect(alts).toContain(word)
      expect(alts).not.toContain(sv ? 'Behöver dig' : 'Needs you')
      // English fits the whole headline at 288 pt; Swedish shows the state alone there, the whole headline when wide
      expect(textsIn(c)).toContain(sv && wPt === NARROW ? 'Vilar' : whole)
      expect(textsIn(c).some(t => /Context|Kontext/.test(t))).toBe(false)
    }
    await done(ui)
  })
}

test('4. Explained: the cost has its own Cost row with the amount, which opens the same What is this as the state row; the state row holds no amount', async ($, on) => {
  const ui = await mount($, on, 'explained')
  const c = await card(ui)
  const state = byKey(c, 'ol-here') as Node
  expect(textsIn(state)).toEqual(['Idle'])
  const cost = byKey(c, 'ol-here-cost') as Node
  expect(cost, 'the Cost row is drawn').toBeDefined()
  expect(textsIn(cost)).toEqual(['Cost', '$9.30'])
  expect(textsIn(c).some(t => t.includes('The cost is what Claude Code reports'))).toBe(false)
  await ui.press({ key: 'press-ol-here-cost-0' })
  await ui.redraw()
  expect(textsIn(await card(ui)).some(t => t.includes('The cost is what Claude Code reports'))).toBe(true)
  await done(ui)
})

test('5. Swedish at 288 pt: the header never wraps, Visa mindre stays on the title row (the subtitle goes first); wide, the subtitle is back', async ($, on) => {
  const ui = await mount($, on, 'explained', { sv: true })
  const c = await card(ui)
  expect(byKey(c, 'here-controls-line')).toBeUndefined()
  const head = byKey(c, 'here-head') as Node
  expect(head, 'the header row is drawn').toBeDefined()
  expect(textsIn(head)).toContain('Den här sessionen')
  expect(find(head, x => /detail-here/.test(nameOf(x))), 'Visa mindre is on the title row').toBeDefined()
  await ui.redraw(propsAt(WIDE))
  expect(textsIn(byKey(await card(ui), 'here-head') as Node)).toContain('Fix the login page')
  await done(ui)
})

test('6. The settings side writes its numbers with the same formatter as the front: 60 % in Swedish, 100k tokens', async ($, on) => {
  const label = (key: string, value: string) => SETTINGS.find(s => s.key === key)?.options?.find(o => o.value === value)?.label
  expect(label('compact.from', '60')).toBe(fmt.percent(60))
  expect(label('compact.min', '100000')).toBe(`${fmt.tokens(100000)} tokens`)
  const ui = await mount($, on, 'glance', { sv: true, open: true })
  await ui.press({ key: 'btn-icon-here-gear' })
  await ui.redraw()
  const texts = walk(await ui.drawn()).flatMap(x => [...strings(x), ...(typeof x.props?.label === 'string' ? [String(x.props.label).trim()] : [])])
  // A choice written as a figure reads in the reader's language: "60 %" in Swedish (fmt.choiceWord)
  expect(texts).toContain('60\u00a0%')
  expect(texts).not.toContain('60%')
  // The back side counts its lines, so Compact from (100k tokens) may sit in Settings, not on it: its label is checked above
  expect(texts.some(t => /\d \d{3} tokens/.test(t))).toBe(false)
  await done(ui)
})

test('the hot context part: one advice line, Compact now, one Why row (no About this); When to compact only with advice; no Quiet row on this card', async ($, on) => {
  const ui = await mount($, on, 'explained')
  const c = await card(ui)
  const texts = textsIn(c)
  const labels = walk(c).map(x => (typeof x.props?.label === 'string' ? String(x.props.label).trim() : '')).filter(l => l !== '')
  // The line right above the Compact now button does not say "Compact now." again
  expect(texts).toContain('Claude compacts the session by itself soon.')
  expect(texts).not.toContain('Claude compacts the session by itself soon. Compact now.')
  expect(texts.some(t => t.startsWith('A quiet moment'))).toBe(false)
  expect([...texts, ...labels].some(t => /About this/.test(t))).toBe(false)
  expect(labels.filter(l => /^Why compact\?( ›)?$/.test(l)).length).toBe(1)
  expect(texts).toContain('When to compact')
  expect(texts.some(t => /^Quiet for/.test(t))).toBe(false)
  await done(ui)
})

test('a calm session (no advice) has no When to compact row, and with vaken Auto off the line names only Claude Code', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:setting:detail', 'explained')
  w.mem.set('cockpit:setting:compact.mode', 'off')
  w.mem.set('cockpit:session:test-session', { ...hot(), state: 'working', contextPercent: 23, ctx: { tokens: 46000, window: 200000, compactAt: 92 } })
  engine(on, w)
  forgetProjectSet()
  forgetContext()
  forgetStartCheck()
  delete checkShown.sig
  const ui = (await ($ as unknown as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(NARROW) })) as Pane
  await ui.redraw()
  const texts = textsIn(await card(ui))
  expect(texts).toContain('Claude Code compacts at 92%')
  expect(texts).not.toContain('When to compact')
  await done(ui)
})

test('a waiting OK says what it is for in plain words, per tool, in English and Swedish', () => {
  const en = (s: string) => s
  expect(reasonWords('waits to run Bash, may need OK', en)).toBe('waits for your OK to run a command')
  expect(reasonWords('waits to run Edit, may need OK', en)).toBe('waits for your OK to edit a file')
  expect(reasonWords('waits to run mcp__x__y, may need OK', en)).toBe('waits for your OK to use mcp__x__y')
  setLang('sv')
  try {
    expect(reasonWords('waits to run Bash, may need OK', tr)).toBe('väntar på ditt OK för ett kommando')
  } finally {
    setLang('en')
  }
})

test('the line under the bar takes the longest form that fits one row, else only the nearer point', () => {
  const p = { own: 60, app: 92, marks: [60, 92] }
  expect(pointsLine(p, undefined)).toBe('Vaken compacts at 60% · Claude Code at 92%')
  expect(pointsLine(p, 400)).toBe('Vaken compacts at 60% · Claude Code at 92%')
  // The short form from about 290 pt of row; the 288 pt pane's card row (262 pt) keeps only the nearer point
  expect(pointsLine(p, 290)).toBe('Compacts: vaken 60% · Claude Code 92%')
  expect(pointsLine(p, 262)).toBe('Vaken compacts at 60%')
  expect(pointsLine(p, 150)).toBe('Vaken compacts at 60%')
  expect(pointsLine({ app: 92, marks: [92] }, 150)).toBe('Claude Code compacts at 92%')
})

test('Quiet starts at the top of the Notices section in Settings, and the same spot ends it', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:session:test-session', hot())
  engine(on, w)
  forgetProjectSet()
  forgetContext()
  forgetStartCheck()
  delete checkShown.sig
  const ui = (await ($ as unknown as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(WIDE) })) as Pane
  await ui.press({ key: 'settings' })
  await ui.redraw()
  if ((await ui.find({ key: 'settings-quiet-start' })) === undefined) {
    await ui.press({ key: 'press-ol-section:Notices-0' })
    await ui.redraw()
  }
  const sec = find(await ui.drawn(), n => nameOf(n) === 'settings-notices') as Node
  expect(sec, 'the Notices section').toBeDefined()
  const keys = walk(sec).map(nameOf).filter(k => k !== '')
  const quiet = keys.indexOf('settings-quiet-start')
  expect(quiet).toBeGreaterThanOrEqual(0)
  // At the top of the open section: before any setting row
  expect(keys.findIndex(k => /^(setting|row)-/.test(k)) === -1 || quiet < keys.findIndex(k => /^(setting|row)-/.test(k))).toBe(true)
  await ui.press({ key: 'settings-quiet-start' })
  await ui.unmount()
  await clock.settle()
  const again = (await ($ as unknown as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(WIDE) })) as Pane
  await again.redraw()
  expect(await again.find({ key: 'settings-quiet-start' })).toBeUndefined()
  expect(await again.find({ key: 'settings-quiet-end' })).toBeDefined()
  await done(again)
})
