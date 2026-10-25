// Error translator: finds a failed tool result's kind in a table of common errors and keeps only the kind, never the text.
import { hideSecrets, labelOf } from './guardcmds'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { fmt } from './fmt'
import { isShellTool } from './tools'
import { lastPart } from './platform'
import { fillIn } from './fillin'
import { langNow, tr } from './lang'

export const ERRORS_SETTINGS: Setting[] = [
  {
    key: 'errors.mode',
    group: 'Explain simply',
    label: 'Error translator',
    note: 'Explains a failed step in plain words.',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
]
export const ERRORS_HELP: HelpEntry[] = [{ title: 'What does this error mean?', text: 'When a step fails, /vaken-explain error says in plain words what went wrong and the first thing to try. It keeps only the kind of error, never the error text.' }]

type Known = { kind: string; pattern: RegExp; says: string; tryThis: string }

export const KNOWN: Known[] = [
  { kind: 'missing-file', pattern: /ENOENT|No such file or directory|cannot find the (file|path)/i, says: 'A file or folder it needs is not there.', tryThis: 'Check the name and the folder. Ask Claude to look for the right path.' },
  { kind: 'permission', pattern: /EACCES|EPERM|Permission denied|Operation not permitted/i, says: 'The computer would not let it touch that file or folder.', tryThis: 'Check who owns the file. Do not use sudo unless you are sure.' },
  { kind: 'command-missing', pattern: /command not found|not recognized as an internal or external command|not recognized as the name of a cmdlet|CommandNotFoundException|ENOENT.*spawn/i, says: 'A program it tried to run is not installed, or not on the path.', tryThis: 'Install the program, or ask Claude which program it needs.' },
  { kind: 'module-missing', pattern: /Cannot find module|Module not found|ModuleNotFoundError|No module named|cannot resolve/i, says: 'A code package it needs is not installed.', tryThis: 'Run the install step for the project (for example npm install), then try again.' },
  { kind: 'syntax', pattern: /SyntaxError|Unexpected token|parse error|invalid syntax/i, says: 'There is a typing mistake in the code, so the computer cannot read it.', tryThis: 'Ask Claude to fix the line that is named in the error.' },
  { kind: 'type-error', pattern: /TypeError|is not a function|undefined is not|cannot read propert/i, says: 'The code used something that was empty or the wrong kind.', tryThis: 'Ask Claude to find which value is empty, and why.' },
  { kind: 'port-busy', pattern: /EADDRINUSE|address already in use|port .* is already/i, says: 'Another program is already using that network port.', tryThis: 'Stop the other program, or pick another port.' },
  { kind: 'network', pattern: /ECONNREFUSED|ECONNRESET|ENOTFOUND|getaddrinfo|network is unreachable|Could not resolve host|timed out|ETIMEDOUT/i, says: 'It could not reach the other computer or website.', tryThis: 'Check your internet and the address. If it is a local server, check that it is running.' },
  { kind: 'auth', pattern: /\b401\b|\b403\b|Unauthorized|Forbidden|authentication failed|invalid (api )?key|not logged in/i, says: 'The service did not accept your login or key.', tryThis: 'Log in again, or check the key. Never paste a key into the chat.' },
  { kind: 'not-found', pattern: /\b404\b|Not Found/, says: 'The address it asked for does not exist.', tryThis: 'Check the address for a typo.' },
  { kind: 'rate-limit', pattern: /\b429\b|rate limit|too many requests/i, says: 'The service says there were too many requests.', tryThis: 'Wait a few minutes, then try again.' },
  { kind: 'server', pattern: /\b50[0-4]\b|Internal Server Error|Bad Gateway|Service Unavailable/i, says: 'The other service had a problem. It is not your code.', tryThis: 'Wait and try again. If it keeps failing, check the service status page.' },
  { kind: 'git-conflict', pattern: /CONFLICT|merge conflict|Automatic merge failed|would be overwritten/i, says: 'Two sets of changes touch the same lines, and git cannot choose.', tryThis: 'Ask Claude to show the conflict and help you pick. Do not discard work.' },
  { kind: 'git-push', pattern: /non-fast-forward|rejected.*push|failed to push|Updates were rejected/i, says: 'The remote has changes you do not have yet.', tryThis: 'Pull first. Do not force the push.' },
  { kind: 'test-failed', pattern: /\d+ failed|FAIL |AssertionError|Tests?:\s+\d+ failed|test failed/i, says: 'A test did not pass.', tryThis: 'Ask Claude which test failed and why. Do not let it skip the test.' },
  { kind: 'out-of-memory', pattern: /out of memory|heap out of memory|ENOMEM|Killed\b/i, says: 'The computer ran out of memory.', tryThis: 'Close other programs, or run fewer agents at once.' },
  { kind: 'disk-full', pattern: /ENOSPC|No space left on device/i, says: 'The disk is full.', tryThis: 'Free some space, then try again.' },
]

export function classify(text: string): Known | undefined {
  return KNOWN.find(k => k.pattern.test(text))
}

// The main loop's last step, in memory: `failed` while its last step was a failed shell step, `kind` only, never the text; `told` once its toast was decided.
export const shellFail: { failed: boolean; kind?: string; told: boolean; toastAt?: number } = { failed: false, told: true }
export function noteShellStep(ok: boolean, shell: boolean, kind: string | undefined): void {
  shellFail.failed = !ok && shell
  shellFail.kind = shellFail.failed ? kind : undefined
  if (shellFail.failed) shellFail.told = false
}

export type Last = { at: number; tool: string; kind: string }
export const lastKey = (sessionId: string): string => `cockpit:error:${sessionId}`

const ago = (ms: number): string => fmt.ago(ms, 'hours')

export function errorWords(last: Last | undefined, now: number): string {
  if (last === undefined) return tr('No failed step in this session, or the error was of a kind vaken does not know.')
  const k = KNOWN.find(x => x.kind === last.kind)
  if (k === undefined) return tr('The last failed step was of a kind vaken does not know. Ask Claude to explain it in plain words.')
  return fillIn(tr('{tool} failed {ago}.\nWhat it means: {says}\nFirst thing to try: {tryThis}'), { tool: last.tool, ago: fmt.ago(now - last.at, 'hours', langNow()), says: tr(k.says), tryThis: tr(k.tryThis) })
}

export type Failed = { at: number; what: string; exit?: number; kind?: string }
export const failedKey = (sessionId: string): string => `cockpit:failed:${sessionId}`
const FAILED_TTL_MS = 30 * 60_000
const FAILED_WHAT_MAX = 120

// Values after = are dropped whatever the key, since an environment value may be a secret.
const dropValues = (t: string): string => t.replace(/(^|[\s;&|(])([A-Za-z_][A-Za-z0-9_]*)=(?:"[^"]*"|'[^']*'|\S*)/g, '$1$2=…')

export function failedWhat(tool: string, args: { command?: unknown; path?: unknown }): string {
  const clip = (t: string): string => (t.length > FAILED_WHAT_MAX ? `${t.slice(0, FAILED_WHAT_MAX - 1)}…` : t)
  if (isShellTool(tool) && typeof args.command === 'string') return clip(dropValues(hideSecrets(labelOf(args.command))))
  const name = typeof args.path === 'string' && !/[\\/]$/.test(args.path) ? lastPart(args.path) : ''
  return clip(name === '' ? tool : `${tool} ${name}`)
}

export function exitOf(text: string): number | undefined {
  const m = /^Exit code (-?\d+)/.exec(text.trimStart())
  return m === null ? undefined : Number(m[1])
}

export function parseFailed(v: unknown): Failed | undefined {
  const o = v as Failed
  if (typeof o !== 'object' || o === null || typeof o.at !== 'number' || typeof o.what !== 'string') return undefined
  return { at: o.at, what: o.what.slice(0, FAILED_WHAT_MAX), ...(typeof o.exit === 'number' ? { exit: o.exit } : {}), ...(typeof o.kind === 'string' ? { kind: o.kind.slice(0, 24) } : {}) }
}

export function failedLine(f: Failed | undefined, now: number): string | undefined {
  if (f === undefined || now < f.at || now - f.at >= FAILED_TTL_MS || f.what === '') return undefined
  const says = KNOWN.find(k => k.kind === f.kind)?.says
  const facts = [f.exit === undefined ? undefined : `exit ${f.exit}`, says === undefined ? undefined : `${says.charAt(0).toLowerCase()}${says.slice(1).replace(/\.$/, '')}`, ago(now - f.at)].filter((x): x is string => x !== undefined)
  return `Keep the last failing step and what was tried: ${f.what} (${facts.join(', ')}).` // en-only: a line in the compaction note for Claude
}
