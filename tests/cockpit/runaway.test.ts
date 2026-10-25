// The runaway step: one shell step that runs 10 minutes gets one calm band line with Stop the answer and Keep waiting.
import { expect, mock } from 'claude-code/testing'
import { SLOW, test } from './slow'
import { BASE_SEEDS, HOME, ROOT, engine } from './statefixtures'
import type { World } from './statefixtures'
import { bandKey, parseItems } from '../hooks/core/band'

import { RUNAWAY_BAND_ID, RUNAWAY_LINE, RUNAWAY_LINE_ESC, RUNAWAY_MS, RUNAWAY_NO_STOP, RUNAWAY_STOP, RUNAWAY_STOPPED, RUNAWAY_WAIT, RUNAWAY_WAITING, runawayLine, runawayMem, runawayNow, silenceRunaway, stepChecked, stepEnd, stepStart, stepsReset } from '../hooks/core/attention'
import { stepHash } from '../hooks/core/allowrules'
import type { BandItem } from '../hooks/core/band'
import { setLang } from '../hooks/core/lang'
import { HomeBand, bandPlan } from '../hooks/features/home/band'
import type { View } from '../hooks/features/home/logic'
import type { El } from '../hooks/ui/kit'
import { byEnglish } from '../hooks/i18n/table'

const MIN = 60_000
const NOW = Date.parse('2026-10-18T12:00:00Z')
const HASH = stepHash('Bash', { command: 'npm run e2e' })

test('the clock: a shell step past 10 minutes is a runaway, in whole minutes; a shorter one is not', () => {
  stepsReset('turn-1')
  stepStart('call-1', HASH, NOW)
  expect(runawayNow(NOW + RUNAWAY_MS - 1)).toBeUndefined()
  expect(runawayNow(NOW + 12 * MIN + 30_000)?.minutes).toBe(12)
  stepEnd('call-1')
  expect(runawayNow(NOW + 12 * MIN)).toBeUndefined()
  // A hash and times only: never the command
  expect(HASH).not.toContain('npm')
  expect(JSON.stringify([...runawayMem.steps.values()])).not.toContain('npm')
  stepsReset()
})

test('Claude Code\'s check: an allowed step counts from the allow; a step that asks the person is never timed', () => {
  stepsReset('turn-1')
  stepStart('call-1', HASH, NOW)
  stepChecked('call-1', 'allow', NOW + 3 * MIN)
  expect(runawayNow(NOW + 12 * MIN)).toBeUndefined()
  expect(runawayNow(NOW + 13 * MIN)?.minutes).toBe(10)
  stepStart('call-2', HASH, NOW)
  stepChecked('call-2', 'ask', NOW)
  stepEnd('call-1')
  expect(runawayNow(NOW + 60 * MIN)).toBeUndefined()
  stepsReset()
})

test('a check that comes before the call is kept by its id: an allowed step counts from the answer, an asked one is never timed', () => {
  stepsReset('turn-1')
  // The check answered at NOW + 3 min, the call came after
  stepChecked('early-1', 'allow', NOW + 3 * MIN)
  stepStart('early-1', HASH, NOW + 4 * MIN)
  expect(runawayNow(NOW + 12 * MIN)).toBeUndefined()
  expect(runawayNow(NOW + 13 * MIN)?.minutes).toBe(10)
  stepEnd('early-1')
  stepChecked('early-2', 'ask', NOW)
  stepStart('early-2', HASH, NOW + MIN)
  expect(runawayNow(NOW + 60 * MIN)).toBeUndefined()
  // A kept check is used once and does not leak into a later step with the same id; a new answer forgets it
  stepEnd('early-2')
  stepStart('early-2', HASH, NOW)
  expect(runawayNow(NOW + 11 * MIN)?.minutes).toBe(11)
  stepChecked('early-3', 'ask', NOW)
  stepsReset('turn-2')
  stepStart('early-3', HASH, NOW)
  expect(runawayNow(NOW + 11 * MIN)?.minutes).toBe(11)
  // Only the decision and the time are kept, never the command
  stepsReset()
})

test('Keep waiting silences only that step; a new answer starts clean', () => {
  stepsReset('turn-1')
  stepStart('call-1', HASH, NOW)
  silenceRunaway(NOW + 11 * MIN)
  expect(runawayNow(NOW + 30 * MIN)).toBeUndefined()
  stepStart('call-2', HASH, NOW + 2 * MIN)
  expect(runawayNow(NOW + 30 * MIN)?.minutes).toBe(28)
  stepsReset('turn-2')
  expect(runawayMem.turnId).toBe('turn-2')
  expect(runawayMem.steps.size).toBe(0)
  expect(runawayMem.silenced).toBeUndefined()
  stepsReset()
})

test('the line: calm words, and how to stop it by hand when vaken cannot', () => {
  expect(runawayLine(12, true)).toBe('A step has run 12 min')
  expect(runawayLine(12, false)).toBe('A step has run 12 min. Esc in the chat stops it.')
  const sv = byEnglish('sv')
  for (const s of [RUNAWAY_LINE, RUNAWAY_LINE_ESC, RUNAWAY_STOP, RUNAWAY_WAIT, RUNAWAY_STOPPED, RUNAWAY_NO_STOP, RUNAWAY_WAITING]) expect(sv[s]).toBeDefined()
})

type N = { type: string; props: Record<string, unknown> }
const mk = (type: string) => (p: Record<string, unknown>): N => ({ type, props: p ?? {} })
const el = { Box: mk('Box'), Text: mk('Text'), Button: mk('Button'), Svg: mk('Svg'), host: { Client: mk('Client') }, drag: true } as unknown as El
function walk(n: unknown, out: N[] = []): N[] {
  if (Array.isArray(n)) for (const c of n) walk(c, out)
  else if (n !== null && typeof n === 'object' && 'type' in n) {
    out.push(n as N)
    walk((n as N).props.children, out)
  }
  return out
}
const line = (text: string): BandItem => ({ id: RUNAWAY_BAND_ID, level: 'info', text, at: NOW, ttlMs: 2 * MIN })
const view = (items: BandItem[]): View => ({ needs: [], working: [], waiting: [], idle: [], now: NOW, band: items })
const BOTH = { stop: true, wait: true }

test('the band: the dim line with Stop the answer and Keep waiting beside it, never amber', () => {
  const plan = bandPlan(view([line(runawayLine(12, true))]), 'short', 100, [], false, false, true, BOTH)
  expect(plan.mode).toBe('line')
  if (plan.mode !== 'line') return
  expect(plan.text).toBe('A step has run 12 min')
  expect(plan.info).toBe(true)
  expect(plan.open?.kind).toBe('stop')
  expect(plan.second?.kind).toBe('wait')
  // Other info lines do not take its presses away
  const more = bandPlan(view([line(runawayLine(12, true)), { id: 'tip', level: 'info', text: 'A tip', at: NOW - MIN, ttlMs: 2 * MIN }]), 'explained', 100, [], false, false, true, BOTH)
  expect(more.mode === 'line' && more.open?.kind).toBe('stop')
  // With no running answer known: only Keep waiting, and the line says how to stop it
  const esc = bandPlan(view([line(runawayLine(12, false))]), 'short', 100, [], false, false, true, { stop: false, wait: true })
  expect(esc.mode === 'line' && esc.open?.kind).toBe('wait')
  expect(esc.mode === 'line' && esc.second).toBeUndefined()
  // Narrow, the Esc sentence goes and the minutes stay whole beside Keep waiting: the line is never cut
  const escNarrow = bandPlan(view([line(runawayLine(12, false))]), 'short', 36, [], false, false, true, { stop: false, wait: true })
  expect(escNarrow.mode === 'line' && escNarrow.text).toBe('A step has run 12 min')
  expect(escNarrow.mode === 'line' && escNarrow.open?.kind).toBe('wait')
  // Narrow: Keep waiting goes first, then Stop the answer; the line stays whole
  const narrow = bandPlan(view([line(runawayLine(12, true))]), 'short', 36, [], false, false, true, BOTH)
  expect(narrow.mode === 'line' && narrow.open?.kind).toBe('stop')
  expect(narrow.mode === 'line' && narrow.second).toBeUndefined()
  const tiny = bandPlan(view([line(runawayLine(12, true))]), 'short', 22, [], false, false, true, BOTH)
  expect(tiny.mode === 'line' && tiny.open).toBeUndefined()
  expect(tiny.mode === 'line' && tiny.text).toBe('A step has run 12 min')
})

test('the presses do what they say, on every surface; Swedish words', () => {
  const pressed: string[] = []
  const step = { stop: () => pressed.push('stop'), wait: () => pressed.push('wait') }
  for (const surface of [el, { ...el, Svg: undefined } as unknown as El]) {
    const tree = HomeBand(surface, view([line(runawayLine(12, true))]), 'short', () => pressed.push('pane'), undefined, undefined, 100, undefined, undefined, undefined, undefined, step)
    const buttons = walk(tree).filter(x => x.type === 'Button')
    const stop = buttons.find(b => String(b.props.label).includes(RUNAWAY_STOP))
    const wait = buttons.find(b => String(b.props.label).includes(RUNAWAY_WAIT))
    ;(stop?.props.onPress as () => void)()
    ;(wait?.props.onPress as () => void)()
  }
  expect(pressed).toEqual(['stop', 'wait', 'stop', 'wait'])
  // Without the step presses, the line keeps the band's usual press
  const plain = walk(HomeBand(el, view([line(runawayLine(12, true))]), 'explained', () => undefined, undefined, undefined, 100)).filter(x => x.type === 'Button')
  expect(plain.some(b => String(b.props.label).includes(RUNAWAY_STOP))).toBe(false)
  setLang('sv')
  try {
    const sv = walk(HomeBand(el, view([line(runawayLine(12, true))]), 'short', () => undefined, undefined, undefined, 100, undefined, undefined, undefined, undefined, step))
    const words = JSON.stringify(sv)
    expect(words).toContain('Ett steg har kört i 12 min')
    expect(words).toContain('Stoppa svaret')
    expect(words).toContain('Vänta vidare')
  } finally {
    setLang('en')
  }
})

// Through the engine: the hooks time a real shell step, the attention check posts the line, and the step's end takes it away
test('through the engine: a Bash step that runs 11 minutes gets its line, and its end clears it', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  // The step runs until the test lets it end; registered before the fixture's quick answer, so it answers first
  let release: () => void = () => undefined
  const gate = new Promise<void>(r => {
    release = r
  })
  on('tool.call', { tool: 'Bash' }, async () => {
    await gate
    return { result: {}, text: 'ok' } as never
  })
  engine(on, w)
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
  await $.turn.start({ text: 'go', turnId: 't1' } as never)
  const line = (): BandItem | undefined => parseItems(w.mem.get(bandKey('test-session'))).find(x => x.id === RUNAWAY_BAND_ID)
  const running = $.tool.call({ tool: 'Bash', command: 'npm run e2e' } as never)
  await clock.advance(5 * MIN)
  await clock.settle()
  expect(line()).toBeUndefined()
  await clock.advance(6 * MIN)
  await clock.settle()
  expect(line()?.text).toBe('A step has run 11 min')
  expect(line()?.level).toBe('info')
  // Never the command in the store
  expect(JSON.stringify([...w.mem.values()])).not.toContain('npm run e2e')
  release()
  await running
  await clock.settle()
  expect(line()).toBeUndefined()
})
