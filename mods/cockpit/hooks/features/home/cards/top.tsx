// The cards on top of the pane, above the columns: the band's lines (when the pane was opened from the band).
import { bandWhatIs, topicWhatIs } from '../../../core/whatis'
import { liveItems, markOf } from '../../../core/band'
import { tr } from '../../../core/lang'
import { bandWords } from '../../../core/happened'
import { needsChip } from '../../../core/cardrules'
import { heldNeedsCount } from '../../../core/inbox'
import { needsIsShut, needsToggled } from '../../../core/headline'
import { ActionButton, Card, Chip, GroupBreak, List, SessionRow, vstep } from '../../../ui/kit'
import { BODY_ROW_GAP } from '../../../ui/tokens'
import { chipWord, needsCount, reasonWords } from '../logic'
import { chevronOf, groupsView, toggle, whatLine } from '../parts'
import type { PaneCtx } from '../parts'
import type { LineGroup } from '../linecards'
import { agoWord, hereNews, needsGroups, newsCount, newsFactsOf, newsGroups } from '../needs'
import { askOpen } from './talk'

export function BandListCard(c: PaneCtx) {
  const { el, view, prefs, act } = c
  const { Box, Text } = el
  const now = view.now ?? 0
  const live = liveItems(view.band ?? [], now).sort((a, b) => b.at - a.at)
  const lines = [
    ...(needsCount(view) > 0 ? [{ key: 'band:needs', text: `◆ ${needsChip(needsCount(view), tr)}`, what: topicWhatIs('needs') }] : []),
    ...live.map(x => ({ key: `band:${x.id}`, text: `${markOf(x)} ${bandWords(x, tr)}`, what: bandWhatIs(x, now, prefs.ledger.filter(e => `did:${e.what}` === x.id)) })),
  ]
  return Card(
    el,
    'band-list',
    'Notices',
    lines.length === 0 ? '' : String(lines.length),
    <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {lines.length === 0 ? <Text dimColor>{tr('Nothing to show right now.')}</Text> : lines.flatMap(l => whatLine(c, l.key, <Text wrap="truncate-end">{l.text}</Text>, l.what))}
      <Box flexDirection="row" justifyContent="flex-end">
        {ActionButton(el, 'band-list-done', 'Done', act.closeBandList)}
      </Box>
    </Box>,
  )
}

export const needsGroupsOf = (c: { view: PaneCtx['view']; prefs: PaneCtx['prefs'] }): LineGroup[] => {
  const now = c.view.now ?? 0
  const news = newsFactsOf(c.prefs, now)
  const name = c.view.here?.name ?? tr('This session')
  return joinHeads([...hereNews(news, name, tr), ...needsGroups(c.prefs.inbox, now, tr), ...newsGroups(news, tr)])
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
  const oneRow = calm && c.glanceOf !== undefined
  const calmOpen = prefs.open === 'needs:calm'
  const total = needsTotal(c0)
  const folds = !calm && c.glanceOf !== undefined
  const itemsGlance = folds ? { value: needsNote(total), dot: 'amber' as const, isOpen: !needsIsShut(prefs.openSections, total), widthPt: c.widthPt, onPress: () => needsFold(c, total) } : undefined
  return Card(
    el,
    'needs',
    'Needs you',
    needsNote(total),
    <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
      {calm ? <Text dimColor>{tr('Nothing needs you.')}</Text> : null}
      {view.needs.length === 0 ? null : asksList(c, isCompact)}
      {view.needs.length === 0 || groups.length === 0 ? null : GroupBreak(el, 'needs-br-asks', c.widthPt, undefined, true)}
      {groups.length === 0 ? null : groupsView(c, 'needs', shownGroups)}
    </Box>,
    oneRow ? { glance: { value: tr('Nothing'), dot: 'neutral', isOpen: calmOpen, widthPt: c.widthPt, onPress: toggle(c, 'needs:calm') } } : itemsGlance === undefined ? {} : { glance: itemsGlance },
  )
}

export const needsShut = (c: PaneCtx): boolean => c.glanceOf !== undefined && needsRows(c, needsGroupsOf(c)) > 0 && needsIsShut(c.prefs.openSections, needsTotal(c))
function needsFold(c: PaneCtx, total: number): void {
  const now = c.prefs.openSections
  const next = needsToggled(now, total)
  for (const k of [...now.filter(k => !next.includes(k)), ...next.filter(k => !now.includes(k))]) c.act.toggleSection(k)
}

function asksList(c: PaneCtx, isCompact: boolean) {
  const { el, view } = c
  return List(
    el,
    view.needs.flatMap(r => [
      SessionRow(el, `n-${r.rec.sessionId}`, {
        kind: 'needs',
        word: 'Needs you',
        name: r.name,
        innerPt: c.widthPt,
        right: Chip(el, `c-${r.rec.sessionId}`, chipWord(r.rec)),
        detail: isCompact ? agoWord(r.sinceMs, tr) : reasonWords(r.reason, tr),
        ...(isCompact ? {} : { detailRight: agoWord(r.sinceMs, tr) }),
        after: chevronOf(c, `needs:${r.rec.sessionId}`),
        onPress: toggle(c, `needs:${r.rec.sessionId}`),
      }),
      ...askOpen(c, r),
    ]),
  )
}
