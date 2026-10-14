// Collision warning and shared Crew parts: warns once per file when another live session edited it lately, or it is a lockfile, migration or config. Paths relative to the session folder and times only; nothing is blocked.
import { tr } from './lang'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { below, detectStyle, joinPath, lastPart, parentDir, parts as pathParts } from './platform'
import { tEn } from '../i18n/t'

export const CREW_SETTINGS: Setting[] = [
  {
    key: 'crew.collide',
    group: 'Crew',
    label: 'File overlap',
    note: 'Warn when another session edits the same file.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'warn', label: 'Warn' },
    ],
    default: 'warn',
  },
  {
    key: 'crew.pr',
    group: 'Crew',
    label: 'PR and checks',
    note: 'Show your pull request and its checks in plain words.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
  {
    key: 'laptop.mode',
    group: 'Crew',
    label: 'Computer load',
    note: 'Reads memory and battery. It runs short programs.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]

export const CREW_HELP: HelpEntry[] = [
  { title: 'Two sessions, one file: the warning before an edit', text: 'Two sessions in one repository can change the same file and undo each other. Before an edit, vaken checks what the other live sessions edited in the last 30 minutes. If it finds the same file, a lockfile, a migration or a config file, you get one toast, and Claude a note only when Notes to Claude is set to All checks.' },
  { title: 'Pull requests and computer load: what it reads and why', text: 'It reads these two things so it can warn you early, and for no other reason. PR and checks asks gh about your branch at most every 2 minutes and says it in plain words, with the time left and whether main is red. The computer reading is on by default (Settings turns it off): it reads memory, swap, battery and heat every 3 minutes (every minute while agents run) and says when your laptop is short of memory.' },
]

export const COLLIDE_WHAT = 'Warned about a file another session is editing'

export const CLAIM_TTL_MS = 30 * 60_000
export const CLAIM_KEEP = 60
export const ALIVE_MS = 90_000

export const claimsKey = (sessionId: string): string => `cockpit:claims:${sessionId}`

type ClaimItem = { path: string; at: number }
// `repo` is the git common directory, the same for every worktree of one repository.
export type Claims = { repo: string; root: string; items: ClaimItem[] }

export function parseClaims(raw: unknown): Claims | undefined {
  const o = raw as Claims
  if (typeof o !== 'object' || o === null || typeof o.repo !== 'string' || typeof o.root !== 'string' || !Array.isArray(o.items)) return undefined
  const items = o.items.filter((x): x is ClaimItem => typeof x === 'object' && x !== null && typeof x.path === 'string' && typeof x.at === 'number')
  return { repo: o.repo, root: o.root, items }
}

export function addClaim(claims: Claims | undefined, repo: string, root: string, path: string, now: number): Claims {
  const keep = (claims?.repo === repo ? claims.items : []).filter(x => x.path !== path && now - x.at < CLAIM_TTL_MS)
  return { repo, root, items: [...keep, { path, at: now }].slice(-CLAIM_KEEP) }
}

// `.git` relative in a plain checkout, the main checkout's `.git` in a worktree; resolved to one absolute form.
export function resolveGitDir(cwd: string, out: string): string | undefined {
  const line = out.trim().split(/\r?\n/)[0]?.trim() ?? ''
  if (line === '') return undefined
  if (detectStyle(cwd + line) === 'win32') {
    const abs = /^(?:[A-Za-z]:|[\\/])/.test(line)
    const segs = pathParts(abs ? line : joinPath('win32', cwd, line), 'win32')
    return segs.length === 0 ? undefined : joinPath('win32', segs[0].endsWith(':') ? `${segs[0]}\\` : segs[0], ...segs.slice(1))
  }
  const full = line.startsWith('/') ? line : `${cwd.replace(/\/+$/, '')}/${line}`
  const parts: string[] = []
  for (const seg of full.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') parts.pop()
    else parts.push(seg)
  }
  return parts.length === 0 ? undefined : `/${parts.join('/')}`
}

export function relativePath(root: string, path: string): string {
  const r = root.replace(/\/+$/, '')
  const rel = below(r, path)
  if (rel !== path) return rel
  return path.startsWith('./') ? path.slice(2) : path
}

const basename = (p: string): string => lastPart(p)
const dirname = (p: string): string => parentDir(p)

// Cut at the start so the folder and file name stay; the pane cuts names at the end by width.
export const shorten = (text: string, max = 60): string => (text.length > max ? `…${text.slice(text.length - max + 1)}` : text)

type SharedKind = 'lockfile' | 'migration' | 'config'

const LOCKFILES = new Set(['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb', 'cargo.lock', 'poetry.lock', 'uv.lock', 'pipfile.lock', 'gemfile.lock', 'composer.lock', 'go.sum', 'flake.lock', 'podfile.lock', 'package.resolved'])
const CONFIGS = new Set(['package.json', 'pyproject.toml', 'cargo.toml', 'go.mod', 'gemfile', 'dockerfile', 'makefile', 'tsconfig.json', 'jsconfig.json', 'pnpm-workspace.yaml', 'turbo.json', 'nx.json'])

export function sharedKind(path: string): SharedKind | undefined {
  const lower = path.toLowerCase()
  const name = basename(lower)
  if (LOCKFILES.has(name)) return 'lockfile'
  const dirs = pathParts(lower).slice(0, -1)
  if (dirs.some(d => d === 'migrations' || d === 'migrate') || ['schema.prisma', 'schema.rb', 'structure.sql'].includes(name)) return 'migration'
  if (CONFIGS.has(name) || /^tsconfig[.\w-]*\.json$/.test(name) || /^docker-compose[.\w-]*\.ya?ml$/.test(name) || /^\.env(\.|$)/.test(name) || /\.config\.(js|cjs|mjs|ts|json)$/.test(name) || lower.startsWith('.github/workflows/')) return 'config'
  return undefined
}

const KIND_WORD: Record<SharedKind, string> = { lockfile: 'a lockfile', migration: 'a migration', config: 'a shared config file' }

export type Other = { sessionId: string; name: string; claims: Claims }
type Rival = { name: string; path: string; ageMs: number; sameFile: boolean; sameFolder: boolean }

export function sessionName(rec: { branch?: string; cwd?: string } | undefined): string {
  const name = rec?.branch ?? basename(rec?.cwd ?? '')
  return name === '' ? 'another session' : shorten(name, 500)
}

// For a migration a new file in the same folder counts too, since two numbers can clash.
export function findRival(path: string, repo: string, root: string, others: Other[], now: number): Rival | undefined {
  const kind = sharedKind(path)
  let best: Rival | undefined
  for (const o of others) {
    if (o.claims.repo !== repo) continue
    for (const x of o.claims.items) {
      const age = now - x.at
      if (age >= CLAIM_TTL_MS || age < 0) continue
      const sameFile = x.path === path
      if (!sameFile && !(kind === 'migration' && sharedKind(x.path) === 'migration' && dirname(x.path) === dirname(path))) continue
      const r: Rival = { name: o.name, path: x.path, ageMs: age, sameFile, sameFolder: o.claims.root === root }
      if (best === undefined || (r.sameFile && !best.sameFile) || (r.sameFile === best.sameFile && r.ageMs < best.ageMs)) best = r
    }
  }
  return best
}

export function agoWords(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / 60_000)
  return m < 1 ? 'less than a minute ago' : `${tEn('words.minute', { n: m })} ago`
}

const who = (r: Rival): string => (r.name === 'another session' ? 'another session' : `another session (${r.name})`)

export function collideNote(path: string, r: Rival): string {
  const kind = sharedKind(path)
  const file = shorten(path, 70)
  const what = r.sameFile ? `${file} was edited by ${who(r)} ${agoWords(r.ageMs)}` : `${shorten(r.path, 70)} was added by ${who(r)} ${agoWords(r.ageMs)}, in the same folder as ${file}`
  const place = r.sameFolder ? ' It works in the same folder as you.' : ' It works in the same repository.'
  const extra = kind === undefined ? '' : ` This is ${KIND_WORD[kind]}, which all worktrees share.`
  return `Vaken saw that ${what}.${place}${extra} Read the file again before you go on. If the two changes can clash, tell the person and ask how to go on.`
}

export function collideToast(path: string, r: Rival): string {
  const kind = sharedKind(path)
  return `${shorten(path, 50)} ${r.sameFile ? tr('was edited by') : tr('has a new neighbour from')} ${who(r)} ${agoWords(r.ageMs)}${kind === undefined ? '' : ` (${KIND_WORD[kind]})`}.`
}

export const collideDetail = (path: string, r: Rival): string => `${shorten(path, 60)}: ${r.sameFile ? 'edited' : 'neighbour added'} by ${who(r)} ${agoWords(r.ageMs)}. The edit ran.`


export function claimsText(mode: string, mine: Claims | undefined, others: Other[], now: number, repoKnown: boolean): string {
  const live = (c: Claims | undefined) => (c?.items ?? []).filter(x => now - x.at < CLAIM_TTL_MS).sort((a, b) => b.at - a.at)
  const line = (name: string, c: Claims | undefined): string[] => {
    const items = live(c)
    if (items.length === 0) return [`${name}: no edits in the last 30 minutes.`]
    const shown = items.slice(0, 6).map(x => `  ${shorten(x.path, 70)} (${agoWords(now - x.at)})`)
    return [`${name}: ${tEn('words.file', { n: items.length })}.`, ...shown, ...(items.length > 6 ? [`  and ${items.length - 6} more`] : [])]
  }
  const out = [`File overlap: ${mode}.`, 'Each session lists the files it edits. A list lasts 30 minutes. When you are about to edit a file that another live session of this repository edited, Claude gets a note.']
  if (mode === 'off') out.push('Turn it on: Settings > Agents.')
  if (!repoKnown) out.push('', 'This folder is not in a git repository, so no session can be matched to it.')
  out.push('', ...line('This session', mine))
  const same = others.filter(o => mine === undefined || o.claims.repo === mine.repo)
  if (same.length === 0) out.push('', 'No other live session of this repository has edited a file lately.')
  for (const o of same) out.push('', ...line(o.name, o.claims))
  return out.join('\n')
}
