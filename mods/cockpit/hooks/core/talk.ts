// Reach a session from the pane: answer, nudge a stuck one, or send a better version of a vague prompt (no model call).
import type { SessionRecord } from './record'
import { STALE_MS } from './record'
import { STUCK_MS, heartbeat } from './attention'
import { PROOF_KINDS, kindWord, statusOf } from './proof'
import type { ProofKind, ProofState } from './proof'
import type { WhatIs } from './whatis'

export type Vague = { at: number; sid: string; text: string; why: 'short' | 'command' }
export const talkMem: {
  drafts: Map<string, string>
  nudged: Map<string, number>
  vague?: Vague
} = { drafts: new Map(), nudged: new Map() }

export function noteVerdict(sid: string, at: number, text: string, verdict: { vague: boolean; why: string }): void {
  talkMem.vague = verdict.vague && (verdict.why === 'short' || verdict.why === 'command') ? { at, sid, text: text.trim().slice(0, PROMPT_KEEP_MAX), why: verdict.why } : undefined
}
const PROMPT_KEEP_MAX = 400

export const ANSWER_MAX = 500

// Words to a question, never to an OK box: a permission is answered in that session by the person.
export const canAnswer = (rec: Pick<SessionRecord, 'ask'>): boolean => rec.ask?.kind === 'question'

export const ASK_QUESTION_FACT = 'Claude asked you a question.'
export const ASK_WHERE = 'It is in your session list under {name}. Open that session to read it.'
export const ASK_PERMISSION_NEXT = 'Answer it in that session. Vaken never says yes for you.'
export const ANSWER_NOTE = 'Your answer is sent to {name} as a message from you. If the question box stays open, answer it there.'
export const REPLY_NOTE = 'Your reply is sent to {name} as a message from you and starts its next answer.'
// The box's placeholder names the session it goes to ({name})
export const ANSWER_HINT = 'Answer {name}'
export const REPLY_HINT = 'Reply to {name}'
export const SEND = 'Send'

export function askWhat(means: string, rec: Pick<SessionRecord, 'ask'>, waited: string, t: (s: string) => string, name?: string): WhatIs {
  const where = name === undefined ? [] : [t(ASK_WHERE).replace('{name}', name)]
  // A question says it once: "Claude asked you a question." is what it means (the card's general words would say it twice)
  if (rec.ask?.kind === 'question') {
    return { means: t(ASK_QUESTION_FACT), facts: where, why: t('It has waited {age}.').replace('{age}', waited) }
  }
  const tool = rec.ask?.tool ?? ''
  return { means, facts: [t('It waits to run {tool} and may need your OK.').replace('{tool}', tool), ...where], why: t('It has waited {age}.').replace('{age}', waited), next: t(ASK_PERMISSION_NEXT) }
}

export function answerText(typed: string): string | undefined {
  const flat = typed.replace(/\s+/g, ' ').trim()
  return flat === '' ? undefined : flat.slice(0, ANSWER_MAX)
}

export const SENT_TO = 'Sent to {name}.'
// The engine's reason for a send that did not arrive, in the app's own words: one line per known kind, else a calm line with no reason
export function notSentLine(reason: string): string {
  const r = reason.toLowerCase()
  if (/nobody|no one|no session|not found|unknown/.test(r)) return 'Not sent: no session has that name.'
  if (/several|more than one|ambiguous/.test(r)) return 'Not sent: several sessions have that name.'
  if (/gone|closed|ended|not running|exited/.test(r)) return 'Not sent: the session is closed.'
  if (/refus|declin|block|denied|not allowed/.test(r)) return 'Not sent: the session said no.'
  return 'Not sent. Type it in that session.'
}
export const NOT_SENT_HERE = 'Could not send from here. Type it in that session.'

export const NUDGE_TEXT = 'continue'
// The nudge for a teammate that waits for a message goes to Claude in this session, which leads the team
export const AGENT_NUDGE_SAID = 'Asked Claude to give the agent its next step.'
export const agentNudgeText = (name: string, min: number): string => `The agent ${name} has waited ${min} min for a message. Send it its next step, or end it if its work is done.` // en-only: a note to Claude
// At most one nudge per session in this long, so a press never becomes a stream of messages.
export const NUDGE_EVERY_MS = 10 * 60_000

export function mayBeStuck(rec: Pick<SessionRecord, 'state' | 'ask' | 'lastEventAt' | 'updatedAt'>, now: number): boolean {
  return rec.ask === undefined && now - rec.updatedAt <= STALE_MS && heartbeat(rec.state, now - rec.lastEventAt) === 'stuck'
}
export const quietMinutes = (rec: Pick<SessionRecord, 'lastEventAt'>, now: number): number => Math.max(Math.floor(STUCK_MS / 60_000), Math.floor((now - rec.lastEventAt) / 60_000))

export const canNudge = (sid: string, now: number): boolean => {
  const at = talkMem.nudged.get(sid)
  return at === undefined || now - at < 0 || now - at >= NUDGE_EVERY_MS
}

export const STUCK_TITLE = 'May be stuck: no sign for {n} min'
// Under a row whose state word already says "May be stuck" (Other sessions): the fact is said once
export const NO_SIGN_TITLE = 'No sign for {n} min'
export const NUDGE_WORD = 'Nudge · sends continue'
export const NUDGED_WORD = 'nudged'
export const NUDGE_SAID = 'Nudged: sent continue.'
export const NUDGE_SAID_HERE = 'Nudged: continue goes in when the answer ends. If it is stuck, press Stop in the app first.'
export const NUDGE_WAIT = 'Nudged less than 10 minutes ago. Give it a moment.'

const GOAL_MAX = 160

export const MISSES: Record<Vague['why'], string> = {
  command: 'A short command with no file name, path, number or quoted text, and no goal.',
  short: 'Fewer than 6 words, with no file name, path, number or quoted text, and no goal.',
}

export type BetterFacts = { failing: ProofKind[]; file?: string; goal?: string }
export function factsOf(proof: ProofState | undefined): BetterFacts {
  if (proof === undefined) return { failing: [] }
  const goal = proof.goal?.text.replace(/\s+/g, ' ').trim()
  return {
    failing: PROOF_KINDS.filter(k => statusOf(proof, k) === 'failed'),
    ...(proof.lastEditFile === undefined ? {} : { file: proof.lastEditFile }),
    ...(goal === undefined || goal === '' ? {} : { goal: goal.length > GOAL_MAX ? `${goal.slice(0, GOAL_MAX - 1).trimEnd()}…` : goal }),
  }
}

const checkName = (k: ProofKind): string => (k === 'tests' ? 'the tests' : kindWord(k))
const listOf = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const ended = (s: string): string => (/[.!?]$/.test(s) ? s : `${s}.`)

export function betterPrompt(text: string, facts: BetterFacts): string {
  const lines = [ended(text.replace(/\s+/g, ' ').trim())]
  if (facts.failing.length > 0) lines.push(`It is about ${listOf(facts.failing.map(checkName))}, which failed after the last change.`)
  if (facts.file !== undefined) lines.push(`The last file changed is ${facts.file}.`)
  if (facts.failing.length === 0 && facts.file === undefined) lines.push('Start by naming the file or the part you will change.')
  lines.push(facts.goal === undefined ? 'Before you start, say in one line what done looks like.' : `The goal: ${ended(facts.goal)}`)
  lines.push('If anything is still unclear, ask me one short question first.')
  return lines.join('\n')
}

export const BETTER_TITLE = 'Your last prompt may be too short'
export const BETTER_WORD = 'See a better one'
export const BETTER_HEAD = 'The better prompt, in full:'
export const BETTER_SEND = 'Send the better one'
export const BETTER_DROP = 'Not now'
export const BETTER_SAID = 'Sent the better prompt.'

export const OWN_WORD = 'Type it'
export const OWN_SAID = 'Type /{name} in the session. Vaken cannot run its own commands from its pane.'
