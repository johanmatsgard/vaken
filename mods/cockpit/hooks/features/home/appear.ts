// The cards that stay out of the way until they have something to show (core/cardrules.ts holds the rules).
import { backHasNews } from '../../core/backcard'
import { APPEARS, arrivals, autoHidden, cardsDefault, newToast, startHistory } from '../../core/cardrules'
import type { AppearFacts } from '../../core/cardrules'
import { capMaxOf } from '../../core/agentcap'
import { roomOf } from '../../core/computer'
import { tr } from '../../core/lang'
import type { Io } from '../../core/io'
import { contextLoud } from '../../core/contextcard'
import { GUARD_WHATS } from '../../core/guard'
import { startOfDay } from '../../core/ledger'
import { prsLoud } from '../../core/prcard'
import { frontEdits } from '../../core/previewcard'
import { doCount, doModeOf } from '../../core/phonedo'
import { setupLoud } from '../../core/setupcard'
import { shipLoud } from '../../core/shipcard'
import { backFactsOf } from './back'
import { contextFactsOf } from './context'
import { lineCard } from './linecards'
import { CARD_IDS } from './logic'
import type { CardId, View } from './logic'
import { proofFact } from './loud'
import { FIRST_RUN_KEY, PREF_LISTS, parseLists } from './prefs'
import type { ListPrefs, Prefs } from './prefs'
import { setupFactsOf } from './setup'

export function appearFacts(view: View, prefs: Prefs): AppearFacts {
  const now = view.now ?? 0
  const agents = prefs.agents ?? []
  const load = { running: agents.filter(r => r.state === 'running').length, max: capMaxOf(prefs.values['cap.max']), capOn: (prefs.values['cap.mode'] ?? 'warn') !== 'off' }
  const room = roomOf(prefs.laptop, load, now)
  return {
    proof: proofFact(prefs.proof),
    guardToday: prefs.ledger.filter(e => GUARD_WHATS.includes(e.what) && e.at >= startOfDay(now)).length,
    agents: agents.length > 0 || prefs.run !== undefined || (prefs.idle ?? []).length > 0,
    computer: { gaugeOn: prefs.values['laptop.mode'] === 'on', full: room !== undefined && room.n === 0 && room.by !== 'limit' },
    skillsUsed: prefs.skills !== undefined && lineCard('skills', { now, ledger: [], halted: false, modes: {}, skills: prefs.skills }).groups !== undefined,
    prs: prsLoud(prefs.prs),
    ship: shipLoud({ ...(prefs.proof === undefined ? {} : { proof: prefs.proof }), ledger: prefs.ledger, ...(view.counts === undefined ? {} : { counts: view.counts }), now, ...(prefs.prs === undefined ? {} : { prs: prefs.prs }) }),
    back: backHasNews(backFactsOf(view, prefs)),
    context: contextLoud(contextFactsOf(view, prefs)),
    preview: prefs.devServer !== undefined || frontEdits.n > 0,
    setup: setupLoud(setupFactsOf(prefs)),
    commands: doModeOf(prefs.values['do.mode']) === 'off' ? 0 : doCount(),
  }
}

export const autoHiddenCards = (view: View, prefs: Prefs): CardId[] => autoHidden(CARD_IDS, prefs.values, appearFacts(view, prefs))

// The session start makes the history once, if there is none: a write at the start
export async function seedCardHistory(i: Io): Promise<void> {
  try {
    const lists = parseLists(await i.get(PREF_LISTS))
    if (lists.seen !== undefined) return
    await i.set(PREF_LISTS, { ...lists, seen: startHistory(Object.keys(APPEARS), (await i.get(FIRST_RUN_KEY)) === 'done') })
  } catch {
  }
}

export async function announceNew(i: Io, view: View, prefs: Prefs, autoOff: readonly CardId[]): Promise<ListPrefs> {
  const lists = prefs.lists
  try {
    const appearing = CARD_IDS.filter(id => APPEARS[id] !== undefined && (prefs.values[`cards.${id}`] ?? cardsDefault(id)) === 'auto' && !autoOff.includes(id))
    const { next, announce } = arrivals(appearing, lists.seen)
    if (next === undefined) return lists
    const kept: ListPrefs = { ...lists, seen: next }
    await i.set(PREF_LISTS, kept)
    if (announce.length > 0) i.toast(newToast(announce.map(id => tr(cardTitle(id, view, prefs))), tr))
    return kept
  } catch {
    return lists
  }
}

function cardTitle(id: string, view: View, prefs: Prefs): string {
  if (id === 'agents') return 'Agents'
  if (id === 'computer') return 'Computer'
  try {
    return lineCard(id as Parameters<typeof lineCard>[0], { now: view.now ?? 0, ledger: prefs.ledger, halted: false, modes: {} }).title
  } catch {
    return id
  }
}
