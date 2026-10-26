// Attention: heartbeat, notification router, recap on return, and the phone glance. Pure rules and words.
import { langNow, t as tHere, tLine } from '../i18n/t'
import { fmt } from './fmt'
import { fillIn, same } from './fillin'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { tEn } from '../i18n/t'

export const ATTENTION_SETTINGS: Setting[] = [
  {
    key: 'notify.mode',
    group: 'Attention',
    label: 'Notices',
    note: 'Needs you: another session waits. And done: when it finishes. This session too: also this one.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'needs', label: 'Needs you' },
      { value: 'all', label: 'Needs you and done' },
      { value: 'self', label: 'This session too' },
    ],
    default: 'self',
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
  { title: 'Why does it say a session went quiet?', text: 'A working session sends small signs of life; if none comes for a few minutes, the line above the chat box says it has gone quiet. A long command can be quiet too, so look before you stop it. When one command has run for 10 minutes, the line says so instead, with Stop the answer, which ends Claude\'s whole answer and not only that command, and Keep waiting.' },
  { title: 'What the notices do', text: 'When another session waits for you, a toast tells you once; with Needs you and done, also when it finishes a long job. Hours without notices hold those toasts back at night; they come when the hours end.' },
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

// Runaway step: one shell step of the main loop that has run RUNAWAY_MS gets one calm band line, with Stop the answer
// (the engine's turn.abort: it ends the running answer and its step) and Keep waiting (quiet for that step). Kept in memory: a short hash of the
// step and its times, never the command. A step that waited for the person's Allow is not timed: a plugin cannot see when the answer came.
export const RUNAWAY_MS = 10 * 60_000
export const RUNAWAY_BAND_ID = 'runaway'
export const RUNAWAY_LINE = 'A step has run {n} min'
export const RUNAWAY_LINE_ESC = 'A step has run {n} min. Esc in the chat stops it.'
// The press ends the whole running answer (turn.abort cannot end one step alone), so its label says the answer
export const RUNAWAY_STOP = 'Stop the answer'
export const RUNAWAY_WAIT = 'Keep waiting'
export const RUNAWAY_STOPPED = 'Stopped the step. Claude stopped its answer too; type to go on.'
export const RUNAWAY_NO_STOP = 'Could not stop it from here. Press Esc in the chat.'
export const RUNAWAY_WAITING = 'Vaken says nothing more about this step.'
type Step = { hash: string; startedAt: number; asked: boolean }
// `turnId`: the main loop's running answer, from turn.start; `silenced`: the step Keep waiting was pressed for
export const runawayMem: { steps: Map<string, Step>; turnId?: string; silenced?: string } = { steps: new Map() }
const STEPS_MAX = 20

export function stepStart(id: string, hash: string, now: number): void {
  runawayMem.steps.delete(id)
  // The notice came before the call: this step is the one that waits for the person
  const step: Step = { hash, startedAt: now, asked: askEarly.at !== undefined && now >= askEarly.at && now - askEarly.at < ASK_EARLY_MS }
  askEarly.at = undefined
  runawayMem.steps.set(id, step)
  while (runawayMem.steps.size > STEPS_MAX) {
    const first = runawayMem.steps.keys().next().value
    if (first === undefined) break
    runawayMem.steps.delete(first)
  }
}
// Claude Code told the person it needs a permission (its Notification): the newest step still running waits for the person, so it is not timed.
// The notice names no call id, so the newest open step is the one asked about; with no step open yet, the next step to start is.
// A notice with no step is kept this long only: a refused step never starts, and must not leave the next step untimed
const ASK_EARLY_MS = 30_000
const askEarly: { at?: number } = {}
export function stepAsked(now: number): void {
  let newest: Step | undefined
  for (const s of runawayMem.steps.values()) newest = s
  if (newest !== undefined) newest.asked = true
  else askEarly.at = now
}
export const stepEnd = (id: string): void => {
  runawayMem.steps.delete(id)
}
// A turn's start and end: no step of an older answer still runs
export function stepsReset(turnId?: string): void {
  runawayMem.steps.clear()
  askEarly.at = undefined
  runawayMem.turnId = turnId
  runawayMem.silenced = undefined
}
const keyOf = (s: Step): string => `${s.hash}:${s.startedAt}`

// The oldest timed step past RUNAWAY_MS that Keep waiting has not silenced, in whole minutes
export function runawayNow(now: number): { key: string; minutes: number } | undefined {
  let oldest: Step | undefined
  for (const s of runawayMem.steps.values()) if (!s.asked && now - s.startedAt >= RUNAWAY_MS && keyOf(s) !== runawayMem.silenced && (oldest === undefined || s.startedAt < oldest.startedAt)) oldest = s
  return oldest === undefined ? undefined : { key: keyOf(oldest), minutes: Math.floor((now - oldest.startedAt) / 60_000) }
}
// Keep waiting: this step stays quiet until it ends
export function silenceRunaway(now: number): void {
  runawayMem.silenced = runawayNow(now)?.key
}
// The line, in English (the band says it in the person's language); without a known answer to stop, it says how to stop it by hand
export const runawayLine = (minutes: number, canStop: boolean): string => (canStop ? RUNAWAY_LINE : RUNAWAY_LINE_ESC).replace('{n}', String(minutes))

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
  const updated: Record<string, Seen> = {}
  const out: Notice[] = []
  for (const r of rows) {
    updated[r.id] = { kind: r.kind, since: r.since }
    if (mode === 'off') continue
    if (r.kind === 'needs') {
      const marker = `needs:${r.since}`
      if (told[r.id] !== marker) out.push({ id: r.id, marker, text: r.reason === '' ? tLine('needs.name_needs_you', { name: r.name }) : tLine('needs.name_needs_you_reason', { name: r.name, reason: r.reason }) })
    } else if ((mode === 'all' || mode === 'self') && r.kind === 'waiting') {
      const was = prev[r.id]
      const marker = `done:${r.since}`
      if (was !== undefined && was.kind === 'working' && now - was.since >= LONG_JOB_MS && told[r.id] !== marker) out.push({ id: r.id, marker, text: tLine('needs.name_finished', { name: r.name }) })
    }
  }
  return { notices: out, next: updated }
}

// Quiet hours hold notices back instead of using them up: nothing is marked told, and a finished job keeps its working sighting so it is told when the hours end.
// A session that needs you is urgent, so the hourly toast gate never eats it.
export function noticePlan(prev: Record<string, Seen>, r: { notices: Notice[]; next: Record<string, Seen> }, quiet: boolean): { next: Record<string, Seen>; tell: Notice[]; urgent: boolean } {
  if (!quiet) return { next: r.next, tell: r.notices, urgent: r.notices.some(n => n.marker.startsWith('needs:')) }
  const updated = { ...r.next }
  for (const n of r.notices) {
    const was = prev[n.id]
    if (n.marker.startsWith('done:') && was !== undefined) updated[n.id] = was
  }
  return { next: updated, tell: [], urgent: false }
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
// `needs`: how many sessions need you, when it was counted; left out, the recap says nothing about it.
// No context figure: This session and the status line own it (one fact, one place).
type RecapFacts = { gapMs: number; branch?: string; cache?: string; goal?: string; unreviewed?: number; needs?: number }

// Coarse, through fmt in the language of this draw: "45 min", "2 h", never "1.6 h"
export const minWord = (ms: number): string => fmt.span(ms, langNow())
export function recapWords(f: RecapFacts, t: (s: string) => string = s => s): string {
  const fi = (s: string, v: Record<string, string | number>): string => fillIn(t(s), v)
  if (f.gapMs < RECAP_THIN_MS) {
    if (f.needs === undefined) return t('You were away under 5 min.')
    return f.needs === 0 ? t('You were away under 5 min. Nothing needs you.') : `${t('You were away under 5 min.')} ${fi('Needs you: {n}.', { n: f.needs })}`
  }
  const parts = [fi('Back after {t}.', { t: minWord(f.gapMs) })]
  if (f.goal !== undefined && f.goal !== '') parts.push(fi('Goal: {goal}', { goal: f.goal }))
  if (f.branch !== undefined && f.branch !== '') parts.push(fi('Branch {branch}.', { branch: f.branch }))
  if (f.cache !== undefined) parts.push(`${f.cache}.`)
  if (f.needs !== undefined && f.needs > 0) parts.push(fi('Needs you: {n}.', { n: f.needs }))
  if (f.unreviewed !== undefined && f.unreviewed > 0) parts.push(fi(f.unreviewed === 1 ? '1 change waits for your look.' : '{n} changes wait for your look.', { n: f.unreviewed }))
  return parts.join(' ')
}

type GlanceFacts = { needs: { name: string; reason: string }[]; needsTotal?: number; limitPercent?: number; limitLabel?: string; limitReset?: string; limitAgo?: string; hereState: string; didCount: number }
export function glanceLines(f: GlanceFacts, t: (s: string) => string = same): string[] {
  const said = t !== same
  const count = (key: string, n: number): string => (said ? tHere(key, { n }) : tEn(key, { n }))
  const total = Math.max(f.needsTotal ?? 0, f.needs.length)
  // Every session is named, the first three with why; what is not a session (stopped steps) is counted.
  const named = [...f.needs.slice(0, 3).map(n => `${n.name} (${n.reason === '' ? t('waiting') : t(n.reason)})`), ...f.needs.slice(3).map(n => n.name)]
  const more = total - f.needs.length
  const list = [...named, ...(more > 0 ? [count('glance.n_more_in_needs_you', more)] : [])]
  const first = total === 0 ? t('Nothing needs you.') : `${count('words.needs_you', total)}${named.length === 0 ? '' : `: ${list.join(', ')}`}.`
  const tail = `${f.limitReset === undefined || f.limitReset === '' ? '' : `, ${f.limitReset}`}${f.limitAgo === undefined || f.limitAgo === '' ? '' : `, ${fillIn(t('read {age}'), { age: f.limitAgo })}`}`
  const second = f.limitPercent === undefined ? t('Plan limit not reported yet.') : `${f.limitLabel ?? t('Plan')}: ${fmt.percent(f.limitPercent, said ? langNow() : 'en')} ${t('used')}${tail}.`
  const did = f.didCount <= 0 ? t('Autopilot did nothing today.') : fillIn(t('Autopilot did {things} today.'), { things: count('words.thing', f.didCount) })
  const third = `${fillIn(t('This session: {state}.'), { state: f.hereState.replace(/\.$/, '') })} ${did}`
  return [first, second, third]
}
