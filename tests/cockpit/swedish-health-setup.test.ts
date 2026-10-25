// The text twins of the health, trust, insight, coach, diet, routing, starter, teach, setup and overnight commands, and the preview's lines, say themselves in the language of Settings.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { setLang } from '../hooks/core/lang'
import { healthText, withFailure, withSlow } from '../hooks/core/health'
import { trustCard } from '../hooks/core/trust'
import { auditText, emptyWaits, addWait, fitText, outcomesText, storyText, tidyText, waitsText } from '../hooks/core/insight'
import { analyze } from '../hooks/core/diet'
import { dietText } from '../hooks/core/diet'
import { decisionsText } from '../hooks/core/coach'
import { routeText } from '../hooks/core/route'
import { startersPreview } from '../hooks/core/starters'
import { rulesListText } from '../hooks/core/teach'
import { devLine, errorWords } from '../hooks/core/eyesdev'
import { lookText } from '../hooks/core/eyes'
import { historyText, reportText } from '../hooks/core/overnight'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime()
const HOUR = 3_600_000

// Runs a body in Swedish and always goes back to English
const inSv = <T>(body: () => T): T => {
  setLang('sv')
  try {
    return body()
  } finally {
    setLang('en')
  }
}

test('the health text says its counts in Swedish with a decimal comma, and in English as before', () => {
  let c = withFailure(withFailure(withFailure({}, NOW, 'undo', 'throw').counts, NOW, 'undo', 'throw').counts, NOW, 'undo', 'throw').counts
  c = withSlow(c, NOW, 'guard', 2_040)
  const sv = inSv(() => healthText('on', c, NOW, { problems: [] }))
  expect(sv).toContain('Vaken-hälsa: på.')
  expect(sv).toContain('I dag:')
  expect(sv).toContain('misslyckades 3 gånger (throw 3)')
  expect(sv).toContain('1 långsamt steg, långsammast 2,0 s')
  expect(sv).toContain('<- varning i bandet')
  expect(sv).toContain('Tillägg som nekades vid laddning: inga.')
  const en = healthText('on', c, NOW, { problems: [] })
  expect(en).toContain('failed 3 times (throw 3)')
  expect(en).toContain('1 slow step, slowest 2.0 s')
  expect(en).toContain('Plugins refused at load: none seen.')
})

test('the plugin trust card reads in Swedish', () => {
  const row = { name: 'tool', version: '1.0', seen: { tier: 'a', events: ['tool.call'], calls: ['fs.write', 'process.run'], at: NOW - 5 * 60_000 }, commands: 2, agentsStarted: 1 }
  const sv = inSv(() => trustCard([row], [{ name: 'docs', tools: 3 }], [], NOW))
  expect(sv).toContain('Tilläggens förtroendekort.')
  expect(sv).toContain('dess skanning säger att det kan skriva filer och köra program')
  expect(sv).toContain('2 snedstreckskommandon')
  expect(sv).toContain('startade 1 agent i den här sessionen')
  expect(sv).toContain('Verktygsservrar (MCP) i den här sessionen:')
  expect(sv).toContain('  docs: 3 verktyg')
  expect(trustCard([row], [], [], NOW)).toContain('its scan says it can write files and run programs')
})

test('the waits, the plan fit, the story, the cost per outcome and the tidy read in Swedish', () => {
  let w = emptyWaits(0)
  w = addWait(w, 'question', 3 * 60_000)
  w = addWait(w, 'after', 30 * 60_000)
  const waits = inSv(() => waitsText(w))
  expect(waits).toContain('I dag väntade Claude på dig 2 gånger, 33 min sammanlagt. Den längsta väntan var 30 min.')
  expect(waits).toContain('frågor: 1 gång, 3 min sammanlagt')
  expect(waitsText(w)).toContain('Today Claude waited for you 2 times, 33 min in all.')
  const usage = { at: NOW, windows: [{ label: '5-hour', percent: 30, resetsAt: new Date(NOW + 3 * HOUR).toISOString() }] }
  const fit = inSv(() => fitText(usage, 20, NOW))
  expect(fit).toContain('30 % använt, 70 % kvar. Ett jobb på 20 % ryms.')
  expect(inSv(() => fitText(undefined, 20, NOW))).toBe('Plangränserna är inte kända än. Skriv /vaken-usage för att läsa dem nu, och sedan /vaken-usage fit igen.')
  const story = inSv(() => storyText('Make the card calmer', [{ path: 'src/Card.tsx', added: 4, removed: 1 }]))
  expect(story).toContain('Varför: Make the card calmer')
  expect(story).toContain('Vad: 1 fil, 4 rader tillagda, 1 borttagna.')
  expect(story).toContain('Det du ser på skärmen (1):')
  expect(inSv(() => outcomesText([], NOW))).toContain('Inget klart arbete är noterat än.')
  expect(inSv(() => outcomesText([{ at: NOW, kind: 'done', usd: 1.2, session: 'a' }], NOW))).toContain('I dag: 1 utfall, i snitt ungefär 1,20 USD per styck (uppskattning).')
  expect(inSv(() => tidyText(['cockpit:proof:11111111-1111-1111-1111-111111111111'], false))).toContain('1 kvarlämnad anteckning från 1 avslutad session. Säkert att ta bort.')
  expect(inSv(() => auditText([], 5))).toContain('Granskningslistan är tom.')
  expect(tidyText([], false)).toBe('Nothing to tidy. No leftover notes.')
})

test('the instruction-file diet, the decisions, the routing and the starter agents read in Swedish', () => {
  const report = analyze([{ path: '/h/CLAUDE.md', text: 'rule\n'.repeat(5_000) }])
  const diet = inSv(() => dietText(report, '/h'))
  expect(diet).toContain('Instruktionsfiler som Claude läser i varje session: 1, ungefär')
  expect(diet).toContain('tokens tillsammans.')
  expect(dietText(report, '/h')).toContain('Instruction files Claude reads in every session: 1, about')
  expect(inSv(() => decisionsText([], false))).toContain('Inga beslut är nedskrivna än. Loggen är av')
  expect(inSv(() => decisionsText([{ at: NOW, text: 'Use pnpm', how: 'typed' }], true))).toContain('Beslut (1), nyaste först:')
  const route = inSv(() => routeText('suggest', 'haiku', [], {}))
  expect(route).toContain('Agentmodeller: föreslå.')
  expect(route).toContain('Uppslagsmodell: haiku')
  expect(route).toContain('Inte tillräckligt med underlag för ett besked än.')
  expect(routeText('suggest', 'haiku', [], {})).toContain('Agent models: suggest.')
  const starters = inSv(() => startersPreview('/home/u', new Set(['vaken-lookup'])))
  expect(starters).toContain('Två startagenter för /home/u/.claude/agents:')
  expect(starters).toContain('vaken-lookup (modell haiku): hittar filer och fakta, svarar på 10 rader, läser bara. Finns redan.')
  expect(starters).toContain('Skriv vaken-reviewer med: /vaken-tasks agents make yes')
  expect(inSv(() => rulesListText(['Use pnpm, not npm.'], { rule: { code: 'c', line: 'Never add comments.', said: 'x' }, root: '/r' }))).toContain('Regler du sparade i vaken (1)')
})

test('the dev server line, the page pictures and the run reports read in Swedish', () => {
  expect(inSv(() => devLine(3000, undefined, undefined))).toBe('Port 3000: inget lyssnar.')
  expect(inSv(() => devLine(3000, { command: 'node', pid: 1 }, { status: 200, seconds: 0.12, head: '' }))).toBe('Port 3000: uppe, svarar 200 på 0,12 s.')
  expect(inSv(() => devLine(3000, { command: 'node', pid: 1 }, { status: 500, seconds: 0.2, head: 'Internal Server Error' }))).toBe('Port 3000: något lyssnar, men det svarar 500: sidan visar ett fel. Sidans text innehåller: Internal Server Error.')
  expect(devLine(3000, undefined, undefined)).toBe('Port 3000: nothing listens.')
  expect(errorWords('<h1>Internal Server Error</h1>')).toEqual(['Internal Server Error'])
  const look = inSv(() => lookText('http://localhost:3000/', 'main', [{ width: 390, status: 'saved', path: '/p/main-390.png', bytes: 1536 }, { width: 768, status: 'failed', why: 'Chrome wrote no picture' }]))
  expect(look).toContain('Tog 1 ny bild av http://localhost:3000/ (namn: main).')
  expect(look).toContain('Telefon, 390 bred: /p/main-390.png (1,5 KB)')
  expect(look).toContain('Surfplatta, 768 bred: ingen bild (Chrome skrev ingen bild)')
  const report = { id: 'r1', name: 'Night', endedAt: NOW, status: 'done' as const, done: 2, failed: 0, other: 0, usd: 0, tasks: [{ n: 1, text: 'a', state: 'done' as const, check: 'passed' as const }] }
  const sv = inSv(() => reportText(report, NOW))
  expect(sv).toContain('Night: Slutade 12:00.')
  expect(sv).toContain('1. a: kontrollerad')
  expect(inSv(() => historyText([], NOW))).toBe('Inga tidigare körningar än.')
  expect(historyText([], NOW)).toBe('No past runs yet.')
  expect(reportText(report, NOW)).toContain('Night: Ended 12:00.')
})

// A command handler learns the language first: a Swedish person sees Swedish in the chat
function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>()
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
  return mem
}
const said = async ($: EngineInterface, command: string, args = ''): Promise<string> => ((await $.command.run(viaParent(command, args))) as { text: string }).text

test('the decisions, waits and starter agents commands answer in Swedish when Settings says so, and in English otherwise', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  mock.env(on, { HOME: '/home/test' })
  on('session.id', () => ({ value: 'session-a' }))
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('fs.exists', () => ({ value: false }) as never)
  try {
    expect(await said($, 'vaken-waits')).toMatch(/Claude has not waited for you today/)
    mem.set('cockpit:setting:look.language', 'sv')
    expect(await said($, 'vaken-waits')).toBe('Claude har inte väntat på dig i dag, så långt vaken kunde se.')
    expect(await said($, 'vaken-memory', 'decisions')).toContain('Inga beslut är nedskrivna än.')
    expect(await said($, 'vaken-tasks', 'agents')).toContain('Två startagenter för')
  } finally {
    setLang('en')
  }
})
