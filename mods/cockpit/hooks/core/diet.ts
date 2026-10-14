// Instruction-file diet: sizes of the CLAUDE.md files, lines repeated across them, and what to trim. Names and counts only.
import { tr } from './lang'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { homeShown } from './platform'
import { tEn } from '../i18n/t'

export const DIET_SETTINGS: Setting[] = [
  {
    key: 'diet.mode',
    group: 'Cache',
    label: 'Instruction review',
    note: 'Tells you once a day if CLAUDE.md files are big.',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
]
export const DIET_HELP: HelpEntry[] = [{ title: 'Are my instruction files too big?', text: 'Claude reads your CLAUDE.md files at the start of every session and keeps them in mind on every answer. A big file costs usage all day. /vaken-help run diet lists the files, their size, and lines that appear twice.' }]

export const DIET_WHAT = 'Noticed big instruction files'
// About four characters make a token.
const CHARS_PER_TOKEN = 4
export const FILE_BIG_TOKENS = 4_000
export const TOTAL_HEAVY_TOKENS = 8_000
const MIN_LINE = 40

export type InstructionFile = { path: string; text: string }
type FileFact = { path: string; chars: number; tokens: number; lines: number; big: boolean }
export type Report = { files: FileFact[]; totalTokens: number; heavy: boolean; repeats: { line: string; paths: string[] }[]; longLines: number }

const tokensOf = (chars: number): number => Math.round(chars / CHARS_PER_TOKEN)
const normal = (l: string): string => l.trim().replace(/\s+/g, ' ').toLowerCase()

export function analyze(files: InstructionFile[]): Report {
  const facts: FileFact[] = files.map(f => ({ path: f.path, chars: f.text.length, tokens: tokensOf(f.text.length), lines: f.text.split(/\r?\n/).length, big: tokensOf(f.text.length) >= FILE_BIG_TOKENS }))
  const seen = new Map<string, Set<string>>()
  let longLines = 0
  for (const f of files) {
    for (const raw of f.text.split(/\r?\n/)) {
      if (raw.length > 400) longLines += 1
      const l = normal(raw)
      if (l.length < MIN_LINE || l.startsWith('#') || l.startsWith('|') || l.startsWith('```')) continue
      const paths = seen.get(l) ?? new Set<string>()
      paths.add(f.path)
      seen.set(l, paths)
    }
  }
  const repeats = [...seen.entries()].filter(([, p]) => p.size > 1).map(([line, p]) => ({ line, paths: [...p] }))
  const totalTokens = facts.reduce((n, f) => n + f.tokens, 0)
  return { files: facts, totalTokens, heavy: totalTokens >= TOTAL_HEAVY_TOKENS, repeats, longLines }
}

const k = (n: number): string => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))
const shortPath = (p: string, home: string): string => homeShown(p, home)

export function dietParts(r: Report, home: string): { lines: string[]; advice: string[] } {
  const lines = r.files.map(f => `${shortPath(f.path, home)}: about ${k(f.tokens)} tokens, ${f.lines} lines${f.big ? ' (big)' : ''}`)
  const advice: string[] = []
  if (r.heavy) advice.push(`Together they are heavy: Claude re-reads about ${k(r.totalTokens)} tokens on every answer. Trim what you do not need in most sessions.`)
  for (const f of r.files.filter(x => x.big)) advice.push(`${shortPath(f.path, home)} is big. Move rarely needed parts into separate notes that Claude reads only when asked.`)
  if (r.repeats.length > 0) advice.push(`${tEn('words.line', { n: r.repeats.length })} appear in more than one file. Keep each rule in one place. First: "${r.repeats[0].line.slice(0, 70)}"`)
  if (r.longLines > 0) advice.push(`${tEn('words.very_long_line', { n: r.longLines })}. Short lines are easier to keep right.`)
  return { lines, advice }
}

export function dietWords(s: string, t: (s: string) => string): string {
  const fi = (x: string, v: Record<string, string>): string => t(x).replace(/\{(\w+)\}/g, (m, key: string) => v[key] ?? m)
  let m = /^(.*): about (\S+) tokens, (\d+) lines( \(big\))?$/.exec(s)
  if (m !== null) return `${fi('{path}: about {tokens} tokens, {lines} lines', { path: m[1], tokens: m[2], lines: m[3] })}${m[4] === undefined ? '' : ` ${t('(big)')}`}`
  m = /^Together they are heavy: Claude re-reads about (\S+) tokens on every answer\. Trim what you do not need in most sessions\.$/.exec(s)
  if (m !== null) return fi('Together they are heavy: Claude re-reads about {tokens} tokens on every answer. Trim what you do not need in most sessions.', { tokens: m[1] })
  m = /^(.*) is big\. Move rarely needed parts into separate notes that Claude reads only when asked\.$/.exec(s)
  if (m !== null) return fi('{path} is big. Move rarely needed parts into separate notes that Claude reads only when asked.', { path: m[1] })
  m = /^(\d+) lines? appear in more than one file\. Keep each rule in one place\. First: "(.*)"$/.exec(s)
  if (m !== null) return fi(m[1] === '1' ? '1 line appears in more than one file. Keep each rule in one place. First: "{line}"' : '{n} lines appear in more than one file. Keep each rule in one place. First: "{line}"', { n: m[1], line: m[2] })
  m = /^(\d+) very long lines?\. Short lines are easier to keep right\.$/.exec(s)
  if (m !== null) return fi(m[1] === '1' ? '1 very long line. Short lines are easier to keep right.' : '{n} very long lines. Short lines are easier to keep right.', { n: m[1] })
  return t(s)
}

export const dietHeavy = (r: Report): boolean => r.heavy || r.files.some(f => f.big)
export const dietTokens = (n: number): string => k(n)

export function dietText(r: Report, home: string): string {
  if (r.files.length === 0) return 'No CLAUDE.md or AGENTS.md file found for this folder.'
  const { lines, advice } = dietParts(r, home)
  return [`Instruction files Claude reads in every session: ${r.files.length}, about ${k(r.totalTokens)} tokens together.`, ...lines.map(l => `  ${l}`), '', ...(advice.length === 0 ? ['They look light. Nothing to trim.'] : advice)].join('\n')
}

export const dietToast = (r: Report): string => tr('Your instruction files are about {k} tokens. Claude re-reads them every answer. /vaken-help run diet has the details.').replace('{k}', k(r.totalTokens))
