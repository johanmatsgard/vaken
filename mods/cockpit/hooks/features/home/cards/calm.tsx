// The data comes from features/calm.ts loadCalm (Prefs.calm); the rules and words from core/openends.ts, core/focus.ts and core/weekly.ts.
import { minutesLeft } from '../../../core/focus'
import { tr } from '../../../core/lang'
import { openLine } from '../../../core/openends'
import { roundMinutes, weeklyFacts } from '../../../core/weekly'
import type { WeeklyNote } from '../../../core/weekly'
import { ActionButton, LinkButton, vstep } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { ADVICE_BUTTON_GAP, LIST_COL_GAP, cols } from '../../../ui/tokens'
import type { LineGroup } from '../linecards'
import type { PaneCtx } from '../parts'

export const openEndsRows = (c: Pick<PaneCtx, 'prefs'>): number => {
  const o = c.prefs.calm
  return o === undefined || o.open.length === 0 || !onThisCard(c.prefs) ? 0 : 2 + o.open.length + (o.more > 0 ? 1 : 0)
}

// The Where was I card shows the open ends
const onThisCard = (prefs: PaneCtx['prefs']): boolean => prefs.hidden.includes('back')

export function OpenEndsPart(c: PaneCtx): Drawn {
  const { el, prefs, act } = c
  const { Box, Text } = el
  const o = prefs.calm
  if (o === undefined || o.open.length === 0 || !onThisCard(prefs)) return null
  return (
    <Box key="openends" flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
      <Box flexDirection="column">
        <Text key="openends-head">{tr('Left open')}</Text>
        {o.open.map(e => (
          <Text key={`openends-${e.project}`}>{openLine(e, tr)}</Text>
        ))}
        {o.more === 0 ? null : <Text dimColor>{tr('and {n} more projects').replace('{n}', String(o.more))}</Text>}
      </Box>
      <Box flexDirection="row" justifyContent="flex-end">
        {ActionButton(el, 'openends-gotit', 'Got it', () => act.calm('gotIt'))}
      </Box>
    </Box>
  )
}

export function FocusPart(c: PaneCtx): Drawn {
  const { el, view, prefs, act } = c
  const { Box, Text } = el
  const f = prefs.calm?.focus
  return (
    <Box key="focus" flexDirection={f === undefined ? 'column' : 'row'} alignItems={f === undefined ? 'stretch' : 'center'} columnGap={cols(LIST_COL_GAP)}>
      {f === undefined ? (
        LinkButton(el, 'focus-start', 'Pause notices for 50 min ›', () => act.calm('focus'), { row: true })
      ) : (
        <Box flexDirection="row" alignItems="center" columnGap={cols(LIST_COL_GAP)}>
          <Text dimColor>{tr('Notices paused · {n} min left').replace('{n}', String(minutesLeft(f, view.now ?? 0)))}</Text>
          {ActionButton(el, 'focus-end', 'End pause', () => act.calm('endFocus'))}
        </Box>
      )}
    </Box>
  )
}

export function weeklyGroup(w: WeeklyNote | undefined): LineGroup[] {
  if (w === undefined) return []
  const stops = w.stops === 0 ? undefined : w.stops === 1 ? tr('1 risky step stopped') : tr('{n} risky steps stopped').replace('{n}', String(w.stops))
  const title = w.minutes > 0 ? tr('Saved you about {m} min (estimate)').replace('{m}', String(roundMinutes(w.minutes))) : (stops ?? '')
  const right = w.minutes > 0 ? (stops ?? '') : tr('estimate')
  return [{ head: 'This week', rows: [{ key: 'week', title, right, what: { means: 'About how much time vaken saved you in the last 7 days, and how many risky steps it stopped. The minutes are an estimate.', facts: weeklyFacts(w, tr), setting: 'value.weekly' } }] }]
}
