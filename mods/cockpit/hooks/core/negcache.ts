// A once-per-process answer that keeps only a success for good; a negative may be a hiccup, so it is asked again after NEGATIVE_RETRY_MS. The clock is passed in.
export const NEGATIVE_RETRY_MS = 300_000

export type Slot<T> = { p?: Promise<T>; failedAt?: number }

export function cachedAnswer<T>(slot: Slot<T>, make: () => Promise<T>, ok: (v: T) => boolean, now: number): Promise<T> {
  if (slot.p !== undefined && (slot.failedAt === undefined || now - slot.failedAt < NEGATIVE_RETRY_MS)) return slot.p
  const p = make()
  slot.p = p
  delete slot.failedAt
  const note = (good: boolean): void => {
    if (slot.p === p && !good) slot.failedAt = now
  }
  p.then(v => note(ok(v)), () => note(false))
  return p
}

export type Kept<V> = { value: V | undefined; at: number }
export function keptValue<V>(m: Map<string, Kept<V>>, key: string, now: number): { hit: boolean; value?: V } {
  const k = m.get(key)
  if (k === undefined) return { hit: false }
  if (k.value === undefined && now - k.at >= NEGATIVE_RETRY_MS) return { hit: false }
  return { hit: true, value: k.value as V }
}
