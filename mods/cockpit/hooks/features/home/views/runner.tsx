// The Agents view: one place to set up a task run, steer it and keep it as a template.
import { dur } from '../../../core/agentboard'
import { CHECK_HINT, MODEL_ORDER_NOTE, MODEL_PICKS, ROLES, ROLE_SHOWN, roleShown, TASKS_FILE, ROLE_NAMES, editable, kindOf as taskKind, roleSettingKey, runSummary, stateWordTr as taskWord, runNameOf, taskAge, taskDetail, taskFacts } from '../../../core/orchestra'
import type { Task } from '../../../core/orchestra'
import { reportHead, taskLineWord } from '../../../core/overnight'
import { fmt } from '../../../core/fmt'
import { aboutMoney } from '../../../core/prices'
import { BACK_LABEL } from '../../../core/cardsettings'
import { langNow, t as tx, tr, trFill } from '../../../core/lang'
import { fillIn } from '../../../core/fillin'
import { MODEL_OPTIONS } from '../../../core/models'
import { ActionButton, CARD_GAP, cardGapX, ViewHeader, Card, ChevronMark, LinkButton, List, MoreRow, OpenLine, Pick, SessionRow, SwitchRow, WhatIsBody, detailChars, vstep } from '../../../ui/kit'
import type { El } from '../../../ui/kit'
import { ADVICE_BUTTON_GAP, BODY_ROW_GAP, GROUP_GAP, LIST_COL_GAP, PAST_RUNS_SHOW, cols } from '../../../ui/tokens'
import type { Acts, Prefs } from '../prefs'
import { ChoiceRow, roleModelsOf } from '../parts'
import { CheckLines, StartTaskRow } from '../cards/starttask'
import { RunBar, ageShown } from '../cards/agents'
import { startPress } from '../starttask'
import { keepThrow } from '../throwask'
import { MODEL_LINE, MODEL_USE, TEACH_LATER, modelVars, teachMem } from '../../../core/teach'
import { MODEL_NO, MODEL_YES } from '../rowact'
import { flags, runnerDraft } from '../state'
import type { RolesScope } from '../state'

const HOW_IT_RUNS = 'How it runs (usual choices)'
const HOW_FOLD = 'fold:runner:how'
export const TASKS_FOLD = 'fold:runner:tasks'
export const TASKS_SHOWN = 6
export const PAST_FOLD = 'fold:runner:past'
export const retryTask = (act: Acts, n: number): (() => void) => () => act.runSteer(`retry ${n}`)
const LOAD_NOTE = 'Reads {file} in your project and adds its tasks.'
const PLAN_NOTE = 'Asks Claude to write the plan as tasks in {file}.'
const RUN_STARTING = 'It is starting. This page updates by itself.'
const APPLY_ASK = 'Replace the {n} tasks on this page with the template {name}?'
const AGAIN_NOTE = 'Starts the same tasks again. This run stays in Past runs.'
const AT_ONCE = [0, 1, 2, 3, 4, 6, 8, 12].map(n => ({ value: String(n), label: n === 0 ? 'Auto' : String(n) }))
const MINUTES = [15, 30, 60, 120].map(n => ({ value: String(n), label: `${n} min` }))
const HELPER_USD = [1, 2, 5, 10].map(n => ({ value: String(n), label: `$${n}` }))
const RUN_USD = [5, 10, 25, 50].map(n => ({ value: String(n), label: `$${n}` }))
const NIGHT_USD = [0, 5, 10, 25].map(n => ({ value: String(n), label: n === 0 ? 'Run limit' : `$${n}` }))
const NIGHT_ANYWAY = 'night anyway' // en-only: the runner's command words
const PICK_LABEL: Record<string, string> = { auto: 'Auto', cheap: 'Cheap', normal: 'Normal', strong: 'Strong' }

// A task row's right column: so far while it runs, an ended one's coarse age, whole on one line (the card's form)
const taskTime = (t: Task, now: number): string | undefined => {
  const ago = taskAge(t, now, tr)
  return ago === undefined || t.state === 'running' || t.endedAt === undefined ? ago : ageShown(ago, now - t.endedAt)
}

function roleNote(r: (typeof ROLE_NAMES)[number], prefs: Prefs): string {
  const key = roleSettingKey(r)
  const from = prefs.sessionSet[key] !== undefined ? 'This session only.' : prefs.project?.set[key] !== undefined ? 'This project only.' : ''
  const lookup = r === 'researcher' ? 'Also the model for lookup agents Claude starts (Model choice).' : ''
  // Each piece is looked up on its own (the whole sentence is never a line of the table).
  return [roleShown(r), ROLES[r].writes || ROLE_SHOWN[r] !== undefined ? '' : 'Reads only.', lookup, from].filter(x => x !== '').map(tr).join(' ')
}

export function RunnerView(el: El, prefs: Prefs, act: Acts, now: number, innerPt: number) {
  const { Box, Text, Input } = el
  const run = prefs.run
  const open = prefs.open
  const toggle = (key: string) => () => act.open(open === key ? undefined : key)
  const howOpen = prefs.openSections.includes(HOW_FOLD)
  const tasksAll = prefs.openSections.includes(TASKS_FOLD)
  const pastAll = prefs.openSections.includes(PAST_FOLD)
  const folded = run !== undefined && run.tasks.length > TASKS_SHOWN && !tasksAll
  const shownTasks = run === undefined ? [] : folded ? run.tasks.slice(0, TASKS_SHOWN) : run.tasks
  const taskBody = (t: Task) => {
    if (!editable(t)) {
      const actions = [
        ...(t.state === 'running' ? [{ key: `rv-stop-${t.n}`, label: 'Stop', onPress: () => act.runSteer(`stop ${t.n}`) }] : []),
        ...(t.state === 'failed' || t.state === 'stopped' || t.state === 'skipped' || t.check === 'failed' ? [{ key: `rv-retry-${t.n}`, label: 'Try again', onPress: retryTask(act, t.n) }] : []),
        ...(t.path !== undefined && t.kept === undefined && t.state !== 'running' && t.state !== 'waiting' ? keepThrow(t, act, 'rv').actions : []),
      ]
      return (
        <Box key={`rv-open-${t.n}`} flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
          {WhatIsBody(el, `rv-w-${t.n}`, [...taskFacts(t, trFill), ...keepThrow(t, act, 'rv').ask], undefined, actions)}
          {t.state !== 'running' ? null : (
            <Box>
              {Input === undefined ? null : <Input key={`rv-say-${t.n}`} placeholder={tx('common.say_something_to_this_helper')} value={runnerDraft.say} submitLabel={tx('talk.send')} onInput={v => { runnerDraft.say = v }} onSubmit={v => { runnerDraft.say = ''; act.runSteer(`say ${t.n} ${v}`) }} />}
            </Box>
          )}
        </Box>
      )
    }
    const earlier = Array.from({ length: Math.min(t.n - 1, 3) }, (_, k) => t.n - 1 - k).reverse()
    return (
      <Box key={`rv-edit-${t.n}`} flexDirection="column" rowGap={vstep(CARD_GAP)}>
        {ChoiceRow(el, `rv-role-${t.n}`, 'Role', roleShown(t.role), ROLE_NAMES.map(r => ({ value: r, label: ROLES[r].label })), t.role, v => act.runSteer(`set ${t.n} role ${v}`), undefined, innerPt)}
        {ChoiceRow(el, `rv-model-${t.n}`, 'Model', 'Auto uses the role’s model.', MODEL_PICKS.map(m => ({ value: m, label: PICK_LABEL[m] })), t.model, v => act.runSteer(`set ${t.n} model ${v}`), undefined, innerPt)}
        {!ROLES[t.role].writes ? null : SwitchRow(el, `rv-folder-${t.n}`, 'Own folder copy', 'Its own copy of the project, on its own branch.', t.folder, t.folder ? 'off' : 'on', () => act.runSteer(`set ${t.n} folder ${t.folder ? 'off' : 'on'}`), innerPt)}
        {t.n === 1 ? null : ChoiceRow(el, `rv-after-${t.n}`, 'Starts after', 'Waits until that task is done.', [{ value: 'none', label: 'Any time' }, ...earlier.map(n => ({ value: String(n), label: `Task ${n}` }))], t.after === undefined ? 'none' : String(t.after), v => act.runSteer(`set ${t.n} after ${v}`), undefined, innerPt)}
        <Box flexDirection="row" justifyContent="flex-end">
          {ActionButton(el, `rv-remove-${t.n}`, tx('common.remove_task'), () => act.runSteer(`remove ${t.n}`))}
        </Box>
      </Box>
    )
  }
  const nightOn = prefs.values['night.mode'] === 'on'
  const controls =
    run === undefined ? []
    : run.status === 'setup' ? [{ key: 'rv-start', primary: true, ...startPress(prefs.startCheck, { label: 'Start run', args: 'start' }) }, ...(nightOn ? [{ key: 'rv-night', label: 'Start as night run', args: startPress(prefs.startCheck, { label: '', args: 'start' }).args === 'start' ? 'night' : NIGHT_ANYWAY }] : [])]
    : run.status === 'running' ? [{ key: 'rv-pause', label: 'Pause', args: 'pause' }, { key: 'rv-stopall', label: 'Stop all', args: 'stop' }]
    : run.status === 'paused' ? [{ key: 'rv-go', label: 'Go on', primary: true, args: 'go' }, { key: 'rv-stopall', label: 'Stop all', args: 'stop' }]
    : [{ key: 'rv-again', label: 'Run again', primary: true, args: 'again' }, { key: 'rv-clear', label: 'Clear finished', args: 'clear' }]
  return (
    // As wide as the pane's body, so the title row's ends are the frame's at every width (W).
    <Box flexDirection="column" width="100%" alignItems="stretch" rowGap={vstep(CARD_GAP)}>
      {ViewHeader(el, 'runner-head', { key: 'runner-done', label: tr(BACK_LABEL), onPress: () => act.openRunner(false) }, tx('common.agents'))}
      {Card(
        el,
        'runner-tasks',
        tx('common.tasks'),
        run === undefined ? '' : runNameOf(run),
        <Box flexDirection="column" rowGap={vstep(GROUP_GAP)}>
          {run === undefined ? StartTaskRow(el, prefs, act, innerPt, true) : null}
          {run === undefined ? (
            <Text dimColor>{tx('common.no_task_run_yet_add_a')}</Text>
          ) : (
            <Box flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
              {RunBar(el, run, innerPt, 'rv-run', false)}
              {/* The bar line says how many are done; the line under it says the rest */}
              <Text>{run.status === 'setup' ? runSummary(run) : runSummary(run, false)}</Text>
              {run.status === 'running' && run.tasks.every(t => t.state === 'waiting') ? <Text key="rv-starting" dimColor>{tr(RUN_STARTING)}</Text> : null}
              {run.status === 'setup' ? CheckLines(el, 'rv-check', prefs) : null}
              <Box key="rv-controls" flexDirection="row" flexWrap="wrap" columnGap={cols(cardGapX())} rowGap={vstep(ADVICE_BUTTON_GAP)}>
                {controls.map(c => ActionButton(el, c.key, c.label, () => act.runSteer(c.args), { primary: 'primary' in c, ...(controls.length > 1 ? { gap: cardGapX() } : {}) }))}
              </Box>
              {run.status === 'done' || run.status === 'stopped' ? <Text key="rv-again-note" dimColor>{tr(AGAIN_NOTE)}</Text> : null}
              {ModelOfferRows(el, act, innerPt)}
            </Box>
          )}
          {run === undefined ? null : List(
            el,
            shownTasks.flatMap(t => {
              const key = `rv:${t.n}`
              return [
                // The same right-column time as the card; Failed in the word column, the red state colour on the plain ring, no chip; the name wraps, never cut
                SessionRow(el, `rv-t-${t.n}`, { kind: taskKind(t), word: taskWord(t), name: `${t.n}. ${t.text}`, innerPt, keepWord: true, failed: t.state === 'failed' || t.check === 'failed', wrap: true, detail: taskDetail(t, now, dur, roleModelsOf(prefs.values), tr, detailChars(innerPt, false, taskWord(t))), right: taskTime(t, now) === undefined ? undefined : <Text dimColor>{taskTime(t, now)}</Text>, after: ChevronMark(el, `row-${key}`, open === key ? 'down' : 'right', toggle(key), `${t.n}. ${t.text}`), onPress: toggle(key) }),
                open === key ? taskBody(t) : null,
              ]
            }),
          )}
          {run === undefined || run.tasks.length <= TASKS_SHOWN ? null : MoreRow(el, 'rv-tasks', folded ? `Show ${run.tasks.length - TASKS_SHOWN} more` : 'Show fewer', !folded, () => act.toggleSection(TASKS_FOLD))}
          {Input === undefined ? null : <Input key="rv-add" placeholder={tx('common.add_a_task_for_example_fix')} value={runnerDraft.task} submitLabel={tx('common.add')} onInput={v => { runnerDraft.task = v }} onSubmit={v => { runnerDraft.task = ''; act.runSteer(`add ${v}`) }} />}
          <Box flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
            <Box key="rv-load-row" flexDirection="column">
              {LinkButton(el, 'rv-load', tx('common.load_the_task_file'), () => act.runSteer('load'), { row: true, chevron: true, widthPt: innerPt })}
              <Text dimColor>{fillIn(tr(LOAD_NOTE), { file: TASKS_FILE })}</Text>
            </Box>
            <Box key="rv-plan-row" flexDirection="column">
              {LinkButton(el, 'rv-plan', tx('common.plan_to_tasks'), () => act.runSteer('plan'), { row: true, chevron: true, widthPt: innerPt })}
              <Text dimColor>{fillIn(tr(PLAN_NOTE), { file: TASKS_FILE })}</Text>
            </Box>
          </Box>
          {/* One shut row for the run choices and the roles, the Tasks card's last row: the usual choices work as they are */}
          {OpenLine(el, 'ol-rv-how', <Text>{tr(HOW_IT_RUNS)}</Text>, howOpen, () => act.toggleSection(HOW_FOLD), { widthPt: innerPt, tall: true })}
        </Box>,
      )}
      {!howOpen || run === undefined ? null : Card(
        el,
        'runner-choices',
        tx('common.run_choices'),
        '',
        <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>
          {ChoiceRow(el, 'rv-atonce', 'Most at once', 'How many agents run at the same time.', AT_ONCE, String(run.choices.atOnce), v => act.runSteer(`at ${v === '0' ? 'auto' : v}`), undefined, innerPt)}
          {run.choices.atOnce !== 0 ? null : <Text key="rv-atnow" dimColor>{run.atNow === undefined ? tx('common.at_once_auto_as_many_as_this') : tx(run.atNow.room ? 'common.starts_up_to_n_at_once_room' : 'common.starts_up_to_n_at_once_no', { n: run.atNow.n })}</Text>}
          <Box flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
            <Text>{tx('common.check_after_each_task')}</Text>
            <Text dimColor={run.choices.check === ''}>{run.choices.check === '' ? tx('common.none_a_command_such_as_npm') : run.choices.check}</Text>
            <Text dimColor>{tr(CHECK_HINT)}</Text>
            {Input === undefined ? null : <Input key="rv-check" placeholder="npm test" value={runnerDraft.check} submitLabel={tx('common.set')} onInput={v => { runnerDraft.check = v }} onSubmit={v => { runnerDraft.check = ''; act.runSteer(`check ${v}`) }} />}
          </Box>
          {ChoiceRow(el, 'rv-afterlimit', tx('common.after_a_plan_limit'), tx('common.go_on_by_itself_after_the'), [{ value: 'go', label: 'Go on' }, { value: 'wait', label: 'Wait' }], run.choices.afterLimit, v => act.runSteer(`afterlimit ${v}`), undefined, innerPt)}
          {SwitchRow(el, 'rv-reviewer', 'Review each task', 'Reads each finished task and writes 3 lines.', run.choices.reviewer, run.choices.reviewer ? 'off' : 'on', () => act.runSteer(`reviewer ${run.choices.reviewer ? 'off' : 'on'}`), innerPt)}
          {ChoiceRow(el, 'rv-min', 'Stop an agent after', 'An agent that runs longer is stopped.', MINUTES, String(run.choices.helperMin), v => act.runSteer(`limit min ${v}`), undefined, innerPt)}
          {ChoiceRow(el, 'rv-helperusd', 'Most cost per agent', 'An estimate from its token counts, read after each step the agent takes.', HELPER_USD, String(run.choices.helperUsd), v => act.runSteer(`limit helper ${v}`), undefined, innerPt)}
          {ChoiceRow(el, 'rv-runusd', 'Most cost for the run', 'Past that, the run pauses.', RUN_USD, String(run.choices.runUsd), v => act.runSteer(`limit run ${v}`), undefined, innerPt)}
          {!nightOn ? null : ChoiceRow(el, 'rv-nightusd', 'Most cost for a night run', 'Past that, a night run pauses until you are back.', NIGHT_USD, String(run.choices.nightUsd), v => act.runSteer(`limit night ${v}`), undefined, innerPt)}
        </Box>,
      )}
      {!howOpen ? null : Card(
        el,
        'runner-roles',
        tx('common.roles'),
        '',
        <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>
          <Box flexDirection="row" alignItems="center" columnGap={cols(LIST_COL_GAP)}>
            {Pick(el, 'rv-roles-scope', [{ value: 'all', label: tx('common.all_projects') }, ...(prefs.project === undefined ? [] : [{ value: 'project', label: `${tx('common.this_project')}: ${prefs.project.name}` }]), { value: 'session', label: tx('common.this_session') }], prefs.rolesScope, v => act.setRolesScope(v as RolesScope), true)}
          </Box>
          {ROLE_NAMES.map(r => ChoiceRow(el, `rv-rolemodel-${r}`, ROLES[r].label, roleNote(r, prefs), MODEL_OPTIONS, prefs.values[roleSettingKey(r)] ?? ROLES[r].model, v => act.setRoleModel(roleSettingKey(r), v), undefined, innerPt))}
          {prefs.rolesScope === 'session' && ROLE_NAMES.some(r => prefs.sessionSet[roleSettingKey(r)] !== undefined) ? <Box key="rv-roles-follow-row" flexDirection="row" justifyContent="flex-end">{ActionButton(el, 'rv-roles-follow', tx('settings.follow_the_project'), () => act.followForSession())}</Box> : null}
          <Text key="rv-model-order" dimColor>{tr(MODEL_ORDER_NOTE)}</Text>
        </Box>,
      )}
      {Card(
        el,
        'runner-templates',
        tx('common.templates'),
        '',
        <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>
          {prefs.templates.map(name => {
            if (flags.applyAsk === name && run !== undefined) {
              return (
                <Box key={`rv-tpl-${name}`} flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
                  <Text>{tr(APPLY_ASK).replace('{n}', String(run.tasks.length)).replace('{name}', name)}</Text>
                  <Box flexDirection="row" justifyContent="flex-end" columnGap={cols(cardGapX())}>
                    {ActionButton(el, `rv-tpl-replace-${name}`, tx('common.replace'), () => act.runSteer(`template apply ${name}`), { primary: true, gap: cardGapX() })}
                    {ActionButton(el, `rv-tpl-keep-${name}`, tx('settings.keep'), () => act.askApply?.(undefined), { gap: cardGapX() })}
                  </Box>
                </Box>
              )
            }
            return (
              <Box key={`rv-tpl-${name}`} flexDirection="row" justifyContent="space-between" alignItems="center" columnGap={cols(cardGapX())}>
                <Text>{name}</Text>
                <Box flexDirection="row" flexShrink={0} columnGap={cols(cardGapX())}>
                  {ActionButton(el, `rv-tpl-apply-${name}`, tx('common.apply'), () => (run === undefined ? act.runSteer(`template apply ${name}`) : act.askApply?.(name)), { primary: true, gap: cardGapX() })}
                  {ActionButton(el, `rv-tpl-delete-${name}`, tx('common.delete'), () => act.runSteer(`template delete ${name}`), { gap: cardGapX() })}
                </Box>
              </Box>
            )
          })}
          {run === undefined || Input === undefined ? null : <Input key="rv-tpl-name" placeholder={tx('common.save_this_run_as_a_template')} value={runnerDraft.template} submitLabel={tx('common.save')} onInput={v => { runnerDraft.template = v }} onSubmit={v => { runnerDraft.template = ''; act.runSteer(`template save ${v}`) }} />}
          {prefs.templates.length === 0 ? <Text dimColor>{tx('common.a_template_keeps_a_runs_tasks')}</Text> : null}
        </Box>,
      )}
      {Card(
        el,
        'runner-history',
        tx('common.past_runs'),
        prefs.history.length === 0 ? '' : String(prefs.history.length),
        prefs.history.length === 0 ? (
          <Text dimColor>{tx('common.a_run_that_ends_shows_here')}</Text>
        ) : (
          <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
            {List(
              el,
              (pastAll ? prefs.history : prefs.history.slice(0, PAST_RUNS_SHOW)).flatMap(past => {
                const key = `past:${past.id}`
                const toggle = () => act.open(prefs.open === key ? undefined : key)
                // A stopped run reads Stopped (Swedish "Stoppad", as its count); a run with every task done reads Done and its line says only the cost, not "All 3 done" again.
                // The right column is its age, as every row ("40 min ago"), not a clock
                const word = past.failed > 0 ? 'Failed' : past.status === 'stopped' ? 'Stopped' : 'Done'
                const ago = fmt.ago(now - past.endedAt, 'days', langNow())
                return [
                  SessionRow(el, `rv-past-${past.id}`, { kind: past.failed > 0 ? 'needs' : past.status === 'stopped' ? 'idle' : 'waiting', failed: past.failed > 0, word: word === 'Stopped' ? tx('toast.task_stopped') : tr(word), name: runNameOf(past), innerPt, keepWord: true, wrap: true, right: <Text dimColor>{ageShown(ago, now - past.endedAt)}</Text>, detail: reportHead(past, trFill, word !== 'Done'), after: ChevronMark(el, `row-${key}`, prefs.open === key ? 'down' : 'right', toggle, runNameOf(past)), onPress: toggle }),
                  prefs.open === key ? WhatIsBody(el, `w-${key}`, past.tasks.map(t => `${t.n}. ${t.text}: ${taskLineWord(t, trFill)}${t.usd === undefined ? '' : ` (${aboutMoney(t.usd, tr)})`}`)) : null,
                ]
              }),
            )}
            {prefs.history.length <= PAST_RUNS_SHOW ? null : MoreRow(el, 'rv-past', pastAll ? 'Show fewer' : `Show ${prefs.history.length - PAST_RUNS_SHOW} more`, pastAll, () => act.toggleSection(PAST_FOLD))}
            {/* The list's last row: a whole-row press that asks once in place (the Reset recipe), then clears only the finished runs */}
            {flags.pastClearAsk ? (
              <Box key="rv-past-clear-ask" flexDirection="column" alignItems="flex-start">
                <Text>{tx('common.clear_past_runs_ask')}</Text>
                <Box marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexShrink={0} columnGap={cols(cardGapX())}>
                  {ActionButton(el, 'rv-past-clear-yes', tx('settings.clear'), () => act.clearPast?.(), { primary: true, gap: cardGapX() })}
                  {ActionButton(el, 'rv-past-clear-keep', tx('settings.keep'), () => act.askPastClear?.(false), { gap: cardGapX() })}
                </Box>
              </Box>
            ) : (
              LinkButton(el, 'rv-past-clear', tx('common.clear_past_runs'), () => act.askPastClear?.(true), { row: true, chevron: true, widthPt: innerPt })
            )}
          </Box>
        ),
      )}
    </Box>
  )
}

// Learn from outcomes: one line and two whole-row presses, from memory only (no store read on a draw).
function ModelOfferRows(el: El, act: Acts, innerPt: number) {
  const { Box, Text } = el
  const m = teachMem.model
  if (m === undefined) return null
  const vars = { ...modelVars(m), role: tr(modelVars(m).role as string) }
  return (
    <Box key="rv-teach" flexDirection="column">
      <Text>{fillIn(tr(MODEL_LINE), vars)}</Text>
      {LinkButton(el, 'rv-teach-use', fillIn(tr(MODEL_USE), vars), () => act.run(MODEL_YES), { row: true, chevron: true, widthPt: innerPt })}
      {LinkButton(el, 'rv-teach-later', TEACH_LATER, () => act.run(MODEL_NO), { row: true, chevron: true, widthPt: innerPt })}
    </Box>
  )
}
