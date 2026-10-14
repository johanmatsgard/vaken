// The press-size rules, read from a drawn tree.
import { BORDER_Y_PT, BUTTON_PAD, CARD_PAD_Y_PT, COL_PT, EDGE_WORD_OUT_PT, HIT_ICON_W, HIT_MIN_H, ROW_PT, SWITCH_HIT_W, VSTEP_PT, WORD_FOOT_W, vstep } from '../hooks/ui/tokens'
import { isPressRow } from '../hooks/ui/reach'

export type PNode = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
type Kind = 'word' | 'slot' | 'switch' | 'row'
type Region = { wrapper: PNode; kind: Kind; client: PNode }

const kids = (n: PNode): PNode[] => (n.children ?? []).filter((c): c is PNode => c !== null && typeof c === 'object')
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
const nameOf = (x: PNode): string => String(x.key ?? x.props?.key ?? '')
const EPS = 0.6 // points: the cells and half rows are rounded to two decimals

export const looked = { gridBoxes: 0, regions: 0, words: 0, slots: 0, switches: 0, rows: 0, pairs: 0, touching: 0, closedCards: 0, cardEdges: 0, scopes: 0, sized: 0, cardStyles: 0 }

// The height a Box declares, in points: its least height, or its content.
function declaredPt(n: PNode): number {
  if (n.type === 'Text' || n.type === 'Button') return ROW_PT
  if (n.type === 'Svg') return num(n.props?.height)
  if (n.type !== 'Box') return 0
  const flow = kids(n).filter(c => c.props?.position !== 'absolute' && c.props?.display !== 'none')
  const outer = flow.map(c => declaredPt(c) + num(c.props?.marginTop) * VSTEP_PT + num(c.props?.marginBottom) * VSTEP_PT)
  const content = n.props?.flexDirection === 'column' ? outer.reduce((a, b) => a + b, 0) + Math.max(0, flow.length - 1) * num(n.props?.rowGap) * VSTEP_PT : Math.max(0, ...outer)
  const border = n.props?.borderStyle === undefined ? 0 : 2 * BORDER_Y_PT
  return Math.max(Math.max(num(n.props?.height), num(n.props?.minHeight)) * ROW_PT, content + (num(n.props?.paddingTop) + num(n.props?.paddingBottom)) * VSTEP_PT + border)
}
// The whole rows a part's Client must declare: its box from the anchor's top (under a card's top border) to the bottom edge.
export function wantRows(wrapper: PNode): number {
  const fromTop = declaredPt(wrapper) - (wrapper.props?.borderStyle === undefined ? 0 : BORDER_Y_PT)
  return Math.max(1, Math.ceil(fromTop / ROW_PT - 0.02))
}
// (e) Every press Client names its height in whole rows, the same as its anchor's, equal to its part's box rounded out.
export function sizeProblems(root: PNode, at: string, problems: string[]): void {
  const up = parents(root)
  for (const c of all(root).filter(x => x.type === 'Client' && nameOf(x).startsWith('fc-'))) {
    const anchor = up.get(c)
    const wrapper = anchor === undefined ? undefined : up.get(anchor)
    if (anchor === undefined || wrapper === undefined) continue
    looked.sized += 1
    const h = c.props?.height
    const want = wantRows(wrapper)
    if (typeof h !== 'number' || !Number.isInteger(h)) problems.push(`${at}: the press ${nameOf(c)} names no whole-row height (${String(h)})`)
    else if (h !== want) problems.push(`${at}: the press ${nameOf(c)} is ${h} rows, its part's box rounded out is ${want}`)
    if (anchor.props?.height !== h) problems.push(`${at}: the anchor of ${nameOf(c)} is ${String(anchor.props?.height)} rows, its Client ${String(h)}`)
    if (anchor.props?.bottom !== undefined) problems.push(`${at}: the anchor of ${nameOf(c)} names a bottom as well as a height`)
    // The app sizes the region by what the module draws, so the module is told the same rows (`r`) and draws them.
    const r = (c.props?.props as { r?: unknown } | undefined)?.r
    if (typeof h === 'number' && r !== h) problems.push(`${at}: the module of ${nameOf(c)} draws ${String(r)} rows, its Client names ${h}`)
  }
}

function parents(root: PNode): Map<PNode, PNode> {
  const up = new Map<PNode, PNode>()
  const go = (n: PNode): void => {
    for (const c of kids(n)) {
      up.set(c, n)
      go(c)
    }
  }
  go(root)
  return up
}
function all(n: PNode, out: PNode[] = []): PNode[] {
  out.push(n)
  for (const c of kids(n)) all(c, out)
  return out
}

const widthPt = (n: PNode): number => Math.max(num(n.props?.width), num(n.props?.minWidth)) * COL_PT
const heightPt = (n: PNode): number => Math.max(num(n.props?.height), num(n.props?.minHeight)) * ROW_PT
const marginPt = (n: PNode, side: 'Left' | 'Right' | 'Top' | 'Bottom'): number => num(n.props?.[`margin${side}`]) * (side === 'Left' || side === 'Right' ? COL_PT : VSTEP_PT)

function naturalPt(w: PNode): number {
  const inside = all(w).slice(1)
  const svg = inside.find(x => x.type === 'Svg')
  if (svg !== undefined) return num(svg.props?.width)
  const b = inside.find(x => x.type === 'Button')
  return b === undefined ? 0 : String(b.props?.label ?? '').length * COL_PT + 2 * BUTTON_PAD
}

function regionsOf(root: PNode, up: Map<PNode, PNode>): Region[] {
  const out: Region[] = []
  for (const c of all(root).filter(x => x.type === 'Client' && nameOf(x).startsWith('fc-'))) {
    const anchor = up.get(c)
    const wrapper = anchor === undefined ? undefined : up.get(anchor)
    if (wrapper === undefined) continue
    const k = nameOf(c)
    const wk = nameOf(wrapper)
    const h = (c.props?.props as { h?: number } | undefined)?.h
    const kind: Kind = k.startsWith('fc-swk-') ? 'switch' : wk.startsWith('slot-') ? 'slot' : wk.startsWith('fcw-') || h !== undefined || wk.endsWith('-part') ? 'word' : 'row'
    out.push({ wrapper, kind, client: c })
  }
  return out
}

// The room between a wrapper and the press next to it, in points, along an axis.
function gapOf(w: PNode, up: Map<PNode, PNode>, isPress: (n: PNode) => boolean, axis: 'x' | 'y'): number {
  const parent = up.get(w)
  if (parent === undefined) return Infinity
  const row = parent.props?.flexDirection === 'row' || parent.props?.flexDirection === undefined
  if ((axis === 'x') !== row) return Infinity
  const flow = kids(parent).filter(c => c.props?.position !== 'absolute')
  const i = flow.indexOf(w)
  const near = [flow[i - 1], flow[i + 1]].filter((c): c is PNode => c !== undefined && isPress(c))
  if (near.length === 0) return Infinity
  const gap = (axis === 'x' ? num(parent.props?.columnGap) * COL_PT : num(parent.props?.rowGap) * VSTEP_PT) || 0
  return gap
}

export function pressProblems(root: PNode, at: string, problems: string[]): void {
  const up = parents(root)
  const regions = regionsOf(root, up)
  const wrappers = new Set(regions.filter(r => r.kind !== 'row').map(r => r.wrapper))
  const isPress = (n: PNode): boolean => wrappers.has(n)
  looked.regions += regions.length
  for (const r of regions) {
    const w = r.wrapper
    const name = nameOf(r.client)
    if (r.kind === 'word') {
      looked.words += 1
      const high = heightPt(w)
      const wide = widthPt(w)
      if (high + EPS < HIT_MIN_H) problems.push(`${at}: the press ${name} is ${Math.round(high * 10) / 10} pt high, the floor for a word is ${HIT_MIN_H}`)
      if (Math.max(wide, naturalPt(w)) + EPS < WORD_FOOT_W) problems.push(`${at}: the press ${name} is ${Math.round(wide * 10) / 10} pt wide, the floor for a word is ${WORD_FOOT_W}`)
      for (const side of ['Top', 'Bottom', 'Left'] as const) if (marginPt(w, side) < -EPS) problems.push(`${at}: the press ${name} reaches ${Math.round(-marginPt(w, side) * 10) / 10} pt past its room (margin${side})`)
      if (marginPt(w, 'Right') < -EDGE_WORD_OUT_PT - EPS) problems.push(`${at}: the press ${name} reaches ${Math.round(-marginPt(w, 'Right') * 10) / 10} pt past its room on the right`)
    } else if (r.kind === 'slot') {
      looked.slots += 1
      const high = heightPt(w)
      const wide = widthPt(w)
      const slot = naturalPt(w)
      const floor = Math.max(slot, Math.min(HIT_ICON_W, slot + gapOf(w, up, isPress, 'x')))
      if (high + EPS < HIT_MIN_H) problems.push(`${at}: the press ${name} is ${Math.round(high * 10) / 10} pt high, the floor is ${HIT_MIN_H}`)
      if (wide + EPS < floor) problems.push(`${at}: the press ${name} is ${Math.round(wide * 10) / 10} pt wide, the floor for a picture here is ${Math.round(floor * 10) / 10}`)
      for (const side of ['Top', 'Bottom', 'Left', 'Right'] as const) if (marginPt(w, side) < -EPS) problems.push(`${at}: the press ${name} reaches ${Math.round(-marginPt(w, side) * 10) / 10} pt past its slot (margin${side})`)
    } else if (r.kind === 'switch') {
      looked.switches += 1
      if (widthPt(w) + EPS < SWITCH_HIT_W) problems.push(`${at}: the switch press ${name} is ${Math.round(widthPt(w) * 10) / 10} pt wide, the floor is ${SWITCH_HIT_W}`)
      if (heightPt(w) + EPS < HIT_MIN_H) problems.push(`${at}: the switch press ${name} is ${Math.round(heightPt(w) * 10) / 10} pt high, the floor is ${HIT_MIN_H}`)
    } else {
      looked.rows += 1
      const high = heightPt(w)
      if (high > 0 && high + EPS < HIT_MIN_H) problems.push(`${at}: the row press ${name} is ${Math.round(high * 10) / 10} pt high, the floor is ${HIT_MIN_H}`)
    }
  }
  for (const parent of all(root)) {
    const flow = kids(parent).filter(c => c.props?.position !== 'absolute' && c.props?.display !== 'none')
    const row = parent.props?.flexDirection === 'row' || parent.props?.flexDirection === undefined
    for (let i = 0; i + 1 < flow.length; i += 1) {
      const a = flow[i]
      const b = flow[i + 1]
      if (a === undefined || b === undefined || !isPress(a) || !isPress(b)) continue
      looked.pairs += 1
      const gap = row ? num(parent.props?.columnGap) * COL_PT : num(parent.props?.rowGap) * VSTEP_PT
      const between = gap + (row ? marginPt(a, 'Right') + marginPt(b, 'Left') : marginPt(a, 'Bottom') + marginPt(b, 'Top'))
      if (between < -EPS) problems.push(`${at}: the presses ${nameOf(a)} and ${nameOf(b)} overlap by ${Math.round(-between * 10) / 10} pt${row ? '' : ' (stacked)'}`)
    }
  }
  reachProblems(root, at, problems)
  sizeProblems(root, at, problems)
  gridProblems(root, at, problems)
  cardStyleProblems(root, at, problems)
}

// THE ONE CARD STYLE: a round border is drawn only by the kit's Card, with its padding.
export function cardStyleProblems(root: PNode, at: string, problems: string[]): void {
  for (const n of all(root).filter(x => x.type === 'Box' && x.props?.borderStyle !== undefined)) {
    looked.cardStyles += 1
    const p = n.props ?? {}
    const top = num(p.paddingTop)
    const bottom = num(p.paddingBottom)
    const sides = ['padding', 'paddingX', 'paddingY', 'paddingLeft', 'paddingRight'].filter(k => p[k] !== undefined && p[k] !== 0)
    if (p.borderStyle !== 'round' || Math.abs(top - vstep(CARD_PAD_Y_PT)) > 0.001 || Math.abs(bottom - vstep(CARD_PAD_Y_PT)) > 0.001 || sides.length > 0)
      problems.push(`${at}: ${nameOf(n) || 'a bordered box'} is a card built outside the shared card style (ROUNDED in ui/kit.tsx): border ${String(p.borderStyle)}, padding ${top}/${bottom}${sides.length > 0 ? `, ${sides.join(', ')}` : ''}`)
  }
}

// The one exception is a card's own top and bottom padding (CARD_PAD_Y_PT, 9 pt), which completes its 0.5 pt border to half a row.
const onStep = (pt: number): boolean => Math.abs(pt / VSTEP_PT - Math.round(pt / VSTEP_PT)) < 0.02
export function gridProblems(root: PNode, at: string, problems: string[]): void {
  for (const n of all(root).filter(x => x.type === 'Box')) {
    looked.gridBoxes += 1
    const card = n.props?.borderStyle === 'round'
    for (const prop of ['rowGap', 'marginTop', 'marginBottom', 'paddingTop', 'paddingBottom'] as const) {
      const v = n.props?.[prop]
      if (typeof v !== 'number' || v === 0) continue
      if (card && (prop === 'paddingTop' || prop === 'paddingBottom') && Math.abs(v - vstep(CARD_PAD_Y_PT)) < 0.001) continue
      if (!onStep(v * VSTEP_PT)) problems.push(`${at}: ${nameOf(n) || 'a box'} has ${prop} ${Math.round(v * VSTEP_PT * 100) / 100} pt, off the half-row grid`)
    }
    for (const prop of ['height', 'minHeight'] as const) {
      const v = n.props?.[prop]
      if (typeof v !== 'number' || v === 0) continue
      if (!onStep(v * ROW_PT)) problems.push(`${at}: ${nameOf(n) || 'a box'} has ${prop} ${Math.round(v * ROW_PT * 100) / 100} pt, off the half-row grid`)
    }
  }
}

const isCard = (n: PNode): boolean => n.type === 'Box' && n.props?.borderStyle === 'round' && nameOf(n) !== ''
const inFlow = (n: PNode): boolean => n.props?.position !== 'absolute' && n.props?.display !== 'none'
const vpt = (n: PNode, prop: string): number => num(n.props?.[prop]) * VSTEP_PT
const isAnchorOf = (c: PNode): boolean => c.props?.position === 'absolute' && nameOf(c).startsWith('fc-') && nameOf(c).endsWith('-box')
function topAirOf(n: PNode | undefined): number {
  if (n === undefined || n.type !== 'Box' || isPressRow(n)) return 0
  const first = kids(n).filter(inFlow)[0]
  return vpt(n, 'paddingTop') + (n.props?.flexDirection === 'column' && first !== undefined ? Math.max(0, vpt(first, 'marginTop')) + topAirOf(first) : 0)
}
// (a) A closed card (only its Glance or header row shown) presses as a whole: its Client sits right in the card's own Box, inset 0.
export function reachProblems(root: PNode, at: string, problems: string[]): void {
  const nodes = all(root)
  for (const card of nodes.filter(isCard)) {
    const flow = kids(card).filter(inFlow)
    const anchored = kids(card).some(isAnchorOf)
    const hasPress = all(card).some(x => x.type === 'Client' && nameOf(x).startsWith('fc-'))
    if (flow.length === 1 && hasPress) {
      looked.closedCards += 1
      if (!anchored) problems.push(`${at}: the closed card ${nameOf(card)} does not press as a whole (its press is not the card's box)`)
    }
    if (!anchored) {
      let first: PNode | undefined = flow[0]
      let up = BORDER_Y_PT
      while (first !== undefined && !isPressRow(first) && first.props?.flexDirection === 'column') {
        up += vpt(first, 'paddingTop')
        const f = kids(first).filter(inFlow)[0]
        if (f !== undefined) up += Math.max(0, vpt(f, 'marginTop'))
        first = f
      }
      if (first !== undefined && isPressRow(first)) {
        looked.cardEdges += 1
        const reach = -vpt(first, 'marginTop')
        if (reach > EPS) problems.push(`${at}: the first row ${nameOf(first)} of ${nameOf(card)} reaches ${Math.round(reach * 10) / 10} pt over the card's top inset (${up} pt)`)
      }
      let last: PNode | undefined = flow[flow.length - 1]
      while (last !== undefined && !isPressRow(last) && last.props?.flexDirection === 'column') last = kids(last).filter(inFlow).slice(-1)[0]
      if (last !== undefined && isPressRow(last)) {
        looked.cardEdges += 1
        const reach = -vpt(last, 'marginBottom')
        if (reach > EPS) problems.push(`${at}: the last row ${nameOf(last)} of ${nameOf(card)} reaches ${Math.round(reach * 10) / 10} pt over the card's bottom inset`)
      }
    }
    if (anchored) continue
    for (const col of all(card).filter(x => x.type === 'Box' && x.props?.flexDirection === 'column' && !isPressRow(x))) {
      const flow2 = kids(col).filter(inFlow)
      for (let i = 0; i + 1 < flow2.length; i += 1) {
        const a = flow2[i] as PNode
        const b = flow2[i + 1] as PNode
        if (!isPressRow(a)) continue
        looked.touching += 1
        const dead = vpt(col, 'rowGap') + vpt(a, 'marginBottom') + Math.max(0, vpt(b, 'marginTop')) + topAirOf(b)
        if (dead > EPS) problems.push(`${at}: ${Math.round(dead * 10) / 10} pt under the row ${nameOf(a)} press nothing (before ${nameOf(b) || 'the next row'})`)
        if (dead < -EPS) problems.push(`${at}: the row ${nameOf(a)} reaches ${Math.round(-dead * 10) / 10} pt into ${nameOf(b) || 'the next row'}`)
      }
    }
  }
  const groupOf = (x: PNode): string | undefined => (x.props?.props as { scope?: string } | undefined)?.scope
  const clientGroups = new Set(nodes.filter(x => x.type === 'Client').map(groupOf).filter((g): g is string => g !== undefined))
  const painted = new Set(nodes.map(x => ((x as { hover?: unknown }).hover ?? x.props?.hover) as { scope?: string; backgroundColor?: string } | undefined).filter(h => h?.scope !== undefined && (h.backgroundColor !== undefined || (h as { display?: string }).display === 'flex')).map(h => h?.scope as string))
  for (const g of clientGroups) {
    looked.scopes += 1
    if (!painted.has(g)) problems.push(`${at}: the press group ${g} lights no Box`)
  }
  for (const g of painted) if (!clientGroups.has(g)) problems.push(`${at}: the Box lit in group ${g} has no press over it`)
}
