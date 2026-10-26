// The Guard follows the person's own setup: where Claude Code asks first, the two worst kinds only warn; where it would not ask, they stop by default. A chosen setting is never overridden, and an unreadable answer stays Warn.
import type { Mode } from './guard'
import type { Io } from './io'
import { SETTING_PREFIX, USE_DEFAULT } from './io'

export type HostView = 'asks' | 'unasked' | 'unknown'

export function viewFrom(decision: unknown, defaultMode: unknown): HostView {
  if (decision === 'allow') return 'unasked'
  if (decision === 'deny') return 'asks'
  if (decision !== 'ask') return 'unknown'
  if (defaultMode === 'auto') return 'unasked'
  return typeof defaultMode === 'string' || defaultMode === undefined ? 'asks' : 'unknown'
}

export async function hostView(check: () => Promise<unknown>, settings: () => Promise<unknown>): Promise<HostView> {
  try {
    const decision = ((await check()) as { decision?: unknown } | undefined)?.decision
    if (decision !== 'ask') return viewFrom(decision, undefined)
    const s = (await settings()) as { permissions?: { defaultMode?: unknown } } | undefined
    if (typeof s !== 'object' || s === null) return 'unknown'
    return viewFrom(decision, s.permissions?.defaultMode)
  } catch {
    return 'unknown'
  }
}

// A project's "use the default" mark is not a choice.
export const isExplicit = async (i: Io, settingKey: string): Promise<boolean> => {
  const v = await i.get(`${SETTING_PREFIX}${settingKey}`)
  return v !== undefined && v !== USE_DEFAULT
}

export async function strongMode(i: Io, settingKey: string, mode: Mode, view: () => Promise<HostView>): Promise<Mode> {
  if (mode !== 'warn' || (await isExplicit(i, settingKey))) return mode
  return (await view()) === 'unasked' ? 'hold' : mode
}

// The two rows whose unchosen Warn stops where Claude Code would not ask (strongMode). Their Warn says so while it is the default, and "Warn only" once the person chose it.
export const STRONG_KEYS: readonly string[] = ['guard.destructive', 'guard.secrets']
export const WARN_UNCHOSEN = 'Warn (stops in auto mode)'
export const WARN_CHOSEN = 'Warn only'

// The card may not call `$.tool.check` on a draw, so the view is noted when a real tool step asks it and kept in the pane's prefs bundle.
export const HOST_NOTE_KEY = 'cockpit:pref:hostview'
export type HostNote = { sid: string; view: HostView }
let lastNote: string | undefined
export async function noteHostView(i: Io, view: HostView): Promise<void> {
  try {
    const sid = await i.sessionId()
    const nextKey = `${sid}|${view}`
    if (lastNote === nextKey) return
    lastNote = nextKey
    const kept = parseHostNote(await i.get(HOST_NOTE_KEY))
    if (kept?.sid === sid && kept.view === view) return
    await i.set(HOST_NOTE_KEY, { sid, view })
  } catch {
    // a missed note only leaves the card on its careful wording
  }
}
export function parseHostNote(raw: unknown): HostNote | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const o = raw as { sid?: unknown; view?: unknown }
  return typeof o.sid === 'string' && (o.view === 'asks' || o.view === 'unasked' || o.view === 'unknown') ? { sid: o.sid, view: o.view } : undefined
}
export function warnReading(view: HostView | undefined, chosen: boolean): 'warn' | 'worst' | 'maybe' {
  if (chosen || view === 'asks') return 'warn'
  return view === 'unasked' ? 'worst' : 'maybe'
}

export const DEFAULT_HOLD_WHY = 'Claude Code would not have asked the person first here, so the Guard stopped it.'

export const HOST_RULE_WORDS = 'Destroying data and exposing secrets stop by default when Claude Code would not ask first (auto mode, bypass permissions or an allow rule). Where it asks, they only warn. If vaken cannot tell, they warn. A choice you make here always wins.'
