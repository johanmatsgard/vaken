// The loop breaker (Settings > Safety: Off, Warn, Stop): when Claude runs the same step again and again and it fails the same way
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { BLOCK_WHAT, LOOP_FAILS, LOOP_WHAT, THRASH_WHAT, afterCall, beforeCall, blockedDetail, caughtDetail, errKey, fileWord, newThrash, nudgeText, stepKey, thrashClear, thrashDetail, thrashEdit, thrashFailure, thrashNote, toastText } from '../core/loopbreaker'
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

const toolWord = (tool: string): string => (tool.length > 32 ? `${tool.slice(0, 31)}…` : tool)

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
        const args = { ...(e as unknown as Record<string, unknown>) }
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
        const notes: string[] = []
        if (r.nudge) notes.push(`${nudgeText(toolWord(e.tool), r.fails)}${r.tripped ? (await undoOffer(i)).note : ''}`)
        // Failing steps and edits of one file, over and over: one calm note, never a refusal (Stop mode too).
        if (failed) thrashFailure(thrash)
        else if (isEditTool(e.tool)) {
          const input = e as unknown as Record<string, unknown>
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

  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'loops')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const mode = await readSetting(i, SETTING_KEY)
    const last = logLines((await readLog(i, LEDGER_KEY)).filter(x => x.what === LOOP_WHAT || x.what === BLOCK_WHAT || x.what === THRASH_WHAT), 3)
    const failing = [...seen.values()].filter(s => s.fails > 0).length
    return {
      text: [
        `Loop breaker: ${mode}.`,
        `It watches for a step that fails ${LOOP_FAILS} times in a row, the same way. Then it tells Claude to stop and ask you.${mode === 'stop' ? ' It also blocks the next try until you write a message.' : ''}`,
        'It also notes a file that Claude edits 5 times in 10 minutes while steps keep failing. That is only a note, never a block.', // en-only: plain answer of a slash command (text twin)
        ...(mode === 'off' ? ['Turn it on: Settings > Safety.'] : mode === 'warn' ? ['For a hard stop, set it to Stop: Settings > Safety.'] : []), // en-only: plain answer of a slash command (text twin)
        '',
        failing === 0 ? 'No failing step now.' : `Steps that failed and have not worked since: ${failing}.`, // en-only: plain answer of a slash command (text twin)
        ...(last.length === 0 ? [] : ['', 'Last:', ...last]),
      ].join('\n'),
    }
  })
}
