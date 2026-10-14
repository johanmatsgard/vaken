// What a screen reader says: a row's picture carries its name and what a press does, the switch names its setting and value.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { setLang, tr } from '../hooks/core/lang'
import { Chevron, ChevronMark, GlanceRow, GroupBreak, IconButton, MoreRow, Pick, SwitchRow, foldAlt, forgetChanged } from '../hooks/ui/kit'
import type { El } from '../hooks/ui/kit'
import { look } from '../hooks/ui/tokens'

type Node = Record<string, unknown>
const make = (name: string) => Object.assign((p: Record<string, unknown>) => p, { displayName: name })
const el = (): El => ({ Box: make('Box'), Text: make('Text'), Button: make('Button'), Svg: make('Svg'), Client: make('Client'), drag: true }) as unknown as El

function walk(n: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(n)) {
    for (const c of n) walk(c, out)
  } else if (n !== null && typeof n === 'object') {
    out.push(n as Node)
    walk((n as Node).children, out)
  }
  return out
}
const alts = (tree: unknown): string[] => walk(tree).filter(n => typeof n.source === 'string').map(n => String(n.alt))
const buttons = (tree: unknown): Node[] => walk(tree).filter(n => typeof n.label === 'string' || typeof n.onPress === 'function')

const glance = { value: '12%', dot: 'neutral' as const, isOpen: false, widthPt: 300, onPress: () => {} }

test('A1, A2: a Glance row\'s chevron picture says the row and the action, open or shut', () => {
  setLang('en')
  expect(alts(GlanceRow(el(), 'k', 'Plan limits', glance))).toContain('Open Plan limits')
  expect(alts(GlanceRow(el(), 'k', 'Plan limits', { ...glance, isOpen: true }))).toContain('Fold Plan limits')
  expect(alts(ChevronMark(el(), 'c', 'right', () => {}, 'Notices'))).toEqual(['Open Notices'])
  expect(alts(Chevron(el(), 'c', 'down', () => {}, 'Notices'))).toEqual(['', 'Fold Notices'])
  expect(alts(ChevronMark(el(), 'c', 'down', () => {}, 'Notices'))).toEqual(['Fold Notices'])
  expect(foldAlt('right')).toBe('Open')
  expect(foldAlt('down')).toBe('Fold')
})

test('A2: the gear reads "<card> settings"', () => {
  setLang('en')
  expect(alts(IconButton(el(), 'g', 'gear', 'Plan limits settings', () => {}))).toEqual(['Plan limits settings'])
})

test('A3: the switch picture is "<setting>: On" or "<setting>: Off" and its Button keeps one key whichever way it is set', () => {
  setLang('en')
  forgetChanged()
  const draw = (on: boolean) => SwitchRow(el(), 'notify', 'Notices', 'Note', on, on ? 'off' : 'on', () => {}, 300)
  expect(alts(draw(true))).toContain('Notices: On')
  expect(alts(draw(false))).toContain('Notices: Off')
  const keys = (on: boolean) => buttons(draw(on)).map(b => b.key).filter(k => typeof k === 'string' && String(k).startsWith('notify-'))
  expect(keys(true)).toEqual(['notify-switch'])
  expect(keys(false)).toEqual(['notify-switch'])
})

test('A6: a Pick option is drawn and named by its words; every option is framed and the chosen one is filled in the chosen colour (item 135; the app draws a Button label, so "selected" would show, seen live on 1.90.0)', () => {
  setLang('en')
  const opts = [
    { value: 'auto', label: 'Auto' },
    { value: 'on', label: 'On' },
  ]
  const tree = Pick(el(), 'mode', opts, 'auto', () => {})
  const picks = buttons(tree).filter(b => typeof b.key === 'string' && String(b.key).startsWith('mode-'))
  const chosen = picks.find(b => b.key === 'mode-auto')
  const other = picks.find(b => b.key === 'mode-on')
  expect(String(chosen?.label).trim()).toBe('Auto')
  expect(chosen?.children ?? []).toEqual([])
  // One segmented control: the chosen words at full strength, the other dim.
  expect(chosen?.dimColor).toBeUndefined()
  expect(String(other?.label).trim()).toBe('On')
  expect(other?.dimColor).toBe(true)
  const box = (k: string): Node | undefined => walk(tree).find(n => n.key === `fcw-${k}`)
  expect(box('mode-auto')?.backgroundColor, 'no square fill').toBeUndefined()
  expect(box('mode-on')?.backgroundColor, 'no square fill').toBeUndefined()
  const pics = walk(tree).filter(n => typeof n.source === 'string').map(n => String(n.source))
  expect(pics[0]).toContain(`fill="${look.accent.slice(0, 7)}"`)
  expect(pics[0]).toContain('rx=')
  const hoverFill = (k: string): unknown => (box(k) as { hover?: { backgroundColor?: unknown } } | undefined)?.hover?.backgroundColor
  expect(hoverFill('mode-on'), 'the option not chosen lights its own box').toBeDefined()
  expect(walk(box('mode-on') as Node).some(n => (n as { display?: unknown }).display === 'none' || (n as { props?: { display?: unknown } }).props?.display === 'none'), 'no hidden pill').toBe(false)
  expect(hoverFill('mode-auto'), 'the chosen one has none').toBeUndefined()
  // No frame can be drawn (a terminal): the host frames every option, the chosen one is the primary Button with a dot in front.
  const plain = { ...el(), Svg: undefined, Client: undefined, drag: false } as unknown as El
  const bare = buttons(Pick(plain, 'mode', opts, 'auto', () => {}))
  expect(bare.find(b => b.key === 'mode-auto')?.variant).toBe('primary')
  expect(String(bare.find(b => b.key === 'mode-auto')?.label)).toBe('\u2022 Auto')
  expect(bare.find(b => b.key === 'mode-on')?.plain).toBeUndefined()
})

test('A6: the chosen Pick option is heard: the segmented track picture says "<option>, selected", out of the flow, and only for the chosen one', () => {
  setLang('en')
  const opts = [
    { value: 'now', label: 'Now' },
    { value: 'all', label: 'All' },
  ]
  const said = (tree: unknown): string[] => alts(tree).filter(a => a.endsWith(', selected') || a.endsWith(', vald'))
  expect(said(Pick(el(), 'scope', opts, 'now', () => {}))).toEqual(['Now, selected'])
  expect(said(Pick(el(), 'scope', opts, 'all', () => {}))).toEqual(['All, selected'])
  // The picture's box is absolute, so the row's width and the options' places stay as they were.
  const track = walk(Pick(el(), 'scope', opts, 'now', () => {})).find(n => Array.isArray(n.children) && (n.children as Node[]).some(c => c?.alt === 'Now, selected'))
  expect(track?.position).toBe('absolute')
  const plain = { ...el(), Svg: undefined } as unknown as El
  expect(alts(Pick(plain, 'scope', opts, 'now', () => {}))).toEqual([])
  setLang('sv')
  try {
    expect(said(Pick(el(), 'scope', [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }], 'on', () => {}))).toEqual([`${tr('On')}, vald`])
  } finally {
    setLang('en')
  }
})

test('A29: the hairline between groups is named, so it is drawn (live, a picture with an empty alt is not drawn; item 139)', () => {
  expect(alts(GroupBreak(el(), 'br', 300))).toEqual(['Divider'])
})

test('A7: in a Swedish tree no picture reads an English word', () => {
  setLang('sv')
  try {
    forgetChanged()
    const tree = [
      GlanceRow(el(), 'k', 'Plan limits', glance),
      SwitchRow(el(), 'notify', 'Notices', 'Note', true, 'off', () => {}, 300),
      MoreRow(el(), 'm', 'Show more', false, () => {}),
      MoreRow(el(), 'm2', 'Show fewer', true, () => {}),
      ChevronMark(el(), 'c', 'right', () => {}, 'Notices'),
      Chevron(el(), 'c2', 'down', () => {}),
    ]
    const got = alts(tree)
    const rest = got.filter(a => a !== 'neutral')
    expect(rest).toContain('Öppna Gränser i din plan')
    expect(rest).toContain('Notiser: På')
    expect(rest).toContain('Visa mer')
    expect(rest).toContain('Visa färre')
    expect(rest).toContain('Öppna Notices')
    expect(rest).toContain('Dölj')
    for (const a of rest) expect(/\b(open|opens|expand|collapse|shows more|shows fewer|rule|back|on|off)\b/.test(a), `English alt: ${a}`).toBe(false)
    expect(tr('Back')).toBe('Tillbaka')
  } finally {
    setLang('en')
  }
})
