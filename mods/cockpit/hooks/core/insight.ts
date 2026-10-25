// Pure rules and words for audit, wait tracking, quota planning, review by story and cost per outcome.
import type { AppUsage } from './appusage'
import type { Entry } from './ledger'
import { shownTitle, startOfDay } from './ledger'
import type { HelpEntry } from './registry'
import { paceOf, windowLength } from './pace'
import { pad2 } from './words'
import { fmt } from './fmt'
import { langNow, t, tr, trFill } from '../i18n/t'
import { fillIn } from './fillin'
import { leftPct, usedPct } from './costlimits'

// Quiet always-on counters with no Settings row.
export const INSIGHT_HELP: HelpEntry[] = [
  { title: 'Audit list: every step vaken took', text: '/vaken-help run audit lists what vaken did and which steps you allowed, for the last 500 actions. /vaken-help run audit export writes it to a file you can keep or share.' },
  { title: 'How long did Claude wait for me?', text: '/vaken-today waits shows how long Claude waited for you today: for answers, for approvals, and after it finished. It shows where you are the bottleneck.' },
  { title: 'Will this job fit in my plan?', text: '/vaken-usage fit 20 says whether a job that uses about 20% of your plan window fits, or when to start it.' },
]

export const AUDIT_KEY = 'cockpit:audit'
const AUDIT_MAX = 500
export type AuditRow = { at: number; session?: string; what: string; detail?: string; how?: string }
export const parseAudit = (raw: unknown): AuditRow[] => (Array.isArray(raw) ? raw.filter((r): r is AuditRow => typeof (r as AuditRow)?.what === 'string' && typeof (r as AuditRow)?.at === 'number').slice(0, AUDIT_MAX) : [])
export const toAudit = (e: Entry): AuditRow => ({ at: e.at, ...(e.session === undefined ? {} : { session: e.session.slice(0, 8) }), what: e.what, ...(e.detail === undefined ? {} : { detail: e.detail.slice(0, 200) }), ...(e.how === undefined ? {} : { how: e.how }) })
export const withAudit = (list: AuditRow[], row: AuditRow): AuditRow[] => [row, ...list].slice(0, AUDIT_MAX)

const stamp = (at: number): string => {
  const d = new Date(at)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const HOWWORD: Record<string, string> = { auto: 'by itself', typed: 'typed by you', button: 'from a button' }
// `say` given: the title and the detail in that language (the file export keeps the stored English)
const auditLine = (r: AuditRow, say?: (s: string) => string): string => `${stamp(r.at)}  ${say === undefined ? r.what : say(shownTitle(r.what))}${r.detail === undefined ? '' : ` (${say === undefined ? r.detail : trFill(r.detail)})`}${r.how === undefined ? '' : ` [${say === undefined ? (HOWWORD[r.how] ?? r.how) : say(HOWWORD[r.how] ?? r.how)}]`}`
export function auditText(rows: AuditRow[], n = 15): string {
  if (rows.length === 0) return tr('The audit is empty. Vaken writes a line here for each thing it does for you.')
  return [fillIn(tr('Audit: {n} actions kept (newest first). Showing {m}.'), { n: rows.length, m: Math.min(n, rows.length) }), ...rows.slice(0, n).map(r => `  ${auditLine(r, tr)}`), '', tr('/vaken-help run audit export writes all of them to a file.')].join('\n')
}
// en-only: a file written to disk to keep or share
export const auditFile = (rows: AuditRow[]): string => `# Vaken audit\n\nWhat vaken did, newest first. Titles, details and times only.\n\n${rows.map(r => `- ${auditLine(r)}`).join('\n')}\n`

type Wait = { n: number; ms: number }
type Waits = { day: number; question: Wait; permission: Wait; after: Wait; longest: number }
export const emptyWaits = (day: number): Waits => ({ day, question: { n: 0, ms: 0 }, permission: { n: 0, ms: 0 }, after: { n: 0, ms: 0 }, longest: 0 })
export const waitsKey = (): string => 'cockpit:waits'
export function parseWaits(raw: unknown, now: number): Waits {
  const o = raw as Waits
  const ok = typeof o === 'object' && o !== null && o.day === startOfDay(now) && typeof o.question?.n === 'number' && typeof o.permission?.n === 'number' && typeof o.after?.n === 'number'
  return ok ? o : emptyWaits(startOfDay(now))
}
// Shorter is not a bottleneck; longer is a break (a night, a meeting), not Claude waiting on you at the desk.
const WAIT_MIN_MS = 5_000
export const WAIT_MAX_MS = 2 * 3_600_000
export function addWait(w: Waits, kind: 'question' | 'permission' | 'after', ms: number): Waits {
  if (ms < WAIT_MIN_MS || ms > WAIT_MAX_MS) return w
  return { ...w, [kind]: { n: w[kind].n + 1, ms: w[kind].ms + ms }, longest: Math.max(w.longest, ms) }
}
const durWord = (ms: number): string => fmt.duration(ms, langNow())
export function waitsText(w: Waits): string {
  const total = w.question.n + w.permission.n + w.after.n
  if (total === 0) return tr('Claude has not waited for you today, as far as vaken saw.')
  const ms = w.question.ms + w.permission.ms + w.after.ms
  const part = (label: string, x: Wait): string => (x.n === 0 ? '' : `\n  ${fillIn(tr('{label}: {times}, {time} in all'), { label: tr(label), times: t('words.time', { n: x.n }), time: durWord(x.ms) })}`)
  return `${fillIn(tr('Today Claude waited for you {times}, {time} in all. The longest wait was {longest}.'), { times: t('words.time', { n: total }), time: durWord(ms), longest: durWord(w.longest) })}${part('questions', w.question)}${part('approvals', w.permission)}${part('after it finished', w.after)}\n\n${tr('The biggest share is where you can save the most time.')}`
}

// A share the person typed, in the decimal mark and spacing of the language
const pctText = (n: number): string => (langNow() === 'sv' ? `${String(n).replace('.', ',')}\u00a0%` : `${n}%`)

export function fitText(usage: AppUsage | undefined, need: number, now: number): string {
  if (usage === undefined) return tr('The plan limits are not known yet. Type /vaken-usage to read them now, then /vaken-usage fit again.')
  if (!(need > 0 && need <= 100)) return tr('Say how much of the plan window the job needs, from 1 to 100: /vaken-usage fit 20')
  const lines: string[] = []
  const needText = pctText(need)
  for (const w of usage.windows) {
    if (windowLength(w.label) === undefined) continue
    const left = 100 - w.percent
    const reset = w.resetsAt === undefined ? undefined : new Date(w.resetsAt).getTime()
    const pace = paceOf(w, now)
    const sameDay = reset !== undefined && !Number.isNaN(reset) && new Date(reset).getDate() === new Date(now).getDate()
    const at = reset === undefined || Number.isNaN(reset) ? '' : sameDay ? fillIn(tr('It resets at {time}.'), { time: stamp(reset).slice(11) }) : fillIn(tr('It resets at {time} on {date}.'), { time: stamp(reset).slice(11), date: stamp(reset).slice(0, 10) })
    const fits = left >= need
    const risky = fits && pace !== undefined && pace.projected + need > 100
    const verdict = fits
      ? risky
        ? fillIn(tr('A {need} job fits now, but at your pace the window would run out before it resets.'), { need: needText })
        : fillIn(tr('A {need} job fits.'), { need: needText })
      : `${fillIn(tr('A {need} job does not fit.'), { need: needText })}${at === '' ? '' : ` ${at}`} ${tr('Start it after the reset.')}`
    lines.push(`${fillIn(tr('{label}: {used} used, {left} left.'), { label: tr(w.label), used: fmt.percentIn(usedPct(w.percent), langNow()), left: fmt.percentIn(leftPct(w.percent), langNow()) })} ${verdict}`)
  }
  return lines.length === 0 ? tr('No plan window with a known length was found.') : lines.join('\n')
}

type Numstat = { path: string; added: number; removed: number }
export function parseNumstat(text: string): Numstat[] {
  const out: Numstat[] = []
  for (const l of text.split(/\r?\n/)) {
    const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(l.trim())
    if (m !== null) out.push({ path: m[3], added: m[1] === '-' ? 0 : Number(m[1]), removed: m[2] === '-' ? 0 : Number(m[2]) })
  }
  return out
}
type Area = 'screen' | 'logic' | 'tests' | 'config' | 'docs'
export function areaOf(path: string): Area {
  if (/(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[a-z]+$/.test(path)) return 'tests'
  if (/\.(md|mdx|txt|rst)$/.test(path) || /(^|\/)docs?\//.test(path)) return 'docs'
  if (/\.(css|scss|sass|less|html|svg|tsx|jsx|vue|svelte)$/.test(path)) return 'screen'
  if (/(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig[\w.]*\.json|\.github\/|Dockerfile|\.env[\w.]*|[\w.-]*\.(ya?ml|toml|ini|lock))$/.test(path)) return 'config'
  return 'logic'
}
const AREA_WORD: Record<Area, string> = { screen: 'What you would see on screen', logic: 'How it works inside', tests: 'Tests', config: 'Settings and setup', docs: 'Notes and docs' }
const ORDER: Area[] = ['screen', 'logic', 'config', 'tests', 'docs']
export function storyText(goal: string | undefined, stats: Numstat[]): string {
  if (stats.length === 0) return tr('No uncommitted change to tell a story about. The story is built from `git diff` against the last commit.')
  const why = goal === undefined || goal === '' ? tr('Why: no goal was set. Set one with /vaken-tasks goal so the story starts with why.') : fillIn(tr('Why: {goal}'), { goal })
  const lines = [why, fillIn(tr('What: {files}, {added} lines added, {removed} removed.'), { files: t('words.file', { n: stats.length }), added: stats.reduce((n, s) => n + s.added, 0), removed: stats.reduce((n, s) => n + s.removed, 0) })]
  for (const area of ORDER) {
    const files = stats.filter(s => areaOf(s.path) === area)
    if (files.length === 0) continue
    lines.push('', `${tr(AREA_WORD[area])} (${files.length}):`, ...files.slice(0, 6).map(f => `  ${f.path} (+${f.added} -${f.removed})`), ...(files.length > 6 ? [`  ${fillIn(tr('and {n} more'), { n: files.length - 6 })}`] : []))
  }
  return lines.join('\n')
}

type Outcome = { at: number; kind: 'done' | 'merged'; usd: number; session: string }
export const OUTCOMES_KEY = 'cockpit:outcomes'
const OUTCOMES_MAX = 100
export const parseOutcomes = (raw: unknown): Outcome[] => (Array.isArray(raw) ? raw.filter((o): o is Outcome => typeof (o as Outcome)?.usd === 'number' && typeof (o as Outcome)?.at === 'number').slice(0, OUTCOMES_MAX) : [])
export const addOutcome = (list: Outcome[], o: Outcome): Outcome[] => [o, ...list].slice(0, OUTCOMES_MAX)
const money = (usd: number): string => (langNow() === 'en' ? (usd < 0.01 ? t('fmt.under_usd', { usd: fmt.moneyPlain(0.01, 'en') }) : `$${usd.toFixed(usd < 1 ? 3 : 2)}`) : usd < 0.01 ? t('fmt.under_usd', { usd: fmt.moneyPlain(0.01, langNow()) }) : fmt.moneyIn(usd, 'USD', langNow()))
const KIND_WORD: Record<Outcome['kind'], string> = { done: 'finished work (the definition of done was met)', merged: 'merged a pull request' }
export function outcomesText(list: Outcome[], now: number): string {
  const today = list.filter(o => o.at >= startOfDay(now))
  if (list.length === 0) return tr('No finished work noted yet. Vaken notes an outcome when your definition of done is met (/vaken-ship done) or a pull request is merged.')
  const avg = (xs: Outcome[]): number => xs.reduce((n, o) => n + o.usd, 0) / Math.max(1, xs.length)
  const outcomes = t('words.outcome', { n: today.length })
  return [
    today.length === 0 ? fillIn(tr('Today: {outcomes}.'), { outcomes }) : fillIn(tr('Today: {outcomes}, about {money} each on average (estimate).'), { outcomes, money: money(avg(today)) }),
    fillIn(tr('All kept: {n}, about {money} each.'), { n: list.length, money: money(avg(list)) }),
    ...list.slice(0, 5).map(o => `  ${stamp(o.at)}  ${fillIn(tr('{kind}: about {money}'), { kind: tr(KIND_WORD[o.kind]), money: money(o.usd) })}`),
    '',
    tr('The cost is the estimate for the session since the last outcome. On a subscription it is the list price of the same use, not what you pay.'),
  ].join('\n')
}

// Nothing removes a per-session note when its session ends; this finds the orphans.
const SESSION_KEY = /^cockpit:[a-z0-9:-]+:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export function tidyKeys(keys: string[], liveIds: string[]): string[] {
  return keys.filter(k => SESSION_KEY.test(k) && !liveIds.some(id => k.endsWith(`:${id}`)) && !k.startsWith('cockpit:setting:') && !k.startsWith('cockpit:pref:'))
}
const tidySession = (key: string): string => key.slice(key.lastIndexOf(':') + 1)
export function tidyText(keys: string[], applied: boolean): string {
  if (keys.length === 0) return tr('Nothing to tidy. No leftover notes.')
  const sessions = new Set(keys.map(tidySession)).size
  const what = fillIn(tr('{notes} from {sessions}'), { notes: t('words.leftover_note', { n: keys.length }), sessions: t('words.closed_session', { n: sessions }) })
  return applied ? fillIn(tr('Removed {what}.'), { what }) : fillIn(tr('{what}. Safe to remove. Say /vaken-help run tidy yes to remove them.'), { what })
}
