// Command ledger rules: the kind of a shell command and a label of program name and kind only; never an argument, path, value or output.
import { applyKind } from './guardmigrate'
import { basename, commandsOf, flagsOf } from './guardshell'
import type { Cmd } from './guardshell'
import { hhmmss } from './time'

export const KEEP_COMMANDS = 50
const LABEL_MAX = 60

type CmdKind = 'other' | 'read' | 'edit' | 'build' | 'test' | 'run' | 'git' | 'install' | 'network' | 'database' | 'delete' | 'migration' | 'deploy'
type CmdStatus = 'ok' | 'failed' | 'interrupted' | 'denied'
export type CmdEntry = { at: number; kind: CmdKind; label: string; status: CmdStatus; exit?: number }

const RANK: Record<CmdKind, number> = { other: 0, read: 1, edit: 2, build: 3, test: 3, run: 3, git: 4, install: 5, network: 5, database: 6, delete: 7, migration: 8, deploy: 9 }

const READ = new Set(['ls', 'cat', 'head', 'tail', 'less', 'more', 'grep', 'egrep', 'fgrep', 'rg', 'ag', 'pwd', 'wc', 'echo', 'printf', 'stat', 'which', 'file', 'du', 'df', 'tree', 'env', 'printenv', 'date', 'whoami', 'uname', 'ps', 'lsof', 'sort', 'uniq', 'diff', 'jq', 'cut', 'tr', 'basename', 'dirname', 'realpath', 'test', '[', 'true', 'false', 'sleep', 'cd', 'find', 'awk', 'sed', 'fd', 'bat', 'xxd', 'shasum', 'md5'])
const EDIT = new Set(['mkdir', 'touch', 'cp', 'mv', 'ln', 'chmod', 'chown', 'tee', 'tar', 'zip', 'unzip', 'gzip', 'gunzip', 'open'])
// Compared in lower case, as cmd and PowerShell do.
const WIN_OPEN = new Set(['start', 'explorer', 'explorer.exe', 'start-process', 'saps', 'invoke-item', 'ii'])
const RUN = new Set(['node', 'python', 'python3', 'ruby', 'bash', 'sh', 'zsh', 'tsx', 'deno', 'go', 'cargo', 'make', 'source', '.'])
const TEST = new Set(['pytest', 'vitest', 'jest', 'mocha', 'rspec', 'phpunit'])
const BUILD = new Set(['tsc', 'webpack', 'vite', 'esbuild', 'rollup', 'gradle', 'mvn', 'xcodebuild', 'swift', 'dotnet', 'next', 'eslint', 'prettier', 'ruff', 'black', 'mypy'])
const NETWORK = new Set(['curl', 'wget', 'ssh', 'scp', 'sftp', 'rsync', 'nc', 'ping', 'dig', 'gh', 'aws', 'gcloud', 'az'])
const DB = new Set(['psql', 'pgcli', 'mysql', 'mariadb', 'sqlite3', 'sqlcmd', 'duckdb', 'usql', 'mongosh', 'redis-cli'])
const DEPLOY = new Set(['vercel', 'netlify', 'fly', 'flyctl', 'wrangler', 'firebase', 'kubectl', 'terraform', 'pulumi', 'helm', 'serverless', 'heroku', 'railway'])
const DEPLOY_WORDS = new Set(['deploy', 'publish', 'promote', 'rollback', 'apply', 'destroy', 'rollout', 'release'])
const PKG = new Set(['npm', 'pnpm', 'yarn', 'bun'])
const INSTALL_WORDS = new Set(['install', 'i', 'add', 'ci', 'update', 'upgrade', 'remove', 'uninstall'])

function kindOfCmd(c: Cmd): CmdKind {
  const { short, long, positional } = flagsOf(c.args)
  const pos = positional.filter(t => t.op !== true).map(t => t.t)
  const [a, b] = pos
  const prog = basename(c.prog)
  if (applyKind(c) !== undefined) return 'migration'
  if (['rm', 'rmdir', 'unlink', 'shred', 'trash'].includes(prog)) return 'delete'
  if (prog === 'find' && c.args.some(t => t.t === '-delete')) return 'delete'
  if (prog === 'git') return a === 'clean' ? 'delete' : 'git'
  if (prog === 'gh' && a === 'release') return 'deploy'
  if (prog === 'docker' || prog === 'podman') return a === 'rm' || a === 'rmi' || a === 'prune' ? 'delete' : a === 'push' ? 'deploy' : a === 'pull' ? 'network' : 'run'
  if (prog === 'kubectl' && (a === 'delete' || a === 'drain')) return 'delete'
  if (DEPLOY.has(prog) && (pos.some(x => DEPLOY_WORDS.has(x)) || long.has('--prod'))) return 'deploy'
  if (PKG.has(prog)) {
    if (a === 'publish') return 'deploy'
    if (a !== undefined && INSTALL_WORDS.has(a)) return 'install'
    const script = a === 'run' || a === 'run-script' ? b : a
    if (script !== undefined && /^test/.test(script)) return 'test'
    if (script !== undefined && /^(build|lint|typecheck|check|compile)/.test(script)) return 'build'
    return 'run'
  }
  if ((prog === 'pip' || prog === 'pip3' || prog === 'brew' || prog === 'apt' || prog === 'apt-get') && a !== undefined && INSTALL_WORDS.has(a)) return 'install'
  if (DB.has(prog)) return 'database'
  if (TEST.has(prog) || ((prog === 'go' || prog === 'cargo') && a === 'test')) return 'test'
  if ((prog === 'go' || prog === 'cargo') && a === 'build') return 'build'
  if (prog === 'sed' && short.has('i')) return 'edit'
  if (NETWORK.has(prog)) return 'network'
  if (BUILD.has(prog)) return 'build'
  if (READ.has(prog)) return c.redirects.some(r => (r.op === '>' || r.op === '>>') && r.target !== '/dev/null' && !r.target.startsWith('&')) ? 'edit' : 'read'
  if (EDIT.has(prog) || WIN_OPEN.has(prog.toLowerCase())) return 'edit'
  if (RUN.has(prog)) return 'run'
  return 'other'
}

function bestOf(command: string): { kind: CmdKind; cmd?: Cmd } {
  let best: { kind: CmdKind; cmd?: Cmd } = { kind: 'other' }
  for (const c of commandsOf(command)) {
    const k = kindOfCmd(c)
    if (RANK[k] > RANK[best.kind] || best.cmd === undefined) best = { kind: k, cmd: c }
  }
  return best
}

export const kindOf = (command: string): CmdKind => bestOf(command).kind


const VERB_PROGRAMS = new Set(['git', 'npm', 'pnpm', 'yarn', 'bun', 'docker', 'podman', 'gh', 'kubectl', 'cargo', 'go', 'brew', 'pip', 'pip3'])
const VERBS = new Set(['add', 'apply', 'branch', 'build', 'checkout', 'ci', 'clone', 'commit', 'create', 'delete', 'diff', 'exec', 'fetch', 'init', 'install', 'log', 'merge', 'pull', 'push', 'rebase', 'reset', 'restore', 'run', 'show', 'start', 'stash', 'status', 'switch', 'tag', 'test', 'uninstall', 'update', 'upgrade'])
const KIND_WORD: Record<CmdKind, string> = { other: 'other', read: 'read', edit: 'edit', build: 'build', test: 'test', run: 'run', git: 'git', install: 'install', network: 'network', database: 'database', delete: 'destroy', migration: 'migration', deploy: 'deploy' }
const PLAIN_PROG = /^[A-Za-z][A-Za-z0-9._+-]{0,29}$/
const plainProg = (name: string): string => (PLAIN_PROG.test(name) && hideSecrets(name) === name ? name : 'command')

export function safeLabelOf(command: string): string {
  const { kind, cmd } = bestOf(command)
  if (cmd === undefined) return `command · ${KIND_WORD[kind]}`
  const prog = plainProg(basename(cmd.prog))
  const verb = VERB_PROGRAMS.has(prog) ? flagsOf(cmd.args).positional.filter(t => t.op !== true)[0]?.t : undefined
  return `${prog} · ${verb !== undefined && VERBS.has(verb) ? verb : KIND_WORD[kind]}`
}
const LABEL_SHAPE = /^[A-Za-z][A-Za-z0-9._+-]{0,29} · [a-z]{2,12}$/


// The name is read as a whole run first: a pattern with the word between two runs retried every split and took seconds on a long key.key.key line.
const SECRET_IN_NAME = /key|secret|token|passw(?:or)?d|pwd|auth|credential|cookie|signature/i
const NAME_THEN_GAP = /(?<![A-Za-z0-9_.-])([A-Za-z0-9_.-]+)(=|\s+)/g
const NAMED_VALUE = /"[^"]*"|'[^']*'|\S+/y
function hideNamed(t: string, flag: boolean): string {
  let out = ''
  let from = 0
  const runs = new RegExp(NAME_THEN_GAP.source, 'g')
  for (let m = runs.exec(t); m !== null; m = runs.exec(t)) {
    const name = m[1] ?? ''
    const dash = flag ? name.indexOf('-') : 0
    if ((!flag && m[2] !== '=') || dash < 0 || !SECRET_IN_NAME.test(name.slice(dash))) continue
    NAMED_VALUE.lastIndex = runs.lastIndex
    const v = NAMED_VALUE.exec(t)
    if (v === null) continue
    out += `${t.slice(from, v.index)}***`
    from = NAMED_VALUE.lastIndex
    runs.lastIndex = NAMED_VALUE.lastIndex
  }
  return out + t.slice(from)
}

const REDACTIONS: [RegExp, string][] = [
  [/\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{6,}/g, '$1 ***'],
  [/((?:authorization|x-api-key|api-key|cookie)\s*:\s*)[^"'\n]+/gi, '$1***'],
  [/(:\/\/[^\s/:@]*:)[^\s/@]+@/g, '$1***@'],
  [/\b(?:sk|pk|rk)[-_][A-Za-z0-9_-]{12,}/g, '***'],
  [/\bgh[pousr]_[A-Za-z0-9]{16,}/g, '***'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/g, '***'],
  [/\bxox[abprs]-[A-Za-z0-9-]{8,}/g, '***'],
  [/\bAKIA[0-9A-Z]{12,}/g, '***'],
  [/\bAIza[0-9A-Za-z_-]{20,}/g, '***'],
  [/\bnpm_[A-Za-z0-9]{20,}/g, '***'],
  // From the start of a run only: a \b start would re-read a run of -eyJ-eyJ from each one.
  [/(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '***'],
]
const LONG_HEX = /\b[0-9a-fA-F]{32,}\b/g

// Read once left to right; the pattern this replaces had look-aheads that re-read a run of = or + from each one.
const RUN_CHAR = /[A-Za-z0-9_+=-]/
const NEAR = /[\w./-]/
function hideLongRuns(t: string): string {
  let out = ''
  let i = 0
  while (i < t.length) {
    if (!RUN_CHAR.test(t[i] ?? '')) {
      out += t[i]
      i++
      continue
    }
    let e = i
    let lastDigit = -1
    let lastLetter = -1
    let lastSign = -1
    for (; e < t.length && RUN_CHAR.test(t[e] ?? ''); e++) {
      const c = t[e] ?? ''
      if (c >= '0' && c <= '9') lastDigit = e
      else if (/[A-Za-z]/.test(c)) lastLetter = e
      else if (c === '+' || c === '=') lastSign = e
    }
    const endOk = !NEAR.test(t[e] ?? ' ')
    let from = i
    let s = i
    while (s < e) {
      const startOk = s === i ? !NEAR.test(t[s - 1] ?? ' ') : t[s - 1] === '+' || t[s - 1] === '='
      const j = !startOk || lastDigit < s || lastLetter < s ? -1 : endOk && e - s >= 24 ? e : lastSign >= s + 24 ? lastSign : -1
      if (j < 0) {
        s++
        continue
      }
      out += `${t.slice(from, s)}***`
      from = j
      s = j
    }
    out += t.slice(from, e)
    i = e
  }
  return out
}

const WRITTEN = /(--body|--message|--msg|-m|--data(?:-raw|-binary|-urlencode)?|-d|--text|--title|--comment|--subject|--notes?)(?:\s+|=)(?:"[^"]*"|'[^']*'|\S+)/g

export function hideSecrets(text: string): string {
  let t = hideNamed(hideNamed(text, false), true)
  for (const [re, to] of REDACTIONS) t = t.replace(re, to)
  return hideLongRuns(t).replace(LONG_HEX, '***')
}

export function labelOf(command: string): string {
  const first = (command.split('\n')[0] ?? '').slice(0, 1000).replace(/<<-?\s*['"]?\w+['"]?.*$/, '<<').replace(/\s+/g, ' ').trim()
  const hidden = hideSecrets(first).replace(WRITTEN, '$1 …')
  return hidden.length > LABEL_MAX ? `${hidden.slice(0, LABEL_MAX - 1)}…` : hidden
}

// The tool result has no exit code field; a failed call says "Exit code N" at the start of its text.
export function statusOf(denied: boolean, isError: boolean, interrupted: boolean, text: string): { status: CmdStatus; exit?: number } {
  if (denied) return { status: 'denied' }
  if (interrupted) return { status: 'interrupted' }
  if (!isError) return { status: 'ok', exit: 0 }
  const m = /^Exit code (-?\d+)/.exec(text.trimStart())
  return m === null ? { status: 'failed' } : { status: 'failed', exit: Number(m[1]) }
}

export function makeEntry(at: number, command: string, outcome: { status: CmdStatus; exit?: number }): CmdEntry {
  return { at, kind: kindOf(command), label: safeLabelOf(command), status: outcome.status, ...(outcome.exit === undefined ? {} : { exit: outcome.exit }) }
}

export const commandsKey = (sid: string): string => `cockpit:guard:commands:${sid}`

// An old entry may hold arguments in its label; it is migrated on read and the old text is not kept.
function migrated(e: CmdEntry): CmdEntry {
  if (LABEL_SHAPE.test(e.label)) return e
  const first = (e.label.trim().split(/\s+/)[0] ?? '').split('/').pop() ?? ''
  const kind = Object.prototype.hasOwnProperty.call(KIND_WORD, e.kind) ? KIND_WORD[e.kind as CmdKind] : 'other'
  return { ...e, label: `${plainProg(first)} · ${kind}` }
}

export function parseEntries(v: unknown): CmdEntry[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is CmdEntry => typeof x === 'object' && x !== null && typeof (x as CmdEntry).at === 'number' && typeof (x as CmdEntry).kind === 'string' && typeof (x as CmdEntry).label === 'string').map(migrated)
}

export const addEntry = (list: CmdEntry[], e: CmdEntry): CmdEntry[] => [...list, e].slice(-KEEP_COMMANDS)

const endWord = (e: CmdEntry): string => (e.status === 'ok' ? 'ok' : e.status === 'denied' ? 'stopped by the guard' : e.status === 'interrupted' ? 'stopped' : e.exit === undefined ? 'failed' : `failed (exit ${e.exit})`)

export function commandsText(list: CmdEntry[], on: boolean): string {
  const lines = [`Shell commands in this session, in order (the last ${KEEP_COMMANDS} at most; kind, time, how it ended, a label of the program and the kind, never the arguments).`]
  if (!on) lines.push('The list is off now, so new commands are not added. Turn it on: Settings > Safety.')
  if (list.length === 0) lines.push('', 'No shell command kept yet.')
  else {
    lines.push('')
    for (const e of list) lines.push(`${hhmmss(e.at)}  ${e.kind.padEnd(9)} ${endWord(e).padEnd(12)} ${e.label}`)
  }
  lines.push('', 'The output and the arguments of a command are never kept: only its program name and its kind.')
  return lines.join('\n')
}
