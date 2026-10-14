// Windows: the process list for the orphan finder and port holders. Windows exposes no working folder of another program, so it is guessed from the command line.
import type { Io } from './io'

type Run = Io['run']

export type WinProc = { pid: number; ppid: number; ageS: number; command: string }

const NAME_FILTER = '^(node|nodejs|pythonw?[0-9.]*|py|vite|next|next-server|webpack|webpack-dev-server|esbuild|tsc)\\.exe$'

const SELECT = 'Select-Object ProcessId,ParentProcessId,Name,CreationDate,CommandLine | ConvertTo-Json -Compress'

export function winProcsArgv(pids?: readonly number[]): string[] {
  const ids = (pids ?? []).filter(n => Number.isInteger(n) && n > 0)
  const where = pids === undefined ? `| Where-Object { $_.Name -match '${NAME_FILTER}' } ` : ids.length === 0 ? '| Where-Object { $false } ' : `| Where-Object { @(${ids.join(',')}) -contains $_.ProcessId } `
  return ['powershell', '-NoProfile', '-NonInteractive', '-Command', `Get-CimInstance Win32_Process ${where}| ${SELECT}`]
}

function createdMs(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v !== 'string') return undefined
  const m = /\/Date\((-?\d+)\)\//.exec(v)
  if (m !== null) return Number(m[1])
  const t = Date.parse(v)
  return Number.isNaN(t) ? undefined : t
}

// Written the way the Mac's ps writes it: `node ...`, not the quoted full path.
export function plainCommand(commandLine: string, name: string): string {
  const line = commandLine.trim()
  if (line === '') return name.replace(/\.exe$/i, '')
  const m = /^"([^"]*)"\s*(.*)$/.exec(line) ?? /^(\S+)\s*(.*)$/.exec(line)
  if (m === null) return line
  const prog = (m[1] ?? '').split(/[\\/]/).pop()?.replace(/\.exe$/i, '') ?? ''
  const rest = m[2] ?? ''
  return rest === '' ? prog : `${prog} ${rest}`
}

export function parseWinProcs(out: string, nowMs: number): WinProc[] {
  const text = out.replace(/^\uFEFF/, '').trim()
  if (text === '') return []
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return []
  }
  const rows = Array.isArray(data) ? data : [data]
  const list: WinProc[] = []
  for (const r of rows) {
    if (typeof r !== 'object' || r === null) continue
    const o = r as Record<string, unknown>
    const pid = o.ProcessId
    const ppid = o.ParentProcessId
    const made = createdMs(o.CreationDate)
    if (typeof pid !== 'number' || !Number.isInteger(pid) || made === undefined) continue
    list.push({
      pid,
      ppid: typeof ppid === 'number' && Number.isInteger(ppid) ? ppid : 0,
      ageS: Math.max(0, Math.floor((nowMs - made) / 1000)),
      command: plainCommand(typeof o.CommandLine === 'string' ? o.CommandLine : '', typeof o.Name === 'string' ? o.Name : ''),
    })
  }
  return list
}

const norm = (p: string): string => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()

function namesPath(line: string, path: string): boolean {
  if (path === '') return false
  for (let at = line.indexOf(path); at >= 0; at = line.indexOf(path, at + 1)) {
    const before = at === 0 ? '' : (line[at - 1] ?? '')
    const after = line[at + path.length] ?? ''
    if (!/[\w.-]/.test(before) && (after === '' || /[/\s"']/.test(after))) return true
  }
  return false
}

// Stands in for the Mac's `lsof` working folder.
export function cwdsFromCommands(procs: readonly { pid: number; command: string }[], paths: readonly string[]): Map<number, string> {
  const known = paths.filter(p => p !== '').map(p => ({ p, n: norm(p) })).sort((a, b) => b.n.length - a.n.length)
  const map = new Map<number, string>()
  for (const proc of procs) {
    const line = norm(proc.command)
    const hit = known.find(k => namesPath(line, k.n))
    if (hit !== undefined) map.set(proc.pid, hit.p)
  }
  return map
}

export async function readWinProcs(run: Run, nowMs: number, pids?: readonly number[], ms = 8_000): Promise<WinProc[] | undefined> {
  try {
    const r = await run(winProcsArgv(pids), { timeoutMs: ms })
    return r.exitCode === 0 ? parseWinProcs(r.stdout, nowMs) : undefined
  } catch {
    return undefined
  }
}
