// Clear session names: the key words of the first message, never its first four words.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { TITLE_CHARS, keyTitle } from '../hooks/core/titles'

const CASES: [string, string | undefined][] = [
  ['Do these Next, in order: 1. fix the header 2. tidy the footer', 'Fix header'],
  ['Okay, great. How about the band redesign?', 'Band redesign'],
  ['Fix the login bug on the checkout page, please', 'Fix login bug'],
  ['Can you add tests for hooks/core/record.ts', 'Add tests record.ts'],
  ['I want you to review PR 42 and fix the comments', 'Review PR 42'],
  ['hi! please refactor the pane into smaller files', 'Refactor pane smaller files'],
  ['Hey, can you help me write the release notes for 1.24?', 'Write release notes'],
  ["Let's make the Other sessions card sort smarter", 'Make Other sessions card'],
  ['why is the build failing on main?', 'Build failing main'],
  ['Okay thanks. Now update the README with the new commands', 'Update README new commands'],
  ['Could you look at the flaky test in proof.test.ts', 'Flaky test proof.test.ts'],
  ['Great, next: speed round 2 for the hot path', 'Speed round 2'],
  ['Please read docs/HANDOFF.md and tell me where we are', 'Read HANDOFF.md'],
  ['  Add\n a *dark* mode  ', 'Add dark mode'],
  ['<system-reminder>\nSome context here\n</system-reminder>\nFix the login bug on the page', 'Fix login bug'],
  ['Hej! Kan du fixa knappen i inställningar', 'Fixa knappen inställningar'],
  ['so what about the Swedish menus?', 'Swedish menus'],
  ['Merge the model map branch, then run the checks', 'Merge model map branch'],
  ['Go ahead and remove the old worktrees', 'Remove old worktrees'],
  ['L3, sessions (the owner picked these)', 'L3 sessions'],
  ['Thank you! Deploy it to staging now', 'Deploy staging'],
  ["I'd like a summary of yesterday's run", "Summary yesterday's run"],
  ['What does `buildView` do here?', 'BuildView'],
  ['/vaken', undefined],
  ['   ', undefined],
  ['Hi', undefined],
  ['Okay, great. How about', undefined],
  ['Do these Next, in', undefined],
  ['<system-reminder>only context</system-reminder>', undefined],
]

test('a first message gives its key words as the name: no greeting, filler, pronoun or small word, at most four words, the first with a capital', () => {
  const got = CASES.map(([text]) => keyTitle(text))
  expect(got).toEqual(CASES.map(([, want]) => want))
  expect(CASES.length).toBeGreaterThanOrEqual(20)
})

test('a long single word is kept whole (the cap is only a safety)', () => {
  expect(keyTitle('Supercalifragilisticexpialidocious-and-then-some-more-letters')?.length).toBeGreaterThan(32)
})

test('a very long word is within the safety cap, and a name never holds more than four words', () => {
  expect(keyTitle('Supercalifragilisticexpialidocious-and-then-some-more-letters')?.length).toBeLessThanOrEqual(TITLE_CHARS)
  for (const [text] of CASES) expect((keyTitle(text) ?? '').split(' ').filter(Boolean).length).toBeLessThanOrEqual(4)
})

test('a name read again gives the same name, so an old title is mapped on read and a new one stays as it is', () => {
  for (const [text] of CASES) {
    const once = keyTitle(text)
    if (once !== undefined) expect(keyTitle(once)).toBe(once)
  }
  expect(keyTitle('Do these Next, in')).toBeUndefined()
  expect(keyTitle('Fix the login bug')).toBe('Fix login bug')
  expect(keyTitle('Can you add tests')).toBe('Add tests')
})
