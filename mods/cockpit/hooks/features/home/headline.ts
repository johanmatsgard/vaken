// The Glance look's one table: each card id -> the headline value its row shows at the right.
import { BLOCKS, SETTING_KEY } from '../../core/guard'
import { contextLoud } from '../../core/contextcard'
import type { GlanceDot } from '../../core/headline'
import { agentsHead, autopilotHead, backHead, computerHead, contextHead, doHead, glanceDot, guardHead, hereHead, limitHead, othersHead, previewHead, prsHead, proofHead, safetyHead, setupHead, shipHead, skillsHead } from '../../core/headline'
import { previewState } from '../../core/previewcard'
import { relevantKinds, statusOf } from '../../core/proof'
import { setupLoud } from '../../core/setupcard'
import { shipBlocks, shipVerdict } from '../../core/shipcard'
import { TOP_SHOWN, topSkills } from '../../core/skills'
import { tr } from '../../core/lang'
import { safetyFacts } from './linecards'
import { limitAgo, resetSaid, stateWord } from './logic'
import type { CardId, Loud, View } from './logic'
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
  limit: f => limitHead(f.limit.blocks.map(b => ({ short: b.short, percent: b.percent, reset: b.reset === '' ? '' : resetSaid(b.reset, tr) })), tr, glanceFits(GLANCE_TITLES.limit, f.widthPt), limitAgo(f.limit.blocks, tr)),
  here: f => hereHead(f.view.here === undefined ? undefined : f.hereWaits === true ? { state: stateWord('needs') } : { state: stateWord(f.view.here.kind), ...(f.view.here.rec.contextPercent === undefined ? {} : { contextPercent: f.view.here.rec.contextPercent }) }, tr),
  others: f => othersHead({ waiting: f.others.others.filter(r => r.kind === 'waiting').length, working: f.others.others.filter(r => r.kind === 'working').length, total: f.others.others.length, needs: f.view.needs.length }, tr),
  autopilot: f => autopilotHead(f.auto.today.count + f.auto.did.length, tr),
  // The same rows the Agents card shows (its scope, running and the last hour)
  agents: f => agentsHead(f.agents.head, tr),
  computer: f => computerHead({ gaugeOn: f.comp.gaugeOn, room: f.comp.room }, tr),
  proof: f => proofHead(proofFacts(f.prefs.proof), tr),
  guard: f => guardHead(BLOCKS.map(b => f.prefs.values[SETTING_KEY[b]] ?? 'warn'), tr, f.prefs.guardWarn, glanceFits(f.lines.views.guard.title, f.widthPt)),
  skills: f => skillsHead(f.prefs.skills === undefined ? 0 : topSkills(f.prefs.skills.counts, f.view.now ?? 0, TOP_SHOWN).length, tr),
  prs: f => prsHead({ on: f.prefs.prs?.on ?? false, open: f.prefs.prs?.rows.length ?? 0, failing: f.prefs.prs?.rows.filter(r => r.checks === 'failing').length ?? 0 }, tr),
  ship: f => {
    const facts = { ...(f.prefs.proof === undefined ? {} : { proof: f.prefs.proof }), ledger: f.prefs.ledger, ...(f.view.counts === undefined ? {} : { counts: f.view.counts }), now: f.view.now ?? 0, ...(f.prefs.prs === undefined ? {} : { prs: f.prefs.prs }) }
    const blocks = shipBlocks(facts, s => s)
    return shipHead(shipVerdict(facts, blocks), blocks.length, tr)
  },
  back: f => backHead(f.lines.ctx.back?.open.length ?? 0, tr),
  safety: f => {
    const s = safetyFacts(f.lines.ctx)
    return safetyHead({ halted: s.halted, held: s.held }, tr)
  },
  context: f => contextHead({ loud: contextLoud(f.lines.ctx.context), goodMoment: f.lines.ctx.context?.keep.rest?.ready === true }, tr),
  preview: f => previewHead(f.lines.ctx.preview === undefined ? { state: 'none', changed: false } : { state: previewState(f.lines.ctx.preview), changed: f.lines.ctx.preview.changed }, tr),
  setup: f => setupHead(setupLoud(f.lines.ctx.setup), tr),
  do: f => doHead({ on: f.lines.ctx.doc === undefined || f.lines.ctx.doc.mode !== 'off', blocks: f.lines.ctx.doc?.blocks.length ?? 0 }, tr),
}

export const headlineOf = (id: CardId, f: GlanceFacts): string => HEADLINES[id](f)

// Only the dot changes: the card's loudness, and so its place in Problems first, stays as it was.
export const pointsAtNeeds = (id: CardId, f: GlanceFacts): boolean => (id === 'others' && f.others.others.length === 0 && f.view.needs.length > 0) || (id === 'here' && f.view.here !== undefined && f.hereWaits === true)
// This session's calm dot says the session's own state
export const glanceDotOf = (id: CardId, f: GlanceFacts, loud: Loud): GlanceDot => {
  if (pointsAtNeeds(id, f)) return 'amber'
  const dot = glanceDot(loud)
  const kind = f.view.here?.kind
  if (id !== 'here' || dot !== 'accent' || kind === undefined) return dot
  return kind === 'idle' ? 'neutral' : kind === 'needs' ? 'amber' : 'accent'
}

export const GLANCE_TITLES: Record<'limit' | 'here' | 'others' | 'autopilot', string> = { limit: 'Plan limits', here: 'This session', others: 'Other sessions', autopilot: 'Autopilot' }
