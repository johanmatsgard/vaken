// The Guard on Windows: reads cmd.exe and PowerShell lines and finds risky steps. Pure text in, findings out. Its own tokenizer: a backslash is a path character, the backtick is the PowerShell escape, ^ is the cmd escape. Fails closed: a line it cannot read to the end, or that runs a program named by a variable, is an 'ask'.
import type { Finding } from './guarddestroy'
import type { Tok } from './guardshell'
import { absolute, expandHome, isInside, isInsideTemp, isRebuildableWin, isWinTempToken, looksWin, winProtectedKind } from './guardpaths'
import { dotnetOps } from './guardnet'
import type { NetOp } from './guardnet'
import { WIN_EN } from './guardwinwords'

export type WinVerdict = 'ask' | 'block'
export type WinFinding = Finding & { verdict: WinVerdict }
type Env = { home: string; cwd: string }


const STRONG = new Set([
  'del', 'erase', 'rd', 'xcopy', 'robocopy', 'format', 'diskpart', 'reg', 'takeown', 'icacls', 'cacls', 'taskkill', 'schtasks', 'bcdedit', 'vssadmin', 'wbadmin', 'cipher',
  'powershell', 'pwsh', 'cmd', 'iex', 'iwr', 'irm', 'ri', 'attrib', 'setx', 'sc', 'netsh', 'wmic', 'mklink', 'certutil', 'bitsadmin', 'mshta', 'wscript', 'cscript',
  'regsvr32', 'rundll32', 'msiexec', 'gsudo', 'diskpart', 'tasklist', 'findstr', 'where',
])
const WEAK = new Set(['rmdir', 'rm', 'mv', 'cp', 'copy', 'move', 'dir', 'type', 'ren', 'md', 'mkdir', 'shutdown', 'net', 'cd', 'curl', 'wget', 'mklink', 'echo', 'ls', 'cat'])
const CMD_CONTROL = /(?:^|[&|;(\s])(?:for\s+(?:\/\w\s+)?%%?\w+\s+in\b|if\s+(?:not\s+)?(?:exist|defined|errorlevel)\b)/i
const WEAK_MULTI =new Set(['net', 'shutdown', 'mklink'])
const CMDLET =/^(?:Get|Set|Remove|New|Invoke|Start|Stop|Clear|Add|Copy|Move|Out|Format|Test|Write|Disable|Enable|Restart|Rename|Install|Uninstall|Import|Export|Select|Where|ForEach|Register|Unregister|Initialize|Read|Resolve|Push|Pop|Join|Measure|Sort|Compare|Convert|Unblock|Expand|Compress|Wait|Send|Receive|Update|Use|Grant|Revoke|Block)-[A-Za-z]+$/i
const DRIVE_BS = /(^|[\s"'=(,;@])[A-Za-z]:\\/
const DRIVE_ANY = /(^|[\s"'=(,;@])[A-Za-z]:[\\/]/
const UNC = /(^|[\s"'=(,;])\\\\[A-Za-z0-9_.$-]+\\/
const VARS = /%[A-Za-z_][A-Za-z0-9_]*%|\$env:[A-Za-z_]|\$\{env:/i
const PS_FLAG = /(^|\s)-(Recurse|Force|LiteralPath|EncodedCommand|ExecutionPolicy|NoProfile|WindowStyle|ErrorAction)\b/i
const SLASH_FLAG = /^\/[A-Za-z?](:.*)?$/

const lc = (s: string): string => s.toLowerCase()
function progName(t: string): string {
  const base = lc(t).split(/[\\/]/).pop() ?? ''
  return base.replace(/\.(exe|cmd|bat|com|ps1)$/, '')
}


type Piece = { text: string; pipedTo: boolean; amp: boolean }

function splitWin(cmd: string): { pieces: Piece[]; open: boolean } {
  const out: Piece[] = []
  let cur = ''
  let q: '' | "'" | '"' = ''
  let brace = 0
  let amp = false
  const push = (pipedTo: boolean): void => {
    if (cur.trim() !== '') {
      out.push({ text: cur.trim(), pipedTo, amp })
      amp = false
    }
    cur = ''
  }
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i] ?? ''
    const n = cmd[i + 1] ?? ''
    if (q === "'") {
      cur += c
      if (c === "'") q = ''
      continue
    }
    if (q === '"') {
      cur += c
      if (c === '`') {
        cur += n
        i++
      } else if (c === '"') q = ''
      continue
    }
    if (c === '`' || c === '^') {
      cur += c + n
      i++
      continue
    }
    if (c === "'" || c === '"') {
      q = c
      cur += c
      continue
    }
    if (c === '{') brace++
    else if (c === '}' && brace > 0) brace--
    if (brace > 0) {
      cur += c
      continue
    }
    if (c === ';' || c === '\n') push(false)
    else if (c === '&' && n === '&') {
      push(false)
      i++
    } else if (c === '|' && n === '|') {
      push(false)
      i++
    } else if (c === '|') push(true)
    else if (c === '&' && cmd[i - 1] !== '>' && n !== '>') {
      push(false)
      amp = true
    } else cur += c
  }
  push(false)
  return { pieces: out, open: q !== '' || brace > 0 }
}

type Redirect = { op: string; target: string }

function wordsOf(piece: string): { words: Tok[]; redirects: Redirect[] } {
  const words: Tok[] = []
  const redirects: Redirect[] = []
  let cur = ''
  let quoted = false
  let has = false
  let q: '' | "'" | '"' = ''
  let pendingRedirect: string | undefined
  const flush = (): void => {
    if (!has) return
    if (pendingRedirect !== undefined) {
      redirects.push({ op: pendingRedirect, target: cur })
      pendingRedirect = undefined
    } else words.push({ t: cur, quoted })
    cur = ''
    quoted = false
    has = false
  }
  for (let i = 0; i < piece.length; i++) {
    const c = piece[i] ?? ''
    const n = piece[i + 1] ?? ''
    if (q === "'") {
      if (c === "'") {
        if (n === "'") {
          cur += "'"
          i++
        } else q = ''
      } else cur += c
      continue
    }
    if (q === '"') {
      if (c === '"') {
        if (n === '"') {
          cur += '"'
          i++
        } else q = ''
      } else if (c === '`' && n !== '') {
        cur += n
        i++
      } else cur += c
      continue
    }
    if ((c === '`' || c === '^') && n !== '') {
      if (n !== '\n') {
        cur += n
        has = true
      }
      i++
      continue
    }
    if (c === "'" || c === '"') {
      q = c
      quoted = true
      has = true
      continue
    }
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      flush()
      continue
    }
    if (c === '>') {
      if (has && /^\d$/.test(cur) && !quoted) {
        cur = ''
        has = false
      } else flush()
      pendingRedirect = n === '>' ? '>>' : '>'
      if (n === '>') i++
      if (piece[i + 1] === '&') {
        pendingRedirect = undefined
        while (i + 1 < piece.length && piece[i + 1] !== ' ') i++
      }
      continue
    }
    cur += c
    has = true
  }
  flush()
  return { words, redirects }
}


export type WinShell = 'cmd' | 'ps'
export type WCmd = { prog: string; args: Tok[]; raw: string; prev?: WCmd; redirects: Redirect[]; shell: WinShell }
type State = { unparsed: boolean; dynamic: string[]; elevated: boolean; tooDeep: boolean; kill?: boolean; net?: NetOp[] }

// In PowerShell this reads a property or calls a method; it does not run a program. In cmd or Git Bash the same word could, so it counts only where the text is PowerShell.
const PS_MEMBER = /^\$(?:[A-Za-z_]\w*:)?(?:[A-Za-z_]\w*|_|\?)(?:\.[A-Za-z_]|\[)/
const PS_CODE_RUN = /\$executioncontext\b|\.(?:invoke|invokescript|invokereturnasis|invokewithcontext|addscript|newscriptblock|begininvoke)\s*\(|\[(?:system\.management\.automation\.)?scriptblock\]\s*::\s*create\b/i
const PS_KILL = /\.kill\s*\(/i
// Member access only, so the Invoke-Item, Invoke-WebRequest and Invoke-Expression cmdlet names are never read as one.
const PS_CODE_REF = /(?:\$[\w:?]+(?:\.\w+)*|[)\]])\.(?:invoke|invokescript|invokereturnasis|invokewithcontext|addscript|newscriptblock|begininvoke)(?![\w-])/i

const WRAPPERS = new Set(['call', 'gsudo', 'sudo', 'nohup', 'time', 'command', 'start-process-nowrap'])
const BLOCK_RUNNERS = new Set(['foreach-object', '%', 'foreach', 'where-object', '?', 'invoke-command', 'icm', 'start-job', 'where', 'sort-object', 'tee-object'])
const CONTROL = new Set(['if', 'for', 'else', 'while', 'do', 'try', 'catch', 'finally', 'switch', 'elseif'])

const KNOWN_VERBS = new Set([...STRONG, 'rmdir', 'rm', 'mv', 'cp', 'copy', 'move', 'ren', 'remove-item', 'iex', 'invoke-expression', 'shutdown', 'net', 'stop-process', 'move-item', 'copy-item', 'del'])

// Read from the start of the run (the lookbehind), so a long run of ) is read once.
const stripEdge = (t: Tok): Tok => ({ ...t, t: t.quoted ? t.t : t.t.replace(/^[({]+/, '').replace(/(?<![)}])[)}]+$/, '') })

function joinTokens(ts: Tok[]): string {
  if (ts.length === 1) return ts[0]?.t ?? ''
  return ts.map(a => (a.quoted || /\s/.test(a.t) ? `"${a.t}"` : a.t)).join(' ')
}

function decodeEncoded(b64: string): string {
  try {
    const bin = atob(b64.replace(/\s+/g, ''))
    let out = ''
    for (let i = 0; i + 1 < bin.length; i += 2) out += String.fromCharCode(bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8))
    return /^[\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]*$/.test(out) ? out : ''
  } catch {
    return ''
  }
}

function canon(name: string, known: readonly string[]): string {
  const n = lc(name)
  return known.find(k => k === n) ?? known.find(k => k.startsWith(n)) ?? n
}

export type Args = { flags: Set<string>; params: Map<string, string>; positional: string[]; tokens: Tok[] }
const PS_PARAM = /^-([A-Za-z]+)(?::(.*))?$/
const SLASH_ANY = /^\/([A-Za-z?][A-Za-z0-9_?]*)(?:[:=](.*))?$/

export function splitArgs(args: Tok[], opt: { known?: readonly string[]; values?: readonly string[]; multi?: boolean } = {}): Args {
  const known = opt.known ?? []
  const values = opt.values ?? []
  const out: Args = { flags: new Set(), params: new Map(), positional: [], tokens: args.filter(a => a.op !== true) }
  for (let i = 0; i < out.tokens.length; i++) {
    const a = out.tokens[i]!
    if (a.quoted) {
      out.positional.push(a.t)
      continue
    }
    const sm = (opt.multi === true ? SLASH_ANY : /^\/([A-Za-z?])(?::(.*))?$/).exec(a.t)
    if (sm !== null && !a.t.slice(1).includes('/')) {
      const name = lc(sm[1] ?? '')
      out.flags.add(name)
      if (sm[2] !== undefined) out.params.set(name, sm[2])
      continue
    }
    const pm = PS_PARAM.exec(a.t)
    if (pm !== null && !/^-\d/.test(a.t)) {
      const name = canon(pm[1] ?? '', known)
      out.flags.add(`-${name}`)
      if (pm[2] !== undefined) out.params.set(name, pm[2])
      else if (values.includes(name) && out.tokens[i + 1] !== undefined) {
        out.params.set(name, out.tokens[i + 1]!.t)
        i++
      }
      continue
    }
    out.positional.push(a.t)
  }
  return out
}
const hasPs = (a: Args, name: string): boolean => a.flags.has(`-${name}`)
const csv = (items: string[]): string[] => items.flatMap(x => x.split(',')).filter(x => x !== '')

const DEL_KNOWN = ['recurse', 'force', 'path', 'literalpath', 'filter', 'include', 'exclude', 'credential', 'stream', 'whatif', 'confirm'] as const
const DEL_VALUES = ['path', 'literalpath', 'filter', 'include', 'exclude', 'credential', 'stream'] as const

// A top-level Bash-tool line has shell 'ps' by default but runs in Git Bash, where `$x.exe` runs a program.
function collect(command: string, depth: number, st: State, out: WCmd[], shell: WinShell = 'ps', ps = false): void {
  if (depth > 5 || command.length > 20000) {
    st.tooDeep = true
    return
  }
  const { pieces, open } = splitWin(command)
  if (open) st.unparsed = true
  let prev: WCmd | undefined
  let prevPiped = false
  for (const piece of pieces) {
    const { words, redirects } = wordsOf(piece.text)
    let i = 0
    let invoked = piece.amp
    while (i < words.length && /^[@&.]$/.test(words[i]!.t) && !words[i]!.quoted) {
      if (words[i]!.t !== '@') invoked = true
      i++
    }
    if (ps) {
      if (PS_CODE_RUN.test(piece.text) || PS_CODE_REF.test(piece.text)) st.dynamic.push(words[i]?.t ?? piece.text)
      const net = dotnetOps(piece.text)
      if (net.length > 0) (st.net ??= []).push(...net)
      if (PS_KILL.test(piece.text)) st.kill = true
    }
    if (words[i] !== undefined && !words[i]!.quoted && words[i]!.t.startsWith('@')) words[i] = { ...words[i]!, t: words[i]!.t.replace(/^@+/, '') }
    while (i < words.length && WRAPPERS.has(lc(words[i]!.t)) && !words[i]!.quoted) i++
    const first = words[i]
    if (first === undefined) {
      prev = undefined
      prevPiped = piece.pipedTo
      continue
    }
    const isAssign = /^\$[A-Za-z_][\w:]*$/.test(first.t) && (words[i + 1]?.t === '=' || words[i + 1]?.t.startsWith('=') === true)
    if (isAssign) {
      const rhs = words.slice(i + 2).concat(words[i + 1]?.t.length ?? 0 > 1 ? [{ t: (words[i + 1]?.t ?? '').slice(1), quoted: false }] : [])
      if (rhs.length > 0) collect(joinTokens(rhs), depth + 1, st, out, shell, ps)
      prev = undefined
      prevPiped = piece.pipedTo
      continue
    }
    // In PowerShell a statement starting with a variable is an expression and runs nothing; only the call operators, Invoke-Expression and Start-Process run what a variable names.
    const member = ps && !invoked && (PS_MEMBER.test(first.t) || /^\$(?:\{[^}]*\}|(?:[A-Za-z_]\w*:)?(?:[A-Za-z_]\w*|_|\?))/.test(first.t))
    if (!first.quoted && !member && (first.t.startsWith('$') || /^%[^%]*%$/.test(first.t)) && !/^%~[a-z0-9]*$/i.test(first.t)) st.dynamic.push(first.t)
    // `.$script` (dot-sourcing without a space) runs the script $script names.
    else if (!first.quoted && /^\.\$/.test(first.t)) st.dynamic.push(first.t.slice(1))
    // `& (expr)` and `. (expr)` in PowerShell run whatever the expression gives back.
    else if (ps && invoked && !first.quoted && /^\$?\(/.test(first.t)) st.dynamic.push(first.t)
    // In Git Bash and cmd a double-quoted variable as the first word ("$cmd" args, "%X%" args) runs the program it names; in PowerShell it is only a string.
    else if (!ps && first.quoted && /^(?:\$|%[^%]+%$)/.test(first.t) && piece.text.trimStart().replace(/^[&.@\s]+/, '').startsWith(`"${first.t}"`)) st.dynamic.push(first.t)
    const prog = progName(first.t)
    const args = words.slice(i + 1)
    const here: WCmd = { prog, args, raw: piece.text, prev: prevPiped ? prev : undefined, redirects, shell }
    out.push(here)
    recurse(here, depth, st, out, ps)
    prev = here
    prevPiped = piece.pipedTo
  }
}

function recurse(c: WCmd, depth: number, st: State, out: WCmd[], ps: boolean): void {
  const plain = c.args.filter(a => a.op !== true)
  if (c.prog === 'cmd') {
    const k = plain.findIndex(a => !a.quoted && /^\/[ckCK]$/.test(a.t))
    if (k >= 0 && plain.length > k + 1) collect(joinTokens(plain.slice(k + 1)), depth + 1, st, out, 'cmd')
    return
  }
  if (c.prog === 'powershell' || c.prog === 'pwsh' || c.prog === 'powershell_ise') {
    const skipValue = new Set(['executionpolicy', 'ep', 'windowstyle', 'w', 'version', 'inputformat', 'outputformat', 'workingdirectory', 'wd', 'configurationname', 'file', 'f', 'psconsolefile', 'custompipename'])
    for (let k = 0; k < plain.length; k++) {
      const a = plain[k]!
      const m = PS_PARAM.exec(a.t)
      if (a.quoted || m === null) {
        collect(joinTokens(plain.slice(k)), depth + 1, st, out, 'ps', true)
        return
      }
      const name = lc(m[1] ?? '')
      if (name === 'c' || (name.length > 1 && 'command'.startsWith(name))) {
        const inline = m[2]
        const rest = inline !== undefined ? [{ t: inline, quoted: true }, ...plain.slice(k + 1)] : plain.slice(k + 1)
        if (rest.length > 0) collect(joinTokens(rest), depth + 1, st, out, 'ps', true)
        return
      }
      if (name === 'e' || (name.length > 1 && 'encodedcommand'.startsWith(name))) {
        const value = m[2] ?? plain[k + 1]?.t ?? ''
        const text = decodeEncoded(value)
        if (text !== '') collect(text, depth + 1, st, out, 'ps', true)
        return
      }
      if (name === 'file' || name === 'f') return
      if (skipValue.has(name)) k++
    }
    return
  }
  if (c.prog === 'iex' || c.prog === 'invoke-expression') {
    const code = plain.find(a => !PS_PARAM.test(a.t) || a.quoted)
    if (code !== undefined && !code.quoted && code.t.startsWith('$')) st.dynamic.push(code.t)
    if (plain.length > 0) collect(joinTokens(plain), depth + 1, st, out, 'ps', true)
    return
  }
  if (c.prog === 'start-process' || c.prog === 'start' || c.prog === 'saps') {
    const named = splitArgs(c.args, { known: ['filepath', 'argumentlist', 'verb', 'workingdirectory'], values: ['filepath', 'argumentlist', 'verb', 'workingdirectory', 'windowstyle'] })
    const verb = named.params.get('verb')
    if (verb !== undefined && /runas/i.test(verb)) st.elevated = true
    const file = named.params.get('filepath') ?? named.positional[0]
    const argText = named.params.get('argumentlist') ?? named.positional.slice(1).join(' ')
    if (file !== undefined) collect(`${file} ${argText}`.trim(), depth + 1, st, out, c.shell)
    return
  }
  if (BLOCK_RUNNERS.has(c.prog)) {
    const a = c.raw.indexOf('{')
    const b = c.raw.lastIndexOf('}')
    if (a >= 0) collect(c.raw.slice(a + 1, b > a ? b : undefined), depth + 1, st, out, 'ps', true)
    return
  }
  if (CONTROL.has(c.prog)) {
    const toks = plain.map(stripEdge)
    const k = toks.findIndex(t => !t.quoted && KNOWN_VERBS.has(progName(t.t)))
    if (k >= 0) collect(joinTokens(toks.slice(k)), depth + 1, st, out, c.shell, ps)
    else if (c.raw.includes('{')) {
      const a = c.raw.indexOf('{')
      const b = c.raw.lastIndexOf('}')
      collect(c.raw.slice(a + 1, b > a ? b : undefined), depth + 1, st, out, c.shell, c.shell === 'ps')
    }
  }
}


export function isWindowsShape(command: string): boolean {
  if (command.length > 20000) return DRIVE_BS.test(command) || VARS.test(command)
  if (DRIVE_BS.test(command) || UNC.test(command) || VARS.test(command) || PS_FLAG.test(command) || CMD_CONTROL.test(command)) return true
  let drive = false
  const { pieces } = splitWin(command)
  for (const p of pieces) {
    let t = p.text.replace(/^[@&(\s]+/, '')
    t = t.replace(/^(call|gsudo)\s+/i, '')
    const m = /^("[^"]*"|'[^']*'|\S+)(.*)$/s.exec(t)
    if (m === null) continue
    const name = progName((m[1] ?? '').replace(/^["']|["']$/g, ''))
    if (STRONG.has(name) || CMDLET.test(name)) return true
    if (WEAK.has(name)) {
      const rest = (m[2] ?? '').trim().split(/\s+/)
      if (rest.some(w => SLASH_FLAG.test(w) || /^-(Recurse|Force|Path|LiteralPath)$/i.test(w))) return true
      if (WEAK_MULTI.has(name) && rest.some(w => /^\/[A-Za-z][A-Za-z0-9]*(:.*)?$/.test(w))) return true
      drive = drive || DRIVE_ANY.test(m[2] ?? '')
    }
  }
  return drive
}


const HAS_GLOB = /[*?[]/
const UNKNOWN = /%[^%\s]+%|%%?[A-Za-z](?![\w%])|\$env:|\$\{|\$[A-Za-z_]|\$\(/i
const REGISTRY = /^(?:hklm|hkcu|hkcr|hku|hkcc|hkey_[a-z_]+|registry)(?::|\\|$)/i
const STARTUP_KEY = /\\(?:run|runonce|runservices|winlogon|image file execution options|policies\\explorer\\run|services)(?:\\|$)/i
const MACHINE_KEY = /^(?:hklm|hkcr|hku|hkcc|hkey_local_machine|hkey_classes_root|hkey_users|hkey_current_config)(?::|\\|$)/i
const DOWNLOADERS = new Set(['curl', 'wget', 'iwr', 'irm', 'invoke-webrequest', 'invoke-restmethod', 'fetch', 'start-bitstransfer', 'certutil', 'bitsadmin'])
const DOWNLOAD_TEXT = /\b(?:iwr|irm|invoke-webrequest|invoke-restmethod|curl|wget|downloadstring|downloadfile|downloaddata|webclient|start-bitstransfer)\b/i
const INTERPRETERS = new Set(['iex', 'invoke-expression', 'powershell', 'pwsh', 'cmd', 'sh', 'bash', 'zsh', 'python', 'python3', 'node', 'wscript', 'cscript', 'mshta', 'rundll32'])
const PIPE_SOURCES = new Set(['get-childitem', 'gci', 'dir', 'ls', 'get-item', 'gi', 'find', 'where', 'select-object', 'sort-object', 'where-object', '?', 'foreach-object', '%'])

function make(id: string, verdict: WinVerdict, where?: string, root = false): WinFinding {
  const w = WIN_EN[id] ?? { what: 'Runs a risky Windows command', risk: 'Check it before it runs.' }
  return { id, what: w.what, where, risk: root && w.riskRoot !== undefined ? w.riskRoot : w.risk, verdict }
}

const byVariable = (expanded: string): boolean => UNKNOWN.test(expanded)

type Target = { shown: string; verdict: WinVerdict; root: boolean }

function unknownTarget(raw: string, wide: boolean): Target | undefined {
  return wide ? { shown: `the folder named by ${raw} (unknown until the command runs)`, verdict: 'ask', root: false } : undefined
}

function deleteTarget(raw: string, recursive: boolean, env: Env): Target | undefined {
  if (isWinTempToken(raw)) return undefined
  const expanded = expandHome(raw, env.home)
  const glob = HAS_GLOB.test(raw) && !/^\$/.test(raw)
  if (byVariable(expanded)) return unknownTarget(raw, glob || recursive)
  const bare = /^(?:[A-Za-z]:)?[\\/]*\*?$/.test(raw) || /^\.{1,2}(?:[\\/]+\*?)?$/.test(raw) || expanded === env.home
  const abs = absolute(raw, env.home, env.cwd)
  const base = abs.replace(/[\\/]\*+$/, '') || abs
  const kind = winProtectedKind(base, env.home)
  if (kind === 'drive' || kind === 'system' || kind === 'profile') {
    if (isInsideTemp(abs)) return undefined
    return { shown: abs, verdict: 'block', root: true }
  }
  if (bare) return { shown: /^\.{1,2}/.test(raw) ? `${env.cwd} (the current folder)` : abs, verdict: 'block', root: true }
  if (isInsideTemp(abs)) return undefined
  if (kind === 'startup' || kind === 'secrets') return { shown: abs, verdict: 'ask', root: false }
  if (isRebuildableWin(abs, env.cwd)) return undefined
  if (glob || recursive) return { shown: glob ? `files matching ${abs}` : `${abs} and everything inside`, verdict: 'ask', root: false }
  return undefined
}

function ruleDelete(c: WCmd, env: Env, wholeRecursive: boolean): WinFinding[] {
  const a = splitArgs(c.args, { known: DEL_KNOWN, values: DEL_VALUES })
  if (hasPs(a, 'whatif')) return []
  const recursive = a.flags.has('s') || hasPs(a, 'recurse') || a.flags.has('-r') || [...a.flags].some(f => /^-[rR]+f?$/.test(f) && f !== '-recurse')
  const targets = csv([...a.positional.filter(p => !/^-/.test(p)), ...[a.params.get('path'), a.params.get('literalpath')].filter((x): x is string => x !== undefined)])
  const out: WinFinding[] = []
  const regs = targets.filter(t => REGISTRY.test(t))
  if (regs.length > 0) out.push(make('win-registry', 'ask', regs.join(', ')))
  let list = targets.filter(t => !REGISTRY.test(t))
  let rec = recursive
  if (list.length === 0 && regs.length === 0 && c.prev !== undefined && PIPE_SOURCES.has(c.prev.prog)) {
    const pa = splitArgs(c.prev.args, { known: ['path', 'literalpath', 'filter', 'recurse', 'force', 'include', 'exclude', 'file', 'directory'], values: ['path', 'literalpath', 'filter', 'include', 'exclude'] })
    list = [pa.params.get('path') ?? pa.params.get('literalpath') ?? pa.positional[0] ?? '.']
    rec = true
    if (c.prev.prog !== 'where-object' && c.prev.prog !== '?' && (pa.params.has('filter') || pa.params.has('include'))) {
      list = list.filter(t => isWinTempToken(t) || byVariable(expandHome(t, env.home)) || !isInside(absolute(t, env.home, env.cwd), env.cwd))
      if (list.length === 0) return out
    }
  }
  if (list.length === 0 && regs.length === 0 && c.prev === undefined) return out
  const hits: Target[] = []
  for (const t of list) {
    const h = deleteTarget(t, rec || (wholeRecursive && /^[$%]/.test(t)), env)
    if (h !== undefined) hits.push(h)
  }
  if (hits.length > 0) {
    const root = hits.some(h => h.root)
    const verdict: WinVerdict = hits.some(h => h.verdict === 'block') ? 'block' : 'ask'
    const f = make('win-delete', verdict, hits.map(h => h.shown).slice(0, 3).join(', '), root)
    out.push(f)
  }
  return out
}

function writeTarget(raw: string, env: Env): string | undefined {
  if (isWinTempToken(raw) || raw === '' || /^(?:nul|\$null|\/dev\/null)$/i.test(raw)) return undefined
  const expanded = expandHome(raw, env.home)
  if (byVariable(expanded)) return undefined
  const abs = absolute(raw, env.home, env.cwd)
  if (isInsideTemp(abs)) return undefined
  const kind = winProtectedKind(abs.replace(/[\\/]\*+$/, '') || abs, env.home)
  return kind === 'drive' || kind === 'system' || kind === 'startup' || kind === 'secrets' ? abs : undefined
}

function ruleCopyMove(c: WCmd, env: Env): WinFinding[] {
  const robo = c.prog === 'robocopy'
  const a = splitArgs(c.args, { multi: true, known: ['path', 'destination', 'literalpath', 'recurse', 'force', 'name', 'value'], values: ['path', 'destination', 'literalpath', 'name', 'value'] })
  const moves = ['move', 'mv', 'ren', 'rename', 'move-item', 'mi', 'rename-item', 'rni'].includes(c.prog) || (robo && (a.flags.has('mov') || a.flags.has('move')))
  const pos = a.positional.filter(p => !/^-/.test(p))
  const dest = a.params.get('destination') ?? (c.prog === 'ren' || c.prog === 'rename' || c.prog === 'rename-item' || c.prog === 'rni' ? undefined : pos.length >= 2 ? pos[pos.length - 1] : undefined)
  const src = (a.params.get('path') ?? a.params.get('literalpath') ?? pos[0])
  const out: WinFinding[] = []
  const mirror = robo && (a.flags.has('mir') || a.flags.has('purge'))
  if (dest !== undefined) {
    const hit = writeTarget(dest, env)
    if (hit !== undefined) {
      const sys = winProtectedKind(hit, env.home)
      out.push(make(mirror ? 'win-sync' : 'win-write-protected', mirror && (sys === 'system' || sys === 'drive') ? 'block' : 'ask', hit))
    } else if (mirror && !isWinTempToken(dest)) {
      const abs = absolute(dest, env.home, env.cwd)
      if (!byVariable(expandHome(dest, env.home)) && !isInsideTemp(abs) && !isRebuildableWin(abs, env.cwd)) out.push(make('win-sync', 'ask', abs))
      else if (byVariable(expandHome(dest, env.home))) out.push(make('win-sync', 'ask', `the folder named by ${dest} (unknown until the command runs)`))
    }
  }
  if (moves && src !== undefined) {
    for (const s of csv([src])) {
      const hit = writeTarget(s, env)
      if (hit !== undefined) out.push(make('win-write-protected', 'ask', hit))
    }
  }
  return out
}

function ruleRegistry(c: WCmd): WinFinding[] {
  const a = splitArgs(c.args, { multi: true })
  const verb = lc(a.positional[0] ?? '')
  const key = a.positional[1] ?? ''
  if (!['add', 'delete', 'import', 'copy', 'restore', 'load', 'unload', 'save'].includes(verb)) return []
  if (verb === 'save') return []
  if (verb === 'delete') return [make('win-registry', 'ask', key)]
  if (verb === 'import' || verb === 'restore' || verb === 'load' || verb === 'unload') return [make('win-registry', 'ask', key)]
  if (MACHINE_KEY.test(key) || STARTUP_KEY.test(key)) return [make('win-registry', 'ask', key)]
  return []
}

function rulePsRegistry(c: WCmd): WinFinding[] {
  const a = splitArgs(c.args, { known: ['path', 'literalpath', 'name', 'value'], values: ['path', 'literalpath', 'name', 'value'] })
  const key = a.params.get('path') ?? a.params.get('literalpath') ?? a.positional[0] ?? ''
  if (!REGISTRY.test(key)) return []
  const removes = c.prog.startsWith('remove-') || c.prog.startsWith('clear-')
  if (removes || MACHINE_KEY.test(key) || STARTUP_KEY.test(key)) return [make('win-registry', 'ask', key)]
  return []
}

function ruleIex(c: WCmd, whole: string): WinFinding[] {
  const fed = c.prev !== undefined && DOWNLOADERS.has(c.prev.prog)
  if (c.prog === 'iex' || c.prog === 'invoke-expression') {
    return fed || DOWNLOAD_TEXT.test(whole) ? [make('curl-sh', 'ask')] : [make('win-iex', 'ask')]
  }
  if (fed && INTERPRETERS.has(c.prog)) {
    const hasC = c.args.some(a => !a.quoted && /^-[a-zA-Z]*c$/.test(a.t)) && ['sh', 'bash', 'zsh', 'python', 'python3', 'node'].includes(c.prog)
    if (!hasC) return [make('curl-sh', 'ask')]
  }
  return []
}

const CRITICAL_PROC = /^(?:csrss|lsass|wininit|winlogon|smss|services|svchost|system|dwm|explorer|lsaiso|fontdrvhost)(?:\.exe)?$/i

function ruleSystem(c: WCmd, env: Env): WinFinding[] {
  const a = splitArgs(c.args, { multi: true })
  const f = new Set([...a.flags, ...[...a.flags].map(x => x.replace(/^-/, ''))])
  const p0 = lc(a.positional[0] ?? '')
  const sys = (what?: string): WinFinding[] => [make('win-system', 'ask', what)]
  switch (c.prog) {
    case 'format':
    case 'format-volume':
    case 'clear-disk':
    case 'initialize-disk':
    case 'remove-partition':
    case 'diskpart':
      return [make('win-format', 'block', a.positional.find(x => /^[A-Za-z]:$/.test(x)))]
    case 'cipher':
      return f.has('w') ? [make('win-wipe', 'ask', a.params.get('w'))] : []
    case 'vssadmin':
    case 'wbadmin':
      return p0.startsWith('delete') || f.has('delete') ? [make('win-backup', 'block')] : []
    case 'bcdedit':
      return ['set', 'delete', 'create', 'copy', 'import', 'deletevalue', 'bootsequence', 'default', 'timeout', 'displayorder', 'export'].some(x => f.has(x)) || ['/set', 'set'].includes(p0) ? [make('win-system', 'block', 'the boot configuration')] : []
    case 'reg':
      return ruleRegistry(c)
    case 'takeown':
      return [make('win-permissions', 'ask', a.params.get('f') ?? a.positional[0])]
    case 'icacls':
    case 'cacls':
    case 'xcacls': {
      const modifies = ['grant', 'deny', 'remove', 'setowner', 'reset', 'restore', 'inheritance', 'setintegritylevel', 'substitute', 'e', 'g', 'p', 'r'].some(x => f.has(x))
      if (!modifies) return []
      const target = a.positional[0] ?? ''
      const kind = target === '' ? undefined : winProtectedKind(absolute(target, env.home, env.cwd).replace(/[\\/]\*+$/, ''), env.home)
      const everyone = lc(c.raw).match(/(?:everyone|authenticated users|\busers\b)[:(]/) !== null
      return kind !== undefined || f.has('t') || everyone ? [make('win-permissions', 'ask', target)] : []
    }
    case 'set-acl':
      return [make('win-permissions', 'ask')]
    case 'taskkill': {
      const after = (flag: string): string => a.params.get(flag) ?? a.tokens[a.tokens.findIndex(t => lc(t.t) === `/${flag}`) + 1]?.t ?? ''
      const im = f.has('im') ? after('im') : ''
      return f.has('fi') || /[*?]/.test(im) || CRITICAL_PROC.test(im) || /^[04]$/.test(f.has('pid') ? after('pid') : '') ? [make('win-kill', 'ask', im || undefined)] : []
    }
    case 'stop-process':
    case 'spps': {
      const s = splitArgs(c.args, { known: ['name', 'id', 'force', 'inputobject', 'passthru', 'whatif', 'confirm'], values: ['name', 'id', 'inputobject'] })
      const name = s.params.get('name') ?? (s.params.has('id') ? '' : s.positional[0] ?? '')
      return /[*?]/.test(name) || CRITICAL_PROC.test(name) || /^[04]$/.test(s.params.get('id') ?? '') ? [make('win-kill', 'ask', name)] : []
    }
    case 'schtasks':
      return ['create', 'delete', 'change', 'end'].some(x => f.has(x)) ? sys('a scheduled task') : []
    case 'register-scheduledtask':
    case 'unregister-scheduledtask':
    case 'set-scheduledtask':
      return sys('a scheduled task')
    case 'sc':
      return ['create', 'delete', 'config', 'stop'].includes(p0) ? sys(`the service ${a.positional[1] ?? ''}`.trim()) : []
    case 'new-service':
    case 'remove-service':
    case 'set-service':
    case 'stop-service':
      return sys('a service')
    case 'net':
    case 'net1': {
      if (p0 === 'user') return f.has('add') || f.has('delete') || f.has('active') || a.positional.length >= 3 ? sys('a user account') : []
      if (p0 === 'localgroup' || p0 === 'accounts') return f.has('add') || f.has('delete') || p0 === 'accounts' ? sys('users or groups') : []
      if (p0 === 'stop') return sys(`the service ${a.positional[1] ?? ''}`.trim())
      if (p0 === 'share') return f.has('delete') || a.positional.length > 1 ? sys('a shared folder') : []
      return []
    }
    case 'new-localuser':
    case 'set-localuser':
    case 'remove-localuser':
    case 'add-localgroupmember':
    case 'remove-localgroupmember':
      return sys('a user account')
    case 'netsh':
      return a.positional.some(x => ['set', 'add', 'delete', 'reset', 'import'].includes(lc(x))) ? sys('the network or firewall') : []
    case 'disable-netfirewallrule':
    case 'remove-netfirewallrule':
    case 'set-netfirewallprofile':
    case 'new-netfirewallrule':
    case 'set-mppreference':
    case 'add-mppreference':
    case 'remove-mppreference':
    case 'disable-windowsoptionalfeature':
      return sys('the firewall or the virus protection')
    case 'shutdown':
      return f.has('a') ? [] : sys('shutting down or restarting the computer')
    case 'restart-computer':
    case 'stop-computer':
      return sys('shutting down or restarting the computer')
    case 'set-executionpolicy': {
      const s = splitArgs(c.args, { known: ['executionpolicy', 'scope', 'force'], values: ['executionpolicy', 'scope'] })
      const policy = lc(s.params.get('executionpolicy') ?? s.positional[0] ?? '')
      return policy === '' || ['bypass', 'unrestricted'].includes(policy) ? sys('the PowerShell script policy') : []
    }
    case 'setx':
      return f.has('m') || lc(a.positional[0] ?? '') === 'path' ? sys('an environment variable for all programs') : []
    case 'wmic':
      return a.positional.some(x => ['delete', 'call'].includes(lc(x))) || f.has('delete') ? sys('what wmic manages') : []
    case 'certutil':
      return f.has('urlcache') || f.has('urlfetch') || f.has('decode') || f.has('decodehex') ? [make('win-download', 'ask')] : []
    case 'bitsadmin':
      return f.has('transfer') || f.has('addfile') ? [make('win-download', 'ask')] : []
    case 'start-bitstransfer':
      return [make('win-download', 'ask')]
    case 'mshta':
    case 'wscript':
    case 'cscript':
    case 'rundll32':
      return [make('win-download', 'ask')]
    case 'regsvr32':
      return /https?:|\/i:|scrobj/i.test(c.raw) ? [make('win-download', 'ask')] : []
    case 'mklink': {
      const pos = a.positional
      const hits = pos.map(x => writeTarget(x, env)).filter((x): x is string => x !== undefined)
      return hits.length > 0 ? [make('win-write-protected', 'ask', hits[0])] : []
    }
    default:
      return []
  }
}

const WRITERS = new Set(['set-content', 'sc', 'out-file', 'add-content', 'ac', 'new-item', 'ni', 'clear-content', 'tee-object', 'tee', 'export-csv', 'set-itemproperty', 'sp'])

function ruleWrite(c: WCmd, env: Env): WinFinding[] {
  const out: WinFinding[] = []
  if (WRITERS.has(c.prog) && !(c.prog === 'sc' && lc(c.args[0]?.t ?? '').match(/^(create|delete|config|stop|start|query)$/) !== null)) {
    const a = splitArgs(c.args, { known: ['path', 'literalpath', 'filepath', 'value', 'name', 'encoding', 'force', 'itemtype', 'append'], values: ['path', 'literalpath', 'filepath', 'value', 'name', 'encoding', 'itemtype'] })
    const target = a.params.get('filepath') ?? a.params.get('path') ?? a.params.get('literalpath') ?? a.positional[0]
    if (target !== undefined && !REGISTRY.test(target)) {
      const hit = writeTarget(target, env)
      if (hit !== undefined) out.push(make('win-write-protected', 'ask', hit))
    }
  }
  for (const r of c.redirects) {
    if (r.target === '' || r.target.startsWith('&')) continue
    const hit = writeTarget(r.target, env)
    if (hit !== undefined) out.push(make('win-write-protected', 'ask', hit))
  }
  return out
}

function ruleNet(ops: readonly NetOp[], env: Env, wholeRecursive: boolean): WinFinding[] {
  const out: WinFinding[] = []
  for (const op of ops) {
    if (op.act === 'delete') {
      const recursive = op.recursive === true || (wholeRecursive && /^[$%]/.test(op.arg.raw))
      const h = op.arg.known ? deleteTarget(op.arg.raw, recursive, env) : unknownTarget(op.arg.raw, recursive)
      if (h !== undefined) out.push(make('win-delete', h.verdict, h.shown, h.root))
    } else if (op.arg.known) {
      const hit = writeTarget(op.arg.raw, env)
      if (hit !== undefined) out.push(make('win-write-protected', 'ask', hit))
    }
  }
  return out
}

export function netOverwriteTargets(command: string, env: Env, known = false): string[] {
  if (!known && !isWindowsShape(command)) return []
  const st: State = { unparsed: false, dynamic: [], elevated: false, tooDeep: false }
  try {
    collect(command, 0, st, [], 'ps', known)
  } catch {
    return []
  }
  const out: string[] = []
  for (const op of st.net ?? []) {
    if (op.act !== 'write' || op.overwrite !== true || !op.arg.known || op.arg.raw === '' || isWinTempToken(op.arg.raw)) continue
    if (byVariable(expandHome(op.arg.raw, env.home))) continue
    out.push(absolute(op.arg.raw, env.home, env.cwd))
  }
  return [...new Set(out)]
}

const DELETERS = new Set(['del', 'erase', 'rd', 'rmdir', 'remove-item', 'ri', 'rm', 'delete'])
const COPIERS = new Set(['copy', 'move', 'xcopy', 'robocopy', 'copy-item', 'cpi', 'move-item', 'mi', 'cp', 'mv', 'ren', 'rename', 'rename-item', 'rni'])
const REG_PS = new Set(['remove-itemproperty', 'set-itemproperty', 'new-itemproperty', 'clear-itemproperty', 'rename-itemproperty', 'copy-itemproperty', 'set-item', 'new-item', 'ni', 'sp'])

export function winCommandsOf(command: string): WCmd[] {
  const cmds: WCmd[] = []
  try {
    collect(command, 0, { unparsed: false, dynamic: [], elevated: false, tooDeep: false }, cmds)
  } catch {
    return []
  }
  return cmds
}

export function checkWindows(command: string, env: Env, known = false): WinFinding[] {
  if (!known && !isWindowsShape(command)) return []
  const st: State = { unparsed: false, dynamic: [], elevated: false, tooDeep: false }
  const cmds: WCmd[] = []
  collect(command, 0, st, cmds, 'ps', known)
  const wholeRecursive = (/(?:^|\s)-r(?:ecurse)?\b/i.test(command) && /\b(?:get-childitem|gci|dir|ls)\b/i.test(command)) || /(?:^|[&|;(\s])for\s+(?:\/\w\s+)?%%?\w+\s+in\b/i.test(command)
  const found: WinFinding[] = []
  for (const c of cmds) {
    if (DELETERS.has(c.prog)) found.push(...ruleDelete(c, env, wholeRecursive))
    if (COPIERS.has(c.prog)) found.push(...ruleCopyMove(c, env))
    if (REG_PS.has(c.prog)) found.push(...rulePsRegistry(c))
    if (c.prog === 'iex' || c.prog === 'invoke-expression' || INTERPRETERS.has(c.prog)) found.push(...ruleIex(c, command))
    found.push(...ruleSystem(c, env))
    found.push(...ruleWrite(c, env))
    if (c.prog === 'powershell' || c.prog === 'pwsh') {
      const enc = c.args.find(a => !a.quoted && /^-e(?:n(?:c(?:o(?:d(?:e(?:d(?:c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?)?)?)?)?)?)?)?$/i.test(a.t.split(':')[0] ?? ''))
      if (enc !== undefined) found.push(make('win-encoded', 'ask'))
    }
  }
  if (st.net !== undefined) found.push(...ruleNet(st.net, env, wholeRecursive))
  if (st.elevated) found.push(make('win-elevate', 'ask'))
  if (st.kill === true) found.push(make('win-kill', 'ask'))
  if (st.dynamic.length > 0) found.push(make('win-dynamic', 'ask', [...new Set(st.dynamic)].slice(0, 2).join(', ')))
  if (st.unparsed || st.tooDeep) {
    if (/\b(?:del|erase|rd|rmdir|remove-item|ri|rm|format|diskpart|move|copy|xcopy|robocopy|reg|set-content|out-file|invoke-expression|iex|takeown|icacls|taskkill|stop-process|schtasks|sc|net|shutdown|powershell|pwsh|cmd)\b/i.test(command)) {
      found.push(make('win-unparsed', 'ask'))
    }
  }
  const seen = new Set<string>()
  const out: WinFinding[] = []
  for (const f of found) {
    const key = `${f.id}|${f.where ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push(f)
    }
  }
  return out
}

// A union: nothing in `first` is removed, and the stricter verdict wins. The same delete seen by two readings may be said twice under two ids.
export function mergeWin(first: readonly Finding[], second: readonly Finding[]): Finding[] {
  const out: Finding[] = [...first]
  const rank = (f: Finding): number => ((f as Partial<WinFinding>).verdict === 'block' ? 2 : (f as Partial<WinFinding>).verdict === 'ask' ? 1 : 0)
  for (const f of second) {
    const k = out.findIndex(o => o.id === f.id && (o.where ?? '') === (f.where ?? ''))
    if (k < 0) out.push(f)
    else if (rank(f) > rank(out[k]!)) out[k] = f
  }
  return out
}

export function winVerdict(list: readonly WinFinding[]): WinVerdict | undefined {
  if (list.length === 0) return undefined
  return list.some(f => f.verdict === 'block') ? 'block' : 'ask'
}
