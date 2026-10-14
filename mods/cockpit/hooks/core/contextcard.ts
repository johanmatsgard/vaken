// The Memory and notes card: what the chat starts from and what a handoff or compaction would carry. Pure words and rows.
import { restLines } from './compactrest'
import { dietWords } from './diet'
import type { RestVerdict } from './compactrest'
import {
  CONTEXT_BLURB, CONTEXT_BRIEF, CONTEXT_BRIEF_NONE, CONTEXT_BRIEF_OFF, CONTEXT_BRIEF_READY, CONTEXT_BRIEF_UNVERIFIED, CONTEXT_FILES, CONTEXT_GOOD_MOMENT, CONTEXT_HEAD_HANDOFF, CONTEXT_HEAD_INSTRUCTIONS,
  CONTEXT_HEAD_MEMORY, CONTEXT_HEAVY, CONTEXT_KEEP, CONTEXT_LEAN, CONTEXT_LINE_MANY, CONTEXT_LINE_ONE, CONTEXT_NOTES, CONTEXT_NOTES_NONE, CONTEXT_NOTE_MANY, CONTEXT_NOTE_ONE, CONTEXT_REPEATED_MANY,
  CONTEXT_REPEATED_ONE, CONTEXT_REPEATS, CONTEXT_TITLE, CONTEXT_TOKENS, CONTEXT_TOKENS_HEAVY,
} from './contextwords'
import type { WhatIs } from './whatis'
import { tEn } from '../i18n/t'

export type DietFacts = { files: number; size: string; heavy: boolean; repeats: number; first?: string; lines: string[]; advice: string[] }
export type ContextFacts = {
  diet?: DietFacts
  memory?: { notes: number }
  brief: { on: boolean; work: boolean; unverified: number; preview?: string[] }
  keep: { goal?: string; session?: string; branch?: string; files: number; rest?: RestVerdict }
}
export type ContextDo = { do: 'brief' }
export type ContextGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: ContextDo }
export type ContextView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups: { head: string; rows: ContextGroupRow[] }[] }

const fill = (s: string, n: number | string, key = 'n'): string => s.replace(`{${key}}`, String(n))
const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export const CONTEXT_MEANS = 'What the session starts from and what would be carried on: the CLAUDE.md files Claude re-reads every answer, the notes it keeps about this project, the note for the next session and what a compaction keeps. A token is a small piece of text, about three quarters of a word. A token is a small piece of text, about three quarters of a word. It only shows what vaken already knows.'
const CONTEXT_NEXT = '/vaken-help run diet, /vaken-memory, /vaken-help run brief and /vaken-compact say more in the session. The size of the session itself is on the This session card.'
const KEEP_MORE = 'A failed step and a step the safety check stopped are added when there is one.'

export const contextLoud = (f: ContextFacts | undefined): 'heavy' | 'unverified' | 'none' =>
  f === undefined ? 'none' : f.diet?.heavy === true ? 'heavy' : f.brief.on && f.brief.work && f.brief.unverified > 0 ? 'unverified' : 'none'

export function keepItems(k: ContextFacts['keep'], t: (s: string) => string = s => s): string[] {
  return [
    ...(k.goal === undefined || k.goal === '' ? [] : [fill(t('Goal: {goal}'), cut(k.goal, 60), 'goal')]),
    ...(k.session === undefined || k.session === '' ? [] : [fill(t('Session: {session}'), cut(k.session, 60), 'session')]),
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
  return parts.length === 0 ? t(CONTEXT_LEAN) : parts.join(' · ')
}

const keepRight = (k: ContextFacts['keep'], t: (s: string) => string): { right?: string } => {
  const parts = [...(k.files > 0 ? [fill(t(k.files === 1 ? '1 file changed' : '{n} files changed'), k.files)] : []), ...(k.rest === undefined ? [] : [t(k.rest.ready ? 'a good moment' : 'not yet')])]
  return parts.length === 0 ? {} : { right: parts.join(' · ') }
}

export function contextView(f: ContextFacts | undefined, t: (s: string) => string): ContextView {
  const facts: ContextFacts = f ?? { brief: { on: true, work: false, unverified: 0 }, keep: { files: 0 } }
  const short = contextShort(facts, t)
  const what: WhatIs = { means: CONTEXT_MEANS, ...(short === t(CONTEXT_LEAN) ? {} : { facts: [short] }), next: CONTEXT_NEXT, setting: 'cards.context' }
  const d = facts.diet
  const instructions: ContextGroupRow[] =
    d === undefined || d.files === 0
      ? []
      : [
          {
            key: 'files',
            title: t(CONTEXT_FILES),
            right: fill(t(d.heavy ? CONTEXT_TOKENS_HEAVY : CONTEXT_TOKENS), d.size),
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
  const briefRow: ContextGroupRow = {
    key: 'brief',
    title: t(CONTEXT_BRIEF),
    right: !b.on ? t(CONTEXT_BRIEF_OFF) : !b.work ? t(CONTEXT_BRIEF_NONE) : b.unverified > 0 ? fill(t(CONTEXT_BRIEF_UNVERIFIED), b.unverified) : t(CONTEXT_BRIEF_READY),
    what: {
      means: 'What the next session needs: goal, branch, changed files, checks and open questions. Each line says whether git or a check backs it (verified) or nothing does yet (unverified).',
      ...(b.preview === undefined ? {} : { facts: b.preview }),
      next: !b.on ? 'Handoff notes are off. Turn them on: Settings > Prompts and memory.' : !b.work ? 'Nothing has changed or been checked in this session yet.' : '/vaken-help run brief prints it for pasting into a new session. /vaken-help run packet saves it as a file in the project.',
      setting: 'brief.mode',
    },
    ...(b.on && b.work ? { press: { do: 'brief' } as ContextDo } : {}),
  }
  const k = facts.keep
  const items = keepItems(k, t)
  const keepRow: ContextGroupRow = {
    key: 'keep',
    title: t(CONTEXT_KEEP),
    ...keepRight(k, t),
    what: {
      means: 'What the summary keeps when the session is compacted, added to every compaction by vaken.',
      facts: [...items, KEEP_MORE, ...(k.rest === undefined ? [] : [`${t('Compact when idle, last look:')} ${t(k.rest.ready ? 'a good moment' : 'not yet')}.`, ...restLines(k.rest.checks, t)])],
      next: '/vaken-compact says whether now is a good moment, and a line to paste after /compact.',
      setting: 'compact.mode',
    },
  }
  const groups = [
    ...(instructions.length === 0 ? [] : [{ head: t(CONTEXT_HEAD_INSTRUCTIONS), rows: instructions }]),
    ...(memory.length === 0 ? [] : [{ head: t(CONTEXT_HEAD_MEMORY), rows: memory }]),
    { head: t(CONTEXT_HEAD_HANDOFF), rows: [briefRow, keepRow] },
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
  const v = contextView(f, id)
  const row = (key: string): ContextGroupRow | undefined => v.groups.flatMap(g => g.rows).find(r => r.key === key)
  return [
    `Memory and notes: ${v.short} · /vaken-help run diet`,
    ...(d === undefined || d.files === 0 ? [] : [`Instructions: ${tEn('words.file', { n: d.files })}, ${row('files')?.right ?? ''}${d.repeats > 0 ? `, ${row('repeats')?.right ?? ''} in more than one file` : ''} · /vaken-help run diet`]),
    ...(f.memory === undefined ? [] : [`Memory: ${row('notes')?.right ?? ''} · /vaken-memory`]),
    `Note for the next session: ${(row('brief')?.right ?? '').replace(' · See first', '')} · /vaken-help run brief`,
    `Kept when compacted${row('keep')?.right === undefined ? '' : `: ${row('keep')?.right}`} · /vaken-compact`,
  ]
}
