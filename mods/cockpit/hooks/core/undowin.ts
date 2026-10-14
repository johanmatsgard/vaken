// Undo on Windows: the files a PowerShell or cmd line is about to remove, overwrite, empty or move, using the guard's Windows reader.
import { absolute, expandHome } from './guardpaths'
import { splitArgs, winCommandsOf } from './guardwin'
import type { Args, WCmd } from './guardwin'
import { parentDir } from './platform'
import type { Env, Target } from './undo'

const ALIAS: Readonly<Record<string, string>> = { lp: 'literalpath', pspath: 'literalpath' }
const COMMON = ['whatif', 'confirm', 'lp', 'pspath'] as const
const PATHS = ['path', 'literalpath', 'lp', 'pspath'] as const

type Shape = { known: readonly string[]; values: readonly string[] }
const REMOVE: Shape = { known: ['path', 'literalpath', 'filter', 'include', 'exclude', 'recurse', 'force', 'credential', 'stream', ...COMMON], values: [...PATHS, 'filter', 'include', 'exclude', 'credential', 'stream'] }
const CONTENT: Shape = { known: ['path', 'literalpath', 'value', 'encoding', 'filter', 'include', 'exclude', 'force', 'passthru', 'nonewline', 'credential', 'stream', ...COMMON], values: [...PATHS, 'value', 'encoding', 'filter', 'include', 'exclude', 'credential', 'stream'] }
const OUTFILE: Shape = { known: ['filepath', 'literalpath', 'path', 'encoding', 'append', 'force', 'noclobber', 'width', 'nonewline', 'inputobject', ...COMMON], values: [...PATHS, 'filepath', 'encoding', 'width', 'inputobject'] }
const TEE: Shape = { known: ['filepath', 'literalpath', 'path', 'variable', 'append', 'inputobject', ...COMMON], values: [...PATHS, 'filepath', 'variable', 'inputobject'] }
const MOVE: Shape = { known: ['path', 'literalpath', 'destination', 'force', 'filter', 'include', 'exclude', 'passthru', 'credential', 'recurse', 'container', ...COMMON], values: [...PATHS, 'destination', 'filter', 'include', 'exclude', 'credential'] }
const RENAME: Shape = { known: ['path', 'literalpath', 'newname', 'force', 'passthru', 'credential', ...COMMON], values: [...PATHS, 'newname', 'credential'] }

const REMOVERS = new Set(['remove-item', 'ri', 'rm', 'del', 'erase', 'rd', 'rmdir'])
const SETTERS = new Set(['set-content', 'sc', 'add-content', 'ac'])
const CLEARERS = new Set(['clear-content', 'clc'])
const MOVERS = new Set(['move-item', 'mi', 'move', 'mv'])
const COPIERS = new Set(['copy-item', 'cpi', 'copy', 'cp'])
const RENAMERS = new Set(['rename-item', 'rni', 'ren', 'rename'])
const CMD_VERBS = new Set(['del', 'erase', 'rd', 'rmdir', 'move', 'copy', 'ren', 'rename'])
// `sc create ...` is the service tool sc.exe, not Set-Content.
const SC_SERVICE = /^(?:create|delete|config|stop|start|query|queryex|qc|description|failure|sdset|pause|continue)$/i

type Val = { raw: string; literal: boolean }

// A target the plan never takes: devices, stream copies, computed paths, wildcards, provider paths.
function skipped(v: Val, home: string): boolean {
  const x = expandHome(v.raw, home)
  if (x === '' || x.startsWith('&') || x.startsWith('(') || x.startsWith('@')) return true
  if (/^(?:nul|con|prn|aux|\$null|\/dev\/null)(?::)?$/i.test(x)) return true
  if (/[*?$%`{}]/.test(x) || (!v.literal && /[[\]]/.test(x))) return true
  return /^[A-Za-z]{2,}:/.test(x) || /^\\\\[?.]\\/.test(x)
}

type Read = { a: Args; named: (name: string) => Val[]; pos: string[]; list: (raw: string, literal: boolean) => Val[] }
function read(c: WCmd, shape: Shape): Read {
  const a = splitArgs(c.args, shape)
  for (const [k, v] of [...a.params]) {
    const full = ALIAS[k]
    if (full !== undefined && !a.params.has(full)) a.params.set(full, v)
  }
  const cmd = c.shell === 'cmd'
  const quoted = new Set(a.tokens.filter(t => t.quoted).map(t => t.t))
  const list = (raw: string, literal: boolean): Val[] => (quoted.has(raw) ? [raw] : raw.split(',').filter(x => x !== '')).map(r => ({ raw: r, literal: literal || cmd }))
  const named = (name: string): Val[] => {
    const v = a.params.get(name)
    return v === undefined ? [] : list(v, name === 'literalpath')
  }
  const pos = a.positional.filter(p => quoted.has(p) || (!/^-/.test(p) && !(cmd && p.startsWith('/'))))
  return { a, named, pos, list }
}

const whatIf = (r: Read): boolean => r.a.flags.has('-whatif')

function firstPath(r: Read, name = 'path'): Val[] {
  const v = [...r.named(name), ...r.named('literalpath')]
  if (v.length > 0) return v
  const p = r.pos.shift()
  return p === undefined ? [] : r.list(p, false)
}

export function winPlan(command: string, env: Env): { targets: Target[]; git: string[][] } {
  const found = new Map<string, boolean>()
  const git: string[][] = []
  const add = (v: Val, create: boolean, base = env.cwd): string | undefined => {
    if (skipped(v, env.home)) return undefined
    const abs = absolute(v.raw, env.home, base)
    found.set(abs, (found.get(abs) ?? false) || create)
    return abs
  }
  for (const c of winCommandsOf(command)) {
    const cmd = c.shell === 'cmd'
    for (const r of c.redirects) add({ raw: r.target, literal: cmd }, true)
    if (cmd && !CMD_VERBS.has(c.prog)) continue
    if (c.prog === 'git') {
      git.push(c.args.filter(t => t.op !== true).map(t => t.t))
      continue
    }
    if (REMOVERS.has(c.prog)) {
      const r = read(c, REMOVE)
      if (whatIf(r)) continue
      const list = cmd ? r.pos.flatMap(p => r.list(p, true)) : firstPath(r)
      for (const v of list) add(v, false)
    } else if (SETTERS.has(c.prog) || CLEARERS.has(c.prog)) {
      if (c.prog === 'sc' && SC_SERVICE.test(c.args[0]?.t ?? '')) continue
      const r = read(c, CONTENT)
      if (whatIf(r)) continue
      for (const v of firstPath(r)) add(v, SETTERS.has(c.prog))
    } else if (c.prog === 'out-file' || c.prog === 'tee-object' || c.prog === 'tee') {
      const r = read(c, c.prog === 'out-file' ? OUTFILE : TEE)
      if (whatIf(r)) continue
      const fp = r.named('filepath')
      for (const v of fp.length > 0 ? fp : firstPath(r)) add(v, true)
    } else if (MOVERS.has(c.prog) || COPIERS.has(c.prog)) {
      const r = read(c, MOVE)
      if (whatIf(r)) continue
      let src: Val[]
      let dest: Val | undefined
      if (cmd) {
        if (r.pos.length < 2) continue
        dest = r.list(r.pos[r.pos.length - 1] ?? '', true)[0]
        src = r.pos.slice(0, -1).flatMap(p => r.list(p, true))
      } else {
        src = firstPath(r)
        const d = r.named('destination')[0]
        const p = r.pos.shift()
        dest = d ?? (p === undefined ? undefined : { raw: p, literal: false })
      }
      if (MOVERS.has(c.prog)) for (const v of src) add(v, false)
      if (dest !== undefined) add(dest, true)
    } else if (RENAMERS.has(c.prog)) {
      const r = read(c, RENAME)
      if (whatIf(r)) continue
      const src = cmd ? r.pos.slice(0, 1).map(p => ({ raw: p, literal: true })) : firstPath(r)
      const newName = cmd ? r.pos[1] : (r.a.params.get('newname') ?? r.pos.shift())
      const from = src.length === 1 && src[0] !== undefined ? add(src[0], false) : undefined
      if (from !== undefined && newName !== undefined) add({ raw: newName, literal: true }, true, parentDir(from))
    }
  }
  return { targets: [...found.entries()].map(([path, create]) => ({ path, create })), git }
}
