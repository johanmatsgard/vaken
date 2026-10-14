// Reads the memory notes Claude keeps (per-project folder and CLAUDE.md files) and shows them in plain words. Read only.
import type { HelpEntry } from './registry'
import { detectStyle, lastName as lastNameOf, lines as linesOf, projectFolderName as folderNameOf } from './platform'

export const MEMORY_HELP: HelpEntry[] = [{ title: 'What memory is', text: 'Claude keeps short notes about you and your project in files, so it remembers between sessions. /vaken-memory shows them in plain words. To correct one, tell Claude "forget this" or "change that note", or edit the file yourself.' }]

// '/Users/me/proj' becomes '-Users-me-proj'.
export const projectFolderName = (cwd: string): string => folderNameOf(cwd)

// A worktree's notes live under the main folder's name.
export function mainProject(cwd: string): string | undefined {
  const m = /^(.+?)[\\/]\.claude[\\/]worktrees[\\/][^\\/]+(?:[\\/].*)?$/.exec(cwd)
  return m === null ? undefined : m[1]
}

export const lastName = (path: string): string => lastNameOf(path)

type MemorySpot = { dir: string; label: string }

// The app may turn only '/' and '.' into '-', so that name is tried too.
export function memorySpots(home: string, cwd: string): MemorySpot[] {
  const paths = [cwd, mainProject(cwd)].filter((p): p is string => p !== undefined)
  const spots: MemorySpot[] = []
  for (const p of paths) {
    const win = detectStyle(home + p) === 'win32'
    const sep = win ? '\\' : '/'
    for (const name of new Set([projectFolderName(p), p.replace(win ? /[:\\/.]/g : /[/.]/g, '-')])) spots.push({ dir: `${home}${sep}.claude${sep}projects${sep}${name}${sep}memory`, label: lastName(p) })
  }
  return spots
}

type Note = { name: string; line: string }

export function parseIndex(text: string): Note[] {
  const out: Note[] = []
  for (const l of linesOf(text)) {
    const m = /^\s*-\s*\[([^\]]+)\]\(([^)]+)\)\s*[—–-]*\s*(.*)$/.exec(l)
    if (m !== null) out.push({ name: m[2], line: `${m[1]}${m[3] === '' ? '' : `: ${m[3]}`}` })
  }
  return out
}

export function parseNote(text: string): { description?: string; type?: string; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (m === null) return { body: text.trim() }
  const field = (k: string): string | undefined => new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(m[1])?.[1]?.trim()
  return { description: field('description'), type: field('type') ?? new RegExp('^\\s+type:\\s*(.+)$', 'm').exec(m[1])?.[1]?.trim(), body: m[2].trim() }
}

const KIND_WORD: Record<string, string> = { user: 'about you', feedback: 'how you like to work', project: 'about the project', reference: 'where to look' }
export const kindWord = (type: string | undefined): string => (type === undefined ? 'a note' : (KIND_WORD[type] ?? type))

export function memoryText(index: Note[], files: string[], cwdFiles: string[], looked: string[] = []): string {
  const lines: string[] = []
  const where = looked.length === 0 ? '' : ` Looked for: ${[...new Set(looked)].join(', ')}.`
  lines.push(index.length === 0 ? `No memory notes for this project yet.${where}` : `Memory notes for this project (${index.length}):`)
  for (const n of index) lines.push(`  ${n.line}`)
  lines.push('', cwdFiles.length === 0 ? 'No CLAUDE.md file found for this folder.' : `Instruction files: ${cwdFiles.join(', ')}.`)
  if (files.length > 0) lines.push(`Note files: ${files.length}.`)
  lines.push('', 'To change a note, tell Claude: "forget the note about ..." or "change the note about ...". /vaken-memory <file name> shows one note in full.')
  return lines.join('\n')
}
