// Starter agents: a cheap lookup helper and a reviewer written to ~/.claude/agents/ when missing.
import { under } from './platform'
import { tr } from '../i18n/t'
import { fillIn } from './fillin'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'

export const STARTERS_SETTINGS: Setting[] = []
export const STARTERS_HELP: HelpEntry[] = [
  { title: 'What the two ready-made agents are', text: 'Two ready agents: a cheap one that looks things up, and a stronger one that reviews a change. /vaken-tasks agents shows them. /vaken-tasks agents make yes saves them in your agents folder and never overwrites a file.' },
]

export const STARTERS_WHAT = 'Wrote starter agents'

export type Starter = { name: string; model: string; blurb: string; text: string }

// en-only: an agent file written for Claude
const LOOKUP = `---
name: vaken-lookup
description: Finds files, code and facts in the project and answers in 10 lines or fewer. Cheap and read-only. Use it for a quick "where is X" or "what does Y do" before you read many files yourself.
model: haiku
tools: Read, Grep, Glob
---

You are a quick lookup helper. You only read. You never change a file.

1. Search with Glob and Grep. Read only the parts you need.
2. Put the answer first.
3. Give file paths with line numbers.
4. Keep the whole answer to 10 lines or fewer.
5. If you did not find it, say so. Do not guess.
`

// en-only: an agent file written for Claude
const REVIEWER = `---
name: vaken-reviewer
description: Reviews a change (a diff) for bugs and risks and ranks what it finds. Reads only, never edits. Use it before you commit or open a pull request.
model: sonnet
tools: Read, Grep, Glob, Bash
---

You review a change for bugs and risks. You never edit a file.

1. Get the change: git diff, git diff --staged, or the range you were given.
2. Use Bash only to read: git diff, git log, git show, git status, ls, cat. Never run a command that writes, installs, deletes or sends.
3. Read the changed code and the code around it.
4. List what you found, ranked: High (wrong result, lost data, security), Medium, Low.
5. For each finding: the file and line, what is wrong, why it matters, and a fix in one sentence.
6. Say what you did not check, such as tests you did not run.

If you find nothing, say "No problems found" and say what you checked.
`

export const STARTERS: Starter[] = [
  { name: 'vaken-lookup', model: 'haiku', blurb: 'finds files and facts, answers in 10 lines, reads only', text: LOOKUP },
  { name: 'vaken-reviewer', model: 'sonnet', blurb: 'reviews a change for bugs and risks, ranked, no edits', text: REVIEWER },
]

const agentsDir = (home: string): string => under(home, '.claude/agents')
// A file with an older name counts as the starter, so a second one is never written.
export const LEGACY_STARTER: Record<string, string> = { 'vaken-lookup': 'cockpit-lookup', 'vaken-reviewer': 'cockpit-reviewer' }
export const agentPath = (home: string, name: string): string => under(agentsDir(home), `${name}.md`)

export function planStarters(existing: ReadonlySet<string>): { write: Starter[]; skip: Starter[] } {
  return { write: STARTERS.filter(s => !existing.has(s.name)), skip: STARTERS.filter(s => existing.has(s.name)) }
}

const nameList = (list: Starter[]): string => list.map(s => s.name).join(', ')

export function startersPreview(home: string, existing: ReadonlySet<string>): string {
  const { write, skip } = planStarters(existing)
  return [
    fillIn(tr('Two starter agents for {dir}:'), { dir: agentsDir(home) }),
    ...STARTERS.map(s => `  ${fillIn(tr('{name} (model {model}): {blurb}.'), { name: s.name, model: s.model, blurb: tr(s.blurb) })}${existing.has(s.name) ? ` ${tr('Already there.')}` : ''}`),
    '',
    write.length === 0 ? tr('Both files are already there. Nothing to write.') : fillIn(tr('To write {list}: /vaken-tasks agents make yes'), { list: nameList(write) }),
    ...(skip.length === 0 ? [] : [fillIn(tr('{list} stays as it is: vaken never overwrites a file.'), { list: nameList(skip) })]),
  ].join('\n')
}

export function startersResult(home: string, wrote: Starter[], skipped: Starter[], failed: { name: string; why: string }[]): string {
  return [
    wrote.length === 0 ? tr('Wrote nothing.') : fillIn(tr('Wrote {list} in {dir}.'), { list: nameList(wrote), dir: agentsDir(home) }),
    ...(skipped.length === 0 ? [] : [fillIn(tr('Skipped {list}: the file already exists, and vaken never overwrites a file.'), { list: nameList(skipped) })]),
    ...failed.map(f => fillIn(tr('Could not write {name}: {why}'), { name: f.name, why: tr(f.why) })),
    ...(wrote.length === 0 ? [] : [tr('Claude finds them in a new session.')]),
  ].join('\n')
}
