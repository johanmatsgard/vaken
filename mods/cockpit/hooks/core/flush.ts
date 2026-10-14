// Write-behind for hot notes. The store rewrites its whole file on every write, so frequently changing notes live in memory and are saved at most every SAVE_EVERY_MS. A write another session or a safety decision must see at once goes straight to the store.
import type { Io } from './io'

export const SAVE_EVERY_MS = 5_000
export const OWN_SAVE_EVERY_MS = 30_000

export type Pace = 'now' | 'soon' | 'own' | 'ride'
const WAIT: Record<Pace, number> = { now: 0, soon: SAVE_EVERY_MS, own: OWN_SAVE_EVERY_MS, ride: Number.POSITIVE_INFINITY }

export type Later = (ms: number, run: () => void) => unknown

type Note = { io: Io; value: unknown; json: string; saved: string | undefined; savedAt: number; due: number | undefined; isRide: boolean }
const notes = new Map<string, Note>()
let later: Later | undefined
let armedAt: number | undefined
// Saves wait for each other, so two saves of one key land in order.
let saving: Promise<unknown> = Promise.resolve()

export function useLater(run: Later | undefined): void {
  later = run
  if (run === undefined) armedAt = undefined
}

const copyOf = (json: string): unknown => JSON.parse(json) as unknown

export async function readNote(i: Io, key: string): Promise<unknown> {
  const n = notes.get(key)
  return n === undefined ? i.get(key) : copyOf(n.json)
}

export async function holdNote(i: Io, key: string, value: unknown, pace: Pace): Promise<void> {
  const json = JSON.stringify(value) ?? 'null'
  const old = notes.get(key)
  const wasClean = old === undefined || old.saved === old.json || old.isRide
  const n: Note = { io: i, value: copyOf(json), json, saved: old?.saved, savedAt: old?.savedAt ?? Number.NEGATIVE_INFINITY, due: old?.due, isRide: pace === 'ride' && wasClean && old !== undefined }
  notes.set(key, n)
  if (n.saved === json) {
    n.due = undefined
    return
  }
  const wait = later === undefined ? 0 : WAIT[pace]
  if (wait === Number.POSITIVE_INFINITY) return
  const now = await i.now()
  if (now - n.savedAt >= wait || now < n.savedAt) return save([key], now, true)
  const due = n.savedAt + wait
  n.due = n.due === undefined ? due : Math.min(n.due, due)
  arm(now)
}

export async function flushNotes(withRides = true): Promise<void> {
  const keys = [...notes.entries()].filter(([, n]) => n.saved !== n.json && (withRides || !n.isRide)).map(([k]) => k)
  if (keys.length === 0) return
  const first = notes.get(keys[0] ?? '')
  const now = first === undefined ? 0 : await first.io.now().catch(() => 0)
  await save(keys, now, false).catch(() => undefined)
}

export function forgetNote(key: string): void {
  notes.delete(key)
}

export const waitingNotes = (): string[] => [...notes.entries()].filter(([, n]) => n.saved !== n.json).map(([k]) => k)

function save(keys: string[], now: number, isLoud: boolean): Promise<void> {
  const run = saving.then(async () => {
    for (const key of keys) {
      const n = notes.get(key)
      if (n === undefined) continue
      n.due = undefined
      n.isRide = false
      if (n.saved === n.json) continue
      const json = n.json
      const before = { saved: n.saved, savedAt: n.savedAt }
      n.saved = json
      n.savedAt = now
      try {
        await n.io.set(key, copyOf(json))
      } catch (err) {
        if (notes.get(key) === n && n.saved === json) Object.assign(n, before)
        if (isLoud) throw err
      }
    }
  })
  saving = run.catch(() => undefined)
  return run
}

function arm(now: number): void {
  if (later === undefined) return
  const dues = [...notes.values()].map(n => n.due).filter((d): d is number => d !== undefined)
  if (dues.length === 0) return
  const due = Math.min(...dues)
  if (armedAt !== undefined && armedAt <= due && armedAt >= now) return
  armedAt = due
  later(Math.max(0, due - now), () => {
    if (armedAt === due) armedAt = undefined
    void fire()
  })
}

async function fire(): Promise<void> {
  try {
    const first = [...notes.values()].filter(n => n.due !== undefined).sort((a, b) => (a.due ?? 0) - (b.due ?? 0))[0]
    if (first === undefined) return
    const now = await first.io.now()
    const keys = [...notes.entries()].filter(([, n]) => n.due !== undefined && n.due <= now).map(([k]) => k)
    if (keys.length > 0) await save(keys, now, false)
    arm(now)
  } catch {
    // the next change, turn end or session end saves it
  }
}
