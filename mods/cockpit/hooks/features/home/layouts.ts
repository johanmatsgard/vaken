// The card order each pane width keeps, and (below) the saved layouts.
import type { Io } from '../../core/io'
import { t } from '../../core/lang'
import { SETTINGS, findSetting, validValue, writeSetting } from '../../core/settings'
import type { Values } from '../../core/settings'
import { CARD_IDS, parseOrder } from './logic'
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

export async function readOrders(i: Io): Promise<Orders> {
  const out = {} as Orders
  for (const b of BUCKETS) {
    const raw = await i.get(orderKey(b))
    out[b] = typeof raw === 'string' ? parseOrder(raw) : inherits(b) ? [...out[(b - 1) as Bucket]] : defaultOrder()
  }
  return out
}

export async function hasSavedOrder(i: Io): Promise<boolean> {
  for (const b of BUCKETS) if (typeof (await i.get(orderKey(b))) === 'string') return true
  return false
}

export async function writeOrder(i: Io, bucket: Bucket, order: CardId[]): Promise<void> {
  await i.set(orderKey(bucket), order.join(','))
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

export type Layout = { values: Values; orders: Orders }
export type Layouts = Record<string, Layout>

export const LAYOUT_KEYS: string[] = SETTINGS.filter(s => s.key === 'detail' || s.key.startsWith('detail.') || s.key.startsWith('cards.')).map(s => s.key)

export const cleanName = (raw: string): string => raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)

export function snapshot(values: Values, orders: Orders): Layout {
  const v: Values = {}
  for (const k of LAYOUT_KEYS) {
    const s = findSetting(k)
    if (s !== undefined) v[k] = validValue(s, values[k])
  }
  // Orders that hold only the first widths (an older caller) give a wider width the nearest smaller one's.
  const o = {} as Orders
  for (const b of BUCKETS) o[b] = [...((orders as Partial<Orders>)[b] ?? o[(b - 1) as Bucket])]
  return { values: v, orders: o }
}

export const sameLayout = (a: Layout, b: Layout): boolean => LAYOUT_KEYS.every(k => a.values[k] === b.values[k]) && BUCKETS.every(x => a.orders[x].join(',') === b.orders[x].join(','))

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
      for (const b of BUCKETS) orders[b] = inherits(b) && typeof l.o?.[String(b)] !== 'string' ? [...orders[(b - 1) as Bucket]] : parseOrder(l.o?.[String(b)])
      out[name] = { values, orders }
    }
  } catch {
    return {}
  }
  return out
}

const serialize = (layouts: Layouts): string =>
  JSON.stringify(Object.fromEntries(Object.entries(layouts).map(([name, l]) => [name, { v: l.values, o: Object.fromEntries(BUCKETS.map(b => [b, l.orders[b].join(',')])) }])))

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
  for (const b of BUCKETS) await writeOrder(i, b, layout.orders[b])
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
