// Windows: the process list for the orphan finder and port holders, and the working folder of each: read from the program itself, else guessed from its command line.
import { resolveProgram } from './procs'
import type { Io } from './io'

type Run = Io['run']

export type WinProc = { pid: number; ppid: number; ageS: number; command: string }

const NAME_FILTER = '^(node|nodejs|pythonw?[0-9.]*|py|vite|next|next-server|webpack|webpack-dev-server|esbuild|tsc)\\.exe$'

const SELECT = 'Select-Object ProcessId,ParentProcessId,Name,CreationDate,CommandLine | ConvertTo-Json -Compress' // en-only: PowerShell program that reads the processes

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

// The fallback for the Mac's `lsof` working folder when the real one cannot be read.
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

// The real working folder of another program, as the Mac's `lsof -d cwd` gives it: read from the program's memory (its PEB), read-only, own programs only,
// no admin. Only a 64-bit PowerShell reading a 64-bit program; a 32-bit program, a protected one, another user's and any failure are left out.
// The C# needs double quotes around DLL names; `~` stands for them and is swapped for [char]34, so the script has no double quote or backslash.
const CWD_CS =
  'using System; using System.Text; using System.Runtime.InteropServices; using System.Security.Principal; ' + // en-only: C# source of the folder reader
  'namespace CockpitCwd { public static class Reader { ' + // en-only: C# source of the folder reader
  '[DllImport(~kernel32.dll~)] static extern IntPtr OpenProcess(int a, bool i, int p); ' + // en-only: C# source of the folder reader
  '[DllImport(~kernel32.dll~)] static extern bool CloseHandle(IntPtr h); ' + // en-only: C# source of the folder reader
  '[DllImport(~kernel32.dll~)] static extern bool IsWow64Process(IntPtr h, out bool w); ' + // en-only: C# source of the folder reader
  '[DllImport(~kernel32.dll~)] static extern bool ReadProcessMemory(IntPtr h, IntPtr a, byte[] b, IntPtr n, out IntPtr r); ' + // en-only: C# source of the folder reader
  '[DllImport(~advapi32.dll~)] static extern bool OpenProcessToken(IntPtr h, int a, out IntPtr t); ' + // en-only: C# source of the folder reader
  '[DllImport(~ntdll.dll~)] static extern int NtQueryInformationProcess(IntPtr h, int c, byte[] b, int n, out int r); ' + // en-only: C# source of the folder reader
  'static bool Rd(IntPtr h, long a, byte[] b) { IntPtr r; return a != 0 && ReadProcessMemory(h, new IntPtr(a), b, new IntPtr(b.Length), out r) && r.ToInt64() == b.Length; } ' + // en-only: C# source of the folder reader
  'static bool Mine(IntPtr h) { IntPtr t; if (!OpenProcessToken(h, 8, out t)) return false; ' + // en-only: C# source of the folder reader
  'try { using (WindowsIdentity w = new WindowsIdentity(t)) using (WindowsIdentity me = WindowsIdentity.GetCurrent()) { return w.User != null && w.User.Equals(me.User); } } finally { CloseHandle(t); } } ' + // en-only: C# source of the folder reader
  'public static string Get(int pid) { IntPtr h = OpenProcess(0x410, false, pid); if (h == IntPtr.Zero) return null; ' + // en-only: C# source of the folder reader
  'try { bool w; if (!IsWow64Process(h, out w) || w || !Mine(h)) return null; ' + // en-only: C# source of the folder reader
  'byte[] pbi = new byte[48]; int got; if (NtQueryInformationProcess(h, 0, pbi, 48, out got) != 0) return null; ' + // en-only: C# source of the folder reader
  'byte[] p8 = new byte[8]; if (!Rd(h, BitConverter.ToInt64(pbi, 8) + 0x20, p8)) return null; ' + // en-only: C# source of the folder reader
  'byte[] us = new byte[16]; if (!Rd(h, BitConverter.ToInt64(p8, 0) + 0x38, us)) return null; ' + // en-only: C# source of the folder reader
  'int len = BitConverter.ToUInt16(us, 0); if (len == 0 || len % 2 != 0) return null; ' + // en-only: C# source of the folder reader
  'byte[] s = new byte[len]; if (!Rd(h, BitConverter.ToInt64(us, 8), s)) return null; return Encoding.Unicode.GetString(s); ' + // en-only: C# source of the folder reader
  '} finally { CloseHandle(h); } } } }' // en-only: C# source of the folder reader

// Only whole numbers above 1 (0 and 4 are the system), each once.
export const cwdPids = (pids: readonly number[]): number[] => [...new Set(pids.filter(n => Number.isInteger(n) && n > 4 && n <= 0xffffffff))]

export function winCwdScript(pids: readonly number[]): string {
  const ids = cwdPids(pids)
  return (
    "if (-not [Environment]::Is64BitProcess) { '{}'; exit 0 }; $q = [string][char]34; " + // en-only: PowerShell script of the folder reader
    `Add-Type -TypeDefinition ('${CWD_CS}' -replace '~', $q); $o = @{}; ` + // en-only: PowerShell script of the folder reader
    `foreach ($i in @(${ids.join(',')})) { try { $c = [CockpitCwd.Reader]::Get($i); if ($c) { $o[[string]$i] = $c } } catch {} }; ` + // en-only: PowerShell script of the folder reader
    '$o | ConvertTo-Json -Compress' // en-only: PowerShell script of the folder reader
  )
}

export const winCwdsArgv = (pids: readonly number[]): string[] => [resolveProgram('powershell', 'win32'), '-NoProfile', '-NonInteractive', '-Command', winCwdScript(pids)]

// `C:\work\app\` becomes `C:\work\app`; a drive root keeps its backslash.
export function parseWinCwds(out: string): Map<number, string> {
  const map = new Map<number, string>()
  let data: unknown
  try {
    data = JSON.parse(out.replace(/^\uFEFF/, '').trim())
  } catch {
    return map
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return map
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    const pid = Number(k)
    if (!/^\d+$/.test(k) || !Number.isInteger(pid) || pid <= 4 || typeof v !== 'string') continue
    const path = v.replace(/[\\/]+$/, '')
    if (/^[A-Za-z]:$/.test(path)) map.set(pid, `${path}\\`)
    else if (/^[A-Za-z]:[\\/]/.test(path) || /^[\\/]{2}[^\\/]/.test(path)) map.set(pid, path)
  }
  return map
}

// Never throws; an empty map when nothing could be read.
export async function readWinCwds(run: Run, pids: readonly number[], ms = 8_000): Promise<Map<number, string>> {
  if (cwdPids(pids).length === 0) return new Map()
  try {
    const r = await run(winCwdsArgv(pids), { timeoutMs: ms })
    return r.exitCode === 0 ? parseWinCwds(r.stdout) : new Map()
  } catch {
    return new Map()
  }
}

// The real folder first; the guess from the command line only for a program whose folder could not be read.
export function mergeCwds(real: ReadonlyMap<number, string>, guess: ReadonlyMap<number, string>): Map<number, string> {
  const map = new Map(real)
  for (const [pid, cwd] of guess) if (!map.has(pid)) map.set(pid, cwd)
  return map
}

// The real folder of each program, with the command-line guess as the fallback.
export async function winCwds(run: Run, procs: readonly { pid: number; command: string }[], paths: readonly string[], ms = 8_000): Promise<Map<number, string>> {
  const real = procs.length === 0 ? new Map<number, string>() : await readWinCwds(run, procs.map(p => p.pid), ms)
  return mergeCwds(real, cwdsFromCommands(procs, paths))
}

export async function readWinProcs(run: Run, nowMs: number, pids?: readonly number[], ms = 8_000): Promise<WinProc[] | undefined> {
  try {
    const r = await run(winProcsArgv(pids), { timeoutMs: ms })
    return r.exitCode === 0 ? parseWinProcs(r.stdout, nowMs) : undefined
  } catch {
    return undefined
  }
}
