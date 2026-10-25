// The band arbiter: decides what shows in the band above the prompt. Pure functions plus two store helpers.
import type { Io } from './io'
import type { Vars } from '../i18n/types'
import { KEYED_VALUE_MAX, keyedOf, keyedOk, tEn } from '../i18n/t'
import { shownTitle } from './ledger'

// `fail`: something of vaken's own broke (the self-test): the failure mark and red, ranked as a warning
type BandLevel = 'urgent' | 'warn' | 'fail' | 'info'
// `key` and `vars` let the pane say a line in its language; an item without them is said from its English `text`.
export type BandItem = { id: string; level: BandLevel; text: string; at: number; ttlMs: number; key?: string; vars?: Vars }

export const bandKey = (sessionId: string): string => `cockpit:band:${sessionId}`
const BAND_TTL_MS: Record<BandLevel, number> = { urgent: 30 * 60_000, warn: 10 * 60_000, fail: 10 * 60_000, info: 2 * 60_000 }
export const BAND_KEEP = 8
const BAND_SHOW = 2
const RANK: Record<BandLevel, number> = { urgent: 0, warn: 1, fail: 1, info: 2 }
// An info line has no mark (a dot would only double the separator); a line the cockpit did for you has its tick.
// ◆ is Needs you's own mark (a real wait on the person, topLine); a posted urgent line ("May be stuck") is a warning, so it has ▲; a failure has ✗.
const MARK: Record<BandLevel, string> = { urgent: '▲', warn: '▲', fail: '✗', info: '' }
export const markOf = (x: BandItem): string => (x.level === 'info' && x.id.startsWith('did:') ? '✓' : MARK[x.level])
// The mark and its words as one string; no mark, no leading blank.
export const marked = (mark: string, words: string): string => (mark === '' ? words : `${mark} ${words}`)

// The pane cuts the line by real width, so stored text is cut only by this large cap.
export const BAND_MAX_CHARS = KEYED_VALUE_MAX
export const BAND_SHORT_CHARS = 60
export function shortText(text: string, max = BAND_MAX_CHARS): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const at = cut.lastIndexOf(' ')
  return `${(at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s.,;:·-]+$/, '')}…`
}

// The band is one row: a line that would be cut there says its short form, and the whole sentence stays in the band list (See all, Details).
// A kind with its own short words is named here; any other line keeps the clause before its colon ("Agent stopped: the computer is full" says "Agent stopped"),
// a clause inside the first sentence only; a line with neither says its first whole sentence (bandFirst)
export const BAND_SHORT: Readonly<Record<string, string>> = { guard: 'Risky step stopped', 'happened-risk': 'Risky step this answer' }
export function bandShort(id: string | undefined, words: string, t: (s: string) => string): string | undefined {
  const own = id === undefined ? undefined : (BAND_SHORT[id] ?? BAND_SHORT[id.split(':')[0]])
  if (own !== undefined) return t(own)
  const at = words.indexOf(': ')
  const head = at > 0 ? words.slice(0, at).trim() : ''
  return head.split(' ').length >= 2 && !head.includes('. ') ? head : bandFirst(words)
}
// A done line (✓) says its short form when the whole title would push the plan chip off a narrow band (288 pt): the title as the line says it, then its short words.
// Each short form is a row of the text table (area band), so a language says its own short words; a title not listed here keeps its whole words and the chip gives way.
export const DONE_SHORT: ReadonlyMap<string, string> = new Map([
  ['Caught a repeating step', 'Caught a repeat'],
  ['Stopped the same step again', 'Stopped a repeat'],
  ['Going round in circles', 'Going in circles'],
  ['Claude said done, but no check backs it', 'Done, unchecked'],
  ['Noticed work far from the goal', 'Work off the goal'],
  ['Spotted odd behaviour', 'Odd behaviour'],
  ['Stopped a risky command', 'Command stopped'],
  ['Shortened long output', 'Logs shortened'],
  ['Task run started', 'Run started'],
  ['Task run finished', 'Run finished'],
  ['Task run stopped by you', 'Run stopped'],
  ['Warned about a risky command', 'Warned: command'],
  ['Stopped an edit outside your folders', 'Stopped an edit'],
  ['Warned about an edit outside your folders', 'Warned: edit'],
  ['Stopped a package install', 'Stopped an install'],
  ['Warned about a package install', 'Warned: install'],
  ['Stopped a weakened test', 'Stopped weak test'],
  ['Warned about a weakened test', 'Warned: weak test'],
  ['Resumed after a pause', 'Pause lifted'],
  ['Stopped a step while paused', 'Stopped: paused'],
  ['Allowed the next stopped step', 'Allowed one step'],
  ['Let a stopped step through', 'Let a step through'],
  ['Dismissed a stopped step', 'Dismissed a step'],
  ['Stopped an action outside your computer', 'Stopped: outside'],
  ['Warned about a step outside your computer', 'Warned: outside'],
  ['Stopped a step that touches a secret', 'Stopped: secret'],
  ['Warned about a secret', 'Warned: secret'],
  ['Warned about a migration', 'Warned: migration'],
  ['Noted an env name nobody declared', 'Unknown env name'],
  ['Found an instruction hidden in outside text', 'Found hidden order'],
  ['Turned on away mode', 'Away mode on'],
  ['Turned off away mode', 'Away mode off'],
  ['Stopped a risky step while away', 'Stopped while away'],
  ['Ended away mode with a digest', 'Away ended: digest'],
  ['Offered a queued prompt', 'Prompt ready'],
  ['Stopped this session', 'Stopped session'],
  ['Sent a message to another session', 'Sent a message'],
  ['Restored files from a copy', 'Restored files'],
  ['Warned about the budget', 'Budget warning'],
  ['Stopped a call over budget', 'Stopped: budget'],
  ['Sent a lookup agent to a cheaper model', 'Cheaper model'],
  ['Warned before a model switch', 'Warned: new model'],
  ['Resumed after a limit', 'Resumed (limit)'],
  ['Paused a task run for the plan limit', 'Run paused: limit'],
  ['Went on with a task run after a limit reset', 'Run went on'],
  ['Reminded about a limit reset', 'Reset reminder'],
  ['Kept the session cheap', 'Kept it cheap'],
  ['Kept the session cheap: it paid', 'Kept cheap: it paid'],
  ['Keeper did not pay this time', 'Keeper did not pay'],
  ['Keeper could not read the cache', 'Cache unread'],
  ['Warned about too many agents', 'Too many agents'],
  ['Stopped an agent that went too deep', 'Stopped deep agent'],
  ['Stopped an agent: the request spent its limit', 'Stopped an agent'],
  ['Stopped an extra agent', 'Agent held back'],
  ['Noticed big instruction files', 'Big files noticed'],
  ['Ran a block from the answer', 'Ran a block'],
  ['Offered a skill for a repeated request', 'Offered a skill'],
  ['Caught a step that breaks a rule', 'Caught a rule break'],
  ['Noticed a plugin update', 'Plugin update seen'],
  ['Checked itself after an update', 'Self-checked'],
  ['Found something broken', 'Found a fault'],
  ['Wrote a session packet', 'Wrote a packet'],
  ['Changed the answer shape', 'Changed the shape'],
  ['Suggested a plan first', 'Suggested a plan'],
  ['Asked Claude for a plan first', 'Asked for a plan'],
  ['Suggested a fresh session', 'Fresh start tip'],
  ['Wrote a brief for a fresh session', 'Wrote a brief'],
  ['Warned about a file another session is editing', 'Warned: shared file'],
  ['Warned about a session in the same folder', 'Folder clash'],
  ['Warned about a port another session holds', 'Warned: shared port'],
  ['Stopped keeping the Mac awake: limit reached', 'Mac awake ended'],
  ['Took pictures of a page', 'Took page pictures'],
  ['Would have compacted now', 'Would compact now'],
  ['Risky commands and secrets stop again where Claude Code would not ask', 'Stops again in auto'],
  ['Paused all changes', 'Paused changes'],
  ['Stopped a migration', 'Stopped migration'],
  ['Named a checkpoint', 'Checkpoint named'],
  ['Keeper stopped', 'Keeper off'],
  ['Updated agent setup', 'Setup updated'],
  ['Compacted the session by itself', 'Auto-compacted'],
  ['Compacted the session', 'Compacted'],
  ['Compacted a session', 'Compacted'],
  ['Asked about compacting at good moments', 'Compact at breaks?'],
  ['Your mode follows the new modes after an update', 'Mode kept'],
  ['Started a night run', 'Night run started'],
  ['Ended a night run', 'Night run ended'],
  ['Checked the pull request from a typed command', 'Checked the PR'],
  ['Made a fix request for a failing check', 'Asked for a fix'],
  ['Merged a pull request from a typed command', 'Merged a PR'],
  ['Did not merge a pull request', 'Did not merge'],
  ['Saved a rule you repeated in CLAUDE.md', 'Saved a rule'],
  ['Removed a saved rule from CLAUDE.md', 'Removed a rule'],
  ['Kept your tips after an update', 'Tips kept'],
  ['Extended the budget', 'Budget raised'],
  ['Kept the Mac awake', 'Kept awake'],
  ['Wrote starter agents', 'Starter agents'],
])
// "Applied the Only alerts preset" says "Preset: Only alerts"; the name stays as it is
const APPLIED = /^Applied the (.+) preset$/
// The short forms of a done line, the fullest first (a long preset name falls back to "Preset applied")
export function doneShort(id: string | undefined, t: (s: string) => string): string[] {
  if (id === undefined || !id.startsWith('did:')) return []
  const title = shownTitle(id.slice(4))
  const own = DONE_SHORT.get(title)
  if (own !== undefined) return [t(own)]
  const preset = APPLIED.exec(title)
  return preset === null ? [] : [t('Preset: {name}').replace('{name}', () => preset[1] ?? ''), t('Preset applied')]
}

// The first whole sentence, without its full stop ("Back after 42 min"); none when the line is one sentence.
// A sentence ends at a full stop before a capital, so an abbreviation ("kl. 15:40") never ends one.
export function bandFirst(words: string): string | undefined {
  const first = words.split(/\. (?=\p{Lu})/u)[0]
  return first === undefined || first === words ? undefined : first
}

type BandTop = { mark: string; text: string; level: BandLevel; more: number; id?: string; key?: string; vars?: Vars }
export function topLine(needs: number, items: BandItem[], now: number): BandTop | undefined {
  const { shown, more } = arbitrate(items, now, BAND_KEEP)
  const lines = [...(needs > 0 ? [{ mark: '◆', text: `${tEn('words.session_needs', { n: needs })} you`, level: 'urgent' as BandLevel }] : []), ...shown.map(x => ({ mark: markOf(x), text: x.text, level: x.level, id: x.id, ...(x.key === undefined ? {} : { key: x.key }), ...(x.vars === undefined ? {} : { vars: x.vars }) }))]
  if (lines.length === 0) return undefined
  return { ...lines[0], more: lines.length - 1 + more }
}

const isItem = (v: unknown): v is BandItem => {
  const o = v as BandItem
  return typeof o === 'object' && o !== null && typeof o.id === 'string' && (o.level === 'urgent' || o.level === 'warn' || o.level === 'fail' || o.level === 'info') && typeof o.text === 'string' && typeof o.at === 'number' && typeof o.ttlMs === 'number'
}
const withoutBadKey = (x: BandItem): BandItem => {
  if ((x.key === undefined && x.vars === undefined) || keyedOk(x.key, x.vars)) return x
  const { id, level, text, at, ttlMs } = x
  return { id, level, text, at, ttlMs }
}
export const parseItems = (raw: unknown): BandItem[] => (Array.isArray(raw) ? raw.filter(isItem).map(withoutBadKey) : [])

export const liveItems = (items: BandItem[], now: number): BandItem[] => items.filter(x => now - x.at < x.ttlMs)

export function withItem(items: BandItem[], item: BandItem, now: number): BandItem[] {
  return [item, ...liveItems(items, now).filter(x => x.id !== item.id)].slice(0, BAND_KEEP)
}

export function arbitrate(items: BandItem[], now: number, max = BAND_SHOW): { shown: BandItem[]; more: number } {
  const live = liveItems(items, now).sort((a, b) => RANK[a.level] - RANK[b.level] || b.at - a.at)
  const strong = live.filter(x => x.level !== 'info')
  const pool = strong.length > 0 ? strong : live
  const shown = pool.slice(0, max)
  return { shown, more: live.length - shown.length }
}

export function bandWords(items: BandItem[], now: number, max = BAND_SHOW): string {
  const { shown, more } = arbitrate(items, now, max)
  if (shown.length === 0) return ''
  return `${shown.map(x => marked(markOf(x), x.text)).join(' · ')}${more > 0 ? ` +${more} more` : ''}`
}

// `post` never throws: a missed band line must not break the block that posted it.
export async function readBand(i: Io, sessionId?: string): Promise<BandItem[]> {
  try {
    return parseItems(await i.get(bandKey(sessionId ?? (await i.sessionId()))))
  } catch {
    return []
  }
}
export async function postBand(i: Io, level: BandLevel, id: string, text: string, ttlMs?: number, sessionId?: string): Promise<void> {
  try {
    const sid = sessionId ?? (await i.sessionId())
    const now = await i.now()
    const short = shortText(text)
    // Cut lines drop their row and facts, or the row would say more than the line.
    const keyed = short === text ? keyedOf(text) : undefined
    const made = keyed !== undefined && keyedOk(keyed.key, keyed.vars) ? keyed : undefined
    await i.set(bandKey(sid), withItem(parseItems(await i.get(bandKey(sid))), { id, level, text: short, at: now, ttlMs: ttlMs ?? BAND_TTL_MS[level], ...(made ?? {}) }, now))
    i.invalidate()
  } catch {
    // a missed band line only leaves the band as it was
  }
}
export async function clearBand(i: Io, id: string, sessionId?: string): Promise<void> {
  try {
    const sid = sessionId ?? (await i.sessionId())
    const old = parseItems(await i.get(bandKey(sid)))
    if (old.some(x => x.id === id)) {
      await i.set(bandKey(sid), old.filter(x => x.id !== id))
      i.invalidate()
    }
  } catch {
    // nothing to clear
  }
}
