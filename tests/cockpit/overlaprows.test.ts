// The calm sentence rows (cards/overlap.tsx) and the Other sessions header: a file name never overflows, a path breaks only at "/",
// waiting agents read as sentences and behave as one, and a sole count is never dropped at any card width.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { fitName, pathLine } from '../hooks/features/home/cards/overlap'
import { TEXT_CHAR_PT } from '../hooks/ui/tokens'
import { BASE_SEEDS, HOME, MIN, NOW, ROOT, SETUP_BASE, engine, kids, nameOf, propsAt, rec, textsOf } from './statefixtures'
import type { Mem, Node, Pane, World } from './statefixtures'

const LONG_FILE = 'AVeryLongComponentFileNameThatGoesOnAndOn.tsx'
const LONG_PATH = `src/components/settings/${LONG_FILE}`

test('a path breaks only after "/", each part whole; a name wider than a whole line is cut at its end, never inside', () => {
  expect(pathLine(LONG_PATH, 400)).toBe(`src/​components/​settings/​${LONG_FILE}`)
  expect(fitName('short.ts', 100)).toBe('short.ts')
  const cut = fitName(LONG_FILE, 200)
  expect(cut.endsWith('…')).toBe(true)
  expect(cut.length * TEXT_CHAR_PT).toBeLessThanOrEqual(200)
  expect(LONG_FILE.startsWith(cut.slice(0, -1))).toBe(true)
})

const find = (n: Node, pred: (x: Node) => boolean): Node | undefined => (pred(n) ? n : kids(n).map(c => find(c, pred)).find(x => x !== undefined))
const card = (root: Node, id: string): Node | undefined => find(root, n => nameOf(n) === id && n.props?.borderStyle === 'round') ?? find(root, n => nameOf(n) === id)
const textNodes = (n: Node): Node[] => (n.type === 'Text' ? [n] : kids(n).flatMap(textNodes))

type Mount = { w: World; idle?: boolean; edit?: string; widthPt: number }
const mount = async ($: unknown, on: Parameters<Parameters<typeof test>[2]>[1], m: Mount): Promise<Pane> => {
  const clock = mock.clock(on, { now: m.idle === true ? NOW - 12 * MIN : NOW })
  mock.env(on, { HOME })
  engine(on, m.w)
  on('classic.TeammateIdle', () => ({}) as never)
  const $$ = $ as { classic: { TeammateIdle: (e: unknown) => Promise<unknown> }; tool: { call: (e: unknown) => Promise<unknown> }; ui: { mount: (a: unknown) => Promise<unknown> } }
  const base = { session_id: 'test-session', transcript_path: '', cwd: ROOT, hook_event_name: 'TeammateIdle' }
  if (m.idle === true) {
    await $$.classic.TeammateIdle({ ...base, teammate_name: 'reviewer', agent_id: 'ag1' })
    await clock.advance(5 * MIN)
    await $$.classic.TeammateIdle({ ...base, teammate_name: 'the builder of the new settings page header', agent_id: 'ag2' })
    await clock.advance(7 * MIN)
  }
  if (m.edit !== undefined) await $$.tool.call({ tool: 'Edit', file_path: `${ROOT}/${m.edit}`, old_string: 'a', new_string: 'b' })
  forgetProjectSet()
  forgetContext()
  forgetStartCheck()
  delete checkShown.sig
  const ui = (await $$.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(m.widthPt) })) as Pane
  await ui.redraw()
  return ui
}
const world = (seed: (m: Mem) => void): World => {
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:setting:detail', 'explained')
  seed(w.mem)
  return w
}

test('same file, a name wider than the line at 288 pt: the sentence says "A file", the name is on its own dim line, the opened path is whole', { timeoutMs: 60_000 }, async ($, on) => {
  const w = world(m => {
    m.set('cockpit:session:s1', rec('s1', { cwd: ROOT, state: 'working', title: 'Release notes', updatedAt: NOW - 2000 }))
    m.set('cockpit:claims:s1', { repo: '/work/app/.git', root: ROOT, items: [{ path: LONG_PATH, at: NOW - 3 * MIN }] })
  })
  const ui = await mount($, on, { w, edit: LONG_PATH, widthPt: 288 })
  const c0 = card(await ui.drawn(), 'others')
  expect(c0).toBeDefined()
  const texts = textsOf(c0 as Node)
  expect(texts).toContain('A file changed here and in Release notes')
  const dim = textNodes(c0 as Node).filter(t => t.props?.dimColor === true).flatMap(t => textsOf(t))
  expect(dim.some(t => t.endsWith('…') && LONG_FILE.startsWith(t.slice(0, -1)))).toBe(true)
  // Opened: the whole path, breaking only after "/"
  const hit = find(c0 as Node, n => nameOf(n).startsWith('press-ol-overlap'))
  expect(hit).toBeDefined()
  await ui.press({ key: nameOf(hit as Node) })
  await ui.redraw(propsAt(440))
  const open = textsOf(card(await ui.drawn(), 'others') as Node)
  expect(open).toContain(`File: src/​components/​settings/​${LONG_FILE}`)
  expect(open).toContain(`${LONG_FILE} changed here and in Release notes`)
  await ui.unmount()
})

test('waiting agents: each row is a sentence that starts with a capital, and both rows keep the press word in the same place', { timeoutMs: 60_000 }, async ($, on) => {
  const ui = await mount($, on, { w: world(() => {}), idle: true, widthPt: 440 })
  for (const wPt of [288, 420, 440]) {
    await ui.redraw(propsAt(wPt))
    const c0 = card(await ui.drawn(), 'agents') as Node
    const texts = textsOf(c0)
    expect(texts).toContain('The agent reviewer has waited 12 min for a message')
    expect(texts).toContain('The agent the builder of the new settings page header has waited 7 min for a message')
    // The word is either beside both sentences (a row value) or under both (a dim line): never one of each
    const dimWords = textNodes(c0).filter(t => t.props?.dimColor === true && textsOf(t).includes('Nudge · asks Claude')).length
    expect([0, 2], `${wPt} pt`).toContain(dimWords)
  }
  await ui.unmount()
})

test('Other sessions with one idle session: "1 idle" is in the header at 288, 420 and 440 pt', { timeoutMs: 60_000 }, async ($, on) => {
  const w = world(m => m.set('cockpit:session:s4', rec('s4', { cwd: ROOT, state: 'working', lastEventAt: NOW - 25 * MIN, stateSince: NOW - 40 * MIN, title: 'Quiet one' })))
  const ui = await mount($, on, { w, widthPt: 288 })
  for (const wPt of [288, 420, 440]) {
    await ui.redraw(propsAt(wPt))
    expect(textsOf(card(await ui.drawn(), 'others') as Node), `${wPt} pt`).toContain('1 idle')
  }
  await ui.unmount()
})
