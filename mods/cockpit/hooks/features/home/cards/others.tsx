// The Other sessions card: one row per other session (a dot, its word, its name, its age), your turn first (the longest waiting first), then working
import { focusOf, topicWhatIs, whatIsLines } from '../../../core/whatis'
import type { Topic, WhatIs } from '../../../core/whatis'
import { t, tr, trFill } from '../../../core/lang'
import { doneLine, groupOfRow, groupRows, rowFact } from '../../../core/sessionfacts'
import { Card, GroupBreak, List, ListRow, Mark, MoreRow, Name, Pin, SessionRow, WhatIsBody, detailChars, fitsRightCol, vstep } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { BODY_ROW_GAP, LIST_SHOW } from '../../../ui/tokens'
import { TURN_REASON, activeFirst, ageWord, allOthers, isPinned, othersCounts, othersWord, reasonWords, sessionActive, stateWord } from '../logic'
import type { Marks, Row, View } from '../logic'
import { LIST_SCOPES, PREF_OTHERS_ALL, PREF_OTHERS_OPEN } from '../prefs'
import type { Prefs } from '../prefs'
import { calmOnce } from './lines'
import { chevronOf, headlineShown, moreOf, toggle } from '../parts'
import type { PaneCtx } from '../parts'
import { agoWord } from '../needs'
import { nudgeLine, replyOpen, stuckShown } from './talk'
import { fitLines } from './modelfit'
import { OverlapLines } from './overlap'

export type OthersModel = { others: Row[]; list: { shown: Row[]; hidden: number; label?: string } }

// A session where it is your turn (a needs-you one is never on this card, allOthers)
const yourTurn = (r: Row): boolean => r.kind === 'waiting' || r.kind === 'needs'

// The order of the list: a session where it is your turn, or that needs you, is always above a pinned quiet one;
// among those and among the rest, pinned first. Each part keeps its own order (the longest waiting first)
export function othersOrder(rows: readonly Row[], marks: Marks): Row[] {
  const pinnedFirst = (of: Row[]): Row[] => [...of.filter(r => isPinned(r, marks)), ...of.filter(r => !isPinned(r, marks))]
  return [...pinnedFirst(rows.filter(yourTurn)), ...pinnedFirst(rows.filter(r => !yourTurn(r)))]
}

export function othersModel(view: View, prefs: Prefs, show = LIST_SHOW): OthersModel {
  const others = othersOrder(allOthers(view), prefs.marks)
  const list = activeFirst(others, r => sessionActive(r, isPinned(r, prefs.marks)), prefs.othersAll, show, prefs.lists.others === 'all')
  return { others, list }
}

// `max` is the characters the line has room for: when it is longer, the group name goes first. In a grouped list the group names the project once, so a row says only its age (its state is its word)
export function othersDetail(r: Row, hereCwd: string | undefined, grouped: boolean, max?: number): string {
  const fact = rowFact({ kind: r.kind, reason: reasonWords(r.reason, tr), sinceMs: r.sinceMs, cwd: r.rec.cwd, contextPercent: r.rec.contextPercent, costUsd: r.rec.costUsd, done: r.rec.done }, hereCwd)
  // An age says "ago" ("8 min ago"), as everywhere else; a session at work says "now" (its age is how long it works, not how old its news is). Each value is whole: its spaces never break ("6 min ago", "$3.40")
  const whole = (v: string): string => v.replace(/ /g, '\u00a0')
  const age = r.kind === 'working' ? tr('now') : whole(agoWord(r.sinceMs))
  if (grouped) return age
  // The word beside the name already says the state
  const tail = fact === undefined ? age : `${whole(fact.text)}, ${age}`
  const named = fact === undefined ? r.group : undefined
  const fits = (line: string): boolean => max === undefined || line.length <= max
  if (named === undefined || named === '') return tail
  const all = `${named} · ${tail}`
  return fits(all) ? all : tail
}

// A group's place is its best row's: a group with a Your-turn row first, then in the rows' own order (othersOrder: pinned first among the rest)
export const othersGroups = (rows: readonly Row[]): { head: string; rows: Row[] }[] | undefined => {
  if (rows.length <= LIST_SHOW) return undefined
  const groups = groupRows(rows, r => groupOfRow(r.group, r.rec.cwd), r => (yourTurn(r) ? 0 : 1))
  return groups.length < 2 || groups.every(g => g.rows.length < 2) ? undefined : groups
}

// A row's age says "ago" ("8 min ago") when that fits the right column whole, else the bare age ("8 min")
const rowAge = (ms: number): string => {
  const ago = agoWord(ms)
  return fitsRightCol(ago) ? ago : ageWord(ms, tr)
}

export function OthersCard(c: PaneCtx, m: OthersModel, grow: boolean) {
  const { el, view, prefs, act, onFlip } = c
  const { Box, Text } = el
  const { others, list: othersList } = m
  const shown = othersList.shown
  const dOthers = prefs.cardDetail.others
  const watching = prefs.watching ?? []
  const groups = othersGroups(shown)
  const hereCwd = view.here?.rec.cwd
  const compact = dOthers !== 'explained' && el.Svg !== undefined
  // A session that needs you is in the band and Needs you, never in this list (allOthers)
  const rowOf = (r: Row): Drawn[] => {
    const kind = r.kind
    // A stuck session says so in its word, with the plain dot of its state; the line under it says only how long, so the fact is said once
    const stuck = stuckShown(c, r.rec)
    const word = tr(stuck ? 'May be stuck' : stateWord(kind))
    const id = r.rec.sessionId
    const key = `other:${id}`
    const topic: Topic = kind === 'working' ? 'working' : kind === 'waiting' ? 'yourturn' : 'quiet'
    const isWatched = watching.includes(id)
    // A session at work is "now", not how long it has worked (that read as idle beside the working word); a stuck one keeps its age
    const age = <Text dimColor>{isWatched ? tr('watching') : kind === 'working' && !stuck ? tr('now') : rowAge(r.sinceMs)}</Text>
    const done = doneLine(r.rec.done)
    // The row already says its one age, so the opened row adds only the reason, if any (never a second, other age), and never one its meaning line already says
    const base = topicWhatIs(topic, r.reason === '' || r.reason === TURN_REASON ? undefined : `${reasonWords(r.reason, tr)}.`)
    const what: WhatIs | undefined = base === undefined ? undefined : { ...base, ...(done === undefined ? {} : { facts: [...(base.facts ?? []), `${tr('Done so far')}: ${done}`] }) }
    const setting = focusOf(what?.setting)
    const open =
      prefs.open !== key || what === undefined
        ? null
        : WhatIsBody(el, `w-${key}`, whatIsLines(what, trFill), setting === undefined ? undefined : { label: 'Change in Settings', onPress: () => act.openSettingsAt(setting), go: true }, act.watch === undefined || (r.kind !== 'working' && !isWatched) ? [] : [{ key: `watch-${id}`, label: isWatched ? 'Stop watching' : 'Tell me when done', onPress: () => act.watch?.(id, !isWatched, r.name, r.kind === 'working') }])
    return [
      // Compact with pictures: the state is the dot alone
      compact
        ? ListRow(el, `o-${id}`, [Mark(el, kind, word), Name(el, 'name', r.name), isPinned(r, prefs.marks) ? Pin(el, 'pin') : null], age, undefined, undefined, undefined, chevronOf(c, key, undefined, r.name), { onPress: toggle(c, key), widthPt: c.widthPt })
        : SessionRow(el, `o-${id}`, {
            kind,
            word,
            name: r.name,
            innerPt: c.widthPt,
            pinned: isPinned(r, prefs.marks),
            right: dOthers === 'simple' || isWatched ? age : undefined,
            detail: dOthers !== 'explained' || stuck ? undefined : othersDetail(r, hereCwd, groups !== undefined, detailChars(c.widthPt, false, word)),
            after: chevronOf(c, key, undefined, r.name),
            onPress: toggle(c, key),
          }),
      open,
      replyOpen(c, r),
      nudgeLine(c, r.rec, r.name, false, !compact),
      ...fitLines(c, r),
    ]
  }
  // The header's counts: the lead alone is the short form ("2 your turn"). An open Glance row that shows the lead does not repeat it
  const counts = othersCounts(view, tr)
  const leadShown = headlineShown(c, 'others', 'Other sessions') && c.glanceOf?.('others')?.value === counts[0]
  const shownCounts = leadShown ? counts.slice(1) : counts
  // With every session hidden the body says how many, once
  const hidden = others.length === 0 || prefs.hiddenCount === 0 ? [] : [t('pane.n_hidden', { n: prefs.hiddenCount })]
  const note = [...shownCounts, ...hidden].join(' · ')
  // The lead count is the short form even when it is the whole note: a note with a short form is never dropped beside the Pick (headerFit)
  const noteShort = shownCounts.length > 0 ? shownCounts[0] : undefined
  return Card(
    el,
    'others',
    'Other sessions',
    note,
    others.length === 0 ? (
      <Text dimColor>{prefs.hiddenCount > 0 ? tr('{n} hidden in Settings.').replace('{n}', String(prefs.hiddenCount)) : othersWord(view, tr) === tr('No other session is active now.') ? tr('No other session now') : othersWord(view, tr)}</Text>
    ) : (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {OverlapLines(c, false)}
        {shown.length === 0 ? <Text dimColor>{tr('No other session now')}</Text> : null}
        {shown.length === 0 ? null : groups === undefined ? List(el, shown.flatMap(r => rowOf(r))) : groups.flatMap((g, n) => [
          n === 0 ? null : GroupBreak(el, `others-br${n}`, c.widthPt, undefined, true),
          // The project is named once, on its group: a plain row at full strength, never a dim title
          <Text key={`others-head${n}`}>{g.head}</Text>,
          List(el, g.rows.flatMap(r => rowOf(r))),
        ])}
        {/* The fold under the list names what it holds ("4 more sessions", "Fewer"); the header keeps Show more and Show less */}
        {othersList.label === undefined ? null : MoreRow(el, 'others', prefs.othersAll ? tr('Fewer') : othersList.hidden === 1 ? tr('1 more session') : tr('{n} more sessions').replace('{n}', String(othersList.hidden)), prefs.othersAll, () => onFlip(PREF_OTHERS_ALL))}
      </Box>
    ),
    { grow, ...calmOnce(moreOf(c, 'others', others.length === 0), others.length === 0), ...(noteShort === undefined ? {} : { noteShort }), fold: others.length === 0 ? undefined : { open: prefs.othersOpen, onToggle: () => onFlip(PREF_OTHERS_OPEN) }, ...(others.length === 0 ? {} : { pick: { key: 'others-scope', options: LIST_SCOPES, value: prefs.lists.others, onPick: (v: string) => act.setList('others', v) } }) },
  )
}
