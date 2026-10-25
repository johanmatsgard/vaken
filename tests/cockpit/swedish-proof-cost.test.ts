// The text twins of the proof, cost, budget, keeper, loop breaker, stability and value commands say their lines in the language of Settings.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { setLang } from '../hooks/core/lang'
import { afterTurn, buildEvidence, doneLines, emptyState, goalLines, packLines, recordEdit, recordReceipts } from '../hooks/core/proof'
import type { ProofState } from '../hooks/core/proof'
import { confidence, confidenceLines, emptyState2, intentText, recordEdit as recordEdit2 } from '../hooks/core/proof2'
import { heatLines, queueLines } from '../hooks/core/proof2risk'
import type { Change, FileInfo } from '../hooks/core/proof2risk'
import { addTurn, costText, emptyState as emptyCost, turnOf, whyText } from '../hooks/core/cost'
import { limitsText, resetWords } from '../hooks/core/costlimits'
import { budgetLines } from '../hooks/core/budget'
import { keeperVerdict } from '../hooks/core/cachekeeper'
import { keepLines } from '../hooks/core/keepgoing'
import { healthText } from '../hooks/core/stability'
import { valueLines } from '../hooks/core/value'
import { test } from './slow'
import { viaParent } from './viaparent'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

// Runs a body in Swedish and always goes back to English
const inSv = <T>(body: () => T): T => {
  setLang('sv')
  try {
    return body()
  } finally {
    setLang('en')
  }
}

const proofAfterEdit = (): ProofState => recordReceipts(recordEdit(emptyState(), 'src/a.ts'), [{ kind: 'tests', ok: true }], NOW)

test('the definition of done and the pack of proof read in Swedish, and in English as before', () => {
  const s = proofAfterEdit()
  const sv = inSv(() => doneLines(s, ['tests', 'build'], true))
  expect(sv[0]).toBe('Definition av klart: testerna, bygget.')
  expect(sv[1]).toBe('  [x] testerna: gick igenom')
  expect(sv[2]).toBe('  [ ] bygget: inte kört')
  expect(sv[3]).toBe('Inte uppfylld än.')
  expect(doneLines(s, ['tests', 'build'], true)).toEqual(['Definition of done: tests, build.', '  [x] tests: passed', '  [ ] build: not run', 'Not met yet.'])

  const ev = buildEvidence(s, { at: NOW, durationMs: 4000, claims: ['tests'], unproven: [{ kind: 'tests', why: 'missing' }], doneOn: true })
  const after = afterTurn(s, ev, true)
  const pack = inSv(() => packLines(ev, after).join('\n'))
  expect(pack).toMatch(/^Bevis för det senaste svaret \(.*, 4 s\)\./)
  expect(pack).toContain('Ändrade filer i det här svaret: 1 (1 ändring)')
  expect(pack).toContain('Körda kontroller:')
  expect(pack).toContain('testerna gick igenom')
  expect(pack).toContain('Sa att testerna går igenom: ingen kontroll kördes.')
  expect(pack).toContain('Väntar på att du tittar: 1 avslutat svar som ändrade filer.')
  const en = packLines(ev, after).join('\n')
  expect(en).toContain('Files changed in this answer: 1 (1 edit)')
  expect(en).toContain('Said tests pass: no check ran.')
})

test('the goal lines read in Swedish', () => {
  const s: ProofState = { ...proofAfterEdit(), goal: { text: 'faster checkout', setAt: NOW, how: 'typed' }, todo: { done: 1, total: 3 } }
  const sv = inSv(() => goalLines(s).join('\n'))
  expect(sv).toContain('Mål: faster checkout')
  expect(sv).toContain('Steg hittills: 1 fil ändrade (1 ändring).')
  expect(sv).toContain('Kontroller som går igenom nu: testerna.')
  expect(sv).toContain('Claudes uppgiftslista: 1 av 3 klara.')
  expect(goalLines(s).join('\n')).toContain('Checks passing now: tests.')
})

test('the confidence score and the diff of intent read in Swedish', () => {
  const p = proofAfterEdit()
  const s2 = recordEdit2(emptyState2(), 'src/a.ts', 10)
  const c = confidence(p, s2, { doneOn: false, goal: undefined })
  const sv = inSv(() => confidenceLines(confidence(p, s2, { doneOn: false, goal: undefined })).join('\n'))
  expect(sv).toMatch(/^Säkerhet: \d+ av 100\. Den bygger bara på bevisen nedan\./)
  expect(sv).toContain('Kontroller som gick igenom efter den senaste ändringen: gick igenom: testerna')
  expect(sv).toContain('Inga obevisade påståenden')
  expect(sv).toContain('inget mål satt (/vaken-tasks goal)')
  expect(confidenceLines(c).join('\n')).toContain('out of 100. It is made only of the evidence below.')
  expect(inSv(() => intentText(p, s2, { doneOn: false, goal: undefined }))).toMatch(/^Jag kan inte jämföra än/)
  expect(inSv(() => confidenceLines(confidence(emptyState(), emptyState2(), { doneOn: false, goal: undefined })).join('\n'))).toContain('Ingen fil har ändrats än')
})

test('the review queue and the reviewer heat read in Swedish', () => {
  const change: Change = { turn: 0, at: NOW, files: 2, lines: 300, code: 2, tests: false, risk: ['ci', 'security'], receipt: 'failed', names: ['a.ts', 'b.ts'] }
  const queue = inSv(() => queueLines([change], 1).join('\n'))
  expect(queue).toContain('Granskningskö: 1 färdig ändring, de mest riskfyllda först.')
  expect(queue).toContain('1. HÖG: 2 filer, 300 rader (a.ts, b.ts)')
  expect(queue).toContain('ny sedan ditt senaste meddelande')
  expect(queue).toContain('den rör CI- eller byggfiler och säkerhetsrelaterade filer')
  expect(queue).toContain('en kontroll misslyckades')
  expect(queueLines([change], 1).join('\n')).toContain('1. HIGH: 2 files, 300 lines (a.ts, b.ts)')
  const info: FileInfo = { n: 7, lines: 400, turns: [0], test: false, code: true, risk: ['security'], turnN: 0 }
  const heat = inSv(() => heatLines({ 'src/auth.ts': info }, []).join('\n'))
  expect(heat).toContain('Var du ska titta först (1 ändrad fil, hetast först):')
  expect(heat).toContain('7 ändringar, 400 rader, rör säkerhetsrelaterade filer. Ingen testfil ändrades i samma tur.')
  expect(heat).toContain('1 ändrad kodfil hade ingen testfil som ändrades i samma tur.')
  expect(inSv(() => queueLines([], 0)[0])).toBe('Granskningskö: tom. Inget avslutat svar har ändrat en fil än.')
})

test('the cost text and the why paragraph read in Swedish, with the comma and the Swedish money', () => {
  let s = emptyCost(NOW)
  const t = turnOf({ model: 'claude-sonnet-5-5', input_tokens: 1000, output_tokens: 2000, cache_read_input_tokens: 50_000, cache_creation_input_tokens: 1000 }, NOW - MIN, 5000, false)
  if (t === undefined) throw new Error('no turn')
  s = addTurn(s, t)
  const sv = inSv(() => costText({ state: s, now: NOW, model: 'claude-sonnet-5-5', day: { usd: 2, sessions: 2 }, budget: [] }))
  expect(sv).toContain('Kostnad (alla dollarbelopp är uppskattningar)')
  expect(sv).toContain('Den här sessionen: motorn har inte gett någon summa än.')
  expect(sv).toMatch(/Senaste svaret: ungefär\u00a0\d,\d+\sUSD, .* in \(.* från cachen\), .* ut \(för 1 min sedan\)\./)
  expect(sv).toMatch(/I dag: 2,00\sUSD över 2 sessioner/)
  expect(sv).toContain('Dollar utifrån tokens använder listpriset')
  const why = inSv(() => whyText(s))
  expect(why).toMatch(/^På 1 svar kostade den här sessionen ungefär /)
  expect(why).toMatch(/Det mesta av det, \d+\s%, var /)
  expect(costText({ state: s, now: NOW, model: 'claude-sonnet-5-5', budget: [] })).toContain('This session: the engine has not given a total yet.')
  expect(whyText(s)).toMatch(/^In 1 answers this session cost about/)
})

test('the plan limits, the reset time and the budget lines read in Swedish', () => {
  const usage = { at: NOW - 3 * MIN, plan: 'Max', windows: [{ label: '5-hour', percent: 62, resetsAt: '2026-10-10T14:00:00Z' }] }
  const sv = inSv(() => limitsText({ usage, history: {}, running: { count: 3, source: 'vaken' }, spenders: [['App', 4.2], ['Docs', 1.1]], now: NOW }))
  expect(sv).toContain('Plangränser. Källa: appens användningskort, läst för 3 min sedan.')
  expect(sv).toMatch(/: 62\s% använt, 38\s% kvar\. Den återställs .* \(om 2 h 0 min\)\./)
  expect(sv).toContain('3 sessioner körs just nu.')
  expect(sv).toContain('Störst förbrukning, enligt motorns summor: App 4,20')
  expect(sv).toContain('1. Avsluta den viktigaste sessionen först.')
  expect(inSv(() => resetWords('2026-10-10T12:00:00Z', NOW))).toBe('Den återställs nu.')
  expect(inSv(() => limitsText({ usage: undefined, history: {}, running: { count: 0, source: 'vaken' }, spenders: [], now: NOW }))).toMatch(/^Plangränserna är inte kända än/)
  const lines = inSv(() => budgetLines({ mode: 'warn', session: { usd: 4.2, limit: 5 }, source: 'engine' }, { session: 0, day: 0 }))
  expect(lines[0]).toMatch(/^Budget: varna\. Vid 80\s% och vid 100\s% varnas du\.$/)
  expect(lines[1]).toMatch(/^Session: ungefär 4,20\sUSD av 5,00\sUSD, 84\s% \(uppskattning; källa: motorns summa för sessionen\)\.$/)
  expect(budgetLines({ mode: 'warn', session: { usd: 4.2, limit: 5 }, source: 'engine' }, { session: 0, day: 0 })[1]).toBe("Session: about $4.20 of $5.00, 84% (estimate; source: the engine's session total).")
})

test('the keeper, keep going, health and value lines read in Swedish', () => {
  expect(inSv(() => keeperVerdict({ mode: 'off', pings: 0, busy: false, warmLeftMs: 1 }))).toEqual({ ping: false, why: 'Cachevakten är av.' })
  expect(inSv(() => keeperVerdict({ mode: 'on', tokens: 500_000, pings: 3, busy: false, warmLeftMs: 1 }))).toEqual({ ping: false, why: 'Den har redan läst cachen 3 gånger sedan ditt senaste svar.' })
  expect(keeperVerdict({ mode: 'off', pings: 0, busy: false, warmLeftMs: 1 })).toEqual({ ping: false, why: 'The keeper is off.' })
  const keep: ProofState = { ...emptyState(), keep: { kind: 'tests', rounds: 1, at: NOW } }
  expect(inSv(() => keepLines(keep))).toEqual(['Kör vidare: på tills testerna går igenom, 1 av 3 omgångar använda. Ditt nästa meddelande avslutar det.'])
  expect(keepLines(keep)).toEqual(['Keep going: on until the tests pass, 1 of 3 rounds used. Your next message ends it.'])
  const health = { at: NOW, version: '2.0.0', previous: '1.9.0', results: [{ name: 'clock', ok: true }, { name: 'files', ok: false, why: 'unexpected answer' }] }
  const sv = inSv(() => healthText(health))
  expect(sv).toContain('Motorversion: 2.0.0 (var 1.9.0).')
  expect(sv).toContain('✓ klocka')
  expect(sv).toContain('✗ filer: oväntat svar')
  expect(healthText(health)).toContain('Engine version: 2.0.0 (was 1.9.0).')
  const value = inSv(() => valueLines({ days: 7, rows: [{ at: NOW, what: 'Compacted a session' }], freed: { count: 1, freed: 20_000 }, quiet: [], cut: false }).join('\n'))
  expect(value).toContain('Vaken gjorde 1 sak åt dig på 7 dagar.')
  expect(value).toContain('Sparad användning: 1 (Komprimerade en session 1)')
  expect(value).toContain('1 gång: ungefär 20k (uppskattning).')
  expect(valueLines({ days: 1, rows: [], freed: { count: 0, freed: 0 }, quiet: [], cut: false })[0]).toBe('Vaken wrote nothing down in 1 day.')
})

function world(on: On, seed: Record<string, unknown>): void {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:upgrade:tipsdefaults': 'done', ...seed }))
  mock.clock(on, { now: NOW })
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  mock.session(on)
  mock.env(on, { HOME: '/home/test' })
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-sonnet-5-5' }))
  on('session.usage', () => ({ value: { startedAt: NOW - 5 * MIN, context: { window: 1_000_000 }, rateLimits: [], cost: { usd: 0 } } }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
}

test('the commands answer in the language of Settings: Swedish when it says so, English otherwise', async ($, on) => {
  world(on, { 'cockpit:setting:look.language': 'sv', 'cockpit:setting:cost.budget': 'warn' })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  try {
    const budget = (await $.command.run(viaParent('vaken-budget', '') as never)) as { text: string }
    expect(budget.text).toMatch(/^Budget: varna\./)
    const proof = (await $.command.run(viaParent('vaken-proof', '') as never)) as { text: string }
    expect(proof.text).toContain('Bevis: inget avslutat svar än.')
    const goal = (await $.command.run(viaParent('vaken-goal', '') as never)) as { text: string }
    expect(goal.text).toContain('Mål: inte satt.')
    const cost = (await $.command.run(viaParent('vaken-cost', '') as never)) as { text: string }
    expect(cost.text).toContain('Kostnad (alla dollarbelopp är uppskattningar)')
  } finally {
    setLang('en')
  }
})

test('with no language set the same commands answer in English', async ($, on) => {
  world(on, { 'cockpit:setting:cost.budget': 'warn' })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  const budget = (await $.command.run(viaParent('vaken-budget', '') as never)) as { text: string }
  expect(budget.text).toMatch(/^Budget: warn\./)
  const proof = (await $.command.run(viaParent('vaken-proof', '') as never)) as { text: string }
  expect(proof.text).toContain('Proof: no finished answer yet.')
})
