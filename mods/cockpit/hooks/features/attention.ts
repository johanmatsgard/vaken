// Attention runtime: the heartbeat (a working session that went quiet), the notification router (toasts for other sessions)
import type { EngineInterface, On } from 'claude-code'

import { parseStoredUsage, APP_USAGE_KEY } from '../core/appusage'
import { parseStoredSessions, APP_SESSIONS_KEY } from '../core/appsessions'
import { RECAP_AFTER_MS, batchText, glanceLines, heartbeat, isQuiet, notices, recapWords } from '../core/attention'
import type { Seen } from '../core/attention'
import { clearBand, postBand } from '../core/band'
import { cacheWords } from '../core/cachefacts'
import { didToday, todaySummary } from '../core/ledger'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { alivePids, listRecords, readRecord } from '../core/record'
import { readSetting } from '../core/settings'
import { WATCH_BAND_ID, WATCH_BAND_MS, stepWatches } from '../core/watch'
import { buildView, cacheTtlMs, hereWord, limitAgo, limitBlocks, limitLabel, needsCount, resetSaid } from './home/logic'
import { loadView } from './home/load'
import { armOnce } from './everyonce'
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

const CHECK_MS = 20_000
const TOLD_KEY = 'cockpit:notified'

let prev: Record<string, Seen> = {}

async function viewNow(i: Io) {
  const now = await i.now()
  const records = await listRecords(i)
  const alive = await alivePids(i, records)
  return buildView(records, now, await i.sessionId(), alive, parseStoredUsage(await i.get(APP_USAGE_KEY)), undefined, parseStoredSessions(await i.get(APP_SESSIONS_KEY)))
}

async function check($: EngineInterface): Promise<void> {
  const i = io($)
  try {
    const now = await i.now()
    const id = await i.sessionId()
    if ((await readSetting(i, 'heartbeat.mode')) === 'on') {
      const rec = await readRecord(i, id)
      if (rec !== undefined) {
        const silent = now - rec.lastEventAt
        const beat = rec.ask !== undefined ? 'ok' : heartbeat(rec.state, silent)
        if (beat === 'ok') await clearBand(i, 'heartbeat')
        else await postBand(i, beat === 'stuck' ? 'urgent' : 'warn', 'heartbeat', beat === 'stuck' ? 'May be stuck' : 'Gone idle', 2 * 60_000)
      }
    }
    const mode = await readSetting(i, 'notify.mode')
    const view = await viewNow(i)
    const rows = [...view.needs, ...view.waiting, ...view.working].map(r => ({ id: r.rec.sessionId, name: r.name, kind: r.kind, reason: r.reason, since: r.rec.ask !== undefined && r.kind === 'needs' ? r.rec.ask.since : r.rec.stateSince }))
    const raw = await i.get(TOLD_KEY)
    const told: Record<string, string> = typeof raw === 'object' && raw !== null ? (raw as Record<string, string>) : {}
    const fired = await stepWatches(i, [...view.needs, ...view.working, ...view.waiting, ...view.idle].map(w => ({ id: w.rec.sessionId, name: w.name, kind: w.kind, ...(w.rec.done === undefined ? {} : { done: w.rec.done }) })), now)
    for (const f of fired) {
      i.toast(f.text, true)
      await postBand(i, 'info', WATCH_BAND_ID, f.text, WATCH_BAND_MS)
    }
    const r = notices(prev, rows, told, mode, now)
    prev = r.next
    r.notices = r.notices.filter(n => !fired.some(f => f.id === n.id) || !n.marker.startsWith('done:'))
    if (r.notices.length > 0) {
      for (const n of r.notices) told[n.id] = n.marker
      await i.set(TOLD_KEY, told)
      if (!isQuiet(await readSetting(i, 'notify.quiet'), new Date(now).getHours())) i.toast(batchText(r.notices))
    }
  } catch {
    // the router never breaks the session
  }
}

export function registerAttention(on: On): void {
  on('session.start', { cwd: /(?<attention>)/ }, async ($, e, next) => {
    try {
      // Always at full pace
      const timer = $.clock.every(CHECK_MS, () => void check($).catch(() => undefined))
      armOnce('attention', timer)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<attention>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      if ((await readSetting(i, 'recap.mode')) === 'on' && !e.text.trimStart().startsWith('/')) {
        const rec = await readRecord(i, await i.sessionId())
        const now = await i.now()
        if (rec !== undefined && rec.state !== 'working' && now - rec.lastEventAt >= RECAP_AFTER_MS) {
          await postBand(i, 'info', 'recap', recapWords({ gapMs: now - rec.lastEventAt, branch: rec.branch, contextPercent: rec.contextPercent, cache: rec.cache === undefined ? undefined : cacheWords(rec.cache, now, cacheTtlMs(parseStoredUsage(await i.get(APP_USAGE_KEY)))) }), 3 * 60_000)
        }
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-today' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'recap')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const rec = await readRecord(i, await i.sessionId())
    const now = await i.now()
    if (rec === undefined) return { text: 'Nothing to recap yet.' }
    return { text: recapWords({ gapMs: now - rec.lastEventAt, branch: rec.branch, contextPercent: rec.contextPercent, cache: rec.cache === undefined ? undefined : cacheWords(rec.cache, now, cacheTtlMs(parseStoredUsage(await i.get(APP_USAGE_KEY)))) }) }
  })

  on('command.run', { command: 'vaken-today' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'glance')
    if (rest0 === undefined) return next(e)
    // The same load as the pane and /vaken (loadView): the limit that leads with its reset and age
    const { view, now } = await loadView(io($))
    const ledger = view.ledger ?? []
    const lead = limitBlocks(view)[0]
    return {
      text: glanceLines({
        needs: view.needs.map(r => ({ name: r.name, reason: r.reason })),
        needsTotal: needsCount(view),
        limitPercent: lead?.percent,
        limitLabel: lead === undefined ? undefined : limitLabel(lead.label),
        limitReset: lead === undefined || lead.reset === '' ? undefined : resetSaid(lead.reset),
        limitAgo: lead === undefined ? undefined : limitAgo([lead]),
        hereState: hereWord(view.here, 'explained', view.hereWaits),
        didCount: todaySummary(ledger, now, view.counts).count + didToday(ledger, now, view.counts).reduce((n, d) => n + d.n, 0),
      }).join('\n'),
    }
  })
}
