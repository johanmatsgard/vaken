// The band: one row that never wraps.
import { topLine } from '../../core/band'
import { needsChip } from '../../core/cardrules'
import { FOCUS_BAND_ID } from '../../core/focus'
import { tr } from '../../core/lang'
import { bandWords } from '../../core/happened'
import { Pressable, WARNING, glyphPt, padded, pillSvg } from '../../ui/kit'
import type { El } from '../../ui/kit'
import { BAND_CHIP_W, BAND_GAP, BAND_MARK_PT, BAND_PAD_X, BAR_H, COL_PT, cols } from '../../ui/tokens'
import { LIMIT_HOT_PCT, bandLead, needsCount, resetSaid } from './logic'
import type { Detail, View } from './logic'
import { fmt } from '../../core/fmt'

// During Focus (core/focus.ts) the band's top line is "Focus · 32 min left" unless something urgent waits
export function bandLineCut(text: string, columns: number | undefined, chipText: string): boolean {
  if (columns === undefined || columns <= 0) return false
  const chipPt = chipText === '' ? 0 : [...chipText].reduce((sum, c) => sum + glyphPt(c), 0) + BAND_CHIP_W + BAND_GAP
  const room = columns * COL_PT - 2 * BAND_PAD_X - BAND_GAP - chipPt
  return BAND_MARK_PT + [...text].reduce((sum, c) => sum + glyphPt(c), 0) > room
}

function bandButton(el: El, key: string, label: string, onPress: () => void) {
  const { Button } = el
  return Pressable(el, key, <Button key={key} label={padded(label)} plain onPress={onPress} />, onPress, true)
}

export function HomeBand(el: El, view: View, detail: Detail, openPane: () => void, endFocus?: () => void, openNeeds: () => void = openPane, columns?: number) {
  const { Box, Text, Svg } = el
  const needs = needsCount(view)
  const top = topLine(needs, view.band ?? [], view.now ?? 0)
  const lead = bandLead(view)
  const pct = lead?.percent
  const chip = pct !== undefined
  if (top === undefined && !chip) return null
  const hot = pct !== undefined && pct >= LIMIT_HOT_PCT
  const reset = detail === 'explained' && lead !== undefined ? resetSaid(lead.reset, tr) : ''
  const focus = (view.band ?? []).find(x => x.id === FOCUS_BAND_ID)
  const isFocusTop = focus !== undefined && top !== undefined && top.more === 0 && top.text === focus.text && endFocus !== undefined
  const chipText = chip && pct !== undefined ? `${tr(lead?.short ?? 'Plan')}${fmt.percent(pct)}${reset === '' ? '' : ` · ${reset}`}` : ''
  // The Short look has no Details word
  const cut = top !== undefined && needs === 0 && bandLineCut(`${bandWords(top, tr)}`, columns, chipText)
  const open = top === undefined ? undefined : isFocusTop ? tr('End pause') : top.more > 0 ? tr('See all {n}').replace('{n}', String(top.more + 1)) : detail === 'explained' || cut ? tr('Details') : undefined
  return (
    <Box paddingX={cols(BAND_PAD_X)} flexDirection="row" columnGap={cols(BAND_GAP)}>
      {needs > 0 ? (
        <Box flexShrink={0}>
          {bandButton(el, 'band-needs', `◆ ${needsChip(needs, tr)}`, openNeeds)}
        </Box>
      ) : null}
      {top === undefined || needs > 0 ? null : (
        <Box flexShrink={1} overflow="hidden">
          <Text color={top.mark === '✓' || isFocusTop ? undefined : WARNING} dimColor={top.mark === '✓' || isFocusTop} wrap="truncate-end">
            {`${top.mark} ${bandWords(top, tr)}`}
          </Text>
        </Box>
      )}
      {open === undefined ? null : (
        <Box flexShrink={0}>
          {bandButton(el, isFocusTop ? 'band-focus-end' : 'band-details', open, isFocusTop && endFocus !== undefined ? endFocus : openPane)}
        </Box>
      )}
      <Box flexGrow={1} />
      {chip && pct !== undefined ? (
        <Box flexShrink={0} flexDirection="row" columnGap={cols(BAND_GAP / 2)}>
          <Text dimColor>{tr(lead?.short ?? 'Plan')}</Text>
          {Svg ? <Svg source={pillSvg(pct, BAND_CHIP_W, BAND_CHIP_W)} alt="" width={BAND_CHIP_W} height={BAR_H} /> : null}
          <Text color={hot ? WARNING : undefined} dimColor={!hot}>{`${fmt.percent(pct)}${reset === '' ? '' : ` · ${reset}`}`}</Text>
        </Box>
      ) : null}
    </Box>
  )
}
