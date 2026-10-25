// Question relay: a tool server (MCP) asks the person something in one session, and the band of every other session says so in one plain line,
// with a press that opens that session. Vaken never answers: the app's own dialog does. Each session keeps its open questions on its own record
// (core/record.ts `questions`): a hash of the question and when it came, never its words, so another session can name the session but not the question.
import type { Question } from './record'
import { tEn } from './lang'

// A question not answered in this time is let go (the server has given up on it by then)
export const RELAY_KEEP_MS = 30 * 60_000
const QUESTIONS_MAX = 8

// What the band draws: which session asks, by its name, and how to open it (the app's link, or its id for the app's window tool)
export type RelayView = { sid: string; name: string; at: number; link?: string; appId?: string }

export const liveQuestions = (list: readonly Question[] | undefined, now: number): Question[] => (list ?? []).filter(q => now - q.at < RELAY_KEEP_MS && q.at <= now + 60_000)

// A question that came: newest first, one entry per question, old ones let go
export function withQuestion(list: readonly Question[] | undefined, h: string, now: number): Question[] {
  return [{ h, at: now }, ...liveQuestions(list, now).filter(q => q.h !== h)].slice(0, QUESTIONS_MAX)
}

// A question answered, turned down or cancelled: that one goes; with no known hash the oldest goes, as questions are answered in turn
export function withoutQuestion(list: readonly Question[] | undefined, h: string | undefined): Question[] {
  const all = [...(list ?? [])]
  const gone = h !== undefined && all.some(q => q.h === h) ? h : [...all].sort((a, b) => a.at - b.at)[0]?.h
  return gone === undefined ? all : all.filter(q => q.h !== gone)
}

// The question the band names: the newest of another live session still known by name; this session's own shows in the app's dialog
export type Asker = { sid: string; name: string; questions?: readonly Question[]; link?: string; appId?: string }
export function relayOf(askers: readonly Asker[], here: string, now: number): RelayView | undefined {
  let best: RelayView | undefined
  for (const a of askers) {
    if (a.sid === here || a.name.trim() === '') continue
    for (const q of liveQuestions(a.questions, now)) {
      if (best !== undefined && best.at >= q.at) continue
      best = { sid: a.sid, name: a.name, at: q.at, ...(a.link === undefined ? {} : { link: a.link }), ...(a.appId === undefined ? {} : { appId: a.appId }) }
    }
  }
  return best
}

// The band's words by their names in the text table: the whole sentence, and the short form a narrow band keeps (the session's name is never cut)
export const RELAY_FULL = 'band.relay_tool_asks'
export const RELAY_SHORT = 'band.relay_question_in'
export const RELAY_OPEN = 'band.relay_open_session'
export const RELAY_OPEN_FAILED = 'band.relay_open_failed'
type Say = (name: string, vars?: Record<string, string | number>) => string
export const relayWords = (r: RelayView, say: Say = tEn): { text: string; short: string } => ({ text: say(RELAY_FULL, { name: r.name }), short: say(RELAY_SHORT, { name: r.name }) })

// The app's window tool shows a session in this window's main pane (core/popout.ts uses the same tool for a new window)
export const relayOpenArgs = (r: RelayView): { session_id: string; target: 'focus' } => ({ session_id: r.appId ?? r.sid, target: 'focus' })
