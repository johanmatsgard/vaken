// Agent cap: a soft limit on helper agents running at once across sessions. Pure rules and words.
import { roomLine } from './computer'
import type { Limiter, Room } from './computer'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'

// The stored word for Auto; a manual limit is stored as n2, n3 ...
export const CAP_AUTO = 'auto'
export function capMaxOf(raw: string | undefined): number {
  const m = /^n?(\d+)$/.exec(raw ?? '')
  const n = m === null ? 0 : Number(m[1])
  return n >= 1 ? n : Infinity
}
export const capIsAuto = (raw: string | undefined): boolean => !Number.isFinite(capMaxOf(raw))

export const CAP_WHAT = 'Warned about too many agents'
export const CAP_HOLD_WHAT = 'Held an extra agent'

export const AGENTCAP_SETTINGS: Setting[] = [
  {
    key: 'cap.mode',
    group: 'Agents',
    label: 'Agent cap',
    note: 'Warn or stop when too many agents run at once.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'warn', label: 'Warn' },
      { value: 'hold', label: 'Stop' },
    ],
    default: 'warn',
  },
  {
    key: 'cap.max',
    group: 'Agents',
    label: 'Most at once',
    note: 'Auto lets the computer decide; pick a number to set your own limit.',
    options: [
      { value: CAP_AUTO, label: 'Auto' },
      { value: 'n2', label: '2' },
      { value: 'n3', label: '3' },
      { value: 'n4', label: '4' },
      { value: 'n6', label: '6' },
      { value: 'n8', label: '8' },
      { value: 'n12', label: '12' },
    ],
    default: CAP_AUTO,
    // Old plain numbers: a stored '3' was the default and cannot be told from a pick, so it reads as Auto; any other number stays manual.
    legacy: { '2': 'n2', '3': CAP_AUTO, '4': 'n4', '6': 'n6', '8': 'n8' },
  },
]
export const AGENTCAP_HELP: HelpEntry[] = [{ title: 'How many agents can run at once?', text: 'Many agents at once slow your laptop and use your plan fast. By default vaken follows the computer: when the computer reading says it is full, Warn tells you and Stop stops the next one. You can set your own limit under Most at once, counted across all your sessions.' }]

// A closed session leaves its last count behind, so a count is trusted only this long.
export const COUNT_TTL_MS = 10 * 60_000
export type Count = { n: number; at: number }

export const parseCount = (raw: unknown): Count | undefined => {
  const o = raw as Count
  return typeof o === 'object' && o !== null && typeof o.n === 'number' && typeof o.at === 'number' ? o : undefined
}
export const totalRunning = (counts: (Count | undefined)[], now: number): number => counts.reduce((sum, c) => sum + (c !== undefined && now - c.at < COUNT_TTL_MS ? Math.max(0, c.n) : 0), 0)

type CapVerdict = { act: false } | { act: true; hold: boolean; reason: string }
export function capVerdict(mode: string, running: number, max: number): CapVerdict {
  if (mode === 'off' || running < max) return { act: false }
  const hold = mode === 'hold'
  return { act: true, hold, reason: hold ? `Vaken holds this agent: ${running} are already running (the limit is ${max}). Wait for one to finish, or ask the person to raise the limit in Settings > Agents.` : `${running} agents are already running (the limit is ${max}).` }
}

// Room is 0 when the Mac reports memory pressure, heat or low battery; with no fresh reading nothing happens.
const HARD_ROOM: readonly Limiter[] = ['pressure', 'heat', 'battery']
export function roomVerdict(mode: string, room: Room | undefined): CapVerdict {
  if (mode === 'off' || room === undefined || room.n > 0 || !HARD_ROOM.includes(room.by)) return { act: false }
  const hold = mode === 'hold'
  const why = roomLine(room).replace(/^Full: /, '')
  return { act: true, hold, reason: hold ? `Vaken holds this agent: the computer is full (${why}). Wait a while, or ask the person to turn the computer reading off in Settings > Agents.` : `The computer is full (${why}).` }
}
