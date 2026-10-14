// What a compaction kept: file names and counts only, never the summary text. Pure.
import type { SessionMessage } from 'claude-code'
import { isEditTool } from './tools'
import { lastName } from './platform'
import { tEn } from '../i18n/t'

export type Diff = { at: number; files: number; kept: number; dropped: string[]; branchKept?: boolean }

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

export function diffWords(d: Diff | undefined): string {
  if (d === undefined) return ''
  const files = d.files === 0 ? 'No files were changed in this session.' : d.dropped.length === 0 ? `The summary names all ${tEn('words.changed_file', { n: d.files })}.` : `The summary names ${d.kept} of ${d.files} changed files (dropped: ${d.dropped.join(', ')}${d.files - d.kept > d.dropped.length ? ', ...' : ''}).`
  const branch = d.branchKept === undefined ? '' : d.branchKept ? ' It names the branch.' : ' It does not name the branch.'
  return `${files}${branch}`
}

export function previewWords(o: { messages: number; files: string[]; keepList: boolean; tokens?: number; after?: number }): string {
  const names = o.files.slice(0, 5).map(base)
  const lines = [`Compacting would replace ${tEn('words.message', { n: o.messages })}${o.tokens === undefined ? '' : ` (about ${Math.round(o.tokens / 1000)}k tokens)`} with one summary${o.after === undefined ? '' : ` of about ${Math.round(o.after / 1000)}k tokens`}.`]
  lines.push(o.files.length === 0 ? 'No file was changed in this session, so there are no file names to lose.' : `Files changed in this session (${o.files.length}): ${names.join(', ')}${o.files.length > 5 ? ', ...' : ''}. The summary may drop some of them.`)
  lines.push(o.keepList ? 'What Claude keeps is on: the goal, the branch, the files and the next steps are added to the summary request.' : 'What Claude keeps is off: turn it on in Settings > Money and plan to ask the summary to keep the goal, branch, files and next steps.')
  lines.push('Small details from early in the session can be lost. After it runs, /vaken-compact shows which files the summary still names.')
  return lines.join('\n')
}
