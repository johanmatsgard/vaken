// First look, as text (used by tests/firstlook.test.ts).
import { SECTION_H } from '../hooks/ui/tokens'
import { chevronSvg } from '../hooks/ui/kit'

const ROW_CHEVRON = chevronSvg('right').source

export type LNode = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }

const isNode = (c: unknown): c is LNode => c !== null && typeof c === 'object'
const kidsOf = (n: LNode): LNode[] => (n.children ?? []).filter(isNode)
const keyOf = (n: LNode): string => String(n.key ?? n.props?.key ?? '')
const clean = (s: string): string => s.replace(/[ \s]+/g, ' ').trim()
const descend = (n: LNode, out: LNode[] = []): LNode[] => {
  out.push(n)
  for (const c of kidsOf(n)) descend(c, out)
  return out
}
// All the words of a Text, in order (a Text may hold strings and other Text).
const wordsOf = (n: LNode | string): string => (typeof n === 'string' ? n : (n.children ?? []).map(c => (isNode(c) || typeof c === 'string' ? wordsOf(c) : '')).join(''))

const HEAD = '\u0001'
const isAbsolute = (n: LNode): boolean => n.props?.position === 'absolute'
const isPlainDim = (b: LNode): boolean => b.props?.plain === true && b.props?.dimColor === true
const SWITCH_STATE = /:\s*(On|Off)$/

type Ctx = { used: Set<LNode> }

function pickGroup(n: LNode): LNode[] | undefined {
  const buttons = descend(n).filter(x => x.type === 'Button' && clean(String(x.props?.label ?? '')) !== '')
  if (buttons.length < 2 || buttons.length > 6) return undefined
  // Every button must sit in its own press wrapper straight under this box (fcw-...).
  const wrappers = keyOf(n).startsWith('pk-') ? kidsOf(n).flatMap(kidsOf) : kidsOf(n)
  if (wrappers.length !== buttons.length) return undefined
  if (!wrappers.every(w => keyOf(w).startsWith('fcw-') && descend(w).filter(x => x.type === 'Button' && clean(String(x.props?.label ?? '')) !== '').length === 1)) return undefined
  const lit = buttons.filter(b => !isPlainDim(b))
  return lit.length === 1 ? buttons : undefined
}

function isCard(n: LNode): boolean {
  return n.type === 'Box' && typeof n.props?.backgroundColor === 'string' && keyOf(n) !== '' && !keyOf(n).startsWith('fcw-')
}
function titleOf(n: LNode): LNode | undefined {
  return descend(n).find(x => x.type === 'Text' && x.props?.bold === true && clean(wordsOf(x)) !== '')
}

function render(n: LNode | string, ctx: Ctx): string[] {
  if (typeof n === 'string') return clean(n) === '' ? [] : [clean(n)]
  if (ctx.used.has(n) || isAbsolute(n)) return []
  switch (n.type) {
    case 'Client':
      return []
    case 'Text': {
      const t = clean(wordsOf(n))
      return t === '' ? [] : [t]
    }
    case 'Button': {
      const label = clean(String(n.props?.label ?? ''))
      return label === '' ? [] : [`[${label}]`]
    }
    case 'Svg': {
      const alt = clean(String(n.props?.alt ?? ''))
      if (alt === '') return n.props?.source === ROW_CHEVRON ? ['>'] : []
      if (alt === 'Open' || alt.startsWith('Open ')) return ['>']
      // A small label (16 pt high) is a heading for what follows it in the same column.
      if (Number(n.props?.height) === SECTION_H) return [`${HEAD}-- ${alt} --`]
      return [`(${alt})`]
    }
    case 'Box':
      return box(n, ctx)
    default:
      return kidsOf(n).flatMap(c => render(c, ctx))
  }
}

function box(n: LNode, ctx: Ctx): string[] {
  const key = keyOf(n)
  if (key.startsWith('row-') && descend(n).some(x => keyOf(x).startsWith('swhit-'))) {
    const sw = descend(n).find(x => x.type === 'Svg' && SWITCH_STATE.test(String(x.props?.alt ?? '')))
    const on = sw !== undefined && /On$/.test(String(sw.props?.alt))
    const swBox = descend(n).find(x => keyOf(x).startsWith('swhit-'))
    if (swBox !== undefined) ctx.used.add(swBox)
    const inner = kidsOf(n).flatMap(c => render(c, ctx))
    if (inner.length === 0) return []
    return [`${on ? '[x]' : '[ ]'} ${inner[0]}`, ...inner.slice(1).map(l => `    ${l}`)]
  }
  if (key.startsWith('radio-') && n.props?.flexDirection === 'row') {
    const button = descend(n).find(x => x.type === 'Button')
    if (button !== undefined) {
      const mark = descend(n).find(x => x.type === 'Svg')
      const label = clean(String(button.props?.label ?? ''))
      const chosen = mark !== undefined ? clean(String(mark.props?.alt ?? '')) !== label : label.startsWith('(•)')
      const tag = descend(n).filter(x => x.type === 'Text').map(x => clean(wordsOf(x))).filter(w => w !== '').join(' ')
      return [`${chosen ? '(o)' : '( )'} ${label.replace(/^\((•| )\) /, '')}${tag === '' ? '' : `  ${tag}`}`]
    }
  }
  const pick = pickGroup(n)
  if (pick !== undefined) {
    for (const b of pick) ctx.used.add(b)
    return pick.map(b => `${isPlainDim(b) ? '( )' : '(o)'} ${clean(String(b.props?.label))}`)
  }
  if (isCard(n)) {
    const title = titleOf(n)
    if (title !== undefined) ctx.used.add(title)
    let extra = ''
    const first = kidsOf(n)[0]
    if (title !== undefined && first !== undefined && descend(first).includes(title) && !descend(first).some(x => x.type === 'Svg' || x.type === 'Button')) {
      extra = descend(first).filter(x => x.type === 'Text' && x !== title).map(x => clean(wordsOf(x))).filter(t => t !== '').join(' ')
      for (const x of descend(first)) ctx.used.add(x)
    }
    const body = kidsOf(n).flatMap(c => render(c, ctx))
    return [`== ${title === undefined ? key : clean(wordsOf(title))}${extra === '' ? '' : ` (${extra})`} ==`, ...body]
  }
  const parts = kidsOf(n).map(c => render(c, ctx))
  const row = n.props?.flexDirection === 'row'
  if (row && parts.every(p => p.length <= 1)) {
    const flat = parts.flat()
    const line = flat.map(l => l.split(HEAD).join('')).join('  ')
    return line === '' ? [] : [flat.length === 1 && flat[0].startsWith(HEAD) ? `${HEAD}${line}` : line]
  }
  if (row) return parts.flat().map(l => l.split(HEAD).join(''))
  const out: string[] = []
  let under = false
  for (const p of parts) {
    for (const l of p) {
      if (l.startsWith(HEAD)) {
        out.push(l)
        under = true
      } else out.push(under ? `  ${l}` : l)
    }
  }
  // Only a column that is nothing but a heading passes the mark up (so its neighbours indent under it).
  return out.every(l => l.startsWith(HEAD)) ? out : out.map(l => l.split(HEAD).join(''))
}

export function lookText(root: LNode): string {
  const lines = render(root, { used: new Set() })
  return lines.filter(l => l.trim() !== '').map(l => l.split(HEAD).join('')).join('\n') + '\n'
}
