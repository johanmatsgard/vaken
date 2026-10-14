// Path and text helpers that behave the same on Mac and Windows. No imports and no process.platform, so tests run both styles anywhere.
export type PathStyle = 'posix' | 'win32'

export const detectStyle = (path: string): PathStyle => (/^[A-Za-z]:/.test(path) || path.includes('\\') ? 'win32' : 'posix')

export function homeDir(env: Record<string, string | undefined>): string | undefined {
  if (env.HOME) return env.HOME
  if (env.USERPROFILE) return env.USERPROFILE
  if (env.HOMEDRIVE && env.HOMEPATH) return env.HOMEDRIVE + env.HOMEPATH
  return undefined
}

// The plugin loader allows `$.env.get` only with a literal name, so each feature hands in four closures. HOME is read first so a Mac reads what it always did.
export type HomeEnv = { HOME: () => Promise<string | undefined>; USERPROFILE: () => Promise<string | undefined>; HOMEDRIVE: () => Promise<string | undefined>; HOMEPATH: () => Promise<string | undefined> }
export async function homeFrom(env: HomeEnv): Promise<string> {
  const home = await env.HOME()
  if (home) return home
  return homeDir({ USERPROFILE: await env.USERPROFILE(), HOMEDRIVE: await env.HOMEDRIVE(), HOMEPATH: await env.HOMEPATH() }) ?? ''
}

export const lastPart = (path: string): string => parts(path).at(-1) ?? ''

type Split = { root: string; segs: string[] }

function split(path: string, style: PathStyle): Split {
  const win = style === 'win32'
  const raw = win ? path.replace(/\\/g, '/') : path
  let root = ''
  let rest = raw
  const unc = win ? /^\/\/([^/]+)(.*)$/.exec(raw) : null
  if (unc !== null) {
    root = `\\\\${unc[1]}`
    rest = unc[2]
  } else if (win && /^[A-Za-z]:/.test(raw)) {
    root = raw.slice(0, 2)
    rest = raw.slice(2)
  } else if (raw.startsWith('/')) root = '/'
  const segs: string[] = []
  for (const s of rest.split('/')) {
    if (s === '' || s === '.') continue
    if (s === '..' && segs.length > 0 && segs[segs.length - 1] !== '..') segs.pop()
    else segs.push(s)
  }
  return { root, segs }
}

export function parts(path: string, style: PathStyle = detectStyle(path)): string[] {
  const { root, segs } = split(path, style)
  return root === '' || root === '/' ? segs : [root, ...segs]
}

export function lastName(path: string, style: PathStyle = detectStyle(path)): string {
  const { segs } = split(path, style)
  return segs.length === 0 ? path : segs[segs.length - 1]
}

// Whole parts only.
export function isInside(parent: string, child: string, style: PathStyle = detectStyle(parent + child)): boolean {
  const a = split(parent, style)
  const b = split(child, style)
  const fold = (s: string): string => (style === 'win32' ? s.toLowerCase() : s)
  if (fold(a.root) !== fold(b.root)) return false
  if (a.segs.length > b.segs.length) return false
  return a.segs.every((s, i) => fold(s) === fold(b.segs[i]))
}

// Windows is UNVERIFIED: assumed the same idea (drive colon and slashes become '-'), other characters kept, until a real Windows PC shows what Claude Code does.
export function projectFolderName(path: string, style: PathStyle = detectStyle(path)): string {
  return style === 'win32' ? path.replace(/[:\\/]/g, '-') : path.replace(/[^A-Za-z0-9]/g, '-')
}

export const lines = (text: string): string[] => text.split(/\r?\n/)

export function joinPath(style: PathStyle, ...pieces: string[]): string {
  const sep = style === 'win32' ? '\\' : '/'
  const any = style === 'win32' ? /[\\/]+/g : /\/+/g
  const clean = pieces.filter(p => p !== '').map(p => p.replace(any, sep))
  if (clean.length === 0) return ''
  if (style === 'win32' && /^[\\/]{2}[^\\/]/.test(pieces.find(p => p !== '') ?? '')) clean[0] = sep + clean[0]
  const edge = (p: string): string => {
    let s = p
    while (s.startsWith(sep)) s = s.slice(1)
    while (s.endsWith(sep)) s = s.slice(0, -1)
    return s
  }
  let head = clean[0]
  while (head.length > 1 && head.endsWith(sep) && head !== sep) head = head.slice(0, -1)
  const rest = clean.slice(1).map(edge).filter(p => p !== '')
  if (rest.length === 0) return clean[0]
  const base = head === sep ? '' : head
  return [base, ...rest].join(sep)
}

// Windows style ignores letter case and either slash.
export function homeShown(path: string, home: string): string {
  if (home === '') return path
  if (detectStyle(home) !== 'win32') return path.startsWith(home) ? `~${path.slice(home.length)}` : path
  if (!isInside(home, path, 'win32')) return path
  const rest = parts(path, 'win32').slice(parts(home, 'win32').length)
  return rest.length === 0 ? '~' : `~\\${rest.join('\\')}`
}

export const homeRel = (rel: string, home: string): string => (detectStyle(home) === 'win32' ? `~\\${rel.replace(/\//g, '\\')}` : `~/${rel}`)


export const isAbsolute = (path: string): boolean => path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path) || path.startsWith('\\\\')

// An empty base gives '/rel'.
export const under = (base: string, ...rel: string[]): string => (base === '' ? joinPath('posix', '/', ...rel) : joinPath(detectStyle(base), base, ...rel))

export function samePath(a: string, b: string): boolean {
  if (detectStyle(a + b) === 'win32') return isInside(a, b, 'win32') && isInside(b, a, 'win32')
  const cut = (p: string): string => (p.length > 1 ? p.replace(/\/+$/, '') : p)
  return cut(a) === cut(b)
}

export function parentDir(path: string): string {
  const cut = detectStyle(path) === 'win32' ? Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) : path.lastIndexOf('/')
  if (cut < 0) return ''
  const up = path.slice(0, cut)
  // Never a bare 'C:', which means the current folder of that drive.
  return /^[A-Za-z]:$/.test(up) ? `${up}${path[cut]}` : up
}

export function fileName(path: string): string {
  const cut = detectStyle(path) === 'win32' ? Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) : path.lastIndexOf('/')
  return path.slice(cut + 1)
}

export function below(root: string, path: string): string {
  if (root === '') return path
  const style = detectStyle(root + path)
  if (style === 'posix') return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path
  if (!isInside(root, path, style)) return path
  const rest = parts(path, style).slice(parts(root, style).length)
  return rest.length === 0 ? path : rest.join('\\')
}

export const strictlyInside = (root: string, path: string): boolean => below(root, path) !== path

export function walkUp(cwd: string, stop: string, max = 12): string[] {
  const out: string[] = []
  let dir = cwd
  for (let n = 0; n < max && dir !== '' && dir !== '/' && !/^[A-Za-z]:[\\/]?$/.test(dir); n += 1) {
    out.push(dir)
    if (samePath(dir, stop)) break
    dir = parentDir(dir)
  }
  return out
}
