// The Plan limits card: each limit of the plan in a fixed order (5-hour, week, a model's week, as the band), its bar and the lines under it; the age of an old reading is the header note.
import { tr } from '../../../core/lang'
import { Card, ChipRow, namePt, vstep } from '../../../ui/kit'
import { BODY_ROW_GAP } from '../../../ui/tokens'
import { ageWord, keptBlocks, limitLines, limitReadAgo } from '../logic'
import type { Detail, LimitBlock, View } from '../logic'
import type { Prefs } from '../prefs'
import { moreOf } from '../parts'
import type { PaneCtx } from '../parts'
import { limitTidy } from './tidy'
import { liveWhere } from '../../cost'
import { whereFixOf } from '../../../core/cost'
import type { WhereFix, WhereWent } from '../../../core/cost'
import { cutsAll, leanMem } from '../../../core/lean'

// `readAgo`: how long ago a plan figure was read, undefined when none ever was. `empty`: why there is no figure, said in one phrase
// (not yet; the app gives none in this session; the last reading held none; an old reading's age)
export type LimitEmpty = 'yet' | 'none' | 'junk' | 'old'
// `where`: this session's spend by cause, with its one fix when a cause clearly leads (core/cost.ts whereOf)
export type LimitModel = { d: Detail; blocks: LimitBlock[]; limit: ReturnType<typeof limitLines>; readAgo?: number; empty?: LimitEmpty; where?: { went: WhereWent; fix?: WhereFix } }

// A session that has answered for this long and still has no reading is in a kind of session the app gives no plan limits to.
export const LIMIT_NONE_AFTER_MS = 10 * 60_000
// A reading this new that held no limit is a reading with none, not an old one.
const LIMIT_JUNK_MS = 60 * 60_000
export const LIMIT_YET = 'Not known yet. It shows after the first answer in the chat.'
// With a Glance header that says "Not known yet" (or "Not shared") itself, the body only explains
export const LIMIT_YET_ONCE = 'It shows after the first answer in the chat.'
export const LIMIT_NONE = 'The app does not share plan limits here.'
export const LIMIT_JUNK = 'The last reading held no plan limits.'
function emptyOf(view: View, readAgo: number | undefined): LimitEmpty {
  if (readAgo !== undefined) return readAgo <= LIMIT_JUNK_MS ? 'junk' : 'old'
  const rec = view.here?.rec
  const now = view.now ?? 0
  return rec !== undefined && rec.lastEventAt > rec.startedAt && now - rec.startedAt >= LIMIT_NONE_AFTER_MS ? 'none' : 'yet'
}

export function limitModel(view: View, prefs: Prefs): LimitModel {
  const d = prefs.cardDetail.limit
  const blocks = keptBlocks(view)
  const readAgo = limitReadAgo(view)
  const went = liveWhere(prefs.sid)
  const fix = went === undefined ? undefined : whereFixOf(went, cutsAll(leanMem.mode))
  return { d, blocks, limit: limitLines(blocks, d, view, tr), ...(readAgo === undefined ? {} : { readAgo }), ...(blocks.length === 0 ? { empty: emptyOf(view, readAgo) } : {}), ...(went === undefined ? {} : { where: { went, ...(fix === undefined ? {} : { fix }) } }) }
}
const EMPTY_WORDS: Record<'none' | 'junk', string> = { none: LIMIT_NONE, junk: LIMIT_JUNK }
// Under a minute is "just now", never an age of "under 1 min"
const readLine = (ms: number): string => (ms < 60_000 ? tr('Last read just now.') : tr('Last read {age} ago.').replace('{age}', ageWord(ms, tr)))
export const limitEmptyLine = (m: LimitModel, headerSays = false): string =>
  m.empty === 'old' && m.readAgo !== undefined ? readLine(m.readAgo) : tr(m.empty === 'none' || m.empty === 'junk' ? EMPTY_WORDS[m.empty] : headerSays ? LIMIT_YET_ONCE : LIMIT_YET)

export function LimitCard(c: PaneCtx, m: LimitModel, grow: boolean) {
  const { el } = c
  const { Box, Text } = el
  const { d: dLimit, blocks, limit } = m
  // An old reading keeps its figures, its words dim (the bars keep their colour); the header note says how old
  const kept = blocks.some(b => b.kept === true)
  // The Short look: one row per limit like the band, the names in one column so the bars line up
  const labelPt = Math.max(0, ...limit.parts.map(p => namePt(p.label)))
  return Card(
    el,
    'limit',
    'Plan limits',
    limit.note,
    blocks.length === 0 ? (
      <Text dimColor>{limitEmptyLine(m, c.glanceOf !== undefined)}</Text>
    ) : dLimit === 'simple' ? (
      <Box flexDirection="column">{limit.parts.map(p => ChipRow(el, `limit-short-${p.block.kind}`, p.label, labelPt, p.block.percent, p.figure, kept))}</Box>
    ) : (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>{limitTidy(c, m)}</Box>
    ),
    { grow, ...moreOf(c, 'limit', blocks.length === 0, blocks.length > 0), ...(limit.note === '' ? {} : { noteShort: ageWord(Math.max(0, ...blocks.map(b => b.sinceMs ?? 0)), tr) }) },
  )
}
