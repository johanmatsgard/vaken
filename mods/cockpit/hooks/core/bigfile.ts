// Big-file guard: when the person names a huge file after "@" (a lock file, a log), Claude would read all of it and spend the session's room.
// One calm question offers the last lines instead; only that press changes the mention (prompt.mention reads a range then). Nothing is stored.
import type { HelpEntry } from './registry'
import { fmt } from './fmt'
import type { Lang } from '../i18n/types'

// A mentioned file is big from this many lines (a lock file, a long log) ...
export const BIG_MENTION_LINES = 2000
// ... or from this many bytes (200 KB), whichever comes first.
export const BIG_MENTION_BYTES = 200 * 1024
// The press sends this many lines from the end of the file.
export const BIG_TAIL_LINES = 200
// A file over this size is not read to count its lines (the engine's own read refuses over 4 MiB, and a read costs more than it saves); it goes as the engine sends it.
// The size comes from a stat; a file is read only after the stat says it may be big.
export const BIG_COUNT_MAX_BYTES = 4 * 1024 * 1024
// The question waits this long for a press, since sending is held while it is open; then the file goes whole, as typed.
export const BIG_ASK_WAIT_MS = 20_000
// Kinds the engine attaches in its own way (pages, pictures, notebooks): never asked about.
const OWN_WAY = /\.(pdf|png|jpe?g|gif|webp|bmp|ico|svg|ipynb|zip|gz|tgz|jar|wasm)$/i

// What the person reads; translated where it is said.
export const BIG_ASK = '{name} is big: {lines} lines, {size}. Send Claude only the last {tail} lines?'
export const BIG_ASK_HEAD = 'Big file'
export const BIG_TAIL = 'Send the last {tail} lines instead'
export const BIG_WHOLE = 'Send the whole file'
export const BIG_FAILED = 'Could not send part of {name}. Type @{mention}#L{from}-{to} to send its last {tail} lines.'
export const BIG_HELP_TITLE = 'Why vaken asks about a big file'
export const BIG_HELP_TEXT = 'When you name a file after @ that has more than 2000 lines or 200 KB, such as a lock file or a log, vaken asks once: Send the last 200 lines instead, or Send the whole file. Only your press changes what Claude reads; with no answer the file goes whole, and you can type the lines yourself (@app.log#L800-1000). Lean session Off turns the question off.'
export const BIG_HELP: HelpEntry[] = [{ title: BIG_HELP_TITLE, text: BIG_HELP_TEXT }]
export const BIG_STRINGS: string[] = [BIG_ASK, BIG_ASK_HEAD, BIG_TAIL, BIG_WHOLE, BIG_FAILED, BIG_HELP_TITLE, BIG_HELP_TEXT]

// A whole-file mention only: one that already names its lines (a range after the name, or one a hook set) is the person's own choice.
export const isWholeMention = (mention: string, offset: number | undefined, limit: number | undefined): boolean => offset === undefined && limit === undefined && !/#L\d/i.test(mention)
export const askedAbout = (path: string): boolean => !OWN_WAY.test(path)

// Lines as an editor counts them: a last line with no newline still counts.
export function countLines(text: string): number {
  if (text === '') return 0
  let n = 0
  for (let at = text.indexOf('\n'); at >= 0; at = text.indexOf('\n', at + 1)) n += 1
  return text.endsWith('\n') ? n : n + 1
}

// Big when over either limit, and only when the last lines are a real saving (more lines than twice the tail).
export const isBig = (lines: number, bytes: number): boolean => (lines > BIG_MENTION_LINES || bytes > BIG_MENTION_BYTES) && lines > BIG_TAIL_LINES * 2

// The range the press reads: the last BIG_TAIL_LINES lines, counted from 1.
export function tailRange(lines: number): { offset: number; limit: number } {
  const offset = Math.max(1, lines - BIG_TAIL_LINES + 1)
  return { offset, limit: lines - offset + 1 }
}

const fill = (s: string, v: Record<string, string | number>): string => Object.entries(v).reduce((acc, [k, x]) => acc.split(`{${k}}`).join(String(x)), s)
const nameOf = (path: string): string => path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)

export type Say = (english: string) => string
export function askWords(path: string, lines: number, bytes: number, t: Say, lang: Lang): { question: string; tail: string; whole: string; head: string } {
  return {
    question: fill(t(BIG_ASK), { name: nameOf(path), lines: fmt.thousandsIn(lines, lang), size: fmt.fileSize(bytes, lang), tail: BIG_TAIL_LINES }),
    tail: fill(t(BIG_TAIL), { tail: BIG_TAIL_LINES }),
    whole: t(BIG_WHOLE),
    head: t(BIG_ASK_HEAD),
  }
}

export function failedWords(path: string, mention: string, lines: number, t: Say): string {
  const r = tailRange(lines)
  return fill(t(BIG_FAILED), { name: nameOf(path), mention: mention.replace(/#.*$/, ''), from: r.offset, to: r.offset + r.limit - 1, tail: BIG_TAIL_LINES })
}

// What Claude reads beside the part, so it knows the rest is there and how to get it.
export const tailNote = (path: string, lines: number): string => {
  const r = tailRange(lines)
  return `Only lines ${r.offset} to ${r.offset + r.limit - 1} of ${lines} of ${path} were attached, the last ${r.limit}, at the person's choice. Read more of the file only if the task needs it.` // en-only: text for Claude, not shown in the pane
}

// Memory only: the answer the person gave per file this session (the last lines or the whole file), so the question comes once per file; and whether this
// prompt has asked already, since at most one file is asked about per prompt (the others go whole, as typed).
export type BigAnswer = 'tail' | 'whole'
export const bigMem: { interactive: boolean; answers: Map<string, BigAnswer>; askedThisPrompt: boolean } = { interactive: false, answers: new Map(), askedThisPrompt: false }
export function forgetBig(interactive: boolean): void {
  bigMem.interactive = interactive
  bigMem.answers = new Map()
  bigMem.askedThisPrompt = false
}
