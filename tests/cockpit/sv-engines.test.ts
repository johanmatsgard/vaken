// The one text table: the texts of the engines that the pane, the band, the toasts and the ledger show.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { setLang, trFill, tr } from '../hooks/core/lang'
import { WARNED_WHAT } from '../hooks/core/guard'
import { quietWords, whatIsLines } from '../hooks/core/whatis'
import { bandWords, limitWarning } from '../hooks/core/limitwarn'
import { briefMarkLines } from '../hooks/core/continuity'
import type { BriefFacts } from '../hooks/core/continuity'
import { emptyState, recordEdit, recordReceipts } from '../hooks/core/proof'
import { previewText } from '../hooks/core/undo'
import type { PlanFile } from '../hooks/core/undo'
import { buildDigest } from '../hooks/core/away'
import { AWAY_DENY_WHAT } from '../hooks/core/guardworld'
import { devLine } from '../hooks/core/eyesdev'

// English words that must not be left in a Swedish line (names, commands and numbers are not in this list).
const ENGLISH = /\b(the|and|failed|times|today|Warned|Stopped|Risky|updated|waits?|needs|steps?|finished|nothing|was|were|stopped|runs?|resets?|files?|lines?|removed|added|verified|unverified|listens?|answers?|page|branch|checks?|away|happened|spent)\b/

test('the Quiet it? ask says its line in Swedish through the pane translator', () => {
  const q = { what: WARNED_WHAT.destructive, n: 46, setting: 'guard.destructive', label: 'x' }
  setLang('en')
  expect(quietWords(q)).toBe('Warned about a risky command: 46 times today, nothing was stopped. Turn this warning off for all projects?')
  expect(quietWords(q, tr)).toBe('Warned about a risky command: 46 times today, nothing was stopped. Turn this warning off for all projects?')
  setLang('sv')
  const sv = quietWords(q, tr)
  expect(sv).toBe('Varnade för ett riskabelt kommando: 46 gånger i dag, inget stoppades. Vill du stänga av den här varningen för alla projekt?')
  expect(sv).not.toMatch(ENGLISH)
  expect(quietWords(q)).toBe('Warned about a risky command: 46 times today, nothing was stopped. Turn this warning off for all projects?')
  setLang('en')
  void trFill
})

const HOUR = 3_600_000
const NOW = new Date(2026, 9, 10, 14, 0).getTime()

const said = (en: string): string => {
  setLang('sv')
  const out = trFill(en)
  setLang('en')
  return out
}

test('the limit warning says the limit, the time and the day in Swedish', () => {
  const w = limitWarning([{ label: '5-hour limit', percent: 75, resetsAt: new Date(NOW + 2 * HOUR).toISOString() }], NOW)!
  expect(said(w.text)).toBe('I den här takten tar 5-timmarsgränsen slut 15:00. Den återställs 16:00.')
  expect(said(bandWords(w, NOW))).toBe('5 h tar slut ungefär 15:00 (uppskattning)')
  const week = limitWarning([{ label: 'Weekly (all models)', percent: 95, resetsAt: new Date(NOW + 30 * HOUR).toISOString() }], NOW + 0)
  void week
  expect(said('Week runs out about Tuesday 15:40 (estimate)')).toBe('Vecka tar slut ungefär tisdag kl. 15:40 (uppskattning)')
  expect(said('Week · Fable runs out about Tuesday 15:40 (estimate)')).toBe('Vecka · Fable tar slut ungefär tisdag kl. 15:40 (uppskattning)')
  expect(said('At this pace the weekly limit runs out at Sunday 09:05. It resets at Monday 00:00.')).toBe('I den här takten tar veckogränsen slut söndag kl. 09:05. Den återställs måndag kl. 00:00.')
})

test('the handoff note marks of the Context health card are said in Swedish', () => {
  let p = emptyState()
  p = recordEdit(p, '/w/p/a.ts')
  p = recordReceipts(p, [{ kind: 'tests', ok: false, exit: 1 }], NOW)
  const f: BriefFacts = { now: NOW, cwd: '/w/p', proof: { ...p, turns: 1, done: ['tests'], goal: { text: 'Fix it.', setAt: NOW, how: 'first' }, todo: { done: 1, total: 3 } }, edited: ['a.ts'], gitBranch: 'x', gitFiles: [], pr: { number: 7, state: 'OPEN', isDraft: false, url: '', at: NOW } }
  const lines = briefMarkLines(f).lines
  setLang('sv')
  const w = whatIsLines({ means: 'x', facts: lines }, trFill)
  setLang('en')
  const body = w.slice(1)
  expect(body.length).toBe(lines.length)
  for (const l of body) expect(l, l).not.toMatch(ENGLISH)
  expect(body).toContain('Mål: overifierat: nyckelord ur ditt första meddelande, inte kontrollerat')
  expect(body).toContain('Gren: verifierat: git')
})

test('the undo preview is said in Swedish line by line, with its indent', () => {
  const snap = { id: 1, path: '/w/a.ts', tool: 'Edit', at: NOW, kind: 'edit', hash: 'x', lines: 1 } as never
  const plan: PlanFile[] = [
    { kind: 'restore', path: '/w/a.ts', snap, stored: 'a', current: 'b', added: 2, removed: 1 },
    { kind: 'restore', path: '/w/gone.ts', snap, stored: 'a', current: undefined, added: 0, removed: 0 },
    { kind: 'same', path: '/w/same.ts', snap },
    { kind: 'lost', path: '/w/big.ts', why: 'its copy file cannot be read' },
  ]
  const text = previewText('Preview of undoing the edits since your last message.', plan, NOW, '/w', '/vaken-undo last yes')
  setLang('sv')
  const w = whatIsLines({ means: 'x', facts: text.split('\n') }, trFill)
  setLang('en')
  const body = w.slice(1)
  expect(body[0]).toBe('Förhandsvisning av att ångra ändringarna sedan ditt senaste meddelande.')
  expect(body[1]).toBe('2 filer skulle ändras:')
  expect(body[2]).toBe('  a.ts: 1 rad borttagna, 2 rader tillagda (tillbaka till hur den var före en Edit kl. 14:00)')
  expect(body[3]).toMatch(/^ {2}gone\.ts: filen är borta nu/)
  expect(body[4]).toBe('  same.ts: redan likadan som kopian. Inget att göra.')
  expect(body[5]).toBe('  big.ts: kan inte återställas, dess kopia går inte att läsa.')
  expect(body.join('\n')).not.toMatch(ENGLISH)
})

test('the away digest is said in Swedish: the headline, the waiting line and the rest', () => {
  const MIN = 60_000
  const ev = (kind: 'finished' | 'needs', sid: string, at: number) => ({ id: `${kind}:${sid}:${at}`, sid, name: sid, kind, at })
  const d = buildDigest({
    from: NOW,
    to: NOW + 130 * MIN,
    ledger: [{ at: NOW + 10 * MIN, session: 'a', what: AWAY_DENY_WHAT, did: true, how: 'auto' }],
    events: [ev('finished', 'a', NOW + MIN), ev('finished', 'b', NOW + 2 * MIN), ev('needs', 'd', NOW + 5 * MIN)],
    waiting: [],
    spent: 4.2,
    ended: true,
  })
  expect(said(d.headline)).toBe('Medan du var borta (2 h 10 min): 2 sessioner blev klara, 1 session behövde dig, 1 riskabelt steg stoppades, ungefär $4.20 spenderat (uppskattning).')
  const lines = d.text.split('\n').filter(l => l !== '')
  for (const l of lines) expect(said(l), l).not.toMatch(ENGLISH)
  expect(said('So far while you are away (5 min): 1 session finished.')).toBe('Hittills medan du är borta (5 min): 1 session blev klar.')
  expect(said('Nothing happened while you were away.')).toBe('Inget hände medan du var borta.')
})

test('the dev-server line says every form in Swedish; the error words of the page stay as the page wrote them', () => {
  const who = { command: 'node', pid: 1 }
  const lines = [
    devLine(5173, undefined, undefined),
    devLine(5173, who, undefined),
    devLine(5173, who, { status: 200, seconds: 0.043, head: '' }),
    devLine(5173, who, { status: 500, seconds: 0.5, head: 'Internal Server Error' }),
    devLine(5173, who, { status: 404, seconds: 0.5, head: 'Cannot GET /' }),
    devLine(5173, who, { status: 200, seconds: 0.5, head: 'Unhandled Runtime Error' }),
  ]
  const out = lines.map(said)
  for (const l of out) expect(l, l).not.toMatch(ENGLISH)
  expect(out[0]).toBe('Port 5173: inget lyssnar.')
  expect(out[2]).toBe('Port 5173: igång, svarar 200 på 0.04 s.')
  expect(out[3]).toBe('Port 5173: något lyssnar, men det svarar 500: sidan visar ett fel. Sidans text innehåller: Internal Server Error.')
})

test('the Fix CI lines of the ledger and the toasts are said in Swedish', () => {
  const lines = [
    'Fix CI: gh did not answer in time.',
    'Fix CI: there is no pull request for this branch.',
    'Fix CI: no checks were found.',
    'Fix CI: no checks were found (HTTP 404).',
    'Fix CI: no check failed. Nothing to fix.',
    'Fix CI: no check failed. 1 still runs.',
    'Fix CI: no check failed. 3 still run.',
    'Fix CI: try 2 of 3 in 24 hours for feature/x.',
    'Fix CI: try 2 of 3 in 24 hours for feature/x. Other checks that failed: lint, build and 2 more.',
    'Fix CI: gh is not installed. Install it from cli.github.com, then sign in.',
    'Fix CI: gh is not signed in to GitHub. Type gh auth login in a terminal.',
    'Fix CI: could not reach GitHub.',
  ]
  const out = lines.map(said)
  expect(out[7]).toBe('Laga CI: försök 2 av 3 på 24 timmar för feature/x.')
  expect(out[8]).toBe('Laga CI: försök 2 av 3 på 24 timmar för feature/x. Andra kontroller som misslyckades: lint-kontrollen, build och 2 till.')
  expect(out[5]).toBe('Laga CI: ingen kontroll misslyckades. 1 körs fortfarande.')
  for (const l of out) expect(l, l).not.toMatch(/\b(no|the|was|failed|checks?|found|answer|branch)\b/)
})
