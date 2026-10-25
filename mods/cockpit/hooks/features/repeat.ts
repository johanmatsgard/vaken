// Repeat to skill, runtime: notes the kinds of steps after each person prompt in memory, and at the end of the answer counts the shape's hash per project.
// The third time in 14 days the Skills card (or Needs you, with Skills hidden) offers to save it as a skill. Nothing runs without a press.
import type { EngineInterface, On } from 'claude-code'

import { withToastGate } from '../core/io'
import type { Io } from '../core/io'
import { homeFrom } from '../core/platform'
import { fieldsOf } from '../core/eventfields'
import { byPerson } from '../core/origin'
import { readSetting } from '../core/settings'
import { learnMem, learnNote, notePress, quietNow } from '../core/offerlearn'
import { weekStamp } from '../core/value'
import { REPEAT_DRAFTED_MS, REPEAT_QUIET_MS, addStep, countShape, newRoutine, parseRepeat, quietShape, repeatKey, repeatMem, shapeHash, slashHash } from '../core/repeat'
import type { RepeatOffer, Routine } from '../core/repeat'

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

// The Skills card's own setting (Skill coach, `coach.mode`) turns this off too.
export const repeatOn = (v: unknown): boolean => v !== 'off'

// At the end of an answer: counts the routine's shape; the third time offers it. Reads the store only for a turn of 3 to 8 steps. Never throws.
export async function endRoutine(i: Io, root: string, answered: boolean): Promise<RepeatOffer | undefined> {
  const r = repeatMem.cur
  repeatMem.cur = undefined
  try {
    const hash = r === undefined || !answered ? undefined : shapeHash(r)
    if (r === undefined || hash === undefined || root.trim() === '' || repeatMem.offer !== undefined) return undefined
    if (!repeatOn(await readSetting(i, 'coach.mode'))) return undefined
    const key = repeatKey(root)
    const now = await i.now()
    const c = countShape(parseRepeat(await i.get(key)), hash, now)
    await i.set(key, c.state)
    // Put off 3 times in a row in this project: no offer for a week (core/offerlearn.ts)
    if (!c.offer || quietNow(learnMem.book, 'repeat', now)) return undefined
    learnNote('repeat', 'shown', now, weekStamp(now))
    repeatMem.offer = { hash, steps: r.steps, root }
    i.invalidate()
    return repeatMem.offer
  } catch {
    return undefined
  }
}

// The pane's press: "Not now" quiets this shape for 14 days; a drafted one for 90. The offer leaves either way. Never throws.
export async function answerRepeat(i: Io, drafted: boolean): Promise<RepeatOffer | undefined> {
  const o = repeatMem.offer
  repeatMem.offer = undefined
  if (o === undefined) return undefined
  try {
    await notePress(i, 'repeat', drafted ? 'pressed' : 'dismissed', false)
    const key = repeatKey(o.root)
    const now = await i.now()
    await i.set(key, quietShape(parseRepeat(await i.get(key)), o.hash, now + (drafted ? REPEAT_DRAFTED_MS : REPEAT_QUIET_MS)))
  } catch {
    // a missed write only lets the offer come back sooner
  }
  return o
}

// A person's prompt (typed here or on the phone) starts a routine; vaken's own requests, peers and schedules do not.
export const routineFor = (text: string, origin: unknown): Routine | undefined => (byPerson(origin) && text.trim() !== '' ? newRoutine(slashHash(text)) : undefined)

export function registerRepeat(on: On): void {
  // A person's prompt (typed here or on the phone) starts a routine; a prompt delivered into a running turn does not.
  on('prompt.submit', { text: /(?<repeat>)/ }, async ($, e, next) => {
    try {
      if (e.turnId === undefined) repeatMem.cur = routineFor(e.text, e.origin)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Memory only: no store read on the busiest hook.
  on('tool.call', { tool: /(?<repeat>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      const r = repeatMem.cur
      if (r !== undefined && e.agentId === undefined && result.deny === undefined) repeatMem.cur = addStep(r, e.tool, fieldsOf(e), result.isError === true)
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<repeat>)/ }, async ($, e, next) => {
    try {
      if (e.agentId === undefined && repeatMem.cur !== undefined) {
        const root = await $.session.root()
        await endRoutine(io($), root, e.reason === 'answer')
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
