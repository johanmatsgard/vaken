// The views (the card formula).
import type { CardId } from './logic'

export type ViewMode = 'standard' | 'all' | 'custom'
export const VIEW_MODES: readonly ViewMode[] = ['standard', 'all', 'custom']

export const STANDARD_IDS: readonly CardId[] = ['here', 'context', 'agents', 'computer', 'limit', 'others']
export const ALL_IDS: readonly CardId[] = [...STANDARD_IDS, 'ship', 'prs', 'back', 'preview', 'setup', 'skills', 'do', 'guard', 'safety', 'autopilot', 'proof']

// The Needs you slot in the placement list: always first, never moved.
export const NEEDS_SLOT = 'needs'
export type Slot = CardId | typeof NEEDS_SLOT

export const viewModeOf = (values: Record<string, string>): ViewMode => {
  const v = values['look.view']
  return v === 'all' || v === 'custom' ? v : 'standard'
}

export const fixedIds = (mode: ViewMode): readonly CardId[] | undefined => (mode === 'standard' ? STANDARD_IDS : mode === 'all' ? ALL_IDS : undefined)

// Hidden never.
export const needsShown = (values: Record<string, string>, waiting: number): boolean => {
  const v = values['look.needs']
  return v === 'hidden' ? false : v === 'waits' ? waiting > 0 : true
}
