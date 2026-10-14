// The This session card: yesterday's open ends on top, its state and cost, the context bar, the cache line
import { topicWhatIs } from '../../../core/whatis'
import { restLines } from '../../../core/compactrest'
import { ASK_LATER, ASK_TITLE, ASK_YES, NOTE_RIGHT, NOTE_ROW, WHY_RIGHT, WHY_ROW } from '../../../core/compactwords'
import { askNow, lastNote, noteWords } from '../../../core/autosafe'
import { t, tr } from '../../../core/lang'
import { isOpenHold } from '../../../core/inbox'
import { compacting } from '../../compaction'
import { ActionButton, Advice, Bar, CARD_GAP, CARD_GAP_X, Card, FactRow, LinkButton, OpenLine, vstep } from '../../../ui/kit'
import { ADVICE_BUTTON_GAP, BODY_ROW_GAP, LIST_COL_GAP, cols } from '../../../ui/tokens'
import { cacheTtlMs, hereLines, reasonWords, stateWord } from '../logic'
import type { Detail, View } from '../logic'
import type { Prefs } from '../prefs'
import { extraOf, whyNotNowTr } from '../compactwhy'
import { moreOf, toggle, whatLine } from '../parts'
import type { PaneCtx } from '../parts'
import { compactAsk, simple } from '../state'
import { hereTalk } from './talk'
import { FocusPart, OpenEndsPart } from './calm'
import { FitAdvice } from './modelfit'
import { hereTidyContext } from './tidy'
import { fmt } from '../../../core/fmt'

export const ADVICE_ROWS = 4

function contextRowOf(lines: ReturnType<typeof hereLines>, percent: number | undefined, compactAt: number | undefined): { left: string; right: string } | undefined {
  if (lines.used !== undefined) return { left: lines.used, right: `${percent === undefined ? '' : `${fmt.percent(percent)}`}${compactAt === undefined ? '' : `${percent === undefined ? '' : ' · '}${tr('Compacts at').toLowerCase()} ${fmt.percent(compactAt)}`}` }
  return lines.context === undefined ? undefined : { left: lines.context, right: compactAt === undefined ? '' : `${tr('Compacts at').toLowerCase()} ${fmt.percent(compactAt)}` }
}

export type HereWaits = 'pane.here_waits_halt' | 'pane.here_waits_hold'
export const hereWaitsOf = (prefs: Prefs): HereWaits | undefined => (prefs.halted ? 'pane.here_waits_halt' : prefs.inbox.some(it => it.here && isOpenHold(it)) ? 'pane.here_waits_hold' : undefined)

// `waits` is worked out once here: the card, its Glance headline and its dot read it (features/home/pane.tsx)
export type HereModel = { d: Detail; here: View['here']; lines: ReturnType<typeof hereLines>; contextRow: { left: string; right: string } | undefined; whyNot?: string; note?: string; ask?: boolean; waits?: HereWaits }

export function hereModel(view: View, prefs: Prefs): HereModel {
  const d = prefs.cardDetail.here
  const here = view.here
  const extra = extraOf(prefs)
  const lines = hereLines(here, d, cacheTtlMs(view.usage), view.now, prefs.values['compact.mode'] !== 'off', prefs.values['cache.keeper'] === 'on', extra, tr)
  const contextRow = d === 'explained' ? contextRowOf(lines, here?.rec.contextPercent, here?.rec.ctx?.compactAt) : undefined
  const whyNot = d === 'explained' && prefs.values['compact.mode'] !== 'off' ? whyNotNowTr(here, cacheTtlMs(view.usage), view.now, extra) : undefined
  const noted = lastNote(prefs.ledger, prefs.sid, view.now)
  const note = noted?.detail === undefined ? undefined : noteWords(noted.detail, tr)
  const ask = askNow(prefs.ledger, prefs.values['compact.mode'], view.now)
  const waits = hereWaitsOf(prefs)
  return { d, here, lines, contextRow, ...(whyNot === undefined ? {} : { whyNot }), ...(note === undefined ? {} : { note }), ...(ask ? { ask } : {}), ...(waits === undefined ? {} : { waits }) }
}

export function HereCard(c: PaneCtx, m: HereModel, grow: boolean) {
  const { el, prefs, act } = c
  const { Box, Text } = el
  const { d: dHere, here, lines, contextRow, waits } = m
  const inner = c.widthPt
  // The Context health card shows it on its "Kept when compacted" row
  const restFacts = prefs.rest === undefined || !prefs.hidden.includes('context') ? [] : [`${tr('Compact when idle, last look:')} ${tr(prefs.rest.ready ? 'a good moment' : 'not yet')}.`, ...restLines(prefs.rest.checks, tr)]
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
          LinkButton(el, 'simple-say', 'Say the last answer simpler ›', act.saySimpler, { row: true })
        ) : (
          <Box key="simple-row" flexDirection="row" justifyContent="flex-end">
            {ActionButton(el, 'simple-close', 'Close', act.closeSimpler)}
          </Box>
        )}
      </Box>
    )
  const adviceEl = lines.advice === undefined ? null : Advice(el, 'compact-advice', lines.advice[0], lines.advice[1])
  const asking = compactAsk.lines !== undefined && !compacting.pending
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
  const compactEl = asking ? compactAskEl : lines.advice === undefined && !(compacting.pending) ? null : (
            <Box key="compact-row" flexDirection="row" alignItems="center" columnGap={cols(LIST_COL_GAP)}>
              {compacting.pending ? (
                <Text dimColor>{tr('Compacting…')}</Text>
              ) : (
                <Box flexDirection="column" flexGrow={1} rowGap={vstep(ADVICE_BUTTON_GAP)}>
                  <Box flexDirection="row">{ActionButton(el, 'compact-now', 'Compact now', act.compactNow, { primary: true })}</Box>
                  {LinkButton(el, 'compact-help', 'About this ›', () => act.openHelp(true), { row: true })}
                </Box>
              )}
            </Box>
          )
  const whyEl = m.whyNot === undefined ? null : (
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
              <Box marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexShrink={0} columnGap={cols(CARD_GAP_X)}>
                {ActionButton(el, 'ask-shorten-yes', ASK_YES, () => act.askShorten?.(true), { primary: true, gap: CARD_GAP_X })}
                {ActionButton(el, 'ask-shorten-later', ASK_LATER, () => act.askShorten?.(false), { gap: CARD_GAP_X })}
              </Box>
            </Box>
          )
  const subtitle = here === undefined ? '' : here.name
  const [stateRow, stateOpen] = here === undefined ? [null, null] : whatLine(c, 'here', <Text>{tr('State')}</Text>, hereWhat, undefined, 1, stateSaid, true)
  const stateDetail = here === undefined ? null : waits !== undefined ? <Text dimColor>{t(waits)}</Text> : here.kind === 'needs' && here.reason !== '' ? <Text dimColor>{reasonWords(here.reason, tr)}</Text> : null
  const glanceBody =
    here === undefined ? (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {OpenEndsPart(c)}
        <Text dimColor>{tr(lines.head)}</Text>
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
        {adviceEl}
        {compactEl}
        {hereTalk(c)}
        {FitAdvice(c)}
        {lines.cost === undefined ? null : FactRow(el, 'here-cost', tr('Cost'), `${lines.cost} ${tr('if paid per use (your plan may differ)')}`)}
        {hereTidyContext(c, m)}
        {lines.cache === undefined ? null : FactRow(el, 'here-cache', tr('Cache'), lines.cache.replace(/^Cache\s*/, ''))}
        {whyEl}
        {noteEl}
        {askEl}
        {simpleRow}
        {FocusPart(c)}
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
          {whatLine(c, 'here', <Text>{lines.head}</Text>, hereWhat)}
          {hereTalk(c)}
          {FitAdvice(c)}
          {here?.rec.contextPercent === undefined ? null : Bar(el, here.rec.contextPercent, 'ctx-bar', `${fmt.percent(here.rec.contextPercent)} ${tr('of context used')}`, inner, lines.context)}
          {lines.advice === undefined ? null : <Text dimColor>{lines.advice[0]}</Text>}
        </Box>
      ) : (
        <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
          {whatLine(
            c,
            'here',
            <Box flexDirection="row" justifyContent="space-between" columnGap={cols(LIST_COL_GAP)}>
              <Text>{lines.head}</Text>
              {lines.cost === undefined ? null : <Text dimColor>{lines.cost}</Text>}
            </Box>,
            hereWhat,
          )}
          {hereTalk(c)}
          {FitAdvice(c)}
          <Box flexDirection="column">
            {here?.rec.contextPercent === undefined ? null : Bar(el, here.rec.contextPercent, 'ctx-bar', `${fmt.percent(here.rec.contextPercent)} ${tr('of context used')}`, inner, undefined, here.rec.ctx?.compactAt)}
            {contextRow === undefined ? null : (
              <Box flexDirection="row" justifyContent="space-between">
                <Text dimColor>{contextRow.left}</Text>
                <Text dimColor>{contextRow.right}</Text>
              </Box>
            )}
          </Box>
          {lines.cache === undefined ? null : <Text key="here-cache-line" dimColor>{lines.cache}</Text>}
          {adviceEl}
          {compactEl}
          {whyEl}
          {noteEl}
          {askEl}
          {simpleRow}
          {FocusPart(c)}
        </Box>
      )}
    </Box>
    ),
    { grow, ...moreOf(c, 'here') },
  )
}
