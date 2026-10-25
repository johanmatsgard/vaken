// Tell me: one Mac notification while you are away, and the status line under the prompt box. Pure rules and words.
import { t, tr as trEn } from '../i18n/t'
import { fmt } from './fmt'
import { resolveProgram } from './procs'
import { CONTEXT_FACT_PERCENT } from './sessionfacts'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'

export const HOW_LABEL = 'How notices reach you'
export const HOW_NOTE = 'While you are away: a banner, a banner and sound, or a spoken line.'
export const STATUS_LABEL = 'Status line'
export const STATUS_NOTE = 'A line under the prompt box, only when context or plan is nearly used up.'
export const TELL_SETTINGS: Setting[] = [
  {
    key: 'notify.how',
    group: 'Attention',
    label: HOW_LABEL,
    note: HOW_NOTE,
    options: [
      { value: 'banner', label: 'Banner' },
      { value: 'sound', label: 'Banner and sound' },
      { value: 'speak', label: 'Speak' },
    ],
    default: 'banner',
  },
  {
    key: 'status.line',
    group: 'Attention',
    label: STATUS_LABEL,
    note: STATUS_NOTE,
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]
export const TELL_HELP_TITLE = 'Notices while you are away'
export const TELL_HELP_TEXT = 'After 2 minutes with no press or prompt, vaken sends one Mac notification when another session needs you or a plan limit is near; with This session too, also when a step here waits for your yes or a long answer is done. At most one comes every 30 seconds and several become one, while Hours without notices and Quiet hold them. /vaken-settings notify.how sound adds a sound, speak says it.'
export const TELL_HELP: HelpEntry[] = [{ title: TELL_HELP_TITLE, text: TELL_HELP_TEXT }]

export const PERSON_KEY = 'cockpit:person:at'
export const PERSON_SAVE_MS = 30_000
export const AWAY_MS = 2 * 60_000
export const TELL_GAP_MS = 30_000
export const LONG_ANSWER_MS = 60_000
export const TELL_CHARS = 120
export const TELL_TITLE = 'vaken'
export const TELL_SOUND = 'Glass' // en-only: the name of a Mac system sound
export const TELL_RUN_MS = 5_000

export type TellKind = 'needs' | 'ask' | 'limit' | 'done'
// `text`: a limit's own fact in the language of this draw ("Week 92% used."), so the notice names what is near
export type TellItem = { kind: TellKind; n?: number; text?: string }

// Set by the Tell me feature when it runs; other parts only call tellNow.
export const tellBus: { push?: (item: TellItem) => void } = {}
export const tellNow = (item: TellItem): void => {
  try {
    tellBus.push?.(item)
  } catch {
  }
}

export const latestAt = (mem: number | undefined, stored: unknown): number | undefined => {
  const s = typeof stored === 'number' && Number.isFinite(stored) ? stored : undefined
  return mem === undefined ? s : s === undefined ? mem : Math.max(mem, s)
}
// No press or prompt in AWAY_MS, in any session, reads as away from the app.
export const isAwayAt = (lastAt: number | undefined, now: number): boolean => lastAt === undefined || now - lastAt >= AWAY_MS

export type TellFacts = { mode: string; quiet: boolean; focused: boolean; away: boolean }
// This session's own done and asks need "This session too"; Focus lets through only what needs you.
export function mayTell(kind: TellKind, f: TellFacts): boolean {
  if (!f.away || f.quiet || f.mode === 'off') return false
  if ((kind === 'done' || kind === 'ask') && f.mode !== 'self') return false
  if (f.focused && kind !== 'needs' && kind !== 'ask') return false
  return true
}

export type TellGate = { lastAt?: number; held: TellItem[] }
const ORDER: TellKind[] = ['needs', 'ask', 'limit', 'done']
export function mergeItems(held: readonly TellItem[], item: TellItem | undefined): TellItem[] {
  const all = item === undefined ? [...held] : [...held, item]
  const out: TellItem[] = []
  for (const kind of ORDER) {
    const same = all.filter(x => x.kind === kind)
    if (same.length === 0) continue
    const text = same.map(x => x.text).filter((x): x is string => x !== undefined && x !== '').pop()
    out.push(kind === 'needs' ? { kind, n: same.reduce((s, x) => s + Math.max(1, x.n ?? 1), 0) } : text === undefined ? { kind } : { kind, text })
  }
  return out
}
// At most one notification in TELL_GAP_MS: what comes sooner waits and goes out with the next one.
export function tellStep(gate: TellGate, item: TellItem | undefined, now: number): { gate: TellGate; send?: TellItem[]; waitMs?: number } {
  const held = mergeItems(gate.held, item)
  if (held.length === 0) return { gate: { ...gate, held } }
  const since = gate.lastAt === undefined ? Infinity : now - gate.lastAt
  if (since >= TELL_GAP_MS || since < 0) return { gate: { lastAt: now, held: [] }, send: held }
  return { gate: { ...gate, held }, waitMs: TELL_GAP_MS - since }
}

export const clip = (text: string, max: number = TELL_CHARS): string => {
  const flat = text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`
}
const sentence = (text: string): string => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`)
export function tellText(items: readonly TellItem[], tr: (name: string, vars?: Record<string, number>) => string = t): string {
  const words = mergeItems(items, undefined).map(x =>
    x.kind === 'needs' ? tr('tell.sessions_need_you', { n: x.n ?? 1 }) : x.kind === 'ask' ? tr('tell.step_waits') : x.kind === 'limit' ? (x.text === undefined ? tr('tell.limit_near') : sentence(x.text)) : x.text === undefined ? tr('tell.answer_done') : sentence(x.text),
  )
  return clip(words.join(' '))
}

// AppleScript string: a backslash and a quote are escaped, nothing else can end the string.
export const asString = (text: string): string => `"${clip(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
export const notifyArgv = (text: string, sound: boolean): string[] => ['osascript', '-e', `display notification ${asString(text)} with title ${asString(TELL_TITLE)}${sound ? ` sound name ${asString(TELL_SOUND)}` : ''}`]
export const isMacHome = (home: string): boolean => home.startsWith('/Users/')

// Windows: one fixed PowerShell call plays the system notice sound and waits for it to end; with no such file, the plain system sound. No text from anyone goes in.
export const WIN_SOUND_SCRIPT =
  // en-only: a PowerShell program, not a text
  "$ErrorActionPreference='Stop';try{(New-Object System.Media.SoundPlayer (Join-Path $env:WINDIR 'Media\\Windows Notify System Generic.wav')).PlaySync()}catch{[System.Media.SystemSounds]::Asterisk.Play();Start-Sleep -Milliseconds 800}"
export const winSoundArgv = (): string[] => [resolveProgram('powershell', 'win32'), '-NoProfile', '-NonInteractive', '-Command', WIN_SOUND_SCRIPT]

export type HowWay = 'notify' | 'mac' | 'speak' | 'winsound'
// Banner tries the engine's notification first; a sound needs the Mac's own. On Windows a sound is the banner plus 'winsound', which plays beside it either way.
export const waysOf = (how: string, mac: boolean, win = false): HowWay[] =>
  how === 'speak' ? ['speak'] : how === 'sound' ? (mac ? ['mac'] : win ? ['notify', 'winsound'] : ['notify']) : mac ? ['notify', 'mac'] : ['notify']

// The line shows only a hot fact: context from CONTEXT_FACT_PERCENT used ("Context 93% used", as the card says it), plan from STATUS_PLAN_USED_PCT used. Calm shows nothing.
// The plan is said as used, like the band and the Plan limits card, with the lead window's short name ("Plan 5 h 88% used").
// While the band draws its plan chip the plan is already on screen, so the line leaves the plan out (`bandChip`).
export const STATUS_PLAN_USED_PCT = 80
export type StatusFacts = { context?: number | undefined; planUsed?: number | undefined; planName?: string | undefined; bandChip?: boolean }
// The lead window's short name as the band says it: "5 h", "Week", "Week · Fable"; another limit by its own short name
export function planShortName(b: { kind: string; short: string; label: string }): string {
  if (b.kind === 'session' || b.short === '5-hour limit') return t('band.five_h')
  const model = /^Weekly limit · (.+)$/.exec(b.label)?.[1]
  if (b.kind === 'week' || model === 'all models') return t('pane.week')
  return model === undefined ? trEn(b.short) : `${t('pane.week')} · ${model}`
}
export function statusText(f: StatusFacts, tr: (name: string, vars?: Record<string, string | number>) => string = t): string | undefined {
  const parts: string[] = []
  if (f.context !== undefined && Number.isFinite(f.context) && f.context >= CONTEXT_FACT_PERCENT) parts.push(tr('pane.context_n_used', { n: f.context >= 100 ? 100 : Math.min(99, Math.round(f.context)) }))
  if (f.bandChip !== true && f.planUsed !== undefined && Number.isFinite(f.planUsed) && f.planUsed >= STATUS_PLAN_USED_PCT) {
    const pct = fmt.usedIn(f.planUsed)
    parts.push(f.planName === undefined || f.planName === '' ? tr('tell.plan_pct_used', { pct }) : tr('tell.plan_name_pct_used', { name: f.planName, pct }))
  }
  return parts.length === 0 ? undefined : parts.join(' · ')
}
// What the band last worked out, so turn.complete can set the line with no read.
export const statusMem: { on: boolean; facts: StatusFacts; shown?: string } = { on: true, facts: {} }
// The text to set now: undefined clears it, null leaves the line as it is.
export function statusNext(on: boolean, text: string | undefined, shown: string | undefined): string | undefined | null {
  const want = on ? text : undefined
  return want === shown ? null : want
}
