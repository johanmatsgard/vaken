// The goal is shown, not typed: it is set with `/vaken-tasks goal`.
import { tr } from '../../../core/lang'
import { DONE_KINDS } from '../../../core/runcost'
import type { DoneKind } from '../../../core/runcost'
import { RC_ADD_TASK, RC_BUILD, RC_DONE_HEAD, RC_GOAL, RC_LINT, RC_NO_GOAL, RC_PLAN_NOTE, RC_TESTS, RC_TITLE } from '../../../core/runcostwords'
import { ActionButton, FactRow, OpenLine, SwitchRow, vstep } from '../../../ui/kit'
import type { El } from '../../../ui/kit'
import { BODY_ROW_GAP } from '../../../ui/tokens'
import type { Acts, Prefs } from '../prefs'
import { checkLines, doneKindsOf, goalStartLabel, planFirstOn } from '../starttask'

const DONE_LABEL: Record<DoneKind, string> = { tests: RC_TESTS, build: RC_BUILD, lint: RC_LINT }

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
  const title = fold === undefined ? <Text dimColor>{tr(RC_TITLE)}</Text> : OpenLine(el, 'ol-start-task', <Text>{tr(RC_TITLE)}</Text>, fold.open, fold.onToggle, { widthPt: innerPt, tall: true })
  if (fold !== undefined && !fold.open) return <Box key="start-task" flexDirection="column">{title}</Box>
  return (
    <Box key="start-task" flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {title}
      {tidy ? (
        FactRow(el, 'start-goal', tr(RC_GOAL), '', { note: [goal === undefined ? tr(RC_NO_GOAL) : goal] })
      ) : (
        <Box key="start-goal" flexDirection="column">
          <Text>{tr(RC_GOAL)}</Text>
          <Text dimColor>{goal === undefined ? tr(RC_NO_GOAL) : goal}</Text>
        </Box>
      )}
      <Text key="start-done-head">{tr(RC_DONE_HEAD)}</Text>
      {DONE_KINDS.map(k => switchRow(`start-done-${k}`, DONE_LABEL[k], '', done.includes(k), () => starting.toggleDone(k)))}
      {switchRow('start-plan', 'Plan first', RC_PLAN_NOTE, planFirstOn(prefs.values), () => starting.togglePlan())}
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
