// Cost and burn, why it cost this, the limit consequence and the budgets.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { WARN_AT, budgetLines, isCostly, levelOf, noteText, optionNumber, parseAsk, readings, rises, stopReason, toExtend, worst, ymd } from '../hooks/core/budget'
import type { Level, Which } from '../hooks/core/budget'
import { BURN_MIN_SPAN_MS, COST_SETTINGS, LONG_TOOL_CHARS, addSample, addTool, addTurn, burnPerHour, costText, emptyState, estimateTotal, parseState, spendOf, turnOf, whyText } from '../hooks/core/cost'
import { limitsText, resetWords, runningNow } from '../hooks/core/costlimits'
import { estimateUsd, money, priceName, priceOf } from '../hooks/core/prices'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')
const near = (a: number | undefined, b: number): void => expect(Math.abs((a ?? Number.NaN) - b) < 1e-6).toBe(true)

test('a price is found by the model id; an unknown model has none and is never turned into zero', () => {
  expect(priceOf('claude-sonnet-5-5')).toEqual({ input: 2, output: 10, read: 0.2, write: 2.5 })
  expect(priceOf('claude-opus-5-5')?.input).toBe(4)
  expect(priceOf('claude-opus-4-8')?.input).toBe(5)
  expect(priceOf('claude-haiku-5-5')?.output).toBe(0.5)
  expect(priceName('claude-fable-5-1')).toBe('Fable')
  expect(priceOf('some-other-model')).toBeUndefined()
  expect(priceOf(undefined)).toBeUndefined()
  expect(estimateUsd('some-other-model', { input: 1000, output: 1000, read: 0, write: 0 })).toBeUndefined()
})

test('a turn is priced from its tokens: 1M of each kind on Sonnet 5.5 is the sum of the four rates', () => {
  near(estimateUsd('claude-sonnet-5-5', { input: 1e6, output: 1e6, read: 1e6, write: 1e6 }), 2 + 10 + 0.2 + 2.5)
  expect(money(4.2)).toBe('$4.20')
  expect(money(0.035)).toBe('$0.035')
  expect(money(0.0042)).toBe('$0.0042')
})

test('a turn without usage, or with all zeros, counts nothing; a model with no price counts as unpriced', () => {
  expect(turnOf(undefined, NOW, 1000, false)).toBeUndefined()
  expect(turnOf({ model: 'claude-sonnet-5-5', input_tokens: 0, output_tokens: 0 }, NOW, 1000, false)).toBeUndefined()
  const s = emptyState(NOW)
  addTurn(s, turnOf({ model: 'mystery', input_tokens: 10, output_tokens: 20 }, NOW, 1000, false)!)
  expect(s.main.turns).toBe(1)
  expect(s.main.unpriced).toBe(1)
  expect(estimateTotal(s)).toBe(0)
})

function busy(): ReturnType<typeof emptyState> {
  const s = emptyState(NOW - 60 * MIN)
  const m = 'claude-sonnet-5-5'
  addTurn(s, turnOf({ model: m, input_tokens: 2000, output_tokens: 3000, cache_read_input_tokens: 400_000, cache_creation_input_tokens: 5000 }, NOW - 50 * MIN, 9000, false)!)
  addTurn(s, turnOf({ model: m, input_tokens: 500, output_tokens: 800, cache_read_input_tokens: 600_000, cache_creation_input_tokens: 80_000 }, NOW - 30 * MIN, 9000, false)!)
  addTurn(s, turnOf({ model: m, input_tokens: 100, output_tokens: 400, cache_read_input_tokens: 90_000, cache_creation_input_tokens: 1000 }, NOW - 10 * MIN, 4000, false)!)
  addTurn(s, turnOf({ model: m, input_tokens: 300, output_tokens: 6000, cache_read_input_tokens: 50_000, cache_creation_input_tokens: 2000 }, NOW - 5 * MIN, 4000, true)!)
  addTool(s, 100)
  addTool(s, LONG_TOOL_CHARS + 1)
  return s
}

test('totals add up by group, and the biggest turns are kept', () => {
  const s = busy()
  expect(s.main.turns).toBe(3)
  expect(s.sub.turns).toBe(1)
  expect(s.top[0]?.write).toBe(80_000)
  expect(s.tools).toEqual({ n: 2, long: 1 })
  near(s.main.usd.read, (1_090_000 * 0.2) / 1e6)
  expect(estimateTotal(s)).toBeGreaterThan(0)
})

test('the burn needs about 3 minutes of readings and reports dollars an hour', () => {
  const s = emptyState(NOW - 30 * MIN)
  addSample(s, NOW - 10 * MIN, 1)
  expect(burnPerHour(s.samples, NOW)).toBeUndefined()
  addSample(s, NOW - 10 * MIN + BURN_MIN_SPAN_MS - 1000, 1.1)
  expect(burnPerHour(s.samples, NOW)).toBeUndefined()
  addSample(s, NOW, 2)
  near(burnPerHour(s.samples, NOW), 6)
  const old = emptyState(NOW)
  addSample(old, NOW - 60 * MIN, 1)
  addSample(old, NOW, 5)
  expect(burnPerHour(old.samples, NOW)).toBeUndefined()
})

test('the spend is the engine total when there is one, else the estimate, and says which', () => {
  const s = busy()
  expect(spendOf(s).source).toBe('estimate')
  addSample(s, NOW, 7.5)
  expect(spendOf(s)).toEqual({ usd: 7.5, source: 'engine' })
})

test('a state read back from the store survives odd input', () => {
  expect(parseState(undefined, NOW).main.turns).toBe(0)
  expect(parseState('x', NOW).extra).toBe(0)
  const back = parseState(JSON.parse(JSON.stringify(busy())), NOW)
  expect(back.main.turns).toBe(3)
  expect(back.recent.length).toBe(4)
})

test('the cost text calls every dollar an estimate and shows the source and the age', () => {
  const s = busy()
  addSample(s, NOW - 2 * MIN, 3.1)
  const text = costText({ state: s, now: NOW, model: 'claude-sonnet-5-5', day: { usd: 9.1, sessions: 3 }, budget: ['Budget: off. Turn it on: Settings > Money and plan.'] })
  expect(text).toMatch(/estimates/)
  expect(text).toMatch(/This session: \$3\.10 so far\. Source: the engine's own total, read 2 min ago/)
  expect(text).toMatch(/Burn: not enough readings/)
  expect(text).toMatch(/Last answer: .* \(estimate\)|Last answer: about \$/)
  expect(text).toMatch(/Today: \$9\.10 over 3 sessions/)
  expect(text).toMatch(/list price of Sonnet 5, table of 9 Oct 2026/)
  expect(text).toMatch(/not billed per token/)
})

test('with no engine total the text says so and shows only the estimate from tokens', () => {
  const text = costText({ state: busy(), now: NOW, model: 'claude-sonnet-5-5', budget: [] })
  expect(text).toMatch(/the engine has not given a total yet\. From tokens, about \$/)
  expect(costText({ state: emptyState(NOW), now: NOW, model: 'mystery', budget: [] })).toMatch(/Last answer: none counted yet/)
})

test('the why paragraph names the biggest cost, the cache reads and writes, subagents and long tool output', () => {
  const text = whyText(busy())
  expect(text).toMatch(/In 4 answers this session cost about \$/)
  expect(text).toMatch(/was reading the saved session from the cache/)
  expect(text).toMatch(/Cache reads: 1\.1M tokens/)
  expect(text).toMatch(/Cache writes: 88k tokens/)
  expect(text).toMatch(/Agents ran 1 answer and made \d+% of the cost/)
  expect(text).toMatch(/1 of 2 tool results were long/)
  expect(text).toMatch(/biggest answers made/)
  expect(whyText(emptyState(NOW))).toMatch(/Nothing counted yet/)
})

test('the why paragraph without a price gives tokens and says there is no dollar figure', () => {
  const s = emptyState(NOW)
  addTurn(s, turnOf({ model: 'mystery', input_tokens: 10, output_tokens: 2000, cache_read_input_tokens: 5000 }, NOW, 1, false)!)
  expect(whyText(s)).toMatch(/No price is known for this model, so there is no dollar figure/)
})

test('budget levels: ok under 80%, warn from 80%, over from 100%', () => {
  expect(WARN_AT).toBe(0.8)
  expect(levelOf(0.79)).toBe('ok')
  expect(levelOf(0.8)).toBe('warn')
  expect(levelOf(1)).toBe('over')
})

test('only a rise is told once, and a fall (an extend) lets it warn again', () => {
  const told: Record<Which, Level> = { session: 'ok', day: 'ok' }
  const facts = (usd: number, limit: number) => ({ mode: 'warn', source: 'engine' as const, session: { usd, limit }, day: { usd: 1, limit: 50 } })
  expect(rises(told, readings(facts(10, 25))).length).toBe(0)
  expect(rises(told, readings(facts(20, 25))).map(r => r.level)).toEqual(['warn'])
  expect(rises(told, readings(facts(21, 25))).length).toBe(0)
  expect(rises(told, readings(facts(25, 25))).map(r => r.level)).toEqual(['over'])
  expect(rises(told, readings(facts(26, 25))).length).toBe(0)
  expect(rises(told, readings(facts(26, 50))).length).toBe(0)
  expect(told.session).toBe('ok')
  expect(rises(told, readings(facts(41, 50))).map(r => r.level)).toEqual(['warn'])
})

test('off reads nothing; the worst budget is the one closest to its limit', () => {
  expect(readings({ mode: 'off', source: 'engine', session: { usd: 99, limit: 5 } })).toEqual([])
  const list = readings({ mode: 'stop', source: 'engine', session: { usd: 5, limit: 25 }, day: { usd: 45, limit: 50 } })
  expect(worst(list)?.which).toBe('day')
  expect(worst([])).toBeUndefined()
})

test('only a subagent or a workflow is costly', () => {
  expect(isCostly('Agent')).toBe(true)
  expect(isCostly('Task')).toBe(true)
  expect(isCostly('Workflow')).toBe(true)
  expect(isCostly('Bash')).toBe(false)
  expect(isCostly('Agent2')).toBe(false)
})

test('the notes and the refusal call the figures estimates and tell Claude to ask the person', () => {
  const r = readings({ mode: 'stop', source: 'engine', session: { usd: 26, limit: 25 } })[0]!
  expect(noteText(r, 'stop')).toMatch(/estimate/)
  expect(noteText(r, 'stop')).toMatch(/stopped now/)
  expect(noteText(r, 'warn')).not.toMatch(/stopped now/)
  expect(stopReason('Agent', r)).toMatch(/Tell the person and ask/)
  expect(stopReason('Agent', r)).toMatch(/\/vaken-usage budget extend/)
  const w = readings({ mode: 'warn', source: 'engine', session: { usd: 20, limit: 25 } })[0]!
  expect(noteText(w, 'warn')).toMatch(/80% of the session cost budget/)
})

test('the command is parsed: status, extend, extend of one budget; anything else is told how', () => {
  expect(parseAsk('')).toEqual({ kind: 'status' })
  expect(parseAsk('extend')).toEqual({ kind: 'extend' })
  expect(parseAsk(' Extend DAY ')).toEqual({ kind: 'extend', which: 'day' })
  expect(parseAsk('extend week').kind).toBe('bad')
  expect(parseAsk('spend').kind).toBe('bad')
})

test('an extend raises the named budget, or every budget at 80% or more', () => {
  const list = readings({ mode: 'stop', source: 'engine', session: { usd: 26, limit: 25 }, day: { usd: 5, limit: 50 } })
  expect(toExtend({}, list)).toEqual(['session'])
  expect(toExtend({ which: 'day' }, list)).toEqual(['day'])
  expect(toExtend({}, readings({ mode: 'stop', source: 'engine', session: { usd: 1, limit: 25 } }))).toEqual([])
})

test('the budget lines say the mode, both budgets, what was extended and the source', () => {
  const f = { mode: 'stop', source: 'engine' as const, session: { usd: 12.3, limit: 50 }, day: { usd: 31, limit: 50 } }
  const lines = budgetLines(f, { session: 25, day: 0 }, 4).join('\n')
  expect(lines).toMatch(/Budget: stop/)
  expect(lines).toMatch(/Session: about \$12\.30 of \$50\.00 \(\$25\.00 plus \$25\.00 extended\), 24% \(estimate; source: the engine's session total\)/)
  expect(lines).toMatch(/Day: about \$31\.00 of \$50\.00, 62%, 4 sessions/)
  expect(budgetLines({ mode: 'off', source: 'engine' }, { session: 0, day: 0 })[0]).toMatch(/Budget: off/)
})

test('a kept option counts only when it is one of the options; the day is the local calendar day', () => {
  expect(optionNumber('50', [5, 10, 25, 50], 25)).toBe(50)
  expect(optionNumber('7', [5, 10, 25, 50], 25)).toBe(25)
  expect(optionNumber(undefined, [5, 10, 25, 50], 25)).toBe(25)
  expect(ymd(new Date(2026, 9, 3, 23, 59).getTime())).toBe('2026-10-03')
})

test('the settings rows: keys, defaults and choices', () => {
  expect(COST_SETTINGS.map(s => [s.key, s.default])).toEqual([['cost.budget', 'warn'], ['cost.session', '25'], ['cost.day', '50'], ['cost.why', 'on']])
  expect(COST_SETTINGS.find(s => s.key === 'cost.session')?.options.map(o => o.value)).toEqual(['5', '10', '25', '50', '100'])
  expect(COST_SETTINGS.find(s => s.key === 'cost.day')?.options.map(o => o.value)).toEqual(['10', '25', '50', '100', '200'])
})

const usage = (percent: number, resetsAt: string) => ({ at: NOW - 3 * MIN, plan: 'Max', windows: [{ label: '5-hour', percent, resetsAt }, { label: 'Weekly (all models)', percent: 20, resetsAt: '2026-10-14T09:00:00Z' }] })

test('a limit text says the percent left, the reset, how many sessions stall and how to share', () => {
  const text = limitsText({ usage: usage(62, '2026-10-10T14:00:00Z'), history: {}, running: { count: 3, source: 'vaken' }, spenders: [['App', 4.2], ['Docs', 1.1]], now: NOW })
  expect(text).toMatch(/Source: the app usage card, read 3 min ago/)
  expect(text).toMatch(/5-hour: 62% used, 38% left\. It resets .* \(in 2 h 0 min\)/)
  expect(text).toMatch(/At the pace so far/)
  expect(text).toMatch(/3 sessions running now/)
  expect(text).toMatch(/Spending most, by the engine's totals: App \$4\.20, Docs \$1\.10/)
  expect(text).toMatch(/To share what is left/)
})

test('at 100% every running session is said to be stalled until the reset', () => {
  const text = limitsText({ usage: usage(100, '2026-10-10T14:00:00Z'), history: {}, running: { count: 2, source: 'app' }, spenders: [], now: NOW })
  expect(text).toMatch(/The 5-hour limit is reached\. All 2 sessions that run are stalled/)
})

test('with plenty left nothing needs sharing; with no reading the text says so', () => {
  const text = limitsText({ usage: usage(10, '2026-10-10T16:00:00Z'), history: {}, running: { count: 1, source: 'vaken' }, spenders: [], now: NOW })
  expect(text).toMatch(/Plenty is left\. Nothing to share yet/)
  expect(limitsText({ usage: undefined, history: {}, running: { count: 0, source: 'vaken' }, spenders: [], now: NOW })).toMatch(/not known yet/)
})

test('a fast pace says when the limit is reached, before the reset, as an estimate', () => {
  const text = limitsText({ usage: usage(90, '2026-10-10T13:00:00Z'), history: {}, running: { count: 2, source: 'vaken' }, spenders: [], now: NOW })
  expect(text).toMatch(/runs out about \d\d:\d\d, before the reset \(estimate\)/)
  expect(text).toMatch(/the 2 sessions that run stop until the reset/)
})

test('the reset is worded in minutes and hours, and with a weekday when it is further than a day', () => {
  expect(resetWords('2026-10-10T12:30:00Z', NOW)).toMatch(/\(in 30 min\)/)
  expect(resetWords('2026-10-14T09:00:00Z', NOW)).toMatch(/It resets (Sun|Mon|Tue|Wed|Thu|Fri|Sat) /)
  expect(resetWords(undefined, NOW)).toMatch(/not known/)
})

test('running sessions come from the fresh app list, else from vaken records', () => {
  const rec = (id: string, state: 'working' | 'idle', age: number) => ({ sessionId: id, cwd: '/w', model: 'm', state, startedAt: NOW - 99 * MIN, updatedAt: NOW - age, lastEventAt: NOW - age, stateSince: NOW - age }) as never
  const records = [rec('a', 'working', 5_000), rec('b', 'working', 10 * MIN), rec('c', 'idle', 1000)]
  expect(runningNow(records, undefined, NOW)).toEqual({ count: 1, source: 'vaken' })
  const app = { at: NOW - MIN, sessions: [{ id: '1', title: '', cwd: '/a', isRunning: true }, { id: '2', title: '', cwd: '/b', isRunning: true }, { id: '3', title: '', cwd: '/c', isRunning: false }] }
  expect(runningNow(records, app, NOW)).toEqual({ count: 2, source: 'app' })
  expect(runningNow(records, { ...app, at: NOW - 60 * MIN }, NOW).source).toBe('vaken')
})

function memStore(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:upgrade:tipsdefaults': 'done', ...seed }))
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

function world(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
  mock.clock(on, { now: NOW })
  const mem = memStore(on, seed)
  mock.session(on)
  mock.env(on, { HOME: '/home/test' })
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-sonnet-5-5' }))
  on('session.usage', () => ({ value: { startedAt: NOW - 5 * MIN, context: { window: 1_000_000 }, rateLimits: [], cost: { usd: 0 } } }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', () => ({ result: 'ok', text: 'ok', ref: 1 }) as never)
  return mem
}

const turnEvent = (over: Record<string, unknown> = {}) => ({ answer: 'x', durationMs: 5000, isAborted: false, turnId: 't1', reason: 'answer', usage: { model: 'claude-sonnet-5-5', input_tokens: 1000, output_tokens: 2000, cache_read_input_tokens: 100_000, cache_creation_input_tokens: 5000 }, ...over }) as never
const measure = (usd: number) => ({ context: { window: 1_000_000, tokens: 100_000, percent: 10 }, rateLimits: [], cost: { usd }, changed: ['cost'] }) as never
const agentCall = { tool: 'Agent', prompt: 'p', description: 'd', subagent_type: 'general-purpose' } as never

test('/vaken-usage cost shows the engine total after a reading and an estimated turn', SLOW, async ($, on) => {
  world(on)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.session.measure(measure(1.5))
  await $.turn.complete(turnEvent())
  const r = (await $.command.run(viaParent('vaken-cost', '') as never)) as { text: string }
  expect(r.text).toMatch(/This session: \$1\.50 so far\. Source: the engine's own total, read just now/)
  expect(r.text).toMatch(/Last answer: about \$0\.0\d+/)
  expect(r.text).toMatch(/Today: \$1\.50 over 1 session/)
  expect(r.text).toMatch(/Budget: warn\. At 80% and at 100% you are warned/)
})

test('/vaken-usage why builds the paragraph, and says it is off when the setting is off', async ($, on) => {
  world(on)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.turn.complete(turnEvent())
  const r = (await $.command.run(viaParent('vaken-why', '') as never)) as { text: string }
  expect(r.text).toMatch(/In 1 answers this session cost about/)
  expect(r.text).toMatch(/Estimate\./)
})

test('/vaken-usage why is off when the setting says off', async ($, on) => {
  world(on, { 'cockpit:setting:cost.why': 'off' })
  const r = (await $.command.run(viaParent('vaken-why', '') as never)) as { text: string }
  expect(r.text).toMatch(/is off\. Turn it on: Settings > Money and plan/)
})

test('/vaken-usage limits reads the stored usage card and the running sessions', async ($, on) => {
  const seed = {
    'cockpit:usage:app': { at: NOW - MIN, plan: 'Max', windows: [{ label: '5-hour', percent: 62, resetsAt: '2026-10-10T14:00:00Z' }] },
    'cockpit:session:s1': { sessionId: 's1', cwd: '/work/app', model: 'm', state: 'working', startedAt: NOW - 30 * MIN, updatedAt: NOW - 1000, lastEventAt: NOW - 1000, stateSince: NOW - 30 * MIN, costUsd: 2.5 },
  }
  world(on, seed)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  const r = (await $.command.run(viaParent('vaken-limits', '') as never)) as { text: string }
  expect(r.text).toMatch(/5-hour: 62% used, 38% left/)
  expect(r.text).toMatch(/1 session running now/)
})

test('Warn: at 80% one toast and one ledger line, and Claude hears nothing; the costly call still runs', async ($, on) => {
  const mem = world(on, { 'cockpit:setting:cost.budget': 'warn', 'cockpit:setting:cost.session': '5' })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.session.measure(measure(4.2))
  const first = await $.tool.call({ tool: 'Read', file_path: '/work/app/a.ts' })
  expect(JSON.stringify(first)).not.toMatch(/cost budget/)
  const agent = await $.tool.call(agentCall)
  expect(JSON.stringify(agent)).not.toMatch(/blocked/)
  const ledger = mem.get('cockpit:ledger:compact') as Array<{ what: string; did?: boolean }>
  expect(ledger.map(l => l.what)).toEqual(['Warned about the budget'])
})

test('Warn with All checks: at 80% one note for Claude on the next tool result, once', async ($, on) => {
  const mem = world(on, { 'cockpit:setting:cost.budget': 'warn', 'cockpit:setting:claude.notes': 'all', 'cockpit:setting:cost.session': '5' })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.session.measure(measure(4.2))
  const first = await $.tool.call({ tool: 'Read', file_path: '/work/app/a.ts' })
  expect(JSON.stringify(first)).toMatch(/84% of the session cost budget/)
  const second = await $.tool.call({ tool: 'Read', file_path: '/work/app/b.ts' })
  expect(JSON.stringify(second)).not.toMatch(/cost budget/)
  const agent = await $.tool.call(agentCall)
  expect(JSON.stringify(agent)).not.toMatch(/blocked/)
  const ledger = mem.get('cockpit:ledger:compact') as Array<{ what: string; did?: boolean }>
  expect(ledger.map(l => l.what)).toEqual(['Warned about the budget'])
  expect(ledger[0]?.did).toBe(true)
})

test('Stop: at 100% a subagent call is refused with a reason and one ledger line; a read still runs; extend lifts it', async ($, on) => {
  const mem = world(on, { 'cockpit:setting:cost.budget': 'stop', 'cockpit:setting:cost.session': '5' })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.session.measure(measure(5.3))
  const denied = (await $.tool.call(agentCall)) as { deny?: string }
  expect(denied.deny).toMatch(/Vaken stopped this Agent call/)
  expect(denied.deny).toMatch(/Tell the person and ask/)
  await $.tool.call(agentCall)
  const read = (await $.tool.call({ tool: 'Read', file_path: '/work/app/a.ts' })) as { deny?: string }
  expect(read.deny).toBeUndefined()
  let ledger = mem.get('cockpit:ledger:compact') as Array<{ what: string; did?: boolean }>
  expect(ledger.map(l => l.what)).toEqual(['Held a call over budget', 'Warned about the budget'])

  const status = (await $.command.run(viaParent('vaken-budget', '') as never)) as { text: string }
  expect(status.text).toMatch(/Budget: stop/)
  expect(status.text).toMatch(/Session: about \$5\.30 of \$5\.00/)
  const ext = (await $.command.run(viaParent('vaken-budget', 'extend') as never)) as { text: string }
  expect(ext.text).toMatch(/Extended: session budget \+\$5\.00, now \$10\.00/)
  const allowed = (await $.tool.call(agentCall)) as { deny?: string }
  expect(allowed.deny).toBeUndefined()
  ledger = mem.get('cockpit:ledger:compact') as Array<{ what: string; did?: boolean }>
  expect(ledger[0]?.what).toBe('Extended the budget')
  expect(ledger[0]?.did).toBe(true)
})

test('Off: nothing is refused or warned, however much was spent', async ($, on) => {
  const mem = world(on, { 'cockpit:setting:cost.budget': 'off', 'cockpit:setting:cost.session': '5' })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.session.measure(measure(50))
  const agent = (await $.tool.call(agentCall)) as { deny?: string }
  expect(agent.deny).toBeUndefined()
  expect(mem.get('cockpit:ledger:compact')).toBeUndefined()
  const ext = (await $.command.run(viaParent('vaken-budget', 'extend') as never)) as { text: string }
  expect(ext.text).toMatch(/budget is off/)
})

test('the day budget counts what this session spent today, and extend of the day raises it', async ($, on) => {
  world(on, { 'cockpit:setting:cost.budget': 'stop', 'cockpit:setting:cost.day': '10', 'cockpit:setting:cost.session': '100' })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.session.measure(measure(10.5))
  const denied = (await $.tool.call(agentCall)) as { deny?: string }
  expect(denied.deny).toMatch(/day cost budget is used up/)
  const ext = (await $.command.run(viaParent('vaken-budget', 'extend day') as never)) as { text: string }
  expect(ext.text).toMatch(/day budget \+\$10\.00, now \$20\.00/)
  expect(((await $.tool.call(agentCall)) as { deny?: string }).deny).toBeUndefined()
})

test('a bad budget command is told how to be written', async ($, on) => {
  world(on)
  const r = (await $.command.run(viaParent('vaken-budget', 'extend week') as never)) as { text: string }
  expect(r.text).toMatch(/Use: \/vaken-usage budget extend \[session\|day\]/)
})
