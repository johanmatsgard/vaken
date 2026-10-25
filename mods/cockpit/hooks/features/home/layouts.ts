// The card order each pane width keeps, and (below) the saved layouts.
import type { Io } from '../../core/io'
import { t } from '../../core/lang'
import { SETTINGS, findSetting, validValue, writeSetting } from '../../core/settings'
import type { Values } from '../../core/settings'
import { CARD_IDS, isCardId, parseOrder } from './logic'
import type { CardId } from './logic'

export type Bucket = 1 | 2 | 3 | 4 | 5 | 6
export const BUCKETS: Bucket[] = [1, 2, 3, 4, 5, 6]
export const isBucket = (v: unknown): v is Bucket => typeof v === 'number' && (BUCKETS as number[]).includes(v)
// A wider one (4 to 6) with no order of its own starts from the nearest smaller one's
const FIRST_BUCKETS: Bucket[] = [1, 2, 3]
const inherits = (b: Bucket): boolean => !FIRST_BUCKETS.includes(b)

const OLD_ORDER_KEYS = ['cockpit:pref:order', ...[1, 2, 3, 4, 5, 6].map(b => `cockpit:pref:order:${b}`)]
export const orderKey = (bucket: Bucket): string => `cockpit:pref:gorder:${bucket}`

export type Orders = Record<Bucket, CardId[]>
// Each column's own top-to-bottom list (Arrange with column placement), per width; a width with none cuts its one order by count
export type ColumnLists = Partial<Record<Bucket, CardId[][]>>
const COLUMN_BREAK = '|'

// A stored order holds its columns split by "|"; one with no break (kept before columns) gives none. A card in no list goes under the last column.
export function parseLists(v: unknown): CardId[][] | undefined {
  if (typeof v !== 'string' || !v.includes(COLUMN_BREAK)) return undefined
  const seen = new Set<CardId>()
  const lists = v.split(COLUMN_BREAK).map(part => {
    const ids = part.split(',').filter(isCardId).filter(id => !seen.has(id))
    for (const id of ids) seen.add(id)
    return [...new Set(ids)]
  })
  lists[lists.length - 1].push(...CARD_IDS.filter(id => !seen.has(id)))
  return lists
}
export const flatOrder = (v: string): CardId[] => parseOrder(v.split(COLUMN_BREAK).join(','))
export const listsText = (lists: readonly (readonly string[])[]): string => lists.map(l => l.join(',')).join(COLUMN_BREAK)

// More lists than columns fold together in order: neighbours share a column, no card is lost
export function foldLists<T>(lists: readonly (readonly T[])[], n: number): T[][] {
  if (lists.length <= n) return lists.map(l => [...l])
  const out = Array.from({ length: Math.max(1, n) }, (): T[] => [])
  for (const [c, l] of lists.entries()) out[Math.floor((c * out.length) / lists.length)].push(...l)
  return out
}

export async function readOrderSet(i: Io): Promise<{ orders: Orders; lists: ColumnLists }> {
  const raw = {} as Record<Bucket, unknown>
  for (const b of BUCKETS) raw[b] = await i.get(orderKey(b))
  const orders = {} as Orders
  const lists: ColumnLists = {}
  for (const b of BUCKETS) {
    const v = raw[b]
    const own = parseLists(v)
    if (own !== undefined) lists[b] = own
    orders[b] = typeof v === 'string' ? flatOrder(v) : inherits(b) ? [...orders[(b - 1) as Bucket]] : defaultOrder()
  }
  // A width with no order of its own starts from the nearest wider one that has columns, folded to its own
  for (const b of BUCKETS) {
    if (typeof raw[b] === 'string') continue
    const from = BUCKETS.find(w => w > b && lists[w] !== undefined && typeof raw[w] === 'string')
    if (from === undefined) continue
    const folded = foldLists(lists[from] ?? [], b)
    lists[b] = folded
    orders[b] = folded.flat()
  }
  return { orders, lists }
}

export const readOrders = async (i: Io): Promise<Orders> => (await readOrderSet(i)).orders

export async function hasSavedOrder(i: Io): Promise<boolean> {
  for (const b of BUCKETS) if (typeof (await i.get(orderKey(b))) === 'string') return true
  return false
}

export async function writeOrder(i: Io, bucket: Bucket, order: CardId[]): Promise<void> {
  await i.set(orderKey(bucket), order.join(','))
}

// One column is a plain order; more are kept as lists
export async function writeLists(i: Io, bucket: Bucket, lists: readonly (readonly CardId[])[]): Promise<void> {
  await i.set(orderKey(bucket), lists.length > 1 ? listsText(lists) : lists.flat().join(','))
}

export async function resetOrders(i: Io): Promise<void> {
  for (const k of OLD_ORDER_KEYS) await i.del(k)
  for (const b of BUCKETS) await i.del(orderKey(b))
}

export const defaultOrder = (): CardId[] => [...CARD_IDS]

// It never holds the session marks, the arranging mode, or (later) what Claude may do alone

const LAYOUTS_KEY = 'cockpit:layouts'
export const MAX_LAYOUTS = 12
export const MAX_NAME = 24

export type Layout = { values: Values; orders: Orders; lists?: ColumnLists }
export type Layouts = Record<string, Layout>

export const LAYOUT_KEYS: string[] = SETTINGS.filter(s => s.key === 'detail' || s.key.startsWith('detail.') || s.key.startsWith('cards.')).map(s => s.key)

export const cleanName = (raw: string): string => raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)

export function snapshot(values: Values, orders: Orders, lists: ColumnLists = {}): Layout {
  const v: Values = {}
  for (const k of LAYOUT_KEYS) {
    const s = findSetting(k)
    if (s !== undefined) v[k] = validValue(s, values[k])
  }
  // Orders that hold only the first widths (an older caller) give a wider width the nearest smaller one's.
  const o = {} as Orders
  for (const b of BUCKETS) o[b] = [...((orders as Partial<Orders>)[b] ?? o[(b - 1) as Bucket])]
  const l: ColumnLists = {}
  for (const b of BUCKETS) if (lists[b] !== undefined) l[b] = (lists[b] ?? []).map(c => [...c])
  return { values: v, orders: o, lists: l }
}

// The stored text of one width: its lists when it has columns, else its one order
const orderText = (l: Layout, b: Bucket): string => (l.lists?.[b] === undefined ? l.orders[b].join(',') : listsText(l.lists[b] ?? []))
export const sameLayout = (a: Layout, b: Layout): boolean => LAYOUT_KEYS.every(k => a.values[k] === b.values[k]) && BUCKETS.every(x => orderText(a, x) === orderText(b, x))

export function parseLayouts(raw: unknown): Layouts {
  const out: Layouts = {}
  try {
    const data = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : undefined
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return out
    for (const [name, item] of Object.entries(data)) {
      const l = item as { v?: Record<string, unknown>; o?: Record<string, unknown> } | null
      if (name !== cleanName(name) || name === '' || l === null || typeof l !== 'object') continue
      const values: Values = {}
      for (const k of LAYOUT_KEYS) {
        const s = findSetting(k)
        if (s !== undefined) values[k] = validValue(s, l.v?.[k])
      }
      const orders = {} as Orders
      const lists: ColumnLists = {}
      for (const b of BUCKETS) {
        const o = l.o?.[String(b)]
        orders[b] = inherits(b) && typeof o !== 'string' ? [...orders[(b - 1) as Bucket]] : typeof o === 'string' ? flatOrder(o) : parseOrder(o)
        const own = parseLists(o)
        if (own !== undefined) lists[b] = own
      }
      out[name] = { values, orders, lists }
    }
  } catch {
    return {}
  }
  return out
}

const serialize = (layouts: Layouts): string =>
  JSON.stringify(Object.fromEntries(Object.entries(layouts).map(([name, l]) => [name, { v: l.values, o: Object.fromEntries(BUCKETS.map(b => [b, orderText(l, b)])) }])))

export const readLayouts = async (i: Io): Promise<Layouts> => parseLayouts(await i.get(LAYOUTS_KEY))

export function nextName(layouts: Layouts): string {
  for (let n = 1; ; n += 1) if (layouts[`Layout ${n}`] === undefined) return `Layout ${n}`
}

export async function saveLayout(i: Io, rawName: string, layout: Layout): Promise<{ name?: string; why?: string }> {
  const layouts = await readLayouts(i)
  const name = cleanName(rawName) === '' ? nextName(layouts) : cleanName(rawName)
  if (layouts[name] === undefined && Object.keys(layouts).length >= MAX_LAYOUTS) return { why: `Only ${MAX_LAYOUTS} layouts fit. Delete one first.` }
  layouts[name] = layout
  await i.set(LAYOUTS_KEY, serialize(layouts))
  return { name }
}

export async function renameLayout(i: Io, from: string, rawTo: string): Promise<{ name?: string; why?: string }> {
  const layouts = await readLayouts(i)
  const to = cleanName(rawTo)
  if (layouts[from] === undefined) return { why: `No layout named "${from}".` }
  if (to === '') return { why: 'Type the new name first.' }
  if (to === from) return { name: from }
  if (layouts[to] !== undefined) return { why: `A layout named "${to}" exists already.` }
  const renamed: Layouts = {}
  for (const [k, v] of Object.entries(layouts)) renamed[k === from ? to : k] = v
  await i.set(LAYOUTS_KEY, serialize(renamed))
  return { name: to }
}

export async function deleteLayout(i: Io, name: string): Promise<boolean> {
  const layouts = await readLayouts(i)
  if (layouts[name] === undefined) return false
  delete layouts[name]
  await i.set(LAYOUTS_KEY, serialize(layouts))
  return true
}

export async function applyLayout(i: Io, name: string): Promise<boolean> {
  const layout = (await readLayouts(i))[name]
  if (layout === undefined) return false
  for (const k of LAYOUT_KEYS) await writeSetting(i, k, layout.values[k])
  for (const b of BUCKETS) await i.set(orderKey(b), orderText(layout, b))
  return true
}

const SEEDED_KEY = 'cockpit:pref:recipes:seeded'
export const RECIPES: Layouts = {}

// Stored names
export function layoutLabel(name: string): string {
  switch (name) {
    case 'Focus':
      return t('settings.layout_focus')
    case 'Money':
      return t('settings.layout_money')
    case 'Everything':
      return t('settings.layout_everything')
    case 'Quiet':
      return t('settings.layout_calm')
    default:
      return name
  }
}

export async function seedRecipes(_i: Io): Promise<void> {}

export const clearLayouts = async (i: Io): Promise<void> => {
  await i.del(LAYOUTS_KEY)
  await i.del(SEEDED_KEY)
}
