// Words of the Windows command findings per rule id: what it does, what could go wrong, and a stronger risk for deletes aimed at a drive or system folder. English stays here; other languages are in the text table.
import type { Lang } from '../i18n/types'
import { tIn } from '../i18n/t'

export type WinText = { what: string; risk: string; riskRoot?: string }

export const WIN_EN: Record<string, WinText> = {
  'curl-sh': { what: 'Downloads a script and runs it at once', risk: 'You cannot read what it does before it runs.' },
  'decoded-sh': { what: 'Decodes hidden text and runs it as a script at once', risk: 'You cannot read what it does before it runs.' },
  'rg-pre': { what: 'Searches with rg --pre, which runs a program on every file it searches', risk: 'That program can do anything, and it runs once for each file.' },
  'win-delete': {
    what: 'Permanently deletes',
    risk: 'Deleting from the command line skips the Recycle Bin, so there is no undo.',
    riskRoot: 'That is a whole drive, your user folder or a Windows system folder. Deleting skips the Recycle Bin, so there is no undo.',
  },
  'win-format': { what: 'Formats or wipes a disk or partition', risk: 'Everything on it is erased.' },
  'win-wipe': { what: 'Overwrites the free space on a drive', risk: 'It takes a long time and removes the traces of deleted files for good.' },
  'win-backup': { what: 'Deletes Windows backups or restore points', risk: 'You can no longer go back to an earlier state of the computer.' },
  'win-registry': { what: 'Changes the Windows registry', risk: 'A wrong change can stop Windows or programs from starting. There is no undo.' },
  'win-iex': { what: 'Runs text as a command (Invoke-Expression)', risk: 'What it runs is not visible before it runs.' },
  'win-encoded': { what: 'Runs a hidden, encoded PowerShell command', risk: 'You cannot read what it does before it runs.' },
  'win-permissions': { what: 'Changes who may use files or folders', risk: 'A wrong setting can lock you out of your own files or open them to everyone.' },
  'win-system': { what: 'Changes a Windows system setting', risk: 'It can change how the whole computer starts, runs or is protected.' },
  'win-kill': { what: 'Force-ends programs', risk: 'Unsaved work in them is lost, and a broad name can end more than you meant.' },
  'win-write-protected': { what: 'Writes to or moves things in a protected Windows folder', risk: 'It can break Windows or programs, and the change may be hard to find.' },
  'win-sync': { what: 'Mirrors one folder over another and deletes the extra files in it', risk: 'Files that only exist in the target folder are deleted (robocopy /mir).' },
  'win-download': { what: 'Downloads or runs something with a system tool', risk: 'You cannot read what it is before it runs.' },
  'win-elevate': { what: 'Runs with administrator rights', risk: 'It can change anything on the computer.' },
  'win-dynamic': { what: 'Runs a program whose name is only known when it runs', risk: 'Vaken cannot tell what it will do.' },
  'win-unparsed': { what: 'Runs a Windows command vaken could not read', risk: 'It may delete or change things. Check it before it runs.' },
}

const winKey = (id: string, field: 'what' | 'risk' | 'riskRoot'): string => `winwords.${id.replace(/[^a-z0-9]+/g, '_')}_${field.toLowerCase()}`
export function winText(lang: Lang, id: string): WinText | undefined {
  const w = Object.hasOwn(WIN_EN, id) ? WIN_EN[id] : undefined
  if (w === undefined || lang === 'en') return w
  return { what: tIn(lang, winKey(id, 'what')), risk: tIn(lang, winKey(id, 'risk')), ...(w.riskRoot === undefined ? {} : { riskRoot: tIn(lang, winKey(id, 'riskRoot')) }) }
}
