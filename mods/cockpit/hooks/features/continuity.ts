// Continuity (Settings > Prompts and memory): the verified handoff note, the session packet, resume by name, the timeline, search across sessions
import { t, tr } from '../core/lang'
import { fillIn } from '../core/fillin'
import { saidYes } from '../core/confirm'
import type { EngineInterface, On } from 'claude-code'
import { noteCall } from '../core/selfcost'

import { APP_SESSIONS_KEY, SESSIONS_TOOL, matchSession, parseSessions, parseStoredSessions } from '../core/appsessions'
import type { AppSession, AppSessions } from '../core/appsessions'
import { USAGE_SERVER } from '../core/appusage'
import { ymd } from '../core/time'
import { OFF_TEXT, PACKET_PATH, PACKET_WHAT, briefMarkLines, parseBranch, parseGitStatus, relativeTo, renderBrief, renderPacket, storyLines } from '../core/continuity'
import type { BriefFacts, GitFile } from '../core/continuity'
import { FIND_LIMIT, FIND_MIN, NOT_AVAILABLE, findText, jsonArrayIn, lastWork, matchWords, parseCount, parseHits, resumeText, standupLines, timelineText } from '../core/continuity2'
import type { DaySession, TimelineFacts } from '../core/continuity2'
import { commandsKey, parseEntries } from '../core/guardcmds'
import { readNote } from '../core/flush'
import { withToastGate } from '../core/io'
import { homeFrom, lastPart, under } from '../core/platform'
import type { Io } from '../core/io'
import { UNPROVEN_WHAT, readState, stateKey } from '../core/proof'
import { ANOMALY_WHAT, DRIFT_WHAT, readState2, state2Key } from '../core/proof2'
import { DROP_MS, listRecords, readRecord } from '../core/record'
import type { SessionRecord } from '../core/record'
import { readSetting } from '../core/settings'
import { didToday, startOfDay } from '../core/ledger'
import { LEDGER_KEY, pushLog, readLog, setAutoSaver, why } from './compaction'
import { CHECKPOINT_NAME, briefName, briefPath, briefShown } from '../core/autosafe'
import { makeCheckpoint } from '../core/undo'
import { checkWrite, refusedWords, safeWrite } from '../core/safewrite'
import type { SafeFs } from '../core/safewrite'
import type { Probe } from '../core/undo'
import { asksYou } from './home/logic'
import { subArgs, isFolded } from '../core/menu'

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

const GIT_TIMEOUT_MS = 4_000
const LIST_LIMIT = 100
const SEARCH_TOOL = 'search_session_transcripts'

// The reply when the block is off, else undefined.
const offText = async (i: Io): Promise<string | undefined> => {
  return (await readSetting(i, 'brief.mode')) === 'off' ? OFF_TEXT : undefined
}
const failText = (err: unknown): string => `That did not work: ${why(err)}`

type Called = { ok: true; text: string; blocks: number } | { ok: false; why: string }

// Never throws.
async function callApp($: EngineInterface, tool: string, args: Record<string, unknown>): Promise<Called> {
  try {
    noteCall()
    const r = await $.mcp.call(USAGE_SERVER, tool, args)
    const texts = r.content.filter(c => c.type === 'text').map(c => (c as { text?: string }).text ?? '')
    const text = texts.join('\n')
    if (r.isError === true) return { ok: false, why: text.slice(0, 160) || 'the tool reported an error' } // en-only: plain answer of a slash command (text twin)
    return { ok: true, text, blocks: r.content.length }
  } catch {
    // The engine's own error ("no implementation for ...") means nothing to a person: the tool is not there in this kind of session.
    return { ok: false, why: 'It is not offered in this kind of session.' } // en-only: plain answer of a slash command (text twin)
  }
}

// The app's session list, fresh if the tool answers, else the copy the Home pane keeps (with how old it is).
async function sessionList($: EngineInterface, i: Io, archived: boolean): Promise<{ list: AppSessions; fresh: boolean } | undefined> {
  const r = await callApp($, SESSIONS_TOOL, { limit: LIST_LIMIT, ...(archived ? { include_archived: true } : {}) })
  if (r.ok) {
    const list = parseSessions(r.text, await i.now())
    if (list !== undefined) return { list, fresh: true }
  }
  const old = parseStoredSessions(await i.get(APP_SESSIONS_KEY))
  return old === undefined ? undefined : { list: old, fresh: false }
}

const gitRun = async (i: Io, argv: string[]): Promise<string | undefined> => {
  try {
    const r = await i.run(argv, { timeoutMs: GIT_TIMEOUT_MS })
    return r.exitCode === 0 ? r.stdout : undefined
  } catch {
    return undefined
  }
}

const freshRecord = (rec: SessionRecord | undefined, now: number): SessionRecord | undefined => (rec !== undefined && now - rec.updatedAt < DROP_MS ? rec : undefined)

type PrKept = { at?: number; branch?: string; none?: boolean; view?: { number?: number; state?: string; isDraft?: boolean; url?: string } }

const briefFacts = async ($: EngineInterface, i: Io): Promise<BriefFacts> => briefFactsAt(i, await $.session.cwd())

export async function briefFactsAt(i: Io, cwd: string): Promise<BriefFacts> {
  const sid = await i.sessionId()
  const now = await i.now()
  const [branchOut, statusOut] = await Promise.all([gitRun(i, ['git', 'rev-parse', '--abbrev-ref', 'HEAD']), gitRun(i, ['git', '-c', 'core.quotepath=off', 'status', '--short'])])
  const gitBranch = branchOut === undefined ? undefined : parseBranch(branchOut)
  const gitFiles: GitFile[] | undefined = statusOut === undefined ? undefined : parseGitStatus(statusOut)
  const proof = readState(await readNote(i, stateKey(sid)))
  const proof2 = readState2(await readNote(i, state2Key(sid)))
  const rec = freshRecord(await readRecord(i, sid), now)
  const kept = (await i.get(`cockpit:pr:state:${sid}`)) as PrKept | undefined
  let pr: BriefFacts['pr']
  if (typeof kept === 'object' && kept !== null && !(kept.branch !== undefined && gitBranch !== undefined && kept.branch !== gitBranch)) {
    const v = kept.view
    if (v !== undefined && typeof v.number === 'number') pr = { number: v.number, state: typeof v.state === 'string' ? v.state : 'open', isDraft: v.isDraft === true, url: typeof v.url === 'string' ? v.url : '', at: typeof kept.at === 'number' ? kept.at : now }
    else if (kept.none === true) pr = 'none'
  }
  return {
    now,
    cwd,
    proof,
    edited: Object.keys(proof2.files).map(p => relativeTo(cwd, p)),
    ...(gitBranch === undefined ? {} : { gitBranch }),
    ...(gitFiles === undefined ? {} : { gitFiles }),
    ...(rec?.branch === undefined ? {} : { recordBranch: rec.branch }),
    ...(rec?.ask?.kind === 'question' ? { askingSince: rec.ask.since } : {}),
    ...(pr === undefined ? {} : { pr }),
  }
}

export async function briefMarks(i: Io, cwd: string): Promise<ReturnType<typeof briefMarkLines>> {
  return briefMarkLines(await briefFactsAt(i, cwd))
}

const folderName = (path: string): string => lastPart(path)

// ---- Before Auto compacts the chat (core/autosafe.ts) ---- Saves the handoff note (the packet's text) in vaken's own folder under HOME
export async function saveBeforeAuto(i: Io, sessionId: string, cwd: string, probe: Probe): Promise<{ ok: true; name: string; shown: string; checkpoint: boolean } | { ok: false }> {
  try {
    const facts = await briefFactsAt(i, cwd)
    const home = await i.home()
    await i.write(briefPath(home, sessionId), renderPacket(facts, folderName(facts.cwd)))
    let checkpoint = false
    try {
      checkpoint = (await makeCheckpoint(i, probe, sessionId, CHECKPOINT_NAME)).ok
    } catch {
      checkpoint = false
    }
    return { ok: true, name: briefName(sessionId), shown: briefShown(sessionId, home), checkpoint }
  } catch {
    return { ok: false }
  }
}

// The engine's file calls a safe write needs (core/safewrite.ts).
const safeFs = ($: EngineInterface): SafeFs => ({ stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) })

async function packetText($: EngineInterface, i: Io): Promise<string> {
  const facts = await briefFacts($, i)
  const path = under(facts.cwd, PACKET_PATH)
  // A link at the packet, or at the .claude folder, is never followed.
  const fs = safeFs($)
  if (!(await checkWrite(fs, facts.cwd, path)).ok) return refusedWords(path, tr)
  let exists = false
  try {
    exists = (await i.read(path)) !== ''
  } catch {
    exists = false
  }
  let answer: string
  const buttons = { yes: t('engines.packet_write_it'), no: t('engines.packet_do_not_write') }
  try {
    answer = await i.ask(fillIn(tr(exists ? 'Write the session packet to {path}? It replaces the file that is there.' : 'Write the session packet to {path}?'), { path }), [buttons.yes, buttons.no])
  } catch {
    return 'Nothing was written: the question was not answered.' // en-only: plain answer of a slash command (text twin)
  }
  if (!saidYes(answer, buttons)) return 'Nothing was written.' // en-only: plain answer of a slash command (text twin)
  const text = renderPacket(facts, folderName(facts.cwd))
  if (!(await safeWrite(fs, (p, x) => i.write(p, x), facts.cwd, path, text)).ok) return refusedWords(path, tr)
  const lines = text.split('\n').length
  await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: PACKET_WHAT, detail: `${PACKET_PATH}, ${lines} lines`, how: 'typed', did: true })
  i.toast(tr('Session packet written.'))
  i.invalidate()
  return [`Wrote ${path} (${lines} lines).`, 'The next session can read it first. It holds counts, names, paths and your goal (key words of your first message, or the sentence you set; secrets hidden), and no other conversation text.', `Git will show it as a new file. Add ${PACKET_PATH} to .gitignore if you do not want to commit it.`].join('\n') // en-only: plain answer of a slash command (text twin)
}

async function timelineFacts(i: Io): Promise<TimelineFacts> {
  const sid = await i.sessionId()
  const rec = await readRecord(i, sid)
  return {
    ...(rec === undefined ? {} : { rec }),
    proof: readState(await readNote(i, stateKey(sid))),
    proof2: readState2(await readNote(i, state2Key(sid))),
    cmds: parseEntries(await readNote(i, commandsKey(sid))),
    ledger: (await readLog(i, LEDGER_KEY)).filter(e => e.session === sid),
  }
}

async function storyText(i: Io): Promise<string> {
  const sid = await i.sessionId()
  const now = await i.now()
  const proof = readState(await readNote(i, stateKey(sid)))
  const mine = (await readLog(i, LEDGER_KEY)).filter(e => e.session === sid)
  const rec = freshRecord(await readRecord(i, sid), now)
  return storyLines({
    proof,
    anomalies: mine.filter(e => e.what === ANOMALY_WHAT || e.what === DRIFT_WHAT).length,
    unproven: mine.filter(e => e.what === UNPROVEN_WHAT).length,
    ...(rec?.ask?.kind === 'question' ? { askingSince: rec.ask.since } : {}),
  }).join('\n')
}

async function standupText($: EngineInterface, i: Io): Promise<string> {
  const now = await i.now()
  const day = startOfDay(now)
  const app = await sessionList($, i, false)
  const records = new Map((await listRecords(i)).map(r => [r.sessionId, r]))
  const prefix = stateKey('')
  const sessions: DaySession[] = []
  for (const key of (await i.keys()).filter(k => k.startsWith(prefix))) {
    const sid = key.slice(prefix.length)
    const p = readState(await i.get(key))
    const rec = records.get(sid) ?? (await readRecord(i, sid))
    if (lastWork(p, rec) < day || (p.edits === 0 && p.receipts.length === 0)) continue
    const p2 = readState2(await readNote(i, state2Key(sid)))
    const todays = p2.changes.filter(c => c.at >= day)
    const files = rec !== undefined && rec.startedAt >= day ? p.files.length : todays.reduce((n, c) => n + c.files, 0)
    const match: AppSession | undefined = rec === undefined ? undefined : matchSession(app?.list, { sessionId: sid, cwd: rec.cwd })
    const name = match?.title || rec?.title || (rec === undefined ? sid.slice(0, 8) : folderName(rec.cwd))
    sessions.push({ name, ...(p.goal === undefined ? {} : { goal: p.goal.text }), files, edits: p.edits, debt: p.debt, asking: rec !== undefined && freshRecord(rec, now) !== undefined && asksYou(rec, now) })
  }
  let usd = 0
  let costSessions = 0
  const costPrefix = `cockpit:cost:day:${ymd(now)}:`
  for (const k of (await i.keys()).filter(x => x.startsWith(costPrefix))) {
    const v = (await i.get(k)) as { usd?: unknown } | undefined
    if (typeof v?.usd === 'number') {
      usd += v.usd
      costSessions += 1
    }
  }
  const actions = didToday(await readLog(i, LEDGER_KEY), now).reduce((n, d) => n + d.n, 0)
  if (sessions.length === 0) return `Nothing to report yet today: no session has changed a file or run a check. Vaken acted ${actions} times.`
  return [...standupLines({ now, sessions, cockpitActions: actions, ...(costSessions === 0 ? {} : { costUsd: usd }), costSessions }), ...(app === undefined || app.fresh ? [] : ['(Session names may be old: the app did not answer.)'])].join('\n')
}

async function resumeText_($: EngineInterface, i: Io, words: string): Promise<string> {
  const got = await sessionList($, i, false)
  if (got === undefined) return NOT_AVAILABLE('session list', 'Open the sidebar and look for the session by hand.') // en-only: plain answer of a slash command (text twin)
  const rows = words === '' ? [...got.list.sessions].sort((a, b) => (Date.parse(b.lastActivityAt ?? '') || 0) - (Date.parse(a.lastActivityAt ?? '') || 0)) : matchWords(got.list.sessions, words)
  return resumeText(words, rows, await i.now(), got.fresh ? "the app's session list" : 'the last list vaken kept (the app did not answer)') // en-only: plain answer of a slash command (text twin)
}

async function findAnswer($: EngineInterface, i: Io, query: string): Promise<string> {
  if (query.length < FIND_MIN) return `Type at least ${FIND_MIN} characters: /vaken-resume find <words>. It searches what was said in your other sessions.`
  const r = await callApp($, SEARCH_TOOL, { query, limit: FIND_LIMIT })
  if (!r.ok) return NOT_AVAILABLE('search tool', r.why) // en-only: plain answer of a slash command (text twin)
  const hits = parseHits(r.text)
  if (hits === undefined) return NOT_AVAILABLE('search tool', 'It answered in a form vaken does not know.') // en-only: plain answer of a slash command (text twin)
  const links = new Map<string, string>()
  if (hits.length > 0) {
    const got = await sessionList($, i, true)
    for (const s of got?.list.sessions ?? []) if (s.link !== undefined) links.set(s.id, s.link)
  }
  return findText(query, hits, links, await i.now())
}

async function briefCommand($: EngineInterface, i: Io): Promise<string> {
  try {
    return (await offText(i)) ?? renderBrief(await briefFacts($, i)).join('\n')
  } catch (err) {
    return failText(err)
  }
}

async function packetCommand($: EngineInterface, i: Io): Promise<string> {
  try {
    return (await offText(i)) ?? (await packetText($, i))
  } catch (err) {
    return failText(err)
  }
}

async function resumeCommand($: EngineInterface, i: Io, args: string): Promise<string> {
  try {
    return (await offText(i)) ?? (await resumeText_($, i, args))
  } catch (err) {
    return failText(err)
  }
}

async function findCommand($: EngineInterface, i: Io, args: string): Promise<string> {
  try {
    return (await offText(i)) ?? (await findAnswer($, i, args))
  } catch (err) {
    return failText(err)
  }
}

async function standupCommand($: EngineInterface, i: Io): Promise<string> {
  try {
    return (await offText(i)) ?? (await standupText($, i))
  } catch (err) {
    return failText(err)
  }
}

async function storyCommand(i: Io): Promise<string> {
  try {
    return (await offText(i)) ?? (await storyText(i))
  } catch (err) {
    return failText(err)
  }
}

async function timelineCommand(i: Io, args: string): Promise<string> {
  try {
    const off = await offText(i)
    if (off !== undefined) return off
    const n = parseCount(args)
    if (n === undefined) return 'Type a number: /vaken-resume timeline 20 shows the last 20 events.' // en-only: plain answer of a slash command (text twin)
    return timelineText(await timelineFacts(i), n, await i.now())
  } catch (err) {
    return failText(err)
  }
}

export function registerContinuity(on: On): void {
  setAutoSaver(saveBeforeAuto)
  on('session.start', { cwd: /(?<continuity>)/ }, async ($, e, next) => {
    try {
      await $.command.register({ name: 'vaken-resume', description: 'Find a session by words in its title or folder. A word after it runs a part: find, timeline.', argumentHint: 'find | timeline | <words>', immediate: true })
    } catch {
      // the commands are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'brief')
    if (rest0 === undefined) return next(e0)
    return { text: await briefCommand($, io($)) }
  })
  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'packet')
    if (rest0 === undefined) return next(e0)
    return { text: await packetCommand($, io($)) }
  })
  on('command.run', { command: 'vaken-resume' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    return { text: await resumeCommand($, io($), e.args.trim()) }
  })
  on('command.run', { command: 'vaken-resume' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'find')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    return { text: await findCommand($, io($), e.args.trim()) }
  })
  on('command.run', { command: 'vaken-today' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'standup')
    if (rest0 === undefined) return next(e0)
    return { text: await standupCommand($, io($)) }
  })
  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'story')
    if (rest0 === undefined) return next(e0)
    return { text: await storyCommand(io($)) }
  })
  on('command.run', { command: 'vaken-resume' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'timeline')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    return { text: await timelineCommand(io($), e.args.trim()) }
  })
}
