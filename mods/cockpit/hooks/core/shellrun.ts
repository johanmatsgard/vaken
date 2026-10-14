// The argv that runs a person's script: `sh -c` on the Mac, PowerShell on Windows. The runtime has no shell, so the script is one argv item.
import type { ProcPlatform } from './procs'

export const WIN_SHELL = 'powershell'

export function shellArgv(sys: ProcPlatform, script: string): string[] {
  if (sys === 'win32') return [WIN_SHELL, '-NoProfile', '-NonInteractive', '-Command', script]
  return ['sh', '-c', script]
}

export const NO_SHELL = 'This needs a shell I could not find.'
export const IN_POWERSHELL = ' It runs in PowerShell.'

// The engine rejects with "failed to start: ENOENT ..." when the program is missing.
export const noShellError = (message: string): boolean => /failed to start|ENOENT/i.test(message)
