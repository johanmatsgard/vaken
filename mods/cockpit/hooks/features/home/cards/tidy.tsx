// Used only while the pane is at the Glance look; the Full look keeps its own forms.
import { dayShareWords } from '../../../core/dayshare'
import { claudeLine, memoryHead, memoryUsedPct, olderCockpitNote, powerLine, processorFact, processorHead, processorPct, roomBy, roomLine } from '../../../core/computer'
import type { Room } from '../../../core/computer'
import type { Laptop } from '../../../core/crewlaptop'
import { topicWhatIs } from '../../../core/whatis'
import type { WhatIs } from '../../../core/whatis'
import { factOf } from '../../../core/headline'
import { tr } from '../../../core/lang'
import { selfCost, selfCostLine } from '../../../core/selfcost'
import { awakeCardLines } from '../../../core/awakeplan'
import { Bar, FactRow, GroupBreak, MoreRow, Row, vstep } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { BODY_ROW_GAP, LIMIT_GAP, LIST_ROW_H } from '../../../ui/tokens'
import { foldWords } from '../logic'
import type { LineGroup } from '../linecards'
import type { LimitBlock } from '../logic'
import { memoryParts, pointerTo, whatLine } from '../parts'
import type { PaneCtx } from '../parts'
import type { HereModel } from './here'
import type { LimitModel } from './limit'
import type { LinesModel } from './lines'
import { fmt } from '../../../core/fmt'

const lineRow = (c: PaneCtx, key: string, line: string, dim = false): Drawn => {
  const f = factOf(line)
  return FactRow(c.el, key, f.label, f.value, { dim, note: f.note, widthPt: c.widthPt })
}

// Every limit's row reads the same, at the Glance look too: its name on the left, its figure on the right
export function limitTidy(c: PaneCtx, m: LimitModel): Drawn[] {
  const { el } = c
  const { Box, Text } = el
  const inner = c.widthPt
  const { blocks, limit } = m
  const shown = limit.shown ?? blocks
  const out: Drawn[] = []
  shown.forEach((b: LimitBlock, n) => {
    if (n > 0) out.push(GroupBreak(el, `lt-br-${n}`, inner, LIMIT_GAP, true))
    const figure = `${fmt.percent(b.percent)} ${tr('used')}`
    let row: Drawn
    let open: Drawn = null
    if (n === 0) {
      const content = (
        <Box key="lt-lead-content" flexDirection="row" justifyContent="space-between" flexGrow={1} flexShrink={1} overflow="hidden">
          <Text>{tr(b.short)}</Text>
          <Text>{figure}</Text>
        </Box>
      )
      ;[row, open] = whatLine(c, 'limits', content, { ...topicWhatIs('limits'), ...(limit.source === '' ? {} : { from: limit.source === tr('Where it comes from: Claude Code') ? 'Claude Code' : limit.source }) }, undefined, 1, undefined, true)
    } else {
      row = FactRow(el, `lt-${b.kind}`, tr(b.short), figure)
    }
    const notes = limit.groups[n]?.slice(1) ?? []
    out.push(
      <Box key={`lt-block-${b.kind}`} flexDirection="column">
        {row}
        {Bar(el, b.percent, `limit-bar-${b.kind}`, `${tr(b.short)} ${fmt.percent(b.percent)} ${tr('used')}`, inner)}
        {notes.map((note, i) => FactRow(el, `lt-${b.kind}-n${i}`, note, '', { dim: true, widthPt: inner }))}
      </Box>,
    )
    if (open !== null && open !== undefined) out.push(open)
  })
  for (const [g, lines] of limit.groups.slice(shown.length).entries()) {
    out.push(GroupBreak(el, `lt-plan-br-${g}`, inner, LIMIT_GAP, true))
    for (const [i, line] of lines.entries()) if (line !== '') out.push(lineRow(c, `lt-plan-${g}-${i}`, line))
  }
  if (limit.folded !== undefined || limit.daily !== undefined) out.push(GroupBreak(el, 'lt-extra-br', inner, LIMIT_GAP, true))
  if (limit.folded !== undefined) out.push(lineRow(c, 'lt-folded', foldWords(limit.folded, tr)))
  if (limit.daily !== undefined) out.push(FactRow(el, 'lt-daily', dayShareWords(limit.daily, tr), '', { dim: true, widthPt: inner }))
  if (limit.source !== '') out.push(FactRow(el, 'lt-source', limit.source, '', { dim: true, widthPt: inner }))
  return out
}

export function hereTidyContext(c: PaneCtx, m: HereModel): Drawn[] {
  const { el } = c
  const { here, lines } = m
  const pct = here?.rec.contextPercent
  if (pct === undefined && lines.used === undefined) return []
  const at = here?.rec.ctx?.compactAt
  const { Box } = el
  return [
    <Box key="here-ctx-block" flexDirection="column">
      {FactRow(el, 'here-ctx', tr('Context'), lines.used ?? '')}
      {pct === undefined ? null : Bar(el, pct, 'ctx-bar', `${fmt.percent(pct)} ${tr('of context used')}`, c.widthPt, undefined, at)}
    </Box>,
    at === undefined ? null : FactRow(el, 'here-shortens', tr('Compacts at'), fmt.percent(at)),
  ]
}

// The headline says how many fit, so the row says what limits it.
export function computerTidy(c: PaneCtx, lines: LinesModel, l: Laptop, room: Room, what: WhatIs, saidAbove = true): Drawn[] {
  const { el } = c
  const { Text } = el
  const mem = memoryUsedPct(l)
  const cpu = processorPct(l)
  const cpuFact = processorFact(l, tr)
  const older = olderCockpitNote(l, tr)
  const power = powerLine(l, tr)
  const own = selfCostLine(selfCost(), tr)
  const free = memoryHead(l, tr).split(' · ')[1]
  const [awakeWhy, ...awakeNote] = awakeCardLines(tr)
  const { Box } = el
  const withBar = (key: string, row: Drawn, bar: Drawn): Drawn =>
    bar === null ? row : (
      <Box key={key} flexDirection="column">
        {row}
        {bar}
      </Box>
    )
  return [
    ...(saidAbove ? whatLine(c, 'computer:room', <Text>{tr('Room for agents')}</Text>, what, undefined, 1, `${tr('limited by')} ${roomBy(room, tr)}`, true) : whatLine(c, 'computer:room', <Text>{roomLine(room, tr)}</Text>, what)),
    mem === undefined ? FactRow(el, 'comp-mem', tr('Memory'), tr('not read')) : withBar('comp-mem-block', FactRow(el, 'comp-mem', tr('Memory'), `${mem}% ${tr('used')}`, { note: free === undefined ? [] : [free] }), Bar(el, mem, 'computer-mem', memoryHead(l, tr), c.widthPt)),
    withBar('comp-cpu-block', FactRow(el, 'comp-cpu', cpuFact.label, cpuFact.value, { note: cpuFact.note }), cpu === undefined ? null : Bar(el, cpu, 'computer-cpu', processorHead(l, tr), c.widthPt)),
    lineRow(c, 'comp-claude', claudeLine(l, undefined, tr)),
    older === undefined ? null : lineRow(c, 'comp-older', older, true),
    power === undefined ? null : lineRow(c, 'comp-power', power, true),
    own === undefined ? null : lineRow(c, 'comp-own', own, true),
    awakeWhy === undefined ? null : Row(el, 'comp-awake', <Text>{awakeWhy}</Text>, { note: awakeNote, minPt: LIST_ROW_H }),
    pointerTo(c, 'agents', 'Agents'),
  ]
}

export function groupsTidy(c: PaneCtx, id: string, groups: LineGroup[]): Drawn[] {
  const { el } = c
  const { Box, Text } = el
  return groups.flatMap((g, n) => {
    if (g.behind !== undefined && !c.prefs.openSections.includes(g.behind)) return []
    const detailsOpen = g.toggle !== undefined && c.prefs.openSections.includes(g.toggle)
    const foldKey = g.fold === undefined ? '' : `fold:${id}:${g.fold.id}`
    const foldOpen = g.fold !== undefined && c.prefs.openSections.includes(foldKey)
    const shownRows = g.fold === undefined || foldOpen ? g.rows : g.rows.slice(0, g.fold.shown)
    return [
      n === 0 ? null : GroupBreak(el, `${id}-tbr${n}`, c.widthPt, undefined, true),
      <Box key={`${id}-tg${n}`} flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {shownRows.map(r => {
          const action = r.action
          const memo = id === 'skills' && r.key === 'cost' ? memoryParts(r.title) : undefined
          const label = <Text wrap="truncate-end">{memo?.label ?? r.title}</Text>
          const value = memo === undefined ? (r.right ?? '') : (memo.value ?? '')
          const notes = memo?.note === undefined ? {} : { note: [memo.note] }
          return action === undefined
            ? Row(el, `tr-${id}:${r.key}`, label, { value, minPt: LIST_ROW_H, ...notes })
            : Row(el, `tr-${id}:${r.key}`, label, { value, minPt: LIST_ROW_H, ...notes, press: { onPress: () => c.act.run(action), widthPt: c.widthPt, heightPt: LIST_ROW_H } })
        })}
        {g.toggle === undefined ? null : MoreRow(el, `${id}-${g.toggle}`, detailsOpen ? 'Show fewer' : 'Details', detailsOpen, () => c.act.toggleSection(g.toggle as string))}
        {g.fold === undefined ? null : MoreRow(el, `${id}-${g.fold.id}`, foldOpen ? 'Show fewer' : `Show ${g.fold.more} more`, foldOpen, () => c.act.toggleSection(foldKey))}
      </Box>,
    ]
  })
}
