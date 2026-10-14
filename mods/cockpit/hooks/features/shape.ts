// Answer shape runtime: add the answer-shape section to the system prompt when Short or Report is chosen, and answer /vaken-settings shape.
import type { EngineInterface, On } from 'claude-code'

import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { SHAPE_KEY, SHAPE_SECTION_ID, SHAPE_SETTINGS, SHAPE_TEXT, changedLine, parseAsk, shapeLabel, shapeLines, shapeOf } from '../core/shape'
import type { Shape } from '../core/shape'
import { settingStoreKey, writeSetting } from '../core/settings'
import { LEDGER_KEY, pushLog } from './compaction'
import { subArgs } from '../core/menu'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'

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

const current = async (i: Io): Promise<Shape> => shapeOf(await i.get(settingStoreKey(SHAPE_KEY)))

async function save(i: Io, shape: Shape): Promise<void> {
  if (await writeSetting(i, SHAPE_KEY, shape)) return
  if (SHAPE_SETTINGS[0].options.some(o => o.value === shape)) await i.set(settingStoreKey(SHAPE_KEY), shape)
}

export function registerShape(on: On): void {
  on('session.start', { cwd: /(?<shape>)/ }, async ($, e, next) => {
    try {
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.compose', { model: /(?<shape>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      const shape = await current(io($))
      if (shape !== 'default' && !result.sections.some(s => s.id === SHAPE_SECTION_ID)) {
        return { ...result, sections: [...result.sections, { id: SHAPE_SECTION_ID, text: SHAPE_TEXT[shape], scope: 'session' as const }] }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-settings' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'shape')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const ask = parseAsk(e.args)
    if (ask.kind === 'bad') return { text: ask.why }
    if (ask.kind === 'show') return { text: shapeLines(await current(i)) }
    // A shape adds words to Claude's system prompt, so only the person typing here may change it (core/origin.ts)
    if (!byPerson(e0.origin)) return { text: BY_PERSON_ONLY }
    if ((await current(i)) === ask.shape) return { text: `Answer shape is already ${shapeLabel(ask.shape)}.` }
    await save(i, ask.shape)
    await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: 'Changed the answer shape', detail: `Answer shape: ${shapeLabel(ask.shape)}.`, how: 'typed', did: true })
    i.invalidate()
    return { text: changedLine(ask.shape) }
  })
}
