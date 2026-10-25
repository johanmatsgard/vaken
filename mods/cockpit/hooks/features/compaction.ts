// Compaction: what the host lets a mod do (a probe), the keep-list added to every compaction, the record of each compaction
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'

import { parseStoredUsage, APP_USAGE_KEY } from '../core/appusage'
import { lastAfterTokens, lastSummaryOut, withCompact } from '../core/cachefacts'
import { postBand } from '../core/band'
import { AUDIT_KEY, parseAudit, toAudit, withAudit } from '../core/insight'
import { compare, diffKey, filesFromMessages } from '../core/compactdiff'
import type { Diff } from '../core/compactdiff'
import { checkSummary, failingKinds, keepListItems, keepMem, learnedLines } from '../core/compactcheck'
import type { KeepItem } from '../core/compactcheck'
import { readState, stateKey } from '../core/proof'
import { loadIndex } from '../core/undo'
import { COUNTS_KEY, FREED_TITLE, SHORTENED_TITLE, addCount, countOf } from '../core/counts'
import { serialUpdate } from '../core/serial'
import { DEFAULT_AFTER_TOKENS, DEFAULT_SUMMARY_OUT, HELPERS_LINE, cardText, compactInstructions, keepWords, openLines, paybackTurns, ttlOrGuess, withKeepList } from '../core/compactmoment'
import { BREAK_RETRY_MS, SIZE_LOOK2_MS, SIZE_LOOK_MS, breakAtMs, giveUpLeftMin, leadMsOf, minTokensOf } from '../core/compactauto'
import type { Trigger } from '../core/compactauto'
import { fromOf, nudge } from '../core/compactnudge'
import { AUTO_NOTE_WHAT, noteText, noteWords } from '../core/autosafe'
import { NEW_TURN, NO_BRIEF, STOP_WORDS, TYPING, detailWords, skippedWords, triggerWords } from '../core/compactwords'
import { t, tr } from '../core/lang'
import type { Probe } from '../core/undo'
import { allowKey } from '../core/guard'
import { heldKey, heldOpen, parseAllowOnce, parseHeld } from '../core/allowonce'
import { failedKey, failedLine, parseFailed } from '../core/errors'
import { BACKGROUND_MAX_MS, REST_KEY, endsBackground, helpersOpen, WOULD_WHAT, notGoodLines, restChecks, restDetail, restReady, restTrigger } from '../core/compactrest'
import type { RestFacts } from '../core/compactrest'
import { BOARD_KEY, boardRows, parseBoard } from '../core/agentboard'
import { LEAN_TOKENS_TITLE, LEAN_WHAT, shownTitle, startOfDay } from '../core/ledger'
import type { Entry } from '../core/ledger'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { putRecord, readRecord } from '../core/record'
import { readSetting } from '../core/settings'
import { tellsCompact } from '../core/tellclaude'
import { cacheTtlMs } from './home/logic'
import { hhmmss } from '../core/time'

// IO-BLOCK-START
function io($: EngineInterface): Io {
  return withToastGate({
    now: () => $.clock.now(),
    home: () => homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }),
    sessionId: () => $.session.id(),
    get: key => $.store.get(key),
    set: (key, value) => $.store.set(key, value),
    del: key => $.store.delete(key),
    keys: () => $.store.keys(),
    read: path => $.fs.read(path),
    write: (path, text) => $.fs.write(path, text),
    run: (argv, init) => $.process.run(argv, init),
    ask: (question, options) => $.ui.ask(question, options),
    complete: req => $.model.complete(req),
    toast: text => $.ui.toast(text),
    invalidate: () => $.ui.invalidate('ui.render'),
  })
}
// IO-BLOCK-END

export const NUDGE_KEY = (sessionId: string): string => `cockpit:compact:nudge:${sessionId}`
export const LEDGER_KEY = 'cockpit:ledger:compact'
const LOG_CAP = 24
// The ledger keeps more: the cache keeper adds an entry per ping, and the compacts must not be pushed out.
const LEDGER_CAP = 60

export type { Entry }

const DONE_BAND_MS = 10 * 60_000

// The ledger, the counts and the audit are shared by every session: each write goes through serialUpdate
const isEntry = (entry: Entry) => (x: unknown): boolean => {
  const got = x as Entry
  return typeof got === 'object' && got !== null && got.at === entry.at && got.what === entry.what && got.session === entry.session
}

// `quiet`: the row only joins the log, with no band line and no audit row (the person pressed it or already sees it).
export async function pushLog(i: Io, key: string, entry: Entry, quiet = false): Promise<void> {
  const cap = key === LEDGER_KEY ? LEDGER_CAP : LOG_CAP
  await serialUpdate(i, key, old => [entry, ...(Array.isArray(old) ? (old as Entry[]) : [])].slice(0, cap), stored => Array.isArray(stored) && stored.some(isEntry(entry)))
  if (key === LEDGER_KEY) {
    let written = 0
    await serialUpdate(
      i,
      COUNTS_KEY,
      old => {
        let bumped = addCount(old, entry.at, entry.what)
        written = countOf(bumped, entry.at, entry.what)
        // A compaction that really made the window smaller also adds to today's two sums (core/counts.ts)
        if (entry.before !== undefined && entry.after !== undefined && entry.before > entry.after) bumped = addCount(addCount(bumped, entry.at, SHORTENED_TITLE), entry.at, FREED_TITLE, entry.before - entry.after)
        return bumped
      },
      stored => countOf(stored, entry.at, entry.what) >= written,
    )
  }
  if (key === LEDGER_KEY && entry.did === true && !quiet) {
    await postBand(i, 'info', `did:${entry.what}`, shownTitle(entry.what), DONE_BAND_MS, entry.session)
    const row = toAudit(entry)
    await serialUpdate(i, AUDIT_KEY, old => withAudit(parseAudit(old), row), stored => parseAudit(stored).some(r => r.at === row.at && r.what === row.what && r.session === row.session))
  }
}

// The day's lean cuts as ONE row: the first cut of the day adds it, later ones add to its counts. Memory sums come in batches (features/lean.ts), never per cut.
export async function noteLeanDay(i: Io, now: number, cuts: number, tokens: number): Promise<void> {
  const session = await i.sessionId()
  await serialUpdate(
    i,
    LEDGER_KEY,
    old => {
      const list = Array.isArray(old) ? (old as Entry[]) : []
      const at = list.findIndex(e => typeof e === 'object' && e !== null && e.what === LEAN_WHAT && e.at >= startOfDay(now))
      if (at < 0) return [{ at: now, session, what: LEAN_WHAT, how: 'auto' as const, did: true, cuts, saved: tokens }, ...list].slice(0, LEDGER_CAP)
      const row = list[at] as Entry
      return list.map((e, n) => (n === at ? { ...row, cuts: (row.cuts ?? 0) + cuts, saved: (row.saved ?? 0) + tokens } : e))
    },
    stored => Array.isArray(stored) && stored.some(e => (e as Entry | null)?.what === LEAN_WHAT),
  )
  await serialUpdate(i, COUNTS_KEY, old => addCount(addCount(old, now, LEAN_WHAT, cuts), now, LEAN_TOKENS_TITLE, tokens))
}

// A line from an old version or a broken write is dropped: each needs its time and its title.
const goodEntry = (x: unknown): x is Entry => typeof x === 'object' && x !== null && typeof (x as Entry).at === 'number' && Number.isFinite((x as Entry).at) && typeof (x as Entry).what === 'string'
export async function readLog(i: Io, key: string): Promise<Entry[]> {
  const v = await i.get(key)
  return Array.isArray(v) ? v.filter(goodEntry).map(x => (x.detail === undefined || typeof x.detail === 'string' ? x : { ...x, detail: String(x.detail) })) : []
}

export const why = (err: unknown): string => (err instanceof Error ? err.message : String(err)).slice(0, 160)

export function logLines(list: Entry[], max = 12): string[] {
  return list.slice(0, max).map(x => `${hhmmss(x.at)} ${shownTitle(x.what)}${x.detail === undefined ? '' : `: ${x.detail}`}`)
}

// The files this session edited, newest first: the transcript's edit steps when the hook has them (paths only), then the undo copies vaken keeps
async function editedPaths(i: Io, sessionId: string, more: readonly string[]): Promise<string[]> {
  const fromSteps = [...more].reverse()
  try {
    return [...fromSteps, ...(await loadIndex(i, sessionId)).snaps.slice().sort((a, b) => b.at - a.at).map(s => s.path)]
  } catch {
    return fromSteps
  }
}

// The keep-list and the items it asks the summary to keep (core/compactcheck.ts). Never throws.
export async function keepPlan(i: Io, sessionId: string, edited: readonly string[] = []): Promise<{ text: string; items: KeepItem[] }> {
  const rec = await readRecord(i, sessionId)
  const base = cardText({ title: rec?.title, branch: rec?.branch })
  try {
    const now = await i.now()
    const held = heldOpen(parseHeld(await i.get(heldKey(sessionId))), parseAllowOnce(await i.get(allowKey(sessionId))), now)
    const failed = parseFailed(await i.get(failedKey(sessionId)))
    const open = openLines({ failed: failedLine(failed === undefined ? undefined : { ...failed, what: keepWords(failed.what) }, now), held: held === undefined ? undefined : (held.words ?? 'a step') })
    const proof = readState(await i.get(stateKey(sessionId)))
    const goal = proof.goal?.text ?? rec?.title
    const items = keepListItems({ ...(goal === undefined ? {} : { goal }), edited: await editedPaths(i, sessionId, edited), failing: failingKinds(proof) })
    return { text: [base, ...learnedLines(items, goal === rec?.title), ...open].join('\n'), items }
  } catch {
    return { text: base, items: [] }
  }
}

// Never throws.
export async function keepList(i: Io, sessionId: string): Promise<string> {
  return (await keepPlan(i, sessionId)).text
}

// After a compaction: which changed files the summary names (core/compactdiff.ts) and, with the keep-list on, is each kept item in it?
// The summary is read here and dropped: the record keeps names of our own and counts, the items left out stay in this process's memory.
export async function checkKept(i: Io, sessionId: string, files: readonly string[], items: readonly KeepItem[] | undefined, summary: string | undefined): Promise<void> {
  try {
    if (summary === undefined) return
    const now = await i.now()
    const diff: Diff = compare([...files], summary, (await readRecord(i, sessionId))?.branch, now)
    const c = items === undefined || items.length === 0 ? undefined : checkSummary(sessionId, items, summary, now)
    keepMem.last = c
    await i.set(diffKey(sessionId), c === undefined ? diff : { ...diff, keep: { total: c.total, lost: c.missing.length } })
    if (c !== undefined && c.missing.length > 0) i.invalidate()
  } catch {
  }
}

// Where Auto gave up, per session: it could not start a compaction there, so it leaves that session alone for GIVE_UP_RETRY_MS (the This session card says so)
const givenUp = new Map<string, number>()
export const noteGiveUp = (sessionId: string, at: number): void => void givenUp.set(sessionId, at)
export const giveUpMinOf = (sessionId: string, now: number): number => {
  const left = giveUpLeftMin(givenUp.get(sessionId), now)
  if (left === 0) givenUp.delete(sessionId)
  return left
}

// The running flag is the one hard block with no way past it: it is claimed with a holder number before anything is awaited
type How = NonNullable<Entry['how']>
export const compacting: { pending: boolean; how?: How; owner?: number; seenBy?: number; sent?: { how: How; at: number } } = { pending: false }
// How long a sent compaction still names its way in the record: a big session can take 16 s to compact
const SENT_MARK_MS = 5 * 60_000
let owners = 0

export function claimCompacting(how: How): number | undefined {
  if (compacting.pending) return undefined
  owners += 1
  compacting.pending = true
  compacting.how = how
  compacting.owner = owners
  return owners
}

export function releaseCompacting(owner: number): void {
  if (compacting.owner !== owner) return
  compacting.pending = false
  compacting.how = undefined
  compacting.owner = undefined
}

// The way the compaction now passing the hook was started: the running one's, a just-sent one's (used once)
function howNow(now: number): How {
  if (compacting.pending) {
    compacting.seenBy = compacting.owner
    return compacting.how ?? 'button'
  }
  const s = compacting.sent
  compacting.sent = undefined
  return s !== undefined && now >= s.at && now - s.at < SENT_MARK_MS ? s.how : 'typed'
}

// What one session's rest keeps: the turn that just ended and the background commands it started. One slot per session, so two sessions never share a turn or a command.
// `starts` counts the main turns that started: a compaction about to be sent checks it did not change. `background` holds the start time of each background command not yet seen to end; `timers` the looks scheduled for the turn that just ended.
type RestSlot = { turnId?: string; endedAt: number; background: number[]; startedAt?: number; timers: { cancel: () => void }[]; starts: number }
const slots = new Map<string, RestSlot>()
export function cancelLooks(slot: RestSlot): void {
  for (const timer of slot.timers) timer.cancel()
  slot.timers = []
}
// A background command of the session ended (its task notification, or the person stopped it): the oldest one still counted is done.
export function backgroundEnded(sessionId: string): void {
  restSlotOf(sessionId).background.shift()
}
export function restSlotOf(sessionId: string): RestSlot {
  const got = slots.get(sessionId)
  if (got !== undefined) return got
  const fresh: RestSlot = { endedAt: 0, background: [], timers: [], starts: 0 }
  slots.set(sessionId, fresh)
  return fresh
}

// Why Auto compacted this time: read once by the record of the compaction that follows
let autoWhy: { kind: Trigger; pct: number | undefined; at: number } | undefined

// What a compaction needs from the engine
export type CompactOps = {
  io: Io
  cwd: () => Promise<string>
  probe: Probe
  agents: () => Promise<number> // helper agents the engine lists as running
  command: (args: string) => Promise<unknown>
  direct?: (instructions: string) => Promise<{ skip?: string; tokensBefore?: number; tokensAfter?: number; outTokens?: number; summary?: string }>
}

// What the rule needs, from the session's record, the agent board, the engine's agent list
async function restFacts(i: Io, agents: () => Promise<number>, sessionId: string, turnId?: string): Promise<RestFacts | undefined> {
  const rec = await readRecord(i, sessionId)
  if (rec === undefined) return undefined
  const slot = restSlotOf(sessionId)
  const now = await i.now()
  // Unknown plan: the short cache time for the payback sum, so a lapsed cache is never called warm; the break trigger never fires then (ttlKnown).
  const knownTtl = cacheTtlMs(parseStoredUsage(await i.get(APP_USAGE_KEY)))
  const ttl = ttlOrGuess(knownTtl)
  const mine = boardRows(parseBoard(await i.get(BOARD_KEY)), now).filter(r => r.session === sessionId.slice(0, 8) && r.state === 'running')
  const board = mine.length
  let engine = 0
  try {
    engine = await agents()
  } catch {
  }
  slot.background = slot.background.filter(at => now - at < BACKGROUND_MAX_MS)
  const tokens = rec.ctx?.tokens
  // The last compaction of any kind: the record's, or one just started here (its record comes when the engine reports it)
  const lastCompact = (rec.compacts ?? []).reduce((m, c) => Math.max(m, c.at), slot.startedAt ?? 0)
  const cacheLeftMs = rec.cache?.at === undefined ? undefined : ttl - (now - rec.cache.at)
  const guardHeld = heldOpen(parseHeld(await i.get(heldKey(sessionId))), parseAllowOnce(await i.get(allowKey(sessionId))), now) !== undefined
  return {
    turnEnded: (turnId === undefined || slot.turnId === turnId) && rec.state !== 'working',
    waitsForYou: rec.ask !== undefined,
    agentsRunning: Math.max(board, engine),
    foregroundAgents: mine.filter(r => !r.background).length,
    backgroundRecent: slot.background.length,
    guardHeld,
    from: fromOf(await readSetting(i, 'compact.from')),
    minTokens: minTokensOf(await readSetting(i, 'compact.min'), rec.ctx?.window),
    tokens,
    ...(rec.contextPercent === undefined ? {} : { percent: rec.contextPercent }),
    payback: tokens === undefined ? undefined : paybackTurns({ tokens, after: lastAfterTokens(rec.compacts) ?? DEFAULT_AFTER_TOKENS, out: lastSummaryOut(rec.compacts) ?? DEFAULT_SUMMARY_OUT, warm: (cacheLeftMs ?? 0) > 0, ttlMs: ttl }),
    // No answer has ended in this process yet: the idle time is not known, so it counts as none
    quietMs: slot.endedAt === 0 ? 0 : now - slot.endedAt,
    breakAtMs: breakAtMs(ttl, leadMsOf(await readSetting(i, 'compact.lead'))),
    cacheLeftMs,
    ttlKnown: knownTtl !== undefined,
    sinceCompactMs: lastCompact === 0 ? undefined : now - lastCompact,
  }
}

// Never throws.
export async function notGoodNow(ops: CompactOps, sessionId: string, say: (name: string, vars?: Record<string, string | number>) => string): Promise<string[]> {
  try {
    const f = await restFacts(ops.io, ops.agents, sessionId)
    return f === undefined ? [] : notGoodLines(restChecks(f), f, say)
  } catch {
    return []
  }
}

// The looks Auto takes after an answer: the size trigger at SIZE_LOOK_MS and again at SIZE_LOOK2_MS, the break trigger when a break nears the end of the cache time and once more BREAK_RETRY_MS later
type Look = 'size' | 'size2' | 'break' | 'break2'

// Is the person's prompt box empty? A box that cannot be read counts as not empty, so Auto waits for the next look.
async function boxEmpty($: EngineInterface): Promise<boolean> {
  try {
    const box = await $.prompt.read()
    return box.text.trim() === ''
  } catch {
    return false
  }
}

// Schedules one look for the turn that just ended; a new turn or the end of the session cancels it.
function lookAt($: EngineInterface, sessionId: string, turnId: string, ms: number, which: Look): void {
  const timer = $.clock.after(ms, () => void restLook($, sessionId, turnId, which))
  restSlotOf(sessionId).timers.push(timer)
}

// One look at the moment. Never throws.
async function restLook($: EngineInterface, sessionId: string, turnId: string, which: Look): Promise<void> {
  const i = io($)
  try {
    // A timer that outlived its session does nothing
    if ((await i.sessionId()) !== sessionId) return
    const slot = restSlotOf(sessionId)
    if (slot.turnId !== turnId) return
    const mode = await readSetting(i, 'compact.mode')
    if (mode !== 'watch' && mode !== 'auto') return
    const f = await restFacts(i, agentsOf($), sessionId, turnId)
    if (f === undefined) return
    const checks = restChecks(f)
    const ready = restReady(checks)
    const now = await i.now()
    await i.set(REST_KEY(sessionId), { at: now, ready, checks })
    if (!ready) {
      // One more look soon: the timer may have fired a little early, or a check may have failed for a moment
      if (which === 'break' && f.ttlKnown !== false) lookAt($, sessionId, turnId, BREAK_RETRY_MS, 'break2')
      return
    }
    if (mode === 'watch') {
      slot.turnId = undefined
      // A note, not an action: Watch did nothing, so it is not counted as done for you
      await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, what: WOULD_WHAT, detail: restDetail(f) })
      return
    }
    if (giveUpMinOf(sessionId, now) > 0) return
    // The size trigger never compacts over a prompt the person is typing: the second look tries again
    if ((restTrigger(f) ?? 'size') === 'size' && !(await boxEmpty($))) return
    await runAuto($, sessionId, turnId, f)
  } catch {
    // an automatic step never breaks the session
  }
}

// What a path is, from the engine (a file, a folder, or something else
function probeOf($: EngineInterface): Probe {
  return async path => {
    try {
      const s = await $.fs.stat(path)
      return { kind: s.kind, size: s.size }
    } catch {
      return undefined
    }
  }
}

// The helper agents the engine lists as running.
function agentsOf($: EngineInterface): () => Promise<number> {
  return async () => {
    const list = await $.agent.list()
    return list.filter(a => a.status === 'running').length
  }
}

function opsOf($: EngineInterface): CompactOps {
  return {
    io: io($),
    cwd: () => $.session.cwd(),
    probe: probeOf($),
    agents: agentsOf($),
    command: args => $.command.run({ command: 'compact', args }),
    direct: async instructions => {
      const r = await $.session.compact({ instructions })
      if (r.skip !== undefined) return { skip: r.skip }
      return { tokensBefore: r.tokensBefore, tokensAfter: r.tokensAfter, outTokens: r.usage?.output_tokens, summary: r.messages[0]?.text }
    },
  }
}

type Saved = { ok: true; name: string; shown: string; checkpoint: boolean } | { ok: false }
type AutoSaver = (i: Io, sessionId: string, cwd: string, probe: Probe) => Promise<Saved>
let autoSaver: AutoSaver | undefined
export const setAutoSaver = (fn: AutoSaver | undefined): void => {
  autoSaver = fn
}

// It is a note, not an undo (the engine has no restore of a compaction).
async function postNote(i: Io, sessionId: string, name: string): Promise<void> {
  try {
    const text = noteText(name)
    await pushLog(i, LEDGER_KEY, { at: await i.now(), session: sessionId, what: AUTO_NOTE_WHAT, detail: text, how: 'auto', did: true })
    i.toast(noteWords(text, tr))
  } catch {
  }
}

export type CompactEnd = 'busy' | 'skipped' | 'no-brief' | 'sent' | 'failed'

// Claims the running flag (nothing awaited before it), looks at `stops` (Auto's checks
export async function runCompaction(r: { how: 'button' | 'auto'; sessionId: string; ops: CompactOps; stops?: () => Promise<string | undefined>; because?: string; kind?: Trigger; pct?: number; same?: () => boolean }): Promise<CompactEnd> {
  const owner = claimCompacting(r.how)
  if (owner === undefined) return 'busy'
  const i = r.ops.io
  const auto = r.how === 'auto'
  const log = async (what: string, detail?: string): Promise<void> => pushLog(i, LEDGER_KEY, { at: await i.now(), session: r.sessionId, what, ...(detail === undefined ? {} : { detail }) })
  const skip = async (why: string): Promise<CompactEnd> => {
    await log('auto-compact skipped', skippedWords(why))
    return 'skipped'
  }
  i.invalidate()
  try {
    const first = r.stops === undefined ? undefined : await r.stops()
    if (first !== undefined) return await skip(first)
    const saved: Saved = autoSaver === undefined ? { ok: false } : await autoSaver(i, r.sessionId, await r.ops.cwd(), r.ops.probe)
    if (!saved.ok) {
      if (auto) return await skip(NO_BRIEF)
      i.toast(t('toast.compact_no_brief'), true)
      await log('compact now failed', NO_BRIEF)
      return 'no-brief'
    }
    const late = r.stops === undefined ? undefined : await r.stops()
    if (late !== undefined) return await skip(late)
    restSlotOf(r.sessionId).turnId = undefined
    restSlotOf(r.sessionId).startedAt = await i.now()
    if (auto && r.kind !== undefined) autoWhy = { kind: r.kind, pct: r.pct, at: await i.now() }
    const plan = (await readSetting(i, 'compact.card')) === 'on' ? await keepPlan(i, r.sessionId) : undefined
    const keep = compactInstructions(plan?.text, saved.shown, await helpersNow(i, r.ops.agents, r.sessionId))
    if (auto) {
      await log('auto-compact starts', r.because)
      if (r.because !== undefined) i.toast(r.because)
    } else {
      await log('compact now (button)')
      i.toast(tr('Compacting the session'), true)
    }
    let refused: unknown
    // A new turn may have started while the brief was saved: the check and the call stand together, nothing awaited between them
    if (r.same !== undefined && !r.same()) return await skip(NEW_TURN)
    if (r.ops.direct !== undefined) {
      try {
        const res = await r.ops.direct(keep)
        if (res.skip !== undefined) {
          await log('auto-compact skipped', res.skip)
          return 'skipped'
        }
        await noteCompact(i, r.sessionId, 'plugin', res.tokensBefore, res.tokensAfter, res.outTokens, r.how)
        // Our own call skips this module's session.compact hook, so it checks the summary here
        await checkKept(i, r.sessionId, (plan?.items ?? []).filter(x => x.kind === 'file').map(x => x.name), plan?.items, res.summary)
        if (auto) await postNote(i, r.sessionId, saved.name)
        return 'sent'
      } catch (err) {
        refused = err === undefined ? new Error('refused') : err
      }
    }
    if (r.same !== undefined && !r.same()) return await skip(NEW_TURN)
    try {
      await r.ops.command(keep)
      if (compacting.seenBy !== owner) compacting.sent = { how: r.how, at: await i.now() }
      if (refused !== undefined) await log('auto-compact sent as /compact', `direct call refused: ${why(refused)}`)
      if (auto) await postNote(i, r.sessionId, saved.name)
      return 'sent'
    } catch (err2) {
      if (auto) {
        noteGiveUp(r.sessionId, await i.now())
        await log('auto-compact could not run', refused === undefined ? why(err2) : `${why(refused)} | ${why(err2)}`)
      } else {
        i.toast(tr('Could not compact the session from here. Type /compact yourself.'), true)
        await log('compact now failed', why(err2))
      }
      return 'failed'
    }
  } catch {
    // a compaction never breaks the session
    return 'failed'
  } finally {
    releaseCompacting(owner)
    i.invalidate()
  }
}

// Each check of the rule, as the stop that names it in the ledger
const CHECK_STOP: Record<string, string> = { ended: 'working', helpers: 'foreground', guard: 'guard', size: 'small', gap: 'gap', time: 'early' }

// Do helpers (agents or background commands) still run in this session? Then the summary must list them. Never throws.
async function helpersNow(i: Io, agents: () => Promise<number>, sessionId: string): Promise<boolean> {
  try {
    const f = await restFacts(i, agents, sessionId)
    return f !== undefined && helpersOpen(f)
  } catch {
    return false
  }
}

// Never throws.
export async function runAuto($: EngineInterface, sessionId: string, turnId: string, looked: RestFacts): Promise<void> {
  const ops = opsOf($)
  const kind = restTrigger(looked) ?? 'size'
  const starts = restSlotOf(sessionId).starts
  const stops = async (): Promise<string | undefined> => {
    if (restSlotOf(sessionId).turnId !== turnId) return NEW_TURN
    if (kind === 'size' && !(await boxEmpty($))) return TYPING
    const fresh = await restFacts(ops.io, ops.agents, sessionId, turnId)
    if (fresh === undefined) return NEW_TURN
    const checks = restChecks(fresh)
    if (restReady(checks)) return undefined
    const first = checks.find(c => !c.ok)
    const stop = first?.id === 'time' && helpersOpen(fresh) ? 'busy' : CHECK_STOP[first?.id ?? '']
    return first === undefined ? NEW_TURN : (STOP_WORDS[stop ?? ''] ?? first.label)
  }
  await runCompaction({ how: 'auto', sessionId, ops, stops, kind, same: () => restSlotOf(sessionId).starts === starts, ...(looked.percent === undefined ? {} : { pct: looked.percent }), because: triggerWords(kind, looked.percent ?? 0, tr) })
}

// Keeps what one compaction did to the window: in this session's record (so the next advice uses the real summary size) and in the ledger.
async function noteCompact(i: Io, sessionId: string, trigger: string, before?: number, after?: number, outTokens?: number, how?: Entry['how'], isLedger = true): Promise<void> {
  const now = await i.now()
  const old = await readRecord(i, sessionId)
  await putRecord(i, { sessionId, compacts: withCompact(old?.compacts, { at: now, trigger, before, after, outTokens }) }, true)
  // A compaction Auto started says when: "during a break, 640k to 18k tokens"
  const why = how === 'auto' && autoWhy !== undefined && now >= autoWhy.at && now - autoWhy.at < SENT_MARK_MS ? `${detailWords(autoWhy.kind, autoWhy.pct)}, ` : ''
  if (how === 'auto') autoWhy = undefined
  if (isLedger) await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, ...(before === undefined ? {} : { before }), ...(after === undefined ? {} : { after }), ...(how === undefined ? {} : { how }), what: `compacted (${trigger})`, detail: `${why}${before === undefined ? '?' : Math.round(before / 1000)}k to ${after === undefined ? '?' : Math.round(after / 1000)}k tokens${outTokens === undefined ? '' : `, summary output ${outTokens}`}` })
}

// The agent a turn belongs to, when the event names one (a helper agent's turn); the main session's turn names none.
function loopOf(x: object): unknown {
  return 'agentId' in x ? x.agentId : undefined
}

export function registerCompaction(on: On): void {
  on('session.start', { cwd: /(?<cockpit>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the probe is a tool for us: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Every compaction passes here (the person's /compact, the engine's own auto-compaction, a precompute).
  on('session.compact', async ($, e, next) => {
    let sent = e
    let id = ''
    let plan: { text: string; items: KeepItem[] } | undefined
    let files: string[] = []
    try {
      const i = io($)
      id = await i.sessionId()
      if (e.agentId === undefined) {
        files = filesFromMessages(e.messages ?? [])
        plan = (await readSetting(i, 'compact.card')) === 'on' ? await keepPlan(i, id, files) : undefined
        const parts = [plan?.text ?? '', (await helpersNow(i, agentsOf($), id)) ? HELPERS_LINE() : ''].filter(x => x !== '')
        const instructions = parts.reduce((acc: string | undefined, part) => withKeepList(acc, part), e.instructions)
        if (instructions !== e.instructions) {
          sent = { ...e, instructions }
        }
      }
    } catch {
      sent = e
    }
    const result = await next(sent)
    try {
      if (e.agentId === undefined && e.trigger !== 'precompute' && result.skip === undefined && result.messages.length > 0) await checkKept(io($), id, files, plan?.items, result.messages[0].text)
    } catch {
    }
    try {
      // Our own automatic compact does not pass here (a call skips its caller's hooks), so it notes itself
      if (e.agentId === undefined && e.trigger !== 'precompute') {
        const doneAt = await $.clock.now()
        if (result.skip === undefined) await noteCompact(io($), id, e.trigger, result.tokensBefore, result.tokensAfter, result.usage?.output_tokens, howNow(doneAt))
        else await pushLog(io($), LEDGER_KEY, { at: doneAt, session: id, what: `compaction skipped (${e.trigger})`, detail: result.skip })
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<cockpit>)/ }, async ($, e, next) => {
    if (e.agentId === undefined) {
      try {
        const i = io($)
        const id = await i.sessionId()
        const slot = restSlotOf(id)
        cancelLooks(slot)
        slot.turnId = e.turnId
        slot.endedAt = await i.now()
        const mode = await readSetting(i, 'compact.mode')
        if (mode === 'watch' || mode === 'auto') {
          // The size trigger looks a little after the answer and again later; the break trigger looks when the cache time, less the lead, has passed idle.
          lookAt($, id, e.turnId, SIZE_LOOK_MS, 'size')
          lookAt($, id, e.turnId, SIZE_LOOK2_MS, 'size2')
          // Without a known plan the cache time is not known, so there is no break look
          const ttl = cacheTtlMs(parseStoredUsage(await i.get(APP_USAGE_KEY)))
          if (ttl !== undefined) lookAt($, id, e.turnId, breakAtMs(ttl, leadMsOf(await readSetting(i, 'compact.lead'))), 'break')
        }
      } catch {
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // A new main turn: the person is back, so the rest the rule waited on is over.
  // A helper agent's turn is not the person coming back: it does not cancel the main session's look.
  on('turn.start', { turnId: /(?<cockpit>)/ }, async ($, e, next) => {
    try {
      if (loopOf(e) === undefined) {
        const slot = restSlotOf(await io($).sessionId())
        slot.turnId = undefined
        slot.starts += 1
        cancelLooks(slot)
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The session ends: its looks go with it
  on('session.end', { sessionId: /(?<compactlooks>)/ }, async ($, e, next) => {
    try {
      const slot = restSlotOf(e.sessionId)
      slot.turnId = undefined
      cancelLooks(slot)
      slot.background = []
      givenUp.delete(e.sessionId)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // A background command ended: its task notification reaches the session as a prompt of its own kind. The notification does not say which task it is, so it counts as the end of the oldest one counted; a notification that never comes is covered by BACKGROUND_MAX_MS.
  on('prompt.submit', { text: /(?<compactbg>)/ }, async ($, e, next) => {
    try {
      if (endsBackground(e.origin)) backgroundEnded(await io($).sessionId())
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The quiet note to Claude at the crossing (core/compactnudge.ts): once per crossing of `compact.from`
  on('tool.call', { tool: /(?<cockpitnudge>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      if (e.agentId !== undefined || result.deny !== undefined) return result
      const i = io($)
      const mode = await readSetting(i, 'compact.mode')
      const id = await i.sessionId()
      const key = NUDGE_KEY(id)
      const sent = (await i.get(key)) === true
      const from = fromOf(await readSetting(i, 'compact.from'))
      const pct = (await readRecord(i, id))?.contextPercent
      if (mode === 'off' || pct === undefined || pct < from) {
        if (sent && mode !== 'off') await i.set(key, false)
        return result
      }
      if (sent) return result
      if (!(await tellsCompact(i))) return result
      const facts = await restFacts(i, agentsOf($), id, restSlotOf(id).turnId ?? '')
      if (facts === undefined) return result
      const r = nudge({ mode, sent, from, minTokens: facts.minTokens, facts: { percent: facts.percent, tokens: facts.tokens, sinceCompactMs: facts.sinceCompactMs } })
      if (r.sent !== sent) await i.set(key, r.sent)
      return r.note === undefined ? result : { ...result, context: [...(result.context ?? []), r.note] }
    } catch {
      return result
    }
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<cockpit>^(?:Bash|PowerShell)$)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      const shown = r.result as { backgroundTaskId?: unknown } | undefined
      if (shown?.backgroundTaskId !== undefined || fieldsOf(e).run_in_background === true) {
        const i = io($)
        const nowMs = await $.clock.now()
        restSlotOf(await i.sessionId()).background.push(nowMs)
      }
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))
}
