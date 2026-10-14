// Changing the disk on Windows through PowerShell, because the runtime has no file call for it. Pure: builds the argv and variables only.

export type WinFsOp = 'mkdir' | 'move' | 'copy' | 'rmtree' | 'rmfiles' | 'rmdir'

export const WIN_FS_PROGRAM = ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command'] as const
export const WIN_FS_VAR = 'COCKPIT_FS_'
export const WIN_FS_COUNT = 'COCKPIT_FS_N'

const HEAD = "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';"
// The folder itself must not be a link (reparse point), so a link swapped in at the top can never send the remove elsewhere.
export const WIN_FS_NOT_A_LINK = "$i=Get-Item -LiteralPath $env:COCKPIT_FS_0 -Force;if($i.Attributes -band [System.IO.FileAttributes]::ReparsePoint){exit 1};"
const NOT_A_LINK = WIN_FS_NOT_A_LINK

export const WIN_FS_SCRIPT: Readonly<Record<WinFsOp, string>> = {
  mkdir: `${HEAD}[void][System.IO.Directory]::CreateDirectory($env:COCKPIT_FS_0)`,
  move: `${HEAD}Move-Item -LiteralPath $env:COCKPIT_FS_0 -Destination $env:COCKPIT_FS_1 -Force`,
  copy: `${HEAD}if(-not(Test-Path -LiteralPath $env:COCKPIT_FS_0 -PathType Leaf)){exit 1};Copy-Item -LiteralPath $env:COCKPIT_FS_0 -Destination $env:COCKPIT_FS_1`,
  rmtree: `${HEAD}if(-not(Test-Path -LiteralPath $env:COCKPIT_FS_0)){exit 0};${NOT_A_LINK}Remove-Item -LiteralPath $env:COCKPIT_FS_0 -Recurse -Force`,
  rmfiles:
    `${HEAD}$bad=0;$n=[int]$env:COCKPIT_FS_N;for($k=0;$k -lt $n;$k++){$p=[System.Environment]::GetEnvironmentVariable('COCKPIT_FS_'+$k);` +
    `if([string]::IsNullOrEmpty($p)){$bad=1;continue};try{if(Test-Path -LiteralPath $p -PathType Container){$bad=1}elseif(Test-Path -LiteralPath $p){Remove-Item -LiteralPath $p -Force}}catch{$bad=1}};exit $bad`,
  rmdir: `${HEAD}${NOT_A_LINK}[System.IO.Directory]::Delete($env:COCKPIT_FS_0)`,
}

// A variable cannot hold a NUL, and no real path has other control characters.
export const winFsPathOk = (path: unknown): path is string => typeof path === 'string' && path !== '' && !/[\u0000-\u001f]/.test(path)

export function winFsCall(op: WinFsOp, paths: readonly string[]): { argv: string[]; env: Record<string, string> } | undefined {
  if (paths.length === 0 || !paths.every(winFsPathOk)) return undefined
  const env: Record<string, string> = { [WIN_FS_COUNT]: String(paths.length) }
  paths.forEach((p, k) => {
    env[`${WIN_FS_VAR}${k}`] = p
  })
  return { argv: [...WIN_FS_PROGRAM, WIN_FS_SCRIPT[op]], env }
}
