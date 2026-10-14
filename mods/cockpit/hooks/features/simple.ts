// Explain at my level: `/vaken-settings simple` re-tells Claude's last answer in plain words (core/simple.ts).
import type { EngineInterface, On } from 'claude-code'

import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { FAILED_WORDS, NO_ANSWER_WORDS, SIMPLE_MODEL, SIMPLE_REPLY_TOKENS, SIMPLE_SYSTEM, SIMPLE_TIMEOUT_MS, simpleLines, simplePrompt } from '../core/simple'
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

let last: string | undefined
export const lastAnswer = (): string | undefined => last
export const noteAnswer = (answer: string): void => {
  if (answer.trim() !== '') last = answer
}

export async function simpler(i: Io, answer: string | undefined): Promise<string[]> {
  if (answer === undefined || answer.trim() === '') return [NO_ANSWER_WORDS]
  try {
    const r = await i.complete({ model: SIMPLE_MODEL, system: SIMPLE_SYSTEM, prompt: simplePrompt(answer), maxTokens: SIMPLE_REPLY_TOKENS, effort: 'low', timeoutMs: SIMPLE_TIMEOUT_MS })
    const lines = r.isAnswered ? simpleLines(r.text) : []
    return lines.length === 0 ? [FAILED_WORDS] : lines
  } catch {
    return [FAILED_WORDS]
  }
}

export function registerSimple(on: On): void {
  on('session.start', { cwd: /(?<simple>)/ }, async ($, e, next) => {
    try {
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<simple>)/ }, async ($, e, next) => {
    if (e.agentId === undefined) noteAnswer(e.answer)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-settings' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'simple')
    if (rest0 === undefined) return next(e)
    return { text: (await simpler(io($), lastAnswer())).join('\n') }
  })
}
