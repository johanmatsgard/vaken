// Process helpers: is a program there, stop a process by exact number, what a number runs, which are alive, the real program name on Windows. Takes the system as a value, never reads process.platform. Never throws and never stops a process by name.
import type { Io } from './io'

export type ProcPlatform = 'posix' | 'win32'
type Run = Io['run']

const PROBE_MS = 3_000

// A Mac never changes its calls.
export const procPlatformOf = (osVar: string | undefined): ProcPlatform => (osVar === 'Windows_NT' ? 'win32' : 'posix')

export function platformOnce(read: () => Promise<string | undefined>): () => Promise<ProcPlatform> {
  let got: Promise<ProcPlatform> | undefined
  return () => (got ??= read().then(procPlatformOf, () => 'posix' as const))
}

const boundPlat = new WeakMap<object, () => Promise<ProcPlatform>>()
export function bindPlatform<T extends object>(io: T, read: () => Promise<string | undefined>): T {
  boundPlat.set(io, platformOnce(read))
  return io
}
export const platformOfIo = (io: object): Promise<ProcPlatform> => boundPlat.get(io)?.() ?? Promise.resolve('posix')


// npm and kin install a `.cmd` shim on Windows, and a runner without a shell finds `npm.cmd` only by its full name.
const CMD_SHIMS = new Set(['npm', 'npx', 'pnpm', 'pnpx', 'yarn', 'yarnpkg', 'corepack', 'tsc', 'tsx', 'vite', 'vitest', 'jest', 'eslint', 'prettier'])

export function resolveProgram(name: string, plat: ProcPlatform): string {
  if (plat !== 'win32') return name
  if (name === '' || /[\\/]/.test(name) || /\.[A-Za-z0-9]{1,4}$/.test(name)) return name
  return CMD_SHIMS.has(name.toLowerCase()) ? `${name}.cmd` : `${name}.exe`
}


export const hasProgramArgv = (name: string, plat: ProcPlatform): string[] => (plat === 'win32' ? ['where', name] : ['which', name])

// A plain stop first; `force` only when asked.
export function stopPidArgv(pid: number, plat: ProcPlatform, force = false): string[] {
  if (plat === 'win32') return force ? ['taskkill', '/PID', String(pid), '/F'] : ['taskkill', '/PID', String(pid)]
  return force ? ['kill', '-9', String(pid)] : ['kill', String(pid)]
}

export const processNameArgv = (pid: number, plat: ProcPlatform): string[] =>
  plat === 'win32' ? ['tasklist', '/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'] : ['ps', '-p', String(pid), '-o', 'comm=']

// Windows `tasklist` takes one PID filter, so it lists all and the parser keeps the numbers.
export const alivePidsArgv = (pids: readonly number[], plat: ProcPlatform): string[] => (plat === 'win32' ? ['tasklist', '/FO', 'CSV', '/NH'] : ['ps', '-p', pids.join(','), '-o', 'pid='])


export const csvFields = (line: string): string[] => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map(m => m[1].replace(/""/g, '"'))
const lastPart = (path: string): string => path.split(/[\\/]/).filter(p => p !== '').pop() ?? ''

// Windows prints 'INFO: No tasks ...' for none, which has no CSV field.
export function processNameOf(out: string, plat: ProcPlatform): string | undefined {
  const first = out.split(/\r?\n/).map(l => l.trim()).find(l => l !== '')
  if (first === undefined) return undefined
  if (plat === 'win32') {
    const image = csvFields(first)[0]
    return image === undefined || image === '' ? undefined : image.replace(/\.exe$/i, '')
  }
  const name = lastPart(first)
  return name === '' ? undefined : name
}

export function parseAlivePids(out: string, plat: ProcPlatform): Set<number> {
  const found = new Set<number>()
  for (const line of out.split(/\r?\n/)) {
    const raw = plat === 'win32' ? (csvFields(line.trim())[1] ?? '') : line.trim()
    const n = Number(raw)
    if (/^\d+$/.test(raw) && Number.isInteger(n) && n > 1) found.add(n)
  }
  return found
}


async function tryRun(run: Run, argv: readonly string[], ms: number): Promise<{ exitCode: number; stdout: string } | undefined> {
  try {
    return await run(argv, { timeoutMs: ms })
  } catch {
    return undefined
  }
}

export async function hasProgram(run: Run, plat: ProcPlatform, name: string, ms = PROBE_MS): Promise<boolean> {
  return (await tryRun(run, hasProgramArgv(name, plat), ms))?.exitCode === 0
}

export async function stopPid(run: Run, plat: ProcPlatform, pid: number, opts: { force?: boolean; ms?: number } = {}): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 1) return false
  return (await tryRun(run, stopPidArgv(pid, plat, opts.force === true), opts.ms ?? PROBE_MS))?.exitCode === 0
}

export async function processName(run: Run, plat: ProcPlatform, pid: number, ms = PROBE_MS): Promise<string | undefined> {
  const r = await tryRun(run, processNameArgv(pid, plat), ms)
  return r !== undefined && r.exitCode === 0 ? processNameOf(r.stdout, plat) : undefined
}

export async function isProcessNamed(run: Run, plat: ProcPlatform, pid: number, name: string, ms = PROBE_MS): Promise<boolean> {
  const got = await processName(run, plat, pid, ms)
  if (got === undefined) return false
  return plat === 'win32' ? got.toLowerCase() === name.replace(/\.exe$/i, '').toLowerCase() : got === name
}
