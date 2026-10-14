// Shared by tests that write through core/safewrite.ts: a file system in memory with the two calls a safe write needs.
import type { On } from 'claude-code'
import type { SafeFs } from '../hooks/core/safewrite'
import { posix } from './fspath'

// 'answers' (the engine's documented answer): it is there, a link, with no real path.
export type Dangling = 'answers' | 'rejects'

export function memSafeFs(files: () => Iterable<string>, links: Map<string, string | undefined> = new Map(), dangling: Dangling = 'answers'): SafeFs {
  const exists = (p: string): boolean => [...files(), ...links.keys()].some(f => f === p || f.startsWith(`${p}/`))
  const resolve = (p: string): string | null => {
    let at = p
    for (let n = 0; n < 20; n += 1) {
      const hit = [...links.keys()].filter(l => at === l || at.startsWith(`${l}/`)).sort((a, b) => b.length - a.length)[0]
      if (hit === undefined) return at
      const to = links.get(hit)
      if (to === undefined) return null
      at = to + at.slice(hit.length)
    }
    return null
  }
  const missing = (): never => {
    throw new Error('ENOENT: no such file')
  }
  return {
    stat: async (path, options) => {
      const p = posix(path)
      const isLink = links.has(p)
      const real = resolve(p)
      const lands = real !== null && (real === '/' || [...files()].some(f => f === real || f.startsWith(`${real}/`)) || [...links.keys()].some(l => l.startsWith(`${real}/`)))
      if (!lands) {
        if (!isLink) return missing()
        if (dangling === 'rejects' && options?.resolve === true) return missing()
        return { isLink: true }
      }
      return { isLink, ...(options?.resolve === true ? { realPath: real } : {}) }
    },
    list: async path => {
      const dir = posix(path).replace(/\/$/, '')
      const real = resolve(dir)
      if (real === null || (!exists(dir) && !exists(real))) return missing()
      const under = (base: string, list: string[]): string[] => list.filter(f => f.startsWith(`${base}/`)).map(f => f.slice(base.length + 1).split('/')[0])
      const names = new Set([...under(real, [...files()]), ...under(dir, [...links.keys()]), ...under(real, [...links.keys()])])
      return [...names].map(name => ({ name, isLink: links.has(`${dir}/${name}`) || links.has(`${real}/${name}`) }))
    },
  }
}

export const openGuard = (root: string): { fs: SafeFs; root: string } => ({ fs: memSafeFs(() => []), root })

// The same file system as the engine's `fs.stat` and `fs.list`.
export function mockSafeFs(on: On, fs: SafeFs): void {
  on('fs.stat', async (_$, e) => ({ value: { kind: 'file', size: 0, mtimeMs: 0, ...(await fs.stat(e.path, { resolve: e.resolve })) } }) as never)
  on('fs.list', async (_$, e) => ({ value: (await fs.list(e.path ?? '.').catch(() => [])).map(x => ({ ...x, kind: 'other', size: 0, mtimeMs: 0 })) }) as never)
}
