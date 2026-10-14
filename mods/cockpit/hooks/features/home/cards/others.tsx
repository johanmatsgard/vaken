// The Other sessions card: one row per other session (a dot, its word, its name, its age), your turn first (the longest waiting first), then working
import { focusOf, topicWhatIs, whatIsLines } from '../../../core/whatis'
import type { Topic, WhatIs } from '../../../core/whatis'
import { tr, trFill } from '../../../core/lang'
import { doneLine, groupOfRow, groupRows, rowFact } from '../../../core/sessionfacts'
import { Card, GroupBreak, List, ListRow, Mark, MoreRow, Name, Pin, SessionRow, WhatIsBody, detailChars, vstep } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { BODY_ROW_GAP, LIST_SHOW } from '../../../ui/tokens'
import { activeFirst, ageWord, allOthers, isPinned, othersCount, othersWord, pinnedFirst, reasonWords, sessionActive, stateWord } from '../logic'
import type { Row, View } from '../logic'
import { LIST_SCOPES, PREF_OTHERS_ALL, PREF_OTHERS_OPEN } from '../prefs'
import type { Prefs } from '../prefs'
import { chevronOf, moreOf, toggle } from '../parts'
import type { PaneCtx } from '../parts'
import { nudgeLine, replyOpen } from './talk'
import { fitLines } from './modelfit'

export type OthersModel = { others: Row[]; list: { shown: Row[]; hidden: number; label?: string } }

export function othersModel(view: View, prefs: Prefs, show = LIST_SHOW): OthersModel {
  const others = pinnedFirst(allOthers(view), prefs.marks)
  const list = activeFirst(others, r => sessionActive(r, isPinned(r, prefs.marks)), prefs.othersAll, show, prefs.lists.others === 'all')
  return { others, list }
}

// `max` is the characters the line has room for: when it is longer, the group name goes first
export function othersDetail(r: Row, hereCwd: string | undefined, grouped: boolean, max?: number): string {
  const fact = rowFact({ kind: r.kind, reason: reasonWords(r.reason, tr), sinceMs: r.sinceMs, cwd: r.rec.cwd, contextPercent: r.rec.contextPercent, costUsd: r.rec.costUsd, done: r.rec.done }, hereCwd)
  const age = ageWord(r.sinceMs, tr)
  const named = grouped ? groupOfRow(r.group, r.rec.cwd) : undefined
  if (fact !== undefined) {
    const line = `${fact.text}, ${age}`
    return named === undefined || named === '' || (max !== undefined && named.length + 3 + line.length > max) ? line : `${named} · ${line}`
  }
  // The word beside the name already says "Your turn"
  const rest = `${r.kind !== 'needs' || r.reason === '' ? '' : `${reasonWords(r.reason, tr)}, `}${age}`
  const group = grouped ? named : r.group
  const whole = group === undefined || group === '' ? rest : `${group} · ${rest}`
  return max === undefined || whole.length <= max ? whole : rest
}

export const othersGroups = (rows: readonly Row[]): { head: string; rows: Row[] }[] | undefined => {
  if (rows.length <= LIST_SHOW) return undefined
  const groups = groupRows(rows, r => groupOfRow(r.group, r.rec.cwd))
  return groups.length < 2 || groups.every(g => g.rows.length < 2) ? undefined : groups
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
  const rowOf = (r: Row): Drawn[] => {
    const kind = r.kind === 'needs' ? 'idle' : r.kind
    const word = tr(stateWord(kind))
    const id = r.rec.sessionId
    const key = `other:${id}`
    const topic: Topic = kind === 'working' ? 'working' : kind === 'waiting' ? 'yourturn' : 'quiet'
    const isWatched = watching.includes(id)
    const age = <Text dimColor>{isWatched ? tr('watching') : ageWord(r.sinceMs, tr)}</Text>
    const done = doneLine(r.rec.done)
    const base = topicWhatIs(topic, `${tr('The last event was {age} ago').replace('{age}', ageWord(r.sinceMs, tr))}${r.reason === '' ? '' : `: ${reasonWords(r.reason, tr)}`}.`)
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
            detail: dOthers !== 'explained' ? undefined : othersDetail(r, hereCwd, groups !== undefined, detailChars(c.widthPt, false, word)),
            after: chevronOf(c, key, undefined, r.name),
            onPress: toggle(c, key),
          }),
      open,
      replyOpen(c, r),
      nudgeLine(c, r.rec, r.name, false),
      ...fitLines(c, r),
    ]
  }
  return Card(
    el,
    'others',
    'Other sessions',
    `${othersCount(view, tr) === '0' ? '' : othersCount(view, tr)}${prefs.hiddenCount > 0 ? ` · ${tr('{n} hidden').replace('{n}', String(prefs.hiddenCount))}` : ''}`,
    others.length === 0 ? (
      <Text dimColor>{prefs.hiddenCount > 0 ? tr('{n} hidden in Settings.').replace('{n}', String(prefs.hiddenCount)) : othersWord(view, tr)}</Text>
    ) : (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {shown.length === 0 ? <Text dimColor>{tr('No other session is active now.')}</Text> : null}
        {shown.length === 0 ? null : groups === undefined ? List(el, shown.flatMap(rowOf)) : groups.flatMap((g, n) => [
          n === 0 ? null : GroupBreak(el, `others-br${n}`, c.widthPt, undefined, true),
          List(el, g.rows.flatMap(rowOf)),
        ])}
        {othersList.label === undefined ? null : MoreRow(el, 'others', othersList.label, prefs.othersAll, () => onFlip(PREF_OTHERS_ALL))}
      </Box>
    ),
    { grow, ...moreOf(c, 'others', others.length === 0), ...(othersCount(view, tr) !== '0' ? { noteShort: othersCount(view, tr) } : {}), fold: others.length === 0 ? undefined : { open: prefs.othersOpen, onToggle: () => onFlip(PREF_OTHERS_OPEN) }, ...(others.length === 0 ? {} : { pick: { key: 'others-scope', options: LIST_SCOPES, value: prefs.lists.others, onPick: (v: string) => act.setList('others', v) } }) },
  )
}
