// The opened Agents row's last steps: read at the press, kept in memory only while that row is open, forgotten when it shuts or another line opens.
import { lastSteps } from '../../core/agentsteps'
import type { StepsState } from '../../core/agentsteps'
import { t } from '../../core/lang'
import { AGENT_STEPS_SHOW } from '../../ui/tokens'
import { stepTimes } from '../agentboard'
import type { HomeEngine } from './engine'

export const stepsMem: { key?: string; state?: StepsState } = {}

export function forgetSteps(): void {
  stepsMem.key = undefined
  stepsMem.state = undefined
}

// `mine`: the agent belongs to this session (only this session can read its messages). Nothing of what is read is stored.
export async function readSteps(eng: HomeEngine, key: string, agentId: string | undefined, mine: boolean): Promise<void> {
  stepsMem.key = key
  if (!mine || agentId === undefined || eng.agentMessages === undefined) {
    stepsMem.state = { kind: mine ? 'unreadable' : 'elsewhere' }
    eng.io().invalidate()
    return
  }
  stepsMem.state = { kind: 'reading' }
  eng.io().invalidate()
  let state: StepsState
  try {
    const got = await eng.agentMessages(agentId)
    state = Array.isArray(got) ? { kind: 'steps', steps: lastSteps(got, stepTimes.get(agentId) ?? [], AGENT_STEPS_SHOW, t) } : { kind: 'unreadable' }
  } catch {
    state = { kind: 'unreadable' }
  }
  // The row shut or another opened while it read: nothing is kept
  if (stepsMem.key !== key) return
  stepsMem.state = state
  eng.io().invalidate()
}
