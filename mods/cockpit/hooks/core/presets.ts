// Named sets of Settings values (three modes and other styles). Applying one shows what would change and changes it only after 'yes'. A preset never turns on a block that spends model usage on its own.
import type { HelpEntry } from './registry'
import { tEn } from '../i18n/t'

export const PRESETS_HELP: HelpEntry[] = [{ title: 'What the presets are', text: '/vaken-settings preset lists seven styles: Only alerts (quiet), Recommended (balanced, or type recommended), Everything useful (full), Ask before risky steps (careful), Save usage (thrifty), Every check on (everything) and No coding (backoffice). Pick one to see what changes, then add "yes".' }]

// `name` is what the store keeps and is never renamed; `title` is what a person reads. `clear`: rows put back to their default instead of a value.
type Preset = { name: string; title: string; about: string; values: Record<string, string>; clear?: string[] }

// Only alerts < Recommended < Everything useful, by cost, each adding to the one before. A fresh store reads as Recommended. No mode touches compact.mode, so a picked Auto stays.
export const MODES = ['quiet', 'balanced', 'full'] as const
export type Mode = (typeof MODES)[number]
const ALERTS = { 'guard.destructive': 'warn', 'guard.scope': 'warn', 'guard.packages': 'warn', 'guard.tests': 'warn', 'guard.world': 'warn', 'guard.secrets': 'warn', 'guard.migrations': 'warn', 'limits.warn': 'on', 'notify.mode': 'needs', 'compact.card': 'on' }
// Recommended and Everything useful turn them on; Only alerts turns them off.
const HELPERS: Record<string, string> = {
  'value.weekly': 'on', 'today.brief': 'on', 'neighbors.warn': 'on', 'heartbeat.mode': 'on', 'recap.mode': 'on', 'happened.mode': 'on', 'proof.claims': 'warn', 'proof.done': 'on', 'proof.drift': 'warn', 'proof.anomaly': 'warn',
  'coach.mode': 'on', 'decisions.mode': 'on', 'diet.mode': 'on', 'hints.model': 'on', 'route.mode': 'suggest', 'preview.auto': 'on', 'cost.budget': 'warn', 'resume.mode': 'remind', 'fresh.nudge': 'on', 'prompt.check': 'tip', 'plan.first': 'suggest',
}
const HELPERS_OFF = Object.fromEntries(Object.keys(HELPERS).map(k => [k, 'off'])) as Record<string, string>
const SENDS = { 'prompt.check': 'ask', 'assume.check': 'on', 'plan.first': 'ask', 'claude.notes': 'all' }
const SENDS_OFF = { 'assume.check': 'off', 'claude.notes': 'safety' }

export const MODE_CLASSES = { alerts: Object.keys(ALERTS), helpers: Object.keys(HELPERS), sends: Object.keys(SENDS) }

export const PRESETS: Preset[] = [
  {
    name: 'quiet',
    title: tEn('settings.mode_quiet'),
    about: tEn('settings.mode_quiet_about'),
    // The person's own compact choice stays.
    values: { ...ALERTS, ...HELPERS_OFF, ...SENDS_OFF },
  },
  {
    name: 'balanced',
    title: tEn('settings.mode_balanced'),
    about: tEn('settings.quiet_plus_suggestions_band_lines'),
    values: { ...ALERTS, ...HELPERS, ...SENDS_OFF },
  },
  {
    name: 'full',
    title: tEn('settings.mode_full'),
    about: tEn('settings.balanced_plus_the_checks_and_the'),
    values: { ...ALERTS, ...HELPERS, ...SENDS },
  },
  {
    name: 'careful',
    title: tEn('settings.preset_careful'),
    about: tEn('settings.preset_careful_about'),
    values: { 'guard.destructive': 'hold', 'guard.scope': 'hold', 'guard.packages': 'hold', 'guard.tests': 'hold', 'guard.world': 'hold', 'guard.secrets': 'hold', 'guard.migrations': 'hold', 'loop.breaker': 'stop', 'cap.mode': 'hold', 'cap.max': 'auto', 'cost.budget': 'stop', 'away.policy': 'careful', 'proof.claims': 'warn' },
  },
  {
    name: 'thrifty',
    title: tEn('settings.preset_thrifty'),
    about: tEn('settings.preset_thrifty_about'),
    values: { 'compact.mode': 'auto', 'cache.keeper': 'on', 'route.mode': 'auto', 'cap.mode': 'hold', 'cost.budget': 'warn', 'diet.mode': 'on', 'runner.researcher': 'haiku', 'runner.builder': 'sonnet', 'runner.reviewer': 'haiku', 'runner.fixer': 'opus' },
  },
  {
    name: 'everything',
    title: tEn('settings.preset_everything'),
    about: tEn('settings.preset_everything_about'),
    values: { 'compact.mode': 'auto', 'cache.keeper': 'on', 'route.mode': 'auto', 'diet.mode': 'on', 'cost.budget': 'warn', 'cap.mode': 'hold', 'cap.max': 'auto', 'loop.breaker': 'warn', 'guard.destructive': 'warn', 'guard.scope': 'warn', 'guard.packages': 'warn', 'guard.tests': 'warn', 'guard.world': 'warn', 'guard.secrets': 'warn', 'guard.migrations': 'warn', 'proof.claims': 'warn', 'happened.mode': 'on', 'errors.mode': 'on', 'steer.mode': 'on', 'heartbeat.mode': 'on', 'fresh.nudge': 'on', 'plan.first': 'suggest', 'prompt.check': 'tip', 'assume.check': 'on', 'value.weekly': 'on', 'today.brief': 'on', 'neighbors.warn': 'on', 'claude.notes': 'all' },
  },
  {
    name: 'backoffice',
    title: tEn('settings.preset_backoffice'),
    about: tEn('settings.preset_backoffice_about'),
    values: { 'plain.mode': 'on', 'errors.mode': 'on', 'guard.world': 'hold', 'guard.secrets': 'hold', 'guard.destructive': 'hold', 'away.policy': 'careful', 'cost.budget': 'warn', 'proof.claims': 'warn', 'happened.mode': 'on', 'steer.mode': 'off' },
  },
]

// No import of the registry here: it imports this file.
export function modeNow(values: Record<string, string>): Mode | 'custom' {
  for (const name of ['full', 'balanced', 'quiet'] as const) {
    const p = PRESETS.find(x => x.name === name)
    if (p !== undefined && Object.entries(p.values).every(([k, v]) => values[k] === v)) return name
  }
  return 'custom'
}

export const PRESET_ALIASES: Readonly<Record<string, string>> = { recommended: 'balanced' }
export const findPreset = (name: string): Preset | undefined => {
  const word = name.trim().toLowerCase()
  const id = PRESET_ALIASES[word] ?? word
  return PRESETS.find(p => p.name === id)
}

type Ask = { kind: 'list' } | { kind: 'show'; preset: Preset } | { kind: 'apply'; preset: Preset } | { kind: 'bad'; why: string }
export function parseAsk(args: string): Ask {
  const parts = args.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { kind: 'list' }
  const preset = findPreset(parts[0])
  if (preset === undefined) return { kind: 'bad', why: `No preset named "${parts[0]}". The presets are: ${PRESETS.map(p => `${p.name} (${p.title})`).join(', ')}.` }
  return parts[1]?.toLowerCase() === 'yes' ? { kind: 'apply', preset } : { kind: 'show', preset }
}

export const presetWhat = (name: string): string => `Applied the ${name} preset`

export function listText(): string {
  return ['Presets:', ...PRESETS.map(p => `  ${p.title} (${p.name}): ${p.about}`), '', 'See what one would change: /vaken-settings preset careful. Apply it: /vaken-settings preset careful yes.'].join('\n')
}

// Their default Warn stops a step when Claude Code would not ask, but only while the row is unset. A preset's Warn puts the row back to default so picking a mode never silently turns that stop off.
export const WORST_KEYS: readonly string[] = ['guard.destructive', 'guard.secrets']
// Kept here, in a file that loads no other block, so the explanations can read it while the registry is still loading.
export const GUARD_UPGRADE_WHAT = 'Risky commands and secrets stop again where Claude Code would not ask'

export type Step = { key: string; value?: string }
export function presetSteps(p: Preset): Step[] {
  const steps: Step[] = Object.entries(p.values).map(([key, value]) => (WORST_KEYS.includes(key) && value === 'warn' ? { key } : { key, value }))
  return [...steps, ...(p.clear ?? []).filter(k => p.values[k] === undefined).map(key => ({ key }))]
}

export function diffLines(preset: Preset, current: Record<string, string>, label: (key: string) => string, valueLabel: (key: string, value: string) => string, defaultOf: (key: string) => string = () => ''): string[] {
  return presetSteps(preset)
    .map(st => ({ key: st.key, value: st.value ?? defaultOf(st.key) }))
    .filter(({ key, value }) => current[key] !== value)
    .map(({ key, value }) => `  ${label(key)}: ${valueLabel(key, current[key] ?? '')} -> ${valueLabel(key, value)}`)
}

export const changeCount = (preset: Preset, current: Record<string, string>, defaultOf: (key: string) => string): number =>
  presetSteps(preset).filter(st => current[st.key] !== (st.value ?? defaultOf(st.key))).length

// Offered only while the values match no mode.
export const USUAL_MODE: Mode = 'balanced'
export const BACK_MODE: Mode = USUAL_MODE
export const backOffered = (values: Record<string, string>): boolean => modeNow(values) === 'custom'
export function backLines(current: Record<string, string>, label: (key: string) => string, valueLabel: (key: string, value: string) => string, defaultOf: (key: string) => string): string[] {
  const p = findPreset(BACK_MODE)
  return p === undefined ? [] : diffLines(p, current, label, valueLabel, defaultOf)
}
