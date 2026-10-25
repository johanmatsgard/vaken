// The chat answer of /vaken on the Mac. The pane opens at the same moment, so the answer holds only the hot facts: what needs the person,
// what is running, and a real problem (a card at warn or urgent). Calm is one short line. Every line in the person's language.
import { arbitrate, liveItems, markOf, marked } from '../../core/band'
import { bandWords } from '../../core/happened'
import { mdList } from '../../core/chatmd'
import { fmt } from '../../core/fmt'
import { langNow, t, tr } from '../../core/lang'
import { explainCmd } from '../../core/whatis'
import { splitAgents } from '../../core/agentboard'
import { failedTasks } from '../../core/orchestra'
import { backShort } from '../../core/backcard'
import { contextView } from '../../core/contextcard'
import { previewShort, previewShown } from '../../core/previewcard'
import { prsShort } from '../../core/prcard'
import { safetyShort } from '../../core/safetycard'
import { setupShort } from '../../core/setupcard'
import { shipBlocks, shipShort, shipVerdict } from '../../core/shipcard'
import { CARD_IDS, LIMIT_HOT_PCT, ageWord, cardLabel, limitBlocks, reasonWords, resetSaid } from './logic'
import type { CardId, Loud, View } from './logic'
import type { Prefs } from './prefs'
import { backFactsOf } from './back'
import { contextFactsOf } from './context'
import { previewFactsOf } from './preview'
import { safetyFactsOf } from './safety'
import { setupFactsOf } from './setup'
import { safetyFacts } from './linecards'
import { startTaskText } from './starttask'

const hot = (l: Loud | undefined): boolean => l === 'urgent' || l === 'warn'
const said = (line: string, cmd: string): string => `${line} · ${cmd}`

// The band's lines that warn (an info line is not hot, so it is neither said nor counted): each with its band mark (▲), as the band says it
function nowLine(view: View): string | undefined {
  const strong = liveItems(view.band ?? [], view.now ?? 0).filter(x => x.level !== 'info')
  const { shown } = arbitrate(strong, view.now ?? 0)
  if (shown.length === 0) return undefined
  const words = shown.map(x => marked(markOf(x), bandWords(x, tr))).join(' · ')
  const rest = strong.length - shown.length
  return said(`${tr('Now')}: ${words}${rest > 0 ? ` · ${tr('and {n} more').replace('{n}', String(rest))}` : ''}`, explainCmd('band'))
}

// One builder per card that can be hot; each gives its lines only when its card warns
function cardLines(id: CardId, view: View, prefs: Prefs, louds: Record<CardId, Loud>): string[] {
  const now = view.now ?? 0
  const lang = langNow()
  switch (id) {
    case 'limit': {
      if (!hot(louds.limit)) return []
      const blocks = limitBlocks(view)
      const over = blocks.filter(b => b.percent >= LIMIT_HOT_PCT)
      // Each limit by its card name ("5-hour limit", "Week", "Week · Fable"), as the Plan limits card and the Glance headline
      return (over.length > 0 ? over : blocks.slice(0, 1)).map(b => said(`${tr('{name}: {pct} used').replace('{name}', cardLabel(b, tr)).replace('{pct}', fmt.usedIn(b.percent, lang))}${b.reset === '' ? '' : `, ${resetSaid(b.reset, tr)}`}`, explainCmd('limits')))
    }
    case 'here': {
      if (view.here === undefined || view.hereWaits !== undefined) return []
      const pct = view.here.rec.contextPercent
      return hot(louds.here) && pct !== undefined ? [said(`${tr('This session')}: ${tr('Context {n}% used').replace('{n}', String(Math.round(pct)))}`, explainCmd('session'))] : []
    }
    case 'others':
      return [
        ...view.waiting.map(r => said(`○ ${tr('Your turn')}: ${r.name} (${ageWord(r.sinceMs, tr)})`, explainCmd('yourturn'))),
        ...view.working.map(r => said(`● ${tr('Working')}: ${r.name}`, explainCmd('working'))),
      ]
    case 'agents': {
      const running = splitAgents(prefs.agents ?? [], now).running.length
      const failed = failedTasks(prefs.run)
      const stuck = (prefs.agents ?? []).filter(r => r.state === 'running' && r.quietAt !== undefined).length
      const parts = [
        ...(running > 0 ? [tr('{n} running').replace('{n}', String(running))] : []),
        ...(failed > 0 ? [tr('{n} failed').replace('{n}', String(failed))] : []),
        ...(stuck > 0 ? [t('chat.agents_quiet', { n: stuck })] : []),
      ]
      return [...(parts.length === 0 ? [] : [said(`${tr('Agents')}: ${parts.join(', ')}`, explainCmd('agents'))]), ...startTaskText(prefs)]
    }
    case 'computer':
      return hot(louds.computer) ? [said(`${tr('Computer')}: ${t('chat.computer_full')}`, explainCmd('computer'))] : []
    case 'safety': {
      if (!hot(louds.safety)) return []
      const f = safetyFacts({ now, ledger: prefs.ledger, ...(view.counts === undefined ? {} : { counts: view.counts }), halted: prefs.halted, modes: {}, safety: safetyFactsOf(prefs) })
      return [said(`${tr('Safety')}: ${safetyShort(f, tr)}`, '/vaken-pause status')]
    }
    case 'ship': {
      if (!hot(louds.ship)) return []
      const f = { ...(prefs.proof === undefined ? {} : { proof: prefs.proof }), ledger: prefs.ledger, ...(view.counts === undefined ? {} : { counts: view.counts }), now, ...(prefs.prs === undefined ? {} : { prs: prefs.prs }) }
      const blocks = shipBlocks(f, tr)
      return [said(`${tr('Ship')}: ${shipShort(shipVerdict(f, blocks), blocks.length, tr)}`, '/vaken-ship')]
    }
    case 'back': {
      const f = backFactsOf(view, prefs)
      return hot(louds.back) && f !== undefined ? [said(`${tr('Where was I')}: ${backShort(f, tr)}`, '/vaken-today recap')] : []
    }
    case 'context':
      return hot(louds.context) ? [said(`${tr('Memory and notes')}: ${contextView(contextFactsOf(view, prefs), tr, lang).short}`, '/vaken-help run diet')] : []
    case 'preview': {
      const f = previewFactsOf(prefs)
      return hot(louds.preview) && f !== undefined && previewShown(f) ? [`${tr('Preview')}: ${previewShort(f, tr)}`] : []
    }
    case 'setup': {
      const f = setupFactsOf(prefs)
      return hot(louds.setup) && f !== undefined ? [said(`${tr('Agent setup')}: ${setupShort(f, tr)}`, '/vaken-help run setup')] : []
    }
    case 'prs':
      return hot(louds.prs) && prefs.prs !== undefined ? [said(`${tr('Pull requests')}: ${prsShort(prefs.prs, tr, now)}`, '/vaken-ship pr')] : []
    default:
      return []
  }
}

export function chatReply(view: View, prefs: Prefs, louds: Record<CardId, Loud>, order: readonly CardId[]): string {
  // This session waiting for you (a pause, a stopped step) is a Needs you fact, said even with its card hidden
  const here = view.here === undefined || view.hereWaits === undefined ? [] : [said(`◆ ${(view.hereWaits === 'halt' ? t('chat.here_paused') : t('chat.here_stopped'))}`, explainCmd('session'))]
  const needs = view.needs.map(r => said(`◆ ${t('chat.needs_row', { name: r.name, why: reasonWords(r.reason, tr), age: ageWord(r.sinceMs, tr) })}`, explainCmd('needs')))
  const band = nowLine(view)
  const cards = [...order, ...CARD_IDS.filter(c => !order.includes(c))].filter(id => !prefs.hidden.includes(id)).flatMap(id => cardLines(id, view, prefs, louds))
  const lines = [...here, ...needs, ...(band === undefined ? [] : [band]), ...cards]
  return lines.length === 0 ? t('chat.calm') : mdList(lines)
}
