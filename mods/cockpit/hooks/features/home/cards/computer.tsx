// Explained: a bar for memory used and one for the processor, each under its words, then the Claude line, the power line and vaken's own cost (f).
import { tr } from '../../../core/lang'
import { awakeCardLines } from '../../../core/awakeplan'
import { claudeLine, memoryHead, memoryUsedPct, offLine, olderCockpitNote, powerLine, processorFact, processorHead, processorPct, roomBy, roomLine, roomOf, sharesLine } from '../../../core/computer'
import { selfCost, selfCostLine } from '../../../core/selfcost'
import { ActionButton, Bar, Card, FactRow, vstep } from '../../../ui/kit'
import { BODY_ROW_GAP } from '../../../ui/tokens'
import { computerWhat } from '../linecards'
import type { Detail, View } from '../logic'
import type { Prefs } from '../prefs'
import { headlineShown, moreOf, whatLine } from '../parts'
import type { PaneCtx } from '../parts'
import type { LinesModel } from './lines'
import { computerTidy } from './tidy'

export type ComputerModel = { d: Detail; room: ReturnType<typeof roomOf>; gaugeOn: boolean }

export function computerModel(view: View, prefs: Prefs, lines: LinesModel): ComputerModel {
  return { d: prefs.cardDetail.computer, room: roomOf(prefs.laptop, lines.load, view.now ?? 0), gaugeOn: prefs.values['laptop.mode'] === 'on' }
}

export function ComputerCard(c: PaneCtx, m: ComputerModel, lines: LinesModel, grow: boolean) {
  const { el, prefs, act } = c
  const { Box, Text } = el
  const { d: dComp, room, gaugeOn } = m
  const inner = c.widthPt
  const compWhat = computerWhat(lines.ctx)
  const l = prefs.laptop
  const older = l === undefined ? undefined : olderCockpitNote(l, tr)
  const awake = awakeCardLines(tr).map((line, n) => <Text key={`awake-${n}`} dimColor>{line}</Text>)
  if (room === undefined || l === undefined) {
    return Card(
      el,
      'computer',
      tr('Computer'),
      '',
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {whatLine(c, 'computer:room', <Text>{offLine(prefs.values['laptop.mode'] ?? 'off', tr)}</Text>, compWhat)}
        <Text dimColor>{tr(gaugeOn ? 'The first reading comes within a minute.' : 'It runs small programs every few minutes to read memory and the processor.')}</Text>
        {awake}
        {gaugeOn ? null : (
          <Box flexDirection="row">
            {ActionButton(el, 'computer-on', 'Turn on', () => act.setSetting('laptop.mode', 'on'), { primary: true })}
          </Box>
        )}
      </Box>,
      { grow, ...moreOf(c, 'computer', true) },
    )
  }
  const head = whatLine(c, 'computer:room', <Text>{roomLine(room, tr)}</Text>, compWhat)
  // At the Glance look the row above this card already says the room ("Room for 3")
  const saidAbove = headlineShown(c, 'computer', tr('Computer'))
  if (dComp !== 'explained') {
    const first = !saidAbove ? head : whatLine(c, 'computer:room', <Text>{tr('Room for agents')}</Text>, compWhat, undefined, 1, `${tr('limited by')} ${roomBy(room, tr)}`, true)
    return Card(el, 'computer', tr('Computer'), '', <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>{first}<Text dimColor>{sharesLine(l, tr)}</Text>{older === undefined ? null : <Text dimColor>{older}</Text>}{awake}</Box>, { grow, ...moreOf(c, 'computer') })
  }
  if (c.glanceOf !== undefined)
    return Card(el, 'computer', tr('Computer'), '', <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>{computerTidy(c, lines, l, room, compWhat, saidAbove)}</Box>, { grow, ...moreOf(c, 'computer') })
  const mem = memoryUsedPct(l)
  const cpu = processorPct(l)
  const cpuFact = processorFact(l, tr)
  const power = powerLine(l, tr)
  const free = memoryHead(l, tr).split(' · ')[1]
  // Vaken's own cost in this session (f): measured between two gauge readings
  const own = selfCostLine(selfCost(), tr)
  return Card(
    el,
    'computer',
    tr('Computer'),
    tr('now'),
    <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {head}
      <Box flexDirection="column">
        {mem === undefined ? FactRow(el, 'comp-mem', tr('Memory'), tr('not read')) : FactRow(el, 'comp-mem', tr('Memory'), `${mem}% ${tr('used')}`, { note: free === undefined ? [] : [free] })}
        {mem === undefined ? null : Bar(el, mem, 'computer-mem', memoryHead(l, tr), inner)}
        {FactRow(el, 'comp-cpu', cpuFact.label, cpuFact.value, { note: cpuFact.note })}
        {cpu === undefined ? null : Bar(el, cpu, 'computer-cpu', processorHead(l, tr), inner)}
      </Box>
      <Box flexDirection="column">
        <Text dimColor>{claudeLine(l, undefined, tr)}</Text>
        {older === undefined ? null : <Text dimColor>{older}</Text>}
        {power === undefined ? null : <Text dimColor>{power}</Text>}
        {own === undefined ? null : <Text dimColor>{own}</Text>}
        {awake}
      </Box>
    </Box>,
    { grow, ...moreOf(c, 'computer') },
  )
}
