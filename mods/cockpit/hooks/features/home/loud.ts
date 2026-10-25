// Problems first: how loud each card is, from what the pane already loaded (no store read), and the order the cards take from it.
import { GUARD_WHATS } from '../../core/guard'
import { failedTasks } from '../../core/orchestra'
import { startOfDay, didToday, todaySummary } from '../../core/ledger'
import { relevantKinds, statusOf } from '../../core/proof'
import type { ProofState } from '../../core/proof'
import { roomOf } from '../../core/computer'
import { prsLoud } from '../../core/prcard'
import { backLoud } from '../../core/backcard'
import { contextLoud } from '../../core/contextcard'
import { safetyLoud } from '../../core/safetycard'
import { shipLoud } from '../../core/shipcard'
import { previewLoud } from '../../core/previewcard'
import { doLoud } from '../../core/docard'
import { setupLoud } from '../../core/setupcard'
import { isGroupOrder } from '../../core/cardhome'
import { ACTIVE_FOR_MS, allOthers, cardLoudness, limitBlocks, problemsFirst, problemsFirstInGroups } from './logic'
import type { CardId, Loud, LoudFacts, View } from './logic'
import type { Bucket } from './layouts'
import type { Prefs } from './prefs'
import { linesModel } from './cards/lines'
import type { LinesModel } from './cards/lines'

export const proofFact =(p: ProofState | undefined): LoudFacts['proof'] => {
  if (p === undefined || (p.turns === 0 && p.receipts.length === 0 && p.goal === undefined)) return 'none'
  // Amber only for a real wait: a failed check. Claims with no check are the normal dot with the words "Not checked"
  return relevantKinds(p).some(k => statusOf(p, k) === 'failed') ? 'problem' : 'ok'
}

export function cardLouds(view: View, prefs: Prefs, lines: LinesModel = linesModel(view, prefs)): Record<CardId, Loud> {
  const now = view.now ?? 0
  const guardToday = prefs.ledger.filter(e => GUARD_WHATS.includes(e.what) && e.at >= startOfDay(now))
  const room = roomOf(prefs.laptop, lines.load, now)
  const agents = prefs.agents ?? []
  return cardLoudness(
    {
      limits: limitBlocks(view),
      here: view.here !== undefined,
      ...(view.here?.rec.contextPercent === undefined ? {} : { herePct: view.here.rec.contextPercent }),
      others: allOthers(view).length,
      didToday: todaySummary(prefs.ledger, now, view.counts).count + didToday(prefs.ledger, now, view.counts).length,
      proof: proofFact(prefs.proof),
      agents: { any: agents.length > 0 || prefs.run !== undefined, stuck: agents.some(r => r.state === 'running' && r.quietAt !== undefined), failed: failedTasks(prefs.run) },
      computer: { gaugeOn: prefs.values['laptop.mode'] === 'on', full: room !== undefined && room.n === 0 && room.by !== 'limit' },
      skillsUsed: prefs.skills !== undefined && lines.card('skills').groups !== undefined,
      prs: prsLoud(prefs.prs),
      back: backLoud(lines.ctx.back),
      context: contextLoud(lines.ctx.context),
      preview: previewLoud(lines.ctx.preview),
      setup: setupLoud(lines.ctx.setup),
      do: lines.ctx.doc === undefined ? 'none' : doLoud(lines.ctx.doc),
      safety: safetyLoud({ halted: prefs.halted, heldRecently: guardToday.some(e => e.what.startsWith('Held') && now - e.at < ACTIVE_FOR_MS) }),
      ship: shipLoud({ ...(prefs.proof === undefined ? {} : { proof: prefs.proof }), ledger: prefs.ledger, ...(view.counts === undefined ? {} : { counts: view.counts }), now, ...(prefs.prs === undefined ? {} : { prs: prefs.prs }) }),
    },
    now,
  )
}

export const problemsOn = (prefs: Prefs): boolean => prefs.values['view.problems'] !== 'off' && !prefs.arrange

// An order the person arranged (cards not group by group) is kept exactly as arranged: a problem never moves a card there.
// A width with column lists: column by column, and problems first moves a card only inside its own column.
export function cardOrder(prefs: Prefs, louds: Record<CardId, Loud>, bucket: Bucket = 1): CardId[] {
  const lists = prefs.columnLists?.[bucket]
  if (lists !== undefined) return lists.flatMap(l => (problemsOn(prefs) ? problemsFirst(l, louds) : [...l]))
  const own = prefs.orders[bucket]
  return problemsOn(prefs) && isGroupOrder(own) ? problemsFirstInGroups(own, louds) : [...own]
}

// The calm cards that shrink to their Short look: shown at Full only because the pane is Full (a card the person set to Full with its own More stays Full).
export function shrunkCards(prefs: Prefs, louds: Record<CardId, Loud>, visible: readonly CardId[]): CardId[] {
  if (!problemsOn(prefs)) return []
  return visible.filter(id => louds[id] === 'calm' && prefs.cardDetail[id] === 'explained' && prefs.values[`detail.${id}`] !== 'explained')
}
