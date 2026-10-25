// "Ship it": says whether the work looks ready from the evidence other blocks keep. It never merges or pushes.
import type { Entry } from './ledger'
import { didToday } from './ledger'
import { HELD_WHAT, WARNED_WHAT } from './guard'
import { HELD_WHAT as WORLD_HELD_WHAT, WARNED_WHAT as WORLD_WARNED_WHAT } from './guardworld'
import { HELD_WHAT as BACK_HELD_WHAT, WARNED_WHAT as BACK_WARNED_WHAT } from './guardback'
import type { Confidence } from './proof2'
import { kindWord, relevantKinds, statusOf, statusWord } from './proof'
import type { ProofState } from './proof'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'

type ShipFacts = { proof: ProofState; confidence: Confidence; ledger: Entry[]; counts?: Record<string, number>; now: number; doneOn: boolean }
type Ship = { ready: boolean; blockers: string[]; evidence: string[]; look: string[] }

// Only a real risky step counts as warned (the guard's kinds, steps that reach outside, secrets, migrations); the same-folder notice and the other notices do not
const RISKY_WARNED: readonly string[] = [...Object.values(WARNED_WHAT), ...Object.values(WORLD_WARNED_WHAT), BACK_WARNED_WHAT]
export const riskyWarned = (what: string): boolean => RISKY_WARNED.includes(what)
// Only a real risky step counts as stopped, the same kinds: an extra agent, a call over budget, the pause and a step refused while paused are not risky steps
const RISKY_STOPPED: readonly string[] = [...Object.values(HELD_WHAT), ...Object.values(WORLD_HELD_WHAT), BACK_HELD_WHAT]
export const riskyStopped = (what: string): boolean => RISKY_STOPPED.includes(what)
// The counts store keeps every line, the ledger only the last 60, so both are read.
export const stoppedToday = (ledger: Entry[], now: number, counts?: Record<string, number>): number => didToday(ledger, now, counts).filter(d => riskyStopped(d.what)).reduce((n, d) => n + d.n, 0)

export function ship(f: ShipFacts, t: Tr = same): Ship {
  const p = f.proof
  const blockers: string[] = []
  const evidence: string[] = []
  const look: string[] = []
  if (p.edits === 0) blockers.push(t('No file has changed in this session, so there is nothing to ship.'))
  const kinds = relevantKinds(p)
  for (const k of kinds) {
    const st = statusOf(p, k)
    evidence.push(`${t(kindWord(k))}: ${t(statusWord(st))}`)
    if (st !== 'ok' && p.edits > 0) blockers.push(fillIn(t('{check} {state}. Run it again after the last edit.'), { check: t(kindWord(k)), state: t(statusWord(st)) }))
  }
  if (p.done.length > 0 && f.doneOn && !p.done.every(k => statusOf(p, k) === 'ok')) blockers.push(t('Your definition of done is not met.'))
  const unproven = p.last?.unproven.length ?? 0
  if (unproven > 0) blockers.push(fillIn(t(unproven === 1 ? '1 statement in the last answer has no check behind it.' : '{n} statements in the last answer have no check behind them.'), { n: unproven }))
  const held = stoppedToday(f.ledger, f.now, f.counts)
  if (held > 0) look.push(fillIn(t(held === 1 ? 'The safety check stopped 1 step today. Check that nothing was left undone.' : 'The safety check stopped {n} steps today. Check that nothing was left undone.'), { n: held }))
  if (p.debt > 0) look.push(fillIn(t(p.debt === 1 ? '1 finished answer changed files and waits for your look: /vaken-ship review-story, /vaken-ship heat.' : '{n} finished answers changed files and wait for your look: /vaken-ship review-story, /vaken-ship heat.'), { n: p.debt }))
  if (f.confidence.score !== undefined) evidence.push(fillIn(t('Confidence {n} of 100 (made only of evidence)'), { n: f.confidence.score }))
  else evidence.push(t('Confidence: not enough evidence yet'))
  look.push(t('Check the pull request and its checks: /vaken-ship pr.'))
  return { ready: blockers.length === 0, blockers, evidence, look }
}

export function shipText(s: Ship, t: Tr = same): string {
  return [
    t(s.ready ? 'Ship it: the evidence looks good.' : 'Ship it: not yet.'),
    ...(s.blockers.length === 0 ? [] : ['', t('What blocks it:'), ...s.blockers.map(b => `  - ${b}`)]),
    '',
    t('The evidence:'),
    ...s.evidence.map(e => `  - ${e}`),
    '',
    t('Look at yourself:'),
    ...s.look.map(l => `  - ${l}`),
    '',
    t('Vaken does not merge or push. Shipping is your press.'),
  ].join('\n')
}
