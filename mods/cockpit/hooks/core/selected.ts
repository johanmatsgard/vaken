// Selected text: three presses on the This session card that act on the text the person has selected in the chat. The selection is read only at the moment of a press
// (`$.ui.selection()` answers what was last selected; it answers nothing where the app draws no selection) and is kept nowhere: it goes to Claude, the task list or the clipboard, as pressed.
import type { HelpEntry } from './registry'
import { hideSecrets } from './guardcmds'

export const SEL_OPEN = 'here:sel'
export const SEL_TITLE = 'Selected text'
export const SEL_RIGHT = 'Show actions'
export const SEL_HINT = 'Select text in the chat, then press one. Nothing is kept.'
export const SEL_EXPLAIN = 'Explain this'
export const SEL_TASK = 'Make it a task'
export const SEL_COPY = 'Copy'
export const SEL_NONE = 'Nothing is selected in the chat. Select some text first.'
export const SEL_EXPLAIN_SAID = 'Asked Claude to explain it.'
export const SEL_TASK_SAID = 'Added it to the task list.'
export const SEL_COPIED = 'Copied the selected text.'
export const SEL_NOT_COPIED = 'Could not copy the selected text.'
export const SEL_HELP_TITLE = 'What Selected text does'
export const SEL_HELP_TEXT = 'Select text in the chat, then open Selected text on This session. Explain this asks Claude to explain it in plain words, Make it a task adds it to the task list, and Copy puts it on the clipboard. Vaken reads the selection only when you press and keeps none of it, except as the task you make.'
export const SELECTED_HELP: HelpEntry[] = [{ title: SEL_HELP_TITLE, text: SEL_HELP_TEXT }]
export const SELECTED_STRINGS: string[] = [SEL_TITLE, SEL_RIGHT, SEL_HINT, SEL_EXPLAIN, SEL_TASK, SEL_COPY, SEL_NONE, SEL_EXPLAIN_SAID, SEL_TASK_SAID, SEL_COPIED, SEL_NOT_COPIED, SEL_HELP_TITLE, SEL_HELP_TEXT]

// A longer selection is cut here, so one press never sends a whole transcript.
export const SEL_QUOTE_MAX = 4000
// The task list holds a task of this many characters at most (TASK_WORDS_MAX in core/orchestra.ts).
export const SEL_TASK_MAX = 500

const ASK = 'Please explain this in plain, short words. It is text I selected in our chat:' // en-only: text for Claude, not shown in the pane
// What the task runner's text-twin answer starts with when a task was added.
export const ADDED_PREFIX = 'Added task' // en-only: the start of a slash command's plain answer, not shown in the pane
const CUT = '(the selection was cut here)' // en-only: text for Claude, not shown in the pane

const trimmed = (text: string): string => text.replace(/\r\n?/g, '\n').trim()

// The one request Claude gets: the selection quoted line by line under one sentence. Undefined when nothing is selected.
export function explainRequest(selected: string | undefined): string | undefined {
  const text = selected === undefined ? '' : trimmed(selected)
  if (text === '') return undefined
  const cut = text.length > SEL_QUOTE_MAX
  const quote = (cut ? text.slice(0, SEL_QUOTE_MAX) : text).split('\n').map(l => `> ${l}`.trimEnd()).join('\n')
  return `${ASK}\n\n${quote}${cut ? `\n${CUT}` : ''}`
}

// The task line for the task list: one line, no secrets, cut to the task length; a closing bracket would be read as a task's own choices, so a full stop ends it.
export function taskLineOf(selected: string | undefined): string | undefined {
  const text = selected === undefined ? '' : hideSecrets(selected).replace(/\s+/g, ' ').trim()
  if (text === '') return undefined
  const line = text.length > SEL_TASK_MAX ? `${text.slice(0, SEL_TASK_MAX - 1).trimEnd()}…` : text
  return line.endsWith(')') ? `${line}.` : line
}

// What a press may copy: the selection as it is, or nothing.
export const copyTextOf = (selected: string | undefined): string | undefined => (selected === undefined || selected.trim() === '' ? undefined : selected)
