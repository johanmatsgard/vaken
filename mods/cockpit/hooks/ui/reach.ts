// THE REACH OF A PRESS: the click area grows downwards too
import { FIRST_CLICK_PREFIX } from './firstclick'
import { BORDER_Y_PT, ROW_PT, VSTEP_PT } from './tokens'

type N = { type?: unknown; key?: unknown; props?: Record<string, unknown>; children?: unknown }

const isN = (x: unknown): x is N => typeof x === 'object' && x !== null && !Array.isArray(x)
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
const two = (n: number): number => Math.round(n * 100) / 100
const keyOf = (n: N): string => String(n.key ?? n.props?.key ?? '')
const flatInto = (c: unknown, out: unknown[]): unknown[] => {
  if (Array.isArray(c)) for (const x of c) flatInto(x, out)
  else if (c !== null && c !== undefined && c !== false && c !== true) out.push(c)
  return out
}
const flat = (c: unknown): unknown[] => flatInto(c, [])
// What one card's pass has already worked out per node
type Pass = { kids: Map<N, unknown[]>; row: Map<N, boolean>; box: Map<N, number>; made: Set<N> }
let pass: Pass | undefined
// A Box's children, wherever the element keeps them
const kidsOf = (n: N): unknown[] => {
  const known = pass?.kids.get(n)
  if (known !== undefined) return known
  const kids = flat(n.children !== undefined ? n.children : n.props?.children)
  pass?.kids.set(n, kids)
  return kids
}
// The node as `withKids(n, kids)` would give it, or `n` itself when that is the same
const sameKids = (n: N, kids: unknown[]): boolean => {
  const raw = n.children !== undefined ? n.children : n.props?.children
  if (!Array.isArray(raw) || raw.length !== kids.length) return false
  for (let i = 0; i < kids.length; i += 1) if (raw[i] !== kids[i]) return false
  return true
}
const keepOrWith = (n: N, kids: unknown[]): N => (sameKids(n, kids) ? n : withKids(n, kids))
// The pass keeps the new node's children as given (every list given here is already flat)
const withKids = (n: N, kids: unknown[]): N => {
  const inTop = n.children !== undefined || n.props?.children === undefined
  if (pass?.made.has(n) === true) {
    if (inTop) n.children = kids
    else (n.props as Record<string, unknown>).children = kids
    pass.kids.set(n, kids)
    return n
  }
  const m = inTop ? { ...n, children: kids } : { ...n, props: { ...n.props, children: kids } }
  pass?.kids.set(m, kids)
  pass?.made.add(m)
  return m
}
const inFlow = (c: unknown): boolean => !isN(c) || (c.props?.position !== 'absolute' && c.props?.display !== 'none')
const isBox = (n: unknown): n is N => isN(n) && n.type === 'Box'  // en-only: an element type name, never shown
const isColumn = (n: N): boolean => n.props?.flexDirection === 'column'
const pt = (n: N, prop: string): number => num(n.props?.[prop]) * VSTEP_PT

// The first-click anchor of a whole row
const isRowAnchor = (c: unknown): boolean => {
  if (!isBox(c) || c.props?.position !== 'absolute') return false
  const k = keyOf(c)
  if (!k.startsWith(FIRST_CLICK_PREFIX) || !k.endsWith('-box')) return false
  return kidsOf(c).some(x => isN(x) && x.type === 'Client' && (x.props?.props as { h?: unknown } | undefined)?.h === undefined)  // en-only: an element type name, never shown
}
// A whole row that presses: a Box in the flow with a row anchor as a direct child, not a lone word's
export const isPressRow = (n: unknown): n is N => {
  if (!isBox(n) || !inFlow(n)) return false
  const known = pass?.row.get(n)
  if (known !== undefined) return known
  const k = keyOf(n)
  const yes = !(k.startsWith('fcw-') || k.startsWith('slot-') || k.startsWith('swhit-') || k.endsWith('-part')) && kidsOf(n).some(isRowAnchor)
  pass?.row.set(n, yes)
  return yes
}

// A row grown down by `down` points: as tall again plus `down`
function grow(n: N, down: number): N {
  const p = n.props ?? {}
  const h = p.minHeight !== undefined ? 'minHeight' : p.height !== undefined ? 'height' : undefined
  const m = { ...n, props: { ...p, ...(h === undefined ? {} : { [h]: two(num(p[h]) + down / ROW_PT) }), paddingBottom: two(num(p.paddingBottom) + down / VSTEP_PT), marginBottom: two(num(p.marginBottom) - down / VSTEP_PT) } }
  if (pass !== undefined) {
    pass.kids.set(m, kidsOf(n))
    pass.made.add(m)
  }
  return m
}
// The air from a Box's top to its first content (its top padding, its first child's top margin, and so on down a column)
function topAir(n: unknown): number {
  if (!isBox(n) || isPressRow(n)) return 0
  const first = kidsOf(n).find(inFlow)
  return pt(n, 'paddingTop') + (isColumn(n) && isBox(first) ? Math.max(0, pt(first, 'marginTop')) + topAir(first) : 0)
}

const MIN_PT = 0.05  // Less air than this is none (the cells are rounded to two decimals)

// The press at the bottom edge of `n` reaches `down` points past that edge (and over any air inside `n` under it)
export function reachDown(n: unknown, down: number): unknown {
  if (down < MIN_PT || !isBox(n)) return n
  if (isPressRow(n)) return grow(n, down)
  if (!isColumn(n)) return n
  const kids = kidsOf(n)
  let at = kids.length - 1
  while (at >= 0 && !inFlow(kids[at])) at -= 1
  const last = kids[at]
  if (!isBox(last)) return n
  const out = [...kids]
  out[at] = reachDown(last, down + pt(n, 'paddingBottom') + Math.max(0, pt(last, 'marginBottom')))
  return withKids(n, out)
}
// Every column inside `n`: each child's bottom press reaches over the air to the next child's first content
function spread(n: unknown): unknown {
  if (!isBox(n) || isPressRow(n)) return n
  let kids = kidsOf(n).map(spread)
  if (isColumn(n)) {
    const gap = pt(n, 'rowGap')
    const flow = kids.map((c, i) => (inFlow(c) ? i : -1)).filter(i => i >= 0)
    kids = [...kids]
    for (let j = 0; j + 1 < flow.length; j += 1) {
      const a = kids[flow[j] as number]
      const b = kids[flow[j + 1] as number]
      if (!isBox(a)) continue
      const air = gap + Math.max(0, pt(a, 'marginBottom')) + (isBox(b) ? Math.max(0, pt(b, 'marginTop')) + topAir(b) : 0)
      kids[flow[j] as number] = reachDown(a, air)
    }
  }
  return keepOrWith(n, kids)
}

// THE CLIENT'S OWN SIZE
const SNAP_EPS = 0.02  // Rows: a box a hair over a whole row (the two-decimal cells) is that row

// The height a Box declares, in points: its least height
export function boxPt(n: unknown): number {
  if (!isN(n)) return 0
  if (n.type === 'Text' || n.type === 'Button') return ROW_PT  // en-only: element type names, never shown
  if (n.type === 'Svg') return num(n.props?.height)  // en-only: an element type name, never shown
  if (!isBox(n)) return 0
  const known = pass?.box.get(n)
  if (known !== undefined) return known
  const h = boxOwnPt(n)
  pass?.box.set(n, h)
  return h
}
function boxOwnPt(n: N): number {
  // One walk over the children in the flow: their sum in a column (in order, as a reduce would add them)
  const column = isColumn(n)
  let count = 0
  let sum = 0
  let tallest = 0
  for (const c of kidsOf(n)) {
    if (!isN(c) || !inFlow(c)) continue
    const outer = boxPt(c) + pt(c, 'marginTop') + pt(c, 'marginBottom')
    count += 1
    sum += outer
    tallest = Math.max(tallest, outer)
  }
  const content = column ? sum + Math.max(0, count - 1) * pt(n, 'rowGap') : tallest
  const border = n.props?.borderStyle === undefined ? 0 : 2 * BORDER_Y_PT
  const least = Math.max(num(n.props?.height), num(n.props?.minHeight)) * ROW_PT
  return Math.max(least, content + pt(n, 'paddingTop') + pt(n, 'paddingBottom') + border)
}
// Points to whole rows, rounded out
export const cellsOut = (heightPt: number): number => Math.max(1, Math.ceil(heightPt / ROW_PT - SNAP_EPS))
// The rows a press Client of `wrapper` declares
export const clientRows = (wrapper: unknown): number => cellsOut(boxPt(wrapper) - (isN(wrapper) && wrapper.props?.borderStyle !== undefined ? BORDER_Y_PT : 0))

const isAnchor = (c: unknown): c is N => isBox(c) && c.props?.position === 'absolute' && keyOf(c).startsWith(FIRST_CLICK_PREFIX) && keyOf(c).endsWith('-box')
// Every press anchor in `n` (and below) gets its Client's height
export function sizeClients(n: unknown): unknown {
  if (!isBox(n)) return n
  const kids = kidsOf(n)
  let changed = false
  const out = kids.map(c => {
    if (isAnchor(c)) {
      const h = clientRows(n)
      changed = true
      const { bottom: _b, ...p } = c.props ?? {}
      const anchor = { ...c, props: { ...p, height: h } }
      pass?.made.add(anchor)
      return withKids(anchor, kidsOf(c).map(x => (isN(x) && x.type === 'Client' ? { ...x, props: { ...x.props, height: h, props: { ...(x.props?.props as object | undefined), r: h } } } : x)))  // en-only: an element type name, never shown
    }
    const d = sizeClients(c)
    if (d !== c) changed = true
    return d
  })
  return changed ? withKids(n, out) : n
}

// A card: every row reaches down over the air to the next row
export function reachCard<T>(card: T): T {
  if (!isBox(card)) return card
  pass = { kids: new Map(), row: new Map(), box: new Map(), made: new Set() }
  try {
    return sizeClients(spread(card)) as T
  } finally {
    pass = undefined
  }
}
