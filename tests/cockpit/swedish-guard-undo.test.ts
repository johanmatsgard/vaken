// The text twins of the guard, pause, away, undo, handoff, resume and after-limit commands say their lines in the language of Settings.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { setLang } from '../hooks/core/lang'
import { buildDigest, modeLines, restoreLines } from '../hooks/core/away'
import { parseGuardAsk, statusText } from '../hooks/core/guard'
import { commandsText } from '../hooks/core/guardcmds'
import { emptyState } from '../hooks/core/proof'
import { storyLines } from '../hooks/core/continuity'
import { findText, resumeText, standupLines, timelineText } from '../hooks/core/continuity2'
import { dueVerdict, statusText as limitText } from '../hooks/core/resume'
import { parseCheckpointAsk, parseUndoAsk, previewText, restoredText } from '../hooks/core/undo'
import { emptyState2 as emptyProof2 } from '../hooks/core/proof2'
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

test('the guard status, its asks and the command list read in Swedish, and in English as before', () => {
  const facts = { modes: { destructive: 'warn', scope: 'hold', packages: 'off', tests: 'warn' } as const, halted: false, allowPending: false, scope: [], last: [] }
  const sv = inSv(() => statusText(facts))
  expect(sv).toContain('Inte pausad. /vaken-pause pausar skalkommandon, filändringar, verktyg från andra appar, agenter, webbhämtningar och färdigheter.')
  expect(sv).toContain('Mappgränsen: stoppa (steget stoppas tills du tillåter det).')
  expect(sv).toContain('Paketkontrollen: av.')
  expect(sv).toContain('Tillåt en gång: inte satt.')
  expect(sv).toContain('Ändra en kontroll: Inställningar > Säkerhet.')
  const en = statusText(facts)
  expect(en).toContain('Not paused. /vaken-pause pauses shell commands, file edits')
  expect(en).toContain('Edit fence: stop (the step is stopped until you allow it).')
  expect(inSv(() => parseGuardAsk('allow twice'))).toEqual({ kind: 'bad', why: 'Använd: /vaken-guard allow once' })
  expect(parseGuardAsk('allow twice')).toEqual({ kind: 'bad', why: 'Use: /vaken-guard allow once' })
  const list = [{ at: NOW, kind: 'test' as const, label: 'npm · test', status: 'failed' as const, exit: 1 }, { at: NOW, kind: 'delete' as const, label: 'rm · destroy', status: 'denied' as const }]
  const cmds = inSv(() => commandsText(list, true))
  expect(cmds).toContain('Skalkommandon i den här sessionen, i ordning (högst de senaste 50;')
  expect(cmds).toContain('misslyckades (felkod 1)')
  expect(cmds).toContain('stoppad av säkerhetskontrollen')
  expect(commandsText(list, true)).toContain('failed (exit 1)')
})

test('the away lines read in Swedish', () => {
  const run = { at: NOW - 30 * MIN, until: NOW + 90 * MIN, costBase: {} }
  const saved = { policy: { old: null, set: 'careful' }, budget: { old: 'warn', set: 'stop', limit: 25 } }
  const sv = inSv(() => modeLines(run, saved, NOW).join('\n'))
  expect(sv).toContain('Frånvaroläget har varit på sedan')
  expect(sv).toContain('(om 1 h 30 min)')
  expect(sv).toContain('Vaken satte regeln för frånvaro till Försiktig (den var Av)')
  expect(sv).toContain('Vaken satte kostnadsbudgeten till Stoppa med 25,00 USD per session (den var Varna)')
  expect(sv).toContain('Båda sätts tillbaka när frånvaroläget tar slut.')
  const en = modeLines(run, saved, NOW).join('\n')
  expect(en).toContain('Away mode is on since')
  expect(en).toContain('Vaken set the cost budget to Stop at $25.00 a session (it was Warn)')
  expect(inSv(() => restoreLines(saved, { policy: 'back', budget: 'kept' }).join(' '))).toBe('Regeln för frånvaro är tillbaka på Av. Kostnadsbudgeten förblir som du ändrade den.')
})

test('the away digest reads in Swedish', () => {
  const facts = { from: NOW - 2 * 60 * MIN, to: NOW, ledger: [], events: [{ id: 'finished:a:1', sid: 'a', name: 'app', kind: 'finished' as const, at: NOW - 60 * MIN }], waiting: [], ended: true, spent: 1.5 }
  const sv = inSv(() => buildDigest(facts))
  expect(sv.headline).toContain('Medan du var borta (2 h)')
  expect(sv.headline).toContain('1 session blev klar')
  expect(sv.text).toContain('Inget väntar på dig.')
  expect(buildDigest(facts).headline).toMatch(/^While you were away \(2 h\): 1 session finished/)
})

test('the undo previews and answers read in Swedish', () => {
  const snap = { id: 1, path: '/w/a.ts', at: NOW - MIN, tool: 'Edit', kind: 'changed', hash: 'x', lines: 4, bytes: 10 } as never
  const plan = [{ kind: 'same', path: '/w/a.ts', snap }, { kind: 'lost', path: '/w/b.ts', why: 'its copy file cannot be read' }] as never
  const sv = inSv(() => previewText('Titel', plan, NOW, '/w', '/vaken-undo 1 yes'))
  expect(sv).toContain('Inget skulle ändras.')
  expect(sv).toContain('a.ts: redan likadan som kopian. Inget att göra.')
  expect(sv).toContain('b.ts: kan inte återställas, dess kopia går inte att läsa.')
  expect(sv).toContain('Inget ändrades.')
  expect(previewText('T', plan, NOW, '/w', '/vaken-undo 1 yes')).toContain('a.ts: already the same as the copy. Nothing to do.')
  const done = inSv(() => restoredText({ done: 2, failed: [], checked: 2, refused: ['/w/c.ts'], linked: [] }, '/w'))
  expect(done).toContain('Återställde 2 filer; 2 lästes tillbaka och stämmer med kopian.')
  expect(done).toContain('Inte återställd: c.ts.')
  expect(done).toContain('Filerna som de var precis före sparas, så /vaken-undo kan ångra detta.')
  expect(inSv(() => parseUndoAsk('last maybe'))).toEqual({ kind: 'bad', why: 'Använd: /vaken-undo, /vaken-undo <nummer>, /vaken-undo last, /vaken-undo name <kontrollpunkt>. Lägg till yes för att återställa.' })
  expect(inSv(() => parseUndoAsk('0'))).toEqual({ kind: 'bad', why: 'Välj ett nummer från 1 till 10 (se /vaken-undo).' })
  expect(parseUndoAsk('0')).toEqual({ kind: 'bad', why: 'Pick a number from 1 to 10 (see /vaken-undo).' })
  expect(inSv(() => parseCheckpointAsk('list'))).toEqual({ kind: 'list' })
})

test('the story, the standup, the finds and the timeline read in Swedish', () => {
  const sv = inSv(() => storyLines({ proof: emptyState(), anomalies: 0, unproven: 0 }).join('\n'))
  expect(sv).toContain('Målet sattes inte för den här sessionen.')
  expect(sv).toContain('Hittills har Claude inte ändrat någon fil eller kört någon kontroll.')
  expect(sv).toContain('Vaken såg inget misslyckas.')
  expect(sv).toContain('Härnäst: inget väntar som vaken kan se.')
  expect(storyLines({ proof: emptyState(), anomalies: 0, unproven: 0 })[0]).toBe('The goal was not set for this session.')
  const stand = inSv(() => standupLines({ now: NOW, sessions: [{ name: 'app', files: 3, edits: 5, debt: 1, asking: true }], cockpitActions: 2, costUsd: 1.25, costSessions: 1 }).join('\n'))
  expect(stand).toContain('1 session hade arbete, ändringar i 3 filer, vaken agerade 2 gånger.')
  expect(stand).toContain('- app: inget mål satt (3 filer ändrade)')
  expect(stand).toContain('Väntar: 1 öppen fråga (app), färdigt arbete att titta på i app. Kostnad: ungefär 1,25 USD i 1 session, som vaken räknade det.')
  expect(inSv(() => findText('x', [], new Map(), NOW))).toBe('Ingen session nämner "x". Sökningen tittar i de andra sessionerna, inte i den här.')
  const rows = [{ id: 's1', title: 'Min session', cwd: '/w/app', branch: 'main', isRunning: true, lastActivityAt: new Date(NOW - 5 * MIN).toISOString() }] as never
  const found = inSv(() => resumeText('min', rows, NOW, "the app's session list"))
  expect(found).toContain('1 session matchar "min"')
  expect(found).toContain('Mapp: app, gren: main')
  expect(found).toContain('Senaste aktivitet:')
  expect(found).toContain(', den körs nu')
  expect(inSv(() => timelineText({ proof: emptyState(), proof2: emptyProof2(), cmds: [], ledger: [] }, 10, NOW))).toBe('Inget att visa ännu: vaken har inte sparat någon händelse för den här sessionen.')
})

test('the after-limit status and the reasons read in Swedish', () => {
  const w = { failedAt: NOW, dueAt: NOW + 30 * MIN, mode: 'resume' as const, fromReset: true }
  const sv = inSv(() => limitText('resume', w, NOW, 1))
  expect(sv).toContain('Efter en gräns: resume.')
  expect(sv).toContain('Den skickar "continue" kl.')
  expect(sv).toContain('Återupptagningar i dag: 1 av 3.')
  expect(inSv(() => limitText('off', undefined, NOW, 0))).toBe('Efter en gräns: off. Inget väntar. Slå på det: Inställningar > Pengar och plan.')
  expect(limitText('off', undefined, NOW, 0)).toBe('After a limit: off. Nothing is waiting. Turn it on: Settings > Money and plan.')
  const v = inSv(() => dueVerdict(w, { now: NOW + 31 * MIN, halted: true, wroteSince: false, doneToday: 0 }))
  expect(v).toEqual({ act: false, why: 'Sessionen är pausad.' })
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
  on('session.cwd', () => ({ value: '/work/app' }))
  on('session.root', () => ({ value: '/work/app' }))
  on('session.model', () => ({ value: 'claude-sonnet-5-5' }))
  on('session.usage', () => ({ value: { startedAt: NOW - 5 * MIN, context: { window: 1_000_000 }, rateLimits: [], cost: { usd: 0 } } }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
}

const ask = async ($: Parameters<Parameters<typeof test>[1]>[0], command: string, args = ''): Promise<string> =>
  ((await $.command.run({ ...viaParent(command, args), origin: { kind: 'composer' } } as never)) as { text: string }).text

test('the commands answer in the language of Settings: Swedish when it says so', async ($, on) => {
  world(on, { 'cockpit:setting:look.language': 'sv' })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  try {
    expect(await ask($, 'vaken-pause', 'status')).toBe('Inte pausad.')
    expect(await ask($, 'vaken-pause')).toMatch(/^Pausad för säkerhets skull\. Skalkommandon, filändringar,/)
    expect(await ask($, 'vaken-pause', 'status')).toMatch(/^Pausad för säkerhets skull\./)
    expect(await ask($, 'vaken-pause', 'off')).toBe('Återupptagen. Steg som ändrar saker fungerar igen i den här sessionen.')
    expect(await ask($, 'vaken-guard', 'scope')).toBe('Inga mappar valda. /vaken-guard scope <mappar...> väljer dem för den här sessionen.')
    expect(await ask($, 'vaken-undo')).toContain('Ingen fil har ändrats i den här sessionen ännu, så det finns inget att ångra.')
    expect(await ask($, 'vaken-away', 'digest')).toBe('Det finns ingen sammanfattning ännu. Vaken gör en när du avslutar frånvaroläget: /vaken-away off.')
    expect(await ask($, 'vaken-help', 'run after-limit off')).toBe('Avbrutet. Inget väntar på en återställning i den här sessionen nu.')
    expect(await ask($, 'vaken-help', 'run story')).toContain('Målet sattes inte för den här sessionen.')
  } finally {
    setLang('en')
  }
})

test('with no language set the same commands answer in English', async ($, on) => {
  world(on, {})
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  expect(await ask($, 'vaken-pause', 'status')).toBe('Not paused.')
  expect(await ask($, 'vaken-guard', 'scope')).toBe('No folders set. /vaken-guard scope <folders...> sets them for this session.')
  expect(await ask($, 'vaken-away', 'digest')).toBe('There is no digest yet. Vaken makes one when you end away mode: /vaken-away off.')
  expect(await ask($, 'vaken-help', 'run after-limit off')).toBe('Cancelled. Nothing waits for a reset in this session now.')
})
