// "Delete everything vaken stored": the first press shows what would go, the second deletes. Never touches project files or other settings. Never throws.
import { listNames, onWindows, opsOf, removeFile, removeTree } from './fileops'
import type { Io } from './io'
import { detectStyle, joinPath } from './platform'

// Store keys and the data folder keep the old product name on purpose, so saved choices survive the rename.
export const STORE_PREFIX = 'cockpit:'
export const COCKPIT_DIR = '.claude/cockpit'
const SAFE_NAME = /^(?!\.\.?$)[A-Za-z0-9._-]{1,120}$/

export type ErasePreview = { keys: number; folders: { name: string; kb: number | undefined }[]; kb: number | undefined }

export const cockpitDir = (home: string): string => joinPath(detectStyle(home), home, COCKPIT_DIR)
// A Halt that is on is a safety stop, so delete keeps it.
export const HALT_PREFIX = 'cockpit:halt:'
export const ownKeys = (keys: readonly string[]): string[] => keys.filter(k => k.startsWith(STORE_PREFIX) && !k.startsWith(HALT_PREFIX))

const cannotList = async (o: ReturnType<typeof opsOf>, dir: string): Promise<boolean> => o.fs === undefined && (await onWindows(o, [dir]))

export function parseDu(out: string): Map<string, number> {
  const sizes = new Map<string, number>()
  for (const line of out.split('\n')) {
    const m = /^\s*(\d+)\s+(.+?)\s*$/.exec(line)
    if (m !== null) sizes.set(m[2] ?? '', Number(m[1]))
  }
  return sizes
}

export function sizeWord(kb: number): string {
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
}

export async function erasePreview(i: Io): Promise<ErasePreview> {
  const keys = ownKeys(await i.keys().catch(() => [])).length
  const home = await i.home().catch(() => '')
  if (home === '') return { keys, folders: [], kb: undefined }
  const dir = cockpitDir(home)
  const names = ((await listNames(opsOf(i), dir).catch(() => undefined)) ?? []).filter(n => SAFE_NAME.test(n)).sort()
  let sizes = new Map<string, number>()
  if (names.length > 0 && detectStyle(home) === 'posix') {
    try {
      const r = await i.run(['du', '-sk', '--', ...names.map(n => joinPath('posix', dir, n))], { timeoutMs: 10_000 })
      sizes = parseDu(r.stdout)
    } catch {
      sizes = new Map()
    }
  }
  const folders = names.map(name => ({ name, kb: sizes.get(joinPath(detectStyle(home), dir, name)) }))
  const known = folders.filter(f => f.kb !== undefined)
  return { keys, folders, kb: known.length === folders.length && folders.length > 0 ? known.reduce((n, f) => n + (f.kb ?? 0), 0) : undefined }
}

export async function eraseAll(i: Io): Promise<{ keys: number; folders: number; left: number; unread?: boolean }> {
  let keys = 0
  let left = 0
  for (const k of ownKeys(await i.keys().catch(() => []))) {
    try {
      await i.del(k)
      keys += 1
    } catch {
      left += 1
    }
  }
  let folders = 0
  const home = await i.home().catch(() => '')
  if (home !== '') {
    const dir = cockpitDir(home)
    const o = opsOf(i)
    const listed = await listNames(o, dir).catch(() => undefined)
    if (listed === undefined && (await cannotList(o, dir))) return { keys, folders, left, unread: true }
    for (const name of (listed ?? []).filter(n => SAFE_NAME.test(n))) {
      const path = joinPath(detectStyle(home), dir, name)
      // A file is tried by itself when the tree call fails.
      const gone = (await removeTree(o, path, dir)) || (await removeFile(o, path, dir))
      if (gone) folders += 1
      else left += 1
    }
  }
  return { keys, folders, left }
}
