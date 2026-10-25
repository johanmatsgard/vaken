// Opened from a line's "Change in Settings", it shows only that line's card, with "All settings" beside Done.
import { ADVANCED_SECTION, SECTIONS, SETTINGS, focusRows, orderedOptions, rowsFor, sectionOf, sectionRows, switchOf } from '../../../core/settings'
import type { Section, Setting } from '../../../core/settings'
import { CARDS_NOTE, CHANGED_CHIP, chipWord, COUNTS_LINE, COUNT_CHIP_SHORT, ERASE_NOTE, MODE_ABOUT, MODE_PICK_NOTE, MODE_SHORT, MODE_TAG, MODE_THIS_PROJECT, MODE_TITLE, RESET_ASK, RESET_ASK_PROJECT, RESET_CLEAR, RESET_DONE, RESET_DONE_PROJECT, RESET_KEEP, RESET_NOTE, SESSIONS_NOTE, VIEW_LOCK_NOTE, cardOfFocus, jumpShown, modeLabel, presetLabel, tally, viewLocksRow } from '../../../core/settingsmap'
import { changedBySection, changedRows } from '../../../core/changed'
import { sizeWord } from '../../../core/erase'
import { listedCardOf } from '../../../core/cardhome'
import type { JumpTo } from '../../../core/settingsmap'
import { viewModeOf } from '../viewset'
import { MODES, modeNow } from '../../../core/presets'
import { BACK_LABEL } from '../../../core/cardsettings'
import { langNow, t, tr } from '../../../core/lang'
import { ActionButton, CARD_GAP, cardGapX, ViewHeader, Card, GroupBreak, LinkButton, MoreRow, OpenLine, Pick, RadioList, Row, headerChip, nameTabLabel, vstep, wrappedLines } from '../../../ui/kit'
import type { El } from '../../../ui/kit'
import { hoverScope } from '../../../ui/firstclick'
import { ADVICE_BUTTON_GAP, BODY_ROW_GAP, BORDER_X_PT, CLOSED_CARD_H, columnPt, ROW_PT, GROUP_GAP, LIST_COL_GAP, LIST_ROW_H, PRESS_FRAME_H, SETTINGS_CHANGED_SHOW, SETTINGS_ROW_GAP, SETTINGS_OPEN_ROWS_PER_COLUMN, settingsSpanGap, cols } from '../../../ui/tokens'
import { columnSizes } from '../board'
import { paneGrid, type ColumnCap } from '../grid'
import { ageWord, stateWord } from '../logic'
import type { Acts, Prefs } from '../prefs'
import { ChoiceRow } from '../parts'
import { settingRowOf } from './settingrow'
import { flags } from '../state'
import { layoutLabel } from '../layouts'
import { BACK_WORDS, backAskLines } from '../backmode'
import { CLAUDE_GETS_PARTS, MOST_USED_KEYS, claudeGets, findRows, findWordsOf } from '../../../core/findit'

const SESSION_MARKS = [
  { value: 'show', label: 'Show' },
  { value: 'pin', label: 'Pin' },
  { value: 'hide', label: 'Hide' },
]

export function SettingsView(el: El, prefs: Prefs, act: Acts, paneInnerPt: number, cap?: ColumnCap) {
  const { Box, Text, Input } = el
  const canDrag = el.drag
  const focus = prefs.settingsFocus
  const all = focus === undefined
  const sections: Section[] = all ? [...SECTIONS, ADVANCED_SECTION] : []
  const project = prefs.project
  const here = project !== undefined && prefs.settingsScope === 'project'
  const valuesNow = here ? prefs.values : prefs.globalValues
  const withMode = all
  const grid = paneGrid(paneInnerPt + 2 * BORDER_X_PT, prefs.values['look.columns'], sections.length + (withMode ? 1 : 0))
  const oneCol = cap?.capped === true
  const oneInnerPt = oneCol ? cap.innerPt : paneInnerPt
  const innerPt = all ? grid.innerPt : oneInnerPt
  const viewNow = valuesNow['look.view']
  const viewLocked = (viewNow ?? 'standard') !== 'custom'
  // On the whole page the Most used rows sit in their own card at the top, not again in their sections
  const inSection = (r: Setting): boolean => !all || !MOST_USED_KEYS.includes(r.key)
  // The session and day amounts mean nothing while the budget is Off, so they show only once it warns or stops (as on the flip side)
  const budgetOff = (valuesNow['cost.budget'] ?? 'off') === 'off'
  const budgetHides = (r: Setting): boolean => budgetOff && (r.key === 'cost.session' || r.key === 'cost.day')
  const shownGroups = (groups: { group: string; rows: Setting[] }[]) =>
    groups.map(g => ({ group: g.group, rows: g.rows.filter(r => !viewLocksRow(r.key, viewNow) && inSection(r) && !budgetHides(r)) })).filter(g => g.rows.length > 0 || (viewLocked && g.group === 'Cards'))
  const rowOf = settingRowOf(el, prefs, act, innerPt)
  // A group of one row with no note is that row alone: a Box around one child changes nothing on screen and costs an element
  const groupBody = (group: string, rows: Setting[], rowFor: typeof rowOf = rowOf, head = true) => {
    const note = group === 'Cards' && head
    if (!note && rows.length === 1) return rowFor(rows[0] as Setting)
    return (
      <Box key={`group-${group}`} flexDirection="column" rowGap={vstep(SETTINGS_ROW_GAP)}>
        {note ? <Text dimColor>{tr(viewLocked ? VIEW_LOCK_NOTE : CARDS_NOTE)}</Text> : null}
        {rows.map(rowFor)}
      </Box>
    )
  }
  const layoutsBody = (
    <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>
      <Text dimColor>{t('common.a_layout_remembers_the_look_detail')}</Text>
      {Object.keys(prefs.layouts).map(name => (
        <Box key={`layout-${name}`} flexDirection="row" justifyContent="space-between" alignItems="center" columnGap={cols(cardGapX())}>
          <Box flexDirection="column" flexShrink={1}>
            <Text>{layoutLabel(name)}</Text>
            {prefs.currentLayout === name ? <Text dimColor>{t('common.in_use')}</Text> : null}
          </Box>
          <Box flexDirection="row" flexShrink={0} columnGap={cols(cardGapX())}>
            {ActionButton(el, `layout-apply-${name}`, t('common.apply'), () => act.applyLayout(name), { primary: prefs.currentLayout !== name, gap: cardGapX() })}
            {ActionButton(el, `layout-rename-${name}`, t('common.rename'), () => act.renameLayout(name, flags.layoutDraft), { gap: cardGapX() })}
            {ActionButton(el, `layout-delete-${name}`, t('common.delete'), () => act.deleteLayout(name), { gap: cardGapX() })}
          </Box>
        </Box>
      ))}
      {Input === undefined ? null : <Input key="layout-name" placeholder={t('common.name_it_optional')} value={flags.layoutDraft} submitLabel={t('common.save')} onInput={v => { flags.layoutDraft = v }} onSubmit={v => act.saveLayout(v)} />}
    </Box>
  )
  const sessionsBody = (
    <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>
      <Text dimColor>{tr(SESSIONS_NOTE)}</Text>
      {[...prefs.allOthers].sort((a, b) => a.name.localeCompare(b.name) || a.rec.sessionId.localeCompare(b.rec.sessionId)).map(r => ChoiceRow(el, `session-${r.rec.sessionId}`, r.name, `${tr(stateWord(r.kind === 'needs' ? 'idle' : r.kind))}, ${ageWord(r.sinceMs)}`, SESSION_MARKS, prefs.marks[r.rec.sessionId] ?? 'show', v => act.setMark(r.rec.sessionId, v as 'pin' | 'hide' | 'show'), undefined, innerPt))}
    </Box>
  )
  const inSections = all ? SETTINGS.filter(inSection) : []
  const sectionCounts = all ? tally(inSections, valuesNow, canDrag) : undefined
  // The header counts the same rows as the section chips, so its figures are their sum
  const counts = sectionCounts
  const changed = all ? changedBySection(inSections, valuesNow, canDrag) : new Map<string, number>()
  const mostRows = all ? MOST_USED_KEYS.map(k => SETTINGS.find(s => s.key === k)).filter((r): r is Setting => r !== undefined && r.hidden !== true && (r.desktopOnly !== true || canDrag) && !viewLocksRow(r.key, viewNow)) : []
  const findQ = flags.settingsFind
  const finding = all && Input !== undefined && findWordsOf(findQ).length > 0
  const lang = langNow()
  const mode = modeNow(valuesNow)
  // Changed by you: every row that differs from the mode in use, each a press that puts it back; the first few, the rest behind "Show N more"
  const mine = all ? changedRows(SETTINGS, valuesNow, canDrag) : []
  const moreKey = 'fold:settings-changed'
  const moreOpen = prefs.openSections.includes(moreKey)
  const mineShown = moreOpen ? mine : mine.slice(0, SETTINGS_CHANGED_SHOW)
  const undo = prefs.settingsUndo
  const undoWord = undo === undefined ? '' : undo.what === 'setup' ? t('settings.undo_setup') : t('settings.undo_mode', { mode: presetLabel(undo.what, lang) })
  const changedBlock =
    mine.length === 0 ? null : (
      <Box key="mode-changed" flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        <Text dimColor>{t('settings.changed_by_you')}</Text>
        {mineShown.map(r => {
          const cur = valuesNow[r.key] ?? r.default
          const line = t('settings.changed_line', { name: tr(r.label), value: tr(chipWord(r, cur, switchOf(r) !== undefined)) })
          const press = () => act.undoChanged?.(r.key)
          return Row(el, `mode-changed-${r.key}`, <Text wrap="truncate-end">{line}</Text>, { value: t('settings.changed_undo'), minPt: LIST_ROW_H, name: line, press: { onPress: press, widthPt: innerPt, heightPt: LIST_ROW_H } })
        })}
        {mine.length <= SETTINGS_CHANGED_SHOW ? null : MoreRow(el, 'mode-changed-more', moreOpen ? 'Show fewer' : `Show ${mine.length - SETTINGS_CHANGED_SHOW} more`, moreOpen, () => act.toggleSection(moreKey))}
      </Box>
    )
  const fill = (template: string, vars: Record<string, number>): string => Object.entries(vars).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), tr(template))
  // Three modes (the preset engine, core/presets.ts) and the mode the values match now, or Custom.
  const modeCard =
    counts === undefined
      ? null
      : Card(
          el,
          'settings-mode',
          tr(MODE_TITLE),
          '',
          <Box flexDirection="column" rowGap={vstep(GROUP_GAP)}>
            {undo === undefined || act.undoSettings === undefined ? null : LinkButton(el, 'mode-undo', undoWord, () => act.undoSettings?.(), { row: true, widthPt: innerPt })}
            {here ? <Text dimColor>{t(MODE_THIS_PROJECT, { name: project.name })}</Text> : null}
            {/* The mode on now is the filled mark, so the card has no chip. */}
            {RadioList(el, 'mode', MODES.map(m => ({ value: m, label: modeLabel(m, lang), tag: t(MODE_TAG[m] ?? ''), summary: t(MODE_SHORT[m] ?? '') })), mode, v => act.startHere(v), innerPt)}
            {mode === 'custom' ? <Text dimColor>{t(MODE_ABOUT.custom ?? '')}</Text> : null}
            <Text key="mode-claude-gets" dimColor>{t('find.claude_gets', { list: claudeGets(valuesNow, k => SETTINGS.find(s => s.key === k)?.default).map(p => t(CLAUDE_GETS_PARTS[p])).join(', ') })}</Text>
            {mode === 'custom' && prefs.backAsk !== true ? LinkButton(el, 'mode-back', t(BACK_WORDS.offer), () => act.askBack?.('ask'), { row: true, chevron: true, widthPt: innerPt }) : null}
            {mode === 'custom' && prefs.backAsk === true ? (
              <Box key="mode-back-ask" flexDirection="column">
                <Text dimColor>{t(BACK_WORDS.head)}</Text>
                {backAskLines(valuesNow, tr).map((l, n) => (
                  <Text key={`mode-back-line-${n}`} dimColor>
                    {l}
                  </Text>
                ))}
                <Box key="mode-back-buttons" marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexShrink={0} columnGap={cols(cardGapX())}>
                  {ActionButton(el, 'mode-back-yes', t(BACK_WORDS.yes), () => act.askBack?.('yes'), { primary: true, gap: cardGapX() })}
                  {ActionButton(el, 'mode-back-keep', t(BACK_WORDS.keep), () => act.askBack?.('keep'), { gap: cardGapX() })}
                </Box>
              </Box>
            ) : null}
            <Text dimColor>{t(MODE_PICK_NOTE)}</Text>
            <Text>{fill(COUNTS_LINE, { on: counts.on + counts.suggest, total: counts.on + counts.suggest + counts.off, suggest: counts.suggest, off: counts.off })}</Text>
            {changedBlock === null ? null : GroupBreak(el, 'mode-changed-rule', innerPt, undefined, true)}
            {changedBlock}
          </Box>,
          { widthPt: innerPt },
        )
  const layoutsBlock = <Box key="settings-layouts" flexDirection="column">{layoutsBody}</Box>
  const sessionsBlock = <Box key="settings-sessions" flexDirection="column">{sessionsBody}</Box>
  type Unit = { w: number; group?: string; row?: Setting; note: boolean; block?: 'layouts' | 'sessions' }
  const partNodes = (part: Unit[], rowFor: typeof rowOf) => {
    const nodes: ReturnType<typeof groupBody>[] = []
    let seg: { group: string; rows: Setting[]; note: boolean } | undefined
    const flush = () => {
      if (seg !== undefined) nodes.push(groupBody(seg.group, seg.rows, rowFor, seg.note))
      seg = undefined
    }
    for (const u of part) {
      if (u.block !== undefined) {
        flush()
        nodes.push(u.block === 'layouts' ? layoutsBlock : sessionsBlock)
      } else if (u.row === undefined) {
        flush()
        seg = { group: u.group ?? '', rows: [], note: true }
      } else {
        if (seg === undefined || seg.group !== u.group) {
          flush()
          seg = { group: u.group ?? '', rows: [], note: false }
        }
        seg.rows.push(u.row)
      }
    }
    flush()
    return nodes
  }
  const spanColumns = (sec: Section, span: number, colInner: number, rowFor: typeof rowOf) => {
    const units: Unit[] = [
      ...shownGroups(sectionRows(sec, canDrag)).flatMap((g): Unit[] => [{ w: 1, group: g.group, note: true }, ...g.rows.map((row): Unit => ({ w: 1, group: g.group, row, note: false }))]),
      ...(sec.groups.includes('Layouts') ? [{ w: 2 + Object.keys(prefs.layouts).length, note: false, block: 'layouts' as const }] : []),
      ...(sec.groups.includes('Sessions') && prefs.allOthers.length > 0 ? [{ w: 2 + prefs.allOthers.length, note: false, block: 'sessions' as const }] : []),
    ]
    const total = units.reduce((sum, u) => sum + u.w, 0)
    const per = total / span
    let seen = 0
    const parts: Unit[][] = Array.from({ length: span }, () => [])
    const at = units.map(u => {
      const n = Math.min(span - 1, Math.floor((seen + u.w / 2) / per))
      seen += u.w
      return n
    })
    units.forEach((u, i) => parts[u.row === undefined && u.block === undefined && i + 1 < units.length ? (at[i + 1] as number) : (at[i] as number)]?.push(u))
    return (
      <Box key={`span-${sec.name}`} flexDirection="row" columnGap={cols(settingsSpanGap())} alignItems="flex-start">
        {parts.map((part, n) => (
          <Box key={`spancol-${sec.name}-${n}`} width={cols(colInner)} flexGrow={0} flexShrink={0} overflow="hidden" flexDirection="column" rowGap={vstep(CARD_GAP)}>
            {partNodes(part, rowFor)}
          </Box>
        ))}
      </Box>
    )
  }
  // Arrange needs the desktop, and the Safety card must be in the view.
  const jumpTo = (to: JumpTo): (() => void) | undefined => (!jumpShown(to, viewModeOf(prefs.values), prefs.hidden) ? undefined : to === 'helpers' ? () => act.openRunner(true) : to === 'arrange' ? (canDrag ? () => act.arrange(true) : undefined) : () => act.openSettings(false))
  const isOpenSec = (sec: Section): boolean => prefs.openSections.includes(`section:${sec.name}`)
  // An open section that cannot be drawn shows closed, with the error in words under its line
  const sectionCard = (sec: Section, span = 1) => {
    try {
      return sectionCardOf(sec, isOpenSec(sec), span)
    } catch (e) {
      return sectionCardOf(sec, false, span, e instanceof Error ? e.message : String(e))
    }
  }
  const spanOf = (sec: Section): number => {
    if (grid.ncol === 1 || !isOpenSec(sec)) return 1
    const n = shownGroups(sectionRows(sec, canDrag)).reduce((sum, g) => sum + g.rows.length + 1, 0) + (sec.groups.includes('Layouts') ? 2 + Object.keys(prefs.layouts).length : 0) + (sec.groups.includes('Sessions') && prefs.allOthers.length > 0 ? 2 + prefs.allOthers.length : 0)
    return Math.max(1, Math.min(grid.ncol, Math.ceil(n / SETTINGS_OPEN_ROWS_PER_COLUMN)))
  }
  // One form on every card, "3 of 4 on · 2 changed": the changed count is never dropped; a chip that does not fit beside the title goes under it
  const chipOf = (sec: Section, cell: { on: number; total: number }, widthPt: number): string => {
    const n = changed.get(sec.name) ?? 0
    const more = n > 0 ? ` \u00b7 ${t(CHANGED_CHIP, { n })}` : ''
    return headerChip(widthPt, tr(sec.title), [`${t(COUNT_CHIP_SHORT, { on: cell.on, total: cell.total })}${more}`])
  }
  const sectionCardOf = (sec: Section, isOpen: boolean, span: number, failed?: string) => {
    const key = `section:${sec.name}`
    const lineWidth = span === 1 ? innerPt : Math.floor(span * grid.colPt + (span - 1) * grid.gapPt - 2 * BORDER_X_PT)
    // The inner columns of a spanning section are whole cells too, settingsSpanGap() apart
    const colInner = span === 1 ? innerPt : Math.floor((Math.floor(lineWidth / columnPt()) - (span - 1) * cols(settingsSpanGap())) / span) * columnPt()
    const rowFor = span === 1 ? rowOf : settingRowOf(el, prefs, act, colInner)
    const toggleSec = () => act.toggleSection(key)
    const cell = sectionCounts?.bySection.get(sec.name)
    const onJump = sec.jump === undefined ? undefined : jumpTo(sec.jump.to)
    const cardKey = `settings-${sec.name.toLowerCase().replace(/ /g, '-')}`
    const jumpRow = sec.jump === undefined || onJump === undefined ? null : LinkButton(el, `jump-${cardKey}`, tr(sec.jump.label).replace(/\s*›$/, ''), onJump, { row: true, chevron: true, widthPt: lineWidth })
    const parts = isOpen || jumpRow !== null
    // The about line is `lines` rows high (its least height)
    const about = OpenLine(el, `ol-${key}`, <Text dimColor>{tr(sec.about)}</Text>, isOpen, toggleSec, { widthPt: lineWidth, tall: true, lines: wrappedLines(tr(sec.about), lineWidth), scope: hoverScope(`hdr-${cardKey}`) })
    return Card(
      el,
      cardKey,
      tr(sec.title),
      '',
      [
        parts ? null : about,
        jumpRow,
        failed === undefined ? null : <Text key={`failed-${key}`}>{t('settings.section_failed').replace('{error}', failed)}</Text>,
        // Quiet starts here, at the top of Notices (the This session card has no Quiet row); while it is on, the same spot ends it
        !isOpen || sec.name !== 'Notices' ? null : prefs.calm?.focus === undefined ? LinkButton(el, 'settings-quiet-start', 'Quiet for 50 min ›', () => act.calm('focus'), { row: true }) : LinkButton(el, 'settings-quiet-end', 'End quiet', () => act.calm('endFocus'), { row: true }),
        !isOpen ? null : span === 1 ? shownGroups(sectionRows(sec, canDrag)).map(g => groupBody(g.group, g.rows, rowFor)) : spanColumns(sec, span, colInner, rowFor),
        !isOpen || span > 1 || !sec.groups.includes('Layouts') ? null : layoutsBlock,
        !isOpen || span > 1 || !sec.groups.includes('Sessions') || prefs.allOthers.length === 0 ? null : sessionsBlock,
      ],
      {
        bodyRowGap: CARD_GAP,
        headPress: toggleSec,
        ...(parts ? { lead: about } : { whole: true }),
        // The title and the count chip share ONE row when the chip fits beside it ("9 of 11 on · 1 changed"), else the chip goes under the title
        widthPt: lineWidth,
        ...(cell === undefined ? {} : { chip: { word: chipOf(sec, cell, lineWidth), on: cell.on > 0 } }),
      },
    )
  }
  const cardBody = (id: string, at: string) => {
    const sec = sectionOf(at)
    const own = shownGroups(rowsFor(canDrag).map(g => ({ group: g.group, rows: g.rows.filter(s => listedCardOf(s.key) === id) })).filter(g => g.rows.length > 0))
    return Card(el, `settings-card-${id}`, tr(sec.title), '', <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>{(own.length > 0 ? own : shownGroups(sectionRows(sec, canDrag))).map(g => groupBody(g.group, g.rows))}</Box>)
  }
  const mostCard = mostRows.length === 0 ? null : Card(el, 'settings-most-used', t('find.most_used'), '', groupBody('Most used', mostRows, rowOf), { widthPt: innerPt })
  type Cell = { key: string; open: boolean; span: number; node: (span: number) => ReturnType<typeof Card> | null }
  const cells: Cell[] = [
    ...(withMode ? [{ key: 'mode', open: false, span: 1, node: () => modeCard }] : []),
    ...(mostCard === null ? [] : [{ key: 'most', open: false, span: 1, node: () => mostCard }]),
    ...sections.map((sec): Cell => ({ key: sec.name, open: isOpenSec(sec) && spanOf(sec) > 1, span: spanOf(sec), node: span => sectionCard(sec, span) })),
  ]
  // A card's estimated height in points (only to find the shortest column for the foot cards): its title row and insets, then its lines
  const linesPt = (texts: string[]): number => texts.reduce((n, x) => n + wrappedLines(x, innerPt) * ROW_PT, 0)
  const cellPt = (c: Cell): number => {
    if (c.key === 'mode') return CLOSED_CARD_H + MODES.length * (PRESS_FRAME_H + ROW_PT)
    if (c.key === 'most') return CLOSED_CARD_H + mostRows.length * 2 * ROW_PT
    const sec = sections.find(x => x.name === c.key)
    return CLOSED_CARD_H + BODY_ROW_GAP + (sec === undefined ? ROW_PT : isOpenSec(sec) ? shownGroups(sectionRows(sec, canDrag)).reduce((n, g) => n + (g.rows.length * 2 + 1) * ROW_PT, 0) : linesPt([tr(sec.about)]))
  }
  const footPt = (f: (typeof footCards)[number]): number => CLOSED_CARD_H + PRESS_FRAME_H + ADVICE_BUTTON_GAP + linesPt(f.notes)
  // `extra`: the foot cards, each under the shortest column of this run (the even columns of the pane, board.ts placeEven)
  const runView = (key: string, run: Cell[], ncolAvail: number, extra: typeof footCards = []) => {
    const n = Math.max(1, Math.min(ncolAvail, run.length))
    const sizes = columnSizes(run.length, n as Parameters<typeof columnSizes>[1])
    const grow = run.length >= ncolAvail ? 1 : 0
    let at = 0
    const parts = sizes.map(size => {
      const part = run.slice(at, at + size)
      at += size
      return part
    })
    const tall = parts.map(part => part.reduce((sum, cell, i) => sum + (i === 0 ? 0 : CARD_GAP) + cellPt(cell), 0))
    const under: (typeof footCards)[] = parts.map(() => [])
    for (const f of extra) {
      const c = tall.reduce((best, pt, i) => (pt < (tall[best] ?? Infinity) ? i : best), 0)
      tall[c] = (tall[c] ?? 0) + CARD_GAP + footPt(f)
      under[c]?.push(f)
    }
    return (
      <Box key={`run-${key}`} flexDirection="row" columnGap={grid.gapCells} alignItems="flex-start" flexGrow={grow} flexShrink={0}>
        {parts.map((part, c) => (
          <Box key={key === '0' ? `settings-col-${c}` : `settings-col-${key}-${c}`} width={grid.colCells} flexGrow={0} flexShrink={0} overflow="hidden" flexDirection="column" rowGap={vstep(CARD_GAP)}>
            {part.map(cell => cell.node(1))}
            {(under[c] ?? []).map(f => f.node)}
          </Box>
        ))}
      </Box>
    )
  }
  // The foot cards join the last run when the page ends with a run of closed cards as wide as the page (else they stay in their own row at the foot)
  const lastRunStart = ((): number => {
    let i = cells.length
    while (i > 0 && !(cells[i - 1] as Cell).open) i -= 1
    return i
  })()
  const footInColumns = all && !finding && grid.ncol > 1 && lastRunStart < cells.length && (lastRunStart === 0 || grid.ncol - (cells[lastRunStart - 1] as Cell).span <= 0)
  const bands = (): ReturnType<typeof runView>[] => {
    const out: ReturnType<typeof runView>[] = []
    let i = 0
    while (i < cells.length) {
      const here1 = cells[i] as Cell
      if (!here1.open) {
        let j = i
        while (j < cells.length && !(cells[j] as Cell).open) j += 1
        out.push(runView(`${i}`, cells.slice(i, j), grid.ncol, footInColumns && j === cells.length ? footCards : []))
        i = j
        continue
      }
      let j = i + 1
      while (j < cells.length && !(cells[j] as Cell).open) j += 1
      const side = cells.slice(i + 1, j)
      const room = grid.ncol - here1.span
      out.push(
        <Box key={`band-${i}`} width="100%" flexDirection="row" columnGap={grid.gapCells} alignItems="flex-start">
          <Box key={`band-open-${i}`} width={here1.span * grid.colCells + (here1.span - 1) * grid.gapCells} flexShrink={0} flexDirection="column">{here1.node(here1.span)}</Box>
          {room > 0 && side.length > 0 ? runView(`${i}-side`, side, room) : null}
        </Box>,
      )
      i = room > 0 && side.length > 0 ? j : i + 1
    }
    return out
  }
  const footerCell = (key: string, node: ReturnType<typeof Box>) => <Box key={`foot-${key}`} flexDirection="column" flexShrink={1} {...(grid.ncol > 1 ? { width: grid.colCells } : {})}>{node}</Box>
  // While the person searches, only the rows that match are drawn: one card for each card they sit in, under its name
  const foundView = () => {
    const places: { key: string; title: string; rows: Setting[] }[] = [
      { key: 'most-used', title: t('find.most_used'), rows: mostRows },
      ...sections.map(sec => ({ key: sec.name.toLowerCase().replace(/ /g, '-'), title: tr(sec.title), rows: shownGroups(sectionRows(sec, canDrag)).flatMap(g => g.rows) })),
    ]
    const hits = places.map(p => ({ ...p, rows: findRows(p.rows, findQ, tr) })).filter(p => p.rows.length > 0)
    const body =
      hits.length === 0 ? (
        <Text key="settings-found-none" dimColor>
          {t('find.no_setting_matches', { words: findQ.trim() })}
        </Text>
      ) : (
        <Box key="settings-found" flexDirection="column" rowGap={vstep(CARD_GAP)}>
          {hits.map(hit => Card(el, `settings-found-${hit.key}`, hit.title, '', groupBody(hit.key, hit.rows, rowOf), { widthPt: innerPt }))}
        </Box>
      )
    return footerCell('found', body)
  }
  // The three cards at the page's foot (Start questions, Reset, Your data). In columns they go under the shortest column of the last run of closed cards
  const footCards: { key: string; node: ReturnType<typeof Card>; notes: string[] }[] = [
    { key: 'setup', notes: [t('firstsetup.run_again_note')], node: Card(el, 'settings-setup-card', t('firstsetup.card_title'), '',
        [
          LinkButton(el, 'settings-setup-again', t('firstsetup.run_again'), () => act.runSetupAgain(), { row: true, chevron: true, widthPt: innerPt }),
          <Text key="settings-setup-note" dimColor>{t('firstsetup.run_again_note')}</Text>,
        ],
        { bodyRowGap: ADVICE_BUTTON_GAP },
      ) },
    { key: 'reset', notes: [tr(RESET_NOTE)], node: Card(el, 'settings-reset-card', t('settings.card_reset'), '',
        [
          flags.resetStep === 'done' ? <Box key="settings-reset-done"><Text dimColor>{tr(here ? RESET_DONE_PROJECT : RESET_DONE)}</Text></Box> : null,
          flags.resetStep === 'ask' ? (
            <Box key="settings-reset-ask" flexDirection="column" alignItems="flex-start">
              <Text>{tr(here ? RESET_ASK_PROJECT : RESET_ASK)}</Text>
              <Box marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexShrink={0} columnGap={cols(cardGapX())}>
                {ActionButton(el, 'settings-reset-clear', RESET_CLEAR, () => act.resetSettings(), { primary: true, gap: cardGapX() })}
                {ActionButton(el, 'settings-reset-keep', RESET_KEEP, () => act.askReset(false), { gap: cardGapX() })}
              </Box>
            </Box>
          ) : (
            LinkButton(el, 'settings-reset', here ? t('common.follow_all_projects') : t('common.reset_to_defaults'), () => act.askReset(true), { row: true, chevron: true, widthPt: innerPt })
          ),
          flags.resetStep === 'ask' || here ? null : <Text key="settings-reset-note" dimColor>{tr(RESET_NOTE)}</Text>,
        ],
        { bodyRowGap: ADVICE_BUTTON_GAP },
      ) },
    { key: 'erase', notes: [tr(ERASE_NOTE), t('settings.privacy_note')], node: Card(el, 'settings-erase-card', t('settings.card_your_data'), '',
        [
          flags.eraseStep === 'done' && flags.eraseDone !== undefined ? <Box key="settings-erase-done"><Text dimColor>{flags.eraseDone.unread === true ? t('settings.erase_unread') : t('settings.erase_done')}{flags.eraseDone.left > 0 ? ` ${t('settings.erase_left').replace('{n}', String(flags.eraseDone.left))}` : ''}</Text></Box> : null,
          flags.eraseStep === 'preview' && flags.erasePreview !== undefined ? (
            <Box key="settings-erase-ask" flexDirection="column" alignItems="flex-start">
              <Text>{t('settings.erase_ask')}</Text>
              <Text dimColor>{t('settings.erase_keys').replace('{n}', String(flags.erasePreview.keys))}</Text>
              <Text dimColor>{flags.erasePreview.folders.length === 0 ? t('settings.erase_no_folders') : t('settings.erase_folders').replace('{n}', String(flags.erasePreview.folders.length)).replace('{size}', flags.erasePreview.kb === undefined ? t('cardcompact.size_not_known') : sizeWord(flags.erasePreview.kb))}</Text>
              {flags.erasePreview.folders.length === 0 ? null : <Text dimColor>{flags.erasePreview.folders.map(f => f.name).join(', ')}</Text>}
              <Text dimColor>{t('settings.erase_safe')}</Text>
              <Text dimColor>{t('settings.erase_halt')}</Text>
              <Box marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexShrink={0} columnGap={cols(cardGapX())}>
                {ActionButton(el, 'settings-erase-confirm', t('settings.erase_confirm'), () => act.eraseAll(), { primary: true, gap: cardGapX() })}
                {ActionButton(el, 'settings-erase-keep', RESET_KEEP, () => act.askErase(false), { gap: cardGapX() })}
              </Box>
            </Box>
          ) : (
            LinkButton(el, 'settings-erase', t('settings.erase_open'), () => act.askErase(true), { row: true, chevron: true, widthPt: innerPt })
          ),
          flags.eraseStep === 'preview' && flags.erasePreview !== undefined ? null : <Text key="settings-erase-note" dimColor>{tr(ERASE_NOTE)}</Text>,
          <Text key="settings-privacy-note" dimColor>{t('settings.privacy_note')}</Text>,
        ],
        { bodyRowGap: ADVICE_BUTTON_GAP },
      ) },
  ]
  const sectionsView = finding ? foundView() : grid.ncol === 1 ? cells.map(c => c.node(1)) : <Box key="settings-columns" width="100%" flexDirection="column" rowGap={vstep(CARD_GAP)}>{bands()}</Box>
  const findField =
    !all || Input === undefined ? null : (
      <Box key="settings-find" flexDirection="column" {...(grid.ncol > 1 ? { width: grid.colCells } : {})}>
        <Input key="settings-find-box" placeholder={t('find.find_a_setting')} value={findQ} submitLabel={t('find.find')} onInput={v => act.find?.('settings', v)} onSubmit={v => act.find?.('settings', v, true)} />
      </Box>
    )
  const focusBody = all ? null : (
      focus === 'Sessions' ? (
        Card(el, 'settings-sessions', t('common.sessions'), '', sessionsBody)
      ) : cardOfFocus(focus) !== undefined ? (
        cardBody(cardOfFocus(focus) ?? '', focus)
      ) : (
        focusRows(focus, canDrag).map(g => Card(el, `settings-${g.group.toLowerCase()}`, tr(g.group), '', <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>{g.rows.map(rowOf)}</Box>))
      )
  )
  return (
    // As wide as the pane's body, so the title row's ends are the frame's at every width (W).
    <Box flexDirection="column" width="100%" alignItems="stretch" rowGap={vstep(CARD_GAP)}>
      {ViewHeader(el, 'settings-head', { key: 'settings-done', label: tr(BACK_LABEL), onPress: () => act.openSettings(false) }, t('common.settings'), all ? {} : { right: LinkButton(el, 'settings-all', t('common.all_settings'), () => act.openSettingsAt(undefined), { on: 'ground' }) })}
      {project === undefined ? null : (
        <Box flexDirection="row" alignItems="center" columnGap={cols(LIST_COL_GAP)}>
          {Pick(el, 'settings-scope', [{ value: 'all', label: t('common.all_projects') }, { value: 'project', label: nameTabLabel(paneInnerPt + 2 * BORDER_X_PT, [t('common.all_projects')], t('common.this_project'), project.name) }], here ? 'project' : 'all', v => act.setScope(v === 'project' ? 'project' : 'all'), true, 'settings-scope', PRESS_FRAME_H, 'ground')}
        </Box>
      )}
      {findField}
      {all ? sectionsView : oneCol ? <Box key="cap-focus" flexDirection="column" width={cap.cells} flexShrink={0} rowGap={vstep(CARD_GAP)}>{focusBody}</Box> : focusBody}
      {!all || finding || footInColumns ? null : (
      <Box key="settings-footer" flexDirection={grid.ncol > 1 ? 'row' : 'column'} flexWrap="wrap" alignItems={grid.ncol > 1 ? 'flex-start' : 'stretch'} columnGap={grid.gapCells} rowGap={vstep(CARD_GAP)}>
      {footCards.map(f => footerCell(f.key, f.node))}
      </Box>
      )}
    </Box>
  )
}
