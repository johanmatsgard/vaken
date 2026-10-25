import { fmt } from './fmt'
import { tr } from './lang'
import { tEn } from '../i18n/t'
import { checksIn, kindWord } from './proof'
import type { ProofKind } from './proof'
import { stepUp } from './models'
import type { Family } from './models'
// Spots the same step failing the same way again and again, and in Stop mode refuses the next try. Steps and errors are kept as short hashes, never text.

// A guess to tune.
export const LOOP_FAILS = 3
export const LOOP_WHAT = 'Caught a repeating step'
export const BLOCK_WHAT = 'Blocked the same step again'
const TRACK_MAX = 40

export type Seen = Map<string, { fails: number; err: string }>

const hash = (s: string): string => {
  let h = 0x811c9dc5
  for (let n = 0; n < s.length; n += 1) {
    h ^= s.charCodeAt(n)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

const stable = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return `{${Object.keys(o)
      .sort()
      .map(k => `${JSON.stringify(k)}:${stable(o[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(v) ?? 'null'
}

// A `description` changes on every try, so it does not make a step different.
export const stepKey = (agent: string | undefined, tool: string, args: unknown): string => {
  const { description: _label, ...rest } = (args ?? {}) as Record<string, unknown>
  return `${agent ?? 'main'}|${tool}|${hash(stable(rest))}`
}

// Numbers and spacing ignored, so a changing line number does not hide a repeat.
export const errKey = (text: string): string => hash(text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().slice(0, 300))

export type Verdict = { block: false } | { block: true; reason: string }

export function beforeCall(seen: Seen, key: string, tool: string, mode: string): Verdict {
  const s = seen.get(key)
  if (mode !== 'stop' || s === undefined || s.fails < LOOP_FAILS) return { block: false }
  return { block: true, reason: stopReason(tool, s.fails) }
}

// `tripped` is true once, at the failure that reaches LOOP_FAILS; `nudge` stays true after it.
export function afterCall(seen: Seen, key: string, failed: boolean, err: string): { tripped: boolean; nudge: boolean; fails: number } {
  if (!failed) {
    seen.delete(key)
    return { tripped: false, nudge: false, fails: 0 }
  }
  const old = seen.get(key)
  const fails = old !== undefined && old.err === err ? old.fails + 1 : 1
  seen.delete(key)
  seen.set(key, { fails, err })
  while (seen.size > TRACK_MAX) {
    const first = seen.keys().next()
    if (first.done === true) break
    seen.delete(first.value)
  }
  return { tripped: fails === LOOP_FAILS, nudge: fails >= LOOP_FAILS, fails }
}

// A file edit that worked changes what the next try runs against, so earlier failures no longer make a repeat. A step already stopped stays stopped until the person writes.
export function afterEdit(seen: Seen): void {
  for (const [k, v] of [...seen]) if (v.fails < LOOP_FAILS) seen.delete(k)
}

export const nudgeText = (tool: string, n: number): string =>
  `Vaken saw this ${tool} step fail ${n} times in a row with the same error. Do not run it again unchanged. Say in one line what you think is wrong, then try another way. Ask the person only if you see no other way.`

export const stopReason = (tool: string, n: number): string =>
  `Vaken stopped this ${tool} step: it failed ${n} times in a row with the same error. Do not try it again. Tell the person what failed and ask what to do. Their next message lifts the stop.`

export const toastText = (tool: string, n: number, mode: string): string => `${tr('{tool} failed {n} times in a row, the same way.').replace('{tool}', tool).replace('{n}', String(n))} ${mode === 'stop' ? tr('The next try is stopped.') : tr('Claude was told to stop and ask you.')}`

export const caughtDetail = (tool: string, n: number, mode: string): string => `${tool} failed ${n} times in a row, the same way. ${mode === 'stop' ? 'The next try is stopped.' : 'Claude was told to stop and ask you.'}` // en-only: a stored ledger detail
export const blockedDetail = (tool: string): string => `Stopped another ${tool} try. It waits for your next message.` // en-only: a stored ledger detail

// A softer watch: the same file edited again and again while steps keep failing. It only notes and never refuses an edit, because refusing a valid edit is too strong.

export const THRASH_WHAT = 'Going round in circles'
export const THRASH_EDITS = 5
export const THRASH_WINDOW_MS = 10 * 60_000
// 3 of 4 gaps: 'keep happening', not one bad moment.
const THRASH_GAPS = 3
export const THRASH_QUIET_MS = 30 * 60_000
const THRASH_FILES = 20

type Thrash = { fails: number; files: Map<string, { at: number; fails: number }[]>; noted: Map<string, number> }
export const newThrash = (): Thrash => ({ fails: 0, files: new Map(), noted: new Map() })

export function thrashFailure(t: Thrash): void {
  t.fails += 1
}

export function thrashClear(t: Thrash): void {
  t.files.clear()
}

const capMap = <V>(m: Map<string, V>, max: number): void => {
  while (m.size > max) {
    const first = m.keys().next()
    if (first.done === true) break
    m.delete(first.value)
  }
}

export function thrashEdit(t: Thrash, file: string, at: number): { edits: number; minutes: number } | undefined {
  const mine = [...(t.files.get(file) ?? []).filter(x => at - x.at <= THRASH_WINDOW_MS), { at, fails: t.fails }].slice(-THRASH_EDITS)
  t.files.delete(file)
  t.files.set(file, mine)
  capMap(t.files, THRASH_FILES)
  if (mine.length < THRASH_EDITS) return undefined
  const gaps = mine.slice(1).filter((x, n) => x.fails > (mine[n] as { fails: number }).fails).length
  if (gaps < THRASH_GAPS) return undefined
  const last = t.noted.get(file)
  if (last !== undefined && at - last < THRASH_QUIET_MS) return undefined
  t.noted.delete(file)
  t.noted.set(file, at)
  capMap(t.noted, THRASH_FILES)
  return { edits: mine.length, minutes: Math.max(1, Math.round((at - (mine[0] as { at: number }).at) / 60_000)) }
}

export const fileWord = (path: string): string => {
  const name = path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? path
  return fmt.middle(name, 40)
}

export const thrashNote = (file: string, edits: number, minutes: number): string =>
  `Vaken saw ${file} edited ${edits} times in ${tEn('words.minute', { n: minutes })} while steps kept failing in between. You may be going round in circles. Say in one line what you think is wrong, then try another way. Ask the person only if you see no other way.`

export const thrashDetail = (file: string, edits: number, minutes: number): string => `Going round in circles on ${file}: ${edits} edits in ${minutes} min while steps kept failing.` // en-only: a stored ledger detail

// The stuck ladder: the same check (tests, build, lint or the type check) failing 3 times in a row with the same error offers the person two ways out, a stronger
// agent once or a fresh start. Nothing runs before a press. A check is known by a hash of its shape (quoted text, paths and numbers left out), and its error by a
// hash of the error's shape (errKey), never by their text. The counts start again at the person's next message and after a quiet half hour.

export const LADDER_FAILS = 3
// An offer older than this leaves Needs you by itself; a check that has not failed for this long starts its count again.
export const STUCK_TTL_MS = 30 * 60_000
const LADDER_MAX = 20
const IDS_MAX = 40

// `up` is the model one step above the session's, when there is one: without it only the fresh start is offered.
export type StuckOffer = { kind: ProofKind; shape: string; fails: number; at: number; up?: Family }
export type Ladder = { fails: Map<string, { n: number; err: string; at: number }>; ids: string[] }
export const newLadder = (): Ladder => ({ fails: new Map(), ids: [] })
// The offer in memory, read by Needs you (features/home/needs.ts); a press or a pass of that check clears it.
export const stuckMem: { offer?: StuckOffer } = {}

const PATHISH = /[\\/.=:]/
export function checkShape(command: string): { shape: string; kind: ProofKind } | undefined {
  const hits = checksIn(command)
  const hit = hits.find(h => !h.hidden) ?? hits[0]
  if (hit === undefined) return undefined
  const words = command
    .replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""')
    .split(/\s+/)
    .filter(w => w !== '')
    .map(w => (PATHISH.test(w) && !w.startsWith('-') ? '_' : w.replace(/\d+/g, '#').toLowerCase()))
  return { shape: hash(`${hit.kind}|${words.join(' ')}`), kind: hit.kind }
}

// One failure is counted once: the named failure event and the tool call both see it, and the first one counts it.
export function firstSight(l: Ladder, id: string | undefined): boolean {
  if (id === undefined || id === '') return true
  if (l.ids.includes(id)) return false
  l.ids.push(id)
  if (l.ids.length > IDS_MAX) l.ids.shift()
  return true
}

// The offer, once, at the failure that reaches LADDER_FAILS with the same error (`err` is an errKey); later failures of the same check keep the one offer.
// Another error, or a half hour without a failure, starts the count again.
export function ladderFail(l: Ladder, command: string, at: number, err = ''): StuckOffer | undefined {
  const c = checkShape(command)
  if (c === undefined) return undefined
  const old = l.fails.get(c.shape)
  const same = old !== undefined && old.err === err && at - old.at >= 0 && at - old.at < STUCK_TTL_MS
  const fails = same ? old.n + 1 : 1
  l.fails.delete(c.shape)
  l.fails.set(c.shape, { n: fails, err, at })
  capMap(l.fails, LADDER_MAX)
  return fails === LADDER_FAILS ? { kind: c.kind, shape: c.shape, fails, at } : undefined
}

// The person wrote: every count starts again (the same rule as the repeating-step watch above).
// The person's next message: the counts start again and an offer not pressed is taken back (it was about what came before the message).
export function ladderClear(l: Ladder, mem: { offer?: StuckOffer } = stuckMem): void {
  l.fails.clear()
  mem.offer = undefined
}

// The offer's stronger model, from the session's own: none when the session already runs the top of the ladder, or its model is not known.
export const stronger = (sessionModel: string | undefined): Family | undefined => (sessionModel === undefined || sessionModel === '' ? undefined : stepUp(sessionModel))

// A pass of the check starts its count again and takes back its offer.
export function ladderPass(l: Ladder, command: string, mem: { offer?: StuckOffer } = stuckMem): boolean {
  const c = checkShape(command)
  if (c === undefined || !l.fails.has(c.shape)) return false
  l.fails.delete(c.shape)
  if (mem.offer?.shape !== c.shape) return false
  mem.offer = undefined
  return true
}

export const liveStuck = (o: StuckOffer | undefined, now: number): StuckOffer | undefined => (o !== undefined && now - o.at >= 0 && now - o.at < STUCK_TTL_MS ? o : undefined)

export const STUCK_HEAD = 'Stuck on a check'
export const STUCK_TITLE = '{check} failed 3 times in a row'
export const STUCK_MEANS = 'The same check failed 3 times in a row, with the same error. Claude keeps trying until you pick a way out. Nothing happens before you press.'
export const STUCK_NEXT = 'Try a stronger agent once asks Claude to give this fix to one agent on a stronger model. This session keeps its own model. Start fresh saves a short brief and copies one line for a new session, which runs the check and fixes the error there.'
// When the session already runs the strongest model it can step up to, only the fresh start is offered.
export const STUCK_NEXT_FRESH = 'Start fresh saves a short brief and copies one line for a new session, which runs the check and fixes the error there. There is no stronger model to hand it to.'
export const STUCK_STRONG = 'Try a stronger agent once'
export const STUCK_FRESH = 'Start fresh with only the error'
export const STUCK_TOAST = '{check} failed 3 times in a row. Two ways out wait in Needs you.'
export const STUCK_TOAST_FRESH = '{check} failed 3 times in a row. A way out waits in Needs you.'
export const STUCK_STRONG_SAID = 'Asked Claude to give the fix to a stronger agent.'
export const STUCK_QUEUED = 'Claude gets the request for a stronger agent at its next step.'
export const STUCK_WORDS: string[] = [STUCK_HEAD, STUCK_TITLE, STUCK_MEANS, STUCK_NEXT, STUCK_NEXT_FRESH, STUCK_STRONG, STUCK_FRESH, STUCK_TOAST, STUCK_TOAST_FRESH, STUCK_STRONG_SAID, STUCK_QUEUED]

const checkName = (k: ProofKind): string => (k === 'tests' ? 'the tests' : kindWord(k))
const cap = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
// Sent to Claude as the person's own message, so English by rule. A plugin cannot switch the main model, so the stronger try is one agent, on the model one step above the session's.
export const strongPrompt = (k: ProofKind, up: Family): string =>
  `${cap(checkName(k))} failed 3 times in a row. Do not try the same fix again. Start one agent with model "${up}" to find why and fix it, and give it only the failing command and its error. Then run ${checkName(k)} again and show me the result. Keep this session's model as it is.` // en-only: a prompt sent to Claude as the person
// The line the person pastes in a new session: the brief, then the one check to run there.
export const freshStuckLine = (briefLine: string, k: ProofKind): string => `${briefLine} Then run ${checkName(k)}, read only the error, fix it, and show me the result.` // en-only: a prompt the person pastes for Claude
