// Limit consequence: what reaching the plan limit would stall. Vaken cannot divide a limit between sessions. Pure.
import type { AppSessions } from './appsessions'
import { SESSIONS_STALE_MS } from './appsessions'
import type { AppUsage, UsageWindow } from './appusage'
import { extraLines } from './appusage'
import { ago } from './cost'
import { paceOf, runOutOf } from './pace'
import type { History } from './pace'
import { LIVE_MS, STALE_MS } from './record'
import type { SessionRecord } from './record'
import { moneyEn as money } from './prices'
import { hhmm } from './time'
import { fmt } from './fmt'

type Running = { count: number; source: 'app' | 'vaken' }

// The app's own session list sees every session, so it is used when fresh; else records active in the last two minutes.
export function runningNow(records: SessionRecord[], app: AppSessions | undefined, now: number): Running {
  if (app !== undefined && now - app.at < SESSIONS_STALE_MS) return { count: app.sessions.filter(s => s.isRunning).length, source: 'app' }
  return { count: records.filter(r => r.state === 'working' && now - r.lastEventAt < LIVE_MS && now - r.updatedAt < STALE_MS).length, source: 'vaken' }
}

export function resetWords(resetsAt: string | undefined, now: number): string {
  const at = resetsAt === undefined ? NaN : new Date(resetsAt).getTime()
  if (Number.isNaN(at)) return 'The reset time is not known.'
  const left = at - now
  if (left <= 0) return 'It is resetting now.'
  const m = Math.round(left / 60_000)
  const inWords = m < 60 ? `${m} min` : m < 2880 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.round(m / 1440)} days`
  const day = left > 20 * 3_600_000 ? `${fmt.day(new Date(at).getDay())} ` : ''
  return `It resets ${day}${hhmm(at)} (in ${inWords}).`
}

const limiting = (windows: UsageWindow[]): UsageWindow | undefined => [...windows].sort((a, b) => b.percent - a.percent)[0]

function runOutAt(w: UsageWindow, now: number, history: History): number | undefined {
  const p = paceOf(w, now, history[w.label])
  return runOutOf(p)
}

const sessionsWord = (n: number): string => (n === 1 ? '1 session' : `${n} sessions`)

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
    return 'The plan limits are not known yet. Vaken reads the app usage card, and that has not answered. Type /vaken-usage to read it now.'
  }
  const lines: string[] = [`Plan limits. Source: the app usage card, read ${ago(f.now - u.at)}.`]
  for (const w of u.windows) {
    lines.push(`${w.label}: ${Math.round(w.percent)}% used, ${Math.max(0, 100 - Math.round(w.percent))}% left. ${resetWords(w.resetsAt, f.now)}`)
    const p = paceOf(w, f.now, f.history[w.label])
    if (p === undefined) continue
    const out = runOutAt(w, f.now, f.history)
    if (out !== undefined) lines.push(`  At the pace so far it runs out about ${hhmm(out)}, before the reset (estimate).`)
    else lines.push(`  At the pace so far it ends near ${Math.round(p.projected)}% (estimate).`)
  }
  if (u.extra !== undefined) lines.push(...extraLines(u.extra))

  const w = limiting(u.windows)
  const n = f.running.count
  lines.push('')
  if (w !== undefined) {
    const out = runOutAt(w, f.now, f.history)
    const reset = resetWords(w.resetsAt, f.now)
    const run = n === 0 ? 'No session is running now.' : `${sessionsWord(n)} running now${f.running.source === 'app' ? " (the app's list)" : ''}.`
    if (w.percent >= 100) lines.push(`The ${w.label} limit is reached. ${n === 0 ? 'A session started now would wait.' : `All ${sessionsWord(n)} that run are stalled.`} ${reset}`)
    else if (out !== undefined) lines.push(`If the pace holds, the ${w.label} limit is reached about ${hhmm(out)}. Then ${n === 0 ? 'every session waits' : `the ${sessionsWord(n)} that run stop`} until the reset. ${run} ${reset}`)
    else lines.push(`At this pace the ${w.label} limit lasts until the reset. ${run} They share the ${Math.max(0, 100 - Math.round(w.percent))}% that is left. ${reset}`)
  }
  if (f.spenders.length > 1) lines.push(`Spending most, by the engine's totals: ${f.spenders.slice(0, 3).map(([name, usd]) => `${name} ${money(usd)}`).join(', ')}.`)

  const tight = w !== undefined && (w.percent >= 60 || runOutAt(w, f.now, f.history) !== undefined)
  lines.push('')
  if (!tight) lines.push('Plenty is left. Nothing to share yet.')
  else {
    lines.push('To share what is left (vaken cannot split a limit for you):')
    lines.push('1. Finish the most important session first.')
    lines.push('2. Pause the others. All sessions draw on the same limit.')
    lines.push('3. Use a cheaper model for simple work.')
    lines.push('4. Avoid agents. Each one draws on the limit too.')
  }
  return lines.join('\n')
}
