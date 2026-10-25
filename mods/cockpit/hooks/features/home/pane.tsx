// The pane.
import { shortSummary } from '../../core/ledger'
import { ARRANGE_DROP, ARRANGING_LINE, ARRANGING_LINE_AUTO, ARRANGING_PROBLEMS, ARRANGING_SHOW_HIDE, ARRANGING_WORD, BACK_LABEL, flipKey, isFlipped } from '../../core/cardsettings'
import { glanceIsOpen, glanceOpenKey } from '../../core/headline'
import { tr } from '../../core/lang'
import { POPOUT_BUTTON, POPOUT_BUTTON_SHORT } from '../../core/popout'
import { CARD_GAP, cardGapX, Card, FrameLine, FramePress, LinkButton, Pick, ViewHeader, framePt, framedHere, framedLabel, glanceChipPt, glanceTrailPt, pickDrawnPt, pickLines, vstep, wordBox } from '../../ui/kit'
import type { Drawn, El } from '../../ui/kit'
import { ARRANGE_CLOSED_ROWS, ARRANGE_GAP, ARRANGE_MIN_ROWS, BAR_SLOT, BORDER_X_PT, CARD_INSET_Y_PT, columnPt, CLOSED_CARD_H, FACE_MIN_ROWS, FACE_ROW_PT, GROUP_GAP, LIMIT_GAP, LIST_ROW_GAP, LIST_ROW_H, ROW_PT, cols, rows } from '../../ui/tokens'
import { boardLists, cardHeights, heightOf, holdTop, isIdle, isSteady, listsRows, placeEvenSteady, placeLists, steadyOrder } from './board'
import type { EvenMemory } from './board'
import type { Steady } from './board'
import type { TopHold } from './board'
import { columnCap, columnsUsed, paneGrid } from './grid'
import type { Bucket } from './layouts'
import type { LineGroup } from './linecards'
import { CARD_IDS, LINE_CARD_IDS, ZONE_OF, ZONE_WORD } from './logic'
import type { CardId, Detail, View } from './logic'
import { isNewCard } from '../../core/cardrules'
import { GLANCE_TITLES, glanceDotOf, glanceWordOf, headlineOf } from './headline'
import type { GlanceFacts } from './headline'
import { cardLouds, cardOrder, shrunkCards } from './loud'
import type { Acts, Prefs } from './prefs'
import { DRAW_FAILED } from './prefs'
import type { PaneCtx } from './parts'
import { AgentsCard, agentsModel } from './cards/agents'
import { AutopilotCard, autopilotModel } from './cards/autopilot'
import { ComputerCard, computerModel } from './cards/computer'
import { ADVICE_ROWS, HereCard, hereModel } from './cards/here'
import { openEndsRows } from './cards/calm'
import { LimitCard, limitModel } from './cards/limit'
import { LineCard, linesModel } from './cards/lines'
import { OthersCard, othersModel } from './cards/others'
import { PrsCard } from './cards/prs'
import { BandListCard, NeedsCard, needsGroupsOf, needsRows, needsShut } from './cards/top'
import { NEEDS_SLOT, VIEW_MODES, fixedIds, needsShown, viewModeOf } from './viewset'
import type { Slot, ViewMode } from './viewset'
import { findSetting } from '../../core/settings'
import { GuideView } from './views/guide'
import { HelpView } from './views/help'
import { ReportCard } from './views/report'
import { RunnerView } from './views/runner'
import { FlipFace } from './views/flipface'
import { SettingsView } from './views/settings'
import { StartCard } from './views/start'
import { fmt } from '../../core/fmt'
import { backFactsOf } from './back'
import { welcomeDue } from '../../core/backcard'

let lastPress: number | undefined
let topHold: TopHold | undefined
let steady: Steady | undefined
let evenMemory: EvenMemory | undefined

// The pane closed: the next open draws the cards in their own order at once
export function forgetSteady(): void {
  steady = undefined
  evenMemory = undefined
  lastPress = undefined
}

// Every action the pane hands out stamps the press time first
function stamped<T>(x: T): T {
  if (typeof x === 'function') return ((...a: unknown[]) => ((lastPress = Date.now()), (x as (...b: unknown[]) => unknown)(...a))) as T
  if (x !== null && typeof x === 'object' && !Array.isArray(x)) return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, stamped(v)])) as T
  return x
}

function FootPress(el: El, key: string, label: string, onPress: () => void) {
  const { Button } = el
  // No key: a keyed plain Button draws "h: Help", and the footer says its plain words (core/panekeys.ts)
  // Where no frame can be drawn (a terminal, no Client) the host's framed Button stands in.
  if (!framedHere(el)) return <Button key={key} label={label} onPress={onPress} />
  return FramePress(el, key, label, onPress)
}

// `bodyRows` is how tall the pane's body is
// A part that throws (a broken store value) gives way to its plain stand-in; the rest of the pane still draws
export function drawOrLine<T>(make: () => T, instead: () => T): T {
  try {
    return make()
  } catch {
    return instead()
  }
}

export function HomePane(el: El, view: View, own: Prefs, innerPt: number, onFlip0: (key: string) => void, bodyColumns: number, act0: Acts, bodyRows?: number) {
  const act = stamped(act0)
  const onFlip = stamped(onFlip0)
  const idle = isIdle(Date.now(), lastPress)
  const { Box, Text, Button } = el
  const cap = columnCap(innerPt + 2 * BORDER_X_PT, own.values['look.columns'])
  const capIn = <N extends Drawn>(key: string, node: N) => (cap.capped ? <Box key={key} flexDirection="column" width={cap.cells} flexShrink={0}>{node}</Box> : node)
  // One column on a wide pane: Settings keeps the same reading width at the left (its columns are the pane's, so several columns use the whole width)
  const oneCap = cap.capped && columnsUsed(innerPt + 2 * BORDER_X_PT, own.values['look.columns']) === 1
  if (own.settings) return oneCap ? capIn('cap-settings', SettingsView(el, own, act, innerPt, cap)) : SettingsView(el, own, act, innerPt, cap)
  if (own.runner) return capIn('cap-runner', RunnerView(el, own, act, view.now ?? 0, cap.capped ? cap.innerPt : innerPt))
  // Help on a wide pane lays its topic cards in the pane's columns; one column keeps its reading width at the left
  const helpCols = columnsUsed(innerPt + 2 * BORDER_X_PT, own.values['look.columns'])
  if (own.help) return helpCols > 1 ? HelpView(el, own, act, cap.innerPt, { n: helpCols, cells: cap.cells, gapCells: cols(cardGapX()) }) : capIn('cap-help', HelpView(el, own, act, cap.capped ? cap.innerPt : innerPt))
  if (own.guide === true) return GuideView(el, own, act, innerPt)
  const top: Drawn[] = []
  const cards: Drawn[] = []
  // A column never gets narrower than a phone-sized card (see tokens.ts)
  const bodyPt = innerPt + 2 * BORDER_X_PT
  const columnsChoice = own.values['look.columns']
  const bucket = columnsUsed(bodyPt, columnsChoice) as Bucket
  const linesM = linesModel(view, own)
  const louds = cardLouds(view, own, linesM)
  const mode = viewModeOf(own.values)
  const fixed = fixedIds(mode, mode === 'standard' && !own.hidden.includes('back') && welcomeDue(backFactsOf(view, own)))
  // THE FIRST SCREEN: until Start here is done or skipped, the page shows only Start here and Needs you; the cards come back when setup ends
  const firstScreen = view.firstRun === true
  const visible = firstScreen ? [] : (fixed !== undefined ? [...fixed] : cardOrder(own, louds, bucket)).filter(id => !own.hidden.includes(id))
  const glanceOn = own.values.detail === 'glance'
  const shrunk = glanceOn || fixed !== undefined ? [] : shrunkCards(own, louds, visible)
  const prefs: Prefs = shrunk.length === 0 ? own : { ...own, shrunk, cardDetail: { ...own.cardDetail, ...Object.fromEntries(shrunk.map(id => [id, 'simple' as Detail])) } }
  const topInner = cap.capped ? cap.innerPt : innerPt
  const topCtx: PaneCtx = { el, view, prefs, act, onFlip, widthPt: topInner }
  const needsList = needsGroupsOf(topCtx)
  const needsN = needsRows(topCtx, needsList)
  if (view.firstRun === true || prefs.setupOpen === true) top.push(StartCard(el, prefs, act, topInner, view.firstRun === true))
  if (prefs.report !== undefined) top.push(ReportCard(el, prefs.report, prefs, act, topInner, view.now ?? 0))
  if (prefs.bandList) top.push(BandListCard(topCtx))
  const held = holdTop(topHold, needsN, idle)
  topHold = held.memory
  const steadied = steadyOrder(steady, needsShown(own.values, needsN) ? [NEEDS_SLOT, ...visible] : [...visible], isSteady(Date.now(), lastPress) && !own.arrange)
  steady = steadied.memory
  const slots: Slot[] = steadied.order
  // The placement grid (home/grid.ts): the columns drawn (never more than cards), each one's width
  const grid = paneGrid(bodyPt, columnsChoice, slots.length, bodyRows)
  const { ncol, innerPt: inner, listShow } = grid
  const c: PaneCtx = { ...topCtx, widthPt: inner, listShow }
  // Each card has its own detail level: the one for the whole pane, unless the person set one for that card.
  const limitM = limitModel(view, prefs)
  const hereM = hereModel(view, prefs)
  const othersM = othersModel(view, prefs, listShow)
  const autoM = autopilotModel(view, prefs, listShow)
  const agentsM = agentsModel(view, prefs, listShow)
  const compM = computerModel(view, prefs, linesM)
  const facts: GlanceFacts = { view, prefs, lines: linesM, limit: limitM, others: othersM, auto: autoM, agents: agentsM, comp: compM, widthPt: inner, hereWaits: hereM.waits !== undefined }
  // An open card's header is one row: its More or Less (Fold) sits on the Glance row (kit glanceMoreUp)
  const headFacts = (id: CardId): GlanceFacts => {
    const chip = glanceChipPt(isNewCard(own.lists.seen, id))
    const trail = glanceIsOpen(own.openSections, id, louds[id]) ? glanceTrailPt({ isFull: prefs.cardDetail[id] === 'explained' }) : 0
    return chip + trail === 0 ? facts : { ...facts, widthPt: inner - trail - chip }
  }
  const glanceOf = (id: CardId) => {
    // The headline is always the whole one; a card whose open body says it sets GlanceOpts.bodySays and its open header leaves it out (kit glanceOpen)
    const value = headlineOf(id, headFacts(id))
    const dot = glanceDotOf(id, facts, louds[id])
    const said = glanceWordOf(id, facts, louds[id])
    return { value, dot, ...said, ...(id === 'limit' && facts.limit.blocks.length === 0 && facts.limit.empty !== 'none' ? { unknown: true } : {}), isOpen: glanceIsOpen(own.openSections, id, louds[id]), fresh: isNewCard(own.lists.seen, id), widthPt: inner, onPress: () => (act.glance === undefined ? act.toggleSection(glanceOpenKey(id)) : act.glance(id, louds[id])) }
  }
  if (glanceOn) c.glanceOf = glanceOf
  const forms: Record<CardId, (grow: boolean) => Drawn> = {
    limit: grow => LimitCard(c, limitM, grow),
    here: grow => HereCard(c, hereM, grow),
    others: grow => OthersCard(c, othersM, grow),
    autopilot: grow => AutopilotCard(c, autoM, grow),
    proof: grow => LineCard(c, linesM, 'proof', grow),
    guard: grow => LineCard(c, linesM, 'guard', grow),
    agents: grow => AgentsCard(c, agentsM, linesM, grow),
    computer: grow => ComputerCard(c, compM, linesM, grow),
    skills: grow => LineCard(c, linesM, 'skills', grow),
    prs: grow => PrsCard(c, linesM, grow),
    ship: grow => LineCard(c, linesM, 'ship', grow),
    back: grow => LineCard(c, linesM, 'back', grow),
    safety: grow => LineCard(c, linesM, 'safety', grow),
    context: grow => LineCard(c, linesM, 'context', grow),
    preview: grow => LineCard(c, linesM, 'preview', grow),
    setup: grow => LineCard(c, linesM, 'setup', grow),
    do: grow => LineCard(c, linesM, 'do', grow),
  }
  const titleOf = (id: CardId): string => (id in GLANCE_TITLES ? GLANCE_TITLES[id as keyof typeof GLANCE_TITLES] : linesM.card(id as (typeof LINE_CARD_IDS)[number]).title)
  const closed = (id: CardId): boolean => glanceOn && !glanceIsOpen(own.openSections, id, louds[id])
  // Its models are never turned into elements.
  const flipped = (id: CardId): boolean => !closed(id) && isFlipped(own.openSections, id)
  // The face fills about the front's body: the card's height less its header row and insets (FlipFace counts its rows' lines into it)
  const faceFit = (id: CardId): number => Math.max(FACE_MIN_ROWS * FACE_ROW_PT, heightOf(heights, id) * ROW_PT - CLOSED_CARD_H)
  const flippedCard = (id: CardId, grow: boolean): Drawn => Card(el, id, titleOf(id), '', FlipFace(el, prefs, act, id, inner, faceFit(id)), { grow, glance: { ...glanceOf(id), back: tr(BACK_LABEL), onPress: () => act.toggleSection(flipKey(id)) } })
  const makers: Record<CardId, (grow: boolean) => Drawn> = glanceOn
    ? (Object.fromEntries(CARD_IDS.map(id => [id, (grow: boolean): Drawn => (closed(id) ? Card(el, id, titleOf(id), '', null, { grow: false, glance: glanceOf(id) }) : flipped(id) ? flippedCard(id, grow) : forms[id](grow))])) as Record<CardId, (grow: boolean) => Drawn>)
    : forms
  const drag = el.drag // only the desktop drags (elementsFor), so it also tells the desktop from the rest
  const groupRows = (groups: LineGroup[]): number => groups.reduce((n, g, i) => n + 1 + (g.rows.length * LIST_ROW_H) / ROW_PT + (i === 0 ? 0 : GROUP_GAP / ROW_PT), 0)
  const { blocks, limit, d: dLimit } = limitM
  const { d: dHere, lines, contextLine, here } = hereM
  const { d: dAuto, groups: autoGroups } = autoM
  const { d: dComp, room, gaugeOn } = compM
  const { d: dAgents, run, rows: agentRows, list: agentList } = agentsM
  const lineViews = linesM.card
  const openHeights = cardHeights({
    isSimple: prefs.cardDetail.others !== 'explained',
    innerPt: inner,
    hasLimit: blocks.length > 0,
    limitLines: dLimit === 'explained' ? limit.parts.reduce((n, p) => n + 1 + p.lines.length, 0) + (limit.extra === undefined ? 0 : 1) + (limit.plan === undefined ? 0 : 1) + (limit.source === '' ? 0 : 1) : limit.parts.length,
    limitBars: dLimit === 'explained' ? limit.parts.length + (limit.extra?.pct === undefined ? 0 : 1) : 0,
    hereLines: openEndsRows(topCtx) + (dHere === 'simple' ? 1 + (lines.advice === undefined ? 0 : 1) : 2 + (lines.cost === undefined ? 0 : 1) + (contextLine === undefined ? 0 : 1) + (lines.cache === undefined ? 0 : 1) + (lines.advice === undefined ? 0 : ADVICE_ROWS)),
    hereHasBar: here?.rec.contextPercent !== undefined,
    limitGaps: dLimit === 'explained' ? 1 + (limit.parts.length - 1 + (limit.plan === undefined ? 0 : 1)) * (LIMIT_GAP / GROUP_GAP) : 0,
    hereGaps: dHere === 'explained' ? 1 + (lines.cache === undefined ? 0 : 1) + (lines.advice === undefined ? 0 : 1) : 0,
    autopilotRows: (prefs.quiet === undefined ? 0 : 2) + (dAuto !== 'explained' ? 1 : autoGroups.length === 0 ? 2 : groupRows(autoGroups)),
    lineRows: {
      ...Object.fromEntries(LINE_CARD_IDS.filter(id => visible.includes(id)).map(id => [id, prefs.cardDetail[id] !== 'explained' ? 1 : lineViews(id).groups === undefined ? lineViews(id).lines.length : groupRows(lineViews(id).groups ?? [])])),
      computer: room === undefined || prefs.laptop === undefined ? 2 + (gaugeOn ? 0 : 2) : dComp !== 'explained' ? 2 : 1 + 2 + (2 * BAR_SLOT) / ROW_PT + 2 + (3 * GROUP_GAP) / ROW_PT,
      agents: 1 + agentList.shown.length * (dAgents === 'explained' ? 2 : 1) + (agentList.label === undefined ? 0 : 1) + (agentRows.length > 0 && agentList.shown.length === 0 && run === undefined ? 1 : 0) + (run === undefined ? 0 : 2 + run.tasks.length * (dAgents === 'explained' ? 2 : 1)),
    },
    others: othersM.others.length,
    othersShown: othersM.list.shown.length,
    othersMore: othersM.list.label !== undefined,
    othersOpen: prefs.othersOpen,
    othersAll: prefs.othersAll,
  })
  // A closed card's tile is as high as the closed card (Arranging shows the real layout)
  const heights = glanceOn ? { ...openHeights, ...Object.fromEntries(visible.filter(closed).map(id => [id, ARRANGE_CLOSED_ROWS])) } : openHeights
  // A width with column lists puts each card in its own column; else the order is cut into the columns by count only, never by heights or history
  const colLists = fixed === undefined ? own.columnLists?.[bucket] : undefined
  const boardHeights = { ...heights, [NEEDS_SLOT]: Math.max(ARRANGE_MIN_ROWS, Math.ceil((CARD_INSET_Y_PT + ROW_PT + Math.max(1, needsN) * LIST_ROW_H) / ROW_PT)) }
  // Even columns (board.ts placeEven): each next card under the shortest column; a card keeps its column while the cards and the width stay the same
  const even = colLists === undefined && ncol > 1 ? placeEvenSteady(slots, boardHeights, ncol, evenMemory, steadied.late) : undefined
  if (even !== undefined) evenMemory = even.memory
  const groups = ncol <= 1 ? slots.map((_, n) => [n]) : colLists !== undefined ? placeLists(slots, colLists, ncol, steadied.late, boardHeights) : (even?.groups ?? [])
  const needsCard = (): Drawn => (
    <Box key="needs-slot" flexDirection="column">
      {NeedsCard(c, held.show, needsList)}
      {held.spacer > 0 && !needsShut(c) ? <Box key="needs-hold" flexShrink={0} height={rows(held.spacer * (LIST_ROW_H + LIST_ROW_GAP))} /> : null}
    </Box>
  )
  // A card that throws draws its frame and one plain line; the other cards still draw
  const safeCard = (id: CardId): Drawn =>
    drawOrLine(
      () => makers[id](false),
      () => Card(el, id, drawOrLine(() => titleOf(id), () => id), '', <el.Text>{tr(DRAW_FAILED)}</el.Text>, { grow: false }),
    )
  for (const id of slots) cards.push(id === NEEDS_SLOT ? needsCard() : safeCard(id))
  const figureOf = (title: string, short: string): string => (short.startsWith(`${title}: `) ? short.slice(title.length + 2) : short)
  // Every tile's figure starts with a capital and a count is said in words (fmt): "None", "2 sessions", "1 needs you"
  const upFirst = (text: string): string => text.charAt(0).toLocaleUpperCase() + text.slice(1)
  const tiles = [
    { id: 'limit', title: tr('Plan limits'), figure: blocks.length === 0 ? tr('Not reported yet') : blocks.map(b => `${tr(b.short)} ${fmt.percent(b.percent)}`).join(', ') },
    { id: 'here', title: tr('This session'), figure: lines.head },
    { id: 'others', title: tr('Other sessions'), figure: fmt.sessions(othersM.others.length) },
    { id: 'autopilot', title: tr('Autopilot'), figure: shortSummary(autoM.today, [], tr) },
    ...LINE_CARD_IDS.filter(id => visible.includes(id)).map(id => ({ id, title: tr(lineViews(id).title), figure: figureOf(tr(lineViews(id).title), lineViews(id).short) })),
  ]
  // A tile's zone tag names where the card lives; a card that is its own zone (Agents, Safety, Ship) has no tag, so the title is never said twice
  const zoned = (t: { id: string; title: string; figure: string }) => {
    const zone = tr(ZONE_WORD[ZONE_OF[t.id as CardId]])
    return { ...t, figure: upFirst(t.figure), ...(zone.toLocaleLowerCase() === t.title.toLocaleLowerCase() ? {} : { zone }) }
  }
  const onBoard = boardLists(slots, colLists, ncol, even?.groups)
  const boardTall = listsRows(onBoard, boardHeights)
  const board =
    prefs.arrange && fixed === undefined && drag && visible.length > 0 ? (
      <el.host.Client key="arrange-board" module="../../arrange.tsx" width="100%" height={boardTall} props={{ lists: onBoard, bucket, tiles: [...(slots[0] === NEEDS_SLOT ? [{ id: NEEDS_SLOT, title: tr('Needs you'), zone: tr('Fixed'), figure: needsN === 0 ? tr('Nothing needs you.') : fmt.needYou(needsN) }] : []), ...tiles.filter(t => visible.includes(t.id as CardId)).map(zoned)], heights: boardHeights, rows: boardTall, dropWord: tr(ARRANGE_DROP) }} />
    ) : undefined
  const acts: { key: string; label: string; onPress: () => void }[] = [
    ...(!drag || visible.length < 2 ? [] : [{ key: 'arrange', label: tr('Arrange cards'), onPress: () => act.arrange(true) }]),
    ...(!drag ? [] : [{ key: 'popout', label: tr(POPOUT_BUTTON), onPress: () => act.popOut() }]),
    { key: 'help', label: tr('Help'), onPress: () => act.openHelp(true) },
    { key: 'settings', label: tr('Settings'), onPress: () => act.openSettings(true) },
  ]
  // NO WORD ALONE ON A LINE (live at about 300 pt: "Open in new window Help", then "Settings" alone).
  // The footer holds the view switch and the presses only; the card guide is in Help > What each card does
  const framed = framedHere(el)
  // The footer's room: the pane's body, or the one capped column it ends under (footIn)
  // Several columns end where the grid ends (whole cells, so a little short of the body): the footer ends under the last column's right edge
  const gridCells = ncol > 1 ? ncol * grid.colCells + (ncol - 1) * grid.gapCells : undefined
  const footPt = oneCap ? cap.colPt : gridCells !== undefined ? gridCells * columnPt() : bodyPt
  // A press measured as it is drawn: its frame, or the host's button (plain words, no key: core/panekeys.ts)
  const pressPt = (a: { key: string; label: string }): number => (framed ? framePt(a.label) : wordBox(framedLabel(a.label)).minW)
  const actsPt = (list: { key: string; label: string }[]): number => list.reduce((sum, a) => sum + pressPt(a), 0) + Math.max(0, list.length - 1) * cardGapX()
  const shortActs = actsPt(acts) <= footPt ? acts : acts.map(a => (a.key === 'popout' ? { ...a, label: tr(POPOUT_BUTTON_SHORT) } : a))
  // Two and two only when each pair fits the room (a long language can make "Arrange cards" and "New window" wider than a narrow pane)
  const pairs = shortActs.length === 4 ? [shortActs.slice(0, 2), shortActs.slice(2)] : undefined
  const actLines = actsPt(shortActs) <= footPt ? [shortActs] : pairs !== undefined && pairs.every(l => actsPt(l) <= footPt) ? pairs : shortActs.map(a => [a])
  const actionRow = (line: typeof acts, n: number) =>
    framed ? (
      FrameLine(el, `footer-line-${n}`, line, cardGapX())
    ) : (
      <Box key={`footer-line-${n}`} flexDirection="row" justifyContent="flex-end" alignItems="center" columnGap={cols(cardGapX())}>
        {line.map(a => FootPress(el, a.key, a.label, a.onPress))}
      </Box>
    )
  const actions = actLines.length === 1 ? (framed ? [FrameLine(el, 'footer-acts', actLines[0] ?? [], cardGapX())] : (actLines[0] ?? []).map(a => FootPress(el, a.key, a.label, a.onPress))) : [<Box key="footer-lines" flexDirection="column" alignItems="flex-end" rowGap={vstep(CARD_GAP)}>{actLines.map(actionRow)}</Box>]
  // THE VIEW SWITCH (Standard, All, Custom): beside the footer's presses when the line has room, else on its own line right above them
  const viewWords = VIEW_MODES.map(v => ({ value: v, label: findSetting('look.view')?.options.find(o => o.value === v)?.label ?? v }))
  const pickView = (v: string): void => (act.pickView === undefined ? act.setSetting('look.view', v) : act.pickView(v as ViewMode))
  const switchPt = pickDrawnPt(el, viewWords, mode)
  const switchBeside = actLines.length === 1 && actsPt(actLines[0] ?? []) + cardGapX() + switchPt <= footPt
  const viewSwitch = (words: typeof viewWords, n: number): Drawn => Pick(el, 'view-switch', words, mode, pickView, false, n === 0 ? 'view-switch' : `view-switch-line${n}`, undefined, 'ground')
  // Even lines when they fit as drawn, else one option a line (three cannot be split with no word alone)
  const evenLines = pickLines(viewWords, footPt)
  const switchLines = switchPt <= footPt ? [viewWords] : evenLines.every(l => pickDrawnPt(el, l, mode) <= footPt) ? evenLines : viewWords.map(o => [o])
  // The first screen has no cards to switch, so it has no view switch (and no 1, 2, 3)
  const footActs = switchBeside && !firstScreen ? [viewSwitch(viewWords, 0), ...actions] : actions
  const switchRow = switchBeside || firstScreen ? null : (
    <Box key="view-switch-row" flexDirection="column" alignItems="flex-end" rowGap={vstep(CARD_GAP)}>
      {switchLines.map(viewSwitch)}
    </Box>
  )
  const columns = ncol > 1 ? groups.map(g => g.map(i => cards[i])) : cards.map(card => [card])
  // One column on a wide pane keeps its reading width at the left (grid.ts, ONE_COLUMN_MAX_PT); the footer ends at that column's right edge
  const oneWide = oneCap
  const footCells = oneWide ? cap.cells : gridCells
  // The arrange board's own width: its columns as listsLayout draws them (board.ts), whole cells
  const bodyCells = Math.floor(bodyPt / columnPt() + 0.01)
  const boardCells = bucket * Math.floor((bodyCells - (bucket - 1) * ARRANGE_GAP) / bucket) + (bucket - 1) * ARRANGE_GAP
  const footIn = (key: string, node: Drawn): Drawn => (footCells !== undefined && node !== null ? <Box key={key} flexDirection="column" width={footCells} flexShrink={0}>{node}</Box> : node)
  return (
    // No height: a card never stretches to fill a tall pane, the empty room stays at the bottom.
    <Box flexDirection="column" width="100%" alignItems="stretch" rowGap={vstep(CARD_GAP)}>
      {prefs.arrange && board !== undefined ? ViewHeader(el, 'arrange-bar', { key: 'arrange-done', label: tr(BACK_LABEL), onPress: () => act.arrange(false) }, tr(ARRANGING_WORD), { dim: true }) : null}
      {/* Arranging says what to do in ONE dim line; the Problems first line only while that setting is on (the board keeps the person's own order) */}
      {prefs.arrange && board !== undefined ? <Text key="arrange-line" dimColor>{tr((prefs.autoHidden?.length ?? 0) > 0 ? ARRANGING_LINE_AUTO : ARRANGING_LINE)}</Text> : null}
      {prefs.arrange && board !== undefined && prefs.values['view.problems'] !== 'off' ? <Text key="arrange-problems" dimColor>{tr(ARRANGING_PROBLEMS)}</Text> : null}
      {prefs.arrange && board !== undefined ? (
        // The row ends where the board's last column ends (whole cells, a little short of the body), so its chevron stands over that column's edge
        <Box key="arrange-show-hide-row" flexDirection="column" width={boardCells} flexShrink={0}>
          {LinkButton(el, 'arrange-show-hide', ARRANGING_SHOW_HIDE, () => act.openSettingsAt('Cards'), { row: true, chevron: true, widthPt: boardCells * columnPt() })}
        </Box>
      ) : null}
      {cap.capped && top.length > 0 ? capIn('cap-top', <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>{top}</Box>) : top}
      {board !== undefined ? (
        board
      ) : ncol === 1 ? (
        bucket > 1 || oneWide ? <Box key="column-one" width={grid.colCells} flexShrink={0} flexDirection="column" rowGap={vstep(CARD_GAP)}>{cards}</Box> : cards
      ) : (
        // They neither grow nor shrink
        <Box key="columns" width="100%" flexDirection="row" columnGap={grid.gapCells} alignItems="flex-start">
          {columns.map((group, n) => (
            <Box key={`col-${n}`} width={grid.colCells} flexGrow={0} flexShrink={0} overflow="hidden" flexDirection="column" rowGap={vstep(CARD_GAP)}>
              {group}
            </Box>
          ))}
        </Box>
      )}
      {prefs.arrange && board !== undefined ? null : footIn('one-switch', switchRow)}
      {prefs.arrange && board !== undefined ? null : footIn(
        'one-footer',
        // When a pane is as narrow as 288 pt, the actions wrap to a second line, right-aligned, when they do not fit one
        <Box key="footer" flexDirection="row" flexWrap="wrap" justifyContent="flex-end" alignItems="center" columnGap={cols(cardGapX())}>
          {footActs}
        </Box>,
      )}
    </Box>
  )
}
