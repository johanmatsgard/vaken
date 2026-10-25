// The Autopilot card: what vaken did for you today and the last few compacts.
import { didWhatIs, quietWords, topicWhatIs } from '../../../core/whatis'
import { tokenWord } from '../../../core/appcontext'
import { fillIn } from '../../../core/fillin'
import { tr, trFill } from '../../../core/lang'
import { DID_HEAD, LEAN_WHAT, didKind, didTitle, didToday, leanSavedToday, savingWords, savings, shortSummary, timeWord, todaySummary } from '../../../core/ledger'
import { ActionButton, Card, GroupBreak, vstep } from '../../../ui/kit'
import { ADVICE_BUTTON_GAP, BODY_ROW_GAP, LIST_COL_GAP, LIST_SHOW, cols } from '../../../ui/tokens'
import type { LineGroup } from '../linecards'
import type { Detail, View } from '../logic'
import type { Prefs } from '../prefs'
import { groupsView, moreOf, whatLine } from '../parts'
import { riskyWarned } from '../../../core/ship'
import { KEEPER_STOP_WHY, KEPT_WHAT, keeperStopped, keptToday } from '../../../core/cachekeeper'
import { CAP_HOLD_WHAT } from '../../../core/agentcap'
import { aboutMoney } from '../../../core/prices'
import type { PaneCtx } from '../parts'
import { weeklyGroup } from './calm'

const LEDGER_SHOW = 3

// The money the keeper's reads came to today, once an answer showed it; nothing before that. Always said as an estimate.
const moneyWords = (usd: number | undefined): string => (usd === undefined ? '' : fillIn(tr(usd >= 0 ? 'saved {usd} (estimate)' : 'cost {usd} (estimate)'), { usd: aboutMoney(Math.abs(usd), tr) }))
const keptMoney = (usd: number | undefined): string => (usd === undefined ? '' : ` · ${moneyWords(usd)}`)

// An action vaken took for you (counted in "N today"); a warning stays a row but is not counted. An extra agent held by the agent cap shows nowhere else once its Needs you line ends, so it is an action here.
export const isAction = (what: string): boolean => didKind(what) === 'did' || what === CAP_HOLD_WHAT
type Did = ReturnType<typeof didToday>
// `acts` counts the actions only (the Glance headline); `shown` leaves out the one the Quiet ask holds, which shows only in that ask while it is open, actions first
export type AutopilotModel = { d: Detail; today: ReturnType<typeof todaySummary>; did: Did; acts: Did; shown: Did; money: string; groups: LineGroup[] }

export function autopilotModel(view: View, prefs: Prefs, show = LIST_SHOW): AutopilotModel {
  const d = prefs.cardDetail.autopilot
  const today = todaySummary(prefs.ledger, view.now ?? 0, view.counts)
  const recent = savings(prefs.ledger).slice(0, Math.round((LEDGER_SHOW * show) / LIST_SHOW))
  // What vaken did, and the notices that are not a risky step (those are the Safety card's), so each shows once
  const did = didToday(prefs.ledger, view.now ?? 0, view.counts).filter(x => isAction(x.what) || (didKind(x.what) === 'warned' && !riskyWarned(x.what)))
  const acts = did.filter(x => isAction(x.what))
  const shown = [...acts, ...did.filter(x => !isAction(x.what))].filter(x => x.what !== prefs.quiet?.what)
  const usd = keptToday(prefs.ledger, view.now ?? 0)
  const stopped = keeperStopped(prefs.ledger, view.now ?? 0)
  const times = (n: number): string => (n === 1 ? tr('once') : fillIn(tr('{n} times'), { n }))
  // A warning says it warned; a stopped keeper says Stopped, with its plain reason on the dim line under it
  const leanSaved = leanSavedToday(prefs.ledger, view.now ?? 0, view.counts)
  // The day's lean cuts say the tokens they saved, always as an estimate
  const leanRight = `${times(Math.max(1, acts.find(x => x.what === LEAN_WHAT)?.n ?? 1))}${leanSaved > 0 ? ` · ${fillIn(tr('about {k} tokens saved (estimate)'), { k: tokenWord(leanSaved) })}` : ''}`
  const rightOf = (x: Did[number]): string =>
    x.what === LEAN_WHAT ? leanRight : x.what === KEPT_WHAT && stopped !== undefined ? `${tr('Stopped')}${keptMoney(usd)}` : !isAction(x.what) ? fillIn(tr('Warned {times}'), { times: times(x.n) }) : `${times(x.n)}${x.what === KEPT_WHAT ? keptMoney(usd) : ''}`
  const compactsRow =
    today.count === 0
      ? []
      : [{ key: 'compacts', title: tr('Compacted the session'), right: `${times(today.count)} · ${fillIn(tr('about {k} tokens freed'), { k: tokenWord(today.freed) })}`, what: { ...topicWhatIs('autopilot'), facts: recent.map(e => `${savingWords(e).what} at ${timeWord(e.at)}${e.how === 'auto' ? `, ${tr('by itself')}` : ''}.`) } }]
  const groups: LineGroup[] = [
    {
      head: DID_HEAD.did,
      rows: [
        ...compactsRow,
        ...shown.map(x => ({
          key: `did:${x.what}`,
          title: trFill(didTitle(x.what)),
          right: rightOf(x),
          ...(x.what === KEPT_WHAT && stopped !== undefined ? { note: [tr(KEEPER_STOP_WHY[stopped])] } : {}),
          what: didWhatIs(x.what, prefs.ledger.filter(e => e.what === x.what), view.now ?? 0) ?? topicWhatIs('autopilot'),
          acted: x.what,
        })),
      ],
    },
    ...weeklyGroup(prefs.calm?.weekly),
  ].filter(g => g.rows.length > 0)
  return { d, today, did, acts, shown, money: moneyWords(usd), groups }
}

export function AutopilotCard(c: PaneCtx, m: AutopilotModel, grow: boolean) {
  const { el, prefs, act } = c
  const { Box, Text } = el
  const { d: dAuto, today, shown, money, groups: autoGroups } = m
  // The Short line: the saving is its first part and stands for the keeper's row
  const shortRows = money === '' ? shown : shown.filter(x => x.what !== KEPT_WHAT)
  // At the Glance look the header already says "Nothing today", so the card has no body
  const glance = c.glanceOf?.('autopilot') !== undefined
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
    dAuto === 'explained' && today.count + shown.length > 0 ? 'today' : '',
    dAuto !== 'explained' ? (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {quietRow !== null && today.count + shown.length === 0 ? null : whatLine(c, 'autopilot', <Text>{shortSummary(today, shortRows, tr, money)}</Text>, topicWhatIs('autopilot'))}
        {quietRow}
      </Box>
    ) : autoGroups.length === 0 && quietRow === null && glance ? null : (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {quietRow}
        {quietRow === null || autoGroups.length === 0 ? null : GroupBreak(el, 'autopilot-br-quiet', c.widthPt, undefined, true)}
        {autoGroups.length === 0 && quietRow !== null ? null : autoGroups.length === 0 ? <Text dimColor>{tr('Nothing yet. Things vaken does for you, like compacting a long session, show up here.')}</Text> : groupsView(c, 'autopilot', autoGroups)}
      </Box>
    ),
    // Nothing done today: no Show more, there is nothing more to show
    { grow, ...moreOf(c, 'autopilot', autoGroups.length === 0) },
  )
}
