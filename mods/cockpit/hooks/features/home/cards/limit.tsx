// The Plan limits card: each limit of the plan as a bar with its words, the one that leads first (the one that runs out first
import { tr } from '../../../core/lang'
import { Bar, Card, vstep } from '../../../ui/kit'
import { BODY_ROW_GAP } from '../../../ui/tokens'
import { limitBlocks, limitLines, limitSegments } from '../logic'
import type { Detail, LimitBlock, View } from '../logic'
import type { Prefs } from '../prefs'
import { moreOf } from '../parts'
import type { PaneCtx } from '../parts'
import { limitTidy } from './tidy'
import { fmt } from '../../../core/fmt'

export type LimitModel = { d: Detail; blocks: LimitBlock[]; limit: ReturnType<typeof limitLines> }

export function limitModel(view: View, prefs: Prefs): LimitModel {
  const d = prefs.cardDetail.limit
  const blocks = limitBlocks(view)
  return { d, blocks, limit: limitLines(blocks, d, view, tr) }
}

export function LimitCard(c: PaneCtx, m: LimitModel, grow: boolean) {
  const { el } = c
  const { Box, Text } = el
  const { d: dLimit, blocks, limit } = m
  const inner = c.widthPt
  const barOf = (b: LimitBlock, width: number, right?: string) => Bar(el, b.percent, `limit-bar-${b.kind}`, `${tr(b.short)} ${fmt.percent(b.percent)} ${tr('used')}`, width, right)
  const multi = dLimit === 'simple' && blocks.length > 1
  return Card(
    el,
    'limit',
    'Plan limits',
    multi ? '' : limit.note,
    blocks.length === 0 ? (
      <Text dimColor>{tr('Nothing to show yet. This appears after the first answer.')}</Text>
    ) : dLimit === 'simple' ? (
      blocks.length === 1 ? (
        barOf(blocks[0], inner, `${fmt.percent(blocks[0].percent)}`)
      ) : (
        <Box flexDirection="column">
          {/* Whole segments wrap to a second line : none is cut and a later limit never hides behind "…". */}
          <Box flexDirection="row" flexWrap="wrap">
            {[...(limit.note === '' ? [] : [limit.note]), ...limitSegments(blocks, tr)].map((s, n, all) => (
              <Text key={`lr-${n}`}>{n < all.length - 1 ? `${s} · ` : s}</Text>
            ))}
          </Box>
        </Box>
      )
    ) : (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>{limitTidy(c, m)}</Box>
    ),
    { grow, ...moreOf(c, 'limit', blocks.length === 0) },
  )
}
