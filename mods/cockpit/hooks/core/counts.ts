// Daily counts of what each block wrote down, kept 14 days, since the audit keeps only the last 500 actions. Counts only.
import { ymd } from './time'

export const COUNTS_KEY = 'cockpit:counts'
export const COUNTS_DAYS = 14
const COUNTS_TITLES_MAX = 80

type Counts = Record<string, Record<string, number>>

// Local calendar day, so a count after midnight lands on today.
export const dayOf = (at: number): string => ymd(at)

export function parseCounts(raw: unknown): Counts {
  const out: Counts = {}
  if (typeof raw !== 'object' || raw === null) return out
  for (const [day, titles] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || typeof titles !== 'object' || titles === null) continue
    const row: Record<string, number> = {}
    for (const [what, n] of Object.entries(titles)) if (typeof n === 'number' && Number.isFinite(n) && n > 0) row[what.slice(0, 80)] = Math.floor(n)
    out[day] = row
  }
  return out
}

// Sums stored beside the lines because the ledger keeps only the last 60; a session on an older cockpit keeps them as they are.
export const SHORTENED_TITLE = '(count) chats shortened'
export const FREED_TITLE = '(count) tokens freed'
export const LEAN_TOKENS_TITLE = '(count) lean tokens saved'
export const isSumTitle = (what: string): boolean => what === SHORTENED_TITLE || what === FREED_TITLE || what === LEAN_TOKENS_TITLE
export const ACTED_MARK = 'acted:'

export function addCount(raw: unknown, at: number, what: string, by = 1): Counts {
  const all = parseCounts(raw)
  const day = dayOf(at)
  const row = { ...(all[day] ?? {}) }
  const title = what.slice(0, 80)
  if (row[title] !== undefined || Object.keys(row).length < COUNTS_TITLES_MAX) row[title] = (row[title] ?? 0) + Math.max(1, Math.floor(by))
  all[day] = row
  const keep = Object.keys(all).sort().slice(-COUNTS_DAYS)
  return Object.fromEntries(keep.map(d => [d, all[d] ?? {}]))
}

export const countOf = (raw: unknown, at: number, what: string): number => parseCounts(raw)[dayOf(at)]?.[what.slice(0, 80)] ?? 0

export function countsSince(raw: unknown, from: number): Record<string, number> {
  const start = dayOf(from)
  const sum: Record<string, number> = {}
  for (const [day, row] of Object.entries(parseCounts(raw))) if (day >= start) for (const [what, n] of Object.entries(row)) sum[what] = (sum[what] ?? 0) + n
  return sum
}
