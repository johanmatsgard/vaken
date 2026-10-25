// Used only while the pane is at the Glance look; the Full look keeps its own forms.
import { claudeLine, memoryHead, memoryUsedPct, olderCockpitNote, powerLine, pct, processorFact, processorHead, processorPct, roomBy, roomLine } from '../../../core/computer'
import type { Room } from '../../../core/computer'
import type { Laptop } from '../../../core/crewlaptop'
import { topicWhatIs } from '../../../core/whatis'
import type { WhatIs } from '../../../core/whatis'
import { factOf } from '../../../core/headline'
import { tr } from '../../../core/lang'
import { selfCost, selfCostLine } from '../../../core/selfcost'
import { awakeCardLines } from '../../../core/awakeplan'
import { Bar, FactRow, GroupBreak, LinkButton, MoreRow, Row, vstep } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { BODY_ROW_GAP, LIMIT_GAP, LIST_ROW_H } from '../../../ui/tokens'
import type { LineGroup } from '../linecards'
import type { LimitBlock, LimitLine } from '../logic'
import { memoryParts, sentenceParts, whatLine } from '../parts'
import type { PaneCtx } from '../parts'
import type { HereModel } from './here'
import { pointsLine } from './here'
import type { LimitModel } from './limit'
import type { LinesModel } from './lines'
import { fmt } from '../../../core/fmt'
import { usedUp } from '../logic'
import { FINISH_MEANS, FINISH_NEXT, FINISH_PRESS } from '../../../core/continuity'
import { WHERE_BIG_READS, WHERE_CAUSE, WHERE_FIX, WHERE_LABEL, WHERE_MEANS, WHERE_NEXT } from '../../../core/cost'
import { FINISH_ROW, whereFix } from '../rowact'
import type { Inside } from '../rowact'

const lineRow = (c: PaneCtx, key: string, line: string, dim = false, faded = false): Drawn => {
  const f = factOf(line)
  return FactRow(c.el, key, f.label, f.value, { dim, note: f.note, widthPt: c.widthPt, faded })
}

// Every limit's row reads the same, at the Glance look too: its name on the left, its figure on the right, its bar, the lines under it (the problem first).
// No group titles: the extra usage row sits right under the 5-hour limit, the subscription is one row at the bottom.
export function limitTidy(c: PaneCtx, m: LimitModel): Drawn[] {
  const { el } = c
  const { Box, Text } = el
  const inner = c.widthPt
  const { blocks, limit } = m
  const out: Drawn[] = []
  // An old reading (LimitBlock.kept): every word dim, the bars keep their colour, the header note says its age
  const kept = blocks.some(b => b.kept === true)
  // Finish safely: once, on the first problem row where Claude can still work (a runs-out forecast, or a used-up limit that extra usage pays)
  const extraOn = c.view.usage?.extra?.enabled === true
  let finishAt = kept ? -1 : limit.parts.findIndex(p => p.lines.some(l => l.kind === 'problem') && (!usedUp(p.block) || extraOn))
  const lineOf = (key: string, l: LimitLine, n: number): Drawn | Drawn[] => {
    if (l.kind === 'problem' && n === finishAt) {
      finishAt = -1
      return whatLine(c, 'limit-finish', <Text>{l.label}</Text>, { means: FINISH_MEANS, next: FINISH_NEXT }, undefined, 1, l.value, true, false, { label: FINISH_PRESS, action: FINISH_ROW })
    }
    return l.kind === 'note' ? FactRow(el, key, l.label, '', { dim: true, widthPt: inner }) : FactRow(el, key, l.label, l.value ?? '', { faded: kept || l.kind === 'soft', ...(l.value === undefined ? { widthPt: inner } : {}) })
  }
  // Where it went: this session's spend by cause, one dim row; its open detail holds the one fix when a cause clearly leads (core/cost.ts)
  const where = m.where
  const whereRows = (): Drawn[] => {
    if (where === undefined || kept) return []
    const w = where.went
    const parts = Object.fromEntries(Object.entries(w.parts).map(([k, v]) => [k, fmt.percent(v)]))
    const what = { means: WHERE_MEANS.replace(/\{(\w+)\}/g, (x, k: string) => parts[k] ?? x), ...(w.bigReads > 0 ? { facts: [WHERE_BIG_READS.replace('{n}', String(w.bigReads))] } : {}), ...(where.fix === undefined ? {} : { next: WHERE_NEXT[where.fix] }) }
    return whatLine(c, 'limit-where', <Text dimColor>{tr(WHERE_LABEL)}</Text>, what, undefined, 1, `${tr(WHERE_CAUSE[w.top])} ${fmt.percent(w.pct)}`, true, false, where.fix === undefined ? undefined : { label: WHERE_FIX[where.fix], action: whereFix(where.fix) })
  }
  const extra = limit.extra
  const extraRows = (): Drawn =>
    extra === undefined ? null : (
      <Box key="lt-extra" flexDirection="column">
        {FactRow(el, 'lt-extra-row', tr('Extra usage'), extra.value, { faded: kept })}
        {extra.pct === undefined ? null : Bar(el, extra.pct, 'limit-bar-extra', `${tr('Extra usage')} ${extra.value}`, inner)}
      </Box>
    )
  const fiveAt = limit.parts.findIndex(p => p.block.kind === 'session' || p.block.short === '5-hour limit')
  if (fiveAt < 0 && extra !== undefined) out.push(extraRows())
  limit.parts.forEach((p, n) => {
    if (n > 0 || (fiveAt < 0 && extra !== undefined)) out.push(GroupBreak(el, `lt-br-${n}`, inner, LIMIT_GAP, true))
    const b: LimitBlock = p.block
    let row: Drawn
    let open: Drawn = null
    if (n === 0) {
      const content = (
        <Box key="lt-lead-content" flexDirection="row" justifyContent="space-between" flexGrow={1} flexShrink={1} overflow="hidden">
          <Text dimColor={kept}>{p.label}</Text>
          <Text dimColor={kept}>{p.figure}</Text>
        </Box>
      )
      // Where the figures come from is the dim line at the bottom, so the open line does not say it again
      // The plan's name only repeats the app's usage ring, so it is a fact in this row's open detail, not a row
      const about = topicWhatIs('limits')
      ;[row, open] = whatLine(c, 'limits', content, limit.plan === undefined ? about : { ...about, facts: [...(about.facts ?? []), `${tr('Subscription')}: ${limit.plan}`] }, undefined, 1, undefined, true)
    } else {
      row = FactRow(el, `lt-${b.kind}`, p.label, p.figure, { faded: kept })
    }
    out.push(
      <Box key={`lt-block-${b.kind}`} flexDirection="column">
        {row}
        {Bar(el, b.percent, `limit-bar-${b.kind}`, `${p.label} ${p.figure}`, inner)}
        {p.lines.flatMap((l, i) => lineOf(`lt-${b.kind}-n${i}`, l, n))}
      </Box>,
    )
    if (open !== null && open !== undefined) out.push(open)
    if (n === fiveAt) out.push(...whereRows(), extraRows())
  })
  if (fiveAt < 0) out.push(...whereRows())
  if (limit.source !== '') out.push(FactRow(el, 'lt-source', limit.source, '', { dim: true, widthPt: inner }))
  return out
}

export function hereTidyContext(c: PaneCtx, m: HereModel): Drawn[] {
  const { el } = c
  const { here, lines } = m
  const pct = here?.rec.contextPercent
  if (pct === undefined && lines.used === undefined) return []
  const { points } = m
  const { Box, Text } = el
  // The bar marks where vaken and where Claude Code compact; the dim line under it names them (as the Full look)
  return [
    <Box key="here-ctx-block" flexDirection="column">
      {/* The figure is the row's value (as every Glance fact row), not only the bar's alt */}
      {FactRow(el, 'here-ctx', tr('Context'), pct === undefined ? (lines.used ?? '') : `${fmt.percent(pct)} ${tr('used')}`)}
      {pct === undefined ? null : Bar(el, pct, 'ctx-bar', `${fmt.percent(pct)} ${tr('of context used')}`, c.widthPt, undefined, points.marks)}
      {points.line === undefined ? null : <Text key="here-shortens" dimColor>{pointsLine(points, c.widthPt) ?? points.line}</Text>}
    </Box>,
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
    mem === undefined ? FactRow(el, 'comp-mem', tr('Memory'), tr('not read')) : withBar('comp-mem-block', FactRow(el, 'comp-mem', tr('Memory'), `${pct(mem)} ${tr('used')}`, { note: free === undefined ? [] : [free] }), Bar(el, mem, 'computer-mem', memoryHead(l, tr), c.widthPt)),
    withBar('comp-cpu-block', FactRow(el, 'comp-cpu', cpuFact.label, cpuFact.value, { note: cpuFact.note }), cpu === undefined ? null : Bar(el, cpu, 'computer-cpu', processorHead(l, tr), c.widthPt)),
    lineRow(c, 'comp-claude', claudeLine(l, undefined, tr)),
    older === undefined ? null : lineRow(c, 'comp-older', older, true),
    power === undefined ? null : lineRow(c, 'comp-power', power, true),
    own === undefined ? null : lineRow(c, 'comp-own', own, true),
    awakeWhy === undefined ? null : Row(el, 'comp-awake', <Text>{awakeWhy}</Text>, { note: awakeNote, minPt: LIST_ROW_H }),
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
        {shownRows.flatMap(r => {
          const action = r.action
          const memo = id === 'skills' && r.key === 'cost' ? memoryParts(r.title) : undefined
          // A name is never cut: it wraps, its value beside it or on a dim line under it (sentenceParts)
          const own = memo === undefined ? sentenceParts(c, `tr-${id}:${r.key}-words`, r.title, r.right ?? '') : undefined
          const label = own?.content ?? <Text wrap="truncate-end">{memo?.label ?? r.title}</Text>
          const value = memo === undefined ? (own?.right ?? '') : (memo.value ?? '')
          const notes = memo?.note === undefined ? {} : { note: [memo.note] }
          const highPt = (own?.lines ?? 1) * LIST_ROW_H
          // A row that offers presses (Repeat to skill): its sentence, then each press as a whole row that says what it does, on the card's one rhythm
          const inside = (r as typeof r & { inside?: Inside }).inside
          if (action === undefined && inside !== undefined)
            return [
              Row(el, `tr-${id}:${r.key}`, label, { value, minPt: highPt, ...notes }),
              ...[{ label: inside.label, action: inside.action }, ...(inside.more ?? [])].map((p, k) => LinkButton(el, `tr-${id}:${r.key}-press${k}`, p.label, () => c.act.run(p.action), { row: true, chevron: true, widthPt: c.widthPt })),
            ]
          return action === undefined
            ? Row(el, `tr-${id}:${r.key}`, label, { value, minPt: highPt, ...notes })
            : Row(el, `tr-${id}:${r.key}`, label, { value, minPt: highPt, ...notes, press: { onPress: () => c.act.run(action), widthPt: c.widthPt, heightPt: highPt } })
        })}
        {g.toggle === undefined ? null : MoreRow(el, `${id}-${g.toggle}`, detailsOpen ? 'Show fewer' : 'Details', detailsOpen, () => c.act.toggleSection(g.toggle as string))}
        {g.fold === undefined ? null : MoreRow(el, `${id}-${g.fold.id}`, foldOpen ? 'Show fewer' : `Show ${g.fold.more} more`, foldOpen, () => c.act.toggleSection(foldKey))}
      </Box>,
    ]
  })
}
