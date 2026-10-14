// The fresh-start nudge: a clearly different topic in a big chat suggests a new session. A local word test, no model call; only short hashes are kept.
import { hashOf, isPersonMessage } from './proof'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { percentOf } from './words'

export const FRESH_SETTINGS: Setting[] = [
  {
    key: 'fresh.nudge',
    group: 'Autopilot',
    label: 'Fresh-start nudge',
    note: 'Says when a new topic would cost less in a new session.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]
export const FRESH_HELP: HelpEntry[] = [
  { title: 'When does it suggest a fresh session?', text: 'When a new message is on a new topic and the session is big, vaken says a fresh session costs less. It compares key words on your computer and keeps only short codes, never your words. It only shows a line above the chat box and never writes to Claude.' },
  { title: 'When the fresh-start nudge stays quiet', text: 'It never fires for a command that starts with /, or for a message that continues the work (also, and then, continue, next). It shows at most once in 2 hours. /vaken-explain fresh explains the last decision.' },
]

export const FRESH_WHAT = 'Suggested a fresh session'
export const FRESH_TEXT = 'New topic? A fresh session costs less.'
export const FRESH_BAND_ID = 'fresh'
export const FRESH_TTL_MS = 10 * 60_000
const FRESH_MIN_TOKENS = 80_000
const FRESH_MIN_WORDS = 6
const FRESH_OVERLAP = 0.1
const FRESH_KEEP_PROMPTS = 5
const FRESH_WORDS_MAX = 40
const FRESH_MIN_HISTORY = 8
export const FRESH_GAP_MS = 2 * 60 * 60_000

const STOP = new Set(
  ('about above after again also always among another because been before being between both cannot could does doing done down during each either else even ever every ' +
    'from further have having here hers herself himself into itself just keep know like made make many might more most much must myself need needs never next once ' +
    'only other ours ourselves over please rather really same shall should since some something such take than that their theirs them themselves then there these ' +
    'they thing things think this those through today under until upon very want wants were what whatever when where whether which while whom whose will with within ' +
    'without would yeah your yours yourself yourselves ' +
    'också från inte några skulle kunna behöver vill mycket efter innan eller detta dessa deras ').split(' '),
)

export function wordHashes(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const w of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (w.length < 4 || STOP.has(w) || /^\p{N}+$/u.test(w) || seen.has(w)) continue
    seen.add(w)
    out.push(hashOf(w))
    if (out.length >= FRESH_WORDS_MAX) break
  }
  return out
}

export const continues = (text: string): boolean => /^\s*(?:also|and then|and also|continue|next|keep going|go on|then)\b/i.test(text)

export type FreshState = {
  prompts: string[][]
  nudgeAt?: number
  last?: { at: number; fire: boolean; why: string }
}
export const freshKey = (sessionId: string): string => `cockpit:fresh:${sessionId}`
export function readFresh(v: unknown): FreshState {
  if (typeof v !== 'object' || v === null) return { prompts: [] }
  const o = v as Partial<FreshState>
  const prompts = Array.isArray(o.prompts) ? o.prompts.filter((p): p is string[] => Array.isArray(p) && p.every(x => typeof x === 'string')).slice(-FRESH_KEEP_PROMPTS) : []
  return { prompts, ...(typeof o.nudgeAt === 'number' ? { nudgeAt: o.nudgeAt } : {}), ...(typeof o.last === 'object' && o.last !== null && typeof o.last.why === 'string' ? { last: o.last } : {}) }
}

type FreshFacts = { mode: string; text: string; origin?: { kind?: string }; tokens?: number; now: number; state: FreshState }
type FreshVerdict = { fire: boolean; why: string; hashes: string[]; record: boolean }

const k = (n: number): string => `${Math.round(n / 1000)}k`

export function judgeFresh(f: FreshFacts): FreshVerdict {
  const no = (why: string, hashes: string[] = [], record = true): FreshVerdict => ({ fire: false, why, hashes, record })
  if (f.mode !== 'on') return no('The nudge is off. Turn it on: Settings > Prompts and memory.', [], false)
  if (!isPersonMessage(f.text, f.origin)) return no('That was a command, not a message, so nothing was checked.', [], false)
  const hashes = wordHashes(f.text)
  if (continues(f.text)) return no('The last message continued the work, so there is no nudge.', hashes)
  if (hashes.length < FRESH_MIN_WORDS) return no(`The last message was too short to compare (under ${FRESH_MIN_WORDS} key words).`, hashes)
  if (f.tokens === undefined) return no('The size of the session is not known yet.', hashes)
  if (f.tokens < FRESH_MIN_TOKENS) return no(`The session holds ${k(f.tokens)} tokens, under ${k(FRESH_MIN_TOKENS)}. A fresh start would save little.`, hashes)
  const before = new Set(f.state.prompts.flat())
  if (before.size < FRESH_MIN_HISTORY) return no('There are not enough earlier messages to compare with yet.', hashes)
  const shared = hashes.filter(h => before.has(h)).length
  const share = shared / hashes.length
  const pct = percentOf(share)
  if (share >= FRESH_OVERLAP) return no(`Same topic: ${pct}% of the key words match the earlier messages.`, hashes)
  if (f.state.nudgeAt !== undefined && f.now - f.state.nudgeAt < FRESH_GAP_MS) return no(`New topic (${pct}% match), but the nudge showed less than 2 hours ago.`, hashes)
  return { fire: true, why: `New topic: ${pct}% of the key words match. The session holds ${k(f.tokens)} tokens. The nudge showed.`, hashes, record: true }
}

export function advanceFresh(state: FreshState, v: FreshVerdict, now: number): FreshState {
  return {
    prompts: v.hashes.length === 0 ? state.prompts : [...state.prompts, v.hashes].slice(-FRESH_KEEP_PROMPTS),
    ...(v.fire ? { nudgeAt: now } : state.nudgeAt === undefined ? {} : { nudgeAt: state.nudgeAt }),
    last: { at: now, fire: v.fire, why: v.why },
  }
}

export function freshLine(mode: string, state: FreshState): string {
  if (mode !== 'on') return 'Fresh-start nudge: off. Turn it on: Settings > Prompts and memory.'
  return `Fresh-start nudge: on. ${state.last === undefined ? 'No message checked yet.' : state.last.why}`
}
