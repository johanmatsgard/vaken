// The plain answers of the memory, today, plan-first, prompt, rule, fresh-start, tasks and quiet commands follow the language of Settings.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { setLang, trFill } from '../hooks/core/lang'
import { errorWords } from '../hooks/core/errors'
import { kindWord, memoryText } from '../hooks/core/memory'
import { todayLines } from '../hooks/core/today'
import { judgePlan, planLine, readPlan } from '../hooks/core/planfirst'
import { explainLast } from '../hooks/core/promptcheck'
import { rulesText } from '../hooks/core/rules'
import { listText } from '../hooks/core/parking'
import { reflectText } from '../hooks/core/reflect'
import { assumptionsText } from '../hooks/core/assumptions'
import { glossaryText } from '../hooks/core/plain'
import { advanceFresh, freshLine, judgeFresh, readFresh } from '../hooks/core/freshstart'
import { newRun, tasksText, throwHoldText } from '../hooks/core/orchestra'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = new Date(2026, 9, 10, 14, 0).getTime()
const MIN = 60_000
const dur = (ms: number): string => `${Math.round(ms / MIN)} min`

// English words that must not be left in a Swedish line (names, paths, commands and numbers are not in this list).
const ENGLISH = /\b(the|and|failed|this session|was|were|with|for you|waits?|yesterday|checked|message|started|tasks?|ideas?|nothing)\b/i

// Built in one language, always back in English
function inLang<T>(lang: string, run: () => T): T {
  setLang(lang)
  try {
    return run()
  } finally {
    setLang('en')
  }
}

test('the error translator says what failed, what it means and what to try in Swedish, and the English is unchanged', () => {
  const last = { at: NOW - 5 * MIN, tool: 'Bash', kind: 'missing-file' }
  const en = errorWords(last, NOW)
  expect(en).toBe('Bash failed 5 min ago.\nWhat it means: A file or folder it needs is not there.\nFirst thing to try: Check the name and the folder. Ask Claude to look for the right path.')
  const sv = inLang('sv', () => errorWords(last, NOW))
  expect(sv).toBe('Bash misslyckades för 5 min sedan.\nVad det betyder: En fil eller mapp som behövs finns inte.\nFörsta sak att prova: Kontrollera namnet och mappen. Be Claude leta upp rätt sökväg.')
  expect(inLang('sv', () => errorWords(undefined, NOW))).toMatch(/^Inget misslyckat steg/)
})

test('memory notes: the kind of a note, the list and the closing hint are Swedish', () => {
  expect(kindWord('feedback')).toBe('how you like to work')
  const sv = inLang('sv', () => [kindWord('feedback'), kindWord(undefined), memoryText([{ name: 'a.md', line: 'Style: short' }], ['a.md'], ['CLAUDE.md'], ['proj'])])
  expect(sv[0]).toBe('hur du vill arbeta')
  expect(sv[1]).toBe('en anteckning')
  expect(sv[2]).toContain('Minnesanteckningar för det här projektet (1):')
  expect(sv[2]).toContain('Instruktionsfiler: CLAUDE.md.')
  expect(sv[2]).toContain('Anteckningsfiler: 1.')
  expect(sv[2]).toContain('/vaken-memory <filnamn>')
  expect(sv[2]).not.toMatch(/\bnotes?\b/i)
})

test('today: the recap lines follow the language, with the sessions that wait and what was done counted in words', () => {
  const facts = { waiting: 2, yesterdayUsd: 4.5, didYesterday: 3 }
  const en = todayLines(facts, true).join('\n')
  expect(en).toMatch(/2 other sessions wait for you\./)
  const sv = inLang('sv', () => todayLines(facts, true).join('\n'))
  expect(sv).toContain('I dag:')
  expect(sv).toContain('2 andra sessioner väntar på dig.')
  expect(sv).toContain('I går kostade det ungefär')
  expect(sv).toContain('Vaken gjorde 3 saker i går.')
  expect(inLang('sv', () => todayLines({ waiting: 0, didYesterday: 0 }, false).join('\n'))).toContain('Sammanfattningen ovanför chattrutan är av.')
})

test('plan first and the fresh-start nudge say their stored reasons in Swedish, a sentence at a time', () => {
  const v = judgePlan({ mode: 'suggest', text: 'build the new login and refactor the old one', edits: 1, now: NOW, state: {} })
  const state = { last: { at: NOW, why: v.why } }
  expect(planLine('suggest', state)).toMatch(/^Plan first: suggest\. The message names 2 big steps\. Few files changed so far \(1\)\./)
  const sv = inLang('sv', () => planLine('suggest', state))
  expect(sv).toBe('Plan först: föreslå. Meddelandet nämner 2 stora steg. Få filer har ändrats hittills (1). En plan föreslogs ovanför chattrutan.')
  expect(inLang('sv', () => planLine('off', readPlan(undefined)))).toMatch(/^Plan först: av\./)
  const words = 'database schema migration rollback strategy versioning pipeline'
  const fresh = advanceFresh(readFresh(undefined), judgeFresh({ mode: 'on', text: words, tokens: 120_000, now: NOW, state: readFresh(undefined) }), NOW)
  expect(freshLine('on', fresh)).toMatch(/^Fresh-start nudge: on\./)
  const svFresh = inLang('sv', () => freshLine('on', fresh))
  expect(svFresh).toMatch(/^Påminnelse om ny session: på\. /)
  expect(ENGLISH.test(svFresh)).toBe(false)
})

test('prompt review, rules, parked ideas, reflection and assumptions answer in Swedish', () => {
  const last = { at: NOW, words: 3, why: 'short' as const, vague: true, mode: 'tip' as const }
  expect(explainLast(last, 'tip')).toMatch(/^Last prompt: 3 words, fewer than 6 words/)
  const prompt = inLang('sv', () => explainLast(last, 'tip'))
  expect(prompt).toBe('Senaste prompten: 3 ord, färre än 6 ord och inget filnamn, ingen sökväg, siffra eller citerad text. Bedömd som vag. Ett tips visades ovanför chattrutan. Claude fick inget veta.')
  const rules = inLang('sv', () => rulesText([{ id: 'pkill', command: 'pkill', text: 't', source: 'CLAUDE.md' }], { pkill: 2 }))
  expect(rules).toContain('Regler som vaken bevakar (1):')
  expect(rules).toContain('pkill: 2 gånger i den här sessionen (CLAUDE.md)')
  expect(inLang('sv', () => listText([{ at: NOW - 2 * MIN, text: 'Try the dark theme' }], NOW))).toContain('Parkerade idéer (1):')
  expect(inLang('sv', () => listText([], NOW))).toContain('Idéparkeringen är tom.')
  expect(inLang('sv', () => reflectText([{ label: 'tests were weakened', count: 2, rule: 'Never skip a test.' }]))).toMatch(/2x tester försvagades[\s\S]*Never skip a test\./)
  expect(inLang('sv', () => assumptionsText({ at: NOW - 3 * MIN, count: 2, lines: ['Assumed: a', 'Assumed: b'] }, true, NOW))).toMatch(/^Claude listade 2 antaganden för 3 min sedan:/)
  expect(inLang('sv', () => glossaryText())).toContain('Arbetsträd: En andra kopia av en projektmapp')
})

test('the task list and the held throw-away say themselves in Swedish', () => {
  const run = newRun(['Fix the header', 'Write the notes (researcher)'], NOW)
  const en = tasksText(run, undefined, NOW, dur)
  expect(en).toContain('Choices: auto at once')
  expect(en).toContain('Steer (N is a task number):')
  const sv = inLang('sv', () => tasksText(run, undefined, NOW, dur))
  expect(sv).toContain('Val: auto åt gången')
  expect(sv).toContain('Styr (N är ett uppgiftsnummer):')
  expect(sv).toContain('/vaken-tasks add <uppgift>: lägger till en uppgift i körningen.')
  expect(sv).toMatch(/1\. Väntar: Fix the header/)
  expect(inLang('sv', () => tasksText(undefined, undefined, NOW, dur))).toMatch(/^Ingen uppgiftslista ännu\./)
  const held = inLang('sv', () => throwHoldText(2, 3, 1))
  expect(held).toMatch(/^Inte kastat: uppgift 2 innehåller 3 commits som grenen du står på inte har och 1 ändrad fil som inte är committad\./)
  expect(throwHoldText(2, 3, 1)).toMatch(/^Not thrown away: task 2 holds 3 commits/)
  expect(trFill('waits: Claude was asked 3 times and did not start it. Go on asks again.')).toBe('waits: Claude was asked 3 times and did not start it. Go on asks again.')
  expect(inLang('sv', () => trFill('waits: Claude was asked 3 times and did not start it. Go on asks again.'))).toBe('väntar: Claude blev ombedd 3 gånger och startade den inte. Fortsätt frågar igen.')
})

function memStore(on: On, seed: Record<string, unknown>): void {
  const mem = new Map<string, unknown>(Object.entries(seed))
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
}

test('/vaken-memory reflect answers in Swedish when Settings says so, and in English when it does not', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on, { 'cockpit:setting:look.language': 'sv' })
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  try {
    const r = (await $.command.run(viaParent('vaken-reflect', '') as never)) as { text: string }
    expect(r.text).toMatch(/Inget gick fel som vaken såg i dag/)
  } finally {
    setLang('en')
  }
})

test('/vaken-memory reflect answers in English with the default language', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on, {})
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const r = (await $.command.run(viaParent('vaken-reflect', '') as never)) as { text: string }
  expect(r.text).toMatch(/Nothing went wrong that vaken saw today/)
})
