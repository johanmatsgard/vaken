// Destructive hold: finds shell commands and SQL statements that cannot be undone. A speed bump, not a boundary.
import { REBUILDABLE, absolute, expandHome, isInside, isInsideTemp, isRebuildable, isScratch, looksWin } from './guardpaths'
import { basename, commandsOf, flagsOf, remoteScripts, withoutDataHeredocs } from './guardshell'
import { dotnetOps } from './guardnet'
import { checkWindows, isWindowsShape, mergeWin, netOverwriteTargets, splitArgs, winCommandsOf } from './guardwin'
import { WIN_EN } from './guardwinwords'
import type { Cmd, Tok } from './guardshell'
import type { ShellFlavor } from './tools'

export type Finding = {
  id: string
  what: string
  where?: string
  risk: string
}

type Env = { home: string; cwd: string; project?: string; protectedBranches?: readonly string[] }

const DEFAULT_PROTECTED_BRANCHES = ['main', 'master', 'production', 'release'] as const

const SQL_PROGRAMS = new Set(['psql', 'mysql', 'mariadb', 'sqlite3', 'sqlcmd', 'duckdb', 'usql', 'pgcli', 'mycli', 'clickhouse-client', 'cockroach', 'mongo', 'mongosh'])
const MONGO_PROGRAMS = new Set(['mongo', 'mongosh'])
const HAS_GLOB = /[*?[]/

export function sentence(f: Finding): string {
  return `${f.what}${f.where !== undefined ? ` ${f.where}` : ''}. ${f.risk}`
}

const list = (items: string[], max = 3) => (items.length <= max ? items.join(', ') : `${items.slice(0, max).join(', ')} and ${items.length - max} more`)

const HAS_VARIABLE = /\$[A-Za-z_{(]|`/

const TMP_VAR = /^\$(?:\{(?:TMPDIR|TMP|TEMP)\}|(?:TMPDIR|TMP|TEMP)(?![\w]))\/+(?!\.\.?(?:\/|$))(?!.*(?:\/\.\.(?:\/|$)|\$|`))[^\s*][^\s]*$/

// A Windows path whose backslash the POSIX reading took as an escape.
const DRIVE_EATEN = /^([A-Za-z]:)(?=[^\\/])/

function checkRm(c: Cmd, env: Env, cwdKnown = true): Finding | undefined {
  const { short, long, positional } = flagsOf(c.args)
  const recursive = short.has('r') || short.has('R') || long.has('--recursive')
  const targets = positional.filter(t => t.op !== true)
  const shown: string[] = []
  let risky = false
  let atRoot = false
  const kinds: string[] = []
  const project = env.project ?? env.cwd
  for (const t of targets) {
    const expanded = expandHome(t.t, env.home)
    // "C:Users" is what the POSIX reading leaves of C:\Users; it is said as the drive's folder, never joined under the session folder.
    const abs = DRIVE_EATEN.test(t.t) && looksWin(env.cwd) ? absolute(t.t.replace(DRIVE_EATEN, '$1\\'), env.home, env.cwd) : absolute(t.t, env.home, env.cwd)
    const glob = !t.quoted && HAS_GLOB.test(t.t)
    const bare = ['~', '$HOME', '${HOME}', '/', '.', '..', './', '~/', '$HOME/', '/*', '~/*', '$HOME/*', './*'].includes(t.t)
    if (TMP_VAR.test(t.t)) continue
    const byVariable = HAS_VARIABLE.test(expanded)
    const relBare = !cwdKnown && ['.', '..', './', './*'].includes(t.t)
    if ((!bare || relBare) && (byVariable || (!cwdKnown && !expanded.startsWith('/')))) {
      const tail = expanded.replace(/\/\*+$/, '').split('/').pop() ?? ''
      if (expanded.includes('/') && REBUILDABLE.has(tail)) continue
      if (glob || recursive) {
        risky = true
        shown.push(byVariable ? `the folder named by ${t.t} (unknown until the command runs)` : `${t.t} inside a folder that is not known yet (unknown until the command runs)`)
      }
      continue
    }
    const isHomeOrAbove = abs === '/' || abs === env.home || (env.home !== '' && isInside(env.home, abs))
    if (bare || isHomeOrAbove) {
      risky = true
      atRoot = true
      const kind = abs === '/' ? 'the whole disk' : abs === env.home ? 'your home folder' : abs === project ? 'the project root' : env.home !== '' && isInside(env.home, abs) ? 'a folder that holds your home folder' : t.t === '..' ? 'the folder above the one you are in' : 'the folder you are in'
      if (!kinds.includes(kind)) kinds.push(kind)
      shown.push(t.t === '.' || t.t === './' || t.t === './*' ? `${env.cwd} (the current folder)` : abs)
      continue
    }
    if (isInsideTemp(abs)) continue
    if (isRebuildable(abs, env.cwd)) continue
    if (glob || recursive) {
      risky = true
      shown.push(glob ? `files matching ${abs}` : abs)
    }
  }
  if (c.viaXargs && recursive && targets.length === 0) {
    return { id: 'rm-xargs', what: 'Permanently deletes every folder named on the previous command\'s output (xargs rm -r)', risk: 'rm skips the Trash, so there is no undo.' }
  }
  if (!risky) return undefined
  const what = atRoot ? 'Permanently deletes' : recursive ? 'Permanently deletes' : 'Permanently deletes the files'
  return {
    id: 'rm',
    what,
    where: recursive && !atRoot ? `${list(shown)} and everything inside` : list(shown),
    risk: atRoot ? `That is ${kinds.join(' and ')}. rm skips the Trash, so there is no undo.` : 'rm skips the Trash, so there is no undo.',
  }
}

const FIND_LEAD = /^-(?:H|L|P|O\d*)$/
const FIND_FILTERS = new Set(['-name', '-iname', '-path', '-ipath', '-wholename', '-iwholename', '-regex', '-iregex', '-lname', '-ilname', '-newer', '-anewer', '-cnewer', '-mtime', '-mmin', '-atime', '-amin', '-ctime', '-cmin', '-size', '-empty', '-user', '-group', '-nouser', '-nogroup', '-perm', '-links', '-inum', '-samefile', '-uid', '-gid'])
const FIND_EXEC = new Set(['-exec', '-execdir', '-ok', '-okdir'])
const DELETERS = new Set(['rm', 'rmdir', 'unlink', 'shred'])

function checkFind(c: Cmd, here: Env, project: string, cwdKnown: boolean): Finding | undefined {
  const a = c.args.filter(t => t.op !== true)
  const deletes = a.some(t => t.t === '-delete') || a.some((t, k) => FIND_EXEC.has(t.t) && DELETERS.has(basename(a[k + 1]?.t ?? '')))
  if (!deletes) return undefined
  let i = 0
  while (i < a.length && !a[i]!.quoted && (FIND_LEAD.test(a[i]!.t) || a[i]!.t === '-D')) i += a[i]!.t === '-D' ? 2 : 1
  const starts: Tok[] = []
  while (i < a.length && (a[i]!.quoted || !(a[i]!.t.startsWith('-') || a[i]!.t === '(' || a[i]!.t === '!' || a[i]!.t === ','))) starts.push(a[i++]!)
  if (starts.length === 0) starts.push({ t: '.', quoted: false })
  const filtered = a.some(t => !t.quoted && FIND_FILTERS.has(t.t))
  const kept = starts.filter(t => {
    if (!filtered) return true
    const x = expandHome(t.t, here.home)
    if (HAS_VARIABLE.test(x) || (!cwdKnown && !x.startsWith('/'))) return true
    return !isInside(absolute(t.t, here.home, here.cwd), project)
  })
  if (kept.length === 0) return undefined
  const f = checkRm({ ...c, prog: 'rm', args: [{ t: '-r', quoted: false }, { t: '--', quoted: false }, ...kept], viaXargs: false }, here, cwdKnown)
  if (f === undefined) return undefined
  return {
    id: 'find-delete',
    what: f.what,
    where: filtered && f.where !== undefined ? `the files it matches under ${f.where.replace(/ and everything inside$/, '')}` : f.where,
    risk: f.risk.replace('rm skips the Trash', 'find deletes without the Trash'),
  }
}

function gitParts(c: Cmd, env: Env): { sub: string; rest: Tok[]; dir: string } | undefined {
  const a = c.args
  let i = 0
  let dir = env.cwd
  while (i < a.length && a[i]!.t.startsWith('-') && !a[i]!.quoted) {
    const t = a[i]!.t
    if (t === '-C' && a[i + 1] !== undefined) {
      dir = absolute(a[i + 1]!.t, env.home, env.cwd)
      i += 2
    } else if ((t === '-c' || t === '--git-dir' || t === '--work-tree' || t === '--namespace') && a[i + 1] !== undefined) i += 2
    else i++
  }
  const sub = a[i]
  if (sub === undefined) return undefined
  return { sub: sub.t, rest: a.slice(i + 1), dir }
}

function branchOf(refspec: string): string {
  const dest = refspec.includes(':') ? (refspec.split(':').pop() ?? '') : refspec
  return dest.replace(/^\+/, '').replace(/^refs\/heads\//, '')
}

function checkGit(c: Cmd, env: Env): Finding[] {
  const g = gitParts(c, env)
  if (g === undefined) return []
  const { short, long, positional } = flagsOf(g.rest)
  const protectedNames = env.protectedBranches ?? DEFAULT_PROTECTED_BRANCHES
  const out: Finding[] = []
  const pos = positional.map(t => t.t)
  if (g.sub === 'reset' && long.has('--hard')) {
    out.push({ id: 'git-reset-hard', what: 'Throws away every uncommitted change in', where: g.dir, risk: 'Edits that were never committed cannot be brought back (git reset --hard).' })
  } else if (g.sub === 'push') {
    const hard = short.has('f') || long.has('--force') || pos.some(p => p.startsWith('+'))
    const force = hard || long.has('--force-with-lease') || long.has('--force-if-includes')
    const deleting = long.has('--delete') || short.has('d') || pos.some(p => p.startsWith(':'))
    const refspecs = pos.slice(1)
    if (force || deleting) {
      const targets = refspecs.map(branchOf).filter(b => b !== '')
      const unknown = refspecs.length === 0 || targets.some(b => b === 'HEAD')
      const hits = targets.filter(b => protectedNames.includes(b))
      // A lease push with no branch named is not flagged: the branch is not known to be a protected one, and the lease refuses when someone else pushed there.
      if (force && ((unknown && hard) || hits.length > 0)) {
        out.push({
          id: 'git-push-force',
          what: 'Force-pushes over',
          where: unknown && hits.length === 0 ? 'the remote branch this one tracks (which may be a protected one)' : `the remote branch ${list(hits)}`,
          risk: 'Commits other people already pushed there can be lost, and the remote history is rewritten.',
        })
      } else if (deleting && hits.length > 0) {
        out.push({ id: 'git-push-delete', what: 'Deletes the remote branch', where: list(hits), risk: 'Other people may be working from it, and the deploy may follow it.' })
      }
    }
  } else if (g.sub === 'clean') {
    const dry = short.has('n') || long.has('--dry-run')
    const force = short.has('f') || long.has('--force')
    if (!dry && force && (short.has('d') || short.has('x') || short.has('X'))) {
      out.push({ id: 'git-clean', what: 'Deletes every untracked file and folder in', where: g.dir, risk: 'They were never committed, so git cannot bring them back (git clean).' })
    }
  } else if (g.sub === 'checkout') {
    const dashAt = g.rest.findIndex(t => t.t === '--' && !t.quoted)
    const afterDash = dashAt >= 0 ? g.rest.slice(dashAt + 1).map(t => t.t) : []
    if (afterDash.some(p => p === '.' || p === ':/') || (dashAt < 0 && pos.length === 1 && (pos[0] === '.' || pos[0] === ':/'))) {
      out.push({ id: 'git-checkout-dot', what: 'Reverts every uncommitted edit in', where: g.dir, risk: 'Changes that were never committed cannot be brought back (git checkout .).' })
    }
  } else if (g.sub === 'restore') {
    const stagedOnly = long.has('--staged') && !long.has('--worktree')
    if (!stagedOnly && pos.some(p => p === '.' || p === ':/')) {
      out.push({ id: 'git-restore-dot', what: 'Reverts every uncommitted edit in', where: g.dir, risk: 'Changes that were never committed cannot be brought back (git restore .).' })
    }
  } else if (g.sub === 'branch') {
    const forceDelete = short.has('D') || ((short.has('d') || long.has('--delete')) && (short.has('f') || long.has('--force')))
    // Only a protected name is flagged: on real work 75 of 76 flags for -D were squash-merge cleanups.
    if (forceDelete && pos.some(b => protectedNames.includes(b))) {
      const hits = pos.filter(b => protectedNames.includes(b))
      out.push({
        id: 'git-branch-D',
        what: 'Force-deletes the git branch',
        where: list(pos),
        risk: hits.length > 0 ? `${list(hits)} is a protected branch name. Commits only on it become hard to find.` : 'Commits that exist only on it become hard to find.',
      })
    }
  }
  out.push(...checkGitMore(g.sub, g.rest, g.dir))
  return out
}

export function checkSql(text: string): Finding[] {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
  const out: Finding[] = []
  for (const raw of clean.split(';')) {
    const s = raw.trim()
    if (s === '') continue
    const hasWhere = /\bwhere\b/i.test(s)
    let m = /^drop\s+(table|database|schema|view|materialized\s+view|index|column|role|user|extension|type|sequence|function|trigger|policy)\s+(?:if\s+exists\s+)?([\w."`[\]-]+)/i.exec(s)
    if (m !== null) {
      out.push({ id: 'sql-drop', what: `Runs SQL that drops the ${m[1]!.toLowerCase()}`, where: m[2], risk: 'It is gone for good unless there is a backup.' })
      continue
    }
    m = /^truncate\s+(?:table\s+)?(?:only\s+)?([\w."`[\]-]+)/i.exec(s)
    if (m !== null) {
      out.push({ id: 'sql-truncate', what: 'Runs SQL that empties every row of', where: m[1], risk: 'The rows are gone for good unless there is a backup.' })
      continue
    }
    m = /^delete\s+from\s+(?:only\s+)?([\w."`[\]-]+)/i.exec(s)
    if (m !== null && !hasWhere) {
      out.push({ id: 'sql-delete', what: 'Runs SQL that deletes every row of', where: m[1], risk: 'There is no WHERE, and the rows are gone for good unless there is a backup.' })
      continue
    }
    m = /^update\s+(?:only\s+)?([\w."`[\]-]+)\s+set\b/i.exec(s)
    if (m !== null && !hasWhere) {
      out.push({ id: 'sql-update', what: 'Runs SQL that overwrites a column in every row of', where: m[1], risk: 'There is no WHERE, and the old values are gone unless there is a backup.' })
      continue
    }
    if (/\.dropDatabase\s*\(\s*\)/.test(s) || /runCommand\s*\(\s*\{\s*['"]?dropDatabase['"]?\s*:/.test(s)) {
      out.push({ id: 'mongo-drop', what: 'Runs a Mongo command that drops the database', where: /getSiblingDB\(\s*['"]([^'"]+)['"]\s*\)/.exec(s)?.[1], risk: 'It is gone for good unless there is a backup.' })
      continue
    }
    m = /(?:getCollection\(\s*['"]([^'"]+)['"]\s*\)|\.([\w$]+))\.drop\s*\(\s*\)/.exec(s)
    if (m !== null) {
      out.push({ id: 'mongo-drop', what: 'Runs a Mongo command that drops the collection', where: m[1] ?? m[2], risk: 'It is gone for good unless there is a backup.' })
      continue
    }
    m = /(?:getCollection\(\s*['"]([^'"]+)['"]\s*\)|\.([\w$]+))\.(?:deleteMany|remove)\s*\(\s*\{\s*\}\s*\)/.exec(s)
    if (m !== null) {
      out.push({ id: 'mongo-delete', what: 'Runs a Mongo command that deletes every document of', where: m[1] ?? m[2], risk: 'The filter is empty, and the documents are gone for good unless there is a backup.' })
      continue
    }
    m = /^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w."`[\]-]+)\s+drop\s+(column|constraint)/i.exec(s)
    if (m !== null) {
      out.push({ id: 'sql-alter-drop', what: `Runs SQL that drops a ${m[2]!.toLowerCase()} from`, where: m[1], risk: 'The data in it is gone for good unless there is a backup.' })
    }
  }
  return out
}

function checkOther(c: Cmd, env: Env): Finding[] {
  const out: Finding[] = []
  const { short, long, positional } = flagsOf(c.args)
  const pos = positional.filter(t => t.op !== true).map(t => absolute(t.t, env.home, env.cwd))
  if ((c.prog === 'chmod' || c.prog === 'chown' || c.prog === 'chgrp') && (short.has('R') || long.has('--recursive'))) {
    const targets = pos.slice(1).filter(p => !isRebuildable(p, env.cwd))
    if (targets.length > 0) {
      out.push({ id: 'chmod-r', what: `Changes ${c.prog === 'chmod' ? 'permissions' : 'owner'} of everything under`, where: list(targets), risk: 'A wrong setting can lock you out of your own files or open them to everyone.' })
    }
  }
  if (c.prog.startsWith('mkfs') || c.prog === 'wipefs' || (c.prog === 'diskutil' && c.args.some(a => /^(erase|partition|zero|secure)/i.test(a.t)))) {
    out.push({ id: 'format', what: 'Formats or wipes a disk or partition', where: undefined, risk: 'Everything on it is erased.' })
  }
  if (c.prog === 'dd') {
    const of = c.args.find(a => a.t.startsWith('of='))
    if (of !== undefined && of.t !== 'of=/dev/null') {
      out.push({ id: 'dd', what: 'Writes raw data over', where: of.t.slice(3), risk: 'Whatever is there now is overwritten.' })
    }
  }
  if (SQL_PROGRAMS.has(c.prog)) {
    // A Mongo script has no spaces, so every word of the Mongo shell is read.
    for (const a of c.args) if (a.op !== true && (a.t.includes(' ') || MONGO_PROGRAMS.has(c.prog))) out.push(...checkSql(a.t))
    for (const r of c.redirects) if (r.op === '<<<') out.push(...checkSql(r.target))
  }
  if ((c.prog === 'echo' || c.prog === 'printf') && c.into !== undefined && SQL_PROGRAMS.has(c.into.prog)) {
    for (const a of c.args) if (a.op !== true && !(c.prog === 'echo' && /^-[neE]+$/.test(a.t))) out.push(...checkSql(a.t))
  }
  // rsync --delete removes every file in the target that the source does not have; a target in temp or a rebuildable folder is fine.
  if (c.prog === 'rsync' && c.args.some(a => !a.quoted && /^--(?:del|delete(?:-[a-z]+)?)$/.test(a.t))) {
    const raw = positional.filter(t => t.op !== true).pop()?.t
    const remote = raw !== undefined && /^[^/:]+:/.test(raw) && !/^[A-Za-z]:[\\/]/.test(raw)
    const dest = raw === undefined || remote ? raw : absolute(raw, env.home, env.cwd)
    if (dest !== undefined && (remote || (!isInsideTemp(dest) && !isRebuildable(dest, env.cwd)))) {
      out.push({ id: 'rsync-delete', what: 'Deletes every file the source does not have, in', where: dest, risk: 'rsync --delete skips the Trash, so there is no undo.' })
    }
  }
  if (c.prog === 'mongorestore' && c.args.some(a => a.t === '--drop')) {
    out.push({ id: 'mongo-drop', what: 'Restores a Mongo backup and first drops each collection it restores', risk: 'What is in those collections now is gone for good unless there is a backup.' })
  }
  // rg --pre runs the program it names on every file it searches.
  if (c.prog === 'rg' && c.args.some(a => !a.quoted && /^--pre(?:=|$)/.test(a.t))) out.push({ id: 'rg-pre', ...WIN_EN['rg-pre']! })
  if (c.fedByDownload) {
    out.push({ id: 'curl-sh', what: 'Downloads a script and runs it at once', risk: 'You cannot read what it does before it runs.' })
  } else if (/\b(?:ba|z|da|k)?sh\s+(?:-\w+\s+)*(?:-c\s+)?["']?(?:<\(|\$\()\s*(?:curl|wget)\b/.test(c.raw) || /(?:^|[\s;&|])(?:source|\.)\s+<\(\s*(?:curl|wget)\b/.test(c.raw)) {
    out.push({ id: 'curl-sh', what: 'Downloads a script and runs it at once', risk: 'You cannot read what it does before it runs.' })
  }
  if (c.fedByDecode) out.push({ id: 'decoded-sh', ...WIN_EN['decoded-sh']! })
  out.push(...checkMore(c, env))
  return out
}

function afterCd(c: Cmd, env: Env, cwd: string | undefined): string | undefined {
  const dir = flagsOf(c.args).positional.filter(t => t.op !== true)[0]
  if (dir === undefined) return env.home === '' ? undefined : env.home
  const x = expandHome(dir.t, env.home)
  if (dir.t === '-' || HAS_VARIABLE.test(x)) return undefined
  if (!x.startsWith('/') && cwd === undefined) return undefined
  return absolute(dir.t, env.home, cwd ?? env.cwd)
}

// The normal POSIX reading always runs. A line that looks like a Windows command is also read with backslashes as path characters and the Windows reading. The findings are the union, so a marker can only add findings.
export function checkCommand(command: string, env: Env, flavor: ShellFlavor = 'posix'): Finding[] {
  // The POSIX reader has no comments, so a comment would become arguments and hide a risky one; a comment-free reading is added as a union.
  const uncommented = stripComments(command)
  // In PowerShell a backslash is a path character: the escape reading would read rm .\build as rm .build.
  const ps = flavor === 'powershell'
  const plain = uncommented === command ? checkPosix(command, env, false, ps) : mergeWin(checkPosix(command, env, false, ps), checkPosix(uncommented, env, false, ps))
  const posix = mergeWin(mergeWin(mergeWin(plain, forkBomb(uncommented)), dbHeredocs(command)), checkRemote(uncommented, ps))
  const known = flavor === 'powershell'
  if (!known && (!isWindowsShape(command) || searchOnly(uncommented))) return posix
  return mergeWin(mergeWin(posix, checkPosix(command, env, true)), checkWindows(command, env, known))
}

// A command run on another computer over ssh is read with that computer as its place: its home and folder stand for the remote ones (ssh starts in the
// remote home), and each finding says the host. ~ in a finding is the remote home. Nested ssh is read a few levels deep.
const REMOTE_HOME = '/~'
const REMOTE_ENV: Env = { home: REMOTE_HOME, cwd: REMOTE_HOME, project: '' }
const REMOTE_DEPTH = 3

function checkRemote(command: string, ps: boolean, depth = 0): Finding[] {
  if (depth >= REMOTE_DEPTH) return []
  let out: Finding[] = []
  for (const r of remoteScripts(command, ps)) {
    const found = mergeWin(checkPosix(r.script, REMOTE_ENV, false), checkRemote(r.script, ps, depth + 1))
    out = mergeWin(out, found.map(f => ({ ...f, where: `${(f.where ?? '').split(REMOTE_HOME).join('~')} on ${r.host}`.trim() })))
  }
  return out
}

const SEARCHERS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ag', 'head', 'tail', 'wc', 'sort', 'uniq', 'cut', 'tr', 'nl', 'cat', 'less', 'more', 'column'])

// Read the POSIX way: the Windows readings would split a search word at a \" and see a delete in it.
function searchOnly(command: string): boolean {
  const cmds = commandsOf(command)
  return cmds.length > 0 && cmds.every(c => SEARCHERS.has(c.prog) && !c.viaXargs && !writesFile(c) && c.redirects.every(r => r.op === '<' || r.target === '/dev/null' || r.target.startsWith('&')) && !c.args.some(a => !a.quoted && /^--pre(?:=|$)/.test(a.t)))
}

function writesFile(c: Cmd): boolean {
  const f = flagsOf(c.args)
  if (c.prog === 'sort') return f.short.has('o') || c.args.some(a => !a.quoted && /^--output(?:=|$)/.test(a.t))
  return c.prog === 'uniq' && f.positional.filter(t => t.op !== true).length >= 2
}

// Only an unquoted, unescaped # at the start of a word starts a comment; a#b and quoted # are kept.
function stripComments(command: string): string {
  let out = ''
  let q: '' | "'" | '"' = ''
  for (let i = 0; i < command.length; i++) {
    const c = command[i] ?? ''
    if (q !== '') {
      if (c === '\\' && q === '"') {
        out += c + (command[i + 1] ?? '')
        i++
        continue
      }
      if (c === q) q = ''
      out += c
      continue
    }
    if (c === '\\') {
      out += c + (command[i + 1] ?? '')
      i++
      continue
    }
    if (c === "'" || c === '"') q = c
    if (c === '#' && (i === 0 || /[\s;&|()<>]/.test(command[i - 1] ?? ''))) {
      while (i < command.length && command[i] !== '\n') i++
      out += '\n'
      continue
    }
    out += c
  }
  return out
}

function checkPosix(command: string, env: Env, win: boolean, psEscape = false): Finding[] {
  const out: Finding[] = []
  const seen = new Set<string>()
  let cwd: string | undefined = env.cwd
  for (const c of commandsOf(command, 0, win)) {
    if (c.prog === 'cd' || c.prog === 'pushd') {
      cwd = afterCd(c, env, cwd)
      continue
    }
    const here = cwd === undefined || cwd === env.cwd ? env : { ...env, cwd, project: env.cwd }
    const found: Finding[] = []
    if (c.prog === 'rm') {
      const f = psEscape && c.raw.includes('\\') ? undefined : checkRm(c, here, cwd !== undefined)
      if (f !== undefined) found.push(f)
    } else if (c.prog === 'find') {
      const f = checkFind(c, here, env.cwd, cwd !== undefined)
      if (f !== undefined) found.push(f)
    } else if (c.prog === 'git') found.push(...checkGit(c, here))
    found.push(...checkOther(c, here))
    for (const f of found) {
      const key = `${f.id}|${f.where ?? ''}`
      if (!seen.has(key)) {
        seen.add(key)
        out.push(f)
      }
    }
  }
  return out
}

export function truncationTargets(command: string, env: Env, flavor: ShellFlavor = 'posix'): string[] {
  const out: string[] = []
  for (const c of commandsOf(command)) {
    for (const r of c.redirects) {
      if ((r.op === '>' || r.op === '>|') && r.target !== '' && !r.target.startsWith('&') && !r.target.startsWith('/dev/')) {
        out.push(absolute(r.target, env.home, env.cwd))
      }
    }
    if (c.prog === 'truncate') {
      const sizeIdx = c.args.findIndex(a => a.t === '-s' || a.t === '--size')
      const size = sizeIdx >= 0 ? c.args[sizeIdx + 1]?.t : c.args.find(a => a.t.startsWith('--size='))?.t.slice(7)
      if (size === '0') for (const t of flagsOf(c.args).positional) if (t.t !== '0') out.push(absolute(t.t, env.home, env.cwd))
    }
  }
  out.push(...netOverwriteTargets(command, env, flavor === 'powershell'))
  return [...new Set(out)].filter(p => !isScratch(p))
}

export function truncationFinding(path: string): Finding {
  return { id: 'truncate', what: 'Empties the existing file', where: path, risk: 'It is outside this project and its current content is lost.' }
}

// Cloud and database deletes, resets, public publishes and wipes follow the same Settings row as rm -rf. This part adds the destructive reading and never removes one.

const RUNNERS = new Set(['npx', 'bunx', 'pnpx'])
const PKG = new Set(['npm', 'pnpm', 'yarn', 'bun'])

function unwrapRunner(c: Cmd): { prog: string; pos: string[]; all: string[] } {
  const all = c.args.filter(t => t.op !== true).map(t => t.t)
  let pos = flagsOf(c.args).positional.filter(t => t.op !== true).map(t => t.t)
  let prog = c.prog
  if (RUNNERS.has(prog)) {
    prog = basename(pos[0] ?? '')
    pos = pos.slice(1)
  } else if (PKG.has(prog) && ['exec', 'dlx', 'x'].includes(pos[0] ?? '')) {
    prog = basename(pos[1] ?? '')
    pos = pos.slice(2)
  } else if (prog === 'yarn' && ['prisma', 'rails', 'drizzle-kit', 'supabase'].includes(pos[0] ?? '')) {
    prog = pos[0] ?? ''
    pos = pos.slice(1)
  }
  return { prog, pos, all }
}

// =none is a real run.
const dry = (all: string[]): boolean => all.some(t => /^--?dry-?run(?:=(?:client|server|true))?$/i.test(t) || t === '--help' || t === '-h')
const has = (all: string[], ...names: string[]): boolean => all.some(t => names.includes(t.split('=')[0] ?? t))

const CLOUD_RISK = 'What it deletes is gone for good unless there is a backup, and other people may depend on it.'

const KUBE_WIDE = /^(ns|namespaces?|pv|persistentvolumes?|pvc|persistentvolumeclaims?|crds?|customresourcedefinitions?|nodes?|statefulsets?|sts)$/i

function kubectl(pos: string[], all: string[]): Finding | undefined {
  const at = pos.indexOf('delete')
  if (at < 0 || at > 1 || dry(all)) return undefined
  const kind = (pos[at + 1] ?? '').split('/')[0] ?? ''
  const everything = has(all, '--all', '-A', '--all-namespaces')
  const fileAt = all.findIndex(t => ['-f', '--filename', '-k', '--kustomize'].includes(t.split('=')[0] ?? t))
  if (fileAt >= 0) {
    const t = all[fileAt] ?? ''
    const file = t.includes('=') ? t.slice(t.indexOf('=') + 1) : (all[fileAt + 1] ?? '')
    return { id: 'kube-delete', what: 'Deletes from a Kubernetes cluster', where: `everything named in ${file}`, risk: CLOUD_RISK }
  }
  if (!KUBE_WIDE.test(kind) && !everything) return undefined
  const what = pos.slice(at + 1, at + 3).join(' ')
  return { id: 'kube-delete', what: 'Deletes from a Kubernetes cluster', where: everything ? `${what} (all of them)` : what, risk: CLOUD_RISK }
}

const AWS_GONE = /^(delete-bucket|delete-db-instance|delete-db-cluster|delete-table|terminate-instances|delete-volume|delete-snapshot|delete-stack|delete-cluster|delete-file-system|delete-repository|delete-function|delete-secret|delete-user-pool|delete-domain|delete-hosted-zone)$/

function aws(pos: string[], all: string[]): Finding | undefined {
  if (dry(all)) return undefined
  const [svc, op, target] = pos
  if (svc === 's3' && op === 'rm' && has(all, '--recursive')) return { id: 'cloud-delete', what: 'Deletes every object under', where: target, risk: CLOUD_RISK }
  if (svc === 's3' && op === 'rb') return { id: 'cloud-delete', what: `Deletes the storage bucket${has(all, '--force') ? ' and everything in it' : ''}`, where: target, risk: CLOUD_RISK }
  if (op !== undefined && AWS_GONE.test(op)) return { id: 'cloud-delete', what: `Deletes cloud resources (aws ${svc} ${op})`, risk: CLOUD_RISK }
  return undefined
}

const GCLOUD_GONE = new Set(['projects', 'sql', 'spanner', 'container', 'compute', 'storage', 'firestore', 'bigtable', 'redis', 'filestore', 'alloydb', 'functions', 'run', 'pubsub', 'secrets'])

function gcloud(pos: string[], all: string[]): Finding | undefined {
  if (dry(all)) return undefined
  const words = pos[0] === 'alpha' || pos[0] === 'beta' ? pos.slice(1) : pos
  if (words[0] === 'storage' && (words[1] === 'rm' || words[1] === 'rb') && (words[1] === 'rb' || has(all, '-r', '--recursive'))) return { id: 'cloud-delete', what: 'Deletes cloud storage', where: words[2], risk: CLOUD_RISK }
  const at = words.indexOf('delete')
  if (at > 0 && GCLOUD_GONE.has(words[0] ?? '')) return { id: 'cloud-delete', what: `Deletes cloud resources (gcloud ${words.slice(0, at + 1).join(' ')})`, where: words[at + 1], risk: CLOUD_RISK }
  return undefined
}

function gsutil(c: Cmd): Finding | undefined {
  const { short, long, positional } = flagsOf(c.args)
  const pos = positional.map(t => t.t)
  if (pos[0] === 'rb' || (pos[0] === 'rm' && (short.has('r') || short.has('R') || long.has('--recursive')))) return { id: 'cloud-delete', what: 'Deletes cloud storage', where: pos[1], risk: CLOUD_RISK }
  return undefined
}

const AZ_GONE = new Set(['group', 'sql', 'cosmosdb', 'storage', 'aks', 'postgres', 'mysql', 'redis', 'vm', 'webapp', 'functionapp', 'keyvault'])

function az(pos: string[], all: string[]): Finding | undefined {
  const at = pos.indexOf('delete')
  if (at > 0 && AZ_GONE.has(pos[0] ?? '') && !dry(all)) return { id: 'cloud-delete', what: `Deletes cloud resources (az ${pos.slice(0, at + 1).join(' ')})`, risk: CLOUD_RISK }
  return undefined
}

function terraform(pos: string[], all: string[]): Finding | undefined {
  if (pos[0] === 'destroy' || (pos[0] === 'apply' && has(all, '-destroy', '--destroy'))) {
    if (has(all, '-help', '--help')) return undefined
    return { id: 'infra-destroy', what: 'Destroys the live infrastructure this configuration manages', risk: 'Servers, databases and the data in them can be gone for good.' }
  }
  return undefined
}

const DB_RISK = 'Every row in the database it points at can be lost, unless there is a backup.'

function dbWipe(prog: string, pos: string[], all: string[]): Finding | undefined {
  if (has(all, '--help', '-h')) return undefined
  const [a, b] = pos
  const say = (cmd: string): Finding => ({ id: 'db-wipe', what: `Wipes database data (${cmd})`, risk: DB_RISK })
  if (prog === 'prisma') {
    if (a === 'migrate' && b === 'reset') return say('prisma migrate reset')
    if (a === 'db' && b === 'push' && has(all, '--accept-data-loss', '--force-reset')) return say(`prisma db push ${has(all, '--force-reset') ? '--force-reset' : '--accept-data-loss'}`)
  }
  if ((prog === 'rails' || prog === 'rake' || prog === 'bin/rails') && /^db:(drop|reset|schema:load|purge)/.test(a ?? '')) return say(`rails ${a}`)
  if (prog === 'php' && a === 'artisan' && /^(migrate:fresh|migrate:reset|db:wipe)$/.test(b ?? '')) return say(`php artisan ${b}`)
  if (prog === 'mix' && /^ecto\.(drop|reset)$/.test(a ?? '')) return say(`mix ${a}`)
  if (prog === 'dbmate' && a === 'drop') return say('dbmate drop')
  if (prog === 'flyway' && a === 'clean') return say('flyway clean')
  if (prog === 'drizzle-kit' && a === 'drop') return say('drizzle-kit drop')
  if (prog === 'supabase' && a === 'db' && b === 'reset' && has(all, '--linked', '--db-url')) return say('supabase db reset on a remote database')
  if ((prog === 'sequelize' || prog === 'sequelize-cli') && a === 'db:drop') return say('sequelize db:drop')
  if ((prog === 'python' || prog === 'python3') && /manage\.py$/.test(a ?? '') && b === 'flush') return say('manage.py flush')
  if (prog === 'django-admin' && a === 'flush') return say('django-admin flush')
  return undefined
}

function publish(prog: string, pos: string[], all: string[]): Finding | undefined {
  if (!PKG.has(prog) || dry(all)) return undefined
  const sub = prog === 'yarn' && pos[0] === 'npm' ? pos[1] : pos[0]
  if (sub === 'publish') return { id: 'publish', what: 'Publishes a package to the public registry', risk: 'Anyone can install it at once, and a published version can never be used again.' }
  if (sub === 'unpublish') return { id: 'unpublish', what: 'Removes a published package from the public registry', where: pos.slice(1).find(p => !p.startsWith('-')), risk: 'Other projects that install it break, and the version can never be used again.' }
  return undefined
}

const SECRET_DIRS = ['.ssh', '.aws', '.gnupg', '.kube', '.config/gcloud', '.azure', '.docker']

function holdsKeys(abs: string, home: string): boolean {
  if (home === '') return false
  if (abs === home) return true
  return SECRET_DIRS.some(d => isInside(abs, `${home}/${d}`))
}

export function checkGitMore(sub: string, rest: Cmd['args'], dir: string): Finding[] {
  const { short, long, positional } = flagsOf(rest)
  const pos = positional.map(t => t.t)
  if (sub === 'stash' && pos[0] === 'clear') return [{ id: 'git-stash-clear', what: 'Deletes every stashed change in', where: dir, risk: 'Stashed work is not on any branch, so it cannot be brought back (git stash clear).' }]
  if (sub === 'push' && long.has('--mirror')) return [{ id: 'git-push-mirror', what: 'Makes the remote an exact copy of this repository', risk: 'Remote branches and tags that are not here are deleted, and pushed history can be overwritten (git push --mirror).' }]
  if (sub === 'filter-branch' || sub === 'filter-repo') return [{ id: 'git-rewrite', what: 'Rewrites the whole history of', where: dir, risk: `Every commit gets a new id; a later push overwrites what other people have (git ${sub}).` }]
  if (sub === 'update-ref' && (short.has('d') || long.has('--delete'))) return [{ id: 'git-update-ref-d', what: 'Deletes the git reference', where: pos[0], risk: 'Commits only on it become hard to find (git update-ref -d).' }]
  return []
}

export function checkMore(c: Cmd, env: Env): Finding[] {
  const out: Finding[] = []
  const { short, long, positional } = flagsOf(c.args)
  const pos = positional.filter(t => t.op !== true).map(t => t.t)
  const r = unwrapRunner(c)
  const push = (f: Finding | undefined): void => {
    if (f !== undefined) out.push(f)
  }
  if (r.prog === 'terraform' || r.prog === 'tofu' || r.prog === 'terragrunt') push(terraform(r.pos, r.all))
  else if (r.prog === 'kubectl' || r.prog === 'oc') push(kubectl(r.pos, r.all))
  else if (r.prog === 'aws') push(aws(r.pos, r.all))
  else if (r.prog === 'gcloud') push(gcloud(r.pos, r.all))
  else if (r.prog === 'gsutil') push(gsutil(c))
  else if (r.prog === 'az') push(az(r.pos, r.all))
  else if (r.prog === 'helm' && /^(uninstall|un|delete|del)$/.test(r.pos[0] ?? '') && !dry(r.all)) push({ id: 'helm-uninstall', what: 'Uninstalls the release from a Kubernetes cluster', where: r.pos[1], risk: CLOUD_RISK })
  push(dbWipe(r.prog, r.pos, r.all))
  push(publish(c.prog, pos, r.all))
  if (c.prog === 'docker' || c.prog === 'podman' || c.prog === 'docker-compose') {
    const words = c.prog === 'docker-compose' ? ['compose', ...pos] : pos
    if (words[0] === 'system' && words[1] === 'prune' && long.has('--volumes')) push({ id: 'docker-volumes', what: 'Deletes every unused container volume', risk: 'Data kept in volumes (databases and the like) is gone for good.' })
    else if (words[0] === 'volume' && /^(rm|remove|prune)$/.test(words[1] ?? '')) push({ id: 'docker-volumes', what: 'Deletes container volumes', where: words.slice(2).join(' ') || undefined, risk: 'Data kept in volumes (databases and the like) is gone for good.' })
    else if (words[0] === 'compose' && words.includes('down') && (short.has('v') || long.has('--volumes'))) push({ id: 'docker-volumes', what: 'Stops the services and deletes their volumes', risk: 'Data kept in volumes (databases and the like) is gone for good.' })
  }
  if (c.prog === 'redis-cli' && c.args.some(a => /^flush(all|db)$/i.test(a.t))) push({ id: 'redis-flush', what: 'Deletes every key in the Redis database', risk: 'The data is gone for good unless there is a backup.' })
  if (c.prog === 'crontab' && short.has('r')) push({ id: 'crontab-r', what: 'Deletes every scheduled job of this user (crontab -r)', risk: 'The list is not kept anywhere else, so it cannot be brought back.' })
  if (c.prog === 'shred') {
    const files = pos.filter(p => !/^\d+$/.test(p))
    if (files.length > 0) push({ id: 'shred', what: 'Overwrites and destroys', where: files.slice(0, 3).map(f => absolute(f, env.home, env.cwd)).join(', '), risk: 'shred makes a file unreadable on purpose, so no tool can bring it back.' })
  }
  if (c.prog === 'mv' && pos.length >= 2) {
    const keys = pos.slice(0, -1).map(p => absolute(expandHome(p, env.home), env.home, env.cwd)).filter(p => holdsKeys(p, env.home))
    if (keys.length > 0) push({ id: 'mv-keys', what: 'Moves a folder of keys and logins away', where: keys.slice(0, 2).join(', '), risk: 'Logins, keys and servers that read it from there stop working.' })
  }
  if (/^(shutdown|reboot|halt|poweroff)$/.test(c.prog) && !short.has('c') && !c.args.some(a => a.t === '--help' || /^\/(?:a|\?)$/i.test(a.t))) push({ id: 'shutdown', what: 'Shuts down or restarts the computer', risk: 'Unsaved work in every open program is lost, and running jobs stop.' })
  return out
}

const DB_WORD = new RegExp(`(?:^|[\\s;&|(/])(?:${[...SQL_PROGRAMS].join('|')})(?=[\\s;&|)]|$)`)
export function dbHeredocs(command: string): Finding[] {
  if (!command.includes('<<')) return []
  const lines = command.split('\n')
  const out: Finding[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const m = /<<(-?)\s*(['"]?)([A-Za-z_][\w-]*)\2/.exec(line)
    if (m === null || line.includes('<<<')) continue
    const body: string[] = []
    let j = i + 1
    while (j < lines.length && (m[1] === '-' ? (lines[j] ?? '').trim() : lines[j]) !== m[3]) body.push(lines[j++] ?? '')
    if (DB_WORD.test(line)) out.push(...checkSql(body.join('\n')))
    i = j
  }
  return out
}

// A fork bomb: a function that calls itself twice in the background.
const FORK_BOMB = /(^|[\s;&|(])([\w:.]+)\s*\(\)\s*\{\s*\2\s*\|\s*\2\s*&\s*\}\s*;?\s*\2(?![\w:.])/

export function forkBomb(command: string): Finding[] {
  return FORK_BOMB.test(command) ? [{ id: 'fork-bomb', what: 'Starts copies of itself without end (a fork bomb)', risk: 'The computer stops answering and must be restarted; unsaved work is lost.' }] : []
}


const PS_WRITERS = new Set(['set-content', 'sc', 'add-content', 'ac', 'out-file', 'clear-content', 'clc', 'tee-object', 'tee'])
const PS_PROFILE = /^\$profile(?:\.\w+)?$/i
export const PROFILE_WORD = '$PROFILE'

export function shellWriteTargets(command: string, env: Env, flavor: 'posix' | 'powershell' = 'posix'): string[] {
  const out: string[] = []
  for (const c of commandsOf(command)) {
    for (const r of c.redirects) if ((r.op === '>' || r.op === '>>' || r.op === '>|') && r.target !== '' && !r.target.startsWith('&')) out.push(r.target)
    if (c.prog === 'tee') out.push(...flagsOf(c.args).positional.map(t => t.t))
  }
  // A bash line drops heredoc bodies that are only data; their redirect is still read above.
  const win = flavor === 'powershell' ? command : withoutDataHeredocs(command)
  if (flavor === 'powershell' || isWindowsShape(command) || /\$profile\b/i.test(win)) {
    for (const c of winCommandsOf(win)) {
      for (const r of c.redirects) if (r.target !== '' && !r.target.startsWith('&')) out.push(r.target)
      if (!PS_WRITERS.has(c.prog)) continue
      const a = splitArgs(c.args, { known: ['path', 'literalpath', 'filepath', 'value', 'append', 'encoding', 'force', 'inputobject'], values: ['path', 'literalpath', 'filepath', 'value', 'encoding', 'inputobject'] })
      const t = a.params.get('filepath') ?? a.params.get('path') ?? a.params.get('literalpath') ?? a.positional[0]
      if (t !== undefined) out.push(t)
    }
    // A .NET call such as [IO.File]::WriteAllText writes the same as Set-Content.
    for (const op of dotnetOps(win)) if (op.act === 'write' && op.arg.known) out.push(op.arg.raw)
  }
  const paths = out.filter(t => !/^(?:\/dev\/|nul$|\$null$)/i.test(t)).map(t => (PS_PROFILE.test(t) ? PROFILE_WORD : absolute(t, env.home, env.cwd)))
  return [...new Set(paths)]
}
