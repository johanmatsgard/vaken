// Finding things in the pane: the search of Help and Settings, the Most used rows, the Try these list, the commands a text names and what Claude gets.
import { FOLDED, FRONT_DOOR, HIDDEN, HIDDEN_ABOUT } from './menu'
import { HABIT_KEYS } from './tasklist'

// The rows a new person needs most, at the top of Settings
export const MOST_USED_KEYS: readonly string[] = ['compact.mode', 'next.mode', 'lean.mode', 'look.view']

// Every typed word must be in the text, in any order and case
export const findWordsOf = (query: string): string[] => query.toLowerCase().split(/\s+/).filter(w => w !== '')
const holds = (text: string, words: string[]): boolean => {
  const low = text.toLowerCase()
  return words.every(w => low.includes(w))
}

// As /vaken-help <word>: the entries whose title holds the words first, then those whose text does
export function findHelp<E extends { title: string; text: string }>(entries: readonly E[], query: string, tr: (s: string) => string = s => s): E[] {
  const words = findWordsOf(query)
  if (words.length === 0) return [...entries]
  const inTitle = entries.filter(e => holds(tr(e.title), words))
  const inText = entries.filter(e => !inTitle.includes(e) && holds(tr(e.text), words))
  return [...inTitle, ...inText]
}

// A row matches by its label or its note
export function findRows<R extends { label: string; note: string }>(rows: readonly R[], query: string, tr: (s: string) => string = s => s): R[] {
  const words = findWordsOf(query)
  if (words.length === 0) return []
  return rows.filter(r => holds(`${tr(r.label)} ${tr(r.note)}`, words))
}

// The tools that have no slash command of their own: each with its command and one plain line
export const TRY_THESE: readonly { name: string; command: string; about: string }[] = HIDDEN.map(name => ({ name, command: `/vaken-help run ${name}`, about: HIDDEN_ABOUT[name] ?? '' }))

// The words a command may take right after it in a help text
const AFTER_WORDS: readonly string[] = ['off', 'now', 'all', 'why', 'yes']
// The exact commands a text names, in order, each once: "/vaken-help run diet", "/vaken-pause off", "/vaken-undo"
export function commandsIn(text: string, max = 3): string[] {
  const out: string[] = []
  const re = /\/(vaken(?:-[a-z]+)?)\b(?:[ ]+([a-z-]+))?(?:[ ]+([a-z-]+))?/g
  for (let m = re.exec(text); m !== null && out.length < max; m = re.exec(text)) {
    const cmd = m[1] ?? ''
    if (!FRONT_DOOR.includes(cmd)) continue
    const w1 = m[2]
    const w2 = m[3]
    const line =
      cmd === 'vaken-help' && w1 === 'run' && w2 !== undefined && HIDDEN.includes(w2)
        ? `/${cmd} run ${w2}`
        : w1 !== undefined && ((FOLDED[cmd] ?? []).includes(w1) || AFTER_WORDS.includes(w1))
          ? `/${cmd} ${w1}`
          : `/${cmd}`
    if (!out.includes(line)) out.push(line)
  }
  return out
}

// A path that still carries the old name: ~/.claude/cockpit, .claude/cockpit-packet.md and the like
export const showsOldName = (text: string): boolean => /\.claude\/cockpit\b/.test(text)

// What Claude is told with these values: safety notes always, then each row that sends Claude text and is on
export const CLAUDE_GETS_PARTS = {
  safety: 'find.gets_safety',
  plain: 'find.gets_plain',
  habits: 'find.gets_habits',
  prompt: 'find.gets_prompt',
  assume: 'find.gets_assume',
  plan: 'find.gets_plan',
  notes: 'find.gets_notes',
} as const
export function claudeGets(values: Record<string, string>, defaultOf: (key: string) => string | undefined): (keyof typeof CLAUDE_GETS_PARTS)[] {
  const v = (key: string): string | undefined => values[key] ?? defaultOf(key)
  const out: (keyof typeof CLAUDE_GETS_PARTS)[] = ['safety']
  if (v('plain.mode') === 'on') out.push('plain')
  if (HABIT_KEYS.some(k => v(k) === 'on')) out.push('habits')
  if (v('prompt.check') === 'ask') out.push('prompt')
  if (v('assume.check') === 'on') out.push('assume')
  if (v('plan.first') === 'ask') out.push('plan')
  if (v('claude.notes') === 'all') out.push('notes')
  return out
}
