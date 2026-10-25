// Proof: drift watch, diff of intent, confidence score and anomaly sentinel. Keeps folder names, edit counts, line counts and tool-call counts per session; never a command, output, file content or Claude's words.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { PROOF_KINDS, hashOf, kindName, kindWord, relevantKinds, stateWord, statusOf } from './proof'
import type { ProofKind, ProofState } from './proof'
import { folderOf, isCodePath, isTestPath, riskOf, shortName } from './proof2risk'
import type { Change, FileInfo, Receipt2 } from './proof2risk'
import { strictlyInside, under } from './platform'
import { t as tNow, tr } from '../i18n/t'
import { fillIn } from './fillin'


export const PROOF2_SETTINGS: Setting[] = [
  {
    key: 'proof.drift',
    group: 'Checks',
    label: 'Goal drift warning',
    note: 'Warns when edits wander far from the goal.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'warn', label: 'Warn' },
    ],
    default: 'warn',
  },
  {
    key: 'proof.anomaly',
    group: 'Checks',
    label: 'Odd-change warning',
    note: 'Warns on repeated edits, idle calls or a failing step.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'warn', label: 'Warn' },
    ],
    default: 'warn',
  },
  {
    key: 'proof.confidence',
    group: 'Checks',
    label: 'Confidence score',
    note: 'One number from evidence only, with the list behind it.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]

export const PROOF2_HELP: HelpEntry[] = [
  {
    title: 'How does it notice when Claude drifts?',
    text: 'Goal drift warning tells you when many edits land in folders far from your goal. Odd-change warning tells you when one file is edited again and again, when many calls change no file, or when one kind of command keeps failing. Both warn once and tell Claude.',
  },
  {
    title: 'How sure is Claude, and what comes first?',
    text: '/vaken-help run confidence gives one number made only of evidence, with its list. /vaken-help run intent says what you asked, what was delivered, what is extra and what is missing. /vaken-ship queue puts finished changes in order of risk. /vaken-ship heat says where to look first.',
  },
]

export const DRIFT_WHAT = 'Noticed work far from the goal'
export const ANOMALY_WHAT = 'Spotted odd behaviour'


export const DRIFT_EDITS = 5
export const BASELINE_EDITS = 3
const SAME_FILE = 6
const IDLE_CALLS = 15
const IDLE_CHARS = 40_000
const FAIL_KIND = 3
const FILES_KEEP = 200
const FOLDERS_KEEP = 40
const FLAGS_KEEP = 40
const CHANGES_KEEP = 20
const TEST_TURNS_KEEP = 60


type Fail = { n: number; cmds: string[] }

export type Proof2State = {
  turn: number
  edits: number
  lines: number
  files: Record<string, FileInfo>
  testTurns: number[]
  turnFiles: string[]
  turnLines: number
  early: string[]
  wander: Record<string, number>
  idleCalls: number
  idleChars: number
  fails: Record<string, Fail>
  flags: string[]
  changes: Change[]
}

export const emptyState2 = (): Proof2State => ({ turn: 0, edits: 0, lines: 0, files: {}, testTurns: [], turnFiles: [], turnLines: 0, early: [], wander: {}, idleCalls: 0, idleChars: 0, fails: {}, flags: [], changes: [] })

export function readState2(v: unknown): Proof2State {
  if (typeof v !== 'object' || v === null) return emptyState2()
  const o = v as Partial<Proof2State>
  if (typeof o.turn !== 'number' || typeof o.files !== 'object' || o.files === null || !Array.isArray(o.changes)) return emptyState2()
  return { ...emptyState2(), ...o }
}

export const state2Key = (sessionId: string): string => `cockpit:proof2:${sessionId}`

const lineCount = (v: unknown): number => (typeof v === 'string' && v !== '' ? v.split('\n').length : 0)

// Counted from the input, never read.
export function linesOf(tool: string, input: Record<string, unknown>): number {
  let n: number
  if (tool === 'Write') n = lineCount(input.content)
  else if (tool === 'NotebookEdit') n = lineCount(input.new_source)
  else if (tool === 'MultiEdit' && Array.isArray(input.edits)) n = input.edits.reduce((sum: number, x) => sum + lineCount((x as { old_string?: unknown })?.old_string) + lineCount((x as { new_string?: unknown })?.new_string), 0)
  else n = lineCount(input.old_string) + lineCount(input.new_string)
  return Math.max(1, n)
}

const parentOf = (dir: string): string => folderOf(dir)
export const sameArea = (a: string, b: string): boolean => a === b || strictlyInside(b, a) || strictlyInside(a, b) || parentOf(a) === parentOf(b)
const isTestFolder = (dir: string): boolean => isTestPath(under(dir, 'x'))

const cap = <T>(o: Record<string, T>, keep: number, rank: (v: T) => number): Record<string, T> => {
  const keys = Object.keys(o)
  if (keys.length <= keep) return o
  const drop = new Set(keys.sort((a, b) => rank(o[a]) - rank(o[b])).slice(0, keys.length - keep))
  return Object.fromEntries(Object.entries(o).filter(([k]) => !drop.has(k)))
}

export function recordEdit(s: Proof2State, path: string, lines: number): Proof2State {
  const old = s.files[path]
  const test = isTestPath(path)
  const info: FileInfo = { n: (old?.n ?? 0) + 1, lines: (old?.lines ?? 0) + lines, turns: old?.turns.includes(s.turn) ? old.turns : [...(old?.turns ?? []), s.turn].slice(-12), test, code: isCodePath(path), risk: riskOf(path), turnN: (old?.turnN ?? 0) + 1 }
  const dir = folderOf(path)
  const early = s.edits < BASELINE_EDITS && !s.early.includes(dir) ? [...s.early, dir] : s.early
  const wanders = s.edits >= BASELINE_EDITS && !isTestFolder(dir) && !s.early.some(e => sameArea(e, dir))
  const wander = wanders ? { ...s.wander, [dir]: (s.wander[dir] ?? 0) + 1 } : s.wander
  return {
    ...s,
    edits: s.edits + 1,
    lines: s.lines + lines,
    files: cap({ ...s.files, [path]: info }, FILES_KEEP, f => f.n),
    testTurns: test && !s.testTurns.includes(s.turn) ? [...s.testTurns, s.turn].slice(-TEST_TURNS_KEEP) : s.testTurns,
    turnFiles: s.turnFiles.includes(path) ? s.turnFiles : [...s.turnFiles, path],
    turnLines: s.turnLines + lines,
    early,
    wander: cap(wander, FOLDERS_KEEP, n => n),
    idleCalls: 0,
    idleChars: 0,
    flags: s.flags.filter(f => f !== 'idle'),
  }
}


// They fail as a normal answer (no match, no difference), so never count as a failing step.
const FAIL_OK = new Set(['grep', 'rg', 'diff', 'test', '[', 'which', 'find', 'cat', 'ls', 'head', 'tail', 'cmp', 'command', 'type'])
const WIN_FAIL_OK = new Set(['findstr', 'where', 'dir', 'tasklist', 'get-childitem', 'get-content', 'select-string', 'get-item', 'get-command', 'test-path'])
const RUNNERS = new Set(['npm', 'yarn', 'pnpm', 'bun', 'npx', 'git', 'cargo', 'go', 'make', 'docker', 'swift'])
const PREFIX = new Set(['cd', 'export', 'source', 'set', 'unset'])

export function kindOfCommand(command: string): string | undefined {
  const text = command.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""')
  for (const part of text.split(/&&|\|\||;|\||\n/)) {
    const words = part.trim().split(/\s+/).filter(w => w !== '' && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(w))
    const first = (words[0] ?? '').replace(/^.*\//, '')
    if (first === '' || PREFIX.has(first) || !/^[A-Za-z][\w.+-]*$/.test(first)) continue
    const second = words[1] ?? ''
    return RUNNERS.has(first) && /^[a-z][a-z-]{1,12}$/.test(second) ? `${first} ${second}` : first
  }
  return undefined
}

// So a stretch with it is not 'nothing changed'.
export const writesFiles = (command: string): boolean => /(?:^|[\s;&|])(?:sed\s+-i|tee|mv|cp|rm|touch|mkdir|patch|git\s+(?:apply|commit|checkout|restore|merge|pull|stash|reset|rebase|cherry-pick)|(?:npm|yarn|pnpm|bun)\s+(?:install|i|add|ci|remove)|pip\s+install|cargo\s+add)\b|[^>&0-9]>{1,2}\s*[^\s&]/.test(command)

export function recordCall(s: Proof2State, o: { chars: number; progress: boolean; bash?: { kind: string; cmd: string; failed: boolean } }): Proof2State {
  let fails = s.fails
  if (o.bash !== undefined && !FAIL_OK.has(o.bash.kind.split(' ')[0]) && !WIN_FAIL_OK.has((o.bash.kind.split(' ')[0] ?? '').toLowerCase())) {
    const { kind, cmd, failed } = o.bash
    if (failed) {
      const old = s.fails[kind] ?? { n: 0, cmds: [] }
      const h = hashOf(cmd)
      fails = cap({ ...s.fails, [kind]: { n: old.n + 1, cmds: old.cmds.includes(h) ? old.cmds : [...old.cmds, h].slice(-6) } }, 10, f => f.n)
    } else if (s.fails[kind] !== undefined) {
      fails = Object.fromEntries(Object.entries(s.fails).filter(([k]) => k !== kind))
    }
  }
  return { ...s, fails, idleCalls: o.progress ? 0 : s.idleCalls + 1, idleChars: o.progress ? 0 : s.idleChars + Math.max(0, o.chars), flags: o.progress ? s.flags.filter(f => f !== 'idle') : s.flags }
}

export const afterMessage = (s: Proof2State): Proof2State => ({ ...s, idleCalls: 0, idleChars: 0, fails: {}, flags: s.flags.filter(f => f === 'drift') })


const STOP = new Set(
  // en-only: a list of common words for matching a goal against paths, not text
  'about above across after again all also and any are around because been before being below between both but can could did does done each else even every few for from get give goes going gone had has have her here him his how into its just keep let like look made make many may more most much must need never not now off once one only other our out over own please put same see set she should some such take than that the their them then there these they this those through too under until upon use very was way well were what when where which while who why will with would you your add change create fix implement update make sure want want to new old file files code thing things work working use using called named make'.split(/\s+/),
)

export function goalWords(goal: string | undefined): string[] {
  const out: string[] = []
  for (const m of (goal ?? '').toLowerCase().matchAll(/[\p{L}][\p{L}\p{N}]*/gu)) {
    const w = m[0]
    if (w.length >= 4 && !STOP.has(w) && !out.includes(w)) out.push(w)
  }
  return out.slice(0, 8)
}

const stem = (w: string): string => {
  const x = w.toLowerCase().replace(/(?:ing|ed|es|s)$/, '')
  return x.length >= 4 ? x : w.toLowerCase()
}
const sameWord = (a: string, b: string): boolean => {
  const x = stem(a)
  const y = stem(b)
  return x === y || (Math.min(x.length, y.length) >= 4 && (x.startsWith(y) || y.startsWith(x)))
}

export function namesGoal(path: string, words: string[]): string[] {
  const parts = path.split(/[/._-]+/).filter(p => p.length >= 3)
  return words.filter(w => parts.some(p => sameWord(p, w)))
}


export type Drift = { hasGoal: boolean; edits: number; folders: string[]; over: boolean }

// With no goal, or only common words, nothing can be judged.
export function driftOf(s: Proof2State, goal: string | undefined): Drift {
  const words = goalWords(goal)
  if (words.length === 0) return { hasGoal: false, edits: 0, folders: [], over: false }
  const far = Object.entries(s.wander).filter(([dir]) => namesGoal(dir, words).length === 0).sort((a, b) => b[1] - a[1])
  const edits = far.reduce((n, [, c]) => n + c, 0)
  return { hasGoal: true, edits, folders: far.map(([dir]) => shortName(dir)), over: edits >= DRIFT_EDITS }
}

export const driftBand = (d: Drift): string => `Drift: ${d.edits} edits far from the goal`
export const driftNote = (d: Drift): string => `Vaken note: your last ${d.edits} edits went to folders that do not match the goal (${d.folders.slice(0, 3).join(', ')}). If this is on purpose, tell the person why. If not, go back to the goal.`
export const driftDetail = (d: Drift): string => `${d.edits} edits in ${d.folders.length === 1 ? '1 new folder' : `${d.folders.length} new folders`}: ${d.folders.slice(0, 3).join(', ')}`


export type Anomaly = { flag: string; band: string; note: string; detail: string; toast: string }

export function newAnomalies(s: Proof2State): Anomaly[] {
  const out: Anomaly[] = []
  for (const path of s.turnFiles) {
    const f = s.files[path]
    const flag = `file:${s.turn}:${path}`
    if (f !== undefined && f.turnN >= SAME_FILE && !s.flags.includes(flag)) {
      const name = shortName(path)
      out.push({ flag, band: `${name} edited ${f.turnN} times`, note: `Vaken note: you have edited ${name} ${f.turnN} times in this answer. Stop and tell the person what is not working before you edit it again.`, detail: `${name} edited ${f.turnN} times in one turn`, toast: fillIn(tr('The same file was edited {n} times in one turn: {name}.'), { n: f.turnN, name }) })
    }
  }
  if (s.idleCalls >= IDLE_CALLS && s.idleChars >= IDLE_CHARS && !s.flags.includes('idle')) {
    const kb = Math.round(s.idleChars / 1000)
    out.push({ flag: 'idle', band: `Stuck? ${s.idleCalls} calls, no file changed`, note: `Vaken note: ${s.idleCalls} tool calls in a row changed no file and added about ${kb} thousand characters to the session. Tell the person what you are looking for, or ask.`, detail: `${s.idleCalls} tool calls with no file changed, about ${kb} thousand characters added`, toast: fillIn(tr('{n} tool calls changed no file and the session keeps growing.'), { n: s.idleCalls }) })
  }
  for (const [kind, f] of Object.entries(s.fails)) {
    const flag = `fail:${kind}`
    if (f.n >= FAIL_KIND && f.cmds.length >= 2 && !s.flags.includes(flag)) {
      out.push({ flag, band: `${kind} failed ${f.n} times`, note: `Vaken note: ${kind} commands have failed ${f.n} times, each with a different command. Find the cause before you try another.`, detail: `${kind} failed ${f.n} times with ${f.cmds.length} different commands`, toast: fillIn(tr('{kind} failed {n} times with different commands.'), { kind, n: f.n }) })
    }
  }
  return out
}

export const withFlags = (s: Proof2State, list: Anomaly[]): Proof2State => (list.length === 0 ? s : { ...s, flags: [...s.flags, ...list.map(a => a.flag)].slice(-FLAGS_KEEP) })


// Failed beats missing beats unclear.
function receiptOf(p: ProofState): Receipt2 {
  const st = relevantKinds(p).map(k => statusOf(p, k))
  return st.includes('failed') ? 'failed' : st.some(x => x === 'notrun' || x === 'stale') ? 'missing' : st.includes('unknown') ? 'unclear' : 'ok'
}

export function afterTurn2(s: Proof2State, p: ProofState, at: number): Proof2State {
  const paths = s.turnFiles
  const infos = paths.map(x => s.files[x]).filter((f): f is FileInfo => f !== undefined)
  const change: Change | undefined =
    paths.length === 0
      ? undefined
      : {
          turn: s.turn,
          at,
          files: paths.length,
          lines: s.turnLines,
          code: infos.filter(f => f.code && !f.test).length,
          tests: s.testTurns.includes(s.turn),
          risk: [...new Set(infos.flatMap(f => f.risk))],
          receipt: receiptOf(p),
          names: paths.slice(0, 3).map(shortName),
        }
  return {
    ...s,
    turn: s.turn + 1,
    turnFiles: [],
    turnLines: 0,
    files: Object.fromEntries(Object.entries(s.files).map(([k, f]) => [k, f.turnN === 0 ? f : { ...f, turnN: 0 }])),
    flags: s.flags.filter(f => !f.startsWith('file:')),
    changes: change === undefined ? s.changes : [...s.changes, change].slice(-CHANGES_KEEP),
  }
}


export type Item = { label: string; points: number; max: number; why: string }
export type Confidence = { score?: number; items: Item[]; missing?: string }

const list = (a: string[]): string => (a.length === 0 ? tr('none') : a.join(', '))
const kindList = (a: readonly ProofKind[]): string => list(a.map(kindName))
const sizeTier = (lines: number): number => (lines <= 100 ? 15 : lines <= 300 ? 10 : lines <= 800 ? 5 : 0)

// A missing proof earns nothing and says why.
export function confidence(p: ProofState, s: Proof2State, o: { doneOn: boolean; goal: string | undefined }): Confidence {
  if (p.receipts.length === 0 || (p.edits === 0 && s.edits === 0)) {
    return { items: [], missing: p.edits === 0 && s.edits === 0 ? tr('No file has changed yet, so there is nothing to be sure of.') : tr('No check (tests, build, lint or type check) has run yet.') }
  }
  const kinds = relevantKinds(p)
  const passed = kinds.filter(k => statusOf(p, k) === 'ok')
  const open = kinds.filter(k => statusOf(p, k) !== 'ok')
  const items: Item[] = [
    { label: tr('Checks passed after the last edit'), max: 40, points: Math.round((40 * passed.length) / kinds.length), why: `${fillIn(tr('passed: {list}'), { list: list(passed.map(k => tr(kindWord(k)))) })}${open.length === 0 ? '' : `; ${fillIn(tr('not yet: {list}'), { list: open.map(k => `${tr(kindWord(k))} (${stateWord(k, statusOf(p, k), tr)})`).join(', ') })}`}` },
  ]
  const doneSet = o.doneOn && p.done.length > 0
  items.push({ label: tr('Definition of done met'), max: 20, points: doneSet && p.done.every(k => statusOf(p, k) === 'ok') ? 20 : 0, why: doneSet ? (p.done.every(k => statusOf(p, k) === 'ok') ? fillIn(tr('every chosen check passed ({list})'), { list: kindList(p.done) }) : fillIn(tr('not met: {list} still open'), { list: kindList(p.done.filter(k => statusOf(p, k) !== 'ok')) })) : tr('not set (/vaken-ship done)') })
  const unproven = p.last?.unproven.length ?? 0
  items.push({ label: tr('No unproven claims'), max: 15, points: p.last !== undefined && unproven === 0 ? 15 : 0, why: p.last === undefined ? tr('no finished answer yet') : unproven === 0 ? tr('every claim in the last answer has a check behind it, or none was made') : fillIn(tr('{claims} in the last answer without a check'), { claims: tNow('words.claim', { n: unproven }) }) })
  items.push({ label: tr('Small diff'), max: 15, points: s.edits > 0 ? sizeTier(s.lines) : 0, why: fillIn(tr('{lines} lines changed in {edits} edits (up to 100 lines is the most points)'), { lines: s.lines, edits: s.edits }) })
  const d = driftOf(s, o.goal)
  items.push({ label: tr('No drift'), max: 10, points: !d.hasGoal ? 0 : d.edits === 0 ? 10 : d.over ? 0 : 5, why: !d.hasGoal ? tr('no goal set (/vaken-tasks goal)') : d.edits === 0 ? tr('every edit is near the goal') : fillIn(tr('{edits} in folders far from the goal'), { edits: tNow('words.edit', { n: d.edits }) }) })
  return { score: items.reduce((n, x) => n + x.points, 0), items }
}

export function confidenceLines(c: Confidence): string[] {
  if (c.score === undefined) return [tr('Confidence: not enough evidence yet.'), c.missing ?? '', tr('It needs at least one changed file and one check that ran. Then it counts passing checks, the definition of done, claims, diff size and drift.')].filter(x => x !== '')
  const lines = [fillIn(tr('Confidence: {score} out of 100. It is made only of the evidence below.'), { score: c.score })]
  for (const x of c.items) lines.push(`  ${String(x.points).padStart(2)} ${tr('of')} ${x.max}  ${x.label}: ${x.why}`)
  lines.push(tr('Points come only from checks that ran, not from words. A proof that is missing earns no points. This is not a promise that the work is right.'))
  return lines
}


export function intentText(p: ProofState, s: Proof2State, o: { doneOn: boolean; goal: string | undefined }): string {
  const words = goalWords(o.goal)
  if (o.goal === undefined || words.length === 0) return tr('I cannot compare yet: no goal is set, or it has only common words. Set one with /vaken-tasks goal <one sentence>. Then this shows what you asked, what was delivered, what is extra and what is missing.')
  const parts: string[] = [fillIn(tr('Asked: {words}.'), { words: words.join(', ') })]
  const paths = Object.keys(s.files)
  const checks = PROOF_KINDS.filter(k => statusOf(p, k) === 'ok')
  const named = words.filter(w => paths.some(x => namesGoal(x, [w]).length > 0))
  const passedList = checks.map(k => tr(kindWord(k))).join(', ')
  if (paths.length === 0) parts.push(fillIn(tr('Delivered: no file has changed yet{checks}.'), { checks: checks.length === 0 ? '' : `; ${fillIn(tr('checks that passed: {list}'), { list: passedList })}` }))
  else parts.push(fillIn(tr('Delivered: {files} changed ({edits}); {named}; {checks}.'), { files: tNow('words.file', { n: paths.length }), edits: tNow('words.edit', { n: s.edits }), named: named.length === 0 ? tr('no changed path names a goal word') : fillIn(tr('changed paths name {words}'), { words: named.join(', ') }), checks: checks.length === 0 ? tr('no check has passed since the last edit') : fillIn(tr('checks that passed: {list}'), { list: passedList }) }))
  const d = driftOf(s, o.goal)
  parts.push(d.folders.length === 0 ? tr('Extra: nothing found; every edited folder is near the first ones or named in the goal.') : fillIn(tr('Extra: {edits} in folders the goal does not name: {folders}.'), { edits: tNow('words.edit', { n: d.edits }), folders: d.folders.slice(0, 4).join(', ') }))
  const set = o.doneOn && p.done.length > 0
  const open = (set ? p.done : paths.length > 0 ? relevantKinds(p) : []).filter(k => statusOf(p, k) !== 'ok')
  if (set) parts.push(open.length === 0 ? tr('Missing: nothing; every check in your definition of done passed after the last edit.') : fillIn(tr('Missing: {list} from your definition of done.'), { list: open.map(k => `${tr(kindWord(k))} (${stateWord(k, statusOf(p, k), tr)})`).join(', ') }))
  else parts.push(fillIn(tr('Missing: no definition of done is set, so this cannot say.{more}'), { more: open.length === 0 ? '' : ` ${fillIn(tr('Checks that have not passed since the last edit: {list}.'), { list: open.map(k => tr(kindWord(k))).join(', ') })}` }))
  return parts.join(' ')
}
