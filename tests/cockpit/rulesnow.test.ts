// Rules in force: the Memory and notes card names the instruction files and allow rules that apply now, a file that changed
// mid-session, and a rule both allowed and denied. Names and counts only.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import { changedName, clashesOf, forgetSizes, noteChanged, noteFile, rulesFrom, rulesMem, sizesChanged } from '../hooks/core/allowrules'
import type { RulesNow } from '../hooks/core/allowrules'
import { contextCardText, contextView } from '../hooks/core/contextcard'
import type { ContextFacts } from '../hooks/core/contextcard'
import { RULES_LIST_MAX, rulesRows } from '../hooks/core/rulesrows'
import type { RulesFacts } from '../hooks/core/rulesrows'
import { forgetContext, rulesFactsOf } from '../hooks/features/home/context'
import { forgetProjectSet } from '../hooks/core/io'
import { BASE_SEEDS, HOME, NOW, SETUP_BASE, engine, propsAt, textsOf } from './statefixtures'
import type { Pane, World } from './statefixtures'

const id = (s: string): string => s
const fresh = (): RulesNow => ({ allow: [], deny: [], files: [], changed: [], read: false })

test('every source\'s allow and deny rules, each once; anything else is ignored; a secret in a rule is hidden', () => {
  const key = ['sk', 'ant', 'api03', 'b'.repeat(28)].join('-')
  const r = rulesFrom([{ permissions: { allow: ['Bash(npm test:*)', 'Read'], deny: ['Bash(rm:*)'] } }, {}, undefined, { permissions: { allow: ['Read', 7, '', `Bash(curl -H ${key})`] } }])
  expect(r.allow.slice(0, 2)).toEqual(['Bash(npm test:*)', 'Read'])
  expect(r.allow).toHaveLength(3)
  expect(r.allow[2].includes(key)).toBe(false)
  expect(r.deny).toEqual(['Bash(rm:*)'])
})

test('a rule allowed and denied is a clash, the old and new prefix forms the same rule', () => {
  expect(clashesOf(['Bash(npm test:*)', 'Read', 'Bash(git push *)'], ['Bash(npm test *)', 'Bash(git push:*)', 'Write'])).toEqual(['Bash(npm test:*)', 'Bash(git push *)'])
  expect(clashesOf(['Read'], ['Write'])).toEqual([])
})

test('instruction files are named once with their tier; a change names its file, newest first', () => {
  const m = fresh()
  noteFile(m, '/work/app/CLAUDE.md', 'Project')
  noteFile(m, '/work/app/CLAUDE.md', 'Project')
  noteFile(m, '/home/me/.claude/CLAUDE.md', 'User')
  expect(m.files).toEqual([{ name: 'app/CLAUDE.md', kind: 'project' }, { name: '.claude/CLAUDE.md', kind: 'user' }])
  noteChanged(m, changedName('/work/app/.claude/settings.json', 'project_settings'), 1)
  noteChanged(m, changedName(undefined, 'user_settings'), 2)
  noteChanged(m, changedName(undefined, 'skills'), 3)
  expect(m.changed.map(c => c.name)).toEqual(['skills', 'user settings', '.claude/settings.json'])
})

test('an instruction file whose size changed is said once per change', () => {
  forgetSizes()
  const f = { path: '/w/CLAUDE.md', chars: 100, lines: 5 }
  expect(sizesChanged([f])).toEqual([])
  expect(sizesChanged([f])).toEqual([])
  expect(sizesChanged([{ ...f, chars: 120 }])).toEqual(['w/CLAUDE.md'])
  expect(sizesChanged([{ ...f, chars: 120 }])).toEqual([])
  forgetSizes()
})

const facts = (over: Partial<RulesFacts> = {}): RulesFacts => ({ files: ['app/CLAUDE.md', '.claude/CLAUDE.md'], fileCount: 2, allow: ['Read', 'Bash(npm test:*)'], deny: ['Bash(rm:*)'], read: true, changed: [], clash: [], ...over })

test('the rules row says the counts, its What is this names the files and rules; the calm warnings name the file and the rule', () => {
  const rows = rulesRows(facts(), id)
  expect(rows).toHaveLength(1)
  expect(rows[0].title).toBe('Rules in force')
  expect(rows[0].right).toBe('2 files · 2 allow rules')
  expect(rows[0].what.facts).toEqual(['Instruction files: app/CLAUDE.md, .claude/CLAUDE.md', 'Allow: Read, Bash(npm test:*)', 'Deny: Bash(rm:*)'])
  const many = rulesRows(facts({ allow: Array.from({ length: 11 }, (_, n) => `R${n}`) }), id)[0]
  expect(many.what.facts?.[1]).toBe(`Allow: ${Array.from({ length: RULES_LIST_MAX }, (_, n) => `R${n}`).join(', ')} +3`)
  const warn = rulesRows(facts({ changed: ['app/CLAUDE.md'], clash: ['Bash(npm test:*)', 'Read'] }), id)
  // The labels stay whole; the names are the value
  expect(warn.map(r => [r.title, r.right])).toEqual([['Rules in force', '2 files · 2 allow rules'], ['Changed this session', 'app/CLAUDE.md'], ['Allowed and denied at once', 'Bash(npm test:*) +1']])
  expect(rulesRows(facts({ files: [], fileCount: 1, read: false }), id)[0].right).toBe('1 file')
  expect(rulesRows(facts({ files: [], fileCount: 0, read: false }), id)).toEqual([])
  expect(rulesRows(undefined, id)).toEqual([])
})

test('the rows stand in the Instructions group, even with no instruction file, and in the text twin', () => {
  const f: ContextFacts = { brief: { on: true, work: false, unverified: 0 }, keep: { files: 0 }, rules: facts({ files: [], fileCount: 0, clash: ['Read'] }) }
  const v = contextView(f, id, 'en')
  expect(v.groups[0].head).toBe('Instructions')
  expect(v.groups[0].rows.map(r => r.key)).toEqual(['rules', 'rules-clash'])
  expect(contextCardText(f)).toContain('Rules in force: 2 allow rules')
  expect(contextCardText(f)).toContain('Allowed and denied at once: Read')
  // No rules facts: the card is as before
  expect(contextView({ ...f, rules: undefined }, id, 'en').groups.map(g => g.head)).toEqual(['Handoff'])
})

test('the pane reads the rules from memory; nothing shows before anything was read', () => {
  const was = { ...rulesMem }
  Object.assign(rulesMem, fresh())
  expect(rulesFactsOf(3)).toBeUndefined()
  Object.assign(rulesMem, { read: true, allow: ['Read'], deny: ['Read'] })
  expect(rulesFactsOf(3)).toEqual({ files: [], fileCount: 3, allow: ['Read'], deny: ['Read'], read: true, changed: [], clash: ['Read'] })
  Object.assign(rulesMem, was)
})

// Through the engine: the settings are read, Claude Code's own events name the files and a change; the card shows it all
test('the classic events reach the card: files loaded, rules read again after a settings change, a clash', { timeoutMs: 60_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  engine(on, w)
  const project = { permissions: { allow: ['Bash(npm test:*)', 'Read'], deny: ['Bash(npm test *)'] } }
  on('settings.read', (_$, e) => ({ value: (e as { source?: string }).source === 'project' ? project : {} }) as never)
  on('classic.InstructionsLoaded', () => ({}) as never)
  on('classic.ConfigChange', () => ({}) as never)
  const base = { session_id: 'test-session', transcript_path: '', cwd: '/work/app' }
  await $.classic.InstructionsLoaded({ ...base, hook_event_name: 'InstructionsLoaded', file_path: '/work/app/CLAUDE.md', memory_type: 'Project', load_reason: 'session_start' } as never)
  await $.classic.ConfigChange({ ...base, hook_event_name: 'ConfigChange', source: 'project_settings', file_path: '/work/app/.claude/settings.json' } as never)
  forgetProjectSet()
  forgetContext()
  const ui = (await ($ as unknown as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(420) })) as Pane
  await ui.redraw()
  await ui.press({ key: 'detail-context' })
  await ui.redraw()
  const texts = textsOf(await ui.drawn())
  for (const t of ['Rules in force', '1 file · 2 allow rules', 'Changed this session', '.claude/settings.json', 'Allowed and denied at once', 'Bash(npm test:*)']) expect(texts).toContain(t)
  await ui.unmount()
})
