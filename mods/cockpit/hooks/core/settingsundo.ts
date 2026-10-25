// Undo for a mode press and the setup's Finish: the stored values of every row the press writes, kept before it writes, and put back exactly (a row that had no stored value loses it again). Only the last press is kept.
import type { Io } from './io'
import { PROJSET_KEY } from './io'
import { findSetting, settingStoreKey } from './settings'

export const SETTINGS_UNDO_KEY = 'cockpit:settings:undo'
// The Undo press shows this long after the press
export const SETTINGS_UNDO_MS = 10 * 60_000

// `what` is the mode's id, or 'setup' for the setup's Finish. `root` is the project whose own rows the press wrote, else All projects. A value of null: the row had no stored value.
export type SettingsUndo = { at: number; what: string; root?: string; values: Record<string, unknown> }

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

export function parseUndo(raw: unknown): SettingsUndo | undefined {
  if (!isObj(raw) || typeof raw.at !== 'number' || typeof raw.what !== 'string' || !isObj(raw.values)) return undefined
  if (raw.root !== undefined && typeof raw.root !== 'string') return undefined
  return { at: raw.at, what: raw.what, ...(typeof raw.root === 'string' ? { root: raw.root } : {}), values: raw.values }
}

// The Undo press shows while the snapshot is younger than SETTINGS_UNDO_MS (a clock that went back hides it)
export const undoFresh = (u: SettingsUndo | undefined, now: number): u is SettingsUndo => u !== undefined && now >= u.at && now - u.at < SETTINGS_UNDO_MS

const getRaw = (i: Io) => i.getGlobal ?? i.get
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

async function rawOf(i: Io, keys: readonly string[], root: string | undefined): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  if (root !== undefined) {
    const set = await getRaw(i)(PROJSET_KEY(root))
    for (const k of keys) out[k] = isObj(set) && set[k] !== undefined ? set[k] : null
    return out
  }
  for (const k of keys) out[k] = (await getRaw(i)(settingStoreKey(k))) ?? null
  return out
}

// Before a press writes `keys` (at All projects, or the project `root`): keeps their stored values. Never throws.
export async function keepUndo(i: Io, what: string, keys: readonly string[], root: string | undefined): Promise<void> {
  try {
    const known = [...new Set(keys)].filter(k => findSetting(k) !== undefined)
    await i.set(SETTINGS_UNDO_KEY, { at: await i.now(), what, ...(root === undefined ? {} : { root }), values: await rawOf(i, known, root) })
  } catch {
  }
}

// Puts the kept values back, clears the snapshot, and says how many rows changed back (undefined: nothing was kept)
export async function runUndo(i: Io): Promise<{ n: number; keys: string[]; what: string } | undefined> {
  const u = parseUndo(await i.get(SETTINGS_UNDO_KEY))
  if (u === undefined) return undefined
  const keys = Object.keys(u.values).filter(k => findSetting(k) !== undefined)
  const now = await rawOf(i, keys, u.root)
  const moved = keys.filter(k => !same(now[k], u.values[k]))
  if (u.root !== undefined) {
    const raw = await getRaw(i)(PROJSET_KEY(u.root))
    const set: Record<string, unknown> = isObj(raw) ? { ...raw } : {}
    for (const k of moved) {
      if (u.values[k] === null || u.values[k] === undefined) delete set[k]
      else set[k] = u.values[k]
    }
    if (moved.length > 0) await i.set(PROJSET_KEY(u.root), set)
  } else {
    for (const k of moved) {
      if (u.values[k] === null || u.values[k] === undefined) await i.del(settingStoreKey(k))
      else await i.set(settingStoreKey(k), u.values[k])
    }
  }
  await i.del(SETTINGS_UNDO_KEY)
  return { n: moved.length, keys: moved, what: u.what }
}
