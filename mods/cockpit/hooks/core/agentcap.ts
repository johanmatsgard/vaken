// Agent cap: a soft limit on helper agents running at once across sessions. Pure rules and words.
import { roomLine } from './computer'
import { moneyEn } from './prices'
import type { Limiter, Room } from './computer'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { reviewForSpawn, taskForSpawn } from './orchestra'
import type { Run } from './orchestra'

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
  // The spend cap's one figure: no row of its own (Agent cap's Warn or Stop governs it); /vaken-settings cap.spend sets it once
  {
    key: 'cap.spend',
    group: 'Agents',
    label: 'Most spend per request',
    note: 'Agents stop starting once one request has cost this much.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'n2', label: '$2' },
      { value: 'n5', label: '$5' },
      { value: 'n10', label: '$10' },
      { value: 'n20', label: '$20' },
      { value: 'n50', label: '$50' },
    ],
    default: 'n10',
    hidden: true,
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

// Helper caps: how deep agents may start agents, and how much one request may spend before no new agent starts.
// Depth 1 is an agent the session started; depth 2 an agent that agent started. Deeper is refused.
export const DEPTH_MAX = 2
export const CAP_DEPTH_WHAT = 'Stopped an agent that went too deep'
export const CAP_SPEND_WHAT = 'Stopped an agent: the request spent its limit'
export const CAP_SPEND_BAND = 'Agent stopped: this request reached its spend limit. Your next message lifts it.'
export const CAP_DEPTH_BAND = 'Agent stopped: agents went too deep. Agent cap in Settings lifts it.'
// The cap's figure in dollars; Infinity when off or unknown
export const spendMaxOf = capMaxOf

// A spawn the task runner raised (it has its own budget, so the per-request spend cap leaves it alone). Two ways in: a plugin's own call (`$.agent.spawn`; the model's and the person's spawns have the engine as origin),
// and a helper Claude starts for a run in the "ask Claude" route, found by the run's waiting task (its code or "Task n"). Reads the run only; never the prompt's words beyond that code.
export const isRunnerSpawn = (originPlugin: string, run: Run | undefined, spawn: { description: string; prompt: string }): boolean =>
  originPlugin !== 'engine' || (run !== undefined && run.via === 'claude' && (reviewForSpawn(run, spawn.prompt) !== undefined || taskForSpawn(run, spawn.description, spawn.prompt) !== undefined))

// The agent's depth: 1 plus its parent's, walked through the session's agent list (`parents`: agent id to its parent's id). An unknown parent counts as one level.
export function depthOf(parentAgentId: string | undefined, parents: ReadonlyMap<string, string | undefined>): number {
  let depth = 1
  let at = parentAgentId
  const seen = new Set<string>()
  while (at !== undefined && !seen.has(at)) {
    seen.add(at)
    depth += 1
    at = parents.get(at)
  }
  return depth
}

export function depthVerdict(mode: string, depth: number): CapVerdict {
  if (mode === 'off' || depth <= DEPTH_MAX) return { act: false }
  const hold = mode === 'hold'
  return { act: true, hold, reason: hold ? `Vaken stopped this agent: it would be ${depth} levels deep, and agents may start agents only ${DEPTH_MAX} levels deep. Do this step yourself, or ask the person to set Agent cap to Warn in Settings > Agents.` : `This agent is ${depth} levels deep (agents start agents). The cap is ${DEPTH_MAX} levels.` }
}

// `spent`: dollars this request has cost so far (the session's cost since the person's last prompt)
export function spendVerdict(mode: string, spent: number | undefined, max: number): CapVerdict {
  if (mode === 'off' || spent === undefined || !Number.isFinite(max) || spent < max) return { act: false }
  const hold = mode === 'hold'
  const got = moneyEn(spent)
  const limit = moneyEn(max)
  return { act: true, hold, reason: hold ? `Vaken stopped this agent: this request has cost ${got}, and the limit is ${limit} a request. Finish with the agents that run, or ask the person to raise the limit (/vaken-settings cap.spend) or set Agent cap to Warn in Settings > Agents.` : `This request has cost ${got}; the agent spend limit is ${limit} a request.` }
}
