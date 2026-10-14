// The flip of a card: maps each card to its setting keys (from cardhome.ts) and builds the face rows. Pure.
import { SETTINGS, orderedOptions } from './settings'
import type { Setting, Values } from './settings'
import { cardFocus, isAdvanced } from './settingsmap'
import { CARD_SETTINGS, GLOBAL_SETTINGS } from './cardhome'
import { BACK_LABEL, DETAIL_LABEL, MORE_IN_SETTINGS, N_MORE_IN_SETTINGS, SETTINGS_WORD, SHOW_LABEL } from './cardwords'
export { ARRANGING_AUTO, ARRANGING_WIDTH_MANY, ARRANGING_WIDTH_ONE, ARRANGING_WORD, BACK_LABEL, MORE_IN_SETTINGS, N_MORE_IN_SETTINGS, SPENDING_TITLE } from './cardwords'

export { CARD_SETTINGS, GLOBAL_SETTINGS }

const OWNER = new Map<string, string>([
  ...Object.entries(CARD_SETTINGS).flatMap(([id, keys]) => keys.map((k): [string, string] => [k, id])),
  ...GLOBAL_SETTINGS.map((k): [string, string] => [k, 'global']),
])
export function cardOfSetting(key: string): string | undefined {
  const own = OWNER.get(key)
  if (own !== undefined) return own
  const m = /^(?:cards|detail)\.(.+)$/.exec(key)
  return m !== null && m[1] in CARD_SETTINGS ? m[1] : undefined
}
export const isCardId = (id: string): boolean => id in CARD_SETTINGS

const byKey = new Map<string, Setting>(SETTINGS.map(s => [s.key, s]))

export const flipKey = (id: string): string => `flip:${id}`
export const isFlipped = (sections: readonly string[], id: string): boolean => sections.includes(flipKey(id))

export const faceRowOf = (s: Setting): Setting => ({ ...s, note: '', ...(s.key.startsWith('cards.') ? { label: SHOW_LABEL } : s.key.startsWith('detail.') ? { label: DETAIL_LABEL } : {}) })

export const isSpending = (key: string): boolean => key.startsWith('cost.')

export function faceRows(id: string, canDrag: boolean): Setting[] {
  const own = (CARD_SETTINGS[id] ?? []).flatMap(k => {
    const s = byKey.get(k)
    return s === undefined || isAdvanced(s) || (s.desktopOnly === true && !canDrag) ? [] : [s]
  })
  return [...own, ...[`detail.${id}`, `cards.${id}`].flatMap(k => byKey.get(k) ?? [])].map(faceRowOf)
}

export const settingsGroupOf = (id: string): string => (CARD_SETTINGS[id] ?? []).map(k => byKey.get(k)?.group).find(g => g !== undefined) ?? 'Cards'

// The pane has no inner scroll, so the face shows only the rows that fit and leaves the rest one press away.
export type Face = { rows: Setting[]; more: number; group: string }
export function faceOf(id: string, canDrag: boolean, fit: number): Face {
  const all = faceRows(id, canDrag)
  const shown = all.length <= fit + 1 ? all : all.slice(0, fit)
  return { rows: shown, more: all.length - shown.length, group: cardFocus(id) }
}

export const CARD_WORDS: Readonly<Record<string, string>> = { limits: 'limit', session: 'here' }

export function cardSettingsText(word: string, values: Values): string {
  const id = CARD_WORDS[word] ?? word
  if (!isCardId(id)) return `No such card: ${id}. Cards: ${Object.keys(CARD_SETTINGS).join(', ')}.`
  const keys = [...(CARD_SETTINGS[id] ?? []), `detail.${id}`, `cards.${id}`]
  const lines = [`Settings of the ${id} card:`, '']
  for (const k of keys) {
    const s = byKey.get(k)
    if (s === undefined) continue
    const cur = values[k] ?? s.default
    lines.push(`  ${k}: ${s.options.find(o => o.value === cur)?.label ?? cur} (${orderedOptions(s).map(o => o.value).join(' / ')})${isAdvanced(s) ? ' [expert]' : ''}`)
  }
  lines.push('', 'Change one: /vaken-settings <key> <value>. Every row: /vaken-settings all')
  return lines.join('\n')
}
