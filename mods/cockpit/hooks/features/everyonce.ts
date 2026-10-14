// One timer per name.
import type { Timer } from 'claude-code'

const held = new Map<string, Timer>()
export function armOnce(name: string, timer: Timer): Timer {
  const old = held.get(name)
  held.set(name, timer)
  if (old !== undefined && old !== timer) old.cancel()
  return timer
}
