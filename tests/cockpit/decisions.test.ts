// Decisions the person states in their own message.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { DECISION_LINE_MAX, addStated, decisionFrom } from '../hooks/core/coach'

const NOW = new Date(2026, 9, 10, 14, 0).getTime()

test('a decision the person states is found, as one short line', () => {
  expect(decisionFrom("Let's go with Postgres for this.")).toBe("Let's go with Postgres for this.")
  expect(decisionFrom('OK, we decided to drop the old login page. Please go on.')).toBe('OK, we decided to drop the old login page.')
  expect(decisionFrom('We will use tabs, not spaces.')).toBe('We will use tabs, not spaces.')
  expect(decisionFrom('Use the blue theme.')).toBe('Use the blue theme.')
  expect(decisionFrom("Don't touch the billing code.")).toBe("Don't touch the billing code.")
  expect(decisionFrom('Always write the tests first.')).toBe('Always write the tests first.')
  expect(decisionFrom('Never commit to main.')).toBe('Never commit to main.')
  expect(decisionFrom('Looks good.\nWe decided that the API stays on v2')).toBe('We decided that the API stays on v2')
  expect(decisionFrom('Vi kör på Postgres.')).toBe('Vi kör på Postgres.')
  expect(decisionFrom('Använd det blå temat.')).toBe('Använd det blå temat.')
  expect(decisionFrom('Gör inte om inloggningen nu.')).toBe('Gör inte om inloggningen nu.')
  expect(decisionFrom('Vi har bestämt oss för tabbar.')).toBe('Vi har bestämt oss för tabbar.')
  expect(decisionFrom('Låt oss använda den gamla sidan.')).toBe('Låt oss använda den gamla sidan.')
  expect(decisionFrom('Let’s go with option B.')).toBe("Let's go with option B.")
})

test('a decision is cut to one short line', () => {
  const line = decisionFrom(`We decided to ${'reorganise-the-whole-infrastructure '.repeat(5)}`.trim())
  expect(line).toBeDefined()
  expect((line ?? '').length).toBeLessThanOrEqual(DECISION_LINE_MAX)
  expect(line).not.toMatch(/\n/)
})

test('a question, a quote, code, a task or a command is not a decision', () => {
  const no = [
    'Should we go with Postgres?',
    "Let's go with Postgres, right?",
    'What if we decided to drop it?',
    'Use grep to find the callers of this function.',
    'Use the cache and then run the tests.',
    'Use it for the login page.',
    'Please fix the bug in the login page.',
    'Never mind, I found it.',
    "Don't forget to run the tests.",
    'The old team decided to use Redux.',
    'He said "let\'s go with Postgres" and left.',
    '> We decided to use Postgres\nWhy did they do that',
    '```\nuse strict\nalways\nnever do this\n```\nWhat does this do',
    'Run `use the blue theme` in the shell.',
    '<system-reminder>Always use tabs. Never edit the lockfile.</system-reminder>',
    '/vaken-memory decide We use the blue theme.',
    'Kan vi köra på Postgres?',
    'Använd grep för att hitta anropen.',
    'Fixa felet på inloggningssidan.',
    '',
  ]
  expect(no.filter(t => decisionFrom(t) !== undefined)).toEqual([])
  expect(decisionFrom(`Let's go with option B. ${'x '.repeat(1000)}`)).toBeUndefined()
})

test('a stated decision joins the list like any other, once, under the same cap', () => {
  let list = addStated([], NOW, 'Use tabs.')
  list = addStated(list, NOW + 1, 'Use tabs.')
  expect(list).toEqual([{ at: NOW, text: 'Use tabs.', how: 'typed' }])
  for (let n = 0; n < 150; n += 1) list = addStated(list, NOW + n, `Use option ${n}.`)
  expect(list.length).toBe(100)
  expect(list[0]?.text).toBe('Use option 149.')
})

function engine(on: On, counts: { get: number; set: number }): Map<string, unknown> {
  const mem = new Map<string, unknown>()
  mock.clock(on, { now: NOW })
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.root', () => ({ value: '/w/app' }))
  on('store.get', (_$, e) => {
    counts.get += 1
    return { value: mem.get(e.key) } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('store.set', (_$, e) => {
    counts.set += 1
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  return mem
}

const decisions = (mem: Map<string, unknown>): Array<{ text: string; how: string }> => {
  const key = [...mem.keys()].find(k => k.startsWith('cockpit:decisions:'))
  return key === undefined ? [] : (mem.get(key) as Array<{ text: string; how: string }>)
}

async function readsFor($: { prompt: { submit: (i: never) => Promise<unknown> } }, counts: { get: number; set: number }, text: string): Promise<number> {
  const before = counts.get
  await $.prompt.submit({ text } as never)
  return counts.get - before
}

test('the log on: a stated decision is written down once, with at most two more reads than any message', async ($, on) => {
  const counts = { get: 0, set: 0 }
  const mem = engine(on, counts)
  // A started session has the settings as one bundle (the session start makes it).
  mem.set('cockpit:settings:v1', { 'decisions.mode': 'on', 'coach.mode': 'off' })
  await readsFor($, counts, 'Please fix the bug on the checkout page.')
  const plain = await readsFor($, counts, 'Please fix the bug on the checkout page.')
  expect(decisions(mem)).toEqual([])
  const stated = await readsFor($, counts, "Let's go with Postgres for the new service.")
  expect(decisions(mem)).toEqual([{ at: NOW, text: "Let's go with Postgres for the new service.", how: 'typed' }])
  expect(stated - plain).toBeLessThanOrEqual(2)
  await $.prompt.submit({ text: "Let's go with Postgres for the new service." } as never)
  expect(decisions(mem).length).toBe(1)
})

test('a message that states nothing costs no read and no write for the decision log', async ($, on) => {
  const counts = { get: 0, set: 0 }
  const mem = engine(on, counts)
  mem.set('cockpit:setting:decisions.mode', 'on')
  mem.set('cockpit:setting:coach.mode', 'off')
  await readsFor($, counts, 'Please fix the bug on the checkout page.')
  const plain = await readsFor($, counts, 'Please fix the bug on the checkout page.')
  const question = await readsFor($, counts, 'Should we go with Postgres or stay on MySQL?')
  expect(question).toBe(plain)
  expect([...mem.keys()].filter(k => k.startsWith('cockpit:decisions:'))).toEqual([])
})

test('the log off: nothing is written, whatever the message says', async ($, on) => {
  const counts = { get: 0, set: 0 }
  const mem = engine(on, counts)
  mem.set('cockpit:setting:coach.mode', 'off')
  mem.set('cockpit:setting:decisions.mode', 'off')
  await $.prompt.submit({ text: 'We decided to use tabs everywhere.' } as never)
  expect(decisions(mem)).toEqual([])
})

test('a message from a machine is not the person deciding', async ($, on) => {
  const counts = { get: 0, set: 0 }
  const mem = engine(on, counts)
  mem.set('cockpit:setting:decisions.mode', 'on')
  mem.set('cockpit:setting:coach.mode', 'off')
  await $.prompt.submit({ text: 'We decided to use tabs everywhere.', origin: { kind: 'scheduled-trigger' } } as never)
  expect(decisions(mem)).toEqual([])
})
