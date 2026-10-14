// Opened from a line's "Change in Settings", it shows only that line's card, with "All settings" beside Done.
import { ADVANCED_SECTION, SECTIONS, SETTINGS, focusRows, orderedOptions, rowsFor, sectionOf, sectionRows, switchOf } from '../../../core/settings'
import type { Section, Setting } from '../../../core/settings'
import { CARDS_NOTE, CHANGED_CHIP, COUNTS_LINE, COUNT_CHIP, COUNT_CHIP_SHORT, ERASE_NOTE, MODE_ABOUT, MODE_PICK_NOTE, MODE_SHORT, MODE_TAG, MODE_THIS_PROJECT, MODE_TITLE, RESET_ASK, RESET_ASK_PROJECT, RESET_CLEAR, RESET_DONE, RESET_DONE_PROJECT, RESET_KEEP, RESET_NOTE, SESSIONS_NOTE, VIEW_LOCK_NOTE, cardOfFocus, jumpShown, modeLabel, tally, viewLocksRow } from '../../../core/settingsmap'
import { changedBySection } from '../../../core/changed'
import { sizeWord } from '../../../core/erase'
import { listedCardOf } from '../../../core/cardhome'
import type { JumpTo } from '../../../core/settingsmap'
import { viewModeOf } from '../viewset'
import { MODES, modeNow } from '../../../core/presets'
import { BACK_LABEL } from '../../../core/cardsettings'
import { langNow, t, tr } from '../../../core/lang'
import { ActionButton, CARD_GAP, CARD_GAP_X, ViewHeader, Card, LinkButton, OpenLine, Pick, RadioList, headerChip, nameTabLabel, vstep, wrappedLines } from '../../../ui/kit'
import type { El } from '../../../ui/kit'
import { hoverScope } from '../../../ui/firstclick'
import { ADVICE_BUTTON_GAP, BORDER_X_PT, COL_PT, GROUP_GAP, LIST_COL_GAP, PRESS_FRAME_H, SETTINGS_ROW_GAP, SETTINGS_OPEN_ROWS_PER_COLUMN, SETTINGS_SPAN_GAP, cols } from '../../../ui/tokens'
import { columnSizes } from '../board'
import { paneGrid, type ColumnCap } from '../grid'
import { ageWord, stateWord } from '../logic'
import type { Acts, Prefs } from '../prefs'
import { ChoiceRow } from '../parts'
import { settingRowOf } from './settingrow'
import { flags } from '../state'
import { layoutLabel } from '../layouts'
import { BACK_WORDS, backAskLines } from '../backmode'

const SESSION_MARKS = [
  { value: 'show', label: 'Show' },
  { value: 'pin', label: 'Pin' },
  { value: 'hide', label: 'Hide' },
]

export function SettingsView(el: El, prefs: Prefs, act: Acts, paneInnerPt: number, cap?: ColumnCap) {
  const { Box, Text, Input } = el
  const canDrag = el.Client !== undefined
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
  const shownGroups = (groups: { group: string; rows: Setting[] }[]) =>
    groups.map(g => ({ group: g.group, rows: g.rows.filter(r => !viewLocksRow(r.key, viewNow)) })).filter(g => g.rows.length > 0 || (viewLocked && g.group === 'Cards'))
  const rowOf = settingRowOf(el, prefs, act, innerPt)
  const groupBody = (group: string, rows: Setting[], rowFor: typeof rowOf = rowOf, head = true) => (
    <Box key={`group-${group}`} flexDirection="column" rowGap={vstep(SETTINGS_ROW_GAP)}>
      {group === 'Cards' && head ? <Text dimColor>{tr(viewLocked ? VIEW_LOCK_NOTE : CARDS_NOTE)}</Text> : null}
      {rows.map(rowFor)}
    </Box>
  )
  const layoutsBody = (
    <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>
      <Text dimColor>{t('common.a_layout_remembers_the_look_detail')}</Text>
      {Object.keys(prefs.layouts).map(name => (
        <Box key={`layout-${name}`} flexDirection="row" justifyContent="space-between" alignItems="center" columnGap={cols(CARD_GAP_X)}>
          <Box flexDirection="column" flexShrink={1}>
            <Text>{layoutLabel(name)}</Text>
            {prefs.currentLayout === name ? <Text dimColor>{t('common.in_use')}</Text> : null}
          </Box>
          <Box flexDirection="row" flexShrink={0} columnGap={cols(CARD_GAP_X)}>
            {ActionButton(el, `layout-apply-${name}`, t('common.apply'), () => act.applyLayout(name), { primary: prefs.currentLayout !== name, gap: CARD_GAP_X })}
            {ActionButton(el, `layout-rename-${name}`, t('common.rename'), () => act.renameLayout(name, flags.layoutDraft), { gap: CARD_GAP_X })}
            {ActionButton(el, `layout-delete-${name}`, t('common.delete'), () => act.deleteLayout(name), { gap: CARD_GAP_X })}
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
  const counts = all ? tally(SETTINGS, valuesNow, canDrag) : undefined
  const changed = all ? changedBySection(SETTINGS, valuesNow, canDrag) : new Map<string, number>()
  const lang = langNow()
  const mode = modeNow(valuesNow)
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
            {here ? <Text dimColor>{t(MODE_THIS_PROJECT, { name: project.name })}</Text> : null}
            {/* The mode on now is the filled mark, so the card has no chip. */}
            {RadioList(el, 'mode', MODES.map(m => ({ value: m, label: modeLabel(m, lang), tag: t(MODE_TAG[m] ?? ''), summary: t(MODE_SHORT[m] ?? '') })), mode, v => act.startHere(v), innerPt)}
            {mode === 'custom' ? <Text dimColor>{t(MODE_ABOUT.custom ?? '')}</Text> : null}
            {mode === 'custom' && prefs.backAsk !== true ? LinkButton(el, 'mode-back', t(BACK_WORDS.offer), () => act.askBack?.('ask'), { row: true, chevron: true, widthPt: innerPt }) : null}
            {mode === 'custom' && prefs.backAsk === true ? (
              <Box key="mode-back-ask" flexDirection="column">
                <Text dimColor>{t(BACK_WORDS.head)}</Text>
                {backAskLines(valuesNow, tr).map((l, n) => (
                  <Text key={`mode-back-line-${n}`} dimColor>
                    {l}
                  </Text>
                ))}
                <Box key="mode-back-buttons" marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexShrink={0} columnGap={cols(CARD_GAP_X)}>
                  {ActionButton(el, 'mode-back-yes', t(BACK_WORDS.yes), () => act.askBack?.('yes'), { primary: true, gap: CARD_GAP_X })}
                  {ActionButton(el, 'mode-back-keep', t(BACK_WORDS.keep), () => act.askBack?.('keep'), { gap: CARD_GAP_X })}
                </Box>
              </Box>
            ) : null}
            <Text dimColor>{t(MODE_PICK_NOTE)}</Text>
            <Text>{fill(COUNTS_LINE, { on: counts.on + counts.suggest, total: counts.on + counts.suggest + counts.off, suggest: counts.suggest, off: counts.off })}</Text>
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
      <Box key={`span-${sec.name}`} flexDirection="row" columnGap={cols(SETTINGS_SPAN_GAP)} alignItems="flex-start">
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
  const chipOf = (sec: Section, cell: { on: number; total: number }, widthPt: number): string => {
    const n = changed.get(sec.name) ?? 0
    const more = n > 0 ? ` \u00b7 ${fill(CHANGED_CHIP, { n })}` : ''
    const long = fill(COUNT_CHIP, { on: cell.on, total: cell.total })
    const short = t(COUNT_CHIP_SHORT, { on: cell.on, total: cell.total })
    return headerChip(widthPt, tr(sec.title), [`${long}${more}`, `${short}${more}`, short])
  }
  const sectionCardOf = (sec: Section, isOpen: boolean, span: number, failed?: string) => {
    const key = `section:${sec.name}`
    const lineWidth = span === 1 ? innerPt : Math.floor(span * grid.colPt + (span - 1) * grid.gapPt - 2 * BORDER_X_PT)
    // The inner columns of a spanning section are whole cells too, SETTINGS_SPAN_GAP apart
    const colInner = span === 1 ? innerPt : Math.floor((Math.floor(lineWidth / COL_PT) - (span - 1) * cols(SETTINGS_SPAN_GAP)) / span) * COL_PT
    const rowFor = span === 1 ? rowOf : settingRowOf(el, prefs, act, colInner)
    const toggleSec = () => act.toggleSection(key)
    const cell = counts?.bySection.get(sec.name)
    const onJump = sec.jump === undefined ? undefined : jumpTo(sec.jump.to)
    const cardKey = `settings-${sec.name.toLowerCase().replace(/ /g, '-')}`
    const jumpRow = sec.jump === undefined || onJump === undefined ? null : LinkButton(el, `jump-${cardKey}`, tr(sec.jump.label).replace(/\s*›$/, ''), onJump, { row: true, chevron: true })
    const parts = isOpen || jumpRow !== null
    // The about line is `lines` rows high (its least height)
    const about = OpenLine(el, `ol-${key}`, <Text dimColor>{tr(sec.about)}</Text>, isOpen, toggleSec, { widthPt: lineWidth, tall: true, lines: wrappedLines(tr(sec.about), lineWidth), scope: hoverScope(`hdr-${cardKey}`) })
    return Card(
      el,
      cardKey,
      tr(sec.title),
      '',
      <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>
        {parts ? null : about}
        {jumpRow}
        {failed === undefined ? null : <Text key={`failed-${key}`}>{t('settings.section_failed').replace('{error}', failed)}</Text>}
        {!isOpen ? null : span === 1 ? shownGroups(sectionRows(sec, canDrag)).map(g => groupBody(g.group, g.rows, rowFor)) : spanColumns(sec, span, colInner, rowFor)}
        {!isOpen || span > 1 || !sec.groups.includes('Layouts') ? null : layoutsBlock}
        {!isOpen || span > 1 || !sec.groups.includes('Sessions') || prefs.allOthers.length === 0 ? null : sessionsBlock}
      </Box>,
      {
        headPress: toggleSec,
        ...(parts ? { lead: about } : { whole: true }),
        // The title and the count chip share ONE row: the chip takes its longest form that fits beside the title ("9 of 11 settings on · 1 changed", "9 of 11 on
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
  type Cell = { key: string; open: boolean; span: number; node: (span: number) => ReturnType<typeof Card> | null }
  const cells: Cell[] = [
    ...(withMode ? [{ key: 'mode', open: false, span: 1, node: () => modeCard }] : []),
    ...sections.map((sec): Cell => ({ key: sec.name, open: isOpenSec(sec) && spanOf(sec) > 1, span: spanOf(sec), node: span => sectionCard(sec, span) })),
  ]
  const runView = (key: string, run: Cell[], ncolAvail: number) => {
    const n = Math.max(1, Math.min(ncolAvail, run.length))
    const sizes = columnSizes(run.length, n as Parameters<typeof columnSizes>[1])
    const grow = run.length >= ncolAvail ? 1 : 0
    let at = 0
    return (
      <Box key={`run-${key}`} flexDirection="row" columnGap={grid.gapCells} alignItems="flex-start" flexGrow={grow} flexShrink={0}>
        {sizes.map((size, c) => {
          const part = run.slice(at, at + size)
          at += size
          return (
            <Box key={key === '0' ? `settings-col-${c}` : `settings-col-${key}-${c}`} width={grid.colCells} flexGrow={0} flexShrink={0} overflow="hidden" flexDirection="column" rowGap={vstep(CARD_GAP)}>
              {part.map(cell => cell.node(1))}
            </Box>
          )
        })}
      </Box>
    )
  }
  const bands = (): ReturnType<typeof runView>[] => {
    const out: ReturnType<typeof runView>[] = []
    let i = 0
    while (i < cells.length) {
      const here1 = cells[i] as Cell
      if (!here1.open) {
        let j = i
        while (j < cells.length && !(cells[j] as Cell).open) j += 1
        out.push(runView(`${i}`, cells.slice(i, j), grid.ncol))
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
  const sectionsView = grid.ncol === 1 ? cells.map(c => c.node(1)) : <Box key="settings-columns" width="100%" flexDirection="column" rowGap={vstep(CARD_GAP)}>{bands()}</Box>
  const footPt = grid.ncol > 1 ? grid.colCells * COL_PT : paneInnerPt
  const footerCell = (key: string, node: ReturnType<typeof Box>) => <Box key={`foot-${key}`} flexDirection="column" flexShrink={1} {...(grid.ncol > 1 ? { width: grid.colCells } : {})}>{node}</Box>
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
      {all ? sectionsView : oneCol ? <Box key="cap-focus" flexDirection="column" width={cap.cells} flexShrink={0} rowGap={vstep(CARD_GAP)}>{focusBody}</Box> : focusBody}
      {!all ? null : (
      <Box key="settings-footer" flexDirection={grid.ncol > 1 ? 'row' : 'column'} flexWrap="wrap" alignItems={grid.ncol > 1 ? 'flex-start' : 'stretch'} columnGap={grid.gapCells} rowGap={vstep(CARD_GAP)}>
      {footerCell('reset', (
        <Box key="settings-reset-block" flexDirection="column" alignItems="stretch" rowGap={vstep(ADVICE_BUTTON_GAP)}>
          {flags.resetStep === 'done' ? <Box key="settings-reset-done"><Text dimColor>{tr(here ? RESET_DONE_PROJECT : RESET_DONE)}</Text></Box> : null}
          {flags.resetStep === 'ask' ? (
            <Box key="settings-reset-ask" flexDirection="column" alignItems="flex-start">
              <Text>{tr(here ? RESET_ASK_PROJECT : RESET_ASK)}</Text>
              <Box marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexShrink={0} columnGap={cols(CARD_GAP_X)}>
                {ActionButton(el, 'settings-reset-clear', RESET_CLEAR, () => act.resetSettings(), { primary: true, gap: CARD_GAP_X })}
                {ActionButton(el, 'settings-reset-keep', RESET_KEEP, () => act.askReset(false), { gap: CARD_GAP_X })}
              </Box>
            </Box>
          ) : (
            LinkButton(el, 'settings-reset', here ? t('common.follow_all_projects') : t('common.reset_to_defaults'), () => act.askReset(true), { row: true, chevron: true, widthPt: footPt })
          )}
          {flags.resetStep === 'ask' || here ? null : <Text key="settings-reset-note" dimColor>{tr(RESET_NOTE)}</Text>}
        </Box>
      ))}
      {footerCell('erase', (
        <Box key="settings-erase-block" flexDirection="column" alignItems="stretch" rowGap={vstep(ADVICE_BUTTON_GAP)}>
          {flags.eraseStep === 'done' && flags.eraseDone !== undefined ? <Box key="settings-erase-done"><Text dimColor>{flags.eraseDone.unread === true ? t('settings.erase_unread') : t('settings.erase_done')}{flags.eraseDone.left > 0 ? ` ${t('settings.erase_left').replace('{n}', String(flags.eraseDone.left))}` : ''}</Text></Box> : null}
          {flags.eraseStep === 'preview' && flags.erasePreview !== undefined ? (
            <Box key="settings-erase-ask" flexDirection="column" alignItems="flex-start">
              <Text>{t('settings.erase_ask')}</Text>
              <Text dimColor>{t('settings.erase_keys').replace('{n}', String(flags.erasePreview.keys))}</Text>
              <Text dimColor>{flags.erasePreview.folders.length === 0 ? t('settings.erase_no_folders') : t('settings.erase_folders').replace('{n}', String(flags.erasePreview.folders.length)).replace('{size}', flags.erasePreview.kb === undefined ? t('cardcompact.size_not_known') : sizeWord(flags.erasePreview.kb))}</Text>
              {flags.erasePreview.folders.length === 0 ? null : <Text dimColor>{flags.erasePreview.folders.map(f => f.name).join(', ')}</Text>}
              <Text dimColor>{t('settings.erase_safe')}</Text>
              <Text dimColor>{t('settings.erase_halt')}</Text>
              <Box marginTop={vstep(ADVICE_BUTTON_GAP)} flexDirection="row" flexShrink={0} columnGap={cols(CARD_GAP_X)}>
                {ActionButton(el, 'settings-erase-confirm', t('settings.erase_confirm'), () => act.eraseAll(), { primary: true, gap: CARD_GAP_X })}
                {ActionButton(el, 'settings-erase-keep', RESET_KEEP, () => act.askErase(false), { gap: CARD_GAP_X })}
              </Box>
            </Box>
          ) : (
            LinkButton(el, 'settings-erase', t('settings.erase_open'), () => act.askErase(true), { row: true, chevron: true, widthPt: footPt })
          )}
          {flags.eraseStep === 'preview' && flags.erasePreview !== undefined ? null : <Text key="settings-erase-note" dimColor>{tr(ERASE_NOTE)}</Text>}
          <Text key="settings-privacy-note" dimColor>{t('settings.privacy_note')}</Text>
        </Box>
      ))}
      </Box>
      )}
    </Box>
  )
}
