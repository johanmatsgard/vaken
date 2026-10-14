// The pane.
import { shortSummary } from '../../core/ledger'
import { seeAllCardsLabel } from '../../core/cardrules'
import { ARRANGING_AUTO, ARRANGING_WIDTH_MANY, ARRANGING_WIDTH_ONE, ARRANGING_WORD, BACK_LABEL, flipKey, isFlipped } from '../../core/cardsettings'
import { glanceIsOpen, glanceOpenKey } from '../../core/headline'
import { tr } from '../../core/lang'
import { POPOUT_BUTTON, POPOUT_BUTTON_SHORT } from '../../core/popout'
import { CARD_GAP, CARD_GAP_X, Card, FrameLine, FramePress, LinkButton, ViewHeader, framedHere, framedLabel, glanceChipPt, glanceTrailPt, vstep, wordBox } from '../../ui/kit'
import type { Drawn, El } from '../../ui/kit'
import { ARRANGE_GAP, ARRANGE_MIN_CELLS, ARRANGE_MIN_ROWS, BAR_SLOT, BORDER_X_PT, CARD_INSET_Y_PT, FACE_MIN_ROWS, FACE_ROW_PT, CHEVRON_GAP, CHEVRON_SLOT, GROUP_GAP, LIMIT_GAP, LIST_ROW_GAP, LIST_ROW_H, ROW_PT, cols, rows } from '../../ui/tokens'
import { boardRows, cardHeights, heightOf, holdTop, isIdle, placeColumns } from './board'
import type { TopHold } from './board'
import { columnCap, columnsUsed, footerWraps, paneGrid } from './grid'
import type { Bucket } from './layouts'
import type { LineGroup } from './linecards'
import { CARD_IDS, LINE_CARD_IDS, ZONE_OF, ZONE_WORD } from './logic'
import type { CardId, Detail, View } from './logic'
import { isNewCard } from '../../core/cardrules'
import { GLANCE_TITLES, glanceDotOf, headlineOf } from './headline'
import type { GlanceFacts } from './headline'
import { cardLouds, cardOrder, shrunkCards } from './loud'
import type { Acts, Prefs } from './prefs'
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
import { NEEDS_SLOT, fixedIds, needsShown, viewModeOf } from './viewset'
import type { Slot } from './viewset'
import { GuideView } from './views/guide'
import { HelpView } from './views/help'
import { ReportCard } from './views/report'
import { RunnerView } from './views/runner'
import { FlipFace } from './views/flipface'
import { SettingsView } from './views/settings'
import { StartCard } from './views/start'
import { fmt } from '../../core/fmt'

let lastPress: number | undefined
let topHold: TopHold | undefined

// Every action the pane hands out stamps the press time first
function stamped<T>(x: T): T {
  if (typeof x === 'function') return ((...a: unknown[]) => ((lastPress = Date.now()), (x as (...b: unknown[]) => unknown)(...a))) as T
  if (x !== null && typeof x === 'object' && !Array.isArray(x)) return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, stamped(v)])) as T
  return x
}

function FootPress(el: El, key: string, label: string, onPress: () => void) {
  const { Button } = el
  // Where no frame can be drawn (a terminal, no Client) the host's framed Button stands in.
  if (!framedHere(el)) return <Button key={key} label={label} onPress={onPress} />
  return FramePress(el, key, label, onPress)
}

// `bodyRows` is how tall the pane's body is
export function HomePane(el: El, view: View, own: Prefs, innerPt: number, onFlip0: (key: string) => void, bodyColumns: number, act0: Acts, bodyRows?: number) {
  const act = stamped(act0)
  const onFlip = stamped(onFlip0)
  const idle = isIdle(Date.now(), lastPress)
  const { Box, Text, Button } = el
  const cap = columnCap(innerPt + 2 * BORDER_X_PT, own.values['look.columns'])
  const capIn = <N extends Drawn>(key: string, node: N) => (cap.capped ? <Box key={key} flexDirection="column" width={cap.cells} flexShrink={0}>{node}</Box> : node)
  if (own.settings) return SettingsView(el, own, act, innerPt, cap)
  if (own.runner) return capIn('cap-runner', RunnerView(el, own, act, view.now ?? 0, cap.capped ? cap.innerPt : innerPt))
  if (own.help) return capIn('cap-help', HelpView(el, own, act, cap.capped ? cap.innerPt : innerPt))
  if (own.guide === true) return GuideView(el, own, act, innerPt)
  const top: Drawn[] = []
  const cards: Drawn[] = []
  // A column never gets narrower than a phone-sized card (see tokens.ts)
  const bodyPt = innerPt + 2 * BORDER_X_PT
  const columnsChoice = own.values['look.columns']
  const bucket = columnsUsed(bodyPt, columnsChoice) as Bucket
  const linesM = linesModel(view, own)
  const louds = cardLouds(view, own, linesM)
  const fixed = fixedIds(viewModeOf(own.values))
  const visible = (fixed !== undefined ? [...fixed] : cardOrder(own, louds, bucket)).filter(id => !own.hidden.includes(id))
  const glanceOn = own.values.detail === 'glance'
  const shrunk = glanceOn || fixed !== undefined ? [] : shrunkCards(own, louds, visible)
  const prefs: Prefs = shrunk.length === 0 ? own : { ...own, shrunk, cardDetail: { ...own.cardDetail, ...Object.fromEntries(shrunk.map(id => [id, 'simple' as Detail])) } }
  const topInner = cap.capped ? cap.innerPt : innerPt
  const topCtx: PaneCtx = { el, view, prefs, act, onFlip, widthPt: topInner }
  const needsList = needsGroupsOf(topCtx)
  const needsN = needsRows(topCtx, needsList)
  if (view.firstRun === true) top.push(StartCard(el, prefs, act, topInner))
  if (prefs.report !== undefined) top.push(ReportCard(el, prefs.report, prefs, act, topInner, view.now ?? 0))
  if (prefs.bandList) top.push(BandListCard(topCtx))
  const held = holdTop(topHold, needsN, idle)
  topHold = held.memory
  const slots: Slot[] = needsShown(own.values, needsN) ? [NEEDS_SLOT, ...visible] : [...visible]
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
  const glanceOf = (id: CardId) => ({ value: headlineOf(id, headFacts(id)), dot: glanceDotOf(id, facts, louds[id]), ...(id === 'limit' && facts.limit.blocks.length === 0 ? { unknown: true } : {}), isOpen: glanceIsOpen(own.openSections, id, louds[id]), fresh: isNewCard(own.lists.seen, id), widthPt: inner, onPress: () => (act.glance === undefined ? act.toggleSection(glanceOpenKey(id)) : act.glance(id, louds[id])) })
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
  const titleOf = (id: CardId): string => (id in GLANCE_TITLES ? GLANCE_TITLES[id as keyof typeof GLANCE_TITLES] : linesM.views[id as (typeof LINE_CARD_IDS)[number]].title)
  const closed = (id: CardId): boolean => glanceOn && !glanceIsOpen(own.openSections, id, louds[id])
  // Its models are never turned into elements.
  const flipped = (id: CardId): boolean => !closed(id) && isFlipped(own.openSections, id)
  const faceFit = (id: CardId): number => Math.max(FACE_MIN_ROWS, Math.floor((heightOf(heights, id) * ROW_PT) / FACE_ROW_PT))
  const flippedCard = (id: CardId, grow: boolean): Drawn => Card(el, id, titleOf(id), '', FlipFace(el, prefs, act, id, inner, faceFit(id)), { grow, glance: { ...glanceOf(id), back: tr(BACK_LABEL), onPress: () => act.toggleSection(flipKey(id)) } })
  const makers: Record<CardId, (grow: boolean) => Drawn> = glanceOn
    ? (Object.fromEntries(CARD_IDS.map(id => [id, (grow: boolean): Drawn => (closed(id) ? Card(el, id, titleOf(id), '', null, { grow: false, glance: glanceOf(id) }) : flipped(id) ? flippedCard(id, grow) : forms[id](grow))])) as Record<CardId, (grow: boolean) => Drawn>)
    : forms
  const drag = el.drag // only the desktop drags (elementsFor), so it also tells the desktop from the rest
  const groupRows = (groups: LineGroup[]): number => groups.reduce((n, g, i) => n + 1 + (g.rows.length * LIST_ROW_H) / ROW_PT + (i === 0 ? 0 : GROUP_GAP / ROW_PT), 0)
  const { blocks, limit, d: dLimit } = limitM
  const { d: dHere, lines, contextRow, here } = hereM
  const { d: dAuto, groups: autoGroups } = autoM
  const { d: dComp, room, gaugeOn } = compM
  const { d: dAgents, run, rows: agentRows, list: agentList } = agentsM
  const lineViews = linesM.views
  const openHeights = cardHeights({
    isSimple: prefs.cardDetail.others !== 'explained',
    innerPt: inner,
    hasLimit: blocks.length > 0,
    limitLines: limit.groups.reduce((n, g) => n + g.length, 0) + (limit.source === '' ? 0 : 1) + (dLimit === 'simple' && blocks.length > 1 ? 1 : 0) + (limit.folded === undefined ? 0 : 1) + (limit.daily === undefined ? 0 : 2),
    limitBars: dLimit === 'explained' ? (limit.shown ?? blocks).length : dLimit === 'simple' && blocks.length > 1 ? 0 : blocks.length,
    hereLines: openEndsRows(topCtx) + (dHere === 'simple' ? 1 + (lines.advice === undefined ? 0 : 1) : 2 + (contextRow === undefined ? 0 : 1) + (lines.cache === undefined ? 0 : 1) + (lines.advice === undefined ? 0 : ADVICE_ROWS)),
    hereHasBar: here?.rec.contextPercent !== undefined,
    limitGaps: dLimit === 'explained' ? 1 + (limit.groups.length - 1 + (limit.folded === undefined && limit.daily === undefined ? 0 : 1)) * (LIMIT_GAP / GROUP_GAP) : 0,
    hereGaps: dHere === 'explained' ? 1 + (lines.cache === undefined ? 0 : 1) + (lines.advice === undefined ? 0 : 1) : 0,
    autopilotRows: (prefs.quiet === undefined ? 0 : 2) + (dAuto !== 'explained' ? 1 : autoGroups.length === 0 ? 2 : groupRows(autoGroups)),
    lineRows: {
      ...Object.fromEntries(LINE_CARD_IDS.filter(id => visible.includes(id)).map(id => [id, prefs.cardDetail[id] !== 'explained' ? 1 : lineViews[id].groups === undefined ? lineViews[id].lines.length : groupRows(lineViews[id].groups ?? [])])),
      computer: room === undefined || prefs.laptop === undefined ? 2 + (gaugeOn ? 0 : 2) : dComp !== 'explained' ? 2 : 1 + 2 + (2 * BAR_SLOT) / ROW_PT + 2 + (3 * GROUP_GAP) / ROW_PT,
      agents: 1 + agentList.shown.length * (dAgents === 'explained' ? 2 : 1) + (agentList.label === undefined ? 0 : 1) + (agentRows.length > 0 && agentList.shown.length === 0 && run === undefined ? 1 : 0) + (run === undefined ? 0 : 2 + run.tasks.length * (dAgents === 'explained' ? 2 : 1)),
    },
    others: othersM.others.length,
    othersShown: othersM.list.shown.length,
    othersMore: othersM.list.label !== undefined,
    othersOpen: prefs.othersOpen,
    othersAll: prefs.othersAll,
  })
  const heights = glanceOn ? { ...openHeights, ...Object.fromEntries(visible.filter(closed).map(id => [id, ARRANGE_MIN_ROWS])) } : openHeights
  // The cards go in the columns by fixed groups: by group and card count only, never by heights or history
  const groups = ncol > 1 ? placeColumns(slots.length, ncol) : slots.map((_, n) => [n])
  const needsCard = (): Drawn => (
    <Box key="needs-slot" flexDirection="column">
      {NeedsCard(c, held.show, needsList)}
      {held.spacer > 0 && !needsShut(c) ? <Box key="needs-hold" flexShrink={0} height={rows(held.spacer * (LIST_ROW_H + LIST_ROW_GAP))} /> : null}
    </Box>
  )
  for (const id of slots) cards.push(id === NEEDS_SLOT ? needsCard() : makers[id](false))
  const figureOf = (title: string, short: string): string => (short.startsWith(`${title}: `) ? short.slice(title.length + 2) : short)
  const tiles = [
    { id: 'limit', title: tr('Plan limits'), figure: blocks.length === 0 ? tr('not reported yet') : blocks.map(b => `${tr(b.short)} ${fmt.percent(b.percent)}`).join(', ') },
    { id: 'here', title: tr('This session'), figure: lines.head },
    { id: 'others', title: tr('Other sessions'), figure: String(othersM.others.length) },
    { id: 'autopilot', title: tr('Autopilot'), figure: shortSummary(autoM.today, [], tr) },
    ...LINE_CARD_IDS.filter(id => visible.includes(id)).map(id => ({ id, title: tr(lineViews[id].title), figure: figureOf(tr(lineViews[id].title), lineViews[id].short) })),
  ]
  const boardHeights = { ...heights, [NEEDS_SLOT]: Math.max(ARRANGE_MIN_ROWS, Math.ceil((CARD_INSET_Y_PT + ROW_PT + Math.max(1, needsN) * LIST_ROW_H) / ROW_PT)) }
  const boardCells = Math.max(ARRANGE_MIN_CELLS, Math.floor(bodyColumns))
  const board =
    prefs.arrange && fixed === undefined && drag && visible.length > 0 ? (
      <el.host.Client key="arrange-board" module="../../arrange.tsx" width="100%" height={boardRows(slots, boardHeights, ncol, boardCells, ARRANGE_GAP)} props={{ order: slots, bucket, tiles: [...(slots[0] === NEEDS_SLOT ? [{ id: NEEDS_SLOT, title: tr('Needs you'), zone: tr('Fixed'), figure: needsN === 0 ? tr('Nothing needs you.') : String(needsN) }] : []), ...tiles.filter(t => visible.includes(t.id as CardId)).map(t => ({ ...t, zone: tr(ZONE_WORD[ZONE_OF[t.id as CardId]]) }))], heights: boardHeights, columns: ncol, rows: boardRows(slots, boardHeights, ncol, boardCells, ARRANGE_GAP) }} />
    ) : undefined
  const moreCards = board !== undefined ? 0 : fixed === undefined ? Math.max(1, prefs.autoHidden?.length ?? 0) : 0
  const acts: { key: string; label: string; onPress: () => void }[] = [
    ...(!drag || visible.length < 2 ? [] : [{ key: 'arrange', label: tr('Arrange cards'), onPress: () => act.arrange(true) }]),
    ...(!drag ? [] : [{ key: 'popout', label: tr(POPOUT_BUTTON), onPress: () => act.popOut() }]),
    { key: 'help', label: tr('Help'), onPress: () => act.openHelp(true) },
    { key: 'settings', label: tr('Settings'), onPress: () => act.openSettings(true) },
  ]
  // NO WORD ALONE ON A LINE (live at about 300 pt: "Open in new window Help", then "Settings" alone).
  const seeAll = seeAllCardsLabel(CARD_IDS.length, tr)
  const footRoom = moreCards === 0 || footerWraps(grid.fit) ? bodyPt : bodyPt - wordBox(seeAll).minW - CHEVRON_GAP - CHEVRON_SLOT - CARD_GAP_X
  const actsPt = (list: { label: string }[]): number => list.reduce((sum, a) => sum + wordBox(framedLabel(a.label)).minW, 0) + Math.max(0, list.length - 1) * CARD_GAP_X
  const shortActs = actsPt(acts) <= footRoom ? acts : acts.map(a => (a.key === 'popout' ? { ...a, label: tr(POPOUT_BUTTON_SHORT) } : a))
  // Two and two only when each pair fits the room (a long language can make "Arrange cards" and "New window" wider than a narrow pane)
  const pairs = shortActs.length === 4 ? [shortActs.slice(0, 2), shortActs.slice(2)] : undefined
  const actLines = actsPt(shortActs) <= footRoom ? [shortActs] : pairs !== undefined && pairs.every(l => actsPt(l) <= bodyPt) ? pairs : shortActs.map(a => [a])
  const framed = framedHere(el)
  const actionRow = (line: typeof acts, n: number) =>
    framed ? (
      FrameLine(el, `footer-line-${n}`, line, CARD_GAP_X)
    ) : (
      <Box key={`footer-line-${n}`} flexDirection="row" justifyContent="flex-end" alignItems="center" columnGap={cols(CARD_GAP_X)}>
        {line.map(a => FootPress(el, a.key, a.label, a.onPress))}
      </Box>
    )
  const actions = actLines.length === 1 ? (framed ? [FrameLine(el, 'footer-acts', actLines[0] ?? [], CARD_GAP_X)] : (actLines[0] ?? []).map(a => FootPress(el, a.key, a.label, a.onPress))) : [<Box key="footer-lines" flexDirection="column" alignItems="flex-end" rowGap={vstep(CARD_GAP)}>{actLines.map(actionRow)}</Box>]
  const columns = ncol > 1 ? groups.map(g => g.map(i => cards[i])) : cards.map(card => [card])
  return (
    // No height: a card never stretches to fill a tall pane, the empty room stays at the bottom.
    <Box flexDirection="column" width="100%" alignItems="stretch" rowGap={vstep(CARD_GAP)}>
      {prefs.arrange && board !== undefined ? (
        ViewHeader(el, 'arrange-bar', { key: 'arrange-done', label: tr(BACK_LABEL), onPress: () => act.arrange(false) }, tr(ARRANGING_WORD), { dim: true })
      ) : null}
      {prefs.arrange && board !== undefined ? <Text key="arrange-width" dimColor>{bucket === 1 ? tr(ARRANGING_WIDTH_ONE) : tr(ARRANGING_WIDTH_MANY).replace('{n}', String(bucket))}</Text> : null}
      {prefs.arrange && board !== undefined && (prefs.autoHidden?.length ?? 0) > 0 ? <Text key="arrange-auto" dimColor>{tr(ARRANGING_AUTO)}</Text> : null}
      {cap.capped && top.length > 0 ? capIn('cap-top', <Box flexDirection="column" rowGap={vstep(CARD_GAP)}>{top}</Box>) : top}
      {board !== undefined ? (
        board
      ) : ncol === 1 ? (
        bucket > 1 ? <Box key="column-one" width={grid.colCells} flexShrink={0} flexDirection="column" rowGap={vstep(CARD_GAP)}>{cards}</Box> : cards
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
      {prefs.arrange && board !== undefined ? null : (
        // When a pane is as narrow as 288 pt, the actions wrap to a second line, right-aligned, when they do not fit one
        moreCards === 0 ? (
          <Box key="footer" flexDirection="row" flexWrap="wrap" justifyContent="flex-end" alignItems="center" columnGap={cols(CARD_GAP_X)}>
            {actions}
          </Box>
        ) : (
          <Box key="footer" flexDirection={footerWraps(grid.fit) ? 'column' : 'row'} justifyContent="space-between" alignItems={footerWraps(grid.fit) ? 'flex-start' : 'center'} columnGap={cols(CARD_GAP_X)} {...(footerWraps(grid.fit) ? { rowGap: vstep(CARD_GAP) } : {})}>
            <Box key="footer-more" flexGrow={1} flexShrink={1} {...(footerWraps(grid.fit) ? { width: '100%' } : {})}>
              {LinkButton(el, 'morel-more-cards', seeAll, () => act.openGuide(true), { row: true })}
            </Box>
            <Box flexDirection="row" flexWrap="wrap" justifyContent="flex-end" alignItems="center" columnGap={cols(CARD_GAP_X)} {...(footerWraps(grid.fit) ? { alignSelf: 'flex-end' as const } : {})}>
              {actions}
            </Box>
          </Box>
        )
      )}
    </Box>
  )
}
