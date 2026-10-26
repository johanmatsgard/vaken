// Same-file warning (core/crew.ts overlapsOf) and teammates that wait (core/agentboard.ts idleRows): calm rows, never amber, that open to say what they mean.
// Other sessions holds the rows with another session; Agents holds the rows of this session's own agents.
import { rowName } from '../../../core/agentboard'
import { isHelperOverlap } from '../../../core/crew'
import type { Overlap } from '../../../core/crew'
import { fillIn } from '../../../core/fillin'
import { tr } from '../../../core/lang'
import { lastPart } from '../../../core/platform'
import { NUDGED_WORD, canNudge } from '../../../core/talk'
import { OpenLine, WhatIsBody, valueBeside, wrappedLines } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { CHEVRON_GAP, CHEVRON_SLOT, LIST_COL_GAP, TEXT_CHAR_PT } from '../../../ui/tokens'
import { sentenceLine, toggle } from '../parts'
import type { PaneCtx } from '../parts'

export const AGENT_NUDGE_WORD = 'Nudge · asks Claude'

const agentName = (c: PaneCtx, id: string | undefined): string => {
  const row = id === undefined ? undefined : (c.prefs.agents ?? []).find(r => r.agentId === id)
  return row === undefined ? tr('an agent') : rowName(row)
}

// A name wider than a whole line is cut at its end ("AVeryLongCompon…"), never broken inside; one that fits is whole
export const fitName = (name: string, roomPt: number): string => {
  const room = Math.floor(roomPt / TEXT_CHAR_PT)
  return name.length <= room ? name : `${name.slice(0, Math.max(0, room - 1))}…`
}
// A path breaks only after a "/" (a zero-width space there), each of its parts whole
export const pathLine = (path: string, roomPt: number): string =>
  path
    .split(/(?<=[/\\])/)
    .map(p => fitName(p, roomPt))
    .join('\u200b')

// The row names the file by its name; the opened row gives its whole path. With no file ("A file changed..."), the name is on its own dim line
const overlapText = (c: PaneCtx, o: Overlap, file?: string): string => {
  if (o.b.session !== undefined) return file === undefined ? fillIn(tr('A file changed here and in {name}'), { name: o.b.session.name }) : fillIn(tr('{file} changed here and in {name}'), { file, name: o.b.session.name })
  const a = agentName(c, o.a.agent)
  const b = agentName(c, o.b.agent)
  return file === undefined ? fillIn(tr('A file changed by two agents: {a} and {b}'), { a, b }) : fillIn(tr('{file} changed by two agents: {a} and {b}'), { file, a, b })
}

// The row: the sentence with the file's name, or, when the name alone is wider than the line, the sentence and the name on a dim line under it
const overlapRow = (c: PaneCtx, key: string, o: Overlap, isOpen: boolean): Drawn => {
  const { Box, Text } = c.el
  const file = lastPart(o.path) || o.path
  const roomPt = c.widthPt - CHEVRON_SLOT - CHEVRON_GAP
  if (file.length * TEXT_CHAR_PT <= roomPt) return sentenceLine(c, `ol-${key}`, overlapText(c, o, file), '', isOpen, toggle(c, key))
  const text = overlapText(c, o)
  const content = (
    <Box key={`ol-${key}-words`} flexDirection="column">
      <Text>{text}</Text>
      <Text dimColor>{fitName(file, roomPt)}</Text>
    </Box>
  )
  return OpenLine(c.el, `ol-${key}`, content, isOpen, toggle(c, key), { widthPt: c.widthPt, lines: wrappedLines(text, c.widthPt) + 1, tall: true })
}

// `helpers`: true for the Agents card (two agents of this session), false for Other sessions
export function OverlapLines(c: PaneCtx, helpers: boolean): Drawn[] {
  return (c.prefs.overlaps ?? [])
    .filter(o => isHelperOverlap(o) === helpers)
    .flatMap(o => {
      const key = `overlap:${o.path}|${o.b.session?.id ?? 'agents'}`
      const isOpen = c.prefs.open === key
      return [
        overlapRow(c, key, o, isOpen),
        isOpen ? WhatIsBody(c.el, `w-${key}`, [fillIn(tr('File: {path}'), { path: pathLine(o.path, c.widthPt - LIST_COL_GAP) }), tr('Both changed this file in the last 10 minutes. Nothing is stopped. Read the file again before you go on, so one change does not undo the other.')]) : null,
      ]
    })
}

// One calm row per teammate that has waited a while; its press asks Claude to give it its next step
export function IdleLines(c: PaneCtx): Drawn[] {
  const talk = c.act.talk
  if (talk === undefined) return []
  const now = c.view.now ?? 0
  const lines = (c.prefs.idle ?? []).map(r => ({ r, text: fillIn(tr('The agent {name} has waited {n} min for a message'), { name: r.name, n: r.min }), word: tr(canNudge(`agent:${r.id}`, now) ? AGENT_NUDGE_WORD : NUDGED_WORD) }))
  // The rows behave as one: the press word is beside each sentence only when it fits beside every one
  const under = lines.some(l => !valueBeside(l.text, l.word, c.widthPt))
  return lines.map(({ r, text, word }) => sentenceLine(c, `ol-idle:${r.id}`, text, word, false, () => talk.nudgeAgent(r.id, r.name, r.min), under))
}
