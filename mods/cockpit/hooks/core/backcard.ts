// The Where was I card: rows and words joining the recap, open ends and away digest. Pure.
import { RECAP_AFTER_MS, minWord, recapWords } from './attention'
import { BACK_AFTER, BACK_AGO, BACK_AWAY_SHORT, BACK_BLURB, BACK_CLEAR, BACK_ENDED, BACK_HEAD_AWAY, BACK_HEAD_OPEN, BACK_HEAD_WAS, BACK_NONE, BACK_NO_GOAL, BACK_OPEN_MANY, BACK_OPEN_ONE, BACK_TITLE } from './backwords'
import { openLine, openWords } from './openends'
import type { OpenEnd } from './openends'
import type { WhatIs } from './whatis'
import { fillIn } from './fillin'
import { hhmm } from './time'

export type BackFacts = { now: number; gapMs?: number; goal?: string; branch?: string; contextPercent?: number; open: OpenEnd[]; more: number; away?: { to: number; text: string } }
export type BackDo = { do: 'gotIt' }
export type BackGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: BackDo }
export type BackView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups: { head: string; rows: BackGroupRow[] }[] }

export const BACK_AWAY_MS = 12 * 3_600_000
const SHOWN_FACTS = 8
const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const fill = (s: string, n: number): string => s.replace('{n}', String(n))

export const BACK_MEANS = 'Where you left off and what waits: the goal and the break since the last real event in this session, what was left open yesterday in each project (a failed check, a stopped step, tasks not done), and the digest of the last time you were away. It only shows what vaken already keeps.'
const BACK_NEXT = '/vaken-today recap, /vaken-today and /vaken-today standup say more in the session.'

export const awayShown = (a: { to: number; text: string } | undefined, now: number): { to: number; text: string } | undefined =>
  a === undefined || now - a.to > BACK_AWAY_MS || /^Nothing happened/.test(a.text) ? undefined : a

export const backLoud = (f: BackFacts | undefined): 'open' | 'none' => (f === undefined || f.open.length === 0 ? 'none' : 'open')

const away = (f: BackFacts): { to: number; text: string } | undefined => awayShown(f.away, f.now)
const back = (f: BackFacts): boolean => f.gapMs !== undefined && f.gapMs >= RECAP_AFTER_MS

export const backHasNews = (f: BackFacts | undefined): boolean => f !== undefined && (f.open.length + f.more > 0 || away(f) !== undefined || back(f))

export function backShort(f: BackFacts, t: (s: string) => string): string {
  const n = f.open.length + f.more
  const parts = [
    ...(back(f) ? [t(BACK_AFTER).replace('{t}', minWord(f.gapMs ?? 0))] : []),
    ...(n > 0 ? [fill(t(n === 1 ? BACK_OPEN_ONE : BACK_OPEN_MANY), n)] : []),
    ...(away(f) === undefined ? [] : [t(BACK_AWAY_SHORT)]),
  ]
  return parts.length === 0 ? t(BACK_NONE) : n === 0 && away(f) === undefined ? [...parts, t(BACK_NONE).toLowerCase()].join(' · ') : parts.join(' · ')
}

function openRows(f: BackFacts, t: (s: string) => string): BackGroupRow[] {
  const rows = f.open.map((e): BackGroupRow => ({
    key: `open-${e.project}`,
    title: openLine(e, t),
    what: { means: fillIn(t('{project} had this open when you last stopped there: {words}. Seen from the notes vaken keeps at the end of each session.'), { project: e.project, words: openWords(e, t) }), facts: openWords(e, t).split(', '), next: 'Press Got it when you have seen them. Nothing is sent and nothing changes in the project.', setting: 'cards.back' },
  }))
  if (f.more > 0) rows.push({ key: 'more', title: fill(t('and {n} more projects'), f.more), what: { means: fillIn(t('{n} more projects had something open. The card lists the first few.'), { n: f.more }), next: 'Press Got it when you have seen them.', setting: 'cards.back' } })
  rows.push({ key: 'gotit', title: t(BACK_CLEAR), right: t('Clear'), what: { means: 'Clears the open ends from this card, from the line above the chat box and in every session. The work itself is not touched.', next: 'They come back tomorrow morning only if something is still open.', setting: 'cards.back' }, press: { do: 'gotIt' } })
  return rows
}

export function backView(f: BackFacts | undefined, t: (s: string) => string, say: (s: string) => string = t): BackView {
  const facts: BackFacts = f ?? { now: 0, open: [], more: 0 }
  const short = backShort(facts, t)
  const shown = away(facts)
  const what: WhatIs = { means: BACK_MEANS, ...(short === t(BACK_NONE) ? {} : { facts: [short] }), next: BACK_NEXT, setting: 'cards.back' }
  const was: BackGroupRow[] =
    facts.goal === undefined && !back(facts)
      ? []
      : [{
          key: 'was',
          title: facts.goal === undefined ? t(BACK_NO_GOAL) : cut(facts.goal, 80),
          ...(facts.gapMs === undefined || !back(facts) ? {} : { right: t(BACK_AGO).replace('{t}', minWord(facts.gapMs)) }),
          what: { means: 'The goal of this session and how long ago it last did something. The goal is the key words of your first message or the sentence you set with /vaken-tasks goal.', facts: [recapWords({ gapMs: facts.gapMs ?? 0, ...(facts.branch === undefined ? {} : { branch: facts.branch }), ...(facts.contextPercent === undefined ? {} : { contextPercent: facts.contextPercent }), ...(facts.goal === undefined ? {} : { goal: facts.goal }) }, t)], next: BACK_NEXT, setting: 'cards.back' },
        }]
  const awayRow: BackGroupRow[] =
    shown === undefined
      ? []
      : [{ key: 'away', title: cut(say(shown.text.split('\n')[0] ?? ''), 90), right: fillIn(t(BACK_ENDED), { time: hhmm(shown.to) }), what: { means: 'What happened while away mode ran: which sessions finished or needed you, what vaken stopped and what waits for you.', facts: shown.text.split('\n').slice(1).filter(l => l.trim() !== '').slice(0, SHOWN_FACTS), next: '/vaken-away digest shows it in the session.', setting: 'away.digest' } }]
  const groups = [
    ...(was.length === 0 ? [] : [{ head: t(BACK_HEAD_WAS), rows: was }]),
    ...(facts.open.length === 0 ? [] : [{ head: t(BACK_HEAD_OPEN), rows: openRows(facts, t) }]),
    ...(awayRow.length === 0 ? [] : [{ head: t(BACK_HEAD_AWAY), rows: awayRow }]),
  ]
  const rows = groups.length === 0 ? [{ head: '', rows: [{ key: 'none', title: short, what } as BackGroupRow] }] : groups
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
