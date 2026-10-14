import { fmt } from './fmt'
import { tr } from './lang'
import { tEn } from '../i18n/t'
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

export const nudgeText = (tool: string, n: number): string =>
  `Vaken saw this ${tool} step fail ${n} times in a row with the same error. Do not run it again unchanged. Say what you think is wrong, then ask the person how to go on.`

export const stopReason = (tool: string, n: number): string =>
  `Vaken stopped this ${tool} step: it failed ${n} times in a row with the same error. Do not try it again. Tell the person what failed and ask what to do. Their next message lifts the stop.`

export const toastText = (tool: string, n: number, mode: string): string => `${tr('{tool} failed {n} times in a row, the same way.').replace('{tool}', tool).replace('{n}', String(n))} ${mode === 'stop' ? tr('The next try is stopped.') : tr('Claude was told to stop and ask you.')}`

export const caughtDetail = (tool: string, n: number, mode: string): string => `${tool} failed ${n} times in a row, the same way. ${mode === 'stop' ? 'The next try is stopped.' : 'Claude was told to stop and ask you.'}`
export const blockedDetail = (tool: string): string => `Stopped another ${tool} try. It waits for your next message.`

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
  `Vaken saw ${file} edited ${edits} times in ${tEn('words.minute', { n: minutes })} while steps kept failing in between. You may be going round in circles. Stop and say what you think is wrong. If the cause is not clear, ask the person.`

export const thrashDetail = (file: string, edits: number, minutes: number): string => `Going round in circles on ${file}: ${edits} edits in ${minutes} min while steps kept failing.`
