// The Ship card: the verdict and the blockers, read from what the pane has already loaded.
import type { Entry } from './ledger'
import { KIND_SHORT, LOOK_TITLE, claimsUnchecked, kindWord, relevantKinds, stateWord, statusOf } from './proof'
import type { ProofKind, ProofState } from './proof'
import { LOOK_NOW, plainVerdict, prRight, prTitle, prWhat } from './prcard'
import type { PrsFacts } from './prcard'
import { stoppedToday } from './ship'
import { SHIP_CLAIMS, SHIP_HEAD, SHIP_HELD_MANY, SHIP_HELD_ONE, SHIP_MANY, SHIP_NO_GIT, SHIP_NONE, SHIP_ONE, SHIP_PR_UNCHECKED, SHIP_READY, SHIP_READY_HERE, SHIP_SEE, SHIP_VERDICT } from './shipwords'
import { topicWhatIs } from './whatis'
import { fillIn } from './fillin'
import type { WhatIs } from './whatis'

export type ShipDo = { do: 'fixCheck'; kind: ProofKind } | { do: 'claims'; n: number } | { do: 'prFix' } | { do: 'look' } | { do: 'prLook' }
// `proofHome`: the Checks card is shown, so its check and claim rows are one line here that points there
export type ShipFacts = { proof?: ProofState; ledger: Entry[]; counts?: Record<string, number>; now: number; prs?: PrsFacts; shown?: string[]; prsHome?: boolean; proofHome?: boolean; noGit?: boolean }
export type ShipBlock = { key: string; title: string; right: string; what: WhatIs; cmd: string; press?: ShipDo; wrap?: boolean }
export type ShipVerdict = 'blocked' | 'ready' | 'none'

export const SHIP_ROWS = 4
const fill = (s: string, n: number): string => s.replace('{n}', String(n))

export const SHIP_MEANS = 'Whether this work looks ready to ship, from the evidence vaken keeps: the checks that ran after the last change, the claims, the definition of done, which risky steps were stopped and your open pull request. Vaken never merges or pushes.'
export const SHIP_PR_CI_NEXT = "The app's PR panel shows the checks and offers Auto-fix. Ship says ready once they pass."
const SHIP_NEXT = 'Press to see the full verdict of /vaken-ship under the row. Merging and pushing stay your press.'

export function shipBlocks(f: ShipFacts, t: (s: string) => string): ShipBlock[] {
  const p = f.proof
  const out: ShipBlock[] = []
  const see = t(SHIP_SEE)
  // Rows whose opened See carries the /vaken-ship verdict; its lines are added once every row is known (end of this function).
  const verdictRows = new Set<string>()
  // Only this session's own pull request blocks its shipping; the others are on the Pull requests card.
  for (const r of f.prs?.rows ?? []) {
    if (!r.mine) continue
    const waits = r.checks === 'running' || r.merge === 'conflicts' || r.merge === 'behind' || r.merge === 'draft' || r.merge === 'review'
    if (r.checks !== 'failing' && !waits) continue
    // CI still blocks the verdict, but has no Fix press: the Desktop app's PR monitor offers Auto-fix
    const ci = r.checks === 'failing' || r.checks === 'running' ? t(r.checks) : ''
    const right = ci !== '' && r.merge !== 'ready' && r.merge !== 'unknown' ? `${ci} · ${prRight(r, t)}` : ci !== '' ? ci : prRight(r, t)
    // Its name alone: the merge order is the Pull requests card's
    out.push({ key: `pr-${r.key}`, title: prTitle(r, false), wrap: true, right, what: ci === '' ? prWhat(r, f.now, undefined, t) : { ...prWhat(r, f.now, undefined, t), next: t(SHIP_PR_CI_NEXT) }, cmd: '/vaken-ship pr' })
  }
  if (p === undefined) return out
  const worked = p.edits > 0
  if (worked) {
    for (const k of relevantKinds(p)) {
      const st = statusOf(p, k)
      if (st === 'ok') continue
      const what: WhatIs = { means: fillIn(t('Whether {what} ran after the last change, and passed. Passed means the command ended with no error.'), { what: t(kindWord(k)) }), facts: [fillIn(t('Now: {state}.'), { state: stateWord(k, st, t) })], next: st === 'failed' ? t('Press to put a fix request in the prompt box, then press Enter to send it. /vaken-ship proof shows what ran.') : t(SHIP_NEXT), setting: 'proof.receipts' }
      if (st !== 'failed') verdictRows.add(`check-${k}`)
      // The Checks card's short name and state word, Swedish agreement included
      out.push({ key: `check-${k}`, title: t(KIND_SHORT[k]), right: `${stateWord(k, st, t)} · ${st === 'failed' ? t('Fix') : see}`, what, cmd: '/vaken-ship proof', press: st === 'failed' ? { do: 'fixCheck', kind: k } : { do: 'look' } })
    }
  }
  const unproven = claimsUnchecked(p)
  if (unproven > 0) out.push({ key: 'claims', title: t(SHIP_CLAIMS), right: `${unproven === 1 ? t('1 claim') : t('{n} claims').replace('{n}', String(unproven))} · ${t('Check')}`, what: { ...topicWhatIs('proof'), next: t('Press to ask Claude to run the checks that prove them, and show the results.') }, cmd: '/vaken-ship proof', press: { do: 'claims', n: unproven } })
  const held = stoppedToday(f.ledger, f.now, f.counts)
  if (worked && held > 0) verdictRows.add('held')
  if (worked && held > 0) out.push({ key: 'held', title: fill(t(held === 1 ? SHIP_HELD_ONE : SHIP_HELD_MANY), held), right: t(SHIP_VERDICT), what: { ...topicWhatIs('guard', t('Check that nothing was left undone.')), next: t(SHIP_NEXT) }, cmd: '/vaken-ship', press: { do: 'look' } })
  if (worked && p.debt > 0) verdictRows.add('look')
  if (worked && p.debt > 0) out.push({ key: 'look', title: t(LOOK_TITLE), right: t(SHIP_VERDICT), what: { means: fillIn(t(p.debt === 1 ? '1 finished answer changed files and waits for your look. Your next message, or /vaken-ship reviewed, clears it.' : '{n} finished answers changed files and wait for your look. Your next message, or /vaken-ship reviewed, clears it.'), { n: p.debt }), next: t(SHIP_NEXT), setting: 'proof.receipts' }, cmd: '/vaken-ship review-story', press: { do: 'look' } })
  // Opened, the verdict is plain fact rows like the rest of the See: no headings, no "  - " lines, nothing a row title already says.
  const said = plainVerdict(f.shown ?? [], out.map(b => b.title))
  if (said.length === 0) return out
  return out.map(b => (verdictRows.has(b.key) ? { ...b, what: { ...b.what, facts: [...(b.what.facts ?? []), ...said] } } : b))
}

export function shipVerdict(f: ShipFacts, blocks: ShipBlock[] = shipBlocks(f, s => s)): ShipVerdict {
  if (blocks.length > 0) return 'blocked'
  return (f.proof?.edits ?? 0) > 0 || (f.prs?.rows ?? []).some(r => r.mine) ? 'ready' : 'none'
}

export const shipLoud = (f: ShipFacts): ShipVerdict => shipVerdict(f)

// This branch's pull request was never asked about on GitHub (prcard.ts `look`): "Ready" only once it was.
export const prUnchecked = (f: ShipFacts): boolean => f.prs?.look === true
// With the PR check off, vaken cannot know the pull request: ready says "Ready here" alone
export const prOff = (f: ShipFacts): boolean => f.prs?.on !== true
// `unchecked`: ready here, but the pull request was not checked yet.
export const shipShort = (v: ShipVerdict, n: number, t: (s: string) => string, unchecked = false, off = false, noGit = false): string =>
  v === 'ready' ? (unchecked ? `${t(SHIP_READY_HERE)} · ${t(SHIP_PR_UNCHECKED)}` : t(off ? SHIP_READY_HERE : SHIP_READY)) : v === 'none' ? t(noGit ? SHIP_NO_GIT : SHIP_NONE) : fill(t(n === 1 ? SHIP_ONE : SHIP_MANY), n)

export type ShipGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: ShipDo; wrap?: boolean }
export type ShipGroup = { head: string; rows: ShipGroupRow[]; fold?: { id: string; shown: number; more: number } }
export type ShipView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups: ShipGroup[]; pointer?: 'prs'; checks?: true }

const CHECKS_NEXT = 'The Checks card shows each check, its age and the Fix press.'

// One fact, one place: with the Checks card shown, its check, claim and look rows become one line here ("Checks: 1 failed")
function oneChecksRow(blocks: ShipBlock[], p: ProofState | undefined, t: (s: string) => string): ShipBlock[] {
  const theirs = (b: ShipBlock): boolean => b.key.startsWith('check-') || b.key === 'claims' || b.key === 'look'
  const at = blocks.findIndex(theirs)
  if (at < 0 || p === undefined) return blocks
  const failed = relevantKinds(p).filter(k => statusOf(p, k) === 'failed').length
  const claims = claimsUnchecked(p)
  const checks = blocks.some(b => b.key.startsWith('check-'))
  const right = failed > 0 ? fill(t('{n} failed'), failed) : checks ? t('Not checked') : claims > 0 ? (claims === 1 ? t('1 claim') : fill(t('{n} claims'), claims)) : p.debt === 1 ? t('1 answer') : fill(t('{n} answers'), p.debt)
  const row: ShipBlock = { key: 'checks', title: t('Checks'), right, what: { ...topicWhatIs('proof'), next: t(CHECKS_NEXT) }, cmd: '/vaken-ship proof' }
  return [...blocks.slice(0, at).filter(b => !theirs(b)), row, ...blocks.slice(at).filter(b => !theirs(b))]
}

// The rows the open card lists: the Glance row counts these, so both say the same number
export const shownBlocks = (f: ShipFacts, t: (s: string) => string): ShipBlock[] => {
  const all = shipBlocks(f, t)
  return f.proofHome === true ? oneChecksRow(all, f.proof, t) : all
}

export function shipView(f: ShipFacts | undefined, t: (s: string) => string): ShipView {
  const facts: ShipFacts = f ?? { ledger: [], now: 0 }
  const blocks = shownBlocks(facts, t)
  const verdict = shipVerdict(facts, blocks)
  const unchecked = verdict === 'ready' && prUnchecked(facts)
  const short = shipShort(verdict, blocks.length, t, unchecked, verdict === 'ready' && prOff(facts), facts.noGit === true)
  // Opened, the verdict says only what the rows below do not: the rows themselves are not repeated.
  const said = plainVerdict(facts.shown ?? [], blocks.map(b => b.title))
  const what: WhatIs = { means: t(SHIP_MEANS), ...(said.length === 0 ? {} : { facts: said }), ...(verdict === 'none' && facts.noGit === true ? {} : verdict === 'none' ? { next: t('Change something, then the card says if it is ready.') } : unchecked ? { next: t('Press to ask GitHub once now.') } : { next: t(SHIP_NEXT) }), setting: 'proof.done' }
  const first: ShipGroupRow = { key: 'verdict', title: short, what, ...(verdict === 'none' ? {} : unchecked ? { right: t(LOOK_NOW), press: { do: 'prLook' } } : { right: t(SHIP_SEE), press: { do: 'look' } }) }
  const listed = blocks
  return {
    title: 'Ship',
    blurb: t('Ready to ship?'),
    short,
    lines: [short, ...listed.slice(0, SHIP_ROWS).map(b => `${b.title}: ${b.right}`)],
    whats: [what, ...listed.slice(0, SHIP_ROWS).map(b => b.what)],
    shortWhat: what,
    ...(facts.prsHome === true && listed.some(b => b.key.startsWith('pr-')) ? { pointer: 'prs' as const } : {}),
    ...(listed.some(b => b.key === 'checks') ? { checks: true as const } : {}),
    groups: [{ head: '', rows: [first] }, ...(listed.length === 0 ? [] : [{ head: t(SHIP_HEAD), rows: listed.map(({ key, title, right, what: w, press, wrap }): ShipGroupRow => ({ key, title, right, what: w, ...(press === undefined ? {} : { press }), ...(wrap === true ? { wrap } : {}) })), ...(listed.length > SHIP_ROWS ? { fold: { id: 'blocks', shown: SHIP_ROWS, more: listed.length - SHIP_ROWS } } : {}) }])],
  }
}

export function shipCardText(f: ShipFacts | undefined): string[] {
  if (f === undefined) return []
  const id = (s: string): string => s
  const blocks = shipBlocks(f, id)
  const verdict = shipVerdict(f, blocks)
  const short = shipShort(verdict, blocks.length, id, verdict === 'ready' && prUnchecked(f), verdict === 'ready' && prOff(f))
  return [`Ship: ${short} · /vaken-ship`, ...blocks.slice(0, SHIP_ROWS).map(b => `${b.title}: ${b.right} · ${b.cmd}`)]
}
