// Open headers and the Plan limits words, English and Swedish, 288 and 500 pt:
// A) an open This session or Plan limits card has a header of title, dot and Fold alone (its body says the facts); a closed card keeps its summary and the dot keeps its word;
// B) a used-up limit: the dot's word is "Used up · resets ..." and the row one plain sentence; C) the two "no figure" words are said once;
// D) the week's share a day says what it is; E) the band keeps the Week chip when it fits; F) the row "Why compact?".
import { expect, mock } from 'claude-code/testing'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { setLang, tr } from '../hooks/core/lang'
import { glanceBelow, glanceOpen, glanceShown } from '../hooks/ui/kit'
import { chipFit, chipPt, partShowsReset } from '../hooks/features/home/band'
import { buildView, limitBlocks, limitLines } from '../hooks/features/home/logic'
import type { Chip } from '../hooks/features/home/band'
import { BASE_SEEDS, HOME, MIN, HOUR, NOW, SETUP_BASE, engine, rec, walk, strings, nameOf, propsAt } from './statefixtures'
import type { Mem, Node, Pane, World } from './statefixtures'
import { test } from './slow'

const iso = (ms: number) => new Date(ms).toISOString()
const R = (over: Record<string, unknown>) => (m: Mem) => m.set('cockpit:session:test-session', rec('test-session', { cwd: '/work/app', branch: 'feat-x', title: 'Fix the login page', ...over }))
const BUSY = { state: 'working', contextPercent: 62, costUsd: 3.1, fiveHourPercent: 46, fiveHourResetsAt: iso(NOW + 2 * HOUR + 10 * MIN), sevenDayPercent: 41, sevenDayResetsAt: iso(NOW + 3 * 24 * HOUR) }
const HOT = { state: 'working', contextPercent: 93, costUsd: 4.2, fiveHourPercent: 52, fiveHourResetsAt: iso(NOW + 2 * HOUR), sevenDayPercent: 44, sevenDayResetsAt: iso(NOW + 3 * 24 * HOUR) }
const OUT = { state: 'idle', contextPercent: 70, costUsd: 7.9, fiveHourPercent: 100, fiveHourResetsAt: iso(NOW + 100 * MIN), sevenDayPercent: 97, sevenDayResetsAt: iso(NOW + 2 * 24 * HOUR) }
const YET = { state: 'idle', title: undefined, costUsd: undefined, startedAt: NOW - 30_000, lastEventAt: NOW - 30_000, updatedAt: NOW - 30_000, stateSince: NOW - 30_000 }
const NONE = { state: 'idle', title: undefined, costUsd: undefined, startedAt: NOW - 30 * MIN, lastEventAt: NOW - 2 * MIN, updatedAt: NOW - 2 * MIN, stateSince: NOW - 2 * MIN }

type Shot = { closed: Node; open: Node }
const find = (n: Node, pred: (x: Node) => boolean): Node | undefined => (pred(n) ? n : (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object').map(c => find(c, pred)).find(x => x !== undefined))
const cardOf = (root: Node, id: string): Node => (find(root, n => nameOf(n) === id && n.props?.borderStyle === 'round') ?? find(root, n => nameOf(n) === id)) as Node
const rowOf = (card: Node, id: string): Node => find(card, n => nameOf(n) === `glance-${id}`) as Node
// The open header: its Glance row and, when the row has no room for the word, the line under the title
const headOf = (card: Node, id: string): Node => ({ type: 'Box', children: [rowOf(card, id), find(card, n => nameOf(n) === `${id}-word-line`)].filter(x => x !== undefined) }) as Node
const textsOf = (n: Node): string[] => walk(n).flatMap(strings)
const labelsOf = (n: Node): string[] => walk(n).filter(x => x.type === 'Button' && typeof x.props?.label === 'string').map(x => String(x.props?.label).trim())
const altsOf = (n: Node): string[] => walk(n).filter(x => x.type === 'Svg' && typeof x.props?.alt === 'string' && x.props.alt !== '').map(x => String(x.props?.alt))

// Draws the card `id` closed and then open, at `wPt`
async function shoot(on: Parameters<Parameters<typeof test>[2]>[1], $: Parameters<Parameters<typeof test>[2]>[0], seed: (m: Mem) => void, sv: boolean, ids: string[], wPt: number): Promise<Record<string, Shot>> {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:setting:detail', 'glance')
  if (sv) w.mem.set('cockpit:setting:look.language', 'sv')
  seed(w.mem)
  engine(on, w)
  forgetProjectSet()
  forgetContext()
  forgetStartCheck()
  delete checkShown.sig
  const U = $ as unknown as { ui: { mount: (a: unknown) => Promise<Pane> } }
  const ui = await U.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(wPt) })
  const out: Record<string, Shot> = {}
  try {
    await ui.redraw(propsAt(wPt))
    const first = await ui.drawn()
    const closed = Object.fromEntries(ids.map(id => [id, cardOf(first, id)]))
    for (const id of ids) {
      await ui.press({ key: `press-glance-${id}-0` })
      await ui.redraw(propsAt(wPt))
    }
    const root = await ui.drawn()
    for (const id of ids) out[id] = { closed: closed[id], open: cardOf(root, id) }
  } finally {
    await ui.unmount()
    setLang('en')
  }
  return out
}

const TITLES: Record<string, Record<string, string>> = { en: { here: 'This session', limit: 'Plan limits' }, sv: { here: 'Den här sessionen', limit: 'Plangränser' } }

// A and the words of B: an open card's header is the title alone (the dot and Fold are pictures and a button), the dot keeps the summary as its word
for (const sv of [false, true]) {
  for (const wPt of [288, 500]) {
    const lang = sv ? 'sv' : 'en'
    test(`an open This session and Plan limits header is title, dot and Fold alone; the closed one keeps its summary: ${lang} ${wPt} pt`, { timeoutMs: 120_000 }, async ($, on) => {
      const s = await shoot(on, $, R(BUSY), sv, ['here', 'limit'], wPt)
      for (const id of ['here', 'limit']) {
        const closedTexts = textsOf(rowOf(s[id].closed, id))
        const openTexts = textsOf(rowOf(s[id].open, id)).map(x => x.trim()).filter(x => x !== '')
        // Closed: the summary is on the row ("Working · $3.10", "5 h: 46% used")
        expect(closedTexts.join(' '), `${id} closed row`).toMatch(id === 'here' ? /(Working|Arbetar)/ : /46/)
        // Open: the title and the Fold word (a picture with its word), and nothing of the summary
        expect(openTexts, `${id} open row words`).toEqual([TITLES[lang][id]])
        expect(altsOf(rowOf(s[id].open, id)), `${id} Fold`).toContain(sv ? 'Dölj' : 'Fold')
        expect(find(s[id].open, n => nameOf(n) === `${id}-word-line`), `${id} no second line`).toBeUndefined()
        // The dot says it, in words
        const alt = altsOf(rowOf(s[id].open, id))[0]
        expect(alt, `${id} dot word`).toMatch(id === 'here' ? /(Working|Arbetar)/ : /46/)
      }
      // The body still says the facts
      expect(textsOf(s.here.open).join(' | ')).toMatch(sv ? /Status.*Kostnad/s : /State.*Cost/s)
      expect(textsOf(s.limit.open).join(' | ')).toMatch(sv ? /5-timmarsgräns/ : /5-hour limit/)
    })
  }
}

// B: used up
for (const sv of [false, true]) {
  const lang = sv ? 'sv' : 'en'
  test(`a used-up limit: the amber dot says Used up and the reset, and the row is one plain sentence: ${lang}`, { timeoutMs: 120_000 }, async ($, on) => {
    const s = await shoot(on, $, R(OUT), sv, ['limit'], 288)
    const alt = altsOf(rowOf(s.limit.open, 'limit'))[0]
    expect(alt).toMatch(sv ? /^Förbrukad · återställs kl\. \d\d:\d\d$/ : /^Used up · resets \d\d:\d\d$/)
    const all = textsOf(s.limit.open)
    expect(all.join(' | ')).not.toMatch(/Needs you|Behöver dig/)
    expect(all.find(x => /^(Used up|Förbrukad)\./.test(x))).toMatch(sv ? /^Förbrukad\. Sessionerna väntar\.$/ : /^Used up\. Sessions wait\.$/)
    // The old two-part row is gone
    expect(all).not.toContain('sessions wait')
    expect(all).not.toContain('sessioner väntar')
    // The closed row's dot has the same word
    expect(altsOf(rowOf(s.limit.closed, 'limit'))[0]).toBe(alt)
  })
}

// C: "Not known yet" once; "Not shared" when the app answered and shares none
for (const sv of [false, true]) {
  const lang = sv ? 'sv' : 'en'
  const yet = sv ? 'Inte känt än' : 'Not known yet'
  test(`Plan limits with no figures says Not known yet once, in the header: ${lang}`, { timeoutMs: 120_000 }, async ($, on) => {
    const s = await shoot(on, $, R(YET), sv, ['limit'], 288)
    const all = textsOf(s.limit.open)
    expect(all.filter(x => x.includes(yet))).toEqual([yet])
    expect(textsOf(headOf(s.limit.open, 'limit'))).toContain(yet)
    expect(all.join(' | ')).toContain(sv ? 'Det visas efter det första svaret i chatten.' : 'It shows after the first answer in the chat.')
  })
  test(`Plan limits the app does not share says Not shared in the header and explains once in the body: ${lang}`, { timeoutMs: 120_000 }, async ($, on) => {
    const s = await shoot(on, $, R(NONE), sv, ['limit'], 288)
    const all = textsOf(s.limit.open)
    const shared = sv ? 'Delas inte' : 'Not shared'
    expect(textsOf(headOf(s.limit.open, 'limit'))).toContain(shared)
    expect(textsOf(rowOf(s.limit.closed, 'limit'))).toContain(shared)
    expect(all.filter(x => x === shared)).toHaveLength(1)
    expect(all.join(' | ')).not.toContain(yet)
    expect(all.join(' | ')).toContain(sv ? 'Appen delar inte plangränser här.' : 'The app does not share plan limits here.')
    // The dot says its word too, not "Not known yet"
    expect(altsOf(rowOf(s.limit.open, 'limit'))[0]).not.toContain(yet)
  })
}

// F: the row that opens the compact help
for (const sv of [false, true]) {
  const lang = sv ? 'sv' : 'en'
  test(`the help row under Compact now says what it is about: ${lang}`, { timeoutMs: 120_000 }, async ($, on) => {
    const s = await shoot(on, $, R(HOT), sv, ['here'], 288)
    const all = [...textsOf(s.here.open), ...labelsOf(s.here.open)].map(x => x.replace(/ ?›$/, ''))
    expect(all).toContain(sv ? 'Varför komprimera?' : 'Why compact?')
    expect(all).not.toContain('Why')
    expect(all).not.toContain('Varför')
  })
}

// A as one rule: glanceOpen
test('glanceOpen: only an open, front header with bodySays loses its value; the dot keeps the summary as its word', () => {
  const g = { value: 'Working · $3.10', dot: 'accent' as const, isOpen: true, widthPt: 288, onPress: () => {}, bodySays: true }
  const o = glanceOpen(g)
  expect(o.value).toBe('')
  expect(o.word).toBe('Working · $3.10')
  expect(glanceShown('This session', o)).toBe('')
  expect(glanceBelow('This session', o)).toBe('')
  // Its own word wins; a closed, flipped or unflagged header is as it was
  expect(glanceOpen({ ...g, word: 'Context nearly full' }).word).toBe('Context nearly full')
  expect(glanceOpen({ ...g, isOpen: false })).toEqual({ ...g, isOpen: false })
  expect(glanceOpen({ ...g, back: 'Back' })).toEqual({ ...g, back: 'Back' })
  expect(glanceOpen({ ...g, bodySays: undefined })).toEqual({ ...g, bodySays: undefined })
})

// E: the chip's forms, with the real strings of both languages
const chip = (sv: boolean): Chip => ({
  bar: true,
  parts: sv
    ? [{ id: 'session', label: '5 h', pct: 91, reset: 'återställs kl. 12:55' }, { id: 'week', label: 'Vecka', pct: 83, reset: 'återställs tis kl. 12:00' }]
    : [{ id: 'session', label: '5 h', pct: 91, reset: 'resets 12:55' }, { id: 'week', label: 'Week', pct: 83, reset: 'resets Tue 12:00' }],
})
for (const sv of [false, true]) {
  test(`the band chip keeps both limits when only the resets do not fit: ${sv ? 'Swedish' : 'English'}`, () => {
    const c = chip(sv)
    const COL = 7.9
    // Each form is narrower than the one before; 'lead' keeps both labels and figures, only the fuller limit keeps its reset
    const widths = (['both', 'lead', 'full', 'plain'] as const).map(f => chipPt(c, f))
    expect(widths[0]).toBeGreaterThan(widths[1])
    expect(widths[1]).toBeGreaterThan(widths[2])
    expect(widths[2]).toBeGreaterThan(widths[3])
    expect(partShowsReset(c, 'lead', c.parts[0])).toBe(true)
    expect(partShowsReset(c, 'lead', c.parts[1])).toBe(false)
    expect(partShowsReset(c, 'both', c.parts[1])).toBe(true)
    expect(partShowsReset(c, 'plain', c.parts[0])).toBe(false)
    // A width that holds 'lead' but not 'both' gets 'lead' (never the fuller limit alone); wide gets both; narrow gets less
    const cols = (pt: number) => (pt + 8.8 + 4) / COL
    expect(chipFit(c, 0, cols(widths[1] + 1))).toBe('lead')
    expect(chipFit(c, 0, cols(widths[0] + 1))).toBe('both')
    expect(chipFit(c, 0, cols(widths[2] + 1))).toBe('full')
    expect(chipFit(c, 0, cols(widths[3] + 1))).toBe('plain')
    expect(chipFit(c, 0, cols(widths[3] - 20))).toBe('none')
    // Swedish at 500 pt, where the Week chip was dropped
    expect(['lead', 'both']).toContain(chipFit(c, 0, 500 / COL))
  })
}
test('the band chip has no form of its own when no other limit has a reset to give up', () => {
  const c: Chip = { bar: true, parts: [{ id: 'session', label: '5 h', pct: 91, reset: 'resets 12:55' }, { id: 'week', label: 'Week', pct: 38, reset: '' }] }
  expect(chipPt(c, 'both')).toBe(chipPt(c, 'lead'))
  // 'both' is chosen where both fit, and never 'lead' (the same width)
  expect(chipFit(c, 0, 80)).toBe('both')
})

// D and B in the pure lines, English and Swedish: the week's share a day says what it is; the used-up row is one sentence
test('the week row says what the share a day is, and today is its own row; the used-up row is one sentence (English and Swedish)', () => {
  const H = 3_600_000
  const DAY = 24 * H
  const at = (ms: number) => new Date(NOW + ms).toISOString()
  const hm = (ms: number) => new Date(NOW + ms).toTimeString().slice(0, 5)
  const usage = { at: NOW - 30_000, plan: 'Max', windows: [{ label: '5-hour limit', percent: 100, resetsAt: at(100 * 60_000) }, { label: 'Weekly · all models', percent: 84, resetsAt: at(3 * DAY + 21 * H) }] }
  const hist = { 'Weekly · all models': [[NOW - 20 * H, 70], [NOW - 6 * H, 79], [NOW - H, 83]] as [number, number][] }
  const view = buildView([], NOW, 'x', undefined, usage, hist)
  const lines = (lang: 'en' | 'sv') => {
    setLang(lang)
    try {
      return limitLines(limitBlocks(view), 'explained', view, tr).parts.map(p => p.lines.map(l => (l.value === undefined ? l.label : `${l.label} | ${l.value}`)))
    } finally {
      setLang('en')
    }
  }
  const [fiveEn, weekEn] = lines('en')
  expect(fiveEn[0]).toBe('Used up. Sessions wait.')
  // The share of the week that is left, spread over the days to the reset (16% over about 3.9 days is about 4%)
  expect(weekEn[1]).toMatch(/^To last until it resets: about \d+(\.\d)?% a day \(estimate\)$/)
  expect(weekEn[2]).toMatch(/^Used today \| \d+%$/)
  const [fiveSv, weekSv] = lines('sv')
  expect(fiveSv[0]).toBe('Förbrukad. Sessionerna väntar.')
  expect(weekSv[1]).toMatch(/^För att räcka tills det återställs: ungefär \d+(,\d)?\s%\som dagen \(uppskattning\)$/)
  expect(weekSv[2]).toMatch(/^Använt i dag \| \d+\s%$/)
})
