// The pane's shared drawing parts: the context every card is drawn with, the line that opens ("What is this?"), grouped rows, a card's More or Less
import { focusOf, whatIsLines } from '../../core/whatis'
import type { WhatIs } from '../../core/whatis'
import { flipKey } from '../../core/cardsettings'
import { NEW_CHIP, isNewCard } from '../../core/cardrules'
import { tr, trFill } from '../../core/lang'
import { glanceOpenKey } from '../../core/headline'
import { ROLE_NAMES, roleSettingKey } from '../../core/orchestra'
import type { Values } from '../../core/settings'
import { CARD_GAP, cardGapX, brokenLines, ChevronMark, FactRow, GroupBreak, middleFit, choiceStacks, detailBeside, glanceBelow, glanceShown, glanceTrailPt, LinkButton, MoreRow, OpenLine, Pick, RadioList, SessionRow, StateChip, WhatIsBody, pickLines, settingRowMinPt, valueBeside, vstep, wordTooWide, wrappedLines } from '../../ui/kit'
import type { Drawn, El, GlanceOpts } from '../../ui/kit'
import { ADVICE_BUTTON_GAP, BODY_ROW_GAP, CHOICE_NOTE_GAP, ICON_GAP, PRESS_FRAME_H, PRESS_ROW_H, cols, rows } from '../../ui/tokens'
import type { GroupRow, LineGroup } from './linecards'
import type { Inside } from './rowact'
import type { CardId, Detail, View } from './logic'
import type { Acts, Prefs } from './prefs'

export type PaneCtx = { el: El; view: View; prefs: Prefs; act: Acts; onFlip: (key: string) => void; widthPt: number; listShow?: number; glanceOf?: (id: CardId) => GlanceOpts }

// Opens or closes a line; a line that opens counts as acted on (`acted`), so "Quiet it?" never asks about it.
export const toggle = (c: PaneCtx, key: string, acted?: string) => () => c.act.open(c.prefs.open === key ? undefined : key, c.prefs.open === key ? undefined : acted)

// `marks`: fact rows (a label, then its dim mark) under the first line
// `tail`: rows under the lines (an agent's last steps)
export const whatOpen = (c: PaneCtx, key: string, what: WhatIs | undefined, acted?: string, flat = false, inside?: Inside, marks?: { label: string; value: string }[], tail?: Drawn[]): Drawn => {
  if (c.prefs.open !== key || what === undefined) return null
  const setting = focusOf(what.setting)
  const rows = (marks ?? []).map((m, n) => FactRow(c.el, `w-${key}-mark${n}`, m.label, m.value, { valueDim: true }))
  if (!flat) return WhatIsBody(c.el, `w-${key}`, whatIsLines(what, trFill), inside !== undefined ? { label: inside.label, onPress: () => c.act.run(inside.action) } : setting === undefined ? undefined : { label: 'Change in Settings', onPress: () => c.act.openSettingsAt(setting, acted), go: true }, (inside?.more ?? []).map((m, n) => ({ key: `w-${key}-more${n}`, label: m.label, onPress: () => c.act.run(m.action) })), rows, what.link, tail)
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
          {LinkButton(c.el, `w-${key}-set`, 'Change in Settings', () => c.act.openSettingsAt(setting, acted), { row: true, dim: true })}
        </Box>
      )}
    </Box>
  )
}

// The row is tall (26 pt, a list row) unless `tall` is false.
export const whatLine = (c: PaneCtx, key: string, content: Drawn, what: WhatIs | undefined, acted?: string, lines = 1, right?: string, tall = true, flat = false, inside?: Inside, marks?: { label: string; value: string }[], keepLabel = false): Drawn[] =>
  what === undefined ? [content] : [OpenLine(c.el, `ol-${key}`, content, c.prefs.open === key, toggle(c, key, acted), { widthPt: c.widthPt, lines, right, tall, keepLabel }), whatOpen(c, key, what, acted, flat, inside, marks)]

// `cut`: the label has a word wider than the row, so it alone is cut at the end
export const memoryLabel = (el: PaneCtx['el'], key: string, memo: { label: string; note?: string }, cut = false): Drawn => {
  const { Box, Text } = el
  return memo.note === undefined ? (
    <Text key={key} {...(cut ? { wrap: 'truncate-end' as const } : {})}>{memo.label}</Text>
  ) : (
    <Box key={key} flexDirection="column">
      <Text {...(cut ? { wrap: 'truncate-end' as const } : {})}>{memo.label}</Text>
      <Text dimColor>{memo.note}</Text>
    </Box>
  )
}

// A sentence and its press word ("May be stuck…" · "Nudge"): the sentence is never cut, it wraps on words;
// the press word stands beside it when both fit, else on a dim line under it (as a group row's value).
// `under`: the word goes under even when it would fit beside, so rows of one kind that do not all fit behave the same
export const sentenceParts = (c: Pick<PaneCtx, 'el' | 'widthPt'>, key: string, text: string, word = '', under = false): { content: Drawn; lines: number; right?: string } => {
  const { Text } = c.el
  if (word === '') return { content: <Text key={key}>{text}</Text>, lines: wordTooWide(text, c.widthPt) ? 1 : wrappedLines(text, c.widthPt) }
  if (!under && valueBeside(text, word, c.widthPt)) return { content: <Text key={key}>{text}</Text>, lines: 1, right: word }
  const cut = wordTooWide(text, c.widthPt)
  return { content: memoryLabel(c.el, key, { label: text, note: word }, cut), lines: (cut ? 1 : wrappedLines(text, c.widthPt)) + wrappedLines(word, c.widthPt) }
}
export const sentenceLine = (c: Pick<PaneCtx, 'el' | 'widthPt'>, key: string, text: string, word: string, isOpen: boolean, onPress: () => void, under = false): Drawn => {
  const s = sentenceParts(c, `${key}-words`, text, word, under)
  return OpenLine(c.el, key, s.content, isOpen, onPress, { widthPt: c.widthPt, lines: s.lines, ...(s.right === undefined ? {} : { right: s.right }), tall: true })
}

// Split on the line's own separators; a line that does not split keeps all its words as the label.
export const memoryParts = (title: string): { label: string; value?: string; note?: string } => {
  const semi = title.indexOf('; ')
  const head = semi < 0 ? title : title.slice(0, semi)
  const note = semi < 0 ? undefined : title.slice(semi + 2)
  const cut = head.lastIndexOf(', ')
  return cut < 0 ? { label: head, ...(note === undefined ? {} : { note }) } : { label: head.slice(0, cut), value: head.slice(cut + 2), ...(note === undefined ? {} : { note }) }
}

// A row of another session: the question row's form (bold name, dim event line, the age at its end or after the words when they do not leave it room)
const sessionRow = (c: PaneCtx, id: string, r: GroupRow): Drawn[] => {
  const key = `${id}:${r.key}`
  const s = r.session as { name?: string; calm?: boolean }
  const age = r.right ?? ''
  // This session's row has no name: its title is the bold line and the age alone the dim line
  const name = s.name ?? r.title
  const said = s.name === undefined ? '' : r.title
  const beside = age !== '' && detailBeside(said, age, c.widthPt)
  const detail = age === '' || beside ? said : said === '' ? age : `${said} · ${age.replace(/ /g, '\u00a0')}`
  return [
    SessionRow(c.el, `ol-${key}`, { kind: s.calm === true ? 'idle' : 'needs', word: tr(s.calm === true ? 'Stopped' : 'Needs you'), name, wrap: true, markOnly: true, innerPt: c.widthPt, detail, ...(beside ? { detailRight: age } : {}), after: chevronOf(c, key, r.acted, name), onPress: toggle(c, key, r.acted) }),
    whatOpen(c, key, r.what, r.acted, false, (r as GroupRow & { inside?: Inside }).inside, r.marks),
  ]
}

export const groupsView = (c: PaneCtx, id: string, groups: LineGroup[]): Drawn[] => {
  const { Box, Text } = c.el
  // Every card opens its rows the same way (the Pull requests card's flat dim bodies are gone: an answer reads as plain rows)
  const flat = false
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
      {shownRows.flatMap(r0 => {
        if (r0.session !== undefined) return sessionRow(c, id, r0)
        const r = r0.middle === true ? { ...r0, title: middleFit(r0.title, c.widthPt) } : r0
        const action = r.action
        const memo = id === 'skills' && r.key === 'cost' ? memoryParts(r.title) : undefined
        // The label is never cut: a value that does not fit beside it goes on its own dim line under it, wrapped on words
        // A row with dim lines under it (`note`) puts its value under its label too, so the lines get the whole width
        const under = memo === undefined && r.right !== undefined && r.right !== '' && ((r.note ?? []).length > 0 || !valueBeside(r.title, r.right, c.widthPt))
        // A `wrap` row wraps on words; a word wider than the row (a long branch) cannot wrap, so that title is cut at its end with "…" (the app would clip it with no mark)
        // A row with no value is a sentence that tells something: it wraps too, never cut
        const wraps = (r.wrap === true || r.right === undefined || r.right === '') && !wordTooWide(r.title, c.widthPt)
        const own = memo !== undefined ? memoryLabel(c.el, `${id}-mem`, memo) : under ? memoryLabel(c.el, `${id}-under`, { label: r.title, note: r.right }, !wraps && wordTooWide(r.title, c.widthPt)) : (r.right === undefined || r.right === '') && !wraps ? <Text wrap="truncate-end">{r.title}</Text> : <Text>{r.title}</Text>
        const ownLines = memo !== undefined ? (memo.note === undefined ? 1 : 2) : under ? (wraps ? brokenLines(r.title, c.widthPt) : wordTooWide(r.title, c.widthPt) ? 1 : wrappedLines(r.title, c.widthPt)) + wrappedLines(r.right ?? '', c.widthPt) : wraps && (r.right === undefined || r.right === '') ? wrappedLines(r.title, c.widthPt) : 1
        // `note`: whole dim lines under the row's own words (the names of failing tests), wrapped, never cut
        const notes = r.note ?? []
        const content = notes.length === 0 ? own : (
          <Box key={`${id}-${r.key}-noted`} flexDirection="column">
            {own}
            {notes.map((l, k) => (
              <Text key={`${id}-${r.key}-note${k}`} dimColor>
                {l}
              </Text>
            ))}
          </Box>
        )
        const lines = ownLines + notes.reduce((sum, l) => sum + wrappedLines(l, c.widthPt), 0)
        const right = memo !== undefined ? memo.value : under ? undefined : r.right
        return action === undefined
          ? whatLine(c, `${id}:${r.key}`, content, r.what, r.acted, lines, right, true, flat, (r as GroupRow & { inside?: Inside }).inside, r.marks, memo === undefined)
          : [OpenLine(c.el, `ol-${id}:${r.key}`, content, c.prefs.open === `${id}:${r.key}`, () => c.act.run(action), { widthPt: c.widthPt, lines, right: memo !== undefined ? r.right : right, tall: true, keepLabel: memo === undefined }), whatOpen(c, `${id}:${r.key}`, r.what, undefined, flat, undefined, r.marks)]
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
  return LinkButton(c.el, `pointer-${id}-open`, `${tr(word)} ›`, () => { if (!c.prefs.openSections.includes(key)) c.act.toggleSection(key) }, { row: true, dim: true })
}

// `bodySays`: the open body already says what the headline says, so the open header leaves it out (GlanceOpts.bodySays)
export const moreOf = (c: PaneCtx, id: CardId, same = false, bodySays = false) => {
  const d = c.prefs.cardDetail[id]
  const to: Detail = d === 'explained' ? 'simple' : 'explained'
  const shrunk = c.prefs.shrunk?.includes(id) === true
  const glance = c.glanceOf?.(id)
  const fresh = glance === undefined && isNewCard(c.prefs.lists.seen, id)
  return { widthPt: c.widthPt, more: { isFull: d === 'explained', onPress: () => c.act.flipDetail(id, to, shrunk), ...(same ? { same: true } : {}) }, ...(glance === undefined ? {} : { glance: bodySays ? { ...glance, bodySays: true } : glance, flip: { onPress: () => c.act.toggleSection(flipKey(id)) } }), ...(fresh ? { chip: { word: NEW_CHIP, on: true } } : {}) }
}

export const headlineShown = (c: PaneCtx, id: CardId, title: string): boolean => {
  const glance = c.glanceOf?.(id)
  if (glance === undefined) return false
  if (glance.value === '') return true
  const trail = glanceTrailPt(moreOf(c, id).more)
  return glanceShown(title, glance, trail) === glance.value || glanceBelow(title, glance, trail) === glance.value
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
    <Box key={`row-${id}`} flexDirection={isStacked ? 'column' : 'row'} justifyContent="space-between" alignItems={isStacked ? 'stretch' : 'flex-start'} minHeight={rows(settingRowMinPt(note))} columnGap={cols(cardGapX())} {...(isStacked ? { rowGap: vstep(CHOICE_NOTE_GAP) } : {})}>
      {words}
      {/* With no chip the choices stand alone: their own Box is already a row that does not shrink */}
      {isStacked || chip === undefined ? (
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
