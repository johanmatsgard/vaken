// The one place for the numbers and times that cards and lines show. Import from here; never use toFixed or Math.round in a card.
import type { Lang } from '../i18n/types'
import { decimalOf } from '../i18n/langs'
import { langNow, tIn } from '../i18n/t'

const marked = (text: string, l: Lang): string => {
  const m = decimalOf(l)
  return m === '.' ? text : text.replace('.', m)
}

// A value under 100 never reads as 100%: 99.6 is "99%".
const percent = (p: number): string => `${p < 100 ? Math.min(99, Math.round(p)) : Math.round(p)}%`

const usdIn = (digits: string, l: Lang): string => (l === 'sv' ? `${marked(digits, l)} USD` : `$${digits}`)

function money(usd: number, l: Lang = langNow()): string {
  if (usd >= 0.1) return usdIn(usd.toFixed(2), l)
  if (usd >= 0.01) return usdIn(usd.toFixed(3), l)
  return usdIn(usd.toFixed(4), l)
}
const moneyPlain = (usd: number, l: Lang = langNow()): string => usdIn(usd.toFixed(2), l)
const moneyAbout = (usd: number, l: Lang = 'en'): string => {
  if (usd < 0.01) return tIn(l, 'fmt.under_usd', { usd: usdIn('0.01', l) })
  return tIn(l, 'fmt.about_usd', { usd: usdIn(usd < 1 ? usd.toFixed(2) : usd.toFixed(1), l) })
}

const decimal = (n: number, l: Lang = 'en'): string => marked(n.toFixed(1), l)
const figure = (n: number, l: Lang = 'en'): string => marked(n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10), l)

// The unit is chosen after rounding: 999600 is "1M", never "1000k".
function tokens(n: number, l: Lang = 'en'): string {
  if (n >= 1_000_000 || Math.round(n / 1_000) >= 1_000) return marked(`${Number((n / 1_000_000).toFixed(1))}M`, l)
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}
const tokensFine = (n: number, l: Lang = 'en'): string => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? marked(`${Number((n / 1000).toFixed(1))}k`, l) : String(Math.round(n)))
const tokensOf = (used: number, window: number, l: Lang = 'en'): string => tIn(l, 'fmt.a_of_b', { a: tokens(used, l), b: tokens(window, l) })

// Minutes and hours round down, so 1 h 59 min is "1 h ago".
export type AgoName = 'plain' | 'hours' | 'days' | 'hm' | 'recent' | 'steady' | 'list'
function ago(ms: number, _name: AgoName = 'days', lang: Lang = 'en'): string {
  const m = Math.max(0, Math.floor(ms / 60_000))
  if (m < 1) return tIn(lang, 'fmt.just_now')
  if (m < 60) return tIn(lang, 'fmt.n_min_ago', { n: m })
  if (m < 24 * 60) return tIn(lang, 'fmt.n_h_ago', { n: Math.floor(m / 60) })
  return tIn(lang, 'fmt.n_d_ago', { n: Math.floor(m / 1440) })
}

function duration(ms: number, lang: Lang = 'en'): string {
  const min = Math.round(ms / 60_000)
  if (min < 1) return tIn(lang, 'fmt.n_s', { n: Math.round(ms / 1000) })
  return min < 60 ? tIn(lang, 'fmt.n_min', { n: min }) : tIn(lang, 'fmt.n_h', { n: marked(String(Math.round(min / 6) / 10), lang) })
}
function span(ms: number, lang: Lang = 'en'): string {
  const min = Math.round(Math.max(0, ms) / 60_000)
  return min < 1 ? tIn(lang, 'fmt.under_1_min') : min < 60 ? tIn(lang, 'fmt.n_min', { n: min }) : tIn(lang, 'fmt.n_h', { n: Math.round(min / 60) })
}

const today = (n: number, lang: Lang = 'en'): string => tIn(lang, 'fmt.n_today', { n })

const DAY_ROWS = ['fmt.sun', 'fmt.mon', 'fmt.tue', 'fmt.wed', 'fmt.thu', 'fmt.fri', 'fmt.sat']
const MONTH_ROWS = ['fmt.jan', 'fmt.feb', 'fmt.mar', 'fmt.apr', 'fmt.may', 'fmt.jun', 'fmt.jul', 'fmt.aug', 'fmt.sep', 'fmt.oct', 'fmt.nov', 'fmt.dec']
const day = (i: number, lang: Lang = 'en'): string => tIn(lang, DAY_ROWS[((i % 7) + 7) % 7])
const DAY_LONG_ROWS = ['fmt.sunday', 'fmt.monday', 'fmt.tuesday', 'fmt.wednesday', 'fmt.thursday', 'fmt.friday', 'fmt.saturday']
const dayLong = (i: number, lang: Lang = 'en'): string => tIn(lang, DAY_LONG_ROWS[((i % 7) + 7) % 7])
const month = (i: number, lang: Lang = 'en'): string => tIn(lang, MONTH_ROWS[((i % 12) + 12) % 12])

// A small reading is shown in MB, never "0.0 GB".
const gb = (mb: number, l: Lang = 'en'): string => marked(mb < 100 ? `${Math.round(mb)} MB` : `${(mb / 1024).toFixed(1)} GB`, l)

// Cut in the middle so both the start and the extension stay; names and titles are cut at the end by width.
const middle = (text: string, max: number): string => {
  const chars = Array.from(text)
  if (chars.length <= max || max < 3) return text
  const keep = max - 1
  const head = Math.ceil(keep / 2)
  return `${chars.slice(0, head).join('')}…${chars.slice(chars.length - (keep - head)).join('')}`
}

export const fmt = { middle, decimal, figure, gb, percent, money, moneyPlain, moneyAbout, tokens, tokensFine, tokensOf, ago, duration, span, today, day, dayLong, month }
