// Watch a session: "Tell me when done" gives one toast and one band line when that session's turn ends or its tests pass, then forgets the watch.
import type { Io } from './io'
import type { DoneFacts } from './sessionfacts'
import { doneLine } from './sessionfacts'
import { tLine } from '../i18n/t'

export const WATCH_PREFIX = 'cockpit:watch:'
export const watchKey = (sessionId: string): string => `${WATCH_PREFIX}${sessionId}`
export const WATCH_MAX = 8
export const WATCH_BAND_MS = 10 * 60_000
export const WATCH_BAND_ID = 'watch'

export type Watch = { name: string; at: number; sawWorking: boolean }
export type Watches = Record<string, Watch>

export function parseWatches(raw: unknown): Watches {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Watches = {}
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const w = v as Partial<Watch> | null
    if (w !== null && typeof w === 'object' && typeof w.name === 'string' && typeof w.at === 'number') out[id] = { name: w.name, at: w.at, sawWorking: w.sawWorking === true }
  }
  return out
}

// A new watch past WATCH_MAX pushes out the oldest.
export function withWatch(w: Watches, id: string, isOn: boolean, name: string, at: number, isWorking: boolean): Watches {
  const out: Watches = { ...w }
  delete out[id]
  if (!isOn) return out
  out[id] = { name, at, sawWorking: isWorking }
  const ids = Object.keys(out).sort((a, b) => out[a].at - out[b].at)
  while (ids.length > WATCH_MAX) delete out[ids.shift() as string]
  return out
}

export type WatchRow = { id: string; name: string; kind: string; done?: DoneFacts }
export type Fired = { id: string; text: string }

export function watchStep(w: Watches, rows: readonly WatchRow[], now: number): { fired: Fired[]; next: Watches } {
  const fired: Fired[] = []
  const updated: Watches = {}
  for (const [id, watch] of Object.entries(w)) {
    const row = rows.find(r => r.id === id)
    if (row === undefined) {
      fired.push({ id, text: tLine('needs.name_ended', { name: watch.name }) })
      continue
    }
    const facts = doneLine(row.done)
    const testsPassed = row.done?.tests === 'passed' && (row.done.testsAt ?? 0) >= watch.at && now >= watch.at
    if (watch.sawWorking && (row.kind === 'waiting' || row.kind === 'idle')) {
      fired.push({ id, text: facts === undefined ? tLine('needs.name_finished', { name: row.name }) : tLine('needs.name_finished_facts', { name: row.name, facts }) })
      continue
    }
    if (testsPassed) {
      fired.push({ id, text: tLine('needs.name_tests_passed', { name: row.name }) })
      continue
    }
    updated[id] = { ...watch, name: row.name, sawWorking: watch.sawWorking || row.kind === 'working' }
  }
  return { fired, next: updated }
}

let mem: { sid: string; watches: Watches } | undefined

async function load(i: Io): Promise<{ sid: string; watches: Watches }> {
  const sid = await i.sessionId()
  if (mem === undefined || mem.sid !== sid) mem = { sid, watches: parseWatches(await i.get(watchKey(sid))) }
  return mem
}

async function save(i: Io, m: { sid: string; watches: Watches }): Promise<void> {
  if (Object.keys(m.watches).length === 0) await i.del(watchKey(m.sid))
  else await i.set(watchKey(m.sid), m.watches)
}

export async function readWatches(i: Io): Promise<Watches> {
  return { ...(await load(i)).watches }
}

export async function setWatch(i: Io, id: string, isOn: boolean, name: string, isWorking: boolean): Promise<void> {
  const m = await load(i)
  m.watches = withWatch(m.watches, id, isOn, name, await i.now(), isWorking)
  await save(i, m)
}

export async function stepWatches(i: Io, rows: readonly WatchRow[], now: number): Promise<Fired[]> {
  const m = await load(i)
  if (Object.keys(m.watches).length === 0) return []
  const r = watchStep(m.watches, rows, now)
  if (JSON.stringify(r.next) !== JSON.stringify(m.watches)) {
    m.watches = r.next
    await save(i, m)
  }
  return r.fired
}

export const forgetWatches = (): void => {
  mem = undefined
}
