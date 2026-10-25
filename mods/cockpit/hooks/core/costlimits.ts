// Limit consequence: what reaching the plan limit would stall. Vaken cannot divide a limit between sessions. Pure.
import type { AppSessions } from './appsessions'
import { SESSIONS_STALE_MS } from './appsessions'
import type { AppUsage, UsageWindow } from './appusage'
import { extraLines } from './appusage'
import { forecastOf, forecastWords, weekLong } from './limitforecast'
import { ago } from './cost'
import { paceOf, runOutOf } from './pace'
import type { History } from './pace'
import { STALE_MS, isBusy } from './record'
import type { SessionRecord } from './record'
import { money } from './prices'
import { hhmm } from './time'
import { fmt } from './fmt'
import { fillIn } from './fillin'
import { langNow, t as tNow, tr } from '../i18n/t'

type Running = { count: number; source: 'app' | 'vaken' }

// The app's own session list sees every session, so it is used when fresh; else records active in the last two minutes.
export function runningNow(records: SessionRecord[], app: AppSessions | undefined, now: number): Running {
  if (app !== undefined && now - app.at < SESSIONS_STALE_MS) return { count: app.sessions.filter(s => s.isRunning).length, source: 'app' }
  return { count: records.filter(r => isBusy(r, now) && now - r.updatedAt < STALE_MS).length, source: 'vaken' }
}

export function resetWords(resetsAt: string | undefined, now: number): string {
  const at = resetsAt === undefined ? NaN : new Date(resetsAt).getTime()
  if (Number.isNaN(at)) return tr('The reset time is not known.')
  const left = at - now
  if (left <= 0) return tr('It is resetting now.')
  const m = Math.round(left / 60_000)
  const inWords = m < 60 ? fillIn(tr('{n} min'), { n: m }) : m < 2880 ? fillIn(tr('{h} h {m} min'), { h: Math.floor(m / 60), m: m % 60 }) : fillIn(tr('{n} days'), { n: Math.round(m / 1440) })
  const day = left > 20 * 3_600_000 ? `${fmt.day(new Date(at).getDay(), langNow())} ` : ''
  return fillIn(tr('It resets {day}{time} (in {span}).'), { day, time: hhmm(at), span: inWords })
}

// Whole percents that never claim more than is true: 99.6% reads 99% used, 1% left, until the window really is full.
export const usedPct = (p: number): number => (p >= 100 ? 100 : Math.max(0, Math.min(99, Math.round(p))))
export const leftPct = (p: number): number => 100 - usedPct(p)

const limiting = (windows: UsageWindow[]): UsageWindow | undefined => [...windows].sort((a, b) => b.percent - a.percent)[0]

function runOutAt(w: UsageWindow, now: number, history: History): number | undefined {
  const p = paceOf(w, now, history[w.label])
  return runOutOf(p)
}

const sessionsWord = (n: number): string => tNow('words.session', { n })

type LimitFacts = {
  usage: AppUsage | undefined
  history: History
  running: Running
  spenders: Array<[string, number]>
  now: number
}

export function limitsText(f: LimitFacts): string {
  const u = f.usage
  if (u === undefined || u.windows.length === 0) {
    return tr('The plan limits are not known yet. Vaken reads the app usage card, and that has not answered. Type /vaken-usage to read it now.')
  }
  const lines: string[] = [fillIn(tr('Plan limits. Source: the app usage card, read {ago}.'), { ago: ago(f.now - u.at) })]
  for (const w of u.windows) {
    lines.push(fillIn(tr('{label}: {used} used, {left} left. {reset}'), { label: tr(w.label), used: fmt.percent(usedPct(w.percent)), left: fmt.percent(leftPct(w.percent)), reset: resetWords(w.resetsAt, f.now) }))
    const fc = forecastOf(w, f.now, f.history[w.label])
    if (fc !== undefined) lines.push(`  ${forecastWords(fc, f.now, weekLong(w.label), tr)}`)
  }
  if (u.extra !== undefined) lines.push(...extraLines(u.extra))

  const w = limiting(u.windows)
  const n = f.running.count
  lines.push('')
  if (w !== undefined) {
    const out = runOutAt(w, f.now, f.history)
    const reset = resetWords(w.resetsAt, f.now)
    const run = n === 0 ? tr('No session is running now.') : fillIn(tr('{sessions} running now{list}.'), { sessions: sessionsWord(n), list: f.running.source === 'app' ? ` ${tr("(the app's list)")}` : '' })
    const label = tr(w.label)
    if (w.percent >= 100) lines.push(fillIn(tr('The {label} limit is reached. {then} {reset}'), { label, then: n === 0 ? tr('A session started now would wait.') : fillIn(tr('All {sessions} that run are stalled.'), { sessions: sessionsWord(n) }), reset }))
    else if (out !== undefined) lines.push(fillIn(n === 0 ? tr('If the pace holds, the {label} limit is reached about {time}. Then every session waits until the reset. {run} {reset}') : tr('If the pace holds, the {label} limit is reached about {time}. Then the {sessions} that run stop until the reset. {run} {reset}'), { label, time: hhmm(out), sessions: sessionsWord(n), run, reset }))
    else lines.push(fillIn(tr('At this pace the {label} limit lasts until the reset. {run} They share the {left} that is left. {reset}'), { label, run, left: fmt.percent(leftPct(w.percent)), reset }))
  }
  if (f.spenders.length > 1) lines.push(fillIn(tr("Spending most, by the engine's totals: {list}."), { list: f.spenders.slice(0, 3).map(([name, usd]) => `${name} ${money(usd)}`).join(', ') }))

  const tight = w !== undefined && (w.percent >= 60 || runOutAt(w, f.now, f.history) !== undefined)
  lines.push('')
  if (!tight) lines.push(tr('Plenty is left. Nothing to share yet.'))
  else {
    lines.push(tr('To share what is left (vaken cannot split a limit for you):'))
    lines.push(tr('1. Finish the most important session first.'))
    lines.push(tr('2. Pause the others. All sessions draw on the same limit.'))
    lines.push(tr('3. Use a cheaper model for simple work.'))
    lines.push(tr('4. Avoid agents. Each one draws on the limit too.'))
  }
  return lines.join('\n')
}
