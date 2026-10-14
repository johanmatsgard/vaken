// The awake guard's Windows words in English; imports nothing.

export type AwakeSystem = 'posix' | 'win32'

export const WIN_KEEPING = 'Keeping the PC awake'
// Windows follows its own power settings when the lid closes.
export const WIN_LID_NOTE = 'Closing the lid may still sleep the PC (that follows your Windows power settings).'
export const WIN_NOTHING = 'Not keeping the PC awake now: nothing needs it'
export const WIN_NO_PROGRAM = 'PowerShell was not found, so the PC cannot be held awake.'
export const WIN_NO_START = 'Vaken could not keep this computer awake.'

export const WIN_TEXT = {
  head: 'Keep PC awake',
  off: "Off: vaken does not touch your PC's sleep. Turn it on: Settings > Agents, or type /vaken-help run awake on. It keeps the PC awake while a session works, and while you are away (a phone is connected, or a question waits), with a small hidden PowerShell program. It uses more battery.",
  on: 'While at least one session works, vaken keeps the PC awake: it starts a hidden PowerShell program that asks Windows not to sleep for 10 minutes, and renews it every 8. When nothing works, it stops the one it started.',
  missing: 'This does not work here: PowerShell was not found (it is part of Windows).',
  held: 'The PC is held awake',
}

export const WIN_DETAIL_WORK = 'Held the PC awake for 10 minutes, because {n}. It is renewed while they work.'
export const WIN_DETAIL_WHY = 'Held the PC awake for 10 minutes: {why}. It is renewed while that lasts.'

export const AWAKE_WIN_STRINGS: string[] = [WIN_KEEPING, WIN_LID_NOTE, WIN_NOTHING, WIN_NO_PROGRAM, WIN_NO_START]
