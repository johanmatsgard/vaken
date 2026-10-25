// Package guard: finds new packages in install commands, reads npm view output, warns about look-alike names.
import { commandsOf, flagsOf } from './guardshell'
import type { Cmd } from './guardshell'
import { tEn } from '../i18n/t'

type Eco = 'npm' | 'pip'
export type Install = { eco: Eco; names: string[] }

const NPM_TOOLS = new Set(['npm', 'pnpm', 'yarn', 'bun'])
const NPM_VERBS = new Set(['add', 'install', 'i'])

function npmName(spec: string): string | undefined {
  if (spec === '' || /^(\.|\/|~|file:|git\+|git:|https?:|github:|link:|workspace:|npm:)/.test(spec) || spec.includes('://')) return undefined
  const at = spec.indexOf('@', 1)
  const name = at > 0 ? spec.slice(0, at) : spec
  return /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i.test(name) ? name : undefined
}

function pipName(spec: string): string | undefined {
  if (/^(\.|\/|~|git\+|https?:|file:)/.test(spec) || spec.includes('://')) return undefined
  const m = /^([A-Za-z0-9][A-Za-z0-9._-]*)/.exec(spec)
  return m?.[1]
}

function fromCmd(c: Cmd): Install | undefined {
  const { positional } = flagsOf(c.args)
  if (NPM_TOOLS.has(c.prog)) {
    const verb = positional[0]?.t
    if (verb === undefined || !NPM_VERBS.has(verb)) return undefined
    if ((c.prog === 'yarn' || c.prog === 'pnpm' || c.prog === 'bun') && verb === 'install' && positional.length === 1) return undefined
    const names = positional.slice(1).map(t => npmName(t.t)).filter((n): n is string => n !== undefined)
    return names.length > 0 ? { eco: 'npm', names } : undefined
  }
  const isPip = c.prog === 'pip' || c.prog === 'pip3' || c.prog === 'uv' || (/^python[\d.]*$/.test(c.prog) && c.args[0]?.t === '-m' && c.args[1]?.t === 'pip')
  if (isPip) {
    const args = c.prog.startsWith('python') ? c.args.slice(2) : c.args
    const rest = c.prog === 'uv' ? args.filter(a => a.t !== 'pip') : args
    const f = flagsOf(rest)
    if (f.positional[0]?.t !== 'install' && f.positional[0]?.t !== 'add') return undefined
    const skip = new Set<string>()
    rest.forEach((a, i) => {
      if (a.t === '-r' || a.t === '-e' || a.t === '-c' || a.t === '--requirement' || a.t === '--editable' || a.t === '--constraint') {
        const next = rest[i + 1]
        if (next !== undefined) skip.add(next.t)
      }
    })
    const names = f.positional
      .slice(1)
      .filter(t => !skip.has(t.t))
      .map(t => pipName(t.t))
      .filter((n): n is string => n !== undefined)
    return names.length > 0 ? { eco: 'pip', names } : undefined
  }
  return undefined
}

export function parseInstalls(command: string): Install[] {
  const out: Install[] = []
  for (const c of commandsOf(command)) {
    const i = fromCmd(c)
    if (i !== undefined) out.push(i)
  }
  return out
}

const dep = (v: unknown): string[] => (typeof v === 'object' && v !== null ? Object.keys(v) : [])

export function packageJsonDeps(text: string): Set<string> | undefined {
  try {
    const j = JSON.parse(text) as Record<string, unknown>
    return new Set([...dep(j.dependencies), ...dep(j.devDependencies), ...dep(j.optionalDependencies), ...dep(j.peerDependencies)])
  } catch {
    return undefined
  }
}

export function pythonHas(text: string, name: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[-_.]+/g, '-')
  const target = norm(name)
  return text.split(/[\s,"'=<>!~;[\]()]+/).some(w => norm(w) === target)
}

// Optimal string alignment distance: insert, delete, replace or swap two neighbours each cost 1.
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min((d[i - 1]?.[j] ?? 0) + 1, (d[i]?.[j - 1] ?? 0) + 1, (d[i - 1]?.[j - 1] ?? 0) + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (d[i - 2]?.[j - 2] ?? 0) + 1)
      ;(d[i] as number[])[j] = v
    }
  }
  return d[a.length]?.[b.length] ?? 0
}

export const POPULAR_NPM = ['react', 'react-dom', 'lodash', 'express', 'axios', 'next', 'typescript', 'vue', 'webpack', 'eslint', 'prettier', 'jest', 'moment', 'chalk', 'commander', 'dotenv', 'tailwindcss', 'vite', 'zod', 'jquery', 'underscore', 'request', 'debug', 'uuid', 'redux', 'mongoose', 'prisma', 'rxjs', 'socket.io', 'angular', 'svelte', 'esbuild', 'rollup', 'cors', 'body-parser', 'nodemon', 'semver', 'yargs', 'minimist', 'glob', 'inquirer', 'colors', 'bluebird', 'async', 'classnames', 'date-fns', 'dayjs']
const POPULAR_PIP = ['requests', 'numpy', 'pandas', 'django', 'flask', 'boto3', 'urllib3', 'setuptools', 'pytest', 'scipy', 'matplotlib', 'pillow', 'sqlalchemy', 'fastapi', 'pydantic', 'tensorflow', 'torch', 'scikit-learn', 'beautifulsoup4', 'cryptography', 'pyyaml', 'jinja2', 'click', 'httpx', 'aiohttp', 'openai', 'anthropic', 'selenium', 'psycopg2', 'redis']

// Well-known packages whose names sit close to a popular one; they are real, so never a look-alike.
const KNOWN_REAL = new Set(['preact', 'nuxt', 'vuex', 'vitest', 'color', 'uid', 'args', 'jinja', 'boto', 'pandera', 'redis', 'chai'])

// Short names need distance 1 to avoid noise.
export function nearMiss(name: string, popular: readonly string[]): { target: string; distance: number } | undefined {
  const bare = name.replace(/^@[^/]+\//, '').toLowerCase()
  if (KNOWN_REAL.has(bare) && !name.startsWith('@')) return undefined
  let best: { target: string; distance: number } | undefined
  for (const p of popular) {
    if (bare === p) return undefined
    const d = editDistance(bare, p)
    const limit = p.length < 6 ? 1 : 2
    if (d >= 1 && d <= limit && (best === undefined || d < best.distance)) best = { target: p, distance: d }
  }
  return best
}

export type NpmInfo = { createdAt?: string; sizeBytes?: number; license?: string; deprecated?: string }

export function parseNpmView(stdout: string): NpmInfo | undefined {
  let j: unknown
  try {
    j = JSON.parse(stdout)
  } catch {
    return undefined
  }
  if (typeof j !== 'object' || j === null) return undefined
  const o = j as Record<string, unknown>
  const nested = (path: string[]): unknown => path.reduce<unknown>((acc, k) => (typeof acc === 'object' && acc !== null ? (acc as Record<string, unknown>)[k] : undefined), o)
  const pick = (dotted: string): unknown => (dotted in o ? o[dotted] : nested(dotted.split('.')))
  const created = pick('time.created')
  const size = pick('dist.unpacked-size')
  const license = pick('license')
  const deprecated = pick('deprecated')
  return {
    createdAt: typeof created === 'string' ? created : undefined,
    sizeBytes: typeof size === 'number' ? size : typeof size === 'string' && /^\d+$/.test(size) ? Number(size) : undefined,
    license: typeof license === 'string' ? license : typeof license === 'object' && license !== null ? String((license as { type?: unknown }).type ?? '') || undefined : undefined,
    deprecated: typeof deprecated === 'string' && deprecated !== '' ? deprecated : undefined,
  }
}

function ageDays(createdAt: string | undefined, now: number): number | undefined {
  if (createdAt === undefined) return undefined
  const t = Date.parse(createdAt)
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 86_400_000)) : undefined
}

const humanSize = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

export function describePackage(name: string, eco: Eco, info: NpmInfo | undefined, now: number): string {
  const popular = eco === 'npm' ? POPULAR_NPM : POPULAR_PIP
  const bits: string[] = []
  if (info === undefined) bits.push(eco === 'npm' ? 'could not check its age, size or licence' : 'its age, size and licence are not checked for Python packages')
  else {
    const age = ageDays(info.createdAt, now)
    bits.push(age === undefined ? 'age unknown' : age < 30 ? `only ${age} days old` : `${age} days old`)
    bits.push(info.sizeBytes === undefined ? 'size unknown' : `${humanSize(info.sizeBytes)} unpacked`)
    bits.push(info.license !== undefined ? `licence ${info.license}` : 'licence not stated')
    if (info.deprecated !== undefined) bits.push('marked deprecated by its author')
  }
  const near = nearMiss(name, popular)
  const warn = near !== undefined ? ` ${tEn('words.name_distance', { n: near.distance, target: near.target })}` : ''
  return `${name} (${bits.join(', ')}).${warn}`
}

export function isOdd(name: string, eco: Eco, info: NpmInfo | undefined, now: number): boolean {
  if (nearMiss(name, eco === 'npm' ? POPULAR_NPM : POPULAR_PIP) !== undefined) return true
  if (eco === 'pip') return false
  if (info === undefined) return false
  const age = ageDays(info.createdAt, now)
  return info.deprecated !== undefined || (age !== undefined && age < 30)
}

// `npm view` is slow and the same names come back on retry, so each answer is kept a day in one shared key. A name with no answer is kept ten minutes, so a retry does not wait again.
export const NPM_CACHE_KEY = 'cockpit:npm:view'
export const NPM_CACHE_MAX = 100
const NPM_ANSWER_MS = 24 * 3_600_000
export const NPM_MISS_MS = 10 * 60_000
// Past this the name counts as not checked in time (a warning, never a hold).
export const NPM_LOOKUP_MS = 4_000

type NpmCached = { at: number; info: NpmInfo | null }
type NpmCache = Record<string, NpmCached>

export function parseNpmCache(raw: unknown): NpmCache {
  const out: NpmCache = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [name, v] of Object.entries(raw as Record<string, unknown>)) {
    const c = v as NpmCached
    if (typeof c !== 'object' || c === null || typeof c.at !== 'number') continue
    out[name.slice(0, 214)] = { at: c.at, info: typeof c.info === 'object' && c.info !== null ? c.info : null }
  }
  return out
}

export function cachedNpm(cache: NpmCache, name: string, now: number): NpmCached | undefined {
  const c = cache[name]
  if (c === undefined || c.at > now) return undefined
  return now - c.at < (c.info === null ? NPM_MISS_MS : NPM_ANSWER_MS) ? c : undefined
}

export function withNpmAnswers(cache: NpmCache, answers: Record<string, NpmInfo | null>, now: number): NpmCache {
  const all: NpmCache = { ...cache }
  for (const [name, info] of Object.entries(answers)) all[name] = { at: now, info }
  const keep = Object.entries(all)
    .filter(([name]) => cachedNpm(all, name, now) !== undefined)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, NPM_CACHE_MAX)
  return Object.fromEntries(keep)
}

export function slowWords(names: readonly string[]): string {
  const one = names.length === 1
  const shown = `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''}`
  return `Vaken could not check ${shown} in time (the package registry was slow), so ${one ? 'its' : 'their'} age and licence are not known. Look ${one ? 'it' : 'them'} up before you rely on ${one ? 'it' : 'them'}.`
}
