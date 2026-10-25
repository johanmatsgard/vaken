// Error translator runtime: when a tool result is an error, keep its kind (never its text), toast a failed shell step once at the answer's end, and answer /vaken-explain error.
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'

import { withToastGate } from '../core/io'
import { isShellTool } from '../core/tools'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { classify, errorWords, exitOf, failedKey, failedWhat, lastKey, noteShellStep, shellFail } from '../core/errors'
import { failToastDue, failToastText } from '../core/welcome'
import { isQuiet } from '../core/attention'
import { nextMem } from '../core/actions'
import { PANE } from './home/prefs'
import type { Failed } from '../core/errors'
import type { Last } from '../core/errors'
import { readSetting } from '../core/settings'
import { subArgs } from '../core/menu'
import { sayIn } from './saylang'

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

// The label of the last failing shell command noted in this process
let failedLabel: string | undefined

export function registerErrors(on: On): void {
  on('session.start', { cwd: /(?<errors>)/ }, async ($, e, next) => {
    shellFail.failed = false
    shellFail.kind = undefined
    shellFail.told = true
    shellFail.toastAt = undefined
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<errors>)/ }, async ($, e, next) => {
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      if (result.deny === undefined && e.agentId === undefined) {
        const i = io($)
        const input = fieldsOf(e)
        // The setting is read only on a failure, never on a step that worked.
        if (result.isError === true && (await readSetting(i, 'errors.mode')) !== 'off') {
          const known = classify(result.text ?? '')
          const at = await i.now()
          noteShellStep(false, isShellTool(e.tool), known?.kind)
          if (known !== undefined) await i.set(lastKey(await i.sessionId()), { at, tool: e.tool, kind: known.kind } satisfies Last)
          // Never the error text.
          const exit = exitOf(result.text ?? '')
          const what = failedWhat(e.tool, { command: input.command, path: input.file_path ?? input.notebook_path ?? input.path })
          failedLabel = isShellTool(e.tool) ? what : undefined
          await i.set(failedKey(await i.sessionId()), { at, what, ...(exit === undefined ? {} : { exit }), ...(known === undefined ? {} : { kind: known.kind }) } satisfies Failed)
        } else {
          noteShellStep(result.isError !== true, false, undefined)
          if (failedLabel !== undefined && result.isError !== true && isShellTool(e.tool) && failedWhat(e.tool, { command: input.command }) === failedLabel) {
            failedLabel = undefined
            await i.del(failedKey(await i.sessionId()))
          }
        }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  // After the answer's own hooks picked the next steps: one calm toast for a failed shell step, unless Fix it already shows in an open pane.
  on('turn.complete', { turnId: /(?<errors>)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (e.agentId === undefined && shellFail.failed && !shellFail.told) {
        shellFail.told = true
        const i = io($)
        const now = await i.now()
        if (e.reason === 'answer' && failToastDue(shellFail.toastAt, now) && !isQuiet(String(await readSetting(i, 'notify.quiet')), new Date(now).getHours())) {
          const fixShown = nextMem.picks.includes('fix')
          let seen = false
          if (fixShown) {
            const panes = await $.ui.panes()
            seen = panes.some(p => p.id === PANE && p.isShown)
          }
          if (!seen) {
            shellFail.toastAt = now
            i.toast(failToastText(shellFail.kind, fixShown))
          }
        }
      }
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-explain' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'error')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    return { text: errorWords((await i.get(lastKey(await i.sessionId()))) as Last | undefined, await i.now()) }
  })
}
