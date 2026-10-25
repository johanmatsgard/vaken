// Continuity part 1: the verified handoff note, the session packet and the story. Counts, kinds, names, paths and the goal sentence only.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { hideSecrets } from './guardcmds'
import { PROOF_KINDS, doneMet, gapWords, kindWord, latestOf, relevantKinds, staleWords, stateWord, statusOf, statusWord } from './proof'
import type { ProofKind, ProofState } from './proof'
import { below } from './platform'
import { hhmm } from './time'
import { t as tn, tEn, tr } from '../i18n/t'
import type { Lang } from '../i18n/types'
import { fillIn } from './fillin'
import { fmt } from './fmt'


export const CONTINUITY_SETTINGS: Setting[] = [
  {
    key: 'brief.mode',
    group: 'Notes for the next session',
    label: 'Handoff notes',
    note: 'Brief, packet, timeline, standup, story and search commands.', // en-only: a setting note; /vaken-settings text stays English
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]

export const CONTINUITY_HELP: HelpEntry[] = [
  {
    title: 'What a handoff note is',
    text: 'A handoff note is a note for the next session: /vaken-help run brief prints it, with goal, branch, changed files, checks and open questions, and each line says if git or a check backs it. /vaken-help run packet saves the same facts as a file in the project.',
  },
  {
    title: 'Find and replay your sessions',
    text: '/vaken-resume finds a session by words in its title. /vaken-resume find searches what was said in your other sessions. /vaken-resume timeline, /vaken-today standup and /vaken-help run story tell what happened, from counts only.',
  },
]

export const PACKET_WHAT = 'Wrote a session packet'
export const PACKET_PATH = '.claude/cockpit-packet.md'
export const OFF_TEXT = 'Handoff notes are off. Turn them on: Settings > Prompts and memory.' // en-only: the key; features/continuity.ts says it with tr() where it answers


const sameDay = (a: number, b: number): boolean => new Date(a).toDateString() === new Date(b).toDateString()
export function stamp(at: number, now: number, lang: Lang = 'en'): string {
  const d = new Date(at)
  return sameDay(at, now) ? hhmm(at) : `${d.getDate()} ${fmt.month(d.getMonth(), lang)} ${hhmm(at)}`
}
export const plainList = (items: string[]): string => items.join(', ')
const stripDot = (text: string): string => text.replace(/[.!?\s]+$/, '')
export function fewOf(items: string[], max: number, more: (n: number) => string = n => `and ${n} more`): string {
  return items.length <= max ? plainList(items) : `${plainList(items.slice(0, max))} ${more(items.length - max)}`
}


export type GitFile = { code: string; path: string }
// The one git status vaken reads for changed files: short form, paths from the folder it runs in, names not escaped. It takes no optional lock, so a read
// never makes the person's own git command (or another session's) fail with "index.lock exists".
export const STATUS_ARGV: readonly string[] = ['git', '--no-optional-locks', '-c', 'core.quotepath=off', 'status', '--short']

// `git status --short`: two status letters, a space, the path; a rename shows "old -> new".
export function parseGitStatus(stdout: string): GitFile[] {
  const out: GitFile[] = []
  for (const line of stdout.split(/\r?\n/)) {
    if (line.length < 4 || line[2] !== ' ') continue
    let path = line.slice(3)
    if (path.includes(' -> ')) path = path.split(' -> ').pop() ?? path
    path = path.replace(/^"(.*)"$/, '$1')
    const code = line.slice(0, 2)
    out.push({ code: code === '??' ? 'new' : code.includes('D') ? 'deleted' : code.includes('A') ? 'added' : code.includes('R') ? 'renamed' : 'changed', path })
  }
  return out
}

export function parseBranch(stdout: string): string | undefined {
  const t = stdout.trim()
  return t === '' || t.includes('\n') ? undefined : t === 'HEAD' ? 'detached HEAD (no branch)' : t
}

// A file whose name looks private is counted, never named.
export const looksPrivate = (path: string): boolean => /(^|\/)(\.env[^/]*|[^/]*(secret|credential|password|token)[^/]*|[^/]*\.(pem|key|p12|pfx)|id_(rsa|ed25519|ecdsa)[^/]*)$/i.test(path)

export const relativeTo = (cwd: string, path: string): string => (cwd !== '' ? below(cwd, path) : path)


// `fixed`: a line no check can ever back (your goal, Claude's own list): it carries no checked or not checked mark
type Claim = { topic: string; ok: boolean; src: string; text: string; lines: string[]; fixed?: boolean }

export type BriefFacts = {
  now: number
  cwd: string
  proof: ProofState
  edited: string[]
  gitBranch?: string
  gitFiles?: GitFile[]
  recordBranch?: string
  askingSince?: number
  pr?: { number: number; state: string; isDraft: boolean; url: string; at: number } | 'none'
}

const SHOW_FILES = 12

function branchClaim(f: BriefFacts): Claim | undefined {
  if (f.gitBranch !== undefined) {
    const lines = f.recordBranch !== undefined && f.recordBranch !== f.gitBranch ? [`Vaken had noted ${f.recordBranch} earlier. Git says ${f.gitBranch} now.`] : []
    return { topic: 'Branch', ok: true, src: 'git', text: f.gitBranch, lines }
  }
  if (f.recordBranch !== undefined) return { topic: 'Branch', ok: false, src: 'git not read', text: f.recordBranch, lines: ['This is the branch vaken noted. Git did not answer.'] }
  return undefined
}

function filesClaim(f: BriefFacts): Claim {
  const edited = f.edited
  const n = edited.length > 0 ? edited.length : f.proof.files.length
  const git = f.gitFiles
  if (git === undefined) {
    return { topic: 'Files changed', ok: false, src: 'git not read', text: `Proof counted ${tEn('words.file', { n: n })} edited in this session. Git did not answer, so the list is not checked.`, lines: edited.slice(0, SHOW_FILES).filter(p => !looksPrivate(p)) }
  }
  const visible = git.filter(g => !looksPrivate(g.path))
  const hidden = git.length - visible.length
  const lines = visible.slice(0, SHOW_FILES).map(g => `${g.path} (${g.code})`)
  if (visible.length > SHOW_FILES) lines.push(`and ${visible.length - SHOW_FILES} more`)
  if (hidden > 0) lines.push(`${tEn('words.file', { n: hidden })} not named: the name looks private`)
  const inGit = new Set(git.map(g => g.path))
  const gone = edited.filter(p => !inGit.has(p) && !looksPrivate(p))
  if (git.length > 0 && gone.length > 0) lines.push(`Edited here but not in git's list (committed or changed back): ${fewOf(gone, 5)}`)
  let text: string
  if (git.length === 0) text = n === 0 ? 'None. Git shows no change that is not committed.' : `Git shows no change that is not committed. Proof counted ${tEn('words.file', { n: n })} edited in this session: they were committed or changed back.`
  else text = `Git shows ${tEn('words.file', { n: git.length })} changed and not committed. Proof counted ${tEn('words.file', { n: n })} edited in this session.`
  return { topic: 'Files changed', ok: true, src: 'git', text, lines }
}

function checkWord(s: ProofState, kind: ProofKind): string {
  const st = statusOf(s, kind)
  const r = latestOf(s, kind)
  const at = r === undefined ? '' : `, ${hhmm(r.at)}`
  if (st === 'ok') return `${kind}: passed after the last edit${at}`
  if (st === 'failed') return `${kind}: failed${r?.exit === undefined ? '' : ` (exit ${r.exit})`}${at}`
  if (st === 'stale') return `${kind}: ${s.lastEditFile === undefined ? statusWord(st) : staleWords(kind, s.lastEditFile)}${at}`
  return `${kind}: ${statusWord(st)}${at}`
}

function checksClaim(s: ProofState): Claim {
  const ran = PROOF_KINDS.filter(k => latestOf(s, k) !== undefined)
  const notRun = PROOF_KINDS.filter(k => latestOf(s, k) === undefined)
  const lines = ran.map(k => checkWord(s, k))
  if (ran.length > 0 && notRun.length > 0) lines.push(`not run: ${plainList(notRun)}`)
  return { topic: 'Checks', ok: true, src: 'receipts', text: ran.length === 0 ? 'None run in this session.' : `${tEn('words.kind', { n: ran.length })} of check ran in this session.`, lines }
}

function doneClaim(s: ProofState): Claim {
  if (s.done.length === 0) return { topic: 'Definition of done', ok: true, src: 'vaken', text: 'Not set. /vaken-ship done sets it.', lines: [] }
  return { topic: 'Definition of done', ok: true, src: 'receipts', text: doneMet(s, s.done) ? 'Met: every chosen check passed after the last edit.' : 'Not met yet.', lines: s.done.map(k => `${statusOf(s, k) === 'ok' ? '[x]' : '[ ]'} ${checkWord(s, k)}`) }
}

export function briefClaims(f: BriefFacts): Claim[] {
  const s = f.proof
  const out: Claim[] = []
  if (s.goal === undefined) out.push({ topic: 'Goal', ok: false, src: 'not set', text: 'Not set. /vaken-tasks goal <one sentence> sets it.', lines: [], fixed: true })
  else out.push({ topic: 'Goal', ok: false, src: s.goal.how === 'first' ? 'key words of your first message, not checked' : 'your words, not checked', text: stripDot(hideSecrets(s.goal.text)), lines: [], fixed: true })
  const branch = branchClaim(f)
  if (branch !== undefined) out.push(branch)
  out.push(filesClaim(f), checksClaim(s), doneClaim(s))
  out.push(
    f.askingSince === undefined
      ? { topic: 'Open questions', ok: true, src: 'session record', text: 'None that vaken can see.', lines: [] }
      : { topic: 'Open questions', ok: true, src: 'session record', text: `Claude asked you a question at ${hhmm(f.askingSince)}. It is still open.`, lines: [] },
  )
  if (s.last !== undefined) {
    out.push(
      s.last.unproven.length === 0
        ? { topic: 'Claims in the last answer', ok: true, src: 'receipts', text: 'No claim without a check behind it.', lines: [] }
        : { topic: 'Claims in the last answer', ok: false, src: 'Claude said it, no check backs it', text: `${tEn('words.claim', { n: s.last.unproven.length })} without proof.`, lines: s.last.unproven.map(gapWords) },
    )
  }
  if (f.pr === 'none') out.push({ topic: 'Pull request', ok: true, src: 'gh', text: 'None found for this branch.', lines: [] })
  else if (f.pr !== undefined) out.push({ topic: 'Pull request', ok: true, src: `gh, ${hhmm(f.pr.at)}`, text: `#${f.pr.number}, ${f.pr.isDraft ? 'draft' : f.pr.state.toLowerCase()}`, lines: f.pr.url === '' ? [] : [f.pr.url] })
  if (s.todo !== undefined) out.push({ topic: "Claude's task list", ok: false, src: "Claude's own list", text: `${s.todo.done} of ${s.todo.total} done.`, lines: [], fixed: true })
  if (s.debt > 0) out.push({ topic: 'Waiting for your look', ok: true, src: 'Checks', text: `${tEn('words.finished_answer', { n: s.debt })} that changed files.`, lines: [] })
  return out
}

const markOf = (c: Claim): string => `${c.ok ? 'verified' : 'unverified'}: ${c.src}`

export function briefMarkLines(f: BriefFacts): { verified: number; total: number; lines: string[]; marks: { topic: string; ok: boolean; fixed?: boolean }[] } {
  const claims = briefClaims(f)
  return { verified: claims.filter(c => c.ok).length, total: claims.length, lines: claims.map(c => `${c.topic}: ${markOf(c)}`), marks: claims.map(c => ({ topic: c.topic, ok: c.ok, ...(c.fixed === true ? { fixed: true } : {}) })) }
}

export function firstSteps(f: BriefFacts): string[] {
  const s = f.proof
  const steps: string[] = []
  steps.push(f.gitFiles === undefined ? 'Git did not answer: check the branch and the changed files by hand.' : 'Run git status and compare it with the files above.')
  if (f.askingSince !== undefined) steps.push('Answer the open question first.')
  const open = relevantKinds(s).filter(k => statusOf(s, k) !== 'ok')
  if (open.length > 0 && (s.edits > 0 || s.receipts.length > 0)) steps.push(`Run the checks that have not passed since the last edit: ${open.map(kindWord).join(', ')}.`)
  if (s.last !== undefined && s.last.unproven.length > 0) steps.push('Do not trust the unverified claims until a check backs them.')
  return steps
}

export function renderBrief(f: BriefFacts): string[] {
  const out = [
    `Handoff note for the next session (made ${stamp(f.now, f.now)}). Paste it into a new session.`,
    '[verified] means git or a check vaken saw backs the line. [unverified] means nothing backs it yet: check it before you trust it.',
    '',
  ]
  for (const c of briefClaims(f)) {
    out.push(`${c.topic} [${markOf(c)}]: ${c.text}`)
    for (const l of c.lines) out.push(`  - ${l}`)
  }
  out.push('', 'First steps:')
  firstSteps(f).forEach((l, n) => out.push(`  ${n + 1}. ${l}`))
  out.push('', 'This brief holds counts, names and checks, and the goal (key words of your first message, or the sentence you set; secrets hidden). It holds no other conversation text.')
  return out
}

export function renderPacket(f: BriefFacts, folderName: string): string {
  const s = f.proof
  const ran = PROOF_KINDS.filter(k => latestOf(s, k) !== undefined)
  const out = [
    'This file was written by vaken so the next session can pick up the work. It holds counts, names and paths, and the goal: the key words of your first message, or the sentence you set with /vaken-tasks goal (secrets hidden). It holds no other conversation text and no secrets.',
    '',
    '# Session packet',
    '',
    `Written: ${new Date(f.now).getDate()} ${fmt.month(new Date(f.now).getMonth())} ${new Date(f.now).getFullYear()}, ${hhmm(f.now)}`,
    `Project folder: ${folderName}`,
    `Work counted: ${tEn('words.edit', { n: s.edits })} in ${tEn('words.file', { n: s.files.length })}, ${tEn('words.finished_answer', { n: s.turns })}, ${tEn('words.check_run', { n: s.receipts.length })}.`,
    '',
    'Each line says if it is verified (git or a check backs it) or unverified (nothing backs it yet).',
    '',
  ]
  for (const c of briefClaims(f)) {
    out.push(`- **${c.topic}** (${markOf(c)}): ${c.text}`)
    for (const l of c.lines) out.push(`  - ${l}`)
  }
  out.push('', '## Checks to run again', '')
  out.push(ran.length === 0 ? 'No check ran in the last session. Pick the tests, the build or the type check that fit this project.' : `The last session ran these kinds of check: ${ran.map(kindWord).join(', ')}. Run the same kinds again.`)
  out.push('', '## First steps', '')
  firstSteps(f).forEach((l, n) => out.push(`${n + 1}. ${l}`))
  out.push('')
  return out.join('\n')
}


type StoryFacts = { proof: ProofState; anomalies: number; unproven: number; askingSince?: number }

const pluralKinds = (kinds: ProofKind[]): string => plainList(kinds.map(k => tr(kindWord(k))))

export function storyLines(f: StoryFacts): string[] {
  const s = f.proof
  const out: string[] = []
  out.push(s.goal === undefined ? tr('The goal was not set for this session.') : fillIn(tr('The goal: {goal}.'), { goal: stripDot(hideSecrets(s.goal.text)) }))
  const ran = PROOF_KINDS.filter(k => latestOf(s, k) !== undefined)
  if (s.edits === 0 && s.receipts.length === 0) out.push(tr('So far Claude has not changed a file or run a check.'))
  else out.push(fillIn(tr('Claude changed {files} in {edits} over {answers}, and ran {checks}{kinds}.'), { files: tn('words.file', { n: s.files.length }), edits: tn('words.edit', { n: s.edits }), answers: tn('words.finished_answer', { n: s.turns }), checks: tn('words.check', { n: s.receipts.length }), kinds: ran.length === 0 ? '' : ` (${pluralKinds(ran)})` }))
  const failed = PROOF_KINDS.map(k => ({ k, n: s.receipts.filter(r => r.kind === k && r.ok === false).length })).filter(x => x.n > 0)
  const bad = [...failed.map(x => fillIn(tr('{kind} failed {times}'), { kind: tr(kindWord(x.k)), times: tn('words.times', { n: x.n }) })), ...(f.anomalies > 0 ? [tn('words.warning_about_odd_behaviour', { n: f.anomalies })] : []), ...(f.unproven > 0 ? [tn('words.claim_with_no_proof', { n: f.unproven })] : [])]
  out.push(bad.length === 0 ? tr('Vaken saw nothing fail.') : fillIn(tr('What went wrong: {list}.'), { list: plainList(bad) }))
  const relevant = relevantKinds(s)
  out.push(s.edits === 0 && s.receipts.length === 0 ? tr('It stands at the start: no work is counted yet.') : fillIn(tr('Where it stands: {list}.'), { list: relevant.map(k => `${tr(kindWord(k))} ${stateWord(k, statusOf(s, k), tr)}`).join('; ') }))
  const next: string[] = []
  if (f.askingSince !== undefined) next.push(tr('answer the question Claude asked'))
  const unmet = (s.done.length > 0 ? s.done : []).filter(k => statusOf(s, k) !== 'ok')
  if (s.done.length > 0 && unmet.length > 0) next.push(fillIn(tr('make {kinds} pass, as the definition of done asks'), { kinds: pluralKinds(unmet) }))
  else if (s.done.length === 0 && s.edits > 0) {
    const open = relevant.filter(k => statusOf(s, k) !== 'ok')
    if (open.length > 0) next.push(fillIn(tr('run {kinds}'), { kinds: pluralKinds(open) }))
  }
  if (s.debt > 0 && next.length < 2) next.push(tr('look at the finished work'))
  out.push(next.length === 0 ? tr('Next: nothing waits that vaken can see.') : fillIn(tr('Next: {list}.'), { list: next.slice(0, 2).join(tr(', then ')) }))
  return out
}

// ---- Finish safely (Plan limits): the window runs out before the work ends. One press saves the handover note (the fresh-start brief, features/continuity.ts
// writeFreshBrief) and sends Claude one fixed request. Nothing happens without the press.
export const FINISH_PRESS = 'Finish safely'
export const FINISH_MEANS = 'At this pace the plan limit runs out before the work ends. Finish safely lets Claude stop at a safe point instead of being cut off mid-step. Nothing happens before you press.'
export const FINISH_NEXT = 'The press saves a handover note for the next session, then asks Claude to stop at the next safe point, commit nothing you did not ask for, and say where it stopped.'
export const FINISH_SAID = 'Handover note saved at {path}. Asked Claude to stop at a safe point.'
export const FINISH_QUEUED = 'Handover note saved at {path}. Claude gets the request at its next step.'
export const FINISH_FAILED = 'Could not save the handover note. Nothing was sent to Claude.'
export const FINISH_WORDS: string[] = [FINISH_PRESS, FINISH_MEANS, FINISH_NEXT, FINISH_SAID, FINISH_QUEUED, FINISH_FAILED]
// Sent to Claude as the person's own message (or, while Claude works, with its next step's result), so English by rule.
export const finishPrompt = (path: string): string =>
  `The plan limit runs out soon. Stop at the next safe point: finish or undo the step you are in, so nothing is left half done. Do not start anything new. Do not commit anything I did not ask you to commit. Vaken saved a handover note for the next session at ${path}. Then tell me in two or three lines where you stopped and what is left.` // en-only: a prompt sent to Claude as the person
// The request waiting for Claude's next step while it works (features/cost.ts hands it over once); sent as a message when the turn ends without a step.
export const finishMem: { note?: string } = {}
