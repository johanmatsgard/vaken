// The data comes from features/calm.ts loadCalm (Prefs.calm); the rules and words from core/openends.ts, core/focus.ts and core/weekly.ts.
import { fmt } from '../../../core/fmt'
import { langNow, tr } from '../../../core/lang'
import { openWords } from '../../../core/openends'
import type { OpenEnd } from '../../../core/openends'
import { weeklyFacts } from '../../../core/weekly'
import type { WeeklyNote } from '../../../core/weekly'
import { ActionButton, FactRow, vstep } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { ADVICE_BUTTON_GAP } from '../../../ui/tokens'
import type { LineGroup } from '../linecards'
import type { PaneCtx } from '../parts'

// This card shows only this project's note: one row of two lines (what was left, then how long ago), and Got it
export const openEndsRows = (c: Pick<PaneCtx, 'prefs'>): number => (hereEnd(c.prefs) === undefined ? 0 : 1 + 2)

// The Where was I card shows the open ends
const onThisCard = (prefs: PaneCtx['prefs']): boolean => prefs.hidden.includes('back')

// This project's note, when the Where was I card is hidden; another project's note stays on Where was I (it is not this session's state)
const hereEnd = (prefs: PaneCtx['prefs']): OpenEnd | undefined => {
  const o = prefs.calm
  const name = prefs.project?.name
  if (o === undefined || name === undefined || !onThisCard(prefs)) return undefined
  return [...o.open, ...(o.rest ?? [])].find(e => e.project === name)
}

// No heading inside the card: one kit row named as an earlier session (not this one's state), what was left and how long ago on a dim line
export function OpenEndsPart(c: PaneCtx): Drawn {
  const { el, prefs, act } = c
  const { Box } = el
  const e = hereEnd(prefs)
  if (e === undefined) return null
  const now = c.view.now ?? 0
  return (
    <Box key="openends" flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
      {FactRow(el, 'openends-here', tr('Earlier session'), '', { widthPt: c.widthPt, whole: true, note: [[openWords(e, tr), ...(e.at === undefined || now === 0 ? [] : [fmt.ago(now - e.at, 'days', langNow())])].join(' · ')] })}
      <Box flexDirection="row" justifyContent="flex-end">
        {ActionButton(el, 'openends-gotit', 'Got it', () => act.calm('gotIt'))}
      </Box>
    </Box>
  )
}

export function weeklyGroup(w: WeeklyNote | undefined): LineGroup[] {
  if (w === undefined) return []
  const stops = w.stops === 0 ? undefined : w.stops === 1 ? tr('1 risky step stopped') : tr('{n} risky steps stopped').replace('{n}', String(w.stops))
  const count = (n: number, once: string, many: string): string => (n === 1 ? tr(once) : tr(many).replace('{n}', String(n)))
  const did = [...(w.shortens > 0 ? [count(w.shortens, '1 compaction', '{n} compactions')] : []), ...(w.loops > 0 ? [count(w.loops, '1 loop caught', '{n} loops caught')] : [])]
  // The row says what it counts ("This week"); every count together is its value (beside it, or on a dim line under it when it does not fit)
  const title = tr('This week')
  const right = [...did, ...(stops === undefined ? [] : [stops])].join(', ')
  return [{ head: 'This week', rows: [{ key: 'week', title, right, what: { means: 'What vaken did for you in the last 7 days, counted from what it wrote down: compactions, repeating steps caught and risky steps stopped.', facts: weeklyFacts(w, tr), setting: 'value.weekly' } }] }]
}
