// The head line, one row per task (it opens what it did and cost), then Open the runner and Done.
import { reportHead, reportWhen, taskLineFacts, taskLineWord } from '../../../core/overnight'
import type { RunReport, TaskLine } from '../../../core/overnight'
import { aboutMoney } from '../../../core/prices'
import { t, tr, trFill } from '../../../core/lang'
import { ActionButton, Card, ChevronMark, LinkButton, List, SessionRow, WhatIsBody, vstep } from '../../../ui/kit'
import type { El } from '../../../ui/kit'
import { GROUP_GAP } from '../../../ui/tokens'
import type { Acts, Prefs } from '../prefs'
import { retryTask } from './runner'

// Amber only for a failure (a real wait on the person); a stopped task is the plain idle ring with its word
const lineKind = (t: TaskLine): 'needs' | 'waiting' | 'idle' => (t.state === 'failed' || t.check === 'failed' ? 'needs' : t.state === 'done' ? 'waiting' : 'idle')

const upperFirst = (w: string): string => `${w.charAt(0).toUpperCase()}${w.slice(1)}`

// A task's row in the report and in the past runs: the finished dot when done
function reportRows(el: El, idOf: string, r: RunReport, prefs: Prefs, act: Acts, innerPt: number) {
  const tryAgain = t('common.try_again')
  return r.tasks.flatMap(t => {
    const key = `${idOf}:${t.n}`
    const kind = lineKind(t)
    const toggle = () => act.open(prefs.open === key ? undefined : key)
    return [
      // The state word once, in the word column (in the warning colour for a failure, no chip); the cost on the dim line under; the name wraps, never cut
      SessionRow(el, `${idOf}-${t.n}`, {
        kind,
        // Capitalised like the Agents card's words ("Checked", "Failed")
        word: upperFirst(taskLineWord(t, trFill)),
        name: `${t.n}. ${t.text}`,
        innerPt,
        keepWord: true,
        wrap: true,
        detail: t.usd === undefined ? undefined : aboutMoney(t.usd, tr),
        after: ChevronMark(el, `row-${key}`, prefs.open === key ? 'down' : 'right', toggle, `${t.n}. ${t.text}`),
        onPress: toggle,
      }),
      idOf === 'rep' && prefs.run?.id === r.id && (t.state === 'failed' || t.check === 'failed') ? LinkButton(el, `rep-retry-${t.n}`, tryAgain, retryTask(act, t.n), { row: true, chevron: true, widthPt: innerPt }) : null,
      prefs.open === key ? WhatIsBody(el, `w-${key}`, taskLineFacts(t, trFill)) : null,
    ]
  })
}

export function ReportCard(el: El, r: RunReport, prefs: Prefs, act: Acts, innerPt: number, now: number) {
  const { Box, Text } = el
  return Card(
    el,
    'report',
    t('common.task_run_report'),
    reportWhen(r, now, trFill),
    <Box flexDirection="column" rowGap={vstep(GROUP_GAP)}>
      <Text>{`${r.name}: ${reportHead(r, trFill)}`}</Text>
      <Box>{List(el, reportRows(el, 'rep', r, prefs, act, innerPt))}</Box>
      <Text dimColor>{t('common.done_closes_it_it_stays_in')}</Text>
      {LinkButton(el, 'report-runner', t('common.past_runs'), () => act.openRunner(true), { row: true, chevron: true, widthPt: innerPt })}
      <Box flexDirection="row" justifyContent="flex-end" alignItems="center">
        {ActionButton(el, 'report-done', t('common.done'), act.closeReport)}
      </Box>
    </Box>,
  )
}
