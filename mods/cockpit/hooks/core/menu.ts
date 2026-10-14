// The 15 registered slash commands; every other function is a word after one of them or a name after `/vaken-help run`.

import { tEn } from '../i18n/t'

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
  'vaken': ['inbox', 'neighbors'],
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
  'vaken': 'inbox | neighbors', // en-only: the slash menu hint (command words)
  'vaken-usage': 'cost | budget | limits | fit | why', // en-only: the slash menu hint (command words)
  'vaken-compact': 'now | why', // en-only: the slash menu hint (command words)
  'vaken-today': 'value | recap | glance | standup | waits', // en-only: the slash menu hint (command words)
  'vaken-settings': 'all | preset | shape | simple | here | session | reset | layout | card | <key> <value>', // en-only: the slash menu hint (command words)
  'vaken-tasks': 'agents | agents-board | route | goal | new | load | add | set | remove | start [anyway] | again | pause | go | stop | say | at | check | limit | name | template | afterlimit | retry N | keep N | throw N', // en-only: the slash menu hint (command words)
}

export function unknownWord(command: string, args: string, known: readonly string[] = []): string | undefined {
  const word = args.trim().split(/\s+/)[0] ?? ''
  if (word === '' || known.includes(word.toLowerCase())) return undefined
  return tEn('words.unknown_word', { word, words: HINTS[command] ?? '' })
}
