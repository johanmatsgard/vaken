// What a compaction kept: file names and counts only, never the summary text. Pure.
import type { SessionMessage } from 'claude-code'
import { isEditTool } from './tools'
import { lastName } from './platform'
import { t as tHere, tEn } from '../i18n/t'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'

// `keep`: how many keep-list items the summary was asked to keep, and how many it left out (core/compactcheck.ts); counts only
export type Diff = { at: number; files: number; kept: number; dropped: string[]; branchKept?: boolean; keep?: { total: number; lost: number } }

export const diffKey = (sessionId: string): string => `cockpit:compactdiff:${sessionId}`

const MAX_FILES = 60
const MAX_DROPPED = 6

export function filesFromMessages(messages: readonly Pick<SessionMessage, 'toolUses'>[]): string[] {
  const out: string[] = []
  for (const m of messages) {
    for (const t of m.toolUses ?? []) {
      if (!isEditTool(t.tool)) continue
      const p = t.input.file_path ?? t.input.notebook_path
      if (typeof p === 'string' && p !== '' && !out.includes(p) && out.length < MAX_FILES) out.push(p)
    }
  }
  return out
}

const base = (p: string): string => lastName(p)

export function compare(files: string[], summary: string, branch: string | undefined, at: number): Diff {
  const text = summary.toLowerCase()
  const dropped = files.filter(f => !text.includes(base(f).toLowerCase()))
  return {
    at,
    files: files.length,
    kept: files.length - dropped.length,
    dropped: dropped.slice(0, MAX_DROPPED).map(base),
    ...(branch === undefined || branch === '' ? {} : { branchKept: text.includes(branch.toLowerCase()) }),
  }
}

// The counts go through the plural rows: English from the English table, the other language from the table of this answer's language
const countOf = (key: string, n: number, t: Tr): string => (t === same ? tEn(key, { n }) : tHere(key, { n }))

export function diffWords(d: Diff | undefined, t: Tr = same): string {
  if (d === undefined) return ''
  const dropped = `${d.dropped.join(', ')}${d.files - d.kept > d.dropped.length ? ', ...' : ''}`
  const files = d.files === 0 ? t('No files were changed in this session.') : d.dropped.length === 0 ? fillIn(t('The summary names all {files}.'), { files: countOf('words.changed_file', d.files, t) }) : fillIn(t('The summary names {kept} of {files} changed files (dropped: {dropped}).'), { kept: d.kept, files: d.files, dropped })
  const named = d.branchKept === true ? t('It names the branch.') : t('It does not name the branch.')
  const branch = d.branchKept === undefined ? '' : ` ${named}`
  const keepAll = fillIn(t('It keeps all {total} items of the keep-list.'), { total: d.keep?.total ?? 0 })
  const keepSome = fillIn(t('It left out {lost} of {total} items of the keep-list; This session offers Tell Claude again.'), { lost: d.keep?.lost ?? 0, total: d.keep?.total ?? 0 })
  const keep = d.keep === undefined ? '' : ` ${d.keep.lost === 0 ? keepAll : keepSome}`
  return `${files}${branch}${keep}`
}

export function previewWords(o: { messages: number; files: string[]; keepList: boolean; tokens?: number; after?: number }, t: Tr = same): string {
  const names = o.files.slice(0, 5).map(base)
  const aboutSize = fillIn(t('about {k}k tokens'), { k: Math.round((o.tokens ?? 0) / 1000) })
  const aboutAfter = fillIn(t('of about {k}k tokens'), { k: Math.round((o.after ?? 0) / 1000) })
  const size = o.tokens === undefined ? '' : ` (${aboutSize})`
  const after = o.after === undefined ? '' : ` ${aboutAfter}`
  const lines = [fillIn(t('Compacting would replace {messages}{size} with one summary{after}.'), { messages: countOf('words.message', o.messages, t), size, after })]
  lines.push(o.files.length === 0 ? t('No file was changed in this session, so there are no file names to lose.') : fillIn(t('Files changed in this session ({n}): {names}. The summary may drop some of them.'), { n: o.files.length, names: `${names.join(', ')}${o.files.length > 5 ? ', ...' : ''}` }))
  lines.push(o.keepList ? t('What Claude keeps is on: the goal, the branch, the files and the next steps are added to the summary request.') : t('What Claude keeps is off: turn it on in Settings > Money and plan to ask the summary to keep the goal, branch, files and next steps.'))
  lines.push(t('Small details from early in the session can be lost. After it runs, /vaken-compact shows which files the summary still names.'))
  return lines.join('\n')
}
