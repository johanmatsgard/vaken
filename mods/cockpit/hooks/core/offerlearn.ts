// Learn from outcomes: which of vaken's own offers this person presses, which then worked, and which they leave or put off. Kinds and counts only, per project:
// never a prompt, a file name or any words of the session. The counts rank the next step buttons and quiet an offer put off 3 times in a row, for a week.
import type { Io } from './io'
import type { ActionId } from './actions'
import { serialUpdate } from './serial'
import { hashOf } from './proof'
import { tEn } from '../i18n/t'
import { weekStamp } from './value'

// Next step buttons by their own id; `fixit` the Fix press on a failed check, `stuck` the stuck ladder, `compact` Compact now, `fit` the model and effort hint, `teach` the Learn from you offer, `repeat` the Repeat to skill offer.
export type OfferKind = ActionId | 'fixit' | 'stuck' | 'compact' | 'fit' | 'teach' | 'repeat'
export const OFFER_KINDS: readonly OfferKind[] = ['tests', 'commit', 'diff', 'continue', 'fix', 'fixit', 'stuck', 'compact', 'fit', 'teach', 'repeat']
const isKind = (v: unknown): v is OfferKind => typeof v === 'string' && (OFFER_KINDS as readonly string[]).includes(v)

export type OfferEvent = 'shown' | 'pressed' | 'worked' | 'ignored' | 'dismissed'
const EVENTS: readonly OfferEvent[] = ['shown', 'pressed', 'worked', 'ignored', 'dismissed']

// `streak` the put-offs in a row since the last press; `quietUntil` set by the third one.
export type Tally = { shown: number; pressed: number; worked: number; ignored: number; dismissed: number; streak: number; quietUntil?: number }
// `week` the Monday stamp of the week counted in `wk` (value.ts weekStamp), so the weekly line says this week only.
export type OfferBook = { kinds: Partial<Record<OfferKind, Tally>>; week?: string; wk: Partial<Record<OfferKind, Tally>> }

export const QUIET_AFTER = 3
export const QUIET_MS = 7 * 24 * 3_600_000
// Ranking starts once this many buttons were offered in the project; before that the facts of the turn keep their order.
export const RANK_MIN = 10
// Counts are capped, so an old habit can still change.
const COUNT_MAX = 500
// Pending events are written at most every 10 minutes from the busy hooks; a press writes at once.
export const FLUSH_MS = 10 * 60_000
const PENDING_MAX = 200

// Per project, by the hash of its root (as Learn from you keeps its counts)
export const offersKey = (root: string): string => `cockpit:offers:${hashOf(root)}`
const emptyTally = (): Tally => ({ shown: 0, pressed: 0, worked: 0, ignored: 0, dismissed: 0, streak: 0 })
export const emptyBook = (): OfferBook => ({ kinds: {}, wk: {} })

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(COUNT_MAX, Math.floor(v)) : 0)
function parseTally(v: unknown): Tally | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const o = v as Record<string, unknown>
  const q = typeof o.quietUntil === 'number' && Number.isFinite(o.quietUntil) ? o.quietUntil : undefined
  return { shown: num(o.shown), pressed: num(o.pressed), worked: num(o.worked), ignored: num(o.ignored), dismissed: num(o.dismissed), streak: num(o.streak), ...(q === undefined ? {} : { quietUntil: q }) }
}
function parseKinds(v: unknown): Partial<Record<OfferKind, Tally>> {
  const out: Partial<Record<OfferKind, Tally>> = {}
  if (typeof v !== 'object' || v === null) return out
  for (const [k, t] of Object.entries(v)) {
    const tally = parseTally(t)
    if (isKind(k) && tally !== undefined) out[k] = tally
  }
  return out
}
export function parseBook(raw: unknown): OfferBook {
  if (typeof raw !== 'object' || raw === null) return emptyBook()
  const o = raw as Record<string, unknown>
  return { kinds: parseKinds(o.kinds), wk: parseKinds(o.wk), ...(typeof o.week === 'string' ? { week: o.week } : {}) }
}

const bump = (t: Tally, ev: OfferEvent): Tally => ({ ...t, [ev]: Math.min(COUNT_MAX, t[ev] + 1) })

// One event on the book. A press ends a streak of put-offs; the third put-off in a row quiets the offer for a week and starts a new count.
export function noteOffer(book: OfferBook, kind: OfferKind, ev: OfferEvent, at: number, week: string): OfferBook {
  const old = book.kinds[kind] ?? emptyTally()
  let t = bump(old, ev)
  if (ev === 'pressed') t = { ...t, streak: 0 }
  if (ev === 'dismissed') t = t.streak + 1 >= QUIET_AFTER ? { ...t, streak: 0, quietUntil: at + QUIET_MS } : { ...t, streak: t.streak + 1 }
  const wk = book.week === week ? book.wk : {}
  return { kinds: { ...book.kinds, [kind]: t }, week, wk: { ...wk, [kind]: bump(wk[kind] ?? emptyTally(), ev) } }
}

export const quietNow = (book: OfferBook, kind: OfferKind, now: number): boolean => {
  const q = book.kinds[kind]?.quietUntil
  return q !== undefined && now < q
}

// How often this person presses a button when it is offered, smoothed so an offer with no history counts as even.
export const useRate = (t: Tally | undefined): number => ((t?.pressed ?? 0) + 1) / ((t?.shown ?? 0) + 2)

// The next step buttons in the order this person uses them; Fix it stays first after a failure, and too little history keeps the order of the facts.
export function rankPicks(ids: readonly ActionId[], book: OfferBook): ActionId[] {
  const offered = (['tests', 'commit', 'diff', 'continue', 'fix'] as const).reduce((n, k) => n + (book.kinds[k]?.shown ?? 0), 0)
  if (offered < RANK_MIN) return [...ids]
  const head = ids[0] === 'fix' ? ['fix' as ActionId] : []
  const rest = ids.filter(id => !head.includes(id))
  const ranked = rest.map((id, n) => ({ id, n, r: useRate(book.kinds[id]) })).sort((a, b) => b.r - a.r || a.n - b.n).map(x => x.id)
  return [...head, ...ranked]
}

// ---- memory and writes (no store read on the busy hooks: the book is read once a session and events wait in memory)
type Pending = { kind: OfferKind; ev: OfferEvent; at: number }
// `wait`: an offer pressed whose outcome the end of the next answer tells (a check passed after Fix, the loop ended after the stuck ladder)
export const learnMem: { root?: string; book: OfferBook; pending: Pending[]; flushedAt?: number; wait?: { kind: OfferKind; at: number } } = { book: emptyBook(), pending: [] }

export function forgetLearn(): void {
  learnMem.root = undefined
  learnMem.book = emptyBook()
  learnMem.pending = []
  learnMem.flushedAt = undefined
  learnMem.wait = undefined
}

export async function loadLearn(i: Io, root: string): Promise<void> {
  learnMem.root = root
  learnMem.book = parseBook(await i.get(offersKey(root)))
  learnMem.flushedAt = await i.now()
}

// Counted in memory at once (ranking and quiet see it), written later.
export function learnNote(kind: OfferKind, ev: OfferEvent, at: number, week: string): void {
  if (learnMem.root === undefined || !EVENTS.includes(ev)) return
  learnMem.book = noteOffer(learnMem.book, kind, ev, at, week)
  learnMem.pending = [...learnMem.pending, { kind, ev, at }].slice(-PENDING_MAX)
}

// Writes the pending events onto what the store holds now (another session of the project may have counted too). Never throws.
export async function flushLearn(i: Io, week: string, force = false): Promise<void> {
  try {
    const root = learnMem.root
    if (root === undefined || learnMem.pending.length === 0) return
    const now = await i.now()
    if (!force && learnMem.flushedAt !== undefined && now - learnMem.flushedAt < FLUSH_MS) return
    const events = learnMem.pending
    learnMem.pending = []
    learnMem.flushedAt = now
    learnMem.book = await serialUpdate(i, offersKey(root), old => events.reduce((b, e) => noteOffer(b, e.kind, e.ev, e.at, week), parseBook(old)))
  } catch {
    // a missed write only loses these counts
  }
}

// An event on one of vaken's offers from a press or an answer in the pane: counted at once and written at once. Never throws.
// `waits`: the outcome of the press is read at the end of the next answer (features/nextsteps.ts).
export async function notePress(i: Io, kind: OfferKind, ev: OfferEvent = 'pressed', waits = ev === 'pressed'): Promise<void> {
  try {
    const now = await i.now()
    learnNote(kind, ev, now, weekStamp(now))
    if (waits) learnMem.wait = { kind, at: now }
    await flushLearn(i, weekStamp(now), true)
  } catch {
  }
}

// The one line in the weekly value view: this week's presses, what worked, what was left. Undefined when nothing was offered this week.
export const OFFER_NAMES: Record<OfferKind, string> = { tests: 'Run tests', commit: 'Commit', diff: 'What changed', continue: 'Continue', fix: 'Fix it', fixit: 'Fix it', stuck: 'Stuck on a check', compact: 'Compact now', fit: 'Model and effort', teach: 'Learn from you', repeat: 'Repeat to skill' }
export function offersLine(book: OfferBook, week: string): string | undefined {
  if (book.week !== week) return undefined
  const all = Object.entries(book.wk) as [OfferKind, Tally][]
  const sum = (f: (t: Tally) => number): number => all.reduce((n, [, t]) => n + f(t), 0)
  const pressed = sum(t => t.pressed)
  const left = sum(t => t.ignored + t.dismissed)
  if (pressed + left === 0) return undefined
  const top = all.filter(([, t]) => t.pressed > 0).sort((a, b) => b[1].pressed - a[1].pressed || a[0].localeCompare(b[0]))[0]
  const line = tEn('band.offers_this_week', { pressed, worked: sum(t => t.worked), left })
  return top === undefined ? line : `${line} ${tEn('band.offers_used_most', { name: OFFER_NAMES[top[0]] })}`
}
