// Opens this session in a pop-out window through the app's `ccd_window` `open_session_in` tool, without taking keyboard focus. From the tool's types and description.
import type { HelpEntry } from './registry'

export const POPOUT_SERVER = 'ccd_window'
export const POPOUT_TOOL = 'open_session_in'
export const POPOUT_ARGS = { session_id: 'self', target: 'window' } as const

// Memory only. After a failed call a press says the way by hand at once; the failure is forgotten after POPOUT_RETRY_MS so an app update is tried again.
export const popMem: { failed: boolean; busy: boolean; failedAt?: number } = { failed: false, busy: false }
export const POPOUT_RETRY_MS = 10 * 60_000

export const POPOUT_BUTTON = 'Open in new window'
export const POPOUT_BUTTON_SHORT = 'New window'
export const POPOUT_SAID = 'Opened this session in a new window. Drag it to your other screen.'
export const POPOUT_FAILED = 'Could not open a new window from here. In the Mac or PC app, right-click the session in the sidebar, then Open in → New window. A phone or a terminal cannot do this.'

const POPOUT_TEXT = 'Press Open in new window at the bottom of the vaken pane, or type /vaken-help run popout, and this session opens in a new window. Drag that window to your other screen. If it does not work, right-click the session in the sidebar, then Open in → New window.'

export const POPOUT_HELP: HelpEntry[] = [{ title: 'Vaken on a second screen', text: POPOUT_TEXT }]

export const POPOUT_VIEW_STRINGS: string[] = [POPOUT_BUTTON, POPOUT_BUTTON_SHORT, POPOUT_SAID, POPOUT_FAILED]

