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

function stripHeredocs(cmd: string): { main: string; scripts: string[] } {
  const lines = cmd.split('\n')
  const main: string[] = []
  const scripts: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    main.push(line)
    const m = /<<(-?)\s*(['"]?)([A-Za-z_][\w-]*)\2/.exec(line)
    if (m === null || line.includes('<<<')) continue
    const delim = m[3] ?? ''
    const body: string[] = []
    let j = i + 1
    while (j < lines.length) {
      const l = lines[j] ?? ''
      if ((m[1] === '-' ? l.trim() : l) === delim) break
      body.push(l)
      j++
    }
    const feedsShell = /(^|[\s;&|(])(ba|z|da|k|a)?sh\b/.test(line.slice(0, m.index))
    if (feedsShell) scripts.push(body.join('\n'))
    i = j
  }
  return { main: main.join('\n'), scripts }
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

export function substitutions(text: string, win = false): { body: string; proc: boolean }[] {
  const out: { body: string; proc: boolean }[] = []
  let q = false
  let dq = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? ''
    if (c === '\\' && !win) {
      i++
      continue
    }
    if (c === "'" && !dq) {
      q = !q
      continue
    }
    if (q) continue
    if (c === '"') {
      dq = !dq
      continue
    }
    const proc = !win && !dq && (c === '<' || c === '>') && text[i + 1] === '('
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
  const { main, scripts } = stripHeredocs(cmd)
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
      if (SHELLS.has(u.prog)) {
        const idx = u.args.findIndex(a => !a.quoted && /^-[a-zA-Z]*c$/.test(a.t))
        const script = idx >= 0 ? u.args[idx + 1] : undefined
        if (script !== undefined) out.push(...commandsOf(script.t, depth + 1, win))
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
