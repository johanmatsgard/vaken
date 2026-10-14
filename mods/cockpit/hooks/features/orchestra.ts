// The task runner (core/orchestra.ts): vaken starts and steers the helper agents of a run.
import { tr } from '../core/lang'
import { tLine } from '../i18n/t'
import type { EngineInterface, On, Timer } from 'claude-code'
import { noteRun } from '../core/selfcost'

import { dur } from '../core/agentboard'
import { postBand } from '../core/band'
import { turnOf } from '../core/cost'
import { withToastGate } from '../core/io'
import { homeFrom, under } from '../core/platform'
import { bindPlatform, platformOfIo } from '../core/procs'
import { NO_SHELL, noShellError, shellArgv } from '../core/shellrun'
import { serialUpdate } from '../core/serial'
import type { Io } from '../core/io'
import { bindSafeFs, refusedWords, safeFsOf, safeWrite } from '../core/safewrite'
import {
  AT_ONCE_AUTO, AT_ONCE_SANE, HOLD_MS, autoCeiling, busy, withAtOnce, capRoom, capWhy, staggerWait, MODEL_PICKS, afterCheck, endReview, nextReviews, reviewDescription, reviewForSpawn, reviewPrompt, taskOfReview, ORCH_KEY, PLAN_PROMPT, TASKS_MAX, TEMPLATES_KEY, addTask, askPrompt, editChoices, editTask, isAutoModeRefusal, parseTemplates, removeTask, roleSettingKey, taskForSpawn, templateOf, ROLES, ROLE_NAMES, ROLE_PROMPT, roleDescription, TASKS_FILE, TEMPLATE, addTaskCost, descriptionOf, endTask, folderOf, isFinished, modelFor, newRun, nextToStart, overLimits,
  throwHoldText, parseRun, parseTaskFile, reordersStart, retryTask, rerunOf, roleType, runOverBudget, runSummary, running, skipBlocked, taskOfAgent, taskPrompt, tasksText, withTask, ranOn,
} from '../core/orchestra'
import { isFamily } from '../core/models'
import { capMaxOf } from '../core/agentcap'
import type { ModelPick, Role, Run, Task, TaskEdit } from '../core/orchestra'
import { money } from '../core/prices'
import { readSetting, settingStoreKey } from '../core/settings'
import { roomLine, roomOf } from '../core/computer'
import type { Room } from '../core/computer'
import { LAPTOP_KEY } from '../core/crewlaptop'
import type { Laptop } from '../core/crewlaptop'
import { runningNow } from './agentcap'
import { hasProgress } from './agentboard'
import { APP_USAGE_KEY, parseStoredUsage } from '../core/appusage'
import { HISTORY_KEY as PACE_HISTORY_KEY, parseHistory } from '../core/pace'
import { RUNNER_SHORT_MIN, windowShort } from '../core/planfit'
import { checkRun, checkWords, estimateLine, reasonLines } from '../core/runcost'
import type { Facts, RunCheck } from '../core/runcost'
import { STATS_KEY, normalizeStats } from '../core/route'
import { AFTER_RESET_MS, FALLBACK_MS, nextReset } from '../core/resume'
import { LIMIT_GO_WHAT, LIMIT_PAUSE_WHAT, HISTORY_KEY, LIMIT_HIT_KEY, LIMIT_SIGNAL_MS, REPORT_KEY, freshReports, gaveUpWords, goOnVerdict, goneOnWords, historyText, parseLimitHit, parseReports, pauseForLimit, pausedBandWords, pushReport, reportOf, reportText, limitStopped } from '../core/overnight'
import { HALT_ON_SAID, haltIsOn } from '../core/guard'
import { hideSecrets } from '../core/guardcmds'
import { LEDGER_KEY, pushLog } from './compaction'
import { HINTS, isFolded } from '../core/menu'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'
import { fillIn } from '../core/fillin'
import { tEn } from '../i18n/t'

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

// What the runner asks of the engine.
export type RunnerOps = {
  spawn: (a: { prompt: string; description: string; subagentType: string; model: string; cwd?: string }) => Promise<{ agentId?: string; deny?: string; model?: string }>
  stop: (agentId: string) => Promise<void>
  send: (agentId: string, text: string) => Promise<void>
  sh: (argv: string[], cwd: string, timeoutMs: number) => Promise<{ code: number; out: string }>
  shell?: (script: string) => Promise<{ argv: string[]; windows: boolean }>
  root: () => Promise<string>
  statuses: () => Promise<{ id: string; status: string }[] | undefined>
  ask: (text: string) => Promise<void>
  roles: () => Promise<boolean>
  // Undefined: the engine cannot tell, and helpers start together.
  seen?: (agentId: string) => boolean
}

// The engine calls the runner needs
type RunnerEngine = {
  spawn: (a: { prompt: string; description: string; subagentType: string; model: string; cwd?: string }) => Promise<{ agentId?: string; deny?: unknown; model?: unknown }>
  stop: (agentId: string) => Promise<unknown>
  send: (agentId: string, text: string) => Promise<unknown>
  run: (argv: string[], init: { cwd: string; timeoutMs: number }) => Promise<{ exitCode?: number | null; stdout: string; stderr: string }>
  root: () => Promise<string>
  cwd: () => Promise<string>
  list: () => Promise<{ id: string; status: string }[]>
  submit: (text: string) => Promise<unknown>
  after: (ms: number, f: () => void) => unknown
  register: (role: Role, model: string) => Promise<unknown>
  seen?: (agentId: string) => boolean
  io: Io
}

// The runner's ops on top of the engine calls.
export function runnerOpsOf(en: RunnerEngine): RunnerOps {
  return {
    spawn: async a => {
      const r = await en.spawn(a)
      return { ...(r.agentId === undefined ? {} : { agentId: r.agentId }), ...(typeof r.deny === 'string' ? { deny: r.deny } : {}), ...(typeof r.model === 'string' ? { model: r.model } : {}) }
    },
    stop: async agentId => {
      await en.stop(agentId)
    },
    send: async (agentId, text) => {
      await en.send(agentId, text)
    },
    sh: async (argv, cwd, timeoutMs) => {
      const r = await en.run(argv, { cwd, timeoutMs })
      return { code: r.exitCode ?? 1, out: `${r.stdout}\n${r.stderr}` }
    },
    shell: async script => {
      const sys = await platformOfIo(en.io)
      return { argv: shellArgv(sys, script), windows: sys === 'win32' }
    },
    root: async () => {
      try {
        return (await en.root()) || (await en.cwd())
      } catch {
        try {
          return await en.cwd()
        } catch {
          return ''
        }
      }
    },
    statuses: async () => {
      try {
        return (await en.list()).map(a => ({ id: a.id, status: a.status }))
      } catch {
        return undefined
      }
    },
    roles: async () => ensureRoles(en, await roleModels(en.io)),
    ...(en.seen === undefined ? {} : { seen: en.seen }),
    // A prompt cannot be sent inside the hook call that runs now (a command, a turn's end): it goes a moment later.
    ask: async text => {
      en.after(ASK_DELAY_MS, () => {
        en.submit(text).catch(async err => {
          try {
            const i = en.io
            const old = await i.get('cockpit:probe:log')
            await i.set('cockpit:probe:log', [{ at: await i.now(), session: await i.sessionId(), what: 'task runner: the message to Claude was refused', detail: (err instanceof Error ? err.message : String(err)).slice(0, 160) }, ...(Array.isArray(old) ? old : [])].slice(0, 24)) // en-only: probe log, not shown
          } catch {
          }
        })
      })
    },
  }
}

function opsOf($: EngineInterface): RunnerOps {
  return runnerOpsOf({
    spawn: async a => {
      const got = await $.agent.spawn(a)
      return got as { agentId?: string; deny?: unknown; model?: unknown }
    },
    stop: agentId => $.tool.call({ tool: 'TaskStop', task_id: agentId } as never),
    send: (agentId, text) => $.session.send({ to: { agentId }, text } as never),
    run: (argv, init) => {
      noteRun()
      return $.process.run(argv, init)
    },
    root: () => $.session.root(),
    cwd: () => $.session.cwd(),
    list: () => $.agent.list(),
    submit: text => $.prompt.submit({ text, asUser: true }),
    after: (ms, f) => $.clock.after(ms, f),
    register: (r, m) => {
      if (ROLES[r].tools === undefined) return $.agent.register({ name: r, description: roleDescription(r), prompt: ROLE_PROMPT(r), model: m })
      return $.agent.register({ name: r, description: roleDescription(r), prompt: ROLE_PROMPT(r), model: m, tools: ROLES[r].tools })
    },
    seen: hasProgress,
    io: bindPlatform(io($), () => $.env.get('OS')),
  })
}

const ASK_DELAY_MS = 1_500
const CHECK_TIMEOUT_MS = 10 * 60_000
const GIT_TIMEOUT_MS = 60_000
const DONE_BAND_MS = 30 * 60_000
// A reviewer the engine's list says has ended gets this long for its words to arrive.
const REVIEW_WAIT_MS = 60_000
const lastLine = (out: string): string => {
  const lines = out.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '')
  const l = lines[lines.length - 1] ?? ''
  return l.length > 120 ? `${l.slice(0, 119)}…` : l
}

export async function loadRun(i: Io): Promise<Run | undefined> {
  return parseRun(await i.get(ORCH_KEY(await i.sessionId())))
}
async function saveRun(i: Io, run: Run | undefined): Promise<void> {
  const key = ORCH_KEY(await i.sessionId())
  if (run === undefined) await i.del(key)
  else await i.set(key, run)
  i.invalidate()
}

export const checkShown: { sig?: string } = {}

export async function costFacts(i: Io): Promise<Facts> {
  const now = await i.now()
  return { roleModels: await roleModels(i), stats: normalizeStats(await i.get(STATS_KEY)), usage: parseStoredUsage(await i.get(APP_USAGE_KEY)), hist: parseHistory(await i.get(PACE_HISTORY_KEY)), now }
}
export async function costCheck(i: Io, run: Run): Promise<RunCheck> {
  return checkRun(run, await costFacts(i))
}

export async function roleModels(i: Io): Promise<Partial<Record<Role, string>>> {
  const out: Partial<Record<Role, string>> = {}
  for (const r of ROLE_NAMES) {
    const v = await i.get(settingStoreKey(roleSettingKey(r)))
    if (isFamily(v)) out[r] = v
  }
  return out
}

const typeFor = (t: Task, rolesOk: boolean): string => (rolesOk ? roleType(t.role) : ROLES[t.role].writes ? 'general-purpose' : 'Explore') // en-only: the name of a Claude Code agent type

// How many commits of a task's branch the branch you are on does not have.
async function unmergedCount(ops: RunnerOps, root: string, branch: string): Promise<number | undefined> {
  try {
    const r = await ops.sh(['git', 'rev-list', '--count', `HEAD..${branch}`], root, GIT_TIMEOUT_MS)
    const n = Number(lastLine(r.out))
    return r.code === 0 && Number.isInteger(n) && n >= 0 ? n : undefined
  } catch {
    return undefined
  }
}
async function dirtyCount(ops: RunnerOps, root: string, path: string): Promise<number> {
  try {
    const r = await ops.sh(['git', '-C', path, 'status', '--porcelain'], root, GIT_TIMEOUT_MS)
    return r.code === 0 ? r.out.split('\n').filter(l => l.trim() !== '').length : 0
  } catch {
    return 0
  }
}

async function prepareFolder(i: Io, ops: RunnerOps, run: Run, t: Task): Promise<{ run: Run; task?: Task }> {
  if (!t.folder || t.path !== undefined) return { run, task: t }
  const root = await ops.root()
  const f = folderOf(root, run, t)
  const head = await ops.sh(['git', 'rev-parse', 'HEAD'], root, GIT_TIMEOUT_MS)
  const base = head.code === 0 && /^[0-9a-f]{7,40}$/.test(lastLine(head.out)) ? lastLine(head.out) : undefined
  const r = await ops.sh(['git', 'worktree', 'add', '-b', f.branch, f.path, 'HEAD'], root, GIT_TIMEOUT_MS)
  if (r.code !== 0) return { run: withTask(run, t.n, { state: 'failed', endedAt: await i.now(), why: `no folder copy: ${lastLine(r.out)}` }) }
  const task = { ...t, path: f.path, branch: f.branch, ...(base === undefined ? {} : { base }) }
  return { run: withTask(run, t.n, { path: f.path, branch: f.branch, ...(base === undefined ? {} : { base }) }), task }
}

let lastStart: { id: string; at: number } | undefined
const lastOfRun = (run: Run): { id: string; at: number } | undefined => (lastStart !== undefined && run.tasks.some(t => t.agentId === lastStart!.id || t.reviewAgent === lastStart!.id) ? lastStart : undefined)

async function capRoomNow(i: Io, run: Run): Promise<{ room: number; max: number; off: boolean }> {
  const max = capMaxOf(await readSetting(i, 'cap.max'))
  const own = running(run).length + run.tasks.filter(t => t.review === 'running').length
  const mode = await readSetting(i, 'cap.mode')
  return { room: capRoom(mode, max, await runningNow(i), own), max, off: mode === 'off' }
}

async function startTask(i: Io, ops: RunnerOps, run0: Run, t0: Task): Promise<Run> {
  const now = await i.now()
  const prepared = await prepareFolder(i, ops, run0, t0)
  if (prepared.task === undefined) return prepared.run
  const run = prepared.run
  const t = prepared.task
  const task: Task = { ...t, tries: t.tries + 1 }
  const cwd = task.path
  try {
    const model = modelFor(task.model, task.role, await roleModels(i))
    const r = await ops.spawn({ prompt: taskPrompt(task), description: descriptionOf(task), subagentType: typeFor(task, await ops.roles()), model, ...(cwd === undefined ? {} : { cwd }) })
    if (r.agentId === undefined && r.deny !== undefined && isAutoModeRefusal(r.deny)) return { ...withTask(run, t.n, { ...task, tries: t.tries }), via: 'claude' }
    if (r.agentId === undefined) return withTask(run, t.n, { ...task, tries: t.tries, holdUntil: now + HOLD_MS, why: `waits: ${r.deny ?? 'the agent did not start'}` })
    lastStart = { id: r.agentId, at: now }
    const { holdUntil: _h, why: _w, ...fresh } = task
    return { ...run, tasks: run.tasks.map(x => (x.n === t.n ? { ...fresh, state: 'running' as const, agentId: r.agentId, startedAt: now, ran: ranOn(model, r.model) } : x)) }
  } catch (err) {
    return withTask(run, t.n, { ...task, state: 'failed', endedAt: now, why: `the agent did not start: ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}` })
  }
}

async function startReview(i: Io, ops: RunnerOps, run: Run, t: Task): Promise<Run> {
  try {
    const r = await ops.spawn({ prompt: reviewPrompt(t), description: reviewDescription(t), subagentType: typeFor({ ...t, role: 'reviewer' }, await ops.roles()), model: modelFor('auto', 'reviewer', await roleModels(i)), ...(t.path === undefined ? {} : { cwd: t.path }) })
    if (r.agentId !== undefined) {
      lastStart = { id: r.agentId, at: await i.now() }
      return withTask(run, t.n, { review: 'running', reviewAgent: r.agentId })
    }
    if (r.deny !== undefined && isAutoModeRefusal(r.deny)) return { ...run, via: 'claude' }
    return withTask(run, t.n, { review: 'failed', reviewLines: [`The reviewer did not start: ${(r.deny ?? 'refused').slice(0, 100)}`] })
  } catch {
    return withTask(run, t.n, { review: 'failed', reviewLines: ['The reviewer did not start.'] })
  }
}

async function runCheck(i: Io, ops: RunnerOps, run: Run, t: Task): Promise<Run> {
  const cwd = t.path ?? (await ops.root())
  let windows = false
  try {
    const sh = ops.shell === undefined ? { argv: ['sh', '-c', run.choices.check], windows: false } : await ops.shell(run.choices.check)
    windows = sh.windows
    const r = await ops.sh(sh.argv, cwd, CHECK_TIMEOUT_MS)
    return afterCheck(run, t.n, r.code === 0, hideSecrets(lastLine(r.out)))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return withTask(run, t.n, { check: 'failed', checkLine: windows && noShellError(message) ? NO_SHELL : hideSecrets(message).slice(0, 80) })
  }
}

// `statuses` is the engine's helper list (undefined when not read this beat).
async function computerRoom(i: Io, now: number): Promise<Room | undefined> {
  if ((await readSetting(i, 'laptop.mode')) !== 'on') return undefined
  const kept = (await i.get(LAPTOP_KEY)) as Laptop | undefined
  if (typeof kept !== 'object' || kept === null || typeof kept.at !== 'number') return undefined
  return roomOf(kept, { running: await runningNow(i), max: capMaxOf(await readSetting(i, 'cap.max')), capOn: (await readSetting(i, 'cap.mode')) !== 'off' }, now)
}
const resetAt = (i: Io, now: number) => async (): Promise<number> => {
  const at = nextReset(parseStoredUsage(await i.get(APP_USAGE_KEY)), now)
  return at === undefined ? now + FALLBACK_MS : at + AFTER_RESET_MS
}
async function keepReport(i: Io, run: Run, now: number): Promise<void> {
  const report = reportOf(run, now)
  await serialUpdate(i, HISTORY_KEY, old => pushReport(freshReports(parseReports(old), now), report), stored => parseReports(stored).some(r => r.id === report.id && r.endedAt === report.endedAt))
  await i.set(REPORT_KEY, run.id)
}
async function readReports(i: Io): Promise<ReturnType<typeof parseReports>> {
  return freshReports(parseReports(await i.get(HISTORY_KEY)), await i.now())
}
const HALT_WAITS = 'waits: Pause is on' // en-only: plain answer of a slash command (text twin)
const FULL_WHY = (r: Room): string => `waits: the computer is ${roomLine(r).replace(/^Full: /, 'full, ')}`

// The running cost of each helper
const liveCosts = new Map<string, number>()
const LIVE_MAX = 40
const liveOf = (agentId: string): number | undefined => liveCosts.get(agentId)
export const noteStepCost = (agentId: string, usd: number | undefined): void => {
  if (usd === undefined) return
  if (!liveCosts.has(agentId) && liveCosts.size >= LIVE_MAX) liveCosts.delete(liveCosts.keys().next().value as string)
  liveCosts.set(agentId, (liveCosts.get(agentId) ?? 0) + usd)
}
export const clearStepCost = (agentId: string): void => void liveCosts.delete(agentId)

export async function tick(i: Io, ops: RunnerOps, statuses?: { id: string; status: string }[]): Promise<Run | undefined> {
  let run = await loadRun(i)
  if (run === undefined || (run.status !== 'running' && run.status !== 'paused')) return run
  const now = await i.now()
  for (const s of statuses ?? []) {
    if (s.status === 'completed') run = endTask(run, s.id, 'done', now)
    else if (s.status === 'failed' || s.status === 'killed') run = endTask(run, s.id, 'failed', now, s.status === 'killed' ? 'stopped' : undefined)
    const rt = taskOfReview(run, s.id)
    if (rt !== undefined && rt.review === 'running') {
      if (s.status === 'failed' || s.status === 'killed') run = endReview(run, s.id, false, '')
      else if (s.status === 'completed' && rt.reviewSeenAt === undefined) run = withTask(run, rt.n, { reviewSeenAt: now })
    }
  }
  // A reviewer that ended a minute ago and whose words never came: the review ends without them.
  for (const t of run.tasks) if (t.review === 'running' && t.reviewSeenAt !== undefined && now - t.reviewSeenAt > REVIEW_WAIT_MS && t.reviewAgent !== undefined) run = endReview(run, t.reviewAgent, true, '')
  const recentFail = run.status === 'running' && run.tasks.some(t => t.state === 'failed' && (t.endedAt ?? 0) >= now - LIMIT_SIGNAL_MS)
  if (recentFail && limitStopped(parseLimitHit(await i.get(LIMIT_HIT_KEY)), parseStoredUsage(await i.get(APP_USAGE_KEY)), now)) {
    const goOn = run.choices.afterLimit === 'go'
    run = pauseForLimit(run, now - LIMIT_SIGNAL_MS, await resetAt(i, now)())
    if (!goOn) {
      const { resumeAt: _r, ...rest } = run
      run = rest
    }
    await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: LIMIT_PAUSE_WHAT, detail: goOn ? pausedBandWords(run) : 'It waits for you to go on.', how: 'auto', did: true })
    await postBand(i, 'warn', 'orch', goOn ? pausedBandWords(run) : 'Task run paused by the plan limit. Go on after the reset.', 8 * 3_600_000)
  }
  if (run.status === 'paused' && run.resumeAt !== undefined && now >= run.resumeAt) {
    const v = goOnVerdict(run, now, parseStoredUsage(await i.get(APP_USAGE_KEY)), await resetAt(i, now)())
    if (v.act === 'go') {
      const { resumeAt: _r, replans: _p, ...rest } = run
      run = { ...rest, status: 'running', told: false }
      await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: LIMIT_GO_WHAT, how: 'auto', did: true })
      await postBand(i, 'info', 'orch', goneOnWords, DONE_BAND_MS)
      i.toast(`${tr(goneOnWords)}.`)
    } else if (v.act === 'again') run = { ...run, resumeAt: v.at, replans: (run.replans ?? 0) + 1 }
    else if (v.act === 'give-up') {
      const { resumeAt: _r, ...rest } = run
      run = rest
      await postBand(i, 'warn', 'orch', gaveUpWords, DONE_BAND_MS)
    }
  }
  for (const o of overLimits(run, now, liveOf)) {
    const t = run.tasks.find(x => x.n === o.n)
    if (t?.agentId !== undefined) await ops.stop(t.agentId).catch(() => undefined)
    run = withTask(run, o.n, { state: 'stopped', endedAt: now, why: o.why })
  }
  if (run.status === 'running' && runOverBudget(run, liveOf)) {
    run = { ...run, status: 'paused', costPause: run.choices.runUsd }
    await postBand(i, 'warn', 'orch', tLine('band.task_run_paused_it_cost_more', { n: run.choices.runUsd }), DONE_BAND_MS)
  }
  const toCheck = run.tasks.find(t => t.check === 'pending')
  if (toCheck !== undefined && !run.tasks.some(t => t.check === 'running')) {
    run = withTask(run, toCheck.n, { check: 'running' })
    await saveRun(i, run)
    run = await runCheck(i, ops, run, toCheck)
  }
  run = skipBlocked(run)
  const wanting = run.status === 'running' ? nextReviews(run, now).length + nextToStart(run, now).length : 0
  const room = wanting === 0 ? undefined : await computerRoom(i, now)
  const cap = wanting === 0 ? undefined : await capRoomNow(i, run)
  let left = Math.min(room === undefined ? Infinity : room.n, cap === undefined ? Infinity : cap.room)
  const halted = wanting > 0 && (await haltIsOn(k => i.get(k), await i.sessionId()))
  if (halted) {
    left = 0
    for (const t of nextToStart(run, now)) run = withTask(run, t.n, { why: HALT_WAITS })
  }
  // Auto ("at once" 0): all the run may have going is the person's own limit if there is one (else no number)
  const autoAll = autoCeiling(cap === undefined ? capMaxOf(await readSetting(i, 'cap.max')) : cap.max, room !== undefined, cap?.off === true)
  const ef = (r: Run): Run => withAtOnce(r, Math.min(autoAll, busy(r) + (left < 0 ? 0 : left)))
  if (wanting > 0 && run.choices.atOnce === AT_ONCE_AUTO) {
    const atNow = { n: Math.min(autoAll, busy(run) + (left === Infinity ? 1 : Math.max(0, left))), room: room !== undefined }
    if (run.atNow?.n !== atNow.n || run.atNow?.room !== atNow.room) run = { ...run, atNow }
  }
  if (room !== undefined && room.n === 0) for (const t of nextToStart(run, now)) run = withTask(run, t.n, { why: FULL_WHY(room) })
  const short = wanting === 0 || left <= 0 ? false : windowShort(parseStoredUsage(await i.get(APP_USAGE_KEY)), parseHistory(await i.get(PACE_HISTORY_KEY)), now, RUNNER_SHORT_MIN)
  if (short && run.smallFirst !== true && reordersStart(run, now)) run = { ...run, smallFirst: true }
  for (const t of nextReviews(ef(run), now)) {
    if (run.via === 'claude' || left <= 0 || staggerWait(lastOfRun(run), ops.seen, now)) break
    left -= 1
    run = await startReview(i, ops, run, t)
  }
  for (const t of nextToStart(ef(run), now, short)) {
    if (run.via === 'claude' || left <= 0 || staggerWait(lastOfRun(run), ops.seen, now)) break
    left -= 1
    run = await startTask(i, ops, run, t)
  }
  if (!halted && cap !== undefined && cap.room < Infinity && left <= 0 && run.via !== 'claude' && (room === undefined || room.n > 0)) for (const t of nextToStart(run, now)) run = withTask(run, t.n, { why: capWhy(cap.max) })
  if (run.via === 'claude') {
    const reviews = nextReviews(ef(run), now).slice(0, left)
    for (const t of reviews) run = withTask(run, t.n, { reviewAskedAt: now })
    const ready: Task[] = []
    for (const t of nextToStart({ ...ef(run), choices: { ...run.choices, atOnce: ef(run).choices.atOnce - reviews.length } }, now, short).slice(0, Math.max(0, left - reviews.length))) {
      const p = await prepareFolder(i, ops, run, t)
      run = p.run
      if (p.task !== undefined) ready.push(p.task)
    }
    if (ready.length + reviews.length > 0) {
      await ops.roles()
      for (const t of ready) run = withTask(run, t.n, { askedAt: now })
      await saveRun(i, run)
      await ops.ask(askPrompt(run, ready, reviews)).catch(() => undefined)
    }
  }
  if (isFinished(run) && run.status === 'running') {
    run = { ...run, status: 'done' }
    if (run.told !== true) {
      run = { ...run, told: true }
      await postBand(i, 'info', 'orch', `Task run ended: ${runSummary(run)}`, DONE_BAND_MS)
      i.toast(fillIn(tr('Task run ended: {summary}'), { summary: runSummary(run) }))
      await keepReport(i, run, now)
    }
  }
  await saveRun(i, run)
  return run
}

// Beats run one after the other, never two at once.
let chain: Promise<unknown> = Promise.resolve()
export function beat(i: Io, ops: RunnerOps, statuses?: { id: string; status: string }[]): Promise<Run | undefined> {
  const next = chain.then(() => tick(i, ops, statuses)).catch(() => undefined)
  chain = next
  return next
}

let timer: Timer | undefined
const WATCH_MS = 10_000
function watch($: EngineInterface): void {
  if (timer !== undefined) return
  const every = $.clock.every(WATCH_MS, () => {
    void (async () => {
      const ops = opsOf($)
      const run = await beat(io($), ops, await ops.statuses())
      if (run === undefined || (run.status !== 'running' && run.status !== 'paused') || (run.status === 'paused' && running(run).length === 0)) {
        timer?.cancel()
        timer = undefined
      }
    })()
  })
  timer = every
}

type Steer =
  | { kind: 'start'; anyway?: boolean } | { kind: 'again' } | { kind: 'pause' } | { kind: 'go' } | { kind: 'stopAll' } | { kind: 'clear' } | { kind: 'plan' }
  | { kind: 'add'; text: string } | { kind: 'remove'; n: number } | { kind: 'edit'; n: number; edit: TaskEdit } | { kind: 'limit'; which: 'min' | 'helper' | 'run'; value: number }
  | { kind: 'name'; text: string } | { kind: 'template'; action: 'save' | 'apply' | 'delete'; name: string } | { kind: 'reviewer'; isOn: boolean } | { kind: 'afterLimit'; go: boolean }
  | { kind: 'retry'; n: number } | { kind: 'stop'; n: number } | { kind: 'keep'; n: number } | { kind: 'throw'; n: number; yes?: boolean }
  | { kind: 'say'; n: number; text: string } | { kind: 'atOnce'; n: number } | { kind: 'check'; command: string }

export async function steer(i: Io, ops: RunnerOps, s: Steer): Promise<string> {
  let run = await loadRun(i)
  if (s.kind === 'plan') {
    await ops.ask(PLAN_PROMPT)
    return `Asked Claude to write the plan as ${TASKS_FILE}. Then load it.`
  }
  if (s.kind === 'add' && run === undefined) {
    await saveRun(i, newRun([s.text], await i.now()))
    return 'Added task 1. Add more, then start.' // en-only: plain answer of a slash command (text twin)
  }
  if (s.kind === 'template') {
    const all = parseTemplates(await i.get(TEMPLATES_KEY))
    const found = Object.keys(all).find(k => k.toLowerCase() === s.name.toLowerCase())
    if (s.action === 'save') {
      if (run === undefined) return 'No run to save.' // en-only: plain answer of a slash command (text twin)
      if (s.name.trim() === '') return 'Name the template: /vaken-tasks template save <name>' // en-only: plain answer of a slash command (text twin)
      await i.set(TEMPLATES_KEY, { ...all, [s.name.trim().slice(0, 40)]: templateOf(run) })
      return `Saved the template "${s.name.trim()}".`
    }
    if (found === undefined) return `No template named "${s.name}".`
    if (s.action === 'delete') {
      const { [found]: _gone, ...rest } = all
      await i.set(TEMPLATES_KEY, rest)
      i.invalidate()
      return `Deleted the template "${found}".`
    }
    if (run !== undefined && running(run).length > 0) return 'Agents still run. Stop the run first.' // en-only: plain answer of a slash command (text twin)
    await saveRun(i, { ...newRun(all[found].tasks, await i.now(), found, all[found].choices) })
    return `Loaded the template "${found}": ${all[found].tasks.length} tasks. Start when ready.`
  }
  if (run === undefined) return 'No task run. /vaken-tasks start begins one.' // en-only: plain answer of a slash command (text twin)
  if ((s.kind === 'start' || s.kind === 'again' || s.kind === 'go' || s.kind === 'keep' || s.kind === 'throw') && (await haltIsOn(k => i.get(k), await i.sessionId()))) return HALT_ON_SAID
  const task = 'n' in s && s.kind !== 'atOnce' ? run.tasks.find(t => t.n === s.n) : undefined
  if ('n' in s && s.kind !== 'atOnce' && task === undefined) return `There is no task ${s.n}.`
  switch (s.kind) {
    case 'start': {
      if (run.status === 'running') return 'The run is on already.' // en-only: plain answer of a slash command (text twin)
      const check = await costCheck(i, run)
      if (check.over && s.anyway !== true) {
        checkShown.sig = check.sig
        return checkWords(check, true, tr)
      }
      run = { ...run, status: 'running', startedAt: run.startedAt ?? (await i.now()), told: false }
      await saveRun(i, run)
      const own = run.choices.atOnce === AT_ONCE_AUTO ? autoCeiling(capMaxOf(await readSetting(i, 'cap.max')), true, (await readSetting(i, 'cap.mode')) === 'off') : run.choices.atOnce
      return `Started: ${tEn('words.task', { n: run.tasks.length })}, ${Number.isFinite(own) ? `at most ${own} at a time` : 'as many at a time as this Mac has room for'}. ${estimateLine(check, tr)}`
    }
    case 'again': {
      if (run.status !== 'done' && run.status !== 'stopped') return 'Only a run that has ended can run again.' // en-only: plain answer of a slash command (text twin)
      if (running(run).length > 0) return 'Agents still run. Stop the run first.' // en-only: plain answer of a slash command (text twin)
      await saveRun(i, rerunOf(run, await i.now()))
      return steer(i, ops, { kind: 'start' })
    }
    case 'pause': {
      // A pause by the person is the kill switch of the limit wait too: it does not go on by itself.
      const { resumeAt: _r, replans: _p, costPause: _c, ...rest } = run
      await saveRun(i, { ...rest, status: 'paused' })
      return 'Paused. Running agents finish; no new one starts.' // en-only: plain answer of a slash command (text twin)
    }
    case 'go': {
      const { resumeAt: _r, replans: _p, costPause: _c, ...rest } = run
      await saveRun(i, { ...rest, status: 'running', told: false })
      return 'Going on.' // en-only: plain answer of a slash command (text twin)
    }
    case 'afterLimit':
      await saveRun(i, editChoices(run, { afterLimit: s.go ? 'go' : 'wait' }))
      return s.go ? 'After a plan limit the run goes on by itself when the limit resets.' : 'After a plan limit the run waits for you.' // en-only: plain answer of a slash command (text twin)
    case 'stopAll':
      for (const t of running(run)) if (t.agentId !== undefined) await ops.stop(t.agentId).catch(() => undefined)
      {
        const now = await i.now()
        let next: Run = { ...run, status: 'stopped' }
        for (const t of running(run)) next = withTask(next, t.n, { state: 'stopped', endedAt: now, why: 'you stopped the run' })
        const { resumeAt: _r, ...stopped } = next
        await saveRun(i, stopped)
        await keepReport(i, stopped, now)
      }
      return 'Stopped every agent of the run.' // en-only: plain answer of a slash command (text twin)
    case 'clear':
      if (running(run).length > 0) return 'Agents still run. Stop the run first.' // en-only: plain answer of a slash command (text twin)
      await saveRun(i, undefined)
      return 'The run is cleared. Folder copies and branches stay; the file stays as it is.' // en-only: plain answer of a slash command (text twin)
    case 'retry':
      if (task!.state === 'running' || task!.state === 'waiting') return `Task ${s.n} has not ended.`
      await saveRun(i, retryTask(run, s.n))
      return `Task ${s.n} waits for its turn again.`
    case 'stop':
      if (task!.state !== 'running' || task!.agentId === undefined) return `Task ${s.n} is not running.`
      await ops.stop(task!.agentId).catch(() => undefined)
      await saveRun(i, withTask(run, s.n, { state: 'stopped', endedAt: await i.now(), why: 'you stopped it' }))
      return `Stopped task ${s.n}.`
    case 'keep':
    case 'throw': {
      const t = task!
      if (t.path === undefined) return `Task ${s.n} has no folder copy.`
      if (t.state === 'running') return `Task ${s.n} still runs.`
      const root = await ops.root()
      // Throw away: both go.
      if (s.kind === 'throw' && s.yes !== true) {
        const commits = t.branch === undefined ? 0 : await unmergedCount(ops, root, t.branch)
        const dirty = await dirtyCount(ops, root, t.path)
        if (commits === undefined || commits > 0 || dirty > 0) return throwHoldText(s.n, commits, dirty)
      }
      const r = await ops.sh(['git', 'worktree', 'remove', ...(s.kind === 'throw' ? ['--force'] : []), t.path], root, GIT_TIMEOUT_MS)
      if (r.code !== 0) return s.kind === 'keep' ? `The folder copy has changes that are not committed: ${lastLine(r.out)}. Ask the agent to commit it, then press Keep again.` : `Could not remove the folder copy: ${lastLine(r.out)}`
      if (s.kind === 'throw' && t.branch !== undefined) await ops.sh(['git', 'branch', '-D', t.branch], root, GIT_TIMEOUT_MS)
      await saveRun(i, withTask(run, s.n, { kept: s.kind === 'keep' ? 'kept' : 'thrown' }))
      return s.kind === 'keep' ? `Kept task ${s.n}: its work is on branch ${t.branch}. The folder copy is removed.` : `Threw away task ${s.n}: its folder copy and branch are gone.`
    }
    case 'say':
      if (task!.state !== 'running' || task!.agentId === undefined) return `Task ${s.n} is not running.`
      await ops.send(task!.agentId, s.text)
      return `Sent to task ${s.n}.`
    case 'atOnce':
      if (s.n === AT_ONCE_AUTO) {
        await saveRun(i, { ...run, choices: { ...run.choices, atOnce: AT_ONCE_AUTO } })
        return 'As many at a time as this Mac has room for.' // en-only: plain answer of a slash command (text twin)
      }
      await saveRun(i, { ...run, choices: { ...run.choices, atOnce: Math.max(1, Math.min(AT_ONCE_SANE, s.n)) } })
      return `At most ${Math.max(1, Math.min(AT_ONCE_SANE, s.n))} at a time.`
    case 'check':
      await saveRun(i, { ...run, choices: { ...run.choices, check: s.command.slice(0, 200) } })
      return s.command === '' ? 'No check after each task.' : `After each task: ${s.command}` // en-only: plain answer of a slash command (text twin)
    case 'add': {
      const next = addTask(run, s.text)
      if (next === run) return `A run holds at most ${TASKS_MAX} tasks.`
      await saveRun(i, next)
      return `Added task ${next.tasks.length}.`
    }
    case 'remove': {
      const next = removeTask(run, s.n)
      if (next === run) return `Task ${s.n} has started; it cannot be removed. Stop it instead.`
      await saveRun(i, next.tasks.length === 0 ? undefined : next)
      return `Removed task ${s.n}.`
    }
    case 'edit': {
      const next = editTask(run, s.n, s.edit)
      if (next === run) return `Task ${s.n} has started; it cannot be changed now.`
      await saveRun(i, next)
      return `Changed task ${s.n}.`
    }
    case 'limit': {
      const key = s.which === 'min' ? 'helperMin' : s.which === 'helper' ? 'helperUsd' : 'runUsd'
      const next = editChoices(run, { [key]: s.value })
      await saveRun(i, next)
      return s.which === 'min' ? `An agent stops after ${next.choices.helperMin} min.` : s.which === 'helper' ? `An agent stops past ${money(next.choices.helperUsd)}.` : `The run pauses past ${money(next.choices.runUsd)}.`
    }
    case 'reviewer':
      await saveRun(i, editChoices(run, { reviewer: s.isOn }))
      return s.isOn ? 'A reviewer reads each finished task and writes 3 lines.' : 'No reviewer.' // en-only: plain answer of a slash command (text twin)
    case 'name':
      await saveRun(i, { ...run, name: s.text.trim().slice(0, 40) || run.name })
      return `The run is called "${s.text.trim().slice(0, 40) || run.name}".`
  }
}

const fileOf = (root: string): string => under(root, TASKS_FILE)
async function readFileTasks(i: Io, root: string): Promise<string[] | undefined> {
  try {
    return parseTaskFile(await i.read(fileOf(root)))
  } catch {
    return undefined
  }
}

export function parseSteer(args: string): Steer | 'new' | 'load' | 'report' | 'history' | undefined | { bad: string } {
  const w = args.trim().split(/\s+/).filter(x => x !== '')
  const a = (w[0] ?? '').toLowerCase()
  const n = Number(w[1])
  if (a === '') return undefined
  if (a === 'new') return 'new'
  if (a === 'load') return 'load'
  if (a === 'report' || a === 'history') return a
  if (a === 'start') return (w[1] ?? '').toLowerCase() === 'anyway' ? { kind: 'start', anyway: true } : { kind: 'start' }
  if (a === 'again') return { kind: 'again' }
  if (a === 'pause') return { kind: 'pause' }
  if (a === 'go' || a === 'resume') return { kind: 'go' }
  if (a === 'clear') return { kind: 'clear' }
  if (a === 'stop' && w.length === 1) return { kind: 'stopAll' }
  if (a === 'check') return { kind: 'check', command: w.slice(1).join(' ') }
  if (a === 'plan') return { kind: 'plan' }
  if (a === 'reviewer') {
    const v = (w[1] ?? '').toLowerCase()
    return v === 'on' || v === 'off' ? { kind: 'reviewer', isOn: v === 'on' } : { bad: 'Use: /vaken-tasks reviewer on|off' } // en-only: plain answer of a slash command (text twin)
  }
  if (a === 'afterlimit') {
    const v = (w[1] ?? '').toLowerCase()
    return v === 'go' || v === 'wait' ? { kind: 'afterLimit', go: v === 'go' } : { bad: 'Use: /vaken-tasks afterlimit go|wait' } // en-only: plain answer of a slash command (text twin)
  }
  if (a === 'add') return w.length < 2 ? { bad: 'Say the task: /vaken-tasks add Fix the header' } : { kind: 'add', text: w.slice(1).join(' ') } // en-only: plain answer of a slash command (text twin)
  if (a === 'name') return w.length < 2 ? { bad: 'Say the name: /vaken-tasks name Nightly cleanup' } : { kind: 'name', text: w.slice(1).join(' ') } // en-only: plain answer of a slash command (text twin)
  if (a === 'template') {
    const action = (w[1] ?? '').toLowerCase()
    if (action !== 'save' && action !== 'apply' && action !== 'delete') return { bad: 'Use: /vaken-tasks template save|apply|delete <name>' } // en-only: plain answer of a slash command (text twin)
    return { kind: 'template', action, name: w.slice(2).join(' ') }
  }
  if (a === 'limit') {
    const which = (w[1] ?? '').toLowerCase()
    const v = Number((w[2] ?? '').replace('$', ''))
    if ((which !== 'min' && which !== 'helper' && which !== 'run') || !(v > 0)) return { bad: 'Use: /vaken-tasks limit min 30 | limit helper 2 | limit run 10' } // en-only: plain answer of a slash command (text twin)
    return { kind: 'limit', which, value: v }
  }
  if (a === 'remove') return Number.isInteger(n) && n >= 1 ? { kind: 'remove', n } : { bad: 'Name a task number: /vaken-tasks remove 2' } // en-only: plain answer of a slash command (text twin)
  if (a === 'set') {
    const field = (w[2] ?? '').toLowerCase()
    const value = w.slice(3).join(' ')
    const v = value.toLowerCase()
    if (!Number.isInteger(n) || n < 1) return { bad: 'Use: /vaken-tasks set 2 role|model|after|folder|text <value>' } // en-only: plain answer of a slash command (text twin)
    if (field === 'role' && (ROLE_NAMES as string[]).includes(v)) return { kind: 'edit', n, edit: { role: v as Role } }
    if (field === 'model' && (MODEL_PICKS as string[]).includes(v)) return { kind: 'edit', n, edit: { model: v as ModelPick } }
    if (field === 'after') return v === 'none' || v === '' ? { kind: 'edit', n, edit: { after: null } } : Number.isInteger(Number(v)) ? { kind: 'edit', n, edit: { after: Number(v) } } : { bad: 'Use: /vaken-tasks set 3 after 2 (or after none)' } // en-only: plain answer of a slash command (text twin)
    if (field === 'folder' && (v === 'on' || v === 'off')) return { kind: 'edit', n, edit: { folder: v === 'on' } }
    if (field === 'text' && value.trim() !== '') return { kind: 'edit', n, edit: { text: value } }
    return { bad: 'Use: /vaken-tasks set 2 role researcher|builder|reviewer|fixer, model auto|cheap|normal|strong, after N|none, folder on|off, text <words>' } // en-only: plain answer of a slash command (text twin)
  }
  if (a === 'at' && (w[1] ?? '').toLowerCase() === 'auto') return { kind: 'atOnce', n: AT_ONCE_AUTO }
  if (['retry', 'stop', 'keep', 'throw', 'say', 'at'].includes(a)) {
    if (!Number.isInteger(n) || n < 1) return { bad: `Name a task number: /vaken-tasks ${a} 2` }
    if (a === 'at') return { kind: 'atOnce', n }
    if (a === 'say') return w.length < 3 ? { bad: 'Say what: /vaken-tasks say 2 use the other file' } : { kind: 'say', n, text: w.slice(2).join(' ') } // en-only: plain answer of a slash command (text twin)
    if (a === 'throw') return { kind: 'throw', n, ...((w[2] ?? '').toLowerCase() === 'yes' ? { yes: true } : {}) }
    return { kind: a as 'retry' | 'stop' | 'keep', n }
  }
  return { bad: 'Use: /vaken-tasks new | load | add <task> | set N ... | remove N | start [anyway] | again | pause | go | stop | retry N | stop N | keep N | throw N [yes] | say N <words> | at auto|N | check <command> | limit ... | name <words> | template save|apply|delete <name> | afterlimit go|wait | report | history | plan | clear' } // en-only: plain answer of a slash command (text twin)
}

function startsWork(ask: ReturnType<typeof parseSteer>): boolean {
  if (typeof ask !== 'object' || 'bad' in ask) return false
  if (ask.kind === 'check') return ask.command !== ''
  if (ask.kind === 'template') return ask.action === 'apply'
  return ask.kind === 'start' || ask.kind === 'again' || ask.kind === 'go' || ask.kind === 'add' || ask.kind === 'say'
}

export async function tasksCommand(i: Io, ops: RunnerOps, args: string): Promise<string> {
  const ask = parseSteer(args)
  const root = await ops.root()
  if (ask === undefined) {
    const shown = await loadRun(i)
    const check = shown?.status === 'setup' ? await costCheck(i, shown) : undefined
    return tasksText(shown, await readFileTasks(i, root), await i.now(), dur, check === undefined ? [] : [estimateLine(check), ...reasonLines(check)])
  }
  if (typeof ask === 'object' && 'bad' in ask) return ask.bad
  if (ask === 'report' || ask === 'history') {
    const list = await readReports(i)
    return ask === 'report' ? reportText(list[0], await i.now()) : historyText(list, await i.now())
  }
  if (ask === 'new') {
    if ((await readFileTasks(i, root)) !== undefined) return `${TASKS_FILE} is there already. Edit it, then /vaken-tasks start.`
    // A link at the file or at .claude is never followed (core/safewrite.ts).
    const fs = safeFsOf(i)
    if (fs === undefined || !(await safeWrite(fs, (p, x) => i.write(p, x), root, fileOf(root), TEMPLATE)).ok) return refusedWords(fileOf(root), tr)
    return `Wrote ${TASKS_FILE} with an example. Write one task per line, then /vaken-tasks start.`
  }
  const now = await loadRun(i)
  if (ask === 'load' || (typeof ask === 'object' && ask.kind === 'start' && (now === undefined || now.status === 'done' || now.status === 'stopped'))) {
    if (now !== undefined && running(now).length > 0) return 'Agents still run. Stop the run first.' // en-only: plain answer of a slash command (text twin)
    const lines = await readFileTasks(i, root)
    if (lines === undefined || lines.length === 0) return tasksText(undefined, lines, await i.now(), dur)
    await saveRun(i, newRun(lines, await i.now(), 'Task run', now?.choices))
    if (ask === 'load') return `Loaded ${tEn('words.task', { n: lines.length })} from ${TASKS_FILE}. Change them in the Agents view, then start.`
  }
  const said = await steer(i, ops, ask as Steer)
  const after = await beat(i, ops)
  return after === undefined ? said : `${said}\n${runSummary(after)}.`
}

// Claude sees them too: a type the model is not offered cannot be dispatched by its own Agent call either
let registered: string | undefined
export const forgetRoles = (): void => {
  registered = undefined
}
async function ensureRoles(en: Pick<RunnerEngine, 'register'>, models: Partial<Record<Role, string>>): Promise<boolean> {
  const sig = ROLE_NAMES.map(r => modelFor('auto', r, models)).join(',')
  if (registered === sig) return true
  let ok = true
  for (const r of ROLE_NAMES) {
    try {
      await en.register(r, modelFor('auto', r, models))
    } catch {
      ok = false
    }
  }
  registered = ok ? sig : undefined
  return ok
}

// Never throws.
export async function rolesChanged(ops: RunnerOps): Promise<void> {
  forgetRoles()
  try {
    await ops.roles()
  } catch {
  }
}
// The same for a file that has only closures (the engine's `$` may not be passed across an import): the register call and the io.
export async function rolesChangedWith(en: Pick<RunnerEngine, 'register' | 'io'>): Promise<void> {
  forgetRoles()
  try {
    await ensureRoles(en, await roleModels(en.io))
  } catch {
  }
}

export const isRoleKey = (key: string): boolean => ROLE_NAMES.some(r => roleSettingKey(r) === key)

export function registerOrchestra(on: On): void {
  on('session.start', { cwd: /(?<orchestra>)/ }, async ($, e, next) => {
    await rolesChanged(opsOf($))
    try {
      await $.command.register({ name: 'vaken-tasks', description: 'Run a task list with agents, as many at a time as this Mac has room for (or your own limit), and steer it. A word after it runs a part: agents, agents-board, route, goal.', argumentHint: HINTS['vaken-tasks'], immediate: true }) // en-only: slash menu hint
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-tasks' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    if (!byPerson(e.origin) && startsWork(parseSteer(e.args))) return { text: BY_PERSON_ONLY }
    try {
      const text = await tasksCommand(bindSafeFs(io($), { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) }), opsOf($), e.args)
      watch($)
      return { text }
    } catch {
      return { text: 'The task runner could not do that. Try again in a moment.' } // en-only: plain answer of a slash command (text twin)
    }
  })

  on('agent.spawn', { subagentType: /(?<orchestra>)/ }, async ($, e, next) => {
    let task: Task | undefined
    let review: Task | undefined
    let sent = e
    try {
      await opsOf($).roles()
    } catch {
    }
    try {
      const run = await loadRun(io($))
      review = run === undefined || run.via !== 'claude' ? undefined : reviewForSpawn(run, e.prompt)
      if (review !== undefined) sent = { ...e, prompt: reviewPrompt(review), subagentType: typeFor({ ...review, role: 'reviewer' }, await opsOf($).roles()), model: modelFor('auto', 'reviewer', await roleModels(io($))), ...(review.path === undefined ? {} : { cwd: review.path }) }
      else task = run === undefined || run.via !== 'claude' ? undefined : taskForSpawn(run, e.description, e.prompt)
      if (task !== undefined) sent = { ...e, prompt: taskPrompt(task), subagentType: typeFor(task, await opsOf($).roles()), model: modelFor(task.model, task.role, await roleModels(io($))), ...(task.path === undefined ? {} : { cwd: task.path }) }
    } catch {
      task = undefined
      review = undefined
      sent = e
    }
    const result = await next(sent)
    if (review !== undefined) {
      try {
        const i = io($)
        const now = await loadRun(i)
        if (now !== undefined) await saveRun(i, withTask(now, review.n, result.agentId === undefined ? { review: 'failed', reviewLines: [`The reviewer did not start: ${(result.deny ?? 'refused').slice(0, 100)}`] } : { review: 'running', reviewAgent: result.agentId }))
        watch($)
      } catch {
      }
      return result
    }
    try {
      if (task !== undefined && result.agentId === undefined) {
        const i = io($)
        const run = await loadRun(i)
        if (run !== undefined) await saveRun(i, withTask(run, task.n, { state: 'failed', endedAt: await i.now(), why: `did not start: ${(result.deny ?? 'refused').slice(0, 120)}` }))
      }
      if (task !== undefined && result.agentId !== undefined) {
        const i = io($)
        const run = await loadRun(i)
        if (run !== undefined) {
          const { askedAt: _a, holdUntil: _h, why: _w, ...fresh } = run.tasks.find(x => x.n === task!.n) ?? task
          const at = await i.now()
          await saveRun(i, { ...run, tasks: run.tasks.map(x => (x.n === task!.n ? { ...fresh, state: 'running' as const, agentId: result.agentId, startedAt: at, tries: x.tries + 1, ran: ranOn(sent.model ?? '', result.model) } : x)) })
          watch($)
        }
      }
    } catch {
      // the 10 s watch cannot bind it; the task is asked for again after two minutes
    }
    return result
  }).catch(($, e, next) => next(e))

  // Each model request of a helper adds its cost to the helper's running sum
  on('turn.step', { turnId: /(?<orchestrastep>)/ }, async function* ($, e, next) {
    const r = yield* next(e)
    try {
      if (e.agentId !== undefined && r.usage !== null) noteStepCost(e.agentId, turnOf(r.usage, 0, 0, true)?.usd)
    } catch {
    }
    return r
  })

  on('turn.complete', { turnId: /(?<orchestra>)/ }, async ($, e, next) => {
    const agentId = e.agentId
    if (agentId !== undefined) {
      clearStepCost(agentId)
      try {
        const i = io($)
        let run = await loadRun(i)
        if (run !== undefined && taskOfReview(run, agentId) !== undefined) {
          const now = await i.now()
          const t = taskOfReview(run, agentId)!
          run = withTask(run, t.n, { usd: (t.usd ?? 0) + (turnOf(e.usage, now, e.durationMs, true)?.usd ?? 0) })
          run = endReview(run, agentId, e.reason === 'answer', e.answer)
          await saveRun(i, run)
          void beat(i, opsOf($))
        } else if (run !== undefined && taskOfAgent(run, agentId) !== undefined) {
          const now = await i.now()
          run = addTaskCost(run, agentId, turnOf(e.usage, now, e.durationMs, true)?.usd)
          run = endTask(run, agentId, e.reason === 'answer' ? 'done' : 'failed', now, e.reason === 'answer' ? undefined : e.reason)
          await saveRun(i, run)
          void beat(i, opsOf($))
        }
      } catch {
        // the 10 s watch reads the engine's list as well
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
