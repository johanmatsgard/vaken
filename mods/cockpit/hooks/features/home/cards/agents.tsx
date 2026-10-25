// The Agents card: the helper agents as the same rows as Other sessions, and a task run as a summary line with its controls and one row per task.
import { topicWhatIs } from '../../../core/whatis'
import { agentsHeadOf, dur, othersCount, rowAge, rowCost, rowDetail, rowFacts, rowKind, rowName, rowWord, splitAgents } from '../../../core/agentboard'
import { ageWord } from '../../../core/time'
import type { BoardRow } from '../../../core/agentboard'
import { ROLES, ROLE_NAMES, failedTasks, isRunRow, kindOf as taskKind, runProgress, runSummary, stateWordTr as taskWord, runNameOf, taskAge, taskDetail, taskFacts } from '../../../core/orchestra'
import type { Run, Task } from '../../../core/orchestra'
import { agentsHead, agentsShort, glanceOpenKey } from '../../../core/headline'
import type { AgentsHeadFacts } from '../../../core/headline'
import { t as say, tr, trFill } from '../../../core/lang'
import type { Drawn, El } from '../../../ui/kit'
import { ActionButton, Bar, CARD_GAP, cardGapX, Card, ChevronMark, FactRow, GroupBreak, LinkButton, List, MoreRow, OpenLine, Pick, SessionRow, WhatIsBody, flushLeft, detailChars, fitsRightCol, linesBeside, valueBeside, vstep, wrappedLines } from '../../../ui/kit'
import { BODY_ROW_GAP, LIST_COL_GAP, LIST_SHOW, AGENTS_DONE_SHOW, STACK_BELOW_PT, cols } from '../../../ui/tokens'
import type { Detail, View } from '../logic'
import { AGENT_FROM, PREF_AGENTS_ALL, PREF_AGENTS_OPEN } from '../prefs'
import type { Prefs } from '../prefs'
import { chevronOf, moreOf, roleModelsOf, toggle, whatLine } from '../parts'
import type { PaneCtx } from '../parts'
import type { LinesModel } from './lines'
import { CheckLines, StartTaskRow } from './starttask'
import { startPress } from '../starttask'
import { keepThrow } from '../throwask'
import { IdleLines, OverlapLines } from './overlap'
import { stepLabel, stepValue } from '../../../core/agentsteps'
import { stepsMem } from '../steps'

// A pointer to another place (the Agents view, the Computer card) is a dim row link, as every pointer
const goRow = (c: PaneCtx, key: string, label: string, onPress: () => void) => LinkButton(c.el, key, tr(label).replace(/\s*›$/, ''), onPress, { row: true, chevron: true, widthPt: c.widthPt, dim: true })

// The run's name and its one count ("Tidy the app · 1 of 4 done"); `named` false in the Agents view, whose Tasks header already names the run.
// A label is never cut: a figure that does not fit beside the name goes on a dim line under it.
export function RunBar(el: El, run: Run | undefined, widthPt: number, key = 'run', named = true) {
  if (run === undefined || run.status === 'setup' || run.tasks.length === 0) return null
  const p = runProgress(run)
  const figure = tr('{ok} of {n} done').replace('{ok}', String(p.done)).replace('{n}', String(p.all))
  const name = runNameOf(run)
  const beside = valueBeside(name, figure, widthPt)
  return (
    <el.Box key={`${key}-block`} flexDirection="column">
      {named ? FactRow(el, `${key}-fact`, name, beside ? figure : '', { widthPt, whole: true, ...(beside ? {} : { note: [figure] }) }) : FactRow(el, `${key}-fact`, figure, '', { widthPt, whole: true })}
      {Bar(el, p.pct, `${key}-bar`, `${name} ${figure}`, widthPt, undefined, undefined, p.busy)}
    </el.Box>
  )
}

export const START_FOLD = 'start-task'

// An ended row's age in the right column, coarse and whole on one line: "6 h ago" when that fits the column, else the short ago form (Swedish "6 h sen"), and the bare age ("6 h") only when even that does not fit
export const ageShown = (ago: string, ms: number): string => {
  if (fitsRightCol(ago)) return ago
  const bare = ageWord(ms, tr)
  const short = say('pane.age_a_short_ago', { age: bare })
  return fitsRightCol(short) ? short : bare
}
const endAge = (r: BoardRow, now: number): string => (r.state === 'running' ? rowAge(r, now, tr) : ageShown(rowAge(r, now, tr), now - (r.endedAt !== undefined && r.state !== 'unknown' ? r.endedAt : r.startedAt)))
// A task-runner agent says its role's friendly name, as a task row does ("Builder", not "vaken-builder")
export const typeShown = (type: string): string => {
  const m = /^vaken[-:](\w+)$/.exec(type)
  const role = m === null ? undefined : ROLE_NAMES.find(r => r === m[1])
  return role === undefined ? type : tr(ROLES[role].label)
}

export type AgentsModel = { d: Detail; run: Run | undefined; rows: BoardRow[]; list: { shown: BoardRow[]; hidden: number; label?: string }; visible: number; head: AgentsHeadFacts; others: number }

export function agentsModel(view: View, prefs: Prefs, show = LIST_SHOW): AgentsModel {
  const d = prefs.cardDetail.agents
  const run = prefs.run
  const here = prefs.lists.from === 'here'
  const board = (prefs.agents ?? []).filter(r => run === undefined || !isRunRow(run, r))
  const others = here ? othersCount(board, view.now ?? 0, prefs.sid) : 0
  const split = splitAgents((prefs.agents ?? []).filter(r => run === undefined || !isRunRow(run, r)), view.now ?? 0, prefs.lists.from === 'here' ? 'here' : 'all', prefs.sid)
  const room = Math.min(Math.max(show - split.running.length, 3), AGENTS_DONE_SHOW)
  const first = [...split.running, ...split.recent.slice(0, room)]
  // Older rows newest first; the type is a dim part of the detail line, there when it fits. The fold names them: "Show 4 older"
  const later = [...split.recent.slice(room), ...split.older].sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt))
  const shown = prefs.agentsAll ? [...first, ...later] : first
  const label = later.length === 0 ? undefined : prefs.agentsAll ? 'Show fewer' : `Show ${later.length} older`
  return { d, run, rows: [...first, ...later], list: { shown, hidden: prefs.agentsAll ? 0 : later.length, ...(label === undefined ? {} : { label }) }, visible: first.length, head: withRun(waitingApart(agentsHeadOf(split, others, view.now ?? 0), split.running, prefs.idle ?? []), run), others }
}

// A waiting agent (a teammate that waits for a message) counts only as waiting: the running count leaves it out
export const waitingApart = (head: AgentsModel['head'], running: readonly BoardRow[], idle: readonly { id: string }[]): AgentsModel['head'] => {
  if (idle.length === 0) return head
  const ids = new Set(idle.map(r => r.id))
  const both = running.filter(r => r.agentId !== undefined && ids.has(r.agentId)).length
  return { ...head, running: head.running - both, waiting: idle.length }
}

// Several running say their count ("3 running", the form of one); the row with no progress leads the list with its own words
const countFirst = (head: AgentsModel['head']): AgentsModel['head'] => {
  if (head.running < 2 || head.stuck === head.running) return head
  const { stuckMin: _m, ...rest } = head
  return { ...rest, stuck: 0 }
}

function withRun(head0: AgentsModel['head'], run: Run | undefined): AgentsModel['head'] {
  const head = countFirst(head0)
  if (run === undefined) return head
  const state = run.status === 'setup' ? { run: 'setup' as const } : run.status === 'paused' ? { run: 'paused' as const } : {}
  return { ...head, running: head.running + run.tasks.filter(t => taskKind(t) === 'working').length, total: head.total + run.tasks.length, failed: failedTasks(run), ...state }
}

export function AgentsCard(c: PaneCtx, m: AgentsModel, lines: LinesModel, grow: boolean) {
  const { el, view, prefs, act, onFlip } = c
  const { Box, Text } = el
  const { d: dAgents, run, rows: agentRows, list: agentList } = m
  const inner = c.widthPt
  const isProblem = (r: BoardRow): boolean => r.state === 'running' && r.quietAt !== undefined
  // At Glance in a narrow pane a row's state and time go on a dim line under its name when they do not fit beside it whole (a name is never wrapped line after line beside them)
  const underName = (name: string, right: string): boolean => inner < STACK_BELOW_PT && !valueBeside(name, right, inner)
  const agentsShown = [...agentList.shown.slice(0, m.visible).filter(isProblem), ...agentList.shown.slice(0, m.visible).filter(r => !isProblem(r)), ...agentList.shown.slice(m.visible)]
  const fromOf = (r: BoardRow): string => prefs.agentFrom[r.session] ?? 'a closed session'
  // A row of this session carries no tag; another session's row ends with that session's name
  const tagOf = (r: BoardRow): string | undefined => (r.session === prefs.sid.slice(0, 8) ? undefined : tr(fromOf(r)))
  // The opened row's last steps: read at the press, shown under its facts, each a fact row ("3. Edited form.ts" and "4 s · $0.0042" beside it, or dim under it)
  const stepRows = (key: string): Drawn[] => {
    const st = stepsMem.key === key && prefs.open === key ? stepsMem.state : undefined
    if (st === undefined) return []
    const said = (name: string) => [<Text key={`steps-${key}-said`} dimColor>{say(name)}</Text>]
    if (st.kind === 'reading') return said('cardwhat.steps_reading')
    if (st.kind === 'elsewhere') return said('cardwhat.steps_elsewhere')
    if (st.kind === 'unreadable') return said('cardwhat.steps_could_not_be_read')
    if (st.steps.length === 0) return said('cardwhat.steps_none_yet')
    const w = inner - LIST_COL_GAP
    // A fact line like the ones above says what follows: how many steps of how many, oldest first
    const all = st.steps[st.steps.length - 1].n
    const lead = <Text key={`steps-${key}-lead`}>{all > st.steps.length ? say('cardwhat.steps_lead_last', { n: st.steps.length, all }) : say('cardwhat.steps_lead_all', { n: all })}</Text>
    return [lead, ...st.steps.map(s => {
      const label = stepLabel(s)
      const value = stepValue(s, tr)
      const beside = value === '' || valueBeside(label, value, w)
      return FactRow(el, `step-${key}-${s.n}`, label, beside ? value : '', { widthPt: w, whole: true, valueDim: true, ...(beside ? {} : { note: [value] }) })
    })]
  }
  const agentRowsOf = (r: BoardRow) => {
    const key = `agent:${r.id}`
    const kind = rowKind(r)
    const shown = { ...r, type: typeShown(r.type) }
    const age = endAge(r, view.now ?? 0)
    const detail = c.glanceOf === undefined && dAgents === 'explained' ? rowDetail(shown, tagOf(r), detailChars(inner, false, tr(rowWord(r)), age), rowCost(r), tr) : undefined
    // Opened, the row adds only what it does not already say: no name, time or state word again, the model and the cost only when its second line lacks them
    const facts = rowFacts(shown, view.now ?? 0, tr(fromOf(r)), tr, detail ?? '')
    // A press opens the row and reads its last steps (only this session can read its own agents' steps); a second press shuts it and forgets them
    const press = () => {
      const opening = prefs.open !== key
      toggle(c, key)()
      if (opening) act.agentSteps?.(key, r.agentId, r.session === prefs.sid.slice(0, 8))
    }
    // Its facts and steps alone: what an agent is (the same line on every row) is the card's own "What is this?"
    const setting = topicWhatIs('agents').setting
    const opened = prefs.open !== key ? null : WhatIsBody(el, `w-${key}`, facts, setting === undefined ? undefined : { label: 'Change in Settings', onPress: () => act.openSettingsAt(setting), go: true }, [], [], undefined, stepRows(key))
    // The name is a sentence: it wraps, never cut
    if (c.glanceOf !== undefined) {
      const right = `${tr(rowWord(r))} · ${age}`
      // Failed stays in the red state colour at Glance too (SessionRow's Word); in a narrow pane a name that does not fit beside it puts it on a dim line under the name
      const under = underName(rowName(r), right)
      return [
        OpenLine(el, `ol-${key}`, <Text>{rowName(r)}</Text>, prefs.open === key, press, { widthPt: c.widthPt, lines: under ? wrappedLines(rowName(r), inner) + 1 : linesBeside(rowName(r), right, inner), right, tall: true, under, ...(r.state === 'failed' ? { failed: tr(rowWord(r)) } : {}) }),
        opened,
      ]
    }
    return [
      SessionRow(el, `a-${r.id}`, {
        kind,
        word: tr(rowWord(r)),
        name: rowName(r),
        innerPt: inner,
        // Failed sits in the word column like every state, in the red state colour on the plain ring (it does not wait on the person), with no chip
        keepWord: true,
        failed: r.state === 'failed',
        wrap: true,
        // The right holds only the time: so far while it runs, when it ended after (a third-width column keeps the name's room)
        right: <Text dimColor>{age}</Text>,
        ...(detail === undefined || detail === '' ? {} : { detail }),
        after: ChevronMark(el, `row-${key}`, prefs.open === key ? 'down' : 'right', press),
        onPress: press,
      }),
      opened,
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
    const ago = taskAge(t, now, tr)
    const time = ago === undefined || t.state === 'running' || t.endedAt === undefined ? ago : ageShown(ago, now - t.endedAt)
    if (c.glanceOf !== undefined) {
      const right = time === undefined ? taskWord(t) : `${taskWord(t)} · ${time}`
      const name = `${t.n}. ${t.text}`
      const under = underName(name, right)
      return [
        OpenLine(el, `ol-${key}`, <Text>{name}</Text>, prefs.open === key, toggle(c, key), { widthPt: inner, lines: under ? wrappedLines(name, inner) + 1 : linesBeside(name, right, inner), right, tall: true, under, ...(t.state === 'failed' || t.check === 'failed' ? { failed: taskWord(t) } : {}) }),
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
        failed: t.state === 'failed' || t.check === 'failed',
        wrap: true,
        right: time === undefined ? undefined : <Text dimColor>{time}</Text>,
        detail: dAgents === 'explained' ? taskDetail(t, now, dur, roleModelsOf(prefs.values), tr, detailChars(inner, false, taskWord(t), time ?? '')) : undefined,
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
  const taskProblem = (t: Task): boolean => taskKind(t) === 'needs'
  const tasksSorted = !glance || run === undefined ? [] : [...run.tasks.filter(taskProblem), ...run.tasks.filter(t => !taskProblem(t))]
  const controlsEl =
    run === undefined ? null : (
      <Box flexDirection="row" columnGap={cols(cardGapX())}>
        {runControls.map(rc => ActionButton(el, rc.key, rc.label, () => act.runSteer(rc.args), { primary: 'primary' in rc, ...(runControls.length > 1 ? { gap: cardGapX() } : {}) }))}
      </Box>
    )
  // Under the bar line only what it and the header do not say: "2 running, 1 waiting · about $0.21 (estimate)" (the header says "1 failed"), wrapping whole, never past the card's edge. Being set up, the name leads.
  const summary = run === undefined ? '' : run.status === 'setup' ? `${runNameOf(run)} · ${runSummary(run)}` : runSummary(run, false, false)
  const summaryLine = run === undefined ? null : whatLine(c, 'tasks', <Text>{summary}</Text>, topicWhatIs('tasks'), undefined, wrappedLines(summary, inner), undefined, true)
  const taskPart =
    run === undefined ? null : glance ? (
      <Box key="tasks" flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {RunBar(el, run, inner)}
        {summaryLine}
        {run.status === 'done' && !tasksSorted.some(taskProblem) ? null : rowsOf(tasksSorted.flatMap(taskRowsOf))}
        {run.status === 'setup' ? CheckLines(el, 'run-check', prefs) : null}
        {controlsEl}
      </Box>
    ) : (
      <Box key="tasks" flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {RunBar(el, run, inner)}
        {summaryLine}
        {run.status === 'setup' ? CheckLines(el, 'run-check', prefs) : null}
        {controlsEl}
        {List(el, run.tasks.flatMap(taskRowsOf))}
      </Box>
    )
  const hasAgents = (prefs.agents ?? []).length > 0
  // Empty: the body's one line is the fact, so the note does not say "None" again while the card is open at Glance; the Glance row keeps its word beside the ring (a mark always has a word)
  const waitingShown = c.act.talk !== undefined && (prefs.idle ?? []).length > 0
  const empty = agentRows.length === 0 && run === undefined && m.others === 0 && !waitingShown
  return Card(
    el,
    'agents',
    'Agents',
    empty && glance ? '' : agentsHead(m.head, tr),
    <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {taskPart}
      {OverlapLines(c, true)}
      {IdleLines(c)}
      {agentRows.length === 0 && run === undefined && !waitingShown ? <Text dimColor>{tr(hasAgents ? 'No agent in this session yet' : 'No agents yet')}</Text> : null}
      {agentRows.length === 0 && run === undefined && m.others > 0 ? (
        <Box key="agents-others" flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
          <Text dimColor>{tr('{n} in other sessions').replace('{n}', String(m.others))}</Text>
          {LinkButton(el, 'agents-others-all', 'Show all', () => act.setList('from', 'all'), { row: true })}
        </Box>
      ) : null}
      {agentRows.length > 0 && agentsShown.length === 0 && run === undefined ? <Text dimColor>{tr('No agent runs now')}</Text> : null}
      {agentsShown.length === 0 ? null : rowsOf(agentsShown.flatMap(r => agentRowsOf(r)))}
      {agentList.label === undefined ? null : MoreRow(el, 'agents', agentList.label, prefs.agentsAll, () => onFlip(PREF_AGENTS_ALL))}
      {GroupBreak(el, 'agents-br-actions', inner, undefined, true)}
      {hasAgents ? (
        <Box key="agents-from" flexDirection="row" alignItems="center" columnGap={cols(LIST_COL_GAP)}>
          {Pick(el, 'agents-from', AGENT_FROM, prefs.lists.from, v => act.setList('from', v), true)}
        </Box>
      ) : null}
      {run === undefined ? StartTaskRow(el, prefs, act, inner, dAgents === 'explained', { open: prefs.openSections.includes(START_FOLD), onToggle: () => act.toggleSection(START_FOLD) }, glance) : null}
      {goRow(c, 'runner-open', run === undefined ? 'Run several tasks ›' : 'Past runs ›', () => act.openRunner(true))}
      {c.glanceOf === undefined || prefs.hidden.includes('computer') || prefs.autoHidden?.includes('computer') === true
        ? null
        : goRow(c, 'pointer-computer-open', 'Is there room? (Computer)', () => { if (!prefs.openSections.includes(glanceOpenKey('computer'))) act.toggleSection(glanceOpenKey('computer')) })}
    </Box>,
    { grow, ...moreOf(c, 'agents', glance && run !== undefined), fold: { open: prefs.agentsOpen, onToggle: () => onFlip(PREF_AGENTS_OPEN) }, ...(agentsShort(m.head, tr) === undefined ? {} : { noteShort: agentsShort(m.head, tr) }) },
  )
}
