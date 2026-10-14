// The daily recap (Settings > Prompts and memory): on the first prompt of a calendar day
import type { EngineInterface, On } from 'claude-code'

import { postBand } from '../core/band'
import { ymd } from '../core/time'
import { AUDIT_KEY, parseAudit } from '../core/insight'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { alivePids, listRecords } from '../core/record'
import { readSetting } from '../core/settings'
import { TODAY_BAND_MS, bandBrief, todayLines, yesterdayOf } from '../core/today'
import type { TodayFacts } from '../core/today'
import { actionsBetween } from '../core/value'
import { LEDGER_KEY, readLog } from './compaction'
import { classify } from './home/logic'
import { HINTS, isFolded, unknownWord } from '../core/menu'

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

// One stamp, so the brief comes at most once a day, whatever it said.
export const DAY_KEY = 'cockpit:today:day'

const briefOn = async (i: Io): Promise<boolean> => (await readSetting(i, 'today.brief')) === 'on'

// A fact that cannot be read is left out (zero or undefined), never guessed.
export async function todayFacts(i: Io): Promise<TodayFacts> {
  const now = await i.now()
  const me = await i.sessionId()
  const records = await listRecords(i)
  const alive = await alivePids(i, records)
  const waiting = records.filter(r => r.sessionId !== me && classify(r, now, alive) === 'needs').length

  const y = yesterdayOf(now)
  const prefix = `cockpit:cost:day:${y.day}:`
  let usd = 0
  for (const key of (await i.keys()).filter(k => k.startsWith(prefix))) {
    const v = (await i.get(key)) as { usd?: unknown } | undefined
    if (typeof v?.usd === 'number' && Number.isFinite(v.usd)) usd += v.usd
  }
  const didYesterday = actionsBetween(parseAudit(await i.get(AUDIT_KEY)), await readLog(i, LEDGER_KEY), y.from, y.to).length
  return { waiting, ...(usd > 0 ? { yesterdayUsd: usd } : {}), didYesterday }
}

export async function todayText(i: Io): Promise<string> {
  return todayLines(await todayFacts(i), await briefOn(i)).join('\n')
}

// Never throws.
export async function dailyCheck(i: Io): Promise<boolean> {
  try {
    if (!(await briefOn(i))) return false
    const day = ymd(await i.now())
    if ((await i.get(DAY_KEY)) === day) return false
    await i.set(DAY_KEY, day)
    const line = bandBrief(await todayFacts(i))
    if (line === undefined) return false
    await postBand(i, 'info', 'today', line, TODAY_BAND_MS)
    return true
  } catch {
    return false
  }
}

export function registerToday(on: On): void {
  on('session.start', { cwd: /(?<today>)/ }, async ($, e, next) => {
    try {
      await $.command.register({ name: 'vaken-today', description: 'Today in a few lines: what waits, what yesterday cost, what vaken did. A word after it runs a part: value, recap, glance, standup, waits.', argumentHint: HINTS['vaken-today'], immediate: true })
    } catch {
      // the brief is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-today' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    const unknown = unknownWord(e.command, e.args)
    if (unknown !== undefined) return { text: unknown }
    try {
      return { text: await todayText(io($)) }
    } catch {
      return { text: 'The brief could not read your sessions. Try again in a moment.' } // en-only: plain answer of a slash command (text twin)
    }
  })

  on('prompt.submit', { text: /(?<today>)/ }, async ($, e, next) => {
    await dailyCheck(io($))
    return next(e)
  }).catch(($, e, next) => next(e))
}
