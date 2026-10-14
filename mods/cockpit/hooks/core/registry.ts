// Where finished blocks plug in: each block's core file exports Settings rows and help entries, listed here. A listed file must not import a value from settings.ts (that would be a cycle).
import { AGENTCAP_HELP, AGENTCAP_SETTINGS } from './agentcap'
import { AGENTBOARD_HELP, AGENTBOARD_SETTINGS } from './agentboard'
import { ASSUME_HELP, ASSUME_SETTINGS } from './assumptions'
import { EXPLAIN_HELP } from './explain'
import { FRESH_HELP, FRESH_SETTINGS } from './freshstart'
import { PLANFIRST_HELP, PLANFIRST_SETTINGS } from './planfirst'
import { STARTERS_HELP, STARTERS_SETTINGS } from './starters'
import { SETUP_SETTINGS } from './setupcard'
import { NEIGHBORS_HELP, NEIGHBORS_SETTINGS } from './neighbors'
import { PROMPT_CHECK_HELP, PROMPT_CHECK_SETTINGS } from './promptcheck'
import { SHAPE_HELP, SHAPE_SETTINGS } from './shape'
import { TODAY_HELP, TODAY_SETTINGS } from './today'
import { VALUE_HELP, VALUE_SETTINGS } from './value'
import { AWAY_HELP, AWAY_SETTINGS } from './away'
import { ATTENTION_HELP, ATTENTION_SETTINGS } from './attention'
import { CONTINUITY_HELP, CONTINUITY_SETTINGS } from './continuity'
import { COST_HELP, COST_SETTINGS } from './cost'
import { COACH_HELP, COACH_SETTINGS } from './coach'
import { CREW3_HELP, CREW3_SETTINGS } from './crew3'
import { CREW_HELP, CREW_SETTINGS } from './crew'
import { COMPUTER_HELP } from './computer'
import { DIET_HELP, DIET_SETTINGS } from './diet'
import { ERRORS_HELP, ERRORS_SETTINGS } from './errors'
import { EYES_SETTINGS } from './eyes'
import { GUARD_HELP, GUARD_SETTINGS } from './guard'
import { GUARDBACK_HELP, GUARDBACK_SETTINGS } from './guardback'
import { GUARDWORLD_HELP, GUARDWORLD_SETTINGS } from './guardworld'
import { HEALTH_HELP, HEALTH_SETTINGS } from './health'
import { HAPPENED_HELP, HAPPENED_SETTINGS } from './happened'
import { INSIGHT_HELP } from './insight'
import { INBOX_HELP, INBOX_SETTINGS } from './inbox'
import { MEMORY_HELP } from './memory'
import { PARKING_HELP } from './parking'
import { PHONE_SETTINGS } from './phone'
import { DO_SETTINGS } from './phonedo'
import { PHONE_SETTINGS_MODE } from './phonecmds'
import { POPOUT_HELP } from './popout'
import { PLAIN_HELP, PLAIN_SETTINGS } from './plain'
import { PRESETS_HELP } from './presets'
import { PROOF2_HELP, PROOF2_SETTINGS } from './proof2'
import { PROOF_HELP, PROOF_SETTINGS } from './proof'
import { REFLECT_HELP } from './reflect'
import { RULES_HELP, RULES_SETTINGS } from './rules'
import { RESUME_HELP, RESUME_SETTINGS } from './resume'
import { LIMITWARN_SETTINGS } from './limitwarn'
import { RUNNER_SETTINGS } from './orchestra'
import { ROUTE_HELP, ROUTE_SETTINGS } from './route'
import { SKILLS_HELP } from './skills'
import { STEER_HELP, STEER_SETTINGS } from './steer'
import { TRUST_HELP } from './trust'
import { UNDO_HELP, UNDO_SETTINGS } from './undo'
import { STABILITY_HELP, STABILITY_SETTINGS } from './stability'
import type { Setting } from './settings'

export type HelpEntry = { title: string; text: string }

export const FEATURE_SETTINGS: Setting[] = [...AGENTBOARD_SETTINGS, ...NEIGHBORS_SETTINGS, ...FRESH_SETTINGS, ...PLANFIRST_SETTINGS, ...STARTERS_SETTINGS, ...SETUP_SETTINGS, ...VALUE_SETTINGS, ...TODAY_SETTINGS, ...PROMPT_CHECK_SETTINGS, ...ASSUME_SETTINGS, ...SHAPE_SETTINGS, ...STABILITY_SETTINGS, ...ATTENTION_SETTINGS, ...HAPPENED_SETTINGS, ...AGENTCAP_SETTINGS, ...RUNNER_SETTINGS, ...GUARD_SETTINGS, ...GUARDWORLD_SETTINGS, ...GUARDBACK_SETTINGS, ...PROOF_SETTINGS, ...PROOF2_SETTINGS, ...COST_SETTINGS, ...ROUTE_SETTINGS, ...PLAIN_SETTINGS, ...ERRORS_SETTINGS, ...STEER_SETTINGS, ...DIET_SETTINGS, ...CREW_SETTINGS, ...RULES_SETTINGS, ...COACH_SETTINGS, ...RESUME_SETTINGS, ...LIMITWARN_SETTINGS, ...UNDO_SETTINGS, ...HEALTH_SETTINGS, ...CONTINUITY_SETTINGS, ...INBOX_SETTINGS, ...AWAY_SETTINGS, ...CREW3_SETTINGS, ...EYES_SETTINGS, ...PHONE_SETTINGS, ...DO_SETTINGS, ...PHONE_SETTINGS_MODE]

export const FEATURE_HELP: HelpEntry[] = [...EXPLAIN_HELP, ...AGENTBOARD_HELP, ...NEIGHBORS_HELP, ...FRESH_HELP, ...PLANFIRST_HELP, ...STARTERS_HELP, ...VALUE_HELP, ...TODAY_HELP, ...PROMPT_CHECK_HELP, ...ASSUME_HELP, ...SHAPE_HELP, ...STABILITY_HELP, ...ATTENTION_HELP, ...HAPPENED_HELP, ...AGENTCAP_HELP, ...GUARD_HELP, ...GUARDWORLD_HELP, ...GUARDBACK_HELP, ...PROOF_HELP, ...PROOF2_HELP, ...COST_HELP, ...ROUTE_HELP, ...PLAIN_HELP, ...ERRORS_HELP, ...STEER_HELP, ...DIET_HELP, ...CREW_HELP, ...COMPUTER_HELP, ...RULES_HELP, ...PARKING_HELP, ...REFLECT_HELP, ...MEMORY_HELP, ...COACH_HELP, ...INSIGHT_HELP, ...PRESETS_HELP, ...RESUME_HELP, ...UNDO_HELP, ...TRUST_HELP, ...HEALTH_HELP, ...CONTINUITY_HELP, ...INBOX_HELP, ...AWAY_HELP, ...CREW3_HELP, ...SKILLS_HELP, ...POPOUT_HELP]

// A test fails when an entry of FEATURE_HELP is in no topic.
export type HelpTopicId = 'usage' | 'work' | 'safety' | 'memory' | 'team' | 'prompts' | 'care'
export const HELP_TOPICS: { topic: HelpTopicId; entries: HelpEntry[] }[] = [
  { topic: 'usage', entries: [...COST_HELP, ...ROUTE_HELP, ...FRESH_HELP, ...VALUE_HELP, ...INSIGHT_HELP, ...RESUME_HELP, ...DIET_HELP, ...RULES_HELP] },
  { topic: 'work', entries: [...PROOF_HELP, ...PROOF2_HELP, ...ASSUME_HELP, ...HAPPENED_HELP, ...TRUST_HELP] },
  { topic: 'safety', entries: [...GUARD_HELP, ...GUARDWORLD_HELP, ...GUARDBACK_HELP, ...UNDO_HELP, ...AWAY_HELP] },
  { topic: 'memory', entries: [...CONTINUITY_HELP, ...INBOX_HELP, ...MEMORY_HELP, ...PARKING_HELP, ...REFLECT_HELP, ...TODAY_HELP, ...COACH_HELP] },
  { topic: 'team', entries: [...AGENTBOARD_HELP, ...AGENTCAP_HELP, ...CREW_HELP, ...CREW3_HELP, ...NEIGHBORS_HELP, ...COMPUTER_HELP, ...POPOUT_HELP, ...STEER_HELP, ...STARTERS_HELP] },
  { topic: 'prompts', entries: [...PROMPT_CHECK_HELP, ...SHAPE_HELP, ...PLANFIRST_HELP, ...PLAIN_HELP, ...ERRORS_HELP] },
  { topic: 'care', entries: [...EXPLAIN_HELP, ...HEALTH_HELP, ...STABILITY_HELP, ...ATTENTION_HELP, ...PRESETS_HELP, ...SKILLS_HELP] },
]

// Folded words (core/menu.ts) are printed after each command.
export const COMMAND_GROUPS: { group: string; commands: string[] }[] = [
  { group: 'Start here', commands: ['vaken', 'vaken-help', 'vaken-settings'] },
  { group: 'Usage and cost', commands: ['vaken-usage', 'vaken-compact'] },
  { group: 'Is the work good?', commands: ['vaken-ship'] },
  { group: 'Safety', commands: ['vaken-guard', 'vaken-pause', 'vaken-undo', 'vaken-away'] },
  { group: 'Sessions and memory', commands: ['vaken-today', 'vaken-resume', 'vaken-memory'] },
  { group: 'Team and machine', commands: ['vaken-tasks'] },
  { group: 'Keeping it healthy', commands: ['vaken-explain'] },
]

// Plain English; the text twin is not translated.
export const EVERYDAY_COMMANDS: { command: string; words: string }[] = [
  { command: 'vaken', words: 'what needs you now' },
  { command: 'vaken-help', words: 'this list; add a word to find a topic' },
  { command: 'vaken-settings', words: 'see or change a setting' },
  { command: 'vaken-usage', words: 'your plan limits, cost and budget' },
  { command: 'vaken-compact', words: 'compact the session' },
  { command: 'vaken-ship', words: 'is the work ready to ship' },
  { command: 'vaken-guard', words: 'risky steps that were held, and let one through' },
  { command: 'vaken-pause', words: 'stop every change now' },
  { command: 'vaken-undo', words: 'put files back as they were' },
  { command: 'vaken-away', words: 'rules for when you are away' },
  { command: 'vaken-today', words: 'today in a few lines' },
  { command: 'vaken-resume', words: 'find a session by words' },
  { command: 'vaken-explain', words: 'what a line, error or decision means' },
  { command: 'vaken-tasks', words: 'run a list of tasks with agents' },
  { command: 'vaken-memory', words: 'what Claude remembers' },
]
export const GROUP_ABOUT: Record<string, string> = {
  'Start here': 'first steps',
  'Usage and cost': 'what you spend, and how to spend less',
  'Is the work good?': 'check that the work is right',
  Safety: 'hold, stop and undo',
  'Sessions and memory': 'find, recap and hand over',
  'Team and machine': 'agents, branches and your computer',
  'Keeping it healthy': 'vaken itself',
}
