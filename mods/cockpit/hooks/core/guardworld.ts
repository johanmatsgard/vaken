// The Guard part 2: real-world action guard, secret tripwire, outbox and away policy. Kinds, tool names, places, counts and times only. Speed bumps, not a lock.
import { tr } from './lang'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import type { Mode } from './guard'
import { effectWords, outwardOf } from './guardeffects'
import type { Outward } from './guardeffects'
import { secretsBefore } from './guardsecrets'

export type Rule = 'world' | 'secrets'
export const RULES: readonly Rule[] = ['world', 'secrets']

export const WORLD_KEY = 'guard.world'
export const SECRETS_KEY = 'guard.secrets'
export const OUTBOX_KEY = 'guard.outbox'
export const AWAY_POLICY_KEY = 'away.policy'

const MODES = [
  { value: 'off', label: 'Off' },
  { value: 'warn', label: 'Warn' },
  { value: 'hold', label: 'Stop' },
]

export const GUARDWORLD_SETTINGS: Setting[] = [
  { key: WORLD_KEY, group: 'Risky steps', label: 'Outside actions', note: 'Messages, posts, payments, cloud changes. Warn, or stop until you say yes.', options: MODES, default: 'warn' },
  { key: SECRETS_KEY, group: 'Risky steps', label: 'Secrets', note: 'Secret files read, keys printed or sent. Stops if Claude Code would not ask, else warns.', options: MODES, default: 'warn' },
  {
    key: OUTBOX_KEY,
    group: 'Risky steps',
    label: 'Held messages',
    note: 'List what leaves this computer each answer.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
  {
    key: AWAY_POLICY_KEY,
    group: 'Risky steps',
    label: 'While away',
    note: 'While away, stop risky steps by themselves.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'careful', label: 'Careful' },
    ],
    default: 'off',
  },
]

export const GUARDWORLD_HELP: HelpEntry[] = [
  {
    title: 'Why did it stop a step that reaches outside?',
    text: 'It watches steps that reach outside this computer, such as messages, payments, pull requests and cloud changes, and secrets read or sent. In Warn it tells Claude after the step, and in Stop it stops the step until you allow it. Left unchosen, Warn reads "Warn (stops in auto mode)": it stops a secret step where Claude Code would not ask you first, and warns where it asks or vaken cannot tell; a Warn you pick yourself only warns.',
  },
  {
    title: 'Held messages and away',
    text: '/vaken-guard outbox lists what left this computer this answer. /vaken-away on makes vaken stop risky steps by itself while you are gone. It needs While away set to Careful.',
  },
]


export const HELD_WHAT: Record<Rule, string> = { world: 'Held an action outside your computer', secrets: 'Held a step that touches a secret' }
export const WARNED_WHAT: Record<Rule, string> = { world: 'Warned before an action outside your computer', secrets: 'Warned about a secret' }
export const AWAY_ON_WHAT = 'Turned on away mode'
export const AWAY_OFF_WHAT = 'Turned off away mode'
export const AWAY_DENY_WHAT = 'Refused a risky step while away'
export const GUARDWORLD_WHATS: readonly string[] = [...RULES.map(r => HELD_WHAT[r]), ...RULES.map(r => WARNED_WHAT[r]), AWAY_ON_WHAT, AWAY_OFF_WHAT, AWAY_DENY_WHAT]


export const outboxKey = (sid: string): string => `cockpit:outbox:${sid}`
// One switch for the whole computer: when the person is away, every session is.
export const AWAY_KEY = 'cockpit:away'
export const AWAY_BAND_TTL_MS = 12 * 3_600_000


export type WorldFound = { rule: Rule; key: string; words: string }

const RULE_NAME: Record<Rule, string> = { world: 'outside-actions check', secrets: 'secret tripwire' }
const rulesOf = (list: WorldFound[]): string => [...new Set(list.map(f => RULE_NAME[f.rule]))].join(' and ')
const joinWords = (list: WorldFound[]): string => list.map(f => f.words).join(' ')

export type Modes = Record<Rule, Mode>

export type Judged = { found: WorldFound[]; outs: Outward[] }

export function judgeWorld(tool: string, args: Record<string, unknown>, modes: Modes): Judged {
  const outs = outwardOf(tool, args)
  const found: WorldFound[] = []
  if (modes.world !== 'off') for (const o of outs) if (o.guarded && !(o.routine === true && modes.world === 'warn')) found.push({ rule: 'world', key: `${o.label[0]}|${o.to}|${o.now}`, words: effectWords(o, 'would') })
  if (modes.secrets !== 'off') for (const s of secretsBefore(tool, args)) found.push({ rule: 'secrets', key: s.key, words: s.words })
  return { found, outs }
}


const HOLD_TAIL = 'Do not look for another way around it. Ask the person; they can allow it with /vaken-guard allow once. After the person allows it, send the exact same step again.'
export const holdReason = (list: WorldFound[]): string => `Vaken's ${rulesOf(list)} stopped this step. ${joinWords(list)} ${HOLD_TAIL}`
export const warnNote = (list: WorldFound[], ran: boolean): string =>
  `Vaken's ${rulesOf(list)} saw ${ran ? 'a risk in the step that just ran' : 'a risk in what the step returned'}. ${joinWords(list)}${list.some(f => f.rule === 'secrets') ? ' Do not repeat a secret in a message, a command or a file.' : ''} Tell the person about it in your next message, in plain words.`
export const withheldReason = (list: WorldFound[]): string => `Vaken's ${rulesOf(list)} withheld this result. ${joinWords(list)} The step has already run. ${HOLD_TAIL} Then run it again.`
export const allowedNote = (list: WorldFound[]): string => `Vaken's ${rulesOf(list)} would have stopped this step, but the person allowed it once. ${joinWords(list)}`
export const brokeReason = 'Vaken could not check this step for outside effects and secrets, so it did not run it. Ask the person; they can turn the check off in Settings > Safety.'

const HAPPENED: Record<Rule, string> = { world: 'a step that reaches outside your computer', secrets: 'a step that touches a secret' }
const rulesSaid = (list: WorldFound[]): string => [...new Set(list.map(f => tr(HAPPENED[f.rule])))].join(` ${tr('and')} `)
export const heldToast = (list: WorldFound[]): string => tr('Stopped {what}. Press Allow once in Needs you to let it through.').replace('{what}', rulesSaid(list))
export const warnToast = (list: WorldFound[]): string => tr('Claude was told about {what}.').replace('{what}', rulesSaid(list))
export const detailOf = (list: WorldFound[]): string => joinWords(list).slice(0, 220)


type OutboxItem = { one: string; many: string; to: string; n: number; write: boolean }
export type Outbox = { open: boolean; at: number; items: OutboxItem[] }
const OUTBOX_KEEP = 30

export const emptyOutbox = (now: number): Outbox => ({ open: true, at: now, items: [] })

export function parseOutbox(raw: unknown): Outbox | undefined {
  const o = raw as Outbox
  if (typeof o !== 'object' || o === null || typeof o.open !== 'boolean' || typeof o.at !== 'number' || !Array.isArray(o.items)) return undefined
  const items = o.items.filter((x): x is OutboxItem => typeof x === 'object' && x !== null && typeof x.one === 'string' && typeof x.many === 'string' && typeof x.to === 'string' && typeof x.n === 'number' && typeof x.write === 'boolean')
  return { open: o.open, at: o.at, items }
}

export function addOutbox(box: Outbox, outs: Outward[]): Outbox {
  const items = box.items.map(x => ({ ...x }))
  for (const o of outs) {
    const hit = items.find(x => x.one === o.label[0] && x.to === o.to)
    if (hit !== undefined) {
      hit.n += 1
      hit.write = hit.write || o.write
    } else items.push({ one: o.label[0], many: o.label[1], to: o.to, n: 1, write: o.write })
  }
  return { ...box, items: items.slice(-OUTBOX_KEEP) }
}

const itemWords = (x: OutboxItem): string => `${x.n} ${x.n === 1 ? x.one : x.many}${x.to === '' ? '' : ` to ${x.to}`}`
export const outboxLine = (items: OutboxItem[]): string => items.map(itemWords).join(', ')
const outboxWrites = (box: Outbox): OutboxItem[] => box.items.filter(x => x.write)

export function outboxBand(box: Outbox): string {
  const writes = outboxWrites(box)
  for (let k = writes.length; k >= 1; k -= 1) {
    const text = `Sent: ${outboxLine(writes.slice(0, k))}${k < writes.length ? ` +${writes.length - k}` : ''}`
    if (text.length <= 60) return text
  }
  return writes.length === 0 ? '' : `Sent: ${itemWords(writes[0] as OutboxItem)}`.slice(0, 60)
}

export function outboxText(box: Outbox | undefined, isOn: boolean): string {
  const lines: string[] = []
  if (!isOn) lines.push(tr('The outbox is off. Turn it on: Settings > Safety.'), '')
  if (box === undefined || box.items.length === 0) lines.push(box?.open === false ? tr('Last answer: nothing left this computer that vaken saw.') : tr('This answer: nothing has left this computer that vaken saw.'))
  else {
    lines.push(`${box.open ? tr('This answer') : tr('Last answer')}: ${outboxLine(box.items)}.`)
    const w = outboxWrites(box)
    if (w.length > 0) lines.push(`${tr('These change something outside')}: ${outboxLine(w)}.`)
  }
  lines.push('', tr('The list shows the kind and the place, never what was in it. It reads commands and outside tools by name, so it can miss a step hidden in a script file.'))
  return lines.join('\n')
}


export type Away = { at: number }
export const parseAway = (v: unknown): Away | undefined => (typeof v === 'object' && v !== null && typeof (v as { at?: unknown }).at === 'number' ? { at: (v as { at: number }).at } : undefined)

const AWAY_REASON = 'You are away; vaken stopped a risky step. It waits for you.'
export const awayReason = `${AWAY_REASON} Do not look for another way around it. Carry on with other work that is safe, and tell the person when they are back.`
export const AWAY_BAND = 'Away: risky steps are stopped'
export const awayToast = 'Away: stopped a risky step. It waits for you.'

export type AwayAsk = { kind: 'status' } | { kind: 'on' } | { kind: 'off' } | { kind: 'bad'; why: string }
export function parseAwayAsk(args: string): AwayAsk {
  const w = args.trim().toLowerCase()
  if (w === '' || w === 'status') return { kind: 'status' }
  if (w === 'on' || w === 'off') return { kind: w }
  return { kind: 'bad', why: tr('Use: /vaken-away on, /vaken-away off, or /vaken-away to look.') }
}

type AwayFacts = { away: boolean; policy: string; refused: string[] }
export function awayText(f: AwayFacts): string {
  const lines: string[] = [f.away ? tr('Away is ON. Lift it with /vaken-away off when you are back.') : tr('Away is off. /vaken-away on tells vaken you are gone.')]
  if (f.policy === 'careful') lines.push(tr('While away: Careful. While away, a step that the safety check would flag (risky commands, edits to protected files or outside your folders, odd new packages, weakened tests, outside actions, secrets) is stopped by itself, with no popup. Safe steps keep running. Allow once does not work while away.'))
  else lines.push(f.away ? tr('While away: Off, so nothing is stopped. Set it to Careful in Settings > Safety to stop risky steps while you are gone.') : tr('While away: Off. Set it to Careful in Settings > Safety to stop risky steps while you are gone.'))
  if (f.refused.length > 0) lines.push('', tr('Last stopped:'), ...f.refused)
  return lines.join('\n')
}
