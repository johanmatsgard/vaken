// Line cards (Proof, Guard, Skills, Pull requests, Ship, Where was I, Safety, Context health and Preview): a short list of plain lines or grouped rows each
import { capMaxOf } from '../../../core/agentcap'
import { tr } from '../../../core/lang'
import { findCommands, findDescription, findRight, findWords } from '../../../core/skills'
import { Card, GroupBreak, MoreRow, OpenLine, SwitchRow, vstep } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { BODY_ROW_GAP, LIST_SHOW } from '../../../ui/tokens'
import { backFactsOf } from '../back'
import { safetyFactsOf } from '../safety'
import { contextFactsOf } from '../context'
import { previewFactsOf } from '../preview'
import { setupFactsOf } from '../setup'
import { doFactsOf } from '../dorow'
import { parseScope } from '../../../core/setupcard'
import { SETUP_APPLY_LABEL, SETUP_APPLY_NOTE, SETUP_WHERE_ALL, SETUP_WHERE_PROJECT, SETUP_WHERE_SESSION } from '../../../core/setupwords'
import { lineCard } from '../linecards'
import type { CardCtx } from '../linecards'
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
  views: Record<LineCardId, ReturnType<typeof lineCard>>
}

export function linesModel(view: View, prefs: Prefs): LinesModel {
  const load = { running: (prefs.agents ?? []).filter(r => r.state === 'running').length, max: capMaxOf(prefs.values['cap.max']), capOn: (prefs.values['cap.mode'] ?? 'warn') !== 'off' }
  const ctx: CardCtx = { ...(prefs.guardWarn === undefined ? {} : { guardWarn: prefs.guardWarn }), now: view.now ?? 0, ledger: prefs.ledger, ...(view.counts === undefined ? {} : { counts: view.counts }), proof: prefs.proof, halted: prefs.halted, modes: prefs.values, agents: prefs.agents, computer: { laptop: prefs.laptop, load }, ...(prefs.skills === undefined ? {} : { skills: prefs.skills }), t: tr, ...(prefs.prs === undefined ? {} : { prs: prefs.prs }), ...(prefs.shipShown === undefined ? {} : { shipShown: prefs.shipShown }), back: backFactsOf(view, prefs), safety: safetyFactsOf(prefs), homes: { ship: !prefs.hidden.includes('ship') && prefs.autoHidden?.includes('ship') !== true, prs: !prefs.hidden.includes('prs') && prefs.autoHidden?.includes('prs') !== true }, context: contextFactsOf(view, prefs), preview: previewFactsOf(prefs), setup: setupFactsOf(prefs), doc: doFactsOf(prefs) }
  const views = {} as Record<LineCardId, ReturnType<typeof lineCard>>
  for (const id of LINE_CARD_IDS) {
    let built: ReturnType<typeof lineCard> | undefined
    Object.defineProperty(views, id, {
      enumerable: true,
      get: () => {
        if (built === undefined) {
          viewBuilds += 1
          built = lineCard(id, ctx)
        }
        return built
      },
    })
  }
  return { load, ctx, views }
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

// Choosing a place also sets the Roles card's place, so the roles written match it.
const setupSwitch = (c: PaneCtx): Drawn => {
  const on = c.prefs.values['setup.apply'] === 'on'
  return SwitchRow(c.el, 'setup-apply', SETUP_APPLY_LABEL, SETUP_APPLY_NOTE, on, on ? 'off' : 'on', () => c.act.setSetting('setup.apply', on ? 'off' : 'on'), c.widthPt)
}
const setupPick = (c: PaneCtx) => ({
  key: 'setup-scope',
  options: [
    { value: 'all', label: SETUP_WHERE_ALL },
    { value: 'project', label: SETUP_WHERE_PROJECT },
    { value: 'session', label: SETUP_WHERE_SESSION },
  ],
  value: parseScope(c.prefs.values['setup.scope']),
  onPick: (v: string) => {
    c.act.setSetting('setup.scope', v)
    c.act.setRolesScope(v === 'session' ? 'session' : v === 'project' && c.prefs.project !== undefined ? 'project' : 'all')
  },
})

const factsOf = (c: PaneCtx, id: LineCardId, v: ReturnType<typeof lineCard>): Drawn[] => {
  const { Text } = c.el
  return v.groups !== undefined
    ? c.glanceOf !== undefined && (id === 'skills' || id === 'setup') ? groupsTidy(c, id, v.groups) : groupsView(c, id, v.groups)
    : v.lines.flatMap((l, n) => whatLine(c, `${id}:${n}`, <Text key={`${id}-${n}`} {...(n === 0 ? {} : { dimColor: true })}>{tr(l)}</Text>, v.whats[n]))
}

export function LineCard(c: PaneCtx, m: LinesModel, id: LineCardId, grow: boolean) {
  const { el, prefs } = c
  const { Box, Text } = el
  const d = prefs.cardDetail[id]
  const v = m.views[id]
  const finding = el.Input !== undefined && findWords(skillFind.query).length > 0
  return Card(
    el,
    id,
    v.title,
    d === 'explained' && c.glanceOf === undefined ? v.blurb : '',
    d !== 'explained' ? (
      <Box flexDirection="column">{whatLine(c, `${id}:short`, <Text>{tr(v.short)}</Text>, v.shortWhat)}</Box>
    ) : (
      <Box flexDirection="column" rowGap={vstep(BODY_ROW_GAP)}>
        {id === 'skills' && finding ? null : factsOf(c, id, v)}
        {id === 'skills' ? skillSearch(c, finding) : null}
        {id === 'skills' && finding ? skillMatches(c) : null}
        {id === 'setup' ? GroupBreak(c.el, 'setup-br-apply', c.widthPt, undefined, true) : null}
        {id === 'setup' ? setupSwitch(c) : null}
        {v.pointer === undefined ? null : pointerTo(c, v.pointer.card as CardId, v.pointer.word)}
        {id === 'context' ? pointerTo(c, 'here', 'This session') : null}
      </Box>
    ),
    { grow, ...moreOf(c, id), ...(id === 'setup' && d === 'explained' ? { pick: setupPick(c) } : {}) },
  )
}
