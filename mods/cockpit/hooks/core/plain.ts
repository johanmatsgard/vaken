// Plain mode: one system-prompt section asking for short sentences, common words and at most two options with a pick. The text is constant, so it does not disturb the prompt cache.
import type { HelpEntry } from './registry'
import { tr } from './lang'
import type { Setting } from './settings'

export const PLAIN_SECTION_ID = 'cockpit:plain'
export const PLAIN_TEXT =
  // en-only: the text added to Claude's system prompt
  'The person you work with is not an engineer. Answer in short sentences and common words. Lead with what you did, whether it worked, and what the person must do now. When you must use a technical word, explain it right after in a few words. When the person must decide, give at most two options and say which one you recommend.'

export const PLAIN_SETTINGS: Setting[] = [
  {
    key: 'plain.mode',
    group: 'Explain simply',
    label: 'Plain mode',
    note: 'Asks Claude to answer in short, simple words.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]
export const PLAIN_HELP: HelpEntry[] = [{ title: 'What plain mode does', text: 'Plain mode asks Claude to use short sentences and common words, to explain hard words, and to give you at most two options with its pick. It takes effect from the next message; /vaken-help glossary explains the words vaken uses. Say it simpler (/vaken-settings simple): retells the last answer in plain words; it turns nothing on.' }]

export const GLOSSARY: [string, string][] = [
  ['Context', 'Everything Claude holds in mind for this session. The longer the session, the more it holds, and the more each answer costs.'],
  ['Token', 'A small piece of text, about three quarters of a word. Usage is counted in tokens.'],
  ['Cache', 'A saved copy of your session. While it is fresh, each answer costs much less. It goes stale after an hour of quiet.'],
  ['Compact', 'Claude writes a short summary of the session and keeps that instead of the long session. Your files do not change.'],
  ['Turn', 'One go: you write, Claude works, Claude answers.'],
  ['Agent', 'A second Claude that Claude starts to do one part of the job.'],
  ['Hook', 'A small rule that runs when something happens, such as before a command runs. Vaken uses hooks to guard and to count.'],
  ['Branch', 'A separate line of changes to your code. Your main code stays safe until you merge it.'],
  ['Worktree', 'A second copy of a project folder on its own branch, so two jobs do not trip over each other.'],
  ['Pull request', 'A request to merge a branch into the main code, so someone can look first.'],
  ['MCP', 'A way to connect Claude to another app, such as mail or a calendar.'],
  ['Ledger', 'The list of things vaken did for you, such as a compact.'],
]

export function glossaryText(): string {
  return GLOSSARY.map(([term, meaning]) => `${tr(term)}: ${tr(meaning)}`).join('\n')
}
