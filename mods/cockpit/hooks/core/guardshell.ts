// Splits a shell command line into the simple commands it would run. A speed bump, not a security boundary.

export type Tok = { t: string; quoted: boolean; op?: boolean }
type Redirect = { op: string; target: string }
export type Cmd = {
  prog: string
  args: Tok[]
  raw: string
  viaXargs: boolean
  fedByDownload: boolean
  fedByDecode: boolean
  redirects: Redirect[]
  into?: Cmd
}

type Piece = { text: string; pipedTo: boolean }

const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'ash'])
const INTERPRETERS = new Set([...SHELLS, 'fish', 'python', 'python3', 'node', 'ruby', 'perl', 'php'])
const DOWNLOADERS = new Set(['curl', 'wget', 'fetch'])

function decodes(c: Cmd): boolean {
  const { short, long, positional } = flagsOf(c.args)
  if (c.prog === 'base64' || c.prog === 'gbase64') return short.has('d') || short.has('D') || long.has('--decode')
  if (c.prog === 'xxd') return short.has('r') || long.has('--revert')
  if (c.prog === 'openssl') return ['base64', 'enc'].includes(positional[0]?.t ?? '') && c.args.some(a => !a.quoted && a.t === '-d')
  return false
}
const WRAPPERS = new Set(['sudo', 'doas', 'command', 'builtin', 'exec', 'nohup', 'nice', 'ionice', 'time', 'timeout', 'stdbuf', 'caffeinate', 'setsid', 'chrt', 'env', 'xargs', 'unbuffer', 'then', 'do', 'else', 'elif', 'if', 'while', 'until', '!', '{'])
const WRAPPER_VALUE_FLAGS: Record<string, string[]> = {
  sudo: ['-u', '-g', '-h', '-p', '-C', '-D', '-R', '-T', '-U'],
  doas: ['-u', '-C'],
  env: ['-u', '-C', '-S'],
  nice: ['-n'],
  ionice: ['-c', '-n', '-p'],
  xargs: ['-I', '-n', '-P', '-d', '-L', '-s', '-E', '-a', '-l'],
  timeout: ['-s', '-k'],
  stdbuf: ['-i', '-o', '-e'],
}

export function basename(p: string): string {
  if (/^[A-Za-z]:[\\/]|^\\\\[^\\]/.test(p)) {
    const w = p.replace(/(?<![\\/])[\\/]+$/, '')
    return w.slice(Math.max(w.lastIndexOf('\\'), w.lastIndexOf('/')) + 1).replace(/\.(exe|cmd|bat|com|ps1)$/i, '').toLowerCase()
  }
  // Read from the start of the run (the lookbehind), so a long run of / is read once.
  const s = p.replace(/(?<!\/)\/+$/, '')
  const i = s.lastIndexOf('/')
  return i >= 0 ? s.slice(i + 1) : s
}

// One heredoc: the line that opens it (`start`), its first body line (`bodyStart`), its body lines and the closing line (`end`). `at` and `to`
// mark the `<<WORD` on the opening line; one line may open more than one, and their bodies follow one after the other.
type Heredoc = { start: number; bodyStart: number; end: number; line: string; at: number; to: number; body: string[]; quoted: boolean }

// The word after << as bash reads it: quotes and backslashes are taken out (E'OF', "E"OF, \EOF and E\OF are all EOF), and any of them makes it
// quoted, so bash expands nothing in the body. Null: no word bash takes as a delimiter here (as in $((1 << 2))). Undefined: it cannot be read cleanly.
function hereWord(line: string, from: number, win: boolean): { word: string; to: number; quoted: boolean } | null | undefined {
  let k = from
  while (line[k] === ' ' || line[k] === '\t') k++
  if (!/^[A-Za-z_'"\\]/.test(line[k] ?? '')) return null
  let word = ''
  let quoted = false
  while (k < line.length) {
    const c = line[k] ?? ''
    // Only bash's own word breaks end the word: a carriage return (a file saved with CRLF) stays in it, as bash keeps it
    if (/[ \t\n;&|<>()]/.test(c)) break
    if (c === "'") {
      const e = line.indexOf("'", k + 1)
      if (e < 0) return undefined
      word += line.slice(k + 1, e)
      quoted = true
      k = e + 1
    } else if (c === '"') {
      let e = k + 1
      while (e < line.length && line[e] !== '"') {
        if (line[e] === '\\' && !win && '"\\$`'.includes(line[e + 1] ?? '')) e++
        word += line[e] ?? ''
        e++
      }
      if (e >= line.length) return undefined
      quoted = true
      k = e + 1
    } else if (c === '\\' && !win) {
      if (k + 1 >= line.length) return undefined
      word += line[k + 1] ?? ''
      quoted = true
      k += 2
    } else {
      word += c
      k++
    }
  }
  return word === '' ? undefined : { word, to: k, quoted }
}

type Open = { at: number; to: number; word: string; quoted: boolean; dash: boolean }

// The heredocs one line opens. Quotes, $( ), backticks and # comments are followed across lines in `stack`, so a << inside a string or a comment
// opens nothing. Undefined: a word that cannot be read cleanly.
function opensOf(line: string, stack: string[], win: boolean): Open[] | undefined {
  const open: Open[] = []
  for (let k = 0; k < line.length; k++) {
    const c = line[k] ?? ''
    const top = stack[stack.length - 1]
    if (top === "'") {
      if (c === "'") stack.pop()
      continue
    }
    if (c === '\\' && !win) {
      k++
      continue
    }
    // Arithmetic ($(( )), (( )), $[ ]): a << there is a shift and opens nothing. `((` is always read as arithmetic: a heredoc missed there only
    // makes its body be read as commands.
    if (top === '((' || top === '$[' || top === 'a(') {
      // 'a(': a plain ( inside arithmetic
      if (c === '(') stack.push('a(')
      else if (top === 'a(' && c === ')') stack.pop()
      else if (top === '((' && c === ')' && line[k + 1] === ')') {
        stack.pop()
        k++
      } else if (top === '$[' && c === ']') stack.pop()
      continue
    }
    if (top === '"') {
      if (c === '"') stack.pop()
      else if (c === '`') stack.push('`')
      else if (c === '$' && line[k + 1] === '(' && line[k + 2] === '(') {
        stack.push('((')
        k += 2
      } else if (c === '$' && line[k + 1] === '[') {
        stack.push('$[')
        k++
      } else if (c === '$' && line[k + 1] === '(') {
        stack.push('(')
        k++
      }
      continue
    }
    if (c === "'" || c === '"') stack.push(c)
    else if (c === '`') {
      if (top === '`') stack.pop()
      else stack.push('`')
    } else if (c === '(' && line[k + 1] === '(') {
      stack.push('((')
      k++
    } else if (c === '$' && line[k + 1] === '[') {
      stack.push('$[')
      k++
    } else if (c === '(') stack.push('(')
    else if (c === ')') {
      if (top === '(') stack.pop()
    } else if (c === '#' && (k === 0 || /[\s;&|(]/.test(line[k - 1] ?? ''))) break
    else if (c === '<' && line[k + 1] === '<') {
      if (line[k + 2] === '<') {
        k += 2
        continue
      }
      const dash = line[k + 2] === '-'
      const w = hereWord(line, k + (dash ? 3 : 2), win)
      if (w === undefined) return undefined
      if (w === null) {
        k++
        continue
      }
      open.push({ at: k, to: w.to, word: w.word, quoted: w.quoted, dash })
      k = w.to - 1
    }
  }
  return open
}

// Every heredoc of the command. Undefined when the command cannot be read cleanly (a heredoc that never closes, a word with an open quote, an opening
// line that ends inside a quote or goes on with \): the caller then reads every line as commands, so a doubt never hides a step.
function heredocsOf(lines: string[], win = false): Heredoc[] | undefined {
  const out: Heredoc[] = []
  const stack: string[] = []
  let i = 0
  while (i < lines.length) {
    const start = i
    const line = lines[i] ?? ''
    const open = opensOf(line, stack, win)
    if (open === undefined) return undefined
    i++
    if (open.length === 0) continue
    const top = stack[stack.length - 1]
    if (top === "'" || top === '"' || (!win && /(?<!\\)(?:\\\\)*\\$/.test(line))) return undefined
    for (const o of open) {
      const bodyStart = i
      const body: string[] = []
      while (i < lines.length) {
        const l = lines[i] ?? ''
        // <<- takes leading tabs off the body lines and the closing line, as bash does.
        if ((o.dash ? l.replace(/^\t+/, '') : l) === o.word) break
        body.push(l)
        i++
      }
      if (i >= lines.length) return undefined
      out.push({ start, bodyStart, end: i, line, at: o.at, to: o.to, body, quoted: o.quoted })
      i++
    }
  }
  return out
}

// The opening line without this heredoc's word.
const openerOf = (h: Heredoc): string => `${h.line.slice(0, h.at)} ${h.line.slice(h.to)}`

// Programs that run what they read on stdin as commands: a heredoc fed to one of them is a script, not data. ssh runs it on another computer.
const READERS = '(?:ba|z|da|k|a|c|tc)?sh|fish|pwsh|powershell|cmd|iex|invoke-expression|eval|source|su|sudo|doas|at|batch|crontab|osascript|expect|make'
const readerRe = (words: string): RegExp => new RegExp(`(?:^|[\\s;&|(\`$\\/\\\\"'])(?:${words})(?:\\.exe)?(?=[\\s;&|)\`'"]|$)|(?:^|[;&|(])\\s*\\.(?=\\s)`, 'i')
const RUNS_INPUT = readerRe(`${READERS}|ssh`)
const RUNS_HERE = readerRe(READERS)

// A heredoc runs on this computer when a piece of its opening line other than ssh reads commands (`cat <<'EOF' | sh`, `sudo -s <<EOF`,
// `source /dev/stdin <<EOF`, `eval "$(cat <<'EOF'`). What ssh reads is the remote reading's (remoteScripts).
function feedsHere(h: Heredoc, win: boolean): boolean {
  return splitTop(openerOf(h), win).some(p => {
    const u = unwrap(splitRedirects(tokenize(cleanPiece(p.text), win)).words)
    return u?.prog !== 'ssh' && RUNS_HERE.test(p.text)
  })
}

function stripHeredocs(cmd: string, win: boolean): { main: string; scripts: string[] } {
  const lines = cmd.split('\n')
  const docs = cmd.includes('<<') ? heredocsOf(lines, win) : []
  // Not read cleanly: every line is read as commands too.
  if (docs === undefined) return { main: cmd, scripts: lines.length > 1 ? lines : [] }
  const main: string[] = []
  const scripts: string[] = []
  let next = 0
  for (const h of docs) {
    if (h.start >= next) main.push(...lines.slice(next, h.start + 1))
    if (feedsHere(h, win)) scripts.push(h.body.join('\n'))
    // bash runs $(...) and backticks in an unquoted body; quotes there are plain text.
    else if (!h.quoted) scripts.push(...substitutions(h.body.join('\n'), win, false).map(x => x.body))
    next = h.end + 1
  }
  main.push(...lines.slice(next))
  return { main: main.join('\n'), scripts }
}

// The command with the bodies of data heredocs taken out, for the Windows readings only (the POSIX reading has its own split above).
// A body is data when it feeds no command reader and bash runs nothing in it: a quoted delimiter, or an unquoted body with no $( or backtick.
export function withoutDataHeredocs(cmd: string): string {
  if (!cmd.includes('<<')) return cmd
  const lines = cmd.split('\n')
  const docs = heredocsOf(lines)
  if (docs === undefined) return cmd
  const keep: string[] = []
  let next = 0
  for (const h of docs) {
    const joined = h.start > 0 && /\\$/.test(lines[h.start - 1] ?? '')
    const runs = h.quoted ? false : h.body.some(l => l.includes('$(') || l.includes('`'))
    const data = !joined && !runs && !RUNS_INPUT.test(openerOf(h))
    if (h.start >= next) keep.push(...lines.slice(next, h.start + 1))
    if (!data) keep.push(...lines.slice(h.bodyStart, h.end + 1))
    next = h.end + 1
  }
  keep.push(...lines.slice(next))
  return keep.join('\n')
}

// `win` reads a backslash as a path character. The guard asks only in addition to the POSIX reading, never instead of it.
export function splitTop(cmd: string, win = false): Piece[] {
  const out: Piece[] = []
  let cur = ''
  let q: '' | "'" | '"' = ''
  let sub = 0
  let tick = false
  const push = (pipedTo: boolean) => {
    if (cur.trim() !== '') out.push({ text: cur.trim(), pipedTo })
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
    if (c === '\\' && !win) {
      cur += c + n
      i++
      continue
    }
    if (c === '$' && n === '(') {
      sub++
      cur += '$('
      i++
      continue
    }
    if (sub > 0) {
      if (c === '(') sub++
      else if (c === ')') sub--
      cur += c
      continue
    }
    if (c === '`') {
      tick = !tick
      cur += c
      continue
    }
    if (tick) {
      cur += c
      continue
    }
    if (q === '"') {
      cur += c
      if (c === '"') q = ''
      continue
    }
    if (c === "'" || c === '"') {
      q = c
      cur += c
      continue
    }
    if (!win && (c === '<' || c === '>') && n === '(') {
      sub++
      cur += c + n
      i++
      continue
    }
    if (c === ';' || c === '\n') {
      push(false)
    } else if (c === '&' && n === '&') {
      push(false)
      i++
    } else if (c === '|' && n === '|') {
      push(false)
      i++
    } else if (c === '|') {
      if (n === '&') i++
      push(true)
    } else if (c === '&' && cmd[i - 1] !== '>' && n !== '>' && n !== '&') {
      push(false)
    } else {
      cur += c
    }
  }
  push(false)
  return out
}

function extractSubstitutions(text: string, win = false): string[] {
  return substitutions(text, win).map(s => s.body)
}

// `quotes` false reads quote marks as plain text, as in a heredoc body.
export function substitutions(text: string, win = false, quotes = true): { body: string; proc: boolean }[] {
  const out: { body: string; proc: boolean }[] = []
  let q = false
  let dq = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? ''
    if (c === '\\' && !win) {
      i++
      continue
    }
    if (c === "'" && !dq && quotes) {
      q = !q
      continue
    }
    if (q) continue
    if (c === '"' && quotes) {
      dq = !dq
      continue
    }
    const proc = quotes && !win && !dq && (c === '<' || c === '>') && text[i + 1] === '('
    if ((c === '$' || proc) && text[i + 1] === '(') {
      let depth = 1
      let j = i + 2
      while (j < text.length && depth > 0) {
        if (text[j] === '(') depth++
        else if (text[j] === ')') depth--
        j++
      }
      out.push({ body: text.slice(i + 2, depth === 0 ? j - 1 : j), proc })
      i = j - 1
    } else if (c === '`') {
      const j = text.indexOf('`', i + 1)
      const end = j < 0 ? text.length : j
      out.push({ body: text.slice(i + 1, end), proc: false })
      i = end
    }
  }
  return out
}

export function tokenize(piece: string, win = false): Tok[] {
  const toks: Tok[] = []
  let cur = ''
  let quoted = false
  let has = false
  let q: '' | "'" | '"' = ''
  const flush = () => {
    if (has) toks.push({ t: cur, quoted })
    cur = ''
    quoted = false
    has = false
  }
  for (let i = 0; i < piece.length; i++) {
    const c = piece[i] ?? ''
    const n = piece[i + 1] ?? ''
    if (q === "'") {
      if (c === "'") q = ''
      else cur += c
      continue
    }
    if (q === '"') {
      if (c === '"') q = ''
      else if (c === '\\' && !win && (n === '"' || n === '\\' || n === '$' || n === '`')) {
        cur += n
        i++
      } else cur += c
      continue
    }
    if (c === '\\' && !win) {
      if (n !== '\n' && n !== '') {
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
    if (c === '>' || c === '<') {
      if (has && /^\d+$/.test(cur) && !quoted) {
        cur = ''
        has = false
      } else flush()
      let op = c
      if (c === '>' && (n === '>' || n === '|')) {
        op += n
        i++
      } else if (c === '<' && n === '<') {
        op += n
        i++
        if (piece[i + 1] === '<') {
          op += '<'
          i++
        }
      }
      toks.push({ t: op, quoted: false, op: true })
      continue
    }
    cur += c
    has = true
  }
  flush()
  return toks
}

function isAssign(t: Tok): boolean {
  return !t.quoted && /^[A-Za-z_][A-Za-z0-9_]*=/.test(t.t)
}

function splitRedirects(toks: Tok[]): { words: Tok[]; redirects: Redirect[] } {
  const words: Tok[] = []
  const redirects: Redirect[] = []
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!
    if (t.op === true) {
      const target = toks[i + 1]
      if (target !== undefined && target.op !== true) {
        redirects.push({ op: t.t, target: target.t })
        i++
      }
      continue
    }
    words.push(t)
  }
  return { words, redirects }
}

function cleanPiece(text: string): string {
  let s = text.trim()
  let paren = false
  while (s.startsWith('(') || s.startsWith('{ ')) {
    if (s.startsWith('(')) paren = true
    s = s.slice(1).trim()
  }
  // Each trailing pattern starts only where its run starts, so a long run of ) or spaces is read once.
  if (paren) s = s.replace(/(?<!\))\)+\s*$/, '')
  s = s.replace(/(?:;\s*|(?<![;\s])\s*)}\s*$/, '')
  return s.trim()
}

function unwrap(words: Tok[]): { prog: string; args: Tok[]; viaXargs: boolean } | undefined {
  let i = 0
  let viaXargs = false
  for (let guard = 0; guard < 12; guard++) {
    while (i < words.length && isAssign(words[i]!)) i++
    const w = words[i]
    if (w === undefined) return undefined
    const name = basename(w.t)
    if (!WRAPPERS.has(name) || w.quoted) {
      return { prog: name, args: words.slice(i + 1), viaXargs }
    }
    if (name === 'xargs') viaXargs = true
    const valueFlags = WRAPPER_VALUE_FLAGS[name] ?? []
    i++
    let sawCommand = false
    while (i < words.length) {
      const a = words[i]!
      if (isAssign(a) && name === 'env') {
        i++
        continue
      }
      if (!a.quoted && a.t.startsWith('-') && a.t !== '-') {
        i += valueFlags.includes(a.t) ? 2 : 1
        continue
      }
      if (name === 'timeout' && !sawCommand) {
        sawCommand = true
        i++
        continue
      }
      break
    }
    if (i >= words.length) {
      return { prog: name, args: [], viaXargs }
    }
  }
  return undefined
}

export function commandsOf(cmd: string, depth = 0, win = false): Cmd[] {
  if (depth > 4 || cmd.length > 20000) return []
  const { main, scripts } = stripHeredocs(cmd, win)
  const out: Cmd[] = []
  for (const script of scripts) out.push(...commandsOf(script, depth + 1, win))
  const pieces = splitTop(main, win)
  let prev: Cmd | undefined
  let prevPiped = false
  for (const piece of pieces) {
    for (const body of extractSubstitutions(piece.text, win)) out.push(...commandsOf(body, depth + 1, win))
    const { words, redirects } = splitRedirects(tokenize(cleanPiece(piece.text), win))
    const u = unwrap(words)
    let here: Cmd | undefined
    if (u !== undefined) {
      here = {
        prog: u.prog,
        args: u.args,
        raw: piece.text,
        viaXargs: u.viaXargs,
        fedByDownload: prevPiped && prev !== undefined && DOWNLOADERS.has(prev.prog) && INTERPRETERS.has(u.prog) && !hasCFlag(u.args),
        fedByDecode: prevPiped && prev !== undefined && decodes(prev) && INTERPRETERS.has(u.prog) && (!hasCFlag(u.args) || u.viaXargs),
        redirects,
      }
      if (prevPiped && prev !== undefined) prev.into = here
      out.push(here)
      if (!here.fedByDecode && decodedScript(u.prog, u.args, piece.text, depth, win)) here.fedByDecode = true
      // A here-string fed to a program that reads commands on stdin (`bash <<<"rm -rf ~"`) is a script, as a heredoc fed to one is
      if (HERESTRING_READERS.has(u.prog)) for (const r of redirects) if (r.op === '<<<') out.push(...commandsOf(r.target, depth + 1, win))
      if (SHELLS.has(u.prog) || u.prog === 'fish') {
        const idx = u.args.findIndex(a => !a.quoted && /^-[a-zA-Z]*c$/.test(a.t))
        const script = idx >= 0 ? u.args[idx + 1] : undefined
        if (script !== undefined) out.push(...commandsOf(script.t, depth + 1, win))
      } else if (u.prog === 'su' || u.prog === 'runuser') {
        const script = suScript(u.args)
        if (script !== undefined) out.push(...commandsOf(script, depth + 1, win))
      } else if (SSH_LIKE.has(u.prog)) {
        for (const script of sshLocalScripts(u.args)) out.push(...commandsOf(script, depth + 1, win))
      } else if (u.prog === 'rsync') {
        const script = rsyncShell(u.args)
        if (script !== undefined) out.push(...commandsOf(script, depth + 1, win))
      } else if (u.prog === 'eval') {
        out.push(...commandsOf(u.args.map(a => a.t).join(' '), depth + 1, win))
      } else if (u.prog === 'find' || u.prog === 'fd') {
        const k = u.args.findIndex(a => a.t === '-exec' || a.t === '-execdir' || a.t === '-x' || a.t === '--exec')
        if (k >= 0) {
          const rest: string[] = []
          for (const a of u.args.slice(k + 1)) {
            if (a.t === ';' || a.t === '+') break
            rest.push(a.t.includes(' ') ? JSON.stringify(a.t) : a.t)
          }
          out.push(...commandsOf(rest.join(' '), depth + 1, win))
        }
      }
    }
    prev = here
    prevPiped = piece.pipedTo
  }
  return out
}

// Programs that run what they read on stdin as commands, for a here-string (the heredoc list is READERS)
const HERESTRING_READERS = new Set([...SHELLS, 'fish', 'su', 'runuser', 'sudo', 'doas', 'source', '.'])

// `su -c 'cmd'`, `su user -c 'cmd'`, `su --command=cmd`: the command su runs as the other user.
function suScript(args: Tok[]): string | undefined {
  for (let k = 0; k < args.length; k++) {
    const a = args[k]!
    if (a.op === true) continue
    if (/^-[a-zA-Z]*c$/.test(a.t) || a.t === '--command' || a.t === '--session-command') return args[k + 1]?.t
    const long = /^--(?:session-)?command=(.*)$/s.exec(a.t)
    if (long !== null) return long[1]
  }
  return undefined
}

// The rsync -e / --rsh command runs on this computer.
function rsyncShell(args: Tok[]): string | undefined {
  for (let k = 0; k < args.length; k++) {
    const a = args[k]!
    if (a.op === true) continue
    if (a.t === '-e' || a.t === '--rsh') return args[k + 1]?.t
    const v = /^(?:-e|--rsh=)(.+)$/s.exec(a.t)
    if (v !== null) return v[1]
  }
  return undefined
}

// ssh, scp and sftp run these -o option values on this computer (ssh_config(5)): `-o ProxyCommand=…`, `-oProxyCommand …`, `-o "LocalCommand …"`.
const SSH_LIKE = new Set(['ssh', 'scp', 'sftp'])
const SSH_LOCAL_OPT = /^\s*(?:ProxyCommand|LocalCommand|KnownHostsCommand)\s*(?:=\s*|\s+)(\S[\s\S]*)$/i

function sshLocalScripts(args: Tok[]): string[] {
  const out: string[] = []
  const words = args.filter(a => a.op !== true)
  for (let k = 0; k < words.length; k++) {
    const t = words[k]!.t
    if (!t.startsWith('-') || t.startsWith('--')) continue
    const letters = t.slice(1)
    for (let n = 0; n < letters.length; n++) {
      const ch = letters[n] ?? ''
      if (!SSH_VALUE.has(ch)) continue
      let value = letters.slice(n + 1)
      if (value === '') value = words[++k]?.t ?? ''
      // `-oProxyCommand sh -c x` as two words: the next word is the rest of the value.
      if (ch === 'o' && /^\s*(?:ProxyCommand|LocalCommand|KnownHostsCommand)\s*$/i.test(value) && words[k + 1] !== undefined) value = `${value} ${words[++k]!.t}`
      const m = ch === 'o' ? SSH_LOCAL_OPT.exec(value) : null
      if (m !== null && m[1] !== undefined) out.push(m[1])
      break
    }
  }
  return out
}

// ssh's options that take a value (ssh(1)); the first word after the options is the host, and every word after it is the remote command.
const SSH_VALUE = new Set(['B', 'b', 'c', 'D', 'E', 'e', 'F', 'I', 'i', 'J', 'L', 'l', 'm', 'O', 'o', 'P', 'p', 'Q', 'R', 'S', 'W', 'w'])

function sshParts(args: Tok[]): { host: string; rest: Tok[] } | undefined {
  const words = args.filter(a => a.op !== true)
  let i = 0
  while (i < words.length) {
    const a = words[i]!
    if (a.quoted || !a.t.startsWith('-') || a.t === '-') break
    i += 1
    if (a.t === '--') break
    const letters = a.t.slice(1)
    const k = [...letters].findIndex(ch => SSH_VALUE.has(ch))
    if (k === letters.length - 1) i += 1
  }
  const host = words[i]
  return host === undefined ? undefined : { host: host.t, rest: words.slice(i + 1) }
}

// What a line runs on another computer over ssh: the remote command (ssh joins its words with spaces, and the remote shell reads them again), and a
// heredoc fed to ssh with no remote command or to a remote shell (the remote shell reads it as a script). The caller checks each script with the
// remote computer as its place: its paths are not this computer's.
export function remoteScripts(cmd: string, win = false): { host: string; script: string }[] {
  if (cmd.length > 20000 || !/\bssh\b/.test(cmd)) return []
  const out: { host: string; script: string }[] = []
  const lines = cmd.split('\n')
  for (const h of cmd.includes('<<') ? (heredocsOf(lines, win) ?? []) : []) {
    for (const piece of splitTop(openerOf(h), win)) {
      const u = unwrap(splitRedirects(tokenize(cleanPiece(piece.text), win)).words)
      const parts = u?.prog === 'ssh' ? sshParts(u.args) : undefined
      if (parts === undefined) continue
      const first = parts.rest[0]
      if (first === undefined || (SHELLS.has(basename(first.t)) && !hasCFlag(parts.rest.slice(1)))) out.push({ host: parts.host, script: h.body.join('\n') })
    }
  }
  for (const c of commandsOf(cmd, 0, win)) {
    if (c.prog !== 'ssh') continue
    const parts = sshParts(c.args)
    if (parts !== undefined && parts.rest.length > 0) out.push({ host: parts.host, script: parts.rest.map(a => a.t).join(' ') })
  }
  return out
}

const INLINE_FLAG: Record<string, RegExp> = { python: /^-[a-zA-Z]*c$/, python3: /^-[a-zA-Z]*c$/, node: /^-(?:e|-eval)$/, ruby: /^-[a-zA-Z]*e$/, perl: /^-[a-zA-Z]*[eE]$/, php: /^-r$/ }

function decodedScript(prog: string, args: Tok[], raw: string, depth: number, win: boolean): boolean {
  const decodesIn = (text: string, procOnly: boolean): boolean =>
    substitutions(text, win).some(s => (!procOnly || s.proc) && commandsOf(s.body, depth + 1, win).some(decodes))
  if (prog === 'eval') return decodesIn(args.map(a => a.t).join(' '), false)
  if (prog === 'source' || prog === '.') return decodesIn(raw, true)
  if (!INTERPRETERS.has(prog)) return false
  const flag = SHELLS.has(prog) || prog === 'fish' ? /^-[a-zA-Z]*c$/ : INLINE_FLAG[prog]
  const idx = flag === undefined ? -1 : args.findIndex(a => !a.quoted && flag.test(a.t))
  if (idx >= 0) return decodesIn(args[idx + 1]?.t ?? '', false)
  return SHELLS.has(prog) && decodesIn(raw, true)
}

function hasCFlag(args: Tok[]): boolean {
  return args.some(a => !a.quoted && /^-[a-zA-Z]*c$/.test(a.t))
}

export function flagsOf(args: Tok[]): { short: Set<string>; long: Set<string>; positional: Tok[] } {
  const short = new Set<string>()
  const long = new Set<string>()
  const positional: Tok[] = []
  let ended = false
  for (const a of args) {
    if (a.op === true) continue
    if (!ended && !a.quoted && a.t === '--') {
      ended = true
      continue
    }
    if (!ended && !a.quoted && a.t.startsWith('--') && a.t.length > 2) long.add(a.t.split('=')[0] ?? a.t)
    else if (!ended && !a.quoted && /^-[A-Za-z]+$/.test(a.t)) for (const ch of a.t.slice(1)) short.add(ch)
    else positional.push(a)
  }
  return { short, long, positional }
}
