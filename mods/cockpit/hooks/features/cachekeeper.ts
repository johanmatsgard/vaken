// The cache keeper (opt-in, Settings > Money and plan): while a session is quiet
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { parseStoredUsage, APP_USAGE_KEY } from '../core/appusage'
import { cacheFromUsage, cacheWords, warmLeftMs } from '../core/cachefacts'
import { CACHE_TTL_SUBSCRIPTION_MS } from '../core/compactmoment'
import { KEEPER_MAX_PINGS, KEEPER_PROMPT, KEPT_WHAT, TEST_LAST_MS, TEST_TTL_MS, keeperVerdict, keptDetail, nextPingInMs, pingHeld } from '../core/cachekeeper'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { putRecord, readRecord } from '../core/record'
import { readSetting } from '../core/settings'
import { LEDGER_KEY, logLines, pushLog, readLog, why } from './compaction'
import { cacheTtlMs } from './home/logic'
import { armOnce } from './everyonce'
import { subArgs } from '../core/menu'
import { fillIn } from '../core/fillin'

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

// The ping goes in the last minutes of the cache's life (leadMs), so this must be well under that.
const CHECK_MS = 30_000
// A test ping from the command waits a moment, because a call cannot run inside the command that waits for it.
const TEST_DELAY_MS = 1_500

let pings = 0
let stretchOf = 0
let busyPinging = false
let testUntil = 0

// How many tokens the window holds: the app's reading
const windowTokens = (rec: { ctx?: { tokens?: number }; cache?: { read: number; write: number; fresh: number } }): number | undefined => rec.ctx?.tokens ?? (rec.cache === undefined ? undefined : rec.cache.read + rec.cache.write + rec.cache.fresh)

type Pinged = { ok: true; held: boolean; read: number } | { ok: false; why: string }

// Never throws.
async function pingOnce($: EngineInterface, sessionId: string, n: number): Promise<Pinged> {
  const i = io($)
  try {
    const r = await $.model.fork({ prompt: KEEPER_PROMPT })
    const now = await i.now()
    if (!r.isAnswered) {
      // The host cannot fork a chat that has no reply yet: say it in plain words.
      const reason = r.reason === 'nothing-to-fork' ? 'This session has no reply yet. Send one message, wait for the answer, then try again.' : 'error' in r && r.error !== undefined ? `${r.reason}: ${String(r.error)}` : r.reason
      await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, what: 'Keeper could not read the cache', detail: reason, how: 'auto' })
      return { ok: false, why: reason }
    }
    const held = pingHeld(r.usage)
    const cache = cacheFromUsage(r.usage, now)
    if (cache !== undefined) {
      stretchOf = now
      await putRecord(i, { sessionId, cache: { ...cache, at: now } }, false)
    }
    if (held) await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, what: KEPT_WHAT, detail: keptDetail(r.usage.cache_read_input_tokens, n), how: 'auto', did: true })
    else await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, what: 'Keeper stopped', detail: 'The cache had gone stale, so the read paid for a rewrite.', how: 'auto' })
    return { ok: true, held, read: r.usage.cache_read_input_tokens }
  } catch (err) {
    return { ok: false, why: why(err) }
  }
}

// Never throws.
async function check($: EngineInterface): Promise<void> {
  if (busyPinging) return
  const i = io($)
  try {
    if ((await readSetting(i, 'cache.keeper')) !== 'on') return
    const id = await i.sessionId()
    const rec = await readRecord(i, id)
    if (rec?.cache === undefined) return
    if (rec.cache.at !== stretchOf) {
      pings = 0
      stretchOf = rec.cache.at
    }
    const now = await i.now()
    const testing = now < testUntil
    const ttl = testing ? TEST_TTL_MS : (cacheTtlMs(parseStoredUsage(await i.get(APP_USAGE_KEY))) ?? CACHE_TTL_SUBSCRIPTION_MS)
    if (nextPingInMs(rec.cache.at, ttl, now) > 0) return
    const v = keeperVerdict({ mode: 'on', tokens: windowTokens(rec), minTokens: testing ? 0 : undefined, pings, busy: rec.state === 'working' || rec.ask !== undefined, warmLeftMs: warmLeftMs(rec.cache, now, ttl) })
    if (!v.ping) return
    busyPinging = true
    pings += 1
    const r = await pingOnce($, id, pings)
    if (!r.ok || !r.held) pings = KEEPER_MAX_PINGS
    i.invalidate()
  } catch {
    // the keeper never breaks the session
  } finally {
    busyPinging = false
  }
}

export function registerCacheKeeper(on: On): void {
  on('session.start', { cwd: /(?<cockpit>)/ }, async ($, e, next) => {
    try {
      armOnce('cachekeeper', $.clock.every(CHECK_MS, () => void check($)))
    } catch {
      // the keeper is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'keeper')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const id = await i.sessionId()
    if (e.args.trim().toLowerCase() === 'test') {
      testUntil = (await i.now()) + TEST_LAST_MS
      pings = 0
      return { text: `Short test for 10 minutes: the keeper treats the cache as stale after ${Math.round(TEST_TTL_MS / 1000)} seconds and ignores the size limit. It needs Keep session cheap set to On, in Settings > Money and plan. Within about a minute it should read the cache, up to ${KEEPER_MAX_PINGS} times. Run /vaken-help run keeper to see.` }
    }
    if (e.args.trim().toLowerCase() === 'now') {
      $.clock.after(TEST_DELAY_MS, () => {
        void (async () => {
          const r = await pingOnce($, id, pings + 1)
          i.toast(r.ok ? fillIn(tr(r.held ? 'Kept the cache warm: {k}k tokens read from it' : 'Kept the cache warm: {k}k tokens read from it (it had gone stale)'), { k: Math.round(r.read / 1000) }) : fillIn(tr('The cache read failed. {why}'), { why: r.why }))
          i.invalidate()
        })()
      })
      return { text: 'Reading this session\'s cache once, in a moment. Run /vaken-help run keeper to see the result.' } // en-only: plain answer of a slash command (text twin)
    }
    const isOn = (await readSetting(i, 'cache.keeper')) === 'on'
    const rec = await readRecord(i, id)
    const now = await i.now()
    const testing = now < testUntil
    const ttl = testing ? TEST_TTL_MS : (cacheTtlMs(parseStoredUsage(await i.get(APP_USAGE_KEY))) ?? CACHE_TTL_SUBSCRIPTION_MS)
    const v = keeperVerdict({ mode: isOn ? 'on' : 'off', tokens: rec === undefined ? undefined : windowTokens(rec), minTokens: testing ? 0 : undefined, pings, busy: rec?.state === 'working', warmLeftMs: rec?.cache === undefined ? 0 : warmLeftMs(rec.cache, now, ttl) })
    const nextMin = rec?.cache === undefined ? undefined : Math.round(nextPingInMs(rec.cache.at, ttl, now) / 60_000)
    const last = logLines((await readLog(i, LEDGER_KEY)).filter(x => x.what.startsWith('Kept') || x.what.startsWith('Keeper')), 3) // en-only: matches the title of a stored ledger line
    return {
      text: [
        `Keeper: ${isOn ? 'on' : 'off'}.`,
        'Claude keeps a saved copy of this session (the cache), so each answer costs less. It goes stale after about an hour of quiet (5 minutes when you pay with usage credits). The keeper reads it just before, so a break does not make your next answer cost more.', // en-only: plain answer of a slash command (text twin)
        ...(isOn ? [] : ['Turn it on: Settings > Money and plan.']), // en-only: plain answer of a slash command (text twin)
        '',
        ...(rec?.cache === undefined ? ['No turn yet, so no cache to keep.'] : [`${cacheWords(rec.cache, now, ttl)}${testing ? ' (short test)' : ''}`]), // en-only: plain answer of a slash command (text twin)
        `Reads since your last answer: ${pings} of ${KEEPER_MAX_PINGS}.`,
        v.ping ? (nextMin === undefined || nextMin <= 0 ? 'Next read: due now.' : `Next read: in about ${nextMin} min.`) : `No read now: ${v.why}`, // en-only: plain answer of a slash command (text twin)
        ...(last.length === 0 ? [] : ['', 'Last:', ...last]),
        '',
        'Try: /vaken-help run keeper now (one read now) or /vaken-help run keeper test (a one-minute test).', // en-only: plain answer of a slash command (text twin)
      ].join('\n'),
    }
  })
}
