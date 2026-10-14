// Parking lot: side ideas kept per project for later, added without starting a turn and sent to Claude later as a prompt.
import type { HelpEntry } from './registry'
import { fmt } from './fmt'

const PARK_MAX = 30
const PARK_TEXT_MAX = 300
export const PARKING_HELP: HelpEntry[] = [{ title: 'What the parking lot is', text: '/vaken-memory park <idea> keeps a side idea for later without interrupting Claude. /vaken-memory park lists them. /vaken-memory park send 2 puts idea 2 into the prompt box. The ideas are text you write; they stay on your computer, one shelf per project.' }]

type Idea = { at: number; text: string }
export const parkKey = (projectHash: string): string => `cockpit:park:${projectHash}`

export const parseIdeas = (raw: unknown): Idea[] =>
  Array.isArray(raw) ? raw.filter((x): x is Idea => typeof (x as Idea)?.text === 'string' && typeof (x as Idea)?.at === 'number').slice(0, PARK_MAX) : []

export const clean = (text: string): string => text.replace(/\s+/g, ' ').trim().slice(0, PARK_TEXT_MAX)

type ParkAsk = { kind: 'list' } | { kind: 'add'; text: string } | { kind: 'send'; n: number } | { kind: 'drop'; n: number } | { kind: 'clear' } | { kind: 'bad'; why: string }

export function parseAsk(args: string): ParkAsk {
  const t = args.trim()
  if (t === '') return { kind: 'list' }
  const m = /^(send|drop|done)\s+(\d+)$/i.exec(t)
  if (m !== null) return { kind: m[1].toLowerCase() === 'send' ? 'send' : 'drop', n: Number(m[2]) }
  if (/^(send|drop|done)\b/i.test(t) && !/^(send|drop|done)\s+\S+\s+\S/i.test(t)) return { kind: 'bad', why: 'Say which idea: /vaken-memory park send 2' }
  if (/^clear$/i.test(t)) return { kind: 'clear' }
  const text = clean(t)
  return text === '' ? { kind: 'list' } : { kind: 'add', text }
}

const ago = (ms: number): string => fmt.ago(ms, 'list')

export function listText(ideas: Idea[], now: number): string {
  if (ideas.length === 0) return 'The parking lot is empty. Add an idea: /vaken-memory park <idea>'
  return [`Parked ideas (${ideas.length}):`, ...ideas.map((x, n) => `  ${n + 1}. ${x.text} (${ago(now - x.at)})`), '', 'Send one to the prompt box: /vaken-memory park send <n>. Remove one: /vaken-memory park drop <n>.'].join('\n')
}
