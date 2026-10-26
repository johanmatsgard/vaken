// The band: one row that never wraps.
import { bandFirst, bandShort, doneShort, marked, topLine } from '../../core/band'
import { needsChip } from '../../core/cardrules'
import { FOCUS_BAND_ID } from '../../core/focus'
import { FRESH_BAND_ID, FRESH_PRESS } from '../../core/freshstart'
import { t, tr } from '../../core/lang'
import { bandWords } from '../../core/happened'
import { Pressable, WARNING, glyphPt, padded, pillSvg } from '../../ui/kit'
import type { El } from '../../ui/kit'
import { BAND_CHIP_W, BAND_FIT_SLACK_PT, BAND_GAP, BAND_LINE_MIN_PT, BLANK_PT, BUTTON_PAD, TEXT_WIDE_PT, BAND_MARK_PT, BAND_PAD_X, BAR_H, columnPt, DANGER, LEVEL_AMBER_PCT, LEVEL_RED_PCT, cols } from '../../ui/tokens'
import { LIMIT_HOT_PCT, bandLead, cardLabel, keptBlocks, limitAgo, limitBlocks, needsCount, resetSaid, usedUp } from './logic'
import type { Detail, LimitBlock, View } from './logic'
import { fmt } from '../../core/fmt'
import { fillIn } from '../../core/fillin'
import { NEXT_WORD } from '../../core/actions'
import { askWords } from '../../core/allowrules'
import { RUNAWAY_BAND_ID, RUNAWAY_STOP, RUNAWAY_WAIT } from '../../core/attention'
import type { AskView } from '../../core/allowrules'
import type { Action } from '../../core/actions'
import { RELAY_OPEN, relayWords } from '../../core/relay'
import { RESUME_BAND_ID } from '../../core/resume'
import type { RelayView } from '../../core/relay'

// The letter estimate, with the two marks the band uses most measured on their own: a no-break blank and the percent sign (as wide as M)
const bandGlyph = (c: string): number => (c === '\u00a0' ? BLANK_PT : c === '%' ? TEXT_WIDE_PT : glyphPt(c))
const textPt = (s: string): number => [...s].reduce((sum, c) => sum + bandGlyph(c), 0)
// A band button: its padded words plus the plain Button's own padding on each side
const buttonPt = (label: string): number => textPt(padded(label)) + 2 * BUTTON_PAD
const roomOf = (columns: number | undefined): number => (columns === undefined || columns <= 0 ? Infinity : columns * columnPt() - 2 * BAND_PAD_X - BAND_FIT_SLACK_PT)

// How many next step buttons fit whole in the room left beside the word and the plan chip; none when even one would be cut.
export function nextFit(labels: string[], roomPt: number, word: string): number {
  let left = roomPt - textPt(word)
  let n = 0
  for (const l of labels) {
    left -= BAND_GAP / 2 + buttonPt(l)
    if (left < 0) break
    n += 1
  }
  return n
}

// The plan chip: the 5-hour and the week limit, each a short label, its bar and its figure; the reset time only while a limit is hot.
// A figure never stands without its label: when room is short each limit keeps its label and figure while the resets of all but the fuller one go first
// ('lead'), then only the fuller limit stays, then its reset time goes, then the whole chip.
export type ChipFit = 'both' | 'lead' | 'full' | 'plain' | 'none'
const CHIP_ORDER: ChipFit[] = ['both', 'lead', 'full', 'plain', 'none']
// `id`: the limit's block (LimitBlock.kind), so the status line knows whether the chip shows the limit that leads
export type ChipPart = { id: string; label: string; pct: number; reset: string }
// `age`: an old reading (past USAGE_STALE_MS, logic.ts keptBlocks), drawn dim with its coarse age after the last figure ("38% · 20 min ago"); it never colours
export type Chip = { parts: ChipPart[]; bar: boolean; age?: string }
const agePt = (c: Chip): number => (c.age === undefined || c.age === '' ? 0 : textPt(` · ${c.age}`))
const partPt = (p: ChipPart, bar: boolean, reset: boolean): number =>
  textPt(p.label) + BAND_GAP / 2 + (bar ? BAND_CHIP_W + BAND_GAP / 2 : 0) + textPt(`${fmt.percent(p.pct)}${reset && p.reset !== '' ? ` · ${p.reset}` : ''}`)
export const fuller = (c: Chip): ChipPart => c.parts.reduce((a, b) => (b.pct > a.pct ? b : a))
const drawnParts = (c: Chip, fit: ChipFit): ChipPart[] => (fit === 'none' ? [] : fit === 'both' || fit === 'lead' ? c.parts : [fuller(c)])
// Whether a drawn part keeps its reset time in this form: every part in 'both', the fuller one alone in 'lead' and 'full', none in 'plain'
export const partShowsReset = (c: Chip, fit: ChipFit, p: ChipPart): boolean => p.reset !== '' && (fit === 'both' || ((fit === 'lead' || fit === 'full') && p === fuller(c)))
export function chipPt(c: Chip | undefined, fit: ChipFit): number {
  if (c === undefined || c.parts.length === 0 || fit === 'none') return 0
  return drawnParts(c, fit).reduce((sum, p, i) => sum + partPt(p, c.bar, partShowsReset(c, fit, p)) + (i > 0 ? BAND_GAP : 0), 0) + agePt(c)
}
// 'lead' is a form of its own only while a limit other than the fuller one has a reset to give up (else it is 'both')
const fitsOf = (c: Chip | undefined): ChipFit[] =>
  c === undefined || c.parts.length === 0 ? ['none'] : CHIP_ORDER.filter(f => (f !== 'both' && f !== 'lead') || c.parts.length > 1).filter(f => f !== 'lead' || c.parts.some(p => p !== fuller(c) && p.reset !== ''))
// The richest chip that leaves the left part its least room; the gap before the chip counts only when the left holds something.
export function chipFit(c: Chip | undefined, leftPt: number, columns: number | undefined): ChipFit {
  const room = roomOf(columns)
  return fitsOf(c).find(f => f === 'none' || leftPt + (leftPt > 0 ? BAND_GAP : 0) + chipPt(c, f) <= room) ?? 'none'
}
// The two main limits from the same blocks as the Plan limits card, in the band's fixed order (5 h, then Week).
// Another limit hotter than both (a model's week) joins them, by its card name ("Week · Fable"), so the fuller one the narrow chip keeps is the hottest;
// another lead limit stands alone when neither main one is known.
// With no fresh reading the last one kept stays (keptBlocks), dim with its age and no reset, as the Plan limits card shows it.
export function bandChip(view: View, bar: boolean): Chip | undefined {
  const fresh = limitBlocks(view)
  const old = fresh.length === 0
  const blocks = old ? keptBlocks(view) : fresh
  const five = blocks.find(b => b.kind === 'session' || b.short === '5-hour limit')
  const week = blocks.find(b => b.kind === 'week' || b.label === 'Weekly limit · all models')
  const lead = blocks[0]
  const part = (b: LimitBlock, label: string): ChipPart => ({ id: b.kind, label, pct: b.percent, reset: !old && b.percent >= LIMIT_HOT_PCT ? resetSaid(b.reset, tr) : '' })
  const parts = [...(five === undefined ? [] : [part(five, tr('5 h'))]), ...(week === undefined ? [] : [part(week, tr('Week'))])]
  const hotter = blocks.filter(b => b !== five && b !== week && b.short !== 'Extra' && parts.every(p => b.percent > p.pct)).reduce<LimitBlock | undefined>((a, b) => (a === undefined || b.percent > a.percent ? b : a), undefined)
  if (parts.length > 0 && hotter !== undefined) parts.push(part(hotter, cardLabel(hotter, tr)))
  if (parts.length === 0 && lead !== undefined) parts.push(part(lead, cardLabel(lead, tr)))
  return parts.length === 0 ? undefined : { parts, bar, ...(old ? { age: limitAgo(blocks, tr) } : {}) }
}

// The chip's name of a limit: "5 h", "Week", else its card name ("Week · Fable")
const chipName = (b: LimitBlock): string => (b.kind === 'session' || b.short === '5-hour limit' ? tr('5 h') : b.kind === 'week' || b.label === 'Weekly limit · all models' ? tr('Week') : cardLabel(b, tr))
// While a used-up limit is waited out (the resume line), the line names that limit and its reset, so the reset is never lost to the chip's width:
// "5 h used up · resets 15:40". Of two used up, the one that resets last is the wait. No used-up limit known: the stored words stay.
function usedUpWords(view: View): string | undefined {
  const wait = limitBlocks(view).filter(b => usedUp(b) && b.reset !== '').reduce<LimitBlock | undefined>((a, b) => (a === undefined || Date.parse(b.resetsAt ?? '') > Date.parse(a.resetsAt ?? '') ? b : a), undefined)
  return wait === undefined ? undefined : fillIn(tr('{limit} used up · {reset}'), { limit: chipName(wait), reset: resetSaid(wait.reset, tr) })
}
// A question a tool asks in another session waits on the person: it counts in Needs you here, unless that session is already counted there
const relayWaits = (view: View): number => (view.relay !== undefined && !view.needs.some(r => r.rec.sessionId === view.relay?.sid) ? 1 : 0)

type Open = { label: string; kind: 'focus' | 'fresh' | 'details' | 'session' | 'stop' | 'wait' }
export type BandPlan =
  | { mode: 'none' }
  | { mode: 'next'; fit: ChipFit; shown: number }
  | { mode: 'line'; fit: ChipFit; needs: number; text?: string; info: boolean; fail?: true; minPt: number; open?: Open; second?: Open; needsOpensSession?: true }

// What the band draws at this width: pure, so the status line can ask whether the plan chip is on screen.
// `step`: the presses the runaway step line can offer now (Stop the answer needs the running answer's id; Keep waiting always)
export function bandPlan(view: View, detail: Detail, columns: number | undefined, nextLabels: string[], canEndFocus: boolean, canFresh: boolean, bar: boolean, step: { stop: boolean; wait: boolean } = { stop: false, wait: false }): BandPlan {
  const needs = needsCount(view) + relayWaits(view)
  const top = topLine(needs, view.band ?? [], view.now ?? 0)
  const chip = bandChip(view, bar)
  const room = roomOf(columns)
  if (view.ask !== undefined) return askPlan(view.ask, needs, chip, columns)
  // A tool's question in another session comes before a calm posted line; a warning or a stall keeps the line
  const posted = topLine(0, view.band ?? [], view.now ?? 0)
  const focus = (view.band ?? []).find(x => x.id === FOCUS_BAND_ID)
  // While Quiet is on its End quiet stays the one button (as under a stall), so the relay line never hides it
  if (view.relay !== undefined && (posted === undefined || posted.level === 'info')) return relayPlan(view.relay, needs, chip, columns, focus !== undefined && canEndFocus, needsCount(view) === 0)
  const isFocusTop = focus !== undefined && top !== undefined && top.more === 0 && top.text === focus.text && canEndFocus
  // The fresh-start nudge alone on the band offers its press in place of Details
  const fresh = (view.band ?? []).find(x => x.id === FRESH_BAND_ID)
  const isFreshTop = !isFocusTop && needs === 0 && fresh !== undefined && top !== undefined && top.more === 0 && top.text === fresh.text && canFresh
  // The runaway step's line on top offers its own presses in place of See all and Details
  const runaway = (view.band ?? []).find(x => x.id === RUNAWAY_BAND_ID)
  const isStepTop = !isFocusTop && needs === 0 && runaway !== undefined && top !== undefined && top.text === runaway.text && (step.stop || step.wait)
  // The next steps take the left of the row only when nothing louder than a done line wants it, and only when one fits whole; the fresh-start tip keeps its press.
  // The buttons come first: of the chip's forms the one that leaves the most buttons whole, the richest of those, so a wider band never shows fewer buttons.
  if (nextLabels.length > 0 && needs === 0 && !isFocusTop && !isFreshTop && !isStepTop && (top === undefined || top.level === 'info')) {
    let best: { fit: ChipFit; shown: number } | undefined
    for (const f of fitsOf(chip)) {
      const shown = nextFit(nextLabels, room - chipPt(chip, f) - (f === 'none' ? 0 : BAND_GAP), tr(NEXT_WORD))
      if (shown > 0 && (best === undefined || shown > best.shown)) best = { fit: f, shown }
    }
    if (best !== undefined) return { mode: 'next', ...best }
  }
  if (top === undefined && chip === undefined) return { mode: 'none' }
  const usedUpLine = top !== undefined && needs === 0 && top.id === RESUME_BAND_ID && top.level === 'info' ? usedUpWords(view) : undefined
  const full = top === undefined || needs > 0 ? undefined : (usedUpLine ?? bandWords(top, tr))
  const markPt = top !== undefined && top.mark !== '' ? BAND_MARK_PT : 0
  const needsPt = needs > 0 ? buttonPt(`◆ ${needsChip(needs, tr)}`) : 0
  // `second`: the runaway step's Keep waiting beside its Stop the answer; it goes first when room is short
  let second: Open | undefined
  const leftOf = (o: Open | undefined, linePt: number): number => [needsPt, linePt, o === undefined ? 0 : buttonPt(o.label), o === undefined || second === undefined ? 0 : buttonPt(second.label)].filter(x => x > 0).reduce((sum, x, i) => sum + x + (i > 0 ? BAND_GAP : 0), 0)
  // While Quiet is on, End quiet stays the one button even when a stronger line (a stall) is on top: the line itself is said in full
  const quietOn = focus !== undefined && canEndFocus
  // With Needs you the only line, its chip is the press: no Details beside it; nor beside a calm done line said whole (✓), so the plan chip keeps its room
  const needsOnly = needs > 0 && top !== undefined && top.more === 0
  const calmDone = needs === 0 && top !== undefined && top.more === 0 && top.mark === '✓'
  const stepOpen: Open | undefined = !isStepTop || quietOn ? undefined : step.stop ? { label: tr(RUNAWAY_STOP), kind: 'stop' } : { label: tr(RUNAWAY_WAIT), kind: 'wait' }
  if (stepOpen?.kind === 'stop' && step.wait) second = { label: tr(RUNAWAY_WAIT), kind: 'wait' }
  let open: Open | undefined = top === undefined ? undefined : quietOn ? { label: tr('End quiet'), kind: 'focus' } : stepOpen !== undefined ? stepOpen : isFreshTop ? { label: tr(FRESH_PRESS), kind: 'fresh' } : top.more > 0 ? { label: needs > 0 ? tr('See all') : tr('See all {n}').replace('{n}', String(top.more + 1)), kind: 'details' } : detail === 'explained' && !needsOnly && !calmDone ? { label: tr('Details'), kind: 'details' } : undefined
  // A sentence that would be cut says its short form whole; the press beside it (Details at least) opens the whole sentence
  // A line with no short words of its own says its first whole sentence ("Back after 42 min"), as the runaway line does ("A step has run 12 min"); its presses stay beside it
  // A calm done line has short words of its own (core/band.ts doneShort), said before a first sentence or a clause
  const doneS = calmDone && full !== undefined ? doneShort(top?.id, tr) : []
  const short = full === undefined || top === undefined ? undefined : isStepTop ? bandFirst(full) : (doneS[0] ?? bandShort(top.id, full, tr))
  const cutFull = full !== undefined && leftOf(open, markPt + textPt(full)) > room
  // A done line that would push the plan chip off says its short words when those keep the chip; it has no Details (the whole title is on the Autopilot card)
  const chipShort = chip === undefined || full === undefined ? undefined : doneS.find(w => chipFit(chip, leftOf(open, markPt + textPt(w)), columns) !== 'none')
  const keepsChip = chipShort !== undefined && full !== undefined && chipFit(chip, leftOf(open, markPt + textPt(full)), columns) === 'none'
  const words = keepsChip ? chipShort : short !== undefined && cutFull ? short : full
  if (words !== full && !keepsChip && open === undefined) open = { label: tr('Details'), kind: 'details' }
  const text = words === undefined || top === undefined ? undefined : marked(top.mark, words)
  const fullPt = words === undefined ? 0 : markPt + textPt(words)
  const minPt = Math.min(fullPt, markPt + BAND_LINE_MIN_PT)
  // A sentence is never cut for the chip: the chip gives way first (its reset, then all of it) and the line keeps its full width
  let fit = chipFit(chip, leftOf(open, fullPt), columns)
  // The Short look has no Details word unless the line is cut at this width
  if (open === undefined && words !== undefined && leftOf(undefined, fullPt) > room) {
    open = { label: tr('Details'), kind: 'details' }
    fit = chipFit(chip, leftOf(open, fullPt), columns)
  }
  // A button that does not fit whole is not drawn: Keep waiting goes before Stop the answer
  if (second !== undefined && leftOf(open, minPt) > room) {
    second = undefined
    fit = chipFit(chip, leftOf(open, fullPt), columns)
  }
  // The used-up line keeps its reset whole: its Details goes before the line would be cut
  if (open !== undefined && (leftOf(open, minPt) > room || (usedUpLine !== undefined && leftOf(open, fullPt) > room))) {
    open = undefined
    fit = chipFit(chip, leftOf(undefined, fullPt), columns)
  }
  return { mode: 'line', fit, needs, ...(text === undefined ? {} : { text }), info: top?.level === 'info', ...(top?.level === 'fail' && needs === 0 ? { fail: true as const } : {}), minPt, ...(open === undefined ? {} : { open }), ...(open === undefined || second === undefined ? {} : { second }) }
}

// Claude Code itself stopped a step: its plain line comes before every posted line, beside Needs you, for a few minutes (core/allowrules.ts askShown).
// It says why and what the step was; a narrow band keeps the why alone. It has no press: vaken never retries or allows a step.
function askPlan(ask: AskView, needs: number, chip: Chip | undefined, columns: number | undefined): BandPlan {
  const room = roomOf(columns)
  const said = askWords(ask)
  const needsPt = needs > 0 ? buttonPt(`◆ ${needsChip(needs, tr)}`) : 0
  const leftOf = (linePt: number): number => [needsPt, linePt].filter(x => x > 0).reduce((sum, x, i) => sum + x + (i > 0 ? BAND_GAP : 0), 0)
  const words = leftOf(textPt(said.text)) > room ? said.step : said.text
  const fullPt = textPt(words)
  const minPt = Math.min(fullPt, BAND_LINE_MIN_PT)
  const fit = chipFit(chip, leftOf(fullPt), columns)
  return { mode: 'line', fit, needs, text: words, info: true, minPt }
}

// A tool server asks the person something in another session: one line that names the session, beside Needs you (which counts it, relayWaits). It is a real
// wait on the person, so it has Needs you's mark and amber. The press opens that session; the band never answers. A narrow band says the short form; the press goes before the words are cut.
// While Quiet is on (`quiet`), the one button is End quiet in place of Open session: Quiet's way out stays on the band.
// `onlyWait`: the question is all Needs you counts; when Open session does not fit whole, the Needs you chip opens that session in its place.
function relayPlan(relay: RelayView, needs: number, chip: Chip | undefined, columns: number | undefined, quiet = false, onlyWait = false): BandPlan {
  const room = roomOf(columns)
  const said = relayWords(relay, t)
  const needsPt = needs > 0 ? buttonPt(`◆ ${needsChip(needs, tr)}`) : 0
  const leftOf = (o: Open | undefined, linePt: number): number => [needsPt, linePt, o === undefined ? 0 : buttonPt(o.label)].filter(x => x > 0).reduce((sum, x, i) => sum + x + (i > 0 ? BAND_GAP : 0), 0)
  let open: Open | undefined = quiet ? { label: tr('End quiet'), kind: 'focus' } : { label: t(RELAY_OPEN), kind: 'session' }
  const words = leftOf(open, BAND_MARK_PT + textPt(said.text)) > room ? said.short : said.text
  const fullPt = BAND_MARK_PT + textPt(words)
  if (leftOf(open, fullPt) > room) open = undefined
  const fit = chipFit(chip, leftOf(open, fullPt), columns)
  return { mode: 'line', fit, needs, text: marked('◆', words), info: false, minPt: Math.min(fullPt, BAND_MARK_PT + BAND_LINE_MIN_PT), ...(open === undefined ? {} : { open }), ...(open === undefined && onlyWait ? { needsOpensSession: true as const } : {}) }
}

// Whether the plan chip shows the limit that leads, for the status line (it then leaves the plan fact out; a lead the chip does not show stays on the line).
export const bandChipShown = (view: View, detail: Detail, columns: number | undefined, nextLabels: string[], bar: boolean, step = { stop: true, wait: true }): boolean => {
  const p = bandPlan(view, detail, columns, nextLabels, true, true, bar, step)
  const chip = bandChip(view, bar)
  if (p.mode === 'none' || chip === undefined) return false
  const lead = bandLead(view)
  const drawn = drawnParts(chip, p.fit)
  return lead === undefined ? drawn.length > 0 : drawn.some(x => x.id === lead.kind)
}

export type BandNext = { actions: Action[]; press: (a: Action) => void }

// `amber`: the Needs you chip, its words in the warning colour (a real wait on the person, BAND.md)
function bandButton(el: El, key: string, label: string, onPress: () => void, amber = false) {
  const { Button, Text } = el
  const button = amber ? (
    <Button key={key} label={padded(label)} plain onPress={onPress}>
      <Text color={WARNING}>{padded(label)}</Text>
    </Button>
  ) : (
    <Button key={key} label={padded(label)} plain onPress={onPress} />
  )
  return Pressable(el, key, button, onPress, true)
}

// `step`: the runaway step line's presses; `stop` only while the running answer is known
export type BandStep = { stop?: () => void; wait: () => void }
export function HomeBand(el: El, view: View, detail: Detail, openPane: () => void, endFocus?: () => void, openNeeds: () => void = openPane, columns?: number, bandNext?: BandNext, startFresh?: () => void, openSession?: (r: RelayView) => void, step?: BandStep) {
  const { Box, Text } = el
  const actions = bandNext?.actions ?? []
  const plan = bandPlan(view, detail, columns, actions.map(a => tr(a.label)), endFocus !== undefined, startFresh !== undefined, el.Svg !== undefined, { stop: step?.stop !== undefined, wait: step !== undefined })
  if (plan.mode === 'none') return null
  const chip = drawChip(el, bandChip(view, el.Svg !== undefined), plan.fit)
  if (plan.mode === 'next' && bandNext !== undefined) {
    return (
      <Box paddingX={cols(BAND_PAD_X)} flexDirection="row" alignItems="center" columnGap={cols(BAND_GAP)}>
        <Box flexShrink={1} overflow="hidden" flexDirection="row" alignItems="center" columnGap={cols(BAND_GAP / 2)}>
          <Text dimColor>{tr(NEXT_WORD)}</Text>
          {actions.slice(0, plan.shown).map(a => bandButton(el, `band-next-${a.id}`, tr(a.label), () => bandNext.press(a)))}
        </Box>
        {chip}
      </Box>
    )
  }
  if (plan.mode !== 'line') return null
  // The session press needs its open action; without it no button is drawn
  const relay = view.relay
  const open = (plan.open?.kind === 'session' && (openSession === undefined || relay === undefined)) ? undefined : plan.open
  const stepPress = (o: Open | undefined): (() => void) | undefined => (o?.kind === 'stop' ? step?.stop : o?.kind === 'wait' ? step?.wait : undefined)
  const press = open?.kind === 'focus' && endFocus !== undefined ? endFocus : open?.kind === 'fresh' && startFresh !== undefined ? startFresh : open?.kind === 'session' && relay !== undefined && openSession !== undefined ? () => openSession(relay) : (stepPress(open) ?? openPane)
  // On the desktop a session the app listed opens by its own link (the host's Link); elsewhere the press asks the app's window tool
  const Link = open?.kind === 'session' && relay?.link !== undefined && el.drag ? el.host?.Link : undefined
  const second = plan.second
  const secondPress = stepPress(second)
  return (
    <Box paddingX={cols(BAND_PAD_X)} flexDirection="row" alignItems="center" columnGap={cols(BAND_GAP)}>
      {plan.needs > 0 ? (
        <Box flexShrink={0}>
          {bandButton(el, 'band-needs', `◆ ${needsChip(plan.needs, tr)}`, plan.needsOpensSession === true && relay !== undefined && openSession !== undefined ? () => openSession(relay) : openNeeds, true)}
        </Box>
      ) : null}
      {plan.text === undefined ? null : (
        <Box flexShrink={1} overflow="hidden" minWidth={cols(plan.minPt)}>
          {/* Info is said dim; amber is kept for a risk or for something that waits on the person; red with ✗ for a failure */}
          <Text color={plan.info ? undefined : plan.fail === true ? DANGER : WARNING} dimColor={plan.info} wrap="truncate-end">
            {plan.text}
          </Text>
        </Box>
      )}
      {open === undefined ? null : (
        <Box flexShrink={0}>
          {Link !== undefined && relay?.link !== undefined ? <Link key="band-open-session" href={relay.link} label={padded(open.label)} /> : bandButton(el, open.kind === 'focus' ? 'band-focus-end' : open.kind === 'fresh' ? 'band-fresh' : open.kind === 'session' ? 'band-open-session' : open.kind === 'stop' ? 'band-step-stop' : open.kind === 'wait' ? 'band-step-wait' : 'band-details', open.label, press)}
        </Box>
      )}
      {open === undefined || second === undefined || secondPress === undefined ? null : <Box flexShrink={0}>{bandButton(el, 'band-step-wait', second.label, secondPress)}</Box>}
      {chip}
    </Box>
  )
}

// A figure takes the bar's level colour: dim, amber from LEVEL_AMBER_PCT, red from LEVEL_RED_PCT; an old reading's figure stays dim (its bar keeps the colour).
const figureColor = (pct: number): string | undefined => (pct >= LEVEL_RED_PCT ? DANGER : pct >= LEVEL_AMBER_PCT ? WARNING : undefined)

// The chip grows into the free middle of the row and keeps its parts at the right end, centred on the text line.
function drawChip(el: El, c: Chip | undefined, fit: ChipFit) {
  const { Box, Text, Svg } = el
  if (c === undefined || fit === 'none') return null
  const parts = drawnParts(c, fit)
  const old = c.age !== undefined
  const age = c.age === undefined || c.age === '' ? '' : ` · ${c.age}`
  return (
    <Box flexGrow={1} flexShrink={0} flexDirection="row" justifyContent="flex-end" alignItems="center" columnGap={cols(BAND_GAP)}>
      {parts.map((p, n) => (
        <Box key={`band-limit-${p.label}`} flexDirection="row" alignItems="center" columnGap={cols(BAND_GAP / 2)}>
          <Text dimColor>{p.label}</Text>
          {Svg ? <Svg source={pillSvg(p.pct, BAND_CHIP_W, BAND_CHIP_W)} alt="" width={BAND_CHIP_W} height={BAR_H} /> : null}
          <Text color={old ? undefined : figureColor(p.pct)} dimColor={old || figureColor(p.pct) === undefined}>{`${fmt.percent(p.pct)}${partShowsReset(c, fit, p) ? ` · ${p.reset}` : ''}${n === parts.length - 1 ? age : ''}`}</Text>
        </Box>
      ))}
    </Box>
  )
}
