// Learns from you: a correction said 3 times becomes an offer to save it as a project rule, and a role that fails often on a cheaper model gets an offer of a stronger one. Only short codes and counts are stored. Pure.
import { tr } from '../i18n/t'
import { fillIn } from './fillin'
import type { HelpEntry } from './registry'
import type { Setting, Values } from './settings'
import { decisionFrom } from './coach'
import { scanSecrets } from './guardsecrets'
import { hashOf } from './proof'
import { BEGIN, blockOf, blockText } from './setupcard'
import { taughtOf, withTaught } from './taught'
import { ROLES, ROLE_NAMES } from './orchestra'
import type { Role, Run, Task } from './orchestra'
import { MODEL_OPTIONS, familyIn, stepUp } from './models'
import type { Family } from './models'

export const TEACH_LABEL = 'Learn from you'
export const TEACH_NOTE = 'Offers to save a correction you repeat as a project rule.'
export const TEACH_OPT_OFFER = 'Offer'
export const TEACH_SETTINGS: Setting[] = [
  {
    key: 'teach.mode',
    group: 'Notes for the next session',
    label: TEACH_LABEL,
    note: TEACH_NOTE,
    options: [
      { value: 'off', label: 'Off' },
      { value: 'offer', label: TEACH_OPT_OFFER },
    ],
    default: 'offer',
  },
]
export const TEACH_HELP_TITLE = 'What Learn from you does'
export const TEACH_HELP_TEXT = 'When you tell Claude the same thing 3 times in 14 days in one project, such as "use pnpm, not npm", vaken offers once to save it as a rule in the project\'s CLAUDE.md. When an agent role fails 3 of its last 5 tasks on a cheaper model, it offers a stronger model. /vaken-memory rules lists the saved rules.'
export const TEACH_HELP: HelpEntry[] = [{ title: TEACH_HELP_TITLE, text: TEACH_HELP_TEXT }]

export const teachOn = (v: unknown): boolean => v !== 'off'

const DAY = 86_400_000
export const TEACH_AFTER = 3
export const TEACH_WINDOW_MS = 14 * DAY
export const TEACH_QUIET_MS = 30 * DAY
export const MODEL_QUIET_MS = 7 * DAY
const CODES_MAX = 100
const RULE_MAX = 120

// ---- a correction said again and again

export type Rule = { code: string; line: string; said: string }

const cap = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
const LEAD = /^(?:(?:ok|okay|no|nope|again|please|pls|remember|hey|so|and|but|ja|nej|okej|snälla|igen|kom ihåg),?\s+)+/iu
const TOOL = '([\\p{L}\\p{N}@./+_-]{1,30})'
const USE_NOT = new RegExp(`^(?:always\\s+|alltid\\s+)?(?:use|prefer|använd)\\s+${TOOL}\\s*,?\\s+(?:not|instead of|rather than|inte|i stället för|istället för)\\s+${TOOL}$`, 'iu')
const ANSWER_IN = /^(?:always\s+)?(?:answer|reply|respond|write|talk|speak)\s+(?:to me\s+)?in\s+(\p{L}{3,20})$/iu
const SVARA_PA = /^(?:svara|skriv|prata)\s+(?:alltid\s+)?på\s+(\p{L}{3,20})$/iu
const STANDING = /^(?:don't|do not|never|always|stop|aldrig|alltid|sluta|gör inte|använd inte|kör inte)\s+\S/iu
const FILLER = new Set(['the', 'a', 'an', 'please', 'again', 'any', 'just', 'ever', 'really', 'so', 'den', 'det', 'en', 'ett', 'snälla', 'igen'])

// A short code of the sentence: "Don't add comments." and "never add any comments" give the same code.
export function codeOf(sentence: string): string {
  const words = sentence
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\b(?:don't|do not|dont)\b/g, 'never')
    .replace(/[^\p{L}\p{N}\s+.-]/gu, ' ')
    .replace(/(?<!\p{L})[.]+|[.]+(?!\p{L})/gu, ' ')
    .split(/\s+/)
    .filter(w => w !== '' && !FILLER.has(w))
  return words.slice(0, 8).join(' ')
}

function ruleOfSentence(raw: string): Rule | undefined {
  const s = raw.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().replace(LEAD, '').replace(/[.!]+$/, '').trim()
  if (s === '' || s.includes('?') || s.includes('`') || s.split(' ').length > 15 || s.length > RULE_MAX) return undefined
  const use = USE_NOT.exec(s)
  if (use !== null) {
    const [a, b] = [use[1]!, use[2]!]
    if (a.toLowerCase() === b.toLowerCase()) return undefined
    return { code: `use ${a.toLowerCase()} not ${b.toLowerCase()}`, line: `Use ${a}, not ${b}.`, said: `use ${a}, not ${b}` }
  }
  const lang = ANSWER_IN.exec(s) ?? SVARA_PA.exec(s)
  if (lang !== null) {
    const l = lang[1]!.toLowerCase()
    return { code: `answer in ${l}`, line: `Answer in ${cap(l)}.`, said: `answer in ${cap(l)}` }
  }
  if (!STANDING.test(s)) return undefined
  const code = codeOf(s)
  if (code.split(' ').length < 2) return undefined
  return { code, line: `${cap(s)}.`, said: `${s.charAt(0).toLowerCase()}${s.slice(1)}` }
}

// Cheap and local: the decision log's sentence first, then the first few short sentences. A rule that holds a secret is never kept.
export function ruleFrom(text: string): Rule | undefined {
  const t = text.trim()
  // Code or a quote in the message: the decision log's sentence would lose words, so it is left alone.
  if (t === '' || t.startsWith('/') || t.length > 600 || /[`"“]/.test(t)) return undefined
  const first = decisionFrom(t)
  const sentences = [...(first === undefined ? [] : [first]), ...t.split(/(?<=[.!])\s+|\n+/).slice(0, 4)]
  for (const s of sentences) {
    const r = ruleOfSentence(s)
    if (r !== undefined) return scanSecrets(r.line).length > 0 ? undefined : r
  }
  return undefined
}

export type TeachState = { seen: Record<string, number[]>; quiet: Record<string, number> }
export const teachKey = (projectHash: string): string => `cockpit:teach:${projectHash}`
const nums = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)) : [])
export function parseTeach(raw: unknown): TeachState {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<TeachState>
  const seen: Record<string, number[]> = {}
  const quiet: Record<string, number> = {}
  if (typeof o.seen === 'object' && o.seen !== null) for (const [k, v] of Object.entries(o.seen)) seen[k] = nums(v).slice(-TEACH_AFTER)
  if (typeof o.quiet === 'object' && o.quiet !== null) for (const [k, v] of Object.entries(o.quiet)) if (typeof v === 'number') quiet[k] = v
  return { seen, quiet }
}

// The code is stored as a hash, so no words of the prompt are kept.
export function countRule(state: TeachState, code: string, now: number): { state: TeachState; offer: boolean } {
  const key = hashOf(code)
  const seen = { ...state.seen }
  const quiet = Object.fromEntries(Object.entries(state.quiet).filter(([, until]) => until > now))
  const times = [...(seen[key] ?? []).filter(at => now - at <= TEACH_WINDOW_MS), now].slice(-TEACH_AFTER)
  const offer = times.length >= TEACH_AFTER && quiet[key] === undefined
  if (offer) {
    delete seen[key]
    quiet[key] = now + TEACH_QUIET_MS
  } else seen[key] = times
  const keys = Object.keys(seen)
  if (keys.length > CODES_MAX) for (const k of keys.sort((a, b) => (seen[a]!.at(-1) ?? 0) - (seen[b]!.at(-1) ?? 0)).slice(0, keys.length - CODES_MAX)) delete seen[k]
  return { state: { seen, quiet }, offer }
}

// ---- the project file

export type SavedFile = { text: string } | { why: 'secret' | 'same' | 'none' }

// The block is made exactly as the Agent setup card makes it when it is missing.
export function withRule(disk: string | null, values: Values, line: string): SavedFile {
  if (scanSecrets(line).length > 0) return { why: 'secret' }
  if (disk === null || disk.trim() === '') return { text: `${withTaught(blockText(values), [line])}\n` }
  const b = blockOf(disk)
  if (b === undefined) return { text: `${disk.replace(/\s+$/, '')}\n\n${withTaught(blockText(values), [line])}\n` }
  const now = taughtOf(b.body)
  if (now.some(l => l.toLowerCase() === line.toLowerCase())) return { why: 'same' }
  return { text: `${disk.slice(0, b.start)}${withTaught(b.body, [...now, line])}${disk.slice(b.end)}` }
}

export function withoutRule(disk: string, n: number): SavedFile {
  const b = blockOf(disk)
  const now = b === undefined ? [] : taughtOf(b.body)
  if (b === undefined || n < 1 || n > now.length) return { why: 'none' }
  return { text: `${disk.slice(0, b.start)}${withTaught(b.body, now.filter((_, k) => k !== n - 1))}${disk.slice(b.end)}` }
}

export const savedRules = (disk: string | null | false): string[] => {
  if (typeof disk !== 'string' || !disk.includes(BEGIN)) return []
  const b = blockOf(disk)
  return b === undefined ? [] : taughtOf(b.body)
}

export const hasRule = (disk: string | null | false, line: string): boolean => savedRules(disk).some(l => l.toLowerCase() === line.toLowerCase())

export const TEACH_TITLE = 'You told Claude 3 times: {rule}'
export const TEACH_ASK = 'Save it as a rule for this project?'
export const TEACH_LINE = 'This line goes into CLAUDE.md in this project: {line}'
export const TEACH_SAVE = 'Save as a rule'
export const TEACH_LATER = 'Not now'
export const TEACH_HEAD = 'Learned from you'
export const TEACH_SAVED = 'Saved in CLAUDE.md: {line}'
export const TEACH_NOT_SAVED = 'Not saved. /vaken-memory rules save tries again.'
export const TEACH_WHAT = 'Saved a rule you repeated in CLAUDE.md'
export const TEACH_REMOVED_WHAT = 'Removed a saved rule from CLAUDE.md'
export const TEACH_TOAST = 'You told Claude 3 times: {rule}. Save it as a rule for this project? Needs you has the button.'

// ---- learn from outcomes

export type Outcome = 'p' | 'f'
export type Outcomes = { counts: Record<string, { last: string; pass: number; fail: number }>; asked: Record<string, number>; runs: string[] }
export const OUTCOMES_KEY = 'cockpit:teach:outcomes'
const LAST_MAX = 10
const RUNS_MAX = 20
export const outcomeKey = (role: Role, family: Family): string => `${role}:${family}`

export function parseOutcomes(raw: unknown): Outcomes {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Outcomes>
  const counts: Outcomes['counts'] = {}
  if (typeof o.counts === 'object' && o.counts !== null) {
    for (const [k, v] of Object.entries(o.counts)) {
      const c = v as Partial<Outcomes['counts'][string]>
      if (typeof c?.last === 'string') counts[k] = { last: c.last.replace(/[^pf]/g, '').slice(-LAST_MAX), pass: typeof c.pass === 'number' ? c.pass : 0, fail: typeof c.fail === 'number' ? c.fail : 0 }
    }
  }
  const asked: Record<string, number> = {}
  if (typeof o.asked === 'object' && o.asked !== null) for (const [k, v] of Object.entries(o.asked)) if (typeof v === 'number') asked[k] = v
  return { counts, asked, runs: Array.isArray(o.runs) ? o.runs.filter((x): x is string => typeof x === 'string').slice(-RUNS_MAX) : [] }
}

// A stop by the person is no verdict on the model.
export function outcomeOf(t: Task): Outcome | undefined {
  if (t.state === 'done') return t.check === 'failed' ? 'f' : 'p'
  if (t.state === 'failed' && t.why !== 'stopped') return 'f'
  return undefined
}

export function addRun(o: Outcomes, run: Run): Outcomes {
  if (o.runs.includes(run.id)) return o
  const counts = { ...o.counts }
  for (const t of run.tasks) {
    const v = outcomeOf(t)
    const fam = t.ran === undefined ? undefined : familyIn(t.ran)
    if (v === undefined || fam === undefined) continue
    const k = outcomeKey(t.role, fam)
    const c = counts[k] ?? { last: '', pass: 0, fail: 0 }
    counts[k] = { last: `${c.last}${v}`.slice(-LAST_MAX), pass: c.pass + (v === 'p' ? 1 : 0), fail: c.fail + (v === 'f' ? 1 : 0) }
  }
  return { ...o, counts, runs: [...o.runs, run.id].slice(-RUNS_MAX) }
}

export type ModelOffer = { role: Role; from: Family; to: Family; passed: number; of: number }
export const MODEL_FAILS = 3
const MODEL_LAST = 5

export function modelOffer(o: Outcomes, roleModels: Partial<Record<Role, string>>, now: number): ModelOffer | undefined {
  for (const role of ROLE_NAMES) {
    const from = familyIn(roleModels[role] ?? ROLES[role].model)
    const to = from === undefined ? undefined : stepUp(from)
    if (from === undefined || to === undefined) continue
    const asked = o.asked[role]
    if (asked !== undefined && now - asked < MODEL_QUIET_MS) continue
    const last = (o.counts[outcomeKey(role, from)]?.last ?? '').slice(-MODEL_LAST)
    const fails = [...last].filter(x => x === 'f').length
    if (fails >= MODEL_FAILS) return { role, from, to, passed: last.length - fails, of: last.length }
  }
  return undefined
}
export const askedModel = (o: Outcomes, role: Role, now: number): Outcomes => ({ ...o, asked: { ...o.asked, [role]: now } })

const familyLabel = (f: Family): string => MODEL_OPTIONS.find(m => m.value === f)?.label ?? f
export const MODEL_LINE = '{role} on {from} passed {passed} of {of}. Use {to} for {roles}?'
export const MODEL_USE = 'Use {to} for {roles}'
const ROLE_PLURAL: Record<Role, string> = { researcher: 'researchers', builder: 'builders', reviewer: 'reviewers', fixer: 'fixers' }
export const modelVars = (m: ModelOffer): Record<string, string | number> => ({ role: ROLES[m.role].label, from: familyLabel(m.from), to: familyLabel(m.to), passed: m.passed, of: m.of, roles: ROLE_PLURAL[m.role] })

// ---- what the pane and the hooks share, kept in memory only

export type RuleOffer = { rule: Rule; root: string }
export const teachMem: { offer?: RuleOffer; model?: ModelOffer } = {}

export function rulesListText(rules: readonly string[], offer: RuleOffer | undefined): string {
  const head = rules.length === 0 ? tr('No rules saved from vaken yet in this project.') : fillIn(tr("Rules you saved in vaken ({n}), in this project's CLAUDE.md:"), { n: rules.length })
  const lines = rules.map((r, k) => `  ${k + 1}. ${r}`)
  const tail = [
    ...(rules.length === 0 ? [] : [tr('Remove one: /vaken-memory rules remove <number>')]),
    ...(offer === undefined ? [] : [fillIn(tr('Waiting for your yes: {line}'), { line: offer.rule.line }), tr('Save it: /vaken-memory rules save')]),
  ]
  return [head, ...lines, ...tail].join('\n')
}

export const TEACH_WORDS: string[] = [TEACH_LABEL, TEACH_NOTE, TEACH_OPT_OFFER, TEACH_HELP_TITLE, TEACH_HELP_TEXT, TEACH_TITLE, TEACH_ASK, TEACH_LINE, TEACH_SAVE, TEACH_LATER, TEACH_HEAD, TEACH_SAVED, TEACH_NOT_SAVED, TEACH_TOAST, TEACH_WHAT, TEACH_REMOVED_WHAT, MODEL_LINE, MODEL_USE]
