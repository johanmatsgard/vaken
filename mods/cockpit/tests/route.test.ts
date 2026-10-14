// Routing and its hooks: the job guess, the rule, the quote, the warning before a model switch.
import { expect, mock } from 'claude-code/testing'
import { posix } from './fspath'
import type { On } from 'claude-code'

import {
  MIN_RUNS,
  NO_DATA,
  ROUTE_SETTINGS,
  SUGGEST_GAP_MS,
  addRun,
  agentFilePaths,
  cheapModel,
  definedElsewhere,
  fileModel,
  decideRoute,
  familyOf,
  jobType,
  normalizeStats,
  quoteWords,
  quotes,
  routeMode,
  routeText,
  shouldWarnSwitch,
  suggestDue,
  switchDue,
  switchKey,
  switchWarning,
} from '../hooks/core/route'
import type { SpawnFacts, Stats } from '../hooks/core/route'
import { settingStoreKey } from '../hooks/core/settings'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const MIN = 60_000

test('the job is guessed from the agent type and the first words of the description', () => {
  expect(jobType('Explore', 'Look around')).toBe('lookup')
  expect(jobType('general-purpose', 'Search the repo for settings')).toBe('lookup')
  expect(jobType('general-purpose', 'Read the config files')).toBe('lookup')
  expect(jobType('general-purpose', 'List open branches')).toBe('lookup')
  expect(jobType('general-purpose', 'Summarize the log')).toBe('lookup')
  expect(jobType('Plan', 'Work out the steps')).toBe('deep')
  expect(jobType('general-purpose', 'Review the diff')).toBe('deep')
  expect(jobType('general-purpose', 'Design the settings page')).toBe('deep')
  expect(jobType('general-purpose', 'Architecture options')).toBe('deep')
  // Finding where something is, is a lookup; a helper that also changes something is not, unless it is the read-only Explore type.
  expect(jobType('general-purpose', 'Find the settings code')).toBe('lookup')
  expect(jobType('general-purpose', 'Locate the router')).toBe('lookup')
  expect(jobType('general-purpose', 'Find the bug and fix it')).toBe('normal')
  expect(jobType('general-purpose', 'Look at the header and update the colours')).toBe('normal')
  expect(jobType('Explore', 'Find where we add tokens')).toBe('lookup')
  expect(jobType('general-purpose', 'Check the tests pass')).toBe('normal')
  expect(jobType('general-purpose', 'Fix the failing test')).toBe('normal')
  expect(jobType('general-purpose', 'Implement the quote')).toBe('normal')
})

test('deep wins over lookup, and only the first words of the description count', () => {
  expect(jobType('Explore', 'Review the design')).toBe('deep')
  expect(jobType('general-purpose', 'Fix the bug that makes the search slow today please')).toBe('normal')
  expect(jobType('general-purpose', '')).toBe('normal')
})

const base: SpawnFacts = { mode: 'auto', cheap: 'haiku', job: 'lookup', parentModel: 'claude-opus-4-1', fork: false, isTeammate: false, isWorkflow: false }

test('Auto rewrites a lookup helper with no model of its own; Suggest only says so', () => {
  expect(decideRoute(base)).toEqual({ action: 'rewrite', model: 'haiku' })
  expect(decideRoute({ ...base, cheap: 'sonnet' })).toEqual({ action: 'rewrite', model: 'sonnet' })
  expect(decideRoute({ ...base, mode: 'suggest' })).toEqual({ action: 'suggest', model: 'haiku' })
  expect(decideRoute({ ...base, mode: 'off' })).toEqual({ action: 'none' })
})

test('deep and normal helpers are never changed, nor a model Claude chose, nor a fork, a teammate or a workflow agent', () => {
  expect(decideRoute({ ...base, job: 'deep' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, job: 'normal' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, model: 'opus' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, model: 'haiku' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, fork: true })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, isTeammate: true })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, isWorkflow: true })).toEqual({ action: 'none' })
})

test('Routing only ever sends down: a Researcher on Opus or Fable never moves a helper up, but a Fable session may send a lookup to Opus', () => {
  expect(decideRoute({ ...base, parentModel: 'claude-sonnet-5', cheap: 'opus' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, parentModel: '', cheap: 'opus' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, parentModel: 'claude-opus-5-5', cheap: 'fable' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, parentModel: 'claude-fable-5-1', cheap: 'opus' })).toEqual({ action: 'rewrite', model: 'opus' })
})

test('nothing is cheaper than a parent that is already cheap', () => {
  expect(decideRoute({ ...base, parentModel: 'claude-haiku-4-5' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, parentModel: 'claude-sonnet-4-5', cheap: 'sonnet' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, parentModel: 'claude-sonnet-4-5' })).toEqual({ action: 'rewrite', model: 'haiku' })
})

test('a helper that a file or a plugin defines is never rewritten, and nothing goes above its own model', () => {
  expect(decideRoute({ ...base, userDefined: true })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, userDefined: false })).toEqual({ action: 'rewrite', model: 'haiku' })
  expect(decideRoute({ ...base, cheap: 'sonnet', ownModel: 'haiku' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, cheap: 'sonnet', ownModel: 'claude-sonnet-4-5' })).toEqual({ action: 'none' })
  expect(decideRoute({ ...base, cheap: 'haiku', ownModel: 'opus' })).toEqual({ action: 'rewrite', model: 'haiku' })
})

test('who defined a type: the offer source or the provider, and the agent file', () => {
  expect(definedElsewhere('built-in', 'engine')).toBe(false)
  expect(definedElsewhere(undefined, undefined)).toBe(false)
  expect(definedElsewhere('userSettings', 'engine')).toBe(true)
  expect(definedElsewhere('plugin', undefined)).toBe(true)
  expect(definedElsewhere(undefined, 'lab')).toBe(true)
  expect(agentFilePaths('scout', '/work/me', ['/work/shop', '/work/shop/'])).toEqual(['/work/me/.claude/agents/scout.md', '/work/shop/.claude/agents/scout.md'])
  expect(agentFilePaths('lab:scout', '/work/me', [])).toEqual([])
  expect(agentFilePaths('../x', '/work/me', [])).toEqual([])
  expect(fileModel('---\nname: scout\nmodel: haiku\n---\nBody')).toBe('haiku')
  expect(fileModel('---\nname: scout\nmodel: "claude-sonnet-4-5" # cheap\n---\nmodel: opus')).toBe('claude-sonnet-4-5')
  expect(fileModel('---\nname: scout\nmodel: inherit\n---\n')).toBeUndefined()
  expect(fileModel('---\nname: scout\n---\nmodel: opus')).toBeUndefined()
  expect(fileModel('no front matter')).toBeUndefined()
})

test('a suggestion is shown once in 10 minutes; one switch is warned about once', () => {
  expect(suggestDue(undefined, NOW)).toBe(true)
  expect(suggestDue(NOW, NOW + SUGGEST_GAP_MS - 1)).toBe(false)
  expect(suggestDue(NOW, NOW + SUGGEST_GAP_MS)).toBe(true)
  const key = switchKey('a', 'b', 150_000)
  expect(switchDue(undefined, key, NOW)).toBe(true)
  expect(switchDue({ key, at: NOW }, key, NOW + 1000)).toBe(false)
  expect(switchDue({ key, at: NOW }, switchKey('b', 'a', 150_000), NOW + 1000)).toBe(true)
  expect(switchDue({ key, at: NOW }, key, NOW + 2 * MIN)).toBe(true)
})

test('the warning needs a warm cache, a window of 100k tokens or more, and a real change of model', () => {
  const f = { cacheWarm: true, contextTokens: 150_000, from: 'claude-opus-4-1', to: 'claude-sonnet-4-5' }
  expect(shouldWarnSwitch(f)).toBe(true)
  expect(shouldWarnSwitch({ ...f, contextTokens: 100_000 })).toBe(true)
  expect(shouldWarnSwitch({ ...f, contextTokens: 99_999 })).toBe(false)
  expect(shouldWarnSwitch({ ...f, cacheWarm: false })).toBe(false)
  expect(shouldWarnSwitch({ ...f, to: f.from })).toBe(false)
  expect(switchWarning(150_000, 0.9)).toBe('A model switch writes the saved session again (150k tokens) and costs about $0.90.')
})

test('the stats count finished helpers per job and model, and a quote needs 3 runs', () => {
  let s: Stats = {}
  for (let n = 0; n < 2; n += 1) s = addRun(s, 'lookup', 'claude-haiku-4-5', 5000, 40_000)
  expect(quotes(s)).toEqual([])
  s = addRun(s, 'lookup', 'claude-haiku-4-5', 5000, 40_000)
  expect(MIN_RUNS).toBe(3)
  expect(s.lookup.haiku).toEqual({ n: 3, out: 15_000, ms: 120_000 })
  expect(quotes(s)).toEqual(['A lookup agent on haiku took about 40 s and 5k tokens on average over 3 runs.'])
  s = addRun(s, 'deep', 'claude-opus-4-1', 100, 1000)
  expect(quotes(s)).toHaveLength(1)
  expect(quoteWords('lookup', 'haiku', { n: 12, out: 60_000, ms: 480_000 })).toBe('A lookup agent on haiku took about 40 s and 5k tokens on average over 12 runs.')
  expect(quoteWords('normal', 'sonnet', { n: 4, out: 4000, ms: 600_000 })).toBe('A normal agent on sonnet took about 3 min and 1k tokens on average over 4 runs.')
})

test('stored stats are read defensively, and hold only numbers', () => {
  expect(normalizeStats(undefined)).toEqual({})
  expect(normalizeStats({ lookup: { haiku: { n: 3, out: 10, ms: 20, secret: 'x' }, bad: 'x', neg: { n: -1, out: 1, ms: 1 } }, other: { a: { n: 1, out: 1, ms: 1 } } })).toEqual({ lookup: { haiku: { n: 3, out: 10, ms: 20 } } })
  expect(familyOf('claude-sonnet-4-5')).toBe('sonnet')
  expect(familyOf('mystery')).toBe('other')
})

test('the settings rows and the text twin', () => {
  expect(ROUTE_SETTINGS.map(s => s.key)).toEqual(['route.mode', 'hints.model'])
  expect(ROUTE_SETTINGS[0].default).toBe('suggest')
  expect(routeMode('auto')).toBe('auto')
  expect(routeMode(undefined)).toBe('off')
  expect(cheapModel('sonnet')).toBe('sonnet')
  expect(cheapModel('opus')).toBe('haiku')
  expect(settingStoreKey('route.mode')).toBe('cockpit:setting:route.mode')
  expect(routeText('suggest', 'haiku', [], {})).toMatch(new RegExp(NO_DATA.slice(0, 30)))
  const t = routeText('auto', 'haiku', ['12:00:00 Sent a lookup agent to a cheaper model: It runs on haiku instead.'], { lookup: { haiku: { n: 12, out: 60_000, ms: 480_000 } } })
  expect(t).toMatch(/Agent models: auto/)
  expect(t).toMatch(/A lookup agent on haiku took about 40 s and 5k tokens on average over 12 runs/)
  expect(t).toMatch(/Last:/)
})

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

const toasts = (on: On): string[] => {
  const shown: string[] = []
  on('ui.toast', (_$, e) => {
    shown.push(e.text)
    return { value: undefined } as never
  })
  return shown
}

const whats = (mem: Map<string, unknown>): string[] => ((mem.get('cockpit:ledger:compact') as Array<{ what: string }> | undefined) ?? []).map(l => l.what)

test('/vaken-tasks route says the settings and that there is not enough data', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const r = (await $.command.run({ ...viaParent('vaken-route', ''), origin: { kind: 'composer' } } as never)) as { text: string }
  expect(r.text).toMatch(/Agent models: suggest\. /)
  expect(r.text).toMatch(/Lookup model: haiku, the Researcher’s model/)
  expect(r.text).toMatch(/Not enough data/)
})

test('Auto sends a lookup helper to the Researcher’s model: All projects, then This session over it; an older Routing choice counts until the Researcher is set', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const seen: Array<string | undefined> = []
  on('agent.spawn', (_$, e) => {
    seen.push(e.model)
    return { model: e.model ?? 'inherit', agentId: `m${seen.length}` } as never
  })
  mem.set(settingStoreKey('route.mode'), 'auto')
  mem.set(settingStoreKey('route.cheap'), 'sonnet')
  await $.agent.spawn({ prompt: 'Find it.', description: 'Search the repo', subagentType: 'Explore' })
  mem.set(settingStoreKey('runner.researcher'), 'haiku')
  await $.agent.spawn({ prompt: 'Find it.', description: 'Search the repo', subagentType: 'Explore' })
  const said = (await $.command.run({ ...viaParent('vaken-settings', 'session runner.researcher sonnet'), origin: { kind: 'composer' } } as never)) as { text: string }
  expect(said.text).toBe('For this session only: runner.researcher is Sonnet.')
  expect(mem.get('cockpit:sessset:test-session')).toEqual({ 'runner.researcher': 'sonnet' })
  await $.agent.spawn({ prompt: 'Find it.', description: 'Search the repo', subagentType: 'Explore' })
  expect(seen).toEqual(['sonnet', 'haiku', 'sonnet'])
  const r = (await $.command.run({ ...viaParent('vaken-route', ''), origin: { kind: 'composer' } } as never)) as { text: string }
  expect(r.text).toMatch(/Lookup model: sonnet \(this session only\)/)
})

test('Auto: a lookup helper is sent to the cheaper model and a ledger line is written; a helper with a model of its own is left alone', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const seen: Array<string | undefined> = []
  on('agent.spawn', (_$, e) => {
    seen.push(e.model)
    return { model: e.model ?? 'inherit', agentId: `a${seen.length}` } as never
  })
  mem.set(settingStoreKey('route.mode'), 'auto')
  await $.agent.spawn({ prompt: 'Find the settings code.', description: 'Search for settings', subagentType: 'Explore' })
  await $.agent.spawn({ prompt: 'Find the settings code.', description: 'Search for settings', subagentType: 'Explore', model: 'opus' })
  await $.agent.spawn({ prompt: 'Plan it.', description: 'Plan the work', subagentType: 'Plan' })
  expect(seen).toEqual(['haiku', 'opus', undefined])
  expect(whats(mem)).toEqual(['Sent a lookup agent to a cheaper model'])
})

test('Auto: a user agent with its own model is not rewritten, a built-in lookup with no file is', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('env.get', () => ({ value: '/work/me' }) as never)
  on('fs.read', (_$, e) => {
    if (posix(e.path) === '/work/me/.claude/agents/scout.md') return { value: '---\nname: scout\nmodel: haiku\n---\nLook things up.' } as never
    throw new Error('no file')
  })
  const seen: Array<string | undefined> = []
  on('agent.spawn', (_$, e) => {
    seen.push(e.model)
    return { model: e.model ?? 'inherit', agentId: `u${seen.length}` } as never
  })
  mem.set(settingStoreKey('route.mode'), 'auto')
  // The Researcher is Sonnet in the map: a rewrite would send the haiku agent up.
  mem.set(settingStoreKey('runner.researcher'), 'sonnet')
  await $.agent.spawn({ prompt: 'Find it.', description: 'Search the repo', subagentType: 'scout' })
  await $.agent.spawn({ prompt: 'Find it.', description: 'Search the repo', subagentType: 'Explore' })
  expect(seen).toEqual([undefined, 'sonnet'])
  expect(whats(mem)).toEqual(['Sent a lookup agent to a cheaper model'])
})

test('Suggest: nothing is changed, one ledger line and no repeat within 10 minutes', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  mem.set(settingStoreKey('route.mode'), 'suggest')
  const seen: Array<string | undefined> = []
  on('agent.spawn', (_$, e) => {
    seen.push(e.model)
    return { model: e.model ?? 'inherit', agentId: `s${seen.length}` } as never
  })
  for (let n = 0; n < 3; n += 1) await $.agent.spawn({ prompt: 'Find it.', description: 'Search the repo', subagentType: 'Explore' })
  expect(seen).toEqual([undefined, undefined, undefined])
  expect(whats(mem)).toEqual(['A lookup agent could run on a cheaper model'])
  const line = (mem.get('cockpit:ledger:compact') as Array<{ did?: boolean }>)[0]
  expect(line.did).toBeUndefined()
})

test('a finished helper adds to the quote', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('agent.spawn', (_$, e) => ({ model: e.model ?? 'inherit', agentId: 'done-1' }) as never)
  on('turn.complete', (_$, e) => ({ text: e.answer }) as never)
  mem.set(settingStoreKey('route.mode'), 'off')
  await $.agent.spawn({ prompt: 'Read it.', description: 'Read the file', subagentType: 'Explore' })
  await $.turn.complete({ answer: 'done', durationMs: 30_000, isAborted: false, turnId: 't1', agentId: 'done-1', reason: 'answer', usage: { model: 'claude-haiku-4-5', input_tokens: 10, output_tokens: 2000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } })
  expect(mem.get('cockpit:route:stats')).toEqual({ lookup: { haiku: { n: 1, out: 2000, ms: 30_000 } } })
})

test('a model switch with a warm cache and a big window gets a warning once; it is never denied', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  mem.set(settingStoreKey('route.mode'), 'off')
  const shown = toasts(on)
  on('classic.PreModelSwitch', () => ({}) as never)
  const switchEvent = { from_model: 'claude-opus-4-1', to_model: 'claude-sonnet-4-5', requested_model: 'sonnet', source: 'command' as const, context_tokens: 150_000, prompt_cache_warm: true, cache_ttl: '5m' as const, estimated_cache_write_usd: 0.9, pricing: 'catalog' as const }
  const a = await $.classic.PreModelSwitch(switchEvent)
  await $.classic.PreModelSwitch(switchEvent)
  expect(JSON.stringify(a)).not.toMatch(/deny/)
  expect(whats(mem)).toEqual(['Warned before a model switch'])
  for (let n = 0; n < 200 && shown.length === 0; n += 1) await Promise.resolve()
  expect(shown).toEqual(['A model switch writes the saved session again (150k tokens) and costs about $0.90.'])
  await $.classic.PreModelSwitch({ ...switchEvent, prompt_cache_warm: false, to_model: 'claude-haiku-4-5' })
  await $.classic.PreModelSwitch({ ...switchEvent, context_tokens: 50_000, to_model: 'claude-fable-1' })
  expect(whats(mem)).toEqual(['Warned before a model switch'])
})
