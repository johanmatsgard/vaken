// The first-start setup on the Start here card: five questions, a summary, Finish, Skip, Back and Next, and Settings > Run setup again.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { RECOMMENDED, RISKY_VALUES, RISK_KEYS, SETUP_OPEN_KEY, SETUP_STATE_KEY, SUMMARY_STEP, answersFrom, parseSetupState, setupPress, setupQuestions, setupSteps, setupValues, summaryLines } from '../hooks/features/home/firstsetup'
import type { SetupAnswers } from '../hooks/features/home/firstsetup'
import { WORST_KEYS, findPreset } from '../hooks/core/presets'
import { HABIT_KEYS } from '../hooks/core/tasklist'
import { defaults } from '../hooks/core/settings'
import { columnPt } from '../hooks/ui/tokens'
import { textsOf, walk } from './statefixtures'
import type { Node } from './statefixtures'
import { SLOW, test } from './slow'

const NOW = new Date(2026, 9, 15, 9, 0).getTime()
const props = (wPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: Math.round(wPt / columnPt()), placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} })
type Pane = { drawn: () => Promise<Node>; find: (q: unknown) => Promise<unknown>; press: (q: unknown) => Promise<void>; redraw: (p?: unknown) => Promise<void>; unmount: () => Promise<void> }
type Surface = 'terminal' | 'desktop' | 'vscode' | 'mobile'

function engine(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries(seed))
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  on('store.get', (_$, e) => ({ value: mem.has(e.key) ? JSON.parse(JSON.stringify(mem.get(e.key))) : undefined }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return mem
}
const mount = ($: unknown, surface: Surface = 'desktop', wPt = 600): Promise<Pane> => ($ as { ui: { mount: (o: unknown) => Promise<Pane> } }).ui.mount({ plugin: 'vaken', surface, component: 'Pane', requestId: 'cockpit-home', props: props(wPt) })
const press = async (pane: Pane, key: string): Promise<void> => {
  await pane.redraw()
  await pane.press({ key })
}
const setting = (mem: Map<string, unknown>, key: string): unknown => mem.get(`cockpit:setting:${key}`)
const stateOf = (mem: Map<string, unknown>) => mem.get(SETUP_STATE_KEY) as { step: number; answers: SetupAnswers } | undefined

test('each answer writes its own rows: risky steps, spending, the habits, plain words and long chats', () => {
  const careful = findPreset('careful')!.values
  // Tell me: every rule Warns (the two worst put back to their default Warn, as a preset does), nothing waits
  expect(RISK_KEYS.map(k => setupValues({ ...RECOMMENDED, risky: 'tell' })[k])).toEqual(RISK_KEYS.map(() => 'warn'))
  expect(setupSteps({ ...RECOMMENDED, risky: 'tell' }).filter(st => WORST_KEYS.includes(st.key))).toEqual(WORST_KEYS.map(key => ({ key })))
  expect(RISKY_VALUES.tell).toMatchObject({ 'cap.mode': 'warn', 'away.policy': 'off' })
  // Ask me first: the Ask before risky steps preset's own values
  for (const k of [...RISK_KEYS, 'cap.mode', 'away.policy', 'loop.breaker']) expect(RISKY_VALUES.ask[k], k).toBe(careful[k])
  expect(RISKY_VALUES.ask).toMatchObject({ 'guard.destructive': 'hold', 'cap.mode': 'hold', 'away.policy': 'careful', 'loop.breaker': 'stop' })
  // Don't check: every rule Off
  expect(RISK_KEYS.map(k => RISKY_VALUES.off[k])).toEqual(RISK_KEYS.map(() => 'off'))
  expect(RISKY_VALUES.off).toMatchObject({ 'cap.mode': 'off', 'away.policy': 'off', 'loop.breaker': 'off' })
  for (const spend of ['off', 'warn', 'stop'] as const) expect(setupValues({ ...RECOMMENDED, spend })['cost.budget']).toBe(spend)
  for (const habits of [true, false]) for (const k of HABIT_KEYS) expect(setupValues({ ...RECOMMENDED, habits })[k], k).toBe(habits ? 'on' : 'off')
  expect(setupValues({ ...RECOMMENDED, plain: false })['plain.mode']).toBe('off')
  for (const long of ['auto', 'watch', 'off'] as const) expect(setupValues({ ...RECOMMENDED, long })['compact.mode']).toBe(long)
  // Every row the questions write is a real setting with that value
  const all = defaults()
  for (const k of Object.keys(setupValues({ ...RECOMMENDED, risky: 'ask', spend: 'stop' }))) expect(all[k], k).toBeDefined()
})

test('the recommended answers are Recommended, Tell me, Only show the cost, both habits on, Tell me when (Watch only); a fresh store reads as them', () => {
  expect(RECOMMENDED).toEqual({ tell: 'balanced', risky: 'tell', spend: 'off', habits: true, plain: true, long: 'watch' })
  expect(answersFrom(defaults())).toEqual(RECOMMENDED)
  const qs = setupQuestions({ session: '25', day: '50' })
  expect(qs.map(q => q.step)).toEqual([1, 2, 3, 4, 5])
  for (const q of qs) if (q.kind === 'radio') expect(q.answers.map(a => a.value), q.ask).toContain(q.recommended)
  const spend = qs.find(q => q.step === 3)
  expect(spend?.kind === 'radio' ? spend.answers.find(a => a.value === 'warn')?.note : '').toBe('A note at 80% and 100% of the budget: $25 a session, $50 a day.')
  expect(summaryLines(RECOMMENDED, { session: '25', day: '50' })).toEqual(['How much vaken tells you: Recommended', "Risky steps: Tell me, don't stop", 'Spending: Only show the cost', 'Working habits: On', 'Plain words: On', 'Long chats: Tell me when'])
  // Auto is still offered, right after the recommended answer
  const long = qs.find(q => q.step === 5)
  expect(long?.kind === 'radio' ? long.answers.map(a => a.value) : []).toEqual(['watch', 'auto', 'off'])
})

test('the answers say what they write: the first question uses the Settings mode names, Tell me when is Watch only, Tell me says the worst still wait, the habits switch has a note', () => {
  const qs = setupQuestions({ session: '25', day: '50' })
  const radio = (step: number) => { const q = qs.find(x => x.step === step); return q?.kind === 'radio' ? q.answers : [] }
  expect(radio(1).map(a => a.label)).toEqual(['Only alerts', 'Recommended', 'Everything useful'])
  // Tell me when shows the moment and sends Claude nothing
  expect(radio(5).find(a => a.label === 'Tell me when')?.value).toBe('watch')
  expect(answersFrom({ ...defaults(), 'compact.mode': 'suggest' }).long).toBe('watch')
  // Tell me keeps the two worst kinds at their default, which stops where Claude Code would not ask; its line says so
  expect(radio(2).find(a => a.value === 'tell')?.note).toBe('Warns. The worst steps (deleting a lot, a secret) still wait for you.')
  expect(radio(2).find(a => a.value === 'off')?.note).toContain('no loop breaker')
  const work = qs.find(x => x.step === 4)
  const habits = work?.kind === 'switches' ? work.rows.find(r => r.field === 'habits')?.note : ''
  expect(habits).toBe('For a bigger job, Claude gets one note asking for the habits that are on.')
})

test('Next and Back move one step and keep every answer; a wrong stored place starts again at step 1', () => {
  let s = parseSetupState(undefined, defaults())
  expect(s.step).toBe(1)
  s = setupPress(s, { kind: 'pick', field: 'tell', value: 'full' })
  s = setupPress(s, { kind: 'next' })
  s = setupPress(s, { kind: 'pick', field: 'risky', value: 'ask' })
  s = setupPress(s, { kind: 'pick', field: 'risky', value: 'nonsense' })
  s = setupPress(s, { kind: 'next' })
  s = setupPress(s, { kind: 'back' })
  s = setupPress(s, { kind: 'back' })
  s = setupPress(s, { kind: 'back' })
  expect(s).toEqual({ step: 1, answers: { ...RECOMMENDED, tell: 'full', risky: 'ask' } })
  for (let n = 0; n < 9; n += 1) s = setupPress(s, { kind: 'next' })
  expect(s.step).toBe(SUMMARY_STEP)
  s = setupPress(s, { kind: 'pick', field: 'habits', value: 'off' })
  expect(s.answers.habits).toBe(false)
  expect(parseSetupState({ step: 99, answers: { tell: 'loud' } }, defaults())).toEqual({ step: 1, answers: RECOMMENDED })
  expect(parseSetupState(JSON.parse(JSON.stringify(s)), defaults())).toEqual(s)
})

test('in the pane, Back and Next keep the answers through a redraw and a new mount, and Finish writes them over the mode of step 1', SLOW, async ($, on) => {
  const mem = engine(on)
  let pane = await mount($)
  await press(pane, 'start-mode-full')
  await press(pane, 'start-next')
  await press(pane, 'start-risky-ask')
  await press(pane, 'start-next')
  await press(pane, 'start-spend-warn')
  await press(pane, 'start-back')
  await pane.unmount()
  expect(stateOf(mem)).toEqual({ step: 2, answers: { ...RECOMMENDED, tell: 'full', risky: 'ask', spend: 'warn' } })
  // A new mount keeps the place
  pane = await mount($)
  expect(textsOf(await pane.drawn()).join('\n')).toContain('Step 2 of 5')
  await press(pane, 'start-next')
  await press(pane, 'start-next')
  await press(pane, 'start-plain-switch')
  await press(pane, 'start-next')
  await press(pane, 'start-long-off')
  await press(pane, 'start-next')
  await pane.redraw()
  const summary = textsOf(await pane.drawn()).join('\n')
  for (const line of ['How much vaken tells you: Everything', 'Risky steps: Ask me first', 'Spending: Warn me at a budget', 'Plain words: Off', 'Long chats: Never']) expect(summary).toContain(line)
  await press(pane, 'start-finish')
  await pane.unmount()
  expect(mem.get('cockpit:firstrun')).toBe('done')
  expect(mem.get(SETUP_STATE_KEY)).toBeUndefined()
  // The mode of the first question (Everything useful sends Claude every note), then the other answers on top
  expect(setting(mem, 'claude.notes')).toBe('all')
  expect([setting(mem, 'guard.destructive'), setting(mem, 'cap.mode'), setting(mem, 'away.policy'), setting(mem, 'loop.breaker')]).toEqual(['hold', 'hold', 'careful', 'stop'])
  expect([setting(mem, 'cost.budget'), setting(mem, 'plain.mode'), setting(mem, 'tasks.visible'), setting(mem, 'compact.mode')]).toEqual(['warn', 'off', 'on', 'off'])
  const after = await mount($)
  expect(await after.find({ key: 'start-next' })).toBeUndefined()
  await after.unmount()
})

test('Skip, use recommended on any step writes the recommended answers and closes the card, whatever was picked', SLOW, async ($, on) => {
  const mem = engine(on)
  const pane = await mount($)
  await press(pane, 'start-mode-quiet')
  await press(pane, 'start-next')
  await press(pane, 'start-risky-off')
  await press(pane, 'start-skip')
  await pane.unmount()
  expect(mem.get('cockpit:firstrun')).toBe('done')
  expect(mem.get(SETUP_STATE_KEY)).toBeUndefined()
  // Recommended (balanced) over Only alerts, Tell me over Don't check
  expect(setting(mem, 'recap.mode')).toBe('on')
  expect(setting(mem, 'guard.scope')).toBe('warn')
  expect(setting(mem, 'guard.destructive')).toBeUndefined()
  expect([setting(mem, 'cost.budget'), setting(mem, 'plain.mode'), setting(mem, 'habit.ask'), setting(mem, 'compact.mode')]).toEqual(['off', 'on', 'on', 'watch'])
})

test('Run setup again in Settings opens the Start here card at step 1 with the answers set now chosen; Finish closes it and keeps the first run done', SLOW, async ($, on) => {
  const seed: Record<string, unknown> = { 'cockpit:firstrun': 'done', 'cockpit:setting:cost.budget': 'stop', 'cockpit:setting:plain.mode': 'off', 'cockpit:setting:compact.mode': 'watch' }
  for (const k of RISK_KEYS) seed[`cockpit:setting:${k}`] = 'hold'
  const mem = engine(on, seed)
  let pane = await mount($)
  expect(await pane.find({ key: 'start-next' })).toBeUndefined()
  await pane.press({ key: 'settings' })
  await pane.unmount()
  pane = await mount($)
  expect(await pane.find({ key: 'settings-setup-again' })).toBeDefined()
  expect(textsOf(await pane.drawn()).join('\n')).toContain('The five start questions, with your answers now chosen.')
  await pane.press({ key: 'settings-setup-again' })
  await pane.unmount()
  expect(mem.get(SETUP_OPEN_KEY)).toBe('on')
  pane = await mount($)
  const texts = textsOf(await pane.drawn()).join('\n')
  expect(texts).toContain('Step 1 of 5')
  // Not the first run: no welcome sentence
  expect(texts).not.toContain('Vaken watches your sessions')
  await press(pane, 'start-next')
  expect(stateOf(mem)?.answers).toEqual({ tell: 'balanced', risky: 'ask', spend: 'stop', habits: true, plain: false, long: 'watch' })
  for (let n = 0; n < 4; n += 1) await press(pane, 'start-next')
  await press(pane, 'start-finish')
  await pane.unmount()
  expect(mem.get(SETUP_OPEN_KEY)).toBeUndefined()
  expect(mem.get('cockpit:firstrun')).toBe('done')
  expect([setting(mem, 'cost.budget'), setting(mem, 'guard.tests'), setting(mem, 'compact.mode')]).toEqual(['stop', 'hold', 'watch'])
  const after = await mount($)
  expect(await after.find({ key: 'start-next' })).toBeUndefined()
  await after.unmount()
})

test('every step draws on all four surfaces, at the narrowest and a wide pane, with its own presses', SLOW, async ($, on) => {
  const wanted: Record<number, string[]> = {
    1: ['start-mode-quiet', 'start-mode-balanced', 'start-mode-full', 'start-next', 'start-skip'],
    2: ['start-risky-tell', 'start-back'],
    3: ['start-spend-warn'],
    4: ['start-habits-switch', 'start-plain-switch'],
    5: ['start-long-auto'],
    6: ['start-finish', 'start-view-standard'],
  }
  const problems: string[] = []
  engine(on)
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    for (const w of [294, 1200]) {
      const pane = await mount($, surface, w)
      for (let step = 1; step <= 6; step += 1) {
        await pane.redraw()
        const keys = new Set(walk(await pane.drawn()).map(x => String(x.key ?? x.props?.key ?? '')))
        for (const k of wanted[step] ?? []) if (!keys.has(k)) problems.push(`${surface} ${w} pt step ${step}: no ${k}`)
        if (step < 6) await pane.press({ key: 'start-next' })
      }
      // Back to the first question for the next surface
      for (let step = 6; step > 1; step -= 1) await press(pane, 'start-back')
      await pane.unmount()
    }
  }
  expect(problems).toEqual([])
})
