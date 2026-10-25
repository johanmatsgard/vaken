// "Changed" in Settings: a row is changed when its value differs from what the mode in use sets (or the default). Pure.
import { PRESETS, modeNow } from './presets'
import type { Setting } from './settings'
import { ADVANCED_SECTION, isAdvanced, sectionOfSetting, viewLocksRow } from './settingsmap'

export function baselineOf(s: Pick<Setting, 'key' | 'default'>, mode: string): string {
  const preset = mode === 'custom' ? undefined : PRESETS.find(p => p.name === mode)
  return preset?.values[s.key] ?? s.default
}

export const isChanged = (s: Pick<Setting, 'key' | 'default'>, values: Record<string, string>, mode: string): boolean => (values[s.key] ?? s.default) !== baselineOf(s, mode)

// A row Settings shows: not hidden, not desktop-only off the desktop, not locked by the view
const shownRow = (s: Setting, values: Record<string, string>, canDrag: boolean): boolean => !(s.hidden === true || (s.desktopOnly === true && !canDrag) || viewLocksRow(s.key, values['look.view']))

// The "Changed by you" list on the mode card: every shown row that differs from the mode in use, in Settings' order
export function changedRows<S extends Setting>(settings: readonly S[], values: Record<string, string>, canDrag: boolean): S[] {
  const mode = modeNow(values)
  return settings.filter(s => shownRow(s, values, canDrag) && isChanged(s, values, mode))
}

export function changedBySection(settings: readonly Setting[], values: Record<string, string>, canDrag: boolean): Map<string, number> {
  const mode = modeNow(values)
  const out = new Map<string, number>()
  for (const s of settings) {
    if (!shownRow(s, values, canDrag)) continue
    if (!isChanged(s, values, mode)) continue
    const id = (isAdvanced(s) ? ADVANCED_SECTION : sectionOfSetting(s)).name
    out.set(id, (out.get(id) ?? 0) + 1)
  }
  return out
}
