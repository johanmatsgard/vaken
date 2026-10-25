// The This session card: yesterday's open ends on top, its state and cost, the context bar, the cache line
import { topicWhatIs } from '../../../core/whatis'
import { restLines } from '../../../core/compactrest'
import { ASK_LATER, ASK_TITLE, ASK_YES, NOTE_RIGHT, NOTE_ROW, WHY_RIGHT, WHY_ROW } from '../../../core/compactwords'
import { askNow, lastNote, noteWords } from '../../../core/autosafe'
import { SEL_COPY, SEL_EXPLAIN, SEL_HINT, SEL_OPEN, SEL_TASK, SEL_TITLE } from '../../../core/selected'
import { t, tr } from '../../../core/lang'
import { fromOf } from '../../../core/compactnudge'
import { isOpenHold } from '../../../core/inbox'
import { lookWords } from '../../../core/proof'
import { compacting } from '../../compaction'
import type { Drawn } from '../../../ui/kit'
import { ActionButton, Advice, Bar, CARD_GAP, cardGapX, Card, FactRow, LinkButton, Mark, OpenLine, glyphPt, vstep } from '../../../ui/kit'
import { ADVICE_BUTTON_GAP, BODY_ROW_GAP, LIST_COL_GAP, ROW_PT, TEXT_WIDE_PT, cols, rows } from '../../../ui/tokens'
import { cacheTtlMs, hereLines, reasonWords, stateWord } from '../logic'
import type { Detail, View } from '../logic'
import type { Prefs } from '../prefs'
import { extraOf, whyNotNowTr } from '../compactwhy'
import { calmOnce } from './lines'
import { moreOf, toggle, whatLine } from '../parts'
import type { PaneCtx } from '../parts'
import { compactAsk, simple } from '../state'
import { hereTalk } from './talk'
import { OpenEndsPart } from './calm'
import { FitAdvice } from './modelfit'
import { KeepCheckLine } from './keepcheck'
import { hereTidyContext } from './tidy'
import { fmt } from '../../../core/fmt'
import { fillIn } from '../../../core/fillin'

// The head before the first answer when the line about the last prompt already says what to send
const NOT_YET_SENT = 'Nothing to show yet. This appears after the first answer.'
export const ADVICE_ROWS = 3

// Where the session is compacted, by whom: vaken's own point (Auto, "Compact when it fills") and Claude Code's.
// The bar marks each point and the dim line under it names them (pointsLine).
// `past`: the context is already past vaken's own point, so the line no longer names it (the bar keeps its mark)
export type Points = { own?: number; app?: number; line?: string; marks: number[]; past?: boolean }
export function compactPoints(prefs: Prefs, appAt: number | undefined, pct?: number): Points {
  const mode = prefs.values['compact.mode']
  const own = mode === undefined || mode === 'auto' ? fromOf(prefs.values['compact.from']) : undefined
  const past = own !== undefined && pct !== undefined && pct >= own
  const p = { ...(own === undefined ? {} : { own }), ...(appAt === undefined ? {} : { app: appAt }), marks: [...(own === undefined ? [] : [own]), ...(appAt === undefined ? [] : [appAt])], ...(past ? { past } : {}) }
  const line = pointsLine(p, undefined)
  return { ...p, ...(line === undefined ? {} : { line }) }
}

// A line's width as the band measures it: letter by letter, a percent sign as a wide letter
const linePt = (s: string): number => [...s].reduce((sum, ch) => sum + (ch === '%' ? TEXT_WIDE_PT : glyphPt(ch)), 0)
// The line in the longest form that fits one row of `widthPt`, so no word is left alone on a second line:
// "Vaken compacts at 60% · Claude Code at 92%", else "Compacts: vaken 60% · Claude Code 92%", else only the nearer point
export function pointsLine(p: Points, widthPt: number | undefined): string | undefined {
  const own = p.past === true ? undefined : p.own
  const a = own === undefined ? '' : fmt.percent(own)
  const b = p.app === undefined ? '' : fmt.percent(p.app)
  const ownOnly = fillIn(tr('Vaken compacts at {a}'), { a })
  const appOnly = fillIn(tr('Claude Code compacts at {b}'), { b })
  if (own === undefined) return p.app === undefined ? undefined : appOnly
  if (p.app === undefined) return ownOnly
  const forms = [tr('Vaken compacts at {a} · Claude Code at {b}'), tr('Compacts: vaken {a} · Claude Code {b}')].map(f => fillIn(f, { a, b }))
  const fits = forms.find(f => widthPt === undefined || linePt(f) <= widthPt)
  return fits ?? (own <= p.app ? ownOnly : appOnly)
}

// A note under a value starts with a capital: "If paid per use (your plan may differ)"
const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

export type HereWaits = 'pane.here_waits_halt' | 'pane.here_waits_hold'
export const hereWaitsOf = (prefs: Prefs): HereWaits | undefined => (prefs.halted ? 'pane.here_waits_halt' : prefs.inbox.some(it => it.here && isOpenHold(it)) ? 'pane.here_waits_hold' : undefined)

// `waits` is worked out once here: the card, its Glance headline and its dot read it (features/home/pane.tsx)
export type HereModel = { d: Detail; here: View['here']; lines: ReturnType<typeof hereLines>; contextLine: string | undefined; points: Points; whyNot?: string; note?: string; ask?: boolean; waits?: HereWaits }

export function hereModel(view: View, prefs: Prefs): HereModel {
  const d = prefs.cardDetail.here
  const here = view.here
  const extra = extraOf(prefs)
  const waits = hereWaitsOf(prefs)
  const lines = hereLines(here, d, cacheTtlMs(view.usage), view.now, prefs.values['compact.mode'] !== 'off', prefs.values['cache.keeper'] === 'on', extra, tr, waits === undefined ? undefined : waits === 'pane.here_waits_halt' ? 'halt' : 'hold')
  const points = compactPoints(prefs, here?.rec.ctx?.compactAt, here?.rec.contextPercent)
  const contextLine = d === 'explained' && here?.rec.contextPercent !== undefined ? points.line : undefined
  const whyNot = d === 'explained' && prefs.values['compact.mode'] !== 'off' ? whyNotNowTr(here, cacheTtlMs(view.usage), view.now, prefs) : undefined
  const noted = lastNote(prefs.ledger, prefs.sid, view.now)
  const note = noted?.detail === undefined ? undefined : noteWords(noted.detail, tr)
  const ask = askNow(prefs.ledger, prefs.values['compact.mode'], view.now)
  return { d, here, lines, contextLine, points, ...(whyNot === undefined ? {} : { whyNot }), ...(note === undefined ? {} : { note }), ...(ask ? { ask } : {}), ...(waits === undefined ? {} : { waits }) }
}

// Finished answers that changed files and wait for a look: one calm dim line with the normal dot, never amber, counted nowhere (it left Needs you)
export function LookLine(c: PaneCtx): Drawn {
  const it = c.prefs.inbox.find(x => x.kind === 'review' && x.here)
  if (it === undefined) return null
  const { Box, Text } = c.el
  return (
    // On a wrapped line the dot stays on the first line, centred in one text row (as a session row's mark)
    <Box key="here-look" flexDirection="row" alignItems="flex-start">
      <Box height={rows(ROW_PT)} flexShrink={0} justifyContent="center">
        {Mark(c.el, 'idle', t('access.dot_calm'))}
      </Box>
      <Box flexShrink={1}>
        <Text dimColor>{lookWords(it.count, tr)}</Text>
      </Box>
    </Box>
  )
}

export function HereCard(c: PaneCtx, m: HereModel, grow: boolean) {
  const { el, prefs, act } = c
  const { Box, Text } = el
  const { d: dHere, here, lines, contextLine, points, waits } = m
  const inner = c.widthPt
  // The Memory and notes card shows it on its "Kept when compacted" row only while this card is hidden (home/context.ts)
  const restFacts = prefs.rest === undefined || !(prefs.hidden.includes('context') || prefs.autoHidden?.includes('context') === true) ? [] : [`${tr('Compact when idle, last look:')} ${tr(prefs.rest.ready ? 'a good moment' : 'not yet')}.`, ...restLines(prefs.rest.checks, tr)]
  // With this session's own step stopped, or its pause on, Claude cannot go on until you act
  const stateSaid = here === undefined ? '' : tr(waits === undefined ? stateWord(here.kind) : stateWord('needs'))
  const hereWhat = here === undefined ? undefined : { ...topicWhatIs('session', `${stateSaid}${here.reason === '' ? '' : `: ${reasonWords(here.reason, tr)}`}. ${tr('The cost is what Claude Code reports for this session, at list price. A plan does not charge it this way.')}`), ...(restFacts.length === 0 ? {} : { facts: restFacts }) }
  const simpleRow =
    !prefs.hasAnswer && simple.lines === undefined ? null : (
      <Box key="simple" flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
        {simple.lines === undefined ? null : (
          <Box flexDirection="column">
            {simple.lines.map((l, n) => (
              <Text key={`simple-${n}`} dimColor>
                {l}
              </Text>
            ))}
          </Box>
        )}
        {simple.pending ? (
          <Text dimColor>{tr('Making it simpler…')}</Text>
        ) : simple.lines === undefined ? (
          LinkButton(el, 'simple-say', 'Say the last answer simpler ›', act.saySimpler, { row: true, dim: true })
        ) : (
          <Box key="simple-row" flexDirection="row" justifyContent="flex-end">
            {ActionButton(el, 'simple-close', 'Close', act.closeSimpler)}
          </Box>
        )}
      </Box>
    )
  const asking = compactAsk.lines !== undefined && !compacting.pending
  // While "Let vaken compact at good moments?" asks, its Yes is the card's one primary button: the compact advice block (Compact now, Why, When to compact) waits
  const offering = m.ask === true && act.askShorten !== undefined && !compacting.pending
  // One advice line; the why is behind Why compact? ›. While "Not a good moment" asks, its own words stand alone (no "Compact now." above them).
  // Beside the Compact now button the line drops its own "Compact now." (advicePlain)
  const adviceEl = lines.advice === undefined || asking || offering ? null : Advice(el, 'compact-advice', lines.advicePlain ?? lines.advice[0])
  const compactAskEl = !asking ? null : (
            <Box key="compact-ask" flexDirection="column">
              {Advice(el, 'compact-ask-text', t('cardcompact.ask_title'))}
              {(compactAsk.lines ?? []).map((l, n) => (
                <Text key={`compact-ask-${n}`} dimColor>
                  {l}
                </Text>
              ))}
              <Box marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexShrink={0} columnGap={cols(CARD_GAP)}>
                {ActionButton(el, 'compact-anyway', t('cardcompact.anyway'), act.compactAnyway, { primary: true, gap: CARD_GAP })}
                {ActionButton(el, 'compact-not-now', ASK_LATER, act.compactNotNow, { gap: CARD_GAP })}
              </Box>
            </Box>
          )
  const compactEl = asking ? compactAskEl : (lines.advice === undefined || offering) && !compacting.pending ? null : (
            <Box key="compact-row" flexDirection="row" alignItems="center" columnGap={cols(LIST_COL_GAP)}>
              {compacting.pending ? (
                <Text dimColor>{tr('Compacting…')}</Text>
              ) : (
                <Box flexDirection="column" flexGrow={1} rowGap={vstep(ADVICE_BUTTON_GAP)}>
                  <Box flexDirection="row">{ActionButton(el, 'compact-now', 'Compact now', act.compactNow, { primary: true })}</Box>
                  {LinkButton(el, 'compact-help', 'Why compact? ›', () => act.openHelp(true), { row: true })}
                </Box>
              )}
            </Box>
          )
  // When to compact shows only with the advice
  const whyEl = m.whyNot === undefined || lines.advice === undefined || offering ? null : (
            <Box key="why-not-now" flexDirection="column">
              {OpenLine(el, 'ol-here:why', <Text>{tr(WHY_ROW)}</Text>, prefs.open === 'here:why', toggle(c, 'here:why'), { widthPt: inner, right: tr(WHY_RIGHT) })}
              {prefs.open === 'here:why' ? <Text key="w-here:why-open" dimColor>{m.whyNot}</Text> : null}
            </Box>
          )
  const noteEl = m.note === undefined ? null : (
            <Box key="last-shortening" flexDirection="column">
              {OpenLine(el, 'ol-here:note', <Text>{tr(NOTE_ROW)}</Text>, prefs.open === 'here:note', toggle(c, 'here:note'), { widthPt: inner, right: tr(NOTE_RIGHT) })}
              {prefs.open === 'here:note' ? <Text key="w-here:note-open" dimColor>{m.note}</Text> : null}
            </Box>
          )
  const askEl = m.ask !== true || act.askShorten === undefined ? null : (
            <Box key="ask-shorten" flexDirection="column">
              {Advice(el, 'ask-shorten-text', tr(ASK_TITLE))}
              <Box marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexShrink={0} columnGap={cols(cardGapX())}>
                {ActionButton(el, 'ask-shorten-yes', ASK_YES, () => act.askShorten?.(true), { primary: true, gap: cardGapX() })}
                {ActionButton(el, 'ask-shorten-later', ASK_LATER, () => act.askShorten?.(false), { gap: cardGapX() })}
              </Box>
            </Box>
          )
  // Selected text: a dim pointer row that opens (calm is quiet: it is always there), then three whole-row presses; each press reads the selection when it is pressed (core/selected.ts)
  const selected = act.selected
  const selEl = !prefs.hasAnswer || selected === undefined ? null : (
            <Box key="selected-text" flexDirection="column">
              {OpenLine(el, 'ol-here:sel', <Text dimColor>{tr(SEL_TITLE)}</Text>, prefs.open === SEL_OPEN, toggle(c, SEL_OPEN), { widthPt: inner })}
              {prefs.open !== SEL_OPEN ? null : (
                <Box key="selected-open" flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
                  <Text key="selected-hint" dimColor>{tr(SEL_HINT)}</Text>
                  {LinkButton(el, 'sel-explain', SEL_EXPLAIN, selected.explain, { row: true })}
                  {LinkButton(el, 'sel-task', SEL_TASK, selected.task, { row: true })}
                  {LinkButton(el, 'sel-copy', SEL_COPY, selected.copy, { row: true })}
                </Box>
              )}
            </Box>
          )
  const subtitle = here === undefined ? '' : here.name
  // Before the first answer the better-prompt line about the last prompt may show: then the head does not also ask for a message (one fact once)
  const talk = hereTalk(c)
  const head = here === undefined && talk.some(x => x !== null && x !== undefined) ? tr(NOT_YET_SENT) : lines.head
  // Explained: the state on its own row, the cost on its own Cost row; both open the same "What is this"
  const [stateLine, stateWhat] = whatLine(c, 'here', <Text>{head}</Text>, hereWhat)
  const costRow = lines.cost === undefined || hereWhat === undefined ? null : OpenLine(el, 'ol-here-cost', <Text>{tr('Cost')}</Text>, prefs.open === 'here', toggle(c, 'here'), { widthPt: inner, right: lines.cost })
  const [stateRow, stateOpen] = here === undefined ? [null, null] : whatLine(c, 'here', <Text>{tr('State')}</Text>, hereWhat, undefined, 1, stateSaid, true)
  const stateDetail = here === undefined ? null : waits !== undefined ? <Text dimColor>{t(waits)}</Text> : here.kind === 'needs' && here.reason !== '' ? <Text dimColor>{capital(reasonWords(here.reason, tr))}</Text> : null
  const glanceBody =
    here === undefined ? (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {OpenEndsPart(c)}
        <Text dimColor>{tr(head)}</Text>
        {talk}
      </Box>
    ) : (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {OpenEndsPart(c)}
        {stateDetail === null ? (
          stateRow
        ) : (
          <Box key="here-state" flexDirection="column">
            {stateRow}
            {stateDetail}
          </Box>
        )}
        {stateOpen}
        {LookLine(c)}
        {KeepCheckLine(c)}
        {adviceEl}
        {compactEl}
        {talk}
        {FitAdvice(c)}
        {lines.cost === undefined ? null : FactRow(el, 'here-cost', tr('Cost'), lines.cost, { note: [capital(tr('if paid per use (your plan may differ)'))] })}
        {hereTidyContext(c, m)}
        {lines.cache === undefined ? null : FactRow(el, 'here-cache', tr('Cache'), lines.cache.replace(/^Cache\s*/, ''))}
        {whyEl}
        {noteEl}
        {askEl}
        {selEl}
        {simpleRow}
      </Box>
    )
  return Card(
    el,
    'here',
    'This session',
    subtitle,
    c.glanceOf !== undefined && dHere === 'explained' ? (
      glanceBody
    ) : (
    <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {OpenEndsPart(c)}
      {dHere !== 'explained' ? (
        // A column Box: what the fragment `<>` drew here (a fragment is a column Box)
        <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
          {whatLine(c, 'here', <Text>{head}</Text>, hereWhat)}
          {LookLine(c)}
          {KeepCheckLine(c)}
          {talk}
          {FitAdvice(c)}
          {here?.rec.contextPercent === undefined ? null : Bar(el, here.rec.contextPercent, 'ctx-bar', `${fmt.percent(here.rec.contextPercent)} ${tr('of context used')}`, inner, lines.context)}
          {lines.advice === undefined || asking ? null : <Text dimColor>{lines.advice[0]}</Text>}
          {selEl}
        </Box>
      ) : (
        <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
          {stateLine}
          {LookLine(c)}
          {KeepCheckLine(c)}
          {costRow}
          {stateWhat}
          {talk}
          {FitAdvice(c)}
          <Box flexDirection="column">
            {here?.rec.contextPercent === undefined ? null : Bar(el, here.rec.contextPercent, 'ctx-bar', `${fmt.percent(here.rec.contextPercent)} ${tr('of context used')}`, inner, fmt.percent(here.rec.contextPercent), points.marks)}
            {contextLine === undefined ? null : <Text key="here-ctx-line" dimColor>{pointsLine(points, inner) ?? contextLine}</Text>}
          </Box>
          {lines.cache === undefined ? null : <Text key="here-cache-line" dimColor>{lines.cache}</Text>}
          {adviceEl}
          {compactEl}
          {whyEl}
          {noteEl}
          {askEl}
          {selEl}
          {simpleRow}
          </Box>
      )}
    </Box>
    ),
    // Open at the Glance look, the State and Cost rows say the headline's facts, so the header leaves them out (GlanceOpts.bodySays)
    { grow, ...calmOnce(moreOf(c, 'here', false, c.glanceOf !== undefined && dHere === 'explained' && here !== undefined && (lines.cost !== undefined || here.rec.costUsd === undefined)), true) },
  )
}
