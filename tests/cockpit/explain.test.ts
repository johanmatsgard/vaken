// The explanation catalogue and /cockpit-explain.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import * as agentcap from '../hooks/core/agentcap'
import * as away from '../hooks/core/away'
import * as budget from '../hooks/core/budget'
import * as cachekeeper from '../hooks/core/cachekeeper'
import * as coach from '../hooks/core/coach'
import * as continuity from '../hooks/core/continuity'
import * as crew from '../hooks/core/crew'
import * as crew3 from '../hooks/core/crew3'
import * as diet from '../hooks/core/diet'
import * as eyes from '../hooks/core/eyes'
import * as freshstart from '../hooks/core/freshstart'
import * as guard from '../hooks/core/guard'
import * as guardback from '../hooks/core/guardback'
import * as guardupgrade from '../hooks/core/guardupgrade'
import * as guardworld from '../hooks/core/guardworld'
import * as inbox from '../hooks/core/inbox'
import * as loopbreaker from '../hooks/core/loopbreaker'
import * as neighbors from '../hooks/core/neighbors'
import * as planfirst from '../hooks/core/planfirst'
import * as proof from '../hooks/core/proof'
import * as proof2 from '../hooks/core/proof2'
import * as resume from '../hooks/core/resume'
import * as route from '../hooks/core/route'
import * as rules from '../hooks/core/rules'
import * as stability from '../hooks/core/stability'
import * as starters from '../hooks/core/starters'
import * as setupwords from '../hooks/core/setupwords'
import * as dowords from '../hooks/core/dowords'
import * as trust from '../hooks/core/trust'
import * as undo from '../hooks/core/undo'
import * as compactrest from '../hooks/core/compactrest'
import * as overnight from '../hooks/core/overnight'
import { AUDIT_KEY } from '../hooks/core/insight'
import type { AuditRow } from '../hooks/core/insight'
import type { Io } from '../hooks/core/io'
import type { Entry } from '../hooks/core/ledger'
import { COMMAND_GROUPS } from '../hooks/core/registry'
import { SETTINGS, settingPath } from '../hooks/core/settings'
import { PRESETS } from '../hooks/core/presets'
import { EXPLAIN, EXPLAIN_HELP, EXPLAIN_MAX, EXPLAIN_TITLES, SHAPE_WHAT, agoWord, closestTitles, explainFor, explainLines, matchTitles, plainTitle, recentKinds, titleFor } from '../hooks/core/explain'
import { didRows, explainText } from '../hooks/features/explain'
import { LEDGER_KEY } from '../hooks/features/compaction'
import { SLOW, test } from './slow'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime()

const MODULES: Record<string, Record<string, unknown>> = { agentcap, setupwords, dowords, away, budget, cachekeeper, coach, compactrest, continuity, crew, crew3, diet, eyes, freshstart, guard, guardback, guardupgrade, guardworld, inbox, loopbreaker, neighbors, overnight, planfirst, proof, proof2, resume, route, rules, stability, starters, trust, undo }
const NOT_DID = new Set(['route.SUGGEST_WHAT'])

function exportedTitles(): { name: string; title: string }[] {
  const out: { name: string; title: string }[] = []
  for (const [mod, exports] of Object.entries(MODULES)) {
    for (const [key, value] of Object.entries(exports)) {
      if (!/_WHAT$/.test(key) || NOT_DID.has(`${mod}.${key}`)) continue
      if (typeof value === 'string') out.push({ name: `${mod}.${key}`, title: value })
      else if (typeof value === 'object' && value !== null) for (const [k, v] of Object.entries(value)) if (typeof v === 'string') out.push({ name: `${mod}.${key}.${k}`, title: v })
    }
  }
  return out
}

const LITERAL_TITLES = [SHAPE_WHAT, ...PRESETS.map(p => `Applied the ${p.title} preset`), ...PRESETS.map(p => `Applied the ${p.name} preset`)]

test('every exported ledger title has an explanation', () => {
  const titles = exportedTitles()
  expect(titles.length).toBeGreaterThanOrEqual(55)
  const missing = titles.filter(t => EXPLAIN[t.title] === undefined).map(t => `${t.name}: ${t.title}`)
  expect(missing).toEqual([])
})

test('no explanation is for a title that no block writes, and no title is listed twice', () => {
  const written = new Set([...exportedTitles().map(t => t.title), ...LITERAL_TITLES])
  expect(EXPLAIN_TITLES.filter(t => !written.has(t))).toEqual([])
  expect(new Set(EXPLAIN_TITLES).size).toBe(EXPLAIN_TITLES.length)
  expect(Object.keys(EXPLAIN).sort()).toEqual([...EXPLAIN_TITLES].sort())
  for (const t of LITERAL_TITLES) expect(EXPLAIN[t]).toBeDefined()
})

test('each explanation has three non-empty sentences of at most 160 characters', () => {
  const bad: string[] = []
  for (const [title, x] of Object.entries(EXPLAIN)) {
    for (const field of ['means', 'why', 'next'] as const) {
      if (x[field].trim() === '') bad.push(`${title} ${field} is empty`)
      if (x[field].length > EXPLAIN_MAX) bad.push(`${title} ${field} is ${x[field].length} long`)
    }
  }
  expect(bad).toEqual([])
})

test('every command and Settings row an explanation names is real', () => {
  const known = new Set([...COMMAND_GROUPS.flatMap(g => g.commands), 'vaken-explain'])
  const paths = SETTINGS.map(s => settingPath(s))
  const bad: string[] = []
  for (const [title, x] of Object.entries(EXPLAIN)) {
    for (const text of [x.means, x.why, x.next]) {
      for (const m of text.matchAll(/(?<![A-Za-z0-9.])\/(vaken-[a-z0-9-]+)/g)) if (!known.has(m[1] as string)) bad.push(`${title}: /${m[1]} is not a command`)
      for (const m of text.matchAll(/Settings > /g)) if (!paths.some(p => text.slice(m.index).startsWith(p))) bad.push(`${title}: "${text.slice(m.index, (m.index ?? 0) + 40)}" is not a Settings row`)
    }
  }
  expect(bad).toEqual([])
})

test('the words are plain: no jargon', () => {
  const jargon = /\b(side effect|hash|token|payload|API|regex|daemon|stdout|hook)\b/i
  const bad: string[] = []
  for (const [title, x] of Object.entries(EXPLAIN)) for (const text of [x.means, x.why, x.next]) if (jargon.test(text)) bad.push(`${title}: ${text}`)
  expect(bad).toEqual([])
})

test('a block that only warns says that nothing was stopped, or how to stop', () => {
  const bad: string[] = []
  for (const [title, x] of Object.entries(EXPLAIN)) {
    if (/^Warned about (a risky|an edit|a package|a weakened|a migration|a step that reaches|too many|the budget)/.test(title) && !/nothing was stopped|Stop|stop/.test(x.means + x.next)) bad.push(title)
  }
  expect(bad).toEqual([])
  expect(EXPLAIN['Claude said done without proof']?.means).toMatch(/Nothing was stopped/)
})

test('one help entry, and it names the command', () => {
  expect(EXPLAIN_HELP.length).toBe(1)
  expect(EXPLAIN_HELP[0]?.title).toBe('Why vaken tells you things')
  expect(EXPLAIN_HELP[0]?.text).toMatch(/\/vaken-explain/)
})

test('a line of the card finds its explanation: exact, any letter case, with a count after it', () => {
  const want = EXPLAIN['Claude said done without proof']
  expect(want).toBeDefined()
  expect(explainFor('Claude said done without proof')).toBe(want)
  expect(explainFor('claude SAID done WITHOUT proof')).toBe(want)
  expect(explainFor('Claude said done without proof 5 times.')).toBe(want)
  expect(explainFor('Claude said done without proof once.')).toBe(want)
  expect(explainFor('Claude said done without proof (3 times today)')).toBe(want)
  expect(explainFor('Spotted odd behaviour 9 times.')).toBe(EXPLAIN['Spotted odd behaviour'])
  expect(explainFor('Found an instruction hidden in outside text once.')).toBe(EXPLAIN['Found an instruction hidden in outside text'])
  expect(explainFor('Warned before an action outside your computer 11 times.')).toBe(EXPLAIN['Warned before an action outside your computer'])
  expect(explainFor('Offered a skill for a repeated request once.')).toBe(EXPLAIN['Offered a skill for a repeated request'])
  expect(explainFor('Something nobody wrote')).toBeUndefined()
  expect(titleFor('Held a risky command 2 times.')).toBe('Held a risky command')
  expect(titleFor('Stopped a risky command 2 times.')).toBe('Held a risky command')
  expect(plainTitle('Kept the cache warm (12 times in 7 days)')).toBe('kept the cache warm')
})

test('the preset titles are explained, one for each preset', () => {
  for (const p of PRESETS) {
    expect(explainFor(`Applied the ${p.title} preset`)?.means).toContain(p.title)
    expect(explainFor(`Applied the ${p.name} preset`)?.means).toContain(p.title)
  }
})

const row = (ago: number, detail?: string) => ({ at: NOW - ago, ...(detail === undefined ? {} : { detail }) })

test('the lines: the title with its count in 7 days, three sentences, and the last 3 times', () => {
  const rows = [row(10 * MIN, '1 claim: tests pass.'), row(3 * HOUR, 'a'), row(2 * DAY, 'b'), row(5 * DAY, 'c'), row(9 * DAY, 'old')]
  const lines = explainLines('Claude said done without proof 5 times.', rows, NOW)
  const x = EXPLAIN['Claude said done without proof']
  expect(lines[0]).toBe('Claude said done, but no check backs it (4 times in 7 days)')
  expect(lines[1]).toBe(`What it means: ${x?.means}`)
  expect(lines[2]).toBe(`Why: ${x?.why}`)
  expect(lines[3]).toBe(`What you can do: ${x?.next}`)
  expect(lines.slice(4)).toEqual(['', 'The last times:', '  10 min ago: 1 claim: tests pass.', '  3 h ago: a', '  2 d ago: b'])
  expect(lines.length).toBeLessThanOrEqual(14)
})

test('the lines: once, no rows, an unknown title and a long detail', () => {
  expect(explainLines('Held a risky command', [row(HOUR)], NOW)[0]).toBe('Stopped a risky command (once in 7 days)')
  const none = explainLines('Held a risky command', [], NOW)
  expect(none[0]).toBe('Stopped a risky command (0 times in 7 days)')
  expect(none.join('\n')).not.toMatch(/The last times/)
  const odd = explainLines('A title nobody wrote', [row(MIN)], NOW)
  expect(odd[1]).toBe('There is no explanation for this line yet.')
  const long = explainLines('Held a risky command', [row(MIN, 'x'.repeat(400))], NOW)
  expect(long[long.length - 1]?.length).toBeLessThanOrEqual(130)
  expect(agoWord(30_000)).toBe('just now')
  expect(agoWord(3 * DAY)).toBe('3 d ago')
})

test('recent kinds: today only, newest first, counted, and at most n', () => {
  const rows = [
    { at: NOW - HOUR, what: 'Held a risky command' },
    { at: NOW - 2 * HOUR, what: 'Held a risky command' },
    { at: NOW - 30 * MIN, what: 'Kept the cache warm' },
    { at: NOW - 13 * HOUR, what: 'Yesterday only' },
    { at: NOW - 3 * HOUR, what: 'Caught a repeating step' },
  ]
  expect(recentKinds(rows, NOW, 10).map(k => [k.what, k.n])).toEqual([
    ['Kept the cache warm', 1],
    ['Held a risky command', 2],
    ['Caught a repeating step', 1],
  ])
  expect(recentKinds(rows, NOW, 2).length).toBe(2)
  const many = Array.from({ length: 30 }, (_, n) => ({ at: NOW - n * MIN, what: `Kind ${n}` }))
  expect(recentKinds(many, NOW, 10).length).toBe(10)
})

test('matching: every word must be in the title; the closest titles are for a miss', () => {
  const never = () => 0
  expect(matchTitles('without proof', EXPLAIN_TITLES, never)).toEqual(['Claude said done without proof'])
  expect(matchTitles('HELD risky', EXPLAIN_TITLES, never)).toEqual(['Held a risky command'])
  expect(matchTitles('', EXPLAIN_TITLES, never)).toEqual([])
  expect(matchTitles('zzzz', EXPLAIN_TITLES, never)).toEqual([])
  const recent = (t: string) => (t === 'Held a package install' ? 5 : 0)
  expect(matchTitles('held', EXPLAIN_TITLES, recent)[0]).toBe('Held a package install')
  const near = closestTitles('said done without prof', EXPLAIN_TITLES, 5, never)
  expect(near.length).toBe(5)
  expect(near[0]).toBe('Claude said done without proof')
})

function memIo(seed: Record<string, unknown> = {}, now = NOW) {
  const mem = new Map<string, unknown>(Object.entries(seed))
  const io: Io = {
    now: async () => now,
    home: async () => '',
    sessionId: async () => 'me',
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem }
}

const audit = (what: string, ago: number, detail?: string): AuditRow => ({ at: NOW - ago, what, how: 'auto', ...(detail === undefined ? {} : { detail }) })
const ledger = (what: string, ago: number, did = true, detail?: string): Entry => ({ at: NOW - ago, what, how: 'auto', ...(did ? { did: true } : {}), ...(detail === undefined ? {} : { detail }) })

test('with no words: the different things done today, then the hint', async () => {
  const w = memIo({
    [AUDIT_KEY]: [audit('Claude said done without proof', HOUR), audit('Claude said done without proof', 2 * HOUR), audit('Held a risky command', 3 * HOUR), audit('Held a risky command', 2 * DAY)],
    [LEDGER_KEY]: [ledger('Claude said done without proof', HOUR), ledger('Kept the cache warm', 20 * MIN), ledger('auto-shorten starts', 5 * MIN, false)],
  })
  const text = await explainText(w.io, '')
  const lines = text.split('\n')
  expect(lines[0]).toBe('Today vaken did 3 different things:')
  expect(lines.slice(1, 4)).toEqual(['  Kept the cache warm (once today)', '  Claude said done, but no check backs it (2 times today)', '  Stopped a risky command (once today)'])
  expect(lines[4]).toBe('Say /vaken-explain <words> for the reason.')
  expect(text).not.toMatch(/auto-compact/)
  expect(await explainText(memIo().io, '')).toMatch(/nothing today/)
})

test('with words: the title, the three sentences and the last times from the audit', async () => {
  const w = memIo({
    [AUDIT_KEY]: [audit('Claude said done without proof', 10 * MIN, '1 claim: tests pass.'), audit('Claude said done without proof', 2 * DAY, 'old'), audit('Held a risky command', HOUR, 'rm -r build')],
  })
  const text = await explainText(w.io, 'without proof')
  const lines = text.split('\n')
  expect(lines[0]).toBe('Claude said done, but no check backs it (2 times in 7 days)')
  expect(lines[1]).toMatch(/^What it means: /)
  expect(lines[2]).toMatch(/^Why: /)
  expect(lines[3]).toMatch(/^What you can do: /)
  expect(text).toMatch(/10 min ago: 1 claim: tests pass\./)
  expect(text).toMatch(/2 d ago: old/)
  expect(text).not.toMatch(/rm -r build/)
  expect(lines.length).toBeLessThanOrEqual(14)
  expect((await explainText(w.io, 'Claude said done without proof 5 times.')).split('\n')[0]).toBe('Claude said done, but no check backs it (2 times in 7 days)')
})

test('words that match several titles: the most recent one, and the others named', async () => {
  const w = memIo({ [AUDIT_KEY]: [audit('Held a package install', HOUR)] })
  const text = await explainText(w.io, 'held')
  expect(text.split('\n')[0]).toMatch(/^Stopped a package install \(once in 7 days\)/)
  expect(text).toMatch(/Also matches: .*; .* and \d+ more\./)
  expect(text.split('\n').length).toBeLessThanOrEqual(14)
})

test('words that match nothing: it says so and lists 5 close titles', async () => {
  const text = await explainText(memIo().io, 'zebra')
  const lines = text.split('\n')
  expect(lines[0]).toBe('Nothing matches "zebra".')
  expect(lines.filter(l => l.startsWith('  ')).length).toBe(5)
  expect(lines.length).toBeLessThanOrEqual(14)
  expect((await explainText(memIo().io, 'q'.repeat(300))).split('\n')[0]?.length).toBeLessThan(60)
})

test('a title that is only in the audit (no explanation yet) still answers', async () => {
  const w = memIo({ [AUDIT_KEY]: [audit('Brand new thing', HOUR, 'a detail')] })
  const text = await explainText(w.io, 'brand')
  expect(text).toMatch(/^Brand new thing \(once in 7 days\)/)
  expect(text).toMatch(/no explanation for this line yet/)
  expect(text).toMatch(/1 h ago: a detail/)
})

test('the ledger rows with the did mark are read when the audit lacks them; the command catches a broken store', async () => {
  const w = memIo({ [LEDGER_KEY]: [ledger('Held a risky command', HOUR, true, 'rm -r x'), ledger('Held a risky command', 2 * HOUR, false)] })
  expect((await didRows(w.io)).length).toBe(1)
  const bad: Io = { ...w.io, get: async () => { throw new Error('store down') } }
  let threw = false
  try {
    await explainText(bad, '')
  } catch {
    threw = true
  }
  expect(threw).toBe(true)
})

// ---- the command through the engine (it exists once register.tsx calls registerExplain)

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

const run = async ($: EngineInterface, args = ''): Promise<string> => ((await $.command.run({ command: 'vaken-explain', args } as never)) as { text: string }).text

test('/vaken-explain answers through the engine ', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  mem.set(AUDIT_KEY, [audit('Claude said done without proof', HOUR, '1 claim: tests pass.')])
  const text = await run($, 'without proof')
  expect(text).toMatch(/^Claude said done, but no check backs it \(once in 7 days\)/)
  expect(text).toMatch(/What you can do: /)
})
