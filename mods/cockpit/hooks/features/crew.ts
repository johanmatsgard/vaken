// The Crew group: Collision warning (before an edit, Claude reads a note when another live session of the same repository edited the file lately), PR
import { cachedAnswer } from '../core/negcache'
import type { Slot } from '../core/negcache'
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'

import { clearBand, postBand } from '../core/band'
import { quietly } from '../core/quiet'
import { mayScan } from '../core/leader'
import { noteGauge, noteRun } from '../core/selfcost'
import { ALIVE_MS, COLLIDE_WHAT, addClaim, claimsKey, claimsText, collideDetail, collideNote, collideToast, findRival, parseClaims, relativePath, resolveGitDir, sessionName } from '../core/crew'
import type { Claims, Other } from '../core/crew'
import { LAPTOP_ARGV, LAPTOP_BAND_TTL_MS, LAPTOP_EVERY_MS, LAPTOP_IDLE_EVERY_MS, LAPTOP_KEY, LAPTOP_OLD_KEY, LAPTOP_SCHEMA, isCurrent, LAPTOP_TIMEOUT_MS, LAPTOP_WIN_TIMEOUT_MS, winGaugeArgv, parseWinLaptop, batteryBand, batteryLow, isReadable, laptopText, memoryTight, parseLaptop, splitSysctl, sysctlArgv, tightWords } from '../core/crewlaptop'
import type { Laptop } from '../core/crewlaptop'
import { computerText, roomOf } from '../core/computer'
import { capMaxOf } from '../core/agentcap'
import { runningNow } from './agentcap'
import { DURATIONS_KEY, GH_TIMEOUT_MS, MAIN_ARGV, MAIN_RED_TEXT, MAIN_EVERY_MS, PR_EVERY_MS, PR_IDLE_EVERY_MS, PR_SHARED_KEY, PR_VIEW_ARGV, prViewArgvFor, staleRunning, bandChecks, sharedPr, withSharedPr, healthOf, isGitPush, isNoPr, learnDurations, mainRedFrom, parseDurations, parsePrView, prText, safeJson, tally, whyAsk } from '../core/crewpr'
import type { Health, PrFacts } from '../core/crewpr'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { hasProgram, platformOnce } from '../core/procs'
import type { ProcPlatform } from '../core/procs'
import { listRecords, readRecord } from '../core/record'
import { readSetting } from '../core/settings'
import { tellsClaude } from '../core/tellclaude'
import { LEDGER_KEY, pushLog } from './compaction'
import { isEditTool, isShellTool } from '../core/tools'
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

function ranBy($: EngineInterface): { run: EngineInterface['process']['run'] } {
  return {
    run: (argv, init) => {
      noteRun()
      return $.process.run(argv, init)
    },
  }
}

let platGet: (() => Promise<ProcPlatform>) | undefined
function platOf($: EngineInterface): Promise<ProcPlatform> {
  platGet ??= platformOnce(() => $.env.get('OS'))
  return platGet()
}

const TICK_MS = 30_000
const PROBE_MS = 3_000
const told = new Set<string>()
const TOLD_MAX = 500

export const repoSlot: Slot<string | undefined> = {}
export const ghSlot: Slot<boolean> = {}
async function repoOf($: EngineInterface): Promise<string | undefined> {
  const now = await $.clock.now()
  return cachedAnswer(
    repoSlot,
    async () => {
      try {
        const cwd = await $.session.cwd()
        const r = await ranBy($).run(['git', 'rev-parse', '--git-common-dir'], { timeoutMs: PROBE_MS })
        return r.exitCode === 0 ? resolveGitDir(cwd, r.stdout) : undefined
      } catch {
        return undefined
      }
    },
    v => v !== undefined,
    now,
  )
}

async function hasGh($: EngineInterface): Promise<boolean> {
  const now = await $.clock.now()
  return cachedAnswer(ghSlot, async () => hasProgram(ranBy($).run, await platOf($), 'gh', PROBE_MS), v => v, now)
}

let claimChain: Promise<unknown> = Promise.resolve()
// One at a time, so two quick edits do not lose one.
function claimOwn(i: Io, repo: string, root: string, rel: string): Promise<void> {
  const p = claimChain.then(async () => {
    const sid = await i.sessionId()
    const now = await i.now()
    await i.set(claimsKey(sid), addClaim(parseClaims(await i.get(claimsKey(sid))), repo, root, rel, now))
  })
  claimChain = p.catch(() => undefined)
  return p
}

async function othersOf(i: Io, me: string, now: number): Promise<Other[]> {
  const out: Other[] = []
  for (const rec of await listRecords(i)) {
    if (rec.sessionId === me || now - rec.updatedAt > ALIVE_MS) continue
    const claims = parseClaims(await i.get(claimsKey(rec.sessionId)))
    if (claims !== undefined) out.push({ sessionId: rec.sessionId, name: sessionName(rec), claims })
  }
  return out
}

let prFacts: PrFacts | undefined
let prTriedAt = 0
let prBusy = false
let prPushedAt: number | undefined
let prStartDue = false
let lastHealth: { number: number; health: Health } | undefined

// Why gh cannot be asked, in plain words; undefined when it can.
async function prBlocked($: EngineInterface): Promise<string | undefined> {
  if ((await repoOf($)) === undefined) return 'This folder is not in a git repository, so there is no pull request to show.' // en-only: plain answer of a slash command (text twin)
  if (!(await hasGh($))) return 'The gh program was not found, so vaken cannot ask about your pull request. Install it from cli.github.com and sign in.' // en-only: plain answer of a slash command (text twin)
  return undefined
}

const firstLine = (text: string): string => (text.trim().split('\n')[0] ?? '').slice(0, 80)

// Never throws.
async function prRefresh($: EngineInterface, force = false): Promise<void> {
  if (prBusy) return
  const i = io($)
  try {
    if ((await readSetting(i, 'crew.pr')) !== 'on' || (await prBlocked($)) !== undefined) return
    const now = await i.now()
    if (!force) {
      const why = whyAsk({ now, pushedAt: prPushedAt, startDue: prStartDue, facts: prFacts })
      if (why === undefined) return
      if (why === 'start') prStartDue = false
    }
    const quiet = prFacts !== undefined && (prFacts.view === undefined || prFacts.view.state !== 'OPEN')
    if (now - prTriedAt < (quiet && prFacts?.error === undefined ? PR_IDLE_EVERY_MS : PR_EVERY_MS)) return
    prBusy = true
    prTriedAt = now
    const sid = await i.sessionId()
    const branch = (await readRecord(i, sid))?.branch
    const old = prFacts !== undefined && prFacts.branch === branch ? prFacts : undefined
    let prNow: PrFacts = { at: now, branch }
    const repo = (await repoOf($)) ?? ''
    const sharedRaw = await i.get(PR_SHARED_KEY)
    const shared = sharedPr(sharedRaw, repo, branch, now, prPushedAt ?? 0)
    if (shared !== undefined) prNow = { ...shared, branch }
    else {
      try {
        const r = await ranBy($).run(PR_VIEW_ARGV, { timeoutMs: GH_TIMEOUT_MS })
        if (r.exitCode === 0) {
          const view = parsePrView(safeJson(r.stdout))
          prNow = view === undefined ? { ...prNow, view: old?.view, error: 'gh answered with something unexpected' } : { ...prNow, view }
        } else if (isNoPr(r.stderr)) prNow = { ...prNow, none: true }
        else prNow = { ...prNow, view: old?.view, error: firstLine(r.stderr) || `gh stopped with code ${r.exitCode}` }
      } catch {
        prNow = { ...prNow, view: old?.view, error: 'gh did not answer in time' }
      }
      await i.set(PR_SHARED_KEY, withSharedPr(sharedRaw, repo, branch, prNow, now))
    }
    prNow = { ...prNow, mainRed: old?.mainRed ?? prFacts?.mainRed, mainAt: old?.mainAt ?? prFacts?.mainAt }
    prNow = await mainCheck($, i, prNow, now)
    prFacts = prNow
    await i.set(`cockpit:pr:state:${sid}`, prNow)
    if (prNow.view !== undefined && shared === undefined) await i.set(DURATIONS_KEY, learnDurations(parseDurations(await i.get(DURATIONS_KEY)), prNow.view.checks))
    await prShow(i, prNow)
  } catch {
    // the clock never breaks the session
  } finally {
    prBusy = false
  }
}

// Never throws.
let staleAt = 0
async function prStale($: EngineInterface): Promise<void> {
  const i = io($)
  try {
    if (prBusy || (await readSetting(i, 'crew.pr')) !== 'on' || (await prBlocked($)) !== undefined) return
    const now = await i.now()
    if (now - staleAt < PR_EVERY_MS) return
    const repo = (await repoOf($)) ?? ''
    const sid = await i.sessionId()
    const own = (await readRecord(i, sid))?.branch
    const raw = await i.get(PR_SHARED_KEY)
    const todo = staleRunning(raw, repo, own, now)
    if (todo.length === 0) return
    staleAt = now
    let sharedNext: unknown = raw
    for (const branch of todo) {
      try {
        const r = await ranBy($).run(prViewArgvFor(branch), { timeoutMs: GH_TIMEOUT_MS })
        if (r.exitCode !== 0) continue
        const view = parsePrView(safeJson(r.stdout))
        if (view !== undefined) sharedNext = withSharedPr(sharedNext, repo, branch, { at: now, branch, view }, now)
      } catch {
      }
    }
    if (sharedNext !== raw) await i.set(PR_SHARED_KEY, sharedNext)
  } catch {
    // the clock never breaks the session
  }
}

async function mainCheck($: EngineInterface, i: Io, f: PrFacts, now: number): Promise<PrFacts> {
  const repo = (await repoOf($)) ?? ''
  const shared = (await i.get('cockpit:pr:main')) as { repo?: string; at?: number; red?: boolean } | undefined
  if (shared?.repo === repo && typeof shared.at === 'number' && now - shared.at < MAIN_EVERY_MS) return { ...f, mainRed: shared.red, mainAt: shared.at }
  let red = f.mainRed
  try {
    const r = await ranBy($).run(MAIN_ARGV, { timeoutMs: GH_TIMEOUT_MS })
    if (r.exitCode === 0) red = mainRedFrom(safeJson(r.stdout))
  } catch {
  }
  await i.set('cockpit:pr:main', { repo, at: now, red })
  return { ...f, mainRed: red, mainAt: now }
}

async function prShow(i: Io, f: PrFacts): Promise<void> {
  const v = f.view
  const health = v === undefined || v.state !== 'OPEN' ? undefined : healthOf(tally(v.checks))
  if (v !== undefined && health === 'failing') await postBand(i, 'warn', 'pr-checks', bandChecks(v), 6 * 60_000)
  else await clearBand(i, 'pr-checks')
  if (f.mainRed === true) await postBand(i, 'warn', 'pr-main', MAIN_RED_TEXT, 12 * 60_000)
  else await clearBand(i, 'pr-main')
  if (v !== undefined && health !== undefined && lastHealth?.number === v.number && lastHealth.health !== health) {
    if (health === 'passing') i.toast(tr('Pull request {n}: all checks passed.').replace('{n}', String(v.number)))
    // The card's Fix asks Claude to fix it on a press, so the toast names the button, not a typed command.
    else if (health === 'failing') i.toast(tr(tally(v.checks).failed === 1 ? 'Pull request {n}: {m} check failed. Press Fix in Needs you or on the Pull requests card.' : 'Pull request {n}: {m} checks failed. Press Fix in Needs you or on the Pull requests card.').replace('{n}', String(v.number)).replace('{m}', String(tally(v.checks).failed)))
  }
  lastHealth = v !== undefined && health !== undefined ? { number: v.number, health } : undefined
  i.invalidate()
}

let laptopBusy = false
let wasTight = false
let beforeLaptop: Laptop | undefined
let lastLaptop: Laptop | undefined
let wasLow = false

// Whether a helper agent of this session runs now (the engine's own list, no store read).
async function helpersRun($: EngineInterface): Promise<boolean> {
  try {
    const list = await $.agent.list()
    return list.some(a => a.status === 'running' || a.status === 'pending' || a.status === 'waiting')
  } catch {
    return true
  }
}

// Never throws.
async function laptopRead($: EngineInterface, isTimer = false): Promise<Laptop | undefined> {
  const i = io($)
  try {
    if ((await readSetting(i, 'laptop.mode')) !== 'on') return undefined
    const now = await i.now()
    const kept = (await i.get(LAPTOP_KEY)) as Laptop | undefined
    const seen = typeof kept === 'object' && kept !== null && typeof kept.at === 'number' ? kept : undefined
    // This session then reads the machine itself and writes a stamped reading
    const have = seen !== undefined && isCurrent(seen) ? seen : undefined
    // Vaken's own cost (core/selfcost.ts) is measured from one reading to the next
    if (have !== undefined) noteGauge(now, have.at)
    if (have !== undefined && now - have.at < LAPTOP_EVERY_MS) return have
    // Any other timer leaves the reading to the leader session (core/leader.ts)
    const helping = isTimer && have !== undefined ? await helpersRun($) : true
    if (isTimer && have !== undefined && now - have.at >= 0 && now - have.at < LAPTOP_IDLE_EVERY_MS && !helping) return have
    if (isTimer && have !== undefined && !helping && !(await mayScan(i, have.at, 2 * LAPTOP_EVERY_MS))) return have
    if (laptopBusy) return have ?? seen
    laptopBusy = true
    try {
      if ((await platOf($)) === 'win32') {
        let text = ''
        try {
          const r = await ranBy($).run(winGaugeArgv(), { timeoutMs: LAPTOP_WIN_TIMEOUT_MS })
          text = r.exitCode === 0 ? r.stdout : ''
        } catch {
          text = ''
        }
        const w: Laptop = { ...parseWinLaptop(now, text), schema: LAPTOP_SCHEMA }
        await i.set(LAPTOP_KEY, w)
        noteGauge(now, w.at)
        await laptopShow(i, w)
        return w
      }
      const ask = async (argv: readonly string[]): Promise<string | undefined> => {
        try {
          const r = await ranBy($).run(argv, { timeoutMs: LAPTOP_TIMEOUT_MS })
          return r.exitCode === 0 ? r.stdout : undefined
        } catch {
          return undefined
        }
      }
      // Five programs a reading, not nine: one sysctl for the level
      const need: ('memsize' | 'cores')[] = [...((have ?? seen)?.memMb === undefined ? (['memsize'] as const) : []), ...((have ?? seen)?.cores === undefined ? (['cores'] as const) : [])]
      const sysctl = async (): Promise<ReturnType<typeof splitSysctl>> => {
        try {
          const r = await ranBy($).run(sysctlArgv(['pressure', 'swap', 'load', ...need]), { timeoutMs: LAPTOP_TIMEOUT_MS })
          return splitSysctl(r.stdout)
        } catch {
          return {}
        }
      }
      const [sc, batt, therm, ps, vmstat, cpu] = await Promise.all([sysctl(), ask(LAPTOP_ARGV.batt), ask(LAPTOP_ARGV.therm), ask(LAPTOP_ARGV.ps), ask(LAPTOP_ARGV.vmstat), ask(LAPTOP_ARGV.cpu)])
      const l = { ...parseLaptop(now, { pressure: sc.pressure, vmstat, swap: sc.swap, batt, therm, ps, memsize: sc.memsize, load: sc.load, cores: sc.cores, cpu }), schema: LAPTOP_SCHEMA }
      const sizes = have ?? seen
      // The pane fills the gap from the last REAL reading while it is fresh (features/home/load.ts, keepMemory)
      if (l.memMb === undefined && sizes?.memMb !== undefined) l.memMb = sizes.memMb
      if (l.cores === undefined && sizes?.cores !== undefined) l.cores = sizes.cores
      await i.set(LAPTOP_KEY, l)
      noteGauge(now, l.at)
      await laptopShow(i, l)
      return l
    } finally {
      laptopBusy = false
    }
  } catch {
    return undefined
  }
}

async function laptopShow(i: Io, l: Laptop): Promise<void> {
  if (!isReadable(l)) return
  const tight = memoryTight(l, lastLaptop)
  if (lastLaptop !== l) beforeLaptop = lastLaptop
  lastLaptop = l
  if (tight) await postBand(i, 'warn', 'laptop', tightWords(l), LAPTOP_BAND_TTL_MS)
  else await clearBand(i, 'laptop')
  if (tight && !wasTight) i.toast(`${tightWords(l)} ${tr('Close a session or wait for one to finish.')}`)
  wasTight = tight
  const low = batteryLow(l)
  if (low) await postBand(i, 'warn', 'laptop-battery', batteryBand(l), LAPTOP_BAND_TTL_MS)
  else await clearBand(i, 'laptop-battery')
  if (low && !wasLow) i.toast(`${batteryBand(l)}. ${tr('Plug in.')}`)
  wasLow = low
  i.invalidate()
}

export function registerCrew(on: On): void {
  on('session.start', { cwd: /(?<crew>)/ }, async ($, e, next) => {
    try {
      prStartDue = true
      prFacts = undefined
      prPushedAt = undefined
      prTriedAt = 0
      const timer = $.clock.every(TICK_MS, quietly('crew', () => $.clock.now(), () => {
        void prRefresh($)
        void prStale($)
        void laptopRead($, true)
      }))
      armOnce('crew', timer)
      await io($).del(LAPTOP_OLD_KEY)
    } catch {
      // the commands and the timer are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { sessionId: /(?<crew>)/ }, async ($, e, next) => {
    try {
      await io($).del(claimsKey(e.sessionId))
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<crew>)/ }, async ($, e, next) => {
    if (isShellTool(e.tool)) {
      const done = await next(e)
      try {
        const command = fieldsOf(e).command
        if (typeof command === 'string' && done.deny === undefined && done.isError !== true && isGitPush(command)) {
          const pushedAt = await $.clock.now()
          prPushedAt = pushedAt
          prTriedAt = 0
        }
      } catch {
      }
      return done
    }
    if (!isEditTool(e.tool)) return next(e)
    const i = io($)
    let repo: string | undefined
    let root = ''
    let rel: string | undefined
    let note: string | undefined
    try {
      if ((await readSetting(i, 'crew.collide')) !== 'off') {
        const input = fieldsOf(e)
        const raw = input.file_path ?? input.notebook_path
        repo = await repoOf($)
        if (repo !== undefined && typeof raw === 'string' && raw !== '') {
          const rootNow = await $.session.root()
          root = rootNow
          rel = relativePath(root, raw)
          const me = await i.sessionId()
          const now = await i.now()
          const rival = findRival(rel, repo, root, await othersOf(i, me, now), now)
          if (rival !== undefined && !told.has(rel)) {
            if (told.size > TOLD_MAX) told.clear()
            told.add(rel)
            note = collideNote(rel, rival)
            await pushLog(i, LEDGER_KEY, { at: now, session: me, what: COLLIDE_WHAT, detail: collideDetail(rel, rival), how: 'auto', did: true })
            i.toast(collideToast(rel, rival))
          }
        }
      }
    } catch {
      note = undefined
    }
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the edit twice.
    try {
      if (result.deny === undefined && result.isError !== true && repo !== undefined && rel !== undefined) await claimOwn(i, repo, root, rel)
      if (note !== undefined && result.deny === undefined && (await tellsClaude(i))) return { ...result, context: [...(result.context ?? []), note] }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'claims')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const me = await i.sessionId()
    const now = await i.now()
    const mine = parseClaims(await i.get(claimsKey(me)))
    const repo = await repoOf($)
    const others = await othersOf(i, me, now)
    const known: Claims | undefined = mine ?? (repo === undefined ? undefined : { repo, root: '', items: [] })
    return { text: claimsText(await readSetting(i, 'crew.collide'), known, others, now, repo !== undefined) }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'pr')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const mode = await readSetting(i, 'crew.pr')
    if (mode === 'on') await prRefresh($, true)
    const blocked = mode === 'on' ? await prBlocked($) : undefined
    return { text: prText(mode, prFacts, parseDurations(await i.get(DURATIONS_KEY)), await i.now(), blocked) }
  })

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'laptop')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const mode = await readSetting(i, 'laptop.mode')
    const l = mode === 'on' ? await laptopRead($) : undefined
    const now = await i.now()
    const load = { running: await runningNow(i), max: capMaxOf(await readSetting(i, 'cap.max')), capOn: (await readSetting(i, 'cap.mode')) !== 'off' }
    return { text: `${laptopText(mode, l, now, undefined, l?.at === lastLaptop?.at ? beforeLaptop : lastLaptop)}\n${computerText(mode, roomOf(l, load, now), l)}` }
  })
}
