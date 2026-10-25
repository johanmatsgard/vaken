// The card guide: one entry per card (title, promise, when it shows). Pure.
import { APPEARS, isFirstCard } from './cardrules'
import { CARD_ZONE } from './cardhome'

export const GUIDE_TITLE = 'What each card does'
export const GUIDE_ALWAYS = 'Always shown.'
export const GUIDE_SHOWN = 'Shown'
export const GUIDE_OFF = 'Hidden'
export const GUIDE_TURN = 'Turn cards on or off'
export const GUIDE_CUSTOM_ABOUT = 'Your own view: switch each card on or off. The sample is made up.'
export const GUIDE_EXAMPLE = 'Example'
export const GUIDE_NEEDS = 'Needs you sits on top of every view.'

type CardId = keyof typeof CARD_ZONE
export const GUIDE: Record<CardId, { title: string; promise: string; sample: string; shows?: string }> = {
  limit: { title: 'Plan limits', promise: 'Warns you before you reach a plan limit.', sample: '5-hour 41%, week 12%' },
  here: { title: 'This session', promise: 'Shows what this session costs and how full its context is.', sample: '$0.42, context 62% full' },
  context: { title: 'Memory and notes', promise: 'Checks your instruction files and notes, and what compacting keeps.', sample: 'Notes checked, nothing heavy', shows: 'Shows when the session gets heavy or its notes need a check.' },
  agents: { title: 'Agents', promise: 'Shows the agents Claude started and whether they still run.', sample: '2 running, 1 done', shows: 'Shows when an agent has started.' },
  computer: { title: 'Computer', promise: 'Says how many more agents this computer can run.', sample: 'Room for 3 more agents', shows: 'Shows when the agent gauge is on or the computer is full.' },
  others: { title: 'Other sessions', promise: 'Shows your other open sessions and what each one does.', sample: '3 sessions, 1 working' },
  guard: { title: 'Risky steps', promise: 'How strict the safety rules are.', sample: 'Warns, stops the worst', shows: 'Shows when it warned or stopped something today.' },
  safety: { title: 'Safety', promise: 'Pause this session, undo a change, and see which risky steps were stopped.', sample: 'Pause this session, undo the last change' },
  proof: { title: 'Checks', promise: 'Tells you whether the tests and checks really passed.', sample: 'Tests passed, build passed', shows: 'Shows when Claude has done work that can be checked.' },
  prs: { title: 'Pull requests', promise: 'Follows your open pull requests: checks, merging and the next step. It acts only when you press.', sample: '1 open, checks passing', shows: 'Shows when a pull request is open.' },
  ship: { title: 'Ship', promise: 'Says if you are ready to ship, what blocks it, and the next step.', sample: 'Ready to ship', shows: 'Shows when a pull request or a check waits.' },
  preview: { title: 'Preview', promise: 'Shows your app at phone, iPad and desktop size.', sample: 'Phone, iPad, desktop', shows: 'Shows when a dev server runs or a screen file was edited.' },
  back: { title: 'Where was I', promise: 'Tells you where you were, what is still open and what happened while you were away.', sample: '2 open ends from yesterday', shows: 'Shows after a break, or when something is still open.' },
  setup: { title: 'Agent setup', promise: 'Shows whether the agent files and instructions match your choices. It writes files only when you press.', sample: 'In line with your choices', shows: 'Shows when they differ from your choices or conflict.' },
  skills: { title: 'Skills', promise: 'Shows which skills you use most and what the list costs.', sample: '4 skills used today', shows: 'Shows when you have used a skill.' },
  autopilot: { title: 'Autopilot', promise: 'Lists what vaken did for you today. It only lists; it does not act.', sample: '5 things done today' },
  do: { title: 'Run commands', promise: 'Lists the shell commands in the last answer. One runs only when you press Run.', sample: '2 commands ready', shows: 'Shows when the last answer has commands to run.' },
}

export type GuideLine = { id: CardId; title: string; promise: string; sample: string; shows: string }
export function guideLine(id: CardId): GuideLine {
  return { id, title: GUIDE[id].title, promise: GUIDE[id].promise, sample: GUIDE[id].sample, shows: isFirstCard(id) || APPEARS[id] === undefined ? GUIDE_ALWAYS : (GUIDE[id].shows ?? '') }
}
export const guideLines = (ids: readonly CardId[]): GuideLine[] => ids.map(guideLine)

export const GUIDE_VIEW_STRINGS: string[] = [GUIDE_NEEDS, GUIDE_CUSTOM_ABOUT, GUIDE_EXAMPLE, GUIDE_TITLE, GUIDE_ALWAYS, GUIDE_SHOWN, GUIDE_OFF, GUIDE_TURN, ...Object.values(GUIDE).flatMap(g => [g.promise, g.sample, ...(g.shows === undefined ? [] : [g.shows])])]
