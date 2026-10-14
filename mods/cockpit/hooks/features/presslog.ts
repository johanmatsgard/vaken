// The press probe (core/presslog.ts has the why): a hidden command turns it on or off
import type { On } from 'claude-code'
import { subArgs } from '../core/menu'
import { PRESSLOG_EVENTS_KEY, PRESSLOG_KEY, appendLog, cleanPosted, pressLogText } from '../core/presslog'
import { pressLogOn, setPressLog } from '../ui/firstclick'

const seen = new Map<string, number>()

export function registerPressLog(on: On): void {
  on('session.start', async ($, e, next) => {
    try {
      setPressLog((await $.store.get(PRESSLOG_KEY)) === true)
    } catch {
      setPressLog(false)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Registered before the help page's own hook
  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest = subArgs(e0.args, 'run', 'presslog')
    if (rest === undefined) return next(e0)
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
    return { text: pressLogText(pressLogOn(), await $.store.get(PRESSLOG_EVENTS_KEY)) }
  })

  on('ui.message', { element: /^fc-/ }, async ($, e, next) => {
    if (!pressLogOn()) return next(e)
    try {
      const posted = cleanPosted((e.data as { log?: unknown } | null)?.log)
      if (posted.length > 0) {
        const r = appendLog(await $.store.get(PRESSLOG_EVENTS_KEY), e.element, posted, seen.get(e.element), await $.clock.now())
        if (r.seen !== undefined) seen.set(e.element, r.seen)
        await $.store.set(PRESSLOG_EVENTS_KEY, r.log)
      }
    } catch {
    }
    return next(e)
  })
}
