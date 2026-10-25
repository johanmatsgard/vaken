// Welcome back with taps and Fix it on a failure: what finished, failed or waits since the last answer, each with one press. Pure.
import { builtIn } from './actions'
import type { Action, LastEnd } from './actions'
import { RECAP_AFTER_MS } from './attention'
import { KNOWN } from './errors'
import type { WhatIs } from './whatis'
import { NIGHT_FIX_ROW, PROMISE_ROW, nightHeadLine } from './night'
import type { NightLead } from './night'

export type AskId = 'continue' | 'fix' | 'diff' | 'again'
export type WelcomeDo = { do: 'ask'; id: AskId } | { do: 'hold'; key: string } | { do: 'run' } | { do: 'nightFix' } | { do: 'promise'; n: number }
export type WelcomeRun = { name: string; why: 'paused' | 'stopped' | 'failed' }
// `end`: how the last answer of the main loop ended; `edits` since the last commit; `kind`: the error translator's kind of a failed shell step.
// `night`: a night run that ended while the person was away; `promises`: what Claude said it would do later.
export type WelcomeFacts = { end?: LastEnd; edits: number; kind?: string; holdKey?: string; run?: WelcomeRun; night?: NightLead; promises?: string[] }
export type WelcomeRow = { key: string; title: string; right: string; what: WhatIs; press: WelcomeDo }

export const WELCOME_HEAD = 'Since you left'
export const VERB_CONTINUE = 'Continue'
export const VERB_FIX = 'Fix it'
export const VERB_SHOW = 'Show me'
export const ROW_HOLD = 'A stopped step waits for your yes'
export const ROW_RUN_PAUSED = 'Task run {name} is paused'
export const ROW_RUN_STOPPED = 'Task run {name} stopped'
export const ROW_RUN_FAILED = 'Task run {name} has failed tasks'
export const ROW_ASKED = 'Claude asked you a question'
export const ROW_FAILED = 'The last step failed'
export const ROW_STOPPED = 'Claude stopped before the end'
export const ROW_DONE_ONE = 'Claude finished: 1 change'
export const ROW_DONE_MANY = 'Claude finished: {n} changes'
export const PHONE_AGAIN = 'Show the question'
const MEANS_HOLD = 'Vaken stopped a step of this session, and it waits for your yes. Show me opens it in Needs you, where you can allow it once or dismiss it.'
const MEANS_RUN = 'The task run of this session needs you. Show me opens the task runner.'
const MEANS_ASKED = 'The last answer ended with a question to you. Show me asks Claude to say it again at the end of the chat.'
const MEANS_FAILED = 'The last step of the last answer failed. Fix it asks Claude to find why and fix it.'
const MEANS_STOPPED = 'The last answer stopped before it ended. Continue asks Claude to go on with the next step.'
const MEANS_DONE = 'Claude ended its answer after changing files. Show me asks Claude what changed, in short lines.'
const WELCOME_NEXT = 'A press sends a fixed request to Claude, or opens what waits. Nothing else changes.'
const MEANS_NIGHT = 'Your night run ended while you were away. Show me opens the task runner with each task and what it cost.'
const MEANS_NIGHT_FIX = 'Some tasks of the night run failed. Fix it asks Claude to fix them, naming each one.'
const MEANS_PROMISE = 'Claude said in an answer that it would do this later. Continue asks Claude to do it now. Type done (or done 2) when it is done.'

// en-only: a prompt sent to Claude
export const AGAIN_PROMPT = 'Ask me your last question again in one short line.'

export const WELCOME_STRINGS: string[] = [
  WELCOME_HEAD, VERB_CONTINUE, VERB_FIX, VERB_SHOW, ROW_HOLD, ROW_RUN_PAUSED, ROW_RUN_STOPPED, ROW_RUN_FAILED, ROW_ASKED, ROW_FAILED, ROW_STOPPED, ROW_DONE_ONE, ROW_DONE_MANY, PHONE_AGAIN,
  MEANS_HOLD, MEANS_RUN, MEANS_ASKED, MEANS_FAILED, MEANS_STOPPED, MEANS_DONE, WELCOME_NEXT, MEANS_NIGHT, MEANS_NIGHT_FIX, MEANS_PROMISE,
]

export const askPrompt = (id: AskId): string => (id === 'again' ? AGAIN_PROMPT : builtIn(id).prompt)

// The translator's own words for a kind, as a short phrase after a colon.
export const kindWords = (kind: string | undefined): string | undefined => KNOWN.find(k => k.kind === kind)?.says

const fill = (s: string, v: Record<string, string | number>): string => Object.entries(v).reduce((acc, [k, x]) => acc.split(`{${k}}`).join(String(x)), s)
const what = (means: string): WhatIs => ({ means, next: WELCOME_NEXT, setting: 'recap.mode' })

// The night run's result leads, even without a break in this session.
export function nightRows(f: WelcomeFacts | undefined, t: (s: string) => string): WelcomeRow[] {
  const l = f?.night
  if (l === undefined) return []
  return [
    { key: 'w-night', title: nightHeadLine(l, t), right: t(VERB_SHOW), what: what(MEANS_NIGHT), press: { do: 'run' } },
    ...(l.failedTasks.length === 0 ? [] : [{ key: 'w-night-fix', title: t(NIGHT_FIX_ROW), right: t(VERB_FIX), what: what(MEANS_NIGHT_FIX), press: { do: 'nightFix' } as WelcomeDo }]),
  ]
}

// The night run first, then waits, then how the last answer ended (at most one row of each), then Claude's promises.
export function welcomeRows(f: WelcomeFacts | undefined, t: (s: string) => string): WelcomeRow[] {
  if (f === undefined) return []
  const rows: WelcomeRow[] = [...nightRows(f, t)]
  if (f.holdKey !== undefined) rows.push({ key: 'w-hold', title: t(ROW_HOLD), right: t(VERB_SHOW), what: what(MEANS_HOLD), press: { do: 'hold', key: f.holdKey } })
  if (f.run !== undefined) {
    const line = f.run.why === 'paused' ? ROW_RUN_PAUSED : f.run.why === 'stopped' ? ROW_RUN_STOPPED : ROW_RUN_FAILED
    rows.push({ key: 'w-run', title: fill(t(line), { name: f.run.name }), right: t(VERB_SHOW), what: what(MEANS_RUN), press: { do: 'run' } })
  }
  if (f.end === 'asked') rows.push({ key: 'w-asked', title: t(ROW_ASKED), right: t(VERB_SHOW), what: what(MEANS_ASKED), press: { do: 'ask', id: 'again' } })
  else if (f.end === 'failed') {
    const says = kindWords(f.kind)
    rows.push({ key: 'w-failed', title: says === undefined ? t(ROW_FAILED) : `${t(ROW_FAILED)}: ${t(says).replace(/\.$/, '')}`, right: t(VERB_FIX), what: what(MEANS_FAILED), press: { do: 'ask', id: 'fix' } })
  } else if (f.end === 'stopped') rows.push({ key: 'w-stopped', title: t(ROW_STOPPED), right: t(VERB_CONTINUE), what: what(MEANS_STOPPED), press: { do: 'ask', id: 'continue' } })
  else if (f.end === 'done' && f.edits > 0) rows.push({ key: 'w-done', title: f.edits === 1 ? t(ROW_DONE_ONE) : fill(t(ROW_DONE_MANY), { n: f.edits }), right: t(VERB_SHOW), what: what(MEANS_DONE), press: { do: 'ask', id: 'diff' } })
  for (const [n, p] of (f.promises ?? []).entries()) rows.push({ key: `w-promise-${n}`, title: fill(t(PROMISE_ROW), { what: p }), right: t(VERB_CONTINUE), what: what(MEANS_PROMISE), press: { do: 'promise', n } })
  return rows
}

// A run needs the person when it paused for them, stopped, or ended with failed tasks, and it did something within `keepMs`.
export function runNeeds(run: { name: string; status: string; createdAt: number; startedAt?: number; resumeAt?: number; tasks: { state: string; endedAt?: number }[] } | undefined, now: number, keepMs: number): WelcomeRun | undefined {
  if (run === undefined) return undefined
  const last = Math.max(run.createdAt, run.startedAt ?? 0, ...run.tasks.map(x => x.endedAt ?? 0))
  if (now - last > keepMs) return undefined
  if (run.status === 'paused' && run.resumeAt === undefined) return { name: run.name, why: 'paused' }
  if (run.status === 'stopped') return { name: run.name, why: 'stopped' }
  if (run.status === 'done' && run.tasks.some(x => x.state === 'failed')) return { name: run.name, why: 'failed' }
  return undefined
}

// The phone's break: as long as the recap's, counted from the end of the last answer.
export const brokeOff = (endedAt: number | undefined, now: number, busy: boolean): boolean => !busy && endedAt !== undefined && now - endedAt >= RECAP_AFTER_MS

// On the phone only a press that sends a request fits a menu line.
export function welcomeActions(f: WelcomeFacts | undefined): Action[] {
  return welcomeRows(f, s => s).flatMap(r => (r.press.do !== 'ask' ? [] : [r.press.id === 'again' ? { id: 'again', label: PHONE_AGAIN, prompt: AGAIN_PROMPT } : builtIn(r.press.id)]))
}

// The toast of a failed shell step, at most once in FAIL_TOAST_MS; the translator's words, never the error text.
export const FAIL_TOAST_MS = 2 * 60_000
export const FAIL_HEAD = 'A step failed.'
export const FAIL_FIX = 'Press Fix it above the chat box to ask Claude to fix it.'
export const FAIL_EXPLAIN = 'Type /vaken-explain error for more.'
export const FAIL_STRINGS: string[] = [FAIL_HEAD, FAIL_FIX, FAIL_EXPLAIN, ...KNOWN.map(k => k.says)]

export const failToastDue = (lastAt: number | undefined, now: number): boolean => lastAt === undefined || now < lastAt || now - lastAt >= FAIL_TOAST_MS

export function failToastText(kind: string | undefined, fixShown: boolean): string {
  const says = kindWords(kind)
  return [FAIL_HEAD, ...(says === undefined ? [] : [says]), fixShown ? FAIL_FIX : FAIL_EXPLAIN].join(' ')
}
