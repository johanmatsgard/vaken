// The card guide: one tile per card, in the All view's order (Standard's six first)
import { BACK_LABEL } from '../../../core/cardsettings'
import { GUIDE_EXAMPLE, GUIDE_NEEDS, GUIDE_OFF, GUIDE_SHOWN, GUIDE_TITLE, GUIDE_TURN, guideLines } from '../../../core/cardguide'
import type { GuideLine } from '../../../core/cardguide'
import { t, tr } from '../../../core/lang'
import { CARD_GAP, cardGapX, ViewHeader, Card, FactRow, List, Row, SwitchRow, vstep } from '../../../ui/kit'
import type { El } from '../../../ui/kit'
import { BORDER_X_PT, GROUP_GAP, LIST_COL_GAP, LIST_ROW_GAP, LIST_ROW_H, cols } from '../../../ui/tokens'
import { placeColumns } from '../board'
import { paneGrid } from '../grid'
import type { Acts, Prefs } from '../prefs'
import { ALL_IDS, viewModeOf } from '../viewset'

const exampleRows = (sample: string): string[] => tr(sample).split(', ').slice(0, 3)

export function GuideView(el: El, own: Prefs, act: Acts, innerPt: number) {
  const { Box, Text } = el
  const hiddenNow = new Set<string>(own.hidden)
  const waiting = new Set<string>(own.autoHidden ?? [])
  const custom = viewModeOf(own.values) === 'custom'
  const lines = guideLines(ALL_IDS)
  // The bottom rows and the tiles use one column's inner width: a picture (a rule
  const grid = paneGrid(innerPt + 2 * BORDER_X_PT, own.values['look.columns'], lines.length)
  const groups = placeColumns(lines.length, grid.ncol)
  const tile = (l: GuideLine) => {
    const shown = !hiddenNow.has(l.id)
    const note = !shown && waiting.has(l.id) ? [tr(l.promise), tr(l.shows)] : [tr(l.promise)]
    const head = custom
      ? SwitchRow(el, `guide-${l.id}`, l.title, l.promise, shown, shown ? 'hide' : 'show', () => act.setSetting(`cards.${l.id}`, shown ? 'hide' : 'show'), grid.innerPt)
      :
        FactRow(el, `guide-${l.id}`, tr(l.title), shown ? tr(GUIDE_SHOWN) : tr(GUIDE_OFF), { note })
    return (
      <Box key={`guide-tile-${l.id}`} flexDirection="column" rowGap={vstep(LIST_ROW_GAP)}>
        {head}
        {List(
          el,
          exampleRows(l.sample).map((w, n) => Row(el, `guide-ex-${l.id}-${n}`, <Text dimColor wrap="truncate-end">{n === 0 ? `${tr(GUIDE_EXAMPLE)}: ${w}` : w}</Text>, { minPt: LIST_ROW_H })),
        )}
        {custom && !shown && waiting.has(l.id) ? <Text dimColor>{tr(l.shows)}</Text> : null}
      </Box>
    )
  }
  return (
    <Box flexDirection="column" width="100%" alignItems="stretch" rowGap={vstep(CARD_GAP)}>
      {ViewHeader(el, 'guide-head', { key: 'guide-done', label: tr(BACK_LABEL), onPress: () => act.openGuide(false) }, tr(GUIDE_TITLE))}
      {Card(
        el,
        'guide-card',
        t('common.cards'),
        '',
        <Box flexDirection="column" rowGap={vstep(GROUP_GAP)}>
          <Text dimColor>{tr(GUIDE_NEEDS)}</Text>
          <Box key="guide-columns" width="100%" flexDirection="row" columnGap={grid.gapCells} alignItems="stretch">
            {groups.map((g, n) => (
              <Box key={`guide-col-${n}`} width={grid.colCells} flexGrow={1} flexShrink={1} overflow="hidden" flexDirection="column" rowGap={vstep(GROUP_GAP)}>
                {g.map(i => tile(lines[i] as GuideLine))}
              </Box>
            ))}
          </Box>
          {/* The row sits straight in the column: inside a wrapper Box (a row by default) it shrank to its words */}
          {Row(el, 'guide-turn', <Text wrap="truncate-end">{tr(GUIDE_TURN)}</Text>, { chevron: { dir: 'right', onToggle: () => act.openSettingsAt('Cards') }, press: { onPress: () => act.openSettingsAt('Cards'), widthPt: grid.innerPt, heightPt: LIST_ROW_H }, minPt: LIST_ROW_H })}
        </Box>,
      )}
    </Box>
  )
}
