// The Preview card's eyes: Chrome takes a headless picture of the dev server page. Pure part; the programs run elsewhere.
// Measured with Chrome 154 on macOS: `--headless=new --screenshot` writes the picture in about a second and then Chrome does not exit, and neither does `--dump-dom`.
// `$.process.run` kills only its child on timeout and then rejects, losing the output, and Chrome's helpers survive.
// So Chrome starts from a constant `sh` script that sends output to files, waits for a done mark and ends; leftovers are ended by exact process number, never by name.
import { below, detectStyle, isAbsolute, lines as textLines, under } from './platform'
import type { Setting } from './settings'
import { PREVIEW_AUTO_LABEL, PREVIEW_AUTO_NOTE } from './previewwords'
import { pad2 } from './words'
import { langNow, t, tEn, tr } from '../i18n/t'
import { fillIn } from './fillin'
import type { ProcPlatform } from './procs'


export const EYES_SETTINGS: Setting[] = [
  // On by default: an edit of a screen file makes the card say "Changed – look now"; no picture is taken by itself.
  {
    key: 'preview.auto',
    group: 'Page pictures',
    label: PREVIEW_AUTO_LABEL,
    note: PREVIEW_AUTO_NOTE,
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]

export const LOOK_WHAT = 'Took pictures of a page'


export type Width = 390 | 768 | 1280
// A picture shows the top of the page, as high as the window.
const VIEW: Record<Width, { h: number; label: string; short: string }> = {
  390: { h: 844, label: 'Phone', short: 'phone' },
  768: { h: 1024, label: 'Tablet', short: 'tablet' },
  1280: { h: 800, label: 'Desktop', short: 'desktop' },
}
const heightOf = (w: Width): number => VIEW[w].h
export const widthLabel = (w: Width): string => VIEW[w].label


export const LOOK_CAP = 6

// A quarter of a second per unit; the engine stops the whole run a little later.
export const SHOT_QUARTERS = 80
const RUN_EXTRA_MS = 8_000
export const PROBE_MS = 5_000

export const lastKey = (root: string, name: string, width: number): string => `cockpit:eyes:last:${root}|${name}|${width}`
export const urlKey = (root: string, name: string): string => `cockpit:eyes:url:${root}|${name}`


export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export const chromeProbe = (): string[] => ['test', '-x', CHROME]

export const NEED_CHROME = 'The Preview card needs Google Chrome. It was not found at /Applications/Google Chrome.app. Install it from google.com/chrome, then try again. Nothing else is needed.'

// Only a path made by `profilePath` may be deleted.
export const profilesDir = (home: string): string => under(home, '.claude/cockpit/eyes')
export const profilePath = (home: string, now: number, seq: number): string => under(profilesDir(home), `profile-${now}-${seq}`)
export function isOwnProfile(home: string, path: string): boolean {
  if (home === '' || path.includes('..')) return false
  if (detectStyle(home) === 'posix') return home.startsWith('/') && path.startsWith(`${profilesDir(home)}/profile-`) && !/\s/.test(path.slice(profilesDir(home).length))
  const rel = below(profilesDir(home), path)
  return isAbsolute(home) && rel !== path && rel.startsWith('profile-') && !/\s/.test(rel)
}

// `--no-sandbox` only where the caller says so (a Linux container or CI); never by default.
const CHROME_FLAGS = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--mute-audio']
// Pages that draw late get this much page time before the picture.
export const VIRTUAL_TIME_MS = 3_000

// Every outside address goes to a dead local proxy and loopback bypasses it, so the page reaches only this computer.
export const LOOPBACK_ONLY = ['--proxy-server=127.0.0.1:9', '--proxy-bypass-list=<-loopback>']
export const shotArgs = (profile: string, file: string, width: Width, url: string, noSandbox = false, loopbackOnly = false): string[] => [...CHROME_FLAGS, ...(noSandbox ? ['--no-sandbox'] : []), ...(loopbackOnly ? LOOPBACK_ONLY : []), `--user-data-dir=${profile}`, `--virtual-time-budget=${VIRTUAL_TIME_MS}`, `--screenshot=${file}`, `--window-size=${width},${heightOf(width)}`, url]

export const SHOT_MARK = 'bytes written to file' // en-only: a shell program and the text Chrome prints, not read by the person

// The script is constant; everything that varies is passed as arguments, never put into the text.
export const WRAP_SCRIPT = [
  'out=$1; mark=$2; limit=$3; shift 3', // en-only: a shell program and the text Chrome prints, not read by the person
  '"$@" >"$out" 2>"$out.err" </dev/null &', // en-only: a shell program and the text Chrome prints, not read by the person
  'pid=$!; n=0', // en-only: a shell program and the text Chrome prints, not read by the person
  'while [ "$n" -lt "$limit" ]; do', // en-only: a shell program and the text Chrome prints, not read by the person
  '  if cat "$out" "$out.err" 2>/dev/null | grep -Eq "$mark"; then break; fi', // en-only: a shell program and the text Chrome prints, not read by the person
  '  sleep 0.25; n=$((n + 1))',
  'done',
  'echo "$pid"', // en-only: a shell program and the text Chrome prints, not read by the person
].join('\n')

export const wrapArgv = (out: string, mark: string, quarters: number, args: readonly string[], chrome: string = CHROME): string[] => ['sh', '-c', WRAP_SCRIPT, 'eyes', out, mark, String(quarters), chrome, ...args]
export const wrapLimitMs = (quarters: number): number => quarters * 250 + RUN_EXTRA_MS

export const PS_ARGV = ['ps', '-axo', 'pid,command'] as const

export function pidsOfProfile(ps: string, profile: string, win = false): number[] {
  const needle = `--user-data-dir=${profile}`
  const out: number[] = []
  for (const line of textLines(ps)) {
    const m = /^\s*(\d+)\s+(.*)$/.exec(line)
    if (m === null) continue
    const cmd = m[2] ?? ''
    const at = cmd.indexOf(needle)
    if (at >= 0) {
      const after = cmd.charAt(at + needle.length)
      if (after === '' || after === ' ' || (win && (after === '"' || after === '\r'))) out.push(Number(m[1]))
      continue
    }
    // Measured on Windows (Chrome 154): the main and crash-handler processes hold `--user-data-dir=C:\x`, but the gpu and network helpers hold `--user-data-dir="C:\x"`.
    if (win && cmd.includes(`--user-data-dir="${profile}"`)) out.push(Number(m[1]))
  }
  return out
}


export function parseHashes(text: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const line of textLines(text)) {
    const m = /^([0-9a-f]{64})\s+(.+?)\s*$/.exec(line)
    if (m !== null) out.set(m[2] ?? '', m[1] ?? '')
  }
  return out
}

export function parseSizes(text: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const line of textLines(text)) {
    const m = /^(\d+)\s+(.+?)\s*$/.exec(line)
    if (m !== null) out.set(m[2] ?? '', Number(m[1]))
  }
  return out
}

// The exit code is not trusted: on Windows curl prints the code but exits 23.
export function parseReach(_exitCode: number, stdout: string): number | undefined {
  const n = Number(stdout.trim())
  return Number.isInteger(n) && n >= 100 ? n : undefined
}
// Windows curl.exe cannot write /dev/null (it tries a file \dev\null and exits 23): it takes the NUL device.
export const reachArgv = (url: string, plat: ProcPlatform = 'posix'): string[] => ['curl', '-s', '-o', plat === 'win32' ? 'NUL' : '/dev/null', '-w', '%{http_code}', '--max-time', '4', url] // en-only: program arguments


export function cleanName(raw: string): string | undefined {
  const n = raw.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 40).replace(/[-.]+$/, '')
  return n === '' ? undefined : n
}

function normalize(path: string): string {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return `/${out.join('/')}`
}


export function stamp(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
}

export const BASELINE = 'baseline'
export const eyesDir = (root: string): string => under(root, '.claude/cockpit-eyes')
export const shotFile = (name: string, width: number): string => `${name}-${width}.png`

export type Shot = { path: string; folder: string; name: string; width: Width }

export const newest = (shots: readonly Shot[], name: string, width: Width, count: number): Shot[] => shots.filter(s => s.folder !== BASELINE && s.name === name && s.width === width).slice(-count).reverse()
export const baselineOf = (shots: readonly Shot[], name: string, width: Width): Shot | undefined => shots.find(s => s.folder === BASELINE && s.name === name && s.width === width)


export const kb = (bytes: number): string => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)

export function pct(p: number): string {
  if (p === 0) return tr('0%')
  if (p < 0.05) return tr('under 0.1%')
  const shown = String(p >= 10 ? Math.round(p) : p.toFixed(1))
  return langNow() === 'sv' ? `${shown.replace('.', ',')}\u00a0%` : `${shown}%`
}

const wide = (w: number): string => fillIn(tr('{label}, {w} wide'), { label: tr(widthLabel(w as Width)), w })
// A size with the decimal mark of the language
const sizeText = (bytes: number): string => (langNow() === 'sv' ? kb(bytes).replace('.', ',') : kb(bytes))

export type Taken = { width: Width; status: 'saved' | 'unchanged' | 'failed'; path?: string; bytes?: number; why?: string }

export function lookText(url: string, name: string, taken: readonly Taken[], capped = false): string {
  const saved = taken.filter(t => t.status === 'saved').length
  const lines: string[] = []
  if (taken.length === 0) lines.push(capped ? fillIn(tr('No picture taken: {n} pictures were taken in this answer already.'), { n: LOOK_CAP }) : tr('No picture taken.'))
  else if (saved === 0 && taken.every(t => t.status === 'unchanged')) lines.push(fillIn(tr('Nothing changed on {url} (name: {name}). The pictures are the same as the last ones.'), { url, name }))
  else lines.push(fillIn(tr('Took {pictures} of {url} (name: {name}).'), { pictures: t('words.new_picture', { n: saved }), url, name }))
  for (const x of taken) {
    if (x.status === 'saved') lines.push(`${wide(x.width)}: ${x.path ?? ''}${x.bytes === undefined ? '' : ` (${sizeText(x.bytes)})`}`)
    else if (x.status === 'unchanged') lines.push(`${wide(x.width)}: ${tr('unchanged since the last picture')}${x.path === undefined ? '' : ` (${x.path})`}`)
    else lines.push(`${wide(x.width)}: ${tr('no picture')}${x.why === undefined ? '' : ` (${tr(x.why)})`}`)
  }
  if (taken.some(x => x.path !== undefined)) lines.push(tr('Look at them by reading the path.'), tr('A picture shows the top of the page, as high as the window, not the whole page.'))
  if (capped && taken.length > 0) lines.push(fillIn(tr('Some sizes were left out: at most {n} pictures per answer.'), { n: LOOK_CAP }))
  return lines.join('\n')
}

export type Compared = {
  width: Width
  newer?: string
  older?: string
  same?: boolean
  percent?: number
  sizeA?: { w: number; h: number }
  sizeB?: { w: number; h: number }
  bytesA?: number
  bytesB?: number
}

export const lookDetail = (name: string, saved: number): string => `${name}: ${tEn('words.new_picture', { n: saved })}.`

