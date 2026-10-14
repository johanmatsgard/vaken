// Awake guard hold per system: `caffeinate` on the Mac, a hidden PowerShell child on Windows. The scripts are fixed text; only a clamped whole number of seconds goes in.
import { AWAKE_ABS_MAX_MS } from './awakeplan'
import { AWAKE_HOLD_S, AWAKE_START_ARGV, isOwnHold } from './crew3proc'
import { isProcessNamed, processName, stopPid } from './procs'
import type { Io } from './io'
import type { ProcPlatform } from './procs'

type Run = Io['run']

export const holdProgram = (sys: ProcPlatform): string => (sys === 'win32' ? 'powershell' : 'caffeinate')

// Written in decimal because Windows PowerShell reads 0x80000003 as a negative Int32.
export const WIN_ES_FLAGS = 2147483651

export const HOLD_MAX_S = AWAKE_ABS_MAX_MS / 1000
export function holdSeconds(s: number): number {
  if (!Number.isFinite(s) || s < 1) return AWAKE_HOLD_S
  return Math.min(Math.floor(s), HOLD_MAX_S)
}

// The C# text needs double quotes around the DLL name; [char]34 keeps the script free of quotes and backslashes through two command lines.
export const winHoldScript = (seconds: number): string =>
  "Add-Type -Name Hold -Namespace CockpitAwake -MemberDefinition ('[DllImport(' + [char]34 + 'kernel32.dll' + [char]34 + ')] public static extern uint SetThreadExecutionState(uint f);'); " +
  `[void][CockpitAwake.Hold]::SetThreadExecutionState([uint32]${WIN_ES_FLAGS}); Start-Sleep -Seconds ${holdSeconds(seconds)}`

// The child script sits in a single-quoted PowerShell text, so its single quotes are doubled.
export const winStartScript = (seconds: number): string =>
  `$p = Start-Process -FilePath powershell -WindowStyle Hidden -PassThru -ArgumentList '-NoProfile -NonInteractive -Command ${winHoldScript(seconds).replace(/'/g, "''")}'; Write-Output $p.Id`

export function awakeStartArgv(sys: ProcPlatform, seconds: number = AWAKE_HOLD_S): readonly string[] {
  if (sys !== 'win32') return AWAKE_START_ARGV
  return ['powershell', '-NoProfile', '-NonInteractive', '-Command', winStartScript(seconds)]
}

// Stops only vaken's own hold. A hidden Windows console program may refuse a plain `taskkill`, so it is forced if that id still runs PowerShell.
export async function stopOwnHold(run: Run, sys: ProcPlatform, pid: unknown, at: unknown, now: number, ms = 3_000): Promise<boolean> {
  const name = typeof pid === 'number' ? await processName(run, sys, pid, ms) : undefined
  if (!isOwnHold(pid, at, now, name, holdProgram(sys))) return false
  await stopPid(run, sys, pid, { ms })
  if (sys === 'win32' && (await isProcessNamed(run, sys, pid, 'powershell', ms))) await stopPid(run, sys, pid, { force: true, ms })
  return true
}
