// Counts failing and slow parts of vaken per area per day; counts and short names only, never error text.
import { langNow, t, tLine, tr } from '../i18n/t'
import { fillIn } from './fillin'
import { fmt } from './fmt'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { postBand } from './band'
import type { Io } from './io'
import { ymd } from './time'
import { serialUpdate } from './serial'

const HEALTH_SETTING = 'modhealth.mode'
// Same text as settingStoreKey() in settings.ts, which the registry cannot import.
export const HEALTH_MODE_KEY = `cockpit:setting:${HEALTH_SETTING}`
export const HEALTH_KEY = 'cockpit:health:counts'

export const HEALTH_SETTINGS: Setting[] = [
  {
    key: HEALTH_SETTING,
    group: 'Health',
    label: 'Vaken health',
    note: 'Counts failing and slow parts of vaken, says when Claude is down, and warns.', // en-only: a setting note; /vaken-settings text stays English
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]

export const HEALTH_HELP: HelpEntry[] = [
  {
    title: 'What the self-check of vaken does',
    text: 'Vaken counts its own parts that fail or run slow, per day, and warns above the prompt when one fails 3 times in a day. To say when Claude is down, it reads the public status.claude.com page. /vaken-help run modhealth shows the counts.',
  },
]

// A guess to tune: a hook has a ten second budget.
export const SLOW_MS = 1500
export const WARN_AT = 3
export const KEEP_DAYS = 7
const MAX_AREAS = 40
const MAX_KINDS = 8

type AreaDay = { failed: number; slow: number; slowMs: number; maxMs: number; kinds: Record<string, number> }
type Counts = Record<string, Record<string, AreaDay>>

const AREA_WORDS: Record<string, string> = {
  guard: 'The safety check',
  undo: 'Undo',
  trust: 'The plugin trust card',
  loopbreaker: 'The loop breaker',
  cachekeeper: 'The cache keeper',
  compaction: 'Compacting the session',
}
export const areaWords = (area: string): string => AREA_WORDS[area] ?? `The "${area}" part`

const clean = (s: string, max: number): string => s.toLowerCase().replace(/[^a-z0-9._:-]/g, '-').slice(0, max)
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)

export const dayOf = ymd

const emptyArea = (): AreaDay => ({ failed: 0, slow: 0, slowMs: 0, maxMs: 0, kinds: {} })

export function parseCounts(raw: unknown): Counts {
  if (typeof raw !== 'object' || raw === null) return {}
  const out: Counts = {}
  for (const [day, areas] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || typeof areas !== 'object' || areas === null) continue
    const one: Record<string, AreaDay> = {}
    for (const [area, v] of Object.entries(areas as Record<string, unknown>).slice(0, MAX_AREAS)) {
      if (typeof v !== 'object' || v === null) continue
      const r = v as Record<string, unknown>
      const kinds: Record<string, number> = {}
      if (typeof r.kinds === 'object' && r.kinds !== null) for (const [k, n] of Object.entries(r.kinds as Record<string, unknown>).slice(0, MAX_KINDS)) kinds[clean(k, 24)] = num(n)
      one[clean(area, 24)] = { failed: num(r.failed), slow: num(r.slow), slowMs: num(r.slowMs), maxMs: num(r.maxMs), kinds }
    }
    out[day] = one
  }
  return out
}

const trimDays = (c: Counts): Counts => Object.fromEntries(Object.keys(c).sort().slice(-KEEP_DAYS).map(d => [d, c[d] ?? {}]))

export function withFailure(c: Counts, now: number, area: string, kind: string): { counts: Counts; failed: number } {
  const day = dayOf(now)
  const a = clean(area, 24)
  const old = c[day]?.[a] ?? emptyArea()
  const k = clean(kind, 24)
  const kinds = k in old.kinds || Object.keys(old.kinds).length < MAX_KINDS ? { ...old.kinds, [k]: (old.kinds[k] ?? 0) + 1 } : old.kinds
  const next: AreaDay = { ...old, failed: old.failed + 1, kinds }
  return { counts: trimDays({ ...c, [day]: { ...(c[day] ?? {}), [a]: next } }), failed: next.failed }
}

export function withSlow(c: Counts, now: number, area: string, ms: number): Counts {
  if (!(ms >= SLOW_MS)) return c
  const day = dayOf(now)
  const a = clean(area, 24)
  const old = c[day]?.[a] ?? emptyArea()
  const next: AreaDay = { ...old, slow: old.slow + 1, slowMs: old.slowMs + Math.round(ms), maxMs: Math.max(old.maxMs, Math.round(ms)) }
  return trimDays({ ...c, [day]: { ...(c[day] ?? {}), [a]: next } })
}


// Serialised so two notes at the same moment keep both.
let chain: Promise<unknown> = Promise.resolve()
const queue = <T>(job: () => Promise<T>): Promise<T> => {
  const p = chain.then(job)
  chain = p.catch(() => undefined)
  return p
}

const isOn = async (i: Io): Promise<boolean> => (await i.get(HEALTH_MODE_KEY)) !== 'off'

// Never throws.
export function noteFailure(i: Io, area: string, kind: string): Promise<number> {
  return queue(async () => {
    try {
      if (!(await isOn(i))) return 0
      const now = await i.now()
      // One writer at a time here; if another session wrote over it, the count is made again.
      let failed = 0
      await serialUpdate(
        i,
        HEALTH_KEY,
        old => {
          const r = withFailure(parseCounts(old), now, area, kind)
          failed = r.failed
          return r.counts
        },
        stored => (parseCounts(stored)[dayOf(now)]?.[clean(area, 24)]?.failed ?? 0) >= failed,
      )
      if (failed >= WARN_AT) await postBand(i, 'warn', `health:${clean(area, 24)}`, tLine('band.area_failed_n_times_today', { area: areaWords(area), n: failed }))
      return failed
    } catch {
      return 0
    }
  })
}

// Never throws.
export function noteSlow(i: Io, area: string, ms: number): Promise<boolean> {
  return queue(async () => {
    try {
      if (!(ms >= SLOW_MS) || !(await isOn(i))) return false
      await i.set(HEALTH_KEY, withSlow(parseCounts(await i.get(HEALTH_KEY)), await i.now(), area, ms))
      return true
    } catch {
      return false
    }
  })
}

export async function timed<T>(i: Io, area: string, job: () => Promise<T>): Promise<T> {
  const t0 = await i.now()
  try {
    const out = await job()
    await noteSlow(i, area, (await i.now()) - t0)
    return out
  } catch (err) {
    await noteFailure(i, area, 'throw')
    throw err
  }
}

export async function readCounts(i: Io): Promise<Counts> {
  return parseCounts(await i.get(HEALTH_KEY))
}


type Load = { problems: string[] }

const secs = (ms: number): string => `${fmt.decimal(ms / 1000, langNow())} s`

export function slowestArea(c: Counts, now: number): { area: string; maxMs: number; slow: number } | undefined {
  const today = c[dayOf(now)] ?? {}
  let best: { area: string; maxMs: number; slow: number } | undefined
  for (const [area, v] of Object.entries(today)) {
    if (v.slow === 0) continue
    if (best === undefined || v.maxMs > best.maxMs || (v.maxMs === best.maxMs && v.slow > best.slow)) best = { area, maxMs: v.maxMs, slow: v.slow }
  }
  return best
}

export function healthText(mode: 'on' | 'off', c: Counts, now: number, load: Load): string {
  const today = c[dayOf(now)] ?? {}
  const lines: string[] = []
  lines.push(mode === 'on' ? tr('Vaken health: on. Vaken counts its own parts that fail or run slow (a step over 1.5 seconds is slow).') : tr('Vaken health: off. Nothing is counted. Turn it on in Settings > Health.'))
  lines.push('')
  const areas = Object.entries(today).filter(([, v]) => v.failed > 0 || v.slow > 0)
  if (areas.length === 0) lines.push(tr('Today: no failure and no slow step counted.'))
  else {
    lines.push(tr('Today:'))
    for (const [area, v] of areas.sort((a, b) => b[1].failed - a[1].failed || b[1].slow - a[1].slow)) {
      const parts: string[] = []
      if (v.failed > 0) parts.push(`${fillIn(tr('failed {times}'), { times: t('words.times', { n: v.failed }) })}${Object.keys(v.kinds).length > 0 ? ` (${Object.entries(v.kinds).map(([k, n]) => `${k} ${n}`).join(', ')})` : ''}`)
      if (v.slow > 0) parts.push(fillIn(tr('{steps}, slowest {time}'), { steps: t('words.slow_step', { n: v.slow }), time: secs(v.maxMs) }))
      lines.push(`  ${area}: ${parts.join('; ')}${v.failed >= WARN_AT ? `  ${tr('<- warning in the band')}` : ''}`)
    }
    const s = slowestArea(c, now)
    if (s !== undefined) lines.push(fillIn(tr('Slowest: {area}, {time} for one step.'), { area: s.area, time: secs(s.maxMs) }))
  }
  const earlier = Object.keys(c).filter(d => d !== dayOf(now)).sort().reverse().slice(0, 3)
  const earlierLines = earlier.map(d => {
    const v = Object.values(c[d] ?? {})
    return { d, failed: v.reduce((n, x) => n + x.failed, 0), slow: v.reduce((n, x) => n + x.slow, 0) }
  }).filter(x => x.failed + x.slow > 0)
  if (earlierLines.length > 0) lines.push('', tr('Earlier days:'), ...earlierLines.map(x => `  ${x.d}: ${t('words.failure', { n: x.failed })}, ${t('words.slow_step', { n: x.slow })}`))
  lines.push('')
  if (load.problems.length > 0) lines.push(tr('Plugins refused at load (this session):'), ...load.problems.map(p => `  ${p}`))
  else lines.push(tr('Plugins refused at load: none seen.'))
  lines.push(
    '',
    tr('Not knowable from here: why a hook of another plugin fails or runs slow, and whether a plugin failed to load before vaken did. The engine keeps those in its own debug log. Vaken counts only its own parts, and a plugin that the engine refused after vaken loaded.'),
  )
  return lines.join('\n')
}
