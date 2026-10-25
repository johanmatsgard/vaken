// The cache keeper (opt-in, Settings > Money and plan): while a session is quiet
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { parseStoredUsage, APP_USAGE_KEY } from '../core/appusage'
import { cacheFromUsage, cacheWords, warmLeftMs } from '../core/cachefacts'
import { ttlOrGuess } from '../core/compactmoment'
import { KEEPER_MAX_PINGS, KEEPER_PROMPT, KEEPER_STOP_WHAT, KEEPER_UNREAD_WHAT, KEPT_LOST_WHAT, KEPT_PAID_WHAT, KEPT_WHAT, TEST_LAST_MS, TEST_TTL_MS, cacheHeld, keeperVerdict, keptDetail, keptNet, keptNetDetail, nextPingInMs, pingHeld } from '../core/cachekeeper'
import { priceOf } from '../core/prices'
import { withToastGate } from '../core/io'
import { MODEL_KEEPER_WHAT, askFork } from '../core/modelGate'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { putRecord, readRecord } from '../core/record'
import { readSetting } from '../core/settings'
import { LEDGER_KEY, logLines, pushLog, readLog, why } from './compaction'
import { cacheTtlMs } from './home/logic'
import { armOnce } from './everyonce'
import { subArgs } from '../core/menu'
import { fillIn } from '../core/fillin'
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
    fork: req => $.model.fork(req),
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
// The tokens each held read took since your last answer: the next answer shows whether they paid.
let keptReads: number[] = []

// How many tokens the window holds: the app's reading
const windowTokens = (rec: { ctx?: { tokens?: number }; cache?: { read: number; write: number; fresh: number } }): number | undefined => rec.ctx?.tokens ?? (rec.cache === undefined ? undefined : rec.cache.read + rec.cache.write + rec.cache.fresh)

type Pinged = { ok: true; held: boolean; read: number } | { ok: false; why: string }

// Never throws.
async function pingOnce($: EngineInterface, sessionId: string, n: number): Promise<Pinged> {
  const i = io($)
  try {
    const r = await askFork(i, { what: MODEL_KEEPER_WHAT, log: false }, { prompt: KEEPER_PROMPT })
    const now = await i.now()
    if (!r.isAnswered) {
      // The host cannot fork a chat that has no reply yet: say it in plain words.
      const reason = r.reason === 'nothing-to-fork' ? 'This session has no reply yet. Send one message, wait for the answer, then try again.' : 'error' in r && r.error !== undefined ? `${r.reason}: ${String(r.error)}` : r.reason
      await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, what: KEEPER_UNREAD_WHAT, detail: reason, how: 'auto' })
      return { ok: false, why: reason }
    }
    const held = pingHeld(r.usage)
    const cache = cacheFromUsage(r.usage, now)
    if (cache !== undefined) {
      stretchOf = now
      await putRecord(i, { sessionId, cache: { ...cache, at: now } }, false)
    }
    if (held) {
      keptReads.push(r.usage.cache_read_input_tokens)
      await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, what: KEPT_WHAT, detail: keptDetail(r.usage.cache_read_input_tokens, n), how: 'auto', did: true })
    } else {
      // The lapsed read wrote the cache again, so the next answer's hit is not the earlier reads' doing: settle them now.
      await settle(i, sessionId, priceOf((await readRecord(i, sessionId))?.model), { read: 0, write: 0, fresh: 0 }, false, now)
      await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, what: KEEPER_STOP_WHAT, detail: 'The cache had gone stale, so the read paid for a rewrite.', how: 'auto' })
    }
    return { ok: true, held, read: r.usage.cache_read_input_tokens }
  } catch (err) {
    return { ok: false, why: why(err) }
  }
}

// Writes what the reads since your last answer came to, once. Never throws.
async function settle(i: Io, sessionId: string, price: ReturnType<typeof priceOf>, next: { read: number; write: number; fresh: number }, held: boolean, now: number): Promise<void> {
  const reads = keptReads
  keptReads = []
  const net = keptNet(price, reads, next, held)
  if (net === undefined) return
  try {
    await pushLog(i, LEDGER_KEY, { at: now, session: sessionId, what: net.usd > 0 ? KEPT_PAID_WHAT : KEPT_LOST_WHAT, detail: keptNetDetail(net, reads.length), how: 'auto', usd: net.usd })
  } catch {
    // a lost line only shows less
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
      // A new answer since the last read: it shows whether the reads paid.
      if (keptReads.length > 0 && stretchOf !== 0) await settle(i, id, priceOf(rec.model), rec.cache, cacheHeld(rec.cache), await i.now())
      pings = 0
      stretchOf = rec.cache.at
    }
    const now = await i.now()
    const testing = now < testUntil
    const ttl = testing ? TEST_TTL_MS : ttlOrGuess(cacheTtlMs(parseStoredUsage(await i.get(APP_USAGE_KEY))))
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
      const timer = $.clock.every(CHECK_MS, () => void check($))
      armOnce('cachekeeper', timer)
    } catch {
      // the keeper is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'keeper')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i)
    const id = await i.sessionId()
    if (rest0.trim().toLowerCase() === 'test') {
      testUntil = (await i.now()) + TEST_LAST_MS
      pings = 0
      return { text: fillIn(tr('Short test for 10 minutes: the keeper treats the cache as stale after {secs} seconds and ignores the size limit. It needs Keep session cheap set to On, in Settings > Money and plan. Within about a minute it should read the cache, up to {max} times. Run /vaken-help run keeper to see.'), { secs: Math.round(TEST_TTL_MS / 1000), max: KEEPER_MAX_PINGS }) }
    }
    if (rest0.trim().toLowerCase() === 'now') {
      $.clock.after(TEST_DELAY_MS, () => {
        void (async () => {
          const r = await pingOnce($, id, pings + 1)
          i.toast(r.ok ? fillIn(tr(r.held ? 'Kept the cache warm: {k}k tokens read from it' : 'Kept the cache warm: {k}k tokens read from it (it had gone stale)'), { k: Math.round(r.read / 1000) }) : fillIn(tr('The cache read failed. {why}'), { why: tr(r.why) }))
          i.invalidate()
        })()
      })
      return { text: tr("Reading this session's cache once, in a moment. Run /vaken-help run keeper to see the result.") }
    }
    const isOn = (await readSetting(i, 'cache.keeper')) === 'on'
    const rec = await readRecord(i, id)
    const now = await i.now()
    const testing = now < testUntil
    const ttl = testing ? TEST_TTL_MS : ttlOrGuess(cacheTtlMs(parseStoredUsage(await i.get(APP_USAGE_KEY))))
    const v = keeperVerdict({ mode: isOn ? 'on' : 'off', tokens: rec === undefined ? undefined : windowTokens(rec), minTokens: testing ? 0 : undefined, pings, busy: rec?.state === 'working', warmLeftMs: rec?.cache === undefined ? 0 : warmLeftMs(rec.cache, now, ttl) })
    const nextMin = rec?.cache === undefined ? undefined : Math.round(nextPingInMs(rec.cache.at, ttl, now) / 60_000)
    const last = logLines((await readLog(i, LEDGER_KEY)).filter(x => x.what.startsWith('Kept') || x.what.startsWith('Keeper')), 3) // en-only: matches the title of a stored ledger line
    return {
      text: [
        isOn ? tr('Keeper: on.') : tr('Keeper: off.'),
        tr('Claude keeps a saved copy of this session (the cache), so each answer costs less. It goes stale after about an hour of quiet (5 minutes when you pay with usage credits). The keeper reads it just before, so a break does not make your next answer cost more.'),
        ...(isOn ? [] : [tr('Turn it on: Settings > Money and plan.')]),
        '',
        ...(rec?.cache === undefined ? [tr('No turn yet, so no cache to keep.')] : [`${cacheWords(rec.cache, now, ttl, false, tr)}${testing ? ` ${tr('(short test)')}` : ''}`]),
        fillIn(tr('Reads since your last answer: {n} of {max}.'), { n: pings, max: KEEPER_MAX_PINGS }),
        v.ping ? (nextMin === undefined || nextMin <= 0 ? tr('Next read: due now.') : fillIn(tr('Next read: in about {n} min.'), { n: nextMin })) : fillIn(tr('No read now: {why}'), { why: v.why }),
        ...(last.length === 0 ? [] : ['', tr('Last:'), ...last]),
        '',
        tr('Try: /vaken-help run keeper now (one read now) or /vaken-help run keeper test (a one-minute test).'),
      ].join('\n'),
    }
  })
}
