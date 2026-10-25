// Line cards (Proof, Guard, Skills, Pull requests, Ship, Where was I, Safety, Context health and Preview): a short list of plain lines or grouped rows each
import { capMaxOf } from '../../../core/agentcap'
import { tr } from '../../../core/lang'
import { findCommands, findDescription, findRight, findWords } from '../../../core/skills'
import { Card, MoreRow, OpenLine, vstep } from '../../../ui/kit'
import type { Drawn, GlanceOpts } from '../../../ui/kit'
import { BODY_ROW_GAP, LIST_SHOW } from '../../../ui/tokens'
import { backFactsOf } from '../back'
import { safetyFactsOf } from '../safety'
import { contextFactsOf } from '../context'
import { previewFactsOf } from '../preview'
import { setupFactsOf } from '../setup'
import { doFactsOf } from '../dorow'
import { parseScope, setupApplyOn } from '../../../core/setupcard'
import { SETUP_OFF, SETUP_TURN_ON, SETUP_WHERE_ALL, SETUP_WHERE_ALL_SHORT, SETUP_WHERE_PROJECT, SETUP_WHERE_PROJECT_SHORT, SETUP_WHERE_SESSION, SETUP_WHERE_SESSION_SHORT } from '../../../core/setupwords'
import { lineCard } from '../linecards'
import type { CardCtx, LineGroup } from '../linecards'
import { LINE_CARD_IDS } from '../logic'
import type { CardId, LineCardId, View } from '../logic'
import type { Prefs } from '../prefs'
import { groupsTidy } from './tidy'
import { groupsView, moreOf, pointerTo, whatLine } from '../parts'
import type { PaneCtx } from '../parts'
import { skillFind } from '../state'
import { OWN_WORD } from '../../../core/talk'

export type LinesModel = {
  load: { running: number; max: number; capOn: boolean }
  ctx: CardCtx
  // One line card, built the first time it is asked for and kept
  card: (id: LineCardId) => ReturnType<typeof lineCard>
}

// This session's record has no branch: git did not answer in its folder (features/home/load.ts reads it at the start)
export const noGitHere = (view: View): boolean => view.here !== undefined && (view.here.rec.branch ?? '') === ''

export function linesModel(view: View, prefs: Prefs): LinesModel {
  const load = { running: (prefs.agents ?? []).filter(r => r.state === 'running').length, max: capMaxOf(prefs.values['cap.max']), capOn: (prefs.values['cap.mode'] ?? 'warn') !== 'off' }
  const ctx: CardCtx = { ...(prefs.guardWarn === undefined ? {} : { guardWarn: prefs.guardWarn }), now: view.now ?? 0, ledger: prefs.ledger, ...(view.counts === undefined ? {} : { counts: view.counts }), proof: prefs.proof, halted: prefs.halted, modes: prefs.values, agents: prefs.agents, computer: { laptop: prefs.laptop, load }, ...(prefs.skills === undefined ? {} : { skills: prefs.skills }), t: tr, ...(prefs.prs === undefined ? {} : { prs: prefs.prs }), ...(prefs.shipShown === undefined ? {} : { shipShown: prefs.shipShown }), back: backFactsOf(view, prefs), safety: safetyFactsOf(prefs), homes: { ship: !prefs.hidden.includes('ship') && prefs.autoHidden?.includes('ship') !== true, prs: !prefs.hidden.includes('prs') && prefs.autoHidden?.includes('prs') !== true, proof: !prefs.hidden.includes('proof') && prefs.autoHidden?.includes('proof') !== true }, context: contextFactsOf(view, prefs), preview: previewFactsOf(prefs, view.now ?? 0), setup: setupFactsOf(prefs), doc: doFactsOf(prefs), ...(noGitHere(view) ? { noGit: true } : {}) }
  const built = new Map<LineCardId, ReturnType<typeof lineCard>>()
  const card = (id: LineCardId): ReturnType<typeof lineCard> => {
    const had = built.get(id)
    if (had !== undefined) return had
    viewBuilds += 1
    const made = lineCard(id, ctx)
    built.set(id, made)
    return made
  }
  return { load, ctx, card }
}

let viewBuilds = 0
export const lineViewBuilds = (): number => viewBuilds

const skillSearch = (c: PaneCtx, finding: boolean): Drawn => {
  const { Box, Input } = c.el
  return Input === undefined ? null : (
    <Box key="skills-find" flexDirection="column">
      <Input key="skills-find-box" placeholder={tr('Find a skill or command')} value={skillFind.query} submitLabel={tr('Find')} onInput={v => c.act.findSkill(v)} onSubmit={v => c.act.findSkill(v, true)} />
    </Box>
  )
}

// Reads only the typed words and the engine's list kept in memory; nothing from the store.
const skillMatches = (c: PaneCtx): Drawn => {
  const { el, view, prefs, act } = c
  const { Box, Text } = el
  const found = findCommands(skillFind.commands, skillFind.query, prefs.skills?.counts, view.now ?? 0)
  const show = c.listShow ?? LIST_SHOW
  if (found.length === 0) return <Text key="skills-find-none" dimColor>{tr(skillFind.failed ? 'The commands could not be read.' : 'No skill or command matches.')}</Text>
  const shown = skillFind.all ? found : found.slice(0, show)
  return (
    <Box key="skills-find-rows" flexDirection="column">
      {shown.map(f => {
        const description = findDescription(f.description)
        return OpenLine(
          el,
          `ol-skills:find-${f.name}`,
          <Box flexDirection="column">
            <Text wrap="truncate-end">{`/${f.name}`}</Text>
            {description === '' ? null : (
              <Text dimColor wrap="truncate-end">
                {description}
              </Text>
            )}
          </Box>,
          false,
          // This plugin's own command cannot run from its pane: the press says to type it, no failed run.
          () => (f.own === true ? act.talk?.ownCommand(f.name) : act.startSkill(f.name)),
          { widthPt: c.widthPt, lines: description === '' ? 1 : 2, right: f.own === true ? tr(OWN_WORD) : findRight(f.count, tr), tall: true },
        )
      })}
      {found.length <= show ? null : MoreRow(el, 'skills-find', skillFind.all ? 'Show fewer' : `Show ${found.length - show} more`, skillFind.all, act.findMore)}
    </Box>
  )
}

// Off: one calm row, "Off" with "Turn on ›"; its press is the same as the switch (the setting)
const setupOff = (c: PaneCtx): Drawn => {
  const { Text } = c.el
  return OpenLine(c.el, 'ol-setup:off', <Text>{tr(SETUP_OFF)}</Text>, false, () => c.act.setSetting('setup.apply', 'on'), { widthPt: c.widthPt, right: tr(SETUP_TURN_ON), tall: true })
}
// The place is chosen on the face only and Set up agents for me on the settings side only, in the same words. Choosing a place also sets the Roles card's place, so the roles written match it.
const setupPick = (c: PaneCtx) => ({
  key: 'setup-scope',
  options: [
    { value: 'all', label: SETUP_WHERE_ALL, short: SETUP_WHERE_ALL_SHORT },
    { value: 'project', label: SETUP_WHERE_PROJECT, short: SETUP_WHERE_PROJECT_SHORT },
    { value: 'session', label: SETUP_WHERE_SESSION, short: SETUP_WHERE_SESSION_SHORT },
  ],
  value: parseScope(c.prefs.values['setup.scope']),
  onPick: (v: string) => {
    c.act.setSetting('setup.scope', v)
    c.act.setRolesScope(v === 'session' ? 'session' : v === 'project' && c.prefs.project !== undefined ? 'project' : 'all')
  },
})

// An open Glance row that already says a row's value (Risky steps: "Warns, worst may stop") is not said again on the row: one fact once
const notTwice = (c: PaneCtx, id: LineCardId, groups: LineGroup[]): LineGroup[] => {
  const head = c.glanceOf?.(id)?.value
  return head === undefined || head === '' ? groups : groups.map(g => ({ ...g, rows: g.rows.map(({ right, ...r }) => (right === head ? r : { ...r, ...(right === undefined ? {} : { right }) })) }))
}
// Ship: an open Glance head that already says the verdict ("1 thing blocks it") is not said again as the first row; the rows under What blocks it follow
const shipNotTwice = (c: PaneCtx, groups: LineGroup[]): LineGroup[] => {
  const head = c.glanceOf?.('ship')?.value
  const [first, ...rest] = groups
  return head === undefined || head === '' || first === undefined || rest.length === 0 || first.rows.length !== 1 || first.rows[0]?.title !== head ? groups : rest
}
// Calm and open, the body's one line says the header's fact: the header holds the dot alone (one fact once, as Needs you does), and the dot keeps that fact as its word
export function calmOnce<O extends { glance?: GlanceOpts }>(opts: O, oneLine: boolean): O {
  const g = opts.glance
  return g === undefined || !oneLine || !g.isOpen || g.dot !== 'neutral' || g.back !== undefined || g.value === '' ? opts : { ...opts, glance: { ...g, value: '', word: g.word ?? g.value } }
}
const CALM_ONCE: readonly LineCardId[] = ['ship', 'preview', 'setup', 'skills', 'proof', 'back', 'do']
const rowsIn = (groups: LineGroup[]): number => groups.reduce((n, g) => n + g.rows.length + (g.fold === undefined ? 0 : 1), 0)
// Safety at Full outside Glance says its state first, as Short does ("All clear"): no Glance row above says it
const stateFirst = (c: PaneCtx, id: LineCardId): boolean => id === 'safety' && c.glanceOf === undefined
const factsOf = (c: PaneCtx, id: LineCardId, v: ReturnType<typeof lineCard>): Drawn[] => {
  const { Text } = c.el
  // A card with no rows says its short line, never a blank card
  return v.groups !== undefined && v.groups.length > 0
    ? c.glanceOf !== undefined && (id === 'skills' || id === 'setup') ? groupsTidy(c, id, v.groups) : groupsView(c, id, id === 'guard' ? notTwice(c, id, v.groups) : id === 'ship' ? shipNotTwice(c, v.groups) : v.groups)
    : v.lines.flatMap((l, n) => whatLine(c, `${id}:${n}`, <Text key={`${id}-${n}`} {...(n === 0 ? {} : { dimColor: true })}>{tr(l)}</Text>, v.whats[n]))
}

export function LineCard(c: PaneCtx, m: LinesModel, id: LineCardId, grow: boolean) {
  const { el, prefs } = c
  const { Box, Text } = el
  const d = prefs.cardDetail[id]
  const v = m.card(id)
  const finding = el.Input !== undefined && findWords(skillFind.query).length > 0
  if (id === 'setup' && !setupApplyOn(prefs.values)) return Card(el, id, v.title, '', <Box flexDirection="column">{setupOff(c)}</Box>, calmOnce({ grow, ...moreOf(c, id, true) }, true))
  const oneLine = CALM_ONCE.includes(id) && (d !== 'explained' || v.groups === undefined || rowsIn(v.groups) <= 1) && (v.pointer ?? []).length === 0
  return Card(
    el,
    id,
    v.title,
    d === 'explained' && c.glanceOf === undefined ? v.blurb : '',
    d !== 'explained' ? (
      <Box flexDirection="column">{whatLine(c, `${id}:short`, <Text>{tr(v.short)}</Text>, v.shortWhat)}</Box>
    ) : (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {stateFirst(c, id) ? whatLine(c, `${id}:state`, <Text>{tr(v.short)}</Text>, v.shortWhat) : null}
        {id === 'skills' && finding ? null : factsOf(c, id, v)}
        {id === 'skills' ? skillSearch(c, finding) : null}
        {id === 'skills' && finding ? skillMatches(c) : null}
        {(v.pointer ?? []).map(to => pointerTo(c, to.card as CardId, to.word))}
        {id === 'context' ? pointerTo(c, 'here', 'This session') : null}
      </Box>
    ),
    calmOnce({ grow, ...moreOf(c, id), ...(id === 'setup' && d === 'explained' ? { pick: setupPick(c) } : {}) }, oneLine),
  )
}
