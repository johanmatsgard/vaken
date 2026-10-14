// The Glance look: one headline value and a status dot per card, and which cards are open.

import { fmt } from './fmt'
import { englishOf } from '../i18n/table'

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


// Forms go longest to shortest; `fits` picks the first that fits, so a narrow pane drops the limit's name first and keeps the reset.
export function limitForms(blocks: readonly { short: string; percent: number; reset?: string }[], t: T = same, ago = ''): string[] {
  const lead = blocks[0]
  if (lead === undefined) return [t('Not known yet')]
  const pct = fmt.percent(lead.percent)
  const name = t(lead.short === '5-hour limit' ? '5-hour' : lead.short)
  const named = t('{name}: {pct} used').replace('{name}', name).replace('{pct}', pct)
  const used = t('{pct} used').replace('{pct}', pct)
  const reset = lead.reset ?? ''
  const base = reset === '' ? [named, used] : [`${named} · ${reset}`, `${used} · ${reset}`, named, used]
  return ago === '' ? base : [...base.map(f => `${f} · ${ago}`), ...base]
}
export function limitHead(blocks: readonly { short: string; percent: number; reset?: string }[], t: T = same, fits: (s: string) => boolean = () => true, ago = ''): string {
  const forms = limitForms(blocks, t, ago)
  return forms.find(fits) ?? forms[forms.length - 1]
}

export function hereHead(here: { state: string; contextPercent?: number } | undefined, t: T = same): string {
  if (here === undefined) return t('Not started')
  return here.contextPercent === undefined ? t(here.state) : t('Context {pct} full').replace('{pct}', fmt.percent(here.contextPercent))
}

// A session that asks lives in Needs you, so say it waits instead of 'None'.
export function othersHead(n: { waiting: number; working: number; total: number; needs?: number }, t: T = same): string {
  if (n.total === 0) return (n.needs ?? 0) > 0 ? fill(t('{n} waiting for you'), n.needs ?? 0) : t('None')
  if (n.waiting > 0) return fill(t('{n} your turn'), n.waiting)
  if (n.working > 0) return fill(t('{n} working'), n.working)
  return n.total === 1 ? t('1 idle') : fill(t('{n} idle'), n.total)
}

export const autopilotHead = (didToday: number, t: T = same): string => (didToday > 0 ? fill(t('{n} today'), didToday) : t('Nothing today'))

export function agentsHead(a: { running: number; stuck: number; total: number; others?: number; failed?: number }, t: T = same): string {
  if (a.stuck > 0) return fill(t('{n} with no progress'), a.stuck)
  // Said first so a failed run never reads as 'None' with a calm dot.
  if ((a.failed ?? 0) > 0) return fill(t('{n} failed'), a.failed ?? 0)
  if (a.running > 0) return fill(t('{n} running'), a.running)
  return a.total > 0 ? t('All done') : (a.others ?? 0) > 0 ? t('None here') : t('None')
}

export function computerHead(c: { gaugeOn: boolean; room: { n: number } | undefined }, t: T = same): string {
  if (c.room === undefined) return c.gaugeOn ? t('Measuring load') : t('Off')
  return c.room.n === 0 ? t('No room for another agent') : fill(t('Room for about {n}'), c.room.n)
}

export function proofHead(p: { none: boolean; failed: number; unproven: number; debt: number }, t: T = same): string {
  if (p.none) return t('Nothing yet')
  if (p.failed > 0) return fill(t('{n} failed'), p.failed)
  if (p.unproven > 0) return fill(t('{n} unproven'), p.unproven)
  if (p.debt > 0) return fill(t('{n} to review'), p.debt)
  return t('All clear')
}

// `fits`: a long form that does not fit gives way to 'Warns'.
export function guardHead(rules: readonly string[], t: T = same, warn?: 'warn' | 'worst' | 'maybe', fits: (s: string) => boolean = () => true): string {
  const first = rules[0] ?? 'warn'
  if (!rules.every(r => r === first)) return t('Mixed')
  if (first === 'warn') {
    const long = t(warn === 'worst' ? 'Warns, stops the worst' : warn === 'maybe' ? 'Watching risky steps' : 'Warns only')
    return fits(long) ? long : t('Warns')
  }
  return fill(t('All {n}'), t(first === 'hold' ? 'stop' : first))
}

export const skillsHead = (used: number, t: T = same): string => (used === 1 ? t('1 used') : used > 0 ? fill(t('{n} used'), used) : t('None used'))

export function prsHead(p: { on: boolean; open: number; failing: number }, t: T = same): string {
  if (!p.on) return t('Off')
  if (p.failing > 0) return fill(t('{n} failing'), p.failing)
  return p.open > 0 ? fill(t('{n} open'), p.open) : t('None open')
}

export function shipHead(verdict: 'blocked' | 'ready' | 'none', blockers: number, t: T = same): string {
  return verdict === 'ready' ? t('Ready') : verdict === 'none' ? t('Nothing yet') : fill(t('{n} to fix'), blockers)
}

export const backHead = (open: number, t: T = same): string => (open > 0 ? fill(t('{n} open'), open) : t('Nothing open'))

export function safetyHead(s: { halted: boolean; held: number }, t: T = same): string {
  return s.halted ? t('Paused for safety') : s.held > 0 ? fill(t('{n} stopped'), s.held) : t('All clear')
}

export function contextHead(c: { loud: 'heavy' | 'unverified' | 'none'; goodMoment: boolean }, t: T = same): string {
  return c.loud === 'heavy' ? t('Heavy') : c.loud === 'unverified' ? t('Unchecked') : c.goodMoment ? t('Compact now') : t('All small')
}

export function previewHead(p: { state: 'none' | 'silent' | 'error' | 'up'; changed: boolean }, t: T = same): string {
  return p.state === 'error' ? t('Error') : p.state === 'silent' ? t('Silent') : p.state === 'up' ? (p.changed ? t('Changed') : t('Up')) : t('No dev server running')
}

export const setupHead = (loud: 'conflict' | 'drift' | 'none', t: T = same): string => (loud === 'conflict' ? t('Conflict') : loud === 'drift' ? t('Out of date') : t('Up to date'))

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
