// The way back from Custom on the Settings mode card: "Back to Recommended" lists what would change before it changes anything (core/presets.ts backLines)
import { backLines, backOffered } from '../../core/presets'
import { findSetting } from '../../core/settings'
import { BACK_WORDS } from '../../core/settingsmap'

// The words live with the Settings view's own list (core/settingsmap.ts)
export { BACK_WORDS }

export function backAskLines(values: Record<string, string>, t: (s: string) => string): string[] {
  const label = (key: string): string => {
    const s = findSetting(key)
    return s === undefined ? key : t(s.label)
  }
  const valueLabel = (key: string, value: string): string => t(findSetting(key)?.options.find(o => o.value === value)?.label ?? value)
  return backLines(values, label, valueLabel, key => findSetting(key)?.default ?? '').map(line => line.trim())
}

export { backOffered }
