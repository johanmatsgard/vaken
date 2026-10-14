// Facts for the Other sessions card: counts, states and folder names only, never conversation text.
import { readNote } from './flush'
import type { Io } from './io'
import { parts as pathParts } from './platform'
import { tr } from './lang'
import { samePlace } from './neighbors'
import { latestOf, readState, stateKey, statusOf } from './proof'
import type { ProofState } from './proof'
import { fmt } from './fmt'

export type DoneFacts = { files: number; tests?: 'passed' | 'failed'; testsAt?: number; pr?: 'open' | 'merged' }

export const QUIET_DONE_MS = 30 * 60_000
export const CONTEXT_FACT_PERCENT = 80
export const COST_FACT_USD = 2

export const prStateKey = (sessionId: string): string => `cockpit:pr:state:${sessionId}`
const prOf = (raw: unknown): DoneFacts['pr'] => {
  const view = typeof raw === 'object' && raw !== null ? (raw as { view?: { state?: unknown } }).view : undefined
  const state = typeof view?.state === 'string' ? view.state.toUpperCase() : ''
  return state === 'OPEN' ? 'open' : state === 'MERGED' ? 'merged' : undefined
}

export function doneFacts(proof: ProofState, prRaw: unknown, prev?: DoneFacts): DoneFacts | undefined {
  const st = statusOf(proof, 'tests')
  const tests = st === 'ok' ? 'passed' : st === 'failed' ? 'failed' : undefined
  const testsAt = tests === undefined ? undefined : latestOf(proof, 'tests')?.at
  const pr = prRaw === undefined ? prev?.pr : prOf(prRaw)
  const files = proof.files.length
  if (files === 0 && tests === undefined && pr === undefined) return undefined
  return { files, ...(tests === undefined ? {} : { tests }), ...(testsAt === undefined ? {} : { testsAt }), ...(pr === undefined ? {} : { pr }) }
}

export async function doneNow(i: Io, prev: DoneFacts | undefined, withPr: boolean): Promise<DoneFacts | undefined> {
  const sid = await i.sessionId()
  const proof = readState(await readNote(i, stateKey(sid)))
  return doneFacts(proof, withPr ? ((await i.get(prStateKey(sid))) ?? null) : undefined, prev)
}

export function doneLine(d: DoneFacts | undefined): string | undefined {
  if (d === undefined) return undefined
  const parts: string[] = []
  if (d.files > 0) parts.push(tr(d.files === 1 ? '{n} file changed' : '{n} files changed').replace('{n}', String(d.files)))
  if (d.tests !== undefined) parts.push(tr(d.tests === 'passed' ? 'tests passed' : 'tests failed'))
  if (d.pr !== undefined) parts.push(tr(d.pr === 'open' ? 'PR opened' : 'PR merged'))
  return parts.length === 0 ? undefined : parts.join(' · ')
}

export type FactRow = { kind: string; reason: string; sinceMs: number; cwd: string; contextPercent?: number; costUsd?: number; done?: DoneFacts }
export type Fact = { what: 'needs' | 'context' | 'folder' | 'cost' | 'done'; text: string }

export const isLongQuiet = (r: Pick<FactRow, 'kind' | 'sinceMs'>): boolean => r.kind === 'idle' || (r.kind === 'waiting' && r.sinceMs >= QUIET_DONE_MS)

export function rowFact(r: FactRow, hereCwd: string | undefined): Fact | undefined {
  if (r.kind === 'needs' && r.reason !== '') return { what: 'needs', text: r.reason }
  if (r.contextPercent !== undefined && r.contextPercent > CONTEXT_FACT_PERCENT) return { what: 'context', text: tr('context {n}%').replace('{n}', String(Math.round(r.contextPercent))) }
  if (hereCwd !== undefined && samePlace({ cwd: r.cwd }, { cwd: hereCwd })) return { what: 'folder', text: tr('same folder as you') }
  if (r.costUsd !== undefined && r.costUsd > COST_FACT_USD) return { what: 'cost', text: fmt.moneyPlain(r.costUsd) }
  const done = isLongQuiet(r) ? doneLine(r.done) : undefined
  return done === undefined ? undefined : { what: 'done', text: done }
}

// A worktree of a repository counts as the repository.
export function groupOfRow(group: string | undefined, cwd: string): string {
  if (group !== undefined && group !== '') return group
  const parts = pathParts(cwd)
  const at = parts.findIndex(p => p === 'worktrees' || p === '.worktrees')
  const base = at > 0 ? parts.slice(0, parts[at] === 'worktrees' && parts[at - 1] === '.claude' ? at - 1 : at) : parts
  return base.filter(p => !p.startsWith('.')).pop() ?? tr('No folder')
}

export function groupRows<T>(rows: readonly T[], groupOf: (r: T) => string): { head: string; rows: T[] }[] {
  const out: { head: string; rows: T[] }[] = []
  for (const r of rows) {
    const head = groupOf(r)
    const g = out.find(x => x.head === head)
    if (g === undefined) out.push({ head, rows: [r] })
    else g.rows.push(r)
  }
  return out
}
