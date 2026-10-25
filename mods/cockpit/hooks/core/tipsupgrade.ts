// One-time step for tips whose default turned Off: a store that never saved those rows followed the old default, so they are written once at the first session start.
import type { Io } from './io'
import { modeNow } from './presets'
import { OLD_COST_DEFAULTS, OLD_OTHER_DEFAULTS } from './costupgrade'
import { SETTINGS, readSettings, settingStoreKey, writeSetting } from './settings'

export const TIPS_UPGRADE_DONE = 'cockpit:upgrade:tipsdefaults'
export const OLD_TIP_DEFAULTS: Readonly<Record<string, string>> = { 'hints.model': 'on', 'route.mode': 'suggest' }
export const TIPS_KEPT_WHAT = 'Kept your tips after an update'

export function tipsToWrite(values: Record<string, string>, stored: ReadonlySet<string>, anySaved: boolean): Record<string, string> {
  if (!anySaved) return {}
  const unset = Object.keys(OLD_TIP_DEFAULTS).filter(k => !stored.has(k))
  // Rows whose default turned On later count at the Off they had then.
  // The compact row is not part of what this step looks at (a mode did not touch it then): it reads as Only alerts has it
  const asQuiet: Record<string, string> = { ...values, 'compact.mode': 'watch', ...Object.fromEntries([...Object.entries(OLD_COST_DEFAULTS), ...Object.entries(OLD_OTHER_DEFAULTS)].filter(([k]) => !stored.has(k))), ...Object.fromEntries(unset.map(k => [k, 'off'])) }
  // Notices now default to This session too, so the Needs you of that time reads as the mode's own
  if (asQuiet['notify.mode'] === 'needs') asQuiet['notify.mode'] = 'self'
  if (modeNow(asQuiet) === 'quiet') return {}
  if (stored.has('route.mode') && values['route.mode'] === 'suggest' && modeNow({ ...asQuiet, 'route.mode': 'off' }) === 'quiet') return { 'route.mode': 'off' }
  return Object.fromEntries(unset.map(k => [k, OLD_TIP_DEFAULTS[k]]))
}

const saved = (raw: unknown): boolean => raw !== undefined && raw !== null

export async function upgradeTipDefaults(i: Io): Promise<Record<string, string>> {
  if ((await i.get(TIPS_UPGRADE_DONE)) === 'done') return {}
  const stored = new Set<string>()
  let anySaved = false
  for (const s of SETTINGS) {
    if (!saved(await i.get(settingStoreKey(s.key)))) continue
    anySaved = true
    stored.add(s.key)
  }
  const rows = tipsToWrite(await readSettings(i), stored, anySaved)
  for (const [k, v] of Object.entries(rows)) await writeSetting(i, k, v)
  await i.set(TIPS_UPGRADE_DONE, 'done')
  return rows
}
