// A small price table for turning tokens into dollars. Every figure is an estimate: list price, no plan, real cache lifetime, long-prompt rates or discount. An unknown model gets no price, never a guess.
import { fmt } from './fmt'
import { langNow, tIn } from '../i18n/t'

export const PRICES_DATE = '9 Oct 2026'

// `write` is the 5-minute cache write; a 1-hour write costs more, so the estimate can be low.
type Price = { input: number; output: number; read: number; write: number }

// A narrow line goes above a wide one.
const TABLE: Array<{ match: RegExp; name: string; price: Price }> = [
  { match: /fable|mythos/, name: 'Fable', price: { input: 10, output: 50, read: 0.25, write: 12.5 } },
  { match: /opus-5[-.]5/, name: 'Opus 5.5', price: { input: 4, output: 20, read: 0.2, write: 5 } },
  { match: /opus/, name: 'Opus', price: { input: 5, output: 25, read: 0.5, write: 6.25 } },
  { match: /sonnet-5/, name: 'Sonnet 5', price: { input: 2, output: 10, read: 0.2, write: 2.5 } },
  { match: /sonnet/, name: 'Sonnet', price: { input: 3, output: 15, read: 0.3, write: 3.75 } },
  { match: /haiku-5/, name: 'Haiku 5', price: { input: 0.1, output: 0.5, read: 0.01, write: 0.125 } },
  { match: /haiku/, name: 'Haiku', price: { input: 1, output: 5, read: 0.1, write: 1.25 } },
]

export type Counts = { input: number; output: number; read: number; write: number }

const find = (model: string): (typeof TABLE)[number] | undefined => {
  const m = model.toLowerCase()
  return TABLE.find(t => t.match.test(m))
}

export const priceOf = (model: string | undefined): Price | undefined => (model === undefined ? undefined : find(model)?.price)

export const priceName = (model: string | undefined): string | undefined => (model === undefined ? undefined : find(model)?.name)

const per = (tokens: number, rate: number): number => (tokens * rate) / 1_000_000

// An unknown is never turned into zero.
export function estimateUsd(model: string | undefined, c: Counts): number | undefined {
  const p = priceOf(model)
  return p === undefined ? undefined : per(c.input, p.input) + per(c.output, p.output) + per(c.read, p.read) + per(c.write, p.write)
}

// More digits for small sums, so a cheap turn is not shown as zero.
export const money = (usd: number): string => fmt.money(usd)
// For sentences built and kept in English.
export const moneyEn = (usd: number): string => fmt.money(usd, 'en')
// An estimate, two places always ("about $0.05", "about $1.80", Swedish "ungefär 1,80 USD"), "under $0.01" below a cent; English when `t` is the plain one (the text twin), else the language of this draw.
// Which language `t` speaks: a row's English that it leaves as it is is the plain one
const langOf = (t: (s: string) => string): string => (t('{usd} (estimate)') === '{usd} (estimate)' ? 'en' : langNow())
export const aboutMoney = (usd: number, t: (s: string) => string = s => s): string => {
  const l = langOf(t)
  return usd < 0.01 ? fmt.moneyAbout(usd, l) : tIn(l, 'fmt.about_usd', { usd: fmt.moneyPlain(usd, l) })
}
// The same estimate, saying it is one where it stands alone on a row ("about $0.12 (estimate)")
export const aboutEstimate = (usd: number, t: (s: string) => string = s => s): string => tIn(langOf(t), 'fmt.usd_estimate', { usd: aboutMoney(usd, t) })
