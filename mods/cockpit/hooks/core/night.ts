// Night shift and the promise ledger. A night run goes only on mains power, inside the plan limit and its own cost limit, with away mode's strict checks on. Pure.
import { parseBattery, winBattery } from './crewlaptop'
import { resolveProgram } from './procs'
import { hideSecrets } from './guardcmds'
import { parseAway } from './guardworld'
import { aboutMoney } from './prices'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import type { RunReport } from './overnight'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'

export const NIGHT_LABEL = 'Night run'
export const NIGHT_NOTE = '/vaken-tasks night runs your list on mains power, inside the plan and a cost limit.'
export const NIGHT_SETTINGS: Setting[] = [
  {
    key: 'night.mode',
    group: 'Attention',
    label: NIGHT_LABEL,
    note: NIGHT_NOTE,
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'off',
  },
]
export const NIGHT_HELP_TITLE = 'What a night run does'
export const NIGHT_HELP_TEXT = 'Turn it on with /vaken-settings night.mode on, then type /vaken-tasks night. The run goes only on mains power, inside the plan limit and its cost limit, with away mode\'s strict checks on and the Mac kept awake if keep-awake is on. In the morning, Where was I shows what is done.'
export const NIGHT_HELP: HelpEntry[] = [{ title: NIGHT_HELP_TITLE, text: NIGHT_HELP_TEXT }]

// Read by the keep-awake guard: a night run goes in this session since this time.
export const NIGHT_KEY = 'cockpit:night:on'
export const parseNightOn = (raw: unknown): { sid: string; at: number } | undefined => {
  const o = raw as { sid?: unknown; at?: unknown } | null
  return typeof o === 'object' && o !== null && typeof o.sid === 'string' && typeof o.at === 'number' ? { sid: o.sid, at: o.at } : undefined
}

// What the run turned on, so the end puts back only that.
export type Strict = { away?: number; policy?: string | null }
export type Night = { at: number; usd: number; wait?: 'power'; strict: Strict }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
export function parseNight(raw: unknown): Night | undefined {
  const o = raw as Partial<Night> | null
  if (typeof o !== 'object' || o === null || !isNum(o.at) || !isNum(o.usd)) return undefined
  const s = (typeof o.strict === 'object' && o.strict !== null ? o.strict : {}) as Strict
  const strict: Strict = { ...(isNum(s.away) ? { away: s.away } : {}), ...(s.policy === null || typeof s.policy === 'string' ? { policy: s.policy } : {}) }
  return { at: o.at, usd: o.usd, ...(o.wait === 'power' ? { wait: 'power' as const } : {}), strict }
}

// 0 is the run's own limit.
export const nightCap = (c: { runUsd: number; nightUsd: number }): number => (c.nightUsd > 0 ? c.nightUsd : c.runUsd)

export type Power = 'mains' | 'battery' | 'unknown'
export const POWER_ARGV: readonly string[] = ['pmset', '-g', 'batt']
export const POWER_EVERY_MS = 60_000
// A Mac with no battery reads as mains; no answer is unknown and never stops a run.
export function powerOf(text: string): Power {
  const b = parseBattery(text)
  if (b === undefined) return 'unknown'
  return b.onAc || !b.hasBattery ? 'mains' : 'battery'
}
// Windows: one fixed PowerShell call prints the batteries as JSON (an empty list on a desktop, which reads as mains).
export const WIN_POWER_ARGV = (): string[] => [
  resolveProgram('powershell', 'win32'),
  '-NoProfile',
  '-NonInteractive',
  '-Command',
  // en-only: a PowerShell program, not a text
  "$ErrorActionPreference='SilentlyContinue';ConvertTo-Json -Compress -InputObject @(Get-CimInstance Win32_Battery|Select-Object BatteryStatus)",
]
export function winPowerOf(text: string): Power {
  let raw: unknown
  try {
    raw = JSON.parse(text.trim())
  } catch {
    return 'unknown'
  }
  const b = winBattery(raw)
  return b.onAc || !b.hasBattery ? 'mains' : 'battery'
}

export type NightStep = 'none' | 'power-pause' | 'power-go' | 'cost-pause' | 'plan-pause'
export function nightStep(run: { status: string; night?: Night }, f: { power: Power; usd: number; full: boolean }): NightStep {
  const n = run.night
  if (n === undefined) return 'none'
  if (run.status === 'paused' && n.wait === 'power') return f.power === 'battery' ? 'none' : 'power-go'
  if (run.status !== 'running') return 'none'
  if (f.usd > n.usd) return 'cost-pause'
  if (f.power === 'battery') return 'power-pause'
  return f.full ? 'plan-pause' : 'none'
}

export function strictOnPlan(awayRaw: unknown, policyRaw: unknown, now: number): { strict: Strict; setAway: boolean; setPolicy: boolean } {
  const setAway = parseAway(awayRaw) === undefined
  const setPolicy = policyRaw !== 'careful'
  return { strict: { ...(setAway ? { away: now } : {}), ...(setPolicy ? { policy: typeof policyRaw === 'string' ? policyRaw : null } : {}) }, setAway, setPolicy }
}

// A choice the person changed during the run stays as they set it.
export function strictBackPlan(s: Strict, awayRaw: unknown, policyRaw: unknown): { delAway: boolean; policy?: { to: string | null } } {
  const delAway = s.away !== undefined && parseAway(awayRaw)?.at === s.away
  return { delAway, ...(s.policy !== undefined && policyRaw === 'careful' ? { policy: { to: s.policy } } : {}) }
}

export const NIGHT_STARTED = 'Night run started: {n} tasks. It runs only on mains power, inside the plan limit and up to {usd}. Away mode\'s strict checks are on until it ends.'
export const NIGHT_OFF = 'Night runs are off. Turn them on with /vaken-settings night.mode on.'
export const NIGHT_POWER_PAUSED = 'Night run paused: the Mac is on battery'
export const NIGHT_POWER_GO = 'Night run goes on: the Mac is on power again'
export const NIGHT_COST_PAUSED = 'Night run paused: it reached its cost limit of {usd}'
export const NIGHT_LIMIT_SET = 'A night run pauses past {usd}.'
export const NIGHT_LIMIT_SAME = 'A night run pauses at the run limit.'
export const NIGHT_WHAT_STARTED = 'Started a night run'
export const NIGHT_WHAT_ENDED = 'Ended a night run'

// The morning lead: a night run that ended while the person was away, and no message from them since.
export type NightLead = { name: string; done: number; failed: number; usd: number; failedTasks: string[]; lines: string[] }
export function nightLead(r: RunReport | undefined, now: number, lastPrompt: number | undefined, keepMs: number): NightLead | undefined {
  if (r === undefined || r.night?.away !== true || now - r.endedAt > keepMs || now < r.endedAt) return undefined
  if (lastPrompt !== undefined && lastPrompt >= r.endedAt) return undefined
  const bad = r.tasks.filter(x => x.state === 'failed' || x.check === 'failed')
  return { name: r.name, done: r.done, failed: r.failed, usd: r.usd, failedTasks: bad.map(x => `${x.n}. ${x.text}`), lines: r.tasks.map(x => `${x.n}. ${x.text}: ${x.state}`) }
}

export const NIGHT_HEAD = 'Night run: {done} done, {failed} failed'
export const NIGHT_FIX_ROW = 'Fix the failed night tasks'
export const nightHeadLine = (l: NightLead, t: Tr = same): string => `${fillIn(t(NIGHT_HEAD), { done: l.done, failed: l.failed })}${l.usd > 0 ? ` · ${aboutMoney(l.usd, t)}` : ''}`

// en-only: prompts sent to Claude on a press
export const nightFixPrompt = (l: NightLead): string => `Please fix what failed in my night task run. The tasks that failed: ${l.failedTasks.join('; ')}.`
// en-only: prompts sent to Claude on a press
export const nightShowPrompt = (l: NightLead): string => `My night task run "${l.name}" ended: ${nightHeadLine(l)}. Its tasks: ${l.lines.join('; ')}. Tell me in a few short lines what to look at first.`


export const PROMISES_KEY = (sid: string): string => `cockpit:promises:${sid}`
export const PROMISE_MAX = 10
export const PROMISE_CHARS = 80
const PROMISE_WORDS = 12

const CLAUSE = "([^.!?\\n]{3,200}?)"
const PROMISE_RES: RegExp[] = [
  new RegExp(`\\bI(?:'ll|’ll| will)\\s+${CLAUSE}\\s+later\\b`, 'gi'),
  new RegExp(`\\bnext,?\\s+I(?:'ll|’ll| will)\\s+${CLAUSE}(?=[.!?\\n]|$)`, 'gi'),
  new RegExp(`\\bafter (?:this|that),?\\s+I(?:'ll|’ll| will)\\s+${CLAUSE}(?=[.!?\\n]|$)`, 'gi'),
  new RegExp(`\\bTODO later:?\\s+${CLAUSE}(?=[.!?\\n]|$)`, 'gi'),
]
const cutTo = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

// A few words of each, secrets masked; code blocks are not read.
export function findPromises(answer: string): string[] {
  const text = answer.replace(/```[\s\S]*?```/g, ' ').slice(0, 20_000)
  const out: string[] = []
  for (const re of PROMISE_RES) {
    for (const m of text.matchAll(re)) {
      const words = (m[1] ?? '').replace(/[\s,;:]+$/, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, PROMISE_WORDS).join(' ')
      if (words.length >= 3) out.push(cutTo(hideSecrets(words), PROMISE_CHARS))
    }
  }
  return out
}

export function addPromises(list: readonly string[], found: readonly string[]): string[] {
  const out = [...list]
  for (const p of found) if (!out.some(x => x.toLowerCase() === p.toLowerCase())) out.push(p)
  return out.slice(-PROMISE_MAX)
}

export function parsePromises(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string').map(x => cutTo(x, PROMISE_CHARS)).slice(-PROMISE_MAX) : []
}

// "done" alone clears the oldest; "done 2" the second; "done <words>" the first that holds them. Undefined: not a done message, or nothing matched.
export function donePromise(list: readonly string[], text: string): string[] | undefined {
  // Only a short message is a tick: "Done with that, now fix the login" is a request, not a tick.
  const m = /^\s*done\b[\s:,.!-]*(.*?)\s*$/i.exec(text)
  if (m === null || list.length === 0 || text.trim().split(/\s+/).length > 5) return undefined
  const rest = (m[1] ?? '').trim()
  const at = rest === '' ? 0 : /^\d+$/.test(rest) ? Number(rest) - 1 : list.findIndex(p => p.toLowerCase().includes(rest.toLowerCase()))
  return at >= 0 && at < list.length ? list.filter((_, k) => k !== at) : undefined
}

export const PROMISE_ROW = 'Claude said it would: {what}'
// en-only: a prompt sent to Claude on a press
export const promisePrompt = (p: string): string => `Please do what you said you would: ${p}`

// In memory, so the pane and the prompt hook read no store.
export const nightMem: { lastPrompt?: number; promises: string[] } = { promises: [] }

export const NIGHT_WORDS: string[] = [NIGHT_LABEL, NIGHT_NOTE, NIGHT_HELP_TITLE, NIGHT_HELP_TEXT, NIGHT_STARTED, NIGHT_OFF, NIGHT_POWER_PAUSED, NIGHT_POWER_GO, NIGHT_COST_PAUSED, NIGHT_LIMIT_SET, NIGHT_LIMIT_SAME, NIGHT_WHAT_STARTED, NIGHT_WHAT_ENDED, NIGHT_HEAD, NIGHT_FIX_ROW, PROMISE_ROW]
