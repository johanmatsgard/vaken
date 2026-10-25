// The Settings view as one table: sections, their groups and jump buttons.
import type { Setting } from './settings'
import { listedCardOf, zoneOfCard } from './cardhome'
import type { Zone } from './cardhome'
import { TABLE } from '../i18n/table'
import { tIn } from '../i18n/t'
import { fmt } from './fmt'
import type { Lang } from '../i18n/types'
import { PRESETS } from './presets'

export type JumpTo = 'helpers' | 'arrange' | 'safety'
// A jump goes only where its card is shown, so Standard has no "Open the Safety card" button.
export const jumpShown = (to: JumpTo, view: string | undefined, hidden: readonly string[]): boolean => to !== 'safety' || view === 'custom' || !hidden.includes('safety')
export type Section = { name: string; title: string; about: string; groups: string[]; jump?: { label: string; to: JumpTo }; advanced?: boolean }

export const SECTION_TABLE: Section[] = [
  { name: 'Notices', title: 'Notices', about: 'When and how vaken tells you.', groups: ['Attention'] },
  { name: 'Plan and cost', title: 'Money and plan', about: 'Limits, budget and this session: compacting, cache, plain mode and answer shape.', groups: [] },
  { name: 'Agents and tasks', title: 'Agents', about: 'Agents, this computer, other sessions, pull requests and pictures.', groups: ['Agents'], jump: { label: 'Manage agents ›', to: 'helpers' } },
  { name: 'Safety', title: 'Safety', about: 'Risky steps, loops and checks. More in Advanced.', groups: [], jump: { label: 'Open the Safety card ›', to: 'safety' } },
  { name: 'Prompts and memory', title: 'Prompts and memory', about: 'Prompt review, plan first and your rules.', groups: [] },
  { name: 'Look and cards', title: 'Cards and look', about: 'Detail level, accent colour and which cards show.', groups: ['View', 'Look', 'Cards', 'Detail per card', 'Layouts', 'Sessions'], jump: { label: 'Arrange cards ›', to: 'arrange' } },
  { name: 'Health', title: 'Health', about: 'Vaken checks itself.', groups: ['Health'] },
]
// Ship has no settings of its own, so its cards' few rows sit in Helpers.
export const ZONE_SECTION: Record<Zone, string> = { needs: 'Notices', now: 'Plan and cost', helpers: 'Agents and tasks', trust: 'Safety', ship: 'Agents and tasks', setup: 'Prompts and memory', phone: 'Agents and tasks' }
export const ADVANCED_SECTION: Section = { name: 'Advanced', title: 'Advanced', about: 'Expert settings. They work as they are; most people never change them.', groups: [], advanced: true }

export const ADVANCED_KEYS: readonly string[] = [
  'guard.env', 'guard.commands', 'guard.fence', 'guard.outbox', 'proof.confidence', 'proof.receipts', 'proof.anomaly', 'proof.drift',
  'crew.ports', 'crew.worktrees', 'steer.mode', 'agents.board', 'brief.mode', 'stability.check',
  'away.digest', 'recap.mode', 'heartbeat.mode', 'look.columns', 'claude.notes',
]
const ADVANCED = new Set(ADVANCED_KEYS)
export const isAdvanced = (s: Setting): boolean => ADVANCED.has(s.key)
// Expert rows kept off the pane so Settings stays light: /vaken-settings all lists them and /vaken-settings <key> <value> sets them.
export const TEXT_ONLY_KEYS: readonly string[] = ['phone.hello', 'cost.why', 'allow.rules', 'teach.mode', 'night.mode', 'notify.how', 'status.line', 'cap.spend']
const TEXT_ONLY = new Set(TEXT_ONLY_KEYS)
export const isTextOnly = (s: Pick<Setting, 'key'>): boolean => TEXT_ONLY.has(s.key)

const SECTION_OF_GROUP = new Map<string, Section>(SECTION_TABLE.flatMap(sec => sec.groups.map((g): [string, Section] => [g, sec])))
const SECTION_BY_NAME = new Map<string, Section>(SECTION_TABLE.map(sec => [sec.name, sec]))
export const sectionOfGroup = (group: string): Section => SECTION_OF_GROUP.get(group) ?? (SECTION_TABLE[SECTION_TABLE.length - 1] as Section)
export const sectionNamed = (group: string): Section | undefined => SECTION_OF_GROUP.get(group)
const CARD_FOCUS = 'card:'
export const cardFocus = (id: string): string => `${CARD_FOCUS}${id}`
export const cardOfFocus = (focus: string): string | undefined => (focus.startsWith(CARD_FOCUS) ? focus.slice(CARD_FOCUS.length) : undefined)
export function sectionOfCard(id: string): Section | undefined {
  const zone = zoneOfCard(id)
  return zone === undefined ? undefined : SECTION_BY_NAME.get(ZONE_SECTION[zone])
}
export function focusOfSetting(key: string, group: string | undefined): string | undefined {
  const card = listedCardOf(key)
  return card !== undefined && zoneOfCard(card) !== undefined ? cardFocus(card) : group
}
export function sectionOfSetting(s: Pick<Setting, 'key' | 'group'>): Section {
  const card = listedCardOf(s.key)
  return (card === undefined ? undefined : sectionOfCard(card)) ?? sectionOfGroup(s.group)
}

const OFF_WORDS = ['off', 'hide']
// Ask is not here: an Ask row acts (it sends Claude a request or asks you), so it counts as on
const SUGGEST_WORDS = ['suggest', 'tip', 'remind', 'count', 'watch']
export type Tone = 'on' | 'suggest' | 'off' | 'plain'
export const hasOff = (s: Setting): boolean => s.options.some(o => OFF_WORDS.includes(o.value))
export function toneOf(s: Setting, value: string): Tone {
  if (!hasOff(s)) return 'plain'
  if (OFF_WORDS.includes(value)) return 'off'
  return SUGGEST_WORDS.includes(value) ? 'suggest' : 'on'
}
export function chipWord(s: Setting, value: string, isSwitch: boolean): string {
  const tone = toneOf(s, value)
  if (isSwitch) return tone === 'off' ? 'Off' : 'On'
  if (value === 'watch') return 'Watch'
  return fmt.choiceWord(s.options.find(o => o.value === value)?.label ?? value)
}

export type Tally = { on: number; suggest: number; off: number; bySection: Map<string, { on: number; total: number }> }
// A Suggest counts as on in a section's chip: the chip says what runs.
export function tally(settings: readonly Setting[], values: Record<string, string>, canDrag: boolean): Tally {
  const out: Tally = { on: 0, suggest: 0, off: 0, bySection: new Map() }
  for (const s of settings) {
    if (s.hidden === true || (s.desktopOnly === true && !canDrag) || viewLocksRow(s.key, values['look.view'])) continue
    const tone = toneOf(s, values[s.key] ?? s.default)
    if (tone === 'plain') continue
    out[tone] += 1
    const id = (isAdvanced(s) ? ADVANCED_SECTION : sectionOfSetting(s)).name
    const cell = out.bySection.get(id) ?? { on: 0, total: 0 }
    cell.total += 1
    if (tone !== 'off') cell.on += 1
    out.bySection.set(id, cell)
  }
  return out
}

const NOTES: Record<string, string> = {
  'view.problems': 'settings.when_a_card_has_a_problem',
  'compact.mode': 'settings.when_the_chat_grows_it_suggests',
  'compact.from': 'settings.the_cockpit_considers_shortening_once_the',
  'compact.min': 'settings.compact_min_note',
  'compact.lead': 'settings.compact_lead_note',
  'compact.card': 'settings.when_the_chat_is_shortened_goal',
  'cache.keeper': 'settings.while_you_are_away_it_messages_claude',
  'loop.breaker': 'settings.when_claude_retries_a_failing_step',
  'agents.board': 'settings.when_helpers_run_it_lists_them',
  'agents.offer': 'settings.offer_helper_types_note',
  'neighbors.warn': 'settings.when_another_session_works_in_this',
  'fresh.nudge': 'settings.when_a_new_topic_would_cost',
  'plan.first': 'settings.before_a_big_task_it_suggests',
  'value.weekly': 'settings.once_a_week_it_adds_one',
  'today.brief': 'settings.on_your_first_prompt_of_a',
  'prompt.check': 'settings.when_a_prompt_is_vague_tip',
  'assume.check': 'settings.before_big_changes_claude_lists_its',
  'tasks.visible': 'settings.for_bigger_jobs_claude_keeps_a_task',
  'habit.summary': 'settings.after_a_bigger_job_claude_ends',
  'habit.ask': 'settings.when_you_must_choose_claude_asks',
  'habit.chapters': 'settings.in_a_long_chat_claude_marks',
  'stability.check': 'settings.after_an_update_the_cockpit_checks',
  'notify.mode': 'settings.when_another_session_needs_you_or',
  'notify.quiet': 'settings.during_these_hours_no_notices_come',
  'heartbeat.mode': 'settings.when_a_working_session_goes_quiet',
  'recap.mode': 'settings.when_you_come_back_after_a',
  'happened.mode': 'settings.after_each_turn_it_tells_you',
  'cap.mode': 'settings.when_too_many_helpers_run_at',
  'cap.max': 'settings.all_your_sessions_are_counted_together',
  'guard.destructive': 'settings.when_a_command_deletes_force_pushes',
  'guard.scope': 'settings.when_an_edit_leaves_your_folders',
  'guard.packages': 'settings.when_a_new_package_looks_odd',
  'guard.tests': 'settings.when_an_edit_skips_tests_or',
  'guard.world': 'settings.when_claude_sends_posts_pays_or',
  'guard.secrets': 'settings.when_a_secret_file_is_read',
  'guard.outbox': 'settings.each_turn_it_lists_what_leaves',
  'away.policy': 'settings.while_you_are_away_risky_steps',
  'guard.migrations': 'settings.when_a_database_migration_runs_it',
  'guard.env': 'settings.when_code_reads_an_env_name',
  'guard.commands': 'settings.it_keeps_the_last_50_shell',
  'guard.fence': 'settings.it_tells_claude_that_web_and',
  'claude.notes': 'settings.safety_notes_always_go_to_claude',
  'proof.receipts': 'settings.when_tests_build_or_lint_run',
  'proof.claims': 'settings.when_claude_says_done_or_tests',
  'proof.done': 'settings.done_counts_only_when_your_chosen',
  'proof.drift': 'settings.when_edits_wander_far_from_the',
  'proof.anomaly': 'settings.on_repeated_edits_idle_calls_or',
  'proof.confidence': 'settings.it_shows_one_score_from_evidence',
  'cost.budget': 'settings.at_80_of_the_budget_it',
  'cost.why': 'settings.when_asked_it_writes_a_paragraph',
  'route.mode': 'settings.when_a_lookup_helper_starts_it',
  'hints.model': 'settings.when_a_sessions_model_or_effort',
  'plain.mode': 'settings.claude_is_asked_to_answer_in',
  'errors.mode': 'settings.when_a_step_fails_it_notes_the_kind',
  'steer.mode': 'settings.claude_can_read_the_budget_and',
  'diet.mode': 'settings.once_a_day_it_tells_you',
  'crew.collide': 'settings.when_another_session_edits_the_same',
  'crew.pr': 'settings.it_shows_your_pull_request_and',
  'laptop.mode': 'settings.it_reads_memory_and_battery_by',
  'rules.mode': 'settings.when_a_step_breaks_a_never',
  'coach.mode': 'settings.when_you_repeat_a_request_it',
  'decisions.mode': 'settings.it_writes_down_your_answers_and',
  'resume.mode': 'settings.when_a_plan_limit_stops_a',
  'limits.warn': 'settings.when_a_plan_window_or_todays',
  'undo.mode': 'settings.before_a_step_changes_a_file',
  'modhealth.mode': 'settings.when_parts_of_the_cockpit_fail',
  'brief.mode': 'settings.it_adds_the_brief_packet_timeline',
  'inbox.mode': 'settings.it_lists_what_needs_you',
  'away.digest': 'settings.when_you_end_away_mode_it',
  'crew.worktrees': 'settings.when_worktrees_are_safe_to_remove',
  'crew.ports': 'settings.when_another_session_holds_a_port',
  'awake.mode': 'settings.while_agents_work_it_keeps_the',
  'awake.away': 'settings.when_you_are_away_it_keeps',
  'do.mode': 'settings.when_claude_writes_a_command_cockpit',
  'phone.mode': 'settings.when_a_phone_joins_the_cockpit',
  'phone.hello': 'settings.when_your_phone_joins_it_shows',
}

const enOf = (name: string): string => {
  const en = TABLE[name]?.en
  return typeof en === 'string' ? en : en === undefined ? name : en.other
}
export const noteOf = (key: string, fallback: string): string => (NOTES[key] === undefined ? fallback : enOf(NOTES[key]))

export const decorate = (s: Setting): Setting => {
  const named = NOTES[s.key]
  const note = named === undefined ? undefined : enOf(named)
  const advanced = ADVANCED.has(s.key)
  const textOnly = TEXT_ONLY.has(s.key)
  return note === undefined && !advanced && !textOnly ? s : { ...s, ...(note === undefined ? {} : { note }), ...(advanced ? { advanced: true } : {}), ...(textOnly ? { hidden: true } : {}) }
}

export const MODE_TITLE = 'How much should it tell you?'
export const MODE_WORDS: Record<string, string> = { quiet: 'settings.mode_quiet', balanced: 'settings.mode_balanced', full: 'settings.mode_full', custom: 'settings.mode_custom' }
export const BACK_WORDS = { offer: 'settings.back_to_recommended', head: 'settings.back_changes', yes: 'settings.back_yes', keep: 'settings.back_keep' } as const
// Mode names are read by name, not by `tr`: the lookup by English text is also used for Quiet and Full elsewhere.
export const modeLabel = (id: string, lang: Lang): string => (MODE_WORDS[id] === undefined ? id : tIn(lang, MODE_WORDS[id]))
export const presetLabel = (id: string, lang: Lang): string => (MODE_WORDS[id] !== undefined ? modeLabel(id, lang) : (PRESETS.find(p => p.name === id)?.title ?? id))
export const MODE_ABOUT: Record<string, string> = {
  quiet: 'settings.mode_quiet_about',
  balanced: 'settings.quiet_plus_suggestions_band_lines',
  full: 'settings.balanced_plus_the_checks_and_the',
  custom: 'settings.your_own_mix_pick_a_mode',
}
export const MODE_SHORT: Record<string, string> = { quiet: 'settings.mode_quiet_short', balanced: 'settings.mode_balanced_short', full: 'settings.mode_full_short' }
export const MODE_TAG: Record<string, string> = { quiet: 'settings.mode_tag_free', balanced: 'settings.mode_tag_free', full: 'settings.mode_tag_plan' }
export const MODE_PICK_NOTE = 'settings.mode_pick_note'
export const COUNT_CHIP_SHORT = 'settings.on_of_total_on'
export const COUNTS_LINE = '{on} of {total} on, {off} off. {suggest} only suggest.'
export const COUNT_CHIP = '{on} of {total} settings on'
export const CHANGED_CHIP = 'settings.n_changed'
export const CHANGED_WORD = 'settings.changed_chip'
export const RESET_ASK = 'Clear every setting, the card order and your pins?'
export const RESET_ASK_PROJECT = 'Make this project follow all projects again?'
export const RESET_CLEAR = 'Clear'
export const RESET_KEEP = 'Keep'
export const RESET_DONE = 'Everything is back to the usual choice.'
export const RESET_DONE_PROJECT = 'This project follows all projects again.'
export const RESET_NOTE = 'Your choices go back to the defaults. Notes and history stay. There is no undo.'
export const ERASE_NOTE = 'Removes everything vaken stored on this computer, except a paused session. Project files stay. It cannot be undone.'
export const SESSIONS_NOTE = 'Pin puts a session first in Other sessions. Hide takes it off the list, except while it needs you.'
export const VIEW_LOCK_NOTE = 'Your view decides which cards show. Pick Custom to choose.'
export const viewLocksRow = (key: string, view: string | undefined): boolean => (view ?? 'standard') !== 'custom' && (key === 'view.problems' || key.startsWith('cards.'))
export const CARDS_NOTE = 'Show always shows a card, Hide never does. Auto shows it when it has something to show. Plan limits, This session, Other sessions, Autopilot and Safety have no Auto: they always show unless you hide them.'
const RUNNER_ROLE_STRINGS = ['Reads and reports. Changes no file.', 'Reads only.', 'This session only.', 'This project only.', 'Also the model for lookup agents Claude starts (Model choice).', 'Follow the project']
export const MODE_NOW = 'settings.mode_on_now'
export const MODE_CHANGES = 'settings.mode_changes_n'
export const MODE_CHIP_PROJECT = 'settings.mode_chip_project'
export const MODE_THIS_PROJECT = 'settings.mode_this_project'
const formsOf = (name: string): string[] => {
  const en = TABLE[name]?.en
  return en === undefined ? [] : typeof en === 'string' ? [en] : [en.one, en.other]
}
export const SETTINGS_VIEW_STRINGS: string[] = [...formsOf(MODE_NOW), ...formsOf(MODE_CHANGES), ...formsOf(MODE_CHIP_PROJECT), ...formsOf(MODE_THIS_PROJECT), MODE_TITLE, COUNTS_LINE, COUNT_CHIP, ...formsOf(CHANGED_CHIP), enOf(CHANGED_WORD), RESET_ASK, RESET_ASK_PROJECT, RESET_CLEAR, RESET_KEEP, RESET_DONE, RESET_DONE_PROJECT, RESET_NOTE, ERASE_NOTE, SESSIONS_NOTE, CARDS_NOTE, VIEW_LOCK_NOTE, 'Mode', 'Cards and look', 'Money and plan', 'Agents', 'Advanced', ADVANCED_SECTION.about, 'Arrange cards ›', 'Open the Safety card ›', 'Manage agents ›', 'On', 'Off', 'Suggest', 'Watch', ...Object.values(MODE_ABOUT).map(enOf), ...Object.values(MODE_WORDS).map(enOf), ...Object.values(MODE_SHORT).map(enOf), ...Object.values(MODE_TAG).map(enOf), enOf(MODE_PICK_NOTE), enOf(COUNT_CHIP_SHORT), ...Object.values(BACK_WORDS).map(enOf), enOf('settings.privacy_note'), ...RUNNER_ROLE_STRINGS, 'Default', 'This part could not be shown: {error}', ...['settings.card_reset', 'settings.card_your_data', 'settings.changed_by_you', 'settings.changed_undone', 'settings.undo_mode', 'settings.undo_nothing', 'settings.undo_setup'].map(enOf), ...formsOf('settings.undo_done'), ...formsOf('settings.undo_mode_toast')]
