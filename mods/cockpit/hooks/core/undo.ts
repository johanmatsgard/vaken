// Undo and named checkpoints: a shadow copy of each file about to change, kept under ~/.claude/cockpit/checkpoints/<session>/.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { readNote } from './flush'
import { removeEmptyDir, removeFiles } from './fileops'
import type { Io } from './io'
import { checkWrite, safeFsOf } from './safewrite'
import type { SafeFs } from './safewrite'
import { detectStyle, isAbsolute, isInside as insidePath, joinPath, parts as pathParts } from './platform'
import { absolute, isInside, looksWin } from './guardpaths'
import { commandsOf } from './guardshell'
import { isWindowsShape } from './guardwin'
import type { ShellFlavor } from './tools'
import { winPlan } from './undowin'
import { pad2 } from './words'
import { tEn } from '../i18n/t'

export const UNDO_SETTING = 'undo.mode'
export const UNDO_SETTINGS: Setting[] = [
  {
    key: UNDO_SETTING,
    group: 'Risky steps',
    label: 'Undo',
    note: 'Keeps a copy of a file before a step changes it.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]

export const UNDO_HELP: HelpEntry[] = [
  {
    title: 'What undo does',
    text: 'Before a step changes a file, vaken keeps a copy of it. /vaken-undo lists the last changed files, and /vaken-undo last previews putting back everything changed since your last message. Nothing is restored until you add yes.',
  },
  {
    title: 'Going back to a point you saved',
    text: '/vaken-undo checkpoint name saves the state of every file changed so far. /vaken-undo name <name> shows what going back would do. Vaken never deletes a file for you.',
  },
]

export const NAMED_WHAT = 'Named a checkpoint'
export const RESTORED_WHAT = 'Restored files from a copy'

export const MAX_COPIES = 200
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024
export const MAX_FILE_BYTES = 1024 * 1024
export const LIST_MAX = 10
const MAX_NAMED = 20
const MAX_TARGETS = 20

export const indexKey = (sid: string): string => `cockpit:undo:index:${sid}`
export const namedKey = (sid: string): string => `cockpit:undo:named:${sid}`
export const pendingKey = (sid: string): string => `cockpit:undo:pending:${sid}`
export const markKey = (sid: string): string => `cockpit:undo:mark:${sid}`
export const safeId = (sid: string): string => sid.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)
export const copyDir = (home: string, sid: string): string => joinPath(detectStyle(home), home === '' ? '/' : home, '.claude/cockpit/checkpoints', safeId(sid))
export const copyPath = (home: string, sid: string, id: number): string => joinPath(detectStyle(home), copyDir(home, sid), `${id}.txt`)

export type Snap = { id: number; path: string; at: number; tool: string; kind: 'saved' | 'created'; hash: string; bytes: number; lines: number }
export type Index = { next: number; snaps: Snap[] }
export type Named = { name: string; at: number; items: { path: string; snap: number }[] }
export type Pending = { kind: 'file'; n: number; path: string; snap: number; at: number } | { kind: 'named'; name: string; at: number } | { kind: 'last'; sig: string; at: number }

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)
const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')

export function parseIndex(raw: unknown): Index {
  if (typeof raw !== 'object' || raw === null) return { next: 1, snaps: [] }
  const r = raw as { next?: unknown; snaps?: unknown }
  const snaps: Snap[] = []
  if (Array.isArray(r.snaps)) {
    for (const s of r.snaps as Record<string, unknown>[]) {
      if (typeof s !== 'object' || s === null || typeof s.id !== 'number' || typeof s.path !== 'string') continue
      snaps.push({ id: num(s.id), path: text(s.path, 500), at: num(s.at), tool: text(s.tool, 24), kind: s.kind === 'created' ? 'created' : 'saved', hash: text(s.hash, 20), bytes: num(s.bytes), lines: num(s.lines) })
    }
  }
  return { next: Math.max(num(r.next), ...snaps.map(s => s.id + 1), 1), snaps: snaps.slice(-MAX_COPIES) }
}

export function parseNamed(raw: unknown): Named[] {
  if (!Array.isArray(raw)) return []
  const out: Named[] = []
  for (const n of raw as Record<string, unknown>[]) {
    if (typeof n !== 'object' || n === null || typeof n.name !== 'string' || !Array.isArray(n.items)) continue
    const items = (n.items as Record<string, unknown>[]).filter(x => typeof x === 'object' && x !== null && typeof x.path === 'string' && typeof x.snap === 'number').map(x => ({ path: text(x.path, 500), snap: Math.floor(x.snap as number) }))
    out.push({ name: text(n.name, 40), at: num(n.at), items: items.slice(0, MAX_COPIES) })
  }
  return out.slice(0, MAX_NAMED)
}

export function parsePending(raw: unknown): Pending | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Record<string, unknown>
  if (r.kind === 'file' && typeof r.path === 'string' && typeof r.snap === 'number' && typeof r.n === 'number' && typeof r.at === 'number') return { kind: 'file', n: r.n, path: r.path, snap: r.snap, at: r.at }
  if (r.kind === 'named' && typeof r.name === 'string' && typeof r.at === 'number') return { kind: 'named', name: r.name, at: r.at }
  if (r.kind === 'last' && typeof r.sig === 'string' && typeof r.at === 'number') return { kind: 'last', sig: r.sig.slice(0, 4000), at: r.at }
  return undefined
}

// Environment files, keys, certificates, credentials: never copied.
const SECRET_NAMES: RegExp[] = [
  /^\.env/i,
  /\.(pem|key|p12|pfx|p8|ppk|jks|keystore|kdbx|gpg|asc)$/i,
  /^id_(rsa|dsa|ed25519|ecdsa)/i,
  /^\.(netrc|_netrc|npmrc|yarnrc|pypirc|pgpass|htpasswd|git-credentials|dockercfg|s3cfg|vault-token)$/i,
  /^credentials/i,
  /^(secrets?|service[-_]?account.*|client[-_]?secrets?.*|token|tokens|auth)\.(json|ya?ml|toml|txt|ini)$/i,
]
const SECRET_CONTENT: RegExp[] = [
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}/,
  /\bglpat-[A-Za-z0-9_-]{16,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bsk-ant-[A-Za-z0-9_-]{16,}/,
  /\bsk-[A-Za-z0-9]{32,}/,
  /\bAIza[0-9A-Za-z_-]{35}/,
  /\bnpm_[A-Za-z0-9]{36}/,
  /\bsk_live_[A-Za-z0-9]{16,}/,
]
export const secretInside = (body: string): boolean => SECRET_CONTENT.some(re => re.test(body))
export function excludedPath(path: string): boolean {
  const parts = pathParts(path)
  if (parts.some(p => p === '.git' || p === 'node_modules')) return true
  if (/[\\/]\.claude[\\/]cockpit[\\/]checkpoints[\\/]/.test(path)) return true
  const name = parts[parts.length - 1] ?? ''
  return SECRET_NAMES.some(re => re.test(name))
}

export type Target = { path: string; create: boolean }
export type Env = { home: string; cwd: string }

const FILE_ARG = ['file_path', 'notebook_path'] as const

export function fileToolTargets(tool: string, args: Record<string, unknown>, env: Env): Target[] {
  for (const k of FILE_ARG) {
    const v = args[k]
    if (typeof v === 'string' && v !== '') return [{ path: absolute(v, env.home, env.cwd), create: tool === 'Write' || tool === 'NotebookEdit' }]
  }
  return []
}

const hasGlob = (p: string): boolean => /[*?[\]{}]/.test(p) || p.includes('$') || p.includes('`')

type GitWork = { files: string[]; all: boolean; dir: string }
const GIT_VALUE_OPTS = ['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']
const STASH_OTHER = ['list', 'show', 'pop', 'apply', 'drop', 'branch', 'clear', 'create', 'store']
const broad = (p: string): boolean => p === '.' || p === ':/' || p === ':/.' || p.endsWith('/') || /[*?[\]{}]/.test(p)

function gitWork(words: string[], env: Env): GitWork {
  let dir = env.cwd
  let i = 0
  for (; i < words.length; i += 1) {
    const w = words[i]
    if (!w.startsWith('-') || w === '-') break
    if (w === '-C') {
      i += 1
      if (words[i] !== undefined) dir = absolute(words[i], env.home, dir)
    } else if (GIT_VALUE_OPTS.includes(w)) i += 1
  }
  const sub = words[i]
  const rest = words.slice(i + 1)
  const out: GitWork = { files: [], all: false, dir }
  const take = (paths: string[]): void => {
    for (const p of paths) {
      if (p === '') continue
      if (broad(p)) out.all = true
      else out.files.push(absolute(p, env.home, dir))
    }
  }
  const dd = rest.indexOf('--')
  if (sub === 'checkout') {
    if (dd >= 0) take(rest.slice(dd + 1))
    else if (rest.length === 1 && rest[0] === '.') out.all = true
  } else if (sub === 'restore') {
    const staged = rest.some(w => w === '--staged' || w === '-S')
    const worktree = rest.some(w => w === '--worktree' || w === '-W')
    if (staged && !worktree) return out
    const paths: string[] = []
    for (let n = 0; n < rest.length; n += 1) {
      const w = rest[n]
      if (w === '--') {
        paths.push(...rest.slice(n + 1))
        break
      }
      if (w === '-s' || w === '--source') n += 1
      else if (!w.startsWith('-')) paths.push(w)
    }
    take(paths)
  } else if (sub === 'stash') {
    const first = rest[0]
    if (first !== undefined && STASH_OTHER.includes(first)) return out
    if (dd >= 0) take(rest.slice(dd + 1))
    else out.all = true
  } else if (sub === 'reset') {
    if (rest.includes('--hard')) out.all = true
  }
  return out
}

// A speed bump, not a promise: a command that writes through a script is not seen.
export function bashPlan(command: string, env: Env): { targets: Target[]; gitDir?: string } {
  const found = new Map<string, boolean>()
  let gitDir: string | undefined
  const add = (p: string, create: boolean): void => {
    if (p === '' || p.startsWith('/dev/') || p.startsWith('&') || hasGlob(p)) return
    const abs = absolute(p, env.home, env.cwd)
    found.set(abs, (found.get(abs) ?? false) || create)
  }
  for (const c of commandsOf(command)) {
    for (const r of c.redirects) if (r.op === '>' || r.op === '>>' || r.op === '>|' || r.op === '&>') add(r.target, true)
    const args = c.args.filter(a => a.op !== true)
    const positional = (skipValueOf: string[] = []): string[] => {
      const out: string[] = []
      let ended = false
      for (let n = 0; n < args.length; n += 1) {
        const a = args[n]
        if (!ended && !a.quoted && a.t === '--') {
          ended = true
          continue
        }
        if (a.t === '') continue
        if (!ended && !a.quoted && a.t.startsWith('-') && a.t.length > 1) {
          if (skipValueOf.includes(a.t)) n += 1
          continue
        }
        out.push(a.t)
      }
      return out
    }
    switch (c.prog) {
      case 'tee':
        for (const p of positional()) add(p, true)
        break
      case 'sed':
      case 'perl': {
        const inPlace = args.some(a => !a.quoted && (a.t === '--in-place' || a.t.startsWith('--in-place=') || /^-[a-zA-Z]*i/.test(a.t)))
        if (!inPlace) break
        const usesE = args.some(a => !a.quoted && (a.t === '-e' || a.t === '-f' || a.t === '--expression' || a.t === '--file'))
        const files = positional(['-e', '-f', '--expression', '--file'])
        for (const p of usesE ? files : files.slice(1)) add(p, false)
        break
      }
      case 'mv': {
        const p = positional(['-t', '-S'])
        p.forEach((x, n) => add(x, n === p.length - 1))
        break
      }
      case 'cp': {
        const p = positional(['-t', '-S'])
        if (p.length > 0) add(p[p.length - 1], true)
        break
      }
      case 'rm':
      case 'unlink':
        for (const p of positional()) add(p, false)
        break
      case 'truncate': {
        for (const p of positional(['-s', '--size', '-r', '--reference'])) add(p, false)
        break
      }
      case 'dd':
        for (const a of args) if (a.t.startsWith('of=')) add(a.t.slice(3), true)
        break
      case 'git': {
        const w = gitWork(args.map(a => a.t), env)
        for (const p of w.files) add(p, false)
        if (w.all && gitDir === undefined) gitDir = w.dir
        break
      }
      default:
        break
    }
  }
  const targets = [...found.entries()].slice(0, MAX_TARGETS).map(([path, create]) => ({ path, create }))
  return gitDir === undefined ? { targets } : { targets, gitDir }
}

export const bashTargets = (command: string, env: Env): Target[] => bashPlan(command, env).targets

export function shellPlan(command: string, env: Env, flavor: ShellFlavor | undefined): { targets: Target[]; gitDir?: string } {
  const powershell = flavor === 'powershell'
  if (!powershell && !((looksWin(env.cwd) || looksWin(env.home)) && isWindowsShape(command))) return bashPlan(command, env)
  const base: { targets: Target[]; gitDir?: string } = powershell ? { targets: [] } : bashPlan(command, env)
  const found = new Map<string, boolean>(base.targets.map(t => [t.path, t.create]))
  let gitDir = base.gitDir
  const w = winPlan(command, env)
  for (const t of w.targets) found.set(t.path, (found.get(t.path) ?? false) || t.create)
  for (const words of w.git) {
    const g = gitWork(words, env)
    for (const p of g.files) if (!/[$%`]/.test(p) && !found.has(p)) found.set(p, false)
    if (g.all && gitDir === undefined) gitDir = g.dir
  }
  const targets = [...found.entries()].slice(0, MAX_TARGETS).map(([path, create]) => ({ path, create }))
  return gitDir === undefined ? { targets } : { targets, gitDir }
}

export const MAX_GIT_FILES = 50

export async function gitChanged(i: Io, dir: string): Promise<Target[]> {
  try {
    const top = await i.run(['git', '-C', dir, 'rev-parse', '--show-toplevel'], { timeoutMs: 5_000 })
    const root = top.stdout.trim()
    if (top.exitCode !== 0 || !isAbsolute(root)) return []
    let diff = await i.run(['git', '-C', dir, 'diff', 'HEAD', '--name-only', '-z'], { timeoutMs: 5_000 })
    // A fresh repository has no HEAD yet: the plain diff lists the work tree.
    if (diff.exitCode !== 0) diff = await i.run(['git', '-C', dir, 'diff', '--name-only', '-z'], { timeoutMs: 5_000 })
    if (diff.exitCode !== 0) return []
    return diff.stdout
      .split('\0')
      .filter(n => n !== '' && !n.includes('..'))
      .slice(0, MAX_GIT_FILES)
      .map(n => ({ path: joinPath(detectStyle(root), root, n), create: false }))
  } catch {
    return []
  }
}

// Not a security hash.
export function hashText(s: string): string {
  const fnv = (seed: number): string => {
    let h = seed >>> 0
    for (let n = 0; n < s.length; n += 1) {
      h ^= s.charCodeAt(n)
      h = Math.imul(h, 16777619) >>> 0
    }
    return h.toString(36)
  }
  return `${fnv(2166136261)}${fnv(84696351)}`
}

export function utf8Bytes(s: string): number {
  let n = 0
  for (let k = 0; k < s.length; k += 1) {
    const c = s.charCodeAt(k)
    if (c < 0x80) n += 1
    else if (c < 0x800) n += 2
    else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4
      k += 1
    } else n += 3
  }
  return n
}

const linesOf = (s: string): string[] => (s === '' ? [] : s.replace(/\n$/, '').split('\n'))
const countLines = (s: string): number => linesOf(s).length
const looksBinary = (s: string): boolean => s.includes('\u0000') || s.includes('�')

export function lineChange(from: string, to: string): { added: number; removed: number } {
  const x = linesOf(from)
  const y = linesOf(to)
  let s = 0
  while (s < x.length && s < y.length && x[s] === y[s]) s += 1
  let ex = x.length
  let ey = y.length
  while (ex > s && ey > s && x[ex - 1] === y[ey - 1]) {
    ex -= 1
    ey -= 1
  }
  const a = x.slice(s, ex)
  const b = y.slice(s, ey)
  if (a.length === 0 || b.length === 0) return { removed: a.length, added: b.length }
  let common = 0
  if (a.length * b.length > 4_000_000) {
    const seen = new Map<string, number>()
    for (const l of a) seen.set(l, (seen.get(l) ?? 0) + 1)
    for (const l of b) {
      const k = seen.get(l) ?? 0
      if (k > 0) {
        common += 1
        seen.set(l, k - 1)
      }
    }
  } else {
    let prev = new Array<number>(b.length + 1).fill(0)
    for (let i = 1; i <= a.length; i += 1) {
      const row = new Array<number>(b.length + 1).fill(0)
      for (let j = 1; j <= b.length; j += 1) row[j] = a[i - 1] === b[j - 1] ? (prev[j - 1] ?? 0) + 1 : Math.max(prev[j] ?? 0, row[j - 1] ?? 0)
      prev = row
    }
    common = prev[b.length] ?? 0
  }
  return { removed: a.length - common, added: b.length - common }
}

export type Probe = (path: string) => Promise<{ kind: 'file' | 'dir' | 'other'; size: number } | undefined>

export type Report = { saved: number; created: number; same: number; skipped: { big: number; binary: number; excluded: number; secret: number; dir: number; unreadable: number } }
const emptyReport = (): Report => ({ saved: 0, created: 0, same: 0, skipped: { big: 0, binary: 0, excluded: 0, secret: 0, dir: 0, unreadable: 0 } })

// Two tool calls at the same moment must not take the same copy number.
let chain: Promise<unknown> = Promise.resolve()
export function serial<T>(job: () => Promise<T>): Promise<T> {
  const p = chain.then(job)
  chain = p.catch(() => undefined)
  return p
}

export const newestOf = (idx: Index, path: string): Snap | undefined => {
  for (let n = idx.snaps.length - 1; n >= 0; n -= 1) if (idx.snaps[n].path === path) return idx.snaps[n]
  return undefined
}

export const totalBytes = (idx: Index): number => idx.snaps.reduce((n, s) => n + s.bytes, 0)

// Only a copy file vaken made may ever be removed.
export function isCopyFile(home: string, path: string): boolean {
  if (home.includes('..') || path.includes('..')) return false
  if (detectStyle(home) === 'posix') {
    if (!home.startsWith('/') || path.includes('//')) return false
    const base = `${home}/.claude/cockpit/checkpoints/`
    return path.startsWith(base) && /^[A-Za-z0-9_-]{1,80}\/[1-9]\d{0,9}\.txt$/.test(path.slice(base.length))
  }
  if (!isAbsolute(home)) return false
  if (/[\\/][\\/]/.test(path.replace(/^\\\\(?=[^\\/])/, '')) || /(^|[\\/])\.([\\/]|$)/.test(path) || /[\\/]$/.test(path)) return false
  const base = joinPath('win32', home, '.claude/cockpit/checkpoints')
  if (!insidePath(base, path, 'win32')) return false
  const rest = pathParts(path, 'win32').slice(pathParts(base, 'win32').length)
  return rest.length === 2 && /^[A-Za-z0-9_-]{1,80}$/.test(rest[0]) && /^[1-9]\d{0,9}\.txt$/.test(rest[1])
}

export async function removeCopies(i: Io, home: string, sid: string, ids: readonly number[]): Promise<void> {
  const paths = ids.map(id => copyPath(home, sid, id)).filter(p => isCopyFile(home, p))
  if (paths.length === 0) return
  let ok = false
  try {
    ok = await removeFiles({ run: i.run }, paths)
  } catch {
    ok = false
  }
  if (ok) return
  const fs = safeFsOf(i)
  if (fs === undefined) return
  const own = `${home}/.claude/cockpit`
  for (const p of paths) if ((await checkWrite(fs, own, p).catch(() => ({ ok: false }))).ok) await i.write(p, '').catch(() => undefined)
}

export async function removeCopyDir(i: Io, home: string, sid: string): Promise<void> {
  const dir = copyDir(home, sid)
  if (!isCopyFile(home, copyPath(home, sid, 1))) return
  await removeEmptyDir({ run: i.run }, dir)
}

const ENDED_KEEP = 20
export function shrinkIndex(idx: Index, named: readonly Named[], keep = ENDED_KEEP): { idx: Index; gone: number[] } {
  const used = new Set(named.flatMap(n => n.items.map(x => x.snap)))
  const newest = new Set(idx.snaps.slice(-keep).map(s => s.id))
  const stay = idx.snaps.filter(s => newest.has(s.id) || used.has(s.id)).slice(-MAX_COPIES)
  const ids = new Set(stay.map(s => s.id))
  return { idx: { next: idx.next, snaps: stay }, gone: idx.snaps.filter(s => !ids.has(s.id) && s.kind === 'saved').map(s => s.id) }
}

async function trim(i: Io, home: string, sid: string, idx: Index): Promise<Index> {
  let snaps = idx.snaps
  const gone: number[] = []
  while (snaps.length > MAX_COPIES || snaps.reduce((n, s) => n + s.bytes, 0) > MAX_TOTAL_BYTES) {
    const [first, ...rest] = snaps
    snaps = rest
    if (first.kind === 'saved') gone.push(first.id)
  }
  await removeCopies(i, home, sid, gone)
  return { next: idx.next, snaps }
}

type Held = Map<string, number>

// The engine's file write takes no rights, so the copy folders get 0700 and files 0600 by `mkdir -m` and `chmod` right after.
const lockedDirs = new Set<string>()
export const CHECKPOINTS_REL = '.claude/cockpit/checkpoints'
async function lockDir(i: Io, home: string, sid: string): Promise<void> {
  if (home === '' || detectStyle(home) !== 'posix') return
  const dir = copyDir(home, sid)
  if (lockedDirs.has(dir)) return
  lockedDirs.add(dir)
  try {
    await i.run(['mkdir', '-m', '700', '-p', '--', dir], { timeoutMs: 5_000 })
    await i.run(['chmod', '700', '--', joinPath('posix', home, CHECKPOINTS_REL), dir], { timeoutMs: 5_000 })
  } catch {
  }
}
async function lockFiles(i: Io, home: string, paths: readonly string[]): Promise<void> {
  if (paths.length === 0 || home === '' || detectStyle(home) !== 'posix') return
  try {
    await i.run(['chmod', '600', '--', ...paths], { timeoutMs: 5_000 })
  } catch {
  }
}

async function copyNow(i: Io, probe: Probe, home: string, sid: string, start: Index, targets: Target[], tool: string, now: number): Promise<{ idx: Index; report: Report; held: Held }> {
  let idx = start
  const report = emptyReport()
  const held: Held = new Map()
  const written: string[] = []
  for (const t of targets) {
    try {
      if (excludedPath(t.path)) {
        report.skipped.excluded += 1
        continue
      }
      const st = await probe(t.path)
      if (st === undefined) {
        const last = newestOf(idx, t.path)
        if (t.create && last?.kind !== 'created') {
          idx = { next: idx.next + 1, snaps: [...idx.snaps, { id: idx.next, path: t.path, at: now, tool, kind: 'created', hash: '', bytes: 0, lines: 0 }] }
          report.created += 1
        }
        continue
      }
      if (st.kind !== 'file') {
        report.skipped.dir += 1
        continue
      }
      if (st.size > MAX_FILE_BYTES) {
        report.skipped.big += 1
        continue
      }
      const body = await i.read(t.path)
      if (looksBinary(body)) {
        report.skipped.binary += 1
        continue
      }
      const bytes = utf8Bytes(body)
      if (bytes > MAX_FILE_BYTES) {
        report.skipped.big += 1
        continue
      }
      if (secretInside(body)) {
        report.skipped.secret += 1
        continue
      }
      const hash = hashText(body)
      const last = newestOf(idx, t.path)
      if (last !== undefined && last.kind === 'saved' && last.hash === hash) {
        held.set(t.path, last.id)
        report.same += 1
        continue
      }
      const id = idx.next
      if (written.length === 0) await lockDir(i, home, sid)
      await i.write(copyPath(home, sid, id), body)
      written.push(copyPath(home, sid, id))
      idx = { next: id + 1, snaps: [...idx.snaps, { id, path: t.path, at: now, tool, kind: 'saved', hash, bytes, lines: countLines(body) }] }
      held.set(t.path, id)
      report.saved += 1
    } catch {
      report.skipped.unreadable += 1
    }
  }
  await lockFiles(i, home, written)
  const trimmed = await trim(i, home, sid, idx)
  const alive = new Set(trimmed.snaps.map(s => s.id))
  for (const [path, id] of held) if (!alive.has(id)) held.delete(path)
  return { idx: trimmed, report, held }
}

export async function loadIndex(i: Io, sid: string): Promise<Index> {
  return parseIndex(await i.get(indexKey(sid)))
}

export function saveBefore(i: Io, probe: Probe, sid: string, targets: Target[], tool: string): Promise<Report> {
  return serial(async () => {
    try {
      const home = await i.home()
      const r = await copyNow(i, probe, home, sid, await loadIndex(i, sid), targets, tool, await i.now())
      if (r.report.saved + r.report.created > 0) await i.set(indexKey(sid), r.idx)
      return r.report
    } catch {
      return emptyReport()
    }
  })
}

export type Item = { n: number; snap: Snap }

export function lastChanged(idx: Index, max = LIST_MAX): Item[] {
  const seen = new Set<string>()
  const out: Item[] = []
  for (let n = idx.snaps.length - 1; n >= 0 && out.length < max; n -= 1) {
    const s = idx.snaps[n]
    if (seen.has(s.path)) continue
    seen.add(s.path)
    out.push({ n: out.length + 1, snap: s })
  }
  return out
}

const clock = (at: number, now: number): string => {
  const d = new Date(at)
  const t = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  return new Date(now).toDateString() === d.toDateString() ? t : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${t}`
}
export const shown = (path: string, base: string): string => (base !== '' && path !== base && isInside(path, base) ? path.slice(base.length + 1) : path)
const quoted = (path: string): string => `'${path.replace(/'/g, `'\\''`)}'`
export const rmCommand = (path: string): string => `rm ${quoted(path)}`

const TOOL_WORDS: Record<string, string> = { Write: 'a Write', Edit: 'an Edit', MultiEdit: 'an Edit', NotebookEdit: 'a notebook edit', Bash: 'a shell command', PowerShell: 'a shell command', checkpoint: 'a checkpoint', undo: 'a restore' }
const toolWord = (tool: string): string => TOOL_WORDS[tool] ?? 'a step'
const mb = (b: number): string => `${(b / (1024 * 1024)).toFixed(1)} MB`

export function listText(idx: Index, named: Named[], now: number, base: string, mode: 'on' | 'off'): string {
  const out: string[] = []
  if (mode === 'off') out.push('Undo is off, so no new copies are kept. Turn it on in Settings > Safety. Copies kept earlier can still be restored.')
  const items = lastChanged(idx)
  if (items.length === 0) {
    out.push(mode === 'off' ? 'No copy kept in this session.' : 'No file has been changed in this session yet, so there is nothing to undo.')
  } else {
    out.push(`Last changed files (${tEn('words.copy', { n: idx.snaps.length })} kept, ${mb(totalBytes(idx))} of ${mb(MAX_TOTAL_BYTES)}):`)
    for (const { n, snap } of items) {
      const what = snap.kind === 'created' ? `was made by ${toolWord(snap.tool)}; there was no earlier version, so nothing to restore` : `would go back to how it was before ${toolWord(snap.tool)} (${tEn('words.line', { n: snap.lines })})`
      out.push(`  ${n}. ${shown(snap.path, base)}  ${clock(snap.at, now)}  ${what}`)
    }
    out.push('', 'See what a restore would do: /vaken-undo <number>. Put back everything changed since your last message: /vaken-undo last. Nothing changes until you add yes.')
  }
  if (named.length > 0) out.push('', `Saved points: ${named.map(n => n.name).join(', ')}. Go back: /vaken-undo name <checkpoint>.`)
  else out.push('', 'Name the present state: /vaken-undo checkpoint <name>.')
  out.push('', 'Limits: 200 copies and 20 MB per session, files up to 1 MB, never .git, node_modules, or secret-looking names or contents. The copy folder is private to you. A shell command is read by its text, so a command that writes through a script, a glob or git is not seen. Restoring never deletes a file.')
  return out.join('\n')
}

export function sinceWants(idx: Index, since: number): Want[] {
  const seen = new Set<string>()
  const out: Want[] = []
  for (const s of idx.snaps) {
    if (s.at < since || s.tool === 'undo' || s.tool === 'checkpoint' || seen.has(s.path)) continue
    seen.add(s.path)
    out.push({ path: s.path, snap: s.id })
  }
  return out
}
export const wantsSig = (wants: Want[]): string => wants.map(w => `${w.snap}:${w.path}`).join('|')

export const LAST_TITLE = 'Preview of undoing the edits since your last message.'
export const LAST_NONE = 'Nothing has been changed since your last message, so there is nothing to put back. /vaken-undo lists older changes.'

type Offer = { toast: string; note: string }
const NO_OFFER: Offer = { toast: '', note: '' }
export async function undoOffer(i: Io): Promise<Offer> {
  try {
    const sid = await i.sessionId()
    const idx = await loadIndex(i, sid)
    if (idx.snaps.length === 0) return NO_OFFER
    if (sinceWants(idx, num(await readNote(i, markKey(sid)))).length === 0) return NO_OFFER
    return { toast: ' If an edit went wrong: /vaken-undo last.', note: ' If the edits made earlier went wrong, the person can put those files back with /vaken-undo last.' }
  } catch {
    return NO_OFFER
  }
}

export type Want = { path: string; snap: number }
export type PlanFile =
  | { kind: 'restore'; path: string; snap: Snap; stored: string; current: string | undefined; added: number; removed: number }
  | { kind: 'same'; path: string; snap: Snap }
  | { kind: 'created'; path: string; snap: Snap; exists: boolean }
  | { kind: 'absent'; path: string; createdSeen: boolean; exists: boolean }
  | { kind: 'lost'; path: string; why: string }

export async function buildPlan(i: Io, home: string, sid: string, idx: Index, picks: Want[]): Promise<PlanFile[]> {
  const out: PlanFile[] = []
  for (const p of picks) {
    if (p.snap === 0) {
      const createdSeen = idx.snaps.some(s => s.path === p.path && s.kind === 'created')
      const exists = await i.read(p.path).then(() => true, () => false)
      out.push({ kind: 'absent', path: p.path, createdSeen, exists })
      continue
    }
    const snap = idx.snaps.find(s => s.id === p.snap)
    if (p.snap < 0 || snap === undefined) {
      out.push({ kind: 'lost', path: p.path, why: p.snap < 0 ? 'no copy could be kept of it (too big, secret-looking or not plain text)' : 'its copy was dropped to stay inside the limits' })
      continue
    }
    if (snap.kind === 'created') {
      out.push({ kind: 'created', path: p.path, snap, exists: await i.read(p.path).then(() => true, () => false) })
      continue
    }
    let stored: string
    try {
      stored = await i.read(copyPath(home, sid, snap.id))
    } catch {
      out.push({ kind: 'lost', path: p.path, why: 'its copy file cannot be read' })
      continue
    }
    if (hashText(stored) !== snap.hash) {
      out.push({ kind: 'lost', path: p.path, why: 'its copy file does not match what was kept' })
      continue
    }
    const current = await i.read(p.path).then(t => t, () => undefined)
    if (current !== undefined && current === stored) {
      out.push({ kind: 'same', path: p.path, snap })
      continue
    }
    const c = lineChange(current ?? '', stored)
    out.push({ kind: 'restore', path: p.path, snap, stored, current, added: c.added, removed: c.removed })
  }
  return out
}

export const restorable = (plan: PlanFile[]): number => plan.filter(f => f.kind === 'restore').length

function fileLine(f: PlanFile, now: number, base: string): string {
  const name = shown(f.path, base)
  if (f.kind === 'restore') {
    const was = f.current === undefined ? 'the file is gone now and would come back' : `${tEn('words.line', { n: f.removed })} removed, ${tEn('words.line', { n: f.added })} added`
    return `  ${name}: ${was} (back to how it was before ${toolWord(f.snap.tool)} at ${clock(f.snap.at, now)})`
  }
  if (f.kind === 'same') return `  ${name}: already the same as the copy. Nothing to do.`
  if (f.kind === 'created') {
    return f.exists ? `  ${name}: made by ${toolWord(f.snap.tool)}. There was no earlier version, and vaken does not delete files. To remove it yourself: ${rmCommand(f.path)}` : `  ${name}: made by ${toolWord(f.snap.tool)}, and it is gone now. Nothing to do.`
  }
  if (f.kind === 'absent') return f.createdSeen && f.exists ? `  ${name}: did not exist then. Vaken does not delete files. To remove it yourself: ${rmCommand(f.path)}` : `  ${name}: did not exist then. Left as it is.`
  return `  ${name}: cannot be restored, ${f.why}.`
}

export function previewText(title: string, plan: PlanFile[], now: number, base: string, confirm: string): string {
  const n = restorable(plan)
  const out: string[] = [title, n === 0 ? 'Nothing would change.' : `${tEn('words.file', { n: n })} would change:`]
  for (const f of plan) out.push(fileLine(f, now, base))
  out.push('')
  out.push(n === 0 ? 'Nothing was changed.' : `Nothing was changed yet. Before a restore vaken keeps a copy of the files as they are now, so a restore can be undone too. To go ahead: ${confirm}`)
  return out.join('\n')
}

export const deleteNotes = (plan: PlanFile[], now: number, base: string): string[] => plan.filter(f => (f.kind === 'created' && f.exists) || (f.kind === 'absent' && f.createdSeen && f.exists)).map(f => fileLine(f, now, base))

export type Restored = { done: number; failed: string[]; checked: number; refused: string[]; linked: string[] }
export type RestoreGuard = { fs: SafeFs; root: string }

export function restore(i: Io, probe: Probe, sid: string, plan: PlanFile[], guard: RestoreGuard): Promise<Restored> {
  return serial(async () => {
    const home = await i.home()
    const now = await i.now()
    const failed: string[] = []
    const refused: string[] = []
    const linked: string[] = []
    const files: Extract<PlanFile, { kind: 'restore' }>[] = []
    for (const f of plan) {
      if (f.kind !== 'restore') continue
      if ((await checkWrite(guard.fs, guard.root, f.path)).ok) files.push(f)
      else linked.push(f.path)
    }
    let done = 0
    let checked = 0
    let held: Held | undefined
    try {
      const kept = await copyNow(i, probe, home, sid, await loadIndex(i, sid), files.map(f => ({ path: f.path, create: false })), 'undo', now)
      await i.set(indexKey(sid), kept.idx)
      held = kept.held
    } catch {
      held = undefined
    }
    for (const f of files) {
      if (held === undefined || (!held.has(f.path) && (f.current !== undefined || (await i.read(f.path).then(() => true, () => false))))) {
        refused.push(f.path)
        continue
      }
      try {
        await i.write(f.path, f.stored)
        done += 1
        if (hashText(await i.read(f.path)) === f.snap.hash) checked += 1
        else failed.push(f.path)
      } catch {
        failed.push(f.path)
      }
    }
    return { done, failed, checked, refused, linked }
  })
}

export function restoredText(r: Restored, base: string): string {
  const out: string[] = []
  if (r.done === 0) out.push('Nothing was restored.')
  else out.push(`Restored ${tEn('words.file', { n: r.done })}; ${tEn('words.read_back_match', { n: r.checked })}`)
  if (r.refused.length > 0) {
    const one = r.refused.length === 1
    out.push(`Not restored: ${r.refused.map(p => shown(p, base)).join(', ')}. Vaken could not keep a copy of ${one ? 'it' : 'them'} as ${one ? 'it is' : 'they are'} now (too big, secret-looking, not plain text, or the copy could not be written), so a restore could not be undone. Nothing was changed in ${one ? 'that file' : 'those files'}.`)
  }
  if (r.linked.length > 0) {
    const one = r.linked.length === 1
    out.push(`Not restored: ${r.linked.map(p => shown(p, base)).join(', ')}. ${one ? 'It is' : 'They are'} a link, below a linked folder, or outside the project, and vaken does not write through a link. Nothing was changed in ${one ? 'that file' : 'those files'}.`)
  }
  if (r.failed.length > 0) out.push(`Check these by hand: ${r.failed.map(p => shown(p, base)).join(', ')}.`)
  out.push('The files as they were just before are kept, so /vaken-undo can undo this.')
  return out.join(' ')
}

export const cleanName = (s: string): string => s.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const RESERVED = new Set(['list', 'yes', 'name', 'off', 'on'])
const validName = (s: string): boolean => s !== '' && !RESERVED.has(s.toLowerCase())

export type Made = { ok: true; named: Named; held: number; notHeld: number; absent: number } | { ok: false; why: string }

export function makeCheckpoint(i: Io, probe: Probe, sid: string, name: string): Promise<Made> {
  return serial(async () => {
    try {
      const home = await i.home()
      const now = await i.now()
      const start = await loadIndex(i, sid)
      const paths = [...new Set(start.snaps.map(s => s.path))]
      if (paths.length === 0) return { ok: false as const, why: 'No file has been changed in this session yet, so there is nothing to name.' }
      const present: string[] = []
      const gone: string[] = []
      for (const p of paths) ((await probe(p)) === undefined ? gone : present).push(p)
      const r = await copyNow(i, probe, home, sid, start, present.map(path => ({ path, create: false })), 'checkpoint', now)
      const items = [...present.map(path => ({ path, snap: r.held.get(path) ?? -1 })), ...gone.map(path => ({ path, snap: 0 }))]
      await i.set(indexKey(sid), r.idx)
      const named: Named = { name, at: now, items }
      const old = parseNamed(await i.get(namedKey(sid))).filter(n => n.name.toLowerCase() !== name.toLowerCase())
      await i.set(namedKey(sid), [named, ...old].slice(0, MAX_NAMED))
      return { ok: true as const, named, held: items.filter(x => x.snap > 0).length, notHeld: items.filter(x => x.snap < 0).length, absent: gone.length }
    } catch {
      return { ok: false as const, why: 'The checkpoint could not be saved.' }
    }
  })
}

export const findNamed = (named: Named[], name: string): Named | undefined => named.find(n => n.name.toLowerCase() === name.toLowerCase())

export function madeText(m: Extract<Made, { ok: true }>): string {
  const bits = [`${tEn('words.file', { n: m.held })} held`]
  if (m.notHeld > 0) bits.push(`${tEn('words.file', { n: m.notHeld })} could not be kept (too big, secret-looking or not plain text)`)
  if (m.absent > 0) bits.push(`${tEn('words.file', { n: m.absent })} not there now`)
  return `Checkpoint "${m.named.name}" saved: ${bits.join(', ')}. Go back to it with /vaken-undo name ${m.named.name} (a preview comes first).`
}

export function namedListText(named: Named[], idx: Index, now: number): string {
  if (named.length === 0) return 'No named checkpoint yet. Name the present state: /vaken-undo checkpoint <name>.'
  return [
    'Saved points:',
    ...named.map(n => {
      const alive = n.items.filter(x => x.snap > 0 && idx.snaps.some(s => s.id === x.snap)).length
      return `  ${n.name}  ${clock(n.at, now)}  ${tEn('words.file', { n: n.items.length })}${alive < n.items.filter(x => x.snap > 0).length ? `, ${n.items.filter(x => x.snap > 0).length - alive} copies dropped to stay inside the limits` : ''}`
    }),
    '',
    'Go back to one: /vaken-undo name <checkpoint> (a preview comes first). Name the present state: /vaken-undo checkpoint <name>.',
  ].join('\n')
}

type UndoAsk = { kind: 'list' } | { kind: 'file'; n: number; yes: boolean } | { kind: 'named'; name: string; yes: boolean } | { kind: 'last'; yes: boolean } | { kind: 'bad'; why: string }

const USE = 'Use: /vaken-undo, /vaken-undo <number>, /vaken-undo last, /vaken-undo name <checkpoint>. Add yes to restore.'

export function parseUndoAsk(args: string): UndoAsk {
  const w = args.trim().split(/\s+/).filter(x => x !== '')
  if (w.length === 0) return { kind: 'list' }
  if (w[0].toLowerCase() === 'last') {
    if (w.length === 1) return { kind: 'last', yes: false }
    return w.length === 2 && w[1].toLowerCase() === 'yes' ? { kind: 'last', yes: true } : { kind: 'bad', why: USE }
  }
  if (w[0].toLowerCase() === 'name') {
    const name = cleanName(w[1] ?? '')
    if (name === '') return { kind: 'bad', why: 'Say which checkpoint: /vaken-undo name <checkpoint>.' }
    const rest = w.slice(2)
    if (rest.length === 0) return { kind: 'named', name, yes: false }
    return rest.length === 1 && rest[0].toLowerCase() === 'yes' ? { kind: 'named', name, yes: true } : { kind: 'bad', why: USE }
  }
  if (/^\d+$/.test(w[0])) {
    const n = Number(w[0])
    if (n < 1 || n > LIST_MAX) return { kind: 'bad', why: `Pick a number from 1 to ${LIST_MAX} (see /vaken-undo).` }
    if (w.length === 1) return { kind: 'file', n, yes: false }
    return w.length === 2 && w[1].toLowerCase() === 'yes' ? { kind: 'file', n, yes: true } : { kind: 'bad', why: USE }
  }
  return { kind: 'bad', why: USE }
}

type CheckpointAsk = { kind: 'list' } | { kind: 'make'; name: string } | { kind: 'bad'; why: string }

export function parseCheckpointAsk(args: string): CheckpointAsk {
  const raw = args.trim()
  if (raw === '' || raw.toLowerCase() === 'list') return { kind: 'list' }
  const name = cleanName(raw.split(/\s+/).join('-'))
  if (!validName(name)) return { kind: 'bad', why: 'Pick a name with letters or numbers, for example /vaken-undo checkpoint before-refactor. "list", "yes", "name", "on" and "off" are taken.' }
  return { kind: 'make', name }
}

export const filesWord = (n: number): string => tEn('words.file', { n: n })
