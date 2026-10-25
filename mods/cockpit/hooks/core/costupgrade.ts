// One-time step after the cost-sorted modes: a store that picked a mode before keeps it by name, others get the new defaults. Runs once per store.
import type { Io } from './io'
import { findPreset, modeNow, presetSteps } from './presets'
import { applySteps } from './projects'
import { SETTINGS, readSettings, settingStoreKey, writeSetting } from './settings'

export const COST_UPGRADE_DONE = 'cockpit:upgrade:costmodes'
export const COST_KEPT_WHAT = 'Your mode follows the new modes after an update'

export const OLD_COST_DEFAULTS: Readonly<Record<string, string>> = Object.fromEntries(
  ['value.weekly', 'today.brief', 'neighbors.warn', 'heartbeat.mode', 'recap.mode', 'happened.mode', 'proof.claims', 'proof.done', 'proof.drift', 'proof.anomaly', 'coach.mode', 'decisions.mode', 'diet.mode', 'hints.model', 'route.mode', 'preview.auto', 'cost.budget', 'resume.mode', 'fresh.nudge', 'prompt.check', 'plan.first', 'next.mode', 'lean.mode', 'allow.rules', 'teach.mode'].map(k => [k, 'off']),
)

// Rows outside the helper class whose default has changed since: they read at the old default while the store never saved them. Only used to tell which old mode a store was on; the upgrade never writes them (Compact by itself is kept at Auto by its own step below, and a stored choice is never changed).
export const OLD_OTHER_DEFAULTS: Readonly<Record<string, string>> = { 'compact.mode': 'watch', 'notify.mode': 'needs' }

const OLD_ALERTS = { 'guard.destructive': 'warn', 'guard.scope': 'warn', 'guard.packages': 'warn', 'guard.tests': 'warn', 'guard.world': 'warn', 'guard.secrets': 'warn', 'guard.migrations': 'warn', 'limits.warn': 'on', 'notify.mode': 'needs' }
const OLD_NUDGES = { 'value.weekly': 'on', 'today.brief': 'on', 'neighbors.warn': 'on', 'heartbeat.mode': 'on', 'recap.mode': 'on', 'happened.mode': 'on', 'proof.claims': 'warn', 'proof.done': 'on', 'proof.drift': 'warn', 'proof.anomaly': 'warn', 'coach.mode': 'on', 'diet.mode': 'on', 'hints.model': 'on', 'route.mode': 'suggest' }
const OLD_EXTRAS = { 'compact.card': 'on', 'preview.auto': 'on', 'cost.budget': 'warn', 'resume.mode': 'remind' }
const OLD_NUDGES_OFF = Object.fromEntries(Object.keys(OLD_NUDGES).map(k => [k, 'off']))
export const OLD_MODES: Readonly<Record<'quiet' | 'balanced' | 'full', Record<string, string>>> = {
  full: { ...OLD_ALERTS, ...OLD_NUDGES, ...OLD_EXTRAS, 'compact.mode': 'watch', 'fresh.nudge': 'on', 'prompt.check': 'tip', 'assume.check': 'on', 'plan.first': 'suggest', 'decisions.mode': 'on', 'claude.notes': 'all' },
  balanced: { ...OLD_ALERTS, ...OLD_NUDGES, ...OLD_EXTRAS, 'loop.breaker': 'warn', 'cap.mode': 'warn', 'away.policy': 'off', 'compact.mode': 'watch', 'cache.keeper': 'off', 'plain.mode': 'off', 'fresh.nudge': 'on', 'prompt.check': 'off', 'assume.check': 'off', 'plan.first': 'suggest', 'claude.notes': 'safety' },
  quiet: { ...OLD_ALERTS, ...OLD_NUDGES_OFF, 'compact.card': 'on', 'preview.auto': 'off', 'cost.budget': 'off', 'resume.mode': 'off', 'fresh.nudge': 'off', 'prompt.check': 'off', 'assume.check': 'off', 'plan.first': 'off', 'claude.notes': 'safety' },
}

// A pick of Only alerts wrote every changed row but the newest few; fewer saved rows means they were set by hand.
const PICKED_QUIET_MIN = Math.ceil(Object.keys(OLD_COST_DEFAULTS).length / 2)

export function oldModeOf(values: Record<string, string>, stored: ReadonlySet<string>): 'quiet' | 'balanced' | 'full' | 'custom' {
  const was = { ...values, ...Object.fromEntries([...Object.entries(OLD_COST_DEFAULTS), ...Object.entries(OLD_OTHER_DEFAULTS)].filter(([k]) => !stored.has(k))) }
  for (const m of ['full', 'balanced', 'quiet'] as const) if (Object.entries(OLD_MODES[m]).every(([k, v]) => was[k] === v)) return m
  return 'custom'
}

export type CostStep = { kind: 'none' } | { kind: 'keep'; rows: Record<string, string> } | { kind: 'mode'; mode: 'balanced' | 'full' }
export function costStep(values: Record<string, string>, stored: ReadonlySet<string>): CostStep {
  if (![...stored].some(k => OLD_COST_DEFAULTS[k] !== undefined)) return { kind: 'none' }
  const was = oldModeOf(values, stored)
  if (was === 'quiet') {
    if ([...stored].filter(k => OLD_COST_DEFAULTS[k] !== undefined).length < PICKED_QUIET_MIN) return { kind: 'none' }
    const rows = Object.fromEntries(Object.entries(OLD_COST_DEFAULTS).filter(([k, v]) => !stored.has(k) && values[k] !== v))
    return Object.keys(rows).length === 0 || modeNow(values) === 'quiet' ? { kind: 'none' } : { kind: 'keep', rows }
  }
  if (was === 'custom' || modeNow(values) === was) return { kind: 'none' }
  return { kind: 'mode', mode: was }
}

const saved = (raw: unknown): boolean => raw !== undefined && raw !== null

export async function upgradeCostModes(i: Io): Promise<string[]> {
  if ((await i.get(COST_UPGRADE_DONE)) === 'done') return []
  const stored = new Set<string>()
  for (const s of SETTINGS) if (saved(await i.get(settingStoreKey(s.key)))) stored.add(s.key)
  const values = await readSettings(i)
  const step = costStep(values, stored)
  let wrote: string[] = []
  if (step.kind === 'keep') {
    for (const [k, v] of Object.entries(step.rows)) await writeSetting(i, k, v)
    wrote = Object.keys(step.rows)
  } else if (step.kind === 'mode') {
    const preset = findPreset(step.mode)
    if (preset !== undefined) {
      const steps = presetSteps(preset)
      wrote = steps.filter(st => values[st.key] !== (st.value ?? SETTINGS.find(s => s.key === st.key)?.default)).map(st => st.key)
      await applySteps(i, steps)
    }
  }
  await i.set(COST_UPGRADE_DONE, 'done')
  return wrote
}

// Compact by itself is Watch only for a new store. A store from before that never chose it compacted by itself at Auto, so it keeps Auto: written once.
export const COMPACT_UPGRADE_DONE = 'cockpit:upgrade:compactwatch'
export const COMPACT_KEPT_AUTO = 'auto'
// What a store from before holds: a saved row, or a mark of the steps every session start writes (read before those steps run in this session)
const BEFORE_MARKS = ['cockpit:upgrade:tipsdefaults', COST_UPGRADE_DONE, 'cockpit:upgrade:notifymode', 'cockpit:firstrun']

export async function installedBefore(i: Io): Promise<boolean> {
  for (const k of BEFORE_MARKS) if ((await i.get(k)) === 'done') return true
  for (const s of SETTINGS) if (saved(await i.get(settingStoreKey(s.key)))) return true
  return false
}

// `before`: installedBefore, read at the start of the session start. True when it wrote Auto.
export async function upgradeCompactAuto(i: Io, before: boolean): Promise<boolean> {
  if ((await i.get(COMPACT_UPGRADE_DONE)) === 'done') return false
  const keep = before && !saved(await i.get(settingStoreKey('compact.mode')))
  if (keep) await writeSetting(i, 'compact.mode', COMPACT_KEPT_AUTO)
  await i.set(COMPACT_UPGRADE_DONE, 'done')
  return keep
}
