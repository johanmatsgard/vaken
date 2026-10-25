// Shared parts of the Crew features: settings rows, help, ledger titles, small helpers, memory of session folders. Pure.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { detectStyle, isInside, lastPart, parts as pathParts } from './platform'
import { tEn } from '../i18n/t'

export const CREW3_SETTINGS: Setting[] = [
  {
    key: 'crew.worktrees',
    group: 'Crew',
    label: 'Worktree cleanup',
    note: 'Say when worktrees are safe to remove.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
  {
    key: 'crew.ports',
    group: 'Crew',
    label: 'Shared ports',
    note: 'Warn when another session holds a port.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
  {
    key: 'awake.mode',
    group: 'Crew',
    label: 'Keep Mac awake',
    note: 'Keep the Mac awake while agents work.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'off',
  },
  {
    key: 'awake.away',
    group: 'Crew',
    label: 'Awake when away',
    note: 'Keep the Mac awake for a phone or a waiting question.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'waiting', label: 'Waiting 2h' },
      { value: 'phone', label: 'Phone only' },
    ],
    default: 'phone',
  },
]

export const CREW3_HELP: HelpEntry[] = [
  { title: 'Busy ports and extra project folders: what it checks', text: 'Vaken looks at which program holds a port, and in which session folder it started. When Claude is about to start a server on a port another session holds, Claude gets a note, so two sessions do not fight over one port. It also says which worktrees (extra copies of your project folder, one for each session that works on its own) are clean and merged, so they are safe to remove. It removes one only when you press Remove this copy on the Pull requests card, and only a merged one with nothing uncommitted or unpushed; for the rest it prints the exact command for you.' },
  { title: 'How does it help me merge and ship?', text: 'Merge order says which pull request to merge first. CI fix writes a prompt from the failing check, for you to send, and stops after 3 tries a day. The branch digest lists your changes, riskiest first. The orphan finder lists leftover programs and the command to stop each one; you run it.' },
]

export const PORT_WHAT = 'Warned about a port another session holds'
export const AWAKE_WHAT = 'Kept the Mac awake'
export const AWAKE_CAP_WHAT = 'Stopped keeping the Mac awake: limit reached'


export function shq(text: string): string {
  return /^[\w@%+=:,./-]+$/.test(text) ? text : `'${text.replace(/'/g, `'\\''`)}'`
}

export function ageWords(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / 60_000)
  if (m < 1) return 'less than a minute'
  if (m < 60) return tEn('words.minute', { n: m })
  const h = Math.floor(m / 60)
  if (h < 48) return tEn('words.hour', { n: h })
  return tEn('words.day', { n: Math.floor(h / 24) })
}

export const baseName = (p: string): string => lastPart(p)

export function shortFolder(path: string): string {
  const parts = pathParts(path)
  return parts.length === 0 ? '/' : parts.slice(-2).join(detectStyle(path) === 'win32' ? '\\' : '/')
}

export const cut = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

export const isPath = (cwd: string, folder: string): boolean =>
  detectStyle(cwd + folder) === 'win32' ? isInside(folder, cwd, 'win32') && folder !== '' : cwd === folder || cwd.startsWith(`${folder.replace(/\/+$/, '')}/`)

// A session's record is dropped when it ends, so a short list of folders seen tells which belonged to an ended session.

export type Folder = { cwd: string; name: string; seen: number }
export const FOLDERS_KEY = 'cockpit:crew3:folders'
export const FOLDERS_KEEP = 40
const FOLDERS_TTL_MS = 7 * 86_400_000

export function parseFolders(raw: unknown): Folder[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is Folder => typeof x === 'object' && x !== null && typeof (x as Folder).cwd === 'string' && typeof (x as Folder).name === 'string' && typeof (x as Folder).seen === 'number')
}

// Too shallow a folder (home, root) is never kept: any program below it would look like it belonged.
export const usableFolder = (cwd: string, home: string): boolean => pathParts(cwd).length >= 3 && !(home !== '' && isInside(home, cwd) && isInside(cwd, home))

export function learnFolders(old: Folder[], seen: { cwd: string; name: string }[], now: number, home: string): Folder[] {
  const map = new Map<string, Folder>()
  for (const f of old) if (now - f.seen < FOLDERS_TTL_MS && usableFolder(f.cwd, home)) map.set(f.cwd, f)
  for (const s of seen) if (s.cwd !== '' && usableFolder(s.cwd, home)) map.set(s.cwd, { cwd: s.cwd, name: s.name, seen: now })
  return [...map.values()].sort((a, b) => b.seen - a.seen).slice(0, FOLDERS_KEEP)
}

export function matchFolder(folders: Folder[], path: string): Folder | undefined {
  let best: Folder | undefined
  for (const f of folders) if (isPath(path, f.cwd) && (best === undefined || f.cwd.length > best.cwd.length)) best = f
  return best
}

export type Live = Map<string, string[]>

export function liveFolders(records: { sessionId: string; cwd: string; updatedAt: number }[], now: number, staleMs: number): Live {
  const live: Live = new Map()
  for (const r of records) {
    if (r.cwd === '' || now - r.updatedAt > staleMs) continue
    live.set(r.cwd, [...(live.get(r.cwd) ?? []), r.sessionId])
  }
  return live
}
