// The narrow I/O shared code uses. The validator follows `$` only inside the file that receives it, so shared code takes closures.
import type { EngineInterface } from 'claude-code'
import { trFill } from '../i18n/t'
import { FOCUS_KEY, isFocused, parseFocus, passesFocus } from './focus'
import { noteRun, noteWrite } from './selfcost'

export type Io = {
  now: () => Promise<number>
  home: () => Promise<string>
  sessionId: () => Promise<string>
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<void>
  del: (key: string) => Promise<void>
  keys: () => Promise<string[]>
  read: (path: string) => Promise<string>
  write: (path: string, text: string) => Promise<void>
  run: EngineInterface['process']['run']
  ask: (question: string, options: string[]) => Promise<string>
  complete: EngineInterface['model']['complete']
  // `urgent` toasts always show; others count against the hourly cap.
  toast: (text: string, urgent?: boolean) => void
  invalidate: () => void
  // The store without this project's settings laid over it.
  getGlobal?: (key: string) => Promise<unknown>
  // Each key as `get` gives it, same order.
  getMany?: (keys: readonly string[]) => Promise<unknown[]>
  getGlobalMany?: (keys: readonly string[]) => Promise<unknown[]>
}

// Store keys keep the old product name so saved data survives the rename.
export const SETTING_PREFIX = 'cockpit:setting:'
export const PROJECT_OF_KEY = (sessionId: string): string => `cockpit:projectof:${sessionId}`
const PROJSET_PREFIX = 'cockpit:projset:'
export const PROJSET_KEY = (root: string): string => `${PROJSET_PREFIX}${root}`
// Means 'this row's default, not a choice', so the Guard does not take it for an explicit pick.
export const USE_DEFAULT = 'use-default'
// Only this session writes it, so it is read once per session and after its own write.
export const SESSSET_PREFIX = 'cockpit:sessset:'
export const SESSSET_KEY = (sessionId: string): string => `${SESSSET_PREFIX}${sessionId}`

// At most TOAST_DEFAULT_CAP ordinary toasts an hour across sessions; urgent ones always show. Held-back text is still in the band and ledger.
export const TOAST_LOG_KEY = 'cockpit:toasts'
export const TOAST_DEFAULT_CAP = 6
export const TOAST_WINDOW_MS = 60 * 60_000

export function toastVerdict(raw: unknown, now: number, cap: number = TOAST_DEFAULT_CAP): { show: boolean; stamps: number[] } {
  const recent = (Array.isArray(raw) ? raw : []).filter((t): t is number => typeof t === 'number' && now - t < TOAST_WINDOW_MS && t <= now)
  return recent.length >= cap ? { show: false, stamps: recent } : { show: true, stamps: [...recent, now] }
}

// The same ordinary toast shows at most once an hour; the band and ledger keep the count.
const TOAST_SEEN_KEY = 'cockpit:toasts:seen'
const TOAST_SEEN_KEEP = 50
const toastShape = (text: string): string => text.replace(/\d+([.,]\d+)?/g, '#').slice(0, 80)

export function repeatVerdict(raw: unknown, now: number, text: string): { show: boolean; seen: Record<string, number> } {
  const seen: Record<string, number> = {}
  if (typeof raw === 'object' && raw !== null) for (const [k, t] of Object.entries(raw)) if (typeof t === 'number' && now - t < TOAST_WINDOW_MS && t <= now) seen[k] = t
  const shape = toastShape(text)
  if (seen[shape] !== undefined) return { show: false, seen }
  seen[shape] = now
  const keep = Object.entries(seen).sort((x, y) => y[1] - x[1]).slice(0, TOAST_SEEN_KEEP)
  return { show: true, seen: Object.fromEntries(keep) }
}

// Settings and pane choices are read on almost every step but rarely written, so each group is also kept as one bundle key. A write also goes to the small key beside it, which older copies and tests read.
export const SETTINGS_KEY = 'cockpit:settings:v1'
const PREFS_KEY = 'cockpit:prefs:v1'
export const BUNDLE_TTL_MS = 3_000
const PREF_PREFIX = 'cockpit:pref:'
const PREF_KEYS = ['cockpit:firstrun', 'cockpit:layouts', 'cockpit:quiet:asked', 'cockpit:runner:templates']
type Bundle = { key: string; has: (key: string) => boolean; name: (key: string) => string }
const BUNDLES: Bundle[] = [
  { key: SETTINGS_KEY, has: k => k.startsWith(SETTING_PREFIX), name: k => k.slice(SETTING_PREFIX.length) },
  { key: PREFS_KEY, has: k => k.startsWith(PREF_PREFIX) || PREF_KEYS.includes(k), name: k => k },
]
const bundleOf = (key: string): Bundle | undefined => BUNDLES.find(b => b.has(key))

type Obj = Record<string, unknown>
const asObj = (raw: unknown): Obj | undefined => (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Obj) : undefined)
// Callers get a copy so a change cannot leak into the held value.
const copy = (v: unknown): unknown => (typeof v === 'object' && v !== null ? JSON.parse(JSON.stringify(v)) : v)

const held = new Map<string, { at: number; value: Promise<Obj | undefined> }>()
let shared: { sessionId: string; at: number; root: string | undefined; set: Promise<Obj | undefined> } | undefined
let ownSet: { sessionId: string; set: Promise<Obj | undefined> } | undefined
export const forgetProjectSet = (): void => {
  shared = undefined
  ownSet = undefined
}
export const forgetBundles = (): void => {
  held.clear()
  shared = undefined
  ownSet = undefined
}

// Writes to one bundle wait for each other so two changes at once both stay.
let writing: Promise<unknown> = Promise.resolve()
const inTurn = <T>(work: () => Promise<T>): Promise<T> => {
  const run = writing.then(work, work)
  writing = run.catch(() => undefined)
  return run
}

async function gather(get: (key: string) => Promise<unknown>, b: Bundle, keys: string[]): Promise<Obj> {
  const out: Obj = {}
  for (const k of keys) if (b.has(k)) {
    const v = await get(k)
    if (v !== undefined) out[b.name(k)] = v
  }
  return out
}

// Never throws.
export async function ensureBundles(i: Io): Promise<void> {
  try {
    const get = i.getGlobal ?? i.get
    let keys: string[] | undefined
    for (const b of BUNDLES) {
      if (asObj(await get(b.key)) !== undefined) continue
      keys ??= await i.keys()
      await i.set(b.key, await gather(get, b, keys))
    }
  } catch {
  }
}

// While a full view (Help, Settings, Arrange, a guide) is open an ordinary toast is held so it does not cover the list; urgent ones show at once. At most HOLD_MAX wait, none longer than HOLD_MS.
export const toastHold: { on: () => boolean; held: { text: string; at: number }[]; show: ((text: string) => void) | undefined } = { on: () => false, held: [], show: undefined }
export const HOLD_MAX = 3
export const HOLD_MS = 3 * 60_000
export function holdToast(text: string, now: number): boolean {
  if (!toastHold.on()) return false
  if (!toastHold.held.some(h => h.text === text)) toastHold.held = [...toastHold.held, { text, at: now }].slice(-HOLD_MAX)
  return true
}
export function releaseHeldToasts(now: number = Date.now()): void {
  if (toastHold.held.length === 0 || toastHold.show === undefined) return
  const open = toastHold.on()
  const out = toastHold.held.filter(h => !open || now - h.at >= HOLD_MS)
  if (out.length === 0) return
  toastHold.held = toastHold.held.filter(h => !out.includes(h))
  for (const h of out) toastHold.show(h.text)
}

// A toast waits for the one before it so two cannot both pass the cap. Across sessions it may pass by one.
let toasting: Promise<void> = Promise.resolve()

// A failed store read shows the toast: the gate must never hide something by accident.
export function withToastGate(given: Io): Io {
  // Counted for the Computer card's own-cost line; in memory, no store key.
  const base: Io = {
    ...given,
    set: (key, value) => {
      noteWrite()
      return given.set(key, value)
    },
    del: key => {
      noteWrite()
      return given.del(key)
    },
    run: (argv, init) => {
      noteRun()
      return given.run(argv, init)
    },
  }
  // Read at most once per step.
  let clockAt: Promise<number> | undefined
  let uses = 0
  const clock = (): Promise<number> => {
    if (clockAt === undefined || uses >= 32) {
      clockAt = base.now()
      uses = 0
    }
    uses += 1
    return clockAt
  }
  let gathered: { key: string; stamp: Promise<number>; value: Promise<Obj> } | undefined
  const fresh = (at: number, now: number): boolean => now - at >= 0 && now - at < BUNDLE_TTL_MS

  const bundle = async (b: Bundle): Promise<Obj | undefined> => {
    const now = await clock()
    const h = held.get(b.key)
    if (h !== undefined && fresh(h.at, now)) return h.value
    const value = base.get(b.key).then(asObj)
    const entry = { at: now, value }
    held.set(b.key, entry)
    value.catch(() => {
      if (held.get(b.key) === entry) held.delete(b.key)
    })
    return value
  }

  const projectSet = async (): Promise<Obj | undefined> => {
    try {
      const now = await clock()
      if (shared !== undefined && fresh(shared.at, now)) return await shared.set
      const sessionId = await base.sessionId()
      const known = shared !== undefined && shared.sessionId === sessionId ? shared : undefined
      const rootRead = known !== undefined ? Promise.resolve(known.root) : base.get(PROJECT_OF_KEY(sessionId)).then(r => (typeof r === 'string' && r !== '' ? r : undefined))
      const root = await rootRead
      const set = root === undefined ? Promise.resolve(undefined) : base.get(PROJSET_KEY(root)).then(asObj)
      shared = { sessionId, at: now, root, set }
      return await set
    } catch {
      shared = undefined
      return undefined
    }
  }

  // The session id comes from the project read just before, so this adds no call.
  const sessionSet = async (): Promise<Obj | undefined> => {
    try {
      const sessionId = shared?.sessionId ?? (await base.sessionId())
      if (ownSet === undefined || ownSet.sessionId !== sessionId) {
        const set = base.get(SESSSET_KEY(sessionId)).then(asObj)
        const entry = { sessionId, set }
        ownSet = entry
        set.catch(() => {
          if (ownSet === entry) ownSet = undefined
        })
      }
      return await ownSet.set
    } catch {
      ownSet = undefined
      return undefined
    }
  }

  const globalOf = async (key: string, b: Bundle): Promise<unknown> => {
    const all = await bundle(b)
    if (all !== undefined) return copy(all[b.name(key)])
    // With no bundle yet, gather the small keys once per step; a new step or any write gathers again.
    const stamp = clockAt
    if (stamp === undefined) return base.get(key)
    if (gathered === undefined || gathered.key !== b.key || gathered.stamp !== stamp) gathered = { key: b.key, stamp, value: base.keys().then(keys => gather(base.get, b, keys)) }
    return copy((await gathered.value)[b.name(key)])
  }
  const read = async (key: string): Promise<unknown> => {
    const b = bundleOf(key)
    if (b === undefined) return base.get(key)
    if (b.key === SETTINGS_KEY) {
      const name = b.name(key)
      const own = (await projectSet())?.[name]
      const mine = (await sessionSet())?.[name]
      if (typeof mine === 'string') return mine
      if (typeof own === 'string') return own
    }
    return globalOf(key, b)
  }

  // Small key first, then the bundle as stored now, so another session's change is kept.
  const change = (key: string, b: Bundle, value: unknown, isDelete: boolean): Promise<void> =>
    inTurn(async () => {
      gathered = undefined
      if (isDelete) await base.del(key)
      else await base.set(key, value)
      const now = await base.now()
      const all = asObj(await base.get(b.key)) ?? (await gather(base.get, b, await base.keys()))
      if (isDelete) delete all[b.name(key)]
      else all[b.name(key)] = copy(value)
      await base.set(b.key, all)
      held.set(b.key, { at: now, value: Promise.resolve(all) })
    })
  const forgetFor = (key: string): void => {
    if (key === SETTINGS_KEY || key === PREFS_KEY) held.delete(key)
    if (key.startsWith(PROJSET_PREFIX) || key.startsWith('cockpit:projectof:')) shared = undefined
    if (key.startsWith(SESSSET_PREFIX)) ownSet = undefined
  }

  const getGlobal = async (key: string): Promise<unknown> => {
    const b = bundleOf(key)
    if (b !== undefined) return globalOf(key, b)
    if (shared !== undefined && key === PROJECT_OF_KEY(shared.sessionId) && fresh(shared.at, await clock())) return shared.root
    return base.get(key)
  }

  return {
    ...base,
    now: () => {
      const t = base.now()
      clockAt = t
      uses = 0
      return t
    },
    get: read,
    getMany: async keys => {
      const out: unknown[] = []
      let layers: { own: Obj | undefined; mine: Obj | undefined } | undefined
      const alls = new Map<string, Obj | undefined>()
      for (const key of keys) {
        const b = bundleOf(key)
        if (b === undefined || b.key !== SETTINGS_KEY) {
          out.push(await read(key))
          continue
        }
        layers ??= { own: await projectSet(), mine: await sessionSet() }
        const name = b.name(key)
        const mine = layers.mine?.[name]
        const own = layers.own?.[name]
        if (typeof mine === 'string') out.push(mine)
        else if (typeof own === 'string') out.push(own)
        else {
          if (!alls.has(b.key)) alls.set(b.key, await bundle(b))
          const all = alls.get(b.key)
          out.push(all !== undefined ? copy(all[name]) : await globalOf(key, b))
        }
      }
      return out
    },
    getGlobalMany: async keys => {
      const out: unknown[] = []
      const alls = new Map<string, Obj | undefined>()
      for (const key of keys) {
        const b = bundleOf(key)
        if (b === undefined) {
          out.push(await getGlobal(key))
          continue
        }
        if (!alls.has(b.key)) alls.set(b.key, await bundle(b))
        const all = alls.get(b.key)
        out.push(all !== undefined ? copy(all[b.name(key)]) : await globalOf(key, b))
      }
      return out
    },
    set: async (key, value) => {
      const b = bundleOf(key)
      if (b !== undefined) return change(key, b, value, false)
      forgetFor(key)
      await base.set(key, value)
    },
    del: async key => {
      const b = bundleOf(key)
      if (b !== undefined) return change(key, b, undefined, true)
      forgetFor(key)
      await base.del(key)
    },
    getGlobal,
    toast: (text, urgent) => {
      if (urgent === true) {
        base.toast(trFill(text))
        return
      }
      const run = async (): Promise<void> => {
        try {
          const now = await base.now()
          // An ordinary toast is held during focus unless it says a session needs you.
          if (!passesFocus(text) && isFocused(parseFocus(await base.get(FOCUS_KEY)), now)) return
          const [seenRaw, logRaw] = await Promise.all([base.get(TOAST_SEEN_KEY), base.get(TOAST_LOG_KEY)])
          const r = repeatVerdict(seenRaw, now, text)
          if (!r.show) return
          const v = toastVerdict(logRaw, now)
          await Promise.all([base.set(TOAST_SEEN_KEY, r.seen), base.set(TOAST_LOG_KEY, v.stamps)])
          if (!v.show) return
        } catch {
        }
        if (holdToast(text, Date.now())) {
          toastHold.show = t => base.toast(trFill(t))
          return
        }
        base.toast(trFill(text))
      }
      toasting = toasting.then(run, run)
    },
  }
}
