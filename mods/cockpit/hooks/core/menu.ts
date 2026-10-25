// The 15 registered slash commands; every other function is a word after one of them or a name after `/vaken-help run`.

import { t } from '../i18n/t'
import { code } from './chatmd'

export const FRONT_DOOR: string[] = [
  'vaken',
  'vaken-help',
  'vaken-settings',
  'vaken-usage',
  'vaken-compact',
  'vaken-ship',
  'vaken-guard',
  'vaken-pause',
  'vaken-undo',
  'vaken-away',
  'vaken-today',
  'vaken-resume',
  'vaken-explain',
  'vaken-tasks',
  'vaken-memory',
]

export const FOLDED: Record<string, string[]> = {
  'vaken': ['inbox', 'neighbors', 'show', 'run', 'pic', 'quick'],
  'vaken-help': ['glossary'],
  'vaken-settings': ['preset', 'shape', 'simple'],
  'vaken-usage': ['cost', 'budget', 'limits', 'fit', 'why'],
  'vaken-ship': ['proof', 'done', 'pr', 'queue', 'heat', 'merge-order', 'worktrees', 'review-story', 'ci-fix', 'digest-branch', 'reviewed', 'orphans'],
  'vaken-guard': ['outbox', 'fence', 'commands'],
  'vaken-pause': ['steer'],
  'vaken-undo': ['checkpoint'],
  'vaken-away': ['digest'],
  'vaken-today': ['value', 'recap', 'glance', 'standup', 'waits'],
  'vaken-resume': ['find', 'timeline'],
  'vaken-explain': ['error', 'happened', 'assumptions', 'planfirst', 'fresh', 'promptcheck'],
  'vaken-tasks': ['agents', 'agents-board', 'route', 'goal'],
  'vaken-memory': ['decide', 'decisions', 'rules', 'park', 'reflect'],
}

export const HIDDEN: string[] = [
  'focus', 'coach', 'skills', 'laptop', 'ports', 'popout', 'awake', 'keeper', 'loops', 'diet', 'trust', 'health', 'modhealth', 'setup', 'audit', 'claims', 'intent', 'confidence',
  'after-limit', 'packet', 'story', 'brief', 'outcomes', 'tidy', 'do',
]

// One line each for /vaken-help run with no name, in the words of the feature's own help.
export const HIDDEN_ABOUT: Record<string, string> = {
  focus: 'quiet for 50 minutes: only what needs you gets through',
  coach: 'save a request you repeat as a skill',
  skills: 'what the Skills card shows',
  laptop: "your computer's memory, swap, battery and heat",
  ports: 'which session holds which port',
  popout: 'open this session in a new window',
  awake: 'keep the computer awake while a session works',
  keeper: 'when the cache was last kept warm',
  loops: 'the steps that failed the same way again and again',
  diet: 'are my instruction files too big?',
  trust: 'what your plugins can do',
  health: 'does vaken still work after an update?',
  modhealth: 'the counts of the self-check of vaken',
  setup: 'the agent files and what differs',
  audit: 'every step vaken took',
  claims: 'who edits what',
  intent: 'what you asked, what was delivered, what is missing',
  confidence: 'one number made only of evidence',
  'after-limit': 'the wait after a plan limit; off cancels it',
  packet: 'save the note for the next session as a file',
  story: 'what happened, from counts only',
  brief: 'the note for the next session, to paste',
  outcomes: 'finished work and about what it cost',
  tidy: 'leftover notes from closed sessions',
  do: 'the commands in the last answer',
}

export function subArgs(args: string, ...words: string[]): string | undefined {
  let rest = args.trim()
  for (const w of words) {
    const m = /^(\S+)(?:\s+|$)/.exec(rest)
    if (m === null || (m[1] ?? '').toLowerCase() !== w) return undefined
    rest = rest.slice(m[0].length)
  }
  return rest
}

// A matching line lets the command's own hook pass it on to the hook of that function.
export function isFolded(command: string, args: string): boolean {
  const named = (FOLDED[command] ?? []).some(w => subArgs(args, w) !== undefined)
  return command === 'vaken-help' ? named || HIDDEN.some(h => subArgs(args, 'run', h) !== undefined) : named
}

// The unknownWord answer reads its list from here, so the menu and the answer never differ.
export const HINTS: Readonly<Record<string, string>> = {
  'vaken': 'inbox | neighbors | show <file> | run <command> | pic [port] | quick [name]', // en-only: the slash menu hint (command words)
  'vaken-usage': 'cost | budget | limits | fit | why', // en-only: the slash menu hint (command words)
  'vaken-compact': 'now | why', // en-only: the slash menu hint (command words)
  'vaken-today': 'value | recap | glance | standup | waits', // en-only: the slash menu hint (command words)
  'vaken-settings': 'all | preset | shape | simple | here | session | reset | layout | card | <key> <value>', // en-only: the slash menu hint (command words)
  'vaken-tasks': 'agents | agents-board | route | goal | new | load | add | set | remove | start [anyway] | night [anyway] | again | pause | go | stop | say | at | check | limit | name | template | afterlimit | retry N | keep N | throw N', // en-only: the slash menu hint (command words)
}

// Said in the person's language, the words as list lines in code, so `show <file>` keeps its brackets; `help` points to the help command
export function unknownWord(command: string, args: string, known: readonly string[] = []): string | undefined {
  const word = args.trim().split(/\s+/)[0] ?? ''
  if (word === '' || known.includes(word.toLowerCase())) return undefined
  const words = (HINTS[command] ?? '').split(' | ').filter(w => w !== '').map(w => `\n- ${code(w)}`).join('')
  const said = t('words.unknown_word', { word: code(word), words })
  return word.toLowerCase() === 'help' ? `${t('chat.help_is')}\n\n${said}` : said
}
