// Warns in the band when another live session works in the same folder (same cwd or git worktree root). Folder-level, so it warns before anyone edits; the file-level warning is in core/crew.ts.
import { samePath } from './platform'
import { t, tr } from '../i18n/t'
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


// The glossary's state words, as the pane says them
const STATE_WORD: Record<NeighborState, string> = { working: 'Working', waiting: 'Your turn', needs: 'Needs you', idle: 'Idle' }

export const ledgerDetail = (count: number): string => `${count === 1 ? '1 other session works' : `${count} other sessions work`} in this folder. Claude was not told.`

// `explain`: the note on what it watches, said only the first time
export function neighborsText(mode: string, list: readonly Neighbor[], placeKnown: boolean, explain = true): string {
  const out = [t(mode === 'on' ? 'chat.neighbors_on' : 'chat.neighbors_off'), ...(explain ? ['', t('chat.neighbors_about')] : [])]
  if (mode !== 'on') out.push('', t('chat.neighbors_turn_on'))
  out.push('')
  if (!placeKnown) out.push(t('chat.neighbors_no_folder'))
  else if (list.length === 0) out.push(t('chat.neighbors_none'))
  else {
    out.push(t('chat.neighbors_head', { n: list.length }), ...list.map(n => `- ${n.name}: ${tr(STATE_WORD[n.state])}`))
  }
  return out.join('\n')
}
