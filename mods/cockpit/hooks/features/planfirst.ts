// The note goes in the `context` of the prompt, the way proof.ts carries its note.
import type { EngineInterface, On } from 'claude-code'

import { postBand } from '../core/band'
import { holdNote, readNote } from '../core/flush'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { PLAN_ASK_WHAT, PLAN_BAND_ASK, PLAN_BAND_ID, PLAN_BAND_SUGGEST, PLAN_NOTE, PLAN_SUGGEST_TTL_MS, PLAN_SUGGEST_WHAT, advancePlan, judgePlan, planKey, planLine, readPlan } from '../core/planfirst'
import { readState, stateKey } from '../core/proof'
import { readSetting } from '../core/settings'
import { LEDGER_KEY, pushLog } from './compaction'
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

const SETTING_KEY = 'plan.first'

// Stores a time and a sentence, never the message.
export async function planCheck(i: Io, msg: { text: string; origin?: { kind?: string } }): Promise<string | undefined> {
  const mode = await readSetting(i, SETTING_KEY)
  if (mode === 'off') return undefined
  const id = await i.sessionId()
  const now = await i.now()
  const state = readPlan(await readNote(i, planKey(id)))
  const v = judgePlan({ mode, text: msg.text, origin: msg.origin, edits: readState(await readNote(i, stateKey(id))).edits, now, state })
  if (!v.record) return undefined
  // A hot note (core/flush.ts): on by default now
  await holdNote(i, planKey(id), advancePlan(state, v, now), 'own')
  if (v.act === 'ask') {
    try {
      await pushLog(i, LEDGER_KEY, { at: now, session: id, what: PLAN_ASK_WHAT, detail: v.why, how: 'auto', did: true })
      await postBand(i, 'info', PLAN_BAND_ID, PLAN_BAND_ASK)
    } catch {
    }
    return PLAN_NOTE
  }
  if (v.act === 'suggest') {
    await pushLog(i, LEDGER_KEY, { at: now, session: id, what: PLAN_SUGGEST_WHAT, detail: v.why, how: 'auto', did: true })
    await postBand(i, 'warn', PLAN_BAND_ID, PLAN_BAND_SUGGEST, PLAN_SUGGEST_TTL_MS)
  }
  return undefined
}

export function registerPlanFirst(on: On): void {
  on('session.start', { cwd: /(?<planfirst>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the command is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<planfirst>)/ }, async ($, e, next) => {
    let note: string | undefined
    try {
      note = await planCheck(io($), e)
    } catch {
    }
    return next(note === undefined ? e : { ...e, context: [...(e.context ?? []), note] })
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-explain' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'planfirst')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    return { text: planLine(await readSetting(i, SETTING_KEY), readPlan(await readNote(i, planKey(await i.sessionId())))) }
  })
}
