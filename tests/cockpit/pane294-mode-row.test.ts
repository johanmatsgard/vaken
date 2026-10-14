// In a 294 pt pane: the mode row of Settings' first card wraps instead of crossing the card's inset.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { test } from './slow'

import { headerWraps } from '../hooks/ui/kit'
import { BORDER_X_PT, COL_PT, ROW_PT } from '../hooks/ui/tokens'

const NOW = Date.parse('2026-10-12T12:00:00Z')
const MIN = 60_000
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
// The width a part asks for in one line, in points.
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

for (const widthPt of [288, 294]) {
  test(`LV14 and LV15: at ${widthPt} pt the mode choices are a radio list inside the card and no header link is wider than the card`, { timeoutMs: 60_000 }, async ($, on) => {
    const mem = new Map<string, unknown>()
    mock.clock(on, { now: NOW })
    mock.env(on, { HOME: '/home/test' })
    engine(on, mem)
    fill(mem)
    const inner = widthPt - 2 * BORDER_X_PT
    const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(widthPt) })) as unknown as Pane
    await ui.press({ key: 'settings' })
    await ui.redraw(propsAt(widthPt))
    const root = await ui.drawn()
    const lines = walk(root).find(x => keyOf(x) === 'radio-mode') as Node
    expect(lines).toBeDefined()
    expect(kids(lines).filter(k => /^radio-mode-(quiet|balanced|full)$/.test(keyOf(k) ?? '')).length).toBe(3)
    // Each option row fits the card (the chosen mode's summary is a dim Text that wraps, so it is not measured as one line).
    for (const p of kids(lines).filter(k => /^radio-mode-(quiet|balanced|full)$/.test(keyOf(k) ?? ''))) expect(wide(p)).toBeLessThanOrEqual(inner + CLOSE)
    expect(walk(root).some(x => keyOf(x) === 'count-settings-mode')).toBe(false)
    const cards = walk(root).filter(x => /^settings-(notices|plan-and-cost|agents-and-tasks|safety|prompts-and-memory|look-and-cards|health|advanced)$/.test(keyOf(x) ?? ''))
    const look = walk(root).find(x => keyOf(x) === 'settings-look-and-cards') as Node
    expect(look).toBeDefined()
    const link = walk(look).find(x => keyOf(x) === 'linkrow-jump-settings-look-and-cards') as Node
    expect(link).toBeDefined()
    const words = walk(link).find(x => x.type === 'Text' || (x.type === 'Button' && String(x.props?.label ?? '').trim() !== '')) as Node
    expect(words.type === 'Button' ? String(words.props?.label) : (words.children ?? []).join('')).toBe('Arrange cards')
    expect(words.props?.dimColor).not.toBe(true)
    const inFlow = kids(link).filter(k => k.props?.position !== 'absolute')
    expect(walk(inFlow[inFlow.length - 1] as Node).some(x => x.type === 'Svg')).toBe(true)
    expect(walk(kids(look)[0] as Node).includes(link)).toBe(false)
    expect(wide(link)).toBeLessThanOrEqual(inner)
    for (const card of cards) {
      const parts = kids(card)
      expect(wide((walk(card).find(x => keyOf(x) === `${keyOf(card)}-head`) ?? parts[0]) as Node)).toBeLessThanOrEqual(inner + CLOSE)
      const line = walk(card).find(p => keyOf(p)?.endsWith('-controls-line'))
      if (line !== undefined) for (const p of kids(line)) expect(wide(p)).toBeLessThanOrEqual(inner + CLOSE)
    }
    expect(walk(look).some(p => keyOf(p)?.endsWith('-controls-line'))).toBe(false)
    await ui.unmount()
  })
}

test('LV15: the header rule keeps a few points free, so a link is not clipped by an estimate that runs short', () => {
  const inner = 294 - 2 * BORDER_X_PT
  const exact = (title: string, restPt: number) => Math.ceil(inner - title.length * 7.4 - 8 - restPt)
  expect(exact('Cards and look', 0)).toBeGreaterThan(0)
  const room = exact('Cards and look', 0)
  expect(headerWraps(inner, { title: 'Cards and look', fold: false, restPt: room })).toBe(true)
  expect(headerWraps(inner, { title: 'Cards and look', fold: false, restPt: room - 5 })).toBe(true)
  expect(headerWraps(inner, { title: 'Cards and look', fold: false, restPt: room - 30 })).toBe(false)
})
