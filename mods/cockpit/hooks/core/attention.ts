// Attention: heartbeat, notification router, recap on return, and the phone glance. Pure rules and words.
import { tLine } from '../i18n/t'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { tEn } from '../i18n/t'

export const ATTENTION_SETTINGS: Setting[] = [
  {
    key: 'notify.mode',
    group: 'Attention',
    label: 'Notices',
    note: 'Needs you: when another session waits for you. Needs you and done: also when it finishes.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'needs', label: 'Needs you' },
      { value: 'all', label: 'Needs you and done' },
    ],
    default: 'needs',
  },
  {
    key: 'notify.quiet',
    group: 'Attention',
    label: 'Hours without notices',
    note: 'No pop-up alerts about other sessions then, except ones you set to Tell me when done.',
    options: [
      { value: 'off', label: 'Off' },
      { value: '22-07', label: '22:00 to 07:00' },
      { value: '20-08', label: '20:00 to 08:00' },
    ],
    default: 'off',
  },
  {
    key: 'heartbeat.mode',
    group: 'Attention',
    label: 'Idle alert',
    note: 'Says when a working session has gone quiet.',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
  {
    key: 'recap.mode',
    group: 'Attention',
    label: 'Recap',
    note: 'A short recap when you come back after a break.',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
]

export const ATTENTION_HELP: HelpEntry[] = [
  { title: 'Why does it say a session went quiet?', text: 'A working session sends small signs of life. If none comes for a few minutes, the line above the chat box says it has gone quiet. A long command can be quiet too, so look before you stop it.' },
  { title: 'What the notices do', text: 'When another session waits for you, a toast tells you once; with Needs you and done, also when it finishes a long job. Hours without notices turn those toasts off at night.' },
]

// Longer limits than 3 and 8 minutes: those fired on long answers and commands.
export const QUIET_MS = 10 * 60_000
export const STUCK_MS = 20 * 60_000
type Beat = 'ok' | 'quiet' | 'stuck'

export function heartbeat(state: string, silentMs: number): Beat {
  if (state !== 'working') return 'ok'
  return silentMs >= STUCK_MS ? 'stuck' : silentMs >= QUIET_MS ? 'quiet' : 'ok'
}
export const beatWord = (b: Beat, silentMs: number): string => {
  const min = Math.floor(silentMs / 60_000)
  return b === 'stuck' ? `No sign of life for ${min} min. It may be stuck.` : b === 'quiet' ? `Idle for ${min} min. It may be thinking or running a long command.` : 'Alive.'
}

export const LONG_JOB_MS = 2 * 60_000
export type Seen = { kind: string; since: number }
export type NoticeRow = { id: string; name: string; kind: string; reason: string; since: number }
type Notice = { id: string; text: string; marker: string }

export function isQuiet(setting: string, hour: number): boolean {
  const m = /^(\d\d)-(\d\d)$/.exec(setting)
  if (m === null) return false
  const from = Number(m[1])
  const to = Number(m[2])
  return from > to ? hour >= from || hour < to : hour >= from && hour < to
}

// A row is told once per episode: `marker` names the episode, `told` holds the markers already told.
export function notices(prev: Record<string, Seen>, rows: NoticeRow[], told: Record<string, string>, mode: string, now: number): { notices: Notice[]; next: Record<string, Seen> } {
  const next: Record<string, Seen> = {}
  const out: Notice[] = []
  for (const r of rows) {
    next[r.id] = { kind: r.kind, since: r.since }
    if (mode === 'off') continue
    if (r.kind === 'needs') {
      const marker = `needs:${r.since}`
      if (told[r.id] !== marker) out.push({ id: r.id, marker, text: r.reason === '' ? tLine('needs.name_needs_you', { name: r.name }) : tLine('needs.name_needs_you_reason', { name: r.name, reason: r.reason }) })
    } else if (mode === 'all' && r.kind === 'waiting') {
      const was = prev[r.id]
      const marker = `done:${r.since}`
      if (was !== undefined && was.kind === 'working' && now - was.since >= LONG_JOB_MS && told[r.id] !== marker) out.push({ id: r.id, marker, text: tLine('needs.name_finished', { name: r.name }) })
    }
  }
  return { notices: out, next }
}

// The fill-in is {sessions}, not {names}, so a session name stays as typed.
const namesOf = (list: Notice[]): string => list.map(n => n.text.split('"')[1]).join(', ')
export const batchText = (list: Notice[]): string => {
  if (list.length === 1) return list[0].text
  const asks = list.filter(n => n.marker.startsWith('needs'))
  const done = list.filter(n => !n.marker.startsWith('needs'))
  return [asks.length === 0 ? '' : tLine('toast.waiting_for_you_names', { sessions: namesOf(asks) }), done.length === 0 ? '' : tLine('toast.finished_names', { sessions: namesOf(done) })].filter(x => x !== '').join(' ')
}

export const RECAP_AFTER_MS = 15 * 60_000
const RECAP_THIN_MS = 5 * 60_000
type RecapFacts = { gapMs: number; branch?: string; contextPercent?: number; cache?: string; goal?: string; unreviewed?: number }

export const minWord = (ms: number): string => {
  const min = Math.round(ms / 60_000)
  return min < 60 ? `${min} min` : `${Math.round(min / 6) / 10} h`
}
export function recapWords(f: RecapFacts, t: (s: string) => string = s => s): string {
  const fi = (s: string, v: Record<string, string | number>): string => t(s).replace(/\{(\w+)\}/g, (m, k: string) => (v[k] === undefined ? m : String(v[k])))
  if (f.gapMs < RECAP_THIN_MS) return t('You were away under 5 min. Nothing needs you.')
  const parts = [fi('Back after {t}.', { t: minWord(f.gapMs) })]
  if (f.goal !== undefined && f.goal !== '') parts.push(fi('Goal: {goal}', { goal: f.goal }))
  if (f.branch !== undefined && f.branch !== '') parts.push(fi('Branch {branch}.', { branch: f.branch }))
  if (f.contextPercent !== undefined) parts.push(fi('Context {n}% full.', { n: Math.round(f.contextPercent) }))
  if (f.cache !== undefined) parts.push(`${f.cache}.`)
  if (f.unreviewed !== undefined && f.unreviewed > 0) parts.push(fi(f.unreviewed === 1 ? '1 change waits for your look.' : '{n} changes wait for your look.', { n: f.unreviewed }))
  return parts.join(' ')
}

type GlanceFacts = { needs: { name: string; reason: string }[]; needsTotal?: number; limitPercent?: number; limitLabel?: string; limitReset?: string; limitAgo?: string; hereState: string; didCount: number }
export function glanceLines(f: GlanceFacts): string[] {
  const total = Math.max(f.needsTotal ?? 0, f.needs.length)
  const named = f.needs.slice(0, 3).map(n => `${n.name} (${n.reason === '' ? 'waiting' : n.reason})`)
  const more = total - named.length
  const first = total === 0 ? 'Nothing needs you.' : `${tEn('words.needs_you', { n: total })}${named.length === 0 ? '.' : `: ${named.join(', ')}${more > 0 ? `, +${more} more` : ''}.`}`
  const tail = `${f.limitReset === undefined || f.limitReset === '' ? '' : `, ${f.limitReset}`}${f.limitAgo === undefined || f.limitAgo === '' ? '' : `, read ${f.limitAgo}`}`
  const second = f.limitPercent === undefined ? 'Plan limit not reported yet.' : `${f.limitLabel ?? 'Plan'}: ${Math.round(f.limitPercent)}% used${tail}.`
  const third = `This session: ${f.hereState.replace(/\.$/, '')}. ${f.didCount <= 0 ? 'Autopilot did nothing today.' : `Autopilot did ${tEn('words.thing', { n: f.didCount })} today.`}`
  return [first, second, third]
}
