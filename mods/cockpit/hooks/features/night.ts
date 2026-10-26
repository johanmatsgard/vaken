// The promise ledger and the person's last message, for Where was I (core/night.ts). Memory first: the prompt hook reads no store.
import type { EngineInterface, On } from 'claude-code'

import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readSetting } from '../core/settings'
import { byPerson } from '../core/origin'
import { PROMISES_KEY, addPromises, donePromise, findPromises, nightMem, parsePromises } from '../core/night'
import { awakeClaim } from './nightrun'

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

// The runner's own message to Claude is not the person coming back.
const isRunnerAsk = (text: string): boolean => /^Please start (?:this agent|these \d+ agents) for my task run\b/.test(text)

async function savePromises(i: Io, list: string[]): Promise<void> {
  const key = PROMISES_KEY(await i.sessionId())
  if (list.length === 0) await i.del(key)
  else await i.set(key, list)
  i.invalidate()
}

// Exported so that a test can run them with a small Io.
export async function notePrompt(i: Io, text: string): Promise<void> {
  nightMem.lastPrompt = await i.now()
  const left = donePromise(nightMem.promises, text)
  if (left === undefined) return
  nightMem.promises = left
  await savePromises(i, left)
}

export async function noteAnswer(i: Io, answer: string): Promise<void> {
  const found = findPromises(answer)
  if (found.length === 0 || (await readSetting(i, 'recap.mode')) === 'off') return
  const withFound = addPromises(nightMem.promises, found)
  if (withFound.length === nightMem.promises.length && withFound.every((p, k) => p === nightMem.promises[k])) return
  nightMem.promises = withFound
  await savePromises(i, withFound)
}

export function registerNight(on: On): void {
  on('session.start', { cwd: /(?<night>)/ }, async ($, e, next) => {
    nightMem.lastPrompt = undefined
    try {
      const i = io($)
      nightMem.promises = parsePromises(await i.get(PROMISES_KEY(await i.sessionId())))
    } catch {
      nightMem.promises = []
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // A message answered by vaken itself (the phone menu) is dropped and does not count as being back.
  on('prompt.submit', { text: /(?<night>)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (!('drop' in r && r.drop !== undefined) && byPerson(e.origin) && !isRunnerAsk(e.text)) await notePrompt(io($), e.text)
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<night>)/ }, async ($, e, next) => {
    try {
      if (e.agentId === undefined && e.reason === 'answer' && typeof e.answer === 'string') await noteAnswer(io($), e.answer)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { sessionId: /(?<night>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      if (nightMem.promises.length > 0) {
        nightMem.promises = []
        await i.del(PROMISES_KEY(await i.sessionId()))
      }
      // The session's keep-awake claim goes with it, so an ended night run never keeps the Mac awake.
      await awakeClaim(i, undefined)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
