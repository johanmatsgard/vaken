// The Glance look's one table: each card id -> the headline value its row shows at the right.
import { BLOCKS, SETTING_KEY } from '../../core/guard'
import { contextLoud } from '../../core/contextcard'
import type { GlanceDot, PrsHeadFacts } from '../../core/headline'
import { agentsHead, agentsShort, autopilotHead, backHead, computerHead, contextHead, doHead, glanceDot, guardHead, hereHead, limitHead, othersHead, previewHead, prsHead, prsShortHead, proofHead, safetyHead, setupHead, shipHead, skillsHead } from '../../core/headline'
import { backWaiting } from '../../core/backcard'
import { previewState } from '../../core/previewcard'
import { relevantKinds, statusOf } from '../../core/proof'
import { setupApplyOn, setupLoud } from '../../core/setupcard'
import { prOff, prUnchecked, shipVerdict, shownBlocks } from '../../core/shipcard'
import type { ShipFacts } from '../../core/shipcard'
import { usedCount } from '../../core/skills'
import { repeatMem } from '../../core/repeat'
import { t, tr } from '../../core/lang'
import { safetyFacts } from './linecards'
import { haltShows, newsFactsOf } from './needs'
import { LIMIT_HOT_PCT, cardLabel, limitAgo, limitLoud, limitBlocks, resetSaid, stateWord, usedUp } from './logic'
import type { CardId, LimitBlock, Loud, View } from './logic'
import type { Prefs } from './prefs'
import type { AgentsModel } from './cards/agents'
import type { AutopilotModel } from './cards/autopilot'
import type { ComputerModel } from './cards/computer'
import type { LimitModel } from './cards/limit'
import type { LinesModel } from './cards/lines'
import type { OthersModel } from './cards/others'
import { BOLD_CHAR_PT, CHEVRON_GAP, CHEVRON_SLOT, DOT, GLANCE_DOT_GAP, GLANCE_VALUE_GAP, TEXT_CHAR_PT } from '../../ui/tokens'

export type GlanceFacts = { view: View; prefs: Prefs; lines: LinesModel; limit: LimitModel; others: OthersModel; auto: AutopilotModel; agents: AgentsModel; comp: ComputerModel; widthPt?: number; hereWaits?: boolean }

// The gear takes only the room the value leaves (kit gearReserve), so it is not counted here.
export const glanceFits = (title: string, widthPt: number | undefined) => (value: string): boolean =>
  widthPt === undefined || value.length * TEXT_CHAR_PT <= widthPt - tr(title).length * BOLD_CHAR_PT - GLANCE_VALUE_GAP - GLANCE_DOT_GAP - DOT - CHEVRON_GAP - CHEVRON_SLOT

const proofFacts = (p: Prefs['proof']) => {
  if (p === undefined || (p.turns === 0 && p.receipts.length === 0 && p.goal === undefined)) return { none: true, failed: 0, unproven: 0, debt: 0 }
  return { none: false, failed: relevantKinds(p).filter(k => statusOf(p, k) === 'failed').length, unproven: p.last?.unproven.length ?? 0, debt: p.debt }
}

export const HEADLINES: Record<CardId, (f: GlanceFacts) => string> = {
  // The app answered but shares no plan limits: the header says "Not shared" once and the body explains (limit.tsx)
  limit: f => (f.limit.blocks.length === 0 && f.limit.empty === 'none' ? tr('Not shared') : limitHead(f.limit.blocks.map(b => ({ short: b.short, name: cardLabel(b, tr), hot: limitLoud([b], f.view.now ?? 0) !== 'normal', percent: b.percent, reset: b.reset === '' ? '' : resetSaid(b.reset, tr) })), tr, glanceFits(GLANCE_TITLES.limit, f.widthPt), limitAgo(f.limit.blocks, tr))),
  here: f => hereHead(f.view.here === undefined ? undefined : { state: hereState(f), ...(f.view.here.rec.costUsd === undefined ? {} : { costUsd: f.view.here.rec.costUsd }) }, tr),
  others: f => othersHead({ waiting: f.others.others.filter(r => r.kind === 'waiting').length, working: f.others.others.filter(r => r.kind === 'working').length, total: f.others.others.length, needs: f.view.needs.length }, tr),
  // Times, not kinds: every compact and every action counts; a warning is a row of the card but not an action, so it is not counted
  autopilot: f => autopilotHead(autoCount(f), tr),
  // The same rows the Agents card shows (its scope, running and the last hour)
  agents: f => agentsHead(f.agents.head, tr),
  computer: f => computerHead({ gaugeOn: f.comp.gaugeOn, room: f.comp.room }, tr),
  proof: f => proofHead(proofFacts(f.prefs.proof), tr),
  guard: f => guardHead(BLOCKS.map(b => f.prefs.values[SETTING_KEY[b]] ?? 'warn'), tr, f.prefs.guardWarn, glanceFits(f.lines.card('guard').title, f.widthPt)),
  skills: f => skillsHead(f.prefs.skills === undefined ? 0 : usedCount(f.prefs.skills.counts, f.view.now ?? 0), tr, repeatMem.offer !== undefined),
  prs: f => prsHead(prsHeadFacts(f), tr),
  // The open card's count and phrase ("2 things block it"): the rows it lists, with the Checks and Pull requests homes folded the same way
  ship: f => {
    const facts = shipFactsOf(f)
    const blocks = shownBlocks(facts, s => s)
    const verdict = shipVerdict(facts, blocks)
    return shipHead(verdict, blocks.length, tr, verdict === 'ready' && (prUnchecked(facts) || prOff(facts)), f.lines.ctx.noGit === true)
  },
  back: f => backHead(f.lines.ctx.back?.open.length ?? 0, tr, backWaiting(f.lines.ctx.back)),
  safety: f => {
    const s = safetyFacts(f.lines.ctx)
    return safetyHead({ halted: s.halted, held: s.held }, tr)
  },
  // Lines not checked say their count ("3 not checked", Swedish "3 okontrollerade"): short enough that the dot keeps its word at 288 pt
  context: f => {
    const c = f.lines.ctx.context
    const loud = contextLoud(c)
    return loud === 'unverified' && c !== undefined ? t('context.n_not_checked', { n: c.brief.unverified }) : contextHead({ loud, goodMoment: c?.keep.rest?.ready === true, noFile: c?.diet?.files === 0, unread: c?.diet === undefined }, tr)
  },
  preview: f => previewHead(f.lines.ctx.preview === undefined ? { state: 'none', changed: false } : { state: previewState(f.lines.ctx.preview), changed: f.lines.ctx.preview.changed }, tr),
  setup: f => setupHead(setupLoud(f.lines.ctx.setup), tr, setupApplyOn(f.lines.ctx.setup?.values ?? {})),
  do: f => doHead({ on: f.lines.ctx.doc === undefined || f.lines.ctx.doc.mode !== 'off', blocks: f.lines.ctx.doc?.blocks.filter(b => b.verdict !== 'blocked').length ?? 0 }, tr),
}

export const headlineOf = (id: CardId, f: GlanceFacts): string => HEADLINES[id](f)

// What the Pull requests rows show: the open ones, then the worktree rows (core/prcard.ts copyRows)
const prsHeadFacts = (f: GlanceFacts): PrsHeadFacts => {
  const p = f.prefs.prs
  return { on: p?.on ?? false, open: p?.rows.length ?? 0, ...(p?.copies === undefined ? {} : { copies: { merged: p.copies.merged.length, idle: p.copies.idle.length } }), ...(p?.look === true ? { unknown: 'look' as const } : p?.noGit !== undefined ? { unknown: 'nogit' as const } : {}) }
}

function shipFactsOf(f: GlanceFacts): ShipFacts {
  const homes = f.lines.ctx.homes
  return { ...(f.prefs.proof === undefined ? {} : { proof: f.prefs.proof }), ledger: f.prefs.ledger, ...(f.view.counts === undefined ? {} : { counts: f.view.counts }), now: f.view.now ?? 0, ...(f.prefs.prs === undefined ? {} : { prs: f.prefs.prs }), ...(homes?.prs === true ? { prsHome: true } : {}), ...(homes?.proof === true ? { proofHome: true } : {}) }
}
// Amber only for a real failure: a check that failed, or this session's own pull request failing. Stale checks, claims, changes to look at and a changed Preview are the normal dot with their word
const failsHere = (f: GlanceFacts): boolean => proofFacts(f.prefs.proof).failed > 0 || mineFailing(f)
const mineFailing = (f: GlanceFacts): boolean => (f.prefs.prs?.rows ?? []).some(r => r.mine && r.checks === 'failing')
const previewBroken = (f: GlanceFacts): boolean => f.lines.ctx.preview !== undefined && previewState(f.lines.ctx.preview) !== 'up' && previewState(f.lines.ctx.preview) !== 'none'
// The gauge is on and no usable reading is in yet (the card says "Reading the computer…")
const computerReading = (f: GlanceFacts): boolean => f.comp.gaugeOn && f.comp.room === undefined
const SOFT: Partial<Record<CardId, (f: GlanceFacts) => boolean>> = { ship: failsHere, prs: mineFailing, preview: previewBroken }

// Only the dot changes: the card's loudness, and so its place in Problems first, stays as it was.
// Other sessions does not: a session that asks is the band's and Needs you's fact alone
export const pointsAtNeeds = (id: CardId, f: GlanceFacts): boolean => id === 'here' && f.view.here !== undefined && f.hereWaits === true
// This session's calm dot says the session's own state
// Plan limits: amber only when a limit is used up and the sessions wait (its word "Used up · resets 13:40", usedUpWord); from LIMIT_HOT_PCT the normal dot, its word "Near the limit"; calm below
const limitDot = (f: GlanceFacts): GlanceDot => {
  const fresh = limitBlocks(f.view)
  if (fresh.some(usedUp) && f.view.usage?.extra?.enabled !== true) return 'amber'
  return fresh.some(b => b.percent >= LIMIT_HOT_PCT) ? 'accent' : 'neutral'
}
// Safety: amber only for a pause that Needs you does not carry (the card is in sight with its Resume); stopped steps wait in Needs you, so their count is the normal dot
const safetyDot = (f: GlanceFacts): GlanceDot => {
  const s = safetyFacts(f.lines.ctx)
  if (s.halted) return haltShows(newsFactsOf(f.prefs, f.view.now ?? 0)) ? 'accent' : 'amber'
  return s.held > 0 ? 'accent' : 'neutral'
}
export const glanceDotOf = (id: CardId, f: GlanceFacts, loud: Loud): GlanceDot => {
  if (pointsAtNeeds(id, f)) return 'amber'
  if (id === 'limit') return limitDot(f)
  if (id === 'safety') return safetyDot(f)
  const dot = glanceDot(loud)
  // Agents never wait on the person: a failure is the plain ring with its words in the red state colour ("1 failed", as a failed row), an agent with no progress the grey dot with its own ("No progress for 11 min")
  const head = f.agents?.head
  if (id === 'agents' && head !== undefined) return (head.failed ?? 0) > 0 || head.stuck > 0 ? 'neutral' : dot === 'amber' ? 'accent' : dot
  // Memory and notes never waits on the person: heavy files or a claim not checked is the normal dot with its word ("Heavy files")
  if (id === 'context') return dot === 'amber' ? 'accent' : dot
  // The computer never waits on the person: no room is the normal dot with its word ("No room for another agent"); before a usable reading the plain ring, "Reading"
  if (id === 'computer') return computerReading(f) ? 'neutral' : dot === 'amber' ? 'accent' : dot
  const soft = SOFT[id]
  if (soft !== undefined && dot === 'amber' && !soft(f)) return 'accent'
  const kind = f.view.here?.kind
  if (id !== 'here' || dot !== 'accent' || kind === undefined) return dot
  return kind === 'idle' ? 'neutral' : kind === 'needs' ? 'amber' : 'accent'
}

const autoCount = (f: GlanceFacts): number => f.auto.today.count + f.auto.acts.reduce((n, d) => n + d.n, 0)

export const GLANCE_TITLES: Record<'limit' | 'here' | 'others' | 'autopilot', string> = { limit: 'Plan limits', here: 'This session', others: 'Other sessions', autopilot: 'Autopilot' }

// This session's state word: Needs you while its own step waits for you
const hereState = (f: GlanceFacts): string => stateWord(f.hereWaits === true || f.view.here?.kind === undefined ? 'needs' : f.view.here.kind)

// The amber Plan limits dot says what happened, not "Needs you": "Used up · resets 13:40" (of two used up limits, the one that resets last is the wait, as the band's line)
const usedUpWord = (f: GlanceFacts): string => {
  const wait = limitBlocks(f.view).filter(b => usedUp(b) && b.reset !== '').reduce<LimitBlock | undefined>((a, b) => (a === undefined || Date.parse(b.resetsAt ?? '') > Date.parse(a.resetsAt ?? '') ? b : a), undefined)
  return wait === undefined ? tr('Used up') : `${tr('Used up')} · ${resetSaid(wait.reset, tr)}`
}
// The dot's word says its reason: a This session dot that is amber only because the context fills says "Context nearly full", not "Needs you".
// The headline's short form is the state alone, so a narrow row keeps a word beside its dot.
export const glanceWordOf = (id: CardId, f: GlanceFacts, loud: Loud): { word?: string; short?: string; failed?: boolean } => {
  if (id === 'limit') return limitDot(f) === 'accent' ? { word: tr('Near the limit') } : limitDot(f) === 'amber' ? { word: usedUpWord(f) } : {}
  if (id === 'context') return glanceDotOf(id, f, loud) === 'accent' ? { word: headlineOf(id, f) } : {}
  if (id === 'computer') return computerReading(f) ? { word: tr('Reading') } : f.comp.room?.n === 0 ? { word: headlineOf(id, f) } : {}
  // A worktree count keeps a short word where the row is narrow ("1 to remove")
  if (id === 'prs') {
    const short = prsShortHead(prsHeadFacts(f), tr)
    return { ...(glanceDotOf(id, f, loud) === 'accent' ? { word: headlineOf(id, f) } : {}), ...(short === undefined ? {} : { short }) }
  }
  // The normal dot of a check card says its word ("Not checked", "2 things block it", "Changed"), never the bare "Active"
  if (SOFT[id] !== undefined || id === 'proof') return glanceDotOf(id, f, loud) === 'accent' ? { word: headlineOf(id, f) } : {}
  // The routine offer is the card's lead: its dot says it
  if (id === 'skills') return repeatMem.offer !== undefined && glanceDotOf(id, f, loud) === 'accent' ? { word: headlineOf(id, f) } : {}
  if (id === 'agents') {
    const short = agentsShort(f.agents.head, tr)
    const failed = (f.agents.head.failed ?? 0) > 0
    const word = f.agents.head.stuck > 0 || failed ? { word: headlineOf(id, f) } : {}
    return { ...word, ...(short === undefined ? {} : { short }), ...(failed ? { failed: true } : {}) }
  }
  // A narrow row keeps "Paused" beside its dot
  if (id === 'safety') return safetyFacts(f.lines.ctx).halted ? { word: tr('Paused'), short: tr('Paused') } : glanceDotOf(id, f, loud) === 'accent' ? { word: tr('Stopped') } : {}
  // Autopilot's dot always has a word: "Nothing today" is "None" where the row is narrow, and the flip side says it too
  if (id === 'autopilot') return { short: autoCount(f) > 0 ? headlineOf(id, f) : tr('None') }
  if (id !== 'here' || f.view.here === undefined) return {}
  const short = tr(hereState(f))
  if (pointsAtNeeds(id, f) || f.view.here.kind === 'needs' || glanceDotOf(id, f, loud) !== 'amber') return { short }
  return { word: tr('Context nearly full'), short }
}
