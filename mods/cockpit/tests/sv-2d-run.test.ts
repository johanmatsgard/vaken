// Step 2d, the task run and the system words: the morning report, an open task, the Windows twins of the Mac-only lines.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { setLang, tr, trFill } from '../hooks/core/lang'
import { DEFAULT_CHOICES, newTask, taskDetail, taskFacts } from '../hooks/core/orchestra'
import type { Run, Task } from '../hooks/core/orchestra'
import { reportHead, reportOf, reportWhen, taskLineFacts, taskLineWord } from '../hooks/core/overnight'
import { setWordSystem } from '../hooks/core/syswords'
import { showText } from '../hooks/core/phonedo'
import type { DoBlock } from '../hooks/core/phonedo'
import { switchWarning } from '../hooks/core/route'

const NOW = new Date(2026, 9, 10, 14, 0).getTime()
const task = (n: number, over: Partial<Task> = {}): Task => ({ ...newTask({ n, text: `Fix ${n}`, role: 'builder', model: 'auto', folder: true }), ...over })
const runOf = (tasks: Task[], over: Partial<Run> = {}): Run => ({ id: 'r1', name: 'Nightly', status: 'done', createdAt: NOW - 60 * 60_000, startedAt: NOW - 50 * 60_000, tasks, choices: DEFAULT_CHOICES, ...over })
const sv = <T>(f: (t: (s: string) => string) => T): T => {
  setLang('sv')
  const out = f(trFill)
  setLang('en')
  return out
}

test('the morning report says its head, its time, each state and each fact in Swedish; in English nothing changed', () => {
  const tasks = [
    task(1, { state: 'done', check: 'passed', usd: 0.4, kept: 'kept' }),
    task(2, { state: 'failed', usd: 0.8, why: 'you stopped the run', kept: 'thrown' }),
    task(3, { state: 'waiting', why: 'waits: the plan limit stopped it' }),
    task(4, { state: 'running' }),
  ]
  const rep = reportOf(runOf(tasks, { status: 'stopped' }), NOW)
  expect(reportHead(rep)).toBe('1 done, 1 failed, 2 stopped or not run · about $1.20')
  expect(sv(t => reportHead(rep, t))).toBe('1 klara, 1 misslyckades, 2 stoppade eller inte körda · ungefär 1,20 USD')
  expect(reportWhen(rep, NOW)).toBe('Stopped 14:00')
  expect(sv(t => reportWhen(rep, NOW + 3 * 24 * 3_600_000, t))).toBe('Stoppat 10 okt, 14:00')
  const words = rep.tasks.map(l => sv(t => taskLineWord(l, t)))
  expect(words).toEqual(['kontrollerad', 'misslyckades', 'inte körd', 'pågår fortfarande'])
  const facts = rep.tasks.flatMap(l => sv(t => taskLineFacts(l, t)))
  expect(facts).toContain('Resultat: misslyckades (du stoppade körningen).')
  expect(facts).toContain('Resultat: inte körd (väntar: planens gräns stoppade den).')
  expect(facts).toContain('Dess gren sparas för din granskning.')
  expect(facts).toContain('Kostnad: ungefär 0,40 USD.')
  expect(taskLineFacts(rep.tasks[0] as never)).toContain('Cost: about $0.40.')
})

test('an open task of the Agents card says its facts and detail in Swedish', () => {
  const t = task(2, { state: 'done', check: 'failed', checkLine: 'exit 1', review: 'done', reviewLines: ['Good enough.', 'The main risk is small.'], why: 'task 1 did not pass', usd: 0.25, path: '/w/copy', branch: 'x', kept: 'kept', tries: 2, ran: 'sonnet', upFrom: 'haiku', after: 1 })
  const en = taskFacts(t)
  expect(en).toContain('Role: Builder, model auto (ran on sonnet), try 2, one model up from haiku after a failure')
  expect(en).toContain('Folder copy: /w/copy (branch x), kept')
  expect(en).toContain('Check: failed (exit 1)')
  expect(en).toContain('Review: Good enough.')
  expect(en).toContain('Why: task 1 did not pass')
  expect(en).toContain('Cost: about $0.25 (estimate)')
  const swedish = sv(tt => taskFacts(t, tt))
  expect(swedish).toContain('Roll: Byggare, modell auto (körde på sonnet), försök 2, en modell upp från haiku efter ett fel')
  expect(swedish).toContain('Mappkopia: /w/copy (gren x), sparad')
  expect(swedish).toContain('Kontroll: misslyckades (exit 1)')
  expect(swedish).toContain('Granskning: Good enough.')
  expect(swedish).toContain('Varför: uppgift 1 klarade inte kontrollen')
  expect(swedish).toContain('Kostnad: ungefär 0,25 USD (uppskattning)')
  setLang('sv')
  const d = taskDetail(t, NOW, () => '5 min', {}, tr)
  setLang('en')
  expect(d).toMatch(/^Byggare · auto \(/)
  expect(d).toContain('upp från haiku')
  expect(d).toContain('efter 1')
  expect(d).toContain('arbetade i en kopia av dina filer')
  expect(taskDetail(t, NOW, () => '5 min')).toContain('up from haiku · after 1 · worked in a copy of your files')
})

test('the Windows twins of the Mac-only lines have Swedish rows: a PC in Swedish reads no English', () => {
  const mac = [
    'An agent was working, a phone was connected, or a question waited, so vaken kept your Mac awake.',
    'A sleeping Mac stops the work.',
    '/vaken-help run awake shows the state. Settings > Agents > Keep Mac awake turns it off.',
    'Vaken had kept your Mac awake for 8 hours in a row, which is the most it allows. It let the Mac sleep.',
    'A Mac that never sleeps wears the battery and the screen.',
    'macOS itself reports memory pressure ({p}), even if the share used looks fine, so no new agent should start.',
  ]
  setWordSystem('win32')
  setLang('sv')
  const out = mac.map(l => trFill(l))
  setLang('en')
  const english = mac.map(l => trFill(l))
  setWordSystem('posix')
  for (const l of out) expect(l, l).not.toMatch(/\b(the|and|was|kept|never|sleeps?|reports)\b/)
  expect(out[1]).toBe('En dator som sover stoppar arbetet.')
  expect(out[5]).toContain('Windows själv rapporterar minnestryck')
  expect(english[1]).toBe('A sleeping PC stops the work.')
})

test('the phone: the guard sentence is framed in Swedish; a finding the table knows is said, any other stays as the guard wrote it', () => {
  const b: DoBlock = { n: 1, script: 'rm -rf x', first: 'rm -rf x', verdict: 'risky', why: ['Flagged as risky: Something only the guard says'], outside: false }
  setLang('sv')
  const out = showText(b, tr)
  setLang('en')
  expect(out).toContain('Flaggat som riskabelt: Something only the guard says')
  expect(showText(b, s => s)).toContain('Flagged as risky: Something only the guard says')
})

test('a model switch warning says "about $x" in Swedish', () => {
  setLang('sv')
  const w = switchWarning(250_000, 0.84)
  setLang('en')
  expect(w).toContain('ungefär 0,84 USD')
  expect(w).not.toContain('about')
})
