// The Memory and notes card: what the chat starts from and what a handoff or compaction would carry. Pure words and rows.
import { restLines } from './compactrest'
import { dietWords } from './diet'
import type { RestVerdict } from './compactrest'
import { shortText } from './band'
import { fmt } from './fmt'
import { SMALL_TOKENS } from './diet'
import {
  CONTEXT_BLURB, CONTEXT_BRIEF, CONTEXT_BRIEF_NONE, CONTEXT_BRIEF_OFF, CONTEXT_BRIEF_READY, CONTEXT_BRIEF_UNVERIFIED, CONTEXT_BRIEF_UNVERIFIED_ONE, CONTEXT_FILES, CONTEXT_GOOD_MOMENT, CONTEXT_HEAD_HANDOFF, CONTEXT_HEAD_INSTRUCTIONS,
  CONTEXT_HEAD_MEMORY, CONTEXT_HEAVY, CONTEXT_KEEP, CONTEXT_LEAN, CONTEXT_LINE_MANY, CONTEXT_NO_FILE, CONTEXT_UNREAD, CONTEXT_SMALL_SIZE, CONTEXT_LINE_ONE, CONTEXT_MARK_CHECKED, CONTEXT_MARK_UNCHECKED, CONTEXT_NOTES, CONTEXT_NOTES_NONE, CONTEXT_NOTE_MANY, CONTEXT_NOTE_ONE, CONTEXT_REPEATED_MANY,
  CONTEXT_REPEATED_ONE, CONTEXT_REPEATS, CONTEXT_TITLE, CONTEXT_TOKENS, CONTEXT_TOKENS_HEAVY,
} from './contextwords'
import type { WhatIs } from './whatis'
import { rulesRows } from './rulesrows'
import type { RulesFacts } from './rulesrows'
import { langNow, tEn } from '../i18n/t'
import type { Lang } from '../i18n/types'

// `tokens` is the number; it is said in the reader's number style when drawn
export type DietFacts = { files: number; tokens: number; heavy: boolean; repeats: number; first?: string; lines: string[]; advice: string[] }
// `now`: the draw's time, for the age of the compact verdict's row
export type ContextFacts = {
  now?: number
  diet?: DietFacts
  memory?: { notes: number }
  // `marks`: each line of the note and whether git or a check backs it (the press on the row reads them)
  brief: { on: boolean; work: boolean; unverified: number; marks?: BriefMark[] }
  keep: { goal?: string; session?: string; branch?: string; files: number; rest?: RestVerdict }
  // Rules in force (core/rulesrows.ts): names and counts only
  rules?: RulesFacts
}
export type ContextDo = { do: 'brief' }
// `fixed`: a line no check can ever back (your goal, Claude's own list): shown with no mark and never counted
export type BriefMark = { topic: string; ok: boolean; fixed?: boolean }
// The one count of the note row and of its opened marks: the lines a check could back and none does yet
export const uncheckedOf = (marks: readonly BriefMark[]): number => marks.filter(m => !m.ok && m.fixed !== true).length
// The note's line for the last answer's claims (core/continuity.ts briefClaims)
export const CLAIMS_TOPIC = 'Claims in the last answer'
// `marks`: fact rows drawn under the row's "What it means" when it opens
export type ContextGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: ContextDo; marks?: { label: string; value: string }[] }
export type ContextView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups: { head: string; rows: ContextGroupRow[] }[] }

const fill = (s: string, n: number | string, key = 'n'): string => s.replace(`{${key}}`, String(n))
// A quoted session title is cut at a space with "…", never inside a word; the goal is a sentence and is never cut (it wraps)
const QUOTE_MAX = 60

export const CONTEXT_MEANS = 'What the session starts from and what would be carried on: the CLAUDE.md files Claude re-reads every answer, the notes it keeps about this project, the note for the next session and what a compaction keeps. A token is a small piece of text, about three quarters of a word. It only shows what vaken already knows.'
const CONTEXT_NEXT = '/vaken-help run diet, /vaken-memory, /vaken-help run brief and /vaken-compact say more in the session. The size of the session itself is on the This session card.'
const KEEP_MORE = 'A failed step and a step the safety check stopped are added when there is one.'
const REST_MEANS = '/vaken-compact says whether now is a good moment, and a line to paste after /compact.'
const BRIEF_MEANS = 'What the next session needs: goal, branch, changed files, checks and open questions. Each line says whether git or a check backs it (checked) or nothing does yet (not checked).'

export const contextLoud = (f: ContextFacts | undefined): 'heavy' | 'unverified' | 'none' =>
  f === undefined ? 'none' : f.diet?.heavy === true ? 'heavy' : f.brief.on && f.brief.work && f.brief.unverified > 0 ? 'unverified' : 'none'

export function keepItems(k: ContextFacts['keep'], t: (s: string) => string = s => s): string[] {
  return [
    ...(k.goal === undefined || k.goal === '' ? [] : [fill(t('Goal: {goal}'), k.goal, 'goal')]),
    ...(k.session === undefined || k.session === '' ? [] : [fill(t('Session: {session}'), shortText(k.session, QUOTE_MAX), 'session')]),
    ...(k.branch === undefined || k.branch === '' ? [] : [fill(t('Branch: {branch}'), k.branch, 'branch')]),
    k.files > 0 ? fill(t(k.files === 1 ? '1 file changed' : '{n} files changed'), k.files) : t('The files changed'),
    t('Decisions made and why'),
    t('The next steps'),
  ]
}

export function contextShort(f: ContextFacts, t: (s: string) => string): string {
  const d = f.diet
  const parts = [
    ...(d?.heavy === true ? [t(CONTEXT_HEAVY)] : []),
    ...(d !== undefined && d.repeats > 0 ? [fill(t(d.repeats === 1 ? CONTEXT_REPEATED_ONE : CONTEXT_REPEATED_MANY), d.repeats)] : []),
    ...(f.keep.rest?.ready === true ? [t(CONTEXT_GOOD_MOMENT)] : []),
  ]
  return parts.length > 0 ? parts.join(' · ') : d === undefined ? t(CONTEXT_UNREAD) : d.files === 0 ? t(CONTEXT_NO_FILE) : t(CONTEXT_LEAN)
}

export function contextView(f: ContextFacts | undefined, t: (s: string) => string, lang: Lang = langNow()): ContextView {
  const facts: ContextFacts = f ?? { brief: { on: true, work: false, unverified: 0 }, keep: { files: 0 } }
  const short = contextShort(facts, t)
  const what: WhatIs = { means: CONTEXT_MEANS, ...(short === t(CONTEXT_LEAN) || short === t(CONTEXT_NO_FILE) || short === t(CONTEXT_UNREAD) ? {} : { facts: [short] }), next: CONTEXT_NEXT, setting: 'cards.context' }
  const d = facts.diet
  const instructions: ContextGroupRow[] =
    d === undefined || d.files === 0
      ? []
      : [
          {
            key: 'files',
            title: t(CONTEXT_FILES),
            // Under SMALL_TOKENS the size is the word "small", not "about 9 tokens"
            right: !d.heavy && d.tokens < SMALL_TOKENS ? t(CONTEXT_SMALL_SIZE) : fill(t(d.heavy ? CONTEXT_TOKENS_HEAVY : CONTEXT_TOKENS), fmt.tokensFine(d.tokens, lang)),
            what: { means: 'Claude reads these files at the start of every session and keeps them in mind on every answer, so a big one costs usage all day. The size counts the instruction files of the session folder, its parents and your home folder, as characters divided by 4; rules files and files they pull in are not counted.', facts: d.lines.map(l => dietWords(l, t)), next: d.advice.length === 0 ? t('They look light. Nothing to trim. /vaken-help run diet has the details.') : `${d.advice.map(a => dietWords(a, t)).join(' ')} ${t('/vaken-help run diet has the details.')}`, setting: 'diet.mode' },
          },
          ...(d.repeats === 0
            ? []
            : [{
                key: 'repeats',
                title: t(CONTEXT_REPEATS),
                right: fill(t(d.repeats === 1 ? CONTEXT_LINE_ONE : CONTEXT_LINE_MANY), d.repeats),
                what: { means: 'The same rule written in more than one file is read twice on every answer.', ...(d.first === undefined ? {} : { facts: [fill(t('First: "{line}"'), d.first, 'line')] }), next: 'Keep each rule in one place. /vaken-help run diet has the details.', setting: 'diet.mode' },
              } as ContextGroupRow]),
        ]
  const memory: ContextGroupRow[] =
    facts.memory === undefined
      ? []
      : [{
          key: 'notes',
          title: t(CONTEXT_NOTES),
          right: facts.memory.notes === 0 ? t(CONTEXT_NOTES_NONE) : fill(t(facts.memory.notes === 1 ? CONTEXT_NOTE_ONE : CONTEXT_NOTE_MANY), facts.memory.notes),
          what: { means: 'Short notes Claude keeps about you and this project in files, so it remembers between sessions. Vaken only reads them.', next: 'To change one, tell Claude "forget the note about ..." or "change the note about ...". /vaken-memory lists them.' },
        }]
  const b = facts.brief
  const k = facts.keep
  // What a compaction keeps is a fixed list: it is said in this row's "What is this", not as a row of its own
  // A ready verdict has its own row (restRow below), so the note's What is this carries the last look only while it is "not yet"
  const kept = [`${t(CONTEXT_KEEP)}:`, ...keepItems(k, t), t(KEEP_MORE), ...(k.rest === undefined || k.rest.ready ? [] : [`${t('Compact when idle, last look:')} ${t('not yet')}.`, ...restLines(k.rest.checks, t)])]
  const briefRow: ContextGroupRow = {
    key: 'brief',
    title: t(CONTEXT_BRIEF),
    right: !b.on ? t(CONTEXT_BRIEF_OFF) : !b.work ? t(CONTEXT_BRIEF_NONE) : b.unverified === 1 ? t(CONTEXT_BRIEF_UNVERIFIED_ONE) : b.unverified > 0 ? fill(t(CONTEXT_BRIEF_UNVERIFIED), b.unverified) : t(CONTEXT_BRIEF_READY),
    what: {
      means: BRIEF_MEANS,
      facts: kept,
      next: !b.on ? 'Handoff notes are off. Turn them on: Settings > Prompts and memory.' : !b.work ? 'Nothing has changed or been checked in this session yet.' : '/vaken-help run brief prints it for pasting into a new session. /vaken-help run packet saves it as a file in the project.',
      setting: 'brief.mode',
    },
    ...(b.on && b.work ? { press: { do: 'brief' } as ContextDo } : {}),
    ...(b.marks === undefined ? {} : { marks: b.marks.map(m => ({ label: t(m.topic), value: m.fixed === true ? '' : t(m.ok ? CONTEXT_MARK_CHECKED : CONTEXT_MARK_UNCHECKED) })) }),
  }
  // The compact verdict is the This session card's; while that card is hidden (keep.rest is set only then) a ready one is a row here, with its age
  const restRow: ContextGroupRow[] =
    k.rest?.ready !== true
      ? []
      : [{
          key: 'rest',
          title: t(CONTEXT_GOOD_MOMENT),
          ...(facts.now === undefined ? {} : { right: fmt.ago(facts.now - k.rest.at, 'days', lang) }),
          what: { means: REST_MEANS, facts: restLines(k.rest.checks, t), setting: 'compact.mode' },
        }]
  const ruled = rulesRows(facts.rules, t)
  const groups = [
    ...(instructions.length + ruled.length === 0 ? [] : [{ head: t(CONTEXT_HEAD_INSTRUCTIONS), rows: [...instructions, ...ruled] }]),
    ...(memory.length === 0 ? [] : [{ head: t(CONTEXT_HEAD_MEMORY), rows: memory }]),
    { head: t(CONTEXT_HEAD_HANDOFF), rows: [...restRow, briefRow] },
  ]
  const rows = groups.flatMap(g => g.rows)
  return {
    title: CONTEXT_TITLE,
    blurb: t(CONTEXT_BLURB),
    short,
    lines: [short, ...rows.map(r => (r.right === undefined ? r.title : `${r.title}: ${r.right}`))],
    whats: [what, ...rows.map(r => r.what)],
    shortWhat: what,
    groups,
  }
}

export function contextCardText(f: ContextFacts | undefined): string[] {
  if (f === undefined) return []
  const id = (s: string): string => s
  const d = f.diet
  const v = contextView(f, id, 'en')
  const row = (key: string): ContextGroupRow | undefined => v.groups.flatMap(g => g.rows).find(r => r.key === key)
  return [
    `Memory and notes: ${v.short} · /vaken-help run diet`,
    ...(d === undefined || d.files === 0 ? [] : [`Instruction files: ${tEn('words.file', { n: d.files })}, ${row('files')?.right ?? ''}${d.repeats > 0 ? `, ${row('repeats')?.right ?? ''} in more than one file` : ''} · /vaken-help run diet`]),
    ...rulesRows(f.rules, id).map(r => (r.right === undefined ? r.title : `${r.title}: ${r.right}`)),
    ...(f.memory === undefined ? [] : [`Memory: ${row('notes')?.right ?? ''} · /vaken-memory`]),
    `Note for the next session: ${row('brief')?.right ?? ''} · /vaken-help run brief`,
  ]
}
