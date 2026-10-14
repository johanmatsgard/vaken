// Ship from the phone: typed steps check, fix and merge after /vaken-ship. Nothing is automatic.
import { PR_VIEW_ARGV, healthOf, parsePrView, prWords, tally } from './crewpr'
import type { Env } from './guardjudge'
import type { Io } from './io'
import { guardWords, verdictOf } from './phonedo'
import { mergeOf } from './prcard'
import {
  SS_R_BEHIND, SS_R_BLOCKED, SS_R_CLOSED, SS_R_CONFLICT, SS_R_DRAFT, SS_R_FAILING, SS_R_MERGED, SS_R_NOCHECKS, SS_R_NOSHA, SS_R_REVIEW, SS_R_RUNNING, SS_R_UNKNOWN, SS_T_BAD, SS_T_CHECK_COMMIT, SS_T_CHECK_NEXT_FIX, SS_T_CHECK_NEXT_MERGE,
  SS_T_CHECK_NEXT_OTHER, SS_T_CHECK_NEXT_WAIT, SS_T_FIX_NOFAIL, SS_T_FIX_SHOW, SS_T_MERGE_NOT, SS_T_MERGE_OK, SS_T_MERGE_ONE, SS_T_MERGE_REFUSED, SS_T_MERGE_SHOW, SS_T_NOGUARD, SS_T_NOPR, SS_T_WRONGPR,
} from './shipstepwords'

export type PrNow = NonNullable<ReturnType<typeof parsePrView>>
export type Say = (s: string) => string
const fill = (s: string, v: Record<string, string | number>): string => Object.entries(v).reduce((acc, [k, x]) => acc.split(`{${k}}`).join(String(x)), s)

export const SHIP_GH_MS = 15_000
export const SHIP_MERGE_MS = 60_000
export const SHIP_NAMES = 3
export const SHIP_ERR_CHARS = 120
// A squash merge; the branch is kept because a worktree may still use it.
export const MERGE_METHOD = '--squash'

// The merge names the checked commit, so GitHub refuses it if a new commit was pushed since.
export const MATCH_HEAD = '--match-head-commit'
// A full 40-letter commit id as GitHub sends it; anything else refuses the merge.
export const isSha = (s: string | undefined): s is string => s !== undefined && /^[0-9a-f]{40}$/.test(s)
export const shortSha = (s: string): string => s.slice(0, 7)

export const CHECK_SCRIPT = PR_VIEW_ARGV.join(' ')
export const FIX_SCRIPT = 'gh pr checks'
export const mergeArgv = (n: number, sha: string): string[] => ['gh', 'pr', 'merge', String(n), MERGE_METHOD, MATCH_HEAD, sha]
export const mergeScript = (n: number, sha: string): string => mergeArgv(n, sha).join(' ')

export type Step = 'check' | 'fix' | 'merge'
export type StepAsk = { kind: 'verdict' } | { kind: 'bad' } | { kind: 'step'; step: Step; level: 0 | 1 | 2; n?: number }
const CHECK_WORDS = new Set(['check', 'checks', 'status', 'kolla', 'kontroll', 'kontrollera'])
const FIX_WORDS = new Set(['fix', 'fixa', 'repair'])
const MERGE_WORDS = new Set(['merge', 'merga', 'mergea'])
const YES_WORDS = new Set(['yes', 'y', 'ja'])
const DOUBLE_YES = new Set(['yesyes', 'yy', 'jaja'])
const FILLER = new Set(['ship', 'vaken', 'vaken', 'it', 'pr', 'pull', 'request', 'nr'])

// A "yes" with no step is not understood, so "yes yes" alone never merges.
export function parseShipStep(args: string): StepAsk {
  const words = args.toLowerCase().match(/[a-zåäö]+|\d+/g) ?? []
  const split = words.flatMap(w => {
    const m = /^(merge|merga|mergea|fix|fixa|check|checks)((?:yes|ja|y)+)$/.exec(w)
    return m === null ? [w] : [m[1] as string, ...((m[2] as string).match(/yes|ja|y/g) ?? [])]
  })
  let step: Step | undefined
  let yes = 0
  let n: number | undefined
  for (const w of split) {
    if (/^\d+$/.test(w)) {
      if (n !== undefined) return { kind: 'bad' }
      n = Number(w)
    } else if (YES_WORDS.has(w)) yes += 1
    else if (DOUBLE_YES.has(w)) yes += 2
    else {
      const s: Step | undefined = CHECK_WORDS.has(w) ? 'check' : FIX_WORDS.has(w) ? 'fix' : MERGE_WORDS.has(w) ? 'merge' : undefined
      if (s !== undefined) {
        if (step !== undefined && step !== s) return { kind: 'bad' }
        step = s
      } else if (!FILLER.has(w)) return { kind: 'bad' }
    }
  }
  if (step === undefined) return split.every(w => FILLER.has(w)) ? { kind: 'verdict' } : { kind: 'bad' }
  if (n !== undefined && (n < 1 || n > 999_999)) return { kind: 'bad' }
  return { kind: 'step', step, level: yes >= 2 ? 2 : yes === 1 ? 1 : 0, ...(n === undefined ? {} : { n }) }
}

export function mergeReasons(v: PrNow, t: Say): string[] {
  if (v.state === 'MERGED') return [t(SS_R_MERGED)]
  if (v.state === 'CLOSED') return [t(SS_R_CLOSED)]
  const out: string[] = []
  const k = tally(v.checks)
  if (v.isDraft) out.push(t(SS_R_DRAFT))
  const h = healthOf(k)
  if (h === 'none') out.push(t(SS_R_NOCHECKS))
  if (k.failed > 0) out.push(fill(t(SS_R_FAILING), { n: k.failed }))
  if (k.running + k.queued > 0) out.push(fill(t(SS_R_RUNNING), { n: k.running + k.queued }))
  const m = mergeOf(v)
  if (m === 'conflicts') out.push(t(SS_R_CONFLICT))
  if (m === 'behind') out.push(t(SS_R_BEHIND))
  if (m === 'review') out.push(t(SS_R_REVIEW))
  if (out.length === 0 && v.mergeState === 'BLOCKED') out.push(t(SS_R_BLOCKED))
  if (out.length === 0 && v.mergeable !== 'MERGEABLE') out.push(t(SS_R_UNKNOWN))
  if (!isSha(v.head)) out.push(t(SS_R_NOSHA))
  return out
}

export type MergeDecision = { kind: 'refused'; reasons: string[] } | { kind: 'show' } | { kind: 'one' } | { kind: 'run' }
// Not green, or anything else blocking, refuses however many yes were typed.
export function decideMerge(v: PrNow, level: 0 | 1 | 2, t: Say = s => s): MergeDecision {
  const reasons = mergeReasons(v, t)
  if (reasons.length > 0) return { kind: 'refused', reasons }
  return level === 2 ? { kind: 'run' } : level === 1 ? { kind: 'one' } : { kind: 'show' }
}

export async function judgeStep(i: Io, env: Env, script: string, allow: 'safe' | 'risky'): Promise<string | undefined> {
  const v = verdictOf(script, await guardWords(i, env, script), false)
  if (v.verdict === 'blocked' || (allow === 'safe' && v.verdict !== 'safe')) return v.why.join(' ')
  return undefined
}

export const badText = (t: Say): string => t(SS_T_BAD)
export const noPrText = (t: Say): string => t(SS_T_NOPR)
export const noGuardText = (why: string, t: Say): string => fill(t(SS_T_NOGUARD), { x: why })
export const wrongPrText = (n: number, t: Say): string => fill(t(SS_T_WRONGPR), { n })

const listNames = (names: string[]): string => `${names.slice(0, SHIP_NAMES).join(', ')}${names.length > SHIP_NAMES ? ` +${names.length - SHIP_NAMES}` : ''}`
export const failedNames = (v: PrNow): string[] => v.checks.filter(c => c.state === 'failed').map(c => c.name)

export function checkText(v: PrNow, now: number, t: Say, shipLine?: string): string {
  const reasons = mergeReasons(v, t)
  const failed = tally(v.checks).failed > 0
  const pending = tally(v.checks).running + tally(v.checks).queued > 0
  const next = reasons.length === 0 ? SS_T_CHECK_NEXT_MERGE : failed ? SS_T_CHECK_NEXT_FIX : pending ? SS_T_CHECK_NEXT_WAIT : SS_T_CHECK_NEXT_OTHER
  const commit = isSha(v.head) ? [fill(t(SS_T_CHECK_COMMIT), { sha: shortSha(v.head) })] : []
  return [...(shipLine === undefined || shipLine === '' ? [] : [shipLine]), prWords(v, {}, now), ...commit, t(reasons.length === 0 ? SS_T_MERGE_OK : SS_T_MERGE_NOT), ...reasons.map(r => `  - ${r}`), t(next)].join('\n')
}

export const fixNothingText = (t: Say): string => t(SS_T_FIX_NOFAIL)
export const fixShowText = (v: PrNow, t: Say): string => (failedNames(v).length === 0 ? t(SS_T_FIX_NOFAIL) : fill(t(SS_T_FIX_SHOW), { list: listNames(failedNames(v)) }))

export const mergeShowText = (n: number, sha: string, t: Say): string => fill(t(SS_T_MERGE_SHOW), { n, sha: shortSha(sha) })
export const mergeOneText = (n: number, sha: string, t: Say): string => fill(t(SS_T_MERGE_ONE), { n, sha: shortSha(sha) })
export const mergeRefusedText = (reasons: string[], t: Say): string => [t(SS_T_MERGE_REFUSED), ...reasons.map(r => `  - ${r}`)].join('\n')
