// Pure parts shared by the Guard feature files. Each feature file keeps its own `io($)` block, since the validator follows `$` only inside the file that holds it.
import type { Mode } from './guard'
import type { Io } from './io'
import { readSetting } from './settings'

export const guardMode = async (i: Io, settingKey: string): Promise<Mode> => (await readSetting(i, settingKey)) as Mode

export function argsOf(e: unknown): Record<string, unknown> {
  const args = { ...(e as Record<string, unknown>) }
  delete args.tool
  delete args.tool_use_id
  delete args.agentId
  return args
}

// The new keys are added at once, so the same finding is reported once.
export function takeFresh<T>(seen: Set<string>, list: T[], keyOf: (x: T) => string): T[] {
  const fresh = list.filter(x => !seen.has(keyOf(x)))
  for (const x of fresh) seen.add(keyOf(x))
  return fresh
}
