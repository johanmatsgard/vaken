// Quiet timers: after QUIET_AFTER_MS without activity, repeating timers that ask here work at most once per QUIET_EVERY_MS; any activity restores them at once. Timers for an away person or that run only while agents run do not ask.

export const QUIET_AFTER_MS = 5 * 60_000
export const QUIET_EVERY_MS = 60_000

let activeAt: number | undefined
const ranAt = new Map<string, number>()

export function noteActive(now: number): void {
  if (activeAt === undefined || now > activeAt) activeAt = now
}

export function isQuietAt(now: number): boolean {
  if (activeAt === undefined) activeAt = now
  return now - activeAt >= QUIET_AFTER_MS
}

export function tickDue(name: string, now: number): boolean {
  const last = ranAt.get(name)
  if (isQuietAt(now) && last !== undefined && now - last >= 0 && now - last < QUIET_EVERY_MS) return false
  ranAt.set(name, now)
  return true
}

// Never throws.
export const quietly =
  (name: string, now: () => Promise<number>, work: () => unknown): (() => void) =>
  () => {
    void (async () => {
      if (tickDue(name, await now())) await work()
    })().catch(() => undefined)
  }
