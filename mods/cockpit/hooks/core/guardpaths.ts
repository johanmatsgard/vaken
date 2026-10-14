// Path helpers for the safety guards. A drive letter or share path is read as Windows; every other path keeps the POSIX rules.
import { isInside as insideBy, parts } from './platform'

const WIN_DRIVE = /^[A-Za-z]:([\\/]|$)/
export const looksWin = (p: string): boolean => WIN_DRIVE.test(p) || /^\\\\[^\\]/.test(p)
const WIN_HOME = /^(?:~|%USERPROFILE%|\$env:USERPROFILE|\$\{env:USERPROFILE\}|\$env:HOME)(?=$|[\\/])/i

export function expandHome(p: string, home: string): string {
  if (home === '') return p
  if (p === '~' || p === '$HOME' || p === '${HOME}') return home
  if (p.startsWith('~/')) return `${home}/${p.slice(2)}`
  if (p.startsWith('$HOME/')) return `${home}/${p.slice(6)}`
  if (p.startsWith('${HOME}/')) return `${home}/${p.slice(8)}`
  const m = WIN_HOME.exec(p)
  if (m !== null) {
    const rest = p.slice(m[0].length).replace(/^[\\/]+/, '')
    return rest === '' ? home : `${home}${looksWin(home) ? '\\' : '/'}${rest}`
  }
  return p
}

function normalize(p: string): string {
  const abs = p.startsWith('/')
  const out: string[] = []
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') out.pop()
      else if (!abs) out.push('..')
      continue
    }
    out.push(seg)
  }
  const joined = out.join('/')
  return abs ? `/${joined}` : joined === '' ? '.' : joined
}

function absoluteWin(x: string, cwd: string): string {
  const rooted = looksWin(x) ? x : /^[\\/]/.test(x) ? `${cwd.slice(0, 2)}${x}` : `${cwd}\\${x}`
  const ps = parts(rooted, 'win32')
  const head = ps[0] ?? ''
  return ps.length === 1 && !head.startsWith('\\\\') ? `${head}\\` : ps.join('\\')
}

export function absolute(p: string, home: string, cwd: string): string {
  const x = expandHome(p, home)
  if (looksWin(x) || (looksWin(cwd) && !x.startsWith('/'))) return absoluteWin(x, cwd)
  return normalize(x.startsWith('/') ? x : `${cwd}/${x}`)
}

export function isInside(child: string, parent: string): boolean {
  if (looksWin(child) || looksWin(parent)) return insideBy(parent, child, 'win32')
  if (parent === '/') return child.startsWith('/')
  return child === parent || child.startsWith(`${parent}/`)
}

const escapeRe = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')

function globSource(glob: string): string {
  let out = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i] ?? ''
    if (c === '*') {
      if (glob[i + 1] === '*') {
        out += '.*'
        i++
      } else out += '[^/]*'
    } else if (c === '?') out += '[^/]'
    else out += escapeRe(c)
  }
  return out
}

export function matchesPattern(absPath: string, pattern: string, home: string): boolean {
  const pat = pattern.trim()
  if (pat === '') return false
  const expanded = expandHome(pat, home)
  // The lookbehind starts the trailing slashes at their run's start, so a long run of / is read once.
  const body = globSource(expanded.startsWith('/') ? expanded.replace(/(?<!\/)\/+$/, '') : expanded.replace(/^\.\//, '').replace(/(?<!\/)\/+$/, ''))
  const re = expanded.startsWith('/') ? new RegExp(`^${body}(/|$)`) : new RegExp(`(^|/)${body}(/|$)`)
  return re.test(absPath)
}

export function matchesAny(absPath: string, patterns: readonly string[], home: string): string | undefined {
  return patterns.find(p => matchesPattern(absPath, p, home))
}

export const REBUILDABLE = new Set(['node_modules', 'dist', 'build', '.next', '.nuxt', '.turbo', '.cache', '.parcel-cache', 'coverage', '__pycache__', '.pytest_cache', '.mypy_cache', '.venv', 'target', 'out', '.svelte-kit', '.output', 'tmp', '.tmp'])

export function isRebuildable(absPath: string, cwd: string): boolean {
  if (absPath === cwd) return false
  if (!isInside(absPath, cwd)) {
    const parts = absPath.replace(/\/\*+$/, '').split('/').filter(Boolean)
    return parts.length >= 3 && REBUILDABLE.has(parts[parts.length - 1])
  }
  const rel = absPath.slice(cwd.length + 1).replace(/\/\*+$/, '')
  return rel.split('/').some(seg => REBUILDABLE.has(seg))
}

const fwd = (p: string): string => (looksWin(p) ? p.replace(/\\/g, '/') : p)
const WIN_TEMP = /^[A-Za-z]:\/(Windows\/Temp|Users\/[^/]+\/AppData\/Local\/Temp)(\/|$)/i
const WIN_TEMP_INSIDE = /^[A-Za-z]:\/(Windows\/Temp|Users\/[^/]+\/AppData\/Local\/Temp)\/./i

export function isWinTempToken(raw: string): boolean {
  return /^(?:%(?:TEMP|TMP)%|\$env:(?:TEMP|TMP)|\$\{env:(?:TEMP|TMP)\}|%LOCALAPPDATA%[\\/]Temp|\$env:LOCALAPPDATA[\\/]Temp)[\\/]+[^\\/*]/i.test(raw)
}

// The Windows temp folders are not protected: check isInsideTemp first.
export type WinKind = 'drive' | 'system' | 'profile' | 'startup' | 'secrets'
export function winProtectedKind(absPath: string, home: string): WinKind | undefined {
  const ps = parts(absPath, 'win32')
  const root = ps[0] ?? ''
  if (!looksWin(absPath) && !looksWin(root)) return undefined
  if (ps.length <= 1) return 'drive'
  const first = (ps[1] ?? '').toLowerCase()
  if (ps.length === 2 && root.startsWith('\\\\')) return 'drive'
  if (['windows', 'program files', 'program files (x86)', 'programdata'].includes(first)) return 'system'
  if (home !== '' && insideBy(absPath, home, 'win32')) return 'profile'
  if (first === 'users' && ps.length <= 3) return 'profile'
  const low = fwd(absPath).toLowerCase()
  if (/\/start menu\/programs\/startup(\/|$)/.test(low)) return 'startup'
  if (/\/\.(ssh|aws)(\/|$)/.test(low)) return 'secrets'
  return undefined
}

export const WIN_PROTECTED = ['~/Documents/WindowsPowerShell', '~/Documents/PowerShell', '~/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup']

export function isRebuildableWin(absPath: string, cwd: string): boolean {
  const base = absPath.replace(/[\\/]\*+$/, '')
  if (insideBy(cwd, base, 'win32') && insideBy(base, cwd, 'win32')) return false
  const ps = parts(base, 'win32')
  if (!insideBy(cwd, base, 'win32')) return ps.length >= 4 && REBUILDABLE.has(ps[ps.length - 1] ?? '')
  const rel = parts(cwd, 'win32').length
  return ps.slice(rel).some(seg => REBUILDABLE.has(seg))
}

export function isScratch(absPath: string): boolean {
  return /^\/(tmp|private\/tmp|var\/folders|private\/var\/folders|dev)(\/|$)/.test(absPath) || WIN_TEMP.test(fwd(absPath))
}

export function isInsideTemp(absPath: string): boolean {
  return /^\/(tmp|private\/tmp|var\/folders|private\/var\/folders)\/./.test(absPath.replace(/\/\*+$/, '')) || WIN_TEMP_INSIDE.test(fwd(absPath).replace(/\/\*+$/, ''))
}
