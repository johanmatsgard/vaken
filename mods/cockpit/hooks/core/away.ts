// Away mode and recap, built on the one away switch. Pure rules and words.
import type { AwayAsk } from './guardworld'
import { AWAY_DENY_WHAT, AWAY_OFF_WHAT, AWAY_ON_WHAT, parseAwayAsk } from './guardworld'
import { CAP_HOLD_WHAT } from './agentcap'
import { HELD_WHAT as BUDGET_HELD_WHAT } from './budget'
import { itemShort, waitWord } from './inbox'
import type { InboxItem } from './inbox'
import { didLine } from './ledger'
import type { Entry } from './ledger'
import { moneyEn as money } from './prices'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { hhmm } from './time'
import { tEn } from '../i18n/t'

export const AWAY_SETTINGS: Setting[] = [
  {
    key: 'away.digest',
    group: 'Attention',
    label: 'Away recap',
    note: 'A summary of what happened when you end away mode.',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
]

export const AWAY_HELP: HelpEntry[] = [
  { title: 'Away mode: what vaken does while I am gone', text: '/vaken-away on 2h tells vaken you are gone for two hours. It sets the away policy to Careful and the cost budget to Stop, and puts both back when it ends. /vaken-away off ends it early.' },
  { title: 'Away mode: the summary when I am back', text: 'When away mode ends, vaken tells you which sessions finished or needed you, how many risky steps it stopped, about what it cost, and what waits for you. /vaken-away digest shows it again.' },
]


export const DIGEST_WHAT = 'Ended away mode with a digest'
export const AWAY_WHATS: readonly string[] = [DIGEST_WHAT]
export const AWAY_SAVED_KEY = 'cockpit:away:saved'
export const AWAY_RUN_KEY = 'cockpit:away:run'
export const AWAY_EVENTS_KEY = 'cockpit:away:events'
export const DIGEST_KEY = 'cockpit:digest:last'
export const COST_STATE_PREFIX = 'cockpit:cost:s:'
export const POLICY_SET = 'careful'
export const BUDGET_SET = 'stop'
const EVENTS_MAX = 100
// A full ledger may have lost the oldest entries.
export const LEDGER_FULL = 60


const DURATION_MIN_MS = 60_000
const DURATION_MAX_MS = 24 * 3_600_000
export const DURATION_HELP = 'Say how long like this: /vaken-away on 2h, /vaken-away on 90m, /vaken-away on 1h30m. It can be from 1 minute to 24 hours.'

const DURATION = /^(?:for\s+)?(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)(?:\s*(\d+)\s*(m|min|mins|minute|minutes))?$/

export function parseDuration(text: string): number | undefined {
  const m = DURATION.exec(text.trim().toLowerCase())
  if (m === null) return undefined
  const isHour = (m[2] ?? '').startsWith('h')
  if (m[3] !== undefined && !isHour) return undefined
  const ms = Number(m[1]) * (isHour ? 3_600_000 : 60_000) + (m[3] === undefined ? 0 : Number(m[3]) * 60_000)
  return Number.isFinite(ms) && ms >= DURATION_MIN_MS && ms <= DURATION_MAX_MS ? Math.round(ms) : undefined
}

type AwayCall = { ask: AwayAsk; forMs?: number; durationError?: string; passArgs: string }
export function awayCall(args: string): AwayCall {
  const m = /^on\s+(.+)$/i.exec(args.trim())
  if (m !== null) {
    const ms = parseDuration(m[1] ?? '')
    return ms === undefined ? { ask: { kind: 'bad', why: DURATION_HELP }, durationError: DURATION_HELP, passArgs: args } : { ask: { kind: 'on' }, forMs: ms, passArgs: 'on' }
  }
  return { ask: parseAwayAsk(args), passArgs: args }
}


export type Run = { at: number; until?: number; costBase: Record<string, number> }
export type Saved = { policy?: { old: string | null; set: string }; budget?: { old: string | null; set: string; limit?: number } }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const oldOf = (v: unknown): string | null | undefined => (v === null ? null : typeof v === 'string' ? v : undefined)

export function parseRun(raw: unknown): Run | undefined {
  if (!isObj(raw) || typeof raw.at !== 'number') return undefined
  const base: Record<string, number> = {}
  if (isObj(raw.costBase)) for (const [k, v] of Object.entries(raw.costBase)) if (typeof v === 'number' && Number.isFinite(v)) base[k] = v
  return { at: raw.at, ...(typeof raw.until === 'number' ? { until: raw.until } : {}), costBase: base }
}

export function parseSaved(raw: unknown): Saved {
  const out: Saved = {}
  if (!isObj(raw)) return out
  if (isObj(raw.policy) && oldOf(raw.policy.old) !== undefined && typeof raw.policy.set === 'string') out.policy = { old: oldOf(raw.policy.old) as string | null, set: raw.policy.set }
  if (isObj(raw.budget) && oldOf(raw.budget.old) !== undefined && typeof raw.budget.set === 'string') out.budget = { old: oldOf(raw.budget.old) as string | null, set: raw.budget.set, ...(typeof raw.budget.limit === 'number' ? { limit: raw.budget.limit } : {}) }
  return out
}

const word = (v: string | null): string => {
  const t = v ?? 'off'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function modeLines(run: Run, saved: Saved, now: number): string[] {
  const lines: string[] = [`Away mode is on since ${hhmm(run.at)}. ${run.until === undefined ? 'It stays on until you type /vaken-away off.' : `It ends at ${hhmm(run.until)} (in ${waitWord(run.until - now)}), or when you type /vaken-away off.`}`]
  if (saved.policy !== undefined) lines.push(`Vaken set the away policy to ${word(saved.policy.set)} (it was ${word(saved.policy.old)}): risky steps are stopped by themselves.`)
  if (saved.budget !== undefined) lines.push(`Vaken set the cost budget to ${word(saved.budget.set)}${saved.budget.limit === undefined ? '' : ` at ${money(saved.budget.limit)} a session`} (it was ${word(saved.budget.old)}): costly calls stop at 100%.`)
  if (saved.policy !== undefined || saved.budget !== undefined) lines.push('Both go back when away mode ends.')
  return lines
}

export type Restore = { policy?: 'back' | 'kept'; budget?: 'back' | 'kept' }
export function restoreLines(saved: Saved, r: Restore): string[] {
  const lines: string[] = []
  if (saved.policy !== undefined && r.policy !== undefined) lines.push(r.policy === 'back' ? `The away policy is back to ${word(saved.policy.old)}.` : 'The away policy stays as you changed it.')
  if (saved.budget !== undefined && r.budget !== undefined) lines.push(r.budget === 'back' ? `The cost budget is back to ${word(saved.budget.old)}.` : 'The cost budget stays as you changed it.')
  return lines
}


export type AwayEvent = { id: string; sid: string; name: string; kind: 'finished' | 'needs'; at: number }
type WatchRow = { sid: string; name: string; kind: string; since: number }

export function watchEvents(rows: WatchRow[], from: number, known: AwayEvent[]): AwayEvent[] {
  const out = [...known]
  for (const r of rows) {
    if (r.since < from || (r.kind !== 'waiting' && r.kind !== 'needs')) continue
    const kind = r.kind === 'waiting' ? 'finished' : 'needs'
    const id = `${kind}:${r.sid}:${r.since}`
    if (!out.some(x => x.id === id)) out.push({ id, sid: r.sid, name: r.name, kind, at: r.since })
  }
  return out.slice(-EVENTS_MAX)
}

export function parseEvents(raw: unknown): AwayEvent[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is AwayEvent => isObj(x) && typeof x.id === 'string' && typeof x.sid === 'string' && typeof x.name === 'string' && (x.kind === 'finished' || x.kind === 'needs') && typeof x.at === 'number').slice(-EVENTS_MAX)
}


export function costSince(base: Record<string, number>, now: Record<string, number>): number {
  let sum = 0
  for (const [sid, usd] of Object.entries(now)) sum += Math.max(0, usd - (base[sid] ?? 0))
  return sum
}


export type DigestFacts = {
  from: number
  to: number
  ledger: Entry[]
  events: AwayEvent[]
  spent?: number
  waiting: InboxItem[]
  ended: boolean
}
export type Digest = { headline: string; text: string }

const SKIP = new Set([AWAY_ON_WHAT, AWAY_OFF_WHAT, DIGEST_WHAT])
const SHOWN = 8
const NOTHING_HAPPENED = 'Nothing happened while you were away.'

export function buildDigest(f: DigestFacts): Digest {
  const did = f.ledger.filter(e => e.did === true && e.at >= f.from && e.at <= f.to && !SKIP.has(e.what))
  const isRisky = (e: Entry): boolean => e.what === AWAY_DENY_WHAT || (/^Held an? /.test(e.what) && e.what !== BUDGET_HELD_WHAT && e.what !== CAP_HOLD_WHAT)
  const risky = did.filter(isRisky)
  const stops = did.filter(e => e.what === BUDGET_HELD_WHAT)
  const finished = new Set(f.events.filter(x => x.kind === 'finished').map(x => x.sid)).size
  const needed = new Set(f.events.filter(x => x.kind === 'needs').map(x => x.sid)).size

  // When the ledger lost lines from the away time, stopped-step counts are a least.
  const ledgerCut = f.ledger.length >= LEDGER_FULL && (f.ledger.at(-1)?.at ?? 0) > f.from
  const atLeast = ledgerCut ? 'at least ' : ''
  const parts: string[] = []
  if (finished > 0) parts.push(`${tEn('words.session', { n: finished })} finished`)
  if (needed > 0) parts.push(`${tEn('words.session', { n: needed })} needed you`)
  if (risky.length > 0) parts.push(`${atLeast}${tEn('words.risky_step_stopped', { n: risky.length })}`)
  if (stops.length > 0) parts.push(`${atLeast}${tEn('words.costly_call_stopped', { n: stops.length })}`)
  if (f.spent !== undefined && f.spent > 0) parts.push(`about ${money(f.spent)} spent (estimate)`)
  const counted = new Set([...risky, ...stops])
  const others: { what: string; n: number }[] = []
  for (const e of did) {
    if (counted.has(e)) continue
    const old = others.find(o => o.what === e.what)
    if (old === undefined) others.push({ what: e.what, n: 1 })
    else old.n += 1
  }
  const lead = `${f.ended ? 'While you were away' : 'So far while you are away'} (${waitWord(f.to - f.from)})`
  const headline = parts.length > 0 ? `${lead}: ${parts.join(', ')}.` : others.length > 0 ? 'Little happened while you were away.' : f.ended ? NOTHING_HAPPENED : 'Nothing happened yet while you are away.'
  if (parts.length === 0 && others.length === 0 && f.waiting.length === 0 && !ledgerCut) return { headline, text: headline }

  const lines: string[] = [headline, '']
  if (f.waiting.length === 0) lines.push('Nothing waits for you.')
  else {
    lines.push('Waiting for you:')
    for (const it of f.waiting.slice(0, SHOWN)) lines.push(`- ${itemShort(it, f.to)}`)
    if (f.waiting.length > SHOWN) lines.push(`- and ${f.waiting.length - SHOWN} more. /vaken inbox lists them all.`)
  }
  if (others.length > 0) lines.push('', `Vaken also did this: ${others.map(didLine).join(' ')}`)
  if (ledgerCut) lines.push('', `The ledger keeps only the last ${LEDGER_FULL} entries, so the oldest ones from this time may be missing.`)
  return { headline, text: lines.join('\n') }
}


type SavedDigest = { at: number; from: number; to: number; text: string }
export function parseDigest(raw: unknown): SavedDigest | undefined {
  return isObj(raw) && typeof raw.at === 'number' && typeof raw.from === 'number' && typeof raw.to === 'number' && typeof raw.text === 'string' ? { at: raw.at, from: raw.from, to: raw.to, text: raw.text } : undefined
}
export const digestText = (d: SavedDigest, _now: number): string => d.text
export const NO_DIGEST = 'There is no digest yet. Vaken makes one when you end away mode: /vaken-away off.'


export const timerEndDetail = 'The time you set ran out.'
export const timerToast = 'Away mode ended: the time ran out. /vaken-away digest shows what happened.'
export const seenToast = 'Away mode ended. /vaken-away digest shows what happened.'
