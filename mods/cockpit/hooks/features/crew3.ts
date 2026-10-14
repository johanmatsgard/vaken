// Crew: shared-resource registry (`/vaken-help run ports`, and a note to Claude before a server starts on a port another session holds)
import { isShellTool } from '../core/tools'
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'
import { noteRun } from '../core/selfcost'

import { quietly } from '../core/quiet'
import { ymd } from '../core/time'
import { sessionName } from '../core/crew'
import { AWAKE_WHAT, FOLDERS_KEY, PORT_WHAT, isPath, learnFolders, liveFolders, parseFolders } from '../core/crew3'
import type { Folder, Live } from '../core/crew3'
import { CI_MAX_TRIES, GH_NO_READ, GIT_TIMEOUT_MS, MAX_WORKTREES, NO_GIT_PROGRAM, MERGE_EVERY_MS, NOT_GIT, PR_LIST_ARGV, SAFE_TOAST_MIN, WORKTREE_LIST_ARGV, digestArgv, digestText, ghNeedsGit, ghNoAnswer, gitNoAnswer, isNotGit, isStartFailure, mergeOrder, mergeText, parseBase, parseMerged, parseNumstat, parsePrListText, parseStatusCount, parseWorktrees, safeRows, worktreesText } from '../core/crew3git'
import { buildCiFix } from '../core/prcard'
import { AWAKE_CAP_DETAIL, AWAKE_CAP_WHAT, AWAKE_PHONE_KEY, AWAKE_SINCE_KEY, REASONS, awakeNow, awayOf, chainAfterStart, chainCapped, latestPhone, parseAwakeArgs, parseChain, setAwakeShown, touchDue, waitingFrom, wantOf, whyLine } from '../core/awakeplan'
import type { AwakeFacts, AwakeNow } from '../core/awakeplan'
import { BOARD_KEY, parseBoard, runningCount } from '../core/agentboard'
import { LAPTOP_KEY } from '../core/crewlaptop'
import type { Laptop } from '../core/crewlaptop'
import type { Placed, WtRow, WtScan } from '../core/crew3git'
import { AWAKE_AT_KEY, AWAKE_HOLD_S, AWAKE_PID_KEY, MAX_CWD_LOOKUPS, PROC_TIMEOUT_MS, PS_ARGV, LISTEN_ARGV, awakeDetail, awakePlan, awakeText, candidates, cwdArgv, findOrphans, orphansText, parseCwds, parseListeners, parsePid, parsePs, portDetail, portNote, portToast, portsText, resolveHolders, serverStart, workingNow } from '../core/crew3proc'
import type { PortHolder } from '../core/crew3proc'
import { GH_TIMEOUT_MS, isNoPr } from '../core/crewpr'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { hasProgram, platformOnce } from '../core/procs'
import { awakeStartArgv, holdProgram, stopOwnHold } from '../core/awakehold'
import { WIN_NO_PROGRAM, WIN_NO_START, WIN_NOTHING } from '../core/awakewords'
import { sysWord } from '../core/syswords'
import { readWinListeners } from '../core/winnet'
import { cwdsFromCommands, readWinProcs } from '../core/winprocs'
import type { ProcPlatform } from '../core/procs'
import { listRecords, readRecord, STALE_MS } from '../core/record'
import { readSetting, writeSetting } from '../core/settings'
import { tellsClaude } from '../core/tellclaude'
import { LEDGER_KEY, pushLog } from './compaction'
import type { Entry } from './compaction'
import { serialUpdate } from '../core/serial'
import { armOnce } from './everyonce'
import { subArgs } from '../core/menu'

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

const TICK_MS = 30_000
const FOLDERS_EVERY_MS = 60_000
const WT_EVERY_MS = 30 * 60_000
const WT_CACHE_MS = 2 * 60_000
const WT_TOAST_KEY = 'cockpit:worktrees:toast'
const SEND_DELAY_MS = 1_500
const TOLD_MAX = 200

type Ran = { code: number; out: string; err: string }
// A program that cannot start or does not finish in time answers undefined; the caller says so in words.
async function run($: EngineInterface, argv: readonly string[], timeoutMs: number): Promise<Ran | undefined> {
  try {
    noteRun()
    const r = await $.process.run(argv, { timeoutMs })
    noStart.delete(argv[0] ?? '')
    return { code: r.exitCode, out: r.stdout, err: r.stderr }
  } catch (e) {
    if (isStartFailure(e instanceof Error ? e.message : String(e))) noStart.add(argv[0] ?? '')
    else noStart.delete(argv[0] ?? '')
    return undefined
  }
}
const noStart = new Set<string>()

// The same runner for the process helpers (core/procs.ts): counted, never `$` passed on.
const runOf = ($: EngineInterface): Io['run'] => (argv, init) => {
  noteRun()
  return $.process.run(argv, init)
}
let platGet: (() => Promise<ProcPlatform>) | undefined
const platOf = ($: EngineInterface): Promise<ProcPlatform> => (platGet ??= platformOnce(() => $.env.get('OS')))()

let ghProbe: Promise<boolean> | undefined
const hasGh = ($: EngineInterface): Promise<boolean> => {
  ghProbe ??= platOf($).then(plat => hasProgram(runOf($), plat, 'gh', 3_000))
  return ghProbe
}
const NO_GH = 'The gh program was not found, so vaken cannot ask GitHub. Install it from cli.github.com and sign in.' // en-only: plain answer of a slash command (text twin)

type Sessions = { me: string; myCwd: string; folders: Folder[]; live: Live; pids: Set<number>; home: string }

async function sessions($: EngineInterface, i: Io): Promise<Sessions> {
  const now = await i.now()
  const home = await i.home()
  const me = await i.sessionId()
  const myCwd = await $.session.cwd()
  const records = await listRecords(i)
  const live = liveFolders(records, now, STALE_MS)
  if (!(live.get(myCwd) ?? []).includes(me)) live.set(myCwd, [...(live.get(myCwd) ?? []), me])
  const seen = records.filter(r => live.has(r.cwd) && now - r.updatedAt <= STALE_MS).map(r => ({ cwd: r.cwd, name: sessionName(r) }))
  seen.push({ cwd: myCwd, name: sessionName({ cwd: myCwd, branch: records.find(r => r.sessionId === me)?.branch }) })
  const folders = learnFolders(parseFolders(await i.get(FOLDERS_KEY)), seen, now, home)
  const pids = new Set(records.map(r => r.pid).filter((p): p is number => p !== undefined))
  return { me, myCwd, folders, live, pids, home }
}

let foldersAt = 0
async function rememberFolders($: EngineInterface): Promise<void> {
  const i = io($)
  const now = await i.now()
  if (now - foldersAt < FOLDERS_EVERY_MS) return
  foldersAt = now
  await i.set(FOLDERS_KEY, (await sessions($, i)).folders)
}

async function portSnapshot($: EngineInterface, i: Io): Promise<{ holders: PortHolder[]; listed: boolean }> {
  if ((await platOf($)) === 'win32') return portSnapshotWin($, i)
  const l = await run($, LISTEN_ARGV, PROC_TIMEOUT_MS)
  if (l === undefined || (l.code !== 0 && l.code !== 1)) return { holders: [], listed: false }
  const listeners = parseListeners(l.out)
  const pids = [...new Set(listeners.map(x => x.pid))].slice(0, MAX_CWD_LOOKUPS)
  const cwds = pids.length === 0 ? new Map<number, string>() : parseCwds((await run($, cwdArgv(pids), PROC_TIMEOUT_MS))?.out ?? '')
  const s = await sessions($, i)
  return { holders: resolveHolders(listeners, cwds, s.folders, s.live, s.me), listed: true }
}

async function portSnapshotWin($: EngineInterface, i: Io): Promise<{ holders: PortHolder[]; listed: boolean }> {
  const r = runOf($)
  const listeners = await readWinListeners(r, PROC_TIMEOUT_MS)
  if (listeners === undefined) return { holders: [], listed: false }
  const pids = [...new Set(listeners.map(x => x.pid))].slice(0, MAX_CWD_LOOKUPS)
  const s = await sessions($, i)
  const procs = pids.length === 0 ? [] : ((await readWinProcs(r, await i.now(), pids)) ?? [])
  const cwds = cwdsFromCommands(procs, s.folders.map(f => f.cwd))
  return { holders: resolveHolders(listeners, cwds, s.folders, s.live, s.me), listed: true }
}

const told = new Set<string>()

type WtRead = { at?: number; cwd?: string; scan?: WtScan; error?: string }
let wtCache: (WtRead & { at: number; cwd: string }) | undefined
let wtBusy = false
let wtTriedAt = 0

type BaseInfo = { base: string; known: boolean; notGit: boolean }
async function findBase($: EngineInterface): Promise<BaseInfo> {
  const sym = await run($, ['git', 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], GIT_TIMEOUT_MS)
  const named = sym !== undefined && sym.code === 0 ? parseBase(sym.out) : undefined
  if (named !== undefined) return { base: named, known: true, notGit: false }
  if (sym !== undefined && isNotGit(sym.err)) return { base: 'main', known: false, notGit: true }
  for (const c of ['main', 'master']) {
    const v = await run($, ['git', 'rev-parse', '--verify', '--quiet', c], GIT_TIMEOUT_MS)
    if (v !== undefined && v.code === 0) return { base: c, known: true, notGit: false }
  }
  return { base: 'main', known: false, notGit: false }
}

async function scanWorktrees($: EngineInterface, i: Io, force: boolean): Promise<WtRead> {
  const now = await i.now()
  const cwd = await $.session.cwd()
  if (wtCache !== undefined && wtCache.cwd === cwd && now - wtCache.at < (force ? 20_000 : WT_CACHE_MS)) return wtCache
  if (wtBusy) return wtCache ?? { error: 'A check is running. Ask again in a moment.' } // en-only: plain answer of a slash command (text twin)
  wtBusy = true
  try {
    const list = await run($, WORKTREE_LIST_ARGV, GIT_TIMEOUT_MS)
    if (list === undefined || list.code !== 0) return (wtCache = { at: now, cwd, error: list === undefined ? gitNoAnswer(noStart.has('git')) : NOT_GIT })
    const all = parseWorktrees(list.out)
    const { base, known } = await findBase($)
    const merged = parseMerged((await run($, ['git', 'branch', '--merged', base], GIT_TIMEOUT_MS))?.out ?? '')
    const baseSha = (await run($, ['git', 'rev-parse', base], GIT_TIMEOUT_MS))?.out.trim() ?? ''
    const s = await sessions($, i)
    const rows: WtRow[] = []
    for (const [n, wt] of all.slice(0, MAX_WORKTREES).entries()) {
      const gone = wt.prunable || wt.bare
      const st = gone ? undefined : await run($, ['git', '-C', wt.path, 'status', '--porcelain'], GIT_TIMEOUT_MS)
      const lg = gone ? undefined : await run($, ['git', '-C', wt.path, 'log', '-1', '--format=%ct'], GIT_TIMEOUT_MS)
      const secs = Number(lg?.out.trim())
      rows.push({
        wt,
        isMain: n === 0,
        dirty: st !== undefined && st.code === 0 ? parseStatusCount(st.out) : undefined,
        lastCommitAt: lg !== undefined && lg.code === 0 && Number.isFinite(secs) && secs > 0 ? secs * 1000 : undefined,
        merged: wt.branch !== undefined && merged.has(wt.branch),
        atBase: baseSha !== '' && wt.head === baseSha,
        live: [...s.live.keys()].some(c => isPath(c, wt.path)),
      })
    }
    return (wtCache = { at: now, cwd, scan: { at: now, base, baseKnown: known, rows, cut: all.length > MAX_WORKTREES } })
  } catch {
    return { error: 'The worktrees could not be read.' } // en-only: plain answer of a slash command (text twin)
  } finally {
    wtBusy = false
  }
}

// The day is kept in the shared store, so the sessions do not each make a toast.
async function worktreeToast($: EngineInterface): Promise<void> {
  const i = io($)
  try {
    if ((await readSetting(i, 'crew.worktrees')) !== 'on') return
    const now = await i.now()
    if (now - wtTriedAt < WT_EVERY_MS) return
    wtTriedAt = now
    const day = ymd(now)
    if ((await i.get(WT_TOAST_KEY)) === day) return
    const r = await scanWorktrees($, i, false)
    const safe = r.scan === undefined ? [] : safeRows(r.scan)
    if (safe.length < SAFE_TOAST_MIN) return
    await i.set(WT_TOAST_KEY, day)
    i.toast(tr('{n} folder copies of the project (worktrees) are safe to remove. Type /vaken-ship worktrees to see the commands.').replace('{n}', String(safe.length)))
  } catch {
  }
}

const mergeCache = new Map<string, { at: number; placed: Placed[]; error?: string }>()

async function mergeRead($: EngineInterface, i: Io): Promise<{ at: number; placed: Placed[]; error?: string }> {
  const now = await i.now()
  const cwd = await $.session.cwd()
  const kept = mergeCache.get(cwd)
  if (kept !== undefined && now - kept.at < MERGE_EVERY_MS) return kept
  let out: { at: number; placed: Placed[]; error?: string }
  if (!(await hasGh($))) out = { at: now, placed: [], error: NO_GH }
  else {
    const r = await run($, PR_LIST_ARGV, GH_TIMEOUT_MS)
    if (r === undefined) out = { at: now, placed: [], error: ghNoAnswer(noStart.has('gh'), NO_GH) }
    else if (r.code !== 0 && isNotGit(r.err)) out = { at: now, placed: [], error: NOT_GIT }
    else if (r.code !== 0) out = { at: now, placed: [], error: isNoPr(r.err) ? 'no open pull requests.' : ghNeedsGit(r.err) ? NO_GIT_PROGRAM : GH_NO_READ } // en-only: plain answer of a slash command (text twin)
    else out = { at: now, placed: mergeOrder(parsePrListText(r.out)) }
  }
  mergeCache.set(cwd, out)
  if (mergeCache.size > 20) mergeCache.delete([...mergeCache.keys()][0] as string)
  return out
}

async function branchOf($: EngineInterface, i: Io): Promise<string | undefined> {
  const named = (await readRecord(i, await i.sessionId()))?.branch
  if (named !== undefined && named !== '') return named
  const r = await run($, ['git', 'rev-parse', '--abbrev-ref', 'HEAD'], GIT_TIMEOUT_MS)
  const b = r !== undefined && r.code === 0 ? r.out.trim() : ''
  return b === '' ? undefined : b
}

async function ciFix($: EngineInterface, i: Io, send: boolean): Promise<string> {
  if (!(await hasGh($))) return `Fix CI: ${NO_GH}`
  const built = await buildCiFix(i, () => branchOf($, i))
  if (built.kind !== 'prompt') return built.text
  const { head, prompt } = built
  if (!send) return [head, 'This is the prompt. Nothing was sent. To put it in the prompt box, run /vaken-ship ci-fix send.', '', prompt].join('\n') // en-only: plain answer of a slash command (text twin)
  // Put it in the prompt box a moment after this command ends (a call cannot run inside the command that waits for it).
  $.clock.after(SEND_DELAY_MS, () => {
    void (async () => {
      try {
        await $.prompt.fill({ text: prompt })
        i.toast(tr('The fix prompt is in the prompt box. Press Enter to send it.'))
      } catch {
        i.toast(tr('Could not fill the prompt box. Run /vaken-ship ci-fix to see the prompt.'))
      }
    })()
  })
  return `${head}\nPutting the prompt in the prompt box in a moment. Press Enter to send it; nothing is sent for you. After ${CI_MAX_TRIES} tries in 24 hours it builds no new prompt.`
}

async function digest($: EngineInterface, i: Io): Promise<string> {
  const { base, known, notGit } = await findBase($)
  if (notGit) return NOT_GIT
  if (!known) return 'Branch digest: the main branch could not be found (no origin/HEAD, no main, no master), so there is nothing to compare with.' // en-only: plain answer of a slash command (text twin)
  const a = digestArgv(base)
  const n = await run($, a.numstat, GIT_TIMEOUT_MS)
  if (n !== undefined && isNotGit(n.err)) return NOT_GIT
  if (n === undefined || n.code !== 0) return `Branch digest: git could not compare with ${base}.`
  const l = await run($, a.log, GIT_TIMEOUT_MS)
  const commits = l !== undefined && l.code === 0 ? l.out.split(/\r?\n/).map(x => x.trim()).filter(x => x !== '') : []
  return digestText(base, commits, parseNumstat(n.out), await branchOf($, i))
}

let canHoldProbe: Promise<boolean> | undefined
const canHold = ($: EngineInterface): Promise<boolean> => {
  canHoldProbe ??= platOf($).then(plat => hasProgram(runOf($), plat, holdProgram(plat), 3_000))
  return canHoldProbe
}
let awakeBusy = false
let awakeNote: string | undefined

async function stopHold($: EngineInterface, pid: unknown, at: unknown, now: number): Promise<void> {
  await stopOwnHold(runOf($), await platOf($), pid, at, now, 3_000)
}

async function awakeFacts(i: Io, records: Awaited<ReturnType<typeof listRecords>>, now: number): Promise<AwakeFacts> {
  const phoneAt = latestPhone(await i.get(AWAKE_PHONE_KEY))
  const laptop = (await i.get(LAPTOP_KEY)) as Laptop | undefined
  return {
    working: workingNow(records, now),
    ...(phoneAt === undefined ? {} : { phoneAt }),
    waiting: waitingFrom(records, now),
    background: runningCount(parseBoard(await i.get(BOARD_KEY)), now),
    ...(typeof laptop === 'object' && laptop !== null ? { laptop } : {}),
  }
}

async function awakeTick($: EngineInterface): Promise<void> {
  if (awakeBusy) return
  awakeBusy = true
  const i = io($)
  try {
    const mode = await readSetting(i, 'awake.mode')
    const pid = await i.get(AWAKE_PID_KEY)
    const at = await i.get(AWAKE_AT_KEY)
    if (mode !== 'on' && pid === undefined) {
      setAwakeShown(undefined)
      return
    }
    const now = await i.now()
    const plat = await platOf($)
    const away = awayOf(await readSetting(i, 'awake.away'))
    const facts = await awakeFacts(i, await listRecords(i), now)
    const chain = parseChain(await i.get(AWAKE_SINCE_KEY))
    const state = awakeNow(mode, away, facts, chain, now)
    setAwakeShown(state, plat)
    const plan = awakePlan(mode, wantOf(state), pid, at, now)
    if (plan.action === 'none') {
      if (state.capped && chain !== undefined && touchDue(chain, now)) await i.set(AWAKE_SINCE_KEY, chainCapped(chain, now))
      return
    }
    if (plan.action === 'stop') {
      await stopHold($, pid, at, now)
      await i.del(AWAKE_PID_KEY)
      await i.del(AWAKE_AT_KEY)
      if (state.capped && chain !== undefined) {
        // The 8 hour limit ended the chain: say so once, and remember it so the next minute does not start again.
        await i.set(AWAKE_SINCE_KEY, chainCapped(chain, now))
        await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: AWAKE_CAP_WHAT, detail: sysWord(AWAKE_CAP_DETAIL, plat), how: 'auto', did: true })
        i.invalidate()
      } else if (state.held === undefined && chain !== undefined) await i.del(AWAKE_SINCE_KEY)
      return
    }
    if (!(await canHold($))) {
      awakeNote = plat === 'win32' ? WIN_NO_PROGRAM : 'The caffeinate program was not found, so the Mac cannot be held awake.' // en-only: plain answer of a slash command (text twin)
      return
    }
    const started = await run($, awakeStartArgv(plat), PROC_TIMEOUT_MS)
    const next = started !== undefined && started.code === 0 ? parsePid(started.out) : undefined
    if (next === undefined) {
      awakeNote = plat === 'win32' ? WIN_NO_START : 'The hold could not be started.' // en-only: plain answer of a slash command (text twin)
      return
    }
    awakeNote = undefined
    await i.set(AWAKE_PID_KEY, next)
    await i.set(AWAKE_AT_KEY, now)
    const spell = chainAfterStart(chain, now)
    await i.set(AWAKE_SINCE_KEY, spell)
    // The old hold (a renewal) is stopped after the new one runs, so the Mac is never without one.
    if (typeof pid === 'number' && pid !== next) await stopHold($, pid, at, now)
    // One ledger line per awake spell: a spell is the chain of holds (core/awakeplan.ts), so a renewal
    const why = state.held === undefined ? undefined : REASONS[state.held.reason].why
    const heldMs = now - spell.since + AWAKE_HOLD_S * 1000
    if (spell.since === now) {
      await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: AWAKE_WHAT, detail: awakeDetail(facts.working, why, plat), how: 'auto', did: true })
      i.invalidate()
    } else {
      await serialUpdate(i, LEDGER_KEY, old => (Array.isArray(old) ? (old as Entry[]).map(e => (e.what === AWAKE_WHAT && e.at === spell.since ? { ...e, detail: awakeDetail(facts.working, why, plat, heldMs) } : e)) : old))
      i.invalidate()
    }
  } catch {
    // the guard never breaks the session; the hold ends by itself within 10 minutes
  } finally {
    awakeBusy = false
  }
}

// On also sets Keep awake when away to Phone only, unless the person chose Waiting 2h.
async function awakeSwitch(i: Io, to: 'on' | 'off', plat: ProcPlatform): Promise<string> {
  await writeSetting(i, 'awake.mode', to)
  if (to === 'on') {
    if ((await readSetting(i, 'awake.away')) !== 'waiting') await writeSetting(i, 'awake.away', 'phone')
    i.invalidate()
    return sysWord('Keep Mac awake is on. The Mac stays awake while a session works and while a phone is connected, up to 8 hours in a row. Closing the lid still sleeps the Mac. Type /vaken-help run awake off to turn it off.', plat) // en-only: plain answer of a slash command (text twin)
  }
  i.invalidate()
  return sysWord('Keep Mac awake is off. The hold ends within a minute.', plat) // en-only: plain answer of a slash command (text twin)
}

async function orphansWin($: EngineInterface, i: Io): Promise<string> {
  const procs = await readWinProcs(runOf($), await i.now())
  if (procs === undefined) return orphansText([], { ps: false, lsof: false }, 'win32')
  const s = await sessions($, i)
  const cands = candidates(procs, { selfPids: s.pids }).sort((a, b) => b.ageS - a.ageS).slice(0, MAX_CWD_LOOKUPS)
  const wl = await run($, WORKTREE_LIST_ARGV, GIT_TIMEOUT_MS)
  const worktrees = wl !== undefined && wl.code === 0 ? parseWorktrees(wl.out).slice(1).map(w => w.path) : []
  const cwds = cwdsFromCommands(cands, [...worktrees, ...s.folders.map(f => f.cwd)])
  const found = findOrphans(cands, cwds, { folders: s.folders, live: s.live, worktrees, selfPids: s.pids })
  return orphansText(found, { ps: true, lsof: cands.length === 0 || cwds.size > 0 }, 'win32')
}

async function orphans($: EngineInterface, i: Io): Promise<string> {
  if ((await platOf($)) === 'win32') return orphansWin($, i)
  const ps = await run($, PS_ARGV, PROC_TIMEOUT_MS)
  if (ps === undefined || ps.code !== 0) return orphansText([], { ps: false, lsof: false })
  const s = await sessions($, i)
  const procs = parsePs(ps.out)
  const cands = candidates(procs, { selfPids: s.pids }).sort((a, b) => b.ageS - a.ageS).slice(0, MAX_CWD_LOOKUPS)
  const lsof = cands.length === 0 ? undefined : await run($, cwdArgv(cands.map(p => p.pid)), PROC_TIMEOUT_MS)
  const cwds = parseCwds(lsof?.out ?? '')
  const wl = await run($, WORKTREE_LIST_ARGV, GIT_TIMEOUT_MS)
  const worktrees = wl !== undefined && wl.code === 0 ? parseWorktrees(wl.out).slice(1).map(w => w.path) : []
  const found = findOrphans(cands, cwds, { folders: s.folders, live: s.live, worktrees, selfPids: s.pids })
  return orphansText(found, { ps: true, lsof: cands.length === 0 || (lsof !== undefined && cwds.size > 0) })
}

export function registerCrew3(on: On): void {
  on('session.start', { cwd: /(?<crew3>)/ }, async ($, e, next) => {
    try {
      const slow = quietly('crew3', () => $.clock.now(), () => {
        void rememberFolders($).catch(() => undefined)
        void worktreeToast($)
      })
      armOnce('crew3', $.clock.every(TICK_MS, () => {
        slow()
        void awakeTick($)
      }))
    } catch {
      // the commands and the timer are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<crew3ports>)/ }, async ($, e, next) => {
    if (!isShellTool(e.tool)) return next(e)
    const i = io($)
    let note: string | undefined
    try {
      if ((await readSetting(i, 'crew.ports')) !== 'off') {
        const command = (e as unknown as Record<string, unknown>).command
        const start = typeof command === 'string' ? serverStart(command) : undefined
        if (start !== undefined) {
          const snap = await portSnapshot($, i)
          for (const port of start.ports) {
            const h = snap.holders.find(x => x.port === port && (x.kind === 'other' || x.kind === 'ended'))
            if (h === undefined) continue
            const key = `${port}:${h.folder?.cwd ?? ''}`
            if (told.has(key)) continue
            if (told.size > TOLD_MAX) told.clear()
            told.add(key)
            note = portNote(h, start.exact)
            await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: PORT_WHAT, detail: portDetail(h), how: 'auto', did: true })
            i.toast(portToast(h))
            break
          }
        }
      }
    } catch {
      note = undefined
    }
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the command twice.
    try {
      if (note !== undefined && result.deny === undefined && (await tellsClaude(i))) return { ...result, context: [...(result.context ?? []), note] }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'ports')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const snap = await portSnapshot($, i)
    return { text: portsText(await readSetting(i, 'crew.ports'), snap.holders, snap.listed, e.args.trim().toLowerCase() === 'all', await platOf($)) }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'worktrees')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const r = await scanWorktrees($, i, true)
    return { text: worktreesText(await readSetting(i, 'crew.worktrees'), r.scan, r.error, await i.now(), e.args.trim().toLowerCase() === 'all') }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'merge-order')
    if (rest0 === undefined) return next(e0)
    const i = io($)
    const r = await mergeRead($, i)
    return { text: mergeText(r.placed, r.at, await i.now(), r.error) }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'ci-fix')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    return { text: await ciFix($, i, e.args.trim().toLowerCase() === 'send') }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'digest-branch')
    if (rest0 === undefined) return next(e0)
    return { text: await digest($, io($)) }
  })

  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'awake')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const ask = parseAwakeArgs(e.args)
    const head = ask === 'status' ? '' : `${await awakeSwitch(i, ask, await platOf($))}\n\n`
    const now = await i.now()
    const mode = await readSetting(i, 'awake.mode')
    const away = awayOf(await readSetting(i, 'awake.away'))
    const records = await listRecords(i)
    const facts = await awakeFacts(i, records, now)
    const state: AwakeNow = awakeNow(mode, away, facts, parseChain(await i.get(AWAKE_SINCE_KEY)), now)
    const plat = await platOf($)
    const why = whyLine(state, undefined, plat) ?? (mode === 'on' ? (plat === 'win32' ? WIN_NOTHING : 'Not keeping the Mac awake now: nothing needs it') : undefined) // en-only: plain answer of a slash command (text twin)
    return { text: head + awakeText(mode, await canHold($), facts.working, await i.get(AWAKE_PID_KEY), await i.get(AWAKE_AT_KEY), now, awakeNote, { away, ...(why === undefined ? {} : { why }) }, plat) }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'orphans')
    if (rest0 === undefined) return next(e0)
    return { text: await orphans($, io($)) }
  })
}
