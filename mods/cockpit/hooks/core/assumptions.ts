// Assumption review: counts the "Assumed:" lines Claude lists before changing files. No model call.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { fmt } from './fmt'
import { t, tEn, tr } from '../i18n/t'
import { fillIn } from './fillin'
import { langNow } from './lang'

export const ASSUME_KEY = 'assume.check'
const ASSUME_MIN_WORDS = 25
const ASSUME_MAX_LINES = 4
const ASSUME_LINE_CHARS = 80
export const ASSUME_BAND_MS = 10 * 60_000
// The note stays in the chat once sent, so it is sent again only after this long in the same session
export const ASSUME_AGAIN_MS = 60 * 60_000
// en-only: a note to Claude
export const ASSUME_NOTE = "Vaken note: before you change files, list your assumptions in at most 4 short lines starting with 'Assumed:'."

export const ASSUME_SETTINGS: Setting[] = [
  {
    key: ASSUME_KEY,
    group: 'Prompts',
    label: 'Assumption review',
    note: 'Claude lists its assumptions before big changes. You see how many.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'off',
  },
]
export const ASSUME_HELP: HelpEntry[] = [
  {
    title: 'What the assumption review does',
    text: 'For a message of 25 words or more, at most once an hour in a session, this asks Claude to list its assumptions in at most 4 short lines that start with "Assumed:" before it changes files. After the answer the line above the chat box shows how many. /vaken-explain assumptions lists them.',
  },
]

const wordCount = (text: string): number => text.trim().split(/\s+/).filter(w => w !== '').length
export const wantsNote = (text: string, lastAt?: number, now = 0): boolean => wordCount(text) >= ASSUME_MIN_WORDS && (lastAt === undefined || now - lastAt >= ASSUME_AGAIN_MS)

const LINE = /^\s*(?:[-*•]\s+)?Assumed:\s*(.*)$/
type Found = { count: number; lines: string[] }
export function findAssumed(answer: string): Found {
  const lines: string[] = []
  let count = 0
  for (const raw of answer.split('\n')) {
    const m = LINE.exec(raw)
    if (m === null) continue
    count += 1
    if (lines.length < ASSUME_MAX_LINES) lines.push(`Assumed: ${m[1]}`.trimEnd().slice(0, ASSUME_LINE_CHARS))
  }
  return { count, lines }
}

type Stored = { at: number; count: number; lines: string[] }
export const storeKey = (sessionId: string): string => `cockpit:assume:last:${sessionId}`
// When the note was last sent in a session
export const sentKey = (sessionId: string): string => `cockpit:assume:sent:${sessionId}`
export function parseStored(raw: unknown): Stored | undefined {
  const o = raw as Stored
  return typeof o === 'object' && o !== null && typeof o.at === 'number' && typeof o.count === 'number' && Array.isArray(o.lines) && o.lines.every(l => typeof l === 'string') ? o : undefined
}

export const bandText = (count: number): string => `Claude assumed ${tEn('words.thing', { n: count })}. /vaken-explain assumptions`

// Said in the language of this draw: only the text twin reads it
const ago = (ms: number): string => fmt.ago(ms, 'plain', langNow())

export function assumptionsText(stored: Stored | undefined, isOn: boolean, now: number): string {
  if (stored === undefined || stored.count === 0) return isOn ? tr('No assumptions listed yet in this session.') : tr('No assumptions listed. The assumption review is off. Turn it on: Settings > Prompts and memory.')
  const more = stored.count > stored.lines.length ? [fillIn(tr('({n} more not kept.)'), { n: stored.count - stored.lines.length })] : []
  return [fillIn(tr('Claude listed {what} {ago}:'), { what: t('words.assumption', { n: stored.count }), ago: ago(now - stored.at) }), ...stored.lines, ...more].join('\n')
}
