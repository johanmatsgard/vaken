// The Ship card: the verdict and the blockers, read from what the pane has already loaded.
import type { Entry } from './ledger'
import { kindWord, relevantKinds, statusOf, statusWord } from './proof'
import type { ProofKind, ProofState } from './proof'
import { prRight, prTitle, prWhat } from './prcard'
import type { PrsFacts } from './prcard'
import { stoppedToday } from './ship'
import { SHIP_CLAIMS, SHIP_HEAD, SHIP_HELD_MANY, SHIP_HELD_ONE, SHIP_LOOK, SHIP_MANY, SHIP_NONE, SHIP_ONE, SHIP_READY, SHIP_SEE, SHIP_VERDICT } from './shipwords'
import { topicWhatIs } from './whatis'
import { fillIn } from './fillin'
import type { WhatIs } from './whatis'

export type ShipDo = { do: 'fixCheck'; kind: ProofKind } | { do: 'claims'; n: number } | { do: 'prFix' } | { do: 'look' }
export type ShipFacts = { proof?: ProofState; ledger: Entry[]; counts?: Record<string, number>; now: number; prs?: PrsFacts; shown?: string[]; prsHome?: boolean }
export type ShipBlock = { key: string; title: string; right: string; what: WhatIs; cmd: string; press?: ShipDo }
export type ShipVerdict = 'blocked' | 'ready' | 'none'

export const SHIP_ROWS = 4
const cap = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
const fill = (s: string, n: number): string => s.replace('{n}', String(n))

export const SHIP_MEANS = 'Whether this work looks ready to ship, from the evidence vaken keeps: the checks that ran after the last change, the claims, the definition of done, which risky steps were stopped and your open pull request. Vaken never merges or pushes.'
const SHIP_NEXT = 'Press to see the full verdict of /vaken-ship under the row. Merging and pushing stay your press.'

export function shipBlocks(f: ShipFacts, t: (s: string) => string): ShipBlock[] {
  const p = f.proof
  const out: ShipBlock[] = []
  const see = t(SHIP_SEE)
  const shown = f.shown ?? []
  // Only this session's own pull request blocks its shipping; the others are on the Pull requests card.
  for (const r of f.prs?.rows ?? []) {
    if (!r.mine) continue
    const waits = r.checks === 'running' || r.merge === 'conflicts' || r.merge === 'behind' || r.merge === 'draft' || r.merge === 'review'
    if (r.checks !== 'failing' && !waits) continue
    const fix = r.checks === 'failing' && f.prsHome !== true
    const right = r.checks === 'failing' ? (fix ? `${t('failing')} · ${t('Fix')}` : t('failing')) : prRight(r, t)
    out.push({ key: `pr-${r.key}`, title: prTitle(r), right, what: prWhat(r, f.now, undefined, t), cmd: '/vaken-ship pr', ...(fix ? { press: { do: 'prFix' } } : {}) })
  }
  if (p === undefined) return out
  const worked = p.edits > 0
  if (worked) {
    for (const k of relevantKinds(p)) {
      const st = statusOf(p, k)
      if (st === 'ok') continue
      const what: WhatIs = { means: fillIn(t('Whether {what} ran after the last change, and passed. Passed means the command ended with no error.'), { what: t(kindWord(k)) }), facts: [fillIn(t('Now: {state}.'), { state: t(statusWord(st)) }), ...(st === 'failed' ? [] : shown)], next: st === 'failed' ? t('Press to put a fix request in the prompt box, then press Enter to send it. /vaken-ship proof shows what ran.') : t(SHIP_NEXT), setting: 'proof.receipts' }
      out.push({ key: `check-${k}`, title: t(cap(kindWord(k))), right: `${t(statusWord(st))} · ${st === 'failed' ? t('Fix') : see}`, what, cmd: '/vaken-ship proof', press: st === 'failed' ? { do: 'fixCheck', kind: k } : { do: 'look' } })
    }
  }
  const unproven = p.last?.unproven.length ?? 0
  if (unproven > 0) out.push({ key: 'claims', title: t(SHIP_CLAIMS), right: `${unproven === 1 ? t('1 claim') : t('{n} claims').replace('{n}', String(unproven))} · ${t('Check')}`, what: { ...topicWhatIs('proof'), next: t('Press to ask Claude to run the checks that prove them, and show the results.') }, cmd: '/vaken-ship proof', press: { do: 'claims', n: unproven } })
  const held = stoppedToday(f.ledger, f.now, f.counts)
  if (worked && held > 0) out.push({ key: 'held', title: fill(t(held === 1 ? SHIP_HELD_ONE : SHIP_HELD_MANY), held), right: t(SHIP_VERDICT), what: { ...topicWhatIs('guard', t('Check that nothing was left undone.')), ...(shown.length === 0 ? {} : { facts: shown }), next: t(SHIP_NEXT) }, cmd: '/vaken-ship', press: { do: 'look' } })
  if (worked && p.debt > 0) out.push({ key: 'look', title: t(SHIP_LOOK), right: t(SHIP_VERDICT), what: { means: fillIn(t(p.debt === 1 ? '1 finished answer changed files and waits for your look. Your next message, or /vaken-ship reviewed, clears it.' : '{n} finished answers changed files and wait for your look. Your next message, or /vaken-ship reviewed, clears it.'), { n: p.debt }), ...(shown.length === 0 ? {} : { facts: shown }), next: t(SHIP_NEXT), setting: 'proof.receipts' }, cmd: '/vaken-ship review-story', press: { do: 'look' } })
  return out
}

export function shipVerdict(f: ShipFacts, blocks: ShipBlock[] = shipBlocks(f, s => s)): ShipVerdict {
  if (blocks.length > 0) return 'blocked'
  return (f.proof?.edits ?? 0) > 0 || (f.prs?.rows ?? []).some(r => r.mine) ? 'ready' : 'none'
}

export const shipLoud = (f: ShipFacts): ShipVerdict => shipVerdict(f)

export const shipShort = (v: ShipVerdict, n: number, t: (s: string) => string): string => (v === 'ready' ? t(SHIP_READY) : v === 'none' ? t(SHIP_NONE) : fill(t(n === 1 ? SHIP_ONE : SHIP_MANY), n))

export type ShipGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: ShipDo }
export type ShipView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups: { head: string; rows: ShipGroupRow[] }[]; pointer?: 'prs' }

export function shipView(f: ShipFacts | undefined, t: (s: string) => string): ShipView {
  const facts: ShipFacts = f ?? { ledger: [], now: 0 }
  const blocks = shipBlocks(facts, t)
  const verdict = shipVerdict(facts, blocks)
  const short = shipShort(verdict, blocks.length, t)
  const what: WhatIs = { means: t(SHIP_MEANS), ...(blocks.length === 0 ? {} : { facts: [...blocks.map(b => `${b.title}: ${b.right}`), ...(facts.shown ?? [])] }), ...(verdict === 'none' ? { next: t('Change something, then the card says if it is ready.') } : { next: t(SHIP_NEXT) }), setting: 'proof.done' }
  const first: ShipGroupRow = { key: 'verdict', title: short, what, ...(verdict === 'none' ? {} : { right: t(SHIP_SEE), press: { do: 'look' } }) }
  const listed = blocks.slice(0, SHIP_ROWS)
  return {
    title: 'Ship',
    blurb: t('Ready to ship?'),
    short,
    lines: [short, ...listed.map(b => `${b.title}: ${b.right}`)],
    whats: [what, ...listed.map(b => b.what)],
    shortWhat: what,
    ...(facts.prsHome === true && listed.some(b => b.key.startsWith('pr-')) ? { pointer: 'prs' as const } : {}),
    groups: [{ head: '', rows: [first] }, ...(listed.length === 0 ? [] : [{ head: t(SHIP_HEAD), rows: listed.map(({ key, title, right, what: w, press }): ShipGroupRow => ({ key, title, right, what: w, ...(press === undefined ? {} : { press }) })) }])],
  }
}

export function shipCardText(f: ShipFacts | undefined): string[] {
  if (f === undefined) return []
  const id = (s: string): string => s
  const blocks = shipBlocks(f, id)
  const short = shipShort(shipVerdict(f, blocks), blocks.length, id)
  return [`Ship: ${short} · /vaken-ship`, ...blocks.slice(0, SHIP_ROWS).map(b => `${b.title}: ${b.right} · ${b.cmd}`)]
}
