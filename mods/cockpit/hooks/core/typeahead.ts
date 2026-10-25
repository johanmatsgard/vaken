// Typeahead rows: while the person types in the chat box, the engine asks for rows for the word at the cursor (`prompt.autocomplete`).
// Vaken adds the things it already keeps: the person's quick actions and saved task sets after "/" or a word, the open pull requests it knows after "#",
// and the files git shows as changed after "@". Tab takes a row. It reads only what is already stored or what git says now, and stores nothing.
// The engine raises the event only from its own prompt box, and only while a plugin hooks it; nothing waits on the rows.
import type { Io } from './io'
import type { HelpEntry } from './registry'
import { OWN_KEY, parseOwn } from './actions'
import type { OwnAction, Say } from './actions'
import { TEMPLATES_KEY, parseTemplates } from './orchestra'
import { PR_SHARED_KEY, isFacts } from './crewpr'
import { PRS_SHOW_MS } from './prcard'
import { STATUS_ARGV, parseGitStatus } from './continuity'

// At most this many rows of vaken's under the engine's own, so its own rows stay the first thing seen.
export const TYPE_ROWS_MAX = 5
// The saved things and the changed files are read again at most this often while the person types: a key press reads nothing.
export const TYPE_KEEP_MS = 30_000
// A plain word offers a quick action from this many letters, so short words never pull rows.
export const TYPE_WORD_MIN = 3
// One git status at most this long; the rows simply do not come when it is slower.
export const TYPE_GIT_TIMEOUT_MS = 1_500
// The quick action's request beside its name is cut to this many characters (the surface cuts the row again to its width).
export const TYPE_PREVIEW_MAX = 80

// What the person reads beside a row; translated where it is said.
export const TYPE_OWN = 'Your quick action: {text}'
export const TYPE_TEMPLATE = 'Loads your saved task set'
export const TYPE_PR = 'Open pull request'
export const TYPE_CHANGED = 'Changed, not committed'
export const TYPE_HELP_TITLE = 'What the rows under the chat box are'
export const TYPE_HELP_TEXT = "With Next step buttons set to Buttons and hint, typing in the chat box offers rows under the app's own: a quick action after / or its name, a saved task set after /, an open pull request after #, and a file changed and not committed after @. Tab takes one, and vaken stores nothing new."
export const TYPE_HELP: HelpEntry[] = [{ title: TYPE_HELP_TITLE, text: TYPE_HELP_TEXT }]
export const TYPE_STRINGS: string[] = [TYPE_OWN, TYPE_TEMPLATE, TYPE_PR, TYPE_CHANGED]

export type TypeKind = 'slash' | 'word' | 'pr' | 'file'
export type Suggestion = { text: string; label?: string; description?: string }
export type OpenPr = { number: number; branch: string }
export type Saved = { own: OwnAction[]; templates: string[]; prs: OpenPr[] }

// The engine's own triggers decide the kind: "/" for commands, "#" for a number, "@" for a file; else a word of letters.
export function kindOf(token: string): TypeKind | undefined {
  const lead = token[0]
  if (lead === '/') return /^\/[^\s/]*$/.test(token) ? 'slash' : undefined
  if (lead === '#') return /^#\d*$/.test(token) ? 'pr' : undefined
  if (lead === '@') return /^@[^\s"#]*$/.test(token) ? 'file' : undefined
  return token.length >= TYPE_WORD_MIN && /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(token) ? 'word' : undefined
}

const low = (s: string): string => s.toLocaleLowerCase()
// A name with spaces matches as typed with dashes too ("fix ci" by "/fix-c"), since a token never holds a space.
const nameMatches = (name: string, typed: string): boolean => low(name).startsWith(low(typed)) || low(name).replace(/\s+/g, '-').startsWith(low(typed))
const oneLine = (s: string): string => {
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length <= TYPE_PREVIEW_MAX ? flat : `${flat.slice(0, TYPE_PREVIEW_MAX - 1)}…`
}
const fill = (s: string, v: Record<string, string>): string => Object.entries(v).reduce((acc, [k, x]) => acc.split(`{${k}}`).join(x), s)

const slashed = (p: string): string => p.replace(/\\/g, '/').replace(/\/+$/, '')
// The open pull requests vaken already shares between sessions, for the repository that holds `cwd`; newest number first, each once.
export function openPrsHere(raw: unknown, cwd: string, now: number): OpenPr[] {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return []
  const here = `${slashed(cwd)}/`
  const found = new Map<number, OpenPr & { at: number }>()
  for (const [id, f] of Object.entries(raw as Record<string, unknown>)) {
    const cut = id.indexOf('\n')
    if (cut < 0 || !isFacts(f) || now - f.at < 0 || now - f.at > PRS_SHOW_MS) continue
    const v = f.view
    if (v === undefined || v.state !== 'OPEN') continue
    const top = slashed(id.slice(0, cut)).replace(/\/\.git$/, '')
    if (top === '' || !here.startsWith(`${top}/`)) continue
    const old = found.get(v.number)
    if (old === undefined || f.at > old.at) found.set(v.number, { number: v.number, branch: f.branch ?? id.slice(cut + 1), at: f.at })
  }
  return [...found.values()].sort((a, b) => b.number - a.number).map(({ number, branch }) => ({ number, branch }))
}

// The files git shows as changed, as the person can name them after "@": no deleted file, no folder, no path with a space.
export function changedPaths(stdout: string): string[] {
  return parseGitStatus(stdout)
    .filter(f => f.code !== 'deleted' && !f.path.endsWith('/') && !/\s/.test(f.path))
    .map(f => f.path)
}

// The rows for one word at the cursor: pure, from what was read.
export function rowsFor(token: string, kind: TypeKind, saved: Saved, files: readonly string[], say: Say): Suggestion[] {
  if (kind === 'slash' || kind === 'word') {
    const typed = kind === 'slash' ? token.slice(1) : token
    const own = saved.own.filter(o => nameMatches(o.name, typed)).map(o => ({ text: o.prompt, label: o.name, description: fill(say(TYPE_OWN), { text: oneLine(o.prompt) }) }))
    const sets = kind === 'slash' ? saved.templates.filter(n => nameMatches(n, typed)).map(n => ({ text: `/vaken-tasks template apply ${n}`, label: n, description: say(TYPE_TEMPLATE) })) : []
    return [...own, ...sets].slice(0, TYPE_ROWS_MAX)
  }
  if (kind === 'pr') {
    const typed = token.slice(1)
    return saved.prs.filter(p => String(p.number).startsWith(typed) && `#${p.number}` !== token).slice(0, TYPE_ROWS_MAX).map(p => ({ text: `#${p.number}`, label: p.branch === '' ? `#${p.number}` : `#${p.number} · ${p.branch}`, description: say(TYPE_PR) }))
  }
  const typed = low(token.slice(1))
  const base = (p: string): string => low(p.slice(p.lastIndexOf('/') + 1))
  const hits = files.filter(p => `@${p}` !== token && (typed === '' || low(p).includes(typed)))
  // A path or a file name that starts with what was typed comes first; git's own order after that.
  const rank = (p: string): number => (low(p).startsWith(typed) || base(p).startsWith(typed) ? 0 : 1)
  return [...hits].sort((a, b) => rank(a) - rank(b)).slice(0, TYPE_ROWS_MAX).map(p => ({ text: `@${p}`, label: p, description: say(TYPE_CHANGED) }))
}

// Memory only, for this process: what was read and when, so a burst of key presses reads once.
export const typeMem: { savedAt?: number; saved?: Saved; say?: Say; savedCwd?: string; filesAt?: number; filesCwd?: string; files?: string[]; reading?: Promise<void>; gitting?: Promise<void> } = {}

export function forgetTypeahead(): void {
  for (const k of Object.keys(typeMem) as Array<keyof typeof typeMem>) delete typeMem[k]
}

const fresh = (at: number | undefined, now: number): boolean => at !== undefined && now - at >= 0 && now - at < TYPE_KEEP_MS

// The quick actions, task sets and open pull requests, read again only after TYPE_KEEP_MS, one read at a time.
export async function savedNow(i: Io, cwd: string, now: number, sayOf: () => Promise<Say>): Promise<{ saved: Saved; say: Say }> {
  if (!(fresh(typeMem.savedAt, now) && typeMem.savedCwd === cwd && typeMem.saved !== undefined && typeMem.say !== undefined)) {
    typeMem.reading ??= (async () => {
      try {
        const [own, sets, prs, say] = await Promise.all([i.get(OWN_KEY), i.get(TEMPLATES_KEY), i.get(PR_SHARED_KEY), sayOf()])
        typeMem.saved = { own: parseOwn(own), templates: Object.keys(parseTemplates(sets)), prs: openPrsHere(prs, cwd, now) }
        typeMem.say = say
      } catch {
        typeMem.saved = { own: [], templates: [], prs: [] }
        typeMem.say = s => s
      }
      typeMem.savedAt = now
      typeMem.savedCwd = cwd
    })().finally(() => {
      typeMem.reading = undefined
    })
    await typeMem.reading
  }
  return { saved: typeMem.saved ?? { own: [], templates: [], prs: [] }, say: typeMem.say ?? (s => s) }
}

// The changed files from one git status, run again only after TYPE_KEEP_MS; a failed or slow run gives no rows.
export async function filesNow(i: Io, cwd: string, now: number): Promise<string[]> {
  if (!(fresh(typeMem.filesAt, now) && typeMem.filesCwd === cwd && typeMem.files !== undefined)) {
    typeMem.gitting ??= (async () => {
      let files: string[] = []
      try {
        const r = await i.run([...STATUS_ARGV], { cwd, timeoutMs: TYPE_GIT_TIMEOUT_MS })
        files = r.exitCode === 0 ? changedPaths(r.stdout) : []
      } catch {
        files = []
      }
      typeMem.files = files
      typeMem.filesAt = now
      typeMem.filesCwd = cwd
    })().finally(() => {
      typeMem.gitting = undefined
    })
    await typeMem.gitting
  }
  return typeMem.files ?? []
}

// One word at the cursor to its rows: reads only for a kind that can have rows, and only what that kind needs.
export async function typeaheadRows(i: Io, token: string, cwd: string, now: number, sayOf: () => Promise<Say>): Promise<Suggestion[]> {
  const kind = kindOf(token)
  if (kind === undefined) return []
  const { saved, say } = await savedNow(i, cwd, now, sayOf)
  if ((kind === 'slash' || kind === 'word') && saved.own.length === 0 && (kind === 'word' || saved.templates.length === 0)) return []
  if (kind === 'pr' && saved.prs.length === 0) return []
  const files = kind === 'file' ? await filesNow(i, cwd, now) : []
  return rowsFor(token, kind, saved, files, say)
}
