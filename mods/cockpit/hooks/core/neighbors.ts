// Warns in the band when another live session works in the same folder (same cwd or git worktree root). Folder-level, so it warns before anyone edits; the file-level warning is in core/crew.ts.
import { samePath } from './platform'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'

export const NEIGHBORS_SETTINGS: Setting[] = [
  {
    key: 'neighbors.warn',
    group: 'Crew',
    label: 'Two in one folder',
    note: 'Warn when another session works in this folder.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]

export const NEIGHBORS_HELP: HelpEntry[] = [
  { title: 'Two sessions, one folder: the warning line', text: 'When another live session works in the same folder as this one, a line shows above the prompt. Vaken looks when a session starts and when you send a message, and says it at most every 10 minutes. Claude is not told, and nothing is stopped.' },
  { title: 'Same folder or same file: how the warnings differ', text: 'File overlap warns about one file that another session edited. This warns about the whole folder, also before anyone edits.' },
]

// Repeated at most as often as the line lives.
export const NEIGHBORS_BAND_ID = 'neighbors'
export const NEIGHBORS_BAND_TEXT = 'Another session is in this folder.'
export const NEIGHBORS_TTL_MS = 10 * 60_000
export const NEIGHBORS_EVERY_MS = 10 * 60_000
export const NEIGHBORS_WHAT = 'Warned about a session in the same folder'

export const stampKey = (sessionId: string): string => `cockpit:neighbors:at:${sessionId}`
export const parseStamp = (raw: unknown): number | undefined => (typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined)


export type Place = { cwd: string; top?: string }
type NeighborState = 'needs' | 'working' | 'waiting' | 'idle'
export type Candidate = { sessionId: string; name: string; kind: NeighborState | 'gone'; place: Place }
export type Neighbor = { name: string; state: NeighborState }

// Two worktrees of one repository are two places.
export function samePlace(a: Place, b: Place): boolean {
  if (a.cwd === '' || b.cwd === '') return false
  if (samePath(a.cwd, b.cwd)) return true
  return a.top !== undefined && b.top !== undefined && a.top !== '' && samePath(a.top, b.top)
}

export function neighborsOf(me: string, here: Place, list: readonly Candidate[]): Neighbor[] {
  const out: Neighbor[] = []
  for (const c of list) {
    if (c.sessionId === me || c.kind === 'gone' || !samePlace(here, c.place)) continue
    out.push({ name: c.name, state: c.kind })
  }
  return out
}


export type Verdict = 'off' | 'clear' | 'quiet' | 'post'

// No neighbour forgets the time, so the next neighbour is told at once.
export function verdict(mode: string, count: number, stamp: number | undefined, now: number): Verdict {
  if (mode !== 'on') return 'off'
  if (count === 0) return 'clear'
  return stamp !== undefined && now - stamp >= 0 && now - stamp < NEIGHBORS_EVERY_MS ? 'quiet' : 'post'
}


const STATE_WORD: Record<NeighborState, string> = {
  working: 'is working',
  waiting: 'finished its turn and waits for you',
  needs: 'waits for an answer or an OK',
  idle: 'is idle',
}

export const ledgerDetail = (count: number): string => `${count === 1 ? '1 other session works' : `${count} other sessions work`} in this folder. Claude was not told.`

export function neighborsText(mode: string, list: readonly Neighbor[], placeKnown: boolean): string {
  const out = [`Same-folder awareness: ${mode === 'on' ? 'on' : 'off'}.`, 'It warns when another live session works in the same folder as this one, or in the same git worktree. File overlap (/vaken-help run claims) warns about one file; this warns about the folder.']
  if (mode !== 'on') out.push('Turn it on: Settings > Agents.')
  out.push('')
  if (!placeKnown) out.push('Vaken does not know the folder of this session, so it cannot look.')
  else if (list.length === 0) out.push('No other live session works in this folder.')
  else {
    out.push(`${list.length === 1 ? 'Another session works' : `${list.length} other sessions work`} in this folder:`)
    for (const n of list) out.push(`  ${n.name}: ${STATE_WORD[n.state]}`)
  }
  return out.join('\n')
}
