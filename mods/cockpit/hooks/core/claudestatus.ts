// Is Claude down? Reads the public Claude status page (one plain GET, no headers, nothing about the person) and keeps the one incident that touches
// Claude Code or the API. Pure rules plus the memory the band and the Notices card read (no store read per beat).

export const STATUS_PAGE = 'https://status.claude.com'
// features/claudestatus.ts writes this same address as fixed text in its fetch, so the plugin directory can read it there: change both together
export const STATUS_URL = `${STATUS_PAGE}/api/v2/summary.json`
export const STATUS_BAND_ID = 'claude-status'
// At most one check every 5 minutes; an error from Claude's own service asks at once, but not more than once a minute.
export const STATUS_EVERY_MS = 5 * 60_000
export const STATUS_SOON_MS = 60_000
// Checks run only while the session is in use: a turn in the last 30 minutes.
export const STATUS_ACTIVE_MS = 30 * 60_000
// The band line lives a little past the next check, so a check that fails leaves it to fade on its own.
export const STATUS_BAND_TTL_MS = STATUS_EVERY_MS + 2 * 60_000
// Errors that come from the service, not from the person's plan or request.
export const SERVICE_ERRORS: readonly string[] = ['overloaded', 'server_error', 'unknown']
// The page's parts that matter here; a name is matched by its words, so "Claude API (api.anthropic.com)" counts.
const OURS = [/\bclaude code\b/i, /\bclaude api\b/i, /\bapi\.anthropic\.com\b/i]
const isOurs = (name: string): boolean => OURS.some(re => re.test(name))
const TITLE_MAX = 120

export type Incident = { title: string; startedAt: number; major: boolean }

type RawComponent = { name?: unknown; status?: unknown }
type RawIncident = { name?: unknown; status?: unknown; impact?: unknown; started_at?: unknown; created_at?: unknown; components?: unknown }

const timeOf = (v: unknown): number | undefined => {
  const t = typeof v === 'string' ? Date.parse(v) : NaN
  return Number.isFinite(t) ? t : undefined
}
const flat = (s: string): string => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX - 1)}…` : t
}

// The status page's summary: the oldest open incident on Claude Code or the API, if any. A resolved one, a maintenance or a part that is not ours is never shown.
// Major: the page says major or critical, or one of our parts is in a major outage.
export function incidentOf(raw: unknown): Incident | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const o = raw as { incidents?: unknown; components?: unknown }
  const comps = Array.isArray(o.components) ? (o.components as RawComponent[]) : []
  const outage = comps.some(c => typeof c?.name === 'string' && isOurs(c.name) && c.status === 'major_outage')
  const open = (Array.isArray(o.incidents) ? (o.incidents as RawIncident[]) : []).filter(i => {
    if (typeof i?.name !== 'string' || i.name.trim() === '') return false
    if (i.status === 'resolved' || i.status === 'postmortem' || i.status === 'completed') return false
    const parts = Array.isArray(i.components) ? (i.components as RawComponent[]) : []
    return parts.some(c => typeof c?.name === 'string' && isOurs(c.name))
  })
  if (open.length === 0) return undefined
  const list = open.map(i => ({ title: flat(String(i.name)), startedAt: timeOf(i.started_at) ?? timeOf(i.created_at) ?? 0, major: i.impact === 'major' || i.impact === 'critical' || outage }))
  list.sort((a, b) => Number(b.major) - Number(a.major) || a.startedAt - b.startedAt)
  return list[0]
}

export function parseStatus(text: string): Incident | undefined {
  try {
    return incidentOf(JSON.parse(text))
  } catch {
    return undefined
  }
}

// `checkedAt` the last check that ran; `turnAt` the last turn of this session; `failed` the last check could not read the page (blocked or offline).
export const statusMem: { incident?: Incident; checkedAt?: number; turnAt?: number; failed?: boolean; checking?: boolean } = {}
export function forgetStatus(): void {
  statusMem.incident = undefined
  statusMem.checkedAt = undefined
  statusMem.turnAt = undefined
  statusMem.failed = undefined
  statusMem.checking = undefined
}

// Whether a check is due: the session is in use and the last check is old enough (`soon` for a service error).
export function statusDue(now: number, soon = false): boolean {
  if (statusMem.checking === true) return false
  if (statusMem.turnAt === undefined || now - statusMem.turnAt > STATUS_ACTIVE_MS) return false
  if (statusMem.checkedAt === undefined) return true
  return now - statusMem.checkedAt >= (soon ? STATUS_SOON_MS : STATUS_EVERY_MS)
}

// What the person reads; translated where it is said.
export const STATUS_PAGE_LABEL = 'Status page'
export const STATUS_MEANS = 'The Claude status page reports trouble with Claude Code or the API. Slow or failed answers may come from there, not from your work.'
export const STATUS_WHY = 'Reported {ago} on the status page'
export const STATUS_STRINGS: string[] = [STATUS_PAGE_LABEL, STATUS_MEANS, STATUS_WHY]
