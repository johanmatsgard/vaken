// Compact check: the keep-list learns from vaken's own records (the goal's key words, the files edited, the checks failing now), and after a compaction each item is
// looked for in the summary. The summary is read in memory only and never kept: the store holds the two counts, this process the items left out. Pure.
import { keepWords } from './compactmoment'
import { fillIn } from './fillin'
import { lastName } from './platform'
import { PROOF_KINDS, kindWord, statusOf } from './proof'
import type { ProofKind, ProofState } from './proof'

export type KeepItem = { kind: 'goal'; name: string } | { kind: 'file'; name: string } | { kind: 'check'; name: ProofKind }
// What one compaction left out, for this session only (in memory): the This session card's line and its Tell Claude again press read it
export type KeepCheck = { sid: string; at: number; total: number; missing: KeepItem[] }

// The newest edited files the summary is asked to name: a long list would crowd the summary itself
export const KEEP_FILES_MAX = 6
// How long the line stays on This session after the compaction
export const KEEP_SHOW_MS = 30 * 60_000
// A goal counts as kept when this share of its longer words is in the summary
const GOAL_SHARE = 0.5
const GOAL_WORD_MIN = 4

export const failingKinds = (s: ProofState | undefined): ProofKind[] => (s === undefined ? [] : PROOF_KINDS.filter(k => statusOf(s, k) === 'failed'))

// Newest first, one entry per file name
export function editedNames(paths: readonly string[]): string[] {
  const out: string[] = []
  for (const p of paths) {
    const name = lastName(p)
    if (name !== '' && !out.includes(name)) out.push(name)
  }
  return out.slice(0, KEEP_FILES_MAX)
}

export function keepListItems(o: { goal?: string; edited: readonly string[]; failing: readonly ProofKind[] }): KeepItem[] {
  const goal = o.goal === undefined ? '' : keepWords(o.goal)
  return [...(goal === '' ? [] : [{ kind: 'goal', name: goal } as KeepItem]), ...editedNames(o.edited).map((name): KeepItem => ({ kind: 'file', name })), ...o.failing.map((name): KeepItem => ({ kind: 'check', name }))]
}

// Sent to Claude's summarizer, so English. `goalSaid`: the goal is already in the keep-list's first line (the session's title)
export function learnedLines(items: readonly KeepItem[], goalSaid: boolean): string[] {
  const goal = items.find(x => x.kind === 'goal')
  const files = items.filter(x => x.kind === 'file').map(x => x.name)
  const checks = items.filter((x): x is Extract<KeepItem, { kind: 'check' }> => x.kind === 'check').map(x => kindWord(x.name))
  return [
    ...(goal === undefined || goalSaid ? [] : [`Keep the goal in its own words: ${goal.name}.`]), // en-only: sent to Claude
    ...(files.length === 0 ? [] : [`Name each file edited in this session: ${files.join(', ')}.`]), // en-only: sent to Claude
    ...(checks.length === 0 ? [] : [`Say which checks fail now: ${checks.join(', ')}.`]), // en-only: sent to Claude
  ]
}

const CHECK_SIGNS: Record<ProofKind, RegExp> = { tests: /\btests?\b/, build: /\bbuild/, lint: /\blint/, types: /\btype ?check|\btypes?\b|\btsc\b/ }
const goalWords = (goal: string): string[] => goal.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= GOAL_WORD_MIN)

// Is the item in the summary? `text` is the summary, lower case
export function keptIn(item: KeepItem, text: string): boolean {
  if (item.kind === 'file') return text.includes(item.name.toLowerCase())
  if (item.kind === 'check') return CHECK_SIGNS[item.name].test(text)
  const words = goalWords(item.name)
  if (words.length === 0) return text.includes(item.name.toLowerCase())
  return words.filter(w => text.includes(w)).length >= Math.ceil(words.length * GOAL_SHARE)
}

// The summary is compared here and dropped: only the counts and our own item names come out
export function checkSummary(sid: string, items: readonly KeepItem[], summary: string, at: number): KeepCheck {
  const text = summary.toLowerCase()
  return { sid, at, total: items.length, missing: items.filter(x => !keptIn(x, text)) }
}

// The line shows for this session, for a while, while something was left out
export const liveCheck = (c: KeepCheck | undefined, sid: string | undefined, now: number): KeepCheck | undefined =>
  c === undefined || sid === undefined || c.sid !== sid || c.missing.length === 0 || now < c.at || now - c.at >= KEEP_SHOW_MS ? undefined : c

// The one short note Tell Claude again sends to Claude: English, our own names only
export function putBackNote(missing: readonly KeepItem[]): string {
  const goal = missing.find(x => x.kind === 'goal')
  const files = missing.filter(x => x.kind === 'file').map(x => x.name)
  const checks = missing.filter((x): x is Extract<KeepItem, { kind: 'check' }> => x.kind === 'check').map(x => kindWord(x.name))
  const parts = [...(goal === undefined ? [] : [`the goal: ${goal.name}`]), ...(files.length === 0 ? [] : [`the files edited: ${files.join(', ')}`]), ...(checks.length === 0 ? [] : [`the checks failing now: ${checks.join(', ')}`])]
  return `The last compaction left these out of its summary. Keep them in mind, no need to answer at length: ${parts.join('; ')}.` // en-only: sent to Claude
}

// This session's last check, in memory only
export const keepMem: { last?: KeepCheck } = {}

// The This session card's line and its press (i18n rows compact.*)
export const KEEP_LOST_LINE = 'The compaction left out {names}'
export const KEEP_LOST_GOAL = 'the goal'
export const PUT_BACK = 'Tell Claude again'
export const PUT_BACK_SAID = 'Told Claude again what the compaction left out.'
// The line names this many items, then "and N more" (as every list that is cut); a check's name is lowercase mid-sentence ("tests", not "Tests")
export const KEEP_NAMES_MAX = 3
export const KEEP_AND_MORE = 'and {n} more'
export function lostNames(missing: readonly KeepItem[], t: (s: string) => string, short: (k: ProofKind) => string): string {
  const names = missing.map(x => (x.kind === 'goal' ? t(KEEP_LOST_GOAL) : x.kind === 'check' ? short(x.name).toLocaleLowerCase() : x.name))
  const more = names.length - KEEP_NAMES_MAX
  return more > 0 ? `${names.slice(0, KEEP_NAMES_MAX).join(', ')} ${fillIn(t(KEEP_AND_MORE), { n: more })}` : names.join(', ')
}
