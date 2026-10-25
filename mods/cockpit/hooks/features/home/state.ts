// The pane's view flags: what the pane shows in this session (views, not settings).

import type { ErasePreview } from '../../core/erase'
import type { CommandEntry } from '../../core/skills'
import type { Lang } from '../../i18n/types'
import type { BriefMark } from '../../core/contextcard'
import type { ThrowLoss } from '../orchestra'
import { isLang } from '../../i18n/langs'

export type PaneView = 'cards' | 'settings' | 'runner' | 'help' | 'guide'

export type RolesScope = 'all' | 'project' | 'session'

export const flags: {
  paneView: PaneView
  openWhat: string | undefined
  openSections: string[]
  startPreview: string | undefined
  // Settings change All projects, or only the project of this session.
  settingsScope: 'all' | 'project'
  rolesScope: RolesScope
  settingsFocus: string | undefined
  bandListOpen: boolean
  arranging: boolean
  // The Mac's language
  macLang: string
  layoutDraft: string
  backStack: PaneView[]
  resetStep: 'none' | 'ask' | 'done'
  eraseStep: 'none' | 'preview' | 'done'
  erasePreview: ErasePreview | undefined
  eraseDone: { keys: number; folders: number; left: number; unread?: boolean } | undefined
  // The task whose "Throw away" is asking (Throw away or Keep) in its open row.
  throwAsk: number | undefined
  // The task whose Throw away found work that would be lost (commits not merged
  throwSure: number | undefined
  // What that Throw away would lose, read by git when its ask opened (undefined while git reads).
  throwLoss: { n: number; loss: ThrowLoss } | undefined
  // The Agents view's "Clear past runs" is asking (Clear or Keep).
  pastClearAsk: boolean
  applyAsk: string | undefined
  backAsk: boolean
  // The words typed in the search field of Settings and of Help: in memory only, gone when the view closes
  settingsFind: string
  helpFind: string
  // Where the line on the old "cockpit" name shows, the first time a place shows such a path
  oldNameAt: string | undefined
} = {
  paneView: 'cards',
  openWhat: undefined,
  openSections: [],
  startPreview: undefined,
  settingsScope: 'all',
  rolesScope: 'all',
  settingsFocus: undefined,
  bandListOpen: false,
  arranging: false,
  macLang: 'en',
  layoutDraft: '',
  backStack: [],
  resetStep: 'none',
  eraseStep: 'none',
  erasePreview: undefined,
  eraseDone: undefined,
  throwAsk: undefined,
  throwSure: undefined,
  throwLoss: undefined,
  pastClearAsk: false,
  applyAsk: undefined,
  backAsk: false,
  settingsFind: '',
  helpFind: '',
  oldNameAt: undefined,
}

export const runnerDraft = { task: '', check: '', template: '', say: '' }
export const undoShown: { lines?: string[]; of?: string } = {}
export const briefShown: { marks?: BriefMark[] } = {}
export const simple: { pending: boolean; lines?: string[] } = { pending: false }
export const compactAsk: { lines?: string[]; at?: number } = {}
export const COMPACT_ASK_MS = 5 * 60_000
// Closes the ask when it is stale (`now` at least COMPACT_ASK_MS after it was asked) or a new turn started (`turnStarted`).
export function settleCompactAsk(now: number, turnStarted = false): boolean {
  if (compactAsk.lines === undefined) return false
  if (!turnStarted && compactAsk.at !== undefined && now - compactAsk.at < COMPACT_ASK_MS) return false
  compactAsk.lines = undefined
  compactAsk.at = undefined
  return true
}

// The Skills card's search box, in memory only: the words typed, whether the list shows all its matches
export const skillFind: { query: string; all: boolean; commands?: CommandEntry[]; at: number; failed: boolean; pause: number } = { query: '', all: false, at: 0, failed: false, pause: 0 }

// The language of vaken: the one chosen in Settings
export const langOf = (chosen: string | undefined, sys: string, has: (code: string) => boolean = isLang): Lang => {
  if (chosen !== undefined && chosen !== 'auto' && has(chosen)) return chosen
  const m = /^([A-Za-z]{2,3})(?:[-_]([A-Za-z]{2,4}))?(?![A-Za-z])/.exec(sys)
  if (m === null) return 'en'
  const base = m[1].toLowerCase()
  const region = m[2] === undefined ? undefined : `${base}-${m[2].length === 2 ? m[2].toUpperCase() : m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()}`
  if (region !== undefined && has(region)) return region
  return has(base) ? base : 'en'
}
