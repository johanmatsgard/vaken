// Self-steering tools runtime: register the read-only cockpit tool for the model and serve it with the same commands the person can type.
import type { EngineInterface, On } from 'claude-code'

import { readNote } from '../core/flush'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { happenedWords } from '../core/happened'
import type { Turn } from '../core/happened'
import { doneLines, goalLines, packLines, readState, stateKey } from '../core/proof'
import { HEALTH_KEY, healthText } from '../core/stability'
import type { Health } from '../core/stability'
import { STEER_DESCRIPTION, STEER_SCHEMA, STEER_TOOL, isTopic, unknownTopic } from '../core/steer'
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

export function registerSteer(on: On): void {
  on('session.start', { cwd: /(?<steer>)/ }, async ($, e, next) => {
    try {
      if ((await readSetting(io($), 'steer.mode')) !== 'off') await $.tool.register({ name: STEER_TOOL, description: STEER_DESCRIPTION, inputSchema: STEER_SCHEMA, isDeferred: true })
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: `mcp__vaken__${STEER_TOOL}` }, async ($, e) => {
    const topic = (e as unknown as { topic?: unknown }).topic
    if (!isTopic(topic)) return { result: unknownTopic() }
    try {
      const i = io($)
      const id = await i.sessionId()
      if (topic === 'happened') return { result: happenedWords((await i.get(`cockpit:happened:${id}`)) as Turn | undefined) }
      if (topic === 'health') return { result: healthText((await i.get(HEALTH_KEY)) as Health | undefined) }
      const s = readState(await readNote(i, stateKey(id)))
      if (topic === 'goal') return { result: goalLines(s).join('\n') }
      if (topic === 'done') return { result: doneLines(s, s.done, true).join('\n') }
      return { result: packLines(s.last, s).join('\n') }
    } catch (err) {
      return { result: `Vaken could not answer that now. ${err instanceof Error ? err.message.slice(0, 160) : ''}` }
    }
  })
}
