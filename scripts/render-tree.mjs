// Turns the drawn tree of a pane (JSON from ui.drawn()) into one HTML page, so a person can look at it.
// It is a stand-in for the app: Box, Text, Button and Svg are drawn the plain way, with the app's own text colour and no extra frames.
// Box sizes, margins, paddings and gaps are in text cells (a column is COL_PT wide, a row ROW_PT high, ui/tokens.ts), so a card in a column is drawn as wide as its column;
// the row layout (justify, align, grow, shrink, wrap), a truncated text and a hidden hover slot follow the tree's own props. Points are drawn as pixels.
// Usage: node scripts/render-tree.mjs <tree.json> <out.html> [dark|light] [pane width in points]
import { readFileSync, writeFileSync } from 'node:fs'

const [, , inFile, outFile, theme = 'dark', widthArg] = process.argv
if (inFile === undefined || outFile === undefined) {
  console.error('usage: node scripts/render-tree.mjs <tree.json> <out.html> [dark|light] [pane width in points]')
  process.exit(2)
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const COL = 7.9 // one text column in points (COL_PT)
const ROW = 19 // one text row in points (ROW_PT)
const x = v => `${v * COL}px`
const y = v => `${v * ROW}px`
const num = v => typeof v === 'number'

function draw(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return esc(node)
  const p = node.props ?? {}
  const kids = (node.children ?? []).map(draw).join('')
  if (node.type === 'Svg') return `<span class="svg" style="width:${p.width ?? 'auto'}px;height:${p.height ?? 'auto'}px">${p.source ?? ''}</span>`
  if (node.type === 'Button') return `<button class="btn${p.plain ? ' plain' : ''}${p.dimColor ? ' dim' : ''}">${esc(String(p.label ?? '').replace(/ /g, ' ').trim())}${p.hotkey ? `<span class="hot">${esc(p.hotkey)}</span>` : ''}</button>`
  if (node.type === 'Text') {
    const cls = ['t', p.bold ? 'b' : '', p.dimColor ? 'dim' : '', p.italic ? 'i' : '', p.underline ? 'u' : '', String(p.wrap ?? '').startsWith('truncate') ? 'cut' : ''].filter(Boolean).join(' ')
    const color = typeof p.color === 'string' ? ` style="color:${esc(p.color)}"` : ''
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
:root{--bg:${dark ? '#262624' : '#faf9f5'};--fg:${dark ? '#e8e6dc' : '#1f1e1d'};--dim:${dark ? '#9a978c' : '#73726c'};--line:${dark ? '#3d3d3a' : '#dad9d4'};--btn:${dark ? '#30302e' : '#f0eee6'}}
body{margin:0;background:var(--bg);color:var(--fg);font:13px/19px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:${dark ? 'dark' : 'light'}}
#pane{width:${width}px;padding:16px;box-sizing:content-box}
.t{white-space:pre-wrap}.b{font-weight:600}.dim{color:var(--dim)}.i{font-style:italic}.u{text-decoration:underline}
.cut{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;min-width:0}
.btn{font:inherit;color:inherit;background:var(--btn);border:1px solid var(--line);border-radius:6px;padding:0 8px;cursor:pointer;white-space:nowrap}
.btn.plain{background:none;border:none;padding:0 4px}.btn.dim{color:var(--dim)}
.hot{color:var(--dim);margin-left:6px;font-size:12px}
.svg{display:inline-flex;flex-shrink:0}.svg svg{display:block}
</style></head><body><div id="pane">${draw(tree)}</div></body></html>`
writeFileSync(outFile, html)
console.log(`wrote ${outFile}`)
