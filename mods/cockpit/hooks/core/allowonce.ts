// One "allow once" queue shared by the guard blocks; the yes is bound to the held step and to a hash of its input.
import type { Io } from './io'
import { ALLOW_TTL_MS, allowKey } from './guard'
import { sha256Hex } from './fileops'
import { runsCommand } from './tools'
import { shortStepOf } from './allowrules'

export const heldKey = (sid: string): string => `cockpit:guard:held:${sid}`
const HELD_KEYS_MAX = 20

// `words` and `input` hold short names and a hash, never file contents or the input itself.
type HeldStep = { at: number; step?: string; keys: string[]; words?: string; input?: string }
const HELD_WORDS_MAX = 160
type AllowOnce = { at: number; keys?: string[]; usedBy?: string; input?: string }

export type Step = { id?: string; call?: unknown }
type StepArg = Step | string | undefined
const idOf = (s: StepArg): string | undefined => (typeof s === 'string' ? s : s?.id)

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, HELD_KEYS_MAX) : [])
const live = (at: number, now: number): boolean => now >= at && now - at < ALLOW_TTL_MS

export function parseHeld(v: unknown): HeldStep | undefined {
  const o = v as HeldStep
  if (typeof o !== 'object' || o === null || typeof o.at !== 'number') return undefined
  return {
    at: o.at,
    ...(typeof o.step === 'string' ? { step: o.step } : {}),
    keys: strs(o.keys),
    ...(typeof o.words === 'string' ? { words: o.words.slice(0, HELD_WORDS_MAX) } : {}),
    ...(typeof o.input === 'string' ? { input: o.input } : {}),
  }
}

export function parseAllowOnce(v: unknown): AllowOnce | undefined {
  const o = v as AllowOnce
  if (typeof o !== 'object' || o === null || typeof o.at !== 'number') return undefined
  return { at: o.at, ...(Array.isArray(o.keys) ? { keys: strs(o.keys) } : {}), ...(typeof o.usedBy === 'string' ? { usedBy: o.usedBy } : {}), ...(typeof o.input === 'string' ? { input: o.input } : {}) }
}

const ENGINE_IDS = new Set(['tool_use_id', 'agentId'])
// For shell tools, fields that only describe the call or bound its time are left out: a retry may set them differently.
const COMMAND_NOTES = new Set(['description', 'timeout', 'timeout_ms'])
// Bounds the fallback hash so a huge input cannot stall a step.
const FALLBACK_MAX = 1_000_000

function stable(v: unknown, skip?: ReadonlySet<string>): string {
  if (Array.isArray(v)) return `[${v.map(x => stable(x)).join(',')}]`
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>
    const keys = Object.keys(o)
      .filter(k => skip === undefined || !skip.has(k))
      .sort()
    return `{${keys.map(k => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`
  }
  return JSON.stringify(v) ?? 'null'
}

function skipOf(call: unknown): ReadonlySet<string> {
  const tool = (call as { tool?: unknown } | undefined)?.tool
  return typeof tool === 'string' && runsCommand(tool) ? new Set([...ENGINE_IDS, ...COMMAND_NOTES]) : ENGINE_IDS
}

// FNV-1a, two 32-bit passes with different seeds, for runtimes without crypto.
function fnvPair(text: string): string {
  let a = 0x811c9dc5
  let b = 0x01000193 ^ text.length
  for (let k = 0; k < text.length; k += 1) {
    const c = text.charCodeAt(k)
    a = Math.imul(a ^ c, 0x01000193)
    b = Math.imul(b ^ c, 0x5bd1e995)
  }
  return `fnv:${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`
}

export async function inputHash(call: unknown): Promise<string> {
  const text = stable(call, skipOf(call))
  const sum = await sha256Hex(new TextEncoder().encode(text)).catch(() => undefined)
  return sum ?? fnvPair(text.slice(0, FALLBACK_MAX))
}
const hashOf = async (s: StepArg): Promise<string | undefined> => (typeof s === 'object' && s.call !== undefined ? inputHash(s.call) : undefined)

export function allowCovers(a: AllowOnce | undefined, step: string | undefined, keys: readonly string[], now: number, input?: string): boolean {
  if (a === undefined || !live(a.at, now)) return false
  if (a.usedBy !== undefined && a.usedBy !== step) return false
  if (a.input !== undefined && a.input !== input) return false
  if (a.keys === undefined) return true
  return keys.length > 0 && keys.every(k => a.keys?.includes(k) === true)
}

export function withHeld(old: HeldStep | undefined, step: string | undefined, keys: readonly string[], words: string, now: number, input?: string): HeldStep {
  const same = old !== undefined && step !== undefined && old.step === step && live(old.at, now)
  const all = same ? [...old.keys, ...keys.filter(k => !old.keys.includes(k))] : [...keys]
  const said = (same && old.words !== undefined && old.words !== words ? `${old.words} ${words}` : words).slice(0, HELD_WORDS_MAX)
  return { at: now, ...(step === undefined ? {} : { step }), keys: all.slice(0, HELD_KEYS_MAX), ...(said === '' ? {} : { words: said }), ...(input === undefined ? {} : { input }) }
}

export function allowFor(held: HeldStep | undefined, now: number): AllowOnce {
  return held !== undefined && live(held.at, now) && held.keys.length > 0 ? { at: now, keys: held.keys, ...(held.input === undefined ? {} : { input: held.input }) } : { at: now }
}

// One queue over all blocks, so two steps at the same moment cannot both use one yes.
let chain: Promise<unknown> = Promise.resolve()
function queued<T>(job: () => Promise<T>): Promise<T> {
  const p = chain.then(job)
  chain = p.catch(() => undefined)
  return p
}

// The open stop's masked short form lives in memory only and goes with the stop. `kept` holds the steps the person chose to keep stopped in this session.
type OpenStop = { sid: string; at: number; short?: string; input?: string }
export const stopMem: { open?: OpenStop; kept: Set<string> } = { kept: new Set() }

export function openShort(sid: string, now: number): string | undefined {
  const o = stopMem.open
  return o !== undefined && o.sid === sid && live(o.at, now) ? o.short : undefined
}
export function closeStop(sid: string): void {
  if (stopMem.open?.sid === sid) stopMem.open = undefined
}
export function keepOpenStop(sid: string): boolean {
  const o = stopMem.open
  if (o === undefined || o.sid !== sid || o.input === undefined) return false
  stopMem.kept.add(`${sid}|${o.input}`)
  stopMem.open = undefined
  return true
}
export async function isKeptStopped(sid: string, step: StepArg): Promise<boolean> {
  if (stopMem.kept.size === 0) return false
  const input = await hashOf(step)
  return input !== undefined && stopMem.kept.has(`${sid}|${input}`)
}
export const stopSignature = (): string => `${stopMem.open?.at ?? 0}:${stopMem.kept.size}`

export function noteHeld(i: Io, sid: string, step: StepArg, keys: readonly string[], words: string): Promise<void> {
  return queued(async () => {
    const input = await hashOf(step)
    const now = await i.now()
    const short = typeof step === 'object' ? shortStepOf(step.call) : undefined
    stopMem.open = { sid, at: now, ...(short === undefined ? {} : { short }), ...(input === undefined ? {} : { input }) }
    await i.set(heldKey(sid), withHeld(parseHeld(await i.get(heldKey(sid))), idOf(step), keys, words, now, input))
  })
}

export function grantAllow(i: Io, sid: string, onlyBound = false): Promise<{ set: boolean; bound: boolean; words?: string }> {
  return queued(async () => {
    const held = parseHeld(await i.get(heldKey(sid)))
    const a = allowFor(held, await i.now())
    if (onlyBound && a.keys === undefined) return { set: false, bound: false }
    await i.set(allowKey(sid), a)
    closeStop(sid)
    return a.keys === undefined ? { set: true, bound: false } : { set: true, bound: true, ...(held?.words === undefined ? {} : { words: held.words }) }
  })
}

// A call with no id (a test, an old engine) uses the yes up at once.
export function takeAllow(i: Io, sid: string, step: StepArg, keys: readonly string[]): Promise<boolean> {
  return queued(async () => {
    const a = parseAllowOnce(await i.get(allowKey(sid)))
    if (a === undefined) return false
    const now = await i.now()
    if (!live(a.at, now)) {
      await i.del(allowKey(sid))
      return false
    }
    const id = idOf(step)
    if (!allowCovers(a, id, keys, now, a.input === undefined ? undefined : await hashOf(step))) return false
    if (id === undefined) await i.del(allowKey(sid))
    else if (a.usedBy === undefined) await i.set(allowKey(sid), { ...a, usedBy: id })
    return true
  })
}

export const stepOf = (e: unknown): Step => {
  const id = (e as { tool_use_id?: unknown } | undefined)?.tool_use_id
  return typeof id === 'string' && id !== '' ? { id, call: e } : { call: e }
}

export function heldOpen(held: HeldStep | undefined, allow: AllowOnce | undefined, now: number): HeldStep | undefined {
  if (held === undefined || !live(held.at, now)) return undefined
  if (allow !== undefined && allow.at >= held.at) return undefined
  return held
}

export const KEPT_STOPPED_REASON = 'The person chose to keep this exact step stopped in this session. Do not try it again or look for another way around it. Ask the person what to do instead.' // en-only: text for Claude, not shown in the pane
