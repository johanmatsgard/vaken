// Windows: who listens on which port, from `netstat -ano` and `tasklist`, parsed into the records the Mac parsers return.
import type { Io } from './io'
import { csvFields } from './procs'

type Run = Io['run']

export type WinListener = { command: string; pid: number; port: number }

// `-p tcp` shows IPv4 only, and a dev server on `localhost` often listens on IPv6 only.
export const NETSTAT_ARGV: readonly string[] = ['netstat', '-ano']
export const TASKLIST_ARGV: readonly string[] = ['tasklist', '/FO', 'CSV', '/NH']

const NET_MS = 5_000

// A listening socket has no peer (foreign address ends in port 0); the State word may be translated, so it is not used.
const NETSTAT_RE = /^\s*TCP\s+(\S+)\s+(\S+)\s+\S+\s+(\d+)\s*$/i
const portOf = (addr: string): number => Number(addr.slice(addr.lastIndexOf(':') + 1))

export function parseNetstat(out: string): { pid: number; port: number }[] {
  const seen = new Set<string>()
  const list: { pid: number; port: number }[] = []
  for (const line of out.split(/\r?\n/)) {
    const m = NETSTAT_RE.exec(line)
    if (m === null) continue
    const port = portOf(m[1] ?? '')
    const pid = Number(m[3])
    if (portOf(m[2] ?? '') !== 0 || !Number.isInteger(port) || port < 1 || port > 65535 || !Number.isInteger(pid)) continue
    const key = `${pid}:${port}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push({ pid, port })
  }
  return list.sort((a, b) => a.port - b.port || a.pid - b.pid)
}

export function parseTasklistNames(out: string): Map<number, string> {
  const map = new Map<number, string>()
  for (const line of out.split(/\r?\n/)) {
    const f = csvFields(line.trim())
    const pid = Number(f[1] ?? '')
    if (f[0] === undefined || f[0] === '' || !/^\d+$/.test(f[1] ?? '') || !Number.isInteger(pid)) continue
    map.set(pid, f[0].replace(/\.exe$/i, ''))
  }
  return map
}

export function joinListeners(sockets: readonly { pid: number; port: number }[], names: ReadonlyMap<number, string>): WinListener[] {
  return sockets.map(s => ({ command: names.get(s.pid) ?? '', pid: s.pid, port: s.port }))
}

export async function readWinListeners(run: Run, ms = NET_MS): Promise<WinListener[] | undefined> {
  try {
    const n = await run(NETSTAT_ARGV, { timeoutMs: ms })
    if (n.exitCode !== 0) return undefined
    const sockets = parseNetstat(n.stdout)
    if (sockets.length === 0) return []
    let names = new Map<number, string>()
    try {
      const t = await run(TASKLIST_ARGV, { timeoutMs: ms })
      if (t.exitCode === 0) names = parseTasklistNames(t.stdout)
    } catch {
    }
    return joinListeners(sockets, names)
  } catch {
    return undefined
  }
}
