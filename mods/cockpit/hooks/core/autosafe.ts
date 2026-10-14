// Auto compaction made safe: what is saved before it, the note after it, and the ask-once. Pure functions.
import { WOULD_WHAT } from './compactrest'
import { AUTO_NOTE } from './compactwords'
import type { Entry } from './ledger'
import { homeRel, under } from './platform'

// The handoff note goes under HOME, one file per session, never in the project folder.
export const BRIEF_DIR = '.claude/cockpit/briefs'
export const CHECKPOINT_NAME = 'before auto-compact'
export const AUTO_NOTE_WHAT = 'Shortened the session by itself'
export const ASK_WHAT = 'Asked about shortening at good moments'
export const ASK_AFTER = 3
export const ASK_HIDE_MS = 14 * 24 * 60 * 60_000
export const NOTE_SHOW_MS = 24 * 60 * 60_000

const safe = (sid: string): string => sid.replace(/[^A-Za-z0-9]/g, '').slice(0, 8)
export const briefName = (sid: string): string => `brief-${safe(sid) || 'session'}.md`
export const briefPath = (home: string, sid: string): string => under(home, BRIEF_DIR, briefName(sid))
export const briefShown = (sid: string, home = ''): string => homeRel(`${BRIEF_DIR}/${briefName(sid)}`, home)

export const BRIEF_KEEP_DAYS = 14
// Posix only: the Windows home has no `find`.
export const briefSweepArgv = (home: string): string[] => ['find', under(home, BRIEF_DIR), '-maxdepth', '1', '-type', 'f', '-name', 'brief-*.md', '-mtime', `+${BRIEF_KEEP_DAYS}`]
// Only a brief vaken made may be swept: no `..`, nothing deeper.
export const isBriefFile = (home: string, path: string): boolean => {
  if (!home.startsWith('/') || home.includes('..') || path.includes('..') || path.includes('//')) return false
  const base = `${home.replace(/\/+$/, '')}/${BRIEF_DIR}/`
  return path.startsWith(base) && /^brief-[A-Za-z0-9]{0,8}\.md$/.test(path.slice(base.length))
}

export const noteText =(name: string): string => AUTO_NOTE.replace('{name}', name)
export function noteWords(stored: string, t: (s: string) => string): string {
  const m = /Brief saved: (.+)\.$/.exec(stored)
  return m === null ? stored : t(AUTO_NOTE).replace('{name}', m[1] ?? '')
}

export const lastNote = (ledger: readonly Entry[], sid: string, now: number | undefined): Entry | undefined =>
  now === undefined ? undefined : ledger.find(e => e.what === AUTO_NOTE_WHAT && e.session === sid && now - e.at < NOTE_SHOW_MS)

export function askNow(ledger: readonly Entry[], mode: string | undefined, now: number | undefined): boolean {
  if (mode !== 'watch' || now === undefined) return false
  const answer = ledger.find(e => e.what === ASK_WHAT)
  if (answer !== undefined && answer.detail === 'not now' && now - answer.at < ASK_HIDE_MS) return false
  const since = answer?.at ?? 0
  return ledger.filter(e => e.what === WOULD_WHAT && e.at > since).length >= ASK_AFTER
}
