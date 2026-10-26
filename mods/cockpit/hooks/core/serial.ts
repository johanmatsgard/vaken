// Safe adding to a shared value: the store has no compare-and-set, so writers of a key queue here and the value is re-read once after a write.
import type { Io } from './io'

const tails = new Map<string, Promise<unknown>>()

export function serialUpdate<T>(io: Io, key: string, change: (old: unknown) => T, kept?: (stored: unknown) => boolean): Promise<T> {
  const run = (tails.get(key) ?? Promise.resolve()).then(async () => {
    let latest = change(await io.get(key))
    await io.set(key, latest)
    if (kept !== undefined) {
      const again = await io.get(key)
      if (!kept(again)) {
        latest = change(again)
        await io.set(key, latest)
      }
    }
    return latest
  })
  const tail = run.then(
    () => undefined,
    () => undefined,
  )
  tails.set(key, tail)
  void tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key)
  })
  return run
}
