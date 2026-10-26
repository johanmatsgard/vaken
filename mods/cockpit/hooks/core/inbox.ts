// The approvals inbox and steering: one list of what waits for the person across sessions, plus a short prompt queue per session. A mod cannot answer a permission prompt, so it tells the person where to go.
import { CAP_HOLD_WHAT } from './agentcap'
import { EXTENDED_WHAT, HELD_WHAT as BUDGET_HELD_WHAT } from './budget'
import { ALLOW_TTL_MS, ALLOW_USED_WHAT, DISMISS_WHAT } from './guard'
import { shownTitle } from './ledger'
import type { Entry } from './ledger'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { t, tEn, tr, trFill } from '../i18n/t'
import { ageWord } from './time'
import { fillIn } from './fillin'

export const INBOX_SETTINGS: Setting[] = [
  {
    key: 'inbox.mode',
    group: 'Attention',
    label: 'Needs you list', // The card and the band chip say Needs you, so Settings does too
    note: 'A list of what needs you, and a count above the chat box.',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
]

export const INBOX_HELP: HelpEntry[] = [
  { title: 'What Needs you does', text: '/vaken inbox lists what waits for you in every session: stopped steps, questions, finished changes you have not looked at. Each line says which session, how long, and what you can do. It cannot press OK for you.' },
  { title: 'What steering does', text: '/vaken-pause steer queue puts a sentence in a session\'s queue. When that session is quiet, the sentence shows dim in its prompt box, and you press Tab to take it. /vaken-pause steer stop pauses changes in this session.' },
]


export const QUEUE_OFFER_WHAT = 'Offered a queued prompt'
export const STEER_STOP_WHAT = 'Stopped this session'
export const STEER_SEND_WHAT = 'Sent a message to another session'
export const INBOX_WHATS: readonly string[] = [QUEUE_OFFER_WHAT, STEER_STOP_WHAT, STEER_SEND_WHAT]


export const steerKey = (sid: string): string => `cockpit:steer:queue:${sid}`
// { item id: first-seen time } for items without a time of their own.
export const INBOX_SEEN_KEY = 'cockpit:inbox:seen'
export const INBOX_BAND_ID = 'inbox'
// A turn waiting for a look ('review') is no row of Needs you: it is a calm line on This session (cards/here.tsx), counted nowhere.
export const ROW_KINDS: ReadonlyArray<InboxItem['kind']> = ['hold', 'budget', 'cap', 'halt']
export const isRowItem = (x: InboxItem): boolean => ROW_KINDS.includes(x.kind) && !(x.kind === 'halt' && x.here)
// A stopped step whose Allow once has timed out (only Dismiss left) is no real wait: a calm row, not counted.
export const isStaleHold = (x: InboxItem): boolean => x.kind === 'hold' && x.stale === true
export const isCountedItem = (x: InboxItem): boolean => isRowItem(x) && !isStaleHold(x)
// The one rule for the held count, shared by the loader and the card header so they cannot drift. It counts groups, not entries.
export const heldNeedsCount = (items: InboxItem[]): number => items.filter(isCountedItem).length


// An age uses ageWord in core/time.ts.
export function waitWord(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60_000)
  if (min < 1) return 'under 1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h >= 24) return `${Math.floor(h / 24)} d`
  return min % 60 === 0 ? `${h} h` : `${h} h ${min % 60} min`
}


type ItemKind = 'question' | 'permission' | 'hold' | 'budget' | 'cap' | 'halt' | 'review'
// `promptAt`: the last message the person typed there.
export type SessionInfo = { sid: string; name: string; here: boolean; promptAt?: number }
export type InboxItem = {
  id: string
  kind: ItemKind
  sid: string
  name: string
  here: boolean
  what: string
  // `approx` when only the first sighting is known.
  since?: number
  // The yes lives ALLOW_TTL_MS from this time.
  lastAt?: number
  approx: boolean
  todo: string
  count: number
  allowed: boolean
  // An older hold stays listed but no longer offers the yes.
  stale?: boolean
}

export type InboxFacts = {
  now: number
  sessions: SessionInfo[]
  ledger: Entry[]
  allowed: string[]
  asks: { sid: string; kind: 'question' | 'permission'; tool: string; since: number }[]
  debts: { sid: string; turns: number }[]
  halts: { sid: string; at: number }[]
  seen: Record<string, number>
}

// A guess to tune.
export const HOLD_LIVE_MS = 3 * 3_600_000
const CAP_LIVE_MS = 15 * 60_000
const ORDER: Record<ItemKind, number> = { question: 0, permission: 1, hold: 2, budget: 3, cap: 4, halt: 5, review: 6 }

const isHeld = (e: Entry): boolean => e.did === true && /^Held an? /.test(e.what)

const TODO = {
  question: 'Open that session and answer it.',
  permission: 'Open that session and answer its question.',
  // No step words were kept, so only the typed way works.
  hold: 'Type /vaken-guard allow once in that session, or leave it stopped.',
  // Vaken never allows a step in another session.
  holdElsewhere: 'Open that session; its pane has Allow once.',
  holdStale: 'Try the step again in Claude. When it is stopped again, allow it then.',
  holdAllowed: 'You already allowed one step there. It goes through at the next stopped step.',
  budget: 'Type /vaken-usage budget extend in that session, or leave it stopped.',
  cap: 'Wait for an agent to finish, or raise the limit in Settings > Agents.',
  halt: 'Type /vaken-pause off in that session when you are ready.',
  haltElsewhere: 'Open that session and press Resume.',
  review: 'Look at the changes, then type /vaken-ship reviewed in that session.',
} as const
export const HOLD_ELSEWHERE_TODO = TODO.holdElsewhere
export const HERE_FALLBACK = 'This session'
export const HALT_ELSEWHERE_TODO = TODO.haltElsewhere

// The stored title's verb is shown as the one the pane uses.
export function shownWhat(what: string): string {
  const at = what.indexOf('. ')
  const head = at < 0 ? what.replace(/\.$/, '') : what.slice(0, at)
  const m = /^(.*?)( \(\d+ times\))?$/.exec(head)
  const title = `${shownTitle(m?.[1] ?? head)}${m?.[2] ?? ''}`
  return at < 0 ? `${title}${what.endsWith('.') ? '.' : ''}` : `${title}.${what.slice(at + 1)}`
}

// Most urgent first, oldest first inside a kind.
export function buildInbox(f: InboxFacts): InboxItem[] {
  const by = new Map(f.sessions.map(s => [s.sid, s]))
  const out: InboxItem[] = []
  const base = (sid: string): { name: string; here: boolean } | undefined => {
    const s = by.get(sid)
    return s === undefined ? undefined : { name: s.name, here: s.here }
  }

  for (const a of f.asks) {
    const b = base(a.sid)
    if (b === undefined) continue
    out.push({
      id: `ask:${a.sid}`,
      kind: a.kind,
      sid: a.sid,
      ...b,
      what: a.kind === 'question' ? 'Asks you a question.' : `Waits to run ${a.tool}. It may need your OK.`,
      since: a.since,
      approx: false,
      todo: a.kind === 'question' ? TODO.question : TODO.permission,
      count: 1,
      allowed: false,
    })
  }

  // A stopped step stays listed until the step goes through, the person dismisses it, or types a newer message in that session.
  const clearHold = new Map<string, number>()
  const clearBudget = new Map<string, number>()
  for (const s of f.sessions) if (s.promptAt !== undefined) clearHold.set(s.sid, s.promptAt)
  for (const e of f.ledger) {
    if (e.session === undefined) continue
    if (e.what === ALLOW_USED_WHAT || e.what === DISMISS_WHAT) clearHold.set(e.session, Math.max(clearHold.get(e.session) ?? 0, e.at))
    if (e.what === EXTENDED_WHAT) clearBudget.set(e.session, Math.max(clearBudget.get(e.session) ?? 0, e.at))
  }
  const groups = new Map<string, { sid: string; what: string; first: number; last: Entry; count: number }>()
  for (const e of f.ledger) {
    if (!isHeld(e) || e.session === undefined || !by.has(e.session)) continue
    const isBudget = e.what === BUDGET_HELD_WHAT
    const isCap = e.what === CAP_HOLD_WHAT
    const live = isCap ? CAP_LIVE_MS : HOLD_LIVE_MS
    if (f.now - e.at >= live || e.at <= ((isBudget ? clearBudget : isCap ? new Map<string, number>() : clearHold).get(e.session) ?? 0)) continue
    const key = `${e.session}|${e.what}`
    const g = groups.get(key)
    if (g === undefined) groups.set(key, { sid: e.session, what: e.what, first: e.at, last: e, count: 1 })
    else {
      g.first = Math.min(g.first, e.at)
      if (e.at > g.last.at) g.last = e
      g.count += 1
    }
  }
  for (const g of groups.values()) {
    const b = base(g.sid)
    if (b === undefined) continue
    const kind: ItemKind = g.what === BUDGET_HELD_WHAT ? 'budget' : g.what === CAP_HOLD_WHAT ? 'cap' : 'hold'
    const allowed = kind === 'hold' && f.allowed.includes(g.sid)
    const stale = kind === 'hold' && !allowed && f.now - g.last.at >= ALLOW_TTL_MS
    const detail = g.last.detail === undefined || g.last.detail === '' ? '' : ` ${g.last.detail.slice(0, 140)}`
    out.push({
      id: `${kind}:${g.sid}:${g.what}`,
      kind,
      sid: g.sid,
      ...b,
      what: `${g.what}${g.count > 1 ? ` (${g.count} times)` : ''}.${detail}`,
      since: g.first,
      lastAt: g.last.at,
      approx: false,
      todo: allowed ? TODO.holdAllowed : stale ? TODO.holdStale : kind === 'hold' && !b.here ? TODO.holdElsewhere : TODO[kind === 'budget' ? 'budget' : kind === 'cap' ? 'cap' : 'hold'],
      count: g.count,
      allowed,
      ...(stale ? { stale } : {}),
    })
  }

  for (const h of f.halts) {
    const b = base(h.sid)
    if (b === undefined) continue
    out.push({ id: `halt:${h.sid}`, kind: 'halt', sid: h.sid, ...b, what: 'Paused for safety. Commands, edits, tools, agents and web fetches are stopped.', since: h.at, approx: false, todo: b.here ? TODO.halt : TODO.haltElsewhere, count: 1, allowed: false })
  }

  for (const d of f.debts) {
    const b = base(d.sid)
    if (b === undefined || d.turns <= 0) continue
    const id = `review:${d.sid}`
    const seen = f.seen[id]
    out.push({
      id,
      kind: 'review',
      sid: d.sid,
      ...b,
      what: `${tEn('words.finished_answers_wait', { n: d.turns })}`,
      ...(seen === undefined ? {} : { since: seen }),
      approx: true,
      todo: TODO.review,
      count: d.turns,
      allowed: false,
    })
  }

  return out.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || (a.since ?? Infinity) - (b.since ?? Infinity))
}

// One per row, as the Needs you card shows them: repeats of one step are one row.
export const heldCount = (items: InboxItem[]): number => items.filter(x => (x.kind === 'hold' && !isStaleHold(x)) || x.kind === 'budget').length

export const inboxBandWords = (held: number): string => tEn('words.stopped_steps_wait', { n: held })


// In the language of this draw (English when none is set, as in a test)
const whereOf = (it: InboxItem): string => (it.here && it.name === HERE_FALLBACK ? tr(HERE_FALLBACK) : `${it.name}${it.here ? ` (${tr('this session')})` : ''}`)
export const isOpenHold = (it: InboxItem): boolean => it.kind === 'hold' && !it.allowed && it.stale !== true
// Same clock as the 30 minutes of the yes.
export const stoppedAt = (it: InboxItem): number | undefined => it.lastAt ?? it.since
// Ages use the pane's one age word (ageWord), not waitWord.
const stoppedWords = (ms: number): string => (ms < 60_000 ? tr('Stopped just now. It will not run unless you allow it.') : tr('Stopped {age} ago. It will not run unless you allow it.').replace('{age}', ageWord(ms, tr)))
const howLong = (it: InboxItem, now: number): string => {
  const at = isOpenHold(it) ? stoppedAt(it) : undefined
  if (at !== undefined) return `${stoppedWords(now - at)} `
  return it.since === undefined ? '' : `${(it.approx ? t('chat.waiting_at_least', { age: ageWord(now - it.since, tr) }) : t('chat.waiting', { age: ageWord(now - it.since, tr) }))} `
}

export const itemLines = (it: InboxItem, now: number): string[] => [`${whereOf(it)}: ${trFill(shownWhat(it.what))}`, `   ${howLong(it, now)}${trFill(it.todo)}`]
export const itemShort = (it: InboxItem, now: number): string => `${whereOf(it)}: ${trFill(shownWhat(it.what)).replace(/\s+/g, ' ')} ${howLong(it, now)}${trFill(it.todo)}`.trim()

export const LIMITS_NOTE = 'Vaken can only tell you where to go. It cannot press OK or answer a permission box for you, and it cannot send a push to your phone.'

// The /vaken inbox answer: one numbered item per wait, its age and what to do in a paragraph of its own, so markdown keeps them apart
export function inboxText(items: InboxItem[], now: number, isOn: boolean): string {
  const lines: string[] = []
  if (!isOn) lines.push(t('chat.inbox_off'), '')
  // Calm is quiet: no note on what vaken cannot do when nothing waits
  if (items.length === 0) return [...lines, tr('Nothing waits for you.')].join('\n')
  lines.push(t('chat.inbox_head', { things: t('words.thing', { n: items.length }) }), '')
  items.forEach((it, k) => {
    const [head, how] = itemLines(it, now)
    lines.push(`${k + 1}. ${head}`, '', how as string, '')
  })
  lines.push(tr(LIMITS_NOTE))
  return lines.join('\n')
}


export const QUEUE_MAX = 5
export const QUEUE_TEXT_MAX = 500
// Offered at most this many times, and not again for this long.
export const OFFER_MAX = 3
export const REOFFER_MS = 10 * 60_000

type QueueItem = { text: string; at: number; by: string; offers: number; offeredAt?: number }

export function parseQueue(raw: unknown): QueueItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is QueueItem => typeof x === 'object' && x !== null && typeof (x as QueueItem).text === 'string' && typeof (x as QueueItem).at === 'number' && typeof (x as QueueItem).by === 'string' && typeof (x as QueueItem).offers === 'number')
    .map(x => ({ text: x.text, at: x.at, by: x.by, offers: x.offers, ...(typeof x.offeredAt === 'number' ? { offeredAt: x.offeredAt } : {}) }))
    .slice(0, QUEUE_MAX)
}

export const cleanQueued = (text: string): string => text.replace(/\s+/g, ' ').trim().slice(0, QUEUE_TEXT_MAX)

export function addQueued(queue: QueueItem[], text: string, at: number, by: string): { queue: QueueItem[]; ok: boolean; why?: string } {
  const clean = cleanQueued(text)
  const live = queue.filter(x => x.offers < OFFER_MAX)
  if (clean === '') return { queue, ok: false, why: tr('There is no sentence to queue.') }
  if (live.length >= QUEUE_MAX) return { queue, ok: false, why: fillIn(tr('That session already has {n} queued. /vaken-pause steer clear empties this session\'s queue.'), { n: QUEUE_MAX }) }
  if (live.some(x => x.text === clean)) return { queue, ok: false, why: tr('That sentence is already in the queue.') }
  return { queue: [...live, { text: clean, at, by, offers: 0 }], ok: true }
}

export const nextOffer = (queue: QueueItem[], now: number): QueueItem | undefined => queue.find(x => x.offers < OFFER_MAX && (x.offeredAt === undefined || now - x.offeredAt >= REOFFER_MS))
export const markOffered = (queue: QueueItem[], text: string, now: number): QueueItem[] => queue.map(x => (x.text === text ? { ...x, offers: x.offers + 1, offeredAt: now } : x))
export const dropSent = (queue: QueueItem[], sent: string): QueueItem[] => queue.filter(x => x.text !== cleanQueued(sent))


type SteerAsk =
  | { kind: 'list' }
  | { kind: 'queue'; target?: number; text: string }
  | { kind: 'send'; target: number; text: string }
  | { kind: 'clear' }
  | { kind: 'stop' }
  | { kind: 'bad'; why: string }

const steerUsage = (): string => tr('Use: /vaken-pause steer (the list), /vaken-pause steer queue <sentence>, /vaken-pause steer queue @2 <sentence>, /vaken-pause steer send @2 <sentence>, /vaken-pause steer clear, /vaken-pause steer stop')

export function parseSteerAsk(args: string): SteerAsk {
  const trimmed = args.trim()
  const m = /^(\S+)\s*([\s\S]*)$/.exec(trimmed)
  if (m === null) return { kind: 'list' }
  const word = (m[1] ?? '').toLowerCase()
  const rest = (m[2] ?? '').trim()
  if (word === 'list' || word === 'status') return { kind: 'list' }
  if (word === 'stop' || word === 'clear') return rest === '' ? { kind: word } : { kind: 'bad', why: steerUsage() }
  if (word === 'queue' || word === 'send') {
    const t = /^@(\d{1,3})\s+([\s\S]+)$/.exec(rest)
    const target = t === null ? undefined : Number(t[1])
    const text = (t === null ? rest : (t[2] ?? '')).trim()
    if (text === '') return { kind: 'bad', why: steerUsage() }
    if (word === 'send') return target === undefined ? { kind: 'bad', why: tr('Say which session: /vaken-pause steer send @2 <sentence>. /vaken-pause steer shows the numbers.') } : { kind: 'send', target, text }
    return target === undefined ? { kind: 'queue', text } : { kind: 'queue', target, text }
  }
  return { kind: 'bad', why: steerUsage() }
}

export type SteerOther = { n: number; name: string; state: string; queued: number }
type SteerFacts = { name: string; queue: QueueItem[]; halted: boolean; others: SteerOther[]; now: number }

export function steerText(f: SteerFacts): string {
  const lines: string[] = []
  const queued = f.queue.length === 0 ? tr('no prompt queued.') : fillIn(tr('{prompts} queued.'), { prompts: t('words.prompt', { n: f.queue.length }) })
  lines.push(`${fillIn(tr('This session ({name}):'), { name: f.name })} ${queued}${f.halted ? ` ${tr('It is paused.')}` : ''}`)
  f.queue.forEach((q, k) => lines.push(`  ${k + 1}. "${q.text.length > 80 ? `${q.text.slice(0, 79)}…` : q.text}" (${fillIn(tr('queued {age} ago'), { age: ageWord(f.now - q.at) })}${q.offers === 0 ? '' : `, ${fillIn(tr('offered {times}'), { times: t('words.time', { n: q.offers }) })}`})`))
  if (f.others.length > 0) {
    lines.push('', tr('Other sessions:'))
    for (const o of f.others) lines.push(`  @${o.n} ${o.name}: ${o.state}${o.queued === 0 ? '' : `, ${fillIn(tr('{n} queued'), { n: o.queued })}`}`)
  } else lines.push('', tr('No other session is open.'))
  lines.push(
    '',
    tr('Queue a sentence: /vaken-pause steer queue <sentence>, or /vaken-pause steer queue @2 <sentence> for another session. When that session is quiet, the sentence shows dim in its prompt box. Its owner presses Tab to take it. Nothing is sent by itself.'),
    tr('To send a message into another session: /vaken-pause steer send @2 <sentence>. Vaken asks you first.'),
    tr('/vaken-pause steer stop halts changes in this session. It stops steps that change things, not thinking.'),
  )
  return lines.join('\n')
}

export const queuedWords = (target: string, text: string): string => fillIn(tr('Queued for {target}: "{text}". It shows dim in the prompt box when that session is quiet. Press Tab to take it.'), { target, text: text.length > 80 ? `${text.slice(0, 79)}…` : text })
export const noSuchSession = (n: number): string => fillIn(tr('There is no session @{n}. /vaken-pause steer shows the numbers.'), { n })
// The answer is compared with the button as it was shown.
export const sendQuestion = (name: string): string => t('talk.send_this_message_into_name', { name })
export const sendButtons = (): { yes: string; no: string } => ({ yes: t('talk.send'), no: t('do.cancel') })
export const sentWords = (name: string): string => fillIn(tr('Sent to "{name}". It reads it as a message from this session.'), { name })
export const notSentWords = (why: string): string => `${tr('Not sent.')} ${why}`
export const offerToast = 'A queued prompt is ready in the prompt box. Press Tab to take it.'
export const stopWords = (turnStopped: boolean | undefined): string =>
  `${tr('Paused for safety. Commands, edits, tools, agents and web fetches are stopped in this session until /vaken-pause off. This stops doing, not thinking: Claude may still write.')}${turnStopped === true ? ` ${tr('The running answer was also cancelled.')}` : turnStopped === false ? ` ${tr('The running answer could not be cancelled; press Escape to stop it.')}` : ''}`
