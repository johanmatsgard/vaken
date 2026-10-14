// Error translator runtime: when a tool result is an error, keep its kind (never its text), and answer /vaken-explain error.
import type { EngineInterface, On } from 'claude-code'

import { withToastGate } from '../core/io'
import { isShellTool } from '../core/tools'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { classify, errorWords, exitOf, failedKey, failedWhat, lastKey } from '../core/errors'
import type { Failed } from '../core/errors'
import type { Last } from '../core/errors'
import { readSetting } from '../core/settings'
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

// The label of the last failing shell command noted in this process
let failedLabel: string | undefined

export function registerErrors(on: On): void {
  on('session.start', { cwd: /(?<errors>)/ }, async ($, e, next) => {
    try {
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<errors>)/ }, async ($, e, next) => {
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      const i = io($)
      const input = e as unknown as { command?: unknown; file_path?: unknown; notebook_path?: unknown; path?: unknown }
      if (result.deny === undefined && result.isError === true && e.agentId === undefined && (await readSetting(i, 'errors.mode')) !== 'off') {
        const known = classify(result.text ?? '')
        const at = await i.now()
        if (known !== undefined) await i.set(lastKey(await i.sessionId()), { at, tool: e.tool, kind: known.kind } satisfies Last)
        // Never the error text.
        const exit = exitOf(result.text ?? '')
        const what = failedWhat(e.tool, { command: input.command, path: input.file_path ?? input.notebook_path ?? input.path })
        failedLabel = isShellTool(e.tool) ? what : undefined
        await i.set(failedKey(await i.sessionId()), { at, what, ...(exit === undefined ? {} : { exit }), ...(known === undefined ? {} : { kind: known.kind }) } satisfies Failed)
      } else if (failedLabel !== undefined && result.deny === undefined && result.isError !== true && isShellTool(e.tool) && e.agentId === undefined && failedWhat(e.tool, { command: input.command }) === failedLabel) {
        failedLabel = undefined
        await i.del(failedKey(await i.sessionId()))
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-explain' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'error')
    if (rest0 === undefined) return next(e0)
    const i = io($)
    return { text: errorWords((await i.get(lastKey(await i.sessionId()))) as Last | undefined, await i.now()) }
  })
}
