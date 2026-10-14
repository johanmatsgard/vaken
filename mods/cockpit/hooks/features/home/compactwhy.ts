// "Why not now?" on the This session card and in /vaken-compact why: the first thing that stops a compaction, in plain words, and the score.
import { scoreOf } from '../../core/compactmoment'
import type { Extra } from '../../core/compactmoment'
import { AUTO_AT, COMPACT_FROM_PCT, workSaved } from '../../core/compactscore'
import { notYetWords } from '../../core/compactwords'
import { tr } from '../../core/lang'
import type { Prefs } from './prefs'
import { fromOf } from '../../core/compactnudge'
import { hereFacts } from './logic'
import type { Row } from './logic'

export function extraOf(prefs: Pick<Prefs, 'proof' | 'agents' | 'sid' | 'checkpoints'> & { values?: Record<string, string> }): Extra {
  const helpers = (prefs.agents ?? []).filter(r => r.state === 'running' && r.session === prefs.sid.slice(0, 8)).length
  const checkpointAt = (prefs.checkpoints ?? []).reduce<number | undefined>((m, c) => (m === undefined || c.at > m ? c.at : m), undefined)
  return { ...(prefs.values?.['compact.from'] === undefined ? {} : { from: fromOf(prefs.values['compact.from']) }), ...(prefs.proof === undefined ? {} : { proof: prefs.proof }), helpers, saved: workSaved(prefs.proof, checkpointAt) }
}

export function whyNotNow(row: Row | undefined, ttlMs: number | undefined, now: number | undefined, extra: Extra, say: (s: string) => string = s => s): string | undefined {
  if (row === undefined) return undefined
  const f = hereFacts(row, ttlMs, now, extra)
  return notYetWords(scoreOf(f), { auto: AUTO_AT, minPct: extra.from ?? COMPACT_FROM_PCT }, f.percent, say)
}

export const whyNotNowTr = (row: Row | undefined, ttlMs: number | undefined, now: number | undefined, extra: Extra): string | undefined => whyNotNow(row, ttlMs, now, extra, tr)
