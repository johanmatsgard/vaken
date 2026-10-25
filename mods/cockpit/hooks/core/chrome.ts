// Which browser to run, and how, per system. Pure: plain values and closures, never `$`.
// Windows runs Chrome (else Edge) directly: both write the picture in about a second and then end on their own.
import { CHROME, chromeProbe, wrapArgv, wrapLimitMs } from './eyes'
import type { Io } from './io'
import type { ProcPlatform } from './procs'
import { platformOfIo } from './procs'

export type WinEnv = { programFiles?: string; programFilesX86?: string; localAppData?: string }

const CHROME_REL = '\\Google\\Chrome\\Application\\chrome.exe'
const EDGE_REL = '\\Microsoft\\Edge\\Application\\msedge.exe'

export function chromeCandidates(plat: ProcPlatform, env: WinEnv = {}): string[] {
  if (plat !== 'win32') return [CHROME]
  const at = (base: string | undefined, rel: string): string[] => (base ? [`${base.replace(/[\\/]+$/, '')}${rel}`] : [])
  return [...at(env.programFiles, CHROME_REL), ...at(env.programFilesX86, CHROME_REL), ...at(env.localAppData, CHROME_REL), ...at(env.programFilesX86, EDGE_REL), ...at(env.programFiles, EDGE_REL)]
}

export async function firstExisting(candidates: readonly string[], exists: (path: string) => Promise<boolean>): Promise<string | undefined> {
  for (const c of candidates) {
    try {
      if (await exists(c)) return c
    } catch {
      // not there, or not askable: next one
    }
  }
  return undefined
}

type Bound = { exists: (path: string) => Promise<boolean>; env: () => Promise<WinEnv> }
const bound = new WeakMap<object, Bound>()
export function bindChrome<T extends object>(io: T, b: Bound): T {
  bound.set(io, b)
  return io
}

export async function findChrome(io: Pick<Io, 'run'>): Promise<string | undefined> {
  const plat = await platformOfIo(io)
  if (plat !== 'win32') {
    try {
      return (await io.run(chromeProbe(), { timeoutMs: 5_000 })).exitCode === 0 ? CHROME : undefined
    } catch {
      return undefined
    }
  }
  const b = bound.get(io)
  if (b === undefined) return undefined
  return firstExisting(chromeCandidates(plat, await b.env().catch(() => ({}))), b.exists)
}


const WIN_PS_SCRIPT = "Get-CimInstance Win32_Process | Where-Object { $_.Name -in 'chrome.exe','msedge.exe' } | ForEach-Object { \"$($_.ProcessId) $($_.CommandLine)\" }" // en-only: a PowerShell program, not a text
export const WIN_PS_ARGV: readonly string[] = ['powershell', '-NoProfile', '-NonInteractive', '-Command', WIN_PS_SCRIPT]
// PowerShell takes a moment to start.
export const WIN_LIST_MS = 15_000
export const psArgvOf = (plat: ProcPlatform): readonly string[] => (plat === 'win32' ? WIN_PS_ARGV : ['ps', '-axo', 'pid,command'])
export const sleepArgvOf = (plat: ProcPlatform): string[] => (plat === 'win32' ? ['powershell', '-NoProfile', '-NonInteractive', '-Command', 'Start-Sleep -Seconds 1'] : ['sleep', '1']) // en-only: a program, not a text


// On Windows the output goes to `<profile>/<outName>` and `.err` so callers read the same files. Never throws.
export async function runChrome(io: Pick<Io, 'run' | 'write'>, profile: string, outName: string, mark: string, quarters: number, args: readonly string[]): Promise<boolean> {
  const ms = wrapLimitMs(quarters)
  try {
    if ((await platformOfIo(io)) !== 'win32') return (await io.run(wrapArgv(`${profile}/${outName}`, mark, quarters, args), { timeoutMs: ms })).exitCode === 0
    const chrome = await findChrome(io)
    if (chrome === undefined) return false
    const r = await io.run([chrome, ...args], { timeoutMs: ms })
    await io.write(`${profile}/${outName}`, r.stdout)
    await io.write(`${profile}/${outName}.err`, r.stderr)
    return true
  } catch {
    return false
  }
}
