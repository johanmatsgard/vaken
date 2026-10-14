// Fresh-start nudge runtime: on a new message, a cheap local test of the topic (core/freshstart.ts), when the topic is new and the chat is big
import type { EngineInterface, On } from 'claude-code'

import { postBand } from '../core/band'
import { holdNote, readNote } from '../core/flush'
import { FRESH_BAND_ID, FRESH_TEXT, FRESH_TTL_MS, FRESH_WHAT, advanceFresh, freshKey, freshLine, judgeFresh, readFresh } from '../core/freshstart'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readRecord } from '../core/record'
import { readSetting } from '../core/settings'
import { LEDGER_KEY, pushLog } from './compaction'
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

const SETTING_KEY = 'fresh.nudge'

// Never stores the message.
export async function freshCheck(i: Io, e: { text: string; origin?: { kind?: string } }): Promise<void> {
  const mode = await readSetting(i, SETTING_KEY)
  if (mode !== 'on') return
  const id = await i.sessionId()
  const now = await i.now()
  const state = readFresh(await readNote(i, freshKey(id)))
  const v = judgeFresh({ mode, text: e.text, origin: e.origin, tokens: (await readRecord(i, id))?.ctx?.tokens, now, state })
  if (!v.record) return
  // A hot note (core/flush.ts): on by default now
  await holdNote(i, freshKey(id), advanceFresh(state, v, now), 'own')
  if (v.fire) {
    await pushLog(i, LEDGER_KEY, { at: now, session: id, what: FRESH_WHAT, detail: v.why, how: 'auto', did: true })
    await postBand(i, 'warn', FRESH_BAND_ID, FRESH_TEXT, FRESH_TTL_MS)
  }
}

export function registerFreshStart(on: On): void {
  on('session.start', { cwd: /(?<freshstart>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the command is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<freshstart>)/ }, async ($, e, next) => {
    try {
      await freshCheck(io($), e)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-explain' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'fresh')
    if (rest0 === undefined) return next(e0)
    const i = io($)
    return { text: freshLine(await readSetting(i, SETTING_KEY), readFresh(await readNote(i, freshKey(await i.sessionId())))) }
  })
}
