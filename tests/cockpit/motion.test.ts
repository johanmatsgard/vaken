// Motion: a switch knob slides and a state chip pulses once, only for a row pressed a moment ago.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { Bar, dotSvg, SwitchRow, flipOnce, forgetChanged, justChanged, markChanged, switchSvg } from '../hooks/ui/kit'
import type { El } from '../hooks/ui/kit'
import { SWITCH_ANIM_WINDOW_MS, look, REDUCED_MOTION_QUERY, PULSE_LOW, PULSE_SECONDS } from '../hooks/ui/tokens'
import { FIRST_CLICK_PREFIX, runPress } from '../hooks/ui/firstclick'

type Node = Record<string, unknown>
const make = (name: string) => Object.assign((p: Record<string, unknown>) => p, { displayName: name })
const fake = (withSvg: boolean): El => ({ Box: make('Box'), Text: make('Text'), Button: make('Button'), Svg: withSvg ? make('Svg') : undefined }) as unknown as El

function walk(n: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(n)) {
    for (const c of n) walk(c, out)
  } else if (n !== null && typeof n === 'object') {
    out.push(n as Node)
    walk((n as Node).children, out)
  }
  return out
}
const draw = (el: El, on = true) => walk(SwitchRow(el, 'k', 'Label', 'Note', on, on ? 'off' : 'on', () => {}, 300, { word: on ? 'On' : 'Off', on }))
const sources = (el: El, on = true): string[] => draw(el, on).filter(n => typeof n.source === 'string').map(n => String(n.source))
const animates = (xs: string[]): number => xs.join('').split('<animate ').length - 1

test('an unchanged row draws no animation', () => {
  forgetChanged()
  const xs = sources(fake(true))
  expect(xs.length).toBeGreaterThanOrEqual(3)
  expect(animates(xs)).toBe(0)
})

test('a just-pressed row: one animate on the knob, one on the chip, then none after the window', () => {
  forgetChanged()
  const t0 = Date.now()
  markChanged('sw-k', t0)
  markChanged('chip-k', t0)
  const xs = sources(fake(true))
  expect(animates([xs.find(s => s.includes('<circle'))!])).toBe(1)
  expect(animates(xs)).toBe(2)
  expect(switchSvg(true, true).source).toContain('to="18.5"')
  expect(switchSvg(true, true).source).toContain('cx="18.5"')
  expect(justChanged('sw-k', t0 + SWITCH_ANIM_WINDOW_MS + 1)).toBe(false)
  forgetChanged()
  const old = Date.now() - SWITCH_ANIM_WINDOW_MS - 50
  markChanged('sw-k', old)
  markChanged('chip-k', old)
  expect(animates(sources(fake(true)))).toBe(0)
})

test('a terminal draws no pictures and so no animation', () => {
  forgetChanged()
  markChanged('sw-k')
  markChanged('chip-k')
  expect(sources(fake(false))).toEqual([])
})

test('the tree has the same number of nodes with and without a recent change', () => {
  forgetChanged()
  const still = draw(fake(true)).length
  markChanged('sw-k')
  markChanged('chip-k')
  expect(draw(fake(true)).length).toBe(still)
  forgetChanged()
})

const barSources = (busy?: boolean): string[] => walk(Bar(fake(true), 60, 'b', '60% used', 300, undefined, undefined, busy)).filter(n => typeof n.source === 'string').map(n => String(n.source))

test('a busy bar draws the sweeping band over its fill, a still bar draws none', () => {
  expect(animates(barSources(true))).toBe(1)
  expect(barSources(true).join('')).toContain('busy-band')
  expect(animates(barSources())).toBe(0)
  expect(barSources(false).join('')).not.toContain('busy-band')
})

const fakeClient = (): El => ({ Box: make('Box'), Text: make('Text'), Button: make('Button'), Svg: make('Svg'), Client: make('Client'), drag: true }) as unknown as El
const flipsFor = (press: (nodes: Node[]) => void): number => {
  forgetChanged()
  let n = 0
  const nodes = walk(SwitchRow(fakeClient(), 'p', 'L', 'N', false, 'on', () => void n++, 300))
  press(nodes)
  return n
}
test('the knob Button and the row Client each toggle once', () => {
  expect(flipsFor(nodes => (nodes.find(x => x.key === 'p-switch')?.onPress as () => void)())).toBe(1)
  expect(flipsFor(() => runPress(`${FIRST_CLICK_PREFIX}sw-p`, 1000))).toBe(1)
})
test('a click that reaches both the knob and the row flips once, a later click flips again', () => {
  expect(flipsFor(nodes => {
    ;(nodes.find(x => x.key === 'p-switch')?.onPress as () => void)()
    runPress(`${FIRST_CLICK_PREFIX}sw-p`, 2000)
  })).toBe(1)
  let n = 0
  forgetChanged()
  flipOnce('k', () => void n++, 1000)
  flipOnce('k', () => void n++, 1100)
  flipOnce('k', () => void n++, 1600)
  expect(n).toBe(2)
})

// The Mac's Reduce Motion: SMIL ignores the CSS query.
test('the working dot with motion allowed keeps the same pulse and adds a hidden still twin that Reduce Motion swaps in', () => {
  look.motion = true
  const s = dotSvg('working')
  expect(animates([s])).toBe(1)
  expect(s).toContain(`<animate attributeName="opacity" values="1;${PULSE_LOW};1" dur="${PULSE_SECONDS}s" repeatCount="indefinite"`)
  const css = s.slice(s.indexOf('<style>'), s.indexOf('</style>'))
  expect(css).toContain('.st{display:none}')
  expect(css).toContain(`@media ${REDUCED_MOTION_QUERY}{.pl{display:none}.st{display:inline}`)
  const pl = s.slice(s.indexOf('<g class="pl">'), s.indexOf('</g>'))
  const st = s.slice(s.indexOf('<g class="st">'))
  expect(animates([pl])).toBe(1)
  expect(animates([st])).toBe(0)
})
test('the working dot with look.motion reduced draws no animation and no twin', () => {
  look.motion = false
  const s = dotSvg('working')
  look.motion = true
  expect(animates([s])).toBe(0)
  expect(s).not.toContain('class="pl"')
  expect(s).not.toContain('class="st"')
  expect(s).toContain('<g class="w">')
})
test('a busy bar is hidden by the Reduce Motion query; a still bar and look.motion reduced carry no sweep', () => {
  look.motion = true
  expect(barSources(true).join('')).toContain(`@media ${REDUCED_MOTION_QUERY}{.busy-band{display:none}}`)
  expect(barSources().join('')).not.toContain('prefers-reduced-motion')
  look.motion = false
  const off = barSources(true).join('')
  look.motion = true
  expect(animates([off])).toBe(0)
  expect(off).not.toContain('prefers-reduced-motion')
})
