// Which plain claims a final answer makes ('tests pass', 'fixed', 'done') and whether a check backs each. Simple phrase patterns, no model call; only the claim kind is kept.
import { tr } from './lang'
import { PROOF_KINDS, doneMet, gapWords, latestOf, statusOf } from './proof'
import type { ClaimKind, Gap, ProofKind, ProofState } from './proof'

const PATTERNS: { kind: ClaimKind; re: RegExp }[] = [
  { kind: 'tests', re: /\b(?:all (?:the )?|the )?(?:unit |new |existing |relevant |full )?tests? (?:now |all |also )?(?:pass(?:ed|es)?|passing|are (?:all )?(?:passing|green)|is green)\b|\btest suite (?:passes|passed|is green)\b|\ball (?:tests )?(?:green|pass(?:ed)?)\b/gi },
  { kind: 'types', re: /\b(?:the )?type[- ]?check(?:s|ing)? (?:now )?(?:pass|passes|passed|is clean|is green|succeeds)\b|\btsc (?:passes|is clean|succeeds)\b|\bno type errors\b/gi },
  { kind: 'lint', re: /\blint(?:ing)? (?:is )?(?:clean|passes|passed)\b|\b(?:eslint|ruff) (?:is )?(?:clean|passes)\b|\bno lint(?:ing)? (?:errors|warnings)\b/gi },
  { kind: 'build', re: /\b(?:the )?build (?:now )?(?:passes|succeeds|works|is green|completes|is clean)\b|\bbuilds? (?:cleanly|successfully)\b|\b(?:it|this|everything|the project|the app) builds\b/gi },
  { kind: 'fixed', re: /\b(?:i(?:'ve| have)? )?fixed (?:the|it|this|that|all|both|those)\b|\b(?:is|are|now|been) fixed\b/gi },
  { kind: 'done', re: /\b(?:the task|the work|this|that|it|everything|all) (?:is|are) (?:now )?(?:done|complete|completed|finished)\b|\bi(?:'ve| have) (?:finished|completed)\b|\b(?:task|work) (?:is )?complete\b/gi },
  { kind: 'generic', re: /\b(?:i have verified|i verified|i've verified|verified that|all checks pass(?:ed)?|everything passes)\b/gi },
]

// A phrase after these words is a plan, question or denial, not a claim.
const HEDGE = /(?:\bnot\b|n't\b|\bnever\b|\bno\b|\bwithout\b|\bunable\b|\bcannot\b|\bif\b|\bonce\b|\buntil\b|\bshould\b|\bwill\b|\bwould\b|\bcould\b|\bcan\b|\bmay\b|\bmight\b|\bto\b|\bwhether\b|\bbefore\b|\bso that\b|\bcheck\b|\bensure\b|\bmake\b|\bget\b|\bkeep\b|\bneed\b|\bun)\s*(?:\w+\s+){0,2}$/i

const withoutCode = (answer: string): string => answer.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ')

// A specific claim already names what it checked, so 'verified' alone is dropped beside it.
export function findClaims(answer: string): ClaimKind[] {
  const text = withoutCode(answer)
  const found = new Set<ClaimKind>()
  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0
    for (const m of text.matchAll(re)) {
      const at = m.index ?? 0
      if (HEDGE.test(text.slice(Math.max(0, at - 30), at))) continue
      found.add(kind)
    }
  }
  if (found.size > 1) found.delete('generic')
  return [...found]
}

// 'Fixed', 'done' and 'verified' need a passing check after the last edit and no failing one; with a definition of done set, 'done' needs it met.
export function gapsOf(claims: ClaimKind[], s: ProofState, o: { doneOn: boolean }): Gap[] {
  const out: Gap[] = []
  const worked = s.turnEdits > 0 || s.receipts.some(r => r.seq > s.turnStartSeq)
  for (const claim of claims) {
    if ((PROOF_KINDS as readonly string[]).includes(claim)) {
      const st = statusOf(s, claim as ProofKind)
      if (st !== 'ok') out.push({ kind: claim, why: st === 'failed' ? 'failed' : st === 'stale' ? 'stale' : st === 'unknown' ? 'unknown' : 'missing' })
      continue
    }
    if (!worked) continue
    if (claim === 'done' && o.doneOn && s.done.length > 0) {
      if (!doneMet(s, s.done)) out.push({ kind: claim, why: 'notdone' })
      continue
    }
    const states = PROOF_KINDS.map(k => statusOf(s, k))
    if (states.includes('failed')) out.push({ kind: claim, why: 'failed' })
    else if (states.includes('ok')) continue
    else out.push({ kind: claim, why: PROOF_KINDS.some(k => latestOf(s, k) !== undefined) ? 'stale' : 'missing' })
  }
  return out
}

export const gapLine = (g: Gap[]): string => `Vaken: ${g.map(gapWords).join(' ')}`

export const gapDetail = (g: Gap[]): string => g.map(gapWords).join(' ')

export const gapToast = (g: Gap[]): string => (g.length === 1 ? `${tr('An unproven claim:')} ` : `${tr('{n} unproven claims:').replace('{n}', String(g.length))} `) + g.map(x => `"${tr(x.kind === 'generic' ? 'verified' : x.kind)}"`).join(', ')

export const claimNote = (kinds: ClaimKind[]): string =>
  `Vaken compared your last answer with its record of checks. These claims had no passing check behind them: ${[...new Set(kinds)].join(', ')}. In this reply, say plainly what you checked and what you did not. If a check is quick, run it first.`
