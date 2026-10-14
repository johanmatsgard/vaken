// Local approximation of the plugin directory's rule MOD_CAPABILITY_USE_NOT_PLAIN, and a strict one. In a file that declares a function parameter named `$`, every
// use of the name `$` must be either a plain call `$.noun.method(...)` (exactly two property levels) or a whole argument `f($)` to a function declared with `function`
// at the top level of the same file (that helper call may stand anywhere), and a `$.noun.method(...)` call must stand as a statement, a variable initializer, a return value, an arrow's concise body, or be awaited in one of those.
// Nothing may be wrapped around it: no parentheses, casts, "!", "?.", brackets, further property access, template, operator, literal or other call argument.
// Finds the typescript JS API (TS 7 and newer ship none) through TYPESCRIPT_JS (path of typescript.js), TSC (a tsc path), the tsc on PATH, or a node_modules/typescript under the home folder. Run: node scripts/check-plain-capability.mjs [--selftest]
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createRequire } from 'module'
import { execFileSync } from 'child_process'

function findTypescript() {
  const cands = []
  const add = p => { if (p) try { cands.push(path.resolve(path.dirname(fs.realpathSync(p)), '..', 'lib', 'typescript.js')) } catch {} }
  if (process.env.TYPESCRIPT_JS) cands.push(process.env.TYPESCRIPT_JS)
  add(process.env.TSC)
  try { add(execFileSync(process.platform === 'win32' ? 'where' : 'which', ['tsc'], { encoding: 'utf8' }).split('\n')[0].trim()) } catch {}
  const home = os.homedir()
  try {
    for (const a of fs.readdirSync(home)) {
      cands.push(path.join(home, a, 'node_modules', 'typescript', 'lib', 'typescript.js'))
      try { for (const b of fs.readdirSync(path.join(home, a))) cands.push(path.join(home, a, b, 'node_modules', 'typescript', 'lib', 'typescript.js')) } catch {}
    }
  } catch {}
  for (const c of cands) if (fs.existsSync(c)) return createRequire(import.meta.url)(c)
  return undefined
}
const ts = findTypescript()
if (ts === undefined) {
  console.error('check-plain-capability: no typescript found (set TSC to a tsc path)'); process.exit(2)
}
const K = ts.SyntaxKind

function scan(file, text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const topFns = new Set(sf.statements.filter(s => s.kind === K.FunctionDeclaration && s.name).map(s => s.name.text))
  let declares = false
  const visit0 = n => {
    if (ts.isParameter(n) && ts.isIdentifier(n.name) && n.name.text === '$') declares = true
    ts.forEachChild(n, visit0)
  }
  visit0(sf)
  if (!declares) return []
  const out = []
  const allowedParent = (node, awaited = false) => {
    const p = node.parent
    switch (p.kind) {
      case K.ExpressionStatement: case K.ReturnStatement: return true
      case K.VariableDeclaration: return p.initializer === node
      case K.ArrowFunction: return p.body === node
      case K.AwaitExpression: return !awaited && allowedParent(p, true)
      default: return false
    }
  }
  const report = (n, why) => {
    const { line, character } = sf.getLineAndCharacterOfPosition(n.getStart(sf))
    out.push(`${file}:${line + 1}:${character + 1}: ${why}: ${n.parent.getText(sf).split('\n')[0].slice(0, 110)}`)
  }
  const visit = n => {
    if (ts.isIdentifier(n) && n.text === '$') {
      const p = n.parent
      if (ts.isParameter(p) && p.name === n) { /* the declaration */ }
      else if (ts.isPropertyAccessExpression(p) && p.expression === n && !p.questionDotToken) {
        const p2 = p.parent
        if (ts.isPropertyAccessExpression(p2) && p2.expression === p && !p2.questionDotToken) {
          const c = p2.parent
          if (ts.isCallExpression(c) && c.expression === p2 && !c.questionDotToken) {
            if (!allowedParent(c)) report(n, 'call is wrapped or used as a value')
          } else if (p.name.text === 'plugin' && !ts.isCallExpression(p2.parent)) {
            // $.plugin.name and $.plugin.root are plain data of the engine, not a capability call: they may only be read at once into a value.
            if (!allowedParent(p2)) report(n, 'plugin data read is wrapped')
          } else report(n, 'not a call of $.noun.method(...)')
        } else report(n, 'not a call of $.noun.method(...)')
      } else if (ts.isCallExpression(p) && p.arguments.includes(n)) {
        const ok = ts.isIdentifier(p.expression) && !p.typeArguments && topFns.has(p.expression.text)
        if (!ok) report(n, '$ passed to something that is not a top-level function of this file')
        // The helper call itself may sit anywhere (the directory accepts io($) inside arguments and expressions): only `$` alone matters.
      } else report(n, 'other use of $')
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

// The directory's JSX rule: in a .tsx file the names h and Fragment are kept for the compiled elements. Any binding or use of them, other than calling h, is reported.
function scanJsxNames(file, text) {
  if (!file.endsWith('.tsx')) return []
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const out = []
  const visit = n => {
    if (ts.isIdentifier(n) && (n.text === 'h' || n.text === 'Fragment')) {
      const p = n.parent
      const isName = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || (ts.isPropertySignature(p) && p.name === n) || (ts.isJsxAttribute(p) && p.name === n) || (ts.isMethodDeclaration(p) && p.name === n) || (ts.isPropertyDeclaration(p) && p.name === n)
      const isCall = ts.isCallExpression(p) && p.expression === n && n.text === 'h'
      if (!isName && !isCall) {
        const { line, character } = sf.getLineAndCharacterOfPosition(n.getStart())
        out.push(`${file}:${line + 1}:${character + 1}: the name ${n.text} is kept for JSX: ${text.split('\n')[line].trim().slice(0, 100)}`)
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

if (process.argv.includes('--selftest')) {
  const t = (src, n) => {
    const r = scan('t.ts', `function h($: X) {}\n${src}`)
    if (r.length !== n) { console.error(`selftest failed (${n} expected, ${r.length}):\n${src}\n${r.join('\n')}`); process.exit(1) }
  }
  t('on(async ($) => { const a = await $.x.y(1); await $.x.y(); h($); return $.x.y() })', 0)
  t('on(async ($) => { f($.x.y()) })', 1)
  t('on(async ($) => { const a = ($.x.y()) })', 1)
  t('on(async ($) => { const a = $.x.y().z })', 1)
  t('on(async ($) => { const a = $.x?.y() })', 1)
  t('on(async ($) => { const a = `${$.x.y()}` })', 1)
  t('on(async ($) => { g($) })', 1); t('on(async ($) => { h($) + 1 })', 0)
  t('on(async ($) => { const a = ($ as any).x.y() })', 1)
  t('on(async ($) => { const a = $!.x.y() })', 1)
  t('on(async ($) => { const a = $["x"].y() })', 1)
  t('on(async ($) => { const a = { k: $.x.y() } })', 1)
  t('on(async ($) => { const a = 1 + (await $.x.y()) })', 1)
  t('on(async ($) => { const a = $.x.y() || 1 })', 1)
  t('on(async ($) => { const a = $.x })', 1)
  t('on(async ($) => { const f = () => $.x.y() })', 0)
  console.log('check-plain-capability: selftest ok')
  process.exit(0)
}

const walk = d => fs.readdirSync(d).flatMap(f => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : [] })
process.chdir(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'))
const found = walk('mods/cockpit/hooks').flatMap(f => { const text = fs.readFileSync(f, 'utf8'); return [...scan(f, text), ...scanJsxNames(f, text)] })
if (found.length > 0) {
  console.log(found.join('\n'))
  console.log(`check-plain-capability: ${found.length} use(s) of $ that are not plain`)
  process.exit(1)
}
console.log('check-plain-capability: clean')
