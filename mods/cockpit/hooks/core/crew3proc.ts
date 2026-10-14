// Crew programs half: parsers for `lsof` and `ps`, and rules for ports, awake hold and orphans. Pure; nothing here kills a program.
import { tr } from './lang'
import { baseName, cut, isPath, matchFolder, shortFolder } from './crew3'
import type { Folder, Live } from './crew3'
import { LID_NOTE } from './awakeplan'
import { WIN_DETAIL_WHY, WIN_DETAIL_WORK, WIN_LID_NOTE, WIN_TEXT } from './awakewords'
import type { AwakeSystem } from './awakewords'
import { LIVE_MS, STALE_MS } from './record'
import { lines } from './platform'
import { stopPidArgv } from './procs'
import type { ProcPlatform } from './procs'
import { sysWord } from './syswords'
import { tEn } from '../i18n/t'

export const PROC_TIMEOUT_MS = 5_000


export const LISTEN_ARGV: readonly string[] = ['lsof', '-nP', '-iTCP', '-sTCP:LISTEN']
export const cwdArgv = (pids: number[]): string[] => ['lsof', '-p', pids.join(','), '-a', '-d', 'cwd', '-Fn']
export const MAX_CWD_LOOKUPS = 40

type Listener = { command: string; pid: number; port: number }

// A program listening on IPv4 and IPv6 shows twice; a name with a space is printed with \x20.
const LISTEN_RE = /^(\S+)\s+(\d+)\s+\S+\s+.*?\bTCP\s+(\S+)\s+\(LISTEN\)\s*$/
export function parseListeners(out: string): Listener[] {
  const seen = new Set<string>()
  const list: Listener[] = []
  for (const line of lines(out)) {
    const m = LISTEN_RE.exec(line)
    if (m === null) continue
    const port = Number(m[3]?.slice((m[3]?.lastIndexOf(':') ?? -1) + 1))
    const pid = Number(m[2])
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !Number.isInteger(pid)) continue
    const key = `${pid}:${port}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push({ command: (m[1] ?? '').replace(/\\x20/g, ' '), pid, port })
  }
  return list.sort((a, b) => a.port - b.port || a.pid - b.pid)
}

// lsof exits 1 when one of the programs is gone; the others still answer.
export function parseCwds(out: string): Map<number, string> {
  const map = new Map<number, string>()
  let pid: number | undefined
  let fd = ''
  for (const line of lines(out)) {
    if (line.startsWith('p')) {
      pid = Number(line.slice(1))
      fd = ''
    } else if (line.startsWith('f')) fd = line.slice(1)
    else if (line.startsWith('n') && pid !== undefined && Number.isInteger(pid) && fd === 'cwd') map.set(pid, line.slice(1))
  }
  return map
}

const DEV_PORTS: Record<number, string> = {
  3000: 'the usual port of a web dev server',
  3001: 'the usual second port of a web dev server',
  4000: 'the usual port of an app server',
  5173: 'the usual port of the Vite dev server',
  5432: 'the usual port of a Postgres database',
  6379: 'the usual port of a Redis store',
  8000: 'the usual port of a Python or API dev server',
  8080: 'the usual port of a web or proxy server',
}

const PROGRAMS: [RegExp, string][] = [
  [/^node(js)?$/i, 'a Node program'],
  [/^python[\d.]*$/i, 'a Python program'],
  [/^postgres/i, 'a Postgres database'],
  [/^redis/i, 'a Redis store'],
  [/^(ruby|puma|rails)$/i, 'a Ruby program'],
  [/^java$/i, 'a Java program'],
  [/^bun$/i, 'a Bun program'],
  [/^deno$/i, 'a Deno program'],
  [/^mysqld/i, 'a MySQL database'],
  [/^(next-server|vite|webpack|esbuild)/i, 'a web dev server'],
  [/^(docker|com\.docker|vpnkit)/i, 'Docker'],
]
// A Claude session names its program by its version (2.1.295), which is not a name.
const looksLikeName = (name: string): boolean => /[A-Za-z]{2}/.test(name) && !/^v?\d[\d.]*(?:[-+]\S*)?$/.test(name)
export function programWords(command: string): string {
  const base = baseName(command)
  return PROGRAMS.find(([re]) => re.test(base))?.[1] ?? (looksLikeName(base) ? `a program called ${cut(base, 30)}` : 'a program of this session')
}

type HolderKind = 'mine' | 'other' | 'ended' | 'none'
export type PortHolder = { port: number; pid: number; command: string; cwd?: string; folder?: Folder; kind: HolderKind }

export function resolveHolders(listeners: Listener[], cwds: Map<number, string>, folders: Folder[], live: Live, me: string): PortHolder[] {
  return listeners.map(l => {
    const cwd = cwds.get(l.pid)
    const folder = cwd === undefined ? undefined : matchFolder(folders, cwd)
    let kind: HolderKind = 'none'
    if (folder !== undefined) {
      const here = live.get(folder.cwd)
      kind = here === undefined || here.length === 0 ? 'ended' : here.includes(me) ? 'mine' : 'other'
    }
    return { port: l.port, pid: l.pid, command: l.command, cwd, folder, kind }
  })
}

export function portSentence(h: PortHolder): string {
  const what = programWords(h.command)
  const name = h.folder?.name ?? ''
  if (h.kind === 'mine') return `Port ${h.port}: ${what} started in the folder of this session.`
  if (h.kind === 'other') return `Port ${h.port}: ${what} started in the folder of session '${name}'.`
  if (h.kind === 'ended') return `Port ${h.port}: ${what} started in the folder of session '${name}' (that session has ended).`
  if (h.cwd !== undefined) return `Port ${h.port}: ${what} (folder ${shortFolder(h.cwd)}). No session of vaken works in that folder.`
  return `Port ${h.port}: ${what}. Its folder could not be read.`
}

const portKnown = (port: number): string => (DEV_PORTS[port] === undefined ? '' : ` Port ${port} is ${DEV_PORTS[port]}.`)

export function portsText(mode: string, holders: PortHolder[] | undefined, listed: boolean, all = false, plat: ProcPlatform = 'posix'): string {
  const out: string[] = []
  out.push(mode === 'off' ? 'Shared ports: off. Turn it on: Settings > Agents. (This list still works.)' : 'Shared ports: on. Before Claude starts a server on a port another session holds, Claude gets a note.')
  if (holders === undefined || !listed) {
    out.push('', sysWord('The ports could not be read: the lsof program did not answer.', plat))
    return out.join('\n')
  }
  const shown = holders.filter(h => h.kind !== 'none' || DEV_PORTS[h.port] !== undefined)
  const hidden = holders.length - shown.length
  if (shown.length === 0) out.push('', 'No dev port is held and no session folder holds a port.')
  else out.push('', ...shown.map(h => `${portSentence(h)}${portKnown(h.port)}`))
  if (all && hidden > 0) out.push('', `${tEn('words.other_listening_port', { n: hidden })} not from a session folder.`)
  return out.join('\n')
}


type ServerStart = { ports: number[]; exact: boolean }

const SEGMENTS = /&&|\|\||[;|&\n]/
const START_RES: { re: RegExp; ports: number[] }[] = [
  { re: /^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?dev\b/, ports: [3000, 5173] },
  { re: /^(?:npx\s+|pnpm\s+exec\s+|yarn\s+|bunx\s+)?vite(?:\s|$)/, ports: [5173] },
  { re: /^(?:npx\s+|pnpm\s+exec\s+|yarn\s+|bunx\s+)?next\s+(?:dev|start)\b/, ports: [3000] },
]
const NOT_A_SERVER = /^(?:git|echo|printf|grep|rg|cat|sed|awk|lsof|kill|curl|wget|ls|head|tail|man|which|docker\s+(?:ps|logs|inspect))\b/
const portOk = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 65535

export function serverStart(command: string): ServerStart | undefined {
  const exact = new Set<number>()
  const guess = new Set<number>()
  let starts = false
  let envPort: number | undefined
  const segs = command.split(SEGMENTS).map(s => s.trim()).filter(s => s !== '')
  for (const raw of segs) {
    let seg = raw
    let leadingPort: number | undefined
    for (;;) {
      const m = /^(?:export\s+)?([A-Za-z_]\w*)=(\S*)\s*/.exec(seg)
      if (m === null) break
      if (m[1] === 'PORT' && /^\d{1,5}$/.test(m[2] ?? '') && portOk(Number(m[2]))) leadingPort = Number(m[2])
      seg = seg.slice(m[0].length)
    }
    if (leadingPort !== undefined) {
      if (seg === '') envPort = leadingPort
      else if (!NOT_A_SERVER.test(seg)) {
        exact.add(leadingPort)
        starts = true
      }
    }
    if (seg === '' || NOT_A_SERVER.test(seg)) continue
    const flag = /--port(?:=|\s+)(\d{1,5})\b/.exec(seg)
    if (flag !== null && portOk(Number(flag[1]))) {
      exact.add(Number(flag[1]))
      starts = true
    }
    for (const s of START_RES) {
      if (!s.re.test(seg)) continue
      starts = true
      for (const p of s.ports) guess.add(p)
    }
  }
  if (!starts) return undefined
  if (exact.size === 0 && envPort !== undefined) exact.add(envPort)
  if (exact.size > 0) return { ports: [...exact], exact: true }
  return guess.size > 0 ? { ports: [...guess], exact: false } : undefined
}

export function portNote(h: PortHolder, exact: boolean): string {
  const name = h.folder?.name ?? 'another session'
  const where = h.kind === 'ended' ? `started in the folder of session '${name}' (that session has ended, and the program was left running)` : `started in the folder of session '${name}'`
  const want = exact ? 'This command asks for the same port.' : 'This command may use the same port, because it is the usual one for this server.'
  return `Vaken saw that port ${h.port} is held by ${programWords(h.command)} ${where}. ${want} Use another port (for example ${h.port + 1}), or ask the person before you go on. Do not stop the other program yourself.`
}
export const portToast = (h: PortHolder): string => tr("Port {port} is held by session '{name}'.").replace('{port}', String(h.port)).replace('{name}', h.folder?.name ?? tr('another session'))
export const portDetail = (h: PortHolder): string => `Port ${h.port} is held by session '${cut(h.folder?.name ?? 'another session', 40)}'. The command ran.`


export const AWAKE_PID_KEY = 'cockpit:awake:pid'
export const AWAKE_AT_KEY = 'cockpit:awake:at'
// Renewed at 8 minutes; if vaken is gone the Mac may sleep again within 10.
export const AWAKE_HOLD_S = 600
const AWAKE_RENEW_MS = 8 * 60_000
export const AWAKE_START_ARGV: readonly string[] = ['sh', '-c', `nohup caffeinate -di -t ${AWAKE_HOLD_S} >/dev/null 2>&1 </dev/null & echo $!`]

export function parsePid(out: string): number | undefined {
  const line = lines(out.trim())[0]?.trim() ?? ''
  const n = Number(line)
  return /^\d+$/.test(line) && Number.isInteger(n) && n > 1 ? n : undefined
}

export const isCaffeinate = (psOut: string): boolean => baseName(lines(psOut.trim())[0]?.trim() ?? '') === 'caffeinate'

const isNamedHold = (out: string, prog: string): boolean => baseName(out.trim().split(/\r?\n/)[0]?.trim() ?? '').replace(/\.exe$/i, '').toLowerCase() === prog.toLowerCase()

// An older hold's id may belong to something else now, so the recorded process is stopped only if it is recent and `ps` says it is the hold program.
export function isOwnHold(pid: unknown, at: unknown, now: number, psOut: string | undefined, prog = 'caffeinate'): pid is number {
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 1) return false
  if (typeof at !== 'number' || now - at < 0 || now - at > (AWAKE_HOLD_S + 60) * 1000) return false
  if (psOut === undefined) return false
  return prog === 'caffeinate' ? isCaffeinate(psOut) : isNamedHold(psOut, prog)
}

export function workingNow(records: { state: string; lastEventAt: number; updatedAt: number }[], now: number): number {
  return records.filter(r => r.state === 'working' && now - r.lastEventAt <= LIVE_MS && now - r.updatedAt <= STALE_MS).length
}

type AwakeAction = 'start' | 'stop' | 'none'
export function awakePlan(mode: string, working: number, pid: unknown, at: unknown, now: number): { action: AwakeAction; fresh: boolean } {
  const held = typeof pid === 'number' && typeof at === 'number' && now - at < AWAKE_HOLD_S * 1000
  if (mode !== 'on' || working === 0) return { action: typeof pid === 'number' ? 'stop' : 'none', fresh: false }
  if (held && typeof at === 'number' && now - at < AWAKE_RENEW_MS) return { action: 'none', fresh: false }
  return { action: 'start', fresh: !held }
}

export const awakeDetail = (working: number, why?: string, sys: AwakeSystem = 'posix', heldMs?: number): string => {
  const text =
    sys === 'win32'
      ? working > 0 || why === undefined
        ? WIN_DETAIL_WORK.replace('{n}', tEn('words.session_works', { n: working }))
        : WIN_DETAIL_WHY.replace('{why}', why)
      : working > 0 || why === undefined ? `Held the Mac awake for 10 minutes, because ${tEn('words.session_works', { n: working })}. It is renewed while they work.` : `Held the Mac awake for 10 minutes: ${why}. It is renewed while that lasts.`
  return heldMs === undefined ? text : text.replace('10 minutes', heldWord(heldMs))
}
export function heldWord(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return min % 60 === 0 ? `${h} h` : `${h} h ${min % 60} min`
}

export function awakeText(mode: string, canHold: boolean, working: number, pid: unknown, at: unknown, now: number, note?: string, extra?: { away: string; why?: string }, sys: AwakeSystem = 'posix'): string {
  const win = sys === 'win32'
  const out = [`${win ? WIN_TEXT.head : 'Keep Mac awake'}: ${mode}.`]
  if (mode !== 'on' && win) out.push(WIN_TEXT.off)
  else if (mode !== 'on') out.push('Off: vaken does not touch your Mac\'s sleep. Turn it on: Settings > Agents, or type /vaken-help run awake on. It keeps the Mac awake while a session works, and while you are away (a phone is connected, or a question waits), with the macOS caffeinate program. It uses more battery.')
  else {
    if (win) out.push(WIN_TEXT.on)
    else out.push('While at least one session works, vaken keeps the Mac awake: it starts the caffeinate program for 10 minutes and renews it every 8. When nothing works, it stops the one it started.')
    if (extra !== undefined) out.push(`Away: ${extra.away === 'off' ? 'Off' : extra.away === 'waiting' ? 'Waiting 2h' : 'Phone only'}. It also holds while a phone is connected${extra.away === 'waiting' ? ', or a question waits for you (up to 2 hours)' : ''}. It never holds more than 8 hours in a row.`)
  }
  if (!canHold) out.push('', win ? WIN_TEXT.missing : 'This does not work here: the caffeinate program was not found (it is part of macOS).')
  const held = typeof pid === 'number' && typeof at === 'number' && now - at < AWAKE_HOLD_S * 1000
  out.push('', `Sessions working now: ${working}.`)
  out.push(held && typeof at === 'number' ? `${win ? WIN_TEXT.held : 'The Mac is held awake'} (started ${Math.max(0, Math.floor((now - at) / 60_000))} min ago).` : 'No hold is on now.')
  if (extra?.why !== undefined) out.push(`${extra.why}.`)
  if (mode === 'on') out.push(win ? WIN_LID_NOTE : LID_NOTE)
  if (note !== undefined) out.push(note)
  return out.join('\n')
}


export const PS_ARGV: readonly string[] = ['ps', '-axo', 'pid,ppid,etime,command']

type Proc = { pid: number; ppid: number; ageS: number; command: string }

export function parseEtime(text: string): number | undefined {
  const m = /^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/.exec(text.trim())
  if (m === null) return undefined
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3]) * 60 + Number(m[4])
}

export function parsePs(out: string): Proc[] {
  const list: Proc[] = []
  for (const line of lines(out)) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.+?)\s*$/.exec(line)
    if (m === null) continue
    const ageS = parseEtime(m[3] ?? '')
    if (ageS === undefined) continue
    list.push({ pid: Number(m[1]), ppid: Number(m[2]), ageS, command: m[4] ?? '' })
  }
  return list
}

const DEV_PROGRAM = /^(?:node|nodejs|python[\d.]*|vite|next|next-server|webpack|webpack-dev-server|esbuild|tsc)$/i
export function isDevProgram(command: string): boolean {
  const words = command.split(/\s+/)
  if (!DEV_PROGRAM.test(baseName(words[0] ?? ''))) return false
  if (words.slice(0, 3).some(w => baseName(w) === 'claude' || w.includes('@anthropic-ai/') || w.includes('@anthropic-ai\\'))) return false
  return true
}

export function redact(command: string, max = 90): string {
  const hidden = command
    .replace(/(--?[\w-]*(?:token|key|secret|password|passwd|pass)[\w-]*(?:=|\s+))\S+/gi, '$1***')
    .replace(/\b([A-Za-z_]*(?:TOKEN|KEY|SECRET|PASSWORD)[A-Za-z_]*=)\S+/g, '$1***')
  return cut(hidden, max)
}

type Orphan = Proc & { cwd: string; why: 'ended' | 'worktree'; name: string }

const ORPHAN_MIN_AGE_S = 60
const ORPHAN_SHOW = 15

type OrphanContext = {
  folders: Folder[]
  live: Live
  worktrees: string[]
  selfPids: Set<number>
}

export function candidates(procs: Proc[], ctx: Pick<OrphanContext, 'selfPids'>): Proc[] {
  return procs.filter(p => p.ageS >= ORPHAN_MIN_AGE_S && !ctx.selfPids.has(p.pid) && isDevProgram(p.command))
}

export function findOrphans(procs: Proc[], cwds: Map<number, string>, ctx: OrphanContext): Orphan[] {
  const out: Orphan[] = []
  const liveCwds = [...ctx.live.keys()]
  for (const p of candidates(procs, ctx)) {
    const cwd = cwds.get(p.pid)
    if (cwd === undefined) continue
    const tree = ctx.worktrees.filter(w => isPath(cwd, w)).sort((a, b) => b.length - a.length)[0]
    if (tree !== undefined) {
      if (liveCwds.some(c => isPath(c, tree))) continue
      const known = ctx.folders.find(f => isPath(f.cwd, tree))
      out.push({ ...p, cwd, why: known === undefined ? 'worktree' : 'ended', name: known?.name ?? shortFolder(tree) })
      continue
    }
    const folder = matchFolder(ctx.folders, cwd)
    if (folder === undefined || ctx.live.has(folder.cwd)) continue
    out.push({ ...p, cwd, why: 'ended', name: folder.name })
  }
  return out.sort((a, b) => b.ageS - a.ageS)
}

const runFor = (s: number): string => (s < 3600 ? tEn('words.minute', { n: Math.max(1, Math.floor(s / 60)) }) : s < 172800 ? tEn('words.hour', { n: Math.floor(s / 3600) }) : tEn('words.day', { n: Math.floor(s / 86400) }))

export function orphansText(found: Orphan[], readable: { ps: boolean; lsof: boolean }, plat: ProcPlatform = 'posix'): string {
  if (!readable.ps) return sysWord('Leftover programs: the ps program did not answer, so nothing could be checked.', plat)
  const out: string[] = []
  if (found.length === 0) {
    out.push('Leftover programs: none found.')
    out.push(sysWord('It looks for node, python, vite, next, webpack, esbuild and tsc programs, older than a minute, that run in the folder of a session that has ended, or in a worktree where no session works.', plat))
    if (!readable.lsof) out.push(sysWord('The lsof program did not answer, so no program\'s folder could be read.', plat))
    return out.join('\n')
  }
  out.push(`Leftover programs: ${found.length} found. Each runs in a folder where no session works now.`)
  found.slice(0, ORPHAN_SHOW).forEach((o, n) => {
    const who = o.why === 'ended' ? `session '${o.name}' has ended` : `no session works in worktree ${o.name}`
    out.push('', `${n + 1}. ${baseName(o.command.split(/\s+/)[0] ?? '')}, PID ${o.pid}, running ${runFor(o.ageS)}. Folder ${shortFolder(o.cwd)} (${who}).`, `   Command: ${redact(o.command)}`, `   To stop it, run: ${stopPidArgv(o.pid, plat).join(' ')}`)
  })
  if (found.length > ORPHAN_SHOW) out.push('', `... and ${found.length - ORPHAN_SHOW} more.`)
  out.push('', sysWord('Look at each line before you run it: a program you started by hand in that folder looks the same. Vaken never stops a program.', plat))
  return out.join('\n')
}
