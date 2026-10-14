// The Agents card: the helper agents as the same rows as Other sessions, and a task run as a summary line with its controls and one row per task.
import { topicWhatIs } from '../../../core/whatis'
import { agentsHeadOf, dur, othersCount, rowAge, rowCost, rowDetail, rowFacts, rowKind, rowName, rowWord, splitAgents } from '../../../core/agentboard'
import type { BoardRow } from '../../../core/agentboard'
import { failedTasks, isRunRow, kindOf as taskKind, runProgress, runSummary, stateWordTr as taskWord, runNameOf, taskDetail, taskFacts } from '../../../core/orchestra'
import type { Run, Task } from '../../../core/orchestra'
import { agentsHead, glanceOpenKey } from '../../../core/headline'
import { tr, trFill } from '../../../core/lang'
import type { Drawn, El } from '../../../ui/kit'
import { ActionButton, Bar, CARD_GAP, CARD_GAP_X, Card, Chip, FactRow, GroupBreak, LinkButton, List, MoreRow, OpenLine, Pick, SessionRow, WhatIsBody, flushLeft, detailChars, vstep } from '../../../ui/kit'
import { BODY_ROW_GAP, LIST_COL_GAP, LIST_SHOW, AGENTS_DONE_SHOW, cols } from '../../../ui/tokens'
import type { Detail, View } from '../logic'
import { AGENT_FROM, PREF_AGENTS_ALL, PREF_AGENTS_OPEN } from '../prefs'
import type { Prefs } from '../prefs'
import { chevronOf, moreOf, roleModelsOf, toggle, whatLine, whatOpen } from '../parts'
import type { PaneCtx } from '../parts'
import type { LinesModel } from './lines'
import { CheckLines, StartTaskRow } from './starttask'
import { startPress } from '../starttask'
import { keepThrow } from '../throwask'

const goRow = (c: PaneCtx, key: string, label: string, onPress: () => void) => LinkButton(c.el, key, tr(label).replace(/\s*›$/, ''), onPress, { row: true, chevron: true, widthPt: c.widthPt })

export function RunBar(el: El, run: Run | undefined, widthPt: number, key = 'run') {
  if (run === undefined || run.status === 'setup' || run.tasks.length === 0) return null
  const p = runProgress(run)
  const figure = tr('{ok} of {n} finished').replace('{ok}', String(p.done)).replace('{n}', String(p.all))
  return (
    <el.Box key={`${key}-block`} flexDirection="column">
      {FactRow(el, `${key}-fact`, runNameOf(run), figure)}
      {Bar(el, p.pct, `${key}-bar`, `${runNameOf(run)} ${figure}`, widthPt, undefined, undefined, p.busy)}
    </el.Box>
  )
}

export const START_FOLD = 'start-task'

export type AgentsModel = { d: Detail; run: Run | undefined; rows: BoardRow[]; list: { shown: BoardRow[]; hidden: number; label?: string }; visible: number; head: { running: number; stuck: number; total: number; others?: number; failed?: number }; others: number }

export function agentsModel(view: View, prefs: Prefs, show = LIST_SHOW): AgentsModel {
  const d = prefs.cardDetail.agents
  const run = prefs.run
  const here = prefs.lists.from === 'here'
  const board = (prefs.agents ?? []).filter(r => run === undefined || !isRunRow(run, r))
  const others = here ? othersCount(board, view.now ?? 0, prefs.sid) : 0
  const split = splitAgents((prefs.agents ?? []).filter(r => run === undefined || !isRunRow(run, r)), view.now ?? 0, prefs.lists.from === 'here' ? 'here' : 'all', prefs.sid)
  const room = Math.min(Math.max(show - split.running.length, 3), AGENTS_DONE_SHOW)
  const first = [...split.running, ...split.recent.slice(0, room)]
  const later = [...split.recent.slice(room), ...split.older].sort((a, b) => a.type.localeCompare(b.type) || (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt))
  const shown = prefs.agentsAll ? [...first, ...later] : first
  const label = later.length === 0 ? undefined : prefs.agentsAll ? 'Show fewer' : `Show ${later.length} more`
  return { d, run, rows: [...first, ...later], list: { shown, hidden: prefs.agentsAll ? 0 : later.length, ...(label === undefined ? {} : { label }) }, visible: first.length, head: withRun(agentsHeadOf(split, others), run), others }
}

function withRun(head: AgentsModel['head'], run: Run | undefined): AgentsModel['head'] {
  if (run === undefined) return head
  return { ...head, running: head.running + run.tasks.filter(t => taskKind(t) === 'working').length, total: head.total + run.tasks.length, failed: failedTasks(run) }
}

export function AgentsCard(c: PaneCtx, m: AgentsModel, lines: LinesModel, grow: boolean) {
  const { el, view, prefs, act, onFlip } = c
  const { Box, Text } = el
  const { d: dAgents, run, rows: agentRows, list: agentList } = m
  const inner = c.widthPt
  const isProblem = (r: BoardRow): boolean => r.state === 'running' && r.quietAt !== undefined
  const agentsShown = [...agentList.shown.slice(0, m.visible).filter(isProblem), ...agentList.shown.slice(0, m.visible).filter(r => !isProblem(r)), ...agentList.shown.slice(m.visible)]
  const fromOf = (r: BoardRow): string => prefs.agentFrom[r.session] ?? 'a closed session'
  const agentRowsOf = (r: BoardRow) => {
    const key = `agent:${r.id}`
    const kind = rowKind(r)
    if (c.glanceOf !== undefined) return whatLine(c, key, <Text wrap="truncate-end">{rowName(r)}</Text>, { ...topicWhatIs('agents'), facts: rowFacts(r, view.now ?? 0, tr(fromOf(r)), tr) }, undefined, 1, `${tr(rowWord(r))} · ${rowAge(r, view.now ?? 0, tr)}`, true)
    return [
      SessionRow(el, `a-${r.id}`, {
        kind,
        word: tr(rowWord(r)),
        name: rowName(r),
        innerPt: inner,
        // The right holds only the time (a third-width column keeps the name's room)
        right: kind === 'needs' ? Chip(el, `ac-${r.id}`, tr(rowWord(r))) : <Text dimColor>{rowAge(r, view.now ?? 0, tr)}</Text>,
        detail: dAgents === 'explained' ? `${rowDetail(r, tr(fromOf(r)), detailChars(inner, kind === 'needs' && !!el.Svg, tr(rowWord(r))) - (kind === 'needs' ? rowAge(r, view.now ?? 0, tr).length + 3 : 0), rowCost(r))}${kind === 'needs' ? ` · ${rowAge(r, view.now ?? 0, tr)}` : ''}` : undefined,
        after: chevronOf(c, key),
        onPress: toggle(c, key),
      }),
      whatOpen(c, key, { ...topicWhatIs('agents'), facts: rowFacts(r, view.now ?? 0, tr(fromOf(r)), tr) }),
    ]
  }
  // An open task says what it knows and offers what can be done with it now: Stop, Try again, Keep copy or Throw away its folder copy.
  const now = view.now ?? 0
  const taskActions = (t: Task): { key: string; label: string; onPress: () => void }[] => [
    ...(t.state === 'running' ? [{ key: `task-stop-${t.n}`, label: 'Stop', onPress: () => act.runSteer(`stop ${t.n}`) }] : []),
    ...(t.state === 'failed' || t.state === 'stopped' || t.state === 'skipped' || t.check === 'failed' ? [{ key: `task-retry-${t.n}`, label: 'Try again', onPress: () => act.runSteer(`retry ${t.n}`) }] : []),
    ...(t.path !== undefined && t.kept === undefined && t.state !== 'running' && t.state !== 'waiting' ? keepThrow(t, act, 'task').actions : []),
  ]
  const taskRowsOf = (t: Task) => {
    const key = `task:${t.n}`
    const kind = taskKind(t)
    const time = t.startedAt === undefined ? undefined : dur((t.state === 'running' ? now : (t.endedAt ?? now)) - t.startedAt)
    if (c.glanceOf !== undefined) {
      return [
        OpenLine(el, `ol-${key}`, <Text wrap="truncate-end">{`${t.n}. ${t.text}`}</Text>, prefs.open === key, toggle(c, key), { widthPt: inner, lines: 1, right: time === undefined ? taskWord(t) : `${taskWord(t)} · ${time}`, tall: true }),
        prefs.open !== key ? null : WhatIsBody(el, `w-${key}`, [...taskFacts(t, trFill), ...keepThrow(t, act, 'task').ask], undefined, taskActions(t)),
      ]
    }
    return [
      SessionRow(el, `t-${t.n}`, {
        kind,
        word: taskWord(t),
        name: `${t.n}. ${t.text}`,
        innerPt: inner,
        keepWord: true,
        right: time === undefined ? undefined : <Text dimColor>{time}</Text>,
        detail: dAgents === 'explained' ? taskDetail(t, now, dur, roleModelsOf(prefs.values), tr) : undefined,
        after: chevronOf(c, key),
        onPress: toggle(c, key),
      }),
      prefs.open !== key ? null : WhatIsBody(el, `w-${key}`, [...taskFacts(t, trFill), ...keepThrow(t, act, 'task').ask], undefined, taskActions(t)),
    ]
  }
  const runControls =
    run === undefined ? []
    : run.status === 'setup' ? [{ key: 'run-start', primary: true, ...startPress(prefs.startCheck, { label: 'Start run', args: 'start' }) }]
    : run.status === 'running' ? [{ key: 'run-pause', label: 'Pause', args: 'pause' }, { key: 'run-stop', label: 'Stop all', args: 'stop' }]
    : run.status === 'paused' ? [{ key: 'run-go', label: 'Go on', primary: true, args: 'go' }, { key: 'run-stop', label: 'Stop all', args: 'stop' }]
    : [{ key: 'run-clear', label: 'Clear finished', args: 'clear' }]
  const glance = c.glanceOf !== undefined
  const rowsOf = (drawn: Drawn[]) => List(el, drawn)
  const taskProblem = (t: Task): boolean => t.state === 'failed' || t.state === 'stopped' || t.check === 'failed'
  const tasksSorted = !glance || run === undefined ? [] : [...run.tasks.filter(taskProblem), ...run.tasks.filter(t => !taskProblem(t))]
  const controlsEl =
    run === undefined ? null : (
      <Box flexDirection="row" columnGap={cols(CARD_GAP_X)}>
        {runControls.map(rc => ActionButton(el, rc.key, rc.label, () => act.runSteer(rc.args), { primary: 'primary' in rc, ...(runControls.length > 1 ? { gap: CARD_GAP_X } : {}) }))}
      </Box>
    )
  const taskPart =
    run === undefined ? null : glance ? (
      <Box key="tasks" flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {RunBar(el, run, inner)}
        {whatLine(c, 'tasks', <Text wrap="truncate-end">{runNameOf(run)}</Text>, topicWhatIs('tasks'), undefined, 1, runSummary(run), true)}
        {run.status === 'done' && !tasksSorted.some(taskProblem) ? null : rowsOf(tasksSorted.flatMap(taskRowsOf))}
        {run.status === 'setup' ? CheckLines(el, 'run-check', prefs) : null}
        {controlsEl}
      </Box>
    ) : (
      <Box key="tasks" flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {RunBar(el, run, inner)}
        {/* The summary is dim, as at the Glance look (it wrapped to two full-strength lines at 400 pt). */}
        {whatLine(c, 'tasks', <Text wrap="truncate-end">{runNameOf(run)}</Text>, topicWhatIs('tasks'), undefined, 1, runSummary(run), true)}
        {run.status === 'setup' ? CheckLines(el, 'run-check', prefs) : null}
        {controlsEl}
        {List(el, run.tasks.flatMap(taskRowsOf))}
      </Box>
    )
  const hasAgents = (prefs.agents ?? []).length > 0
  return Card(
    el,
    'agents',
    'Agents',
    agentsHead(m.head, tr),
    <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {taskPart}
      {agentRows.length === 0 && run === undefined ? <Text dimColor>{tr(hasAgents ? 'No agent ran in this session yet.' : 'No agents seen yet.')}</Text> : null}
      {agentRows.length === 0 && run === undefined && m.others > 0 ? (
        <Box key="agents-others" flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
          <Text dimColor>{tr('{n} in other sessions').replace('{n}', String(m.others))}</Text>
          {LinkButton(el, 'agents-others-all', 'Show all', () => act.setList('from', 'all'), { row: true })}
        </Box>
      ) : null}
      {agentRows.length > 0 && agentsShown.length === 0 && run === undefined ? <Text dimColor>{tr('No agent runs now.')}</Text> : null}
      {agentsShown.length === 0 ? null : rowsOf(agentsShown.flatMap(r => agentRowsOf(r)))}
      {agentList.label === undefined ? null : MoreRow(el, 'agents', agentList.label, prefs.agentsAll, () => onFlip(PREF_AGENTS_ALL))}
      {GroupBreak(el, 'agents-br-actions', inner, undefined, true)}
      {hasAgents ? (
        <Box key="agents-from" flexDirection="row" alignItems="center" columnGap={cols(LIST_COL_GAP)}>
          {Pick(el, 'agents-from', AGENT_FROM, prefs.lists.from, v => act.setList('from', v), true)}
        </Box>
      ) : null}
      {run === undefined ? StartTaskRow(el, prefs, act, inner, dAgents === 'explained', { open: prefs.openSections.includes(START_FOLD), onToggle: () => act.toggleSection(START_FOLD) }, glance) : null}
      {goRow(c, 'runner-open', run === undefined ? 'Run several tasks ›' : 'Task runs ›', () => act.openRunner(true))}
      {c.glanceOf === undefined || prefs.hidden.includes('computer') || prefs.autoHidden?.includes('computer') === true
        ? null
        : goRow(c, 'pointer-computer-open', 'Is there room? (Computer)', () => { if (!prefs.openSections.includes(glanceOpenKey('computer'))) act.toggleSection(glanceOpenKey('computer')) })}
    </Box>,
    { grow, ...moreOf(c, 'agents', glance && run !== undefined), fold: { open: prefs.agentsOpen, onToggle: () => onFlip(PREF_AGENTS_OPEN) } },
  )
}
