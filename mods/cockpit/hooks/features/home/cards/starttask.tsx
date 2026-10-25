// The goal is shown, not typed: it is set with `/vaken-tasks goal`.
import { tr } from '../../../core/lang'
import { DONE_KINDS } from '../../../core/runcost'
import type { DoneKind } from '../../../core/runcost'
import { RC_ADD_TASK, RC_BUILD, RC_DONE_HEAD, RC_GOAL, RC_LINT, RC_NO_GOAL, RC_PLAN_NOTE, RC_TESTS, RC_TITLE } from '../../../core/runcostwords'
import { PLANFIRST_SETTINGS } from '../../../core/planfirst'
import { ActionButton, FactRow, OpenLine, SwitchRow, valueBeside, vstep } from '../../../ui/kit'
import type { El } from '../../../ui/kit'
import { BODY_ROW_GAP } from '../../../ui/tokens'
import type { Acts, Prefs } from '../prefs'
import { checkLines, doneKindsOf, goalStartLabel, planFirstOf } from '../starttask'
import { ChoiceRow } from '../parts'

const DONE_LABEL: Record<DoneKind, string> = { tests: RC_TESTS, build: RC_BUILD, lint: RC_LINT }
const lowerFirst = (w: string): string => `${w.charAt(0).toLowerCase()}${w.slice(1)}`
const PLAN_FIRST = PLANFIRST_SETTINGS[0] as (typeof PLANFIRST_SETTINGS)[number]

export function CheckLines(el: El, id: string, prefs: Prefs) {
  const { Box, Text } = el
  const lines = checkLines(prefs.startCheck, tr)
  return lines.length === 0 ? null : (
    <Box key={id} flexDirection="column">
      {lines.map((l, n) => (
        <Text key={`${id}-${n}`} dimColor>
          {l}
        </Text>
      ))}
    </Box>
  )
}

// `fold`: the Agents card keeps the row as ONE line, "Run one task" with a chevron (a whole-row press opens it)
export function StartTaskRow(el: El, prefs: Prefs, act: Acts, innerPt: number, explained: boolean, fold?: { open: boolean; onToggle: () => void }, tidy = false) {
  const { Box, Text } = el
  const starting = act.starting
  if (starting === undefined) return null
  const goal = prefs.proof?.goal?.text
  const done = doneKindsOf(prefs.proof, prefs.values)
  const switchRow = (id: string, label: string, note: string, isOn: boolean, flip: () => void) => SwitchRow(el, id, label, explained ? note : '', isOn, isOn ? 'off' : 'on', flip, innerPt)
  // No heading inside a card: in the Agents view the Tasks card is the title, so "Run one task" is drawn only as the Agents card's fold row
  const title = fold === undefined ? null : OpenLine(el, 'ol-start-task', <Text>{tr(RC_TITLE)}</Text>, fold.open, fold.onToggle, { widthPt: innerPt, tall: true })
  if (fold !== undefined && !fold.open) return <Box key="start-task" flexDirection="column">{title}</Box>
  const goalWords = goal === undefined ? tr(RC_NO_GOAL) : goal
  const goalBeside = goal !== undefined && valueBeside(tr(RC_GOAL), goalWords, innerPt)
  return (
    <Box key="start-task" flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {title}
      {/* Field labels in rows (kit FactRow), never headings: the value beside its label, or on a dim line under it when it does not fit */}
      {FactRow(el, 'start-goal', tr(RC_GOAL), goalBeside ? goalWords : '', { widthPt: innerPt, whole: true, ...(goalBeside ? {} : { note: [goalWords] }) })}
      {/* "Done when" is a labelled row that says which checks are on; the switches under it change them */}
      {FactRow(el, 'start-done-head', tr(RC_DONE_HEAD), done.length === 0 ? tr('Off') : done.map((k, n) => (n === 0 ? tr(DONE_LABEL[k]) : lowerFirst(tr(DONE_LABEL[k])))).join(', '), { widthPt: innerPt, whole: true })}
      {DONE_KINDS.map(k => switchRow(`start-done-${k}`, DONE_LABEL[k], '', done.includes(k), () => starting.toggleDone(k)))}
      {/* Plan first offers the same three choices as Settings */}
      {ChoiceRow(el, 'start-plan', PLAN_FIRST.label, explained ? RC_PLAN_NOTE : '', PLAN_FIRST.options, planFirstOf(prefs.values), v => starting.setPlan(v), undefined, innerPt)}
      {prefs.startCheck?.forGoal === true ? CheckLines(el, 'start-check', prefs) : null}
      {goal === undefined && fold === undefined ? null : (
        <Box flexDirection="row">
          {goal === undefined
            ? ActionButton(el, 'start-go', RC_ADD_TASK, () => act.openRunner(true), { primary: true })
            : ActionButton(el, 'start-go', goalStartLabel(prefs.startCheck), starting.start, { primary: true })}
        </Box>
      )}
    </Box>
  )
}
