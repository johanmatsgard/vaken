// The press architecture: one box per part is both the drawn control and the press, a row's box includes its wash area.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { APPEARS } from '../hooks/core/cardrules'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { FIRST_CLICK_REPEAT_MS, hoverScope, isInside, clientKey as fcKey } from '../hooks/ui/firstclick'
import { CARD_HOVER_FILL, columnPt, HOVER_FILL, PRESS_FRAME_H, ROW_PT, switchHitW, VSTEP_PT } from '../hooks/ui/tokens'
import { wantRows } from './presssizes'
import { test } from './slow'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const MIN = 60_000

const props = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 120, offset: 0, total: 120 }, view: {} }

function engine(on: On, mem: Map<string, unknown>) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
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
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('fs.write', () => ({ value: undefined }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return clock
}

const task = (n: number, text: string, over: Record<string, unknown>) => ({ n, text, role: 'builder', model: 'auto', folder: true, state: 'waiting', tries: 0, check: 'none', ...over })
const world = () =>
  new Map<string, unknown>(Object.entries({
    'cockpit:setting:look.view': 'custom',
    ...Object.fromEntries(Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show'])),
    'cockpit:firstrun': 'done',
    'cockpit:session:test-session': { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'waiting', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, contextPercent: 99, costUsd: 1.2 },
    'cockpit:session:other-1': { sessionId: 'other-1', cwd: '/work/other', model: 'claude-opus-5', state: 'working', startedAt: NOW - 30 * MIN, updatedAt: NOW - 1000, lastEventAt: NOW - 1000, stateSince: NOW - 4 * MIN, contextPercent: 40, costUsd: 0.4 },
    'cockpit:orch:test-session': {
      id: 'r1',
      name: 'Task run',
      status: 'running',
      createdAt: NOW - 20 * MIN,
      startedAt: NOW - 10 * MIN,
      choices: { atOnce: 3, check: '', reviewer: false, helperMin: 30, helperUsd: 2, runUsd: 10 },
      tasks: [task(1, 'Fix the header', { state: 'running', startedAt: NOW - 5 * MIN }), task(2, 'Write the docs', { state: 'failed', startedAt: NOW - 9 * MIN, endedAt: NOW - 8 * MIN, path: '/w/x', branch: 'b' })],
    },
  }))

type Node = { type?: string; key?: string; props?: Record<string, unknown>; hover?: Record<string, unknown>; children?: unknown[] }
type Ui = {
  drawn: () => Promise<unknown>
  find: (q: unknown) => Promise<Node | undefined>
  press: (q: unknown) => Promise<void>
  redraw: () => Promise<void>
  unmount: () => Promise<void>
  pointer: (e: unknown) => Promise<void>
}
const keyOf = (n: Node): unknown => n.key ?? n.props?.key
const hoverOf = (n: Node | undefined): unknown => n?.hover ?? n?.props?.hover
const hoverAt = async (ui: Ui, key: string): Promise<unknown> => hoverOf(walk((await ui.drawn()) as Node).find(n => keyOf(n) === key))
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
const near = (got: unknown, want: number, tol = 0.1): void => expect(Math.abs((got as number) - want) < tol, `${String(got)} is not near ${want}`).toBe(true)
const walk = (n: Node): Node[] => [n, ...kids(n).flatMap(walk)]
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => typeof c === 'object' && c !== null)
const INSET0 = { position: 'absolute', top: 0, left: 0, right: 0 }
const ROW = 1
const FRAME = PRESS_FRAME_H / ROW_PT

function anchored(part: Node | undefined, clientKey: string): Node {
  expect(part, `the part is drawn (${clientKey})`).toBeDefined()
  const anchor = kids(part as Node).find(c => keyOf(c) === `${clientKey}-box`)
  expect(anchor, `${clientKey}: its anchor is a direct child of the part`).toBeDefined()
  expect(anchor?.props).toMatchObject(INSET0)
  expect(anchor?.props?.bottom, `${clientKey}: the anchor's height is its Client's, not an inset`).toBeUndefined()
  const client = kids(anchor as Node).find(c => c.type === 'Client' && keyOf(c) === clientKey)
  expect(client).toBeDefined()
  // The Client names its height in whole rows, its part's box (the reach included) rounded out, and the anchor names the same.
  expect(client?.props?.height, `${clientKey}: rows declared`).toBe(wantRows(part as Node))
  expect(anchor?.props?.height).toBe(client?.props?.height)
  return anchor as Node
}

async function washedRow(ui: Ui, row: Node | undefined, key: string): Promise<void> {
  const p = (row as Node).props ?? {}
  expect(p.marginLeft).toBe(-1)
  expect(p.marginRight).toBe(-1)
  expect(p.paddingLeft).toBe(1)
  expect(p.paddingRight).toBe(1)
  expect(await hoverAt(ui, keyOf(row as Node) as string), 'the row\'s own Box paints the hover, in its press\'s group').toEqual({ scope: hoverScope(key), backgroundColor: HOVER_FILL })
  const client = walk(row as Node).find(c => c.type === 'Client' && (c.props?.props as { scope?: string } | undefined)?.scope === hoverScope(key))
  expect(client, 'the row\'s Client joins the row\'s hover group').toBeDefined()
}

async function mountHome($: unknown, on: On, mem: Map<string, unknown>) {
  engine(on, mem)
  forgetProjectSet()
  forgetStartCheck()
  delete checkShown.sig
  return (await ($ as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props })) as Ui
}

test('a Glance row and an OpenLine row are ONE box with their wash and their Client (inset 0), the box reaching the card\'s text edges', async ($, on) => {
  const ui = await mountHome($, on, world())
  // closed, the card presses as a whole: its Client is in the card's own Box, inset 0.
  const card = await ui.find({ key: 'agents' })
  anchored(card, fcKey('glance-agents'))
  expect(await hoverAt(ui, keyOf(card as Node) as string)).toEqual({ scope: hoverScope('glance-agents'), backgroundColor: CARD_HOVER_FILL })
  expect(await hoverAt(ui, 'glance-agents'), 'the closed card\'s row paints nothing of its own').toBeUndefined()
  await ui.press({ key: 'press-glance-agents-0' })
  await ui.redraw()
  const glance = await ui.find({ key: 'glance-agents' })
  await washedRow(ui, glance, 'glance-agents')
  anchored(glance, fcKey('glance-agents'))
  near(-num(glance?.props?.marginTop) * VSTEP_PT, 0, 0.1)
  const line = await ui.find({ key: 'ol-task:2' })
  await washedRow(ui, line, 'ol-task:2')
  anchored(line, fcKey('ol-task:2'))
  await ui.press({ key: 'press-glance-others-0' })
  await ui.press({ key: 'press-glance-computer-0' })
  await ui.redraw()
  const list = await ui.find({ key: 'o-other-1' })
  await washedRow(ui, list, 'o-other-1')
  anchored(list, fcKey('o-other-1'))
  const link = await ui.find({ key: 'linkrow-pointer-computer-open' })
  // (its word is the plain Button itself, so the left padding is the wash column less the Button's own inset)
  expect(link?.props?.marginLeft).toBe(-1)
  expect(link?.props?.marginRight).toBe(-1)
  near(num(link?.props?.minHeight) - num(link?.props?.paddingBottom) / 2, ROW)
  anchored(link, fcKey('pointer-computer-open'))
  await ui.unmount()
})

test('an icon is ONE box 44 pt wide and a list row high, placed by the layout (no column rounding); its Client is inset 0 in it', async ($, on) => {
  const ui = await mountHome($, on, world())
  await ui.press({ key: 'press-glance-agents-0' })
  await ui.redraw()
  const gear = await ui.find({ key: 'slot-icon-agents-gear' })
  near(gear?.props?.width, 44 / columnPt())
  near(gear?.props?.height, ROW)
  anchored(gear, fcKey('btn-icon-agents-gear'))
  for (const a of kids(gear as Node).filter(c => c.props?.position === 'absolute')) expect(a.props?.left).toBe(0)
  await ui.unmount()
})

test('a Pick segment, a jump word and Back are a framed press high, and their Client is inset 0 in the part box', async ($, on) => {
  const ui = await mountHome($, on, world())
  await ui.press({ key: 'settings' })
  await ui.redraw()
  await ui.press({ key: 'press-ol-section:Notices-0' })
  await ui.redraw()
  // A choice under its words is a Pick segment when it fits one line, else a radio row: either way one press row, its Client inset 0.
  const seg = (await ui.find({ key: 'fcw-notify.mode-off' })) ?? (await ui.find({ key: 'radio-notify.mode-off' }))
  near(seg?.props?.height, FRAME)
  anchored(seg, fcKey('notify.mode-off'))
  const jump = await ui.find({ key: 'linkrow-jump-settings-safety' })
  near(num(jump?.props?.minHeight) - num(jump?.props?.paddingBottom) / 2, ROW)
  anchored(jump, fcKey('jump-settings-safety'))
  const back = await ui.find({ key: 'settings-done-part' })
  near(back?.props?.height, FRAME)
  anchored(back, fcKey('settings-done'))
  await ui.unmount()
})

test('the switch row has the row Client AND a Client of its own over the switch (its 41.9 pt footprint, one press row), laid after the row\'s; together they flip once', async ($, on) => {
  const mem = world()
  const clock = engine(on, mem)
  forgetProjectSet()
  forgetStartCheck()
  delete checkShown.sig
  const ui = (await ($ as unknown as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props })) as Ui
  await ui.press({ key: 'settings' })
  await ui.redraw()
  await ui.press({ key: 'press-ol-section:Safety-0' })
  await ui.redraw()
  const row = await ui.find({ key: 'row-undo.mode' })
  await washedRow(ui, row, 'sw-undo.mode')
  anchored(row, fcKey('sw-undo.mode'))
  const hit = await ui.find({ key: 'swhit-undo.mode' })
  near(hit?.props?.width, switchHitW() / columnPt())
  near(hit?.props?.height, ROW)
  anchored(hit, fcKey('swk-undo.mode'))
  const order = kids(row as Node).map(c => keyOf(c))
  expect(order.indexOf('swhit-undo.mode')).toBeGreaterThan(order.indexOf(`${fcKey('sw-undo.mode')}-box`))
  expect(await ui.find({ key: 'press-sw-undo.mode-0' })).toBeUndefined()
  const key = 'cockpit:setting:undo.mode'
  const was = mem.get(key)
  const click = async (k: string) => {
    await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: k })
    await ui.pointer({ type: 'up', x: 1, y: 0, button: 'left', in: k })
    await ui.redraw()
  }
  await click(fcKey('swk-undo.mode'))
  expect(mem.get(key), 'the switch\'s own Client flips').not.toBe(was)
  const once = mem.get(key)
  await click(fcKey('sw-undo.mode'))
  expect(mem.get(key), 'a second Client for the same press flips nothing').toBe(once)
  // flipOnce reads the real clock (Date.now), the Client's repeat guard the engine's: move both past the window.
  await clock.advance(FIRST_CLICK_REPEAT_MS + 100)
  for (const until = Date.now() + FIRST_CLICK_REPEAT_MS + 100; Date.now() < until; ) continue
  await click(fcKey('sw-undo.mode'))
  expect(mem.get(key), 'later, the row\'s Client flips it back').not.toBe(once)
  await ui.unmount()
})

test('the Agents run controls and a task\'s actions press on the first click, each in a lone-word sized wrapper with an fc- Client', async ($, on) => {
  const ui = await mountHome($, on, world())
  await ui.press({ key: 'press-glance-agents-0' })
  await ui.redraw()
  for (const k of ['run-pause', 'run-stop']) {
    const part = await ui.find({ key: `fcw-${k}` })
    near(part?.props?.height, FRAME)
    // Two controls side by side: each is its own footprint, at least 44 pt wide, so the presses never overlap.
    expect(num(part?.props?.minWidth) * 7.9, `${k} is at least the footprint`).toBeGreaterThanOrEqual(44 - 0.1)
    anchored(part, fcKey(k))
    expect(kids(part as Node).some(c => c.type === 'Button' && keyOf(c) === k), `${k}: the Button stays for the keyboard`).toBe(true)
  }
  await ui.unmount()
})

test('a click paints nothing (no press Client paints, tests/pressflood.test.ts); the inside test is inclusive at the far edge', () => {
  expect(isInside(0, 0, 10, 3)).toBe(true)
  expect(isInside(10, 3, 10, 3), 'the last column and the last row are inside').toBe(true)
  expect(isInside(11, 0, 10, 3)).toBe(false)
  expect(isInside(0, 4, 10, 3)).toBe(false)
  expect(isInside(-1, 0, 10, 3)).toBe(false)
  expect(isInside(5, 5, 0, 0), 'not laid out yet: unbounded').toBe(true)
})

test('a shut Settings section presses as a whole, its about line lights the card, and the open one gives the press back to its header', async ($, on) => {
  const ui = await mountHome($, on, world())
  await ui.press({ key: 'settings' })
  await ui.redraw()
  const card = await ui.find({ key: 'settings-notices' })
  anchored(card, fcKey('hdr-settings-notices'))
  expect(await hoverAt(ui, keyOf(card as Node) as string)).toEqual({ scope: hoverScope('hdr-settings-notices'), backgroundColor: CARD_HOVER_FILL })
  const about = await ui.find({ key: 'ol-section:Notices' })
  expect(await hoverAt(ui, 'ol-section:Notices'), 'the about line paints nothing of its own').toBeUndefined()
  expect(walk(about as Node).some(c => c.type === 'Client' && (c.props?.props as { scope?: string } | undefined)?.scope === hoverScope('hdr-settings-notices')), 'its Client lights the card').toBe(true)
  await ui.press({ key: 'press-ol-section:Notices-0' })
  await ui.redraw()
  const open = await ui.find({ key: 'settings-notices' })
  expect(await hoverAt(ui, 'settings-notices'), 'open, the card does not light as a whole').toBeUndefined()
  expect(kids(open as Node).some(c => keyOf(c) === `${fcKey('hdr-settings-notices')}-box`), 'open, the card is not one press').toBe(false)
  await ui.unmount()
})

test('a card with two presses lights each on its own: the title and about line as one row group, the jump row alone; the card never as a whole', async ($, on) => {
  const ui = await mountHome($, on, world())
  await ui.press({ key: 'settings' })
  await ui.redraw()
  const cardKey = 'settings-agents-and-tasks'
  for (const state of ['shut', 'open'] as const) {
    expect(await hoverAt(ui, cardKey), `${state}: the card does not light as a whole`).toBeUndefined()
    const lead = await ui.find({ key: `${cardKey}-lead` })
    anchored(lead, fcKey(`hdr-${cardKey}`))
    expect(await hoverAt(ui, `${cardKey}-lead`), `${state}: the title and the about line light as one row, the row wash`).toEqual({ scope: hoverScope(`hdr-${cardKey}`), backgroundColor: HOVER_FILL })
    expect(walk(lead as Node).some(n => keyOf(n) === 'ol-section:Agents and tasks'), `${state}: the about line is inside the lead`).toBe(true)
    const jump = await ui.find({ key: `linkrow-jump-${cardKey}` })
    anchored(jump, fcKey(`jump-${cardKey}`))
    expect(walk(lead as Node).some(n => keyOf(n) === `linkrow-jump-${cardKey}`), `${state}: the jump row is not inside the lead`).toBe(false)
    if (state === 'shut') {
      await ui.press({ key: 'press-ol-section:Agents and tasks-0' })
      await ui.redraw()
    }
  }
  await ui.unmount()
})
