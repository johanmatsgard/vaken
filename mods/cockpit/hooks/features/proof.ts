// Proof (Settings > Safety): receipts for the checks Claude runs (tests, build, lint, type check), the claims in a final answer set against them
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'
import { fillIn } from '../core/fillin'
import { sayIn } from './saylang'

import { holdNote, readNote } from '../core/flush'
import type { Pace } from '../core/flush'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { DEBT_TOAST, GOAL_WITHIN, KIND_SHORT, UNPROVEN_WHAT, afterTurn, buildEvidence, checksIn, cleanGoal, debtToast, debtWords, doneLines, exitCodeOf, goalFrom, goalLines, isPersonMessage, judge, kindWord, packLines, parseKinds, parseShortstat, readState, recordEdit, recordReceipts, stateKey, todoCounts } from '../core/proof'
import type { Diff, Evidence, ProofKind, ProofState } from '../core/proof'
import { claimNote, findClaims, gapDetail, gapLine, gapToast, gapsOf } from '../core/proofclaims'
import { readSetting } from '../core/settings'
import { tellsClaude } from '../core/tellclaude'
import { LEDGER_KEY, pushLog } from './compaction'
import { isEditTool, isShellTool } from '../core/tools'
import { subArgs } from '../core/menu'
import { t as tNow } from '../i18n/t'
import { KEEP_PASSED, KEEP_STARTED, KEEP_STOPPED, atStop, keepAfterReceipts, keepLines, keepOn, startKeep, stopKeep } from '../core/keepgoing'
import { liveStuck, stuckMem } from '../core/loopbreaker'

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

const load = async (i: Io): Promise<ProofState> => readState(await readNote(i, stateKey(await i.sessionId())))

let tail: Promise<unknown> = Promise.resolve()
// The state is a hot note (core/flush.ts): a step's change is saved within half a minute and at the end of the turn (other sessions read only the debt
function change<T>(i: Io, fn: (s: ProofState) => { state: ProofState; out: T }, pace: Pace = 'own'): Promise<T> {
  const run = tail.then(async () => {
    const r = fn(await load(i))
    await holdNote(i, stateKey(await i.sessionId()), r.state, pace)
    return r.out
  })
  tail = run.catch(() => undefined)
  return run
}

// A failed check is recorded once: the named failure event (at once, so Fix shows while Claude still works) or the tool call, whichever comes first.
const failSeen: string[] = []
const FAIL_IDS_MAX = 40
function firstFail(id: unknown): boolean {
  if (typeof id !== 'string' || id === '') return true
  if (failSeen.includes(id)) return false
  failSeen.push(id)
  if (failSeen.length > FAIL_IDS_MAX) failSeen.shift()
  return true
}

export async function setDoneKinds(i: Io, kinds: ProofKind[]): Promise<void> {
  await change(i, s => ({ state: { ...s, done: kinds, doneSeen: false }, out: undefined }), 'now')
  i.invalidate()
}

// Keep going until green (core/keepgoing.ts): only a press turns it on or off; `kind` undefined stops it.
export async function setKeepGoing(i: Io, kind: ProofKind | undefined): Promise<void> {
  const now = await i.now()
  await change(i, s => ({ state: kind === undefined ? stopKeep(s) : startKeep(s, kind, now), out: undefined }), 'now')
  i.toast(tr(kind === undefined ? KEEP_STOPPED : KEEP_STARTED), true)
  i.invalidate()
}

// Dismiss in Needs you takes away the row of the last round; nothing else changes.
export async function dropKeepGoing(i: Io): Promise<void> {
  await change(i, s => ({ state: s.keep?.end === 'max' ? stopKeep(s) : s, out: undefined }), 'now')
  i.invalidate()
}

// Undefined when git cannot say.
async function diffStat(i: Io): Promise<Diff | undefined> {
  try {
    const r = await i.run(['git', 'diff', '--shortstat', 'HEAD'], { timeoutMs: 4000 })
    if (r.exitCode !== 0) return undefined
    return r.stdout.trim() === '' ? { files: 0, lines: 0 } : parseShortstat(r.stdout)
  } catch {
    return undefined
  }
}

export function registerProof(on: On): void {
  // Keep going never outlives the session that pressed it: a resumed session starts with it off
  on('session.start', { cwd: /(?<proof>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      if ((await load(i)).keep !== undefined) await change(i, s => ({ state: stopKeep(s), out: undefined }), 'now')
    } catch {
      // a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // A check that ran leaves a receipt; an edit makes older receipts stale.
  on('tool.call', { tool: /(?<proof>)/ }, async ($, e, next) => {
    const i = io($)
    let enabled = false
    try {
      enabled = (await readSetting(i, 'proof.receipts')) !== 'off'
    } catch {
      enabled = false
    }
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      if (!enabled || result.deny !== undefined) return result
      const input = fieldsOf(e)
      const tool = String(e.tool)
      const now = await i.now()
      if (isEditTool(tool)) {
        if (result.isError === true) return result
        const path = String(input.file_path ?? input.notebook_path ?? input.path ?? tool)
        let root: string | undefined
        try {
          const rootNow = await $.session.root()
          root = rootNow
        } catch {
          root = undefined
        }
        await change(i, s => ({ state: recordEdit(s, path, root), out: undefined }))
        i.invalidate()
      } else if (isShellTool(tool) && typeof input.command === 'string' && input.run_in_background !== true) {
        const hits = checksIn(input.command)
        const interrupted = (result.result as { interrupted?: unknown } | undefined)?.interrupted === true
        if (hits.length > 0 && !interrupted && (result.isError !== true || firstFail(input.tool_use_id))) {
          const failed = result.isError === true
          const results = judge(hits, failed, failed ? exitCodeOf(result.text) : undefined, typeof result.text === 'string' ? result.text : undefined)
          const passed = await change(i, s => {
            const k = keepAfterReceipts(recordReceipts(s, results, now), results)
            return { state: k.state, out: k.passed }
          })
          if (passed !== undefined) i.toast(tr(KEEP_PASSED).replace('{check}', tr(KIND_SHORT[passed])))
          i.invalidate()
        }
      } else if (tool === 'TodoWrite') {
        const todo = todoCounts(input.todos)
        if (todo !== undefined) await change(i, s => ({ state: { ...s, todo }, out: undefined }))
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  // Fix on a failure: the named failure event marks the check failed at once and saves it now, so the Checks card's Fix press (and Needs you's) shows right away.
  on('classic.PostToolUseFailure', { tool_name: /^(?:Bash|PowerShell)$(?<proof>)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      const input = (e.tool_input ?? {}) as { command?: unknown; run_in_background?: unknown }
      if (e.is_interrupt === true || typeof input.command !== 'string' || input.run_in_background === true) return r
      const hits = checksIn(input.command)
      if (hits.length === 0) return r
      const i = io($)
      if ((await readSetting(i, 'proof.receipts')) === 'off' || !firstFail(e.tool_use_id)) return r
      const now = await i.now()
      const results = judge(hits, true, exitCodeOf(e.error), typeof e.error === 'string' ? e.error : undefined)
      await change(i, s => ({ state: recordReceipts(s, results, now), out: undefined }), 'now')
      i.invalidate()
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<proof>)/ }, async ($, e, next) => {
    const i = io($)
    let notes: string[] = []
    try {
      if ((await readSetting(i, 'proof.receipts')) !== 'off' && isPersonMessage(e.text, e.origin)) {
        const now = await i.now()
        notes = await change(i, s => {
          const guess = s.goal === undefined && s.messages < GOAL_WITHIN ? goalFrom(e.text) : undefined
          // The person's message ends Keep going (core/keepgoing.ts)
          const state: ProofState = { ...stopKeep(s), debt: 0, messages: s.messages + 1, note: [], ...(guess === undefined ? {} : { goal: { text: guess, setAt: now, how: 'first' as const } }) }
          return { state, out: s.note.length === 0 ? [] : [claimNote(s.note)] }
        }, 'soon')
        i.invalidate()
      }
    } catch {
      notes = []
    }
    if (notes.length > 0 && !(await tellsClaude(i).catch(() => false))) notes = []
    return next(notes.length === 0 ? e : { ...e, context: [...(e.context ?? []), ...notes] })
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<proof>)/ }, async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined) return r
    const i = io($)
    try {
      if ((await readSetting(i, 'proof.receipts')) === 'off') return r
      const warn = (await readSetting(i, 'proof.claims')) === 'warn'
      const doneOn = (await readSetting(i, 'proof.done')) === 'on'
      const before = await load(i)
      const diff = before.turnEdits > 0 ? await diffStat(i) : undefined
      const claims = warn && e.reason === 'answer' ? findClaims(e.answer) : []
      const now = await i.now()
      const out = await change<{ ev: Evidence; debt: number; doneNew: boolean }>(i, s => {
        const unproven = gapsOf(claims, s, { doneOn })
        const ev = buildEvidence(s, { at: now, durationMs: e.durationMs, diff, claims, unproven, doneOn })
        return { state: afterTurn(s, ev, warn), out: { ev, debt: s.debt + (ev.edits > 0 ? 1 : 0), doneNew: ev.doneMet === true && !s.doneSeen && ev.edits > 0 } }
      })
      if (out.ev.unproven.length > 0) {
        await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: UNPROVEN_WHAT, detail: gapDetail(out.ev.unproven), how: 'auto', did: true })
        i.toast(gapToast(out.ev.unproven))
      } else if (out.doneNew) i.toast(tr('Done: every check you chose passed after the last edit.'))
      else if (out.debt === DEBT_TOAST && out.ev.edits > 0) i.toast(debtToast(out.debt))
      i.invalidate()
      return out.ev.unproven.length > 0 ? { ...r, text: gapLine(out.ev.unproven) } : r
    } catch {
      return r
    }
  }).catch(($, e, next) => next(e))

  // Keep going until green: Claude ends a turn while the pressed check still fails, so the hook asks it to go on, with one fixed reason (core/keepgoing.ts).
  on('classic.Stop', { cwd: /(?<keepgoing>)/ }, async ($, e, next) => {
    const r = await next(e)
    if (r.block !== undefined || e.agent_id !== undefined) return r
    try {
      const i = io($)
      if (keepOn(await load(i)) === undefined) return r
      const receiptsOn = (await readSetting(i, 'proof.receipts')) !== 'off'
      const stuck = liveStuck(stuckMem.offer, await i.now()) !== undefined
      const v = await change(i, s => {
        const out = atStop(s, { receiptsOn, stuck })
        return { state: out.state, out }
      }, 'now')
      if (v.ended !== undefined || v.block !== undefined) i.invalidate()
      return v.block === undefined ? r : { ...r, block: v.block }
    } catch {
      return r
    }
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-ship' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'proof')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i)
    try {
      const s = await load(i)
      const off = (await readSetting(i, 'proof.receipts')) === 'off'
      return { text: [...(off ? [tr('Receipts are off (Settings > Safety), so nothing new is recorded.'), ''] : []), ...packLines(s.last, s), ...keepLines(s)].join('\n') }
    } catch {
      return { text: tr('/vaken-ship proof could not run just now.') }
    }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'done')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i)
    try {
      const arg = rest0.trim().toLowerCase()
      const doneOn = (await readSetting(i, 'proof.done')) === 'on'
      if (arg === '') {
        const s = await load(i)
        return { text: doneLines(s, s.done, doneOn).join('\n') }
      }
      if (arg === 'off' || arg === 'none' || arg === 'clear') {
        await change(i, s => ({ state: { ...s, done: [], doneSeen: false }, out: undefined }), 'now')
        return { text: tr('Definition of done cleared.') }
      }
      const { kinds, bad } = parseKinds(arg)
      if (bad.length > 0 || kinds.length === 0) return { text: fillIn(tr('Not a check: {list}. Use: tests, build, lint, types. Example: /vaken-ship done tests build lint'), { list: bad.join(', ') }) }
      const state = await change(i, s => {
        const done = { ...s, done: kinds, doneSeen: false }
        return { state: done, out: done }
      }, 'now')
      i.invalidate()
      return { text: [fillIn(tr('Definition of done set: {list}.'), { list: kinds.map(k => tr(kindWord(k))).join(', ') }), tr('Done counts only when each one has a passing run after the last file edit.'), '', ...doneLines(state, kinds, doneOn)].join('\n') }
    } catch {
      return { text: tr('/vaken-ship done could not run just now.') }
    }
  })

  on('command.run', { command: 'vaken-tasks' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'goal')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i)
    try {
      const arg = rest0.trim()
      if (arg === '') return { text: goalLines(await load(i)).join('\n') }
      if (arg.toLowerCase() === 'clear') {
        await change(i, s => ({ state: { ...s, goal: undefined, messages: GOAL_WITHIN }, out: undefined }), 'now')
        i.invalidate()
        return { text: tr('Goal cleared. Vaken will not take a new one from your messages.') }
      }
      const now = await i.now()
      const text = cleanGoal(arg)
      await change(i, s => ({ state: { ...s, goal: { text, setAt: now, how: 'typed' } }, out: undefined }), 'now')
      i.invalidate()
      return { text: `${fillIn(tr('Goal set: {text}'), { text })}\n${tr('This sentence is the one text vaken keeps. Clear it with /vaken-tasks goal clear.')}` }
    } catch {
      return { text: tr('/vaken-tasks goal could not run just now.') }
    }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'reviewed')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i)
    try {
      const before = (await load(i)).debt
      await change(i, s => ({ state: { ...s, debt: 0 }, out: undefined }), 'now')
      i.invalidate()
      return { text: before === 0 ? `${debtWords(0)}` : fillIn(tr('Cleared. {answers} marked as looked at.'), { answers: tNow('words.finished_answer', { n: before }) }) }
    } catch {
      return { text: tr('/vaken-ship reviewed could not run just now.') }
    }
  })
}
