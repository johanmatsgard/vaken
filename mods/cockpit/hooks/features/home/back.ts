// The Where was I card's facts (core/backcard.ts)
import { BACK_AWAY_MS } from '../../core/backcard'
import type { BackFacts } from '../../core/backcard'
import { nextMem } from '../../core/actions'
import { shellFail } from '../../core/errors'
import { isOpenHold } from '../../core/inbox'
import { runNeeds } from '../../core/welcome'
import { nightLead, nightMem } from '../../core/night'
import type { WelcomeFacts } from '../../core/welcome'
import { rowItems } from './needs'
import type { Prefs } from './prefs'
import type { View } from './logic'

// From memory and what the pane already read: no store read of its own.
export function welcomeFactsOf(view: View, prefs: Prefs): WelcomeFacts | undefined {
  if (prefs.values?.['recap.mode'] === 'off') return undefined
  const holds = rowItems(prefs.inbox ?? []).filter(it => it.kind === 'hold')
  const at = holds.findIndex(it => it.here && isOpenHold(it))
  const hold = holds[at]
  const run = runNeeds(prefs.run, view.now ?? 0, BACK_AWAY_MS)
  const end = nextMem.busy ? undefined : nextMem.end
  const night = nightLead(prefs.report, view.now ?? 0, nightMem.lastPrompt, BACK_AWAY_MS)
  return {
    ...(end === undefined ? {} : { end }),
    edits: nextMem.facts.edits,
    ...(end === 'failed' && shellFail.failed && shellFail.kind !== undefined ? { kind: shellFail.kind } : {}),
    ...(hold === undefined ? {} : { holdKey: `needs:hold-${hold.sid}-${at}` }),
    ...(run === undefined ? {} : { run }),
    ...(night === undefined ? {} : { night }),
    ...(nightMem.promises.length === 0 ? {} : { promises: nightMem.promises }),
  }
}

export function backFactsOf(view: View, prefs: Prefs): BackFacts {
  const now = view.now ?? 0
  const rec = view.here?.rec
  const welcome = welcomeFactsOf(view, prefs)
  return {
    now,
    ...(rec === undefined || rec.state === 'working' ? {} : { gapMs: Math.max(0, now - rec.lastEventAt) }),
    ...(prefs.proof?.goal === undefined ? {} : { goal: prefs.proof.goal.text }),
    ...(rec?.branch === undefined ? {} : { branch: rec.branch }),
    open: prefs.calm?.open ?? [],
    more: prefs.calm?.more ?? 0,
    ...(prefs.calm?.away === undefined ? {} : { away: prefs.calm.away }),
    ...(welcome === undefined ? {} : { welcome }),
  }
}
