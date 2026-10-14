// The rows, words and order are in core/prcard.ts; it is a line card (home/linecards.ts prsCard), so Full shows grouped rows and Short one line.
import { tr } from '../../../core/lang'
import type { Io } from '../../../core/io'
import { resolveGitDir } from '../../../core/crew'
import { GH_TIMEOUT_MS, PR_SHARED_KEY, PR_VIEW_ARGV, isNoPr, parsePrView, safeJson, withSharedPr } from '../../../core/crewpr'
import type { PrFacts } from '../../../core/crewpr'
import { LOOK_NOW, PR_FIX_NOFAIL, PR_FIX_NONE, PR_FIX_READING, PR_FIX_REFUSED, PR_LOOK_ASKING, PR_LOOK_FAILED, PR_LOOK_NOGIT, PR_LOOK_NONE, PR_LOOK_SAID, PR_SHIP_FAILED, PR_SHIP_SAID, buildCiFix, prsFacts } from '../../../core/prcard'
import type { PrSession, PrsFacts } from '../../../core/prcard'
import { readRecord } from '../../../core/record'
import { serialUpdate } from '../../../core/serial'
import { Card, OpenLine } from '../../../ui/kit'
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

export async function loadPrs(i: Io, hidden: boolean, on: boolean, me: { id: string; cwd: string; branch?: string }, rows: Row[], now: number): Promise<PrsFacts | undefined> {
  if (hidden) return undefined
  const sessions: PrSession[] = rows.map(r => ({ id: r.rec.sessionId, name: r.name, cwd: r.rec.cwd, ...(r.rec.branch === undefined ? {} : { branch: r.rec.branch }) }))
  if (!sessions.some(s => s.id === me.id)) sessions.push({ id: me.id, name: 'This session', cwd: me.cwd, ...(me.branch === undefined ? {} : { branch: me.branch }) })
  const branch = me.branch ?? sessions.find(s => s.id === me.id)?.branch
  const f = prsFacts(on ? await i.get(PR_SHARED_KEY) : undefined, { id: me.id, ...(branch === undefined ? {} : { branch }) }, sessions, now, on)
  return prShipShown.lines !== undefined && prShipShown.open !== undefined && flags.openWhat === prShipShown.open ? { ...f, ship: prShipShown.lines } : f
}

// The ship verdict lines under the row that is open now (this card's Check if ready
export const shipShownNow = (): string[] | undefined => (prShipShown.lines !== undefined && prShipShown.open !== undefined && flags.openWhat === prShipShown.open ? prShipShown.lines : undefined)

export const prsSignature = (f: PrsFacts | undefined): string =>
  f === undefined ? '' : `${f.on}${f.look}|${f.rows.map(r => `${r.key}${r.checks}${r.merge}${r.place ?? ''}${r.mine}${r.at}`).join(',')}|${f.ship?.length ?? 0}`

export function PrsCard(c: PaneCtx, m: LinesModel, grow: boolean) {
  const f = c.prefs.prs
  if (c.prefs.cardDetail.prs === 'explained' || f === undefined || !f.look || f.rows.length > 0) return LineCard(c, m, 'prs', grow)
  const { el } = c
  const { Box, Text } = el
  const v = m.views.prs
  return Card(
    el,
    'prs',
    v.title,
    '',
    <Box flexDirection="column">{OpenLine(el, 'ol-prs:short', <Text wrap="truncate-end">{v.short}</Text>, false, () => c.act.run(PR_LOOK), { widthPt: c.widthPt, lines: 1, right: tr(LOOK_NOW) })}</Box>,
    { grow, ...moreOf(c, 'prs') },
  )
}

const firstLine = (text: string): string => (text.trim().split('\n')[0] ?? '').slice(0, 500)

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
      facts = view === undefined ? { ...facts, error: 'gh answered with something unexpected' } : { ...facts, view }
    } else if (isNoPr(r.stderr)) facts = { ...facts, none: true }
    else facts = { ...facts, error: firstLine(r.stderr) || `gh stopped with code ${r.exitCode}` }
  } catch {
    facts = { ...facts, error: 'gh did not answer in time' }
  }
  const at = repo
  await serialUpdate(i, PR_SHARED_KEY, old => withSharedPr(old, at, branch, facts, now))
  i.toast(tr(facts.view !== undefined ? PR_LOOK_SAID : facts.none === true ? PR_LOOK_NONE : PR_LOOK_FAILED), true)
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

export const isPrAction = (a: RowAction): boolean => a.kind === 'prFix' || a.kind === 'prShip' || a.kind === 'prLook'
export async function runPrRow(eng: HomeEngine, a: RowAction): Promise<void> {
  const i = eng.io()
  if (a.kind === 'prFix') await fixNow(eng, i)
  else if (a.kind === 'prShip') await shipCheck(i, a.open)
  else if (a.kind === 'prLook') await lookNow(eng, i)
}
