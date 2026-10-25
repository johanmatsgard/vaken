// Self-steering tool: one read-only tool the model can call to read vaken's cost, budget, checks and goal.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'

export const STEER_SETTINGS: Setting[] = [
  {
    key: 'steer.mode',
    group: 'Explain simply',
    label: 'Vaken tool',
    note: 'Lets Claude read the budget and receipts itself.', // en-only: a setting note; /vaken-settings text stays English
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
]
export const STEER_HELP: HelpEntry[] = [{ title: 'Can Claude ask vaken things?', text: 'Claude can ask vaken a question: what it has cost, what the budget is, whether the tests passed after the last edit, what the goal is. It can only read; it cannot change anything.' }]

export const STEER_TOOL = 'vaken_status'
// A command cannot run inside a tool call (the engine refuses it), so each topic is read from vaken's own state.
export const TOPICS: readonly string[] = ['proof', 'done', 'goal', 'happened', 'health']

export const STEER_DESCRIPTION = `Ask vaken about this session. Read only. Topics: ${TOPICS.join(', ')}. Use "proof" before you say the work is done, "done" to see the definition of done, "goal" to remember the goal, "happened" for what the last answer did.`
export const STEER_SCHEMA = { type: 'object', properties: { topic: { type: 'string', enum: [...TOPICS], description: 'What to ask about.' } }, required: ['topic'] } // en-only: the tool's schema, read by Claude

export const isTopic = (topic: unknown): topic is string => typeof topic === 'string' && TOPICS.includes(topic)
export const unknownTopic = (): string => `Unknown topic. Ask about one of: ${TOPICS.join(', ')}.`
