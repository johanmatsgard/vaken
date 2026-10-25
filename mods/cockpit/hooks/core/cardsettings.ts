// The flip of a card: maps each card to its setting keys (from cardhome.ts) and builds the face rows. Pure.
import { SETTINGS, orderedOptions } from './settings'
import type { Setting, Values } from './settings'
import { cardFocus, isAdvanced, isTextOnly } from './settingsmap'
import { CARD_SETTINGS, GLOBAL_SETTINGS } from './cardhome'
import { HABIT_KEYS } from './tasklist'
import { BACK_LABEL, DETAIL_LABEL, MORE_IN_SETTINGS, N_MORE_IN_SETTINGS, SETTINGS_WORD, SHOW_LABEL } from './cardwords'
export { ARRANGE_DROP, ARRANGING_LINE, ARRANGING_LINE_AUTO, ARRANGING_PROBLEMS, ARRANGING_SHOW_HIDE, ARRANGING_WORD, BACK_LABEL, HABITS_LINK, MORE_IN_SETTINGS, N_MORE_IN_SETTINGS, SPENDING_TITLE } from './cardwords'

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

// A card's own main switch shows on its settings side even when Settings keeps it under Advanced
export const FACE_MAIN: ReadonlySet<string> = new Set(['proof.receipts'])
// A setting the card's own face already holds (Agent setup's place picker) stays off its settings side, so it shows once
export const ON_FACE: ReadonlySet<string> = new Set(['setup.scope'])
// Settings a card's face leaves to one link row (Autopilot: the working habits, one row to Prompts and memory in Settings)
export const FACE_LINKED: Readonly<Record<string, readonly string[]>> = { autopilot: HABIT_KEYS }
// A setting another card owns that this card's face shows too, first (Autopilot: Keep session cheap, the setting of its "Kept the session cheap" row); Settings keeps it where it is
export const FACE_ALSO: Readonly<Record<string, readonly string[]>> = { autopilot: ['cache.keeper'] }

// Every setting on the face says what it does in its dim note (the note Settings shows); the card's own Detail and Show rows need none: the card is in front
export const faceRowOf = (s: Setting): Setting => (s.key.startsWith('cards.') ? { ...s, note: '', label: SHOW_LABEL } : s.key.startsWith('detail.') ? { ...s, note: '', label: DETAIL_LABEL } : s)

export const isSpending = (key: string): boolean => key.startsWith('cost.')

export function faceRows(id: string, canDrag: boolean): Setting[] {
  const own = [...(FACE_ALSO[id] ?? []), ...(CARD_SETTINGS[id] ?? [])].flatMap(k => {
    const s = byKey.get(k)
    return s === undefined || ON_FACE.has(s.key) || (FACE_LINKED[id] ?? []).includes(s.key) || (isAdvanced(s) && !FACE_MAIN.has(s.key)) || isTextOnly(s) || (s.desktopOnly === true && !canDrag) ? [] : [s]
  })
  return [...own, ...[`detail.${id}`, `cards.${id}`].flatMap(k => byKey.get(k) ?? [])].map(faceRowOf)
}

export const settingsGroupOf = (id: string): string => (CARD_SETTINGS[id] ?? []).map(k => byKey.get(k)?.group).find(g => g !== undefined) ?? 'Cards'

// The pane has no inner scroll, so the face shows only the rows that fit and leaves the rest one press away.
export type Face = { rows: Setting[]; more: number; group: string }
// A face of these cards that cannot show every row keeps the card's own Detail and Show rows, as the faces that fit have them, and cuts its other rows first
export const FACE_KEEPS_CARD_ROWS: ReadonlySet<string> = new Set(['guard'])
const isCardRow = (key: string): boolean => key.startsWith('detail.') || key.startsWith('cards.')
// Rows that go together or not at all: the session and day budgets, and the four agent models (never one of them behind "N more in Settings")
export const FACE_TOGETHER: readonly (readonly string[])[] = [['cost.session', 'cost.day'], ['runner.researcher', 'runner.builder', 'runner.reviewer', 'runner.fixer']]
const togetherOf = (key: string): number => FACE_TOGETHER.findIndex(g => g.includes(key))
// The face's rows in units that go together, in order
const unitsOf = (rows: Setting[]): Setting[][] =>
  rows.reduce<Setting[][]>((out, r) => {
    const last = out[out.length - 1]
    const g = togetherOf(r.key)
    if (g >= 0 && last !== undefined && togetherOf(last[0]?.key ?? '') === g) last.push(r)
    else out.push([r])
    return out
  }, [])
// How the face is measured: `room` in the units of `size` (one per row when no size is given: a count of rows), `slack` the overflow
// that still shows every row (one row: "1 more in Settings" would take the room the row takes), `skip` rows not drawn at all.
// The face counts LINES, not settings: a choice of four as radio rows is that many rows high, and so is a setting's note.
// `least`: the fewest rows the face shows however short the front (a group that goes together counts all its rows)
export type FaceMeasure = { size?: (s: Setting) => number; slack?: number; skip?: (key: string) => boolean; least?: number }
export function faceOf(id: string, canDrag: boolean, room: number, m: FaceMeasure = {}): Face {
  const size = m.size ?? ((): number => 1)
  const all = faceRows(id, canDrag).filter(r => m.skip?.(r.key) !== true)
  const sum = (rows: readonly Setting[]): number => rows.reduce((n, r) => n + size(r), 0)
  if (sum(all) <= room + (m.slack ?? 1)) return { rows: all, more: 0, group: cardFocus(id) }
  const units = unitsOf(all)
  const card = FACE_KEEPS_CARD_ROWS.has(id) ? units.filter(u => u.every(r => isCardRow(r.key))) : []
  let left = room - card.reduce((n, u) => n + sum(u), 0)
  // In order, every unit that still fits (one that does not is skipped, a smaller one after it may fit); always at least `least`
  const shown: Setting[][] = []
  for (const u of units.filter(x => !card.includes(x))) {
    if (shown.flat().length >= (m.least ?? 1) && sum(u) > left) continue
    shown.push(u)
    left -= sum(u)
  }
  const rows = [...shown, ...card].flat()
  return { rows, more: all.length - rows.length, group: cardFocus(id) }
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
    lines.push(`  ${k}: ${s.options.find(o => o.value === cur)?.label ?? cur} (${orderedOptions(s).map(o => o.value).join(' / ')})${isAdvanced(s) || isTextOnly(s) ? ' [expert]' : ''}`)
  }
  lines.push('', 'Change one: /vaken-settings <key> <value>. Every row: /vaken-settings all')
  return lines.join('\n')
}
