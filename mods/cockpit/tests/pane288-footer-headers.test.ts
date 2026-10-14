// Findings from a 288 pt pane.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'

import { BUNDLE_TTL_MS } from '../hooks/core/io'
import { HOST_NOTE_KEY, noteHostView, parseHostNote, warnReading } from '../hooks/core/guardhost'
import { headerWraps, nameTabLabel } from '../hooks/ui/kit'
import { BORDER_X_PT, COL_PT, ROW_PT } from '../hooks/ui/tokens'

const NOW = Date.parse('2026-10-12T12:00:00Z')
const MIN = 60_000
const PANE_PT = 288
const CLOSE = 0.5

const rec = (id: string, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
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
function fill(mem: Map<string, unknown>) {
  mem.clear()
  mem.set('cockpit:setting:look.view', 'custom')
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:setting:detail', 'explained')
  mem.set('cockpit:setting:cards.guard', 'show')
  mem.set('cockpit:session:test-session', rec('test-session', { cwd: '/work/app', contextPercent: 38 }))
  for (let n = 1; n <= 3; n += 1) mem.set(`cockpit:session:s${n}`, rec(`s${n}`))
}
const propsAt = (wPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: wPt / COL_PT, placement: 'dock' as const, scroll: { bodyRows: Math.round(1400 / ROW_PT), offset: 0, total: 200 }, view: {} })

type Node = { type?: string; key?: string; text?: string; props?: Record<string, unknown>; children?: unknown[] }
type Pane = { drawn: () => Promise<Node>; redraw: (p?: unknown) => Promise<void>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const keyOf = (n: Node): string | undefined => n.key ?? (n.props?.key as string | undefined)
const texts = (n: Node): string[] => walk(n).flatMap(x => [...(x.children ?? []).filter((c): c is string => typeof c === 'string'), ...(typeof x.props?.label === 'string' ? [x.props.label] : [])])
// The width a part asks for in one line, in points: a picture's width, a Button's label and a Text in whole columns.
const wide = (n: Node): number => {
  if (n.type === 'Svg') return Number(n.props?.width ?? 0)
  if (n.type === 'Client') return 0
  if (n.type === 'Button') return String(n.props?.label ?? '').length * COL_PT
  const own = typeof n.props?.width === 'number' ? (n.props.width as number) * COL_PT : 0
  const text = (n.children ?? []).filter((c): c is string => typeof c === 'string').join('').length * COL_PT
  const parts = kids(n).map(wide).filter(w => w > 0)
  const gap = (typeof n.props?.columnGap === 'number' ? (n.props.columnGap as number) * COL_PT : 0) * Math.max(0, parts.length - 1)
  const inner = n.props?.flexDirection === 'row' ? (n.props?.flexWrap === 'wrap' ? Math.max(0, ...parts) : parts.reduce((a, b) => a + b, 0) + gap) : Math.max(0, ...parts)
  return Math.max(own, text, inner)
}

test('LV8: at 288 pt the footer goes in even right-aligned lines, no word alone on a line, and no word in it is cut', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom']])
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  fill(mem)
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(PANE_PT) })) as unknown as Pane
  const root = await ui.drawn()
  const footer = walk(root).find(x => keyOf(x) === 'footer')
  expect(footer).toBeDefined()
  // The four actions in one line would be wider than the pane: they go in even lines (two and two), each line at the right.
  const lines = walk(footer as Node).filter(x => /^footer-line-\d+$/.test(keyOf(x) ?? ''))
  expect(lines.length).toBe(2)
  const counts = lines.map(l => kids(l).filter(k => k.props?.position !== 'absolute' && wide(k) > 0).length)
  expect(counts).toEqual([2, 2])
  for (const l of lines) {
    expect(l.props?.justifyContent).toBe('flex-end')
    expect(wide(l)).toBeLessThanOrEqual(PANE_PT + CLOSE)
  }
  const words = texts(footer as Node).join(' ')
  for (const w of ['Arrange cards', 'New window', 'Help', 'Settings']) expect(words).toContain(w)
  await ui.unmount()
})

test('LV9: at 288 pt every Settings section header fits its pane: the title and the chip on one row (the chip takes a shorter form), a chip never cut', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom']])
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  fill(mem)
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(PANE_PT) })) as unknown as Pane
  await ui.press({ key: 'settings' })
  await ui.redraw(propsAt(PANE_PT))
  const root = await ui.drawn()
  const cards = walk(root).filter(x => /^settings-(notices|money-and-plan|agents|safety|look-and-cards|cards-and-look|prompts-and-memory|health|advanced)$/.test(keyOf(x) ?? ''))
  expect(cards.length).toBeGreaterThanOrEqual(5)
  let withChip = 0
  let split = 0
  for (const card of cards) {
    const parts = kids(card)
    const head = (walk(card).find(x => keyOf(x) === `${keyOf(card)}-head`) ?? parts[0]) as Node
    const line = walk(card).find(p => keyOf(p)?.endsWith('-controls-line'))
    expect(wide(head)).toBeLessThanOrEqual(PANE_PT - 2 * BORDER_X_PT + CLOSE)
    if (line !== undefined) {
      split += 1
      expect(line.props?.flexWrap).toBe('wrap')
      for (const p of kids(line)) expect(wide(p)).toBeLessThanOrEqual(PANE_PT - 2 * BORDER_X_PT + CLOSE)
    }
    const chip = walk(card).find(x => keyOf(x)?.startsWith('count-settings-'))
    if (chip !== undefined) {
      withChip += 1
      expect(wide(chip)).toBeLessThanOrEqual(PANE_PT - 2 * BORDER_X_PT)
    }
  }
  expect(withChip).toBeGreaterThanOrEqual(5)
  // The link is a row of the body now and the chip shortens to fit: no header needs a second line at 288 pt.
  expect(split).toBe(0)
  await ui.unmount()
})

test('LV9: the header rule, from the real strings, and the project tab', () => {
  const inner = PANE_PT - 2 * BORDER_X_PT
  const chip = 22
  const chipPt = Math.round(chip * 6.2 + 12)
  const jumpPt = (label: string) => (label.length + 2) * COL_PT
  expect(headerWraps(inner, { title: 'Safety', fold: false, restPt: jumpPt('Open the Safety card ›') + 6 + chipPt + 6 })).toBe(true)
  expect(headerWraps(900, { title: 'Safety', fold: false, restPt: jumpPt('Open the Safety card ›') + 6 + chipPt + 6 })).toBe(false)
  const name = 'my-website-app-with-a-very-long-name'
  const cut = nameTabLabel(400, ['All projects'], 'This project', name)
  expect(cut.startsWith('This project: ')).toBe(true)
  expect(cut.endsWith('…')).toBe(true)
  expect(cut.length).toBeLessThan(`This project: ${name}`.length)
  expect(nameTabLabel(2000, ['All projects'], 'This project', name)).toBe(`This project: ${name}`)
  expect(nameTabLabel(120, ['All projects'], 'This project', name)).toBe('This project')
})

test('LV10: the Guard says what really happens: worst stop where nothing asks, all warn where Claude Code asks or the person chose, careful words while unknown', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom']])
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  const ruleWord = async (): Promise<string> => {
    const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(900) })) as unknown as Pane
    await ui.redraw(propsAt(900))
    const all = texts(await ui.drawn())
    await ui.unmount()
    return all.find(s => /^(all warn|worst stop|warn, worst may stop)$/i.test(s.trim())) ?? all.filter(s => /warn|worst/i.test(s)).join(' | ')
  }
  const keep = (key: string, value: unknown) => {
    mem.set(key, value)
    const bundle = key.startsWith('cockpit:setting:') ? 'cockpit:settings:v1' : 'cockpit:prefs:v1'
    const held = mem.get(bundle)
    if (typeof held === 'object' && held !== null) mem.set(bundle, { ...held, [key.startsWith('cockpit:setting:') ? key.slice('cockpit:setting:'.length) : key]: value })
  }
  const wait = () => clock.advance(BUNDLE_TTL_MS + 1)
  fill(mem)
  expect((await ruleWord()).toLowerCase()).toBe('warn, worst may stop')
  keep(HOST_NOTE_KEY, { sid: 'test-session', view: 'unasked' })
  await wait()
  expect((await ruleWord()).toLowerCase()).toBe('worst stop')
  keep(HOST_NOTE_KEY, { sid: 'test-session', view: 'asks' })
  await wait()
  expect((await ruleWord()).toLowerCase()).toBe('all warn')
  keep(HOST_NOTE_KEY, { sid: 'other', view: 'asks' })
  await wait()
  expect((await ruleWord()).toLowerCase()).toBe('warn, worst may stop')
  keep(HOST_NOTE_KEY, { sid: 'test-session', view: 'unasked' })
  keep('cockpit:setting:guard.destructive', 'warn')
  await wait()
  expect((await ruleWord()).toLowerCase()).toBe('all warn')
})

test('LV10: the pure parts: the reading, the note kept only on a change', async () => {
  expect(warnReading('unasked', false)).toBe('worst')
  expect(warnReading('asks', false)).toBe('warn')
  expect(warnReading('unknown', false)).toBe('maybe')
  expect(warnReading(undefined, false)).toBe('maybe')
  expect(warnReading('unasked', true)).toBe('warn')
  expect(parseHostNote({ sid: 'a', view: 'asks' })).toEqual({ sid: 'a', view: 'asks' })
  expect(parseHostNote({ sid: 'a', view: 'nope' })).toBeUndefined()
  const writes: unknown[] = []
  const store = new Map<string, unknown>([['cockpit:setting:look.view', 'custom']])
  const io = { sessionId: async () => 'sx', get: async (k: string) => store.get(k), set: async (k: string, v: unknown) => void (writes.push(v), store.set(k, v)) }
  await noteHostView(io as never, 'unasked')
  await noteHostView(io as never, 'unasked')
  await noteHostView(io as never, 'unasked')
  expect(writes).toEqual([{ sid: 'sx', view: 'unasked' }])
  await noteHostView(io as never, 'asks')
  expect(writes).toHaveLength(2)
})

test('LV11: the Delete everything preview and the Reset ask are one left-aligned block, the link at rest sits at the left (LW4)', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom']])
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  fill(mem)
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(PANE_PT) })) as unknown as Pane
  await ui.press({ key: 'settings' })
  await ui.redraw(propsAt(PANE_PT))
  for (const [link, ask, block] of [['settings-reset', 'settings-reset-ask', 'settings-reset-block'], ['settings-erase', 'settings-erase-ask', 'settings-erase-block']]) {
    const rest = await ui.drawn()
    expect(walk(rest).some(d => keyOf(d) === link)).toBe(true)
    expect(walk(rest).some(x => x.props?.justifyContent === 'flex-end' && walk(x).some(d => keyOf(d) === link))).toBe(false)
    await ui.press({ key: link })
    await ui.redraw(propsAt(PANE_PT))
    const asked = await ui.drawn()
    const box = walk(asked).find(x => keyOf(x) === ask)
    expect(box).toBeDefined()
    expect(box?.props?.alignItems).toBe('flex-start')
    expect(walk(asked).find(x => keyOf(x) === block)?.props?.alignItems).toBe('stretch')
    for (const x of walk(box as Node)) {
      expect(x.props?.alignItems).not.toBe('flex-end')
      expect(x.props?.justifyContent).not.toBe('flex-end')
    }
    await ui.press({ key: `${link}-keep` })
    await ui.redraw(propsAt(PANE_PT))
  }
  await ui.unmount()
})
