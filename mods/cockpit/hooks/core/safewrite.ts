// Writes that never follow a link: every path part below the boundary is checked.
import { isMissing } from './fileops'

export type SafeFs = {
  stat: (path: string, options?: { resolve: boolean }) => Promise<{ isLink?: boolean; realPath?: string }>
  list: (path: string) => Promise<ReadonlyArray<{ name: string; isLink?: boolean }>>
}
export type WriteCheck = { ok: true } | { ok: false; why: 'link' | 'outside' | 'unreadable' }

export const SAFE_WRITE_REFUSED = 'Nothing was written: {path} or a folder above it is a link, or it leads somewhere it should not.'
export const refusedWords = (path: string, t: (s: string) => string = s => s): string => t(SAFE_WRITE_REFUSED).replace('{path}', path)

const SEP = /[\\/]/
const sepOf = (p: string): string => (p.includes('\\') && !p.includes('/') ? '\\' : '/')
const trimEnd = (p: string): string => (p.length > 1 ? p.replace(/[\\/]+$/, '') : p)

export function partsBelow(root: string, path: string): string[] | undefined {
  const r = trimEnd(root)
  if (r === '' || !path.startsWith(r) || !SEP.test(path.charAt(r.length))) return undefined
  const parts = path.slice(r.length + 1).split(SEP).filter(s => s !== '')
  if (parts.length === 0 || parts.some(s => s === '.' || s === '..')) return undefined
  return parts
}

async function listed(fs: SafeFs, folder: string, name: string): Promise<{ isLink: boolean } | null | undefined> {
  try {
    const hit = (await fs.list(folder)).find(e => e.name === name)
    return hit === undefined ? null : { isLink: hit.isLink === true }
  } catch (err) {
    return isMissing(err) ? null : undefined
  }
}

export async function checkWrite(fs: SafeFs, root: string, path: string): Promise<WriteCheck> {
  const parts = partsBelow(root, path)
  if (parts === undefined) return { ok: false, why: 'outside' }
  const sep = sepOf(path)
  let at = trimEnd(root)
  for (let n = 0; n < parts.length; n += 1) {
    const folder = at
    at = `${at}${sep}${parts[n]}`
    try {
      if ((await fs.stat(at)).isLink === true) return { ok: false, why: 'link' }
    } catch {
      // A link that leads nowhere is still in the folder list; only a name not in it is free.
      const entry = await listed(fs, folder, parts[n])
      if (entry === undefined) return { ok: false, why: 'unreadable' }
      if (entry !== null) return { ok: false, why: entry.isLink ? 'link' : 'unreadable' }
      return { ok: true }
    }
  }
  try {
    const realRoot = (await fs.stat(trimEnd(root), { resolve: true })).realPath
    const real = (await fs.stat(path, { resolve: true })).realPath
    if (realRoot === undefined || real === undefined || partsBelow(realRoot, real) === undefined) return { ok: false, why: 'outside' }
  } catch {
    return { ok: false, why: 'unreadable' }
  }
  return { ok: true }
}

// Tools that keep dotfiles link parts of ~/.claude, so home writes follow links but must not land in the project.
export async function checkHomeWrite(fs: SafeFs, path: string, project?: string): Promise<WriteCheck> {
  if (path.split(SEP).some(s => s === '.' || s === '..')) return { ok: false, why: 'outside' }
  const sep = sepOf(path)
  let at = trimEnd(path)
  const rest: string[] = []
  let real: string | undefined
  for (;;) {
    try {
      const st = await fs.stat(at, { resolve: true })
      if (st.realPath === undefined) return { ok: false, why: 'link' }
      real = rest.length === 0 ? st.realPath : [st.realPath.replace(/[\\/]+$/, ''), ...rest].join(sep)
      break
    } catch {
      const cut = Math.max(at.lastIndexOf('/'), at.lastIndexOf('\\'))
      if (cut < 0 || at.length <= cut + 1) return { ok: false, why: 'unreadable' }
      const folder = cut === 0 ? at.charAt(0) : at.slice(0, cut)
      const name = at.slice(cut + 1)
      const entry = await listed(fs, folder, name)
      if (entry === undefined) return { ok: false, why: 'unreadable' }
      if (entry !== null) return { ok: false, why: 'link' }
      rest.unshift(name)
      at = folder
    }
  }
  if (project === undefined || project === '') return { ok: true }
  const realProject = await fs.stat(trimEnd(project), { resolve: true }).then(s => s.realPath, () => undefined)
  for (const p of [trimEnd(project), realProject]) if (p !== undefined && (real === p || partsBelow(p, real) !== undefined)) return { ok: false, why: 'outside' }
  return { ok: true }
}

export async function safeWrite(fs: SafeFs, write: (path: string, text: string) => Promise<void>, root: string, path: string, text: string): Promise<WriteCheck> {
  const check = await checkWrite(fs, root, path)
  if (check.ok) await write(path, text)
  return check
}

export const takenProbe =
  (fs: SafeFs) =>
  async (path: string): Promise<void> => {
    try {
      await fs.stat(path)
      return
    } catch {
    }
    const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
    const entry = cut < 0 ? null : await listed(fs, cut === 0 ? path.charAt(0) : path.slice(0, cut), path.slice(cut + 1))
    if (entry === undefined) throw new Error('EIO')
    if (entry === null) throw new Error('ENOENT')
  }

const bound = new WeakMap<object, SafeFs>()
export function bindSafeFs<T extends object>(io: T, fs: SafeFs): T {
  bound.set(io, fs)
  return io
}
export const safeFsOf = (io: object): SafeFs | undefined => bound.get(io)
