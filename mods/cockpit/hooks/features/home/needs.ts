// Needs you shows all that waits ("act from the pane"): beside the questions and OK boxes of other sessions (the card's session rows)
import { HERE_FALLBACK, HOLD_ELSEWHERE_TODO, ROW_KINDS, isOpenHold, isRowItem, isStaleHold, shownWhat, stoppedAt } from '../../core/inbox'
import type { InboxItem } from '../../core/inbox'
import { shownTitle } from '../../core/ledger'
import { didWhatIs, topicWhatIs } from '../../core/whatis'
import type { WhatIs } from '../../core/whatis'
import { HALT_WHAT } from '../../core/guard'
import { prWhat } from '../../core/prcard'
import type { PrRow } from '../../core/prcard'
import { KIND_SHORT, relevantKinds, statusOf } from '../../core/proof'
import type { ProofKind, ProofState } from '../../core/proof'
import { failedTasks } from '../../core/orchestra'
import type { Run } from '../../core/orchestra'
import { SAFETY_HALTED, SAFETY_RESUME } from '../../core/safetywords'
import type { GroupRow, LineGroup } from './linecards'
import { ageWord } from './logic'
import { TEACH_ASK, TEACH_HEAD, TEACH_LATER, TEACH_LINE, TEACH_SAVE, TEACH_TITLE, teachMem } from '../../core/teach'
import type { RuleOffer } from '../../core/teach'
import { REPEAT_ASK, REPEAT_DRAFT, REPEAT_HEAD, REPEAT_LINE, REPEAT_TITLE, plainShape, repeatMem, skillSlug } from '../../core/repeat'
import type { RepeatOffer } from '../../core/repeat'
import { STUCK_FRESH, STUCK_HEAD, STUCK_MEANS, STUCK_NEXT, STUCK_NEXT_FRESH, STUCK_STRONG, STUCK_TITLE, liveStuck, stuckMem } from '../../core/loopbreaker'
import type { StuckOffer } from '../../core/loopbreaker'
import { KEEP_HEAD, KEEP_MAX_MEANS, KEEP_MAX_NEXT, KEEP_MAX_TITLE, KEEP_ROUNDS, KEEP_TITLE, keepMaxed, keepOn } from '../../core/keepgoing'
import type { KeepGoing } from '../../core/proof'
import { ALLOW_ONCE, DISMISS_LABEL, KEEP_DISMISS_ROW, KEEP_STOPPED_ROW, keepStart, REPEAT_NO, REPEAT_YES, RESUME_ALL, STUCK_FRESH_ROW, STUCK_STRONG_ROW, TEACH_NO, TEACH_YES, checkClaims, dismissHold, fixCheck } from './rowact'
import { openShort } from '../../core/allowonce'
import { KEEP_STOPPED, STEP_FACT } from '../../core/allowrules'
import type { Inside } from './rowact'
import { langNow, t as tKey, trFill } from '../../core/lang'
import { fmt } from '../../core/fmt'
import { glanceOpenKey } from '../../core/headline'

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
// An old stopped row keeps its step's title and its age; its detail says why it has no Allow once
export const STOPPED_OLD = 'Allow once has timed out'
export const STOPPED_OLD_WHY = 'Stopped {age} ago. Allow once has timed out.'

// A stopped step of this session that the person can let through from here: held in the last 30 minutes
export const canAllowHere = (it: InboxItem): boolean => it.kind === 'hold' && it.here && !it.allowed && it.stale !== true && itemStep(it) !== ''

export type InsideRow = GroupRow & { inside?: Inside }

const unnamed = (it: InboxItem): boolean => it.here && it.name === HERE_FALLBACK

const holdWhy = (ms: number): string => (ms < 60_000 ? HOLD_WHY_NOW : HOLD_WHY.replace('{age}', ageWord(ms)))
const whyOf = (it: InboxItem, now: number): string | undefined => {
  const old = isStaleHold(it) ? stoppedAt(it) : undefined
  if (old !== undefined) return STOPPED_OLD_WHY.replace('{age}', ageWord(now - old))
  const at = isOpenHold(it) ? stoppedAt(it) : undefined
  if (at !== undefined) return holdWhy(now - at)
  return it.since === undefined ? undefined : `${it.approx ? 'It waits at least' : 'It waits'} ${ageWord(now - it.since)}.`
}

// The stored step is English. Another language says it through its row where one exists, else as a quote on its own line (never mixed into a sentence)
const stepSaid = (step: string): { said?: string; quote?: string } => {
  if (step === '') return {}
  return langNow() === 'en' || trFill(step) !== step ? { said: step } : { quote: `“${step}”` }
}
const whatOf = (it: InboxItem, now: number): WhatIs => {
  const why = whyOf(it, now)
  const short = canAllowHere(it) ? openShort(it.sid, now) : undefined
  const step = isOpenHold(it) ? stepSaid(endSentence(itemStep(it))) : {}
  return {
    means: isOpenHold(it) ? [...HOLD_MEANS, step.said ?? ''].filter(x => x !== '').join(' ') : shownWhat(it.what),
    facts: [...(step.quote === undefined ? [] : [step.quote]), ...(short === undefined ? [] : [STEP_FACT.replace('{short}', short)]), ...(unnamed(it) ? [] : [it.here ? HERE_FACT.replace('{name}', it.name) : `Session: ${it.name}.`])],
    ...(why === undefined ? {} : { why }),
    next: canAllowHere(it) ? HOLD_NEXT : isOpenHold(it) && !it.here ? ELSEWHERE_NEXT : it.todo,
  }
}

// Every age that says "ago" goes through fmt.ago, in the language of this draw ("just now", "8 min ago", Swedish "nyss", "för 8 min sedan")
export const agoWord = (ms: number): string => fmt.ago(Math.max(0, ms), 'days', langNow())

// Every row has a question row's form (`session`): another session's rows carry its name as their bold line; this session's rows carry none (the card is about this session)
// A stale stopped step (Allow once timed out) is a calm row: its age alone, its detail says why
export function itemRow(it: InboxItem, n: number, now: number, t: (s: string) => string): InsideRow {
  const title = t(itemTitle(it))
  const row = { key: `${it.kind}-${it.sid}-${n}`, title, what: whatOf(it, now), session: { ...(it.here ? {} : { name: it.name }), ...(isStaleHold(it) ? { calm: true } : {}) } }
  const at = isOpenHold(it) || isStaleHold(it) ? stoppedAt(it) : undefined
  const age = at !== undefined ? agoWord(now - at) : it.since === undefined ? undefined : agoWord(now - it.since)
  const dismiss = { label: DISMISS_LABEL, action: dismissHold(it.sid) }
  if (canAllowHere(it)) return { ...row, ...(age === undefined ? {} : { right: age }), inside: { label: 'Allow once', action: ALLOW_ONCE, more: [{ label: KEEP_STOPPED, action: KEEP_STOPPED_ROW }, dismiss] } }
  // Every stopped step, here or in another session, open or old, can be dismissed from its detail
  const held = it.kind === 'hold' ? { inside: dismiss } : {}
  if (it.kind === 'hold' && it.here && it.allowed) return { ...row, right: t('allowed'), ...held }
  return age === undefined ? { ...row, ...held } : { ...row, right: age, ...held }
}

// Newest first in each group, by when the step was last stopped or first seen; a row keeps the key of its place in the inbox, so an open row stays open
const newestFirst = (a: { it: InboxItem }, b: { it: InboxItem }): number => (stoppedAt(b.it) ?? 0) - (stoppedAt(a.it) ?? 0)
export function needsGroups(items: InboxItem[], now: number, t: (s: string) => string): LineGroup[] {
  const shown = rowItems(items)
  return ROW_KINDS.flatMap(k => {
    const of = shown.filter(x => x.kind === k).map((it, n) => ({ it, n })).sort(newestFirst)
    return of.length === 0 ? [] : [{ head: HEAD[k] ?? k, rows: of.map(({ it, n }) => itemRow(it, n, now, t)) }]
  })
}

export const NEWS_HEAD = 'News from other cards'
export const NEWS_CHECK = 'A check failed or a claim has no check'
// The proof row says what is true: "Tests failed", "2 claims have no check", or both
// While a check fails, a claim it contradicts is said by "Tests failed", so only the claims with no check behind them are counted (`proofNoCheck`)
export const checkTitle = (f: Pick<NewsFacts, 'proofFail' | 'proofClaims' | 'proofNoCheck'>, t: (s: string) => string): string => {
  const failed = f.proofFail === undefined ? undefined : tKey('calm.kinds_failed', { kinds: t(KIND_SHORT[f.proofFail]) })
  const n = f.proofFail === undefined ? f.proofClaims : (f.proofNoCheck ?? f.proofClaims)
  const claims = n > 0 ? tKey('needs.n_claims_have_no_check', { n }) : undefined
  if (failed !== undefined && claims !== undefined) return tKey('needs.failed_and_claims', { failed, claims })
  return failed ?? claims ?? t(NEWS_CHECK)
}
export const NEWS_AGENT = 'An agent is stuck or failed'
export const HALT_NEWS_NEXT = 'Press Resume to let Claude work again. /vaken-pause off does the same.'
export const PR_NEWS_TITLE = 'Pull request {n}: a check failed'
export const PR_NEWS_NEXT = 'Open the pull request to see which check failed. /vaken-ship ci-fix puts a fix request in the prompt box.'
export const PR_NEWS_OPEN = 'Open the pull request'
// Only a web address gh gave (https) is offered as a link
const webLink = (url: string): string | undefined => (/^https:\/\/\S+$/.test(url) ? url : undefined)
export const PROOF_FIX_NEXT = 'Press Fix to put a fix request in the prompt box, then press Enter to send it. /vaken-ship proof shows what ran.'
export const PROOF_CLAIMS_NEXT = 'Press Check to ask Claude to run the checks that prove them, and show the results.'
const PROOF_MEANS = 'Claude did work that was checked, and a check failed or no check backs a claim.'
const AGENT_MEANS = 'An agent has gone quiet or a task of the run failed.'
const AGENT_NEXT = 'Open the Agents card (View: All) or ask Claude what it needs.'
// `keepCan`: Keep going may be offered beside Fix (Check runs on, not running yet); `keepMax`: it used its last round and the check still fails
export type NewsFacts = { hidden: readonly string[]; safetyFolded?: boolean; halted: boolean; myPr?: PrRow; proofFail?: ProofKind; proofClaims: number; proofNoCheck?: number; agentTrouble: boolean; proofProblem: boolean; now?: number; teach?: RuleOffer; stuck?: StuckOffer; keepCan?: boolean; keepMax?: KeepGoing; repeat?: RepeatOffer }
const allHidden = (f: NewsFacts, ids: string[]): boolean => ids.every(id => f.hidden.includes(id))
// The pause shows once: in Needs you only while the Safety card (its Resume) is out of sight, hidden or folded at the Glance look
export const haltShows = (f: NewsFacts): boolean => f.halted && (f.hidden.includes('safety') || f.safetyFolded === true)
const prOf = (f: NewsFacts): PrRow | undefined => (f.myPr !== undefined && f.myPr.mine && f.myPr.checks === 'failing' && allHidden(f, ['prs', 'ship']) ? f.myPr : undefined)
const proofShows = (f: NewsFacts): boolean => f.proofProblem && allHidden(f, ['proof', 'ship'])

// The news facts from what the pane loaded: one builder for the card (cards/top.tsx) and the load (load.ts)
export type NewsFrom = { hidden: readonly string[]; openSections?: readonly string[]; values?: Readonly<Record<string, string>>; halted: boolean; myPr?: PrRow; proof?: ProofState; agents?: { state: string; quietAt?: number }[]; run?: Run }
export function newsFactsOf(p: NewsFrom, now: number): NewsFacts {
  const proof = p.proof
  const proofFail = proof === undefined ? undefined : relevantKinds(proof).find(k => statusOf(proof, k) === 'failed')
  const proofClaims = proof?.last?.unproven.length ?? 0
  return {
    hidden: p.hidden,
    safetyFolded: p.values?.detail === 'glance' && !(p.openSections ?? []).includes(glanceOpenKey('safety')),
    halted: p.halted,
    ...(p.myPr === undefined ? {} : { myPr: p.myPr }),
    ...(proofFail === undefined ? {} : { proofFail }),
    proofClaims,
    proofNoCheck: proof?.last?.unproven.filter(g => g.why !== 'failed').length ?? 0,
    proofProblem: proofFail !== undefined || proofClaims > 0,
    agentTrouble: (p.agents ?? []).some(r => r.state === 'running' && r.quietAt !== undefined) || failedTasks(p.run) > 0,
    now,
    ...(teachMem.offer === undefined ? {} : { teach: teachMem.offer }),
    // Repeat to skill waits in Needs you only while the Skills card is hidden (its own place)
    ...(repeatMem.offer === undefined || !p.hidden.includes('skills') ? {} : { repeat: repeatMem.offer }),
    ...(liveStuck(stuckMem.offer, now) === undefined ? {} : { stuck: stuckMem.offer }),
    ...(proof !== undefined && p.values?.['proof.receipts'] !== 'off' && keepOn(proof) === undefined ? { keepCan: true } : {}),
    ...(keepMaxed(proof) === undefined || p.values?.['proof.receipts'] === 'off' ? {} : { keepMax: keepMaxed(proof) }),
  }
}
export const newsCount = (f: NewsFacts): number => (haltShows(f) ? 1 : 0) + (prOf(f) !== undefined ? 1 : 0) + (proofShows(f) ? 1 : 0)

export function hereNews(f: NewsFacts, t: (s: string) => string): LineGroup[] {
  if (!haltShows(f)) return []
  const what: WhatIs = { ...(didWhatIs(HALT_WHAT, [], f.now ?? 0) ?? topicWhatIs('guard')), next: HALT_NEWS_NEXT }
  const row: InsideRow = { key: 'news-halt', title: t(SAFETY_HALTED), what, inside: { label: SAFETY_RESUME, action: RESUME_ALL } }
  return [{ head: HEAD.halt ?? SAFETY_HALTED, rows: [row] }]
}

export function newsGroups(f: NewsFacts, t: (s: string) => string): LineGroup[] {
  const pr = prOf(f)
  // Keep going sits beside Fix, never while the stuck ladder offers its own ways out
  const keepPress = f.proofFail !== undefined && f.keepCan === true && f.stuck === undefined ? [{ label: KEEP_TITLE[f.proofFail], action: keepStart(f.proofFail) }] : []
  const proofPress: Inside | undefined = f.proofFail !== undefined ? { label: 'Fix', action: fixCheck(f.proofFail), ...(keepPress.length === 0 ? {} : { more: keepPress }) } : f.proofClaims > 0 ? { label: 'Check', action: checkClaims(f.proofClaims) } : undefined
  const rows: InsideRow[] = [
    ...(pr === undefined ? [] : [{ key: 'news-pr', title: t(PR_NEWS_TITLE).replace('{n}', String(pr.number)), right: t('failing'), what: { ...prWhat(pr, f.now ?? 0, undefined, t), next: PR_NEWS_NEXT, ...(webLink(pr.view.url) === undefined ? {} : { link: { label: PR_NEWS_OPEN, href: webLink(pr.view.url) as string } }) } }]),
    ...(proofShows(f)
      ? [{ key: 'news-proof', title: checkTitle(f, t), what: { means: PROOF_MEANS, next: f.proofFail !== undefined ? PROOF_FIX_NEXT : PROOF_CLAIMS_NEXT }, ...(proofPress === undefined ? {} : { inside: proofPress }) }]
      : []),
    ...(f.agentTrouble && allHidden(f, ['agents']) ? [{ key: 'news-agents', title: t(NEWS_AGENT), what: { means: AGENT_MEANS, next: AGENT_NEXT } }] : []),
  ]
  return [...(rows.length === 0 ? [] : [{ head: t(NEWS_HEAD), rows }]), ...stuckGroups(f, t), ...keepGroups(f, t), ...teachGroups(f, t), ...(f.repeat === undefined ? [] : repeatGroups(f.repeat, t))]
}

// Keep going used its last round and the check still fails: a calm row (not counted in the band), Fix or Dismiss, nothing runs by itself.
export function keepGroups(f: NewsFacts, t: (s: string) => string): LineGroup[] {
  const k = f.keepMax
  if (k === undefined) return []
  const row: InsideRow = {
    key: 'news-keep',
    title: t(KEEP_MAX_TITLE).replace('{check}', t(KIND_SHORT[k.kind])).replace('{n}', String(KEEP_ROUNDS)),
    what: { means: KEEP_MAX_MEANS, next: KEEP_MAX_NEXT, setting: 'proof.receipts' },
    inside: { label: 'Fix', action: fixCheck(k.kind), more: [{ label: DISMISS_LABEL, action: KEEP_DISMISS_ROW }] },
  }
  return [{ head: t(KEEP_HEAD), rows: [row] }]
}

// The stuck ladder's offer: calm like the rule offer (not counted in the band); each press says what it does, and nothing runs without one.
export function stuckGroups(f: NewsFacts, t: (s: string) => string): LineGroup[] {
  const o = f.stuck
  if (o === undefined) return []
  const row: InsideRow = {
    key: 'news-stuck',
    title: t(STUCK_TITLE).replace('{check}', t(KIND_SHORT[o.kind])),
    what: { means: STUCK_MEANS, next: o.up === undefined ? STUCK_NEXT_FRESH : STUCK_NEXT, setting: 'loop.breaker' },
    // The stronger try only where a stronger model than the session's exists; else the fresh start is the one press.
    inside: o.up === undefined ? { label: STUCK_FRESH, action: STUCK_FRESH_ROW } : { label: STUCK_STRONG, action: STUCK_STRONG_ROW, more: [{ label: STUCK_FRESH, action: STUCK_FRESH_ROW }] },
  }
  return [{ head: t(STUCK_HEAD), rows: [row] }]
}

// A calm offer: it is not counted in the band, and its two presses are the only way it is saved.
export function teachGroups(f: NewsFacts, t: (s: string) => string): LineGroup[] {
  const o = f.teach
  if (o === undefined) return []
  const row: InsideRow = {
    key: 'news-teach',
    title: t(TEACH_TITLE).replace('{rule}', o.rule.said),
    what: { means: `${t(TEACH_ASK)} ${t(TEACH_LINE).replace('{line}', o.rule.line)}` },
    inside: { label: TEACH_SAVE, action: TEACH_YES, more: [{ label: TEACH_LATER, action: TEACH_NO }] },
  }
  return [{ head: t(TEACH_HEAD), rows: [row] }]
}

// Repeat to skill (core/repeat.ts): calm like the rule offer, in the Skills card or here. Its two presses are the only way anything happens.
export function repeatGroups(o: RepeatOffer, t: (s: string) => string): LineGroup[] {
  const row: InsideRow = {
    key: 'repeat',
    title: t(REPEAT_TITLE).replace('{shape}', plainShape(o.steps, t)),
    what: { means: `${t(REPEAT_ASK)} ${t(REPEAT_LINE).replace('{name}', skillSlug(o.steps))}` },
    inside: { label: REPEAT_DRAFT, action: REPEAT_YES, more: [{ label: TEACH_LATER, action: REPEAT_NO }] },
  }
  return [{ head: t(REPEAT_HEAD), rows: [row] }]
}

export const NEEDS_WORDS: string[] = [NEWS_HEAD, NEWS_CHECK, NEWS_AGENT, PROOF_MEANS, AGENT_MEANS, AGENT_NEXT, HALT_NEWS_NEXT, PR_NEWS_TITLE, PR_NEWS_NEXT, PR_NEWS_OPEN, PROOF_FIX_NEXT, PROOF_CLAIMS_NEXT, 'Fix', 'Check', 'failing', SAFETY_RESUME, SAFETY_HALTED, ASKS_HEAD, ...Object.values(HEAD), 'Allow once', DISMISS_LABEL, 'allowed', STOPPED_OLD, STOPPED_OLD_WHY, HOLD_NEXT, ELSEWHERE_NEXT, '{age} ago', 'just now', 'This session']
