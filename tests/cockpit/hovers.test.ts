// Every press shows the hover wash.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { APPEARS } from '../hooks/core/cardrules'
import { forgetProjectSet } from '../hooks/core/io'
import { SECTION_TABLE } from '../hooks/core/settingsmap'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { hoverScope } from '../hooks/ui/firstclick'
import { CARD_FILL, CARD_FILL_SHARE, columnPt, HOVER_FILL, PRESS_WASH_OPACITY, ROW_PT } from '../hooks/ui/tokens'
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
  on('mcp.call', () => ({ value: { content: [{ type: 'text', text: 'not offered here' }], isError: true } }) as never)
  return clock
}

const task = (n: number, text: string, over: Record<string, unknown>) => ({ n, text, role: 'builder', model: 'auto', folder: true, state: 'waiting', tries: 0, check: 'none', ...over })
const world = (asking = false) =>
  new Map<string, unknown>(Object.entries({
    ...(asking ? { 'cockpit:session:asks-1': { sessionId: 'asks-1', cwd: '/work/lead', model: 'claude-opus-5', state: 'waiting', startedAt: NOW - 40 * MIN, updatedAt: NOW - 1000, lastEventAt: NOW - 1000, stateSince: NOW - 17 * MIN, contextPercent: 30, costUsd: 0.2, ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 17 * MIN } } } : {}),
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
type Ui = { drawn: () => Promise<unknown>; press: (q: unknown) => Promise<void>; redraw: (p?: unknown) => Promise<void>; unmount: () => Promise<void> }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => typeof c === 'object' && c !== null)
const keyOf = (n: Node): string => String(n.key ?? n.props?.key ?? '')
const hoverOf = (n: Node): Record<string, unknown> | undefined => (n.hover ?? n.props?.hover) as Record<string, unknown> | undefined
const lights = (h: Record<string, unknown> | undefined): boolean => h !== undefined && (h.backgroundColor !== undefined || h.display === 'flex')

// A press's own box is the keyed Box that holds its Client's anchor (`fc-…-box`) and its keyboard Button: it must light.
type Shape = { client: boolean; paintsOwnBox: boolean; clientInOwnGroup: boolean; anchorIsChild: boolean; litWithRow: boolean; hiddenReveal: boolean }
function pressShape(box: Node): Shape {
  const h = hoverOf(box)
  const anchor = kids(box).find(c => c.type === 'Box' && c.props?.position === 'absolute' && kids(c).some(k => k.type === 'Client'))
  const client = anchor === undefined ? findNode(box, n => n.type === 'Client') : kids(anchor).find(k => k.type === 'Client')
  const scope = client === undefined ? undefined : (client.props?.props as { scope?: string } | undefined)?.scope
  return {
    client: client !== undefined,
    paintsOwnBox: typeof h?.scope === 'string' && h.backgroundColor !== undefined,
    clientInOwnGroup: scope !== undefined && h?.scope === scope,
    anchorIsChild: anchor !== undefined,
    litWithRow: keyOf(box).startsWith('fcw-') && typeof h?.scope === 'string' && h.backgroundColor === undefined && h.scope !== hoverScope(keyOf(box).slice('fcw-'.length)),
    hiddenReveal: findNode(box, n => n !== box && n.type === 'Box' && n.props?.display === 'none' && hoverOf(n)?.display === 'flex') !== undefined,
  }
}
function hoverProblems(root: Node, at: string): string[] {
  const problems: string[] = []
  const lit = new Set<string>()
  const walk = (n: Node, up: Node[]): void => {
    const h = hoverOf(n)
    if (n.type === 'Box' && lights(h) && typeof h?.scope === 'string') lit.add(h.scope)
    for (const c of kids(n)) walk(c, [...up, n])
  }
  walk(root, [])
  const check = (n: Node, up: Node[]): void => {
    if (n.type === 'Client' && String(n.props?.module ?? '').includes('press')) {
      const scope = (n.props?.props as { scope?: string } | undefined)?.scope
      const ok = scope !== undefined ? lit.has(scope) : up.some(a => a.type === 'Box' && keyOf(a) !== '' && lights(hoverOf(a)))
      if (!ok) problems.push(`${at}: the press ${keyOf(n)} lights nothing under the pointer`)
      const own = up.length >= 2 ? up[up.length - 2] : undefined
      const hasButton = own !== undefined && kids(own).some(c => c.type === 'Button')
      if (scope !== undefined && own !== undefined && hasButton && hoverOf(own)?.scope !== scope && !up.some(a => a.type === 'Box' && hoverOf(a)?.scope === scope)) {
        problems.push(`${at}: the press ${keyOf(n)} lights only through its Client (its box ${keyOf(own)} is not in its hover group)`)
      }
    }
    // A framed press of its own (a footer word, a commit button, a header word, an option of a Pick) lights by its own Box.
    if (n.type === 'Box' && keyOf(n).startsWith('fcw-')) {
      const shape = pressShape(n)
      if (shape.client && !shape.litWithRow && (!shape.paintsOwnBox || !shape.clientInOwnGroup)) problems.push(`${at}: the framed press ${keyOf(n)} does not light by its own box`)
      if (shape.hiddenReveal) problems.push(`${at}: the framed press ${keyOf(n)} relies on a picture hidden at rest`)
      if (shape.paintsOwnBox) problems.push(...maskProblems(n, up, at))
    }
    if (n.type === 'Svg' && String(n.props?.source ?? '').includes('rx=') && String(n.props?.alt ?? '') === '' && up.some(a => keyOf(a).startsWith('fcw-'))) problems.push(`${at}: a frame picture in ${keyOf(up.find(a => keyOf(a).startsWith('fcw-')) as Node)} has no name`)
    for (const c of kids(n)) check(c, [...up, n])
  }
  check(root, [])
  return problems
}

// Corner masks make the square fill read rounded, so each must match what lies behind its press: ground, card, track
const GROUND_LAYER = 'class="mg" fill-rule="evenodd"'
const CARD_LAYER = `fill-opacity="${CARD_FILL_SHARE}" fill-rule="evenodd"`
const TRACK_LAYER = `fill-opacity="${PRESS_WASH_OPACITY}" fill-rule="evenodd"`
const near = (a: unknown, b: number): boolean => typeof a === 'number' && Math.abs(a - b) < 0.1
function maskOf(box: Node): Node | undefined {
  for (const c of kids(box)) if (c.type === 'Box' && c.props?.position === 'absolute' && c.props?.display !== 'none') for (const k of kids(c)) if (k.type === 'Svg' && String(k.props?.source ?? '').includes(GROUND_LAYER)) return k
  return undefined
}
function maskProblems(box: Node, up: Node[], at: string): string[] {
  const name = `${at}: the framed press ${keyOf(box)}`
  const mask = maskOf(box)
  if (mask === undefined) return [`${name} has no corner masks`]
  const out: string[] = []
  const src = String(mask.props?.source ?? '')
  if (String(mask.props?.alt ?? '') === '') out.push(`${name}: its corner masks have no name`)
  const wPt = Number(box.props?.width) * columnPt()
  const hPt = Number(box.props?.height) * ROW_PT
  if (!near(mask.props?.width, wPt) || !near(mask.props?.height, hPt)) out.push(`${name}: its masks are ${String(mask.props?.width)} by ${String(mask.props?.height)} pt, its box ${wPt.toFixed(2)} by ${hPt.toFixed(2)}`)
  const onCard = up.some(a => a.type === 'Box' && a.props?.backgroundColor === CARD_FILL)
  if (src.includes(CARD_LAYER) !== onCard) out.push(`${name}: its masks ${onCard ? 'miss' : 'add'} the card's grey (it sits on ${onCard ? 'a card' : 'the ground'})`)
  const row = up[up.length - 1]
  const inPick = row !== undefined && kids(row).some(c => c.type === 'Box' && c.props?.position === 'absolute' && kids(c).some(k => k.type === 'Svg')) && kids(row).every(c => (c.type === 'Box' && c.props?.position === 'absolute') || keyOf(c).startsWith('fcw-'))
  if (src.includes(TRACK_LAYER) !== inPick) out.push(`${name}: its masks ${inPick ? 'miss' : 'add'} the track's grey`)
  return out
}

async function mount($: unknown, on: On, component: 'Pane' | 'AbovePrompt', p: unknown, asking = false): Promise<Ui> {
  engine(on, world(asking))
  if (component === 'AbovePrompt') on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  forgetProjectSet()
  forgetStartCheck()
  delete checkShown.sig
  return (await ($ as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component, ...(component === 'Pane' ? { requestId: 'cockpit-home' } : {}), props: p })) as Ui
}

test('every press on Home (cards open) shows a hover wash, and a framed press is rounded and named', async ($, on) => {
  const ui = await mount($, on, 'Pane', props)
  for (const id of ['agents', 'others', 'here', 'limit', 'context']) {
    try {
      await ui.press({ key: `press-glance-${id}-0` })
      await ui.redraw()
    } catch {
    }
  }
  const problems: string[] = []
  for (const cols of [38, 50, 76]) {
    await ui.redraw({ ...props, bodyColumns: cols })
    problems.push(...hoverProblems((await ui.drawn()) as Node, `Home at ${cols} columns`))
  }
  expect(problems).toEqual([])
  await ui.unmount()
})

test('every press in Settings (every section open) shows a hover wash, and a framed press is rounded and named', async ($, on) => {
  const ui = await mount($, on, 'Pane', { ...props, bodyColumns: 76 })
  await ui.press({ key: 'settings' })
  await ui.redraw()
  for (const k of [...SECTION_TABLE.map(s => `press-ol-section:${s.name}-0`), 'press-ol-section:Advanced-0']) {
    await ui.press({ key: k })
    await ui.redraw()
  }
  const problems: string[] = []
  for (const cols of [38, 50, 76]) {
    await ui.redraw({ ...props, bodyColumns: cols })
    problems.push(...hoverProblems((await ui.drawn()) as Node, `Settings at ${cols} columns`))
  }
  expect(problems).toEqual([])
  await ui.unmount()
})

test('every press on the band shows a hover wash', async ($, on) => {
  const ui = await mount($, on, 'AbovePrompt', { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} })
  expect(hoverProblems((await ui.drawn()) as Node, 'band')).toEqual([])
  await ui.unmount()
})

const findNode = (n: Node, pred: (x: Node) => boolean): Node | undefined => (pred(n) ? n : kids(n).map(c => findNode(c, pred)).find(x => x !== undefined))
const keyed = (root: Node, key: string): Node | undefined => findNode(root, n => keyOf(n) === key)
const clientScope = (n: Node): string | undefined => (n.props?.props as { scope?: string } | undefined)?.scope

test('the footer (Open in new window, Help, Settings) lights on hover exactly as a proven row does: its own box paints in the group its Client joins, no hidden picture', async ($, on) => {
  const ui = await mount($, on, 'Pane', props)
  for (const cols of [38, 50, 76]) {
    await ui.redraw({ ...props, bodyColumns: cols })
    const root = (await ui.drawn()) as Node
    for (const k of ['popout', 'help', 'settings']) {
      const box = keyed(root, `fcw-${k}`)
      expect(box === undefined ? `${k} missing at ${cols}` : `${k} at ${cols}`).toBe(`${k} at ${cols}`)
      expect(pressShape(box as Node), `${k} at ${cols}`).toEqual({ client: true, paintsOwnBox: true, clientInOwnGroup: true, anchorIsChild: true, litWithRow: false, hiddenReveal: false })
      // The rounded frame is still drawn at rest (with its corner masks, one picture each), and the lit fill is the row wash.
      expect(hoverOf(box as Node)?.backgroundColor).toBe(HOVER_FILL)
    }
    expect(hoverProblems(root, `Home at ${cols} columns`)).toEqual([])
  }
  await ui.press({ key: 'settings' })
  await ui.redraw()
  const set = (await ui.drawn()) as Node
  const row = findNode(set, n => n.type === 'Box' && keyOf(n).startsWith('linkrow-'))
  expect(row).toBeDefined()
  expect(pressShape(row as Node)).toEqual({ client: true, paintsOwnBox: true, clientInOwnGroup: true, anchorIsChild: true, litWithRow: false, hiddenReveal: false })
  expect(hoverOf(row as Node)?.backgroundColor).toBe(HOVER_FILL)
  await ui.unmount()
})

test('the hover of a framed press is rounded: its corner masks are drawn always, named, the size of its box, in the colour of what lies behind it', async ($, on) => {
  const ui = await mount($, on, 'Pane', props)
  for (const id of ['agents', 'others', 'here']) {
    try {
      await ui.press({ key: `press-glance-${id}-0` })
      await ui.redraw()
    } catch {
      // a card the view leaves out
    }
  }
  for (const cols of [38, 76]) {
    await ui.redraw({ ...props, bodyColumns: cols })
    const root = (await ui.drawn()) as Node
    // The footer sits on the pane's ground: the ground only.
    for (const k of ['popout', 'help', 'settings']) {
      const src = String(maskOf(keyed(root, `fcw-${k}`) as Node)?.props?.source ?? '')
      expect([k, src.includes(GROUND_LAYER), src.includes(CARD_LAYER), src.includes(TRACK_LAYER)]).toEqual([k, true, false, false])
    }
    // Every framed press that paints its own box on Home has its masks (hoverProblems), and on a card at least one commit button and one Pick option say so.
    const presses: Node[] = []
    const walk = (n: Node): void => {
      if (n.type === 'Box' && keyOf(n).startsWith('fcw-') && pressShape(n).paintsOwnBox) presses.push(n)
      for (const c of kids(n)) walk(c)
    }
    walk(root)
    const sources = presses.map(n => String(maskOf(n)?.props?.source ?? ''))
    expect(sources.some(s => s.includes(CARD_LAYER) && !s.includes(TRACK_LAYER)), `a press on a card at ${cols}`).toBe(true)
    expect(sources.some(s => s.includes(CARD_LAYER) && s.includes(TRACK_LAYER)), `a Pick option on a card at ${cols}`).toBe(true)
    expect(hoverProblems(root, `Home at ${cols} columns`)).toEqual([])
  }
  // Help's header link sits on the ground, beside the view's title.
  await ui.press({ key: 'help' })
  await ui.redraw()
  const help = (await ui.drawn()) as Node
  const link = String(maskOf(keyed(help, 'fcw-help-settings') as Node)?.props?.source ?? '')
  expect([link.includes(GROUND_LAYER), link.includes(CARD_LAYER)]).toEqual([true, false])
  await ui.unmount()
})

test('Needs you with an item: the title row is a press that lights on its own, the item row lights on its own, and the folded card lights as a whole', async ($, on) => {
  const ui = await mount($, on, 'Pane', props, true)
  const open = (await ui.drawn()) as Node
  const card = keyed(open, 'needs') as Node
  expect(card).toBeDefined()
  expect(hoverOf(card)?.backgroundColor).toBeUndefined()
  const title = keyed(card, 'glance-needs') as Node
  expect(hoverOf(title)?.backgroundColor).toBeDefined()
  const titleScope = String(hoverOf(title)?.scope ?? '')
  expect(findNode(title, n => n.type === 'Client' && clientScope(n) === titleScope)).toBeDefined()
  const itemScopes = new Set<string>()
  const walk = (n: Node): void => {
    if (n.type === 'Box' && typeof hoverOf(n)?.scope === 'string' && hoverOf(n)?.backgroundColor !== undefined) itemScopes.add(String(hoverOf(n)?.scope))
    for (const c of kids(n)) if (c !== title) walk(c)
  }
  walk(card)
  itemScopes.delete(titleScope)
  expect(itemScopes.size).toBeGreaterThan(0)
  expect(hoverProblems(open, 'Needs you open')).toEqual([])
  await ui.press({ key: 'press-glance-needs-0' })
  await ui.redraw()
  const shut = (await ui.drawn()) as Node
  expect(hoverOf(keyed(shut, 'needs') as Node)?.backgroundColor).toBeDefined()
  expect(hoverProblems(shut, 'Needs you folded')).toEqual([])
  await ui.press({ key: 'press-glance-needs-0' })
  await ui.redraw()
  expect(hoverOf(keyed((await ui.drawn()) as Node, 'needs') as Node)?.backgroundColor).toBeUndefined()
  await ui.unmount()
})

test('every press in Help shows a hover wash and lights through its own box', async ($, on) => {
  const ui = await mount($, on, 'Pane', { ...props, bodyColumns: 76 })
  await ui.press({ key: 'help' })
  await ui.redraw()
  const problems: string[] = []
  expect(keyed((await ui.drawn()) as Node, 'fcw-help')).toBeUndefined()
  for (const cols of [38, 50, 76]) {
    await ui.redraw({ ...props, bodyColumns: cols })
    problems.push(...hoverProblems((await ui.drawn()) as Node, `Help at ${cols} columns`))
  }
  expect(problems).toEqual([])
  await ui.unmount()
})

test('every press in the Agents view shows a hover wash and lights through its own box', async ($, on) => {
  const problems: string[] = []
  const home = await mount($, on, 'Pane', { ...props, bodyColumns: 76 })
  await home.press({ key: 'press-glance-agents-0' })
  await home.redraw()
  await home.press({ key: 'runner-open' })
  await home.redraw()
  expect(keyed((await home.drawn()) as Node, 'fcw-settings')).toBeUndefined()
  for (const cols of [38, 50, 76]) {
    await home.redraw({ ...props, bodyColumns: cols })
    problems.push(...hoverProblems((await home.drawn()) as Node, `Agents view at ${cols} columns`))
  }
  expect(problems).toEqual([])
  await home.unmount()
})
