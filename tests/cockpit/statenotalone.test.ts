// State is never colour alone (not colour alone).
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { setLang, tr } from '../hooks/core/lang'
import { markOf } from '../hooks/core/band'
import type { BandItem } from '../hooks/core/band'
import { Bar, GlanceRow, Mark, StateChip, dotSvg, pillSvg } from '../hooks/ui/kit'
import type { DotKind, El } from '../hooks/ui/kit'

type Node = Record<string, unknown>
const make = (name: string) => Object.assign((p: Record<string, unknown>) => p, { displayName: name })
const el = (): El => ({ Box: make('Box'), Text: make('Text'), Button: make('Button'), Svg: make('Svg'), host: { Client: make('Client') }, drag: true }) as unknown as El

function walk(n: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(n)) {
    for (const c of n) walk(c, out)
  } else if (n !== null && typeof n === 'object') {
    out.push(n as Node)
    walk((n as Node).children, out)
  }
  return out
}
const pictures = (tree: unknown): Node[] => walk(tree).filter(n => typeof n.source === 'string')
const alts = (tree: unknown): string[] => pictures(tree).map(n => String(n.alt))

// A picture as a person with no colour vision would see it: every colour is the same black.
const noColour = (svg: string): string => svg.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/#[0-9a-fA-F]{3,8}\b/g, '#000').replace(/rgba?\([^)]*\)/g, '#000').replace(/ class="[^"]*"/g, '')

const KINDS: DotKind[] = ['needs', 'waiting', 'idle', 'working']

test('the four dots still differ when every colour is taken away (a shape each)', () => {
  const shapes = KINDS.map(k => noColour(dotSvg(k)))
  expect(new Set(shapes).size).toBe(KINDS.length)
})

test('a bar of every level is the same shape: its level is in the words beside it, not in the picture', () => {
  const [a, b, c] = [10, 75, 95].map(p => noColour(pillSvg(p, 200)))
  expect(new Set([a, b, c]).size, 'three levels, three widths: the bar length is the signal without colour').toBe(3)
  const compact = Bar(el(), 75, 'k', 'Session 75% used', 300, '75%')
  expect(alts(compact)).toEqual(['Session 75% used'])
  expect(walk(compact).some(n => Array.isArray(n.children) && n.children.includes('75%')), 'the percent is text beside the bar').toBe(true)
  const full = Bar(el(), 95, 'k', 'Session 95% used', 300)
  expect(alts(full)).toEqual(['Session 95% used'])
})

test('each Glance dot has a state word for a screen reader, in English and in Swedish, and never a colour name', () => {
  const glance = { value: '12%', isOpen: false, widthPt: 300, onPress: () => {} }
  for (const lang of ['en', 'sv'] as const) {
    setLang(lang)
    const words = (['neutral', 'accent', 'amber'] as const).map(dot => alts(GlanceRow(el(), 'k', 'Plan limits', { ...glance, dot })).filter(a => !/^(Open|Shut|Öppna|Stäng)/.test(a)))
    const flat = words.flat()
    expect(flat.length, `${lang}: one state word per dot`).toBe(3)
    expect(new Set(flat).size, `${lang}: the three states have three different words`).toBe(3)
    for (const w of flat) expect(w, `${lang}: ${w}`).not.toMatch(/^(neutral|accent|amber|blue|grey|gray|red|green|blå|grå|röd|grön|gul)$/i)
  }
  setLang('en')
})

test('a list mark (Mark, with its word) carries the word as its picture name', () => {
  setLang('en')
  for (const kind of KINDS) expect(alts(Mark(el(), kind, `word ${kind}`))).toEqual([`word ${kind}`])
})

test('a state chip draws its word in the picture and names it', () => {
  setLang('en')
  for (const isOn of [true, false]) {
    const [pic] = pictures(StateChip(el(), 'k', isOn ? 'On' : 'Off', isOn))
    expect(pic.alt).toBe(isOn ? 'On' : 'Off')
    expect(String(pic.source)).toContain(`>${isOn ? 'On' : 'Off'}</text>`)
  }
  const text = walk(StateChip({ ...el(), Svg: undefined } as unknown as El, 'k', 'On', true))
  expect(text.some(n => Array.isArray(n.children) && n.children.includes('[On]')), 'the chip is its word in brackets').toBe(true)
})

test('a band line opens with a mark glyph that differs by level, so the colour of the line is not the signal', () => {
  const item = (level: BandItem['level'], id = 'x'): BandItem => ({ id, level, text: 't', at: 0, ttlMs: 1 })
  const marks = [markOf(item('urgent')), markOf(item('warn')), markOf(item('info')), markOf(item('info', 'did:y'))]
  expect(new Set(marks).size).toBe(4)
  expect(tr('common.needs_you').length).toBeGreaterThan(0)
})
