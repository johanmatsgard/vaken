// The Where was I card's facts (core/backcard.ts)
import type { BackFacts } from '../../core/backcard'
import type { Prefs } from './prefs'
import type { View } from './logic'

export function backFactsOf(view: View, prefs: Prefs): BackFacts {
  const now = view.now ?? 0
  const rec = view.here?.rec
  return {
    now,
    ...(rec === undefined || rec.state === 'working' ? {} : { gapMs: Math.max(0, now - rec.lastEventAt) }),
    ...(prefs.proof?.goal === undefined ? {} : { goal: prefs.proof.goal.text }),
    ...(rec?.branch === undefined ? {} : { branch: rec.branch }),
    ...(rec?.contextPercent === undefined ? {} : { contextPercent: rec.contextPercent }),
    open: prefs.calm?.open ?? [],
    more: prefs.calm?.more ?? 0,
    ...(prefs.calm?.away === undefined ? {} : { away: prefs.calm.away }),
  }
}
