// The daily recap: one band line on the first prompt of a day. Parts that are zero or unknown are left out.
import { BAND_SHORT_CHARS } from './band'
import { ymd } from './time'
import { startOfDay } from './ledger'
import { moneyEn as money } from './prices'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { tEn } from '../i18n/t'

export const TODAY_SETTINGS: Setting[] = [
  {
    key: 'today.brief',
    group: 'Care',
    label: 'Daily recap',
    note: 'On your first prompt of a day, one line above the chat box.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]
export const TODAY_HELP: HelpEntry[] = [
  { title: 'What the daily recap says', text: 'On your first prompt of a day, one line shows above the chat box: how many other sessions wait for you, what yesterday cost, and what vaken did. /vaken-today says the same any time.' },
]

export const TODAY_BAND_MS = 10 * 60_000

export type TodayFacts = {
  waiting: number
  yesterdayUsd?: number
  didYesterday: number
}

export function yesterdayOf(now: number): { from: number; to: number; day: string } {
  const to = startOfDay(now)
  const d = new Date(to)
  d.setDate(d.getDate() - 1)
  return { from: d.getTime(), to, day: ymd(d.getTime()) }
}

const waitPart = (n: number): string => (n === 1 ? '1 session waits' : `${n} sessions wait`)
const costPart = (usd: number): string => (usd < 1 ? 'under $1 yesterday' : `$${Math.round(usd)} yesterday`)

// It must fit the band (60 characters), so vaken part is shortened before the line is cut.
export function bandBrief(f: TodayFacts): string | undefined {
  const base = [...(f.waiting > 0 ? [waitPart(f.waiting)] : []), ...(f.yesterdayUsd !== undefined && f.yesterdayUsd > 0 ? [costPart(f.yesterdayUsd)] : [])]
  if (f.didYesterday <= 0) return base.length === 0 ? undefined : `Today: ${base.join(', ')}.`
  const tails = [`vaken did ${tEn('words.thing', { n: f.didYesterday })}`, `vaken did ${tEn('words.thing', { n: f.didYesterday })}`, `${f.didYesterday} done`]
  const lines = tails.map(t => `Today: ${[...base, t].join(', ')}.`)
  return lines.find(l => l.length <= BAND_SHORT_CHARS) ?? lines[lines.length - 1]
}

export function todayLines(f: TodayFacts, briefOn: boolean): string[] {
  return [
    'Today:',
    f.waiting > 0 ? `${tEn('words.other_session_waits', { n: f.waiting })} for you.` : 'No other session waits for you.',
    f.yesterdayUsd !== undefined && f.yesterdayUsd > 0 ? `Yesterday cost about ${money(f.yesterdayUsd)}, as vaken counted it.` : 'Yesterday cost: not counted.',
    f.didYesterday > 0 ? `Vaken did ${tEn('words.thing', { n: f.didYesterday })} yesterday. /vaken-today value shows what.` : 'Vaken wrote nothing down yesterday.',
    briefOn ? 'The line above the chat box shows this on your first prompt of a day.' : 'The brief above the chat box is off. Turn it on: Settings > Prompts and memory.',
  ]
}
