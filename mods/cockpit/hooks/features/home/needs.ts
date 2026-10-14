// Needs you shows all that waits ("act from the pane"): beside the questions and OK boxes of other sessions (the card's session rows)
import { HERE_FALLBACK, HOLD_ELSEWHERE_TODO, ROW_KINDS, isOpenHold, isRowItem, shownWhat, stoppedAt } from '../../core/inbox'
import type { InboxItem } from '../../core/inbox'
import { shownTitle } from '../../core/ledger'
import { didWhatIs, topicWhatIs } from '../../core/whatis'
import type { WhatIs } from '../../core/whatis'
import { HALT_WHAT } from '../../core/guard'
import { prWhat } from '../../core/prcard'
import type { PrRow } from '../../core/prcard'
import { lookWords, relevantKinds, statusOf } from '../../core/proof'
import type { ProofKind, ProofState } from '../../core/proof'
import { failedTasks } from '../../core/orchestra'
import type { Run } from '../../core/orchestra'
import { SAFETY_HALTED, SAFETY_RESUME } from '../../core/safetywords'
import type { GroupRow, LineGroup } from './linecards'
import { ageWord } from './logic'
import { ALLOW_ONCE, DISMISS_LABEL, PR_FIX, RESUME_ALL, checkClaims, dismissHold, fixCheck } from './rowact'
import type { Inside } from './rowact'

type Kind = InboxItem['kind']
const HEAD: Partial<Record<Kind, string>> = { hold: 'Stopped steps', budget: 'Stopped by the budget', cap: 'Agent cap', halt: 'Paused for safety', review: 'Changes to look at' }
export const ASKS_HEAD = 'Asks you'
// What the person can do about another session's stopped step: vaken never allows a step in another session
export const ELSEWHERE_NEXT = HOLD_ELSEWHERE_TODO
// A stopped step never runs by itself (traced in core/guard.ts holdReason): the guard refuses it and Claude must try again after the yes.
export const HOLD_WHY = 'Stopped {age} ago. It will not run unless you allow it.'
export const HOLD_WHY_NOW = 'Stopped just now. It will not run unless you allow it.'
export const HOLD_NEXT = 'Press Allow once, then tell Claude to try again. Allow once lets this one step run if Claude tries it again within 30 minutes.'
export const HOLD_MEANS = ['Claude tried a risky step.', 'Vaken stopped it before it ran.', 'Nothing changed, and the session waits for you.']
export const HERE_FACT = 'Session: {name} (this one).'

export const rowItems = (items: InboxItem[]): InboxItem[] => items.filter(isRowItem)

export const itemTitle = (it: InboxItem): string => shownTitle((it.what.split('. ')[0] ?? '').replace(/\.$/, '').replace(/ \(\d+ times\)$/, ''))

export const itemStep = (it: InboxItem): string => {
  const at = it.what.indexOf('. ')
  return at < 0 ? '' : it.what.slice(at + 2).trim()
}
// A sentence ends with a full stop when it has no end mark of its own (a closing quote or bracket after the mark counts)
export const endSentence = (s: string): string => (s === '' || /[.!?]["')\]]*$/.test(s) ? s : `${s}.`)
export const STOPPED_OLD = 'Stopped (try again in Claude, then allow)'

// A stopped step of this session that the person can let through from here: held in the last 30 minutes
export const canAllowHere = (it: InboxItem): boolean => it.kind === 'hold' && it.here && !it.allowed && it.stale !== true && itemStep(it) !== ''

export type InsideRow = GroupRow & { inside?: Inside }

const unnamed = (it: InboxItem): boolean => it.here && it.name === HERE_FALLBACK

const holdWhy = (ms: number): string => (ms < 60_000 ? HOLD_WHY_NOW : HOLD_WHY.replace('{age}', ageWord(ms)))
const whyOf = (it: InboxItem, now: number): string | undefined => {
  const at = isOpenHold(it) ? stoppedAt(it) : undefined
  if (at !== undefined) return holdWhy(now - at)
  return it.since === undefined ? undefined : `${it.approx ? 'It waits at least' : 'It waits'} ${ageWord(now - it.since)}.`
}

const whatOf = (it: InboxItem, now: number): WhatIs => {
  const why = whyOf(it, now)
  return {
    means: isOpenHold(it) ? [...HOLD_MEANS, endSentence(itemStep(it))].filter(x => x !== '').join(' ') : shownWhat(it.what),
    facts: unnamed(it) ? [] : [it.here ? HERE_FACT.replace('{name}', it.name) : `Session: ${it.name}.`],
    ...(why === undefined ? {} : { why }),
    next: canAllowHere(it) ? HOLD_NEXT : isOpenHold(it) && !it.here ? ELSEWHERE_NEXT : it.todo,
  }
}

export const agoWord = (ms: number, t: (s: string) => string): string => (ms < 60_000 ? t('just now') : t('{age} ago').replace('{age}', ageWord(ms, t)))

export function itemRow(it: InboxItem, n: number, now: number, t: (s: string) => string): InsideRow {
  const where = unnamed(it) ? t('This session') : it.name
  const old = it.kind === 'hold' && it.here && it.stale === true
  const title = it.kind === 'review' ? lookWords(it.count, t).replace(/\.$/, '') : old ? t(STOPPED_OLD) : t(itemTitle(it))
  const row = { key: `${it.kind}-${it.sid}-${n}`, title: `${where}: ${title}`, what: whatOf(it, now) }
  const at = isOpenHold(it) ? stoppedAt(it) : undefined
  const age = at !== undefined ? agoWord(now - at, t) : it.since === undefined ? undefined : agoWord(now - it.since, t)
  const dismiss = { label: DISMISS_LABEL, action: dismissHold(it.sid) }
  if (canAllowHere(it)) return { ...row, ...(age === undefined ? {} : { right: age }), inside: { label: 'Allow once', action: ALLOW_ONCE, more: [dismiss] } }
  // Every stopped step, here or in another session, open or old, can be dismissed from its detail
  const held = it.kind === 'hold' ? { inside: dismiss } : {}
  if (it.kind === 'hold' && it.here && it.allowed) return { ...row, right: t('allowed'), ...held }
  return age === undefined ? { ...row, ...held } : { ...row, right: age, ...held }
}

export function needsGroups(items: InboxItem[], now: number, t: (s: string) => string): LineGroup[] {
  const shown = rowItems(items)
  return ROW_KINDS.flatMap(k => {
    const of = shown.filter(x => x.kind === k)
    return of.length === 0 ? [] : [{ head: HEAD[k] ?? k, rows: of.map((it, n) => itemRow(it, n, now, t)) }]
  })
}

export const NEWS_HEAD = 'News from other cards'
export const NEWS_CHECK = 'A check failed or a claim has no check'
export const NEWS_AGENT = 'An agent is stuck or failed'
export const HALT_NEWS_NEXT = 'Press Resume to let Claude work again. /vaken-pause off does the same.'
export const PR_NEWS_TITLE = 'Pull request {n}: a check failed'
export const PR_NEWS_NEXT = 'Press Fix to put a fix request in the prompt box, then press Enter to send it. /vaken-ship ci-fix send does the same.'
export const PROOF_FIX_NEXT = 'Press to put a fix request in the prompt box, then press Enter to send it. /vaken-ship proof shows what ran.'
export const PROOF_CLAIMS_NEXT = 'Press to ask Claude to run the checks that prove them, and show the results.'
const PROOF_MEANS = 'Claude did work that was checked, and a check failed or no check backs a claim.'
const AGENT_MEANS = 'An agent has gone quiet or a task of the run failed.'
const AGENT_NEXT = 'Open the Agents card (View: All) or ask Claude what it needs.'
export type NewsFacts = { hidden: readonly string[]; halted: boolean; myPr?: PrRow; proofFail?: ProofKind; proofClaims: number; agentTrouble: boolean; proofProblem: boolean; now?: number }
const allHidden = (f: NewsFacts, ids: string[]): boolean => ids.every(id => f.hidden.includes(id))
const haltShows = (f: NewsFacts): boolean => f.halted && allHidden(f, ['safety'])
const prOf = (f: NewsFacts): PrRow | undefined => (f.myPr !== undefined && f.myPr.mine && f.myPr.checks === 'failing' && allHidden(f, ['prs', 'ship']) ? f.myPr : undefined)
const proofShows = (f: NewsFacts): boolean => f.proofProblem && allHidden(f, ['proof', 'ship'])

// The news facts from what the pane loaded: one builder for the card (cards/top.tsx) and the load (load.ts)
export type NewsFrom = { hidden: readonly string[]; halted: boolean; myPr?: PrRow; proof?: ProofState; agents?: { state: string; quietAt?: number }[]; run?: Run }
export function newsFactsOf(p: NewsFrom, now: number): NewsFacts {
  const proof = p.proof
  const proofFail = proof === undefined ? undefined : relevantKinds(proof).find(k => statusOf(proof, k) === 'failed')
  const proofClaims = proof?.last?.unproven.length ?? 0
  return {
    hidden: p.hidden,
    halted: p.halted,
    ...(p.myPr === undefined ? {} : { myPr: p.myPr }),
    ...(proofFail === undefined ? {} : { proofFail }),
    proofClaims,
    proofProblem: proofFail !== undefined || proofClaims > 0,
    agentTrouble: (p.agents ?? []).some(r => r.state === 'running' && r.quietAt !== undefined) || failedTasks(p.run) > 0,
    now,
  }
}
export const newsCount = (f: NewsFacts): number => (haltShows(f) ? 1 : 0) + (prOf(f) !== undefined ? 1 : 0) + (proofShows(f) ? 1 : 0)

export function hereNews(f: NewsFacts, name: string, t: (s: string) => string): LineGroup[] {
  if (!haltShows(f)) return []
  const what: WhatIs = { ...(didWhatIs(HALT_WHAT, [], f.now ?? 0) ?? topicWhatIs('guard')), next: HALT_NEWS_NEXT }
  const row: InsideRow = { key: 'news-halt', title: `${name}: ${t(SAFETY_HALTED)}`, what, inside: { label: SAFETY_RESUME, action: RESUME_ALL } }
  return [{ head: HEAD.halt ?? SAFETY_HALTED, rows: [row] }]
}

export function newsGroups(f: NewsFacts, t: (s: string) => string): LineGroup[] {
  const pr = prOf(f)
  const proofPress: Inside | undefined = f.proofFail !== undefined ? { label: 'Fix', action: fixCheck(f.proofFail) } : f.proofClaims > 0 ? { label: 'Check', action: checkClaims(f.proofClaims) } : undefined
  const rows: InsideRow[] = [
    ...(pr === undefined ? [] : [{ key: 'news-pr', title: t(PR_NEWS_TITLE).replace('{n}', String(pr.number)), right: t('failing'), what: { ...prWhat(pr, f.now ?? 0, undefined, t), next: PR_NEWS_NEXT }, inside: { label: 'Fix', action: PR_FIX } }]),
    ...(proofShows(f)
      ? [{ key: 'news-proof', title: t(NEWS_CHECK), what: { means: PROOF_MEANS, next: f.proofFail !== undefined ? PROOF_FIX_NEXT : PROOF_CLAIMS_NEXT }, ...(proofPress === undefined ? {} : { inside: proofPress }) }]
      : []),
    ...(f.agentTrouble && allHidden(f, ['agents']) ? [{ key: 'news-agents', title: t(NEWS_AGENT), what: { means: AGENT_MEANS, next: AGENT_NEXT } }] : []),
  ]
  return rows.length === 0 ? [] : [{ head: t(NEWS_HEAD), rows }]
}

export const NEEDS_WORDS: string[] = [NEWS_HEAD, NEWS_CHECK, NEWS_AGENT, PROOF_MEANS, AGENT_MEANS, AGENT_NEXT, HALT_NEWS_NEXT, PR_NEWS_TITLE, PR_NEWS_NEXT, PROOF_FIX_NEXT, PROOF_CLAIMS_NEXT, 'Fix', 'Check', 'failing', SAFETY_RESUME, SAFETY_HALTED, ASKS_HEAD, ...Object.values(HEAD), 'Allow once', DISMISS_LABEL, 'allowed', STOPPED_OLD, HOLD_NEXT, ELSEWHERE_NEXT, '{age} ago', 'just now', 'This session']
