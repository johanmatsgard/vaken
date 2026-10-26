// The Glance look: one headline value and a status dot per card, and which cards are open.

import { fmt } from './fmt'
import { fillIn } from './fillin'
import { REPEAT_HEAD } from './repeat'
import { englishOf } from '../i18n/table'
import { SHIP_HELD_MANY, SHIP_HELD_ONE, SHIP_MANY, SHIP_NO_GIT_HEAD, SHIP_ONE, SHIP_READY, SHIP_READY_HERE } from './shipwords'

export type GlanceDot = 'neutral' | 'accent' | 'amber'
// Mirrors Loud in features/home/logic.ts (core does not import features).
export type GlanceLoud = 'urgent' | 'warn' | 'normal' | 'calm'

export const glanceDot = (loud: GlanceLoud): GlanceDot => (loud === 'urgent' || loud === 'warn' ? 'amber' : loud === 'normal' ? 'accent' : 'neutral')

type T = (s: string) => string
const same: T = s => s
const fill = (s: string, n: number | string): string => s.replace('{n}', String(n))

export const glanceOpenKey = (id: string): string => `glance:${id}`
export const glanceShutKey = (id: string): string => `glance-shut:${id}`
export function glanceIsOpen(sections: readonly string[], id: string, _l: GlanceLoud): boolean {
  return sections.includes(glanceOpenKey(id))
}
export function glanceToggled(sections: readonly string[], id: string, l: GlanceLoud): string[] {
  const open = glanceOpenKey(id)
  const rest = sections.filter(k => k !== open && k !== glanceShutKey(id))
  return glanceIsOpen(sections, id, l) ? rest : [...rest, open]
}
// Cards that start open on a fresh store; a stored choice always wins.
export const START_OPEN_CARDS: readonly string[] = ['needs', 'here', 'limit']
export const NEEDS_CALM_OPEN = 'needs:calm'
// A fold holds only while the count is the one it was folded at, so a new item reopens the card.
export const needsShutKey = (count: number): string => `${glanceShutKey('needs')}:${count}`
export const needsIsShut = (sections: readonly string[], count: number): boolean => sections.includes(needsShutKey(count))
export function needsToggled(sections: readonly string[], count: number): string[] {
  const shut = needsIsShut(sections, count)
  const rest = sections.filter(k => !k.startsWith(`${glanceShutKey('needs')}:`))
  return shut ? rest : [...rest, needsShutKey(count)]
}
export const withOpenCards = (sections: readonly string[], open: readonly string[]): string[] => [...sections, ...open.filter(id => id !== 'needs').map(glanceOpenKey).filter(k => !sections.includes(k))]
export const openCardsOf = (sections: readonly string[], needsOpen: boolean): string[] => [...(needsOpen ? ['needs'] : []), ...sections.filter(k => k.startsWith('glance:')).map(k => k.slice('glance:'.length))]
// The cards' open state is not Settings' to clear.
export const keepGlance = (sections: readonly string[]): string[] => sections.filter(k => k.startsWith('glance:') || k.startsWith('glance-shut:') || k.startsWith('flip:'))


// The limit the headline names: a hot one (the caller marks it: from LIMIT_HOT_PCT used, or it runs out before its reset), else the band's fixed order, the 5-hour limit first
type HeadBlock = { short: string; percent: number; reset?: string; name?: string; hot?: boolean }
const isFiveShort = (short: string): boolean => short === '5-hour limit' || short === 'Session'
const headLead = (blocks: readonly HeadBlock[]): HeadBlock | undefined => blocks.find(b => b.hot === true) ?? blocks.find(b => isFiveShort(b.short)) ?? blocks[0]
// Forms go longest to shortest; `fits` picks the first that fits. The limit is always named, by its card name ("5-hour limit", "Week", "Week · Fable"),
// then by the band's short name ("5 h"); the reset goes before the name gets shorter, the word "used" last.
export function limitForms(blocks: readonly HeadBlock[], t: T = same, ago = ''): string[] {
  const lead = headLead(blocks)
  if (lead === undefined) return [t('Not known yet')]
  const pct = fmt.percent(lead.percent)
  const name = lead.name ?? t(isFiveShort(lead.short) ? '5-hour limit' : lead.short)
  const short = isFiveShort(lead.short) ? t('5 h') : name
  const named = (n: string): string => t('{name}: {pct} used').replace('{name}', n).replace('{pct}', pct)
  const reset = lead.reset ?? ''
  const base = [...new Set([...(reset === '' ? [] : [`${named(name)} · ${reset}`, `${named(short)} · ${reset}`]), named(name), named(short), `${short}: ${pct}`, `${short} ${pct}`])]
  return ago === '' ? base : [...base.map(f => `${f} · ${ago}`), ...base]
}
export function limitHead(blocks: readonly HeadBlock[], t: T = same, fits: (s: string) => boolean = () => true, ago = ''): string {
  const forms = limitForms(blocks, t, ago)
  return forms.find(fits) ?? forms[forms.length - 1]
}

// The state and the cost ("Working · $1.42"); the context speaks through the dot (amber when it fills, its word "Context nearly full")
export function hereHead(here: { state: string; costUsd?: number } | undefined, t: T = same): string {
  if (here === undefined) return t('Not started')
  return here.costUsd === undefined ? t(here.state) : `${t(here.state)} · ${fmt.moneyPlain(here.costUsd)}`
}

// A session that asks lives in the band and Needs you only (one fact, one place), so it is not counted here
// With no other session in the list but one waiting in Needs you, it says where that one is, not "None"
export function othersHead(n: { waiting: number; working: number; total: number; needs?: number }, t: T = same): string {
  if (n.total === 0) return (n.needs ?? 0) === 0 ? t('None') : fill(t(n.needs === 1 ? '1 waits in Needs you' : '{n} wait in Needs you'), n.needs ?? 0)
  if (n.waiting > 0) return fill(t('{n} your turn'), n.waiting)
  if (n.working > 0) return fill(t('{n} working'), n.working)
  return n.total === 1 ? t('1 idle') : fill(t('{n} idle'), n.total)
}

export const autopilotHead = (didToday: number, t: T = same): string => (didToday > 0 ? fill(t('{n} today'), didToday) : t('Nothing today'))

// `run`: a task run that is paused or being set up says so, never "All done". `stuckMin`: one helper with no progress says for how long.
// `waiting`: teammates that have waited a while for a message (the rows under the card's list)
export type AgentsHeadFacts = { running: number; stuck: number; total: number; others?: number; failed?: number; stuckMin?: number; waiting?: number; run?: 'setup' | 'paused' }
export function agentsHead(a: AgentsHeadFacts, t: T = same): string {
  // Said first so a failed run never reads as 'None' with a calm dot: a failure is the one thing that waits on the person.
  if ((a.failed ?? 0) > 0) return fill(t('{n} failed'), a.failed ?? 0)
  if (a.stuck === 1 && a.stuckMin !== undefined) return fill(t('No progress for {n} min'), a.stuckMin)
  if (a.stuck > 0) return fill(t('{n} with no progress'), a.stuck)
  const waiting = a.waiting ?? 0
  if (a.running > 0) return waiting > 0 ? t('{n} running, {w} waiting').replace('{n}', String(a.running)).replace('{w}', String(waiting)) : fill(t('{n} running'), a.running)
  if (a.run !== undefined) return t(a.run === 'paused' ? 'Paused' : 'Not started')
  if (waiting > 0) return fill(t('{n} waiting'), waiting)
  return a.total > 0 ? t('All done') : (a.others ?? 0) > 0 ? t('None here') : t('None')
}
// The short form beside the dot when the whole value does not fit, so the mark keeps a word: "No progress", "Paused"; "None" for "None here"; "Not begun" for "Not started" (an open card leaves 8 letters at 288 pt).
export function agentsShort(a: AgentsHeadFacts, t: T = same): string | undefined {
  if ((a.failed ?? 0) > 0) return t('Failed')
  if (a.stuck > 0) return t('No progress')
  return a.running > 0 ? t('Running') : a.run !== undefined ? t(a.run === 'paused' ? 'Paused' : 'Not begun') : (a.waiting ?? 0) > 0 ? t('Waiting') : a.total === 0 && (a.others ?? 0) > 0 ? t('None') : undefined
}

export function computerHead(c: { gaugeOn: boolean; room: { n: number } | undefined }, t: T = same): string {
  // Before the first reading the row says nothing (calm is quiet): a placeholder word on every screen reads as unfinished
  if (c.room === undefined) return c.gaugeOn ? '' : t('Off')
  return c.room.n === 0 ? t('No room for another agent') : fill(t('Room for about {n}'), c.room.n)
}

export function proofHead(p: { none: boolean; failed: number; unproven: number; debt: number }, t: T = same): string {
  if (p.none) return t('None')
  if (p.failed > 0) return fill(t('{n} failed'), p.failed)
  if (p.unproven > 0) return t('Not checked')
  if (p.debt > 0) return fill(t('{n} to review'), p.debt)
  return t('All clear')
}

// The one word for how strict the rules are: the Glance row, the card's row and its Short look all say it ("Warns, stops the worst").
// `warn` is how the default Warn reads beside Claude Code's own asking (core/guardhost.ts warnReading).
export function guardWord(rules: readonly string[], t: T = same, warn?: 'warn' | 'worst' | 'maybe'): string {
  const first = rules[0] ?? 'warn'
  if (!rules.every(r => r === first)) return t('Mixed')
  if (first === 'warn') return t(warn === 'worst' ? 'Warns, stops the worst' : warn === 'maybe' ? 'Warns, worst may stop' : 'Warns only')
  return fill(t('All {n}'), t(first === 'hold' ? 'stop' : first))
}

// `fits`: a long form that does not fit gives way to 'Warns'.
export function guardHead(rules: readonly string[], t: T = same, warn?: 'warn' | 'worst' | 'maybe', fits: (s: string) => boolean = () => true): string {
  const word = guardWord(rules, t, warn)
  const first = rules[0] ?? 'warn'
  return first !== 'warn' || !rules.every(r => r === first) || fits(word) ? word : t('Warns')
}

// `offer`: Repeat to skill offers to save a routine, the row the card leads with, so the mark says that, never "None"
export const skillsHead = (used: number, t: T = same, offer = false): string => (offer ? t(REPEAT_HEAD) : used === 1 ? t('1 used') : used > 0 ? fill(t('{n} used'), used) : t('None'))

// `unknown`: none open is not known (this branch never answered, or the folder has no git), so the word is not the empty card's "None"
// It counts what the rows show: the open pull requests (the rows carry no CI words: the app's PR monitor shows the checks), then the worktrees to remove and those idle, as prsLoud
export type PrsHeadFacts = { on: boolean; open: number; unknown?: 'look' | 'nogit'; copies?: { merged: number; idle: number } }
export function prsHead(p: PrsHeadFacts, t: T = same): string {
  if (!p.on) return t('Off')
  if (p.open > 0) return fill(t('{n} open'), p.open)
  const c = p.copies ?? { merged: 0, idle: 0 }
  if (c.merged > 0) return fillIn(t(c.merged === 1 ? '1 worktree to remove' : '{n} worktrees to remove'), { n: c.merged })
  if (c.idle > 0) return fillIn(t(c.idle === 1 ? '1 worktree idle' : '{n} worktrees idle'), { n: c.idle })
  return p.unknown === 'look' ? t('Not checked') : p.unknown === 'nogit' ? t(SHIP_NO_GIT_HEAD) : t('None')
}
// The short form beside the dot when the whole value does not fit a phone-wide row: the count in the rows' own word ("2 merged", as "… is merged"); "Unchecked" for "Not checked" (a new card chip leaves room for 13 letters at 288 pt)
export function prsShortHead(p: PrsHeadFacts, t: T = same): string | undefined {
  if (!p.on || p.open > 0) return undefined
  const c = p.copies ?? { merged: 0, idle: 0 }
  return c.merged > 0 ? fillIn(t(c.merged === 1 ? '1 merged' : '{n} merged'), { n: c.merged }) : c.idle > 0 ? fillIn(t(c.idle === 1 ? '1 idle' : '{n} idle'), { n: c.idle }) : p.unknown === 'look' ? t('Unchecked') : undefined
}

// `unchecked`: ready here, but this branch's pull request was never checked on GitHub (or the PR check is off).
// `blockers`: the rows the open card lists, said in the card's own phrase ("2 things block it")
// `noGit`: the folder is not in a git repository, so there is nothing to ship
export function shipHead(verdict: 'blocked' | 'ready' | 'none', blockers: number, t: T = same, unchecked = false, noGit = false): string {
  return verdict === 'ready' ? t(unchecked ? SHIP_READY_HERE : SHIP_READY) : verdict === 'none' ? t(noGit ? SHIP_NO_GIT_HEAD : 'None') : fill(t(blockers === 1 ? SHIP_ONE : SHIP_MANY), blockers)
}

// What waits since you left comes before yesterday's open ends.
export const backHead = (open: number, t: T = same, waiting = 0): string => (waiting > 0 ? fill(t('{n} waiting'), waiting) : open > 0 ? fill(t('{n} open'), open) : t('None'))

// The stopped steps wait in Needs you, so the count here is today's tally in Ship's words ("6 steps stopped today"); the pause is "Paused"
export function safetyHead(s: { halted: boolean; held: number }, t: T = same): string {
  // It says what happened, so its dot's word ("Stopped") does not repeat the count
  return s.halted ? t('Paused') : s.held > 0 ? fill(t(s.held === 1 ? SHIP_HELD_ONE : SHIP_HELD_MANY), s.held) : t('All clear')
}

// The card's one calm word is "Small" (never "Context ..."); "No instruction file" when there is none
// `unread`: the files are not read yet, so their size is not known (the card's Short line says the same word)
export function contextHead(c: { loud: 'heavy' | 'unverified' | 'none'; goodMoment: boolean; noFile?: boolean; unread?: boolean }, t: T = same): string {
  return c.loud === 'heavy' ? t('Heavy files') : c.loud === 'unverified' ? t('Not checked') : c.goodMoment ? t('Compact now') : c.unread === true ? t('Nothing yet') : c.noFile === true ? t('No instruction file') : t('Small')
}

export function previewHead(p: { state: 'none' | 'silent' | 'error' | 'up'; changed: boolean }, t: T = same): string {
  return p.state === 'error' ? t('Error') : p.state === 'silent' ? t('Silent') : p.state === 'up' ? (p.changed ? t('Changed') : t('Up')) : t('None')
}

export const setupHead = (loud: 'conflict' | 'drift' | 'none', t: T = same, isOn = true): string => (!isOn ? t('Off') : loud === 'conflict' ? t('Conflict') : loud === 'drift' ? t('Out of date') : t('Up to date'))

export function doHead(d: { on: boolean; blocks: number }, t: T = same): string {
  return !d.on ? t('Off') : d.blocks > 0 ? fill(t('{n} to run'), d.blocks) : t('None')
}

// A value longer than `max` goes under the row as a dim note.
export function factOf(line: string, max = 26): { label: string; value: string; note: string[] } {
  const at = line.indexOf(': ')
  if (at <= 0) return { label: line, value: '', note: [] }
  const label = line.slice(0, at)
  const value = line.slice(at + 2)
  return value.length > max ? { label, value: '', note: [value] } : { label, value, note: [] }
}

export const GLANCE_VIEW_STRINGS: string[] = englishOf('glance')
