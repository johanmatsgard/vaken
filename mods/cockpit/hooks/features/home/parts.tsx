// The pane's shared drawing parts: the context every card is drawn with, the line that opens ("What is this?"), grouped rows, a card's More or Less
import { focusOf, whatIsLines } from '../../core/whatis'
import type { WhatIs } from '../../core/whatis'
import { flipKey } from '../../core/cardsettings'
import { NEW_CHIP, isNewCard } from '../../core/cardrules'
import { tr, trFill } from '../../core/lang'
import { glanceOpenKey } from '../../core/headline'
import { ROLE_NAMES, roleSettingKey } from '../../core/orchestra'
import type { Values } from '../../core/settings'
import { CARD_GAP, CARD_GAP_X, ChevronMark, GroupBreak, choiceStacks, glanceTrailPt, glanceValueFits, LinkButton, MoreRow, OpenLine, Pick, RadioList, StateChip, WhatIsBody, pickLines, settingRowMinPt, vstep } from '../../ui/kit'
import type { Drawn, El, GlanceOpts } from '../../ui/kit'
import { ADVICE_BUTTON_GAP, BODY_ROW_GAP, CHOICE_NOTE_GAP, ICON_GAP, PRESS_FRAME_H, PRESS_ROW_H, cols, rows } from '../../ui/tokens'
import type { GroupRow, LineGroup } from './linecards'
import type { Inside } from './rowact'
import type { CardId, Detail, View } from './logic'
import type { Acts, Prefs } from './prefs'

export type PaneCtx = { el: El; view: View; prefs: Prefs; act: Acts; onFlip: (key: string) => void; widthPt: number; listShow?: number; glanceOf?: (id: CardId) => GlanceOpts }

// Opens or closes a line; a line that opens counts as acted on (`acted`), so "Quiet it?" never asks about it.
export const toggle = (c: PaneCtx, key: string, acted?: string) => () => c.act.open(c.prefs.open === key ? undefined : key, c.prefs.open === key ? undefined : acted)

export const whatOpen = (c: PaneCtx, key: string, what: WhatIs | undefined, acted?: string, flat = false, inside?: Inside): Drawn => {
  if (c.prefs.open !== key || what === undefined) return null
  const setting = focusOf(what.setting)
  if (!flat) return WhatIsBody(c.el, `w-${key}`, whatIsLines(what, trFill), inside !== undefined ? { label: inside.label, onPress: () => c.act.run(inside.action) } : setting === undefined ? undefined : { label: 'Change in Settings', onPress: () => c.act.openSettingsAt(setting, acted), go: true }, (inside?.more ?? []).map((m, n) => ({ key: `w-${key}-more${n}`, label: m.label, onPress: () => c.act.run(m.action) })))
  const { Box, Text } = c.el
  return (
    <Box key={`w-${key}-open`} flexDirection="column">
      {whatIsLines(what, trFill).map((l, n) => (
        <Text key={`w-${key}-l${n}`} dimColor>
          {l}
        </Text>
      ))}
      {setting === undefined ? null : (
        <Box key={`w-${key}-set-row`} marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row">
          {LinkButton(c.el, `w-${key}-set`, 'Change in Settings', () => c.act.openSettingsAt(setting, acted), { row: true })}
        </Box>
      )}
    </Box>
  )
}

// The row is tall (26 pt, a list row) unless `tall` is false.
export const whatLine = (c: PaneCtx, key: string, content: Drawn, what: WhatIs | undefined, acted?: string, lines = 1, right?: string, tall = true, flat = false, inside?: Inside): Drawn[] =>
  what === undefined ? [content] : [OpenLine(c.el, `ol-${key}`, content, c.prefs.open === key, toggle(c, key, acted), { widthPt: c.widthPt, lines, right, tall }), whatOpen(c, key, what, acted, flat, inside)]

export const memoryLabel = (el: PaneCtx['el'], key: string, memo: { label: string; note?: string }): Drawn => {
  const { Box, Text } = el
  return memo.note === undefined ? (
    <Text key={key}>{memo.label}</Text>
  ) : (
    <Box key={key} flexDirection="column">
      <Text>{memo.label}</Text>
      <Text dimColor>{memo.note}</Text>
    </Box>
  )
}

// Split on the line's own separators; a line that does not split keeps all its words as the label.
export const memoryParts = (title: string): { label: string; value?: string; note?: string } => {
  const semi = title.indexOf('; ')
  const head = semi < 0 ? title : title.slice(0, semi)
  const note = semi < 0 ? undefined : title.slice(semi + 2)
  const cut = head.lastIndexOf(', ')
  return cut < 0 ? { label: head, ...(note === undefined ? {} : { note }) } : { label: head.slice(0, cut), value: head.slice(cut + 2), ...(note === undefined ? {} : { note }) }
}

export const groupsView = (c: PaneCtx, id: string, groups: LineGroup[]): Drawn[] => {
  const { Box, Text } = c.el
  const flat = id === 'prs'
  return groups.flatMap((g, n) => {
    if (g.behind !== undefined && !c.prefs.openSections.includes(g.behind)) return []
    const detailsOpen = g.toggle !== undefined && c.prefs.openSections.includes(g.toggle)
    const foldKey = g.fold === undefined ? '' : `fold:${id}:${g.fold.id}`
    const foldOpen = g.fold !== undefined && c.prefs.openSections.includes(foldKey)
    const shownRows = g.fold === undefined || foldOpen ? g.rows : g.rows.slice(0, g.fold.shown)
    return [
    n === 0 ? null : GroupBreak(c.el, `${id}-br${n}`, c.widthPt, undefined, true),
    (
    <Box key={`${id}-g${n}`} flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {shownRows.flatMap(r => {
        const action = r.action
        const memo = id === 'skills' && r.key === 'cost' ? memoryParts(r.title) : undefined
        const content = memo === undefined ? <Text wrap="truncate-end">{r.title}</Text> : memoryLabel(c.el, `${id}-mem`, memo)
        const lines = memo?.note === undefined ? 1 : 2
        const right = memo === undefined ? r.right : memo.value
        return action === undefined
          ? whatLine(c, `${id}:${r.key}`, content, r.what, r.acted, lines, right, true, flat, (r as GroupRow & { inside?: Inside }).inside)
          : [OpenLine(c.el, `ol-${id}:${r.key}`, content, c.prefs.open === `${id}:${r.key}`, () => c.act.run(action), { widthPt: c.widthPt, lines, right: r.right, tall: true }), whatOpen(c, `${id}:${r.key}`, r.what, undefined, flat)]
      })}
      {g.toggle === undefined ? null : MoreRow(c.el, `${id}-${g.toggle}`, detailsOpen ? 'Show fewer' : 'Details', detailsOpen, () => c.act.toggleSection(g.toggle as string))}
      {g.fold === undefined ? null : MoreRow(c.el, `${id}-${g.fold.id}`, foldOpen ? 'Show fewer' : `Show ${g.fold.more} more`, foldOpen, () => c.act.toggleSection(foldKey))}
    </Box>
    ),
    ]
  })
}

// It never carries the number.
export const pointerTo = (c: PaneCtx, id: CardId, word: string): Drawn => {
  if (c.glanceOf === undefined || c.prefs.hidden.includes(id) || c.prefs.autoHidden?.includes(id) === true) return null
  const key = glanceOpenKey(id)
  return LinkButton(c.el, `pointer-${id}-open`, `${tr(word)} ›`, () => { if (!c.prefs.openSections.includes(key)) c.act.toggleSection(key) }, { row: true })
}

export const moreOf = (c: PaneCtx, id: CardId, same = false) => {
  const d = c.prefs.cardDetail[id]
  const to: Detail = d === 'explained' ? 'simple' : 'explained'
  const shrunk = c.prefs.shrunk?.includes(id) === true
  const glance = c.glanceOf?.(id)
  const fresh = glance === undefined && isNewCard(c.prefs.lists.seen, id)
  return { widthPt: c.widthPt, more: { isFull: d === 'explained', onPress: () => c.act.flipDetail(id, to, shrunk), ...(same ? { same: true } : {}) }, ...(glance === undefined ? {} : { glance, flip: { onPress: () => c.act.toggleSection(flipKey(id)) } }), ...(fresh ? { chip: { word: NEW_CHIP, on: true } } : {}) }
}

export const headlineShown = (c: PaneCtx, id: CardId, title: string): boolean => {
  const glance = c.glanceOf?.(id)
  return glance !== undefined && glanceValueFits(title, glance, glanceTrailPt(moreOf(c, id).more))
}

export const chevronOf = (c: PaneCtx, key: string, acted?: string, name?: string): Drawn => ChevronMark(c.el, `row-${key}`, c.prefs.open === key ? 'down' : 'right', toggle(c, key, acted), name)

export const roleModelsOf = (values: Values): Partial<Record<(typeof ROLE_NAMES)[number], string>> =>
  Object.fromEntries(ROLE_NAMES.filter(r => values[roleSettingKey(r)] !== undefined).map(r => [r, values[roleSettingKey(r)]]))

// Placement: the state chip sits in the right cluster just before the choices (as SwitchRow's)
export function ChoiceRow(el: El, id: string, label: string, note: string, options: { value: string; label: string }[], current: string, onPick: (value: string) => void, chip?: { word: string; on: boolean }, widthPt?: number) {
  const { Box, Text } = el
  // Four or more choices do not fit beside the words in a phone-wide pane: the choices move under them.
  const isStacked = options.length > 3 || (widthPt !== undefined && choiceStacks(widthPt, label, options.map(o => o.label), chip?.word, tr(note)))
  const choices = isStacked && widthPt !== undefined && pickLines(options, widthPt).length > 1 ? RadioList(el, id, options, current, onPick, widthPt) : Pick(el, id, options, current, onPick, isStacked, id, isStacked ? PRESS_FRAME_H : PRESS_ROW_H)
  const words = (
    <Box flexDirection="column" flexShrink={1}>
      {chip === undefined || !isStacked ? (
        <Text>{tr(label)}</Text>
      ) : (
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" columnGap={cols(ICON_GAP)}>
          <Text>{tr(label)}</Text>
          {StateChip(el, `chip-${id}`, chip.word, chip.on)}
        </Box>
      )}
      {note === '' ? null : <Text dimColor>{tr(note)}</Text>}
    </Box>
  )
  return (
    <Box key={`row-${id}`} flexDirection={isStacked ? 'column' : 'row'} justifyContent="space-between" alignItems={isStacked ? 'stretch' : 'flex-start'} minHeight={rows(settingRowMinPt(note))} columnGap={cols(CARD_GAP_X)} {...(isStacked ? { rowGap: vstep(CHOICE_NOTE_GAP) } : {})}>
      {words}
      {isStacked ? (
        choices
      ) : (
        <Box key={`cl-${id}`} flexDirection="row" alignItems="center" flexShrink={0} columnGap={cols(ICON_GAP)}>
          {chip === undefined ? null : StateChip(el, `chip-${id}`, chip.word, chip.on)}
          {choices}
        </Box>
      )}
    </Box>
  )
}
