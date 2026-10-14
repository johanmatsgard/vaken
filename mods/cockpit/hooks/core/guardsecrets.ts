// The secret tripwire: names the kind of secret read, printed or sent, never its value. A speed bump, not a lock.
import { basename, commandsOf, flagsOf } from './guardshell'
import type { Cmd } from './guardshell'
import { splitArgs } from './guardwin'
import { commandFlavorOfTool } from './tools'
import type { ShellFlavor } from './tools'

type SecretHit = { kind: string }

const FORMATS: { kind: string; re: RegExp }[] = [
  { kind: 'an AWS-style key id', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { kind: 'a GitHub-style token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { kind: 'a GitHub-style token', re: /\bgithub_pat_[A-Za-z0-9_]{50,}\b/g },
  { kind: 'a Slack-style token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { kind: 'a payment-service key', re: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { kind: 'a payment-service webhook secret', re: /\bwhsec_[A-Za-z0-9]{20,}\b/g },
  { kind: 'a Google-style API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: 'an Anthropic-style API key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { kind: 'an API key that starts with sk-', re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { kind: 'a package-registry token', re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { kind: 'a mail-service key', re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g },
  // A token starts only where its run starts: a \b start would retry at every -eyJ of one long run.
  { kind: 'a signed login token (JWT)', re: /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { kind: 'a private key', re: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY(?: BLOCK)?-----[\sA-Za-z0-9+/=\\]{40,}/g },
  { kind: 'a password inside a web address', re: /(?<![\w+.-])[\w+.-]+:\/\/[^\s:@/'"]+:([^\s:@/'"]{4,})@[^\s/'"]+/g },
]

// `<[^<>]*>` and not `<[^>]*>`, since a run of < would be re-read from each one.
const PLACEHOLDER = /(?:example|placeholder|changeme|change[-_]me|your[-_]|xxxx|dummy|fake|replace|redacted|todo|<[^<>]*>|^\$\{?[A-Za-z_(]|process\.env|os\.environ|\.\.\.|\*{3,}|password|passwd|user:pass)/i
const STAND_IN = /^(?:pass|pwd|pw|secret|token|key|apikey|api_key)$/i
function isPlaceholder(value: string): boolean {
  return PLACEHOLDER.test(value) || STAND_IN.test(value) || /^(.)\1+$/.test(value)
}
// A random key can hold todo, fake or xxxx by chance, so a placeholder word must stand as a word of its own in NAME=value.
const PLACEHOLDER_WORD = /example|placeholder|changeme|change[-_]me|your[-_]|x{4,}|dummy|fake|replace|redacted|todo|password|passwd/gi
const PLACEHOLDER_SHAPE = /<[^<>]*>|^\$\{?[A-Za-z_(]|process\.env|os\.environ|\.\.\.|\*{3,}|user:pass/i
const isLetter = (c: string | undefined): boolean => c !== undefined && /[A-Za-z]/.test(c)
function isPlaceholderValue(value: string): boolean {
  if (PLACEHOLDER_SHAPE.test(value) || STAND_IN.test(value) || /^(.)\1+$/.test(value)) return true
  for (const m of value.matchAll(PLACEHOLDER_WORD)) {
    const at = m.index ?? 0
    const w = m[0]
    const before = value[at - 1]
    const after = value[at + w.length]
    const startOk = !isLetter(before) || (/[a-z]/.test(before ?? '') && /[A-Z]/.test(w[0] ?? ''))
    const endOk = !isLetter(after) || /[-_]$/.test(w) || (/[a-z]/.test(w[w.length - 1] ?? '') && /[A-Z]/.test(after ?? ''))
    if (startOk && endOk) return true
  }
  return false
}

// The name is matched whole and its secret word tested after: a secret word inside the pattern would be tried at every place in a long name.
const ENV_ASSIGN = /(?:^|[\s;&(])(?:export\s+)?([A-Z][A-Z0-9_]*)\s?=\s?(["']?)([^\s"'#]{16,})\2/g
const SECRET_WORD = /SECRET|TOKEN|KEY|PASSWORD|PASSWD/
// PWD alone is the shell's folder, so it counts only after an underscore.
const CREDENTIAL_NAME = /SECRET|TOKEN|PASSW(?:OR)?D|CREDENTIAL|(?:^|_)(?:API|ACCESS|PRIVATE|SIGNING|MASTER|ENCRYPTION|SESSION)?(?:KEYS?|AUTH)(?:_|\d|$)|_PWD(?:_|\d|$)/
const isPublicName = (name: string): boolean => /(?:^|_)(?:PUBLIC|PUBLISHABLE|ANON)(?:_|$)/.test(name) || /PUBLIC_KEY$/.test(name)

function entropy(v: string): number {
  const n = new Map<string, number>()
  for (const ch of v) n.set(ch, (n.get(ch) ?? 0) + 1)
  let bits = 0
  for (const k of n.values()) bits -= (k / v.length) * Math.log2(k / v.length)
  return bits
}

// Read once left to right, with no pattern that could retry a long run.
type Part = { t: string; cut: boolean; whole: boolean }
const isDigit = (c: string): boolean => c >= '0' && c <= '9'
const isUpper = (c: string): boolean => c >= 'A' && c <= 'Z'
const isLower = (c: string): boolean => c >= 'a' && c <= 'z'
function partsOf(v: string): Part[] {
  const out: Part[] = []
  for (const piece of v.split(/[-_]/)) {
    let i = 0
    let cut = true
    while (i < piece.length) {
      const c = piece[i] ?? ''
      let j = i + 1
      if (isDigit(c) || ((c === 'v' || c === 'V') && isDigit(piece[j] ?? ''))) {
        while (j < piece.length && isDigit(piece[j] ?? '')) j++
      } else if (isUpper(c)) {
        while (j < piece.length && isUpper(piece[j] ?? '')) j++
        if (j - i > 1 && isLower(piece[j] ?? '')) j--
        else while (j < piece.length && isLower(piece[j] ?? '')) j++
      } else {
        while (j < piece.length && isLower(piece[j] ?? '')) j++
      }
      const t = piece.slice(i, j)
      out.push({ t, cut, whole: i === 0 && j === piece.length })
      cut = !isDigit(t[t.length - 1] ?? '')
      i = j
    }
  }
  return out
}

const VOWEL = /[aeiouy]/i
const isVersion = (t: string): boolean => /^[vV]\d{1,3}$/.test(t)
function isWord(t: string): boolean {
  if (t.length < 2 || !/^[A-Z]?[a-z]+$/.test(t)) return false
  const vowels = (t.toLowerCase().match(/[aeiou]/g) ?? []).length + (t.slice(1).match(/y/g) ?? []).length
  return vowels >= 1 && vowels * 4 >= t.length
}

// A run of lower case and digits, like a hex or base36 key, is one blob, never a name.
export function wordName(v: string): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return false
  const digits = (v.match(/\d/g) ?? []).length
  if (digits > 4) return false
  const parts = partsOf(v)
  if (parts.length < 2 || parts.filter(p => isDigit(p.t[0] ?? '')).length > 2) return false
  const ok = (p: Part, i: number): boolean =>
    /^\d{1,4}$/.test(p.t) || isVersion(p.t) || isWord(p.t) || (digits === 0 && /^[A-Z]{2,5}$/.test(p.t)) || (i === 0 && p.whole && /^[A-Z]$/.test(p.t))
  if (parts.filter(p => /^[A-Z]{2,}$/.test(p.t)).length > 1) return false
  const letters = parts.filter(p => /^[A-Za-z]+$/.test(p.t))
  const words = letters.filter(p => p.cut)
  return parts.every(ok) && letters.some(p => isWord(p.t) && /[a-z]/.test(p.t)) && words.length >= 2 && letters.map(p => p.t).join('').length / letters.length >= 3
}

function strictCodeName(v: string): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return false
  const parts = partsOf(v)
  const versions = parts.filter(p => isVersion(p.t)).length
  const hasDigitPart = parts.some(p => isDigit(p.t[0] ?? ''))
  if (parts.length < 2 || hasDigitPart || versions > 1 || isVersion(parts[0]?.t ?? '')) return false
  const caps = (t: string): boolean => versions === 0 && /^[A-Z]{2,}$/.test(t) && (t.length <= 5 || VOWEL.test(t))
  return parts.every(p => isVersion(p.t) || isWord(p.t) || caps(p.t)) && parts.some(p => isWord(p.t) && /[a-z]/.test(p.t))
}

const strictPath = (v: string): boolean => v.split('/').every(p => p === '' || isVersion(p) || /^[A-Z]?[a-z][a-z_-]*$/.test(p) || strictCodeName(p))

export function looksRandom(v: string, strict = false): boolean {
  if (/[:.(){}$<>,;]/.test(v) || /^[~\\]/.test(v)) return false
  if (v.startsWith('/') && (!strict || strictPath(v))) return false
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return true
  const hex = /^[0-9a-f]{24,}$/i.test(v)
  if (strict) {
    if (v.includes('/') ? strictPath(v) : strictCodeName(v)) return false
    return entropy(v) >= 2 && (hex || /\d/.test(v) || (/[a-z]/.test(v) && /[A-Z]/.test(v)))
  }
  if (v.includes('/') && (v.length < 30 || v.split('/').some(p => /^[a-z]+(?:[-_][a-z0-9]+)*$/.test(p) && p.length >= 3))) return false
  if (/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/.test(v) || /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(v)) {
    if (!v.split(/[-_]/).some(p => p.length >= 16 && /\d/.test(p) && /[a-z]/i.test(p))) return false
  }
  const digits = (v.match(/\d/g) ?? []).length
  const parts = v.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/g) ?? []
  if (parts.length > 0 && v.length / parts.length >= 3 && /^[A-Za-z][A-Za-z0-9]*$/.test(v) && /[a-z]/.test(v) && digits <= 2) return false
  if (wordName(v)) return false
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[-_+/=]/].filter(r => r.test(v)).length
  return entropy(v) >= 3 && (hex || classes >= 3 || (v.length >= 20 && classes >= 2 && entropy(v) >= 3.5))
}

const FORMAT_ONCE = FORMATS.map(f => new RegExp(f.re.source))
const secretPair = (name: string, value: string): boolean => {
  const strict = CREDENTIAL_NAME.test(name)
  if ((!strict && !SECRET_WORD.test(name)) || isPublicName(name) || isPlaceholderValue(value) || FORMAT_ONCE.some(re => re.test(value))) return false
  return strict ? looksRandom(value, true) : /\d/.test(value) && looksRandom(value)
}

export function scanSecrets(text: string, known = ''): SecretHit[] {
  const kinds: string[] = []
  const add = (kind: string): void => void (kinds.includes(kind) || kinds.push(kind))
  const body = text.length > 200_000 ? text.slice(0, 200_000) : text
  for (const f of FORMATS) {
    for (const m of body.matchAll(f.re)) {
      const secret = m[1] ?? m[0]
      if (isPlaceholder(secret) || (known !== '' && known.includes(m[0]))) continue
      add(f.kind)
    }
  }
  for (const m of body.matchAll(ENV_ASSIGN)) {
    const value = m[3] ?? ''
    if (!secretPair(m[1] ?? '', value) || (known !== '' && known.includes(value))) continue
    add('a secret value in a variable')
  }
  return kinds.map(kind => ({ kind }))
}

export const MASKED = '[hidden]'
// The masking reads MASK_EDGE more characters before the cut, and a secret crossing the cut is masked whole, so no part of it shows.
const MASK_KEEP = 400_000
const MASK_EDGE = 65_536
export function maskSecrets(text: string): string {
  if (text.length <= MASK_KEEP) return maskFrom(text, 0).out
  const tail = text.slice(-(MASK_KEEP + MASK_EDGE))
  const { out, cut } = maskFrom(tail, tail.length - MASK_KEEP)
  return out.slice(Math.max(cut, out.length - MASK_KEEP - MASKED.length))
}

function maskFrom(text: string, cut: number): { out: string; cut: number } {
  let out = text
  let at = cut
  const pass = (re: RegExp, swap: (m: string, groups: unknown[]) => string): void => {
    let delta = 0
    let across: number | undefined
    out = out.replace(re, (m: string, ...rest: unknown[]) => {
      const offset = rest[rest.length - 2] as number
      const r = swap(m, rest.slice(0, -2))
      if (offset + m.length <= at) delta += r.length - m.length
      else if (offset < at && r !== m) across = offset + delta
      return r
    })
    at = across ?? at + delta
  }
  for (const f of FORMATS) {
    pass(f.re, (m, g) => {
      const secret = typeof g[0] === 'string' ? g[0] : m
      return isPlaceholder(secret) ? m : m.split(secret).join(MASKED)
    })
  }
  pass(ENV_ASSIGN, (m, g) => {
    const name = String(g[0] ?? '')
    const value = String(g[2] ?? '')
    return secretPair(name, value) ? m.split(value).join(MASKED) : m
  })
  return { out, cut: at }
}


const EXAMPLE_SUFFIX = /\.(example|sample|template|dist|defaults?)$/

export function secretFileKind(path: string): string | undefined {
  const base = basename(path)
  if (EXAMPLE_SUFFIX.test(base)) return undefined
  if (/^\.env(\.[\w.-]+)?$/.test(base) || /^[\w.-]+\.env$/.test(base) || base === '.dev.vars') return 'an env file'
  if (/\.(pem|p12|pfx|ppk|jks|keystore)$/i.test(base)) return 'a key or certificate file'
  if (/^id_(rsa|ed25519|ecdsa|dsa)$/.test(base)) return 'a private key file'
  if (base === 'credentials' || base === 'credentials.json' || base === '.git-credentials') return 'a credentials file'
  if (base === '.npmrc' || base === '.netrc' || base === '.pgpass') return 'a login settings file'
  return undefined
}


const READERS = new Set(['cat', 'less', 'more', 'head', 'tail', 'bat', 'batcat', 'nl', 'tac', 'strings', 'xxd', 'od', 'hexdump', 'grep', 'egrep', 'fgrep', 'rg', 'ag', 'awk', 'sed', 'cut', 'sort', 'base64', 'diff', 'jq', 'yq', 'tr', 'column'])
// KEY counts only as a word of its own, so KEYBOARD and MONKEY are not secrets.
const SECRET_NAME = /SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|AUTH|APIKEY|(?:^|[^A-Za-z])KEYS?(?![A-Za-z])/i

const PS_READERS = new Set(['get-content', 'gc', 'type', 'select-string', 'sls', 'format-hex', 'fhx'])
const PS_LISTERS = new Set(['get-childitem', 'gci', 'dir', 'ls', 'get-item', 'gi'])
const PS_ECHO = new Set(['echo', 'write-output', 'write', 'write-host'])

type ReadSyntax = { pattern: string[]; file: string[]; value: string[] }
const GREP: ReadSyntax = { pattern: ['-e', '--regexp'], file: ['-f', '--file'], value: ['-A', '-B', '-C', '-m', '-d', '-D', '--max-count', '--context', '--after-context', '--before-context', '--include', '--exclude', '--exclude-dir', '--label'] }
const RG: ReadSyntax = { pattern: ['-e', '--regexp'], file: ['-f', '--file'], value: ['-A', '-B', '-C', '-m', '-g', '-t', '-T', '-M', '-j', '-E', '--glob', '--iglob', '--type', '--type-not', '--max-count', '--context', '--after-context', '--before-context', '--encoding', '--threads', '--max-columns', '--max-depth', '--sort', '--sortr'] }
const SEARCH_SYNTAX: Record<string, ReadSyntax> = {
  grep: GREP,
  egrep: GREP,
  fgrep: GREP,
  rg: RG,
  ag: { pattern: [], file: [], value: ['-A', '-B', '-C', '-m', '-G', '--file-search-regex', '--ignore', '--context', '--after', '--before', '--max-count', '--depth'] },
  awk: { pattern: [], file: ['-f', '--file'], value: ['-F', '-v', '--field-separator', '--assign'] },
  sed: { pattern: ['-e', '--expression'], file: ['-f', '--file'], value: ['-l', '--line-length'] },
}

function searchParts(c: Cmd, syntax: ReadSyntax): { files: string[]; patterns: string[]; invert: boolean } {
  const files: string[] = []
  const words: string[] = []
  const patterns: string[] = []
  let given = false
  let invert = false
  let ended = false
  const args = c.args.filter(a => a.op !== true)
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (ended || a.quoted || !a.t.startsWith('-') || a.t === '-') {
      words.push(a.t)
      continue
    }
    if (a.t === '--') {
      ended = true
      continue
    }
    if (a.t.startsWith('--')) {
      const [name = '', glued] = a.t.split(/=(.*)/s)
      if (name === '--invert-match') invert = true
      const isPattern = syntax.pattern.includes(name)
      const isFile = syntax.file.includes(name)
      if (!isPattern && !isFile && !syntax.value.includes(name)) continue
      const v = glued ?? args[++i]?.t ?? ''
      if (isPattern) patterns.push(v)
      if (isFile) files.push(v)
      given ||= isPattern || isFile
      continue
    }
    for (let k = 1; k < a.t.length; k++) {
      const f = `-${a.t[k]}`
      if (f === '-v' && syntax !== SEARCH_SYNTAX.awk) invert = true
      const isPattern = syntax.pattern.includes(f)
      const isFile = syntax.file.includes(f)
      if (!isPattern && !isFile && !syntax.value.includes(f)) continue
      const v = k + 1 < a.t.length ? a.t.slice(k + 1) : (args[++i]?.t ?? '')
      if (isPattern) patterns.push(v)
      if (isFile) files.push(v)
      given ||= isPattern || isFile
      break
    }
  }
  if (!given && words.length > 0) patterns.push(words.shift() ?? '')
  return { files: [...files, ...words], patterns, invert }
}

function readPaths(c: Cmd): string[] {
  const syntax = Object.hasOwn(SEARCH_SYNTAX, c.prog) ? SEARCH_SYNTAX[c.prog] : undefined
  if (syntax !== undefined) return searchParts(c, syntax).files
  return c.args.filter(a => a.op !== true).map(a => a.t)
}

function psReadPaths(c: Cmd): string[] {
  const prog = c.prog.toLowerCase()
  if (prog !== 'select-string' && prog !== 'sls') return c.args.filter(a => a.op !== true).map(a => a.t)
  const values = ['pattern', 'path', 'literalpath', 'encoding', 'context', 'include', 'exclude', 'culture', 'inputobject']
  const a = splitArgs(c.args, { known: [...values, 'simplematch', 'casesensitive', 'quiet', 'list', 'notmatch', 'allmatches', 'raw', 'noemphasis'], values })
  const pos = a.params.has('pattern') ? a.positional : a.positional.slice(1)
  return [a.params.get('path'), a.params.get('literalpath'), ...pos].filter((t): t is string => t !== undefined).flatMap(t => t.split(','))
}

const narrowWord = (w: string): boolean => /[A-Za-z]{2,}/.test(w) && !SECRET_NAME.test(w)

function narrowedGrep(next: Cmd | undefined): boolean {
  if (next === undefined) return false
  if (next.prog === 'wc') return true
  if (!['grep', 'egrep', 'fgrep', 'rg'].includes(next.prog)) return false
  const f = flagsOf(next.args)
  if (f.short.has('c') || f.short.has('q') || f.long.has('--count') || f.long.has('--quiet')) return true
  const p = searchParts(next, SEARCH_SYNTAX[next.prog] ?? GREP)
  return !p.invert && p.patterns.length > 0 && p.patterns.every(narrowWord)
}

function narrowedPs(next: Cmd | undefined): boolean {
  if (next === undefined || !['where-object', 'where', '?', 'select-string', 'sls'].includes(next.prog.toLowerCase())) return false
  if (next.args.some(a => !a.quoted && /^-not/i.test(a.t))) return false
  const words = next.args
    .filter(a => a.op !== true && (a.quoted || !a.t.startsWith('-')))
    .map(a => a.t.replace(/[{}()]/g, '').replace(/^\$_\./, '').replace(/^\$psitem\./i, ''))
    .filter(w => w !== '' && !/^(?:name|value|key)$/i.test(w))
  return words.length > 0 && words.every(narrowWord)
}

function recursiveKeyDir(c: Cmd): string | undefined {
  const syntax = Object.hasOwn(SEARCH_SYNTAX, c.prog) ? SEARCH_SYNTAX[c.prog] : undefined
  if (syntax === undefined || c.prog === 'awk' || c.prog === 'sed') return undefined
  if (c.prog !== 'rg' && c.prog !== 'ag') {
    const f = flagsOf(c.args)
    if (!f.short.has('r') && !f.short.has('R') && !f.long.has('--recursive') && !f.long.has('--dereference-recursive')) return undefined
  }
  return searchParts(c, syntax).files.find(t => keyDirOf(t) !== undefined)
}

export function checkSecretRead(command: string, flavor: ShellFlavor = 'posix'): string | undefined {
  const ps = flavor === 'powershell'
  for (const c of commandsOf(command, 0, ps)) {
    if (ps) {
      const prog = c.prog.toLowerCase()
      if (PS_READERS.has(prog)) {
        const file = psReadPaths(c).map(t => t.replace(/\\/g, '/')).find(t => t !== '' && secretFileKind(t) !== undefined)
        if (file !== undefined) return `${c.prog} would print the inside of ${secretFileKind(file) ?? 'a secret file'} (${basename(file)})`
      }
      if (PS_LISTERS.has(prog) && c.args.some(a => a.op !== true && /^env:[\\/]?\*?$/i.test(a.t)) && !narrowedPs(c.into)) return `${c.prog} env: would print every environment value, secrets included`
      if (PS_ECHO.has(prog)) {
        const named = c.args.find(a => /^\$\{?env:[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|_KEY|APIKEY)[A-Z0-9_]*\}?$/i.test(a.t))
        if (named !== undefined) return `${c.prog} would print the value of ${named.t.replace(/[${}]/g, '').replace(/^env:/i, '')}`
      }
    }
    if (READERS.has(c.prog)) {
      const file = readPaths(c).find(t => secretFileKind(t) !== undefined) ?? c.redirects.find(r => r.op === '<' && secretFileKind(r.target) !== undefined)?.target
      if (file !== undefined) return `${c.prog} would print the inside of ${secretFileKind(file) ?? 'a secret file'} (${basename(file)})`
      const dir = recursiveKeyDir(c)
      if (dir !== undefined) return `${c.prog} would search and print the inside of ${secretPathKind(dir) ?? 'a folder of keys'} (${dir})`
    }
    if (c.prog === 'printenv' && ((c.args.length === 0 && !narrowedGrep(c.into)) || c.args.some(a => SECRET_NAME.test(a.t)))) return 'printenv would print environment values, secrets included'
    if (c.prog === 'env' && c.args.length === 0 && !narrowedGrep(c.into)) return 'env would print every environment value, secrets included'
    const flags = flagsOf(c.args)
    if ((c.prog === 'export' && flags.short.has('p')) || (c.prog === 'declare' && flags.short.has('x') && flags.positional.length === 0)) return `${c.prog} would print every exported value, secrets included`
    if (c.prog === 'echo' || c.prog === 'printf') {
      const named = c.args.find(a => !a.quoted && /^\$\{?[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|_KEY|APIKEY)[A-Z0-9_]*\}?$/.test(a.t))
      if (named !== undefined) return `${c.prog} would print the value of ${named.t.replace(/[${}]/g, '')}`
    }
  }
  return undefined
}


const KEY_DIRS: Record<string, string> = { '.ssh': 'your SSH keys folder', '.aws': 'your AWS login folder', '.gnupg': 'your GPG keys folder', '.kube': 'your Kubernetes login folder', '.azure': 'your Azure login folder' }
const keyDirOf = (path: string): string | undefined => path.replace(/\\/g, '/').split('/').find(seg => KEY_DIRS[seg] !== undefined)
export function secretPathKind(path: string): string | undefined {
  const p = path.replace(/\\/g, '/')
  const kind = secretFileKind(p)
  if (kind !== undefined) return kind
  const dir = p.split('/').find(seg => KEY_DIRS[seg] !== undefined)
  return dir === undefined ? undefined : KEY_DIRS[dir]
}

const REMOTE = /^(?:[^@/\s]+@[\w-][\w.-]*|[\w-][\w.-]+):(?!\/\/)/
const CURL_FILE_FLAGS = new Set(['-F', '--form', '-T', '--upload-file', '-d', '--data', '--data-binary', '--data-ascii', '--data-urlencode', '--json'])
const NET_PIPES = new Set(['nc', 'ncat', 'netcat', 'socat', 'telnet', 'ssh'])
const WEB_PS = new Set(['invoke-webrequest', 'iwr', 'invoke-restmethod', 'irm', 'curl', 'wget'])

function curlFile(flag: string, value: string): string | undefined {
  if (flag === '-T' || flag === '--upload-file') return value
  if (flag === '-F' || flag === '--form') return /(?:^|=)[@<]([^;]+)/.exec(value)?.[1]
  if (flag === '--data-urlencode') return /^[^=@]*@(.+)$/.exec(value)?.[1]
  return value.startsWith('@') && value !== '@-' ? value.slice(1) : undefined
}

function sentBy(c: Cmd): string[] {
  const prog = c.prog.toLowerCase()
  const a = c.args.filter(t => t.op !== true).map(t => t.t)
  const out: string[] = []
  if (prog === 'curl') {
    for (let i = 0; i < a.length; i += 1) {
      const t = a[i] ?? ''
      const eq = /^(--[a-z-]+)=(.*)$/.exec(t)
      const glued = /^(-[FTd])(.+)$/.exec(t)
      const [flag, value] = eq !== null ? [eq[1] ?? '', eq[2] ?? ''] : glued !== null ? [glued[1] ?? '', glued[2] ?? ''] : [t, a[i + 1] ?? '']
      if (!CURL_FILE_FLAGS.has(flag)) continue
      if (eq === null && glued === null) i += 1
      const f = curlFile(flag, value)
      if (f !== undefined) out.push(f)
    }
  }
  if (prog === 'wget') {
    for (let i = 0; i < a.length; i += 1) {
      const m = /^--(?:post|body)-file(?:=(.*))?$/.exec(a[i] ?? '')
      if (m !== null) out.push(m[1] ?? a[i + 1] ?? '')
    }
  }
  if (WEB_PS.has(prog)) {
    for (let i = 0; i < a.length; i += 1) {
      const m = /^-infile(?::(.*))?$/i.exec(a[i] ?? '')
      if (m !== null) out.push(m[1] ?? a[i + 1] ?? '')
    }
  }
  if (prog === 'http' || prog === 'https' || prog === 'xh') for (const t of a) out.push(/^(?:[\w-]+=?)?@(.+)$/.exec(t)?.[1] ?? '')
  if (prog === 'gh') {
    const pos = flagsOf(c.args).positional.map(t => t.t)
    if (pos[0] === 'gist' && pos[1] === 'create') out.push(...pos.slice(2))
  }
  if (prog === 'scp' || prog === 'rsync' || prog === 'sftp') {
    const pos = flagsOf(c.args).positional.map(t => t.t)
    const dest = pos[pos.length - 1] ?? ''
    if (pos.length >= 2 && REMOTE.test(dest)) out.push(...pos.slice(0, -1).filter(p => !REMOTE.test(p)))
  }
  if (NET_PIPES.has(prog)) for (const r of c.redirects) if (r.op === '<') out.push(r.target)
  return out.filter(f => f !== '' && secretPathKind(f) !== undefined)
}

const PACKERS = new Set(['tar', 'gtar', 'bsdtar', 'zip', 'cat', 'base64', 'gzip', 'bzip2', 'xz', 'zstd', '7z', 'cpio'])
const PASS_ON = new Set(['gzip', 'bzip2', 'xz', 'zstd', 'base64', 'openssl', 'gpg', 'pv', 'cat', 'tee'])
function readsPipe(c: Cmd): boolean {
  const prog = c.prog.toLowerCase()
  if (NET_PIPES.has(prog)) return true
  const a = c.args.filter(t => t.op !== true).map(t => t.t)
  if (prog === 'openssl') return a[0] === 's_client'
  if (prog === 'curl') return a.some(t => t === '-' || /@-$/.test(t) || /^-[FTd]-$/.test(t))
  if (prog === 'wget') return a.some(t => /^--(?:post|body)-file(?:=|$)/.test(t))
  return false
}

function pipedAway(c: Cmd): { file: string; prog: string } | undefined {
  if (!PACKERS.has(c.prog) || c.into === undefined) return undefined
  const file = [...c.args.filter(t => t.op !== true).map(t => t.t), ...c.redirects.filter(r => r.op === '<').map(r => r.target)].find(t => !t.startsWith('-') && secretPathKind(t) !== undefined)
  if (file === undefined) return undefined
  let next: Cmd | undefined = c.into
  for (let hops = 0; next !== undefined && hops < 4; hops++) {
    if (readsPipe(next)) return { file, prog: next.prog }
    if (!PASS_ON.has(next.prog)) return undefined
    next = next.into
  }
  return undefined
}

export function checkSecretSend(command: string, flavor: ShellFlavor = 'posix'): string | undefined {
  for (const c of commandsOf(command, 0, flavor === 'powershell')) {
    const sent = sentBy(c)[0]
    const piped = sent === undefined ? pipedAway(c) : undefined
    const f = sent ?? piped?.file
    const prog = sent === undefined ? piped?.prog : c.prog
    if (f !== undefined) return `${prog ?? c.prog} would send ${secretPathKind(f) ?? 'a secret file'} (${basename(f.replace(/\\/g, '/')) || f}) off this computer`
  }
  return undefined
}


type SecretFinding = { key: string; words: string }

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function stringsIn(v: unknown, depth = 0): string[] {
  if (typeof v === 'string') return [v]
  if (depth > 4 || v === null || typeof v !== 'object') return []
  return Object.values(v as Record<string, unknown>).flatMap(x => stringsIn(x, depth + 1))
}

const toolWord = (tool: string): string => (tool.startsWith('mcp__') ? `the ${tool.split('__').slice(2).join('__').slice(0, 40) || 'outside'} tool` : `the ${tool} tool`)
const kindsWords = (hits: SecretHit[]): string => hits.map(h => h.kind).join(', ')

export function secretsBefore(tool: string, a: Record<string, unknown>): SecretFinding[] {
  const out: SecretFinding[] = []
  if (tool === 'Read' || tool === 'Grep') {
    const kind = [str(a.file_path), str(a.path)].map(secretFileKind).find(k => k !== undefined)
    if (kind !== undefined) out.push({ key: `file|${tool}|${kind}`, words: `The ${tool} tool is about to open ${kind}. It may hold secrets, and what it reads goes into this conversation.` })
    return out
  }
  const flavor = commandFlavorOfTool(tool)
  if (flavor !== undefined) {
    const command = str(a.command)
    const read = checkSecretRead(command, flavor)
    if (read !== undefined) out.push({ key: `read|${read.split(' ')[0]}`, words: `This step ${read}. The values would go into this conversation.` })
    const send = checkSecretSend(command, flavor)
    if (send !== undefined) out.push({ key: `send|${send.split(' ')[0]}`, words: `This step ${send}. Whoever can read it there has the secret.` })
    const hits = scanSecrets(command)
    if (hits.length > 0) out.push({ key: `text|${tool}|${kindsWords(hits)}`, words: `This command holds ${kindsWords(hits)}. It may be printed or sent. Vaken does not show it.` })
    return out
  }
  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit') {
    const next = tool === 'Write' ? str(a.content) : tool === 'Edit' ? str(a.new_string) : (Array.isArray(a.edits) ? (a.edits as Record<string, unknown>[]).map(x => str(x.new_string)).join('\n') : '')
    const old = tool === 'Edit' ? str(a.old_string) : tool === 'MultiEdit' && Array.isArray(a.edits) ? (a.edits as Record<string, unknown>[]).map(x => str(x.old_string)).join('\n') : ''
    if (secretFileKind(str(a.file_path)) !== undefined) return out
    const hits = scanSecrets(next, old)
    if (hits.length > 0) out.push({ key: `text|${tool}|${kindsWords(hits)}`, words: `This edit puts ${kindsWords(hits)} into a file that is not a secret file. It could end up in version control. Vaken does not show it.` })
    return out
  }
  if (tool.startsWith('mcp__')) {
    const hits = scanSecrets(stringsIn(a).join('\n'))
    if (hits.length > 0) out.push({ key: `text|${tool}|${kindsWords(hits)}`, words: `This call to ${toolWord(tool)} holds ${kindsWords(hits)}. It would leave this computer. Vaken does not show it.` })
  }
  return out
}

export function secretsAfter(tool: string, text: string): SecretFinding[] {
  const hits = scanSecrets(text)
  if (hits.length === 0) return []
  return [{ key: `result|${tool}|${kindsWords(hits)}`, words: `The result of ${toolWord(tool)} holds ${kindsWords(hits)}. Vaken does not show it.` }]
}
