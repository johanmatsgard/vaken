// The hello when a phone attaches: one notice in the chat about what waits and the plan. A `system` row, so the person reads it and Claude never does. Names, counts and percentages only.
import type { Setting } from './settings'
import { fmt } from './fmt'
import type { Lang } from '../i18n/types'

export const PHONE_SETTINGS: Setting[] = [
  {
    key: 'phone.hello',
    group: 'Attention',
    label: 'Phone hello',
    note: 'A short notice in the session when your phone joins.',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
]

export const PHONE_EVERY_MS = 30 * 60_000
export const PHONE_PLAN_MIN_PCT = 50
export const PHONE_MAX_LINES = 4
export const PHONE_MAX_NAMES = 2
export const PHONE_NAME_CHARS = 28

// A clock that went back says nothing.
export const helloDue = (last: number | undefined, now: number): boolean => last === undefined || now - last >= PHONE_EVERY_MS

export type PhoneNeed = { name: string; kind: 'question' | 'permission' }
export type PhonePlan = { name: string; percent: number; resetsAt?: string; withDay: boolean }
export type PhoneFacts = {
  needs: PhoneNeed[]
  held: number
  holds?: { name: string; here: boolean }[]
  usd?: number
  finished: number
  plan?: PhonePlan
}

export type Say = (english: string) => string

// The plan limit as the glossary says it, on the phone and in the /vaken reply alike: "86% of the 5-hour limit"
export function limitPhrase(short: string, pct: string, t: Say): string {
  const said = short === 'Session' || short === '5-hour limit' ? t('{pct} of the 5-hour limit') : short === 'Week' ? t('{pct} of the weekly limit') : short === 'Spend' ? t('{pct} of your spending limit') : short === 'Extra' ? t('{pct} of your extra usage') : t('{pct} of the weekly limit ({model})').replace('{model}', short)
  return said.replace('{pct}', pct)
}

export function planLine(p: PhonePlan, t: Say, lang: Lang = 'en'): string {
  const d = p.resetsAt === undefined ? undefined : new Date(p.resetsAt)
  const when = d === undefined || Number.isNaN(d.getTime()) ? '' : p.withDay ? fmt.day(d.getDay(), lang) : t('{time}').replace('{time}', fmt.clock(d))
  const limit = limitPhrase(p.name, fmt.usedIn(p.percent, lang), t)
  return when === '' ? limit : `${limit}, ${t('resets {when}').replace('{when}', when)}`
}

const cut = (name: string): string => (name.length > PHONE_NAME_CHARS ? `${name.slice(0, PHONE_NAME_CHARS - 1)}…` : name)

// Held steps come first, then asking sessions, then the ones whose turn it is; the plan and cost last. "Needs you" is said once, with the names.
const hereFirst = <T extends { here: boolean }>(xs: T[]): T[] => [...xs.filter(x => x.here), ...xs.filter(x => !x.here)]

export function helloLines(f: PhoneFacts, t: Say, lang: Lang = 'en'): string[] {
  const plan = f.plan !== undefined && f.plan.percent > PHONE_PLAN_MIN_PCT ? planLine(f.plan, t, lang) : undefined
  const parts: string[] = []
  const n = f.needs.length
  if (f.held > 0) parts.push(t(f.held === 1 ? '1 step stopped' : '{n} steps stopped').replace('{n}', String(f.held)))
  if (f.finished > 0) parts.push(t('{n} your turn').replace('{n}', String(f.finished)))
  if (parts.length === 0 && n === 0 && plan === undefined) return []
  const shownNeeds = f.needs.slice(0, PHONE_MAX_NAMES).map(x => `${cut(x.name)} (${t(x.kind === 'question' ? 'asks a question' : 'waits for an OK')})`)
  const needsLine = n === 0 ? undefined : t('Needs you: {list}').replace('{list}', `${shownNeeds.join(' · ')}${n > shownNeeds.length ? ` · ${t('and {n} more').replace('{n}', String(n - shownNeeds.length))}` : ''}`)
  // With nothing else to count, the head carries the names; with nothing at all, the plan
  const headNeeds = parts.length === 0 && needsLine !== undefined
  const out: string[] = [['Vaken', ...(parts.length > 0 ? parts : headNeeds ? [needsLine] : plan === undefined ? [] : [plan])].join(' · ')]
  const holds = hereFirst(f.holds ?? [])
  if (holds.length > 0) {
    const shown = holds.slice(0, PHONE_MAX_NAMES).map(x => (x.here ? t('this session') : cut(x.name)))
    const rest = holds.length - shown.length
    out.push(`${t('Stopped')}: ${shown.join(' · ')}${rest > 0 ? ` · ${t('and {n} more').replace('{n}', String(rest))}` : ''}`)
  }
  if (needsLine !== undefined && !headNeeds) out.push(needsLine)
  const busy = parts.length > 0 || n > 0
  const cost = f.usd !== undefined && f.usd > 0 && busy ? `${t('Cost')}: ${fmt.moneyPlain(f.usd, lang)}` : undefined
  const last = [plan !== undefined && busy ? plan : undefined, cost].filter((x): x is string => x !== undefined)
  if (last.length > 0) out.push(last.join(' · '))
  return out.slice(0, PHONE_MAX_LINES)
}

// The phone's own words; "{n} your turn", "{pct} of the 5-hour limit", "resets {when}" and "{time}" are the pane's rows, said the same here
export const PHONE_VIEW_STRINGS: string[] = [
  '1 step stopped',
  '{n} steps stopped',
  'Needs you: {list}',
  'asks a question',
  'waits for an OK',
  'and {n} more',
  '{pct} of the weekly limit',
  '{pct} of the weekly limit ({model})',
  '{pct} of your spending limit',
  '{pct} of your extra usage',
  '5-hour',
  'week',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]

