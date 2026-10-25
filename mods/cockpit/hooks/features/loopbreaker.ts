// The loop breaker (Settings > Safety: Off, Warn, Stop): when Claude runs the same step again and again and it fails the same way
import { learnNote } from '../core/offerlearn'
import { weekStamp } from '../core/value'
import { tr } from '../core/lang'
import { fillIn } from '../core/fillin'
import { sayIn } from './saylang'
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'

import { BLOCK_WHAT, LADDER_FAILS, LOOP_FAILS, LOOP_WHAT, STUCK_TOAST, STUCK_TOAST_FRESH, THRASH_WHAT, afterCall, afterEdit, beforeCall, blockedDetail, caughtDetail, errKey, fileWord, firstSight, ladderClear, ladderFail, ladderPass, newLadder, newThrash, nudgeText, stepKey, stronger, stuckMem, thrashClear, thrashDetail, thrashEdit, thrashFailure, thrashNote, toastText } from '../core/loopbreaker'
import { KIND_SHORT } from '../core/proof'
import { isShellTool } from '../core/tools'
import type { Seen } from '../core/loopbreaker'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readSetting } from '../core/settings'
import { undoOffer } from '../core/undo'
import { LEDGER_KEY, logLines, pushLog, readLog } from './compaction'
import { isEditTool } from '../core/tools'
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

const SETTING_KEY = 'loop.breaker'

const seen: Seen = new Map()
const blockedLogged = new Set<string>()
const thrash = newThrash()

const ladder = newLadder()

const toolWord = (tool: string): string => (tool.length > 32 ? `${tool.slice(0, 31)}…` : tool)

// The stuck ladder's count of a failed check (core/loopbreaker.ts): the offer waits in Needs you, and nothing runs before a press.
// `err` is a hash of the error's shape (errKey), never its text. The offer comes at the third failure with the same error.
async function noteStuck($: EngineInterface, i: Io, id: string | undefined, command: string, err: string): Promise<void> {
  if (!firstSight(ladder, id)) return
  const found = ladderFail(ladder, command, await i.now(), err)
  if (found === undefined) return
  // The stronger try needs a model above the session's: asked only now, at the offer, never on a step that worked.
  let model: string | undefined
  try {
    const now = await $.session.model()
    model = String(now)
  } catch {
  }
  const up = stronger(model)
  const offer = up === undefined ? found : { ...found, up }
  stuckMem.offer = offer
  const now = await i.now()
  learnNote('stuck', 'shown', now, weekStamp(now))
  i.toast(tr(up === undefined ? STUCK_TOAST_FRESH : STUCK_TOAST).replace('{check}', tr(KIND_SHORT[offer.kind])))
  i.invalidate()
}
const commandOf = (input: unknown): string | undefined => {
  const c = (input as { command?: unknown } | null | undefined)?.command
  return typeof c === 'string' ? c : undefined
}

export function registerLoopBreaker(on: On): void {
  on('session.start', { cwd: /(?<loopbreaker>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the command is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<loopbreaker>)/ }, async ($, e, next) => {
    if (!e.text.trimStart().startsWith('/')) {
      seen.clear()
      blockedLogged.clear()
      thrashClear(thrash)
      ladderClear(ladder)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<loopbreaker>)/ }, async ($, e, next) => {
    const i = io($)
    let key: string | undefined
    let mode = 'off'
    try {
      mode = await readSetting(i, SETTING_KEY)
      if (mode !== 'off') {
        const args = { ...fieldsOf(e) }
        delete args.tool
        delete args.tool_use_id
        delete args.agentId
        key = stepKey(e.agentId, e.tool, args)
        const v = beforeCall(seen, key, e.tool, mode)
        if (v.block) {
          if (!blockedLogged.has(key)) {
            blockedLogged.add(key)
            await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: BLOCK_WHAT, detail: blockedDetail(toolWord(e.tool)), how: 'auto', did: true })
            i.toast(`${tr('Stopped a {tool} step that keeps failing. Your next message lifts it.').replace('{tool}', toolWord(e.tool))}${(await undoOffer(i)).toast}`, true)
            i.invalidate()
          }
          return { deny: v.reason }
        }
      }
    } catch {
      key = undefined
    }
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      if (key !== undefined && result.deny === undefined) {
        const failed = result.isError === true
        const r = afterCall(seen, key, failed, failed ? errKey(result.text ?? '') : '')
        if (r.tripped) {
          await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: LOOP_WHAT, detail: caughtDetail(toolWord(e.tool), r.fails, mode), how: 'auto', did: true })
          i.toast(`${toastText(toolWord(e.tool), r.fails, mode)}${(await undoOffer(i)).toast}`)
          i.invalidate()
        }
        // The ladder counts failures from the named failure event below; here only a pass of the check, and a failure that event did not bring
        const command = e.agentId === undefined && isShellTool(e.tool) ? commandOf(fieldsOf(e)) : undefined
        if (command !== undefined) {
          if (failed) await noteStuck($, i, typeof fieldsOf(e).tool_use_id === 'string' ? String(fieldsOf(e).tool_use_id) : undefined, command, errKey(result.text ?? ''))
          else if (ladderPass(ladder, command)) i.invalidate()
        }
        const notes: string[] = []
        if (r.nudge) notes.push(`${nudgeText(toolWord(e.tool), r.fails)}${r.tripped ? (await undoOffer(i)).note : ''}`)
        // Failing steps and edits of one file, over and over: one calm note, never a refusal (Stop mode too).
        if (failed) thrashFailure(thrash)
        else if (isEditTool(e.tool)) {
          afterEdit(seen)
          const input = fieldsOf(e)
          const path = input.file_path ?? input.notebook_path ?? input.path
          const round = typeof path === 'string' && path !== '' ? thrashEdit(thrash, path, await i.now()) : undefined
          if (round !== undefined && typeof path === 'string') {
            const name = fileWord(path)
            await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: THRASH_WHAT, detail: thrashDetail(name, round.edits, round.minutes), how: 'auto', did: true })
            notes.push(`${thrashNote(name, round.edits, round.minutes)}${(await undoOffer(i)).note}`)
            i.invalidate()
          }
        }
        if (notes.length > 0) return { ...result, context: [...(result.context ?? []), ...notes] }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  // The named failure event fires only for a step that failed, so the ladder's count costs nothing on a step that worked.
  on('classic.PostToolUseFailure', { tool_name: /^(?:Bash|PowerShell)$(?<loopbreaker>)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      const command = commandOf(e.tool_input)
      if (command !== undefined && e.agent_id === undefined && e.is_interrupt !== true) {
        const i = io($)
        if ((await readSetting(i, SETTING_KEY)) !== 'off') await noteStuck($, i, e.tool_use_id, command, errKey(typeof e.error === 'string' ? e.error : ''))
      }
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'loops')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i)
    const mode = await readSetting(i, SETTING_KEY)
    const last = logLines((await readLog(i, LEDGER_KEY)).filter(x => x.what === LOOP_WHAT || x.what === BLOCK_WHAT || x.what === THRASH_WHAT), 3)
    const failing = [...seen.values()].filter(s => s.fails > 0).length
    return {
      text: [
        tr(`Loop breaker: ${mode}.`),
        `${fillIn(tr('It watches for a step that fails {n} times in a row, the same way. Then it tells Claude to stop and ask you.'), { n: LOOP_FAILS })}${mode === 'stop' ? ` ${tr('It also blocks the next try until you write a message.')}` : ''}`,
        tr('It also notes a file that Claude edits 5 times in 10 minutes while steps keep failing. That is only a note, never a block.'),
        fillIn(tr('When the same check (tests, build, lint, types) fails {n} times in a row with the same error, Needs you offers a way out: a stronger agent once (only when a stronger model exists), or a fresh start. Nothing runs before you press. Off turns this off too.'), { n: LADDER_FAILS }),
        ...(mode === 'off' ? [tr('Turn it on: Settings > Safety.')] : mode === 'warn' ? [tr('For a hard stop, set it to Stop: Settings > Safety.')] : []),
        '',
        failing === 0 ? tr('No failing step now.') : fillIn(tr('Steps that failed and have not worked since: {n}.'), { n: failing }),
        ...(last.length === 0 ? [] : ['', tr('Last:'), ...last]),
      ].join('\n'),
    }
  })
}
