// The agent board (Settings > Agents): a true list of the helper agents that run under this machine's sessions.
import type { EngineInterface, On, Timer } from 'claude-code'

import { postBand } from '../core/band'
import { BOARD_KEY, STUCK_BAND, STUCK_BAND_ID, addAgentCost, boardRows, boardText, doneNotice, endAgent, flagStuck, markSessionUnknown, newlyEnded, parseBoard, startAgent, syncStatus, watchNeeded, withIdle } from '../core/agentboard'
import { tellNow } from '../core/tellme'
import { tr } from '../core/lang'
import { turnOf } from '../core/cost'
import type { AgentEntry, BoardRow, Idle, Status } from '../core/agentboard'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readSetting } from '../core/settings'
import { subArgs } from '../core/menu'
import { sayIn } from './saylang'
import { withStepTime, withToolTime } from '../core/agentsteps'
import type { StepTime } from '../core/agentsteps'

// IO-BLOCK-START
function io($: EngineInterface): Io {
  return withToastGate({
    now: () => $.clock.now(),
    home: () => homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }),
    sessionId: () => $.session.id(),
    get: key => $.store.get(key),
    set: (key, value) => $.store.set(key, value),
    del: key => $.store.delete(key),
    keys: () => $.store.keys(),
    read: path => $.fs.read(path),
    write: (path, text) => $.fs.write(path, text),
    run: (argv, init) => $.process.run(argv, init),
    ask: (question, options) => $.ui.ask(question, options),
    complete: req => $.model.complete(req),
    toast: text => $.ui.toast(text),
    invalidate: () => $.ui.invalidate('ui.render'),
  })
}
// IO-BLOCK-END

const boardOn = async (i: Io): Promise<boolean> => (await readSetting(i, 'agents.board')) === 'on'

const readList = async (i: Io): Promise<AgentEntry[]> => parseBoard(await i.get(BOARD_KEY))

const EARLY_MAX = 40
const early = new Map<string, { state: 'done' | 'failed'; at: number }>()
const earlyCost = new Map<string, { usd?: number; model?: string }>()

export async function noteCost(i: Io, key: string, usd: number | undefined, model?: string): Promise<void> {
  if (usd === undefined && model === undefined) return
  if (!(await boardOn(i))) return
  const list = await readList(i)
  const updated = addAgentCost(list, key, usd, model)
  if (updated !== list) {
    await i.set(BOARD_KEY, updated)
    i.invalidate()
    return
  }
  if (earlyCost.size >= EARLY_MAX) earlyCost.delete(earlyCost.keys().next().value as string)
  const had = earlyCost.get(key)
  earlyCost.set(key, { usd: usd === undefined ? had?.usd : (had?.usd ?? 0) + usd, model: had?.model ?? model })
}

export async function noteEnd(i: Io, key: string, state: 'done' | 'failed'): Promise<void> {
  if (!(await boardOn(i))) return
  const now = await i.now()
  const list = await readList(i)
  const updated = endAgent(list, key, state, now)
  if (updated !== list) {
    await i.set(BOARD_KEY, updated)
    i.invalidate()
    tellEnded(list, updated, await i.sessionId())
    return
  }
  if (!list.some(x => x.id === key || x.agentId === key)) {
    if (early.size >= EARLY_MAX) early.delete(early.keys().next().value as string)
    early.set(key, { state, at: now })
  }
}

// One done notice per ended helper of this session, through Tell me (its own gates: away, This session too, Quiet)
function tellEnded(before: AgentEntry[], after: AgentEntry[], session: string): void {
  for (const e of newlyEnded(before, after, session)) tellNow({ kind: 'done', text: doneNotice(e) })
}

// Teammates of this session that wait for a message: in memory only (the pane runs in this session), so a tool call only looks at a set and a draw reads no key
export const idleMem: { idle: Idle } = { idle: {} }
export async function noteIdle(i: Io, id: string, name: string | undefined): Promise<void> {
  if (name === undefined && idleMem.idle[id] === undefined) return
  idleMem.idle = withIdle(idleMem.idle, id, name, await i.now())
  i.invalidate()
}

// When each helper last made progress (a tool call of its own, or the end of a turn): in memory only
const PROGRESS_MAX = 60
const progress = new Map<string, number>()
export function noteProgress(agentId: string, at: number): void {
  progress.delete(agentId)
  progress.set(agentId, at)
  if (progress.size > PROGRESS_MAX) progress.delete(progress.keys().next().value as string)
}

export const hasProgress = (agentId: string): boolean => progress.has(agentId)

// Each agent's last answers: the tool names asked for, the time and the cost, in memory only. An opened Agents row pairs them with the steps it reads (core/agentsteps.ts).
export const stepTimes = new Map<string, StepTime[]>()
export function noteStepTime(agentId: string, step: StepTime): void {
  const had = stepTimes.get(agentId) ?? []
  stepTimes.delete(agentId)
  stepTimes.set(agentId, withStepTime(had, step))
  if (stepTimes.size > PROGRESS_MAX) stepTimes.delete(stepTimes.keys().next().value as string)
}
export function noteToolTime(agentId: string, ms: number): void {
  const had = stepTimes.get(agentId)
  if (had !== undefined) stepTimes.set(agentId, withToolTime(had, ms))
}

type SpawnFacts = { tool_use_id: string; subagentType: string; description: string; background: boolean; model?: string; isTeammate?: boolean; workflow?: unknown }
type SpawnAnswer = { deny?: string; agentId?: string; model?: string }

export async function noteStart(i: Io, facts: SpawnFacts, result: SpawnAnswer): Promise<void> {
  if (result.deny !== undefined || facts.isTeammate === true || facts.workflow !== undefined) return
  if (!(await boardOn(i))) return
  const now = await i.now()
  const agentId = result.agentId
  let list = startAgent(
    await readList(i),
    { id: facts.tool_use_id, agentId, session: await i.sessionId(), type: facts.subagentType, model: result.model ?? facts.model, description: facts.description, background: facts.background },
    now,
  )
  const seen = agentId === undefined ? undefined : early.get(agentId)
  if (agentId !== undefined && seen !== undefined) {
    early.delete(agentId)
    list = endAgent(list, agentId, seen.state, seen.at)
  }
  const cost = agentId === undefined ? undefined : earlyCost.get(agentId)
  if (agentId !== undefined && cost !== undefined) {
    earlyCost.delete(agentId)
    list = addAgentCost(list, agentId, cost.usd, cost.model)
  }
  await i.set(BOARD_KEY, list)
  i.invalidate()
}

export async function noteCall(i: Io, toolUseId: string, r: { deny?: string; isError?: boolean; result?: unknown }): Promise<void> {
  if (r.deny !== undefined) return
  const status = (r.result as { status?: string } | null | undefined)?.status
  if (r.isError === true) await noteEnd(i, toolUseId, 'failed')
  else if (status === 'completed') await noteEnd(i, toolUseId, 'done')
}

export async function noteSessionEnd(i: Io, sessionId: string): Promise<void> {
  const list = await readList(i)
  const marked = markSessionUnknown(list, sessionId)
  if (marked !== list) await i.set(BOARD_KEY, marked)
}

export async function loadBoard(i: Io, infos?: Status[]): Promise<BoardRow[]> {
  const now = await i.now()
  let list = await readList(i)
  if (infos !== undefined) {
    const synced = syncStatus(list, infos, now)
    if (synced !== list) {
      list = synced
      await i.set(BOARD_KEY, list)
    }
  }
  return boardRows(list, now)
}

// What this session's engine says about its helpers: id and status.
async function agentStatuses($: EngineInterface): Promise<Status[] | undefined> {
  try {
    const list = await $.agent.list()
    return list.map(a => ({ id: a.id, status: a.status }))
  } catch {
    return undefined
  }
}

// While a helper of this session runs, the engine's list is read every 10 s
const WATCH_MS = 10_000
let watchTimer: Timer | undefined

export async function watchBeat(i: Io, infos: Status[] | undefined): Promise<boolean> {
  const now = await i.now()
  const list = await readList(i)
  if (!watchNeeded(list, await i.sessionId(), now)) return false
  if (infos === undefined) return true
  const synced = syncStatus(list, infos, now)
  if (synced !== list) {
    await i.set(BOARD_KEY, synced)
    i.invalidate()
    tellEnded(list, synced, await i.sessionId())
  }
  await flagQuiet(i, synced, now)
  return watchNeeded(synced, await i.sessionId(), now)
}

async function flagQuiet(i: Io, list: AgentEntry[], now: number): Promise<void> {
  try {
    if (!(await boardOn(i))) return
    const flagged = flagStuck(list, progress, await i.sessionId(), now)
    if (flagged.list === list) return
    await i.set(BOARD_KEY, flagged.list)
    if (flagged.fresh > 0) await postBand(i, 'warn', STUCK_BAND_ID, tr(STUCK_BAND))
    i.invalidate()
  } catch {
  }
}

function startWatch($: EngineInterface): void {
  if (watchTimer !== undefined) return
  const timer = $.clock.every(WATCH_MS, () => {
    void (async () => {
      try {
        const statuses = await agentStatuses($)
        if (!(await watchBeat(io($), statuses))) {
          watchTimer?.cancel()
          watchTimer = undefined
        }
      } catch {
      }
    })()
  })
  watchTimer = timer
}

export async function boardTextFrom(i: Io, infos?: Status[]): Promise<string> {
  if (!(await boardOn(i))) return tr('The agent board is off. Turn it on in Settings > Agents.')
  return boardText(await loadBoard(i, infos), await i.now())
}

export function registerAgentBoard(on: On): void {
  on('session.start', { cwd: /(?<agentboard>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the command is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Nothing after next(e) may throw: the helper has started.
  on('agent.spawn', { subagentType: /(?<agentboard>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      await noteStart(io($), e, result)
      if (result.deny === undefined && result.agentId !== undefined) startWatch($)
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  // A throw after next(e) would run the tool twice.
  on('tool.call', { tool: /(?<agentboard>^Agent$)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      await noteCall(io($), e.tool_use_id, r)
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  // Only a time in memory is kept, so the main loop (no agentId) costs nothing
  on('tool.call', { tool: /(?<agentprogress>)/ }, async ($, e, next) => {
    const id = e.agentId
    if (id === undefined) return next(e)
    let before: number | undefined
    try {
      const at = await $.clock.now()
      before = at
      noteProgress(id, at)
      if (idleMem.idle[id] !== undefined) void noteIdle(io($), id, undefined).catch(() => undefined)
    } catch {
    }
    const r = await next(e)
    try {
      const after = await $.clock.now()
      noteProgress(id, after)
      if (before !== undefined) noteToolTime(id, after - before)
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  // An agent's answer: its time, its cost (an estimate from the engine's token counts) and the tool names it asked for, in memory only; the main loop costs nothing
  on('turn.step', { turnId: /(?<agentsteps>)/ }, async function* ($, e, next) {
    const id = e.agentId
    let before: number | undefined
    if (id !== undefined) {
      try {
        const at = await $.clock.now()
        before = at
      } catch {
      }
    }
    const r = yield* next(e)
    if (id === undefined || before === undefined) return r
    try {
      const after = await $.clock.now()
      noteStepTime(id, { tools: r.toolUses.map(u => u.name).join(','), ms: after - before, ...(r.usage === null ? {} : { usd: turnOf(r.usage, after, 0, true)?.usd }) })
    } catch {
    }
    return r
  })

  on('turn.complete', { turnId: /(?<agentboard>)/ }, async ($, e, next) => {
    if (e.agentId !== undefined) {
      try {
        const i = io($)
        noteProgress(e.agentId, await i.now())
        await noteCost(i, e.agentId, turnOf(e.usage, await i.now(), e.durationMs, true)?.usd, e.usage?.model)
        await noteEnd(i, e.agentId, e.reason === 'answer' ? 'done' : 'failed')
      } catch {
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The engine says a helper ended: its row ends now, not at the next look at the list (the list stays the fallback)
  on('classic.SubagentStop', { agent_type: /(?<agentdone>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      await noteIdle(i, e.agent_id, undefined)
      await noteEnd(i, e.agent_id, 'done')
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // A teammate finished a task of the team's list: one done notice with its name, never the task's words
  on('classic.TaskCompleted', { task_id: /(?<agentdone>)/ }, async ($, e, next) => {
    try {
      const name = e.teammate_name
      tellNow({ kind: 'done', text: name === undefined || name === '' ? tr('An agent finished a task.') : tr('{name} finished a task.').replace('{name}', name) })
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // A teammate waits for a message: after a while the Agents card offers one nudge
  on('classic.TeammateIdle', { teammate_name: /(?<agentidle>)/ }, async ($, e, next) => {
    try {
      await noteIdle(io($), e.agent_id ?? e.teammate_name, e.teammate_name)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { sessionId: /(?<agentboard>)/ }, async ($, e, next) => {
    try {
      await noteSessionEnd(io($), e.sessionId)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-tasks' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'agents-board')
    if (rest0 === undefined) return next(e)
    await sayIn(io($))
    try {
      const statuses = await agentStatuses($)
      return { text: await boardTextFrom(io($), statuses) }
    } catch {
      return { text: tr('The agent board could not read its list. Try again in a moment.') }
    }
  })
}
