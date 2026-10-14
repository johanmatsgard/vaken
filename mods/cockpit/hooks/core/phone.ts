// The hello when a phone attaches: one notice in the chat about what waits and the plan. A `system` row, so the person reads it and Claude never does. Names, counts and percentages only.
import type { Setting } from './settings'
import { fmt } from './fmt'

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

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n))

const PLAN_NAMES: Record<string, string> = { Session: '5-hour', '5-hour limit': '5-hour', Week: 'week', Spend: 'spending', Extra: 'extra usage' }

export function planLine(p: PhonePlan, t: Say): string {
  const name = PLAN_NAMES[p.name] === undefined ? p.name : t(PLAN_NAMES[p.name] as string)
  const d = p.resetsAt === undefined ? undefined : new Date(p.resetsAt)
  const when = d === undefined || Number.isNaN(d.getTime()) ? '' : p.withDay ? t(fmt.day(d.getDay())) : `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const pct = String(Math.round(p.percent))
  return when === '' ? t('Plan: {name} {pct}%').replace('{name}', name).replace('{pct}', pct) : t('Plan: {name} {pct}%, resets {when}').replace('{name}', name).replace('{pct}', pct).replace('{when}', when)
}

const cut = (name: string): string => (name.length > PHONE_NAME_CHARS ? `${name.slice(0, PHONE_NAME_CHARS - 1)}…` : name)

// Held steps come first, then asking sessions, then finished ones; the plan and cost last.
const hereFirst = <T extends { here: boolean }>(xs: T[]): T[] => [...xs.filter(x => x.here), ...xs.filter(x => !x.here)]

export function helloLines(f: PhoneFacts, t: Say): string[] {
  const plan = f.plan !== undefined && f.plan.percent > PHONE_PLAN_MIN_PCT ? planLine(f.plan, t) : undefined
  const parts: string[] = []
  const n = f.needs.length
  if (f.held > 0) parts.push(t(f.held === 1 ? '1 step stopped' : '{n} steps stopped').replace('{n}', String(f.held)))
  if (n > 0) parts.push(t(n === 1 ? '{n} session needs you' : '{n} sessions need you').replace('{n}', String(n)))
  if (f.finished > 0) parts.push(t(f.finished === 1 ? '1 finished' : '{n} finished').replace('{n}', String(f.finished)))
  if (parts.length === 0 && plan === undefined) return []
  const out: string[] = [['Vaken', ...(parts.length > 0 ? parts : plan === undefined ? [] : [plan])].join(' · ')]
  const holds = hereFirst(f.holds ?? [])
  if (holds.length > 0) {
    const shown = holds.slice(0, PHONE_MAX_NAMES).map(x => (x.here ? t('this session') : cut(x.name)))
    const rest = holds.length - shown.length
    out.push(`${t('Stopped')}: ${shown.join(' · ')}${rest > 0 ? ` · ${t('and {n} more').replace('{n}', String(rest))}` : ''}`)
  }
  if (n > 0) {
    const shown = f.needs.slice(0, PHONE_MAX_NAMES).map(x => `${cut(x.name)} (${t(x.kind === 'question' ? 'asks a question' : 'waits for an OK')})`)
    const rest = n - shown.length
    out.push(t('Needs you: {list}').replace('{list}', `${shown.join(' · ')}${rest > 0 ? ` · ${t('and {n} more').replace('{n}', String(rest))}` : ''}`))
  }
  const cost = f.usd !== undefined && f.usd > 0 && parts.length > 0 ? `${t('Cost')}: ${fmt.moneyPlain(f.usd)}` : undefined
  const last = [plan !== undefined && parts.length > 0 ? plan : undefined, cost].filter((x): x is string => x !== undefined)
  if (last.length > 0) out.push(last.join(' · '))
  return out.slice(0, PHONE_MAX_LINES)
}

export const PHONE_VIEW_STRINGS: string[] = [
  '{n} session needs you',
  '{n} sessions need you',
  '1 step stopped',
  '{n} steps stopped',
  '1 finished',
  '{n} finished',
  'Needs you: {list}',
  'asks a question',
  'waits for an OK',
  'and {n} more',
  'Plan: {name} {pct}%',
  'Plan: {name} {pct}%, resets {when}',
  '5-hour',
  'week',
  'spending',
  'extra usage',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]

