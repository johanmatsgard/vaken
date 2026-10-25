// The app's own usage card (plan windows, extra usage, plan name), parsed from its `get_usage` tool.
import { fmt } from './fmt'

export type UsageWindow = { label: string; percent: number; resetsAt?: string }
export type AppUsage = {
  at: number
  plan?: string
  windows: UsageWindow[]
  extra?: ExtraUsage
}
// Extra usage: keep every plain number or short word the app gives, by name.
export type ExtraUsage = { enabled: boolean; currency?: string; details?: Record<string, number | string> }

export const APP_USAGE_KEY = 'cockpit:usage:app'
export const USAGE_SERVER = 'ccd_session_mgmt'
export const USAGE_TOOL = 'get_usage'
export const USAGE_FRESH_MS = 60_000

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

// The tool answers with one JSON text block; anything that does not fit gives undefined.
export function parseUsage(text: string, at: number): AppUsage | undefined {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return undefined
  }
  if (!isObj(data) || !isObj(data.plan) || data.plan.status !== 'ok' || !Array.isArray(data.plan.windows)) return undefined
  const windows: UsageWindow[] = []
  for (const w of data.plan.windows) {
    if (!isObj(w) || typeof w.label !== 'string' || typeof w.percentUsed !== 'number') continue
    windows.push({ label: w.label, percent: w.percentUsed, ...(typeof w.resetsAt === 'string' ? { resetsAt: w.resetsAt } : {}) })
  }
  if (windows.length === 0) return undefined
  const extra = parseExtra(data.plan.extraUsage)
  return { at, ...(typeof data.plan.plan === 'string' ? { plan: data.plan.plan } : {}), windows, ...(extra === undefined ? {} : { extra }) }
}

function parseExtra(raw: unknown): ExtraUsage | undefined {
  if (!isObj(raw) || typeof raw.enabled !== 'boolean') return undefined
  const details: Record<string, number | string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'enabled' || k === 'currency' || Object.keys(details).length >= 8) continue
    if (typeof v === 'number' && Number.isFinite(v)) details[k] = v
    else if (typeof v === 'string' && v.length <= 40) details[k] = v
  }
  return { enabled: raw.enabled, ...(typeof raw.currency === 'string' ? { currency: raw.currency } : {}), ...(Object.keys(details).length === 0 ? {} : { details }) }
}


// A name that says cents is divided by 100; names that are not clear are left out rather than guessed.
export type ExtraFigures = { enabled: boolean; currency?: string; used?: number; limit?: number; pct?: number }
export function extraFigures(extra: ExtraUsage): ExtraFigures {
  const base = { enabled: extra.enabled, ...(extra.currency === undefined ? {} : { currency: extra.currency }) }
  if (!extra.enabled || extra.details === undefined) return base
  const nums = Object.entries(extra.details).filter((e): e is [string, number] => typeof e[1] === 'number' && !/reset|time|date|at$/i.test(e[0]))
  const isPercent = (k: string): boolean => /percent|pct/i.test(k)
  const amount = ([k, v]: [string, number]): number => (/cent/i.test(k) ? v / 100 : v)
  const limit = nums.find(([k]) => !isPercent(k) && /limit|cap|budget|max/i.test(k))
  const used = nums.find(([k]) => !isPercent(k) && /used|spent|spend|consumed|usage/i.test(k))
  const pct = nums.find(([k]) => isPercent(k))
  return { ...base, ...(limit === undefined ? {} : { limit: amount(limit) }), ...(used === undefined ? {} : { used: amount(used) }), ...(pct === undefined ? {} : { pct: pct[1] }) }
}

export function extraLines(extra: ExtraUsage, t: (s: string) => string = s => s): string[] {
  const f = extraFigures(extra)
  const out = [t('Extra usage: {v}').replace('{v}', t(extra.enabled ? 'On' : 'Off'))]
  if (f.limit !== undefined) out.push(t('Credit limit: {v}').replace('{v}', () => fmt.moneyIn(f.limit ?? 0, f.currency)))
  if (f.used !== undefined) out.push(t('Used: {v}').replace('{v}', () => fmt.moneyIn(f.used ?? 0, f.currency)))
  if (f.pct !== undefined) out.push(t('{pct} of the credit limit used').replace('{pct}', fmt.percent(f.pct)))
  return out
}

// The card's one extra-usage row: its value ("$12.40 of $50", "On", "Off") and, with figures, the share used for its bar
export function extraRow(extra: ExtraUsage, t: (s: string) => string = s => s): { value: string; pct?: number } {
  const f = extraFigures(extra)
  if (!f.enabled) return { value: t('Off') }
  const pct = f.pct ?? (f.used !== undefined && f.limit !== undefined && f.limit > 0 ? (100 * f.used) / f.limit : undefined)
  const value = f.used !== undefined && f.limit !== undefined ? fmt.ofWhole(fmt.moneyIn(f.used, f.currency), fmt.moneyIn(f.limit, f.currency, undefined, true)) : f.used !== undefined ? fmt.moneyIn(f.used, f.currency) : pct !== undefined ? fmt.percent(pct) : t('On')
  return { value, ...(pct === undefined ? {} : { pct }) }
}

export function parseStoredUsage(raw: unknown): AppUsage | undefined {
  if (!isObj(raw) || typeof raw.at !== 'number' || !Array.isArray(raw.windows)) return undefined
  const windows = raw.windows.filter((w): w is UsageWindow => isObj(w) && typeof w.label === 'string' && typeof w.percent === 'number')
  const extra = isObj(raw.extra) && isObj(raw.extra.details) ? parseExtra({ ...raw.extra.details, enabled: raw.extra.enabled, currency: raw.extra.currency }) : parseExtra(raw.extra)
  return windows.length === 0 ? undefined : { at: raw.at, windows, ...(typeof raw.plan === 'string' ? { plan: raw.plan } : {}), ...(extra === undefined ? {} : { extra }) }
}
