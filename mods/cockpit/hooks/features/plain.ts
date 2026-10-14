// Plain mode runtime: add the plain-words section to the system prompt when Plain mode is on, and answer /vaken-help glossary.
import type { EngineInterface, On } from 'claude-code'

import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { GLOSSARY, PLAIN_SECTION_ID, PLAIN_TEXT, glossaryText } from '../core/plain'
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

export function registerPlain(on: On): void {
  on('session.start', { cwd: /(?<plain>)/ }, async ($, e, next) => {
    try {
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.compose', { model: /(?<plain>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      if ((await readSetting(io($), 'plain.mode')) === 'on' && !result.sections.some(s => s.id === PLAIN_SECTION_ID)) {
        return { ...result, sections: [...result.sections, { id: PLAIN_SECTION_ID, text: PLAIN_TEXT, scope: 'session' as const }] }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'glossary')
    if (rest0 === undefined) return next(e)
    return { text: `${GLOSSARY.length} words:\n${glossaryText()}` }
  })
}
