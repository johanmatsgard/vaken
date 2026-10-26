// The home view as plain data and plain words.
import type { AppUsage, UsageWindow } from '../../core/appusage'
import { extraRow } from '../../core/appusage'
import { windowShare } from '../../core/windowshare'
import type { AgentCost, CostFact, WindowShare } from '../../core/windowshare'
import type { Lang } from '../../i18n/types'
import { contextFacts } from '../../core/appcontext'
import { cacheWords, lastAfterTokens, lastSummaryOut } from '../../core/cachefacts'
import { CACHE_TTL_CREDITS_MS, CACHE_TTL_SUBSCRIPTION_MS, CACHE_WARM_MS, compactMoment } from '../../core/compactmoment'
import type { Extra, Facts } from '../../core/compactmoment'
import { SESSIONS_STALE_MS, matchSession, ownedById } from '../../core/appsessions'
import type { AppSessions } from '../../core/appsessions'
import { paceOf, pressureOf, windowLength } from '../../core/pace'
import type { History, Pace } from '../../core/pace'
import { warnAheadMs } from '../../core/limitwarn'
import { forecastOfPace, forecastWords } from '../../core/limitforecast'
import { dayShare, dayShareWords, weekWindow } from '../../core/dayshare'
import type { DayShare } from '../../core/dayshare'
import { DROP_MS, STALE_MS, isBusy, isDead } from '../../core/record'
import type { SessionRecord } from '../../core/record'
import type { Moment } from '../../core/compactmoment'
import { bandWords } from '../../core/band'
import type { BandItem } from '../../core/band'
import type { AskView } from '../../core/allowrules'
import type { RelayView } from '../../core/relay'
import { didToday, shortSummary, todaySummary } from '../../core/ledger'
import type { Entry } from '../../core/ledger'
import { explainCmd } from '../../core/whatis'
import { TITLE_CHARS, TITLE_WORDS, keyTitle } from '../../core/titles'
import type { Topic } from '../../core/whatis'
import { fmt } from '../../core/fmt'
import { ageWord } from '../../core/time'
import { lastPart, parts as pathParts } from '../../core/platform'
import { langNow, tr } from '../../core/lang'
import { CARD_GROUP, CARD_ZONE, groupIndexOf } from '../../core/cardhome'
import type { Zone } from '../../core/cardhome'
import { fillIn } from '../../core/fillin'

// A tool the engine said it would ask about, still not run after this long, probably waits for your OK.
export const PERMISSION_WAIT_MS = 8_000
export const ASK_KEEP_MS = 24 * 3_600_000

export type Detail = 'simple' | 'explained'
export const parseDetail = (v: unknown): Detail => (v === 'minimal' || v === 'simple' || v === 'glance' ? 'simple' : 'explained')
// What an open card shows when the pane's look is Glance: its Full rows (the label and value form)
export const parseOpenDetail = (v: unknown): Detail => (v === 'glance' ? 'explained' : parseDetail(v))

// A saved order is kept: the known cards in it stay in their places (each once)
export type LineCardId = 'proof' | 'guard' | 'agents' | 'computer' | 'skills' | 'prs' | 'ship' | 'back' | 'safety' | 'context' | 'preview' | 'setup' | 'do'
export const LINE_CARD_IDS: LineCardId[] = ['proof', 'guard', 'agents', 'computer', 'skills', 'prs', 'ship', 'back', 'safety', 'context', 'preview', 'setup', 'do']
export type CardId = 'limit' | 'here' | 'others' | 'autopilot' | LineCardId
export { ZONES, ZONE_WORD } from '../../core/cardhome'
export type { Zone } from '../../core/cardhome'
export const ZONE_OF: Record<CardId, Zone> = CARD_ZONE
const ALL_CARDS: CardId[] = ['limit', 'here', 'others', 'autopilot', ...LINE_CARD_IDS]
export const CARD_IDS: CardId[] = [...ALL_CARDS].sort((a, b) => groupIndexOf(a) - groupIndexOf(b) || (Object.keys(CARD_GROUP) as CardId[]).indexOf(a) - (Object.keys(CARD_GROUP) as CardId[]).indexOf(b))
export const parseOrder = (v: unknown): CardId[] => {
  const kept = [...new Set(typeof v === 'string' ? v.split(',').filter(isCardId) : [])]
  return kept.length === 0 ? [...CARD_IDS] : [...kept, ...CARD_IDS.filter(id => !kept.includes(id))]
}
export const parseHidden = (v: unknown): CardId[] => (typeof v === 'string' ? [...new Set(v.split(',').filter(isCardId))] : [])
export const isCardId = (v: unknown): v is CardId => typeof v === 'string' && (CARD_IDS as string[]).includes(v)
// Moves a card by whole places (negative is left or up), never past the ends.
export function moveCard(order: CardId[], id: CardId, places: number): CardId[] {
  const from = order.indexOf(id)
  const to = Math.max(0, Math.min(order.length - 1, from + places))
  const out = order.filter(c => c !== id)
  out.splice(to, 0, id)
  return out
}

export type Kind = 'needs' | 'working' | 'waiting' | 'idle'

export type Row = {
  rec: SessionRecord
  kind: Kind
  reason: string
  sinceMs: number
  name: string
  link?: string
  pinned?: boolean
  group?: string
}

export type Limit = { percent: number; resetsAt?: string; sinceMs?: number }
// The last figures of every session record, kept while no live session reports any (see keptBlocks)
export type KeptLimits = { limit?: Limit; week?: Limit; spend?: Limit }
export type LimitKind = string

export type View = {
  needs: Row[]
  working: Row[]
  waiting: Row[]
  idle: Row[]
  here?: Row
  limit?: Limit
  week?: Limit
  spend?: Limit
  kept?: KeptLimits
  // This session's estimated share of the 5-hour window (core/windowshare.ts), set by the loader
  share?: WindowShare
  usage?: AppUsage
  hist?: History
  now?: number
  ledger?: Entry[]
  firstRun?: boolean
  band?: BandItem[]
  // The line for a step Claude Code itself stopped (core/allowrules.ts askShown); memory only
  ask?: AskView
  // A tool's question that waits in another session (core/relay.ts): the band names that session; from the store, never the question's words
  relay?: RelayView
  counts?: Record<string, number>
  held?: number
  // Set by the loader from the same facts as the This session card (cards/here.tsx hereWaitsOf)
  hereWaits?: 'halt' | 'hold'
}

// The rule for "needs you": a question put to you, or a permission that has waited, never a finished answer.
export const asksYou = (rec: SessionRecord, now: number): boolean =>
  rec.ask !== undefined && (rec.ask.kind === 'question' || now - rec.ask.since >= PERMISSION_WAIT_MS)

export function classify(rec: SessionRecord, now: number, alive: Set<number> | undefined): Kind | 'gone' {
  if (isDead(rec, alive)) return 'gone'
  if (alive !== undefined && rec.pid !== undefined && alive.has(rec.pid) && rec.ask !== undefined && now - rec.ask.since <= ASK_KEEP_MS && asksYou(rec, now)) return 'needs'
  if (now - rec.updatedAt > DROP_MS) return 'gone'
  if (asksYou(rec, now)) return 'needs'
  if (now - rec.updatedAt > STALE_MS) return 'idle'
  if (rec.state === 'working') return isBusy(rec, now) ? 'working' : 'idle'
  return rec.state === 'waiting' ? 'waiting' : 'idle'
}

export { TITLE_CHARS, TITLE_WORDS } from '../../core/titles'

// A slash command, an empty message or one of only greetings and filler gives none
export const titleOf = (text: string): string | undefined => keyTitle(text)

// A name never ends in a raw id: no title gives the branch
const fallbackName = (rec: Pick<SessionRecord, 'cwd' | 'branch'>): string => (rec.branch !== undefined && rec.branch !== '' ? rec.branch : (pathParts(rec.cwd).at(-1) ?? '')) || tr('Session')
const ownName = (title: string | undefined): string | undefined => {
  if (title === undefined) return undefined
  const flat = title.replace(/\s+/g, ' ').trim()
  // A long title is the session's own, kept whole and cut only at its end
  return flat === '' ? undefined : flat.split(' ').length > TITLE_WORDS ? (flat.length <= TITLE_CHARS ? flat : `${flat.slice(0, TITLE_CHARS - 1)}…`) : keyTitle(flat)
}
// The session's name: its title (ownName), else its branch, else its folder.
export const nameOf = (rec: Pick<SessionRecord, 'cwd' | 'sessionId' | 'title' | 'branch'>): string => ownName(rec.title) ?? fallbackName(rec)

// A Your-turn row's reason: what its meaning line already says ("Claude finished. The session waits for your next message.")
export const TURN_REASON = 'finished, waits for you'
export function reasonOf(rec: SessionRecord, kind: Kind): string {
  if (kind === 'needs' && rec.ask !== undefined) {
    return rec.ask.kind === 'question' ? 'asks you a question' : `waits to run ${rec.ask.tool}, may need OK`
  }
  if (kind === 'waiting') return TURN_REASON
  return ''
}

// What a waiting OK is for, in plain words: the tool's job, not its name ("to run a command", not "to run Bash")
const OK_FOR: Record<string, string> = {
  Bash: 'waits for your OK to run a command',
  PowerShell: 'waits for your OK to run a command',
  Edit: 'waits for your OK to edit a file',
  MultiEdit: 'waits for your OK to edit a file',
  Write: 'waits for your OK to edit a file',
  NotebookEdit: 'waits for your OK to edit a file',
  Read: 'waits for your OK to read files',
  Glob: 'waits for your OK to read files',
  Grep: 'waits for your OK to read files',
  WebFetch: 'waits for your OK to use the web',
  WebSearch: 'waits for your OK to use the web',
}
export function reasonWords(reason: string, t: (s: string) => string): string {
  const m = /^waits to run (.+), may need OK$/.exec(reason)
  if (m === null) return t(reason)
  const own = OK_FOR[m[1]]
  return own === undefined ? t('waits for your OK to use {tool}').replace('{tool}', m[1]) : t(own)
}

export const LIMIT_STALE_MS = 5 * 60_000
export function limitAgo(blocks: readonly { sinceMs?: number }[], t: (s: string) => string = s => s): string {
  const oldest = Math.max(0, ...blocks.map(b => b.sinceMs ?? 0))
  return oldest >= LIMIT_STALE_MS ? t('{age} ago').replace('{age}', ageWord(oldest, t)) : ''
}

export { ageWord }

// A folder's name for a row, whole when it is short
const TAG_MAX = 14
export function folderTag(cwd: string): string {
  let name = lastPart(cwd)
  while (name.length > TAG_MAX && name.includes('-')) name = name.slice(name.indexOf('-') + 1)
  return name.length > TAG_MAX ? name.slice(-TAG_MAX) : name
}

export function buildView(records: SessionRecord[], now: number, hereId: string, alive: Set<number> | undefined, usage?: AppUsage, hist?: History, sessions?: AppSessions): View {
  const view: View = { needs: [], working: [], waiting: [], idle: [], now, ...(usage === undefined ? {} : { usage }), ...(hist === undefined ? {} : { hist }) }
  const live: SessionRecord[] = []
  const owned = ownedById(sessions, records)
  for (const rec of records) {
    const kind = classify(rec, now, alive)
    if (kind === 'gone') continue
    live.push(rec)
    // An idle session is idle since its last event, so its age everywhere (row, line, explanation) is that event's
    const since = rec.ask !== undefined && kind === 'needs' ? rec.ask.since : kind === 'idle' ? Math.max(rec.stateSince, rec.lastEventAt) : rec.stateSince
    const app = sessions !== undefined && now - sessions.at < SESSIONS_STALE_MS ? matchSession(sessions, rec, owned) : undefined
    const row: Row = { rec, kind, reason: reasonOf(rec, kind), sinceMs: Math.max(0, now - since), name: app !== undefined && app.title !== '' ? app.title : nameOf(rec), ...(app?.link === undefined ? {} : { link: app.link }), ...(app?.pinned === true ? { pinned: true } : {}), ...(app?.group === undefined ? {} : { group: app.group }) }
    if (rec.sessionId === hereId) view.here = row
    else view[kind].push(row)
  }
  // Needs you reads newest first: sinceMs is an age, so the smallest age leads. Other sessions' Your turn keeps the longest waiting first
  view.needs.sort((a, b) => a.sinceMs - b.sinceMs)
  view.waiting.sort((a, b) => b.sinceMs - a.sinceMs)
  for (const g of [view.working, view.idle]) g.sort((a, b) => b.rec.updatedAt - a.rec.updatedAt)
  const all = [view.here, ...view.needs, ...view.working, ...view.waiting, ...view.idle].filter((r): r is Row => r !== undefined)
  const seen = new Map<string, number>()
  for (const r of all) seen.set(r.name, (seen.get(r.name) ?? 0) + 1)
  for (const r of all) if ((seen.get(r.name) ?? 0) > 1 && r.rec.cwd !== '') r.name = `${r.name} · ${folderTag(r.rec.cwd)}`
  const again = new Map<string, number>()
  for (const r of all) again.set(r.name, (again.get(r.name) ?? 0) + 1)
  const count = new Map<string, number>()
  for (const r of all) if ((again.get(r.name) ?? 0) > 1) {
    const n = (count.get(r.name) ?? 0) + 1
    count.set(r.name, n)
    r.name = `${r.name} (${n})`
  }
  // A window only rises until it resets
  const newest = (percent: (r: SessionRecord) => number | undefined, resetsAt: (r: SessionRecord) => string | undefined, from0: SessionRecord[] = live): Limit | undefined => {
    const reported = from0.filter(rec => percent(rec) !== undefined)
    if (reported.length === 0) return undefined
    const stamp = (rec: SessionRecord): number => {
      const t = Date.parse(resetsAt(rec) ?? '')
      return Number.isNaN(t) ? -1 : t
    }
    const current = Math.max(...reported.map(stamp))
    const pool = reported.filter(rec => stamp(rec) === current || stamp(rec) === -1)
    let from = pool[0]!
    let fresh = pool[0]!
    for (const rec of pool) {
      if ((percent(rec) ?? 0) > (percent(from) ?? 0)) from = rec
      if (rec.updatedAt > fresh.updatedAt) fresh = rec
    }
    const pct = percent(from)
    if (pct === undefined) return undefined
    let resetFrom: SessionRecord | undefined
    for (const rec of from0) if (resetsAt(rec) !== undefined && (resetFrom === undefined || rec.updatedAt > resetFrom.updatedAt)) resetFrom = rec
    return { percent: pct, resetsAt: resetsAt(from) ?? (resetFrom === undefined ? undefined : resetsAt(resetFrom)), sinceMs: Math.max(0, now - fresh.updatedAt) }
  }
  view.limit = newest(r => r.fiveHourPercent, r => r.fiveHourResetsAt)
  view.week = newest(r => r.sevenDayPercent, r => r.sevenDayResetsAt)
  view.spend = newest(r => r.spendPercent, r => r.spendResetsAt)
  // No live session reports: the last record that did (of the newest one only, so an old window never mixes in)
  if (view.limit === undefined && view.week === undefined && view.spend === undefined) {
    const last = records.filter(r => r.fiveHourPercent !== undefined || r.sevenDayPercent !== undefined || r.spendPercent !== undefined).sort((a, b) => b.updatedAt - a.updatedAt)[0]
    if (last !== undefined) {
      const one = [last]
      const kept: KeptLimits = { limit: newest(r => r.fiveHourPercent, r => r.fiveHourResetsAt, one), week: newest(r => r.sevenDayPercent, r => r.sevenDayResetsAt, one), spend: newest(r => r.spendPercent, r => r.spendResetsAt, one) }
      view.kept = kept
    }
  }
  return view
}

export const needsCount = (view: View): number => view.needs.length + (view.held ?? 0)

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n))

type T = (s: string) => string
const same: T = s => s
// With `now`
const DAY_MS = 24 * 3_600_000
const FAR_DAYS = 7
export function resetWord(iso: string | undefined, withDay = false, now?: number): string {
  if (iso === undefined) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (now !== undefined && d.getTime() - now >= FAR_DAYS * DAY_MS) return `resets in ${Math.round((d.getTime() - now) / DAY_MS)} d`
  const day = withDay || notToday(d.getTime(), now)
  return `resets ${day ? `${fmt.day(d.getDay())} ` : ''}${pad(d.getHours())}:${pad(d.getMinutes())}`
}
// A time on another calendar day than `now` (no now, or no time: never).
const notToday = (ms: number, now: number | undefined): boolean => now !== undefined && !Number.isNaN(ms) && new Date(now).toDateString() !== new Date(ms).toDateString()
const RESET_PARTS = /^resets(?: (Sun|Mon|Tue|Wed|Thu|Fri|Sat))?(?: (\d\d:\d\d))?$/
const RESET_FAR = /^resets in (\d+) d$/
export function resetSaid(reset: string, t: T = same, sentence = false): string {
  const far = RESET_FAR.exec(reset)
  if (far !== null) return t(sentence ? 'It resets {when}' : 'resets {when}').replace('{when}', t('in {n} d').replace('{n}', far[1]))
  const m = RESET_PARTS.exec(reset)
  if (m === null) return reset
  // One clock form per language: "It resets Thu at 11:00" and "resets Thu 11:00"; Swedish says "kl." in both
  const time = m[2] === undefined ? undefined : t(sentence ? 'at {time}' : '{time}').replace('{time}', m[2])
  const when = [m[1] === undefined ? undefined : t(m[1]), time].filter((x): x is string => x !== undefined).join(' ')
  return t(sentence ? 'It resets {when}' : 'resets {when}').replace('{when}', when)
}
export function limitLabel(label: string, t: T = same): string {
  const m = /^Weekly limit · (.+)$/.exec(label)
  return m === null || m[1] === 'all models' ? t(label) : `${t('Weekly limit')} · ${m[1]}`
}

export const USAGE_STALE_MS = 10 * 60_000

// `kept`: a last reading past its freshness (USAGE_STALE_MS, or no live session reports), shown only by the Plan limits card, dim with its age
export type LimitBlock = { kind: LimitKind; short: string; label: string; percent: number; reset: string; sinceMs?: number; pace?: Pace; withDay: boolean; resetsAt?: string; kept?: boolean }

function blockOfWindow(w: UsageWindow, now: number, hist: History | undefined, sinceMs: number): LimitBlock {
  const len = windowLength(w.label)
  const withDay = (len !== undefined && len > DAY_MS) || notToday(Date.parse(w.resetsAt ?? ''), now)
  const model = /^weekly · (.+)$/i.exec(w.label)?.[1]
  const [short, label] = /extra/i.test(w.label) ? ['Extra', w.label] : /5-hour/i.test(w.label) ? ['5-hour limit', '5-hour limit'] : model === undefined ? [w.label, w.label] : /^all models$/i.test(model) ? ['Week', 'Weekly limit · all models'] : [model, `Weekly limit · ${model}`]
  return { kind: w.label, short, label, percent: w.percent, reset: resetWord(w.resetsAt, withDay, now), sinceMs, pace: paceOf(w, now, hist?.[w.label]), withDay, resetsAt: w.resetsAt }
}

// Every limit, the one that leads first (see leadFirst): from the app's usage card while its reading is fresh
export function limitBlocks(view: View): LimitBlock[] {
  const now = view.now ?? 0
  if (view.usage !== undefined && view.now !== undefined && now - view.usage.at < USAGE_STALE_MS) {
    const blocks = view.usage.windows.map(w => blockOfWindow(w, now, view.hist, Math.max(0, now - view.usage!.at))).filter(b => !windowOver(b, now))
    if (blocks.length > 0) return leadFirst(blocks, now)
  }
  return leadFirst(recordBlocks(view), now)
}

const windowOver = (b: LimitBlock, now: number): boolean => {
  const t = Date.parse(b.resetsAt ?? '')
  return !Number.isNaN(t) && t <= now
}

export function recordBlocks(view: View): LimitBlock[] {
  return blocksOfLimits(view, view.now)
}
function blocksOfLimits(view: KeptLimits, now: number | undefined): LimitBlock[] {
  const out: LimitBlock[] = []
  const add = (kind: LimitKind, short: string, label: string, limit: Limit | undefined, week: boolean) => {
    const withDay = week || notToday(Date.parse(limit?.resetsAt ?? ''), now)
    if (limit !== undefined) out.push({ kind, short, label, percent: limit.percent, reset: resetWord(limit.resetsAt, withDay, now), sinceMs: limit.sinceMs, withDay, resetsAt: limit.resetsAt })
  }
  add('session', '5-hour limit', '5-hour limit', view.limit, false)
  add('week', 'Week', 'Weekly limit', view.week, true)
  add('spend', 'Spend', 'Spending limit', view.spend, false)
  return out.filter(b => !windowOver(b, now ?? 0))
}

// The Plan limits card's limits: the fresh ones (limitBlocks), else the last reading kept, newest source first, marked `kept`, with no pace (an old reading has no pace now).
// The band, the status line, the loudness and the warnings read limitBlocks only, so a kept figure never colours or warns.
export function keptBlocks(view: View): LimitBlock[] {
  const fresh = limitBlocks(view)
  if (fresh.length > 0) return fresh
  const now = view.now ?? 0
  const usage = view.usage
  const fromApp = usage === undefined ? [] : usage.windows.map(w => ({ ...blockOfWindow(w, now, undefined, Math.max(0, now - usage.at)), pace: undefined })).filter(b => !windowOver(b, now))
  const fromRecords = view.kept === undefined ? [] : blocksOfLimits(view.kept, view.now)
  const age = (bs: LimitBlock[]): number => Math.max(...bs.map(b => b.sinceMs ?? 0))
  const pick = fromApp.length === 0 ? fromRecords : fromRecords.length === 0 || age(fromApp) <= age(fromRecords) ? fromApp : fromRecords
  return leadFirst(pick.map(b => ({ ...b, kept: true })), now)
}

// How long ago any plan figure was read (the app's card or a session record), or undefined when none ever was
export function limitReadAgo(view: View): number | undefined {
  const now = view.now ?? 0
  const ages = [...(view.usage === undefined ? [] : [now - view.usage.at]), ...[view.limit, view.week, view.spend, view.kept?.limit, view.kept?.week, view.kept?.spend].flatMap(l => (l?.sinceMs === undefined ? [] : [l.sinceMs]))]
  return ages.length === 0 ? undefined : Math.max(0, Math.min(...ages))
}

const LEAD_LABEL: Record<string, string> = { session: '5-hour limit', week: 'Weekly · all models' }
const labelOf = (b: LimitBlock): string => LEAD_LABEL[b.kind] ?? b.kind
const runsOutSoon = (b: LimitBlock, now: number): { score: number; outAt?: number; soon: boolean } => {
  const p = pressureOf(labelOf(b), b.percent, b.resetsAt, now)
  return { ...p, soon: p.outAt !== undefined && p.outAt - now <= warnAheadMs(labelOf(b)) }
}
export function leadFirst(blocks: LimitBlock[], now: number): LimitBlock[] {
  const facts = blocks.map((b, n) => ({ b, n, ...runsOutSoon(b, now) }))
  facts.sort((x, y) => Number(y.soon) - Number(x.soon) || (x.soon && y.soon ? (x.outAt ?? 0) - (y.outAt ?? 0) : 0) || (y.score === x.score ? 0 : y.score - x.score) || x.n - y.n)
  return facts.map(f => f.b)
}

export const LIMIT_HOT_PCT = 80
export const LIMIT_URGENT_PCT = 90
// At the Full look a limit under this much used folds into one dim line
export const LIMIT_FOLD_PCT = 50
export const mainLimit = (b: LimitBlock): boolean => b.kind === 'session' || b.kind === 'week' || b.short === '5-hour limit' || b.label === 'Weekly limit · all models'
const folds = (b: LimitBlock, n: number): boolean => n > 0 && !mainLimit(b) && b.percent < LIMIT_FOLD_PCT

export function limitLoud(blocks: LimitBlock[], now: number): Loud {
  if (blocks.length === 0) return 'calm'
  if (blocks.some(b => b.percent >= LIMIT_URGENT_PCT)) return 'urgent'
  return blocks.some(b => b.percent >= LIMIT_HOT_PCT || runsOutSoon(b, now).soon) ? 'warn' : 'normal'
}

// The daily share of the week (core/dayshare.ts): from the app's weekly window with the kept readings
export function dayShareOf(view: View): DayShare | undefined {
  const now = view.now ?? 0
  const usage = view.usage
  const fresh = usage !== undefined && view.now !== undefined && now - usage.at < USAGE_STALE_MS
  const w = fresh ? weekWindow(usage.windows) : view.week === undefined ? undefined : { label: 'Weekly · all models', percent: view.week.percent, ...(view.week.resetsAt === undefined ? {} : { resetsAt: view.week.resetsAt }) }
  return w === undefined ? undefined : dayShare(w, now, fresh ? (view.hist?.[w.label] ?? []) : [])
}

export function limitRow(blocks: LimitBlock[], t: T = same): string {
  return limitSegments(blocks, t).join(' · ')
}
// The same row as whole segments, one per limit ("Week 72% used, resets Thu 09:00", "5-hour limit 40% used
export function limitSegments(blocks: LimitBlock[], t: T = same): string[] {
  return blocks.map(b => withReset(t('{name} {pct} used').replace('{name}', t(b.short)).replace('{pct}', fmt.percent(b.percent, langOf(t))), b, t))
}
const withReset = (words: string, b: LimitBlock, t: T): string => (b.reset === '' ? words : `${words}, ${resetSaid(b.reset, t)}`)

export const foldWords = (folded: LimitBlock[], t: (s: string) => string = s => s): string => t('Under half used: {list}').replace('{list}', limitSegments(folded, t).join(' · '))

function whenWord(ms: number, now: number, t: T = same): string {
  const d = new Date(ms)
  const sameDay = new Date(now).toDateString() === d.toDateString()
  return `${sameDay ? '' : `${t(fmt.day(d.getDay()))} `}${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function paceLines(b: LimitBlock, now: number, t: T = same): string[] {
  const p = b.pace
  if (p === undefined) return []
  const out: string[] = []
  // One forecast line (core/limitforecast.ts); the recent pace only gives its rate, as the forecast already says the time.
  const f = forecastOfPace(p, b.percent)
  if (f !== undefined) out.push(forecastWords(f, now, b.withDay, t))
  if (p.recentPerHour !== undefined) {
    const rate = String(p.recentPerHour < 10 ? fmt.decimal(p.recentPerHour, langNow()) : Math.round(p.recentPerHour))
    out.push(t('Recent pace: {n}% an hour.').replace('{n}', rate))
  }
  return out
}

export function paceShort(b: LimitBlock, now: number, t: T = same): string {
  const p = b.pace
  if (p === undefined) return ''
  return p.hitAt !== undefined ? t('out {when}').replace('{when}', whenWord(p.hitAt, now, t)) : t('~{n}% at reset').replace('{n}', String(Math.min(999, Math.round(p.projected))))
}

// One line under a limit's bar: `problem` a row in full strength (used up, runs out before the reset), `soft` a dim row with a value (the day's share), `note` a dim line
export type LimitLine = { kind: 'problem' | 'soft' | 'note'; label: string; value?: string }
// One limit as the card draws it: its row (label, figure), its bar, the lines under it
export type LimitPart = { block: LimitBlock; label: string; figure: string; lines: LimitLine[] }
// `parts`: the limits in the card's fixed order (orderOfCard); `extra` the extra-usage row (right under the 5-hour limit); `plan` the subscription row at the bottom.
// `note`: the card's header note (the age of an old reading); `groups`: the same facts as lines of words for the text twin and /vaken-usage.
export type LimitLines = { note: string; groups: string[][]; source: string; parts: LimitPart[]; extra?: { value: string; pct?: number }; plan?: string; shown?: LimitBlock[]; folded?: LimitBlock[]; daily?: DayShare }

// The card's order never moves: the 5-hour limit, the week, a model's week, the rest, as the band
const isFive = (b: LimitBlock): boolean => b.kind === 'session' || b.short === '5-hour limit'
const isWeek = (b: LimitBlock): boolean => b.kind === 'week' || b.label === 'Weekly limit · all models'
const rankOf = (b: LimitBlock): number => (isFive(b) ? 0 : isWeek(b) ? 1 : /^Weekly limit · /.test(b.label) ? 2 : b.short === 'Extra' ? 4 : 3)
export const orderOfCard = (blocks: readonly LimitBlock[]): LimitBlock[] => blocks.map((b, n) => ({ b, n })).sort((x, y) => rankOf(x.b) - rankOf(y.b) || x.n - y.n).map(x => x.b)

// This session's estimated share of the 5-hour window (core/windowshare.ts), from the costs the records hold and this session's own cost readings
export function shareOf(view: View, records: readonly SessionRecord[], hereId: string, agents: readonly AgentCost[], samples?: ReadonlyArray<readonly [number, number]>): WindowShare | undefined {
  const five = limitBlocks(view).find(isFive)
  const resetsAt = Date.parse(five?.resetsAt ?? '')
  if (five === undefined || Number.isNaN(resetsAt)) return undefined
  const costs: CostFact[] = records.flatMap(r => (r.costUsd === undefined ? [] : [{ id: r.sessionId, startedAt: r.startedAt, updatedAt: r.updatedAt, costUsd: r.costUsd }]))
  return windowShare({ resetsAt, now: view.now ?? 0, percent: five.percent, costs, hereId, ...(samples === undefined ? {} : { hereSamples: samples }), agents })
}

// A limit's name on the card: "5-hour limit", "Week", "Week · Fable"
export function cardLabel(b: LimitBlock, t: T = same): string {
  const model = /^Weekly limit · (.+)$/.exec(b.label)?.[1]
  return model === undefined || model === 'all models' ? t(b.short) : `${t('Week')} · ${model}`
}
// The same name at the Short look, as the band says it ("5 h", "Week", "Week · Fable")
const shortLabel = (b: LimitBlock, t: T): string => (isFive(b) ? t('5 h') : cardLabel(b, t))

const langOf = (t: T): Lang => (t === same ? 'en' : langNow())
// A clock time in the card's one form: the day when it is not today or the window is a week, then the time ("Thu 11:00", Swedish "tors kl. 11:00")
function clockWord(ms: number, now: number, withDay: boolean, t: T): string {
  const d = new Date(ms)
  const day = withDay || new Date(now).toDateString() !== d.toDateString()
  return `${day ? `${t(fmt.day(d.getDay()))} ` : ''}${t('{time}').replace('{time}', `${pad(d.getHours())}:${pad(d.getMinutes())}`)}`
}
// A time cut to its whole minute, as the clock word shows it, so a gap between two shown times adds up
const wholeMinute = (ms: number): number => Math.floor(ms / 60_000) * 60_000
// Every reset line says the time left: "Resets 14:40 (in 40 min)"
export function resetLine(b: LimitBlock, now: number, t: T = same): string | undefined {
  const at = Date.parse(b.resetsAt ?? '')
  if (Number.isNaN(at) || at <= now) return undefined
  return t('Resets {when} (in {left})').replace('{when}', clockWord(at, now, b.withDay, t)).replace('{left}', fmt.left(at - now, langOf(t)))
}
// The Short look's reset: a weekly one says only its day
function resetShort(b: LimitBlock, now: number, t: T): string {
  const at = Date.parse(b.resetsAt ?? '')
  if (Number.isNaN(at) || at <= now) return ''
  const d = new Date(at)
  return b.withDay ? t(fmt.day(d.getDay())) : clockWord(at, now, false, t)
}

// A used-up limit stops the sessions unless extra usage is on and pays
export const usedUp = (b: LimitBlock): boolean => b.percent >= 100 && b.short !== 'Extra'

// A used-up limit in one plain sentence: "Used up. Sessions wait." (the reset time is the row under it; extra usage on: it pays)
function usedUpSentence(_b: LimitBlock, _now: number, extraOn: boolean, t: T): string {
  return extraOn ? t('Used up. Extra usage is in use.') : t('Used up. Sessions wait.')
}

// The lines under one limit's bar: the problem first, the day's share of the week, the reset, the 5-hour pace an hour
function linesOf(b: LimitBlock, now: number, o: { daily?: DayShare; extraOn: boolean; share?: WindowShare }, t: T): LimitLine[] {
  const out: LimitLine[] = []
  const lang = langOf(t)
  const f = b.pace === undefined ? undefined : forecastOfPace(b.pace, b.percent)
  const at = Date.parse(b.resetsAt ?? '')
  if (usedUp(b)) out.push({ kind: 'problem', label: usedUpSentence(b, now, o.extraOn, t) })
  else if (f !== undefined && 'outAt' in f) {
    const d = new Date(f.outAt)
    const when = b.withDay && new Date(now).toDateString() !== d.toDateString() ? t(fmt.day(d.getDay())) : clockWord(f.outAt, now, false, t)
    out.push({ kind: 'problem', label: t('Runs out {when}').replace('{when}', when), ...(Number.isNaN(at) ? {} : { value: t('{left} before the reset').replace('{left}', fmt.left(wholeMinute(at) - wholeMinute(f.outAt), lang)) }) })
  }
  // A calm limit says only its reset; the week's share a day only when it is hot or runs out early
  const daily = o.daily
  const tight = b.percent >= LIMIT_HOT_PCT || (f !== undefined && 'outAt' in f)
  if (isWeek(b) && tight && daily !== undefined && daily.left > 0) {
    // What the figure is: the share of the week that is left, spread over the days to the reset (core/dayshare.ts perDay), so it says so; today's use is its own row
    out.push({ kind: 'soft', label: t('To last until it resets: about {per}% a day (estimate)').replace('{per}', fmt.figureDown(daily.perDay, lang)) })
    if (daily.today !== undefined) out.push({ kind: 'soft', label: t('Used today'), value: fmt.percent(daily.today, lang) })
  }
  // With no clock (a caller with no view) the reset says no time left
  const reset = now === 0 ? (b.reset === '' ? undefined : resetSaid(b.reset, t, true)) : resetLine(b, now, t)
  if (reset !== undefined) out.push({ kind: 'note', label: reset })
  // Per hour only for the 5-hour window: one pace unit per limit
  if (isFive(b) && !usedUp(b) && b.pace?.recentPerHour !== undefined) {
    const rate = b.pace.recentPerHour < 10 ? fmt.decimal(b.pace.recentPerHour, lang) : String(Math.round(b.pace.recentPerHour))
    out.push({ kind: 'note', label: t('Recent pace: {n}% an hour.').replace('{n}', rate) })
  }
  if (isFive(b) && o.share !== undefined) {
    // Points of the limit, tied to the used figure and never above it: an estimate from the cost share (core/windowshare.ts), hidden under 1
    const used = Math.min(100, Math.round(b.percent))
    const here = Math.min(used, Math.round(o.share.here))
    const agents = Math.min(here, Math.round(o.share.agents))
    // Said as a part of the used figure above it ("about 45% of it"), never as two figures side by side
    const of = (points: number): string => fmt.percent(used === 0 ? 0 : (points / used) * 100, lang)
    const words = agents >= 1 ? t('This session: about {share} of it · agents: about {m} (estimate)').replace('{m}', of(agents)) : t('This session: about {share} of it (estimate)')
    // All of it is this session (no other session reports a cost in the window): calm is quiet, the line would say nothing
    if (here >= 1 && (here < used || agents >= 1)) out.push({ kind: 'note', label: words.replace('{share}', of(here)) })
  }
  return out
}

const lineWords = (l: LimitLine): string => (l.value === undefined || l.value === '' ? l.label : `${l.label} · ${l.value}`)

export function limitLines(blocks: LimitBlock[], detail: Detail, view?: View, t: T = same): LimitLines {
  if (blocks.length === 0) return { note: '', groups: [], source: '', parts: [] }
  const now = view?.now ?? 0
  const fromApp = view?.usage !== undefined && blocks.some(b => b.kind === view.usage!.windows[0]?.label)
  const plan = fromApp ? view?.usage?.plan : undefined
  const oldest = Math.max(...blocks.map(b => b.sinceMs ?? 0))
  const kept = blocks.some(b => b.kept === true)
  const stale = kept || oldest >= LIMIT_STALE_MS
  // The age is the card's small header note, never a line at the bottom
  // Under a minute is "just now", never "under 1 min ago"
  const note = !stale ? '' : oldest < 60_000 ? t('just now') : t('{age} ago').replace('{age}', ageWord(oldest, t))
  const ordered = orderOfCard(blocks)
  if (detail === 'simple') {
    const parts = ordered.map(b => ({ block: b, label: shortLabel(b, t), figure: [fmt.percent(b.percent, langOf(t)), resetShort(b, now, t)].filter(w => w !== '').join(' · '), lines: [] }))
    return { note, groups: [], source: '', parts }
  }
  // A kept (old) reading gives no daily share: it would count today from a figure of earlier
  const daily = view === undefined || kept ? undefined : dayShareOf(view)
  const extraUsage = fromApp ? view?.usage?.extra : undefined
  const extraOn = extraUsage?.enabled === true
  const share = kept ? undefined : view?.share
  const parts = ordered.map(b => ({ block: b, label: cardLabel(b, t), figure: `${fmt.percent(b.percent, langOf(t))} ${t('used')}`, lines: linesOf(b, now, { ...(daily === undefined ? {} : { daily }), extraOn, ...(share === undefined ? {} : { share }) }, t) }))
  const extra = extraUsage === undefined ? undefined : extraRow(extraUsage, t)
  const groups = parts.map(p => [`${p.label}: ${p.figure}`, ...p.lines.map(lineWords)])
  const planLine = plan === undefined ? undefined : `${t('Subscription')}: ${plan}`
  if (extra !== undefined || planLine !== undefined) groups.push([...(extra === undefined ? [] : [`${t('Extra usage')}: ${extra.value}`]), ...(planLine === undefined ? [] : [planLine])])
  const source = fromApp || stale ? '' : t('Where it comes from: Claude Code')
  return { note, groups, source, parts, shown: ordered, ...(extra === undefined ? {} : { extra }), ...(plan === undefined ? {} : { plan }), ...(daily === undefined ? {} : { daily }) }
}

export const stateWord = (kind: Row['kind']): string => (kind === 'needs' ? 'Needs you' : kind === 'working' ? 'Working' : kind === 'waiting' ? 'Your turn' : 'Idle')

export function hereFacts(row: Row, ttlMs: number | undefined, now: number | undefined, extra: Extra = {}): Facts & { working: boolean } {
  const rec = row.rec
  const lastCompact = (rec.compacts ?? []).reduce((m, c) => Math.max(m, c.at), 0)
  const cacheLeftMs = rec.cache?.at === undefined || now === undefined ? undefined : (ttlMs ?? CACHE_WARM_MS) - (now - rec.cache.at)
  return {
    working: row.kind === 'working',
    percent: rec.contextPercent,
    tokens: rec.ctx?.tokens,
    compactAt: rec.ctx?.compactAt,
    atBreak: row.kind === 'waiting' || row.kind === 'idle',
    quietMs: row.sinceMs,
    ttlMs,
    afterTokens: lastAfterTokens(rec.compacts),
    summaryOut: lastSummaryOut(rec.compacts),
    extra: { ...extra, waits: (extra.waits ?? false) || row.kind === 'needs' || rec.ask !== undefined, ...(lastCompact === 0 || now === undefined ? {} : { sinceCompactMs: now - lastCompact }), ...(cacheLeftMs === undefined ? {} : { cacheLeftMs }) },
  }
}

// `waits`: this session's pause or stopped step (View.hereWaits); the head then says Needs you and the wait, as the Glance headline, the dot and the band
export function hereLines(row: Row | undefined, detail: Detail, ttlMs?: number, now?: number, advise = true, keeper = false, extra?: Extra, t: T = same, waits?: View['hereWaits']): { head: string; context?: string; cost?: string; compact?: string; used?: string; top?: string; cache?: string; cacheHit?: string; advice?: string[]; advicePlain?: string; why?: string } {
  if (row === undefined) return { head: t('Nothing to show yet. This appears after the first answer. Send a message in the chat.') }
  const rec = row.rec
  const simple = detail !== 'explained'
  const state = t(stateWord(waits === undefined ? row.kind : 'needs'))
  const why = waits !== undefined ? t(WAITS_WHY[waits]) : row.kind === 'needs' && row.reason !== '' ? reasonWords(row.reason, t) : ''
  const head = why !== '' && !simple ? `${state}: ${why}` : state
  const cost = rec.costUsd === undefined ? undefined : fmt.moneyPlain(rec.costUsd)
  const pct = rec.contextPercent === undefined ? undefined : Math.round(rec.contextPercent)
  const moment: Moment = !advise ? { level: 'none', lines: [] } : compactMoment(hereFacts(row, ttlMs, now, extra), t)
  if (simple) return { head: cost === undefined ? head : `${head}, ${cost}`, context: rec.contextPercent === undefined ? undefined : fmt.percent(rec.contextPercent, langOf(t)), ...(moment.lines.length > 0 ? { advice: [moment.lines[0]] } : {}) }
  const facts = rec.ctx === undefined ? {} : contextFacts(rec.ctx, rec.contextPercent, t)
  const kept = keeper ? ` · ${t('kept cheap')}` : ''
  const cache = rec.cache === undefined || now === undefined ? undefined : `${cacheWords(rec.cache, now, ttlMs, false, t)}${kept}`
  const cacheHit = rec.cache === undefined || now === undefined ? undefined : `${cacheWords(rec.cache, now, ttlMs, true, t)}${kept}`
  return { head, context: pct === undefined ? undefined : t('Context {n}% used').replace('{n}', String(pct)), cost, ...facts, ...(cache === undefined ? {} : { cache }), ...(cacheHit === undefined ? {} : { cacheHit }), ...(moment.lines.length === 0 ? {} : { advice: moment.lines }), ...(moment.plain === undefined ? {} : { advicePlain: moment.plain }), ...(moment.why === undefined ? {} : { why: moment.why }) }
}

export const limitWord = (limit: Limit, detail: Detail = 'explained'): string => `${fmt.percent(limit.percent, 'en')}${detail === 'explained' ? ' used' : ''}`

// `waits`: this session waits for you though Claude Code says it works (View.hereWaits); it then says Needs you, as the pane's card does.
// The wait in words: English in hereWord (the text twin), the card's language in hereLines (its rows in pane)
const WAITS_WHY: Record<NonNullable<View['hereWaits']>, string> = { halt: 'paused, it waits for you to resume it', hold: 'a stopped step waits for your yes' }
export function hereWord(row: Row | undefined, detail: Detail = 'explained', waits?: View['hereWaits'], t: T = same): string {
  if (row === undefined) return t('Nothing to show yet. This appears after the first answer. Send a message in the chat.')
  const rec = row.rec
  const simple = detail !== 'explained'
  const lang = langOf(t)
  const state = t(stateWord(waits === undefined ? row.kind : 'needs'))
  const why = waits !== undefined ? t(WAITS_WHY[waits]) : row.kind === 'needs' && row.reason !== '' ? reasonWords(row.reason, t) : ''
  const parts = [why !== '' && !simple ? `${state}: ${why}` : state]
  const ctx = rec.contextPercent === undefined ? '' : fmt.percent(rec.contextPercent, lang)
  if (rec.contextPercent !== undefined) parts.push(simple ? ctx : fillIn(t('context {pct} used'), { pct: ctx }))
  if (rec.costUsd !== undefined) parts.push(simple ? fmt.moneyPlain(rec.costUsd) : fillIn(t('{cost} so far'), { cost: fmt.moneyPlain(rec.costUsd) }))
  const facts = rec.ctx === undefined || detail !== 'explained' ? {} : contextFacts(rec.ctx, rec.contextPercent, t)
  if (facts.compact !== undefined) parts.push(facts.compact.toLowerCase())
  return parts.join(', ')
}

export const chipWord = (rec: SessionRecord): string => (rec.ask?.kind === 'question' ? 'Question' : 'OK needed')

const othersParts = (view: View, say: (s: string) => string): string[] => [
  ...(view.waiting.length > 0 ? [say('{n} your turn').replace('{n}', String(view.waiting.length))] : []),
  ...(view.working.length > 0 ? [say('{n} working').replace('{n}', String(view.working.length))] : []),
  ...(view.idle.length > 0 ? [view.idle.length === 1 ? say('1 idle') : say('{n} idle').replace('{n}', String(view.idle.length))] : []),
]
// A session that asks you is in the band and Needs you only (one fact, one place), so it is not counted here
export const othersWord = (view: View, say: (s: string) => string = s => s): string => {
  const parts = othersParts(view, say)
  if (parts.length > 0) return parts.join(' · ')
  const n = view.needs.length
  return n === 0 ? say('No other session is active now.') : n === 1 ? say('No other session is active now; 1 waits in Needs you.') : say('No other session is active now; {n} wait in Needs you.').replace('{n}', String(n))
}
// The header's counts, the lead first ("2 your turn", then "1 working"): idle ones only when nothing else is going on
export const othersCounts = (view: View, say: (s: string) => string = s => s): string[] =>
  othersParts(view.waiting.length + view.working.length > 0 ? { ...view, idle: [] } : view, say)
export const othersCount = (view: View, say: (s: string) => string = s => s): string => {
  const parts = othersCounts(view, say)
  return parts.length === 0 ? '0' : parts.join(' · ')
}

// The band's plan chip names the limit that leads
export const bandLead = (view: View): LimitBlock | undefined => limitBlocks(view)[0]
const GENERIC_SHORT = new Set(['5-hour limit', 'Week', 'Spend', 'Extra'])
const midShort = (short: string): string => (GENERIC_SHORT.has(short) ? short.toLowerCase() : short)
export const bandWord = (view: View, detail: Detail = 'explained'): string => {
  const [lead, ...rest] = limitBlocks(view)
  if (lead === undefined) return 'Plan limit not reported yet'
  return `${lead.short} ${limitWord(lead, detail)}${lead.reset === '' ? '' : `, ${lead.reset}`}${rest.map(b => ` · ${midShort(b.short)} ${limitWord(b, detail)}`).join('')}`
}

export const needsBandWord = (view: View): string => (needsCount(view) === 0 ? '' : `◆ ${needsCount(view)} needs you`)

export const postedBandWord = (view: View): string => bandWords(view.band ?? [], view.now ?? 0)

export function homeText(view: View, order: readonly CardId[] = CARD_IDS, more: Partial<Record<CardId, string[]>> = {}): string {
  const lines: string[] = []
  const say = (line: string, topic: Topic): void => {
    lines.push(`${line} · ${explainCmd(topic)}`)
  }
  if (view.firstRun === true) lines.push('New here? Vaken asks 5 short questions at the first start: how much to tell you, risky steps, spending, how Claude works with you and long chats. The recommended answers are preselected. "Run setup again" in the Start questions card in Settings asks them again.')
  if (needsCount(view) === 0) say('Nothing needs you.', 'needs')
  else {
    say(`Needs you: ${needsCount(view)}`, 'needs')
    for (const r of view.needs) say(`◆ Needs you: ${r.name} (${r.reason}, waited ${ageWord(r.sinceMs)})`, 'needs')
  }
  if (postedBandWord(view) !== '') say(`Now: ${postedBandWord(view)}`, 'band')
  const parts: Partial<Record<CardId, () => void>> = {
    limit: () => {
      const blocks = limitBlocks(view)
      if (blocks.length === 0) say('Plan limits: not reported yet.', 'limits')
      for (const b of blocks) {
        const ago = limitAgo([b])
        say(`${cardLabel(b)}: ${fmt.percent(b.percent, 'en')} used${b.reset === '' ? '' : `, ${b.reset}`}${ago === '' ? '' : `, read ${ago}`}.${paceLines(b, view.now ?? 0).map(l => ` ${l}`).join('')}`, 'limits')
      }
      const daily = dayShareOf(view)
      if (daily !== undefined) say(dayShareWords(daily), 'limits')
    },
    here: () => say(`This session: ${hereWord(view.here, 'explained', view.hereWaits).replace(/\.$/, '')}.`, 'session'),
    autopilot: () => {
      if (view.ledger !== undefined) say(`Autopilot: ${shortSummary(todaySummary(view.ledger, view.now ?? 0, view.counts), didToday(view.ledger, view.now ?? 0, view.counts))}.`, 'autopilot')
    },
    others: () => {
      say(`Other sessions: ${othersWord(view)}`, 'others')
      const list = (rows: Row[], mark: string, kind: Row['kind'], topic: Topic) => rows.forEach(r => say(`${mark} ${stateWord(kind)}: ${r.name} (${r.reason === '' ? '' : `${r.reason}, `}${ageWord(r.sinceMs)})`, topic))
      list(view.waiting, '○', 'waiting', 'yourturn')
      list(view.working, '●', 'working', 'working')
      list(view.idle, '·', 'idle', 'quiet')
    },
  }
  for (const id of [...order, ...CARD_IDS.filter(c => !order.includes(c))]) {
    parts[id]?.()
    lines.push(...(more[id] ?? []))
  }
  return lines.join('\n')
}

// The order is a function of the loudness alone, so it moves only when a card's loudness changes
export type Loud = 'urgent' | 'warn' | 'normal' | 'calm'
const LOUD_RANK: Record<Loud, number> = { urgent: 0, warn: 1, normal: 2, calm: 3 }
export function problemsFirst<T extends string>(order: readonly T[], loud: Partial<Record<T, Loud>>): T[] {
  return order
    .map((id, n) => ({ id, n, r: LOUD_RANK[loud[id] ?? 'normal'] }))
    .sort((a, b) => a.r - b.r || a.n - b.n)
    .map(x => x.id)
}
// The same, inside each placement group (core/cardhome.ts): the order must come group by group.
export function problemsFirstInGroups<T extends string>(order: readonly T[], loud: Partial<Record<T, Loud>>): T[] {
  const runs: T[][] = []
  for (const id of order) {
    const last = runs[runs.length - 1]
    if (last !== undefined && groupIndexOf(last[0]) === groupIndexOf(id)) last.push(id)
    else runs.push([id])
  }
  return runs.flatMap(run => problemsFirst(run, loud))
}

export type LoudFacts = {
  limits: LimitBlock[]
  here: boolean
  herePct?: number
  others: number
  didToday: number
  proof: 'none' | 'ok' | 'problem'
  agents: { any: boolean; stuck: boolean; failed?: number }
  computer: { gaugeOn: boolean; full: boolean }
  skillsUsed: boolean
  prs?: 'none' | 'open' | 'failing'
  ship?: 'blocked' | 'ready' | 'none'
  back?: 'waits' | 'news' | 'open' | 'none' // the Where was I card (core/backcard.ts backLoud): a real wait since you left warns; other news and yesterday's open ends are normal
  safety?: 'halted' | 'held' | 'none' // the Safety card (core/safetycard.ts safetyLoud): a halt is urgent, a step held lately warns, otherwise calm
  preview?: 'error' | 'changed' | 'up' | 'none' // the Preview card (core/previewcard.ts previewLoud): an error page or a silent dev server and the look-now nudge warn
  setup?: 'conflict' | 'drift' | 'none' // the Agent setup card (core/setupcard.ts setupLoud): a conflict with your own files warns
  do?: 'some' | 'none' // the Commands from the last answer card (core/docard.ts doLoud): blocks that wait to be run are normal
  context?: 'heavy' | 'unverified' | 'none' // the Context health card (core/contextcard.ts contextLoud): heavy instruction files or claims with no check in the handoff warn
}
export function cardLoudness(f: LoudFacts, now: number): Record<CardId, Loud> {
  return {
    limit: limitLoud(f.limits, now),
    here: f.herePct !== undefined && f.herePct >= LIMIT_URGENT_PCT ? 'urgent' : f.herePct !== undefined && f.herePct >= LIMIT_HOT_PCT ? 'warn' : f.here ? 'normal' : 'calm',
    others: f.others > 0 ? 'normal' : 'calm',
    autopilot: f.didToday > 0 ? 'normal' : 'calm',
    proof: f.proof === 'problem' ? 'warn' : f.proof === 'ok' ? 'normal' : 'calm',
    guard: 'calm', // only the rules are left on the card; the halt and the stopped steps are the Safety card's
    agents: f.agents.stuck || (f.agents.failed ?? 0) > 0 ? 'warn' : f.agents.any ? 'normal' : 'calm',
    computer: !f.computer.gaugeOn ? 'calm' : f.computer.full ? 'warn' : 'normal',
    skills: f.skillsUsed ? 'normal' : 'calm',
    prs: f.prs === 'failing' ? 'warn' : f.prs === 'open' ? 'normal' : 'calm',
    ship: f.ship === 'blocked' ? 'warn' : 'calm',
    back: f.back === 'waits' ? 'warn' : f.back === 'news' || f.back === 'open' ? 'normal' : 'calm',
    safety: f.safety === 'halted' ? 'urgent' : f.safety === 'held' ? 'warn' : 'calm',
    context: f.context === 'heavy' || f.context === 'unverified' ? 'warn' : 'calm',
    setup: f.setup === 'conflict' ? 'warn' : f.setup === 'drift' ? 'normal' : 'calm',
    do: f.do === 'some' ? 'normal' : 'calm',
    preview: f.preview === 'error' || f.preview === 'changed' ? 'warn' : f.preview === 'up' ? 'normal' : 'calm',
  }
}

// A session that needs you is never hidden: it stays in the "Needs you" card, which marks do not touch.
export type Mark = 'pin' | 'hide'
export type Marks = Record<string, Mark>
export const parseMarks = (v: unknown): Marks => {
  try {
    const data = typeof v === 'string' ? (JSON.parse(v) as unknown) : undefined
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {}
    return Object.fromEntries(Object.entries(data).filter((e): e is [string, Mark] => e[1] === 'pin' || e[1] === 'hide'))
  } catch {
    return {}
  }
}
// The other sessions in one list: your turn (the longest waiting first), working, quiet; marks do not apply yet.
export const allOthers = (view: View): Row[] => [...view.waiting, ...view.working, ...view.idle]
export function withoutHidden(view: View, marks: Marks): { view: View; hiddenCount: number } {
  const keep = (rows: Row[]): Row[] => rows.filter(r => marks[r.rec.sessionId] !== 'hide')
  const updated: View = { ...view, working: keep(view.working), waiting: keep(view.waiting), idle: keep(view.idle) }
  return { view: updated, hiddenCount: allOthers(view).length - allOthers(updated).length }
}
// A session pinned in the app's own sidebar counts as pinned here too
export const isPinned = (r: Row, marks: Marks): boolean => marks[r.rec.sessionId] === 'pin' || (r.pinned === true && marks[r.rec.sessionId] === undefined)
export const pinnedFirst = (rows: Row[], marks: Marks): Row[] => [...rows.filter(r => isPinned(r, marks)), ...rows.filter(r => !isPinned(r, marks))]
export function setMark(marks: Marks, id: string, mark: Mark | 'show', known: string[]): Marks {
  const out: Marks = {}
  for (const [k, v] of Object.entries(marks)) if (known.includes(k) && k !== id) out[k] = v
  if (mark !== 'show') out[id] = mark
  return out
}

export const cacheTtlMs = (usage: AppUsage | undefined): number | undefined => (usage?.extra === undefined ? undefined : usage.extra.enabled ? CACHE_TTL_CREDITS_MS : CACHE_TTL_SUBSCRIPTION_MS)

export const ACTIVE_FOR_MS = 30 * 60_000
export function activeFirst<T>(rows: T[], isActive: (r: T) => boolean, all: boolean, max: number, unlimited = false): { shown: T[]; hidden: number; label?: string } {
  if (unlimited) return { shown: rows, hidden: 0 }
  if (all) return { shown: rows, hidden: 0, ...(rows.length > Math.min(max, rows.filter(isActive).length) ? { label: 'Show fewer' } : {}) }
  const active = rows.filter(isActive)
  const shown = active.slice(0, max)
  const hidden = rows.length - shown.length
  if (hidden === 0) return { shown, hidden }
  return { shown, hidden, label: `Show ${hidden} more` }
}
export const agentActive = (r: { state: string; endedAt?: number; startedAt: number }, now: number): boolean => r.state === 'running' || now - (r.endedAt ?? r.startedAt) < ACTIVE_FOR_MS
export const sessionActive = (r: { kind: string; sinceMs: number }, pinned: boolean): boolean => pinned || r.kind !== 'idle' || r.sinceMs < ACTIVE_FOR_MS
