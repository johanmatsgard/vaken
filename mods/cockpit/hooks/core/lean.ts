// Lean session: long shell output cut before Claude reads it, and a few start facts on a conversation's first message. No output text is ever stored.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { commandKind } from './happened'
import { healthOf, tally } from './crewpr'
import type { PrFacts } from './crewpr'

// 'repeats' is All long output plus the quiet repeat reminders (below); it is never the default.
export type LeanMode = 'off' | 'logs' | 'all' | 'repeats'
export const leanModeOf = (v: unknown): LeanMode => (v === 'off' ? 'off' : v === 'all' ? 'all' : v === 'repeats' ? 'repeats' : 'logs')
export const cutsAll = (m: LeanMode): boolean => m === 'all' || m === 'repeats'

export const LEAN_LABEL = 'Lean session'
export const LEAN_NOTE = 'Cuts long logs to the errors and last lines. A new chat starts with git facts.'
export const LEAN_OPT_LOGS = 'Logs only'
export const LEAN_OPT_ALL = 'All long output'
export const LEAN_OPT_REPEATS = 'All, skip repeats'
export const LEAN_SETTINGS: Setting[] = [
  {
    key: 'lean.mode',
    group: 'Cache',
    label: LEAN_LABEL,
    note: LEAN_NOTE,
    options: [
      { value: 'off', label: 'Off' },
      { value: 'logs', label: LEAN_OPT_LOGS },
      { value: 'all', label: LEAN_OPT_ALL },
      { value: 'repeats', label: LEAN_OPT_REPEATS },
    ],
    default: 'logs',
  },
]
export const LEAN_HELP_TITLE = 'What a lean session is'
export const LEAN_HELP_TEXT = 'Before Claude reads it, a long install, test, build or lint log is cut to its first lines, its error lines and its last 40 lines; a file read again with no change gets one line instead of its text, once; with All long output, a huge read, search, page or tool answer is also cut to its first and last lines, with one line on how to ask for the rest; with All, skip repeats, a todo list or auto mode reminder that comes again unchanged also becomes one short note, never the first one or a changed one. A new chat starts with the branch and the count of changed files, and before a big job one line says about how much of the 5-hour window it may use. /vaken-usage says how many lines were cut today.'
export const LEAN_HELP: HelpEntry[] = [{ title: LEAN_HELP_TITLE, text: LEAN_HELP_TEXT }]
// A table row with one and many forms (i18n/rows/lean.ts).
export const LEAN_CUT_LINE = 'lean.cut_line'
export const LEAN_REPEAT_LINE = 'lean.repeat_line'
export const LEAN_STRINGS: string[] = [LEAN_LABEL, LEAN_NOTE, LEAN_OPT_LOGS, LEAN_OPT_ALL, LEAN_OPT_REPEATS, LEAN_HELP_TITLE, LEAN_HELP_TEXT]

export const LONG_LINES = 120
export const LONG_CHARS = 12_000
export const HEAD_LINES = 15
export const TAIL_LINES = 40
export const ERROR_LINES_MAX = 60
export const FAILED_KEEP_UNDER = 400
// A kept error line longer than this is shortened, so one huge line cannot undo the cut.
const LINE_CHARS_MAX = 400

const ERROR_RE = /error|fail|panic|exception|warning|traceback|not ok|✖|✗/i
export const cutNote = (n: number): string => `vaken cut ${n} lines of this output. If you need them, run the command again with a filter (grep, tail or head).` // en-only: text for Claude, not shown in the pane

// Reading a file, a diff or a search: Claude asked for exactly that text.
const READ_RE = /^(?:sudo\s+)?(?:cat|bat|less|more|head|tail|sed|awk|nl|jq|yq|grep|egrep|rg|ag|type|Get-Content|gc|Select-String|sls)\b|^git\s+(?:diff|show|blame|grep|cat-file)\b|^git\s+log\b.*\s(?:-p|--patch)\b/i
export function readsText(command: string): boolean {
  return command.split(/&&|\|\||[;|\n]/).some(part => READ_RE.test(part.trim().replace(/^\(+/, '')))
}
const LOG_KINDS: ReadonlySet<string> = new Set(['install', 'test', 'build', 'lint'])
export const isLogCommand = (command: string): boolean => LOG_KINDS.has(commandKind(command))

export type CutAsk = { mode: LeanMode; command: string; byAgent: boolean }
export function mayCut(a: CutAsk): boolean {
  if (a.mode === 'off' || readsText(a.command)) return false
  if (cutsAll(a.mode)) return true
  return !a.byAgent && isLogCommand(a.command)
}

export function cutText(text: string): { text: string; cut: number } | undefined {
  const lines = text.split('\n')
  if (lines.length <= LONG_LINES && text.length <= LONG_CHARS) return undefined
  const middle = lines.slice(HEAD_LINES, Math.max(HEAD_LINES, lines.length - TAIL_LINES))
  const kept = middle.filter(l => ERROR_RE.test(l)).slice(0, ERROR_LINES_MAX).map(l => (l.length > LINE_CHARS_MAX ? `${l.slice(0, LINE_CHARS_MAX)}...` : l))
  const cut = middle.length - kept.length
  if (cut <= 0) return undefined
  return { text: [...lines.slice(0, HEAD_LINES), cutNote(cut), ...kept, ...lines.slice(lines.length - TAIL_LINES)].join('\n'), cut }
}

const lineCount = (s: unknown): number => (typeof s === 'string' && s !== '' ? s.split('\n').length : 0)
const numberIn = (o: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const k of keys) if (typeof o[k] === 'number') return o[k] as number
  return undefined
}
export function failedResponse(resp: unknown): boolean {
  if (typeof resp === 'string') return /^(?:Error: )?Exit code [1-9]/.test(resp)
  if (resp === null || typeof resp !== 'object') return false
  const o = resp as Record<string, unknown>
  const code = numberIn(o, ['exitCode', 'exit_code', 'code', 'returnCode'])
  return o.interrupted === true || (code !== undefined && code !== 0)
}

// The shell tool's result as PostToolUse gets it: a string, or an object with `stdout` and `stderr`. Undefined when nothing is cut.
export function cutResponse(resp: unknown): { response: unknown; cut: number } | undefined {
  const failed = failedResponse(resp)
  if (typeof resp === 'string') {
    if (failed && lineCount(resp) < FAILED_KEEP_UNDER) return undefined
    const c = cutText(resp)
    return c === undefined ? undefined : { response: c.text, cut: c.cut }
  }
  if (resp === null || typeof resp !== 'object') return undefined
  const o = resp as Record<string, unknown>
  if (typeof o.stdout !== 'string' && typeof o.stderr !== 'string') return undefined
  if (failed && lineCount(o.stdout) + lineCount(o.stderr) < FAILED_KEEP_UNDER) return undefined
  const out = typeof o.stdout === 'string' ? cutText(o.stdout) : undefined
  const err = typeof o.stderr === 'string' ? cutText(o.stderr) : undefined
  if (out === undefined && err === undefined) return undefined
  return { response: { ...o, ...(out === undefined ? {} : { stdout: out.text }), ...(err === undefined ? {} : { stderr: err.text }) }, cut: (out?.cut ?? 0) + (err?.cut ?? 0) }
}

// Counts only, in memory; `day` starts them again on a new day. `repeats` and `chars` count the repeat reminders left out (below) and the characters that saved.
// `pendCuts` and `pendTokens` are what the Autopilot log has not been given yet (written in one throttled batch, features/lean.ts); `timer` is true while a batch waits.
export const leanMem: { mode: LeanMode; day: string; cuts: number; lines: number; repeats: number; chars: number; pendCuts: number; pendTokens: number; timer: boolean } = { mode: 'logs', day: '', cuts: 0, lines: 0, repeats: 0, chars: 0, pendCuts: 0, pendTokens: 0, timer: false }
// The Autopilot log's one row a day says about how many tokens the cuts saved: a cut line is about 12 tokens (a line is about 50 characters, and a token about 4), a left-out reminder's characters 4 to a token. Always said as an estimate.
export const TOKENS_PER_LINE = 12
export const CHARS_PER_TOKEN = 4
// How long cuts are kept in memory before the log row is written (a cut is on the hot path; the write is not).
export const LEAN_FLUSH_MS = 30_000
export const dayOf = (now: number): string => new Date(now).toDateString()
function rollDay(now: number): void {
  const day = dayOf(now)
  if (leanMem.day !== day) Object.assign(leanMem, { day, cuts: 0, lines: 0, repeats: 0, chars: 0 })
}
export function noteCut(cut: number, now: number): void {
  rollDay(now)
  leanMem.cuts += 1
  leanMem.lines += cut
  leanMem.pendCuts += 1
  leanMem.pendTokens += cut * TOKENS_PER_LINE
}
export function noteRepeat(chars: number, now: number): void {
  rollDay(now)
  leanMem.repeats += 1
  leanMem.chars += chars
  leanMem.pendCuts += 1
  leanMem.pendTokens += Math.round(chars / CHARS_PER_TOKEN)
}
export function cutsToday(now: number): { cuts: number; lines: number; repeats: number; chars: number } {
  return leanMem.day === dayOf(now) ? { cuts: leanMem.cuts, lines: leanMem.lines, repeats: leanMem.repeats, chars: leanMem.chars } : { cuts: 0, lines: 0, repeats: 0, chars: 0 }
}

// The start block: facts from one local git call and what vaken already stored about the pull request.
export const START_BLOCK = 'vakenStart'
export const START_GIT_ARGV = ['git', '--no-optional-locks', 'status', '--porcelain=v1', '--branch']
export const START_GIT_TIMEOUT_MS = 1500
// A stored pull request older than this is not told.
export const START_PR_MAX_AGE_MS = 30 * 60_000
const BRANCH_CHARS_MAX = 80

export type GitStart = { branch?: string; changed: number }
export function parseStatus(stdout: string): GitStart {
  const lines = stdout.split('\n').filter(l => l.trim() !== '')
  const head = lines[0]?.startsWith('## ') === true ? lines[0].slice(3) : undefined
  const changed = lines.length - (head === undefined ? 0 : 1)
  if (head === undefined || /^HEAD \(no branch\)/.test(head)) return { changed }
  const name = head.replace(/^No commits yet on /, '').replace(/^Initial commit on /, '').split('...')[0]?.split(' ')[0] ?? ''
  return name === '' ? { changed } : { branch: name.slice(0, BRANCH_CHARS_MAX), changed }
}

export type StartPr = { number: number; failing: boolean; pending: boolean }
export function startText(g: GitStart, pr: StartPr | undefined): string {
  const lines = ['Facts vaken read on this computer at the start of this chat:'] // en-only: text for Claude, not shown in the pane
  lines.push(g.branch === undefined ? 'Branch: none (a detached HEAD).' : `Branch: ${g.branch}`) // en-only: text for Claude
  lines.push(`Changed files not committed: ${g.changed}`) // en-only: text for Claude
  if (pr !== undefined) lines.push(`Open pull request #${pr.number} for this branch. Its checks ${pr.failing ? 'fail' : pr.pending ? 'are still running' : 'pass'}, as vaken last read them.`) // en-only: text for Claude
  return lines.join('\n')
}

const slashed = (p: string): string => p.replace(/\\/g, '/').replace(/\/+$/, '')
// The shared pull request facts are kept per repository folder and branch; the repository that holds `cwd` most closely wins.
export function startPrOf(raw: unknown, cwd: string, branch: string | undefined, now: number): StartPr | undefined {
  if (branch === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const here = `${slashed(cwd)}/`
  let best: { top: number; f: PrFacts } | undefined
  for (const [id, f] of Object.entries(raw as Record<string, unknown>)) {
    const at = id.indexOf('\n')
    if (at < 0 || id.slice(at + 1) !== branch || f === null || typeof f !== 'object') continue
    const facts = f as PrFacts
    if (typeof facts.at !== 'number' || now - facts.at < 0 || now - facts.at > START_PR_MAX_AGE_MS) continue
    const top = slashed(id.slice(0, at)).replace(/\/\.git$/, '')
    if (top === '' || !here.startsWith(`${top}/`)) continue
    if (best === undefined || top.length > best.top) best = { top: top.length, f: facts }
  }
  const v = best?.f.view
  if (v === undefined || v.state !== 'OPEN' || !Array.isArray(v.checks)) return undefined
  const h = healthOf(tally(v.checks))
  return { number: v.number, failing: h === 'failing', pending: h === 'pending' }
}

// Big reads (All long output only): a huge result from Read, Grep, Glob, WebFetch or an MCP tool is cut to its first and last lines
// and a count, with one line that says how to ask for the rest. Only counts are kept, never the text.
export type BigKind = 'read' | 'grep' | 'glob' | 'webfetch' | 'mcp'
export function bigKindOf(tool: string): BigKind | undefined {
  if (tool === 'Read') return 'read'
  if (tool === 'Grep') return 'grep'
  if (tool === 'Glob') return 'glob'
  if (tool === 'WebFetch') return 'webfetch'
  return /^mcp__/.test(tool) ? 'mcp' : undefined
}
export const BIG_LINES = 1000
export const BIG_CHARS = 100_000
export const BIG_HEAD = 100
export const BIG_TAIL = 30
// A result of few but very long lines (a minified page, one JSON line) is cut by characters instead.
export const BIG_HEAD_CHARS = 20_000
export const BIG_TAIL_CHARS = 4_000
// The day's tally counts a cut by characters as lines of about this many characters.
const CHARS_PER_LINE = 100

const has = (o: Record<string, unknown>, k: string): boolean => o[k] !== undefined && o[k] !== null && o[k] !== ''
// The never-cut list per tool: Claude already asked for an exact part, or the text is one Claude must see whole.
const WHOLE_FILE_RE = /(?:^|[\\/])(?:CLAUDE|AGENTS|SKILL)\.md$|[\\/]\.claude[\\/]plans[\\/]/i
export const NEVER_CUT: Record<BigKind, (tool: string, input: Record<string, unknown>) => boolean> = {
  read: (_t, i) => has(i, 'offset') || has(i, 'limit') || has(i, 'pages') || (typeof i.file_path === 'string' && WHOLE_FILE_RE.test(i.file_path)),
  grep: (_t, i) => has(i, 'head_limit') || i.output_mode === 'count',
  glob: () => false,
  webfetch: (_t, i) => has(i, 'offset'),
  // vaken's own tools answer short on purpose.
  mcp: t => /^mcp__(?:plugin_)?vaken(?:_vaken)?__/.test(t),
}

const BIG_WHAT: Record<BigKind, string> = { read: 'file read', grep: 'search', glob: 'file list', webfetch: 'page', mcp: 'tool answer' } // en-only: text for Claude, not shown in the pane
const BIG_ASK: Record<BigKind, string> = {
  read: 'Read again with offset and limit for the part you need.', // en-only: text for Claude
  grep: 'Search again with a narrower pattern, a path, a glob or head_limit.', // en-only: text for Claude
  glob: 'Search again with a narrower pattern or path.', // en-only: text for Claude
  webfetch: 'Fetch again with a narrower prompt, or with offset to read on.', // en-only: text for Claude
  mcp: 'Ask the tool again for a smaller part (a page, a filter or a limit).', // en-only: text for Claude
}
// The one line for Claude, not shown in the pane.
export const bigNote = (kind: BigKind, cut: number, total: number, unit: 'lines' | 'characters' | 'names' = 'lines'): string =>
  `vaken cut ${cut} of the ${total} ${unit} of this ${BIG_WHAT[kind]}. ${BIG_ASK[kind]}` // en-only: text for Claude

// Head, one note line and tail. `tail: false` keeps no tail (a file read: the app numbers its lines, so lines after the note would get wrong numbers).
export function cutBigText(text: string, kind: BigKind, tail = true): { text: string; cut: number } | undefined {
  const lines = text.split('\n')
  const tailN = tail ? BIG_TAIL : 0
  // A file read is cut only above the character limit: a 1000 to 2000 line file of ordinary lines goes through whole.
  if (lines.length > BIG_LINES && (kind !== 'read' || text.length > BIG_CHARS)) {
    const cut = lines.length - BIG_HEAD - tailN
    return { text: [...lines.slice(0, BIG_HEAD), bigNote(kind, cut, lines.length), ...lines.slice(lines.length - tailN)].join('\n'), cut }
  }
  if (!tail || text.length <= BIG_CHARS) return undefined
  const cutChars = text.length - BIG_HEAD_CHARS - BIG_TAIL_CHARS
  return { text: `${text.slice(0, BIG_HEAD_CHARS)}\n${bigNote(kind, cutChars, text.length, 'characters')}\n${text.slice(text.length - BIG_TAIL_CHARS)}`, cut: Math.ceil(cutChars / CHARS_PER_LINE) }
}

function cutList(names: unknown[], kind: BigKind): { list: unknown[]; cut: number } | undefined {
  if (names.length <= BIG_LINES) return undefined
  const cut = names.length - BIG_HEAD - BIG_TAIL
  return { list: [...names.slice(0, BIG_HEAD), bigNote(kind, cut, names.length, 'names'), ...names.slice(names.length - BIG_TAIL)], cut }
}

const objOf = (v: unknown): Record<string, unknown> | undefined => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined)

// An MCP answer: a string, a list of content blocks, or an object holding `content`. Each long text block is cut.
function cutBlocks(blocks: unknown[]): { blocks: unknown[]; cut: number } | undefined {
  let cut = 0
  const out = blocks.map(b => {
    const o = objOf(b)
    if (o === undefined || o.type !== 'text' || typeof o.text !== 'string') return b
    const c = cutBigText(o.text, 'mcp')
    if (c === undefined) return b
    cut += c.cut
    return { ...o, text: c.text }
  })
  return cut === 0 ? undefined : { blocks: out, cut }
}

// The tool's result in the shape PostToolUse gets it, cut; undefined when nothing is cut or the call is on the never-cut list.
export function cutBig(tool: string, input: Record<string, unknown>, resp: unknown): { response: unknown; cut: number } | undefined {
  const kind = bigKindOf(tool)
  if (kind === undefined || NEVER_CUT[kind](tool, input)) return undefined
  if (typeof resp === 'string') {
    const c = cutBigText(resp, kind, kind !== 'read')
    return c === undefined ? undefined : { response: c.text, cut: c.cut }
  }
  if (kind === 'mcp' && Array.isArray(resp)) {
    const c = cutBlocks(resp)
    return c === undefined ? undefined : { response: c.blocks, cut: c.cut }
  }
  const o = objOf(resp)
  if (o === undefined) return undefined
  if (kind === 'read') {
    const f = objOf(o.file)
    if (o.type !== 'text' || f === undefined || typeof f.content !== 'string') return undefined
    const c = cutBigText(f.content, kind, false)
    return c === undefined ? undefined : { response: { ...o, file: { ...f, content: c.text, numLines: BIG_HEAD + 1 } }, cut: c.cut }
  }
  if (kind === 'grep' || kind === 'glob') {
    const content = typeof o.content === 'string' ? cutBigText(o.content, kind) : undefined
    const names = Array.isArray(o.filenames) ? cutList(o.filenames, kind) : undefined
    if (content === undefined && names === undefined) return undefined
    return { response: { ...o, ...(content === undefined ? {} : { content: content.text }), ...(names === undefined ? {} : { filenames: names.list }) }, cut: (content?.cut ?? 0) + (names?.cut ?? 0) }
  }
  if (kind === 'webfetch') {
    const c = typeof o.result === 'string' ? cutBigText(o.result, kind) : undefined
    return c === undefined ? undefined : { response: { ...o, result: c.text }, cut: c.cut }
  }
  if (Array.isArray(o.content)) {
    const c = cutBlocks(o.content)
    return c === undefined ? undefined : { response: { ...o, content: c.blocks }, cut: c.cut }
  }
  return undefined
}

// No double reads (any mode but Off): a file read again with no change since the last read in this conversation gets one line instead of its text, once.
// Only the path and range, a hash and the step are kept, in memory, per session and agent. An edit or a write to the path, and a compaction, forget it.
export const READS_PER_CONTEXT_MAX = 400
export const CONTEXTS_MAX = 32
type ReadSeen = { hash: string; step: number; noted: boolean }
type ReadContext = { step: number; reads: Map<string, ReadSeen> }
export const readMem: Map<string, ReadContext> = new Map()
// FNV-1a over the text, with its length: enough to tell a change, never the text itself.
const FNV_SEED = 0x811c9dc5
const FNV_PRIME = 0x01000193
const HASH_BASE = 36
export function hashOf(text: string): string {
  let h = FNV_SEED
  for (let k = 0; k < text.length; k++) h = Math.imul(h ^ text.charCodeAt(k), FNV_PRIME) >>> 0
  return `${text.length.toString(HASH_BASE)}.${h.toString(HASH_BASE)}`
}
export const unchangedNote = (): string => `vaken: this file is unchanged since your earlier read, so its text is left out here. If you need the text, read it again now and you get it in full.` // en-only: text for Claude, not shown in the pane

function contextOf(session: string, agent: string | undefined): ReadContext {
  const key = `${session}\n${agent ?? ''}`
  let c = readMem.get(key)
  if (c === undefined) {
    c = { step: 0, reads: new Map() }
    readMem.set(key, c)
    while (readMem.size > CONTEXTS_MAX) readMem.delete(readMem.keys().next().value as string)
  }
  return c
}
// Every tool call of this session and agent is one step.
export function noteStep(session: string, agent: string | undefined): number {
  const c = contextOf(session, agent)
  c.step += 1
  return c.step
}
export const EDIT_TOOLS: ReadonlySet<string> = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
export function forgetPath(session: string, path: string): void {
  for (const [key, c] of readMem) {
    if (!key.startsWith(`${session}\n`)) continue
    for (const k of [...c.reads.keys()]) if (k.startsWith(`${path}\n`)) c.reads.delete(k)
  }
}
export function forgetSession(session: string): void {
  for (const key of [...readMem.keys()]) if (key.startsWith(`${session}\n`)) readMem.delete(key)
  for (const key of [...repeatMem.keys()]) if (key.startsWith(`${session}\n`)) repeatMem.delete(key)
}

// A Read's result: the note when the same range of the same file is unchanged since the last read; undefined keeps the text.
export function rereadOf(session: string, agent: string | undefined, input: Record<string, unknown>, resp: unknown): { response: unknown; lines: number } | undefined {
  const o = objOf(resp)
  const f = objOf(o?.file)
  const path = typeof input.file_path === 'string' ? input.file_path : undefined
  if (o === undefined || f === undefined || o.type !== 'text' || typeof f.content !== 'string' || path === undefined) return undefined
  const c = contextOf(session, agent)
  const key = `${path}\n${String(input.offset ?? '')}:${String(input.limit ?? '')}`
  const hash = hashOf(f.content)
  const seen = c.reads.get(key)
  if (seen !== undefined && seen.hash === hash && !seen.noted) {
    seen.noted = true
    return { response: { ...o, file: { ...f, content: unchangedNote(), numLines: 1 } }, lines: typeof f.numLines === 'number' ? f.numLines : f.content.split('\n').length }
  }
  // A read after the note, or a changed file: the text goes through, and this read is the one to compare with next.
  c.reads.delete(key)
  c.reads.set(key, { hash, step: c.step, noted: false })
  while (c.reads.size > READS_PER_CONTEXT_MAX) c.reads.delete(c.reads.keys().next().value as string)
  return undefined
}

// Quiet repeat reminders (the All, skip repeats choice of lean.mode): a reminder the engine repeats turn after turn with the same text is replaced by one short note.
// Only these reminder kinds are ever touched: each names a state Claude already read, never the person's words, a file or a plan.
// Only a hash and a count are kept, in memory, per session, agent and kind. The first one of a kind and one that changed always go through; a compaction forgets them.
export const REPEAT_WHAT: Readonly<Record<string, string>> = { todo_reminder: 'todo list', task_reminder: 'task list', auto_mode: 'auto mode' } // en-only: words for Claude, not shown in the pane
export const REPEAT_KINDS_RE = /^(?<leanquiet>)(?:todo_reminder|task_reminder|auto_mode)$/
export const REPEAT_KEYS_MAX = 64
type RepeatSeen = { hash: string; count: number }
export const repeatMem: Map<string, RepeatSeen> = new Map()
export const repeatNote = (type: string): string => `vaken: this ${REPEAT_WHAT[type] ?? 'reminder'} reminder is the same as the last one, so its text is left out here. Nothing in it changed.` // en-only: text for Claude, not shown in the pane

// The text to send in place of a repeated reminder, with the characters that saves; undefined keeps the reminder (a first one, a changed one, or one the note would not shorten).
export function repeatOf(session: string, agent: string | undefined, type: string, text: string): { text: string; saved: number } | undefined {
  if (REPEAT_WHAT[type] === undefined) return undefined
  const key = `${session}\n${agent ?? ''}\n${type}`
  const hash = hashOf(text)
  const seen = repeatMem.get(key)
  if (seen !== undefined && seen.hash === hash) {
    const note = repeatNote(type)
    if (note.length >= text.length) return undefined
    seen.count += 1
    return { text: note, saved: text.length - note.length }
  }
  repeatMem.delete(key)
  repeatMem.set(key, { hash, count: 0 })
  while (repeatMem.size > REPEAT_KEYS_MAX) repeatMem.delete(repeatMem.keys().next().value as string)
  return undefined
}
