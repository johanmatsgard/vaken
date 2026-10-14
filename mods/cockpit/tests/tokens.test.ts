// The colour tokens of the kit: a light and a dark value, and the contrast each text and mark needs.
import { expect } from 'claude-code/testing'
import { test } from './slow'
import {
  AMBER,
  AMBER_LIGHT,
  BLUE,
  CHIP_TEXT_DARK,
  CHIP_TEXT_LIGHT,
  CHIP_TEXT_OFF_DARK,
  CHIP_TEXT_OFF_LIGHT,
  CHIP_TEXT_ON_DARK,
  CHIP_TEXT_ON_LIGHT,
  GREY,
  GREY_TEXT_DARK,
  GREY_TEXT_LIGHT,
  GROUND_DARK,
  GROUND_LIGHT,
  PRESS_WASH_GREY,
  PRESS_WASH_OPACITY,
  RED,
  RED_LIGHT,
  REDUCED_DOT_OPACITY_LIGHT,
  SECTION_COLOR_DARK,
  SECTION_COLOR_LIGHT,
  SWITCH_KNOB_FILL,
  SWITCH_OFF_KNOB_LIGHT,
  SWITCH_OFF_OPACITY,
  SWITCH_OFF_OUTLINE_LIGHT,
  THEME_ACCENTS,
  THEME_ACCENTS_LIGHT,
  THEME_TEAL,
  THEME_TEAL_LIGHT,
  accentLight,
  levelColorLight,
  look,
  themeOfAccent,
} from '../hooks/ui/tokens'
import { dotSvg, pillSvg, switchSvg } from '../hooks/ui/kit'

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

const CARD_LIGHT = blend(GROUND_LIGHT, '#808080', 0.1)
const CARD_DARK = blend(GROUND_DARK, '#808080', 0.1)
const THEMES = Object.keys(THEME_ACCENTS)

test('every colour that differs by theme has a light and a dark value, and the two differ', () => {
  const pairs: [string, string, string][] = [
    ['small grey text', GREY_TEXT_LIGHT, GREY_TEXT_DARK],
    ['section label', SECTION_COLOR_LIGHT, SECTION_COLOR_DARK],
    ['amber mark', AMBER_LIGHT, AMBER],
    ['Teal mark', THEME_TEAL_LIGHT, THEME_TEAL],
    ['Off chip text', CHIP_TEXT_OFF_LIGHT, CHIP_TEXT_OFF_DARK],
    ['off switch knob', SWITCH_OFF_KNOB_LIGHT, SWITCH_KNOB_FILL],
  ]
  for (const [name, light, dark] of pairs) {
    expect(light, `${name}: light`).toMatch(/^#[0-9a-f]{6}$/i)
    expect(dark, `${name}: dark`).toMatch(/^#[0-9a-f]{6}$/i)
    expect(light.toLowerCase(), `${name}: light and dark are the same`).not.toBe(dark.toLowerCase())
  }
  for (const id of THEMES) {
    expect(CHIP_TEXT_ON_LIGHT[id], `On chip text, light, ${id}`).toMatch(/^#[0-9a-f]{6}$/i)
    expect(CHIP_TEXT_ON_DARK[id], `On chip text, dark, ${id}`).toMatch(/^#[0-9a-f]{6}$/i)
    expect(THEME_ACCENTS_LIGHT[id], `accent mark, light, ${id}`).toBeDefined()
  }
})

test('every text token reads 4.5 to 1 on the card in its own theme', () => {
  const cases: [string, string, string][] = [
    ['section label, light', SECTION_COLOR_LIGHT, CARD_LIGHT],
    ['section label, dark', SECTION_COLOR_DARK, CARD_DARK],
    ['small grey text, light', GREY_TEXT_LIGHT, CARD_LIGHT],
    ['small grey text, dark', GREY_TEXT_DARK, CARD_DARK],
    ['Off chip, light', CHIP_TEXT_OFF_LIGHT, CARD_LIGHT],
    ['Off chip, dark', CHIP_TEXT_OFF_DARK, CARD_DARK],
    ['amber chip, light', CHIP_TEXT_LIGHT, CARD_LIGHT],
    ['amber chip, dark', CHIP_TEXT_DARK, CARD_DARK],
    ...THEMES.flatMap((id): [string, string, string][] => [
      [`On chip, light, ${id}`, CHIP_TEXT_ON_LIGHT[id], CARD_LIGHT],
      [`On chip, dark, ${id}`, CHIP_TEXT_ON_DARK[id], CARD_DARK],
    ]),
  ]
  for (const [name, fg, bg] of cases) expect(ratio(fg, bg), `${name}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
})

test('every mark reads 3 to 1 on the card in its own theme', () => {
  const light: [string, string][] = [
    ['mark grey', GREY],
    ['amber', AMBER_LIGHT],
    ['red', RED_LIGHT],
    ...THEMES.map((id): [string, string] => [`accent ${id}`, THEME_ACCENTS_LIGHT[id]]),
    ['off switch knob', SWITCH_OFF_KNOB_LIGHT],
    ['off switch outline', SWITCH_OFF_OUTLINE_LIGHT],
    ['working dot at rest', blend(CARD_LIGHT, GREY_TEXT_LIGHT, REDUCED_DOT_OPACITY_LIGHT)],
  ]
  for (const [name, c] of light) expect(ratio(c, CARD_LIGHT), `${name}, light: ${c}`).toBeGreaterThanOrEqual(3)
  const dark: [string, string][] = [['mark grey', GREY], ['amber', AMBER], ['red', RED], ...THEMES.map((id): [string, string] => [`accent ${id}`, THEME_ACCENTS[id]])]
  for (const [name, c] of dark) expect(ratio(c, CARD_DARK), `${name}, dark: ${c}`).toBeGreaterThanOrEqual(3)
  expect(ratio(SWITCH_KNOB_FILL, BLUE)).toBeGreaterThanOrEqual(3)
  expect(ratio(SWITCH_OFF_KNOB_LIGHT, blend(CARD_LIGHT, PRESS_WASH_GREY, SWITCH_OFF_OPACITY))).toBeGreaterThanOrEqual(3)
})

test('the light twins: Teal gets one, the amber of dark mode is untouched, a bar picks the light colour by level', () => {
  expect(accentLight(THEME_TEAL)).toBe(THEME_TEAL_LIGHT)
  expect(accentLight(BLUE)).toBe(BLUE)
  expect(themeOfAccent(THEME_TEAL)).toBe('teal')
  expect(themeOfAccent('#123456')).toBe('native')
  const was = look.accent
  look.accent = THEME_TEAL
  expect(levelColorLight(10)).toBe(THEME_TEAL_LIGHT)
  expect(levelColorLight(75)).toBe(AMBER_LIGHT)
  expect(levelColorLight(95)).toBe(RED_LIGHT)
  look.accent = was
  const bar = pillSvg(75, 100)
  expect(bar).toContain(AMBER_LIGHT)
  expect(bar).toContain(AMBER)
  expect(bar).toMatch(/prefers-color-scheme: dark/)
})

test('the dots differ by shape, not by colour alone', () => {
  const sources = { needs: dotSvg('needs'), waiting: dotSvg('waiting'), idle: dotSvg('idle'), working: dotSvg('working') }
  expect(sources.needs, 'needs you is a diamond').toContain('<polygon')
  expect(sources.waiting, 'active is a disc').toMatch(/<circle class="m"/)
  expect(sources.waiting).not.toContain('<polygon')
  expect(sources.idle, 'calm is a ring').toContain('fill="none"')
  expect(sources.working, 'working is a ring with a core').toMatch(/<circle class="wr"[^>]*fill="none"[\s\S]*<circle class="wc"/)
  expect(new Set(Object.values(sources)).size).toBe(4)
  expect(sources.needs).toContain(AMBER_LIGHT)
  expect(sources.needs).toContain(AMBER)
})

test('an off switch in light mode has an outline and a grey knob, in dark mode neither; an on switch is the chosen colour (item 135: the accent, its light twin in light mode), with no outline', () => {
  const off = switchSvg(false).source
  expect(off).toContain(SWITCH_OFF_OUTLINE_LIGHT)
  expect(off).toContain(SWITCH_OFF_KNOB_LIGHT)
  expect(off).toMatch(/prefers-color-scheme: dark\)\{\.o\{stroke:none\}/)
  expect(off).toContain(SWITCH_KNOB_FILL)
  const on = switchSvg(true).source
  expect(on).toContain(`.a{fill:${accentLight(look.accent)}}@media (prefers-color-scheme: dark){.a{fill:${look.accent}}}`)
  expect(on).toContain(BLUE)
  expect(on).not.toContain('class="o"')
})
