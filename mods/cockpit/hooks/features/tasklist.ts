// Working habits runtime: for a long person prompt, add one note for Claude with the habits that are on (it rides in `context` with the prompt), at most once an hour in a session.
import type { EngineInterface, On } from 'claude-code'

import { HABIT_KEYS, habitsNote, tasksStoreKey, wantsTaskNote } from '../core/tasklist'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { isPersonMessage } from '../core/proof'
import { readSetting } from '../core/settings'

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

export function registerTaskList(on: On): void {
  on('prompt.submit', { text: /(?<tasks>)/ }, async ($, e, next) => {
    let note: string | undefined
    try {
      if (isPersonMessage(e.text, e.origin)) {
        const i = io($)
        const key = tasksStoreKey(await i.sessionId())
        const last = await i.get(key)
        const now = await i.now()
        if (wantsTaskNote(e.text, typeof last === 'number' ? last : undefined, now)) {
          const chosen: string[] = []
          for (const k of HABIT_KEYS) if ((await readSetting(i, k)) === 'on') chosen.push(k)
          note = habitsNote(chosen)
          if (note !== undefined) await i.set(key, now)
        }
      }
    } catch {
    }
    return next(note === undefined ? e : { ...e, context: [...(e.context ?? []), note] })
  }).catch(($, e, next) => next(e))
}
