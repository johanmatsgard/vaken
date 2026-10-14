// What reaches Claude: only safety-critical notes by default; every other check speaks to the person only.
import type { Io } from './io'
import { readSetting } from './settings'

export const TELL_KEY = 'claude.notes'

export const SAFETY_NOTES: readonly string[] = ['guard.destructive', 'guard.scope', 'guard.packages', 'guard.tests', 'guard.world', 'guard.secrets', 'guard.migrations', 'guard.fence', 'loop.breaker']
// A test checks that none of these is in SAFETY_NOTES.
export const GATED_NOTES: readonly string[] = ['compact.mode', 'proof.claims', 'proof.drift', 'proof.anomaly', 'crew.collide', 'crew.ports', 'rules.mode', 'guard.env', 'cost.budget', 'cap.mode']

export const tellsClaude = async (i: Io): Promise<boolean> => (await readSetting(i, TELL_KEY)) === 'all'

export const COMPACT_NOTE_MODES: readonly string[] = ['suggest', 'auto']
export const tellsCompact = async (i: Io): Promise<boolean> => COMPACT_NOTE_MODES.includes(await readSetting(i, 'compact.mode'))
