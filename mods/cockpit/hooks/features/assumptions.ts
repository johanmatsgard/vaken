// Assumption review runtime: for a long prompt, add a note for Claude (it rides in `context` with the prompt), at most once an hour in a session
import type { EngineInterface, On } from 'claude-code'

import { ASSUME_BAND_MS, ASSUME_KEY, ASSUME_NOTE, assumptionsText, bandText, findAssumed, parseStored, sentKey, storeKey, wantsNote } from '../core/assumptions'
import { postBand } from '../core/band'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { isPersonMessage } from '../core/proof'
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

const isOn = async (i: Io): Promise<boolean> => (await readSetting(i, ASSUME_KEY)) === 'on'

export function registerAssumptions(on: On): void {
  on('session.start', { cwd: /(?<assume>)/ }, async ($, e, next) => {
    try {
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<assume>)/ }, async ($, e, next) => {
    let note: string | undefined
    try {
      const i = io($)
      if ((await isOn(i)) && isPersonMessage(e.text, e.origin)) {
        const key = sentKey(await i.sessionId())
        const last = await i.get(key)
        const now = await i.now()
        if (wantsNote(e.text, typeof last === 'number' ? last : undefined, now)) {
          note = ASSUME_NOTE
          await i.set(key, now)
        }
      }
    } catch {
    }
    return next(note === undefined ? e : { ...e, context: [...(e.context ?? []), note] })
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<assume>)/ }, async ($, e, next) => {
    try {
      if (e.agentId === undefined && e.reason === 'answer') {
        const i = io($)
        if (await isOn(i)) {
          const found = findAssumed(e.answer)
          if (found.count > 0) {
            await i.set(storeKey(await i.sessionId()), { at: await i.now(), count: found.count, lines: found.lines })
            await postBand(i, 'info', 'assume', bandText(found.count), ASSUME_BAND_MS)
          }
        }
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-explain' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'assumptions')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    return { text: assumptionsText(parseStored(await i.get(storeKey(await i.sessionId()))), await isOn(i), await i.now()) }
  })
}
