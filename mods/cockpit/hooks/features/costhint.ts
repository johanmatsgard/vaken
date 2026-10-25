// The cost hint before a big job (core/costhint.ts): learns from the session's own readings, one calm line on a big message or a task run. Part of the Lean session row.
import type { EngineInterface, On } from 'claude-code'
import { postBand } from '../core/band'
import { HINT_BAND_ID, HINT_KEY, HINT_TTL_MS, addSample, bigPercent, hintDue, hintLine, isBigJob, parseSamples, runPercent, sampleOf } from '../core/costhint'
import type { Reading } from '../core/costhint'
import { leanMem } from '../core/lean'
import { isPersonMessage } from '../core/proof'
import { withToastGate } from '../core/io'
import type { Io } from '../core/io'
import { homeFrom } from '../core/platform'

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

// Memory only: the newest reading, the one at the start of the turn, and when the line last showed.
export const costMem: { cur?: Reading; snap?: Reading & { big: boolean }; big: boolean; shownAt?: number } = { big: false }

export function forgetHint(): void {
  costMem.cur = undefined
  costMem.snap = undefined
  costMem.big = false
  costMem.shownAt = undefined
}

// The line for a task run about to start, or undefined; it counts as shown.
export async function runHint(i: Io, usd: number, t: (s: string) => string): Promise<string | undefined> {
  if (leanMem.mode === 'off') return undefined
  const now = await i.now()
  if (!hintDue(costMem.shownAt, now)) return undefined
  const line = hintLine(runPercent(parseSamples(await i.get(HINT_KEY)), usd), t)
  if (line !== undefined) costMem.shownAt = now
  return line
}

export async function bigMessageHint(i: Io, text: string, origin: { kind?: string } | undefined): Promise<void> {
  if (leanMem.mode === 'off' || !isPersonMessage(text, origin) || !isBigJob(text)) return
  const now = await i.now()
  if (!hintDue(costMem.shownAt, now)) return
  const line = hintLine(bigPercent(parseSamples(await i.get(HINT_KEY))))
  if (line === undefined) return
  costMem.shownAt = now
  await postBand(i, 'info', HINT_BAND_ID, line, HINT_TTL_MS)
}

export function registerCostHint(on: On): void {
  on('session.start', { cwd: /(?<costhint>)/ }, async ($, e, next) => {
    forgetHint()
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.measure', { changed: /(?<costhint>)/ }, async ($, e, next) => {
    try {
      const five = e.rateLimits.find(r => r.kind === 'five_hour')
      const usd = e.cost?.usd
      if (five !== undefined && typeof usd === 'number') costMem.cur = { usd, pct: five.percentUsed, resetsAt: five.resetsAt ?? '' }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<costhint>)/ }, async ($, e, next) => {
    try {
      costMem.big = isPersonMessage(e.text, e.origin) && isBigJob(e.text)
      if (costMem.big) await bigMessageHint(io($), e.text, e.origin)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The last turn's sample is taken when the next one starts, so its cost is complete. The store is touched only when there is one.
  on('turn.start', { turnId: /(?<costhint>)/ }, async ($, e, next) => {
    try {
      const s = sampleOf(costMem.snap, costMem.cur, costMem.snap?.big === true)
      if (s !== undefined) {
        const i = io($)
        await i.set(HINT_KEY, addSample(parseSamples(await i.get(HINT_KEY)), s))
      }
      costMem.snap = costMem.cur === undefined ? undefined : { ...costMem.cur, big: costMem.big }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
