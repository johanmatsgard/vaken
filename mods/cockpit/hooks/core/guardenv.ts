// Variable names check: env variable names the code reads against names the env files declare. A value is looked at once to tell empty from set and dropped; names only. The scan is a text search and misses names built at run time.
import type { Io } from './io'

const EXAMPLE_FILES = ['.env.example', '.env.sample', '.env.template', '.env.local.example', '.env.development.example']
const LOCAL_FILES = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.test', '.env.test.local', '.env.production', '.env.production.local']

const PLATFORM = new Set(['NODE_ENV', 'CI', 'PORT', 'HOME', 'PATH', 'PWD', 'TZ', 'HOSTNAME', 'USER', 'SHELL', 'TERM', 'LANG', 'DEBUG', 'MODE', 'BASE_URL', 'PROD', 'DEV', 'SSR', 'NEXT_RUNTIME', 'NEXT_PHASE'])
export const isPlatformName = (name: string): boolean => PLATFORM.has(name) || /^(VERCEL_|GITHUB_|NEXT_PUBLIC_VERCEL_|npm_)/.test(name)

type NameEntry = { name: string; hasValue: boolean }

export function parseEnvNames(text: string): NameEntry[] {
  const out: NameEntry[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line)
    if (m === null) continue
    let v = (m[2] ?? '').trim()
    if (v.startsWith('"') || v.startsWith("'")) {
      const q = v[0] ?? ''
      const close = v.indexOf(q, 1)
      v = close > 0 ? v.slice(1, close) : v.slice(1)
    } else if (v.startsWith('#')) {
      v = ''
    } else {
      const hash = v.search(/\s#/)
      if (hash >= 0) v = v.slice(0, hash)
      v = v.trim()
    }
    out.push({ name: m[1] ?? '', hasValue: v !== '' })
  }
  return out
}

const NM = '([A-Z][A-Z0-9_]*)'
const READS: RegExp[] = [
  new RegExp(`process\\.env\\.${NM}`, 'g'),
  new RegExp(`process\\.env\\[\\s*['"\`]${NM}['"\`]\\s*\\]`, 'g'),
  new RegExp(`import\\.meta\\.env\\.${NM}`, 'g'),
  new RegExp(`os\\.environ(?:\\.get)?\\s*[\\[(]\\s*['"]${NM}['"]`, 'g'),
  new RegExp(`os\\.getenv\\(\\s*['"]${NM}['"]`, 'g'),
  new RegExp(`\\bENV(?:\\.fetch)?\\s*[\\[(]\\s*['"]${NM}['"]`, 'g'),
  new RegExp(`os\\.Getenv\\(\\s*"${NM}"`, 'g'),
]

export function namesInCode(text: string): string[] {
  const seen = new Set<string>()
  for (const re of READS) {
    re.lastIndex = 0
    for (const m of text.matchAll(re)) if (m[1] !== undefined) seen.add(m[1])
  }
  for (const m of text.matchAll(/\{([^}]{1,400})\}\s*=\s*process\.env\b/g)) {
    for (const part of (m[1] ?? '').split(',')) {
      const n = /^\s*([A-Z][A-Z0-9_]*)\s*(?::|=|$)/.exec(part)
      if (n?.[1] !== undefined) seen.add(n[1])
    }
  }
  return [...seen].filter(n => !isPlatformName(n)).sort()
}

type Declared = { example: NameEntry[]; local: NameEntry[]; files: string[] }

export async function readDeclared(io: Io, root: string): Promise<Declared> {
  const out: Declared = { example: [], local: [], files: [] }
  for (const [list, files] of [
    [out.example, EXAMPLE_FILES],
    [out.local, LOCAL_FILES],
  ] as const) {
    for (const f of files) {
      try {
        list.push(...parseEnvNames(await io.read(`${root}/${f}`)))
        out.files.push(f)
      } catch {
        // a missing file is normal
      }
    }
  }
  return out
}

const declaredNames = (d: Declared): Set<string> => new Set([...d.example, ...d.local].map(e => e.name))

const uniq = (xs: string[]): string[] => [...new Set(xs)].sort()

export const isCodeFile = (path: string): boolean => /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go)$/.test(path) && !/(^|\/)node_modules\//.test(path)

export function undeclaredIn(text: string, d: Declared): string[] {
  if (d.files.length === 0) return []
  const declared = declaredNames(d)
  return namesInCode(text).filter(n => !declared.has(n))
}

const CAP = 40
const line = (label: string, names: string[], none: string): string[] =>
  names.length === 0 ? [`${label} (0): ${none}`] : [`${label} (${names.length}):`, `  ${names.slice(0, CAP).join(', ')}${names.length > CAP ? `, and ${names.length - CAP} more` : ''}`]

