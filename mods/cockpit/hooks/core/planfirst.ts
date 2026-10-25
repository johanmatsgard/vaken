// Nudges to plan first when a big task starts with few edits. A message is big when it is long or names two or more big verbs. The message itself is never stored.
import { isPersonMessage } from './proof'
import { trFill } from './lang'
import type { HelpEntry } from './registry'
import type { Setting } from './settings'

export const PLANFIRST_SETTINGS: Setting[] = [
  {
    key: 'plan.first',
    group: 'Autopilot',
    label: 'Plan first',
    note: 'Suggests or asks for a short plan before a big task.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'suggest', label: 'Suggest' },
      { value: 'ask', label: 'Ask' },
    ],
    default: 'suggest',
  },
]
export const PLANFIRST_HELP: HelpEntry[] = [
  { title: 'What plan first does', text: 'Before a big task, vaken can suggest a short plan (Suggest), or tell Claude to write one and wait for your yes (Ask). A plan is cheaper than a redo. It acts only while few files have changed.' },
]

export const PLAN_SUGGEST_WHAT = 'Suggested a plan first'
export const PLAN_ASK_WHAT = 'Asked Claude for a plan first'
export const PLAN_BAND_SUGGEST = 'Big task. A plan first is cheaper than a redo.'
export const PLAN_BAND_ASK = 'Asked Claude to plan first.'
export const PLAN_BAND_ID = 'planfirst'
export const PLAN_SUGGEST_TTL_MS = 10 * 60_000
// en-only: a note to Claude
export const PLAN_NOTE = 'Vaken note: this is a big task. Write a short plan (5 lines at most) and wait for a yes before you change files.'
const PLAN_LONG_WORDS = 40
const PLAN_VERBS_NEEDED = 2
const PLAN_MAX_EDITS = 3
export const PLAN_GAP_MS = 30 * 60_000

const VERBS: RegExp[] = [/\bbuild(?:s|ing)?\b/i, /\bimplement(?:s|ing)?\b/i, /\brefactor(?:s|ing)?\b/i, /\bmigrat(?:e|es|ing)\b/i, /\bredesign(?:s|ing)?\b/i, /\badd(?:s|ing)? support\b/i, /\brewrit(?:e|es|ing)\b/i]
const PLANNING = /\b(?:plan\w*|first propose|propose first|outline)\b/i

export function bigTask(text: string): { big: boolean; why: string } {
  if (PLANNING.test(text)) return { big: false, why: 'The message already asks for a plan.' }
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  if (words >= PLAN_LONG_WORDS) return { big: true, why: `The message is long (${words} words).` }
  const verbs = VERBS.filter(v => v.test(text)).length
  if (verbs >= PLAN_VERBS_NEEDED) return { big: true, why: `The message names ${verbs} big steps.` }
  return { big: false, why: 'The message does not look like a big task.' }
}

type PlanState = { at?: number; last?: { at: number; why: string } }
export const planKey = (sessionId: string): string => `cockpit:planfirst:${sessionId}`
export function readPlan(v: unknown): PlanState {
  if (typeof v !== 'object' || v === null) return {}
  const o = v as PlanState
  return { ...(typeof o.at === 'number' ? { at: o.at } : {}), ...(typeof o.last === 'object' && o.last !== null && typeof o.last.why === 'string' ? { last: o.last } : {}) }
}

type PlanFacts = { mode: string; text: string; origin?: { kind?: string }; edits: number; now: number; state: PlanState }
type PlanVerdict = { act: 'none' | 'suggest' | 'ask'; why: string; record: boolean }

// `record` is false when the message is not judged (off, or a command).
export function judgePlan(f: PlanFacts): PlanVerdict {
  const no = (why: string, record = true): PlanVerdict => ({ act: 'none', why, record })
  if (f.mode !== 'suggest' && f.mode !== 'ask') return no('Plan first is off. Turn it on: Settings > Prompts and memory.', false)
  if (!isPersonMessage(f.text, f.origin)) return no('That was a command, not a message, so nothing was checked.', false)
  const b = bigTask(f.text)
  if (!b.big) return no(b.why)
  if (f.edits >= PLAN_MAX_EDITS) return no(`This looks like a big task, but the session already made ${f.edits} edits. A plan would come late.`)
  if (f.state.at !== undefined && f.now - f.state.at < PLAN_GAP_MS) return no('This looks like a big task, but a plan was suggested less than 30 minutes ago.')
  return { act: f.mode === 'ask' ? 'ask' : 'suggest', why: `${b.why} Few files changed so far (${f.edits}). ${f.mode === 'ask' ? 'Claude was asked to write a plan first.' : 'A plan was suggested above the chat box.'}`, record: true }
}

export function advancePlan(state: PlanState, v: PlanVerdict, now: number): PlanState {
  return { ...(v.act !== 'none' ? { at: now } : state.at === undefined ? {} : { at: state.at }), last: { at: now, why: v.why } }
}

export function planLine(mode: string, state: PlanState): string {
  if (mode !== 'suggest' && mode !== 'ask') return trFill('Plan first: off. Turn it on: Settings > Prompts and memory.')
  // The reason was stored in English: it is said here, a sentence at a time
  return trFill(`Plan first: ${mode === 'ask' ? 'ask' : 'suggest'}. ${state.last === undefined ? 'No message checked yet.' : state.last.why}`)
}
