// The Safety card: halt, undo and what the guard stopped, as words and rows.
import { SAFETY_BLURB, SAFETY_CLEAR, SAFETY_HALT, SAFETY_HALTED, SAFETY_HALT_ALL, SAFETY_HEAD_STOP, SAFETY_HEAD_TODAY, SAFETY_HEAD_UNDO, SAFETY_NONE, SAFETY_PREVIEW, SAFETY_RESUME, SAFETY_STEP_MANY, SAFETY_STEP_ONE, SAFETY_TITLE, SAFETY_TYPE_THIS, SAFETY_UNDO_NONE, SAFETY_UNDO_PREVIEW_MANY, SAFETY_UNDO_PREVIEW_ONE, SAFETY_WARNED_MANY, SAFETY_WARNED_ONE, UNDO_VS_APP } from './safetywords'
import { SHIP_HELD_MANY, SHIP_HELD_ONE } from './shipwords'
import type { WhatIs } from './whatis'
import { fillIn } from './fillin'
import { fmt } from './fmt'
import { langNow } from '../i18n/t'
import type { Lang } from '../i18n/types'

export type Checkpoint = { name: string; at: number; files: number }
export type SafetyDo = { do: 'halt' } | { do: 'resume' } | { do: 'undoLast' } | { do: 'undoNamed'; name: string }
export type SafetyFacts = { now: number; halted: boolean; haltWhat?: WhatIs; held: number; warned: number; heldWhat: WhatIs; warnedWhat: WhatIs; undoFiles: number; checkpoints: Checkpoint[]; preview?: string[]; previewOf?: string }

export const SAFETY_CHECKPOINTS = 3
const fill = (s: string, n: number): string => s.replace('{n}', String(n))
const times = (n: number, t: (s: string) => string): string => (n === 1 ? t(SAFETY_STEP_ONE) : fill(t(SAFETY_STEP_MANY), n))

export const SAFETY_MEANS = 'The safety controls in one place: pause commands, edits, tools and agents, put back the edits since your last message, go back to a saved point you named, and which risky steps were stopped or warned about today. It only shows what vaken already keeps.'
const SAFETY_NEXT = '/vaken-pause, /vaken-undo, /vaken-undo checkpoint <name> and /vaken-guard do the same in the session. Name the present state with /vaken-undo checkpoint <name>.'
const HALT_MEANS = 'Pause this session stops shell commands, file edits, tools from other apps, agents, web fetches and skills in this session. Reading still works. A step that is already running keeps running.'

export const safetyLoud = (f: { halted: boolean; heldRecently: boolean }): 'halted' | 'held' | 'none' => (f.halted ? 'halted' : f.heldRecently ? 'held' : 'none')

export const safetyShort = (f: Pick<SafetyFacts, 'halted' | 'held'>, t: (s: string) => string): string =>
  f.halted ? t(SAFETY_HALTED) : f.held > 0 ? fill(t(f.held === 1 ? SHIP_HELD_ONE : SHIP_HELD_MANY), f.held) : t(SAFETY_CLEAR)

// A checkpoint's age says "ago" the one way every age does ("2 h ago", "just now")
const agoOf = (ms: number, lang: Lang): string => fmt.ago(Math.max(0, ms), 'days', lang)

// The host does not let a mod run its own command or fill the chat box, so the person copies the restore line.
export const UNDO_LAST_YES = '/vaken-undo last yes'
const NOTHING_WOULD = 'Nothing would change.'
// The preview as the card says it: each thing once. Its own title, the blank line and the closing "Nothing was changed" go (the row, the
// copy line and "What you can do" say them); `none` when no file can be put back.
export const previewBody = (preview: string[]): { lines: string[]; none: boolean } => ({
  // en-only: the preview's own English lines, matched to leave them out, never shown
  lines: preview.filter(l => !l.startsWith('Preview of ') && !l.startsWith('Nothing was changed') && l !== NOTHING_WOULD && l.trim() !== ''),
  none: preview.includes(NOTHING_WOULD),
})
const undoWhat = (preview: string[] | undefined, t: (s: string) => string): WhatIs => {
  const means = 'Before a step changes a file, vaken keeps a copy. Undo puts back every file changed since your last message.'
  if (preview === undefined) return { means, facts: [t(UNDO_VS_APP)], next: 'To put them back, type /vaken-undo last yes in the session. Nothing changes before that.' }
  const body = previewBody(preview)
  return body.none ? { means, facts: [...body.lines, t(UNDO_VS_APP)] } : { means, facts: [...body.lines, t(UNDO_VS_APP), t(SAFETY_TYPE_THIS), UNDO_LAST_YES], next: 'Nothing changes before you type it.' }
}
const checkpointWhat = (c: Checkpoint, preview: string[] | undefined, t: (s: string) => string): WhatIs => {
  const body = preview === undefined ? undefined : previewBody(preview)
  return {
    means: fillIn(t(c.files === 1 ? 'The checkpoint "{name}" you named: a copy of one file as it was then.' : 'The checkpoint "{name}" you named: a copy of {n} files as they were then.'), { name: c.name, n: c.files }),
    ...(body === undefined ? {} : { facts: body.lines }),
    ...(body?.none === true ? {} : { next: fillIn(t('To go back to it, type /vaken-undo name {name} yes in the session. Nothing changes before that.'), { name: c.name }) }),
  }
}
export type SafetyGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: SafetyDo }
// `fold`: the checkpoints past SAFETY_CHECKPOINTS wait behind "Show N more", never dropped
export type SafetyGroup = { head: string; rows: SafetyGroupRow[]; fold?: { id: string; shown: number; more: number } }
export type SafetyView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups: SafetyGroup[] }

export function safetyView(f: SafetyFacts | undefined, t: (s: string) => string): SafetyView {
  const facts: SafetyFacts = f ?? { now: 0, halted: false, held: 0, warned: 0, heldWhat: { means: '' }, warnedWhat: { means: '' }, undoFiles: 0, checkpoints: [] }
  const short = safetyShort(facts, t)
  const what: WhatIs = { means: SAFETY_MEANS, ...(short === t(SAFETY_CLEAR) ? {} : { facts: [short] }), next: SAFETY_NEXT, setting: 'cards.safety' }
  const halt: SafetyGroupRow = facts.halted
    ? { key: 'halt', title: t(SAFETY_HALTED), right: t(SAFETY_RESUME), what: facts.haltWhat ?? { means: HALT_MEANS, next: 'Press Resume to continue.', setting: 'cards.safety' }, press: { do: 'resume' } }
    : { key: 'halt', title: t(SAFETY_HALT_ALL), right: t(SAFETY_HALT), what: { means: HALT_MEANS, next: 'Press to pause this session. Press Resume to continue. /vaken-pause does the same in the session.', setting: 'cards.safety' }, press: { do: 'halt' } }
  // The title says what the preview found: when no file can be put back it does not offer a preview of files
  const lastNone = facts.previewOf === 'last' && facts.preview !== undefined && previewBody(facts.preview).none
  const undo: SafetyGroupRow[] = [
    ...(facts.undoFiles > 0 ? [{ key: 'undo-last', title: lastNone ? t(SAFETY_UNDO_NONE) : facts.undoFiles === 1 ? t(SAFETY_UNDO_PREVIEW_ONE) : fill(t(SAFETY_UNDO_PREVIEW_MANY), facts.undoFiles), what: undoWhat(facts.previewOf === 'last' ? facts.preview : undefined, t), press: { do: 'undoLast' } } as SafetyGroupRow] : []),
    ...facts.checkpoints.map((c): SafetyGroupRow => ({
      key: `cp-${c.name}`,
      title: c.name,
      right: `${agoOf(facts.now - c.at, langNow())} · ${t(SAFETY_PREVIEW)}`,
      what: checkpointWhat(c, facts.previewOf === c.name ? facts.preview : undefined, t),
      press: { do: 'undoNamed', name: c.name },
    })),
  ]
  // Said the way the Short look says it ("6 steps stopped today"); calm is quiet, so a count of none is no row
  const today: SafetyGroupRow[] = [
    ...(facts.held === 0 ? [] : [{ key: 'stopped', title: fill(t(facts.held === 1 ? SHIP_HELD_ONE : SHIP_HELD_MANY), facts.held), what: facts.heldWhat }]),
    ...(facts.warned === 0 ? [] : [{ key: 'warned', title: fill(t(facts.warned === 1 ? SAFETY_WARNED_ONE : SAFETY_WARNED_MANY), facts.warned), what: facts.warnedWhat }]),
  ]
  const shownUndo = (facts.undoFiles > 0 ? 1 : 0) + SAFETY_CHECKPOINTS
  const groups: SafetyGroup[] = [
    { head: t(SAFETY_HEAD_STOP), rows: [halt] },
    ...(undo.length === 0 ? [] : [{ head: t(SAFETY_HEAD_UNDO), rows: undo, ...(undo.length > shownUndo + 1 ? { fold: { id: 'checkpoints', shown: shownUndo, more: undo.length - shownUndo } } : {}) }]),
    ...(today.length === 0 ? [] : [{ head: t(SAFETY_HEAD_TODAY), rows: today }]),
  ]
  const rows = groups.flatMap(g => g.rows)
  return {
    title: SAFETY_TITLE,
    blurb: t(SAFETY_BLURB),
    short,
    lines: [short, ...rows.map(r => (r.right === undefined ? r.title : `${r.title}: ${r.right}`))],
    whats: [what, ...rows.map(r => r.what)],
    shortWhat: what,
    groups,
  }
}

export function safetyCardText(f: SafetyFacts | undefined): string[] {
  if (f === undefined) return []
  const id = (s: string): string => s
  return [
    `Safety: ${safetyShort(f, id)} · /vaken-pause status`,
    ...(f.undoFiles > 0 ? [`Preview undo (${f.undoFiles === 1 ? '1 file' : `${f.undoFiles} files`}) · /vaken-undo last`] : []),
    ...f.checkpoints.map(c => `Checkpoint ${c.name}: ${agoOf(f.now - c.at, 'en')} · /vaken-undo name ${c.name}`),
    `Risky steps today: ${f.held === 0 ? id(SAFETY_NONE) : times(f.held, id)} stopped, ${f.warned === 0 ? id(SAFETY_NONE) : times(f.warned, id)} warned · /vaken-guard`,
  ]
}
