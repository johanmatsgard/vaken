// Plain file work in one place. The runtime has no make-folder, move, copy or remove call, so on the Mac those are short programs behind one function each; on Windows a fixed PowerShell script gets the paths as data, never as script text. Nothing here throws.
import { parseHashes, parseSizes } from './eyes'
import type { Io } from './io'
import { isInside } from './platform'
import { platformOfIo } from './procs'
import type { ProcPlatform } from './procs'
import { winFsCall } from './winfs'
import type { WinFsOp } from './winfs'

export type Run = Io['run']
export type Kind = 'file' | 'dir' | 'other'
export type FsApi = {
  stat: (path: string) => Promise<{ kind: Kind; size: number }>
  list: (path: string) => Promise<ReadonlyArray<{ name: string; kind: Kind; size: number }>>
  readBytes: (path: string) => Promise<{ base64: string }>
}
export type Ops = { run: Run; fs?: FsApi; plat?: () => Promise<ProcPlatform> }

const bound = new WeakMap<object, FsApi>()
export function bindFs<T extends object>(io: T, fs: FsApi): T {
  bound.set(io, fs)
  return io
}
export const opsOf = (io: { run: Run }): Ops => ({ run: io.run, fs: bound.get(io), plat: () => platformOfIo(io) })

const PROBE_MS = 5_000

async function sh(o: Ops, argv: readonly string[], ms = PROBE_MS, cwd?: string): Promise<{ exitCode: number; stdout: string; stderr: string } | undefined> {
  try {
    return await o.run(argv, cwd === undefined ? { timeoutMs: ms } : { cwd, timeoutMs: ms })
  } catch {
    return undefined
  }
}

// "Not there" is an answer; any other failure sends the work to the program.
export async function freePath(read: (path: string) => Promise<unknown>, path: string, tries = 99): Promise<string | undefined> {
  const dot = /\.[^./\\]+$/.exec(path)
  const stem = dot === null ? path : path.slice(0, dot.index)
  const ext = dot === null ? '' : dot[0]
  for (let n = 1; n <= tries; n += 1) {
    const candidate = n === 1 ? path : `${stem}-${n}${ext}`
    try {
      await read(candidate)
    } catch (err) {
      if (isMissing(err)) return candidate
    }
  }
  return undefined
}

export const isMissing = (err: unknown): boolean => /ENOENT|not found|no such file/i.test(err instanceof Error ? err.message : String(err))
export const isWinPath = (path: string): boolean => /^(?:[A-Za-z]:|\\\\)/.test(path)
export async function onWindows(o: Ops, paths: readonly string[]): Promise<boolean> {
  if (paths.some(isWinPath)) return true
  if (o.plat === undefined) return false
  try {
    return (await o.plat()) === 'win32'
  } catch {
    return false
  }
}

const absolute = (base: string | undefined, path: string): string =>
  path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path) || base === undefined || base === '' ? path : `${base.replace(isWinPath(base) ? /[\\/]+$/ : /\/+$/, '')}/${path}`


// Home itself and anything above it is never removed; vaken's own files are 4 or more parts deep.
const MIN_PARTS = 3

// Windows refuses ":" (a stream), wildcards and a trailing dot or space, since Windows drops those and the name would land on another file.
export function isRemovablePath(path: string, plat: ProcPlatform = 'posix'): boolean {
  if (typeof path !== 'string' || path === '' || /[\u0000-\u001f]/.test(path)) return false
  const win = plat === 'win32' || isWinPath(path) || path.includes('\\')
  if (win ? !/^[A-Za-z]:[\\/]/.test(path) : !path.startsWith('/')) return false
  const segs = (win ? path.slice(2) : path).split(win ? /[\\/]/ : '/').filter(x => x !== '')
  if (segs.length < MIN_PARTS || segs.some(x => x === '.' || x === '..')) return false
  if (win && segs.some(x => /[:*?"<>|]/.test(x) || /[. ]$/.test(x))) return false
  return true
}

export function isRemovableInside(within: string, path: string, plat: ProcPlatform = 'posix'): boolean {
  if (!isRemovablePath(path, plat) || !isRemovablePath(within, plat)) return false
  const win = plat === 'win32' || [path, within].some(p => isWinPath(p) || p.includes('\\'))
  const style = win ? 'win32' : 'posix'
  return isInside(within, path, style) && !isInside(path, within, style)
}


// A PowerShell start can be slow on a busy PC (about 0.3 s warm).
const WIN_MS = 15_000

// The caller checks the remove guard first.
async function win(o: Ops, op: WinFsOp, paths: readonly string[], ms = PROBE_MS): Promise<boolean> {
  const call = winFsCall(op, paths)
  if (call === undefined) return false
  try {
    return (await o.run(call.argv, { env: call.env, timeoutMs: Math.max(ms, WIN_MS) })).exitCode === 0
  } catch {
    return false
  }
}

export async function makeDir(o: Ops, path: string): Promise<boolean> {
  if (o.fs !== undefined) {
    try {
      if ((await o.fs.stat(path)).kind === 'dir') return true
    } catch {
      // not there yet, or no file call: make it
    }
  }
  if (await onWindows(o, [path])) return win(o, 'mkdir', [path])
  return (await sh(o, ['mkdir', '-p', '--', path]))?.exitCode === 0
}
export async function moveFile(o: Ops, from: string, to: string): Promise<boolean> {
  if (await onWindows(o, [from, to])) return win(o, 'move', [from, to])
  return (await sh(o, ['mv', '--', from, to]))?.exitCode === 0
}
export async function removeTree(o: Ops, path: string, within: string): Promise<boolean> {
  if (await onWindows(o, [path, within])) return isRemovableInside(within, path, 'win32') && win(o, 'rmtree', [path])
  if (!isRemovableInside(within, path)) return false
  return (await sh(o, ['rm', '-rf', '--', path]))?.exitCode === 0
}
export async function removeFile(o: Ops, path: string, within?: string): Promise<boolean> {
  if (await onWindows(o, within === undefined ? [path] : [path, within])) {
    return (within === undefined ? isRemovablePath(path, 'win32') : isRemovableInside(within, path, 'win32')) && win(o, 'rmfiles', [path])
  }
  if (within === undefined ? !isRemovablePath(path) : !isRemovableInside(within, path)) return false
  return (await sh(o, ['rm', '-f', '--', path]))?.exitCode === 0
}
export async function removeFiles(o: Ops, paths: readonly string[], ms = 5_000): Promise<boolean> {
  if (await onWindows(o, paths)) return paths.every(p => isRemovablePath(p, 'win32')) && win(o, 'rmfiles', paths, ms)
  if (!paths.every(p => isRemovablePath(p))) return false
  return (await sh(o, ['rm', '-f', '--', ...paths], ms))?.exitCode === 0
}
export async function removeEmptyDir(o: Ops, path: string, ms = 5_000): Promise<boolean> {
  if (await onWindows(o, [path])) return isRemovablePath(path, 'win32') && win(o, 'rmdir', [path], ms)
  if (!isRemovablePath(path)) return false
  return (await sh(o, ['rmdir', '--', path], ms))?.exitCode === 0
}


// The BSD `stat -f` fallback is Mac only.
export async function fileSizes(o: Ops, files: readonly string[]): Promise<Map<string, number>> {
  const fs = o.fs
  if (fs !== undefined) {
    try {
      const got = await Promise.all(files.map(async f => ({ f, st: await fs.stat(f).catch(err => (isMissing(err) ? undefined : Promise.reject(err))) })))
      const out = new Map<string, number>()
      for (const { f, st } of got) if (st !== undefined) out.set(f, st.size)
      return out
    } catch {
      // fall back to the program
    }
  }
  if (await onWindows(o, files)) {
    const out = new Map<string, number>()
    if (fs !== undefined) for (const f of files) await fs.stat(f).then(st => void out.set(f, st.size), () => undefined)
    return out
  }
  return parseSizes((await sh(o, ['stat', '-f', '%z %N', '--', ...files]))?.stdout ?? '')
}
export async function fileSize(o: Ops, file: string): Promise<number | undefined> {
  return (await fileSizes(o, [file])).get(file)
}

export function bytesFromBase64(b64: string): Uint8Array {
  const text = atob(b64)
  const out = new Uint8Array(text.length)
  for (let k = 0; k < text.length; k += 1) out[k] = text.charCodeAt(k)
  return out
}
export async function sha256Hex(bytes: Uint8Array): Promise<string | undefined> {
  const subtle = typeof crypto === 'undefined' ? undefined : crypto.subtle
  if (subtle === undefined || typeof subtle.digest !== 'function') return undefined
  const sum = new Uint8Array(await subtle.digest('SHA-256', bytes))
  let hex = ''
  for (const b of sum) hex += b.toString(16).padStart(2, '0')
  return hex
}

export async function fileHashes(o: Ops, files: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const fs = o.fs
  const rest: string[] = []
  for (const f of files) {
    if (fs === undefined) {
      rest.push(f)
      continue
    }
    try {
      const hex = await sha256Hex(bytesFromBase64((await fs.readBytes(f)).base64))
      if (hex === undefined) rest.push(f)
      else out.set(f, hex)
    } catch (err) {
      if (!isMissing(err)) rest.push(f)
    }
  }
  if (rest.length === 0 || (await onWindows(o, files))) return out
  for (const [k, v] of parseHashes((await sh(o, ['shasum', '-a', '256', '--', ...rest]))?.stdout ?? '')) out.set(k, v)
  return out
}

export async function listNames(o: Ops, dir: string): Promise<string[] | undefined> {
  if (o.fs !== undefined) {
    try {
      return (await o.fs.list(dir)).map(e => e.name)
    } catch (err) {
      if (isMissing(err)) return undefined
    }
  }
  if (await onWindows(o, [dir])) return undefined
  const r = await sh(o, ['ls', '-1', '--', dir])
  return r === undefined || r.exitCode !== 0 ? undefined : r.stdout.split('\n').filter(x => x !== '')
}


type Found = { path: string; size: number }
async function walk(o: Ops, base: string | undefined, dir: string, skip: ReadonlySet<string>, max = 100_000, maxFolders = 20_000): Promise<Found[] | undefined> {
  const fs = o.fs
  if (fs === undefined) return undefined
  const out: Found[] = []
  const queue: string[] = [dir]
  let folders = 0
  try {
    while (queue.length > 0 && out.length < max && folders < maxFolders) {
      const at = queue.shift() as string
      folders += 1
      let entries: Awaited<ReturnType<FsApi['list']>>
      try {
        entries = await fs.list(absolute(base, at))
      } catch (err) {
        if (isMissing(err) && at !== dir) continue
        if (isMissing(err)) return []
        throw err
      }
      const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      const dirs: string[] = []
      for (const e of sorted) {
        if (skip.has(e.name)) continue
        if (e.kind === 'dir') dirs.push(`${at}/${e.name}`)
        else if (e.kind === 'file') out.push({ path: `${at}/${e.name}`, size: e.size })
      }
      queue.unshift(...dirs)
    }
  } catch {
    return undefined
  }
  return out.slice(0, max)
}


