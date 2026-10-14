// The app's own session list (title, group, pin, open link), parsed from its `list_sessions` tool.

export type AppSession = { id: string; title: string; cwd: string; branch?: string; isRunning: boolean; lastActivityAt?: string; pinned?: boolean; group?: string; link?: string }
export type AppSessions = { at: number; sessions: AppSession[] }

export const APP_SESSIONS_KEY = 'cockpit:sessions:app'
export const SESSIONS_TOOL = 'list_sessions'
export const SESSIONS_LIMIT = 60
export const SESSIONS_STALE_MS = 10 * 60_000

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const short = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

export function parseSessions(text: string, at: number): AppSessions | undefined {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return undefined
  }
  if (!Array.isArray(data)) return undefined
  const sessions: AppSession[] = []
  for (const s of data) {
    if (!isObj(s) || typeof s.sessionId !== 'string' || typeof s.cwd !== 'string') continue
    sessions.push({
      id: s.sessionId,
      title: typeof s.title === 'string' ? short(s.title, 60) : '',
      cwd: s.cwd,
      isRunning: s.isRunning === true,
      ...(typeof s.branch === 'string' ? { branch: s.branch } : {}),
      ...(typeof s.lastActivityAt === 'string' ? { lastActivityAt: s.lastActivityAt } : {}),
      ...(typeof s.pinned === 'boolean' ? { pinned: s.pinned } : {}),
      ...(isObj(s.group) && typeof s.group.name === 'string' ? { group: short(s.group.name, 40) } : {}),
      ...(typeof s.link === 'string' && s.link.startsWith('claude://') ? { link: s.link } : {}),
    })
  }
  return { at, sessions }
}

export function parseStoredSessions(raw: unknown): AppSessions | undefined {
  if (!isObj(raw) || typeof raw.at !== 'number' || !Array.isArray(raw.sessions)) return undefined
  const sessions = raw.sessions.filter((s): s is AppSession => isObj(s) && typeof s.id === 'string' && typeof s.cwd === 'string' && typeof s.title === 'string' && typeof s.isRunning === 'boolean')
  return { at: raw.at, sessions }
}

// Match by id; else by folder, but only when exactly one app session in the folder is unowned, or a new session would take an older one's title.
export function matchSession(list: AppSessions | undefined, rec: { sessionId: string; cwd: string }, owned: ReadonlySet<string> = new Set()): AppSession | undefined {
  if (list === undefined) return undefined
  const byId = list.sessions.find(s => s.id === rec.sessionId || s.id === `local_${rec.sessionId}`)
  if (byId !== undefined || rec.cwd === '') return byId
  const here = list.sessions.filter(s => s.cwd === rec.cwd && !owned.has(s.id))
  return here.length === 1 ? here[0] : undefined
}
export const ownedById = (list: AppSessions | undefined, recs: readonly { sessionId: string }[]): Set<string> =>
  new Set((list?.sessions ?? []).filter(s => recs.some(r => s.id === r.sessionId || s.id === `local_${r.sessionId}`)).map(s => s.id))
