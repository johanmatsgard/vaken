// .NET file calls in PowerShell text for the Windows guard: pure text in, steps out. A step's `arg` is the path as Remove-Item would see it; anything else is `known: false`.

export type NetArg = { raw: string; known: boolean }
export type NetOp = { act: 'delete' | 'write' | 'source'; arg: NetArg; recursive?: boolean; overwrite?: boolean }

// Quoted strings are blanked at the same length, so a method name inside a string is not read as a call.
function mask(text: string): string {
  let out = ''
  let q: '' | "'" | '"' = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? ''
    if (q === "'") {
      if (c === "'" && text[i + 1] === "'") {
        out += '  '
        i++
      } else if (c === "'") {
        q = ''
        out += c
      } else out += ' '
      continue
    }
    if (q === '"') {
      if ((c === '`' || (c === '"' && text[i + 1] === '"')) && i + 1 < text.length) {
        out += '  '
        i++
      } else if (c === '"') {
        q = ''
        out += c
      } else out += ' '
      continue
    }
    if (c === "'" || c === '"') q = c
    out += c
  }
  return out
}

function argsAt(text: string, start: number): string[] | undefined {
  const out: string[] = []
  let cur = ''
  let depth = 0
  let q: '' | "'" | '"' = ''
  for (let i = start; i < text.length; i++) {
    const c = text[i] ?? ''
    if (q !== '') {
      cur += c
      if (q === '"' && c === '`' && i + 1 < text.length) cur += text[++i] ?? ''
      else if (c === q) {
        if (text[i + 1] === q) cur += text[++i] ?? ''
        else q = ''
      }
      continue
    }
    if (c === "'" || c === '"') q = c
    else if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) {
        if (c !== ')') return undefined
        if (cur.trim() !== '' || out.length > 0) out.push(cur.trim())
        return out
      }
      depth--
    } else if (c === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += c
  }
  return undefined
}

export function netArg(a: string): NetArg {
  const t = a.trim()
  if (/^'(?:[^']|'')*'$/.test(t)) return { raw: t.slice(1, -1).replace(/''/g, "'"), known: true }
  if (/^"(?:[^"`]|`.|"")*"$/s.test(t)) return { raw: t.slice(1, -1).replace(/`(.)/g, '$1').replace(/""/g, '"'), known: true }
  if (/^\$[\w:]+(?:\.\w+)*$/.test(t)) return { raw: t, known: true }
  return { raw: t, known: false }
}

const isTrue = (a: string | undefined): boolean => a !== undefined && a.trim() !== '' && !/^(?:\$false|0)$/i.test(a.trim())

const STATIC = /\[\s*(?:system\.)?io\.(file|directory)\s*\]\s*::\s*([a-z]+)\s*\(|\[\s*(?:microsoft\.visualbasic\.fileio\.)?filesystem\s*\]\s*::\s*([a-z]+)\s*\(/gi
const INSTANCE = /\.\s*(delete|moveto|copyto)\s*\(/gi

const ARG = `'(?:[^']|'')*'|"(?:[^"\`]|\`.|"")*"|\\$[\\w:]+`
const INFO = `(?:system\\.)?io\\.(?:file|directory)info`
const RECEIVERS: RegExp[] = [
  new RegExp(`\\(\\s*\\[\\s*${INFO}\\s*\\]\\s*(${ARG})\\s*\\)\\s*$`, 'i'),
  new RegExp(`\\[\\s*${INFO}\\s*\\]\\s*::\\s*new\\s*\\(\\s*(${ARG})\\s*\\)\\s*$`, 'i'),
  new RegExp(`\\(\\s*new-object\\s+(?:-typename\\s+)?${INFO}\\s+(?:-argumentlist\\s+)?\\(?\\s*(${ARG})\\s*\\)?\\s*\\)\\s*$`, 'i'),
  new RegExp(`\\(\\s*(?:get-item|gi)\\s+(?:-(?:path|literalpath|force)\\s+)*(${ARG}|[^\\s()'"|;,$]+)(?:\\s+-force)?\\s*\\)\\s*$`, 'i'),
]
const VAR_RECEIVER = /\$[\w:?]+(?:\.\w+|\[[^\]]*\])*\s*$/

function receiverOf(text: string, dot: number): NetArg {
  const tail = text.slice(Math.max(0, dot - 400), dot)
  for (const re of RECEIVERS) {
    const m = re.exec(tail)
    if (m !== null) return netArg(m[1] ?? '')
  }
  const v = VAR_RECEIVER.exec(tail)
  if (v !== null) return { raw: v[0].trim(), known: true }
  const shown = tail.trim().split(/[;|\n]/).pop()?.trim() ?? ''
  return { raw: shown === '' ? 'an object' : shown.slice(-60), known: false }
}

export function dotnetOps(text: string): NetOp[] {
  if (!/::|\.\s*(?:delete|moveto|copyto)\s*\(/i.test(text)) return []
  const m0 = mask(text)
  const out: NetOp[] = []
  const del = (a: string | undefined, recursive: boolean): void => {
    if (a !== undefined && a !== '') out.push({ act: 'delete', arg: netArg(a), recursive })
  }
  const write = (a: string | undefined, overwrite: boolean): void => {
    if (a !== undefined && a !== '' && !/^\$null$/i.test(a.trim())) out.push({ act: 'write', arg: netArg(a), overwrite })
  }
  const source = (a: string | undefined): void => {
    if (a !== undefined && a !== '') out.push({ act: 'source', arg: netArg(a) })
  }
  for (const m of m0.matchAll(STATIC)) {
    const args = argsAt(text, (m.index ?? 0) + m[0].length)
    if (args === undefined) continue
    const [a0, a1, a2] = args
    if (m[1] !== undefined) {
      const dir = m[1].toLowerCase() === 'directory'
      const name = (m[2] ?? '').toLowerCase()
      if (name === 'delete') del(a0, dir && isTrue(a1))
      else if (dir && name === 'createdirectory') write(a0, false)
      else if (name === 'move') {
        source(a0)
        write(a1, !dir && isTrue(a2))
      } else if (dir) continue
      else if (/^(?:writeall(?:text|lines|bytes)|create|createtext)(?:async)?$/.test(name)) write(a0, true)
      else if (/^(?:appendall(?:text|lines)|appendtext|openwrite)(?:async)?$/.test(name)) write(a0, false)
      else if (name === 'copy') write(a1, isTrue(a2))
      else if (name === 'replace') {
        source(a0)
        write(a1, true)
        write(a2, true)
      }
      continue
    }
    // A delete sent to the Recycle Bin can be undone, so it is not a permanent delete.
    const name = (m[3] ?? '').toLowerCase()
    const recycle = args.some(a => /sendtorecyclebin/i.test(a))
    if (name === 'deletefile') {
      if (!recycle) del(a0, false)
    } else if (name === 'deletedirectory') {
      if (!recycle) del(a0, !args.some(a => /throwifdirectorynonempty/i.test(a)))
    } else if (name === 'copyfile' || name === 'copydirectory') write(a1, isTrue(a2) && !/^\s*\[/.test(a2 ?? ''))
    else if (name === 'movefile' || name === 'movedirectory') {
      source(a0)
      write(a1, isTrue(a2) && !/^\s*\[/.test(a2 ?? ''))
    }
  }
  for (const m of m0.matchAll(INSTANCE)) {
    const at = m.index ?? 0
    const args = argsAt(text, at + m[0].length)
    if (args === undefined) continue
    const who = receiverOf(text, at)
    const name = (m[1] ?? '').toLowerCase()
    if (name === 'delete') out.push({ act: 'delete', arg: who, recursive: isTrue(args[0]) })
    else {
      if (name === 'moveto') out.push({ act: 'source', arg: who })
      write(args[0], isTrue(args[1]))
    }
  }
  return out
}
