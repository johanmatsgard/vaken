// The registry contract for every block, checked once.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { FEATURE_HELP, FEATURE_SETTINGS, HELP_TOPICS } from '../hooks/core/registry'
import { SECTIONS, SETTINGS, checkRegistry } from '../hooks/core/settings'
import { listedCardOf } from '../hooks/core/cardhome'

const sentences = (text: string): string[] => text.split(/(?<=\.)\s/)
const LONGER: Record<string, number> = {
  'Keys in the pane': 5,
  'Why the slash menu is short': 5,
  'What the prompt review does': 5,
  'What the answer shape does': 7,
  'How sure is Claude, and what comes first?': 4,
  'What the Computer card does': 4,
  'What the parking lot is': 4,
  'What happens when I hit my plan limit?': 4,
  'Busy ports and extra project folders: what it checks': 4,
  'How does it help me merge and ship?': 5,
  'What Eyes does': 4,
}
const KNOWN_GROUPS = new Set(SECTIONS.flatMap(s => s.groups))

test('every Settings row of every block meets the contract: unique key, short label and note, at least two choices, a default that is a choice', () => {
  expect(checkRegistry(SETTINGS)).toEqual([])
  expect(checkRegistry(FEATURE_SETTINGS)).toEqual([])
})

test('every block row is in the Settings list, has a key of the form area.name, a label and a note, and has a section (its card\'s, or its group\'s)', () => {
  const keys = new Set(SETTINGS.map(s => s.key))
  const problems: string[] = []
  for (const s of FEATURE_SETTINGS) {
    if (!keys.has(s.key)) problems.push(`${s.key}: not in SETTINGS`)
    if (!/^[a-z0-9]+\.[a-z0-9]+$/.test(s.key)) problems.push(`${s.key}: the key is not area.name`)
    if (s.label.trim() === '') problems.push(`${s.key}: no label`)
    if (s.note.trim() === '') problems.push(`${s.key}: no note`)
    if (listedCardOf(s.key) === undefined && !KNOWN_GROUPS.has(s.group)) problems.push(`${s.key}: no card lists it and the group "${s.group}" is in no section`)
  }
  expect(problems).toEqual([])
})

test('every help entry of every block has a title and a text of at most 3 short sentences (a named few are longer), and no title is used twice', () => {
  const problems: string[] = []
  const titles = new Set<string>()
  for (const h of FEATURE_HELP) {
    if (h.title.trim() === '') problems.push('an entry has no title')
    if (titles.has(h.title)) problems.push(`${h.title}: the title is used twice`)
    titles.add(h.title)
    if (h.text.trim() === '') problems.push(`${h.title}: no text`)
    const n = sentences(h.text).length
    if (n > (LONGER[h.title] ?? 3)) problems.push(`${h.title}: ${n} sentences`)
  }
  expect(problems).toEqual([])
})

test('the list of longer help entries names no entry that is short now (an entry that was removed or renamed may stay out)', () => {
  const byTitle = new Map(FEATURE_HELP.map(h => [h.title, h.text]))
  const stale = Object.keys(LONGER).filter(t => {
    const text = byTitle.get(t)
    return text !== undefined && sentences(text).length <= 3
  })
  expect(stale).toEqual([])
})

test('every help entry of every block is in exactly one Help topic', () => {
  const placed = HELP_TOPICS.flatMap(g => g.entries.map(h => h.title))
  expect(placed.filter((t, n) => placed.indexOf(t) !== n)).toEqual([])
  expect(FEATURE_HELP.map(h => h.title).filter(t => !placed.includes(t))).toEqual([])
  expect(placed.filter(t => !FEATURE_HELP.some(h => h.title === t))).toEqual([])
})
