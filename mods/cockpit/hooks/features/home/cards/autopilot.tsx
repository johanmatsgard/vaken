// The Autopilot card: what vaken did for you today and the last few compacts.
import { didWhatIs, quietWords, topicWhatIs } from '../../../core/whatis'
import { tokenWord } from '../../../core/appcontext'
import { tr, trFill } from '../../../core/lang'
import { DID_HEAD, didKind, didTitle, didToday, savingWords, savings, shortSummary, timeWord, todaySummary } from '../../../core/ledger'
import { ActionButton, Card, GroupBreak, vstep } from '../../../ui/kit'
import { ADVICE_BUTTON_GAP, BODY_ROW_GAP, LIST_COL_GAP, LIST_SHOW, cols } from '../../../ui/tokens'
import type { LineGroup } from '../linecards'
import type { Detail, View } from '../logic'
import type { Prefs } from '../prefs'
import { groupsView, moreOf, whatLine } from '../parts'
import type { PaneCtx } from '../parts'
import { weeklyGroup } from './calm'

const LEDGER_SHOW = 3

export type AutopilotModel = { d: Detail; today: ReturnType<typeof todaySummary>; did: ReturnType<typeof didToday>; groups: LineGroup[] }

export function autopilotModel(view: View, prefs: Prefs, show = LIST_SHOW): AutopilotModel {
  const d = prefs.cardDetail.autopilot
  const today = todaySummary(prefs.ledger, view.now ?? 0, view.counts)
  const recent = savings(prefs.ledger).slice(0, Math.round((LEDGER_SHOW * show) / LIST_SHOW))
  const did = didToday(prefs.ledger, view.now ?? 0, view.counts).filter(x => didKind(x.what) === 'did')
  const compactsRow =
    today.count === 0
      ? []
      : [{ key: 'compacts', title: tr('Compacted the session'), right: `${today.count === 1 ? tr('once') : tr('{n} times').replace('{n}', String(today.count))} · ${tr('about {k} freed').replace('{k}', tokenWord(today.freed))}`, what: { ...topicWhatIs('autopilot'), facts: recent.map(e => `${savingWords(e).what} at ${timeWord(e.at)}${e.how === 'auto' ? `, ${tr('by itself')}` : ''}.`) } }]
  const groups: LineGroup[] = [
    {
      head: DID_HEAD.did,
      rows: [...compactsRow, ...did.map(x => ({ key: `did:${x.what}`, title: trFill(didTitle(x.what)), right: x.n === 1 ? tr('once') : tr('{n} times').replace('{n}', String(x.n)), what: didWhatIs(x.what, prefs.ledger.filter(e => e.what === x.what), view.now ?? 0) ?? topicWhatIs('autopilot'), acted: x.what }))],
    },
    ...weeklyGroup(prefs.calm?.weekly),
  ].filter(g => g.rows.length > 0)
  return { d, today, did, groups }
}

export function AutopilotCard(c: PaneCtx, m: AutopilotModel, grow: boolean) {
  const { el, prefs, act } = c
  const { Box, Text } = el
  const { d: dAuto, today, did, groups: autoGroups } = m
  // "Quiet it?": a warning that fired often today and that you never acted on.
  const q = prefs.quiet
  const quietRow =
    q === undefined ? null : (
      <Box key="quiet" flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
        <Text>{quietWords(q, tr)}</Text>
        <Box flexDirection="row" alignItems="center" columnGap={cols(LIST_COL_GAP)}>
          {ActionButton(el, 'quiet-yes', 'Turn off', () => act.quiet(q, true), { primary: true, gap: LIST_COL_GAP })}
          {ActionButton(el, 'quiet-no', 'Keep', () => act.quiet(q, false), { gap: LIST_COL_GAP })}
        </Box>
      </Box>
    )
  return Card(
    el,
    'autopilot',
    'Autopilot',
    dAuto === 'explained' && today.count + did.length > 0 ? 'today' : '',
    dAuto !== 'explained' ? (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {whatLine(c, 'autopilot', <Text>{shortSummary(today, did, tr)}</Text>, topicWhatIs('autopilot'))}
        {quietRow}
      </Box>
    ) : (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {quietRow}
        {quietRow === null || autoGroups.length === 0 ? null : GroupBreak(el, 'autopilot-br-quiet', c.widthPt, undefined, true)}
        {autoGroups.length === 0 ? <Text dimColor>{tr('Nothing yet. Things vaken does for you, like compacting a long session, show up here.')}</Text> : groupsView(c, 'autopilot', autoGroups)}
      </Box>
    ),
    { grow, ...moreOf(c, 'autopilot') },
  )
}
