// A hidden probe that records pointer events a pane Client sends, to measure where the app really puts a press region. Only keys and numbers are kept.

export const PRESSLOG_KEY = 'cockpit:debug:presslog'
export const PRESSLOG_EVENTS_KEY = 'cockpit:debug:presslog:events'
export const PRESSLOG_MAX = 200 // about a minute of clicking
export const PRESSLOG_RECENT = 8 // so one lost to a newer post in the same frame still arrives with the next
const KEY_MAX = 80

export type PressLogEvent = { key: string; type: string; x: number; y: number; columns: number; rows: number; n: number; at: number }
// Numbered by the Client (`n`) so each is kept once.
export type PostedEvent = { n: number; type: string; x: number; y: number; columns: number; rows: number }

const TYPES = new Set(['down', 'up', 'enter', 'leave'])
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function cleanPosted(raw: unknown): PostedEvent[] {
  if (!Array.isArray(raw)) return []
  const out: PostedEvent[] = []
  for (const r of raw.slice(-PRESSLOG_RECENT)) {
    const e = r as Partial<PostedEvent> | null
    if (e === null || typeof e !== 'object' || typeof e.type !== 'string' || !TYPES.has(e.type)) continue
    if (!isNum(e.n) || !isNum(e.x) || !isNum(e.y) || !isNum(e.columns) || !isNum(e.rows)) continue
    out.push({ n: e.n, type: e.type, x: e.x, y: e.y, columns: e.columns, rows: e.rows })
  }
  return out
}

// A Client that starts its count again is read afresh.
export function appendLog(old: unknown, key: string, posted: PostedEvent[], seen: number | undefined, at: number, max = PRESSLOG_MAX): { log: PressLogEvent[]; seen: number | undefined } {
  const log = Array.isArray(old) ? (old as PressLogEvent[]) : []
  if (posted.length === 0) return { log, seen }
  const top = Math.max(...posted.map(e => e.n))
  const from = seen === undefined || top < seen ? -1 : seen
  const fresh = posted.filter(e => e.n > from).map(e => ({ key: key.slice(0, KEY_MAX), ...e, at }))
  return { log: [...log, ...fresh].slice(-max), seen: top }
}

export function pressLogText(isOn: boolean, log: unknown, last = 40): string {
  const rows = Array.isArray(log) ? (log as PressLogEvent[]) : []
  const head = `Press log: ${isOn ? 'on' : 'off'}. ${rows.length} events kept (the last ${PRESSLOG_MAX}). On, off or clear: /vaken-help run presslog on.` // en-only: a hidden probe's answer, for the builders
  const lines = rows.slice(-last).map(e => `${new Date(e.at).toISOString().slice(11, 23)} ${e.key} ${e.type} at ${e.x},${e.y} in ${e.columns}x${e.rows}`) // en-only: a hidden probe's answer, for the builders
  return [head, ...lines].join('\n')
}
