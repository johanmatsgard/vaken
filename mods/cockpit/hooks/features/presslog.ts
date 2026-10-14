// The press probe (core/presslog.ts has the why): a hidden command turns it on or off
import type { On } from 'claude-code'
import { subArgs } from '../core/menu'
import { PRESSLOG_EVENTS_KEY, PRESSLOG_KEY, appendLog, cleanPosted, pressLogText } from '../core/presslog'
import { pressLogOn, setPressLog } from '../ui/firstclick'

const seen = new Map<string, number>()

export function registerPressLog(on: On): void {
  on('session.start', async ($, e, next) => {
    try {
      const stored = await $.store.get(PRESSLOG_KEY)
      setPressLog(stored === true)
    } catch {
      setPressLog(false)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Registered before the help page's own hook
  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest = subArgs(e.args, 'run', 'presslog')
    if (rest === undefined) return next(e)
    const word = rest.trim().toLowerCase()
    if (word === 'on' || word === 'off') {
      setPressLog(word === 'on')
      await $.store.set(PRESSLOG_KEY, word === 'on')
      seen.clear()
      await $.ui.invalidate('ui.render')
    } else if (word === 'clear') {
      await $.store.set(PRESSLOG_EVENTS_KEY, [])
      seen.clear()
    }
    const log = await $.store.get(PRESSLOG_EVENTS_KEY)
    return { text: pressLogText(pressLogOn(), log) }
  })

  on('ui.message', { element: /^fc-/ }, async ($, e, next) => {
    if (!pressLogOn()) return next(e)
    try {
      const posted = cleanPosted((e.data as { log?: unknown } | null)?.log)
      if (posted.length > 0) {
        const old = await $.store.get(PRESSLOG_EVENTS_KEY)
        const nowMs = await $.clock.now()
        const r = appendLog(old, e.element, posted, seen.get(e.element), nowMs)
        if (r.seen !== undefined) seen.set(e.element, r.seen)
        await $.store.set(PRESSLOG_EVENTS_KEY, r.log)
      }
    } catch {
    }
    return next(e)
  })
}
