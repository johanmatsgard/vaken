// The disk side of the Agent setup card (core/setupcard.ts): read the few files it compares, and write ONE item on a press.
import type { Io } from '../core/io'
import { desired, nextText, parseScope, setupApplyOn, stateOf, watchedPaths, withLegacy } from '../core/setupcard'
import type { Desired, SetupRead } from '../core/setupcard'
import { SETUP_WHAT } from '../core/setupwords'
import type { Values } from '../core/settings'
import { saveBefore, utf8Bytes } from '../core/undo'
import type { Probe } from '../core/undo'
import { LEDGER_KEY, pushLog } from './compaction'
import { checkHomeWrite, checkWrite, safeFsOf } from '../core/safewrite'

// Whether a path is there (the engine's `$.fs.exists`, handed in by the pane and the command).
let fsExists: ((path: string) => Promise<boolean>) | undefined
export const setSetupExists = (fn: ((path: string) => Promise<boolean>) | undefined): void => {
  fsExists = fn
}
export async function readOne(i: Io, path: string): Promise<string | null | false> {
  try {
    return await i.read(path)
  } catch {
    try {
      return fsExists !== undefined && !(await fsExists(path)) ? null : false
    } catch {
      return false
    }
  }
}

// Never throws.
export async function readSetup(i: Io, values: Values, home: string, root: string | undefined): Promise<SetupRead> {
  const scope = parseScope(values['setup.scope'])
  const disk: SetupRead['disk'] = {}
  const paths = watchedPaths(values, home, root, scope)
  const read = await Promise.all(paths.map(p => readOne(i, p)))
  paths.forEach((p, n) => {
    disk[p] = read[n] as string | null | false
  })
  return { home, ...(root === undefined || root === '' ? {} : { root }), scope, disk }
}

export type WriteResult = { ok: boolean; wrote: boolean; name: string; why?: 'off' | 'session' | 'confirm' | 'unreadable' | 'failed' | 'none' | 'link'; bak?: string }

const probeOf =
  (i: Io): Probe =>
  async path => {
    try {
      return { kind: 'file', size: utf8Bytes(await i.read(path)) }
    } catch {
      return undefined
    }
  }

async function freeBak(i: Io, path: string): Promise<string | undefined> {
  for (let n = 0; n < 10; n += 1) {
    const p = n === 0 ? `${path}.bak` : `${path}.bak${n}`
    if ((await readOne(i, p)) === null) return p
  }
  return undefined
}

export async function writeItem(i: Io, values: Values, home: string, root: string | undefined, key: string, confirmed: boolean, how: 'button' | 'typed'): Promise<WriteResult> {
  const scope = parseScope(values['setup.scope'])
  const none = { ok: false, wrote: false, name: key }
  if (!setupApplyOn(values)) return { ...none, why: 'off' }
  if (scope === 'session') return { ...none, why: 'session' }
  const d0: Desired | undefined = desired(values, home, root, scope).find(x => x.key === key || x.name === key)
  if (d0 === undefined) return { ...none, why: 'none' }
  const mine = await readOne(i, d0.path)
  const d = mine === null && d0.legacy !== undefined ? withLegacy(d0, { [d0.path]: null, [d0.legacy.path]: await readOne(i, d0.legacy.path) }) : d0
  const disk = d === d0 ? mine : await readOne(i, d.path)
  const state = stateOf(d, disk)
  if (state === 'matches') return { ok: true, wrote: false, name: d.name }
  if (state === 'unreadable') return { ...none, name: d.name, why: 'unreadable' }
  if ((state === 'differs' || state === 'yours') && !confirmed) return { ...none, name: d.name, why: 'confirm' }
  // This project: a link at the file or at a folder above it is never followed.
  const fs = safeFsOf(i)
  const allowed = async (path: string): Promise<boolean> => fs !== undefined && (await (scope === 'all' ? checkHomeWrite(fs, path, root) : checkWrite(fs, root ?? '', path))).ok
  if (!(await allowed(d.path))) return { ...none, name: d.name, why: 'link' }
  try {
    let bak: string | undefined
    if (typeof disk === 'string' && disk.trim() !== '') {
      bak = await freeBak(i, d.path)
      if (bak === undefined) return { ...none, name: d.name, why: 'failed' }
      if (!(await allowed(bak))) return { ...none, name: d.name, why: 'link' }
      await i.write(bak, disk)
      await saveBefore(i, probeOf(i), await i.sessionId(), [{ path: d.path, create: false }], 'vaken-setup')
    }
    await i.write(d.path, nextText(d, disk))
    try {
      await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: SETUP_WHAT, detail: d.name, how, did: true })
    } catch {
    }
    return { ok: true, wrote: true, name: d.name, ...(bak === undefined ? {} : { bak }) }
  } catch {
    return { ...none, name: d.name, why: 'failed' }
  }
}
