// The home view as plain data and plain words.
import type { AppUsage, UsageWindow } from '../../core/appusage'
import { extraLines } from '../../core/appusage'
import { contextFacts } from '../../core/appcontext'
import { cacheWords, lastAfterTokens, lastSummaryOut } from '../../core/cachefacts'
import { CACHE_TTL_CREDITS_MS, CACHE_TTL_SUBSCRIPTION_MS, CACHE_WARM_MS, compactMoment } from '../../core/compactmoment'
import type { Extra, Facts } from '../../core/compactmoment'
import { SESSIONS_STALE_MS, matchSession, ownedById } from '../../core/appsessions'
import type { AppSessions } from '../../core/appsessions'
import { paceOf, pressureOf, runOutOf, windowLength } from '../../core/pace'
import type { History, Pace } from '../../core/pace'
import { warnAheadMs } from '../../core/limitwarn'
import { dayShare, dayShareWords, weekWindow } from '../../core/dayshare'
import type { DayShare } from '../../core/dayshare'
import { DROP_MS, LIVE_MS, STALE_MS, isDead } from '../../core/record'
import type { SessionRecord } from '../../core/record'
import type { Moment } from '../../core/compactmoment'
import { bandWords } from '../../core/band'
import type { BandItem } from '../../core/band'
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
  usage?: AppUsage
  hist?: History
  now?: number
  ledger?: Entry[]
  firstRun?: boolean
  band?: BandItem[]
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
  if (rec.state === 'working') return now - rec.lastEventAt <= LIVE_MS ? 'working' : 'idle'
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
  return flat === '' ? undefined : flat.split(' ').length > TITLE_WORDS ? flat.slice(0, TITLE_CHARS) : keyTitle(flat)
}
// The session's name: its title (ownName), else its branch, else its folder.
export const nameOf = (rec: Pick<SessionRecord, 'cwd' | 'sessionId' | 'title' | 'branch'>): string => ownName(rec.title) ?? fallbackName(rec)

export function reasonOf(rec: SessionRecord, kind: Kind): string {
  if (kind === 'needs' && rec.ask !== undefined) {
    return rec.ask.kind === 'question' ? 'asks you a question' : `waits to run ${rec.ask.tool}, may need OK`
  }
  if (kind === 'waiting') return 'finished, waits for you'
  return ''
}

export function reasonWords(reason: string, t: (s: string) => string): string {
  const m = /^waits to run (.+), may need OK$/.exec(reason)
  return m === null ? t(reason) : t('waits to run {tool}, may need OK').replace('{tool}', m[1])
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
    const since = rec.ask !== undefined && kind === 'needs' ? rec.ask.since : rec.stateSince
    const app = sessions !== undefined && now - sessions.at < SESSIONS_STALE_MS ? matchSession(sessions, rec, owned) : undefined
    const row: Row = { rec, kind, reason: reasonOf(rec, kind), sinceMs: Math.max(0, now - since), name: app !== undefined && app.title !== '' ? app.title : nameOf(rec), ...(app?.link === undefined ? {} : { link: app.link }), ...(app?.pinned === true ? { pinned: true } : {}), ...(app?.group === undefined ? {} : { group: app.group }) }
    if (rec.sessionId === hereId) view.here = row
    else view[kind].push(row)
  }
  view.needs.sort((a, b) => b.sinceMs - a.sinceMs)
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
  const newest = (percent: (r: SessionRecord) => number | undefined, resetsAt: (r: SessionRecord) => string | undefined): Limit | undefined => {
    const reported = live.filter(rec => percent(rec) !== undefined)
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
    for (const rec of live) if (resetsAt(rec) !== undefined && (resetFrom === undefined || rec.updatedAt > resetFrom.updatedAt)) resetFrom = rec
    return { percent: pct, resetsAt: resetsAt(from) ?? (resetFrom === undefined ? undefined : resetsAt(resetFrom)), sinceMs: Math.max(0, now - fresh.updatedAt) }
  }
  view.limit = newest(r => r.fiveHourPercent, r => r.fiveHourResetsAt)
  view.week = newest(r => r.sevenDayPercent, r => r.sevenDayResetsAt)
  view.spend = newest(r => r.spendPercent, r => r.spendResetsAt)
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
  const time = m[2] === undefined ? undefined : sentence ? t('at {time}').replace('{time}', m[2]) : m[2]
  const when = [m[1] === undefined ? undefined : t(m[1]), time].filter((x): x is string => x !== undefined).join(' ')
  return t(sentence ? 'It resets {when}' : 'resets {when}').replace('{when}', when)
}
export function limitLabel(label: string, t: T = same): string {
  const m = /^Weekly limit · (.+)$/.exec(label)
  return m === null || m[1] === 'all models' ? t(label) : `${t('Weekly limit')} · ${m[1]}`
}

export const USAGE_STALE_MS = 10 * 60_000

export type LimitBlock = { kind: LimitKind; short: string; label: string; percent: number; reset: string; sinceMs?: number; pace?: Pace; withDay: boolean; resetsAt?: string }

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
  const out: LimitBlock[] = []
  const now = view.now
  const add = (kind: LimitKind, short: string, label: string, limit: Limit | undefined, week: boolean) => {
    const withDay = week || notToday(Date.parse(limit?.resetsAt ?? ''), now)
    if (limit !== undefined) out.push({ kind, short, label, percent: limit.percent, reset: resetWord(limit.resetsAt, withDay, now), sinceMs: limit.sinceMs, withDay, resetsAt: limit.resetsAt })
  }
  add('session', '5-hour limit', '5-hour limit', view.limit, false)
  add('week', 'Week', 'Weekly limit', view.week, true)
  add('spend', 'Spend', 'Spending limit', view.spend, false)
  return out.filter(b => !windowOver(b, view.now ?? 0))
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
  return blocks.map(b => withReset(t('{name} {pct} used').replace('{name}', t(b.short)).replace('{pct}', fmt.percent(b.percent)), b, t))
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
  const outAt = runOutOf(p)
  if (outAt !== undefined) out.push(t('Estimate: it runs out {when}, before the reset.').replace('{when}', whenWord(outAt, now, t)))
  else out.push(t('Estimate: about {n}% at the reset, at this pace.').replace('{n}', String(Math.min(999, Math.round(p.projected)))))
  if (p.recentPerHour !== undefined) {
    const rate = String(p.recentPerHour < 10 ? fmt.decimal(p.recentPerHour, langNow()) : Math.round(p.recentPerHour))
    out.push(p.recentHitAt === undefined ? t('Recent pace: {n}% an hour.').replace('{n}', rate) : t('Recent pace: {n}% an hour, so it runs out {when}.').replace('{n}', rate).replace('{when}', whenWord(p.recentHitAt, now, t)))
  }
  return out
}

export function paceShort(b: LimitBlock, now: number, t: T = same): string {
  const p = b.pace
  if (p === undefined) return ''
  return p.hitAt !== undefined ? t('out {when}').replace('{when}', whenWord(p.hitAt, now, t)) : t('~{n}% at reset').replace('{n}', String(Math.min(999, Math.round(p.projected))))
}

export type LimitLines = { note: string; groups: string[][]; source: string; shown?: LimitBlock[]; folded?: LimitBlock[]; daily?: DayShare }
export function limitLines(blocks: LimitBlock[], detail: Detail, view?: View, t: T = same): LimitLines {
  if (blocks.length === 0) return { note: '', groups: [], source: '' }
  const now = view?.now ?? 0
  const fromApp = view?.usage !== undefined && blocks.some(b => b.kind === view.usage!.windows[0]?.label)
  const plan = fromApp ? view?.usage?.plan : undefined
  const oldest = Math.max(...blocks.map(b => b.sinceMs ?? 0))
  const stale = oldest >= LIMIT_STALE_MS
  const age = ageWord(oldest, t)
  if (detail === 'simple') {
    if (blocks.length > 1) return { note: plan ?? '', groups: [], source: '' }
    const b = blocks[0]
    const words = [t(b.short), resetSaid(b.reset, t), paceShort(b, now, t)].filter(w => w !== '').join(' · ')
    return { note: stale ? `${words} · ${t('{age} ago').replace('{age}', age)}` : words, groups: [], source: '' }
  }
  const shown = blocks.filter((b, n) => !folds(b, n))
  const folded = blocks.filter((b, n) => folds(b, n))
  const daily = view === undefined ? undefined : dayShareOf(view)
  const groups = shown.map(b => [`${limitLabel(b.label, t)}: ${fmt.percent(b.percent)} ${t('used')}`, ...(b.reset === '' ? [] : [resetSaid(b.reset, t, true)]), ...paceLines(b, now, t)])
  if (fromApp) {
    const extra = view?.usage?.extra
    groups.push([t('Plan'), ...(plan === undefined ? [] : [t('Subscription: {plan}').replace('{plan}', () => plan)]), ...(extra === undefined ? [] : extraLines(extra, t))])
  }
  const source = fromApp ? (stale ? t('Last read {age} ago.').replace('{age}', age) : '') : stale ? t('Last reported {age} ago').replace('{age}', age) : t('Where it comes from: Claude Code')
  return { note: '', groups, source, shown, ...(folded.length === 0 ? {} : { folded }), ...(daily === undefined ? {} : { daily }) }
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

export function hereLines(row: Row | undefined, detail: Detail, ttlMs?: number, now?: number, advise = true, keeper = false, extra?: Extra, t: T = same): { head: string; context?: string; cost?: string; compact?: string; used?: string; top?: string; cache?: string; cacheHit?: string; advice?: string[]; why?: string } {
  if (row === undefined) return { head: t('Nothing to show yet. This appears after the first answer.') }
  const rec = row.rec
  const simple = detail !== 'explained'
  const state = t(stateWord(row.kind))
  const head = row.kind === 'needs' && row.reason !== '' && !simple ? `${state}: ${reasonWords(row.reason, t)}` : state
  const cost = rec.costUsd === undefined ? undefined : fmt.moneyPlain(rec.costUsd)
  const pct = rec.contextPercent === undefined ? undefined : Math.round(rec.contextPercent)
  const moment: Moment = !advise ? { level: 'none', lines: [] } : compactMoment(hereFacts(row, ttlMs, now, extra), t)
  if (simple) return { head: cost === undefined ? head : `${head}, ${cost}`, context: pct === undefined ? undefined : `${pct}%`, ...(moment.lines.length > 0 ? { advice: [moment.lines[0]] } : {}) }
  const facts = rec.ctx === undefined ? {} : contextFacts(rec.ctx, rec.contextPercent, t)
  const kept = keeper ? ` · ${t('kept cheap')}` : ''
  const cache = rec.cache === undefined || now === undefined ? undefined : `${cacheWords(rec.cache, now, ttlMs, false, t)}${kept}`
  const cacheHit = rec.cache === undefined || now === undefined ? undefined : `${cacheWords(rec.cache, now, ttlMs, true, t)}${kept}`
  return { head, context: pct === undefined ? undefined : t('Context is {n}% full').replace('{n}', String(pct)), cost, ...facts, ...(cache === undefined ? {} : { cache }), ...(cacheHit === undefined ? {} : { cacheHit }), ...(moment.lines.length === 0 ? {} : { advice: moment.lines }), ...(moment.why === undefined ? {} : { why: moment.why }) }
}

export const limitWord = (limit: Limit, detail: Detail = 'explained'): string => `${fmt.percent(limit.percent)}${detail === 'explained' ? ' used' : ''}`

// `waits`: this session waits for you though Claude Code says it works (View.hereWaits); it then says Needs you, as the pane's card does.
// en-only: the text twin stays English, as the rest of hereWord
const WAITS_WHY: Record<NonNullable<View['hereWaits']>, string> = { halt: 'paused, it waits for you to resume it', hold: 'a stopped step waits for your yes' }
export function hereWord(row: Row | undefined, detail: Detail = 'explained', waits?: View['hereWaits']): string {
  if (row === undefined) return 'Nothing to show yet. This appears after the first answer.'
  const rec = row.rec
  const simple = detail !== 'explained'
  const state = stateWord(waits === undefined ? row.kind : 'needs')
  const why = waits !== undefined ? WAITS_WHY[waits] : row.kind === 'needs' ? row.reason : ''
  const parts = [why !== '' && !simple ? `${state}: ${why}` : state]
  if (rec.contextPercent !== undefined) parts.push(simple ? `${fmt.percent(rec.contextPercent)}` : `context ${fmt.percent(rec.contextPercent)} full`)
  if (rec.costUsd !== undefined) parts.push(simple ? fmt.moneyPlain(rec.costUsd) : `${fmt.moneyPlain(rec.costUsd)} so far`)
  const facts = rec.ctx === undefined || detail !== 'explained' ? {} : contextFacts(rec.ctx, rec.contextPercent)
  if (facts.compact !== undefined) parts.push(facts.compact.toLowerCase())
  return parts.join(', ')
}

export const chipWord = (rec: SessionRecord): string => (rec.ask?.kind === 'question' ? 'Question' : 'OK needed')

export const othersWord = (view: View, say: (s: string) => string = s => s): string => {
  const parts: string[] = []
  if (view.waiting.length > 0) parts.push(say('{n} your turn').replace('{n}', String(view.waiting.length)))
  if (view.working.length > 0) parts.push(say('{n} working').replace('{n}', String(view.working.length)))
  if (view.idle.length > 0) parts.push(view.idle.length === 1 ? say('1 idle') : say('{n} idle').replace('{n}', String(view.idle.length)))
  // A session that asks you is in Needs you, so with nothing else this says where it is
  if (parts.length === 0) return view.needs.length > 0 ? say('{n} waiting for you').replace('{n}', String(view.needs.length)) : say('No other session is active now.')
  return parts.join(' · ')
}
export const othersCount = (view: View, say: (s: string) => string = s => s): string =>
  view.waiting.length + view.working.length > 0 ? othersWord({ ...view, idle: [] }, say) : view.idle.length > 0 ? othersWord(view, say) : '0'

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
  if (view.firstRun === true) lines.push('New here? Vaken has three modes: Only alerts, Recommended (the default) and Everything useful. /vaken-settings preset lists them; add quiet, recommended or full to see what it changes, then yes to choose it.')
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
        say(`${b.label}: ${fmt.percent(b.percent)} used${b.reset === '' ? '' : `, ${b.reset}`}${ago === '' ? '' : `, read ${ago}`}.${paceLines(b, view.now ?? 0).map(l => ` ${l}`).join('')}`, 'limits')
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
  back?: 'open' | 'none' // the Where was I card (core/backcard.ts backLoud): open ends warn, otherwise calm
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
    back: f.back === 'open' ? 'warn' : 'calm',
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
  const next: View = { ...view, working: keep(view.working), waiting: keep(view.waiting), idle: keep(view.idle) }
  return { view: next, hiddenCount: allOthers(view).length - allOthers(next).length }
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
