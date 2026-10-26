// The cards on top of the pane, above the columns: the band's lines (when the pane was opened from the band).
import { bandWhatIs, topicWhatIs } from '../../../core/whatis'
import { liveItems, markOf, marked } from '../../../core/band'
import { tr } from '../../../core/lang'
import { bandWords } from '../../../core/happened'
import { needsChip } from '../../../core/cardrules'
import { heldNeedsCount } from '../../../core/inbox'
import { needsIsShut, needsToggled } from '../../../core/headline'
import { ActionButton, Card, Chip, GroupBreak, List, SessionRow, detailBeside, fitsRightCol, vstep, wrappedLines } from '../../../ui/kit'
import { BODY_ROW_GAP } from '../../../ui/tokens'
import { chipWord, needsCount, reasonWords } from '../logic'
import { chevronOf, groupsView, toggle, whatLine } from '../parts'
import type { PaneCtx } from '../parts'
import type { LineGroup } from '../linecards'
import { agoWord, hereNews, needsGroups, newsCount, newsFactsOf, newsGroups } from '../needs'
import { askOpen } from './talk'
import { FRESH_BAND_ID, FRESH_PRESS } from '../../../core/freshstart'
import { FRESH_BRIEF } from '../rowact'

export function BandListCard(c: PaneCtx) {
  const { el, view, prefs, act } = c
  const { Box, Text } = el
  const now = view.now ?? 0
  const live = liveItems(view.band ?? [], now).sort((a, b) => b.at - a.at)
  const lines = [
    ...(needsCount(view) > 0 ? [{ key: 'band:needs', text: `◆ ${needsChip(needsCount(view), tr)}`, what: topicWhatIs('needs') }] : []),
    ...live.map(x => ({ key: `band:${x.id}`, text: marked(markOf(x), bandWords(x, tr)), what: bandWhatIs(x, now, prefs.ledger.filter(e => `did:${e.what}` === x.id)), ...(x.id === FRESH_BAND_ID ? { inside: { label: FRESH_PRESS, action: FRESH_BRIEF } } : {}) })),
  ]
  return Card(
    el,
    'band-list',
    'Notices',
    lines.length === 0 ? '' : String(lines.length),
    <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {lines.length === 0 ? <Text dimColor>{tr('Nothing to show right now.')}</Text> : lines.flatMap(l => whatLine(c, l.key, <Text>{l.text}</Text>, l.what, undefined, wrappedLines(l.text, c.widthPt), undefined, true, false, 'inside' in l ? l.inside : undefined))}
      <Box flexDirection="row" justifyContent="flex-end">
        {ActionButton(el, 'band-list-done', 'Done', act.closeBandList)}
      </Box>
    </Box>,
  )
}

export const needsGroupsOf = (c: { view: PaneCtx['view']; prefs: PaneCtx['prefs'] }): LineGroup[] => {
  const now = c.view.now ?? 0
  const news = newsFactsOf(c.prefs, now)
  return joinHeads([...hereNews(news, tr), ...needsGroups(c.prefs.inbox, now, tr), ...newsGroups(news, tr)])
}
const joinHeads = (groups: LineGroup[]): LineGroup[] =>
  groups.reduce<LineGroup[]>((out, g) => {
    const same = out.find(x => x.head === g.head && x.fold === undefined && g.fold === undefined)
    if (same === undefined) out.push({ ...g })
    else same.rows = [...same.rows, ...g.rows]
    return out
  }, [])
export const needsTotal = (c: { view: PaneCtx['view']; prefs: PaneCtx['prefs'] }): number => needsCount({ ...c.view, held: heldNeedsCount(c.prefs.inbox) + newsCount(newsFactsOf(c.prefs, c.view.now ?? 0)) })
export const needsNote = (total: number): string => (total > 0 ? String(total) : '')
export const needsRows = (c: { view: PaneCtx['view'] }, groups: LineGroup[]): number => c.view.needs.length + groups.reduce((n, g) => n + g.rows.length, 0)

export function NeedsCard(c0: PaneCtx, cap?: number, built: LineGroup[] = needsGroupsOf(c0)) {
  const c: PaneCtx = cap === undefined ? c0 : { ...c0, view: { ...c0.view, needs: c0.view.needs.slice(0, cap) } }
  const { el, view, prefs } = c
  const { Box, Text } = el
  const isCompact = prefs.detail !== 'explained'
  let left = cap === undefined ? Infinity : Math.max(0, cap - view.needs.length)
  const groups = built.flatMap(g => {
    const rows = g.rows.slice(0, left)
    left -= rows.length
    return rows.length === 0 ? [] : [{ ...g, rows }]
  })
  const several = (view.needs.length > 0 ? 1 : 0) + groups.length > 1
  const shownGroups = several ? groups : groups.map(g => ({ ...g, head: '' }))
  const calm = view.needs.length === 0 && groups.length === 0
  // Calm is quiet: at every look the calm card is one row, its header word and "None" with the normal dot
  const oneRow = calm
  const calmOpen = prefs.open === 'needs:calm'
  const total = needsTotal(c0)
  const folds = !calm && c.glanceOf !== undefined
  // Amber only while something counted waits; calm rows alone (a timed-out stopped step, an offer) keep the normal dot
  const itemsGlance = folds ? { value: needsNote(total), dot: total > 0 ? ('amber' as const) : ('neutral' as const), isOpen: !needsIsShut(prefs.openSections, total), widthPt: c.widthPt, onPress: () => needsFold(c, total) } : undefined
  return Card(
    el,
    'needs',
    'Needs you',
    needsNote(total),
    <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {calm ? <Text dimColor>{tr('Nothing needs you')}</Text> : null}
      {view.needs.length === 0 ? null : asksList(c, isCompact)}
      {view.needs.length === 0 || groups.length === 0 ? null : GroupBreak(el, 'needs-br-asks', c.widthPt, undefined, true)}
      {groups.length === 0 ? null : groupsView(c, 'needs', shownGroups)}
    </Box>,
    // Shut, the header says "Nothing"; open, the body line says it, so the header holds the dot alone (one fact once)
    oneRow ? { glance: { value: calmOpen ? '' : tr('None'), dot: 'neutral', isOpen: calmOpen, widthPt: c.widthPt, onPress: toggle(c, 'needs:calm') } } : itemsGlance === undefined ? {} : { glance: itemsGlance },
  )
}

export const needsShut = (c: PaneCtx): boolean => c.glanceOf !== undefined && needsRows(c, needsGroupsOf(c)) > 0 && needsIsShut(c.prefs.openSections, needsTotal(c))
function needsFold(c: PaneCtx, total: number): void {
  const now = c.prefs.openSections
  const next = needsToggled(now, total)
  for (const k of [...now.filter(k => !next.includes(k)), ...next.filter(k => !now.includes(k))]) c.act.toggleSection(k)
}

// The age is one whole value at the end of the dim line (where every row of the card has it): at the right of the reason when both fit, else after the reason, its spaces kept from breaking
// One fact once: where the amber chip shows ("Question"), the dim line does not say "asks you a question" again; Short says the age alone
const askDetail = (isCompact: boolean, chipShows: boolean, r: PaneCtx['view']['needs'][number], widthPt: number): { detail: string; detailRight?: string } => {
  const age = agoWord(r.sinceMs)
  const reason = isCompact || (chipShows && r.rec.ask?.kind === 'question') ? '' : reasonWords(r.reason, tr)
  if (reason === '') return fitsRightCol(age) ? { detail: '', detailRight: age } : { detail: age }
  return detailBeside(reason, age, widthPt) ? { detail: reason, detailRight: age } : { detail: `${reason} · ${age.replace(/ /g, '\u00a0')}` }
}

function asksList(c: PaneCtx, isCompact: boolean) {
  const { el, view } = c
  return List(
    el,
    view.needs.flatMap(r => [
      SessionRow(el, `n-${r.rec.sessionId}`, {
        kind: 'needs',
        word: tr('Needs you'),
        // A session's name is never cut: it wraps on words at a narrow width
        name: r.name,
        wrap: true,
        innerPt: c.widthPt,
        right: Chip(el, `c-${r.rec.sessionId}`, tr(chipWord(r.rec))),
        ...askDetail(isCompact, el.Svg !== undefined, r, c.widthPt),
        after: chevronOf(c, `needs:${r.rec.sessionId}`),
        onPress: toggle(c, `needs:${r.rec.sessionId}`),
      }),
      ...askOpen(c, r),
    ]),
  )
}
