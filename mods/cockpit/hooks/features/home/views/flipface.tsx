// The back face of a flipped card: the card's BODY is replaced by its settings
import { FACE_LINKED, HABITS_LINK, MORE_IN_SETTINGS, N_MORE_IN_SETTINGS, faceOf, isSpending } from '../../../core/cardsettings'
import { tr } from '../../../core/lang'
import { ROLES, ROLE_NAMES, roleSettingKey } from '../../../core/orchestra'
import type { Role } from '../../../core/orchestra'
import { orderedOptions } from '../../../core/settings'
import type { Setting } from '../../../core/settings'
import { LinkButton, OpenLine, Pick, RadioList, pickLines, vstep, wrappedLines } from '../../../ui/kit'
import type { Drawn, El } from '../../../ui/kit'
import { BODY_ROW_GAP, FACE_ROW_PT, LIST_ROW_PAD_PT, PRESS_FRAME_H, ROW_PT, SETTING_ROW_GAP } from '../../../ui/tokens'
import type { Acts, Prefs } from '../prefs'
import type { CardId } from '../logic'
import { settingRowOf, settingRowPt } from './settingrow'

// roomPt: the height of the card's front body, in points; the face fills about that and leaves the rest behind "N more in Settings"
export function FlipFace(el: El, prefs: Prefs, act: Acts, id: CardId, innerPt: number, roomPt: number): Drawn {
  const { Box } = el
  // The session and day amounts mean nothing while the budget is Off: they are not on the face then (Settings hides them too)
  const budgetOff = (prefs.values['cost.budget'] ?? 'off') === 'off'
  const rowPt = settingRowPt(prefs, innerPt)
  // Each row's own height plus the gap under it; the link rows at the end take their room first
  const size = (r: Setting): number => (ROLE_OF.has(r.key) ? roleRowPt(r, innerPt, prefs.open === `face:${r.key}`) : rowPt(r)) + SETTING_ROW_GAP
  const links = (FACE_LINKED[id] === undefined ? 1 : 2) * FACE_ROW_PT
  const face = faceOf(id, el.drag, roomPt - links, { size, slack: FACE_ROW_PT, least: FACE_LEAST, skip: k => budgetOff && BUDGET_PAIR.includes(k) })
  const settingRow = settingRowOf(el, prefs, act, innerPt)
  const rowOf = (r: Setting): Drawn => (ROLE_OF.has(r.key) ? roleRow(el, prefs, act, innerPt, r, ROLE_OF.get(r.key) as Role) : settingRow(r))
  const spending = face.rows.filter(r => isSpending(r.key))
  const label = face.more > 0 ? tr(N_MORE_IN_SETTINGS).replace('{n}', String(face.more)) : tr(MORE_IN_SETTINGS)
  return (
    // Every setting with its dim note, SETTING_ROW_GAP apart; about the front's height (faceOf counts lines)
    <Box key={`face-${id}`} flexDirection="column" rowGap={vstep(SETTING_ROW_GAP)}>
      {[...face.rows.filter(r => !isSpending(r.key)).map(rowOf), ...spending.map(rowOf)]}
      {FACE_LINKED[id] === undefined ? null : LinkButton(el, `face-habits-${id}`, tr(HABITS_LINK), () => act.openSettingsAt(face.group), { row: true, chevron: true, widthPt: innerPt })}
      <Box key={`face-more-${id}`} flexDirection="column">
        {LinkButton(el, `face-settings-${id}`, label, () => act.openSettingsAt(face.more > 0 ? face.group : undefined), { row: true, chevron: true, widthPt: innerPt })}
      </Box>
    </Box>
  )
}

const BUDGET_PAIR = ['cost.session', 'cost.day']
// However short the front, the face shows at least two settings (or one group that goes together) before "N more in Settings"
const FACE_LEAST = 2
const ROLE_OF = new Map(ROLE_NAMES.map(r => [roleSettingKey(r), r]))
// A task-runner role on the flip side is ONE row, "Builder  Sonnet ›" over its dim note; a press opens its choices under it (never sixteen stacked buttons)
const noteLines = (r: Setting, innerPt: number): number => (r.note === '' ? 0 : wrappedLines(tr(r.note), innerPt))
function roleRowPt(r: Setting, innerPt: number, isOpen: boolean): number {
  const open = !isOpen ? 0 : BODY_ROW_GAP + (pickLines(orderedOptions(r), innerPt).length > 1 ? orderedOptions(r).length : 1) * PRESS_FRAME_H
  return (1 + noteLines(r, innerPt)) * ROW_PT + LIST_ROW_PAD_PT + open
}
function roleRow(el: El, prefs: Prefs, act: Acts, innerPt: number, r: Setting, role: Role): Drawn {
  const { Box, Text } = el
  const key = `face:${r.key}`
  const values = prefs.project !== undefined && prefs.settingsScope === 'project' ? prefs.values : prefs.globalValues
  const cur = values[r.key] ?? r.default
  const options = orderedOptions(r)
  const isOpen = prefs.open === key
  const pick = (v: string): void => act.setSetting(r.key, v)
  const words = (
    <Box flexDirection="column">
      <Text>{tr(ROLES[role].label)}</Text>
      {r.note === '' ? null : <Text dimColor>{tr(r.note)}</Text>}
    </Box>
  )
  return (
    <Box key={`face-role-${r.key}`} flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {OpenLine(el, `ol-${key}`, words, isOpen, () => act.open(isOpen ? undefined : key), { widthPt: innerPt, right: tr(options.find(o => o.value === cur)?.label ?? cur), tall: true, lines: 1 + noteLines(r, innerPt) })}
      {!isOpen ? null : pickLines(options, innerPt).length > 1 ? RadioList(el, r.key, options, cur, pick, innerPt) : Pick(el, r.key, options, cur, pick, true)}
    </Box>
  )
}
