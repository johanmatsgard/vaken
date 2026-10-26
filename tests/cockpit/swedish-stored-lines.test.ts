// The lines the pane reads back out of the store (ledger details, a model change's title): stored in English, said in the language of the draw by their shape.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { ledgerHeld, ledgerWarned } from '../hooks/core/budget'
import { keptDetail } from '../hooks/core/cachekeeper'
import { collideDetail } from '../hooks/core/crew'
import { awakeDetail, portDetail } from '../hooks/core/crew3proc'
import { blockedDetail, thrashDetail } from '../hooks/core/loopbreaker'
import { ledgerWord } from '../hooks/core/modelfit'
import { ledgerDetail } from '../hooks/core/neighbors'
import { driftDetail } from '../hooks/core/proof2'
import { restLines, restChecks } from '../hooks/core/compactrest'
import { routedDetail, suggestDetail } from '../hooks/core/route'
import { changeDetail } from '../hooks/core/trust'
import { setLang, tr, trFill } from '../hooks/core/lang'
import { whatIsLines } from '../hooks/core/whatis'

// English words that must not be left in a Swedish line (names, paths and numbers are not in this list).
const ENGLISH = /\b(the|and|failed|times|edited|held|ran|kept|new|because|stopped|went|from|read|tokens from|is used up|already|runs|instead)\b/i

// Built in English (the stored form), then said in Swedish where the pane shows it
function said(build: () => string): { en: string; sv: string } {
  setLang('en')
  const en = build()
  setLang('sv')
  try {
    return { en, sv: trFill(en) }
  } finally {
    setLang('en')
  }
}

const budget = { which: 'session', usd: 4.1, limit: 5, share: 0.82, level: 'warn' } as never
const rival = { name: 'web fixes', sameFile: true, sameFolder: true, ageMs: 4 * 60_000, path: 'a.ts' } as never
const holder = { port: 5173, pid: 1, command: 'node', folder: { name: 'web' }, kind: 'dev' } as never

test('the budget lines of the ledger are said in Swedish with their numbers and the word for the budget', () => {
  const warned = said(() => ledgerWarned(budget))
  expect(warned.en).toMatch(/budget: about/)
  expect(warned.sv).toMatch(/^82 % av budgeten för sessionen: ungefär .* av .* \(uppskattning\)\.$/)
  const held = said(() => ledgerHeld('Agent', budget))
  expect(held.sv).toMatch(/^Stoppade ett Agent-anrop: budgeten för sessionen på .* är slut \(uppskattning\)\.$/)
  expect(ENGLISH.test(`${warned.sv} ${held.sv}`)).toBe(false)
})

test('the cache keeper, a clash with another session and a held port say their ledger detail in Swedish', () => {
  const kept = said(() => keptDetail(90_000, 2))
  expect(kept.sv).toBe('Läste 90k tokens från cachen (2 av 3).')
  const clash = said(() => collideDetail('src/a.ts', rival))
  expect(clash.sv).toMatch(/^src\/a\.ts: ändrad av en annan session \(web fixes\) för 4 minuter sedan\. Ändringen gjordes\.$/)
  const port = said(() => portDetail(holder))
  expect(port.sv).toBe("Port 5173 används av sessionen 'web'. Kommandot kördes.")
  expect(ENGLISH.test(`${kept.sv} ${clash.sv} ${port.sv}`)).toBe(false)
})

test('keeping the computer awake says its ledger line in Swedish, for the session count and for a named reason', () => {
  const work = said(() => awakeDetail(2))
  expect(work.sv).toBe('Höll Macen vaken i 10 minuter, eftersom 2 sessioner arbetar. Det förnyas medan de arbetar.')
  const why = said(() => awakeDetail(0, 'a phone is connected'))
  expect(why.sv).toBe('Höll Macen vaken i 10 minuter: en telefon är ansluten. Det förnyas så länge det gäller.')
  const pc = said(() => awakeDetail(1, undefined, 'win32'))
  expect(pc.sv).toBe('Höll datorn vaken i 10 minuter, eftersom 1 session arbetar. Det förnyas medan de arbetar.')
})

test('the loop breaker, neighbours, drift, routing and plugin updates say their detail in Swedish', () => {
  const lines = [
    said(() => blockedDetail('Bash')).sv,
    said(() => thrashDetail('a.ts', 4, 6)).sv,
    said(() => ledgerDetail(1)).sv,
    said(() => driftDetail({ hasGoal: true, edits: 5, folders: ['docs'], over: true })).sv,
    said(() => driftDetail({ hasGoal: true, edits: 5, folders: ['docs', 'site'], over: true })).sv,
    said(() => routedDetail('Haiku')).sv,
    said(() => suggestDetail('Haiku')).sv,
    said(() => changeDetail({ name: 'acme', from: '1.0.0', to: '1.1.0', at: 0, told: true })).sv,
  ]
  expect(lines).toEqual([
    'Stoppade ytterligare ett försök med Bash. Det väntar på ditt nästa meddelande.',
    'Går i cirklar med a.ts: 4 ändringar på 6 min medan steg fortsatte misslyckas.',
    '1 annan session arbetar i den här mappen. Claude fick inget veta.',
    '5 ändringar i 1 ny mapp: docs',
    '5 ändringar i 2 nya mappar: docs, site',
    'Den körs på Haiku i stället.',
    'Be Claude starta den på Haiku nästa gång.',
    'acme gick från version 1.0.0 till 1.1.0.',
  ])
})

test('a model or effort change made from the pane is a Swedish title in the Autopilot rows and the English title stays as stored', () => {
  const model = { why: 'looks', change: { model: 'opus' } } as never
  const effort = { why: 'looks', change: { effort: 'low', from: 'high' } } as never
  setLang('en')
  const titles = [ledgerWord(model, 'Alpha'), ledgerWord(effort, 'Alpha')]
  expect(titles[0]).toMatch(/^Moved Alpha to /)
  setLang('sv')
  try {
    expect(trFill(titles[0])).toMatch(/^Flyttade Alpha till /)
    expect(trFill('Put Alpha back to Opus')).toBe('Satte tillbaka Alpha till Opus')
    expect(trFill('Back to high effort')).toBe('Tillbaka till ansträngning high')
  } finally {
    setLang('en')
  }
  expect(trFill('Put Alpha back to Opus')).toBe('Put Alpha back to Opus')
})

test('the last times of an Autopilot row say each detail in Swedish, and the same draw in English is unchanged', () => {
  const last = ['4 min ago: 2 other sessions work in this folder. Claude was not told.', '9 min ago: before-theme: 4 files']
  const en = whatIsLines({ means: 'm', last })
  setLang('sv')
  try {
    const sv = whatIsLines({ means: 'm', last }, trFill)
    expect(sv.some(l => /2 andra sessioner arbetar i den här mappen/.test(l))).toBe(true)
    expect(sv.some(l => /before-theme: 4 filer/.test(l))).toBe(true)
    expect(ENGLISH.test(sv.slice(1).join(' '))).toBe(false)
  } finally {
    setLang('en')
  }
  expect(en.join('\n')).toMatch(/2 other sessions work in this folder\. Claude was not told\./)
})

test('the toasts of a layout that cannot be saved or renamed are Swedish', () => {
  setLang('sv')
  try {
    expect(trFill('Only 8 layouts fit. Delete one first.')).toBe('Bara 8 layouter ryms. Ta bort en först.')
    expect(trFill('No layout named "Work".')).toBe('Ingen layout heter "Work".')
    expect(trFill('A layout named "Work" exists already.')).toBe('Det finns redan en layout som heter "Work".')
  } finally {
    setLang('en')
  }
  expect(trFill('No layout named "Work".')).toBe('No layout named "Work".')
})

test('the compact rest check says yes as ja in Swedish and stays yes in English', () => {
  const checks = restChecks({ turnEnded: true, waitsForYou: false, agentsRunning: 0, backgroundRecent: 0, foregroundAgents: 0, tokens: 150_000, percent: 70 } as never).filter(c => c.id === 'ended')
  expect(restLines(checks)[0]).toBe('✓ The answer ended: yes')
  setLang('sv')
  try {
    expect(restLines(checks, tr)[0]).toMatch(/: ja$/)
  } finally {
    setLang('en')
  }
})
