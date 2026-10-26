// Proof: did the checks really run and pass, and what is left to look at. State is counts, kinds, exit codes, times and short hashes of paths, never a command, its output or anything Claude wrote.
import { fmt } from './fmt'
import { tr } from './lang'
import { fillIn } from './fillin'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { below } from './platform'
import { hideSecrets } from './guardcmds'
import { keyTitle } from './titles'
import { hhmm } from './time'
import { langNow, t as tNow, tEn, tIn } from '../i18n/t'


export const PROOF_SETTINGS: Setting[] = [
  {
    key: 'proof.receipts',
    group: 'Checks',
    label: 'Check runs',
    note: 'Notes when tests, build or lint pass. Off also turns off Claims and Definition of done.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
  {
    key: 'proof.claims',
    group: 'Checks',
    label: 'Claims',
    note: 'Flags "tests pass" or "done" when no check backs it.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'warn', label: 'Warn' },
    ],
    default: 'warn',
  },
  {
    key: 'proof.done',
    group: 'Checks',
    label: 'Definition of done',
    note: 'Done counts only when your chosen checks passed.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]

export const PROOF_HELP: HelpEntry[] = [
  {
    title: 'What checks do',
    text: 'Vaken notes when a test, build, lint or type check ran, and if it passed. When Claude says "tests pass" or "done" and no passing check backs it, vaken flags it. /vaken-ship proof shows the last answer; /vaken-ship done sets the checks that must pass.',
  },
  {
    title: 'What checks keep',
    text: 'It keeps counts, kinds, exit codes and times. It never keeps a command, its output, or Claude\'s words. The only texts it keeps are the names of up to 3 failing tests (secrets hidden), the goal (the key words of your first message, or the sentence you type after /vaken-tasks goal, with secrets hidden) and the name of the last file that was edited.',
  },
]

export const UNPROVEN_WHAT = 'Claude said done without proof'


export const PROOF_KINDS = ['tests', 'build', 'lint', 'types'] as const
export type ProofKind = (typeof PROOF_KINDS)[number]

const KIND_WORD: Record<ProofKind, string> = { tests: 'tests', build: 'the build', lint: 'lint', types: 'the type check' }
export const kindWord = (k: ProofKind): string => KIND_WORD[k]
// The short row name on the Checks card
export const KIND_SHORT: Record<ProofKind, string> = { tests: 'Tests', build: 'Build', lint: 'Lint', types: 'Types' }

const ALIAS: Record<string, ProofKind> = { test: 'tests', tests: 'tests', build: 'build', lint: 'lint', type: 'types', types: 'types', typecheck: 'types', tsc: 'types' }

export function parseKinds(args: string): { kinds: ProofKind[]; bad: string[] } {
  const kinds: ProofKind[] = []
  const bad: string[] = []
  for (const w of args.toLowerCase().split(/[\s,]+/).filter(x => x !== '')) {
    const k = ALIAS[w]
    if (k === undefined) bad.push(w)
    else if (!kinds.includes(k)) kinds.push(k)
  }
  return { kinds, bad }
}


// The first kind that matches a part of the command wins.
const RULES: { kind: ProofKind; re: RegExp }[] = [
  { kind: 'types', re: /\btsc\b|\btype-?check(?:\.sh)?\b|\b(?:npm|yarn|pnpm|bun)\s+(?:run\s+)?tsc\b|\bpyright\b|\bmypy\b/i },
  {
    kind: 'tests',
    re: /\b(?:npm|yarn|pnpm|bun)\s+(?:run\s+)?test\b|\bbun\s+test\b|\bvitest\b|\bjest\b|\bpytest\b|\bgo\s+test\b|\bcargo\s+test\b|\bswift\s+test\b|\bmake\s+test\b|\bnode\s+--test\b|\bdeno\s+test\b|\bphpunit\b|\brspec\b|\bclaude\s+plugin\s+test\b|\bxcodebuild\b.*\btest\b/i,
  },
  { kind: 'tests', re: /(?:^|[\s/])(?:(?:run-?)?tests?|check)(?:[-_][\w.-]*)?\.sh\b|[\w.-]*[-_]tests?\.sh\b/i },
  { kind: 'lint', re: /\b(?:npm|yarn|pnpm|bun)\s+(?:run\s+)?lint\b|\beslint\b|\bruff\b|\bgolangci-lint\b|\bcargo\s+clippy\b|\bbiome\s+(?:check|lint)\b|\bflake8\b|\bpylint\b|\bswiftlint\b|\bshellcheck\b/i },
  { kind: 'build', re: /\b(?:npm|yarn|pnpm|bun)\s+(?:run\s+)?build\b|\bnext\s+build\b|\bvite\s+build\b|\bcargo\s+build\b|\bgo\s+build\b|\bswift\s+build\b|\bmake\s+build\b|\bxcodebuild\b/i },
]

const LOOKERS = new Set(['echo', 'printf', 'cat', 'grep', 'rg', 'git', 'ls', 'man', 'which', 'head', 'tail', 'sed', 'awk', 'find', 'open', 'code', 'vim', 'less', 'gh', 'cp', 'mv', 'rm', 'touch', 'cd', 'export'])

// Compared in lower case, without folder and `.exe`.
const WIN_LOOKERS = new Set(['dir', 'type', 'findstr', 'where', 'copy', 'move', 'del', 'erase', 'ren', 'md', 'cls', 'start', 'explorer', 'get-childitem', 'gci', 'get-content', 'gc', 'select-string', 'sls', 'write-output', 'write-host', 'set-location', 'get-location', 'get-item', 'copy-item', 'move-item', 'remove-item', 'new-item', 'start-process'])
const winName = (word: string): string => word.replace(/^.*\\/, '').replace(/\.exe$/i, '').toLowerCase()

const stripQuoted = (command: string): string => command.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""')

const firstWord = (part: string): string => (part.split(/\s+/).find(w => w !== '' && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) ?? '').replace(/^.*\//, '')
const withoutSettings = (part: string): string => part.replace(/^\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, '')

// `by`: what could hide how the check ended, a pipe or another command after it. `plain`: piped only into readers that pass its own lines on
// (tail, cat, tee), so a pass read from the output is the check's own
export type Hit = { kind: ProofKind; hidden: boolean; by?: 'pipe' | 'chain'; plain?: true }

// Readers that print the check's own lines and add none: a filter (grep, head, sed) can drop a failure line, and a command after it can print a pass
const PLAIN_READERS = new Set(['tail', 'cat', 'tee'])

// A redirect such as `2>&1`, `>&2`, `&>` or `&>>` is not a separator
const REDIRECT = /\d*>>?&\d*-?|&>>?/g

// `hidden` is true when something after the check could hide how it ended; only `&&` keeps the result honest.
export function checksIn(command: string): Hit[] {
  const pieces = stripQuoted(command).replace(REDIRECT, ' ').split(/(&&|\|\||;|\||&|\n)/)
  const parts: { text: string; sep: string }[] = []
  for (let n = 0; n < pieces.length; n += 2) parts.push({ text: pieces[n] ?? '', sep: pieces[n + 1] ?? '' })
  const hits: Hit[] = []
  parts.forEach((p, n) => {
    if (p.text.trim() === '' || LOOKERS.has(firstWord(p.text)) || WIN_LOOKERS.has(winName(firstWord(p.text)))) return
    const rule = RULES.find(r => r.re.test(withoutSettings(p.text)))
    if (rule === undefined || hits.some(h => h.kind === rule.kind)) return
    const after = parts.slice(n).filter(x => x.sep !== '' && x.sep !== '&&')
    // The check and what follows it, without an empty end (a closing newline); every join is a pipe and every reader a plain one
    const rest = parts.slice(n)
    while (rest.length > 1 && (rest[rest.length - 1]?.text.trim() ?? '') === '') rest.pop()
    const plain = after.length > 0 && rest.length > 1 && rest.slice(0, -1).every(x => x.sep === '|') && rest.slice(1).every(x => PLAIN_READERS.has(firstWord(x.text)))
    hits.push({ kind: rule.kind, hidden: after.length > 0, ...(after.length === 0 ? {} : { by: after.some(x => x.sep === '|') ? 'pipe' : 'chain' }), ...(plain ? { plain: true as const } : {}) })
  })
  return hits
}

// Why a result is not clear: a pipe cut the output, another command ran after it, several checks ran in one command, or the check could not run (`norun`: its program was not found or not runnable)
export type Unclear = 'pipe' | 'chain' | 'many' | 'norun'
// The shell's own exit codes for a program it could not run (126) or find (127): no test ran, so nothing failed
export const NO_RUN_EXITS: readonly number[] = [126, 127]
export type Judged = { kind: ProofKind; ok: boolean | undefined; exit?: number; why?: Unclear; names?: string[]; more?: number }

// A tool's own summary line, the common runners only: bun test, jest, vitest, pytest, go test, cargo test, node --test, tsc, eslint, npm's exit line
const FAIL_COUNTS = [/^\s*(\d+) fail\b/m, /\bTests?:?\s+(\d+) failed/, /^=+[^=\n]*?\b(\d+) failed\b/m, /\bFound (\d+) errors?\b/, /\u2716 \d+ problems? \((\d+) errors?/, /^# fail (\d+)/m]
const FAIL_MARKS = [/^--- FAIL:/m, /^FAIL\s+\S/m, /\btest result: FAILED\b/, /\berror TS\d+:/, /\bnpm (?:ERR!|error) (?:Test failed|code ELIFECYCLE)/]
const PASS_MARKS = [/^\s*\d+ pass\b/m, /\bTests?:?\s+\d+ passed/, /^=+[^=\n]*?\b\d+ passed\b/m, /^ok\s+\S+/m, /\btest result: ok\./, /\bFound 0 errors\b/, /^# pass \d+/m]

// From the output's text: true passed, false failed, undefined when no known summary is in it
export function outputVerdict(text: string | undefined): boolean | undefined {
  if (text === undefined || text === '') return undefined
  if (FAIL_COUNTS.some(re => Number(re.exec(text)?.[1] ?? 0) > 0) || FAIL_MARKS.some(re => re.test(text))) return false
  return PASS_MARKS.some(re => re.test(text)) ? true : undefined
}

export const NAMES_KEEP = 3
const NAME_MAX = 200
const NAME_RES = [/^\(fail\) (.+?)(?: \[[\d.]+m?s\])?$/gm, /^\s*\u25cf (?!Console)(.+)$/gm, /^\s*[\u00d7\u2715\u2717] (.+?)(?: \d+ ?ms)?$/gm, /^FAILED (\S+)/gm, /^\s*--- FAIL: (\S+)/gm, /^test (\S+) \.\.\. FAILED$/gm, /^not ok \d+ - (.+)$/gm]

// The names of the failing tests in the output, the first NAMES_KEEP, and how many more; secrets hidden
export function failingNames(text: string | undefined): { names: string[]; more: number } {
  // In the order the output printed them
  const found = NAME_RES.flatMap(re => [...(text ?? '').matchAll(re)]).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  const all: string[] = []
  for (const m of found) {
    const name = hideSecrets((m[1] ?? '').trim()).slice(0, NAME_MAX)
    if (name !== '' && !all.includes(name)) all.push(name)
  }
  return { names: all.slice(0, NAMES_KEEP), more: Math.max(0, all.length - NAMES_KEEP) }
}

const withNames = (r: Judged, text: string | undefined): Judged => {
  if (r.ok !== false || r.kind !== 'tests') return r
  const { names, more } = failingNames(text)
  return names.length === 0 ? r : { ...r, names, ...(more === 0 ? {} : { more }) }
}

// A result that cannot be tied to one check is `undefined`: 'ran, result unknown', never 'passed'. The exit code wins; a pipe's output is read for the tool's own summary.
// A failure read from the output always counts; a pass only when the check is piped into plain readers (Hit.plain), so no command after it can print one.
export function judge(hits: Hit[], failed: boolean, exit: number | undefined, text?: string): Judged[] {
  const visible = hits.filter(h => !h.hidden)
  const said = hits.length === 1 ? outputVerdict(text) : undefined
  return hits.map(h => {
    const read = said === false || (said === true && h.plain === true) ? said : undefined
    if (h.hidden) return withNames(read === undefined ? { kind: h.kind, ok: undefined, why: h.by ?? 'chain' } : { kind: h.kind, ok: read }, text)
    if (!failed) return { kind: h.kind, ok: true, exit: 0 }
    if (exit !== undefined && NO_RUN_EXITS.includes(exit)) return { kind: h.kind, ok: undefined, exit, why: 'norun' }
    if (visible.length === 1) return withNames({ kind: h.kind, ok: false, ...(exit === undefined ? {} : { exit }) }, text)
    return { kind: h.kind, ok: undefined, why: 'many' }
  })
}

// The rest of the text is never read.
export const exitCodeOf = (text: string | undefined): number | undefined => {
  const m = /^Exit code (\d+)/.exec(text ?? '')
  return m === null ? undefined : Number(m[1])
}


type Receipt = { kind: ProofKind; ok: boolean | undefined; exit?: number; at: number; seq: number; why?: Unclear; names?: string[]; more?: number }
export type Status = 'ok' | 'failed' | 'unknown' | 'stale' | 'notrun'

export type ClaimKind = ProofKind | 'fixed' | 'done' | 'generic'
export type Gap = { kind: ClaimKind; why: 'missing' | 'failed' | 'stale' | 'unknown' | 'notdone' }

export type Diff = { files: number; lines: number }

export type Evidence = {
  at: number
  seconds: number
  edits: number
  files: number
  ran: { kind: ProofKind; status: Status; exit?: number; at: number }[]
  diff?: Diff
  claims: ClaimKind[]
  unproven: Gap[]
  notChecked: ProofKind[]
  editedFile?: string
  doneSet: ProofKind[]
  doneMet?: boolean
}

export type Goal = { text: string; setAt: number; how: 'first' | 'typed' }

// Keep going until green (core/keepgoing.ts): set only by the person's press, for this session; `end` once the last round is used
export type KeepGoing = { kind: ProofKind; rounds: number; at: number; end?: 'max' }

export type ProofState = {
  seq: number // A counter of edits and receipts, so 'after the last edit' compares two numbers.
  lastEditSeq: number
  edits: number
  files: string[]
  receipts: Receipt[]
  turnStartSeq: number
  turnEdits: number
  turnFiles: string[]
  turns: number
  last?: Evidence
  done: ProofKind[]
  doneSeen: boolean
  debt: number
  lastEditFile?: string
  note: ClaimKind[]
  goal?: Goal
  messages: number
  todo?: { done: number; total: number }
  keep?: KeepGoing
}

export const emptyState = (): ProofState => ({ seq: 0, lastEditSeq: 0, edits: 0, files: [], receipts: [], turnStartSeq: 0, turnEdits: 0, turnFiles: [], turns: 0, done: [], doneSeen: false, debt: 0, note: [], messages: 0 })

export function readState(v: unknown): ProofState {
  if (typeof v !== 'object' || v === null) return emptyState()
  const o = v as Partial<ProofState>
  if (typeof o.seq !== 'number' || !Array.isArray(o.receipts)) return emptyState()
  // A receipt from an older version or a broken write is dropped; a 126 or 127 kept as a failure is read as could not run
  const receipts = (o.receipts as unknown[]).filter((r): r is Receipt => typeof r === 'object' && r !== null && typeof (r as Receipt).kind === 'string' && typeof (r as Receipt).at === 'number' && typeof (r as Receipt).seq === 'number')
  const state = { ...emptyState(), ...o, receipts: receipts.map(r => (r.ok === false && r.exit !== undefined && NO_RUN_EXITS.includes(r.exit) ? { ...r, ok: undefined, why: 'norun' as const } : r)) }
  if (state.keep !== undefined && !goodKeep(state.keep)) delete state.keep
  // A goal stored earlier as a whole sentence is rebuilt to key words.
  if (state.goal !== undefined && state.goal.how === 'first' && typeof state.goal.text === 'string') {
    const key = goalFrom(state.goal.text)
    state.goal = { ...state.goal, text: key ?? cleanGoal(state.goal.text) }
  }
  return state
}

const goodKeep = (k: unknown): boolean => {
  const o = k as Partial<KeepGoing> | null
  return typeof o === 'object' && o !== null && (PROOF_KINDS as readonly string[]).includes(String(o.kind)) && typeof o.rounds === 'number' && typeof o.at === 'number' && (o.end === undefined || o.end === 'max')
}

export const stateKey = (sessionId: string): string => `cockpit:proof:${sessionId}`

const RECEIPTS_KEEP = 60
export const FILES_KEEP = 300

// A file is counted by its hash, never named.
export const hashOf = (s: string): string => {
  let h = 0x811c9dc5
  for (let n = 0; n < s.length; n += 1) {
    h ^= s.charCodeAt(n)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

const addHash = (list: string[], h: string, keep: number): string[] => (list.includes(h) ? list : [...list, h].slice(-keep))

// Unsure counts as 'can': a stale mark is safer than a missed one. A test file always can, even inside docs/.
const TEST_FILE = /(?:^|[\\/])(?:tests?|__tests__|specs?)[\\/]|\.(?:test|spec)\.[a-z0-9]+$|(?:^|[\\/])test_[^\\/]*$|_test\.[a-z0-9]+$/i
const DOC_EXT = /\.(?:md|markdown|txt|rst|adoc|png|jpe?g|gif|svg|ico|webp|bmp|heic|avif)$/i
const DOC_NAME = /^(?:\.gitignore|\.gitattributes|licen[sc]e|copying|notice|authors|readme|changelog)$/i
const DOC_DIR = /(?:^|[\\/])docs[\\/]/i
// Only a path relative to the project folder, so a project that itself sits in a folder called docs does not look like all docs.
export function affectsTests(path: string): boolean {
  if (TEST_FILE.test(path)) return true
  const name = path.split(/[\\/]/).pop() ?? path
  const relative = !/^(?:[\\/]|[a-z]:)/i.test(path)
  return !(DOC_EXT.test(name) || DOC_NAME.test(name) || (relative && DOC_DIR.test(path)))
}

const fromRoot = (path: string, root: string | undefined): string => {
  const base = (root ?? '').replace(/\/+$/, '')
  return below(base, path)
}

const shortName = (path: string): string => {
  const name = path.split(/[\\/]/).pop() ?? path
  return fmt.middle(name, 40)
}

// `root` tells docs/ from a folder of that name higher up. An edit that cannot affect a check is counted but does not make earlier runs stale.
export function recordEdit(s: ProofState, path: string, root?: string): ProofState {
  const seq = s.seq + 1
  const h = hashOf(path)
  const matters = affectsTests(fromRoot(path, root))
  return {
    ...s,
    seq,
    lastEditSeq: matters ? seq : s.lastEditSeq,
    edits: s.edits + 1,
    files: addHash(s.files, h, FILES_KEEP),
    turnEdits: s.turnEdits + 1,
    turnFiles: addHash(s.turnFiles, h, FILES_KEEP),
    doneSeen: matters ? false : s.doneSeen,
    ...(matters ? { lastEditFile: shortName(path) } : {}),
  }
}

export function recordReceipts(s: ProofState, results: Judged[], at: number): ProofState {
  let seq = s.seq
  const add: Receipt[] = results.map(r => {
    seq += 1
    return { kind: r.kind, ok: r.ok, ...(r.exit === undefined ? {} : { exit: r.exit }), at, seq, ...(r.why === undefined ? {} : { why: r.why }), ...(r.names === undefined ? {} : { names: r.names.slice(0, NAMES_KEEP) }), ...(r.more === undefined ? {} : { more: r.more }) }
  })
  return { ...s, seq, receipts: [...s.receipts, ...add].slice(-RECEIPTS_KEEP) }
}

export function latestOf(s: ProofState, kind: ProofKind): Receipt | undefined {
  for (let n = s.receipts.length - 1; n >= 0; n -= 1) if (s.receipts[n].kind === kind) return s.receipts[n]
  return undefined
}

const RUN_WORD: Record<ProofKind, string> = { tests: 'test run', build: 'build', lint: 'lint run', types: 'type check' } // en-only: the end of the key "edited after the last ...", said through staleText
export const staleWords = (kind: ProofKind, file: string | undefined): string => `edited after the last ${RUN_WORD[kind]}${file === undefined ? '' : `: ${file}`}`

// The words a person reads: a kind name in the language ("testerna"), English keeps the typed word ("tests")
export const kindName = (k: ProofKind): string => (langNow() === 'en' ? k : tr(kindWord(k)))
export const kindNames = (list: readonly ProofKind[]): string => list.map(kindName).join(', ')
// staleWords for the person, in the language of the draw
export const staleText = (kind: ProofKind, file: string | undefined): string => `${tr(`edited after the last ${RUN_WORD[kind]}`)}${file === undefined ? '' : `: ${file}`}`

export function statusOf(s: ProofState, kind: ProofKind): Status {
  const r = latestOf(s, kind)
  if (r === undefined) return 'notrun'
  if (r.seq < s.lastEditSeq) return 'stale'
  if (r.ok === undefined) return 'unknown'
  return r.ok ? 'ok' : 'failed'
}


// The claims of the last answer with no check behind them: the one count the Checks, Ship and Memory and notes cards show
export const claimsUnchecked = (s: ProofState | undefined): number => s?.last?.unproven.length ?? 0

// An empty list is never 'met': nothing was asked.
export function doneMet(s: ProofState, list: ProofKind[]): boolean {
  return list.length > 0 && list.every(k => statusOf(s, k) === 'ok')
}

const STATUS_WORD: Record<Status, string> = { ok: 'passed', failed: 'failed', unknown: 'ran, result not clear', stale: 'not run since the last edit', notrun: 'not run' }
export const statusWord = (st: Status): string => STATUS_WORD[st]
// The check's state word agrees with its name in Swedish ("Tester inte körda", "Bygget inte kört"). Checks and Ship share it and the short names (KIND_SHORT), so both cards say a check the same way
const AGREE: Partial<Record<string, string>> = { 'notrun:tests': 'pane.checks_notrun_tests', 'notrun:build': 'pane.checks_notrun_build', 'stale:tests': 'pane.checks_stale_tests', 'stale:build': 'pane.checks_stale_build' }
export const stateWord = (k: ProofKind, st: Status, t: (s: string) => string): string => {
  const row = AGREE[`${st}:${k}`]
  return row !== undefined && langNow() !== 'en' ? tIn(langNow(), row) : t(statusWord(st))
}
// The one name of the answers that changed files and wait for the person's look; Checks and Ship say it the same way
export const LOOK_TITLE = 'Changes to look at'

export function doneLines(s: ProofState, list: ProofKind[], isOn: boolean): string[] {
  if (list.length === 0) return [tr('Definition of done: not set. Set it with /vaken-ship done tests build lint.')]
  const head = fillIn(tr('Definition of done: {list}{off}.'), { list: kindNames(list), off: isOn ? '' : ` ${tr('(switched off in Settings > Safety)')}` })
  const rows = list.map(k => `  ${statusOf(s, k) === 'ok' ? '[x]' : '[ ]'} ${kindName(k)}: ${stateWord(k, statusOf(s, k), tr)}`)
  return [head, ...rows, doneMet(s, list) ? tr('Met: every check passed after the last edit.') : tr('Not met yet.')]
}


export function parseShortstat(text: string): Diff | undefined {
  if (!/files? changed/.test(text)) return undefined
  const num = (re: RegExp): number => Number(re.exec(text)?.[1] ?? 0)
  return { files: num(/(\d+) files? changed/), lines: num(/(\d+) insertions?\(\+\)/) + num(/(\d+) deletions?\(-\)/) }
}

export function relevantKinds(s: ProofState): ProofKind[] {
  if (s.done.length > 0) return s.done
  const ran = PROOF_KINDS.filter(k => latestOf(s, k) !== undefined)
  return ran.length > 0 ? ran : ['tests']
}

// Call it before the turn counters are reset.
export function buildEvidence(s: ProofState, o: { at: number; durationMs: number; diff?: Diff; claims: ClaimKind[]; unproven: Gap[]; doneOn: boolean }): Evidence {
  const seenKinds = new Set<string>()
  const mine = s.receipts.filter(r => r.seq > s.turnStartSeq).reverse().filter(r => !seenKinds.has(r.kind) && (seenKinds.add(r.kind), true)).reverse().slice(-12)
  const ran = mine.map(r => ({ kind: r.kind, status: (r.seq < s.lastEditSeq ? 'stale' : r.ok === undefined ? 'unknown' : r.ok ? 'ok' : 'failed') as Status, ...(r.exit === undefined ? {} : { exit: r.exit }), at: r.at }))
  const notChecked = s.turnEdits === 0 ? [] : relevantKinds(s).filter(k => statusOf(s, k) !== 'ok')
  const set = o.doneOn ? s.done : []
  return {
    at: o.at,
    seconds: Math.round(o.durationMs / 1000),
    edits: s.turnEdits,
    files: s.turnFiles.length,
    ran,
    ...(o.diff === undefined ? {} : { diff: o.diff }),
    claims: o.claims,
    unproven: o.unproven,
    notChecked,
    ...(s.lastEditFile === undefined ? {} : { editedFile: s.lastEditFile }),
    doneSet: set,
    ...(set.length === 0 ? {} : { doneMet: doneMet(s, set) }),
  }
}

// `note` is what Claude is told on the next message.
export function afterTurn(s: ProofState, ev: Evidence, warn: boolean): ProofState {
  return {
    ...s,
    turnStartSeq: s.seq,
    turnEdits: 0,
    turnFiles: [],
    turns: s.turns + 1,
    last: ev,
    debt: s.debt + (ev.edits > 0 ? 1 : 0),
    note: warn && ev.unproven.length > 0 ? ev.unproven.map(g => g.kind) : s.note,
    doneSeen: ev.doneMet === true,
  }
}

const MARK: Record<Status, string> = { ok: '+', failed: 'x', unknown: '~', stale: '?', notrun: '?' }

export function packLines(ev: Evidence | undefined, s: ProofState): string[] {
  if (ev === undefined) return [tr('Proof: no finished answer yet. The pack appears when an answer ends.')]
  const span = ev.seconds < 60 ? fillIn(tr('{n} s'), { n: ev.seconds }) : fillIn(tr('{n} min'), { n: Math.round(ev.seconds / 60) })
  const lines = [fillIn(tr('Proof for the last answer ({time}, {span}).'), { time: hhmm(ev.at), span })]
  const diff = ev.diff === undefined ? '' : ev.diff.files === 0 ? `. ${tr('Git shows no change that is not committed')}` : `. ${fillIn(tr('Git diff, all changes not committed yet: {lines} lines in {files}'), { lines: ev.diff.lines, files: tNow('words.file', { n: ev.diff.files }) })}`
  lines.push(ev.edits === 0 ? tr('Files changed: none.') : fillIn(tr('Files changed in this answer: {files} ({edits}){diff}.'), { files: ev.files >= FILES_KEEP ? fillIn(tr('{n} or more'), { n: FILES_KEEP }) : ev.files, edits: tNow('words.edit', { n: ev.edits }), diff }))
  if (ev.ran.length === 0) lines.push(tr('Checks run: none.'))
  else {
    lines.push(tr('Checks run:'))
    for (const r of ev.ran) lines.push(`  ${MARK[r.status]} ${kindName(r.kind)} ${r.status === 'failed' && r.exit !== undefined ? fillIn(tr('failed (exit {n})'), { n: r.exit }) : r.status === 'stale' ? staleText(r.kind, ev.editedFile) : stateWord(r.kind, r.status, tr)}, ${hhmm(r.at)}`)
  }
  lines.push(ev.notChecked.length === 0 ? (ev.edits === 0 ? tr('Nothing to check: no file changed.') : tr('Not checked: nothing. Every check that matters passed after the last edit.')) : fillIn(tr('Not checked after the last edit: {list}.'), { list: kindNames(ev.notChecked) }))
  if (ev.doneSet.length > 0) lines.push(fillIn(ev.doneMet === true ? tr('Definition of done ({list}): met.') : tr('Definition of done ({list}): not met.'), { list: kindNames(ev.doneSet) }))
  lines.push(...claimLines(ev))
  lines.push(debtWords(s.debt))
  return lines
}

const CLAIM_WORD: Record<ClaimKind, string> = { tests: 'tests pass', build: 'the build works', lint: 'lint is clean', types: 'the type check passes', fixed: 'it is fixed', done: 'the work is done', generic: 'it is verified' }
const claimWord = (k: ClaimKind): string => CLAIM_WORD[k]
const WHY_WORD: Record<Gap['why'], string> = { missing: 'no check ran', failed: 'the last run failed', stale: 'files changed after the last run', unknown: 'a run was seen but its result is not clear', notdone: 'the definition of done is not met' }

export const gapWords = (g: Gap): string => `Said ${claimWord(g.kind)}: ${WHY_WORD[g.why]}.`
// The same for the person, in the language of the draw (gapWords stays English: it goes to Claude and to the ledger)
const gapText = (g: Gap): string => fillIn(tr('Said {claim}: {why}.'), { claim: tr(claimWord(g.kind)), why: tr(WHY_WORD[g.why]) })

function claimLines(ev: Evidence): string[] {
  if (ev.claims.length === 0) return [tr('Claims in the answer: none found.')]
  const bad = ev.unproven.map(g => g.kind)
  const backed = ev.claims.filter(k => !bad.includes(k))
  return [fillIn(tr('Claims in the answer: {list}.'), { list: ev.claims.map(k => tr(claimWord(k))).join(', ') }), ...(backed.length === 0 ? [] : [fillIn(tr('Backed by a check: {list}.'), { list: backed.map(k => tr(claimWord(k))).join(', ') })]), ...ev.unproven.map(gapText)]
}


export const debtWords = (n: number): string => (n === 0 ? tr('Waiting for your look: nothing.') : fillIn(tr('Waiting for your look: {answers} that changed files. Your next message, or /vaken-ship reviewed, clears it.'), { answers: tNow('words.finished_answer', { n }) }))

export const DEBT_TOAST = 3
export const debtToast = (n: number): string => tr('{n} finished answers changed files and wait for your look.').replace('{n}', String(n))
export const lookWords = (n: number, t: (s: string) => string = s => s): string =>
  n === 1 ? t('1 finished answer changed files and waits for your look.') : t('{n} finished answers changed files and wait for your look.').replace('{n}', String(n))


const GOAL_MAX = 160

const cut = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`)

// Secrets are hidden before it is stored.
export const cleanGoal = (text: string): string => cut(hideSecrets(text.replace(/\s+/g, ' ').trim()), GOAL_MAX)

// Only key words, never the sentence; needs three words and no slash command.
export function goalFrom(text: string): string | undefined {
  // The app adds blocks such as system reminders to a message; they are not what the person typed.
  const typed = text.replace(/<([a-z][a-z0-9-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, ' ')
  const t = typed.replace(/\s+/g, ' ').trim()
  if (t === '' || t.startsWith('/') || t.startsWith('<') || t.split(' ').length < 3) return undefined
  const key = keyTitle(hideSecrets(t))
  return key === undefined ? undefined : cleanGoal(key)
}

export const GOAL_WITHIN = 3

export function goalLines(s: ProofState): string[] {
  const lines = [s.goal === undefined ? tr('Goal: not set. Set it with /vaken-tasks goal <one sentence>.') : `${tr('Goal')}: ${s.goal.text}${s.goal.how === 'first' ? ` ${tr('(key words of your first message; set it in your own words with /vaken-tasks goal)')}` : ''}`]
  const passing = PROOF_KINDS.filter(k => statusOf(s, k) === 'ok')
  const failing = PROOF_KINDS.filter(k => statusOf(s, k) === 'failed')
  lines.push(fillIn(tr('Steps so far: {files} changed ({edits}).'), { files: s.files.length >= FILES_KEEP ? fillIn(tr('{n} or more files'), { n: FILES_KEEP }) : tNow('words.file', { n: s.files.length }), edits: tNow('words.edit', { n: s.edits }) }))
  lines.push(`${fillIn(tr('Checks passing now: {list}.'), { list: passing.length === 0 ? tr('none') : kindNames(passing) })}${failing.length === 0 ? '' : ` ${fillIn(tr('Failing: {list}.'), { list: kindNames(failing) })}`}`)
  if (s.todo !== undefined) lines.push(fillIn(tr("Claude's task list: {done} of {total} done."), { done: s.todo.done, total: s.todo.total }))
  lines.push(tr('This is counted from edits and checks. It does not prove the goal is reached.'))
  return lines
}

// Nothing of the item text is read.
export function todoCounts(todos: unknown): { done: number; total: number } | undefined {
  if (!Array.isArray(todos)) return undefined
  let done = 0
  for (const t of todos) if (typeof t === 'object' && t !== null && (t as { status?: unknown }).status === 'completed') done += 1
  return { done, total: todos.length }
}


const MACHINE = new Set(['scheduled-trigger', 'peer', 'peer-send-message', 'projects-relay', 'channel', 'coordinator', 'observer', 'observer-activity', 'auto-continuation', 'slack-ping', 'task-notification'])
export const isPersonMessage = (text: string, origin: { kind?: string } | undefined): boolean => !text.trimStart().startsWith('/') && text.trim() !== '' && !MACHINE.has(origin?.kind ?? '')
