// "What is this?": one shared answer for every line vaken shows, with a text twin.
import { ACTED_MARK } from './counts'
import { SETTINGS, findSetting, settingPath } from './settings'
import { focusOfSetting } from './settingsmap'
import type { Values } from './settings'
import { agoWord, explainFor, titleFor } from './explain'
import { shownTitle } from './ledger'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'
import { sysWord } from './syswords'
import { STATUS_BAND_ID, STATUS_MEANS, STATUS_PAGE, STATUS_PAGE_LABEL, STATUS_WHY, statusMem } from './claudestatus'

// `lead`: the words before `means` when they are not "What it means:" (a run's output leads with "Result:")
// `link`: a web page the opened line links to (the Claude status page), drawn by the host's own Link; the text twin says its address
export type WhatIs = { means: string; lead?: string; facts?: string[]; why?: string; from?: string; next?: string; last?: string[]; setting?: string; link?: { label: string; href: string } }

export type Topic = 'needs' | 'limits' | 'session' | 'others' | 'working' | 'yourturn' | 'quiet' | 'autopilot' | 'proof' | 'guard' | 'agents' | 'tasks' | 'band' | 'computer'
export const SESSIONS_SETTING = 'sessions'

export const TOPICS: Record<Topic, { title: string; means: string; setting?: string }> = {
  needs: { title: 'Needs you', means: 'A session waits for you. Claude asked a question, or a step waits for your OK.', setting: 'notify.mode' },
  limits: { title: 'Plan limits', means: 'How much of your plan you used in each time window, and when it starts again. The figures come from the app.', setting: 'resume.mode' },
  session: { title: 'This session', means: 'This session: what Claude does now, what it cost so far, and how full its memory of the session (the context) is.', setting: 'compact.mode' },
  others: { title: 'Other sessions', means: 'Your other open sessions and what each one does now. You can pin or hide a session. Working means Claude did something in the last 2 minutes.', setting: SESSIONS_SETTING },
  working: { title: 'Working', means: 'Claude did something in the session in the last 2 minutes.', setting: SESSIONS_SETTING },
  yourturn: { title: 'Your turn', means: 'Claude finished. The session waits for your next message.', setting: SESSIONS_SETTING },
  quiet: { title: 'Idle', means: 'Nothing happened in the session for 2 minutes or more.', setting: SESSIONS_SETTING },
  autopilot: { title: 'Autopilot', means: 'What vaken did for you today, such as compacting a long session.', setting: 'compact.mode' },
  proof: { title: 'Checks', means: 'Whether the tests, the build and the other checks really ran and passed after the last change.', setting: 'proof.claims' },
  guard: { title: 'Risky steps', means: 'Risky steps today: what vaken warned you about or stopped, and how strict each rule is.', setting: 'guard.destructive' },
  agents: { title: 'Agents', means: 'The agents Claude started, and whether they still run.', setting: 'agents.board' },
  tasks: { title: 'Tasks', means: 'Your task list. Vaken starts an agent for each task, as many at a time as this computer has room for, each in its own folder copy when it writes code, checks each task when it ends, and stops an agent that runs too long or costs too much. /vaken-tasks shows it and steers it.', setting: 'cap.mode' },
  computer: { title: 'Computer', means: 'How many more agents this computer can run now: the smallest of free memory, idle processor and the limit you set, if any. Full when memory is tight, heat slows it, or the battery is low.', setting: 'laptop.mode' },
  band: { title: 'Line above the chat box', means: 'The line above the chat box. It shows the one thing that matters most now; See all lists the rest.' },
}
export const TOPIC_NAMES = Object.keys(TOPICS) as Topic[]
export const topicOf = (words: string): Topic | undefined => TOPIC_NAMES.find(t => t === words.trim().toLowerCase())
export const explainCmd = (t: Topic): string => `/vaken-explain ${t}`

export const topicWhatIs = (t: Topic, why?: string): WhatIs => ({ means: TOPICS[t].means, ...(why === undefined ? {} : { why }), ...(TOPICS[t].setting === undefined ? {} : { setting: TOPICS[t].setting }) })

export function settingIn(text: string): string | undefined {
  let best: { at: number; key: string } | undefined
  for (const s of SETTINGS) {
    const at = text.indexOf(settingPath(s))
    if (at >= 0 && (best === undefined || at < best.at)) best = { at, key: s.key }
  }
  return best?.key
}

export const groupOf = (key: string | undefined): string | undefined => (key === undefined ? undefined : key === SESSIONS_SETTING ? 'Sessions' : findSetting(key)?.group)
export const focusOf = (key: string | undefined): string | undefined => (key === undefined ? undefined : focusOfSetting(key, groupOf(key)))

export function didWhatIs(what: string, rows: { at: number; detail?: string }[], now: number): WhatIs | undefined {
  const found = explainFor(what)
  if (found === undefined) return undefined
  const setting = settingIn(found.next)
  return { means: found.means, why: found.why, next: found.next, last: lastTimes(rows, now), ...(setting === undefined ? {} : { setting }) }
}

const LAST_SHOWN = 3
const LAST_DETAIL_MAX = 80
// The detail is counts and short words, never conversation text.
// `whole`: the detail is a sentence that tells something, so it wraps and is never cut (the Safety card's stopped steps)
// `who`: the session a line came from when it is not this one ("Web fixes"), said before the detail
export function lastTimes(rows: { at: number; detail?: string; who?: string }[], now: number, whole = false): string[] {
  const cut = (t: string): string => (!whole && t.length > LAST_DETAIL_MAX ? `${t.slice(0, LAST_DETAIL_MAX - 1)}…` : t)
  const said = (r: { detail?: string; who?: string }): string[] => [...(r.who === undefined ? [] : [r.who]), ...(r.detail === undefined || r.detail.trim() === '' ? [] : [cut(r.detail.replace(/\s+/g, ' ').trim())])]
  return [...rows]
    .sort((a, b) => b.at - a.at)
    .slice(0, LAST_SHOWN)
    .map(r => [agoWord(now - r.at), ...said(r)].join(': '))
}

const BAND_SETTING: [RegExp, string][] = [
  [/^health\b/, 'stability.check'],
  [/^assume$/, 'assume.check'],
  [/^diet$/, 'diet.mode'],
  [/^fresh$/, 'fresh.nudge'],
  [/^costhint$/, 'lean.mode'],
  [/^value$/, 'value.weekly'],
  [/^inbox$/, 'inbox.mode'],
  [/^promptcheck$/, 'prompt.check'],
  [/^planfirst$/, 'plan.first'],
  [/^proof2:drift$/, 'proof.drift'],
  [/^proof2:anomaly$/, 'proof.anomaly'],
  [/^happened-risk$/, 'happened.mode'],
  [/^pr-(checks|main)$/, 'crew.pr'],
  [/^laptop/, 'laptop.mode'],
  [/^rule$/, 'rules.mode'],
  [/^today$/, 'today.brief'],
  [/^agentcap$/, 'cap.mode'],
  [/^outbox$/, 'guard.outbox'],
  [/^away$/, 'away.policy'],
  [/^neighbors$/, 'neighbors.warn'],
  [/^resume$/, 'resume.mode'],
  [/^(limitwarn|dayshare)$/, 'limits.warn'],
  [/^coach$/, 'coach.mode'],
  [/^heartbeat$/, 'heartbeat.mode'],
  [/^recap$/, 'recap.mode'],
]
export const BAND_SETTINGS: readonly string[] = BAND_SETTING.map(x => x[1])
const BAND_OWN: [RegExp, string][] = [
  [/^trust:update$/, 'A plugin has a new version since your last session. A plugin can change what Claude does.'],
  [/^preset$/, 'You chose a style: a named set of Settings choices.'],
  [/^orch$/, 'Your task run ended or paused. The Agents card shows each task: open one to try it again, keep its work or throw it away.'],
]

export function bandWhatIs(item: { id: string; text: string; at: number }, now: number, rows: { at: number; detail?: string }[] = []): WhatIs {
  // The opened line sits right under the line itself, so it says when it was shown, not the line's words again
  const why = `Shown ${agoWord(now - item.at)}`
  // Is Claude down?: the line itself says the incident's title, so the opened line says what it means, its age and the status page
  const inc = statusMem.incident
  if (item.id === STATUS_BAND_ID && inc !== undefined) return { means: STATUS_MEANS, why: STATUS_WHY.replace('{ago}', agoWord(now - inc.startedAt)), setting: 'modhealth.mode', link: { label: STATUS_PAGE_LABEL, href: STATUS_PAGE } }
  if (item.id.startsWith('did:')) {
    const w = didWhatIs(item.id.slice(4), rows, now)
    if (w !== undefined) return { ...w, why: `${why}. ${w.why ?? ''}`.trim() }
  }
  const own = BAND_OWN.find(([re]) => re.test(item.id))
  if (own !== undefined) return { means: own[1], why }
  const key = BAND_SETTING.find(([re]) => re.test(item.id))?.[1]
  const s = key === undefined ? undefined : findSetting(key)
  if (s === undefined) return { means: 'A note from vaken.', why }
  return { means: `${sysWord(s.label)}: ${sysWord(s.note)}`, why, setting: s.key }
}

export function whatIsLines(w: WhatIs, say?: (s: string) => string): string[] {
  const words = (x: string): string => (say === undefined ? sysWord(x) : say(x))
  const plain = (x: string): string => (say === undefined ? x : say(x))
  const lastLine = (l: string): string => {
    const at = l.indexOf(': ')
    return at < 0 ? plain(l) : `${plain(l.slice(0, at))}: ${plain(l.slice(at + 2))}`
  }
  return [
    `${plain(w.lead ?? 'What it means:')} ${words(w.means)}`,
    ...(w.facts ?? []).map(plain),
    ...(w.why === undefined || w.why === '' ? [] : [`${plain('Why now:')} ${words(w.why)}`]),
    // Where a figure comes from is a source, not a reason, so it has its own label.
    ...(w.from === undefined || w.from === '' ? [] : [`${plain('Where it comes from:')} ${words(w.from)}`]),
    ...(w.next === undefined ? [] : [`${plain('What you can do:')} ${words(w.next)}`]),
    ...(w.last === undefined || w.last.length === 0 ? [] : [plain('The last times:'), ...w.last.map(l => `  ${lastLine(l)}`)]),
  ]
}

export const QUIET_MIN = 10
export const QUIET_AGAIN_MS = 7 * 24 * 3_600_000
export const QUIET_ASKED_KEY = 'cockpit:quiet:asked'
const ACTED_PREFIX = ACTED_MARK
export const actedTitle = (what: string): string => `${ACTED_PREFIX}${titleFor(what) ?? what}`

// Only a line that warns and stops nothing can be quieted, so no protection is lost.
// Case does not matter: a sentence can start with "Nothing was stopped."
const WARN_ONLY = /nothing was (blocked|stopped)|only you were told|you were told once|you were warned/i

export type QuietAsk = { what: string; n: number; setting: string; label: string }

export function parseAsked(raw: unknown): Record<string, number> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1])))
}

export function quietAsk(today: Record<string, number>, values: Values, asked: Record<string, number>, now: number): QuietAsk | undefined {
  let best: QuietAsk | undefined
  for (const [raw, n] of Object.entries(today)) {
    if (raw.startsWith(ACTED_PREFIX) || n < QUIET_MIN) continue
    const what = titleFor(raw) ?? raw
    const found = explainFor(what)
    if (found === undefined || !WARN_ONLY.test(found.means)) continue
    const key = settingIn(found.next)
    const s = key === undefined ? undefined : findSetting(key)
    if (s === undefined || !s.options.some(o => o.value === 'off') || (values[s.key] ?? s.default) === 'off') continue
    if ((today[actedTitle(what)] ?? 0) > 0) continue
    const at = asked[what]
    if (at !== undefined && now - at < QUIET_AGAIN_MS) continue
    if (best === undefined || n > best.n) best = { what, n, setting: s.key, label: s.label }
  }
  return best
}

export const quietWords = (q: QuietAsk, t: Tr = same): string => fillIn(t('{title}: {n} times today, nothing was stopped. Turn this warning off for all projects?'), { title: t(shownTitle(q.what)), n: q.n })
