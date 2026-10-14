// Proof, the risk half: file kind, how risky a finished change is, the review queue and reviewer heat. Pure over counts; no file content is read.

import { hhmm } from './time'
import { detectStyle, parts as pathParts } from './platform'
import { tEn } from '../i18n/t'

export type RiskKind = 'ci' | 'migration' | 'security' | 'config'
export type Receipt2 = 'ok' | 'failed' | 'unclear' | 'missing'

export type FileInfo = { n: number; lines: number; turns: number[]; test: boolean; code: boolean; risk: RiskKind[]; turnN: number }

export type Change = { turn: number; at: number; files: number; lines: number; code: number; tests: boolean; risk: RiskKind[]; receipt: Receipt2; names: string[] }


const SEP = '(?:^|[/._-])'
const END = '(?:[/._-]|$)'
const RULES: { kind: RiskKind; re: RegExp }[] = [
  { kind: 'ci', re: /(?:^|\/)(?:\.github|\.gitlab|\.circleci|\.buildkite)\/|(?:^|\/)(?:Dockerfile[^/]*|Jenkinsfile|docker-compose[^/]*|\.gitlab-ci\.ya?ml|azure-pipelines\.ya?ml)$/i },
  { kind: 'migration', re: /(?:^|\/)(?:migrations?|alembic)\/|\.sql$|(?:^|\/)schema\.prisma$/i },
  { kind: 'security', re: new RegExp(`${SEP}(?:auth|authn|authz|authentication|authorization|security|secrets?|credentials?|permissions?|crypto|oauth|sso|acl|passwords?|token)${END}|\\.(?:pem|key|crt)$|(?:^|/)\\.env`, 'i') },
  { kind: 'config', re: /(?:^|\/)(?:package(?:-lock)?\.json|tsconfig[^/]*\.json|[^/]*\.config\.[cm]?[jt]s|\.eslintrc[^/]*|settings\.json|plugin\.json|\.npmrc|pnpm-lock\.ya?ml|yarn\.lock|Gemfile|requirements\.txt|pyproject\.toml|Cargo\.toml|go\.mod|Makefile)$|\.(?:ya?ml|toml|ini)$/i },
]

export const riskOf = (path: string): RiskKind[] => RULES.filter(r => r.re.test(path)).map(r => r.kind)
const RISK_POINTS: Record<RiskKind, number> = { ci: 3, migration: 3, security: 3, config: 2 }
const RISK_WORD: Record<RiskKind, string> = { ci: 'CI or build files', migration: 'a migration or database file', security: 'security-related files', config: 'config files' }

const TEST_PATH = /(?:^|\/)(?:tests?|__tests__|specs?)\/|\.(?:test|spec)\.[a-z0-9]+$|(?:^|\/)test_[^/]*\.py$|_test\.(?:go|py)$/i
export const isTestPath = (path: string): boolean => TEST_PATH.test(path)
export const isCodePath = (path: string): boolean => /\.(?:tsx?|jsx?|mjs|cjs|py|go|rs|swift|java|kt|rb|php|c|cc|cpp|h|hpp|cs|sh|vue|svelte)$/i.test(path)

// A short name a person can read, never more of the path.
export const folderOf = (path: string): string => {
  const at = detectStyle(path) === 'win32' ? Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) : path.lastIndexOf('/')
  return at <= 0 ? '/' : path.slice(0, at)
}
export const shortName = (path: string): string => {
  const parts = pathParts(path)
  return parts.length === 0 ? '/' : parts.slice(-2).join(detectStyle(path) === 'win32' ? '\\' : '/')
}


const sizePoints = (lines: number): number => (lines >= 500 ? 3 : lines >= 200 ? 2 : lines >= 50 ? 1 : 0)

type Score = { score: number; level: 'high' | 'medium' | 'low'; reasons: string[] }

export function scoreChange(c: Pick<Change, 'lines' | 'code' | 'tests' | 'risk' | 'receipt'>): Score {
  const reasons: string[] = []
  let score = 0
  const risk = Math.min(6, c.risk.reduce((n, k) => n + RISK_POINTS[k], 0))
  if (risk > 0) {
    score += risk
    reasons.push(`it touches ${c.risk.map(k => RISK_WORD[k]).join(' and ')}`)
  }
  const size = sizePoints(c.lines)
  if (size > 0) {
    score += size
    reasons.push(`it is big (${c.lines} lines changed)`)
  }
  if (c.code > 0 && !c.tests) {
    score += 2
    reasons.push('no test file was touched')
  }
  if (c.receipt === 'failed') {
    score += 3
    reasons.push('a check failed')
  } else if (c.receipt === 'missing') {
    score += 2
    reasons.push('no passing check after the last edit')
  } else if (c.receipt === 'unclear') {
    score += 1
    reasons.push('a check ran but its result is not clear')
  }
  return { score, level: score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low', reasons }
}

// `waiting`: how many of the newest wait for a look.
export function queueLines(changes: Change[], waiting: number): string[] {
  if (changes.length === 0) return ['Review queue: empty. No finished answer has changed a file yet.']
  const newest = waiting <= 0 ? [] : changes.slice(-waiting).map(c => c.turn)
  const rows = changes
    .map(c => ({ c, s: scoreChange(c) }))
    .sort((a, b) => b.s.score - a.s.score || b.c.turn - a.c.turn)
  const lines = [`Review queue: ${tEn('words.finished_change', { n: changes.length })}, riskiest first.`]
  rows.forEach(({ c, s }, n) => {
    const what = `${tEn('words.file', { n: c.files })}, ${c.lines} lines${c.names.length === 0 ? '' : ` (${c.names.join(', ')}${c.files > c.names.length ? ', ...' : ''})`}`
    lines.push(`${n + 1}. ${s.level.toUpperCase()}: ${what}, ${hhmm(c.at)}${newest.includes(c.turn) ? ', new since your last message' : ''}`)
    lines.push(`   ${s.reasons.length === 0 ? 'Why: nothing stands out.' : `Why: ${s.reasons.join('; ')}.`}`)
  })
  lines.push('Risk comes from the kind of file, the size, a missing test and a missing or failing check. It does not say the change is wrong.')
  return lines
}


type Hot = { path: string; score: number; n: number; lines: number; risk: RiskKind[]; untested: boolean }

// The turn counter is the same for every file.
export function heatOf(files: Record<string, FileInfo>, testTurns: number[]): Hot[] {
  return Object.entries(files)
    .filter(([, f]) => !f.test)
    .map(([path, f]) => {
      const risk = f.risk
      const score = Math.min(10, f.n) + sizePoints(f.lines) + Math.min(6, risk.reduce((n, k) => n + RISK_POINTS[k], 0))
      return { path, score, n: f.n, lines: f.lines, risk, untested: f.code && !f.turns.some(t => testTurns.includes(t)) }
    })
    .sort((a, b) => b.score - a.score || b.n - a.n || a.path.localeCompare(b.path))
}

const HEAT_SHOW = 8

export function heatLines(files: Record<string, FileInfo>, testTurns: number[]): string[] {
  const hot = heatOf(files, testTurns)
  if (hot.length === 0) return ['Reviewer heat: no changed file yet.']
  const lines = [`Where to look first (${tEn('words.changed_file', { n: hot.length })}, hottest first):`]
  hot.slice(0, HEAT_SHOW).forEach((h, n) => {
    const bits = [tEn('words.edit', { n: h.n }), `${h.lines} lines`]
    if (h.risk.length > 0) bits.push(`touches ${h.risk.map(k => RISK_WORD[k]).join(' and ')}`)
    lines.push(`${n + 1}. ${shortName(h.path)}: ${bits.join(', ')}${h.untested ? '. No test file was touched in the same turn.' : '.'}`)
  })
  if (hot.length > HEAT_SHOW) lines.push(`... and ${hot.length - HEAT_SHOW} more.`)
  const untested = hot.filter(h => h.untested).length
  lines.push(untested === 0 ? 'Every changed code file had a test file touched in the same turn.' : `${tEn('words.changed_code_file', { n: untested })} had no test file touched in the same turn.`)
  lines.push('Heat is counted from edits, size and the kind of file. It does not read the code.')
  return lines
}
