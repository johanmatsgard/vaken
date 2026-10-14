// The value meter (Settings > Prompts and memory): /vaken-today value tells what vaken did for you in the last 7 days (or 1), in groups
import type { EngineInterface, On } from 'claude-code'

import { postBand } from '../core/band'
import { AUDIT_KEY, parseAudit } from '../core/insight'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { SETTINGS, readSetting, readSettings } from '../core/settings'
import { DAY_MS, WEEKLY_BAND_MS, WEEKLY_MIN, actionsBetween, cutIn, daysOf, freedBetween, quietBlocks, valueLines, weekStamp, weeklyLine } from '../core/value'
import { LEDGER_KEY, readLog } from './compaction'
import { CALM_KEY, parseCalm } from '../core/calm'
import { COUNTS_KEY, countsSince } from '../core/counts'
import { serialUpdate } from '../core/serial'
import { weeklyBand, weeklyLine as weeklySentence, weeklyValue } from '../core/weekly'
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

// One stamp, so the line comes at most once a week, whatever the count was.
export const WEEK_KEY = 'cockpit:value:week'

const weeklyOn = async (i: Io): Promise<boolean> => (await readSetting(i, 'value.weekly')) === 'on'

// Reads the audit and the ledger; never writes.
export async function valueText(i: Io, args: string): Promise<string> {
  const now = await i.now()
  const days = daysOf(args)
  const from = now - days * DAY_MS
  const audit = parseAudit(await i.get(AUDIT_KEY))
  const ledger = await readLog(i, LEDGER_KEY)
  const rows = actionsBetween(audit, ledger, from, now + 1)
  const quiet = quietBlocks(rows, SETTINGS, await readSettings(i))
  const estimate = days === 7 ? weeklySentence(weeklyValue(countsSince(await i.get(COUNTS_KEY), from), ledger, from, now + 1)) : undefined
  return [...(estimate === undefined ? [] : [`${estimate} (estimate)`]), ...valueLines({ days, rows, freed: freedBetween(ledger, from, now + 1), quiet, cut: cutIn(audit, from) })].join('\n')
}

// Never throws.
export async function weeklyCheck(i: Io): Promise<boolean> {
  try {
    if (!(await weeklyOn(i))) return false
    const now = await i.now()
    const stamp = weekStamp(now)
    if ((await i.get(WEEK_KEY)) === stamp) return false
    await i.set(WEEK_KEY, stamp)
    const ledger = await readLog(i, LEDGER_KEY)
    const from = now - 7 * DAY_MS
    const w = weeklyValue(countsSince(await i.get(COUNTS_KEY), from), ledger, from, now + 1)
    const band = weeklyBand(w)
    if (band !== undefined) {
      await serialUpdate(i, CALM_KEY, old => ({ ...parseCalm(old), weekly: { ...w, week: stamp, at: now } }))
      await postBand(i, 'info', 'value', band, WEEKLY_BAND_MS)
      return true
    }
    const n = actionsBetween(parseAudit(await i.get(AUDIT_KEY)), ledger, from, now + 1).length
    if (n < WEEKLY_MIN) return false
    await postBand(i, 'info', 'value', weeklyLine(n), WEEKLY_BAND_MS)
    return true
  } catch {
    return false
  }
}

export function registerValue(on: On): void {
  on('session.start', { cwd: /(?<value>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the value meter is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-today' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'value')
    if (rest0 === undefined) return next(e)
    try {
      return { text: await valueText(io($), rest0) }
    } catch {
      return { text: 'The value meter could not read what vaken wrote down. Try again in a moment.' } // en-only: plain answer of a slash command (text twin)
    }
  })

  on('prompt.submit', { text: /(?<value>)/ }, async ($, e, next) => {
    await weeklyCheck(io($))
    return next(e)
  }).catch(($, e, next) => next(e))
}
