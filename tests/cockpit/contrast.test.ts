// The contrast of every colour the cockpit draws.
import { expect } from 'claude-code/testing'
import { test } from './slow'
import * as T from '../hooks/ui/tokens'

const channel = (h: string, i: number): number => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16)
const lin = (v: number): number => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const lum = (h: string): number => 0.2126 * lin(channel(h, 0)) + 0.7152 * lin(channel(h, 1)) + 0.0722 * lin(channel(h, 2))
const ratio = (a: string, b: string): number => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const hex2 = (n: number): string => Math.round(n).toString(16).padStart(2, '0')
const blend = (under: string, top: string, alpha: number): string => '#' + [0, 1, 2].map(i => hex2(channel(under, i) * (1 - alpha) + channel(top, i) * alpha)).join('')
const TEXT = 4.5
const MARK = 3

const fill = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(T.CARD_FILL)
if (!fill) throw new Error(`CARD_FILL is not an rgba() colour: ${T.CARD_FILL}`)
const CARD_FILL_HEX = '#' + [fill[1], fill[2], fill[3]].map(n => hex2(Number(n))).join('')
const CARD_ALPHA = Number(fill[4])
const CARD_LIGHT = blend(T.GROUND_LIGHT, CARD_FILL_HEX, CARD_ALPHA)
const CARD_DARK = blend(T.GROUND_DARK, CARD_FILL_HEX, CARD_ALPHA)
const THEMES = Object.keys(T.THEME_ACCENTS)
const WASH = T.PRESS_WASH_OPACITY

type Kind = 'text' | 'mark' | 'decor' | 'ground'
const CLASSES: Record<string, Kind> = {
  ICON_COLOR: 'mark', ICON_COLOR_DARK: 'mark', ICON_DIM: 'mark', GREY: 'mark',
  GREY_TEXT_LIGHT: 'text', GREY_TEXT_DARK: 'text',
  SECTION_COLOR_LIGHT: 'text', SECTION_COLOR_DARK: 'text',
  CHIP_TEXT_LIGHT: 'text', CHIP_TEXT_DARK: 'text', CHIP_TEXT_OFF_LIGHT: 'text', CHIP_TEXT_OFF_DARK: 'text', CHIP_TEXT_ON_LIGHT: 'text', CHIP_TEXT_ON_DARK: 'text',
  ARRANGE_LIFT_TEXT: 'text',
  BLUE: 'mark', AMBER: 'mark', RED: 'mark', AMBER_LIGHT: 'mark', RED_LIGHT: 'mark',
  THEME_VIOLET: 'mark', THEME_TEAL: 'mark', THEME_ROSE: 'mark', THEME_GREEN: 'mark', THEME_OCEAN: 'mark', THEME_SLATE: 'mark', THEME_PLUM: 'mark', THEME_TEAL_LIGHT: 'mark', THEME_ACCENTS: 'mark', THEME_ACCENTS_LIGHT: 'mark',
  SWITCH_KNOB_FILL: 'mark', SWITCH_OFF_KNOB_LIGHT: 'mark', SWITCH_OFF_OUTLINE_LIGHT: 'mark',
  GROUND_LIGHT: 'ground', GROUND_DARK: 'ground',
  CARD_FILL: 'decor', HOVER_FILL: 'decor', CARD_HOVER_FILL: 'decor', HOVER_CLEAR: 'decor', BAR_BUSY_COLOR: 'decor', PRESS_WASH_GREY: 'decor', ACTIVE_LINE: 'decor', CARD_LINE: 'decor', ROUND_LINE: 'decor',
  ARRANGE_LIFT_FILL: 'decor',
}
// Theme keys of the host that the cockpit uses for text.
const HOST_COLOURS = ['dimColor', 'warning']

test('every colour token is placed in a class, so a new one cannot skip the contrast test', () => {
  const found = Object.entries(T)
    .filter(([, v]) => (typeof v === 'string' && /^(#|rgba\()/.test(v)) || (v !== null && typeof v === 'object' && Object.values(v).every(x => typeof x === 'string' && x.startsWith('#'))))
    .map(([k]) => k)
    .filter(k => k === k.toUpperCase())
  expect(found.length, 'the inventory found the colour tokens').toBeGreaterThan(30)
  const missing = found.filter(k => !(k in CLASSES))
  expect(missing, 'colour tokens with no class in tests/contrast.test.ts').toEqual([])
  expect(Object.keys(CLASSES).filter(k => !(k in T)), 'classes for tokens that no longer exist').toEqual([])
  expect(HOST_COLOURS.length).toBeGreaterThan(0)
})

test('text on the card and on the ground reads 4.5 to 1 in its own theme (every theme, light and dark)', () => {
  const rows: [string, string, string][] = []
  const light = (name: string, fg: string): void => { rows.push([`${name}, light, card`, fg, CARD_LIGHT], [`${name}, light, ground`, fg, T.GROUND_LIGHT]) }
  const dark = (name: string, fg: string): void => { rows.push([`${name}, dark, card`, fg, CARD_DARK], [`${name}, dark, ground`, fg, T.GROUND_DARK]) }
  light('small grey text', T.GREY_TEXT_LIGHT)
  dark('small grey text', T.GREY_TEXT_DARK)
  light('section label', T.SECTION_COLOR_LIGHT)
  dark('section label', T.SECTION_COLOR_DARK)
  const hoverAlpha = parseInt(T.CARD_HOVER_FILL.slice(7, 9), 16) / 255
  const hoverOn = (ground: string): string => blend(ground, T.CARD_HOVER_FILL.slice(0, 7), hoverAlpha)
  rows.push(['small grey text, light, card hover', T.GREY_TEXT_LIGHT, hoverOn(T.GROUND_LIGHT)], ['small grey text, dark, card hover', T.GREY_TEXT_DARK, hoverOn(T.GROUND_DARK)])
  // chip words have no fill since (a chip does not press, so it is never a filled pill).
  light('Off chip', T.CHIP_TEXT_OFF_LIGHT)
  dark('Off chip', T.CHIP_TEXT_OFF_DARK)
  light('amber chip', T.CHIP_TEXT_LIGHT)
  dark('amber chip', T.CHIP_TEXT_DARK)
  for (const id of THEMES) {
    light(`On chip, ${id}`, T.CHIP_TEXT_ON_LIGHT[id])
    dark(`On chip, ${id}`, T.CHIP_TEXT_ON_DARK[id])
  }
  rows.push(['dragged tile text', T.ARRANGE_LIFT_TEXT, T.ARRANGE_LIFT_FILL])
  for (const [name, fg, bg] of rows) expect(ratio(fg, bg), `${name}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(TEXT)
})

test('marks and icons read 3 to 1 on the card and on the ground, in light and dark, in every theme', () => {
  const lightMarks: [string, string][] = [
    ['icon grey', T.ICON_COLOR], ['mark grey', T.GREY], ['dim icon grey', T.ICON_DIM], ['amber', T.AMBER_LIGHT], ['red', T.RED_LIGHT],
    ['off switch knob', T.SWITCH_OFF_KNOB_LIGHT], ['off switch outline', T.SWITCH_OFF_OUTLINE_LIGHT],
    ['working dot at rest', blend(CARD_LIGHT, T.GREY_TEXT_LIGHT, T.REDUCED_DOT_OPACITY_LIGHT)],
    ...THEMES.map((id): [string, string] => [`accent ${id}`, T.THEME_ACCENTS_LIGHT[id]]),
  ]
  const darkMarks: [string, string][] = [
    ['icon grey', T.ICON_COLOR_DARK], ['mark grey', T.GREY], ['dim icon grey', T.ICON_DIM], ['amber', T.AMBER], ['red', T.RED],
    ['working dot at rest', blend(CARD_DARK, T.GREY, T.REDUCED_DOT_OPACITY)],
    ...THEMES.map((id): [string, string] => [`accent ${id}`, T.THEME_ACCENTS[id]]),
  ]
  for (const [name, c] of lightMarks) for (const bg of [CARD_LIGHT, T.GROUND_LIGHT]) expect(ratio(c, bg), `${name}, light: ${c} on ${bg}`).toBeGreaterThanOrEqual(MARK)
  for (const [name, c] of darkMarks) for (const bg of [CARD_DARK, T.GROUND_DARK]) expect(ratio(c, bg), `${name}, dark: ${c} on ${bg}`).toBeGreaterThanOrEqual(MARK)
})

test('the switch: the knob against its track, on and off, in every theme and both modes', () => {
  for (const id of THEMES) {
    expect(ratio(T.SWITCH_KNOB_FILL, T.THEME_ACCENTS_LIGHT[id]), `on track, light, ${id}`).toBeGreaterThanOrEqual(MARK)
    expect(ratio(T.SWITCH_KNOB_FILL, T.THEME_ACCENTS[id]), `on track, dark, ${id}`).toBeGreaterThanOrEqual(MARK)
  }
  expect(ratio(T.SWITCH_OFF_KNOB_LIGHT, blend(CARD_LIGHT, T.PRESS_WASH_GREY, T.SWITCH_OFF_OPACITY)), 'off knob on off track, light').toBeGreaterThanOrEqual(MARK)
  expect(ratio(T.SWITCH_KNOB_FILL, blend(CARD_DARK, T.PRESS_WASH_GREY, T.SWITCH_OFF_OPACITY)), 'off knob on off track, dark').toBeGreaterThanOrEqual(MARK)
})

test('a bar of every level and theme reads 3 to 1 against the card in both modes', () => {
  const was = T.look.accent
  for (const pct of [10, 75, 95]) {
    for (const id of THEMES) {
      T.look.accent = T.THEME_ACCENTS[id]
      expect(ratio(T.levelColorLight(pct), CARD_LIGHT), `bar ${pct}%, light, ${id}`).toBeGreaterThanOrEqual(MARK)
      expect(ratio(T.levelColor(pct), CARD_DARK), `bar ${pct}%, dark, ${id}`).toBeGreaterThanOrEqual(MARK)
    }
  }
  T.look.accent = was
})
