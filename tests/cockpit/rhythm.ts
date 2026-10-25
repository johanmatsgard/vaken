// THE BODY RHYTHM, read from a drawn tree.
import { BLOCK_RULE_PT, BODY_GAP, BODY_ROW_GAP, BUTTON_PAD, columnPt, PRESS_FRAME_H, ROW_PT, RULE_BOX_H, VSTEP_PT } from '../hooks/ui/tokens'

export type RNode = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
const kids = (n: RNode): RNode[] => (n.children ?? []).filter((c): c is RNode => c !== null && typeof c === 'object')
const words = (n: RNode): string => (n.children ?? []).filter((c): c is string | number => typeof c === 'string' || typeof c === 'number').join('')
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
const keyOf = (n: RNode): string => String(n.key ?? n.props?.key ?? '')
const EPS = 0.3 // points: cells and half rows are rounded to two decimals
const flowOf = (n: RNode): RNode[] => kids(n).filter(c => c.props?.position !== 'absolute' && c.props?.display !== 'none' && c.type !== 'Client')
const isColumn = (n: RNode): boolean => n.type === 'Box' && n.props?.flexDirection === 'column'
const visible = (s: string): boolean => s.replace(/[\s ]/g, '') !== ''

export const looked = { cards: 0, bodies: 0, pickLines: 0, pairs: 0, rules: 0, edges: 0 }

const ruleOf = (n: RNode): RNode | undefined => {
  const k = kids(n)
  return n.type === 'Box' && k.length === 1 && k[0]?.type === 'Svg' && num(k[0].props?.height) === RULE_BOX_H ? k[0] : undefined
}
function inkLeaf(n: RNode): boolean {
  if (n.type === 'Text') return visible(words(n)) || kids(n).some(inkLeaf)
  if (n.type === 'Button') return visible(String(n.props?.label ?? ''))
  if (n.type === 'Svg') return String(n.props?.alt ?? '') !== ''
  return n.type === 'Input'
}
const framed = (n: RNode): boolean => n.type === 'Box' && (keyOf(n).startsWith('fcw-') || (Math.abs(heightPt(n) - padBottom(n) - PRESS_FRAME_H) < EPS && hoverFill(n)))
const hoverFill = (n: RNode): boolean => ((n.props?.hover ?? (n as { hover?: unknown }).hover) as { backgroundColor?: unknown } | undefined)?.backgroundColor !== undefined
// Words that may wrap: a Text that is not cut at its end (the host wraps a Text by default).
const wraps = (n: RNode): boolean => (n.type === 'Text' && !String(n.props?.wrap ?? 'wrap').startsWith('truncate')) || flowOf(n).some(wraps)
const textLines = (n: RNode): number => Math.max(1, (words(n).match(/\n/g) ?? []).length + 1)

// The declared height of a node, in points.
export function heightPt(n: RNode): number {
  if (n.type === 'Text') return textLines(n) * ROW_PT
  if (n.type === 'Button' || n.type === 'Input') return ROW_PT
  if (n.type === 'Svg') return num(n.props?.height)
  if (n.type !== 'Box') return 0
  const flow = flowOf(n)
  const outer = flow.map(c => heightPt(c) + (num(c.props?.marginTop) + num(c.props?.marginBottom)) * VSTEP_PT)
  const content = isColumn(n) ? outer.reduce((a, b) => a + b, 0) + Math.max(0, flow.length - 1) * num(n.props?.rowGap) * VSTEP_PT : Math.max(0, ...outer)
  const pad = (num(n.props?.paddingTop) + num(n.props?.paddingBottom) + 2 * num(n.props?.paddingY)) * VSTEP_PT
  return Math.max(num(n.props?.height) * ROW_PT, num(n.props?.minHeight) * ROW_PT, content + pad)
}
const padTop = (n: RNode): number => (num(n.props?.paddingTop) + num(n.props?.paddingY)) * VSTEP_PT
const padBottom = (n: RNode): number => (num(n.props?.paddingBottom) + num(n.props?.paddingY)) * VSTEP_PT

function placed(n: RNode): { c: RNode; y: number; h: number }[] {
  const flow = flowOf(n)
  const h = heightPt(n)
  if (isColumn(n)) {
    const content = heightPt({ ...n, props: { ...n.props, height: 0, minHeight: 0, paddingTop: 0, paddingBottom: 0, paddingY: 0 } })
    const free = h - padTop(n) - padBottom(n) - content
    const j = n.props?.justifyContent
    // A column taller than its content because a line in it wraps (a row's note fitted to two lines): the wrapped words fill the room.
    const grows = free > EPS && wraps(n)
    let y = padTop(n) + (grows ? 0 : j === 'center' ? free / 2 : j === 'flex-end' ? free : 0)
    const gap = num(n.props?.rowGap) * VSTEP_PT
    return flow.map((c, i) => {
      y += num(c.props?.marginTop) * VSTEP_PT
      const at = { c, y, h: heightPt(c) + (grows && i === flow.length - 1 ? free : 0) }
      y += at.h + num(c.props?.marginBottom) * VSTEP_PT + gap
      return at
    })
  }
  const room = h - padTop(n) - padBottom(n)
  const a = n.props?.alignItems
  return flow.map(c => {
    const ch = room > heightPt(c) + EPS && wraps(c) ? room : heightPt(c)
    const free = room - ch - (num(c.props?.marginTop) + num(c.props?.marginBottom)) * VSTEP_PT
    return { c, y: padTop(n) + num(c.props?.marginTop) * VSTEP_PT + (a === 'center' ? free / 2 : a === 'flex-end' ? free : 0), h: ch }
  })
}

export function ink(n: RNode): { top: number; bottom: number } | undefined {
  if (framed(n)) return { top: padTop(n), bottom: heightPt(n) - padBottom(n) }
  if (n.type === 'Svg' && inkLeaf(n) && heightPt(n) < ROW_PT) return { top: (heightPt(n) - ROW_PT) / 2, bottom: (heightPt(n) + ROW_PT) / 2 }
  if (n.type !== 'Box') return inkLeaf(n) ? { top: 0, bottom: heightPt(n) } : undefined
  if (ruleOf(n) !== undefined) return undefined
  let top: number | undefined
  let bottom: number | undefined
  for (const p of placed(n)) {
    const i = ink(p.c)
    if (i === undefined) continue
    top = Math.min(top ?? Infinity, p.y + i.top)
    bottom = Math.max(bottom ?? -Infinity, p.y + (p.h > heightPt(p.c) + EPS ? p.h : i.bottom))
  }
  return top === undefined || bottom === undefined ? undefined : { top, bottom }
}

function attachment(n: RNode): boolean {
  let bright = false
  let bar = false
  const go = (x: RNode): void => {
    if (x.type === 'Client' || x.props?.position === 'absolute' || x.props?.display === 'none') return
    if (framed(x)) {
      bright = true
      return
    }
    if (x.type === 'Text' && visible(words(x)) && x.props?.dimColor !== true) bright = true
    if (x.type === 'Button' && visible(String(x.props?.label ?? ''))) bright = true
    if (x.type === 'Svg' && String(x.props?.alt ?? '') !== '' && num(x.props?.width) > 3 * columnPt()) bar = true
    kids(x).forEach(go)
  }
  go(n)
  return !bright || bar
}

const SHOW = (n: RNode): string => {
  const said: string[] = []
  const go = (x: RNode): void => {
    if (said.join(' ').length > 40) return
    if (x.type === 'Text' && visible(words(x))) said.push(words(x))
    else if (x.type === 'Button' && visible(String(x.props?.label ?? ''))) said.push(String(x.props?.label))
    else if (x.type === 'Svg' && String(x.props?.alt ?? '') !== '') said.push(`[${String(x.props?.alt)}]`)
    kids(x).forEach(go)
  }
  go(n)
  const s = said.join(' ').replace(/ /g, ' ').trim()
  return `"${s.length > 40 ? `${s.slice(0, 40)}…` : s}"${keyOf(n) === '' ? '' : ` (${keyOf(n)})`}`
}
const near = (a: number, b: number): boolean => Math.abs(a - b) < EPS

function columnGaps(col: RNode, at: string, out: string[]): void {
  let prev: { n: RNode; bottom: number } | undefined
  let rule: { drawn: boolean } | undefined
  for (const p of placed(col)) {
    const r = ruleOf(p.c)
    if (r !== undefined) {
      looked.rules += 1
      rule = { drawn: String(r.props?.alt ?? '') !== '' }
      continue
    }
    const i = ink(p.c)
    if (i === undefined) continue
    if (prev !== undefined) {
      looked.pairs += 1
      const gap = p.y + i.top - prev.bottom
      const drawnRule = rule?.drawn === true
      const radios = keyOf(prev.n).startsWith('radio-') && keyOf(p.c).startsWith('radio-') && framed(p.c)
      const ok = drawnRule ? near(gap, BLOCK_RULE_PT) : near(gap, BODY_ROW_GAP) || (near(gap, 0) && (attachment(p.c) || radios))
      if (!ok) out.push(`${at}: ${SHOW(prev.n)} to ${SHOW(p.c)} is ${gap} pt${drawnRule ? ' across a hairline' : rule !== undefined ? ' (a hairline that is not drawn)' : ''}, the rhythm wants ${drawnRule ? BLOCK_RULE_PT : `${BODY_ROW_GAP}${attachment(p.c) ? ' or 0' : ''}`}`)
    }
    prev = { n: p.c, bottom: p.y + i.bottom }
    rule = undefined
  }
}

// The x of the first ink of a node, from its left edge, in points.
function firstInkX(n: RNode): number | undefined | 'aligned' {
  if (framed(n)) return 0
  if (n.type === 'Button') return inkLeaf(n) ? BUTTON_PAD : undefined
  if (n.type !== 'Box') return inkLeaf(n) ? 0 : undefined
  const pad = (num(n.props?.paddingLeft) + num(n.props?.paddingX) + num(n.props?.marginLeft)) * columnPt()
  const flow = flowOf(n)
  if (isColumn(n)) {
    for (const c of flow) {
      const x = firstInkX(c)
      if (x === 'aligned') return x
      if (x !== undefined) return pad + x
    }
    return undefined
  }
  const j = n.props?.justifyContent
  let x = pad
  for (const c of flow) {
    const cx = firstInkX(c)
    if (cx !== undefined) return j === 'center' || j === 'flex-end' ? 'aligned' : cx === 'aligned' ? cx : x + cx
    x += num(c.props?.width ?? c.props?.minWidth) * (c.type === 'Svg' ? 1 : columnPt()) + num(n.props?.columnGap) * columnPt()
  }
  return undefined
}

function columnEdges(col: RNode, at: string, out: string[]): void {
  for (const c of flowOf(col)) {
    if (ruleOf(c) !== undefined || ink(c) === undefined || attachment(c)) continue
    const x = firstInkX(c)
    if (x === undefined || x === 'aligned') continue
    looked.edges += 1
    if (!near(x, 0)) out.push(`${at}: ${SHOW(c)} starts ${Math.round(x * 10) / 10} pt right of the card's text edge`)
  }
}

function bodyColumns(n: RNode, at: string, out: string[]): void {
  if (n.type !== 'Box') return
  if (isColumn(n)) {
    columnGaps(n, at, out)
    columnEdges(n, at, out)
  }
  for (const c of flowOf(n)) {
    if (attachment(c) && ink(c) !== undefined && !isColumn(n)) continue
    bodyColumns(c, at, out)
  }
}

const HEADER_TOUCH = /-(head|lead|side-line|controls-line)$/

export function rhythmProblems(root: RNode, at: string): string[] {
  const out: string[] = []
  const go = (n: RNode): void => {
    if (n.type === 'Box' && n.props?.borderStyle === 'round') {
      looked.cards += 1
      const card = keyOf(n)
      const where = `${at}, card ${card}`
      let prev: { n: RNode; bottom: number } | undefined
      for (const p of placed(n)) {
        const i = ink(p.c)
        const k = keyOf(p.c)
        if (i === undefined) continue
        const control = prev !== undefined && (k === `${card}-pick-line` || (k !== `${card}-body` && i.bottom - i.top >= PRESS_FRAME_H - EPS))
        if (prev !== undefined) {
          const gap = p.y + i.top - prev.bottom
          if (k === `${card}-body` || control) {
            if (k.endsWith('-body')) looked.bodies += 1
            else looked.pickLines += 1
            if (!near(gap, BODY_GAP)) out.push(`${where}: the ${k.endsWith('-body') ? 'body' : `control line ${SHOW(p.c)}`} starts ${gap} pt under ${SHOW(prev.n)}, the rhythm wants ${BODY_GAP}`)
          } else if (!near(gap, 0) && !HEADER_TOUCH.test(k)) out.push(`${where}: the header line ${SHOW(p.c)} is ${gap} pt under ${SHOW(prev.n)}`)
        }
        if (k === `${card}-body`) bodyColumns(p.c, where, out)
        if (control) {
          const x = firstInkX(p.c)
          if (typeof x === 'number' && !near(x, 0)) out.push(`${where}: the Pick line starts ${x} pt right of the card's text edge`)
        }
        prev = { n: p.c, bottom: p.y + i.bottom }
      }
    }
    kids(n).forEach(go)
  }
  go(root)
  return out
}

// The footer under the cards (Arrange cards, Open in new window, Help, Settings, and the cards that wait).
export function footerProblems(root: RNode, at: string): string[] {
  const out: string[] = []
  const find = (n: RNode): RNode | undefined => (keyOf(n) === 'footer' ? n : kids(n).map(find).find(x => x !== undefined))
  const footer = find(root)
  if (footer === undefined) return [`${at}: no footer drawn`]
  const go = (n: RNode): void => {
    if (isColumn(n)) columnGaps(n, `${at}, the footer`, out)
    flowOf(n).forEach(go)
  }
  go(footer)
  return out
}
