// Swedish sweep: the CI-fix head lines, the help skills list, and the /vaken-usage and /vaken-compact answers follow look.language.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { SLOW, test } from './slow'
import { viaParent } from './viaparent'
import { setLang, tr } from '../hooks/core/lang'
import type { Io } from '../hooks/core/io'
import { buildCiFix, ciHead } from '../hooks/core/prcard'
import { skillsText } from '../hooks/core/skills'
import { diffWords, previewWords } from '../hooks/core/compactdiff'
import { restSection } from '../hooks/core/compactrest'
import { emptyTurn, happenedWords } from '../hooks/core/happened'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const SID = 'session-a'

function world(on: On, seed: Record<string, unknown> = {}): void {
  mock.clock(on, { now: NOW })
  mock.session(on)
  mock.env(on, { HOME: '/home/user' })
  const mem = new Map<string, unknown>(Object.entries(seed))
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
  on('session.id', () => ({ value: SID }))
  on('session.cwd', () => ({ value: '/home/user/app' }))
  on('session.root', () => ({ value: '/home/user/app' }))
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', () => ({ value: [] }) as never)
  on('command.register', (_$, e) => ({ value: { command: (e as { name: string }).name } }) as never)
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
}

const say = async ($: EngineInterface, command: string, args: string): Promise<string> =>
  ((await $.command.run({ ...viaParent(command, args), origin: { kind: 'composer' } } as never)) as { text: string }).text

// English words of the answers this sweep covers; none may be left in a Swedish answer
const ENGLISH = /Read just now|could be read just now|No need to compact|Last times the session|To compact with a note|Compact when idle|Nothing to show yet|No look yet|Under half used|Small details from early/

test('/vaken-usage and /vaken-compact answer in Swedish when the language is Swedish, and in English otherwise', SLOW, async ($, on) => {
  world(on, { 'cockpit:setting:look.language': 'sv' })
  const usage = await say($, 'vaken-usage', '')
  expect(usage).toMatch(/Läst just nu|Allt gick inte att läsa just nu/)
  expect(usage).not.toMatch(ENGLISH)
  const compact = await say($, 'vaken-compact', '')
  expect(compact).toContain('Du behöver inte komprimera sessionen än.')
  expect(compact).toContain('För att komprimera med en notering om vad som ska behållas, klistra in:')
  expect(compact).toContain('Komprimera när det är lugnt, bara visa:')
  expect(compact).not.toMatch(ENGLISH)
  expect(await say($, 'vaken-compact', 'why')).toBe('Inget att visa än. Det visas efter det första svaret. Skicka ett meddelande i chatten.')
})

test('the other command answers (away, outbox, fence, explain, steer, today, ship, pop out) are Swedish too, with the command words kept', SLOW, async ($, on) => {
  world(on, { 'cockpit:setting:look.language': 'sv' })
  const must: [string, string, string][] = [
    ['vaken-away', '', 'Frånvaroläget är av. /vaken-away on talar om för vaken att du är borta.'],
    ['vaken-away', 'zzz', 'Använd: /vaken-away on, /vaken-away off, eller /vaken-away för att titta.'],
    ['vaken-guard', 'outbox', 'Det här svaret: inget har lämnat den här datorn som vaken såg.'],
    ['vaken-guard', 'fence', 'Staket mot text utifrån: på.'],
    ['vaken-explain', 'happened', 'Inget svar har avslutats än i den här sessionen.'],
    ['vaken-explain', 'zzzq', 'Inget matchar "zzzq".'],
    ['vaken-explain', 'guard', 'Vad det betyder:'],
    ['vaken-pause', 'steer', 'Ingen annan session är öppen.'],
    ['vaken-pause', 'steer clear', 'Den här sessionens kö är tom.'],
    ['vaken-pause', 'steer send', '/vaken-pause steer send @2 <mening>'],
    ['vaken-today', 'recap', 'Inget att sammanfatta än.'],
    ['vaken-today', 'glance', 'Plangränsen är inte rapporterad än.'],
    ['vaken-ship', '', 'Leverera: inte än.'],
    ['vaken-help', 'run popout', 'Kunde inte öppna ett nytt fönster härifrån.'],
  ]
  for (const [command, args, text] of must) expect(await say($, command, args), `${command} ${args}`).toContain(text)
  expect(await say($, 'vaken-explain', '')).toMatch(/Delar av panelen: needs, limits/)
})

test('the same answers stay English in English', SLOW, async ($, on) => {
  world(on, { 'cockpit:setting:look.language': 'en' })
  expect(await say($, 'vaken-away', '')).toContain('Away is off. /vaken-away on tells vaken you are gone.')
  expect(await say($, 'vaken-guard', 'fence')).toContain('Outside-text fence: on.')
  expect(await say($, 'vaken-explain', 'happened')).toBe('No answer finished yet in this session.')
  expect(await say($, 'vaken-today', 'recap')).toBe('Nothing to recap yet.')
  expect(await say($, 'vaken-ship', '')).toContain('Ship it: not yet.')
})

test('what happened is said in Swedish for the chat and stays English for Claude', () => {
  const turn = { ...emptyTurn(), reads: 2, edits: 3, files: ['/x/a.ts', '/x/b.ts'], commands: 2, kinds: { test: 1, install: 1 }, risks: ['installed a package'] }
  expect(happenedWords(turn)).toBe('Looked at 2 files or pages, changed 3 files (a.ts, b.ts), ran 2 commands (1 test, 1 install). Risky: installed a package.')
  setLang('sv')
  try {
    expect(happenedWords(turn, true)).toBe('Tittade på 2 filer eller sidor, ändrade 3 filer (a.ts, b.ts), körde 2 kommandon (1 test, 1 installation). Riskabelt: installerade ett paket.')
    expect(happenedWords(turn)).toContain('Looked at')
    expect(happenedWords(undefined, true)).toBe('Inget svar har avslutats än i den här sessionen.')
  } finally {
    setLang('en')
  }
})

test('/vaken-usage and /vaken-compact stay English in English', SLOW, async ($, on) => {
  world(on, { 'cockpit:setting:look.language': 'en' })
  expect(await say($, 'vaken-usage', '')).toMatch(/Read just now|Not everything could be read just now/)
  const compact = await say($, 'vaken-compact', '')
  expect(compact).toContain('No need to compact the session yet.')
  expect(compact).toContain('To compact with a note of what to keep, paste:')
})

test('the pieces of the compact answer are said in Swedish: the keep diff, the preview, the idle rule', () => {
  setLang('sv')
  try {
    const diff = diffWords({ at: NOW, files: 3, kept: 1, dropped: ['a.ts', 'b.ts'], branchKept: false, keep: { total: 4, lost: 1 } }, tr)
    expect(diff).toBe('Sammanfattningen nämner 1 av 3 ändrade filer (utelämnade: a.ts, b.ts). Den nämner inte grenen. Den lämnade ut 1 av 4 punkter i listan över vad som ska behållas; Den här sessionen erbjuder Säg till Claude igen.')
    expect(diffWords({ at: NOW, files: 2, kept: 2, dropped: [], branchKept: true, keep: { total: 4, lost: 0 } }, tr)).toBe('Sammanfattningen nämner alla 2 ändrade filer. Den nämner grenen. Den behåller alla 4 punkter i listan över vad som ska behållas.')
    const preview = previewWords({ messages: 12, files: ['/x/a.ts'], keepList: false, tokens: 120_000, after: 10_000 }, tr)
    expect(preview).toContain('Komprimeringen skulle ersätta 12 meddelanden (ungefär 120k tokens) med en sammanfattning på ungefär 10k tokens.')
    expect(preview).toContain('Filer som ändrades i den här sessionen (1): a.ts.')
    expect(preview).not.toMatch(/Compacting would|Small details|What Claude keeps/)
    const rest = restSection('watch', { at: NOW - 5 * 60_000, ready: false, checks: [] }, [{ at: NOW - 60_000 }], NOW, tr).join('\n')
    expect(rest).toContain('Senaste titt för 5 min sedan: inte än.')
    expect(rest).toContain('De senaste lägena där den skulle ha komprimerat sessionen (1 sparade):')
    expect(rest).not.toMatch(/Last look|The last moments/)
  } finally {
    setLang('en')
  }
})

test('the help skills list is said in Swedish', () => {
  const NOW_S = Date.parse('2026-10-10T12:00:00')
  const listing = { at: NOW_S, total: 5, included: 5, tokens: 2100, names: ['grilling', 'code-review', 'unused-one', 'unused-two'] }
  const counts = { '2026-10-09': { grilling: 6, 'code-review': 1 } }
  setLang('sv')
  try {
    expect(skillsText({ counts, listing, now: NOW_S }, tr)).toEqual(['Färdigheter som användes de senaste 7 dagarna:', '  grilling: 6 gånger', '  code-review: 1 gång', '', '5 färdigheter listade, 2,1k tokens; 2 av 4 inte använda den här veckan; räknat i 2 dagar', 'Inte använda den här veckan:', '  unused-one, unused-two'])
    expect(skillsText({ counts: {}, now: NOW_S }, tr)).toEqual(['Ingen färdighet användes de senaste 7 dagarna.', '', 'Listan över färdigheter i minnet gick inte att läsa, så kostnaden visas inte.'])
  } finally {
    setLang('en')
  }
})

const fakeIo = (checks: string): Io => {
  const mem = new Map<string, unknown>()
  return {
    now: async () => NOW,
    get: async (k: string) => mem.get(k),
    set: async (k: string, v: unknown) => void mem.set(k, v),
    run: async (argv: string[]) => ({ exitCode: argv[2] === 'checks' ? 1 : 0, stdout: argv[2] === 'checks' ? checks : 'log line', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
  } as unknown as Io
}

test('the Fix CI head says the try and the other checks in Swedish, and a check name is never taken for a word', async () => {
  const checks = 'unit\tfail\t1m\thttps://x/actions/runs/77/job/1\t\nlint\tfail\t1m\thttps://x/actions/runs/78/job/1\t\ne2e\tfail\t1m\thttps://x/actions/runs/79/job/1\t\n'
  setLang('sv')
  try {
    const built = await buildCiFix(fakeIo(checks), async () => 'feat-x')
    if (built.kind !== 'prompt') throw new Error('no prompt')
    expect(built.head).toBe('Fix CI: try 1 of 3 in 24 hours for feat-x. Other checks that failed: lint, e2e.')
    expect(built.said).toBe('Laga CI: försök 1 av 3 på 24 timmar för feat-x. Andra kontroller som misslyckades: lint, e2e.')
    expect(built.prompt).toContain('A CI check failed.')
    expect(ciHead(2, 'b', ['a', 'b', 'c', 'd', 'e', 'f'], tr)).toBe('Laga CI: försök 2 av 3 på 24 timmar för b. Andra kontroller som misslyckades: a, b, c, d och 2 till.')
  } finally {
    setLang('en')
  }
})
