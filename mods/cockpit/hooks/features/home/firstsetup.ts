// The first-start setup: five questions on the Start here card, one at a time, then a summary. Pure logic: the answers, what each one writes, and the place kept in the store.
import { MODES, WORST_KEYS, findPreset } from '../../core/presets'
import type { Mode, Step } from '../../core/presets'
import { HABIT_KEYS } from '../../core/tasklist'
import { t } from '../../core/lang'
import { fmt } from '../../core/fmt'

// The place in the setup (a redraw keeps it) and the flag that opens the card again from Settings (Run setup again)
export const SETUP_STATE_KEY = 'cockpit:setup:state'
export const SETUP_OPEN_KEY = 'cockpit:setup:open'

export const SETUP_QUESTIONS = 5
// The summary comes after the last question
export const SUMMARY_STEP = SETUP_QUESTIONS + 1

export type Risky = 'tell' | 'ask' | 'off'
export type Spend = 'off' | 'warn' | 'stop'
export type Long = 'auto' | 'watch' | 'off'
export type SetupAnswers = { tell: Mode; risky: Risky; spend: Spend; habits: boolean; plain: boolean; long: Long }
export type SetupState = { step: number; answers: SetupAnswers }

const RISKIES: readonly Risky[] = ['tell', 'ask', 'off']
const SPENDS: readonly Spend[] = ['off', 'warn', 'stop']
const LONGS: readonly Long[] = ['watch', 'auto', 'off']

// Long chats: Tell me when (Watch only), the default; Compact by itself (Auto) is the second answer, one press away
export const RECOMMENDED: SetupAnswers = { tell: 'balanced', risky: 'tell', spend: 'off', habits: true, plain: true, long: 'watch' }

// The risky-step rules that warn or stop (each Off, Warn or Stop)
export const RISK_KEYS: readonly string[] = ['guard.destructive', 'guard.scope', 'guard.packages', 'guard.tests', 'guard.world', 'guard.secrets', 'guard.migrations']
const RISK_OTHERS = ['cap.mode', 'away.policy', 'loop.breaker'] as const
const careful = findPreset('careful')?.values ?? {}
const each = (keys: readonly string[], value: string): Record<string, string> => Object.fromEntries(keys.map(k => [k, value]))
// Ask me first takes the Ask before risky steps preset's own values for these rows
export const RISKY_VALUES: Record<Risky, Record<string, string>> = {
  tell: { ...each(RISK_KEYS, 'warn'), 'cap.mode': 'warn', 'away.policy': 'off', 'loop.breaker': 'warn' },
  ask: Object.fromEntries([...RISK_KEYS, ...RISK_OTHERS].map(k => [k, careful[k] ?? 'warn'])),
  off: { ...each(RISK_KEYS, 'off'), 'cap.mode': 'off', 'away.policy': 'off', 'loop.breaker': 'off' },
}

// Every row the questions after the first one write, by the answers. Tell me when is Watch only: it shows the moment and sends Claude nothing
export function setupValues(a: SetupAnswers): Record<string, string> {
  const onOff = (on: boolean): string => (on ? 'on' : 'off')
  return { ...RISKY_VALUES[a.risky], 'cost.budget': a.spend, ...each(HABIT_KEYS, onOff(a.habits)), 'plain.mode': onOff(a.plain), 'compact.mode': a.long }
}
const SETUP_KEYS = new Set(Object.keys(setupValues(RECOMMENDED)))

// As a preset's steps: a Warn of the two worst Guard kinds puts the row back to its default (core/presets.ts presetSteps), so it still stops where Claude Code would not ask
export function setupSteps(a: SetupAnswers): Step[] {
  return Object.entries(setupValues(a)).map(([key, value]) => (WORST_KEYS.includes(key) && value === 'warn' ? { key } : { key, value }))
}

// The answers the values set now give, so "Run setup again" shows what is set; a value no answer gives falls back to the recommended one
export function answersFrom(values: Record<string, string>): SetupAnswers {
  const modeOf = (): Mode => {
    for (const m of ['full', 'balanced', 'quiet'] as const) {
      const p = findPreset(m)
      if (p !== undefined && Object.entries(p.values).every(([k, v]) => SETUP_KEYS.has(k) || values[k] === v)) return m
    }
    return RECOMMENDED.tell
  }
  const risky: Risky = RISK_KEYS.every(k => values[k] === RISKY_VALUES.ask[k]) ? 'ask' : RISK_KEYS.every(k => values[k] === 'off') ? 'off' : 'tell'
  const spend = SPENDS.find(s => s === values['cost.budget']) ?? RECOMMENDED.spend
  const compact = values['compact.mode']
  // Suggest is the nearest to "Tell me when" (Watch only)
  const long: Long = compact === 'auto' ? 'auto' : compact === 'off' ? 'off' : compact === 'suggest' || compact === 'watch' ? 'watch' : RECOMMENDED.long
  return { tell: modeOf(), risky, spend, habits: HABIT_KEYS.some(k => values[k] !== 'off'), plain: values['plain.mode'] !== 'off', long }
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null
// A stored place that reads wrong starts again at the first question with the answers from the values
export function parseSetupState(raw: unknown, values: Record<string, string>): SetupState {
  const base = answersFrom(values)
  if (!isObj(raw) || !isObj(raw.answers)) return { step: 1, answers: base }
  const a = raw.answers
  const pick = <T extends string>(list: readonly T[], x: unknown, fallback: T): T => list.find(v => v === x) ?? fallback
  const step = typeof raw.step === 'number' && Number.isInteger(raw.step) && raw.step >= 1 && raw.step <= SUMMARY_STEP ? raw.step : 1
  return {
    step,
    answers: {
      tell: pick(MODES, a.tell, base.tell),
      risky: pick(RISKIES, a.risky, base.risky),
      spend: pick(SPENDS, a.spend, base.spend),
      habits: typeof a.habits === 'boolean' ? a.habits : base.habits,
      plain: typeof a.plain === 'boolean' ? a.plain : base.plain,
      long: pick(LONGS, a.long, base.long),
    },
  }
}

export type SetupField = keyof SetupAnswers
export type SetupPress = { kind: 'pick'; field: SetupField; value: string } | { kind: 'next' } | { kind: 'back' }
// One press: a pick changes one answer (an unknown value changes nothing), Next and Back move one step
export function setupPress(s: SetupState, p: SetupPress): SetupState {
  if (p.kind === 'next') return { ...s, step: Math.min(SUMMARY_STEP, s.step + 1) }
  if (p.kind === 'back') return { ...s, step: Math.max(1, s.step - 1) }
  const a = s.answers
  const next: SetupAnswers =
    p.field === 'tell' ? { ...a, tell: MODES.find(m => m === p.value) ?? a.tell }
    : p.field === 'risky' ? { ...a, risky: RISKIES.find(m => m === p.value) ?? a.risky }
    : p.field === 'spend' ? { ...a, spend: SPENDS.find(m => m === p.value) ?? a.spend }
    : p.field === 'long' ? { ...a, long: LONGS.find(m => m === p.value) ?? a.long }
    : p.value === 'on' || p.value === 'off' ? { ...a, [p.field]: p.value === 'on' }
    : a
  return { ...s, answers: next }
}

// THE QUESTIONS, in the person's language: a radio question (its answers, each with one line of meaning) or the on/off question
export type SetupAnswer = { value: string; label: string; note: string }
export type SetupQuestion =
  | { step: number; kind: 'radio'; field: 'tell' | 'risky' | 'spend' | 'long'; ask: string; hint: string; answers: SetupAnswer[]; recommended: string }
  | { step: number; kind: 'switches'; ask: string; hint: string; rows: { field: 'habits' | 'plain'; label: string; note: string }[] }

// The budgets the Warn line names: Settings' own amounts, in dollars
export function setupQuestions(budget: { session: string; day: string }): SetupQuestion[] {
  const usd = (n: string): string => (n === '' ? '' : fmt.moneyIn(Number(n), 'USD', undefined, true))
  return [
    {
      step: 1, kind: 'radio', field: 'tell', ask: t('firstsetup.tell_ask'), hint: t('firstsetup.tell_hint'), recommended: RECOMMENDED.tell,
      answers: [
        { value: 'quiet', label: t('settings.mode_quiet'), note: t('firstsetup.tell_quiet_note') },
        { value: 'balanced', label: t('settings.mode_balanced'), note: t('firstsetup.tell_balanced_note') },
        { value: 'full', label: t('settings.mode_full'), note: t('firstsetup.tell_full_note') },
      ],
    },
    {
      step: 2, kind: 'radio', field: 'risky', ask: t('firstsetup.risky_ask'), hint: t('firstsetup.risky_hint'), recommended: RECOMMENDED.risky,
      answers: [
        { value: 'tell', label: t('firstsetup.risky_tell'), note: t('firstsetup.risky_tell_note') },
        { value: 'ask', label: t('firstsetup.risky_ask_first'), note: t('firstsetup.risky_ask_first_note') },
        { value: 'off', label: t('firstsetup.risky_off'), note: t('firstsetup.risky_off_note') },
      ],
    },
    {
      step: 3, kind: 'radio', field: 'spend', ask: t('firstsetup.spend_ask'), hint: t('firstsetup.spend_hint'), recommended: RECOMMENDED.spend,
      answers: [
        { value: 'off', label: t('firstsetup.spend_off'), note: t('firstsetup.spend_off_note') },
        { value: 'warn', label: t('firstsetup.spend_warn'), note: t('firstsetup.spend_warn_note', { session: usd(budget.session), day: usd(budget.day) }) },
        { value: 'stop', label: t('firstsetup.spend_stop'), note: t('firstsetup.spend_stop_note') },
      ],
    },
    {
      step: 4, kind: 'switches', ask: t('firstsetup.work_ask'), hint: t('firstsetup.work_hint'),
      rows: [
        { field: 'habits', label: t('firstsetup.work_habits'), note: t('firstsetup.work_habits_note') },
        { field: 'plain', label: t('firstsetup.work_plain'), note: t('firstsetup.work_plain_note') },
      ],
    },
    {
      step: 5, kind: 'radio', field: 'long', ask: t('firstsetup.long_ask'), hint: t('firstsetup.long_hint'), recommended: RECOMMENDED.long,
      answers: [
        { value: 'watch', label: t('firstsetup.long_suggest'), note: t('firstsetup.long_suggest_note') },
        { value: 'auto', label: t('firstsetup.long_auto'), note: t('firstsetup.long_auto_note') },
        { value: 'off', label: t('firstsetup.long_off'), note: t('firstsetup.long_off_note') },
      ],
    },
  ]
}

// The summary: one line a question, "what: the answer"
export function summaryLines(a: SetupAnswers, budget: { session: string; day: string }): string[] {
  const qs = setupQuestions(budget)
  const chosen = (step: number, value: string): string => {
    const q = qs.find(x => x.step === step)
    return q?.kind === 'radio' ? (q.answers.find(x => x.value === value)?.label ?? value) : value
  }
  const onOff = (on: boolean): string => t(on ? 'settings.on' : 'settings.off')
  const line = (name: string, value: string): string => t('firstsetup.summary_line', { name, value })
  return [
    line(t('firstsetup.sum_tell'), chosen(1, a.tell)),
    line(t('firstsetup.risky_ask'), chosen(2, a.risky)),
    line(t('firstsetup.spend_ask'), chosen(3, a.spend)),
    line(t('firstsetup.sum_habits'), onOff(a.habits)),
    line(t('firstsetup.work_plain'), onOff(a.plain)),
    line(t('firstsetup.long_ask'), chosen(5, a.long)),
  ]
}
