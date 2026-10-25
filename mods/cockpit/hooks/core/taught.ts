// The rules a person saved through vaken live inside the project's CLAUDE.md block, under one head line, so the Agent setup card keeps them when it writes the block again. Pure.

export const TAUGHT_HEAD = 'Rules you saved in vaken:' // en-only: a line written into the project's CLAUDE.md for Claude

const lines = (body: string): string[] => body.replace(/\r\n/g, '\n').split('\n')

export function taughtOf(body: string): string[] {
  const all = lines(body)
  const at = all.findIndex(l => l.trim() === TAUGHT_HEAD)
  if (at < 0) return []
  const out: string[] = []
  for (const l of all.slice(at + 1)) {
    const m = /^\s*-\s+(.+?)\s*$/.exec(l)
    if (m === null) break
    out.push(m[1]!)
  }
  return out
}

export function stripTaught(body: string): string {
  const all = lines(body)
  const at = all.findIndex(l => l.trim() === TAUGHT_HEAD)
  if (at < 0) return body
  let end = at + 1
  while (end < all.length && /^\s*-\s+\S/.test(all[end]!)) end += 1
  return [...all.slice(0, at), ...all.slice(end)].join('\n')
}

// The block's last line is its end mark; the saved rules go just above it.
export function withTaught(block: string, taught: readonly string[]): string {
  const base = stripTaught(block)
  if (taught.length === 0) return base
  const all = lines(base)
  const last = all.length - 1
  return [...all.slice(0, last), TAUGHT_HEAD, ...taught.map(t => `- ${t}`), all[last]!].join('\n')
}
