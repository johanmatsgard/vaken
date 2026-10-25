// This session's share of the 5-hour window, an estimate: the cost each session spent since the window began, as a part of the limit used. Pure.
// Vaken cannot read the limit per session; the cost share is the nearest fact it has. Spending is taken as even over a session's life where no reading says otherwise.

export type CostFact = { id: string; startedAt: number; updatedAt: number; costUsd: number }
export type AgentCost = { session: string; startedAt: number; endedAt?: number; usd?: number }
export type WindowShare = { here: number; agents: number }

const FIVE_HOURS_MS = 5 * 3_600_000

// The part of a total spent between `from` and `now`, the life of the spend running from `start` to `end`
const evenPart = (usd: number, start: number, end: number, from: number): number => (end <= from ? 0 : start >= from || end <= start ? usd : (usd * (end - from)) / (end - start))

// The readings of this session (time, total so far): the spend since the window began, from the last reading before it
function fromSamples(samples: ReadonlyArray<readonly [number, number]>, from: number, startedAt: number, usd: number): number | undefined {
  const before = samples.filter(([t]) => t <= from).at(-1)
  if (before !== undefined) return Math.max(0, usd - before[1])
  return startedAt >= from ? usd : undefined
}

// Points of the limit (`percent` used of the window) for this session and its agents; undefined when nothing was spent in the window
export function windowShare(f: { resetsAt: number; now: number; percent: number; costs: readonly CostFact[]; hereId: string; hereSamples?: ReadonlyArray<readonly [number, number]>; agents: readonly AgentCost[] }): WindowShare | undefined {
  const from = f.resetsAt - FIVE_HOURS_MS
  if (from >= f.now || f.resetsAt <= f.now || f.percent <= 0) return undefined
  const spent = (c: CostFact): number => (c.id === f.hereId && f.hereSamples !== undefined ? fromSamples(f.hereSamples, from, c.startedAt, c.costUsd) : undefined) ?? evenPart(c.costUsd, c.startedAt, c.updatedAt, from)
  const total = f.costs.reduce((sum, c) => sum + spent(c), 0)
  const here = f.costs.find(c => c.id === f.hereId)
  if (total <= 0 || here === undefined) return undefined
  const mine = spent(here)
  const agents = f.agents.filter(a => a.session === f.hereId && a.usd !== undefined).reduce((sum, a) => sum + evenPart(a.usd ?? 0, a.startedAt, a.endedAt ?? f.now, from), 0)
  return { here: (f.percent * mine) / total, agents: (f.percent * Math.min(agents, mine)) / total }
}
