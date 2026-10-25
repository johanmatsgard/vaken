// The Plan limits card in the real pane: an old reading keeps its figures dim with its age, and the daily share is never cut.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { BASE_SEEDS, HOME, HOUR, MIN, NOW, SETUP_BASE, engine, kids, nameOf, propsAt, walk } from './statefixtures'
import type { Mem, Node, Pane, World } from './statefixtures'
import { DOT } from '../hooks/ui/tokens'

const DAY = 24 * HOUR
const RW = new Date(NOW + 3 * DAY + 21 * HOUR).toISOString()
const R5 = new Date(NOW + 3 * HOUR).toISOString()
const windows = (week: number) => [
  { label: '5-hour limit', percent: 20, resetsAt: R5 },
  { label: 'Weekly · all models', percent: week, resetsAt: RW },
  { label: 'Weekly · Fable', percent: 4, resetsAt: RW },
]

const find = (n: Node, pred: (x: Node) => boolean): Node | undefined => (pred(n) ? n : kids(n).map(c => find(c, pred)).find(x => x !== undefined))
// Every Text of the card with its words and whether it is dim
const texts = (card: Node): { s: string; dim: boolean }[] =>
  walk(card)
    .filter(n => n.type === 'Text')
    .map(n => ({ s: (n.children ?? []).filter((c): c is string => typeof c === 'string').join(''), dim: n.props?.dimColor === true }))
    .filter(x => x.s !== '')

async function mountCard($: unknown, on: Parameters<typeof engine>[0], seed: (m: Mem) => void, wPt: number): Promise<Node | undefined> {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:setting:detail', 'explained')
  seed(w.mem)
  engine(on, w)
  forgetProjectSet()
  forgetContext()
  forgetStartCheck()
  delete checkShown.sig
  const ui = (await ($ as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(wPt) })) as Pane
  await ui.redraw()
  const root = await ui.drawn()
  await ui.unmount()
  return find(root, n => nameOf(n) === 'limit' && n.props?.borderStyle === 'round') ?? find(root, n => nameOf(n) === 'limit')
}

// A kept reading is calm (no fresh figure colours the card), so the pane draws it at Short (loud.ts shrinks a calm card): one row per limit, the age as the header note
test('an app reading 40 min old keeps its figures, every word dim, with its age as the header note', { timeoutMs: 120_000 }, async ($, on) => {
  const card = await mountCard($, on, m => m.set('cockpit:usage:app', { at: NOW - 40 * MIN, plan: 'Max', windows: windows(38) }), 288)
  expect(card).toBeDefined()
  const all = texts(card as Node)
  const said = all.map(x => x.s).join(' | ')
  expect(said).not.toContain('Nothing to show yet')
  // The fixed order (5 h, Week, a model's week), no plan name at Short, a weekly reset by its day
  expect(said).toMatch(/5 h \| 20% · \d\d:\d\d \| Week \| 38% · Thu \| Week · Fable \| 4% · Thu/)
  expect(said).not.toContain('Max')
  expect(said).toMatch(/\b40 min\b/)
  for (const x of all.filter(t => /%/.test(t.s))) expect(x.dim, x.s).toBe(true)
})

test('status figures 25 min old keep their figures too', { timeoutMs: 120_000 }, async ($, on) => {
  const old = await mountCard($, on, m => m.set('cockpit:session:test-session', { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'idle', startedAt: NOW - HOUR, updatedAt: NOW - 25 * MIN, lastEventAt: NOW - 25 * MIN, stateSince: NOW - 25 * MIN, fiveHourPercent: 31, fiveHourResetsAt: R5 }), 288)
  const said = texts(old as Node).map(x => x.s).join(' | ')
  expect(said).not.toContain('Nothing to show yet')
  expect(said).toContain('31%')
  expect(said).toMatch(/\b25 min\b/)
})

test('nothing ever read in a new session says Not known yet', { timeoutMs: 120_000 }, async ($, on) => {
  const none = await mountCard($, on, m => m.set('cockpit:session:test-session', { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'idle', startedAt: NOW - 2 * MIN, updatedAt: NOW - MIN, lastEventAt: NOW - MIN, stateSince: NOW - MIN }), 288)
  // This look draws no Glance header, so the body says it whole (at the Glance look the header says "Not known yet" and the body only when it shows: polishopen.test.ts)
  expect(texts(none as Node).map(x => x.s).join(' | ')).toContain('Not known yet. It shows after the first answer in the chat.')
})

test('a session that answered for a while with no reading says the app shares none here', { timeoutMs: 120_000 }, async ($, on) => {
  const app = await mountCard($, on, m => m.set('cockpit:session:test-session', { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'idle', startedAt: NOW - 3 * HOUR, updatedAt: NOW - MIN, lastEventAt: NOW - MIN, stateSince: NOW - MIN }), 288)
  expect(texts(app as Node).map(x => x.s).join(' | ')).toContain('The app does not share plan limits here.')
})

test('a reading with no limit in it says one thing, not an age with no figures', { timeoutMs: 120_000 }, async ($, on) => {
  const junk = await mountCard($, on, m => m.set('cockpit:usage:app', { at: NOW - MIN, windows: [{ label: 'Current session', percent: 'x' }, { label: 5, percent: 40 }, { label: 'Week', percent: 140, resetsAt: 12 }] }), 288)
  const said = texts(junk as Node).map(x => x.s).join(' | ')
  expect(said).toContain('The last reading held no plan limits.')
  expect(said).not.toContain('Last read')
})

test('a tight week says the problem first and its share a day, no group titles, no subscription row, never a cut line', { timeoutMs: 120_000 }, async ($, on) => {
  const card = await mountCard($, on, m => {
    m.set('cockpit:usage:app', { at: NOW - 30_000, plan: 'Max', windows: windows(84) })
    m.set('cockpit:usage:hist', { 'Weekly · all models': [[NOW - 20 * HOUR, 70], [NOW - 6 * HOUR, 79], [NOW - HOUR, 83]] })
  }, 288)
  const said = texts(card as Node).map(x => x.s)
  const at = (re: RegExp) => said.findIndex(x => re.test(x))
  expect(at(/^Runs out /)).toBeGreaterThan(at(/^Week$/))
  expect(at(/^To last until it resets: about .*% a day \(estimate\)$/)).toBeGreaterThan(at(/^Runs out /))
  expect(said).not.toContain('Plan')
  expect(said).not.toContain('Under half used')
  expect(said).not.toContain('Subscription')
  expect(said.some(x => x.includes('…'))).toBe(false)
})

// The settings side of the card: the session and day amounts only while the budget warns or stops
for (const budget of ['off', 'warn']) {
  test(`the settings side with the budget ${budget}`, { timeoutMs: 120_000 }, async ($, on) => {
    mock.clock(on, { now: NOW })
    mock.env(on, { HOME })
    const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
    BASE_SEEDS(w.mem)
    w.mem.set('cockpit:setting:detail', 'glance')
    w.mem.set('cockpit:setting:cost.budget', budget)
    w.mem.set('cockpit:usage:app', { at: NOW - 30_000, plan: 'Max', windows: windows(38) })
    engine(on, w)
    forgetProjectSet()
    forgetContext()
    forgetStartCheck()
    delete checkShown.sig
    const ui = (await ($ as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(288) })) as Pane
    await ui.redraw()
    await ui.press({ key: 'press-glance-limit-0' })
    await ui.redraw()
    await ui.press({ key: 'btn-icon-limit-gear' })
    await ui.redraw()
    const card = find(await ui.drawn(), n => nameOf(n) === 'limit')
    await ui.unmount()
    const said = texts(card as Node).map(x => x.s)
    expect(said.some(x => /^(• )?Budget$/.test(x))).toBe(true)
    // The face counts lines: on a short front the session and day amounts (they go together) may sit behind "N more in Settings";
    // either way they are on the face or counted only while the budget warns or stops
    const more = String(find(card as Node, n => (n.key ?? n.props?.key) === 'face-settings-limit')?.props?.label ?? '')
    const counted = Number(/^(\d+) more/.exec(more)?.[1] ?? '0')
    const onFace = said.includes('Session budget') && said.includes('Day budget')
    expect(said.includes('Session budget')).toBe(said.includes('Day budget'))
    if (budget === 'off') expect(onFace).toBe(false)
    else expect(onFace || counted >= 2, `${more} | ${said.join(' / ')}`).toBe(true)
  })
}

// An open Plan limits card at Glance leaves out a headline that is only the used figure (one fact once): its dot is never alone by Fold.
// An open row is the title, the dot and Fold: the dot is always drawn and keeps its word as its spoken word ("Near the limit", or the headline of a calm one)
for (const [week, word] of [[38, /20%/], [84, /^Near the limit$/]] as const) {
  for (const wPt of [288, 420]) {
    test(`an open Plan limits Glance row at ${wPt} pt, week ${week}%: title, dot with its word, and Fold`, { timeoutMs: 120_000 }, async ($, on) => {
      mock.clock(on, { now: NOW })
      mock.env(on, { HOME })
      const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
      BASE_SEEDS(w.mem)
      w.mem.set('cockpit:setting:detail', 'glance')
      w.mem.set('cockpit:usage:app', { at: NOW - 30_000, plan: 'Max', windows: windows(week) })
      engine(on, w)
      forgetProjectSet()
      forgetContext()
      forgetStartCheck()
      delete checkShown.sig
      const ui = (await ($ as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(wPt) })) as Pane
      await ui.redraw()
      if (find(await ui.drawn(), n => nameOf(n) === 'limit-body') === undefined) await ui.press({ key: 'press-glance-limit-0' })
      await ui.redraw()
      const row = find(await ui.drawn(), n => nameOf(n) === 'glance-limit')
      await ui.unmount()
      expect(row).toBeDefined()
      const dots = walk(row as Node).filter(n => n.type === 'Svg' && n.props?.width === DOT && n.props?.height === DOT)
      // No words beside the dot: the body says the figures
      expect(texts(row as Node).map(x => x.s).filter(s => s !== 'Plan limits' && s !== 'Fold'), `${wPt} ${week}`).toEqual([])
      // A mark always has a word: the dot says it
      expect(dots).toHaveLength(1)
      expect(String(dots[0].props?.alt), `${wPt} ${week}`).toMatch(word)
    })
  }
}
