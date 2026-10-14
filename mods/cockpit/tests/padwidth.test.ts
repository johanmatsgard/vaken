// A padded pseudo-language: the pseudo-language "pad" gives every line as its English line made 40% longer and put in brackets.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { APPEARS } from '../hooks/core/cardrules'
import { BORDER_X_PT, COL_PT, ROW_PT, TEXT_CHAR_PT } from '../hooks/ui/tokens'
import { PAD_LANG, padded } from '../hooks/i18n/langs'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const MIN = 60_000
const NARROW_PT = 288
const CLOSE = 0.01
const HEIGHT_PT = 1400
const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
function fill(mem: Map<string, unknown>) {
  mem.clear()
  mem.set('cockpit:setting:look.view', 'custom')
  mem.set('cockpit:firstrun', 'done')
  for (const id of Object.keys(APPEARS)) mem.set(`cockpit:setting:cards.${id}`, 'show')
  mem.set('cockpit:session:test-session', rec('test-session', { cwd: '/work/app', contextPercent: 38, costUsd: 1.2, fiveHourPercent: 62, fiveHourResetsAt: '2026-10-11T18:00:00Z' }))
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
const propsAt = (wPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: wPt / COL_PT, placement: 'dock' as const, scroll: { bodyRows: Math.round(HEIGHT_PT / ROW_PT), offset: 0, total: 200 }, view: {} })

type Node = { type?: string; key?: string; text?: string; props?: Record<string, unknown>; children?: unknown[] }
type Pane = { drawn: () => Promise<Node>; redraw: (p?: unknown) => Promise<void>; press: (q: unknown) => Promise<void>; find: (q: unknown) => Promise<unknown>; unmount: () => Promise<void> }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const strings = (n: Node): string[] => (n.children ?? []).filter((c): c is string => typeof c === 'string')

const cutLabels = (root: Node): string[] =>
  walk(root)
    .filter(n => n.type === 'Button')
    .flatMap(n => [...(typeof n.props?.label === 'string' ? [n.props.label] : []), ...strings(n)])
    .filter(s => s.includes('…'))
// What the tree says about a width, as tests/statesweep.test.ts reads it: a part wider than the pane.
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
const nameOf = (x: Node): string => String(x.key ?? x.props?.key ?? '')
const pathTo = (t: Node, target: Node, path: Node[] = []): Node[] | undefined => {
  if (t === target) return path
  for (const c of kids(t)) {
    const r = pathTo(c, target, [...path, t])
    if (r) return r
  }
  return undefined
}
const widestPart = (n: Node): number => Math.max(0, ...walk(n).slice(1).map(x => (x.type === 'Svg' ? num(x.props?.width) : num(x.props?.width) * COL_PT)))
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
function widthProblems(root: Node, w: number): Array<[string, string]> {
  const out: Array<[string, string]> = []
  const room = w - 2 * BORDER_X_PT
  if (widestPart(root) > w + CLOSE) out.push(['wide', `something ${widestPart(root)} pt wide in a pane of ${w} pt`])
  for (const row of walk(root).filter(x => x.props?.flexDirection === 'row' && x.props?.flexWrap !== 'wrap' && nameOf(x) !== 'columns')) {
    if (widthOf(row) > w + CLOSE) out.push([`row ${nameOf(row) || 'unnamed'}`, `a row of controls "${nameOf(row) || 'unnamed'}" is ${Math.round(widthOf(row))} pt wide`])
  }
  for (const t of walk(root).filter(x => x.type === 'Text')) {
    if (String(t.props?.wrap ?? '').startsWith('truncate') || (pathTo(root, t) ?? []).some(a => /^w-|-open$/.test(nameOf(a)))) continue
    for (const x of strings(t)) for (const word of x.split(/\s+/)) if (word.length * TEXT_CHAR_PT > room) out.push([`word ${word.replace(/^\[/, '').slice(0, 12)}`, `the word "${word.slice(0, 30)}" (${word.length} letters) is wider than its card (${Math.round(room)} pt)`])
  }
  return out
}
const bracketed = (root: Node): number => walk(root).flatMap(n => [...(typeof n.props?.label === 'string' ? [n.props.label] : []), ...strings(n)]).filter(s => s.trim().startsWith('[')).length

let helpCommand: () => Promise<unknown> = async () => undefined
const done = (key: string) => (ui: Pane) => ui.press({ key })
const VIEWS: Record<string, { prep: (ui: Pane) => Promise<void>; leave: (ui: Pane) => Promise<void> }> = {
  board: { prep: async () => undefined, leave: async () => undefined },
  Settings: { prep: done('settings'), leave: done('settings-done') },
  Agents: {
    prep: async ui => {
      if ((await ui.find({ key: 'runner-open' })) === undefined) {
        await ui.press({ key: 'press-glance-agents-0' })
        await ui.redraw()
      }
      await ui.press({ key: 'runner-open' })
    },
    leave: done('runner-done'),
  },
  Help: { prep: async () => void (await helpCommand()), leave: done('help-done') },
}

type Rig = { mem: Map<string, unknown>; mount: (w: number) => Promise<Pane>; chooseEnglish: () => Promise<void> }
// The engine of the pane test: the clock, a home folder, the store and the system language "pad", set once per test.
async function rig($: Parameters<Parameters<typeof test>[2]>[0], on: On): Promise<Rig> {
  const mem = new Map<string, unknown>()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: PAD_LANG })
  engine(on, mem)
  helpCommand = () => $.command.run(viaParent('vaken-help', ''))
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  return {
    mem,
    mount: (w: number) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(w) }) as unknown as Promise<Pane>,
    chooseEnglish: async () => {
      await $.command.run({ ...viaParent('vaken-settings', 'look.language en'), origin: { kind: 'composer' } } as never)
    },
  }
}

type Found = { found: Array<[string, string]>; bracketed: number; buttons: number }
// Draws every view at `width` pt and collects what is too wide or cut, each as [key, said].
async function sweep({ mem, mount }: Rig, width = NARROW_PT): Promise<Found> {
  const out: Found = { found: [], bracketed: 0, buttons: 0 }
  for (const [name, view] of Object.entries(VIEWS)) {
    fill(mem)
    const first = await mount(1100)
    await view.prep(first)
    await first.unmount()
    const ui = await mount(width)
    await ui.redraw(propsAt(width))
    const root = await ui.drawn()
    out.buttons += walk(root).filter(x => x.type === 'Button').length
    out.bracketed += bracketed(root)
    for (const c of cutLabels(root)) out.found.push([`${name}: cut ${c.replace(/^\[/, '').slice(0, 12)}`, `${name}: a cut label "${c}"`])
    for (const [k, m] of widthProblems(root, width)) out.found.push([`${name}: ${k}`, `${name}: ${m}`])
    await ui.unmount()
    const leaving = await mount(1100)
    await view.leave(leaving)
    await leaving.unmount()
  }
  return out
}
const newProblems = (padded: Found, english: Found): string[] => {
  const had = new Set(english.found.map(([k]) => k))
  return [...new Set(padded.found.filter(([k]) => !had.has(k)).map(([k]) => k))].sort()
}
// The rows of controls the padded words widen past the 288 pt pane today (their English fits).
const KNOWN_WIDE: string[] = []

test('the cut-label detector finds a cut label and ignores a whole one', () => {
  const tree: Node = { type: 'Box', children: [{ type: 'Button', props: { label: 'Show 3 mo…' } }, { type: 'Button', props: { label: 'Show more' } }, { type: 'Text', children: ['a note…'] }] }
  expect(cutLabels(tree)).toEqual(['Show 3 mo…'])
})

test('the padding keeps fill-ins and makes a line 40% longer', () => {
  const p = padded('Show {n} more files')
  expect(p.startsWith('[Show {n} more files ')).toBe(true)
  expect(p.endsWith(']')).toBe(true)
  expect(p.length).toBeGreaterThanOrEqual(Math.ceil('Show {n} more files'.length * 1.4))
  expect(PAD_LANG).toBe('pad')
})

test('a language 40% longer than English breaks no label or row at 288 pt beyond the known ones', { timeoutMs: 90_000 }, async ($, on) => {
  const r = await rig($, on)
  const longer = await sweep(r)
  await r.chooseEnglish()
  const english = await sweep(r)
  expect(longer.bracketed - english.bracketed).toBeGreaterThan(50)
  expect(english.buttons).toBeGreaterThan(20)
  expect(longer.buttons).toBeGreaterThan(20)
  expect(newProblems(longer, english)).toEqual(KNOWN_WIDE)
})

test('the Help title row wraps at 288 pt in the longer language and its link keeps the right end of its line', { timeoutMs: 90_000 }, async ($, on) => {
  const r = await rig($, on)
  fill(r.mem)
  const first = await r.mount(1100)
  await VIEWS.Help.prep(first)
  await first.unmount()
  const ui = await r.mount(NARROW_PT)
  await ui.redraw(propsAt(NARROW_PT))
  const root = await ui.drawn()
  const head = walk(root).find(n => nameOf(n) === 'help-head')
  expect(head?.props?.flexWrap).toBe('wrap')
  // The parts side by side are wider than the pane, so the link really takes a line of its own.
  expect(widthOf({ ...head!, props: { ...head!.props, flexWrap: undefined } })).toBeGreaterThan(NARROW_PT)
  const holder = kids(head!).find(n => nameOf(n) === 'help-head-link')
  expect(holder?.props?.flexGrow).toBe(1)
  expect(holder?.props?.justifyContent).toBe('flex-end')
  expect(walk(holder!).some(n => nameOf(n) === 'link-help-settings')).toBe(true)
  await ui.unmount()
})

test('the same sweep fails when the pane is far too narrow for the padded words, so it can see a cut', { timeoutMs: 90_000 }, async ($, on) => {
  const r = await rig($, on)
  const longer = await sweep(r, 120)
  await r.chooseEnglish()
  const english = await sweep(r, 120)
  expect(newProblems(longer, english).length).toBeGreaterThan(KNOWN_WIDE.length)
})
