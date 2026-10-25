// The Where was I card: rows and words joining the recap, open ends and away digest. Pure.
import { RECAP_AFTER_MS, minWord, recapWords } from './attention'
import { fmt } from './fmt'
import { langNow } from '../i18n/t'
import { BACK_AFTER, BACK_AWAY_SHORT, BACK_BLURB, BACK_CLEAR, BACK_HEAD_AWAY, BACK_HEAD_OPEN, BACK_HEAD_WAS, BACK_NONE, BACK_OPEN_MANY, BACK_OPEN_ONE, BACK_TITLE, BACK_WAITING } from './backwords'
import { openLine, openWords } from './openends'
import type { OpenEnd } from './openends'
import type { WhatIs } from './whatis'
import { fillIn } from './fillin'
import { WELCOME_HEAD, nightRows, welcomeRows } from './welcome'
import type { WelcomeDo, WelcomeFacts } from './welcome'

// `welcome`: what finished, failed or waits since the last answer of this session (core/welcome.ts), shown after a break.
export type BackFacts = { now: number; gapMs?: number; goal?: string; branch?: string; open: OpenEnd[]; more: number; away?: { to: number; text: string }; welcome?: WelcomeFacts }
export type BackDo = { do: 'gotIt' } | WelcomeDo
// `wrap`: a sentence row with no value wraps on words instead of being cut at the card's edge.
export type BackGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: BackDo; wrap?: boolean }
// `fold`: a long group shows its first rows and "Show N more" (the line cards' fold, home/parts.tsx groupsView).
export type BackGroup = { head: string; rows: BackGroupRow[]; fold?: { id: string; shown: number; more: number } }
export type BackView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups: BackGroup[] }

export const BACK_AWAY_MS = 12 * 3_600_000
const SHOWN_FACTS = 8
// A group longer than this folds behind "Show N more".
export const BACK_ROWS = 4
const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const fill = (s: string, n: number): string => s.replace('{n}', String(n))

export const BACK_MEANS = 'Where you left off and what waits: the goal and the break since the last real event in this session, what was left open yesterday in each project (a failed check, a stopped step, tasks not done), and the digest of the last time you were away. It only shows what vaken already keeps.'
const BACK_NEXT = '/vaken-today recap, /vaken-today and /vaken-today standup say more in the session.'

export const awayShown = (a: { to: number; text: string } | undefined, now: number): { to: number; text: string } | undefined =>
  a === undefined || now - a.to > BACK_AWAY_MS || /^Nothing happened/.test(a.text) ? undefined : a

const away = (f: BackFacts): { to: number; text: string } | undefined => awayShown(f.away, f.now)
const back = (f: BackFacts): boolean => f.gapMs !== undefined && f.gapMs >= RECAP_AFTER_MS

// The rows "Since you left": after a break all of them, otherwise only a night run's.
const sinceRows = (f: BackFacts, t: (s: string) => string): BackGroupRow[] => (back(f) ? welcomeRows(f.welcome, t) : nightRows(f.welcome, t))
// A real wait on the person: a failed or stopped step, a question, a stopped step or a run that needs them, failed night tasks. A finished answer and a promise are news, not a wait.
const WAITS = ['w-failed', 'w-asked', 'w-hold', 'w-run', 'w-stopped', 'w-night-fix']
export const backWaiting = (f: BackFacts | undefined): number => (f === undefined ? 0 : sinceRows(f, s => s).length)
// `waits` (amber) only for a real wait since you left; yesterday's open ends and other news are the normal dot.
export const backLoud = (f: BackFacts | undefined): 'waits' | 'news' | 'open' | 'none' => {
  if (f === undefined) return 'none'
  const since = sinceRows(f, s => s)
  return since.some(r => WAITS.includes(r.key)) ? 'waits' : since.length > 0 ? 'news' : f.open.length > 0 ? 'open' : 'none'
}

// The Standard view shows the card only then.
export const welcomeDue = (f: BackFacts): boolean => (back(f) && welcomeRows(f.welcome, s => s).length > 0) || nightRows(f.welcome, s => s).length > 0

export const backHasNews = (f: BackFacts | undefined): boolean => f !== undefined && (f.open.length + f.more > 0 || away(f) !== undefined || back(f) || f.welcome?.night !== undefined)

export function backShort(f: BackFacts, t: (s: string) => string): string {
  const n = f.open.length + f.more
  const waiting = backWaiting(f)
  const parts = [
    ...(back(f) ? [t(BACK_AFTER).replace('{t}', minWord(f.gapMs ?? 0))] : []),
    ...(waiting > 0 ? [fill(t(BACK_WAITING), waiting)] : []),
    ...(n > 0 ? [fill(t(n === 1 ? BACK_OPEN_ONE : BACK_OPEN_MANY), n)] : []),
    ...(away(f) === undefined ? [] : [t(BACK_AWAY_SHORT)]),
  ]
  return parts.length === 0 ? t(BACK_NONE) : parts.join(' · ')
}

function openRows(f: BackFacts, t: (s: string) => string): BackGroupRow[] {
  const rows = f.open.map((e): BackGroupRow => ({
    key: `open-${e.project}`,
    title: openLine(e, t),
    wrap: true,
    what: { means: fillIn(t('{project} had this open when you last stopped there: {words}. Seen from the notes vaken keeps at the end of each session.'), { project: e.project, words: openWords(e, t) }), facts: openWords(e, t).split(', '), next: 'Press Got it when you have seen them. Nothing is sent and nothing changes in the project.', setting: 'cards.back' },
  }))
  if (f.more > 0) rows.push({ key: 'more', title: fill(t('and {n} more projects'), f.more), what: { means: fillIn(t('{n} more projects had something open. The card lists the first few.'), { n: f.more }), next: 'Press Got it when you have seen them.', setting: 'cards.back' } })
  // The title says the press, so no second "Clear" at the right
  rows.push({ key: 'gotit', title: t(BACK_CLEAR), what: { means: 'Clears the open ends from this card, from the line above the chat box and in every session. The work itself is not touched.', next: 'They come back tomorrow morning only if something is still open.', setting: 'cards.back' }, press: { do: 'gotIt' } })
  return rows
}

export function backView(f: BackFacts | undefined, t: (s: string) => string, say: (s: string) => string = t): BackView {
  const facts: BackFacts = f ?? { now: 0, open: [], more: 0 }
  const short = backShort(facts, t)
  const shown = away(facts)
  const what: WhatIs = { means: BACK_MEANS, ...(short === t(BACK_NONE) ? {} : { facts: [short] }), next: BACK_NEXT, setting: 'cards.back' }
  // No goal: no row (the short line already says how long you were away).
  const was: BackGroupRow[] =
    facts.goal === undefined
      ? []
      : [{
          key: 'was',
          title: facts.goal,
          wrap: true,
          ...(facts.gapMs === undefined || !back(facts) ? {} : { right: fmt.ago(facts.gapMs, 'plain', langNow()) }),
          what: { means: 'The goal of this session and how long ago it last did something. The goal is the key words of your first message or the sentence you set with /vaken-tasks goal.', facts: [recapWords({ gapMs: facts.gapMs ?? 0, ...(facts.branch === undefined ? {} : { branch: facts.branch }), ...(facts.goal === undefined ? {} : { goal: facts.goal }) }, t)], next: BACK_NEXT, setting: 'cards.back' },
        }]
  const awayRow: BackGroupRow[] =
    shown === undefined
      ? []
      : [{ key: 'away', title: say(shown.text.split('\n')[0] ?? ''), right: fmt.ago(facts.now - shown.to, 'plain', langNow()), what: { means: 'What happened while away mode ran: which sessions finished or needed you, what vaken stopped and what waits for you.', facts: shown.text.split('\n').slice(1).filter(l => l.trim() !== '').slice(0, SHOWN_FACTS), next: '/vaken-away digest shows it in the session.', setting: 'away.digest' } }]
  const since = sinceRows(facts, t)
  const folded = (id: string, head: string, list: BackGroupRow[]): BackGroup => (list.length > BACK_ROWS ? { head, rows: list, fold: { id, shown: BACK_ROWS, more: list.length - BACK_ROWS } } : { head, rows: list })
  const groups: BackGroup[] = [
    ...(since.length === 0 ? [] : [folded('since', t(WELCOME_HEAD), since)]),
    ...(was.length === 0 ? [] : [{ head: t(BACK_HEAD_WAS), rows: was }]),
    ...(facts.open.length === 0 ? [] : [folded('open', t(BACK_HEAD_OPEN), openRows(facts, t))]),
    ...(awayRow.length === 0 ? [] : [{ head: t(BACK_HEAD_AWAY), rows: awayRow }]),
  ]
  const rows: BackGroup[] = groups.length === 0 ? [{ head: '', rows: [{ key: 'none', title: short, what }] }] : groups
  return {
    title: BACK_TITLE,
    blurb: t(BACK_BLURB),
    short,
    lines: [short, ...groups.flatMap(g => g.rows.filter(r => r.press === undefined).map(r => r.title))],
    whats: [what, ...groups.flatMap(g => g.rows.filter(r => r.press === undefined).map(r => r.what))],
    shortWhat: what,
    groups: rows,
  }
}

export function backCardText(f: BackFacts | undefined): string[] {
  if (f === undefined) return []
  const id = (s: string): string => s
  const shown = away(f)
  return [
    `Where was I: ${backShort(f, id)} · /vaken-today recap`,
    ...(f.goal === undefined ? [] : [`Goal: ${cut(f.goal, 80)} · /vaken-today recap`]),
    ...f.open.map(e => `${openLine(e)} · /vaken-today`),
    ...(f.more > 0 ? [`and ${f.more} more projects · /vaken-today`] : []),
    ...(shown === undefined ? [] : [`${shown.text.split('\n')[0] ?? ''} · /vaken-away digest`]),
  ]
}
