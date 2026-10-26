// Is Claude down? A calm band line while the Claude status page reports an incident on Claude Code or the API (core/claudestatus.ts).
// One plain GET of the public page: no headers, no body, nothing about the person. Every 5 minutes at most, only while the session is in use,
// and at once (a minute apart at most) after Claude's own service fails a turn. Off with Settings > Health > Vaken health.
import type { EngineInterface, On } from 'claude-code'

import { clearBand, postBand } from '../core/band'
import { SERVICE_ERRORS, STATUS_BAND_ID, STATUS_BAND_TTL_MS, STATUS_EVERY_MS, forgetStatus, parseStatus, statusDue, statusMem } from '../core/claudestatus'
import { HEALTH_MODE_KEY } from '../core/health'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { tLine } from '../i18n/t'
import { armOnce } from './everyonce'

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

// The page's text, or undefined when the host refuses or cannot reach it (an organization's web policy, offline): then nothing shows.
async function fetchStatus($: EngineInterface): Promise<string | undefined> {
  try {
    const r = await $.http.fetch('https://status.claude.com/api/v2/summary.json')
    return r.ok ? r.text : undefined
  } catch {
    return undefined
  }
}

// Never throws. The band line says the incident's title; amber (warn) only for a major outage.
export async function checkStatus($: EngineInterface, soon = false): Promise<void> {
  const i = io($)
  try {
    const now = await i.now()
    if (!statusDue(now, soon)) return
    statusMem.checking = true
    statusMem.checkedAt = now
    if ((await i.get(HEALTH_MODE_KEY)) === 'off') {
      if (statusMem.incident !== undefined) await clearBand(i, STATUS_BAND_ID)
      statusMem.incident = undefined
      return
    }
    const text = await fetchStatus($)
    statusMem.failed = text === undefined
    if (text === undefined) return
    const had = statusMem.incident
    const found = parseStatus(text)
    statusMem.incident = found
    if (found === undefined) {
      if (had !== undefined) {
        await clearBand(i, STATUS_BAND_ID)
        i.invalidate()
      }
      return
    }
    await postBand(i, found.major ? 'warn' : 'info', STATUS_BAND_ID, tLine(found.major ? 'band.claude_is_down_title' : 'band.claude_has_trouble_title', { title: found.title }), STATUS_BAND_TTL_MS)
  } catch {
    // the status check is optional: a failure shows nothing, never breaks the session
  } finally {
    statusMem.checking = false
  }
}

export function registerClaudeStatus(on: On): void {
  on('session.start', { cwd: /(?<claudestatus>)/ }, async ($, e, next) => {
    try {
      forgetStatus()
      const timer = $.clock.every(STATUS_EVERY_MS, () => void checkStatus($))
      armOnce('claudestatus', timer)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // In memory only (a turn of the main loop): the first turn of a session in use asks once, then the timer keeps to every 5 minutes.
  on('turn.start', { turnId: /(?<claudestatus>)/ }, async ($, e, next) => {
    try {
      const now = await $.clock.now()
      statusMem.turnAt = now
      if (statusMem.checkedAt === undefined) void checkStatus($)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Claude's own service failed the turn (overloaded, a server error): look at once.
  on('classic.StopFailure', { error: /(?<claudestatus>)/ }, async ($, e, next) => {
    try {
      if (SERVICE_ERRORS.includes(String(e.error))) void checkStatus($, true)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
