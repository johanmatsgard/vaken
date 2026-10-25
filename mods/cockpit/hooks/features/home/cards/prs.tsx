// The rows, words and order are in core/prcard.ts; it is a line card (home/linecards.ts prsCard), so Full shows grouped rows and Short one line.
import { tr } from '../../../core/lang'
import type { Io } from '../../../core/io'
import { resolveGitDir } from '../../../core/crew'
import { GH_TIMEOUT_MS, PR_FAIL_SAY, PR_SHARED_KEY, PR_VIEW_ARGV, isNoPr, parsePrView, prFailOf, prFailThrown, safeJson, withSharedPr } from '../../../core/crewpr'
import type { PrFacts } from '../../../core/crewpr'
import { COPY_CHECKING, LOOK_NOW, PR_FIX_NOFAIL, PR_FIX_NONE, PR_FIX_READING, PR_FIX_REFUSED, PR_LOOK_ASKING, PR_LOOK_FAILED, PR_LOOK_NOGIT, PR_LOOK_NONE, PR_LOOK_SAID, PR_SHIP_FAILED, PR_SHIP_SAID, buildCiFix, forgetCopy, prsFacts, removeCopy } from '../../../core/prcard'
import type { NoGit, PrSession, PrsFacts } from '../../../core/prcard'
import { copiesOf, copiesSignature, isNotGit, isStartFailure, wtSeen } from '../../../core/crew3git'
import type { Copy } from '../../../core/crew3git'
import { fillIn } from '../../../core/fillin'
import { readRecord } from '../../../core/record'
import { serialUpdate } from '../../../core/serial'
import { Card, OpenLine, namePt, wrappedLines } from '../../../ui/kit'
import { shipNow } from '../../ship'
import type { HomeEngine } from '../engine'
import { fillOnce } from '../fillonce'
import type { Row } from '../logic'
import { moreOf } from '../parts'
import type { PaneCtx } from '../parts'
import { PR_LOOK } from '../rowact'
import type { RowAction } from '../rowact'
import { flags } from '../state'
import { LineCard } from './lines'
import type { LinesModel } from './lines'

export const PR_FIX_FILLED = 'The fix prompt is in the prompt box. Press Enter to send it.'
export const PR_FIX_NOFILL = 'Could not fill the prompt box. Run /vaken-ship ci-fix to see the prompt.'

export const prShipShown: { open?: string; lines?: string[] } = {}
const SHIP_LINES_MAX = 14
const GIT_PROBE_MS = 3_000

// With no branch known, one git call says whether the folder is a git folder at all; kept per folder, so the pane does not ask on every draw.
const NO_GIT_KEEP_MS = 10 * 60_000
const gitMem: { cwd?: string; at: number; noGit?: NoGit } = { at: 0 }
async function noGitOf(i: Io, cwd: string, now: number): Promise<NoGit | undefined> {
  if (gitMem.cwd === cwd && now - gitMem.at >= 0 && now - gitMem.at < NO_GIT_KEEP_MS) return gitMem.noGit
  let noGit: NoGit | undefined
  try {
    const g = await i.run(['git', 'rev-parse', '--git-common-dir'], { timeoutMs: GIT_PROBE_MS })
    // git says so in its own words, or with its fatal exit and no words
    noGit = g.exitCode !== 0 && (isNotGit(g.stderr) || (g.exitCode === 128 && g.stderr.trim() === '')) ? 'folder' : undefined
  } catch (err) {
    noGit = isStartFailure(err instanceof Error ? err.message : String(err)) ? 'program' : undefined
  }
  gitMem.cwd = cwd
  gitMem.at = now
  gitMem.noGit = noGit
  return noGit
}

// `copies`: Worktree cleanup is on, so the janitor's rows join from this session's last worktree scan (features/crew3.ts) and the shared PR answer
export async function loadPrs(i: Io, hidden: boolean, on: boolean, me: { id: string; cwd: string; branch?: string }, rows: Row[], now: number, copies = false): Promise<PrsFacts | undefined> {
  if (hidden) return undefined
  const sessions: PrSession[] = rows.map(r => ({ id: r.rec.sessionId, name: r.name, cwd: r.rec.cwd, ...(r.rec.branch === undefined ? {} : { branch: r.rec.branch }) }))
  if (!sessions.some(s => s.id === me.id)) sessions.push({ id: me.id, name: 'This session', cwd: me.cwd, ...(me.branch === undefined ? {} : { branch: me.branch }) })
  const branch = me.branch ?? sessions.find(s => s.id === me.id)?.branch
  const noGit = on && (branch === undefined || branch === '') ? await noGitOf(i, me.cwd, now) : undefined
  const raw = on ? await i.get(PR_SHARED_KEY) : undefined
  const f0 = prsFacts(raw, { id: me.id, ...(branch === undefined ? {} : { branch }), ...(noGit === undefined ? {} : { noGit }) }, sessions, now, on)
  // The scan is of this session's folder; before the record knows that folder, the scan's own stands in
  const here = me.cwd === '' ? wtSeen.cwd : me.cwd
  const c = on && copies && here !== undefined && wtSeen.cwd === here ? copiesOf(wtSeen.scan, wtSeen.repo, raw, here, now) : undefined
  const f = c === undefined || (c.merged.length === 0 && c.idle.length === 0) ? f0 : { ...f0, copies: c }
  return prShipShown.lines !== undefined && prShipShown.open !== undefined && flags.openWhat === prShipShown.open ? { ...f, ship: prShipShown.lines } : f
}

// The ship verdict lines under the row that is open now (this card's See
export const shipShownNow = (): string[] | undefined => (prShipShown.lines !== undefined && prShipShown.open !== undefined && flags.openWhat === prShipShown.open ? prShipShown.lines : undefined)

export const prsSignature = (f: PrsFacts | undefined): string =>
  f === undefined ? '' : `${f.on}${f.look}${f.fail ?? ''}${f.noGit ?? ''}|${f.rows.map(r => `${r.key}${r.checks}${r.merge}${r.place ?? ''}${r.mine}${r.at}`).join(',')}|${f.ship?.length ?? 0}|${(f.merged ?? []).map(m => m.key).join(',')}|${copiesSignature(f.copies)}`

export function PrsCard(c: PaneCtx, m: LinesModel, grow: boolean) {
  const f = c.prefs.prs
  if (c.prefs.cardDetail.prs === 'explained' || f === undefined || !f.look || f.rows.length > 0) return LineCard(c, m, 'prs', grow)
  const { el } = c
  const { Box, Text } = el
  const v = m.card('prs')
  return Card(
    el,
    'prs',
    v.title,
    '',
    // A failed ask's step is a sentence that tells something: it wraps, never cut
    <Box flexDirection="column">{f.fail === undefined ? OpenLine(el, 'ol-prs:short', <Text wrap="truncate-end">{v.short}</Text>, false, () => c.act.run(PR_LOOK), { widthPt: c.widthPt, lines: 1, right: tr(LOOK_NOW) }) : OpenLine(el, 'ol-prs:short', <Text>{v.short}</Text>, false, () => c.act.run(PR_LOOK), { widthPt: c.widthPt, lines: wrappedLines(v.short, c.widthPt - namePt(tr(LOOK_NOW))), right: tr(LOOK_NOW) })}</Box>,
    { grow, ...moreOf(c, 'prs') },
  )
}

// One gh call about this branch's pull request (the PR check's own call), kept in the shared answer
async function lookNow(eng: HomeEngine, i: Io): Promise<void> {
  i.toast(tr(PR_LOOK_ASKING), true)
  const sid = await i.sessionId()
  const branch = (await readRecord(i, sid))?.branch
  const cwd = await eng.cwd()
  let repo: string | undefined
  try {
    const g = await i.run(['git', 'rev-parse', '--git-common-dir'], { timeoutMs: GIT_PROBE_MS })
    repo = g.exitCode === 0 ? resolveGitDir(cwd, g.stdout) : undefined
  } catch {
    repo = undefined
  }
  if (repo === undefined || branch === undefined || branch === '') {
    i.toast(tr(PR_LOOK_NOGIT), true)
    return
  }
  const now = await i.now()
  let facts: PrFacts = { at: now, branch }
  try {
    const r = await i.run([...PR_VIEW_ARGV], { timeoutMs: GH_TIMEOUT_MS })
    if (r.exitCode === 0) {
      const view = parsePrView(safeJson(r.stdout))
      facts = view === undefined ? { ...facts, error: 'odd' } : { ...facts, view }
    } else if (isNoPr(r.stderr)) facts = { ...facts, none: true }
    else facts = { ...facts, error: prFailOf(r.stderr, r.exitCode) }
  } catch (err) {
    facts = { ...facts, error: prFailThrown(err) }
  }
  const at = repo
  await serialUpdate(i, PR_SHARED_KEY, old => withSharedPr(old, at, branch, facts, now))
  i.toast(tr(facts.view !== undefined ? PR_LOOK_SAID : facts.none === true ? PR_LOOK_NONE : facts.error !== undefined ? PR_FAIL_SAY[prFailOf(facts.error)] : PR_LOOK_FAILED), true)
  i.invalidate()
}

async function fixNow(eng: HomeEngine, i: Io): Promise<void> {
  i.toast(tr(PR_FIX_READING), true)
  const built = await buildCiFix(i, async () => (await readRecord(i, await i.sessionId()))?.branch)
  if (built.kind !== 'prompt') {
    i.toast(tr(built.kind === 'refused' ? PR_FIX_REFUSED : built.kind === 'nofail' ? PR_FIX_NOFAIL : PR_FIX_NONE), true)
    return
  }
  i.toast(tr((await fillOnce(eng, built.prompt)) ? PR_FIX_FILLED : PR_FIX_NOFILL), true)
}

async function shipCheck(i: Io, open: string): Promise<void> {
  if (flags.openWhat === open) {
    flags.openWhat = undefined
    prShipShown.lines = undefined
  } else {
    try {
      prShipShown.lines = (await shipNow(i, tr)).split('\n').filter(l => l.trim() !== '').slice(0, SHIP_LINES_MAX)
      prShipShown.open = open
      flags.openWhat = open
      i.toast(tr(PR_SHIP_SAID), true)
    } catch {
      i.toast(tr(PR_SHIP_FAILED), true)
    }
  }
  i.invalidate()
}

// Remove this copy: only on the press, and only after removeCopy's checks pass; the toast says what happened or why nothing did
async function removeNow(eng: HomeEngine, i: Io, c: Copy): Promise<void> {
  i.toast(tr(COPY_CHECKING), true)
  const said = await removeCopy(i, c, await eng.cwd(), wtSeen.scan?.base ?? 'main')
  if (said.removed || said.gone === true) forgetCopy(c.path)
  i.toast(fillIn(tr(said.text), said.vars ?? {}), true)
  i.invalidate()
}

export const isPrAction = (a: RowAction): boolean => a.kind === 'prFix' || a.kind === 'prShip' || a.kind === 'prLook' || a.kind === 'copyRemove'
export async function runPrRow(eng: HomeEngine, a: RowAction): Promise<void> {
  const i = eng.io()
  if (a.kind === 'copyRemove') await removeNow(eng, i, a.copy)
  else if (a.kind === 'prFix') await fixNow(eng, i)
  else if (a.kind === 'prShip') await shipCheck(i, a.open)
  else if (a.kind === 'prLook') await lookNow(eng, i)
}
