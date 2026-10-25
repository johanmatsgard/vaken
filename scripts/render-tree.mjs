// Turns the drawn tree of a pane (JSON from ui.drawn()) into one HTML page, so a person can look at it.
// It is a stand-in for the app: Box, Text, Button and Svg are drawn the plain way, with the app's own text colour and no extra frames.
// Box sizes, margins, paddings and gaps are in text cells (a column is columnPt() wide, a row ROW_PT high, ui/tokens.ts), so a card in a column is drawn as wide as its column;
// the row layout (justify, align, grow, shrink, wrap), a truncated text and a hidden hover slot follow the tree's own props. Points are drawn as pixels.
// Usage: node scripts/render-tree.mjs <tree.json> <out.html> [dark|light] [pane width in points]
import { readFileSync, writeFileSync } from 'node:fs'

const [, , inFile, outFile, theme = 'dark', widthArg] = process.argv
if (inFile === undefined || outFile === undefined) {
  console.error('usage: node scripts/render-tree.mjs <tree.json> <out.html> [dark|light] [pane width in points]')
  process.exit(2)
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const COL = 7.9 // one text column in points: the Windows cell (COL_PT_WIN; a Mac is COL_PT_MAC, 8.8)
const ROW = 19 // one text row in points (ROW_PT)
const x = v => `${v * COL}px`
const y = v => `${v * ROW}px`
const num = v => typeof v === 'number'

// The app draws each Svg on its own, so its <style> classes never reach another one; inline here they would, so each gets its own names.
let svgN = 0
function ownClasses(src) {
  const n = ++svgN
  const names = [...new Set([...src.matchAll(/\.([A-Za-z][\w-]*)\s*\{/g)].map(m => m[1]))]
  return names.reduce((out, c) => out.replace(new RegExp(`\\.${c}(?=[\\s{,:])`, 'g'), `.${c}-s${n}`).replace(new RegExp(`class="${c}"`, 'g'), `class="${c}-s${n}"`), src)
}
// A picture's dark rules follow the drawing's theme, not the computer's (the app's own theme decides there): light drops them, dark always applies them
const DARK_RULE = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g
const schemed = src => src.replace(DARK_RULE, (_, rules) => (theme === 'light' ? '' : rules))
// The theme keys the app knows for text in a state colour
const THEME = { warning: 'var(--warning)', error: 'var(--error)' }

function draw(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return esc(node)
  const p = node.props ?? {}
  const kids = (node.children ?? []).map(draw).join('')
  if (node.type === 'Svg') return `<span class="svg" style="width:${p.width ?? 'auto'}px;height:${p.height ?? 'auto'}px">${ownClasses(schemed(p.source ?? ''))}</span>`
  // The host's Link: its label (or the address) as an underlined link
  if (node.type === 'Link') return `<a class="link" style="color:inherit;text-decoration:underline" href="${esc(p.href ?? '')}">${esc(p.label ?? p.href ?? '')}</a>`
  // A plain Button with a hotkey as the engine draws it: the key in the accent colour, a colon, the label (`1: Yes`); a label wider than its box is cut with an ellipsis, as the app cuts it
  if (node.type === 'Button') {
    const label = esc(String(p.label ?? '').replace(/ /g, ' ').trim())
    const shown = p.hotkey && p.plain ? `<span class="key">${esc(p.hotkey)}</span>: ${label}` : `${label}${p.hotkey ? `<span class="hot">${esc(p.hotkey)}</span>` : ''}`
    return `<button class="btn${p.plain ? ' plain' : ''}${p.dimColor ? ' dim' : ''}">${shown}</button>`
  }
  // A text box (the answer box): its placeholder in a framed field, its submit word after it, one text row high
  if (node.type === 'Input') return `<span class="inp"><span class="dim">${esc(String(p.value || p.placeholder || ''))}</span>${p.submitLabel ? `<button class="btn">${esc(String(p.submitLabel))}</button>` : ''}</span>`
  if (node.type === 'Text') {
    const cls = ['t', p.bold ? 'b' : '', p.dimColor ? 'dim' : '', p.italic ? 'i' : '', p.underline ? 'u' : '', String(p.wrap ?? '').startsWith('truncate') ? 'cut' : ''].filter(Boolean).join(' ')
    const color = typeof p.color === 'string' ? ` style="color:${esc(THEME[p.color] ?? p.color)}"` : ''
    return `<span class="${cls}"${color}>${kids}</span>`
  }
  if (node.type === 'Box') {
    const row = p.flexDirection === 'row'
    const pad = (a, b) => (num(p[a]) ? p[a] : num(p[b]) ? p[b] : num(p.padding) ? p.padding : 0)
    const style = [
      p.display === 'none' ? 'display:none' : 'display:flex',
      `flex-direction:${row ? 'row' : 'column'}`,
      p.flexWrap === 'wrap' ? 'flex-wrap:wrap' : '',
      p.justifyContent ? `justify-content:${p.justifyContent}` : '',
      p.alignItems ? `align-items:${p.alignItems}` : '',
      p.alignSelf ? `align-self:${p.alignSelf}` : '',
      num(p.flexGrow) ? `flex-grow:${p.flexGrow}` : '',
      num(p.flexShrink) ? `flex-shrink:${p.flexShrink}` : '',
      num(p.width) ? `width:${x(p.width)}` : '',
      num(p.minWidth) ? `min-width:${x(p.minWidth)}` : '',
      num(p.height) ? `height:${y(p.height)}` : '',
      num(p.minHeight) ? `min-height:${y(p.minHeight)}` : '',
      num(p.columnGap) ? `column-gap:${x(p.columnGap)}` : '',
      num(p.rowGap) ? `row-gap:${y(p.rowGap)}` : '',
      `padding:${y(pad('paddingTop', 'paddingY'))} ${x(pad('paddingRight', 'paddingX'))} ${y(pad('paddingBottom', 'paddingY'))} ${x(pad('paddingLeft', 'paddingX'))}`,
      num(p.marginLeft) ? `margin-left:${x(p.marginLeft)}` : '',
      num(p.marginRight) ? `margin-right:${x(p.marginRight)}` : '',
      num(p.marginTop) ? `margin-top:${y(p.marginTop)}` : '',
      num(p.marginBottom) ? `margin-bottom:${y(p.marginBottom)}` : '',
      p.overflow === 'hidden' ? 'overflow:hidden;min-width:0' : 'min-width:0',
      p.position === 'absolute' ? 'position:absolute' : 'position:relative',
      typeof p.backgroundColor === 'string' ? `background:${esc(p.backgroundColor)}` : '',
      p.borderStyle ? `border:1px solid var(--line);border-radius:${p.borderStyle === 'round' ? 10 : 0}px;padding-left:${x(1)};padding-right:${x(1)}` : '',
    ]
      .filter(Boolean)
      .join(';')
    return `<div style="${style}">${kids}</div>`
  }
  return kids
}

const tree = JSON.parse(readFileSync(inFile, 'utf8'))
const dark = theme !== 'light'
const width = Number(widthArg ?? 560)
const html = `<!doctype html><html><head><meta charset="utf-8"><title>pane</title><style>
:root{--bg:${dark ? '#262624' : '#faf9f5'};--fg:${dark ? '#e8e6dc' : '#1f1e1d'};--dim:${dark ? '#9a978c' : '#73726c'};--line:${dark ? '#3d3d3a' : '#dad9d4'};--btn:${dark ? '#30302e' : '#f0eee6'};--warning:${dark ? '#e8ad45' : '#6d4714'};--error:#d9534f}
body{margin:0;background:var(--bg);color:var(--fg);font:13px/19px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:${dark ? 'dark' : 'light'}}
#pane{width:${width}px;padding:16px;box-sizing:content-box}
.t{white-space:pre-wrap}.b{font-weight:600}.dim{color:var(--dim)}.i{font-style:italic}.u{text-decoration:underline}
.cut{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;min-width:0}
.btn{font:inherit;color:inherit;background:var(--btn);border:1px solid var(--line);border-radius:6px;padding:0 8px;cursor:pointer;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}
.btn.plain{background:none;border:none;padding:0 4px}.inp{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:6px;padding:0 0 0 8px}.btn.dim{color:var(--dim)}
.hot{color:var(--dim);margin-left:6px;font-size:12px}.key{color:#d97757}
.svg{display:inline-flex;flex-shrink:0}.svg svg{display:block}
</style></head><body><div id="pane">${draw(tree)}</div></body></html>`
writeFileSync(outFile, html)
console.log(`wrote ${outFile}`)
