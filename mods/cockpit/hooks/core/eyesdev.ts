// Dev-server truth: is something listening, does it answer, is the answer an error page. Only the first 300 characters of a page are read, never printed or kept.
import { lines } from './platform'
import { langNow, tr } from '../i18n/t'
import { fillIn } from './fillin'

export const DEV_PORTS: readonly number[] = [3000, 3001, 4173, 5173, 8000, 8080]
export const DEV_TIMEOUT_S = 3
export const BODY_HEAD = 300

export const lsofArgv = (port: number): string[] => ['lsof', '-nP', `-iTCP:${port}`, '-sTCP:LISTEN']
export const curlArgv = (port: number): string[] => ['curl', '-s', '--max-time', String(DEV_TIMEOUT_S), '-w', '\n%{http_code} %{time_total}', `http://localhost:${port}/`]

export type Listener = { command: string; pid: number }

// All the usual ports in one `lsof` run, since six runs every 30 s would be most of vaken's own programs.
export const lsofAllArgv = (): string[] => ['lsof', '-nP', `-iTCP:${DEV_PORTS.join(',')}`, '-sTCP:LISTEN']
export function parseListeners(exitCode: number, text: string): Map<number, Listener> {
  const out = new Map<number, Listener>()
  if (exitCode !== 0) return out
  for (const line of lines(text)) {
    const m = /^(\S+)\s+(\d+)\s+\S+.*:(\d+)\s+\(LISTEN\)/.exec(line)
    if (m !== null && m[1] !== 'COMMAND' && !out.has(Number(m[3]))) out.set(Number(m[3]), { command: (m[1] ?? '').replace(/\\x20/g, ' '), pid: Number(m[2]) })
  }
  return out
}

export const lsofCwdArgv = (pids: readonly number[]): string[] => ['lsof', '-nP', '-a', '-p', pids.join(','), '-d', 'cwd', '-Fpn']
export function parseCwds(exitCode: number, text: string): Map<number, string> {
  const out = new Map<number, string>()
  if (exitCode !== 0 && text.trim() === '') return out
  let pid: number | undefined
  for (const line of lines(text)) {
    if (line.startsWith('p')) pid = Number(line.slice(1))
    else if (line.startsWith('n') && pid !== undefined && Number.isFinite(pid)) out.set(pid, line.slice(1))
  }
  return out
}
// /private/var and /var are one place on a Mac.
const flat = (p: string): string => p.replace(/^\/private(?=\/)/, '').replace(/\/+$/, '')
export const inProject = (cwd: string, root: string): boolean => {
  const c = flat(cwd)
  const r = flat(root)
  return r !== '' && (c === r || c.startsWith(`${r}/`))
}

// `lsof` with no listener prints nothing and exits 1.
export function parseLsof(exitCode: number, text: string): Listener | undefined {
  if (exitCode !== 0) return undefined
  for (const line of lines(text)) {
    const m = /^(\S+)\s+(\d+)\s+\S+/.exec(line)
    if (m !== null && m[1] !== 'COMMAND') return { command: (m[1] ?? '').replace(/\\x20/g, ' '), pid: Number(m[2]) }
  }
  return undefined
}

export type Reply = { status: number; seconds: number; head: string }

export function parseCurl(exitCode: number, stdout: string): Reply | undefined {
  const cut = stdout.lastIndexOf('\n')
  const tail = /^(\d{3})\s+(\d+(?:\.\d+)?)\s*$/.exec(stdout.slice(cut + 1))
  if (exitCode !== 0 || tail === null || tail[1] === '000') return undefined
  return { status: Number(tail[1]), seconds: Number(tail[2]), head: stdout.slice(0, Math.min(cut < 0 ? 0 : cut, BODY_HEAD)) }
}

const ERROR_WORDS: ReadonlyArray<[RegExp, string]> = [
  [/Unhandled Runtime Error/i, 'Unhandled Runtime Error'], // en-only: words searched for in the page, quoted as the page writes them
  [/Cannot GET/i, 'Cannot GET'], // en-only: words searched for in the page, quoted as the page writes them
  [/Internal Server Error/i, 'Internal Server Error'], // en-only: words searched for in the page, quoted as the page writes them
  [/Application error/i, 'Application error'], // en-only: words searched for in the page, quoted as the page writes them
  [/Traceback \(most recent call last\)/i, 'Traceback'], // en-only: words searched for in the page, quoted as the page writes them
  [/\bECONNREFUSED\b/, 'ECONNREFUSED'],
  [/\bError\b/, 'Error'],
]

export function errorWords(head: string): string[] {
  const hits = ERROR_WORDS.filter(([re]) => re.test(head)).map(([, w]) => w)
  return hits.length > 1 ? hits.filter(w => w !== 'Error') : hits
}

// The error the page names, short and in whole words ("TypeError: Cannot read properties of undefined"), else the first error word found; '' when none.
export const SNIPPET_MAX = 60
export function errorSnippet(head: string): string {
  const text = head.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const named = /\b([A-Z][A-Za-z]*(?:Error|Exception)):\s*([^.<]*)/.exec(text)
  const found = named === null ? (errorWords(head).find(w => w !== 'Error') ?? '') : `${named[1]}: ${(named[2] ?? '').trim()}`.replace(/:\s*$/, '')
  if (found.length <= SNIPPET_MAX) return found
  const words = found.slice(0, SNIPPET_MAX).split(' ')
  return `${words.slice(0, -1).join(' ')}…`
}

const secs = (s: number): string => {
  const text = s < 10 ? s.toFixed(2) : s.toFixed(1)
  return langNow() === 'sv' ? text.replace('.', ',') : text
}

export function devLine(port: number, who: Listener | undefined, reply: Reply | undefined): string {
  if (who === undefined) return fillIn(tr('Port {port}: nothing listens.'), { port })
  if (reply === undefined) return fillIn(tr('Port {port}: something listens ({command}), but it did not answer in {s} s.'), { port, command: who.command, s: DEV_TIMEOUT_S })
  const words = errorWords(reply.head)
  const status = reply.status
  const holds = words.length > 0 ? ` ${fillIn(tr('The page text holds: {words}.'), { words: words.join(', ') })}` : ''
  if (status >= 500) return `${fillIn(tr('Port {port}: something listens, but it answers {status}: the page shows an error.'), { port, status })}${holds}`
  if (status >= 400) return `${fillIn(tr(status === 404 ? 'Port {port}: something listens, but it answers {status}: the page was not found.' : 'Port {port}: something listens, but it answers {status}: the page was refused.'), { port, status })}${holds}`
  if (words.length > 0) return fillIn(tr('Port {port}: something listens and answers {status} in {time} s, but the start of the page holds: {words}. The page may show an error.'), { port, status, time: secs(reply.seconds), words: words.join(', ') })
  return fillIn(tr('Port {port}: up, answers {status} in {time} s.'), { port, status, time: secs(reply.seconds) })
}
