// The Autopilot ledger: one entry per cockpit action, newest first. Counts, sizes and times only, never conversation text.
import { tokenWord } from './appcontext'
import { timesWord } from './words'
import { hhmm } from './time'
import { sysWord } from './syswords'
import { ACTED_MARK, FREED_TITLE, SHORTENED_TITLE, isSumTitle } from './counts'

// An entry without both `before` and `after` is a note, not a saving. `did: true` makes the Autopilot card count it by `what`.
export type Entry = { at: number; session?: string; what: string; detail?: string; before?: number; after?: number; how?: 'button' | 'auto' | 'typed'; did?: boolean }

export const startOfDay = (now: number): number => {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const savings = (list: Entry[]): Entry[] => list.filter(e => e.before !== undefined && e.after !== undefined && e.before > e.after)

// `counts` keeps the day's sums once the ledger's 60 lines no longer hold them; the larger of the two wins.
export function todaySummary(list: Entry[], now: number, counts?: Record<string, number>): { count: number; freed: number } {
  const today = savings(list).filter(e => e.at >= startOfDay(now))
  return { count: Math.max(today.length, counts?.[SHORTENED_TITLE] ?? 0), freed: Math.max(today.reduce((n, e) => n + ((e.before ?? 0) - (e.after ?? 0)), 0), counts?.[FREED_TITLE] ?? 0) }
}

// Not an action taken for you (no `did`); the counts store holds these too.
const compactNote = (what: string): boolean => /^(compacted|compact now|auto-compact|compaction)\b/.test(what)

type Did = { what: string; n: number }
// The ledger keeps only 60 lines, so a busy day takes its true number from `counts`.
export function didToday(list: Entry[], now: number, counts?: Record<string, number>): Did[] {
  const out: Did[] = []
  for (const e of list) {
    if (e.did !== true || e.at < startOfDay(now)) continue
    const old = out.find(d => d.what === e.what)
    if (old === undefined) out.push({ what: e.what, n: 1 })
    else old.n += 1
  }
  for (const [what, n] of Object.entries(counts ?? {})) {
    if (isSumTitle(what) || what.startsWith(ACTED_MARK) || compactNote(what)) continue
    const old = out.find(d => d.what === what)
    if (old === undefined) out.push({ what, n })
    else old.n = Math.max(old.n, n)
  }
  return out
}

const HOW: Record<NonNullable<Entry['how']>, string> = { button: 'from the card', auto: 'by itself', typed: 'typed by you' }

export const savingWords = (e: Entry): { what: string; how: string } => ({ what: `Compacted the session, ${tokenWord(e.before ?? 0)} to ${tokenWord(e.after ?? 0)}`, how: e.how === undefined ? '' : HOW[e.how] })

export { hhmm as timeWord }

export function summaryWords(s: { count: number; freed: number }): { head: string; sub?: string } {
  return s.count === 0 ? { head: 'The session was not compacted today.' } : { head: `Compacted the session ${timesWord(s.count)} today.`, sub: `Freed about ${tokenWord(s.freed)} tokens of the session.` }
}
// A stored title stays as written because counts, the audit and the history match on it.
const SHOWN: [RegExp, string][] = [
  [/^Held /, 'Stopped '],
  [/^(Refused|Blocked) /, 'Stopped '],
  [/\bheld step\b/, 'stopped step'],
  [/outside the fence$/, 'outside your folders'],
  [/^Warned before an action outside/, 'Warned about a step outside'],
  [/^Claude said done without proof$/, 'Claude said done, but no check backs it'],
  // Older stored lines say 'shorten' and read as compact.
  [/^compacted\b/, 'compacted the session'],
  [/^auto-compact\b/, 'compacting by itself'],
  [/^compaction\b/, 'compacting'],
  [/^Compacted a chat$/, 'Compacted a session'],
  [/^Shortened a (chat|session)$/, 'Compacted a session'],
  [/^Shortened the (chat|session) by itself$/, 'Compacted the session by itself'],
  [/^Asked about shortening at good moments$/, 'Asked about compacting at good moments'],
  [/\blookup helper\b/, 'lookup agent'],
  // Older lines read as the new words.
  [/^Asked Claude to fix (a|the) failing check$/, 'Made a fix request for a failing check'],
  // Titles stored before the halt became a pause.
  [/^Halted all changes$/, 'Paused all changes'],
  [/^Lifted the halt$/, 'Resumed after a pause'],
  [/^(Refused|Stopped) a step while halted$/, '$1 a step while paused'],
]
// The stored title stays the Mac one so lookups by it hold.
export const shownTitle = (what: string): string => sysWord(SHOWN.reduce((t, [re, to]) => t.replace(re, to), what))
export const didLine = (d: Did): string => `${shownTitle(d.what)} ${timesWord(d.n)}.`

// Grouped by the stored title's first word.
type DidKind = 'did' | 'warned' | 'stopped'
export const DID_KINDS: DidKind[] = ['did', 'warned', 'stopped']
export const DID_HEAD: Record<DidKind, string> = { did: 'Did for you', warned: 'Warned you', stopped: 'Stopped' }
export function didKind(what: string): DidKind {
  const t = shownTitle(what)
  if (/^(Stopped|Blocked|Refused|Halted|Paused all|Held)\b/.test(t)) return 'stopped'
  if (/^(Warned|Found|Spotted|Noticed|Caught|Going round|Claude said)\b/.test(t)) return 'warned'
  return 'did'
}
export function didTitle(what: string): string {
  const t = shownTitle(what)
  const short = t.replace(/^Warned (about|before) /, '').replace(/^Stopped (?=a |an |the )/, '')
  return short === t ? t : `${short.charAt(0).toUpperCase()}${short.slice(1)}`
}
export { timesWord }
// The text twin passes no `t` and stays English.
export function shortSummary(s: { count: number; freed: number }, did: Did[] = [], t: (x: string) => string = x => x): string {
  const times = (n: number): string => (n === 1 ? t('once') : t('{n} times').replace('{n}', String(n)))
  const lower = (x: string): string => `${x.charAt(0).toLowerCase()}${x.slice(1)}`
  const parts = [...(s.count === 0 ? [] : [t('compacted the session {times}, about {k} freed').replace('{times}', times(s.count)).replace('{k}', tokenWord(s.freed))]), ...did.map(d => `${lower(t(shownTitle(d.what)))} ${times(d.n)}`)]
  // Three parts at most, so the line stays calm.
  if (parts.length > 3) return `${parts.slice(0, 3).join(', ')}, ${t('and {n} more').replace('{n}', String(parts.length - 3))}`
  return parts.length === 0 ? t('Nothing today') : parts.join(', ')
}
