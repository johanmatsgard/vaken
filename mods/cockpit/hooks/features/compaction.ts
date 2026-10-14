// Compaction: what the host lets a mod do (a probe), the keep-list added to every compaction, the record of each compaction
import type { EngineInterface, On } from 'claude-code'

import { parseStoredUsage, APP_USAGE_KEY } from '../core/appusage'
import { lastAfterTokens, lastSummaryOut, withCompact } from '../core/cachefacts'
import { postBand } from '../core/band'
import { AUDIT_KEY, parseAudit, toAudit, withAudit } from '../core/insight'
import { compare, diffKey, filesFromMessages } from '../core/compactdiff'
import { COUNTS_KEY, FREED_TITLE, SHORTENED_TITLE, addCount, countOf } from '../core/counts'
import { serialUpdate } from '../core/serial'
import { CACHE_WARM_MS, DEFAULT_AFTER_TOKENS, DEFAULT_SUMMARY_OUT, cardText, compactInstructions, keepWords, openLines, paybackTurns, withKeepList } from '../core/compactmoment'
import { workSaved } from '../core/compactscore'
import { fromOf, nudge } from '../core/compactnudge'
import { AUTO_NOTE_WHAT, noteText, noteWords } from '../core/autosafe'
import { NEW_TURN, NO_BRIEF, becauseWords, skippedWords, stopWords } from '../core/compactwords'
import { t, tr } from '../core/lang'
import { namedKey, parseNamed } from '../core/undo'
import type { Probe } from '../core/undo'
import { allowKey } from '../core/guard'
import { heldKey, heldOpen, parseAllowOnce, parseHeld } from '../core/allowonce'
import { failedKey, failedLine, parseFailed } from '../core/errors'
import { BACKGROUND_OPEN_MS, CACHE_MARGIN_MS, REST_KEY, REST_QUIET_MS, WOULD_WHAT, endsWithQuestion, notGoodLines, restChecks, restDetail, restReady, restScore, restScoreFacts } from '../core/compactrest'
import type { RestFacts } from '../core/compactrest'
import { BOARD_KEY, boardRows, parseBoard } from '../core/agentboard'
import { readState, stateKey } from '../core/proof'
import { shownTitle } from '../core/ledger'
import type { Entry } from '../core/ledger'
import { readNote } from '../core/flush'
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
const REST_LOOK_MS = REST_QUIET_MS + 5_000

export type { Entry }

const DONE_BAND_MS = 10 * 60_000

// The ledger, the counts and the audit are shared by every session: each write goes through serialUpdate
const isEntry = (entry: Entry) => (x: unknown): boolean => {
  const e = x as Entry
  return typeof e === 'object' && e !== null && e.at === entry.at && e.what === entry.what && e.session === entry.session
}

export async function pushLog(i: Io, key: string, entry: Entry): Promise<void> {
  const cap = key === LEDGER_KEY ? LEDGER_CAP : LOG_CAP
  await serialUpdate(i, key, old => [entry, ...(Array.isArray(old) ? (old as Entry[]) : [])].slice(0, cap), stored => Array.isArray(stored) && stored.some(isEntry(entry)))
  if (key === LEDGER_KEY) {
    let written = 0
    await serialUpdate(
      i,
      COUNTS_KEY,
      old => {
        let next = addCount(old, entry.at, entry.what)
        written = countOf(next, entry.at, entry.what)
        // A compaction that really made the window smaller also adds to today's two sums (core/counts.ts)
        if (entry.before !== undefined && entry.after !== undefined && entry.before > entry.after) next = addCount(addCount(next, entry.at, SHORTENED_TITLE), entry.at, FREED_TITLE, entry.before - entry.after)
        return next
      },
      stored => countOf(stored, entry.at, entry.what) >= written,
    )
  }
  if (key === LEDGER_KEY && entry.did === true) {
    await postBand(i, 'info', `did:${entry.what}`, shownTitle(entry.what), DONE_BAND_MS, entry.session)
    const row = toAudit(entry)
    await serialUpdate(i, AUDIT_KEY, old => withAudit(parseAudit(old), row), stored => parseAudit(stored).some(r => r.at === row.at && r.what === row.what && r.session === row.session))
  }
}

export async function readLog(i: Io, key: string): Promise<Entry[]> {
  const v = await i.get(key)
  return Array.isArray(v) ? (v as Entry[]) : []
}

export const why = (err: unknown): string => (err instanceof Error ? err.message : String(err)).slice(0, 160)

export function logLines(list: Entry[], max = 12): string[] {
  return list.slice(0, max).map(e => `${hhmmss(e.at)} ${shownTitle(e.what)}${e.detail === undefined ? '' : `: ${e.detail}`}`)
}

// Never throws.
export async function keepList(i: Io, sessionId: string): Promise<string> {
  const rec = await readRecord(i, sessionId)
  const base = cardText({ title: rec?.title, branch: rec?.branch })
  try {
    const now = await i.now()
    const held = heldOpen(parseHeld(await i.get(heldKey(sessionId))), parseAllowOnce(await i.get(allowKey(sessionId))), now)
    const failed = parseFailed(await i.get(failedKey(sessionId)))
    const open = openLines({ failed: failedLine(failed === undefined ? undefined : { ...failed, what: keepWords(failed.what) }, now), held: held === undefined ? undefined : (held.words ?? 'a step') })
    return [base, ...open].join('\n')
  } catch {
    return base
  }
}

let autoGivenUp = false

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

const rest: { turnId?: string; endedAt: number; question: boolean; background: number[]; lastAutoAt?: number } = { endedAt: 0, question: false, background: [] }

// What a compaction needs from the engine
export type CompactOps = {
  io: Io
  cwd: () => Promise<string>
  probe: Probe
  agents: () => Promise<number> // helper agents the engine lists as running
  command: (args: string) => Promise<unknown>
  direct?: (instructions: string) => Promise<{ skip?: string; tokensBefore?: number; tokensAfter?: number; outTokens?: number }>
}

// What the rule needs, from the session's record, the proof state, the agent board, the engine's agent list
async function restFacts(i: Io, agents: () => Promise<number>, sessionId: string, turnId?: string): Promise<RestFacts | undefined> {
  const rec = await readRecord(i, sessionId)
  if (rec === undefined) return undefined
  const now = await i.now()
  // Unknown plan: the short cache time, so a lapsed cache is never called warm.
  const ttl = cacheTtlMs(parseStoredUsage(await i.get(APP_USAGE_KEY))) ?? CACHE_WARM_MS
  const board = boardRows(parseBoard(await i.get(BOARD_KEY)), now).filter(r => r.session === sessionId.slice(0, 8) && r.state === 'running').length
  let engine = 0
  try {
    engine = await agents()
  } catch {
  }
  rest.background = rest.background.filter(at => now - at < BACKGROUND_OPEN_MS)
  const tokens = rec.ctx?.tokens
  const lastCompact = (rec.compacts ?? []).reduce((m, c) => Math.max(m, c.at), 0)
  const cacheLeftMs = rec.cache?.at === undefined ? undefined : ttl - (now - rec.cache.at)
  const proof = readState(await readNote(i, stateKey(sessionId)))
  let checkpointAt: number | undefined
  try {
    checkpointAt = parseNamed(await i.get(namedKey(sessionId))).reduce<number | undefined>((m, n) => (m === undefined || n.at > m ? n.at : m), undefined)
  } catch {
    checkpointAt = undefined
  }
  const guardHeld = heldOpen(parseHeld(await i.get(heldKey(sessionId))), parseAllowOnce(await i.get(allowKey(sessionId))), now) !== undefined
  return {
    turnEnded: (turnId === undefined || rest.turnId === turnId) && rec.state !== 'working',
    endedWithQuestion: rest.question,
    waitsForYou: rec.ask !== undefined,
    agentsRunning: Math.max(board, engine),
    backgroundRecent: rest.background.length,
    guardHeld,
    from: fromOf(await readSetting(i, 'compact.from')),
    saved: workSaved(proof, checkpointAt),
    proof,
    tokens,
    ...(rec.contextPercent === undefined ? {} : { percent: rec.contextPercent }),
    payback: tokens === undefined ? undefined : paybackTurns({ tokens, after: lastAfterTokens(rec.compacts) ?? DEFAULT_AFTER_TOKENS, out: lastSummaryOut(rec.compacts) ?? DEFAULT_SUMMARY_OUT, warm: (cacheLeftMs ?? 0) > 0, ttlMs: ttl }),
    quietMs: now - rest.endedAt,
    cacheLeftMs,
    sinceCompactMs: lastCompact === 0 ? undefined : now - lastCompact,
    sinceAutoMs: rest.lastAutoAt === undefined ? undefined : now - rest.lastAutoAt,
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

// Never throws.
async function restLook($: EngineInterface, sessionId: string, turnId: string): Promise<void> {
  const i = io($)
  try {
    if (rest.turnId !== turnId) return
    const mode = await readSetting(i, 'compact.mode')
    if (mode !== 'watch' && mode !== 'auto') return
    const f = await restFacts(i, agentsOf($), sessionId, turnId)
    if (f === undefined) return
    const checks = restChecks(f)
    const ready = restReady(checks)
    const now = await i.now()
    await i.set(REST_KEY(sessionId), { at: now, ready, checks })
    if (!ready) {
      if (f.cacheLeftMs !== undefined && f.cacheLeftMs - REST_QUIET_MS >= CACHE_MARGIN_MS) $.clock.after(REST_QUIET_MS, () => void restLook($, sessionId, turnId))
      return
    }
    if (mode === 'watch') {
      rest.turnId = undefined
      await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, what: WOULD_WHAT, did: true, detail: restDetail(f) })
      return
    }
    if (!autoGivenUp) await runAuto($, sessionId, turnId, f)
  } catch {
    // an automatic step never breaks the session
  }
}

// What a path is, from the engine (a file, a folder, or something else
const probeOf =
  ($: EngineInterface): Probe =>
  async path => {
    try {
      const s = await $.fs.stat(path)
      return { kind: s.kind, size: s.size }
    } catch {
      return undefined
    }
  }

// The helper agents the engine lists as running.
const agentsOf =
  ($: EngineInterface): (() => Promise<number>) =>
  async () =>
    (await $.agent.list()).filter(a => a.status === 'running').length

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
      return { tokensBefore: r.tokensBefore, tokensAfter: r.tokensAfter, outTokens: r.usage?.output_tokens }
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
export async function runCompaction(r: { how: 'button' | 'auto'; sessionId: string; ops: CompactOps; stops?: () => Promise<string | undefined>; because?: string }): Promise<CompactEnd> {
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
    rest.turnId = undefined
    rest.lastAutoAt = await i.now()
    const keep = compactInstructions((await readSetting(i, 'compact.card')) === 'on' ? await keepList(i, r.sessionId) : undefined, saved.shown)
    if (auto) {
      await log('auto-compact starts', r.because)
      if (r.because !== undefined) i.toast(r.because)
    } else {
      await log('compact now (button)')
      i.toast(tr('Compacting the session'), true)
    }
    let refused: unknown
    if (r.ops.direct !== undefined) {
      try {
        const res = await r.ops.direct(keep)
        if (res.skip !== undefined) {
          await log('auto-compact skipped', res.skip)
          return 'skipped'
        }
        await noteCompact(i, r.sessionId, 'plugin', res.tokensBefore, res.tokensAfter, res.outTokens, r.how)
        if (auto) await postNote(i, r.sessionId, saved.name)
        return 'sent'
      } catch (err) {
        refused = err === undefined ? new Error('refused') : err
      }
    }
    try {
      await r.ops.command(keep)
      if (compacting.seenBy !== owner) compacting.sent = { how: r.how, at: await i.now() }
      if (refused !== undefined) await log('auto-compact sent as /compact', `direct call refused: ${why(refused)}`)
      if (auto) await postNote(i, r.sessionId, saved.name)
      return 'sent'
    } catch (err2) {
      if (auto) {
        autoGivenUp = true
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

// Never throws.
export async function runAuto($: EngineInterface, sessionId: string, turnId: string, looked: RestFacts): Promise<void> {
  const ops = opsOf($)
  const stops = async (): Promise<string | undefined> => {
    if (rest.turnId !== turnId) return NEW_TURN
    const fresh = await restFacts(ops.io, ops.agents, sessionId, turnId)
    if (fresh === undefined) return NEW_TURN
    const checks = restChecks(fresh)
    if (restReady(checks)) return undefined
    const first = restScore(fresh).hardStops[0]
    return first !== undefined ? stopWords(first) : (checks.find(c => !c.ok)?.label ?? NEW_TURN)
  }
  await runCompaction({ how: 'auto', sessionId, ops, stops, because: becauseWords(restScore(looked).reasons, tr) })
}

// Keeps what one compaction did to the window: in this session's record (so the next advice uses the real summary size) and in the ledger.
async function noteCompact(i: Io, sessionId: string, trigger: string, before?: number, after?: number, outTokens?: number, how?: Entry['how'], isLedger = true): Promise<void> {
  const now = await i.now()
  const old = await readRecord(i, sessionId)
  await putRecord(i, { sessionId, compacts: withCompact(old?.compacts, { at: now, trigger, before, after, outTokens }) }, true)
  if (isLedger) await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, ...(before === undefined ? {} : { before }), ...(after === undefined ? {} : { after }), ...(how === undefined ? {} : { how }), what: `compacted (${trigger})`, detail: `${before === undefined ? '?' : Math.round(before / 1000)}k to ${after === undefined ? '?' : Math.round(after / 1000)}k tokens${outTokens === undefined ? '' : `, summary output ${outTokens}`}` })
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
    try {
      const i = io($)
      id = await i.sessionId()
      if (e.agentId === undefined) {
        const parts = [(await readSetting(i, 'compact.card')) === 'on' ? await keepList(i, id) : ''].filter(x => x !== '')
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
      if (e.agentId === undefined && e.trigger !== 'precompute' && result.skip === undefined && result.messages.length > 0) {
        const i = io($)
        const rec = await readRecord(i, id)
        await i.set(diffKey(id), compare(filesFromMessages(e.messages ?? []), result.messages[0].text, rec?.branch, await i.now()))
      }
    } catch {
    }
    try {
      // Our own automatic compact does not pass here (a call skips its caller's hooks), so it notes itself
      if (e.agentId === undefined && e.trigger !== 'precompute') {
        if (result.skip === undefined) await noteCompact(io($), id, e.trigger, result.tokensBefore, result.tokensAfter, result.usage?.output_tokens, howNow(await $.clock.now()))
        else await pushLog(io($), LEDGER_KEY, { at: await $.clock.now(), session: id, what: `compaction skipped (${e.trigger})`, detail: result.skip })
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
        rest.turnId = e.turnId
        rest.endedAt = await i.now()
        rest.question = endsWithQuestion(e.answer)
        $.clock.after(REST_LOOK_MS, () => void restLook($, id, e.turnId))
      } catch {
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // A new main turn: the person is back, so the rest the rule waited on is over.
  on('turn.start', { turnId: /(?<cockpit>)/ }, async ($, e, next) => {
    rest.turnId = undefined
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
      const facts = await restFacts(i, agentsOf($), id, rest.turnId ?? '')
      if (facts === undefined) return result
      const r = nudge({ mode, sent, from, facts: restScoreFacts(facts) })
      if (r.sent !== sent) await i.set(key, r.sent)
      return r.note === undefined ? result : { ...result, context: [...(result.context ?? []), r.note] }
    } catch {
      return result
    }
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<cockpit>^(?:Bash|PowerShell)$)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      if ((r.result as { backgroundTaskId?: unknown } | undefined)?.backgroundTaskId !== undefined || (e as { run_in_background?: unknown }).run_in_background === true) rest.background.push(await $.clock.now())
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))
}
