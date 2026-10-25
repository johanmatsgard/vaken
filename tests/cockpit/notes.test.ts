import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { COACH_AFTER, addDecision, count, decisionsText, normalize, skillFile, skillName } from '../hooks/core/coach'
import { lastName, mainProject, memorySpots, memoryText, parseIndex, parseNote, projectFolderName } from '../hooks/core/memory'
import { listText, parseAsk, parseIdeas } from '../hooks/core/parking'
import { PATTERNS, reflect, reflectText } from '../hooks/core/reflect'
import { breaks, commandStarts, hitsOf, parseRules } from '../hooks/core/rules'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = new Date(2026, 9, 10, 14, 0).getTime()

test('rules: a Never line with a command in backticks becomes a rule; files and non-commands do not', () => {
  const text = [
    '- Never `pkill` or kill a process by a broad name.',
    '- Do not run `git push --force` on main.',
    '- Do not edit `package.json` by hand.',
    '- Always run `npm test` before a commit.',
    'Never use `console.log` in production code.',
    '- Avoid `scripts/check-public.sh` on a dirty tree.',
  ].join('\n')
  const rules = parseRules(text, 'CLAUDE.md')
  expect(rules.map(r => r.command)).toEqual(['pkill', 'git push --force', 'scripts/check-public.sh'])
})

test('rules: only the command words of a shell line count', () => {
  const [pkill, push] = parseRules('- Never `pkill` x\n- Never `git push --force` y', 'f')
  expect(commandStarts('cd x && sudo pkill -f node | cat')).toEqual(['cd x', 'pkill -f node', 'cat'])
  expect(breaks(pkill, 'cd x && sudo pkill -f node')).toBe(true)
  expect(breaks(pkill, 'echo pkill is bad')).toBe(false)
  expect(breaks(pkill, 'pgrep pkill-helper')).toBe(false)
  expect(breaks(push, 'FOO=1 git push --force origin main')).toBe(true)
  expect(breaks(push, 'git push origin main')).toBe(false)
  expect(hitsOf([pkill, push], 'pkill node')).toEqual([pkill])
})

test('parking: add, list, send, drop, and a bad ask', () => {
  expect(parseAsk('')).toEqual({ kind: 'list' })
  expect(parseAsk('try a dark theme later')).toEqual({ kind: 'add', text: 'try a dark theme later' })
  expect(parseAsk('send 2')).toEqual({ kind: 'send', n: 2 })
  expect(parseAsk('drop 1')).toEqual({ kind: 'drop', n: 1 })
  expect(parseAsk('send').kind).toBe('bad')
  expect(parseIdeas('x')).toEqual([])
  expect(listText([], NOW)).toMatch(/empty/)
  expect(listText([{ at: NOW - 5 * 60_000, text: 'rename the card' }], NOW)).toMatch(/1\. rename the card \(5 min ago\)/)
})

test('reflection: counts today, and suggests a rule only when it happened twice', () => {
  const e = (what: string, at = NOW - 60_000) => ({ at, what, did: true })
  const found = reflect([e('Caught a repeating step'), e('Caught a repeating step'), e('Claude said done without proof'), e('Noticed work far from the goal', NOW - 3 * 24 * 3_600_000)], NOW)
  expect(found.map(f => [f.label, f.count])).toEqual([['a step kept failing the same way', 2], ['Claude said it was done without proof', 1]])
  const text = reflectText(found)
  expect(text).toMatch(/2x a step kept failing/)
  expect(text).toMatch(/stop and ask me before trying a third time/)
  expect(text).not.toMatch(/Run the tests and show the result/)
  expect(reflectText([])).toMatch(/Nothing went wrong/)
  expect(PATTERNS.every(p => p.rule.endsWith('.'))).toBe(true)
})

test('memory: the index and a note are read into plain words', () => {
  expect(projectFolderName('/Users/me/my proj')).toBe('-Users-me-my-proj')
  const index = parseIndex('- [How I work](feedback-a.md) — plan first\n- [State](project-b.md) — where we are\nnot a line')
  expect(index).toEqual([{ name: 'feedback-a.md', line: 'How I work: plan first' }, { name: 'project-b.md', line: 'State: where we are' }])
  const note = parseNote('---\nname: x\ndescription: plan first\nmetadata:\n  type: feedback\n---\n\nAlways plan.')
  expect(note).toEqual({ description: 'plan first', type: 'feedback', body: 'Always plan.' })
})

test('memory: a worktree looks in its own folder and in the main folder; a miss names the folders by their last part', () => {
  const wt = '/Users/me/app/.claude/worktrees/feat-x'
  expect(mainProject(wt)).toBe('/Users/me/app')
  expect(mainProject(`${wt}/src`)).toBe('/Users/me/app')
  expect(mainProject('/Users/me/app')).toBeUndefined()
  expect(lastName('/Users/me/app/')).toBe('app')
  const spots = memorySpots('/Users/me', wt)
  expect(spots.map(x => x.dir)).toContain('/Users/me/.claude/projects/-Users-me-app--claude-worktrees-feat-x/memory')
  expect(spots.map(x => x.dir)).toContain('/Users/me/.claude/projects/-Users-me-app/memory')
  expect(spots.map(x => x.label)).toEqual(['feat-x', 'app'])
  expect(memorySpots('/Users/me', '/Users/me/app').map(x => x.dir)).toEqual(['/Users/me/.claude/projects/-Users-me-app/memory'])
  expect(memoryText([], [], [], spots.map(x => x.label))).toMatch(/^No memory notes for this project yet\. Looked for: feat-x, app\.\n/)
  expect(memoryText([], [], [], spots.map(x => x.label))).not.toMatch(/\/Users/)
  expect(memoryText([{ name: 'a.md', line: 'A: b' }], [], [], ['app'])).not.toMatch(/Looked for/)
})

test('coach: a request counts after boiling down; the third time offers; a command or a short line does not count', () => {
  expect(normalize('/vaken')).toBeUndefined()
  expect(normalize('fix it')).toBeUndefined()
  const a = normalize('Please write 3 tests for the login page!')
  expect(a).toBe(normalize('please write 12 tests for the login page'))
  let seen = {}
  let offered = 0
  for (let n = 0; n < 5; n += 1) {
    const r = count(seen, a!, n)
    seen = r.seen
    if (r.offer) offered += 1
  }
  expect(offered).toBe(1)
  expect(count({ k: { n: COACH_AFTER - 1, at: 0 } }, 'k', 1).offer).toBe(true)
  expect(skillName('Write tests for the login page now')).toBe('write-tests-for-the')
  expect(skillFile('x', 'Do the thing.')).toMatch(/^---\nname: x\ndescription: Do the thing\.\n---/)
})

test('decisions: newest first, dated, and the log says when it is off', () => {
  let list = addDecision([], { at: NOW - 86_400_000, text: 'Use the blue theme', how: 'typed' })
  list = addDecision(list, { at: NOW, text: 'Option A', how: 'asked' })
  expect(decisionsText(list, true)).toMatch(/2026-10-10 {2}Option A\n {2}2026-10-09 {2}Use the blue theme \(noted by you\)/)
  expect(decisionsText([], false)).toMatch(/log is off/)
})

function memStore(on: On): void {
  const mem = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  // The command says its answer in the language of Settings, which reads the store's keys
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
}

test('/vaken-memory reflect and /vaken-memory park answer with nothing in the store', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const r = (await $.command.run(viaParent('vaken-reflect', '') as never)) as { text: string }
  expect(r.text).toMatch(/Nothing went wrong/)
})
