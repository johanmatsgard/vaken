// What the Guard finds in one tool call. Takes an `Io`, never `$`, so it runs under a fake in tests. A check whose mode is off is not run.
import type { Io } from './io'
import { PROFILE_WORD, checkCommand, checkSql, sentence, shellWriteTargets, truncationFinding, truncationTargets } from './guarddestroy'
import type { Finding } from './guarddestroy'
import { WIN_PROTECTED, absolute, isInside, isInsideTemp, looksWin, matchesAny, winProtectedKind } from './guardpaths'
import { NPM_CACHE_KEY, NPM_LOOKUP_MS, POPULAR_NPM, cachedNpm, describePackage, isOdd, nearMiss, packageJsonDeps, parseInstalls, parseNpmCache, parseNpmView, pythonHas, slowWords, withNpmAnswers } from './guardpkg'
import type { Install, NpmInfo } from './guardpkg'
import { checkTamper, describeTamper, looksLikeTest } from './guardtests'
import { fileSize, onWindows, opsOf } from './fileops'
import { resolveProgram } from './procs'
import { inScope, parsePkg, pkgKey, scopeKey, strings } from './guard'
import type { Block, Found, Mode } from './guard'
import { commandFlavorOfTool, isEditTool } from './tools'
import type { ShellFlavor } from './tools'
import { tEn } from '../i18n/t'

export type Env = { home: string; cwd: string; root: string }
export type Modes = Record<Block, Mode>
export type Judged = { found: Found[]; learn: string[]; warned?: string[] }

export const DEFAULT_PROTECTED = ['.claude/settings.json', '.claude/settings.local.json', '.claude/hooks', '.claude/agents', '.claude/commands', '.mcp.json', '.git/hooks', '.git/config', '~/.ssh', '~/.aws', '~/.zshrc', '~/.zshenv', '~/.bashrc', '~/.bash_profile', '~/.zprofile', '~/.profile', '~/.gitconfig', '~/.npmrc', '~/Library/LaunchAgents', '/etc']

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const list = (items: string[], max = 3): string => (items.length <= max ? items.join(', ') : `${items.slice(0, max).join(', ')} and ${items.length - max} more`)

function editedText(tool: string, a: Record<string, unknown>): { next: string; old: string } {
  if (tool === 'Write') return { next: str(a.content), old: '' }
  if (tool === 'Edit') return { next: str(a.new_string), old: str(a.old_string) }
  if (tool === 'NotebookEdit') return { next: str(a.new_source), old: '' }
  if (tool === 'MultiEdit' && Array.isArray(a.edits)) {
    const edits = a.edits as Record<string, unknown>[]
    return { next: edits.map(x => str(x.new_string)).join('\n'), old: edits.map(x => str(x.old_string)).join('\n') }
  }
  return { next: '', old: '' }
}

async function nearestPackageJson(io: Io, cwd: string): Promise<Set<string> | undefined> {
  let dir = cwd
  for (let n = 0; n < 6; n += 1) {
    try {
      const deps = packageJsonDeps(await io.read(`${dir}/package.json`))
      if (deps !== undefined) return deps
    } catch {
      // no package.json here: look one folder up
    }
    const up = dir.slice(0, dir.lastIndexOf('/'))
    if (up === dir || up === '') break
    dir = up
  }
  return undefined
}

// The public registry is fixed, so a registry set in the project's .npmrc is never asked.
export const NPM_REGISTRY = 'https://registry.npmjs.org/'

export const npmViewArgv = (program: string, name: string): string[] => [program, 'view', name, 'time.created', 'dist.unpacked-size', 'license', 'deprecated', '--json', `--registry=${NPM_REGISTRY}`]

// Runs from `home`, a neutral folder, never the project.
async function npmView(io: Io, home: string, name: string): Promise<NpmInfo | null | 'slow'> {
  if (home === '') return null
  const start = await io.now()
  try {
    const r = await io.run(npmViewArgv(resolveProgram('npm', /^[A-Za-z]:/.test(home) ? 'win32' : 'posix'), name), { cwd: home, timeoutMs: NPM_LOOKUP_MS })
    return r.exitCode === 0 ? (parseNpmView(r.stdout) ?? null) : null
  } catch {
    return (await io.now()) - start >= NPM_LOOKUP_MS - 250 ? 'slow' : null
  }
}

async function newPackages(io: Io, env: Env, installs: Install[]): Promise<{ lines: string[]; names: string[]; odd: string[]; slow: string[] }> {
  const approved = new Set(parsePkg(await io.get(pkgKey(await io.sessionId()))).approved)
  const npmDeps = installs.some(x => x.eco === 'npm') ? await nearestPackageJson(io, env.cwd) : undefined
  let pyText = ''
  if (installs.some(x => x.eco === 'pip')) {
    for (const f of ['requirements.txt', 'pyproject.toml']) pyText += await io.read(`${env.cwd}/${f}`).catch(() => '')
  }
  const now = await io.now()
  const fresh: { eco: Install['eco']; name: string }[] = []
  for (const inst of installs) {
    for (const name of inst.names) {
      if (approved.has(name) || fresh.some(x => x.name === name)) continue
      const known = inst.eco === 'npm' ? npmDeps?.has(name) === true : pythonHas(pyText, name)
      if (!known) fresh.push({ eco: inst.eco, name })
    }
  }
  const ask = fresh.filter(x => x.eco === 'npm').slice(0, 4).map(x => x.name)
  const cache = ask.length > 0 ? parseNpmCache(await io.get(NPM_CACHE_KEY)) : {}
  const info = new Map<string, NpmInfo | null | 'slow'>()
  for (const name of ask) {
    const c = cachedNpm(cache, name, now)
    if (c !== undefined) info.set(name, c.info)
  }
  const missing = ask.filter(n => !info.has(n))
  if (missing.length > 0) {
    const got = await Promise.all(missing.map(n => npmView(io, env.home, n)))
    const answers: Record<string, NpmInfo | null> = {}
    missing.forEach((n, k) => {
      const a = got[k] ?? null
      info.set(n, a)
      answers[n] = a === 'slow' ? null : a
    })
    await io.set(NPM_CACHE_KEY, withNpmAnswers(cache, answers, now)).catch(() => undefined)
  }
  const out = { lines: [] as string[], names: [] as string[], odd: [] as string[], slow: [] as string[] }
  for (const { eco, name } of fresh) {
    const a = info.get(name)
    if (a === 'slow') {
      if (nearMiss(name, POPULAR_NPM) === undefined) {
        out.slow.push(name)
        continue
      }
    }
    const known = a === undefined || a === null || a === 'slow' ? undefined : a
    if (isOdd(name, eco, known, now)) {
      out.odd.push(name)
      out.lines.push(describePackage(name, eco, known, now))
    } else out.names.push(name)
  }
  return out
}

// Windows has no `test` program, and a program that cannot start reads as "not there", so there the runtime's file call answers. A check that cannot answer means "not there", never a false finding.
async function nonEmptyFile(io: Io, path: string): Promise<boolean> {
  const o = opsOf(io)
  if (await onWindows(o, [path])) return ((await fileSize(o, path)) ?? 0) > 0
  const r = await io.run(['test', '-s', path], { timeoutMs: 5000 }).catch(() => ({ exitCode: 1 }))
  return r.exitCode === 0
}

const idsOf = (fs: Finding[]): string => fs.map(f => `${f.id}|${f.where ?? ''}`).join(';')

function destructiveFound(fs: Finding[]): Found | undefined {
  if (fs.length === 0) return undefined
  const words = fs.slice(0, 3).map(sentence)
  if (fs.length > 3) words.push(`${fs.length - 3} more risky steps follow.`)
  return { block: 'destructive', key: idsOf(fs), words: words.join(' ') }
}

async function judgeShell(io: Io, env: Env, command: string, modes: Modes, flavor: ShellFlavor): Promise<Judged> {
  const out: Judged = { found: [], learn: [] }
  if (modes.destructive !== 'off') {
    const fs: Finding[] = checkCommand(command, { home: env.home, cwd: env.cwd }, flavor)
    for (const t of truncationTargets(command, { home: env.home, cwd: env.cwd }, flavor)) {
      if (isInside(t, env.root)) continue
      if (await nonEmptyFile(io, t)) fs.push(truncationFinding(t))
    }
    const f = destructiveFound(fs)
    if (f !== undefined) out.found.push(f)
  }
  if (modes.scope !== 'off') out.found.push(...shellProtected(command, env, flavor))
  if (modes.packages !== 'off') {
    const installs = parseInstalls(command)
    if (installs.length > 0) {
      const p = await newPackages(io, env, installs)
      out.learn.push(...p.names)
      // An odd package is not remembered as approved.
      if (p.odd.length > 0) {
        out.found.push({ block: 'packages', key: p.odd.join(','), words: tEn('words.installs_odd', { n: p.odd.length, lines: p.lines.join(' ') }) })
        out.warned = p.odd
      }
      if (p.slow.length > 0) out.found.push({ block: 'packages', key: `slow|${p.slow.join(',')}`, words: slowWords(p.slow), soft: true })
    }
  }
  return out
}

export function protectedHit(path: string, home: string): string | undefined {
  const win = looksWin(path)
  const fwd = (s: string): string => (win ? s.replace(/\\/g, '/') : s)
  const kind = win && !isInsideTemp(path) ? winProtectedKind(path, home) : undefined
  return kind === 'drive' || kind === 'system' || kind === 'startup' ? `the Windows ${kind} folders` : matchesAny(fwd(path), win ? [...DEFAULT_PROTECTED, ...WIN_PROTECTED] : DEFAULT_PROTECTED, fwd(home))
}

function shellProtected(command: string, env: Env, flavor: ShellFlavor): Found[] {
  const out: Found[] = []
  for (const path of shellWriteTargets(command, { home: env.home, cwd: env.cwd }, flavor)) {
    if (path === PROFILE_WORD) {
      out.push({ block: 'scope', key: `protected|${path}`, words: `This edits your PowerShell profile (${path}), a protected file (it runs at every PowerShell start).` })
      continue
    }
    const hit = protectedHit(path, env.home)
    if (hit !== undefined) out.push({ block: 'scope', key: `protected|${path}`, words: `This edits ${path}, a protected file (it matches ${hit}).` })
  }
  return out
}

async function judgeWrite(io: Io, env: Env, tool: string, a: Record<string, unknown>, modes: Modes): Promise<Judged> {
  const out: Judged = { found: [], learn: [] }
  const raw = str(a.file_path) || str(a.notebook_path)
  if (raw === '') return out
  const path = absolute(raw, env.home, env.cwd)
  if (modes.scope !== 'off') {
    const hit = protectedHit(path, env.home)
    if (hit !== undefined) out.found.push({ block: 'scope', key: `protected|${path}`, words: `This edits ${path}, a protected file (it matches ${hit}).` })
    const scope = strings(await io.get(scopeKey(await io.sessionId())))
    if (!inScope(path, scope)) out.found.push({ block: 'scope', key: `outside|${path}`, words: `${path} is outside the folders you set (${list(scope)}).` })
  }
  if (modes.tests !== 'off' && tool !== 'NotebookEdit' && looksLikeTest(path)) {
    const { next: newText, old } = editedText(tool, a)
    const before = tool === 'Write' ? await io.read(path).catch(() => '') : old
    const t = checkTamper(path, before, newText)
    if (t !== undefined) out.found.push({ block: 'tests', key: `tamper|${path}`, words: describeTamper(path, t) })
  }
  return out
}

// A database tool's query is read in every usual field; any other tool's only in a field named for SQL, so a search box is never read as SQL.
const DB_TOOL = /sql|query|execute|database|db_|_db|postgres|mysql|maria|sqlite|supabase|mongo|migration|bigquery|snowflake|clickhouse|neon|turso|planetscale|cockroach|duckdb|redshift|prisma|d1_/i
function mcpSql(tool: string, a: Record<string, unknown>): Finding[] {
  const text = (DB_TOOL.test(tool) ? ['query', 'sql', 'statement', 'command'] : ['sql', 'statement']).map(k => str(a[k])).join('\n')
  return text.trim() === '' ? [] : checkSql(text)
}

export async function judgeTool(io: Io, env: Env, tool: string, args: Record<string, unknown>, modes: Modes): Promise<Judged> {
  const flavor = commandFlavorOfTool(tool)
  if (flavor !== undefined) return judgeShell(io, env, str(args.command), modes, flavor)
  if (isEditTool(tool)) return judgeWrite(io, env, tool, args, modes)
  if (tool.startsWith('mcp__') && modes.destructive !== 'off') {
    const f = destructiveFound(mcpSql(tool, args))
    return { found: f === undefined ? [] : [f], learn: [] }
  }
  return { found: [], learn: [] }
}
