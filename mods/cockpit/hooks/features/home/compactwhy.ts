// "Why not now?" on the This session card and in /vaken-compact why: what Auto really waits for, from the same checks it runs (core/compactrest.ts), in plain words.
import { DEFAULT_AFTER_TOKENS, DEFAULT_SUMMARY_OUT, paybackTurns, ttlOrGuess } from '../../core/compactmoment'
import type { Extra } from '../../core/compactmoment'
import { CACHE_MARGIN_MS, breakAtMs, busyFromOf, fromNow, leadMsOf, minTokensOf, PAYBACK_MAX_TURNS } from '../../core/compactauto'
import { WAIT_ANSWERING, WAIT_ASKS, WAIT_HELPERS, WAIT_GUARD, WAIT_GAP, WAIT_PAYBACK, WAIT_GAVE_UP, READY_SIZE, READY_SIZE_APP, READY_BREAK, RULE_WARM, RULE_COLD, RULE_NOPLAN, RULE_BUSY } from '../../core/compactwords'
import { helpersOpen, restChecks, restTrigger } from '../../core/compactrest'
import type { RestFacts } from '../../core/compactrest'
import { workSaved } from '../../core/compactscore'
import { lastAfterTokens, lastSummaryOut } from '../../core/cachefacts'
import { isOpenHold } from '../../core/inbox'
import { tr } from '../../core/lang'
import { giveUpMinOf } from '../compaction'
import type { Prefs } from './prefs'
import { fromOf } from '../../core/compactnudge'
import type { Row } from './logic'

export function extraOf(prefs: Pick<Prefs, 'proof' | 'agents' | 'sid' | 'checkpoints'> & { values?: Record<string, string> }): Extra {
  const helpers = (prefs.agents ?? []).filter(r => r.state === 'running' && r.session === prefs.sid.slice(0, 8)).length
  const checkpointAt = (prefs.checkpoints ?? []).reduce<number | undefined>((m, c) => (m === undefined || c.at > m ? c.at : m), undefined)
  return { ...(prefs.values?.['compact.from'] === undefined ? {} : { from: fromOf(prefs.values['compact.from']) }), ...(prefs.proof === undefined ? {} : { proof: prefs.proof }), helpers, saved: workSaved(prefs.proof, checkpointAt) }
}

type WhyPrefs = Pick<Prefs, 'agents' | 'sid' | 'inbox'> & { values?: Record<string, string> }

// The facts Auto's checks need, as far as the pane knows them (a background command is not on the pane, so it counts as none)
export function whyFacts(row: Row, ttlMs: number | undefined, now: number | undefined, prefs: WhyPrefs): RestFacts {
  const rec = row.rec
  const ttl = ttlOrGuess(ttlMs)
  const lastCompact = (rec.compacts ?? []).reduce((m, c) => Math.max(m, c.at), 0)
  const cacheLeftMs = rec.cache?.at === undefined || now === undefined ? undefined : ttl - (now - rec.cache.at)
  const tokens = rec.ctx?.tokens
  const running = (prefs.agents ?? []).filter(r => r.state === 'running' && r.session === prefs.sid.slice(0, 8))
  const agentsRunning = running.length
  return {
    turnEnded: row.kind !== 'working',
    waitsForYou: row.kind === 'needs' || rec.ask !== undefined,
    agentsRunning,
    foregroundAgents: running.filter(r => r.background === false).length,
    backgroundRecent: 0,
    guardHeld: prefs.inbox.some(it => it.here && isOpenHold(it)),
    from: fromOf(prefs.values?.['compact.from']),
    minTokens: minTokensOf(prefs.values?.['compact.min'], rec.ctx?.window),
    ...(tokens === undefined ? {} : { tokens }),
    ...(rec.contextPercent === undefined ? {} : { percent: rec.contextPercent }),
    ...(tokens === undefined ? {} : { payback: paybackTurns({ tokens, after: lastAfterTokens(rec.compacts) ?? DEFAULT_AFTER_TOKENS, out: lastSummaryOut(rec.compacts) ?? DEFAULT_SUMMARY_OUT, warm: (cacheLeftMs ?? 0) > 0, ttlMs: ttl }) }),
    quietMs: row.kind === 'waiting' || row.kind === 'idle' ? row.sinceMs : 0,
    breakAtMs: breakAtMs(ttl, leadMsOf(prefs.values?.['compact.lead'])),
    ...(cacheLeftMs === undefined ? {} : { cacheLeftMs }),
    ttlKnown: ttlMs !== undefined,
    ...(lastCompact === 0 || now === undefined ? {} : { sinceCompactMs: now - lastCompact }),
  }
}

const k = (n: number | undefined): string => (n === undefined ? '?' : n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))
const fill = (text: string, vars: Record<string, string | number>): string => Object.entries(vars).reduce((s, [name, v]) => s.replace(`{${name}}`, String(v)), text)

// The first thing that holds Auto back, or the rule when only time or size is missing
export function whyNotNow(row: Row | undefined, ttlMs: number | undefined, now: number | undefined, prefs: WhyPrefs, say: (s: string) => string = s => s): string | undefined {
  if (row === undefined) return undefined
  const f = whyFacts(row, ttlMs, now, prefs)
  const gaveUp = now === undefined ? 0 : giveUpMinOf(prefs.sid, now)
  if (gaveUp > 0) return fill(say(WAIT_GAVE_UP), { n: gaveUp })
  const open = new Set(restChecks(f).filter(c => !c.ok).map(c => c.id))
  const mins = Math.max(0, Math.round((f.sinceCompactMs ?? 0) / 60_000))
  if (open.has('ended')) return say(f.turnEnded ? WAIT_ASKS : WAIT_ANSWERING)
  if (open.has('helpers')) return say(WAIT_HELPERS)
  if (open.has('guard')) return say(WAIT_GUARD)
  if (open.has('gap')) return say(WAIT_GAP).replace('{n}', String(mins))
  const pct = f.percent === undefined ? '?' : String(Math.round(f.percent))
  if (open.size === 0) {
    const kind = restTrigger(f)
    const app = row.rec.ctx?.compactAt
    return kind === 'size' ? fill(say(app === undefined ? READY_SIZE : READY_SIZE_APP), { from: helpersOpen(f) ? busyFromOf(f.from ?? 0) : (f.from ?? 0), pct, ...(app === undefined ? {} : { app: Math.round(app) }) }) : say(READY_BREAK)
  }
  const from = f.from ?? 0
  const busy = helpersOpen(f)
  if (!open.has('size') && f.percent !== undefined && f.percent >= fromNow({ from, busy }) && f.payback !== undefined && f.payback > PAYBACK_MAX_TURNS) return say(WAIT_PAYBACK)
  const warm = f.cacheLeftMs !== undefined && f.cacheLeftMs >= CACHE_MARGIN_MS
  return fill(say(busy ? RULE_BUSY : !f.ttlKnown ? RULE_NOPLAN : warm ? RULE_WARM : RULE_COLD), { from, busy: busyFromOf(from), pct, m: Math.round(f.breakAtMs / 60_000), min: k(f.minTokens), tok: k(f.tokens) })
}

export const whyNotNowTr = (row: Row | undefined, ttlMs: number | undefined, now: number | undefined, prefs: WhyPrefs): string | undefined => whyNotNow(row, ttlMs, now, prefs, tr)
