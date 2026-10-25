// The pane's kept choices (store keys) and the shapes the pane draws from: Prefs (everything a draw needs besides the view) and Acts (what its buttons do).
import type { Io } from '../../core/io'
import type { GlanceLoud } from '../../core/headline'
import type { QuietAsk } from '../../core/whatis'
import type { BoardRow, IdleRow } from '../../core/agentboard'
import type { Overlap } from '../../core/crew'
import type { Run } from '../../core/orchestra'
import type { RestVerdict } from '../../core/compactrest'
import { resetSettings } from '../../core/settings'
import type { Values } from '../../core/settings'
import type { SkillListing } from '../../core/skills'
import type { RunReport } from '../../core/overnight'
import type { Laptop } from '../../core/crewlaptop'
import type { ProofState } from '../../core/proof'
import type { Entry } from '../../core/ledger'
import type { InboxItem } from '../../core/inbox'
import type { PrRow, PrsFacts } from '../../core/prcard'
import type { Checkpoint } from '../../core/safetycard'
import type { ContextRead } from './context'
import type { BriefMark } from '../../core/contextcard'
import type { DevFact } from '../../core/previewcard'
import type { SetupRead } from '../../core/setupcard'
import type { RowAction } from './rowact'
import type { TalkActs } from './talk'
import type { FitActs } from './modelfit'
import type { StartActs, StartCheck } from './starttask'
import type { SelectedActs } from './selected'
import type { CalmView } from '../calm'
import { resetOrders } from './layouts'
import type { ColumnLists, Layouts, Orders } from './layouts'
import type { CardId, Detail, Marks, Row } from './logic'
import type { RolesScope } from './state'
import type { SetupPress } from './firstsetup'
import type { ViewMode } from './viewset'

export const PANE = 'cockpit-home'
export const PANE_TITLE = 'Vaken'
// Folding: the "Other sessions" card can be folded
export const PREF_OTHERS_OPEN = 'cockpit:pref:open:others'
export const PREF_OTHERS_ALL = 'cockpit:pref:all:others'
export const PREF_AGENTS_OPEN = 'cockpit:pref:open:agents'
export const PREF_AGENTS_ALL = 'cockpit:pref:all:agents'
export const PREF_LISTS = 'cockpit:pref:lists'
export const LIST_SCOPES = [
  { value: 'now', label: 'Now' },
  { value: 'all', label: 'All' },
]
export const AGENT_FROM = [
  { value: 'all', label: 'All sessions' },
  { value: 'here', label: 'This session' },
]
// It rides in the same bundle, so the pane reads nothing more.
export type ListPrefs = { others: 'now' | 'all'; agents: 'now' | 'all'; from: 'all' | 'here'; seen?: string[]; open?: string[] }
export const parseLists = (raw: unknown): ListPrefs => {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<ListPrefs>
  const seen = Array.isArray(o.seen) ? o.seen.filter((x): x is string => typeof x === 'string').slice(-SEEN_MAX) : undefined
  const open = Array.isArray(o.open) ? o.open.filter((x): x is string => typeof x === 'string').slice(0, SEEN_MAX) : undefined
  return { others: o.others === 'all' ? 'all' : 'now', agents: o.agents === 'all' ? 'all' : 'now', from: o.from === 'here' ? 'here' : 'all', ...(seen === undefined ? {} : { seen }), ...(open === undefined ? {} : { open }) }
}
const SEEN_MAX = 60
export const PREF_MARKS = 'cockpit:pref:marks'
const LIST_PREF_KEYS = [PREF_LISTS, PREF_OTHERS_OPEN, PREF_OTHERS_ALL, PREF_AGENTS_OPEN, PREF_AGENTS_ALL]
export async function resetEverything(i: Io): Promise<void> {
  await resetSettings(i)
  await resetOrders(i)
  await i.del(PREF_MARKS)
  for (const key of LIST_PREF_KEYS) await i.del(key)
}
export const FIRST_RUN_KEY = 'cockpit:firstrun'
export const STARTS = ['careful', 'balanced', 'thrifty', 'everything'] as const

export type Prefs = { overlaps?: Overlap[]; idle?: IdleRow[]; watching?: string[]; inbox: InboxItem[]; undoFiles: number; undoPreview?: string[]; undoPreviewOf?: string; checkpoints?: Checkpoint[]; lists: ListPrefs; laptop?: Laptop; skills?: { counts: unknown; listing?: SkillListing }; report?: RunReport; history: RunReport[]; runner: boolean; templates: string[]; hasAnswer: boolean; project?: { root: string; name: string; set: Values }; globalValues: Values; settingsScope: 'all' | 'project'; rolesScope: RolesScope; sessionSet: Values; run?: Run; sid: string; rest?: RestVerdict; agentsOpen: boolean; agentsAll: boolean; agentFrom: Record<string, string>; open?: string; openSections: string[]; backAsk?: boolean; quiet?: QuietAsk; startPreview?: string; settingsFocus?: string; bandList: boolean; agents?: BoardRow[]; proof?: ProofState; halted: boolean; ledger: Entry[]; help: boolean; guide?: boolean; detail: Detail; othersOpen: boolean; othersAll: boolean; orders: Orders; columnLists?: ColumnLists; hidden: CardId[]; autoHidden?: CardId[]; arrange: boolean; settings: boolean; values: Values; marks: Marks; allOthers: Row[]; hiddenCount: number; cardDetail: Record<CardId, Detail>; layouts: Layouts; currentLayout?: string; shrunk?: CardId[]; calm?: CalmView; prs?: PrsFacts; myPr?: PrRow; shipShown?: string[]; context?: ContextRead; briefMarks?: BriefMark[]; devServer?: DevFact; setup?: SetupRead; startCheck?: StartCheck; guardWarn?: 'warn' | 'worst' | 'maybe'; guardExplicit?: string[]; setupRaw?: unknown; setupOpen?: boolean; settingsUndo?: { what: string; at: number } }
export type Acts = { open: (key: string | undefined, acted?: string) => void; toggleSection: (key: string) => void; openSettingsAt: (group: string | undefined, acted?: string) => void; previewStart: (preset: string | undefined) => void; quiet: (q: QuietAsk, isQuiet: boolean) => void; closeBandList: () => void; startHere: (preset: string) => void; setup: (press: SetupPress | { kind: 'finish' } | { kind: 'skip' }) => void; runSetupAgain: () => void; askBack?: (step: 'ask' | 'yes' | 'keep') => void; undoSettings?: () => void; undoChanged?: (key: string) => void; compactNow: () => void; compactAnyway: () => void; compactNotNow: () => void; openHelp: (isOpen: boolean) => void; openGuide: (isOpen: boolean) => void; saveLayout: (name: string) => void; renameLayout: (from: string, to: string) => void; applyLayout: (name: string) => void; deleteLayout: (name: string) => void; openSettings: (isOpen: boolean) => void; setSetting: (key: string, value: string) => void; setMark: (id: string, mark: 'pin' | 'hide' | 'show') => void; askReset: (on: boolean) => void; resetSettings: () => void; askErase: (on: boolean) => void; eraseAll: () => void; setScope: (scope: 'all' | 'project') => void; setRolesScope: (scope: RolesScope) => void; setRoleModel: (key: string, value: string) => void; followForSession: () => void; runSteer: (args: string) => void; askThrow?: (n: number | undefined) => void; askPastClear?: (on: boolean) => void; clearPast?: () => void; askApply?: (name: string | undefined) => void; openRunner: (isOpen: boolean) => void; saySimpler: () => void; closeSimpler: () => void; closeReport: () => void; setList: (field: keyof ListPrefs, value: string) => void; arrange: (isOn: boolean) => void; pickView?: (mode: ViewMode) => void; flipDetail: (id: CardId, level: Detail, exact?: boolean) => void; startSkill: (command: string) => void; findSkill: (text: string, force?: boolean) => void; findMore: () => void; run: (action: RowAction) => void; watch?: (id: string, on: boolean, name: string, isWorking: boolean) => void; askShorten?: (yes: boolean) => void; talk?: TalkActs; calm: (what: 'focus' | 'endFocus' | 'gotIt') => void; fit?: FitActs; starting?: StartActs; selected?: SelectedActs; popOut: () => void; glance?: (id: string, loudness: GlanceLoud) => void; find?: (where: 'settings' | 'help', text: string, now?: boolean) => void; copy?: (text: string) => void; oldName?: (place: string) => void; agentSteps?: (key: string, agentId: string | undefined, mine: boolean) => void }

// The one line the pane, or one card, draws when its load or draw throws (a broken store value)
export const DRAW_FAILED = 'Vaken could not draw this. Type /vaken-help.'
