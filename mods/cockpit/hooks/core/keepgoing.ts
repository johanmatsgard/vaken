// Keep going until green: after one press, when Claude ends a turn while a check still fails, the Stop hook asks Claude to go on, at most KEEP_ROUNDS times.
// It lives in the session's proof note (core/proof.ts `keep`): the check's kind, a round count and a time, never a command, its output or anything Claude wrote.
// Also the wider done check: a file changed after a check passed shows one calm row in Checks, and nothing is blocked.
import { PROOF_KINDS, latestOf, statusOf } from './proof'
import { fillIn } from './fillin'
import { tr } from './lang'
import type { Judged, KeepGoing, ProofKind, ProofState } from './proof'

export const KEEP_ROUNDS = 3

// The press of the Checks card, by the failing check's kind
export const KEEP_TITLE: Record<ProofKind, string> = { tests: 'Keep going until tests pass', build: 'Keep going until the build passes', lint: 'Keep going until lint passes', types: 'Keep going until the type check passes' }
export const KEEP_START = 'Start'
export const KEEP_STOP = 'Stop keeping going'
export const KEEP_ROUNDS_USED = '{n} of {max} rounds used'
export const KEEP_START_WHAT = 'When Claude ends a turn while this check fails, vaken asks Claude to go on: at most 3 rounds, for this session only. Your next message, a pass or Stop keeping going ends it.'
export const KEEP_ON_WHAT = 'Vaken asks Claude to go on while the check fails, at most 3 rounds. Press to stop now.'
// Needs you, after the last round
export const KEEP_HEAD = 'Keep going'
export const KEEP_MAX_TITLE = '{check} still failing after {n} rounds'
export const KEEP_MAX_MEANS = 'Vaken asked Claude to go on 3 times and the check still fails. Claude has stopped, and nothing more runs by itself.'
export const KEEP_MAX_NEXT = 'Press Fix to put a fix request in the prompt box, or write to Claude. Dismiss only takes this row away.'
// The toast when the check passes while it runs
export const KEEP_PASSED = '{check} passed. Keep going is off again.'
export const KEEP_STARTED = 'Keep going is on, at most 3 rounds. Your next message ends it.'
export const KEEP_STOPPED = 'Keep going is off.'
// The wider done check, by the kind that passed before the change
export const CHANGED_TITLE: Record<ProofKind, string> = { tests: 'Changed since the last test run', build: 'Changed since the last build', lint: 'Changed since the last lint run', types: 'Changed since the last type check' }
export const CHANGED_MEANS = 'A file changed after this check last passed, so the pass may not hold now. Nothing is stopped.'
export const CHANGED_NEXT = 'Ask Claude to run it again before you call the work done.'

export const KEEP_WORDS: string[] = [...Object.values(KEEP_TITLE), KEEP_START, KEEP_STOP, KEEP_ROUNDS_USED, KEEP_START_WHAT, KEEP_ON_WHAT, KEEP_HEAD, KEEP_MAX_TITLE, KEEP_MAX_MEANS, KEEP_MAX_NEXT, KEEP_PASSED, KEEP_STARTED, KEEP_STOPPED, ...Object.values(CHANGED_TITLE), CHANGED_MEANS, CHANGED_NEXT]

// Claude reads this when the Stop hook asks it to go on. It names only the check's kind and the round.
const FAILS: Record<ProofKind, string> = { tests: 'The tests still fail', build: 'The build still fails', lint: 'Lint still fails', types: 'The type check still fails' } // en-only: a reason sent to Claude by the Stop hook
const NAME: Record<ProofKind, string> = { tests: 'the tests', build: 'the build', lint: 'lint', types: 'the type check' } // en-only: a reason sent to Claude by the Stop hook
const PASS: Record<ProofKind, string> = { tests: 'they pass', build: 'it passes', lint: 'it passes', types: 'it passes' } // en-only: a reason sent to Claude by the Stop hook
export const keepReason = (k: ProofKind, round: number): string =>
  `${FAILS[k]}. The person pressed Keep going in vaken, so do not stop yet: run ${NAME[k]} again, find why it fails, fix it, and end your turn only when ${PASS[k]}. Round ${round} of ${KEEP_ROUNDS}.` // en-only: a reason sent to Claude by the Stop hook

// On: pressed, and not yet ended by the last round
export const keepOn = (s: ProofState | undefined): KeepGoing | undefined => (s?.keep !== undefined && s.keep.end === undefined ? s.keep : undefined)
export const keepMaxed = (s: ProofState | undefined): KeepGoing | undefined => (s?.keep?.end === 'max' ? s.keep : undefined)

export const startKeep = (s: ProofState, kind: ProofKind, at: number): ProofState => ({ ...s, keep: { kind, rounds: 0, at } })
export const stopKeep = (s: ProofState): ProofState => {
  const { keep: _gone, ...rest } = s
  return rest
}

export type StopEnd = 'passed' | 'max' | 'stuck' | 'off'
export type StopVerdict = { state: ProofState; block?: string; ended?: StopEnd }

// When Claude ends a turn. `stuck`: the stuck ladder's offer is up (core/loopbreaker.ts), so the person picks a way out and this stops; `receiptsOn`: Settings > Checks.
export function atStop(s: ProofState, o: { receiptsOn: boolean; stuck: boolean }): StopVerdict {
  const k = keepOn(s)
  if (k === undefined) return { state: s }
  if (!o.receiptsOn) return { state: stopKeep(s), ended: 'off' }
  if (o.stuck) return { state: stopKeep(s), ended: 'stuck' }
  const r = latestOf(s, k.kind)
  if (r?.ok === true) return { state: stopKeep(s), ended: 'passed' }
  // Only a run that failed asks for more; a run whose result is not clear, or none yet, waits
  if (r?.ok !== false) return { state: s }
  if (k.rounds >= KEEP_ROUNDS) return { state: { ...s, keep: { ...k, end: 'max' } }, ended: 'max' }
  const round = k.rounds + 1
  return { state: { ...s, keep: { ...k, rounds: round } }, block: keepReason(k.kind, round) }
}

// A pass of the check ends it at once, before the turn ends.
export function keepAfterReceipts(s: ProofState, results: Judged[]): { state: ProofState; passed?: ProofKind } {
  const k = keepOn(s)
  if (k === undefined || !results.some(r => r.kind === k.kind && r.ok === true)) return { state: s }
  return { state: stopKeep(s), passed: k.kind }
}

// The first failing check of the card's list offers the press; none while the stuck ladder's offer is up or Check runs is Off
export type KeepRow = { press: 'start'; kind: ProofKind } | { press: 'stop'; kind: ProofKind; rounds: number }
export function keepRowOf(s: ProofState, kinds: readonly ProofKind[], o: { receiptsOn: boolean; stuck: boolean }): KeepRow | undefined {
  if (!o.receiptsOn) return undefined
  const k = keepOn(s)
  if (k !== undefined) return { press: 'stop', kind: k.kind, rounds: k.rounds }
  if (o.stuck) return undefined
  const failing = kinds.find(x => statusOf(s, x) === 'failed')
  return failing === undefined ? undefined : { press: 'start', kind: failing }
}

// The wider done check: the turn ended with files changed after a check passed. The newest such pass names the row.
export function changedSince(s: ProofState): ProofKind | undefined {
  if (s.turnEdits > 0 || s.last === undefined || s.last.edits === 0) return undefined
  let best: { kind: ProofKind; seq: number } | undefined
  for (const k of PROOF_KINDS) {
    const r = latestOf(s, k)
    if (r !== undefined && r.ok === true && r.seq < s.lastEditSeq && (best === undefined || r.seq > best.seq)) best = { kind: k, seq: r.seq }
  }
  return best?.kind
}

// The text twin's line (/vaken-ship proof): the same facts as the Checks row, in plain English.
export function keepLines(s: ProofState): string[] {
  const k = s.keep
  if (k === undefined) return []
  return k.end === 'max'
    ? [fillIn(tr('Keep going: stopped after {max} rounds, {check} still failing. Press Keep going in the pane to try again.'), { max: KEEP_ROUNDS, check: tr(NAME[k.kind]) })]
    : [fillIn(k.kind === 'tests' ? tr('Keep going: on until {check} pass, {n} of {max} rounds used. Your next message ends it.') : tr('Keep going: on until {check} passes, {n} of {max} rounds used. Your next message ends it.'), { check: tr(NAME[k.kind]), n: k.rounds, max: KEEP_ROUNDS })]
}
