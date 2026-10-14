// Skill coach and decision log. Only a short hash of each request is kept, with a count. Pure.
import { tr } from './lang'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { ymd } from './time'

export const COACH_SETTINGS: Setting[] = [
  {
    key: 'coach.mode',
    group: 'Notes for the next session',
    label: 'Skill coach',
    note: 'Notices a request you repeat and offers a skill.',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
  {
    key: 'decisions.mode',
    group: 'Notes for the next session',
    label: 'Decision log',
    note: 'Writes down your answers and decisions you state.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
]
export const COACH_HELP: HelpEntry[] = [
  { title: 'What the skill coach does', text: 'If you ask for the same kind of thing three times, vaken offers to save it as a skill, so you type one word next time. It keeps only a short code of each request, not the words. /vaken-help run coach shows the offer.' },
  { title: 'What the decision log does', text: 'When on, your answers to Claude\'s questions and decisions you state ("let\'s go with X") are written down with the date, and /vaken-memory decide <sentence> adds one by hand. It is on in Recommended, the default; Only alerts turns it off, and so does Settings. /vaken-memory decisions lists them.' },
]

export const COACH_WHAT = 'Offered a skill for a repeated request'
export const COACH_AFTER = 3
const KEEP = 200

export function normalize(text: string): string | undefined {
  const t = text.trim()
  if (t.startsWith('/')) return undefined
  const words = t.toLowerCase().replace(/[0-9]+/g, ' ').replace(/[^a-zåäö\s]/g, ' ').split(/\s+/).filter(Boolean)
  return words.length < 4 ? undefined : words.slice(0, 12).join(' ')
}

export type Seen = Record<string, { n: number; at: number }>
export const coachKey = (projectHash: string): string => `cockpit:coach:${projectHash}`

export const parseSeen = (raw: unknown): Seen => (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Seen) : {})

export function count(seen: Seen, key: string, now: number): { seen: Seen; offer: boolean } {
  const n = (seen[key]?.n ?? 0) + 1
  const next: Seen = { ...seen, [key]: { n, at: now } }
  const keys = Object.keys(next)
  if (keys.length > KEEP) for (const k of keys.sort((a, b) => next[a].at - next[b].at).slice(0, keys.length - KEEP)) delete next[k]
  return { seen: next, offer: n === COACH_AFTER }
}

export const skillName = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 4).join('-') || 'my-skill'
export const skillFile = (name: string, text: string): string => `---\nname: ${name}\ndescription: ${text.replace(/\s+/g, ' ').trim().slice(0, 160)}\n---\n\n${text.trim()}\n`

export const offerToast = (): string => tr('You have asked for this kind of thing {n} times. /vaken-help run coach can save it as a skill.').replace('{n}', String(COACH_AFTER))

export type Decision = { at: number; text: string; how: 'asked' | 'typed' }
export const decisionsKey = (projectHash: string): string => `cockpit:decisions:${projectHash}`
const DECISIONS_MAX = 100
const DECISION_TEXT_MAX = 240
export const parseDecisions = (raw: unknown): Decision[] => (Array.isArray(raw) ? raw.filter((d): d is Decision => typeof (d as Decision)?.text === 'string' && typeof (d as Decision)?.at === 'number').slice(0, DECISIONS_MAX) : [])
export const cleanDecision = (text: string): string => text.replace(/\s+/g, ' ').trim().slice(0, DECISION_TEXT_MAX)
export const addDecision = (list: Decision[], d: Decision): Decision[] => [d, ...list].slice(0, DECISIONS_MAX)

export function decisionsText(list: Decision[], on: boolean): string {
  if (list.length === 0) return `No decisions written down yet.${on ? '' : ' The log is off: turn it on in Settings > Prompts and memory to keep your answers. /vaken-memory decide <sentence> works either way.'}`
  return [`Decisions (${list.length}), newest first:`, ...list.slice(0, 20).map(d => `  ${ymd(d.at)}  ${d.text}${d.how === 'asked' ? '' : ' (noted by you)'}`)].join('\n')
}
export const decisionsFile = (list: Decision[]): string => `# Decisions\n\nWritten by vaken from your answers and notes. Newest first.\n\n${list.map(d => `- ${ymd(d.at)}: ${d.text}`).join('\n')}\n`

// Short and cautious: only a sentence that starts like a decision counts. A question, a quote, code or a long paste never does.

const stripNoise = (text: string): string =>
  text
    .replace(/<([a-z][a-z0-9-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/"[^"\n]*"|“[^”\n]*”/g, ' ')
    .replace(/^\s*>.*$/gm, ' ')

const LEAD = /^(?:(?:ok|okay|yes|yeah|right|alright|so|and|then|good|great|please|ja|okej|bra|alltså|och|så),?\s+)*/iu

const STATED: RegExp[] = [
  /^(?:let's|let us)\s+(?:go with|use|stick with|keep|choose|pick|do|skip|drop)\s+\S/i,
  /^(?:we|i)(?:'ve| have)?\s+(?:decided|agreed|chose|picked)\b/i,
  /^(?:we|i)\s+(?:will|'ll|are going to|'re going to|are going with|'re going with)\s+(?:use|go with|stick with|keep|skip|drop)\s+\S/i,
  /^decision\s*:\s*\S/i,
  /^(?:don't|do not)\s+(?!forget|worry|mind|hesitate|bother|panic|hurry|stop)\S/i,
  /^(?:always|never)\s+(?!mind\b)\S/i,
  /^vi kör på\s+\S/i,
  /^vi (?:har )?(?:bestämt|bestämde|valt|valde)\b/i,
  /^låt oss (?:köra på|köra|använda|ta|skippa)\s+\S/i,
  /^(?:gör|använd|kör|rör) (?:inte|aldrig)\s+\S/i,
  /^(?:alltid|aldrig)\s+\S/i,
]
// "Use X" alone is also a task, so it counts only as a short sentence with nothing after it.
const BARE_LEAD = /^(?:use|go with|stick with|använd|kör på)\s+/i
const BARE = /^[\p{L}\p{N}@./_-]+(?:\s+[\p{L}\p{N}@./_-]+){0,3}$/u
const NOT_BARE = /(?<!\p{L})(?:to|and|then|for|with|when|if|so|så|och|för|med|när|om|att)(?!\p{L})/iu

export const DECISION_LINE_MAX = 140

export function decisionFrom(text: string): string | undefined {
  const t = text.replace(/[’‘]/g, "'").trim()
  if (t === '' || t.startsWith('/') || t.length > 1500) return undefined
  for (const raw of stripNoise(t).split(/(?<=[.!])\s+|\n+/).slice(0, 8)) {
    const s = raw.replace(/\s+/g, ' ').trim()
    if (s === '' || s.includes('?') || s.split(' ').length > 25) continue
    const body = s.replace(LEAD, '')
    const bare = body.replace(/[.!]+$/, '')
    const rest = bare.replace(BARE_LEAD, '')
    const bareUse = rest !== bare && BARE.test(rest) && !NOT_BARE.test(rest.replace(/^(?:the|a|an|den|det|en|ett)\s+/i, ''))
    if (STATED.some(re => re.test(body)) || bareUse) {
      const line = cleanDecision(s)
      return line.length > DECISION_LINE_MAX ? `${line.slice(0, DECISION_LINE_MAX - 1).trimEnd()}…` : line
    }
  }
  return undefined
}

export function addStated(list: Decision[], at: number, text: string): Decision[] {
  return list[0]?.text === text ? list : addDecision(list, { at, text, how: 'typed' })
}
