// What just happened runtime: count each tool call of the turn, keep the sentence when the answer ends, and answer /vaken-explain happened.
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'

import { countCall, emptyTurn, happenedWords, riskNote } from '../core/happened'
import type { Turn } from '../core/happened'
import { postBand } from '../core/band'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
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

const lastKey = (id: string): string => `cockpit:happened:${id}`

let current: Turn = emptyTurn()

const isOn = async (i: Io): Promise<boolean> => (await readSetting(i, 'happened.mode')) !== 'off'

export function registerHappened(on: On): void {
  on('session.start', { cwd: /(?<happened>)/ }, async ($, e, next) => {
    try {
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', { turnId: /(?<happened>)/ }, async ($, e, next) => {
    current = emptyTurn()
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<happened>)/ }, async ($, e, next) => {
    try {
      if (e.agentId === undefined && (await isOn(io($)))) current = countCall(current, e.tool, fieldsOf(e))
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<happened>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      if (await isOn(i)) {
        await i.set(lastKey(await i.sessionId()), current)
        const note = riskNote(current)
        if (note !== undefined) await postBand(i, 'warn', 'happened-risk', note.replace(/^Risky this answer: /, 'Risky: ').replace(/\.$/, ''), 5 * 60_000)
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-explain' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'happened')
    if (rest0 === undefined) return next(e)
    const i = io($)
    return { text: happenedWords((await i.get(lastKey(await i.sessionId()))) as Turn | undefined) }
  })
}
