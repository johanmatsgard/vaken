// The Pull requests card: one row per open pull request, built only from the answer the PR check already shares between sessions, so no new polling. This session's own PR gets the next step; another session's says to fix it there.
import type { Io } from './io'
import { baseName, isPath } from './crew3'
import { CHECKS_ARGV, CI_MAX_TRIES, CI_TRIES_KEY, GIT_TIMEOUT_MS, NOT_GIT, WORKTREE_LIST_ARGV, branchDeleteArgv, ciPrompt, cleanLog, copiesSignature, decideTry, isNotGit, mergeOrder, parseChecksText, parseTries, parseWorktrees, refusedText, removeArgv, runLogArgv, unpushedArgv, wtSeen } from './crew3git'
import type { Copies, Copy } from './crew3git'
import { listRecords } from './record'
import { GH_TIMEOUT_MS, PR_FAIL_ROW, PR_FAIL_SAY, healthOf, isFacts, isNoPr, prFailOf, prFailThrown, prWords, tally } from './crewpr'
import type { PrFacts, PrFail } from './crewpr'
import { RECENT_SHOW_MS } from './time'
import { fmt } from './fmt'
import { langNow, tEn, tr } from '../i18n/t'
import type { WhatIs } from './whatis'
import { fillIn, same as asIs } from './fillin'

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
// The ship verdict is in memory only, while that row is open. `merged`: pull requests seen merged within RECENT_SHOW_MS, newest first.
export type PrMerged = { key: string; number: number; branch: string; repoName: string; at: number }
// `fail`: this branch's last ask of GitHub failed, and why (core/crewpr.ts PrFail). `noGit`: the session's folder is not a git folder, or git is not installed.
export type NoGit = 'folder' | 'program'
// `copies`: the worktree janitor's rows (core/crew3git.ts copiesOf), only while Worktree cleanup is on
export type PrsFacts = { on: boolean; rows: PrRow[]; look: boolean; ship?: string[]; merged?: PrMerged[]; fail?: PrFail; noGit?: NoGit; copies?: Copies }

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
// No Fix press: the Desktop app's PR monitor shows CI and offers Auto-fix
export const pressOf = (r: PrRow): PrPress | undefined => (r.mine && r.checks !== 'failing' && r.checks !== 'running' && r.merge === 'ready' ? 'ship' : undefined)

export function prsFacts(raw: unknown, me: { id: string; branch?: string; noGit?: NoGit }, sessions: PrSession[], now: number, on: boolean): PrsFacts {
  if (!on) return { on, rows: [], look: false }
  const entries = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? Object.entries(raw as Record<string, unknown>) : []
  const found = new Map<string, PrRow>()
  let mineKnown = false
  let fail: { at: number; kind: PrFail } | undefined
  const merged: PrMerged[] = []
  for (const [id, f] of entries) {
    if (!isFacts(f) || now - f.at < 0) continue
    const cutAt = id.indexOf('\n')
    const repo = cutAt < 0 ? id : id.slice(0, cutAt)
    const branch = f.branch ?? (cutAt < 0 ? '' : id.slice(cutAt + 1))
    if (f.view?.state === 'MERGED' && now - f.at <= RECENT_SHOW_MS) {
      const repoName = baseName(repoRoot(repo))
      merged.push({ key: `merged-${repoName}-${f.view.number}`, number: f.view.number, branch, repoName, at: f.at })
    }
    if (now - f.at > PRS_SHOW_MS) continue
    const owner = branch === '' ? undefined : ownerOf(repo, branch, sessions, me.id)
    const mine = owner?.id === me.id
    // A failed ask does not count, so Look now stays.
    if (mine && (f.view !== undefined || f.none === true)) mineKnown = true
    else if (mine && f.error !== undefined && (fail === undefined || f.at > fail.at)) fail = { at: f.at, kind: prFailOf(f.error) }
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
  const recent = merged.filter(m => !rows.some(r => r.repoName === m.repoName && r.number === m.number)).sort((a, b) => b.at - a.at)
  const look = me.branch !== undefined && me.branch !== '' && !mineKnown
  return { on, rows: rows.slice(0, PRS_MAX), look, ...(recent.length === 0 ? {} : { merged: recent.slice(0, PRS_MAX) }), ...(look && fail !== undefined ? { fail: fail.kind } : {}), ...(!look && me.noGit !== undefined ? { noGit: me.noGit } : {}) }
}

// This card stays calm on a failing check; the app's PR monitor handles CI
// A merged copy to remove brings the card out too (calm, never loud)
export const prsLoud = (f: PrsFacts | undefined): 'failing' | 'open' | 'none' => (f === undefined || (f.rows.length === 0 && (f.copies?.merged.length ?? 0) === 0) ? 'none' : 'open')


const MERGE_WORD: Record<PrMerge, string> = { conflicts: 'conflicts', behind: 'behind', draft: 'draft', review: 'needs review', ready: 'ready', unknown: 'open' }
const PRESS_WORD: Record<PrPress, string> = { fix: 'Fix', ship: 'See' }
export const LOOK_NOW = 'Look now'

// `place`: the merge order number leads, on the Pull requests card only. The branch is whole: a long one wraps, never cut
export const prTitle = (r: PrRow, place = true): string => `${place && r.of !== undefined && r.of > 1 ? `${r.place}. ` : ''}#${r.number} ${r.branch}`

// `now`: a running or failing row read long ago says how old the reading is.
export const PRS_STALE_MS = 5 * 60_000
// No CI words: the Desktop app's PR monitor shows the checks. `now` is kept for the callers.
export function prRight(r: PrRow, t: (s: string) => string, _now?: number): string {
  const parts: string[] = []
  if (r.merge !== 'ready' && r.merge !== 'unknown') parts.push(t(MERGE_WORD[r.merge]))
  const press = pressOf(r)
  // The row says one thing: a pull request that can merge says ready, and the press asks the ship verdict ("See")
  if (parts.length === 0) parts.push(t(r.merge === 'ready' && r.checks !== 'failing' && r.checks !== 'running' ? 'ready' : 'open'))
  if (press !== undefined) parts.push(t(PRESS_WORD[press]))
  return parts.join(' · ')
}

// `now`: with it, a pull request merged lately is the line when none is open ("#12 merged · 2 h ago")
export function prsShort(f: PrsFacts, t: (s: string) => string, now?: number): string {
  if (!f.on) return t('Off')
  const last = withoutCovered(f).merged?.[0]
  if (f.rows.length === 0 && f.look && f.fail !== undefined) return t(PR_FAIL_ROW[f.fail])
  if (f.rows.length === 0 && f.noGit !== undefined && last === undefined) return t(NOGIT_LINE[f.noGit])
  const copy = f.copies?.merged[0]
  if (f.rows.length === 0 && !f.look && last === undefined && copy !== undefined) return fillIn(t('{name} is merged'), { name: copy.name })
  if (f.rows.length === 0) return f.look ? t('Not checked on GitHub yet') : last !== undefined && now !== undefined ? `${fillIn(t('#{n} merged'), { n: last.number })} · ${fmt.ago(now - last.at, 'days', langNow())}` : t('No open pull request')
  return t('{n} open').replace('{n}', String(f.rows.length))
}

// The verdict of /vaken-ship as plain fact rows: no headings ("What blocks it:"), no "  - " bullets, and no line about a row the card already lists (`listed`: their titles).
// Nor a "Name: state" line that repeats a sentence ("Tests: not run"), the confidence score, or a line that hands out commands.
// `head`: keep the verdict's first line ("Ship it: not yet."), for a row whose title does not already say it (a pull request's)
const REPEAT = /^[^.:/]{1,40}: /
const SCORE = /^(Confidence|Säkerhet)\b/
export function plainVerdict(lines: readonly string[], listed: readonly string[] = [], head = false): string[] {
  const seen = listed.map(x => x.toLowerCase())
  const out: string[] = []
  const first = lines.find(l => l.trim() !== '')
  for (const raw of lines) {
    const line = raw.trim().replace(/^[-•]\s+/, '')
    if (head && raw === first && line !== '') {
      out.push(line)
      continue
    }
    if (line === '' || /:$/.test(line) || REPEAT.test(line) || SCORE.test(line) || line.includes('/vaken-')) continue
    if (seen.some(x => x !== '' && line.toLowerCase().startsWith(x))) continue
    const plain = `${line.charAt(0).toUpperCase()}${line.slice(1)}`
    if (!out.includes(plain)) out.push(plain)
  }
  return out
}

export const PRS_MEANS = 'A pull request (PR) vaken knows of, in any repository and session: which session owns it, and whether GitHub can merge it or it needs a review. The app\'s own PR panel shows its checks.'
export function prWhat(r: PrRow, now: number, ship?: string[], t: (s: string) => string = s => s): WhatIs {
  // The failed checks' names stay in the open detail: Needs you's pull request row reads them (home/needs.ts)
  const failed = r.view.checks.filter(c => c.state === 'failed').map(c => c.name)
  const press = pressOf(r)
  const fi = (x: string, v: Record<string, string | number>): string => fillIn(t(x), v)
  const facts = [
    prWords(r.view, {}, now, t),
    ...(failed.length === 0 ? [] : [`${fi('Failed: {names}', { names: failed.slice(0, 4).join(', ') })}${failed.length > 4 ? ` ${fi('and {n} more', { n: failed.length - 4 })}` : ''}.`]),
    ...(r.merge === 'behind' ? [t('It is behind its base branch: it needs an update first.')] : r.merge === 'review' ? [t('It still needs a review.')] : []),
    ...(r.of !== undefined && r.of > 1 ? [fi('Merge it {where} of {of}, by what GitHub says can merge. /vaken-ship merge-order also weighs the files.', { where: r.place === 1 ? t('first') : fi('as number {n}', { n: r.place ?? '' }), of: r.of })] : []),
    `${fi('Asked GitHub {ago}.', { ago: fmt.ago(Math.max(0, now - r.at), 'days', langNow()) })} ${r.mine ? t('From this session.') : r.session !== undefined ? fi('From the session {name}.', { name: r.session }) : t('From a session that is not open now.')}`,
    ...plainVerdict(ship ?? [], [], true),
  ]
  const next = !r.mine
    ? `${fi('Fix it in that session{who}.', { who: r.session === undefined ? '' : ` (${r.session})` })} ${t('Vaken does not act in another session.')}`
    : press === 'ship'
        ? t('Press to see if the work looks ready, as /vaken-ship says. Merging stays your press.')
        : t('Type /vaken-ship pr for the checks, or /vaken-ship merge-order for the order.')
  return { means: PRS_MEANS, facts, next, setting: 'crew.pr' }
}

// `press` says what a row does; the pane turns it into a typed row action.
// `wrap`: a pull request's title wraps, a long branch inside its word, never cut
// `copy`: the merged worktree a 'remove' press removes
// `middle`: a word too wide for the row (a folder name) is cut in the middle, as a path, so the sentence stays whole
export type PrsGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: PrPress | 'look' | 'remove'; wrap?: boolean; copy?: Copy; middle?: boolean }
export type PrsView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups?: { head: string; rows: PrsGroupRow[] }[] }
export const LOOK_WHAT: WhatIs = { means: 'No pull request (PR) found for this branch yet. Vaken asks GitHub after a push and while checks run.', next: 'Press to ask GitHub once now.', setting: 'crew.pr' }
const OFF_WHAT: WhatIs = { means: 'The pull request (PR) check is off, so vaken does not ask GitHub about them.', next: 'Turn on PR and checks in Settings.', setting: 'crew.pr' }
const NONE_WHAT: WhatIs = { means: PRS_MEANS, next: 'Open a pull request, then push: the card shows it.', setting: 'crew.pr' }
export const LOOK_KEY = 'look'
// No git folder: the card says so once, with what makes it work.
const NOGIT_LINE: Record<NoGit, string> = { folder: 'This folder is not in a git repository.', program: 'git is not installed or not on the path.' }
const NOGIT_WHAT: WhatIs = { means: 'Pull requests belong to a git repository. This session\'s folder is not in one, so there is nothing to ask GitHub.', next: 'Open a session in a git repository to see its pull requests.', setting: 'crew.pr' }
const failWhat = (k: PrFail): WhatIs => ({ means: PR_FAIL_SAY[k], next: 'Press to ask GitHub once now.', setting: 'crew.pr' })

export function prsView(f: PrsFacts | undefined, now: number, t: (s: string) => string): PrsView {
  const base = { title: 'Pull requests', blurb: t('Open now') }
  const facts = withoutCovered(f ?? { on: true, rows: [], look: false })
  const short = prsShort(facts, t, now)
  if (!facts.on) return { ...base, short, lines: [t('PR checks are off.')], whats: [OFF_WHAT], shortWhat: OFF_WHAT }
  const repos = [...new Set(facts.rows.map(r => r.repoName))]
  // Two repositories or more: each one's first row names it (a divider alone does not say which); a merged row names its own, as the Merged group mixes them
  const named = new Set([...repos, ...(facts.merged ?? []).map(m => m.repoName)]).size > 1
  const groups: { head: string; rows: PrsGroupRow[] }[] = repos.map(name => ({
    head: name,
    rows: facts.rows.filter(r => r.repoName === name).map((r, n) => ({ key: r.key, title: named && n === 0 ? `${name}: ${prTitle(r)}` : prTitle(r), wrap: true, right: prRight(r, t, now), what: prWhat(r, now, pressOf(r) === 'ship' ? facts.ship : undefined, t), ...(pressOf(r) === undefined ? {} : { press: pressOf(r) }) })),
  }))
  if (facts.look) groups.unshift({ head: t('This branch'), rows: [{ key: LOOK_KEY, title: t(facts.fail === undefined ? 'Not checked on GitHub yet' : PR_FAIL_ROW[facts.fail]), ...(facts.fail === undefined ? {} : { wrap: true }), right: t(LOOK_NOW), what: facts.fail === undefined ? LOOK_WHAT : failWhat(facts.fail), press: 'look' }] })
  const merged = facts.merged ?? []
  if (merged.length > 0) groups.push({ head: t('Merged'), rows: merged.map(m => ({ key: m.key, title: named ? `${m.repoName}: ${fillIn(t('#{n} merged'), { n: m.number })}` : fillIn(t('#{n} merged'), { n: m.number }), right: fmt.ago(now - m.at, 'days', langNow()), what: { means: fillIn(t('Pull request {n} ({branch}) was merged. The line goes after a day.'), { n: m.number, branch: m.branch }), setting: 'crew.pr' } })) })
  const copies = copyRows(facts.copies, now, t)
  if (copies.length > 0) groups.push({ head: t('Worktrees'), rows: copies })
  if (groups.length === 0 && facts.noGit !== undefined) return { ...base, short, lines: [t(NOGIT_LINE[facts.noGit])], whats: [NOGIT_WHAT], shortWhat: NOGIT_WHAT }
  if (groups.length === 0) return { ...base, short, lines: [t('No open pull request')], whats: [NONE_WHAT], shortWhat: NONE_WHAT }
  const lines = facts.rows.map(r => `${prTitle(r)}: ${prRight(r, t, now)}`)
  const quiet = facts.look ? [t(facts.fail === undefined ? 'Not checked on GitHub yet' : PR_FAIL_ROW[facts.fail])] : merged.length > 0 ? merged.map(m => fillIn(t('#{n} merged'), { n: m.number })) : copies.map(c => c.title)
  const quietWhats = copies.length > 0 && merged.length === 0 && !facts.look ? copies.map(c => c.what) : quiet.map(() => (facts.look ? (facts.fail === undefined ? LOOK_WHAT : failWhat(facts.fail)) : NONE_WHAT))
  return { ...base, short, lines: lines.length === 0 ? quiet : lines, whats: lines.length === 0 ? quietWhats : facts.rows.map(r => prWhat(r, now, undefined, t)), shortWhat: facts.look && facts.rows.length === 0 ? (facts.fail === undefined ? LOOK_WHAT : failWhat(facts.fail)) : NONE_WHAT, groups }
}

// A merged pull request whose worktree row says it already ("… is merged" with Remove this copy) is not listed twice
const coveredBy = (m: PrMerged, c: Copies | undefined): boolean => (c?.merged ?? []).some(x => x.branch === m.branch && (x.pr === undefined || x.pr === m.number))
export function withoutCovered(f: PrsFacts): PrsFacts {
  if (f.merged === undefined || f.copies === undefined) return f
  const merged = f.merged.filter(m => !coveredBy(m, f.copies))
  const { merged: _drop, ...rest } = f
  return merged.length === 0 ? rest : { ...rest, merged }
}

// The worktree janitor's rows: one per merged copy, its press "Remove this copy"; one row for the copies idle over a day, which only opens.
// A folder name is whole and the sentence wraps on its words; a name wider than the row is cut in the middle, as a path (`middle`), so "is merged" stays.
export const COPY_MEANS = 'A copy of the project (a worktree) whose branch {branch} is merged. Remove this copy deletes the folder and the merged branch, after it checks again that nothing is uncommitted or unpushed and that no session works there.'
export const COPIES_IDLE_MEANS = 'Copies of the project (worktrees) with nothing uncommitted, no open pull request vaken knows of, and no commit for over a day.'
export const COPIES_IDLE_NEXT = 'Merge or remove each one yourself. Vaken offers Remove this copy only once a copy is merged.'
export const REMOVE_COPY = 'Remove this copy'
function copyRows(c: Copies | undefined, now: number, t: (s: string) => string): PrsGroupRow[] {
  if (c === undefined) return []
  const merged = c.merged.map((x): PrsGroupRow => ({ key: `copy-${x.path}`, title: fillIn(t('{name} is merged'), { name: x.name }), wrap: true, middle: true, right: t(REMOVE_COPY), press: 'remove', copy: x, what: { means: fillIn(t(COPY_MEANS), { branch: x.branch }), facts: [x.path], setting: 'crew.worktrees' } }))
  if (c.idle.length === 0) return merged
  const title = c.idle.length === 1 ? t('1 copy idle over a day') : fillIn(t('{n} copies idle over a day'), { n: c.idle.length })
  const facts = c.idle.map(x => fillIn(t('{name} on {branch}, last commit {ago}'), { name: x.name, branch: x.branch, ago: fmt.ago(Math.max(0, now - (x.at ?? now)), 'days', langNow()) }))
  return [...merged, { key: 'copies-idle', title, wrap: true, what: { means: t(COPIES_IDLE_MEANS), facts, next: t(COPIES_IDLE_NEXT), setting: 'crew.worktrees' } }]
}

export function prsText(f: PrsFacts | undefined): string[] {
  if (f === undefined) return []
  if (!f.on) return ['Pull requests: the PR check is off. /vaken-settings crew.pr on turns it on.']
  const id = (s: string): string => s
  const head = `Pull requests: ${f.rows.length === 0 ? (f.look ? (f.fail === undefined ? 'not checked on GitHub yet for this branch' : PR_FAIL_SAY[f.fail]) : f.noGit !== undefined ? NOGIT_LINE[f.noGit] : 'none open') : prsShort(f, id)} · /vaken-ship pr`
  return [head, ...f.rows.map(r => `${prTitle(r)} (${r.repoName}): ${prRight(r, id)}${r.mine ? '' : r.session === undefined ? ', another session' : `, in ${r.session}`} · /vaken-ship pr`)]
}


// `head` is English (the ledger keeps it); `said` is the same line in the language of this answer, built from its parts so a check's name is never taken for a word
export type CiFix = { kind: 'prompt'; head: string; said: string; prompt: string } | { kind: 'refused' | 'nofail' | 'none'; text: string }
type Ran = { code: number; out: string; err: string }
async function ran(i: Io, argv: readonly string[], timeoutMs: number): Promise<Ran | undefined> {
  try {
    const r = await i.run([...argv], { timeoutMs })
    return { code: r.exitCode, out: r.stdout, err: r.stderr }
  } catch {
    return undefined
  }
}

// The head line of a fix request, in the words `t` gives (English: `same`)
export function ciHead(count: number, branch: string, others: readonly string[], t: (s: string) => string): string {
  const first = fillIn(t('Fix CI: try {n} of {m} in 24 hours for {name}.'), { n: count, m: CI_MAX_TRIES, name: branch })
  if (others.length === 0) return first
  const more = others.length > 4 ? ` ${fillIn(t('and {n} more'), { n: others.length - 4 })}` : ''
  return `${first} ${fillIn(t('Other checks that failed: {list}.'), { list: `${others.slice(0, 4).join(', ')}${more}` })}`
}

const CI_FAIL_SAY: Record<PrFail, string> = {
  nogh: 'Fix CI: gh is not installed. Install it from cli.github.com, then sign in.',
  signin: 'Fix CI: gh is not signed in to GitHub. Type gh auth login in a terminal.',
  offline: 'Fix CI: could not reach GitHub.',
  slow: 'Fix CI: gh did not answer in time.',
  odd: 'Fix CI: no checks were found.',
}

// At most 3 tries a day per branch, shared with the command. The log is cut and never stored; `branchOf` is asked only once a check failed.
export async function buildCiFix(i: Io, branchOf: () => Promise<string | undefined>): Promise<CiFix> {
  let c: Ran
  try {
    const r = await i.run([...CHECKS_ARGV], { timeoutMs: GH_TIMEOUT_MS })
    c = { code: r.exitCode, out: r.stdout, err: r.stderr }
  } catch (err) {
    return { kind: 'none', text: CI_FAIL_SAY[prFailThrown(err)] }
  }
  if (isNotGit(c.err)) return { kind: 'none', text: NOT_GIT }
  const checks = parseChecksText(c.out)
  // gh's own error line is never shown: it is read into a plain reason.
  if (checks.length === 0) return { kind: 'none', text: isNoPr(c.err) ? 'Fix CI: there is no pull request for this branch.' : c.err.trim() === '' ? CI_FAIL_SAY.odd : CI_FAIL_SAY[prFailOf(c.err, c.code)] }
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
  const head = ciHead(d.count, branch, others, asIs)
  const said = ciHead(d.count, branch, others, tr)
  return { kind: 'prompt', head, said, prompt }
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

// Remove this copy (the worktree janitor): every check is made again at the press, in this order, and each refusal says why; nothing is forced.
// Never this session's own folder or a folder a live session works in. The folder goes with `git worktree remove` (refused by git when unclean),
// then its branch. Only paths, branch names, counts and times are read; no command text is kept.
export const REMOVE_TIMEOUT_MS = 60_000
export type RemoveSaid = { text: string; vars?: Record<string, string | number>; removed: boolean; gone?: boolean }
export const COPY_CHECKING = 'Checking the copy'
export const COPY_OWN = 'This session works in that copy, so it stays.'
export const COPY_LIVE = 'A session works in that copy now, so it stays.'
export const COPY_GONE = 'That copy is gone already.'
export const COPY_CHANGED = 'That copy changed since the last look. Nothing was removed.'
export const COPY_UNREAD = 'Could not read that copy. Nothing was removed.'
export const COPY_DIRTY_ONE = 'It has 1 change not committed. Nothing was removed.'
export const COPY_DIRTY = 'It has {n} changes not committed. Nothing was removed.'
export const COPY_UNPUSHED_ONE = 'It has 1 commit that is not pushed and not in {base}. Nothing was removed.'
export const COPY_UNPUSHED = 'It has {n} commits that are not pushed and not in {base}. Nothing was removed.'
export const COPY_IGNORED_ONE = 'It has 1 ignored file that would be deleted: {name}. Nothing was removed.'
export const COPY_IGNORED = 'It has {n} ignored files that would be deleted, such as {name}. Nothing was removed.'
export const COPY_NO_REMOVE = 'git could not remove it. Nothing was removed.'
export const COPY_REMOVED = 'Removed the copy {name} and its branch {branch}.'
export const COPY_REMOVED_KEPT = 'Removed the copy {name}. Its branch stays: git would not delete it.'

// Ignored files that are only a build's leavings; anything else ignored (an .env file, a local database) keeps the copy, since removing it deletes them
export const BUILD_FOLDERS: readonly string[] = ['node_modules', 'dist', 'build', '.next', 'target', 'coverage', '.turbo', '.cache']
// `git status --porcelain --ignored`: the changes (every line but `!!`) counted, and the ignored paths that are not inside a build folder
export function splitStatus(out: string): { changed: number; ignored: string[] } {
  let changed = 0
  const ignored: string[] = []
  for (const line of out.split(/\r?\n/)) {
    if (line.trim() === '') continue
    if (!line.startsWith('!! ')) {
      changed += 1
      continue
    }
    const path = line.slice(3).replace(/^"|"$/g, '').replace(/\/+$/, '')
    if (!path.split('/').some(part => BUILD_FOLDERS.includes(part))) ignored.push(path)
  }
  return { changed, ignored }
}

type Git = { code: number; out: string } | undefined
async function git(i: Io, argv: string[], timeoutMs = GIT_TIMEOUT_MS): Promise<Git> {
  try {
    const r = await i.run(argv, { timeoutMs })
    return { code: r.exitCode, out: r.stdout }
  } catch {
    return undefined
  }
}

// The real path of a folder (symlinks followed, so /tmp and /private/tmp are one); where `realpath` is missing the path stands as given
async function realOf(i: Io, p: string, seen: Map<string, string>): Promise<string> {
  const known = seen.get(p)
  if (known !== undefined) return known
  const r = await git(i, ['realpath', p])
  const out = r !== undefined && r.code === 0 ? r.out.trim() : ''
  const real = out === '' ? p : out
  seen.set(p, real)
  return real
}

export async function removeCopy(i: Io, c: Copy, myCwd: string, base: string): Promise<RemoveSaid> {
  if (isPath(myCwd, c.path)) return { text: COPY_OWN, removed: false }
  const seen = new Map<string, string>()
  const copyPaths = [c.path, await realOf(i, c.path, seen)]
  const inside = async (cwd: string): Promise<boolean> => {
    const real = await realOf(i, cwd, seen)
    return copyPaths.some(f => isPath(cwd, f) || isPath(real, f))
  }
  if (await inside(myCwd)) return { text: COPY_OWN, removed: false }
  // Any session record with a folder inside the copy counts, however old its last beat: an idle open session is still there
  for (const r of await listRecords(i)) if (r.cwd !== '' && (await inside(r.cwd))) return { text: COPY_LIVE, removed: false }
  const list = await git(i, [...WORKTREE_LIST_ARGV])
  if (list === undefined || list.code !== 0) return { text: COPY_UNREAD, removed: false }
  const wt = parseWorktrees(list.out).find(w => w.path === c.path)
  if (wt === undefined) return { text: COPY_GONE, removed: false, gone: true }
  if (wt.branch !== c.branch || wt.locked || wt.detached) return { text: COPY_CHANGED, removed: false }
  const st = await git(i, ['git', '-C', c.path, 'status', '--porcelain', '--ignored'])
  if (st === undefined || st.code !== 0) return { text: COPY_UNREAD, removed: false }
  const { changed, ignored } = splitStatus(st.out)
  if (changed > 0) return { text: changed === 1 ? COPY_DIRTY_ONE : COPY_DIRTY, vars: { n: changed }, removed: false }
  // `git worktree remove` deletes ignored files too (.env files, local databases): only well-known build folders may go with it
  if (ignored.length > 0) return { text: ignored.length === 1 ? COPY_IGNORED_ONE : COPY_IGNORED, vars: { n: ignored.length, name: ignored[0] ?? '' }, removed: false }
  // A squash-merged branch whose remote branch is gone: its commits are the merged pull request's when its last commit is that one
  const pushed = c.prHead !== undefined && wt.head !== undefined && wt.head === c.prHead
  if (!pushed) {
    const up = await git(i, unpushedArgv(c.branch, base))
    const n = up !== undefined && up.code === 0 ? Number(up.out.trim()) : NaN
    if (!Number.isFinite(n)) return { text: COPY_UNREAD, removed: false }
    const shown = base.replace(/^origin\//, '')
    if (n > 0) return { text: n === 1 ? COPY_UNPUSHED_ONE : COPY_UNPUSHED, vars: { n, base: shown }, removed: false }
  }
  const rm = await git(i, removeArgv(c.path), REMOVE_TIMEOUT_MS)
  if (rm === undefined || rm.code !== 0) return { text: COPY_NO_REMOVE, removed: false }
  const del = await git(i, branchDeleteArgv(c.branch, c.inBase))
  return del !== undefined && del.code === 0 ? { text: COPY_REMOVED, vars: { name: c.name, branch: c.branch }, removed: true } : { text: COPY_REMOVED_KEPT, vars: { name: c.name }, removed: true }
}

// A removed or gone copy leaves the last scan at once, so its row goes before the next look
export function forgetCopy(path: string): void {
  const s = wtSeen.scan
  if (s !== undefined) wtSeen.scan = { ...s, rows: s.rows.filter(r => r.wt.path !== path) }
}

