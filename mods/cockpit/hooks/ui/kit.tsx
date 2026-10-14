// Vaken's drawn parts
import type { BoxProps, ButtonProps, ClientProps, ElementConstructor, InputProps, RenderChildren, RenderSurface, SvgProps, TextProps } from 'claude-code'

import { t, tr, trMore } from '../core/lang'
import type { GlanceDot } from '../core/headline'
import { cellsOut, reachCard } from './reach'
import { FIRST_CLICK_ON, FIRST_CLICK_REPEAT_MS, clientKey, faulted, hoverScope, pressLogOn, registerPress } from './firstclick'

import {
  ACTIVE_LINE,
  CARD_LINE,
  ADVICE_BUTTON_GAP,
  CARD_GAP,
  CARD_GAP_X,
  CARD_PAD_Y_PT,
  PRESS_ROW_H,
  PRESS_FRAME_H,
  AMBER,
  AMBER_LIGHT,
  CHIP_TEXT_OFF_DARK,
  CHIP_TEXT_OFF_LIGHT,
  CHIP_TEXT_ON_DARK,
  CHIP_TEXT_ON_LIGHT,
  DOT_CORE_R,
  DOT_RING_W,
  EDGE_WORD_OUT_PT,
  GREY_TEXT_LIGHT,
  REDUCED_DOT_OPACITY_LIGHT,
  SECTION_COLOR_DARK,
  SECTION_COLOR_LIGHT,
  SWITCH_OFF_KNOB_LIGHT,
  SWITCH_OFF_OUTLINE_LIGHT,
  SWITCH_OUTLINE_W,
  accentLight,
  levelColorLight,
  themeOfAccent,
  BAR_H,
  BAR_PCT_COL,
  BAR_PCT_GAP,
  BAR_R,
  BAR_SLOT,
  BAR_CANVAS_PT,
  MARK_H,
  MARK_W,
  GROUP_GAP,
  BODY_GAP,
  BODY_ROW_GAP,
  BLOCK_RULE_PT,
  REDUCED_DOT_OPACITY,
  REDUCED_MOTION_QUERY,
  SAID_MARK_PT,
  RADIO_PT,
  RADIO_RING_W,
  RADIO_DOT_PT,
  RADIO_TEXT_GAP,
  look,
  BUTTON_PAD,
  HIT_ICON_W,
  SWITCH_HIT_W,
  HIT_MIN_H,
  WORD_FOOT_W,
  GEAR_SLOT,
  SECTION_TEXT,
  SECTION_CAP_EM,
  SECTION_CHAR_PT,
  SECTION_LETTER_EM,
  SECTION_NARROW_EM,
  SECTION_PAD,
  SECTION_WIDE_EM,
  SECTION_H,
  SECTION_GAP,
  TEXT_CHAR_PT,
  CHOICE_NOTE_MIN_PT,
  BOLD_CHAR_PT,
  PRESS_END_PT,
  HIT_PAD_BLANKS,
  HEADER_SLACK_PT,
  CHEVRON_GAP,
  CHEVRON_LONG,
  CHEVRON_SHORT,
  CHEVRON_SLOT,
  CHEVRON_STROKE,
  ICON_CLOSE,
  ICON_COLOR,
  ICON_COLOR_DARK,
  ICON_SLOT,
  ICON_DIM,
  PIN_GAP,
  PIN_H,
  PIN_W,
  ICON_GAP,
  ICON_MORE_H,
  ICON_MORE_W,
  ICON_GEAR,
  ICON_GEAR_FOOT_SHARE,
  ICON_GEAR_HOLE,
  ICON_GEAR_ROOT,
  ICON_GEAR_TEETH,
  ICON_GEAR_TIP,
  ICON_GEAR_TIP_SHARE,
  BACK_GAP,
  ICON_PLUS,
  ICON_STROKE,
  MORE_CHEVRON_LONG,
  PULSE_LOW,
  BAR_BUSY_BAND_PT,
  BAR_BUSY_COLOR,
  BAR_BUSY_OPACITY,
  BAR_BUSY_SECONDS,
  PULSE_SECONDS,
  SWITCH_SLIDE_MS,
  STATE_PULSE_MS,
  STATE_PULSE_LOW,
  SWITCH_ANIM_WINDOW_MS,
  MORE_CHEVRON_SHORT,
  CARD_FILL,
  CHIP_H,
  CHIP_PAD,
  CHIP_CHAR_PT,
  CHIP_TEXT,
  CHIP_TEXT_DARK,
  CHIP_TEXT_LIGHT,
  DOT,
  DOT_TEXT_GAP,
  GREY,
  GLANCE_DOT_GAP,
  GLANCE_ROW_H,
  GLANCE_VALUE_GAP,
  LIST_COL_GAP,
  LIST_RIGHT_COL,
  LIST_WORD_COL,
  NOTE_MAX_LINES,
  STACK_BELOW_PT,
  LIST_ROW_GAP,
  LIST_ROW_H,
  LIST_ROW_PAD_PT,
  TEXT_CAP_PT,
  TEXT_NARROW_PT,
  TEXT_ROUND_PT,
  TEXT_SPACE_PT,
  TEXT_THIN_PT,
  TEXT_WIDE_PT,
  ROUND_LINE,
  ROW_PT,
  VSTEP_PT,
  CARD_HOVER_FILL,
  HOVER_FILL,
  REST_MARK_OPACITY,
  FRAME_PAD_X_PT,
  SEG_INSET_PT,
  CARD_FILL_SHARE,
  GROUND_LIGHT,
  GROUND_DARK,
  seen,
  CHOSEN_FILL_SHARE,
  RULE_BOX_H,
  RULE_H,
  RULE_OPACITY,
  HOVER_CLEAR,
  BLANK_PT,
  PRESS_INSET,
  PRESS_FILL,
  PRESS_LINE_CELLS,
  PRESS_WASH_OUT,
  PRESS_WASH_R,
  PRESS_WASH_OPACITY,
  PRESS_WASH_GREY,
  SWITCH_W,
  SWITCH_H,
  SWITCH_KNOB,
  SWITCH_INSET,
  SWITCH_OFF_OPACITY,
  SWITCH_KNOB_FILL,
  SWITCH_BLANKS,
  COL_PT,
  levelColor,
  cols,
  rows,
  vstep,
} from './tokens'

export { CARD_GAP, CARD_GAP_X, WARNING, vstep } from './tokens'

// The elements a drawing takes, from `$.ui.resolve(e)`: every surface has Box, Text and Button
export type El = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Button: ElementConstructor<ButtonProps>
  Svg?: ElementConstructor<SvgProps>
  Input?: ElementConstructor<InputProps>
  Client: ElementConstructor<ClientProps>  // the host fills it on every surface; `drag` says whether this surface may draw it
  // Whether this surface draws a Client (a pointer): tested here, never by looking at Client
  drag: boolean
}

// What each surface can draw
export const hasSvg = (surface: RenderSurface): boolean => surface !== 'terminal'
// Input and Select: all but mobile
export const hasInput = (surface: RenderSurface): boolean => surface !== 'mobile'
// Dragging (the arrange board is a Client with a pointer): the desktop only
export const canDrag = (surface: RenderSurface): boolean => surface === 'desktop'

// The elements a draw takes, kept to what its surface really draws
export function elementsFor(el: Omit<El, 'drag' | 'Client'> & { Client?: El['Client'] }, surface: RenderSurface): El {
  return { Box: el.Box, Text: el.Text, Button: el.Button, Svg: hasSvg(surface) ? el.Svg : undefined, Input: hasInput(surface) ? el.Input : undefined, drag: canDrag(surface), Client: el.Client as El['Client'] }
}
// What a drawing part takes as content or returns: an element, a string, nothing
export type Drawn = RenderChildren

// THE ONE CARD STYLE: every card of every view
export const ROUNDED = { borderStyle: 'round', borderColor: ROUND_LINE, paddingTop: vstep(CARD_PAD_Y_PT), paddingBottom: vstep(CARD_PAD_Y_PT) } as const

// The app's usage bar (Settings, Usage): a pill 4 pt thick with fully rounded ends
export const themed = (cls: string, prop: 'fill' | 'stroke', light: string, dark: string): string => `.${cls}{${prop}:${light}}@media (prefers-color-scheme: dark){.${cls}{${prop}:${dark}}}`
export function pillSvg(pct: number, viewPt: number, outerPt?: number, mark?: number, busy?: boolean): string {
  // Wide by default (it is cut to its slot), and never narrower than the bar itself
  const outer = outerPt ?? Math.max(BAR_CANVAS_PT, viewPt)
  const c = levelColor(pct)
  const cl = levelColorLight(pct)
  const w = Math.max(BAR_H, (viewPt * Math.min(100, Math.max(0, pct))) / 100)
  const h = mark === undefined ? BAR_H : MARK_H
  const y = (h - BAR_H) / 2
  // The mark is clamped so its line stays inside the canvas
  const x = mark === undefined ? 0 : Math.min(viewPt - MARK_W, Math.max(0, (viewPt * Math.min(100, Math.max(0, mark))) / 100 - MARK_W / 2))
  const tick = mark === undefined ? '' : `<rect x="${x}" width="${MARK_W}" height="${MARK_H}" rx="${MARK_W / 2}" fill="${ICON_DIM}"/>`
  // A busy bar: a lighter band slides over the fill, clipped to it (so the round end stays round)
  const band =
    busy && look.motion !== false && w > 0
      ? `<clipPath id="bf"><rect y="${y}" width="${w}" height="${BAR_H}" rx="${BAR_R}"/></clipPath><rect class="busy-band" clip-path="url(#bf)" y="${y}" x="${-BAR_BUSY_BAND_PT}" width="${BAR_BUSY_BAND_PT}" height="${BAR_H}" fill="${BAR_BUSY_COLOR}" fill-opacity="${BAR_BUSY_OPACITY}"><animate attributeName="x" from="${-BAR_BUSY_BAND_PT}" to="${w}" dur="${BAR_BUSY_SECONDS}s" repeatCount="indefinite"/></rect>`
      : ''
  // The Mac's Reduce Motion: SMIL ignores the CSS query
  const stillCss = band === '' ? '' : `@media ${REDUCED_MOTION_QUERY}{.busy-band{display:none}}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outer}" height="${h}" viewBox="0 0 ${viewPt} ${h}" preserveAspectRatio="none"><style>${themed('c', 'fill', cl, c)}${stillCss}</style><rect class="c" y="${y}" width="${viewPt}" height="${BAR_H}" rx="${BAR_R}" fill-opacity="0.25"/><rect class="c" y="${y}" width="${w}" height="${BAR_H}" rx="${BAR_R}"/>${band}${tick}</svg>`
}

export type DotKind = 'working' | 'waiting' | 'idle' | 'needs'

// The app's sidebar dots, 6 pt: a soft pulsing grey dot is working
export function dotSvg(kind: DotKind): string {
  const r = DOT / 2
  // Four shapes: needs you a diamond, active a disc, calm a ring, working a ring with a core
  let style = ''
  let body = ''
  if (kind === 'needs') {
    style = themed('m', 'fill', AMBER_LIGHT, AMBER)
    body = `<polygon class="m" points="${r},0 ${DOT},${r} ${r},${DOT} 0,${r}"/>`
  } else if (kind === 'waiting') {
    style = themed('m', 'fill', accentLight(look.accent), look.accent)
    body = `<circle class="m" cx="${r}" cy="${r}" r="${r}"/>`
  } else if (kind === 'working') {
    // Dark: the mark grey, still at REDUCED_DOT_OPACITY
    const colours = `${themed('wr', 'stroke', GREY_TEXT_LIGHT, GREY)}${themed('wc', 'fill', GREY_TEXT_LIGHT, GREY)}`
    const mark = `<circle class="wr" cx="${r}" cy="${r}" r="${r - DOT_RING_W / 2}" fill="none" stroke-width="${DOT_RING_W}"/><circle class="wc" cx="${r}" cy="${r}" r="${DOT_CORE_R}"/>`
    const still = (cls: string): string => `.${cls}{opacity:${REDUCED_DOT_OPACITY_LIGHT}}@media (prefers-color-scheme: dark){.${cls}{opacity:${REDUCED_DOT_OPACITY}}}`
    if (look.motion) {
      // Motion allowed: the pulsing mark, plus a still twin that is hidden
      style = `${colours}.st{display:none}@media ${REDUCED_MOTION_QUERY}{.pl{display:none}.st{display:inline}${still('st')}}`
      const pulse = `<animate attributeName="opacity" values="1;${PULSE_LOW};1" dur="${PULSE_SECONDS}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>`
      body = `<g class="pl">${pulse}${mark}</g><g class="st">${mark}</g>`
    } else {
      // Motion set to reduced: the still mark only, no animation and no twin
      style = `${colours}${still('w')}`
      body = `<g class="w">${mark}</g>`
    }
  } else {
    body = `<circle cx="${r}" cy="${r}" r="${r - DOT_RING_W / 2}" fill="none" stroke="${GREY}" stroke-width="${DOT_RING_W}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${DOT}" height="${DOT}" viewBox="0 0 ${DOT} ${DOT}">${style === '' ? '' : `<style>${style}</style>`}${body}</svg>`
}

// A bar with its words always beside it
export function Bar({ Box, Text, Svg }: El, pct: number, key: string, words: string, widthPt: number, right?: string, mark?: number, busy?: boolean) {
  if (!Svg) return <Text key={key}>{words}</Text>
  if (right === undefined) {
    // The full-width bar is centred in a slot one text row high (BAR_SLOT)
    return (
      <Box key={key} height={rows(BAR_SLOT)} flexDirection="row" alignItems="center">
        <Box flexGrow={1} flexShrink={1}>
          <Svg source={pillSvg(pct, widthPt, undefined, mark, busy)} alt={words} height={mark === undefined ? BAR_H : MARK_H} />
        </Box>
      </Box>
    )
  }
  const barPt = widthPt - BAR_PCT_COL - BAR_PCT_GAP
  return (
    <Box key={key} height={rows(ROW_PT)} flexDirection="row" alignItems="center">
      <Box flexGrow={1} flexShrink={1}>
        <Svg source={pillSvg(pct, barPt, undefined, undefined, busy)} alt={words} height={BAR_H} />
      </Box>
      <Box width={cols(BAR_PCT_COL)} marginLeft={cols(BAR_PCT_GAP)} flexShrink={0} justifyContent="flex-end">
        <Text dimColor>{right}</Text>
      </Box>
    </Box>
  )
}

// The advice inside a card: a line and its dim detail line under it, one block of the card's body
export function Advice({ Box, Text }: El, key: string, title: string, detail?: string) {
  return (
    <Box key={key} flexDirection="column">
      <Text>{title}</Text>
      {detail === undefined ? null : <Text dimColor>{detail}</Text>}
    </Box>
  )
}

// THE FIRST-CLICK PRESS
export function FirstClick(el: El, key: string, onPress: () => void, look: 'row' | 'button' | 'lit', washPt?: number, scope?: string, boxPt?: number) {
  const { Box } = el
  if (!FIRST_CLICK_ON || !el.drag) return null
  const id = clientKey(key)
  // A Client the host said failed is left out: the host draws its error label in a failed Client's place
  if (faulted(id, Date.now())) return null
  registerPress(id, onPress)
  // The Client paints nothing
  const group = scope ?? (look === 'row' ? undefined : hoverScope(key))
  const high = boxPt ?? washPt
  const cells = high === undefined ? undefined : cellsOut(high)
  // While it is on, every Client is told to log its pointer events
  const log = pressLogOn()
  return (
    <Box key={`${id}-box`} position="absolute" top={0} left={0} right={0} {...(cells === undefined ? { bottom: 0 } : { height: cells })}>
      <el.Client key={id} module="../press.tsx" width="100%" height={cells ?? '100%'} props={{ look, ...(washPt === undefined ? {} : { h: washPt }), ...(cells === undefined ? {} : { r: cells }), ...(group === undefined ? {} : { scope: group }), ...(log ? { log: true } : {}) }} />
    </Box>
  )
}
// The hover of a part that presses, on the part's OWN Box
export const litBy = (el: El, key: string, fill: string = HOVER_FILL): { hover: { scope?: string; backgroundColor: string } } =>
  FIRST_CLICK_ON && el.drag ? { hover: { scope: hoverScope(key), backgroundColor: fill } } : { hover: { backgroundColor: fill } }
// A press's own box JOINS a hover group without painting
export const joins = (el: El, scope: string): { hover?: { scope: string } } => (FIRST_CLICK_ON && el.drag ? { hover: { scope } } : {})
// A Button that presses on the first click: it and its FirstClick in one Box
export function Pressable(el: El, key: string, button: Drawn, onPress: () => void, _tall = true, o: { edge?: boolean; inRow?: boolean; gap?: number } = {}) {
  const { Box } = el
  const own = o.inRow !== true
  const over = FirstClick(el, key, onPress, own ? 'button' : 'row', PRESS_ROW_H)
  if (over === null) return button
  const box = wordBox(labelOf(button), o.gap)
  return (
    <Box key={`fcw-${key}`} flexShrink={0} flexDirection="row" alignItems="center" justifyContent={o.edge === true ? 'flex-end' : 'flex-start'} height={rows(PRESS_ROW_H)} minWidth={cols(box.minW)} {...(own ? litBy(el, key) : {})} {...(o.edge === true && el.Svg ? { marginRight: cols(-EDGE_WORD_OUT_PT) } : {})}>
      {button}
      {over}
    </Box>
  )
}
// The press box of a lone word: its label (a Button is its label and BUTTON_PAD each side)
export const labelOf = (button: Drawn): string => {
  const label = (button as { props?: { label?: unknown } } | null)?.props?.label
  return typeof label === 'string' ? label : ''
}
export function wordBox(label: string, _gapPt?: number): { minW: number; grow: number } {
  const natural = label.length === 0 ? 0 : wordPt(label) + 2 * BUTTON_PAD
  return { minW: Math.max(natural, WORD_FOOT_W), grow: 0 }
}

// WHAT PRESSES AND HOW IT LOOKS: five kinds, one look each
export const framedHere = (el: El): boolean => FIRST_CLICK_ON && el.drag && el.Svg !== undefined
// A framed word as the footer measures it (wordBox, on the wide side)
export const framedLabel = (label: string): string => `\u00a0${label}\u00a0`
// THE ROUNDED FRAME
export const framePt = (word: string): number => Math.ceil(Math.max(WORD_FOOT_W, proportionalPt(word) + 2 * FRAME_PAD_X_PT) / COL_PT) * COL_PT
// The word is CENTRED in its frame (the press box centres its Button)
const framePics = new Map<string, string>()
const svgOf = (w: number, h: number, body: string): string => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const roundRect = (x: number, y: number, w: number, h: number, r: number, fill: string, share: number): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" fill-opacity="${share}"/>`
const accentRgb = (): string => look.accent.slice(0, 7)
export function frameSvg(widthPt: number, kind: 'rest' | 'hover' | 'chosen', h: number = PRESS_FRAME_H): string {
  const id = `${kind}|${widthPt}|${h}|${kind === 'chosen' ? look.accent : ''}`
  const kept = framePics.get(id)
  if (kept !== undefined) return kept
  const source = svgOf(widthPt, h, kind === 'chosen' ? roundRect(0, 0, widthPt, h, PRESS_WASH_R, accentRgb(), CHOSEN_FILL_SHARE) : roundRect(0, 0, widthPt, h, PRESS_WASH_R, PRESS_WASH_GREY, PRESS_WASH_OPACITY))
  framePics.set(id, source)
  return source
}
// Corner masks: a Box fill is square, so an always-drawn picture repaints what lies behind outside the rounded shape
export type Backdrop = 'card' | 'ground'
const roundPath = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
const boxPath = (w: number, h: number): string => `M0 0H${w}V${h}H0Z`
// Layered as the pane draws it: the ground, the card's grey, the track's grey, so the masks match at rest in either theme
function maskLayers(w: number, h: number, hole: string, on: Backdrop, track?: string): string {
  const out = `${boxPath(w, h)}${hole}`
  const ground = `<style>${themed('mg', 'fill', seen(GROUND_LIGHT), seen(GROUND_DARK))}</style><path class="mg" fill-rule="evenodd" d="${out}"/>`
  const card = on === 'card' ? `<path fill="${PRESS_WASH_GREY}" fill-opacity="${CARD_FILL_SHARE}" fill-rule="evenodd" d="${out}"/>` : ''
  const lane = track === undefined ? '' : `<path fill="${PRESS_WASH_GREY}" fill-opacity="${PRESS_WASH_OPACITY}" fill-rule="evenodd" d="${track}${hole}"/>`
  return `${ground}${card}${lane}`
}
// The frame and its masks in one picture, so a mask costs no element
export function maskedFrameSvg(widthPt: number, kind: 'rest' | 'chosen', h: number, boxH: number, on: Backdrop): string {
  const id = `masked|${kind}|${widthPt}|${h}|${boxH}|${on}|${kind === 'chosen' ? look.accent : ''}`
  const kept = framePics.get(id)
  if (kept !== undefined) return kept
  const frame = kind === 'chosen' ? roundRect(0, 0, widthPt, h, PRESS_WASH_R, accentRgb(), CHOSEN_FILL_SHARE) : roundRect(0, 0, widthPt, h, PRESS_WASH_R, PRESS_WASH_GREY, PRESS_WASH_OPACITY)
  const source = svgOf(widthPt, boxH, `${maskLayers(widthPt, boxH, roundPath(0, 0, widthPt, h, PRESS_WASH_R), on)}${frame}`)
  framePics.set(id, source)
  return source
}
// A Pick option's masks leave the chosen pill's shape, so its hover matches the chosen look
export function segMaskSvg(total: number, x: number, w: number, h: number, on: Backdrop): string {
  const id = `segmask|${total}|${x}|${w}|${h}|${on}`
  const kept = framePics.get(id)
  if (kept !== undefined) return kept
  const pill = roundPath(SEG_INSET_PT, SEG_INSET_PT, w - 2 * SEG_INSET_PT, h - 2 * SEG_INSET_PT, PRESS_WASH_R - SEG_INSET_PT)
  const source = svgOf(w, h, maskLayers(w, h, pill, on, roundPath(-x, 0, total, h, PRESS_WASH_R)))
  framePics.set(id, source)
  return source
}
// A picture laid under a press's words, out of the flow at the press box's top left. `reveal`
function FramePic(el: El, key: string, source: string, widthPt: number, reveal: boolean, alt: string, highPt: number = PRESS_FRAME_H) {
  const { Box, Svg } = el
  if (!Svg) return null
  return (
    <Box position="absolute" top={0} left={0} {...(reveal ? { display: 'none' as const, hover: { scope: hoverScope(key), display: 'flex' as const } } : {})}>
      <Svg source={source} alt={alt} width={widthPt} height={highPt} />
    </Box>
  )
}
// A FRAMED PRESS: one box, exactly its frame wide (framePt) and one framed press high
export function FramePress(el: El, key: string, word: string, onPress: () => void, o: { fill?: 'rest' | 'chosen'; dim?: boolean; reachPt?: number; lit?: string; highPt?: number; on?: Backdrop } = {}) {
  const { Box, Button } = el
  const w = framePt(word)
  const reach = o.reachPt ?? 0
  const tallPt = o.highPt ?? PRESS_FRAME_H
  const kind = o.fill === 'chosen' ? 'chosen' : 'rest'
  return (
    <Box key={`fcw-${key}`} flexShrink={0} flexDirection="row" alignItems="center" justifyContent="center" width={cols(w)} minWidth={cols(w)} height={rows(tallPt + reach)} {...(reach > 0 ? { paddingBottom: vstep(reach) } : {})} {...(o.lit === undefined ? litBy(el, key) : joins(el, o.lit))}>
      {/* A press lit with its row paints nothing, so it needs no masks */}
      {o.lit === undefined ? FramePic(el, key, maskedFrameSvg(w, kind, tallPt, tallPt + reach, o.on ?? 'card'), w, false, word, tallPt + reach) : FramePic(el, key, frameSvg(w, kind, tallPt), w, false, word, tallPt)}
      <Button key={key} label={word} plain hover={{ backgroundColor: HOVER_CLEAR }} {...(o.dim === true ? { dimColor: true } : {})} onPress={onPress} />
      {o.lit === undefined ? FirstClick(el, key, onPress, 'button', tallPt, undefined, tallPt + reach) : FirstClick(el, key, onPress, 'lit', tallPt, o.lit, tallPt + reach)}
    </Box>
  )
}
// A LINE OF FRAMED WORDS (the page footer: Arrange cards, Open in new window, Help, Settings)
export function FrameLine(el: El, key: string, items: { key: string; label: string; onPress: () => void }[], gapPt: number, reachPt = 0) {
  const { Box } = el
  return (
    // A wrapping row like the footer row it replaces: the caller lays only a line that fits
    <Box key={key} flexDirection="row" flexWrap="wrap" justifyContent="flex-end" alignItems="flex-start" flexShrink={0} columnGap={cols(gapPt)}>
      {/* Each word draws its own frame: one picture under the line would lie under the square fills, out of the masks' reach */}
      {items.map(a => FramePress(el, a.key, a.label, a.onPress, { reachPt, on: 'ground' }))}
    </Box>
  )
}
// A compact framed word: the rounded frame of FramePress
export function FramedWord(el: El, key: string, label: string, onPress: () => void, o: { edge?: boolean; inRow?: boolean; gap?: number; dim?: boolean; reachPt?: number; lit?: string; highPt?: number; on?: Backdrop } = {}) {
  const { Button } = el
  const { dim, edge, reachPt, lit, highPt, on, ...place } = o
  if (!framedHere(el)) return Pressable(el, key, <Button key={key} label={tr(label)} onPress={onPress} />, onPress, true, { ...place, ...(edge === undefined ? {} : { edge }) })
  return FramePress(el, key, tr(label), onPress, { ...(dim === true ? { dim } : {}), ...(reachPt === undefined ? {} : { reachPt }), ...(lit === undefined ? {} : { lit }), ...(highPt === undefined ? {} : { highPt }), ...(on === undefined ? {} : { on }) })
}
// A COMMIT BUTTON
export function ActionButton(el: El, key: string, label: string, onPress: () => void, o: { primary?: boolean; gap?: number } = {}) {
  const { Button } = el
  if (framedHere(el)) return FramePress(el, key, tr(label), onPress, { fill: o.primary === true ? 'chosen' : 'rest' })
  return Pressable(el, key, <Button key={key} label={tr(label)} variant={o.primary === true ? 'primary' : 'secondary'} onPress={onPress} />, onPress, true, o.gap === undefined ? {} : { gap: o.gap })
}
// A whole row that presses: over each text line of the row lies a see-through plain Button of blanks
export function PressCover(el: El, key: string, heightPt: number, widthPt: number, onPress: () => void, keyboard = true, scope?: string, client = true) {
  const { Box, Button, Svg } = el
  if (!Svg) return null
  // The row's box includes the wash area (washArea)
  const blanks = '\u00a0'.repeat(Math.max(1, Math.floor(((widthPt + 2 * PRESS_WASH_OUT * COL_PT) * PRESS_FILL - PRESS_INSET) / BLANK_PT)))
  // Fewer blanks than the box holds, the Button's padding on both sides counted
  const endBlanks = '\u00a0'.repeat(Math.max(1, Math.floor((PRESS_END_PT - 2 * PRESS_INSET - 4) / BLANK_PT)))
  const lines = Math.max(1, Math.ceil(heightPt / ROW_PT))
  // The cover Boxes do NOT clip (no overflow hidden)
  const first = client ? FirstClick(el, key, onPress, 'lit', undefined, scope, heightPt) : null
  const covers = Array.from({ length: first === null && client ? lines : 1 }, (_, n) => [
    <Box key={`cover-${key}-${n}`} position="absolute" top={n * PRESS_LINE_CELLS} left={0} right={0} height={PRESS_LINE_CELLS}>
      <Button key={`press-${key}-${n}`} label={blanks} plain hover={{ backgroundColor: HOVER_CLEAR }} onPress={onPress} />
    </Box>,
    first !== null || !client ? null : (
      <Box key={`cover-end-${key}-${n}`} position="absolute" top={n * PRESS_LINE_CELLS} right={0} width={cols(PRESS_END_PT)} height={PRESS_LINE_CELLS} justifyContent="flex-end">
        <Button key={`press-end-${key}-${n}`} label={endBlanks} plain hover={{ backgroundColor: HOVER_CLEAR }} onPress={onPress} />
      </Box>
    ),
  ]).flat()
  // `keyboard` false: another Button in the same row already runs this action from the keyboard (the switch of a switch row)
  return first === null ? covers : keyboard ? [...covers, first] : [first]
}
// The wash a pressable row shows under the pointer
export function PressWash({ Box, Svg, drag }: El, heightPt: number, widthPt: number) {
  if (!Svg) return null
  if (FIRST_CLICK_ON && drag) return null  // With the first-click Client over the row
  const w = widthPt + 2 * PRESS_WASH_OUT * COL_PT
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${heightPt}" viewBox="0 0 ${w} ${heightPt}"><rect width="${w}" height="${heightPt}" rx="${PRESS_WASH_R}" fill="${PRESS_WASH_GREY}" fill-opacity="${PRESS_WASH_OPACITY}"/></svg>`
  return (
    // No key on this Box: a reveal is scoped to the nearest keyed Box
    <Box position="absolute" top={0} left={0} right={0} bottom={0} display="none" hover={{ display: 'flex' }}>
      <Svg source={source} alt="" width={w} height={heightPt} />
    </Box>
  )
}
// A hairline between two groups of rows inside a card
export function GroupBreak({ Box, Svg }: El, key: string, widthPt: number, gap: number = GROUP_GAP, inGaps = false) {
  if (inGaps && !Svg) return null
  if (inGaps) gap = BLOCK_RULE_PT
  if (!Svg) return <Box key={key} marginTop={vstep(gap)} />
  // The picture has preserveAspectRatio="none"
  const top = (RULE_BOX_H - RULE_H) / 2
  // A picture is drawn in whole text columns, so one `widthPt` wide lost up to a column
  const wide = Math.ceil(widthPt + COL_PT)
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${wide}" height="${RULE_BOX_H}" viewBox="0 0 ${wide} ${RULE_BOX_H}"><rect y="${top}" width="${wide}" height="${RULE_H}" fill="${PRESS_WASH_GREY}" fill-opacity="${RULE_OPACITY}"/></svg>`
  return (
    // One box `gap` high (a whole number of half rows, on the grid), the line centred in it
    <Box key={key} height={rows(gap)} flexDirection="row" alignItems="center" overflow="hidden" {...(inGaps ? { marginTop: vstep(-BODY_ROW_GAP), marginBottom: vstep(-BODY_ROW_GAP) } : {})}>
      <Svg source={source} alt={t('access.divider')} width={wide} height={RULE_BOX_H} />
    </Box>
  )
}
// Where pictures exist the wash is PressWash
const pressHover = (el: El, key: string) => (el.Svg && !(FIRST_CLICK_ON && el.drag) ? {} : litBy(el, key))

// The box of a row that presses includes the wash area: PRESS_WASH_OUT columns of padding each side
export const washArea = (el: El): { marginLeft?: number; marginRight?: number; paddingLeft?: number; paddingRight?: number } =>
  el.Svg ? { marginLeft: -PRESS_WASH_OUT, marginRight: -PRESS_WASH_OUT, paddingLeft: PRESS_WASH_OUT, paddingRight: PRESS_WASH_OUT } : {}

// A line that opens ("What is this?"): its words, then the chevron at the right edge
export function OpenLine(el: El, key: string, content: Drawn, isOpen: boolean, onToggle: () => void, press?: { widthPt: number; lines?: number; right?: string; tall?: boolean; name?: string; scope?: string }) {
  // Tall is the default: a line that opens is a list row high (26 pt)
  const isTall = press?.tall !== false
  // A row of n lines is as tall as its text, n text rows plus the list row's own room once
  const heightPt = (press?.lines ?? 1) * ROW_PT + (isTall ? LIST_ROW_PAD_PT : 0)
  return Row(el, key, content, {
    ...(press?.right === undefined ? {} : { value: press.right }),
    chevron: { dir: isOpen ? 'down' : 'right', onToggle },
    ...(press === undefined ? {} : { press: { onPress: onToggle, widthPt: press.widthPt, heightPt, ...(press.scope === undefined ? {} : { scope: press.scope }) } }),
    ...(press?.name === undefined ? {} : { name: press.name }),
    ...(press !== undefined && isTall ? { minPt: heightPt } : {}),
  })
}

// THE ROW : the one shape of every row inside a card
export type RowOpts = {
  value?: string
  valueDim?: boolean
  note?: readonly string[]
  minPt?: number
  chevron?: { dir: 'right' | 'down'; onToggle: () => void }
  press?: { onPress: () => void; widthPt: number; heightPt: number; scope?: string }
  // The row's name for a reader (the alt of its chevron)
  name?: string
}
export function Row(el: El, key: string, label: Drawn, o: RowOpts = {}) {
  const { Box, Text } = el
  const notes = o.note ?? []
  const press = o.press
  const name = o.name ?? (typeof label === 'string' ? label : undefined)
  const row = (
    <Box key={notes.length === 0 || press !== undefined ? key : `${key}-row`} flexDirection="row" justifyContent="space-between" alignItems="center" {...(press === undefined ? {} : { ...(press.scope === undefined ? pressHover(el, key) : {}), ...washArea(el) })} {...(o.minPt === undefined ? {} : { minHeight: rows(o.minPt) })}>
      {press === undefined ? null : PressWash(el, press.heightPt, press.widthPt)}
      <Box flexGrow={1} flexShrink={1} overflow="hidden">
        {label}
      </Box>
      {o.value === undefined || o.value === '' ? null : (
        <Box flexShrink={0} marginLeft={cols(LIST_COL_GAP)}>
          <Text dimColor={o.valueDim === true}>{o.value}</Text>
        </Box>
      )}
      {o.chevron === undefined ? null : press === undefined ? Chevron(el, key, o.chevron.dir, o.chevron.onToggle, name) : ChevronMark(el, key, o.chevron.dir, o.chevron.onToggle, name)}
      {press === undefined ? null : PressCover(el, key, press.heightPt, press.widthPt, press.onPress, true, press.scope)}
    </Box>
  )
  if (notes.length === 0) return row
  return (
    <Box key={press === undefined ? key : `${key}-block`} flexDirection="column">
      {row}
      {notes.map((n, i) => (
        <Text key={`${key}-note-${i}`} dimColor>
          {n}
        </Text>
      ))}
    </Box>
  )
}

// What opens under a line: plain lines
export function WhatIsBody(el: El, key: string, lines: string[], button?: { label: string; onPress: () => void; go?: boolean }, actions: { key: string; label: string; onPress: () => void }[] = []) {
  const { Box, Text } = el
  const go = button !== undefined && button.go === true ? button : undefined
  const commit = button !== undefined && button.go !== true ? button : undefined
  // Two or more presses in the row: each may reach past its footprint by the gap between them at most
  const beside = (commit === undefined ? 0 : 1) + actions.length > 1 ? { gap: CARD_GAP_X } : {}
  return (
    <Box key={`${key}-open`} flexDirection="column" paddingLeft={cols(LIST_COL_GAP)}>
      {lines.map((l, n) => (
        <Text key={`${key}-l${n}`}>{l}</Text>
      ))}
      {go === undefined ? null : (
        <Box key={`${key}-go`} marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="column">
          {LinkButton(el, `${key}-set`, go.label, go.onPress, { row: true })}
        </Box>
      )}
      {commit === undefined && actions.length === 0 ? null : (
        <Box marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexWrap="wrap" columnGap={cols(CARD_GAP_X)}>
          {commit === undefined ? null : ActionButton(el, `${key}-set`, commit.label, commit.onPress, { primary: true, ...beside })}
          {actions.map((a, n) => ActionButton(el, a.key, a.label, a.onPress, { primary: commit === undefined && n === 0, ...beside }))}
        </Box>
      )}
    </Box>
  )
}

// The app's thin chevron as an exact picture, and pressable
export function chevronSvg(dir: 'right' | 'down' | 'left' | 'up', long = CHEVRON_LONG, short = CHEVRON_SHORT): { source: string; width: number; height: number } {
  const isSide = dir === 'right' || dir === 'left'
  const w = isSide ? short : long
  const h = isSide ? long : short
  const o = CHEVRON_STROKE / 2 + 0.1
  const paths = {
    right: `M${o} ${o} L${w - o} ${h / 2} L${o} ${h - o}`,
    left: `M${w - o} ${o} L${o} ${h / 2} L${w - o} ${h - o}`,
    down: `M${o} ${o} L${w / 2} ${h - o} L${w - o} ${o}`,
    up: `M${o} ${h - o} L${w / 2} ${o} L${w - o} ${h - o}`,
  }
  const path = paths[dir]
  return {
    source: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${path}" fill="none" stroke="${GREY}" stroke-width="${CHEVRON_STROKE}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    width: w,
    height: h,
  }
}

// A picture that presses: ONE box that is both the drawn control and the press (the click targets must match what they show)
function PressSlot(el: El, key: string, picture: { source: string; width: number; height: number } | undefined, alt: string, glyph: string, onPress: () => void, slotPt: number, inRow = false, gapPt?: number, lead = false) {
  const { Box, Button, Svg } = el
  if (!Svg || picture === undefined) return <Button key={`btn-${key}`} label={glyph} plain dimColor onPress={onPress} />
  // Beside another press (`gapPt` of air between them) the box reaches past its slot by that much at most
  const hitPt = Math.max(slotPt, gapPt === undefined ? HIT_ICON_W : Math.min(HIT_ICON_W, slotPt + gapPt))
  const blanks = Math.max(1, Math.round((hitPt - BUTTON_PAD) / BLANK_PT))
  // The box IS its footprint (the grid rule)
  return (
    <Box key={`slot-${key}`} width={cols(hitPt)} height={rows(HIT_MIN_H)} flexShrink={0} justifyContent={lead ? 'flex-start' : 'center'} alignItems="center" flexDirection="row" {...(inRow ? {} : litBy(el, `btn-${key}`))}>
      <Svg source={picture.source} alt={alt} width={picture.width} height={picture.height} />
      <Box position="absolute" top={0} bottom={0} left={0} justifyContent="center">
        <Button key={`btn-${key}`} label={'\u00a0'.repeat(blanks)} plain dimColor onPress={onPress} />
      </Box>
      {FirstClick(el, `btn-${key}`, onPress, inRow ? 'row' : 'button', HIT_MIN_H)}
    </Box>
  )
}

// What a reader says for a fold chevron or a row's chevron mark: the action and the row's name
export function foldAlt(dir: 'right' | 'down', name?: string): string {
  if (name === undefined || name === '') return tr(dir === 'right' ? 'Open' : 'Fold')
  return t(dir === 'right' ? 'access.open_name' : 'access.fold_name', { name })
}
// The sidebar's fold chevron, right after a label: always shown when folded (right)
export function Chevron(el: El, key: string, dir: 'right' | 'down', onPress: () => void, name?: string) {
  const { Box, Svg } = el
  const pic = chevronSvg(dir)
  const slot = PressSlot(el, `chev-${key}`, pic, foldAlt(dir, name), dir === 'right' ? '›' : '⌄', onPress, CHEVRON_SLOT, false, undefined, true)
  if (dir === 'down' && Svg) {
    return (
      // No key on these Boxes: the reveal is scoped to the nearest keyed Box, the card
      <Box marginLeft={cols(CHEVRON_GAP)} width={cols(CHEVRON_SLOT)} height={rows(HIT_MIN_H)} flexShrink={0} flexDirection="row" alignItems="center">
        <Svg source={faintSvg(pic.source)} alt="" width={pic.width} height={pic.height} />
        <Box position="absolute" top={0} left={0} display="none" hover={{ display: 'flex' }}>
          {slot}
        </Box>
      </Box>
    )
  }
  return (
    // No key on this Box: its hover reveal is scoped to the nearest keyed Box, the card
    <Box marginLeft={cols(CHEVRON_GAP)} flexShrink={0} {...(dir === 'down' ? { display: 'none', hover: { display: 'flex' } } : {})}>
      {slot}
    </Box>
  )
}

// The chevron of a row that presses as a whole: a mark only, so the row has one press target, not two
export function ChevronMark(el: El, key: string, dir: 'right' | 'down', onPress: () => void, name?: string) {
  const { Box, Svg } = el
  if (!Svg) return Chevron(el, key, dir, onPress, name)
  const pic = chevronSvg(dir)
  if (dir === 'down') {
    // Open: the chevron is always there, FAINT
    return (
      <Box marginLeft={cols(CHEVRON_GAP)} width={cols(CHEVRON_SLOT)} height={rows(ROW_PT)} flexShrink={0} justifyContent="center" alignItems="center">
        <Svg source={faintSvg(pic.source)} alt={foldAlt(dir, name)} width={pic.width} height={pic.height} />
      </Box>
    )
  }
  return (
    // No key on this Box, as in Chevron
    <Box marginLeft={cols(CHEVRON_GAP)} width={cols(CHEVRON_SLOT)} height={rows(ROW_PT)} flexShrink={0} justifyContent="center" alignItems="center">
      <Svg source={pic.source} alt={foldAlt(dir, name)} width={pic.width} height={pic.height} />
    </Box>
  )
}

export type IconKind = 'plus' | 'close' | 'more' | 'gear'

// The gear (flips a card to its settings): six wide teeth on a round body and a hole in the middle
const GEAR_OUTLINE = (() => {
  const c = ICON_GEAR / 2
  const pitch = (2 * Math.PI) / ICON_GEAR_TEETH
  const at = (r: number, a: number): string => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`
  const parts = Array.from({ length: ICON_GEAR_TEETH }, (_, n) => {
    const a = n * pitch - Math.PI / 2
    const foot = (ICON_GEAR_FOOT_SHARE * pitch) / 2
    const tip = (ICON_GEAR_TIP_SHARE * pitch) / 2
    const flank = `L${at(ICON_GEAR_TIP, a - tip)} L${at(ICON_GEAR_TIP, a + tip)} L${at(ICON_GEAR_ROOT, a + foot)}`
    const toNext = `A${ICON_GEAR_ROOT} ${ICON_GEAR_ROOT} 0 0 1 ${at(ICON_GEAR_ROOT, a + pitch - foot)}`
    return `${n === 0 ? `M${at(ICON_GEAR_ROOT, a - foot)} ` : ''}${flank} ${toNext}`
  })
  return `${parts.join(' ')} Z`
})()
// The app's icon buttons as exact pictures: plus 10 x 10 pt, close 8 x 8 pt
export function iconSvg(kind: IconKind): { source: string; width: number; height: number } {
  if (kind === 'plus') {
    const n = ICON_PLUS
    return { source: `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}"><style>.i{stroke:${ICON_COLOR}}@media (prefers-color-scheme: dark){.i{stroke:${ICON_COLOR_DARK}}}</style><path class="i" d="M${n / 2} 0 V${n} M0 ${n / 2} H${n}" stroke-width="${ICON_STROKE}" fill="none"/></svg>`, width: n, height: n }
  }
  if (kind === 'close') {
    const n = ICON_CLOSE
    return { source: `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}"><path d="M0.5 0.5 L${n - 0.5} ${n - 0.5} M${n - 0.5} 0.5 L0.5 ${n - 0.5}" stroke="${ICON_DIM}" stroke-width="${CHEVRON_STROKE}" stroke-linecap="round" fill="none"/></svg>`, width: n, height: n }
  }
  if (kind === 'gear') {
    const n = ICON_GEAR
    return { source: `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}"><style>.i{stroke:${ICON_COLOR}}@media (prefers-color-scheme: dark){.i{stroke:${ICON_COLOR_DARK}}}</style><g class="i" fill="none" stroke-width="${ICON_STROKE}" stroke-linejoin="round"><path d="${GEAR_OUTLINE}"/><circle cx="${n / 2}" cy="${n / 2}" r="${ICON_GEAR_HOLE}"/></g></svg>`, width: n, height: n }
  }
  const w = ICON_MORE_W
  const h = ICON_MORE_H
  return { source: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>.i{fill:${ICON_COLOR}}@media (prefers-color-scheme: dark){.i{fill:${ICON_COLOR_DARK}}}</style><circle class="i" cx="1" cy="1" r="1"/><circle class="i" cx="1" cy="4" r="1"/><circle class="i" cx="1" cy="7" r="1"/></svg>`, width: w, height: h }
}

// `faint`: the picture drawn at REST_MARK_OPACITY
export function IconButton(el: El, key: string, kind: IconKind, label: string, onPress: () => void, inRow = false, gapPt?: number, faint = false) {
  const full = iconSvg(kind)
  const pic = faint ? { ...full, source: faintSvg(full.source) } : full
  return PressSlot(el, `icon-${key}`, pic, tr(label), kind === 'plus' ? '+' : kind === 'close' ? '×' : kind === 'gear' ? tr('Settings') : '⋮', onPress, kind === 'gear' ? GEAR_SLOT : ICON_SLOT, inRow, gapPt)
}

// The switch of an on/off setting: off left, on right, the app's blue
const changedAt = new Map<string, number>()
export function markChanged(key: string, at: number = Date.now()): void {
  for (const [k, t] of changedAt) if (at - t > SWITCH_ANIM_WINDOW_MS) changedAt.delete(k)
  changedAt.set(key, at)
}
export function justChanged(key: string, now: number = Date.now()): boolean {
  const t = changedAt.get(key)
  return t !== undefined && now - t >= 0 && now - t <= SWITCH_ANIM_WINDOW_MS
}
export function forgetChanged(): void {
  changedAt.clear()
  flippedAt.clear()
}
// One press, one flip
const flippedAt = new Map<string, number>()
export function flipOnce(key: string, run: () => void, now: number = Date.now()): boolean {
  const before = flippedAt.get(key)
  if (before !== undefined && now >= before && now - before < FIRST_CLICK_REPEAT_MS) return false
  flippedAt.set(key, now)
  run()
  return true
}
// The engine does not say whether the Mac reduces motion
const motionOk = (): boolean => look.motion !== false

export function switchSvg(isOn: boolean, slide = false): { source: string; width: number; height: number } {
  const r = SWITCH_H / 2
  const left = SWITCH_INSET + SWITCH_KNOB / 2
  const right = SWITCH_W - SWITCH_INSET - SWITCH_KNOB / 2
  const cx = isOn ? right : left
  // On, the track is THE CHOSEN COLOUR: the theme accent, its light twin in light mode
  const track = isOn ? 'class="a"' : `fill="${PRESS_WASH_GREY}" fill-opacity="${SWITCH_OFF_OPACITY}"`
  // An off switch in light mode has a thin grey outline and a grey knob
  const offLight = isOn ? `<style>${themed('a', 'fill', accentLight(look.accent), look.accent)}</style>` : `<style>${themed('k', 'fill', SWITCH_OFF_KNOB_LIGHT, SWITCH_KNOB_FILL)}.o{stroke:${SWITCH_OFF_OUTLINE_LIGHT}}@media (prefers-color-scheme: dark){.o{stroke:none}}</style>`
  const outline = isOn ? '' : `<rect class="o" x="${SWITCH_OUTLINE_W / 2}" y="${SWITCH_OUTLINE_W / 2}" width="${SWITCH_W - SWITCH_OUTLINE_W}" height="${SWITCH_H - SWITCH_OUTLINE_W}" rx="${r - SWITCH_OUTLINE_W / 2}" fill="none" stroke-width="${SWITCH_OUTLINE_W}"/>`
  // The final geometry is always the real cx
  const move = slide ? `<animate attributeName="cx" from="${isOn ? left : right}" to="${cx}" dur="${SWITCH_SLIDE_MS}ms" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1"/>` : ''
  return {
    source: `<svg xmlns="http://www.w3.org/2000/svg" width="${SWITCH_W}" height="${SWITCH_H}" viewBox="0 0 ${SWITCH_W} ${SWITCH_H}">${offLight}<rect width="${SWITCH_W}" height="${SWITCH_H}" rx="${r}" ${track}/>${outline}<circle ${isOn ? '' : 'class="k" '}cx="${cx}" cy="${r}" r="${SWITCH_KNOB / 2}" fill="${SWITCH_KNOB_FILL}">${move}</circle></svg>`,
    width: SWITCH_W,
    height: SWITCH_H,
  }
}
// One on/off setting as a row: its label and dim note on the left, the switch at the right end
export function SwitchRow(el: El, id: string, label: string, note: string, isOn: boolean, nextValue: string, onFlip: () => void, widthPt: number, chip?: { word: string; on: boolean }) {
  const { Box, Text, Button, Svg } = el
  const pic = switchSvg(isOn, motionOk() && justChanged(`sw-${id}`))
  const flip = (): void => {
    flipOnce(`sw-${id}`, () => {
      markChanged(`sw-${id}`)
      markChanged(`chip-${id}`)
      onFlip()
    })
  }
  // One height for every setting row (settingRowMinPt, shared with ChoiceRow): a text row per line
  const heightPt = settingRowMinPt(note)
  // A terminal has no pictures
  if (!Svg) {
    return (
      <Box key={`row-${id}`} flexDirection="column">
        <Button key={`${id}-switch`} label={`${isOn ? '[x]' : '[ ]'} ${tr(label)}`} plain onPress={flip} />
        {note === '' ? null : <Text dimColor>{tr(note)}</Text>}
      </Box>
    )
  }
  return (
    <Box key={`row-${id}`} flexDirection="row" justifyContent="space-between" alignItems="flex-start" minHeight={rows(heightPt)} {...pressHover(el, `sw-${id}`)} {...washArea(el)}>
      {PressWash(el, heightPt, widthPt)}
      <Box flexDirection="column" flexGrow={1} flexShrink={1}>
        {/* The state chip sits in the TITLE line */}
        {chip === undefined ? (
          <Text>{tr(label)}</Text>
        ) : (
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" columnGap={cols(ICON_GAP)}>
            <Text>{tr(label)}</Text>
            {StateChip(el, `chip-${id}`, chip.word, chip.on)}
          </Box>
        )}
        {note === '' ? null : <Text dimColor>{tr(note)}</Text>}
      </Box>
      {PressCover(el, `sw-${id}`, heightPt, widthPt, flip, false)}
      {/* The switch has a press of its own, laid AFTER the row's */}
      <Box key={`swhit-${id}`} width={cols(SWITCH_HIT_W)} height={rows(PRESS_ROW_H)} flexShrink={0} marginRight={-PRESS_WASH_OUT} paddingRight={PRESS_WASH_OUT} justifyContent="flex-end" alignItems="center">
        {Svg ? <Svg source={pic.source} alt={t('access.name_state', { name: tr(label), state: tr(isOn ? 'On' : 'Off') })} width={pic.width} height={pic.height} /> : null}
        <Box position="absolute" top={0} left={0}>
          <Button key={`${id}-switch`} label={'\u00a0'.repeat(SWITCH_BLANKS)} plain hover={{ backgroundColor: HOVER_CLEAR }} onPress={flip} />
        </Box>
        {FirstClick(el, `swk-${id}`, flip, 'button', undefined, hoverScope(`sw-${id}`), PRESS_ROW_H)}
      </Box>
    </Box>
  )
}
// The least height of a setting row (a switch row and a choice row alike)
export const settingRowMinPt = (note: string): number => (note === '' ? 1 : 2) * ROW_PT
// A small control's label with blanks each side
export const padded = (label: string): string => `${'\u00a0'.repeat(HIT_PAD_BLANKS)}${label}${'\u00a0'.repeat(HIT_PAD_BLANKS)}`
// `‹ Back`: ONE part, so Back looks and presses the same in every view
export function BackButton(el: El, key: string, label: string, onPress: () => void, first = true, autoFocus = false) {
  const { Box, Button, Svg } = el
  if (!Svg) return <Button key={key} label={label} plain onPress={onPress} {...(autoFocus ? { autoFocus: true } : {})} />
  const word = label.replace(/^‹\s*/, '')
  const pic = chevronSvg('left', MORE_CHEVRON_LONG, MORE_CHEVRON_SHORT)
  const lead = '\u00a0'.repeat(Math.ceil((MORE_CHEVRON_SHORT + BACK_GAP) / BLANK_PT))
  return (
    // The part is one press row high (PRESS_ROW_H), the mark and the word both centred on that one row
    <Box key={`${key}-part`} flexDirection="row" alignItems="center" flexShrink={0} height={rows(first ? PRESS_FRAME_H : PRESS_ROW_H)} minWidth={cols(WORD_FOOT_W)} {...(first ? litBy(el, key) : {})}>
      {/* A place is in whole cells */}
      <Box position="absolute" top={0} bottom={0} left={0} paddingLeft={cols(BUTTON_PAD)} justifyContent="center">
        <Svg source={pic.source} alt={tr('Back')} width={pic.width} height={pic.height} />
      </Box>
      <Button key={key} label={`${lead}${word}${'\u00a0'.repeat(HIT_PAD_BLANKS)}`} plain onPress={onPress} {...(autoFocus ? { autoFocus: true } : {})} />
      {first ? FirstClick(el, key, onPress, 'button', undefined, undefined, PRESS_FRAME_H) : null}
    </Box>
  )
}
// THE TITLE ROW OF A VIEW (one recipe: Settings, Help, the card guide, the Agents view, Arranging)
export function ViewHeader(el: El, headKey: string, back: { key: string; label: string; onPress: () => void }, title: string, o: { right?: Drawn; dim?: boolean } = {}) {
  const { Box, Text } = el
  return (
    <Box key={headKey} flexDirection="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" minHeight={rows(PRESS_FRAME_H)}>
      <Box flexDirection="row" alignItems="center" height={rows(PRESS_FRAME_H)} columnGap={cols(LIST_COL_GAP)}>
        {BackButton(el, back.key, back.label, back.onPress, true, true)}
        {o.dim === true ? <Text dimColor>{title}</Text> : <Text bold>{title}</Text>}
      </Box>
      {o.right === undefined ? null : (
        <Box key={`${headKey}-link`} flexDirection="row" flexGrow={1} justifyContent="flex-end" height={rows(PRESS_FRAME_H)}>
          {o.right}
        </Box>
      )}
    </Box>
  )
}
// A small choice of two to four short options: ONE SEGMENTED CONTROL
export function Pick(el: El, key: string, options: { value: string; label: string; short?: string }[], value: string, onPick: (value: string) => void, _flush = false, boxKey = key, highPt: number = PRESS_FRAME_H, on: Backdrop = 'card') {
  const { Box, Button, Svg } = el
  if (framedHere(el) && Svg) {
    const words = options.map(o => tr(o.label))
    const widths = words.map(framePt)
    const total = widths.reduce((sum, w) => sum + w, 0)
    const at = options.findIndex(o => o.value === value)
    const x = widths.slice(0, Math.max(0, at)).reduce((sum, w) => sum + w, 0)
    return (
      <Box key={boxKey} flexDirection="row" alignItems="center" height={rows(highPt)} flexShrink={0}>
        <Box position="absolute" top={0} left={0}>
          <Svg source={segmentSvg(total, at < 0 ? undefined : { x, w: widths[at] ?? 0 }, highPt)} alt={at < 0 ? words.join(' | ') : t('access.name_selected', { name: words[at] ?? '' })} width={total} height={highPt} />
        </Box>
        {options.map((o, n) => {
          const id = `${key}-${o.value}`
          const chosen = n === at
          const pick = (): void => onPick(o.value)
          const w = widths[n] ?? WORD_FOOT_W
          const ox = widths.slice(0, n).reduce((sum, v) => sum + v, 0)
          return (
            // An option not chosen lights the way a row does
            <Box key={`fcw-${id}`} flexShrink={0} flexDirection="row" alignItems="center" justifyContent="center" width={cols(w)} minWidth={cols(w)} height={rows(highPt)} {...(chosen ? {} : litBy(el, id))}>
              {chosen ? null : FramePic(el, id, segMaskSvg(total, ox, w, highPt, on), w, false, words[n] ?? '', highPt)}
              <Button key={id} label={words[n] ?? ''} plain hover={{ backgroundColor: HOVER_CLEAR }} {...(chosen ? {} : { dimColor: true })} onPress={pick} />
              {/* The chosen option has no first-click press and no hover */}
              {chosen ? null : FirstClick(el, id, pick, 'button', highPt)}
            </Box>
          )
        })}
      </Box>
    )
  }
  return (
    <Box key={boxKey} flexDirection="row" alignItems="center" height={rows(highPt)} columnGap={cols(ICON_GAP / 2)} flexShrink={0}>
      {options.flatMap(o => {
        const chosen = o.value === value
        const pick = (): void => onPick(o.value)
        const word = tr(o.label)
        const button = chosen ? <Button key={`${key}-${o.value}`} label={`• ${word}`} variant="primary" onPress={pick} /> : <Button key={`${key}-${o.value}`} label={word} onPress={pick} />
        return [Pressable(el, `${key}-${o.value}`, button, pick, true, { gap: ICON_GAP / 2 }), chosen ? SaidChosen(el, `${key}-${o.value}`, word) : null]
      })}
    </Box>
  )
}
// The segmented control's one picture
export function segmentSvg(widthPt: number, chosen?: { x: number; w: number }, h: number = PRESS_FRAME_H): string {
  const id = `seg|${widthPt}|${h}|${chosen === undefined ? '' : `${chosen.x},${chosen.w}`}|${look.accent}`
  const kept = framePics.get(id)
  if (kept !== undefined) return kept
  const pill = chosen === undefined ? '' : roundRect(chosen.x + SEG_INSET_PT, SEG_INSET_PT, chosen.w - 2 * SEG_INSET_PT, h - 2 * SEG_INSET_PT, PRESS_WASH_R - SEG_INSET_PT, accentRgb(), CHOSEN_FILL_SHARE)
  const source = svgOf(widthPt, h, `${roundRect(0, 0, widthPt, h, PRESS_WASH_R, PRESS_WASH_GREY, PRESS_WASH_OPACITY)}${pill}`)
  framePics.set(id, source)
  return source
}
// The unseen picture that tells a screen reader which option is chosen (a Pick with pictures but no Client)
const SAID_SOURCE = `<svg xmlns="http://www.w3.org/2000/svg" width="${SAID_MARK_PT}" height="${SAID_MARK_PT}"/>`
function SaidChosen(el: El, key: string, name: string) {
  const { Box, Svg } = el
  if (!Svg) return null
  return (
    <Box key={`${key}-said`} position="absolute" top={0} left={0}>
      <Svg source={SAID_SOURCE} alt={t('access.name_selected', { name })} width={SAID_MARK_PT} height={SAID_MARK_PT} />
    </Box>
  )
}
// Does a settings row's label fit beside its chip and choices (ChoiceRow)?
export const choiceStacks = (widthPt: number, label: string, options: string[], chipWord?: string, note = ''): boolean => {
  const beside = CARD_GAP_X + choicesPt(options.map(o => tr(o))) + (chipWord === undefined ? 0 : chipPt(tr(chipWord)) + ICON_GAP)
  return textPt(tr(label)) + beside > widthPt || (note !== '' && widthPt - beside < Math.min(textPt(tr(note)), CHOICE_NOTE_MIN_PT))
}
// Choices that do not fit one line are cut into EVEN lines (7 choices in 2 lines: 4 and 3)
export const pickLines = <T extends { label: string }>(options: T[], widthPt: number): T[][] => {
  const split = (k: number): T[][] => {
    const base = Math.floor(options.length / k)
    const extra = options.length % k
    return Array.from({ length: k }, (_, n) => options.slice(n * base + Math.min(n, extra), (n + 1) * base + Math.min(n + 1, extra)))
  }
  for (let k = 1; k < options.length; k += 1) {
    if (Math.floor(options.length / k) < 2) continue
    const lines = split(k)
    if (lines.every(l => choicesPt(l.map(o => tr(o.label))) <= widthPt)) return lines
  }
  // Nothing fits: the most even lines of two or more (four or more choices)
  return split(options.length >= 4 ? Math.floor(options.length / 2) : options.length)
}
// THE ONE WAY TO WRAP CHOICES (the grid rule)
export function ChoiceLines<T extends { value: string; label: string; short?: string }>(el: El, key: string, options: T[], value: string, onPick: (value: string) => void, widthPt: number, align: 'start' | 'end') {
  const { Box } = el
  const lines = pickLines(options, widthPt)
  const flush = align === 'start'
  if (lines.length === 1) return Pick(el, key, options, value, onPick, flush)
  return (
    <Box key={`pk-${key}`} flexDirection="column" alignItems={flush ? 'flex-start' : 'flex-end'}>
      {lines.map((line, n) => Pick(el, key, line, value, onPick, flush, `${key}-line${n}`))}
    </Box>
  )
}
// THE RADIO MARK: the macOS radio button as a picture, RADIO_PT round
const radioOnMemo = new Map<string, string>()
const radioOn = (accent: string): string => {
  const was = radioOnMemo.get(accent)
  if (was !== undefined) return was
  const r = RADIO_PT / 2
  const pic = `<svg xmlns="http://www.w3.org/2000/svg" width="${RADIO_PT}" height="${RADIO_PT}" viewBox="0 0 ${RADIO_PT} ${RADIO_PT}"><style>${themed('a', 'fill', accentLight(accent), accent)}</style><circle class="a" cx="${r}" cy="${r}" r="${r}"/><circle cx="${r}" cy="${r}" r="${RADIO_DOT_PT / 2}" fill="${SWITCH_KNOB_FILL}"/></svg>`
  radioOnMemo.set(accent, pic)
  return pic
}
const RADIO_OFF = (() => {
  const r = RADIO_PT / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${RADIO_PT}" height="${RADIO_PT}" viewBox="0 0 ${RADIO_PT} ${RADIO_PT}"><style>${themed('r', 'stroke', SWITCH_OFF_OUTLINE_LIGHT, GREY)}</style><circle class="r" cx="${r}" cy="${r}" r="${r - RADIO_RING_W / 2}" fill="none" stroke-width="${RADIO_RING_W}"/></svg>`
})()
export const radioSvg = (chosen: boolean): string => (chosen ? radioOn(look.accent) : RADIO_OFF)
// THE RADIO LIST
export function RadioList(el: El, key: string, options: { value: string; label: string; tag?: string; summary?: string }[], value: string, onPick: (value: string) => void, widthPt: number) {
  const { Box, Text, Button, Svg } = el
  // The letters start RADIO_PT + RADIO_TEXT_GAP after the text edge: the mark
  const markGap = cols(Math.max(0, RADIO_TEXT_GAP - BUTTON_PAD))
  const tags = options.every(o => o.tag === undefined || RADIO_PT + RADIO_TEXT_GAP + textPt(tr(o.label)) + LIST_COL_GAP + textPt(tr(o.tag)) + HEADER_SLACK_PT <= widthPt)
  return (
    <Box key={`radio-${key}`} flexDirection="column">
      {options.flatMap(o => {
        const id = `${key}-${o.value}`
        const chosen = o.value === value
        const pick = (): void => onPick(o.value)
        const name = tr(o.label)
        return [
          <Box key={`radio-${id}`} flexDirection="row" alignItems="center" height={rows(PRESS_FRAME_H)} {...pressHover(el, id)} {...washArea(el)}>
            {Svg ? (
              <Box width={cols(RADIO_PT)} marginRight={markGap} flexShrink={0} alignItems="center" justifyContent="center">
                <Svg source={radioSvg(chosen)} alt={chosen ? t('access.name_selected', { name }) : name} width={RADIO_PT} height={RADIO_PT} />
              </Box>
            ) : null}
            {/* The Button sits straight in the row */}
            <Button key={id} label={Svg ? name : `${chosen ? '(\u2022)' : '( )'} ${name}`} plain onPress={pick} />
            {!tags || o.tag === undefined || o.tag === '' ? null : (
              <Box flexGrow={1} flexShrink={0} flexDirection="row" justifyContent="flex-end" marginLeft={cols(LIST_COL_GAP)}>
                <Text dimColor>{tr(o.tag)}</Text>
              </Box>
            )}
            {FirstClick(el, id, pick, 'button', undefined, undefined, PRESS_FRAME_H)}
          </Box>,
          chosen && o.summary !== undefined && o.summary !== '' ? (
            <Box key={`radio-${id}-summary`} paddingLeft={Svg ? cols(RADIO_PT + RADIO_TEXT_GAP) : 0}>
              <Text dimColor>{tr(o.summary)}</Text>
            </Box>
          ) : null,
        ]
      })}
    </Box>
  )
}
// The chip of a header that holds a title and a chip only
export const headerChip = (innerPt: number, title: string, forms: string[]): string =>
  forms.find(f => !headerWraps(innerPt, { title, fold: false, restPt: chipPt(tr(f)) + ICON_GAP })) ?? forms.find(f => chipPt(tr(f)) <= innerPt) ?? forms[forms.length - 1] ?? ''
// The width of a Pick's segments side by side, and of a padded word button (a LinkButton), in points
export const pickWidthPt = (labels: string[]): number => pickPt(labels.map(l => tr(l)))
export const linkWidthPt = (label: string): number => buttonPt(tr(label))
// A word link in a card or view ("Open Settings ›", "Change in Settings")
export function LinkButton(el: El, key: string, label: string, onPress: () => void, o: { dim?: boolean; row?: boolean; chevron?: boolean; widthPt?: number; on?: Backdrop } = {}) {
  const { Box, Button, Text, Svg } = el
  if (o.row === true && Svg) {
    const words = tr(label).replace(/\s*›$/, '')
    // A press's words are never dim: every row link is full strength unless a caller says `dim: true`
    const dim = o.dim === true
    const lines = o.chevron !== true || o.widthPt === undefined ? 1 : wrappedLines(words, o.widthPt)
    // One text row a line, as every whole-row press of a card body
    const highPt = lines * ROW_PT
    const pic = chevronSvg('right')
    const named = foldAlt('right', words)
    const button = <Button key={key} label={words} plain hover={{ backgroundColor: HOVER_CLEAR }} {...(dim ? { dimColor: true } : {})} onPress={onPress} />
    // One line: the words ARE the keyboard Button (the Tab stop is named by them, the row's one press)
    return (
      <Box key={`linkrow-${key}`} flexDirection="row" alignItems="center" justifyContent="space-between" minHeight={rows(highPt)} {...pressHover(el, key)} {...washArea(el)} {...(lines === 1 ? { paddingLeft: PRESS_WASH_OUT - cols(BUTTON_PAD) } : {})}>
        {lines === 1 ? (
          o.chevron === true ? (
            <Box flexGrow={1} flexShrink={1} flexDirection="row" justifyContent="flex-start">
              {button}
            </Box>
          ) : (
            button
          )
        ) : (
          [
            <Box key={`${key}-tab`} position="absolute" top={0} left={0}>
              <Button key={key} label={' '.repeat(Math.max(1, Math.round(WORD_FOOT_W / BLANK_PT)))} plain hover={{ backgroundColor: HOVER_CLEAR }} onPress={onPress} />
            </Box>,
            <Box key={`${key}-words`} flexGrow={1} flexShrink={1}>
              <Text dimColor={dim}>{words}</Text>
            </Box>,
          ]
        )}
        {/* The chevron mark at the row END (the place of every Row chevron) */}
        <Box marginLeft={cols(CHEVRON_GAP)} width={cols(CHEVRON_SLOT)} height={rows(ROW_PT)} flexShrink={0} justifyContent="center" alignItems="center">
          <Svg source={pic.source} alt={named} width={pic.width} height={pic.height} />
        </Box>
        {FirstClick(el, key, onPress, 'button', undefined, undefined, highPt)}
      </Box>
    )
  }
  if (o.row === true && o.chevron === true) return <Button key={key} label={`${tr(label).replace(/\s*›$/, '')} ›`} plain onPress={onPress} />
  if (o.row === true) {
    // A terminal: no pictures and no pointer
    return (
      <Box key={`linkrow-${key}`} flexDirection="row" justifyContent="space-between" alignItems="center" minHeight={rows(LIST_ROW_H)} {...pressHover(el, key)}>
        <Button key={key} label={tr(label).replace(/\s*›$/, '')} plain {...(o.dim === true ? { dimColor: true } : {})} onPress={onPress} />
        <Box marginLeft={cols(CHEVRON_GAP)} width={cols(CHEVRON_SLOT)} height={rows(ROW_PT)} flexShrink={0} justifyContent="center" alignItems="center">
          <Text dimColor>›</Text>
        </Box>
      </Box>
    )
  }
  // Not a row: a compact framed word
  return (
    <Box key={`link-${key}`} flexDirection="row" flexShrink={0}>
      {FramedWord(el, key, label, onPress, { dim: o.dim === true, ...(o.on === undefined ? {} : { on: o.on }) })}
    </Box>
  )
}
// A words-only press in a card's body ("Focus 50 min ›", "Run several tasks ›")
export const flushLeft = (el: El): { marginLeft?: number } => (el.Svg ? { marginLeft: cols(-BUTTON_PAD) } : {})

// One rule for every card header: buttons are never cut; the note yields to its short form, then is dropped (never cut with an ellipsis)
export type HeaderFit = { note: string; pickShort: boolean; pickOwnLine: boolean }
const wordPt = (s: string): number => s.length * COL_PT
const textPt = (s: string): number => s.length * TEXT_CHAR_PT
// How many lines words take in `widthPt` of row, greedy on words, letter by letter (glyphPt)
const NARROW_LETTERS = "ijl.,:;'!|"
const THIN_LETTERS = 't' + 'fr' + 'I()-/'
const WIDE_LETTERS = 'mwMW'
export const glyphPt = (c: string): number =>
  c === ' ' ? TEXT_SPACE_PT : NARROW_LETTERS.includes(c) ? TEXT_NARROW_PT : THIN_LETTERS.includes(c) ? TEXT_THIN_PT : WIDE_LETTERS.includes(c) ? TEXT_WIDE_PT : c >= 'A' && c <= 'Z' ? TEXT_CAP_PT : TEXT_ROUND_PT
const proportionalPt = (s: string): number => [...s].reduce((sum, c) => sum + glyphPt(c), 0)
const linesIn = (text: string, roomPt: number): number => {
  const room = Math.max(TEXT_CHAR_PT, roomPt)
  let n = 1
  let used = 0
  for (const word of text.split(' ')) {
    const w = proportionalPt(word)
    if (used > 0 && used + TEXT_SPACE_PT + w > room) {
      n += 1
      used = w
    } else used += (used > 0 ? TEXT_SPACE_PT : 0) + w
  }
  return n
}
// The row holds the words, then the chevron and the gap before it
export const wrappedLines = (text: string, widthPt: number): number => linesIn(text, widthPt - CHEVRON_SLOT - CHEVRON_GAP)
// A note line (a dim sentence with no value beside it)
export function noteFit(text: string, widthPt: number): { text: string; lines: number } {
  const lines = linesIn(text, widthPt)
  if (lines <= NOTE_MAX_LINES) return { text, lines }
  const room = Math.max(TEXT_CHAR_PT, widthPt)
  const words = text.split(' ')
  let n = 1
  let used = 0
  let cut = 0
  let last = ''
  for (let i = 0; i < words.length - 1; i += 1) {
    // Word i as the last one shown: its trailing stops and dashes taken off, then the "…"
    const end = `${(words[i] ?? '').replace(/[.,;:·-]+$/, '')}…`
    const e = proportionalPt(end)
    const endLine = used > 0 && used + TEXT_SPACE_PT + e > room ? n + 1 : n
    if (end !== '…' && endLine <= NOTE_MAX_LINES) {
      cut = i
      last = end
    }
    const w = proportionalPt(words[i] ?? '')
    if (used > 0 && used + TEXT_SPACE_PT + w > room) {
      n += 1
      used = w
    } else used += (used > 0 ? TEXT_SPACE_PT : 0) + w
    if (n > NOTE_MAX_LINES) break
  }
  return last === '' ? { text: words[0] ?? '', lines: NOTE_MAX_LINES } : { text: [...words.slice(0, cut), last].join(' '), lines: NOTE_MAX_LINES }
}
const boldPt = (s: string): number => s.length * BOLD_CHAR_PT
const buttonPt = (label: string): number => wordPt(label) + 2 * HIT_PAD_BLANKS * COL_PT
// The choices of a settings row or a line of choices as drawn, on the wide side
const choicesPt = (labels: string[]): number => labels.reduce((sum, l) => sum + Math.max(WORD_FOOT_W, buttonPt(l) + 2 * COL_PT), 0) + Math.max(0, labels.length - 1) * (ICON_GAP / 2)
const chipPt = (shown: string): number => Math.round(shown.length * CHIP_CHAR_PT + 2 * CHIP_PAD)
const pickPt = (labels: string[]): number => labels.reduce((sum, l) => sum + buttonPt(l), 0) + Math.max(0, labels.length - 1) * (ICON_GAP / 2)
// The last tab of a Pick whose label ends in a name ("This project: my-app")
export function nameTabLabel(widthPt: number, others: string[], head: string, name: string): string {
  for (let n = name.length; n >= 3; n -= 1) {
    const shown = n === name.length ? name : `${name.slice(0, n - 1)}…`
    if (pickPt([...others, `${head}: ${shown}`]) <= widthPt) return `${head}: ${shown}`
  }
  return head
}
// Do the title and the controls of a plain card header (no Pick) not fit one row of `innerPt`? `restPt` is the controls' width
export const headerWraps = (innerPt: number, h: { title: string; fold: boolean; restPt: number }): boolean => boldPt(h.title) + (h.fold ? CHEVRON_SLOT + CHEVRON_GAP : 0) + LIST_COL_GAP + h.restPt + HEADER_SLACK_PT > innerPt
export function headerFit(innerPt: number, h: { title: string; fold: boolean; note: string; noteShort?: string; pick?: { label: string; short?: string }[]; restPt: number }): HeaderFit {
  const fixed = boldPt(h.title) + (h.fold ? CHEVRON_SLOT + CHEVRON_GAP : 0) + LIST_COL_GAP + h.restPt
  const minNote = h.noteShort === undefined ? 0 : textPt(h.noteShort) + ICON_GAP
  const full = h.pick === undefined ? 0 : pickPt(h.pick.map(o => o.label)) + ICON_GAP
  const short = h.pick === undefined ? 0 : pickPt(h.pick.map(o => o.short ?? o.label)) + ICON_GAP
  const wantShort = h.pick !== undefined && fixed + full + minNote > innerPt
  const ownLine = wantShort && fixed + short + minNote > innerPt
  const used = ownLine ? 0 : wantShort ? short : full
  const room = innerPt - fixed - used - ICON_GAP
  const fits = (s: string): boolean => textPt(s) <= room
  // Whole, else its short form, else dropped: a header note is never cut with an ellipsis (the Glance controls row keeps the same rule, glanceNote).
  const note = fits(h.note) ? h.note : h.noteShort !== undefined && fits(h.noteShort) ? h.noteShort : ''
  return { note, pickShort: wantShort && !ownLine, pickOwnLine: ownLine }
}

// The note of an open Glance card's controls row: whole, else its short form
const glanceRestPt = (o: CardOpts): number =>
  (o.more === undefined ? 0 : buttonPt(moreWord(o.more, true)) + ICON_GAP) +
  (o.jump === undefined ? 0 : buttonPt(tr(o.jump.label)) + ICON_GAP) +
  (o.chip === undefined ? 0 : chipPt(tr(o.chip.word)) + ICON_GAP) +
  (o.actions ?? []).length * (ICON_SLOT + ICON_GAP)
export function glancePickFit(innerPt: number, o: CardOpts): { short: boolean; ownLine: boolean } {
  if (o.pick === undefined) return { short: false, ownLine: false }
  const rest = glanceRestPt(o)
  const full = pickPt(o.pick.options.map(x => tr(x.label))) + ICON_GAP
  const short = pickPt(o.pick.options.map(x => tr(x.short ?? x.label))) + ICON_GAP
  const wantShort = rest + full > innerPt
  // On its own line the Pick keeps its long labels when they fit there, else the short forms
  return { short: wantShort && (rest + short <= innerPt || full > innerPt), ownLine: wantShort && rest + short > innerPt }
}
// The other controls get the same rule: when the Pick (in its form above), the More or Less, the gear
const sidePt = (o: CardOpts): number =>
  (o.jump === undefined ? 0 : buttonPt(tr(o.jump.label)) + ICON_GAP) + (o.chip === undefined ? 0 : chipPt(tr(o.chip.word)) + ICON_GAP) + (o.actions ?? []).length * (ICON_SLOT + ICON_GAP)
export function glanceControlsFit(innerPt: number, o: CardOpts): { pickShort: boolean; pickOwnLine: boolean; split: boolean; lines: number[] } {
  const fit = glancePickFit(innerPt, o)
  const pickRow = o.pick === undefined ? 0 : pickPt(o.pick.options.map(x => tr(fit.short ? (x.short ?? x.label) : x.label))) + ICON_GAP
  const main = (fit.ownLine ? 0 : pickRow) + glanceRestPt(o)
  const side = sidePt(o)
  const split = side > 0 && main > innerPt
  return { pickShort: fit.short, pickOwnLine: fit.ownLine, split, lines: [...(fit.ownLine ? [pickRow] : []), ...(split ? [side, main - side] : [main])] }
}
export function glanceNote(innerPt: number, note: string, noteShort: string | undefined, o: CardOpts): string {
  if (note === '') return ''
  const fit = glancePickFit(innerPt, o)
  if (glanceControlsFit(innerPt, o).split) return ''
  // The note goes before the Pick gives anything up
  if (fit.short || fit.ownLine) return ''
  const controls =
    (o.pick === undefined || fit.ownLine ? 0 : pickPt(o.pick.options.map(x => tr(fit.short ? (x.short ?? x.label) : x.label))) + ICON_GAP) +
    (o.more === undefined ? 0 : buttonPt(moreWord(o.more, true)) + ICON_GAP) +
    (o.jump === undefined ? 0 : buttonPt(tr(o.jump.label)) + ICON_GAP) +
    (o.chip === undefined ? 0 : chipPt(tr(o.chip.word)) + ICON_GAP) +
    (o.actions ?? []).length * (ICON_SLOT + ICON_GAP)
  const room = innerPt - controls
  return textPt(note) <= room ? note : noteShort !== undefined && textPt(noteShort) <= room ? noteShort : ''
}

// A control that shows while the pointer is over its card
export function HoverReveal(el: El, control: Drawn, at?: number, rest = false): Drawn {
  const { Box, Svg, drag } = el
  const where = at === undefined ? {} : { position: 'absolute' as const, top: 0, left: 0, marginLeft: at }
  if (!Svg || !drag || rest) return at === undefined ? control : <Box {...where}>{control}</Box>
  return (
    <Box width={cols(GEAR_SLOT)} height={rows(HIT_MIN_H)} flexShrink={0} {...where}>
      <Box display="none" hover={{ display: 'flex' }}>
        {control}
      </Box>
    </Box>
  )
}
// A picture drawn faint, for a mark at rest: the same picture at REST_MARK_OPACITY
export const faintSvg = (source: string): string => source.replace('<svg ', `<svg opacity="${REST_MARK_OPACITY}" `)

// The Glance row: a card's one-row form
export type GlanceOpts = { value: string; dot: GlanceDot; isOpen: boolean; widthPt: number; onPress: () => void; back?: string; fresh?: boolean; unknown?: boolean }
const GLANCE_KIND: Record<GlanceDot, DotKind> = { neutral: 'idle', accent: 'waiting', amber: 'needs' }
// What a reader hears for a Glance dot: the state in words, by the dot's kind (the table's row names)
const GLANCE_DOT_WORD: Record<DotKind, string> = { needs: 'common.needs_you', waiting: 'access.dot_active', working: 'access.dot_active', idle: 'access.dot_calm' }
// An open card's More or Less (at the Glance look it says Fold) sits on the Glance row itself
export function glanceMoreUp(_title: string, g: GlanceOpts, o: CardOpts): boolean {
  return g.isOpen && o.more !== undefined && g.back === undefined
}
// What an open card's More or Less takes from its Glance row: the gap before it and the button
export const glanceTrailPt = (more: { isFull: boolean; same?: boolean } | undefined): number => (more === undefined ? 0 : ICON_GAP + buttonPt(moreWord({ ...more, onPress: () => {} }, true)))
// The card's gear sits on this row, right after the title
export function gearReserve(title: string, g: GlanceOpts, trailPt = 0): number {
  const chip = g.fresh === true ? chipPt('new') + ICON_GAP : 0
  const value = g.back === undefined ? textPt(g.value) : 0
  const used = boldPt(tr(title)) + GLANCE_VALUE_GAP + chip + value + GLANCE_DOT_GAP + DOT + CHEVRON_GAP + CHEVRON_SLOT + trailPt
  return Math.max(0, Math.min(GEAR_SLOT, g.widthPt - used))
}
// Whether the headline value fits its Glance row whole: the row less the title, the "new" chip
export const glanceValueFits = (title: string, g: GlanceOpts, trailPt = 0): boolean =>
  g.back !== undefined || textPt(g.value) <= g.widthPt - boldPt(tr(title)) - GLANCE_VALUE_GAP - (g.fresh === true ? chipPt('new') + ICON_GAP : 0) - GLANCE_DOT_GAP - DOT - CHEVRON_GAP - CHEVRON_SLOT - trailPt
// What the "new" chip takes from a Glance row (the room glanceValueFits takes for it)
export const glanceChipPt = (fresh: boolean | undefined): number => (fresh === true ? chipPt('new') + ICON_GAP : 0)
// `whole`: the card is closed and presses as a whole (its Client and its hover are the card's, Card)
export function GlanceRow(el: El, key: string, title: string, g0: GlanceOpts, trail?: Drawn, gear?: (at: number) => Drawn, whole = false, trailPt = 0, trailUnder = false) {
  const { Box, Text, Button, Svg } = el
  // The headline value is whole or not drawn: a value that does not fit beside the title, the dot
  const g = glanceValueFits(title, g0, trailPt) ? g0 : { ...g0, value: '' }
  const foldWord = g.isOpen && trail !== undefined && trail !== null && Svg !== undefined
  const kind = GLANCE_KIND[g.dot]
  const plain = kind === 'needs' ? '◆' : kind === 'waiting' ? '●' : '○'
  return (
    <Box key={key} flexDirection="row" justifyContent="space-between" alignItems="center" minHeight={rows(GLANCE_ROW_H)} {...(whole ? {} : pressHover(el, key))} {...washArea(el)}>
      {PressWash(el, GLANCE_ROW_H, g.widthPt)}
      {/* Back is first, top left */}
      {g.back === undefined ? null : BackButton(el, `back-${key}`, g.back, g.onPress, false)}
      <Box flexShrink={0} marginRight={cols(GLANCE_VALUE_GAP) + (gear === undefined ? 0 : cols(gearReserve(title, g, trailPt)))} {...(g.back === undefined ? {} : { marginLeft: cols(GLANCE_VALUE_GAP) })}>
        <Text bold>{tr(title)}</Text>
      </Box>
      {/* The right cluster: the "new" chip, then the headline value */}
      <Box flexGrow={1} flexShrink={1} overflow="hidden" flexDirection="row" justifyContent="flex-end" alignItems="center" columnGap={cols(ICON_GAP)}>
        {g.fresh === true ? StateChip(el, `fresh-${key}`, 'new', true) : null}
        {g.back === undefined && g.value !== '' ? <Text wrap="truncate-end">{g.value}</Text> : null}
      </Box>
      <Box flexShrink={0} marginLeft={cols(GLANCE_DOT_GAP)} width={cols(DOT)} alignItems="center" {...(foldWord ? { marginRight: cols(GLANCE_DOT_GAP) } : {})}>
        {Svg ? <Svg source={dotSvg(kind)} alt={t(g.unknown === true ? 'access.dot_unknown' : GLANCE_DOT_WORD[kind])} width={DOT} height={DOT} /> : <Text dimColor>{plain}</Text>}
      </Box>
      {/* An open card whose header shows its Fold */}
      {foldWord ? null : ChevronMark(el, key, g.isOpen ? 'down' : 'right', g.onPress, tr(title))}
      {/* A Fold word with no press of its own (FoldMark) is laid BEFORE the cover */}
      {trailUnder ? trail ?? null : null}
      {PressCover(el, key, GLANCE_ROW_H, g.widthPt, g.onPress, true, undefined, !whole)}
      {gear === undefined ? null : gear(PRESS_WASH_OUT + cols(boldPt(tr(title))))}
      {/* The card's More or Less is laid after the cover */}
      {trailUnder ? null : trail ?? null}
    </Box>
  )
}

// The fact row: the tidy form of an open card's rows
export function FactRow(el: El, key: string, label: string, value: string, o: { dim?: boolean; note?: readonly string[]; widthPt?: number } = {}) {
  const { Text } = el
  const isNote = value === ''
  return Row(
    el,
    key,
    <Text dimColor={isNote && o.dim === true} wrap={isNote ? 'wrap' : 'truncate-end'}>
      {isNote && o.widthPt !== undefined ? noteFit(label, o.widthPt).text : label}
    </Text>,
    { value, ...(o.note === undefined ? {} : { note: o.note }), minPt: LIST_ROW_H },
  )
}

// `fold` makes the card foldable like a group in the sidebar
export type CardAction = { kind: IconKind; label: string; onPress: () => void }
// `pick` is a small choice at the right end of the header
export type MoreOpt = { isFull: boolean; onPress: () => void; same?: boolean }
const moreWord = (m: MoreOpt, glance = false): string => tr(m.same === true || (glance && m.isFull) ? 'Fold' : m.isFull ? 'Show less' : 'Show more')
export type CardOpts = { active?: boolean; grow?: boolean; fold?: { open: boolean; onToggle: () => void }; actions?: CardAction[]; pick?: { key: string; options: { value: string; label: string; short?: string }[]; value: string; onPick: (value: string) => void }; noteShort?: string; widthPt?: number; more?: MoreOpt; chip?: { word: string; on: boolean }; jump?: { label: string; onPress: () => void }; glance?: GlanceOpts; flip?: { onPress: () => void }; headPress?: () => void; whole?: boolean; lead?: Drawn }

// Whether a card's header holds more than one press (an icon beside another icon, a jump or the More word)
const crowded = (o: CardOpts): boolean => (o.actions ?? []).length + (o.jump === undefined ? 0 : 1) + (o.more === undefined ? 0 : 1) + (o.pick === undefined ? 0 : 1) > 1

// A card's jump ("Open settings"): a header control, so a compact framed word, one press row high
function jumpButton(el: El, key: string, jump: { label: string; onPress: () => void }, edge = false) {
  return FramedWord(el, `jump-${key}`, jump.label, jump.onPress, { edge, gap: ICON_GAP, highPt: PRESS_ROW_H })
}

// A card's More, Less or Fold: a compact framed word at the end of the header
function moreButton(el: El, key: string, more: MoreOpt, shut?: () => void, o: { edge?: boolean; inRow?: boolean } = {}) {
  if (more.same === true && shut === undefined) return null
  const run = more.same === true ? (shut ?? more.onPress) : more.isFull && shut !== undefined ? () => { more.onPress(); shut() } : more.onPress
  // A word in its Glance row (More, Less, Fold) lights with that row and draws no hover picture of its own
  if (o.inRow === true && shut !== undefined && more.same === true && framedHere(el)) return FoldMark(el, `detail-${key}`, moreWord(more, true))
  return FramedWord(el, `detail-${key}`, moreWord(more, shut !== undefined), run, { ...o, gap: ICON_GAP, highPt: PRESS_ROW_H, ...(o.inRow === true ? { lit: hoverScope(`glance-${key}`) } : {}) })
}
// The Fold word of an open card's Glance row
function FoldMark(el: El, key: string, label: string) {
  const { Box, Text } = el
  const word = tr(label)
  const w = framePt(word)
  return (
    <Box key={`fcw-${key}`} flexShrink={0} flexDirection="row" alignItems="center" justifyContent="center" width={cols(w)} minWidth={cols(w)} height={rows(PRESS_ROW_H)}>
      {FramePic(el, key, frameSvg(w, 'rest', PRESS_ROW_H), w, false, word, PRESS_ROW_H)}
      <Text key={key}>{word}</Text>
    </Box>
  )
}

// A flat rounded card: a bold title on the left, a dim note on the right, the body below
function cardBody({ Box }: El, key: string, body: Drawn): Drawn {
  if (body === null || body === undefined || body === false) return null
  return (
    <Box key={`${key}-body`} flexDirection="column" marginTop={vstep(BODY_GAP)}>
      {body}
    </Box>
  )
}
export function Card(el: El, key: string, title: string, note: string, body: Drawn, opts: CardOpts = {}) {
  const { Box, Text, Button } = el
  const fold = opts.fold
  // The Glance form: the header is the Glance row
  if (opts.glance !== undefined) {
    const g = opts.glance
    // More or Less goes up to the Glance row (the value yields to it, glanceMoreUp)
    const moreUp = glanceMoreUp(title, g, opts)
    const full = opts
    opts = moreUp ? { ...opts, more: undefined } : opts
    // Header priority : the note is the first thing to go
    const wholeNote = glanceNote(g.widthPt, tr(note), opts.noteShort === undefined ? undefined : tr(opts.noteShort), opts)
    // A note the headline already says (the note "today" under "3 today" alone on a line) is not drawn either
    const shownNote = wholeNote === g.value || (wholeNote !== '' && ` ${g.value} `.toLowerCase().includes(` ${wholeNote.toLowerCase()} `)) ? '' : wholeNote
    const pickFit = glancePickFit(g.widthPt, opts)
    const split = glanceControlsFit(g.widthPt, opts).split
    const sideControls = [
      ...(opts.actions ?? []).map(a => IconButton(el, `${key}-${a.kind}`, a.kind, a.label, a.onPress, false, crowded(full) ? ICON_GAP : undefined)),
      opts.jump === undefined ? null : jumpButton(el, key, opts.jump, opts.chip === undefined && (split || opts.more === undefined)),
      opts.chip === undefined ? null : StateChip(el, `count-${key}`, opts.chip.word, opts.chip.on),
    ]
    const pickOptions = opts.pick === undefined ? [] : pickFit.short ? opts.pick.options.map(o => ({ ...o, label: o.short ?? o.label })) : opts.pick.options
    const hasControls = shownNote !== '' || (opts.pick !== undefined && !pickFit.ownLine) || (opts.actions ?? []).length > 0 || opts.chip !== undefined || opts.jump !== undefined || opts.more !== undefined
    // Closed, the card presses as a whole: its Client is the card's
    const whole = !g.isOpen && FIRST_CLICK_ON && el.drag
    // The gear rests in sight, faint, when its whole slot is free beside the title
    const gearRests = gearReserve(title, g, moreUp ? glanceTrailPt(full.more) : 0) >= GEAR_SLOT
    return reachCard(
      <Box key={key} backgroundColor={CARD_FILL} {...ROUNDED} borderColor={opts.active === true ? ACTIVE_LINE : CARD_LINE} flexDirection="column" {...(whole ? litBy(el, `glance-${key}`, CARD_HOVER_FILL) : {})}>
        {whole ? FirstClick(el, `glance-${key}`, g.onPress, 'lit') : null}
        {GlanceRow(el, `glance-${key}`, title, g, moreUp && full.more !== undefined ? moreButton(el, key, full.more, g.onPress, { edge: true, inRow: true }) : undefined, g.isOpen && opts.flip !== undefined && g.back === undefined ? (at: number) => HoverReveal(el, IconButton(el, `${key}-gear`, 'gear', t('access.name_settings', { name: tr(title) }), opts.flip?.onPress ?? (() => {}), true, undefined, gearRests), at, gearRests) : undefined, whole, moreUp ? glanceTrailPt(full.more) : 0, moreUp && full.more?.same === true && framedHere(el))}
        {!g.isOpen || !split ? null : (
          <Box key={`${key}-side-line`} flexDirection="row" justifyContent="flex-end" alignItems="center" columnGap={cols(ICON_GAP)}>
            {FirstClick(el, `gs-${key}`, g.onPress, 'lit', undefined, hoverScope(`glance-${key}`))}
            {sideControls}
          </Box>
        )}
        {!g.isOpen || !hasControls ? null : (
          // A line that holds the Pick is a control line: half a row under the Glance row
          <Box flexDirection="row" justifyContent={opts.pick === undefined ? 'flex-end' : 'flex-start'} alignItems="center" overflow="hidden" columnGap={cols(ICON_GAP)} {...washArea(el)} {...(opts.pick !== undefined && !pickFit.ownLine ? { marginTop: vstep(BODY_GAP) } : {})}>
            {/* No hover wash on the words of this row (More, Less, the jump draw none: inRow) */}
            {/* A row with a Pick starts at the left, at the card's text inset */}
            {FirstClick(el, `gc-${key}`, g.onPress, 'lit', undefined, hoverScope(`glance-${key}`))}
            {/* The note is the card's subtitle: under the title, at the left, dim */}
            {shownNote === '' ? null : (
              <Box flexShrink={1} overflow="hidden" {...(opts.pick === undefined ? { flexGrow: 1 } : {})}>
                <Text dimColor wrap="truncate-end">
                  {shownNote}
                </Text>
              </Box>
            )}
            {opts.pick === undefined || pickFit.ownLine ? null : Pick(el, opts.pick.key, pickOptions, opts.pick.value, opts.pick.onPick, shownNote === '')}
            {opts.pick === undefined || pickFit.ownLine ? null : <Box key={`${key}-pick-gap`} flexGrow={1} />}
            {split ? null : sideControls}
            {opts.more === undefined ? null : moreButton(el, key, opts.more, g.onPress, { edge: true })}
          </Box>
        )}
        {/* A Pick on its own line: a control of the header */}
        {!g.isOpen || opts.pick === undefined || !pickFit.ownLine ? null : (
          <Box key={`${key}-pick-line`} flexDirection="row" justifyContent="flex-start" marginTop={vstep(BODY_GAP)}>
            {FirstClick(el, `gp-${key}`, g.onPress, 'lit', undefined, hoverScope(`glance-${key}`))}
            {Pick(el, opts.pick.key, pickOptions, opts.pick.value, opts.pick.onPick, true)}
          </Box>
        )}
        {g.isOpen ? cardBody(el, key, body) : null}
      </Box>,
    )
  }
  // With `widthPt` (the card's inner width) the header yields by headerFit
  const more = opts.more === undefined || opts.more.same === true ? 0 : buttonPt(moreWord(opts.more)) + ICON_GAP
  const jump = opts.jump === undefined ? 0 : buttonPt(tr(opts.jump.label)) + ICON_GAP
  const chip = opts.chip === undefined ? 0 : chipPt(tr(opts.chip.word)) + ICON_GAP
  const fit =
    opts.widthPt === undefined
      ? undefined
      : headerFit(opts.widthPt, {
          title: tr(title),
          fold: fold !== undefined,
          note: tr(note),
          ...(opts.noteShort === undefined ? {} : { noteShort: tr(opts.noteShort) }),
          ...(opts.pick === undefined ? {} : { pick: opts.pick.options.map(o => ({ label: tr(o.label), ...(o.short === undefined ? {} : { short: tr(o.short) }) })) }),
          restPt: more + jump + chip + (opts.actions ?? []).length * (ICON_SLOT + ICON_GAP),
        })
  const pick = opts.pick === undefined ? null : Pick(el, opts.pick.key, fit?.pickShort === true ? opts.pick.options.map(o => ({ ...o, label: o.short ?? o.label })) : opts.pick.options, opts.pick.value, opts.pick.onPick)
  // On its own line the Pick sits at the left, its words where the card's text starts
  const pickFlush = opts.pick === undefined ? null : Pick(el, opts.pick.key, fit?.pickShort === true ? opts.pick.options.map(o => ({ ...o, label: o.short ?? o.label })) : opts.pick.options, opts.pick.value, opts.pick.onPick, true)
  // When the title and the controls (More, the jump, the chip) do not fit one row
  const wraps = opts.widthPt !== undefined && opts.pick === undefined && headerWraps(opts.widthPt, { title: tr(title), fold: fold !== undefined, restPt: more + jump + chip + (opts.actions ?? []).length * (ICON_SLOT + ICON_GAP) })
  // Every header control sits at the right, the jump link too (a Settings section's "Manage agents ›")
  const rest = [...(opts.actions ?? []).map(a => IconButton(el, `${key}-${a.kind}`, a.kind, a.label, a.onPress, false, crowded(opts) ? ICON_GAP : undefined)), opts.jump === undefined ? null : jumpButton(el, key, opts.jump), opts.more === undefined ? null : moreButton(el, key, opts.more), opts.chip === undefined ? null : StateChip(el, `count-${key}`, opts.chip.word, opts.chip.on)]
  // A closed card (a shut fold, or a shut Settings section: `whole` with `headPress`) presses as a whole
  const shut = fold !== undefined ? (fold.open ? undefined : fold.onToggle) : opts.whole === true ? opts.headPress : undefined
  const whole = shut !== undefined && FIRST_CLICK_ON && el.drag
  // A card with TWO OR MORE presses
  const lead = opts.lead !== undefined && opts.headPress !== undefined && !whole
  const withLead = (head: Drawn[]) =>
    !lead || opts.headPress === undefined ? (
      head
    ) : (
      <Box key={`${key}-lead`} flexDirection="column" {...washArea(el)} {...litBy(el, `hdr-${key}`)}>
        {FirstClick(el, `hdr-${key}`, opts.headPress, 'lit')}
        {head}
        {opts.lead}
      </Box>
    )
  return reachCard(
    <Box key={key} backgroundColor={CARD_FILL} {...ROUNDED} borderColor={opts.active === true ? ACTIVE_LINE : CARD_LINE} flexDirection="column" {...(whole ? litBy(el, `hdr-${key}`, CARD_HOVER_FILL) : {})}>
      {whole && shut !== undefined ? FirstClick(el, `hdr-${key}`, shut, 'lit') : null}
      {withLead([
      <Box key={`${key}-head`} flexDirection="row" justifyContent="space-between" alignItems="center" {...(fold !== undefined && !whole ? { ...pressHover(el, `hdr-${key}`), ...washArea(el) } : {})}>
        {/* The whole header presses to fold */}
        {fold === undefined || whole ? null : FirstClick(el, `hdr-${key}`, fold.onToggle, 'button')}
        {/* The title's own box takes the free room and holds the one first-click press */}
        {/* In a card with a `lead` the title's press and hover are the lead Box's */}
        <Box flexShrink={0} flexDirection="row" alignItems="center" {...(opts.headPress === undefined ? {} : { flexGrow: 1 })} {...(opts.headPress !== undefined && fold === undefined && !whole && !lead ? { ...pressHover(el, `hdr-${key}`), ...washArea(el) } : {})}>
          {opts.headPress === undefined || whole || lead ? null : FirstClick(el, `hdr-${key}`, opts.headPress, 'button')}
          <Text bold>{tr(title)}</Text>
          {fold === undefined ? null : Chevron(el, key, fold.open ? 'down' : 'right', fold.onToggle, tr(title))}
        </Box>
        {wraps ? null : (
          <Box flexShrink={1} overflow="hidden" marginLeft={cols(LIST_COL_GAP)} flexDirection="row" alignItems="center" columnGap={cols(ICON_GAP)}>
            <Text dimColor wrap="truncate-end">
              {fit === undefined ? tr(note) : fit.note}
            </Text>
            {fit?.pickOwnLine === true ? null : pick}
            {rest}
          </Box>
        )}
      </Box>,
      !wraps ? null : (
        <Box key={`${key}-controls-line`} flexDirection="row" flexWrap="wrap" justifyContent="flex-end" alignItems="center" columnGap={cols(ICON_GAP)}>
          {rest}
        </Box>
      ),
      fit?.pickOwnLine === true ? (
        <Box key={`${key}-pick-line`} flexDirection="row" justifyContent="flex-start" marginTop={vstep(BODY_GAP)}>
          {pickFlush}
        </Box>
      ) : null,
      ])}
      {fold !== undefined && !fold.open ? null : cardBody(el, key, body)}
    </Box>,
  )
}

// The end of a long list, like the sidebar's "Mer"
export function MoreRow(el: El, key: string, label: string, isOpen: boolean, onPress: () => void) {
  const { Box, Button, Text, Svg } = el
  const pic = chevronSvg(isOpen ? 'down' : 'right', MORE_CHEVRON_LONG, MORE_CHEVRON_SHORT)
  return (
    <Box key={key} minHeight={rows(LIST_ROW_H)} flexDirection="row" alignItems="center" {...litBy(el, `morel-${key}`)}>
      <Box width={cols(DOT)} height={rows(ROW_PT)} flexShrink={0} justifyContent="center" alignItems="center">
        {Svg ? <Svg source={pic.source} alt={tr(isOpen ? 'Show fewer' : 'Show more')} width={pic.width} height={pic.height} /> : <Text dimColor>{isOpen ? '⌄' : '›'}</Text>}
      </Box>
      <Box width={cols(DOT_TEXT_GAP - BUTTON_PAD)} flexShrink={0} />
      <Button key={`morel-${key}`} label={trMore(label)} plain onPress={onPress} />
      {/* The whole row presses: one Client over the row, laid last */}
      {FirstClick(el, `morel-${key}`, onPress, 'button', undefined, undefined, LIST_ROW_H)}
    </Box>
  )
}

// A session mark, 6 pt, and the 13 pt before the text
export function Mark({ Box, Text, Svg }: El, kind: DotKind, word: string) {
  const plain = kind === 'needs' ? '◆' : kind === 'working' ? '●' : kind === 'waiting' ? '○' : '·'
  return (
    <Box width={cols(DOT + DOT_TEXT_GAP)} flexShrink={0} alignItems="center" flexDirection="row">
      {!Svg ? <Text dimColor>{plain}</Text> : <Svg source={dotSvg(kind)} alt={word} width={DOT} height={DOT} />}
    </Box>
  )
}

// A list: rows 26 pt high with 1.5 pt between them, no extra space after the last
export function List({ Box }: El, rowsOf: readonly Drawn[]) {
  return (
    <Box flexDirection="column" rowGap={vstep(LIST_ROW_GAP)}>
      {rowsOf}
    </Box>
  )
}

// The word column of a list row, after the mark: the state word, a fixed width
export function Word({ Box, Text }: El, key: string, word: string, dim = false) {
  return (
    <Box key={key} width={cols(LIST_WORD_COL)} flexShrink={0}>
      <Text dimColor={dim}>{word}</Text>
    </Box>
  )
}

// A list row: 26 pt high with its text centred, or 52 pt with a second line. `left` holds the mark
export function ListRow(el: El, key: string, left: readonly Drawn[], right?: Drawn, detail?: string, detailRight?: string, detailIndent: number = DOT + DOT_TEXT_GAP + LIST_WORD_COL, after?: Drawn, press?: { onPress: () => void; widthPt: number }) {
  const { Box, Text } = el
  const second = detail !== undefined || detailRight !== undefined
  // The second line is a note when nothing stands at its right
  const fit = detail !== undefined && detailRight === undefined && press !== undefined ? noteFit(detail, press.widthPt - detailIndent) : undefined
  const highPt = (1 + (second ? (fit?.lines ?? 1) : 0)) * LIST_ROW_H
  return (
    <Box key={key} flexDirection="column" minHeight={rows(highPt)} justifyContent="center" {...(press === undefined ? {} : { ...pressHover(el, key), ...washArea(el) })}>
      {press === undefined ? null : PressWash(el, highPt, press.widthPt)}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" alignItems="center" flexGrow={1} flexShrink={1} overflow="hidden">
          {left}
        </Box>
        {right === undefined ? null : (
          <Box flexShrink={0} width={cols(LIST_RIGHT_COL)} marginLeft={cols(LIST_COL_GAP)} justifyContent="flex-end">
            {right}
          </Box>
        )}
        {after ?? null}
      </Box>
      {second ? (
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Box paddingLeft={cols(detailIndent)} flexShrink={1} overflow="hidden">
            <Text dimColor wrap={fit === undefined ? 'truncate-end' : 'wrap'}>
              {fit?.text ?? detail ?? ''}
            </Text>
          </Box>
          {detailRight === undefined ? null : (
            <Box flexShrink={0} width={cols(LIST_RIGHT_COL)} marginLeft={cols(LIST_COL_GAP)} justifyContent="flex-end">
              <Text dimColor>{detailRight}</Text>
            </Box>
          )}
        </Box>
      ) : null}
      {press === undefined ? null : PressCover(el, key, highPt, press.widthPt, press.onPress)}
    </Box>
  )
}

// How many characters a session row's second line has room for in a card `innerPt` wide
export const detailChars = (innerPt: number, wordless: boolean, word: string): number => {
  const stacked = innerPt < STACK_BELOW_PT
  const indent = wordless || stacked ? DOT + DOT_TEXT_GAP : LIST_WORD_COL
  return Math.floor((innerPt - indent) / TEXT_CHAR_PT) - (stacked && !wordless ? word.length + 3 : 0)
}

// A session row in either layout
export function SessionRow(el: El, key: string, p: { kind: DotKind; word: string; name: string; innerPt: number; right?: Drawn; detail?: string; detailRight?: string; pinned?: boolean; keepWord?: boolean; after?: Drawn; onPress?: () => void }) {
  const { kind, word, name, innerPt, right, detail, detailRight, after } = p
  const press = p.onPress === undefined ? undefined : { onPress: p.onPress, widthPt: innerPt }
  // A pinned row has a small pin after its name (where pictures work; a terminal has none)
  const pin = p.pinned === true ? Pin(el, 'pin') : null
  const wordless = kind === 'needs' && !!el.Svg && p.keepWord !== true
  if (wordless) {
    return ListRow(el, key, [Mark(el, kind, word), Name(el, 'name', name), pin], right, detail, detailRight, DOT + DOT_TEXT_GAP, after, press)
  }
  if (innerPt >= STACK_BELOW_PT) {
    // The word says the state, so the row draws no mark and has no mark column
    return ListRow(el, key, [Word(el, 'word', word, kind === 'idle'), Name(el, 'name', name), pin], right, detail, detailRight, LIST_WORD_COL, after, press)
  }
  return ListRow(el, key, [Mark(el, kind, word), Name(el, 'name', name), pin], right, detail === undefined ? word : `${word} · ${detail}`, detailRight, DOT + DOT_TEXT_GAP, after, press)
}

// The pin on a pinned row: a small outline pin in the dim icon grey, a little after the name
export function pinSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 8 12"><path d="M2 0.6H6M2.6 0.6V4.4L1 6.6H7L5.4 4.4V0.6M4 6.6V11.4" fill="none" stroke="${ICON_DIM}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

export function Pin({ Box, Svg }: El, key: string) {
  if (!Svg) return null
  return (
    <Box key={key} flexShrink={0} marginLeft={cols(PIN_GAP)}>
      <Svg source={pinSvg()} alt={tr('Pinned')} width={PIN_W} height={PIN_H} />
    </Box>
  )
}

// A name that is cut off with an ellipsis instead of running into the next column
export function Name({ Box, Text }: El, key: string, name: string) {
  return (
    <Box key={key} flexShrink={1} overflow="hidden">
      <Text bold wrap="truncate-end">
        {name}
      </Text>
    </Box>
  )
}

// The amber chip ("Your turn", "Failed"): 18 pt high
export function chipSvg(word: string): { source: string; width: number } {
  const width = Math.round(word.length * CHIP_CHAR_PT + 2 * CHIP_PAD)
  const safe = word.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${CHIP_H}" viewBox="0 0 ${width} ${CHIP_H}"><style>${themed('t', 'fill', CHIP_TEXT_LIGHT, CHIP_TEXT_DARK)}</style><text class="t" x="${width}" y="${CHIP_H * 0.7}" text-anchor="end" font-family="-apple-system, system-ui, sans-serif" font-size="${CHIP_TEXT}">${safe}</text></svg>`
  return { source, width }
}

export function Chip({ Box, Svg }: El, key: string, word: string) {
  // Without pictures (a terminal) the row's own words say it already, so there is no chip
  if (!Svg) return null
  const chip = chipSvg(word)
  return (
    <Box key={key}>
      <Svg source={chip.source} alt={word} width={chip.width} height={CHIP_H} />
    </Box>
  )
}

// Pictures kept between draws (a chip, a section label): a few hundred at most
const MEMO_MAX = 400
const remember = <V,>(memo: Map<string, V>, key: string, value: V): V => {
  if (memo.size >= MEMO_MAX) memo.clear()
  memo.set(key, value)
  return value
}
const chipMemo = new Map<string, { source: string; width: number }>()
const chipPicture = (shown: string, isOn: boolean, pulsing: boolean): { source: string; width: number } => {
  const width = chipPt(shown)
  // NO fill: the word alone, right-aligned in the chip's width (the width the header and row fits count)
  const theme = themeOfAccent(look.accent)
  const textLight = isOn ? (CHIP_TEXT_ON_LIGHT[theme] ?? CHIP_TEXT_ON_LIGHT.native) : CHIP_TEXT_OFF_LIGHT
  const textDark = isOn ? (CHIP_TEXT_ON_DARK[theme] ?? CHIP_TEXT_ON_DARK.native) : CHIP_TEXT_OFF_DARK
  const safe = shown.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const pulse = pulsing ? `<animate attributeName="opacity" values="1;${STATE_PULSE_LOW};1" dur="${STATE_PULSE_MS}ms" repeatCount="1"/>` : ''
  const open = pulse === '' ? '' : `<g>${pulse}`
  const close = pulse === '' ? '' : '</g>'
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${CHIP_H}" viewBox="0 0 ${width} ${CHIP_H}">${open}<style>${themed('t', 'fill', textLight, textDark)}</style><text class="t" x="${width}" y="${CHIP_H * 0.7}" text-anchor="end" font-family="-apple-system, system-ui, sans-serif" font-size="${CHIP_TEXT}">${safe}</text>${close}</svg>`
  return { source, width }
}
// A state chip: the state in words, in a small coloured word with no fill
export function StateChip({ Box, Text, Svg }: El, key: string, word: string, isOn: boolean) {
  const shown = tr(word)
  if (!Svg) return <Text key={key} dimColor={!isOn}>{`[${shown}]`}</Text>
  const pulsing = motionOk() && justChanged(key)
  // A still chip is the same picture for the same word, state and accent: drawn once, then reused
  const memoKey = `${look.accent}|${isOn ? 1 : 0}|${shown}`
  const pic = pulsing ? chipPicture(shown, isOn, true) : (chipMemo.get(memoKey) ?? remember(chipMemo, memoKey, chipPicture(shown, isOn, false)))
  return (
    <Box key={key} flexShrink={0}>
      <Svg source={pic.source} alt={shown} width={pic.width} height={CHIP_H} />
    </Box>
  )
}

// The section label: a small dim word over a group of rows ("Used this week", "To decide")
export const sectionPt = (text: string): number => {
  const em = [...text].reduce((n, ch) => n + (/[mwMW]/.test(ch) ? SECTION_WIDE_EM : /[A-Z]/.test(ch) ? SECTION_CAP_EM : /[iljtfr.,:;!|' ]/.test(ch) ? SECTION_NARROW_EM : SECTION_LETTER_EM), 0)
  return Math.ceil(Math.max(text.length * SECTION_CHAR_PT, em * SECTION_TEXT) + SECTION_PAD)
}
// The label's picture depends on its words alone: drawn once per word, then reused
const sectionPicture = (shown: string): { width: number; source: string } => {
  const width = sectionPt(shown)
  const safe = shown.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return { width, source: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${SECTION_H}" viewBox="0 0 ${width} ${SECTION_H}"><style>${themed('s', 'fill', SECTION_COLOR_LIGHT, SECTION_COLOR_DARK)}</style><text class="s" x="0" y="${SECTION_H * 0.72}" font-family="-apple-system, system-ui, sans-serif" font-size="${SECTION_TEXT}">${safe}</text></svg>` }
}
const sectionMemo = new Map<string, { width: number; source: string }>()
export function SectionLabel(el: El, key: string, text: string, first = false) {
  const { Box, Text, Svg } = el
  const shown = tr(text)
  const top = first ? {} : { marginTop: vstep(SECTION_GAP) }
  if (!Svg) {
    return (
      <Box key={key} {...top}>
        <Text dimColor>{shown}</Text>
      </Box>
    )
  }
  const { width, source } = sectionMemo.get(shown) ?? remember(sectionMemo, shown, sectionPicture(shown))
  return (
    <Box key={key} height={rows(SECTION_H)} overflow="hidden" {...top}>
      <Svg source={source} alt={shown} width={width} height={SECTION_H} />
    </Box>
  )
}
