// Local mirror of the plugin directory's pre-submission rules. Run through scripts/check-directory.sh, which explains the modes.
// Blocking rules fail the check. Policy holds are counted and listed (the reviewer reads them, the README explains them) and fail only with --strict.
// Every finding prints as "RULE file:line why". Reads the code with the TypeScript JS API (scripts/find-typescript.mjs).
// Usage: node scripts/check-directory.mjs [--selftest] [--report] [--strict] [--root DIR] [--out FILE]
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { findTypescript } from './find-typescript.mjs'

const ts = findTypescript()
if (ts === undefined) {
  console.error('check-directory: no typescript found (set TSC to a tsc path)'); process.exit(2)
}
const K = ts.SyntaxKind
const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN = 'mods/cockpit'

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Findings

const BLOCKING = new Set([
  'MOD_CAPABILITY_USE_NOT_PLAIN', 'MOD_PERMISSION_ANSWER_UNREAD', 'HOOK_EVENT_UNKNOWN', 'MOD_IMPORT_DYNAMIC_COMPUTED', 'PACKAGE_SYSTEM_FILE', 'README_TOO_SHORT',
  'LICENSE_MISSING', 'PLUGIN_JSON_INVALID', 'FILE_NAME_INVALID', 'FILE_NAME_CASE_CLASH', 'GITATTRIBUTES_REWRITE',
])

const fileOf = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
const parse = (file, text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, /x$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const isCodeFile = f => /\.(tsx?|mjs|js)$/.test(f) && !/\.d\.ts$/.test(f)
const snip = (sf, n) => n.getText(sf).replace(/\s+/g, ' ').slice(0, 90)

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Code rules. Each takes (file, text, ctx) and returns [{ rule, line, why }].

// Rule MOD_PERMISSION_ANSWER_UNREAD: "write the agent description as an object in the call, with permissionMode as fixed text and no hooks".
// So the argument of an agent.register call must be an object literal, with no spread, no hooks property, and a permissionMode that is a plain string.
function ruleAgentRegister(file, text) {
  const sf = parse(file, text)
  const out = []
  const visit = n => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'register' &&
        ts.isPropertyAccessExpression(n.expression.expression) && n.expression.expression.name.text === 'agent') {
      const arg = n.arguments[0]
      const at = (node, why) => out.push({ rule: 'MOD_PERMISSION_ANSWER_UNREAD', line: fileOf(sf, node), why: `${why}: ${snip(sf, n)}` })
      if (arg === undefined || !ts.isObjectLiteralExpression(arg)) at(n, 'agent.register description is not an object literal written in the call')
      else {
        for (const p of arg.properties) {
          if (ts.isSpreadAssignment(p)) at(p, 'agent.register description has a spread')
          else if (p.name !== undefined && /^(hooks|permissionMode)$/.test(p.name.getText(sf).replace(/['"]/g, ''))) {
            const key = p.name.getText(sf).replace(/['"]/g, '')
            if (key === 'hooks') at(p, 'agent.register description has hooks')
            else if (!ts.isPropertyAssignment(p) || !(ts.isStringLiteral(p.initializer) || ts.isNoSubstitutionTemplateLiteral(p.initializer))) at(p, 'permissionMode is not fixed text')
          }
        }
      }
      // A conditional choosing the call's argument shows as a non-literal argument above; a conditional around the whole call is fine.
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

// Rule "unknown hook event": an on('event', ..., hook) call whose event is not in the engine type file.
function ruleUnknownEvent(file, text, ctx) {
  if (ctx.events === undefined) return []
  const sf = parse(file, text)
  const out = []
  const visit = n => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'on' && n.arguments.length >= 2) {
      const a = n.arguments[0]
      if ((ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) && !ctx.events.has(a.text) && !a.text.includes('*')) {
        out.push({ rule: 'HOOK_EVENT_UNKNOWN', line: fileOf(sf, a), why: `hook event "${a.text}" is not in the engine type file` })
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

// Rule MOD_IMPORT_DYNAMIC_COMPUTED: a Client element (el.Client, el.host.Client, Client) needs a module path that is a fixed string, in JSX or in h(Client, { module }).
function ruleClientModule(file, text) {
  const sf = parse(file, text)
  const out = []
  const isClientName = e => (ts.isIdentifier(e) && e.text === 'Client') || (ts.isPropertyAccessExpression(e) && e.name.text === 'Client')
  const fixed = e => e !== undefined && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))
  const visit = n => {
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && isClientName(n.tagName)) {
      const attrs = n.attributes.properties
      const m = attrs.find(a => ts.isJsxAttribute(a) && a.name.text === 'module')
      let ok = false
      if (m !== undefined && ts.isJsxAttribute(m) && m.initializer !== undefined) {
        ok = ts.isStringLiteral(m.initializer) || (ts.isJsxExpression(m.initializer) && fixed(m.initializer.expression))
      }
      if (!ok) out.push({ rule: 'MOD_IMPORT_DYNAMIC_COMPUTED', line: fileOf(sf, n), why: `Client module path is not a fixed string: ${snip(sf, n)}` })
    } else if (ts.isCallExpression(n) && n.arguments.length >= 1 && isClientName(n.arguments[0]) && (ts.isIdentifier(n.expression) && /^(h|createElement|jsx|jsxs)$/.test(n.expression.text))) {
      const props = n.arguments[1]
      let ok = false
      if (props !== undefined && ts.isObjectLiteralExpression(props)) {
        const m = props.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(sf).replace(/['"]/g, '') === 'module')
        ok = m !== undefined && ts.isPropertyAssignment(m) && fixed(m.initializer)
      }
      if (!ok) out.push({ rule: 'MOD_IMPORT_DYNAMIC_COMPUTED', line: fileOf(sf, n), why: `Client module path is not a fixed string: ${snip(sf, n)}` })
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

// Rule MOD_ANSWERS_PERMISSION (a policy hold): a hook "may change its event before next". The portal lists these shapes: next gets something other than the hook's own
// event; a name like a hook parameter ($, the event, next) is declared again inside the hook, or the hook uses `arguments`; the event is used in a pattern, a loop head,
// an optional chain, a cast, a test, a template, a list, an object or a spread. Reading a member (e.tool), passing it whole to next and binding it with const are fine.
// A hook is a function with the parameters ($, event, next). Handing the event to some other function is not in the portal's list, so it is not reported.
function hookOf(fn) {
  if (!(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) || ts.isFunctionDeclaration(fn))) return undefined
  const [p0, p1, p2] = fn.parameters
  if (fn.parameters.length !== 3 || p0 === undefined || !ts.isIdentifier(p0.name) || p0.name.text !== '$' || !ts.isIdentifier(p2.name) || p2.name.text !== 'next') return undefined
  return { event: p1.name, next: p2.name.text }
}
function hookEventName(fn) {
  const c = fn.parent
  if (!ts.isCallExpression(c)) return 'hook'
  const isOn = x => ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'on'
  if (isOn(c) && ts.isStringLiteralLike(c.arguments[0])) return c.arguments[0].text
  if (ts.isPropertyAccessExpression(c.expression) && c.expression.name.text === 'catch' && isOn(c.expression.expression) && ts.isStringLiteralLike(c.expression.expression.arguments[0])) {
    return c.expression.expression.arguments[0].text
  }
  return 'hook'
}
function ruleAnswersPermission(file, text) {
  const sf = parse(file, text)
  const out = []
  const visitFn = fn => {
    const h = hookOf(fn)
    if (h === undefined) return
    const event = hookEventName(fn)
    // One finding per hook: the first place, then every kind of use found in it.
    const hits = []
    const add = (n, why) => hits.push({ n: n.parent !== undefined && n.kind === K.Identifier ? n.parent : n, why })
    if (!ts.isIdentifier(h.event)) { add(fn.parameters[1], 'the event parameter is a pattern'); return }
    const e = h.event.text
    const own = new Set(['$', e, h.next])
    // `const x = e` binds the event whole: x is the event too.
    const alias = new Set([e])
    const body = fn.body
    if (body === undefined) return
    const visit = n => {
      if (n !== fn && hookOf(n) !== undefined) return // a hook inside a hook is read on its own
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && ts.isIdentifier(n.initializer) && n.initializer.text === e && (n.parent.flags & ts.NodeFlags.Const) !== 0) alias.add(n.name.text)
      // A name like a hook parameter declared again
      if ((ts.isParameter(n) && n.parent !== fn) || ts.isVariableDeclaration(n) || ts.isCatchClause(n) || ts.isFunctionDeclaration(n)) {
        const names = []
        const collect = b => { if (b === undefined) return; if (ts.isIdentifier(b)) names.push(b); else ts.forEachChild(b, collect) }
        if (ts.isCatchClause(n)) collect(n.variableDeclaration?.name)
        else if (ts.isFunctionDeclaration(n)) collect(n.name)
        else collect(n.name)
        for (const id of names) if (own.has(id.text)) { add(id, `"${id.text}" is declared again like a hook parameter`); return }
      }
      if (ts.isIdentifier(n) && n.text === 'arguments' && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) { add(n, 'the hook uses `arguments`'); return }
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === h.next && n.arguments.length > 0) {
        const a = n.arguments[0]
        if (!(ts.isIdentifier(a) && alias.has(a.text)) || n.arguments.length > 1) add(a, 'next is handed something other than its own event')
      }
      if (ts.isIdentifier(n) && n.text === e && n !== h.event) {
        const p = n.parent
        const isName = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || (ts.isPropertySignature(p) && p.name === n) || (ts.isParameter(p) && p.name === n) ||
          (ts.isVariableDeclaration(p) && p.name === n) || (ts.isBindingElement(p) && p.name === n) || (ts.isMethodDeclaration(p) && p.name === n) || ts.isJsxAttribute(p) || (ts.isShorthandPropertyAssignment(p) && false)
        if (!isName) {
          let why
          if (ts.isPropertyAccessExpression(p) && p.expression === n) {
            if (p.questionDotToken !== undefined) why = 'optional chain on the event'
            else {
              const g = p.parent
              const assigned = (ts.isBinaryExpression(g) && g.left === p && g.operatorToken.kind >= K.FirstAssignment && g.operatorToken.kind <= K.LastAssignment) ||
                ((ts.isPrefixUnaryExpression(g) || ts.isPostfixUnaryExpression(g)) && (g.operator === K.PlusPlusToken || g.operator === K.MinusMinusToken)) || ts.isDeleteExpression(g)
              if (assigned) why = 'the event is changed in place'
            }
          } else if (ts.isElementAccessExpression(p) && p.expression === n) why = 'bracket access on the event'
          else if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === h.next) why = undefined
          else if (ts.isAsExpression(p) || ts.isTypeAssertionExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression(p)) why = 'event cast'
          else if (ts.isParenthesizedExpression(p)) why = 'event in parentheses'
          else if (ts.isTemplateSpan(p)) why = 'event in a template'
          else if (ts.isSpreadElement(p) || ts.isSpreadAssignment(p)) why = 'event spread'
          else if (ts.isArrayLiteralExpression(p)) why = 'event in a list'
          else if (ts.isShorthandPropertyAssignment(p) || ts.isPropertyAssignment(p)) why = 'event in an object'
          else if ((ts.isForOfStatement(p) || ts.isForInStatement(p)) && p.expression === n) why = 'event in a loop head'
          else if (ts.isVariableDeclaration(p) && p.initializer === n && !ts.isIdentifier(p.name)) why = 'event taken apart by a pattern'
          else if (ts.isBindingElement(p)) why = 'event in a pattern'
          else if (ts.isBinaryExpression(p) && p.left === n && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) why = 'the event name is assigned'
          else if (ts.isConditionalExpression(p) && p.condition === n) why = 'event in a test'
          else if (ts.isBinaryExpression(p) && p.right === n && p.operatorToken.kind === K.EqualsToken && ts.isIdentifier(p.left)) { alias.add(p.left.text); why = undefined }
          else if (ts.isBinaryExpression(p) || ts.isPrefixUnaryExpression(p) || ts.isTypeOfExpression(p) || ts.isIfStatement(p) || ts.isWhileStatement(p)) why = 'event in a test'
          if (why !== undefined) add(n, why)
        }
      }
      ts.forEachChild(n, visit)
    }
    ts.forEachChild(body, visit)
    if (hits.length > 0) {
      hits.sort((x, y) => x.n.getStart(sf) - y.n.getStart(sf))
      const kinds = [...new Set(hits.map(x => x.why))]
      out.push({ rule: 'MOD_ANSWERS_PERMISSION', line: fileOf(sf, hits[0].n), why: `${event}: ${kinds.join('; ')}: ${snip(sf, hits[0].n)}` })
    }
  }
  const walk = n => { visitFn(n); ts.forEachChild(n, walk) }
  walk(sf)
  // A report inside a nested hook is found once by that hook's own visit and once by the outer hook's visit: keep one.
  return dedupe(out)
}
function dedupe(list) {
  const seen = new Set()
  return list.filter(f => { const k = `${f.rule}|${f.line}|${f.why}`; if (seen.has(k)) return false; seen.add(k); return true })
}

// Policy hold "uses a credential from the user's machine": $.env.get of a name that looks like a secret. The note says whether the file also reaches the network,
// a process, a tool server or a model, i.e. whether the value may be sent out.
const SECRET_NAME = /TOKEN|KEY|SECRET|PASSWORD|AUTH/i
const REACHES_OUT = /\.(http|mcp|process|model)\.[a-z]+\(|\.session\.send\(|\bfetch\(/
function ruleCredentialEnv(file, text) {
  const sf = parse(file, text)
  const out = []
  const visit = n => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'get' && ts.isPropertyAccessExpression(n.expression.expression) &&
        n.expression.expression.name.text === 'env' && n.arguments.length > 0 && ts.isStringLiteralLike(n.arguments[0]) && SECRET_NAME.test(n.arguments[0].text)) {
      const sent = REACHES_OUT.test(text) ? 'the file also reaches out (http, mcp, process, model or session.send)' : 'the file does not reach out'
      out.push({ rule: 'CREDENTIAL_FROM_ENV', line: fileOf(sf, n), why: `reads ${n.arguments[0].text} from the environment; ${sent}` })
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

// Policy hold "accessor / Proxy / then that runs code when read": a get/set accessor, Object.defineProperty with get or set, a Proxy, or a property called then.
function ruleAccessor(file, text) {
  const sf = parse(file, text)
  const out = []
  const at = (n, why) => out.push({ rule: 'ACCESSOR_OR_PROXY', line: fileOf(sf, n), why: `${why}: ${snip(sf, n)}` })
  const visit = n => {
    if (ts.isGetAccessor(n) || ts.isSetAccessor(n)) at(n, 'accessor runs code when read')
    else if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Proxy') at(n, 'Proxy')
    else if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Proxy') at(n, 'Proxy')
    else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Object' && /^define(Property|Properties)$/.test(n.expression.name.text)) {
      at(n, 'Object.' + n.expression.name.text + ' may add an accessor')
    } else if ((ts.isMethodDeclaration(n) || (ts.isPropertyAssignment(n) && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer)))) && ts.isIdentifier(n.name) && n.name.text === 'then') {
      // Only a function called then makes the object thenable (an await would call it); a plain data field of that name is not read as code.
      at(n, 'a function named then makes the object thenable')
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

const CODE_RULES = [ruleAgentRegister, ruleUnknownEvent, ruleClientModule, ruleAnswersPermission, ruleCredentialEnv, ruleAccessor]

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Folder rules. Each takes (pluginDir, files, rootDir) and returns [{ rule, file, line, why }].

const SYSTEM_FILES = /^(\.ds_store|thumbs\.db|desktop\.ini|__macosx)$/i
function ruleSystemFiles(dir, files) {
  const out = []
  const seen = new Set()
  for (const f of files) for (const part of f.split('/')) {
    if (SYSTEM_FILES.test(part)) { const k = `${f}|${part}`; if (!seen.has(k)) { seen.add(k); out.push({ rule: 'PACKAGE_SYSTEM_FILE', file: f, line: 0, why: `${part} is a system file and must not ship` }) } }
  }
  return out
}

// A README with fewer than 40 words outside code blocks is read as empty.
function ruleReadme(dir) {
  const p = path.join(dir, 'README.md')
  if (!fs.existsSync(p)) return [{ rule: 'README_TOO_SHORT', file: PLUGIN + '/README.md', line: 0, why: 'no README.md in the plugin folder' }]
  const words = fs.readFileSync(p, 'utf8').replace(/```[\s\S]*?```/g, ' ').replace(/~~~[\s\S]*?~~~/g, ' ').split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length
  return words < 40 ? [{ rule: 'README_TOO_SHORT', file: PLUGIN + '/README.md', line: 0, why: `README.md has ${words} words outside code blocks (needs 40)` }] : []
}

// plugin.json: name pattern, author, description and version present. A licence file or a license field.
function rulePluginJson(dir) {
  const out = []
  const f = PLUGIN + '/.claude-plugin/plugin.json'
  const bad = why => out.push({ rule: 'PLUGIN_JSON_INVALID', file: f, line: 0, why })
  let j
  try { j = JSON.parse(fs.readFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), 'utf8')) } catch (err) { bad(`cannot read plugin.json: ${err.message}`); j = undefined }
  if (j !== undefined) {
    if (typeof j.name !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(j.name)) bad(`name "${j.name}" is not lowercase letters, digits and single hyphens`)
    const a = j.author
    if (!(typeof a === 'string' && a.trim() !== '') && !(a !== null && typeof a === 'object' && typeof a.name === 'string' && a.name.trim() !== '')) bad('author is missing (a name)')
    if (typeof j.description !== 'string' || j.description.trim() === '') bad('description is missing')
    if (typeof j.version !== 'string' || !/^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/.test(j.version)) bad(`version "${j.version}" is missing or not x.y.z`)
  }
  const hasFile = fs.existsSync(dir) && fs.readdirSync(dir).some(n => /^(licen[cs]e|copying)(\.[a-z]+)?$/i.test(n))
  const hasField = j !== undefined && typeof j.license === 'string' && j.license.trim() !== ''
  if (!hasFile && !hasField) out.push({ rule: 'LICENSE_MISSING', file: PLUGIN, line: 0, why: 'no LICENSE file in the plugin folder and no license in plugin.json' })
  return out
}

// File names that fail on Windows or macOS, and names that differ only by case (two files that collide on a case-blind disk).
const WIN_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
function ruleFileNames(dir, files) {
  const out = []
  const lower = new Map()
  const dirs = new Set()
  for (const f of files) {
    const parts = f.split('/')
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const full = parts.slice(0, i + 1).join('/')
      const bad = why => out.push({ rule: 'FILE_NAME_INVALID', file: f, line: 0, why: `"${part}" ${why}` })
      if (!dirs.has(full)) {
        dirs.add(full)
        if (/[<>:"|?*\\\u0000-\u001f]/.test(part)) bad('has a character that Windows or macOS does not allow (< > : " | ? * \\ or a control character)')
        else if (/[ .]$/.test(part)) bad('ends with a space or a dot (Windows drops it)')
        else if (WIN_RESERVED.test(part.replace(/\..*$/, ''))) bad('is a reserved device name on Windows')
        else if (Buffer.byteLength(part) > 255) bad('is longer than 255 bytes')
        const k = full.toLowerCase()
        const prev = lower.get(k)
        if (prev !== undefined && prev !== full) out.push({ rule: 'FILE_NAME_CASE_CLASH', file: full, line: 0, why: `differs only by case from ${prev}` })
        else lower.set(k, full)
      }
    }
  }
  return out
}

// .gitattributes above or inside the plugin folder: export-ignore, export-subst and content-rewriting attributes. merge= (a merge driver) is fine; filter= is not.
// ident, working-tree-encoding rewrite content too (blocking); text and eol may rewrite at checkout (a hold, listed as GITATTRIBUTES_EOL).
function ruleGitattributes(rootDir) {
  const out = []
  const pluginAbs = path.join(rootDir, PLUGIN)
  const places = [rootDir]
  let cur = rootDir
  for (const part of PLUGIN.split('/')) { cur = path.join(cur, part); places.push(cur) }
  const inside = []
  const walk = d => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else if (n === '.gitattributes') inside.push(p) } }
  if (fs.existsSync(pluginAbs)) walk(pluginAbs)
  const all = [...new Set([...places.map(d => path.join(d, '.gitattributes')), ...inside])].filter(p => fs.existsSync(p))
  for (const p of all) {
    const rel = path.relative(rootDir, p).split(path.sep).join('/')
    fs.readFileSync(p, 'utf8').split('\n').forEach((raw, i) => {
      const line = raw.replace(/#.*$/, '').trim()
      if (line === '') return
      const attrs = line.split(/\s+/).slice(1)
      for (const a of attrs) {
        if (/^-?export-(ignore|subst)/.test(a) || /^filter(=|$)/.test(a) || /^ident$/.test(a) || /^working-tree-encoding=/.test(a)) {
          out.push({ rule: 'GITATTRIBUTES_REWRITE', file: rel, line: i + 1, why: `${a} changes or leaves out files in the package` })
        } else if (/^(text|text=auto|eol=.*)$/.test(a)) {
          out.push({ rule: 'GITATTRIBUTES_EOL', file: rel, line: i + 1, why: `${a} may rewrite line ends at checkout` })
        }
      }
    })
  }
  return out
}

// Policy holds on what ships: a non-image file over 256 KiB, more than 512 files, a binary file that is not an image or a font.
const IMAGE = /\.(png|jpe?g|gif|webp)$/i
const FONT = /\.(woff2?|ttf|otf)$/i
function rulePackage(dir, files) {
  const out = []
  if (files.length > 512) out.push({ rule: 'FILE_COUNT', file: PLUGIN, line: 0, why: `${files.length} files in the plugin folder (the validator reads 512)` })
  for (const f of files) {
    const abs = path.join(dir, f)
    const size = fs.statSync(abs).size
    if (size > 256 * 1024 && !IMAGE.test(f)) out.push({ rule: 'FILE_TOO_LARGE', file: f, line: 0, why: `${Math.round(size / 1024)} KiB, over 256 KiB (only images may be larger)` })
    if (!IMAGE.test(f) && !FONT.test(f)) {
      const fd = fs.openSync(abs, 'r')
      const buf = Buffer.alloc(Math.min(size, 8000))
      fs.readSync(fd, buf, 0, buf.length, 0)
      fs.closeSync(fd)
      if (buf.includes(0)) out.push({ rule: 'BINARY_FILE', file: f, line: 0, why: 'binary file that is not png, jpeg, gif, webp or a font' })
    }
  }
  return out
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Running

const walkFiles = (base, rel = '') => fs.readdirSync(path.join(base, rel)).sort().flatMap(n => {
  const r = rel === '' ? n : `${rel}/${n}`
  return fs.statSync(path.join(base, r)).isDirectory() ? (n === '.git' || n === 'node_modules' ? [] : walkFiles(base, r)) : [r]
})

// The events a hook may name: every 'noun.verb' key of the engine's call and event maps (a call name is also an event), and classic.<Name> for each classic hook event.
function eventsOf(rootDir) {
  const p = path.join(rootDir, 'scripts/types/claude-code.d.ts')
  if (!fs.existsSync(p)) return undefined
  const text = fs.readFileSync(p, 'utf8')
  const set = new Set()
  for (const m of text.matchAll(/^ {6}'([a-z]+(?:\.[a-z]+)+)':/gm)) set.add(m[1])
  for (const m of text.matchAll(/hook_event_name: '([A-Za-z]+)'/g)) set.add('classic.' + m[1])
  return set.size > 0 ? set : undefined
}

// Rule MOD_CAPABILITY_USE_NOT_PLAIN is the job of scripts/check-plain-capability.mjs, which prints file:line:col: why: text. It is run here, not copied.
function runPlain(rootDir) {
  let text = ''
  try { text = execFileSync(process.execPath, [path.join(HERE, 'check-plain-capability.mjs')], { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } catch (err) { text = String(err.stdout ?? '') + String(err.stderr ?? '') }
  const out = []
  for (const l of text.split('\n')) {
    const m = /^(\S+?):(\d+):\d+: (.*)$/.exec(l)
    if (m !== null) out.push({ rule: 'MOD_CAPABILITY_USE_NOT_PLAIN', file: m[1], line: Number(m[2]), why: m[3] })
  }
  return out
}

function scanRoot(rootDir, { withPlain }) {
  const dir = path.join(rootDir, PLUGIN)
  const found = []
  if (!fs.existsSync(dir)) return [{ rule: 'PLUGIN_JSON_INVALID', file: PLUGIN, line: 0, why: 'the plugin folder does not exist' }]
  const files = walkFiles(dir)
  const ctx = { events: eventsOf(rootDir) }
  for (const f of files) {
    if (!isCodeFile(f)) continue
    const text = fs.readFileSync(path.join(dir, f), 'utf8')
    for (const rule of CODE_RULES) {
      // The hook rules read the plugin's hook modules only (the validator reads the files that declare hooks), the folder rules read every file.
      for (const x of rule(`${PLUGIN}/${f}`, text, ctx)) found.push({ ...x, file: `${PLUGIN}/${f}` })
    }
  }
  const named = fs => fs.map(f => ({ ...f, file: f.file.startsWith(PLUGIN) || f.file.startsWith('.') ? f.file : `${PLUGIN}/${f.file}` }))
  found.push(...named(ruleSystemFiles(dir, files)), ...ruleReadme(dir), ...rulePluginJson(dir), ...named(ruleFileNames(dir, files)), ...ruleGitattributes(rootDir), ...named(rulePackage(dir, files)))
  if (withPlain) found.push(...runPlain(rootDir))
  return dedupe(found.map(f => ({ ...f, line: f.line ?? 0 })).map(f => ({ ...f, why: f.why })))
}

const isBlocking = r => BLOCKING.has(r)
const fmt = f => `${f.rule} ${f.file}${f.line > 0 ? ':' + f.line : ''} ${f.why}`

function summarize(found) {
  const by = new Map()
  for (const f of found) by.set(f.rule, [...(by.get(f.rule) ?? []), f])
  return by
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Selftest: small fixtures, written to a temporary folder. A fixture plugin that is clean, then one change per rule that must give exactly that rule.

function selftest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-directory-'))
  let failed = 0
  const fail = msg => { failed++; console.error('selftest failed: ' + msg) }
  const types = `export interface X {\n      'tool.call': ToolCallInput;\n      'command.run': CommandRunInput;\n      'session.start': SessionStartInput;\n}\n`
  const readme = 'This fixture plugin shows a quiet pane beside the chat. '.repeat(8)
  const goodHook = `on('command.run', { name: /(?<a>)/ }, async ($, e, next) => {\n  const t = e.args\n  return next(e)\n}).catch(($, e, next) => next(e))\n`
  const make = (name, edit) => {
    const root = path.join(tmp, name)
    const plug = path.join(root, PLUGIN)
    fs.mkdirSync(path.join(plug, '.claude-plugin'), { recursive: true })
    fs.mkdirSync(path.join(plug, 'hooks'), { recursive: true })
    fs.mkdirSync(path.join(root, 'scripts/types'), { recursive: true })
    fs.writeFileSync(path.join(root, 'scripts/types/claude-code.d.ts'), types)
    fs.writeFileSync(path.join(plug, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'fixture', version: '1.0.0', description: 'A fixture.', author: { name: 'A B' }, license: 'MIT' }))
    fs.writeFileSync(path.join(plug, 'README.md'), readme)
    fs.writeFileSync(path.join(plug, 'hooks/a.ts'), goodHook)
    fs.writeFileSync(path.join(root, '.gitattributes'), '* -text\nrows/*.ts merge=rows\n')
    edit?.(root, plug)
    return root
  }
  const rules = root => [...new Set(scanRoot(root, { withPlain: false }).map(f => f.rule))].sort()
  const expect = (name, want, edit) => {
    const got = rules(make(name, edit))
    if (JSON.stringify(got) !== JSON.stringify([...want].sort())) fail(`${name}: wanted [${want}] got [${got}]`)
  }
  const hook = body => (root, plug) => { fs.rmSync(path.join(plug, 'hooks/a.ts')); fs.writeFileSync(path.join(plug, 'hooks/a.tsx'), `on('command.run', async ($, e, next) => {\n${body}\n})\n`) }
  const code = src => (root, plug) => { fs.rmSync(path.join(plug, 'hooks/a.ts')); fs.writeFileSync(path.join(plug, 'hooks/a.tsx'), src) }

  expect('clean', [])
  // agent.register
  expect('agent-ok', [], code('function f($: X) { return $.agent.register({ name: "a", description: "d", permissionMode: "plan" }) }'))
  expect('agent-var', ['MOD_PERMISSION_ANSWER_UNREAD'], code('function f($: X, d: Y) { return $.agent.register(d) }'))
  expect('agent-ternary', ['MOD_PERMISSION_ANSWER_UNREAD'], code('function f($: X, c: boolean) { return $.agent.register(c ? { name: "a" } : { name: "b" }) }'))
  expect('agent-spread', ['MOD_PERMISSION_ANSWER_UNREAD'], code('function f($: X, d: Y) { return $.agent.register({ name: "a", ...d }) }'))
  expect('agent-mode', ['MOD_PERMISSION_ANSWER_UNREAD'], code('function f($: X, m: string) { return $.agent.register({ name: "a", permissionMode: m }) }'))
  expect('agent-hooks', ['MOD_PERMISSION_ANSWER_UNREAD'], code('function f($: X) { return $.agent.register({ name: "a", hooks: {} }) }'))
  // events
  expect('event-unknown', ['HOOK_EVENT_UNKNOWN'], code("on('tool.cal', async ($, e, next) => next(e))"))
  expect('event-local-on', [], code("function g(on: (n: string) => boolean) { return on('working') }"))
  // Client
  expect('client-ok', [], code('const a = <el.host.Client module="./p.tsx" />; const b = <Client module={"./p.tsx"} />'))
  expect('client-computed', ['MOD_IMPORT_DYNAMIC_COMPUTED'], code('const a = <el.Client module={m} />'))
  expect('client-missing', ['MOD_IMPORT_DYNAMIC_COMPUTED'], code('const a = <el.host.Client key="k" />'))
  expect('client-template', ['MOD_IMPORT_DYNAMIC_COMPUTED'], code('const a = <el.Client module={`./${n}.tsx`} />'))
  // MOD_ANSWERS_PERMISSION
  expect('perm-member', [], hook('  const t = e.tool.name\n  return next(e)'))
  expect('perm-const', [], hook('  const ev = e\n  return next(ev)'))
  expect('perm-next-other', ['MOD_ANSWERS_PERMISSION'], hook('  return next({ ...e0(), a: 1 })'))
  expect('perm-next-spread', ['MOD_ANSWERS_PERMISSION'], hook('  return next({ ...e, text: "x" })'))
  expect('perm-redeclare', ['MOD_ANSWERS_PERMISSION'], hook('  const next2 = 1; const f = (e: number) => e; return next(e)'))
  expect('perm-arguments', ['MOD_ANSWERS_PERMISSION'], hook('  const n = arguments.length; return next(e)'))
  expect('perm-pattern', ['MOD_ANSWERS_PERMISSION'], hook('  const { args } = e\n  return next(e)'))
  expect('perm-loop', ['MOD_ANSWERS_PERMISSION'], hook('  for (const x of e) { }\n  return next(e)'))
  expect('perm-optional', ['MOD_ANSWERS_PERMISSION'], hook('  const a = e?.args\n  return next(e)'))
  expect('perm-cast', ['MOD_ANSWERS_PERMISSION'], hook('  const a = (e as Y).args\n  return next(e)'))
  expect('perm-template', ['MOD_ANSWERS_PERMISSION'], hook('  const a = `${e}`\n  return next(e)'))
  expect('perm-list', ['MOD_ANSWERS_PERMISSION'], hook('  const a = [e]\n  return next(e)'))
  expect('perm-object', ['MOD_ANSWERS_PERMISSION'], hook('  const a = { e }\n  return next(e)'))
  expect('perm-test', ['MOD_ANSWERS_PERMISSION'], hook('  if (e) { }\n  return next(e)'))
  expect('perm-assign', ['MOD_ANSWERS_PERMISSION'], hook('  e.args = "x"\n  return next(e)'))
  // credential
  expect('cred-hit', ['CREDENTIAL_FROM_ENV'], code('function f($: X) { return $.env.get("API_TOKEN") }'))
  expect('cred-fine', [], code('function f($: X) { return $.env.get("HOME") }'))
  // accessor
  expect('acc-get', ['ACCESSOR_OR_PROXY'], code('const o = { get a() { return 1 } }'))
  expect('acc-define', ['ACCESSOR_OR_PROXY'], code('Object.defineProperty(o, "a", { get: () => 1 })'))
  expect('acc-proxy', ['ACCESSOR_OR_PROXY'], code('const p = new Proxy({}, {})'))
  expect('acc-then', ['ACCESSOR_OR_PROXY'], code('const o = { then: () => 1 }'))
  expect('acc-then-data', [], code('const o = { then: "x" }'))
  expect('acc-then-call', [], code('const p = q.then(() => 1)'))
  // folder rules
  expect('sys-dsstore', ['PACKAGE_SYSTEM_FILE'], (r, p) => fs.writeFileSync(path.join(p, '.DS_Store'), 'x'))
  expect('sys-macosx', ['PACKAGE_SYSTEM_FILE'], (r, p) => { fs.mkdirSync(path.join(p, '__MACOSX')); fs.writeFileSync(path.join(p, '__MACOSX/a.txt'), 'x') })
  expect('sys-thumbs', ['PACKAGE_SYSTEM_FILE'], (r, p) => fs.writeFileSync(path.join(p, 'hooks/Thumbs.db'), 'x'))
  expect('readme-short', ['README_TOO_SHORT'], (r, p) => fs.writeFileSync(path.join(p, 'README.md'), '# T\nShort.\n```\n' + 'word '.repeat(80) + '\n```\n'))
  expect('readme-missing', ['README_TOO_SHORT'], (r, p) => fs.rmSync(path.join(p, 'README.md')))
  expect('license-file', [], (r, p) => { fs.writeFileSync(path.join(p, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'fixture', version: '1.0.0', description: 'A.', author: { name: 'A' } })); fs.writeFileSync(path.join(p, 'LICENSE'), 'MIT') })
  expect('license-missing', ['LICENSE_MISSING'], (r, p) => fs.writeFileSync(path.join(p, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'fixture', version: '1.0.0', description: 'A.', author: { name: 'A' } })))
  expect('json-name', ['PLUGIN_JSON_INVALID'], (r, p) => fs.writeFileSync(path.join(p, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'Fix ture', version: '1.0.0', description: 'A.', author: { name: 'A' }, license: 'MIT' })))
  expect('json-author', ['PLUGIN_JSON_INVALID'], (r, p) => fs.writeFileSync(path.join(p, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'fixture', version: '1.0.0', description: 'A.', license: 'MIT' })))
  expect('json-version', ['PLUGIN_JSON_INVALID'], (r, p) => fs.writeFileSync(path.join(p, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'fixture', description: 'A.', author: 'A', license: 'MIT' })))
  // File names are checked on lists of names, not written: a Mac disk is blind to case and Windows refuses a colon, a device name or a trailing dot.
  const names = (label, want, files) => {
    const got = [...new Set(ruleFileNames('', files).map(f => f.rule))]
    if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${label}: wanted [${want}] got [${got}]`)
  }
  names('name-colon', ['FILE_NAME_INVALID'], ['hooks/a:b.txt'])
  names('name-reserved', ['FILE_NAME_INVALID'], ['hooks/aux.txt'])
  names('name-trailing-dot', ['FILE_NAME_INVALID'], ['hooks/a.'])
  names('name-case', ['FILE_NAME_CASE_CLASH'], ['hooks/Ab.txt', 'hooks/aB.txt'])
  names('name-fine', [], ['hooks/a.txt', 'hooks/b/c.ts'])
  expect('attr-merge-ok', [], (r) => fs.writeFileSync(path.join(r, '.gitattributes'), '* -text\nrows/*.ts merge=rows # keep\n'))
  expect('attr-filter', ['GITATTRIBUTES_REWRITE'], (r) => fs.writeFileSync(path.join(r, '.gitattributes'), '* filter=lfs\n'))
  expect('attr-export', ['GITATTRIBUTES_REWRITE'], (r, p) => fs.writeFileSync(path.join(p, '.gitattributes'), 'hooks export-ignore\n'))
  expect('attr-eol', ['GITATTRIBUTES_EOL'], (r) => fs.writeFileSync(path.join(r, '.gitattributes'), '* text=auto\n'))
  expect('big-file', ['FILE_TOO_LARGE'], (r, p) => fs.writeFileSync(path.join(p, 'hooks/big.json'), JSON.stringify('x'.repeat(300 * 1024))))
  expect('big-image', [], (r, p) => fs.writeFileSync(path.join(p, 'hooks/big.png'), Buffer.alloc(300 * 1024, 1)))
  expect('binary', ['BINARY_FILE'], (r, p) => fs.writeFileSync(path.join(p, 'hooks/a.bin'), Buffer.from([1, 0, 2])))
  expect('font-ok', [], (r, p) => fs.writeFileSync(path.join(p, 'hooks/a.woff2'), Buffer.from([1, 0, 2])))
  expect('count', ['FILE_COUNT'], (r, p) => { for (let i = 0; i < 520; i++) fs.writeFileSync(path.join(p, `hooks/f${i}.txt`), 'x') })

  // The strict and report modes on a fixture with one blocking and one policy finding.
  const root = make('modes', code('function f($: X, d: Y) { return $.agent.register(d) }\nfunction g($: X) { return $.env.get("API_TOKEN") }'))
  const run = args => { try { execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--root', root, '--no-plain', ...args], { stdio: 'pipe' }); return 0 } catch (err) { return err.status } }
  if (run([]) !== 1) fail('a blocking finding must exit 1')
  if (run(['--report']) !== 0) fail('--report must exit 0')
  const root2 = make('modes2', code('function g($: X) { return $.env.get("API_TOKEN") }'))
  const run2 = args => { try { execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--root', root2, '--no-plain', ...args], { stdio: 'pipe' }); return 0 } catch (err) { return err.status } }
  if (run2([]) !== 0) fail('a policy hold alone must exit 0')
  if (run2(['--strict']) !== 1) fail('--strict must exit 1 on a policy hold')

  fs.rmSync(tmp, { recursive: true, force: true })
  if (failed > 0) process.exit(1)
  console.log('check-directory: selftest ok')
  process.exit(0)
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

const argv = process.argv.slice(2)
if (argv.includes('--selftest')) selftest()
const rootArg = argv.indexOf('--root')
const outArg = argv.indexOf('--out')
const rootDir = rootArg >= 0 ? path.resolve(argv[rootArg + 1]) : path.resolve(HERE, '..')
const found = scanRoot(rootDir, { withPlain: !argv.includes('--no-plain') && rootArg < 0 })
const blocking = found.filter(f => isBlocking(f.rule))
const holds = found.filter(f => !isBlocking(f.rule))
const lines = []
if (blocking.length > 0) lines.push('Blocking (the directory refuses these):', ...blocking.map(fmt), '')
if (holds.length > 0) lines.push('Policy holds (the reviewer reads these; the README explains them):', ...holds.map(fmt), '')
const perRule = [...summarize(found)].map(([r, l]) => `  ${r}${isBlocking(r) ? '' : ' (hold)'}: ${l.length}`)
lines.push(`check-directory: ${blocking.length} blocking, ${holds.length} policy hold(s)`, ...perRule)
if (outArg >= 0) { fs.mkdirSync(path.dirname(path.resolve(argv[outArg + 1])), { recursive: true }); fs.writeFileSync(argv[outArg + 1], lines.join('\n') + '\n') }
if (argv.includes('--quiet')) console.log(lines.slice(lines.findIndex(l => l.startsWith('check-directory:'))).join('\n'))
else console.log(lines.join('\n'))
const strict = argv.includes('--strict')
process.exit(argv.includes('--report') ? 0 : blocking.length > 0 || (strict && holds.length > 0) ? 1 : 0)
