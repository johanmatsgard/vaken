// Working habits: for a bigger job, one note asks Claude for the habits that are on (a visible task list, a done/next close, clickable questions, chapters). No model call.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'

export const TASKS_KEY = 'tasks.visible'
const TASKS_MIN_WORDS = 25
// The note stays in the chat once sent, so it is sent again only after this long in the same session.
export const TASKS_AGAIN_MS = 60 * 60_000

// One habit: its setting and the sentence it adds to the note. All are on by default.
type Habit = { key: string; label: string; note: string; ask: string }
export const HABITS: readonly Habit[] = [
  {
    key: TASKS_KEY,
    label: 'Task list',
    note: 'For bigger jobs, Claude keeps a task list you can follow in the chat.',
    // en-only: a note to Claude
    ask: 'For work with 3 or more steps, keep a visible task list with your todo tool: one step in progress, tick each step off when it is done.',
  },
  {
    key: 'habit.summary',
    label: 'Done and next',
    note: 'After a bigger job, Claude says what is done, what is not, and what is next.',
    // en-only: a note to Claude
    ask: 'When a job of several steps ends, close with three short lines: done, not done, and what the person does next.',
  },
  {
    key: 'habit.ask',
    label: 'Clickable questions',
    note: 'When you must choose, Claude asks with options you can press.',
    // en-only: a note to Claude
    ask: 'When the person must choose, ask with clickable options (your question tool, if you have one), your recommendation first.',
  },
  {
    key: 'habit.chapters',
    label: 'Chapters',
    note: 'In a long chat, Claude marks a new chapter when the work changes.',
    // en-only: a note to Claude
    ask: 'In a long chat, mark a new chapter when the work moves to a new phase, if you have a chapter tool.',
  },
]
export const HABIT_KEYS: readonly string[] = HABITS.map(h => h.key)

export const TASKS_SETTINGS: Setting[] = HABITS.map(h => ({
  key: h.key,
  group: 'Prompts',
  label: h.label,
  note: h.note,
  options: [
    { value: 'off', label: 'Off' },
    { value: 'on', label: 'On' },
  ],
  default: 'on',
}))
export const TASKS_HELP: HelpEntry[] = [
  {
    title: 'What the working habits do',
    text: 'For a message of 25 words or more, one short note asks Claude for the habits that are on: a task list you can follow, three closing lines (done, not done, what you do now), questions with options you can press, and chapters in a long chat. The note is sent at most once an hour in a session. Each habit has its own switch under Prompts.',
  },
]

// en-only: a note to Claude
const NOTE_START = 'Vaken note:'
export const habitsNote = (on: readonly string[]): string | undefined => {
  const parts = HABITS.filter(h => on.includes(h.key)).map(h => h.ask)
  return parts.length === 0 ? undefined : [NOTE_START, ...parts].join(' ')
}

const wordCount = (text: string): number => text.trim().split(/\s+/).filter(w => w !== '').length
export const wantsTaskNote = (text: string, lastAt: number | undefined, now: number): boolean => wordCount(text) >= TASKS_MIN_WORDS && (lastAt === undefined || now - lastAt >= TASKS_AGAIN_MS)
export const tasksStoreKey = (sessionId: string): string => `cockpit:tasks:last:${sessionId}`
