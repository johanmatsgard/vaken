// Open at start: the pane opens beside the chat in every new session, without the keyboard, so typing goes to the chat. Pure.

export const OPEN_START_SETTING = 'look.open'
export const OPEN_START_LABEL = 'Open at start'
export const OPEN_START_NOTE = 'When on, vaken opens beside the chat in every new session.'
// The last try, read back by a live check: was the pane drawn, and if not, why.
export const OPEN_START_SEEN = 'cockpit:openstart:last'

// Only a session a person watches, only when on, never a second time.
export const wantsOpenAtStart = (value: string, isInteractive: boolean, isShown: boolean): boolean => value === 'on' && isInteractive && !isShown

export type OpenSeen = { at: number; placed: boolean; reason?: string }
export const openSeenOf = (at: number, r: { isPlaced: boolean; reason?: unknown }): OpenSeen =>
  r.isPlaced ? { at, placed: true } : { at, placed: false, reason: String(r.reason ?? 'unknown') }
