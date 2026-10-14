// The Pull requests card: one row per open pull request, built only from the answer the PR check already shares between sessions, so no new polling. This session's own PR gets the next step; another session's says to fix it there.
import type { Io } from './io'
import { baseName, cut, isPath } from './crew3'
import { CHECKS_ARGV, CI_MAX_TRIES, CI_TRIES_KEY, NOT_GIT, ciPrompt, cleanLog, decideTry, isNotGit, mergeOrder, parseChecksText, parseTries, refusedText, runLogArgv } from './crew3git'
import { GH_TIMEOUT_MS, healthOf, isNoPr, prWords, tally } from './crewpr'
import type { PrFacts } from './crewpr'
import { hhmm } from './time'
import type { WhatIs } from './whatis'
import { fillIn } from './fillin'
import { tEn } from '../i18n/t'

// Nobody asked GitHub about that branch for a long time.
export const PRS_SHOW_MS = 3 * 3_600_000
// The shared answer keeps at most 20.
const PRS_MAX = 12

type PrView = NonNullable<PrFacts['view']>
export type PrChecks = 'failing' | 'running' | 'passing' | 'none'
export type PrMerge = 'conflicts' | 'behind' | 'draft' | 'review' | 'ready' | 'unknown'
export type PrPress = 'fix' | 'ship'
export type PrRow = { key: string; repo: string; repoName: string; branch: string; number: number; at: number; view: PrView; checks: PrChecks; merge: PrMerge; place?: number; of?: number; mine: boolean; session?: string }
export type PrSession = { id: string; name: string; cwd: string; branch?: string }
// The ship verdict is in memory only, while that row is open.
export type PrsFacts = { on: boolean; rows: PrRow[]; look: boolean; ship?: string[] }

const isFacts = (v: unknown): v is PrFacts => typeof v === 'object' && v !== null && typeof (v as PrFacts).at === 'number'
// The shared answer is keyed by the git common folder.
export const repoRoot = (repo: string): string => repo.replace(/[\\/]+$/, '').replace(/[\\/]\.git$/, '')

// This session wins a tie, so its own pull request is its own.
function ownerOf(repo: string, branch: string, sessions: PrSession[], me: string): PrSession | undefined {
  const same = sessions.filter(s => s.branch !== undefined && s.branch !== '' && s.branch === branch).sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : 0))
  const inside = same.filter(s => isPath(s.cwd, repoRoot(repo)))
  return inside[0] ?? (same.length === 1 ? same[0] : undefined)
}

const checksOf = (v: PrView): PrChecks => {
  const h = healthOf(tally(v.checks))
  return h === 'pending' ? 'running' : h
}
export function mergeOf(v: PrView): PrMerge {
  if (v.mergeable === 'CONFLICTING' || v.mergeState === 'DIRTY') return 'conflicts'
  if (v.mergeState === 'BEHIND') return 'behind'
  if (v.isDraft) return 'draft'
  if (v.review === 'REVIEW_REQUIRED' || v.review === 'CHANGES_REQUESTED') return 'review'
  return v.mergeable === 'MERGEABLE' ? 'ready' : 'unknown'
}
export const pressOf = (r: PrRow): PrPress | undefined => (!r.mine ? undefined : r.checks === 'failing' ? 'fix' : r.checks !== 'running' && r.merge === 'ready' ? 'ship' : undefined)

export function prsFacts(raw: unknown, me: { id: string; branch?: string }, sessions: PrSession[], now: number, on: boolean): PrsFacts {
  if (!on) return { on, rows: [], look: false }
  const entries = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? Object.entries(raw as Record<string, unknown>) : []
  const found = new Map<string, PrRow>()
  let mineKnown = false
  for (const [id, f] of entries) {
    if (!isFacts(f) || now - f.at < 0 || now - f.at > PRS_SHOW_MS) continue
    const cutAt = id.indexOf('\n')
    const repo = cutAt < 0 ? id : id.slice(0, cutAt)
    const branch = f.branch ?? (cutAt < 0 ? '' : id.slice(cutAt + 1))
    const owner = branch === '' ? undefined : ownerOf(repo, branch, sessions, me.id)
    const mine = owner?.id === me.id
    // A failed ask does not count, so Look now stays.
    if (mine && (f.view !== undefined || f.none === true)) mineKnown = true
    const v = f.view
    if (v === undefined || v.state !== 'OPEN') continue
    const at = `${repo}#${v.number}`
    const old = found.get(at)
    if (old !== undefined && old.at >= f.at) continue
    const repoName = baseName(repoRoot(repo))
    found.set(at, { key: `pr-${repoName}-${v.number}`, repo, repoName, branch, number: v.number, at: f.at, view: v, checks: checksOf(v), merge: mergeOf(v), mine, ...(owner === undefined || mine ? {} : { session: owner.name }) })
  }
  const mineAt = sessions.find(s => s.id === me.id)?.cwd
  const repos = [...new Set([...found.values()].map(r => r.repo))].sort((a, b) => {
    const here = (r: string): number => ([...found.values()].some(x => x.repo === r && x.mine) || (mineAt !== undefined && isPath(mineAt, repoRoot(r))) ? 0 : 1)
    return here(a) - here(b) || baseName(repoRoot(a)).localeCompare(baseName(repoRoot(b)))
  })
  const rows: PrRow[] = []
  for (const repo of repos) {
    const list = [...found.values()].filter(r => r.repo === repo)
    const placed = mergeOrder(list.map(r => ({ number: r.number, title: '', head: r.branch, base: '', mergeable: r.view.mergeable, files: [] })))
    for (const p of placed) {
      const r = list.find(x => x.number === p.pr.number)
      if (r !== undefined) rows.push(list.length > 1 ? { ...r, place: p.place, of: list.length } : r)
    }
  }
  return { on, rows: rows.slice(0, PRS_MAX), look: me.branch !== undefined && me.branch !== '' && !mineKnown }
}

export const prsLoud = (f: PrsFacts | undefined): 'failing' | 'open' | 'none' => (f === undefined || f.rows.length === 0 ? 'none' : f.rows.some(r => r.checks === 'failing') ? 'failing' : 'open')


const MERGE_WORD: Record<PrMerge, string> = { conflicts: 'conflicts', behind: 'behind', draft: 'draft', review: 'needs review', ready: 'ready', unknown: 'open' }
const PRESS_WORD: Record<PrPress, string> = { fix: 'Fix', ship: 'Check if ready' }
export const LOOK_NOW = 'Look now'

const ageOf = (ms: number, t: (s: string) => string): string => {
  const m = Math.floor(ms / 60_000)
  return m < 1 ? t('under 1 min') : m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h` : `${Math.floor(m / 1440)} d`
}

export const prTitle = (r: PrRow): string => `${r.of !== undefined && r.of > 1 ? `${r.place}. ` : ''}#${r.number} ${cut(r.branch, 60)}`

// `now`: a running or failing row read long ago says how old the reading is.
export const PRS_STALE_MS = 5 * 60_000
export function prRight(r: PrRow, t: (s: string) => string, now?: number): string {
  const parts: string[] = []
  if (r.checks === 'failing' || r.checks === 'running') parts.push(t(r.checks))
  if (r.merge !== 'ready' && r.merge !== 'unknown') parts.push(t(MERGE_WORD[r.merge]))
  if (parts.length === 0) parts.push(t(r.merge === 'ready' ? 'ready' : r.checks === 'passing' ? 'passing' : 'open'))
  const press = pressOf(r)
  if (press !== undefined) parts.push(t(PRESS_WORD[press]))
  if (now !== undefined && (r.checks === 'failing' || r.checks === 'running') && now - r.at > PRS_STALE_MS) parts.push(fillIn(t('read {age} ago'), { age: ageOf(now - r.at, t) }))
  return parts.join(' · ')
}

export function prsShort(f: PrsFacts, t: (s: string) => string): string {
  if (!f.on) return t('Off')
  if (f.rows.length === 0) return f.look ? t('Not checked on GitHub yet') : t('None open')
  const failing = f.rows.filter(r => r.checks === 'failing').length
  const running = f.rows.filter(r => r.checks === 'running').length
  const n = (s: string, k: number): string => t(s).replace('{n}', String(k))
  return [n('{n} open', f.rows.length), ...(failing > 0 ? [n('{n} failing', failing)] : []), ...(running > 0 ? [n('{n} running', running)] : [])].join(' · ')
}

export const PRS_MEANS = 'A pull request (PR) vaken knows of: its checks, and whether GitHub can merge it. The PR check asks GitHub after a push and while checks run.'
export function prWhat(r: PrRow, now: number, ship?: string[], t: (s: string) => string = s => s): WhatIs {
  const failed = r.view.checks.filter(c => c.state === 'failed').map(c => c.name)
  const press = pressOf(r)
  const fi = (x: string, v: Record<string, string | number>): string => fillIn(t(x), v)
  const facts = [
    prWords(r.view, {}, now, t),
    ...(failed.length === 0 ? [] : [`${fi('Failed: {names}', { names: failed.slice(0, 4).join(', ') })}${failed.length > 4 ? ` ${fi('and {n} more', { n: failed.length - 4 })}` : ''}.`]),
    ...(r.merge === 'behind' ? [t('It is behind its base branch: it needs an update first.')] : r.merge === 'review' ? [t('It still needs a review.')] : []),
    ...(r.of !== undefined && r.of > 1 ? [fi('Merge it {where} of {of}, by what GitHub says can merge. /vaken-ship merge-order also weighs the files.', { where: r.place === 1 ? t('first') : fi('as number {n}', { n: r.place ?? '' }), of: r.of })] : []),
    `${fi('Asked GitHub at {time}.', { time: hhmm(r.at) })} ${r.mine ? t('From this session.') : r.session !== undefined ? fi('From the session {name}.', { name: r.session }) : t('From a session that is not open now.')}`,
    ...(ship ?? []),
  ]
  const next = !r.mine
    ? `${fi('Fix it in that session{who}.', { who: r.session === undefined ? '' : ` (${r.session})` })} ${t('Vaken does not act in another session.')}`
    : press === 'fix'
      ? t('Press to put a fix request, with the failing check\'s log, in the prompt box. Press Enter to send it. At most 3 tries a day. /vaken-ship ci-fix send does the same.')
      : press === 'ship'
        ? t('Press to see if the work looks ready, as /vaken-ship says. Merging stays your press.')
        : t('Type /vaken-ship pr for the checks, or /vaken-ship merge-order for the order.')
  return { means: PRS_MEANS, facts, next, setting: 'crew.pr' }
}

// `press` says what a row does; the pane turns it into a typed row action.
export type PrsGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: PrPress | 'look' }
export type PrsView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups?: { head: string; rows: PrsGroupRow[] }[] }
export const LOOK_WHAT: WhatIs = { means: 'No pull request (PR) found for this branch yet. Vaken asks GitHub after a push and while checks run.', next: 'Press to ask GitHub once now.', setting: 'crew.pr' }
const OFF_WHAT: WhatIs = { means: 'The pull request (PR) check is off, so vaken does not ask GitHub about them.', next: 'Turn on PR and checks in Settings.', setting: 'crew.pr' }
const NONE_WHAT: WhatIs = { means: PRS_MEANS, next: 'Open a pull request, then push: the card shows it.', setting: 'crew.pr' }
export const LOOK_KEY = 'look'

export function prsView(f: PrsFacts | undefined, now: number, t: (s: string) => string): PrsView {
  const base = { title: 'Pull requests', blurb: t('Open now') }
  const facts = f ?? { on: true, rows: [], look: false }
  const short = prsShort(facts, t)
  if (!facts.on) return { ...base, short, lines: [t('PR checks are off.')], whats: [OFF_WHAT], shortWhat: OFF_WHAT }
  const repos = [...new Set(facts.rows.map(r => r.repoName))]
  const groups: { head: string; rows: PrsGroupRow[] }[] = repos.map(name => ({
    head: name,
    rows: facts.rows.filter(r => r.repoName === name).map(r => ({ key: r.key, title: prTitle(r), right: prRight(r, t, now), what: prWhat(r, now, pressOf(r) === 'ship' ? facts.ship : undefined, t), ...(pressOf(r) === undefined ? {} : { press: pressOf(r) }) })),
  }))
  if (facts.look) groups.unshift({ head: t('This branch'), rows: [{ key: LOOK_KEY, title: t('Not checked on GitHub yet'), right: t(LOOK_NOW), what: LOOK_WHAT, press: 'look' }] })
  if (groups.length === 0) return { ...base, short, lines: [t('No open pull request seen.')], whats: [NONE_WHAT], shortWhat: NONE_WHAT }
  const lines = facts.rows.map(r => `${prTitle(r)}: ${prRight(r, t, now)}`)
  return { ...base, short, lines: lines.length === 0 ? [t('Not checked on GitHub yet')] : lines, whats: lines.length === 0 ? [LOOK_WHAT] : facts.rows.map(r => prWhat(r, now, undefined, t)), shortWhat: facts.look && facts.rows.length === 0 ? LOOK_WHAT : NONE_WHAT, groups }
}

export function prsText(f: PrsFacts | undefined): string[] {
  if (f === undefined) return []
  if (!f.on) return ['Pull requests: the PR check is off. /vaken-settings crew.pr on turns it on.']
  const id = (s: string): string => s
  const head = `Pull requests: ${f.rows.length === 0 ? (f.look ? 'not checked on GitHub yet for this branch' : 'none open') : prsShort(f, id)} · /vaken-ship pr`
  return [head, ...f.rows.map(r => `${prTitle(r)} (${r.repoName}): ${prRight(r, id)}${r.mine ? '' : r.session === undefined ? ', another session' : `, in ${r.session}`} · /vaken-ship pr`)]
}


export type CiFix = { kind: 'prompt'; head: string; prompt: string } | { kind: 'refused' | 'nofail' | 'none'; text: string }
type Ran = { code: number; out: string; err: string }
async function ran(i: Io, argv: readonly string[], timeoutMs: number): Promise<Ran | undefined> {
  try {
    const r = await i.run([...argv], { timeoutMs })
    return { code: r.exitCode, out: r.stdout, err: r.stderr }
  } catch {
    return undefined
  }
}
const firstLine = (text: string): string => (text.trim().split('\n')[0] ?? '').slice(0, 500)

// At most 3 tries a day per branch, shared with the command. The log is cut and never stored; `branchOf` is asked only once a check failed.
export async function buildCiFix(i: Io, branchOf: () => Promise<string | undefined>): Promise<CiFix> {
  const c = await ran(i, CHECKS_ARGV, GH_TIMEOUT_MS)
  if (c === undefined) return { kind: 'none', text: 'Fix CI: gh did not answer in time.' }
  if (isNotGit(c.err)) return { kind: 'none', text: NOT_GIT }
  const checks = parseChecksText(c.out)
  if (checks.length === 0) return { kind: 'none', text: isNoPr(c.err) ? 'Fix CI: there is no pull request for this branch.' : `Fix CI: no checks were found${c.err.trim() === '' ? '' : ` (${firstLine(c.err)})`}.` }
  const failed = checks.filter(x => x.bucket === 'fail')
  const pick = failed[0]
  if (pick === undefined) {
    const waiting = checks.filter(x => x.bucket === 'pending').length
    return { kind: 'nofail', text: waiting > 0 ? `Fix CI: no check failed. ${tEn('words.still_running', { n: waiting })}.` : 'Fix CI: no check failed. Nothing to fix.' }
  }
  const branch = (await branchOf()) ?? 'this branch'
  const now = await i.now()
  const d = decideTry(parseTries(await i.get(CI_TRIES_KEY)), branch, `${pick.runId ?? 'none'}:${pick.name}`, now)
  if (!d.allowed) return { kind: 'refused', text: `Fix CI: ${refusedText(branch, d, now)}` }
  if (!d.repeat) await i.set(CI_TRIES_KEY, d.next)
  const log = pick.runId === undefined ? undefined : await ran(i, runLogArgv(pick.runId), GH_TIMEOUT_MS)
  const prompt = ciPrompt(pick.name, log !== undefined && log.out !== '' ? cleanLog(log.out) : [])
  const others = failed.slice(1).map(x => x.name)
  const head = `Fix CI: try ${d.count} of ${CI_MAX_TRIES} in 24 hours for ${branch}.${others.length === 0 ? '' : ` Other checks that failed: ${others.slice(0, 4).join(', ')}${others.length > 4 ? ` and ${others.length - 4} more` : ''}.`}`
  return { kind: 'prompt', head, prompt }
}

export const PR_FIX_READING = 'Reading the failing check'
export const PR_FIX_REFUSED = 'Made a fix request 3 times in 24 hours, and a check still fails. Look at the failure yourself.'
export const PR_FIX_NOFAIL = 'No check fails now. Nothing to fix.'
export const PR_FIX_NONE = 'Could not read the checks. Type /vaken-ship ci-fix in the session.'
export const PR_SHIP_SAID = 'Here is the ship check. Nothing was merged.'
export const PR_SHIP_FAILED = 'Could not make the ship check here. Type /vaken-ship in the session.'
export const PR_LOOK_ASKING = 'Asking GitHub'
export const PR_LOOK_SAID = 'Asked GitHub. The card shows what it said.'
export const PR_LOOK_NONE = 'This branch has no pull request.'
export const PR_LOOK_FAILED = 'Could not ask GitHub. Type /vaken-ship pr to see why.'
export const PR_LOOK_NOGIT = 'This folder is not in a git repository.'

